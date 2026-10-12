# RPG Toolkit 3 — Legacy File Format Specification

> **Purpose.** This is the reference a clean reimplementation needs in order to **read** (and, optionally, write) game projects made with RPG Toolkit 3.x (final legacy release 3.1.0, 2007). It describes formats and behaviour, not code. The legacy implementation is GPL‑2; nothing here is copied from it. Byte layouts are stated as facts about the data. The new project can be MIT/Apache licensed.
>
> **Implementation-neutral.** "Read a 16-bit integer" means exactly that, in whatever language or runtime you choose.

---

## 0. Naming note — `.dev` / `.rnc`

The brief asked for ".dev boards" and ".rnc scripts". **No file with either extension exists anywhere in the legacy source, its sample games, or its manual.** In RPG Toolkit 3:

| Brief said | Actual legacy format | Extension |
|---|---|---|
| board | Board | **`.brd`** |
| script | RPGCode program | **`.prg`** |

This spec documents the formats that actually exist. If `.dev`/`.rnc` come from a fork, a later community version, or project-internal names, add them here once a sample file is available.

---

## 1. Global conventions

### 1.1 Primitive types (binary formats)

All multi-byte values are **little-endian**.

| Name used here | Size | Meaning |
|---|---|---|
| `i8` / `u8` | 1 byte | signed / unsigned byte (flags, booleans, small enums) |
| `i16` / `u16` | 2 bytes | signed / unsigned integer (the legacy "Integer"/"short") |
| `i32` / `u32` | 4 bytes | signed / unsigned integer (the legacy "Long"/"int") |
| `f64` | 8 bytes | IEEE‑754 double |
| `str` | variable | **NUL-terminated** single-byte string in the Windows ANSI code page (assume Windows‑1252). No length prefix. An empty string is a single `0x00`. A `str` must be followed by its `0x00` before the end of the file; a string that runs to the end of the data with no terminator is invalid and is reported as a read error at the offset where the string began. |
| `color` | 4 bytes (`i32`) | Windows COLORREF: `0x00BBGGRR` (red in the low byte). The high byte is zero in every legacy value; a reader ignores it and a writer emits `0x00`. |
| `bytes` | variable | an uninterpreted run of raw bytes whose length is given by the surrounding field; no terminator, no encoding |

The five byte values Windows‑1252 leaves undefined (`0x81`, `0x8D`, `0x8F`, `0x90`, `0x9D`) carry no character in that code page. Decode each to the character with the same numeric value (U+0081 and so on) and write it back as the same byte, so that reading and re-writing a string never changes it.

Booleans are stored as `i16` or `i8`: zero = false, and any non-zero value is true, including `-1` (some VB-era writers stored true as `-1`). When writing, store `1` for true unless the field's own section says otherwise.

### 1.2 The "upper bound" count convention

Most repeated sections start with an **upper bound**, not a count. The bound is an `i16` unless the section says otherwise (the custom-stance lists in §6.1, §6.2 and §6.3 use an `i32`). A value `n` means the entries are indexed `0..n`, so there are **`n + 1` entries**. A value of **`-1` means none**; no other negative value is valid, and a reader reports one as an error. A reader must also check `n` against the bytes that remain rather than trusting it, so that a damaged or untrusted file cannot make it read past the end or reserve a huge block up front. Where a format uses a true count, this spec says so. "None" is not the same as an empty entry: a board's tile lookup table, for example, reserves its index 0 for the empty "no tile" reference (§4.2), which is a real entry that keeps later indices stable.

### 1.3 Header strings and binary vs. text detection

Every Toolkit data file that carries a magic starts with an ASCII magic string such as `RPGTLKIT BOARD`; the tileset formats have no magic and state their own first field (§3.1). In the binary (3.x) layouts the magic is written as a `str`, so it is followed by a `0x00`. Older (2.x-era) versions of several formats were **line-oriented text** with the same magic as their first line.

**Detection rule:** for a format that begins with a magic string, look at the byte at offset `len(magic)`. If it is `0x00` the file is binary; otherwise it is text (the byte is a CR/LF). Some formats instead place a zero-versus-non-zero marker at a fixed offset, or detect the form another way: `.brd` at byte 14 (§4.1), `.tem` at byte 13 (§6.1), `.itm` at byte 13 (§6.2), `.ene` at byte 14 (§6.3), `.bkg` at byte 12 (§8.3), `.spc` and `.ste` at byte 16 (§8.1, §8.2), and a pre-compiled `.prg` by the byte `0x00` at the very start (§9.1). Where a format names its own rule, that rule takes precedence over this one. Readers must support the binary forms. Text forms are needed only for very old projects, and the 3.x engine refused some of them anyway (see each format).

### 1.4 Version fields

Binary files store `i16 major`, `i16 minor` right after the magic. `major` is informational only and selects no layout: the 3.1.0 sample files all carry `major` 2, and older files may differ. **`minor` selects the layout**, and all conditional fields below are keyed on `minor`. Each format states which `minor` values it accepts; an unlisted value is invalid and a reader reports it rather than guessing a neighbouring layout. A negative version field is invalid.

Two formats do not use this scheme. `.tst` and `.iso` begin with a single `i16 version` (`20` or `30`) and no magic at all (§3.1). A pre-compiled `.prg` is recognised by the byte `0x00` at the start, not by a version (§9.1). `.tbm` stores `major` 3 with `minor` 0 (§3.6).

### 1.5 Project layout and path resolution

A game is a **main file** plus a **project folder**:

```
<root>/Main/<game>.gam          ← main file (one per game)
<root>/Game/<project>/          ← "project path" stored in the main file
    Tiles/     .tst .iso .gph .tan          (tiles, tilesets, animated tiles)
    Boards/    .brd
    Chrs/      .tem                         (player characters)
    Item/      .itm                         (items / NPCs)
    Enemy/     .ene
    SpcMove/   .spc                         (special moves)
    StatusE/   .ste                         (status effects)
    Bkrounds/  .bkg                         (battle backgrounds)
    Misc/      .anm, animated .gif          (animations)
    Bitmap/    .tbm and ordinary images     (tile bitmaps, pictures)
    Media/     audio, video
    Prg/       .prg                         (RPGCode)
    Font/      .ttf                         (game-private fonts)
    Plugin/    plugin libraries
<root>/Saved/                    ← saved games (.sav)
```

