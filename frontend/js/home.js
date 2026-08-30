/**
 * MindCare - Patient Home & Wellness Portal JavaScript
 */

document.addEventListener('DOMContentLoaded', () => {
    // 1. Initialize Patient Session & Greeting
    initPatientSession();

    // 2. Load district leaderboard for the logged-in patient
    loadDistrictLeaderboard();

    // 3. Load care access snapshot for the patient’s district
    loadPatientAccessInsights();

    // 4. Initialize Mood Tracker
    initMoodTracker();

    // 5. Initialize 4-7-8 Guided Breathing Exercise
    initBreathingTool();

    // 6. Initialize Affirmation Generator
    initAffirmations();

    // 7. Initialize Quick Appointment Booking
    initAppointmentBooking();
});

async function loadPatientAccessInsights() {
    const storedPatientStr = sessionStorage.getItem('currentPatient') || localStorage.getItem('currentPatient');
    const districtEl = document.getElementById('careInsightDistrict');
    const zoneEl = document.getElementById('careInsightZone');
    const providersEl = document.getElementById('careInsightProviders');
    const populationEl = document.getElementById('careInsightPopulation');
    const insuranceEl = document.getElementById('careInsightInsurance');
    const ratingEl = document.getElementById('careInsightRating');
    const summaryEl = document.getElementById('careInsightSummary');

    if (!storedPatientStr || !districtEl) {
        return;
    }

    let currentPatient = {};
    try {
        currentPatient = JSON.parse(storedPatientStr);
    } catch (error) {
        console.error('Error parsing patient for insights:', error);
        return;
    }

    if (!currentPatient.patient_id) {
        if (summaryEl) summaryEl.textContent = 'Please log in to view your district care overview.';
        return;
    }

    try {
        const response = await fetch(`http://localhost:3000/api/patient-home/insights?patient_id=${currentPatient.patient_id}`);
        if (!response.ok) {
            throw new Error('Insights request failed');
        }

        const data = await response.json();

        if (districtEl) districtEl.textContent = data.district_name || 'Your district';
        if (zoneEl) zoneEl.textContent = data.zone_flag || 'NO DATA';
        if (providersEl) providersEl.textContent = Number(data.total_providers || 0).toLocaleString();
        if (populationEl) populationEl.textContent = Number(data.population || 0).toLocaleString();
        if (insuranceEl) insuranceEl.textContent = Number(data.insured_providers || 0).toLocaleString();
        if (ratingEl) ratingEl.textContent = Number(data.avg_rating || 0).toFixed(1);
        if (summaryEl) summaryEl.textContent = data.summary || 'No district data available.';
    } catch (error) {
        console.error('Patient insights error:', error);
        if (summaryEl) summaryEl.textContent = 'Unable to load local care access data right now.';
    }
}

async function loadDistrictLeaderboard() {
    const storedPatientStr = sessionStorage.getItem('currentPatient') || localStorage.getItem('currentPatient');
    const leaderboardList = document.getElementById('districtLeaderboardList');
    const districtLabel = document.getElementById('districtLeaderboardLabel');

    if (!leaderboardList || !storedPatientStr) {
        if (leaderboardList) {
            leaderboardList.innerHTML = '<div class="empty-state">Please log in to view district rankings.</div>';
        }
        if (districtLabel) districtLabel.textContent = 'Your district';
        return;
    }

    let currentPatient = {};
    try {
        currentPatient = JSON.parse(storedPatientStr);
    } catch (error) {
        console.error('Error parsing current patient:', error);
        if (leaderboardList) {
            leaderboardList.innerHTML = '<div class="empty-state">Unable to load district rankings.</div>';
        }
        return;
    }

    if (!currentPatient.patient_id) {
        if (leaderboardList) {
            leaderboardList.innerHTML = '<div class="empty-state">Please log in to view district rankings.</div>';
        }
        if (districtLabel) districtLabel.textContent = 'Your district';
        return;
    }

    leaderboardList.innerHTML = '<div class="loading-state">Loading district providers...</div>';

    try {
        const response = await fetch(`http://localhost:3000/api/patient-home/leaderboard?patient_id=${currentPatient.patient_id}`);

        if (!response.ok) {
            throw new Error('Leaderboard request failed');
        }

        const data = await response.json();

        if (districtLabel) {
            districtLabel.textContent = data.district_name || 'Your district';
        }

        if (!data.providers || data.providers.length === 0) {
            leaderboardList.innerHTML = '<div class="empty-state">No rated providers in this district yet.</div>';
            return;
        }

        leaderboardList.innerHTML = data.providers.map((provider) => `
            <div class="leaderboard-item">
                <div class="rank-badge">#${provider.rank}</div>

                <div class="leaderboard-main">
                    <div class="provider-name">${provider.name}</div>
                    <div class="provider-meta">
                        ${provider.accepts_insurance ? 'Insurance accepted' : 'Self-pay'} • ৳ ${Number(provider.session_fee || 0).toLocaleString()}
                    </div>
                </div>

                <div class="rating-score">
                    ${Number(provider.rating_avg || 0).toFixed(1)}
                    <span>rating</span>
                </div>
            </div>
        `).join('');
    } catch (error) {
        console.error('Leaderboard error:', error);
        leaderboardList.innerHTML = '<div class="empty-state">Unable to load leaderboard right now.</div>';
    }
}

