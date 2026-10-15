# Legacy text formats (Toolkit 1 and 2)

Toolkit 2 stored most game files as text: **one value per line**, CRLF line endings, ANSI text. Numbers are decimal text; strings are the whole line. Unless stated otherwise every line below is one value. "×N" means N consecutive lines. Grids are written with **x as the outer loop**.

Version lines are integers. The original editor checks that the major version is 2 and asks for confirmation if the minor version is not 0; the original engine ignores both.

## Main file (Toolkit 2 text)

| Line(s) | Field |
|---|---|
| 1 | header (see note) |
| 2, 3 | major, minor |
| 4 | registered flag (ignored) |
| 5 | startupPrg |
| 6 | runTime program |
| 7 | "use built-in menu" (ignored; the menu plugin becomes `tk3menu.dll`) |
| 8 | runKey (ASCII) |
| 9 | menuKey (ASCII) |
| 10 | key (ASCII) |
| 11 | initBoard |
| 12 | initChar |
| 13 | fightGameYn (0 = battles on) |
| 14 | multitask speed (ignored) |
| 15 | memory protection (ignored) |
| 16… | 501 × (enemy file, skill level) = 1002 lines |
| | fightType, chances, fprgYn, fightPrg |
| | (ignored) |
| | gameTitle |
| | mainScreenType |
| | fighting style (ignored) |
| | gameOverPrg |
| | projectPath |
| | skinButton, skinWindow |
| | target platform (ignored) |
| | 51 × (run-time key, program) = 102 lines |
| | registration code (ignored) |
| | extendToFullScreen, mainResolution |
| | plugin count *n*, then *n* × "use plugin" flag (flag 1 at position *i* adds `tkplug<i>.dll`) |
| | mainUseDayNight, mainDayNightType, mainDayLength |
| | mainDisableProtectReg |
| | parallax (ignored) |
| | language file |

**Header note.** The original 3.1 editor compares line 1 with `RPGTLKIT mainForm`. Other text in that reader suggests the expected header was originally `RPGTLKIT MAIN` and was changed by an accidental global rename of "Main" to "mainForm" (inferred). With the editor as shipped, a file whose first line is `RPGTLKIT MAIN` is handed to the Toolkit 1 reader below and misread. A new importer should accept both.

