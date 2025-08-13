document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('signupForm');
    const googleBtn = document.getElementById('google');

    // Handle normal signup
    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        const formData = {
            username: form.username.value.trim(),
            email: form.email.value.trim(),
            password: form.password.value.trim(),
            confirmPassword: form.confirmPassword.value.trim()
        };

        try {
            const res = await fetch('/api/auth/signup', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            });

            const data = await res.json();

            if (res.ok) {
                alert('Signup successful! Redirecting to login...');
                window.location.href = '/login.html';
            } else {
                alert(data.message || 'Signup failed');
            }
        } catch (err) {
            console.error(err);
            alert('Error connecting to server');
        }
    });

    // Handle Google signup
    googleBtn.addEventListener('click', (e) => {
        e.preventDefault();
        window.location.href = '/api/auth/google'; // Redirect to backend Google OAuth
    });
});
