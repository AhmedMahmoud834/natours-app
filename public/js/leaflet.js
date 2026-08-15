/* eslint-disable */
document.addEventListener('DOMContentLoaded', () => {
  const mapElement = document.getElementById('map');
  if (!mapElement) return;

  const locations = JSON.parse(mapElement.dataset.locations);
  if (!locations || !locations.length) return;

  // Initialize Leaflet map with disabled default zoomControl
  const map = L.map('map', {
    scrollWheelZoom: false,
    zoomControl: false,
  });

  // Position zoom controls at bottom right away from top section clip
  L.control.zoom({ position: 'bottomright' }).addTo(map);

  // Dark-themed tile layer (CartoDB Dark Matter)
  L.tileLayer(
    'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
    {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
      subdomains: 'abcd',
      maxZoom: 19,
    },
  ).addTo(map);

  const bounds = L.latLngBounds();

  // Custom CSS-based marker icon matching Expedition design system
  const markerIcon = L.divIcon({
    className: 'custom-marker',
    html: '<div class="marker-pin"></div>',
    iconSize: [24, 24],
    iconAnchor: [12, 12],
  });

  locations.forEach((loc) => {
    // GeoJSON stores coordinates as [longitude, latitude] -> Leaflet expects [latitude, longitude]
    const lat = loc.coordinates[1];
    const lng = loc.coordinates[0];
    const coords = [lat, lng];

    // Add marker with custom icon and bind popup
    L.marker(coords, { icon: markerIcon })
      .addTo(map)
      .bindPopup(`<p>Day ${loc.day}: ${loc.description}</p>`, {
        autoClose: false,
        className: 'map-popup',
      })
      .openPopup();

    // Extend map bounds to include coordinate
    bounds.extend(coords);
  });

  // Fit map bounds to frame all location markers
  map.fitBounds(bounds, {
    padding: [100, 100],
  });
});
