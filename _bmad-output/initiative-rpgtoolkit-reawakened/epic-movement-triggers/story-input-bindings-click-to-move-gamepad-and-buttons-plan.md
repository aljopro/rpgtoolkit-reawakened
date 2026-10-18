---
title: 'Input bindings, click-to-move, gamepad and buttons'
type: 'feature'
ticket: 6
created: '2026-10-18'
status: 'draft'
baseline_revision: 'd53cdd804d5f93525c2aa4e444bc848e75f550a5'
risk: 'medium'
context:
  - 'docs/spec/engine/display-input-audio.md#e-110'
  - 'docs/spec/engine/display-input-audio.md#e-113'
  - '_bmad-output/initiative-rpgtoolkit-reawakened/architecture-rpgtoolkit-reawakened/architecture-rpgtoolkit-reawakened.md, AD-14'
  - '_bmad-output/initiative-rpgtoolkit-reawakened/epic-board-rendering/epic-board-rendering.md'
---

## Intent
Complete the movement-facing input surface over Epic 4's raw input state.

## Boundaries
Own configured movement/activation/menu/runtime bindings, held diagonals, pointer click-to-move, approved normalized gamepad behavior and button slots. Do not own host device APIs or cursor-map rendering.

## Key Decisions
Preserve the canonical input log and sequence-number claims; pointer coordinates are logical pixels; gamepad is the bounded E-112 addition approved by entry 1.

## Acceptance
Recorded keyboard/pointer/gamepad input replays identically, diagonal eligibility is correct, click-to-move queues a path, and the input-section primitives preserve one claim/prune protocol for key sequence numbers and button state. Movement/input built-in forwarding is verified by entry 7.

## Verification
Input replay, batching/latency fuzz and focused input-section primitive tests; entry 7 owns the built-in contract tests.
