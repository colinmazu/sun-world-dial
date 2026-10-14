# Status — 2026-10-14

`~/src/qwen-sun-world-dial` is the second Qwen Code learning project, run the same way as `~/src/qwen-experiment`
(the weight converter). Claude Code plans and reviews; Qwen Code writes all the app code, one SPEC step at a time,
with the user approving every edit and committing after each step.

## Stage

Qwen Code built **Steps 1–7 in one go** and committed them itself as `a44afbc` (2026-10-14, 18:13). Claude Code
reviewed that commit the same day; the findings are in `REVIEW.md`:

- All 9 `node -e` checks pass with the exact expected values. Every id and function name matches SPEC.md. Only the
  seven specified files were created.
- One bug: the Midsummer/Midwinter/Equinox buttons don't refresh `#sun-times` (`setSolsticeDate()` in `js/main.js`
  never calls `updateSunTimes()`). REVIEW.md has a one-line fix prompt for Qwen.
- Minor: the initial date uses the UTC day; clearing the date field while playing throws every frame; day length can
  read "60 m"; the globe can be stretched after a resize in horizon view.
- The "(browser)" checks have not been done yet.

## Half-done or mid-edit

- `.qwen/settings.json` is modified and uncommitted: the allow list gained `Bash(rm *)` and `Bash(git commit *)`
  during the Qwen session (likely "always allow" answers). The user hasn't decided whether to keep them.
- `REVIEW.md` and this file were updated by Claude Code after the review, not committed.

## The app

Type a UK postcode → lat/lon (postcodes.io) → a pin on a Three.js globe (north up, 0° longitude facing the camera,
globe never turns) → a not-to-scale sun orbiting at the subsolar point for a chosen date → a 2D horizon panorama
from the postcode, with sun paths and the solstice extremes.

## Decisions (made with the user, 2026-10-14)

- **Horizon view is azimuth 30°–330° (NE → S → NW), not 180°.** The user first asked for 180° looking south, but UK
  midsummer sunrise and sunset (London 49° / 311°, Aberdeen 41° / 319°) fall outside E–W; the user chose to widen it.
- **Three.js 0.170.0** from jsdelivr via an import map, over a D3 flat globe.
- **Date picker plus Midsummer/Midwinter/Equinox buttons**, so the extremes can be compared.
- **SunCalc 1.9.0 vendored** (`vendor/suncalc.js`, BSD-2, from jsdelivr) so the model doesn't hand-roll solar
  position. The subsolar point (for the globe) uses the USNO approximate formulas written out in SPEC Step 4; it
  agrees with SunCalc (the sun's altitude at the computed point is 89.8–90.0°).
- **`assets/earth.jpg`**: three.js r170 `examples/textures/planets/earth_atmos_2048.jpg` (2048×1024; not in the npm
  package, taken from raw.githubusercontent.com). Three.js's SphereGeometry puts longitude 0° at +x, so the spec
  gives `earth.rotation.y = -Math.PI / 2` explicitly to match `latLonToVector3` (lon 0 → +z).
- **`js/geo.js` is pure** (no DOM, no Three.js, no fetch) so every step has a `node -e` check. No package.json:
  Node 24 detects ES-module syntax by itself, with no warning. Checks that need SunCalc set
  `globalThis.SunCalc = require('./vendor/suncalc.js')` first.
- **Every expected number in SPEC.md was verified**: all 9 `node -e` checks were run, exactly as written, against
  a throwaway reference implementation (kept outside the repo) and print the stated values.
- **Allow list:** `echo`, `node`, `ls`, `mkdir` only. `python3` was left out (unlike qwen-experiment) so the model
  can't start `http.server` and hang the session; `rm` was left out so deletes ask.
- **REVIEW.md** is the user's per-step review log. "Review step N" means: diff that step's commit against SPEC.md,
  rerun its node checks, fill in the section, and suggest a fix prompt if needed.

## Environment

- Model: `qwen_qwen3.6-27b` on LM Studio `192.168.0.149:1234` (thinking off via `reasoning_effort: "none"`,
  131,072 context since the evening of 2026-10-14 (94,976 before), MTP speculative decoding on). Configured in `~/.qwen/settings.json`; see
  `~/src/qwen-experiment/docs/plan/STATUS.md` for the server details.
- postcodes.io: `GET https://api.postcodes.io/postcodes/{pc}`, no key, CORS on. `SW1A 1AA` → 51.50101, −0.141563;
  `AB10 1AB` → 57.14959, −2.096923; unknown → 404.

## Exact next action

1. With `python3 -m http.server 8000` running, go through the "(browser)" boxes in REVIEW.md at
   http://localhost:8000.
2. Give Qwen the fix prompt from REVIEW.md, Step 6 (`updateSunTimes()` in `setSolsticeDate()`), then commit.
3. Decide whether to keep the `rm` and `git commit` allow rules, and commit or revert `.qwen/settings.json`.
