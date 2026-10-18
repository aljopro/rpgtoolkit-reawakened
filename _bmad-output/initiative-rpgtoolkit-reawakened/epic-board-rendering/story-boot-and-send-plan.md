---
title: 'Boot and send'
type: feature
ticket: 20
created: '2026-10-17'
status: built
baseline_revision: 'b5d59593'
route: full
route_source: pinned
risk: high
review: quick
review_source: pinned
lenses_ran: [quick]
review_loop_iteration: 0
context:
  - 'CLAUDE.md'
  - 'docs/guardrails.md'
  - 'docs/spec/engine/main-loop-and-startup.md#e-02'
  - 'docs/spec/engine/main-loop-and-startup.md#reawakened-startup-ports'
  - 'docs/spec/engine/main-loop-and-startup.md#reawakened-boot-sequence'
  - 'docs/spec/engine/main-loop-and-startup.md#reawakened-board-entry'
  - 'docs/spec/engine/movement-and-collision.md#e-19'
  - 'docs/spec/engine/movement-and-collision.md#e-47'
  - 'docs/spec/engine/movement-and-collision.md#reawakened-send-board'
  - 'docs/spec/engine/display-input-audio.md#reawakened-audio-effect-records'
  - '_bmad-output/initiative-rpgtoolkit-reawakened/architecture-rpgtoolkit-reawakened/architecture-rpgtoolkit-reawakened.md'
  - '_bmad-output/initiative-rpgtoolkit-reawakened/epic-board-rendering/epic-board-rendering.md'
  - '_bmad-output/initiative-rpgtoolkit-reawakened/epic-board-rendering/story-presentation-lifecycle-audio-cue-rulings-plan.md'
  - '_bmad-output/initiative-rpgtoolkit-reawakened/epic-board-rendering/story-engine-loop-phases-catch-up-the-input-section-waits-focus-pa-plan.md'
---

<frozen-after-approval reason="delegated approval; build follows plan checkpoint">

## Intent

Make the engine run a game. `createEngine` gains a boot mode that runs E-02 from a main file through AD-14 asset requests (fonts, plugin manifest, first player, the start-up program as the blocking thread, the no-player check, `initBoard` unless a saved game was restored, board threads, enter program and board music), and `send` moves between boards with the E-19 steps and an unsmoothed camera re-align. Reset, quit and the other lifecycle names stay with entry 4.31; program test mode stays with the editor epics (R-60).

## Evidence policy

Every ruling below cites the normative spec, an architecture decision or merged code, and names the rejected alternative. The behaviour source is `docs/spec` only (G7). The doc-first commit `da689175` writes the three rule blocks (`#reawakened-boot-sequence`, `#reawakened-board-entry`, `#reawakened-send-board`) before any code.

## Key rulings

### R-1 Boot is a plain-data stage machine inside `advance`

**Proposed ruling (pending owner review):** `EngineInit` is a union. Scene mode (`initialBoard`, optional `program`) is the existing tracer and golden path and is unchanged, so no golden moves (G5). Boot mode (`mainFile` plus the `startup` ports) runs the stages `main` → `assets` → `startup` → `board` → `running` (or `stopped`), stored in `state.engine.boot`. `advance` calls one `drive()` before the tick loop and after every tick; `drive()` performs every engine step that needs no tick and stops when it needs a host reply or a tick. Time stays frozen while any request is outstanding (4.5's loading rule), and the stage plus the requests are part of the state hash. **Evidence:** E-02, AD-14/AD-17 (asset replies are the only host path), AD-26 (the loop owns phases), 4.19's `loading` invariant. **Rejected:** a second `bootEngine` entry point with its own loop (duplicates the phase list and the breakpoint cursor), and an async/await boot (G1/G2).

### R-2 The first player is an effect, presence and saved games are ports

**Proposed ruling (pending owner review):** step 6 posts one `sprites` effect `createplayer(<Chrs asset key>)` through `postEffect`; a registered owner applies it and, until one registers, it waits in 4.1's bounded pending queue. Step 8 calls `PlayerPresencePort.hasPlayer()` and, when false, stops the engine with `startup.no-player` ("an initial character must be defined"). Step 9 calls `SavedGamePort.restored()`; true skips `initBoard` and board entry. The ports live in `ports/startup.ts` and boot requires both. **Evidence:** the ticket text names an effect for the first player and ports for the other two; A-13 makes `postEffect` the one dispatch route; `InitialPlayerPort.createFromInitChar` is then the contract of that effect's applier. The added `restored()` method is the smallest way for the engine to learn step 9's outcome (the spec fixes `load` only). **Rejected:** a synchronous `InitialPlayerPort` call (the port would need the engine's `GameState` to make the player visible to hashes and saves), and a default presence port that always answers yes (hides a missing owner).

