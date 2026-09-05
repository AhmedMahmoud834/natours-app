// SaaS Admin Bookings JS Logic

const DOM = {
  // Master List View
  masterListView: document.getElementById('master-list-view'),
  bookingsList: document.getElementById('bookings-list'),
  filterStatus: document.getElementById('filter-status'),
  btnRefresh: document.getElementById('btn-refresh'),
  btnCreateNew: document.getElementById('btn-create-new'),
  sortField: document.getElementById('sort-field'),
  sortDirection: document.getElementById('sort-direction'),

  // Pagination
  btnPrev: document.getElementById('btn-prev'),
  btnNext: document.getElementById('btn-next'),
  pageInfo: document.getElementById('page-info'),
  limitSelect: document.getElementById('limit-select'),

  // Form View (Create Booking)
  bookingForm: document.getElementById('booking-form'),
  formTitle: document.getElementById('form-title'),
  createTour: document.getElementById('create-tour'),
  createUser: document.getElementById('create-user'),
  createPrice: document.getElementById('create-price'),
  createParticipants: document.getElementById('create-participants'),
  createPaymentOption: document.getElementById('create-payment-option'),
  createStatus: document.getElementById('create-status'),
  btnSave: document.getElementById('btn-save'),
  btnCancel: document.getElementById('btn-cancel'),

  // Details Pane
  placeholder: document.getElementById('booking-placeholder'),
  content: document.getElementById('booking-content'),
  detailTourName: document.getElementById('detail-tour-name'),
  detailUserName: document.getElementById('detail-user-name'),
  detailPaymentOption: document.getElementById('detail-payment-option'),
  detailStatus: document.getElementById('detail-status'),

  // Stats Grid
  statTour: document.getElementById('stat-tour'),
  statUser: document.getElementById('stat-user'),
  statParticipants: document.getElementById('stat-participants'),
  statPrice: document.getElementById('stat-price'),
  statDate: document.getElementById('stat-date'),
  statPayment: document.getElementById('stat-payment'),
  statStatus: document.getElementById('stat-status'),

  // Action Buttons container
  bookingActions: document.getElementById('booking-actions'),
};

const bookingCache = {};
let currentBookingId = null;
let currentMode = 'list'; // 'list' or 'create'
let currentPage = 1;
let currentLimit = 10;
let currentSortField = 'createdAt';
let currentSortDirection = '-';
let currentStatusFilter = '';

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

const fetchJson = async (url, options = {}) => {
  const r = await fetch(url, options);
  if (!r.ok) {
    const errorData = await r.json().catch(() => ({}));
    throw new Error(errorData.message || 'Request failed');
  }
  if (r.status === 204) return null;
  return r.json();
};

const setMode = (mode) => {
  currentMode = mode;
  if (mode === 'list') {
    DOM.masterListView.style.display = 'block';
    DOM.bookingForm.style.display = 'none';
  } else if (mode === 'create') {
    DOM.masterListView.style.display = 'none';
    DOM.bookingForm.style.display = 'block';
    DOM.bookingForm.reset();
    DOM.createTour.focus();
  }
};

// Populate Tours & Users dropdowns for the Create Form
const fetchToursAndUsers = async () => {
  try {
    const [toursRes, usersRes] = await Promise.all([
      fetchJson('/api/v1/tours?limit=1000&sort=name'),
      fetchJson('/api/v1/users?limit=1000&sort=name'),
    ]);

    const tours = toursRes?.data?.document || toursRes?.data?.Documents || toursRes?.data || [];
    const users = usersRes?.data?.document || usersRes?.data?.Documents || usersRes?.data || [];

    // Populate Tours
    DOM.createTour.innerHTML = '<option value="">-- Select a Tour --</option>';
    tours.forEach((t) => {
      const tourId = t._id || t.id;
      const opt = document.createElement('option');
      opt.value = tourId;
      opt.textContent = `${t.name} ($${t.price})`;
      DOM.createTour.appendChild(opt);
    });

    // Populate Users
    DOM.createUser.innerHTML = '<option value="">-- Select a Customer --</option>';
    users.forEach((u) => {
      const userId = u._id || u.id;
      const opt = document.createElement('option');
      opt.value = userId;
      opt.textContent = `${u.name} (${u.email})`;
      DOM.createUser.appendChild(opt);
    });
  } catch (err) {
    showAlert('error', `Failed to load tours/users: ${err.message}`);
  }
};

