---
title: "Party operations and RPGCode built-ins"
type: 'feature'
ticket: 3
created: '2026-10-22'
risk: "high"
context:
  - "spec - docs/spec/engine/movement-and-collision.md#e-85"
  - "spec - docs/spec/engine/actors.md"
---

## Intent

Expose party roster operations and documented player/party RPGCode built-ins over Epic 20's actor model through the Epic 8 party owner. The party section owns membership, order, selection and steps; the actor section remains authoritative for each member's stats, progression, status, equipment-derived state, board position and graphics.

## Normative data contract

- Party membership is an ordered list of at most five distinct stable actor ids. Every id names a live `party` actor. A non-empty roster selects exactly one member id; an empty roster selects `null`.
- The roster index is the party slot used by the compatibility virtuals `playerhandle[0..4]`, `playerx[0..4]`, `playery[0..4]`, and `playerlayer[0..4]`. They are read-through views, never copied party state.
- Selection is stored by stable actor id, not slot number. The selected member is the visible/controlled player. A first member added to an empty roster becomes selected; later additions do not change selection. Removing or destroying the selected member selects the member now occupying its old index, or the last remaining member if that index is past the end. Removing the final member sets selection to `null`. Reordering preserves selection by actor id.
- Adding/restoring appends to roster order; restoration appends the previously removed member. Restore never duplicates an id already in the roster.
- The party state is snapshot/restored as the ordered member ids, selected id and steps in the version-2 `party` section. Referenced actors and all their stats restore through the actor section; no duplicate actor stats or script-global party-stat store is permitted.
- The party owner validates roster and actor references before commit. Invalid actor kind/reference, duplicate membership, more than five members, a selected id absent from the roster, or a non-null selection for an empty roster is refused without partial writes. RPGCode adapters preserve the function catalogue's forms; the owner port reports `{ ok: false, error: { path, message } }`. A no-op leaves state unchanged and emits no event.

## RPGCode compatibility contract

The existing function catalogue supplies these public forms and semantics:

| RPGCode form | Contract |
| --- | --- |
| `addplayer(file)` | Add the character-file-backed player to the party. |
| `removeplayer(handle)` | Remove that party member from the active roster, retaining it for the documented old-player/restore behavior. |
| `restoreplayer(filename)` | Restore a player previously on the team to the roster. |
| `destroyplayer(handle)` | Permanently remove the player from the party. The actor's post-removal lifecycle is not extended beyond the party ownership contract. |
| `activeplayer(variant handle)` | Choose or read the active player; selection is stored by stable player handle. This plan adds no argument or return form beyond the function catalogue. |
| `newplyr(file)` / `newplayer(file)` | Change the main player's graphics from a character file; `newplayer` aliases `newplyr`. This does not replace actor identity, stats, or roster position. |

`playerhandle[0..4]` and the player position virtuals are compatibility
read-throughs of ordered party slots. No alias creates or stores a second
version of actor stats. Existing forms retain their catalogue spelling and
argument types; this plan does not add a new public function name or signature.

## Roster changes and events

Party event types and closed plain-data details are:

| Type | Detail |
| --- | --- |
| `memberAdded` | `{ actorId, index }` |
| `memberRemoved` | `{ actorId, index }` |
| `membersSwapped` | `{ firstActorId, secondActorId, firstIndex, secondIndex }` |
| `activeMemberChanged` | `{ previousActorId, currentActorId }` |

Actor ids are stable actor ids; indexes are zero-based positions in the
committed roster. Restoring a previously removed actor emits `memberAdded`.
All four events are non-cancelable and emitted on the built-in `party`
emitter, once and only after their corresponding mutation commits. A refused
operation or no-op emits nothing. A reorder with identical resulting order
and a selection of the already selected actor are no-ops. Each operation is
atomic across party membership/selection and actor-state references.

The story's party query/action surface to a replacement menu uses the approved
object-valued read-only context plus named actions validated and applied by
core. Its exact public members, arguments/results and RPGCode façade are not
part of this story's settled public contract; do not invent menu method names.
Menu-specific member shapes remain a required 8.7 plan contract before menu
implementation. The 8.3 roster owner is exercised via its existing owner port
and the documented RPGCode built-ins only.

## One compatibility decision still requiring owner ruling

`callplayerswap(...)` is listed as unimplemented and a no-op in the function
catalogue, while this story requires party-position swapping. The documents
give no argument list or legacy meaning for that command. Do not invent a
signature or silently turn the compatibility no-op into a different operation.
Owner must decide whether `callplayerswap` stays a no-op (and swapping remains
an owner-internal/menu action only) or is intentionally given a new, explicitly
specified RPGCode contract. Until ruled, the roster contract above defines
the semantic swap and its event but no RPGCode spelling for it.

## Boundaries

Roster membership, active-member selection, slot ordering, actor linkage and the listed party-facing RPGCode adapters only. Inventory, menu navigation/presentation, and battle fighter state are out of scope. Menu APIs are not chosen by this plan.

## Acceptance

A deterministic RPGCode fixture exercises add/remove/restore/destroy/select and
swap through only the documented forms/owner actions; checks roster cap,
refusal atomicity, no-op behavior, actor linkage, selected actor behavior,
compatibility virtuals and event payload/ordering; and confirms actor stats
remain in the actor section.

## Verification

Assert operation results, boundary diagnostics, built-in registration, exact
party and actor snapshots, each successful event exactly once after commit,
zero events for refused/no-op operations, and identical post-restore behavior.
Retain existing actor tests unchanged.

## Implementation map

Build on the section/port contracts from entry 2 and actor operations from
Epic 20. Keep aliases thin and preserve the documented RPGCode calling
convention.
