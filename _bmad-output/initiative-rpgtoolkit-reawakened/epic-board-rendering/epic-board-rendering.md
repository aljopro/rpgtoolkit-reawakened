---
type: epic
title: "Boards render through draw lists in 2D and both iso modes"
parent: initiative-rpgtoolkit-reawakened
covers: ["CAP-2", "CAP-6"]
assignee: ""
risk: high
---

# Boards render through draw lists in 2D and both iso modes

## Description

The core boots a game, runs the fixed-step main loop, models boards, layers, coordinate systems, tiles, lighting and transitions, and builds ordered draw lists through one `composeBoard` for layer compositing, iso drawing, occlusion, translucency, shading, animations and the message window. Implements the Spatial Scene model (AD-32) and Dynamic Camera & Viewport model (AD-33), supporting camera tracking, scriptable cutscene panning, deadzones, small-scene centering, multi-layer parallax (§4.3, E-52), and decoupled responsive viewport scaling. The reference rasteriser in `core/raster` (also used for script read-back) replays them to PNG, with core-owned text layout, glyphs and surfaces.

## Outcome

A runner can show any legacy board as the legacy game did; the CAP-2 and CAP-6 success checks, golden images matching expectations for 2D and both iso modes, are the signal.

## Done when

1. Boards from the sample games render to golden PNGs through the CPU rasteriser in 2D, iso-stacked and iso-rotated modes, with camera tracking, small-scene centering, and multi-layer parallax verified.
2. Layer order, colour-key transparency, shading plus ambient arithmetic and animated tiles match format-spec sections 4.3 and 4.5.
3. Startup runs, `send`, board edit built-ins and `reset()` leave the expected state on a scripted board.
4. Message window, text, primitives and transitions are draw-list operations and replay identically in headless runs (G3 hash).
5. Rendering built-ins register with the VM and work from a program.
6. Persistent surfaces follow AD-27 (core-owned, `rev` on every mutation, pixels pulled by id and `rev`), and a replay with every cache flushed each frame gives identical pixels.

## Boundaries

Core world model, the step pipeline's main loop, draw-list builder, `composeBoard`, the surface model, text layout and glyph rasterisation, and the reference rasteriser. Not sprite movement and triggers (epic movement-triggers), not the WebGL2 replayer (epic web-runner-packaging), not audio. Pixel parity for 2D tiles projected on iso boards and the legacy scroll cache are non-goals.

- Touch point: VM built-in registration API - draw and board built-ins register here; owner: this epic

## References

- spec - _bmad-output/initiative-rpgtoolkit-reawakened/spec-rpgtoolkit-reawakened/spec-rpgtoolkit-reawakened.md, section Capabilities
- spine - _bmad-output/initiative-rpgtoolkit-reawakened/architecture-rpgtoolkit-reawakened/architecture-rpgtoolkit-reawakened.md, AD-1, AD-2, AD-3, AD-4, AD-10, AD-15, AD-26, AD-27, AD-28, AD-29, AD-32, AD-33
- constraint - docs/guardrails.md, sections G3 and G4
- reference - docs/engine-features.md, E-01 to E-06, E-10 to E-19, E-50 to E-63
- reference - docs/format-spec.md, sections 4 and 5

## Notes

- Unknown: the golden-image reference for each board; no legacy screenshots are committed under G7, so the source of expected images must be decided at inception. **Incepted 2026-10-12:** assumption A1 (to confirm) — the reference is this epic's own rasteriser output, reviewed by a person once per board and mode (entries 1, 3 and 18 are hitl), then frozen as an exact pixel hash with no tolerance. See `discovery/inception-proposal.md` D1.
- Open question: the draw-list schema; settled by the architecture spine, not inside this epic.
- Decision: epic set approved by the user, 2026-10-10.
- Waits on platform-baseline because: the headless runner skeleton. **Pinned 2026-10-12:** entries 1.7, 1.8 and 1.9, all done; no other epic-1 entry is consumed.
- Waits on legacy-formats because: loaded boards, tiles and sprites. **Pinned 2026-10-12:** 2.2, 2.3, 2.5, 2.9, 2.10 and 2.13 at entry 1; 2.18 and 2.22 at entry 3, because the sample corpus is 2D-only and ships no `.iso` or detail-2/4/6 tileset.
- Waits on rpgcode-vm because: the VM registration API and program execution for rendering built-ins. **Pinned 2026-10-12:** 3.26 at entry 1; 3.2 at entry 12; 3.13 at entry 9; 3.7 and 3.9 at entry 12; 3.3, 3.8, 3.9 and 3.25 at entry 13; 3.9 and 3.12 at entry 15; 3.3, 3.21, 3.22 and 3.25 at entry 17. No entry waits for epic rpgcode-vm to finish.
- Open question: the TrueType rasteriser (library or hand-written) and the glyph-metric source for game fonts are chosen in this epic. **Incepted 2026-10-12:** assumption A2 (to confirm) — AD-15's pure-TypeScript rasteriser by hand plus a bundled bitmap fallback and test font, ruled doc-first as entry 6's first step.
- Decision: envelope re-sliced against the architecture spine, 2026-10-10.
- Decision: 16×16 tiles (tileset details 2, 4 and 6) are stored at 16×16 and doubled to 32×32 by pixel doubling in the renderer, once per tileset, with the result cached (format-spec §3.1); the format reader keeps the stored size. Decided by the user at the epic legacy-formats code review, 2026-10-11.
- Carry-forward: colour keys are tested by `core/raster` on decoded pixels (the `key` of a `blit`, AD-3); `decodeTexture` applies none (AD-28, clarified 2026-10-11). If scripts need a key applied outside a blit, add one shared helper to `core/raster`.
- Decision: Jensen, 2026-10-11: the breakpoint hook (`setBreakpoints`, `paused`), the E-03 focus-pause state and `createEngine` belong to this epic (core/engine owns the open-step cursor and the phase list, AD-10 and AD-26); epic rpgcode-vm exposes the `waits` and `threads` phase handlers and a resumable step for it to register.

