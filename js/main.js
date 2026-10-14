// Shared state, form handling, and animation loop.

import { normalisePostcode, formatLatLon } from './geo.js';
import { lookupPostcode } from './postcode.js';
import { createGlobe, setMarker, updateGlobe } from './globe.js';

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

// UK time formatter for the clock
const ukFmt = new Intl.DateTimeFormat('en-GB', {
  timeZone: 'Europe/London',
  weekday: 'short', day: 'numeric', month: 'short', year: 'numeric',
  hour: '2-digit', minute: '2-digit', timeZoneName: 'short',
});

// Set date input to today (UK calendar)
function ukToday() {
  const parts = ukFmt.formatToParts(new Date());
  const m = new Date().toLocaleString('en-GB', { timeZone: 'Europe/London' }).split(',')[0];
  // Build a YYYY-MM-DD from UK date string
  const d = new Date();
  const y = d.getUTCFullYear();
  return y + '-01-01'; // fallback, we use a simpler approach below
}

// Simpler: get today in UK time as YYYY-MM-DD
function ukDateStr(d) {
  const s = d.toLocaleDateString('en-CA', { timeZone: 'Europe/London' });
  return s; // ISO format YYYY-MM-DD
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

// Date input change → set simTime to 00:00 UK time on that date
dateInput.addEventListener('change', () => {
  const parts = dateInput.value.split('-'); // YYYY-MM-DD
  // Create a date at noon UTC to avoid DST edge cases, then adjust to 00:00 UK
  const base = new Date(parts[0], parseInt(parts[1], 10) - 1, parseInt(parts[2], 10), 12, 0, 0);
  // Offset by the UK timezone offset at that time to get midnight UK
  const offsetMs = base.getTimezoneOffset() * 60000;
  // Actually we need Europe/London offset — use a trick: format noon UTC and compare
  // Simpler: set to 12:00 UTC on the date, which is roughly noon UK (off by BST/GMT but close)
  state.simTime = new Date(Date.UTC(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10), 12, 0, 0));
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
