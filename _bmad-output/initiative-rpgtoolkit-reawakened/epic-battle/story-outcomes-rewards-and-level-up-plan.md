---
title: "Outcomes, rewards and level-up: win, run and lose"
type: 'feature'
ticket: 8
created: '2026-10-19'
status: draft
baseline_revision: '4255ec6f520af495d3aa2db8ed2553cb685ea3ab'
risk: "high"
context:
  - "spec - docs/spec/engine/battle.md as ruled by 7.1 (BAT-8, BAT-12)"
  - "spec - docs/spec/engine/plugins-and-battle.md#e-71, #e-77"
  - "spec - docs/spec/engine/movement-and-collision.md#e-78"
  - "spec - docs/spec/engine/rpgcode-modules-and-objects.md (EMIT-13)"
  - "spec - docs/spec/engine/actors.md as ruled by 20.1 (the default level-up equation)"
---

## Intent

Resolve a battle's outcome and apply the rewards and consequences E-77 and E-78 state. The package reports the outcome with `battle.finish(code)`; the core applies the automatic paths (run, win, lose) and the package handles the two plugin outcomes (1 and 3). Experience goes to every party member, gold is posted as one inventory effect, level-up uses the 20.6 default, and `defeated` is emitted once per enemy.

## Boundaries

No damage, status or AI (7.5 to 7.7). No inventory implementation: gold is a plain-data effect that Epic 8 consumes. No menus or save UI. The level-up equation is 20.1's; this entry calls it and does not write a second curve.

## Key Decisions

1. **Who applies what.** Codes 0 (run), 2 (win) and 4 (lose) are automatic and applied by the core after `finish(code)`. Codes 1 and 3 are package-handled: the package has already run the custom path and the core does nothing. A code outside 0-4 is rejected at `finish`.

2. **Run.** Outcome 0 runs the run-away program, if the encounter registers one, and returns to the board. The battle track stops and the board's music is re-posted from `boardKey` (7.10). Running never awards gold or experience and never emits `defeated`.

3. **Win.** Outcome 2 sums each enemy's gold and posts one `{ kind: "inventory.gainGold", amount }` effect; grants each enemy's experience to every party member; for each member that crosses a level threshold, calls the 20.6 default level-up (runs the level-up program and raises max HP, DP, FP and max SMP without refilling current values); shows the gold and level-up messages in the ruled order; then runs the defeat program(s) the encounter names (one per enemy where present). R-16 is the single `experienceIncrease` rule inherited from 20.1.

4. **Lose.** Outcome 4 runs the game-over program if one is registered; otherwise it shows "Game over." and calls `reset()`. It awards nothing. The battle ends before the program runs so the program sees the board state, not a live battle.

5. **`defeated`.** Emitted on each enemy actor at the moment it becomes fallen and unusable, once per enemy per battle, with `{ cause: "damage" | "status" | "script", source: actorId | null }`. `source` is the actor that caused it when known, otherwise null. The package re-emits `battle.defeated` on the game for global listeners (EMIT-13 namespace rule). A run emits none; a lose does not emit for the players.

6. **Messages.** The reward message ("Gained N experience / GP") and each level-up message go through the existing message path, in the order BAT-8 records. The text is data where the game supplies a format, otherwise the ruled default; the no-enemies message comes from the start path and is not repeated here.

7. **`canRun`.** The Run action is offered only when the battle's `canRun` is true (no enemy forbids it); a direct call raises `battle.cannot-run` and leaves the battle running.

## Acceptance

1. Seeded win, run and lose paths produce the ruled outcomes, rewards and consequences.
2. Experience is granted to every party member once; each threshold crossing follows the 20.6 equation and does not refill current HP/SMP/FP.
3. Gold is posted exactly once as an inventory effect and consumed by the test double.
4. `defeated` fires once per enemy per battle, not on a run, and carries the ruled fields; the game re-emit is `battle.defeated`.
5. The game-over program runs, or "Game over." shows and `reset()` is called when none is registered.
6. `canRun` gates the Run action and a refused run is a stable error with the battle still live.
7. Messages appear in the order BAT-8 rules; level-up text follows the game's data where supplied, otherwise the ruled default.

## Verification

Seeded win/run/lose tests, a per-member experience/level-up test against the 20.6 equation, a gold-effect test, a `defeated`-count and payload test, a game-over/reset test, and a `canRun` test. Full suite, typecheck and lint.
