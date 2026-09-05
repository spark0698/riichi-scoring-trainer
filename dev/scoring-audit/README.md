# Scoring engine audit harness

Dev-only tooling for testing `js/scoring.js` / `js/hand-builder.js` for
correctness. Not part of the deployed app (nothing here is referenced by
`index.html`). Two complementary checks:

1. **`run.js`** - a hand-crafted regression suite. Specific, manually
   constructed edge-case hands with known-correct expected results, added one
   at a time whenever an edge-case scoring bug is found and fixed, so it
   can't silently regress.
2. **`generate.js` + `compare.py`** - cross-validation at scale against
   [`MahjongRepository/mahjong`](https://github.com/MahjongRepository/mahjong),
   a Python scoring library whose README states it's validated against
   26,148,038 real hands from tenhou.net phoenix-room replays. Used as a
   proxy oracle: generate N random hands with the app's own
   `generateValidHand()`, score them with our engine, convert to the
   reference library's tile format, score them there too, and diff.

`load-engine.js` loads `js/tile-data.js` + `js/utils.js` +
`js/hand-builder.js` + `js/scoring.js` fresh from the repo at run time (via
Node's `vm` module, since those files are plain global-scope functions with
no `module.exports`) - there's no frozen/bundled copy of the engine to go
stale, every run reflects the current state of those four files.

## Setup

**Node**: needs Node 22+ for `vm`'s module context handling. If the system
`node` is older or Windows-side, install Node 22 via `nvm` (Linux-native, if
developing under WSL):

```bash
source "$HOME/.nvm/nvm.sh" && nvm use 22
```

**Python** (only needed for the `compare.py` cross-check, not for `run.js`):

```bash
cd dev/scoring-audit
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

## Running the regression suite

```bash
node dev/scoring-audit/run.js
```

Prints each case's yaku/han/fu/points plus PASS/FAIL per assertion, and
exits non-zero if anything fails (safe to wire into CI).

## Running the N-hand comparison

```bash
cd dev/scoring-audit
source "$HOME/.nvm/nvm.sh" && nvm use 22
node generate.js 50000 .data/hands.jsonl
source venv/bin/activate
python3 compare.py .data/hands.jsonl .data/mismatches.jsonl
```

`generate.js <N> [outfile]` defaults to `N=5000` and
`.data/hands.jsonl` (gitignored). `compare.py <infile> [outfile]` defaults
the output name to `<infile>_mismatches.jsonl` alongside the input.

`compare.py` prints a summary (matched / mismatched / known rule-variant /
unrepresentable / errors) and writes **every** mismatch, error, and
unrepresentable-hand record to the output JSONL - not just a sample - each
with the complete hand record plus our engine's result and the reference
library's result (or its rejection reason), so a mismatch can be diagnosed
directly from that file without rerunning anything.

### Known, deliberate non-bugs the comparison accounts for

- **Wait-based yakuman doubling** (`Suu Ankou Tanki`, `Kokushi Musou
  Juusanmen Matchi`): the reference library doubles Suuankou/Kokushi when the
  win completes the hand via specifically a tanki/13-sided wait. Our engine
  doesn't track this distinction (always scores these at the base yakuman
  multiplier) - a deliberate, known rule-variant, not a bug. `compare.py`
  detects this by exact yaku name and excludes it from the mismatch count.
- **Physically unrepresentable hands**: the reference library's tile
  encoding reserves exactly one 136-tile-id per suit as "the red five" -
  every 5 of that suit, red or not, must map to one of only 4 ids total. Our
  generator doesn't model a shared finite wall between a hand's own tiles and
  its dora/ura indicators, so on rare occasions the combined total needed for
  one (suit, num) exceeds 4 (e.g. the hand uses all 4 copies of a suit's 5,
  and a dora indicator *also* independently lands on that suit's 5) - a
  genuine gap in the reference library's encoding, not a bug in either
  engine. These are logged to the mismatches file with the specific
  `(suit, num)` and count that overflowed, not silently dropped.

Anything else in the mismatches file is a real discrepancy worth
investigating - it might be a bug in our engine, or a bug in `compare.py`'s
tile conversion (`convert_standard`/`convert_chiitoi`/`convert_kokushi`,
`allocate_ids`) - always check the conversion first for anything involving
open melds, kans, or unusual tile encodings before assuming the engine is
wrong.
