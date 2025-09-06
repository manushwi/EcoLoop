// Uses Leaflet via jsDelivr (allowed by current CSP in server.js)
document.addEventListener('DOMContentLoaded', async function () {
  const mapEl = document.getElementById('donationMap');
  const listEl = document.getElementById('donationList');
  if (!mapEl) return;

  // Basic NGO list (could be replaced with an API)
  const ngoCatalog = [
    { name: 'Red Cross Donation Center', lat: 40.758, lng: -73.9855, type: 'general', url: 'https://www.redcross.org' },
    { name: 'Goodwill Drop-off', lat: 40.7484, lng: -73.9857, type: 'thrift', url: 'https://www.goodwill.org' },
    { name: 'Salvation Army Center', lat: 40.7306, lng: -73.9866, type: 'thrift', url: 'https://www.salvationarmyusa.org' },
    { name: 'Local Shelter', lat: 40.741, lng: -73.9897, type: 'shelter', url: '#' },
  ];

  function getUserLocation() {
    return new Promise((resolve) => {
      if (!navigator.geolocation) return resolve(null);
      navigator.geolocation.getCurrentPosition(
        (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        () => resolve(null),
        { timeout: 8000, maximumAge: 120000 }
      );
    });
  }

  function distanceKm(a, b) {
    const toRad = (x) => (x * Math.PI) / 180;
    const R = 6371;
    const dLat = toRad(b.lat - a.lat);
    const dLng = toRad(b.lng - a.lng);
    const lat1 = toRad(a.lat);
    const lat2 = toRad(b.lat);
    const s = Math.sin(dLat / 2) ** 2 + Math.sin(dLng / 2) ** 2 * Math.cos(lat1) * Math.cos(lat2);
    const c = 2 * Math.atan2(Math.sqrt(s), Math.sqrt(1 - s));
    return R * c;
  }

  const userLoc = await getUserLocation();
  const defaultLoc = userLoc || { lat: 40.758, lng: -73.9855 };

  const map = L.map(mapEl).setView([defaultLoc.lat, defaultLoc.lng], 13);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '&copy; OpenStreetMap contributors'
  }).addTo(map);

  // Add user marker
  const userMarker = L.circleMarker([defaultLoc.lat, defaultLoc.lng], {
    radius: 8,
    color: '#1fd461',
    fillColor: '#1fd461',
    fillOpacity: 0.8
  }).addTo(map);
  userMarker.bindPopup(userLoc ? 'Your Location' : 'Default City Center');

  // Load from OSM Overpass (via backend proxy)
  try {
    const radius = 6000;
    const res = await fetch(`/api/places/osm?lat=${encodeURIComponent(defaultLoc.lat)}&lng=${encodeURIComponent(defaultLoc.lng)}&radius=${radius}`, { credentials: 'include' });
    if (!res.ok) throw new Error('Failed to load OSM places');
    const payload = await res.json();
    if (!payload.success) throw new Error(payload.message || 'Failed to fetch OSM places');

    const places = (payload.data || []).map((p) => ({
      name: p.name,
      lat: p.lat,
      lng: p.lng,
      address: p.address || '',
      category: (p.categories && p.categories[0]) || 'Donation Center',
      website: p.website || null,
      distance: distanceKm(defaultLoc, { lat: p.lat, lng: p.lng })
    })).sort((a, b) => a.distance - b.distance);

    places.forEach((n) => {
      const marker = L.marker([n.lat, n.lng]).addTo(map);
      marker.bindPopup(`<b>${n.name}</b><br>${n.category} • ${n.distance.toFixed(1)} km<br>${n.address}`);

      if (listEl) {
        const row = document.createElement('div');
        row.className = 'card';
        row.style.cssText = 'padding:12px;border:1px solid rgba(255,255,255,0.12);border-radius:12px;background:rgba(255,255,255,0.03);display:flex;align-items:center;justify-content:space-between;gap:10px;';
        const info = document.createElement('div');
        info.innerHTML = `<div style="font-weight:700;">${n.name}</div><div style="opacity:.8;font-size:13px;">${n.category} • ${n.distance.toFixed(1)} km</div><div style="opacity:.7;font-size:12px;">${n.address}</div>`;
        const btn = document.createElement('a');
        btn.href = n.website || '#';
        btn.target = '_blank';
        btn.textContent = n.website ? 'Website' : 'View on Map';
        btn.style.cssText = 'padding:8px 12px;border-radius:10px;border:1px solid rgba(31,212,97,0.4);background:#1fd46120;color:#1fd461;font-weight:600;';
        btn.addEventListener('click', (e) => {
          if (!n.website) e.preventDefault();
          map.setView([n.lat, n.lng], 15);
          marker.openPopup();
        });
        row.appendChild(info);
        row.appendChild(btn);
        listEl.appendChild(row);
      }
    });
  } catch (err) {
    if (listEl) {
      const note = document.createElement('div');
      note.className = 'card';
      note.style.cssText = 'padding:12px;border:1px solid rgba(255,0,0,0.25);border-radius:12px;background:rgba(255,0,0,0.06);color:#ffcccc;';
      note.textContent = 'Unable to load nearby donation centers right now.';
      listEl.appendChild(note);
    }
    console.error('OSM places load error:', err);
  }
});


