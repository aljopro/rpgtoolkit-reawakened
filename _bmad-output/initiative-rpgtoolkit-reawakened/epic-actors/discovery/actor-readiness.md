---
type: discovery
title: "Readiness audit: actors and the core/battle boundary (epic 20)"
date: 2026-10-19
baseline_revision: 0975a26b54f8d7bf569f463a02b783b16ec0ea98
---

# Readiness audit: actors

| # | Finding | Evidence | Blocked entries |
|---|---|---|---|
| F-01 | Character stats have one owner: `vm.globals` behind `StatsPort` (E-85). AD-32 also lists a Stats Container on the Unified Actor. The two statements are not reconciled. | AD-10; AD-32; `plugins-and-battle.md` E-85 | 1, 3 |
| F-02 | The Unified Actor runtime for the player and board items is entry 5.3 (done); enemies, party members apart from the player, and statuses have no actor representation. | `epic-movement-triggers/story-unified-actor-and-sprite-runtime-state-plan.md` | 3, 10 |
| F-03 | The formats are read: character `.tem`, enemy `.ene`, item `.itm`, battle data `.bkg`, `.spc`, `.ste` (Epic 2 entries 6 and 7). Nothing maps their fields to rule owners. | `docs/spec/formats/character.md`, `enemy.md`, `item.md`, `battle-data.md` | 2, 5 |
| F-04 | E-79 already says rules belong in core and battle systems drive core operations; the 2026-10-18 note moved the entire battle to RPGCode; the 2026-10-19 ruling splits the two (core: data and defaults; package: the battle system). | `plugins-and-battle.md#e-79`; `epic-battle/discovery/all-rpgcode-battle-architecture.md` | 1 |
| F-05 | AD-26's phase list has a `battle` phase for `core/battle`. | AD-26 | Epic 7 inception |
| F-06 | E-75 puts the status "each round while charged" rule in the battle model; the owner moves it to the stock battle and keeps only the countdown in core. | E-75 | 1, 6 |
| F-07 | The original used `experienceIncrease` three different ways (R-16). | `epic-battle` Notes, R-16 | 1, 6 |
| F-08 | The save format has no actors section; closures save per 18.6. | `docs/spec/formats/save-game.md`; ADR 0004 18.6 | 8 |
| F-09 | Without a battle plugin battles end immediately and without a menu plugin the menu key does nothing; these are the only defined behaviours for the scaffold packages. | `plugins-and-battle.md` Plugin roles | 11 |
| F-10 | The main file's plugin rows name `tk3menu.dll` and `tk3fight.dll` by default. | `docs/spec/formats/main-file.md` rows 23, 24 | 12 |
