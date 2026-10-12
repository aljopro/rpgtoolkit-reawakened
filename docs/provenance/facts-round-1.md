<!-- Reviewed fact sheet, clean-room extraction round 1 (ADR 0006). Status: reviewed prose facts, not yet folded into format-spec.md; each ruling that uses them is its own doc-first commit (G7). Questions: questions-round-1.md (Q1 to Q13). Q14 to Q18 were an addendum later moved into questions-round-2.md as R2-Q1 to R2-Q5; their answers here are brief and facts-round-2.md is authoritative for them. Legacy revisions consulted: 9191b919, and 08f2fe3d for the 2.x text board reader in Q1. Q8 to Q18 describe the 3.0.x and 3.1 runtimes, not TK2's own. Review: two independent reviewers; zero blockers after edits; see extraction-log.md. -->

# Clean-room extraction, round 1: staging answers (edited after review)

* **Source consulted:** legacy RPG Toolkit checkout at revision `9191b919` (HEAD of the checkout). For Q1 the 2.x text board reader no longer exists at HEAD, so the older revision `08f2fe3d` (dated 2004-08-06, "3.0.4 dev") in the same repository's history was read for that one reader only.
* **Date of extraction:** 2026-10-12.
* **Question list:** `docs/provenance/questions-round-1.md` (Q1 to Q18).
* **Form:** prose facts in the extractor's own words. No code, no identifiers, no source comments or message text.
* **Reading note that applies to every text layout below:** the legacy text readers fetch most fields as whole lines (a line ends at CR, LF or CRLF; no quoting, no comma splitting, leading/trailing spaces kept). Each numeric field is then converted from its line with the host language's ordinary string-to-number conversion: decimal, optional leading minus, no base prefixes. The three header values (magic, major, minor) are read as comma/line separated tokens instead, so they behave the same on separate lines. A conversion failure is swallowed by a resume-next error mode and leaves the field at its prior value. Booleans are 0/1 numbers.
* **Reading note on "two runtimes":** the legacy tree contains two generations of script runtime: an older one written in Visual Basic (the 3.0.x engine) and a later C++ one (the 3.1 engine). Q9 and Q12 to Q18 are answered for both and say which is which. **Neither is the original TK2 runtime.** Anything about what TK2 itself did is not settled by this source unless stated.

---

## Q1: 2.x text `.brd` layout

**Where the facts come from.** The 3.1 board reader refuses text boards outright (it only tests that the byte at zero-based offset 14 is non-zero and then reports that text boards are unsupported). The actual text reader survives only in the 2004 revision `08f2fe3d` named above. The facts below are from that reader.

**Dispatch.** The byte at zero-based offset 14 (one-based byte 15) being non-zero means text. The first line must be exactly the magic `RPGTLKIT BOARD` (else the file is treated as a still older "version 1" board). Major must equal 2. A minor greater than 2 only prompts a warning. Minors 0 and 1 are the text layouts; minor 2 is the first binary one.

**Delimiter and encoding.** One field per line, no separators inside a line. Numbers are decimal text. No repeated-group counts are stored anywhere in this layout; every group has a fixed repetition count (below). The tile cube is written with the x index outermost, then y, then layer innermost (the reverse nesting of the later binary form).

**Line sequence (minor 1; differences for minor 0 are marked).**

| Order | Lines | Field | Notes |
|---|---|---|---|
| 1 | 1 | magic `RPGTLKIT BOARD` | |
| 2 | 1 | major (2) | |
| 3 | 1 | minor (0 or 1) | |
| 4 | 1 | registered flag | ignored |
| 5 | 1 | registration code | ignored |
| 6 | 2 | width in tiles, then height in tiles | **minor 1 only.** Minor 0 has no such lines and means 19 wide by 11 high. |
| 7 | 5 per cell | tile file name, ambient red, green, blue (signed ints, may be negative), tile type | cells ordered x = 1..width, y = 1..height, layer = 1..8 innermost. The layer count is always 8 (it is not stored). An empty tile name is "no tile". |
| 8 | 1 | background image file | |
| 9 | 1 | border image file | unused later |
| 10 | 1 | board background colour | RGB integer |
| 11 | 1 | border colour | unused later |
| 12 | 1 | ambient effect preset | 0 none, 1 mist, 2 darkness, 3 water |
| 13 | 4 | direction links in the order north, south, east, west | file names |
| 14 | 1 | battle skill level | |
| 15 | 1 | battle background | |
| 16 | 1 | fighting allowed flag | 1 yes, 0 no |
| 17 | 10 | board constants 1 to 10 | numbers |
| 18 | 1 | background music | |
| 19 | 8 | layer titles 1 to 8 | |
| 20 | 51 records of 11 lines | program records, indices 0..50, fixed count: program file, x, y, layer, graphic, activation mode (0 always, 1 conditional), activation variable, end-of-run variable, activation initial value, end-of-run value, activation type (0 step on, 1 key) | records with an empty file name are unused slots |
| 21 | 11 records of 10 lines | item (sprite) records, indices 0..10: item file, x, y, layer, activation mode, activation variable, end-of-run variable, initial value, end value, activation type | |
| 22 | 3 | player start x, y, layer | tile coordinates |
| 23 | 11 | per-item activation program, index 0..10 | parallel to table 21 |
| 24 | 1 | "can the player save here" flag | 0 means yes, 1 means no |
| 25 | 11 | per-item multitask program, index 0..10 | parallel to table 21 |
| 26 | 4 | day/night flag, night battle override flag, night skill level, night battle background | all unused later |