// Fetch Bookings list with filters, sorting, and pagination
const getBookings = async () => {
  try {
    DOM.bookingsList.innerHTML = '<p class="empty-msg">Loading bookings...</p>';

    let endpoint = `/api/v1/bookings?page=${currentPage}&limit=${currentLimit}&sort=${currentSortDirection}${currentSortField}`;
    if (currentStatusFilter) {
      endpoint += `&status=${currentStatusFilter}`;
    }

    const res = await fetchJson(endpoint);
    const bookings = res?.data?.document || res?.data?.Documents || res?.data || [];

    DOM.bookingsList.innerHTML = '';

    const totalCount = res?.totalCount || bookings.length;
    const totalPages = Math.ceil(totalCount / currentLimit) || 1;

    // Update pagination controls
    if (DOM.pageInfo) DOM.pageInfo.textContent = `Page ${currentPage} of ${totalPages}`;
    if (DOM.btnPrev) DOM.btnPrev.disabled = currentPage === 1;
    if (DOM.btnNext) DOM.btnNext.disabled = currentPage >= totalPages || totalCount === 0;

    if (!bookings || bookings.length === 0) {
      DOM.bookingsList.innerHTML = '<p class="empty-msg">No bookings found.</p>';
      return;
    }

    bookings.forEach((b) => {
      const bookingId = b._id || b.id;
      bookingCache[bookingId] = b;

      const li = document.createElement('li');
      li.className = 'tour-item booking-item';
      li.dataset.bookingId = bookingId;
      if (currentBookingId === bookingId) li.classList.add('active');

      const tourName = b.tour?.name || (typeof b.tour === 'string' ? 'Tour' : 'Unknown Tour');
      const userName = b.user?.name || (typeof b.user === 'string' ? 'Customer' : 'Unknown Customer');
      const paymentOpt = b.paymentOption ? b.paymentOption.toUpperCase() : 'CASH';
      const statusClass = b.status ? b.status.toLowerCase() : 'pending';

      li.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: center; width: 100%; min-width: 0; gap: 1rem;">
          <div style="flex: 1; min-width: 0; overflow: hidden;">
            <h4 class="tour-name" style="margin: 0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; color: #f8f9fa; font-weight: 600; font-size: 1.5rem;">${tourName}</h4>
            <span class="tour-meta" style="color: rgba(255, 255, 255, 0.75); font-size: 1.2rem;">
              ${userName} &bull; <strong style="color: #ff6b35;">$${b.price}</strong> &bull; ${b.participants || 1} ${(b.participants || 1) === 1 ? 'ticket' : 'tickets'} &bull; ${paymentOpt}
            </span>
          </div>
          <span class="badge badge--${statusClass}" style="flex-shrink: 0;">${b.status}</span>
        </div>
      `;

      li.addEventListener('click', () => {
        document.querySelectorAll('.booking-item').forEach((el) => el.classList.remove('active'));
        li.classList.add('active');
        getBookingDetails(bookingId);
      });

      DOM.bookingsList.appendChild(li);
    });
  } catch (err) {
    showAlert('error', `Error loading bookings: ${err.message}`);
    DOM.bookingsList.innerHTML = '<p class="empty-msg">Error loading bookings.</p>';
  }
};

// Render Booking Details & Conditional Action Buttons
const renderBookingDetails = (booking) => {
  const bookingId = booking._id || booking.id;
  const tourName = booking.tour?.name || 'Tour Details';
  const userName = booking.user?.name || 'Customer';
  const userEmail = booking.user?.email ? `(${booking.user.email})` : '';
  const status = booking.status || 'pending';
  const paymentOption = booking.paymentOption || 'cash';
  const paid = booking.paid === true;

  DOM.detailTourName.textContent = tourName;
  DOM.detailUserName.textContent = `${userName} ${userEmail}`;

  DOM.detailPaymentOption.textContent = paymentOption.toUpperCase();
  DOM.detailPaymentOption.className = `badge badge--${paymentOption.toLowerCase()}`;

  DOM.detailStatus.textContent = status.toUpperCase();
  DOM.detailStatus.className = `badge badge--${status.toLowerCase()}`;

  // Populate Stats Grid
  DOM.statTour.textContent = tourName;
  DOM.statUser.textContent = `${userName} ${userEmail}`;
  if (DOM.statParticipants) {
    DOM.statParticipants.textContent = `${booking.participants || 1} ${(booking.participants || 1) === 1 ? 'ticket' : 'tickets'}`;
  }
  DOM.statPrice.textContent = `$${booking.price}`;
  DOM.statDate.textContent = booking.createdAt
    ? new Date(booking.createdAt).toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    : 'N/A';
  DOM.statPayment.textContent = `${paymentOption.toUpperCase()} (${paid ? 'Paid' : 'Unpaid'})`;
  DOM.statStatus.innerHTML = `<span class="badge badge--${status.toLowerCase()}">${status}</span>`;

  // Dynamic Conditional Action Buttons Logic
  renderActionButtons(bookingId, status, paymentOption, paid);

  DOM.placeholder.style.display = 'none';
  DOM.content.style.display = 'block';
};

// Generate and attach event listeners to state-transition action buttons
const renderActionButtons = (bookingId, status, paymentOption, paid) => {
  DOM.bookingActions.innerHTML = '';
  let actionsHtml = '';

  // Rule 1: If status === 'pending' -> Render [Confirm Booking] (green) and [Cancel Booking] (red)
  if (status === 'pending') {
    actionsHtml = `
      <button class="btn-action btn-confirm" id="btn-action-confirm" data-booking-id="${bookingId}">
        ✓ Confirm Booking
      </button>
      <button class="btn-action btn-cancel-booking" id="btn-action-cancel" data-booking-id="${bookingId}">
        ✕ Cancel Booking
      </button>
    `;
  }
  // Rule 2: If status === 'confirmed' AND paymentOption === 'cash' -> Render [Cancel Booking] (red)
  else if (status === 'confirmed' && paymentOption === 'cash') {
    actionsHtml = `
      <button class="btn-action btn-cancel-booking" id="btn-action-cancel" data-booking-id="${bookingId}">
        ✕ Cancel Booking
      </button>
    `;
  }
  // Rule 3: If status === 'confirmed' AND paymentOption === 'stripe' AND paid === true -> Render [Refund Booking] (orange/amber)
  else if (status === 'confirmed' && paymentOption === 'stripe' && paid === true) {
    actionsHtml = `
      <button class="btn-action btn-refund" id="btn-action-refund" data-booking-id="${bookingId}">
        ⟲ Refund Booking (Stripe)
      </button>
    `;
  }
  // Rule 4: Otherwise -> Render no action buttons
  else {
    actionsHtml = `<p class="empty-msg" style="padding: 0; margin: 0;">No further actions available for this booking.</p>`;
  }

  DOM.bookingActions.innerHTML = actionsHtml;

  // Attach Listeners
  const btnConfirm = document.getElementById('btn-action-confirm');
  if (btnConfirm) {
    btnConfirm.addEventListener('click', async () => {
      await handleBookingAction(bookingId, 'confirm', 'Booking confirmed successfully!');
    });
  }

  const btnCancel = document.getElementById('btn-action-cancel');
  if (btnCancel) {
    btnCancel.addEventListener('click', async () => {
      if (!confirm('Are you sure you want to cancel this booking?')) return;
      await handleBookingAction(bookingId, 'cancel', 'Booking cancelled successfully!');
    });
  }

  const btnRefund = document.getElementById('btn-action-refund');
  if (btnRefund) {
    btnRefund.addEventListener('click', async () => {
      if (!confirm('Are you sure you want to issue a full refund via Stripe?')) return;
      await handleBookingAction(bookingId, 'refund', 'Booking refunded successfully via Stripe!');
    });
  }
};

// Unified action handler calling PATCH /api/v1/bookings/:id/:action
const handleBookingAction = async (bookingId, action, successMessage) => {
  try {
    const res = await fetchJson(`/api/v1/bookings/${bookingId}/${action}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
    });

    const updatedBooking = res?.data?.booking || res?.data?.updatedDoc || res?.data;
    if (updatedBooking) {
      bookingCache[bookingId] = updatedBooking;
      renderBookingDetails(updatedBooking);
    } else {
      getBookingDetails(bookingId);
    }

    showAlert('success', successMessage);
    getBookings();
  } catch (err) {
    showAlert('error', err.message);
  }
};

