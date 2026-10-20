---
type: discovery
title: "Readiness audit: actors and the core/battle boundary (epic 20)"
date: 2026-10-20
baseline_revision: 5fce842c0f6ae46a40b7fb767540dce1f25da73a
---

# Readiness audit: actors

| # | Finding | Evidence | Blocked entries |
|---|---|---|---|
| F-01 | Character stats have one owner: `vm.globals` behind `StatsPort` (E-85). AD-32 also lists a Stats Container on the Unified Actor. The two statements are not reconciled. | AD-10; AD-32; `plugins-and-battle.md` E-85 | 1, 3 |
| F-02 | The Unified Actor runtime for the player and board items is entry 5.3 (done); enemies, party members apart from the player, and statuses have no actor representation. | `epic-movement-triggers/story-unified-actor-and-sprite-runtime-state-plan.md` | 3, 10 |
| F-03 | The formats are read: character `.tem`, enemy `.ene`, item `.itm`, battle data `.bkg`, `.spc`, `.ste` (Epic 2 entries 6 and 7). Nothing maps their fields to rule owners. | `docs/spec/formats/character.md`, `enemy.md`, `item.md`, `battle-data.md` | 2, 5 |
| F-04 | E-79 already says rules belong in core and battle systems drive core operations; the 2026-10-18 note moved the entire battle to RPGCode; the 2026-10-19 ruling splits the two (core: data and defaults; package: the battle system). | `plugins-and-battle.md#e-79`; `epic-battle/discovery/all-rpgcode-battle-architecture.md` | 1 |
| F-05 | AD-26's phase list has a `battle` phase for `core/battle`. | AD-26 | Epic 7 inception |
| F-06 | E-75 puts the status "each round while charged" rule in the battle model; the owner moves it to the stock_battle and keeps only the countdown in core. | E-75 | 1, 6 |
| F-07 | The original used `experienceIncrease` three different ways (R-16). | `epic-battle` Notes, R-16 | 1, 6 |
| F-08 | The save format has no actors section; closures save per 18.6. | `docs/spec/formats/save-game.md`; ADR 0004 18.6 | 8 |
| F-09 | Without a battle plugin battles end immediately and without a menu plugin the menu key does nothing; these are the only defined behaviours for the scaffold packages. | `plugins-and-battle.md` Plugin roles | 11 |
| F-10 | The main file's plugin rows name `tk3menu.dll` and `tk3fight.dll` by default. | `docs/spec/formats/main-file.md` rows 23, 24 | 12 |
| F-11 | 19.6 accepts only `/^[a-z_][a-z0-9_]*$/`, so the planned stock ids with hyphens and slash behaviour names cannot parse; the smallest compatible choice is underscore ids and dotted behaviour names. | `packages/core/src/script/manifest.ts:148-196`; `rpgcode-modules-and-objects.md` PKG-2, PKG-7 | 1, 7, 11, 12 |
| F-12 | 19.9 appends bare `{ id }` package entries; boot resolves only `NATIVE_PACK_TABLE`, no entry-program field exists, and no production engine path calls `runPackageStartup`; only corpus `startups` does. | `packages/core/src/engine/boot.ts:62-103`; `script/manifest.ts:43`; `script/plugin.ts:140`; `script/package-startup.ts:37`; `runner-harness/src/corpus.ts:817-866` | 1, 7, 8, 11, 12, 13 |
| F-13 | Generic OOP-12 host-type hydration is specified but `ObjectRecord` has no type field and only emitter methods are hard-coded; `kill.system-owned` and `assign.read-only` are specified but not raised by runtime code. | `rpgcode-modules-and-objects.md:337-349`; `packages/core/src/script/state.ts:56-62`, `vm.ts:652-656`, `virtuals.ts:10-12` | 1, 4, 8 |
| F-14 | EMIT-11 is proposed, TypeScript cannot send cancelable events, and EMIT-13 lacks rows for `beforeDamage` and `talked` while naming `status` contrary to its past-tense rule; board unload listener lifetime is implicit in `unregisterEmitter`. | `rpgcode-modules-and-objects.md:131-138,195-200`; `events/emitter.ts:103` | 1, 9, 13, Epic 21.4 |

F-12 is the new Epic 19 follow-up 19.16. F-11 is recorded as owner assumption A-6; F-13's generic host-type mechanism is owned by 20.4 rather than adding a new Epic 19 ticket. F-14's engine-phase dispatch is owned by 20.9 for `beforeEnter`; Epic 21.4 consumes that seam for `beforePlay`.
