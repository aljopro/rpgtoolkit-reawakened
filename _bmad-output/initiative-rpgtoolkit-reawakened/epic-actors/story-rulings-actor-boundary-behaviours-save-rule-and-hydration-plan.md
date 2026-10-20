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

Rule before code. New page `docs/spec/engine/actors.md` (anchored ACT-n rows) plus amendments: E-79 gains the core-versus-battle boundary; AD-10 says actors own stats and `.tem` globals such as `HP!` are live aliases; AD-26's core `battle` phase is removed or repurposed because battle is a package; the save rule is data plus behaviour name only; behaviour registrations are session data rebuilt by package start-up and never saved; and EMIT-6, EMIT-11, EMIT-13 and OOP-12 are settled for Epic 20. The row also fixes the `kill.system-owned` rule, the scalar actor-id event source, the event names `statusChanged`, `beforeDamage` and `talked`, namespace-prefixed shared-emitter re-emits and board-emitter unload lifetime. Level-up remains a core default equation; stock_battle owns charge, damage formulas, AI, UI and its round-specific status rule.

## Boundaries

Documentation only. Does not decide the per-field table (20.2) or any package content (Epic 7).

## Key Decisions

1. A Zelda-style game with 12 hearts and an FF-style game with 9999 HP are two battle scripts over one actor model.
2. Actors save DATA only: stats, status counters, a behaviour name such as `stock_rpg.hero`; never callables.
3. On load, `runPackageStartup` rebuilds package and behaviour session data before actor hydration; a missing behaviour is the core default plus a diagnostic, never a refused load; actors record no package version.
4. `registerBehaviour(name, hooks)` is separate from `registerPlugin`; names use `namespace.name`, the hook list is closed, unknown names/hooks diagnose, and package code may still emit custom events.
5. Engine-originated `beforeEnter` dispatch uses EMIT-11's short, budgeted, non-waiting path; `beforeDamage` is sent by the battle RPGCode thread with `emitCancelable`; `beforePlay` consumes the same engine-phase seam in Epic 21.
6. Script closures (parked threads, locals) stay saved per 18.6; script state is the only place callables are saved.

## Acceptance

1. The ACT rows exist, are anchored and cite evidence.
2. AD-10 amended as ruled; the costs are written.
3. AD-26 amendment written; default level-up equation ruled.
3. Every row names the entry that builds it.

## Verification

Link and anchor check; owner approval at plan and done checkpoints.
