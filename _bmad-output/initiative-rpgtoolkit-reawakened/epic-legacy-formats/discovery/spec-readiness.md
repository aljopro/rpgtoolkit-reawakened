# Is the file-format spec precise enough to write readers from?

Point-in-time finding of 2026-10-11, taken against the two sample games at the pinned revision 9191b9191c9bda0998c6faae16929b3331ed2ead. Produced by throwaway scripts. No sample-file content is quoted, and `docs/` was not changed: every doc fix named here is a proposal for a later, human-approved commit.

## Summary for the human

- I wrote seven throwaway readers straight from `docs/format-spec.md` and ran them over every sample file of those types in both games: tilesets, animations, battle backgrounds, boards, characters, items and an enemy (39 files, 27 distinct once byte-identical copies are merged).
- Four of the seven formats (tilesets, animations, battle backgrounds, boards) were read to the last byte exactly as the spec describes them. Every number the spec says should be a count, a flag or a colour came out sane.
- Three formats (characters, items, enemies) did NOT read cleanly as written: the readers stopped with 34 (characters, items) or 2 (enemy) unread bytes at the end. Each has a specific spec error, and I found the right layout from the sample bytes. After the fix all 5 of those files read to the last byte.
- Error 1 (characters and items): the "number of vector bases" field is stored as 1, not 2. It is an upper bound (1 means 2 bases), like every other count in the spec.
- Error 2 (enemy): the "custom stances" count is 4 bytes wide, not 2, and the stance list has 6 slots, not 5.
- Smaller doc slips: boards store "closed" shapes as -1, not 1; every sample file has major version 2, although the spec says 3; three of the battle formats' tables leave out the version header that the data does have.
- The sample games only exercise the newest version of every format. All older-version branches (characters before v8, items before v7, boards v2-3, tilesets other than 24-bit) are untested, and nine formats the spec describes have no sample at all (`.gam`, `.gph`, `.tan`, `.tbm`, `.spc`, `.ste`, `.iso`, `.sav`, `.tpk`).
- The most dangerous gap is the main game file `.gam`: it has 12 version-dependent rows and no sample. Writing a test file for it would only prove our reader agrees with our writer.
- The sample folders do not look like the layout in spec section 1.5: there is no `Main/` or `Game/` folder, the game folder holds `Tiles`, `Boards` and so on directly, and there is no `.gam` file.
- All 161 file references that point at a real file resolve with exactly the right capital letters, so the "ignore case" rule is not tested by the samples. Backslashes appear in 30 references; forward slashes, drive letters and folder prefixes appear in none.
- The colleague's inventory is correct: every number I re-derived matches (file counts and bytes per game and per extension, header tuples, folder counts, absent extensions, names with spaces; one apparent mismatch was my own counting of upper-case folder names, the inventory counts file names only).
- Verdict: the spec is good enough to write readers from for tilesets, animations, backgrounds and boards (minor 4) now; characters, items and enemies need the doc fixes below first.

## Readiness table

Files tested count every file of that type in both games. "Parsed OK" means the literal spec reading consumed exactly every byte with no read past EOF. "Distinct" merges files that are byte-identical across the two games (md5 check).

| Format | Spec section | Files tested (distinct) | Parsed OK (literal spec) | Trailing bytes (literal spec) | After empirical fix | Verdict |
|---|---|---|---|---|---|---|
| `.tst` | 3.1 | 4 (2) | 4 | 0 | 4 | ready (detail 1 only; details 2-6 and 150 unverifiable; palette table not in spec) |
| `.anm` | 7.1 | 26 (17) | 26 | 0 | 26 | ready (two open meaning questions, no layout problem) |
| `.bkg` | 8.3 | 1 (1) | 1 | 0 | 1 | needs doc fix (version header row missing from the table; data has it) |
| `.brd` (minor 4) | 4.2 | 3 (3) | 3 | 0 | 3 | needs doc fix (small: `closed` is -1; otherwise ready). Lights, images, links, iso coordTypes and minors 0-3 unverifiable |
| `.tem` | 6.1 | 2 (1) | 0 | 34 each | 2 | needs doc fix (vector-bases count) |
| `.itm` | 6.2 | 2 (2) | 0 | 34 each | 2 | needs doc fix (vector-bases count) |
| `.ene` | 6.3 | 1 (1) | 0 | 2 | 1 | needs doc fix (custom-stance count width; stance slot count) |
| `.gam` | 2 | 0 | n/a | n/a | n/a | unverifiable |
| `.gph` | 3.2 | 0 | n/a | n/a | n/a | unverifiable |
| `.tan` | 3.5 | 0 | n/a | n/a | n/a | unverifiable |
| `.tbm` | 3.6 | 0 | n/a | n/a | n/a | unverifiable |
| `.spc` | 8.1 | 0 | n/a | n/a | n/a | unverifiable |
| `.ste` | 8.2 | 0 | n/a | n/a | n/a | unverifiable |
| `.iso` | 3.1, 3.3 | 0 | n/a | n/a | n/a | unverifiable |
| `.sav` | 11 | 0 | n/a | n/a | n/a | unverifiable |
| `.tpk` | 13 | 0 | n/a | n/a | n/a | unverifiable |

