---
title: 'Isometric drawing: stacked and rotated boards'
type: feature
ticket: 18
created: '2026-10-17'
status: built
baseline_revision: '121c2515'
route: full
risk: high
review: quick
context:
  - 'CLAUDE.md'
  - 'docs/guardrails.md'
  - 'docs/spec/formats/board.md#coordinates'
  - 'docs/spec/formats/board.md#board-pixel-dimensions'
  - 'docs/spec/formats/board.md#drawing-order-and-effects'
  - 'docs/spec/formats/tiles.md#isometric-tiles'
  - 'docs/spec/engine/display-input-audio.md#e-53'
  - 'docs/spec/engine/movement-and-collision.md#e-11'
  - 'docs/spec/engine/movement-and-collision.md#e-29'
  - 'golden/scenes/S-ISO-STACKED.json'
  - 'golden/scenes/S-ISO-ROTATED.json'
  - 'golden/ledger.json'
---

## Intent

Teach `composeBoard` both isometric layouts. Boards with `coordType` 1 (stacked) and 2
(rotated) hydrate, project their tiles into 64×32 diamonds in painter order, take their
shading from the stored grid, clamp the camera to the isometric pixel size, and keep entry
15's sprite order. The two merged entry-17 oracle scenes (`S-ISO-STACKED`, `S-ISO-ROTATED`)
are the independent check: the real engine must match them exactly through
`createEngine` → `composeBoard` → `rasterize`.

## Rulings

All are **Proposed ruling (pending owner review)** unless stated.

1. **Coordinate conversions live in `core/world/coords.ts`.** `tileToPixel`, `pixelToTile`,
   `stackedToRotated`, `boardPixelSize` and `coordLayout` are pure integer functions that
   transcribe `board.md#coordinates` and `#board-pixel-dimensions`. The "pixel coordinates"
   flag 4 is ignored for layout, and bit value 2 means rotated (matching `boardGrid` and
   hydration). *Evidence:* the spec table, the world model, and `boardGrid`. *Rejected:*
   placing them in `render/`, because `world/camera.ts` also needs them and
   `render → world` is the existing dependency direction.
2. **Stacked inverse = nearest diamond centre under the diamond's own metric `|dx| + 2·|dy|`,
   exact tie keeps the upper row.** The spec states the rotated closed form but only says
   "snaps to the nearest 32×16 diamond centre" for the stacked layout. The new rule is
   written into `board.md#coordinates` first. *Evidence:* the 32×16 half-extents give
   `|dx|/32 + |dy|/16 ≤ 1` as the diamond. *Rejected:* a Euclidean metric, because it
   would assign pixels near a diamond's tips to a tile whose diamond does not contain them.
3. **Painter order is computed, not sorted.** Stacked: row by row. Rotated: diagonals of
   constant `x + y`, `x` rising, over the whole `(sizeX + sizeY)` square. This equals the
   oracle's `(layer, centre y, centre x)` key (the key is strictly monotone in these
   traversals). Recorded in `board.md#drawing-order-and-effects`. *Rejected:* sorting per
   frame, which allocates and would need a tie rule.
4. **`.iso` art is blitted 1:1 (`iso2d: false`); any other tile is `iso2d: true`.** The
   discriminator is the tile's logical size: 64×32 is a diamond, anything else is a square
   source for the affine projection. *Rejected:* testing the asset extension, which would
   mis-handle animated-tile frames and `.tbm` cells.
5. **Sprites keep their entry-15 key unchanged.** E-11 makes sprite positions board pixels
   with the reference point at the isometric tile centre, so raw `y` already is the
   projected y. A tile-built sprite takes shade from the tile under each cell's centre
   (`pixelToTile`). *Rejected:* adding a second projection step, which would double-project.