* A reference stored in one file to another is a **path relative to the folder for that file type**. For example, a board's link `village\inn.brd` resolves to `Game/<project>/Boards/village/inn.brd`. Subfolders have been allowed since 3.1.0.
* **Location of `.gam` vs project folders:** `<root>/Main/<game>.gam` is a sibling of the `<root>/Game/` directory, never inside the project folder. For example, the shipped demo game pairs `<root>/Main/demo.gam` with project assets at `<root>/Game/demo/`. Starter templates like `Basic` (`<root>/Game/Basic/`) contain assets only; a `.gam` file is only created under `Main/` once a project is saved from the editor.
* **The root and the stored project path:** `<root>` is the folder that holds `Main/` and `Game/`, so for a main file at `<root>/Main/<game>.gam` it is the folder above the main file's own folder. The project path stored in the main file is relative to `<root>`, never to `Main/`: the shipped demo's main file stores `Game\demo\`, which names `<root>/Game/demo/`. A bare folder name such as `demo` is accepted too and means `<root>/Game/demo/`. A reader tells the two apart by the first segment: if it is `Game` (any case) and more segments follow, the path already starts at `<root>`; otherwise it is placed under `Game/`. Finding `<root>` is the host's job (from where the main file sits, or from the folder the game was opened in); the core never touches the file system.
* **Engine startup requirement:** Games **cannot run without a `.gam` file**. At boot, the engine resolves the main file from the command line (`Main/<arg>`), from an embedded `main.gam` inside a standalone package or pakfile (§13), or prompts the user with an open-file dialog targeting `Main/*.gam`. If no valid `.gam` is loaded, the engine cannot boot: it relies on `.gam` to discover `projectPath`, `startupPrg`, `initBoard`, `initChar`, resolution, window mode, and active plugins.
* The legacy separator is **backslash**. Treat `\` and `/` as equivalent.
* Matching is **case-insensitive**, because the legacy platform's file system was. A modern reader on a case-sensitive file system needs a case-folding lookup.
* Some saved paths include the type folder prefix (e.g. `Item\npc.itm`). Strip a leading type folder if it is present.
### 1.6 Tile references

A tile is referenced by a string that names a tileset and a **1-based** index appended directly to the extension:

```
default.tst12      → tile #12 of Tiles/default.tst
forest.iso3        → tile #3 of Tiles/forest.iso (isometric set)
rock.gph           → single-tile file
water.tan          → animated tile
```

To parse, split at the last `.`. The first three characters after it are the extension and the remaining digits are the index. **Re-ordering a tileset changes what every board shows**, because references are positional.

### 1.7 Bytes after the last documented field

Bytes after the last documented field of a binary file are not an error. A reader keeps them as they are (the file's *residue*) and reports a warning, and a writer puts them back, so a file that is read and saved without changes is written back byte for byte. *Reason: dropping bytes the reader does not understand would silently change a file its author never edited.* Rows the format marks reserved are different: they are part of the layout and stay in their place.

---

## 2. Main file — `.gam` (`RPGTLKIT MAIN`)

One per game. It holds global settings and the startup sequence. Binary only.

The table below details all **43 logical rows** across the file's lifetime, including the **12 version-dependent fields** controlled by `minor`:
| # | Type | Field | Notes |
|---|---|---|---|
| 1 | str | magic `RPGTLKIT MAIN` | |
| 2 | i16, i16 | major, minor | layouts below key on minor (0–9 observed; 9 = 3.1.0) |
| 3 | i32 / i16 | reserved | ignore (old registration flag). *Quirk:* On disk, the editor writes an `i16` value (1). The legacy C++ reader reads a 4-byte `int`, consuming 2 bytes of the flag and 2 bytes of the subsequent `"NOCODE\0"` string, while the subsequent string read consumes the remainder (`"CODE\0"`), perfectly keeping byte alignment at offset 0x1B (`projectPath`). |
| 4 | str | reserved | ignore (old registration code, default `"NOCODE"`). |
| 5 | str | **projectPath** | the project folder; §1.5 says how it resolves (the shipped demo stores `Game\demo\`, relative to `<root>`; a bare `demo` means the same folder). Ignore it when the game is loaded from a package (§13). |
| 6 | str | **gameTitle** | window title |
| 7 | i16 | screenType | 0/1 = full-screen accelerated, 2 = windowed |
| 8 | i16 | extendToFullScreen | 0/1 |
| 9 | i16 | resolution | 0 = 640×480, 1 = 800×600, 2 = 1024×768, other = custom (see resX/resY) |
| — | i32 | *(minor < 3 only)* reserved | |
| 10 | i16 | disableProtectReg | obsolete |
| 11 | str | languageFile | obsolete |
| 12 | str | **startupPrg** | program run at boot (required in practice) |
| 13 | str | **initBoard** | first board; may be empty if the start program sends the player somewhere |
| 14 | str | **initChar** | first player character (`.tem`); may be empty if the start program adds one |
| 15 | str | runTimePrg | program bound to the run-time key |
| 16 | i16 | runTimeKey | **ASCII code** of the key (uppercase letter/digit) |
| 17 | i16 | menuKey | ASCII code of the key that opens the menu |
| 18 | i16 | activationKey | ASCII code of the general "interact" key |
| 19 | i16 | extKeys upper bound | then per entry: `i16 asciiKey`, `str program`. Extra run-time keys (up to 50). Skip entries with an empty program. |
| — | | *(minor ≥ 3)* `str menuPlugin`, `str fightPlugin` | *(minor < 3)* `i32` reserved; defaults are the stock menu and battle plugins |
| — | | *(minor ≤ 2)* `i32`, `i16` reserved | |
| 20 | i16 | fightingDisabled | **inverted flag: 0 = fighting enabled**, non-zero = disabled |
| 21 | i16 | enemy list upper bound | then per entry: `str enemyFile`, `i16 skillLevel` (random-encounter pool) |
| 22 | i16 | fightType | 0 = random (1-in-*chances* per check), 1 = planned (every *chances* tiles) |
| 23 | i32 | chances | |
| 24 | i16 | useCustomFightPrg | 0/1 |
| 25 | str | customFightPrg | RPGCode run instead of the built-in battle |
| — | | *(minor < 3)* `i16` reserved | |
| 26 | str | gameOverPrg | run when the party is defeated |
| 27 | str | skinButton | legacy UI skin image |
| 28 | str | skinWindow | legacy UI skin image |
| 29 | i16 | plugin list upper bound | *(minor ≤ 2)* per entry `i16 enabled`; the plugin name is implied as `tkplug<N>`. *(minor ≥ 3)* per entry `str pluginFile`. |
| 30 | i16 | useDayNight | 0/1 (largely unused at runtime) |
| 31 | i16 | dayNightType | 0 = real clock, 1 = game clock |
| 32 | i32 | dayLengthMinutes | |
| — | | *(minor ≥ 3)* `str cursorMoveSound`, `str cursorSelectSound`, `str cursorCancelSound`, `u8 useJoystick`, `u8 colorDepth` | |
| — | | *(minor ≥ 4)* `u8 gameSpeed`, `u8 pixelMovement` | gameSpeed: if minor ≥ 8 the stored byte is `speed + 128` (range −4…+4, each step ±10 %); if minor < 8 the byte is the raw speed. pixelMovement: 0 = tile steps, 1 = pixel steps. Default 0/0 when absent. |
| — | | *(minor = 5)* `u8 cursorEnabled` → cursor is "TK DEFAULT" or none | |
| — | | *(minor ≥ 6)* `str mouseCursor`, `u8 hotSpotX`, `u8 hotSpotY`, `color transparent` | `mouseCursor` = `"TK DEFAULT"` (built-in arrow, transparent colour pure red), `""` (none), or an image/tile reference. Before minor 5 the default cursor is used. |
| — | | *(minor ≥ 7)* `i32 resX`, `i32 resY` | custom resolution |
| — | | *(minor ≥ 8)* `u8 showFpsInTitle` | |
| — | | *(minor ≥ 9)* `i16 pathfindHeuristic`, `i32 drawVectorsFlags`, `color pathColor`, `i32 movementControls`, then 8 × `i16 movementScanCode` | heuristic: axial / diagonal / vector (default diagonal before minor 9). drawVectors: debug-overlay bit flags (board vectors, sprite vectors, player path, destination). movementControls bits: 1 = keyboard, 2 = mouse, 4 = allow diagonals (default 1 + 4). The scan codes are **hardware keyboard scan codes**, ordered E, SE, S, SW, W, NW, N, NE. 0 = unbound. Defaults: arrow keys for E/S/W/N, diagonals unbound. |

**Version-dependent fields summary (12 conditional rows):**
1. `minor < 3`: Row 10 (reserved `i32` old parallax value).
2. `minor ≥ 3`: Row 21 (`str menuPlugin, str fightPlugin`) vs `minor < 3`: reserved `i32`.
3. `minor ≤ 2`: Row 22 (reserved `i32, i16` multitask speed and memory protection).
4. `minor < 3`: Row 29 (reserved `i16` old fight style).
5. `minor ≤ 2`: Row 33 (plugin list entries stored as `i16 enabled` rather than `str pluginFile`).
6. `minor ≥ 3`: Row 37 (`cursorMoveSound, cursorSelectSound, cursorCancelSound, useJoystick, colorDepth`).
7. `minor ≥ 4`: Row 38 (`gameSpeed, pixelMovement`).
8. `minor = 5`: Row 39 (`cursorEnabled`).
9. `minor ≥ 6`: Row 40 (`mouseCursor, hotSpotX, hotSpotY, transparent`).
10. `minor ≥ 7`: Row 41 (`resX, resY`).
11. `minor ≥ 8`: Row 42 (`showFpsInTitle`).
12. `minor ≥ 9`: Row 43 (`pathfindHeuristic, drawVectorsFlags, pathColor, movementControls, 8 × movementScanCode`).

**Key encodings differ.** The menu, activation and run-time keys are character codes. The movement keys are physical scan codes. A rebuild should map both to its own input abstraction.

---

## 3. Tiles

All tiles are **32×32 pixels** in memory. Isometric tiles are drawn as **64×32 diamonds**. Pixels have 24-bit colour plus binary transparency (no partial alpha).

### 3.1 Tileset — `.tst` (2D) and `.iso` (isometric)

No magic string. The file is a fixed header followed by tightly packed tiles.

**Header (6 bytes):**

| Type | Field | Values |
|---|---|---|
| i16 | version | `20` = `.tst`, `30` = `.iso` |
| i16 | tileCount | number of tiles (a true count, not an upper bound) |
| i16 | detail | pixel format; uniform for the whole set |

**Detail levels:**

| detail | Size | Bytes/pixel | Encoding |
|---|---|---|---|
| 1 | 32×32 | 3 | R, G, B |
| 2 | 16×16 | 3 | R, G, B |
| 3, 5 | 32×32 | 1 | palette index |
| 4, 6 | 16×16 | 1 | palette index |
| 150 | 32×32 | 3 | isometric packing (`.iso` only; §3.3) |

Tile *n* (1-based) starts at byte offset `6 + (n−1) × size × size × bytesPerPixel`.

**Pixel order is column-major.** The outer loop runs over x (0…size−1) and the inner loop over y. The first `size` pixels are therefore the left-most column, top to bottom.

**Transparency.**
* 24-bit: the exact triple **R=0, G=1, B=2** means transparent.
* 8-bit: index **255** means transparent.

**Palette (8-bit detail).** Indices refer to the standard **VGA/DOS 256-colour default palette** (16 EGA colours, 16 greys, then hue ramps). A reimplementation must ship this table. Build it from the public VGA default palette, not from the legacy source.

**16×16 tiles** are upscaled to 32×32 by pixel doubling before use. A reader keeps the stored 16×16 pixels; the renderer does the doubling once per tileset and caches the result.

### 3.2 Single tile — `.gph` (legacy, text)

* **v2:** first line `RPGTLKIT TILE`, then lines for major, minor, detail, and `compressed` (0/1).
  * Uncompressed: one decimal colour value per line, size×size lines, column-major order.
  * Compressed: pairs of lines `runLength`, `colour`, filling column-major until the tile is complete.
  * Colour values are COLORREF decimals, or palette indices for detail 3/5. **`-1` means transparent.**
* **v1:** a 16×16 grid, one text row per y. Each character encodes a palette index as `charCode − 33`.

### 3.3 Isometric tile packing (`.iso`, detail 150)

An isometric tile is a 64×32 image whose usable area is a diamond. The four corners outside it are always transparent. To fit 32×32 storage, only the **diamond pixels** are kept:

1. **Diamond mask** for 64×32, with x in 0…63 and y in 0…31. Split it into four 32×16 quadrants with local coordinates (qx 0…31, qy 0…15). A pixel is **inside** when:
   * top-left quadrant: `2·qy ≥ 31 − qx`
   * top-right quadrant: `2·qy ≥ qx`
   * bottom-left quadrant: `2·qy < qx`
   * bottom-right quadrant: `2·qy < 31 − qx`
   (The inside region is exactly 1024 pixels.)
2. **Unpacking:** walk the 64×32 image column-major (x outer, y inner). At each inside pixel, take the next stored pixel. Stored pixels are themselves read column-major from the 32×32 block. Pixels outside the diamond are transparent.

### 3.4 2D tiles on isometric boards

A normal 32×32 tile placed on an isometric board is **projected on the fly**: rotated 45° and squashed to the 64×32 diamond. The source data is not changed. A rebuild needs some reasonable affine resample for this. Exact pixel parity with the legacy output is not required.

### 3.5 Animated tile — `.tan` (`RPGTLKIT TILEANIM`)

| Type | Field |
|---|---|
| str | magic |
| i16, i16 | major, minor |
| i32 | framesPerSecond (frame duration = 1000 / fps ms; 15 is "fast") |
| i32 | frameCount (**a true count, not an upper bound**) |
| str × frameCount | tile reference per frame |

Animated tiles can be placed on boards like ordinary tiles (§4.3) and play continuously.

### 3.6 Tile bitmap — `.tbm` (`TK3 TILEBITMAP`)

A small grid of tiles used as one picture, e.g. a 32×64 character frame.

`width` and `height` are inclusive bounds, like every other upper bound (§1.2): the loops run over `0..width` and `0..height`, so a `width` of 0 still has one column.

| Type | Field |
|---|---|
| str | magic `TK3 TILEBITMAP` |
| i16, i16 | major (3), minor (0) |
| i16 | width (tiles) |
| i16 | height (tiles) |
| then for x = 0…**width** and y = 0…**height** (both inclusive; x outer, y inner): | `str tileRef`, `i16 shadeR`, `i16 shadeG`, `i16 shadeB` |

Only cells with x < width and y < height are drawn. The extra last row and column are padding written for legacy reasons and must be read and then ignored. Shades are additive RGB offsets in the range −255…+255, applied to each tile (§4.5). An empty tile reference means an empty cell.

---

## 4. Board — `.brd` (`RPGTLKIT BOARD`)

A board is one scene: a 3-D grid of tiles (x, y, layer) plus free images, collision and trigger geometry, sprites, lighting, and per-board settings.

### 4.1 Version dispatch

1. If the byte at offset 14 is non-zero, the file is a **2.x text board**. The 3.x engine refused these ("re-save in the editor"). Support is optional.
2. Read `str magic`, `i16 major`, `i16 minor`.
   * minor 0–1: obsolete; refuse or convert.
   * minor 2–3: **pre-vector board** (3.0.x), §4.8.
   * minor ≥ 4: **vector board** (3.1.0), §4.2.

### 4.2 Vector board layout (minor ≥ 4)

All coordinates in this layout are **pixels**, except tile grid indices.

**Dimensions**

| Type | Field |
|---|---|
| i16 | sizeX (tiles) |
| i16 | sizeY (tiles) |
| i16 | sizeL (layers, 1-based) |
| i16 | coordType (bit flags; §5) |

*Effective grid*: for **isometric-rotated** boards the stored tile matrix is `(sizeX + sizeY) × (sizeX + sizeY)` per layer. Otherwise it is `sizeX × sizeY`.

*Size limits*: a negative `sizeX`, `sizeY` or `sizeL` is invalid, and a reader reports it. A reader also refuses a board whose tile matrix would hold more than 4,194,304 cells (the effective grid times `sizeL`). That second rule is an implementation limit, not part of the format: a run marker fills up to 32,768 cells with four bytes, so without it a file of a few kilobytes could make a reader reserve gigabytes. Real boards are about a hundred times smaller. A writer refuses a board the reader would refuse.

**Tile lookup table (LUT)**

| Type | Field |
|---|---|
| i16 | lutUpperBound |
| str × (lutUpperBound + 1) | tile references. **Index 0 is always the "no tile" entry (empty string).** Unused slots may be empty. An empty slot is not the same as the table being absent: the table always has `lutUpperBound + 1` entries, and `-1` is the only value that means "none" (§1.2). |

**Tile matrix:** for each layer z = 1…sizeL, then each row y = 1…H, then each column x = 1…W (row-major within a layer), read an `i16`:
* **≥ 0:** LUT index for this one cell.
* **< 0:** run-length marker. `count = −value`. The next `i16` is the LUT index, which applies to the next `count` cells in the same traversal order. Runs may wrap rows and layers.

A cell whose LUT entry is a `.tan` file is an animated tile.

**Tile shading layers**

| Type | Field |
|---|---|
| i16 | shadeLayers upper bound |
| per shade layer: | `i32 castLayer` (the highest tile layer this shade layer applies to; it tints that layer and all layers below), then cells row-major (y outer, x inner) encoded as **records** `i16 runCount, i16 r, i16 g, i16 b`. Each record covers `runCount` consecutive cells. A runCount of 0 or 1 covers one cell. |

**Lights** (precomputed into the shading at load time)

| Type | Field |
|---|---|
| i16 | lights upper bound (−1 = none) |
| per light: | `i32 layer`, `i32 type` (0 = elliptical spotlight, 1 = linear gradient, 2 = clipped gradient), `i16 nodes upper bound` then nodes as `i32 x, i32 y`, `i16 colours upper bound` then colours as `i16 r, g, b` |

Spotlights have 3 nodes (centre, semi-major end, semi-minor end) and 2 colours (centre, edge). Gradients have 2 nodes and 2 colours. The legacy engine rasterises each light **per tile** (one shade per tile, sampled at the tile centre) and adds the result to shade layer 0. Lights cannot change at runtime.

**Vectors** (collision / under / stairs / waypoint)

| Type | Field |
|---|---|
| i16 | vectors upper bound (−1 = none) |
| per vector: | `i16 points upper bound`, points as `i32 x, i32 y`; `i16 attributes`; `i16 closed` (non-zero = closed polygon, specifically `-1` / `0xFFFF` written by legacy VB `CInt(True)`; `0` = open polyline); `i16 layer`; `i16 type`; `str handle` |

`type` and `attributes`: see §4.4.

**Programs** (trigger regions)

| Type | Field |
|---|---|
| i16 | programs upper bound (−1 = none) |
| per program: | `str program`, `str graphic` (unused), `str initialVar`, `str initialValue`, `str finalVar`, `str finalValue`, `i16 activate` (0 = always, 1 = conditional), `i16 activationType` (flags; §4.4), `i16 repeatDistance` (pixels), `i16 layer`, `i16 points upper bound` then points as `i32 x, i32 y`, `i16 closed` (non-zero = closed polygon, specifically `-1`; `0` = open), `str handle` (reserved) |

`program` is a `.prg` file name. **If no such file exists, the string is run as a line of inline RPGCode.** An entry with an empty `program` is an empty slot. Keep the slot so indices stay stable.

**Sprites** (items / NPCs placed on the board)

| Type | Field |
|---|---|
| i16 | sprites upper bound (−1 = none) |
| per sprite: | `str itemFile`, `str activationPrg` (overrides the item's own), `str multitaskPrg` (overrides the item's own), `str initialVar`, `str initialValue`, `str finalVar`, `str finalValue`, `str loadingVar`, `str loadingValue`, `i16 activate` (0 = always, 1 = conditional), `i16 activationType` (0 = step-on, 1 = key-press), `i16 x`, `i16 y`, `i16 layer`, `i16 reserved` (always −1) |

Sprite x/y are **pixels**. The anchor is the **bottom-centre** of the sprite frame. On isometric boards there is a historical +8 px vertical offset in the editor display. Empty `itemFile` = empty slot.

**Images**

| Type | Field |
|---|---|
| i16 | images upper bound (−1 = none) |
| per image: | `str file`, `i32 left`, `i32 top` (pixels), `i16 layer`, `i16 drawType` (0 = normal, 1 = parallax, 2 = stretch), `color transparent`, `i16 reserved` (written as 100, intended for translucency) |

**Threads**

| Type | Field |
|---|---|
| i16 | threads upper bound |
| str × n+1 | program files started as background threads when the board loads |

**Constants and titles**

| Type | Field |
|---|---|
| i16 | constants upper bound, then `str` × n+1 | values exposed to scripts as `constant[i]` |
| str × (sizeL + 1) | layer titles, indices 0…sizeL, exposed as `boardTitle[i]` |

**Links:** `str` × 4, in the order **North, South, East, West**. Each is a `.brd` (walk off that edge to reach it) or a `.prg` (run when that edge is reached), or empty.

**Trailing properties**

| Type | Field |
|---|---|
| str | backgroundImage (drawn below layer 1) |
| i32 | backgroundDrawType (0 normal, 1 parallax, 2 stretch) |
| color | backgroundColour |
| str | backgroundMusic (loops while on the board) |
| str | enterPrg (runs after threads start, each time the board is entered) |
| str | battleBackground (`.bkg`) |
| i16 | battleSkill (encounter skill level) |
| i16 | allowBattles |
| i16 | disableSaving |
| i16 × 3 | ambientR, ambientG, ambientB (−255…+255, additive) |
| i16 × 3 | startX, startY, startLayer (pixels; defaults 64, 64, 1 if ≤ 0) |

### 4.3 Board semantics that affect reading

* **Layer order:** background colour, then background image, then layer 1 tiles, then layer 1 images, then layer 2, and so on. Within a layer, images draw over tiles. Sprites draw on their own layer, z-ordered by y (§ engine doc).
* **Animated tiles** cycle at their own frame rate. The first frame stands in for the tile when static.
* **Parallax image:** scrolls at a rate that makes the image's extent match the board's extent relative to the screen size: `scroll = (imageSize − screenSize) / (boardPixelSize − screenSize)`, per axis. If the image is exactly board-sized it is treated as normal.
* **Stretch image:** scaled to the board's pixel size.
* **"Run once"** programs are not a separate flag. The editor writes a unique (GUID) variable name into both `initialVar` and `finalVar`, sets `initialValue = ""`, and sets `finalValue` to a fixed sentinel string. Behaviour falls out of the normal conditional-activation rule.

### 4.4 Vector and program enumerations

**Vector `type`:** 1 = solid, 2 = under, 8 = stairs, 16 = waypoint. (4 = "unidirectional" is deprecated. 0 = passable.)

**Vector `attributes`:**
* *under*: bit flags. 1 = include the board background image; 2 = apply to all layers below; 4 = trigger on sprite **frame** intersection instead of collision-base intersection.
* *stairs*: the destination layer number.

**Program `activationType`:** bit 0 → 0 = step-on, 1 = key-press; 2 = repeat every `repeatDistance` px while inside; 4 = running the program stops (clears) the player's movement queue.

### 4.5 Shading arithmetic

Shades and ambient values are **signed additive RGB offsets** in the range −255…+255. The colour of a drawn tile pixel is `clamp(src + shadeLayer + boardAmbient + globalAmbient, 0, 255)` per channel. Transparent pixels are left alone. Shading applies to board tiles and tile-built sprites. The ambient level also applies to images and sprite frames.

### 4.6 Board pixel dimensions

| coordType | width | height |
|---|---|---|
| 2D | `32·sizeX` | `32·sizeY` |
| iso stacked | `64·sizeX − 32` | `16·sizeY − 16` |
| iso rotated | `64·sizeX − 32` | `32·sizeY` |

### 4.7 Legacy tile types (for pre-vector conversion)

0 normal, 1 solid, 2 under, 3 north–south passage, 4 east–west passage, 11–18 stairs to layer 1–8 (value − 10).

### 4.8 Pre-vector board layout (minor 2–3)

In these boards **object positions are tile coordinates**, and collision is a **per-tile type** rather than geometry. A reader must convert to the vector model:

| Type | Field |
|---|---|
| str; i16, i16 | magic `RPGTLKIT BOARD`; major; minor (2 or 3; byte 14 must be 0) |
| i16, str | reserved (registration) |
| i16 × 3 | sizeX, sizeY, sizeL |
| i16 × 3 | startX, startY, startLayer (**tiles**) |
| i16 | disableSaving (0/1) |
| i16, str… | LUT as in §4.2 |
| tile matrix | each cell is either `i16 index, i16 r, i16 g, i16 b, i8 tileType` or a run: `i16 −count, i16 index, i16 r, i16 g, i16 b, i8 tileType`. Order is z, y, x. Runs may span rows and layers. |
| str | background image (treat as parallax) |
| str, str | foreground image, border image (unused) |
| i32 | background colour |
| i32 | border colour (unused) |
| i16 | ambient preset: 0 none, 1 "mist" (+75,+75,+75), 2 "dark" (−75,−75,−75), 3 "water" (0,0,+75) |
| str × 4 | directional links in exact order: **N, S, E, W** |
| i16 | battleSkill |
| str | battleBackground |
| i16 | allowBattles |
| i16 × 3, str | day/night fields (unused) |
| i16 × 11 | constants 0…10 (numeric) |
| str | background music |
| str × 9 | layer titles 0…8 |
| i16 | programs upper bound, then per program: `str file, i16 x, i16 y, i16 layer, str graphic, i16 activate, str initialVar, str finalVar, str initialValue, str finalValue, i16 activationType`. Program positions are in **tile coordinates**. Strip legacy `!`/`$` suffixes from variable names. **Old programs always receive the flag `activationType |= PRG_STOPS_MOVEMENT` (stops player movement).** |
| str, str | enterPrg, reserved |
| i16 | sprites upper bound, then per sprite: `str file, i16 x, i16 y, i16 layer, i16 activate, str initialVar, str finalVar, str initialValue, str finalValue, i16 activationType, str activationPrg, str multitaskPrg`. Positions are in **tile coordinates**. Loading condition equals the activation condition (`loadingVar = initialVar`, `loadingValue = initialValue`). |
| *(minor ≥ 3)* i32, str… | threads (upper bound, then names). *Minor 2 has no threads field.* |
| *(minor ≥ 3)* i8 | coordType (0 = 2D, 1 = iso stacked, 2 = iso rotated). *Minor 2 defaults to 0 (2D).* |

**Conversion rules to vector board:**
* **Tile type vectorization:** For each layer, merge contiguous non-zero tiles into vector geometry:
  * `0` (Normal): no vector emitted.
  * `1` (Solid): solid polygon vectors (closed) tracing contiguous solid tiles.
  * `2` (Under): under vector (`TT_UNDER = 2`, closed), with attributes set to `TA_BRD_BACKGROUND` (include background).
  * `3` (North–South) and `4` (East–West): passage vectors, converted to `TT_SOLID` open polylines along the blocking edges (`closed = 0`).
  * `11…18` (Stairs 1…8): converted to `TT_STAIRS` (`8`), closed polygon, with `attributes = tileType − 10` (the target layer 1…8).
* **Program trigger regions:** Each program at tile `(x, y)` becomes a closed vector around that tile:
  * 2D: 32×32 bounding rectangle from `((x−1)·32, (y−1)·32)` to `(x·32, y·32)`.
  * Isometric stacked: 64×32 diamond centered on the tile.
* **Shading:** The per-tile RGB values across all layers are flattened into a single shade layer (`tileShading[0]`). Its cast layer is set to the highest layer that had non-zero shading.
* **Positions:** Convert the player start point and sprite positions from tile coordinates to pixel coordinates (§5) with the base point added. (Fallback for start location if ≤ 0 is (64, 64) px on layer 1). Pre-vector items receive standard default vector bases.
---

## 5. Coordinate systems

The `coordType` flags:
* **0** = 2D top-down (`TILE_NORMAL`, 32×32 tiles).
* **1** = isometric "stacked" (`ISO_STACKED`, staggered columns, 64×32 diamonds).
* **2** = isometric "rotated" (`ISO_ROTATED`, axes turned 60°/30°).
* **4** = "pixel absolute" (`PX_ABSOLUTE`, object coordinates in scripts are pixels; bit flag combinable with 0, 1, or 2).

Isometric boards are detected whenever `(coordType & 1) || (coordType & 2)` is non-zero (`ISO_STACKED` and `ISO_ROTATED` are mutually exclusive coordinate styles). Tile indices are always **1-based**.

**Tile → pixel (top-left of the tile's bounding cell), then add the base point:**

| System | x | y | base point added |
|---|---|---|---|
| 2D | `(x−1)·32` | `(y−1)·32` | `+16, +31` (bottom-centre of the tile) |
| iso stacked | `64x − (y odd ? 32 : 64)` | `16y − 16` | `+0, +0` (tile centre) |
| iso rotated | `(x − y + sizeX)·32` | `(x + y − sizeX)·16 − 16` | `+0, +0` |

**Pixel → tile** is the inverse: snap to the nearest tile centre on a 32×16 diamond grid, then invert the formulas above. For iso-rotated: `ty = floor((py+16)/32) − floor(px/64) + sizeX` and `tx = floor(px/32) + ty − sizeX`. For 2D: `tx = floor(px/32)+1`, `ty = floor(py/32)+1`, after the base point has been subtracted.

**Stacked → rotated conversion** (offered by the editor as a one-way upgrade): `xr = xs + floor((ys−1)/2)`, `yr = floor(ys/2) + 1 − xs + sizeX`.

Movement directions are an 8-way enum: E = 1, SE = 2, S = 3, SW = 4, W = 5, NW = 6, N = 7, NE = 8 (0 = idle). Scripts see these as `tkDIR_*`.

---

## 6. Sprites

Players (`.tem`) and items (`.itm`) share a graphics model:

* **Directional movement animations**: 8 slots.
* **Directional idle animations**: 8 slots. These play after `idleTime` seconds without movement.
* **Battle stances**: FIGHT, DEFEND, SPECIAL MOVE, DIE, REST.
* **Custom stances**: any number of (handle → animation) pairs, played by script.
* **Two polygons in sprite-local pixels**, relative to the anchor (bottom-centre):
  * **collision base**: the solid footprint.
  * **activation base**: the area the player must touch to interact.
* `speed` = seconds per animation frame / step. `idleTime` = seconds before idle animations begin.

Directional graphics are stored in the order **S, N, E, W, NW, NE, SW, SE**. This order is different from the direction enum. If an animation file name has no `.anm` extension but is a `.gif`, treat it as an animated GIF (§7.2).

**Default bases** when a file has none (old versions): 2D collision is a small rectangle at the feet; activation is a larger rectangle roughly the frame's footprint. Isometric boards use diamonds instead.

### 6.1 Character — `.tem` (`RPGTLKIT CHAR`)

Detection: byte at offset 13. Only the binary form is supported (text versions must be re-saved).

| Type | Field |
|---|---|
| str; i16, i16 | magic; major; minor |
| str | name |
| str × 9 | **script variable names** in exact order: experience, DP, FP, HP, max HP, name, SMP, max SMP, level. Strip trailing `!`/`$`. |
| i32 × 8 | **initial stats** in exact order: initial experience, HP, max HP, DP, FP, SMP, max SMP, level. |
| str | profile picture (portrait image or tile) |
| 201 × { str moveFile, i32 minExp, i32 minLevel, str condVar, str condValue } | special-move list with learn conditions |
| str | special-move category name (e.g. "Magic") |
| i8 | hasSpecialMoves (**0 = yes**, 1 = no) |
| str × 11 | accessory slot names |
| i8 × 7 | body slots in use (0/1). *Note:* Due to legacy 1-based indexing in VB6 (`armorType(6)`), byte 0 is an unused padding byte (always 0). Bytes 1 through 6 correspond to: **1 = head, 2 = neck, 3 = left hand, 4 = right hand, 5 = body, 6 = legs**. |
| *(minor = 3)* i8 / *(else)* i32 | initial experience needed for the first level-up |
| i16 | experience increase (% if exponential, points if linear) |
| i32 | max level. Maximum level the character can reach. If `maxLevel == 0`, the level-up condition (`level ≥ maxLevel`) is immediately satisfied, disabling level progression entirely. |
| i16 × 4 | per-level increase of HP, DP, FP, SMP (% or points) |
| *(minor < 5)* str × 4 | obsolete battle sounds |
| str | level-up program |
| i8 | level-up type (0 = exponential/percent, 1 = linear/points) |
| i8 | size type (legacy: 0 = 32×32, 1 = 64×32) |
| *(minor ≥ 5)* str × 8 | movement animations (S, N, E, W, NW, NE, SW, SE) |
| *(minor ≥ 5)* str × 5, str | FIGHT, DEFEND, SPECIAL MOVE, DIE, REST, then one reserved |
| *(minor ≥ 6)* str × 8 | idle animations (same order) |
| *(minor ≥ 7)* f64, f64 | idleTime, speed (defaults 3.0 s, 0.05 s) |
| *(minor ≥ 5)* i32 | custom stances upper bound, then pairs `str animation, str handle` (skip if either is empty) |
| *(minor ≥ 8)* i16 | number of vector bases upper bound (stored as `1`, representing indices `0..1` for **2 bases**) |
| *(minor ≥ 8)* | collision base: `i16 points upper bound`, points `i32 x, i32 y`; then the activation base in the same form (both closed polygons) |

### 6.2 Item — `.itm` (`RPGTLKIT ITEM`)

Items are inventory objects, equipment and **NPCs** (anything placed on a board).

| Type | Field |
|---|---|
| str; i16, i16 | magic; major; minor (byte 13 must be 0) |
| str | name / handle |
| str | one-line description |
| i8 × 5 | equipable, menu-usable, board-usable, battle-usable, usedBy (0 = all, 1 = listed) |
| str × 51 | allowed character handles |
| *(minor ≥ 3)* i32 × 2 / *(else)* i16 × 2 | buy price, sell price |
| i8 | key item (cannot drop) |
| i8 × 8 | equip slots enabled (head … accessory) |
| str | accessory name |
| i32 × 4 *(i16 if minor < 3)* | equip bonus HP, DP, FP, SMP |
| str × 2 | on-equip program, on-remove program |
| i32 × 2 *(i16)* | menu use: +HP, +SMP |
| str | menu use program |
| i32 × 2 *(i16)* | battle use: +HP, +SMP |
| str | battle use program |
| str | battle animation |
| str | **multitask program** (runs as a thread while the item is on the board) |
| str | **activation program** (runs when the player interacts) |
| i8 | size type (legacy) |
| *(minor ≥ 4)* str × 8, str, str | movement animations (S, N, E, W, NW, NE, SW, SE), legacy rest animation, reserved |
| *(minor ≥ 5)* str × 8, f64, f64 | idle animations, then **speed, idleTime** (note: the opposite order from characters, which store `idleTime`, then `speed`) |
| *(minor < 6)* | the legacy rest animation becomes the idle-South animation |
| *(minor ≥ 4)* i32 + pairs | custom stances upper bound (`i32`), then pairs `str animation, str handle`. *Sequence note:* In `minor = 4`, custom stances appears immediately after the 10 movement strings. In `minor ≥ 5`, it appears after the idle animations and speed/idleTime. |
| *(minor ≥ 7)* i16 + bases | vector bases upper bound (`1` = 2 bases: collision base, then activation base), with points as for characters |
| *(minor < 4)* str × 16 × 2, str × 2 | legacy two-tile-tall walk frames (4 per direction S, E, N, W, each frame = top & bottom tile) and two rest tiles. A reader synthesises 1×2 tile bitmaps and 4-frame animations (frame delay 0.167 s) from these. |

### 6.3 Enemy — `.ene` (`RPGTLKIT ENEMY`)

Detection: byte at offset 14 (`0x00` = binary 2.1; non-zero = legacy text 2.0).

**Versions:** Major version is always 2. Only two versions exist: **minor 0** (2.0 text format) and **minor 1** (2.1 binary format, used by Toolkit 3.0 and 3.1). No other minor versions exist.

| Type | Field |
|---|---|
| str; i16, i16 | magic `RPGTLKIT ENEMY`; major (2); minor (1) |
| str | name |
| i32 × 4 | HP (= max), SMP (= max), FP, DP |
| i8 | player can run (0 = no) |
| i16 | 1-in-N chance of a critical hit **on** this enemy (defence ignored) |
| i16 | 1-in-N chance of a critical hit **by** this enemy |
| i16 + str… | special moves (upper bound, then files) |
| i16 + str… | weaknesses (special moves that hurt more) |
| i16 + str… | strengths |
| i8 | AI level 0–3 (low, medium, high, very high) |
| i8 | use custom AI program |
| str | AI program |
| i32, i32 | experience reward, gold reward |
| str, str | defeat program, run-away program |
| i16 + str… | stance animations upper bound (stored as **5**, yielding 6 slots 0..5): **0 REST, 1 FIGHT / ATTACK, 2 DEFEND, 3 SPECIAL MOVE, 4 DIE, 5 unused / padding**. Slot 5 was an off-by-one threshold where editor UI checks `idx < UBound` routed indices ≥ 5 to custom stances. |
| i32 + pairs | custom stances upper bound (**`i32`**, 4 bytes), then pairs `str animation, str handle` (same serialization order as players and items; legacy C++ had an inverted key/value map read). *Quirk:* Legacy VB and C++ readers read `i16` here, consuming the upper 2 bytes of the count as two empty strings when count is small. |

The **text form** (minor 0) lists name, HP, SMP, FP, DP, run, crits, then a W×H tile grid for the rest image, then 101 special/weakness pairs, AI, program, rewards, programs, 4 blank lines, and 4 stance animations. A reader synthesises a rest `.tbm` and `.anm` from the grid.
---

## 7. Animation

### 7.1 `.anm` (`RPGTLKIT ANIM`)

**Binary (minor must be 3):**

| Type | Field |
|---|---|
| str; i16, i16 | magic; major; minor |
| i32, i32 | width, height (pixels) |
| i32 | frames upper bound |
| per frame: | `str image`, `color transparent`, `str sound` (played when the frame is shown). Frames with an empty image are skipped. |
| f64 | delay: seconds per frame |

A frame image may be an ordinary picture (from `Bitmap/`), a tile reference, or a `.tbm`. Each frame has its **own** transparent colour.

**Text form:** lines `RPGTLKIT ANIM`, major, minor, width, height, frames upper bound, then per frame three lines (image, transparent colour as decimal, sound), then delay.

### 7.2 Animated GIF

Anywhere an `.anm` is accepted, an animated `.gif` in `Misc/` may be used instead. Frame count, size and per-frame delay come from the GIF itself.

---

## 8. Battle data

### 8.1 Special move — `.spc` (`RPGTLKIT SPLMOVE`)

Detection: byte at offset 16 (`0x00` = binary, non-zero = text).

**Binary:**
* Header: `str magic ("RPGTLKIT SPLMOVE")`, `i16 major`, `i16 minor`.
* Fields: `str name`, `i32 damage (FP)`, `i32 smpCost (to user)`, `str program`, `i32 targetSmpDrain`, `i8 usableInBattle`, `i8 usableFromMenu`, `str statusEffect`, `str animation`, `str description`.

The **text form** lists the header `RPGTLKIT SPLMOVE`, major, minor, then the same fields, one per line.

### 8.2 Status effect — `.ste` (`RPGTLKIT STATUSE`)

Detection: byte at offset 16 (`0x00` = binary, non-zero = text).

**Binary:**
* Header: `str magic ("RPGTLKIT STATUSE")`, `i16 major`, `i16 minor`.
* Fields: `str name`, `i16 rounds`, `i16 speedUp`, `i16 slowDown`, `i16 disable`, `i16 hpEnabled`, `i16 hpPerRound`, `i16 smpEnabled`, `i16 smpPerRound`, `i16 runProgram`, `str program`. Negative per-round amounts heal.

The **text form** lists the header `RPGTLKIT STATUSE`, major, minor, then the same fields, one per line.

### 8.3 Battle background — `.bkg` (`RPGTLKIT BKG`)

Detection: byte at offset 12 (`0x00` = binary, non-zero = text).

**Binary:**
* Header: `str magic ("RPGTLKIT BKG")`, `i16 major`, `i16 minor`.
* Fields: `str image`, `str music`, `str menuMoveSound`, `str menuChooseSound`, `str readySound`, `str cantDoSound`.

The **text form** lists the header `RPGTLKIT BKG`, major, minor, then a 19×19 tile grid, then the four sounds and the music, then the 19×19 shade grid. Convert the grid to a `.tbm`.

---

## 9. RPGCode programs — `.prg`

### 9.1 Two encodings

1. **Source text** (normal). Single-byte ANSI text with CR/LF or LF line endings.
2. **Pre-compiled** (rare). The **first byte is `0x00`**. It contains a function-name table, class table and an instruction stream that depend on the legacy engine's internal function list. **Support is optional.** A rebuild can reject these with a clear message ("re-save the source"). If you do implement it, the outline is:
   * NUL-terminated names of the built-in functions used, ending with an empty string.
   * Classes: name; base names (end with ""); members as `name, i32 visibility`; methods as `name, i32 paramCount, u32 entryIndex, i32 visibility` (each list ends with "").
   * Then units: `i32 kind flags` (1 unset, 2 number, 4 string, 8 identifier, 16 call, 32 open-brace, 64 close-brace, 128 end-of-statement, 256 object, 512 label, 1024 plugin call), followed by an f64 for number/brace, a str for string/identifier/label/plugin, or `i32 functionIndex, i32 paramCount` for calls.

### 9.2 Lexical rules (3.1.0)

* **Case-insensitive** keywords and identifiers. Identifiers are `[A-Za-z0-9_]`. They may start with digits (as long as a letter follows) and may have a leading `~` (destructors).
* A trailing `!` (numeric) or `$` (string) on an identifier is a **legacy type sigil and is ignored**: `x!`, `x$` and `x` are the same variable.
* Numbers: decimal, optional fraction, optional exponent (`1e+6`). `true` = 1, `false` = 0, `null` = 0.
* Strings: `"…"`. There are no escape sequences, and a string cannot contain `"`.
* **Statements end at a newline** or `;`. Semicolons are optional.
* **Line continuation:** `_` at the end of a line (optionally followed by a `//` comment).
* Comments: `// …` to end of line; `/* … */` block; legacy `* …` when `*` is the first non-blank character; `** …`.
* A leading `#` on a line is ignored (legacy command prefix). `#include` is the include directive.
* Board **constants** (§4.2) and engine constants are substituted at lex time.

