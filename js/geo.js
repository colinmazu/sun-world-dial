// Pure maths helpers — no DOM, no Three.js, no fetch.

/**
 * Trim, upper-case, remove spaces from a postcode string.
 * If the result matches the UK postcode regex, return it with one space
 * before the last 3 characters. Otherwise return null.
 */
export function normalisePostcode(text) {
  const cleaned = text.trim().toUpperCase().replace(/\s/g, '');
  if (/^[A-Z]{1,2}[0-9][A-Z0-9]?[0-9][A-Z]{2}$/.test(cleaned)) {
    return cleaned.slice(0, -3) + ' ' + cleaned.slice(-3);
  }
  return null;
}

/**
 * Format latitude and longitude with 4 decimal places and N/S, E/W suffixes.
 */
export function formatLatLon(lat, lon) {
  const latDir = lat >= 0 ? 'N' : 'S';
  const lonDir = lon >= 0 ? 'E' : 'W';
  return `${Math.abs(lat).toFixed(4)}° ${latDir}, ${Math.abs(lon).toFixed(4)}° ${lonDir}`;
}

/**
 * Convert lat/lon (degrees) to a 3D point on a sphere of the given radius.
 * Longitude 0° on the equator points at +z (the viewer), north is +y, 90° E is +x.
 */
export function latLonToVector3(lat, lon, radius) {
  const latRad = lat * Math.PI / 180;
  const lonRad = lon * Math.PI / 180;
  return {
    x: radius * Math.cos(latRad) * Math.sin(lonRad),
    y: radius * Math.sin(latRad),
    z: radius * Math.cos(latRad) * Math.cos(lonRad),
  };
}

/**
 * Compute the subsolar point (lat, lon in degrees) for a given Date.
 * Uses USNO approximate formulas — agrees with SunCalc to ±0.05°.
 */
export function subsolarPoint(date) {
  const d = date.getTime() / 86400000 - 10957.5; // days since 2000-01-01 12:00 UTC

  // All angles in degrees for the formulas, convert to radians only for trig
  const g = (357.529 + 0.98560028 * d) % 360;   // mean anomaly, deg
  const q = (280.459 + 0.98564736 * d) % 360;   // mean longitude, deg

  const L = (q + 1.915 * Math.sin(g * Math.PI / 180) + 0.020 * Math.sin(2 * g * Math.PI / 180)) % 360; // ecliptic longitude, deg
  const e = 23.439 - 0.00000036 * d;             // obliquity, deg

  // Declination (subsolar latitude) in degrees
  const lat = Math.asin(Math.sin(e * Math.PI / 180) * Math.sin(L * Math.PI / 180)) * 180 / Math.PI;

  // Right ascension in hours
  const ra = Math.atan2(
    Math.cos(e * Math.PI / 180) * Math.sin(L * Math.PI / 180),
    Math.cos(L * Math.PI / 180)
  ) * 180 / Math.PI / 15;

  // Equation of time, wrapped to -12..+12
  let eot = q / 15 - ra;
  while (eot > 12) eot -= 24;
  while (eot <= -12) eot += 24;

  // UTC hours from the date's components
  const utcHours = date.getUTCHours() + date.getUTCMinutes() / 60 + date.getUTCSeconds() / 3600;

  // Subsolar longitude, wrapped to -180..+180
  let lon = -15 * (utcHours - 12 + eot);
  while (lon > 180) lon -= 360;
  while (lon <= -180) lon += 360;

  return { lat, lon };
}

/**
 * Get sun altitude and azimuth (degrees) for a given date and location.
 * Uses SunCalc; converts azimuth to compass bearing (0 = N, 90 = E).
 */
export function sunAltAz(date, lat, lon) {
  const pos = globalThis.SunCalc.getPosition(date, lat, lon);
  const alt = pos.altitude * 180 / Math.PI;
  // SunCalc azimuth: from south, west positive (radians). Convert to compass bearing.
  const az = ((pos.azimuth * 180 / Math.PI + 180 + 360) % 360);
  return { alt, az };
}

/**
 * Get sunrise/sunset times and azimuths for a given date and location.
 * Uses SunCalc.getTimes with a Date at 12:00 UTC to avoid day-picking issues.
 */
export function sunEvents(date, lat, lon) {
  // Build a Date at 12:00 UTC on the same UK calendar day as `date`
  const ukDay = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/London", year: "numeric", month: "2-digit", day: "2-digit"
  }).formatToParts(date);
  const y = +ukDay.find(p => p.type === "year").value;
  const mo = +(ukDay.find(p => p.type === "month").value) - 1; // numeric month, 0-indexed
  const d = +ukDay.find(p => p.type === "day").value;
  const utcNoon = new Date(Date.UTC(y, mo, d, 12));

  const times = globalThis.SunCalc.getTimes(utcNoon, lat, lon);
  const srAz = sunAltAz(times.sunrise, lat, lon).az;
  const ssAz = sunAltAz(times.sunset, lat, lon).az;
  return { sunrise: times.sunrise, sunset: times.sunset, sunriseAz: srAz, sunsetAz: ssAz };
}

/**
 * Compute the sun path for a full day at the given location.
 * Returns { az, alt } points every 10 minutes where alt > -10.
 */
export function sunPath(date, lat, lon) {
  // Find midnight UTC that corresponds to the UK calendar day of `date`
  const ukDay = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/London", year: "numeric", month: "2-digit", day: "2-digit"
  }).formatToParts(date);
  const y = +ukDay.find(p => p.type === "year").value;
  const mo = +(ukDay.find(p => p.type === "month").value) - 1; // numeric month, 0-indexed
  const d = +ukDay.find(p => p.type === "day").value;

  // Start at 00:00 UK time (approximate with UTC, then adjust)
  let startUTC = new Date(Date.UTC(y, mo, d, 12));
  const fp = new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/London", hour: "2-digit" }).formatToParts(startUTC);
  const hVal = parseInt(fp.find(p => p.type === "hour").value, 10);
  startUTC = new Date(Date.UTC(y, mo, d, 12 - hVal));

  const points = [];
  for (let min = 0; min < 1440; min += 10) {
    const t = new Date(startUTC.getTime() + min * 60000);
    const p = sunAltAz(t, lat, lon);
    if (p.alt > -10) {
      points.push({ az: p.az, alt: p.alt });
    }
  }
  return points;
}
