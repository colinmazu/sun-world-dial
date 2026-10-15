// Share link: the scene as a URL hash, and back. Pure: no DOM.

/** Turn the scene into a hash like "#lat=53.0927&lon=-2.4185&place=CW1+6BD&t=2023-12-25T13%3A12Z&view=horizon&mode=orbit". */
export function encodeShare({ lat, lon, place, time, view, mode }) {
  const p = new URLSearchParams();
  if (lat !== null && lon !== null) {
    p.set('lat', lat.toFixed(4));
    p.set('lon', lon.toFixed(4));
    if (place) p.set('place', place);
  }
  p.set('t', time.toISOString().slice(0, 16) + 'Z');
  p.set('view', view);
  p.set('mode', mode);
  return '#' + p.toString();
}

/** Read a hash back. Only valid fields are returned; anything missing or wrong is left out. */
export function decodeShare(hash) {
  const p = new URLSearchParams(hash.replace(/^#/, ''));
  const out = {};
  const lat = Number(p.get('lat')), lon = Number(p.get('lon'));
  if (p.has('lat') && p.has('lon') && Math.abs(lat) <= 90 && Math.abs(lon) <= 180) {
    out.lat = lat;
    out.lon = lon;
    out.place = p.get('place') || 'Shared place';
  }
  const t = new Date(p.get('t'));
  if (p.has('t') && !isNaN(t)) out.time = t;
  if (['globe', 'horizon'].includes(p.get('view'))) out.view = p.get('view');
  if (['orbit', 'spin', 'sun'].includes(p.get('mode'))) out.mode = p.get('mode');
  return out;
}
