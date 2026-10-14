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
  const utcHours = date.getUTCHours() + date.getUTCMinutes() / 60 + date.getUTCSeconds() / 360;

  // Subsolar longitude, wrapped to -180..+180
  let lonDeg = -15 * (utcHours - 12 + eot);
  while (lonDeg > 180) lonDeg -= 360;
  while (lonDeg <= -180) lonDeg += 360;

  return { lat: latDeg, lon: lonDeg };
}
