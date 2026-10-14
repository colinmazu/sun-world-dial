// Shared state, form handling, animation loop.

import { normalisePostcode } from './geo.js';
import { lookupPostcode } from './postcode.js';

const state = {
  postcode: null,
  lat: null,
  lon: null,
  simTime: new Date(),
  playing: false,
  dayMs: 24000,
};

export { state };

// Wire up the postcode form.
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

// Re-export formatLatLon for use in the form handler.
import { formatLatLon } from './geo.js';
