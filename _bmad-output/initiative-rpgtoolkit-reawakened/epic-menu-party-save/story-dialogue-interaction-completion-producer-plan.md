---
title: "Dialogue interaction completion producer"
type: 'feature'
ticket: 11
created: '2026-10-22'
risk: "high"
context:
  - "spec - docs/spec/engine/plugins-and-battle.md#e-95"
  - "spec - docs/spec/engine/rpgcode-modules-and-objects.md#emit-13"
  - "handoff - Epic 4 ticket 4.21 / issue #406"
---

## Intent

Provide the explicit interaction owner that the existing `talked` event lacked: an Epic 8 RPGCode wrapper around Epic 4.21's message/modal and input-wait commands.

## Boundaries

Wrapper command/API and queued game-level completion only. Epic 4 continues to own message/modal UI; Epic 20 owns actor records and emitter registry; entry 12 owns the stock package bridge.

## Key decisions

The user-approved `dialogue.completed` payload is plain scalar `{ actorId, targetId: actorId | null, text }`. The wrapper takes text from its explicit argument, captures source/target from the running VM context, and emits after normal completion only; cancellation or errors produce no signal.

## Acceptance

A script invokes the wrapper, displays the exact caller text, and produces one completion event with correct actor IDs; interrupted, failed or targetless interactions follow the ruled behavior and survive snapshot/restore mid-wait.

## Verification

A deterministic headless fixture checks event queue ordering/detail, both interruption and normal-return branches, source/target context and restore at each wait tick.

## Implementation map

Reuse the existing 4.21 UI and wait contracts; introduce no metadata callback in Epic 4 and keep the signal event distinct from renderer-level `render.msgbox` and `menu.screen`.
