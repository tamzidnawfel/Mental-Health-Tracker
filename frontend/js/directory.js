/**
 * MindCare - Provider Directory & Best-Fit Matching JavaScript
 */

document.addEventListener('DOMContentLoaded', () => {
    // 1. Initialize Patient Session
    initPatientSession();

    // 2. Initialize Directory Metadata (Regions, Specializations, Languages, Stats)
    initDirectoryMeta();

    // 3. Initialize UI Event Listeners
    initFilterEventListeners();

    // 4. Initialize Modals
    initModals();
});

// Global state
let currentPatient = null;
let directoryMetadata = null;
let currentProvidersList = [];

// Filter state
const filterState = {
    search: '',
    provider_type: 'all',
    max_fee: 3500,
    min_rating: '',
    district_id: 'all',
    spec_id: 'all',
    language_code: 'all',
    sort_by: 'rating_desc'
};

/**
 * 1. Patient Session Handler
 */
function initPatientSession() {
    const navPatientName = document.getElementById('navPatientName');
    const userAvatar = document.getElementById('userAvatar');
    const logoutBtn = document.getElementById('logoutBtn');
    const profileMatchBanner = document.getElementById('profileMatchBanner');
    const profileMatchDetails = document.getElementById('profileMatchDetails');
    const patientNameInput = document.getElementById('patientNameInput');
    const patientEmailInput = document.getElementById('patientEmailInput');

    const storedPatientStr = sessionStorage.getItem('currentPatient') || localStorage.getItem('currentPatient');

    if (storedPatientStr) {
        try {
            currentPatient = JSON.parse(storedPatientStr);
            const fullName = currentPatient.name || 'Patient';
            const firstName = fullName.split(' ')[0] || fullName;

            if (navPatientName) navPatientName.textContent = fullName;
            if (userAvatar) userAvatar.textContent = firstName.charAt(0).toUpperCase();
            if (patientNameInput) patientNameInput.value = fullName;
            if (patientEmailInput) patientEmailInput.value = currentPatient.email || '';

            // Show personalized profile recommendations banner if preferred language or city exists
            if (profileMatchBanner && (currentPatient.preferred_language || currentPatient.city)) {
                let matchTexts = [];
                if (currentPatient.preferred_language) matchTexts.push(`Language: <strong>${currentPatient.preferred_language}</strong>`);
                if (currentPatient.city) matchTexts.push(`Location: <strong>${currentPatient.city}</strong>`);

                if (profileMatchDetails) {
                    profileMatchDetails.innerHTML = `Auto-matched based on your profile (${matchTexts.join(' • ')}).`;
                }
                profileMatchBanner.style.display = 'flex';
            }
        } catch (e) {
            console.error('Error parsing patient session:', e);
        }
    }

    // Logout handling
    if (logoutBtn) {
        logoutBtn.addEventListener('click', () => {
            if (confirm('Are you sure you want to log out of MindCare?')) {
                sessionStorage.removeItem('currentPatient');
                localStorage.removeItem('currentPatient');
                window.location.href = 'patient-login.html';
            }
        });
    }

    // Apply Profile Defaults button
    const applyProfilePrefBtn = document.getElementById('applyProfilePrefBtn');
    if (applyProfilePrefBtn && currentPatient) {
        applyProfilePrefBtn.addEventListener('click', () => {
            applyPatientProfileDefaults();
        });
    }
}

/**
 * Apply patient's profile defaults (city, preferred language)
 */
function applyPatientProfileDefaults() {
    if (!currentPatient) return;

    // Apply language preference
    if (currentPatient.preferred_language) {
        const langLower = currentPatient.preferred_language.toLowerCase();
        if (langLower.includes('bengali') || langLower.includes('bangla')) {
            setLanguageFilter('002');
        } else if (langLower.includes('english')) {
            setLanguageFilter('001');
        }
    }

    // Apply city preference
    if (currentPatient.city && directoryMetadata && directoryMetadata.regions) {
        const patientCityLower = currentPatient.city.toLowerCase();
        const matchedRegion = directoryMetadata.regions.find(r => 
            r.district_name.toLowerCase().includes(patientCityLower) || 
            patientCityLower.includes(r.district_name.toLowerCase().split(' ')[0])
        );

        if (matchedRegion) {
            const citySelect = document.getElementById('citySelect');
            if (citySelect) {
                citySelect.value = String(matchedRegion.district_id);
                filterState.district_id = String(matchedRegion.district_id);
            }
        }
    }

    fetchFilteredProviders();
}

/**
 * 2. Fetch Directory Metadata (Regions, Specializations, Languages, Fee stats)
 */