### 9.3 Values and variables

* Dynamic typing: number (double) or string. Mixing in `+` concatenates (`"Hello " + 32` → `"Hello 32"`). Object handles are numbers.
* Variables need no declaration. **Scope defaults to global.** `local(x)` / `global(x)` select scope explicitly. `autoLocal(true)` makes new variables local to the current function or program. `kill(x)` unsets a variable.
* Arrays and maps: `a[0]`, `a[1][2]`, `m["key"]`. Any expression can be an index. Multi-dimensional arrays are allowed. Arrays are sparse.
* Unset variables read as `""` / 0.

### 9.4 Operators

Precedence follows C conventions. Every operator yields a value, including assignments.

* Arithmetic: `+ - * / % ^`(power), unary `-`, `++`/`--` (prefix and postfix).
* Comparison: `== ~= < <= > >=`. **`~=` is "not equal".**
* Logical: `&& || !`, also the words `and`, `or`.
* Bitwise: `& | ` and backtick `` ` `` (XOR), `~` (NOT), `<< >>`.
* Assignment: `= += -= *= /= %= ^= &= |= `=  <<= >>=`.
* Ternary `a ? b : c`. Member access `obj->member` / `obj->method()`.

### 9.5 Statements and control flow

```
if (expr) { … } elseif (expr) { … } else { … }
while (expr) { … }
until (expr) { … }            // loop until expr becomes true
for (init; cond; step) { … }
switch (expr) { case v: { … }  default: { … } }   // no fall-through
function name(a, b, &byRef) { … return expr; }   // "method" is a synonym
inline function f(x) { … }    // hint: expand at call sites
:label                         // label (used by error handling / branch)
```

