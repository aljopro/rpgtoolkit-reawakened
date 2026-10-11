# What the two sample games contain

Point-in-time finding of 2026-10-11, taken against the two sample games at the pinned revision 9191b9191c9bda0998c6faae16929b3331ed2ead. Produced by throwaway scripts. No sample-file content is quoted, and `docs/` was not changed: every doc fix named here is a proposal for a later, human-approved commit.

## Summary for the human
- Two legacy sample games are present under fixtures/legacy: `demo` and `Basic`.
- Total game files: 133 (demo 75, Basic 58); matches .fetched.json.
- Files under fixtures/legacy including the root metadata file: 134. The extra file is `.fetched.json`.
- Pinned upstream rev: 9191b9191c9bda0998c6faae16929b3331ed2ead.
- Binary toolkit files carry an ASCII magic (RPGTLKIT ... or TK3 ...); all magics found match the spec-declared magic.
- Spec header rules (format-spec 3-8) were checked on the real bytes; see the header-check table below.
- Raster, audio and container formats are sniffed by signature; see the tables below.
- No file content is quoted here. Only names, sizes, counts and header facts are reported.
- The per-file facts came from throwaway scripts and are not kept in the repository.
- No file in either game contains a ZIP signature, and the two plugin DLLs per game have no data appended, so the samples contain no packaged form at all (no `.tpk`, no appended-ZIP EXE).
- Images: two baseline JPEGs (640x480 and 600x100, 4:2:0, 8-bit, no restart markers) and one palette PNG (640x480, Adam7), identical in both games. No BMP, GIF, ICO, TGA or progressive JPEG.
- Audio: 4 PCM WAV files (8-bit mono, 8 kHz) and 31 MIDI files per game, identical in both games.
- `Basic` is almost a subset of `demo`: of 57 shared paths 55 are byte-identical; there are 78 distinct files in total.
- Our fixture fetch copies only `build/game/<game>`, so a main game file (`.gam`) or a `Main/` folder would never be fetched even if upstream has one.
- The two `.txt` files per game are named as licence terms (EULAs) for bundled third-party music and tile packs, one more reason the samples stay fetched and never committed.

## File count reconciliation

| item | value |
|---|---|
| files under fixtures/legacy (rglob, all) | 134 |
| root-level files | `.fetched.json` |
| game files walked | 133 |
| demo: walked / .fetched.json | 75 / 75 |
| Basic: walked / .fetched.json | 58 / 58 |
| matches .fetched.json | True |

## Game: demo

files 75, bytes 3158111

### Extensions

| ext | count | bytes |
|---|---|---|
| mid | 31 | 1950489 |
| anm | 17 | 6263 |
| prg | 7 | 9039 |
| wav | 4 | 26900 |
| brd | 2 | 2920 |
| dll | 2 | 204800 |
| itm | 2 | 645 |
| jpg | 2 | 81443 |
| tst | 2 | 697356 |
| txt | 2 | 3374 |
| bkg | 1 | 45 |
| ene | 1 | 456 |
| png | 1 | 171649 |
| tem | 1 | 2732 |

### Sniffed signatures

| sniff | count |
|---|---|
| unknown | 35 |
| midi-smf | 31 |
| wav-riff | 4 |
| jpeg | 2 |
| mz-exe | 2 |
| png | 1 |

### RPGTLKIT / TK3 headers

| magic | form | major | minor | count |
|---|---|---|---|---|
| RPGTLKIT ANIM | binary | 2 | 3 | 17 |
| RPGTLKIT BKG | binary | 2 | 3 | 1 |
| RPGTLKIT BOARD | binary | 2 | 4 | 2 |
| RPGTLKIT CHAR | binary | 2 | 8 | 1 |
| RPGTLKIT ENEMY | binary | 2 | 1 | 1 |
| RPGTLKIT ITEM | binary | 2 | 7 | 2 |

### Top-level dirs (first path component)