async function initDirectoryMeta() {
    try {
        const res = await fetch('http://localhost:3000/api/directory/meta');
        if (!res.ok) throw new Error('Failed to fetch metadata');
        directoryMetadata = await res.json();

        // Populate Cities / Districts dropdown
        const citySelect = document.getElementById('citySelect');
        if (citySelect && directoryMetadata.regions) {
            citySelect.innerHTML = '<option value="all">All Cities &amp; Districts</option>';
            directoryMetadata.regions.forEach(r => {
                const opt = document.createElement('option');
                opt.value = r.district_id;
                opt.textContent = `${r.district_name} (Risk: ${r.risk_index || 'N/A'})`;
                citySelect.appendChild(opt);
            });
        }

        // Populate Specializations dropdown
        const specSelect = document.getElementById('specSelect');
        if (specSelect && directoryMetadata.specializations) {
            specSelect.innerHTML = '<option value="all">All Specializations</option>';
            directoryMetadata.specializations.forEach(s => {
                const opt = document.createElement('option');
                opt.value = s.spec_id;
                opt.textContent = s.spec_name;
                specSelect.appendChild(opt);
            });
        }

        // Sync URL query params (from deep links from homepage)
        readUrlQueryParams();

        // Initial search execution
        fetchFilteredProviders();
    } catch (err) {
        console.error('Error loading directory metadata:', err);
        // Fallback: execute directory query directly
        readUrlQueryParams();
        fetchFilteredProviders();
    }
}

/**
 * Read URL Query Parameters (for deep linking e.g. from home.html)
 */
function readUrlQueryParams() {
    const params = new URLSearchParams(window.location.search);

    const searchParam = params.get('search') || params.get('doctor');
    const specParam = params.get('specialization') || params.get('spec_id') || params.get('spec');
    const cityParam = params.get('city') || params.get('district_id') || params.get('district');
    const langParam = params.get('language') || params.get('lang');
    const feeParam = params.get('max_fee') || params.get('fee');
    const typeParam = params.get('type') || params.get('provider_type');

    if (searchParam) {
        filterState.search = searchParam;
        const searchInput = document.getElementById('searchInput');
        if (searchInput) {
            searchInput.value = searchParam;
            const clearSearchBtn = document.getElementById('clearSearchBtn');
            if (clearSearchBtn) clearSearchBtn.style.display = 'flex';
        }
    }

    if (specParam) {
        let matchedSpecId = specParam;
        if (isNaN(parseInt(specParam, 10)) && directoryMetadata && directoryMetadata.specializations) {
            const specLower = specParam.toLowerCase();
            const found = directoryMetadata.specializations.find(s => s.spec_name.toLowerCase().includes(specLower));
            if (found) matchedSpecId = String(found.spec_id);
        }
        filterState.spec_id = String(matchedSpecId);
        const specSelect = document.getElementById('specSelect');
        if (specSelect) specSelect.value = String(matchedSpecId);
    }

    if (cityParam) {
        let matchedDistrictId = cityParam;
        if (isNaN(parseInt(cityParam, 10)) && directoryMetadata && directoryMetadata.regions) {
            const cityLower = cityParam.toLowerCase();
            const found = directoryMetadata.regions.find(r => r.district_name.toLowerCase().includes(cityLower));
            if (found) matchedDistrictId = String(found.district_id);
        }
        filterState.district_id = String(matchedDistrictId);
        const citySelect = document.getElementById('citySelect');
        if (citySelect) citySelect.value = String(matchedDistrictId);
    }

    if (langParam) {
        if (langParam === '001' || langParam.toLowerCase().includes('eng')) setLanguageFilter('001');
        else if (langParam === '002' || langParam.toLowerCase().includes('ben')) setLanguageFilter('002');
    }

    if (feeParam && !isNaN(parseFloat(feeParam))) {
        setFeeFilter(parseFloat(feeParam));
    }

    if (typeParam && (typeParam === 'therapist' || typeParam === 'clinic')) {
        setCategoryTab(typeParam);
    }
}

/**
 * 3. Filter Event Listeners Setup
 */
