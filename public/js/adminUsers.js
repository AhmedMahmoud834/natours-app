// SaaS Admin Users JS Logic

const DOM = {
  // Master List
  usersList: document.getElementById('users-list'),
  masterListView: document.getElementById('master-list-view'),
  btnActive: document.getElementById('filter-active'),
  btnInactive: document.getElementById('filter-inactive'),
  btnRefresh: document.getElementById('btn-refresh'),
  btnCreateNew: document.getElementById('btn-create-new'),

  // Details UI (Right Column)
  placeholder: document.getElementById('user-placeholder'),
  content: document.getElementById('user-content'),
  detailPhoto: document.getElementById('detail-photo'),
  detailName: document.getElementById('detail-name'),
  detailEmail: document.getElementById('detail-email'),
  detailRole: document.getElementById('detail-role'),
  detailStatus: document.getElementById('detail-status'),
  btnEditProfile: document.getElementById('edit-user-btn'),
  bookingsSection: document.getElementById('user-bookings-section'),
  reviewsSection: document.getElementById('user-reviews-section'),

  // Form UI (Left Column)
  userForm: document.getElementById('user-form'),
  formTitle: document.getElementById('form-title'),
  editName: document.getElementById('edit-name'),
  editEmail: document.getElementById('edit-email'),
  editRole: document.getElementById('edit-role'),
  editPassword: document.getElementById('edit-password'),
  editPasswordConfirm: document.getElementById('edit-password-confirm'),
  passwordGroup: document.getElementById('password-group'),
  passwordConfirmGroup: document.getElementById('password-confirm-group'),
  btnSave: document.getElementById('btn-save'),
  btnCancel: document.getElementById('btn-cancel'),
  btnStatusToggle: document.getElementById('btn-status'),

  // Pagination
  btnPrev: document.getElementById('btn-prev'),
  btnNext: document.getElementById('btn-next'),
  pageInfo: document.getElementById('page-info'),
  limitSelect: document.getElementById('limit-select'),
};

const userCache = {};
let currentUserId = null;
let currentMode = 'list'; // 'list', 'edit', 'create'
let currentPage = 1;
let currentLimit = 10;
let currentSortField = 'name';
let currentSortDirection = '';
let currentRole = '';

const hideAlert = () => {
  const el = document.querySelector('.alert');
  if (el) el.parentElement.removeChild(el);
};

const showAlert = (type, msg) => {
  hideAlert();
  const markup = `<div class="alert alert--${type}">${msg}</div>`;
  document.body.insertAdjacentHTML('afterbegin', markup);
  window.setTimeout(hideAlert, 5000);
};

const fetchJson = async (url, options = {}) => {
  const r = await fetch(url, options);
  if (!r.ok) {
    const errorData = await r.json().catch(() => ({}));
    throw new Error(errorData.message || 'Request failed');
  }
  if (r.status === 204) return null;
  return r.json();
};

