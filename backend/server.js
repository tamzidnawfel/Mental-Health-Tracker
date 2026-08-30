const express = require('express');
const mysql = require('mysql2');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../frontend')));

const db = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'mental_health_tracker'
});

const ACCESSIBILITY_CONFIG = {
    distanceBarrierKm: 5,
    financialBarrierByBracket: {
        '10–30k': 'High Financial Barrier',
        '10-30k': 'High Financial Barrier',
        '10000-30000': 'High Financial Barrier',
        '30–50k': 'Moderate Financial Barrier',
        '30-50k': 'Moderate Financial Barrier',
        '30000-50000': 'Moderate Financial Barrier',
        '50000+': 'Low Financial Barrier',
        '50k+': 'Low Financial Barrier'
    }
};

function normalizeIncomeBracket(value) {
    const bracket = String(value || '').trim().toLowerCase().replace(/,/g, '').replace(/\s+/g, '');
    if (['10–30k', '10-30k', '10000-30000'].includes(bracket)) return '10–30k';
    if (['30–50k', '30-50k', '30000-50000'].includes(bracket)) return '30–50k';
    if (['50k+', '50000+'].includes(bracket)) return '50k+';
    return null;
}

function haversineDistanceKm(latitude1, longitude1, latitude2, longitude2) {
    const earthRadiusKm = 6371;
    const toRadians = degrees => degrees * Math.PI / 180;
    const latitudeDifference = toRadians(latitude2 - latitude1);
    const longitudeDifference = toRadians(longitude2 - longitude1);
    const a = Math.sin(latitudeDifference / 2) ** 2
        + Math.cos(toRadians(latitude1)) * Math.cos(toRadians(latitude2))
        * Math.sin(longitudeDifference / 2) ** 2;
    return earthRadiusKm * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function accessibilityClassification(financialBarrier, distanceBarrier) {
    if (financialBarrier === 'High Financial Barrier') {
        return distanceBarrier ? 'Severe Accessibility Barrier' : 'Financial Barrier';
    }
    if (financialBarrier === 'Moderate Financial Barrier') {
        return distanceBarrier ? 'Financial + Distance Barrier' : 'Moderate Financial Barrier';
    }
    if (financialBarrier === 'Low Financial Barrier') {
        return distanceBarrier ? 'Distance Barrier' : 'No Major Barrier';
    }
    return 'Insufficient Data';
}

function accessibilitySeverity(classification) {
    return {
        'Severe Accessibility Barrier': 6,
        'Financial + Distance Barrier': 5,
        'Financial Barrier': 4,
        'Moderate Financial Barrier': 3,
        'Distance Barrier': 2,
        'No Major Barrier': 1,
        'Insufficient Data': 0
    }[classification] || 0;
}

db.connect((err) => {
    if (err) {
        console.error('Database connection failed: ' + err.stack);
        return;
    }
    console.log('Connected to MySQL database successfully!');

    // Ensure password column exists in PATIENT table
    db.query("SHOW COLUMNS FROM PATIENT LIKE 'password'", (colErr, rows) => {
        if (!colErr && rows && rows.length === 0) {
            db.query("ALTER TABLE PATIENT ADD COLUMN password VARCHAR(255) DEFAULT 'mindcare123'", (alterErr) => {
                if (alterErr) console.error("Could not add password column to PATIENT:", alterErr);
                else console.log("Added 'password' column to PATIENT table.");
            });
        }
    });

    // Ensure password & email columns exist in PROVIDER table
    db.query("SHOW COLUMNS FROM PROVIDER LIKE 'password'", (colErr, rows) => {
        if (!colErr && rows && rows.length === 0) {
            db.query("ALTER TABLE PROVIDER ADD COLUMN password VARCHAR(255) DEFAULT '123'", (alterErr) => {
                if (alterErr) console.error("Could not add password column to PROVIDER:", alterErr);
                else console.log("Added 'password' column to PROVIDER table.");
            });
        }
    });

    db.query("SHOW COLUMNS FROM PROVIDER LIKE 'email'", (colErr, rows) => {
        if (!colErr && rows && rows.length === 0) {
            db.query("ALTER TABLE PROVIDER ADD COLUMN email VARCHAR(255) DEFAULT NULL", (alterErr) => {
                if (alterErr) {
                    console.error("Could not add email column to PROVIDER:", alterErr);
                } else {
                    console.log("Added 'email' column to PROVIDER table.");
                    db.query("UPDATE PROVIDER SET email = CONCAT('provider', provider_id, '@mindcare.org') WHERE email IS NULL OR email = ''");
                }
            });
        }
    });

    // Ensure clinical_notes & prescription columns exist in APPOINTMENTS table
    db.query("SHOW COLUMNS FROM APPOINTMENTS LIKE 'clinical_notes'", (colErr, rows) => {
        if (!colErr && rows && rows.length === 0) {
            db.query("ALTER TABLE APPOINTMENTS ADD COLUMN clinical_notes TEXT DEFAULT NULL", (alterErr) => {
                if (!alterErr) console.log("Added 'clinical_notes' column to APPOINTMENTS table.");
            });
        }
    });

    db.query("SHOW COLUMNS FROM APPOINTMENTS LIKE 'prescription'", (colErr, rows) => {
        if (!colErr && rows && rows.length === 0) {
            db.query("ALTER TABLE APPOINTMENTS ADD COLUMN prescription TEXT DEFAULT NULL", (alterErr) => {
                if (!alterErr) console.log("Added 'prescription' column to APPOINTMENTS table.");
            });
        }
    });
});

// Helper: Recursively scan project directory for .html files (for dev navigation hub)
function getHtmlFiles(dir, baseDir = dir) {
    let results = [];
    try {
        const list = fs.readdirSync(dir);
        list.forEach((file) => {
            const filePath = path.join(dir, file);
            const stat = fs.statSync(filePath);

            // Ignore system/node folders
            if (stat && stat.isDirectory()) {
                if (file !== 'node_modules' && !file.startsWith('.')) {
                    results = results.concat(getHtmlFiles(filePath, baseDir));
                }
            } else if (file.endsWith('.html') && file !== 'nav-index.html') {
                const relativePath = '/' + path.relative(baseDir, filePath).replace(/\\/g, '/');
                const cleanName = path.basename(file, '.html').replace(/[-_]/g, ' ');
                const title = cleanName.charAt(0).toUpperCase() + cleanName.slice(1);

                results.push({
                    title: title,
                    path: relativePath,
                    mtime: stat.mtimeMs, 
                    description: `File path: ${relativePath}`
                });
            }
        });
    } catch (err) {
        console.error("Directory scan error:", err);
    }
    return results;
}

app.get('/', (req, res) => {
    res.send('MindCare Backend Server is running!');
});

// Helper: Generate clean automated secure password
function generateAutomatedPassword() {
    const uppercase = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
    const lowercase = 'abcdefghijkmnopqrstuvwxyz';
    const numbers = '23456789';
    const specials = '!@#$%';
    
    let pwd = 'MC-';
    pwd += uppercase.charAt(Math.floor(Math.random() * uppercase.length));
    pwd += lowercase.charAt(Math.floor(Math.random() * lowercase.length));
    pwd += numbers.charAt(Math.floor(Math.random() * numbers.length));
    pwd += specials.charAt(Math.floor(Math.random() * specials.length));
    
    const allChars = uppercase + lowercase + numbers;
    for (let i = 0; i < 3; i++) {
        pwd += allChars.charAt(Math.floor(Math.random() * allChars.length));
    }
    return pwd;
}

// ==========================================
// PATIENT AUTHENTICATION & REGISTRATION
// ==========================================

// Register Patient API
app.post('/api/register', (req, res) => {
    const { name, email, phone, date_of_birth, income_bracket, preferred_language, street, city, zip_code, district_id, subregion_id, latitude, longitude } = req.body;
    
    if (!email) {
        return res.status(400).json({ error: 'Email address is required.' });
    }

    const trimmedEmail = email.trim();
    const districtId = district_id ? parseInt(district_id, 10) : null;
    const subregionId = subregion_id ? parseInt(subregion_id, 10) : null;
    const finalCity = (city || '').trim();
    const lat = latitude !== undefined && latitude !== null && latitude !== '' ? parseFloat(latitude) : null;
    const lng = longitude !== undefined && longitude !== null && longitude !== '' ? parseFloat(longitude) : null;

    // Check if patient email already exists in database
    db.query('SELECT patient_id, email FROM PATIENT WHERE email = ?', [trimmedEmail], (checkErr, checkRows) => {
        if (checkErr) {
            console.error('Email check error:', checkErr);
            return res.status(500).json({ error: 'Database check failed' });
        }

        if (checkRows && checkRows.length > 0) {
            console.log(`Registration blocked: Account with email ${trimmedEmail} already exists.`);
            return res.status(409).json({ 
                error: 'Account already exists. Proceed to login', 
                exists: true 
            });
        }

        const generatedPassword = generateAutomatedPassword();

        const sql = 'INSERT INTO PATIENT (name, email, phone, date_of_birth, income_bracket, preferred_language, street, city, zip_code, latitude, longitude, district_id, subregion_id, password) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)';

        db.query(sql, [name, trimmedEmail, phone, date_of_birth, income_bracket, preferred_language, street, finalCity, zip_code, lat, lng, districtId, subregionId, generatedPassword], (err, result) => {
            if (err) {
                if (err.code === 'ER_DUP_ENTRY') {
                    return res.status(409).json({ error: 'Account already exists. Proceed to login', exists: true });
                }

                // Fallback in case subregion_id or password column was not yet added
                const fallbackSql = 'INSERT INTO PATIENT (name, email, phone, date_of_birth, income_bracket, preferred_language, street, city, zip_code, latitude, longitude, district_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)';
                db.query(fallbackSql, [name, trimmedEmail, phone, date_of_birth, income_bracket, preferred_language, street, finalCity, zip_code, lat, lng, districtId], (fallbackErr, fallbackRes) => {
                    if (fallbackErr) {
                        if (fallbackErr.code === 'ER_DUP_ENTRY') {
                            return res.status(409).json({ error: 'Account already exists. Proceed to login', exists: true });
                        }
                        console.error('Error inserting patient:', fallbackErr);
                        return res.status(500).json({ error: 'Failed to register patient' });
                    }
                    console.log('New patient added with ID:', fallbackRes.insertId);
                    res.status(200).json({ 
                        message: 'Patient registered successfully!', 
                        patient_id: fallbackRes.insertId,
                        password: generatedPassword,
                        name,
                        email: trimmedEmail,
                        city: finalCity,
                        district_id: districtId,
                        subregion_id: subregionId
                    });
                });
                return;
            }

            console.log('New patient added with ID:', result.insertId, '| Area/City:', finalCity, '| Subregion ID:', subregionId, '| Generated Password:', generatedPassword);
            res.status(200).json({ 
                message: 'Patient registered successfully!', 
                patient_id: result.insertId,
                password: generatedPassword,
                name,
                email: trimmedEmail,
                city: finalCity,
                district_id: districtId,
                subregion_id: subregionId
            });
        });
    });
});

// Patient Login API
app.post('/api/patient-login', (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({ error: 'Please provide both email address and password.' });
    }

    const sql = 'SELECT patient_id, name, email, phone, preferred_language, city, district_id, latitude, longitude FROM PATIENT WHERE email = ? AND password = ?';
    db.query(sql, [email.trim(), password.trim()], (err, results) => {
        if (err) {
            console.error('Login query error:', err);
            return res.status(500).json({ error: 'Database error occurred during login.' });
        }

        if (results.length === 0) {
            return res.status(401).json({ error: 'Incorrect email or password.' });
        }

        const patient = results[0];
        console.log('Patient authenticated successfully:', patient.name, '(ID:', patient.patient_id, ')');
        res.status(200).json({
            message: 'Login successful!',
            patient
        });
    });
});

// ==========================================
// PROVIDER AUTHENTICATION & REGISTRATION
// ==========================================