(Source: `/tmp/disc/specparse-all.out`, first table. Present extensions with a binary toolkit format: tst, anm, bkg, brd, tem, itm, ene. Absent from both games: gam, gph, tan, tbm, spc, ste, iso, sav, tpk, plus dev and rnc. The set matches the inventory.)

### Reconciliation with the colleague's inventory (independently re-derived)

Script: `compare_inventory.py` and `compare_inventory2.py` (outputs `specparse-compare*.out`, `specparse-recount.out`).

| Number | Mine | Inventory | Match |
|---|---|---|---|
| demo files / bytes | 75 / 3158111 | 75 / 3158111 | yes |
| Basic files / bytes | 58 / 3149861 | 58 / 3149861 | yes |
| game files total; including `.fetched.json` | 133; 134 | 133; 134 | yes |
| per-extension count and bytes, both games (e.g. demo anm 17 / 6263, brd 2 / 2920, tst 2 / 697356) | full tables | full tables | yes (both games) |
| (magic, major, minor) -> count, both games (9 distinct tuples, 35 files) | e.g. BOARD 2.4, CHAR 2.8, ITEM 2.7, ENEMY 2.1, ANIM 2.3, BKG 2.3 | same | yes (both games) |
| top-level folder counts | same | same | yes (both games) |
| absent extensions (dev, gam, gph, iso, rnc, sav, spc, ste, tan, tbm, tpk) | 11 | 11 | yes |
| paths with spaces | 66 | 66 | yes |
| "upper-case names" | 66 if counted on file names; 133 if counted on whole paths | 66 | yes once the definition is "file names" (my first count used whole paths and gave 133, which was my error) |

All matched. One detail the inventory does not stress: every one of the 35 headers has major = 2. The spec (section 1.4) says 3.x files have major 3 "sometimes 2".

## What was tested and found, per format

### .tst tileset (spec 3.1) - 4 files, 4 OK, 0 trailing
- Every file: version 20, detail 1; tile counts 87 (`char`) and 140 (`default`). File size equals `6 + count * 3072` exactly, so `tileCount` is a true count, not an upper bound (the spec says "number of tiles"; that is right but worth saying explicitly given section 1.2).
- The two `char.tst` files and the two `default.tst` files are byte-identical across the games, so there are only 2 distinct tilesets.
- Empirical confirmation of three claims, from observed pixels (not from legacy source): (a) the 24-bit transparent key is the byte triple 0,1,2: 49190 of 89088 pixels in `char.tst` and 10136 of 143360 in `default.tst` carry it; the reversed triple 2,1,0 occurs 0 and 1 times. (b) Byte order is R, G, B. (c) Pixel order is column-major: rendering `char.tst` column-major gives upright characters, row-major gives characters lying on their side. Images: `/tmp/disc/specparse-char-colmajor.png` (correct) and `/tmp/disc/specparse-char-rowmajor.png` (wrong).
- Spec silent or unverifiable: palette table for details 3 and 5 (spec says "ship the VGA default palette" but gives no values); 16x16 doubling method; version 30 header branch; what a tile index above `tileCount` means (all 48 board references and all 64 animation references are in range).

### .anm animation (spec 7.1) - 26 files, 26 OK, 0 trailing
- All: major 2, minor 3, width 32, height 32, frames upper bound 50 (so 51 slots) in every file. Only 2 to 4 slots are non-empty (histogram: 2 frames in 18 files, 3 in 4 files, 4 in 4 files); empty slots are always at the end.
- Every non-empty frame image (64 of 64) is a tile reference of the form `<set>.tst<N>`; N lies in 1..tileCount in all 64. None is a plain picture or a `.tbm`.
- Frame transparent colour: 64 of 64 non-empty frames store 0x00FFFFFF (white). 8 frames carry a sound file name; empty sound otherwise.
- `delay` values: 0.15 (12 files), 0.25 (4 files), 0.0 (10 files).
- 9 of the 26 files (the Basic `start` set) are byte-identical to demo files; 17 distinct.
- Ambiguities: see A-ANM-1, A-ANM-2, A-ANM-3.

