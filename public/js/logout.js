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

  const logout = async () => {
    try {
      const res = await fetch('/api/v1/users/logout', {
        method: 'GET',
      });
      const data = await res.json();

      if (res.ok && (data.status === 'success' || data.status === 'Success')) {
        location.assign('/');
      } else {
        showAlert('error', 'Error logging out! Try again.');
      }
    } catch (err) {
      showAlert('error', 'Error logging out! Try again.');
    }
  };

  const initLogout = () => {
    const logoutBtn = document.querySelector('.header__nav-link--logout');
    if (logoutBtn) {
      logoutBtn.addEventListener('click', (e) => {
        e.preventDefault();
        logout();
      });
    }
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initLogout);
  } else {
    initLogout();
  }
})();
