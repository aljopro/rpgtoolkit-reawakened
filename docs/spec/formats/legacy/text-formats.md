# Legacy text formats (Toolkit 1 and 2)

Toolkit 2 stored most game files as text: **one value per line**, CRLF line endings, ANSI text. Numbers are decimal text; strings are the whole line. Unless stated otherwise every line below is one value. "×N" means N consecutive lines. Grids are written with **x as the outer loop**.

Version lines are integers. The original editor checks that the major version is 2 and asks for confirmation if the minor version is not 0; the original engine ignores both.

**Toolkit 1 support scope — Reawakened rule (R-24).** Toolkit 1 is out of scope for the first release (owner decision 2026-10-11). The Toolkit 1 layouts on this page — the [Toolkit 1 main file](#main-file-toolkit-1) and the [version-1 single tile](#single-tile-version-1-toolkit-1) — are recorded as evidence-backed but carry **no reader**: an importer detects them at their header and reports them as an unsupported legacy form. This matches §9.9 of the engine spec, which puts Toolkit 1.x RPGCode out of scope too. The v1 samples (`docs/spec/examples/versions/`) stay as they are.

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
| 32–41 | **optional tail** — every row from here on is read only while lines remain (see the note below) |
| | extendToFullScreen, mainResolution |
| | plugin count *n*, then *n* × "use plugin" flag (flag 1 at position *i* adds `tkplug<i>.dll`) |
| | mainUseDayNight, mainDayNightType, mainDayLength |
| | mainDisableProtectReg |
| | parallax (ignored) |
| | language file |

**Header note (R-19, legacy fact).** The original 3.1 editor compares line 1 with `RPGTLKIT mainForm`. Other text in that reader suggests the expected header was originally `RPGTLKIT MAIN` and was changed by an accidental global rename of "Main" to "mainForm" (inferred). With the editor as shipped, a file whose first line is `RPGTLKIT MAIN` is handed to the Toolkit 1 reader below and misread. A new importer **accepts both `RPGTLKIT MAIN` and `RPGTLKIT mainForm`**. This closes §15.15 question 1. <!-- OWNER: GAM2 — chose to document this layout behind the 13-character magic the corpus actually carries, over withholding it because one legacy reader tests for a 17-character `RPGTLKIT mainForm`; the corpus field sequence fits line for line, so the layout is usable, and which reader path the legacy engine took is now ruled (accept both, above). -->

**The tail from row 32 on is optional (A-1, legacy fact).** Rows 1-31 are always present. `DEMO.GAM` (BusDriver) ends after row 31 at 1133 lines (`3 + 12 + 1002 + 4 + 4 + 5 + 102 + 1`); `caoquest.gam` and `devilsnight.tpk`'s `main.gam` end after row 40 at 1146 lines (rows 1-31, then the three-line `extendToFullScreen`/`mainResolution`/plugin-count group, the plugin flags, and the closing group less the missing language-file line). A reader reads rows 1-31, then reads the remaining rows **only while lines remain**. This is the correct reading rather than the unconditional table above (round 5 `Q7`).

**Plugin count of 5 with four flags — open question (Q7).** The corpus writes a plugin count of `5` but only four enabled-flag lines follow before the closing group. Round 5 `Q7` could not settle it: the count is an exact count of flag lines, so a count of 5 would make the editor read five lines and shift every later field, silently ignoring the lines it cannot read past the end. The editor-side test is: *if the file's last line looks like a language-file name, the count is one too high and the four flags are right.* The two files, both 1146 lines, are `caoquest.gam` and `devilsnight.tpk main.gam`.

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

**2 files in the corpus, both Caoquest** (`start.tem`, `swim.tem`), `major 2 / minor 2`, size type 0.

| Line(s) | Field |
|---|---|
| 1-3 | `RPGTLKIT CHAR`, major, minor |
| 4-13 | name; the nine stat variable names (experience, defence, fight, health, max health, name, SMP, max SMP, level) — 10 lines |
| 14-21 | the eight starting stats (experience, health, max health, defence, fight, SMP, max SMP, level) |
| 22 | profilePic |
| 23-1027 | 201 × (special move file, minExp, minLevel, condition variable, required value) = 1005 lines |
| 1028-1029 | specialMoveName, smYN |
| 1030 | sizeType — **only if minor > 0**; otherwise sizeType is 0 |
| 1031… | graphics, in one of the two forms below |
| last 29 | 10 × accessory slot name (10 lines); 6 × armour slot used (head, neck, left hand, right hand, body, legs) (6 lines); levelType, experienceIncrease, maxLevel, levelHp, levelDp, levelFp, levelSm, swipe sound, defend sound, special-move sound, death sound, levelUpProgram, levelUpType (13 lines) |

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

For a sizeType-0 minor-2 file the total is `3 + 1027 + 44032 + 29 = 45091` lines; both corpus files are exactly that, which is the check for this layout.

**The `-2` empty-picture marker is items-only (R-22, legacy fact).** The character text reader always reads every picture at full size, with no empty-picture check (round 5 `Q10`); a `-2` line in a character file would shift everything after it. The marker belongs to the [item graphics block](#item) only, not to characters.

**Residual bytes after the tile names — open question (Q8).** In the *binary* minor-3/4 character form, neither program reads anything after the 120 graphic names, so the extra bytes some files carry are harmless; where they came from, and why the `sizeType` byte reads `99` on one Caoquest file, is unknown. See [older-binary-versions.md](older-binary-versions.md#character-before-minor-8). The text form above is exactly 45091 lines in both corpus files, so it carries no such residue.

The pixels are written into a new tileset; see [conversion.md](conversion.md#characters).

<!-- OWNER: TEM2 — the text character form appears in only one corpus game (Caoquest's 2 files); the layout is checked against both files, not across two games, and against the arithmetic of the fixed blocks. Named as an open question in §15.15. -->

## Item

**16 files in the corpus, all Caoquest**, `major 2 / minor 1`.

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

**Worked example (legacy fact).** Caoquest's `dagger.itm` (size type 0, every picture empty) is 104 lines (`3 + 28 + 17 + 56`, each of its 17 pictures a single empty marker line); `10smp.itm` (size type 0, one full picture) is 1127 lines (`3 + 28 + 1 × 1024 + 16 + 56`). All 16 files end exactly at the animation line — the cross-file check for this layout.

<!-- OWNER: ITM2 — the text item form appears in only one corpus game (Caoquest's 16 files); the worked example is checked across the two files shown and the other 14, not across two games, because no other corpus game writes a text `.item`. Named as an open question in §15.15. -->

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

**52 files in four games** (FinalDestiny 7, Caoquest 5, School2Demo 7, ChimeranEmpire 33), all `major 2 / minor 0`, and the only `.ene` form the corpus contains. **Every one is exactly 363 lines** (`3 + 8 + 2 + 133 + 202 + 7 + 4 + 4`), which is the strongest text-form evidence in the corpus.

No strengths and no custom stances. **Tile-grid note (R-20, legacy fact).** The original editor always reads a **19 × 7 grid (133 lines)** and uses its top-left width × height part. The original engine reads only width × height lines, which misreads every file whose enemy is not exactly 19 × 7. The fixed grid is what Toolkit 2 wrote, and the 363-line total across all 52 files confirms it; this closes §15.15 question 4 in favour of the fixed grid.

## Fight background

| Line(s) | Field |
|---|---|
| 1 | `RPGTLKIT BKG` |
| 2, 3 | major, minor |
| | tile grid: **19 × 11** tile names (x outer) = 209 lines (4-212) — see note |
| | music, selectSound, chooseSound, readySound, cantDoSound (213-217) |
| 218 | 1 line — **reserved**; see note (Q9) |
| | 19 × 11 × (r, g, b) tint lines = 627 lines (219-845) |

**Grid-size note (legacy fact; §15.14).** The original editor reads 19 × 11 (a 608 × 352 battle backdrop). The original engine reads 19 × 19, which would misread every file; the editor's size is the Toolkit 2 layout. §8.3's "19 × 19" statement is corrected to 19 × 11.

**Corpus check (legacy fact).** **23 files in four games** (FinalDestiny 3, Caoquest 5, School2Demo 6, ChimeranEmpire 9), all `major 2 / minor 0`, and every one is exactly 845 lines: `3 + 209 + 5 + 1 + 627`.

**Line 218 — open question (Q9).** A single name field sits between the four menu sounds and the shade grid and is empty in all 23 files. Round 5 `Q9` says neither program uses it — both read the line and discard it — and the 845-line total confirms its position. What 2.x stored there is unknown, so treat the line as **reserved**.

## Status effect

`RPGTLKIT STATUSE`, major, minor, then name, rounds, speed, slow, disable, hp, hpAmount, smp, smpAmount, code, prg — the same fields as the binary format, one per line.

**Unverified against a real file (R-21).** The corpus holds **no** text `.ste` — its five `.ste` files are binary minor 2 — so this layout is taken from `docs/spec`'s field list alone and is not checked against any real sample. (`docs/spec/examples/versions/status-effect/status_text.ste` is an authored sample, not evidence.) A reader must still recognise a text `.ste` at its probe byte (byte 16) and report it as an unsupported text form rather than misread it as binary. This closes §15.15 question 7 as unverified, and it is the section's one deferred question (`STE2`).

## Special move

**8 files in the corpus, all Caoquest**, all exactly 13 lines, `major 2 / minor 0`. `RPGTLKIT SPLMOVE`, major, minor, then name, fp, smp, prg, targetSmp, battle, menu, statusEffect, animation, description — the same fields as the binary format, one per line. The eight files end exactly at the description, which is the check.

## Animation

| Line(s) | Field |
|---|---|
| 1 | `RPGTLKIT ANIM` (compared case-insensitively) |
| 2, 3 | major, minor (ignored) |
| 4, 5 | width, height (pixels) |
| 6 | frame-count line (ignored — see note) |
| 7-159 | 51 × (image, transparent colour, sound) = 153 lines |
| 160 | delay (seconds) |

**Frame-count line (R-17, legacy fact).** The original editor always reads **51** frames by position and ignores the frame-count line. The engine trusts the line and reads its value + 1 frames. In all **17** corpus text `.anm` files — every one exactly 160 lines — the line is written `0` while 51 frames follow (Caoquest 7, ChimeranEmpire 9, plus the official 2.20b demo's `explode.anm`). So a reader takes the 51-frame block by position and **ignores the line**; an engine that trusted a `0` would show only the first frame and would take the delay from the second frame's image-name line. This corrects the earlier claim that the Toolkit "always stored UB = 50" and closes §15.15 question 5. In Caoquest's `combo.anm`, line 160 is `6.66666666666667E-02`, the delay.

<!-- OWNER: ANM2 — chose "read the 51-frame block by position" over "trust the frame-count line", because all 17 samples write `0` while storing 51 frames; the count's meaning is recorded as an open question (§15.15). -->

## Font (Toolkit 2 text)

**5 files in four games** (FinalDestiny 1, Caoquest 1, School2Demo 1, ChimeranEmpire 2), all exactly 2051 lines. The `.fnt` file has **no binary twin** and is not described in the current format pages.

| Line(s) | Content |
|---|---|
| 1 | magic `RPGTLKIT FONT` |
| 2 | version (`2`) |
| 3 | subversion (`0`) |
| 4…2051 | 2048 decimal values 0…255, one per line |

Each value is one 8 × 8 cell row: glyph code 0…255 in order, **eight values per glyph**, **top row first**, with bit 7 the leftmost pixel. `1` is ink and `0` the transparent background, and only the low eight bits of each value matter. Every glyph is a fixed 8 × 8 cell indexed directly by character code; there is no palette, no per-glyph width and no trailing atlas. Lines are CRLF-separated and each value is written with a space on each side, so the byte length is `21 + Σ(digits(v) + 4)` over the 2048 values. All 5 files are exactly 2051 lines with magic `RPGTLKIT FONT`, version `2`, subversion `0` and 2048 values, which is the check. (Entry-2 answer Q7; `format-spec §15.12`.)

## Single tile, version 1 (Toolkit 1)

A `.gph` whose first line is not `RPGTLKIT TILE`: 16 lines of 16 characters. Each character's code minus 33 is a [DOS palette](../tiles.md#dos-palette) index; the tile is 16 × 16 and drawn doubled. (The version 2 `.gph` text format is current and described in [../tiles.md](../tiles.md#single-tile-gph).) The 288-byte sample `docs/spec/examples/versions/single-tile/v1tile.gph` is 16 rows of 16 characters plus a CR/LF each. This v1 form is evidence-backed but carries **no reader** (see the Toolkit 1 support-scope rule above).

<!-- OWNER: GPH2 — chose "record v1, promise no reader" over "add a v1 reader", because v1 is Toolkit 1.x and §9.9 already puts Toolkit 1.x out of scope for the first release; a later entry can add it from the v1 sentence in the tiles page plus the 288-byte sample. -->

## Board (Toolkit 2 text)

Not readable by Toolkit 3.1. The 3.1 editor rejects it with "Please save this board using RPGToolkit version 3.0.6 or below to upgrade the file format"; the engine asks for the board to be saved in the editor. Converting such a board needs Toolkit 3.0.6 or an importer written from a Toolkit 2 sample.

**17 files in four games** (FinalDestiny 1, Caoquest 14, School2Demo 1, ChimeranEmpire 1), all `major 2 / minor 1`. One field per line; the tile cube is stored with **x outermost, then y, then layer innermost** (the reverse nesting of the binary board, [../board.md](../board.md)). Layout (`format-spec §15.3`, entry-2 answer Q1; minor-0 differences noted):

| # | Lines | Field |
|---|---|---|
| 1-5 | 5 | magic, major (2), minor (0 or 1), registered flag, registration code (both ignored) |
| 6 | 2 | width and height in tiles — **minor 1 only**; minor 0 has none and means 19 × 11 |
| 7 | width × height × 8 × 5 | tiles, in cell order x, then y, then layer 1…8 innermost, each cell `tile name`, `ambient red`, `green`, `blue` (signed), `tile type`. The layer count is always 8 and is not stored. |
| 8-12 | 5 | background image, border image (unused), board background colour, border colour (unused), ambient effect preset (0 none, 1 mist, 2 darkness, 3 water) |
| 13 | 4 | direction links in order N, S, E, W |
| 14-16 | 3 | battle skill level, battle background, fighting-allowed flag |
| 17-19 | 11 | ten board constants (numbers) and the background music |
| 20 | 8 | layer titles 1…8 |
| 21 | 561 | program records: **51 fixed records of 11 lines** (file, x, y, layer, graphic, activation mode, activation variable, end variable, initial value, end value, activation type); an empty file name is an unused slot |
| 22 | 110 | item records: **11 fixed records of 10 lines** (file, x, y, layer, activate, initialVar, finalVar, initialValue, finalValue, activationType); activation and multitask programs follow in rows 24 and 26 |
| 23-26 | 3 + 11 + 1 + 11 | player start x, y, layer; 11 per-item activation programs; the "can save here" flag; 11 per-item multitask programs |
| 27 | 4 | day/night flag, night battle override, night skill level, night battle background (all unused) — **absent in the 19 × 11 default boards** |

Total lines are `739 + 40 × width × height`, and the reader needs no trailing field: `739 + 40 × 19 × 20 = 15939` and `739 + 40 × 50 × 50 = 100739` hold exactly. **Fourteen of the 17 files parse to the last line; the three 19 × 11 `.brd` templates hold exactly 4 lines fewer than the formula**, because they omit the closing day/night group (row 27), so a reader must accept the file ending after row 26.

*Worked example — the first seven lines of FinalDestiny's `start.brd` (9095 lines, day/night tail absent) and Caoquest's `town.brd` (15939 lines), thin spaces shown as `·`:*

```
FinalDestiny/start.brd        Caoquest/town.brd
RPGTLKIT BOARD                RPGTLKIT BOARD
·2·                           ·2·
·1·                           ·1·
·0·                           ·0·
NOCODE                        NOCODE
·19·                          ·19·
·11·                          ·20·
```

`town.brd`'s `19 × 20` and the Caoquest boards' 15939/11379/100739 line counts fit the formula exactly — the cross-game check for this layout.

<!-- OWNER: BRD2 — chose to record the trailing day/night group as optional over requiring it, because the three default 19 × 11 boards in FinalDestiny, School2Demo and ChimeranEmpire stop four lines early and a reader that demanded the group would refuse them. -->
