/**
 * MindCare - Patient Appointments & Care Management JS (appointments.js)
 */

document.addEventListener('DOMContentLoaded', () => {
    // 1. Patient Session
    initPatientSession();

    // 2. Check URL parameters (e.g. ?booked=true)
    checkUrlParams();

    // 3. Load Patient Appointments and Waitlists
    loadPatientAppointments();

    // 4. Setup Toolbar & Search
    initToolbar();

    // 5. Setup Modals
    initModals();
});

// Global state
let currentPatient = null;
let appointmentsData = [];
let waitlistData = [];
let activeFilter = 'all';
let currentSearchTerm = '';

/**
 * 1. Initialize Patient Session
 */
function initPatientSession() {
    const navPatientName = document.getElementById('navPatientName');
    const userAvatar = document.getElementById('userAvatar');
    const logoutBtn = document.getElementById('logoutBtn');

    const storedPatientStr = sessionStorage.getItem('currentPatient') || localStorage.getItem('currentPatient');

    if (storedPatientStr) {
        try {
            currentPatient = JSON.parse(storedPatientStr);
            const fullName = currentPatient.name || 'Patient';
            const firstName = fullName.split(' ')[0] || fullName;

            if (navPatientName) navPatientName.textContent = fullName;
            if (userAvatar) userAvatar.textContent = firstName.charAt(0).toUpperCase();
        } catch (e) {
            console.error('Error parsing patient session:', e);
            currentPatient = { patient_id: 1, name: 'Tamzid Nawfel' };
        }
    } else {
        // Default demo fallback patient if accessed directly
        currentPatient = { patient_id: 1, name: 'Tamzid Nawfel', email: 'tamzid.nawfel08@gmail.com' };
        if (navPatientName) navPatientName.textContent = currentPatient.name;
        if (userAvatar) userAvatar.textContent = 'T';
    }

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
 * 2. Check URL parameters for confirmation toasts
 */
function checkUrlParams() {
    const params = new URLSearchParams(window.location.search);
    const justBooked = params.get('booked');
    const aptId = params.get('id');
    const justBookedBanner = document.getElementById('justBookedBanner');
    const justBookedMessage = document.getElementById('justBookedMessage');
    const closeJustBookedBannerBtn = document.getElementById('closeJustBookedBannerBtn');

    if (justBooked && justBookedBanner) {
        if (justBooked === 'waitlist') {
            if (justBookedMessage) {
                justBookedMessage.innerHTML = `<strong>Priority Waitlist Enrollment Successful!</strong> You are in the priority queue (Request #${aptId || ''}). Our automated engine monitors your elapsed wait duration.`;
            }
        } else if (aptId && justBookedMessage) {
            justBookedMessage.innerHTML = `<strong>Appointment Confirmed!</strong> Your booking #${aptId} has been successfully registered and active.`;
        }
        justBookedBanner.style.display = 'flex';

        if (closeJustBookedBannerBtn) {
            closeJustBookedBannerBtn.onclick = () => {
                justBookedBanner.style.display = 'none';
            };
        }
    }
}

/**
 * 3. Fetch Patient Appointments and Waitlist from Backend API
 */
async function loadPatientAppointments() {
    const patientId = currentPatient ? currentPatient.patient_id : 1;
    const container = document.getElementById('appointmentsContainer');

    try {
        const response = await fetch(`http://localhost:3000/api/patient/${patientId}/appointments`);
        if (!response.ok) throw new Error('Failed to fetch patient appointment records.');

        const data = await response.json();
        appointmentsData = data.appointments || [];
        waitlistData = data.waitlist || [];

        // Update stats
        updateStatsOverview(data.stats || {});

        // Render card records
        renderFilteredRecords();
    } catch (err) {
        console.error('Error loading appointments:', err);
        if (container) {
            container.innerHTML = `
                <div class="empty-state">
                    <div class="empty-icon">⚠️</div>
                    <h3>Connection Error</h3>
                    <p>Unable to load your appointment records. Please ensure the MindCare backend server is running.</p>
                    <button type="button" class="btn-empty-book" onclick="loadPatientAppointments()">Retry Loading</button>
                </div>
            `;
        }
    }
}

/**
 * Update Metric Cards & Tab Badges
 */
function updateStatsOverview(stats) {
    const statTotalAppointments = document.getElementById('statTotalAppointments');
    const statUpcomingConfirmed = document.getElementById('statUpcomingConfirmed');
    const statActiveWaitlist = document.getElementById('statActiveWaitlist');
    const statCompleted = document.getElementById('statCompleted');

    const totalRecords = appointmentsData.length + waitlistData.length;
    const confirmedCount = stats.upcoming_confirmed || 0;
    const waitlistCount = waitlistData.filter(w => (w.status || '').toLowerCase() === 'active').length;
    const completedCount = stats.completed || 0;
    const cancelledCount = (stats.cancelled || 0) + waitlistData.filter(w => (w.status || '').toLowerCase() === 'cancelled').length;

    if (statTotalAppointments) statTotalAppointments.textContent = totalRecords;
    if (statUpcomingConfirmed) statUpcomingConfirmed.textContent = confirmedCount;
    if (statActiveWaitlist) statActiveWaitlist.textContent = waitlistCount;
    if (statCompleted) statCompleted.textContent = completedCount;

    // Tab counts
    const tabCountAll = document.getElementById('tabCountAll');
    const tabCountConfirmed = document.getElementById('tabCountConfirmed');
    const tabCountWaitlist = document.getElementById('tabCountWaitlist');
    const tabCountCompleted = document.getElementById('tabCountCompleted');
    const tabCountCancelled = document.getElementById('tabCountCancelled');

    if (tabCountAll) tabCountAll.textContent = totalRecords;
    if (tabCountConfirmed) tabCountConfirmed.textContent = confirmedCount;
    if (tabCountWaitlist) tabCountWaitlist.textContent = waitlistData.length;
    if (tabCountCompleted) tabCountCompleted.textContent = completedCount;
    if (tabCountCancelled) tabCountCancelled.textContent = cancelledCount;
}

/**
 * 4. Setup Toolbar & Search Filtering
 */
function initToolbar() {
    const searchInput = document.getElementById('appointmentSearch');
    const clearSearchBtn = document.getElementById('clearSearchBtn');
    const tabs = document.querySelectorAll('#statusFilterTabs .tab-pill');

    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            currentSearchTerm = e.target.value.trim().toLowerCase();
            if (clearSearchBtn) clearSearchBtn.style.display = currentSearchTerm ? 'flex' : 'none';
            renderFilteredRecords();
        });
    }

    if (clearSearchBtn) {
        clearSearchBtn.addEventListener('click', () => {
            if (searchInput) searchInput.value = '';
            currentSearchTerm = '';
            clearSearchBtn.style.display = 'none';
            renderFilteredRecords();
        });
    }

    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            tabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            activeFilter = tab.getAttribute('data-filter');
            renderFilteredRecords();
        });
    });
}