// Register Provider API (Creates PROVIDER and subclasses THERAPISTS / CLINICS)
app.post('/api/provider-register', (req, res) => {
    const {
        name,
        email,
        password,
        provider_type,
        session_fee,
        max_capacity,
        district_id,
        subregion_id,
        latitude,
        longitude,
        accepts_insurance,
        license_no,
        years_of_experience,
        registration_no,
        total_beds,
        spec_ids,
        language_codes
    } = req.body;

    if (!name || !email || !password) {
        return res.status(400).json({ error: 'Name, email, and password are required for provider registration.' });
    }

    const trimmedEmail = email.trim();
    const trimmedName = name.trim();
    const type = (provider_type || 'therapist').toLowerCase();
    const fee = parseFloat(session_fee) || 1500.00;
    const capacity = parseInt(max_capacity, 10) || 20;
    const districtId = parseInt(district_id, 10) || 1;
    const subregionId = subregion_id ? parseInt(subregion_id, 10) : null;
    const insurance = accepts_insurance ? 1 : 0;
    const pwd = password.trim();

    // Coordinates: from request or default
    const lat = latitude !== undefined && latitude !== null && latitude !== '' ? parseFloat(latitude) : 23.8103;
    const lng = longitude !== undefined && longitude !== null && longitude !== '' ? parseFloat(longitude) : 90.4125;

    // Check if provider with this email or name already exists
    db.query('SELECT provider_id, name, email FROM PROVIDER WHERE email = ? OR name = ?', [trimmedEmail, trimmedName], (chkErr, chkRows) => {
        if (chkErr) {
            console.error('Provider check error:', chkErr);
            return res.status(500).json({ error: 'Database verification failed.' });
        }

        if (chkRows && chkRows.length > 0) {
            return res.status(409).json({ error: 'A provider with this email or practice name is already registered. Please proceed to login.', exists: true });
        }

        const insertProviderSql = `
            INSERT INTO PROVIDER 
            (name, email, password, session_fee, max_capacity, rating_avg, latitude, longitude, accepts_insurance, district_id, subregion_id, current_patients) 
            VALUES (?, ?, ?, ?, ?, 5.00, ?, ?, ?, ?, ?, 0)
        `;

        db.query(insertProviderSql, [trimmedName, trimmedEmail, pwd, fee, capacity, lat, lng, insurance, districtId, subregionId], (pErr, pResult) => {
            if (pErr) {
                console.error('Error inserting provider:', pErr);
                // Fallback without subregion_id if column missing
                const fallbackSql = `
                    INSERT INTO PROVIDER 
                    (name, email, password, session_fee, max_capacity, rating_avg, latitude, longitude, accepts_insurance, district_id, current_patients) 
                    VALUES (?, ?, ?, ?, ?, 5.00, ?, ?, ?, ?, 0)
                `;
                return db.query(fallbackSql, [trimmedName, trimmedEmail, pwd, fee, capacity, lat, lng, insurance, districtId], (fbErr, fbRes) => {
                    if (fbErr) return res.status(500).json({ error: 'Failed to create provider account.' });
                    handleSubclasses(fbRes.insertId);
                });
            }

            handleSubclasses(pResult.insertId);

            function handleSubclasses(newProviderId) {
                // Insert into subclass table
                if (type === 'clinic') {
                    const regNo = registration_no || `CL-REG-${String(newProviderId).padStart(3, '0')}`;
                    const beds = parseInt(total_beds, 10) || 30;
                    db.query('INSERT INTO CLINICS (provider_id, registration_no, total_beds) VALUES (?, ?, ?)', [newProviderId, regNo, beds], (cErr) => {
                        if (cErr) console.error('Error creating clinic subclass:', cErr);
                    });
                } else {
                    // Default to therapist
                    const licNo = license_no || `BMDC-TR-${String(newProviderId).padStart(3, '0')}`;
                    const exp = parseInt(years_of_experience, 10) || 5;
                    db.query('INSERT INTO THERAPISTS (provider_id, license_no, years_of_experience) VALUES (?, ?, ?)', [newProviderId, licNo, exp], (tErr) => {
                        if (tErr) console.error('Error creating therapist subclass:', tErr);
                    });
                }

                // Insert Specializations
                const specs = Array.isArray(spec_ids) ? spec_ids : (spec_ids ? String(spec_ids).split(',') : [1]);
                specs.forEach(sId => {
                    const sNum = parseInt(sId, 10);
                    if (!isNaN(sNum)) {
                        db.query('INSERT IGNORE INTO PROVIDER_SPECIALIZATIONS (provider_id, spec_id) VALUES (?, ?)', [newProviderId, sNum]);
                    }
                });

                // Insert Languages
                const langs = Array.isArray(language_codes) ? language_codes : (language_codes ? String(language_codes).split(',') : ['001', '002']);
                langs.forEach(lCode => {
                    if (lCode) {
                        db.query('INSERT IGNORE INTO PROVIDER_LANGUAGES (provider_id, language_code) VALUES (?, ?)', [newProviderId, String(lCode).trim()]);
                    }
                });

                console.log(`Provider registered successfully! ID: #${newProviderId} (${trimmedName} - ${type}, District: ${districtId}, Subregion: ${subregionId})`);

                res.status(200).json({
                    message: 'Provider registration successful! You can now log in to access your clinical dashboard.',
                    provider_id: newProviderId,
                    name: trimmedName,
                    email: trimmedEmail,
                    district_id: districtId,
                    subregion_id: subregionId,
                    provider_type: type
                });
            }
        });
    });
});


// Provider Login API (Authenticates by Provider ID or Name and Password) // ASHRAFUL
app.post('/api/provider-login', (req, res) => {
    const { provider_id, password } = req.body; // ASHRAFUL updated from email to provider_id

    if (!provider_id || !password) {                                     // ASHRAFUL
        return res.status(400).json({ error: 'Please enter your Provider ID/Name and password.' });
    }

    const trimmedInput = provider_id.toString().trim(); // ASHRAFUL
    const trimmedPassword = password.trim();

    // ASHRAFUL changes in const sql line 358-389: replaced email with provider_id
    const sql = `
        SELECT 
            p.provider_id,
            p.name,
            p.session_fee,
            p.max_capacity,
            p.current_patients,
            p.rating_avg,
            p.district_id,
                r.district_name,
            CASE 
                WHEN t.provider_id IS NOT NULL THEN 'therapist'
                WHEN c.provider_id IS NOT NULL THEN 'clinic'
                ELSE 'therapist'
            END AS provider_type,
            t.license_no,
            t.years_of_experience,
            c.registration_no,
            c.total_beds,
            COALESCE(GROUP_CONCAT(DISTINCT s.spec_name ORDER BY s.spec_name SEPARATOR ', '), '') AS specializations,
            COALESCE(GROUP_CONCAT(DISTINCT l.language_name ORDER BY l.language_name SEPARATOR ', '), '') AS languages
        FROM PROVIDER p
        LEFT JOIN REGION r ON p.district_id = r.district_id
        LEFT JOIN THERAPISTS t ON p.provider_id = t.provider_id
        LEFT JOIN CLINICS c ON p.provider_id = c.provider_id
        LEFT JOIN PROVIDER_SPECIALIZATIONS ps ON p.provider_id = ps.provider_id
        LEFT JOIN SPECIALIZATION s ON ps.spec_id = s.spec_id
        LEFT JOIN PROVIDER_LANGUAGES pl ON p.provider_id = pl.provider_id
        LEFT JOIN LANGUAGES l ON pl.language_code = l.language_code
        WHERE (p.provider_id = ? OR p.name = ?) AND (p.password = ? OR p.password IS NULL OR p.password = '123')
        GROUP BY p.provider_id
    `;

    db.query(sql, [trimmedInput, trimmedInput, trimmedPassword], (err, results) => {
        if (err) {
            console.error('Provider login error:', err);
            return res.status(500).json({ error: 'Database error occurred during login.' });
        }

        if (results.length === 0) {
            return res.status(401).json({ error: 'Invalid credentials. Please verify your Provider ID and password.' }); // ASHRAFUL
        }

        const provider = results[0];
        console.log(`Provider logged in: ${provider.name} (#${provider.provider_id})`);

        res.status(200).json({
            message: 'Provider login successful!',
            provider
        });
    });
});

// ==========================================
// PROVIDER CLINICAL DASHBOARD & QUEUE API
// ==========================================

// Get Complete Dashboard Data for a Specific Provider (Booked Patients & Auto-Escalated Waitlist)
app.get('/api/provider/:id/dashboard', (req, res) => {
    const providerId = parseInt(req.params.id, 10);
    if (!providerId || isNaN(providerId)) {
        return res.status(400).json({ error: 'Invalid provider ID.' });
    }

    runWaitlistAutoEscalation(() => {
        // 1. Fetch Provider Profile
        const providerSql = `
            SELECT 
                p.provider_id,
                p.name,
                p.email,
                p.session_fee,
                p.max_capacity,
                p.current_patients,
                p.rating_avg,
                p.accepts_insurance,
                p.district_id,
                r.district_name,
                CASE 
                    WHEN t.provider_id IS NOT NULL THEN 'therapist'
                    WHEN c.provider_id IS NOT NULL THEN 'clinic'
                    ELSE 'therapist'
                END AS provider_type,
                t.license_no,
                t.years_of_experience,
                c.registration_no,
                c.total_beds,
                COALESCE(GROUP_CONCAT(DISTINCT s.spec_name ORDER BY s.spec_name SEPARATOR ', '), '') AS specializations
            FROM PROVIDER p
            LEFT JOIN REGION r ON p.district_id = r.district_id
            LEFT JOIN THERAPISTS t ON p.provider_id = t.provider_id
            LEFT JOIN CLINICS c ON p.provider_id = c.provider_id
            LEFT JOIN PROVIDER_SPECIALIZATIONS ps ON p.provider_id = ps.provider_id
            LEFT JOIN SPECIALIZATION s ON ps.spec_id = s.spec_id
            WHERE p.provider_id = ?
            GROUP BY p.provider_id
        `;

        // 2. Fetch Booked Patient Appointments
        const appointmentsSql = `
            SELECT 
                a.appointment_id,
                a.patient_id,
                a.provider_id,
                DATE_FORMAT(a.appointment_date, '%Y-%m-%d') AS appointment_date,
                a.status,
                p.name AS patient_name,
                p.email AS patient_email,
                p.phone AS patient_phone,
                p.city AS patient_city,
                p.preferred_language
            FROM APPOINTMENTS a
            JOIN PATIENT p ON a.patient_id = p.patient_id
            WHERE a.provider_id = ?
            ORDER BY 
                CASE a.status
                    WHEN 'Confirmed' THEN 1
                    WHEN 'Scheduled' THEN 2
                    WHEN 'Completed' THEN 3
                    ELSE 4
                END,
                a.appointment_date ASC,
                a.appointment_id DESC
        `;

        // 3. Fetch Waitlisted Patients for this Provider (with real-time automated escalation)
        const waitlistSql = `
            SELECT 
                w.waitlist_id,
                w.patient_id,
                w.provider_id,
                p.name AS patient_name,
                p.email AS patient_email,
                p.phone AS patient_phone,
                p.city AS patient_city,
                p.preferred_language,
                DATE_FORMAT(w.request_date, '%Y-%m-%d') AS request_date,
                DATEDIFF(CURDATE(), w.request_date) AS days_waiting,
                w.crisis_score,
                CASE 
                    WHEN w.status = 'Cancelled' THEN w.priority_level
                    WHEN w.crisis_score >= 9 OR DATEDIFF(CURDATE(), w.request_date) >= 6 THEN 'CRITICAL'
                    WHEN w.crisis_score >= 7 OR DATEDIFF(CURDATE(), w.request_date) >= 4 THEN 'HIGH'
                    WHEN w.crisis_score >= 4 OR DATEDIFF(CURDATE(), w.request_date) >= 2 THEN 'MODERATE'
                    ELSE 'ROUTINE'
                END AS priority_level,
                w.status,
                CASE 
                    WHEN (w.status = 'Active') AND (DATEDIFF(CURDATE(), w.request_date) >= 4 OR w.crisis_score >= 7) THEN 1
                    ELSE 0
                END AS needs_urgent_attention
            FROM WAITLIST w
            JOIN PATIENT p ON w.patient_id = p.patient_id
            WHERE w.provider_id = ?
            ORDER BY 
                CASE w.status
                    WHEN 'Active' THEN 1
                    WHEN 'Assigned' THEN 2
                    ELSE 3
                END,
                CASE 
                    WHEN w.crisis_score >= 9 OR DATEDIFF(CURDATE(), w.request_date) >= 6 THEN 1
                    WHEN w.crisis_score >= 7 OR DATEDIFF(CURDATE(), w.request_date) >= 4 THEN 2
                    WHEN w.crisis_score >= 4 OR DATEDIFF(CURDATE(), w.request_date) >= 2 THEN 3
                    ELSE 4
                END ASC,
                days_waiting DESC,
                w.waitlist_id ASC
        `;

        db.query(providerSql, [providerId], (prvErr, prvRows) => {
            if (prvErr || !prvRows || prvRows.length === 0) {
                return res.status(404).json({ error: 'Provider not found.' });
            }

            const provider = prvRows[0];

            db.query(appointmentsSql, [providerId], (aptErr, appointments) => {
                if (aptErr) {
                    console.error('Error fetching provider appointments:', aptErr);
                    return res.status(500).json({ error: 'Failed to load appointments.' });
                }

                db.query(waitlistSql, [providerId], (wlErr, waitlistRows) => {
                    if (wlErr) {
                        console.error('Error fetching provider waitlist:', wlErr);
                        return res.status(500).json({ error: 'Failed to load waitlist.' });
                    }

                    const apts = appointments || [];
                    const wl = waitlistRows || [];

                    const activeAppointments = apts.filter(a => {
                        const s = (a.status || '').toLowerCase();
                        return s === 'confirmed' || s === 'scheduled' || s === 'active';
                    });

                    const activeWaitlist = wl.filter(w => (w.status || '').toLowerCase() === 'active');
                    const urgentWaitlist = activeWaitlist.filter(w => w.needs_urgent_attention === 1 || w.priority_level === 'HIGH' || w.priority_level === 'CRITICAL');
                    const completedCount = apts.filter(a => (a.status || '').toLowerCase() === 'completed').length;

                    res.status(200).json({
                        provider,
                        stats: {
                            current_patients: provider.current_patients || activeAppointments.length,
                            max_capacity: provider.max_capacity || 20,
                            total_booked: apts.length,
                            active_appointments_count: activeAppointments.length,
                            active_waitlist_count: activeWaitlist.length,
                            urgent_waitlist_count: urgentWaitlist.length,
                            completed_count: completedCount
                        },
                        appointments: apts,
                        waitlist: wl,
                        urgent_alerts: urgentWaitlist
                    });
                });
            });
        });
    });
});

