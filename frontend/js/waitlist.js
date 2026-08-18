    document.addEventListener('DOMContentLoaded', () => {
      const waitlistForm = document.getElementById('waitlistForm');
      const patientIdInput = document.getElementById('patientId');
      const specIdSelect = document.getElementById('specId');
      const districtIdSelect = document.getElementById('districtId');
      const languageCodeSelect = document.getElementById('languageCode');
      const crisisScoreInput = document.getElementById('crisisScore');
      const crisisScoreDisplay = document.getElementById('crisisScoreDisplay');
      const priorityBadge = document.getElementById('priorityBadge');
      const crisisAlertBanner = document.getElementById('crisisAlertBanner');
      const notesInput = document.getElementById('notes');
      const submitBtn = document.getElementById('submitBtn');
      const responseFeedback = document.getElementById('responseFeedback');
      const payloadPreview = document.getElementById('payloadPreview');

      function calculatePriority(score) {
        if (score >= 9) {
          return { level: 'CRITICAL', label: 'Critical Priority', class: 'critical', emergency: true };
        } else if (score >= 7) {
          return { level: 'HIGH', label: 'High Priority', class: 'high', emergency: false };
        } else if (score >= 4) {
          return { level: 'MODERATE', label: 'Moderate Priority', class: 'moderate', emergency: false };
        } else {
          return { level: 'ROUTINE', label: 'Routine Priority', class: 'routine', emergency: false };
        }
      }

      function updateCrisisUI() {
        const score = parseInt(crisisScoreInput.value, 10);
        crisisScoreDisplay.textContent = score;

        const priority = calculatePriority(score);

        priorityBadge.className = `priority-badge ${priority.class}`;
        priorityBadge.textContent = priority.label;

        if (priority.emergency) {
          crisisAlertBanner.classList.add('visible');
        } else {
          crisisAlertBanner.classList.remove('visible');
        }
      }

      crisisScoreInput.addEventListener('input', updateCrisisUI);
      updateCrisisUI(); 

      waitlistForm.addEventListener('submit', (e) => {
        e.preventDefault();

        const patientId = parseInt(patientIdInput.value, 10);
        const specId = parseInt(specIdSelect.value, 10);
        const crisisScore = parseInt(crisisScoreInput.value, 10);
        const districtId = parseInt(districtIdSelect.value, 10);
        const languageCode = languageCodeSelect.value;
        const notes = notesInput.value.trim();

        if (isNaN(patientId) || patientId <= 0) {
          alert('Please enter a valid Patient ID.');
          patientIdInput.focus();
          return;
        }

        if (isNaN(specId) || specId <= 0) {
          alert('Please select a valid Specialization.');
          specIdSelect.focus();
          return;
        }

        const priorityData = calculatePriority(crisisScore);

        const waitlistPayload = {
          patient_id: patientId,
          spec_id: specId,
          district_id: districtId,
          preferred_language: languageCode,
          crisis_score: crisisScore,
          priority_level: priorityData.level,
          request_date: new Date().toISOString().slice(0, 10), 
          status: 'Active',
          notes: notes.length > 0 ? notes : null
        };

        console.log('--- WAITLIST ENTRY SUBMITTED ---');
        console.log(waitlistPayload);

        payloadPreview.textContent = JSON.stringify(waitlistPayload, null, 2);
        responseFeedback.classList.add('active');

        fetch('http://localhost:3000/api/waitlist', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(waitlistPayload),
        })
          .then((response) => {
            if (!response.ok) {
              throw new Error(`HTTP error! Status: ${response.status}`);
            }
            return response.json();
          })
          .then((data) => {
            console.log('Database insertion successful:', data);
            alert('Patient successfully added to waitlist with priority: ' + waitlistPayload.priority_level);
            waitlistForm.reset();
            updateCrisisUI();
          })
          .catch((error) => {
            console.error('Error inserting into waitlist:', error);
            alert('Failed to connect to backend: ' + error.message);
          });

      });
    });
