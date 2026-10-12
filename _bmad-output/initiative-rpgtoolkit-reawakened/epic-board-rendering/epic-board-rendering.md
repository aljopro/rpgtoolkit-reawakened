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

- Unknown: the golden-image reference for each board; no legacy screenshots are committed under G7, so the source of expected images must be decided at inception.
- Open question: the draw-list schema; settled by the architecture spine, not inside this epic.
- Decision: epic set approved by the user, 2026-10-10.
- Waits on platform-baseline because: the headless runner skeleton.
- Waits on legacy-formats because: loaded boards, tiles and sprites.
- Waits on rpgcode-vm because: the VM registration API and program execution for rendering built-ins.
- Open question: the TrueType rasteriser (library or hand-written) and the glyph-metric source for game fonts are chosen in this epic.
- Decision: envelope re-sliced against the architecture spine, 2026-10-10.
- Decision: 16×16 tiles (tileset details 2, 4 and 6) are stored at 16×16 and doubled to 32×32 by pixel doubling in the renderer, once per tileset, with the result cached (format-spec §3.1); the format reader keeps the stored size. Decided by the user at the epic legacy-formats code review, 2026-10-11.
- Carry-forward: colour keys are tested by `core/raster` on decoded pixels (the `key` of a `blit`, AD-3); `decodeTexture` applies none (AD-28, clarified 2026-10-11). If scripts need a key applied outside a blit, add one shared helper to `core/raster`.
- Decision: Jensen, 2026-10-11: the breakpoint hook (`setBreakpoints`, `paused`), the E-03 focus-pause state and `createEngine` belong to this epic (core/engine owns the open-step cursor and the phase list, AD-10 and AD-26); epic rpgcode-vm exposes the `waits` and `threads` phase handlers and a resumable step for it to register.
