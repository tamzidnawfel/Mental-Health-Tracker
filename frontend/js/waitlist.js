// NAWFEL: FEATURE 2 START - Priority Waitlist & Automated Escalation Frontend Logic
/**
 * MindCare - Patient Personal Waitlist Tracker JS (waitlist.js)
 */

document.addEventListener('DOMContentLoaded', () => {
    // 1. Initialize Patient Session
    initPatientSession();

    // 2. Load Patient Personal Waitlist Data
    loadPatientWaitlist();

    // 3. Setup Controls
    const refreshBtn = document.getElementById('refreshBtn');
    if (refreshBtn) {
        refreshBtn.addEventListener('click', () => {
            loadPatientWaitlist();
            showToast('Waitlist queue refreshed!');
        });
    }
});

let currentPatient = null;
let patientWaitlistData = [];

/**
 * 1. Initialize Patient Session
 */
function initPatientSession() {
    const navPatientName = document.getElementById('navPatientName');
    const userAvatar = document.getElementById('userAvatar');
    const logoutBtn = document.getElementById('logoutBtn');

    const storedStr = sessionStorage.getItem('currentPatient') || localStorage.getItem('currentPatient');

    if (storedStr) {
        try {
            currentPatient = JSON.parse(storedStr);
        } catch (e) {
            console.error('Session parse error:', e);
            currentPatient = { patient_id: 6, name: 'Tamzid Nawfel' };
        }
    } else {
        // Fallback demo patient if accessed directly
        currentPatient = { patient_id: 6, name: 'Tamzid Nawfel', email: 'tamzid.nawfel@g.bracu.ac.bd' };
    }

    if (navPatientName) navPatientName.textContent = currentPatient.name || 'Patient';
    if (userAvatar) {
        const initial = (currentPatient.name || 'P').charAt(0).toUpperCase();
        userAvatar.textContent = initial;
    }

    if (logoutBtn) {
        logoutBtn.addEventListener('click', () => {
            if (confirm('Are you sure you want to log out of your patient portal?')) {
                sessionStorage.removeItem('currentPatient');
                localStorage.removeItem('currentPatient');
                window.location.href = 'patient-login.html';
            }
        });
    }
}

/**
 * 2. Load Personal Patient Waitlist Records
 */
async function loadPatientWaitlist() {
    const container = document.getElementById('waitlistCardsContainer');
    if (!container) return;

    const patientId = currentPatient ? currentPatient.patient_id : 6;

    container.innerHTML = `
        <div class="loading-state">
            <div class="spinner-inline"></div>
            <p>Loading your personal waitlist records...</p>
        </div>
    `;

    try {
        const response = await fetch(`http://localhost:3000/api/patient/${patientId}/waitlist`);
        if (!response.ok) throw new Error('Failed to fetch waitlist records.');

        const data = await response.json();
        patientWaitlistData = data.waitlist || [];

        // Update personal stats metrics
        updatePersonalStats(data.stats || {}, patientWaitlistData);

        // Render cards
        renderWaitlistCards(patientWaitlistData);
    } catch (err) {
        console.error('Waitlist load error:', err);
        container.innerHTML = `
            <div class="empty-queue-card">
                <div class="empty-queue-icon">⚠️</div>
                <h3 style="color:#b91c1c; font-size:16px; font-weight:800;">Unable to Load Waitlist</h3>
                <p style="font-size:13px; color:#64748b; margin-top:4px;">Failed to connect to backend server. Please verify the server is running.</p>
                <button type="button" class="btn-refresh" style="margin-top:14px;" onclick="loadPatientWaitlist()">Try Again</button>
            </div>
        `;
    }
}

/**
 * 3. Update Personal Stats Metric Cards
 */
