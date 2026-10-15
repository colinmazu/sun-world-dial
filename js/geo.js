// Pure maths utilities — no DOM, no Three.js, no fetch.

/** Trim, upper-case, remove spaces; validate UK postcode format and re-insert space. */
export function normalisePostcode(text) {
  const s = text.trim().toUpperCase().replace(/ /g, '');
  if (/^[A-Z]{1,2}[0-9][A-Z0-9]?[0-9][A-Z]{2}$/.test(s)) {
    return s.slice(0, -3) + ' ' + s.slice(-3);
  }
  return null;
}

/** Format latitude and longitude with 4 decimal places and N/S E/W suffixes. */
export function formatLatLon(lat, lon) {
  const latStr = Math.abs(lat).toFixed(4) + '° ' + (lat >= 0 ? 'N' : 'S');
  const lonStr = Math.abs(lon).toFixed(4) + '° ' + (lon >= 0 ? 'E' : 'W');
  return latStr + ', ' + lonStr;
}

/** Convert lat/lon (degrees) to a 3D point on a sphere. +z is lon 0°, +y is north, +x is 90° E. */
export function latLonToVector3(lat, lon, radius) {
  const rLat = lat * Math.PI / 180;
  const rLon = lon * Math.PI / 180;
  return {
    x: radius * Math.cos(rLat) * Math.sin(rLon),
    y: radius * Math.sin(rLat),
    z: radius * Math.cos(rLat) * Math.cos(rLon),
  };
}

/** Return the subsolar point { lat, lon } in degrees for a given Date. */
export function subsolarPoint(date) {
  const d = date.getTime() / 86400000 - 10957.5;
  const g = 357.529 + 0.98560028 * d;
  const q = 280.459 + 0.98564736 * d;
  const L = q + 1.915 * Math.sin(g * Math.PI / 180) + 0.020 * Math.sin(2 * g * Math.PI / 180);
  const e = 23.439 - 0.00000036 * d;
  const lat = Math.asin(
    Math.sin(e * Math.PI / 180) * Math.sin(L * Math.PI / 180)
  ) * 180 / Math.PI;
  const ra = Math.atan2(
    Math.cos(e * Math.PI / 180) * Math.sin(L * Math.PI / 180),
    Math.cos(L * Math.PI / 180)
  ) * 180 / Math.PI / 15;
  let eot = q / 15 - ra;
  // Wrap EOT into -12..+12
  while (eot > 12) eot -= 24;
  while (eot <= -12) eot += 24;
  const utcHours = date.getUTCHours() + date.getUTCMinutes() / 60 + date.getUTCSeconds() / 3600;
  let lon = -15 * (utcHours - 12 + eot);
  // Wrap into -180..+180
  while (lon > 180) lon -= 360;
  while (lon <= -180) lon += 360;
  return { lat, lon };
}

/** Advance simulated time. elapsedMs is real ms since last frame; dayMs is ms per simulated day. */
export function advanceTime(simTime, elapsedMs, dayMs) {
  return new Date(simTime.getTime() + (elapsedMs * 86400000) / dayMs);
}

/** Return sun altitude and azimuth { alt, az } in degrees for a given date and location. */
export function sunAltAz(date, lat, lon) {
  const p = globalThis.SunCalc.getPosition(date, lat, lon);
  const alt = p.altitude * 180 / Math.PI;
  const az = (p.azimuth * 180 / Math.PI + 180 + 360) % 360;
  return { alt, az };
}

/** Return sunrise/sunset events for a given date and location. */
export function sunEvents(date, lat, lon) {
  // Use 12:00 UTC on the UK calendar day to avoid picking the wrong day near midnight.
  const ukDay = new Date(
    date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), 12, 0, 0
  );
  const times = globalThis.SunCalc.getTimes(ukDay, lat, lon);
  const sunriseAz = sunAltAz(times.sunrise, lat, lon).az;
  const sunsetAz = sunAltAz(times.sunset, lat, lon).az;
  return { sunrise: times.sunrise, sunset: times.sunset, sunriseAz, sunsetAz };
}

/** Angles (radians) for the "Earth spins" view, where the sun is fixed at +x and the camera looks from +z. */
export function spinAngles(date) {
  const r = Math.PI / 180;
  const d = date.getTime() / 86400000 - 10957.5;
  const g = (357.529 + 0.98560028 * d) * r;
  const q = 280.459 + 0.98564736 * d;
  const L = (q + 1.915 * Math.sin(g) + 0.020 * Math.sin(2 * g)) * r; // the sun's ecliptic longitude
  const e = (23.439 - 0.00000036 * d) * r;                            // the axial tilt
  const ra = Math.atan2(Math.cos(e) * Math.sin(L), Math.cos(L));      // the sun's right ascension
  const wrap = a => Math.atan2(Math.sin(a), Math.cos(a));             // into -π..π
  return {
    year: wrap(Math.PI / 2 - L),                 // turns the direction of the lean as the year goes on
    tilt: -e,                                    // leans the axis by 23.4°
    spin: wrap(ra - subsolarPoint(date).lon * r), // turns the Earth so the subsolar point faces the sun
  };
}