// Deterministic financial and geographic accessibility analysis for one provider.
app.get('/api/provider/:id/accessibility-analysis', (req, res) => {
    const providerId = parseInt(req.params.id, 10);
    if (!providerId || isNaN(providerId)) {
        return res.status(400).json({ error: 'Invalid provider ID.' });
    }

    const sql = `
        SELECT
            p.patient_id,
            p.name AS patient_name,
            r.district_name,
            p.income_bracket,
            p.latitude AS patient_latitude,
            p.longitude AS patient_longitude,
            pr.provider_id,
            pr.name AS provider_name,
            pr.session_fee,
            pr.latitude AS provider_latitude,
            pr.longitude AS provider_longitude
        FROM APPOINTMENTS a
        JOIN PATIENT p ON a.patient_id = p.patient_id
        JOIN PROVIDER pr ON a.provider_id = pr.provider_id
        LEFT JOIN REGION r ON p.district_id = r.district_id
        WHERE a.provider_id = ?
        GROUP BY p.patient_id, pr.provider_id, r.district_name
        ORDER BY p.patient_id
    `;

    db.query(sql, [providerId], (err, rows) => {
        if (err) {
            console.error('Error fetching accessibility analysis:', err);
            return res.status(500).json({ error: 'Failed to load accessibility analysis.' });
        }

        const patients = (rows || []).map(row => {
            const normalizedIncomeBracket = normalizeIncomeBracket(row.income_bracket);
            const financialBarrier = normalizedIncomeBracket
                ? ACCESSIBILITY_CONFIG.financialBarrierByBracket[normalizedIncomeBracket]
                : null;
            const hasCoordinates = [row.patient_latitude, row.patient_longitude, row.provider_latitude, row.provider_longitude]
                .every(value => value !== null && value !== undefined && Number.isFinite(Number(value)));
            const distanceKm = hasCoordinates
                ? Number(haversineDistanceKm(Number(row.patient_latitude), Number(row.patient_longitude), Number(row.provider_latitude), Number(row.provider_longitude)).toFixed(2))
                : null;
            const distanceBarrier = distanceKm === null ? null : distanceKm > ACCESSIBILITY_CONFIG.distanceBarrierKm;
            const overallClassification = financialBarrier && distanceBarrier !== null
                ? accessibilityClassification(financialBarrier, distanceBarrier)
                : 'Insufficient Data';

            return {
                patient_id: row.patient_id,
                patient_name: row.patient_name,
                district_name: row.district_name || 'District not recorded',
                income_bracket: normalizedIncomeBracket || row.income_bracket || 'Not recorded',
                provider_id: row.provider_id,
                provider_name: row.provider_name,
                distance_km: distanceKm,
                distance_barrier: distanceBarrier,
                financial_barrier: financialBarrier || 'Not classified',
                session_fee: row.session_fee,
                affordability_indicator: null,
                overall_classification: overallClassification,
                severity: accessibilitySeverity(overallClassification)
            };
        }).sort((first, second) => second.severity - first.severity || first.patient_name.localeCompare(second.patient_name));

        const summary = {
            total_patients: patients.length,
            financial_barriers: patients.filter(patient => ['High Financial Barrier', 'Moderate Financial Barrier'].includes(patient.financial_barrier)).length,
            distance_barriers: patients.filter(patient => patient.distance_barrier === true).length,
            both_barriers: patients.filter(patient => patient.distance_barrier === true && ['High Financial Barrier', 'Moderate Financial Barrier'].includes(patient.financial_barrier)).length,
            no_major_barriers: patients.filter(patient => patient.overall_classification === 'No Major Barrier').length
        };
        const incomeBrackets = ['10–30k', '30–50k', '50k+'];
        const incomeCounts = incomeBrackets.map(bracket => ({ bracket, count: patients.filter(patient => patient.income_bracket === bracket).length }));
        const classificationCounts = [...new Set(patients.map(patient => patient.overall_classification))].map(classification => ({ classification, count: patients.filter(patient => patient.overall_classification === classification).length }));

        res.json({
            provider_id: providerId,
            config: ACCESSIBILITY_CONFIG,
            summary,
            charts: {
                income_brackets: incomeCounts,
                distance_barriers: [{ label: 'Distance Barrier', count: summary.distance_barriers }, { label: 'No Distance Barrier', count: patients.filter(patient => patient.distance_barrier === false).length }],
                classifications: classificationCounts
            },
            patients
        });
    });
});

// Admit Waitlisted Patient (Provider books appointment directly from waitlist queue)
app.post('/api/provider/:id/admit-waitlist', (req, res) => {
    const providerId = parseInt(req.params.id, 10);
    const { waitlist_id, appointment_date } = req.body;

    if (!providerId || !waitlist_id || !appointment_date) {
        return res.status(400).json({ error: 'Provider ID, Waitlist ID, and appointment date are required.' });
    }

    // Find the waitlist entry
    const findSql = 'SELECT waitlist_id, patient_id, provider_id, status FROM WAITLIST WHERE waitlist_id = ?';
    db.query(findSql, [waitlist_id], (fErr, rows) => {
        if (fErr || !rows || rows.length === 0) {
            return res.status(404).json({ error: 'Waitlist record not found.' });
        }

        const entry = rows[0];
        const patientId = entry.patient_id;

        // Insert new confirmed appointment
        const insertAptSql = 'INSERT INTO APPOINTMENTS (patient_id, provider_id, appointment_date, status) VALUES (?, ?, ?, ?)';
        db.query(insertAptSql, [patientId, providerId, appointment_date, 'Confirmed'], (insErr, insRes) => {
            if (insErr) {
                console.error('Error admitting waitlisted patient:', insErr);
                return res.status(500).json({ error: 'Failed to create confirmed appointment.' });
            }

            // Update waitlist entry status to Assigned
            db.query("UPDATE WAITLIST SET status = 'Assigned' WHERE waitlist_id = ?", [waitlist_id]);

            // ASHRAFUL: commented out Increment provider capacity
            // db.query('UPDATE PROVIDER SET current_patients = current_patients + 1 WHERE provider_id = ?', [providerId]);

            console.log(`Waitlisted Patient #${patientId} admitted by Provider #${providerId} as Appointment #${insRes.insertId}`);

            res.status(200).json({
                message: 'Patient successfully admitted and appointment confirmed!',
                appointment_id: insRes.insertId,
                waitlist_id,
                patient_id: patientId,
                appointment_date,
                status: 'Confirmed'
            });
        });
    });
});

// Mark Appointment as Cancelled
app.put('/api/appointments/:id/cancel', (req, res) => {
    const appointmentId = parseInt(req.params.id, 10);
    if (!appointmentId || isNaN(appointmentId)) {
        return res.status(400).json({ error: 'Valid appointment ID required.' });
    }

    const findSql = 'SELECT appointment_id, provider_id, status FROM APPOINTMENTS WHERE appointment_id = ?';
    db.query(findSql, [appointmentId], (findErr, rows) => {
        if (findErr || !rows || rows.length === 0) {
            return res.status(404).json({ error: 'Appointment not found.' });
        }

        const appointment = rows[0];
        const wasActive = ['confirmed', 'scheduled', 'active'].includes((appointment.status || '').toLowerCase());
        db.query("UPDATE APPOINTMENTS SET status = 'Cancelled' WHERE appointment_id = ?", [appointmentId], (updateErr) => {
            if (updateErr) {
                console.error('Error cancelling appointment:', updateErr);
                return res.status(500).json({ error: 'Failed to cancel appointment.' });
            }
            if (wasActive && appointment.provider_id) {
                // ASHRAFUL: commented out
                // db.query('UPDATE PROVIDER SET current_patients = GREATEST(0, current_patients - 1) WHERE provider_id = ?', [appointment.provider_id]);
            }
            res.json({ appointment_id: appointmentId, status: 'Cancelled' });
        });
    });
});

// Mark Appointment as Completed (Frees up provider slot capacity)
app.put('/api/appointments/:id/complete', (req, res) => {
    const appointmentId = parseInt(req.params.id, 10);
    if (!appointmentId) {
        return res.status(400).json({ error: 'Valid appointment ID required.' });
    }

    const findSql = 'SELECT appointment_id, provider_id, status FROM APPOINTMENTS WHERE appointment_id = ?';
    db.query(findSql, [appointmentId], (findErr, rows) => {
        if (findErr || !rows || rows.length === 0) {
            return res.status(404).json({ error: 'Appointment not found.' });
        }

        const apt = rows[0];
        const providerId = apt.provider_id;
        const prevStatus = apt.status;

        const completeSql = "UPDATE APPOINTMENTS SET status = 'Completed' WHERE appointment_id = ?";
        db.query(completeSql, [appointmentId], (updErr) => {
            if (updErr) {
                console.error('Error completing appointment:', updErr);
                return res.status(500).json({ error: 'Failed to mark appointment completed.' });
            }

            // Decrement provider capacity if it was active
            if (prevStatus !== 'Completed' && prevStatus !== 'Cancelled' && providerId) {
                // ASHRAFUL: commented out
                // db.query('UPDATE PROVIDER SET current_patients = GREATEST(0, current_patients - 1) WHERE provider_id = ?', [providerId]);
            }

            console.log(`Appointment #${appointmentId} marked Completed. Provider #${providerId} slot freed.`);

            res.status(200).json({
                message: 'Appointment successfully completed and clinical slot freed for waitlisted patients!',
                appointment_id: appointmentId,
                status: 'Completed'
            });
        });
    });
});

