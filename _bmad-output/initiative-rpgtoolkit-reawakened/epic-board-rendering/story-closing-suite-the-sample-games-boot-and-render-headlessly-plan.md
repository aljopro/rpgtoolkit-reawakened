---
ticket: 28
type: feature
status: done
---
# Closing suite: the sample games boot and render headlessly

## Intent

One job over the fetched corpus, both 3.1 games and the six Toolkit 2 games, that boots each through the real engine (`createEngine` in boot mode, asset requests answered from the game's own files, the engine's own plugin packs), drives it with scripted input for a fixed number of ticks, rasterises its frames through the engine's screen surface, and records state, draw-list and pixel hashes. Every PNG is filed in `golden/ledger.json` as a `regression-baseline` (no independent oracle covers a sample game). A game that cannot boot reports its located diagnostic; it never produces a blank frame.

## Scope and constraints

- G1 to G7 apply. The suite lives in `runner-harness` (pure, no I/O) and `runner-headless` (reads the fetched games, the committed baselines and writes them). `core` gains only the host seam in Engine changes below. The legacy games stay CI fixtures: nothing from them is committed except hashes and PNGs the engine itself drew.
- Hosts for the later epics are stand-ins: a one-player `sprites` owner, a presence port, a camera target (epic movement-triggers) and a saved-game port with no saved game (epic menu-party-save). They draw no sprite, so frames show the board, its images, shading, text and the UI overlay.
- Baselines are regression baselines, never `golden/reference/` (the independent-oracle set that `pnpm oracle:check` re-renders).

## Code map

- `golden/closing/plan.json`: the authored run (seed, viewport, bundled folders, batch sizes, key presses, frame ticks, the eight games with their main file and expected outcome).
- `packages/runner-harness/src/closing.ts`: boots a game once per batch size, captures frames (draw list, screen surface pixels), classifies the outcome (`boots`, `boots-with-diagnostics`, `stopped`), compares with the committed baseline, PNGs and ledger.
- `packages/runner-headless/src/closing.ts`: the `closing [--record]` command (`pnpm closing`, `pnpm closing:record`), the file loading, the compressed PNG writing (`node:zlib`; pixels, not bytes, are compared).
- `golden/regression/closing.json` and `golden/regression/closing/*.png`: the committed baselines. `golden/ledger.json` gets one `regression-baseline` row per PNG with `"suite": "closing"`; `checkSceneGoldens` and `tools/fixtures/reference/render.py` skip those rows for scene replay and only require the class, the path prefix and the file.
- `.github/workflows/ci.yml`: `golden` runs `pnpm closing`; `golden-bun` fetches the fixtures and `pnpm golden:bun` replays the closing suite under Node and Bun and diffs the logs.

## Acceptance

1. `pnpm closing` passes on the fetched fixtures with committed baselines for each of the eight games, fails when any game's frame, state hash, draw hash, pixel or diagnostic drifts, and fails on any disagreement between batch sizes 600, 30 and 7.
2. A game that cannot boot reports its located diagnostic in the baseline and the run output (a named expected failure with its epic and reason in the plan); a known failure that starts to boot fails the suite until the plan is updated.
3. The frames of the games that do boot are real: demo and Basic reach their title screen and, after two scripted key presses, their first board.
4. `golden:bun` shows identical closing logs under Node and Bun.
5. Every gate passes: install, fixtures:fetch, typecheck, lint, test:strict, golden, golden:bun, graph, licence, provenance, catalogue:check, command-docs:check, oracle:check.

## Implementation notes

Built on branch `feat/4-28`; gate results and counts are in the pull request.

### Results per game (batch sizes 600/30/7 identical, Node and Bun identical)

| Game | Dialect | Outcome | How far it runs |
| --- | --- | --- | --- |
| demo | 3.1 | boots clean | start-up program parks on its title cursor map (tick 30); two Enter presses run `intro()` and enter `boards/start.brd`; runs to tick 600 with no diagnostic |
| Basic | 3.1 | boots clean | same path through `system.prg`; first board `boards/start.brd`, tick 600, no diagnostic |
| Caoquest | TK2 | expected failure: `syntax.error` at `prg/start.prg:6` | start program does not compile, boot continues to `boards/cao's house.brd`; the board renders |
| ChimeranEmpire | TK2 | expected failure: `syntax.error` at `prg/start.prg:34` | boot continues to `boards/relic room start.brd`; the board renders |
| FinalDestiny | TK2 | expected failure: `syntax.error` at `prg/start.prg:33` | boot continues to `boards/house on grass.brd`; the board renders |
| School2Demo | TK2 | stopped before tick 1: `plugin.declined-network`, `asset.missing` (initChar `start.tem` is not in the fetched files), `syntax.error` at `prg/start.prg:33`, `startup.no-player` | no frame |
| LittleMan | TK2 | stopped before tick 1: `syntax.error` at `prg/game.prg:9`, `startup.no-player` | no frame (program-only game, no initChar) |
| BusDriver | TK2 | stopped before tick 1: `syntax.error` at `prg/rpgcodecontest.prg:31`, `startup.no-player` | no frame (program-only game, no initChar) |

