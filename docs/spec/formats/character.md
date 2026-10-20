# Character (`.tem`)

A player character: the RPGCode variables that hold its stats, starting stats, levelling rules, special moves, equipment slots, animations, and two collision polygons. Characters live in `Chrs\`.

Header text: `RPGTLKIT CHAR`. Newest minor: **8**. The original engine refuses minor < 5 ("Please save … in the editor"); the editor converts older files.

**Accepted `minor`: 0-8 — Reawakened rule.** The conditional rows above span that range (`minor = 3`, `< 5`, `≥ 5`, `≥ 6`, `≥ 7`, `≥ 8`), so a reader accepts 0-8 and refuses `minor` 9 or higher and a negative version field rather than guessing a neighbouring layout ([README.md](README.md#header-and-version)). *Caveat:* the 2.x era also wrote `.tem` at minor 3 and 4, which is why the range starts at 0 rather than at the base-bearing minor; a reader that applies the rows above to such a file leaves residue bytes rather than failing. <!-- OWNER: chose 0–8 for §6.1 (the range the conditional rows span and the reader hard-codes) over a narrower 3–8, because §6.1's minor<5 rows exist and a TK2-era minor 3/4 file must at least be recognised; the mismatch is named rather than silently accepted. -->

**Stats live in script variables.** The character file names the RPGCode global variables that hold each stat (for example `Frap[hp]!`). The engine stores the starting values into those variables when the character joins the party, and every later change goes through them. Renaming a variable in the file renames the stat.

## Layout

| # | Field | Type | Present when | Meaning |
|---|---|---|---|---|
| 1 | header | string | | `RPGTLKIT CHAR` |
| 2 | major, minor | short, short | | |
| 3 | name | string | | display name |
| 4 | experienceVar | string | | variable holding experience |
| 5 | defenseVar | string | | defence (DP) |
| 6 | fightVar | string | | fighting power (FP) |
| 7 | healthVar | string | | HP |
| 8 | maxHealthVar | string | | maximum HP |
| 9 | nameVar | string | | the character's name (a string variable) |
| 10 | smVar | string | | special-move power (SMP) |
| 11 | smMaxVar | string | | maximum SMP |
| 12 | levelVar | string | | level |
| 13 | experience, health, maxHealth, defense, fight, sm, smMax, level | int × 8 | | starting values |
| 14 | profilePic | string | | portrait: image in `Bitmap\` or a tile reference |
| 15 | × 201 special-move slot | | | slots 0..200; the editor uses 1..200 |
| 15a | file | string | | `.spc` in `SpcMove\` |
| 15b | minExp | int | | experience needed to learn it |
| 15c | minLevel | int | | level needed |
| 15d | condition variable | string | | learned only when this variable … |
| 15e | required value | string | | … equals this value |
| 16 | specialMoveName | string | | menu label for this character's special moves (e.g. "Magic") |
| 17 | smYN | byte | | 0 = has special moves, 1 = none |
| 18 | × 11 accessory slot name | string | | slots 0..10; the editor uses 1..10 |
| 19 | × 7 armour slot used | byte | | slots 0..6 (0/1); the editor uses 1..6: head, neck, left hand, right hand, body, legs |
| 20 | levelType | int (byte if minor = 3) | | experience needed for the first level-up |
| 21 | experienceIncrease | short | | amount used to grow the next-level requirement; `levelUpType = 0` uses `truncate(oldRequirement * experienceIncrease / 100)` and `levelUpType = 1` adds it directly |
| 22 | maxLevel | int | | |
| 23 | levelHp, levelDp, levelFp, levelSm | short × 4 | | stat increase per level, in percent or points (field 26) |
| 24 | swipe, defend, special, die sounds | string × 4 | minor < 5 | legacy; ignored |
| 25 | levelUpProgram | string | | program run on level-up |
| 26 | levelUpType | byte | | 0 = percentage mode for stat increases and threshold growth; 1 = fixed-point mode for stat increases and direct threshold growth |
| 27 | sizeType | byte | | legacy: 0 = 32×32, 1 = 64×32 |
| 28 | walk animations × 8 | string | minor ≥ 5 | order **S, N, E, W, NW, NE, SW, SE**; `.anm` files in `Misc\` (or `.gif`) |
| 29 | FIGHT, DEFEND, SPECIAL MOVE, DIE, REST animations | string × 5 | minor ≥ 5 | battle stances; also reachable by these names as custom stances |
| 30 | (unused) | string | minor ≥ 5 | the editor writes an empty string |
| 31 | idle animations × 8 | string | minor ≥ 6 | same direction order; played after `idleTime` without movement |
| 32 | idleTime | double | minor ≥ 7 | seconds before idling starts (default 3.0) |
| 33 | speed | double | minor ≥ 7 | seconds per movement frame (default 0.05) — **note: idleTime first, then speed; items store the opposite order** |
| 34 | custom stance UB | int | minor ≥ 5 | |
| 35 | × (UB+1): animation, name | string, string | minor ≥ 5 | named stances scripts can play; kept only if both are non-empty |
| 36 | vector count | short | minor ≥ 8 | the editor writes 1 (last index of two vectors); ignored |
| 37 | collision polygon: points UB | short | minor ≥ 8 | |
| 38 | × (UB+1) point | int x, int y | minor ≥ 8 | pixels relative to the sprite's reference point (bottom-centre); closed |
| 39 | activation polygon: points UB | short | minor ≥ 8 | |
| 40 | × (UB+1) point | int x, int y | minor ≥ 8 | area in which the character can activate things; closed |

The file ends here.

## Defaults and fall-backs

- **Default polygons** (minor < 8) — the ruled values: collision = rectangle from (−15, −15) to (15, 0); activation = rectangle from (−24, −24) to (24, 8). On isometric boards the bases are diamonds instead. The sample characters store exactly these, and a file that predates stored bases (a `.tem` below minor 8) takes them when it is read; the pre-vector board conversion generates no base.
- **Missing animations:** a missing diagonal falls back to the nearest horizontal direction; a missing idle animation falls back to the walk animation.
- **Levelling.** `levelType` is the first-level requirement. `experienceIncrease` derives later requirements: with `levelUpType = 0`, add `truncate(oldRequirement * experienceIncrease / 100)`; with `levelUpType = 1`, add `experienceIncrease` directly. Stat increases use the same `levelUpType` split, with percentage results converted to integers after calculation. The actor and progression rules record the deterministic compatibility contract; legacy restoration conversion is handled during import rather than by mixing formulas at runtime.

## Older versions

Minors 5-7 differ only as shown in the "Present when" column. Toolkit 2 characters (binary minor < 5, and text) are described in [legacy/](legacy/README.md); the original engine refuses them and the editor converts them ([legacy/conversion.md](legacy/conversion.md#characters)).

## Example

[../examples/listings/hero.tem.txt](../examples/listings/hero.tem.txt) — a complete minor-8 character built by the example generator.
