/* eslint-disable */
(() => {
  const hideAlert = () => {
    const el = document.querySelector('.alert');
    if (el && el.parentElement) el.parentElement.removeChild(el);
  };

  const showAlert = (type, msg) => {
    hideAlert();
    const markup = `<div class="alert alert--${type}">${msg}</div>`;
    document.body.insertAdjacentHTML('afterbegin', markup);
    window.setTimeout(hideAlert, 5000);
  };

  const login = async (email, password) => {
    try {
      const res = await fetch('/api/v1/users/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (res.ok && (data.status === 'success' || data.status === 'Success')) {
        showAlert('success', 'Logged in successfully!');
        window.setTimeout(() => {
          location.assign('/');
        }, 1500);
      } else {
        showAlert('error', data.message || 'Error logging in! Try again.');
      }
    } catch (err) {
      showAlert('error', err.message || 'Error logging in! Try again.');
    }
  };

  const initLogin = () => {
    const loginForm = document.querySelector('.form--login');
    if (loginForm) {
      loginForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const emailInput =
          document.getElementById('email') ||
          document.querySelector('.form__input--email');
        const passwordInput =
          document.getElementById('password') ||
          document.querySelector('.form__input--password');

        const email = emailInput ? emailInput.value : '';
        const password = passwordInput ? passwordInput.value : '';
        login(email, password);
      });
    }
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initLogin);
  } else {
    initLogin();
  }
})();
