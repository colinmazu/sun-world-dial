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

## Overall (Run 1)

- **Steps passed first time:** all node checks for Steps 1–6 passed on the first run, and the code matches the spec's
  names and structure throughout. Browser checks are still to do.
- **Biggest problems:** one real bug (the solstice buttons leave `#sun-times` stale) and a few edge cases. Process:
  all seven steps went into one commit, so there's no per-step history, and two allow rules widened (`rm`,
  `git commit`).
- **Compared with the weight converter attempts:** no extra files and no off-spec features, unlike `attempt-1` of the
  weight converter. A much more detailed spec, with exact names and verified numbers, may be part of why.

---

## Run 2: "Do all steps" in one go (tag `run-2`, not reviewed yet)

- **Started from:** the clean scaffold, after `run-1` was tagged
- **Approval mode:**
- **Compressed?** (and at what point)
- **Total time:**

| Step | Commit | Node checks | Browser checks | Problems |
| --- | --- | --- | --- | --- |
| 1 Page and postcode lookup | | | | |
| 2 Globe | | | | |
| 3 Marker | | | | |
| 4 Sun round the globe | | | | |
| 5 Horizon view | | | | |
| 6 Sun paths and extremes | | | | |
| 7 Polish | | | | |

- **Did its final summary match reality?**
- **Compared with Run 1:**

---

## Run 3: "Do all steps" in one go (reviewed by Claude Code, 2026-10-14)

- **Tag:** `run-3` (commits `30ddb80`..`02d16ba`, on top of scaffold `2ec75af`)
- **Prompt:** one message, "do all steps", at 19:06:45 BST. **No other input.**
- **Approval mode:** auto-edit. The Step 1 commit also carries the `.qwen/settings.json` switch to `auto-edit`,
  swept in by `git add -A`.
- **Stats:** 66 requests, 6 min 25 s, 20.2k output tokens, peak prompt 50.6k of 131k. **No compression.**
  27 shell commands, 26 edits, 12 file writes, 5 reads. One edit failed (old and new text identical) and was skipped
  harmlessly. About 1.5p of electricity.
- **Process:** followed the "Do all steps" loop: checks after each step, one commit per step, and every check re-run
  at the end with a summary table. It used `git add -A && git commit` as one command, not two as the spec asks;
  harmless.
- **Node checks:** all 9 pass with the exact expected values (re-run by Claude).

| Step | Commit | Node checks | Code review | Problems |
| --- | --- | --- | --- | --- |
| 1 Page and postcode lookup | `30ddb80` | 4/4 | matches spec | network error message only matches browsers whose error text contains "fetch" (Safari says "Load failed") |
| 2 Globe | `5e5e2d8` | 1/1 | matches spec | – |
| 3 Marker | `ce863ff` | n/a | matches spec | – |
| 4 Sun round the globe | `a660bb3` | 1/1 | **bug** | `subsolarPoint` divides seconds by **360** instead of 3600; date field sets 12:00 UTC, not 00:00 UK |
| 5 Horizon view | `6005b44` | 2/2 | **bug** | view toggle can't hide anything (CSS `display: block` beats `hidden`) |
| 6 Paths and extremes | `831546e` | 1/1 | **incomplete** | sunrise/sunset ticks with times missing; `#sun-times` doesn't refresh on a new postcode the same day; buttons use 12:00 UTC, not 12:00 UK |
| 7 Polish | `02d16ba` | re-ran all | mostly | any exception (e.g. clearing the date field) stops the animation loop for good |

### The bugs in detail

1. **Sun jitter on the globe (Step 4).** `js/geo.js` line 51: `date.getUTCSeconds() / 360`. Verified: at 12:00:59
   UTC the subsolar longitude comes out as −2.00° instead of +0.21°, so while playing, the sun wobbles by up to ~2.5°
   every simulated minute. The spec's checks all use `:00` seconds, so they couldn't catch it. Runs 1 and 2 got this
   line right.
2. **View toggle doesn't hide (Step 5).** `style.css` gives `#globe` and `#horizon` `display: block`. An id rule
   beats the browser's `[hidden] { display: none }`, so both stay on the page. "Show horizon" draws the canvas under
   the globe instead of swapping, and the blank canvas takes space from the start.
3. **Missing rise/set ticks (Step 6).** The spec asks for a tick at today's sunrise and sunset azimuths, with the UK
   time, on the horizon line. `drawHorizon` has no such code.
4. **Stale `#sun-times` (Step 6).** `updateSunTimes()` only runs when the UK day changes, so a second postcode on
   the same day keeps showing the first location's times.
5. **Loop dies on any error (Step 7 robustness).** `requestAnimationFrame(frame)` is the last line of `frame()`, so
   one exception (an empty date field gives an Invalid Date) stops the globe, horizon and clock until reload. Run 1
   scheduled the next frame first, which avoided this.

Smaller things: dead code in `sunPath` (`noonLocal`, `ukTimeStr` unused, the UK offset worked out 144 times);
`drawHorizon` calls `sunPath` five times per frame (about 720 SunCalc calls), which works but is wasteful.

### Fix prompts (one at a time, then commit)

> In js/geo.js subsolarPoint, getUTCSeconds() is divided by 360. It must be 3600. Change nothing else.

> In style.css, `display: block` on #globe and #horizon overrides the `hidden` attribute, so the view toggle hides
> nothing. Add `#globe[hidden], #horizon[hidden] { display: none; }`. Change nothing else.

> SPEC.md Step 6 asks drawHorizon to draw a short tick on the horizon line at today's sunrise and sunset azimuths,
> with the UK time above each. That part is missing. Add it using sunEvents. Change nothing else.

> In js/main.js, #sun-times only refreshes when the day changes. Also refresh it after a successful postcode lookup
> (reset lastSunTimesDay there). Change nothing else.

### Browser checks

- [ ] not done yet (expect bug 2 to show straight away when pressing "Show horizon")

### Compared with Run 1

All checks passed in both, and there were no extra files in either. Run 1 (step by step in one session, compressed
once) had one bug and full Step 6 features. Run 3 (fully autonomous, no compression, ~6 minutes) has two real bugs
and one missing feature. The checks it could run all passed, and the bugs are in exactly the places the checks don't
reach. That suggests that, with the leash off, the model treats "checks pass" as "done".