/** Where the Earth sits on its orbit in the "Sun in the middle" view: the Sun at the origin, the lean fixed. */
export function orbitPosition(date, radius) {
  const y = spinAngles(date).year;
  return { x: -radius * Math.cos(y), y: 0, z: -radius * Math.sin(y) };
}

/** Advance simulated time by whole days only, so the time of day stays put.
    carryMs is real time not yet used up from earlier frames; yearMs is real ms per simulated year. */
export function advanceByDays(simTime, carryMs, elapsedMs, yearMs) {
  const msPerDay = yearMs / 365.2422;
  const total = carryMs + elapsedMs;
  const days = Math.floor(total / msPerDay);
  return { simTime: new Date(simTime.getTime() + days * 86400000), carryMs: total - days * msPerDay };
}

/** What a keyboard key does: { toggle: true }, { minutes: n }, { days: n }, or null. */
export function keyAction(key) {
  if (key === ' ') return { toggle: true };
  if (key === 'ArrowLeft') return { minutes: -10 };
  if (key === 'ArrowRight') return { minutes: 10 };
  if (key === 'ArrowUp') return { days: 1 };
  if (key === 'ArrowDown') return { days: -1 };
  return null;
}

/** Return an array of { az, alt } points for the sun path every 10 minutes on a UK calendar day. */
export function sunPath(date, lat, lon, minAlt = -10) {
  const ukParts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Europe/London', year: 'numeric', month: 'numeric', day: 'numeric',
  }).formatToParts(date);
  const ukYear = Number(ukParts.find(p => p.type === 'year').value);
  const ukMonth = Number(ukParts.find(p => p.type === 'month').value) - 1; // 0-indexed
  const ukDay = Number(ukParts.find(p => p.type === 'day').value);

  // Work out the UTC offset for UK time at noon on that UK calendar day.
  const noonUtc = new Date(Date.UTC(ukYear, ukMonth, ukDay, 12, 0, 0));
  const ukHour = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Europe/London', hour: 'numeric', hour12: false,
  }).format(noonUtc);
  const offsetHours = Number(ukHour) - 12;

  // Start at 00:00 UK time on the UK calendar day.
  const startMs = Date.UTC(ukYear, ukMonth, ukDay) - offsetHours * 3600000;

  const points = [];
  for (let mins = 0; mins < 1440; mins += 10) {
    const t = new Date(startMs + mins * 60000);
    const p = sunAltAz(t, lat, lon);
    if (p.alt > minAlt) {
      points.push(p);
    }
  }
  return points;
}

/** The Moon's altitude and azimuth in degrees (same convention as sunAltAz), and the bright limb's angle
    in radians, measured from straight up, anticlockwise as you look at the sky. */
export function moonAltAz(date, lat, lon) {
  const p = globalThis.SunCalc.getMoonPosition(date, lat, lon);
  const i = globalThis.SunCalc.getMoonIllumination(date);
  return {
    alt: p.altitude * 180 / Math.PI,
    az: (p.azimuth * 180 / Math.PI + 180 + 360) % 360,
    limb: i.angle - p.parallacticAngle,
  };
}

/** How much of the Moon is lit (0..1) and whether it is waxing. */
export function moonInfo(date) {
  const i = globalThis.SunCalc.getMoonIllumination(date);
  return { fraction: i.fraction, waxing: i.phase < 0.5 };
}

/** Moonrise and moonset on the UK day of `date` (null if there isn't one that day). */
export function moonTimes(date, lat, lon) {
  const noon = ukNoon(date);
  const offsetHours = Number(new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Europe/London', hour: 'numeric', hour12: false,
  }).format(noon)) - 12;
  const midnight = new Date(noon.getTime() - (12 + offsetHours) * 3600000); // 00:00 UK time
  const t = globalThis.SunCalc.getMoonTimes(midnight, lat, lon, true);
  return { rise: t.rise || null, set: t.set || null, alwaysUp: !!t.alwaysUp, alwaysDown: !!t.alwaysDown };
}

/** The twilight phase for a sun altitude in degrees. */
export function twilightPhase(alt) {
  if (alt >= 6) return 'day';
  if (alt >= 0) return 'golden';
  if (alt >= -6) return 'civil';
  if (alt >= -12) return 'nautical';
  if (alt >= -18) return 'astro';
  return 'night';
}

/** Morning and evening twilight times for the UK day of `date` (Dates; Invalid Date if it never happens). */
export function twilightTimes(date, lat, lon) {
  const t = globalThis.SunCalc.getTimes(ukNoon(date), lat, lon);
  return {
    nightEnd: t.nightEnd, goldenHourEnd: t.goldenHourEnd, sunrise: t.sunrise,
    sunset: t.sunset, goldenHour: t.goldenHour, night: t.night,
  };
}

/** 12:00 UK time on the UK calendar day of `date`. */
function ukNoon(date) {
  const p = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Europe/London', year: 'numeric', month: 'numeric', day: 'numeric',
  }).formatToParts(date);
  const n = t => Number(p.find(x => x.type === t).value);
  return new Date(Date.UTC(n('year'), n('month') - 1, n('day'), 12));
}
