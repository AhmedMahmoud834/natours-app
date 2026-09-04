// SaaS Admin Tours JS Logic

const DOM = {
  // Master List
  toursList: document.getElementById('tours-list'),
  masterListView: document.getElementById('master-list-view'),
  btnActive: document.getElementById('filter-active'),
  btnInactive: document.getElementById('filter-inactive'),
  btnRefresh: document.getElementById('btn-refresh'),
  btnCreateNew: document.getElementById('btn-create-new'),

  // Details UI (Right Column)
  placeholder: document.getElementById('tour-placeholder'),
  content: document.getElementById('tour-content'),
  detailCover: document.getElementById('detail-cover'),
  detailName: document.getElementById('detail-name'),
  detailSummary: document.getElementById('detail-summary'),
  detailDifficulty: document.getElementById('detail-difficulty'),
  detailStatus: document.getElementById('detail-status'),
  btnEditProfile: document.getElementById('edit-tour-btn'),
  detailDuration: document.getElementById('detail-duration'),
  detailGroupSize: document.getElementById('detail-group-size'),
  detailPrice: document.getElementById('detail-price'),
  detailDiscount: document.getElementById('detail-discount'),
  detailFinalPrice: document.getElementById('detail-final-price'),
  detailRating: document.getElementById('detail-rating'),
  bookingsSection: document.getElementById('tour-bookings-section'),
  reviewsSection: document.getElementById('tour-reviews-section'),

  // Form UI (Left Column)
  tourForm: document.getElementById('tour-form'),
  formTitle: document.getElementById('form-title'),
  editName: document.getElementById('edit-name'),
  editDuration: document.getElementById('edit-duration'),
  editMaxGroupSize: document.getElementById('edit-max-group-size'),
  editDifficulty: document.getElementById('edit-difficulty'),
  editPrice: document.getElementById('edit-price'),
  editPriceDiscount: document.getElementById('edit-price-discount'),
  editSummary: document.getElementById('edit-summary'),
  editDescription: document.getElementById('edit-description'),
  editStartDates: document.getElementById('edit-start-dates'),
  editStartLocationDesc: document.getElementById('edit-start-location-desc'),
  editStartLocationAddress: document.getElementById(
    'edit-start-location-address',
  ),
  editStartLocationCoords: document.getElementById(
    'edit-start-location-coords',
  ),
  locationsContainer: document.getElementById('locations-container'),
  btnAddLocation: document.getElementById('btn-add-location'),
  editImageCover: document.getElementById('edit-image-cover'),
  editImages: document.getElementById('edit-images'),
  editGuides: document.getElementById('edit-guides'),
  btnSave: document.getElementById('btn-save'),
  btnCancel: document.getElementById('btn-cancel'),
  btnStatusToggle: document.getElementById('btn-status'),
  btnDelete: document.getElementById('btn-delete'),

  // Pagination
  btnPrev: document.getElementById('btn-prev'),
  btnNext: document.getElementById('btn-next'),
  pageInfo: document.getElementById('page-info'),
  limitSelect: document.getElementById('limit-select'),
};

const createLocationBlock = (loc = {}) => {
  return `
    <div class="location-block">
      <div class="form__group">
        <label class="form__label">Day</label>
        <input type="number" class="form__input loc-day" required min="1" value="${loc.day || ''}">
      </div>
      <div class="form__group">
        <label class="form__label">Longitude</label>
        <input type="number" step="any" class="form__input loc-lng" required min="-180" max="180" value="${loc.coordinates ? loc.coordinates[0] : ''}">
      </div>
      <div class="form__group">
        <label class="form__label">Latitude</label>
        <input type="number" step="any" class="form__input loc-lat" required min="-90" max="90" value="${loc.coordinates ? loc.coordinates[1] : ''}">
      </div>
      <div class="form__group desc-group">
        <label class="form__label">Description</label>
        <input type="text" class="form__input loc-desc" required value="${loc.description || ''}">
      </div>
      <div class="form__group address-group">
        <label class="form__label">Address</label>
        <input type="text" class="form__input loc-address" value="${loc.address || ''}">
      </div>
      <button type="button" class="btn-remove-loc">Remove</button>
    </div>
  `;
};

