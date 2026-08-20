const cityCoordinates = {
    'Dhaka': { latitude: 23.8103, longitude: 90.4125 },
    'Chittagong': { latitude: 22.3569, longitude: 91.7832 },
    'Sylhet': { latitude: 24.8949, longitude: 91.8687 },
    'Rajshahi': { latitude: 24.3636, longitude: 88.6241 },
    'Khulna': { latitude: 22.8456, longitude: 89.5403 },
    'Barisal': { latitude: 22.7010, longitude: 90.3535 },
    'Rangpur': { latitude: 25.7439, longitude: 89.2752 }
};

document.addEventListener('DOMContentLoaded', () => {
    const registrationForm = document.getElementById('registrationForm');
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

    registrationForm.addEventListener('submit', function(e) {
        e.preventDefault(); 
        hideAlert();
        
        const city = document.getElementById('city').value;
        const coords = cityCoordinates[city] || { latitude: null, longitude: null };

        const patientData = {
            name: document.getElementById('name').value,
            email: emailInput.value.trim(),
            phone: document.getElementById('phone').value,
            date_of_birth: document.getElementById('dob').value,
            income_bracket: document.getElementById('income').value,
            preferred_language: document.getElementById('preferred_language').value,
            street: document.getElementById('street').value,
            city: city,
            zip_code: document.getElementById('zip_code').value,
            latitude: coords.latitude,
            longitude: coords.longitude
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
