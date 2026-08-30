/**
 * V2 ASHRAFUL: separate refferals js for referrals functionality in the combined provider-dashboard.html
 */

document.addEventListener('DOMContentLoaded', () => {
    initReferralsV2();
    ensureReferralModalExists();
});

let currentProviderReferralsV2 = null;

function initReferralsV2() {
    const storedStr = sessionStorage.getItem('currentProvider') || localStorage.getItem('currentProvider');
    if (storedStr) {
        try {
            currentProviderReferralsV2 = JSON.parse(storedStr);
        } catch (e) {
            currentProviderReferralsV2 = { provider_id: 1 };
        }
    } else {
        currentProviderReferralsV2 = { provider_id: 1 };
    }

    // Check URL parameters for any incoming quick-refer triggers (e.g. ?patient_id=X&appointment_id=Y)
    const urlParams = new URLSearchParams(window.location.search);
    const qPatientId = urlParams.get('patient_id');
    const qApptId = urlParams.get('appointment_id');
    if (qPatientId) {
        // Automatically open the referral modal for this patient
        setTimeout(() => {
            openReferralModalV2(qPatientId, qApptId);
        }, 500);
    }

    // V2 Referrals Tab Switching listener
    const tabButtons = document.querySelectorAll('#workspaceTabs .tab-btn');
    tabButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            const tab = btn.dataset.tab;
            const paneRef = document.getElementById('paneReferralsV2');
            if (!paneRef) return;

            if (tab === 'referrals-v2') {
                paneRef.style.display = 'block';
                loadReferralsV2();
            } else {
                paneRef.style.display = 'none';
            }
        });
    });
    
    loadReferralsV2();
}

async function loadReferralsV2() {
    const providerId = currentProviderReferralsV2 ? currentProviderReferralsV2.provider_id : 1;
    const outgoingTbody = document.getElementById('outgoingReferralsTableBodyV2');
    const incomingTbody = document.getElementById('incomingReferralsTableBodyV2');
    const badge = document.getElementById('tabBadgeReferralsV2');

    if (!outgoingTbody || !incomingTbody) return;

    try {
        const response = await fetch(`http://localhost:3000/api/provider/${providerId}/referrals-v2`);
        if (!response.ok) throw new Error('Failed to fetch referrals.');

        const data = await response.json();
        const incoming = data.incoming || [];
        const outgoing = data.outgoing || [];

        if (badge) badge.textContent = incoming.filter(r => r.status === 'Pending').length;

        // Populate Outgoing Table
        if (outgoing.length === 0) {
            outgoingTbody.innerHTML = `<tr><td colspan="7" class="empty-td">No outgoing referrals recorded yet.</td></tr>`;
        } else {
            outgoingTbody.innerHTML = outgoing.map(r => {
                const initial = (r.patient_name || 'P').charAt(0).toUpperCase();
                const statusClass = (r.status || 'pending').toLowerCase();
                return `
                    <tr>
                        <td>
                            <div class="patient-cell">
                                <div class="patient-avatar">${initial}</div>
                                <div class="patient-details">
                                    <span class="patient-name-text">${escapeHtmlV2(r.patient_name)}</span>
                                    <span class="patient-id-sub">Patient #${r.patient_id} • Lang: ${escapeHtmlV2(r.preferred_language || 'English')}</span>
                                </div>
                            </div>
                        </td>
                        <td><span>📍 ${escapeHtmlV2(r.patient_city || 'Dhaka')}</span></td>
                        <td>
                            <div style="display:flex; flex-direction:column;">
                                <span style="font-weight:600;">${escapeHtmlV2(r.target_name)}</span>
                                <span style="color:var(--text-muted); font-size:12px;">📍 ${escapeHtmlV2(r.target_city || 'Dhaka')}</span>
                            </div>
                        </td>
                        <td><span style="font-weight:700; color:#065f46;">📅 ${r.referral_date}</span></td>
                        <td><span class="status-pill ${statusClass}">${escapeHtmlV2(r.status)}</span></td>
                        <td>
                            <button type="button" class="btn-action-history" onclick="openPatientHistoryModal(${r.patient_id})">
                                <span>📋 View History</span>
                            </button>
                        </td>
                        <td>
                            <span style="font-size:12px; color:var(--text-muted);">${escapeHtmlV2(r.notes || 'No notes')}</span>
                        </td>
                    </tr>
                `;
            }).join('');
        }

            // Populate Incoming Table
        if (incoming.length === 0) {
            incomingTbody.innerHTML = `<tr><td colspan="7" class="empty-td">No incoming referrals found.</td></tr>`;
        } else {
            incomingTbody.innerHTML = incoming.map(r => {
                const initial = (r.patient_name || 'P').charAt(0).toUpperCase();
                const statusClass = (r.status || 'pending').toLowerCase();
                const isPending = statusClass === 'pending';

                return `
                    <tr>
                        <td>
                            <div class="patient-cell">
                                <div class="patient-avatar">${initial}</div>
                                <div class="patient-details">
                                    <span class="patient-name-text">${escapeHtmlV2(r.patient_name)}</span>
                                    <span class="patient-id-sub">Patient #${r.patient_id} • Lang: ${escapeHtmlV2(r.preferred_language || 'English')}</span>
                                </div>
                            </div>
                        </td>
                        <td><span>📍 ${escapeHtmlV2(r.patient_city || 'Dhaka')}</span></td>
                        <td>
                            <div style="display:flex; flex-direction:column;">
                                <span style="font-weight:600;">${escapeHtmlV2(r.source_name)}</span>
                                <span style="color:var(--text-muted); font-size:12px;">📍 ${escapeHtmlV2(r.source_city || 'Dhaka')}</span>
                            </div>
                        </td>
                        <td><span style="font-weight:700; color:#065f46;">📅 ${r.referral_date}</span></td>
                        <td><span class="status-pill ${statusClass}">${escapeHtmlV2(r.status)}</span></td>
                        <td>
                            <button type="button" class="btn-action-history" onclick="openPatientHistoryModal(${r.patient_id})">
                                <span>📋 View History</span>
                            </button>
                        </td>
                        <td>
                            <div style="display:flex; flex-direction:column; gap:6px;">
                                <span style="font-size:12px; color:var(--text-muted);">${escapeHtmlV2(r.notes || 'No notes')}</span>
                                ${isPending ? `
                                    <div class="v2-action-group">
                                        <button type="button" class="btn-action-complete-v2" onclick="updateReferralStatusV2(${r.referral_id}, 'Accepted', ${r.target_provider_id})">✓ Accept</button>
                                        <button type="button" class="btn-action-cancel-v2" onclick="updateReferralStatusV2(${r.referral_id}, 'Rejected', ${r.target_provider_id})">✕ Reject</button>
                                    </div>
                                ` : `<span style="font-size:12px; color:var(--text-muted); font-style:italic;">(${escapeHtmlV2(r.status)})</span>`}
                            </div>
                        </td>
                    </tr>
                `;
            }).join('');
        }
    } catch (err) {
        console.error('Error loading referrals V2:', err);
    }
}

