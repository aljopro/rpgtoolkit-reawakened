---
type: discovery
title: "Inception proposal: epic-actors (epic 20)"
date: 2026-10-20
baseline_revision: 5fce842c0f6ae46a40b7fb767540dce1f25da73
---

# Inception proposal: Actors (epic 20)

## 1. Scope restatement

Epic 20 builds one actor model for party members, NPCs, enemies and board sprites, with core-owned data and interpretation rules, behaviour overrides, name-based hydration on load and the two stock package shells with their `.gam` mapping. The 2026-10-20 audit against `origin/main` found that package loading is not built, so that work is a new Epic 19 follow-up (19.16), not 20.11. Epic 20 therefore consumes the host package loader, the 19.8 start-up lifecycle, 19.12's emitter registration seam and the 19.2 spike result. The decisions below are recorded in the envelope Notes and the owner markers identify choices still awaiting Jensen.

## 2. Decision table

| ID | Item | Taken | If ruled otherwise |
|---|---|---|---|
| D-01 | Core versus battle boundary | Owner decision: core owns actor data and game-independent interpretation; stock_battle owns ATB, damage, AI and UI | Epic 7's boundary and 20.1/20.6 change |
| D-02 | Save rule: data and a behaviour name only | Owner decision; callables remain only in script closure state per 18.6 | Save schema and hydration change |
| D-03 | Hydration by name; missing behaviour is default plus diagnostic | Owner decision; package start-up rebuilds the session registry before hydration | Restore ordering changes |
| D-04 | `.gam` plugins mapping | Owner decision; legacy rows map in memory, templates write `packagePlugins` | 20.12 mapping and template behavior change |
| D-05 | Stats ownership (A-1) | Actor section owns stats, StatsPort is a view, aliases are live | 20.3 and 20.4 invert the bridge |
| D-06 | Package distribution (A-2) | Host catalogue and `stock/` source folder, referenced by name; loader is 19.16 | 20.11 changes its source and startup seam |
| D-07 | Party or battle as emitters (A-3) | No; game, boards and actors only | 20.9 gains additional sources |
| D-08 | `experienceIncrease` rule (A-4) | 20.1 rules one default equation; 20.6 implements it as a hook | 20.6 follows another equation |
| D-09 | Spike result | Applied in 20.1: one fighter thread or core accumulator; one-tick cancelable resume cost | Stock battle scheduling changes |
| D-10 | Package loading follow-up | Owner decision, 2026-10-20: 19.16 owns manifest entry → source/start-up `ProgramRef`, version/namespace, boot/reset/restore, and located unresolved diagnostics; 20.11 consumes it | 20.11 would need to own the loader, which is explicitly rejected |
| D-11 | Behaviour registration | Owner decision, 2026-10-20: separate `registerBehaviour(name, hooks)`, closed hook list, `namespace.name` names, session data rebuilt at package start-up, actor stores name only | 20.7 would extend `registerPlugin` and/or save registrations |
| D-12 | Engine-originated cancelable events | Owner decision, 2026-10-20: EMIT-11 is settled in 20.1; 20.9 implements the engine-side `beforeEnter` send and reusable short budgeted seam; Epic 21 consumes it for `beforePlay` | 20.9 or 21.4 would need a duplicated or deferred dispatch path |
| D-13 | Package-name grammar | Owner decision, 2026-10-20: package names and namespaces use lower-case ASCII hyphenated identifiers (`^[a-z][a-z0-9-]*$`, with no leading or trailing hyphen); stock ids are `stock-battle` and `stock-menu`; behaviour names use dotted `namespace.name`, for example `stock-rpg.hero` | 19.6 parser and namespace derivation must accept hyphens |
| D-14 | Host object hydration and protected names | Owner decision, 2026-10-20: serialized actors never contain methods, host objects, emitters, or callables; 20.4 exposes a separate hydrated RPGCode object wrapper whose session method table generalizes OOP-12; `kill.system-owned` and `assign.read-only` are runtime errors | Putting methods directly on actor data would break plain-data serialization and save determinism |
| D-15 | Standard events | Owner decision, 2026-10-20: `statusChanged` replaces `status`, `beforeDamage` and `talked` are added, `source` is an actor id or null, shared-emitter re-emits carry a package prefix, board unload drops listeners | EMIT-13 table and 20.9 verification change <!-- OWNER: confirm names and unload policy --> |

## 3. Breakdown

