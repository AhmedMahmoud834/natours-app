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

  const forgotPassword = async (email) => {
    try {
      const res = await fetch('/api/v1/users/forgetPassword', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      });

      const data = await res.json();

      if (res.ok && (data.status === 'success' || data.status === 'Success')) {
        showAlert('success', 'Reset link sent to your email!');
        const emailInput = document.getElementById('email');
        if (emailInput) emailInput.value = '';
      } else {
        showAlert('error', data.message || 'Error sending reset email!');
      }
    } catch (err) {
      showAlert('error', err.message || 'Error sending reset email!');
    }
  };

  const resetPassword = async (password, passwordConfirm, token) => {
    try {
      const res = await fetch(`/api/v1/users/resetPassword/${token}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ password, passwordConfirm }),
      });

      const data = await res.json();

      if (res.ok && (data.status === 'success' || data.status === 'Success')) {
        showAlert('success', 'Password reset successfully!');
        window.setTimeout(() => {
          location.assign('/');
        }, 1500);
      } else {
        showAlert('error', data.message || 'Error resetting password!');
      }
    } catch (err) {
      showAlert('error', err.message || 'Error resetting password!');
    }
  };

  const initAuth = () => {
    const forgotForm = document.querySelector('.form-forgot-password');
    const resetForm = document.querySelector('.form-reset-password');

    if (forgotForm) {
      forgotForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const emailInput = document.getElementById('email');
        const email = emailInput ? emailInput.value : '';
        forgotPassword(email);
      });
    }

    if (resetForm) {
      resetForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const passwordInput = document.getElementById('password');
        const passwordConfirmInput = document.getElementById('passwordConfirm');
        const password = passwordInput ? passwordInput.value : '';
        const passwordConfirm = passwordConfirmInput ? passwordConfirmInput.value : '';

        const token = window.location.pathname.split('/').pop();
        resetPassword(password, passwordConfirm, token);
      });
    }
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initAuth);
  } else {
    initAuth();
  }
})();
