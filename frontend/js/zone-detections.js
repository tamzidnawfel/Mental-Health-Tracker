document.addEventListener('DOMContentLoaded', () => {
    const zoneTableBody = document.getElementById('zoneTableBody');
    const flagFilter = document.getElementById('flagFilter');
    const sortBy = document.getElementById('sortBy');
    const refreshBtn = document.getElementById('refreshBtn');

    const statRedZones = document.getElementById('statRedZones');
    const statYellowZones = document.getElementById('statYellowZones');
    const statGreenZones = document.getElementById('statGreenZones');

    const API_BASE = 'http://localhost:3000/api';
    let zonesData = [];

    // Format numbers with commas
    function formatNumber(num) {
        if (num === null || num === undefined) return '0';
        return Number(num).toLocaleString('en-US');
    }

    // Fetch Zone Detections Data
    async function loadZoneDetections() {
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
                zonesData = data.zones || data || [];
            } else {
                throw new Error('Server returned status ' + res.status);
            }
        } catch (err) {
            console.warn('Backend server offline or unreachable, using database seed calculations:', err);
            // Default calculated dataset based on mental_health_tracker.sql
            zonesData = [
                {
                    district_id: 1,
                    district_name: 'Dhaka Central',
                    population: 15000000,
                    total_providers: 12,
                    population_per_provider: 1250000,
                    zone_flag: 'RED'
                },
                {
                    district_id: 4,
                    district_name: 'Rajshahi',
                    population: 3000000,
                    total_providers: 5,
                    population_per_provider: 600000,
                    zone_flag: 'RED'
                },
                {
                    district_id: 5,
                    district_name: 'Khulna',
                    population: 2800000,
                    total_providers: 4,
                    population_per_provider: 700000,
                    zone_flag: 'RED'
                },
                {
                    district_id: 2,
                    district_name: 'Chittagong Metropolitan',
                    population: 5000000,
                    total_providers: 11,
                    population_per_provider: 454545,
                    zone_flag: 'YELLOW'
                },
                {
                    district_id: 7,
                    district_name: 'Rangpur',
                    population: 2200000,
                    total_providers: 5,
                    population_per_provider: 440000,
                    zone_flag: 'YELLOW'
                },
                {
                    district_id: 3,
                    district_name: 'Sylhet Sadar',
                    population: 2500000,
                    total_providers: 8,
                    population_per_provider: 312500,
                    zone_flag: 'YELLOW'
                },
                {
                    district_id: 6,
                    district_name: 'Barisal',
                    population: 2000000,
                    total_providers: 7,
                    population_per_provider: 285714,
                    zone_flag: 'YELLOW'
                }
            ];
        }

        renderZones();
        updateStats();
    }

    // Render Table
    function renderZones() {
        const filterVal = flagFilter.value;
        const sortVal = sortBy.value;

        // Filter by Zone Flag
        let filtered = zonesData.filter(item => {
            if (filterVal === 'ALL') return true;
            return (item.zone_flag || '').toUpperCase() === filterVal.toUpperCase();
        });

        // Sort by Shortage Ratio
        filtered.sort((a, b) => {
            const ratioA = parseInt(a.population_per_provider || 0, 10);
            const ratioB = parseInt(b.population_per_provider || 0, 10);

            if (sortVal === 'ratio_desc') {
                return ratioB - ratioA;
            } else if (sortVal === 'ratio_asc') {
                return ratioA - ratioB;
            }
            return 0;
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

            const ratioText = `1 : ${formatNumber(row.population_per_provider)}`;

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
                        <span>${ratioText}</span>
                    </div>
                </td>
                <td>
                    ${flagBadgeHtml}
                </td>
            `;

            zoneTableBody.appendChild(tr);
        });
    }

    // Update Summary Stats
    function updateStats() {
        let redCount = 0;
        let yellowCount = 0;
        let greenCount = 0;

        zonesData.forEach(item => {
            const flag = (item.zone_flag || 'GREEN').toUpperCase();
            if (flag === 'RED') redCount++;
            else if (flag === 'YELLOW') yellowCount++;
            else if (flag === 'GREEN') greenCount++;
        });

        if (statRedZones) statRedZones.textContent = redCount;
        if (statYellowZones) statYellowZones.textContent = yellowCount;
        if (statGreenZones) statGreenZones.textContent = greenCount;
    }

    // Event Listeners
    flagFilter.addEventListener('change', renderZones);
    sortBy.addEventListener('change', renderZones);
    refreshBtn.addEventListener('click', loadZoneDetections);

    // Initial Load
    loadZoneDetections();
});
