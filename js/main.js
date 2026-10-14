// Shared state, form handling, and animation loop.

import { normalisePostcode, formatLatLon } from './geo.js';
import { lookupPostcode } from './postcode.js';
import { createGlobe, setMarker, updateGlobe } from './globe.js';
import { drawHorizon } from './horizon.js';

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
    setMarker(state.lat, state.lon);
  } catch (err) {
    result.textContent = err.message;
  } finally {
    btn.disabled = false;
  }
});

// Step 2: create the globe on load
createGlobe(document.getElementById('globe'));

// Step 4: controls and animation loop
const dateInput = document.getElementById('date-input');
const playBtn = document.getElementById('play-btn');
const speedSelect = document.getElementById('speed-select');
const simClock = document.getElementById('sim-clock');
const horizonCanvas = document.getElementById('horizon');
const globeDiv = document.getElementById('globe');
const viewToggle = document.getElementById('view-toggle');

// UK time formatter for the clock
const ukFmt = new Intl.DateTimeFormat('en-GB', {
  timeZone: 'Europe/London',
  weekday: 'short', day: 'numeric', month: 'short', year: 'numeric',
  hour: '2-digit', minute: '2-digit', timeZoneName: 'short',
});

// Get today in UK time as YYYY-MM-DD
function ukDateStr(d) {
  return d.toLocaleDateString('en-CA', { timeZone: 'Europe/London' });
}

dateInput.value = ukDateStr(state.simTime);

// Play / Pause toggle
playBtn.addEventListener('click', () => {
  state.playing = !state.playing;
  playBtn.textContent = state.playing ? 'Pause' : 'Play';
});

// Speed selector
speedSelect.addEventListener('change', () => {
  state.dayMs = parseInt(speedSelect.value, 10);
});

// Date input change → set simTime to noon UTC on that date
dateInput.addEventListener('change', () => {
  const parts = dateInput.value.split('-');
  state.simTime = new Date(Date.UTC(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10), 12, 0, 0));
});

// Step 5: view toggle
viewToggle.addEventListener('click', () => {
  const showingHorizon = !horizonCanvas.hidden;
  horizonCanvas.hidden = !showingHorizon;
  globeDiv.hidden = !showingHorizon;
  viewToggle.textContent = showingHorizon ? 'Show horizon' : 'Show globe';
});

// Animation loop
let lastTime = performance.now();

function frame(now) {
  const elapsedMs = now - lastTime;
  lastTime = now;

  if (state.playing) {
    const advance = elapsedMs * 86400000 / state.dayMs;
    state.simTime = new Date(state.simTime.getTime() + advance);
  }

  // Update globe sun position
  updateGlobe(state);

  // Draw horizon if visible
  if (!horizonCanvas.hidden) {
    drawHorizon(horizonCanvas, state);
  }

  // Update clock display
  simClock.textContent = ukFmt.format(state.simTime);

  // Sync date input when the simulated day changes
  const currentDay = ukDateStr(state.simTime);
  if (currentDay !== dateInput.value) {
    dateInput.value = currentDay;
  }

  requestAnimationFrame(frame);
}

requestAnimationFrame(frame);

// Re-export for later steps
export { state };
