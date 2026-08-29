/**
 * MindCare - Zone Detections & Subzone Analytics JS
 */
document.addEventListener('DOMContentLoaded', () => {
    // DOM Elements
    const zoneTableBody = document.getElementById('zoneTableBody');
    const zoneTableHead = document.getElementById('zoneTableHead');
    const flagFilter = document.getElementById('flagFilter');
    const sortBy = document.getElementById('sortBy');
    const refreshBtn = document.getElementById('refreshBtn');

    const viewDistrictBtn = document.getElementById('viewDistrictBtn');
    const viewSubzoneBtn = document.getElementById('viewSubzoneBtn');
    const districtFilterWrap = document.getElementById('districtFilterWrap');
    const districtSelect = document.getElementById('districtSelect');

    const statRedZones = document.getElementById('statRedZones');
    const statYellowZones = document.getElementById('statYellowZones');
    const statGreenZones = document.getElementById('statGreenZones');

    const labelRedZones = document.getElementById('labelRedZones');
    const labelYellowZones = document.getElementById('labelYellowZones');
    const labelGreenZones = document.getElementById('labelGreenZones');

    const panelTitle = document.getElementById('panelTitle');
    const panelSubtitle = document.getElementById('panelSubtitle');
    const benchmarkRed = document.getElementById('benchmarkRed');
    const benchmarkYellow = document.getElementById('benchmarkYellow');
    const benchmarkGreen = document.getElementById('benchmarkGreen');

    const API_BASE = 'http://localhost:3000/api';

    // State
    let currentView = 'district'; // 'district' or 'subzone'
    let districtData = [];
    let subzoneData = [];

    // Format numbers with commas
    function formatNumber(num) {
        if (num === null || num === undefined) return '0';
        return Number(num).toLocaleString('en-US');
    }

    // 1. Fetch District-Level Zone Detections
    async function loadDistrictDetections() {
        zoneTableBody.innerHTML = `
            <tr>
                <td colspan="5" class="empty-state">
                    <div class="empty-icon">⏳</div>
                    <p>Fetching regional demographics and provider ratio analysis from database...</p>
                </td>
            </tr>
        `;

        try {
            const res = await fetch(`${API_BASE}/zone-detections`);
            if (res.ok) {
                const data = await res.json();
                districtData = data.zones || data || [];
            } else {
                throw new Error('Server returned status ' + res.status);
            }
        } catch (err) {
            console.warn('Backend offline or query error, using seed district data:', err);
            districtData = [
                { district_id: 1, district_name: 'Dhaka Central', population: 15000000, total_providers: 12, population_per_provider: 1250000, zone_flag: 'RED' },
                { district_id: 4, district_name: 'Rajshahi', population: 3000000, total_providers: 5, population_per_provider: 600000, zone_flag: 'RED' },
                { district_id: 5, district_name: 'Khulna', population: 2800000, total_providers: 4, population_per_provider: 700000, zone_flag: 'RED' },
                { district_id: 2, district_name: 'Chittagong Metropolitan', population: 5000000, total_providers: 11, population_per_provider: 454545, zone_flag: 'YELLOW' },
                { district_id: 7, district_name: 'Rangpur', population: 2200000, total_providers: 5, population_per_provider: 440000, zone_flag: 'YELLOW' },
                { district_id: 3, district_name: 'Sylhet Sadar', population: 2500000, total_providers: 8, population_per_provider: 312500, zone_flag: 'YELLOW' },
                { district_id: 6, district_name: 'Barisal', population: 2000000, total_providers: 7, population_per_provider: 285714, zone_flag: 'YELLOW' }
            ];
        }

        renderCurrentView();
    }

    // 2. Fetch Subdistrict Subzones Data
    async function loadSubzoneDetections() {
        zoneTableBody.innerHTML = `
            <tr>
                <td colspan="6" class="empty-state">
                    <div class="empty-icon">⏳</div>
                    <p>Fetching subdistrict demographics and provider ratio analysis from database...</p>
                </td>
            </tr>
        `;

        try {
            const res = await fetch(`${API_BASE}/subzone-detections`);
            if (res.ok) {
                const data = await res.json();
                subzoneData = data.subzones || data || [];
            } else {
                throw new Error('Server returned status ' + res.status);
            }
        } catch (err) {
            console.warn('Backend offline or query error, using seed subdistrict data:', err);
            // Fallback seed subdistricts
            subzoneData = [
                { subregion_id: 1, subdistrict_name: 'Mirpur', district_id: 1, district_name: 'Dhaka', population: 546026, total_providers: 12, population_per_provider: 45502, zone_flag: 'GREEN' },
                { subregion_id: 2, subdistrict_name: 'Mohammadpur', district_id: 1, district_name: 'Dhaka', population: 527560, total_providers: 1, population_per_provider: 527560, zone_flag: 'RED' },
                { subregion_id: 3, subdistrict_name: 'Uttara', district_id: 1, district_name: 'Dhaka', population: 180510, total_providers: 0, population_per_provider: 180510, zone_flag: 'RED' },
                { subregion_id: 4, subdistrict_name: 'Demra', district_id: 1, district_name: 'Dhaka', population: 278830, total_providers: 0, population_per_provider: 278830, zone_flag: 'RED' },
                { subregion_id: 5, subdistrict_name: 'Kamrangirchar', district_id: 1, district_name: 'Dhaka', population: 372287, total_providers: 0, population_per_provider: 372287, zone_flag: 'RED' }
            ];
        }

        renderCurrentView();
    }

    // 3. Render Current View
    function renderCurrentView() {
        if (currentView === 'district') {
            renderDistrictTable();
            updateDistrictStats();
        } else {
            renderSubzoneTable();
            updateSubzoneStats();
        }
    }

    // Render District Table
    function renderDistrictTable() {
        // Update Table Headings
        zoneTableHead.innerHTML = `
            <tr>
                <th>District Name</th>
                <th>Population</th>
                <th>Active Providers</th>
                <th>Population : Provider Ratio</th>
                <th>Flag</th>
            </tr>
        `;

        const filterVal = flagFilter.value;
        const sortVal = sortBy.value;

        let filtered = districtData.filter(item => {
            if (filterVal === 'ALL') return true;
            return (item.zone_flag || '').toUpperCase() === filterVal.toUpperCase();
        });

        filtered.sort((a, b) => {
            const ratioA = parseInt(a.population_per_provider || 0, 10);
            const ratioB = parseInt(b.population_per_provider || 0, 10);
            return sortVal === 'ratio_desc' ? ratioB - ratioA : ratioA - ratioB;
        });

        if (filtered.length === 0) {
            zoneTableBody.innerHTML = `
                <tr>
                    <td colspan="5" class="empty-state">
                        <div class="empty-icon">🔍</div>
                        <p>No districts found matching the selected zone filter.</p>
                    </td>
                </tr>
            `;
            return;
        }

        zoneTableBody.innerHTML = '';
        filtered.forEach(row => {
            const tr = document.createElement('tr');
            const flag = (row.zone_flag || 'GREEN').toUpperCase();
            let flagBadgeHtml = '';
            if (flag === 'RED') {
                flagBadgeHtml = `<span class="zone-flag-badge red">🔴 Red Zone</span>`;
            } else if (flag === 'YELLOW') {
                flagBadgeHtml = `<span class="zone-flag-badge yellow">🟡 Yellow Zone</span>`;
            } else {
                flagBadgeHtml = `<span class="zone-flag-badge green">🟢 Green Zone</span>`;
            }

            tr.innerHTML = `
                <td>
                    <span class="district-name">${row.district_name}</span>
                </td>
                <td>
                    <span class="population-text">${formatNumber(row.population)}</span>
                </td>
                <td>
                    <span class="provider-count-pill">${formatNumber(row.total_providers)} Providers</span>
                </td>
                <td>
                    <div class="ratio-highlight">
                        <span>1 : ${formatNumber(row.population_per_provider)}</span>
                    </div>
                </td>
                <td>
                    ${flagBadgeHtml}
                </td>
            `;
            zoneTableBody.appendChild(tr);
        });
    }

    // Render Subzone Table
    function renderSubzoneTable() {
        // Update Table Headings
        zoneTableHead.innerHTML = `
            <tr>
                <th>Subdistrict Name</th>
                <th>District</th>
                <th>Population</th>
                <th>Active Providers</th>
                <th>Population : Provider Ratio</th>
                <th>Flag</th>
            </tr>
        `;

        const filterVal = flagFilter.value;
        const sortVal = sortBy.value;
        const selectedDistrictVal = districtSelect ? districtSelect.value : 'ALL';

        let filtered = subzoneData.filter(item => {
            // Filter by District if selected
            if (selectedDistrictVal !== 'ALL' && String(item.district_id) !== String(selectedDistrictVal)) {
                return false;
            }
            // Filter by Zone Flag
            if (filterVal === 'ALL') return true;
            return (item.zone_flag || '').toUpperCase() === filterVal.toUpperCase();
        });

        filtered.sort((a, b) => {
            const ratioA = parseInt(a.population_per_provider || 0, 10);
            const ratioB = parseInt(b.population_per_provider || 0, 10);
            return sortVal === 'ratio_desc' ? ratioB - ratioA : ratioA - ratioB;
        });

        if (filtered.length === 0) {
            zoneTableBody.innerHTML = `
                <tr>
                    <td colspan="6" class="empty-state">
                        <div class="empty-icon">🔍</div>
                        <p>No subdistricts found matching the selected filters.</p>
                    </td>
                </tr>
            `;
            return;
        }

        zoneTableBody.innerHTML = '';
        filtered.forEach(row => {
            const tr = document.createElement('tr');
            const flag = (row.zone_flag || 'GREEN').toUpperCase();
            let flagBadgeHtml = '';
            if (flag === 'RED') {
                flagBadgeHtml = `<span class="zone-flag-badge red">🔴 Red Zone</span>`;
            } else if (flag === 'YELLOW') {
                flagBadgeHtml = `<span class="zone-flag-badge yellow">🟡 Yellow Zone</span>`;
            } else {
                flagBadgeHtml = `<span class="zone-flag-badge green">🟢 Green Zone</span>`;
            }

            const providersCount = parseInt(row.total_providers || 0, 10);
            const ratioDisplay = providersCount === 0 
                ? `1 : ${formatNumber(row.population_per_provider)} <small style="color:var(--text-muted); font-size:11px;">(0 Providers)</small>`
                : `1 : ${formatNumber(row.population_per_provider)}`;

            tr.innerHTML = `
                <td>
                    <span class="district-name">${row.subdistrict_name}</span>
                </td>
                <td>
                    <span class="district-badge">📍 ${row.district_name}</span>
                </td>
                <td>
                    <span class="population-text">${formatNumber(row.population)}</span>
                </td>
                <td>
                    <span class="provider-count-pill ${providersCount === 0 ? 'empty-pill' : ''}">${formatNumber(providersCount)} Providers</span>
                </td>
                <td>
                    <div class="ratio-highlight">
                        <span>${ratioDisplay}</span>
                    </div>
                </td>
                <td>
                    ${flagBadgeHtml}
                </td>
            `;
            zoneTableBody.appendChild(tr);
        });
    }

    // Update Summary Stats for District View
    function updateDistrictStats() {
        let redCount = 0;
        let yellowCount = 0;
        let greenCount = 0;

        districtData.forEach(item => {
            const flag = (item.zone_flag || 'GREEN').toUpperCase();
            if (flag === 'RED') redCount++;
            else if (flag === 'YELLOW') yellowCount++;
            else if (flag === 'GREEN') greenCount++;
        });

        if (statRedZones) statRedZones.textContent = redCount;
        if (statYellowZones) statYellowZones.textContent = yellowCount;
        if (statGreenZones) statGreenZones.textContent = greenCount;

        if (labelRedZones) labelRedZones.textContent = 'Critical Red Districts';
        if (labelYellowZones) labelYellowZones.textContent = 'Moderate Yellow Districts';
        if (labelGreenZones) labelGreenZones.textContent = 'Adequate Green Districts';
    }

    // Update Summary Stats for Subzone View
    function updateSubzoneStats() {
        const selectedDistrictVal = districtSelect ? districtSelect.value : 'ALL';
        
        let redCount = 0;
        let yellowCount = 0;
        let greenCount = 0;

        subzoneData.forEach(item => {
            if (selectedDistrictVal !== 'ALL' && String(item.district_id) !== String(selectedDistrictVal)) {
                return;
            }
            const flag = (item.zone_flag || 'GREEN').toUpperCase();
            if (flag === 'RED') redCount++;
            else if (flag === 'YELLOW') yellowCount++;
            else if (flag === 'GREEN') greenCount++;
        });

        if (statRedZones) statRedZones.textContent = redCount;
        if (statYellowZones) statYellowZones.textContent = yellowCount;
        if (statGreenZones) statGreenZones.textContent = greenCount;

        if (labelRedZones) labelRedZones.textContent = 'Critical Red Subzones';
        if (labelYellowZones) labelYellowZones.textContent = 'Moderate Yellow Subzones';
        if (labelGreenZones) labelGreenZones.textContent = 'Adequate Green Subzones';
    }

    // Switch to District View
    function switchToDistrictView() {
        currentView = 'district';
        viewDistrictBtn.classList.add('active');
        viewSubzoneBtn.classList.remove('active');

        if (districtFilterWrap) districtFilterWrap.style.display = 'none';

        if (panelTitle) {
            panelTitle.innerHTML = '<span>📊</span> Regional Provider-to-Population Ratio Analysis';
        }
        if (panelSubtitle) {
            panelSubtitle.textContent = 'Evaluating regional provider ratios and district populations across Bangladesh.';
        }

        // District Legend
        if (benchmarkRed) {
            benchmarkRed.innerHTML = `
                <span class="benchmark-dot red"></span>
                <span><strong>Red Zone:</strong> Critical shortage (Ratio &gt; 1:500,000 residents per provider or 0 providers).</span>
            `;
        }
        if (benchmarkYellow) {
            benchmarkYellow.innerHTML = `
                <span class="benchmark-dot yellow"></span>
                <span><strong>Yellow Zone:</strong> Moderate shortage (Ratio 1:250,000 &ndash; 1:500,000 residents per provider).</span>
            `;
        }
        if (benchmarkGreen) {
            benchmarkGreen.innerHTML = `
                <span class="benchmark-dot green"></span>
                <span><strong>Green Zone:</strong> Adequate coverage (&le; 1:250,000 residents per provider).</span>
            `;
        }

        if (districtData.length === 0) {
            loadDistrictDetections();
        } else {
            renderCurrentView();
        }
    }

    // Switch to Subzone View
    function switchToSubzoneView() {
        currentView = 'subzone';
        viewSubzoneBtn.classList.add('active');
        viewDistrictBtn.classList.remove('active');

        if (districtFilterWrap) districtFilterWrap.style.display = 'inline-flex';

        if (panelTitle) {
            panelTitle.innerHTML = '<span>📍</span> Subdistrict / Subzone Shortage Detection Analysis';
        }
        if (panelSubtitle) {
            panelSubtitle.textContent = 'Evaluating localized subzone demographic ratios per district (5 detected subzones per district).';
        }

        // Subzone Legend with user's specific ratio thresholds:
        // Green: <= 1:50,000
        // Yellow: 1:50,000 - 1:75,000
        // Red: > 1:75,000
        if (benchmarkRed) {
            benchmarkRed.innerHTML = `
                <span class="benchmark-dot red"></span>
                <span><strong>Red Zone:</strong> Critical subzone shortage (Ratio &gt; 1:75,000 residents per provider or 0 providers).</span>
            `;
        }
        if (benchmarkYellow) {
            benchmarkYellow.innerHTML = `
                <span class="benchmark-dot yellow"></span>
                <span><strong>Yellow Zone:</strong> Moderate subzone shortage (Ratio 1:50,000 &ndash; 1:75,000 residents per provider).</span>
            `;
        }
        if (benchmarkGreen) {
            benchmarkGreen.innerHTML = `
                <span class="benchmark-dot green"></span>
                <span><strong>Green Zone:</strong> Adequate subzone coverage (&le; 1:50,000 residents per provider).</span>
            `;
        }

        if (subzoneData.length === 0) {
            loadSubzoneDetections();
        } else {
            renderCurrentView();
        }
    }

    // Event Listeners
    if (viewDistrictBtn) viewDistrictBtn.addEventListener('click', switchToDistrictView);
    if (viewSubzoneBtn) viewSubzoneBtn.addEventListener('click', switchToSubzoneView);

    if (districtSelect) {
        districtSelect.addEventListener('change', () => {
            renderCurrentView();
        });
    }

    flagFilter.addEventListener('change', renderCurrentView);
    sortBy.addEventListener('change', renderCurrentView);
    refreshBtn.addEventListener('click', () => {
        if (currentView === 'district') {
            loadDistrictDetections();
        } else {
            loadSubzoneDetections();
        }
    });

    // Initial Load (District View)
    loadDistrictDetections();
});