6. **Under-vector redraw of promoted tiles is 2D-only (OWNER-VISIBLE).** Diamonds overlap,
   an `iso2d` blit cannot be sliced to one row, and the compositor does not read pixels, so
   "which tile owns this pixel" is undefined. Flag-1 background spans still apply. Written
   into `board.md`. *Rejected:* slicing only `.iso` art, which would make behaviour depend
   on the tile kind. If the owner wants iso under-vector redraw it needs a rule and
   probably a mask-aware raster op.
7. **Engine inputs.** `EngineInit` gains optional `sprites` and `globalAmbient`, passed
   straight to `composeBoard` through both `drawList` and the frame surface, so the real
   engine can carry the oracle scenes until the sprites section (movement-triggers) and
   script ambient land. *Rejected:* writing sprites into `state.sprites`, which belongs to
   another epic's schema and save format.
8. **Camera start tile on iso boards.** With no tracked sprite the camera centres on the
   start tile through the board's own `tileToPixel` rather than `x·32 + 16`. Written into
   E-53. 2D behaviour is unchanged.
9. **The `.iso` tile index pitch in the rasteriser is 64.** A tileset texture is a strip;
   `.iso` tiles are 64 wide, so `sourceOffset` used 32 and would have read the wrong tile
   for any index above 1 (the oracle fixtures only use tile 1).
10. **Oracle bug fix: sprites interleave with tile layers.** `render.py` drew every sprite
    after all tiles. `board.md#drawing-order-and-effects` says sprites draw on their own
    layer, and entry 15 implements that; in `S-ISO-ROTATED` a layer-2 tile covers the layer-1
    item. The oracle now draws a layer's sprites after that layer's tiles (layer 1 takes
    any lower layer; layers above the top draw last). **`S-ISO-ROTATED.png` is
    regenerated deliberately (G5)**; every other golden is byte-identical. *Rejected:*
    moving the sprite to layer 2 in the scene, which would hide the disagreement.
11. **Oracle bug fix: `compare_pixels` compared nothing for opaque images.** On RGBA,
    `ImageChops.difference(...).getbbox()` inspects only alpha, so any two opaque images
    compared equal and `render.py --check` could not fail on colour. It now compares the
    raw bytes. With the real comparison every committed golden except the one in ruling 10
    matched, so no other PNG was hiding a defect.
12. **Tracer harness honours the scene.** `runTracerScene` passes the scene's sprites,
    ambient and camera (as the tracked point `camera + viewport/2`, which the engine
    clamps) to `createEngine`.

## Implementation

1. `world/coords.ts`; export from `world/index.ts`.
2. `render/compose.ts`: `emitIsometricLayer`, iso-aware sprite cell shading, iso skip of
   promoted tile redraw.
3. `world/camera.ts`: `boardStartPoint` replaces four copies of `start·32 + 16`.
4. `raster/raster.ts`: `.iso` tile pitch.
5. `engine/engine.ts`, `runner-harness/src/tracer.ts`: sprites, ambient, camera.
6. Spec: `board.md` (inverse, painter order, under-vector), `display-input-audio.md#e-53`.
7. Oracle: `render.py` (sprite interleave, `compare_pixels`), `SCHEMA.md`, regenerated
   `S-ISO-ROTATED.png`.
8. Tests: `coords.test.ts` (100 generated cells per formula, round trips, stacked→rotated
   grid), `render-iso.test.ts`, a raster pitch test, and both iso scenes added to the
   runner-headless golden test.

Hydration of iso boards already existed in `hydrate.ts` (`boardGrid`, pixel size by
layout); the tracer's rejection was never in code that remains, and the authored
boards hydrate in `render-iso.test.ts`.

## Verification

All run in the worktree: `pnpm install`, `pnpm fixtures:fetch`, `pnpm typecheck`,
`pnpm lint`, `pnpm test:strict`, `pnpm golden`, `pnpm golden:bun`, `pnpm graph`,
`pnpm licence`, `pnpm provenance`, `pnpm catalogue:check`, `pnpm command-docs:check`,
`python3 tools/fixtures/reference/render.py --check`,
`node tools/fixtures/author/generate.mjs --check`.
