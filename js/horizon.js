// 2D horizon canvas — no Three.js.

import { sunAltAz, sunPath, sunEvents } from './geo.js';
import { uForAz, nightAlpha, stripSourceHeight } from './pano.js';

/** Convert azimuth/altitude to pixel coordinates on the horizon canvas. */
export function azAltToXY(az, alt, width, height, bottom = -10) {
  return {
    x: (az - 30) / 300 * width,
    y: (70 - alt) / (70 - bottom) * height,
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
  const bottom = -state.groundDeg;

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

  // Horizon line is at alt = 0
  const horizonY = azAltToXY(180, 0, w, h, bottom).y;

  // Sky
  const skyGrad = ctx.createLinearGradient(0, 0, 0, horizonY);
  skyGrad.addColorStop(0, topColor);
  skyGrad.addColorStop(1, bottomColor);
  ctx.fillStyle = skyGrad;
  ctx.fillRect(0, 0, w, horizonY);

  // Ground — replaced by photo if available
  if (state.horizonPhoto) {
    ctx.drawImage(state.horizonPhoto, 0, 0, w, stripSourceHeight(state.groundDeg), 0, 0, w, h);

    // Night overlay: one fill over the whole canvas
    ctx.fillStyle = `rgba(6,10,31,${nightAlpha(alt)})`;
    ctx.fillRect(0, 0, w, h);
  } else {
    ctx.fillStyle = '#2f4a2f';
    ctx.fillRect(0, horizonY, w, h - horizonY);
  }

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

  if (state.horizonPhoto) {
    // Labels with dark outline for readability on photos
    ctx.font = '12px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.lineWidth = 3;
    ctx.strokeStyle = 'rgba(0,0,0,0.7)';
    for (const l of labels) {
      const px = azAltToXY(l.az, 0, w, h, bottom).x;
      ctx.strokeText(l.text, px, horizonY + 14);
      ctx.fillStyle = '#fff';
      ctx.fillText(l.text, px, horizonY + 14);
    }
  } else {
    ctx.fillStyle = alt < 0 ? '#cfe8ff' : '#1a1a1a';
    ctx.font = '12px system-ui, sans-serif';
    ctx.textAlign = 'center';
    for (const l of labels) {
      const px = azAltToXY(l.az, 0, w, h, bottom).x;
      ctx.fillText(l.text, px, horizonY + 14);
    }
  }

  // --- Sun paths ---
  const year = state.simTime.getUTCFullYear();

  // Choose guide colours based on whether it is day or night
  const day = alt >= 0;
  const guide = day ? 'rgba(15,30,70,0.7)' : 'rgba(255,255,255,0.5)';
  const guideText = day ? 'rgba(15,30,70,0.9)' : 'rgba(255,255,255,0.75)';

  /** Draw a path as a line on the canvas. */
  function drawPathLine(points, color, lineWidth, dashed) {
    if (points.length < 2) return;
    ctx.beginPath();
    ctx.strokeStyle = color;
    ctx.lineWidth = lineWidth;
    if (dashed) ctx.setLineDash([6, 4]);
    else ctx.setLineDash([]);
    const start = azAltToXY(points[0].az, points[0].alt, w, h, bottom);
    ctx.moveTo(start.x, start.y);
    for (let i = 1; i < points.length; i++) {
      const p = azAltToXY(points[i].az, points[i].alt, w, h, bottom);
      ctx.lineTo(p.x, p.y);
    }
    ctx.stroke();
    ctx.setLineDash([]);
  }

  // Midsummer path (21 June) — dashed guide colour
  const midsummerDate = new Date(Date.UTC(year, 5, 21, 12, 0, 0));
  drawPathLine(sunPath(midsummerDate, state.lat, state.lon), guide, 1.5, true);

  // Midwinter path (21 December) — dashed guide colour
  const midwinterDate = new Date(Date.UTC(year, 11, 21, 12, 0, 0));
  drawPathLine(sunPath(midwinterDate, state.lat, state.lon), guide, 1.5, true);

  // Current day path — solid yellow (with dark edge during day for contrast)
  const todayPath = sunPath(state.simTime, state.lat, state.lon);
  if (day) {
    drawPathLine(todayPath, 'rgba(15,30,70,0.6)', 4, false);
  }
  drawPathLine(todayPath, '#ffd23f', 2, false);

  // Labels for solstice paths near their highest point
  ctx.font = '11px system-ui, sans-serif';
  function labelPath(points, text) {
    if (points.length === 0) return;
    const top = points.reduce((a, b) => b.alt > a.alt ? b : a);
    const p = azAltToXY(top.az, top.alt, w, h, bottom);
    ctx.fillStyle = guideText;
    ctx.fillText(text, p.x, p.y - 8);
  }
  labelPath(sunPath(midsummerDate, state.lat, state.lon), '21 Jun');
  labelPath(sunPath(midwinterDate, state.lat, state.lon), '21 Dec');

  // Sunrise/sunset ticks on the horizon line
  const ev = sunEvents(state.simTime, state.lat, state.lon);
  const ukFmtShort = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Europe/London', hour: '2-digit', minute: '2-digit',
  });

  function drawTick(azimuth, time) {
    const px = azAltToXY(azimuth, 0, w, h, bottom).x;
    ctx.strokeStyle = '#ffd23f';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(px, horizonY);
    ctx.lineTo(px, horizonY - 8);
    ctx.stroke();
    ctx.fillStyle = '#ffd23f';
    ctx.font = '10px system-ui, sans-serif';
    ctx.fillText(ukFmtShort.format(time), px, horizonY - 10);
  }

  drawTick(ev.sunriseAz, ev.sunrise);
  drawTick(ev.sunsetAz, ev.sunset);

  // Sun
  if (alt > bottom) {
    const sunPos = azAltToXY(az, alt, w, h, bottom);
    ctx.beginPath();
    ctx.arc(sunPos.x, sunPos.y, 12, 0, Math.PI * 2);
    ctx.fillStyle = '#ffd23f';
    ctx.fill();
  }
}
