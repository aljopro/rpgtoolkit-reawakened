---
title: "Status effects: rounds, per-round effects, speed and disable"
type: 'feature'
ticket: 6
created: '2026-10-19'
status: draft
baseline_revision: '4255ec6f520af495d3aa2db8ed2553cb685ea3ab'
risk: "high"
context:
  - "spec - docs/spec/engine/battle.md as ruled by 7.1 (BAT-6)"
  - "spec - docs/spec/engine/plugins-and-battle.md#e-75"
  - "spec - docs/spec/formats/battle-data.md (.ste)"
  - "spec - docs/spec/engine/actors.md as ruled by 20.1 (status counter, advanceStatus)"
---

## Intent

Implement E-75 status effects in the stock package on top of the core's status data. The core stores the effect, its remaining rounds and the source; the package decides when a round passes, applies the per-round effects and interprets speed, slow and disable.

A round passes when a fighter becomes charged: the package calls the core's `advanceStatus(1)` once, then applies each surviving status's ±HP, ±SMP and program effect. Re-applying a status restarts its rounds. At zero it expires and its contributions disappear.

## Boundaries

No damage formulas (7.5) and no AI (7.7). The core owns the status data, lifetime countdown and expiry; this entry owns the 3.1 "each round while charged" semantics, the per-round program and the charge-rate contributions. It does not add status types to the core.

## Key Decisions

1. **Storage.** A status is identified by its `.ste` file name and carries `{ id, name, rounds, source, data }`. Applying an existing id replaces the entry and restarts `rounds`; it does not stack two copies. Two different statuses may both contribute speed.

2. **Round boundary.** The package calls `advanceStatus(1)` on the fighter, not on every actor, and only when that fighter becomes charged. A disabled fighter that has not yet reached its threshold never becomes charged, so it takes no new status round; disable does not undo a round already applied. This is the ruled legacy behaviour and the reason disable is strong.

3. **Per-round effects.** After the advance, each status whose rounds remain applies its HP delta (through the actor heal/damage path), its SMP delta, and optionally runs its program with `source` = the status's source and `target` = the fighter. A program error is reported with the status id and does not abort the battle; the remaining statuses still apply.

4. **Charge contribution.** Speed adds +2 to the fighter's rate per active speed status; slow subtracts 2 per active slow status; the rate is floored at 0. Disable is a reference count: the fighter is frozen while at least one disable status is active, and unfreezes when the last one expires or is removed.

5. **Removal and death.** `removestatus` removes the entry and drops its contributions immediately. A lethal per-round HP effect fires `fallen` once with `cause: "status"` through the actor path; the package does not emit `defeated` (7.8 does). Status state saves with the actor and replays identically.

## Acceptance

1. Apply, re-apply, remove and expire behave as ruled; re-apply restarts the rounds and does not duplicate the entry.
2. A per-round HP, SMP and program effect runs exactly once per round, at the fighter's charged boundary.
3. Speed and slow stack per active effect; disable freezes only while at least one disable is active and unfreezes on the last removal.
4. A lethal status fires `fallen` once with cause `status` and does not emit `defeated`.
5. Status state is saved with the actor and a save/restore replays identically; statuses are absent from the `battle` section.
6. A program error in a per-round effect is reported and does not abort the battle.

## Verification

Unit tests for apply/re-apply/expire, a round-boundary test including a disabled fighter, a stacking test, a program-error test, a lethal-status test, and a save/replay test. Full suite, typecheck and lint.
