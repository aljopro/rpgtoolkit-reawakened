---
title: "Charge-bar turns: the ATB loop"
type: 'feature'
ticket: 4
created: '2026-10-19'
status: draft
baseline_revision: '4255ec6f520af495d3aa2db8ed2553cb685ea3ab'
risk: "high"
context:
  - "spec - docs/spec/engine/battle.md as ruled by 7.1 (BAT-4)"
  - "spec - docs/spec/engine/plugins-and-battle.md#e-71 to E-73"
  - "code - packages/core/src/ports/wait.ts, packages/core/src/script/waits.ts"
  - "code - packages/core/src/spine/rng.ts (the seeded shared RNG)"
---

## Intent

Implement the stock package's ATB loop in RPGCode: seed each fighter's initial charge, add the effective rate each whole engine tick, stop a fighter at its threshold, and hand control to the player's action code or to the enemy AI. The loop is package-owned and uses the existing thread sleep with a one-tick duration (`threadSleep(getThreadId(), 1/60)`, whose ruled conversion is `max(1, floor(seconds * 60 + 0.5))`), so it is deterministic, saveable and replayable.

Turn order is deterministic: at each step, an enemy that has reached 123 acts before a player at 75; ties within a party go by party index.

## Boundaries

No damage, status effects or AI decisions (7.5 to 7.7). No UI (7.11) and no reward resolution (7.8). This entry owns the clock and the charge only. It does not add a core tick callback or use wall-clock time.

## Key Decisions

1. **One tick, one charge step.** The loop calls `threadSleep(getThreadId(), 1/60)`, which the ruled conversion (`max(1, floor(seconds * 60 + 0.5))`) turns into exactly one tick; the wait ends at tick `T + 1`, the wait phase wakes the thread in that tick, and it adds charge to every fighter once, in party order. Because the engine runs every simulated tick, including each tick of a host catch-up burst, the loop steps once per game tick; host speed cannot stretch or skip a step.

2. **Rate.** `3 + 2 * speedEffects - 2 * slowEffects`, floored at 0. The rate is at most a few points, so no per-tick cap is needed; the loop clamps the stored charge at the threshold.

3. **Disabled fighters do not charge.** Disable is read from the actor's active status effects (the core reference count from 20.6); the loop skips the add. It still checks the charge on the next tick, so a disable that expires resumes charging without a special case.

4. **Threshold and action.** Party 1 acts at 75, party 0 at 123. The loop selects one actor at a time (the lowest party index among those ready, with party 0 considered first), runs its action, and continues. `releaseCharge` writes 0 before the action, so an action that itself waits cannot double-act.

5. **Initial charge and determinism.** Initial charge is one seeded draw per fighter from 0 to threshold−1, in party order, at battle start. The shared seeded RNG is the only randomness in this entry; the loop stores no RNG state itself, so a replay from the same seed and the same action stream reproduces the same turn order.

6. **Still sleep when nobody is ready.** The loop still waits one tick; it must not spin on a busy check, because a spin would consume no game time and would make the loop host-speed dependent.

## Acceptance

1. Seeded runs reproduce the initial charges and the full charge timeline for a fixed party.
2. Speed, slow, disable and multiple effects change the rate exactly as ruled; a disabled fighter's charge does not move and resumes when the last disable expires.
3. Players act at 75 and enemies at 123; a released fighter starts from 0; turn order is the ruled one.
4. A save/restore and a replay produce the same turn order and the same state hash.
5. The loop consumes whole engine ticks only: `threadSleep(..., 1/60)` (or its tick conversion), not a wall-clock sleep, and no `Date`, `performance.now` or `Math.random` appears in `core` or in the package.
6. A fake host that runs a multi-tick catch-up burst still produces one charge step per simulated tick, so the charge timeline is identical to a host that runs the same ticks one at a time.
7. With no fighter ready, the loop still consumes engine ticks (decision 6); it never spins on a busy check.

## Verification

A seeded timeline unit test (charges per tick), a status-rate test, a turn-order test, a save/restore and replay test, and a fake-host catch-up test that asserts one charge step per simulated tick. Full suite, typecheck and lint.
