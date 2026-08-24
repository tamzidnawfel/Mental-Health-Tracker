/**
 * MindCare - Provider Workspace & Clinical Queue JS (provider-dashboard.js)
 */

document.addEventListener('DOMContentLoaded', () => {
    // 1. Initialize Provider Session
    initProviderSession();

    // 2. Setup Navigation Tabs & Controls
    initTabsAndControls();

    // 3. Load Dashboard Data
    loadProviderDashboard();

    // 4. Setup Modals
    initAdmitModal();
    initHistoryModal();
    initEditNotesModal();
    initDossierSearch();
});

// Global state
let currentProvider = null;
let dashboardData = {
    provider: {},
    stats: {},
    appointments: [],
    waitlist: [],
    urgent_alerts: []
};
let activeTab = 'appointments';
let searchTerm = '';

/**
 * 1. Initialize Provider Session
 */
function initProviderSession() {
    const headerProviderName = document.getElementById('headerProviderName');
    const headerProviderAvatar = document.getElementById('headerProviderAvatar');
    const headerProviderType = document.getElementById('headerProviderType');
    const headerProviderDistrict = document.getElementById('headerProviderDistrict');
    const headerProviderFee = document.getElementById('headerProviderFee');
    const logoutBtn = document.getElementById('logoutBtn');
    const refreshBtn = document.getElementById('refreshBtn');

    const storedStr = sessionStorage.getItem('currentProvider') || localStorage.getItem('currentProvider');

    if (storedStr) {
        try {
            currentProvider = JSON.parse(storedStr);
        } catch (e) {
            console.error('Error parsing provider session:', e);
            currentProvider = { provider_id: 1, name: 'Dr. Sarah Smith' };
        }
    } else {
        // Fallback demo doctor if accessed directly
        currentProvider = {
            provider_id: 1,
            name: 'Dr. Sarah Smith',
            provider_type: 'therapist',
            district_name: 'Dhaka Central',
            session_fee: 1500
        };
    }

    // Populate initial header
    if (headerProviderName) headerProviderName.textContent = currentProvider.name || 'Healthcare Provider';
    if (headerProviderAvatar) {
        const initial = (currentProvider.name || 'D').replace(/^(Dr\.|Clinic|Hospital)\s*/i, '').trim().charAt(0).toUpperCase() || 'D';
        headerProviderAvatar.textContent = initial;
    }
    if (headerProviderType) {
        headerProviderType.textContent = currentProvider.provider_type === 'clinic' ? 'Medical Clinic' : 'Licensed Clinical Therapist';
    }
    if (headerProviderDistrict) headerProviderDistrict.textContent = currentProvider.district_name || 'Dhaka';
    if (headerProviderFee) headerProviderFee.textContent = `৳ ${parseFloat(currentProvider.session_fee || 1500).toLocaleString()}/session`;

    // Logout
    if (logoutBtn) {
        logoutBtn.addEventListener('click', () => {
            if (confirm('Are you sure you want to sign out of the Provider Workspace?')) {
                sessionStorage.removeItem('currentProvider');
                localStorage.removeItem('currentProvider');
                window.location.href = 'provider-login.html';
            }
        });
    }

    // Refresh
    if (refreshBtn) {
        refreshBtn.addEventListener('click', () => {
            loadProviderDashboard();
        });
    }
}

/**
 * 2. Setup Tabs & Search Controls
 */
function initTabsAndControls() {
    const tabButtons = document.querySelectorAll('#workspaceTabs .tab-btn');
    const searchInput = document.getElementById('patientSearchInput');
    const alarmActionBtn = document.getElementById('alarmActionBtn');

    tabButtons.forEach(btn => {
        btn.addEventListener('click', (e) => {
            if (!btn.dataset.tab) return; // If link button (e.g. Zones), allow standard navigation
            tabButtons.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            activeTab = btn.dataset.tab;
            switchPane(activeTab);
        });
    });

    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            searchTerm = e.target.value.trim().toLowerCase();
            renderActiveTab();
        });
    }

    if (alarmActionBtn) {
        alarmActionBtn.addEventListener('click', () => {
            // Switch to waitlist tab
            const waitlistTabBtn = document.querySelector('.tab-btn[data-tab="waitlist"]');
            if (waitlistTabBtn) waitlistTabBtn.click();
        });
    }
}

function switchPane(tab) {
    const paneAppointments = document.getElementById('paneAppointments');
    const paneWaitlist = document.getElementById('paneWaitlist');
    const panePatientSearch = document.getElementById('panePatientSearch');

    if (paneAppointments) paneAppointments.style.display = tab === 'appointments' ? 'block' : 'none';
    if (paneWaitlist) paneWaitlist.style.display = tab === 'waitlist' ? 'block' : 'none';
    if (panePatientSearch) panePatientSearch.style.display = tab === 'patientSearch' ? 'block' : 'none';

    if (tab === 'appointments') {
        renderAppointmentsTable();
    } else if (tab === 'waitlist') {
        renderWaitlistTable();
    }
}

/**
 * 3. Load Provider Dashboard Data
 */
