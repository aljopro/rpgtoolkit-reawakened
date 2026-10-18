---
title: 'Shading, ambient and lights'
type: feature
ticket: 13
created: '2026-10-17'
status: done
baseline_revision: 'fcd62d30'
route: full
risk: medium
review: quick
review_source: pinned
lenses_ran: [quick]
review_loop_iteration: 0
context:
  - 'CLAUDE.md'
  - 'docs/guardrails.md'
  - 'docs/spec/formats/board.md'
  - 'docs/spec/formats/tiles.md'
  - 'docs/spec/engine/display-input-audio.md'
  - '_bmad-output/initiative-rpgtoolkit-reawakened/epic-board-rendering/tickets.toml'
---

## Intent

Compute one deterministic per-cell tint for each tile blit. Apply board and script ambient once, consume stored shade runs with their cast-layer semantics, and bake editable lights into shading layer 0 at board load. Preserve the R-15 pure-white/pure-black raster behavior already implemented in the raster backend.

## Proposed rulings

- **Light layer:** the source light `layer` is ignored at runtime; baked records use the reserved shading-layer-0 cast value and therefore apply to every tile layer. Rejected alternative: preserve source layer ordering, which contradicts `docs/spec/formats/board.md#lights`.
- **Sampling:** light vectors are evaluated at effective-grid cell centres and compressed into row-major shade runs. Rejected alternative: retain light objects for every draw, which repeats vector work and violates the load-time bake rule.

## Implementation

- Add the deterministic tint and light-raster helpers in `packages/core/src/render/shade.ts` and export them from the render barrel.
- Have board hydration bake lights and discard source light objects; compose applies shade/ambient tints only when shading is included, with an optional global ambient input.
- Add focused render tests for cast-layer accumulation, ambient clamping, all light types, load-time light disposal, and shading-disabled composition.

## Verification

Main agent runs all repository gates after merge. This worker will run the focused typecheck/test gates required by the ticket workflow before opening the PR.
