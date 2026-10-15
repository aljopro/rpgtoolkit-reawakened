# Character (`.tem`)

A player character: the RPGCode variables that hold its stats, starting stats, levelling rules, special moves, equipment slots, animations, and two collision polygons. Characters live in `Chrs\`.

Header text: `RPGTLKIT CHAR`. Newest minor: **8**. The original engine refuses minor < 5 ("Please save … in the editor"); the editor converts older files.

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
| 21 | experienceIncrease | short | | how the requirement grows per level (see note) |
| 22 | maxLevel | int | | |
| 23 | levelHp, levelDp, levelFp, levelSm | short × 4 | | stat increase per level, in percent or points (field 25) |
| 24 | swipe, defend, special, die sounds | string × 4 | minor < 5 | legacy; ignored |
| 25 | levelUpProgram | string | | program run on level-up |
| 26 | levelUpType | byte | | 0 = percentage increases ("exponential"), 1 = fixed points ("linear") |
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

- **Default polygons** (minor < 8): collision = rectangle from (−15, −15) to (15, 0); activation = rectangle from (−24, −24) to (24, 8). The sample characters store exactly these.
- **Missing animations:** a missing diagonal falls back to the nearest horizontal direction; a missing idle animation falls back to the walk animation.
- **Levelling.** The original engine uses `experienceIncrease` inconsistently in three places (an integer percentage that rounds to 0 below 100, a multiplier `1 + value`, and `1 + value/100`). A compatible engine should pick one and document it; the editor's UI presents it as a percentage.

## Older versions

Minors 5-7 differ only as shown in the "Present when" column. Toolkit 2 characters (binary minor < 5, and text) are described in [legacy/](legacy/README.md); the original engine refuses them and the editor converts them ([legacy/conversion.md](legacy/conversion.md#characters)).

## Example

[../examples/listings/hero.tem.txt](../examples/listings/hero.tem.txt) — a complete minor-8 character built by the example generator.