* `return &var` returns a reference, so a function call can be an assignment target.
* Overloading by **parameter count** is supported.
* `end()` ends the current program. `branch(:label)` jumps.
* A bare identifier on its own line is treated as a zero-argument call (legacy `end` → `end()`).

### 9.6 Modules

* `#include "file.prg"` or `include("file.prg")`. Only functions and classes are imported; loose top-level code in an included file does not run.
* **Implicit include:** `file.func(args)` includes `Prg/file.prg` on first use and then calls `func`.
* `redirect("oldName", "newName")` remaps a function name globally (including built-ins). `killRedirect("name")` and `killAllRedirects()` undo it.

### 9.7 Object orientation

```
class CName : CBase, COther {          // "struct" = class with public default
public:
    method CName(a, b)                 // constructor (overloadable; 1-arg = cast ctor)
    method ~CName()                    // destructor
    method operator+(rhs)              // any operator except -> and .
    method operator[](i)
    method operator=(rhs)              // also copy semantics
    method operator$()                 // conversion to string (or operator! to number; only one)
    method virtualThing() = 0          // pure virtual (class becomes abstract)
private:
    var m_field                        // "var" declares a member inside a class
    m_array[10]                        // fixed-size member array
}
method CName::CName(a, b) { m_field = a; }
obj = CName(1, 2);  obj->method();  obj->release();   // release() runs destructor and frees
```