/**
 * 1. Patient Session Handler
 */
function initPatientSession() {
    const navPatientName = document.getElementById('navPatientName');
    const heroPatientName = document.getElementById('heroPatientName');
    const userAvatar = document.getElementById('userAvatar');
    const logoutBtn = document.getElementById('logoutBtn');

    // Retrieve patient data from session or local storage
    const storedPatientStr = sessionStorage.getItem('currentPatient') || localStorage.getItem('currentPatient');
    
    if (storedPatientStr) {
        try {
            const patient = JSON.parse(storedPatientStr);
            const fullName = patient.name || 'Patient';
            const firstName = fullName.split(' ')[0] || fullName;
            
            if (navPatientName) navPatientName.textContent = fullName;
            if (heroPatientName) heroPatientName.textContent = firstName;
            if (userAvatar) userAvatar.textContent = firstName.charAt(0).toUpperCase();
        } catch (e) {
            console.error('Error parsing patient session:', e);
        }
    }

    // Logout handling
    if (logoutBtn) {
        logoutBtn.addEventListener('click', () => {
            if (confirm('Are you sure you want to log out of MindCare?')) {
                sessionStorage.removeItem('currentPatient');
                localStorage.removeItem('currentPatient');
                window.location.href = 'patient-login.html';
            }
        });
    }
}

/**
 * 2. Interactive Mood Tracker
 */
const moodData = {
    joyful: {
        emoji: '🌟',
        title: 'Wonderful to see you thriving!',
        message: 'Channel this positive energy into creative endeavors, gratitude journaling, or sharing a warm conversation with someone you care about.'
    },
    calm: {
        emoji: '🌿',
        title: 'Tranquil and grounded.',
        message: 'A calm mind is a powerful anchor. Savor this peaceful moment of equilibrium and take a few mindful breaths.'
    },
    neutral: {
        emoji: '☕',
        title: 'Every day is a valid chapter.',
        message: 'It is completely normal to have quiet, neutral days. Stay hydrated, take gentle pauses, and don’t pressure yourself to overperform.'
    },
    low: {
        emoji: '💛',
        title: 'Be extra gentle with yourself.',
        message: 'Your feelings are valid. Take small, compassionate steps today. Remember, reaching out to a therapist or friend is a sign of courage, not weakness.'
    },
    anxious: {
        emoji: '🌧️',
        title: 'You are safe. This moment will pass.',
        message: 'Your anxiety is a temporary storm, not your permanent state. Try our 1-Minute Grounding Breath tool right beside this card to reset your nervous system.'
    }
};