function initFilterEventListeners() {
    const searchInput = document.getElementById('searchInput');
    const clearSearchBtn = document.getElementById('clearSearchBtn');
    const feeSlider = document.getElementById('feeSlider');
    const ratingSelect = document.getElementById('ratingSelect');
    const citySelect = document.getElementById('citySelect');
    const specSelect = document.getElementById('specSelect');
    const sortBySelect = document.getElementById('sortBySelect');
    const resetFiltersBtn = document.getElementById('resetFiltersBtn');

    // Debounced Search Input
    let searchDebounceTimer;
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            clearTimeout(searchDebounceTimer);
            const val = e.target.value.trim();
            filterState.search = val;
            if (clearSearchBtn) clearSearchBtn.style.display = val ? 'flex' : 'none';

            searchDebounceTimer = setTimeout(() => {
                fetchFilteredProviders();
            }, 300);
        });
    }

    // Clear Search Button
    if (clearSearchBtn) {
        clearSearchBtn.addEventListener('click', () => {
            if (searchInput) searchInput.value = '';
            filterState.search = '';
            clearSearchBtn.style.display = 'none';
            fetchFilteredProviders();
        });
    }

    // Category Tabs Click
    const tabButtons = document.querySelectorAll('#categoryTabs .tab-btn');
    tabButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            tabButtons.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            const type = btn.getAttribute('data-type');
            filterState.provider_type = type;
            fetchFilteredProviders();
        });
    });

    // Fee Slider
    if (feeSlider) {
        feeSlider.addEventListener('input', (e) => {
            const val = parseFloat(e.target.value);
            setFeeFilter(val, false);
        });
        feeSlider.addEventListener('change', () => {
            fetchFilteredProviders();
        });
    }

    // Fee Presets
    const presetChips = document.querySelectorAll('.preset-chip');
    presetChips.forEach(chip => {
        chip.addEventListener('click', () => {
            const feeVal = parseFloat(chip.getAttribute('data-fee'));
            setFeeFilter(feeVal, true);
            fetchFilteredProviders();
        });
    });

    // Minimum Rating Select
    if (ratingSelect) {
        ratingSelect.addEventListener('change', (e) => {
            filterState.min_rating = e.target.value;
            fetchFilteredProviders();
        });
    }

    // City / District Select
    if (citySelect) {
        citySelect.addEventListener('change', (e) => {
            filterState.district_id = e.target.value;
            fetchFilteredProviders();
        });
    }

    // Specialization Select
    if (specSelect) {
        specSelect.addEventListener('change', (e) => {
            filterState.spec_id = e.target.value;
            fetchFilteredProviders();
        });
    }

    // Language Pills
    const langPills = document.querySelectorAll('#languageSelector .lang-pill');
    langPills.forEach(pill => {
        pill.addEventListener('click', () => {
            langPills.forEach(p => p.classList.remove('active'));
            pill.classList.add('active');
            filterState.language_code = pill.getAttribute('data-lang');
            fetchFilteredProviders();
        });
    });

    // Sort By Select
    if (sortBySelect) {
        sortBySelect.addEventListener('change', (e) => {
            filterState.sort_by = e.target.value;
            fetchFilteredProviders();
        });
    }

    // Reset Filters Button
    if (resetFiltersBtn) {
        resetFiltersBtn.addEventListener('click', () => {
            resetAllFilters();
        });
    }
}

/**
 * Set Fee Filter Helper
 */
function setFeeFilter(val, syncSlider = true) {
    filterState.max_fee = val;
    const feeDisplay = document.getElementById('feeDisplay');
    const feeSlider = document.getElementById('feeSlider');

    if (feeDisplay) {
        if (val >= 3500) {
            feeDisplay.textContent = 'Any Budget (≤ ৳3,500)';
        } else {
            feeDisplay.textContent = `≤ ৳${val.toLocaleString()}`;
        }
    }

    if (syncSlider && feeSlider) {
        feeSlider.value = val;
    }

    // Update preset chip highlights
    const presetChips = document.querySelectorAll('.preset-chip');
    presetChips.forEach(chip => {
        const chipFee = parseFloat(chip.getAttribute('data-fee'));
        if (chipFee === val) chip.classList.add('active');
        else chip.classList.remove('active');
    });
}

/**
 * Set Language Filter Helper
 */
function setLanguageFilter(langCode) {
    filterState.language_code = langCode;
    const langPills = document.querySelectorAll('#languageSelector .lang-pill');
    langPills.forEach(pill => {
        if (pill.getAttribute('data-lang') === langCode) pill.classList.add('active');
        else pill.classList.remove('active');
    });
}

/**
 * Set Category Tab Helper
 */
function setCategoryTab(type) {
    filterState.provider_type = type;
    const tabButtons = document.querySelectorAll('#categoryTabs .tab-btn');
    tabButtons.forEach(btn => {
        if (btn.getAttribute('data-type') === type) btn.classList.add('active');
        else btn.classList.remove('active');
    });
}

/**
 * Reset all filters to default
 */
function resetAllFilters() {
    filterState.search = '';
    filterState.provider_type = 'all';
    filterState.max_fee = 3500;
    filterState.min_rating = '';
    filterState.district_id = 'all';
    filterState.spec_id = 'all';
    filterState.language_code = 'all';
    filterState.sort_by = 'rating_desc';

    const searchInput = document.getElementById('searchInput');
    const clearSearchBtn = document.getElementById('clearSearchBtn');
    const ratingSelect = document.getElementById('ratingSelect');
    const citySelect = document.getElementById('citySelect');
    const specSelect = document.getElementById('specSelect');
    const sortBySelect = document.getElementById('sortBySelect');

    if (searchInput) searchInput.value = '';
    if (clearSearchBtn) clearSearchBtn.style.display = 'none';
    if (ratingSelect) ratingSelect.value = '';
    if (citySelect) citySelect.value = 'all';
    if (specSelect) specSelect.value = 'all';
    if (sortBySelect) sortBySelect.value = 'rating_desc';

    setFeeFilter(3500, true);
    setLanguageFilter('all');
    setCategoryTab('all');

    fetchFilteredProviders();
}