const tourCache = {};
let currentTourId = null;
let currentMode = 'list'; // 'list', 'edit', 'create'
let currentPage = 1;
let currentLimit = 10;
let currentSortField = 'createdAt';
let currentSortDirection = '-';
let currentDifficulty = '';

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

const getTours = async (isActive = true) => {
  try {
    DOM.toursList.innerHTML = '<p class="empty-msg">Loading tours...</p>';

    const baseEndpoint = isActive ? '/api/v1/tours' : '/api/v1/tours/inActive';
    let endpoint = `${baseEndpoint}?page=${currentPage}&limit=${currentLimit}&sort=${currentSortDirection}${currentSortField}`;
    if (currentDifficulty) endpoint += `&difficulty=${currentDifficulty}`;
    const res = await fetchJson(endpoint);
    const tours = res?.data?.document || res?.data?.Documents || res?.data;

    DOM.toursList.innerHTML = '';

    const totalCount = res?.totalCount || 0;
    const totalPages = Math.ceil(totalCount / currentLimit) || 1;

    // Update pagination controls
    if (DOM.pageInfo)
      DOM.pageInfo.textContent = `Page ${currentPage} of ${totalPages}`;
    if (DOM.btnPrev) DOM.btnPrev.disabled = currentPage === 1;
    if (DOM.btnNext)
      DOM.btnNext.disabled = currentPage >= totalPages || totalCount === 0;

    if (!tours || tours.length === 0) {
      DOM.toursList.innerHTML = '<p class="empty-msg">No tours found.</p>';
      return;
    }

    tours.forEach((tour) => {
      const li = document.createElement('li');
      li.className = 'tour-item';
      li.dataset.tourId = tour._id || tour.id;

      const cover = tour.imageCover ? tour.imageCover : 'default.jpg';
      const durationStr = `${tour.duration} days`;
      const priceStr = tour.priceDiscount 
        ? `<span style="text-decoration: line-through; opacity: 0.7; font-weight: normal; margin-right: 0.4rem;">$${tour.price}</span><span style="color: #ff6b35; font-weight: 700;">$${tour.price - tour.priceDiscount}</span> <span style="color: #10b981; font-size: 1.1rem; margin-left: 0.2rem;">(-$${tour.priceDiscount})</span>` 
        : `$${tour.price}`;

      li.innerHTML = `
        <div style="display: flex; gap: 1.5rem; align-items: center; width: 100%; min-width: 0;">
          <img src="/img/tours/${cover}" alt="${tour.name}" class="tour-cover-thumbnail" style="width: 5rem; height: 5rem; border-radius: 0.8rem; object-fit: cover; flex-shrink: 0;">
          <div style="flex: 1; min-width: 0; overflow: hidden;">
            <h4 class="tour-name" style="margin: 0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; color: #f8f9fa; font-weight: 600; font-size: 1.5rem;">${tour.name}</h4>
            <span class="tour-meta" style="color: rgba(255, 255, 255, 0.75); font-size: 1.2rem;">${durationStr} &bull; <strong style="color: #ff6b35;">${priceStr}</strong> &bull; ${tour.difficulty}</span>
          </div>
        </div>
      `;

      li.addEventListener('click', () => {
        document
          .querySelectorAll('.tour-item')
          .forEach((el) => el.classList.remove('active'));
        li.classList.add('active');
        getTourDetails(tour._id || tour.id);
      });

      DOM.toursList.appendChild(li);
    });
  } catch (err) {
    showAlert('error', `Error loading tours: ${err.message}`);
    DOM.toursList.innerHTML = '<p class="empty-msg">Error loading tours.</p>';
  }
};

