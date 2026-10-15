// Shared state, form handling, animation loop.

import { normalisePostcode, formatLatLon, advanceTime, advanceByDays, sunEvents } from './geo.js';
import { lookupPostcode } from './postcode.js';
import { createGlobe, setMarker, updateGlobe, setGlobeMode, getGlobeMode } from './globe.js';
import { drawHorizon } from './horizon.js';
import { initPano } from './pano-ui.js';

const state = {
  postcode: null,
  lat: null,
  lon: null,
  simTime: new Date(),
  playing: false,
  dayMs: 24000,
  yearMs: null,
  carryMs: 0,
  horizonPhoto: null,
  groundDeg: 10,
};

export { state };

// --- Postcode form ---
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
    updateSunTimes();
    markDirty();
  } catch (err) {
    if (err instanceof TypeError && err.message.includes('fetch')) {
      result.textContent = "Couldn't reach the postcode service.";
    } else {
      result.textContent = err.message;
    }
  } finally {
    btn.disabled = false;
  }
});

// --- Controls ---
const playBtn = document.getElementById('play-btn');
const speedSelect = document.getElementById('speed-select');
const dateInput = document.getElementById('date-input');
const simClock = document.getElementById('sim-clock');
const viewToggle = document.getElementById('view-toggle');
const globeDiv = document.getElementById('globe');
const horizonCanvas = document.getElementById('horizon');
const sunTimesEl = document.getElementById('sun-times');
const timeSlider = document.getElementById('time-slider');
const timeDisplay = document.getElementById('time-display');

// UK formatters for hour/minute extraction
const ukHourFmt = new Intl.DateTimeFormat('en-GB', {
  timeZone: 'Europe/London', hour: 'numeric', hour12: false,
});
const ukMinFmt = new Intl.DateTimeFormat('en-GB', {
  timeZone: 'Europe/London', minute: 'numeric',
});

/** Return the UK minute-of-day (0–1439) for a Date. */
function ukMinuteOfDay(d) {
  return Number(ukHourFmt.format(d)) * 60 + Number(ukMinFmt.format(d));
}

/** Set simTime to a given UK minute-of-day on the current simulated date. */
function setTimeFromSlider(minuteOfDay) {
  const parts = dateInput.value.split('-').map(Number);
  const utcNoon = new Date(Date.UTC(parts[0], parts[1] - 1, parts[2], 12, 0, 0));
  const ukHour = Number(ukHourFmt.format(utcNoon));
  const offsetHours = ukHour - 12;
  // Start of UK day in UTC ms
  const startMs = Date.UTC(parts[0], parts[1] - 1, parts[2]) - offsetHours * 3600000;
  state.simTime = new Date(startMs + minuteOfDay * 60000);
  markDirty();
}

// Initialise slider to match current simTime on load.
timeSlider.value = ukMinuteOfDay(state.simTime);

// Slider drag: set time and pause playback.
timeSlider.addEventListener('input', () => {
  setTimeFromSlider(Number(timeSlider.value));
  state.playing = false;
  playBtn.textContent = 'Play';
});
const midsummerBtn = document.getElementById('midsummer-btn');
const midwinterBtn = document.getElementById('midwinter-btn');
const equinoxBtn = document.getElementById('equinox-btn');

/** Set simTime to 12:00 UK time on a given month/day in the current simulated year. */
function setSeason(month, day) {
  const year = state.simTime.getUTCFullYear();
  const utcNoon = new Date(Date.UTC(year, month - 1, day, 12, 0, 0));
  const offsetHours = Number(ukHourFmt.format(utcNoon)) - 12;
  state.simTime = new Date(utcNoon.getTime() - offsetHours * 3600000);
  state.playing = false;
  playBtn.textContent = 'Play';
  markDirty();
}

midsummerBtn.addEventListener('click', () => setSeason(6, 21));
midwinterBtn.addEventListener('click', () => setSeason(12, 21));
equinoxBtn.addEventListener('click', () => setSeason(3, 20));