Inheritance is multiple. Methods are virtual (derived classes override). Objects are reference handles. **Assignment copies by calling `operator=` or a copy constructor if one is defined; otherwise the copy is shallow.** Objects are not garbage-collected: call `release()`.

### 9.8 Error handling

Error handlers work inside functions only:
* `setErrorHandler(:label)`: on a runtime error, jump to the label.
* `setResumeNextHandler()`: ignore errors and continue with the next statement.
* `resumeNext()`: from inside a handler, continue after the failing statement.
* Legacy forms: `on error goto :label`, `on error resume next`.

Errors in nested calls are **not** caught by the caller's handler.

### 9.9 Legacy (pre-3.1, "RPGCode 2") syntax a reader may meet

The 3.1 editor shipped an **update wizard**, so a rebuild should either accept these forms or provide an equivalent converter:

| Legacy form | 3.1 meaning |
|---|---|
| `#Mwin(Hello there)` with unquoted string args | `mwin("Hello there")` |
| `if (x = 5)` (`=` as comparison inside conditions/function args) | `if (x == 5)` |
| unquoted map keys `m[key]` | `m["key"]` |
| `x! = 1`, `name$ = "a"` | sigils ignored |
| loose text lines (no `#`) shown as dialogue | `mwin("…")` |
| `method` / `returnMethod(x)` | `function` / `return x` |
| `* comment` lines | comments |

