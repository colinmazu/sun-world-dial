// Panorama UI — loading, preview, calibration.

import { formatLatLon } from './geo.js';
import { sunAltAz } from './geo.js';
import { nearestPostcode } from './postcode.js';
import { STRIP_W, STRIP_FULL_H, STRIP_LOW, BAND_W, BAND_H, panoMeta, uForAz, southFromSun, uAtImageX, altAtImageY, panoCropRects, exifLocalToDate, panoBandRect, bandExif } from './pano.js';

/** Decode a big photo straight to 4096 px wide, so the full-size image never has to fit on a canvas. */
async function decodeSmall(file) {
  try {
    return await createImageBitmap(file, { resizeWidth: 4096, resizeQuality: 'high' });
  } catch (err) {
    const full = await createImageBitmap(file);
    const c = document.createElement('canvas');
    c.width = 4096;
    c.height = Math.round(4096 * full.height / full.width);
    c.getContext('2d').drawImage(full, 0, 0, c.width, c.height);
    full.close();
    return c;
  }
}

/** Initialise the panorama panel. */
export function initPano(state, { onLocation, onTime }) {
  let img = null;
  let meta = null;
  let southU = 0.5;
  let exifData = null;
  let photoTime = null;
  let clickMode = null;
  let infoTimer = null;

  // Strip canvas for the horizon view
  const strip = document.createElement('canvas');
  strip.width = STRIP_W;
  strip.height = STRIP_FULL_H;

  // DOM elements
  const panoInput = document.getElementById('pano-input');
  const panoStatus = document.getElementById('pano-status');
  const panoPreview = document.getElementById('pano-preview');
  const panoSouthBtn = document.getElementById('pano-south-btn');
  const panoSunBtn = document.getElementById('pano-sun-btn');
  const panoLeft = document.getElementById('pano-left');
  const panoRight = document.getElementById('pano-right');
  const panoLocationBtn = document.getElementById('pano-location-btn');
  const panoTimeBtn = document.getElementById('pano-time-btn');
  const panoSaveBtn = document.getElementById('pano-save-btn');
  const panoClearBtn = document.getElementById('pano-clear-btn');

  /** Save the band image to localStorage (once, when a new photo is loaded). */
  function saveBandImage() {
    if (!img || !meta) return;
    const c = document.createElement('canvas');
    c.width = BAND_W;
    c.height = BAND_H;
    const ctx = c.getContext('2d');
    const rect = panoBandRect(meta);
    if (rect) {
      ctx.drawImage(img, rect.sx, rect.sy, rect.sw, rect.sh, rect.dx, rect.dy, rect.dw, rect.dh);
    }
    try {
      localStorage['sunworld.horizonPhoto'] = c.toDataURL('image/jpeg', 0.85);
    } catch {
      panoStatus.textContent = "Couldn't remember the photo (the browser's storage is full or blocked).";
    }
  }

  /** Save calibration info to localStorage (debounced on southU changes). */
  function saveInfo() {
    if (!img) return;
    const info = {
      name: panoInput.files[0] ? panoInput.files[0].name : '',
      southU,
      photoTime: photoTime ? photoTime.toISOString() : null,
      exif: {
        latitude: exifData?.latitude ?? exifData?.lat ?? null,
        longitude: exifData?.longitude ?? exifData?.lon ?? null,
        DateTimeOriginal: exifData?.DateTimeOriginal ?? null,
        OffsetTimeOriginal: exifData?.OffsetTimeOriginal ?? null,
      },
    };
    try {
      localStorage['sunworld.horizonPhotoInfo'] = JSON.stringify(info);
    } catch {
      panoStatus.textContent = "Couldn't remember the photo (the browser's storage is full or blocked).";
    }
  }

  /** Schedule a debounced save of calibration info. */
  function scheduleSaveInfo() {
    clearTimeout(infoTimer);
    infoTimer = setTimeout(saveInfo, 500);
  }

  /** Rebuild the strip from the current image and southU. */
  function rebuildStrip() {
    if (!img || !meta) return;
    const ctx = strip.getContext('2d');
    ctx.clearRect(0, 0, STRIP_W, STRIP_FULL_H);
    for (const r of panoCropRects(meta, southU, STRIP_W, STRIP_FULL_H, STRIP_LOW)) {
      ctx.drawImage(img, r.sx, r.sy, r.sw, r.sh, r.dx, r.dy, r.dw, r.dh);
    }
    state.horizonPhoto = strip;
  }

  /** Redraw the preview canvas with directional overlays. */
  function drawPreview() {
    if (!img || !meta) return;
    const dpr = window.devicePixelRatio || 1;
    panoPreview.width = panoPreview.clientWidth * dpr;
    panoPreview.height = Math.round(panoPreview.clientWidth * img.height / img.width * dpr);
    const ctx = panoPreview.getContext('2d');
    ctx.scale(dpr, dpr);

    // Draw the full image scaled to preview width
    const pw = panoPreview.clientWidth;
    const ph = pw * img.height / img.width;
    ctx.drawImage(img, 0, 0, pw, ph);

    // Shade the unused region (azimuth 330° → 30°, through north)
    const shadeStartU = uForAz(southU, 330);
    const shadeEndU = uForAz(southU, 30);
    ctx.fillStyle = 'rgba(0,0,0,0.5)';

    // The shaded region may cross the image edge
    if (shadeStartU < shadeEndU) {
      const sx = shadeStartU * meta.fullW - meta.left;
      const sw = (shadeEndU - shadeStartU) * meta.fullW;
      ctx.fillRect(sx / meta.w * pw, 0, sw / meta.w * pw, ph);
    } else {
      const sx1 = shadeStartU * meta.fullW - meta.left;
      const sw1 = (1 - shadeStartU) * meta.fullW;
      const sw2 = shadeEndU * meta.fullW;
      ctx.fillRect(sx1 / meta.w * pw, 0, sw1 / meta.w * pw, ph);
      ctx.fillRect(0, 0, sw2 / meta.w * pw, ph);
    }

    // Directional lines and labels
    const dirs = [
      { az: 180, label: 'S', color: '#ff3333', width: 2 },
      { az: 90, label: 'E', color: '#ffffff', width: 1 },
      { az: 270, label: 'W', color: '#ffffff', width: 1 },
      { az: 0, label: 'N', color: '#ffffff', width: 1 },
    ];

    for (const dir of dirs) {
      const u = uForAz(southU, dir.az);
      const px = (u * meta.fullW - meta.left) / meta.w * pw;
      ctx.strokeStyle = dir.color;
      ctx.lineWidth = dir.width;
      ctx.beginPath();
      ctx.moveTo(px, 0);
      ctx.lineTo(px, ph);
      ctx.stroke();

      // Label near the top
      ctx.fillStyle = dir.color;
      ctx.font = 'bold 14px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(dir.label, px, 20);
    }
  }

  /** Enable/disable buttons based on current state. */
  function updateButtons() {
    panoSouthBtn.disabled = !img;
    panoLeft.disabled = !img;
    panoRight.disabled = !img;
    const hasGps = exifData && (exifData.latitude != null || exifData.lat != null);
    const lat = exifData ? (exifData.latitude ?? exifData.lat) : null;
    const lon = exifData ? (exifData.longitude ?? exifData.lon) : null;
    panoLocationBtn.disabled = !(hasGps && lat != null && lon != null);
    panoSunBtn.disabled = !(photoTime && hasGps && lat != null && lon != null);
    panoTimeBtn.disabled = !photoTime;
  }

  /** Handle a click on the preview. */
  function handlePreviewClick(clientX, clientY) {
    if (!clickMode || !img || !meta) return;
    const rect = panoPreview.getBoundingClientRect();
    const x = (clientX - rect.left) * meta.w / rect.width;
    const y = (clientY - rect.top) * meta.h / rect.height;

    if (clickMode === 'south') {
      southU = uAtImageX(meta, x);
      panoStatus.textContent = 'South set.';
    } else if (clickMode === 'sun') {
      const sun = sunAltAz(photoTime, exifData.latitude ?? exifData.lat, exifData.longitude ?? exifData.lon);
      southU = southFromSun(uAtImageX(meta, x), sun.az);
      const photoAlt = altAtImageY(meta, y);
      const expectedAlt = sun.alt;
      let msg = `Sun set from the photo's time and place. In the photo it is ${photoAlt.toFixed(1)}° high; it should be ${expectedAlt.toFixed(1)}°.`;
      if (Math.abs(photoAlt - expectedAlt) > 2) {
        msg += ' The photo may not be level.';
      }
      panoStatus.textContent = msg;
    }

    clickMode = null;
    drawPreview();
    rebuildStrip();
    scheduleSaveInfo();
  }

  // --- Event listeners ---

  // File input change: load and decode the photo
  panoInput.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    panoStatus.textContent = 'Reading the photo…';

    try {
      exifData = await globalThis.exifr.parse(file, { xmp: true, reviveValues: false }).catch(() => null) || {};
    } catch {
      exifData = {};
    }

    // Extract GPS and time from EXIF
    const lat = exifData.latitude ?? exifData.lat;
    const lon = exifData.longitude ?? exifData.lon;

    if (exifData.DateTimeOriginal) {
      photoTime = exifLocalToDate(exifData.DateTimeOriginal, exifData.OffsetTimeOriginal);
    } else {
      photoTime = null;
    }

    // Decode the image at reduced size
    try {
      img = await decodeSmall(file);
    } catch {
      panoStatus.textContent = "Couldn't open that photo (it may be too big for this device).";
      return;
    }

    // Validate 360°: check ProjectionType, GPano tags, or aspect ratio
    const hasGpano = exifData.FullPanoWidthPixels != null;
    const isEquirectangular = !exifData.ProjectionType || exifData.ProjectionType === 'equirectangular';
    const aspectOk = Math.abs(img.width / img.height - 2) < 0.04;

    if (!isEquirectangular || (!hasGpano && !aspectOk)) {
      panoStatus.textContent = "This doesn't look like a 360° photo.";
      img = null;
      return;
    }

    meta = panoMeta(exifData, img.width, img.height);
    southU = 0.5;

    // Save the band to localStorage (once)
    saveBandImage();

    // Enable buttons
    updateButtons();

    // Show preview and build strip
    panoPreview.hidden = false;
    drawPreview();
    rebuildStrip();

    // Status message with date/time/location info
    let statusMsg = '';
    if (photoTime) {
      const fmt = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
      statusMsg += fmt.format(photoTime);
    }
    if (lat != null && lon != null) {
      statusMsg += ` at ${formatLatLon(lat, lon)}`;
    }
    if (statusMsg) statusMsg += '. ';
    statusMsg += 'Use "Set south" or "Click the sun".';
    panoStatus.textContent = statusMsg;

    // Save calibration info
    scheduleSaveInfo();
  });

  // Preview click handler
  panoPreview.addEventListener('click', (e) => {
    handlePreviewClick(e.clientX, e.clientY);
  });

  // Set south button
  panoSouthBtn.addEventListener('click', () => {
    clickMode = 'south';
    panoStatus.textContent = 'Click the south point on the photo.';
  });

  // Click the sun button
  panoSunBtn.addEventListener('click', () => {
    clickMode = 'sun';
    panoStatus.textContent = 'Click the middle of the sun on the photo.';
  });

  // Left / Right rotation buttons
  panoLeft.addEventListener('click', () => {
    southU = ((southU - 1 / 360) % 1 + 1) % 1;
    drawPreview();
    rebuildStrip();
    scheduleSaveInfo();
  });

  panoRight.addEventListener('click', () => {
    southU = ((southU + 1 / 360) % 1 + 1) % 1;
    drawPreview();
    rebuildStrip();
    scheduleSaveInfo();
  });

  // Use photo's location button
  panoLocationBtn.addEventListener('click', async () => {
    const lat = exifData.latitude ?? exifData.lat;
    const lon = exifData.longitude ?? exifData.lon;
    if (lat == null || lon == null) return;
    const pc = await nearestPostcode(lat, lon);
    onLocation(lat, lon, pc || 'Photo location');
  });

  // Go to photo's time button
  panoTimeBtn.addEventListener('click', () => {
    if (photoTime) {
      onTime(photoTime);
    }
  });

  // Save button: download the strip as a file
  panoSaveBtn.addEventListener('click', () => {
    if (!img) return;
    strip.toBlob((b) => {
      const url = URL.createObjectURL(b);
      const a = document.createElement('a');
      let dateStr = new Date().toISOString().slice(0, 10);
      if (photoTime) {
        const parts = new Intl.DateTimeFormat('en-GB', {
          timeZone: 'Europe/London', year: 'numeric', month: '2-digit', day: '2-digit',
        }).formatToParts(photoTime);
        const p = t => parts.find(x => x.type === t).value.padStart(2, '0');
        dateStr = `${p('year')}-${p('month')}-${p('day')}`;
      }
      a.href = url;
      a.download = `horizon-${dateStr}.jpg`;
      a.click();
      URL.revokeObjectURL(url);
      panoStatus.textContent = `Saved horizon-${dateStr}.jpg.`;
    }, 'image/jpeg', 0.9);
  });

  // Clear button: remove photo and all stored data
  panoClearBtn.addEventListener('click', () => {
    try { localStorage.removeItem('sunworld.horizonPhoto'); } catch {}
    try { localStorage.removeItem('sunworld.horizonPhotoInfo'); } catch {}
    try { localStorage.removeItem('sunWorldDial_pano'); } catch {}
    img = null;
    meta = null;
    exifData = null;
    photoTime = null;
    southU = 0.5;
    clickMode = null;
    state.horizonPhoto = null;
    panoInput.value = '';
    panoPreview.hidden = true;
    updateButtons();
    panoStatus.textContent = 'Photo removed.';
  });

  // Auto-load saved band on init
  (async () => {
    // Check for old data first
    try {
      if (localStorage.getItem('sunWorldDial_pano')) {
        localStorage.removeItem('sunWorldDial_pano');
        panoStatus.textContent = 'Please load your photo again (it was stored in an older format).';
        return;
      }
    } catch {}

    // Try loading the band + info
    let bandData, infoRaw;
    try {
      bandData = localStorage['sunworld.horizonPhoto'];
      infoRaw = localStorage['sunworld.horizonPhotoInfo'];
    } catch {
      return;
    }
    if (!bandData || !infoRaw) return;

    let info;
    try {
      info = JSON.parse(infoRaw);
    } catch {
      return;
    }

    // Load the band image as-is (no resize)
    const image = new Image();
    image.onload = async () => {
      img = image;
      exifData = { ...info.exif, ...bandExif() };
      meta = panoMeta(exifData, BAND_W, BAND_H);
      southU = info.southU;
      photoTime = info.photoTime ? new Date(info.photoTime) : null;

      updateButtons();
      panoPreview.hidden = false;
      drawPreview();
      rebuildStrip();

      panoStatus.textContent = `Using the saved photo: ${info.name || 'unknown'}.`;
    };
    image.onerror = () => {
      try { localStorage.removeItem('sunworld.horizonPhoto'); } catch {}
      try { localStorage.removeItem('sunworld.horizonPhotoInfo'); } catch {}
      panoStatus.textContent = "Saved photo couldn't be read.";
    };
    image.src = bandData;
  })();
}
