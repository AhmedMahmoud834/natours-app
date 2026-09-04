// Guide Dashboard JS
document.addEventListener('DOMContentLoaded', () => {
  const tourFilter = document.getElementById('tour-filter');
  if (tourFilter) {
    tourFilter.addEventListener('change', (e) => {
      const selected = e.target.value;
      if (selected === 'all') {
        window.location.href = '/guide-dashboard';
      } else {
        window.location.href = `/guide-dashboard?tour=${selected}`;
      }
    });
  }
});