const getUsers = async (isActive = true) => {
  try {
    DOM.usersList.innerHTML = '<p class="empty-msg">Loading users...</p>';

    const baseEndpoint = isActive ? '/api/v1/users' : '/api/v1/users/inActive';
    let endpoint = `${baseEndpoint}?page=${currentPage}&limit=${currentLimit}&sort=${currentSortDirection}${currentSortField}`;
    if (currentRole) endpoint += `&role=${currentRole}`;
    const res = await fetchJson(endpoint);
    const users =
      res?.data?.document ||
      res?.data?.Documents ||
      (Array.isArray(res?.data) ? res.data : []);

    DOM.usersList.innerHTML = '';

    const totalCount = res?.totalCount || 0;
    const totalPages = Math.ceil(totalCount / currentLimit) || 1;

    // Update pagination controls
    if (DOM.pageInfo) DOM.pageInfo.textContent = `Page ${currentPage} of ${totalPages}`;
    if (DOM.btnPrev) DOM.btnPrev.disabled = currentPage === 1;
    if (DOM.btnNext) DOM.btnNext.disabled = currentPage >= totalPages || totalCount === 0;

    if (!users || users.length === 0) {
      DOM.usersList.innerHTML = '<p class="empty-msg">No users found.</p>';
      return;
    }

    users.forEach((user) => {
      const li = document.createElement('li');
      li.className = 'data-card user-item';
      li.dataset.userId = user._id || user.id;

      const photo = user.photo ? user.photo : 'default.jpg';
      const roleStr = user.role === 'lead-guide' ? 'Lead Guide' : user.role;

      li.innerHTML = `
        <div style="display: flex; gap: 1.5rem; align-items: center;">
          <img src="/img/users/${photo}" alt="${user.name}" class="form__user-photo" style="width: 4rem; height: 4rem; border-radius: 50%;">
          <div>
            <h4 class="user-name">${user.name}</h4>
            <span class="user-role">${roleStr}</span>
          </div>
        </div>
      `;

      li.addEventListener('click', () => {
        document
          .querySelectorAll('.user-item')
          .forEach((el) => el.classList.remove('active'));
        li.classList.add('active');
        getUserDetails(user._id || user.id);
      });
      DOM.usersList.appendChild(li);
    });
  } catch (err) {
    showAlert('error', 'Error loading users.');
    DOM.usersList.innerHTML = '<p class="empty-msg">Error loading users.</p>';
  }
};

