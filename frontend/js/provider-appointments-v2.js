/**
 * V2 ASHRAFUL: separate appointments js for appointments functionality in the combined provider-dashboard.html
 */

document.addEventListener('DOMContentLoaded', () => {
    initAppointmentsV2();
    ensureRescheduleModalExists();
});

let currentProviderAppointmentsV2 = null;

function initAppointmentsV2() {
    // retrieve currentProvider session
    const storedStr = sessionStorage.getItem('currentProvider') || localStorage.getItem('currentProvider');
    if (storedStr) {
        try {
            currentProviderAppointmentsV2 = JSON.parse(storedStr);
        } catch (e) {
            currentProviderAppointmentsV2 = { provider_id: 1 };
        }
    } else {
        currentProviderAppointmentsV2 = { provider_id: 1 };
    }

    // V2 Tab Switching listener
    const tabButtons = document.querySelectorAll('#workspaceTabs .tab-btn');
    tabButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            const tab = btn.dataset.tab;
            const paneV2 = document.getElementById('paneAppointmentsV2');
            if (!paneV2) return;

            if (tab === 'appointments-v2') {
                paneV2.style.display = 'block';
                loadAppointmentsV2();
            } else {
                paneV2.style.display = 'none';
            }
        });
    });

    // load for V2 appointments
    loadAppointmentsV2();
}

