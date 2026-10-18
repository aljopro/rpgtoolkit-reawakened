---
title: 'Reference rasteriser: every draw command, AD-3 pixel pipeline and conformance vectors'
type: feature
ticket: 6
created: '2026-10-17'
status: done
baseline_revision: '42816c2a'
route: 'full'
risk: 'medium'
review: 'quick'
review_source: 'delegated'
lenses_ran: []
review_loop_iteration: 0
context:
  - 'docs/guardrails.md'
  - 'docs/spec/formats/tiles.md'
  - 'docs/spec/engine/display-input-audio.md'
  - '_bmad-output/initiative-rpgtoolkit-reawakened/architecture-rpgtoolkit-reawakened.md'
  - '_bmad-output/initiative-rpgtoolkit-reawakened/epic-board-rendering/tickets.toml'
---

## Intent

Replace the tracer-only CPU replay in `packages/core/src/raster` with the pure reference rasteriser required by AD-3, AD-4 and AD-27. Every published non-text draw command is replayed deterministically, including key-before-tint, all blend modes, nearest-neighbour scaling, integer primitives, iso2d projection and frame-scoped scratch targets. Text remains owned by ticket 4.8.

## Boundaries

- Always: keep core host-free and I/O-free; use integer arithmetic and plain data; preserve the public `rasterize(list, assets)` seam used by the tracer; return deterministic RGBA bytes and an explicit error for malformed inputs.
- Never: add dependencies, decode assets, implement text/glyphs, mutate persistent surfaces, or change committed golden scenes/PNGs.
- Scratch targets are internal to one rasterisation call and are addressed only by `ScratchId`; persistent `SurfaceRef` inputs are accepted through an optional surface map for AD-27 read-only blits.

## Implementation

1. Add target-stack replay for fill, blit, line, rect, ellipse, pushTarget and popTarget, with fresh root/scratch targets and deterministic validation.
2. Implement AD-3's source-key test, R-15 extreme replacement when tint is non-zero, single clamp, normal/translucent/additive integer blends, clipping and nearest-neighbour source sampling.
3. Implement the integer inclusive line and midpoint ellipse algorithms, with filled/outline rectangles and ellipses.
4. Implement the documented 64×32 diamond mask and fixed nearest-neighbour affine projection for `iso2d` blits.
5. Add authored conformance vectors and independent expected-value tests covering key, ±1020 tint, alpha 0/127/128/255, scaling, primitives, scratch nesting and iso2d. Keep fixture data independent of core implementation.

## Verification

`pnpm fixtures:fetch`, typecheck, lint, strict tests, golden, golden:bun, graph, licence, provenance, catalogue:check and command-docs:check. The raster test suite also checks every vector's expected decoded bytes and an independently hand-calculated blend table.

## Change log

- 2026-10-17: implementation plan written from merged tracer (4.5), AD-3/AD-4/AD-27 and the normative tile/projection rules.