const renderTourDetails = (data) => {
  const { tour, bookings, reviews } = data;
  const cover = tour.imageCover ? tour.imageCover : 'default.jpg';

  DOM.detailCover.src = `/img/tours/${cover}`;
  DOM.detailCover.alt = tour.name;
  DOM.detailName.textContent = tour.name;
  DOM.detailName.title = tour.name;
  DOM.detailSummary.textContent =
    tour.summary || tour.description || 'No summary available';
  DOM.detailSummary.title = DOM.detailSummary.textContent;

  DOM.detailDifficulty.textContent = tour.difficulty || 'easy';
  DOM.detailDifficulty.className = `badge badge--${tour.difficulty || 'easy'}`;

  // Status Badge
  const isActive = tour.active !== false;
  DOM.detailStatus.textContent = isActive ? 'Active' : 'Inactive';
  DOM.detailStatus.className = `badge badge--${isActive ? 'active' : 'inactive'}`;

  // Tour stats grid
  DOM.detailDuration.textContent = `${tour.duration || 0} days`;
  DOM.detailGroupSize.textContent = `${tour.maxGroupSize || 0} people`;
  DOM.detailPrice.textContent = `$${tour.price || 0}`;
  
  if (DOM.detailDiscount) {
    if (tour.priceDiscount) {
      DOM.detailDiscount.textContent = `-$${tour.priceDiscount}`;
      DOM.detailDiscount.className = 'stat-value text-green';
    } else {
      DOM.detailDiscount.textContent = 'None';
      DOM.detailDiscount.className = 'stat-value';
    }
  }

  if (DOM.detailFinalPrice) {
    if (tour.priceDiscount) {
      DOM.detailFinalPrice.textContent = `$${tour.price - tour.priceDiscount}`;
      DOM.detailFinalPrice.className = 'stat-value text-orange';
    } else {
      DOM.detailFinalPrice.textContent = `$${tour.price || 0}`;
      DOM.detailFinalPrice.className = 'stat-value';
    }
  }

  DOM.detailRating.textContent = (!tour.ratingsQuantity || tour.ratingsQuantity === 0)
    ? '★ New' 
    : `★ ${tour.ratingsAverage ? tour.ratingsAverage.toFixed(1) : 'New'} (${tour.ratingsQuantity})`;

  // Inject dynamic Toggle Button & Delete Button
  const existingToggleBtn = document.getElementById('toggle-tour-active-btn');
  if (existingToggleBtn) existingToggleBtn.remove();
  const existingDeleteBtn = document.getElementById('delete-tour-header-btn');
  if (existingDeleteBtn) existingDeleteBtn.remove();

  const statusActionText = isActive ? 'Deactivate' : 'Activate';
  const statusActionColor = isActive
    ? 'border: 1px solid #ef4444; color: #ef4444;'
    : 'border: 1px solid #10b981; color: #10b981;';

  const toggleBtnHtml = `<button class="btn btn-small" id="toggle-tour-active-btn" data-tour-id="${tour._id || tour.id}" data-active="${isActive}" style="background: transparent; ${statusActionColor}">
       ${statusActionText}
     </button>`;

  const deleteBtnHtml = `<button class="btn btn-small btn-delete" id="delete-tour-header-btn" data-tour-id="${tour._id || tour.id}">
       Delete
     </button>`;

  DOM.btnEditProfile.insertAdjacentHTML('beforebegin', toggleBtnHtml);
  DOM.btnEditProfile.insertAdjacentHTML('afterend', deleteBtnHtml);

  // Toggle active handler
  document
    .getElementById('toggle-tour-active-btn')
    .addEventListener('click', async (e) => {
      const btn = e.target;
      const { tourId } = btn.dataset;
      const currentActive = btn.dataset.active === 'true';
      const action = currentActive ? 'deactivate' : 'activate';
      const originalText = btn.textContent;
      btn.textContent = currentActive ? 'Deactivating...' : 'Activating...';

      try {
        await fetchJson(`/api/v1/tours/${tourId}/${action}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
        });

        showAlert('success', `Tour ${action}d successfully!`);
        if (tourCache[tourId]) tourCache[tourId].tour.active = !currentActive;
        renderTourDetails(tourCache[tourId]);
        getTours(DOM.btnActive.classList.contains('btn--primary'));
      } catch (err) {
        showAlert('error', err.message);
        btn.textContent = originalText;
      }
    });

  // Delete tour handler
  document
    .getElementById('delete-tour-header-btn')
    .addEventListener('click', async (e) => {
      const { tourId } = e.target.dataset;
      deleteTourHandler(tourId);
    });

  // Render Bookings
  let bookingsHtml = '';
  if (bookings && bookings.length > 0) {
    bookings.forEach((b) => {
      const date = new Date(b.createdAt).toLocaleDateString();
      const userName =
        b.user && b.user.name ? b.user.name : b.user || 'Customer';
      const userEmail = b.user && b.user.email ? `(${b.user.email})` : '';
      bookingsHtml += `
        <div class="booking-card">
          <div><strong>${userName}</strong> <span style="font-size:1.2rem; color: rgba(255, 255, 255, 0.65);">${userEmail}</span><br/> <span style="font-size:1.2rem; color: rgba(255, 255, 255, 0.65);">Booked on: ${date}</span></div>
          <div style="font-weight: 700; color: #ff6b35;">$${b.price}</div>
        </div>
      `;
    });
  } else {
    bookingsHtml += `<p class="empty-msg">No bookings found for this tour.</p>`;
  }
  DOM.bookingsSection.innerHTML = bookingsHtml;

  // Render Reviews
  let reviewsHtml = '';
  if (reviews && reviews.length > 0) {
    reviews.forEach((r) => {
      const userName = r.user && r.user.name ? r.user.name : 'Anonymous';
      const userPhoto = r.user && r.user.photo ? r.user.photo : 'default.jpg';
      reviewsHtml += `
        <div class="review-card" style="flex-direction: column; align-items: flex-start;">
          <div style="display: flex; justify-content: space-between; width: 100%; align-items: center;">
            <div style="display: flex; align-items: center; gap: 1rem;">
              <img src="/img/users/${userPhoto}" alt="${userName}" style="width: 2.8rem; height: 2.8rem; border-radius: 50%; object-fit: cover;">
              <strong>${userName}</strong>
            </div>
            <span style="color: #ff6b35;">★ ${r.rating}</span>
          </div>
          <p class="review-text" style="margin-top:0.8rem; font-style:italic;">"${r.review}"</p>
        </div>
      `;
    });
  } else {
    reviewsHtml += `<p class="empty-msg">No reviews yet for this tour.</p>`;
  }
  DOM.reviewsSection.innerHTML = reviewsHtml;

  DOM.placeholder.style.display = 'none';
  DOM.content.style.display = 'block';
};

const getTourDetails = async (tourId) => {
  currentTourId = tourId;
  setMode('list');

  DOM.placeholder.style.display = 'block';
  DOM.placeholder.innerHTML =
    '<span class="spinner"></span> Loading tour details...';
  DOM.content.style.display = 'none';

  if (tourCache[tourId]) {
    return renderTourDetails(tourCache[tourId]);
  }

  try {
    const [tourRes, bookingsRes, reviewsRes] = await Promise.all([
      fetchJson(`/api/v1/tours/${tourId}`),
      fetchJson(`/api/v1/bookings?tour=${tourId}`).catch(() => ({
        data: { document: [] },
      })),
      fetchJson(`/api/v1/reviews?tour=${tourId}`).catch(() => ({
        data: { document: [] },
      })),
    ]);

    const tour =
      tourRes?.data?.document || tourRes?.data?.tour || tourRes?.data;
    const bookings =
      bookingsRes?.data?.document ||
      bookingsRes?.data?.Documents ||
      bookingsRes?.data ||
      [];
    const reviews =
      reviewsRes?.data?.document ||
      reviewsRes?.data?.Documents ||
      reviewsRes?.data ||
      [];

    const data = { tour, bookings, reviews };
    tourCache[tourId] = data;

    renderTourDetails(data);
  } catch (err) {
    showAlert('error', `Error fetching tour details: ${err.message}`);
    DOM.placeholder.innerHTML = 'Error loading tour details.';
  }
};

const deleteTourHandler = async (tourId) => {
  const confirmed = window.confirm(
    'Are you sure you want to permanently delete this tour? This cannot be undone.',
  );
  if (!confirmed) return;

  try {
    await fetchJson(`/api/v1/tours/${tourId}`, {
      method: 'DELETE',
    });

    showAlert('success', 'Tour deleted successfully!');
    delete tourCache[tourId];
    currentTourId = null;

    DOM.content.style.display = 'none';
    DOM.placeholder.style.display = 'block';
    DOM.placeholder.innerHTML = 'Select a tour to view details.';

    setMode('list');
    getTours(DOM.btnActive.classList.contains('btn--primary'));
  } catch (err) {
    showAlert('error', err.message);
  }
};

const setMode = (mode) => {
  currentMode = mode;
  if (mode === 'list') {
    DOM.masterListView.style.display = 'block';
    DOM.tourForm.style.display = 'none';
    DOM.tourForm.reset();
  } else if (mode === 'create') {
    DOM.masterListView.style.display = 'none';
    DOM.tourForm.style.display = 'block';
    DOM.formTitle.textContent = 'Create New Tour';
    DOM.btnSave.textContent = 'Create Tour';
    DOM.btnStatusToggle.style.display = 'none';
    if (DOM.btnDelete) DOM.btnDelete.style.display = 'none';
    DOM.tourForm.reset();
    if (DOM.editGuides) {
      Array.from(DOM.editGuides.options).forEach((opt) => (opt.selected = false));
    }
    DOM.locationsContainer.innerHTML = '';
    DOM.editName.focus();
  } else if (mode === 'edit') {
    if (!currentTourId || !tourCache[currentTourId]) return;
    const { tour } = tourCache[currentTourId];

    DOM.masterListView.style.display = 'none';
    DOM.tourForm.style.display = 'block';
    DOM.formTitle.textContent = 'Edit Tour';
    DOM.btnSave.textContent = 'Save Changes';

    // Populate form fields
    DOM.editName.value = tour.name || '';
    DOM.editDuration.value = tour.duration || '';
    DOM.editMaxGroupSize.value = tour.maxGroupSize || '';
    DOM.editDifficulty.value = tour.difficulty || 'easy';
    DOM.editPrice.value = tour.price || '';
    DOM.editPriceDiscount.value = tour.priceDiscount || '';
    DOM.editSummary.value = tour.summary || '';
    DOM.editDescription.value = tour.description || '';

    // Guides
    if (DOM.editGuides) {
      const assignedGuides = tour.guides || [];
      const assignedIds = assignedGuides.map((g) =>
        (typeof g === 'object' ? (g._id || g.id) : g).toString(),
      );
      Array.from(DOM.editGuides.options).forEach((opt) => {
        opt.selected = assignedIds.includes(opt.value);
      });
    }

    // Locations
    DOM.locationsContainer.innerHTML = '';
    if (tour.locations && tour.locations.length > 0) {
      tour.locations.forEach(loc => {
        DOM.locationsContainer.insertAdjacentHTML('beforeend', createLocationBlock(loc));
      });
    }

    // Start Dates formatted
    if (tour.startDates && tour.startDates.length > 0) {
      DOM.editStartDates.value = tour.startDates
        .map((d) => new Date(d).toISOString().split('T')[0])
        .join(', ');
    } else {
      DOM.editStartDates.value = '';
    }

    // Start Location
    if (tour.startLocation) {
      DOM.editStartLocationDesc.value = tour.startLocation.description || '';
      DOM.editStartLocationAddress.value = tour.startLocation.address || '';
      if (
        tour.startLocation.coordinates &&
        tour.startLocation.coordinates.length === 2
      ) {
        DOM.editStartLocationCoords.value = `${tour.startLocation.coordinates[0]}, ${tour.startLocation.coordinates[1]}`;
      } else {
        DOM.editStartLocationCoords.value = '';
      }
    } else {
      DOM.editStartLocationDesc.value = '';
      DOM.editStartLocationAddress.value = '';
      DOM.editStartLocationCoords.value = '';
    }

    // Status button in form
    const isActive = tour.active !== false;
    DOM.btnStatusToggle.style.display = 'inline-block';
    DOM.btnStatusToggle.textContent = isActive
      ? 'Deactivate Tour'
      : 'Activate Tour';
    DOM.btnStatusToggle.className = isActive
      ? 'btn btn-deactivate btn--small btn-outline'
      : 'btn btn--small btn-outline btn-outline--green';

    if (DOM.btnDelete) {
      DOM.btnDelete.style.display = 'inline-block';
    }
  }
};

// EVENT LISTENERS
document.addEventListener('DOMContentLoaded', () => {
  // Initial load
  getTours(true);

  // Tab Filtering
  DOM.btnActive.addEventListener('click', () => {
    DOM.btnActive.className = 'btn btn--small btn--primary';
    DOM.btnInactive.className = 'btn btn--small btn-outline';
    currentPage = 1;
    getTours(true);
  });

  DOM.btnInactive.addEventListener('click', () => {
    DOM.btnInactive.className = 'btn btn--small btn--primary';
    DOM.btnActive.className = 'btn btn--small btn-outline';
    currentPage = 1;
    getTours(false);
  });

  // Refresh Button
  if (DOM.btnRefresh) {
    DOM.btnRefresh.addEventListener('click', () => {
      getTours(DOM.btnActive.classList.contains('btn--primary'));
    });
  }

  // Create Button
  DOM.btnCreateNew.addEventListener('click', () => {
    setMode('create');
  });

  // Edit Button in Details pane
  DOM.btnEditProfile.addEventListener('click', () => {
    setMode('edit');
  });

  // Cancel Button in Form
  DOM.btnCancel.addEventListener('click', () => {
    setMode('list');
  });

  // Add Stop button
  if (DOM.btnAddLocation) {
    DOM.btnAddLocation.addEventListener('click', () => {
      DOM.locationsContainer.insertAdjacentHTML('beforeend', createLocationBlock());
    });
  }

  // Remove Stop button (Event Delegation)
  if (DOM.locationsContainer) {
    DOM.locationsContainer.addEventListener('click', (e) => {
      if (e.target.classList.contains('btn-remove-loc')) {
        e.target.closest('.location-block').remove();
      }
    });
  }

  // Delete button in Form
  if (DOM.btnDelete) {
    DOM.btnDelete.addEventListener('click', () => {
      if (currentTourId) {
        deleteTourHandler(currentTourId);
      }
    });
  }

  // Status toggle button in Form
  DOM.btnStatusToggle.addEventListener('click', async () => {
    if (!currentTourId || !tourCache[currentTourId]) return;
    const { tour } = tourCache[currentTourId];
    const isActive = tour.active !== false;
    const action = isActive ? 'deactivate' : 'activate';

    try {
      await fetchJson(`/api/v1/tours/${currentTourId}/${action}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
      });

      showAlert('success', `Tour ${action}d successfully!`);
      tour.active = !isActive;
      renderTourDetails(tourCache[currentTourId]);
      setMode('list');
      getTours(DOM.btnActive.classList.contains('btn--primary'));
    } catch (err) {
      showAlert('error', err.message);
    }
  });

  // Pagination limit change
  DOM.limitSelect.addEventListener('change', (e) => {
    currentLimit = parseInt(e.target.value, 10);
    currentPage = 1;
    getTours(DOM.btnActive.classList.contains('btn--primary'));
  });

  // Sorting & Filtering change
  const filterDifficulty = document.getElementById('filter-difficulty');
  if (filterDifficulty) {
    filterDifficulty.addEventListener('change', (e) => {
      currentDifficulty = e.target.value;
      currentPage = 1;
      getTours(DOM.btnActive.classList.contains('btn--primary'));
    });
  }

  const sortField = document.getElementById('sort-field');
  if (sortField) {
    sortField.addEventListener('change', (e) => {
      currentSortField = e.target.value;
      currentPage = 1;
      getTours(DOM.btnActive.classList.contains('btn--primary'));
    });
  }

  const sortDirection = document.getElementById('sort-direction');
  if (sortDirection) {
    sortDirection.addEventListener('click', (e) => {
      e.preventDefault();
      const currentDir = e.target.dataset.direction;
      if (currentDir === '-') {
        e.target.dataset.direction = '';
        e.target.innerHTML = '&uarr; ASC';
        currentSortDirection = '';
      } else {
        e.target.dataset.direction = '-';
        e.target.innerHTML = '&darr; DESC';
        currentSortDirection = '-';
      }
      currentPage = 1;
      getTours(DOM.btnActive.classList.contains('btn--primary'));
    });
  }

  // Pagination arrows
  DOM.btnPrev.addEventListener('click', () => {
    if (currentPage > 1) {
      currentPage--;
      getTours(DOM.btnActive.classList.contains('btn--primary'));
    }
  });

  DOM.btnNext.addEventListener('click', () => {
    currentPage++;
    getTours(DOM.btnActive.classList.contains('btn--primary'));
  });

  // Form Submission (Create / Edit)
  DOM.tourForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const originalBtnText = DOM.btnSave.textContent;
    DOM.btnSave.textContent = 'Saving...';
    DOM.btnSave.disabled = true;

    try {
      // Parse coordinates
      const coordsRaw = DOM.editStartLocationCoords.value.trim();
      const coordsArr = coordsRaw.split(',').map((c) => parseFloat(c.trim()));
      if (
        coordsArr.length !== 2 ||
        isNaN(coordsArr[0]) ||
        isNaN(coordsArr[1])
      ) {
        throw new Error(
          'Please enter valid coordinates in format: longitude, latitude (e.g. -80.185, 25.774)',
        );
      }

      // Parse startDates
      const datesRaw = DOM.editStartDates.value.trim();
      const datesArr = datesRaw
        .split(',')
        .map((d) => d.trim())
        .filter(Boolean);
      if (datesArr.length === 0) {
        throw new Error('Please enter at least one valid start date.');
      }

      const formData = new FormData();
      formData.append('name', DOM.editName.value.trim());
      formData.append('duration', DOM.editDuration.value);
      formData.append('maxGroupSize', DOM.editMaxGroupSize.value);
      formData.append('difficulty', DOM.editDifficulty.value);
      formData.append('price', DOM.editPrice.value);
      if (DOM.editPriceDiscount.value) {
        formData.append('priceDiscount', DOM.editPriceDiscount.value);
      }
      formData.append('summary', DOM.editSummary.value.trim());
      formData.append('description', DOM.editDescription.value.trim());

      // Guides
      if (DOM.editGuides) {
        const selectedGuides = Array.from(DOM.editGuides.selectedOptions).map(
          (o) => o.value,
        );
        selectedGuides.forEach((gId) => formData.append('guides', gId));
      }

      // Dates array
      datesArr.forEach((d) => formData.append('startDates[]', d));

      // Start Location
      const startLocation = {
        type: 'Point',
        description: DOM.editStartLocationDesc.value.trim(),
        address: DOM.editStartLocationAddress.value.trim(),
        coordinates: coordsArr,
      };
      formData.append('startLocation[type]', startLocation.type);
      formData.append('startLocation[description]', startLocation.description);
      formData.append('startLocation[address]', startLocation.address);
      formData.append('startLocation[coordinates][0]', coordsArr[0]);
      formData.append('startLocation[coordinates][1]', coordsArr[1]);

      // Dynamic Locations
      const locationBlocks = Array.from(document.querySelectorAll('.location-block'));
      if (locationBlocks.length === 0) {
        throw new Error('Please add at least one Tour Stop (location).');
      }
      locationBlocks.forEach((block, index) => {
        formData.append(`locations[${index}][type]`, 'Point');
        formData.append(`locations[${index}][day]`, block.querySelector('.loc-day').value * 1);
        formData.append(`locations[${index}][description]`, block.querySelector('.loc-desc').value.trim());
        formData.append(`locations[${index}][address]`, block.querySelector('.loc-address').value.trim());
        formData.append(`locations[${index}][coordinates][0]`, block.querySelector('.loc-lng').value * 1);
        formData.append(`locations[${index}][coordinates][1]`, block.querySelector('.loc-lat').value * 1);
      });

      // File uploads
      if (DOM.editImageCover.files && DOM.editImageCover.files[0]) {
        formData.append('imageCover', DOM.editImageCover.files[0]);
      }
      if (DOM.editImages.files && DOM.editImages.files.length > 0) {
        for (let i = 0; i < Math.min(DOM.editImages.files.length, 3); i++) {
          formData.append('images', DOM.editImages.files[i]);
        }
      }

      let res;
      if (currentMode === 'create') {
        res = await fetch('/api/v1/tours', {
          method: 'POST',
          body: formData,
        });
      } else {
        res = await fetch(`/api/v1/tours/${currentTourId}`, {
          method: 'PATCH',
          body: formData,
        });
      }

      const resData = await res.json();
      if (!res.ok) {
        throw new Error(resData.message || 'Operation failed');
      }

      const savedTour =
        resData?.data?.document || resData?.data?.tour || resData?.data;
      showAlert(
        'success',
        currentMode === 'create'
          ? 'Tour created successfully!'
          : 'Tour updated successfully!',
      );

      if (savedTour) {
        const savedId = savedTour._id || savedTour.id || currentTourId;
        delete tourCache[savedId];
        currentTourId = savedId;
      }

      setMode('list');
      await getTours(DOM.btnActive.classList.contains('btn--primary'));

      if (currentTourId) {
        getTourDetails(currentTourId);
      }
    } catch (err) {
      showAlert('error', err.message);
    } finally {
      DOM.btnSave.textContent = originalBtnText;
      DOM.btnSave.disabled = false;
    }
  });
});