### .bkg battle background (spec 8.3) - 1 file, 1 OK, 0 trailing
- Magic is followed by `i16 major, i16 minor` (2.3) and then six strings, consuming all 45 bytes. The spec's table for 8.3 lists only the six strings and never mentions the version header (same omission for 8.1 and 8.2). Offset-12 detection byte is 0 as stated.
- Strings: image and music resolve to existing files; the three sound strings are empty.

### .brd board (spec 4.2, minor 4) - 3 files, 3 OK, 0 trailing
- All three: major 2, minor 4, byte 14 = 0 (binary). Sizes: 20x15x2 (Basic start), 20x15x2 (demo out), 20x11x2 (demo start). coordType: 0 (Basic) and 4 (both demo boards; the "pixel absolute" flag alone). No isometric board.
- LUT: upper bounds give 2, 34 and 19 entries; entry 0 is the empty string in all 3; 7 empty LUT entries in total (3 are index 0, 4 more in demo start). Every referenced index is inside the LUT. 48 of the 55 LUT entries are tile references, all in 1..tileCount of their tileset.
- Tile matrix: row-major per layer, run markers as `-count`. Cells 600 / 600 / 440. Runs: 2 / 26 / 29. Runs that cross a row end: 2 / 1 / 11; a run that crosses a layer boundary occurs in 1 file (demo start). So the spec's "runs may wrap rows and layers" is confirmed. No run has length 1.
- Shading: exactly 1 shade layer per file (upper bound 0), cast layer 1. Run records: 1 / 3 / 27; runCount values 1 or >1 only (never 0); runs that cross a row end in all three files (1 / 1 / 8 runs). The cell total lands exactly on the board size, so "records cover consecutive cells in row-major order, wrapping rows" is confirmed. RGB values range 0 to -30.
- Lights: 0 in all files (untested). Images: 0 (untested). Links: 12 of 12 empty (so the N, S, E, W order is untested).
- Vectors: 0 / 6 / 17. Types seen 1, 2, 16; attributes all 0; layer all 1; `closed` is -1 in all 23 (spec says 0/1). Vertices are in pixel ranges inside the board. Exactly 1 of the 23 vectors has a non-empty handle (type 16, 9 characters).
- Programs: 0 / 1 / 1. `graphic`, variable and handle strings are all empty; `closed` -1 again. activationType 1 and 0; repeatDistance 0 and 32.
- Sprites: 0 / 1 / 1; `reserved` is -1 in both (as the spec says). x, y are inside the board. Programs referenced from sprites: 2 of 2 activation programs resolve to files in `Prg/`; of 2 multitask strings, 1 resolves to a file and 1 is an inline line of code.
- Inline code: both board programs are not files (they contain parentheses, quotes and semicolons) and one sprite multitask string is also not a file. That is 3 inline-code strings, which confirms the section 4.2 "run it as inline RPGCode when no file exists" rule is real, not hypothetical.
- Threads: ub 0 and one empty entry in all 3. Constants: ub 10 (11 entries) in all 3. Layer titles: sizeL+1 = 3 strings in all 3.
- Trailing properties read exactly. bgDrawType is 1 in all three even though bgImage is empty in all three (meaning of draw type with no image is not stated). Start position is positive pixels in all three. Ambient 0,0,0 in all three.
- Not exercised by any sample: lights, images, links, iso coordTypes 1 and 2, more than one shade layer, runCount 0, the effective-grid rule, minor 0-1, minors 2-3 (section 4.8), minors above 4.

### .tem character (spec 6.1) - 2 files (1 distinct, byte-identical), 0 OK literally, 34 trailing bytes
- Header: major 2, minor 8. The literal reading reads the "number of vector bases (2)" field as a count. The file stores the value 1. Then the literal reader reads 1 base and stops with 34 bytes left.
- Evidence for the fix: the 34 leftover bytes parse exactly as `i16 pointsUpperBound (3)` plus 4 points of `i32 x, i32 y` (2 + 4 x 8 = 34 bytes). So the field is an upper bound: stored 1 = 2 bases. With that, the file is consumed to the last byte (2 of 2 files). Both bases are rectangles of 4 points (x about -15..15, y -15..0 for the collision base; x -24..24, y -24..8 for the activation base), which matches "sprite-local pixels relative to the bottom-centre".
- Everything else in the literal reading held: 201 special-move slots (all empty in the sample; the count 201 is fixed and the file only parses with it), 9 variable-name strings (all 9 end in `!` or `$`), 8 initial stats read as i32, 7 body-slot flags, i32 first-level exp (minor 8), custom stances ub is i32 (6 pairs, all empty), 4 movement animations non-empty in slots S, N, E, W and empty in NW, NE, SW, SE, 5 battle stances all non-empty, idle animations all empty, idleTime 3.0 then speed 0.05 (the spec order for `.tem`; confirmed because 3.0 as a speed would be absurd).
- Stats are identifiable only through their value pairs: the 8 initial values are 10, 100, 100, 10, 40, 40, 40, 1. The pair structure matches the spec order (HP = maxHP at positions 2-3, SMP = maxSMP at positions 6-7, level last) but experience, DP and FP positions cannot be told apart from this one sample.
- maxLevel is 0 in the sample; the spec does not say what 0 means.

