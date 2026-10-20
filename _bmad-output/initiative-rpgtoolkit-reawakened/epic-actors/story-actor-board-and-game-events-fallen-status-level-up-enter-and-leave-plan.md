---
title: "Actor, board and game events: fallen, status, leveledUp, enter and leave"
type: 'feature'
ticket: 9
created: '2026-10-19'
status: draft
baseline_revision: '0975a26b54f8d7bf569f463a02b783b16ec0ea98'
risk: "medium"
context:
  - "spec - docs/spec/engine/actors.md; emitter section (19.1)"
  - "code - packages/core/src/actors/, packages/core/src/world/"
  - "plan - epic-movement-triggers 5.9 (board edges and transitions)"
---

## Intent

Uses 19's emitters; 20.1 rules the event names and scalar payloads. Actors are registered by 20.4; this entry registers boards and owns actor/board/game event sources, including the engine-phase `beforeEnter` dispatch seam.

## Boundaries

Board and event sources only; actor object hydration and virtual writes are entry 4, core interpretation is entry 6, and package behaviour registration is entry 7.

## Key Decisions

1. No bubbling: re-emitting on the game is package code and uses the package namespace prefix (`stock_rpg.fallen`), not engine behaviour.
2. `beforeEnter` is an engine-originated, short, budgeted cancelable send under EMIT-11 and cannot wait for player input; `beforeDamage` is sent by a battle RPGCode thread with `emitCancelable`.
3. Board unload calls `unregisterEmitter`, dropping listeners for that board; a later board load registers a fresh emitter.

## Acceptance

1. Event sources and payloads match the ruling.

## Verification

Unit tests and a quest-script fixture.