function updatePersonalStats(stats, list) {
    const statActiveQueues = document.getElementById('statActiveQueues');
    const statMaxDays = document.getElementById('statMaxDays');
    const statHighestPriority = document.getElementById('statHighestPriority');
    const statAssignedSlots = document.getElementById('statAssignedSlots');

    const activeList = list.filter(w => (w.status || '').toLowerCase() === 'active');
    const assignedList = list.filter(w => (w.status || '').toLowerCase() === 'assigned');

    const activeCount = stats.active_waitlist_count !== undefined ? stats.active_waitlist_count : activeList.length;
    const assignedCount = stats.assigned_count !== undefined ? stats.assigned_count : assignedList.length;

    let maxDays = 0;
    let highestPriority = 'ROUTINE';
    const priorityWeight = { 'CRITICAL': 4, 'HIGH': 3, 'MODERATE': 2, 'ROUTINE': 1 };
    let maxWeight = 0;

    activeList.forEach(w => {
        const d = parseInt(w.days_waiting || 0, 10);
        if (d > maxDays) maxDays = d;

        const p = (w.priority_level || 'ROUTINE').toUpperCase();
        const weight = priorityWeight[p] || 1;
        if (weight > maxWeight) {
            maxWeight = weight;
            highestPriority = p;
        }
    });

    if (statActiveQueues) statActiveQueues.textContent = activeCount;
    if (statMaxDays) statMaxDays.textContent = `${maxDays} Day${maxDays === 1 ? '' : 's'}`;
    if (statHighestPriority) statHighestPriority.textContent = activeList.length > 0 ? highestPriority : 'None';
    if (statAssignedSlots) statAssignedSlots.textContent = assignedCount;
}

/**
 * 4. Render Personal Waitlist Queue Cards
 */
