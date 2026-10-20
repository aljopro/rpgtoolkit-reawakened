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

## Store and action boundary

Actor records are the store's plain-data state. Code does not call methods on
an actor record or mutate its fields directly. Actor operations are dispatched
through an action/service layer: an action identifies the requested operation
and its plain-data inputs; the actor service validates it, runs the applicable
core rule or behaviour, and commits the resulting plain-data patch to the
actor store. The store remains the single owner of actor state and produces
snapshots, hashes, and transition events from committed changes.

The action and service layers are runtime machinery and are not serialized into
the actor record. A hydrated RPGCode object may expose those operations as
methods, but each method dispatches through the actor service and never turns
the underlying record into an object with methods.

The action type is section-specific: `ActorAction` covers actor operations,
while `BoardAction`, `InventoryAction`, `BattleAction`, and the other core
sections use the same boundary for their own state. These are plain-data
discriminated records, not methods attached to records. Exact action members
are defined by the section that owns them.

This rule does not require a persistent-immutable implementation or a full
state-tree copy on every tick. An owner MAY update its private live store
in place, provided callers receive read-only views, only the owner mutates
the store, and snapshots, hashes, saves, restores, and action results observe
the same deterministic committed state.

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
registerBehaviour("stock-rpg.hero", hooks)
```

Behaviour names use a hyphenated package namespace followed by a dot and a
behaviour identifier (`namespace.name`). The hook list is closed and defined by
core. Unknown behaviour names, unknown hooks, malformed names, wrong namespaces,
and duplicate registrations produce located diagnostics and register nothing.
Registrations are session data, rebuilt at boot, reset, and restore before actor
hydration.

A behaviour hook takes the actor as an explicit argument. The actor is the
canonical plain-data read view; the hydrated RPGCode object wrapper is a
separate runtime object and owns method dispatch. No method, emitter, host
object, or callable is stored directly on the serialized actor record. Hooks
may emit queued events. A hook invoked by a script thread may use ordinary
script waits or cancelable event dispatch. An engine-originated hook is
synchronous and non-waiting; interactive follow-up belongs in an event listener.

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

## Actor inventory {#act-inventory}

This is the canonical 20.2 inventory. Each persisted source field appears once; runtime
state appears once in the runtime table. `OWNER` marks a choice that requires owner-epic
approval rather than an inferred legacy rule. `core-rule` means the actor store owns the
interpretation; `battle-rule` means Epic 7 owns it. “Writer” identifies the only layer
permitted to mutate the value (a script may request a mutation through that owner).

### Source fields

| Name | Source field | Type | Actor-section owner | Legacy alias | Writer | Rule | Evidence | Builder |
|---|---|---|---|---|---|---|---|---|
| display name | character.name / enemy.name | string | identity | `Name$` | core/actor script | core-rule | [character layout](../formats/character.md#layout) 3; [enemy layout](../formats/enemy.md#layout) 3 | 20.3/20.5 |
| experience | character.experienceVar + initial experience | int | progression | `Experience!` | core/actor script | core-rule | [character](../formats/character.md#layout) 4,13 | 20.3/20.6 |
| defence | character.defenseVar + defense | int | stats | `DP!` | core/actor script | core-rule | [character](../formats/character.md#layout) 5,13 | 20.3/20.6 |
| fight power | character.fightVar + fight | int | stats | `FP!` | core/actor script | core-rule | [character](../formats/character.md#layout) 6,13 | 20.3/20.6 |
| current HP | character.healthVar + health / enemy.hp | int | stats | `HP!` | core/battle operation | core-rule | [character](../formats/character.md#layout) 7,13; [enemy](../formats/enemy.md#layout) 4 | 20.3/20.6/Epic 7 |
| maximum HP | character.maxHealthVar + maxHealth / enemy.hp | int | stats | `MaxHP!` | core/equipment/level-up | core-rule | [character](../formats/character.md#layout) 8,13; [enemy](../formats/enemy.md#layout) 4 | 20.3/20.6 |
| actor name variable | character.nameVar | string variable reference | identity | `NameVar$` | core | core-rule | [character](../formats/character.md#layout) 9 | 20.5 |
| current SMP | character.smVar + sm / enemy.smp | int | stats | `SMP!` | core/battle operation | core-rule | [character](../formats/character.md#layout) 10,13; [enemy](../formats/enemy.md#layout) 5 | 20.3/20.6/Epic 7 |
| maximum SMP | character.smMaxVar + smMax / enemy.smp | int | stats | `MaxSMP!` | core/equipment/level-up | core-rule | [character](../formats/character.md#layout) 11,13; [enemy](../formats/enemy.md#layout) 5 | 20.3/20.6 |
| level | character.levelVar + level | int | progression | `Level!` | core/level-up/script | core-rule | [character](../formats/character.md#layout) 12,13 | 20.3/20.6 |
| portrait | character.profilePic | asset reference | presentation | OWNER | hydration/editor | core-rule | [character](../formats/character.md#layout) 14 | 20.5/20.10 |
| special-move slots | character specialMove.file/minExp/minLevel/condition variable/required value (×201) | array of records | abilities | OWNER | core hydration/script | core-rule | [character](../formats/character.md#layout) 15a–e | 20.5/20.6 |
| special-move menu label | character.specialMoveName | string | abilities | OWNER | hydration/editor | core-rule | [character](../formats/character.md#layout) 16 | 20.5 |
| special-move flag | character.smYN | byte | abilities | OWNER | hydration | core-rule | [character](../formats/character.md#layout) 17 | 20.5 |
| accessory slots | character accessory slot name (×11) | array<string> | equipment | OWNER | core/equipment script | core-rule | [character](../formats/character.md#layout) 18 | 20.5/20.6 |
| armour-slot usage | character armour slot used (×7) | array<boolean> | equipment | OWNER | core/equipment | core-rule | [character](../formats/character.md#layout) 19 | 20.5/20.6 |
| first-level threshold | character.levelType | int | progression | `LevelType!` | core | core-rule | [character](../formats/character.md#layout) 20 | 20.6 |
| threshold increase | character.experienceIncrease | short | progression | `ExperienceIncrease!` | core | core-rule | [character](../formats/character.md#layout) 21 | 20.6 |
| maximum level | character.maxLevel | int | progression | `MaxLevel!` | core | core-rule | [character](../formats/character.md#layout) 22 | 20.6 |
| level HP increase | character.levelHp | short | progression policy | OWNER | core/behaviour | core-rule | [character](../formats/character.md#layout) 23 | 20.6/20.7 |
| level DP increase | character.levelDp | short | progression policy | OWNER | core/behaviour | core-rule | [character](../formats/character.md#layout) 23 | 20.6/20.7 |
| level FP increase | character.levelFp | short | progression policy | OWNER | core/behaviour | core-rule | [character](../formats/character.md#layout) 23 | 20.6/20.7 |
| level SMP increase | character.levelSm | short | progression policy | OWNER | core/behaviour | core-rule | [character](../formats/character.md#layout) 23 | 20.6/20.7 |
| level-up program | character.levelUpProgram | program reference | progression | OWNER | editor conversion/script | core-rule | [character](../formats/character.md#layout) 25; [actor precedence](#progression) | 20.6/20.7 |
| level-up mode | character.levelUpType | byte | progression policy | `LevelUpType!` | core | core-rule | [character](../formats/character.md#layout) 26 | 20.6 |
| enemy run permission | enemy.canRun | byte | battle traits | `ENE_CANRUN` | Epic 7 | battle-rule | [enemy](../formats/enemy.md#layout) 8; [E-71](plugins-and-battle.md#e-71) | Epic 7 |
| enemy take-crit denominator | enemy.takeCrit | short | battle traits | `ENE_TAKECRIT` | Epic 7 | battle-rule | [enemy](../formats/enemy.md#layout) 9; [E-74](plugins-and-battle.md#e-74) | Epic 7 |
| enemy give-crit denominator | enemy.giveCrit | short | battle traits | `ENE_GIVECRIT` | Epic 7 | battle-rule | [enemy](../formats/enemy.md#layout) 10; [E-74](plugins-and-battle.md#e-74) | Epic 7 |
| enemy special moves | enemy.special moves | array<asset reference> | abilities | `ENE_SPC` | hydration/Epic 7 | battle-rule | [enemy](../formats/enemy.md#layout) 11 | 20.5/Epic 7 |
| weaknesses | enemy.weaknesses | array<asset reference> | battle traits | `ENE_WEAK` | Epic 7 | battle-rule | [enemy](../formats/enemy.md#layout) 12 | Epic 7 |
| strengths | enemy.strengths | array<asset reference> | battle traits | `ENE_STRONG` | Epic 7 | battle-rule | [enemy](../formats/enemy.md#layout) 13 | Epic 7 |
| AI level | enemy.ai | byte | battle traits | `ENE_AI` | Epic 7 | battle-rule | [enemy](../formats/enemy.md#layout) 14; [AI table](plugins-and-battle.md#enemy-ai) | Epic 7 |
| custom AI enabled | enemy.useCode | byte | battle traits | `ENE_USECOD` | Epic 7 | battle-rule | [enemy](../formats/enemy.md#layout) 15 | Epic 7 |
| custom AI program | enemy.prg | program reference | battle traits | `ENE_PRG` | Epic 7 | battle-rule | [enemy](../formats/enemy.md#layout) 16 | Epic 7 |
| experience reward | enemy.exp | int | rewards | `ENE_EXP` | Epic 7 | battle-rule | [enemy](../formats/enemy.md#layout) 17; [E-77](plugins-and-battle.md#e-77) | Epic 7 |
| gold reward | enemy.gp | int | rewards | `ENE_GP` | Epic 7 | battle-rule | [enemy](../formats/enemy.md#layout) 18 | Epic 7 |
| victory program | enemy.winPrg | program reference | battle traits | `ENE_WINPRG` | Epic 7 | battle-rule | [enemy](../formats/enemy.md#layout) 19 | Epic 7 |
| run-away program | enemy.runPrg | program reference | battle traits | `ENE_RUNPRG` | Epic 7 | battle-rule | [enemy](../formats/enemy.md#layout) 20 | Epic 7 |
| character/enemy animations | animation slots and custom stance pairs | arrays<asset reference/label> | presentation | OWNER | hydration | core-rule | [character](../formats/character.md#layout) 28–35; [enemy](../formats/enemy.md#layout) 21–24 | 20.5/20.10 |
| movement timing | character.idleTime/speed; item.speed/idleTime | double | movement | OWNER | core/movement | core-rule | [character](../formats/character.md#layout) 31–33; [item](../formats/item.md#layout) 25–27 | 20.10 |
| collision/activation hulls | character/item polygons | point arrays | movement | OWNER | hydration/movement | core-rule | [character](../formats/character.md#layout) 36–40; [item](../formats/item.md#layout) 30–32 | 20.5/20.10 |
| item identity and description | item.itemName/description | string | inventory | OWNER | inventory owner | core-rule | [item](../formats/item.md#layout) 3–4; [E-81](plugins-and-battle.md#e-81) | 20.3/20.5 |
| item permissions | item.equipYN/menuYN/boardYN/fightYN/usedBy/allowed character | bytes/array<string> | inventory | OWNER | inventory/equipment | core-rule | [item](../formats/item.md#layout) 5–7 | 20.3/20.6 |
| item prices/key flag | item.buyPrice/sellPrice/keyItem | int/int/byte | inventory | OWNER | inventory/menu | core-rule | [item](../formats/item.md#layout) 8–9 | 20.3 |
| item equipment slots/bonuses | item equip slot, accessory, equipHP/equipDP/equipFP/equipSM | array/strings/ints | equipment | OWNER | equipment owner | core-rule | [item](../formats/item.md#layout) 10–12; [E-82](plugins-and-battle.md#e-82) | 20.6 |
| item equip/remove programs | item.prgEquip/prgRemove | program references | equipment | OWNER | equipment owner | core-rule | [item](../formats/item.md#layout) 13 | 20.6 |
| item menu effect/program | item.menuHP/menuSM/prgMenuUse | ints/program reference | inventory | OWNER | inventory owner | core-rule | [item](../formats/item.md#layout) 14–15 | 20.6 |
| item battle effect/program | item.fightHP/fightSM/prgFightUse | ints/program reference | inventory | OWNER | Epic 7 | battle-rule | [item](../formats/item.md#layout) 16–17 | Epic 7 |
| item animation/board programs | item.animation/prgOnBoard/prgPickUp | asset/program references | movement | OWNER | hydration/board | core-rule | [item](../formats/item.md#layout) 18–20 | 20.5/20.10 |
| status identity and duration | status.name/rounds | string/short | statuses | OWNER | core status owner | core-rule | [status](../formats/battle-data.md#status-effect) 3–4 | 20.3/20.6 |
| status charge modifiers | status.speed/slow/disable | short flags | statuses | OWNER | Epic 7 | battle-rule | [status](../formats/battle-data.md#status-effect) 5–7; [E-75](plugins-and-battle.md#e-75) | Epic 7 |
| status HP/SMP tick | status.hp/hpAmount/smp/smpAmount | flags/shorts | statuses | OWNER | Epic 7 | battle-rule | [status](../formats/battle-data.md#status-effect) 8–11 | Epic 7 |
| status program | status.code/prg | flag/program reference | statuses | OWNER | Epic 7 | battle-rule | [status](../formats/battle-data.md#status-effect) 12–13 | Epic 7 |

### Runtime state (5.3 actor)

| Name | Source field | Type | Actor-section owner | Legacy alias | Writer | Rule | Evidence | Builder |
|---|---|---|---|---|---|---|---|---|
| stable id | runtime actor.id | scalar | identity | OWNER | actor store | core-rule | [ACT-1](#actor-contract-entries) | 20.3 |
| source asset/kind | runtime actor.source/kind | asset reference/enum | identity | OWNER | hydration | core-rule | [actor data](#actor-data-and-identity) | 20.5 |
| current/max stats | runtime actor.stats | plain-data record | stats | aliases above | actor owner | core-rule | [actor data](#actor-data-and-identity) | 20.3/20.6 |
| statuses/counters | runtime actor.statuses | map<status, counter> | statuses | OWNER | actor status operation | core-rule | [actor data](#actor-data-and-identity) | 20.6 |
| equipment-derived state | runtime actor.equipment/equipment bonuses | plain-data record | equipment | OWNER | equipment owner | core-rule | [ACT-3](#actor-contract-entries) | 20.3/20.6 |
| progression state/policy | runtime actor.progression | plain-data record | progression | aliases above | actor/behaviour | core-rule | [Progression](#progression) | 20.6/20.7 |
| behaviour name | runtime actor.behaviour | string or absent | identity | OWNER | hydration/registry | core-rule | [behaviours](#behaviours-and-hydration) | 20.7/20.8 |
| declared custom events | runtime actor.customEvents | array<string> | identity | OWNER | hydration | core-rule | [custom events](#custom-actor-events) | 20.5/20.9 |
| transform/facing/visual | runtime actor.transform/facing/visual | plain-data records | movement/presentation | OWNER | movement/runtime | core-rule | Epic 5 unified actor plan, implementation notes | 20.10 |
| collision/activation bases | runtime actor.collision/activation | point arrays | movement | OWNER | movement/runtime | core-rule | Epic 5 unified actor plan, implementation notes | 20.10 |
| movement queue/waypoints | runtime actor.movement | plain-data queue | movement | OWNER | movement/runtime | core-rule | Epic 5 unified actor plan, implementation notes | 20.10 |
| board loading visibility | runtime actor.visible/loading | boolean/state | movement | OWNER | board/runtime | core-rule | Epic 5 unified actor plan, implementation notes | 20.10 |
| compact item handle | runtime item actor index/handle | integer | inventory | OWNER | hydration/runtime | core-rule | Epic 5 unified actor plan, implementation notes | 20.10 |

### Deterministic equations

| Name | Source field | Type | Actor-section owner | Legacy alias | Writer | Rule | Evidence | Builder |
|---|---|---|---|---|---|---|---|---|
| derived stat | equipment/base stat | int | stats | corresponding stat alias | core | core-rule | [ACT-3](#actor-contract-entries), [E-82](plugins-and-battle.md#e-82) | 20.6 |
| next level threshold | levelType, experienceIncrease, levelUpType | int | progression | OWNER | core | core-rule | [progression](progression-and-levels.md) | 20.6 |
| level-up growth | levelHp/levelDp/levelFp/levelSm + levelUpType | int | progression | OWNER | core/behaviour | core-rule | [character](../formats/character.md#layout) 23,26; [progression](progression-and-levels.md) | 20.6/20.7 |
| damage taken | attacker FP, target DP, crit, variance | int | battle operation | OWNER | Epic 7 | battle-rule | [E-74](plugins-and-battle.md#e-74) | Epic 7 |

Defaults are deterministic: missing numeric stats start at zero (except format-declared
defaults), HP/SMP mutations clamp to `[0,max]`, `fallen` is `HP <= 0`, and the core uses
the progression arithmetic in [progression-and-levels.md](progression-and-levels.md).
Behaviour hooks may replace derived-stat, level-up, revival, status, or equipment results;
the stock battle package may replace damage and charge rules. Random variance requires the
injected seeded RNG; no equation may read wall-clock time or an ambient RNG.
