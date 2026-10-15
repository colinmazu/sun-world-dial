# Sun World Dial: Build Spec

A single web page. You type a UK postcode and see:

1. where you are on a 3D globe (north up, longitude 0° facing you), and
2. a "sun" (not to scale) going round the globe for a chosen date, lighting the day side, and
3. a horizon view from your location, looking from north-east through south to north-west, with the sun rising and setting in the right place.

## Files

| File | What goes in it |
| --- | --- |
| `index.html` | Page structure, the import map, script tags |
| `style.css` | All styling |
| `js/geo.js` | **Pure maths only**: no DOM, no Three.js, no `fetch`. Node must be able to import it. |
| `js/postcode.js` | `lookupPostcode()`, the only code that talks to the network |
| `js/globe.js` | The Three.js globe |
| `js/horizon.js` | The 2D horizon canvas |
| `js/main.js` | Shared state, the form, the controls, the animation loop |
| `js/pano.js` | (Step 14) **Pure maths** for 360° photos, like `geo.js`: no DOM, Node must be able to import it |
| `js/pano-ui.js` | (Step 15) Loading a 360° photo, the preview and the calibration |

Already provided. Do not edit them:

- `vendor/suncalc.js`: the SunCalc library. Loaded as a normal script, it sets `window.SunCalc`.
- `assets/earth.jpg`: a 2048×1024 Earth map. Longitude −180° is at the left edge, 0° in the middle and north at the top.
- `vendor/exifr-lite.umd.js`: exifr 7.1.3, which reads photo metadata (time, GPS, 360° layout). Loaded as a normal script, it sets `window.exifr`; in Node, `require('./vendor/exifr-lite.umd.js')`.

Libraries: **Three.js 0.170.0** from the CDN through the import map in Step 2, SunCalc, and exifr (from Step 15). Nothing else, no npm and no build tools.

The page is served by the user with `python3 -m http.server 8000` and viewed at http://localhost:8000. It does not work from `file://`.

## Instructions for the assistant

- Do **only the step the user names**. Never start the next step on your own, unless the user says "Do all steps"
  (see below).
- Before writing code, briefly say what you will do.
- Use the exact file names, element ids and function names given below. Later steps depend on them.
- Keep everything from earlier steps working.
- Create only the files listed above.
- Never start a web server or any other command that keeps running.
- When finished, run the step's `node` checks yourself, from the project folder. Then go through the "Done when" checklist, report each item as passed, failed, or "needs the user to check in the browser", and stop.

### "Do all steps"

When the user says **Do all steps**, build Steps 1–7 in order without waiting between them. For each step:

1. Say in one line which step you are starting.
2. Build it, following that step's section exactly.
3. Run that step's `node` checks. If one fails, fix the code and run it again. If it still fails after 3 tries,
   stop and tell the user.
4. Report the "Done when" list in a few lines. Browser items are "needs the user"; don't stop for them.
5. Commit with two separate commands: `git add -A`, then `git commit -m "Step N: <step title>"`.
6. Go on to the next step.

After Step 7, re-run **every** `node` check from Steps 1–6, then finish with a table: step, commit hash, node checks
passed, and browser items for the user to check.

---

## Step 1: Page and postcode lookup

**`index.html`**

- HTML5 with `lang="en"`, `<meta charset="UTF-8">`, a viewport meta tag, and the title `Sun World Dial`.
- In `<head>`: link `style.css`, then `<script src="vendor/suncalc.js"></script>`.
- At the end of `<body>`: `<script type="module" src="js/main.js"></script>`.
- `<body>` contains `<header>` with `<h1>Sun World Dial</h1>`, then `<main>` holding these, in order:
  - `<form id="postcode-form">` with a text input `id="postcode-input"` (a `<label for>` "Your UK postcode", `autocomplete="postal-code"`, `required`) and a submit button "Find me".
  - `<p id="location-result" aria-live="polite"></p>`
  - `<section id="views"></section>` (empty for now; later steps fill it).

**`js/geo.js`**: ES module. Export:

- `normalisePostcode(text)`: trim, upper-case, and remove all spaces. If the result matches `/^[A-Z]{1,2}[0-9][A-Z0-9]?[0-9][A-Z]{2}$/`, return it with one space before the last 3 characters (`"SW1A 1AA"`). Otherwise return `null`.
- `formatLatLon(lat, lon)`: 4 decimal places, with N/S and E/W instead of a sign, e.g. `"51.5010° N, 0.1416° W"`.

**`js/postcode.js`**: ES module. Export:

- `async lookupPostcode(postcode)`: `fetch("https://api.postcodes.io/postcodes/" + encodeURIComponent(postcode))`.
  - On HTTP 404, throw `new Error("Postcode not found")`.
  - On any other non-OK status, throw `new Error("Lookup failed")`.
  - Otherwise return `{ postcode: json.result.postcode, lat: json.result.latitude, lon: json.result.longitude }`.

**`js/main.js`**: ES module.

- Create one shared object, `const state = { postcode: null, lat: null, lon: null, simTime: new Date(), playing: false, dayMs: 24000 };`
- On form submit, call `preventDefault()`, then:
  - Run `normalisePostcode`. If it returns `null`, show "That doesn't look like a UK postcode." in `#location-result`.
  - Otherwise show "Looking up…", disable the button, and call `lookupPostcode`.
  - On success, store `postcode`, `lat` and `lon` in `state` and show e.g. `SW1A 1AA: 51.5010° N, 0.1416° W`.
  - On error, show the error message.
  - Re-enable the button either way.

**`style.css`**: a clean, centred layout, max width about 900px, with readable system fonts.

Use CSS custom properties for colours so the page respects `prefers-color-scheme`:

```css
:root {
  --bg: #ffffff;
  --fg: #1a1a1a;
  --surface: #f5f5f5;
  --border: #ccc;
}

@media (prefers-color-scheme: dark) {
  :root {
    --bg: #1a1a1a;
    --fg: #e8e8e8;
    --surface: #2a2a2a;
    --border: #555;
  }
}

body { background: var(--bg); color: var(--fg); }
```

Inputs, buttons, and selects use `var(--surface)` for their background and `var(--border)` for borders. The globe scene already has a black background (dark-friendly). Horizon canvas colours are fixed and do not change with the theme.

**Done when**

- [ ] `node -e "import('./js/geo.js').then(m => console.log(m.normalisePostcode(' sw1a1aa '), m.normalisePostcode('ab10 1ab'), m.normalisePostcode('hello')))"` prints `SW1A 1AA AB10 1AB null`
- [ ] `node -e "import('./js/geo.js').then(m => console.log(m.formatLatLon(51.50101, -0.141563)))"` prints `51.5010° N, 0.1416° W`
- [ ] `node -e "import('./js/postcode.js').then(m => m.lookupPostcode('SW1A 1AA')).then(console.log)"` prints lat ≈ 51.501 and lon ≈ −0.1416
- [ ] `node -e "import('./js/postcode.js').then(m => m.lookupPostcode('ZZ9 9ZZ')).catch(e => console.log(e.message))"` prints `Postcode not found`
- [ ] (browser) `sw1a1aa` shows `SW1A 1AA: 51.5010° N, 0.1416° W`, and `hello` shows the "doesn't look like" message.
- [ ] (browser) Page respects `prefers-color-scheme`: dark mode OS setting produces a dark background and light text.

---

## Step 2: The globe

**`index.html`**

- In `<head>`, before any module script, add exactly:

```html
<script type="importmap">
{ "imports": {
    "three": "https://cdn.jsdelivr.net/npm/three@0.170.0/build/three.module.js",
    "three/addons/": "https://cdn.jsdelivr.net/npm/three@0.170.0/examples/jsm/"
} }
</script>
```

- Inside `#views`: `<div id="globe"></div>`.

**`js/geo.js`**: add and export:

- `latLonToVector3(lat, lon, radius)` returns `{ x, y, z }`, using degrees in and these exact formulas:
  - `x = radius * cos(lat) * sin(lon)`
  - `y = radius * sin(lat)`
  - `z = radius * cos(lat) * cos(lon)`

  So longitude 0° on the equator points at the viewer (+z), north is up (+y), and 90° E is to the right (+x).

**`js/globe.js`**: ES module. Import `* as THREE from "three"`, `{ OrbitControls } from "three/addons/controls/OrbitControls.js"` and `latLonToVector3` from `./geo.js`. Export `createGlobe(container)`, which does the following:

- A scene with a black background and a `PerspectiveCamera` (fov 45) at `(0, 0, 3.2)` looking at the origin.
- A `WebGLRenderer` (antialias) sized to the container, which resizes when the window does.
- An Earth mesh: `SphereGeometry(1, 64, 32)` with `MeshStandardMaterial({ map })`. Load the map from `assets/earth.jpg` and set `map.colorSpace = THREE.SRGBColorSpace`.
- `earth.rotation.y = -Math.PI / 2`. Three.js wraps the texture so that longitude 0° faces +x; this turns it to face +z, matching `latLonToVector3`.
- `AmbientLight(0xffffff, 2)` for now.
- `OrbitControls`: no pan, `enableDamping`, `minDistance` 1.5, `maxDistance` 6, and no auto-rotate.
- Draw with `renderer.setAnimationLoop`.

Keep `scene`, `camera`, `renderer` and `earth` as module-level variables, so later steps can add to them.

**`js/main.js`**: call `createGlobe(document.getElementById("globe"))` on load.

**`style.css`**: `#globe` is full width with `aspect-ratio: 1 / 1` and `max-height: 80vh`.

**Done when**

- [ ] `node -e "import('./js/geo.js').then(m => ['0,0','90,0','0,90','51.5,0'].forEach(s => { const [a,b] = s.split(',').map(Number); const v = m.latLonToVector3(a, b, 1); console.log(s, v.x.toFixed(3), v.y.toFixed(3), v.z.toFixed(3)); }))"` prints:
  `0,0 0.000 0.000 1.000` · `90,0 0.000 1.000 0.000` · `0,90 1.000 0.000 0.000` · `51.5,0 0.000 0.783 0.623`
