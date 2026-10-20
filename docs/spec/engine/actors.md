# Actors, progression, behaviours, and hydration

This page defines the Reawakened actor model for party members, enemies, NPCs, and board sprites. An actor is plain data owned by the actor section. RPGCode and packages receive an actor view and request changes through the actor owner; they do not keep a second copy of actor state.

## Core and battle boundary

The core owns actor data and the interpretation rules that are true for any game:

- actor identity, stats, statuses, equipment-derived bonuses, and progression state;
- the default `fallen` state (`HP <= 0`), status countdown, equipment interpretation, and level-up policy;
- actor snapshot, restore, hashing, and hydration;
- actor events that describe core state transitions.

The stock battle package owns battle-specific systems: charge and turn order, damage formulas, AI, battle UI, rewards timing, and the meaning of a battle round. A battle script chooses when `advanceStatus(n)` is called. The core does not own a battle scheduler.

A `battle` save section MAY hold transient, saveable package data, but that section does not create a core `battle` tick phase. Random encounter evaluation is a trigger-phase responsibility and may start a custom fight program or the stock battle package.

## Actor data and identity

Every runtime actor has one stable scalar `id` and plain-data fields. The stable id is the save and event identity. A script object handle and an emitter registration key such as `actor:<id>` are rebuilt runtime identities and are never used as saved actor ids.

A runtime actor MAY contain:

- source asset and kind (`party`, `enemy`, `npc`, or board sprite);
- current and maximum stats, including level and total experience;
- status counters and equipment-derived state;
- progression state and actor-owned progression policy data;
- a behaviour name, or no behaviour name;
- declared custom event names from the source asset.

It MUST NOT contain a callable, compiled program, host object, emitter listener table, or raw `.prg` path. Host methods and emitters are hydrated after load.

## Progression

The authoritative compatibility arithmetic is [Experience, rewards, and level progression](progression-and-levels.md). In summary:

- `levelType` is the initial XP requirement for the first level-up;
- `experienceIncrease` is the later-threshold parameter;
- `levelUpType = 0` selects percentage-labelled stat growth and percentage threshold growth;
- `levelUpType = 1` selects fixed-point stat growth and direct threshold growth;
- percentage threshold growth truncates after calculating `oldThreshold * experienceIncrease / 100`;
- a non-empty legacy `levelUpProgram` takes precedence over a behaviour `levelUp` hook.

Modern actors MAY store explicit progression policy data. A policy is plain data; it can tune the supported core modes without storing executable code. A resolved behaviour can replace or patch the core result. The precedence is:

```text
legacy levelUpProgram, when non-empty
→ behaviour levelUp hook
→ actor progression policy
→ legacy levelType/experienceIncrease compatibility policy
→ core defaults
```

A behaviour that supplies `levelUp` receives the actor and a plain-data context, including the XP award and core proposal. It returns a plain-data patch. Omitted fields mean unchanged; `undefined` is invalid and `null` is not an implicit unchanged marker. Stat changes use deltas where possible. The core validates and applies the final result, then emits `leveledUp`.

## Behaviours and hydration

A package registers behaviours separately from `registerPlugin` during package startup:

```text
registerBehaviour("namespace.name", hooks)
```

Behaviour names use `namespace.name`. The hook list is closed and defined by core. Unknown behaviour names, unknown hooks, malformed names, wrong namespaces, and duplicate registrations produce located diagnostics and register nothing. Registrations are session data, rebuilt at boot, reset, and restore before actor hydration.

A behaviour hook takes the actor as an explicit argument. The actor is the canonical read view; the owner applies the returned plain-data result. Hooks may emit queued events. A hook invoked by a script thread may use ordinary script waits or cancelable event dispatch. An engine-originated hook is synchronous and non-waiting; interactive follow-up belongs in an event listener.

A save stores actor data and a behaviour name only. On load, package startup rebuilds the session registry and hydration resolves the name. A missing behaviour uses the core default and emits one located diagnostic; it never refuses the save. Package versions and executable code are not stored in actor data.

## Behaviour hooks

The core hook surface includes:

