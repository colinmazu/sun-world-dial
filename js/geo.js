// Pure maths: no DOM, no Three.js, no fetch.

/** Trim, upper-case, remove spaces; validate UK postcode format and re-insert space. */
export function normalisePostcode(text) {
  const s = text.trim().toUpperCase().replace(/\s/g, '');
  if (/^[A-Z]{1,2}[0-9][A-Z0-9]?[0-9][A-Z]{2}$/.test(s)) {
    return s.slice(0, -3) + ' ' + s.slice(-3);
  }
  return null;
}

/** Format lat/lon with 4 decimal places and N/S, E/W suffixes. */
export function formatLatLon(lat, lon) {
  const latStr = Math.abs(lat).toFixed(4) + '° ' + (lat >= 0 ? 'N' : 'S');
  const lonStr = Math.abs(lon).toFixed(4) + '° ' + (lon >= 0 ? 'E' : 'W');
  return latStr + ', ' + lonStr;
}

/** Convert lat/lon (degrees) to x/y/z on a sphere. Lon 0 faces +z, north is +y, 90 E is +x. */
export function latLonToVector3(lat, lon, radius) {
  const rLat = lat * Math.PI / 180;
  const rLon = lon * Math.PI / 180;
  return {
    x: radius * Math.cos(rLat) * Math.sin(rLon),
    y: radius * Math.sin(rLat),
    z: radius * Math.cos(rLat) * Math.cos(rLon),
  };
}

/** Compute the subsolar point (lat, lon in degrees) for a given Date. */
export function subsolarPoint(date) {
  const d = date.getTime() / 86400000 - 10957.5;
  const g = ((357.529 + 0.98560028 * d) * Math.PI / 180);
  const qDeg = 280.459 + 0.98564736 * d;
  const L = ((qDeg + 1.915 * Math.sin(g) + 0.020 * Math.sin(2 * g)) * Math.PI / 180);
  const e = (23.439 - 0.00000036 * d) * Math.PI / 180;

  // Declination (subsolar latitude)
  const latRad = Math.asin(Math.sin(e) * Math.sin(L));
  const latDeg = latRad * 180 / Math.PI;

  // Right ascension in hours
  const ra = Math.atan2(Math.cos(e) * Math.sin(L), Math.cos(L)) / (Math.PI / 180) / 15;

  // Equation of time, wrapped to -12..+12
  let eot = qDeg / 15 - ra;
  while (eot > 12) eot -= 24;
  while (eot <= -12) eot += 24;

  // UTC hours from the date
  const utcHours = date.getUTCHours() + date.getUTCMinutes() / 60 + date.getUTCSeconds() / 3600;

  // Subsolar longitude, wrapped to -180..+180
  let lonDeg = -15 * (utcHours - 12 + eot);
  while (lonDeg > 180) lonDeg -= 360;
  while (lonDeg <= -180) lonDeg += 360;

  return { lat: latDeg, lon: lonDeg };
}

/** Return sun altitude and azimuth (degrees) for a given date and location. */
export function sunAltAz(date, lat, lon) {
  const pos = globalThis.SunCalc.getPosition(date, lat, lon);
  const alt = pos.altitude * 180 / Math.PI;
  // SunCalc azimuth: from south, west positive → compass bearing (0=N, 90=E)
  const az = ((pos.azimuth * 180 / Math.PI + 180 + 360) % 360);
  return { alt, az };
}

/** Return sunrise/sunset times and azimuths for a given date and location. */
export function sunEvents(date, lat, lon) {
  // Use noon UTC on the UK calendar day to avoid midnight-day mismatch
  const ukDay = date.toLocaleDateString('en-CA', { timeZone: 'Europe/London' });
  const parts = ukDay.split('-');
  const noonUTC = new Date(Date.UTC(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10), 12, 0, 0));
  const times = globalThis.SunCalc.getTimes(noonUTC, lat, lon);
  const srAz = sunAltAz(times.sunrise, lat, lon).az;
  const ssAz = sunAltAz(times.sunset, lat, lon).az;
  return { sunrise: times.sunrise, sunset: times.sunset, sunriseAz: srAz, sunsetAz: ssAz };
}

/** Return sun-path points (every 10 min, alt > -10) for a given date and location. */
export function sunPath(date, lat, lon) {
  const ukDay = date.toLocaleDateString('en-CA', { timeZone: 'Europe/London' });
  const parts = ukDay.split('-');
  const base = Date.UTC(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
  // Get UK offset to convert local hours to UTC
  const noonUTC = new Date(base + 12 * 3600000);
  const noonLocal = noonUTC.toLocaleString('en-GB', { timeZone: 'Europe/London', hour: '2-digit', minute: '2-digit', hour12: false });
  // Simpler: iterate 00:00–24:00 UK time in 10-min steps
  const points = [];
  for (let min = 0; min < 1440; min += 10) {
    const h = Math.floor(min / 60);
    const m = min % 60;
    // Create UTC time that corresponds to h:m UK time — approximate with offset
    const ukTimeStr = parts[0] + '-' + parts[1] + '-' + parts[2] + 'T' + String(h).padStart(2, '0') + ':' + String(m).padStart(2, '0') + ':00';
    // Convert UK local to UTC by trying noon and measuring offset
    const testUTC = new Date(base + 12 * 3600000);
    const testParts = testUTC.toLocaleString('en-GB', { timeZone: 'Europe/London', hour: '2-digit', minute: '2-digit', hour12: false }).split(':');
    const utcOffsetHrs = parseInt(testParts[0]) - 12;
    const ts = base + min * 60000 - utcOffsetHrs * 3600000;
    const d = new Date(ts);
    const p = sunAltAz(d, lat, lon);
    if (p.alt > -10) {
      points.push({ az: p.az, alt: p.alt });
    }
  }
  return points;
}
