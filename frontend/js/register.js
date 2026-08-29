const districtCoordinates = {
    '1': { name: 'Dhaka', latitude: 23.8103, longitude: 90.4125 },
    '2': { name: 'Chittagong', latitude: 22.3569, longitude: 91.7832 },
    '3': { name: 'Sylhet', latitude: 24.8949, longitude: 91.8687 },
    '4': { name: 'Rajshahi', latitude: 24.3636, longitude: 88.6241 },
    '5': { name: 'Khulna', latitude: 22.8456, longitude: 89.5403 },
    '6': { name: 'Barisal', latitude: 22.7010, longitude: 90.3535 },
    '7': { name: 'Rangpur', latitude: 25.7439, longitude: 89.2752 }
};

// Fallback seed subregions by district ID
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
    const registrationForm = document.getElementById('registrationForm');
    const districtSelect = document.getElementById('district_id');
    const subregionSelect = document.getElementById('subregion_id');
    const passwordModal = document.getElementById('passwordModal');
    const generatedPasswordDisplay = document.getElementById('generatedPasswordDisplay');
    const copyPasswordBtn = document.getElementById('copyPasswordBtn');
    const alertBox = document.getElementById('alertBox');
    const emailInput = document.getElementById('email');

    function showAlert(htmlMessage, type = 'error') {
        if (!alertBox) return;
        alertBox.innerHTML = htmlMessage;
        alertBox.className = `alert-box ${type}`;
        alertBox.style.display = 'flex';
        alertBox.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }

    function hideAlert() {
        if (!alertBox) return;
        alertBox.style.display = 'none';
        alertBox.innerHTML = '';
    }

    // Dynamic Subregion Loader based on selected district
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
                    subregionSelect.innerHTML = '<option value="">Select Subregion / Area...</option>';
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
            subregionSelect.innerHTML = '<option value="">Select Subregion / Area...</option>';
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

    // Copy Password to Clipboard
    if (copyPasswordBtn) {
        copyPasswordBtn.addEventListener('click', () => {
            const pwd = generatedPasswordDisplay.textContent;
            navigator.clipboard.writeText(pwd).then(() => {
                copyPasswordBtn.textContent = '✓ Copied!';
                setTimeout(() => {
                    copyPasswordBtn.textContent = '📋 Copy';
                }, 2000);
            }).catch(() => {
                alert('Password: ' + pwd);
            });
        });
    }

    registrationForm.addEventListener('submit', function (e) {
        e.preventDefault();
        hideAlert();

        const districtId = districtSelect ? districtSelect.value : '';
        const subregionId = subregionSelect ? subregionSelect.value : '';
        const districtInfo = districtCoordinates[districtId] || { name: 'Dhaka', latitude: 23.8103, longitude: 90.4125 };

        // Determine coordinates from chosen subregion or fallback to district
        let lat = districtInfo.latitude;
        let lng = districtInfo.longitude;

        if (subregionSelect && subregionSelect.selectedOptions && subregionSelect.selectedOptions[0]) {
            const opt = subregionSelect.selectedOptions[0];
            if (opt.dataset.lat && opt.dataset.lng) {
                lat = parseFloat(opt.dataset.lat);
                lng = parseFloat(opt.dataset.lng);
            }
        }

        const patientData = {
            name: document.getElementById('name').value.trim(),
            email: emailInput.value.trim(),
            phone: document.getElementById('phone').value.trim(),
            date_of_birth: document.getElementById('dob').value,
            income_bracket: document.getElementById('income').value,
            preferred_language: document.getElementById('preferred_language').value,
            street: document.getElementById('street').value.trim(),
            city: districtInfo.name,
            district_id: districtId ? parseInt(districtId, 10) : null,
            subregion_id: subregionId ? parseInt(subregionId, 10) : null,
            zip_code: document.getElementById('zip_code').value.trim(),
            latitude: lat,
            longitude: lng
        };

        const submitBtn = registrationForm.querySelector('button[type="submit"]');
        submitBtn.disabled = true;
        submitBtn.textContent = 'Registering Patient...';

        fetch('http://localhost:3000/api/register', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(patientData)
        })
            .then(async (response) => {
                submitBtn.disabled = false;
                submitBtn.textContent = 'Register Patient';

                const data = await response.json();

                // Check if account already exists
                if (response.status === 409 || data.exists) {
                    showAlert(`⚠️ Account already exists. <a href="patient-login.html" style="color: #991B1B; font-weight: 700; text-decoration: underline; margin-left: 6px;">Proceed to login ➔</a>`, 'error');
                    emailInput.focus();
                    return;
                }

                if (!response.ok) {
                    showAlert(data.error || 'Failed to register patient. Please try again.', 'error');
                    return;
                }

                // Success state - display generated password
                if (data.password) {
                    generatedPasswordDisplay.textContent = data.password;
                    passwordModal.classList.add('active');
                    registrationForm.reset();
                } else {
                    showAlert('✓ Registration successful! You can now log in.', 'success');
                    registrationForm.reset();
                }
            })
            .catch(error => {
                console.error('Registration Error:', error);
                submitBtn.disabled = false;
                submitBtn.textContent = 'Register Patient';
                showAlert('Unable to connect to server. Please check your backend connection.', 'error');
            });
    });
});