async function loadProviderDashboard() {
    const providerId = currentProvider ? currentProvider.provider_id : 1;

    try {
        const response = await fetch(`http://localhost:3000/api/provider/${providerId}/dashboard`);
        if (!response.ok) throw new Error('Failed to fetch provider dashboard data.');

        dashboardData = await response.json();

        // Update provider state
        if (dashboardData.provider) {
            currentProvider = { ...currentProvider, ...dashboardData.provider };
            updateHeaderProfile();
        }

        // Update metric counters and alarm banner
        updateMetricsAndAlarm();

        // Render current active tab
        renderActiveTab();
    } catch (err) {
        console.error('Error loading dashboard:', err);
    }
}

function updateHeaderProfile() {
    const p = currentProvider;
    const headerProviderName = document.getElementById('headerProviderName');
    const headerProviderAvatar = document.getElementById('headerProviderAvatar');
    const headerProviderType = document.getElementById('headerProviderType');
    const headerProviderDistrict = document.getElementById('headerProviderDistrict');
    const headerProviderFee = document.getElementById('headerProviderFee');

    if (headerProviderName) headerProviderName.textContent = p.name;
    if (headerProviderAvatar) {
        const initial = (p.name || 'D').replace(/^(Dr\.|Clinic|Hospital)\s*/i, '').trim().charAt(0).toUpperCase() || 'D';
        headerProviderAvatar.textContent = initial;
    }
    if (headerProviderType) {
        headerProviderType.textContent = p.provider_type === 'clinic' ? 'Medical Clinic' : 'Licensed Clinical Therapist';
    }
    if (headerProviderDistrict) headerProviderDistrict.textContent = p.district_name || 'Dhaka';
    if (headerProviderFee) headerProviderFee.textContent = `৳ ${parseFloat(p.session_fee || 0).toLocaleString()}/session`;
}

function updateMetricsAndAlarm() {
    const stats = dashboardData.stats || {};
    const urgentList = dashboardData.urgent_alerts || [];
    const appointments = dashboardData.appointments || [];
    const waitlist = dashboardData.waitlist || [];

    const statBookedPatients = document.getElementById('statBookedPatients');
    const statBookedSub = document.getElementById('statBookedSub');
    const statCapacityUsage = document.getElementById('statCapacityUsage');
    const capacityBarFill = document.getElementById('capacityBarFill');
    const statCapacityStatus = document.getElementById('statCapacityStatus');
    const statWaitlistCount = document.getElementById('statWaitlistCount');
    const statUrgentCount = document.getElementById('statUrgentCount');
    const tabBadgeAppointments = document.getElementById('tabBadgeAppointments');
    const tabBadgeWaitlist = document.getElementById('tabBadgeWaitlist');

    const curPatients = stats.current_patients || 0;
    const maxCap = stats.max_capacity || 20;
    const activeWaitlistCount = stats.active_waitlist_count || 0;
    const urgentCount = stats.urgent_waitlist_count || urgentList.length;

    if (statBookedPatients) statBookedPatients.textContent = stats.active_appointments_count || 0;
    if (statBookedSub) statBookedSub.textContent = `${stats.total_booked || 0} total bookings recorded`;

    if (statCapacityUsage) statCapacityUsage.textContent = `${curPatients} / ${maxCap}`;
    
    // Capacity progress bar
    const fillPct = Math.min(100, Math.round((curPatients / Math.max(1, maxCap)) * 100));
    if (capacityBarFill) {
        capacityBarFill.style.width = `${fillPct}%`;
        if (fillPct >= 100) {
            capacityBarFill.style.background = 'linear-gradient(90deg, #f59e0b, #ef4444)';
        } else {
            capacityBarFill.style.background = 'linear-gradient(90deg, #10b981, #059669)';
        }
    }

    if (statCapacityStatus) {
        if (curPatients >= maxCap) {
            statCapacityStatus.textContent = '⚠️ Full Capacity (Waitlist Active)';
            statCapacityStatus.style.color = '#dc2626';
        } else {
            statCapacityStatus.textContent = `✓ ${maxCap - curPatients} slots available`;
            statCapacityStatus.style.color = '#059669';
        }
    }

    if (statWaitlistCount) statWaitlistCount.textContent = activeWaitlistCount;
    if (statUrgentCount) statUrgentCount.textContent = urgentCount;

    if (tabBadgeAppointments) tabBadgeAppointments.textContent = appointments.length;
    if (tabBadgeWaitlist) tabBadgeWaitlist.textContent = waitlist.length;

    // Urgent Alarm Banner
    const urgentAlarmBanner = document.getElementById('urgentAlarmBanner');
    const alarmCount = document.getElementById('alarmCount');

    if (urgentCount > 0) {
        if (alarmCount) alarmCount.textContent = urgentCount;
        if (urgentAlarmBanner) urgentAlarmBanner.style.display = 'flex';
    } else {
        if (urgentAlarmBanner) urgentAlarmBanner.style.display = 'none';
    }
}

function renderActiveTab() {
    if (activeTab === 'appointments') {
        renderAppointmentsTable();
    } else if (activeTab === 'waitlist') {
        renderWaitlistTable();
    }
}

/**
 * Render Booked Appointments Table
 */
