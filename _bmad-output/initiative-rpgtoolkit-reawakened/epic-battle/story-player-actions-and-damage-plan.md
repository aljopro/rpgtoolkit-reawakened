---
title: "Player actions and damage: attacks, criticals, specials and items"
type: 'feature'
ticket: 5
created: '2026-10-19'
status: draft
baseline_revision: '4255ec6f520af495d3aa2db8ed2553cb685ea3ab'
risk: "high"
context:
  - "spec - docs/spec/engine/battle.md as ruled by 7.1 (BAT-4, BAT-5)"
  - "spec - docs/spec/engine/plugins-and-battle.md#e-74, #e-79"
  - "spec - docs/spec/formats/battle-data.md (.spc flags), docs/spec/formats/item.md"
  - "code - packages/core/src/script/packs/graphics.ts (animation rows)"
---

## Intent

Implement the player's three actions in the stock package: Fight (a physical attack), Special Move (FP and SMP drain with an SMP cost) and Item (a fight HP/SMP effect through an inventory port). Damage follows E-74: seeded ±10% variance on FP, DP subtracted unless a critical, minimum 1, and an optional SMP pool instead of HP. The move's animation and status are applied here.

Everything goes through the actor's damage/heal methods, so `fallen` fires once and the state stays in one place.

## Boundaries

No loop (7.4), no status round effects (7.6), no AI (7.7), no rewards (7.8), no UI (7.11). The inventory port is a seam, not an implementation: Epic 8 owns items, and this entry ships a test double and a posted consume effect.

## Key Decisions

1. **One draw per hit.** Damage takes one seeded draw in `[0.9, 1.1]`, applies it to FP, and rounds by the one rule ruled in 7.1 (round half away from zero, then integer). A test table pins the edges (FP 1, FP with a 0.9 draw, FP with a 1.1 draw, DP larger than damage).

2. **Criticals.** An enemy's `takeCrit` is the 1-in-N chance of a critical hit on it, and its `giveCrit` is the 1-in-N chance of it landing one; a character with neither field cannot crit or be crit. A critical bypasses DP and still applies the variance and the minimum 1. `attackall` and `drainall` never critically hit and apply their amount to each target.

3. **Pools.** Damage targets HP unless the move or item says SMP; SMP damage clamps at 0 and never goes through `fallen` (SMP 0 is not death). A special's target drain is SMP; its user cost is SMP. An unaffordable special is not offered by the action selector and, if called directly, raises `battle.unaffordable`.

4. **Items.** The fight effect is `{ kind: "inventory.consume", item, target, hp?, smp? }`, posted as a plain-data effect. The test double consumes it and asserts exactly one effect per use. The battle never edits an item list and never assumes a bag shape; Epic 8 chooses that.

5. **Animation and status.** The move's animation is requested through the existing animation path and its status is applied through the actor method. The action returns after the animation is requested, not after a host callback, so the loop stays in game time.

6. **Death once.** A lethal hit calls the actor's damage method once; the package does not emit its own second death event. The once-per-enemy `defeated` helper (7.8) is called on the actor's fallen transition, so two damage paths cannot double-emit.

## Acceptance

1. The seeded damage table reproduces the ruled values at the edges; a critical bypasses DP; the minimum is 1; SMP damage clamps.
2. A special's FP/SMP drain and SMP cost are applied and clamp; an unaffordable special is unavailable and a direct call raises a stable error.
3. An item posts exactly one inventory consume effect through the test double and never edits the item list.
4. `attackall`/`drainall` apply to every target without criticals.
5. A lethal hit through any of the three actions fires the actor's `fallen` once and does not emit `defeated`.
6. No wall clock or unseeded randomness is used; the same seed and action stream reproduce the same damage.

## Verification

A seeded damage table test, a critical/DP test, a pool/clamp test, a special affordability test, an item-port test with the double, an all-target test, and a `fallen`-once test. Full suite, typecheck and lint.