### R-3 All `Prg/` sources are fetched at boot

**Proposed ruling (pending owner review):** with the fonts, boot requests every file under `Prg/`, so `run`, `thread`, includes, board threads, the enter program and the start-up program resolve synchronously from `cache` through a `ProgramLoader` (the script runtime has no asynchronous program load). **Evidence:** `core/script/loader.ts` reads bytes through a synchronous `read` port; `vm.ts` only runs a file program the loader can read. **Rejected:** requesting a program on first use with a wait (needs a VM change that belongs to epic rpgcode-vm) and prefetching only the start-up program's include closure (a later `run("x.prg")` would raise `program.missing`).

### R-4 Board entry order and the enter-program thread kind

**Proposed ruling (pending owner review):** arrival kills the old board's `board` threads (send only), installs the board, posts `sprites` `placeplayer(x, y, layer, unit)`, re-aligns the camera with `realignCamera` on the player (the `CameraTarget` port) or on the destination, posts `triggers` `deactivateat(x, y, layer, unit)`, posts the board music, starts the board's threads in board order, then the enter program. The enter program is the `blocking` thread when none is live and a `board` thread when the arrival comes from a program that is itself the blocking thread. **Evidence:** E-19 and E-47 give this order; AD-26 allows one blocking thread and `startThread` refuses a second (`thread.blocking-exists`); a blocking enter program keeps Idle input and triggers suspended at boot. **Rejected:** always `board` (the player could walk during a boot-time cut-scene) and nesting a second blocking thread (violates AD-26).

### R-5 Units: boot places in pixels, `send` in tiles

**Proposed ruling (pending owner review):** the placement effects carry an explicit `unit` (`"pixel"` from the board start at boot, `"tile"` for `send`) and leave the conversion to the sprites owner; the engine converts only to aim the camera when no player position exists (tile centre, 32 px tiles). `send` x and y are one-based tile coordinates and a layer below 1 means layer 1. **Evidence:** `board.md` row 73 stores the start in pixels; the corpus calls `send("Town 1.brd", 4, 11, 1)`, `send("temple.brd", 25, 23)` and once `send("House 1.brd", 4, 2, 0)` (175 files call `send`), which are tile coordinates and a zero layer; `put` and `getBoardTile` are one-based. **Rejected:** forcing pixels (nothing in the corpus does) and a hidden conversion in the engine (the reference point of a sprite is the sprites owner's).

### R-6 `send` parks the caller for one tick and the swap happens between ticks

**Proposed ruling (pending owner review):** `send` records one `engine` effect and returns a global one-tick `sleep` wait; the engine performs the swap after the tick, freezing time while the board and its tiles load, so the caller resumes at the start of the next tick on the new board. A second `send` in the same tick replaces the first; an unresolvable name is a located `asset.missing` diagnostic and the request is dropped. **Evidence:** a script cannot wait on a file (AD-17) and the catalogue lists no wait for `send`, so the shortest legal yield is one tick; E-19's observable result (the next statement runs on the new board) holds. **Rejected:** applying the swap inside the thread step (asset replies cannot arrive mid-instruction), and a request-kind wait (the reply would be the engine's own board load, not a host answer the VM can store).