const renderUserDetails = (data) => {
  const { user, bookings, reviews } = data;
  const photo = user.photo ? user.photo : 'default.jpg';

  DOM.detailPhoto.src = `/img/users/${photo}`;
  DOM.detailPhoto.alt = user.name;
  DOM.detailName.textContent = user.name;
  DOM.detailEmail.textContent = user.email;
  DOM.detailEmail.title = user.email;
  DOM.detailEmail.setAttribute('title', user.email);

  const roleStr = user.role === 'lead-guide' ? 'Lead Guide' : user.role;
  DOM.detailRole.textContent = roleStr;
  DOM.detailRole.className = `badge badge--${user.role}`;

  // Status Badge
  const isActive = user.active !== false;
  DOM.detailStatus.textContent = isActive ? 'Active' : 'Inactive';
  DOM.detailStatus.className = `badge badge--${isActive ? 'active' : 'inactive'}`;

  // Inject dynamic Toggle Button
  const existingBtn = document.getElementById('toggle-active-btn');
  if (existingBtn) existingBtn.remove();

  const statusActionText = isActive ? 'Deactivate' : 'Activate';
  const statusActionColor = isActive
    ? 'border: 1px solid #ef4444; color: #ef4444;'
    : 'border: 1px solid #10b981; color: #10b981;';

  const toggleBtnHtml = `<button class="btn btn-small" id="toggle-active-btn" data-user-id="${user._id || user.id}" data-active="${isActive}" style="background: transparent; ${statusActionColor}">
       ${statusActionText}
     </button>`;

  DOM.btnEditProfile.insertAdjacentHTML('beforebegin', toggleBtnHtml);

  document
    .getElementById('toggle-active-btn')
    .addEventListener('click', async (e) => {
      const btn = e.target;
      const { userId } = btn.dataset;
      const currentActive = btn.dataset.active === 'true';

      if (currentActive) {
        // Deactivating directly
        const originalText = btn.textContent;
        btn.textContent = 'Deactivating...';
        try {
          await fetchJson(`/api/v1/users/${userId}/deactivate`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ active: false }),
          }).catch(() =>
            fetchJson(`/api/v1/users/${userId}`, {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ active: false }),
            }),
          );

          showAlert('success', 'User deactivated successfully!');
          if (userCache[userId]) userCache[userId].user.active = false;
          renderUserDetails(userCache[userId]);
          getUsers(DOM.btnActive.classList.contains('btn--primary'));
        } catch (err) {
          showAlert('error', err.message);
          btn.textContent = originalText;
        }
      } else {
        // Activating requires entering new password & email in the form
        setMode('edit');
      }
    });

  // Render Bookings
  let bookingsHtml = '';
  if (bookings && bookings.length > 0) {
    bookings.forEach((b) => {
      const date = new Date(b.createdAt).toLocaleDateString();
      const tourName =
        b.tour && b.tour.name ? b.tour.name : b.tour || 'Unknown Tour';
      const bId = b._id || b.id;
      const status = b.status || 'pending';
      const paymentOption = b.paymentOption || 'cash';
      const paid = b.paid === true;

      const paymentLabel =
        paymentOption === 'stripe'
          ? (paid ? 'Stripe • Paid' : 'Stripe • Unpaid')
          : (paid ? 'Cash • Paid' : 'Cash • Unpaid');

      let actionButtons = '';
      if (status === 'pending') {
        actionButtons = `
          <div class="booking-card-actions">
            <button type="button" class="btn-action btn-confirm btn-user-booking-action" data-booking-id="${bId}" data-action="confirm">✓ Confirm</button>
            <button type="button" class="btn-action btn-cancel-booking btn-user-booking-action" data-booking-id="${bId}" data-action="cancel">✕ Cancel</button>
          </div>
        `;
      } else if (status === 'confirmed' && paymentOption === 'cash') {
        actionButtons = `
          <div class="booking-card-actions">
            <button type="button" class="btn-action btn-cancel-booking btn-user-booking-action" data-booking-id="${bId}" data-action="cancel">✕ Cancel</button>
          </div>
        `;
      } else if (status === 'confirmed' && paymentOption === 'stripe' && paid) {
        actionButtons = `
          <div class="booking-card-actions">
            <button type="button" class="btn-action btn-refund btn-user-booking-action" data-booking-id="${bId}" data-action="refund">⟲ Refund (Stripe)</button>
          </div>
        `;
      }

      bookingsHtml += `
        <div class="booking-card booking-card--detailed">
          <div class="booking-card-header">
            <div>
              <div class="booking-card-title">${tourName}</div>
              <div class="booking-card-meta">
                <span>Booked: ${date}</span>
                <span>•</span>
                <span>${paymentLabel}</span>
              </div>
            </div>
            <div class="booking-card-price-status">
              <span class="booking-card-price">$${b.price}</span>
              <span class="booking-card-badge booking-card-badge--${status}">${status}</span>
            </div>
          </div>
          ${actionButtons}
        </div>
      `;
    });
  } else {
    bookingsHtml += `<p class="empty-msg">No bookings found.</p>`;
  }
  DOM.bookingsSection.innerHTML = bookingsHtml;

  // Render Reviews
  let reviewsHtml = '';
  if (reviews && reviews.length > 0) {
    reviews.forEach((r) => {
      const tourName = r.tour && r.tour.name ? r.tour.name : 'A Tour';
      reviewsHtml += `
        <div class="review-card" style="flex-direction: column; align-items: flex-start;">
          <div style="display: flex; justify-content: space-between; width: 100%; align-items: center;">
            <strong>${tourName}</strong>
            <span style="color: #FF6B35;">★ ${r.rating}</span>
          </div>
          <p class="review-text" style="margin-top:0.8rem; font-style:italic;">"${r.review}"</p>
        </div>
      `;
    });
  } else {
    reviewsHtml += `<p class="empty-msg">No reviews found.</p>`;
  }
  DOM.reviewsSection.innerHTML = reviewsHtml;

  DOM.placeholder.style.display = 'none';
  DOM.content.style.display = 'block';
};

