# Review log

One section per step. Fill in after checking the step yourself, or ask Claude Code to "review step N".
"Qwen said" is what the model reported; "Checked" is what was actually verified.

Model: `qwen_qwen3.6-27b` (LM Studio, 192.168.0.149, thinking off, 94,976 context).

---

## Step 1: Page and postcode lookup

- **Commit:**
- **Qwen said:**
- **Checked:**
  - [ ] node checks (4)
  - [ ] browser: `SW1A 1AA` and `hello`
- **Problems / off-spec work:**
- **Fix prompts used:**
- **Notes:**

## Step 2: The globe

- **Commit:**
- **Qwen said:**
- **Checked:**
  - [ ] node check `latLonToVector3`
  - [ ] browser: Africa faces you, UK top-centre, drag and zoom, no auto-spin
- **Problems / off-spec work:**
- **Fix prompts used:**
- **Notes:**

## Step 3: "You are here" marker

- **Commit:**
- **Qwen said:**
- **Checked:**
  - [ ] browser: London in SE England, Aberdeen in NE Scotland, only one marker
- **Problems / off-spec work:**
- **Fix prompts used:**
- **Notes:**

## Step 4: The sun goes round the globe

- **Commit:**
- **Qwen said:**
- **Checked:**
  - [ ] node check `subsolarPoint`
  - [ ] browser: lit side, sun moves east to west, London goes dark about 21:20 BST on 21 June, seasons
- **Problems / off-spec work:**
- **Fix prompts used:**
- **Notes:**

## Step 5: The horizon view

- **Commit:**
- **Qwen said:**
- **Checked:**
  - [ ] node checks `sunAltAz`, `azAltToXY`
  - [ ] browser: rises near NE, peaks at about 62° near S, sets near NW; sky colours; toggle
- **Problems / off-spec work:**
- **Fix prompts used:**
- **Notes:**

## Step 6: Sun paths and the seasonal extremes

- **Commit:**
- **Qwen said:**
- **Checked:**
  - [ ] node check `sunEvents`
  - [ ] browser: all four solstice rise and set points in frame, Aberdeen vs London, buttons
- **Problems / off-spec work:**
- **Fix prompts used:**
- **Notes:**

## Step 7: Polish (optional)

- **Commit:**
- **Qwen said:**
- **Checked:**
  - [ ] browser: 375px width, keyboard focus, all earlier checks
- **Problems / off-spec work:**
- **Fix prompts used:**
- **Notes:**

---

## Overall

- **Steps passed first time:**
- **Biggest problems:**
- **Compared with the weight converter attempts:**