/**
 * Filter and Render Both Appointments and Waitlist Records
 */
function renderFilteredRecords() {
    const container = document.getElementById('appointmentsContainer');
    if (!container) return;

    let filteredAppointments = appointmentsData.filter(a => {
        const statusLower = (a.status || '').toLowerCase();
        
        // Filter tab matching
        if (activeFilter === 'confirmed') {
            if (statusLower !== 'confirmed' && statusLower !== 'scheduled' && statusLower !== 'active') return false;
        } else if (activeFilter === 'waitlist') {
            return false; // Waitlist handled separately
        } else if (activeFilter === 'completed') {
            if (statusLower !== 'completed') return false;
        } else if (activeFilter === 'cancelled') {
            if (statusLower !== 'cancelled') return false;
        }

        // Search term matching
        if (currentSearchTerm) {
            const matchName = (a.provider_name || '').toLowerCase().includes(currentSearchTerm);
            const matchSpec = (a.specializations || '').toLowerCase().includes(currentSearchTerm);
            const matchDist = (a.district_name || '').toLowerCase().includes(currentSearchTerm);
            const matchId = String(a.appointment_id).includes(currentSearchTerm);
            if (!matchName && !matchSpec && !matchDist && !matchId) return false;
        }

        return true;
    });

    let filteredWaitlist = waitlistData.filter(w => {
        const statusLower = (w.status || '').toLowerCase();

        // Filter tab matching
        if (activeFilter === 'confirmed' || activeFilter === 'completed') {
            return false;
        } else if (activeFilter === 'waitlist') {
            // Keep all waitlist records
        } else if (activeFilter === 'cancelled') {
            if (statusLower !== 'cancelled') return false;
        }

        // Search term matching
        if (currentSearchTerm) {
            const matchSpec = (w.specialization_name || '').toLowerCase().includes(currentSearchTerm);
            const matchPriority = (w.priority_level || '').toLowerCase().includes(currentSearchTerm);
            const matchId = String(w.waitlist_id).includes(currentSearchTerm);
            if (!matchSpec && !matchPriority && !matchId) return false;
        }

        return true;
    });

    if (filteredAppointments.length === 0 && filteredWaitlist.length === 0) {
        let emptyMsg = 'No appointment or waitlist records found under this filter.';
        if (activeFilter === 'confirmed') emptyMsg = 'You have no upcoming confirmed appointments right now.';
        else if (activeFilter === 'waitlist') emptyMsg = 'You do not have any active waitlist requests.';
        else if (activeFilter === 'cancelled') emptyMsg = 'No cancelled bookings found.';

        container.innerHTML = `
            <div class="empty-state">
                <div class="empty-icon">📅</div>
                <h3>No Records Found</h3>
                <p>${emptyMsg}</p>
                <a href="directory.html" class="btn-empty-book">+ Book an Appointment in Directory</a>
            </div>
        `;
        return;
    }

    let html = '';

    // Render Confirmed/Completed/Cancelled Appointment Cards
    filteredAppointments.forEach(apt => {
        html += renderAppointmentCard(apt);
    });

    // Render Waitlist Cards
    filteredWaitlist.forEach(wl => {
        html += renderWaitlistCard(wl);
    });

    container.innerHTML = html;
}

