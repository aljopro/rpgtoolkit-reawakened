# Experience, rewards, and level progression

This page describes how enemy rewards, player character data, RPGCode, level-ups, and special-move availability fit together. It is an implementation-neutral compatibility contract; the actor model and behaviour rules are in [actors.md](actors.md).

## Sources of progression data

Progression is split across two asset types:

- A player character file (`.tem`, under `Chrs\`) defines starting stats and level-progression fields. See [the character format](../formats/character.md).
- An enemy file (`.ene`, under `Enemy\`) defines the reward for defeating that enemy. Its `exp` field is the integer experience reward and its `gp` field is the gold reward. See [the enemy format](../formats/enemy.md).

The character file names the RPGCode variables that hold experience, level, HP, max HP, DP, FP, SMP, and max SMP. The actor model owns the corresponding runtime stats; legacy variable names are live aliases to that owner.

## Awarding experience

A normal battle accumulates the `exp` value of each defeated enemy. The reward is issued only after the battle has been won; reaching zero HP is not itself an XP transaction.

```text
battle victory
  → sum defeated enemies' .ene exp fields
  → give the total to each eligible party member
  → run each actor's level-threshold check
```

A successful flee gives no experience or gold. A defeat follows the game-over path and gives no victory reward.

Experience can also be awarded outside battle with:

```rpgcode
giveExp(handle, amount)
```

This uses the same actor progression path as a battle reward, so quests, story events, and other RPGCode systems can grant XP without creating a battle.

## Threshold and level-up behavior

The actor stores total experience and mutable progress toward the next level. When an amount is awarded:

1. Add the amount to total experience.
2. Subtract the amount from the remaining requirement for the next level.
3. While the remaining requirement is zero or negative, perform a level-up and carry the negative remainder into the next requirement.

A sufficiently large award can therefore produce multiple level-ups in one operation; excess XP is not discarded.

The legacy fields have distinct roles:

- `levelType` is the initial XP requirement for the first level-up.
- `experienceIncrease` is the parameter used to derive later requirements.
- `levelUpType` selects the percentage-labelled or direct/fixed compatibility branch.

For later thresholds:

```text
levelUpType = 0:
  growth = truncate(oldRequirement * experienceIncrease / 100)
  nextRequirement = oldRequirement + growth

levelUpType = 1:
  nextRequirement = oldRequirement + experienceIncrease
```

Truncation happens after the multiplication and division. The calculation MUST NOT truncate `experienceIncrease / 100` before multiplying by the old requirement. This preserves percentage values below 100 as fractional growth that may truncate only after the full calculation. Progression fields and awards are safe integers. `levelUpType` MUST be `0` or `1`; a non-max-level actor MUST have a positive integer `nextRequirement` and a non-negative integer `remainingExperience`; and `maxLevel` MUST be a non-negative integer. An invalid award or policy is rejected without mutating the actor. A non-negative award is recorded even when the actor is already at `maxLevel`; no further level or stat changes occur there. Percentage growth and percentage stat increases truncate toward zero only after the full multiplication and division.

`maxLevel = 0` disables level advancement while still recording awarded experience. Configured stat-growth values (`levelHp`, `levelDp`, `levelFp`, and `levelSm`) MUST be non-negative safe integers. A malformed threshold or growth policy is rejected before any actor field is changed.

The legacy ecosystem contains different arithmetic expectations in live advancement and restoration. The compatibility boundary keeps the field meanings above explicit; the Reawakened runtime uses the deterministic contract above for new evaluation and records any legacy restoration conversion during import rather than silently mixing formulas.

## Stat changes on level-up

A level-up increments the actor's level unless it is already at or above `maxLevel`. The default result increases:

- maximum HP;
- DP;
- FP; and
- maximum SMP.

The default level-up does not directly refill current HP or current SMP.

`levelUpType = 0` applies the configured `levelHp`, `levelDp`, `levelFp`, and `levelSm` values as percentage growth. The corresponding equipment bonus is excluded from the percentage base. The result is converted to an integer after the calculation.

`levelUpType = 1` applies those configured values as fixed points. Equipment bonuses remain separate from intrinsic progression and are not compounded by percentage growth.

A non-empty legacy `levelUpProgram` wins over a modern behaviour `levelUp` hook. Core advancement records each crossed level and returns a plain-data legacy level-up handoff containing the actor id, award, target level, and default proposal for the owning script layer; it does not invoke the program, invoke the behaviour hook, apply default stat growth, or emit `leveledUp` for that pending result. The handoff contains no program path or callable. If the legacy program is empty, a resolved behaviour may return a partial plain-data result patch; otherwise the core default applies. Omitted result fields mean unchanged, and executable code is never stored in actor or save data.

## Modern actor progression

Modern actors MAY carry explicit progression policy data, such as a supported percentage rate, fixed increment, rounding rule, or minimum increase. Policy data is actor-owned plain data and can differ between actors.

A resolved behaviour receives the actor and a plain-data context. It may reuse or replace the core proposal, but the core remains responsible for validation, actor-owned mutation, progression state, and the `leveledUp` event when the result is not delegated to a legacy program.

The precedence is:

```text
non-empty legacy levelUpProgram
→ behaviour levelUp hook
→ actor progression policy
→ legacy levelType/experienceIncrease compatibility policy
→ core defaults
```

## Level-up RPGCode hook

The legacy character may name an RPGCode program to run during level-up. It can show custom messages, award items, modify variables, play sounds, apply custom stat changes, and trigger scripted effects.

The editor MAY offer a non-destructive conversion of this program into a named behaviour. It MUST warn when a legacy program takes precedence, preserve the original until conversion is accepted, and never execute both implementations automatically.

## Special moves

A special move assigned to a character is not copied into a separate learned-move inventory. The engine evaluates its conditions when it builds the actor's available moves. A move is available when at least one configured condition succeeds:

- current experience is at least its minimum experience;
- current level is at least its minimum level; or
- a configured RPGCode variable equals its required value.

This allows a game to unlock abilities through XP, level, items, quests, or other script-controlled conditions.

## Persistence and restoration

Save data preserves each actor's current progression state, including total experience, level, remaining XP to the next level, and current progression requirement. It also preserves the actor's policy data, `legacyLevelUp` precedence flag, and behaviour name when present. The exact persisted progression fields are `experience` in `stats`, `level` in `stats`, `remainingExperience`, `nextRequirement`, `levelType`, `experienceIncrease`, `maxLevel`, `levelHp`, `levelDp`, `levelFp`, `levelSm`, and `levelUpType` in `progression`; `legacyLevelUp` is a plain boolean in `progression`. It never stores a callable, compiled hook, or raw program path. On restoration, package startup rebuilds behaviour registrations before actor hydration. A missing behaviour uses the core default and emits a located diagnostic; it never refuses the save.

## Maximum level

At `maxLevel`, additional XP remains recorded, but no further level or stat changes occur. The threshold check terminates safely and cannot loop indefinitely.

## Parity checklist

- [ ] Read XP rewards from every defeated enemy's `.ene` `exp` field.
- [ ] Award the total only on victory, to every eligible party member.
- [ ] Award no victory XP or gold on a successful flee.
- [ ] Implement `giveExp(handle, amount)` through the same actor progression path.
- [ ] Support multiple level-ups from one large award.
- [ ] Preserve XP, level, threshold state, policy data, and behaviour name in saves.
- [ ] Apply level-up changes to max HP, DP, FP, and max SMP, excluding equipment bonuses from percentage growth.
- [ ] Run the configured legacy level-up program when present.
- [ ] Give a modern behaviour precedence only when no legacy level-up program is set.
- [ ] Make special moves available from XP, level, or variable conditions.
- [ ] Terminate safely at `maxLevel` while retaining subsequently awarded XP.