The reader stops after the last of those lines; it never tests for end of file. A well-formed file therefore has no unread lines. Total line count is `739 + 40 x width x height` for minor 1; for minor 0 (no size lines, 19 x 11) it is `737 + 40 x 209 = 9097`.

**Worked example (data only, minor 1, a 1 by 1 board).** Lines 1-5: `RPGTLKIT BOARD`, `2`, `1`, `0` (or `1`), a registration code. Lines 6-7: `1`, `1`. Then 8 cells of 5 lines for layers 1 to 8, e.g. `grass.tst1`, `0`, `0`, `0`, `0` for layer 1 and an empty name, `0`, `0`, `0`, `0` for layers 2 to 8. Then 5 lines of images/colours/effect, 4 links, 3 battle lines, 10 constants, 1 music, 8 layer titles, 561 program lines, 110 item lines, 3 start lines, 11, 1, 11, 4. Total 779 lines = 739 + 40.

**Not settled by the source:** which tile-type numbers occur beyond 0 (normal) and 1 (solid) in TK2-written files; the source only stores them. The exact registration-code content.

---

## Q2: 2.x text `.gam` layout

**Dispatch.** The byte at zero-based offset 13 (one-based byte 14) being non-zero means text. Only the older Visual Basic runtime's reader has a text path; the 3.1 reader has none.

**Header discrepancy (read this first).** The text reader reads the three header tokens and compares the first against the 17-character string `RPGTLKIT mainForm`, not `RPGTLKIT MAIN`. A file whose first line is `RPGTLKIT MAIN` fails that comparison and is routed to a still older "version 1 main file" reader instead. The question's own detail (the byte at offset 13 is a carriage return) fits the 13-character header and not the 17-character one, so corpus files likely carry the shorter header and would take that older path. The layout table below is therefore for the 17-character header only. Which header the corpus files really carry cannot be decided from the source. The text reader also expects minor 0 (it warns and offers to continue when the minor is not 0).

**Layout (main-form text reader).** One field per line after the three header tokens (magic, major = 2, minor).

| # | Lines | Field |
|---|---|---|
| 1 | 1 | registered flag (ignored) |
| 2 | 1 | startup program |
| 3 | 1 | run-time program |
| 4 | 1 | "use built-in menu" flag (ignored; the stock menu plugin name is assumed) |
| 5 | 1 | run key, ASCII code |
| 6 | 1 | menu key, ASCII code |
| 7 | 1 | general (interact) key, ASCII code |
| 8 | 1 | **initial board** |
| 9 | 1 | **initial character** |
| 10 | 1 | fighting flag (0 = fighting on, 1 = off, as in the binary form) |
| 11 | 1 | multitask speed (ignored) |
| 12 | 1 | memory protection (ignored) |
| 13 | 501 x 2 | enemy list: enemy file, skill level; indices 0..500, fixed count; empty file names are unused slots |
| 14 | 1 | fight type (0 random, 1 planned) |
| 15 | 1 | chances |
| 16 | 1 | use alternate fight program flag |
| 17 | 1 | fight program |
| 18 | 1 | ignored |
| 19 | 1 | game title |
| 20 | 1 | screen mode |
| 21 | 1 | ignored (fight style) |
| 22 | 1 | game over program |
| 23 | 1 | **project path** |
| 24 | 1 | skin button graphic |
| 25 | 1 | skin window graphic |
| 26 | 1 | ignored (target platform) |
| 27 | 51 x 2 | extended run-time keys: key code, program; indices 0..50, fixed count |
| 28 | 1 | ignored (registration code) |
| 29 | 1 | extend to full screen |
| 30 | 1 | resolution code |
| 31 | 1 | **plugin count n** (a true count, unlike the binary upper bound) |
| 32 | n | one enabled flag per plugin slot; slot index i (from 0) with flag 1 stands for the plugin file `tkplug<i>.dll` |
| 33 | 1 | use day/night |
| 34 | 1 | day/night type |
| 35 | 1 | day length |
| 36 | 1 | disable protect-registered flag |
| 37 | 1 | ignored (old parallax) |
| 38 | 1 | language file |

