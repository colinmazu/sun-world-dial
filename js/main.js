// Shared state, form handling, and animation loop.

import { normalisePostcode, formatLatLon } from './geo.js';
import { lookupPostcode } from './postcode.js';
import { createGlobe } from './globe.js';

const state = {
  postcode: null,
  lat: null,
  lon: null,
  simTime: new Date(),
  playing: false,
  dayMs: 24000,
};

// Step 1: form handling
const form = document.getElementById('postcode-form');
const input = document.getElementById('postcode-input');
const result = document.getElementById('location-result');
const btn = form.querySelector('button');

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  const normalised = normalisePostcode(input.value);
  if (!normalised) {
    result.textContent = "That doesn't look like a UK postcode.";
    return;
  }
  result.textContent = 'Looking up…';
  btn.disabled = true;
  try {
    const loc = await lookupPostcode(normalised);
    state.postcode = loc.postcode;
    state.lat = loc.lat;
    state.lon = loc.lon;
    result.textContent = loc.postcode + ': ' + formatLatLon(loc.lat, loc.lon);
  } catch (err) {
    result.textContent = err.message;
  } finally {
    btn.disabled = false;
  }
});

// Re-export for later steps
export { state };

// Step 2: create the globe on load
createGlobe(document.getElementById('globe'));
