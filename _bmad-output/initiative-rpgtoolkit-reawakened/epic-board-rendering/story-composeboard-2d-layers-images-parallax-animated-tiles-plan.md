---
title: 'composeBoard for 2D boards: layers, images, parallax, animated tiles'
type: feature
ticket: 14
created: '2026-10-17'
status: built
baseline_revision: '857b3220'
route: full
risk: high
review: quick
context:
  - 'CLAUDE.md'
  - 'docs/guardrails.md'
  - 'docs/spec/formats/board.md#drawing-order-and-effects'
  - 'docs/spec/formats/board.md#layer-images'
  - 'docs/spec/formats/tiles.md#animated-tile-tan'
  - 'docs/spec/formats/tiles.md#tile-bitmap-tbm'
  - 'docs/spec/engine/display-input-audio.md#e-17'
  - '_bmad-output/initiative-rpgtoolkit-reawakened/architecture-rpgtoolkit-reawakened/architecture-rpgtoolkit-reawakened.md, AD-3, AD-28, AD-29'
  - 'golden/scenes/S-01b.json'
  - 'golden/ledger.json'
---

## Intent

Extend the single pure 2D compositor from the tracer into the complete board layer path. It emits background colour, optional background image, ordered layer tiles and layer images, using the supplied read-only world view, decoded texture map, camera, viewport, tick, alpha and include flags. It resolves authored runtime tile/image edits without putting bytes or decoded pixels in world state.

## Rulings

- **Proposed ruling (pending owner review):** `BoardView.assets` is a read-only map of decoded image/tile textures and `BoardView.layers` optionally overrides `board.layers`; callers that omit assets retain the tracer behaviour. This follows AD-28/AD-29 and avoids a second decoder/compositor; a missing texture simply emits the deterministic command and is reported by the rasteriser. Rejected alternative: have compose read bytes or perform I/O.
- **Proposed ruling (pending owner review):** layer/background image type 0 draws at its stored board position, type 1 applies `offset = camera * (imageSize - viewportSize) / (boardSize - viewportSize)`, and type 2 scales to board pixel dimensions. Zero denominators use zero scroll and exact board-sized images are normal. Rejected alternative: runner-specific parallax math.
- **Proposed ruling (pending owner review):** optional animated tile metadata is selected with `frameAt(0, tick, ticksPerFrame, count, true)`; ordinary tiles remain unchanged. `.tbm` cells are represented as tile refs plus per-cell tint and are emitted in x/y cell order. Rejected alternative: pass `.tan` or `.tbm` readers through the draw-list seam.

## Implementation

1. Expand the world tile/image plain-data types with optional animation, tile-bitmap cell and resolved texture geometry fields.
2. Extend `composeBoard` with asset lookup, runtime layer override, 2D viewport culling, animated tile selection, shading plus per-cell tint, background/layer normal/parallax/stretch image commands, and optional view blits with normal/translucent/additive modes.
3. Preserve the existing fill/tile command contract and Engine/direct-composer equivalence when the engine's current include flags are disabled.
4. Add authored unit tests for strict layer order, image order and culling, parallax/stretch offsets, key colours, animation ticks 0/7/61, image-cell tint, and blend command shapes. Do not modify committed oracle bytes.

## Verification

Main agent runs all repository gates after this worker's implementation. This worker runs focused tests and typecheck while iterating, then reports the commands and results.

## Acceptance mapping

- `composeBoard` emits background then each layer's tiles then images in stable order, and swapping layers changes the command sequence.
- Normal, parallax and stretch images follow `board.md`; transparent colour keys are attached to image blits.
- Animated frames and `.tbm` cell tints are selected deterministically from fixed ticks and included shading/global ambient.
- Viewport culling and `include.images`/`include.shading` are honoured; normal/translucent/additive commands carry AD-3 fields.
- No host I/O or decoded bytes enter core state; the existing S-01 path remains unchanged.
