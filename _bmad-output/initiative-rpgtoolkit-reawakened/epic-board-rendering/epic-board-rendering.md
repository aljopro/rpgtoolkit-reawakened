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

The core boots a game, runs the fixed-tick main loop, models boards, layers, coordinate systems, tiles, lighting and transitions, and builds ordered draw lists through one `composeBoard` for layer compositing, iso drawing, occlusion, translucency, shading, animations and the message window. Implements the Spatial Scene model (AD-32) and Dynamic Camera & Viewport model (AD-33), supporting camera tracking, scriptable cutscene panning, deadzones, small-scene centering, multi-layer parallax (§4.3, E-52), and decoupled responsive viewport scaling. The reference rasteriser in `core/raster` (also used for script read-back) replays them to PNG, with core-owned text layout, glyphs and surfaces.

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

Core world model, the tick pipeline's main loop, draw-list builder, `composeBoard`, the surface model, text layout and glyph rasterisation, and the reference rasteriser. Not sprite movement and triggers (epic movement-triggers), not the WebGL2 replayer (epic web-runner-packaging), not audio. Pixel parity for 2D tiles projected on iso boards and the legacy scroll cache are non-goals.

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
- Waits on legacy-formats because: loaded boards, tiles and sprites. **Pinned 2026-10-12:** 2.2, 2.3, 2.5, 2.9, 2.10 and 2.13 at entry 1; 2.18 and 2.22 at entries 3 and 22, because the sample corpus is 2D-only and ships no `.iso` or detail-2/4/6 tileset.
- Waits on rpgcode-vm because: the VM registration API and program execution for rendering built-ins. **Pinned 2026-10-12; `3.26` landed 2026-10-12** (in review, so entries 1 and 21 are ready now): 3.26 at entries 1 and 21; 3.2 at entry 12; 3.13 at entry 9; 3.7 and 3.9 at entry 12; 3.3, 3.8, 3.9 and 3.25 at entry 13; 3.9 and 3.12 at entry 15; 3.3, 3.21, 3.22 and 3.25 at entry 17. No entry waits for epic rpgcode-vm to finish.
- Open question: the TrueType rasteriser (library or hand-written) and the glyph-metric source for game fonts are chosen in this epic. **Incepted 2026-10-12:** assumption A2 (to confirm) — AD-15's pure-TypeScript rasteriser by hand plus a bundled bitmap fallback and test font, ruled doc-first as entry 6's first step.
- Decision: envelope re-sliced against the architecture spine, 2026-10-10.
- Decision: 16×16 tiles (tileset details 2, 4 and 6) are stored at 16×16 and doubled to 32×32 by pixel doubling in the renderer, once per tileset, with the result cached (format-spec §3.1); the format reader keeps the stored size. Decided by the user at the epic legacy-formats code review, 2026-10-11.
- Carry-forward: colour keys are tested by `core/raster` on decoded pixels (the `key` of a `blit`, AD-3); `decodeTexture` applies none (AD-28, clarified 2026-10-11). If scripts need a key applied outside a blit, add one shared helper to `core/raster`.
- Decision: Jensen, 2026-10-11: the breakpoint hook (`setBreakpoints`, `paused`), the E-03 focus-pause state and `createEngine` belong to this epic (core/engine owns the open-tick cursor and the phase list, AD-10 and AD-26); epic rpgcode-vm exposes the `waits` and `threads` phase handlers and a resumable tick for it to register.

### Inception, 2026-10-12

Drafted, then checked with an independent reviewer against the Set, Dependencies and Ticket checks. Full argument, the coverage map and what the check changed: `discovery/inception-proposal.md`.

