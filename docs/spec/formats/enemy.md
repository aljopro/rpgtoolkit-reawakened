# Enemy (`.ene`)

A battle opponent: stats, special moves, weaknesses and strengths, AI level or AI program, rewards, and battle animations. Enemies live in `Enemy\` and are referenced by the main file's random-encounter table and by scripts.

Header text: `RPGTLKIT ENEMY`. The 3.x editor writes major 2, minor **1**. There are no version branches in the binary layout.

## Layout

| # | Field | Type | Meaning |
|---|---|---|---|
| 1 | header | string | `RPGTLKIT ENEMY` |
| 2 | major, minor | short, short | ignored |
| 3 | name | string | |
| 4 | hp | int | starting and maximum HP |
| 5 | smp | int | starting and maximum special-move power |
| 6 | fp | int | fighting power |
| 7 | dp | int | defence |
| 8 | canRun | byte | 1 = the player may run from this enemy |
| 9 | takeCrit | short | "1 in N" chance of a critical hit on the enemy |
| 10 | giveCrit | short | "1 in N" chance of the enemy landing a critical hit |
| 11 | special moves UB; × (UB+1) | short; string | `.spc` files the enemy can use |
| 12 | weaknesses UB; × (UB+1) | short; string | special moves the enemy is weak to |
| 13 | strengths UB; × (UB+1) | short; string | special moves the enemy resists (no 3.1.0 editor UI edits this list) |
| 14 | ai | byte | 0 low, 1 medium, 2 high, 3 very high (see [../engine/plugins-and-battle.md](../engine/plugins-and-battle.md#enemy-ai)) |
| 15 | useCode | byte | 1 = run `prg` as the AI instead of the built-in AI |
| 16 | prg | string | AI program |
| 17 | exp | int | experience reward |
| 18 | gp | int | gold reward |
| 19 | winPrg | string | program run when the enemy is defeated |
| 20 | runPrg | string | program run when the player runs away |
| 21 | animations UB | short | the editor writes 5 |
| 22 | × (UB+1) animation | string | 0 REST, 1 FIGHT, 2 DEFEND, 3 SPECIAL MOVE, 4 DIE, 5 spare |
| 23 | custom stance count | **see below** | |
| 24 | custom stance pairs | strings | |

## The custom-stance mismatch

The two original programs disagree here, and a compatible reader must handle what the editor actually wrote:

| | Editor (writer) | Original engine (reader) |
|---|---|---|
| Count field | **int** (4 bytes), upper bound | **short** (2 bytes), upper bound |
| Pair order | animation, then name | name, then animation |

Consequence with the original engine: the int's two high bytes (`00 00`) are read as an empty first pair, every real pair is read one slot late with name and animation swapped, and the last pair and 2 bytes are never read. The editor's own reader also reads a short, so the editor cannot reload custom stances either. Default files contain six empty pairs, so nothing visible happens; any enemy with a real custom stance is broken in both programs.

**Recommendation for a new reader:** read the count as an int (the bytes that are actually on disk), then pairs as (animation, name). Files written by any 3.x editor end exactly at the end of the pairs this way; the shipped sample enemy does.

## Older versions

Toolkit 2 text enemies are in [legacy/text-formats.md](legacy/text-formats.md#enemy) and their conversion in [legacy/conversion.md](legacy/conversion.md#enemies).

## Example

[../examples/listings/slime.ene.txt](../examples/listings/slime.ene.txt) — an enemy with one real custom stance, written in the editor's layout and parsed with the recommended reader.