// ==========================================
// DIRECTORY & METADATA ENDPOINTS
// ==========================================

// Fetch providers
app.get('/api/providers', (req, res) => {
    const sql = 'SELECT * FROM PROVIDER';
    db.query(sql, (err, results) => {
        if (err) {
            console.error('Error fetching providers:', err);
            return res.status(500).json({ error: 'Failed to load directory' });
        }
        res.status(200).json(results);
    });
});

// Fetch patients
app.get('/api/patients', (req, res) => {
    const sql = 'SELECT patient_id, name, email, phone, city, preferred_language FROM PATIENT ORDER BY name ASC';
    db.query(sql, (err, results) => {
        if (err) {
            console.error('Error fetching patients:', err);
            return res.status(500).json({ error: 'Failed to load patients' });
        }
        res.status(200).json(results);
    });
});

// District leaderboard for patient home page
app.get('/api/patient-home/leaderboard', (req, res) => {
    const patientId = parseInt(req.query.patient_id, 10);

    if (!patientId) {
        return res.status(400).json({ error: 'patient_id is required' });
    }

    const patientSql = `
        SELECT p.patient_id, p.district_id, r.district_name
        FROM PATIENT p
        LEFT JOIN REGION r ON p.district_id = r.district_id
        WHERE p.patient_id = ?
    `;

    db.query(patientSql, [patientId], (patientErr, patientRows) => {
        if (patientErr) {
            console.error('Patient lookup error:', patientErr);
            return res.status(500).json({ error: 'Failed to load patient district.' });
        }

        if (!patientRows || patientRows.length === 0) {
            return res.status(404).json({ error: 'Patient not found.' });
        }

        const patient = patientRows[0];
        const districtId = patient.district_id;

        if (!districtId) {
            return res.status(200).json({
                district_name: patient.district_name || 'Unassigned',
                providers: []
            });
        }

        const leaderboardSql = `
            SELECT
                p.provider_id,
                p.name,
                p.session_fee,
                p.rating_avg,
                p.accepts_insurance,
                r.district_name
            FROM PROVIDER p
            LEFT JOIN REGION r ON p.district_id = r.district_id
            WHERE p.district_id = ?
              AND p.rating_avg IS NOT NULL
            ORDER BY p.rating_avg DESC, p.name ASC
            LIMIT 5
        `;

        db.query(leaderboardSql, [districtId], (leaderboardErr, providerRows) => {
            if (leaderboardErr) {
                console.error('Leaderboard query error:', leaderboardErr);
                return res.status(500).json({ error: 'Failed to load district leaderboard.' });
            }

            return res.status(200).json({
                district_name: patient.district_name || 'Your district',
                providers: (providerRows || []).map((provider, index) => ({
                    rank: index + 1,
                    provider_id: provider.provider_id,
                    name: provider.name,
                    rating_avg: Number(provider.rating_avg || 0),
                    session_fee: Number(provider.session_fee || 0),
                    accepts_insurance: Boolean(provider.accepts_insurance),
                    district_name: provider.district_name || 'District not recorded'
                }))
            });
        });
    });
});

app.get('/api/patient-home/insights', (req, res) => {
    const patientId = parseInt(req.query.patient_id, 10);

    if (!patientId) {
        return res.status(400).json({ error: 'patient_id is required' });
    }

    const patientSql = `
        SELECT p.patient_id, p.district_id, r.district_name, r.population
        FROM PATIENT p
        LEFT JOIN REGION r ON p.district_id = r.district_id
        WHERE p.patient_id = ?
    `;

    db.query(patientSql, [patientId], (patientErr, patientRows) => {
        if (patientErr) {
            console.error('Patient insights lookup error:', patientErr);
            return res.status(500).json({ error: 'Failed to load patient care insights.' });
        }

        if (!patientRows || patientRows.length === 0) {
            return res.status(404).json({ error: 'Patient not found.' });
        }

        const patient = patientRows[0];
        const districtId = patient.district_id;

        if (!districtId) {
            return res.status(200).json({
                district_name: patient.district_name || 'Unassigned',
                population: 0,
                total_providers: 0,
                insured_providers: 0,
                avg_rating: 0,
                population_per_provider: 0,
                zone_flag: 'NO DATA',
                summary: 'No district assigned yet.'
            });
        }

        const insightsSql = `
            SELECT
                r.district_name,
                r.population,
                COUNT(p.provider_id) AS total_providers,
                SUM(CASE WHEN p.accepts_insurance = 1 THEN 1 ELSE 0 END) AS insured_providers,
                ROUND(AVG(p.rating_avg), 2) AS avg_rating
            FROM REGION r
            LEFT JOIN PROVIDER p ON p.district_id = r.district_id
            WHERE r.district_id = ?
            GROUP BY r.district_id, r.district_name, r.population
        `;

        db.query(insightsSql, [districtId], (insightsErr, insightsRows) => {
            if (insightsErr) {
                console.error('District insights error:', insightsErr);
                return res.status(500).json({ error: 'Failed to load district care insights.' });
            }

            const row = (insightsRows && insightsRows[0]) || {
                district_name: patient.district_name || 'District',
                population: patient.population || 0,
                total_providers: 0,
                insured_providers: 0,
                avg_rating: 0
            };

            const population = Number(row.population || 0);
            const providerCount = Number(row.total_providers || 0);
            const insuredProviders = Number(row.insured_providers || 0);
            const avgRating = Number(row.avg_rating || 0);
            const populationPerProvider = providerCount > 0 ? Math.round(population / providerCount) : population;

            let zoneFlag = 'GREEN';
            if (providerCount === 0 || populationPerProvider > 500000) {
                zoneFlag = 'RED';
            } else if (populationPerProvider > 250000) {
                zoneFlag = 'YELLOW';
            }

            const summary = providerCount === 0
                ? 'No providers are currently assigned to this district.'
                : populationPerProvider > 500000
                    ? 'This district may need more local care coverage.'
                    : populationPerProvider > 250000
                        ? 'This district is moderately served but still needs support.'
                        : 'This district has relatively strong provider access.';

            return res.status(200).json({
                district_name: row.district_name || patient.district_name || 'District',
                population,
                total_providers: providerCount,
                insured_providers: insuredProviders,
                avg_rating: avgRating,
                population_per_provider: populationPerProvider,
                zone_flag: zoneFlag,
                summary
            });
        });
    });
});

app.get('/api/patient-home/accessibility-analysis', (req, res) => {
    const patientId = parseInt(req.query.patient_id, 10);
    if (!patientId) {
        return res.status(400).json({ error: 'patient_id is required' });
    }

    const patientSql = `
        SELECT p.patient_id, p.name AS patient_name, p.income_bracket, p.district_id, p.latitude AS patient_latitude, p.longitude AS patient_longitude, r.district_name
        FROM PATIENT p
        LEFT JOIN REGION r ON p.district_id = r.district_id
        WHERE p.patient_id = ?
    `;

    db.query(patientSql, [patientId], (patientErr, patientRows) => {
        if (patientErr) {
            console.error('Patient accessibility lookup error:', patientErr);
            return res.status(500).json({ error: 'Failed to load patient accessibility analysis.' });
        }

        if (!patientRows || patientRows.length === 0) {
            return res.status(404).json({ error: 'Patient not found.' });
        }

        const patient = patientRows[0];
        const districtId = patient.district_id;

        if (!districtId) {
            return res.status(200).json({
                district_name: patient.district_name || 'Unassigned',
                config: ACCESSIBILITY_CONFIG,
                patients: []
            });
        }

        const districtPatientsSql = `
            SELECT p.patient_id, p.name AS patient_name, p.income_bracket, p.latitude AS patient_latitude, p.longitude AS patient_longitude, r.district_name
            FROM PATIENT p
            LEFT JOIN REGION r ON p.district_id = r.district_id
            WHERE p.district_id = ?
            ORDER BY p.name ASC
        `;

        db.query(districtPatientsSql, [districtId], (districtErr, districtRows) => {
            if (districtErr) {
                console.error('District patient accessibility error:', districtErr);
                return res.status(500).json({ error: 'Failed to load district accessibility analysis.' });
            }

            const providerSql = `
                SELECT provider_id, name AS provider_name, latitude AS provider_latitude, longitude AS provider_longitude, session_fee
                FROM PROVIDER
                WHERE district_id = ?
                ORDER BY name ASC
            `;

            db.query(providerSql, [districtId], (providerErr, providerRows) => {
                if (providerErr) {
                    console.error('District provider lookup error:', providerErr);
                    return res.status(500).json({ error: 'Failed to load district providers.' });
                }

                const providers = providerRows || [];
                const patients = (districtRows || []).map(row => {
                    const provider = providers
                        .filter(candidate => candidate.provider_latitude !== null && candidate.provider_longitude !== null && candidate.provider_latitude !== undefined && candidate.provider_longitude !== undefined)
                        .map(candidate => {
                            const hasCoordinates = [row.patient_latitude, row.patient_longitude, candidate.provider_latitude, candidate.provider_longitude]
                                .every(value => value !== null && value !== undefined && Number.isFinite(Number(value)));
                            const distanceKm = hasCoordinates
                                ? Number(haversineDistanceKm(Number(row.patient_latitude), Number(row.patient_longitude), Number(candidate.provider_latitude), Number(candidate.provider_longitude)).toFixed(2))
                                : null;
                            return { ...candidate, distanceKm };
                        })
                        .sort((a, b) => (a.distanceKm ?? Number.MAX_SAFE_INTEGER) - (b.distanceKm ?? Number.MAX_SAFE_INTEGER))[0];

                    const normalizedIncomeBracket = normalizeIncomeBracket(row.income_bracket);
                    const financialBarrier = normalizedIncomeBracket
                        ? ACCESSIBILITY_CONFIG.financialBarrierByBracket[normalizedIncomeBracket]
                        : null;
                    const distanceKm = provider ? provider.distanceKm : null;
                    const distanceBarrier = distanceKm === null ? null : distanceKm > ACCESSIBILITY_CONFIG.distanceBarrierKm;
                    const overallClassification = financialBarrier && distanceBarrier !== null
                        ? accessibilityClassification(financialBarrier, distanceBarrier)
                        : 'Insufficient Data';

                    return {
                        patient_id: row.patient_id,
                        patient_name: row.patient_name,
                        district_name: row.district_name || 'District not recorded',
                        income_bracket: normalizedIncomeBracket || row.income_bracket || 'Not recorded',
                        provider_id: provider ? provider.provider_id : null,
                        provider_name: provider ? provider.provider_name : 'No local provider',
                        distance_km: distanceKm,
                        distance_barrier: distanceBarrier,
                        financial_barrier: financialBarrier || 'Not classified',
                        session_fee: provider ? provider.session_fee : null,
                        overall_classification: overallClassification,
                        severity: accessibilitySeverity(overallClassification)
                    };
                }).sort((first, second) => second.severity - first.severity || first.patient_name.localeCompare(second.patient_name));

                return res.status(200).json({
                    district_name: patient.district_name || 'District',
                    config: ACCESSIBILITY_CONFIG,
                    patients
                });
            });
        });
    });
});

// Fetch specializations
app.get('/api/specializations', (req, res) => {
    const sql = 'SELECT spec_id, spec_name FROM SPECIALIZATION ORDER BY spec_id ASC';
    db.query(sql, (err, results) => {
        if (err) {
            console.error('Error fetching specializations:', err);
            return res.status(500).json({ error: 'Failed to load specializations' });
        }
        res.status(200).json(results);
    });
});

// Fetch regions / districts
app.get('/api/regions', (req, res) => {
    const sql = 'SELECT district_id, district_name, population FROM REGION ORDER BY district_id ASC';
    db.query(sql, (err, results) => {
        if (err) {
            console.error('Error fetching regions:', err);
            return res.status(500).json({ error: 'Failed to load regions' });
        }
        res.status(200).json(results);
    });
});