// Orbit / Spin toggle
const orbitSpinBtn = document.getElementById('orbit-spin-btn');

orbitSpinBtn.addEventListener('click', () => {
  if (getGlobeMode() === 'orbit') {
    setGlobeMode('spin');
    orbitSpinBtn.textContent = 'Sun orbits';
  } else {
    setGlobeMode('orbit');
    orbitSpinBtn.textContent = 'Earth spins';
  }
  updateGlobe(state);
});

// UK time formatter for sunrise/sunset times
const ukTimeFmt = new Intl.DateTimeFormat('en-GB', {
  timeZone: 'Europe/London', hour: '2-digit', minute: '2-digit',
});

/** Update the #sun-times paragraph. */
function updateSunTimes() {
  if (state.lat === null) {
    sunTimesEl.textContent = '';
    return;
  }
  const ev = sunEvents(state.simTime, state.lat, state.lon);
  const riseT = ukTimeFmt.format(ev.sunrise);
  const setT = ukTimeFmt.format(ev.sunset);
  const riseAz = Math.round(ev.sunriseAz);
  const setAz = Math.round(ev.sunsetAz);
  const diffMin = Math.round((ev.sunset - ev.sunrise) / 60000);
  const h = Math.floor(diffMin / 60);
  const m = diffMin % 60;
  sunTimesEl.textContent =
    `Sunrise ${riseT} (${riseAz}°) · Sunset ${setT} (${setAz}°) · Day length ${h} h ${m.toString().padStart(2, '0')} m`;
}

// View toggle: switch between globe and horizon
viewToggle.addEventListener('click', () => {
  if (horizonCanvas.hidden) {
    horizonCanvas.hidden = false;
    globeDiv.hidden = true;
    viewToggle.textContent = 'Show globe';
  } else {
    horizonCanvas.hidden = true;
    globeDiv.hidden = false;
    viewToggle.textContent = 'Show horizon';
  }
});

// UK formatter for the clock
const ukFmt = new Intl.DateTimeFormat('en-GB', {
  timeZone: 'Europe/London',
  weekday: 'short', day: 'numeric', month: 'short', year: 'numeric',
  hour: '2-digit', minute: '2-digit', timeZoneName: 'short',
});

// UK formatter for the date input (YYYY-MM-DD parts)
const ukDateFmt = new Intl.DateTimeFormat('en-GB', {
  timeZone: 'Europe/London', year: 'numeric', month: '2-digit', day: '2-digit',
});

// Set date input to today (UK calendar) on load.
// <input type="date"> requires YYYY-MM-DD, so use ISO and slice the prefix.
const ukIso = new Intl.DateTimeFormat('en-GB', {
  timeZone: 'Europe/London', year: 'numeric', month: '2-digit', day: '2-digit',
}).formatToParts(state.simTime);
const y = ukIso.find(p => p.type === 'year').value.padStart(4, '0');
const m = ukIso.find(p => p.type === 'month').value;
const d = ukIso.find(p => p.type === 'day').value;
dateInput.value = y + '-' + m + '-' + d;

playBtn.addEventListener('click', () => {
  state.playing = !state.playing;
  playBtn.textContent = state.playing ? 'Pause' : 'Play';
});

speedSelect.addEventListener('change', () => {
  if (speedSelect.value === 'year60') {
    state.yearMs = 60000;
  } else {
    state.yearMs = null;
    state.dayMs = Number(speedSelect.value);
  }
  state.carryMs = 0;
});