async function loadAppointmentsV2() {
    const providerId = currentProviderAppointmentsV2 ? currentProviderAppointmentsV2.provider_id : 1;
    const tbody = document.getElementById('appointmentsTableBodyV2');
    const badge = document.getElementById('tabBadgeAppointmentsV2');


    if (!tbody) return;

    try {
        const response = await fetch(`http://localhost:3000/api/provider/${providerId}/appointments-v2`);
        if (!response.ok) throw new Error('Failed to fetch V2 appointments.');

        const appointments = await response.json();

        if (badge) {
            const activeCount = appointments.filter(a => {
                const s = (a.status || '').toLowerCase();
                return s === 'confirmed' || s === 'scheduled';
            }).length;
            badge.textContent = activeCount;
        }

        if (appointments.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="8" class="empty-td">
                        <div class="empty-icon">📅</div>
                        <div style="font-size:15px; font-weight:700; color:#334155;">No Patient Bookings Found</div>
                        <p style="font-size:12px; color:#64748b; margin-top:4px;">No appointments have been recorded yet.</p>
                    </td>
                </tr>
            `;
            return;
        }

        let html = '';
        appointments.forEach(a => {
            const initial = (a.patient_name || 'P').charAt(0).toUpperCase();
            const statusLower = (a.status || 'Confirmed').toLowerCase();
            let statusClass = 'confirmed';
            if (statusLower === 'completed') statusClass = 'completed';
            else if (statusLower === 'cancelled') statusClass = 'cancelled';

            let actions = '';
            if (statusLower === 'confirmed' || statusLower === 'scheduled' || statusLower === 'active') {
                actions = `
                    <div class="v2-action-group">
                        <button type="button" class="btn-action-complete-v2" onclick="completeAppointmentV2(${a.appointment_id})">✓ Complete</button>
                        <button type="button" class="btn-action-reschedule-v2" onclick="openRescheduleModalV2(${a.appointment_id}, '${a.appointment_date || ''}')">📅 Reschedule</button>
                        <button type="button" class="btn-action-refer-v2" onclick="referAppointmentV2(${a.appointment_id}, ${a.patient_id})">↗️ Refer</button>
                        <button type="button" class="btn-action-cancel-v2" onclick="cancelAppointmentV2(${a.appointment_id})">✕ Cancel</button>
                    </div>
                `;
            } else {
                actions = `<span style="font-size:12px; color:var(--text-muted); font-style:italic;">(${escapeHtmlV2(a.status)})</span>`;
            }

            html += `
                <tr>
                    <td>
                        <div class="patient-cell">
                            <div class="patient-avatar">${initial}</div>
                            <div class="patient-details">
                                <span class="patient-name-text">${escapeHtmlV2(a.patient_name)}</span>
                                <span class="patient-id-sub">Patient #${a.patient_id} • Lang: ${escapeHtmlV2(a.preferred_language || 'English')}</span>
                            </div>
                        </div>
                    </td>
                    <td>
                        <div style="display:flex; flex-direction:column;">
                            <span style="font-weight:600;">📞 ${escapeHtmlV2(a.patient_phone || 'N/A')}</span>
                            <span style="color:var(--text-muted); font-size:12px;">✉️ ${escapeHtmlV2(a.patient_email || 'N/A')}</span>
                        </div>
                    </td>
                    <td>
                        <span>📍 ${escapeHtmlV2(a.patient_city || 'Dhaka')}</span>
                    </td>
                    <td>
                        <span style="font-weight:700; color:#065f46;">📅 ${a.appointment_date}</span>
                    </td>
                    <td>
                        <span style="font-weight:700;">৳ ${parseFloat(a.session_fee || 1500).toLocaleString()}</span>
                    </td>
                    <td>
                        <span class="status-pill ${statusClass}">${escapeHtmlV2(a.status)}</span>
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
    } catch (err) {
        console.error('Error loading V2 appointments:', err);
        tbody.innerHTML = `
            <tr>
                <td colspan="8" class="empty-td" style="color:#dc2626;">
                    Failed to load V2 appointments. Please check backend connection.
                </td>
            </tr>
        `;
    }
}

// V2 Action Handlers
window.completeAppointmentV2 = async function(appointmentId) {
    if (!confirm('Mark this appointment as completed?')) return;
    try {
        const res = await fetch(`http://localhost:3000/api/appointments-v2/${appointmentId}/complete`, { method: 'PUT' });
        if (res.ok) loadAppointmentsV2();
        else alert('Failed to complete appointment.');
    } catch (e) { console.error(e); }
};

window.cancelAppointmentV2 = async function(appointmentId) {
    if (!confirm('Cancel this appointment?')) return;
    try {
        const res = await fetch(`http://localhost:3000/api/appointments-v2/${appointmentId}/cancel`, { method: 'PUT' });
        if (res.ok) loadAppointmentsV2();
        else alert('Failed to cancel appointment.');
    } catch (e) { console.error(e); }
};

// Dynamic Reschedule Modal Injection & Handlers
function ensureRescheduleModalExists() {
    if (document.getElementById('rescheduleModalV2')) return;

    const modalHtml = `
        <div class="modal-backdrop" id="rescheduleModalV2" style="display: none;">
            <div class="modal-card">
                <div class="modal-header">
                    <div class="modal-title-wrap">
                        <span class="modal-badge-icon">📅</span>
                        <div>
                            <h3>Reschedule Appointment</h3>
                            <span class="modal-sub-text">Select a new consultation date</span>
                        </div>
                    </div>
                    <button type="button" class="btn-close-modal" id="closeRescheduleModalV2">✕</button>
                </div>
                <div class="modal-body">
                    <form id="rescheduleFormV2">
                        <input type="hidden" id="rescheduleAppointmentIdV2">
                        <div class="form-group" style="margin-bottom: 16px;">
                            <label for="rescheduleDateInputV2" style="display: block; font-weight: 600; margin-bottom: 6px; font-size: 13px;">New Appointment Date</label>
                            <input type="date" id="rescheduleDateInputV2" required style="width: 100%; padding: 10px; border: 1px solid #cbd5e1; border-radius: 8px; font-size: 14px;">
                        </div>
                        <div class="modal-alert-box" id="rescheduleAlertBoxV2" style="display: none; padding: 10px; border-radius: 6px; font-size: 12px; margin-bottom: 12px;"></div>
                        <div class="modal-actions" style="display: flex; justify-content: flex-end; gap: 8px;">
                            <button type="button" class="btn-cancel-modal" id="cancelRescheduleBtnV2" style="padding: 8px 16px; background: #f1f5f9; border: 1px solid #cbd5e1; border-radius: 6px; cursor: pointer; font-weight: 600;">Cancel</button>
                            <button type="submit" class="btn-confirm-admit" id="submitRescheduleBtnV2" style="padding: 8px 16px; background: #0f172a; color: white; border: none; border-radius: 6px; cursor: pointer; font-weight: 600;">✓ Save New Date</button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    `;
    document.body.insertAdjacentHTML('beforeend', modalHtml);

    const modal = document.getElementById('rescheduleModalV2');
    const closeBtn = document.getElementById('closeRescheduleModalV2');
    const cancelBtn = document.getElementById('cancelRescheduleBtnV2');
    const form = document.getElementById('rescheduleFormV2');

    const closeModal = () => modal.style.display = 'none';
    closeBtn.onclick = closeModal;
    cancelBtn.onclick = closeModal;

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const aptId = document.getElementById('rescheduleAppointmentIdV2').value;
        const newDate = document.getElementById('rescheduleDateInputV2').value;
        const alertBox = document.getElementById('rescheduleAlertBoxV2');

        if (!aptId || !newDate) return;

        try {
            const res = await fetch(`http://localhost:3000/api/appointments-v2/${aptId}/reschedule`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ appointment_date: newDate })
            });

            if (res.ok) {
                modal.style.display = 'none';
                loadAppointmentsV2();
            } else {
                const data = await res.json();
                alertBox.className = 'modal-alert-box error';
                alertBox.textContent = data.error || 'Failed to reschedule appointment.';
                alertBox.style.display = 'block';
            }
        } catch (err) {
            console.error('Reschedule error:', err);
        }
    });
}

window.openRescheduleModalV2 = function(appointmentId, currentDate) {
    ensureRescheduleModalExists();
    const modal = document.getElementById('rescheduleModalV2');
    const aptIdInput = document.getElementById('rescheduleAppointmentIdV2');
    const dateInput = document.getElementById('rescheduleDateInputV2');
    const alertBox = document.getElementById('rescheduleAlertBoxV2');

    aptIdInput.value = appointmentId;
    dateInput.value = currentDate || new Date().toISOString().split('T')[0];
    if (alertBox) alertBox.style.display = 'none';

    modal.style.display = 'flex';
};

/**
 * V2 ASHRAFUL: Corrected referral trigger to open the specialist/clinic picker modal directly from appointments
 */

window.referAppointmentV2 = function(appointmentId, patientId) {
    // Map appointment table parameters (appointmentId, patientId) to modal parameters (patientId, appointmentId)
    if (typeof openReferralModalV2 === 'function') {
        openReferralModalV2(patientId, appointmentId);
    } else {
        console.error('Referral modal initialization script not loaded.');
    }
};

function escapeHtmlV2(text) {
    if (!text) return '';
    return String(text)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}