| dir | count |
|---|---|
| Bitmap | 3 |
| Bkrounds | 1 |
| Boards | 2 |
| Chrs | 1 |
| Enemy | 1 |
| Item | 2 |
| Media | 36 |
| Misc | 17 |
| Plugin | 2 |
| Prg | 7 |
| Tiles | 3 |

## Game: Basic

files 58, bytes 3149861

### Extensions

| ext | count | bytes |
|---|---|---|
| mid | 31 | 1950489 |
| anm | 9 | 3351 |
| wav | 4 | 26900 |
| prg | 3 | 7628 |
| dll | 2 | 204800 |
| jpg | 2 | 81443 |
| tst | 2 | 697356 |
| txt | 2 | 3374 |
| brd | 1 | 139 |
| png | 1 | 171649 |
| tem | 1 | 2732 |

### Sniffed signatures

| sniff | count |
|---|---|
| midi-smf | 31 |
| unknown | 18 |
| wav-riff | 4 |
| jpeg | 2 |
| mz-exe | 2 |
| png | 1 |

### RPGTLKIT / TK3 headers

| magic | form | major | minor | count |
|---|---|---|---|---|
| RPGTLKIT ANIM | binary | 2 | 3 | 9 |
| RPGTLKIT BOARD | binary | 2 | 4 | 1 |
| RPGTLKIT CHAR | binary | 2 | 8 | 1 |

### Top-level dirs (first path component)

| dir | count |
|---|---|
| Bitmap | 3 |
| Boards | 1 |
| Chrs | 1 |
| Media | 36 |
| Misc | 9 |
| Plugin | 2 |
| Prg | 3 |
| Tiles | 3 |

## Spec header checks (format-spec sections 3-8)