/**
 * 4. Fetch Filtered Providers from Backend API
 */
async function fetchFilteredProviders() {
    const providersGrid = document.getElementById('providersGrid');
    const resultsCountBadge = document.getElementById('resultsCountBadge');
    const countAll = document.getElementById('countAll');
    const countTherapists = document.getElementById('countTherapists');
    const countClinics = document.getElementById('countClinics');

    // Build URL Query string
    const queryParams = new URLSearchParams();
    if (filterState.search) queryParams.append('search', filterState.search);
    if (filterState.provider_type && filterState.provider_type !== 'all') queryParams.append('provider_type', filterState.provider_type);
    if (filterState.max_fee < 3500) queryParams.append('max_fee', filterState.max_fee);
    if (filterState.min_rating) queryParams.append('min_rating', filterState.min_rating);
    if (filterState.district_id && filterState.district_id !== 'all') queryParams.append('district_id', filterState.district_id);
    if (filterState.spec_id && filterState.spec_id !== 'all') queryParams.append('spec_id', filterState.spec_id);
    if (filterState.language_code && filterState.language_code !== 'all') queryParams.append('language_code', filterState.language_code);
    if (filterState.sort_by) queryParams.append('sort_by', filterState.sort_by);

    renderActiveFilterChips();

    try {
        const response = await fetch(`http://localhost:3000/api/directory?${queryParams.toString()}`);
        if (!response.ok) throw new Error('Directory search failed');

        const data = await response.json();
        currentProvidersList = data.providers || [];

        // Update counts
        let numTherapists = 0;
        let numClinics = 0;

        currentProvidersList.forEach(p => {
            if (p.provider_type === 'therapist') numTherapists++;
            else if (p.provider_type === 'clinic') numClinics++;
        });

        if (countAll) countAll.textContent = currentProvidersList.length;
        if (countTherapists) countTherapists.textContent = numTherapists;
        if (countClinics) countClinics.textContent = numClinics;

        if (resultsCountBadge) {
            resultsCountBadge.textContent = `${currentProvidersList.length} Matching Providers Found`;
        }

        // Render Provider Cards in Grid
        renderProviderCards(currentProvidersList);
    } catch (err) {
        console.error('Error fetching directory:', err);
        if (providersGrid) {
            providersGrid.innerHTML = `
                <div class="empty-state">
                    <div class="empty-icon">⚠️</div>
                    <h3>Connection Error</h3>
                    <p>Unable to connect to the MindCare database server. Please ensure the backend server is running on port 3000.</p>
                    <button type="button" class="btn-clear-filters" onclick="fetchFilteredProviders()">Retry Connection</button>
                </div>
            `;
        }
    }
}

/**
 * Render Active Filter Chips
 */
function renderActiveFilterChips() {
    const activeFilterChips = document.getElementById('activeFilterChips');
    if (!activeFilterChips) return;

    let chipsHtml = '';

    if (filterState.search) {
        chipsHtml += `<span class="filter-chip-tag">Search: "${filterState.search}" <span class="filter-chip-remove" onclick="removeFilter('search')">✕</span></span>`;
    }

    if (filterState.max_fee < 3500) {
        chipsHtml += `<span class="filter-chip-tag">Budget: ≤ ৳${filterState.max_fee} <span class="filter-chip-remove" onclick="removeFilter('fee')">✕</span></span>`;
    }

    if (filterState.min_rating) {
        chipsHtml += `<span class="filter-chip-tag">Rating: ⭐ ${filterState.min_rating}+ <span class="filter-chip-remove" onclick="removeFilter('rating')">✕</span></span>`;
    }

    if (filterState.district_id && filterState.district_id !== 'all' && directoryMetadata && directoryMetadata.regions) {
        const reg = directoryMetadata.regions.find(r => String(r.district_id) === String(filterState.district_id));
        if (reg) {
            chipsHtml += `<span class="filter-chip-tag">📍 ${reg.district_name} <span class="filter-chip-remove" onclick="removeFilter('district')">✕</span></span>`;
        }
    }

    if (filterState.spec_id && filterState.spec_id !== 'all' && directoryMetadata && directoryMetadata.specializations) {
        const spec = directoryMetadata.specializations.find(s => String(s.spec_id) === String(filterState.spec_id));
        if (spec) {
            chipsHtml += `<span class="filter-chip-tag">🩺 ${spec.spec_name} <span class="filter-chip-remove" onclick="removeFilter('spec')">✕</span></span>`;
        }
    }

    if (filterState.language_code && filterState.language_code !== 'all') {
        const langLabel = filterState.language_code === '002' ? '🇧🇩 Bengali' : '🌐 English';
        chipsHtml += `<span class="filter-chip-tag">🗣️ ${langLabel} <span class="filter-chip-remove" onclick="removeFilter('language')">✕</span></span>`;
    }

    activeFilterChips.innerHTML = chipsHtml;
}