function renderAppointmentsTable() {
    const tbody = document.getElementById('appointmentsTableBody');
    if (!tbody) return;

    let list = dashboardData.appointments || [];

    if (searchTerm) {
        list = list.filter(a => {
            const name = (a.patient_name || '').toLowerCase();
            const phone = (a.patient_phone || '').toLowerCase();
            const city = (a.patient_city || '').toLowerCase();
            const id = String(a.appointment_id || '');
            return name.includes(searchTerm) || phone.includes(searchTerm) || city.includes(searchTerm) || id.includes(searchTerm);
        });
    }

    if (list.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="8" class="empty-td">
                    <div class="empty-icon">📅</div>
                    <div style="font-size:15px; font-weight:700; color:#334155;">No Patient Bookings Found</div>
                    <p style="font-size:12px; color:#64748b; margin-top:4px;">No appointments match your search filter or no bookings have been placed yet.</p>
                </td>
            </tr>
        `;
        return;
    }

    let html = '';
    list.forEach(a => {
        const initial = (a.patient_name || 'P').charAt(0).toUpperCase();
        const statusLower = (a.status || 'Confirmed').toLowerCase();
        let statusClass = 'confirmed';
        if (statusLower === 'completed') statusClass = 'completed';
        else if (statusLower === 'cancelled') statusClass = 'cancelled';

        let actions = '';
        if (statusLower === 'confirmed' || statusLower === 'scheduled' || statusLower === 'active') {
            actions = `
                <div style="display:flex; gap:6px;">
                    <button type="button" class="btn-action-complete" onclick="markAppointmentCompleted(${a.appointment_id})">
                        ✓ Complete &amp; Free Slot
                    </button>
                    <button type="button" class="btn-action-cancel" onclick="cancelAppointment(${a.appointment_id})">
                        ✕ Cancel
                    </button>
                </div>
            `;
        } else {
            actions = `<span style="font-size:12px; color:var(--text-muted); font-style:italic;">(${escapeHtml(a.status)})</span>`;
        }

        html += `
            <tr>
                <td>
                    <div class="patient-cell">
                        <div class="patient-avatar">${initial}</div>
                        <div class="patient-details">
                            <span class="patient-name-text">${escapeHtml(a.patient_name)}</span>
                            <span class="patient-id-sub">Patient #${a.patient_id} • Lang: ${escapeHtml(a.preferred_language || 'English')}</span>
                        </div>
                    </div>
                </td>
                <td>
                    <div style="display:flex; flex-direction:column;">
                        <span style="font-weight:600;">📞 ${escapeHtml(a.patient_phone || 'N/A')}</span>
                        <span style="color:var(--text-muted); font-size:12px;">✉️ ${escapeHtml(a.patient_email || 'N/A')}</span>
                    </div>
                </td>
                <td>
                    <span>📍 ${escapeHtml(a.patient_city || 'Dhaka')}</span>
                </td>
                <td>
                    <span style="font-weight:700; color:#065f46;">📅 ${a.appointment_date}</span>
                </td>
                <td>
                    <span style="font-weight:700;">৳ ${parseFloat(currentProvider.session_fee || 1500).toLocaleString()}</span>
                </td>
                <td>
                    <span class="status-pill ${statusClass}">${escapeHtml(a.status)}</span>
                </td>
                <td>
                    <button type="button" class="btn-action-history" onclick="openPatientHistoryModal(${a.patient_id})">
                        <span>📋 View History</span>
                    </button>
                </td>
                <td>
                    ${actions}
                </td>
            </tr>
        `;
    });

    tbody.innerHTML = html;
}

/**
 * Render Waitlist Table (Patient Queue for this Provider)
 */
function renderWaitlistTable() {
    const tbody = document.getElementById('waitlistTableBody');
    if (!tbody) return;

    let list = dashboardData.waitlist || [];

    if (searchTerm) {
        list = list.filter(w => {
            const name = (w.patient_name || '').toLowerCase();
            const phone = (w.patient_phone || '').toLowerCase();
            const city = (w.patient_city || '').toLowerCase();
            const priority = (w.priority_level || '').toLowerCase();
            return name.includes(searchTerm) || phone.includes(searchTerm) || city.includes(searchTerm) || priority.includes(searchTerm);
        });
    }

    if (list.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="8" class="empty-td">
                    <div class="empty-icon">⏳</div>
                    <div style="font-size:15px; font-weight:700; color:#334155;">No Patients in Priority Waitlist Queue</div>
                    <p style="font-size:12px; color:#64748b; margin-top:4px;">When your clinic capacity is full, patients who select you will automatically be queued here.</p>
                </td>
            </tr>
        `;
        return;
    }

    let html = '';
    list.forEach(w => {
        const initial = (w.patient_name || 'P').charAt(0).toUpperCase();
        const priority = (w.priority_level || 'ROUTINE').toUpperCase();
        const days = w.days_waiting || 0;
        const isActive = (w.status || 'Active').toLowerCase() === 'active';
        const isUrgent = w.needs_urgent_attention === 1 || priority === 'HIGH' || priority === 'CRITICAL';

        let priorityClass = 'routine';
        let priorityLabel = priority;
        if (priority === 'CRITICAL') {
            priorityClass = 'critical';
            priorityLabel = '🚨 CRITICAL (>6d)';
        } else if (priority === 'HIGH') {
            priorityClass = 'high';
            priorityLabel = '⚡ HIGH (>4d)';
        } else if (priority === 'MODERATE') {
            priorityClass = 'moderate';
            priorityLabel = 'MODERATE (>2d)';
        } else {
            priorityClass = 'routine';
            priorityLabel = 'ROUTINE (0-2d)';
        }

        let actionCell = '';
        if (isActive) {
            actionCell = `
                <button type="button" class="btn-action-admit" onclick="openAdmitModal(${w.waitlist_id}, '${escapeHtml(w.patient_name)}', ${days}, '${priority}')">
                    <span>⚡ Admit &amp; Book Appointment ➔</span>
                </button>
            `;
        } else {
            actionCell = `<span style="font-size:12px; color:var(--text-muted); font-style:italic;">${escapeHtml(w.status)}</span>`;
        }

        html += `
            <tr class="${isUrgent && isActive ? 'urgent-row' : ''}">
                <td>
                    <div class="patient-cell">
                        <div class="patient-avatar" style="${isUrgent && isActive ? 'background:#fed7aa; color:#9a3412;' : ''}">${initial}</div>
                        <div class="patient-details">
                            <span class="patient-name-text">${escapeHtml(w.patient_name)}</span>
                            <span class="patient-id-sub">Waitlist #${w.waitlist_id} • Patient #${w.patient_id}</span>
                        </div>
                    </div>
                </td>
                <td>
                    <div style="display:flex; flex-direction:column;">
                        <span style="font-weight:600;">📞 ${escapeHtml(w.patient_phone || 'N/A')}</span>
                        <span style="color:var(--text-muted); font-size:12px;">✉️ ${escapeHtml(w.patient_email || 'N/A')}</span>
                    </div>
                </td>
                <td>
                    <span style="color:var(--text-muted);">📅 ${w.request_date}</span>
                </td>
                <td>
                    <span style="font-weight:700; color:${days >= 4 ? '#b91c1c' : (days >= 2 ? '#b45309' : '#047857')};">
                        ⏱️ ${days} Day${days === 1 ? '' : 's'} in Queue
                    </span>
                </td>
                <td>
                    <span class="priority-pill ${priorityClass}">${priorityLabel}</span>
                </td>
                <td>
                    <span class="status-pill ${isActive ? 'active-waitlist' : 'completed'}">${escapeHtml(w.status)}</span>
                </td>
                <td>
                    <button type="button" class="btn-action-history" onclick="openPatientHistoryModal(${w.patient_id})">
                        <span>📋 View History</span>
                    </button>
                </td>
                <td>
                    ${actionCell}
                </td>
            </tr>
        `;
    });

    tbody.innerHTML = html;
}