| game | path | rule | ok | observed |
|---|---|---|---|---|
| demo | Bkrounds/bkg.bkg | §8.3 .bkg detection at offset 12 (binary) | True | {'major': 2, 'minor': 3, 'detect_offset': 12} |
| demo | Boards/out.brd | §4.1 .brd minor dispatch | True | {'major': 2, 'minor': 4} branch=vector >=4 |
| demo | Boards/start.brd | §4.1 .brd minor dispatch | True | {'major': 2, 'minor': 4} branch=vector >=4 |
| demo | Chrs/start.tem | §6.1 .tem detection byte 13 == 0 (binary) | True | {'major': 2, 'minor': 8, 'detect_offset': 13} |
| demo | Enemy/pirate.ene | §6.3 .ene detection byte at offset 14 (binary) | True | {'major': 2, 'minor': 1, 'detect_offset': 14} |
| demo | Item/man.itm | §6.2 .itm byte 13 must be 0 | True | {'major': 2, 'minor': 7, 'detect_offset': 13} |
| demo | Item/oldman.itm | §6.2 .itm byte 13 must be 0 | True | {'major': 2, 'minor': 7, 'detect_offset': 13} |
| demo | Misc/man/man_e.anm | §7.1 .anm binary minor must be 3 | True | {'major': 2, 'minor': 3} |
| demo | Misc/man/man_n.anm | §7.1 .anm binary minor must be 3 | True | {'major': 2, 'minor': 3} |
| demo | Misc/man/man_s.anm | §7.1 .anm binary minor must be 3 | True | {'major': 2, 'minor': 3} |
| demo | Misc/man/man_w.anm | §7.1 .anm binary minor must be 3 | True | {'major': 2, 'minor': 3} |
| demo | Misc/oldman/oldman_e.anm | §7.1 .anm binary minor must be 3 | True | {'major': 2, 'minor': 3} |
| demo | Misc/oldman/oldman_n.anm | §7.1 .anm binary minor must be 3 | True | {'major': 2, 'minor': 3} |
| demo | Misc/oldman/oldman_s.anm | §7.1 .anm binary minor must be 3 | True | {'major': 2, 'minor': 3} |
| demo | Misc/oldman/oldman_w.anm | §7.1 .anm binary minor must be 3 | True | {'major': 2, 'minor': 3} |
| demo | Misc/start/start_defend.anm | §7.1 .anm binary minor must be 3 | True | {'major': 2, 'minor': 3} |
| demo | Misc/start/start_die.anm | §7.1 .anm binary minor must be 3 | True | {'major': 2, 'minor': 3} |
| demo | Misc/start/start_e.anm | §7.1 .anm binary minor must be 3 | True | {'major': 2, 'minor': 3} |
| demo | Misc/start/start_fight.anm | §7.1 .anm binary minor must be 3 | True | {'major': 2, 'minor': 3} |
| demo | Misc/start/start_item.anm | §7.1 .anm binary minor must be 3 | True | {'major': 2, 'minor': 3} |
| demo | Misc/start/start_n.anm | §7.1 .anm binary minor must be 3 | True | {'major': 2, 'minor': 3} |
| demo | Misc/start/start_rest.anm | §7.1 .anm binary minor must be 3 | True | {'major': 2, 'minor': 3} |
| demo | Misc/start/start_s.anm | §7.1 .anm binary minor must be 3 | True | {'major': 2, 'minor': 3} |
| demo | Misc/start/start_w.anm | §7.1 .anm binary minor must be 3 | True | {'major': 2, 'minor': 3} |
| demo | Tiles/char.tst | §3.1 .tst i16 version 20 or 30 | True | {'version': 20, 'tileCount': 87, 'detail': 1} |
| demo | Tiles/default.tst | §3.1 .tst i16 version 20 or 30 | True | {'version': 20, 'tileCount': 140, 'detail': 1} |
| Basic | Boards/start.brd | §4.1 .brd minor dispatch | True | {'major': 2, 'minor': 4} branch=vector >=4 |
| Basic | Chrs/start.tem | §6.1 .tem detection byte 13 == 0 (binary) | True | {'major': 2, 'minor': 8, 'detect_offset': 13} |
| Basic | Misc/start/start_defend.anm | §7.1 .anm binary minor must be 3 | True | {'major': 2, 'minor': 3} |
| Basic | Misc/start/start_die.anm | §7.1 .anm binary minor must be 3 | True | {'major': 2, 'minor': 3} |
| Basic | Misc/start/start_e.anm | §7.1 .anm binary minor must be 3 | True | {'major': 2, 'minor': 3} |
| Basic | Misc/start/start_fight.anm | §7.1 .anm binary minor must be 3 | True | {'major': 2, 'minor': 3} |
| Basic | Misc/start/start_item.anm | §7.1 .anm binary minor must be 3 | True | {'major': 2, 'minor': 3} |
| Basic | Misc/start/start_n.anm | §7.1 .anm binary minor must be 3 | True | {'major': 2, 'minor': 3} |
| Basic | Misc/start/start_rest.anm | §7.1 .anm binary minor must be 3 | True | {'major': 2, 'minor': 3} |
| Basic | Misc/start/start_s.anm | §7.1 .anm binary minor must be 3 | True | {'major': 2, 'minor': 3} |
| Basic | Misc/start/start_w.anm | §7.1 .anm binary minor must be 3 | True | {'major': 2, 'minor': 3} |
| Basic | Tiles/char.tst | §3.1 .tst i16 version 20 or 30 | True | {'version': 20, 'tileCount': 87, 'detail': 1} |
| Basic | Tiles/default.tst | §3.1 .tst i16 version 20 or 30 | True | {'version': 20, 'tileCount': 140, 'detail': 1} |

Rules checked: 39; failing: 0. Magic mismatches: 0.

## Absent formats (spec names, zero files found)

- .gam: absent
- .gph: absent
- .tan: absent
- .tbm: absent
- .tpk: absent
- .sav: absent
- .spc: absent
- .ste: absent
- .tst: present
- .iso: absent
- .dev: absent
- .rnc: absent