### .itm item (spec 6.2) - 2 files, 0 OK literally, 34 trailing bytes each
- Header: major 2, minor 7. Same vector-bases error as `.tem`; the identical 34-byte tail parses as upper bound 1 and 2 bases (4 points each), and the file is then consumed exactly (2 of 2).
- Held literally: 5 i8 flags, 51 allowed-handle slots (fixed; all empty), minor >= 3 i32 prices and stat fields (all 0), 8 equip-slot flags, speed first then idleTime for items (0.1 and 0.3, then 3.0), custom stances ub i32 (6 empty pairs). The placement of the custom-stance block after the idle/speed block (not before it) is what the data shows and what the spec's table order implies.
- Movement animations non-empty only in S, N, E, W (4 of 8). Idle animations all empty. Size type 1.

### .ene enemy (spec 6.3) - 1 file, 0 OK literally, 2 trailing bytes
- Header: major 2, minor 1 (the spec gives no minor information for enemies at all).
- Stance list: ub is 5 (6 strings), not the 5 entries 0-4 the spec names. Slots 0-3 are non-empty, slots 4 and 5 are empty. The spec does not say what slot 5 is.
- Custom-stance bound: the literal reading (`i16` bound) reads 6 handle/animation pairs and leaves 2 zero bytes. Reading the bound as `i32` (like `.tem` and `.itm`) consumes the file exactly. This is the only sample, so the evidence is one file; but the alternative readings (7 empty pairs against a bound of 5, or an undocumented trailing `i16 = 0`) are each less plausible and the i32 reading matches the other two sprite formats.
- Held literally: 100 as the bound of special-move, weakness and strength lists (101 slots each, all empty, which matches the text-form note about 101 pairs), HP/SMP/FP/DP stats, run flag 1, crit chances 4 and 10, AI 0 / 0, rewards, defeat program resolves to a file.

## Cross-references: what points at what

Spec statement (section 1.5, 1.6) and what the samples show. Reference resolution used the case-insensitive rule and the per-type folder; I also tested exact-case matches.

| From | Field | Points at | Corpus |
|---|---|---|---|
| `.anm` frame | `image` | tile ref (`set.tstN`) in `Tiles/`, or a picture in `Bitmap/`, or `.tbm` | 64 refs, all tile refs, all resolve; 1262 empty slots |
| `.anm` frame | `sound` | audio in `Media/` | 8 resolve; 1318 empty |
| `.brd` | LUT entries | tile refs | 48 resolve, 7 empty |
| `.brd` | sprite `itemFile` | `.itm` in `Item/` | 2 of 2 resolve (bare file name) |
| `.brd` | sprite and trigger programs | `.prg` in `Prg/`, or inline code | 3 resolve to files, 3 are inline code |
| `.brd` | `backgroundMusic`, `battleBackground` | `Media/` file; `.bkg` in `Bkrounds/` | 2 and 1 resolve; 1 and 2 empty |
| `.brd` | links, bgImage, enterPrg, threads | various | all empty in the 3 files |
| `.tem` | movement and stance animations | `.anm` in `Misc/` | 18 of 18 resolve; every one contains a backslash (a subfolder) |
| `.itm` | movement animations | `.anm` in `Misc/` | 8 of 8 resolve; all backslash subfolder |
| `.ene` | stance animations | `.anm` in `Misc/` | 4 of 4 resolve; all backslash subfolder; its defeat program resolves to a file |
| `.bkg` | image, music | `Bitmap/`, `Media/` | both resolve |
| `.tst` | none | - | no outbound references |

Path style counts over all string fields I could classify: backslash 30 (tem 18, itm 8, ene 4), forward slash 0, drive letter 0, leading type-folder prefix (e.g. `Item\x.itm`) 0, absolute path 0. Mixed-case names 4 (bkg 1, brd 3), names containing a space 6 (bkg 1, brd 5). All 161 file-resolving references match the on-disk spelling exactly (exact-case 161, case-insensitive-only 0). The "case-insensitive lookup" rule in section 1.5 is therefore never exercised by the samples. Non-ASCII strings: 0 of 4701 decoded strings.