| # | Title | after | hitl | Risk |
|---|---|---|---|---|
| 1 | Rulings: actor boundary, behaviours, save rule and hydration | 19.1, 19.2 | yes | high |
| 2 | Actor model inventory: every stat and state, its source, type, writer and rule owner | 1, 2.6, 2.7, 5.3 | yes | high |
| 3 | Actor store: party members, enemies and NPCs as plain-data actors | 2 | no | high |
| 4 | Actors as RPGCode objects with emitters | 3, 19.4, 19.10, 19.12 | no | high |
| 5 | Load actors from character, enemy, item and status data | 3, 2.6, 2.7 | no | medium |
| 6 | Core interpretation rules: fallen, status countdown, equipment bonuses, level-up | 5 | no | high |
| 7 | Behaviour registration and override precedence | 6, 4, 19.8, 19.16 | no | high |
| 8 | Save and hydrate actors by behaviour name | 7, 18.6, 19.16 | no | high |
| 9 | Actor, board and game events: fallen, status, leveledUp, enter and leave | 4, 6, 19.11, 19.12, 5.9, 20.1 | no | high |
| 10 | NPCs and board sprites as actors with behaviours | 7, 5.3 | no | medium |
| 11 | stock_battle and stock_menu package scaffolds | 8, 19.6, 19.9, 19.16 | no | medium |
| 12 | .gam plugins mapping: stock packages in templates and legacy DLL names | 11, 19.9, 19.16 | no | medium |
| 13 | Two battle scripts over one actor model, with goldens | 8, 9, 10, 11, 12 | no | high |
| 14 | Refactor sweep | 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13 | no | low |

Lanes: A core/actors (3, 5, 6, 7, 8, 10), B script bindings (4), C packages and `.gam` (11, 12). 3 owns the actors barrel and the section; 4 owns actor host-object hydration and the virtual write path; 9 owns board emitter lifecycle and engine-phase cancelable dispatch. 19.16 owns the package catalogue seam, so 20.11 does not duplicate it.

## 4. Cross-epic `after` wiring

| Entry | Names | Initiative `after` needed |
|---|---|---|
| 20.1 | 19.1, 19.2 | epic 19 |
| 20.2 | 2.6, 2.7, 5.3 | epics 2, 5 |
| 20.4 | 19.4, 19.10, 19.12 | epic 19 |
| 20.7, 20.8 | 19.8, 19.16 | epic 19 |
| 20.8 | 18.6 | epic 18 |
| 20.9 | 19.11, 19.12, 5.9, 20.1 | epics 19, 5 |
| 20.11, 20.12 | 19.6, 19.9, 19.16 | epic 19 |

Initiative `[[epic]]` 20 after: epic 19, epic 2, epic 5, epic 18. The epic-19 `after` needs text must name 19.16's package catalogue and start-up seam. Epic 21's `beforePlay` entry consumes the engine-phase seam and should add 20.9 to its `after` when that epic is re-baselined.

## 5. Parallelism

20.1 and 20.2 are checkpoints. After 20.2 lane A runs 3 then 5, 6, 7, 8, 10; 20.4 runs beside it after 20.3 and the 19.12 emitter seam; 20.11 waits for 19.16 and 20.8; 20.9 owns the engine-phase cancelable seam before Epic 21.4 consumes it.

## 6. Validation rounds

Round 1 (author, 2026-10-19): `tickets.py status` and `next` run; the original breakdown was clean before the audit.

Round 2 (self-review against `validate-checks.md`, Ticket, Set, Dependencies; 2026-10-19): the original status/next were clean. Fixed before this re-baseline: 20.9's cancelable damage-taken check pins 19.11 and its board emitter uses 19.12's seam.

Round 3 (audit against `origin/main` at 5fce842c, 2026-10-20): independent Epic 19 object/package/emitter audits found the missing package loader, underscore-only grammar, missing OOP-12 runtime hydration, absent protected-name runtime errors, TypeScript's non-cancelable effect boundary, and EMIT-13 naming/lifetime gaps. Added 19.16; rewrote 20.1, 20.3, 20.4, 20.6, 20.7, 20.8, 20.9, 20.11, 20.12 and 20.13; added F-11–F-14 to `actor-readiness.md`; updated initiative pins.

Round 4 (independent reviewer, 2026-10-20): the reviewer found three material items: add tracker `#540` to 19.16, add `19.16` to the stock package and `.gam` mapping `after` lists, and align stock package names with the underscore-only grammar. All three were fixed; the dependency list also changed 20.9's self-reference from string `"20.1"` to same-epic entry `1`.

Round 5 (independent reviewer, 2026-10-20): PASS. The reviewer found no material Ticket, Set or Dependencies defects; 19.16 has tracker `#540`, required Epic 20 loader pins and underscore package IDs are consistent, and no undeclared references, cycles or order conflicts were found.