### 9.10 Engine-provided variables and constants

**Variables** (read and write; "virtual" — backed by engine state):
`playerHandle[i]`, `playerX[i]`, `playerY[i]`, `playerLayer[i]` (party slots 0–4); `boardBackground`, `boardSkill`, `boardTitle[i]`, `constant[i]`, `music`, `threads[i]`; `ambientRed/Green/Blue` (call `forceRedraw()` after assigning); `cnvRenderNow` (overlay canvas handle); `gameTime` (seconds played).

Character stats are ordinary **globals whose names come from the `.tem` file** (§6.1). Changing those globals changes the stats.

**Constants:**

| Name | Value |
|---|---|
| `tkMV_PAUSE_THREAD` | 1 |
| `tkMV_CLEAR_QUEUE` | 2 |
| `tkMV_PATHFIND` | 4 |
| `tkMV_WAYPOINT_PATH` | 8 |
| `tkMV_WAYPOINT_LINK` | 16 |
| `tkVT_SOLID / UNDER / STAIRS / WAYPOINT` | 1 / 2 / 8 / 16 |
| `tkVT_BKGIMAGE / ALL_LAYERS_BELOW / FRAME_INTERSECT` | 1 / 2 / 4 |
| `tkPRG_STEP / KEYPRESS / REPEAT / STOPS_MOVEMENT` | 0 / 1 / 2 / 4 |
| `tkDIR_E, SE, S, SW, W, NW, N, NE` | 1 … 8 |

**Special handles:** `"target"` and `"source"` refer to the entity currently acting or acted upon: the item being talked to, the fighters in a battle move, the sprite that owns the thread. Many sprite functions also accept a party handle (character name), a party index, or a board item slot number.

### 9.11 Built-in function catalogue (3.1.0, ~280 names)

Grouped by capability. Optional parameters are in `[ ]`. Most getters also accept a trailing by-reference output parameter (legacy style).

