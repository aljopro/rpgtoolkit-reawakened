<!-- Owner-relayed fact sheet, clean-room extraction round 10 (ADR 0006). Status: prose facts as relayed by the owner, not yet folded into docs/spec/; each ruling that uses them is its own doc-first commit (G7). -->

# Clean-room extraction, round 10 — the built-in physical attack damage (OWNER-RELAYED)

* **Source consulted:** the answerer read the program's logic. Their text named source files, routines, a line position, a data-structure detail and pseudocode; none of that is reproduced here, and no expression from the program is reproduced. Nothing was run.
* **Answerer:** not stated; relayed by the owner (Jensen) on 2026-10-20, in two parts while reviewing the Epic 20 actor inventory (the damage-equation row). The second part corrects and extends the first; where they differ the second is recorded.
* **Date:** 2026-10-20
* **Versions:** not stated.
* **Confidence labels:** none given. Every statement is *read from the program's logic, confidence not stated*.
* **Question text:** one question, in substance "what is the built-in damage equation for a physical attack?" The numbered list is not in this repository.
* **Review:** not reviewed by a separate agent. Implementers must treat every statement as an owner-relayed behaviour statement.
* Everything below is behaviour prose.

---

**D1. Who calculates.** The engine has one built-in calculation for a physical attack. The stock fight plugin gives it the attacker's FP as the starting amount. A plugin or a script may give it any amount, or do its own arithmetic; the engine then only applies the result. The calculation reports the damage it dealt.

**D2. Nothing happens.** The calculation does nothing and reports 0 when there is no attacker, when there is no target, or when the attacker's HP is below 1.

**D3. Random swing.** When the supplied amount is above 0, it is changed by a random whole percentage from -10 to +9 of itself, so the swing runs from 10 % below to 9 % above. It is not symmetrical. The adjusted value is then made a whole number straight away, by dropping the fraction (towards zero), before anything else is subtracted. With a supplied amount of 100 the possible results run from 90 to 109, each percentage giving that whole number of points.

**D4. Defence and critical hit.** When the supplied amount is above 0, a random whole number is drawn and tested against the limit plus one: if the draw divides evenly by that number the attack is a critical hit and the target's DP is **not** subtracted; otherwise it is a normal hit and DP is subtracted. There is no separate critical-damage figure; the only effect is whether DP is subtracted. A limit of *n* gives a 1-in-(*n* + 1) chance of skipping DP. **A limit of 0 always skips DP.** (This corrects the first part of the relay, which said 0 meant never.)

**D5. Which limit is used.**

| Attacker hits | Limit used |
|---|---|
| a player, against an enemy | the enemy's take-crit value |
| an enemy, against a player | **not valid in the original**: it reads an enemy record from the target, and a player has none, so the value is undefined |
| a player, against a player | fixed at 0, so DP is always skipped; not a normally supported pairing |
| an enemy, against an enemy | the attacker's give-crit value (relayed in the first part only) |

**D6. Floor.** After the above, if the amount is below 1 it becomes 1. This includes a supplied amount of 0 or less, which skips the swing and the DP test and so deals 1.

**D7. Applying it.** The result is taken off the target's HP, or off its SMP when the attack is directed at SMP. Neither goes below 0.

**D8. Special moves.** A special move does not use this calculation. It takes the move's own flat FP value off the target's HP, its own target-SMP value off the target's SMP, and its own source-SMP value off the user's SMP. Each is kept at 0 or above. There is no swing and no DP subtraction.

**D9. Not checked by the answerer.** How a fighter's DP is made from its base stat and its equipment, and how take-crit and give-crit default in the enemy file.

---

## Doubts in the relay

Resolved by the second part: limit 0 always skips DP (D4); the amount is made a whole number right after the swing, by dropping the fraction (D3).

Still open:

* **Enemy against player (D5).** The original behaviour is undefined. The answerer says the rebuild needs an explicit compatibility decision, and that the project should not invent a take-crit field for players. That is a ruling for the owner, not a fact.
* **Enemy against enemy (D5).** Relayed only in the first part and not repeated or contradicted in the second.
* **Order of the guards (D2).** The relay lists the three conditions but does not say whether an attacker below 1 HP is checked before a missing target.

## Disposition

Nothing below is a ruling.

| Fact | Touches | Effect on what is written today |
|---|---|---|
| D1, D3, D4, D6, D7 | `plugins-and-battle.md#e-74`; the damage-equation row of the Epic 20 actor inventory; Epic 7 | Agrees with E-74's FP, variance, DP, critical hit, minimum 1 and SMP target. Adds the asymmetric -10 to +9 swing, truncation straight after the swing, the amount-above-0 condition, and that a limit of 0 always skips DP (E-74 only says enemies define 1-in-N chances). |
| D2 | E-74 | Adds the three do-nothing conditions and the 0 report. |
| D5 | E-74 (crit chances) | Player against enemy is settled. Enemy against player needs a rebuild rule before Epic 7 can rely on it. |
| D8 | E-74 special moves | Agrees with E-74. Adds the user's own SMP cost, which E-74 already states, and confirms no swing and no DP. |
| D9 | `character.md`, `enemy.md`, `item.md` | Open: DP derivation and crit defaults must come from the format docs and fixtures, not from this round. |

Follow-up question, if the owner can ask it: the order of the three do-nothing conditions in D2.
