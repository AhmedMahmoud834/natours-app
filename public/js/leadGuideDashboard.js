document.addEventListener('DOMContentLoaded', () => {
  // 1. Alert Helper
  const hideAlert = () => {
    const el = document.querySelector('.alert');
    if (el) el.parentElement.removeChild(el);
  };

  const showAlert = (type, msg, time = 5) => {
    hideAlert();
    const markup = `<div class="alert alert--${type}">${msg}</div>`;
    document.querySelector('body').insertAdjacentHTML('afterbegin', markup);
    window.setTimeout(hideAlert, time * 1000);
  };

  // 2. Tour Filter Logic
  const tourFilter = document.getElementById('tour-filter');
  if (tourFilter) {
    tourFilter.addEventListener('change', (e) => {
      window.location.href = '/lead-guide-dashboard?tour=' + e.target.value;
    });
  }

  // 3. Form Elements & State
  const tourForm = document.getElementById('tour-form');
  if (!tourForm) return;

  const formTitle = document.getElementById('form-title');
  const btnSave = document.getElementById('btn-save');
  const btnCancel = document.getElementById('btn-cancel');
  const editName = document.getElementById('edit-name');
  const editDuration = document.getElementById('edit-duration');
  const editMaxGroupSize = document.getElementById('edit-max-group-size');
  const editDifficulty = document.getElementById('edit-difficulty');
  const editPrice = document.getElementById('edit-price');
  const editPriceDiscount = document.getElementById('edit-price-discount');
  const editSummary = document.getElementById('edit-summary');
  const editDescription = document.getElementById('edit-description');
  const editGuides = document.getElementById('edit-guides');
  const editStartDates = document.getElementById('edit-start-dates');
  const editStartLocationDesc = document.getElementById('edit-start-location-desc');
  const editStartLocationAddress = document.getElementById('edit-start-location-address');
  const editStartLocationCoords = document.getElementById('edit-start-location-coords');
  const editImageCover = document.getElementById('edit-image-cover');
  const editImages = document.getElementById('edit-images');
  const locationsContainer = document.getElementById('locations-container');
  const btnAddLocation = document.getElementById('btn-add-location');

  let currentEditTourId = null;

  // 4. Tour Stops (Locations)
  const createLocationBlock = (loc = {}) => {
    const lng =
      loc.coordinates && loc.coordinates.length === 2 ? loc.coordinates[0] : '';
    const lat =
      loc.coordinates && loc.coordinates.length === 2 ? loc.coordinates[1] : '';

    return `
      <div class="location-block">
        <div class="form__group">
          <label class="form__label">Day</label>
          <input type="number" class="form__input loc-day" required min="1" value="${loc.day || 1}">
        </div>
        <div class="form__group">
          <label class="form__label">Longitude</label>
          <input type="number" step="any" class="form__input loc-lng" required value="${lng}" placeholder="-115.57">
        </div>
        <div class="form__group">
          <label class="form__label">Latitude</label>
          <input type="number" step="any" class="form__input loc-lat" required value="${lat}" placeholder="51.17">
        </div>
        <div class="form__group desc-group">
          <label class="form__label">Description</label>
          <input type="text" class="form__input loc-desc" required value="${loc.description || ''}" placeholder="e.g., Camp 1">
        </div>
        <div class="form__group address-group">
          <label class="form__label">Address</label>
          <input type="text" class="form__input loc-address" value="${loc.address || ''}" placeholder="e.g., Trailhead, Banff">
        </div>
        <button type="button" class="btn-remove-loc">Remove Stop</button>
      </div>
    `;
  };

  if (btnAddLocation) {
    btnAddLocation.addEventListener('click', () => {
      locationsContainer.insertAdjacentHTML('beforeend', createLocationBlock());
    });
  }

  if (locationsContainer) {
    locationsContainer.addEventListener('click', (e) => {
      if (e.target.classList.contains('btn-remove-loc')) {
        e.target.closest('.location-block').remove();
      }
    });
  }

  // 5. Reset Form to Create Mode
  const resetFormToCreate = () => {
    currentEditTourId = null;
    tourForm.reset();
    if (editGuides) {
      Array.from(editGuides.options).forEach((opt) => (opt.selected = false));
    }
    locationsContainer.innerHTML = '';
    formTitle.textContent = 'Create New Tour';
    btnSave.textContent = 'Create Tour';
    if (btnCancel) btnCancel.style.display = 'none';
  };

  if (btnCancel) {
    btnCancel.addEventListener('click', resetFormToCreate);
  }

  // 6. Edit Tour Click Handler
  document.addEventListener('click', async (e) => {
    const btn = e.target.closest('.btn-edit-tour');
    if (!btn) return;

    const tourId = btn.dataset.tourId;
    btn.disabled = true;
    const originalText = btn.textContent;
    btn.textContent = 'Loading...';

    try {
      const res = await fetch(`/api/v1/tours/${tourId}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to fetch tour');

      const tour = data.data.document || data.data.tour || data.data;

      currentEditTourId = tour._id || tour.id;
      formTitle.textContent = `Edit Tour: ${tour.name}`;
      btnSave.textContent = 'Save Changes';
      if (btnCancel) btnCancel.style.display = 'inline-block';

      // Populate form
      editName.value = tour.name || '';
      editDuration.value = tour.duration || '';
      editMaxGroupSize.value = tour.maxGroupSize || '';
      editDifficulty.value = tour.difficulty || 'easy';
      editPrice.value = tour.price || '';
      editPriceDiscount.value = tour.priceDiscount || '';
      editSummary.value = tour.summary || '';
      editDescription.value = tour.description || '';

      // Guides
      if (editGuides) {
        const assignedGuides = (tour.guides || []).map((g) =>
          (typeof g === 'object' ? (g._id || g.id) : g).toString(),
        );
        Array.from(editGuides.options).forEach((opt) => {
          opt.selected = assignedGuides.includes(opt.value);
        });
      }

      // Start Dates
      if (tour.startDates && tour.startDates.length > 0) {
        editStartDates.value = tour.startDates
          .map((d) => new Date(d).toISOString().split('T')[0])
          .join(', ');
      } else {
        editStartDates.value = '';
      }

      // Start Location
      if (tour.startLocation) {
        editStartLocationDesc.value = tour.startLocation.description || '';
        editStartLocationAddress.value = tour.startLocation.address || '';
        if (
          tour.startLocation.coordinates &&
          tour.startLocation.coordinates.length === 2
        ) {
          editStartLocationCoords.value = `${tour.startLocation.coordinates[0]}, ${tour.startLocation.coordinates[1]}`;
        } else {
          editStartLocationCoords.value = '';
        }
      } else {
        editStartLocationDesc.value = '';
        editStartLocationAddress.value = '';
        editStartLocationCoords.value = '';
      }

      // Locations
      locationsContainer.innerHTML = '';
      if (tour.locations && tour.locations.length > 0) {
        tour.locations.forEach((loc) => {
          locationsContainer.insertAdjacentHTML(
            'beforeend',
            createLocationBlock(loc),
          );
        });
      }

      // Smooth scroll down to form
      const formSection =
        document.getElementById('tour-form-section') || tourForm;
      formSection.scrollIntoView({ behavior: 'smooth' });
      editName.focus();
    } catch (err) {
      showAlert('error', err.message || 'Error loading tour for editing');
    } finally {
      btn.disabled = false;
      btn.textContent = originalText;
    }
  });

  // 7. Form Submission (Create or Edit)
  tourForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    try {
      // 1. Coordinates validation
      const coordsArr = editStartLocationCoords.value
        .split(',')
        .map((c) => parseFloat(c.trim()));
      if (
        coordsArr.length !== 2 ||
        isNaN(coordsArr[0]) ||
        isNaN(coordsArr[1])
      ) {
        throw new Error(
          'Please enter valid coordinates format: longitude, latitude (e.g. -115.57077, 51.17836)',
        );
      }

      // 2. Start Dates validation
      const datesArr = editStartDates.value
        .split(',')
        .map((d) => d.trim())
        .filter(Boolean);
      if (datesArr.length === 0) {
        throw new Error('Please enter at least one valid start date.');
      }

      // 3. Locations validation
      const locationBlocks = Array.from(
        document.querySelectorAll('.location-block'),
      );
      if (locationBlocks.length === 0) {
        throw new Error('Please add at least one Tour Stop (location).');
      }

      // 4. Cover image required for new tours
      if (
        !currentEditTourId &&
        (!editImageCover.files || !editImageCover.files[0])
      ) {
        throw new Error('A cover image is required to create a new tour.');
      }

      btnSave.disabled = true;
      const isEdit = Boolean(currentEditTourId);
      btnSave.textContent = isEdit ? 'Saving...' : 'Creating...';

      const formData = new FormData();
      formData.append('name', editName.value.trim());
      formData.append('duration', editDuration.value);
      formData.append('maxGroupSize', editMaxGroupSize.value);
      formData.append('difficulty', editDifficulty.value);
      formData.append('price', editPrice.value);
      if (editPriceDiscount.value) {
        formData.append('priceDiscount', editPriceDiscount.value);
      }
      formData.append('summary', editSummary.value.trim());
      formData.append('description', editDescription.value.trim());

      // Guides
      if (editGuides) {
        const selectedGuides = Array.from(editGuides.selectedOptions).map(
          (o) => o.value,
        );
        selectedGuides.forEach((gId) => formData.append('guides', gId));
      }

      // Dates
      datesArr.forEach((d) => formData.append('startDates[]', d));

      // Start Location
      formData.append('startLocation[type]', 'Point');
      formData.append(
        'startLocation[description]',
        editStartLocationDesc.value.trim(),
      );
      formData.append(
        'startLocation[address]',
        editStartLocationAddress.value.trim(),
      );
      formData.append('startLocation[coordinates][0]', coordsArr[0]);
      formData.append('startLocation[coordinates][1]', coordsArr[1]);

      // Locations
      locationBlocks.forEach((block, index) => {
        formData.append(`locations[${index}][type]`, 'Point');
        formData.append(
          `locations[${index}][day]`,
          block.querySelector('.loc-day').value * 1,
        );
        formData.append(
          `locations[${index}][description]`,
          block.querySelector('.loc-desc').value.trim(),
        );
        formData.append(
          `locations[${index}][address]`,
          block.querySelector('.loc-address').value.trim(),
        );
        formData.append(
          `locations[${index}][coordinates][0]`,
          block.querySelector('.loc-lng').value * 1,
        );
        formData.append(
          `locations[${index}][coordinates][1]`,
          block.querySelector('.loc-lat').value * 1,
        );
      });

      // File uploads
      if (editImageCover.files && editImageCover.files[0]) {
        formData.append('imageCover', editImageCover.files[0]);
      }
      if (editImages.files && editImages.files.length > 0) {
        for (let i = 0; i < Math.min(editImages.files.length, 3); i++) {
          formData.append('images', editImages.files[i]);
        }
      }

      let url = '/api/v1/tours';
      let method = 'POST';
      if (isEdit) {
        url = `/api/v1/tours/${currentEditTourId}`;
        method = 'PATCH';
      }

      const res = await fetch(url, {
        method,
        body: formData,
      });

      const resData = await res.json();
      if (!res.ok) {
        throw new Error(
          resData.message || `Failed to ${isEdit ? 'update' : 'create'} tour`,
        );
      }

      showAlert(
        'success',
        isEdit ? 'Tour updated successfully!' : 'Tour created successfully!',
      );
      window.setTimeout(() => {
        window.location.reload();
      }, 1500);
    } catch (err) {
      showAlert('error', err.message || 'Error processing tour');
      btnSave.disabled = false;
      btnSave.textContent = currentEditTourId ? 'Save Changes' : 'Create Tour';
    }
  });

  // 8. Tour Activate/Deactivate Toggle
  document.addEventListener('click', async (e) => {
    const btn = e.target.closest('.btn-toggle-tour-status');
    if (!btn) return;

    const { tourId, active } = btn.dataset;
    const isActive = active === 'true';
    const action = isActive ? 'deactivate' : 'activate';

    const confirmed = window.confirm(
      `Are you sure you want to ${action} this tour?`,
    );
    if (!confirmed) return;

    const originalText = btn.textContent;
    btn.textContent = `${action === 'activate' ? 'Activating' : 'Deactivating'}...`;
    btn.disabled = true;

    try {
      const res = await fetch(`/api/v1/tours/${tourId}/${action}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || `Failed to ${action} tour`);

      showAlert('success', `Tour ${action}d successfully!`);
      window.setTimeout(() => {
        window.location.reload();
      }, 1200);
    } catch (err) {
      showAlert('error', err.message || `Error ${action}ing tour`);
      btn.textContent = originalText;
      btn.disabled = false;
    }
  });
});