/**
 * Remove specific filter helper
 */
window.removeFilter = function(filterKey) {
    if (filterKey === 'search') {
        filterState.search = '';
        const searchInput = document.getElementById('searchInput');
        if (searchInput) searchInput.value = '';
    } else if (filterKey === 'fee') {
        setFeeFilter(3500, true);
    } else if (filterKey === 'rating') {
        filterState.min_rating = '';
        const ratingSelect = document.getElementById('ratingSelect');
        if (ratingSelect) ratingSelect.value = '';
    } else if (filterKey === 'district') {
        filterState.district_id = 'all';
        const citySelect = document.getElementById('citySelect');
        if (citySelect) citySelect.value = 'all';
    } else if (filterKey === 'spec') {
        filterState.spec_id = 'all';
        const specSelect = document.getElementById('specSelect');
        if (specSelect) specSelect.value = 'all';
    } else if (filterKey === 'language') {
        setLanguageFilter('all');
    }

    fetchFilteredProviders();
};

/**
 * Render All Provider Cards
 */
function renderProviderCards(providers) {
    const providersGrid = document.getElementById('providersGrid');
    if (!providersGrid) return;

    if (!providers || providers.length === 0) {
        providersGrid.innerHTML = `
            <div class="empty-state">
                <div class="empty-icon">🔍</div>
                <h3>No Matching Providers Found</h3>
                <p>We could not find any doctors or clinics matching all your active filters. Try loosening your fee limit, selecting "All Languages", or resetting filters.</p>
                <button type="button" class="btn-clear-filters" onclick="resetAllFilters()">Reset All Filters</button>
            </div>
        `;
        return;
    }

    let cardsHtml = '';

    providers.forEach(p => {
        const isTherapist = p.provider_type === 'therapist';
        const isClinic = p.provider_type === 'clinic';

        let cardClass = 'provider-card';
        let avatarIcon = '🩺';
        let typePillClass = 'therapist-pill';
        let typePillText = '🩺 Licensed Therapist';

        if (isClinic) {
            cardClass += ' clinic-card';
            avatarIcon = '🏥';
            typePillClass = 'clinic-pill';
            typePillText = '🏥 Mental Health Clinic';
        }

        // Fee display
        const feeText = `৳ ${parseFloat(p.session_fee || 0).toLocaleString()}`;
        const feeSub = '/ consultation session';

        // Subclass specifics
        let specificRows = '';
        let capacityText = 'Slots Available';
        let capacityIsFull = false;

        if (isTherapist) {
            const expYears = p.years_of_experience ? `${p.years_of_experience} Years` : '10+ Years';
            const license = p.license_no || 'TH-LIC-VERIFIED';
            const maxCap = p.max_capacity || 20;
            const curPatients = p.current_patients || 0;
            const availableSlots = Math.max(0, maxCap - curPatients);

            if (availableSlots === 0) {
                capacityIsFull = true;
                capacityText = 'Full Capacity (Waitlist Open)';
            } else {
                capacityText = `${availableSlots} of ${maxCap} slots available`;
            }

            specificRows = `
                <div class="attr-row">
                    <span class="attr-label">Clinical Experience:</span>
                    <span class="attr-val">${expYears}</span>
                </div>
                <div class="attr-row">
                    <span class="attr-label">License Number:</span>
                    <span class="attr-val">${escapeHtml(license)}</span>
                </div>
            `;
        } else if (isClinic) {
            const beds = p.total_beds ? `${p.total_beds} Inpatient Beds` : '35 Beds';
            const regNo = p.registration_no || 'CL-REG-VERIFIED';
            const maxCap = p.max_capacity || 40;
            const curPatients = p.current_patients || 0;
            const availableSlots = Math.max(0, maxCap - curPatients);

            if (availableSlots === 0) {
                capacityIsFull = true;
                capacityText = 'Full Capacity (Waitlist Open)';
            } else {
                capacityText = `${availableSlots} of ${maxCap} patient capacity`;
            }

            specificRows = `
                <div class="attr-row">
                    <span class="attr-label">Facility Size:</span>
                    <span class="attr-val">${beds}</span>
                </div>
                <div class="attr-row">
                    <span class="attr-label">Clinic Registration:</span>
                    <span class="attr-val">${escapeHtml(regNo)}</span>
                </div>
            `;
        }

        // Specializations & Languages Tags
        const specList = (p.specializations || '').split(',').filter(Boolean);
        const langList = (p.languages || '').split(',').filter(Boolean);

        let tagsHtml = '';
        specList.slice(0, 3).forEach(s => {
            tagsHtml += `<span class="spec-chip">${escapeHtml(s.trim())}</span>`;
        });
        if (specList.length > 3) {
            tagsHtml += `<span class="spec-chip">+${specList.length - 3} more</span>`;
        }

        langList.forEach(l => {
            const lTrim = l.trim();
            const emoji = lTrim.toLowerCase().includes('bengali') ? '🇧🇩' : '🌐';
            tagsHtml += `<span class="lang-chip">${emoji} ${escapeHtml(lTrim)}</span>`;
        });

        // Insurance badge
        const acceptsIns = p.accepts_insurance === 1 || p.accepts_insurance === true;
        const insBadge = acceptsIns
            ? '<span class="insurance-indicator yes">✓ Accepts Insurance</span>'
            : '<span class="insurance-indicator">Self-Pay / Sliding Scale</span>';

        // Action buttons
        const actionsHtml = `
            <button type="button" class="btn-view-details" onclick="openDetailsModal(${p.provider_id})">
                <span>View Profile</span>
            </button>
            <button type="button" class="btn-book-action" onclick="openBookingModal(${p.provider_id})">
                <span>Book Now ➔</span>
            </button>
        `;

        cardsHtml += `
            <div class="${cardClass}">
                <div>
                    <div class="card-head">
                        <div class="provider-avatar-icon">${avatarIcon}</div>
                        <div class="head-info">
                            <span class="type-pill ${typePillClass}">${typePillText}</span>
                            <h3 class="provider-name">${escapeHtml(p.name)}</h3>
                            <div class="provider-location">📍 ${escapeHtml(p.district_name || 'District Dhaka')}</div>
                        </div>
                    </div>

                    <div class="rating-capacity-strip">
                        <div class="rating-box">
                            <span>⭐</span>
                            <span>${parseFloat(p.rating_avg || 4.5).toFixed(2)}</span>
                            <small style="color: var(--text-light); font-weight: 500;">/ 5</small>
                        </div>
                        <span class="capacity-badge ${capacityIsFull ? 'full' : ''}">
                            ● ${capacityText}
                        </span>
                    </div>

                    <div class="key-attributes">
                        ${specificRows}
                    </div>

                    <div class="specialty-tags-row">
                        ${tagsHtml}
                    </div>
                </div>

                <div>
                    <div class="card-fee-box">
                        <div class="fee-wrap">
                            <span class="fee-label">Consultation Fee</span>
                            <span class="fee-amount">${feeText}</span>
                            <span style="font-size: 10px; color: var(--text-muted);">${feeSub}</span>
                        </div>
                        ${insBadge}
                    </div>

                    <div class="card-actions-row">
                        ${actionsHtml}
                    </div>
                </div>
            </div>
        `;
    });

    providersGrid.innerHTML = cardsHtml;
}