Dependency / load order the spec implies, bottom up: tilesets (`.tst`, `.iso`, `.gph`, `.tan`) and `.tbm`; then animations (`.anm`, which reference tiles and sounds); then actors (`.tem`, `.itm`, `.ene`, which reference animations, programs and special moves `.spc`); then `.bkg`; then boards (reference tiles, items, programs, `.bkg`, other boards and music); then the main file `.gam` (references the first board, the first character, the start program and the enemy list). References are by name and can be resolved lazily; the only load-order constraint a reader needs is that a board's tile references resolve against loaded tilesets. The corpus cannot test the top of the chain: there is no `.gam`, and the fixture folders are the project folder itself, not `Main/` plus `Game/<project>/`.

## Full ambiguity list

Each item: ID, format and section, what is unclear or wrong, proposed question or fix, and whether the corpus can settle it. "Settled" means this experiment already decided it.

### Settled by the corpus (the spec is wrong or incomplete; fix the doc)

| ID | Format / section | Issue | Proposed fix | Corpus |
|---|---|---|---|---|
| A-TEM-1 | `.tem` 6.1, `.itm` 6.2 | Row "number of vector bases (2)" is read as a count; the file stores 1 | State that the field is an upper bound (stored 1 = 2 bases), consistent with section 1.2 | Settled: 3 distinct files (1 tem, 2 itm), tail is exactly `2 + 4 x 8` bytes |
| A-ENE-1 | `.ene` 6.3 | Custom-stance bound is described as `i16 + pairs`; the data fits `i32` (as in `.tem` and `.itm`) | Say `i32` | Settled for the single sample; moderate confidence (1 distinct file) |
| A-ENE-2 | `.ene` 6.3 | Stance list: the data has a bound of 5 (6 slots); the spec names slots 0-4 only | Say "bound 5: six slots, 0-4 as listed, slot 5 reserved/unknown" | Settled for the layout; the meaning of slot 5 is not (empty in the sample) |
| A-BRD-1 | `.brd` 4.2 | `closed` is documented as 0/1 for vectors and programs; all 23 vectors and both programs store -1 | Say "non-zero = closed; writers store -1" (section 1.1 already allows -1, but 4.2 contradicts it) | Settled (23 + 2 values) |
| A-VER-1 | 1.4 | "major is 3 (sometimes 2)": all 35 sample headers with a magic carry major 2 | Say major is not a layout selector, and list the observed (magic, major, minor) of the 3.1.0 sample set: ANIM 2.3, BKG 2.3, BOARD 2.4, CHAR 2.8, ENEMY 2.1, ITEM 2.7 | Settled |
| A-BKG-1 | `.bkg` 8.3 (also `.spc` 8.1, `.ste` 8.2) | The binary field lists omit `str magic, i16 major, i16 minor` that every other format lists; the `.bkg` data has them | Add the header row to 8.1-8.3 (verified for `.bkg` only; `.spc`/`.ste` by analogy) | `.bkg` settled; `.spc`/`.ste` not (no sample) |
| A-TST-1 | `.tst` 3.1 | `tileCount` is a true count (file size proves it); the section 1.2 reader will reflexively treat counts as bounds | Mark it "(true count)" | Settled |
| A-TST-2 | `.tst` 3.1 | Column-major, RGB byte order and the 0,1,2 transparent key are claimed but unproven in the doc | Keep as stated; note that the sample renders upright this way | Settled (rendered check) |
| A-LAY-1 | 1.5 | Layout `<root>/Main/<game>.gam` + `<root>/Game/<project>/...` does not match the samples (project folder directly under the game name; folders seen: Bitmap, Bkrounds, Boards, Chrs, Enemy, Item, Media, Misc, Plugin, Prg, Tiles; no Main, Game, Font, SpcMove, StatusE, Saved, and no `.gam`) | Document both: the packaged layout and the "bare project folder" layout the samples use; say that a game without a `.gam` has no declared entry point | Settled that the samples use the second layout; entry point question open |

### Open, and the corpus can settle some of it

