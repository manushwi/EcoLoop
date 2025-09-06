const express = require('express');
const axios = require('axios');
const router = express.Router();

// GET /api/places/osm?lat=..&lng=..&radius=5000
router.get('/osm', async (req, res) => {
  try {
    const lat = parseFloat(req.query.lat);
    const lng = parseFloat(req.query.lng);
    const radius = Math.min(parseInt(req.query.radius || '5000', 10), 15000);

    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      return res.status(400).json({ success: false, message: 'lat and lng required' });
    }

    // Overpass QL query: nearby NGOs / charity shops / recycling / social facilities
    const ql = `
      [out:json][timeout:25];
      (
        node(around:${radius},${lat},${lng})["office"="ngo"];
        node(around:${radius},${lat},${lng})["shop"="charity"];
        node(around:${radius},${lat},${lng})["amenity"="recycling"];
        node(around:${radius},${lat},${lng})["amenity"="social_facility"];
        way(around:${radius},${lat},${lng})["office"="ngo"];
        way(around:${radius},${lat},${lng})["shop"="charity"];
        way(around:${radius},${lat},${lng})["amenity"="recycling"];
        relation(around:${radius},${lat},${lng})["office"="ngo"];
      );
      out center tags 40;
    `;

    const { data } = await axios.post('https://overpass-api.de/api/interpreter', ql, {
      headers: { 'Content-Type': 'text/plain' },
      timeout: 15000
    });

    const elements = Array.isArray(data?.elements) ? data.elements : [];
    const places = elements.map((el) => {
      const coord = el.type === 'node' ? { lat: el.lat, lng: el.lon } : (el.center || {});
      const tags = el.tags || {};
      const name = tags.name || 'Donation Place';
      const addressParts = [
        tags['addr:housenumber'],
        tags['addr:street'],
        tags['addr:city'] || tags['addr:town'] || tags['addr:village'],
      ].filter(Boolean).join(' ');
      const address = tags['addr:full'] || addressParts || '';
      const category = tags.office === 'ngo' ? 'NGO' : (tags.shop === 'charity' ? 'Charity Shop' : (tags.amenity === 'recycling' ? 'Recycling' : (tags.amenity === 'social_facility' ? 'Social Facility' : 'Donation Center')));
      return {
        id: `${el.type}/${el.id}`,
        name,
        lat: coord.lat,
        lng: coord.lon || coord.lng,
        address,
        categories: [category],
        website: tags.website || null
      };
    }).filter(p => Number.isFinite(p.lat) && Number.isFinite(p.lng));

    res.json({ success: true, data: places });
  } catch (err) {
    console.error('Overpass proxy error:', err.message);
    res.status(500).json({ success: false, message: 'Failed to fetch OSM places' });
  }
});

module.exports = router;