* **Dialogue & text:** `mwin(text)`, `mwinCls()`, `mwinSize(%)`, `setMwinTranslucency(%)`, `winGraphic`, `winColor(dos)`, `winColorRgb`, `text(x,y,s[,cnv])` (tile-cell units), `pixelText(x,y,s[,cnv])`, `font`, `fontSize`, `bold/italics/underline(bool)`, `color(dos)`, `colorRgb`, `getColor`, `getFontSize`, `getTextWidth/Height`, `textSpeed`, `prompt(question)`, `msgBox(...)`, `print`, `show`(legacy), `staticText`.
* **Input:** `wait()` (returns the key name), `get()` (non-blocking), `mouseClick(&x,&y[,noWait])`, `mouseMove`, `scan/mem`(legacy), `clearBuffer`, `setButton/checkButton/clearButtons` (on-screen buttons), `createCursorMap/cursorMapAdd/cursorMapRun/killCursorMap/cursorMapHand` (keyboard/mouse menu selection), `mouseCursor(...)`.
* **Screen & drawing:** `clear([cnv])`, `bitmap(file[,cnv])`, `setImage*`(normal/transparent/translucent/additive), `drawLine/drawRect/fillRect/drawCircle/fillCircle/setPixel/getPixel`, `saveScreen/restoreScreen/restoreScreenArray`, `fade(type)`, `wipe(file,effect[,speed])`, `zoom(%)`, `earthquake(intensity)`, `borderColor`, `forceRedraw()`, `renderNow(bool)`, `viewBrd(file[,x,y[,cnv]])`, `getRes`, `getCorner`, `drawEnemy`.
* **Canvases (off-screen surfaces):** `createCanvas/killCanvas/drawCanvas/drawCanvasTransparent/canvasDrawPart/canvasGetScreen`.
* **Board:** `send(board,x,y[,layer])`, `getBoardName`, `put/layerPut(x,y,[layer,]tile)`, `getBoardTile/boardGetTile`, `getBoardTileType`, `tileType(x,y,type[,layer])`, `animatedTiles()`, `parallax(setting)`, `setAmbientLevel(r,g,b)`, `boardGet/SetVector`, `boardGet/SetVectorPoint`, `boardGet/SetProgram`, `boardGet/SetProgramPoint`, `prg(...)`(legacy place program), `setConstants`.
* **Party & players:** `addPlayer(file)`, `removePlayer`, `newPlayer(file)` (swap graphics), `activePlayer([handle])`, `putPlayer/erasePlayer/destroyPlayer/restorePlayer`, `callPlayerSwap`, `playerLocation`, `playerDirection`, `playerSpeed`, `playerStance`, `characterSpeed/walkSpeed`(legacy).
* **Items & NPCs (board sprites):** `createItem(file)`, `destroyItem`, `putItem(h,x,y,layer)`, `eraseItem`, `itemLocation`, `itemDirection`, `itemSpeed`, `itemStance`, `itemCount`, `onBoard`, `spriteTranslucency(%)`.
* **Movement:** `push(dirs[,h[,flags]])` (e.g. `"N,N,E"`), `pushItem`, `playerStep/itemStep(h,x,y[,flags])`, `playerPath/itemPath(h,flags,…)` (explicit points, pathfind, waypoint path/link), `playerGetPath/itemGetPath`, `wander(h[,restrict])`, `pathFind`(legacy), `smartStep`, `pixelMovement([bool[,push]])`, `gameSpeed(n)`, `move`(legacy), `stance/posture`(legacy).
* **Stats & progression:** `hp/getHp/giveHp`, `maxHp/getMaxHp`, `smp/getSmp/giveSmp`, `maxSmp/getMaxSmp`, `getDp/getFp`, `getLevel`, `giveExp`, `giveGp/takeGp/getGp`, `inn()` (full restore).
* **Inventory & equipment:** `giveItem/takeItem`, `equip(h,slot,item)`, `remove(h,slot)`, `getItemName/Desc/Cost/SellPrice`, `callShop(item1, …)`.
* **Battle:** `fight(skill,bkg)`, `fightEnemy(e1, …, bkg)`, `attackAll(fp)`, `drainAll(fp)`, `ai(level)`, `applyStatus/removeStatus`, `fightMenuGraphic`, `menuGraphic`, `internalMenu(n)`, `fightStyle/battleSpeed`(legacy), `sourceHandle/targetHandle`, `sourceLocation/targetLocation`.
* **Audio & video:** `mediaPlay(file)` (looping music), `mediaStop`, `wav(file)` / `sound` (effect), `wavStop`, `mp3pause`, `setVolume(%)`, `playAvi/playAviSmall`. Legacy aliases: `midiPlay/playMidi/midiRest/mediaRest/mp3`.
* **Animations:** `animation(file,x,y[,persist])`, `sizedAnimation(...)`, `endAnimation(id)`.
* **Program flow & threads:** `run(prg)`, `change(prg)`, `rpgCode(line)`, `multiRun(){…}` (run movements concurrently), `delay(sec)`, `end/done/stop`, `thread(file,persist)`, `killThread`, `getThreadId`, `threadSleep`, `threadWake`, `threadSleepRemaining`, `tellThread(id,code)`, `branch`, `autoCommand`(legacy), `debug`, `debugger(msg)`.
* **Game state:** `save(file)`, `load(file)`, `dirSav(...)` (save/load picker), `reset()`, `start(file)`, `mainFile(gam)`, `win`/`gone`/`over` (game over / end), `godos/dos/windows`(obsolete).
* **Strings & math:** `len/length`, `left/right/mid`, `inStr`, `replace`, `regExpReplace`, `split(str,delim,arr)`, `trim`, `lcase/ucase`, `asc/chr`, `charAt`, `castNum/castInt/castLit`, `spliceVariables` (expand `<var>` in text), `random(max)`, `sin/cos/tan/sqrt/log`, `iif(c,a,b)`, `getTickCount`.
* **Files (in game folders):** `openFileInput/Output/Append/Binary(file,folder)`, `closeFile`, `fileInput/filePrint`, `fileGet/filePut`, `fileEof`, `appPath`.
* **Scope:** `local`, `global`, `autoLocal`, `kill`.

Calls to names that no built-in or script function defines are offered to **RPGCode plugins** (engine doc §9).

---

## 10. Media and assets

| Kind | Formats seen/accepted | Where |
|---|---|---|
| Images (game files) | PNG and JPEG are decoded (§10.2, §10.3); BMP and GIF are still owed a reader (§10.4) | `Bitmap/`, `Misc/` |
| Music | MIDI (`.mid`) is dominant; also MP3, OGG, WAV and tracker modules through the audio library | `Media/` |
| Sound effects | WAV, MP3, OGG | `Media/` |
| Video | AVI (Windows media pipeline) | `Media/` |
| Fonts | TrueType `.ttf`, registered for the game's lifetime | `Font/` |

Images are matched by **colour-key transparency** (per frame or image), not alpha, so the key is stored with whatever references the image and is never part of the image file itself. A rebuild should still keep alpha in PNGs. An animated GIF stands in for an `.anm` wherever one is accepted (§7.2).

### 10.1 Decoding an image

A game image is turned into pixels in one place, with one result, so that the rasteriser, every runner and the editor cannot disagree about what an image contains. The reader's result is **straight** (non-premultiplied) 8-bit RGBA of exactly `width × height × 4` bytes in row-major order, top row first: the file's own colours and its own alpha, nothing added. Because the colour key is not in the file (above), the reader never applies one; the key is tested against these decoded pixels by whatever blits the image.

The image kind is chosen by **signature**: PNG `89 50 4E 47 0D 0A 1A 0A`, JPEG `FF D8 FF` (§10.2, §10.3). Any other signature is an error at offset 0. Every defect is a located error carrying the file's path, the offending byte offset and the section `format-spec §10` — never a throw and never a plausible wrong picture.

Both readers refuse a zero dimension, and both refuse an image of more than **100,000,000 pixels**: `width × height` is untrusted input, so past that limit the allocation is not attempted and the file is refused instead. The limit is far above any game asset (the largest image in the legacy sample games is 640×480).

### 10.2 PNG

**Structure.** The 8-byte signature above, then chunks of `u32 length` (big-endian), a 4-byte type, `length` data bytes and a `u32` CRC-32. The CRC is the standard reflected polynomial `0xEDB88320` over the type **and** data, and every chunk's CRC is checked: a flipped bit is a located error, not a wrong colour. A length that runs past the end of the file is refused. `IHDR` must be the first chunk and is read on its own, so a wrong payload length (the spec fixes 13 bytes) is reported as that rather than as a malformed walk later. `IEND` must be the last chunk: the walk stops there, anything after it is ignored, and a chunk stream that ends without `IEND` is an error. The structure is then checked: `IHDR` appears exactly once, `PLTE` and `tRNS` come before the first `IDAT`, and an unknown **critical** chunk (first letter uppercase) is refused; unknown ancillary chunks are skipped.

**`IHDR`.** Width and height are big-endian `u32` and neither may be 0. Bit depth and colour type must be a pairing the spec defines:

| Colour type | Meaning | Permitted bit depths |
|---|---|---|
| 0 | greyscale | 1, 2, 4, 8, 16 |
| 2 | truecolour | 8, 16 |
| 3 | palette | 1, 2, 4, 8 |
| 4 | greyscale + alpha | 8, 16 |
| 6 | truecolour + alpha | 8, 16 |

Compression method must be 0, filter method must be 0, and the interlace byte must be 0 or 1; any other value, an unlisted colour type, or a colour type paired with a depth the table does not give is refused at that `IHDR` field.

**`IDAT`.** Every `IDAT` chunk's data, concatenated, is one zlib stream (the first `IDAT` is required). The header fixes the exact inflated size — for each pass, `height × (1 + ceil(width × channels × depth / 8))` — so the stream is inflated into a buffer of that size and cannot allocate past the declared layout; the output is measured against the header and a stream that inflates short or long, is not a valid zlib stream, or is so small that no deflate stream of its length could produce the declared output (deflate expands at most 1032:1, plus a little slack for framing) is refused at the first `IDAT` payload.

**Filters.** Each scanline is prefixed by its filter-type byte and the filters are undone in place, with `bpp = ceil(channels × depth / 8)` and the previous scanline all zeros for the first row of each pass:

| Type | Filter | Reconstruction (`x` = byte, `a` = left, `b` = above, `c` = above-left) |
|---|---|---|
| 0 | None | `x` |
| 1 | Sub | `x + a` |
| 2 | Up | `x + b` |
| 3 | Average | `x + floor((a + b) / 2)` |
| 4 | Paeth | `x + Paeth(a, b, c)` |

`Paeth(a, b, c)` picks `a`, `b` or `c` by the smallest of `|a + b − c − a|`, `|a + b − c − b|`, `|a + b − c − c|`, ties going to `a` then `b`, all in exact integers. Any filter byte above 4 is refused.

**Adam7.** With interlace byte 1 the image is seven passes, each `[x0, y0, dx, dy]`: `(0,0,8,8)`, `(4,0,8,8)`, `(0,4,4,8)`, `(2,0,4,4)`, `(0,2,2,4)`, `(1,0,2,2)`, `(0,1,1,2)`. A pass is `ceil((width − x0) / dx) × ceil((height − y0) / dy)` and an empty pass is omitted. Interlace byte 0 is one pass over the whole image. Each pass's scanlines filter against the previous scanline of that pass.

**Palette and `tRNS`.** `PLTE` is 1–256 whole RGB triples (3–768 bytes), is required for colour type 3, and may hold no more entries than the bit depth can select (`2^depth`); a pixel whose index falls outside the palette is a located error. `tRNS` is byte-per-entry alpha for colour type 3 (never more bytes than palette entries; an entry with no `tRNS` byte is opaque), a single 2-byte greyscale or 6-byte RGB colour key for colour types 0 and 2 (a pixel equal to the key gets alpha 0, the rest 255), and is ignored for colour types 4 and 6, whose alpha is in the pixels. Elsewhere, alpha is 255.

**Bit-depth scaling.** Sub-byte samples (depths 1, 2, 4) are read MSB-first within each byte and widened by the exact factor that maps their maximum to 255 — ×255, ×85, ×17. Depth 8 passes through. Depth 16 is reduced by `floor(v / 257)`, the exact inverse of the spec's `v × 257`, so 65535 maps to 255 without rounding error. A palette index is a sample, not a channel value, and is not scaled.

Errors found in the inflated bytes (an unknown filter type, a palette index outside `PLTE`) are reported at the offset of the first `IDAT` payload, which is where those bytes come from; header errors point at the header field.

### 10.3 JPEG