| ID | Format / section | Issue | Proposed question or fix | Corpus can settle? |
|---|---|---|---|---|
| A-ANM-1 | `.anm` 7.1 | `delay` = 0.0 in 10 of 26 files (the ones whose names end in defend, die, fight, item or rest, 2 of each; the four direction files per set have 0.15 or 0.25, see `specparse-anm-delays.out`). The spec only says "seconds per frame" | Ask: does 0 mean "play once", "no animation", "use a default"? | No (needs engine behaviour; a human or the engine doc) |
| A-ANM-2 | `.anm` 7.1 | "Each frame has its own transparent colour" but all 64 frames are tile refs and all store white (0x00FFFFFF), while a tile's own key is 0,1,2 | Ask: for a tile-ref frame, which transparency applies? | Partly: samples show only white, so no evidence either way |
| A-ANM-3 | `.anm` 7.1 | "Frames with an empty image are skipped": in all 26 files the empty slots are trailing (51 slots, 2-4 used) | Add "in practice trailing"; keep "skip" semantics | Settled for the sample (still keep skip, not stop) |
| A-ANM-4 | `.anm` 7.1 | `sound` path base is not stated (all 8 resolve under `Media/`) | Say "relative to `Media/`" | Mostly settled (8 of 8) |
| A-TEM-2 | `.tem` 6.1 | Order of the 8 initial stats: only the pair structure (HP, maxHP, ..., SMP, maxSMP, level last) is consistent; exp, DP and FP cannot be distinguished (values 10, 100, 100, 10, 40, 40, 40, 1) | Confirm the order or find a second sample | No (needs a second distinct character or the engine doc) |
| A-TEM-3 | `.tem` 6.1 | `maxLevel` is 0 in the sample; meaning of 0 (unlimited?) not stated | Ask | No |
| A-TEM-4 | `.tem` 6.1 | "i8 x 7 body slots: head, neck, left hand, right hand, body, legs, ..." names only 6 of 7 | Name the seventh | No (sample [0,1,1,1,1,1,1] cannot name it) |
| A-TEM-5 | `.tem` 6.1 | `hasSpecialMoves` documented as 0 = yes; sample has 0 with no moves defined | Keep; note it is "flag", not "any moves" | No |
| A-TEM-6 | `.tem` 6.1 | After the five stances there is one "reserved" string; present and empty in the sample | none | Settled (present) |
| A-TEM-7 | `.tem` 6.1 | Version branches never exercised: minor 3 (`i8` first-level exp), minor < 5 (4 obsolete sound strings, no animations), minor 5, 6, 7 (increasing animation blocks) | Needs synthesized or external samples | No (only minor 8 exists) |
| A-ITM-1 | `.itm` 6.2 | Branches never exercised: minor < 3 (i16 prices and stats), minor 3, minor 4, 5, 6, and the legacy 2-tile-tall block for minor < 4. The legacy row "str x 16 x 2, str x 2" is ambiguous (32 strings then 2? 16 pairs?) and its position in the file is not stated | Spell out: 32 frame strings + 2 rest strings, and where it sits | No (only minor 7 exists) |
| A-ITM-2 | `.itm` 6.2 | "usedBy (0 = all, 1 = listed)" and the 51-string allowed list: all empty in samples | none | No (unexercised) |
| A-ENE-3 | `.ene` 6.3 | No minor-version information at all; only minor 1 present; text form unexercised | Ask: which minors exist and how do they differ? | No |
| A-BRD-2 | `.brd` 4.2 | The "isometric-rotated" test: the doc says coordType values 0, 1, 2 and flag 4 combine; a reader must choose `coordType & 2` or `coordType & 3 == 2`. Corpus has only 0 and 4 | State the exact test and what stacked iso (1) does to the effective grid | No |
| A-BRD-3 | `.brd` 4.2 | Shade layer grid dimensions (cells per layer) are not stated; I assumed the effective grid (W x H). For non-iso boards sizeX x sizeY equals it, so the samples agree | State it, including iso rotated | No for iso; settled for 2D |
| A-BRD-4 | `.brd` 4.2 | `runCount` 0 ("covers one cell") never occurs in the samples; only 1 and larger values | none (spec already says it) | No |
| A-BRD-5 | `.brd` 4.2 | Lights: node and colour counts per light type; no sample | Fully tabulated; test needs synthesized input | No |
| A-BRD-6 | `.brd` 4.2 | Images: all fields tabulated; `drawType` meanings (0, 1, 2); `reserved` is "written as 100"; no sample | Synthesize | No |
| A-BRD-7 | `.brd` 4.2 | Links order N, S, E, W: all 12 link strings in the samples are empty | none | No |
| A-BRD-8 | `.brd` 4.2 | `backgroundDrawType` is 1 in all 3 files although `backgroundImage` is empty; meaning (parallax with no image) | Say "ignored when no image" if correct | No |
| A-BRD-9 | `.brd` 4.2 | Program and sprite string fields can hold inline code; the spec says "if no such file exists". For sprites it is the multitask field that held inline code | Say which sprite program fields allow inline code | Partly (1 multitask case) |
| A-BRD-10 | `.brd` 4.8 | Pre-vector layout is terse: "i16, str reserved", "i16 x 11 constants", "i32, str... threads", the conversion rules are prose; start units (tiles) etc. A reader cannot be checked | Needs samples or a worked byte example | No |
| A-BRD-11 | `.brd` 4.1 | Minors 0-1 have no layout (refuse), minors above 4 unspecified | State "refuse" or "treat like 4" for minor > 4 | No |
| A-TST-3 | `.tst` 3.1 | Palette values for detail 3, 5 (and 4, 6) are not in the spec; 16x16 doubling is "pixel doubling" only | Add a palette table or point to an exact public source | No (no 8-bit set in the samples) |
| A-GEN-1 | 1.1 | `str` is "assume Windows-1252": all 4701 decoded strings are ASCII, so high-range bytes are untested | none | No |