// Fetch subregions / subdistricts (supports optional ?district_id=X)
app.get('/api/subregions', (req, res) => {
    const districtId = req.query.district_id ? parseInt(req.query.district_id, 10) : null;
    let sql = 'SELECT subregion_id, subregion_Name AS subregion_name, Latitude AS latitude, Longitude AS longitude, Population AS population, district_id FROM subregion';
    const params = [];
    if (districtId) {
        sql += ' WHERE district_id = ?';
        params.push(districtId);
    }
    sql += ' ORDER BY subregion_Name ASC';
    db.query(sql, params, (err, results) => {
        if (err) {
            console.error('Error fetching subregions:', err);
            return res.status(500).json({ error: 'Failed to load subregions' });
        }
        res.status(200).json(results);
    });
});


// Fetch languages
app.get('/api/languages', (req, res) => {
    const sql = 'SELECT language_code, language_name FROM LANGUAGES ORDER BY language_code ASC';
    db.query(sql, (err, results) => {
        if (err) {
            console.error('Error fetching languages:', err);
            return res.status(500).json({ error: 'Failed to load languages' });
        }
        res.status(200).json(results);
    });
});

// Fetch Directory Metadata (Combined regions, specializations, languages, fee stats)
app.get('/api/directory/meta', (req, res) => {
    const regionsSql = 'SELECT district_id, district_name, population FROM REGION ORDER BY district_id ASC';
    const specsSql = 'SELECT spec_id, spec_name FROM SPECIALIZATION ORDER BY spec_id ASC';
    const langsSql = 'SELECT language_code, language_name FROM LANGUAGES ORDER BY language_code ASC';
    const statsSql = `
        SELECT 
            MIN(session_fee) AS min_fee,
            MAX(session_fee) AS max_fee,
            (SELECT COUNT(*) FROM THERAPISTS) AS count_therapists,
            (SELECT COUNT(*) FROM CLINICS) AS count_clinics
        FROM PROVIDER
        WHERE session_fee > 0
    `;

    db.query(regionsSql, (err1, regions) => {
        if (err1) return res.status(500).json({ error: 'Failed to load regions' });

        db.query(specsSql, (err2, specializations) => {
            if (err2) return res.status(500).json({ error: 'Failed to load specializations' });

            db.query(langsSql, (err3, languages) => {
                if (err3) return res.status(500).json({ error: 'Failed to load languages' });

                db.query(statsSql, (err4, statsRows) => {
                    const stats = statsRows && statsRows[0] ? statsRows[0] : { min_fee: 1000, max_fee: 3300, count_therapists: 30, count_clinics: 20 };
                    res.status(200).json({
                        regions,
                        specializations,
                        languages,
                        stats
                    });
                });
            });
        });
    });
});

// Comprehensive Filtered Provider Directory Endpoint (Therapists and Clinics)
app.get('/api/directory', (req, res) => {
    const {
        max_fee,
        min_rating,
        district_id,
        city,
        spec_id,
        language_code,
        provider_type,
        search,
        sort_by
    } = req.query;

    let whereClauses = [
        '(t.provider_id IS NOT NULL OR c.provider_id IS NOT NULL)'
    ];
    let params = [];

    // Session fee filter
    if (max_fee !== undefined && max_fee !== '' && !isNaN(parseFloat(max_fee))) {
        const feeVal = parseFloat(max_fee);
        whereClauses.push('p.session_fee <= ?');
        params.push(feeVal);
    }

    // Minimum rating filter
    if (min_rating !== undefined && min_rating !== '' && !isNaN(parseFloat(min_rating))) {
        const ratingVal = parseFloat(min_rating);
        whereClauses.push('p.rating_avg >= ?');
        params.push(ratingVal);
    }

    // District / City filter
    if (district_id && district_id !== 'all') {
        whereClauses.push('p.district_id = ?');
        params.push(parseInt(district_id, 10));
    } else if (city && city.trim() !== '') {
        whereClauses.push('(r.district_name LIKE ? OR p.district_id IN (SELECT district_id FROM REGION WHERE district_name LIKE ?))');
        params.push(`%${city.trim()}%`, `%${city.trim()}%`);
    }

    // Provider Subclass Type Filter ('therapist' | 'clinic' | 'all')
    if (provider_type && provider_type !== 'all') {
        if (provider_type === 'therapist') {
            whereClauses.push('t.provider_id IS NOT NULL');
        } else if (provider_type === 'clinic') {
            whereClauses.push('c.provider_id IS NOT NULL');
        }
    }

    // Specialization Filter
    if (spec_id && spec_id !== 'all') {
        whereClauses.push('p.provider_id IN (SELECT provider_id FROM PROVIDER_SPECIALIZATIONS WHERE spec_id = ?)');
        params.push(parseInt(spec_id, 10));
    }

    // Language Filter (e.g. '001' English, '002' Bengali)
    if (language_code && language_code !== 'all') {
        whereClauses.push('p.provider_id IN (SELECT provider_id FROM PROVIDER_LANGUAGES WHERE language_code = ?)');
        params.push(language_code.trim());
    }

    // Keyword Search
    if (search && search.trim() !== '') {
        const queryTerm = `%${search.trim()}%`;
        whereClauses.push(`(
            p.name LIKE ? OR 
            r.district_name LIKE ? OR 
            t.license_no LIKE ? OR 
            c.registration_no LIKE ? OR
            p.provider_id IN (
                SELECT ps.provider_id FROM PROVIDER_SPECIALIZATIONS ps 
                JOIN SPECIALIZATION s2 ON ps.spec_id = s2.spec_id 
                WHERE s2.spec_name LIKE ?
            )
        )`);
        params.push(queryTerm, queryTerm, queryTerm, queryTerm, queryTerm);
    }

    const whereSql = whereClauses.length > 0 ? 'WHERE ' + whereClauses.join(' AND ') : '';

    // Sorting options
    let orderSql = 'ORDER BY p.rating_avg DESC, p.name ASC';
    if (sort_by === 'rating_desc') {
        orderSql = 'ORDER BY p.rating_avg DESC, p.name ASC';
    } else if (sort_by === 'fee_asc') {
        orderSql = 'ORDER BY p.session_fee ASC, p.rating_avg DESC';
    } else if (sort_by === 'fee_desc') {
        orderSql = 'ORDER BY p.session_fee DESC, p.rating_avg DESC';
    } else if (sort_by === 'experience_desc') {
        orderSql = 'ORDER BY COALESCE(t.years_of_experience, c.total_beds, 0) DESC, p.rating_avg DESC';
    } else if (sort_by === 'name_asc') {
        orderSql = 'ORDER BY p.name ASC';
    }

    const sql = `
        SELECT 
            p.provider_id,
            p.name,
            p.session_fee,
            p.max_capacity,
            p.current_patients,
            p.rating_avg,
            p.latitude,
            p.longitude,
            p.accepts_insurance,
            p.district_id,
            r.district_name,
            CASE 
                WHEN t.provider_id IS NOT NULL THEN 'therapist'
                WHEN c.provider_id IS NOT NULL THEN 'clinic'
                ELSE 'therapist'
            END AS provider_type,
            t.license_no,
            t.years_of_experience,
            c.registration_no,
            c.total_beds,
            COALESCE(GROUP_CONCAT(DISTINCT s.spec_name ORDER BY s.spec_name SEPARATOR ', '), '') AS specializations,
            COALESCE(GROUP_CONCAT(DISTINCT s.spec_id ORDER BY s.spec_id SEPARATOR ','), '') AS spec_ids,
            COALESCE(GROUP_CONCAT(DISTINCT l.language_name ORDER BY l.language_name SEPARATOR ', '), '') AS languages,
            COALESCE(GROUP_CONCAT(DISTINCT l.language_code ORDER BY l.language_code SEPARATOR ','), '') AS language_codes
        FROM PROVIDER p
        LEFT JOIN REGION r ON p.district_id = r.district_id
        LEFT JOIN THERAPISTS t ON p.provider_id = t.provider_id
        LEFT JOIN CLINICS c ON p.provider_id = c.provider_id
        LEFT JOIN PROVIDER_SPECIALIZATIONS ps ON p.provider_id = ps.provider_id
        LEFT JOIN SPECIALIZATION s ON ps.spec_id = s.spec_id
        LEFT JOIN PROVIDER_LANGUAGES pl ON p.provider_id = pl.provider_id
        LEFT JOIN LANGUAGES l ON pl.language_code = l.language_code
        ${whereSql}
        GROUP BY p.provider_id
        ${orderSql}
    `;

    db.query(sql, params, (err, results) => {
        if (err) {
            console.error('Directory query error:', err);
            return res.status(500).json({ error: 'Database search query failed.' });
        }

        res.status(200).json({
            total: results.length,
            providers: results
        });
    });
});

// ==========================================
// APPOINTMENT BOOKING & PATIENT CARE API
// ==========================================

// Book Appointment API
// If provider capacity is full, AUTOMATICALLY enrolls patient into WAITLIST with initial ROUTINE priority!
app.post('/api/appointments', (req, res) => {
    let { patient_id, provider_id, appointment_date, email, name } = req.body;

    const resolvePatient = (callback) => {
        if (patient_id) return callback(parseInt(patient_id, 10));
        if (email) {
            db.query('SELECT patient_id FROM PATIENT WHERE email = ?', [email.trim()], (err, rows) => {
                if (!err && rows && rows.length > 0) return callback(rows[0].patient_id);
                // If not found, default to patient 1
                return callback(1);
            });
        } else {
            return callback(1);
        }
    };

    resolvePatient((resolvedPatientId) => {
        if (!provider_id) {
            return res.status(400).json({ error: 'Please provide provider ID.' });
        }

        const resolvedDate = appointment_date || new Date().toISOString().split('T')[0];

        // Check provider capacity
        const checkSql = `
            SELECT 
                p.provider_id, 
                p.name, 
                p.max_capacity, 
                p.current_patients
            FROM PROVIDER p 
            WHERE p.provider_id = ?
        `;


    db.query(checkSql, [provider_id], (checkErr, checkRows) => {
        if (checkErr || !checkRows || checkRows.length === 0) {
            return res.status(404).json({ error: 'Provider not found.' });
        }

        const provider = checkRows[0];
        const currentCount = provider.current_patients || 0;
        const maxCap = provider.max_capacity || 0;

        // If provider is at or above capacity, automatically place patient in priority waitlist queue!
        if (maxCap > 0 && currentCount >= maxCap) {
            console.log(`Auto-Queue: Provider #${provider_id} (${provider.name}) is full (${currentCount}/${maxCap}). Placing Patient #${resolvedPatientId} in automated waitlist.`);

            // Check if patient already in active waitlist for this provider
            const checkWlSql = 'SELECT waitlist_id FROM WAITLIST WHERE patient_id = ? AND provider_id = ? AND status = "Active"';
            db.query(checkWlSql, [resolvedPatientId, provider_id], (wlChkErr, wlChkRows) => {
                if (!wlChkErr && wlChkRows && wlChkRows.length > 0) {
                    return res.status(200).json({
                        message: `You are already queued in ${provider.name}'s priority waitlist. Your position will automatically escalate as queue duration advances.`,
                        is_waitlisted: true,
                        waitlist_id: wlChkRows[0].waitlist_id,
                        priority_level: 'ROUTINE',
                        provider_id: provider.provider_id,
                        provider_name: provider.name
                    });
                }

                // Insert into waitlist with ROUTINE priority and crisis_score 1
                const insertWlSql = 'INSERT INTO WAITLIST (patient_id, provider_id, request_date, crisis_score, priority_level, status) VALUES (?, ?, CURDATE(), 1, "ROUTINE", "Active")';
                db.query(insertWlSql, [resolvedPatientId, provider_id], (insWlErr, insWlRes) => {
                    if (insWlErr) {
                        console.error('Error auto-queuing to waitlist:', insWlErr);
                        return res.status(500).json({ error: 'Failed to enroll in provider waitlist.' });
                    }

                    res.status(200).json({
                        message: `Provider ${provider.name} is currently at maximum capacity (${currentCount}/${maxCap} slots filled). You have been automatically enrolled in their Priority Waitlist queue!`,
                        is_waitlisted: true,
                        waitlist_id: insWlRes.insertId,
                        priority_level: 'ROUTINE',
                        provider_id: provider.provider_id,
                        provider_name: provider.name,
                        request_date: new Date().toISOString().split('T')[0]
                    });
                });
            });
            return;
        }

        // Provider has capacity: Insert Confirmed appointment
        const insertSql = 'INSERT INTO APPOINTMENTS (patient_id, provider_id, appointment_date, status) VALUES (?, ?, ?, ?)';
        db.query(insertSql, [resolvedPatientId, provider_id, resolvedDate, 'Confirmed'], (insErr, insResult) => {
            if (insErr) {
                console.error('Error creating appointment:', insErr);
                return res.status(500).json({ error: 'Failed to create appointment record.' });
            }

            // ASHRAFUL: commented out Increment provider current_patients count
            // db.query('UPDATE PROVIDER SET current_patients = current_patients + 1 WHERE provider_id = ?', [provider_id]);

            console.log(`Appointment #${insResult.insertId} booked for Patient #${resolvedPatientId} with Provider #${provider_id}`);
            res.status(200).json({
                message: 'Appointment successfully confirmed!',
                appointment_id: insResult.insertId,
                patient_id: resolvedPatientId,
                provider_id,
                provider_name: provider.name,
                appointment_date: resolvedDate,
                status: 'Confirmed'
            });
        });
    });
    });
});