/**
 * Render HTML for an Appointment Card
 */
function renderAppointmentCard(a) {
    const isClinic = a.provider_type === 'clinic';
    const isConfirmed = (a.status || '').toLowerCase() === 'confirmed' || (a.status || '').toLowerCase() === 'scheduled';
    const isCompleted = (a.status || '').toLowerCase() === 'completed';
    const isCancelled = (a.status || '').toLowerCase() === 'cancelled';
    const isReferred = (a.status || '').toLowerCase() === 'referred'; // ASHRAFUL: to correctly show referred status

    let cardClassModifier = 'confirmed-card';
    let statusBadgeHtml = '<span class="status-badge confirmed">● Confirmed &amp; Active</span>';

    if (isCompleted) {
        cardClassModifier = 'completed-card';
        statusBadgeHtml = '<span class="status-badge completed">✓ Session Completed</span>';
    } else if (isCancelled) {
        cardClassModifier = 'cancelled-card';
        statusBadgeHtml = '<span class="status-badge cancelled">✕ Cancelled</span>';
    } else if (isReferred) {                                        // ASHRAFUL: to correctly show referred status
    cardClassModifier = 'referred-card';
    statusBadgeHtml = '<span class="status-badge" style="background:#e0f2fe; color:#0369a1;">↗ Referred to Another Provider</span>';
    }

    const typePillClass = isClinic ? 'clinic-pill' : 'therapist-pill';
    const typePillText = isClinic ? '🏥 Clinic Appointment' : '🩺 Doctor Consultation';
    const avatarIcon = isClinic ? '🏥' : '🩺';
    const avatarClass = isClinic ? 'provider-avatar clinic-avatar' : 'provider-avatar';

    // Format Date: e.g. "Wednesday, Aug 26, 2026"
    let formattedDate = a.appointment_date;
    if (a.appointment_date) {
        const d = new Date(a.appointment_date);
        if (!isNaN(d.getTime())) {
            formattedDate = d.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'short', day: 'numeric' });
        }
    }

    // Subclass Specifics
    let licenseInfo = a.license_no ? `License: ${escapeHtml(a.license_no)} (${a.years_of_experience || '10'} yrs exp)` : 'Verified Clinician';
    if (isClinic) {
        licenseInfo = a.registration_no ? `Reg: ${escapeHtml(a.registration_no)} (${a.total_beds || '35'} Inpatient Beds)` : 'Registered Clinic';
    }

    // Specialty chips
    const specList = (a.specializations || '').split(',').filter(Boolean);
    let specHtml = '';
    specList.slice(0, 2).forEach(s => {
        specHtml += `<span class="spec-badge">${escapeHtml(s.trim())}</span>`;
    });

    // Action buttons
    let actionsHtml = '';
    if (isConfirmed) {
        actionsHtml = `
            <div class="actions-left">
                <button type="button" class="btn-card-action btn-reschedule" onclick="openRescheduleModal(${a.appointment_id}, '${escapeHtml(a.provider_name)}', '${a.appointment_date}', '${escapeHtml(a.district_name || 'Dhaka')}')">
                    <span>🗓️ Reschedule Date</span>
                </button>
                <button type="button" class="btn-card-action btn-cancel" onclick="openCancelModal(${a.appointment_id}, '${escapeHtml(a.provider_name)}', '${a.appointment_date}')">
                    <span>✕ Cancel</span>
                </button>
            </div>
            <div class="actions-right">
                <button type="button" class="btn-card-action btn-details" onclick="openProviderDetailsModal(${a.provider_id})">
                    <span>View Provider Profile ➔</span>
                </button>
            </div>
        `;
    } else {
        actionsHtml = `
            <div class="actions-left">
                <span style="font-size: 12px; color: var(--text-muted);">Status: <strong>${escapeHtml(a.status)}</strong></span>
            </div>
            <div class="actions-right">
                <a href="directory.html" class="btn-card-action btn-reschedule">
                    <span>+ Book Another Doctor</span>
                </a>
            </div>
        `;
    }

    return `
        <div class="care-card ${cardClassModifier}">
            <div class="card-header-row">
                <div class="card-provider-info">
                    <div class="${avatarClass}">${avatarIcon}</div>
                    <div class="card-title-group">
                        <div class="type-and-id-row">
                            <span class="type-pill ${typePillClass}">${typePillText}</span>
                            <span class="record-id-badge">Appointment #${a.appointment_id}</span>
                        </div>
                        <h3 class="provider-name">${escapeHtml(a.provider_name)}</h3>
                        <div class="provider-sub-info">
                            <span>📍 ${escapeHtml(a.district_name || 'Dhaka')}</span> • 
                            <span>⭐ ${parseFloat(a.rating_avg || 4.5).toFixed(2)} Rating</span> • 
                            <span>${licenseInfo}</span>
                        </div>
                    </div>
                </div>
                ${statusBadgeHtml}
            </div>

            <div class="card-details-grid">
                <div class="detail-unit">
                    <span class="unit-label">Scheduled Date</span>
                    <span class="unit-val date-highlight">📅 ${formattedDate}</span>
                </div>
                <div class="detail-unit">
                    <span class="unit-label">Consultation Fee</span>
                    <span class="unit-val fee-highlight">৳ ${parseFloat(a.session_fee || 0).toLocaleString()} ${a.accepts_insurance ? '<small style="color:var(--secondary); font-size:11px;">(Insured)</small>' : ''}</span>
                </div>
                <div class="detail-unit">
                    <span class="unit-label">Specializations</span>
                    <div class="tags-row" style="margin-top: 4px;">
                        ${specHtml || '<span class="spec-badge">General Mental Health</span>'}
                    </div>
                </div>
                <div class="detail-unit">
                    <span class="unit-label">Language</span>
                    <span class="unit-val">🗣️ ${escapeHtml(a.languages || 'Bengali, English')}</span>
                </div>
            </div>

            <div class="card-actions-footer">
                ${actionsHtml}
            </div>
        </div>
    `;
}

