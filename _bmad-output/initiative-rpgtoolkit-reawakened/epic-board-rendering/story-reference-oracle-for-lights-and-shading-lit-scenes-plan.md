---
title: "Reference oracle for lights and shading: lit scenes"
type: feature
ticket: 33
status: done
assignee: "BuildLitOracle"
created: '2026-10-17'
---

# Reference oracle for lights and shading: lit scenes

## Scope

Extend the 4.4/4.17 authored-fixture generator and independent Python reference oracle with lit scenes so 4.13's light and shading arithmetic has an independent second opinion. Conformance is judged against the normative Reawakened specification (`docs/spec/formats/tiles.md#shading`, `docs/spec/formats/board.md#lights` and `#tile-shading`, and `docs/spec/engine/display-input-audio.md#reawakened-light-and-raster-arithmetic` E-17), not legacy parity (falloff extraction is tracked in round 7, question 8).

## Proposed rulings (pending owner review)

1. **Scene names and ledger classification.** Add five gating scenes under `golden/scenes/` (`S-LIGHT-ELLIPSE`, `S-LIGHT-GRADIENT`, `S-LIGHT-CLIPPED`, `S-LIGHT-OVERLAP`, `S-LIGHT-NIGHT`), all classed as `independent-reference` with `gating: true` and producer `4.33` in `golden/ledger.json`. Evidence: ADR 0007 normative specification, ticket description, and owner instruction for scene 5 (night look). Rejected alternative: classifying them as regression-baseline, which would weaken verification of the light formulas.

2. **Authored fixture board and tileset design.** Authored tileset `light-oracle.tst` uses detail 2 (16×16 doubled to 32×32) with 5 tiles: tile 1 mid-grey (128,128,128) and tiles 2–5 a distinct coloured strip (red, green, blue, yellow) for tinted-light response, avoiding transparent key (0,1,2) and pure white (255,255,255). Board dimensions are 8×4 tiles with static baked lights. Evidence: owner prompt and R-15 pre-shade rules. Rejected alternative: 32×32 detail-1 tileset, which would exceed the 8,192-byte committed fixture cap enforced by `format-fixtures.test.ts`.

3. **Night look scene parameters.** `S-LIGHT-NIGHT` applies a strongly negative board ambient `(-110, -110, -110)` with a single round ellipse light centred on the board `(0, 0, 0)` edge to `(130, 130, 130)` centre, staying within clamps so the dark-to-lit gradient is visible. All lights are static baked board data (no runtime or dynamic light entities). Evidence: owner instruction (interjection 2026-10-17). Rejected alternative: moving or runtime lights, which are out of scope.

4. **Engine drawList include argument.** Extend `Engine.drawList` with an optional `include?: DrawListInclude` parameter defaulted to `{ shading: false, images: false, sprites: false }`, allowing headless golden scenes and runner harnesses to request real-engine shading cleanly without altering callers. Evidence: G2/G4 package boundaries, runner-harness tracer contract. Rejected alternative: separate ad-hoc engine entrypoint, which would violate single-engine entrypoint principles.

## Verification

- `node tools/fixtures/author/generate.mjs --check` passes.
- `python3 tools/fixtures/reference/render.py --check` passes and verifies decoded RGBA exact pixel match.
- `pnpm golden` passes.
- `pnpm golden:bun` passes with identical draw and state hashes.
- Headless runner golden suite tests real engine execution against independent oracle PNGs.
