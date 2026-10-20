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

1. Add or amend `docs/spec/engine/actors.md` with anchored `ACT-*` rows. Each row MUST cite its normative evidence and name the owning/building entry (20.2 is the inventory owner; later rows own implementation).
2. Amend AD-10 so the actor section owns stats, `.tem` globals such as `HP!` and `Level!` are live aliases, protected aliases reject `kill()` with catchable `kill.system-owned`, read-only aliases reject writes with `assign.read-only`, and the deliberate save-golden/reset/virtual-write costs are recorded.
3. Amend AD-26 so the core phase list does not own battle (battle is a package), and record the default level-up equation as a core rule inherited by the stock battle package.
4. Specify the save boundary: actor records contain plain data and a behaviour name only; package and behaviour registrations are session data rebuilt by `runPackageStartup` before hydration; missing behaviours fall back to core defaults with a diagnostic; script closures remain the only saved callables under 18.6.
5. Specify the behaviour contract: separate `registerBehaviour(name, hooks)`, `namespace.name` names, a closed hook list, unknown names/hooks diagnosed, and behaviour-first then core-default resolution.
6. Settle EMIT-6, EMIT-11, EMIT-13 and OOP-12 with evidence and rejected alternatives: actor-id-or-null `source`; `fallen`, `revived`, `statusChanged`, `leveledUp`, `entered`, `left`, `talked`, `beforeEnter`, `beforeDamage`, and game `error`; namespace-prefixed shared-emitter re-emits; board-unload listener removal; short budgeted engine dispatch for `beforeEnter`; and battle-thread `emitCancelable` for `beforeDamage`.
7. Keep this checkpoint documentation-only and clean-room: no TypeScript, fixtures, generated output, or legacy source; every changed spec/spine row has a resolvable anchor and link.

## Verification

- Run the repository's link/anchor and documentation checks applicable to the changed files.
- Run `tickets.py` from the clean plan worktree to confirm ticket 20.1 remains `draft`, has no unmet prerequisites, and retains `plan_checkpoint = true` and `done_checkpoint = true`.
- Review the diff for documentation-only scope and G7 provenance compliance.
- Owner approval is required at both the plan and done checkpoints; do not mark `ready-for-dev` in this PR.
