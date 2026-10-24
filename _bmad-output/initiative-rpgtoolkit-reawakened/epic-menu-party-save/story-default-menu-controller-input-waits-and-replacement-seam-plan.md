---
title: "Default menu controller, input waits and replacement seam"
type: 'feature'
ticket: 7
created: '2026-10-22'
risk: "high"
context:
  - "spec - docs/spec/engine/plugins-and-battle.md#e-80"
  - "spec - docs/spec/engine/plugins-and-battle.md#e-95"
  - "handoff - Epic 4 ticket 4.21 / issue #406"
status: blocked
blocked_at: "2026-10-24"
blocked_reason: "Awaiting owner ratification of the exact menu façade contract required before coding by the plan and E-80; do not implement until ratified."
---

## Intent

Build the deterministic controller that turns a menu key, `InternalMenu(n)` or direct screen request into a saveable `menu.screen` wait and a replaceable `stock_menu` implementation.

## Boundaries

Own routing, menu state, input selection and wait/resume behavior. Epic 4 owns message/modal UI and board/input delivery; the menu renderer replays draw lists only.

## Acceptance

Scripted input opens each screen both directly and through the main menu, observes the ruled replacement path, and resumes waiting scripts at the same tick after snapshot/restore.

## Verification

Exercise screen request values, unsupported requests, exit behavior, repeated keys, modal wait and reset through a real headless script; compare state hashes and subsequent input consumption.

## Contract required before coding

Specify this menu consumer's exact public object/member names, named action capabilities, arguments, results, operation semantics, and validation/error behavior. The context is object-valued and read-only; core validates/applies named actions. Specify equivalent semantics for TypeScript and RPGCode without inventing public API names or shapes in this shared ruling.

## Implementation map
Use the party, inventory and menu ports from entry 2 and the built-in operations from entries 3–4. Keep `render.msgbox` distinct from `menu.screen` and do not put loop/state ownership in a renderer.
