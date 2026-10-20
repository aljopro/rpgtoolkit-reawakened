<!-- Owner-relayed fact sheet, clean-room extraction round 10 (ADR 0006). Status: prose facts as relayed by the owner, not yet folded into docs/spec/; each ruling that uses them is its own doc-first commit (G7). -->

# Clean-room extraction, round 10 — the built-in physical attack damage (OWNER-RELAYED)

* **Source consulted:** the answer was given by someone who read the program's logic. Their original text named source files, routines and a line position; none of that is reproduced here, and no expression from the program is reproduced. Nothing was run.
* **Answerer:** not stated; relayed by the owner (Jensen) on 2026-10-20, while reviewing the Epic 20 actor inventory (the damage-equation row).
* **Date:** 2026-10-20
* **Versions:** not stated.
* **Confidence labels:** none given. Every statement is *read from the program's logic, confidence not stated*.
* **Question text:** one question, in substance "what is the built-in damage equation for a physical attack?" The numbered list is not in this repository.
* **Review:** not reviewed by a separate agent. Implementers must treat every statement as an owner-relayed behaviour statement.
* Everything below is behaviour prose.

---

**D1. Who calculates.** The engine has one built-in calculation for a physical attack. The stock fight plugin gives it the attacker's FP as the starting amount. A plugin or a script may give it any amount, or do its own arithmetic; the engine then only applies the result.

**D2. Starting amount.** The starting amount is the attacker's FP. For an enemy it is the enemy's own FP.

**D3. Random swing.** The amount is changed by a random whole percentage from -10 to +9 of itself, so the swing runs from 10 % below to 9 % above. It is not symmetrical. The swing happens only when FP is above 0.

**D4. Critical hit.** A random whole number is drawn from 0 up to and including a limit. If it is 0 the attack is a critical hit and the target's DP is not subtracted. Otherwise it is a normal hit and the target's DP is subtracted from the amount. A limit of 0 therefore always gives a critical hit, and a limit of *n* gives a 1-in-(*n* + 1) chance. The DP subtraction, like the swing, happens only when FP is above 0.

**D5. Which limit is used.** As relayed:

| Attacker hits | Limit used |
|---|---|
| a player, against an enemy | the enemy's take-crit value |
| a player, against a player | 0 |
| an enemy, against a player | the target player's take-crit value (stated as relayed; see the doubts below) |
| an enemy, against an enemy | the attacker's give-crit value |

**D6. Floor.** If the result is below 1 it becomes 1. When FP is 0 or less the damage is 1.

**D7. Applying it.** The result is taken off the target's HP, or off its SMP when the attack is directed at SMP. Neither goes below 0.

**D8. Special moves.** A special move does not use this calculation. It takes the move's own flat FP value off HP and its own target-SMP value off SMP, with no swing and no DP subtraction.

**D9. Not checked by the answerer.** How a fighter's DP is made from its base stat and its equipment, and how take-crit and give-crit default in the enemy file.

---

## Doubts in the relay

* **D5 against D4.** The relay said player-against-player has limit 0 and "never a crit", and also that limit 0 is always a critical hit. Both cannot hold. Under the draw in D4, limit 0 means always critical, so DP is never subtracted between players. Which was meant is not known.
* **D5, enemy against player.** A player has no enemy record, so a take-crit value "of the player" has no source in the enemy file. The relay may have described a value read from the wrong record. Not known.
* **D3, D6.** Whether the amount is kept fractional through the swing and DP subtraction, and where it is rounded to a whole number, was not stated.

## Disposition

Nothing below is a ruling.

| Fact | Touches | Effect on what is written today |
|---|---|---|
| D1 to D4, D6, D7 | `plugins-and-battle.md#e-74`; the damage-equation row of the Epic 20 actor inventory; Epic 7 | Agrees with E-74's FP, variance, DP, critical hit, minimum 1 and SMP target. Adds the asymmetric -10 to +9 swing, the FP-above-0 condition, and that the critical roll is a draw with limit *n*. |
| D5 | E-74 (crit chances) | E-74 says enemies define crit chances for being hit and for hitting. D5 says which field each pairing uses; it is unsafe to adopt until the doubts above are answered. |
| D8 | E-74 special moves | Agrees with E-74. Adds that special moves have no swing and no DP. |
| D9 | `character.md`, `enemy.md`, `item.md` | Open: DP derivation and crit defaults must come from the format docs and fixtures, not from this round. |

Follow-up questions, if the owner can ask them: (1) player against player with limit 0, always critical or never; (2) the source of the take-crit value when an enemy hits a player; (3) where the amount is rounded to a whole number.
