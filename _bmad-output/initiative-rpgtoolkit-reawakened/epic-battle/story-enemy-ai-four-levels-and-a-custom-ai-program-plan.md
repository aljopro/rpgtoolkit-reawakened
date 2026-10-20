---
title: "Enemy AI: four levels and a custom AI program"
type: 'feature'
ticket: 7
created: '2026-10-19'
status: draft
baseline_revision: '4255ec6f520af495d3aa2db8ed2553cb685ea3ab'
risk: "medium"
context:
  - "spec - docs/spec/engine/battle.md as ruled by 7.1 (BAT-7)"
  - "spec - docs/spec/engine/plugins-and-battle.md#e-76"
  - "code - packages/core/src/spine/rng.ts (the seeded shared RNG)"
---

## Intent

Implement E-76's four enemy AI levels and the custom `useCode` AI program in the stock package, so an enemy chooses a target and an action deterministically from the seeded stream. The `ai(level)` built-in sets the acting enemy's level for that turn.

## Boundaries

No damage or status application (7.5, 7.6). AI chooses; the action code applies. No UI. The custom program runs with the same battle API as any other script and cannot reach package internals.

## Key Decisions

1. **Levels 0-3.** 0: random target, 50/50 physical or special. 1: special moves until SMP runs out (then physical). 2: weakest target, 50/50. 3: weakest target, special moves first. The table is transcribed from E-76 into `battle.md#bat-7`; where a row does not name a target (level 1), 7.1 records the reading (random, as level 0) so this plan does not invent a second rule.

2. **Draw order.** One draw for the target, then one for attack-or-special, then one for a critical when 7.5 asks. The order is fixed and documented; a test pins the sequence so a refactor cannot silently change outcomes.

3. **Weakest and ties.** "Weakest" is lowest current HP; a tie goes to the lower party index. A fighter that is already fallen is skipped. If every player is fallen, the outcome path (7.8) resolves the battle instead of the AI choosing.

4. **Affordability and curing.** A special that costs more SMP than the enemy has is skipped for a physical attack. A curative special targets the lowest-HP living ally of the enemy (including the enemy itself); an offensive special targets the drawn player. A special with no explicit target uses the drawn player.

5. **Custom `useCode`.** The program runs with `source` = the enemy and `target` = the drawn player, and may call `attack`, `special`, `item` or `wait` through the same API. An error is reported and ends that turn (the enemy does nothing) without ending the battle. A program that returns without acting is a no-op turn, not a hang.

6. **Level input.** `ai(level)` validates 0-3 and sets the level on the acting enemy for the next decision; a level outside the range is a catchable error. A custom `useCode` program takes precedence over the level's table for that enemy.

## Acceptance

1. Each of the four levels makes the ruled choices over a seeded run, including the special-first and weakest-target cases.
2. An unaffordable special falls back to a physical attack; a curative special targets the lowest-HP living ally; an offensive one targets the player party.
3. A custom AI program drives the action and cannot read package internals; an error ends the turn, reports, and leaves the battle running.
4. Every draw is in the ruled order; a tie is deterministic.
5. `ai(level)` validates its argument and applies to the acting enemy only.
6. No unseeded randomness or wall clock is used.

## Verification

A seeded per-level choice test, an affordability test, a curing/offensive target test, a tie-break test, a custom-program test (success and error), and an `ai()` argument test. Full suite, typecheck and lint.
