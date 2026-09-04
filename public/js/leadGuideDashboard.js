document.addEventListener('DOMContentLoaded', () => {
  // 1. Tour Filter Logic
  const tourFilter = document.getElementById('tour-filter');
  if (tourFilter) {
    tourFilter.addEventListener('change', (e) => {
      window.location.href = '/lead-guide-dashboard?tour=' + e.target.value;
    });
  }

  // 2. Create Tour Logic
  const tourForm = document.getElementById('create-tour-form');
  if (!tourForm) return;

  tourForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = tourForm.querySelector('button[type="submit"]');

    const name = document.getElementById('tour-name').value;
    const duration = Number(document.getElementById('tour-duration').value);
    const maxGroupSize = Number(document.getElementById('tour-maxGroupSize').value);
    const difficulty = document.getElementById('tour-difficulty').value;
    const price = Number(document.getElementById('tour-price').value);
    const summary = document.getElementById('tour-summary').value;
    const description = document.getElementById('tour-description').value;

    const guidesSelect = document.getElementById('tour-guides');
    const guides = guidesSelect
      ? Array.from(guidesSelect.selectedOptions).map((opt) => opt.value)
      : [];

    try {
      btn.disabled = true;
      btn.textContent = 'Creating...';

      const res = await fetch('/api/v1/tours', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          duration,
          maxGroupSize,
          difficulty,
          price,
          summary,
          description,
          guides,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to create tour');

      alert('Tour created successfully!');
      window.location.reload();
    } catch (err) {
      alert(err.message || 'Error creating tour');
    } finally {
      btn.disabled = false;
      btn.textContent = 'Create Tour';
    }
  });

  // 3. Tour Activate/Deactivate Toggle
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

      alert(`Tour ${action}d successfully!`);
      window.location.reload();
    } catch (err) {
      alert(err.message || `Error ${action}ing tour`);
      btn.textContent = originalText;
      btn.disabled = false;
    }
  });
});
