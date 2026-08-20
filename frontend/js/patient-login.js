document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('loginForm');
    const emailInput = document.getElementById('email');
    const passwordInput = document.getElementById('password');
    const loginBtn = document.getElementById('loginBtn');
    const alertBox = document.getElementById('alertBox');

    function showAlert(message, type = 'error') {
        alertBox.textContent = message;
        alertBox.className = `alert-box ${type}`;
        alertBox.style.display = 'flex';
    }

    function hideAlert() {
        alertBox.style.display = 'none';
        alertBox.textContent = '';
    }

    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        hideAlert();

        const email = emailInput.value.trim();
        const password = passwordInput.value.trim();

        if (!email) {
            showAlert('Please enter your registered email address.', 'error');
            emailInput.focus();
            return;
        }

        if (!password) {
            showAlert('Please enter your password.', 'error');
            passwordInput.focus();
            return;
        }

        loginBtn.disabled = true;
        loginBtn.innerHTML = '<span>Verifying credentials...</span>';

        try {
            const response = await fetch('http://localhost:3000/api/patient-login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    email: email,
                    password: password
                })
            });

            const data = await response.json();

            if (response.ok) {
                showAlert(`✓ Login successful! Welcome back, ${data.patient.name}.`, 'success');
                
                // Store authenticated session
                sessionStorage.setItem('currentPatient', JSON.stringify(data.patient));
                localStorage.setItem('currentPatient', JSON.stringify(data.patient));

                loginBtn.innerHTML = '<span>Redirecting to Home...</span> <span class="login-icon-badge">✓</span>';

                setTimeout(() => {
                    window.location.href = 'home.html';
                }, 800);
            } else {
                showAlert(data.error || 'Incorrect email or password.', 'error');
                loginBtn.disabled = false;
                loginBtn.innerHTML = '<span>Login &amp; Enter</span> <span class="login-icon-badge">➔</span>';
                passwordInput.value = '';
                passwordInput.focus();
            }
        } catch (error) {
            console.error('Login request error:', error);
            showAlert('Failed to connect to server. Please try again.', 'error');
            loginBtn.disabled = false;
            loginBtn.innerHTML = '<span>Login &amp; Enter</span> <span class="login-icon-badge">➔</span>';
        }
    });
});