/**
 * 4. Patient Dossier & Medical History Modal
 */
function initHistoryModal() {
    const modal = document.getElementById('patientHistoryModal');
    const closeBtn = document.getElementById('closeHistoryModalBtn');

    if (closeBtn) {
        closeBtn.onclick = () => {
            if (modal) modal.style.display = 'none';
        };
    }
}

window.openPatientHistoryModal = async function(patientId) {
    const modal = document.getElementById('patientHistoryModal');
    const historyBody = document.getElementById('historyModalBody');
    const patientNameHeader = document.getElementById('historyPatientName');
    const patientSubHeader = document.getElementById('historyPatientSub');

    if (!modal || !historyBody) return;

    modal.style.display = 'flex';
    historyBody.innerHTML = `
        <div class="loading-td">
            <div class="spinner-inline"></div> Loading complete clinical checkup history &amp; prescription dossier...
        </div>
    `;

    try {
        const response = await fetch(`http://localhost:3000/api/patient/${patientId}/history`);
        if (!response.ok) throw new Error('Could not retrieve patient medical history.');

        const data = await response.json();
        const p = data.patient;
        const s = data.summary || {};
        const doctorVisits = data.doctor_visits || [];
        const problemAreas = data.problem_areas || [];
        const appointments = data.appointments || [];

        if (patientNameHeader) patientNameHeader.textContent = `${p.name} - Clinical Medical History`;
        if (patientSubHeader) patientSubHeader.textContent = `Patient #${p.patient_id} • Age: ${p.age || 'N/A'} • ${p.city || 'Dhaka'}`;

        const initial = (p.name || 'P').charAt(0).toUpperCase();

        // 1. Patient Hero Banner
        let html = `
            <div class="dossier-patient-hero">
                <div class="dossier-patient-identity">
                    <div class="dossier-avatar">${initial}</div>
                    <div>
                        <div class="dossier-name-title">${escapeHtml(p.name)}</div>
                        <div class="dossier-meta-chips">
                            <span class="dossier-chip">🆔 Patient #${p.patient_id}</span>
                            <span class="dossier-chip">🎂 Age: ${p.age || 'N/A'} (DOB: ${p.date_of_birth || 'N/A'})</span>
                            <span class="dossier-chip">📍 ${escapeHtml(p.city || 'Dhaka')}, ${escapeHtml(p.district_name || '')}</span>
                            <span class="dossier-chip">🗣️ Lang: ${escapeHtml(p.preferred_language || 'English')}</span>
                        </div>
                    </div>
                </div>
                <div style="font-size:12px; color:var(--text-muted); text-align:right;">
                    <div>📞 <strong>${escapeHtml(p.phone || 'N/A')}</strong></div>
                    <div>✉️ ${escapeHtml(p.email || 'N/A')}</div>
                    <div style="margin-top:2px;">Registered: ${p.registered_date || 'N/A'}</div>
                </div>
            </div>
        `;

        // 2. Key Clinical Metrics Bar
        html += `
            <div class="dossier-metrics-bar">
                <div class="dossier-metric-box">
                    <span class="dossier-metric-lbl">Total Consultations</span>
                    <span class="dossier-metric-num">${s.total_appointments || 0}</span>
                    <span class="dossier-metric-sub">Across all clinics</span>
                </div>
                <div class="dossier-metric-box">
                    <span class="dossier-metric-lbl">Completed Visits</span>
                    <span class="dossier-metric-num" style="color:#059669;">${s.completed_visits || 0}</span>
                    <span class="dossier-metric-sub">Attended checkups</span>
                </div>
                <div class="dossier-metric-box">
                    <span class="dossier-metric-lbl">Upcoming Bookings</span>
                    <span class="dossier-metric-num" style="color:#0284c7;">${s.confirmed_upcoming || 0}</span>
                    <span class="dossier-metric-sub">Confirmed slots</span>
                </div>
                <div class="dossier-metric-box">
                    <span class="dossier-metric-lbl">Cancelled Checkups</span>
                    <span class="dossier-metric-num" style="${s.cancelled_appointments > 0 ? 'color:#dc2626;' : ''}">${s.cancelled_appointments || 0}</span>
                    <span class="dossier-metric-sub ${s.cancellation_rate_pct >= 20 ? 'cancel-alert-tag' : ''}">
                        ${s.cancellation_rate_pct}% Cancellation Rate
                    </span>
                </div>
                <div class="dossier-metric-box">
                    <span class="dossier-metric-lbl">Distinct Doctors Visited</span>
                    <span class="dossier-metric-num">${s.distinct_doctors_visited || 0}</span>
                    <span class="dossier-metric-sub">Healthcare providers</span>
                </div>
            </div>
        `;

        // 3. Problem Areas & Specializations Visited
        html += `
            <div class="dossier-section">
                <div class="dossier-section-title">
                    <span>🧠 Problem Areas &amp; Conditions Explored</span>
                </div>
                <div class="problem-tags-container">
        `;

        if (problemAreas.length === 0) {
            html += `<span style="font-size:13px; color:var(--text-muted);">No specialization categories recorded yet.</span>`;
        } else {
            problemAreas.forEach(prob => {
                html += `
                    <div class="problem-tag">
                        <span>${escapeHtml(prob.spec_name)}</span>
                        <span class="problem-tag-count">${prob.consultation_count} visit${prob.consultation_count === 1 ? '' : 's'}</span>
                    </div>
                `;
            });
        }
        html += `</div></div>`;

        // 4. Doctor Visit Frequency & Loyalty Breakdown Table
        html += `
            <div class="dossier-section">
                <div class="dossier-section-title">
                    <span>👨‍⚕️ Doctor &amp; Clinic Visit History</span>
                </div>
                <div class="table-container">
                    <table class="dossier-sub-table">
                        <thead>
                            <tr>
                                <th>Doctor / Clinic Name</th>
                                <th>Type &amp; District</th>
                                <th>Specializations</th>
                                <th>Total Visits</th>
                                <th>Completed</th>
                                <th>Cancelled</th>
                                <th>Last Consultation</th>
                            </tr>
                        </thead>
                        <tbody>
        `;

        if (doctorVisits.length === 0) {
            html += `<tr><td colspan="7" style="text-align:center; padding:18px; color:var(--text-muted);">No prior doctor visits recorded.</td></tr>`;
        } else {
            doctorVisits.forEach(doc => {
                html += `
                    <tr>
                        <td>
                            <strong style="color:var(--text-main); font-size:13px;">${escapeHtml(doc.provider_name)}</strong>
                        </td>
                        <td>
                            <span>${doc.provider_type === 'clinic' ? '🏥 Clinic' : '🩺 Therapist'} (${escapeHtml(doc.district_name || 'Dhaka')})</span>
                        </td>
                        <td>
                            <span style="font-size:11px; color:var(--text-muted);">${escapeHtml(doc.specializations)}</span>
                        </td>
                        <td>
                            <strong style="font-size:13px;">${doc.total_visits}</strong>
                        </td>
                        <td>
                            <span style="color:#059669; font-weight:700;">${doc.completed_visits || 0}</span>
                        </td>
                        <td>
                            <span style="${doc.cancelled_visits > 0 ? 'color:#dc2626; font-weight:700;' : 'color:var(--text-muted);'}">${doc.cancelled_visits || 0}</span>
                        </td>
                        <td>
                            <span>📅 ${doc.last_visit_date || 'N/A'}</span>
                        </td>
                    </tr>
                `;
            });
        }
        html += `</tbody></table></div></div>`;

        // 5. Chronological Checkup Timeline & Prescriptions
        html += `
            <div class="dossier-section">
                <div class="dossier-section-title">
                    <span>📜 Detailed Checkup Timeline &amp; Prescriptions</span>
                </div>
                <div class="timeline-container">
        `;

        if (appointments.length === 0) {
            html += `<p style="font-size:13px; color:var(--text-muted); padding:10px 0;">No checkup history entries found.</p>`;
        } else {
            appointments.forEach(apt => {
                const statusLower = (apt.status || '').toLowerCase();
                let statusClass = 'confirmed';
                if (statusLower === 'completed') statusClass = 'completed';
                else if (statusLower === 'cancelled') statusClass = 'cancelled';

                const notes = apt.clinical_notes || 'No clinical observation notes recorded yet for this session.';
                const prescription = apt.prescription || 'No specific medication or behavioral protocol prescribed yet.';

                html += `
                    <div class="timeline-card ${statusClass}">
                        <div class="timeline-dot"></div>
                        <div class="timeline-header">
                            <div>
                                <span class="timeline-doctor-info">${escapeHtml(apt.provider_name)}</span>
                                <span style="font-size:12px; color:var(--text-muted); margin-left:6px;">(${escapeHtml(apt.specializations || 'General Care')})</span>
                            </div>
                            <div style="display:flex; align-items:center; gap:8px;">
                                <span class="timeline-date-badge">📅 ${apt.appointment_date}</span>
                                <span class="status-pill ${statusClass}">${escapeHtml(apt.status)}</span>
                            </div>
                        </div>

                        <!-- Diagnostic Observations -->
                        <div class="clinical-notes-box">
                            <div class="notes-box-header">
                                <span>📝 Clinical Observations &amp; Diagnosis</span>
                            </div>
                            <div>${escapeHtml(notes)}</div>
                        </div>

                        <!-- Prescription & Treatment Plan -->
                        <div class="prescription-box">
                            <div class="notes-box-header">
                                <span>💊 Prescription &amp; Treatment Recommendations</span>
                            </div>
                            <div>${escapeHtml(prescription)}</div>
                        </div>

                        <div style="display:flex; justify-content:space-between; align-items:center; margin-top:8px;">
                            <span style="font-size:11px; color:var(--text-muted);">Session Fee: ৳ ${parseFloat(apt.session_fee || 0).toLocaleString()} • Appointment #${apt.appointment_id}</span>
                            <button type="button" class="btn-edit-notes-inline" onclick="openEditNotesModal(${apt.appointment_id}, ${p.patient_id}, '${escapeJs(apt.clinical_notes || '')}', '${escapeJs(apt.prescription || '')}')">
                                <span>✏️ Edit Clinical Record</span>
                            </button>
                        </div>
                    </div>
                `;
            });
        }

        html += `</div></div>`;

        historyBody.innerHTML = html;
    } catch (err) {
        console.error('History modal load error:', err);
        historyBody.innerHTML = `
            <div class="empty-td">
                <div class="empty-icon">⚠️</div>
                <div style="font-size:15px; font-weight:700; color:#dc2626;">Failed to load patient history</div>
                <p style="font-size:12px; color:#64748b; margin-top:4px;">Please ensure the backend server is running and try again.</p>
            </div>
        `;
    }
};

