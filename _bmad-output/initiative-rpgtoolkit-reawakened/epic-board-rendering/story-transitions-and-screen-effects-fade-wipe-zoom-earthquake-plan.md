---
ticket: 22
type: feature
status: built
---

# Transitions and screen effects

## Scope

Implement the `fx` section and deterministic screen-effect runtime for E-59: `fade`, `wipe`, `zoom`, and `earthquake`. Effects are plain saveable state, advance on fixed ticks, and are applied in the core compositor. Blocking script calls yield through the existing sleep wait and resume after the final tick.

## Proposed ruling (pending owner review)

The round-7 facts name fade visuals but do not specify geometry, colours, or terminal state. The implementation uses deterministic screen-space primitives and leaves the screen in the effect's terminal state until the next composed frame: type 0 grows an opaque current-colour rectangle from the centre; type 1 sweeps opaque current-colour vertical stripes left-to-right; type 2 applies a full-screen grey ramp from transparent to opaque; type 3 slides an opaque grey strip left-to-right; type 4 draws expanding black ellipse rings from the centre; type 5 applies a full-screen current-colour overlay. Progress is integer `n/30` for ticks 1..30. These are Reawakened choices, not claimed legacy geometry; no RNG or wall clock is used. The current colour is the fixed border colour in `fx` (default black).

Round-7 evidence establishes fade type names and out-of-range no-op but not these primitives or end state. Keeping the effect visible at step 30 makes the final draw deterministic and avoids inventing an implicit restore; the rejected alternative is an unverified legacy-specific geometry/terminal state.

For wipe diagonals, effects 5..8 use top-left, top-right, bottom-left, bottom-right starts; push slides 9..12 enter from left, right, top, bottom. This mapping is explicitly marked unverified by E-59. Speed is logical pixels/tick, default 1, and invalid non-positive speed raises `builtin.bad-arg`. The final frame emits the exact resolved image.

Zoom follows the LOW-confidence E-59 Reawakened reading: shrink amount 0..75, centred nearest-neighbour presentation transform, linear integer target over 30 ticks, blocking; invalid values raise `builtin.bad-arg`.

## Implementation

- Replace the empty `FxSection` with explicit plain-data state and helpers.
- Add effect command responders with exact argument validation and blocking waits.
- Apply FX effects per tick and append transition primitives to draw lists; store wipe image keys for host-renderer asset resolution.
- Reset FX state through the lifecycle reset seam and ensure snapshot/restore retains active transitions.
- Add focused unit tests and transition regression coverage without changing independent-oracle goldens.
- Cite `docs/spec/engine/rpgcode-functions.md#e-59`, `#reawakened-fade-types`, `#reawakened-wipe-effects-and-speed`, `#reawakened-zoom`, and `docs/provenance/facts-round-7.md`.
