// 2D horizon canvas: azimuth panorama from NE through S to NW.

import { sunAltAz, sunPath, sunEvents } from './geo.js';

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

  // Step 6: draw sun paths
  const year = state.simTime.getFullYear();

  // Helper to draw a path as a line
  function drawPathLine(points, color, width, dashed) {
    if (points.length < 2) return;
    ctx.beginPath();
    ctx.strokeStyle = color;
    ctx.lineWidth = width;
    if (dashed) ctx.setLineDash([5, 4]);
    else ctx.setLineDash([]);
    const start = azAltToXY(points[0].az, points[0].alt, w, h);
    ctx.moveTo(start.x, start.y);
    for (let i = 1; i < points.length; i++) {
      const p = azAltToXY(points[i].az, points[i].alt, w, h);
      ctx.lineTo(p.x, p.y);
    }
    ctx.stroke();
    ctx.setLineDash([]);
  }

  // Midsummer path (21 June) — dashed white at 35% opacity
  const midsummerDate = new Date(Date.UTC(year, 5, 21));
  drawPathLine(sunPath(midsummerDate, state.lat, state.lon), 'rgba(255,255,255,0.35)', 1.5, true);

  // Midwinter path (21 December) — dashed white at 35% opacity
  const midwinterDate = new Date(Date.UTC(year, 11, 21));
  drawPathLine(sunPath(midwinterDate, state.lat, state.lon), 'rgba(255,255,255,0.35)', 1.5, true);

  // Current day path — solid yellow
  const currentPoints = sunPath(state.simTime, state.lat, state.lon);
  drawPathLine(currentPoints, '#ffd23f', 2, false);

  // Label "21 Jun" near highest point of midsummer path
  function labelHighest(points, text) {
    if (points.length === 0) return;
    let hi = points[0];
    for (let i = 1; i < points.length; i++) {
      if (points[i].alt > hi.alt) hi = points[i];
    }
    const p = azAltToXY(hi.az, hi.alt, w, h);
    ctx.fillStyle = 'rgba(255,255,255,0.7)';
    ctx.font = '10px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(text, p.x, p.y - 8);
  }

  labelHighest(sunPath(midsummerDate, state.lat, state.lon), '21 Jun');
  labelHighest(sunPath(midwinterDate, state.lat, state.lon), '21 Dec');

  // Sunrise/sunset ticks on the horizon line
  const events = sunEvents(state.simTime, state.lat, state.lon);
  for (const ev of [events.sunrise, events.sunset]) {
    if (!ev) continue;
    const evAz = ev === events.sunrise ? events.sunriseAz : events.sunsetAz;
    const tickP = azAltToXY(evAz, 0, w, h);
    ctx.beginPath();
    ctx.moveTo(tickP.x, tickP.y - 6);
    ctx.lineTo(tickP.x, tickP.y + 2);
    ctx.strokeStyle = 'rgba(255,255,255,0.8)';
    ctx.lineWidth = 1;
    ctx.stroke();
    const timeStr = ev.toLocaleTimeString('en-GB', { timeZone: 'Europe/London', hour: '2-digit', minute: '2-digit' });
    ctx.fillStyle = 'rgba(255,255,255,0.8)';
    ctx.font = '10px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(timeStr, tickP.x, tickP.y - 10);
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
