// Shared state, form handling, animation loop.

import { normalisePostcode, formatLatLon, advanceTime, sunEvents } from './geo.js';
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
}

midsummerBtn.addEventListener('click', () => setSeason(6, 21));
midwinterBtn.addEventListener('click', () => setSeason(12, 21));
equinoxBtn.addEventListener('click', () => setSeason(3, 20));

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

// Set date input to today (UK calendar) on load.
dateInput.value = new Intl.DateTimeFormat('en-GB', {
  timeZone: 'Europe/London', year: 'numeric', month: '2-digit', day: '2-digit',
}).format(state.simTime).replace(/\//g, '-');

playBtn.addEventListener('click', () => {
  state.playing = !state.playing;
  playBtn.textContent = state.playing ? 'Pause' : 'Play';
});

speedSelect.addEventListener('change', () => {
  state.dayMs = Number(speedSelect.value);
});

dateInput.addEventListener('change', () => {
  // Parse the YYYY-MM-DD and set simTime to 00:00 UK time on that date.
  const parts = dateInput.value.split('-').map(Number);
  // Create a UTC date for the given calendar day, then offset to UK midnight.
  const utc = new Date(Date.UTC(parts[0], parts[1] - 1, parts[2], 12, 0, 0));
  // Get UK offset at noon on that date
  const ukStr = utc.toLocaleString('en-GB', { timeZone: 'Europe/London' });
  // Parse the UK time to figure out offset — but don't use Date.parse on DD/MM/YYYY.
  // Instead, compute offset by formatting in both UTC and UK.
  const utcHour = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Europe/London', hour: 'numeric', hour12: false,
  }).format(utc);
  const ukOffsetHours = Number(utcHour) - 12; // difference from UTC noon
  state.simTime = new Date(utc.getTime() - ukOffsetHours * 3600000);
});

// --- Globe & animation loop ---
createGlobe(document.getElementById('globe'));

let lastTs = null;

function tick(ts) {
  if (lastTs !== null) {
    const elapsedMs = ts - lastTs;
    if (state.playing) {
      state.simTime = advanceTime(state.simTime, elapsedMs, state.dayMs);
    }
    updateGlobe(state);

    // Draw horizon if visible
    if (!horizonCanvas.hidden) {
      drawHorizon(horizonCanvas, state);
    }

    // Update clock
    simClock.textContent = ukFmt.format(state.simTime);

    // Sync time slider and display from simTime (tracks during playback)
    const currentMin = ukMinuteOfDay(state.simTime);
    if (timeSlider.value !== String(currentMin)) {
      timeSlider.value = currentMin;
    }
    const hh = String(Math.floor(currentMin / 60)).padStart(2, '0');
    const mm = String(currentMin % 60).padStart(2, '0');
    if (timeDisplay.textContent !== hh + ':' + mm) {
      timeDisplay.textContent = hh + ':' + mm;
    }

    // Sync date input when the simulated day changes
    const currentDateStr = new Intl.DateTimeFormat('en-GB', {
      timeZone: 'Europe/London', year: 'numeric', month: '2-digit', day: '2-digit',
    }).format(state.simTime).replace(/\//g, '-');
    if (dateInput.value !== currentDateStr) {
      dateInput.value = currentDateStr;
      updateSunTimes();
    }
  }
  lastTs = ts;
  requestAnimationFrame(tick);
}

requestAnimationFrame(tick);
