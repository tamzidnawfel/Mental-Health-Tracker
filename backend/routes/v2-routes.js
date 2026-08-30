const express = require('express');
const router = express.Router();
const path = require('path');

module.exports = function (db, getHtmlFiles) {


    // ==========================================
    // V2 APIs (NON-CONFLICTING) // ASHRAFUL
    // ==========================================
    /**
     * V2 APIs // ASHRAFUL: APIs for provider-appointments-v2.js
     */

    // 1. Get V2 appointments for a provider with rich patient details (Fixed date formatting)
    router.get('/api/provider/:id/appointments-v2', (req, res) => {
        const providerId = req.params.id;
        const query = `
        SELECT 
            a.appointment_id,
            a.patient_id,
            a.provider_id,
            DATE_FORMAT(a.appointment_date, '%Y-%m-%d') AS appointment_date,
            a.status,
            a.clinical_notes,
            a.prescription,
            p.name AS patient_name, 
            p.phone AS patient_phone, 
            p.email AS patient_email, 
            p.city AS patient_city, 
            p.preferred_language
        FROM APPOINTMENTS a
        JOIN PATIENT p ON a.patient_id = p.patient_id
        WHERE a.provider_id = ?
        ORDER BY a.appointment_date DESC
    `;
        db.query(query, [providerId], (err, results) => {
            if (err) {
                console.error(err);
                return res.status(500).json({ error: 'Database error fetching V2 appointments' });
            }
            res.json(results);
        });
    });

    // 2. Complete appointment V2
    router.put('/api/appointments-v2/:id/complete', (req, res) => {
        const appointmentId = req.params.id;
        const query = `UPDATE APPOINTMENTS SET status = 'Completed' WHERE appointment_id = ?`;
        db.query(query, [appointmentId], (err, result) => {
            if (err) {
                console.error(err);
                return res.status(500).json({ error: 'Failed to complete appointment' });
            }
            res.json({ message: 'Appointment marked as completed successfully' });
        });
    });

    // 3. Cancel appointment V2
    router.put('/api/appointments-v2/:id/cancel', (req, res) => {
        const appointmentId = req.params.id;
        const query = `UPDATE APPOINTMENTS SET status = 'Cancelled' WHERE appointment_id = ?`;
        db.query(query, [appointmentId], (err, result) => {
            if (err) {
                console.error(err);
                return res.status(500).json({ error: 'Failed to cancel appointment' });
            }
            res.json({ message: 'Appointment cancelled successfully' });
        });
    });

    // 4. Reschedule appointment V2
    router.put('/api/appointments-v2/:id/reschedule', (req, res) => {
        const appointmentId = req.params.id;
        const { appointment_date } = req.body;

        if (!appointment_date) {
            return res.status(400).json({ error: 'New appointment date is required' });
        }

        const query = `UPDATE APPOINTMENTS SET appointment_date = ?, status = 'Confirmed' WHERE appointment_id = ?`;
        db.query(query, [appointment_date, appointmentId], (err, result) => {
            if (err) {
                console.error(err);
                return res.status(500).json({ error: 'Failed to reschedule appointment' });
            }
            res.json({ message: 'Appointment rescheduled successfully' });
        });
    });

    /**
     * V2 APIs ASHRAFUL: APIs for provider-referrals-v2.js
     */

    // 1. Get list of other providers/clinics for selection (excluding current provider)
    router.get('/api/providers-v2', (req, res) => {
        const excludeId = req.query.exclude || 0;
        const query = `
        SELECT p.provider_id, p.name 
        FROM PROVIDER p
        LEFT JOIN THERAPISTS t ON p.provider_id = t.provider_id
        LEFT JOIN CLINICS c ON p.provider_id = c.provider_id
        WHERE p.provider_id != ? AND (t.provider_id IS NOT NULL OR c.provider_id IS NOT NULL)
    `;
        db.query(query, [excludeId], (err, results) => {
            if (err) {
                console.error(err);
                return res.status(500).json({ error: 'Failed to fetch providers list' });
            }
            res.json(results || []);
        });
    });

    // 2. Submit a new patient referral
    router.post('/api/referrals-v2', (req, res) => {
        const { patient_id, source_provider_id, target_provider_id, notes, appointment_id } = req.body;

        const insertQuery = `
        INSERT INTO REFERRALS (patient_id, source_provider_id, target_provider_id, referral_date, status, notes)
        VALUES (?, ?, ?, CURDATE(), 'Pending', ?)
    `;

        db.query(insertQuery, [patient_id, source_provider_id, target_provider_id, notes || ''], (err, result) => {
            if (err) {
                console.error(err);
                return res.status(500).json({ error: 'Failed to create referral' });
            }

            if (appointment_id) {
                db.query('UPDATE APPOINTMENTS SET status = ? WHERE appointment_id = ?', ['Referred', appointment_id], (err2) => {
                    if (err2) console.error('Failed to update appointment status on referral:', err2);
                });
            }

            res.json({ success: true, referral_id: result.insertId });
        });
    });

    // 3. Get incoming and outgoing referrals for a provider
    router.get('/api/provider/:id/referrals-v2', (req, res) => {
        const providerId = req.params.id;

        const incomingQuery = `
        SELECT 
            r.referral_id,
            r.patient_id,
            r.source_provider_id,
            r.target_provider_id,
            DATE_FORMAT(r.referral_date, '%Y-%m-%d') AS referral_date,
            r.status,
            r.notes,
            p.name AS patient_name, 
            COALESCE(pr.district_name, 'Dhaka') AS patient_city,
            p.preferred_language,
            sp.name AS source_name,
            COALESCE(sr.district_name, 'Dhaka') AS source_city
        FROM REFERRALS r
        JOIN PATIENT p ON r.patient_id = p.patient_id
        LEFT JOIN region pr ON p.district_id = pr.district_id
        JOIN provider sp ON r.source_provider_id = sp.provider_id
        LEFT JOIN region sr ON sp.district_id = sr.district_id
        WHERE r.target_provider_id = ?
        ORDER BY r.referral_date DESC
    `;

        const outgoingQuery = `
        SELECT 
            r.referral_id,
            r.patient_id,
            r.source_provider_id,
            r.target_provider_id,
            DATE_FORMAT(r.referral_date, '%Y-%m-%d') AS referral_date,
            r.status,
            r.notes,
            p.name AS patient_name, 
            COALESCE(pr.district_name, 'Dhaka') AS patient_city,
            p.preferred_language,
            tp.name AS target_name,
            COALESCE(tr.district_name, 'Dhaka') AS target_city
        FROM REFERRALS r
        JOIN PATIENT p ON r.patient_id = p.patient_id
        LEFT JOIN region pr ON p.district_id = pr.district_id
        JOIN provider tp ON r.target_provider_id = tp.provider_id
        LEFT JOIN region tr ON tp.district_id = tr.district_id
        WHERE r.source_provider_id = ?
        ORDER BY r.referral_date DESC
    `;

        db.query(incomingQuery, [providerId], (err, incoming) => {
            if (err) {
                console.error(err);
                return res.status(500).json({ error: 'Failed to fetch incoming referrals' });
            }
            db.query(outgoingQuery, [providerId], (err2, outgoing) => {
                if (err2) {
                    console.error(err2);
                    return res.status(500).json({ error: 'Failed to fetch outgoing referrals' });
                }
                res.json({ incoming: incoming || [], outgoing: outgoing || [] });
            });
        });
    });

    // 4. Update referral status (Accept/Reject) and schedule appointment if accepted
    router.put('/api/referrals-v2/:id', (req, res) => {
        const referralId = req.params.id;
        const { status, target_provider_id } = req.body;

        db.query('UPDATE REFERRALS SET status = ? WHERE referral_id = ?', [status, referralId], (err) => {
            if (err) {
                console.error(err);
                return res.status(500).json({ error: 'Failed to update referral status' });
            }

            if (status === 'Accepted') {
                db.query('SELECT patient_id FROM REFERRALS WHERE referral_id = ?', [referralId], (err2, results) => {
                    if (err2 || !results || results.length === 0) {
                        return res.status(500).json({ error: 'Referral not found or database error' });
                    }

                    const patientId = results[0].patient_id;
                    const apptQuery = `
                    INSERT INTO APPOINTMENTS (patient_id, provider_id, referral_id, appointment_date, status)
                    VALUES (?, ?, ?, CURDATE(), 'Scheduled')
                `;
                    db.query(apptQuery, [patientId, target_provider_id, referralId], (err3) => {
                        if (err3) {
                            console.error(err3);
                            return res.status(500).json({ error: 'Failed to create appointment from accepted referral' });
                        }
                        res.json({ success: true, message: 'Referral accepted and appointment created.' });
                    });
                });
            } else {
                res.json({ success: true, message: `Referral marked as ${status}.` });
            }
        });
    });

    router.get('/api/provider/:id/appointments-v2', (req, res) => {
        const providerId = req.params.id;
        const query = `
        SELECT a.*, p.name as patient_name 
        FROM appointments a
        JOIN patient p ON a.patient_id = p.patient_id
        WHERE a.provider_id = ?
    `;
        db.query(query, [providerId], (err, results) => {
            if (err) return res.status(500).json(err);
            res.json(results);
        });
    });

    router.put('/api/appointments-v2/:id/status', (req, res) => {
        const apptId = req.params.id;
        const { status } = req.body;
        db.query('UPDATE appointments SET status = ? WHERE appointment_id = ?', [status, apptId], (err) => {
            if (err) return res.status(500).json(err);
            res.json({ success: true });
        });
    });

    router.get('/api/providers-v2', (req, res) => {
        const excludeId = req.query.exclude || 0;
        const query = `
        SELECT p.provider_id, p.name 
        FROM provider p
        LEFT JOIN therapists t ON p.provider_id = t.provider_id
        LEFT JOIN clinics c ON p.provider_id = c.provider_id
        WHERE p.provider_id != ? AND (t.provider_id IS NOT NULL OR c.provider_id IS NOT NULL)
    `;
        db.query(query, [excludeId], (err, results) => {
            if (err) return res.status(500).json(err);
            res.json(results);
        });
    });

    router.post('/api/referrals-v2', (req, res) => {
        const { patient_id, source_provider_id, target_provider_id, notes, appointment_id } = req.body;

        const insertQuery = `
        INSERT INTO referrals (patient_id, source_provider_id, target_provider_id, referral_date, status, notes)
        VALUES (?, ?, ?, CURDATE(), 'Pending', ?)
    `;

        db.query(insertQuery, [patient_id, source_provider_id, target_provider_id, notes], (err, result) => {
            if (err) return res.status(500).json(err);

            db.query('UPDATE appointments SET status = ? WHERE appointment_id = ?', ['referred', appointment_id], (err2) => {
                if (err2) return res.status(500).json(err2);
                res.json({ success: true, referral_id: result.insertId });
            });
        });
    });

    router.get('/api/provider/:id/referrals-v2', (req, res) => {
        const providerId = req.params.id;

        const incomingQuery = `
        SELECT r.*, p.name as patient_name, sp.name as source_name
        FROM referrals r
        JOIN patient p ON r.patient_id = p.patient_id
        JOIN provider sp ON r.source_provider_id = sp.provider_id
        WHERE r.target_provider_id = ?
    `;

        const outgoingQuery = `
        SELECT r.*, p.name as patient_name, tp.name as target_name
        FROM referrals r
        JOIN patient p ON r.patient_id = p.patient_id
        JOIN provider tp ON r.target_provider_id = tp.provider_id
        WHERE r.source_provider_id = ?
    `;

        db.query(incomingQuery, [providerId], (err, incoming) => {
            if (err) return res.status(500).json(err);
            db.query(outgoingQuery, [providerId], (err2, outgoing) => {
                if (err2) return res.status(500).json(err2);
                res.json({ incoming, outgoing });
            });
        });
    });

    router.put('/api/referrals-v2/:id', (req, res) => {
        const referralId = req.params.id;
        const { status, target_provider_id } = req.body;

        db.query('UPDATE referrals SET status = ? WHERE referral_id = ?', [status, referralId], (err) => {
            if (err) return res.status(500).json(err);

            if (status === 'Accepted') {
                db.query('SELECT patient_id FROM referrals WHERE referral_id = ?', [referralId], (err2, results) => {
                    if (err2 || results.length === 0) return res.status(500).json(err2 || { error: "Referral not found" });

                    const patientId = results[0].patient_id;
                    const apptQuery = `
                    INSERT INTO appointments (patient_id, provider_id, referral_id, appointment_date, status)
                    VALUES (?, ?, ?, CURDATE(), 'Scheduled')
                `;
                    db.query(apptQuery, [patientId, target_provider_id, referralId], (err3) => {
                        if (err3) return res.status(500).json(err3);
                        res.json({ success: true, message: 'Referral accepted and appointment created.' });
                    });
                });
            } else {
                res.json({ success: true, message: 'Referral rejected.' });
            }
        });
    });

    // ==========================================
    // V2 APIS fOR PATIENT RATINGS // ASHRAFUL
    // ==========================================

    // Get unrated and rated completed appointments for a patient
    router.get('/api/patient/:id/ratings-v2', (req, res) => {
        const patientId = req.params.id;

        const unratedQuery = `
        SELECT a.appointment_id, a.appointment_date, p.name AS provider_name 
        FROM appointments a
        JOIN provider p ON a.provider_id = p.provider_id
        WHERE a.patient_id = ? AND a.status = 'Completed' AND a.rating IS NULL
    `;

        const ratedQuery = `
        SELECT a.appointment_id, a.appointment_date, a.rating, p.name AS provider_name 
        FROM appointments a
        JOIN provider p ON a.provider_id = p.provider_id
        WHERE a.patient_id = ? AND a.rating IS NOT NULL
    `;

        db.query(unratedQuery, [patientId], (err, unrated) => {
            if (err) return res.status(500).json(err);

            db.query(ratedQuery, [patientId], (err2, rated) => {
                if (err2) return res.status(500).json(err2);

                res.json({ unrated, rated });
            });
        });
    });

    // Submit or update rating for an appointment
    router.put('/api/appointments-v2/:id/rating', (req, res) => {
        const appointmentId = req.params.id;
        const { rating } = req.body;

        const updateQuery = `UPDATE appointments SET rating = ? WHERE appointment_id = ?`;

        db.query(updateQuery, [rating, appointmentId], (err, result) => {
            if (err) return res.status(500).json(err);
            res.json({ success: true, message: 'Rating saved successfully' });
        });
    });

    // API: Scan directory and return all HTML files
    router.get('/api/pages-v2', (req, res) => {
        const frontendDir = path.join(__dirname, '../frontend');
        const pages = getHtmlFiles(frontendDir);
        res.status(200).json(pages);
    });

    return router;
};