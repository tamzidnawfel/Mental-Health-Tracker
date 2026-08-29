document.addEventListener('DOMContentLoaded', async () => {
    const provider = getProvider();
    document.getElementById('providerName').textContent = provider.name || 'Provider Workspace';
    const body = document.getElementById('cancelledBody');
    try {
        const [response, regionsResponse] = await Promise.all([
            fetch(`http://localhost:3000/api/provider/${provider.provider_id}/cancelled-patients`),
            fetch('http://localhost:3000/api/regions')
        ]);
        if (!response.ok || !regionsResponse.ok) throw new Error('Could not load cancellations');
        const data = await response.json();
        const regions = await regionsResponse.json();
        document.getElementById('cancelledCount').textContent = data.patients.length;
        const districtSelect = document.getElementById('cancelledDistrict');
        regions.forEach(region => districtSelect.insertAdjacentHTML('beforeend', `<option value="${escapeHtml(region.district_name)}">${escapeHtml(region.district_name)}</option>`));
        const render = () => {
            const selectedDistrict = districtSelect.value;
            const sort = document.getElementById('cancelledSort').value;
            const patients = data.patients.filter(patient => selectedDistrict === 'all' || patient.district_name === selectedDistrict).sort((first, second) => sort === 'district'
                ? first.district_name.localeCompare(second.district_name) || first.patient_name.localeCompare(second.patient_name)
                : String(second.appointment_date).localeCompare(String(first.appointment_date)));
            document.getElementById('cancelledCount').textContent = patients.length;
            renderPatients(body, patients);
        };
        districtSelect.addEventListener('change', render);
        document.getElementById('cancelledSort').addEventListener('change', render);
        if (!data.patients.length) {
            body.innerHTML = '<tr><td colspan="7" class="empty-td"><div class="empty-icon">✓</div><strong>No patient recorded</strong><p>No cancelled patient is recorded for this provider.</p></td></tr>';
            return;
        }
        render();
    } catch (error) {
        body.innerHTML = '<tr><td colspan="6" class="empty-td"><div class="empty-icon">!</div><strong>Unable to load cancellations</strong><p>Check that the backend server is running and try again.</p></td></tr>';
    }
});
function renderPatients(body, patients) {
    if (!patients.length) {
        body.innerHTML = '<tr><td colspan="7" class="empty-td">No patient recorded</td></tr>';
        return;
    }
    body.innerHTML = patients.map(patient => `<tr><td><strong>${escapeHtml(patient.patient_name)}</strong><small>Patient #${patient.patient_id}</small></td><td>${escapeHtml(patient.district_name)}</td><td>${patient.appointment_date || 'Not recorded'}</td><td>${patient.cancellation_date || 'Not recorded'}</td><td>${patient.cancellation_reason || 'Not recorded'}</td><td><strong>${escapeHtml(patient.provider_name)}</strong><small>Session fee: ${formatFee(patient.session_fee)}</small></td><td><span class="status-pill cancelled">${escapeHtml(patient.status)}</span></td></tr>`).join('');
}
function getProvider() { try { return JSON.parse(sessionStorage.getItem('currentProvider') || localStorage.getItem('currentProvider')) || { provider_id: 1, name: 'Dr. Sarah Smith' }; } catch { return { provider_id: 1, name: 'Dr. Sarah Smith' }; } }
function formatFee(value) { return value === null || value === undefined ? 'Not recorded' : `৳ ${Number(value).toLocaleString()}`; }
function escapeHtml(value) { return String(value ?? '').replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[character])); }