const getUserDetails = async (userId) => {
  currentUserId = userId;
  setMode('list');

  DOM.placeholder.style.display = 'block';
  DOM.placeholder.innerHTML = '<span class="spinner"></span> Loading...';
  DOM.content.style.display = 'none';

  if (userCache[userId]) {
    return renderUserDetails(userCache[userId]);
  }

  try {
    const [userRes, bookingsRes, reviewsRes] = await Promise.all([
      fetchJson(`/api/v1/users/${userId}`),
      fetchJson(`/api/v1/bookings?user=${userId}`).catch(() => ({
        data: { document: [] },
      })),
      fetchJson(`/api/v1/reviews?user=${userId}`).catch(() => ({
        data: { document: [] },
      })),
    ]);

    const user =
      userRes?.data?.document || userRes?.data?.user || userRes?.data;
    const bookings =
      bookingsRes?.data?.document ||
      bookingsRes?.data?.Documents ||
      (Array.isArray(bookingsRes?.data) ? bookingsRes.data : []);
    const reviews =
      reviewsRes?.data?.document ||
      reviewsRes?.data?.Documents ||
      (Array.isArray(reviewsRes?.data) ? reviewsRes.data : []);

    const data = { user, bookings, reviews };
    userCache[userId] = data;

    renderUserDetails(data);
  } catch (err) {
    DOM.placeholder.innerHTML =
      '<span style="color:#FF6B35;">Error loading user details.</span>';
  }
};

const setMode = (mode) => {
  currentMode = mode;

  const passwordLabel = document.getElementById('password-label');
  const passwordConfirmLabel = document.getElementById(
    'password-confirm-label',
  );

  if (mode === 'list') {
    DOM.masterListView.style.display = 'block';
    DOM.userForm.style.display = 'none';
  } else if (mode === 'create') {
    DOM.masterListView.style.display = 'none';
    DOM.userForm.style.display = 'block';
    DOM.formTitle.textContent = 'Create New User';

    // Clear form
    DOM.editName.value = '';
    DOM.editEmail.value = '';
    DOM.editRole.value = 'user';
    DOM.editPassword.value = '';
    DOM.editPasswordConfirm.value = '';

    // Show passwords
    DOM.passwordGroup.style.display = 'block';
    DOM.passwordConfirmGroup.style.display = 'block';
    if (passwordLabel) passwordLabel.textContent = 'Password';
    if (passwordConfirmLabel)
      passwordConfirmLabel.textContent = 'Confirm Password';
    DOM.editPassword.required = true;
    DOM.editPasswordConfirm.required = true;

    DOM.btnStatusToggle.style.display = 'none';
    DOM.btnSave.textContent = 'Create User';
    DOM.btnSave.style.backgroundColor = '#FF6B35';
  } else if (mode === 'edit') {
    DOM.masterListView.style.display = 'none';
    DOM.userForm.style.display = 'block';

    const user = userCache[currentUserId]?.user;
    if (!user) return;

    DOM.editName.value = user.name || '';
    DOM.editEmail.value = user.email || '';
    DOM.editRole.value = user.role || 'user';

    const isActive = user.active !== false;

    if (!isActive) {
      // Inactive user: password is auto-generated and emailed
      DOM.formTitle.textContent = 'Activate User';
      DOM.passwordGroup.style.display = 'none';
      DOM.passwordConfirmGroup.style.display = 'none';
      DOM.editPassword.required = false;
      DOM.editPasswordConfirm.required = false;

      DOM.btnStatusToggle.style.display = 'none';
      DOM.btnSave.textContent = 'Activate User & Send Email';
      DOM.btnSave.style.backgroundColor = '#10b981';
    } else {
      // Active user: regular edit
      DOM.formTitle.textContent = 'Edit User';
      DOM.passwordGroup.style.display = 'none';
      DOM.passwordConfirmGroup.style.display = 'none';
      DOM.editPassword.required = false;
      DOM.editPasswordConfirm.required = false;

      DOM.btnStatusToggle.style.display = 'inline-block';
      DOM.btnStatusToggle.textContent = 'Deactivate User';
      DOM.btnStatusToggle.className = 'btn btn--small btn-deactivate';
      DOM.btnSave.textContent = 'Save Changes';
      DOM.btnSave.style.backgroundColor = '#FF6B35';
    }
  }
};