- Decision: one epic, 20 build entries plus the refactor sweep and an offered end-to-end suite, in three lanes — docs and fixtures (21, 22), render/raster (1–9, 18) and world/engine and boundary (10–17). The alternative, a split into `epic-board-rendering` (CAP-2) and a new `epic-render-pipeline` (CAP-6), is offered by the proposal (D8).
- Decision: the tracer bullet is entry 1 — one sample board to a golden PNG through `composeBoard` and `core/raster`, driven by a board test host in `runner-harness` that entry 12's `createEngine` supersedes. Entry 1 is also the only entry that needs epic rpgcode-vm entry 3.26, the tick rename, because it implements the `Engine` contract and the golden formats.
- Decision: entry 12 owns the AD-26 phase list and calls each module's per-tick function; entries 6, 8, 9 and 11 expose those functions rather than their own loops.
- Decision: the cross-epic interface pins land in the ADs each belongs to, which epic rpgcode-vm entries 3.2, 3.7, 3.8, 3.9 and 3.25 cite or build on, so their builders read the ruling without an epic-3 entry pinning this epic (epic 3 comes first in the build order and both become startable together once 3.26 lands). **Entry 21 must run before 3.2** as a wall-clock ordering gate, not an `after` edge, and it is live now that 3.26 has landed and both entries sit in `tickets.py next`; where 3.2's draft plan has already chosen an answer (its Q3 placeholder aliases and Q6 `advanceScriptStep`) the ruling supersedes it and the plan is corrected.
- Decision: the `.tan` reader has one owner, epic tk2-support entry 16.7, which runs before this epic; entries 9 and 22 pin it rather than writing a second reader, and the initiative's `after` for this epic now names epic 16. Entry 22 synthesises its `.tan` fixture from the §3.5 shape, and Game fonts are TrueType (format-spec §1.5 and §10), so entry 22's font fixture is a permissively licensed `.ttf`; the archived TK2 `.fnt` files belong to 16.7 and no fixture is taken from the archives, so no edge on 16.9 is needed.
- Decision: **entry 21 must run before epic rpgcode-vm's 3.2, wall-clock**: 3.2 does not pin this epic, the initiative's order puts epic 3 first, and both entries are startable now that 3.26 has landed, so the ordering is a gate the run order must respect rather than an `after` edge. If 3.2 lands first, a pin that contradicts its own plan choice (its Q3 and Q6) means rewriting code instead of correcting a plan.
- Decision: entry 21 is the epic's first entry, now that 3.26 has landed — docs-first rulings for the findings of `discovery/render-readiness.md` and **four cross-epic contracts, each landed in the AD that owns it**: the `waits` and `threads` phase-handler signatures and the phase registration seam (AD-26); the `GameState` section-typing and replacement rule (AD-10); the harness request and reply seam (AD-1 and AD-5); and the program-loading and thread-starting call (AD-5 and AD-8); plus the rendering pack's place in the default manifest (ADR 0004). It waits on epic rpgcode-vm's 3.26 so the two sets of spine and doc amendments cannot collide, and it rules the render-side `.tan` fallbacks while epic tk2-support entry 16.3's format text governs the file. Every render-lane entry consumes it.
- Decision: entry 22 authors the fixtures the corpus cannot supply (iso, parallax, lighting, conditional-item and promotion boards, a scripted fixture project, and a synthesised `.tan` and a permissively licensed `.ttf`), because the fetched corpus is 2D-only, two-layer, image-free, light-free, font-free and `.tan`-free.
- Researched 2026-10-12, recorded in `discovery/render-readiness.md`: the documentation does not decide 22 behaviours this epic needs (the `iso2d` resample, the iso traversal order, under-vector promotion and its translucency, the message window's geometry and defaults, the shade and light formulas, the ambient boundary, the sprite z-order tie-break, the parallax degenerate cases, the overlay colours, the widget signatures, the screen-slot rules, the canvas signatures, the transition and camera constants, `viewBrd`, the `.tan` fallbacks, animation completion, board constants, `put`/`layerPut`, text defaults, native alpha, `send`'s cutover), so none may be invented under G7.
- Researched 2026-10-12: no permitted external visual reference exists for board rendering — the recovered archaeology is Toolkit 2 editor chrome and 85 % of the Toolkit 3 screenshot set is lost — so A1 (this renderer's reviewed output, exact pixel hash) is the only option that reaches iso, shading and the message window. The surviving empirical facts (key `(0,1,2)`, RGB byte order, column-major tiles, the `0x00FFFFFF` frame key, the 1024-pixel diamond mask) are the independent check on the first golden's review.
- Researched 2026-10-12: the sample corpus contains three boards, all 2D (`coordType` 0 or 4) with two layers, no background or board image, no lights, zero ambient, one shade layer each, two sprites and empty board links; tilesets are version 20 detail 1 only; there are no fonts and no `.tan` files. Iso, parallax, lighting, fonts and a scripted lifecycle cannot be verified from it — hence entry 22.
- Source conflicts recorded (from the research): parallax declared with an empty image must be a no-op; tilesets key on `(0,1,2)` while animation frames store `0x00FFFFFF`, so a frame referencing a tile keys on the tile; `mwinSize` is listed as obsolete in the recovered 3.1.0 help but is active in format-spec §9.11; `earthquake` is `fx` in the catalogue and camera state in AD-33 (entry 8 delivers the fx half, entry 11 the script call); `reset` is epic menu-party-save's in the catalogue while E-06 is cited here (entry 13 delivers the re-entry and its own sections' reset); the `+8 px` iso sprite offset is described against the editor display.
- Interface pins epic 3's entries do not state (entry 21 settles them in the spine): 3.9 names no signature for the `waits` and `threads` phase handlers or the resumable tick; 3.8 and 3.9 export no call for loading and starting a program; 3.7 removes the harness driver's throw without adding a request and reply seam; 3.2's `GameState` uses placeholder section aliases and states no replacement rule; 3.26 landed the renamed contract (`advance(ticks, …, maxTicks) -> TickReport`).
- Assumption A3 (to confirm): each `GameState` section's type and operations are defined by its owning module inside this epic (pure and testable on their own); entry 12 composes them into the shell epic rpgcode-vm entry 3.2 creates. If 3.2 instead expects the sections to exist first, entries 6, 7, 8, 10 and 11 gain `3.2` in `after` and the epic's render lane stops being startable before epic 3's tracer.
- Assumption A7 (to confirm): entry 10 places the board's declared sprites at load and entry 4 draws them through a sprite view; epic movement-triggers owns the `sprites` section and every later movement.
- Assumption A13 (to confirm): entries 13, 14 and 16 reach the `sprites`, `triggers` and `input` sections through epic movement-triggers' ports, with test implementations standing in until that epic lands — it waits on this epic, so it cannot be a prerequisite.
- Resolved: the format-spec §3.5 `.tan` reader is epic tk2-support entry 16.7's (epic 16 runs before this one), so entries 9 and 22 pin it. A12 is withdrawn.
- Assumption A5 (to confirm): animated GIF is out of v1 (the sample games ship none) and is recorded as deferred work; entry 9 delivers `.anm` and `.tan` only.
- Assumption A6: AVI video (E-62) is not this epic's — the command catalogue gives `playAvi`/`playAviSmall` to epic audio-synth (E-100..E-104), and the spec's transcode-or-drop question is open.
- Source conflict: format-spec §9.11 and epic rpgcode-vm's command-effect catalogue assign the `reset` built-in to epic menu-party-save (it clears every section), while this epic's References cite E-06. Entry 13 delivers the startup re-entry and this epic's own sections' reset through a port; the built-in is epic 8's (D14).
- Source conflict: the same catalogue gives `setButton`, `checkButton` and `clearButtons` to epic movement-triggers and `dirSav` to epic menu-party-save; entries 16 and 17 do not claim them. `cursorMapRun` is this epic's `ui` widget but its wait kind is `input.key`, not `render.msgbox`.
- Handoff not stated by the provider: 3.13 supplies `core/time`'s `frameAt` and conversions, which entry 9 uses; 3.12's virtual-variable port is what entry 15 writes board constants and titles through; neither entry names this epic in return. Source conflict: entry 3.11's own text says it wires `hashState` into `advance`, but `advance` is this epic's engine, so 3.11 owns the `canon` cost fixes and entry 12 the wiring.
- Stand-ins: the sprite, trigger and input sections (epic movement-triggers) and the `audio` section and `cueId` counter (epic audio-synth) are reached through their ports with test implementations until those epics land; epic movement-triggers waits on this epic, so it cannot be a prerequisite (A13).
- Accepted risk: entries 5, 6, 7, 10 and the rest of the render lane each add one export line to `packages/core/src/index.ts` and their own module under `core/raster` or `core/render`; entry 2 owns `core/raster`'s public entry, entry 4 owns `core/render`'s, and the refactor sweep reconciles the barrel — the same partition epic rpgcode-vm's breakdown uses for `VmState` and `Frame`.
- Deferred: E-62 video (epic audio-synth), animated GIF (D5), the WebGL2 replayer (epic web-runner-packaging), sprite movement and the `core/sprites`/`core/input`/`core/triggers` sections (epic movement-triggers), music realisation and the `audio` section (epic audio-synth), the `reset` built-in (epic menu-party-save), and the title-bar FPS display (the runner).