## Name checks

- upper-case names: 66
- spaces in path: 66
- non-ASCII paths: 0

## Extension A: gaps 1-8 (stage6)
Counts come from `os.walk` over `fixtures/legacy/<game>` (133 game files; root `.fetched.json` excluded by design).
### 1. Size per extension per game (bytes)
| game | ext | files | min | median | max |
|---|---|---|---|---|---|
| demo | anm | 17 | 362 | 364 | 391 |
| demo | bkg | 1 | 45 | 45 | 45 |
| demo | brd | 2 | 1253 | 1460 | 1667 |
| demo | dll | 2 | 98304 | 102400 | 106496 |
| demo | ene | 1 | 456 | 456 | 456 |
| demo | itm | 2 | 309 | 322.5 | 336 |
| demo | jpg | 2 | 1699 | 40721.5 | 79744 |
| demo | mid | 31 | 7250 | 45116 | 225806 |
| demo | png | 1 | 171649 | 171649 | 171649 |
| demo | prg | 7 | 0 | 264 | 4854 |
| demo | tem | 1 | 2732 | 2732 | 2732 |
| demo | tst | 2 | 267270 | 348678 | 430086 |
| demo | txt | 2 | 1440 | 1687 | 1934 |
| demo | wav | 4 | 2556 | 5633 | 13078 |
| Basic | anm | 9 | 362 | 362 | 391 |
| Basic | brd | 1 | 139 | 139 | 139 |
| Basic | dll | 2 | 98304 | 102400 | 106496 |
| Basic | jpg | 2 | 1699 | 40721.5 | 79744 |
| Basic | mid | 31 | 7250 | 45116 | 225806 |
| Basic | png | 1 | 171649 | 171649 | 171649 |
| Basic | prg | 3 | 443 | 2331 | 4854 |
| Basic | tem | 1 | 2732 | 2732 | 2732 |
| Basic | tst | 2 | 267270 | 348678 | 430086 |
| Basic | txt | 2 | 1440 | 1687 | 1934 |
| Basic | wav | 4 | 2556 | 5633 | 13078 |
### 2a. JPEG structure
| game | file | SOF type | precision | WxH | components | sampling | DRI present | DRI value | SOS | APP segments (names) | COM | SOI | EOI |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| demo | Bitmap/bkg.jpg | baseline (SOF0) | 8 | 640x480 | 3 | 4:2:0 | no | - | 1 | APP0 JFIF | 0 | True | True |
| demo | Bitmap/mwin.jpg | baseline (SOF0) | 8 | 600x100 | 3 | 4:2:0 | no | - | 1 | APP0 JFIF | 0 | True | True |
| Basic | Bitmap/bkg.jpg | baseline (SOF0) | 8 | 640x480 | 3 | 4:2:0 | no | - | 1 | APP0 JFIF | 0 | True | True |
| Basic | Bitmap/mwin.jpg | baseline (SOF0) | 8 | 600x100 | 3 | 4:2:0 | no | - | 1 | APP0 JFIF | 0 | True | True |
### 2b. PNG structure
| game | file | WxH | bit depth | colour type | interlace | ancillary chunk names | all chunk types | trailing bytes after IEND | signature ok |
|---|---|---|---|---|---|---|---|---|---|
| demo | Bitmap/layout.png | 640x480 | 8 | indexed-colour | Adam7 | tIMEx1, pHYsx1 | IHDRx1, tIMEx1, pHYsx1, PLTEx1, IDATx1, IENDx1 | 0 | True |
| Basic | Bitmap/layout.png | 640x480 | 8 | indexed-colour | Adam7 | tIMEx1, pHYsx1 | IHDRx1, tIMEx1, pHYsx1, PLTEx1, IDATx1, IENDx1 | 0 | True |
### 3a. WAV (4 files)
| game | file | format | channels | sample rate | bits | data bytes | RIFF size consistent |
|---|---|---|---|---|---|---|---|
| demo | Media/die.wav | PCM | 1 | 8000 | 8 | 7351 | True |
| demo | Media/fight.wav | PCM | 1 | 8000 | 8 | 2497 | True |
| demo | Media/hit.wav | PCM | 1 | 8000 | 8 | 3797 | True |
| demo | Media/item.wav | PCM | 1 | 8000 | 8 | 12938 | True |
| Basic | Media/die.wav | PCM | 1 | 8000 | 8 | 7351 | True |
| Basic | Media/fight.wav | PCM | 1 | 8000 | 8 | 2497 | True |
| Basic | Media/hit.wav | PCM | 1 | 8000 | 8 | 3797 | True |
| Basic | Media/item.wav | PCM | 1 | 8000 | 8 | 12938 | True |
### 3b. MIDI (SMF), aggregate
| metric | value |
|---|---|
| files per game | demo=31, Basic=31 |
| SMF format counts | 0:40, 1:22 |
| header ntrks range | 1..20 |
| ntrks != actual MTrk count | 0 |
| division kind | ticks per quarter note:62 |
| division values (ticks/qn or SMPTE) | 120:48, 480:14 |
| header length counts | 6:62 |
| non-MTrk chunk types seen | none |
| files with trailing bytes / chunk overrun | 0 / 0 |
| same name in both games | 31 |
| of those, identical SHA-256 | 31 |
### 4. Container signatures (all 133 files) and PE overlays
| ext | files | PK0304 files | PK0304 hits | PK0506 files | PK0506 hits | PK0102 files | PK0102 hits |
|---|---|---|---|---|---|---|---|
| anm | 26 | 0 | 0 | 0 | 0 | 0 | 0 |
| bkg | 1 | 0 | 0 | 0 | 0 | 0 | 0 |
| brd | 3 | 0 | 0 | 0 | 0 | 0 | 0 |
| dll | 4 | 0 | 0 | 0 | 0 | 0 | 0 |
| ene | 1 | 0 | 0 | 0 | 0 | 0 | 0 |
| itm | 2 | 0 | 0 | 0 | 0 | 0 | 0 |
| jpg | 4 | 0 | 0 | 0 | 0 | 0 | 0 |
| mid | 62 | 0 | 0 | 0 | 0 | 0 | 0 |
| png | 2 | 0 | 0 | 0 | 0 | 0 | 0 |
| prg | 10 | 0 | 0 | 0 | 0 | 0 | 0 |
| tem | 2 | 0 | 0 | 0 | 0 | 0 | 0 |
| tst | 4 | 0 | 0 | 0 | 0 | 0 | 0 |
| txt | 4 | 0 | 0 | 0 | 0 | 0 | 0 |
| wav | 8 | 0 | 0 | 0 | 0 | 0 | 0 |
Files with any hit: none
| MZ file | PE | sections | file size | image end | overlay bytes | overlay has PK0304 | overlay has PK0506 | overlay starts PK |
|---|---|---|---|---|---|---|---|---|
| demo/Plugin/tk3fight.dll | True | 4 | 98304 | 98304 | 0 | False | False | False |
| demo/Plugin/tk3menu.dll | True | 5 | 106496 | 106496 | 0 | False | False | False |
| Basic/Plugin/tk3fight.dll | True | 4 | 98304 | 98304 | 0 | False | False | False |
| Basic/Plugin/tk3menu.dll | True | 5 | 106496 | 106496 | 0 | False | False | False |
### 5. Names and tree shape
| game | files | case-collision groups | paths with space | space by top dir | max path length (chars) | depth (components): files |
|---|---|---|---|---|---|---|
| demo | 75 | 0 | 33 | Media:32, Tiles:1 | 53 | 2:58, 3:17 |
| Basic | 58 | 0 | 33 | Media:32, Tiles:1 | 53 | 2:49, 3:9 |
demo folder tree (dirs to depth 3, files beneath):
| dir | files beneath |
|---|---|
| Bitmap/ | 3 |
| Bkrounds/ | 1 |
| Boards/ | 2 |
| Chrs/ | 1 |
| Enemy/ | 1 |
| Item/ | 2 |
| Media/ | 36 |
| Misc/ | 17 |
| Misc/man/ | 4 |
| Misc/oldman/ | 4 |
| Misc/start/ | 9 |
| Plugin/ | 2 |
| Prg/ | 7 |
| Tiles/ | 3 |
Basic folder tree (dirs to depth 3, files beneath):
| dir | files beneath |
|---|---|
| Bitmap/ | 3 |
| Boards/ | 1 |
| Chrs/ | 1 |
| Media/ | 36 |
| Misc/ | 9 |
| Misc/start/ | 9 |
| Plugin/ | 2 |
| Prg/ | 3 |
| Tiles/ | 3 |
### 6. demo vs Basic
| metric | value |
|---|---|
| paths in both games | 57 |
| identical (SHA-256) | 55 |
| different content | 2 |
| only in demo | 18 |
| only in Basic | 1 |
| union of paths | 76 |
| distinct content across corpus (unique files) | 78 |
| per game: files / distinct content | demo: 75 / 75; Basic: 58 / 58 |
Different content (same path): Boards/start.brd, Prg/start.prg
Only in demo: Bkrounds/bkg.bkg, Boards/out.brd, Enemy/pirate.ene, Item/man.itm, Item/oldman.itm, Misc/man/man_e.anm, Misc/man/man_n.anm, Misc/man/man_s.anm, Misc/man/man_w.anm, Misc/oldman/oldman_e.anm, Misc/oldman/oldman_n.anm, Misc/oldman/oldman_s.anm, Misc/oldman/oldman_w.anm, Prg/man.prg, Prg/man_wander.prg, Prg/oldman.prg, Prg/sys_test.prg, Prg/win.prg
Only in Basic: Prg/wander.prg
### 7. .txt files (names and byte-level facts only)
| file | bytes | pure ASCII | printable/whitespace only | lines | CRLF pairs | ends with newline |
|---|---|---|---|---|---|---|
| demo/Media/VIP - RPGToolkit Fo Sho Music Pak  EULA.txt | 1934 | True | True | 30 | 0 | True |
| demo/Tiles/base EULA.txt | 1440 | True | True | 33 | 0 | False |
| Basic/Media/VIP - RPGToolkit Fo Sho Music Pak  EULA.txt | 1934 | True | True | 30 | 0 | True |
| Basic/Tiles/base EULA.txt | 1440 | True | True | 33 | 0 | False |
### 8. Layout versus spec §1.5, and absent main files
| game | top-level dirs (files beneath) | top-level files | dirs not in spec §1.5 list | spec §1.5 dirs absent |
|---|---|---|---|---|
| demo | Bitmap/(3), Bkrounds/(1), Boards/(2), Chrs/(1), Enemy/(1), Item/(2), Media/(36), Misc/(17), Plugin/(2), Prg/(7), Tiles/(3) | - | - | Font, SpcMove, StatusE |
| Basic | Bitmap/(3), Boards/(1), Chrs/(1), Media/(36), Misc/(9), Plugin/(2), Prg/(3), Tiles/(3) | - | - | Bkrounds, Enemy, Font, Item, SpcMove, StatusE |
Fixture root entries: .fetched.json, Basic, demo. `.gam` files anywhere under fixtures/legacy: 0. `Main` directories anywhere: 0.
Fetch behaviour (`tools/fixtures/fetch.mjs`): line 444 sets `base = join(tree, gamesPath)` with `gamesPath` = `build/game`; line 451 renames only `join(base, game)` for each pinned game (`demo`, `Basic`). Siblings of the game folders, including any `build/game/Main`, are not copied. Whether the upstream game folder itself holds a `Main/` subtree is not determinable from the fixtures alone.

