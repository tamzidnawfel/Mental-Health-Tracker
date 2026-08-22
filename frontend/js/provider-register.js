/**
 * MindCare - Provider Registration Logic (provider-register.js)
 */

document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('providerRegistrationForm');
    const providerTypeSelect = document.getElementById('provider_type');
    const therapistFields = document.getElementById('therapistFields');
    const clinicFields = document.getElementById('clinicFields');
    const districtSelect = document.getElementById('district_id');
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
            }
        })
        .catch(err => console.log('Using default districts', err));

    // 3. Handle Form Submission
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
            const session_fee = parseFloat(document.getElementById('session_fee').value) || 1500;
            const max_capacity = parseInt(document.getElementById('max_capacity').value, 10) || 20;
            const accepts_insurance = parseInt(document.getElementById('accepts_insurance').value, 10) || 0;

            const license_no = document.getElementById('license_no') ? document.getElementById('license_no').value.trim() : '';
            const years_of_experience = document.getElementById('years_of_experience') ? parseInt(document.getElementById('years_of_experience').value, 10) : 5;
            const registration_no = document.getElementById('registration_no') ? document.getElementById('registration_no').value.trim() : '';
            const total_beds = document.getElementById('total_beds') ? parseInt(document.getElementById('total_beds').value, 10) : 30;

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
