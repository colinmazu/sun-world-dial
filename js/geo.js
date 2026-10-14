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
