---
title: "Stock RPG dialogue event bridge: talked"
type: 'feature'
ticket: 12
created: '2026-10-22'
risk: "high"
context:
  - "spec - docs/spec/engine/actors.md (talked event)"
  - "spec - docs/spec/engine/rpgcode-modules-and-objects.md (EMIT-13, EMIT-21)"
  - "prerequisite - Epic 8 story 11, dialogue interaction completion producer"
---

## Intent

Move the blocked #564 follow-up out of Epic 20 and implement the package-owned bridge from the new Epic 8 dialogue completion signal to the existing actor event contract.

## Boundaries

`stock_rpg` package listener/bridge only. The interaction wrapper belongs to entry 11; the emitter, actor model and package loader are provided by Epic 20 and Epic 19 through Epic 8's whole-epic gate.

## Key decisions

Consume queued game-level `dialogue.completed` and emit one queued `talked` on the speaking actor, with plain scalar detail `{ actorId, targetId: actorId | null, text }`. Do not re-emit to game; listener isolation follows actor emitter scope.

## Acceptance

A completed interaction emits exactly one `talked` event with the agreed detail, interruption emits none, another actor's listener receives nothing, and restore does not duplicate queued delivery.

## Verification

Headless package startup with two actors and completed/interrupted fixtures verifies exact counts, order, detail and deterministic reset/snapshot/restore behavior.

## Tracker handoff

Retain `tracker_id = "#564"`; after the Epic 8 parent is created, reparent #564 to it, change title to `[8.12] Stock RPG dialogue event bridge: talked`, replace the Epic20 label with the Epic8 label, and update its prerequisite to entry 8.11.
