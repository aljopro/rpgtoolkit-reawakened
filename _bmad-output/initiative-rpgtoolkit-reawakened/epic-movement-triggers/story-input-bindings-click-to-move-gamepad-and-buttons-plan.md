---
title: 'Input bindings, click-to-move, gamepad and buttons'
type: 'feature'
ticket: 6
created: '2026-10-18'
status: 'built'
baseline_revision: '811635d4'
route: 'full'
route_source: 'pinned'
risk: 'medium'
review: ''
review_source: ''
lenses_ran: []
review_loop_iteration: 0
context:
  - 'docs/guardrails.md'
  - 'docs/spec/engine/display-input-audio.md#e-110'
  - 'docs/spec/engine/display-input-audio.md#e-111'
  - 'docs/spec/engine/display-input-audio.md#reawakened-gamepad-contract'
  - '_bmad-output/initiative-rpgtoolkit-reawakened/architecture-rpgtoolkit-reawakened/architecture-rpgtoolkit-reawakened.md#AD-14'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** The core currently records raw key and pointer state, but movement cannot consume configured bindings, pointer paths, normalized gamepad actions, or the button slots that Epic 4 renders.

**Approach:** Extend the existing `input` section and event union with deterministic binding state and a phase registration. Reuse the existing sequence claim/prune protocol, sprite path/movement APIs, and plain-data save state; keep host normalization outside core.

## Boundaries & Constraints

**Always:** Use logical integer pixels, fixed-tick state, monotonic key sequences, per-device gamepad edge state, half-open button hit tests, and JSON-safe section data. Keyboard, pointer, and gamepad actions share one held/edge state. Disconnected or unconnected gamepads are ignored.

**Never:** Add a second input section or queue/claim protocol; expose DOM, browser, native controller APIs, floats, timers, or host I/O; implement built-in forwarding owned by entry 5.7; change Epic 4 rendering or cursor-map behavior.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Keyboard edge | configured key down/up, optional repeat | one queue entry on a new press, held state follows down; repeat adds no entry | unbound keys ignored |
| Diagonal | two orthogonal held directions | diagonal only when enabled; disabled mode selects latest held direction | deterministic direction order |
| Gamepad | device 0..3, integer axes/buttons | dead-zone `<250`, d-pad/axes merge, same queue and held state; simultaneous edges device/bit order | invalid/never-connected/disconnected input ignored |
| Pointer | logical click and camera offset | enabled slot queues its action; disabled slot is swallowed; otherwise pathfinder queues player path to board pixel | half-open slot bounds |
| Restore | snapshot of extended input section | state, claims, device masks and next sequence restore identically | old raw section migrates to defaults |

</frozen-after-approval>

## Code Map

- `packages/core/src/ports/input.ts` -- published AD-14 event union; replace payload-free gamepad with the normalized plain-data E-112 shape.
- `packages/core/src/save/sections/input.ts` -- canonical JSON input section; retain raw fields and add bindings, devices, button slots, and click-to-move state with a schema version.
- `packages/core/src/input/input.ts` and `packages/core/src/input/index.ts` -- existing raw event application and claim/prune owner; extend this module, never create a parallel input owner.
- `packages/core/src/sprites/runtime.ts`, `packages/core/src/sprites/pathfinding.ts`, `packages/core/src/sprites/movement.ts` -- existing `enqueuePathMove`, path result, and direction queue APIs used by click and keyboard movement.
- `packages/core/src/engine/engine.ts` -- fixed `input` phase and registration seam; input registration runs after raw records are applied and before waits/movement.
- `packages/core/test/input.test.ts` -- existing monotonic sequence and focus tests; add exhaustive keyboard, pointer, gamepad, slots, batching, and snapshot cases.
- `tools/fixtures/movement/scenes-c.mjs`, `tools/fixtures/movement/input.mjs`, `packages/core/test/fixtures/movement/` -- authored `input-replay-button-slots` oracle and its per-tick facts; acceptance tests must drive core, not only the producer.