### R-7 Board music is an `audio` effect with one remembered asset

**Proposed ruling (pending owner review):** board entry posts `audio` `music.play(asset, true, null, boardKey)` when the board names music that resolves and differs from `engine.musicAsset`; a board with no music or the same file posts nothing. **Evidence:** E-16 and `#reawakened-audio-effect-records` (4.29 A-1). **Rejected:** constructing an `AudioCue` (audio-synth owns `cueId`).

### R-8 Compile errors are diagnostics, not throws

**Proposed ruling (pending owner review):** every program boot starts (start-up, board threads, enter program) is compiled first; a missing, pre-compiled or syntactically wrong program becomes a located diagnostic and no thread. **Evidence:** the TK2-dialect `start.prg` of four sample games raises `syntax.error` from `ensureCurrentProgram` and escaped `advance` before this guard; TK2 selection belongs to epic tk2-support. **Rejected:** letting `advance` throw.

## Implementation map

- `docs/spec/engine/main-loop-and-startup.md`, `movement-and-collision.md`, `rpgcode-functions.md`: the doc-first rule blocks and the `send` row note.
- `packages/core/src/ports/startup.ts`: `PlayerPresencePort`, `SavedGamePort`, `SavePath`, `LoadResult`, `StartupPorts`.
- `packages/core/src/save/sections/engine.ts`: `boot`, `transition`, `musicAsset`, the wider request kinds.
- `packages/core/src/engine/boot.ts`: font and program key discovery, the main-file plugin manifest, manifest resolution and the engine-posted effect shape.
- `packages/core/src/engine/engine.ts`: the union `EngineInit`, `drive()`, the stage machine, `send` transition, board arrival and the program guard.
- `packages/core/src/script/packs/world.ts`: the real `send` built-in with its `BuiltinDoc` (ADR 0004); `catalogue-responders.ts` loses its placeholder row; `tools/command-docs/legacy-allowlist.json` loses `catalogue/send`.
- `packages/core/test/engine-boot.test.ts`: the acceptance tests below.

## Acceptance mapping

1. A scripted game boots from `start.prg` to a first board with the expected world, vm and camera state, the board-music record present and one state hash for any tick batching.
2. A game with no player stops with `startup.no-player` and loads no board.
3. `send` leaves the ruled state: old board threads dead, a persistent thread alive, the camera re-aligned without smoothing, placement and trigger effects posted, a same-file music arrival silent and a different file one record.
4. The `demo` and `Basic` sample games' `start.prg` boot through the real engine to the title screen's cursor-map key wait with the doubles; a TK2 sample reports a located `syntax.error`.
5. A restored saved game skips `initBoard`; a game-folder root takes its project path from the main file; a main-file plugin the engine cannot load is a diagnostic.

## Risks and mitigations

| Risk | Mitigation |
| --- | --- |
| Boot changes scene-mode behaviour and moves a golden | Scene mode keeps its code path (`stepScene`); the golden and tracer suites run unchanged. |
| Other builders touch `engine.ts`, `index.ts`, save sections | Merge `origin/main` early and before merging; keep their changes. |
| `send`'s one-tick yield surprises authors | Stated in the built-in's help text and in `#reawakened-send-board`. |
| An unverified default is mistaken for 3.1 parity | Each rule block is marked unverified default and each ruling is pending owner review. |

## Plan change log

- 2026-10-17: Initial high-risk plan from `origin/main` `b5d59593`; built immediately under delegated approval.

## Verification

Gates run by this worker after the build: typecheck, lint, test:strict, golden, golden:bun, graph, licence, provenance, catalogue:check, command-docs:check, `render.py --check` and `generate.mjs --check`.

</frozen-after-approval>
