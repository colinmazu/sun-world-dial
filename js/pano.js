// Panorama maths — pure functions only, no browser APIs.

/** Size of the horizon strip (3:1 at default ground depth). */
export const STRIP_W = 2400;
export const STRIP_H = 800;

/** How far below the horizon the strip goes, and its full height. */
export const STRIP_LOW = -60;
export const STRIP_FULL_H = 1300;

/** Size of the band kept in storage: 360° wide, from 70° down to STRIP_LOW (130°). */
export const BAND_W = 3024;
export const BAND_H = 1092;

/** Compute where the decoded image sits on the full sphere. */
export function panoMeta(exif, imgW, imgH) {
  if (exif.FullPanoWidthPixels && exif.CroppedAreaImageWidthPixels) {
    const k = imgW / Number(exif.CroppedAreaImageWidthPixels);
    return {
      fullW: Number(exif.FullPanoWidthPixels) * k,
      fullH: exif.FullPanoHeightPixels ? Number(exif.FullPanoHeightPixels) * k : (Number(exif.FullPanoWidthPixels) * k / 2),
      left: (Number(exif.CroppedAreaLeftPixels) || 0) * k,
      top: (Number(exif.CroppedAreaTopPixels) || 0) * k,
      w: imgW,
      h: imgH,
    };
  }
  return {
    fullW: imgW,
    fullH: imgW / 2,
    left: 0,
    top: (imgW / 2 - imgH) / 2,
    w: imgW,
    h: imgH,
  };
}

/** Fraction of the full width where azimuth `az` lies. */
export function uForAz(southU, az) {
  return ((southU + (az - 180) / 360) % 1 + 1) % 1;
}

/** The southU that puts column clickU at azimuth sunAz. */
export function southFromSun(clickU, sunAz) {
  return ((clickU - (sunAz - 180) / 360) % 1 + 1) % 1;
}

/** Convert a pixel x on the preview to a fraction of full width. */
export function uAtImageX(meta, x) {
  return (meta.left + x) / meta.fullW;
}

/** Convert a pixel y on the preview to an altitude in degrees. */
export function altAtImageY(meta, y) {
  return 90 - (meta.top + y) / meta.fullH * 180;
}

/** Clip a source→dest range to valid bounds; returns adjusted rect or null if empty. */
function clipRange(sStart, sSpan, dStart, dSpan, minS, maxS) {
  const cStart = Math.max(sStart, minS);
  const cEnd = Math.min(sStart + sSpan, maxS);
  if (cEnd <= cStart) return null;
  const ratioBefore = (cStart - sStart) / sSpan;
  const ratioAfter = (sStart + sSpan - cEnd) / sSpan;
  return {
    s: cStart,
    span: cEnd - cStart,
    d: dStart + ratioBefore * dSpan,
    dSpan: dSpan * (1 - ratioBefore - ratioAfter),
  };
}

/** Crop rectangles for the horizon strip from a panorama image. */
export function panoCropRects(meta, southU, outW, outH, bottom = -10) {
  // Rows on the full sphere: alt +70° → top row, alt `bottom` → bottom row
  const srcTop = meta.fullH * (90 - 70) / 180;           // altitude 70°
  const srcBot = meta.fullH * (90 - bottom) / 180;       // altitude `bottom`
  const imgTop = srcTop - meta.top;
  const imgBot = srcBot - meta.top;
  const rowSpan = imgBot - imgTop;

  // Columns on the full sphere: azimuth 30° → start, 330° → end (300° span)
  const x0 = uForAz(southU, 30) * meta.fullW;
  const span = meta.fullW * 300 / 360;

  // Build column pieces (may wrap around the seam)
  let colPieces;
  if (x0 + span > meta.fullW) {
    const firstSpan = meta.fullW - x0;
    const secondSpan = x0 + span - meta.fullW;
    colPieces = [
      { s: x0, span: firstSpan },
      { s: 0, span: secondSpan },
    ];
  } else {
    colPieces = [{ s: x0, span }];
  }

  // Clip rows to image bounds
  const rowClip = clipRange(imgTop, rowSpan, 0, outH, 0, meta.h);
  if (!rowClip) return [];

  const rects = [];
  let dxAccum = 0;
  for (const cp of colPieces) {
    // Clip columns to image bounds
    const colClip = clipRange(cp.s - meta.left, cp.span, dxAccum, outW * (cp.span / span), 0, meta.w);
    if (!colClip) continue;

    rects.push({
      sx: colClip.s,
      sy: rowClip.s,
      sw: colClip.span,
      sh: rowClip.span,
      dx: colClip.d,
      dy: rowClip.d,
      dw: colClip.dSpan,
      dh: rowClip.dSpan,
    });
    dxAccum += outW * (cp.span / span);
  }

  return rects;
}

/** Turn an EXIF time like "2023:12:25 13:12:42" into a Date. offset is like "+01:00", or empty for UK local time. */
export function exifLocalToDate(str, offset) {
  const n = str.split(/[: ]/).map(Number);
  const asUtc = Date.UTC(n[0], n[1] - 1, n[2], n[3], n[4], n[5]);
  if (offset) {
    const sign = offset[0] === '-' ? -1 : 1;
    const [oh, om] = offset.slice(1).split(':').map(Number);
    return new Date(asUtc - sign * (oh * 60 + om) * 60000);
  }
  // UK local: find how far London's clock is ahead of UTC at about that moment.
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Europe/London', hourCycle: 'h23',
    year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit',
  }).formatToParts(new Date(asUtc));
  const p = t => Number(parts.find(x => x.type === t).value);
  const london = Date.UTC(p('year'), p('month') - 1, p('day'), p('hour'), p('minute'), p('second'));
  return new Date(asUtc - (london - asUtc));
}

/** How many strip rows the view needs for a given ground depth. */
export function stripSourceHeight(groundDeg) {
  return STRIP_FULL_H * (70 + groundDeg) / 130;
}

/** Night darkness factor from sun altitude. */
export function nightAlpha(alt) {
  return Math.min(Math.max(-alt / 12, 0), 1) * 0.8;
}

/** Crop rectangle for the stored band (360°, alt +70° to STRIP_LOW). */
export function panoBandRect(meta) {
  // Rows: altitude 70° → STRIP_LOW
  const srcTop = meta.fullH * 20 / 180 - meta.top;
  const srcBot = meta.fullH * (90 - STRIP_LOW) / 180 - meta.top;
  const rowSpan = srcBot - srcTop;

  // Clip rows to image bounds using the same helper as panoCropRects
  const rowClip = clipRange(srcTop, rowSpan, 0, BAND_H, 0, meta.h);
  if (!rowClip) return null;

  // Columns: the whole image
  const k = BAND_W / meta.fullW;
  return {
    sx: 0,
    sy: rowClip.s,
    sw: meta.w,
    sh: rowClip.span,
    dx: meta.left * k,
    dy: rowClip.d,
    dw: meta.w * k,
    dh: rowClip.dSpan,
  };
}

/** GPano tags describing the stored band so panoMeta reads it back correctly. */
export function bandExif() {
  return {
    FullPanoWidthPixels: BAND_W,
    FullPanoHeightPixels: BAND_W / 2,
    CroppedAreaImageWidthPixels: BAND_W,
    CroppedAreaImageHeightPixels: BAND_H,
    CroppedAreaLeftPixels: 0,
    CroppedAreaTopPixels: BAND_W / 2 * 20 / 180,
  };
}
