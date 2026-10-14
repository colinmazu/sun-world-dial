// 2D horizon canvas — no Three.js.

import { sunAltAz } from './geo.js';

/** Convert azimuth/altitude to pixel coordinates on the horizon canvas. */
export function azAltToXY(az, alt, width, height) {
  return {
    x: (az - 30) / 300 * width,
    y: (70 - alt) / 80 * height,
  };
}

/** Draw the horizon view on the given canvas using current state. */
export function drawHorizon(canvas, state) {
  const dpr = window.devicePixelRatio || 1;
  const w = canvas.clientWidth;
  const h = canvas.clientHeight;
  canvas.width = w * dpr;
  canvas.height = h * dpr;
  const ctx = canvas.getContext('2d');
  ctx.scale(dpr, dpr);

  if (state.lat === null) {
    ctx.fillStyle = '#333';
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = '#aaa';
    ctx.font = '16px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('Enter a postcode first', w / 2, h / 2 + 5);
    return;
  }

  const { alt, az } = sunAltAz(state.simTime, state.lat, state.lon);

  // Sky gradient based on sun altitude
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

  // Horizon line is at alt = 0 → y = (70 - 0) / 80 * h = 70/80 * h
  const horizonY = (70 / 80) * h;

  // Sky
  const skyGrad = ctx.createLinearGradient(0, 0, 0, horizonY);
  skyGrad.addColorStop(0, topColor);
  skyGrad.addColorStop(1, bottomColor);
  ctx.fillStyle = skyGrad;
  ctx.fillRect(0, 0, w, horizonY);

  // Ground
  ctx.fillStyle = '#2f4a2f';
  ctx.fillRect(0, horizonY, w, h - horizonY);

  // Direction labels just below the horizon line
  const labels = [
    { az: 45, text: 'NE' },
    { az: 90, text: 'E' },
    { az: 135, text: 'SE' },
    { az: 180, text: 'S' },
    { az: 225, text: 'SW' },
    { az: 270, text: 'W' },
    { az: 315, text: 'NW' },
  ];

  ctx.fillStyle = alt < 0 ? '#cfe8ff' : '#1a1a1a';
  ctx.font = '12px system-ui, sans-serif';
  ctx.textAlign = 'center';
  for (const l of labels) {
    const px = (l.az - 30) / 300 * w;
    ctx.fillText(l.text, px, horizonY + 14);
  }

  // Sun
  if (alt > -10) {
    const sunPos = azAltToXY(az, alt, w, h);
    ctx.beginPath();
    ctx.arc(sunPos.x, sunPos.y, 12, 0, Math.PI * 2);
    ctx.fillStyle = '#ffd23f';
    ctx.fill();
  }
}