const saveUser = async (e) => {
  e.preventDefault();

  const originalBtnText = DOM.btnSave.textContent;
  DOM.btnSave.textContent = 'Saving...';

  try {
    if (currentMode === 'create') {
      const data = {
        name: DOM.editName.value,
        email: DOM.editEmail.value,
        role: DOM.editRole.value,
        password: DOM.editPassword.value,
        passwordConfirm: DOM.editPasswordConfirm.value,
      };

      if (data.password !== data.passwordConfirm) {
        throw new Error('Passwords do not match');
      }

      await fetchJson('/api/v1/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      showAlert('success', 'User created successfully!');
      setMode('list');
      getUsers(DOM.btnActive.classList.contains('btn--primary'));
    } else if (currentMode === 'edit') {
      if (!currentUserId) return;
      const user = userCache[currentUserId]?.user;
      const isActive = user?.active !== false;

      if (!isActive) {
        // Activating User
        const email = DOM.editEmail.value;

        if (!email) {
          throw new Error('Email is required for activation.');
        }

        const payload = { email };

        const res = await fetchJson(`/api/v1/users/${currentUserId}/activate`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        }).catch(() =>
          fetchJson(`/api/v1/users/${currentUserId}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          }),
        );

        const updatedUser = res?.data?.user ||
          res?.data?.document ||
          res?.data || { ...user, email, active: true };
        if (userCache[currentUserId]) {
          userCache[currentUserId].user = {
            ...userCache[currentUserId].user,
            ...updatedUser,
            active: true,
            email,
          };
        }

        showAlert('success', 'User activated and credentials emailed successfully!');
        setMode('list');
        renderUserDetails(userCache[currentUserId]);
        getUsers(DOM.btnActive.classList.contains('btn--primary'));
      } else {
        // Normal profile update
        const data = {
          name: DOM.editName.value,
          email: DOM.editEmail.value,
          role: DOM.editRole.value,
        };

        const res = await fetchJson(`/api/v1/users/${currentUserId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data),
        });

        const updatedUser =
          res?.data?.updatedDoc || res?.data?.user || res?.data || data;

        // Update Cache
        if (userCache[currentUserId]) {
          userCache[currentUserId].user = {
            ...userCache[currentUserId].user,
            ...updatedUser,
          };
        }

        showAlert('success', 'User updated successfully!');
        setMode('list');
        renderUserDetails(userCache[currentUserId]);

        // Update master list item
        const listItem = document.querySelector(
          `.user-item[data-user-id="${currentUserId}"]`,
        );
        if (listItem) {
          const nameEl = listItem.querySelector('h4');
          const roleEl = listItem.querySelector('span');
          if (nameEl) nameEl.textContent = updatedUser.name;
          if (roleEl) {
            const roleStr =
              updatedUser.role === 'lead-guide'
                ? 'Lead Guide'
                : updatedUser.role;
            roleEl.textContent = roleStr;
          }
        }
      }
    }
  } catch (err) {
    showAlert('error', err.message);
  } finally {
    DOM.btnSave.textContent = originalBtnText;
  }
};