function initMoodTracker() {
    const moodButtons = document.querySelectorAll('.mood-btn');
    const moodResponse = document.getElementById('moodResponse');
    const responseEmoji = document.getElementById('responseEmoji');
    const responseTitle = document.getElementById('responseTitle');
    const responseMessage = document.getElementById('responseMessage');

    moodButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            // Remove previous active state
            moodButtons.forEach(b => b.classList.remove('selected'));
            btn.classList.add('selected');

            const moodKey = btn.getAttribute('data-mood');
            const data = moodData[moodKey];

            if (data && moodResponse) {
                // Smooth transition
                moodResponse.style.opacity = '0';
                setTimeout(() => {
                    responseEmoji.textContent = data.emoji;
                    responseTitle.textContent = data.title;
                    responseMessage.textContent = data.message;
                    moodResponse.style.opacity = '1';
                }, 150);
                
                // Save daily mood state
                try {
                    localStorage.setItem('mindcare_last_mood', JSON.stringify({
                        mood: moodKey,
                        date: new Date().toISOString().slice(0, 10)
                    }));
                } catch (e) {}
            }
        });
    });

    // Check if user already logged a mood today
    try {
        const savedMood = JSON.parse(localStorage.getItem('mindcare_last_mood'));
        const todayStr = new Date().toISOString().slice(0, 10);
        if (savedMood && savedMood.date === todayStr) {
            const matchBtn = document.querySelector(`.mood-btn[data-mood="${savedMood.mood}"]`);
            if (matchBtn) matchBtn.click();
        }
    } catch (e) {}
}

/**
 * 3. 4-7-8 Guided Breathing Tool
 */
function initBreathingTool() {
    const breathingOrb = document.getElementById('breathingOrb');
    const breathingText = document.getElementById('breathingText');
    const breathingTimer = document.getElementById('breathingTimer');
    const startBreathingBtn = document.getElementById('startBreathingBtn');
    const breathBtnLabel = document.getElementById('breathBtnLabel');
    const cycleCounter = document.getElementById('cycleCounter');

    if (!startBreathingBtn || !breathingOrb) return;

    let isRunning = false;
    let breathInterval = null;
    let countdownInterval = null;
    let completedCycles = 0;

    const phases = [
        { name: 'Inhale', class: 'inhale', duration: 4, label: 'Inhale gently...' },
        { name: 'Hold', class: 'hold', duration: 7, label: 'Hold your breath...' },
        { name: 'Exhale', class: 'exhale', duration: 8, label: 'Exhale slowly...' }
    ];

    function stopBreathing() {
        isRunning = false;
        clearInterval(breathInterval);
        clearInterval(countdownInterval);
        breathingOrb.className = 'breathing-circle-inner';
        breathingText.textContent = 'Ready';
        breathingTimer.textContent = '--';
        breathBtnLabel.textContent = 'Start Breathing Exercise';
        startBreathingBtn.style.background = '#0284C7';
    }

    function runPhase(phaseIndex) {
        if (!isRunning) return;

        const currentPhase = phases[phaseIndex];
        breathingOrb.className = `breathing-circle-inner ${currentPhase.class}`;
        breathingText.textContent = currentPhase.name;
        
        let secondsLeft = currentPhase.duration;
        breathingTimer.textContent = `${secondsLeft}s`;

        clearInterval(countdownInterval);
        countdownInterval = setInterval(() => {
            if (!isRunning) return;
            secondsLeft--;
            if (secondsLeft > 0) {
                breathingTimer.textContent = `${secondsLeft}s`;
            }
        }, 1000);

        breathInterval = setTimeout(() => {
            if (!isRunning) return;
            
            const nextPhaseIndex = (phaseIndex + 1) % phases.length;
            if (nextPhaseIndex === 0) {
                completedCycles++;
                if (cycleCounter) {
                    cycleCounter.textContent = `Completed: ${completedCycles} ${completedCycles === 1 ? 'cycle' : 'cycles'}`;
                }
            }
            runPhase(nextPhaseIndex);
        }, currentPhase.duration * 1000);
    }

    startBreathingBtn.addEventListener('click', () => {
        if (isRunning) {
            stopBreathing();
        } else {
            isRunning = true;
            breathBtnLabel.textContent = 'Pause Exercise';
            startBreathingBtn.style.background = '#E11D48';
            runPhase(0);
        }
    });
}

/**
 * 4. Daily Mindful Affirmations Rotator
 */