## Unverifiable formats: how risky is a synthesized test input?

| Format | How fully the spec tabulates it | Branches the corpus never hits | Risk of a synthesized input |
|---|---|---|---|
| `.gam` (2) | Complete table of 43 rows, but 12 of the lines carry a minor condition (the script counted 12 lines containing a minor test) | Everything. Minor 0-9: rows keyed on minor < 3, >= 3, <= 2, >= 4, = 5, >= 6, >= 7, >= 8, >= 9 (plus the `gameSpeed` +128 rule at minor >= 8). Also three adjacent "reserved" rows for minor <= 2 whose exact order is hard to read | HIGH. A synthesized file proves only that our writer and reader agree. Ambiguous row order for minors <= 2; the `extKeys` limit "up to 50" vs its upper bound; the plugin list width flips at minor 3 |
| `.tbm` (3.6) | Complete and branch-free; padding row and column explicit | None | LOW. Risk is the "inclusive x and y with x outer" order and `major (3)`, because other formats use major 2 |
| `.tan` (3.5) | Complete, branch-free, frameCount is a true count | None | LOW. Main risk: major/minor values unknown (3 vs 2) |
| `.gph` (3.2) | Prose, text format v1 and v2; both described, no byte layout | Both versions unexercised | MEDIUM. Text details (line endings, decimal parsing, `-1` transparent) are stated, but there is nothing to compare against |
| `.iso` (3.1, 3.3) | Header shares `.tst` (version 30, detail 150); the diamond mask is fully specified. I checked the mask formulas: 1024 inside pixels, 256 per quadrant, symmetric left-right and top-bottom (`iso_mask.py`) | Version 30, detail 150, the unpacking walk | MEDIUM. Mask arithmetic is internally consistent, but column-major unpacking over the diamond and detail 150 are not testable against real data |
| `.spc` (8.1) | One-line binary field list, no header row, no version, text form "same fields" | All; detection "offset 16" with no byte rule | MEDIUM-HIGH. The header row is missing (A-BKG-1), so the first field offset is a guess |
| `.ste` (8.2) | One-line binary field list, no header row | All | MEDIUM-HIGH, same reason; also "negative per-round amounts heal" is the only semantic hint |
| `.sav` (11) | NOT tabulated at byte level: a ten-item prose list with counts but no widths for many fields ("Misc: selected player, gold, message-window colour ...") and an engine-specific thread state | Everything | VERY HIGH. Not safe to synthesize; needs a real save or a byte-level spec |
| `.tpk` (13) | Standard ZIP plus `main.gam`; the standalone trailer `CMP1, i32 offset, i32 length` is precise | Everything (the inventory found 0 `CMP1` markers and 0 ZIPs) | LOW for the ZIP part (use any ZIP); LOW-MEDIUM for the trailer |

Branches within the formats that DO exist in the corpus but are untested: `.brd` minors 0, 1, 2, 3 and everything above 4; `.tem` minors 3-7 (the script counted 9 lines with a minor condition in 6.1); `.itm` minors below 7 (8 conditional lines in 6.2); `.tst` details 2-6 and 150 and version 30; `.ene` minors other than 1 and the text form; `.anm` text form and animated GIF; `.bkg` text form.

## Doc-fix proposals (for later, human-approved commits; docs untouched)