## Corrections

- Recount from `os.walk` and `stat`: demo 75 files / 3,158,111 bytes; Basic 58 files / 3,149,861 bytes; total 133 game files. Compared with stage2 values (demo 75 / 3,158,111; Basic 58 / 3,149,861): match.

## Commands used

- /tmp/disc/scripts/stage1_base.py (writes /tmp/disc/base.json)
- /tmp/disc/scripts/stage2_inventory.py

These scripts were throwaway and live only in the author's temporary folder; they are not kept in the repository.

## What I could not determine

- Exact legacy file versions beyond the RPGTLKIT / TK3 headers. Every binary header found was checked against the spec-declared major/minor rule, but the epic question "exact legacy file versions" is only partly answered here.
- Whether any sample asset is actually referenced by a program or board. Only file presence and headers were checked.
- The 'unknown' sniff class for the non-media files: these were not classified beyond extension and magic.
- Pre-compiled RPGCode (spec §9.1): no sample file has one, so the rule cannot be confirmed from the corpus.
- Whether the sample games load and run: discovery parses bytes only.

## Doc-defect list (listed only, not corrected)

Withdrawn: an earlier draft listed a mismatch between the "about 280" size of the built-in catalogue (format-spec 9.11, E-94) and a count of 265. That count came from an extractor that does not expand slash forms such as openFileInput/Output; a tokenizer-based recount finds 278, so it is not a defect.