The reader covers the **baseline sequential DCT** process (`SOF0`) and the **8-bit extended sequential** process (`SOF1`), which share one decoding path, and nothing else. One frame: sample precision 8; one component (greyscale) or three (YCbCr); per-component sampling factors 1×1 to 4×4 (the legacy sample files are 4:2:0); Huffman-coded entropy data with optional restart intervals; quantisation tables of 8 or 16 bits; dequantisation; a separable inverse DCT per 8×8 block, level-shifted by +128, rounded and clamped; chroma upsampled to full resolution by nearest neighbour; YCbCr→RGB. JPEG carries no alpha, so every decoded pixel has alpha 255 and any transparency is the per-image colour key of §10.

**Marker walk.** `FF D8` (SOI), then `FF`-prefixed segments; a 2-byte big-endian length follows each marker and includes itself; `FF D9` (EOI) ends the walk and `FF 01` (TEM) and stray restart markers between segments are skipped. Handled: `DQT` (quantisation tables, ids 0–3, 8- or 16-bit entries in zig-zag order), `DHT` (canonical Huffman tables, T.81 Annex F), `DRI` (restart interval; length must be 4), `SOF0`/`SOF1`, `SOS`, and `APP14`: where its identifier is `Adobe`, the transform byte 0 means the three components are already R, G and B, and anything else — or no `APP14` — is YCbCr. Inside the entropy-coded data, `FF 00` is a stuffed data byte and `FF D0`–`FF D7` are restart markers, before which any repeated `FF` fill bytes are skipped and after which the DC predictors reset.

**Boundary — refused, each a located error, never a wrong picture.** Progressive (`SOF2`) and every other frame marker type; a sample precision other than 8; a component count other than 1 or 3 (so CMYK/YCCK is out); a scan that is not baseline sequential (`Ss = 0`, `Se = 63`, `Ah = Al = 0`); more than 100,000,000 pixels or a zero dimension; a DC difference category above 11; an invalid Huffman code; an AC coefficient index past 63; an entropy stream that ends before the last MCU (a truncated file); a scan naming a component or Huffman/quantisation table the file does not define, or naming one twice; a component defined twice in the frame; a frame component that no scan decoded; a file with no `SOF0`/`SOF1` frame or no `SOS`. A bare `FF D8 FF` file is reported as too short.

**Determinism.** The inverse-DCT basis is stored as literal double constants, never computed from `Math.cos`/`Math.PI`, and the transform runs rows then columns in a fixed order over add, subtract and multiply, so the same bytes give the same pixels on every JavaScript engine.

### 10.4 The image kinds: what is decoded and what is dropped

Archive use counted on 2026-10-11 inside the game and tool archives and across the 2,047 archived `.prg` scripts (the six TK2-era games, 25 archived community games, the community zip corpus and the site mirrors):

| Kind | Archive use | Ruling |
|---|---|---|
| **PNG** | 97 files in the 25 community games, one in the shipped sample game; 187 script references | **Decoded** (§10.2) |
| **JPEG** | 340 files in the 25 community games, 58 in four of the six TK2 games; 99 script references | **Decoded** (§10.3) |
| **BMP** | 178 files in the 25 community games, 18 in four of the six TK2 games; 271 script references; one of the board-image export targets (T-32) | **Owed a reader.** It is the dominant TK2-era picture format, so a reader belongs beside the PNG and JPEG ones, chosen by the `BM` signature |
| **GIF** | 520 files in the 25 community games, 58 in four of the six TK2 games; 232 script references | **Owed a reader**, and not only for a still frame: §7.2 lets an animated GIF replace an `.anm`, so the reader must yield every frame and its delay |
| **ICO** | 10 files in the whole archive, every one an application or site icon (three of the Toolkit's own icons in two archives, one utility's icon in two uploads, one community game's icon); none in the six TK2 games, no script reference | **Dropped as a game format.** The only mention is the editor's image-import list (T-36). If that feature ever needs it, an ICO is a container of BMP or PNG images and belongs to the editor's import path, not to a game-image reader |
| **WMF** | 0 files anywhere in the archive, no script reference | **Dropped.** The only mention is T-36's import list; no game file is a Windows metafile |

The legacy Windows image library loaded more kinds than the rebuild does. The rebuild reads PNG and JPEG as §10.2 and §10.3 state, adds BMP and GIF readers as above, and refuses anything else with a located error rather than approximating a picture; ICO and WMF are not game formats and need no reader.

---

## 11. Saved game — `.sav` (`RPGTLKIT SAVE`, major 3, minor 4 for 3.1.0)

The engine writes the whole game state. A rebuild may use its own save format. To **load legacy saves**, the content is, in order:
1. Globals, split into three lists (numeric: `name,f64`; object handles: `name,f64`; strings: `name,str`), each with an `i32` count.
2. Redirects (`i32` count, then name pairs).
3. Party: `i32` count, then `name, file` per member.
4. Inventory (`i16` count; `file, handle, quantity`), equipment per slot, equipment stat modifiers.
5. Misc: selected player, gold, message-window colour and background, fonts and styles, game time, steps (in tiles), main-file name, current board.
6. Per party member: pixel x, y, layer, active flag, waypoint-link state (vector index, cycles, next node, flags), level progress.
7. Menu graphics, swapped-graphics file.
8. **All board items** with their live positions and activation data. Items are restored from the save, not from the board.
9. Threads: file, persistent flag, owning item, sleep state, and (minor ≥ 4) a serialised interpreter state.
10. Movement mode, OOP object table, game-speed offset.

The serialised interpreter state is engine-specific. A rebuild can fall back to restarting each thread from the top.

---

## 12. Plugins (binary, not portable)

Legacy plugins are native Windows libraries (`Plugin/*.dll`) of three kinds: **RPGCode extension**, **menu**, **battle**. They cannot be loaded by a cross-platform rebuild. The main file lists them by name only. Treat each named plugin as a **capability the rebuild must supply natively**. The default menu and battle systems are the two important ones (engine doc §8–9).

---

## 13. Packaging

* **PakFile `.tpk`:** a standard ZIP archive with the project folder plus `main.gam`. When playing from a pak, ignore the main file's `projectPath`.
* **Standalone EXE:** an engine executable with a ZIP appended. Its **last 12 bytes** are a trailer:
  * `[end - 12 .. end - 9]`: ASCII string `CMP1` (4 bytes: `0x43 0x4D 0x50 0x31`).
  * `[end - 8 .. end - 5]`: `i32 offsetOfZip` (4 bytes, **little-endian**). This is the original executable length and marks the starting byte offset of the appended ZIP archive.
  * `[end - 4 .. end - 1]`: `i32 zipLength` (4 bytes, **little-endian**). This is the exact byte length of the appended ZIP archive.
  Extracting `[offsetOfZip, offsetOfZip + zipLength)` yields the clean game ZIP. A rebuild can import legacy standalone games this way.
* **Setup ZIP:** a plain ZIP of the `Main/` and `Game/` folders.
* **Distribution package (this project's own):** a `.tpk`-compatible ZIP that also holds a `manifest.json` at the archive root, next to the game files. The manifest is UTF-8 JSON with exactly three fields:
  * `schema`: a non-negative integer, the project schema version.
  * `main`: the in-package path of the main file, for example `Main/demo.gam`. It must name a game file in the archive and must not be `manifest.json` itself.
  * `index`: the in-package path of every game file except `manifest.json`, each listed once.
  Paths use `/` and follow §1.5 (matching ignores case and treats `\` as `/`). A reader checks that `main` and every `index` entry name a file in the archive and that no game file is missing from `index`, and it refuses a manifest with any other field. A legacy package has no manifest and loads without one; only packages this project writes are required to carry it.

---

## 14. Known ambiguities / test checklist

* The order of `speed`/`idleTime` differs between `.tem` (idle, then speed) and `.itm` (speed, then idle).
* Custom stances are serialized on disk as `str animation, str handle` across `.tem`, `.itm`, and `.ene`. (Legacy C++ inverted the key/value map read in `.ene` only).
* In `.ene`, custom stances count is an `i32` on disk, while standard stances upper bound is `5` (yielding 6 slots 0..5, where slot 5 is an unused editor boundary slot).
* In `.tem`, body slots are 7 bytes on disk: byte 0 is padding (0), followed by 6 body slots (1 head through 6 legs). Setting `maxLevel == 0` disables leveling entirely.
* In `.tem` and `.itm`, the vector bases count field is an upper bound stored as `1` (indicating 2 bases: collision base, then activation base).
* In `.brd`, the `closed` field is non-zero (specifically `-1` from legacy VB `CInt(True)`) for closed polygons and `0` for open polylines.
* In `.brd`, coordinate types are bitmask flags: `0` = 2D, `1` = iso stacked, `2` = iso rotated, `4` = pixel absolute. Isometric detection is `(coordType & 1) || (coordType & 2)`.
* Battle formats (`.bkg`, `.spc`, `.ste`) all share standard binary headers: `str magic, i16 major, i16 minor`, with binary detection at byte 12 (`.bkg`) or byte 16 (`.spc`, `.ste`).
* Standalone EXE appended ZIP trailer (`CMP1`) stores `offsetOfZip` and `zipLength` as little-endian 32-bit integers (`i32`).
* Main file layout (`.gam`): `<root>/Main/<game>.gam` is separate from project assets in `<root>/Game/<project>/`. The engine requires `.gam` to boot.
* Tile bitmaps store an extra padding row and column.
* The `fightingDisabled` flag in `.gam` is inverted.
* Shade-layer run records always carry an explicit count. The tile matrix uses negative counts.
* Tile LUT index 0 is reserved for "no tile".
* Inline-RPGCode fallback for program/sprite program fields applies when the file is missing.
* Validate against `build/main/demo.gam` and project assets in `build/game/demo` and `build/game/Basic` from the legacy repo.