### Engine changes (all found by running the games; each has a regression test)

- `arrive` started every board thread entry, including the single empty string the editor writes for "no threads" and that both 3.1 start boards carry, and reported `program.missing` for `""`. Empty entries are now ignored (docs/spec/formats/board.md already said so). Test: `engine-boot.test.ts`.
- The title screens of both 3.1 games drew nothing: the default bitmap font and the cursor-map hand are bundled under `media/`, the engine had no way to receive them, `refreshFrame` dropped the failed replay without a word, and a font name the game does not ship (`Comic Sans MS`) had no asset at all. `createEngine` now takes `bundled` (the host's `media/` files as bytes, decoded lazily and once), a text command whose font asset is unavailable draws in the default bitmap font, and a frame that cannot be replayed is the located diagnostic `render.failed`. Rule recorded in `docs/spec/engine/display-input-audio.md#reawakened-bundled-assets`. Tests: `engine-bundled.test.ts`.
- `media/cursors/tkr-hand.png` and `tkr-arrow.png` did not exist although `render/ui.ts` and the UI pack name them; they are authored here (32×32, white fill and black outline on the magenta key colour, project-owned, MIT) so the title screens can render.

## Proposed ruling (pending owner review)

**Two batch tiers, not one-tick stepping.** The suite runs every game with 600, 30 and 7 ticks per `advance` and requires the same state hash at every checkpoint and the same draw-list and pixel hashes. Evidence: an `advance` costs about 60 ms at 640×480 (the full-screen surface 0 is in the hashed state from creation: 63.6 ms against 0.33 ms at 32×32), so one tick per call over 600 ticks took 38.4 s for `demo` alone against 6.6 s for 7; `engine-boot.test.ts` already pins one-tick stepping for 30 ticks. Rejected: batch size 1 over 600 ticks, which would put about four minutes in CI and Bun for no extra coverage.

**3.1 games boot from an authored main file; Toolkit 2 games from their own.** The fetched `demo` and `Basic` trees ship no main file (they come from the source build tree), so the suite authors one with `startupPrg start.prg`, `initBoard start.brd` and `initChar start.tem`, as `engine-boot.test.ts` already does. The six Toolkit 2 games boot from their real `Main/<game>.gam`, which also proves the TK2 main reader on the real files. Rejected: authoring a main file for the TK2 games too, which would hide their real main-file results.

**A not-yet-booting game is a named expected failure, not a skip.** Each such game has `epic` and `reason` in the plan; its recorded diagnostics are part of the baseline; the suite fails if the outcome moves to `boots` (so the marker is removed on purpose) or if a stopped game reports no diagnostic. Rejected: skipping the TK2 games, which would let tk2-support finish with no gate noticing, and recording them as passing, which would claim a boot that does not happen.

**Frames at ticks 30, 120 and 600, one PNG per distinct picture.** Tick 30 is the title screen before any input; Enter presses at ticks 30, 60 and 90 carry demo and Basic through `cursorMapRun`, the `mwin` and `wait()` into the board; tick 120 is the first board; tick 600 is a later frame. A frame whose pixels equal an earlier frame of the same game keeps its hashes and points at it (`sameAs`) instead of storing a second PNG (the boards are static until epic movement-triggers). Rejected: one PNG per frame label (up to twenty-four 640×480 images, most of them identical) and a single frame (no title/first-board/later distinction).

**The closing frames are filed in the ledger with `"suite": "closing"` and PNGs under `golden/regression/closing/`.** The scene replay (`checkSceneGoldens`) and `oracle:check` skip such rows for re-rendering but still require class `regression-baseline`, the `golden/regression/closing/` prefix and the committed file. Rejected: a second ledger file, which would split the sole authority the parity checklist names, and `golden/reference/`, which `oracle:check` re-renders with the independent renderer.

**The cursor images are placeholders in the project's own hand.** Evidence: `drawCursor` draws `media/cursors/tkr-hand.png` for every cursor map, so no title screen renders without it. Rejected: skipping a missing cursor blit in the rasteriser, which would hide the missing asset behind a special case.

**Offer to the owner.** Any frame can be upgraded to a `legacy-screenshot` row (reported with the drift metric, never gating) when the owner supplies an original screenshot of that frame. None is assumed, and none is wired yet: the suite today reports no screenshot metric.

## Owner-visible findings (not fixed here; recorded in `deferred-work.md`)

- Start-up text and the message window stay over the first board (nothing clears `ui.draws` at board entry).
- A frame with no board is transparent, where the legacy screen is black.
- `font("Arial")` and its siblings resolve to keys that match no bundled Liberation file name, and the `font` built-in never calls `resolveFont`.
- The full-screen surface 0 in the hashed state makes every `advance` cost about 60 ms at 640×480.
- A start-up program that fails to compile does not stop boot (the three TK2 games with boards).
- [INFERENCE, not run] An inline-code board thread entry would report `program.missing`.

## Not touched

- Sprites and movement (epic movement-triggers), the WebGL2 replayer, audio and the TK2 dialect (epic tk2-support).
