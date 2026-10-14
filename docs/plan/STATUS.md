# Status — 2026-10-14

`~/src/qwen-sun-world-dial` is the second Qwen Code learning project, run the same way as `~/src/qwen-experiment`
(the weight converter). Claude Code plans and reviews; Qwen Code writes all the app code, one SPEC step at a time,
with the user approving every edit and committing after each step.

## Stage

Run 1 (Qwen built Steps 1–7 in one session, one commit `a44afbc`, then the solstice-button fix) is reviewed in
`REVIEW.md` and saved at tag `run-1` (commit f697fd7). All 9 node checks passed; the one bug found was fixed by Qwen.
The "(browser)" checks for Run 1 were never done.

Being set up for **Run 2: "Do all steps"**. SPEC.md has a new "Do all steps" section: Qwen builds each step, runs
its node checks (up to 3 fix attempts), commits each step itself (`git add -A`, then `git commit -m "Step N: …"`),
and carries on, ending with a re-run of every check and a summary table. GETTING-STARTED.md section 2b has the
user's side (auto-edit mode, `@SPEC.md Do all steps.`). REVIEW.md has an empty Run 2 table.

## Half-done or mid-edit

- The Run 1 app files (`index.html`, `style.css`, `js/`) still need removing to get back to the scaffold. Claude
  Code's auto-mode classifier blocked `git rm`, so the user runs it. Then commit the reset together with the SPEC,
  guide, review and settings changes.

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
- **Allow list:** started as `echo`, `node`, `ls`, `mkdir`. `rm` and `git commit` were added during Run 1 (the
  user's approvals), and `git add` for Run 2 so Qwen can commit each step. `python3` is still left out so the model
  can't start `http.server` and hang the session.
- **REVIEW.md** is the user's per-step review log. "Review step N" means: diff that step's commit against SPEC.md,
  rerun its node checks, fill in the section, and suggest a fix prompt if needed.

## Environment

- Model: `qwen_qwen3.6-27b` on LM Studio `192.168.0.149:1234` (thinking off via `reasoning_effort: "none"`,
  131,072 context since the evening of 2026-10-14 (94,976 before), MTP speculative decoding on). Configured in `~/.qwen/settings.json`; see
  `~/src/qwen-experiment/docs/plan/STATUS.md` for the server details.
- postcodes.io: `GET https://api.postcodes.io/postcodes/{pc}`, no key, CORS on. `SW1A 1AA` → 51.50101, −0.141563;
  `AB10 1AB` → 57.14959, −2.096923; unknown → 404.

## Exact next action

1. User: `git rm -r -q js index.html style.css`, then commit the reset with the doc changes.
2. Run 2: new shell → `qwen` → Shift+Tab to auto-edit → `@SPEC.md Do all steps.`
3. Afterwards, "review run 2": check each step's commit against SPEC.md, re-run the node checks, fill the Run 2
   table in REVIEW.md, and note whether it compressed (session log in
   `~/.qwen/projects/-home-colin-src-qwen-sun-world-dial/chats/`).