// Fetch All Appointments and Waitlist Records for a Specific Patient
app.get('/api/patient/:id/appointments', (req, res) => {
    const patientId = parseInt(req.params.id, 10);
    if (!patientId || isNaN(patientId)) {
        return res.status(400).json({ error: 'Invalid patient ID provided.' });
    }

    runWaitlistAutoEscalation(() => {
        const patientSql = 'SELECT patient_id, name, email, phone, city, preferred_language FROM PATIENT WHERE patient_id = ?';
    
        const appointmentsSql = `
            SELECT 
                a.appointment_id,
                a.patient_id,
                a.provider_id,
                a.referral_id,
                DATE_FORMAT(a.appointment_date, '%Y-%m-%d') AS appointment_date,
                a.status,
                p.name AS provider_name,
                p.session_fee,
                p.rating_avg,
                p.accepts_insurance,
                p.district_id,
                r.district_name,
                CASE 
                    WHEN t.provider_id IS NOT NULL THEN 'therapist'
                    WHEN c.provider_id IS NOT NULL THEN 'clinic'
                    ELSE 'therapist'
                END AS provider_type,
                t.license_no,
                t.years_of_experience,
                c.registration_no,
                c.total_beds,
                COALESCE(GROUP_CONCAT(DISTINCT s.spec_name ORDER BY s.spec_name SEPARATOR ', '), '') AS specializations,
                COALESCE(GROUP_CONCAT(DISTINCT l.language_name ORDER BY l.language_name SEPARATOR ', '), '') AS languages
            FROM APPOINTMENTS a
            JOIN PROVIDER p ON a.provider_id = p.provider_id
            LEFT JOIN REGION r ON p.district_id = r.district_id
            LEFT JOIN THERAPISTS t ON p.provider_id = t.provider_id
            LEFT JOIN CLINICS c ON p.provider_id = c.provider_id
            LEFT JOIN PROVIDER_SPECIALIZATIONS ps ON p.provider_id = ps.provider_id
            LEFT JOIN SPECIALIZATION s ON ps.spec_id = s.spec_id
            LEFT JOIN PROVIDER_LANGUAGES pl ON p.provider_id = pl.provider_id
            LEFT JOIN LANGUAGES l ON pl.language_code = l.language_code
            WHERE a.patient_id = ?
            GROUP BY a.appointment_id
            ORDER BY a.appointment_date DESC, a.appointment_id DESC
        `;

        const waitlistSql = `
            SELECT 
                w.waitlist_id,
                w.patient_id,
                w.provider_id,
                p2.name AS provider_name,
                p2.district_id,
                r2.district_name,
                COALESCE((
                    SELECT GROUP_CONCAT(s2.spec_name SEPARATOR ', ')
                    FROM PROVIDER_SPECIALIZATIONS ps2
                    JOIN SPECIALIZATION s2 ON ps2.spec_id = s2.spec_id
                    WHERE ps2.provider_id = w.provider_id
                ), 'General Therapy') AS specialization_name,
                DATE_FORMAT(w.request_date, '%Y-%m-%d') AS request_date,
                DATEDIFF(CURDATE(), w.request_date) AS days_waiting,
                w.crisis_score,
                CASE 
                    WHEN w.status = 'Cancelled' THEN w.priority_level
                    WHEN w.crisis_score >= 9 OR DATEDIFF(CURDATE(), w.request_date) >= 6 THEN 'CRITICAL'
                    WHEN w.crisis_score >= 7 OR DATEDIFF(CURDATE(), w.request_date) >= 4 THEN 'HIGH'
                    WHEN w.crisis_score >= 4 OR DATEDIFF(CURDATE(), w.request_date) >= 2 THEN 'MODERATE'
                    ELSE 'ROUTINE'
                END AS priority_level,
                w.status
            FROM WAITLIST w
            LEFT JOIN PROVIDER p2 ON w.provider_id = p2.provider_id
            LEFT JOIN REGION r2 ON p2.district_id = r2.district_id
            WHERE w.patient_id = ?
            ORDER BY w.request_date DESC, w.waitlist_id DESC
        `;

        db.query(patientSql, [patientId], (pErr, pRows) => {
            const patient = pRows && pRows.length > 0 ? pRows[0] : { patient_id: patientId, name: 'Patient' };

            db.query(appointmentsSql, [patientId], (aErr, appointments) => {
                if (aErr) {
                    console.error('Error fetching patient appointments:', aErr);
                    return res.status(500).json({ error: 'Failed to retrieve appointments.' });
                }

                db.query(waitlistSql, [patientId], (wErr, waitlistRows) => {
                    if (wErr) {
                        console.error('Error fetching patient waitlist:', wErr);
                        return res.status(500).json({ error: 'Failed to retrieve waitlist entries.' });
                    }

                    const apts = appointments || [];
                    const wl = waitlistRows || [];

                    let confirmedCount = 0;
                    let completedCount = 0;
                    let cancelledCount = 0;
                    let referredCount = 0; // ASHRAFUL: for tracking REFERRED appointments from PATIENTS

                    apts.forEach(a => {
                        const st = (a.status || '').toLowerCase();
                        if (st === 'confirmed' || st === 'scheduled' || st === 'active') confirmedCount++;
                        else if (st === 'completed') completedCount++;
                        else if (st === 'cancelled') cancelledCount++;
                        else if (st === 'referred') referredCount++; // ASHRAFUL: for tracking REFERRED appointments from PATIENTS
                    });

                    const activeWaitlistCount = wl.filter(w => (w.status || '').toLowerCase() === 'active').length;

                    res.status(200).json({
                        patient,
                        stats: {
                            total_appointments: apts.length,
                            upcoming_confirmed: confirmedCount,
                            active_waitlist: activeWaitlistCount,
                            completed: completedCount,
                            cancelled: cancelledCount
                        },
                        appointments: apts,
                        waitlist: wl
                    });
                });
            });
        });
    });
});

// Dedicated Patient Personal Waitlist Tracker Endpoint
app.get('/api/patient/:id/waitlist', (req, res) => {
    const patientId = parseInt(req.params.id, 10);
    if (!patientId || isNaN(patientId)) {
        return res.status(400).json({ error: 'Valid patient ID is required.' });
    }

    runWaitlistAutoEscalation(() => {
        const sql = `
            SELECT 
                w.waitlist_id,
                w.patient_id,
                w.provider_id,
                p.name AS provider_name,
                p.session_fee,
                p.rating_avg,
                p.current_patients,
                p.max_capacity,
                r.district_name,
                CASE 
                    WHEN t.provider_id IS NOT NULL THEN 'therapist'
                    WHEN c.provider_id IS NOT NULL THEN 'clinic'
                    ELSE 'therapist'
                END AS provider_type,
                t.license_no,
                c.registration_no,
                COALESCE((
                    SELECT GROUP_CONCAT(s2.spec_name SEPARATOR ', ')
                    FROM PROVIDER_SPECIALIZATIONS ps2
                    JOIN SPECIALIZATION s2 ON ps2.spec_id = s2.spec_id
                    WHERE ps2.provider_id = w.provider_id
                ), 'General Therapy') AS specializations,
                DATE_FORMAT(w.request_date, '%Y-%m-%d') AS request_date,
                DATEDIFF(CURDATE(), w.request_date) AS days_waiting,
                CASE 
                    WHEN w.status = 'Cancelled' THEN w.priority_level
                    WHEN DATEDIFF(CURDATE(), w.request_date) >= 6 THEN 'CRITICAL'
                    WHEN DATEDIFF(CURDATE(), w.request_date) >= 4 THEN 'HIGH'
                    WHEN DATEDIFF(CURDATE(), w.request_date) >= 2 THEN 'MODERATE'
                    ELSE 'ROUTINE'
                END AS priority_level,
                w.status
            FROM WAITLIST w
            JOIN PROVIDER p ON w.provider_id = p.provider_id
            LEFT JOIN REGION r ON p.district_id = r.district_id
            LEFT JOIN THERAPISTS t ON p.provider_id = t.provider_id
            LEFT JOIN CLINICS c ON p.provider_id = c.provider_id
            WHERE w.patient_id = ?
            ORDER BY 
                CASE w.status
                    WHEN 'Active' THEN 1
                    WHEN 'Assigned' THEN 2
                    ELSE 3
                END,
                w.request_date DESC,
                w.waitlist_id DESC
        `;

        db.query(sql, [patientId], (err, rows) => {
            if (err) {
                console.error('Error fetching patient waitlist:', err);
                return res.status(500).json({ error: 'Failed to retrieve waitlist.' });
            }

            const list = rows || [];
            const activeCount = list.filter(w => (w.status || '').toLowerCase() === 'active').length;
            const assignedCount = list.filter(w => (w.status || '').toLowerCase() === 'assigned').length;
            const maxDays = list.length > 0 ? Math.max(...list.map(w => w.days_waiting || 0)) : 0;

            res.status(200).json({
                patient_id: patientId,
                stats: {
                    total_waitlist_records: list.length,
                    active_waitlist_count: activeCount,
                    assigned_count: assignedCount,
                    max_days_waiting: maxDays
                },
                waitlist: list
            });
        });
    });
});

// Patient Cancel Waitlist Request
app.put('/api/waitlist/:id/cancel', (req, res) => {
    const waitlistId = parseInt(req.params.id, 10);
    const { patient_id } = req.body;

    if (!waitlistId || isNaN(waitlistId)) {
        return res.status(400).json({ error: 'Valid waitlist ID is required.' });
    }

    let sql = 'UPDATE WAITLIST SET status = "Cancelled" WHERE waitlist_id = ?';
    const params = [waitlistId];

    if (patient_id) {
        sql += ' AND patient_id = ?';
        params.push(parseInt(patient_id, 10));
    }

    db.query(sql, params, (err, result) => {
        if (err) {
            console.error('Error cancelling waitlist request:', err);
            return res.status(500).json({ error: 'Failed to cancel waitlist request.' });
        }
        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'Waitlist record not found or not owned by patient.' });
        }

        res.status(200).json({
            message: 'Waitlist queue request successfully cancelled.',
            waitlist_id: waitlistId,
            status: 'Cancelled'
        });
    });
});

