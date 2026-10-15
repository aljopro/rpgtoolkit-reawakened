# File formats: conventions and index

Every RPG Toolkit 3 game is a folder of small binary files plus RPGCode text, all written by the editor and read by the engine. This page defines the encoding rules they share; each format then has its own page. The layouts were checked by parsing every sample file shipped with the Toolkit and by rendering boards and tilesets from the parsed data (see [../tools/README.md](../tools/README.md)).

## Index

| Format | Extension | Folder | Page |
|---|---|---|---|
| Main game file | `.gam` | `Main\` (outside the project) | [main-file.md](main-file.md) |
| Board (map) | `.brd` | `Boards\` | [board.md](board.md) |
| Character | `.tem` | `Chrs\` | [character.md](character.md) |
| Item | `.itm` | `Item\` | [item.md](item.md) |
| Enemy | `.ene` | `Enemy\` | [enemy.md](enemy.md) |
| Animation | `.anm` (or `.gif`) | `Misc\` | [animation.md](animation.md) |
| Tileset, isometric tileset | `.tst`, `.iso` | `Tiles\` | [tiles.md](tiles.md) |
| Single tile | `.gph` (text) | `Tiles\` | [tiles.md](tiles.md#single-tile-gph) |
| Animated tile | `.tan` | `Tiles\` | [tiles.md](tiles.md#animated-tile-tan) |
| Tile bitmap | `.tbm` | `Bitmap\` | [tiles.md](tiles.md#tile-bitmap-tbm) |
| Fight background, status effect, special move | `.bkg`, `.ste`, `.spc` | `Bkrounds\`, `StatusE\`, `SpcMove\` | [battle-data.md](battle-data.md) |
| Saved game | `.sav` | `Saved\` | [save-game.md](save-game.md) |
| RPGCode program | `.prg` | `Prg\` | [rpgcode-program.md](rpgcode-program.md) |
| Project layout, PAK archive, standalone EXE | folder, `.tpk`, `.exe` | — | [packaging-and-paths.md](packaging-and-paths.md) |
| **Legacy files** (Toolkit 1-2 text, older 3.0 binary versions, conversion) | various | — | [legacy/](legacy/README.md) |
| Images, audio, fonts, plugins | `.bmp/.png/.jpg/.gif…`, `.wav/.mid/.mp3/.ogg`, `.ttf`, `.dll` | `Bitmap\`, `Media\`, `Font\`, `Plugin\` | third-party formats, used as-is |

## Primitive encoding

All binary formats use the same primitives, in the byte order of a 32-bit x86 PC:

| Name used in these pages | Size | Encoding | Notes |
|---|---|---|---|
| `byte` | 1 | signed 8-bit | The engine reads it as a C `char`; the editor writes a VB `Byte` (0..255). Values above 127 only appear in `gameSpeed`, which is read unsigned. |
| `short` | 2 | signed 16-bit little-endian | Most counts, sizes and flags |
| `int` | 4 | signed 32-bit little-endian | |
| `double` | 8 | IEEE-754 binary64, little-endian | Times in seconds, positions in saves |
| `string` | n+1 | the text in the Windows ANSI code page (Windows-1252 on Western systems), then one `00` byte | **No length prefix.** Strings cannot contain `00`. Read byte by byte until the first `00`. |
| `colour` | 4 | Windows `COLORREF`: `R + G·256 + B·65536` as an `int` | e.g. red = `ff 00 00 00` |
| `bool` | 2 or 4 | stored as `short` or `int`; the editor writes `-1` (VB `True`) or `0`; the engine treats any non-zero as true | |

There is no padding, alignment, checksum or compression inside these files.

## Header and version

Every binary game file begins with:

| Field | Type | Meaning |
|---|---|---|
| header | string | Fixed text such as `RPGTLKIT BOARD` (each page gives the exact text) |
| major | short | Always `2` in files from the 3.x editor (`3` for tile bitmaps and save games). Readers ignore it, except the editor's board reader, which refuses anything but 2. |
| minor | short | The real version. Fields are only ever **appended**; readers branch on the minor to know which fields exist. |

A reader must accept every older minor version listed on each page. A writer for 3.1.0 compatibility writes the newest minor.

Tilesets (`.tst`/`.iso`) are the exception: a 6-byte numeric header with no text.

## Counts are usually upper bounds

Most lists are stored as `short UB` followed by **UB + 1** entries, so `-1` means "empty" and `0` means one entry. The exceptions, which store an exact count, are the animated-tile frame list and the save-game lists (except the save game's thread list). Each table says which kind it uses.

## Legacy files

Files from Toolkit 1 and 2 (line-based text) and older 3.0 binary versions are documented separately in [legacy/](legacy/README.md), including how to tell them apart from current files and how the original programs converted them. The pages in this folder describe the current layouts, plus small older-minor differences in their "Present when" columns. [../examples/versions/](../examples/versions/README.md) has an example file of every version.

## Tile references

Anything that names a tile uses a string:

| Form | Meaning |
|---|---|
| `name.tstN` | tile *N* (1-based) of tileset `Tiles\name.tst` |
| `name.isoN` | tile *N* of isometric tileset `Tiles\name.iso` |
| `name.gph` | single-tile file `Tiles\name.gph` |
| `name.tan` | animated tile `Tiles\name.tan` (boards only) |

Sub-folders are allowed (`village\houses.tst12`) and use `\` only. **Compatibility note:** the original engine parses the tile number from 4 characters after the *first* `.` in the full path, so a `.` in a folder name breaks tile lookup.

## Directions

Two different orders are in use:

| Where | Order |
|---|---|
| Character and item walk / idle graphics | **S, N, E, W, NW, NE, SW, SE** |
| Engine movement, movement keys in the main file | E, SE, S, SW, W, NW, N, NE (values 1..8) |

## Paths inside files

File names stored inside files are relative to the folder for that type (a board stores `start.tem`, meaning `Chrs\start.tem`). Sub-folders below the type folder are preserved. Absolute paths are not expected; the save game is the exception (it stores some project-relative paths). See [packaging-and-paths.md](packaging-and-paths.md).
