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

/** Return an array of { az, alt } points for the sun path every 10 minutes on a UK calendar day. */
export function sunPath(date, lat, lon) {
  // Determine the UK calendar date for this moment.
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
    if (p.alt > -10) {
      points.push(p);
    }
  }
  return points;
}
