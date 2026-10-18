(() => {
  'use strict';

  // TODO: point this at your dashboard page
  const DASHBOARD_URL = 'Dashboard/dashboard.html';

  const form = document.getElementById('loginForm');
  const email = document.getElementById('email');
  const password = document.getElementById('password');
  const emailError = document.getElementById('emailError');
  const passwordError = document.getElementById('passwordError');
  const toggle = document.querySelector('.toggle-password');

  const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  function setError(input, errorEl, message) {
    errorEl.textContent = message;
    if (message) {
      input.setAttribute('aria-invalid', 'true');
    } else {
      input.removeAttribute('aria-invalid');
    }
  }

  function validate() {
    let firstInvalid = null;

    const emailValue = email.value.trim();
    if (!emailValue) {
      setError(email, emailError, 'Enter your email address.');
      firstInvalid = firstInvalid || email;
    } else if (!EMAIL_PATTERN.test(emailValue)) {
      setError(email, emailError, 'Enter a valid email address, like name@company.com.');
      firstInvalid = firstInvalid || email;
    } else {
      setError(email, emailError, '');
    }

    if (!password.value) {
      setError(password, passwordError, 'Enter your password.');
      firstInvalid = firstInvalid || password;
    } else {
      setError(password, passwordError, '');
    }

    if (firstInvalid) firstInvalid.focus();
    return !firstInvalid;
  }

  // Show / hide password
  toggle.addEventListener('click', () => {
    const show = password.type === 'password';
    password.type = show ? 'text' : 'password';
    toggle.setAttribute('aria-pressed', String(show));
    toggle.setAttribute('aria-label', show ? 'Hide password' : 'Show password');
  });

  // Clear a field's error as soon as the user edits it
  email.addEventListener('input', () => setError(email, emailError, ''));
  password.addEventListener('input', () => setError(password, passwordError, ''));

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    if (!validate()) return;

    // TODO: replace with real authentication (check the credentials against
    // your user data before redirecting). This only validates the format.
    window.location.href = DASHBOARD_URL;
  });
})();