const toggleUserStatus = async () => {
  if (!currentUserId || !userCache[currentUserId]) return;

  const { user } = userCache[currentUserId];
  const currentStatus = user.active !== false;

  if (currentStatus) {
    // Deactivate user
    const originalBtnText = DOM.btnStatusToggle.textContent;
    DOM.btnStatusToggle.textContent = 'Updating...';

    try {
      await fetchJson(`/api/v1/users/${currentUserId}/deactivate`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ active: false }),
      }).catch(() =>
        fetchJson(`/api/v1/users/${currentUserId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ active: false }),
        }),
      );

      user.active = false;
      showAlert('success', 'User deactivated successfully!');
      setMode('list');
      renderUserDetails(userCache[currentUserId]);
      getUsers(DOM.btnActive.classList.contains('btn--primary'));
    } catch (err) {
      showAlert('error', err.message);
    } finally {
      DOM.btnStatusToggle.textContent = originalBtnText;
    }
  }
};

// Event Listeners
if (DOM.usersList) {
  const getIsActiveFilter = () =>
    DOM.btnActive.classList.contains('btn--primary');

  DOM.btnActive.addEventListener('click', () => {
    DOM.btnActive.classList.add('btn--primary');
    DOM.btnActive.classList.remove('btn-outline');
    DOM.btnInactive.classList.add('btn-outline');
    DOM.btnInactive.classList.remove('btn--primary');
    currentPage = 1;
    getUsers(true);
  });

  DOM.btnInactive.addEventListener('click', () => {
    DOM.btnInactive.classList.add('btn--primary');
    DOM.btnInactive.classList.remove('btn-outline');
    DOM.btnActive.classList.add('btn-outline');
    DOM.btnActive.classList.remove('btn--primary');
    currentPage = 1;
    getUsers(false);
  });

  if (DOM.btnPrev) {
    DOM.btnPrev.addEventListener('click', () => {
      if (currentPage > 1) {
        currentPage--;
        getUsers(getIsActiveFilter());
      }
    });
  }

  if (DOM.btnNext) {
    DOM.btnNext.addEventListener('click', () => {
      currentPage++;
      getUsers(getIsActiveFilter());
    });
  }

  if (DOM.limitSelect) {
    DOM.limitSelect.addEventListener('change', (e) => {
      currentLimit = parseInt(e.target.value, 10);
      currentPage = 1;
      getUsers(getIsActiveFilter());
    });
  }

  // Sorting & Filtering change
  const filterRole = document.getElementById('filter-role');
  if (filterRole) {
    filterRole.addEventListener('change', (e) => {
      currentRole = e.target.value;
      currentPage = 1; 
      getUsers(getIsActiveFilter());
    });
  }

  const sortField = document.getElementById('sort-field');
  if (sortField) {
    sortField.addEventListener('change', (e) => {
      currentSortField = e.target.value;
      currentPage = 1; 
      getUsers(getIsActiveFilter());
    });
  }

  const sortDirection = document.getElementById('sort-direction');
  if (sortDirection) {
    sortDirection.addEventListener('click', (e) => {
      e.preventDefault();
      const currentDir = e.target.dataset.direction;
      if (currentDir === '') {
        e.target.dataset.direction = '-';
        e.target.innerHTML = '&darr; DESC';
        currentSortDirection = '-';
      } else {
        e.target.dataset.direction = '';
        e.target.innerHTML = '&uarr; ASC';
        currentSortDirection = '';
      }
      currentPage = 1; 
      getUsers(getIsActiveFilter());
    });
  }

  // Refresh Button
  if (DOM.btnRefresh) {
    DOM.btnRefresh.addEventListener('click', () => {
      getUsers(getIsActiveFilter());
    });
  }

  DOM.btnCreateNew.addEventListener('click', () => setMode('create'));

const handleUserBookingAction = async (e) => {
  const btn = e.target.closest('.btn-user-booking-action');
  if (!btn) return;

  const { bookingId, action } = btn.dataset;
  if (!bookingId || !action) return;

  const confirmMsg =
    action === 'cancel'
      ? 'Are you sure you want to cancel this booking?'
      : action === 'refund'
        ? 'Are you sure you want to issue a full refund via Stripe?'
        : 'Are you sure you want to confirm this booking?';

  if (!confirm(confirmMsg)) return;

  const originalText = btn.textContent;
  btn.disabled = true;
  btn.textContent = 'Processing...';

  try {
    await fetchJson(`/api/v1/bookings/${bookingId}/${action}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
    });

    const successMsg =
      action === 'confirm'
        ? 'Booking confirmed successfully!'
        : action === 'cancel'
          ? 'Booking cancelled successfully!'
          : 'Booking refunded successfully via Stripe!';

    showAlert('success', successMsg);

    if (currentUserId) {
      delete userCache[currentUserId];
      getUserDetails(currentUserId);
    }
  } catch (err) {
    showAlert('error', err.message);
    btn.textContent = originalText;
    btn.disabled = false;
  }
};

  DOM.btnEditProfile.addEventListener('click', () => setMode('edit'));

  DOM.btnCancel.addEventListener('click', () => setMode('list'));

  DOM.userForm.addEventListener('submit', saveUser);

  DOM.btnStatusToggle.addEventListener('click', toggleUserStatus);

  if (DOM.bookingsSection) {
    DOM.bookingsSection.addEventListener('click', handleUserBookingAction);
  }

  // Init
  getUsers(true);
}
