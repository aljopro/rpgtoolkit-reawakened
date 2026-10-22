---
title: "Rulings: menu ownership, save compatibility and dialogue completion"
type: 'feature'
ticket: 1
created: '2026-10-22'
risk: "high"
context:
  - "spine - AD-7, AD-10, AD-11, AD-17, AD-23"
  - "spec - docs/spec/formats/save-game.md (R-13, E-122)"
  - "spec - docs/spec/engine/plugins-and-battle.md (E-80 to E-87, E-95, E-123)"
  - "spec - docs/spec/engine/rpgcode-modules-and-objects.md (EMIT-8, EMIT-13)"
---

## Intent

Before runtime implementation, make the Epic 8 ownership and save/load contracts normative. The owner approved the CAP-5/CAP-9 dialogue work and queued `dialogue.completed` payload `{ actorId, targetId: actor id or null, text }`; this story records that decision rather than reopening it.

## Boundaries

Docs and architecture spine only. No code, tests, ticket reshaping, or implementation of the wrapper.

## Decisions to record

1. Party, inventory, equipment, gold and menu state have one section/port owner each; actor-owned stats remain in the actor section.
2. State whether legacy `.sav` import is included; retain the project's own canonical save format.
3. Resolve save thread continuation, including matching-source and incompatible-compiler cases, against AD-7 and the normative save specification.
4. Specify the Epic 8-owned RPGCode interaction wrapper surface and how it uses Epic 4.21's existing UI/wait behavior. It carries caller text and VM source/target context; it does not extend Epic 4.21 with actor metadata.
5. Record `dialogue.completed` as queued game-level plain data `{ actorId, targetId: actor id or null, text }`; normal wrapper completion emits once, cancellation/failure emits none, and the stock package consumes it to emit actor-scoped `talked`.
6. Align EMIT-8/EMIT-13 and save/reset/restore behavior with the above ownership.

## Acceptance

The doc-only PR includes an evidence table, accepted/deferred decisions and rejected alternatives, `<!-- OWNER: ... -->` markers for decisions that remain, and updates the affected spec and spine sections before dependent runtime work is ready.

## Verification

Review the rendered spec and spine, confirm the exact payload and event ownership across each reference, and run ticket-tree validation after the written dependency model is updated.
