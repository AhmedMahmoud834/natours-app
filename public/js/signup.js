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

  const signup = async (name, email, password, passwordConfirm) => {
    try {
      const res = await fetch('/api/v1/users/signup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name, email, password, passwordConfirm }),
      });

      const data = await res.json();

      if (res.ok && (data.status === 'success' || data.status === 'Success')) {
        showAlert('success', 'Account created successfully!');
        window.setTimeout(() => {
          location.assign('/');
        }, 1500);
      } else {
        showAlert('error', data.message || 'Error creating account! Try again.');
      }
    } catch (err) {
      showAlert('error', err.message || 'Error creating account! Try again.');
    }
  };

  const initSignup = () => {
    const signupForm = document.querySelector('.form--signup');
    if (signupForm) {
      signupForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const name = document.getElementById('name').value;
        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;
        const passwordConfirm = document.getElementById('passwordConfirm').value;

        if (password !== passwordConfirm) {
          showAlert('error', 'Passwords do not match!');
          return;
        }

        signup(name, email, password, passwordConfirm);
      });
    }
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initSignup);
  } else {
    initSignup();
  }
})();