- `levelUp(actor, context)`: returns a plain-data result patch; omitted fields do not change the core proposal;
- `revive(actor, context)`: may alter the synchronous revival result;
- `statusChanged(actor, context)`: may alter a status transition result;
- `equipmentChanged(actor, context)`: may alter equipment-derived stat results;
- `statsChanged(actor, context)`: may alter derived-stat results.

These core-originated hooks do not wait. `levelUp` may wait only when it is invoked from a script thread, such as a script-driven XP award. The core owns validation, mutation, state transitions, and event emission.

## Standard actor and board events

Notifications use past-tense lowerCamelCase names. Core actor and board events are:

| Event | Emitter | Cancelable | Ownership |
|---|---|---:|---|
| `fallen` | actor | no | core, only on transition into fallen |
| `revived` | actor | no | core, on transition out of fallen |
| `statusChanged` | actor | no | core status operation |
| `leveledUp` | actor | no | core after applying the final level-up result |
| `entered` | actor/board | no | board transition |
| `left` | actor/board | no | board transition |
| `talked` | actor | no | dialogue or actor package |
| `beforeEnter` | board | yes | board transition; canceled step does not happen |
| `beforeDamage` | actor/battle operation | yes | battle RPGCode thread, not a core actor rule |

`fallen` detail contains `cause` (`damage`, `status`, or `script`) and `source` (an actor id or `null`). `defeated` belongs to the stock battle package and is not a core actor event. Package events re-emitted on shared emitters receive the package namespace prefix.

An unloaded board unregisters its emitter and drops its listeners. Queued work targeting that emitter is stale and is discarded; it does not keep the board or its actors alive.

## Legacy stat aliases

Legacy `.tem`-named stat globals such as `HP!` and `Level!` are live read/write aliases to the actor-owned stat. They are not copies. Writes resolve through the actor owner. A write to a read-only alias raises `assign.read-only`; `kill()` on an actor stat alias or another protected system name raises catchable `kill.system-owned` and changes nothing.

## Custom actor events

An actor-producing asset MAY declare custom event names. Declarations are asset data read during hydration and are not copied into the saved actor record. Any event string remains valid at runtime; an undeclared event produces the tooling/runtime diagnostic defined by EMIT-12 but still dispatches. Custom declarations may not reuse reserved standard-event names.

## Actor contract entries

| Entry | Contract | Builder |
|---|---|---|
| ACT-1 | Actor identity is one stable scalar id; runtime handles and emitter keys are not save ids. | 20.3 |
| ACT-2 | Actor state is plain data; executable programs, host objects, listeners, and raw `.prg` paths are hydrated runtime concerns. | 20.8 |
| ACT-3 | The actor owns current/max stats, statuses, equipment-derived state, and progression state. | 20.3, 20.6 |
| ACT-4 | `levelType`, `experienceIncrease`, and `levelUpType` use the compatibility arithmetic in [progression-and-levels.md](progression-and-levels.md). | 20.6 |
| ACT-5 | A non-empty legacy `levelUpProgram` takes precedence over modern behaviour and policy selection. | 20.6, 20.7 |
| ACT-6 | Behaviour hooks receive the actor and return validated plain-data patches; omitted fields mean unchanged. | 20.7 |
| ACT-7 | Core-originated hooks do not wait; script-thread invocation may wait through the script scheduler. | 20.6, 20.7 |
| ACT-8 | Core owns actor mutation and emits actor transition events after applying validated results. | 20.6, 20.9 |
| ACT-9 | Board unload unregisters emitters and discards queued work targeting the unloaded board. | 20.9 |
| ACT-10 | The core has no battle phase; battle-package systems run through package threads and trigger handoff. | 20.6, Epic 7 |

## Evidence and ownership

The actor model inventory is entry 20.2. The actor store is 20.3; script object exposure and aliases are 20.4; asset hydration is 20.5; core interpretation rules are 20.6; behaviour registration is 20.7; save and hydration are 20.8; events and board emitter lifetime are 20.9; board-sprite unification is 20.10. Epic 7 owns stock-battle behavior, and the editor epics own warnings and conversion of legacy `levelUpProgram` values.
