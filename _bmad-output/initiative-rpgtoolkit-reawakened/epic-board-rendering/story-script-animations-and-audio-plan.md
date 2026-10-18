---
ticket: 23
type: feature
status: built
---

# Script animations and per-frame audio effects

## Scope

Implement E-54 stand-alone script animations in the saveable `fx` section: `animation`, `sizedAnimation` and `endAnimation`, `.anm` and animated GIF frame playback at deterministic fixed ticks, loop/persistent modes, transparent colour and sizing, compositor overlay draws, and per-frame audio records posted through the engine effect bus during the animation phase. Snapshot/restore must preserve active animations and produce the same state/draw hashes.

## Proposed ruling (pending owner review)

The docs specify frame timing and frame data but not the complete script argument list, animation placement defaults, or how a one-shot completion is exposed. This implementation uses command arguments `(file, x, y, loop?)` for `animation`, `(file, x, y, height, width, loop?)` for `sizedAnimation` (the documented height-then-width order), with omitted loop meaning one-shot; persistent mode is selected by a true loop flag and is stopped by `endAnimation(id)` using the returned numeric id. Coordinates are the top-left destination `(x, y)`, draws appear above the board in creation order, and one-shot records are removed after their last frame. This is a Reawakened compatibility choice, not a claim about undocumented legacy details; the rejected alternative is a silent no-op or an unbounded host-only animation handle.

`.anm` uses its fixed delay converted to whole ticks with `frameAt`; GIF uses the first-page delay, dimensions and transparent colour per R-10, with one logical frame per decoded GIF page. A sound is posted once when a frame becomes active, as a plain `audio` effect record through `postEffect`; no direct host/audio call is made. Asset loading remains blocking and deterministic via existing asset requests.

## Implementation

- Extend `FxSection` with explicit animation runtime state and ensure save/reset/canonical paths retain it.
- Add deterministic animation command/resolver helpers, decode `.anm`/GIF frames from fetched asset bytes, and emit overlay blits.
- Register render built-ins with BuiltinDoc and wire `endAnimation` to the FX effect applier.
- Run frame advancement and sound posting in the engine `animation` phase via `EffectBus`.
- Add authored regression fixtures/tests for looping, one-shot, GIF R-10, per-frame audio and snapshot/restore; do not alter independent-oracle goldens.