### Inception, 2026-10-12

Drafted, then checked with an independent reviewer against the Set, Dependencies and Ticket checks. Full argument, the coverage map and what the check changed: `discovery/inception-proposal.md`.

- Decision: one epic, 18 build entries plus the refactor sweep and an offered end-to-end suite, in two lanes — render/raster (1–9, 18) and world/engine (10–17). The alternative, a split into `epic-board-rendering` (CAP-2) and a new `epic-render-pipeline` (CAP-6), is offered by the proposal (D8).
- Decision: the tracer bullet is entry 1 — one sample board to a golden PNG through `composeBoard` and `core/raster`, driven by a board test host in `runner-harness` that entry 12's `createEngine` supersedes. Entry 1 is also the only entry that needs epic rpgcode-vm entry 3.26, the tick rename, because it implements the `Engine` contract and the golden formats.
- Decision: entry 12 owns the AD-26 phase list and calls each module's per-tick function; entries 6, 8, 9 and 11 expose those functions rather than their own loops.
- Assumption A3 (to confirm): each `GameState` section's type and operations are defined by its owning module inside this epic (pure and testable on their own); entry 12 composes them into the shell epic rpgcode-vm entry 3.2 creates. If 3.2 instead expects the sections to exist first, entries 6, 7, 8, 10 and 11 gain `3.2` in `after` and the epic's render lane stops being startable before epic 3's tracer.
- Assumption A7 (to confirm): entry 10 places the board's declared sprites at load and entry 4 draws them through a sprite view; epic movement-triggers owns the `sprites` section and every later movement.
- Assumption A13 (to confirm): entries 13, 14 and 16 reach the `sprites`, `triggers` and `input` sections through epic movement-triggers' ports, with test implementations standing in until that epic lands — it waits on this epic, so it cannot be a prerequisite.
- Assumption A12 (to confirm): entry 9 adds the format-spec §3.5 `.tan` reader here, because no entry in epics 1, 2 or 3 reads `.tan`; the alternative is a new epic legacy-formats entry beside 2.2.
- Assumption A5 (to confirm): animated GIF is out of v1 (the sample games ship none) and is recorded as deferred work; entry 9 delivers `.anm` and `.tan` only.
- Assumption A6: AVI video (E-62) is not this epic's — the command catalogue gives `playAvi`/`playAviSmall` to epic audio-synth (E-100..E-104), and the spec's transcode-or-drop question is open.
- Source conflict: format-spec §9.11 and epic rpgcode-vm's command-effect catalogue assign the `reset` built-in to epic menu-party-save (it clears every section), while this epic's References cite E-06. Entry 13 delivers the startup re-entry and this epic's own sections' reset through a port; the built-in is epic 8's (D14).
- Source conflict: the same catalogue gives `setButton`, `checkButton` and `clearButtons` to epic movement-triggers and `dirSav` to epic menu-party-save; entries 16 and 17 do not claim them. `cursorMapRun` is this epic's `ui` widget but its wait kind is `input.key`, not `render.msgbox`.
- Handoff not stated by the provider: 3.13 supplies `core/time`'s `frameAt` and conversions, which entry 9 uses; 3.12's virtual-variable port is what entry 15 writes board constants and titles through; neither entry names this epic in return. Source conflict: entry 3.11's own text says it wires `hashState` into `advance`, but `advance` is this epic's engine, so 3.11 owns the `canon` cost fixes and entry 12 the wiring.
- Stand-ins: the sprite, trigger and input sections (epic movement-triggers) and the `audio` section and `cueId` counter (epic audio-synth) are reached through their ports with test implementations until those epics land; epic movement-triggers waits on this epic, so it cannot be a prerequisite (A13).
- Accepted risk: entries 5, 6, 7, 10 and the rest of the render lane each add one export line to `packages/core/src/index.ts` and their own module under `core/raster` or `core/render`; entry 2 owns `core/raster`'s public entry, entry 4 owns `core/render`'s, and the refactor sweep reconciles the barrel — the same partition epic rpgcode-vm's breakdown uses for `VmState` and `Frame`.
- Deferred: E-62 video (epic audio-synth), animated GIF (D5), the WebGL2 replayer (epic web-runner-packaging), sprite movement and the `core/sprites`/`core/input`/`core/triggers` sections (epic movement-triggers), music realisation and the `audio` section (epic audio-synth), the `reset` built-in (epic menu-party-save), and the title-bar FPS display (the runner).
