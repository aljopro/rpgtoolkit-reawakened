---
title: 'Sprites in the compositor: strict layer and y order, under vectors, overlap redraw'
type: feature
ticket: 15
created: '2026-10-17'
status: done
baseline_revision: 'a9ac004c'
route: full
risk: high
review: quick
context:
  - 'CLAUDE.md'
  - 'docs/guardrails.md'
  - 'docs/spec/engine/movement-and-collision.md#e-29'
  - 'docs/spec/engine/movement-and-collision.md#e-30'
  - 'docs/spec/formats/board.md#drawing-order-and-effects'
  - 'docs/spec/formats/board.md#vectors'
  - 'docs/spec/formats/character.md#defaults-and-fall-backs'
  - 'docs/spec/formats/animation.md'
  - 'docs/spec/formats/tiles.md#tile-bitmap-tbm'
  - '_bmad-output/initiative-rpgtoolkit-reawakened/architecture-rpgtoolkit-reawakened/architecture-rpgtoolkit-reawakened.md, AD-3, AD-28, AD-29'
  - 'golden/scenes/S-01c.json'
  - 'golden/ledger.json'
---

## Intent

Add sprite composition to `composeBoard` via a plain-data `SpriteDraw` contract that future `movement-triggers` will supply. Implements strict layer and screen-space y order with stable `drawId` tie-breaking that fixes legacy R-55; layer interleaving where each layer's tiles redraw over lower-layer sprites; `under` vectors with attribute flags 1, 2, and 4 redrawn via per-row span blits; and frame textures from `.anm`, `.tbm`, tile references, and oracle fallbacks with transparent color keys and ambient shading.

## Rulings

- **Proposed ruling (pending owner review):** `SpriteDraw` is a plain-data structure containing `id`, `key`, `layer`, `x`, `y`, `drawId`, optional `prev: readonly [number, number] | { x: number, y: number }` for presentation `alpha`, optional `frame?: SpriteFrame`, `phase?: number`, `translucency?: number`, `blend?: "normal" | "additive" | "translucent"`, and `under?: readonly number[]`. When frame art is not supplied, the compositor falls back to the independent reference oracle representation (16x16 rectangle at `x - 8, y - 16` with `(64, 96, 224)` for player and `(192, 128, 32)` for others) ensuring pixel-exact parity with golden scene `S-01c`.
- **Proposed ruling (pending owner review):** Sprite Z-order strictly enforces `(layer, screenSpaceY, drawId)` where `screenSpaceY = (prev ? prevY + (y - prevY) * alpha : y) - camera.y`. Lower values draw first (behind). `drawId` is a stable integer ordering players before items and by stable index. Re-inserting or moving a sprite does not alter this key, fixing R-55.
- **Proposed ruling (pending owner review):** Layer interleaving places layer L sprites after layer L tiles and layer L images, and before layer L+1 tiles. Thus layer L+1 tiles naturally draw over layer L sprites without additional passes.
- **Proposed ruling (pending owner review):** `under` vectors (type 2) promote covered tiles over sprites inside the polygon. An under-vector triggers if the sprite intersects the polygon: via collision base `[-15, -15]` to `[15, 0]` by default, or via sprite frame rectangle if attribute flag 4 is set. Flag 1 promotes background content, and flag 2 promotes all lower layers (`1..vector.layer`). Redraw is executed using contiguous per-row 1-pixel-high span blits without inventing new draw commands or alpha clips.

## Implementation

1. Define `SpriteFrame` and `SpriteDraw` plain-data types in `packages/core/src/render/types.ts` and add `sprites?: readonly SpriteDraw[]` to `BoardView`. Export them from `packages/core/src/render/compose.ts` and re-export from `packages/core/src/index.ts`.
2. Implement sprite sorting in `packages/core/src/render/compose.ts` with strict layer, screen-space Y (supporting presentation `alpha` interpolation from `prev`), and stable `drawId`.
3. Interleave sprite rendering with layer passes: background -> layer 1 tiles -> layer 1 images -> layer 1 sprites -> layer 2 tiles -> layer 2 images -> layer 2 sprites...
4. Implement sprite drawing commands for frames:
   - Tile references (`char.tst5`, `{ asset, tile }`) with `TILE_KEY` or frame transparent key, and ambient tint applied.
   - Tile bitmaps (`.tbm`) with cell grid, per-cell tints, and ambient tint.
   - Decoded textures / images (`.anm`, `.png`, `.bmp`) with transparent key and ambient tint.
   - Oracle fallback rectangle (16x16) for test scenes lacking textures.
5. Implement `under` vector scanline span calculation:
   - Intersection test between sprite collision base (or frame if flag 4) and under-vector polygon.
   - For each scanline of the sprite inside the polygon, calculate polygon edge x-intercepts, clip to sprite bounds, and emit contiguous span blits (`h: 1`) of the promoted tiles, layer images, and background.
6. Verify against `golden/scenes/S-01c.json` and author comprehensive test suite in `packages/core/test/render-sprites.test.ts` covering:
   - Exact S-01c golden PNG match through rasterizer.
   - R-55 fix: two sprites crossing in Y, moving A last still draws behind sprite with greater Y.
   - Tie-breaking: equal Y with player before item (`drawId`).
   - Higher layer sprite drawing over lower layer sprite.
   - Under-vector redraw with flag 1 (background), flag 2 (lower layers), flag 4 (frame intersection).
   - 2x2 `.tbm` frame rendering with ambient tint.

## Verification

Run all required project gates:
- `pnpm typecheck`
- `pnpm lint`
- `pnpm test:strict`
- `pnpm golden`
- `pnpm golden:bun`
- `pnpm graph`
- `pnpm licence`
- `pnpm provenance`
- `pnpm catalogue:check`
- `pnpm command-docs:check`