dateInput.addEventListener('change', () => {
  // Parse the YYYY-MM-DD and set simTime to 00:00 UK time on that date.
  const parts = dateInput.value.split('-').map(Number);
  // Create a UTC date for the given calendar day, then offset to UK midnight.
  const utc = new Date(Date.UTC(parts[0], parts[1] - 1, parts[2], 12, 0, 0));
  // Get UK offset at noon on that date
  const utcHour = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Europe/London', hour: 'numeric', hour12: false,
  }).format(utc);
  const ukOffsetHours = Number(utcHour) - 12; // difference from UTC noon
  state.simTime = new Date(utc.getTime() - ukOffsetHours * 3600000);
  markDirty();
});

const groundSlider = document.getElementById('ground-slider');
const groundDisplay = document.getElementById('ground-display');

/** Apply a ground depth setting. */
function applyGround(deg) {
  state.groundDeg = deg;
  groundSlider.value = deg;
  groundDisplay.textContent = deg + '°';
  horizonCanvas.style.aspectRatio = '240 / ' + (70 + deg);
  horizonCanvas.style.setProperty('--hr', String(240 / (70 + deg)));
  try { localStorage.setItem('sunworld.groundDeg', String(deg)); } catch {}
  markDirty();
}

// Load saved ground setting or default to 10.
try {
  const saved = Number(localStorage.getItem('sunworld.groundDeg'));
  if (saved >= 10 && saved <= 60) applyGround(saved);
  else applyGround(10);
} catch {
  applyGround(10);
}

groundSlider.addEventListener('input', () => {
  applyGround(Number(groundSlider.value));
});

// --- Globe & animation loop ---
createGlobe(document.getElementById('globe'));

let lastTs = null;
let dirty = true; // redraw globe, horizon, and UI when state has changed

function markDirty() {
  dirty = true;
}

function tick(ts) {
  requestAnimationFrame(tick);
  if (lastTs !== null) {
    const elapsedMs = ts - lastTs;
    if (state.playing) {
      if (state.yearMs) {
        const r = advanceByDays(state.simTime, state.carryMs, elapsedMs, state.yearMs);
        state.simTime = r.simTime;
        state.carryMs = r.carryMs;
        dirty = true;
      } else {
        state.simTime = advanceTime(state.simTime, elapsedMs, state.dayMs);
        dirty = true;
      }
    }
    if (dirty) {
      updateGlobe(state);

      // Draw horizon if visible
      if (!horizonCanvas.hidden) {
        drawHorizon(horizonCanvas, state);
      }

      // Update clock
      simClock.textContent = ukFmt.format(state.simTime);

      // Sync time slider and display from simTime (only update slider during playback)
      const currentMin = ukMinuteOfDay(state.simTime);
      if (state.playing && timeSlider.value !== String(currentMin)) {
        timeSlider.value = currentMin;
      }
      const hh = String(Math.floor(currentMin / 60)).padStart(2, '0');
      const mm = String(currentMin % 60).padStart(2, '0');
      if (timeDisplay.textContent !== hh + ':' + mm) {
        timeDisplay.textContent = hh + ':' + mm;
      }

      // Sync date input when the simulated day changes
      const dp = ukDateFmt.formatToParts(state.simTime);
      const currentDateStr =
        dp.find(p => p.type === 'year').value.padStart(4, '0') + '-' +
        dp.find(p => p.type === 'month').value + '-' +
        dp.find(p => p.type === 'day').value;
      if (dateInput.value !== currentDateStr) {
        dateInput.value = currentDateStr;
        updateSunTimes();
      }
      dirty = false;
    }
  }
  lastTs = ts;
}

requestAnimationFrame(tick);

// --- Panorama panel ---
initPano(state, {
  onLocation(lat, lon, label) {
    state.lat = lat;
    state.lon = lon;
    state.postcode = label;
    result.textContent = label + ': ' + formatLatLon(lat, lon);
    setMarker(lat, lon);
    updateSunTimes();
    markDirty();
  },
  onTime(date) {
    state.simTime = date;
    state.playing = false;
    playBtn.textContent = 'Play';
    timeSlider.value = ukMinuteOfDay(date);
    markDirty();
    updateSunTimes();
  },
});
