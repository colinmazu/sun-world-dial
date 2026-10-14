# Getting started: building Sun World Dial with Qwen Code

You drive and Qwen Code writes the code, one step at a time. Claude Code wrote the plan (`SPEC.md`) and can review each step for you.

## What's in this folder

| File | Who it's for | What it does |
| --- | --- | --- |
| `QWEN.md` | Qwen Code | General coding rules. Qwen Code **loads this automatically**, so it deliberately says nothing about the build plan. Otherwise the model treats every message as "carry on building". |
| `SPEC.md` | Qwen Code (and you) | The build plan, split into Steps 1–7. Each step lists exact files, ids and function names, and ends with a "Done when" checklist. The model only sees it when you attach it with `@SPEC.md`. |
| `REVIEW.md` | You | The review log: one section per step, filled in after you (or Claude) have checked it. |
| `.qwen/settings.json` | Qwen Code | Safeguards (see below). |
| `vendor/suncalc.js` | The app | SunCalc 1.9.0: sun position, sunrise and sunset. Already here, so the model doesn't have to invent astronomy. |
| `assets/earth.jpg` | The app | The Earth map for the globe. |
| `docs/plan/STATUS.md` | Claude Code | Handoff notes between sessions. |

Qwen Code will write `index.html`, `style.css` and `js/*.js`.

### The safeguards in `.qwen/settings.json`

These are the same as in `qwen-experiment`, with a tighter allow list:

- `tools.approvalMode: "auto-edit"`: edits files without asking (set for whole-project runs); commands not on the allow list still ask. Press Shift+Tab to switch to `default` if you want to approve each edit.
- `permissions.deny`: removes 66 tools this project doesn't need, which keeps the prompt to about 5k tokens.
- `permissions.allow`: `echo`, `node`, `ls`, `mkdir`, `rm`, `git add` and `git commit` run without asking. `node` lets the model run the spec's checks itself, and `git add`/`git commit` let it commit each step in a whole-project run. `rm` was added during Run 1, so deletes no longer ask. `python3` is deliberately **not** allowed, so the model can't start a web server that would hang the session.
- `memory.enableManagedAutoMemory: false`: stops it saving "Step 3 done" notes and acting on them later.

**Your job:** read every approval prompt and say **No** when it isn't what you asked for. Check results in the browser yourself rather than trusting "Step 2 is complete".

## 1. Two terminals

**Terminal A, the web server** (leave it running):

```bash
cd ~/src/qwen-sun-world-dial
python3 -m http.server 8000
```

Then open http://localhost:8000. The page must be served this way; opening `index.html` directly (`file://`) won't load the modules or the Earth image. Until Step 1 is done there is no page to see, only a file listing.

**Terminal B, Qwen Code** (start it from a new shell so the `GIT_EDITOR=true` alias applies):

```bash
cd ~/src/qwen-sun-world-dial
qwen
```

`/model` should show "Qwen3.6 27B (LM Studio @ 192.168.0.149)". Run only one `qwen` at a time, because the server answers one request at a time.

## 2. The loop, for each step

1. In Qwen Code: `@SPEC.md Do Step 1 only.`
2. Read each proposed edit and approve or reject it. When it finishes, it should run the `node` checks and report the "Done when" list.
3. Check it yourself: reload the browser (Ctrl+Shift+R, to skip the cache) and try the "(browser)" items. Open devtools (F12) and look at the Console for red errors.
4. If it's wrong, tell it specifically, e.g. *"The globe is dark. Check the texture path in globe.js."* Don't say "fix it".
5. When happy, commit:

   ```bash
   git add -A && git commit -m "Step 1: page and postcode lookup"
   ```

6. Type `/clear` in Qwen Code before the next step.

| Step | Prompt | What you'll see |
| --- | --- | --- |
| 1 | `@SPEC.md Do Step 1 only.` | Postcode form; `SW1A 1AA` → `51.5010° N, 0.1416° W` |
| 2 | `@SPEC.md Do Step 2 only.` | Textured 3D globe, Africa facing you, draggable |
| 3 | `@SPEC.md Do Step 3 only.` | Red pin on your postcode |
| 4 | `@SPEC.md Do Step 4 only.` | Sun going round, day/night, date, Play, clock |
| 5 | `@SPEC.md Do Step 5 only.` | Horizon view with the sun rising and setting |
| 6 | `@SPEC.md Do Step 6 only.` | Sun-path arcs, solstice buttons, sunrise/sunset times |
| 7 | `@SPEC.md Do Step 7 only.` | Polish (optional) |

Step 4 is the biggest. If it struggles, split it: *"Do only the `subsolarPoint` part of Step 4"*, then *"Now do the rest of Step 4."*

## 2b. Or: the whole project in one go

Qwen builds Steps 1–7 by itself, running each step's checks, fixing what fails, and committing each step before going on. You watch, then check the result.

1. Start from the clean scaffold (no `index.html` or `js/` yet), with the server running in Terminal A.
2. Start `qwen` from a new shell and press **Shift+Tab** until the mode reads **auto-edit**, so it edits files without asking each time. Shell commands not on the allow list still ask.
3. Type: `@SPEC.md Do all steps.`
4. When it finishes, it re-runs every check and prints a table with each step's commit. Then do the browser checks yourself.

Each step is still its own commit, so `git log` shows the history and any step can be inspected or undone. A run like this used about 62k tokens of context; Qwen Code compresses at about 98k, so it should finish without compressing.

### Starting a fresh run

Save the finished run under a tag, then remove just the app files. This keeps the spec, the guides and `REVIEW.md` (with its reviews) as they are:

```bash
git tag run-4                               # use the next free number
git rm -r -q js index.html style.css
git commit -m "Reset for run 5"
```

Don't use `git reset --hard` to an old commit for this: it also rolls back `REVIEW.md` and any guide changes made since.

## 3. Reviews with Claude Code

After committing a step, open Claude Code in this folder and say **"review step N"**. Claude will:

- diff that step's commit against `SPEC.md` (ids, function names, files it shouldn't have touched),
- run the `node` checks itself and compare the numbers,
- write the result into `REVIEW.md`, including anything Qwen claimed but didn't do,
- and, if something needs fixing, suggest a short prompt to paste into Qwen.

You can also fill in `REVIEW.md` yourself. It's your record of how the model did.

## 4. When things go wrong

- **It did more than one step:** reject the edits, or `git checkout -- .` (this discards every uncommitted change, and does not remove new files; `git clean -n` lists them). Then: *"Only do Step N."*
- **Blank page or nothing happens:** the browser Console (F12) almost always says why. Paste the red error into Qwen.
- **To undo a whole step:** `git reset --hard HEAD` returns to the last commit.
- **To understand the code:** switch to `plan` mode (Shift+Tab) and ask *"Explain how globe.js positions the sun."*

## 5. Keeping it running smoothly

The model has a context of 131,072 tokens. Qwen Code compresses the conversation automatically at about 98k (it keeps 33k in reserve). Qwen Code's own instructions take about 5k, and `SPEC.md` about 5k. **Run `/clear` between steps**: each step only needs `QWEN.md` and `@SPEC.md`, not the last conversation. `/stats` shows the tokens used so far.