// Reschedule Appointment Date
app.put('/api/appointments/:id/reschedule', (req, res) => {
    const appointmentId = parseInt(req.params.id, 10);
    const { appointment_date } = req.body;

    if (!appointmentId || !appointment_date) {
        return res.status(400).json({ error: 'Appointment ID and new appointment date are required.' });
    }

    const sql = "UPDATE APPOINTMENTS SET appointment_date = ?, status = 'Confirmed' WHERE appointment_id = ?";
    db.query(sql, [appointment_date, appointmentId], (err, result) => {
        if (err) {
            console.error('Error rescheduling appointment:', err);
            return res.status(500).json({ error: 'Database update failed.' });
        }
        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'Appointment record not found.' });
        }

        res.status(200).json({
            message: 'Appointment date successfully rescheduled!',
            appointment_id: appointmentId,
            appointment_date,
            status: 'Confirmed'
        });
    });
});

// ==========================================
// PATIENT MEDICAL HISTORY & CLINICAL DOSSIER API
// ==========================================

// Get comprehensive clinical checkup history for a patient
app.get('/api/patient/:id/history', (req, res) => {
    const patientId = parseInt(req.params.id, 10);
    if (!patientId || isNaN(patientId)) {
        return res.status(400).json({ error: 'Valid patient ID is required.' });
    }

    const patientSql = `
        SELECT 
            p.patient_id, p.name, p.email, p.phone, 
            DATE_FORMAT(p.date_of_birth, '%Y-%m-%d') AS date_of_birth, 
            p.age, p.preferred_language, 
            p.street, p.city, p.zip_code, 
            r.district_name,
            DATE_FORMAT(p.created_at, '%Y-%m-%d') AS registered_date
        FROM PATIENT p
        LEFT JOIN REGION r ON p.district_id = r.district_id
        WHERE p.patient_id = ?
    `;

    const appointmentsSql = `
        SELECT 
            a.appointment_id,
            a.patient_id,
            a.provider_id,
            DATE_FORMAT(a.appointment_date, '%Y-%m-%d') AS appointment_date,
            a.status,
            COALESCE(a.clinical_notes, '') AS clinical_notes,
            COALESCE(a.prescription, '') AS prescription,
            p.name AS provider_name,
            p.session_fee,
            p.rating_avg,
            r.district_name,
            CASE 
                WHEN t.provider_id IS NOT NULL THEN 'therapist'
                WHEN c.provider_id IS NOT NULL THEN 'clinic'
                ELSE 'therapist'
            END AS provider_type,
            t.license_no,
            c.registration_no,
            COALESCE(GROUP_CONCAT(DISTINCT s.spec_name ORDER BY s.spec_name SEPARATOR ', '), 'General Consultation') AS specializations
        FROM APPOINTMENTS a
        JOIN PROVIDER p ON a.provider_id = p.provider_id
        LEFT JOIN REGION r ON p.district_id = r.district_id
        LEFT JOIN THERAPISTS t ON p.provider_id = t.provider_id
        LEFT JOIN CLINICS c ON p.provider_id = c.provider_id
        LEFT JOIN PROVIDER_SPECIALIZATIONS ps ON p.provider_id = ps.provider_id
        LEFT JOIN SPECIALIZATION s ON ps.spec_id = s.spec_id
        WHERE a.patient_id = ?
        GROUP BY a.appointment_id
        ORDER BY a.appointment_date DESC, a.appointment_id DESC
    `;

    const doctorVisitsSql = `
        SELECT 
            p.provider_id,
            p.name AS provider_name,
            CASE 
                WHEN t.provider_id IS NOT NULL THEN 'therapist'
                WHEN c.provider_id IS NOT NULL THEN 'clinic'
                ELSE 'therapist'
            END AS provider_type,
            r.district_name,
            COUNT(a.appointment_id) AS total_visits,
            SUM(CASE WHEN a.status = 'Completed' THEN 1 ELSE 0 END) AS completed_visits,
            SUM(CASE WHEN a.status = 'Cancelled' THEN 1 ELSE 0 END) AS cancelled_visits,
            SUM(CASE WHEN a.status IN ('Confirmed', 'Scheduled', 'Active') THEN 1 ELSE 0 END) AS active_visits,
            MAX(DATE_FORMAT(a.appointment_date, '%Y-%m-%d')) AS last_visit_date,
            COALESCE(GROUP_CONCAT(DISTINCT s.spec_name ORDER BY s.spec_name SEPARATOR ', '), 'General Care') AS specializations
        FROM APPOINTMENTS a
        JOIN PROVIDER p ON a.provider_id = p.provider_id
        LEFT JOIN REGION r ON p.district_id = r.district_id
        LEFT JOIN THERAPISTS t ON p.provider_id = t.provider_id
        LEFT JOIN CLINICS c ON p.provider_id = c.provider_id
        LEFT JOIN PROVIDER_SPECIALIZATIONS ps ON p.provider_id = ps.provider_id
        LEFT JOIN SPECIALIZATION s ON ps.spec_id = s.spec_id
        WHERE a.patient_id = ?
        GROUP BY p.provider_id
        ORDER BY total_visits DESC, last_visit_date DESC
    `;

    const problemAreasSql = `
        SELECT 
            s.spec_name,
            COUNT(DISTINCT a.appointment_id) AS consultation_count
        FROM APPOINTMENTS a
        JOIN PROVIDER_SPECIALIZATIONS ps ON a.provider_id = ps.provider_id
        JOIN SPECIALIZATION s ON ps.spec_id = s.spec_id
        WHERE a.patient_id = ?
        GROUP BY s.spec_name
        ORDER BY consultation_count DESC
    `;

    const waitlistSql = `
        SELECT 
            w.waitlist_id,
            w.provider_id,
            p.name AS provider_name,
            DATE_FORMAT(w.request_date, '%Y-%m-%d') AS request_date,
            DATEDIFF(CURDATE(), w.request_date) AS days_waiting,
            w.priority_level,
            w.status
        FROM WAITLIST w
        JOIN PROVIDER p ON w.provider_id = p.provider_id
        WHERE w.patient_id = ?
        ORDER BY w.request_date DESC
    `;

    db.query(patientSql, [patientId], (pErr, pRows) => {
        if (pErr || !pRows || pRows.length === 0) {
            return res.status(404).json({ error: 'Patient record not found.' });
        }

        const patient = pRows[0];

        db.query(appointmentsSql, [patientId], (aErr, appointments) => {
            if (aErr) {
                console.error('Error fetching appointments history:', aErr);
                return res.status(500).json({ error: 'Failed to retrieve checkup history.' });
            }

            db.query(doctorVisitsSql, [patientId], (docErr, doctorVisits) => {
                if (docErr) {
                    console.error('Error fetching doctor visits summary:', docErr);
                    return res.status(500).json({ error: 'Failed to retrieve doctor visit history.' });
                }

                db.query(problemAreasSql, [patientId], (probErr, problemAreas) => {
                    if (probErr) {
                        console.error('Error fetching problem areas:', probErr);
                        return res.status(500).json({ error: 'Failed to retrieve problem areas.' });
                    }

                    db.query(waitlistSql, [patientId], (wlErr, waitlistRows) => {
                        if (wlErr) {
                            console.error('Error fetching waitlist history:', wlErr);
                            return res.status(500).json({ error: 'Failed to retrieve waitlist history.' });
                        }

                        const apts = appointments || [];
                        const completedCount = apts.filter(a => (a.status || '').toLowerCase() === 'completed').length;
                        const cancelledCount = apts.filter(a => (a.status || '').toLowerCase() === 'cancelled').length;
                        const confirmedCount = apts.filter(a => ['confirmed', 'scheduled', 'active'].includes((a.status || '').toLowerCase())).length;
                        const totalApts = apts.length;
                        const cancelRatePct = totalApts > 0 ? Math.round((cancelledCount / totalApts) * 100) : 0;

                        res.status(200).json({
                            patient,
                            summary: {
                                total_appointments: totalApts,
                                completed_visits: completedCount,
                                confirmed_upcoming: confirmedCount,
                                cancelled_appointments: cancelledCount,
                                cancellation_rate_pct: cancelRatePct,
                                distinct_doctors_visited: (doctorVisits || []).length,
                                total_waitlists_queued: (waitlistRows || []).length
                            },
                            doctor_visits: doctorVisits || [],
                            problem_areas: problemAreas || [],
                            appointments: apts,
                            waitlist_history: waitlistRows || []
                        });
                    });
                });
            });
        });
    });
});

// Update Clinical Notes & Prescription for an Appointment
app.post('/api/appointments/:id/clinical-notes', (req, res) => {
    const appointmentId = parseInt(req.params.id, 10);
    const { clinical_notes, prescription } = req.body;

    if (!appointmentId || isNaN(appointmentId)) {
        return res.status(400).json({ error: 'Valid appointment ID is required.' });
    }

    const updateSql = 'UPDATE APPOINTMENTS SET clinical_notes = ?, prescription = ? WHERE appointment_id = ?';
    db.query(updateSql, [clinical_notes || '', prescription || '', appointmentId], (err, result) => {
        if (err) {
            console.error('Error saving clinical notes:', err);
            return res.status(500).json({ error: 'Failed to update clinical notes.' });
        }
        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'Appointment not found.' });
        }

        res.status(200).json({
            message: 'Clinical notes and prescription updated successfully!',
            appointment_id: appointmentId,
            clinical_notes,
            prescription
        });
    });
});

// Search Patients for Provider Lookup
app.get('/api/patients/search', (req, res) => {
    const q = (req.query.q || '').trim();
    if (!q) {
        return res.status(200).json([]);
    }

    const queryWildcard = `%${q}%`;
    const sql = `
        SELECT 
            p.patient_id, p.name, p.email, p.phone, p.city, p.age, p.preferred_language,
            COUNT(DISTINCT a.appointment_id) AS total_visits,
            SUM(CASE WHEN a.status = 'Completed' THEN 1 ELSE 0 END) AS completed_visits,
            SUM(CASE WHEN a.status = 'Cancelled' THEN 1 ELSE 0 END) AS cancelled_visits
        FROM PATIENT p
        LEFT JOIN APPOINTMENTS a ON p.patient_id = a.patient_id
        WHERE p.name LIKE ? OR p.email LIKE ? OR p.phone LIKE ? OR CAST(p.patient_id AS CHAR) = ?
        GROUP BY p.patient_id
        ORDER BY p.name ASC
        LIMIT 15
    `;

    db.query(sql, [queryWildcard, queryWildcard, queryWildcard, q], (err, rows) => {
        if (err) {
            console.error('Patient search error:', err);
            return res.status(500).json({ error: 'Search failed.' });
        }
        res.status(200).json(rows || []);
    });
});

// ==========================================
// AUTOMATED WAITLIST ESCALATION ENGINE
// ==========================================

// Auto-escalates patient priority strictly based on elapsed wait duration:
// 0–2 days: ROUTINE
// > 2 Days (Day 3-4): Auto-escalated to MODERATE
// > 4 Days (Day 5-6): Auto-escalated to HIGH
// > 6 Days (Day 7+):  Auto-escalated to CRITICAL
function runWaitlistAutoEscalation(callback) {
    const sql = `
        UPDATE WAITLIST
        SET priority_level = CASE
            WHEN crisis_score >= 9 OR DATEDIFF(CURDATE(), request_date) >= 6 THEN 'CRITICAL'
            WHEN crisis_score >= 7 OR DATEDIFF(CURDATE(), request_date) >= 4 THEN 'HIGH'
            WHEN crisis_score >= 4 OR DATEDIFF(CURDATE(), request_date) >= 2 THEN 'MODERATE'
            ELSE 'ROUTINE'
        END
        WHERE status = 'Active'
    `;

    db.query(sql, (err, result) => {
        if (err) {
            console.error('Waitlist auto-escalation error:', err);
        } else if (result && result.changedRows > 0) {
            console.log(`Auto-Escalation Engine: ${result.changedRows} waitlist record(s) escalated due to elapsed queue duration.`);
        }
        if (callback) callback(err, result);
    });
}

// Run auto-escalation every 30 minutes
setInterval(runWaitlistAutoEscalation, 30 * 60 * 1000);