Candidates (rule exists but this corpus does not test it, or the doc gives no rule):
- format-spec §9.1: pre-compiled RPGCode has first byte 0x00. The corpus has 0 pre-compiled files, so this rule is untested here.
- format-spec §8.1 / §8.2: `.spc` / `.ste` detection offset 16 with no byte rule given. No file of either type exists in the corpus.
- format-spec §6.3: `.ene` gives no minor-version rule. The sample `.ene` has minor 1, so the rule cannot be checked.
- format-spec §3 (`.brd` minor dispatch): branches for minor 0-1 and 2-3 are not exercised. Only minor 4 is present (demo x2, Basic x1 per spec-header checks).

## .fetched.json

```json
{
  "url": "https://github.com/chrisbmatthews/rpgtoolkit",
  "rev": "9191b9191c9bda0998c6faae16929b3331ed2ead",
  "gamesPath": "build/game",
  "games": {
    "demo": {
      "files": 75
    },
    "Basic": {
      "files": 58
    }
  }
}
```

## Notes for slicing

- Sample size: 133 files; 3,158,111 bytes (demo) and 3,149,861 bytes (Basic); largest single file 430,086 bytes.
- Media samples present: WAV 8, JPEG 4, PNG 2, MIDI 62 (both games), MZ DLLs 4. Absent: gif, bmp, ttf, otf, mp3, ogg, avi, mpg, zip, pak, gam, tpk, sav, gph, tan, tbm, spc, ste, rnc, dev, iso. Those formats need synthetic inputs for tests.
- PK container signatures: files containing a PK0304 local header = 0. Zero means no ZIP-based content exists in the fixtures to exercise a ZIP loader.
- Duplicate content: 55 of 57 shared paths are byte-identical across the two games; 78 distinct contents across 133 files. 2 shared path(s) differ between games.
- Case-collision groups within a game: 0. Zero means the fixtures contain no names that differ only by case.
- Fetch scope: only `build/game/<game>` is copied (fetch.mjs lines 444-451). No `.gam` main file and no `Main/` folder exist in either fixture. Question for the requester: should the fetch also take the main game file and any `Main/` folder?
- MIDI: 62 of 62 `.mid` files start with `MThd`; header ntrks differs from the actual MTrk count in 0 file(s).
- Slicing (counts across both games): anm 26, brd 3, tem 2, itm 2, bkg 1, ene 1, tst 4 samples support format epics directly; the absent formats above are separate slices that need new fixtures first.
