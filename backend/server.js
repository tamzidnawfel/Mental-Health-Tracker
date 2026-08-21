const express = require('express');
const mysql = require('mysql2');
const cors = require('cors');
const path = require('path');

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
});

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

// Register Patient API (Checks existing email, generates automated password & stores in DB)
app.post('/api/register', (req, res) => {
    const { name, email, phone, date_of_birth, income_bracket, preferred_language, street, city, zip_code, latitude, longitude } = req.body;
    
    if (!email) {
        return res.status(400).json({ error: 'Email address is required.' });
    }

    const trimmedEmail = email.trim();

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

        const sql = 'INSERT INTO PATIENT (name, email, phone, date_of_birth, income_bracket, preferred_language, street, city, zip_code, latitude, longitude, password) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)';

        db.query(sql, [name, trimmedEmail, phone, date_of_birth, income_bracket, preferred_language, street, city, zip_code, latitude, longitude, generatedPassword], (err, result) => {
            if (err) {
                if (err.code === 'ER_DUP_ENTRY') {
                    return res.status(409).json({ error: 'Account already exists. Proceed to login', exists: true });
                }

                // Fallback in case password column was not yet added
                const fallbackSql = 'INSERT INTO PATIENT (name, email, phone, date_of_birth, income_bracket, preferred_language, street, city, zip_code, latitude, longitude) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)';
                db.query(fallbackSql, [name, trimmedEmail, phone, date_of_birth, income_bracket, preferred_language, street, city, zip_code, latitude, longitude], (fallbackErr, fallbackRes) => {
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
                        email: trimmedEmail
                    });
                });
                return;
            }

            console.log('New patient added with ID:', result.insertId, '| Generated Password:', generatedPassword);
            res.status(200).json({ 
                message: 'Patient registered successfully!', 
                patient_id: result.insertId,
                password: generatedPassword,
                name,
                email: trimmedEmail
            });
        });
    });
});


