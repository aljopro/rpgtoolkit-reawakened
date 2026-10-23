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
status: done
---

## Intent

Before runtime implementation, make the Epic 8 ownership, menu interface, save/load and dialogue contracts normative. The owner approved the CAP-5/CAP-9 dialogue work and queued `dialogue.completed` payload `{ actorId, targetId: actor id or null, text }`; this story records that decision rather than reopening it.

## Boundaries

Docs and architecture spine only. No code, tests, ticket reshaping, or implementation of the wrapper.

## Accepted rulings (owner-approved, 2026-10-22)

1. Core owns authoritative party, inventory, equipment, gold and menu state. Each state section owns its validated actions; actor-owned stats remain in the actor section.
2. The `stock_menu` package owns replaceable menu navigation and presentation. Both TypeScript and RPGCode menu implementations receive equivalent semantic query/action capabilities through one shared contract, with language-appropriate calling syntax. The core validates and applies requested actions. Menu presentation contributes to the core draw list; menu code does not mutate section state or draw directly to a host window.
3. Epic 8 implements the Reawakened canonical save format only. Legacy `.sav` import is deferred.
4. Restore saved threads from serialized state only when source/compiler compatibility matches. On mismatch, restart the thread from source rather than resuming incompatible compiled instruction state. Existing callable/owner validation still applies: if a changed program leaves an unresolved saved callable reference, reject the save with the existing located restore error rather than silently discarding callable state.
5. `dialogue.completed` is a queued game-level event with plain-data detail `{ actorId, targetId, text }`, where `targetId` is an actor id or `null`. Normal interaction-wrapper completion emits it once; cancellation or failure emits none. The stock RPG package consumes it and emits actor-scoped `talked`.
6. Epic 8 owns `itemAdded`, `itemRemoved` and `goldChanged`; align the standard-event table and built-in emitter surface with the chosen section ownership. This does not decide additional event semantics beyond those already specified.

*Rejected:* direct package mutation of party/inventory/equipment/gold/menu state, menus drawing directly to a host window, or making the host UI own game rules. These split authority and bypass deterministic core state/draw-list behavior.

## Deferred to implementation-ticket contracts

The exact menu query/action member names, argument/result records and RPGCode calling syntax are not fixed here. Each implementation ticket MUST specify those shapes and their validation/error behavior before implementation begins. Since RPGCode now has first-class objects, that work SHOULD evaluate an object-valued callback/capability façade carrying methods and contextual state against a flat callback list; the TypeScript surface should expose equivalent semantics. This is a design direction, not a ruled member shape.

<!-- OWNER: Before dependent implementation tickets start, define exact menu query/action members and data shapes in those tickets, keeping this shared semantic contract and core-owned validation invariant. Also decide whether party and inventory are built-in emitters (EMIT-8) and pin item/gold event detail records (EMIT-13). -->

## Evidence

| Ruling | Evidence |
| --- | --- |
| Core owns rules/state; replaceable menu owns navigation/presentation | `docs/spec/engine/plugins-and-battle.md` E-80 and `docs/guardrails.md` G2, G4 |
| Thread continuation must respect compiler/source compatibility | `docs/spec/formats/save-game.md` R-13 and field 46; `docs/spec/engine/rpgcode-language.md` restore compatibility checks |
| Dialogue completion is plain queued event data; actor bridge belongs to stock package | `docs/spec/engine/rpgcode-modules-and-objects.md` EMIT-13 and Epic 8 dialogue plans |
| Legacy import is explicitly deferred | `docs/spec/formats/save-game.md` R-13 / E-122 |

## Acceptance

The docs-only PR records accepted/deferred decisions and rejected alternatives, includes this evidence table and `OWNER` marker, and updates the affected spec and spine sections before dependent runtime work is ready.

## Verification

Review the rendered spec and spine, confirm the exact payload and event ownership across each reference, and run ticket-tree validation after the written dependency model is updated.