/**
 * 5. Tab 3: Patient Search Dossier
 */
function initDossierSearch() {
    const searchInput = document.getElementById('dossierSearchInput');
    const searchBtn = document.getElementById('dossierSearchBtn');
    const resultsContainer = document.getElementById('patientSearchResults');

    const performSearch = async () => {
        const q = (searchInput.value || '').trim();
        if (!q) {
            resultsContainer.innerHTML = `
                <div class="empty-search-state">
                    <span>💡 Enter a patient name, email, or ID above to inspect their clinical checkup history.</span>
                </div>
            `;
            return;
        }

        resultsContainer.innerHTML = `
            <div class="loading-td" style="grid-column: 1 / -1;">
                <div class="spinner-inline"></div> Searching patient clinical dossiers...
            </div>
        `;

        try {
            const response = await fetch(`http://localhost:3000/api/patients/search?q=${encodeURIComponent(q)}`);
            if (!response.ok) throw new Error('Search failed');

            const list = await response.json();

            if (list.length === 0) {
                resultsContainer.innerHTML = `
                    <div class="empty-search-state">
                        <div style="font-size:24px; margin-bottom:6px;">🔍</div>
                        <strong>No patient records found matching "${escapeHtml(q)}"</strong>
                        <p style="font-size:12px; color:#64748b; margin-top:4px;">Try searching with a different name, email, or numerical patient ID.</p>
                    </div>
                `;
                return;
            }

            let html = '';
            list.forEach(p => {
                const initial = (p.name || 'P').charAt(0).toUpperCase();
                html += `
                    <div class="patient-result-card">
                        <div class="patient-result-header">
                            <div class="patient-card-avatar">${initial}</div>
                            <div>
                                <div style="font-weight:800; font-size:15px; color:var(--text-main);">${escapeHtml(p.name)}</div>
                                <div style="font-size:12px; color:var(--text-muted);">Patient #${p.patient_id} • ${escapeHtml(p.city || 'Dhaka')}</div>
                            </div>
                        </div>

                        <div style="font-size:12px; color:#475569;">
                            <div>📞 <strong>${escapeHtml(p.phone || 'N/A')}</strong></div>
                            <div>✉️ ${escapeHtml(p.email || 'N/A')}</div>
                        </div>

                        <div class="patient-card-stats">
                            <div class="patient-card-stat-item">
                                <span class="patient-card-stat-label">Total Visits</span>
                                <span class="patient-card-stat-value">${p.total_visits || 0}</span>
                            </div>
                            <div class="patient-card-stat-item">
                                <span class="patient-card-stat-label">Completed</span>
                                <span class="patient-card-stat-value" style="color:#059669;">${p.completed_visits || 0}</span>
                            </div>
                            <div class="patient-card-stat-item">
                                <span class="patient-card-stat-label">Cancelled</span>
                                <span class="patient-card-stat-value" style="${p.cancelled_visits > 0 ? 'color:#dc2626;' : ''}">${p.cancelled_visits || 0}</span>
                            </div>
                        </div>

                        <button type="button" class="btn-action-history" style="width:100%; justify-content:center; padding:8px 12px;" onclick="openPatientHistoryModal(${p.patient_id})">
                            <span>📋 Inspect Full Checkup Dossier ➔</span>
                        </button>
                    </div>
                `;
            });

            resultsContainer.innerHTML = html;
        } catch (err) {
            console.error('Dossier search error:', err);
            resultsContainer.innerHTML = `
                <div class="empty-search-state" style="color:#dc2626;">
                    <span>Failed to search patient records. Please check backend connection.</span>
                </div>
            `;
        }
    };

    if (searchBtn) searchBtn.addEventListener('click', performSearch);
    if (searchInput) {
        searchInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') performSearch();
        });
    }
}