function renderWaitlistCards(list) {
    const container = document.getElementById('waitlistCardsContainer');
    if (!container) return;

    if (list.length === 0) {
        container.innerHTML = `
            <div class="empty-queue-card">
                <div class="empty-queue-icon">🌱</div>
                <h3 style="font-size:18px; font-weight:800; color:var(--text-main);">No Active Waitlist Queues</h3>
                <p style="font-size:13px; color:var(--text-muted); max-width:500px; margin:6px auto 0 auto;">
                    You are not currently waiting in any provider queues. All your requested doctors are either directly scheduled or currently available.
                </p>
                <a href="directory.html" class="btn-find-doctors">🔍 Browse Available Doctors in Directory ➔</a>
            </div>
        `;
        return;
    }

    let html = '';
    list.forEach(w => {
        const initial = (w.provider_name || 'D').replace(/^(Dr\.|Clinic|Hospital)\s*/i, '').trim().charAt(0).toUpperCase() || 'D';
        const priority = (w.priority_level || 'ROUTINE').toUpperCase();
        const days = w.days_waiting || 0;
        const status = w.status || 'Active';
        const statusLower = status.toLowerCase();

        let cardClass = 'active-card';
        if (statusLower === 'assigned') cardClass = 'assigned-card';
        else if (statusLower === 'cancelled') cardClass = 'cancelled-card';

        let priorityClass = 'routine';
        let priorityLabel = 'ROUTINE (0–2 days)';
        if (priority === 'CRITICAL') {
            priorityClass = 'critical';
            priorityLabel = '🚨 CRITICAL (>6 days in queue)';
        } else if (priority === 'HIGH') {
            priorityClass = 'high';
            priorityLabel = '⚡ HIGH (>4 days in queue)';
        } else if (priority === 'MODERATE') {
            priorityClass = 'moderate';
            priorityLabel = 'MODERATE (>2 days in queue)';
        }

        // Step Tracker progression
        let step1Class = 'completed';
        let step2Class = statusLower === 'active' ? 'active' : (statusLower === 'assigned' ? 'completed' : '');
        let step3Class = statusLower === 'assigned' ? 'completed' : '';
        let step4Class = statusLower === 'assigned' ? 'completed' : '';

        let actionsHtml = '';
        if (statusLower === 'active') {
            actionsHtml = `
                <div class="card-actions-row">
                    <button type="button" class="btn-cancel-queue" onclick="cancelPatientWaitlist(${w.waitlist_id})">
                        ✕ Cancel Waitlist Request
                    </button>
                    <a href="directory.html" class="link-directory">
                        🔍 Find Alternative Available Doctors ➔
                    </a>
                </div>
            `;
        } else if (statusLower === 'assigned') {
            actionsHtml = `
                <div class="card-actions-row">
                    <span style="color:#0284c7; font-weight:700; font-size:13px;">
                        ✓ Your slot has been admitted into the doctor's confirmed schedule!
                    </span>
                    <a href="appointments.html" class="btn-view-assigned">
                        <span>📅 View Confirmed Appointment ➔</span>
                    </a>
                </div>
            `;
        } else {
            actionsHtml = `
                <div class="card-actions-row">
                    <span style="color:var(--text-muted); font-size:12px; font-style:italic;">
                        This queue enrollment was cancelled.
                    </span>
                    <a href="directory.html" class="link-directory">
                        Browse Doctors ➔
                    </a>
                </div>
            `;
        }

        html += `
            <div class="waitlist-card ${cardClass}">
                <div class="card-top-row">
                    <div class="provider-info-group">
                        <div class="provider-card-avatar">${initial}</div>
                        <div>
                            <div class="provider-name-text">${escapeHtml(w.provider_name)}</div>
                            <div class="provider-sub-text">
                                ${w.provider_type === 'clinic' ? '🏥 Medical Clinic' : '🩺 Licensed Therapist'} • 
                                📍 ${escapeHtml(w.district_name || 'Dhaka')} • 
                                ৳ ${parseFloat(w.session_fee || 1500).toLocaleString()}/session
                            </div>
                        </div>
                    </div>

                    <div class="priority-badge-group">
                        <span class="priority-pill ${priorityClass}">${priorityLabel}</span>
                    </div>
                </div>

                <div class="card-details-grid">
                    <div class="detail-item-box">
                        <span class="detail-lbl">Specializations</span>
                        <span class="detail-val" style="color:#065f46;">${escapeHtml(w.specializations || 'General Psychotherapy')}</span>
                    </div>
                    <div class="detail-item-box">
                        <span class="detail-lbl">Requested On</span>
                        <span class="detail-val">📅 ${w.request_date}</span>
                    </div>
                    <div class="detail-item-box">
                        <span class="detail-lbl">Elapsed Waiting Time</span>
                        <span class="detail-val" style="color:${days >= 4 ? '#dc2626' : (days >= 2 ? '#d97706' : '#059669')};">
                            ⏱️ ${days} Day${days === 1 ? '' : 's'} in Queue
                        </span>
                    </div>
                    <div class="detail-item-box">
                        <span class="detail-lbl">Queue Status</span>
                        <span class="detail-val" style="color:${statusLower === 'assigned' ? '#0284c7' : '#065f46'};">
                            ${statusLower === 'assigned' ? '✓ Admitted &amp; Confirmed' : (statusLower === 'active' ? '⏳ Queued for Slot' : '✕ Cancelled')}
                        </span>
                    </div>
                </div>

                <!-- Step Progress Tracker -->
                <div class="step-tracker-container">
                    <div class="step-tracker-title">Queue Journey &amp; Priority Progression</div>
                    <div class="step-bar">
                        <div class="step-node ${step1Class}">
                            <div class="step-dot">1</div>
                            <span class="step-label">Enrolled in Queue</span>
                        </div>
                        <div class="step-node ${step2Class}">
                            <div class="step-dot">2</div>
                            <span class="step-label">Priority Auto-Escalation (${priority})</span>
                        </div>
                        <div class="step-node ${step3Class}">
                            <div class="step-dot">3</div>
                            <span class="step-label">Doctor Slot Allocation</span>
                        </div>
                        <div class="step-node ${step4Class}">
                            <div class="step-dot">4</div>
                            <span class="step-label">Confirmed Appointment</span>
                        </div>
                    </div>
                </div>

                ${actionsHtml}
            </div>
        `;
    });

    container.innerHTML = html;
}

/**
 * 5. Cancel Waitlist Request
 */
window.cancelPatientWaitlist = async function(waitlistId) {
    if (!confirm('Are you sure you want to withdraw from this doctor\'s priority waitlist queue?')) {
        return;
    }

    const patientId = currentPatient ? currentPatient.patient_id : null;

    try {
        const response = await fetch(`http://localhost:3000/api/waitlist/${waitlistId}/cancel`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ patient_id: patientId })
        });

        const data = await response.json();

        if (response.ok) {
            showToast('Waitlist queue enrollment successfully cancelled.');
            loadPatientWaitlist();
        } else {
            alert(data.error || 'Failed to cancel waitlist request.');
        }
    } catch (err) {
        console.error('Cancel waitlist error:', err);
        alert('Server communication error.');
    }
};

/**
 * Toast Helper
 */
function showToast(message) {
    const toast = document.getElementById('toast');
    if (!toast) return;
    toast.textContent = message;
    toast.classList.add('show');
    setTimeout(() => {
        toast.classList.remove('show');
    }, 3500);
}

function escapeHtml(text) {
    if (!text) return '';
    return String(text)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

// NAWFEL: FEATURE 2 END - Priority Waitlist & Automated Escalation Frontend Logic
