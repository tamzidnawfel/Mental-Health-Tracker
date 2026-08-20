document.addEventListener('DOMContentLoaded', () => {
    // DOM Elements - Queue
    const queueTableBody = document.getElementById('queueTableBody');
    const queueSearch = document.getElementById('queueSearch');
    const priorityFilter = document.getElementById('priorityFilter');
    const statusFilter = document.getElementById('statusFilter');
    const refreshBtn = document.getElementById('refreshBtn');

    // DOM Elements - Stats
    const statTotalWaitlist = document.getElementById('statTotalWaitlist');
    const statCriticalHigh = document.getElementById('statCriticalHigh');
    const statEscalated = document.getElementById('statEscalated');
    const statAssigned = document.getElementById('statAssigned');

    // DOM Elements - Edit Modal
    const updateModal = document.getElementById('updateModal');
    const editWaitlistId = document.getElementById('editWaitlistId');
    const editCrisisRange = document.getElementById('editCrisisRange');
    const editScoreDisplay = document.getElementById('editScoreDisplay');
    const editPriorityBadge = document.getElementById('editPriorityBadge');
    const saveUpdateBtn = document.getElementById('saveUpdateBtn');
    const cancelUpdateBtn = document.getElementById('cancelUpdateBtn');

    const toast = document.getElementById('toast');
    const API_BASE = 'http://localhost:3000/api';

    // In-memory data store
    let waitlistData = [];

    // Priority mapping algorithm based on self-reported crisis score (1 to 10)
    function computePriorityFromScore(score) {
        const num = parseInt(score, 10);
        if (num >= 9) {
            return { level: 'CRITICAL', label: 'Critical', class: 'critical' };
        } else if (num >= 7) {
            return { level: 'HIGH', label: 'High', class: 'high' };
        } else if (num >= 4) {
            return { level: 'MODERATE', label: 'Moderate', class: 'moderate' };
        } else {
            return { level: 'ROUTINE', label: 'Routine', class: 'routine' };
        }
    }

    // Update Crisis Range in Edit Modal
    function updateEditCrisisUI() {
        const score = parseInt(editCrisisRange.value, 10);
        editScoreDisplay.textContent = score;
        const priority = computePriorityFromScore(score);
        editPriorityBadge.className = `priority-tag ${priority.class}`;
        editPriorityBadge.textContent = priority.label;
    }

    editCrisisRange.addEventListener('input', updateEditCrisisUI);

    // Toast Notification
    function showToast(message) {
        toast.textContent = message;
        toast.classList.add('show');
        setTimeout(() => {
            toast.classList.remove('show');
        }, 3500);
    }

    // Derived Days Calculation
    function calculateDaysWaiting(requestDateStr) {
        if (!requestDateStr) return 0;
        const reqDate = new Date(requestDateStr);
        const today = new Date();
        const diffTime = today - reqDate;
        const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
        return Math.max(0, diffDays);
    }

    // Fetch Waitlist from Backend
    async function loadWaitlist() {
        queueTableBody.innerHTML = `
            <tr>
                <td colspan="9" class="empty-queue">
                    <div class="empty-queue-icon">⏳</div>
                    <p>Fetching waitlist records from database...</p>
                </td>
            </tr>
        `;

        try {
            const res = await fetch(`${API_BASE}/waitlist`);
            if (res.ok) {
                waitlistData = await res.json();
            } else {
                throw new Error('Server returned ' + res.status);
            }
        } catch (err) {
            console.warn('Backend server offline or empty, using seed dataset for interactive demonstration:', err);
            // Default seed data if database connection is offline or empty
            if (waitlistData.length === 0) {
                waitlistData = [
                    {
                        waitlist_id: 1,
                        patient_id: 1,
                        patient_name: 'Tamzid Nawfel',
                        patient_email: 'tamzid.nawfel08@gmail.com',
                        patient_phone: '01646743373',
                        spec_id: 1,
                        spec_name: 'Anxiety & Mood Disorders',
                        request_date: '2026-08-02', // 18 days ago (>14d threshold)
                        days_waiting: 18,
                        crisis_score: 5,
                        priority_level: 'MODERATE',
                        status: 'Active'
                    },
                    {
                        waitlist_id: 2,
                        patient_id: 3,
                        patient_name: 'Ashraful Islam',
                        patient_email: 'ashraful@gmail.com',
                        patient_phone: '01717324849',
                        spec_id: 3,
                        spec_name: 'Major Depressive Disorder',
                        request_date: '2026-08-16', // 4 days ago
                        days_waiting: 4,
                        crisis_score: 9,
                        priority_level: 'CRITICAL',
                        status: 'Active'
                    },
                    {
                        waitlist_id: 3,
                        patient_id: 2,
                        patient_name: 'Sanjid Hasnat',
                        patient_email: 'sanjid.hasnat@gmail.com',
                        patient_phone: '01646743374',
                        spec_id: 2,
                        spec_name: 'PTSD & Trauma Recovery',
                        request_date: '2026-08-09', // 11 days ago
                        days_waiting: 11,
                        crisis_score: 7,
                        priority_level: 'HIGH',
                        status: 'Active'
                    },
                    {
                        waitlist_id: 4,
                        patient_id: 4,
                        patient_name: 'Farhan Kabir',
                        patient_email: 'farhan.k@gmail.com',
                        patient_phone: '01711223344',
                        spec_id: 7,
                        spec_name: 'General Psychotherapy',
                        request_date: '2026-08-04', // 16 days ago (>14d threshold)
                        days_waiting: 16,
                        crisis_score: 2,
                        priority_level: 'ROUTINE',
                        status: 'Active'
                    }
                ];
            }
        }

        renderQueue();
        updateStats();
    }

    // Render Queue Table with Automated Priority & Escalation
    function renderQueue() {
        const searchTerm = queueSearch.value.toLowerCase().trim();
        const prioFilter = priorityFilter.value;
        const statFilt = statusFilter.value;

        // Process derived days and automatic safety threshold escalation (>14 days)
        const processedRows = waitlistData.map(item => {
            const days = item.days_waiting !== undefined && item.days_waiting !== null 
                ? parseInt(item.days_waiting, 10) 
                : calculateDaysWaiting(item.request_date);

            // Automated Escalation Rule:
            // If waiting time exceeds 14 days and status is Active, escalate priority!
            const exceedsThreshold = days >= 14 && item.status === 'Active';
            let effectivePriority = item.priority_level;
            let isEscalated = false;

            if (exceedsThreshold) {
                isEscalated = true;
                if (effectivePriority === 'ROUTINE') {
                    effectivePriority = 'MODERATE';
                } else if (effectivePriority === 'MODERATE') {
                    effectivePriority = 'HIGH';
                } else if (effectivePriority === 'HIGH') {
                    effectivePriority = 'CRITICAL';
                }
            }

            return {
                ...item,
                derived_days: days,
                exceedsThreshold,
                effectivePriority,
                isEscalated
            };
        });

        // Sort by Priority (CRITICAL > HIGH > MODERATE > ROUTINE) & Longest Waiting Time
        const priorityOrder = { 'CRITICAL': 1, 'HIGH': 2, 'MODERATE': 3, 'ROUTINE': 4 };
        processedRows.sort((a, b) => {
            const pA = priorityOrder[a.effectivePriority] || 5;
            const pB = priorityOrder[b.effectivePriority] || 5;
            if (pA !== pB) return pA - pB;
            return b.derived_days - a.derived_days;
        });

        // Filter Rows
        const filtered = processedRows.filter(row => {
            const patientName = (row.patient_name || `Patient #${row.patient_id}`).toLowerCase();
            const specName = (row.spec_name || `Specialization #${row.spec_id}`).toLowerCase();
            const idMatch = String(row.waitlist_id).includes(searchTerm) || String(row.patient_id).includes(searchTerm);
            const textMatch = !searchTerm || patientName.includes(searchTerm) || specName.includes(searchTerm) || idMatch;

            const prioMatch = prioFilter === 'ALL' || row.effectivePriority === prioFilter || row.priority_level === prioFilter;
            const statMatch = statFilt === 'ALL' || row.status === statFilt;

            return textMatch && prioMatch && statMatch;
        });

        if (filtered.length === 0) {
            queueTableBody.innerHTML = `
                <tr>
                    <td colspan="9" class="empty-queue">
                        <div class="empty-queue-icon">🔍</div>
                        <p>No waitlist records match your current search or filter criteria.</p>
                    </td>
                </tr>
            `;
            return;
        }

        queueTableBody.innerHTML = '';
        filtered.forEach(row => {
            const tr = document.createElement('tr');

            const pTagClass = row.effectivePriority.toLowerCase();
            const statusClass = row.status.toLowerCase();

            // Escalation Badge if threshold exceeded
            let escalationBadgeHtml = '';
            if (row.isEscalated) {
                escalationBadgeHtml = `
                    <div class="escalation-badge" title="Safety threshold reached (>14 days). Priority shifted ahead in queue.">
                        ⏳ Escalated (>14d wait)
                    </div>
                `;
            }

            const formattedReqDate = row.request_date 
                ? new Date(row.request_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) 
                : 'N/A';

            tr.innerHTML = `
                <td>
                    <span class="waitlist-id-badge">#${row.waitlist_id}</span>
                </td>
                <td>
                    <div class="patient-cell">
                        <span class="patient-name">${row.patient_name || 'Patient #' + row.patient_id}</span>
                        <span class="patient-sub">${row.patient_phone || row.patient_email || 'Patient ID: ' + row.patient_id}</span>
                    </div>
                </td>
                <td>
                    <strong>${row.spec_name || 'Specialization #' + row.spec_id}</strong>
                </td>
                <td>
                    ${formattedReqDate}
                </td>
                <td>
                    <div class="waiting-cell">
                        <span class="waiting-days-val">${row.derived_days} days</span>
                        ${escalationBadgeHtml}
                    </div>
                </td>
                <td>
                    <span class="score-pill">
                        ${row.crisis_score} <span class="score-max">/10</span>
                    </span>
                </td>
                <td>
                    <span class="priority-tag ${pTagClass}">
                        ${row.effectivePriority}
                    </span>
                </td>
                <td>
                    <span class="status-pill ${statusClass}">
                        ${row.status}
                    </span>
                </td>
                <td>
                    <div class="action-buttons">
                        <button class="btn-action edit-score-btn" data-id="${row.waitlist_id}" data-score="${row.crisis_score}" title="Update self-reported crisis assessment score">
                            ✏️ Edit Score
                        </button>
                        ${row.status === 'Active' ? `
                            <button class="btn-action btn-assign assign-btn" data-id="${row.waitlist_id}" title="Assign appointment slot">
                                ✓ Assign
                            </button>
                        ` : ''}
                    </div>
                </td>
            `;

            queueTableBody.appendChild(tr);
        });

        // Attach event listeners to action buttons
        document.querySelectorAll('.edit-score-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const id = e.currentTarget.getAttribute('data-id');
                const score = e.currentTarget.getAttribute('data-score');
                openUpdateModal(id, score);
            });
        });

        document.querySelectorAll('.assign-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const id = e.currentTarget.getAttribute('data-id');
                markAssigned(id);
            });
        });
    }

    // Update Summary Stats
    function updateStats() {
        const total = waitlistData.length;
        let criticalHigh = 0;
        let escalated = 0;
        let assigned = 0;

        waitlistData.forEach(item => {
            const days = item.days_waiting !== undefined && item.days_waiting !== null 
                ? parseInt(item.days_waiting, 10) 
                : calculateDaysWaiting(item.request_date);

            if (item.status === 'Active' && days >= 14) {
                escalated++;
            }

            if (item.priority_level === 'CRITICAL' || item.priority_level === 'HIGH' || (days >= 14 && item.status === 'Active')) {
                criticalHigh++;
            }

            if (item.status === 'Assigned') {
                assigned++;
            }
        });

        statTotalWaitlist.textContent = total;
        statCriticalHigh.textContent = criticalHigh;
        statEscalated.textContent = escalated;
        statAssigned.textContent = assigned;
    }

    // Open Edit Score Modal
    function openUpdateModal(waitlistId, currentScore) {
        editWaitlistId.value = waitlistId;
        editCrisisRange.value = currentScore || 5;
        updateEditCrisisUI();
        updateModal.classList.add('active');
    }

    // Save Updated Crisis Score & Escalate Priority
    saveUpdateBtn.addEventListener('click', async () => {
        const id = parseInt(editWaitlistId.value, 10);
        const newScore = parseInt(editCrisisRange.value, 10);
        const newPriority = computePriorityFromScore(newScore).level;

        saveUpdateBtn.disabled = true;
        saveUpdateBtn.textContent = 'Saving...';

        try {
            const res = await fetch(`${API_BASE}/waitlist/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ crisis_score: newScore })
            });

            if (!res.ok) throw new Error('Update failed');
        } catch (e) {
            console.warn('Backend API update unreachable, updating local state:', e);
        }

        // Update entry in local dataset
        const entry = waitlistData.find(w => w.waitlist_id === id);
        if (entry) {
            entry.crisis_score = newScore;
            entry.priority_level = newPriority;
        }

        updateModal.classList.remove('active');
        saveUpdateBtn.disabled = false;
        saveUpdateBtn.textContent = 'Save & Recalculate';

        renderQueue();
        updateStats();
        showToast(`Waitlist #${id} crisis score updated to ${newScore}/10 — Priority set to ${newPriority}!`);
    });

    cancelUpdateBtn.addEventListener('click', () => {
        updateModal.classList.remove('active');
    });

    // Mark as Assigned Slot
    async function markAssigned(waitlistId) {
        const id = parseInt(waitlistId, 10);
        try {
            await fetch(`${API_BASE}/waitlist/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: 'Assigned' })
            });
        } catch (e) {
            console.warn('Backend update unreachable, updating locally');
        }

        const entry = waitlistData.find(w => w.waitlist_id === id);
        if (entry) {
            entry.status = 'Assigned';
        }

        renderQueue();
        updateStats();
        showToast(`Waitlist #${id} marked as Assigned to Provider!`);
    }

    // Filter & Search Event Listeners
    queueSearch.addEventListener('input', renderQueue);
    priorityFilter.addEventListener('change', renderQueue);
    statusFilter.addEventListener('change', renderQueue);
    refreshBtn.addEventListener('click', () => {
        loadWaitlist();
        showToast('Waitlist queue refreshed!');
    });

    // Initial Load
    loadWaitlist();
});