// Patient Login API (Authenticates by Email and Password)
app.post('/api/patient-login', (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({ error: 'Please provide both email address and password.' });
    }

    const sql = 'SELECT patient_id, name, email, phone, preferred_language, city FROM PATIENT WHERE email = ? AND password = ?';
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



// Automatic Waitlist Entry Insertion (Called when an appointment booking has no available slots)
app.post('/api/waitlist', (req, res) => {
    const { patient_id, spec_id, crisis_score, priority_level, request_date, status } = req.body;

    const score = parseInt(crisis_score || 5, 10);
    
    // Automated priority calculation based on crisis score
    let calculatedPriority = priority_level;
    if (!calculatedPriority) {
        if (score >= 9) calculatedPriority = 'CRITICAL';
        else if (score >= 7) calculatedPriority = 'HIGH';
        else if (score >= 4) calculatedPriority = 'MODERATE';
        else calculatedPriority = 'ROUTINE';
    }

    const reqDate = request_date || new Date().toISOString().slice(0, 10);
    const entryStatus = status || 'Active';

    const sql = 'INSERT INTO WAITLIST (patient_id, spec_id, request_date, crisis_score, priority_level, status) VALUES (?, ?, ?, ?, ?, ?)';

    db.query(sql, [patient_id, spec_id, reqDate, score, calculatedPriority, entryStatus], (err, result) => {
        if (err) {
            console.error('Error joining waitlist:', err);
            return res.status(500).json({ error: 'Failed to join waitlist' });
        }
        console.log('Patient added to waitlist! Generated Waitlist ID:', result.insertId);
        res.status(200).json({
            message: 'Successfully added to waitlist!',
            waitlist_id: result.insertId,
            patient_id,
            spec_id,
            request_date: reqDate,
            crisis_score: score,
            priority_level: calculatedPriority,
            status: entryStatus
        });
    });
});

// Fetch all waitlist entries with patient & specialization details, plus derived days_waiting
app.get('/api/waitlist', (req, res) => {
    const sql = `
        SELECT 
            w.waitlist_id,
            w.patient_id,
            w.spec_id,
            w.request_date,
            w.crisis_score,
            w.priority_level,
            w.status,
            DATEDIFF(CURDATE(), w.request_date) AS days_waiting,
            p.name AS patient_name,
            p.email AS patient_email,
            p.phone AS patient_phone,
            s.spec_name
        FROM WAITLIST w
        LEFT JOIN PATIENT p ON w.patient_id = p.patient_id
        LEFT JOIN SPECIALIZATION s ON w.spec_id = s.spec_id
        ORDER BY 
            CASE w.priority_level
                WHEN 'CRITICAL' THEN 1
                WHEN 'HIGH' THEN 2
                WHEN 'MODERATE' THEN 3
                WHEN 'ROUTINE' THEN 4
                ELSE 5
            END ASC,
            days_waiting DESC,
            w.request_date ASC
    `;

    db.query(sql, (err, results) => {
        if (err) {
            console.error('Error fetching waitlist:', err);
            return res.status(500).json({ error: 'Failed to load waitlist' });
        }
        res.status(200).json(results);
    });
});

// Update waitlist entry: Allows editing self-reported crisis score (auto-recalculates priority) or changing status
app.put('/api/waitlist/:id', (req, res) => {
    const waitlistId = req.params.id;
    const { crisis_score, status } = req.body;

    db.query('SELECT * FROM WAITLIST WHERE waitlist_id = ?', [waitlistId], (err, rows) => {
        if (err || rows.length === 0) {
            return res.status(404).json({ error: 'Waitlist entry not found' });
        }

        const entry = rows[0];
        const newScore = crisis_score !== undefined ? parseInt(crisis_score, 10) : entry.crisis_score;
        const newStatus = status || entry.status;

        // Automated priority level determination based on crisis score
        let newPriority = 'ROUTINE';
        if (newScore >= 9) newPriority = 'CRITICAL';
        else if (newScore >= 7) newPriority = 'HIGH';
        else if (newScore >= 4) newPriority = 'MODERATE';
        else newPriority = 'ROUTINE';

        const updateSql = 'UPDATE WAITLIST SET crisis_score = ?, priority_level = ?, status = ? WHERE waitlist_id = ?';
        db.query(updateSql, [newScore, newPriority, newStatus, waitlistId], (updateErr) => {
            if (updateErr) {
                console.error('Error updating waitlist entry:', updateErr);
                return res.status(500).json({ error: 'Failed to update waitlist entry' });
            }
            console.log(`Waitlist entry #${waitlistId} updated. New Score: ${newScore}, Priority: ${newPriority}, Status: ${newStatus}`);
            res.status(200).json({
                message: 'Waitlist entry updated successfully!',
                waitlist_id: waitlistId,
                crisis_score: newScore,
                priority_level: newPriority,
                status: newStatus
            });
        });
    });
});

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
    const sql = 'SELECT district_id, district_name, population, risk_index FROM REGION ORDER BY district_id ASC';
    db.query(sql, (err, results) => {
        if (err) {
            console.error('Error fetching regions:', err);
            return res.status(500).json({ error: 'Failed to load regions' });
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
    const regionsSql = 'SELECT district_id, district_name, population, risk_index FROM REGION ORDER BY district_id ASC';
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

    // Keyword Search (Matches Provider Name, District Name, or License/Registration)
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
            r.risk_index,
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

// Book Appointment API (Validates capacity, inserts record, or prompts priority waitlist)
app.post('/api/appointments', (req, res) => {
    const { patient_id, provider_id, appointment_date } = req.body;

    if (!patient_id || !provider_id || !appointment_date) {
        return res.status(400).json({ error: 'Please provide patient ID, provider ID, and appointment date.' });
    }

    // Check if provider exists and has available slots
    const checkSql = `
        SELECT 
            p.provider_id, 
            p.name, 
            p.max_capacity, 
            p.current_patients,
            (SELECT spec_id FROM PROVIDER_SPECIALIZATIONS WHERE provider_id = p.provider_id LIMIT 1) AS primary_spec_id
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

        // If provider is at or above max capacity, reject booking and recommend Waitlist
        if (maxCap > 0 && currentCount >= maxCap) {
            console.log(`Booking blocked: Provider #${provider_id} (${provider.name}) is at full capacity (${currentCount}/${maxCap}).`);
            return res.status(409).json({
                error: `Provider ${provider.name} has reached maximum patient capacity (${currentCount}/${maxCap} slots filled).`,
                is_full: true,
                provider_id: provider.provider_id,
                provider_name: provider.name,
                spec_id: provider.primary_spec_id || 1,
                message: 'All appointment slots are currently occupied. You can join the Priority Waitlist to secure the next available opening.'
            });
        }

        // Insert appointment
        const insertSql = 'INSERT INTO APPOINTMENTS (patient_id, provider_id, appointment_date, status) VALUES (?, ?, ?, ?)';
        db.query(insertSql, [patient_id, provider_id, appointment_date, 'Confirmed'], (insErr, insResult) => {
            if (insErr) {
                console.error('Error creating appointment:', insErr);
                return res.status(500).json({ error: 'Failed to create appointment record.' });
            }

            // Increment provider current_patients count
            db.query('UPDATE PROVIDER SET current_patients = current_patients + 1 WHERE provider_id = ?', [provider_id]);

            console.log(`Appointment #${insResult.insertId} booked for Patient #${patient_id} with Provider #${provider_id}`);
            res.status(200).json({
                message: 'Appointment successfully confirmed!',
                appointment_id: insResult.insertId,
                patient_id,
                provider_id,
                provider_name: provider.name,
                appointment_date,
                status: 'Confirmed'
            });
        });
    });
});

const PORT = 3000;
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});