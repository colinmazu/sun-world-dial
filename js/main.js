// Shared state, form handling, and animation loop entry point.

import { normalisePostcode, formatLatLon, sunEvents } from './geo.js';
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

const form = document.getElementById('postcode-form');
const input = document.getElementById('postcode-input');
const result = document.getElementById('location-result');
const btn = form.querySelector('button[type="submit"]');

// Controls
const dateInput = document.getElementById('date-input');
const playBtn = document.getElementById('play-btn');
const speedSelect = document.getElementById('speed-select');
const simClock = document.getElementById('sim-clock');
const viewToggle = document.getElementById('view-toggle');
const globeDiv = document.getElementById('globe');
const horizonCanvas = document.getElementById('horizon');
const sunTimesEl = document.getElementById('sun-times');

// Solstice / equinox buttons
const midsummerBtn = document.getElementById('midsummer-btn');
const midwinterBtn = document.getElementById('midwinter-btn');
const equinoxBtn = document.getElementById('equinox-btn');

// UK time formatter for the clock display
const ukFormatter = new Intl.DateTimeFormat("en-GB", {
  timeZone: "Europe/London",
  weekday: "short",
  day: "numeric",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  timeZoneName: "short",
});

// UK time formatter for sunrise/sunset (time only)
const ukTimeFmt = new Intl.DateTimeFormat("en-GB", {
  timeZone: "Europe/London",
  hour: "2-digit",
  minute: "2-digit",
});

/**
 * Set simTime to noon UK time on a given month/day within state.simTime's year.
 * Also pauses playback and updates the date input.
 */
function setSolsticeDate(month, day) {
  const y = new Date(state.simTime).getUTCFullYear();
  // Start at noon UTC, adjust to find noon UK time
  let candidate = new Date(Date.UTC(y, month - 1, day, 12));
  const fp = ukFormatter.formatToParts(candidate);
  const hVal = parseInt(fp.find(p => p.type === 'hour').value, 10);
  // We want 12:xx UK time — adjust so the hour reads 12
  candidate = new Date(candidate.getTime() + (12 - hVal) * 3600000);
  state.simTime = candidate;
  state.playing = false;
  playBtn.textContent = 'Play';
  // Update date input
  const parts = ukFormatter.formatToParts(state.simTime);
  const yStr = parts.find(p => p.type === 'year').value;
  const mLookupInv = { jan: '01', feb: '02', mar: '03', apr: '04', may: '05', jun: '06', jul: '07', aug: '08', sep: '09', oct: '10', nov: '11', dec: '12' };
  const mStr = mLookupInv[parts.find(p => p.type === 'month').value.toLowerCase()];
  const dStr = parts.find(p => p.type === 'day').value.padStart(2, '0');
  dateInput.value = `${yStr}-${mStr}-${dStr}`;
}

// Solstice / equinox button handlers
midsummerBtn.addEventListener('click', () => setSolsticeDate(6, 21));
midwinterBtn.addEventListener('click', () => setSolsticeDate(12, 21));
equinoxBtn.addEventListener('click', () => setSolsticeDate(3, 20));

/**
 * Update the sun-times paragraph for the current day and location.
 */
function updateSunTimes() {
  if (state.lat === null) {
    sunTimesEl.textContent = '';
    return;
  }
  try {
    const ev = sunEvents(state.simTime, state.lat, state.lon);
    const srTime = ukTimeFmt.format(ev.sunrise);
    const ssTime = ukTimeFmt.format(ev.sunset);
    const srAz = Math.round(ev.sunriseAz);
    const ssAz = Math.round(ev.sunsetAz);
    // Day length in hours and minutes
    const diffMs = ev.sunset - ev.sunrise;
    const hrs = Math.floor(diffMs / 3600000);
    const mins = Math.round((diffMs % 3600000) / 60000);
    sunTimesEl.textContent = `Sunrise ${srTime} (${srAz}°) · Sunset ${ssTime} (${ssAz}°) · Day length ${hrs} h ${mins.toString().padStart(2, '0')} m`;
  } catch {
    sunTimesEl.textContent = '';
  }
}

// Set date input to today on load
dateInput.value = new Date().toISOString().slice(0, 10);

// Form submit handler
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
    result.textContent = `${loc.postcode}: ${formatLatLon(loc.lat, loc.lon)}`;
    setMarker(state.lat, state.lon);
    updateSunTimes();
  } catch (err) {
    result.textContent = err.message;
  } finally {
    btn.disabled = false;
  }
});

// Play / Pause toggle
playBtn.addEventListener('click', () => {
  state.playing = !state.playing;
  playBtn.textContent = state.playing ? 'Pause' : 'Play';
});

// Speed selector
speedSelect.addEventListener('change', () => {
  state.dayMs = Number(speedSelect.value);
});

// View toggle: switch between globe and horizon
viewToggle.addEventListener('click', () => {
  const showingHorizon = !horizonCanvas.hidden;
  globeDiv.hidden = !globeDiv.hidden;
  horizonCanvas.hidden = !horizonCanvas.hidden;
  viewToggle.textContent = showingHorizon ? 'Show horizon' : 'Show globe';
});

// Date input change — set simTime to 00:00 UK time on that date
dateInput.addEventListener('input', () => {
  if (!dateInput.value) return;
  const parts = dateInput.value.split('-');
  // Start at noon UTC on that day, then adjust by checking the formatted hour in UK time
  let candidate = new Date(Date.UTC(+parts[0], +parts[1] - 1, +parts[2], 12));
  const fp = ukFormatter.formatToParts(candidate);
  const hourVal = fp.find(p => p.type === 'hour').value;
  // Subtract the displayed hour to get close to midnight UK time
  candidate = new Date(candidate.getTime() - parseInt(hourVal, 10) * 3600000);
  state.simTime = candidate;
  updateSunTimes();
});

// Animation loop
let lastTime = performance.now();

function tick(now) {
  requestAnimationFrame(tick);

  const elapsedMs = now - lastTime;
  lastTime = now;

  if (state.playing) {
    // Advance simTime: elapsedMs * (86400000 ms/day / dayMs)
    state.simTime = new Date(state.simTime.getTime() + elapsedMs * 86400000 / state.dayMs);

    // Update date input when the simulated calendar day changes
    const simDay = ukFormatter.formatToParts(state.simTime).find(p => p.type === 'day');
    const inputDate = new Date(dateInput.value + 'T12:00:00Z');
    const inputDay = ukFormatter.formatToParts(inputDate).find(p => p.type === 'day');
    if (simDay && inputDay && simDay.value !== inputDay.value) {
      // Extract year/month/day from the formatted UK time
      const parts = ukFormatter.formatToParts(state.simTime);
      const y = parts.find(p => p.type === 'year').value;
      const m = parts.find(p => p.type === 'month');
      const d = parts.find(p => p.type === 'day').value.padStart(2, '0');
      const monthNum = { jan: '01', feb: '02', mar: '03', apr: '04', may: '05', jun: '06', jul: '07', aug: '08', sep: '09', oct: '10', nov: '11', dec: '12' }[m.value.toLowerCase()];
      dateInput.value = `${y}-${monthNum}-${d}`;
      // Day changed — update sun times
      updateSunTimes();
    }
  }

  // Update globe sun position and clock display
  updateGlobe(state);
  simClock.textContent = ukFormatter.format(state.simTime);

  // Draw horizon if visible
  if (!horizonCanvas.hidden) {
    drawHorizon(horizonCanvas, state);
  }
}

requestAnimationFrame(tick);

// Initialise the globe on load
createGlobe(document.getElementById('globe'));
