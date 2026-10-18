---
title: "Cursor maps, mouse cursor, overlay order and debug overlays"
ticket: 25
type: feature
status: built
---

# Ticket 4.25 plan

Implement the six board-rendering input built-ins from `docs/spec/engine/rpgcode-functions.md#e-60` and the cursor rules at `#reawakened-default-cursors`: `createCursorMap`, `cursorMapAdd`, `cursorMapRun`, `killCursorMap`, `cursorMapHand`, and `mouseCursor`. Cursor maps are plain saveable UI state, run through the existing `input.key` wait resolver and claims, and select points by deterministic arrow/mouse navigation. The bundled arrow and hand are 32×32; the arrow uses hot spot `(0,0)`, while the hand is drawn at `(mapX - 40, mapY - 10)`; custom cursor assets preserve the configured transparent key and hand stretching is nearest-neighbour.

Extend draw-list composition so surface 0 is ordered board composite, script surfaces/animations, UI overlay, then cursor as the final command. Add persistent on-screen button slots from the input view when present, and expose debug vector/FPS/path overlays through run configuration without mutating core state. Reset clears maps, cursor, and buttons through the existing section reset seam. Preserve lazy UI materialisation for unchanged state hashes.

Normative sources: `docs/spec/engine/display-input-audio.md#e-05`, `#e-57`, `#e-61`; `docs/spec/engine/main-loop-and-startup.md#e-52`; `docs/spec/engine/rpgcode-functions.md#e-60`, `#reawakened-default-cursors`; `docs/spec/engine/rpgcode-runtime.md#reawakened-effect-dispatch`.

Tests/fixtures cover all six command registrations and docs, keyboard/mouse cursor-map selection and key claims, custom/default cursor draw ordering, overlay ordering with all three layers, reset clearing cursor state, button slots, and debug flags. Remove the six names from any stub/legacy allowlist once implemented.

## Verification notes

- Cursor-map selections are zero-based, matching the authored demo and Basic startup switch cases (`0`, `1`, `2`); Enter/Return/Space and mouse selection return the selected point index and claim the input key.
- G5 golden change: `sample-start-demo` `951b20e9f6924db7` → `fbf37a3a70735020` and `sample-start-basic` `1197f03d646e11dc` → `224a13b87854a00c`. These startup programs execute `createCursorMap`, `cursorMapAdd`, `cursorMapRun`, and `killCursorMap`; materialising their now-real cursor-map state is the intentional hash change.