/**
 * 5. Modals Setup & Actions
 */
function initModals() {
    const bookingModal = document.getElementById('bookingModal');
    const closeBookingModalBtn = document.getElementById('closeBookingModalBtn');
    const cancelBookingBtn = document.getElementById('cancelBookingBtn');
    const appointmentForm = document.getElementById('appointmentForm');

    const detailsModal = document.getElementById('detailsModal');
    const closeDetailsModalBtn = document.getElementById('closeDetailsModalBtn');
    const closeDetailActionBtn = document.getElementById('closeDetailActionBtn');
    const detailBookActionBtn = document.getElementById('detailBookActionBtn');

    // Close booking modal
    if (closeBookingModalBtn) closeBookingModalBtn.addEventListener('click', () => closeBookingModal());
    if (cancelBookingBtn) cancelBookingBtn.addEventListener('click', () => closeBookingModal());

    // Close details modal
    if (closeDetailsModalBtn) closeDetailsModalBtn.addEventListener('click', () => closeDetailsModal());
    if (closeDetailActionBtn) closeDetailActionBtn.addEventListener('click', () => closeDetailsModal());

    // Close on backdrop click
    window.addEventListener('click', (e) => {
        if (e.target === bookingModal) closeBookingModal();
        if (e.target === detailsModal) closeDetailsModal();
    });

    // Appointment Form Submit
    if (appointmentForm) {
        appointmentForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            await submitAppointmentBooking();
        });
    }
}

/**
 * Open Booking Modal
 */