## Tasks & Acceptance

**Execution:**
- [ ] `packages/core/src/ports/input.ts` -- define normalized gamepad payload and input event typing -- keep host-independent replay data.
- [ ] `packages/core/src/save/sections/input.ts` -- migrate the input section schema and add plain-data configuration/runtime fields -- preserve old snapshots.
- [ ] `packages/core/src/input/input.ts` and `packages/core/src/input/index.ts` -- implement binding, edge, slot, gamepad, pointer path and shared claim/prune behavior -- make events deterministic.
- [ ] `packages/core/src/input/registration.ts` and `packages/core/src/index.ts` -- expose an input phase registration using sprite/path APIs -- keep engine phase ownership intact.
- [ ] `packages/core/test/input.test.ts` -- test all matrix cases, batching/latency invariance, and snapshot/restore -- protect G1/G3.
- [ ] `packages/core/test/fixtures/movement-input.test.ts` -- replay every in-scope fixture case against the real core and assert per-tick facts -- prevent oracle-only acceptance.
- [ ] plan implementation notes -- record proposed defaults/evidence and any fixture/spec correction -- preserve clean-room provenance.

**Acceptance Criteria:**
- Given configured keyboard events, when the input phase advances, then movement, activation, menu and runtime actions are distinct and sequence numbers increase once per edge.
- Given two held orthogonal directions, when diagonals are enabled/disabled, then the resulting intent is respectively diagonal/last-pressed-axis and repeat events do not duplicate it.
- Given normalized gamepad records, when devices connect, merge, release, or disconnect, then the contract's dead-zone, ordering, and shared held/edge state are observed exactly.
- Given logical pointer clicks, when a slot is hit or missed, then the slot action, swallow, or pathfinding queue result is deterministic and uses camera-adjusted board pixels.
- Given any supported input state, when snapshot/restore or advance batching changes, then subsequent state, queue, and key claims are identical.

## Implementation Notes
- Implemented the E-112 defaults as documented and marked unverified: dead-zone 250 on integer ±1000 axes, devices 0–3, and bits 0–6 up/down/left/right/confirm/cancel/menu. Rejected host API payloads and floating analogue values because they violate G2/G3.
- Input schema version 2 migrates raw v1 fields into binding/device/action defaults. Existing image-backed Epic 4 button values remain accepted for compatibility; new button slots are the exact `{ id, x, y, w, h, action, enabled }` shape.
- The fixture's unbound-key expectation is honored when bindings are configured; default raw input without bindings still queues named keys for script waits. Click destinations add the configured logical camera offset before `enqueuePathMove`.
- Acceptance coverage: `packages/core/test/movement-input.test.ts` executes every case and expected fact in `input-replay-button-slots.json` through `createInputSection`, `applyInputEvent`, and `processGamepadEvents`, including button edge/half-open hit testing, camera-adjusted clicks, dead-zone edges, multi-device merge/disconnect, diagonal policy, unbound/repeat keys, and monotonic queues.
- `snapshot`/`restore` and engine batching coverage passed; schema-dependent corpus and closing state hashes were deliberately refreshed because the input section now persists normalized bindings, gamepads, action state, and pending queues.

## Plan Change Log

## Review Triage Log

## Design Notes

Gamepad action bits are converted to named actions before binding filtering. A connected device stores its last normalized mask; aggregate held state is the union across connected devices and keyboard actions. A pointer path is queued through `enqueuePathMove`, so path cache and actor geometry remain owned by sprites/pathfinding.

## Verification

**Commands:**
- `pnpm exec tsc -p packages/core/tsconfig.json --noEmit` -- expected: success.
- `pnpm test -- packages/core/test/input.test.ts` -- expected: success.
- `pnpm fixtures:author -- --check` -- expected: success.
- Full repository gates from the ticket brief -- expected: success.
