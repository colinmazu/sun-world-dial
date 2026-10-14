// 2D horizon canvas: azimuth panorama from NE through S to NW.

import { sunAltAz } from './geo.js';

/** Convert azimuth and altitude (degrees) to pixel coordinates on the canvas. */
export function azAltToXY(az, alt, width, height) {
  const x = (az - 30) / 300 * width;
  const y = (70 - alt) / 80 * height;
  return { x, y };
}

/** Draw the horizon view on the given canvas using current state. */
export function drawHorizon(canvas, state) {
  const dpr = globalThis.devicePixelRatio || 1;
  const w = canvas.clientWidth;
  const h = canvas.clientHeight;
  canvas.width = w * dpr;
  canvas.height = h * dpr;
  const ctx = canvas.getContext('2d');
  ctx.scale(dpr, dpr);

  if (state.lat === null) {
    ctx.fillStyle = '#333';
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = '#fff';
    ctx.font = '16px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('Enter a postcode first', w / 2, h / 2 + 5);
    return;
  }

  const { alt, az } = sunAltAz(state.simTime, state.lat, state.lon);

  // Choose sky gradient based on sun altitude
  let topColor, bottomColor;
  if (alt < -6) {
    topColor = '#060a1f';
    bottomColor = '#1b2448';
  } else if (alt < 0) {
    topColor = '#1b2448';
    bottomColor = '#f28c38';
  } else {
    topColor = '#3d8fe0';
    bottomColor = '#cfe8ff';
  }

  // Sky gradient (above horizon, altitude > 0)
  const horizonY = azAltToXY(0, 0, w, h).y;
  const grad = ctx.createLinearGradient(0, 0, 0, horizonY);
  grad.addColorStop(0, topColor);
  grad.addColorStop(1, bottomColor);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, w, horizonY);

  // Ground (below horizon)
  ctx.fillStyle = '#2f4a2f';
  ctx.fillRect(0, horizonY, w, h - horizonY);

  // Compass labels just below the horizon line
  const labels = [
    { az: 45, text: 'NE' },
    { az: 90, text: 'E' },
    { az: 135, text: 'SE' },
    { az: 180, text: 'S' },
    { az: 225, text: 'SW' },
    { az: 270, text: 'W' },
    { az: 315, text: 'NW' },
  ];
  ctx.fillStyle = 'rgba(255,255,255,0.6)';
  ctx.font = '11px system-ui, sans-serif';
  ctx.textAlign = 'center';
  for (const l of labels) {
    const p = azAltToXY(l.az, -2, w, h);
    ctx.fillText(l.text, p.x, p.y);
  }

  // Draw sun if above −10° altitude
  if (alt > -10) {
    const sp = azAltToXY(az, alt, w, h);
    ctx.beginPath();
    ctx.arc(sp.x, sp.y, 12, 0, Math.PI * 2);
    ctx.fillStyle = '#ffd23f';
    ctx.fill();
  }
}