After converting, the original editor copies every file from the Toolkit folder's shared `Plugin\` folder into the project's `Plugin\` folder (Toolkit 2 kept plugins in one shared place).

## Main file (Toolkit 1)

Used when line 1 is not a recognised header.

| Line | Field |
|---|---|
| 1 | (ignored) |
| 2 | startupPrg |
| 3 | runTime program |
| 4 | runKey, as a **character** (its ASCII code is used) |
| 5 | initBoard |
| 6, 7 | (ignored) |
| 8 | fightType |
| 9 | chances |
| 10 | name of a separate **fight file** in the same folder |

The fight file holds 251 × (enemy file, skill level) = 502 lines. Everything else takes its default; the menu plugin becomes `tk3menu.dll`.

## Character

| Line(s) | Field |
|---|---|
| 1 | `RPGTLKIT CHAR` |
| 2, 3 | major, minor |
| | name; the nine stat variable names (experience, defence, fight, health, max health, name, SMP, max SMP, level) — 10 lines |
| | the eight starting stats (experience, health, max health, defence, fight, SMP, max SMP, level) |
| | profilePic |
| | 201 × (special move file, minExp, minLevel, condition variable, required value) = 1005 lines |
| | specialMoveName, smYN |
| | sizeType — **only if minor > 0**; otherwise sizeType is 0 |
| | graphics, in one of the two forms below |
| | 10 × accessory slot name |
| | 6 × armour slot used (head, neck, left hand, right hand, body, legs) |
| | levelType, experienceIncrease, maxLevel, levelHp, levelDp, levelFp, levelSm |
| | swipe sound, defend sound, special-move sound, death sound |
| | levelUpProgram, levelUpType |

**Graphics, sizeType 1 (64×32 sprites, tile names):**

1. Walking: 16 frames × (upper tile, lower tile) = 32 lines. Frames 0-3 face south, 4-7 east, 8-11 north, 12-15 west.
2. Battle graphics:
   - **minor 1:** for half *u* = 0 (upper), 1 (lower), for frame *t* = 0..3: fight, defend, special, death tile names (32 lines). These become the right-hand column of 2×2 battle frames; the left column is empty.
   - **minor ≥ 2:** for *u* = 0..1, for *v* = 0..1, for frame *t* = 0..3: fight, defend, special, death tile names (64 lines), i.e. 2×2-tile battle frames.
3. Battle rest: minor 1: 2 lines (upper, lower); minor ≥ 2: 2×2 = 4 lines.
4. Custom graphics: 10 × (upper tile, lower tile) = 20 lines.

**Graphics, sizeType 0 (32×32 sprites, pixels embedded in the file):** each tile is 1024 lines of pixel values (x outer, y inner).

1. 16 walking tiles (16 × 1024 lines).
2. For frame *t* = 1..4, for each pixel (x outer, y inner): **4 interleaved values** — fight, special, defend, death (note the order) — 4 × 4096 lines.
3. 1 battle rest tile (1024 lines).
4. 10 custom tiles (10 × 1024 lines).

The pixels are written into a new tileset; see [conversion.md](conversion.md#characters).

## Item

| Line(s) | Field |
|---|---|
| 1 | `RPGTLKIT ITEM` |
| 2, 3 | major, minor |
| | itemName |
| | equipYN, menuYN, boardYN, fightYN |
| | 7 × equip slot (head … accessory) |
| | accessory |
| | equipHP, equipDP, equipFP, equipSM |
| | prgEquip, prgRemove |
| | menuHP, menuSM, prgMenuUse |
| | fightHP, fightSM, prgFightUse |
| | prgOnBoard, prgPickUp |
| | sizeType — **only if minor = 1**; otherwise sizeType is 0 |
| | graphics, below |
| | usedBy |
| | 50 × allowed character |
| | buyPrice, sellPrice, keyItem |
| | description |
| | animation |

Graphics, sizeType 1: 16 walking frames × (upper, lower tile name), then rest (upper, lower) — 34 lines. Graphics, sizeType 0: 16 walking tiles then 1 rest tile; each tile is either a single line `-2` (empty) or 1024 pixel lines (x outer, y inner).

## Enemy

| Line(s) | Field |
|---|---|
| 1 | `RPGTLKIT ENEMY` |
| 2, 3 | major, minor |
| | name, hp, smp, fp, dp, canRun, takeCrit, giveCrit |
| | width, height (in tiles) |
| | tile grid — see note |
| | 101 × (special move, weakness) interleaved = 202 lines |
| | ai, useCode, prg, exp, gp, winPrg, runPrg |
| | 4 lines (ignored; probably the four battle sounds) |
| | FIGHT, DEFEND, SPECIAL, DIE animations |

No strengths and no custom stances. **Tile-grid note:** the original editor always reads a **19 × 7 grid (133 lines)** and uses its top-left width × height part. The original engine reads only width × height lines, which misreads every file whose enemy is not exactly 19 × 7. The fixed grid is almost certainly what Toolkit 2 wrote (inferred); use it.

## Fight background

| Line(s) | Field |
|---|---|
| 1 | `RPGTLKIT BKG` |
| 2, 3 | major, minor |
| | tile grid: **19 × 11** tile names (x outer) = 209 lines — see note |
| | music, selectSound, chooseSound, readySound, cantDoSound |
| | 1 line (ignored) |
| | 19 × 11 × (r, g, b) tint lines = 627 lines |

**Grid-size note:** the original editor reads 19 × 11 (a 608 × 352 battle backdrop). The original engine reads 19 × 19, which would misread every file; the editor's size is almost certainly the Toolkit 2 layout (inferred).

## Status effect

`RPGTLKIT STATUSE`, major, minor, then name, rounds, speed, slow, disable, hp, hpAmount, smp, smpAmount, code, prg — the same fields as the binary format, one per line.

## Special move

`RPGTLKIT SPLMOVE`, major, minor, then name, fp, smp, prg, targetSmp, battle, menu, statusEffect, animation, description — the same fields as the binary format, one per line.

## Animation

| Line(s) | Field |
|---|---|
| 1 | `RPGTLKIT ANIM` (compared case-insensitively) |
| 2, 3 | major, minor (ignored) |
| | width, height (pixels) |
| | frame UB |
| | frames × (image, transparent colour, sound) |
| | delay (seconds) |

The original editor always reads **51** frames; the engine reads frame UB + 1. Files from the Toolkit always stored UB = 50, so both agree in practice.

## Single tile, version 1 (Toolkit 1)

A `.gph` whose first line is not `RPGTLKIT TILE`: 16 lines of 16 characters. Each character's code minus 33 is a [DOS palette](../tiles.md#dos-palette) index; the tile is 16 × 16 and drawn doubled. (The version 2 `.gph` text format is current and described in [../tiles.md](../tiles.md#single-tile-gph).)

## Board (Toolkit 2 text)

Not readable by Toolkit 3.1. The 3.1 editor rejects it with "Please save this board using RPGToolkit version 3.0.6 or below to upgrade the file format"; the engine asks for the board to be saved in the editor. Its layout is not documented here; converting such a board needs Toolkit 3.0.6 or an importer written from a Toolkit 2 sample.
