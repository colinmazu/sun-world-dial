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

Already provided. Do not edit them:

- `vendor/suncalc.js`: the SunCalc library. Loaded as a normal script, it sets `window.SunCalc`.
- `assets/earth.jpg`: a 2048×1024 Earth map. Longitude −180° is at the left edge, 0° in the middle and north at the top.

Libraries: **Three.js 0.170.0** from the CDN through the import map in Step 2, and SunCalc. Nothing else, no npm and no build tools.

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

**Done when**

- [ ] `node -e "import('./js/geo.js').then(m => console.log(m.normalisePostcode(' sw1a1aa '), m.normalisePostcode('ab10 1ab'), m.normalisePostcode('hello')))"` prints `SW1A 1AA AB10 1AB null`
- [ ] `node -e "import('./js/geo.js').then(m => console.log(m.formatLatLon(51.50101, -0.141563)))"` prints `51.5010° N, 0.1416° W`
- [ ] `node -e "import('./js/postcode.js').then(m => m.lookupPostcode('SW1A 1AA')).then(console.log)"` prints lat ≈ 51.501 and lon ≈ −0.1416
- [ ] `node -e "import('./js/postcode.js').then(m => m.lookupPostcode('ZZ9 9ZZ')).catch(e => console.log(e.message))"` prints `Postcode not found`
- [ ] (browser) `sw1a1aa` shows `SW1A 1AA: 51.5010° N, 0.1416° W`, and `hello` shows the "doesn't look like" message.

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

**`index.html`**: between `#location-result` and `#views`, add `<section id="sun-controls">` with:

- a date input `id="date-input"` (label "Date"),
- a button `id="play-btn"` with the text "Play",
- a select `id="speed-select"` (label "Speed") with options `12000` "1 day in 12 s", `24000` "1 day in 24 s" (selected) and `60000` "1 day in 60 s",
- `<p id="sim-clock" aria-live="off"></p>`.

**`js/main.js`**

- Run one `requestAnimationFrame` loop. Each frame, if `state.playing`, add `elapsedMs * 86400000 / state.dayMs` to `state.simTime`. Then call `updateGlobe(state)` and update `#sim-clock`.
- `#sim-clock` shows the simulated time in UK time using `Intl.DateTimeFormat("en-GB", { timeZone: "Europe/London", weekday: "short", day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", timeZoneName: "short" })`, e.g. `Sun 21 Jun 2026, 21:22 BST`.
- `#play-btn` toggles `state.playing` and its text between "Play" and "Pause".
- `#speed-select` sets `state.dayMs`.
- Changing `#date-input` sets `state.simTime` to 00:00 UK time on that date. `#date-input` starts on today and follows `state.simTime` when the simulated day changes.

**Done when**

- [ ] `node -e "import('./js/geo.js').then(m => ['2026-06-21T12:00:00Z','2026-12-21T12:00:00Z','2026-06-21T18:00:00Z'].forEach(s => { const p = m.subsolarPoint(new Date(s)); console.log(s, p.lat.toFixed(2), p.lon.toFixed(2)); }))"` prints:
  `23.44 0.46` · `-23.43 -0.48` · `23.43 -89.53` (each ±0.05)
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

**`style.css`**: `#horizon` is full width with `aspect-ratio: 3 / 1`.

**`js/main.js`**

- `#view-toggle` switches which of `#globe` and `#horizon` is `hidden`. Its text is "Show horizon" or "Show globe".
- Each frame, if the horizon is visible, call `drawHorizon`, using the same `state.simTime` as the globe.

**Done when**

- [ ] `node -e "globalThis.SunCalc = require('./vendor/suncalc.js'); import('./js/geo.js').then(m => { const p = m.sunAltAz(new Date('2026-06-21T12:00:00Z'), 51.50101, -0.141563); console.log(p.alt.toFixed(2), p.az.toFixed(2)); })"` prints `61.93 178.75` (±0.05)
- [ ] `node -e "import('./js/horizon.js').then(m => console.log(JSON.stringify([m.azAltToXY(30,70,1000,400), m.azAltToXY(180,0,1000,400), m.azAltToXY(330,-10,1000,400)])))"` prints `[{"x":0,"y":0},{"x":500,"y":350},{"x":1000,"y":400}]`
- [ ] (browser) With `SW1A 1AA` on 21 June, Play: the sun rises on the left near NE, peaks just right of S at about 62° (well up the canvas), and sets near NW. The sky goes through night, twilight and day.
- [ ] (browser) The toggle switches views, and the clock keeps running in both.

---

## Step 6: Sun paths and the seasonal extremes

**`js/geo.js`**: add and export:

- `sunEvents(date, lat, lon)`. Call `SunCalc.getTimes` with a Date at **12:00 UTC** on `date`'s UK calendar day; a time near midnight can pick the wrong day. Return `{ sunrise, sunset, sunriseAz, sunsetAz }`. The azimuths come from `sunAltAz` at those times.
- `sunPath(date, lat, lon)`: every 10 minutes from 00:00 to 24:00 UK time on `date`'s day, return `{ az, alt }` points (from `sunAltAz`) where `alt > -10`.

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
