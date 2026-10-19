---
type: discovery
title: "Inception proposal: epic-actors (epic 20)"
date: 2026-10-19
baseline_revision: 0975a26b54f8d7bf569f463a02b783b16ec0ea98
---

# Inception proposal: Actors (epic 20)

## 1. Scope restatement

Epic 20 builds one actor model for party members, NPCs, enemies and board sprites, with core-owned data and interpretation rules, behaviour overrides, name-based hydration on load and the two stock package shells with their `.gam` mapping. It depends on Epic 19 (objects, packages, emitters) and the 19.2 spike. The decisions are the owner's 2026-10-19 rulings, recorded in the envelope Notes.

## 2. Decision table

| ID | Item | Taken | If ruled otherwise |
|---|---|---|---|
| D-01 | Core versus battle boundary | Owner decision | n/a |
| D-02 | Save rule: data and a behaviour name only | Owner decision | n/a |
| D-03 | Hydration by name; missing behaviour is default plus diagnostic | Owner decision | n/a |
| D-04 | `.gam` plugins mapping | Owner decision | n/a |
| D-05 | Stats ownership (A-1) | Actor section owns, StatsPort is a view | 20.3 and 20.4 invert the bridge |
| D-06 | Package distribution (A-2) | `stock/` source folder, referenced by name | 20.11 changes |
| D-07 | Party or battle as emitters (A-3) | No | 20.9 gains sources |
| D-08 | `experienceIncrease` rule (A-4) | 20.1 picks one | 20.6 follows |
| D-09 | Spike result | Applied in 20.1 | Design changes before 20.3 |

## 3. Breakdown

| # | Title | after | hitl | Risk |
|---|---|---|---|---|
| 1 | Rulings: actor boundary, behaviours, save rule and hydration | 19.1, 19.2 | yes | high |
| 2 | Actor model inventory: every stat and state, its source, type, writer and rule owner | 1, 2.6, 2.7, 5.3 | yes | high |
| 3 | Actor store: party members, enemies and NPCs as plain-data actors | 2 | no | high |
| 4 | Actors as RPGCode objects with emitters | 3, 19.4, 19.10 | no | high |
| 5 | Load actors from character, enemy, item and status data | 3, 2.6, 2.7 | no | medium |
| 6 | Core interpretation rules: fallen, status countdown, equipment bonuses, level-up | 5 | no | high |
| 7 | Behaviour registration and override precedence | 6, 4, 19.8 | no | high |
| 8 | Save and hydrate actors by behaviour name | 7, 18.6 | no | high |
| 9 | Actor, board and game events: fallen, status, level-up, enter and leave | 4, 6, 19.11, 19.12, 5.9 | no | medium |
| 10 | NPCs and board sprites as actors with behaviours | 7, 5.3 | no | medium |
| 11 | stock-battle and stock-menu package scaffolds | 8, 19.6, 19.9 | no | medium |
| 12 | .gam plugins mapping: stock packages in templates and legacy DLL names | 11, 19.9 | no | medium |
| 13 | Two battle scripts over one actor model, with goldens | 8, 9, 10, 11, 12 | no | high |
| 14 | Refactor sweep | 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13 | no | low |

Lanes: A core/actors (3, 5, 6, 7, 8, 10), B script bindings (4), C packages and `.gam` (11, 12). 3 owns the actors barrel and the section.

## 4. Cross-epic `after` wiring

| Entry | Names | Initiative `after` needed |
|---|---|---|
| 20.1 | 19.1, 19.2 | epic 19 |
| 20.2 | 2.6, 2.7, 5.3 | epics 2, 5 |
| 20.4 | 19.4, 19.10 | epic 19 |
| 20.7 | 19.8 | epic 19 |
| 20.8 | 18.6 | epic 18 |
| 20.9 | 19.11, 19.12, 5.9 | epics 19, 5 |
| 20.11, 20.12 | 19.6, 19.9 | epic 19 |

Initiative `[[epic]]` 20 after: epic 19, epic 2, epic 5, epic 18.

## 5. Parallelism

20.1 and 20.2 are checkpoints. After 20.2 lane A runs 3 then 5, 6, 7, 8, 10; 20.4 runs beside it after 20.3; 20.11 can start once 20.8 is done.

## 6. Validation rounds

Round 1 (author, 2026-10-19): `tickets.py status` and `next` run; results recorded in the PR.
Round 2 (self-review against validate-checks.md, Ticket, Set, Dependencies; 2026-10-19): `status` and `next` clean. Findings fixed: 20.9's cancelable damage-taken check needs the cancelable emit (19.11), now pinned explicitly; 20.9 creates the per-board emitters through 19.12's seam rather than assuming Epic 19 built them.