// Override the refer action to open the inline modal instead of navigating away
window.referAppointmentV2 = function(appointmentId, patientId) {
    openReferralModalV2(patientId, appointmentId);
};

// select dropdown with a searchable input and filtered list
function ensureReferralModalExists() {
    if (document.getElementById('referralModalV2')) return;

    const modalHtml = `
        <div class="modal-backdrop" id="referralModalV2" style="display: none;">
            <div class="modal-card" style="max-width: 500px; width: 100%;">
                <div class="modal-header">
                    <div class="modal-title-wrap">
                        <span class="modal-badge-icon">↗️</span>
                        <div>
                            <h3>Refer Patient to Specialist</h3>
                            <span class="modal-sub-text">Search and select target provider or clinic</span>
                        </div>
                    </div>
                    <button type="button" class="btn-close-modal" id="closeReferralModalV2">✕</button>
                </div>
                <div class="modal-body">
                    <form id="referralFormV2">
                        <input type="hidden" id="refPatientIdV2">
                        <input type="hidden" id="refApptIdV2">
                        <input type="hidden" id="refTargetProviderIdV2" required>
                        
                        <div class="form-group" style="margin-bottom: 14px; position: relative;">
                            <label style="display:block; font-weight:600; font-size:13px; margin-bottom:6px;">Search Specialist / Clinic</label>
                            <input type="text" id="refDoctorSearchInputV2" placeholder="Type doctor or clinic name..." autocomplete="off" style="width:100%; padding:10px; border:1px solid #cbd5e1; border-radius:8px; font-size:14px; background:#fff;">
                            <div id="refDoctorDropdownResultsV2" style="position: absolute; top: 100%; left: 0; right: 0; background: #fff; border: 1px solid #cbd5e1; border-radius: 8px; max-height: 200px; overflow-y: auto; display: none; z-index: 1000; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1);"></div>
                        </div>

                        <div class="form-group" style="margin-bottom: 14px;">
                            <label for="refNotesInputV2" style="display:block; font-weight:600; font-size:13px; margin-bottom:6px;">Clinical Rationale / Notes</label>
                            <textarea id="refNotesInputV2" rows="3" placeholder="Specify symptoms requiring specialist attention..." style="width:100%; padding:10px; border:1px solid #cbd5e1; border-radius:8px; font-size:14px; font-family:inherit;"></textarea>
                        </div>

                        <div class="modal-alert-box" id="referralAlertBoxV2" style="display:none; padding:10px; border-radius:6px; font-size:12px; margin-bottom:12px;"></div>

                        <div class="modal-actions" style="display:flex; justify-content:flex-end; gap:8px;">
                            <button type="button" class="btn-cancel-modal" id="cancelReferralBtnV2" style="padding:8px 16px; background:#f1f5f9; border:1px solid #cbd5e1; border-radius:6px; cursor:pointer; font-weight:600;">Cancel</button>
                            <button type="submit" class="btn-confirm-admit" id="submitReferralBtnV2" style="padding:8px 16px; background:#0f172a; color:white; border:none; border-radius:6px; cursor:pointer; font-weight:600;">↗️ Submit Referral</button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    `;
    document.body.insertAdjacentHTML('beforeend', modalHtml);

    const modal = document.getElementById('referralModalV2');
    const closeBtn = document.getElementById('closeReferralModalV2');
    const cancelBtn = document.getElementById('cancelReferralBtnV2');
    const form = document.getElementById('referralFormV2');
    const searchInput = document.getElementById('refDoctorSearchInputV2');
    const resultsBox = document.getElementById('refDoctorDropdownResultsV2');

    let allProvidersList = [];

    const closeModal = () => {
        modal.style.display = 'none';
        resultsBox.style.display = 'none';
    };
    closeBtn.onclick = closeModal;
    cancelBtn.onclick = closeModal;

    searchInput.addEventListener('input', () => {
        const query = searchInput.value.toLowerCase().trim();
        if (!query) {
            resultsBox.style.display = 'none';
            return;
        }

        const filtered = allProvidersList.filter(p => p.name.toLowerCase().includes(query) || String(p.provider_id).includes(query));
        if (filtered.length === 0) {
            resultsBox.innerHTML = '<div style="padding: 10px; font-size: 13px; color: #64748b;">No specialists found</div>';
        } else {
            resultsBox.innerHTML = filtered.map(p => `
                <div class="doctor-search-item" data-id="${p.provider_id}" data-name="${escapeHtmlV2(p.name)}" style="padding: 10px 12px; font-size: 13px; cursor: pointer; border-bottom: 1px solid #f1f5f9;">
                    <strong>${escapeHtmlV2(p.name)}</strong> <span style="color: #64748b; font-size: 11px;">(ID: #${p.provider_id})</span>
                </div>
            `).join('');
        }
        resultsBox.style.display = 'block';
    });

    resultsBox.addEventListener('click', (e) => {
        const item = e.target.closest('.doctor-search-item');
        if (!item) return;
        document.getElementById('refTargetProviderIdV2').value = item.dataset.id;
        searchInput.value = item.dataset.name;
        resultsBox.style.display = 'none';
    });

    window._setAllReferralProvidersV2 = (list) => { allProvidersList = list; };

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const patientId = document.getElementById('refPatientIdV2').value;
        const apptId = document.getElementById('refApptIdV2').value;
        const targetId = document.getElementById('refTargetProviderIdV2').value;
        const notes = document.getElementById('refNotesInputV2').value;
        const sourceId = currentProviderReferralsV2 ? currentProviderReferralsV2.provider_id : 1;
        const alertBox = document.getElementById('referralAlertBoxV2');

        if (!targetId) {
            alertBox.className = 'modal-alert-box error';
            alertBox.textContent = 'Please select a valid specialist from the search results.';
            alertBox.style.display = 'block';
            return;
        }

        try {
            const res = await fetch(`http://localhost:3000/api/referrals-v2`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    patient_id: patientId,
                    source_provider_id: sourceId,
                    target_provider_id: targetId,
                    appointment_id: apptId,
                    notes: notes
                })
            });

            if (res.ok) {
                modal.style.display = 'none';
                if (typeof loadAppointmentsV2 === 'function') loadAppointmentsV2();
                loadReferralsV2();
            } else {
                const data = await res.json();
                alertBox.className = 'modal-alert-box error';
                alertBox.textContent = data.error || 'Failed to submit referral.';
                alertBox.style.display = 'block';
            }
        } catch (err) {
            console.error('Referral submission error:', err);
        }
    });
}