/**
 * Render HTML for a Waitlist Card
 */
function renderWaitlistCard(w) {
    const isActive = (w.status || '').toLowerCase() === 'active';
    const isCancelled = (w.status || '').toLowerCase() === 'cancelled';
    const isAssigned = (w.status || '').toLowerCase() === 'assigned';

    let cardClass = 'waitlist-card';
    let statusBadge = '<span class="status-badge waitlist-active">⏳ In Priority Queue</span>';

    if (isAssigned) {
        statusBadge = '<span class="status-badge confirmed">✓ Assigned Slot</span>';
    } else if (isCancelled) {
        cardClass = 'cancelled-card';
        statusBadge = '<span class="status-badge cancelled">✕ Waitlist Cancelled</span>';
    }

    const priorityClass = (w.priority_level || 'ROUTINE').toLowerCase();

    let actionsHtml = '';
    if (isActive) {
        actionsHtml = `
            <div class="actions-left">
                <button type="button" class="btn-card-action btn-update-crisis" onclick="openCrisisModal(${w.waitlist_id}, ${w.crisis_score || 7})">
                    <span>⚡ Update Distress Score (${w.crisis_score || 7}/10)</span>
                </button>
                <button type="button" class="btn-card-action btn-cancel" onclick="cancelWaitlistRequest(${w.waitlist_id})">
                    <span>✕ Cancel Waitlist</span>
                </button>
            </div>
            <div class="actions-right">
                <a href="directory.html" class="btn-card-action btn-reschedule">
                    <span>🔍 Find Open Doctors in Directory</span>
                </a>
            </div>
        `;
    } else {
        actionsHtml = `
            <div class="actions-left">
                <span style="font-size: 12px; color: var(--text-muted);">Status: <strong>${escapeHtml(w.status)}</strong></span>
            </div>
            <div class="actions-right">
                <a href="directory.html" class="btn-card-action btn-reschedule">
                    <span>+ Book New Appointment</span>
                </a>
            </div>
        `;
    }

    return `
        <div class="care-card ${cardClass}">
            <div class="card-header-row">
                <div class="card-provider-info">
                    <div class="provider-avatar waitlist-avatar">⏳</div>
                    <div class="card-title-group">
                        <div class="type-and-id-row">
                            <span class="type-pill waitlist-pill">Priority Queue Request</span>
                            <span class="record-id-badge">Waitlist #${w.waitlist_id}</span>
                        </div>
                        <h3 class="provider-name">Specialty: ${escapeHtml(w.specialization_name || 'Clinical Care')}</h3>
                        <div class="provider-sub-info">
                            <span>Placed in automated priority escalation queue</span>
                        </div>
                    </div>
                </div>
                ${statusBadge}
            </div>

            <div class="card-details-grid">
                <div class="detail-unit">
                    <span class="unit-label">Request Date</span>
                    <span class="unit-val">📅 ${w.request_date}</span>
                </div>
                <div class="detail-unit">
                    <span class="unit-label">Days in Queue</span>
                    <span class="unit-val" style="color:#b45309;">⏱️ ${w.days_waiting || 0} Days Waiting</span>
                </div>
                <div class="detail-unit">
                    <span class="unit-label">Distress / Crisis Score</span>
                    <span class="unit-val">🚨 ${w.crisis_score || 5} / 10</span>
                </div>
                <div class="detail-unit">
                    <span class="unit-label">Automated Priority</span>
                    <div>
                        <span class="priority-badge ${priorityClass}">${w.priority_level || 'ROUTINE'}</span>
                        ${(w.days_waiting >= 2 && isActive) ? '<small style="color:#b45309; font-weight:700; display:block; margin-top:3px;">⚡ Auto-Escalated (> 2d in queue)</small>' : ''}
                    </div>
                </div>
            </div>

            <div class="card-actions-footer">
                ${actionsHtml}
            </div>
        </div>
    `;
}