window.openBookingModal = function(providerId) {
    const provider = currentProvidersList.find(p => p.provider_id === providerId);
    if (!provider) return;

    const modal = document.getElementById('bookingModal');
    const modalProviderName = document.getElementById('modalProviderName');
    const modalProviderType = document.getElementById('modalProviderType');
    const modalFee = document.getElementById('modalFee');
    const modalLocation = document.getElementById('modalLocation');
    const modalRating = document.getElementById('modalRating');
    const modalCapacityStatus = document.getElementById('modalCapacityStatus');
    const bookingProviderId = document.getElementById('bookingProviderId');
    const bookingSpecId = document.getElementById('bookingSpecId');
    const appointmentDateInput = document.getElementById('appointmentDateInput');
    const bookingAlertBox = document.getElementById('bookingAlertBox');
    const capacityWaitlistPrompt = document.getElementById('capacityWaitlistPrompt');
    const appointmentForm = document.getElementById('appointmentForm');

    // Set form defaults
    if (modalProviderName) modalProviderName.textContent = provider.name;
    if (modalProviderType) modalProviderType.textContent = provider.provider_type === 'clinic' ? 'Mental Health Clinic' : 'Licensed Clinical Therapist';
    if (modalFee) modalFee.textContent = `৳ ${parseFloat(provider.session_fee || 0).toLocaleString()} / session`;
    if (modalLocation) modalLocation.textContent = `📍 ${provider.district_name || 'Dhaka'}`;
    if (modalRating) modalRating.textContent = `⭐ ${parseFloat(provider.rating_avg || 4.5).toFixed(2)} / 5`;
    if (bookingProviderId) bookingProviderId.value = provider.provider_id;

    // Spec ID for potential waitlist redirection
    const firstSpecId = provider.spec_ids ? provider.spec_ids.split(',')[0] : 1;
    if (bookingSpecId) bookingSpecId.value = firstSpecId;

    // Set default date to tomorrow
    if (appointmentDateInput) {
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        const yyyy = tomorrow.getFullYear();
        const mm = String(tomorrow.getMonth() + 1).padStart(2, '0');
        const dd = String(tomorrow.getDate()).padStart(2, '0');
        const minDateStr = `${yyyy}-${mm}-${dd}`;
        appointmentDateInput.min = minDateStr;
        appointmentDateInput.value = minDateStr;
    }

    if (bookingAlertBox) {
        bookingAlertBox.style.display = 'none';
        bookingAlertBox.textContent = '';
    }

    // Capacity status check
    const curPatients = provider.current_patients || 0;
    const maxCap = provider.max_capacity || 0;
    const isFull = maxCap > 0 && curPatients >= maxCap;

    if (modalCapacityStatus) {
        if (isFull) {
            modalCapacityStatus.textContent = 'Full Capacity (Waitlist Recommended)';
            modalCapacityStatus.style.color = '#dc2626';
        } else {
            modalCapacityStatus.textContent = `${maxCap - curPatients} Slots Open`;
            modalCapacityStatus.style.color = '#059669';
        }
    }

    if (capacityWaitlistPrompt) capacityWaitlistPrompt.style.display = 'none';
    if (appointmentForm) appointmentForm.style.display = 'block';

    modal.style.display = 'flex';
};

/**
 * Close Booking Modal
 */
function closeBookingModal() {
    const modal = document.getElementById('bookingModal');
    if (modal) modal.style.display = 'none';
}

/**
 * Submit Appointment Booking
 */
async function submitAppointmentBooking() {
    const bookingProviderId = document.getElementById('bookingProviderId').value;
    const bookingSpecId = document.getElementById('bookingSpecId').value;
    const appointmentDateInput = document.getElementById('appointmentDateInput').value;
    const confirmBookingBtn = document.getElementById('confirmBookingBtn');
    const bookingAlertBox = document.getElementById('bookingAlertBox');
    const capacityWaitlistPrompt = document.getElementById('capacityWaitlistPrompt');
    const appointmentForm = document.getElementById('appointmentForm');
    const capacityMessage = document.getElementById('capacityMessage');
    const joinWaitlistRedirectBtn = document.getElementById('joinWaitlistRedirectBtn');

    const patientId = currentPatient ? currentPatient.patient_id : 1;

    confirmBookingBtn.disabled = true;
    confirmBookingBtn.textContent = 'Confirming Booking...';

    try {
        const response = await fetch('http://localhost:3000/api/appointments', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                patient_id: patientId,
                provider_id: bookingProviderId,
                appointment_date: appointmentDateInput
            })
        });

        const data = await response.json();

        if (response.ok) {
            bookingAlertBox.className = 'booking-alert-box success';
            bookingAlertBox.textContent = `✓ ${data.message} (Appointment ID: #${data.appointment_id})`;
            bookingAlertBox.style.display = 'block';
            confirmBookingBtn.textContent = 'Booking Confirmed!';

            setTimeout(() => {
                closeBookingModal();
                fetchFilteredProviders();
            }, 1800);
        } else if (data.is_full) {
            // Provider is at maximum capacity
            appointmentForm.style.display = 'none';
            if (capacityMessage) capacityMessage.textContent = data.error;
            if (joinWaitlistRedirectBtn) {
                joinWaitlistRedirectBtn.href = `waitlist.html?spec_id=${bookingSpecId}&patient_id=${patientId}`;
            }
            if (capacityWaitlistPrompt) capacityWaitlistPrompt.style.display = 'block';
        } else {
            bookingAlertBox.className = 'booking-alert-box error';
            bookingAlertBox.textContent = data.error || 'Failed to book appointment.';
            bookingAlertBox.style.display = 'block';
            confirmBookingBtn.disabled = false;
            confirmBookingBtn.textContent = 'Confirm Booking ➔';
        }
    } catch (err) {
        console.error('Booking error:', err);
        bookingAlertBox.className = 'booking-alert-box error';
        bookingAlertBox.textContent = 'Server communication error. Please try again.';
        bookingAlertBox.style.display = 'block';
        confirmBookingBtn.disabled = false;
        confirmBookingBtn.textContent = 'Confirm Booking ➔';
    }
}