1. Section 6.1 and 6.2, vector bases row: "i16 vector-bases upper bound (stored 1, meaning 2 bases)", then that many bases. Evidence: `.tem` (1 distinct file) and `.itm` (2 files), minor 8 and 7.
2. Section 6.3: custom-stance bound `i32`; stance list bound 5 gives 6 slots (0-4 named, 5 reserved). Evidence: 1 file, medium confidence; add a "needs a second sample" note.
3. Section 4.2: change "`i16 closed` (0/1)" to "non-zero = closed (stored as -1)" for both vectors and programs.
4. Section 1.4: replace "major is 3 (sometimes 2)" with "major does not change the layout; the 3.1.0 sample files carry major 2" and add the observed (magic, minor) table.
5. Sections 8.1-8.3: add the header row (`str magic, i16 major, i16 minor`) to the binary field lists (verified for `.bkg`: 2.3).
6. Section 3.1: say `tileCount` is a true count; add the palette values or an exact source for detail 3/5; record the column-major / RGB / 0,1,2-key confirmation.
7. Section 7.1: record that `delay` 0.0 appears for one-shot stances and say what it means; say which transparency (frame colour or tile key) applies to a tile-ref frame; add "sound is relative to `Media/`".
8. Section 1.5: add the bare-project-folder layout and the fact that the samples have no `.gam`.
9. Section 6.1: name the seventh body slot; say what `maxLevel` 0 means; confirm the initial-stat order.
10. Section 4.2 / 5: say exactly how an isometric-rotated board is detected from `coordType`, and what grid dimensions the shade layers use for iso boards.
11. Section 6.2: say the legacy "two-tile-tall" block has 32 frame strings plus 2 rest strings and where it sits.
12. Section 11: either mark `.sav` as "load only partly specified" or add field widths.

## Commands used

All scripts are in `/tmp/disc/scripts/specparse/`; each was run as `python3 SCRIPT > /tmp/disc/OUT 2>&1; echo "exit=$?" >> /tmp/disc/OUT` and every output ends in `exit=0`. No repo file was written, no git command was run, and the legacy source tree was never touched.

| Script | Output file | Purpose |
|---|---|---|
| `recount.py` | `specparse-recount.out` | Re-derive file counts, bytes, (magic, major, minor) tuples, absent extensions |
| `compare_inventory.py`, `compare_inventory2.py` | `specparse-compare.out`, `specparse-compare2.out` | Compare my numbers with `corpus-inventory.json` |
| `rd.py`, `p_simple.py`, `p_brd.py`, `p_sprites.py` | (libraries) | The parsers, written from the spec only |
| `run_simple.py`, `stats_simple.py` | `specparse-simple.out`, `specparse-simple-stats.out` | `.anm`, `.bkg`, `.tst` parsing; frame and pixel statistics |
| `tst_order.py`, `tst_sheet.py` | `specparse-tst-order.out`, `specparse-tstsheet.out` and the two PNGs | Empirical check of column-major and RGB order |
| `run_brd.py`, `brd_deep.py`, `brd_shade.py`, `brd_ranges.py` | `specparse-brd*.out` | `.brd` parsing, run geometry, ranges |
| `run_sprites.py`, `probe_tail.py`, `probe_ene.py`, `ene_i32.py`, `run_sprites2.py` | `specparse-sprites*.out`, `specparse-tail.out`, `specparse-ene-trace.out`, `specparse-ene-i32.out` | `.tem`, `.itm`, `.ene` parsing and the trailing-byte investigation |
| `xref.py`, `xref2.py`, `xref_debug.py` | `specparse-xref*.out` | Cross-references and path styles. A first run had a lower-casing bug in my script (everything unresolved); fixed before the numbers above were taken |
| `run_all.py` | `specparse-all.out` | Consolidated table, string statistics, cross-game duplicates |
| `anm_delays.py` | `specparse-anm-delays.out` | Delay value counts per file |
| `iso_mask.py`, `spec_stats.py` | `specparse-iso-mask.out`, `specparse-spec-stats.out` | Diamond-mask check; spec branch counting |

These scripts were throwaway and live only in the author's temporary folder; they are not kept in the repository.

## What I could not determine

- Whether the spec is right for any format version other than the newest: the corpus has one version of each format. Every conditional branch other than the ones listed as exercised is unverifiable from these samples.
- The meaning of values the spec leaves open and the data cannot settle: `delay` 0.0, `maxLevel` 0, the seventh body slot, which stat is which at positions 1, 4 and 5 of the initial-stat list, the reserved sixth enemy stance, and which transparency applies to a tile-ref animation frame.
- Whether `.ene`'s custom-stance bound is really `i32`: the corpus has one enemy file, and its custom-stance block is empty, so the i32 reading fits the bytes but could not be tested on a non-empty list.
- Palette for 8-bit tilesets, the 16x16 upscale, isometric unpacking, `.iso`, `.gph`, `.tan`, `.tbm`: no samples, so no check was possible beyond the diamond-mask arithmetic.
- The main-file entry path: there is no `.gam`, so I could not check the load order from the top, or check how the project folder is named in a real main file.
- Whether any board's `battleBackground` and `bgDrawType` semantics are as described: only presence and sizes were checked, never runtime behaviour.
- I did not look at the `.prg` files beyond whether a board string names an existing one, nor at the two `.txt` files or the 31 MIDI/4 WAV media files.
- My "distinct file" counts come from md5 equality of files with the same relative path across the two games, not a global content comparison.