const getBookingDetails = async (bookingId) => {
  currentBookingId = bookingId;
  setMode('list');

  if (bookingCache[bookingId]) {
    renderBookingDetails(bookingCache[bookingId]);
    return;
  }

  try {
    DOM.placeholder.style.display = 'block';
    DOM.placeholder.innerHTML = '<p class="empty-msg">Loading booking details...</p>';
    DOM.content.style.display = 'none';

    const res = await fetchJson(`/api/v1/bookings/${bookingId}`);
    const booking = res?.data?.booking || res?.data?.document || res?.data?.Documents?.[0] || res?.data;

    if (!booking) throw new Error('Booking not found');

    bookingCache[bookingId] = booking;
    renderBookingDetails(booking);
  } catch (err) {
    showAlert('error', `Failed to load booking details: ${err.message}`);
    DOM.placeholder.innerHTML = '<p class="empty-msg">Error loading booking details.</p>';
  }
};

// Event Listeners setup on DOM Ready
document.addEventListener('DOMContentLoaded', () => {
  // Load Tours and Users for the Create form
  fetchToursAndUsers();

  // Load initial bookings
  getBookings();

  // Filter Status
  DOM.filterStatus.addEventListener('change', (e) => {
    currentStatusFilter = e.target.value;
    currentPage = 1;
    getBookings();
  });

  // Refresh Button
  DOM.btnRefresh.addEventListener('click', () => {
    getBookings();
  });

  // Create New Booking Button
  DOM.btnCreateNew.addEventListener('click', () => {
    setMode('create');
  });

  // Cancel Button in Form
  DOM.btnCancel.addEventListener('click', () => {
    setMode('list');
  });

  // Sort Field
  DOM.sortField.addEventListener('change', (e) => {
    currentSortField = e.target.value;
    currentPage = 1;
    getBookings();
  });

  // Sort Direction Toggle
  DOM.sortDirection.addEventListener('click', (e) => {
    if (currentSortDirection === '-') {
      currentSortDirection = '';
      DOM.sortDirection.innerHTML = '&uarr; ASC';
      DOM.sortDirection.dataset.direction = '';
    } else {
      currentSortDirection = '-';
      DOM.sortDirection.innerHTML = '&darr; DESC';
      DOM.sortDirection.dataset.direction = '-';
    }
    currentPage = 1;
    getBookings();
  });

  // Rows Limit
  DOM.limitSelect.addEventListener('change', (e) => {
    currentLimit = parseInt(e.target.value, 10);
    currentPage = 1;
    getBookings();
  });

  // Pagination Prev / Next
  DOM.btnPrev.addEventListener('click', () => {
    if (currentPage > 1) {
      currentPage--;
      getBookings();
    }
  });

  DOM.btnNext.addEventListener('click', () => {
    currentPage++;
    getBookings();
  });

  // Create Booking Form Submission
  DOM.bookingForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const tourId = DOM.createTour.value;
    const userId = DOM.createUser.value;
    const paymentOption = DOM.createPaymentOption.value;
    const status = DOM.createStatus.value;
    const priceVal = DOM.createPrice.value.trim();
    const participantsVal = DOM.createParticipants ? parseInt(DOM.createParticipants.value, 10) || 1 : 1;

    if (!tourId || !userId) {
      showAlert('error', 'Please select both a Tour and a Customer.');
      return;
    }

    const payload = {
      tour: tourId,
      user: userId,
      participants: participantsVal,
      status,
      paymentOption: 'cash',
    };

    // If price was typed, pass it; otherwise omit so backend defaults to tour price
    if (priceVal !== '') {
      payload.price = parseFloat(priceVal);
    }

    const originalBtnText = DOM.btnSave.textContent;
    DOM.btnSave.textContent = 'Creating...';
    DOM.btnSave.disabled = true;

    try {
      const res = await fetchJson('/api/v1/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      showAlert('success', 'Booking created successfully!');
      DOM.bookingForm.reset();
      setMode('list');

      const createdBooking = res?.data?.booking || res?.data?.document;
      if (createdBooking) {
        const newId = createdBooking._id || createdBooking.id;
        bookingCache[newId] = createdBooking;
        currentBookingId = newId;
      }

      await getBookings();
      if (currentBookingId) {
        getBookingDetails(currentBookingId);
      }
    } catch (err) {
      showAlert('error', err.message);
    } finally {
      DOM.btnSave.textContent = originalBtnText;
      DOM.btnSave.disabled = false;
    }
  });
});