Nothing follows line 38. **Role answers:** project path is line 23 (read as-is, no normalisation); startup program line 2; initial board line 8; initial character line 9. When running from a package the project path is overridden to empty (same as binary), and otherwise the stored value is used as a prefix on every project subfolder.

**Worked example (data only, synthetic).** Three header lines (`RPGTLKIT mainForm`, `2`, `0`), then lines 1 to 12 (12 lines), 1002 enemy lines, lines 14 to 26 (13 lines), 102 extended-key lines, lines 28 to 31 (4 lines, with n = 0 on line 31), no flag lines, and lines 33 to 38 (6 lines). Total 3 + 12 + 1002 + 13 + 102 + 4 + 0 + 6 = 1142 lines; each additional plugin slot adds one line.

**Other headers.** A header other than the text magic is routed to an older line-per-field reader; its layout is not part of this answer.

**Not settled:** the exact header string actually present in the corpus (see discrepancy above).

---

## Q3: 2.x text `.itm` layout

**Dispatch.** The byte at zero-based offset 13 being non-zero means text. Header: magic `RPGTLKIT ITEM`, major (must be 2), minor. The text reader accepts any minor; minor 1 additionally has a size-type line (below); the loader does not otherwise key on minor.

**Layout (one field per line after the three header tokens).**

| # | Lines | Field | §6.2 counterpart |
|---|---|---|---|
| 1 | 1 | item name (handle) | name |
| 2 | 1 | equipable flag | equipable |
| 3 | 1 | menu-usable flag | menu-usable |
| 4 | 1 | board flag | board-usable |
| 5 | 1 | battle flag | battle-usable |
| 6 | 7 | equip-slot flags in order head, neck, left hand, right hand, body, legs, accessory | equip slots (binary has 8, text has 7) |
| 7 | 1 | accessory name | accessory name |
| 8 | 4 | equip bonus HP, DP, FP, SMP | equip bonuses |
| 9 | 2 | on-equip program, on-remove program | |
| 10 | 3 | menu use: +HP, +SMP, program | |
| 11 | 3 | battle use: +HP, +SMP, program | |
| 12 | 1 | program run while the item is on the board | the binary "multitask program" |
| 13 | 1 | program run when picked up / interacted with | the binary "activation program" |
| 14 | 1 | size type (0 = 32x32 embedded pictures, 1 = 64x32) | **minor 1 only**; for minor 0 it is treated as 0 |
| 15a | see below | graphics | no counterpart (binary stores animations) |
| 16 | 1 | used-by (0 all, 1 listed) | |
| 17 | 50 | allowed character names, indices 1..50 | binary has 51 (0..50); text has no entry 0 |
| 18 | 1 | buy price | |
| 19 | 1 | sell price | |
| 20 | 1 | key item flag | |
| 21 | 1 | one-line description | position differs from the binary form |
| 22 | 1 | battle animation file | |

**Graphics block (row 15a).** If size type is 0: seventeen embedded 32 x 32 pictures follow (16 walking frames, then 1 rest picture). Each picture starts with one value; if that first value is -2 the picture is empty and nothing else is stored for it. Otherwise the 1024 pixel values (x outer, y inner, one integer colour per line) are stored, the first of which is that first value. If size type is 1: 16 frame pairs of file names (top, bottom) for walking (frames 0-3 south, 4-7 east, 8-11 north, 12-15 west), then 2 lines for the rest pair (top, bottom).

**No text counterpart for these binary fields:** idle animations, speed, idle time, custom stances, vector collision and activation bases, size type as a byte, and the two reserved strings. **Text-only:** embedded pixel pictures, the size-type line, per-character list lacking entry 0.

**Worked example (data only; size type 1, no allowed characters).** Header 3 lines, then name, four flags, seven slot flags, accessory name, four bonuses, two equip programs, three menu-use lines, three battle-use lines, two board programs, size type `1`, 32 frame names, 2 rest names, used-by `0`, 50 empty lines, buy, sell, key flag, description, animation: 3 + 1 + 4 + 7 + 1 + 4 + 2 + 3 + 3 + 2 + 1 + 34 + 1 + 50 + 3 + 1 + 1 = 121 lines. The reader stops after the animation line.

---

## Q4: 2.x text `.tem` layout

**Dispatch.** The byte at zero-based offset 13 being non-zero means text. Header: magic `RPGTLKIT CHAR`, major (2), minor. A minor greater than 0 adds a size-type line; minor 1 and minor 2 differ in the fight-graphics block (below). Minor 2 is the one asked about.

**Layout, minor 2, size type 1 (64 x 32), one field per line after the header.**