/**
 * 6. Edit Clinical Notes & Prescription Modal
 */
function initEditNotesModal() {
    const modal = document.getElementById('editNotesModal');
    const form = document.getElementById('editNotesForm');
    const closeBtn = document.getElementById('closeEditNotesModalBtn');
    const cancelBtn = document.getElementById('cancelEditNotesBtn');
    const saveBtn = document.getElementById('saveNotesBtn');
    const alertBox = document.getElementById('editNotesAlertBox');

    const closeModal = () => {
        if (modal) modal.style.display = 'none';
        if (alertBox) alertBox.style.display = 'none';
    };

    if (closeBtn) closeBtn.onclick = closeModal;
    if (cancelBtn) cancelBtn.onclick = closeModal;

    if (form) {
        form.addEventListener('submit', async (e) => {
            e.preventDefault();

            const aptId = document.getElementById('editNotesAppointmentId').value;
            const patientId = document.getElementById('editNotesPatientId').value;
            const clinicalNotes = document.getElementById('editClinicalNotes').value.trim();
            const prescription = document.getElementById('editPrescription').value.trim();

            if (!aptId) return;

            saveBtn.disabled = true;
            saveBtn.textContent = 'Saving...';

            try {
                const response = await fetch(`http://localhost:3000/api/appointments/${aptId}/clinical-notes`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        clinical_notes: clinicalNotes,
                        prescription: prescription
                    })
                });

                const data = await response.json();

                if (response.ok) {
                    alertBox.className = 'modal-alert-box success';
                    alertBox.textContent = '✓ Clinical record & prescription updated successfully!';
                    alertBox.style.display = 'block';

                    setTimeout(() => {
                        closeModal();
                        saveBtn.disabled = false;
                        saveBtn.textContent = '💾 Save Clinical Record';
                        // Re-fetch patient history modal to display updated notes
                        if (patientId) openPatientHistoryModal(patientId);
                    }, 1000);
                } else {
                    alertBox.className = 'modal-alert-box error';
                    alertBox.textContent = data.error || 'Failed to update clinical record.';
                    alertBox.style.display = 'block';
                    saveBtn.disabled = false;
                    saveBtn.textContent = '💾 Save Clinical Record';
                }
            } catch (err) {
                console.error('Save notes error:', err);
                alertBox.className = 'modal-alert-box error';
                alertBox.textContent = 'Server communication error.';
                alertBox.style.display = 'block';
                saveBtn.disabled = false;
                saveBtn.textContent = '💾 Save Clinical Record';
            }
        });
    }
}