const affirmations = [
    {
        quote: "You don’t have to control your thoughts. You just have to stop letting them control you. Give yourself grace today.",
        author: "— MindCare Mindfulness Guide"
    },
    {
        quote: "Healing isn't linear. Some days are heavy, some days are light. Every step forward counts, no matter how small.",
        author: "— Dr. Sarah Smith, Clinical Psychologist"
    },
    {
        quote: "You are allowed to take up space, to have feelings, and to pause whenever your soul needs rest.",
        author: "— MindCare Wellness Sanctuary"
    },
    {
        quote: "Breathe in peace, breathe out tension. You survived 100% of your hardest days so far.",
        author: "— Daily Grounding Reminder"
    },
    {
        quote: "Mental wellness is not about being positive all the time; it is about being honest, kind, and patient with yourself.",
        author: "— Dr. Emily Johnson, Psychotherapist"
    },
    {
        quote: "Your worth is not defined by your productivity. Simply being here and trying is more than enough.",
        author: "— MindCare Community Circle"
    }
];

function initAffirmations() {
    const textElem = document.getElementById('dailyAffirmationText');
    const authorElem = document.getElementById('affirmationAuthor');
    const newBtn = document.getElementById('newAffirmationBtn');

    if (!newBtn || !textElem) return;

    let currentIndex = 0;

    newBtn.addEventListener('click', () => {
        newBtn.disabled = true;
        textElem.style.opacity = '0';
        if (authorElem) authorElem.style.opacity = '0';

        setTimeout(() => {
            currentIndex = (currentIndex + 1) % affirmations.length;
            textElem.textContent = affirmations[currentIndex].quote;
            if (authorElem) authorElem.textContent = affirmations[currentIndex].author;

            textElem.style.opacity = '1';
            if (authorElem) authorElem.style.opacity = '1';
            newBtn.disabled = false;
        }, 200);
    });
}

/**
 * 5. Quick Appointment Booking Handler
 */