- [ ] (browser) A textured globe with north up. The Gulf of Guinea (west Africa's south coast) faces you and the UK is top-centre.
- [ ] (browser) Dragging rotates it, the scroll wheel zooms, and it does not spin by itself.

---

## Step 3: "You are here" marker

**`js/globe.js`**: add and export `setMarker(lat, lon)`:

- Build a `THREE.Group` containing:
  - a red sphere (`SphereGeometry(0.02)`, `MeshBasicMaterial` colour `0xff3333`) at `latLonToVector3(lat, lon, 1.01)`, and
  - a red line (`THREE.Line`) from `latLonToVector3(lat, lon, 1.0)` to `latLonToVector3(lat, lon, 1.15)`.
- Add the group to the **scene**, not to `earth`, because `earth` is rotated.
- Calling `setMarker` again removes the previous group first.

**`js/main.js`**: after a successful lookup, call `setMarker(state.lat, state.lon)`.

**Done when**

- [ ] (browser) `SW1A 1AA` puts the marker in south-east England.
- [ ] (browser) `AB10 1AB` moves it to north-east Scotland, and only one marker is visible.

---

## Step 4: The sun goes round the globe

**`js/geo.js`**: add and export `subsolarPoint(date)`, which returns `{ lat, lon }` in degrees: the point on Earth where the sun is directly overhead at that moment. Use these formulas (angles in degrees, so convert to radians for `sin`/`cos`):

```
d   = date.getTime() / 86400000 - 10957.5       // days since 2000-01-01 12:00 UTC
g   = 357.529 + 0.98560028 * d                  // mean anomaly
q   = 280.459 + 0.98564736 * d                  // mean longitude
L   = q + 1.915 * sin(g) + 0.020 * sin(2g)      // ecliptic longitude
e   = 23.439 - 0.00000036 * d                   // obliquity
lat = asin(sin(e) * sin(L))                     // declination
ra  = atan2(cos(e) * sin(L), cos(L)) / 15       // right ascension, hours
eot = q / 15 - ra, wrapped into -12..+12 hours  // equation of time
utcHours = hours + minutes/60 + seconds/3600    (UTC)
lon = -15 * (utcHours - 12 + eot), wrapped into -180..+180
```

**`js/globe.js`**

- Change the ambient light to `AmbientLight(0xffffff, 0.15)`. Add a `DirectionalLight(0xffffff, 3)` aimed at the origin.
- Add a "sun": a yellow sphere (`SphereGeometry(0.12)`, `MeshBasicMaterial` colour `0xffd23f`).
- Export `updateGlobe(state)`: take `subsolarPoint(state.simTime)` and put both the sun and the light at `latLonToVector3(sun.lat, sun.lon, 3)`. The sun is not to scale. The globe itself never turns; the sun goes round it.

Also add and export `advanceTime(simTime, elapsedMs, dayMs)`, which returns a **new** `Date`:
`simTime` plus `elapsedMs * 86400000 / dayMs` milliseconds. `elapsedMs` is real time in milliseconds (straight from
the difference between two `requestAnimationFrame` timestamps, with no conversion), and `dayMs` is how many real
milliseconds one simulated day takes.

**`index.html`**: between `#location-result` and `#views`, add `<section id="sun-controls">` with:

- a date input `id="date-input"` (label "Date"),
- a button `id="play-btn"` with the text "Play",
- a select `id="speed-select"` (label "Speed") with options `12000` "1 day in 12 s", `24000` "1 day in 24 s" (selected) and `60000` "1 day in 60 s",
- `<p id="sim-clock" aria-live="off"></p>`.

**`js/main.js`**

- Run one `requestAnimationFrame` loop. Each frame, if `state.playing`, set `state.simTime = advanceTime(state.simTime, elapsedMs, state.dayMs)`, where `elapsedMs` is the time since the last frame in milliseconds. Then call `updateGlobe(state)` and update `#sim-clock`.
- `#sim-clock` shows the simulated time in UK time using `Intl.DateTimeFormat("en-GB", { timeZone: "Europe/London", weekday: "short", day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", timeZoneName: "short" })`, e.g. `Sun 21 Jun 2026, 21:22 BST`.
- `#play-btn` toggles `state.playing` and its text between "Play" and "Pause".
- `#speed-select` sets `state.dayMs`.
- Changing `#date-input` sets `state.simTime` to 00:00 UK time on that date. `#date-input` starts on today and follows `state.simTime` when the simulated day changes.

**Done when**

- [ ] `node -e "import('./js/geo.js').then(m => ['2026-06-21T12:00:00Z','2026-12-21T12:00:00Z','2026-06-21T18:00:00Z'].forEach(s => { const p = m.subsolarPoint(new Date(s)); console.log(s, p.lat.toFixed(2), p.lon.toFixed(2)); }))"` prints:
  `23.44 0.46` · `-23.43 -0.48` · `23.43 -89.53` (each ±0.05)
- [ ] `node -e "import('./js/geo.js').then(m => ['2026-06-21T12:00:00Z','2026-06-21T12:00:59Z','2026-06-21T12:01:00Z'].forEach(s => console.log(s, m.subsolarPoint(new Date(s)).lon.toFixed(2))))"` prints `0.46`, `0.21`, `0.21`. Seconds count too: the sun moves 0.25° of longitude per minute, so 59 seconds is almost a whole minute.
- [ ] `node -e "import('./js/geo.js').then(m => console.log(m.advanceTime(new Date('2026-06-21T12:00:00Z'), 1000, 24000).toISOString(), m.advanceTime(new Date('2026-06-21T12:00:00Z'), 16, 12000).toISOString()))"` prints `2026-06-21T13:00:00.000Z 2026-06-21T12:01:55.200Z` (at "1 day in 24 s", one real second is one simulated hour)
- [ ] `node -e "console.log(/advanceTime\(\s*state\.simTime/.test(require('fs').readFileSync('js/main.js', 'utf8')))"` prints `true` (the loop really uses it)
- [ ] (browser) Half the globe is lit and the yellow sun is on the lit side. Play makes the sun go round from east to west (right to left as you look at it).
- [ ] (browser) Set 21 June with `SW1A 1AA`. The marker passes from light into dark at about 21:20 BST on `#sim-clock`.
- [ ] (browser) The sun sits well above the equator on 21 June and well below it on 21 December.

---

## Step 5: The horizon view

**`index.html`**

- Inside `#views`, after `#globe`, add `<canvas id="horizon" hidden></canvas>`.
- In `#sun-controls`, add a button `id="view-toggle"` with the text "Show horizon".

**`js/geo.js`**: add and export `sunAltAz(date, lat, lon)`, which returns `{ alt, az }` in degrees.

- Use `globalThis.SunCalc.getPosition(date, lat, lon)`.
- SunCalc's azimuth is in radians, measured from **south**, with west positive. Convert it to a compass bearing (0 = N, 90 = E): `az = (azimuth * 180 / Math.PI + 180 + 360) % 360`.
- `alt = altitude * 180 / Math.PI`.

**`js/horizon.js`**: ES module, no Three.js. Export:

- `azAltToXY(az, alt, width, height)`: azimuth 30° is the left edge and 330° the right edge (300° across); altitude +70° is the top and −10° the bottom.
  - `x = (az - 30) / 300 * width`
  - `y = (70 - alt) / 80 * height`
- `drawHorizon(canvas, state)`:
  - Size the canvas drawing buffer to its displayed size × `devicePixelRatio`.
  - If `state.lat` is `null`, fill dark grey and write "Enter a postcode first".
  - Otherwise, using `sunAltAz(state.simTime, state.lat, state.lon)`:
    - **Sky** (above altitude 0): a vertical gradient, chosen by sun altitude:
      - night (alt < −6): top `#060a1f`, bottom `#1b2448`
      - twilight (−6 to 0): top `#1b2448`, bottom `#f28c38`
      - day (> 0): top `#3d8fe0`, bottom `#cfe8ff`
    - **Ground** (below altitude 0): `#2f4a2f`.
    - **Labels** just below the horizon line: NE 45, E 90, SE 135, S 180, SW 225, W 270, NW 315.
    - **Sun**: a `#ffd23f` circle of radius 12 CSS px at its position, drawn only if alt > −10.

**`style.css`**: `#horizon` is full width with `aspect-ratio: 3 / 1`. Also add exactly `[hidden] { display: none !important; }`, so the `hidden` attribute always wins over any `display` rule (an `#id` rule with `display: block` would otherwise beat it, and the toggle would hide nothing).

**`js/main.js`**

- `#view-toggle` switches which of `#globe` and `#horizon` is `hidden`. Its text is "Show horizon" or "Show globe".
- Each frame, if the horizon is visible, call `drawHorizon`, using the same `state.simTime` as the globe.

**Done when**

- [ ] `node -e "const c = require('fs').readFileSync('style.css', 'utf8'); console.log(/\[hidden\]\s*\{\s*display:\s*none\s*!important;?\s*\}/.test(c))"` prints `true`
- [ ] `node -e "globalThis.SunCalc = require('./vendor/suncalc.js'); import('./js/geo.js').then(m => { const p = m.sunAltAz(new Date('2026-06-21T12:00:00Z'), 51.50101, -0.141563); console.log(p.alt.toFixed(2), p.az.toFixed(2)); })"` prints `61.93 178.75` (±0.05)
- [ ] `node -e "import('./js/horizon.js').then(m => console.log(JSON.stringify([m.azAltToXY(30,70,1000,400), m.azAltToXY(180,0,1000,400), m.azAltToXY(330,-10,1000,400)])))"` prints `[{"x":0,"y":0},{"x":500,"y":350},{"x":1000,"y":400}]`
- [ ] (browser) With `SW1A 1AA` on 21 June, Play: the sun rises on the left near NE, peaks just right of S at about 62° (well up the canvas), and sets near NW. The sky goes through night, twilight and day.
- [ ] (browser) The toggle switches views, and the clock keeps running in both.

---

## Step 6: Sun paths and the seasonal extremes

**`js/geo.js`**: add and export:

- `sunEvents(date, lat, lon)`. Call `SunCalc.getTimes` with a Date at **12:00 UTC** on `date`'s UK calendar day; a time near midnight can pick the wrong day. Return `{ sunrise, sunset, sunriseAz, sunsetAz }`. The azimuths come from `sunAltAz` at those times.
- `sunPath(date, lat, lon)`: every 10 minutes from 00:00 to 24:00 UK time on `date`'s day, return `{ az, alt }` points (from `sunAltAz`) where `alt > -10`. Work out the UK offset with `Intl.DateTimeFormat` (`timeZone: "Europe/London"`). Don't use `Date.parse` on a `toLocaleString` result: it reads "21/06/2026" month-first.

**`index.html`**: in `#sun-controls`, add buttons `id="midsummer-btn"` "Midsummer", `id="midwinter-btn"` "Midwinter" and `id="equinox-btn"` "Equinox". After `#views`, add `<p id="sun-times"></p>`.

**`js/main.js`**

- The three buttons set `state.simTime` to 12:00 UK time on 21 June, 21 December or 20 March of `state.simTime`'s year, and pause.
- `#sun-times` shows, for the current day and location, e.g. `Sunrise 04:44 (49°) · Sunset 21:22 (311°) · Day length 16 h 38 m`. Show times in UK time and round azimuths to whole degrees. Update it when the day or location changes, not every frame.

**`js/horizon.js`**: in `drawHorizon`, before drawing the sun:

- Draw the midsummer (21 June) and midwinter (21 December) paths of `state.simTime`'s year, using `sunPath`, as dashed white lines at 35% opacity, labelled "21 Jun" and "21 Dec" near their highest point.
- Draw the current day's path as a solid `#ffd23f` line, 2 px.
- At today's sunrise and sunset azimuths, draw a short tick on the horizon line with the time (UK time) above it.

**Done when**

- [ ] `node -e "globalThis.SunCalc = require('./vendor/suncalc.js'); import('./js/geo.js').then(m => ['2026-06-21','2026-12-21'].forEach(d => { const e = m.sunEvents(new Date(d + 'T12:00:00Z'), 51.50101, -0.141563); const t = x => x.toLocaleTimeString('en-GB', { timeZone: 'Europe/London', hour: '2-digit', minute: '2-digit' }); console.log(d, t(e.sunrise), e.sunriseAz.toFixed(1), t(e.sunset), e.sunsetAz.toFixed(1)); }))"` prints:
  `2026-06-21 04:44 49.1 21:22 311.3` and `2026-12-21 08:05 128.6 15:54 231.8` (times ±1 min, azimuths ±0.3)
- [ ] `node -e "globalThis.SunCalc = require('./vendor/suncalc.js'); import('./js/geo.js').then(m => ['2026-06-21T12:00:00Z','2026-06-20T23:30:00Z','2026-12-21T12:00:00Z','2026-06-05T12:00:00Z'].forEach(s => { const p = m.sunPath(new Date(s), 51.50101, -0.141563); const top = p.reduce((a, b) => b.alt > a.alt ? b : a, { alt: -99 }); console.log(s, p.length, top.alt.toFixed(1)); }))"` prints:
  `2026-06-21T12:00:00Z 118 61.9` · `2026-06-20T23:30:00Z 118 61.9` (00:30 BST is already 21 June) · `2026-12-21T12:00:00Z 61 15.1` · `2026-06-05T12:00:00Z 117 61.0`
- [ ] (browser) With `SW1A 1AA`, all four sunrise and sunset points (both solstices) are inside the horizon view. The midsummer arc is clearly higher and wider than the midwinter one.
- [ ] (browser) With `AB10 1AB`, the midsummer sunrise is further left (≈41°) and the midwinter arc lower (noon ≈9°) than for London.
- [ ] (browser) The Midsummer, Midwinter and Equinox buttons jump the date and both views follow.

---

## Step 7: Polish (optional)

- On narrow screens (under 600px), the controls wrap neatly and nothing scrolls sideways.
- Visible focus styles on every control. Every input has a `<label>`.
- If `prefers-reduced-motion` is set, OrbitControls damping is off.
- If the network is down, the lookup shows "Couldn't reach the postcode service." rather than a raw error.

**Done when**

- [ ] (browser) The page works at phone width (devtools, 375px).
- [ ] (browser) Tab moves through every control in a sensible order, with a visible focus ring.
- [ ] Every check from Steps 1–6 still passes.

---

## Step 8: Time-of-day slider

**`index.html`**: In `#sun-controls`, after the speed select and before the view toggle button, add:

```html
<label for="time-slider">Time</label>
<input type="range" id="time-slider" min="0" max="1439" step="1" value="720">
<output id="time-display"></output>
```

The slider ranges from 0 (midnight) to 1439 (23:59), in 1-minute steps. The `<output>` shows the current slider time as `HH:MM` in UK time, e.g. `14:30`.

**`js/main.js`**

- On load, set the slider value to match `state.simTime`'s UK hour and minute:
  `Math.floor(ukHour * 60 + ukMinute)`.
- When the user drags the slider (`input` event):
  - Set `state.simTime` to the slider's minute-of-day on the current simulated date (keeping the same year/month/day). Use the same UK-offset logic as the date input handler.
  - Pause playback (`state.playing = false`, button text "Play").
- Each frame, whether playing or not, update the slider value from `state.simTime`'s UK hour and minute (so it tracks during playback). Only touch the DOM if the value changed.
- Update `#time-display` to show `HH:MM` in UK time each frame (only if changed).

**Done when**

- [ ] (browser) With `SW1A 1AA` on 21 June, dragging the slider moves the sun and horizon smoothly through the day. The clock and globe follow.
- [ ] (browser) Pressing Play while the slider is at noon: the slider advances from right to left as hours pass.
- [ ] (browser) Dragging the slider pauses playback; pressing Play resumes from the new position.
- [ ] `node -e "const d = new Date(); const p = new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/London', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(d); const s = p.find(x=>x.type==='year').value.padStart(4,'0')+'-'+p.find(x=>x.type==='month').value+'-'+p.find(x=>x.type==='day').value; console.log(/^\\d{4}-\\d{2}-\\d{2}$/.test(s) ? 'YYYY-MM-DD OK' : 'FAIL: '+s)"` prints `YYYY-MM-DD OK` (date input value is ISO format, not DD-MM-YYYY which the browser rejects silently)

---

## Step 9: GitHub Pages hosting

The project must be deployable to GitHub Pages without a build step — just push and enable Pages in repo settings.

**`.github/workflows/deploy.yml`**: A workflow that deploys to GitHub Pages on push to `main`:

```yaml
name: Deploy to GitHub Pages

on:
  push:
    branches: [ main ]

permissions:
  contents: read
  pages: write
  id-token: write

concurrency:
  group: pages
  cancel-in-progress: true

jobs:
  deploy:
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v4
      - name: Setup Pages
        uses: actions/configure-pages@v5
      - name: Upload artifact
        uses: actions/upload-pages-artifact@v3
        with:
          path: '.'
      - name: Deploy to GitHub Pages
        id: deployment
        uses: actions/deploy-pages@v4
```

**`js/postcode.js`**: The postcode API URL is already absolute (`https://api.postcodes.io/…`) so it works from any origin. No changes needed — but the spec notes this explicitly so future editors don't make paths relative.

**`index.html`**: All asset paths are relative (`style.css`, `js/main.js`, `vendor/suncalc.js`, `assets/earth.jpg`) and resolve correctly whether served from `/` (localhost) or `/repo-name/` (GitHub Pages). The import map uses absolute CDN URLs for Three.js. No changes needed — but verify no `<base>` tag is present.

**Done when**

- [ ] `test -f .github/workflows/deploy.yml && echo "workflow exists"` prints `workflow exists`
- [ ] `grep -c '<base' index.html` prints `0` (no base tag that would break relative paths)
- [ ] (browser/GitHub) After pushing to `main` and enabling Pages, the site loads at `https://<user>.github.io/<repo>/` with globe, horizon, and postcode lookup all working.

---

## Step 10: Orbit / Spin view toggle

Two ways to show the day-night cycle on the globe:

- **Sun orbits** (default): the Earth stays fixed in the frame and the sun mesh and light move to `subsolarPoint(state.simTime)` each frame. This is the current behaviour; don't change it.
- **Earth spins**: the sun mesh and light stay fixed at `(3, 0, 0)`, to the right of the globe. The Earth (with the marker) turns on its axis, and the axis leans toward or away from the sun with the season (north pole toward the sun in June, away in December). The result must light exactly the same places as orbit mode at the same `simTime`.

Spin mode reuses `subsolarPoint`, so the Earth's angles come from the same verified formula as the sun's position. Do **not** compute hours from `getUTCHours()` / `getUTCMinutes()` / `getUTCSeconds()` yourself, and do **not** use `rotation.x` for the tilt (that leans the axis toward the camera, not the sun).

**`js/geo.js`**: add

```js
/** Rotation (radians) that turns the globe so the subsolar point faces +x, where the fixed sun is. */
export function spinAngles(date) {
  const s = subsolarPoint(date);
  return { y: Math.PI / 2 - s.lon * Math.PI / 180, z: -s.lat * Math.PI / 180 };
}
```

`y` spins the Earth about its own axis; `z` leans the axis toward the sun by the subsolar latitude. They must be applied **y first, then z**, which in Three.js is Euler order `'ZYX'`.

**`index.html`**: in `#sun-controls`, after the Equinox button and before `#sim-clock`, add:

```html
<button id="orbit-spin-btn" type="button">Earth spins</button>
```

The text is "Earth spins" in orbit mode and "Sun orbits" in spin mode (the button names the mode it switches *to*).

**`js/globe.js`**:

- Add a module-level `globeGroup = new THREE.Group()` with `globeGroup.rotation.order = 'ZYX'`. In `createGlobe`, add `earth` to `globeGroup` (not to `scene`) and add `globeGroup` to `scene`. Keep `earth.rotation.y = -Math.PI / 2` as it is; the group rotates on top of it.
- In `setMarker`, add and remove `markerGroup` on `globeGroup` instead of `scene`, so the marker turns with the Earth. Marker positions stay as they are (`latLonToVector3`).
- Add `let mode = 'orbit';` and export:
  - `setGlobeMode(m)`: sets `mode` to `'orbit'` or `'spin'`.
  - `getGlobeMode()`: returns `mode`.
- In `updateGlobe(state)`:
  - **orbit**: `globeGroup.rotation.set(0, 0, 0)`, then place the sun mesh and light at `latLonToVector3(sp.lat, sp.lon, 3)` as now.
  - **spin**: `const a = spinAngles(state.simTime); globeGroup.rotation.set(0, a.y, a.z);` and place the sun mesh and light at `(3, 0, 0)`.
- Import `spinAngles` from `./geo.js`.

**`js/main.js`**:

- Import `setGlobeMode` and `getGlobeMode`.
- `#orbit-spin-btn` click: if `getGlobeMode() === 'orbit'`, call `setGlobeMode('spin')` and set the text to "Sun orbits"; otherwise `setGlobeMode('orbit')` and "Earth spins". Then call `updateGlobe(state)` once, so the change shows straight away while paused.

**Done when**

- [ ] `node -e "import('./js/geo.js').then(m => ['2026-06-21T12:00:00Z','2026-06-21T18:00:00Z','2026-12-21T12:00:00Z','2026-03-20T06:00:00Z'].forEach(s => { const a = m.spinAngles(new Date(s)); console.log(s, a.y.toFixed(3), a.z.toFixed(3)); }))"` prints:
  ```
  2026-06-21T12:00:00Z 1.563 -0.409
  2026-06-21T18:00:00Z 3.133 -0.409
  2026-12-21T12:00:00Z 1.579 0.409
  2026-03-20T06:00:00Z -0.033 0.002
  ```
- [ ] This check turns the subsolar point by those angles (y first, then z) and must land on the sun at `1.000 0.000 0.000` for every date: `node -e "import('./js/geo.js').then(m => ['2026-06-21T12:00:00Z','2026-06-21T18:00:00Z','2026-12-21T12:00:00Z'].forEach(s => { const d = new Date(s), a = m.spinAngles(d), p = m.subsolarPoint(d), v = m.latLonToVector3(p.lat, p.lon, 1); const x = v.x*Math.cos(a.y) + v.z*Math.sin(a.y), z = -v.x*Math.sin(a.y) + v.z*Math.cos(a.y); console.log(s, (x*Math.cos(a.z) - v.y*Math.sin(a.z)).toFixed(3), (x*Math.sin(a.z) + v.y*Math.cos(a.z)).toFixed(3), z.toFixed(3)); }))"` (`-0.000` counts as `0.000`)
- [ ] `node -e "const g = require('fs').readFileSync('js/globe.js', 'utf8'); console.log(/rotation\.order\s*=\s*['\"]ZYX['\"]/.test(g), /globeGroup\.add\(\s*markerGroup/.test(g), /getUTC(Hours|Minutes|Seconds)/.test(g))"` prints `true true false`
- [ ] (browser) Default view: the sun orbits a fixed Earth, exactly as before.
- [ ] (browser) Click "Earth spins": the sun jumps to the right of the globe and stays there; the lit half of the Earth covers the same places as before the click (the red marker is in day or night just as it was), and the marker turns with the Earth.
- [ ] (browser) Midsummer button in spin mode: the north pole leans toward the sun (the Arctic is lit all round). Midwinter: it leans away.
- [ ] (browser) Play in spin mode: the Earth turns west to east (Europe moves toward the sun on the right, then into the night), once per simulated day.
- [ ] (browser) Click "Sun orbits": back to the default view. Drag and zoom work in both modes.

---

## Step 11: The tilt stays the same; its direction turns with the year

Step 10 leans the axis toward the sun by the subsolar latitude, so at the equinox the axis stands upright and the tilt seems to come and go. In reality the tilt is always 23.4°. What changes over the year is **which way it leans relative to the sun**:

- **June solstice:** the north pole leans toward the sun (right). The Arctic is lit all day.
- **September equinox:** it leans toward the viewer. Neither pole is favoured.
- **December solstice:** it leans away from the sun (left). The Arctic is dark all day.
- **March equinox:** it leans away from the viewer.

This step makes spin mode show that, and draws the axis so it can be seen. Orbit mode does not change.

**`js/geo.js`**: replace `spinAngles` with this version (copy it exactly; it uses the same formulas as `subsolarPoint`):

```js
/** Angles (radians) for the "Earth spins" view, where the sun is fixed at +x and the camera looks from +z. */
export function spinAngles(date) {
  const r = Math.PI / 180;
  const d = date.getTime() / 86400000 - 10957.5;
  const g = (357.529 + 0.98560028 * d) * r;
  const q = 280.459 + 0.98564736 * d;
  const L = (q + 1.915 * Math.sin(g) + 0.020 * Math.sin(2 * g)) * r; // the sun's ecliptic longitude
  const e = (23.439 - 0.00000036 * d) * r;                            // the axial tilt
  const ra = Math.atan2(Math.cos(e) * Math.sin(L), Math.cos(L));      // the sun's right ascension
  const wrap = a => Math.atan2(Math.sin(a), Math.cos(a));             // into -π..π
  return {
    year: wrap(Math.PI / 2 - L),                 // turns the direction of the lean as the year goes on
    tilt: -e,                                    // leans the axis by 23.4°
    spin: wrap(ra - subsolarPoint(date).lon * r), // turns the Earth so the subsolar point faces the sun
  };
}
```

**`js/globe.js`**: three nested groups, outermost first:

```
yearGroup   (rotation.y = a.year)   ← in scene
  tiltGroup (rotation.z = a.tilt)   ← also holds the axis line
    globeGroup (rotation.y = a.spin) ← earth + markerGroup, as now
```

- Create `yearGroup` and `tiltGroup` as module-level `THREE.Group`s in `createGlobe`. Add `globeGroup` to `tiltGroup`, `tiltGroup` to `yearGroup`, and `yearGroup` to `scene` (not `globeGroup` directly).
- Remove `globeGroup.rotation.order = 'ZYX'`; each group now turns about one axis only, so the default order is fine.
- **Axis line:** a module-level `axisLine`, a `THREE.Line` from `(0, -1.4, 0)` to `(0, 1.4, 0)` with `LineBasicMaterial({ color: 0xffffff })`, added to `tiltGroup` (so it tilts but doesn't spin). Hidden in orbit mode, shown in spin mode.
- `updateGlobe(state)`:
  - **orbit:** set all three groups' rotations to `(0, 0, 0)`, `axisLine.visible = false`, and move the sun as now.
  - **spin:** `const a = spinAngles(state.simTime);` then `yearGroup.rotation.set(0, a.year, 0)`, `tiltGroup.rotation.set(0, 0, a.tilt)`, `globeGroup.rotation.set(0, a.spin, 0)`, `axisLine.visible = true`, and the sun mesh and light at `(3, 0, 0)`.
- Don't use `getUTCHours` / `getUTCMinutes` / `getUTCSeconds` in `globe.js`.

No changes to `index.html` or `main.js`.

**Done when**

- [ ] `node -e "import('./js/geo.js').then(m => ['2026-03-20T12:00:00Z','2026-06-21T12:00:00Z','2026-06-21T18:00:00Z','2026-09-23T12:00:00Z','2026-12-21T12:00:00Z'].forEach(s => { const a = m.spinAngles(new Date(s)); console.log(s, a.year.toFixed(3), a.tilt.toFixed(3), a.spin.toFixed(3)); }))"` prints:
  ```
  2026-03-20T12:00:00Z 1.573 -0.409 -0.034
  2026-06-21T12:00:00Z -0.002 -0.409 1.566
  2026-06-21T18:00:00Z -0.007 -0.409 3.141
  2026-09-23T12:00:00Z -1.579 -0.409 -3.101
  2026-12-21T12:00:00Z -3.135 -0.409 -1.570
  ```
- [ ] This check applies the three rotations (spin, then tilt, then year) to the subsolar point and to the north pole. The sun must always land on `1.000 0.000 0.000`. The axis must always have y = `0.918` (a constant 23.4° tilt) and lean toward the viewer (+z) in September, toward the sun (+x) in June, and so on: `node -e "import('./js/geo.js').then(m => { const ry = (a, v) => ({ x: v.x*Math.cos(a) + v.z*Math.sin(a), y: v.y, z: -v.x*Math.sin(a) + v.z*Math.cos(a) }), rz = (a, v) => ({ x: v.x*Math.cos(a) - v.y*Math.sin(a), y: v.x*Math.sin(a) + v.y*Math.cos(a), z: v.z }), f = v => [v.x, v.y, v.z].map(n => (n + 0).toFixed(3)).join(' '); ['2026-03-20T12:00:00Z','2026-06-21T12:00:00Z','2026-09-23T12:00:00Z','2026-12-21T12:00:00Z'].forEach(s => { const d = new Date(s), a = m.spinAngles(d), p = m.subsolarPoint(d), R = v => ry(a.year, rz(a.tilt, ry(a.spin, v))); console.log(s, 'sun', f(R(m.latLonToVector3(p.lat, p.lon, 1))), 'axis', f(R({ x: 0, y: 1, z: 0 }))); }); })"` prints:
  ```
  2026-03-20T12:00:00Z sun 1.000 0.000 0.000 axis -0.001 0.918 -0.398
  2026-06-21T12:00:00Z sun 1.000 0.000 0.000 axis 0.398 0.918 0.001
  2026-09-23T12:00:00Z sun 1.000 0.000 0.000 axis -0.003 0.918 0.398
  2026-12-21T12:00:00Z sun 1.000 0.000 0.000 axis -0.398 0.918 0.003
  ```
  (`-0.000` counts as `0.000`)
- [ ] `node -e "const g = require('fs').readFileSync('js/globe.js', 'utf8'); console.log(/yearGroup/.test(g), /tiltGroup\.add\(\s*globeGroup/.test(g), /tiltGroup\.add\(\s*axisLine/.test(g), /ZYX/.test(g), /getUTC(Hours|Minutes|Seconds)/.test(g))"` prints `true true true false false`
- [ ] (browser) Spin mode, Midsummer: a white axis line through the poles leans toward the sun on the right; the Arctic is lit all round.
- [ ] (browser) Spin mode, Midwinter: the same lean, but away from the sun (left); the Arctic is dark.
- [ ] (browser) Spin mode, Equinox (20 March): the axis leans away from you, neither toward nor away from the sun; the day/night line runs through both poles. The lean looks just as big as at the solstices (drag the view sideways to see it).
- [ ] (browser) Spin mode, Play: the Earth turns about the white line, and the line itself barely moves during a day.
- [ ] (browser) Orbit mode: no axis line, and everything is exactly as before Step 11.

---

## Step 12: A year in a minute

A new speed, "1 year in 60 s", plays the seasons. At that speed a day lasts only 0.16 s, which is about ten frames. If time ran smoothly, the Earth would spin six times a second and flicker or seem to turn backwards. So this speed **jumps a whole day at a time and keeps the clock time the same**: the spin stays put and only the season moves. What you see:

- **Spin mode:** the axis's lean turns once round per minute, and the day/night line swings across the poles (the Arctic goes from lit all round to dark all round).
- **Orbit mode:** the sun drifts north and south between the tropics, tracing a thin figure of eight (the analemma).
- **Horizon view:** the sun rises and falls at the same clock time, and the sun-path arc grows and shrinks.

**`js/geo.js`**: add (copy exactly):

```js
/** Advance simulated time by whole days only, so the time of day stays put.
    carryMs is real time not yet used up from earlier frames; yearMs is real ms per simulated year. */
export function advanceByDays(simTime, carryMs, elapsedMs, yearMs) {
  const msPerDay = yearMs / 365.2422;
  const total = carryMs + elapsedMs;
  const days = Math.floor(total / msPerDay);
  return { simTime: new Date(simTime.getTime() + days * 86400000), carryMs: total - days * msPerDay };
}
```

The carry matters: one frame (~16 ms) is less than one simulated day (~164 ms), so without it nothing would ever move.

**`index.html`**: add a last option to `#speed-select`: `<option value="year60">1 year in 60 s</option>`.

**`js/main.js`**:

- Add to `state`: `yearMs: null` (null means the normal day speeds) and `carryMs: 0`.
- `#speed-select` change: if the value is `"year60"`, set `state.yearMs = 60000`; otherwise set `state.yearMs = null` and `state.dayMs = Number(value)` as now. In both cases set `state.carryMs = 0`.
- In the loop, when `state.playing`:
  - if `state.yearMs`: `const r = advanceByDays(state.simTime, state.carryMs, elapsedMs, state.yearMs); state.simTime = r.simTime; state.carryMs = r.carryMs;`
  - otherwise use `advanceTime` exactly as now.
- Nothing else changes. The date input, time slider, clock and sunrise/sunset text already follow `state.simTime`. The time stays fixed in UTC, so the UK clock shows one hour later in summer (BST) than in winter (GMT). That is correct and expected.

**Done when**

- [ ] `node -e "import('./js/geo.js').then(m => { const t = new Date('2026-06-21T12:00:00Z'); [[0,1000],[0,16],[150,16]].forEach(([c,e]) => { const r = m.advanceByDays(t, c, e, 60000); console.log(r.simTime.toISOString(), r.carryMs.toFixed(1)); }); })"` prints:
  ```
  2026-06-27T12:00:00.000Z 14.4
  2026-06-21T12:00:00.000Z 16.0
  2026-06-22T12:00:00.000Z 1.7
  ```
- [ ] 60 s of 16 ms frames is exactly a year, at the same time of day: `node -e "import('./js/geo.js').then(m => { let s = { simTime: new Date('2026-03-20T12:00:00Z'), carryMs: 0 }; for (let i = 0; i < 3750; i++) s = m.advanceByDays(s.simTime, s.carryMs, 16, 60000); console.log(s.simTime.toISOString()); })"` prints `2027-03-20T12:00:00.000Z`
- [ ] `node -e "const fs = require('fs'), j = fs.readFileSync('js/main.js', 'utf8'), h = fs.readFileSync('index.html', 'utf8'); console.log(/advanceByDays\(\s*state\.simTime/.test(j), /advanceTime\(\s*state\.simTime/.test(j), /<option value=\"year60\">1 year in 60 s<\/option>/.test(h))"` prints `true true true`
- [ ] (browser) Choose "1 year in 60 s", spin mode, Play: the Earth holds still while the white axis's lean turns once round in about a minute; the Arctic is lit all round near June and dark near December. No flicker.
- [ ] (browser) The same in orbit mode: the sun slides up to the Tropic of Cancer and down to the Tropic of Capricorn and back, all in a minute.
- [ ] (browser) The date input counts through the year (about six days a second), and the time slider stays put apart from a one-hour jump at the BST changes.
- [ ] (browser) Switch back to "1 day in 24 s": normal play resumes from wherever the year got to.

---

## Step 13: Fixes

Three things found by using the page, plus one safety fix.

### 13a. Sun-path guides are hard to see in daylight (`js/horizon.js`)

The midsummer and midwinter arcs and their "21 Jun" / "21 Dec" labels are white at 35% opacity, which almost vanishes on the pale daytime sky. The yellow line for the chosen day is also weak against the pale blue. In `drawHorizon`, after the sky colours are chosen, add:

```js
const day = alt >= 0;
const guide = day ? 'rgba(15,30,70,0.7)' : 'rgba(255,255,255,0.5)';
const guideText = day ? 'rgba(15,30,70,0.9)' : 'rgba(255,255,255,0.75)';
```

- Draw the midsummer and midwinter paths with `guide` (still dashed, `lineWidth` 1.5), and the "21 Jun" / "21 Dec" labels with `guideText`.
- When `day`, draw the chosen day's path twice: first `'rgba(15,30,70,0.6)'` at `lineWidth` 4, then the existing `'#ffd23f'` at `lineWidth` 2 on top, so the yellow has a dark edge. At night or twilight draw it once, as now.

### 13b. Buttons jump when their text changes (`style.css`)

The controls are centred in a wrapping row, so when a button's text changes ("Show horizon" ↔ "Show globe", "Earth spins" ↔ "Sun orbits", "Play" ↔ "Pause"), its width changes and every control after it moves. Fix with fixed minimum widths, and give every button in `#sun-controls` the same look (Midsummer, Midwinter, Equinox and the orbit/spin button have no style yet). Replace the `#play-btn, #view-toggle { … }` rule and its `:focus-visible` rule with:

```css
#sun-controls button {
  padding: 0.3rem 0.8rem;
  font-size: 0.95rem;
  border: 1px solid var(--border);
  border-radius: 4px;
  background: var(--surface);
  color: var(--fg);
  cursor: pointer;
  text-align: center;
}

#play-btn { min-width: 9ch; }
#view-toggle, #orbit-spin-btn { min-width: 14ch; }

#sun-controls button:focus-visible,
#date-input:focus-visible, #speed-select:focus-visible {
  outline: 2px solid #3d8fe0;
  outline-offset: 2px;
}
```

### 13c. The page jumps when switching globe ↔ horizon (`style.css`)

The globe is square (up to 80vh tall) and the horizon is 3:1, so the page gets much shorter when the horizon shows. If the page was scrolled down, the browser jumps it. Make `#views` keep the globe's height whichever view is showing; the horizon sits at the top of that space:

```css
#views {
  display: flex; flex-direction: column; align-items: center; gap: 1rem;
  justify-content: flex-start;
  min-height: min(80vh, 100vw - 2rem, 868px);
}
```

(`868px` is the 900px body width minus its padding, so the box matches the globe's height on desktop.)

### 13d. One error stops the animation for good (`js/main.js`)

`tick` calls `requestAnimationFrame(tick)` as its **last** line, so if anything inside it throws, the next frame is never requested and the page freezes. Move `requestAnimationFrame(tick);` to be the **first** line inside `tick`. Also delete the unused `const ukStr = …` line in the `#date-input` change handler.

**Done when**

- [ ] `node -e "const h = require('fs').readFileSync('js/horizon.js', 'utf8'); console.log(h.includes('rgba(15,30,70,0.7)'), h.includes('rgba(15,30,70,0.9)'), /alt\s*>=\s*0/.test(h), h.includes('rgba(255,255,255,0.35)'))"` prints `true true true false`
- [ ] `node -e "const c = require('fs').readFileSync('style.css', 'utf8'); console.log(/#sun-controls button\s*\{/.test(c), /#play-btn\s*\{\s*min-width:\s*9ch/.test(c), /#view-toggle,\s*#orbit-spin-btn\s*\{\s*min-width:\s*14ch/.test(c), /min-height:\s*min\(80vh/.test(c), /#play-btn,\s*#view-toggle\s*\{/.test(c))"` prints `true true true true false`
- [ ] `node -e "const j = require('fs').readFileSync('js/main.js', 'utf8'); console.log(/function tick\(ts\)\s*\{\s*requestAnimationFrame\(tick\)/.test(j), (j.match(/requestAnimationFrame\(tick\)/g) || []).length, /ukStr/.test(j))"` prints `true 2 false` (one call inside `tick`, one to start it)
- [ ] All the checks from Steps 1–12 still pass.
- [ ] (browser, desktop width) Click "Show horizon" and "Show globe" several times: the button stays under the mouse and nothing else in the controls row moves. The same for "Earth spins"/"Sun orbits" and "Play"/"Pause".
- [ ] (browser) Scroll down a little, then switch to the horizon: the page doesn't jump.
- [ ] (browser) Horizon at midday in June: the dashed 21 Jun and 21 Dec arcs and their labels show clearly in dark blue on the sky, and the yellow line has a dark edge. At night they are white again.
- [ ] (browser) All the buttons in the controls row look alike.

---

## Steps 14–16: a 360° photo as the horizon

The user has 360° photos (for example from a DJI drone: 12000×6000 JPEGs of about 38 MB). Steps 14–16 let them load one, mark where south is, and use it as the backdrop of the horizon view, with the sun and arcs drawn over the real skyline.

Why this is simple: a 360° photo is **equirectangular**. Across the image is compass direction (360° over the full width), and down the image is altitude (+90° at the top, −90° at the bottom), both linear. The horizon canvas is linear in the same way (`azAltToXY`: azimuth 30°→330° across, altitude 70°→−10° down). So the horizon strip is just a **rectangle cut out of the photo and resized**, with no warping. The only catch is the photo's left/right edge (the seam): if the 300° span crosses it, the cut is two rectangles side by side.

Words used below:
- `meta`: where the decoded image sits on the full sphere (from `panoMeta`).
- `southU`: where south is, as a fraction (0–1) of the full sphere's width, counted from its left edge. The user sets it.

---

## Step 14: Panorama maths (`js/pano.js`)

A new file of **pure functions**, like `geo.js`: no DOM, no `fetch`, no Three.js. It may import from `./geo.js` if needed.

- `export const STRIP_W = 2400;` and `export const STRIP_H = 800;`: the size of the horizon strip (3:1, like `#horizon`).
- `panoMeta(exif, imgW, imgH)` → `{ fullW, fullH, left, top, w, h }`, all in the **decoded image's** pixels (the photo is decoded smaller than its real size, so the metadata must be scaled):
  - If `exif.FullPanoWidthPixels` and `exif.CroppedAreaImageWidthPixels` are both set (the "GPano" tags), let `k = imgW / CroppedAreaImageWidthPixels`. Then `fullW = FullPanoWidthPixels * k`, `fullH = FullPanoHeightPixels * k` (or `fullW / 2` if that tag is missing), `left = (CroppedAreaLeftPixels || 0) * k` and `top = (CroppedAreaTopPixels || 0) * k`. Convert each tag with `Number()`.
  - Otherwise treat the image as a full sphere: `fullW = imgW`, `fullH = imgW / 2`, `left = 0`, `top = (imgW / 2 - imgH) / 2`.
  - In both cases `w = imgW` and `h = imgH`.
- `uForAz(southU, az)` → the fraction (0–1) of the full width where azimuth `az` lies: `((southU + (az - 180) / 360) % 1 + 1) % 1`.
- `southFromSun(clickU, sunAz)` → the `southU` that puts column `clickU` at azimuth `sunAz`: `((clickU - (sunAz - 180) / 360) % 1 + 1) % 1`.
- `uAtImageX(meta, x)` → `(meta.left + x) / meta.fullW` (for clicks on the preview).
- `altAtImageY(meta, y)` → `90 - (meta.top + y) / meta.fullH * 180`.
- `panoCropRects(meta, southU, outW, outH)` → an array of `{ sx, sy, sw, sh, dx, dy, dw, dh }`, ready for `ctx.drawImage(img, sx, sy, sw, sh, dx, dy, dw, dh)`, that copies azimuth 30°→330° and altitude 70°→−10° into an `outW`×`outH` canvas:
  - **Rows:** on the full sphere, altitude 70° is at `fullH * 20 / 180` and −10° at `fullH * 100 / 180`. Subtract `meta.top` to get image rows. These map to destination rows 0 → `outH`.
  - **Columns:** on the full sphere the strip starts at `x0 = uForAz(southU, 30) * fullW` and is `span = fullW * 300 / 360` wide. If `x0 + span` is more than `fullW`, split it in two: `[x0, fullW)` and `[0, x0 + span - fullW)`. Each piece gets its share of the destination width, in proportion. Subtract `meta.left` to get image columns.
  - **Clip** each range to the image (columns `0..meta.w`, rows `0..meta.h`), moving the matching destination range by the same proportion. For example, if the top 10% of the source rows is above the image, `dy` starts at 10% of `outH`. Drop a piece that is empty after clipping. Leave everything outside the photo undrawn (transparent).
  - Write the clipping once, as a small helper used for rows and for columns.
- `exifLocalToDate(str, offset)` → a `Date` from an EXIF time such as `"2023:12:25 13:12:42"`. Cameras store local time with no zone, so: with an `offset` like `"+01:00"` or `"-05:30"`, use it; with no offset, treat the time as UK local time. Copy this exactly:

```js
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
```

No changes to any other file in this step.

**Done when**

- [ ] `node -e "import('./js/pano.js').then(m => { const r = o => JSON.stringify(o, (k, v) => typeof v === 'number' ? Math.round(v * 1000) / 1000 : v); console.log(m.STRIP_W, m.STRIP_H); console.log(r(m.panoMeta({ FullPanoWidthPixels: 12000, FullPanoHeightPixels: 6000, CroppedAreaImageWidthPixels: 12000, CroppedAreaLeftPixels: 0, CroppedAreaTopPixels: 0 }, 4096, 2048))); console.log(r(m.panoMeta({ FullPanoWidthPixels: 19490, FullPanoHeightPixels: 9745, CroppedAreaImageWidthPixels: 19490, CroppedAreaLeftPixels: 0, CroppedAreaTopPixels: 1620 }, 4096, 1367))); console.log(r(m.panoMeta({}, 4096, 2048))); })"` prints:
  ```
  2400 800
  {"fullW":4096,"fullH":2048,"left":0,"top":0,"w":4096,"h":2048}
  {"fullW":4096,"fullH":2048,"left":0,"top":340.458,"w":4096,"h":1367}
  {"fullW":4096,"fullH":2048,"left":0,"top":0,"w":4096,"h":2048}
  ```
- [ ] `node -e "import('./js/pano.js').then(m => { const meta = m.panoMeta({}, 4096, 2048); console.log(m.southFromSun(236.56 / 360, 194.73).toFixed(4), m.uForAz(0.6162, 194.73).toFixed(4), m.uForAz(0.1, 0).toFixed(4), m.uAtImageX(meta, 2048).toFixed(4), m.altAtImageY(meta, 1024).toFixed(2), m.altAtImageY(meta, 0).toFixed(2)); })"` prints `0.6162 0.6571 0.6000 0.5000 0.00 90.00`
- [ ] `panoCropRects`, for a full sphere with south in the middle (one rectangle), with the span crossing the seam (two), and for a photo that stops at about +60° (the top of the strip left empty): `node -e "import('./js/pano.js').then(m => { const r = o => JSON.stringify(o, (k, v) => typeof v === 'number' ? Math.round(v * 1000) / 1000 : v); const full = m.panoMeta({}, 4096, 2048), part = m.panoMeta({ FullPanoWidthPixels: 19490, FullPanoHeightPixels: 9745, CroppedAreaImageWidthPixels: 19490, CroppedAreaLeftPixels: 0, CroppedAreaTopPixels: 1620 }, 4096, 1367); console.log(r(m.panoCropRects(full, 0.5, 2400, 800))); console.log(r(m.panoCropRects(full, 0.6162, 2400, 800))); console.log(r(m.panoCropRects(part, 0.5, 2400, 800))); })"` prints:
  ```
  [{"sx":341.333,"sy":227.556,"sw":3413.333,"sh":910.222,"dx":0,"dy":0,"dw":2400,"dh":800}]
  [{"sx":817.289,"sy":227.556,"sw":3278.711,"sh":910.222,"dx":0,"dy":0,"dw":2305.344,"dh":800},{"sx":0,"sy":227.556,"sw":134.622,"sh":910.222,"dx":2305.344,"dy":0,"dw":94.656,"dh":800}]
  [{"sx":341.333,"sy":0,"sw":3413.333,"sh":797.32,"dx":0,"dy":99.23,"dw":2400,"dh":700.77}]
  ```
  (the order of the keys must be exactly `sx, sy, sw, sh, dx, dy, dw, dh`)
- [ ] `node -e "import('./js/pano.js').then(m => [['2023:12:25 13:12:42', ''], ['2024:07:01 13:00:00', undefined], ['2024:07:01 13:00:00', '+02:00'], ['2024:07:01 13:00:00', '-05:30']].forEach(([s, o]) => console.log(m.exifLocalToDate(s, o).toISOString())))"` prints:
  ```
  2023-12-25T13:12:42.000Z
  2024-07-01T12:00:00.000Z
  2024-07-01T11:00:00.000Z
  2024-07-01T18:30:00.000Z
  ```
  (December is GMT, so no change; July is BST, so 13:00 in the UK is 12:00 UTC)
- [ ] `node -e "const s = require('fs').readFileSync('js/pano.js', 'utf8'); console.log(/document|window|fetch/.test(s))"` prints `false`

---

## Step 15: Load a 360° photo and set south

**`index.html`**:

- In `<head>`, after the SunCalc script tag: `<script src="vendor/exifr-lite.umd.js"></script>`.
- After `<p id="sun-times">`, add this panel:

```html
<details id="pano-panel">
  <summary>Horizon photo</summary>
  <label for="pano-input">Load a 360° photo</label>
  <input type="file" id="pano-input" accept="image/jpeg">
  <p id="pano-status" aria-live="polite"></p>
  <canvas id="pano-preview" hidden></canvas>
  <div id="pano-buttons">
    <button type="button" id="pano-south-btn" disabled>Set south</button>
    <button type="button" id="pano-sun-btn" disabled>Click the sun</button>
    <button type="button" id="pano-left" disabled>◀ 1°</button>
    <button type="button" id="pano-right" disabled>1° ▶</button>
    <button type="button" id="pano-location-btn" disabled>Use photo's location</button>
    <button type="button" id="pano-time-btn" disabled>Go to photo's time</button>
  </div>
</details>
```

**`js/postcode.js`**: add `nearestPostcode(lat, lon)`, which fetches `https://api.postcodes.io/postcodes?lon=${lon}&lat=${lat}&limit=1&radius=2000` and returns the first result's `postcode`, or `null` when `result` is `null` or the request fails.

**`js/pano-ui.js`** (new): `export function initPano(state, { onLocation, onTime })`. `onLocation(lat, lon, label)` and `onTime(date)` are callbacks from `main.js`. Inside:

- Module-level: `img` (the decoded photo), `meta`, `southU = 0.5`, `exif`, `photoTime` (a Date or null), `clickMode` (`null`, `'south'` or `'sun'`), and one `strip` canvas of `STRIP_W`×`STRIP_H`.
- **Loading** (`#pano-input` change):
  1. Status "Reading the photo…".
  2. `exif = await exifr.parse(file, { xmp: true, reviveValues: false }).catch(() => null) || {};`. GPS comes back as `exif.latitude` / `exif.longitude`, and the time as the raw string `exif.DateTimeOriginal`. Set `photoTime = exif.DateTimeOriginal ? exifLocalToDate(exif.DateTimeOriginal, exif.OffsetTimeOriginal) : null`.
  3. Decode it **straight to a smaller size**. The full 72-megapixel image is too big for a canvas, so never draw it at full size. Copy this:

     ```js
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
     ```
  4. Reject photos that aren't 360°: if `exif.ProjectionType` is set and isn't `'equirectangular'`, or there are no GPano tags (`exif.FullPanoWidthPixels`) and the width isn't 2× the height (±2%), show "This doesn't look like a 360° photo." and stop. If decoding throws, show "Couldn't open that photo (it may be too big for this device)." and stop.
  5. `meta = panoMeta(exif, img.width, img.height)`, `southU = 0.5`. Enable the buttons: `#pano-sun-btn` and `#pano-time-btn` only when `photoTime` is set and GPS is present, and `#pano-location-btn` only when GPS is present. Show the preview, rebuild the strip, and give a status like "25 Dec 2023, 13:12 at 53.0927° N, 2.4185° W. Use "Set south" or "Click the sun"." (use `formatLatLon`, and leave out what is missing).
- **Preview** (`#pano-preview`): set `width = clientWidth * devicePixelRatio`, and the height to keep the image's shape. Draw the whole image scaled. Then:
  - shade the part that won't be used (azimuth 330° → 30°, through north) with `rgba(0,0,0,0.5)`; it is 60° wide and may cross the edge.
  - draw a red vertical line labelled "S" at `uForAz(southU, 180)`, and thin white lines labelled "E", "W" and "N" at 90°, 270° and 0°.
  - The image x of an azimuth is `uForAz(southU, az) * meta.fullW - meta.left`; scale it to the preview.
- **Clicks:**
  - `#pano-south-btn` sets `clickMode = 'south'` and the status "Click the south point on the photo."
  - `#pano-sun-btn` sets `clickMode = 'sun'` and the status "Click the middle of the sun on the photo."
  - On a preview click, turn the click into image pixels (`x * meta.w / rect.width`, and the same for y), then:
    - **south:** `southU = uAtImageX(meta, x)`.
    - **sun:** `const sun = sunAltAz(photoTime, exif.latitude, exif.longitude); southU = southFromSun(uAtImageX(meta, x), sun.az);`. Status: "Sun set from the photo's time and place. In the photo it is A° high; it should be B°." with one decimal place, using `altAtImageY(meta, y)` for A. If they differ by more than 2°, add " The photo may not be level."
    - Then `clickMode = null`, redraw the preview and rebuild the strip.
  - `#pano-left` / `#pano-right`: `southU` minus/plus `1 / 360`, wrapped into 0–1, then redraw and rebuild.
  - `#pano-location-btn`: `onLocation(exif.latitude, exif.longitude, (await nearestPostcode(exif.latitude, exif.longitude)) || 'Photo location')`.
  - `#pano-time-btn`: `onTime(photoTime)`.
- **Rebuild the strip:** `clearRect` the strip, then for each `r` of `panoCropRects(meta, southU, STRIP_W, STRIP_H)`, `drawImage(img, r.sx, r.sy, r.sw, r.sh, r.dx, r.dy, r.dw, r.dh)`. Then `state.horizonPhoto = strip`.

**`js/main.js`**:

- Add `horizonPhoto: null` to `state`.
- After the existing setup, call `initPano(state, { onLocation, onTime })` with:
  - `onLocation(lat, lon, label)`: does what a successful postcode lookup does. Set `state.lat`, `state.lon` and `state.postcode = label`, put `label + ': ' + formatLatLon(lat, lon)` in `#location-result`, then `setMarker` and `updateSunTimes()`.
  - `onTime(date)`: set `state.simTime = date`, pause (as `setSeason` does), set the time slider to `ukMinuteOfDay(date)`, and call `updateSunTimes()`.

**`js/horizon.js`**: in `drawHorizon`, keep drawing the sky gradient. Then, if `state.horizonPhoto` is set, `ctx.drawImage(state.horizonPhoto, 0, 0, w, h)` over the whole canvas **instead of** the green ground. Where the photo is transparent, the sky gradient shows through. The sun, arcs, ticks and labels are drawn on top as now.

**`style.css`**: `#pano-panel` gets the same spacing as the other sections. `#pano-preview { width: 100%; cursor: crosshair; }`. Add `#pano-panel button` to the `#sun-controls button` rule (and its `:focus-visible` rule) so the panel's buttons look the same.

**Done when**

- [ ] All Step 14 checks still pass.
- [ ] `node -e "import('./js/postcode.js').then(async m => console.log(await m.nearestPostcode(53.09269, -2.4185108), await m.nearestPostcode(54.0, -4.5)))"` prints `CW1 6BD null` (the second point is in the Irish Sea)
- [ ] `node -e "const fs = require('fs'), h = fs.readFileSync('index.html', 'utf8'); const ids = ['pano-panel','pano-input','pano-status','pano-preview','pano-south-btn','pano-sun-btn','pano-left','pano-right','pano-location-btn','pano-time-btn']; console.log(ids.filter(i => !h.includes('id=\"' + i + '\"')).join(',') || 'all ids', h.indexOf('vendor/exifr-lite.umd.js') > 0 && h.indexOf('vendor/exifr-lite.umd.js') < h.indexOf('js/main.js'))"` prints `all ids true`
- [ ] `node -e "const fs = require('fs'), p = fs.readFileSync('js/pano-ui.js', 'utf8'), m = fs.readFileSync('js/main.js', 'utf8'), z = fs.readFileSync('js/horizon.js', 'utf8'); console.log(/export function initPano/.test(p), /resizeWidth:\s*4096/.test(p), /reviveValues:\s*false/.test(p), /panoCropRects\(/.test(p), /southFromSun\(/.test(p), /exifLocalToDate\(/.test(p), /initPano\(\s*state/.test(m), /horizonPhoto:\s*null/.test(m), /state\.horizonPhoto/.test(z))"` prints `true true true true true true true true true`
- [ ] (browser) Open "Horizon photo" and load a DJI 360° JPEG (~38 MB). Within a few seconds the preview shows the whole panorama, the status gives its date, time and place, and the Console has no errors.
- [ ] (browser) "Use photo's location", then "Go to photo's time": the marker moves to the photo's place, the clock shows the photo's time, and the result line shows the nearest postcode.
- [ ] (browser) "Click the sun", then click the brightest part of the sky: the red S line jumps, and the status compares the two heights (for the sample DJI photo, ~13° in the photo against 12.3°). Show the horizon: the photo fills it, its skyline sits on the horizon line, and the drawn sun sits on or very near the photo's sun.
- [ ] (browser) "Set south" then a click, and the ◀/▶ buttons, move the S line and the horizon photo follows.
- [ ] (browser) Loading an ordinary (not 360°) photo shows "This doesn't look like a 360° photo." and nothing else changes.

---

## Step 16: Night, remembering the photo, and saving it

**`js/pano.js`**: add `nightAlpha(alt)` → how dark the night overlay is: `Math.min(Math.max(-alt / 12, 0), 1) * 0.8`. That is 0 while the sun is up, deepening through twilight, and 0.8 from 12° below the horizon.

**`js/horizon.js`**, when `state.horizonPhoto` is set:

- Straight after drawing the photo, fill the whole canvas with `` `rgba(6,10,31,${nightAlpha(alt)})` ``, so the photo darkens as the sun goes down.
- Draw the compass labels (NE, E, …) in white with a dark outline so they show on any photo: `ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(0,0,0,0.7)'; ctx.strokeText(...)`, then `fillText` in white. Without a photo, keep the labels as now.
- The Step 13a guide colours still follow `alt >= 0`.

**`index.html`**: add two buttons at the end of `#pano-buttons`: `<button type="button" id="pano-save-btn" disabled>Save small image</button>` and `<button type="button" id="pano-clear-btn" disabled>Remove photo</button>`.

**`js/pano-ui.js`**:

- **Remember:** after every rebuild of the strip, wait 500 ms with no further rebuild (reset a `setTimeout` each time), then save the strip to `localStorage['sunworld.horizonPhoto']` as `strip.toDataURL('image/jpeg', 0.85)`, and `localStorage['sunworld.horizonPhotoInfo']` as JSON `{ name, takenAt, lat, lon }` (the file name, `photoTime` as an ISO string or null, and the GPS or null). Wrap **every** `localStorage` read and write in `try { … } catch { … }`. If saving fails, set the status "Couldn't remember the photo (the browser's storage is full or blocked)." and carry on.
- **On startup** (inside `initPano`): if a saved strip exists, load it with `new Image()`. When it loads, draw it onto `strip`, set `state.horizonPhoto = strip`, enable Save and Remove, and set the status "Using the saved photo: <name>." A saved strip can't be re-aimed (the full photo is gone), so leave the other buttons disabled until a photo is loaded again.
- **`#pano-save-btn`**: `strip.toBlob(b => { … }, 'image/jpeg', 0.9)` to a temporary `<a download>`. The file name is `horizon-YYYY-MM-DD.jpg`, from `photoTime` in UK time (or today if there is none). Revoke the object URL afterwards.
- **`#pano-clear-btn`**: `state.horizonPhoto = null`, remove both `localStorage` keys, hide the preview, clear `#pano-input`, disable all the panel buttons, and set the status "Photo removed.".
- Enable Save and Remove whenever a strip has been built.

**Done when**

- [ ] All Step 14 and 15 checks still pass.
- [ ] `node -e "import('./js/pano.js').then(m => console.log([10, 0, -3, -6, -12, -30].map(a => m.nightAlpha(a).toFixed(2)).join(' ')))"` prints `0.00 0.00 0.20 0.40 0.80 0.80`
- [ ] `node -e "const fs = require('fs'), p = fs.readFileSync('js/pano-ui.js', 'utf8'), z = fs.readFileSync('js/horizon.js', 'utf8'), h = fs.readFileSync('index.html', 'utf8'); console.log(p.includes('sunworld.horizonPhoto'), p.includes('sunworld.horizonPhotoInfo'), /toDataURL\(\s*'image\/jpeg',\s*0\.85\s*\)/.test(p), /toBlob\(/.test(p), /try\s*\{/.test(p), z.includes('rgba(6,10,31,'), /nightAlpha\(/.test(z), /strokeText\(/.test(z), h.includes('id=\"pano-save-btn\"'), h.includes('id=\"pano-clear-btn\"'))"` prints `true true true true true true true true true true`
- [ ] (browser) With a photo loaded, press Play: after sunset the horizon photo darkens to a deep blue over about a minute of simulated twilight, with the sun-path arcs still visible, and lightens again at sunrise.
- [ ] (browser) The compass labels can be read over the photo.
- [ ] (browser) Reload the page: the photo is still in the horizon view, and the status says "Using the saved photo: …".
- [ ] (browser) "Save small image" downloads `horizon-2023-12-25.jpg` (for the sample), about 2400×800 and well under 1 MB.
- [ ] (browser) "Remove photo": the drawn sky and ground come back, and stay back after a reload.

---

## Step 17: Show more ground

The horizon view shows altitude 70° down to −10°. A photo taken from high up (a drone at 100 m or more) has its nearby landmarks well below −10°, so the user can't get their bearings. Add a **Ground** slider that sets how far below the horizon the view goes: 10° (as now) to 60°.

The view gets **taller** rather than squashed: a degree keeps the same size on screen, so the sky, sun and arcs look exactly as before and the ground is added underneath. The width stays 300°.

**`js/horizon.js`**:

- `azAltToXY(az, alt, width, height, bottom = -10)`: `y = (70 - alt) / (70 - bottom) * height`. With no fifth argument it behaves exactly as before, so the Step 5 check still passes.
- In `drawHorizon`, `const bottom = -state.groundDeg;` and pass `bottom` to **every** `azAltToXY` call. Replace `const horizonY = (70 / 80) * h;` with `const horizonY = azAltToXY(180, 0, w, h, bottom).y;`. No other `70` / `80` arithmetic may stay in the file; sunrise/sunset ticks and labels already use `horizonY`.
- The photo strip now covers 70° to −60° (see `pano.js`), so draw only its top part, down to the chosen depth:
  `ctx.drawImage(state.horizonPhoto, 0, 0, STRIP_W, stripSourceHeight(state.groundDeg), 0, 0, w, h);`

**`js/pano.js`**:

- `export const STRIP_LOW = -60;` and `export const STRIP_FULL_H = 1300;`: the strip now goes down to −60°, at the same scale as before (800 px for 80°, so 1300 px for 130°).
- `panoCropRects(meta, southU, outW, outH, bottom = -10)`: the bottom row is altitude `bottom` instead of −10°, so −10° becomes `(90 - bottom)`. With no fifth argument it behaves exactly as before, so the Step 14 checks still pass.
- `stripSourceHeight(groundDeg)` → `STRIP_FULL_H * (70 + groundDeg) / 130`: how many strip rows the view needs.

**`js/pano-ui.js`**: make the strip `STRIP_W` × `STRIP_FULL_H`, and build it with `panoCropRects(meta, southU, STRIP_W, STRIP_FULL_H, STRIP_LOW)`. The photo saved in `localStorage` is the full decoded image, so after a reload the strip is rebuilt at the new size; nothing else changes. "Save small image" now saves 2400×1300 (down to −60°).

**`index.html`**: in `#pano-panel`, straight after `<summary>`, add:

```html
<div id="ground-control">
  <label for="ground-slider">Ground</label>
  <input type="range" id="ground-slider" min="10" max="60" step="5" value="10">
  <output id="ground-display">10°</output>
</div>
```

It works with or without a photo (without one, there is simply more green ground).

**`js/main.js`**:

- Add `groundDeg: 10` to `state`.
- A function `applyGround(deg)` that:
  - sets `state.groundDeg = deg`,
  - sets the slider's value and `#ground-display` (for example `25°`),
  - sets `horizonCanvas.style.aspectRatio = '240 / ' + (70 + deg)`. At 10° that is 240 / 80 = 3 / 1, as now. Each degree is a quarter taller than it is wide, as before.
  - saves it: `try { localStorage.setItem('sunworld.groundDeg', String(deg)); } catch {}`.
- On load, call `applyGround` with the saved value if it is a number from 10 to 60 (read inside `try`), otherwise 10.
- `#ground-slider` `input` event: `applyGround(Number(slider.value))`.

**`style.css`**: `#ground-control` lays out like the time slider (label, slider ~160px, value). Remove `aspect-ratio: 3 / 1` from `#horizon` (JavaScript sets it now), but keep `width: 100%`.

**Done when**

- [ ] All earlier checks still pass, in particular Step 5's `azAltToXY` check and Step 14's `panoCropRects` checks.
- [ ] `node -e "import('./js/horizon.js').then(m => console.log(JSON.stringify([m.azAltToXY(30, 70, 1000, 400), m.azAltToXY(180, 0, 1000, 400, -40), m.azAltToXY(330, -40, 1000, 400, -40)].map(p => [p.x, +p.y.toFixed(3)]))))"` prints `[[0,0],[500,254.545],[1000,400]]`
- [ ] `node -e "import('./js/pano.js').then(m => { const r = o => JSON.stringify(o, (k, v) => typeof v === 'number' ? Math.round(v * 1000) / 1000 : v); const full = m.panoMeta({}, 4096, 2048), part = m.panoMeta({ FullPanoWidthPixels: 19490, FullPanoHeightPixels: 9745, CroppedAreaImageWidthPixels: 19490, CroppedAreaLeftPixels: 0, CroppedAreaTopPixels: 1620 }, 4096, 1367); console.log(m.STRIP_LOW, m.STRIP_FULL_H, [10, 30, 60].map(g => m.stripSourceHeight(g)).join(' ')); console.log(r(m.panoCropRects(full, 0.5, 2400, 1300, -60))); console.log(r(m.panoCropRects(part, 0.5, 2400, 1300, -60))); })"` prints:
  ```
  -60 1300 800 1000 1300
  [{"sx":341.333,"sy":227.556,"sw":3413.333,"sh":1479.111,"dx":0,"dy":0,"dw":2400,"dh":1300}]
  [{"sx":341.333,"sy":0,"sw":3413.333,"sh":1366.209,"dx":0,"dy":99.23,"dw":2400,"dh":1200.77}]
  ```
- [ ] `node -e "const fs = require('fs'), z = fs.readFileSync('js/horizon.js', 'utf8'), p = fs.readFileSync('js/pano-ui.js', 'utf8'), m = fs.readFileSync('js/main.js', 'utf8'), h = fs.readFileSync('index.html', 'utf8'), calls = [...z.matchAll(/azAltToXY\(([^()]*)\)/g)]; console.log(calls.length > 4 && calls.every(c => c[1].split(',').length === 5), /70\s*\/\s*80|\/\s*80\b/.test(z), /stripSourceHeight\(\s*state\.groundDeg\s*\)/.test(z), /panoCropRects\([^)]*STRIP_LOW\s*\)/.test(p), /STRIP_FULL_H/.test(p), /groundDeg:\s*10/.test(m), /aspectRatio/.test(m), m.includes('sunworld.groundDeg'), /id=\"ground-slider\" min=\"10\" max=\"60\" step=\"5\" value=\"10\"/.test(h))"` prints `true false true true true true true true true`
- [ ] (browser) Horizon view, no photo: moving Ground from 10° to 60° makes the view taller with more green below; the sun, the arcs and the compass labels stay in the same place relative to the horizon line, and nothing is squashed.
- [ ] (browser) With the drone photo loaded: at 40–60° the streets and buildings below the drone come into view, and the S line on the preview still matches the S label on the horizon.
- [ ] (browser) Reload: the Ground setting and the photo are both remembered, and the photo is drawn at the new depth.
- [ ] (browser) The night overlay still covers the whole (taller) view.

---

## Step 18: Night overlay, storing the photo, and saving the strip (finishing Step 16)

Do this after Step 17. Step 16 was built differently from its spec, and two of its node checks fail:

- **Night:** `drawNightOverlay` recalculates the sun's position for 240 columns every frame and invents a darkness model. The spec asked for one simple overlay using `nightAlpha`, which doesn't exist.
- **Storage:** the whole 4096×2048 decoded photo is saved (~1.8 million characters, close to the browser's ~5 MB limit), and only when "Save small image" is pressed.
- **"Save small image"** writes to `localStorage` instead of downloading a file.
- The compass labels have no outline, so they are hard to read on a photo.

### 18a. Night overlay (`js/pano.js`, `js/horizon.js`)

- Add to `pano.js`: `export function nightAlpha(alt)` → `Math.min(Math.max(-alt / 12, 0), 1) * 0.8`.
- In `horizon.js`, **delete `drawNightOverlay`** and its call. Straight after drawing the photo, do one fill over the whole canvas: `` ctx.fillStyle = `rgba(6,10,31,${nightAlpha(alt)})`; ctx.fillRect(0, 0, w, h); `` (`alt` is the sun's altitude already worked out at the top of `drawHorizon`). Remove imports that are no longer used.

### 18b. Compass labels on a photo (`js/horizon.js`)

When `state.horizonPhoto` is set, draw each compass label with a dark outline first: `ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(0,0,0,0.7)'; ctx.strokeText(l.text, px, horizonY + 14);`, then `ctx.fillStyle = '#fff'` and `fillText` as now. Without a photo, keep the labels as they are.

### 18c. Store a crop of the photo, not the whole thing (`js/pano.js`, `js/pano-ui.js`)

Store only the band the horizon can ever show: **all the way round, from 70° down to −60°** (`STRIP_LOW`), at 3024×1092. That is about 0.77 million characters, against ~1.8 million now. Because it still goes all the way round, south can be re-aimed after a reload. 3024 px for 360° gives 2520 px for the 300° strip, so the 2400 px strip is never enlarged.

**`js/pano.js`**, add:

```js
/** Size of the band kept in storage: 360° wide, from 70° down to STRIP_LOW (130°). */
export const BAND_W = 3024;
export const BAND_H = 1092;
```

- `panoBandRect(meta)` → one `{ sx, sy, sw, sh, dx, dy, dw, dh }` (or `null` if nothing is left after clipping) that copies the photo's band into a `BAND_W`×`BAND_H` canvas:
  - **Rows:** altitude 70° → −60°, so source rows `meta.fullH * 20 / 180 - meta.top` to `meta.fullH * (90 - STRIP_LOW) / 180 - meta.top`, mapped to destination rows 0 → `BAND_H`. Clip them to `0..meta.h` with the **same clipping helper** `panoCropRects` uses.
  - **Columns:** the whole image, `sx = 0`, `sw = meta.w`. Destination `dx = meta.left * k`, `dw = meta.w * k`, where `k = BAND_W / meta.fullW`.
- `bandExif()` → the GPano tags that describe the stored band, so `panoMeta` reads it back correctly:
  `{ FullPanoWidthPixels: BAND_W, FullPanoHeightPixels: BAND_W / 2, CroppedAreaImageWidthPixels: BAND_W, CroppedAreaImageHeightPixels: BAND_H, CroppedAreaLeftPixels: 0, CroppedAreaTopPixels: BAND_W / 2 * 20 / 180 }`.

**`js/pano-ui.js`**: remove `STORAGE_KEY`, `savePhoto` and `loadSavedPhoto`, and use two keys. Wrap every `localStorage` call in `try { … } catch { … }`.

- `localStorage['sunworld.horizonPhoto']`: the band as `band.toDataURL('image/jpeg', 0.85)`. It is written **once, when a new photo has been loaded from the file input**: make a `BAND_W`×`BAND_H` canvas, `drawImage(img, …)` with `panoBandRect(meta)`, then save. It is not written again when south changes, so the photo isn't re-compressed.
- `localStorage['sunworld.horizonPhotoInfo']`: JSON `{ name, southU, photoTime, exif }`. `name` is the file name, `photoTime` is an ISO string or `null`, and `exif` keeps only `latitude`, `longitude`, `DateTimeOriginal` and `OffsetTimeOriginal`. It is written after a photo is loaded and after **every** change of south (Set south, Click the sun, ◀ / ▶), 500 ms after the last change (reset a `setTimeout` each time).
- If either write fails, set the status "Couldn't remember the photo (the browser's storage is full or blocked)." and carry on.
- **On startup**, if both keys are present:
  - Load the image with `new Image()`, and use it **as it is**. Don't resize it, and don't use `decodeSmall`.
  - Set `exifData = { ...info.exif, ...bandExif() }`, `meta = panoMeta(exifData, BAND_W, BAND_H)`, `southU = info.southU` and `photoTime` from `info.photoTime`.
  - Then carry on exactly as after loading a file (preview, buttons, rebuild the strip), with the status "Using the saved photo: <name>." Re-aiming works as normal.
- **Old data:** if the Step 16 key `'sunWorldDial_pano'` exists, remove it and set the status "Please load your photo again (it was stored in an older format)."

### 18d. "Save small image" downloads the strip (`js/pano-ui.js`)

`#pano-save-btn`: `strip.toBlob(b => { … }, 'image/jpeg', 0.9)`. Inside, make an object URL, then a temporary `<a>` with `download = 'horizon-YYYY-MM-DD.jpg'`, using `photoTime`'s UK date (or today's). Click it, then revoke the URL. Status "Saved horizon-YYYY-MM-DD.jpg.". It doesn't touch `localStorage`.

### 18e. "Remove photo" (`js/pano-ui.js`)

Remove both keys (and `'sunWorldDial_pano'`), set `state.horizonPhoto = null`, clear `#pano-input`'s value, hide the preview, disable the panel's buttons and set the status "Photo removed.".

**Done when**

- [ ] All Step 14–17 checks pass, **including the two Step 16 checks that failed before**.
- [ ] `node -e "import('./js/pano.js').then(m => { const r = o => JSON.stringify(o, (k, v) => typeof v === 'number' ? Math.round(v * 1000) / 1000 : v); const full = m.panoMeta({}, 4096, 2048), part = m.panoMeta({ FullPanoWidthPixels: 19490, FullPanoHeightPixels: 9745, CroppedAreaImageWidthPixels: 19490, CroppedAreaLeftPixels: 0, CroppedAreaTopPixels: 1620 }, 4096, 1367); console.log(m.BAND_W, m.BAND_H, r(m.bandExif())); console.log(r(m.panoBandRect(full))); console.log(r(m.panoBandRect(part))); })"` prints:
  ```
  3024 1092 {"FullPanoWidthPixels":3024,"FullPanoHeightPixels":1512,"CroppedAreaImageWidthPixels":3024,"CroppedAreaImageHeightPixels":1092,"CroppedAreaLeftPixels":0,"CroppedAreaTopPixels":168}
  {"sx":0,"sy":227.556,"sw":4096,"sh":1479.111,"dx":0,"dy":0,"dw":3024,"dh":1092}
  {"sx":0,"sy":0,"sw":4096,"sh":1366.209,"dx":0,"dy":83.354,"dw":3024,"dh":1008.646}
  ```
- [ ] The stored band gives the same horizon strip as the full photo: `node -e "import('./js/pano.js').then(m => { const r = o => JSON.stringify(o, (k, v) => typeof v === 'number' ? Math.round(v * 1000) / 1000 : v); const band = m.panoMeta(m.bandExif(), m.BAND_W, m.BAND_H); console.log(r(band)); console.log(r(m.panoCropRects(band, 0.5, 2400, 1300, -60))); })"` prints:
  ```
  {"fullW":3024,"fullH":1512,"left":0,"top":168,"w":3024,"h":1092}
  [{"sx":252,"sy":0,"sw":2520,"sh":1092,"dx":0,"dy":0,"dw":2400,"dh":1300}]
  ```
- [ ] `node -e "const fs = require('fs'), p = fs.readFileSync('js/pano-ui.js', 'utf8'), z = fs.readFileSync('js/horizon.js', 'utf8'); console.log(/drawNightOverlay/.test(z), /sunAltAz\(/.test(z.replace(/const \{ alt, az \} = sunAltAz\([^)]*\);/, '')), /STORAGE_KEY|savePhoto|loadSavedPhoto/.test(p), (p.match(/toDataURL\(/g) || []).length, /panoBandRect\(/.test(p), /bandExif\(\)/.test(p), /\.download\s*=/.test(p))"` prints `false false false 1 true true true` (no per-column overlay; the sun's position is worked out once per frame; only the band is ever encoded with `toDataURL`)
- [ ] (browser) Load the DJI photo, then open DevTools → Application → Local Storage → localhost:8000. `sunworld.horizonPhoto` is about 0.8 million characters, `sunworld.horizonPhotoInfo` is small, and `sunWorldDial_pano` is gone.
- [ ] (browser) Reload: the photo comes back in the horizon view with the same south; ◀ / ▶ still re-aim it, and after another reload the new south is kept.
- [ ] (browser) Play past sunset: the whole photo darkens evenly to deep blue by the time the sun is 12° down, with no stripes, and lightens again at dawn. The compass labels stay readable.
- [ ] (browser) "Save small image" downloads `horizon-2023-12-25.jpg` (2400×1300) for the sample photo.
- [ ] (browser) "Remove photo", then reload: the drawn sky and ground are back.
