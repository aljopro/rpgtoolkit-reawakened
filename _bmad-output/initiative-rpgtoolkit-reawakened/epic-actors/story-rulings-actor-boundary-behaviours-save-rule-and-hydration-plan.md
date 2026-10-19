---
title: "Rulings: actor boundary, behaviours, save rule and hydration"
type: 'feature'
ticket: 1
created: '2026-10-19'
status: draft
baseline_revision: '0975a26b54f8d7bf569f463a02b783b16ec0ea98'
risk: "high"
context:
  - "spec - docs/spec/engine/plugins-and-battle.md#e-79 and E-72 to E-78, E-85"
  - "spec - docs/spec/formats/character.md, enemy.md, item.md, battle-data.md"
  - "spine - _bmad-output/initiative-rpgtoolkit-reawakened/architecture-rpgtoolkit-reawakened/architecture-rpgtoolkit-reawakened.md, AD-10, AD-26, AD-32"
  - "discovery - _bmad-output/initiative-rpgtoolkit-reawakened/epic-battle/discovery/all-rpgcode-battle-architecture.md (narrower reading superseded)"
  - "discovery - _bmad-output/initiative-rpgtoolkit-reawakened/epic-rpgcode-platform/discovery/step-budget-spike.md"
---

## Intent

Rule before code. New page `docs/spec/engine/actors.md` (anchored ACT-n rows) plus amendments: E-79 gains the boundary sentence aligned with 'rules in core, battle systems drive core ops'; AD-10's StatsPort sentence is amended to say how actor stats are owned (Assumption A-1); AD-26's core `battle` phase is removed or repurposed (owner, 2026-10-19: battle is a package, not a core phase) and 20.1 writes that spine amendment; AD-10's StatsPort sentence stays open until the owner has a recommendation. Level-up: level and experience are stats, abilities are standard equations defined in code with defaults and overridable by behaviours; 20.1 rules the default level-up equation. Core-owned defaults: fallen (default HP <= 0), status lifetime as a countdown `advanceStatus(n)` (the battle script decides when a round passes), equipment bonuses, level-up default from data. Everything specific to one battle implementation (charge +3/tick, 75/123, damage formulas, AI levels 0 to 3, UI, the 3.1 'each round while charged' status rule) is stock-battle RPGCode.

## Boundaries

Documentation only. Does not decide the per-field table (20.2) or any package content (Epic 7).

## Key Decisions

1. A Zelda-style game with 12 hearts and an FF-style game with 9999 HP are two battle scripts over one actor model.
2. Actors save DATA only: stats, status counters, a behaviour name such as `stock-rpg/hero`; never callables.
3. On load behaviours are hydrated by name from installed packages; a missing behaviour is the core default plus a diagnostic, never a refused load; package version governs code.
4. Script closures (parked threads, locals) stay saved per 18.6; script state is the only place callables are saved.

## Acceptance

1. The ACT rows exist, are anchored and cite evidence.
2. StatsPort ownership: a recommendation is delivered to the owner (the conflict is left open until then); A-1 is carried.
3. AD-26 amendment written; default level-up equation ruled.
3. Every row names the entry that builds it.

## Verification

Link and anchor check; owner approval at plan and done checkpoints.