window.openEditNotesModal = function(appointmentId, patientId, notes, prescription) {
    const modal = document.getElementById('editNotesModal');
    const aptIdInput = document.getElementById('editNotesAppointmentId');
    const patientIdInput = document.getElementById('editNotesPatientId');
    const notesInput = document.getElementById('editClinicalNotes');
    const presInput = document.getElementById('editPrescription');
    const subTitle = document.getElementById('editNotesSubtitle');
    const alertBox = document.getElementById('editNotesAlertBox');

    if (aptIdInput) aptIdInput.value = appointmentId;
    if (patientIdInput) patientIdInput.value = patientId;
    if (notesInput) notesInput.value = notes || '';
    if (presInput) presInput.value = prescription || '';
    if (subTitle) subTitle.textContent = `Consultation #${appointmentId} • Patient #${patientId}`;
    if (alertBox) alertBox.style.display = 'none';

    if (modal) modal.style.display = 'flex';
};

/**
 * 7. Admit Waitlisted Patient Modal Logic
 */
function initAdmitModal() {
    const modal = document.getElementById('admitModal');
    const form = document.getElementById('admitForm');
    const closeBtn = document.getElementById('closeAdmitModalBtn');
    const cancelBtn = document.getElementById('cancelAdmitBtn');
    const confirmBtn = document.getElementById('confirmAdmitBtn');
    const alertBox = document.getElementById('admitAlertBox');
    const dateInput = document.getElementById('admitAppointmentDate');

    // Default to tomorrow
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    if (dateInput) dateInput.value = tomorrow.toISOString().split('T')[0];

    const closeModal = () => {
        if (modal) modal.style.display = 'none';
        if (alertBox) alertBox.style.display = 'none';
    };

    if (closeBtn) closeBtn.onclick = closeModal;
    if (cancelBtn) cancelBtn.onclick = closeModal;

    if (form) {
        form.addEventListener('submit', async (e) => {
            e.preventDefault();

            const waitlistId = document.getElementById('admitWaitlistId').value;
            const appointmentDate = dateInput.value;
            const providerId = currentProvider ? currentProvider.provider_id : 1;

            if (!waitlistId || !appointmentDate) return;

            confirmBtn.disabled = true;
            confirmBtn.textContent = 'Admitting Patient...';

            try {
                const response = await fetch(`http://localhost:3000/api/provider/${providerId}/admit-waitlist`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        waitlist_id: parseInt(waitlistId, 10),
                        appointment_date: appointmentDate
                    })
                });

                const data = await response.json();

                if (response.ok) {
                    alertBox.className = 'modal-alert-box success';
                    alertBox.textContent = `✓ ${data.message} Appointment #${data.appointment_id} created!`;
                    alertBox.style.display = 'block';

                    setTimeout(() => {
                        closeModal();
                        confirmBtn.disabled = false;
                        confirmBtn.textContent = '✓ Confirm Appointment & Admit ➔';
                        loadProviderDashboard();
                    }, 1200);
                } else {
                    alertBox.className = 'modal-alert-box error';
                    alertBox.textContent = data.error || 'Failed to admit waitlisted patient.';
                    alertBox.style.display = 'block';
                    confirmBtn.disabled = false;
                    confirmBtn.textContent = '✓ Confirm Appointment & Admit ➔';
                }
            } catch (err) {
                console.error('Admit error:', err);
                alertBox.className = 'modal-alert-box error';
                alertBox.textContent = 'Server connection error.';
                alertBox.style.display = 'block';
                confirmBtn.disabled = false;
                confirmBtn.textContent = '✓ Confirm Appointment & Admit ➔';
            }
        });
    }
}