/**
 * 5. Modals Setup & Event Handlers
 */
function initModals() {
    // Reschedule modal
    const rescheduleModal = document.getElementById('rescheduleModal');
    const closeRescheduleModalBtn = document.getElementById('closeRescheduleModalBtn');
    const cancelRescheduleBtn = document.getElementById('cancelRescheduleBtn');
    const rescheduleForm = document.getElementById('rescheduleForm');

    // Cancel modal
    const cancelModal = document.getElementById('cancelModal');
    const closeCancelModalBtn = document.getElementById('closeCancelModalBtn');
    const closeCancelActionBtn = document.getElementById('closeCancelActionBtn');
    const confirmCancelBtn = document.getElementById('confirmCancelBtn');

    // Crisis modal
    const crisisModal = document.getElementById('crisisModal');
    const closeCrisisModalBtn = document.getElementById('closeCrisisModalBtn');
    const cancelCrisisBtn = document.getElementById('cancelCrisisBtn');
    const crisisForm = document.getElementById('crisisForm');
    const crisisRangeInput = document.getElementById('crisisRangeInput');
    const crisisScoreDisplay = document.getElementById('crisisScoreDisplay');
    const crisisPriorityPreview = document.getElementById('crisisPriorityPreview');

    // Details modal
    const detailsModal = document.getElementById('detailsModal');
    const closeDetailsModalBtn = document.getElementById('closeDetailsModalBtn');
    const closeDetailActionBtn = document.getElementById('closeDetailActionBtn');

    // Close buttons
    if (closeRescheduleModalBtn) closeRescheduleModalBtn.onclick = () => rescheduleModal.style.display = 'none';
    if (cancelRescheduleBtn) cancelRescheduleBtn.onclick = () => rescheduleModal.style.display = 'none';

    if (closeCancelModalBtn) closeCancelModalBtn.onclick = () => cancelModal.style.display = 'none';
    if (closeCancelActionBtn) closeCancelActionBtn.onclick = () => cancelModal.style.display = 'none';

    if (closeCrisisModalBtn) closeCrisisModalBtn.onclick = () => crisisModal.style.display = 'none';
    if (cancelCrisisBtn) cancelCrisisBtn.onclick = () => crisisModal.style.display = 'none';

    if (closeDetailsModalBtn) closeDetailsModalBtn.onclick = () => detailsModal.style.display = 'none';
    if (closeDetailActionBtn) closeDetailActionBtn.onclick = () => detailsModal.style.display = 'none';

    // Backdrop click
    window.onclick = (e) => {
        if (e.target === rescheduleModal) rescheduleModal.style.display = 'none';
        if (e.target === cancelModal) cancelModal.style.display = 'none';
        if (e.target === crisisModal) crisisModal.style.display = 'none';
        if (e.target === detailsModal) detailsModal.style.display = 'none';
    };

    // Crisis range slider live preview
    if (crisisRangeInput) {
        crisisRangeInput.addEventListener('input', (e) => {
            const val = parseInt(e.target.value, 10);
            if (crisisScoreDisplay) crisisScoreDisplay.textContent = val;
            
            let pLevel = 'ROUTINE';
            let pClass = 'routine';
            if (val >= 9) { pLevel = 'CRITICAL PRIORITY'; pClass = 'critical'; }
            else if (val >= 7) { pLevel = 'HIGH PRIORITY'; pClass = 'high'; }
            else if (val >= 4) { pLevel = 'MODERATE PRIORITY'; pClass = 'moderate'; }
            else { pLevel = 'ROUTINE CARE'; pClass = 'routine'; }

            if (crisisPriorityPreview) {
                crisisPriorityPreview.textContent = pLevel;
                crisisPriorityPreview.className = `priority-badge ${pClass}`;
            }
        });
    }

    // Reschedule form submit
    if (rescheduleForm) {
        rescheduleForm.onsubmit = async (e) => {
            e.preventDefault();
            await submitRescheduleAppointment();
        };
    }

    // Cancel appointment confirm
    if (confirmCancelBtn) {
        confirmCancelBtn.onclick = async () => {
            await submitCancelAppointment();
        };
    }

    // Crisis form submit
    if (crisisForm) {
        crisisForm.onsubmit = async (e) => {
            e.preventDefault();
            await submitUpdateCrisisScore();
        };
    }
}