| # | Lines | Field |
|---|---|---|
| 1 | 1 | character name |
| 2 | 9 | script variable names, in order: experience, DP, FP, HP, max HP, name, SMP, max SMP, level |
| 3 | 8 | initial stats, in order: experience, HP, max HP, DP, FP, SMP, max SMP, level |
| 4 | 1 | profile picture |
| 5 | 201 x 5 | special-move list, indices 0..200, **fixed count (no length field)**: move file, minimum experience, minimum level, condition variable, condition value |
| 6 | 1 | special-move category name |
| 7 | 1 | "does special moves" flag (0 = yes, 1 = no) |
| 8 | 1 | size type (0 = embedded 32x32 pictures, 1 = 64x32); present when minor > 0 |
| 9 | 32 | walking graphics: 16 frames x (top, bottom) file names; frames 0-3 south, 4-7 east, 8-11 north, 12-15 west |
| 10 | 64 | minor 2 fight graphics: for sub-tile row 0..1 (outer), sub-tile column 0..1, direction 0..3 (inner): fight, defend, special move, death file names (four lines per position) |
| 11 | 4 | fight-rest graphic: 2 x 2 sub-tile names (row outer, column inner) |
| 12 | 20 | ten custom graphics x (top, bottom) |
| 13 | 10 | accessory slot names 1..10 |
| 14 | 6 | body-slot-in-use flags 1..6: head, neck, left hand, right hand, body, legs |
| 15 | 1 | level progression type (0 quadratic/percent, 1 linear) |
| 16 | 1 | experience increase factor |
| 17 | 1 | maximum level |
| 18 | 4 | level-up increase of HP, DP, FP, SMP |
| 19 | 4 | obsolete sounds: swipe, defend, special move, death |
| 20 | 1 | level-up program |
| 21 | 1 | level-up type |

Total 1179 lines for a minor-2, size-type-1 file (3 header + 1176). Nothing follows.

**Worked example (data only, minor 2, size type 1, a character with no special moves).** Header 3 lines (`RPGTLKIT CHAR`, `2`, `2`); then 1 name, 9 variable names, 8 stats, 1 profile picture, 1005 special-move lines (201 empty-name records of five lines with zero numbers), 1 category name, 1 special-moves flag, 1 size type (`1`), 32 walking names, 64 fight names, 4 fight-rest names, 20 custom names, 10 accessory names, 6 body flags, then 13 closing lines (progression type, factor, maximum level, four increases, four sounds, level-up program, level-up type). 3 + 1 + 9 + 8 + 1 + 1005 + 1 + 1 + 1 + 32 + 64 + 4 + 20 + 10 + 6 + 13 = 1179 lines.

