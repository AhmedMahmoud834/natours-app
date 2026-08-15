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

  const updateSettings = async (data, type) => {
    try {
      const url =
        type === 'password'
          ? '/api/v1/users/updatePassword'
          : '/api/v1/users/updateMe';

      const isFormData = data instanceof FormData;

      const options = {
        method: 'PATCH',
        body: isFormData ? data : JSON.stringify(data),
      };

      if (!isFormData) {
        options.headers = {
          'Content-Type': 'application/json',
        };
      }

      const res = await fetch(url, options);
      const resData = await res.json();

      if (res.ok && (resData.status === 'success' || resData.status === 'Success')) {
        showAlert('success', `${type.toUpperCase()} updated successfully!`);
        if (type === 'data') {
          window.setTimeout(() => {
            location.reload();
          }, 1500);
        }
      } else {
        showAlert('error', resData.message || `Error updating ${type}! Try again.`);
      }
    } catch (err) {
      showAlert('error', err.message || `Error updating ${type}! Try again.`);
    }
  };

  const initSettings = () => {
    const userDataForm = document.querySelector('.form-user-data');
    const userPasswordForm = document.querySelector('.form-user-password');

    if (userDataForm) {
      userDataForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const form = new FormData();
        form.append('name', document.getElementById('name').value);
        form.append('email', document.getElementById('email').value);
        const photoInput = document.getElementById('photo');
        if (photoInput && photoInput.files && photoInput.files[0]) {
          form.append('photo', photoInput.files[0]);
        }

        updateSettings(form, 'data');
      });
    }

    if (userPasswordForm) {
      userPasswordForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const saveBtn = document.querySelector('.btn--save-password');
        if (saveBtn) saveBtn.textContent = 'Updating...';

        const passwordCurrent = document.getElementById('password-current').value;
        const password = document.getElementById('password').value;
        const passwordConfirm = document.getElementById('password-confirm').value;

        await updateSettings(
          {
            passwordCurrent,
            password,
            passwordConfirm,
            currentPassword: passwordCurrent,
            newPassword: password,
            newPasswordConfirm: passwordConfirm,
          },
          'password',
        );

        if (saveBtn) saveBtn.textContent = 'Save password';
        document.getElementById('password-current').value = '';
        document.getElementById('password').value = '';
        document.getElementById('password-confirm').value = '';
      });
    }
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initSettings);
  } else {
    initSettings();
  }
})();
