/**
 * MindCare - Provider Registration Logic (provider-register.js)
 */

// Fallback seed subregions
const seedSubregions = {
    '1': [
        { subregion_id: 1, subregion_name: 'Mirpur', latitude: 23.8223, longitude: 90.3654 },
        { subregion_id: 2, subregion_name: 'Mohammadpur', latitude: 23.7644, longitude: 90.3564 },
        { subregion_id: 3, subregion_name: 'Uttara', latitude: 23.8759, longitude: 90.3795 },
        { subregion_id: 4, subregion_name: 'Demra', latitude: 23.7204, longitude: 90.4634 },
        { subregion_id: 5, subregion_name: 'Kamrangirchar', latitude: 23.7161, longitude: 90.3742 }
    ],
    '2': [
        { subregion_id: 6, subregion_name: 'Agrabad', latitude: 22.3269, longitude: 91.8123 },
        { subregion_id: 7, subregion_name: 'Halishahar', latitude: 22.3496, longitude: 91.7854 },
        { subregion_id: 8, subregion_name: 'Patenga', latitude: 22.2637, longitude: 91.7872 },
        { subregion_id: 9, subregion_name: 'Bayazid', latitude: 22.3784, longitude: 91.8021 },
        { subregion_id: 10, subregion_name: 'Chandgaon', latitude: 22.3421, longitude: 91.8312 }
    ],
    '3': [
        { subregion_id: 11, subregion_name: 'Zindabazar', latitude: 24.8949, longitude: 91.8687 },
        { subregion_id: 12, subregion_name: 'Ambarkhana', latitude: 24.8891, longitude: 91.8762 },
        { subregion_id: 13, subregion_name: 'Shibganj', latitude: 24.9012, longitude: 91.8534 },
        { subregion_id: 14, subregion_name: 'Uposhahar', latitude: 24.8763, longitude: 91.8901 },
        { subregion_id: 15, subregion_name: 'Moglabazar', latitude: 24.8834, longitude: 91.8645 }
    ],
    '4': [
        { subregion_id: 16, subregion_name: 'Boalia', latitude: 24.3745, longitude: 88.6042 },
        { subregion_id: 17, subregion_name: 'Shaheb Bazar', latitude: 24.3693, longitude: 88.5981 },
        { subregion_id: 18, subregion_name: 'Uposhahar', latitude: 24.3812, longitude: 88.6234 },
        { subregion_id: 19, subregion_name: 'Kazla', latitude: 24.3621, longitude: 88.6312 },
        { subregion_id: 20, subregion_name: 'Talaimari', latitude: 24.3784, longitude: 88.6123 }
    ],
    '5': [
        { subregion_id: 21, subregion_name: 'Khalishpur', latitude: 22.8456, longitude: 89.5312 },
        { subregion_id: 22, subregion_name: 'Daulatpur', latitude: 22.8712, longitude: 89.5123 },
        { subregion_id: 23, subregion_name: 'Sonadanga', latitude: 22.8234, longitude: 89.5512 },
        { subregion_id: 24, subregion_name: 'Boyra', latitude: 22.8345, longitude: 89.5634 },
        { subregion_id: 25, subregion_name: 'Rupsha', latitude: 22.8123, longitude: 89.5723 }
    ],
    '6': [
        { subregion_id: 26, subregion_name: 'Natullabad', latitude: 22.7012, longitude: 90.3712 },
        { subregion_id: 27, subregion_name: 'Sadar Road', latitude: 22.6934, longitude: 90.3634 },
        { subregion_id: 28, subregion_name: 'Rupatali', latitude: 22.6812, longitude: 90.3812 },
        { subregion_id: 29, subregion_name: 'Kashipur', latitude: 22.7123, longitude: 90.3534 },
        { subregion_id: 30, subregion_name: 'Chand Miari', latitude: 22.6723, longitude: 90.3923 }
    ],
    '7': [
        { subregion_id: 31, subregion_name: 'Dhap', latitude: 25.7439, longitude: 89.2752 },
        { subregion_id: 32, subregion_name: 'Mahiganj', latitude: 25.7312, longitude: 89.2634 },
        { subregion_id: 33, subregion_name: 'Shapla Chottor', latitude: 25.7523, longitude: 89.2812 },
        { subregion_id: 34, subregion_name: 'Jahaj Company Mor', latitude: 25.7612, longitude: 89.2534 },
        { subregion_id: 35, subregion_name: 'Modern Mor', latitude: 25.7234, longitude: 89.2923 }
    ]
};

