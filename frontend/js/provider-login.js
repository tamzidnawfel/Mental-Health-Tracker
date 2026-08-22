/**
 * MindCare - Provider Login Script (provider-login.js)
 */

document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('providerLoginForm');
    const emailInput = document.getElementById('email');
    const passwordInput = document.getElementById('password');
    const loginBtn = document.getElementById('loginBtn');
    const alertBox = document.getElementById('alertBox');

    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            alertBox.style.display = 'none';
            alertBox.className = 'alert-box';
            alertBox.textContent = '';

            const email = emailInput.value.trim();
            const password = passwordInput.value.trim();

            if (!email || !password) {
                alertBox.textContent = 'Please enter your clinical email or name and password.';
                alertBox.className = 'alert-box alert-error';
                alertBox.style.display = 'block';
                return;
            }

            loginBtn.disabled = true;
            loginBtn.innerHTML = '<span>Verifying Credentials...</span>';

            try {
                const response = await fetch('http://localhost:3000/api/provider-login', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email, password })
                });

                const data = await response.json();

                if (response.ok) {
                    // Save provider session
                    sessionStorage.setItem('currentProvider', JSON.stringify(data.provider));
                    localStorage.setItem('currentProvider', JSON.stringify(data.provider));

                    alertBox.className = 'alert-box alert-success';
                    alertBox.textContent = `Login successful! Welcome, ${data.provider.name}. Entering clinical dashboard...`;
                    alertBox.style.display = 'block';

                    setTimeout(() => {
                        window.location.href = 'provider-dashboard.html';
                    }, 1000);
                } else {
                    alertBox.className = 'alert-box alert-error';
                    alertBox.textContent = data.error || 'Invalid credentials. Please verify your email and password.';
                    alertBox.style.display = 'block';
                    loginBtn.disabled = false;
                    loginBtn.innerHTML = '<span>Access Clinical Workspace</span><span class="login-icon-badge">➔</span>';
                }
            } catch (err) {
                console.error('Provider login error:', err);
                alertBox.className = 'alert-box alert-error';
                alertBox.textContent = 'Failed to connect to backend server. Please verify the server is running.';
                alertBox.style.display = 'block';
                loginBtn.disabled = false;
                loginBtn.innerHTML = '<span>Access Clinical Workspace</span><span class="login-icon-badge">➔</span>';
            }
        });
    }
});