**Differences.** Minor 1 stores the fight-graphics block as 2 lines per entry (top, bottom): for sub-row outer 0..1, direction inner 0..3, four lines each = 32 lines, then fight rest as 2 lines. Size type 0 (any minor, or minor 0 which has no size line): 16 walking pictures of 1024 colour lines each (x outer, y inner), then for four directions the fight, special, defence and death pictures stored interleaved four-per-pixel (all four kinds' pixel for the same x, y consecutively, direction outer), then a rest picture, then ten custom pictures. The special-move list length is not encoded; it is always 201 entries. No group is optional apart from the size-type line.

**Not settled:** whether the corpus's two `.tem` files use size type 0 (embedded) or 1; the source reads both.

---

## Q5: binary `.gam` minor 2 (2.19)

The writer's version constants associate minor 1 with a text form of version 2.1, minor 2 with a binary form of version 2.19 and minor 3 with an interim 3.0 form. The binary reader (both runtimes) keys the 2.19 layout as the ordered list below; all integers little-endian; "i16" is the 2-byte integer, "i32" the 4-byte integer; strings are NUL terminated. Byte offsets cannot be fixed because most fields are NUL-terminated strings of varying length.

| Order | Type | Meaning | Present when |
|---|---|---|---|
| 1 | str | magic | |
| 2 | i16, i16 | major, minor | |
| 3 | i16, str | registered flag, registration code | |
| 4 | str, str | project path, game title | |
| 5 | i16 x 3 | screen type, extend-to-full-screen, resolution | |
| 6 | **i16** | old parallax value | minor < 3 |
| 7 | i16, str | disable protect-reg, language file | |
| 8 | str x 3 | startup program, initial board, initial character | |
| 9 | str, i16 x 3 | run-time program, run key, menu key, interact key | |
| 10 | i16 n, then n+1 x (i16 key, str program) | extended run-time keys | |
| 11 | **i16** | placeholder where later versions store menu and fight plugin names | minor < 3 |
| 12 | i32, i16 | multitask speed, memory protection | minor <= 2 |
| 13 | i16 | fighting flag | |
| 14 | i16 n, then n+1 x (str enemy, i16 skill) | | |
| 15 | i16, i32, i16, str | fight type, chances, alternate-fight flag, fight program | |
| 16 | **i16** | old fight style | minor < 3 |
| 17 | str x 3 | game-over program, skin button, skin window | |
| 18 | i16 n, then n+1 x i16 | plugin enabled flags (slot i means `tkplug<i>.dll`) | minor <= 2 |
| 19 | i16, i16, i32 | day/night use, type, length | |

That is the end of what the legacy readers consume for minor 2. **No bytes beyond field 19 are read for minor 2, and nothing in the source writes minor 2.**

**Discrepancy between the two readers.** The Visual Basic reader reads fields 6 and 11 as 2-byte integers; the C++ reader reads the same two reserved slots as 4-byte integers (and its first reserved registration slot as a 4-byte value that swallows two characters of the code, which keeps strings aligned). The source does not say which one matches real TK2 files.

**Comparison with format-spec §2.** The extractor did not compare this list against the project's spec and does not list corrections to it.

**What the source cannot settle.** The 1506-byte residue and the end-of-file overruns on the corpus files: the source reads nothing past field 19, so it never meets those bytes. It neither confirms nor explains any tail. Q5 is therefore only partly answered: the ordered list above is what the source reads, but "the true 2.2 field set" cannot be confirmed from it, and the 2-byte vs 4-byte question for fields 6 and 11 is open.

---

## Q6: binary `.tem` minor 3 and minor 4

Both runtimes agree. Ordered fields (little-endian; strings NUL terminated):

| Order | Type | Field |
|---|---|---|
| 1 | str; i16, i16 | magic `RPGTLKIT CHAR`, major, minor |
| 2 | str | name |
| 3 | str x 9 | script variable names: experience, DP, FP, HP, max HP, name, SMP, max SMP, level |
| 4 | i32 x 8 | initial stats: experience, HP, max HP, DP, FP, SMP, max SMP, level |
| 5 | str | profile picture |
| 6 | 201 x (str, i32, i32, str, str) | special moves: file, minimum experience, minimum level, condition variable, condition value |
| 7 | str | special-move category name |
| 8 | i8 | "does special moves" flag (0 = yes) |
| 9 | str x 11 | accessory slot names (indices 0..10) |
| 10 | i8 x 7 | body-slot flags (indices 0..6; index 0 unused) |
| 11 | **minor 3: i8; minor 4: i32** | level progression type |
| 12 | i16 | experience increase |
| 13 | i32 | maximum level |
| 14 | i16 x 4 | level-up increase HP, DP, FP, SMP |
| 15 | str x 4 | swipe, defend, special move, death sounds (present for every minor below 5) |
| 16 | str | level-up program |
| 17 | i8 | level-up type |
| 18 | i8 | size type |
| 19 | **120 x str** | old graphics block, for all minors below 5: 32 walking names (16 frames x top, bottom; frames in order south, east, north, west, four each); 64 fight-family names (direction outer 0..3, then sub-row 0..1, then sub-column 0..1, and per position four names in order fight, defend, special, death); 4 fight-rest names (2 x 2, x outer); 20 custom names (10 x top, bottom) |

End of file after field 19.

**Version split.** The only layout difference the source shows between minor 3 and minor 4 is the width of the level progression type in field 11 (one byte for 3, four bytes otherwise). Everything else is identical for minors 3 and 4. The custom stances, idle animations and movement animation strings the question mentions do not exist below minor 5, so nothing "moves" between 3 and 4.

**Inference on the 407 to 797 byte tail:** field 19 is 120 NUL-terminated names, which is consistent with a tail of that size (at least one byte each plus file names). This is an inference, not something the source states.

Confirmation against samples is not possible from the source; no sample character files for minors 3/4 exist in the tree.

---

## Q7: `.fnt` bitmap font file

The file is **text**, not binary. Lines:

| Order | Line | Content |
|---|---|---|
| 1 | magic | `RPGTLKIT FONT` (compared case-insensitively) |
| 2 | version | `2` (read, never checked) |
| 3 | subversion | `0` (read, never checked) |
| 4 .. 2051 | 256 glyphs x 8 | for glyph code 0..255 in order, eight decimal integers 0 to 255, one per line, each the bit pattern of one pixel row of an 8 x 8 cell, top row first |

**Pixel encoding.** One integer per row; the most significant bit is the leftmost pixel; 1 means ink, 0 means background (transparent when drawn). Only the low 8 bits of a stored value matter. No palette, no per-glyph width or height: every glyph is a fixed 8 x 8 cell, indexed directly by character code (the glyph for the character with code c is entry c). The writer terminates lines with CRLF.

**Length formula.** Bytes = 15 (magic + CRLF) + 3 (`2` + CRLF) + 3 (`0` + CRLF) + the sum over 2048 values of (decimal digit count 1 to 3, plus 2). Lines = 2051. That is 21 + 2048 x 3 = 6165 bytes if every value is a single digit and 21 + 2048 x 5 = 10261 bytes if every value is three digits. Not confirmed against corpus files (not available).

No bitmap atlas or other section follows. Reader can reach end of file with nothing left.

---

## Q8: the 3.1 RPGCode update wizard

**What it is.** The wizard converts programs written for pre-3.1 versions (3.0.x era, `=`-as-comparison and unquoted-string style) to the 3.1 syntax. The source does not mention TK2 conversion. It is offered once at editor start-up when the installer flagged a previous pre-3.1 install, and on demand from a menu in the RPGCode editor. Steps: welcome, caveats, file choice (the project's program folder as a tree, every file pre-checked, folders check/uncheck their children), confirm, progress, finish. Each checked file is first copied to a `Backup` sub-folder of the programs folder (folder structure mirrored) and then rewritten in place. On finishing, the start-up flag is cleared. The wizard itself warns that object-oriented files will be damaged, that removing type sigils can merge two variables that differed only by type, and that it must not be run twice.

**Rule per construct.**

* **`#strict` directive.** A line whose content is exactly `#strict` (any case, ignoring spaces/tabs) is dropped from the output and turns on strict mode for the rest of that file. Strict mode disables only the comparison rewrite below.
* **Star comments.** A line whose first non-blank character is `*` is copied unchanged (the old star comment is not converted).
* **Slash comments.** Text from the first `//` onward, even inside quotes, is split off as a comment; the code part is trimmed on the right and updated, then the comment is re-attached after one space when the code part is non-empty.
* **Bare words as arguments.** Text inside double quotes is never touched. Elsewhere, for each pair of parentheses (outermost first, then recursively inside), the arguments are split on commas outside quotes, and each non-empty argument that is not a number, not `true`/`false` (any case), and contains none of the characters `! $ ( ) + - * / < > = & | \ ~ ^ % . , "` is wrapped in double quotes. So bare words become strings; arguments containing a sigil, an operator, a dot (file names) or a quote are left alone.
* **`for` calls.** For a call named `for` (any case), commas inside the parentheses become semicolons and nothing else happens.
* **`case` calls.** An argument that is just `else` is left alone.
* **Square brackets.** The same quoting is applied to the bracket content (text map keys), using the most recent call name seen on the line.
* **Single `=`.** A single `=` (not part of `==`, `<=`, `>=`, `~=`) found before any parenthesis at that line level: the whole right-hand side goes through the same argument quoting. If that `=` lies inside a call's parentheses (including `if`/`while` conditions) and the file is not strict, it is rewritten to `==`. On a top-level line it stays `=`.
* **`==` and `+=`.** The right-hand side is quoted by the same rule; the operator is kept.
* **Type sigils.** Every `!` and `$` outside double quotes is deleted.
* **Output.** Lines are joined with CRLF and the file gets one extra trailing blank line.

**Order where it matters.** The comment split happens before any rewriting of the code part, and sigil removal is the last rewrite. All rewrites are applied unconditionally to every selected file; the only per-file choice is selection, and `#strict` is the only in-file switch.

**Left unchanged / not converted.** `#` statement prefixes, `{ }` blocks (and `< >` blocks), `method`/`returnMethod`, `#Branch`/`#FBranch` and other command names, namespace or implicit `file.func` includes, `#Include`, bare dialogue lines (except that a dialogue line containing parentheses or `=` is altered by the rules above, and a `//` inside a string such as a URL truncates the line), star comments, labels. Constructs the wizard damages or leaves broken: object-oriented code; two variables differing only by sigil; dialogue lines with `=` or parentheses; `//` inside quotes; `<`/`>` used as block delimiters (the 3.1 scanner has no such block token and reads them as comparison operators, and the wizard does not convert them).

**Runtime behaviour the 3.1 scanner/engine provides so unconverted constructs still run.** A `#` anywhere is discarded. `{` and `}` are blocks. `method` and `function` are synonyms; `return` and `returnmethod` are synonyms. Comments: `//` to end of line, `**` to end of line, a line beginning with `*`, and `/* ... */`. `true` is 1, `false` and `null` are 0. `and`/`or` words act as `&&`/`||`. Identifiers are case-insensitive (lower-cased). A line containing only an identifier is treated as a call with no arguments. `FBranch` is an alias of plain `Branch` in both runtimes (it does not return to the caller); the two commands differ in the original engine, and the legacy runtimes make the second an alias of the first. `=` inside a condition is an assignment, not a comparison, hence the wizard's rewrite. The 3.1 runtime does not strip `!`/`$` itself (the wizard does).

**Not settled:** anything about how TK2 scripts convert: the source has no TK2-aware converter.

---

## Q9: lookup order for an unqualified call

**3.1 (C++) runtime.**
1. A `redirect` entry for the name (set by script) replaces the name first (and if the target has a `file.` prefix, that file is also queued for inclusion).
2. An engine built-in of that name wins (decided when the script is read).
3. Otherwise the call becomes a script call, resolved after all `include`s are merged, by **name and parameter count**: first the program's own methods, then methods from included files, in the order the includes were encountered (a child program's parent comes first). A method whose name and parameter count already exist is skipped when merging, so the first definition wins.
4. If no script method matches, plugins are asked in plugin-list order and the first one that claims the name is used.
5. Otherwise a not-found runtime error is raised (see Q14).

**Older Visual Basic runtime.** After redirects and the built-in table (step 2), class instantiation is tried; then **plugins are asked before script methods**; then a name of the form `file.name` triggers an implicit include of `file.prg` and the name is cut to what follows the dot; then members of the class currently executing; then the program's script methods, matched by upper-cased name and parameter types with the most precise match chosen, ties going to the earliest registered (own methods, then included files in include order). The earlier-added definition therefore shadows the later one; nothing replaces it.

**`file.func`.** In neither runtime does the prefix select a namespace. It only ensures `file.prg` is included (once) and then the call is made by the bare name. Hence the `Queues.prg` / `Stacks.prg` `AddLit` clash resolves to whichever file's method was registered first (own file first, then include order, with an implicit include made at run time registering last). Names are matched case-insensitively. Class-qualified `Class::name` names are separate.

**Not settled:** the "file already run/loaded" tier (c) of the question does not exist in the source: only includes populate the list. Tier (d) as phrased (a prior implicit call making later unqualified calls resolve) is true only in the sense that the implicit include has merged the file.

---

## Q10: `addplyr`, `cntrtext`, `sell`

The three names do not appear anywhere in the checkout or its history (searched all text, all revisions, case-insensitive). The 3.x runtimes have a built-in that adds a player from a character file argument (named like an `AddPlayer` command), which the question's example (`addplyr("swim.tem")`) resembles, but nothing in the source ties the shorter spelling to it. A shop screen exists in the engine (buy/sell UI) but it is not a script command named `sell`.

Verdict for all three: **not settled** (class unknown, no signature, no alias evidence).

---

## Q11: `#GiveDP` / `#GiveFP`

The names `GiveDP` and `GiveFP` do not appear anywhere in the checkout or history. Not an engine built-in in either runtime. Whether they came from the misc plugins package, and whether the capitalised and lower-case spellings are one command, **cannot be settled from the source**. (Command-name matching is case-insensitive in both runtimes, so spelling case would not matter if they were plugin commands that the plugin's query answered.)

---

## Q12: can a script definition override a built-in?

In both runtimes the built-in table is consulted **before** any script method or plugin, so a script `method` of the same name never wins a normal call. The script definition is accepted (no error) and simply unreachable for calls written in the ordinary form. The only way to substitute a built-in is the script's `redirect` mapping, which rewrites the called name before the built-in lookup. A `file.`-qualified call is no different (the prefix is dropped, then the same lookup applies). Moment of effect: script definitions are registered when the program is opened (before first run) and when an included file is merged; built-ins are fixed at start-up. Plugin commands are consulted after built-ins in the C++ runtime and after built-ins but before script methods in the older runtime, so a plugin can shadow a script method but not a built-in.

---

## Q13: does plugin dispatch stop at the first claim?

Yes, in both runtimes. The engine goes through the loaded plugins one at a time; plugins that do not declare the RPGCode capability are skipped (an old-style DLL with no type export is assumed to support it); the name is passed in lower case to the plugin's query; the first plugin that answers "handles" is executed and no later plugin is asked. Consultation order is the plugin list from the main file in slot order, empty entries skipped (older runtime). In the C++ runtime the order is the order plugins were appended to its list; in this revision nothing in the tree appends to that list, so plugin dispatch there is inert. A plugin is never asked about a name that is an engine built-in (built-ins are matched first); in the older runtime plugins are asked before script methods of the same name.

---

## Q14 to Q18 (short; overlap round 2's R2-Q1 to R2-Q5)

These duplicate round 2's unclaimed-command questions and are kept brief. Both runtimes are 3.0.x / 3.1, not TK2's own.

**Q14: a name nobody claims.** Older VB runtime: the call goes through the debugger path. If an error handler is set it is invoked (see Q16); otherwise, if the debug window is enabled, a message identifying the failing line is appended there; if neither, it is silent. The program then continues with the next line. C++ runtime: a runtime error is raised; a handler on the current function frame, if any, receives it; otherwise a modal message box reports the file name, the line number and that the called name could not be resolved, and execution then continues past that call. The C++ runtime can have an error handler only inside a function frame (setting one at top level is itself an error), so at top level the message box always appears.

**Q15: value of an unclaimed call in an expression.** Older VB runtime: an inline call is replaced by its returned value; a call that returns nothing contributes empty text. So an assignment from an unknown call has an empty right side, and for a numeric destination the evaluator treats it as 0 and the variable is set. Behaviour in a comparison with an empty side, and assignment into a string variable, was not traced: **not settled**. C++ runtime: the call raises the Q14 error and the result slot stays at its default of number 0, unset; the consequence for the surrounding expression was not traced: **partly settled**.

**Q16: can an error handler observe it?** Yes in both runtimes, as an ordinary runtime error. Older runtime: `OnError(label)` sets a branch target and `OnError(Resume Next)` (or `ResumeNext`) sets silent mode; on the error the handler label is branched to, or, in silent mode, execution continues at the next line; `ResumeNext()` inside a handler jumps back to the line after the failing one. Neither the failing name nor line is exposed to the script in the paths read. C++ runtime: the handler is per function frame and does not propagate to callers; a single-space handler means resume next (error hidden); a label handler records the next statement as the return point and jumps; `ResumeNext` returns there; a missing label produces a second error that is shown. The name/line is not readable by the script.

**Q17: a plugin that claims a name and fails or returns nothing.** Older runtime: once the plugin says "handled" the engine never asks another. If execution reports failure, a debugger message (same path as Q14) is raised and the call still counts as handled. The return value is whatever the plugin wrote into the return slots: it starts as "none"; number and string results are substituted as for built-ins; a "none" result inside an expression contributes empty text. C++ runtime: same stop-at-first; the return slot is only written for number or string results, so a void or failed result leaves the call's pre-set value (number 0, unset); a failed execute is not otherwise treated as an error there.

**Q18: `#Name(...)` versus `Name(...)`.** In both runtimes the leading `#` is discarded before naming the command, so the two forms take the identical path, and an unknown name gets the Q14 to Q16 outcome (not dialogue). In the older runtime a line is only treated as a message when it has no word characters at all; a line of plain words is read as a command named by its first word, so loose dialogue is not supported as a fallback and becomes an unknown-command error.

---

## Not settled

* Q1: tile-type values above 1 as written by TK2; the registration-code content. The Q1 reader was read from older revision `08f2fe3d`, not HEAD.
* Q2: the actual text header string in corpus `.gam` files (reader expects the 17-character `RPGTLKIT mainForm`, question states `RPGTLKIT MAIN`).
* Q3, Q4: which size type the corpus files use (both are handled).
* Q5: the true 2.2 binary layout beyond field 19; whether the two reserved slots are 2 or 4 bytes; the 1506-byte residue; comparison with format-spec §2 was not done.
* Q6: sample confirmation (none in the tree); differences between minors 3 and 4 other than the level-type width are not present in source; the tail-size explanation is inference only.
* Q7: confirmation against the five corpus files.
* Q8: any TK2 to 3.x conversion; the legacy wizard only handles 3.0.x era syntax.
* Q10, Q11: command class, signatures and effects (names absent from the tree and history).
* Q15: expression value in conditions and for string destinations; C++ runtime consequence.
* All of Q8 to Q18 describe the 3.0.x and 3.1 runtimes and tooling, not TK2's own.

---

## Edit log

* B1 (Q14): replaced the quoted engine message with a plain description of what the message box reports; no quotation marks remain.
* B2 (Q9): replaced the quoted not-found error text with a neutral "not-found runtime error" referring to Q14.
* M1 (Q1): the 3.1 reader's test now stated as the byte at zero-based offset 14, consistent with the dispatch paragraph.
* M2 (Q2): corrected; only the older VB reader has a text path, the 3.1 reader has none.
* M3 (Q2): added a data-only synthetic worked example with a derived line count.
* M4 (Q4): added a data-only synthetic worked example matching the 1179 line total.
* M5 (Q5): replaced the quoted version labels with a neutral sentence.
* M6 (Q5): stated that offsets cannot be fixed; stated that no comparison with format-spec §2 was made; removed the reference to the repo's current spec.
* M7 (Q6): relabelled the tail-size explanation as inference; removed the reference to the repo spec's branch.
* M8 (Q8): re-ordered the rules as one entry per construct, with a single closing sentence on ordering.
* M9 (Q8): replaced the comment reference with a neutral statement about the two commands.
* M10 (Q2): replaced the version 1 fallback layout with a one-sentence scope note.
* M11 (Q7): removed the resampling clause; kept the CRLF line terminator.
* M12 (Q2): added the header evidence and the statement that the table is for the 17-character header only.
* Also: Q8 sigil-warning list and Q1 resave message paraphrased rather than echoed; Q15 evaluator internal detail described generically; Q3 position note simplified; Q14 to Q18 grouped and shortened with a note on overlap with R2-Q1 to R2-Q5; Q1 older-revision note and the Not settled list kept, with the caveat generalised to Q8 to Q18.
