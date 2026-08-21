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

// API: expose local directory for auto temporary navigation hub
// Helper: Recursively scan project directory for .html files
function getHtmlFiles(dir, baseDir = dir) {
    let results = [];
    const fs = require('fs');
    
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
    const sql = 'SELECT patient_id, name, email, phone FROM PATIENT ORDER BY name ASC';
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

// API: Scan directory and return all HTML files
app.get('/api/pages', (req, res) => {
    const frontendDir = path.join(__dirname, '../frontend');
    const pages = getHtmlFiles(frontendDir);
    res.status(200).json(pages);
});

const PORT = 3000;
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});