/**
 * Open Reschedule Modal
 */
window.openRescheduleModal = function(aptId, providerName, currentDate, location) {
    const modal = document.getElementById('rescheduleModal');
    const rescheduleAppointmentId = document.getElementById('rescheduleAppointmentId');
    const rescheduleProviderName = document.getElementById('rescheduleProviderName');
    const rescheduleCurrentDate = document.getElementById('rescheduleCurrentDate');
    const rescheduleLocation = document.getElementById('rescheduleLocation');
    const newAppointmentDateInput = document.getElementById('newAppointmentDateInput');
    const alertBox = document.getElementById('rescheduleAlertBox');

    if (rescheduleAppointmentId) rescheduleAppointmentId.value = aptId;
    if (rescheduleProviderName) rescheduleProviderName.textContent = providerName;
    if (rescheduleCurrentDate) rescheduleCurrentDate.textContent = currentDate;
    if (rescheduleLocation) rescheduleLocation.textContent = location;

    // Set min date = tomorrow
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const yyyy = tomorrow.getFullYear();
    const mm = String(tomorrow.getMonth() + 1).padStart(2, '0');
    const dd = String(tomorrow.getDate()).padStart(2, '0');
    const minDateStr = `${yyyy}-${mm}-${dd}`;
    
    if (newAppointmentDateInput) {
        newAppointmentDateInput.min = minDateStr;
        newAppointmentDateInput.value = minDateStr;
    }

    if (alertBox) alertBox.style.display = 'none';

    modal.style.display = 'flex';
};

/**
 * Submit Reschedule Action
 */
async function submitRescheduleAppointment() {
    const aptId = document.getElementById('rescheduleAppointmentId').value;
    const newDate = document.getElementById('newAppointmentDateInput').value;
    const alertBox = document.getElementById('rescheduleAlertBox');
    const confirmBtn = document.getElementById('confirmRescheduleBtn');

    confirmBtn.disabled = true;
    confirmBtn.textContent = 'Updating Date...';

    try {
        const response = await fetch(`http://localhost:3000/api/appointments/${aptId}/reschedule`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ appointment_date: newDate })
        });

        const data = await response.json();

        if (response.ok) {
            showToast('✓ Appointment date successfully rescheduled!');
            const modal = document.getElementById('rescheduleModal');
            if (modal) modal.style.display = 'none';
            await loadPatientAppointments();
        } else {
            alertBox.className = 'modal-alert-box error';
            alertBox.textContent = data.error || 'Failed to reschedule appointment.';
            alertBox.style.display = 'block';
        }
    } catch (err) {
        console.error('Error rescheduling:', err);
        alertBox.className = 'modal-alert-box error';
        alertBox.textContent = 'Server connection error.';
        alertBox.style.display = 'block';
    } finally {
        confirmBtn.disabled = false;
        confirmBtn.textContent = 'Save New Date ➔';
    }
}

/**
 * Open Cancel Modal
 */
window.openCancelModal = function(aptId, providerName, aptDate) {
    const modal = document.getElementById('cancelModal');
    const cancelAppointmentId = document.getElementById('cancelAppointmentId');
    const cancelProviderName = document.getElementById('cancelProviderName');
    const cancelAppointmentDate = document.getElementById('cancelAppointmentDate');
    const alertBox = document.getElementById('cancelAlertBox');

    if (cancelAppointmentId) cancelAppointmentId.value = aptId;
    if (cancelProviderName) cancelProviderName.textContent = providerName;
    if (cancelAppointmentDate) cancelAppointmentDate.textContent = aptDate;
    if (alertBox) alertBox.style.display = 'none';

    modal.style.display = 'flex';
};