/**
 * Open Details Modal
 */
window.openDetailsModal = function(providerId) {
    const provider = currentProvidersList.find(p => p.provider_id === providerId);
    if (!provider) return;

    const modal = document.getElementById('detailsModal');
    const detailName = document.getElementById('detailName');
    const detailSubtitle = document.getElementById('detailSubtitle');
    const detailIcon = document.getElementById('detailIcon');
    const detailContent = document.getElementById('detailContent');
    const detailBookActionBtn = document.getElementById('detailBookActionBtn');

    if (detailName) detailName.textContent = provider.name;
    if (detailSubtitle) {
        detailSubtitle.textContent = provider.provider_type === 'clinic' 
            ? 'Medical Psychiatric Clinic' 
            : 'Licensed Healthcare Professional';
    }
    if (detailIcon) {
        detailIcon.textContent = provider.provider_type === 'clinic' ? '🏥' : '🩺';
    }

    let subclassSpecificHtml = '';
    if (provider.provider_type === 'therapist') {
        subclassSpecificHtml = `
            <div class="detail-item">
                <div class="detail-lbl">Professional License</div>
                <div class="detail-val">${escapeHtml(provider.license_no || 'TH-LIC-VERIFIED')}</div>
            </div>
            <div class="detail-item">
                <div class="detail-lbl">Years of Experience</div>
                <div class="detail-val">${provider.years_of_experience ? provider.years_of_experience + ' Years' : '10+ Years'}</div>
            </div>
        `;
    } else if (provider.provider_type === 'clinic') {
        subclassSpecificHtml = `
            <div class="detail-item">
                <div class="detail-lbl">Clinic Registration No</div>
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
                <div class="detail-lbl">Average Patient Rating</div>
                <div class="detail-val">⭐ ${parseFloat(provider.rating_avg || 4.5).toFixed(2)} / 5.0</div>
            </div>
            <div class="detail-item">
                <div class="detail-lbl">Session Consultation Fee</div>
                <div class="detail-val">৳ ${parseFloat(provider.session_fee || 0).toLocaleString()}</div>
            </div>
            <div class="detail-item">
                <div class="detail-lbl">Insurance Coverage</div>
                <div class="detail-val">${provider.accepts_insurance ? '✓ Accepts Health Insurance' : 'Self-Pay / Sliding Scale'}</div>
            </div>
            ${subclassSpecificHtml}
            <div class="detail-item">
                <div class="detail-lbl">District &amp; Location</div>
                <div class="detail-val">📍 ${escapeHtml(provider.district_name || 'Dhaka')} (Risk Index: ${provider.risk_index || 'N/A'})</div>
            </div>
            <div class="detail-item">
                <div class="detail-lbl">Patient Slot Capacity</div>
                <div class="detail-val">${provider.current_patients || 0} / ${provider.max_capacity || 0} Slots Filled</div>
            </div>
            <div class="detail-item full-width">
                <div class="detail-lbl">Clinical Specializations</div>
                <div class="detail-val">${escapeHtml(provider.specializations || 'General Mental Health Support')}</div>
            </div>
            <div class="detail-item full-width">
                <div class="detail-lbl">Spoken Languages</div>
                <div class="detail-val">${escapeHtml(provider.languages || 'Bengali, English')}</div>
            </div>
            <div class="detail-item full-width">
                <div class="detail-lbl">GPS Coordinates</div>
                <div class="detail-val" style="font-family: monospace; font-size: 12px;">Lat: ${provider.latitude || '23.8103'}, Long: ${provider.longitude || '90.4125'}</div>
            </div>
        `;
    }

    if (detailBookActionBtn) {
        detailBookActionBtn.onclick = () => {
            closeDetailsModal();
            openBookingModal(provider.provider_id);
        };
    }

    modal.style.display = 'flex';
};

/**
 * Close Details Modal
 */
function closeDetailsModal() {
    const modal = document.getElementById('detailsModal');
    if (modal) modal.style.display = 'none';
}

/**
 * Helper: Escape HTML string
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
