---
type: discovery
title: "Inception proposal: epic-menu-party-save (epic 8)"
date: 2026-10-22
baseline_revision: 7fe9f1fb0aaa362fe4d40ce4b00854fd97d07033
---

# Inception proposal: Menu, party, inventory and saves (Epic 8)

## Scope and decisions

Epic 8 retains its CAP-10/CAP-11 menu and canonical-save outcomes and adds the approved CAP-5/CAP-9 dialogue interaction completion producer and `talked` bridge. The user approved this expansion and moving #564 from Epic 20 on 2026-10-22. This rehome resolves a real dependency cycle: Epic 8 waits on Epic 20, so an Epic 20 story cannot wait on an Epic 8 producer.

The approved event seam is a queued game-level plain-data `dialogue.completed` event carrying `{ actorId, targetId: actor id or null, text }`; an Epic 8-owned RPGCode wrapper queues it only after normal interaction completion. The `stock_rpg` package consumes it and emits actor-scoped `talked`. Epic 4.21 (#406) supplies existing message/modal UI and input waits, not actor/text metadata; Epic 8 owns wrapper semantics. Entry 1 writes this contract into normative docs before runtime implementation.

## Breakdown

| # | Story | after | Purpose |
|---|---|---|---|
| 1 | Rulings: menu ownership, save compatibility and dialogue completion | — | Human-led docs-only ruling and normative spec/spine amendments |
| 2 | Menu state sections and owner ports | 1, 3.11, 5.3, 20.3 | Tracer: plain-data sections, reset/snapshot/restore seam |
| 3 | Party operations and RPGCode built-ins | 2, 20.3 | Party roster and adapters over actor-owned state |
| 4 | Inventory, equipment, gold and event operations | 2, 3, 20.6 | Canonical owner API and events |
| 5 | Item use, equip and remove programs | 4, 7.5 | Shared operation for menu, board and battle |
| 6 | Shop and inn operations | 4 | Composed inventory/gold/party behavior |
| 7 | Default menu controller, input waits and replacement seam | 2, 3, 4, 3.9, 4.19, 4.21, 20.11 | Saveable routing, waits and package boundary |
| 8 | Default menu screens and player-facing behaviors | 5, 6, 7, 9, 10, 21.5 | All E-80 paths and screen behavior, using implemented save/load operations |
| 9 | Save operation and canonical game serialization | 2, 3, 4, 7, 3.11, 5.9, 7.2 | Canonical save output and board permission |
| 10 | Load validation, restore order and thread continuation | 9 | Validated restore and deterministic continuation |
| 11 | Dialogue interaction completion producer | 1, 3.9, 4.19, 4.21 | Wrapper and queued completion signal |
| 12 | Stock RPG dialogue event bridge: talked (#564) | 11, 20.15 | Bridge to actor-scoped event |
| 13 | Refactor sweep | 1–12 | Remove duplication/reconcile ownership after implementation |
| 14 | Epic 8 end-to-end acceptance | 1–13 | Full capability play-throughs, save replay and integration proof |

## Dependencies and lanes

Epic 8 keeps whole-epic dependencies on 3, 4, 5, 7, 20 and 21. Cross-epic pins are assigned only to stories using each provider: 3.9/3.11, 4.19/4.21, 5.3/5.9, 7.2/7.5, 20.3/20.6/20.11/20.15 and 21.5. Epic 20 supplies actor, emitter and package-loader infrastructure; Epic 4.21 supplies message/modal behavior only. Moving #564 to Epic 8 removes the Epic20→Epic8→Epic20 cycle.

The tracer is story 2 through a real party mutation and canonical section snapshot. Inventory/event work (4–6), controller/screens (7–8), save/load (9–10) and dialogue bridge (11–12) are lanes after their shared contract/ports. Entry 13 is cleanup only; entry 14 closes the integrated suite, including a real Epic 7 battle item use through the shared inventory operation.

## Open rulings

Entry 1 still settles legacy `.sav` import scope and the thread-restore compatibility rule, and finishes the exact wrapper entry point and menu/party/inventory port names. It must not change the user-approved event shape or ownership. No implementation proceeds before those docs decisions land.

## Validation history

- Author draft: mapped E-80–87, E-120–123 and CAP-10/11, then added the approved dialogue producer/bridge and moved #564 to avoid the dependency cycle.
- Independent review (Ticket, Set, Dependencies): one P2 found entry 8 consumed Save/Load but did not wait on entries 9–10; added both dependencies and clarified the handoff. Re-review confirmed the fix closes the gap without a cycle.
- Epic ticket checks: 14 backlog entries, no epic problems or drift; `next` lists only 8.1. Initiative validation still reports the unrelated, pre-existing malformed `plan-rpgcode-oop-parser-goldens.md` plan and skips it; this inception did not edit that file.
- Owner-approved issue publication: Epic parent #582 and stories 8.1–8.14 are in the roadmap project with Todo status and no sprint assigned; #564 is reparented as 8.12, with its Epic 20 label removed and Epic 8 label applied.