/**
 * Submit Cancel Appointment
 */
async function submitCancelAppointment() {
    const aptId = document.getElementById('cancelAppointmentId').value;
    const confirmCancelBtn = document.getElementById('confirmCancelBtn');
    const alertBox = document.getElementById('cancelAlertBox');

    confirmCancelBtn.disabled = true;
    confirmCancelBtn.textContent = 'Cancelling...';

    try {
        const response = await fetch(`http://localhost:3000/api/appointments/${aptId}/cancel`, {
            method: 'PUT'
        });

        const data = await response.json();

        if (response.ok) {
            showToast('✓ Appointment cancelled and slot freed.');
            const modal = document.getElementById('cancelModal');
            if (modal) modal.style.display = 'none';
            await loadPatientAppointments();
        } else {
            alertBox.className = 'modal-alert-box error';
            alertBox.textContent = data.error || 'Failed to cancel appointment.';
            alertBox.style.display = 'block';
        }
    } catch (err) {
        console.error('Error cancelling:', err);
        alertBox.className = 'modal-alert-box error';
        alertBox.textContent = 'Server connection error.';
        alertBox.style.display = 'block';
    } finally {
        confirmCancelBtn.disabled = false;
        confirmCancelBtn.textContent = 'Yes, Cancel Appointment';
    }
}

/**
 * Open Crisis Modal
 */
window.openCrisisModal = function(waitlistId, currentScore) {
    const modal = document.getElementById('crisisModal');
    const crisisWaitlistId = document.getElementById('crisisWaitlistId');
    const crisisRangeInput = document.getElementById('crisisRangeInput');
    const crisisScoreDisplay = document.getElementById('crisisScoreDisplay');
    const crisisPriorityPreview = document.getElementById('crisisPriorityPreview');
    const alertBox = document.getElementById('crisisAlertBox');

    if (crisisWaitlistId) crisisWaitlistId.value = waitlistId;
    if (crisisRangeInput) crisisRangeInput.value = currentScore;
    if (crisisScoreDisplay) crisisScoreDisplay.textContent = currentScore;

    let pLevel = 'ROUTINE';
    let pClass = 'routine';
    if (currentScore >= 9) { pLevel = 'CRITICAL PRIORITY'; pClass = 'critical'; }
    else if (currentScore >= 7) { pLevel = 'HIGH PRIORITY'; pClass = 'high'; }
    else if (currentScore >= 4) { pLevel = 'MODERATE PRIORITY'; pClass = 'moderate'; }

    if (crisisPriorityPreview) {
        crisisPriorityPreview.textContent = pLevel;
        crisisPriorityPreview.className = `priority-badge ${pClass}`;
    }

    if (alertBox) alertBox.style.display = 'none';

    modal.style.display = 'flex';
};

/**
 * Submit Update Crisis Score
 */
async function submitUpdateCrisisScore() {
    const waitlistId = document.getElementById('crisisWaitlistId').value;
    const crisisScore = document.getElementById('crisisRangeInput').value;
    const confirmBtn = document.getElementById('confirmCrisisBtn');
    const alertBox = document.getElementById('crisisAlertBox');

    confirmBtn.disabled = true;
    confirmBtn.textContent = 'Updating...';

    try {
        const response = await fetch(`http://localhost:3000/api/waitlist/${waitlistId}/crisis`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ crisis_score: crisisScore })
        });

        const data = await response.json();

        if (response.ok) {
            showToast('✓ Crisis score updated. Automated priority escalated.');
            const modal = document.getElementById('crisisModal');
            if (modal) modal.style.display = 'none';
            await loadPatientAppointments();
        } else {
            alertBox.className = 'modal-alert-box error';
            alertBox.textContent = data.error || 'Failed to update crisis score.';
            alertBox.style.display = 'block';
        }
    } catch (err) {
        console.error('Error updating crisis score:', err);
        alertBox.className = 'modal-alert-box error';
        alertBox.textContent = 'Server connection error.';
        alertBox.style.display = 'block';
    } finally {
        confirmBtn.disabled = false;
        confirmBtn.textContent = 'Update Priority ➔';
    }
}

/**
 * Cancel Waitlist Request
 */
window.cancelWaitlistRequest = async function(waitlistId) {
    if (!confirm('Are you sure you want to cancel this priority waitlist request?')) return;

    try {
        const response = await fetch(`http://localhost:3000/api/waitlist/${waitlistId}/cancel`, {
            method: 'PUT'
        });

        if (response.ok) {
            showToast('✓ Waitlist request cancelled.');
            await loadPatientAppointments();
        } else {
            alert('Failed to cancel waitlist request.');
        }
    } catch (err) {
        console.error('Error cancelling waitlist:', err);
        alert('Server communication error.');
    }
};