window.openReferralModalV2 = async function(patientId, appointmentId) {
    ensureReferralModalExists();
    const modal = document.getElementById('referralModalV2');
    document.getElementById('refPatientIdV2').value = patientId;
    document.getElementById('refApptIdV2').value = appointmentId || '';
    document.getElementById('refNotesInputV2').value = '';
    document.getElementById('refTargetProviderIdV2').value = '';
    document.getElementById('refDoctorSearchInputV2').value = '';
    document.getElementById('referralAlertBoxV2').style.display = 'none';

    const sourceId = currentProviderReferralsV2 ? currentProviderReferralsV2.provider_id : 1;

    try {
        const res = await fetch(`http://localhost:3000/api/providers-v2?exclude=${sourceId}`);
        const providers = await res.json();
        if (typeof window._setAllReferralProvidersV2 === 'function') {
            window._setAllReferralProvidersV2(providers || []);
        }
    } catch (e) {
        console.error('Error pre-loading providers list:', e);
    }

    modal.style.display = 'flex';
};

window.updateReferralStatusV2 = async function(referralId, status, targetProviderId) {
    if (!confirm(`Are you sure you want to mark this referral as ${status}?`)) return;
    try {
        const res = await fetch(`http://localhost:3000/api/referrals-v2/${referralId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status, target_provider_id: targetProviderId })
        });
        if (res.ok) {
            loadReferralsV2();
        } else {
            alert('Failed to update referral status.');
        }
    } catch (e) {
        console.error(e);
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