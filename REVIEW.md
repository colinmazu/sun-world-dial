# Review log

One section per step. Fill in after checking the step yourself, or ask Claude Code to "review step N".
"Qwen said" is what the model reported; "Checked" is what was actually verified.

Model: `qwen_qwen3.6-27b` (LM Studio, 192.168.0.149, thinking off; 94,976 context for Run 1, 131,072 from 2026-10-14 evening).

---

## Run 1: Steps 1–7 in one go (reviewed by Claude Code, 2026-10-14)

- **Commit:** `a44afbc` "Implement Sun World Dial Steps 1–7". Qwen ran `git commit` itself. One commit for all seven
  steps, so there is no per-step history to diff; the sections below all refer to this commit.
- **Files:** exactly the seven the spec lists (`index.html`, `style.css`, `js/geo.js`, `js/postcode.js`, `js/globe.js`,
  `js/horizon.js`, `js/main.js`). No extra files, and `vendor/` and `assets/` untouched.
- **Settings drift (uncommitted):** `.qwen/settings.json` gained `Bash(rm *)` and `Bash(git commit *)` in the allow
  list during the session, presumably from "always allow" answers. Both run without asking from now on.
- **Checked by Claude:** all 9 `node -e` checks in SPEC.md, run exactly as written; all print the expected values.
  Every element id and exported function name matches the spec. Code read in full against each step.
- **Not yet checked:** the "(browser)" items. Those need you at http://localhost:8000.

## Step 1: Page and postcode lookup

- **Checked:**
  - [x] node checks (4): `SW1A 1AA AB10 1AB null`, `51.5010° N, 0.1416° W`, lookup → 51.50101 / −0.141563,
    `Postcode not found`
  - [ ] browser: `SW1A 1AA` and `hello`
- **Problems / off-spec work:** none. `lookupPostcode` already includes Step 7's "Couldn't reach the postcode
  service." message.
- **Notes:** the button is disabled during the lookup and re-enabled in `finally`, as specified.

## Step 2: The globe

- **Checked:**
  - [x] node check `latLonToVector3`: all four rows exact
  - [x] code: import map verbatim, `earth.rotation.y = -Math.PI / 2`, sRGB texture, no pan, damping, zoom 1.5–6, no
    auto-rotate
  - [ ] browser: Africa faces you, UK top-centre, drag and zoom, no auto-spin
- **Problems / off-spec work:** none.
- **Notes (minor):** the resize handler reads the container's size even when `#globe` is hidden (horizon view
  showing). Resizing the window in horizon view, then switching back, can leave the globe stretched until the next
  resize.

## Step 3: "You are here" marker

- **Checked:**
  - [x] code: dot at r 1.01, line from 1.0 to 1.15, group added to the scene (not `earth`), old marker removed first
  - [ ] browser: London in SE England, Aberdeen in NE Scotland, only one marker
- **Problems / off-spec work:** none.

## Step 4: The sun goes round the globe

- **Checked:**
  - [x] node check `subsolarPoint`: `23.44 0.46`, `-23.43 -0.48`, `23.43 -89.53`
  - [x] code: ambient 0.15, directional light 3, sun sphere and light at radius 3, clock formatter as specified
  - [ ] browser: lit side, sun moves east to west, London goes dark about 21:20 BST on 21 June, seasons
- **Problems / off-spec work:**
  - Minor: on load, `#date-input` is set from the **UTC** date (`toISOString`), so between 00:00 and 01:00 BST it
    shows yesterday.
  - Minor: if the date field is cleared while playing, the loop throws on every frame (`RangeError` from an Invalid
    Date), and the globe and clock stop updating until a date is picked.

## Step 5: The horizon view

- **Checked:**
  - [x] node checks: `sunAltAz` → `61.93 178.75`; `azAltToXY` → exact JSON
  - [x] code: 30°–330° mapping, sky colours per band as specified, ground colour, seven labels, sun only if alt > −10
  - [ ] browser: rises near NE, peaks at about 62° near S, sets near NW; sky colours; toggle
- **Problems / off-spec work:** none.

## Step 6: Sun paths and the seasonal extremes

- **Checked:**
  - [x] node check `sunEvents`: `04:44 49.1 21:22 311.3` and `08:05 128.6 15:54 231.8`
  - [x] code: `sunEvents` uses 12:00 UTC on the UK day; `sunPath` every 10 min from UK midnight; dashed 35% solstice
    arcs labelled at their peaks; solid 2 px current path; rise and set ticks with UK times
  - [ ] browser: all four solstice rise and set points in frame, Aberdeen vs London, buttons
- **Problems / off-spec work:**
  - **Bug: the Midsummer/Midwinter/Equinox buttons don't update `#sun-times`.** `setSolsticeDate()` in `js/main.js`
    changes `state.simTime` and the date field but never calls `updateSunTimes()`. Since the buttons also pause, the
    text keeps showing the old day's sunrise and sunset until you press Play or change the date. The horizon view is
    fine, because it redraws every frame.
  - Minor: day length rounds the minutes, so it can read e.g. `16 h 60 m`.
- **Fix prompt used:**
  > In js/main.js, setSolsticeDate() doesn't refresh #sun-times. Call updateSunTimes() at the end of it. Change
  > nothing else.
- **Fixed:** Qwen added exactly that one line (`updateSunTimes();` at the end of `setSolsticeDate()`), nothing else.
  Committed with this review as the `run-1` tag.

## Step 7: Polish (optional)

- **Checked:**
  - [x] code: 600px breakpoint, `:focus-visible` outlines, damping off under `prefers-reduced-motion`, friendly
    network error, every input labelled
  - [ ] browser: 375px width, keyboard focus, all earlier checks
- **Problems / off-spec work:** the `--reduced-motion` CSS variable in `style.css` is never used (harmless).

---

## Overall

- **Steps passed first time:** all node checks for Steps 1–6 passed on the first run, and the code matches the spec's
  names and structure throughout. Browser checks are still to do.
- **Biggest problems:** one real bug (the solstice buttons leave `#sun-times` stale) and a few edge cases. Process:
  all seven steps went into one commit, so there's no per-step history, and two allow rules widened (`rm`,
  `git commit`).
- **Compared with the weight converter attempts:** no extra files and no off-spec features, unlike `attempt-1` of the
  weight converter. A much more detailed spec, with exact names and verified numbers, may be part of why.