/**
 * Open Provider Details Modal
 */
window.openProviderDetailsModal = async function(providerId) {
    try {
        const res = await fetch(`http://localhost:3000/api/directory?search=&provider_type=all`);
        if (!res.ok) throw new Error('Failed to load provider details');
        const data = await res.json();
        const provider = (data.providers || []).find(p => p.provider_id === providerId);
        
        if (!provider) {
            showToast('Provider profile not found.');
            return;
        }

        const modal = document.getElementById('detailsModal');
        const detailName = document.getElementById('detailName');
        const detailSubtitle = document.getElementById('detailSubtitle');
        const detailIcon = document.getElementById('detailIcon');
        const detailContent = document.getElementById('detailContent');

        if (detailName) detailName.textContent = provider.name;
        if (detailSubtitle) detailSubtitle.textContent = provider.provider_type === 'clinic' ? 'Mental Health Clinic' : 'Licensed Clinical Therapist';
        if (detailIcon) detailIcon.textContent = provider.provider_type === 'clinic' ? '🏥' : '🩺';

        let subclassHtml = '';
        if (provider.provider_type === 'therapist') {
            subclassHtml = `
                <div class="detail-item">
                    <div class="detail-lbl">Professional License</div>
                    <div class="detail-val">${escapeHtml(provider.license_no || 'TH-LIC-VERIFIED')}</div>
                </div>
                <div class="detail-item">
                    <div class="detail-lbl">Clinical Experience</div>
                    <div class="detail-val">${provider.years_of_experience ? provider.years_of_experience + ' Years' : '10+ Years'}</div>
                </div>
            `;
        } else {
            subclassHtml = `
                <div class="detail-item">
                    <div class="detail-lbl">Registration No</div>
                    <div class="detail-val">${escapeHtml(provider.registration_no || 'CL-REG-VERIFIED')}</div>
                </div>
                <div class="detail-item">
                    <div class="detail-lbl">Inpatient Bed Capacity</div>
                    <div class="detail-val">${provider.total_beds ? provider.total_beds + ' Beds' : '35 Beds'}</div>
                </div>
            `;
        }

        if (detailContent) {
            detailContent.innerHTML = `
                <div class="detail-item">
                    <div class="detail-lbl">Provider ID</div>
                    <div class="detail-val">#${provider.provider_id}</div>
                </div>
                <div class="detail-item">
                    <div class="detail-lbl">Rating</div>
                    <div class="detail-val">⭐ ${parseFloat(provider.rating_avg || 4.5).toFixed(2)} / 5.0</div>
                </div>
                <div class="detail-item">
                    <div class="detail-lbl">Consultation Fee</div>
                    <div class="detail-val">৳ ${parseFloat(provider.session_fee || 0).toLocaleString()}</div>
                </div>
                <div class="detail-item">
                    <div class="detail-lbl">Insurance Coverage</div>
                    <div class="detail-val">${provider.accepts_insurance ? '✓ Accepts Insurance' : 'Self-Pay / Sliding Scale'}</div>
                </div>
                ${subclassHtml}
                <div class="detail-item">
                    <div class="detail-lbl">Location / City</div>
                    <div class="detail-val">📍 ${escapeHtml(provider.district_name || 'Dhaka')}</div>
                </div>
                <div class="detail-item">
                    <div class="detail-lbl">Patient Capacity</div>
                    <div class="detail-val">${provider.current_patients || 0} / ${provider.max_capacity || 0} Filled</div>
                </div>
                <div class="detail-item full-width">
                    <div class="detail-lbl">Specializations</div>
                    <div class="detail-val">${escapeHtml(provider.specializations || 'General Therapy')}</div>
                </div>
                <div class="detail-item full-width">
                    <div class="detail-lbl">Spoken Languages</div>
                    <div class="detail-val">${escapeHtml(provider.languages || 'Bengali, English')}</div>
                </div>
            `;
        }

        modal.style.display = 'flex';
    } catch (e) {
        console.error('Error fetching details:', e);
    }
};

/**
 * Toast Notification Helper
 */
function showToast(msg) {
    const toast = document.getElementById('toast');
    if (!toast) return;
    toast.textContent = msg;
    toast.classList.add('show');
    setTimeout(() => {
        toast.classList.remove('show');
    }, 3500);
}

/**
 * HTML Escape Helper
 */
function escapeHtml(str) {
    if (!str) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}