// Fetch All Priority Waitlist Records
app.get('/api/waitlist', (req, res) => {
    runWaitlistAutoEscalation(() => {
        const sql = `
            SELECT 
                w.waitlist_id,
                w.patient_id,
                w.provider_id,
                p.name AS patient_name,
                p.email AS patient_email,
                p.phone AS patient_phone,
                p.city AS patient_city,
                pr.name AS provider_name,
                pr.district_id,
                COALESCE((
                    SELECT GROUP_CONCAT(s2.spec_name SEPARATOR ', ')
                    FROM PROVIDER_SPECIALIZATIONS ps2
                    JOIN SPECIALIZATION s2 ON ps2.spec_id = s2.spec_id
                    WHERE ps2.provider_id = w.provider_id
                ), 'General Therapy') AS specialization_name,
                DATE_FORMAT(w.request_date, '%Y-%m-%d') AS request_date,
                DATEDIFF(CURDATE(), w.request_date) AS days_waiting,
                w.crisis_score,
                CASE 
                    WHEN w.status = 'Cancelled' THEN w.priority_level
                    WHEN w.crisis_score >= 9 OR DATEDIFF(CURDATE(), w.request_date) >= 6 THEN 'CRITICAL'
                    WHEN w.crisis_score >= 7 OR DATEDIFF(CURDATE(), w.request_date) >= 4 THEN 'HIGH'
                    WHEN w.crisis_score >= 4 OR DATEDIFF(CURDATE(), w.request_date) >= 2 THEN 'MODERATE'
                    ELSE 'ROUTINE'
                END AS priority_level,
                w.status,
                CASE 
                    WHEN DATEDIFF(CURDATE(), w.request_date) >= 2 THEN 1
                    ELSE 0
                END AS is_time_escalated
            FROM WAITLIST w
            JOIN PATIENT p ON w.patient_id = p.patient_id
            LEFT JOIN PROVIDER pr ON w.provider_id = pr.provider_id
            ORDER BY 
                CASE w.status
                    WHEN 'Active' THEN 1
                    WHEN 'Assigned' THEN 2
                    WHEN 'Cancelled' THEN 3
                    ELSE 4
                END,
                CASE 
                    WHEN w.crisis_score >= 9 OR DATEDIFF(CURDATE(), w.request_date) >= 6 THEN 1
                    WHEN w.crisis_score >= 7 OR DATEDIFF(CURDATE(), w.request_date) >= 4 THEN 2
                    WHEN w.crisis_score >= 4 OR DATEDIFF(CURDATE(), w.request_date) >= 2 THEN 3
                    ELSE 4
                END ASC,
                days_waiting DESC,
                w.waitlist_id ASC
        `;

        db.query(sql, (err, results) => {
            if (err) {
                console.error('Error loading waitlist:', err);
                return res.status(500).json({ error: 'Failed to load waitlist data.' });
            }

            res.status(200).json(results || []);
        });
    });
});

// Join Priority Waitlist (Defaults to initial ROUTINE priority, automated escalation applies over time)
app.post('/api/waitlist/join', (req, res) => {
    const { patient_id, provider_id } = req.body;

    if (!patient_id) {
        return res.status(400).json({ error: 'Patient ID is required to join waitlist.' });
    }

    const resolvedProviderId = provider_id ? parseInt(provider_id, 10) : 1;

    // Check if patient already has an active waitlist request for this provider
    const checkActiveSql = 'SELECT waitlist_id FROM WAITLIST WHERE patient_id = ? AND provider_id = ? AND status = "Active"';
    db.query(checkActiveSql, [patient_id, resolvedProviderId], (checkErr, checkRows) => {
        if (!checkErr && checkRows && checkRows.length > 0) {
            return res.status(200).json({
                message: 'You are already in the priority queue for this provider. Position automatically escalates over time.',
                waitlist_id: checkRows[0].waitlist_id,
                priority_level: 'ROUTINE',
                provider_id: resolvedProviderId
            });
        }

        // Insert new waitlist record with initial ROUTINE priority
        const insertSql = 'INSERT INTO WAITLIST (patient_id, provider_id, request_date, crisis_score, priority_level, status) VALUES (?, ?, CURDATE(), 1, "ROUTINE", "Active")';
        db.query(insertSql, [patient_id, resolvedProviderId], (insErr, insRes) => {
            if (insErr) {
                console.error('Error joining waitlist:', insErr);
                return res.status(500).json({ error: 'Failed to join priority waitlist.' });
            }

            console.log(`Patient #${patient_id} queued into Priority Waitlist #${insRes.insertId} (Provider #${resolvedProviderId}, Priority: ROUTINE)`);

            res.status(200).json({
                message: 'Successfully queued into the automated priority waitlist!',
                waitlist_id: insRes.insertId,
                patient_id,
                provider_id: resolvedProviderId,
                priority_level: 'ROUTINE',
                request_date: new Date().toISOString().split('T')[0],
                status: 'Active'
            });
        });
    });
});

// Alias for POST /api/waitlist
app.post('/api/waitlist', (req, res) => {
    req.url = '/api/waitlist/join';
    app.handle(req, res);
});

// General Update for Waitlist
app.put('/api/waitlist/:id', (req, res) => {
    const waitlistId = parseInt(req.params.id, 10);
    const { status } = req.body;

    if (!waitlistId) {
        return res.status(400).json({ error: 'Valid waitlist ID required.' });
    }

    if (!status) {
        return res.status(400).json({ error: 'Status is required.' });
    }

    const sql = 'UPDATE WAITLIST SET status = ? WHERE waitlist_id = ?';
    db.query(sql, [status, waitlistId], (err, result) => {
        if (err) {
            console.error('Error updating waitlist entry:', err);
            return res.status(500).json({ error: 'Failed to update waitlist entry.' });
        }

        runWaitlistAutoEscalation(() => {
            res.status(200).json({
                message: 'Waitlist entry updated successfully.',
                waitlist_id: waitlistId,
                status
            });
        });
    });
});

// Cancel Waitlist Request
app.put('/api/waitlist/:id/cancel', (req, res) => {
    req.body = { status: 'Cancelled' };
    req.url = `/api/waitlist/${req.params.id}`;
    app.handle(req, res);
});

// ==========================================
// FEATURE 7: ZONE DETECTOR & PAGES
// ==========================================

// Feature 7: Zone Detector (Analytical Demographics & Provider Ratio Query)
app.get('/api/zone-detections', (req, res) => {
    const sql = `
        SELECT 
            r.district_id,
            r.district_name,
            r.population,
            COUNT(p.provider_id) AS total_providers,
            COUNT(t.provider_id) AS total_therapists,
            COUNT(c.provider_id) AS total_clinics,
            COUNT(h.provider_id) AS total_hotlines,
            COALESCE(SUM(p.max_capacity), 0) AS total_capacity,
            COALESCE(SUM(p.current_patients), 0) AS total_active_patients,
            CASE 
                WHEN COUNT(p.provider_id) = 0 THEN r.population 
                ELSE ROUND(r.population / COUNT(p.provider_id)) 
            END AS population_per_provider,
            ROUND((COUNT(p.provider_id) * 100000.0) / NULLIF(r.population, 0), 2) AS providers_per_100k,
            CASE 
                WHEN COUNT(p.provider_id) = 0 
                     OR (r.population / NULLIF(COUNT(p.provider_id), 0)) >= 500000 
                THEN 'RED'
                WHEN (r.population / NULLIF(COUNT(p.provider_id), 0)) >= 250000 
                THEN 'YELLOW'
                ELSE 'GREEN'
            END AS zone_flag
        FROM REGION r
        LEFT JOIN PROVIDER p ON r.district_id = p.district_id
        LEFT JOIN THERAPISTS t ON p.provider_id = t.provider_id
        LEFT JOIN CLINICS c ON p.provider_id = c.provider_id
        LEFT JOIN HOTLINES h ON p.provider_id = h.provider_id
        GROUP BY r.district_id, r.district_name, r.population
        ORDER BY 
            CASE 
                WHEN COUNT(p.provider_id) = 0 
                     OR (r.population / NULLIF(COUNT(p.provider_id), 0)) >= 500000 THEN 1
                WHEN (r.population / NULLIF(COUNT(p.provider_id), 0)) >= 250000 THEN 2
                ELSE 3
            END ASC,
            population_per_provider DESC;
    `;

    db.query(sql, (err, results) => {
        if (err) {
            console.error('Zone detection analytical query error:', err);
            return res.status(500).json({ error: 'Failed to run zone detection analytical query.' });
        }

        res.status(200).json({
            total_districts: results.length,
            zones: results
        });
    });
});

// Alias for /api/zone-detection
app.get('/api/zone-detection', (req, res) => {
    req.url = '/api/zone-detections';
    app.handle(req, res);
});

// Feature 7: Subzone / Subdistrict Detector (Analytical Query for Subregions)
app.get('/api/subzone-detections', (req, res) => {
    const districtId = req.query.district_id ? parseInt(req.query.district_id, 10) : null;
    let whereSql = '';
    const params = [];
    if (districtId) {
        whereSql = 'WHERE s.district_id = ?';
        params.push(districtId);
    }

    const sql = `
        SELECT 
            s.subregion_id,
            s.subregion_Name AS subdistrict_name,
            s.Population AS population,
            s.district_id,
            r.district_name,
            COUNT(p_closest.provider_id) AS total_providers,
            CASE 
                WHEN COUNT(p_closest.provider_id) = 0 THEN s.Population 
                ELSE ROUND(s.Population / COUNT(p_closest.provider_id)) 
            END AS population_per_provider,
            CASE 
                WHEN COUNT(p_closest.provider_id) = 0 
                     OR (s.Population / NULLIF(COUNT(p_closest.provider_id), 0)) > 75000 
                THEN 'RED'
                WHEN (s.Population / NULLIF(COUNT(p_closest.provider_id), 0)) > 50000 
                THEN 'YELLOW'
                ELSE 'GREEN'
            END AS zone_flag
        FROM subregion s
        JOIN region r ON s.district_id = r.district_id
        LEFT JOIN (
            SELECT 
                p.provider_id,
                p.district_id,
                (
                    SELECT s2.subregion_id 
                    FROM subregion s2 
                    WHERE s2.district_id = p.district_id 
                    ORDER BY (POW(CAST(p.latitude AS DECIMAL(10,6)) - CAST(s2.Latitude AS DECIMAL(10,6)), 2) + POW(CAST(p.longitude AS DECIMAL(10,6)) - CAST(s2.Longitude AS DECIMAL(10,6)), 2)) ASC 
                    LIMIT 1
                ) AS closest_subregion_id
            FROM provider p
        ) p_closest ON s.subregion_id = p_closest.closest_subregion_id
        ${whereSql}
        GROUP BY s.subregion_id, s.subregion_Name, s.Population, s.district_id, r.district_name
        ORDER BY s.district_id ASC, 
            CASE 
                WHEN COUNT(p_closest.provider_id) = 0 
                     OR (s.Population / NULLIF(COUNT(p_closest.provider_id), 0)) > 75000 THEN 1
                WHEN (s.Population / NULLIF(COUNT(p_closest.provider_id), 0)) > 50000 THEN 2
                ELSE 3
            END ASC,
            population_per_provider DESC
    `;

    db.query(sql, params, (err, results) => {
        if (err) {
            console.error('Subzone analytical query error:', err);
            return res.status(500).json({ error: 'Failed to run subzone analytical query.' });
        }

        res.status(200).json({
            total_subzones: results.length,
            subzones: results
        });
    });
});

// Alias for /api/subzone-detection
app.get('/api/subzone-detection', (req, res) => {
    req.url = '/api/subzone-detections';
    app.handle(req, res);
});


const PORT = 3000;

// V2 // ASHRAFUL: moved all my apis to routes/v2-routes.js folder
// imported below
const v2Routes = require('./routes/v2-routes')(db, getHtmlFiles);
app.use('/', v2Routes);

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
    // Run initial auto-escalation check on server startup
    runWaitlistAutoEscalation();
});
