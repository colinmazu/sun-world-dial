// 2D horizon panorama — no Three.js.

import { sunAltAz, sunPath, sunEvents } from './geo.js';

/**
 * Convert azimuth and altitude to pixel coordinates on the horizon canvas.
 * Azimuth 30° is left edge, 330° is right edge (300° across).
 * Altitude +70° is top, −10° is bottom.
 */
export function azAltToXY(az, alt, width, height) {
  const x = (az - 30) / 300 * width;
  const y = (70 - alt) / 80 * height;
  return { x, y };
}

/**
 * Draw the horizon view on the given canvas using the current state.
 */
export function drawHorizon(canvas, state) {
  const dpr = window.devicePixelRatio || 1;
  const w = canvas.clientWidth;
  const h = canvas.clientHeight;
  canvas.width = w * dpr;
  canvas.height = h * dpr;
  const ctx = canvas.getContext('2d');
  ctx.scale(dpr, dpr);

  if (state.lat === null) {
    // No postcode yet
    ctx.fillStyle = '#333';
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = '#aaa';
    ctx.font = '1rem system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('Enter a postcode first', w / 2, h / 2 + 4);
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

  // Sky gradient (above horizon line, which is alt=0)
  const horizonY = azAltToXY(0, 0, w, h).y;
  const grad = ctx.createLinearGradient(0, 0, 0, h);
  grad.addColorStop(0, topColor);
  grad.addColorStop(Math.max(0, horizonY / h), bottomColor);
  grad.addColorStop(Math.min(1, horizonY / h + 0.01), '#2f4a2f');
  grad.addColorStop(1, '#2f4a2f');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, w, h);

  // Ground (below horizon)
  ctx.fillStyle = '#2f4a2f';
  ctx.fillRect(0, horizonY, w, h - horizonY);

  // Azimuth labels just below the horizon line
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
  ctx.font = '0.8rem system-ui, sans-serif';
  ctx.textAlign = 'center';
  for (const l of labels) {
    const p = azAltToXY(l.az, -1, w, h);
    ctx.fillText(l.text, p.x, p.y + 4);
  }

  // Sun path helper: draw a polyline from sunPath points
  function drawPath(points, color, width, dashed) {
    if (points.length < 2) return;
    ctx.beginPath();
    ctx.strokeStyle = color;
    ctx.lineWidth = width || 1;
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

  // Get the year from simTime in UK time
  const ukYear = new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/London", year: "numeric" }).format(state.simTime);

  // Midsummer and midwinter paths (dashed white, 35% opacity)
  const midSummerPath = sunPath(new Date(`${ukYear}-06-21T12:00:00Z`), state.lat, state.lon);
  const midWinterPath = sunPath(new Date(`${ukYear}-12-21T12:00:00Z`), state.lat, state.lon);

  drawPath(midSummerPath, 'rgba(255,255,255,0.35)', 1, true);
  drawPath(midWinterPath, 'rgba(255,255,255,0.35)', 1, true);

  // Labels near highest point of each path
  ctx.fillStyle = 'rgba(255,255,255,0.6)';
  ctx.font = '0.7rem system-ui, sans-serif';
  ctx.textAlign = 'center';
  function labelPath(points, text) {
    if (points.length === 0) return;
    let highestIdx = 0;
    for (let i = 1; i < points.length; i++) {
      if (points[i].alt > points[highestIdx].alt) highestIdx = i;
    }
    const p = azAltToXY(points[highestIdx].az, points[highestIdx].alt, w, h);
    ctx.fillText(text, p.x, p.y - 8);
  }
  labelPath(midSummerPath, '21 Jun');
  labelPath(midWinterPath, '21 Dec');

  // Current day's path (solid yellow)
  const todayPath = sunPath(state.simTime, state.lat, state.lon);
  drawPath(todayPath, '#ffd23f', 2, false);

  // Sunrise/sunset ticks on horizon line for current day
  try {
    const ev = sunEvents(state.simTime, state.lat, state.lon);
    const ukMinFmt = new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/London", hour: "2-digit", minute: "2-digit" });

    function drawTick(az, time) {
      const p = azAltToXY(az, 0, w, h);
      ctx.strokeStyle = 'rgba(255,255,255,0.7)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(p.x, horizonY - 6);
      ctx.lineTo(p.x, horizonY + 6);
      ctx.stroke();
      ctx.fillStyle = 'rgba(255,255,255,0.8)';
      ctx.font = '0.65rem system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(ukMinFmt.format(time), p.x, horizonY - 10);
    }

    drawTick(ev.sunriseAz, ev.sunrise);
    drawTick(ev.sunsetAz, ev.sunset);
  } catch { /* no sunrise/sunset this day */ }

  // Sun circle (only if alt > −10)
  if (alt > -10) {
    const sunPos = azAltToXY(az, alt, w, h);
    ctx.beginPath();
    ctx.arc(sunPos.x, sunPos.y, 12, 0, Math.PI * 2);
    ctx.fillStyle = '#ffd23f';
    ctx.fill();
  }
}