function initAppointmentBooking() {
    const bookingModal = document.getElementById('homeBookingModal');
    const closeBtn = document.getElementById('closeHomeBookingModalBtn');
    const cancelBtn = document.getElementById('cancelHomeBookingBtn');
    const form = document.getElementById('homeAppointmentForm');
    const doctorName = document.getElementById('modalDoctorName');
    const doctorRole = document.getElementById('modalDoctorRole');
    const doctorFee = document.getElementById('modalDoctorFee');
    const doctorLocation = document.getElementById('modalDoctorLocation');
    const providerIdInput = document.getElementById('homeBookingProviderId');
    const patientNameInput = document.getElementById('homePatientNameInput');
    const patientEmailInput = document.getElementById('homePatientEmailInput');
    const appointmentDateInput = document.getElementById('homeAppointmentDateInput');
    const alertBox = document.getElementById('homeBookingAlertBox');
    const submitBtn = document.getElementById('confirmHomeBookingBtn');

    const openButtons = document.querySelectorAll('.open-booking-modal');

    function closeModal() {
        if (bookingModal) bookingModal.style.display = 'none';
        if (alertBox) {
            alertBox.style.display = 'none';
            alertBox.innerHTML = '';
        }
    }

    // Default appointment date: Tomorrow
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = tomorrow.toISOString().split('T')[0];

    openButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            const providerId = btn.dataset.providerId || 1;
            const name = btn.dataset.providerName || 'Healthcare Provider';
            const role = btn.dataset.providerRole || 'Licensed Specialist';
            const fee = btn.dataset.providerFee || '1500';
            const location = btn.dataset.providerLocation || 'Dhaka Central';

            if (providerIdInput) providerIdInput.value = providerId;
            if (doctorName) doctorName.textContent = `Book with ${name}`;
            if (doctorRole) doctorRole.textContent = role;
            if (doctorFee) doctorFee.textContent = `৳ ${parseInt(fee, 10).toLocaleString()}`;
            if (doctorLocation) doctorLocation.textContent = location;

            if (appointmentDateInput) {
                appointmentDateInput.min = new Date().toISOString().split('T')[0];
                appointmentDateInput.value = tomorrowStr;
            }

            // Pre-fill patient details from session if available
            const storedPatientStr = sessionStorage.getItem('currentPatient') || localStorage.getItem('currentPatient');
            if (storedPatientStr) {
                try {
                    const p = JSON.parse(storedPatientStr);
                    if (patientNameInput && p.name) patientNameInput.value = p.name;
                    if (patientEmailInput && p.email) patientEmailInput.value = p.email;
                } catch (e) {}
            } else {
                if (patientNameInput && !patientNameInput.value) patientNameInput.value = 'Tamzid Nawfel';
                if (patientEmailInput && !patientEmailInput.value) patientEmailInput.value = 'tamzid.nawfel08@gmail.com';
            }

            if (alertBox) {
                alertBox.style.display = 'none';
                alertBox.innerHTML = '';
            }

            if (submitBtn) {
                submitBtn.style.display = 'inline-flex';
                submitBtn.disabled = false;
                submitBtn.innerHTML = '<span>✓ Confirm Booking ➔</span>';
            }

            if (bookingModal) bookingModal.style.display = 'flex';
        });
    });

    if (closeBtn) closeBtn.addEventListener('click', closeModal);
    if (cancelBtn) cancelBtn.addEventListener('click', closeModal);

    if (bookingModal) {
        bookingModal.addEventListener('click', (e) => {
            if (e.target === bookingModal) closeModal();
        });
    }

    if (form) {
        form.addEventListener('submit', async (e) => {
            e.preventDefault();

            const providerId = providerIdInput ? providerIdInput.value : 1;
            const date = appointmentDateInput ? appointmentDateInput.value : tomorrowStr;
            const patientName = patientNameInput ? patientNameInput.value.trim() : '';
            const patientEmail = patientEmailInput ? patientEmailInput.value.trim() : '';

            let patientId = 1;
            const storedPatientStr = sessionStorage.getItem('currentPatient') || localStorage.getItem('currentPatient');
            if (storedPatientStr) {
                try {
                    const p = JSON.parse(storedPatientStr);
                    if (p.patient_id) patientId = p.patient_id;
                } catch (e) {}
            }

            if (submitBtn) {
                submitBtn.disabled = true;
                submitBtn.innerHTML = '<span>Booking appointment...</span>';
            }

            try {
                const res = await fetch('http://localhost:3000/api/appointments', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        patient_id: patientId,
                        provider_id: parseInt(providerId, 10),
                        appointment_date: date,
                        name: patientName,
                        email: patientEmail
                    })
                });

                const data = await res.json();

                if (res.ok) {
                    if (data.is_waitlisted) {
                        alertBox.className = 'booking-alert-box warning';
                        alertBox.innerHTML = `
                            <strong>⏳ Priority Waitlist Enrolled:</strong> ${data.message}
                            <div style="margin-top:8px;">
                                <a href="waitlist.html" style="color:#854d0e; font-weight:700; text-decoration:underline;">View in Waitlist Tracker ➔</a>
                            </div>
                        `;
                    } else {
                        alertBox.className = 'booking-alert-box success';
                        alertBox.innerHTML = `
                            <strong>✓ Appointment Confirmed!</strong> Booking #${data.appointment_id} has been registered with ${data.provider_name} for ${data.appointment_date}.
                            <div style="margin-top:10px;">
                                <a href="appointments.html?booked=true&id=${data.appointment_id}" style="display:inline-block; background:#369E63; color:#fff; padding:8px 14px; border-radius:8px; font-weight:700; text-decoration:none; font-size:13px;">View in My Appointments ➔</a>
                            </div>
                        `;
                    }
                    alertBox.style.display = 'block';
                    if (submitBtn) submitBtn.style.display = 'none';
                } else {
                    alertBox.className = 'booking-alert-box error';
                    alertBox.innerHTML = `<strong>Error:</strong> ${data.error || 'Failed to book appointment.'}`;
                    alertBox.style.display = 'block';
                    if (submitBtn) {
                        submitBtn.disabled = false;
                        submitBtn.innerHTML = '<span>✓ Confirm Booking ➔</span>';
                    }
                }
            } catch (err) {
                console.error('Booking request error:', err);
                alertBox.className = 'booking-alert-box error';
                alertBox.innerHTML = '<strong>Connection Error:</strong> Could not connect to backend server. Please make sure the backend server is running.';
                alertBox.style.display = 'block';
                if (submitBtn) {
                    submitBtn.disabled = false;
                    submitBtn.innerHTML = '<span>✓ Confirm Booking ➔</span>';
                }
            }
        });
    }
}

