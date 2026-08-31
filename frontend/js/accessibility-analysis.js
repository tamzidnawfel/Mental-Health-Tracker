document.addEventListener('DOMContentLoaded', loadAnalysis);

async function loadAnalysis() {
    const patient = getPatient();
    if (!patient || !patient.patient_id) {
        document.getElementById('analysisBody').innerHTML = '<tr><td colspan="8" class="empty-td"><div class="empty-icon">!</div><strong>Please log in</strong><p>Sign in as a patient to view your district accessibility analysis.</p></td></tr>';
        return;
    }

    try {
        const [response, regionsResponse] = await Promise.all([
            fetch(`http://localhost:3000/api/patient-home/accessibility-analysis?patient_id=${patient.patient_id}`),
            fetch('http://localhost:3000/api/regions')
        ]);
        if (!response.ok || !regionsResponse.ok) throw new Error('Could not load accessibility analysis');
        const data = await response.json();
        const regions = await regionsResponse.json();
        document.getElementById('thresholdKm').textContent = data.config.distanceBarrierKm;
        const districtSelect = document.getElementById('analysisDistrict');
        regions.forEach(region => districtSelect.insertAdjacentHTML('beforeend', `<option value="${escapeHtml(region.district_name)}">${escapeHtml(region.district_name)}</option>`));
        const render = () => {
            const selectedDistrict = districtSelect.value;
            const sort = document.getElementById('analysisSort').value;
            const patients = data.patients.filter(patient => selectedDistrict === 'all' || patient.district_name === selectedDistrict).sort((first, second) => sort === 'district'
                ? first.district_name.localeCompare(second.district_name) || first.patient_name.localeCompare(second.patient_name)
                : sort === 'patient' ? first.patient_name.localeCompare(second.patient_name) : second.severity - first.severity || first.patient_name.localeCompare(second.patient_name));
            renderAnalysisView(patients);
        };
        districtSelect.addEventListener('change', render);
        document.getElementById('analysisSort').addEventListener('change', render);
        render();
    } catch (error) {
        document.getElementById('analysisBody').innerHTML = '<tr><td colspan="8" class="empty-td"><div class="empty-icon">!</div><strong>Unable to load accessibility analysis</strong><p>Check that the backend server is running and try again.</p></td></tr>';
    }
}
function renderAnalysisView(patients) {
    const uniquePatientIds = new Set(patients.map(patient => patient.patient_id));
    const financialBarriers = new Set(patients.filter(patient => ['High Financial Barrier', 'Moderate Financial Barrier'].includes(patient.financial_barrier)).map(patient => patient.patient_id));
    const distanceBarriers = patients.filter(patient => patient.distance_barrier === true);
    const summary = {
        total_patients: uniquePatientIds.size,
        financial_barriers: financialBarriers.size,
        distance_barriers: distanceBarriers.length,
        both_barriers: patients.filter(patient => patient.distance_barrier === true && ['High Financial Barrier', 'Moderate Financial Barrier'].includes(patient.financial_barrier)).length
    };
    const incomeBrackets = ['10–30k', '30–50k', '50k+'];
    const uniquePatientsByIncomeBracket = new Map();
    patients.forEach(patient => {
        if (patient.patient_id === null || patient.patient_id === undefined) return;
        if (!uniquePatientsByIncomeBracket.has(patient.patient_id)) {
            uniquePatientsByIncomeBracket.set(patient.patient_id, patient.income_bracket);
        }
    });
    const incomeChart = incomeBrackets.map(bracket => ({
        bracket,
        count: [...uniquePatientsByIncomeBracket.values()].filter(value => value === bracket).length
    }));
    const classifications = [...new Set(patients.map(patient => patient.overall_classification))].map(classification => ({ classification, count: patients.filter(patient => patient.overall_classification === classification).length }));
    renderSummary(summary);
    renderChart('incomeChart', incomeChart.map(item => ({ label: item.bracket, count: item.count })));
    renderChart('distanceChart', [{ label: 'Distance Barrier', count: distanceBarriers.length }, { label: 'No Distance Barrier', count: patients.filter(patient => patient.distance_barrier === false).length }]);
    renderChart('classificationChart', classifications);
    renderTable(patients);
}
function renderSummary(summary) {
    const cards = [['Total patients', summary.total_patients, 'blue-bg'], ['Financial barriers', summary.financial_barriers, 'amber-bg'], ['Distance barriers', summary.distance_barriers, 'red-bg'], ['Both barriers', summary.both_barriers, 'purple-bg']];
    document.getElementById('summaryCards').innerHTML = cards.map(card => `<div class="metric-card"><div class="metric-icon-wrap ${card[2]}">●</div><div class="metric-info"><span class="metric-label">${card[0]}</span><div class="metric-val">${card[1]}</div></div></div>`).join('');
}
function renderChart(elementId, items) {
    const max = Math.max(1, ...items.map(item => item.count));
    document.getElementById(elementId).innerHTML = items.length ? items.map(item => `<div class="bar-row"><span class="bar-label">${escapeHtml(item.label || item.classification)}</span><div class="bar-track"><div class="bar-fill" style="width:${Math.round(item.count / max * 100)}%"></div></div><strong>${item.count}</strong></div>`).join('') : '<p class="muted-text">No records available.</p>';
}
function renderTable(patients) {
    const body = document.getElementById('analysisBody');
    if (!patients.length) { body.innerHTML = '<tr><td colspan="9" class="empty-td"><strong>No patient recorded</strong><p>No patient is recorded for the selected district.</p></td></tr>'; return; }
    body.innerHTML = patients.map(patient => `<tr><td><strong>#${escapeHtml(patient.appointment_id ?? patient.patient_id)}</strong><small>Appointment</small></td><td><strong>${escapeHtml(patient.patient_name)}</strong><small>Patient #${patient.patient_id}</small></td><td>${escapeHtml(patient.district_name)}</td><td>${escapeHtml(patient.income_bracket)}</td><td>${escapeHtml(patient.provider_name)}</td><td>${patient.distance_km === null ? 'Unavailable' : `${patient.distance_km.toFixed(2)} km`}</td><td><span class="boolean-pill ${patient.distance_barrier === true ? 'yes' : 'no'}">${patient.distance_barrier === null ? 'Unavailable' : patient.distance_barrier ? 'YES' : 'NO'}</span></td><td>${escapeHtml(patient.financial_barrier)}</td><td><span class="classification-pill">${escapeHtml(patient.overall_classification)}</span></td></tr>`).join('');
}
function getPatient() {
    try {
        return JSON.parse(sessionStorage.getItem('currentPatient') || localStorage.getItem('currentPatient')) || null;
    } catch {
        return null;
    }
}
function escapeHtml(value) { return String(value ?? '').replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[character])); }
