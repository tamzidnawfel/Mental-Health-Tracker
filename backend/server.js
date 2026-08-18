const express = require('express');
const mysql = require('mysql2');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json()); 

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
});

app.get('/', (req, res) => {
    res.send('Node.js Server is running!');
});

app.post('/api/register', (req, res) => {
    const { name, email, phone, date_of_birth } = req.body;
    const sql = 'INSERT INTO PATIENT (name, email, phone, date_of_birth) VALUES (?, ?, ?, ?)';

    db.query(sql, [name, email, phone, date_of_birth], (err, result) => {
        if (err) {
            console.error('Error inserting patient:', err);
            return res.status(500).json({ error: 'Failed to register patient' });
        }
        console.log('New patient added with ID:', result.insertId);
        res.status(200).json({ message: 'Patient registered successfully!' });
    });
});

app.post('/api/waitlist', (req, res) => {

    const { patient_id, spec_id, district_id, preferred_language, crisis_score, priority_level, request_date, status, notes } = req.body;

    const sql = 'INSERT INTO WAITLIST (patient_id, spec_id, district_id, preferred_language, crisis_score, priority_level, request_date, status, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)';

    db.query(sql, [patient_id, spec_id, district_id, preferred_language, crisis_score, priority_level, request_date, status, notes], (err, result) => {
        if (err) {
            console.error('Error joining waitlist:', err);
            return res.status(500).json({ error: 'Failed to join waitlist' });
        }
        console.log('Patient added to waitlist! ID:', result.insertId);
        res.status(200).json({ message: 'Successfully added to waitlist!' });
    });
});

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

const PORT = 3000;
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});