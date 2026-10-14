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