document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('providerRegistrationForm');
    const providerTypeSelect = document.getElementById('provider_type');
    const therapistFields = document.getElementById('therapistFields');
    const clinicFields = document.getElementById('clinicFields');
    const districtSelect = document.getElementById('district_id');
    const subregionSelect = document.getElementById('subregion_id');
    const alertBox = document.getElementById('alertBox');
    const submitBtn = document.getElementById('submitBtn');
    const successModal = document.getElementById('successModal');
    const modalProviderName = document.getElementById('modalProviderName');
    const modalProviderEmail = document.getElementById('modalProviderEmail');

    // 1. Toggle Subclass Credentials
    if (providerTypeSelect) {
        providerTypeSelect.addEventListener('change', () => {
            const isClinic = providerTypeSelect.value === 'clinic';
            if (therapistFields) therapistFields.style.display = isClinic ? 'none' : 'block';
            if (clinicFields) clinicFields.style.display = isClinic ? 'block' : 'none';
        });
    }

    // 2. Fetch live districts to populate dropdown
    fetch('http://localhost:3000/api/regions')
        .then(res => res.json())
        .then(regions => {
            if (regions && regions.length > 0 && districtSelect) {
                districtSelect.innerHTML = '<option value="">Select District Location...</option>';
                regions.forEach(r => {
                    const opt = document.createElement('option');
                    opt.value = r.district_id;
                    opt.textContent = `${r.district_name}`;
                    districtSelect.appendChild(opt);
                });
                districtSelect.value = '1'; // default Dhaka
                populateSubregions(1);
            }
        })
        .catch(err => {
            console.log('Using default districts', err);
            populateSubregions(1);
        });

    // 3. Populate subregions dynamically
    async function populateSubregions(districtId) {
        if (!subregionSelect) return;
        
        if (!districtId) {
            subregionSelect.innerHTML = '<option value="">Select District First...</option>';
            subregionSelect.disabled = true;
            return;
        }

        subregionSelect.disabled = false;
        subregionSelect.innerHTML = '<option value="">Loading subregions...</option>';

        try {
            const res = await fetch(`http://localhost:3000/api/subregions?district_id=${districtId}`);
            if (res.ok) {
                const subregions = await res.json();
                if (subregions && subregions.length > 0) {
                    subregionSelect.innerHTML = '<option value="">Select Subregion / Area Location...</option>';
                    subregions.forEach(s => {
                        const opt = document.createElement('option');
                        opt.value = s.subregion_id;
                        opt.textContent = `${s.subregion_name}`;
                        opt.dataset.lat = s.latitude || '';
                        opt.dataset.lng = s.longitude || '';
                        subregionSelect.appendChild(opt);
                    });
                    return;
                }
            }
            throw new Error('Fallback to seed subregions');
        } catch (err) {
            const fallback = seedSubregions[districtId] || [];
            subregionSelect.innerHTML = '<option value="">Select Subregion / Area Location...</option>';
            fallback.forEach(s => {
                const opt = document.createElement('option');
                opt.value = s.subregion_id;
                opt.textContent = `${s.subregion_name}`;
                opt.dataset.lat = s.latitude;
                opt.dataset.lng = s.longitude;
                subregionSelect.appendChild(opt);
            });
        }
    }

    if (districtSelect) {
        districtSelect.addEventListener('change', () => {
            populateSubregions(districtSelect.value);
        });
    }

    // 4. Handle Form Submission
    if (form) {
        form.addEventListener('submit', async (e) => {
            e.preventDefault();

            // Clear alert
            alertBox.style.display = 'none';
            alertBox.className = 'alert-box';
            alertBox.textContent = '';

            const name = document.getElementById('name').value.trim();
            const provider_type = providerTypeSelect.value;
            const email = document.getElementById('email').value.trim();
            const password = document.getElementById('password').value.trim();
            const district_id = parseInt(districtSelect.value, 10) || 1;
            const subregion_id = subregionSelect ? parseInt(subregionSelect.value, 10) || null : null;
            const session_fee = parseFloat(document.getElementById('session_fee').value) || 1500;
            const max_capacity = parseInt(document.getElementById('max_capacity').value, 10) || 20;
            const accepts_insurance = parseInt(document.getElementById('accepts_insurance').value, 10) || 0;

            const license_no = document.getElementById('license_no') ? document.getElementById('license_no').value.trim() : '';
            const years_of_experience = document.getElementById('years_of_experience') ? parseInt(document.getElementById('years_of_experience').value, 10) : 5;
            const registration_no = document.getElementById('registration_no') ? document.getElementById('registration_no').value.trim() : '';
            const total_beds = document.getElementById('total_beds') ? parseInt(document.getElementById('total_beds').value, 10) : 30;

            // Coordinates from subregion or district defaults
            let lat = 23.8103;
            let lng = 90.4125;
            if (subregionSelect && subregionSelect.selectedOptions && subregionSelect.selectedOptions[0]) {
                const opt = subregionSelect.selectedOptions[0];
                if (opt.dataset.lat && opt.dataset.lng) {
                    lat = parseFloat(opt.dataset.lat);
                    lng = parseFloat(opt.dataset.lng);
                }
            }

            // Selected specializations
            const specCheckboxes = document.querySelectorAll('input[name="specs"]:checked');
            const spec_ids = Array.from(specCheckboxes).map(cb => parseInt(cb.value, 10));

            // Selected languages
            const langCheckboxes = document.querySelectorAll('input[name="langs"]:checked');
            const language_codes = Array.from(langCheckboxes).map(cb => cb.value);

            if (!name || !email || !password) {
                alertBox.textContent = 'Please fill in your name, clinical email, and password.';
                alertBox.className = 'alert-box alert-error';
                alertBox.style.display = 'block';
                return;
            }

            submitBtn.disabled = true;
            submitBtn.textContent = 'Creating Clinical Account...';

            try {
                const response = await fetch('http://localhost:3000/api/provider-register', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        name,
                        email,
                        password,
                        provider_type,
                        district_id,
                        subregion_id,
                        latitude: lat,
                        longitude: lng,
                        session_fee,
                        max_capacity,
                        accepts_insurance,
                        license_no,
                        years_of_experience,
                        registration_no,
                        total_beds,
                        spec_ids,
                        language_codes
                    })
                });

                const data = await response.json();

                if (response.ok) {
                    if (modalProviderName) modalProviderName.textContent = data.name;
                    if (modalProviderEmail) modalProviderEmail.textContent = data.email;
                    if (successModal) successModal.style.display = 'flex';
                } else {
                    alertBox.textContent = data.error || 'Failed to complete registration.';
                    alertBox.className = 'alert-box alert-error';
                    alertBox.style.display = 'block';
                    submitBtn.disabled = false;
                    submitBtn.textContent = 'Register as Healthcare Provider';
                }
            } catch (err) {
                console.error('Registration error:', err);
                alertBox.textContent = 'Unable to connect to MindCare backend. Please make sure the server is running.';
                alertBox.className = 'alert-box alert-error';
                alertBox.style.display = 'block';
                submitBtn.disabled = false;
                submitBtn.textContent = 'Register as Healthcare Provider';
            }
        });
    }
});