window.openAdmitModal = function(waitlistId, patientName, daysWaiting, priority) {
    const modal = document.getElementById('admitModal');
    const admitWaitlistId = document.getElementById('admitWaitlistId');
    const admitPatientName = document.getElementById('admitPatientName');
    const admitDaysWaiting = document.getElementById('admitDaysWaiting');
    const admitPriorityBadge = document.getElementById('admitPriorityBadge');
    const alertBox = document.getElementById('admitAlertBox');

    if (admitWaitlistId) admitWaitlistId.value = waitlistId;
    if (admitPatientName) admitPatientName.textContent = patientName;
    if (admitDaysWaiting) admitDaysWaiting.textContent = `⏱️ ${daysWaiting} Days in Queue`;
    if (admitPriorityBadge) {
        admitPriorityBadge.textContent = priority;
        admitPriorityBadge.className = `priority-pill ${(priority || 'routine').toLowerCase()}`;
    }
    if (alertBox) alertBox.style.display = 'none';

    if (modal) modal.style.display = 'flex';
};

/**
 * Mark Appointment as Completed
 */
window.markAppointmentCompleted = async function(appointmentId) {
    if (!confirm('Mark this appointment as completed? This will free up 1 patient slot in your capacity.')) {
        return;
    }

    try {
        const response = await fetch(`http://localhost:3000/api/appointments/${appointmentId}/complete`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' }
        });

        const data = await response.json();
        if (response.ok) {
            loadProviderDashboard();
        } else {
            alert(data.error || 'Failed to complete appointment.');
        }
    } catch (err) {
        console.error('Complete error:', err);
        alert('Server communication error.');
    }
};

/**
 * Cancel Appointment
 */
window.cancelAppointment = async function(appointmentId) {
    if (!confirm('Are you sure you want to cancel this scheduled appointment?')) {
        return;
    }

    try {
        const response = await fetch(`http://localhost:3000/api/appointments/${appointmentId}/cancel`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' }
        });

        const data = await response.json();
        if (response.ok) {
            loadProviderDashboard();
        } else {
            alert(data.error || 'Failed to cancel appointment.');
        }
    } catch (err) {
        console.error('Cancel error:', err);
        alert('Server communication error.');
    }
};

// Helper: Escape HTML strings
function escapeHtml(text) {
    if (!text) return '';
    return String(text)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

function escapeJs(text) {
    if (!text) return '';
    return String(text)
        .replace(/\\/g, '\\\\')
        .replace(/'/g, "\\'")
        .replace(/"/g, '\\"')
        .replace(/\n/g, '\\n')
        .replace(/\r/g, '\\r');
}
