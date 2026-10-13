---
title: 'Tracer bullet: one sample board to a golden PNG'
type: 'chore'
ticket: '1'
created: '2026-10-13'
status: 'in-review'
baseline_revision: '5b4dc72'
route: 'full'
route_source: 'auto'
risk: 'high'
review: 'none'
review_source: 'pinned'
lenses_ran: []
context: ['{project-root}/docs/guardrails.md', '{project-root}/docs/format-spec.md', '{project-root}/_bmad-output/initiative-rpgtoolkit-reawakened/architecture-rpgtoolkit-reawakened/architecture-rpgtoolkit-reawakened.md']
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Nothing proves the epic's layers connect. There is no rasteriser, no compositor, no way to turn a legacy board into pixels, and no evidence that a fetched sample board renders the way the format describes. Every later entry builds on those seams, so a wrong seam is expensive later.

**Approach:** The thinnest path through every layer this epic touches: a fetched sample board → `composeBoard` → `core/raster` → a PNG through the harness, driven by a board test host. Along the way it creates the shared pieces later entries reuse — the surface model, AD-3's pixel pipeline, the PNG encoder, the `composeBoard` signature, the board host and `renderFrame` — and freezes the first 2D golden references, each with a PNG a person can open (assumption A1).

## Boundaries & Constraints

**Always:** `core` stays free of DOM, Node, I/O and timers (G2); integer arithmetic with the allowlisted `Math` members only, no `**` (G3/AD-13); one answer on every engine (G3); the draw list is the only thing a renderer reads (G4); every ruling this entry follows comes from format-spec §15 and engine-features §15, not from invention (G7).

**Ask first:** none — the rulings landed in entry 21, and this plan is at `review` for the owner.

**Never:** invent the isometric projection or the 16×16 doubling (entry 3), the primitives or the scratch targets (entry 2), the persistent-surface store (entry 7); commit a legacy byte (G5 — the sample games are fetched, never tracked); add a runtime dependency (G2 — the deflate stream uses the allowlisted `fflate`).

## Key Decisions

* The raster refuses a command it does not implement by name, naming the entry that adds it (`UnsupportedRasterFeatureError`), rather than skipping it: a silently dropped command would freeze a wrong frame into every golden.
* A `blit` whose source the resolver cannot find is skipped, not an error: a missing asset is a normal condition (AD-5).
* The board host is deliberately not `createEngine` and stays out of the harness's pinned public surface; it is the same pattern as epic rpgcode-vm entry 3.2's VM-backed host, and entry 12 supersedes it.
* The board's LUT reference string is resolved by the caller (`TileRefResolver`), so the compositor resolves no paths and reads no pixels (AD-29, AD-5).
* The view carries the tile's *stored* and *drawn* sizes separately: that is how the 16×16 details double with the raster's existing nearest-neighbour scaling, and entry 3 adds the cache.

## References

* `docs/format-spec.md` §15 (RND-1, RND-2, RND-6, RND-21, RND-A1); `docs/engine-features.md` §15; the spine's AD-3, AD-4, AD-27, AD-29.
* `golden/board-2d/` — `golden.json` (the synthetic fixture) and `corpus.json` + `corpus/*.png` (the three fetched boards).

## Acceptance Criteria

* A sample board renders to a PNG through the harness, and its pixel hash is stable across runs and across the golden job's batch sizes.
* AD-3's pipeline is exact: key and format-transparent skipped on the untinted source, one clamped tint, native alpha times command alpha, and the three blends at AD-3's integers.
* `pnpm typecheck`, `pnpm lint`, `pnpm test:strict`, `pnpm golden`, `pnpm dump:check`, `pnpm licence`, `pnpm provenance` and `pnpm graph:test` pass.

## Verification

Run 2026-10-13 with the corpus fetched: `pnpm test:strict` 496 tests, 0 skipped, 0 failed; `pnpm golden` 24 ticks, batching 1/3/S ok; `pnpm dump:check` both games' digests match; `pnpm licence` and `pnpm provenance` 0 violations; `pnpm fixtures:check` 0 tracked files. The three rendered boards were opened and reviewed (`golden/board-2d/corpus/*.png`): layer order, the tileset key, the layered cobble floor and the empty cells all read correctly.

</frozen-after-approval>

## What landed

| Piece | Where |
|---|---|
| The surface model and AD-3's pixel pipeline (key/format-transparent skip, one clamped tint, native alpha × command alpha, normal/translucent/additive) | `packages/core/src/raster/surface.ts` |
| The PNG encoder (8-bit RGBA, one `IDAT`, per-chunk CRC-32, byte-stable) | `packages/core/src/raster/png.ts` |
| `rasteriseDrawList` and the named refusals | `packages/core/src/raster/rasterise.ts` |
| `composeBoard`: background colour, then every tile layer, the tileset key, stored-versus-drawn tiles | `packages/core/src/render/compose.ts` |
| The board host (`Engine` over `composeBoard`) and `renderFrame` | `packages/runner-harness/src/board-host.ts` |
| The synthetic golden, the per-board corpus goldens and their PNGs | `golden/board-2d/` |
| 12 tests: the pipeline's integers, clipping, scaling, refusals, the PNG round-trip through the decoder, the compositor's order and skips, the host's report, the corpus boards, and the golden job | `packages/core/test/{raster,render-compose}.test.ts`, `packages/runner-harness/test/board-host.test.ts`, `packages/runner-harness/test/board-corpus.test.ts` |

## Open at review

1. **The first 2D golden references** (`golden/board-2d/corpus/*.png`): the owner's review is what freezes them (assumption A1). The black surround is the boards' own background colour plus the tracer's absent camera (entry 11), not a bug.
2. **`golden/board-2d/corpus.json`** pins a draw and a pixel hash per board; `GOLDEN_RECORD=1 pnpm test` rewrites the hashes and the PNGs deliberately (G5).

## Known limits (each with its owner entry)

* `iso2d` blits, `line`, `rect`, `ellipse`, `text`, `pushTarget` and `popTarget` are refused by name: entries 3, 2, 2 and 6 respectively.
* No board images, sprites, under-vector promotion, parallax, shading, animation, camera or `viewBrd`: entries 4, 5, 9 and 11.
* `surfacePixels` returns `null` and `setBreakpoints` records nothing: entries 7 and 15.
* The CI `golden` job still runs the test double only; the board case belongs to entry 18's wire-up (the harness golden-job run here already covers vectors, the run, batching and a recorded golden).
