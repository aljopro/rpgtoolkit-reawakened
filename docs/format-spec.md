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
| `i16` | 2 bytes | signed integer (the legacy "Integer"/"short") |
| `i32` | 4 bytes | signed integer (the legacy "Long"/"int") |
| `f64` | 8 bytes | IEEE‑754 double |
| `str` | variable | **NUL-terminated** single-byte string in the Windows ANSI code page (assume Windows‑1252). No length prefix. An empty string is a single `0x00`. |
| `color` | 4 bytes (`i32`) | Windows COLORREF: `0x00BBGGRR` (red in the low byte) |

Booleans are stored as `i16` or `i8`: zero = false, any non-zero = true. Some VB-era writers stored true as `-1`.

### 1.2 The "upper bound" count convention

Most repeated sections start with an **upper bound**, not a count. A value `n` means the entries are indexed `0..n`, so there are **`n + 1` entries**. A value of **`-1` means none**. Where a format uses a true count, this spec says so.

### 1.3 Header strings and binary vs. text detection

Every Toolkit data file starts with an ASCII magic string such as `RPGTLKIT BOARD`. In the binary (3.x) layouts the magic is written as a `str`, so it is followed by a `0x00`. Older (2.x-era) versions of several formats were **line-oriented text** with the same magic as their first line.

**Detection rule:** look at the byte at offset `len(magic)`. If it is `0x00` the file is binary; otherwise it is text (the byte is a CR/LF). Readers must support the binary forms. Text forms are needed only for very old projects, and the 3.x engine refused some of them anyway (see each format).

### 1.4 Version fields

Binary files store `i16 major`, `i16 minor` right after the magic. For 3.x files `major` is `3` (sometimes `2` on files carried over from 2.x). **`minor` selects the layout.** All conditional fields below are keyed on `minor`.

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

---

## 2. Main file — `.gam` (`RPGTLKIT MAIN`)

One per game. It holds global settings and the startup sequence. Binary only.

| # | Type | Field | Notes |
|---|---|---|---|
| 1 | str | magic `RPGTLKIT MAIN` | |
| 2 | i16, i16 | major, minor | layouts below key on minor (0–9 observed; 9 = 3.1.0) |
| 3 | i32 | reserved | ignore (old registration flag) |
| 4 | str | reserved | ignore (old registration code) |
| 5 | str | **projectPath** | folder under `Game/`. Ignore it when the game is loaded from a package (§13). |
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
| i16 | tileCount | number of tiles |
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

**16×16 tiles** are upscaled to 32×32 by pixel doubling before use.

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

**Tile lookup table (LUT)**

| Type | Field |
|---|---|
| i16 | lutUpperBound |
| str × (lutUpperBound + 1) | tile references. **Index 0 is always the "no tile" entry (empty string).** Unused slots may be empty. |

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
| per vector: | `i16 points upper bound`, points as `i32 x, i32 y`; `i16 attributes`; `i16 closed` (0/1); `i16 layer`; `i16 type`; `str handle` |

`type` and `attributes`: see §4.4.

**Programs** (trigger regions)

| Type | Field |
|---|---|
| i16 | programs upper bound (−1 = none) |
| per program: | `str program`, `str graphic` (unused), `str initialVar`, `str initialValue`, `str finalVar`, `str finalValue`, `i16 activate` (0 = always, 1 = conditional), `i16 activationType` (flags; §4.4), `i16 repeatDistance` (pixels), `i16 layer`, `i16 points upper bound` then points as `i32 x, i32 y`, `i16 closed`, `str handle` (reserved) |

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
| i16, str | reserved (registration) |
| i16 × 3 | sizeX, sizeY, sizeL |
| i16 × 3 | startX, startY, startLayer (**tiles**) |
| i16 | disableSaving |
| i16, str… | LUT as in §4.2 |
| tile matrix | each cell is either `i16 index, i16 r, i16 g, i16 b, i8 tileType` or a run: `i16 −count, i16 index, i16 r, i16 g, i16 b, i8 tileType`. Order is z, y, x. |
| str | background image (treat as parallax) |
| str, str | foreground image, border image (unused) |
| i32 | background colour |
| i32 | border colour (unused) |
| i16 | ambient preset: 0 none, 1 "mist" (+75,+75,+75), 2 "dark" (−75,−75,−75), 3 "water" (0,0,+75) |
| str × 4 | links N, S, E, W |
| i16 | battleSkill |
| str | battleBackground |
| i16 | allowBattles |
| i16 × 3, str | day/night fields (unused) |
| i16 × 11 | constants 0…10 (numeric) |
| str | background music |
| str × 9 | layer titles 0…8 |
| i16 | programs upper bound, then per program: `str file, i16 x, i16 y, i16 layer, str graphic, i16 activate, str initialVar, str finalVar, str initialValue, str finalValue, i16 activationType`. **Old programs always behave as "stops movement".** Strip legacy `!`/`$` suffixes from variable names. |
| str, str | enterPrg, reserved |
| i16 | sprites upper bound, then per sprite: `str file, i16 x, i16 y, i16 layer, i16 activate, str initialVar, str finalVar, str initialValue, str finalValue, i16 activationType, str activationPrg, str multitaskPrg`. Loading condition = the activation condition. |
| *(minor ≥ 3)* i32, str… | threads (upper bound, then names) |
| *(minor ≥ 3)* i8 | coordType |

**Conversion rules**
* Per layer, merge adjacent tiles of the same tile type into polygons and emit vectors. Passages (types 3/4) become **open** solid polylines along the blocking edges. Stairs become stair vectors with the target layer. Under becomes an under vector with "include background".
* Each program at a tile becomes a closed vector around that tile.
* The per-tile RGB values become one shade layer. Its cast layer is the highest layer that had non-zero shading.
* Convert the start point and sprite positions from tile to pixel coordinates (§5) with the base point added.

---

## 5. Coordinate systems

The `coordType` flags: **0** = 2D top-down; **1** = isometric "stacked" (staggered columns); **2** = isometric "rotated" (axes turned 45°); **4** = "pixel absolute" (object coordinates in scripts are pixels; may be combined with 0/1/2). Tile indices are always **1-based**.

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
| str × 9 | **script variable names** bound to: experience, DP, FP, HP, max HP, name, SMP, max SMP, level. Strip trailing `!`/`$`. |
| i32 × 8 | initial experience, HP, maxHP, DP, FP, SMP, maxSMP, level |
| str | profile picture (portrait image or tile) |
| 201 × { str moveFile, i32 minExp, i32 minLevel, str condVar, str condValue } | special-move list with learn conditions |
| str | special-move category name (e.g. "Magic") |
| i8 | hasSpecialMoves (**0 = yes**, 1 = no) |
| str × 11 | accessory slot names |
| i8 × 7 | body slots in use (0/1): head, neck, left hand, right hand, body, legs, … |
| *(minor = 3)* i8 / *(else)* i32 | initial experience needed for the first level-up |
| i16 | experience increase (% if exponential, points if linear) |
| i32 | max level |
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
| *(minor ≥ 8)* i16 | number of vector bases (2) |
| *(minor ≥ 8)* | collision base: `i16 points upper bound`, points `i32 x, i32 y`; then the activation base in the same form (both closed) |

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
| *(minor ≥ 5)* str × 8, f64, f64 | idle animations, then **speed, idleTime** (note: the opposite order from characters) |
| *(minor < 6)* | the legacy rest animation becomes the idle-South animation |
| *(minor ≥ 4)* i32 + pairs | custom stances as for characters |
| *(minor ≥ 7)* | vector bases as for characters |
| *(minor < 4)* str × 16 × 2, str × 2 | legacy two-tile-tall walk frames (4 per direction S, E, N, W, each frame = top & bottom tile) and two rest tiles. A reader synthesises 1×2 tile bitmaps and 4-frame animations (frame delay 0.167 s) from these. |

### 6.3 Enemy — `.ene` (`RPGTLKIT ENEMY`)

Detection: byte at offset 14.

| Type | Field |
|---|---|
| str; i16, i16 | magic; major; minor |
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
| i16 + str… | stance animations by index: 0 REST, 1 FIGHT, 2 DEFEND, 3 SPECIAL, 4 DIE |
| i16 + pairs | custom stances: `str handle, str animation` (**handle first**, the opposite of players and items) |

The **text form** (older) lists name, HP, SMP, FP, DP, run, crits, then a W×H tile grid for the rest image, then 101 special/weakness pairs, AI, program, rewards, programs, 4 blank lines, and 4 stance animations. A reader synthesises a rest `.tbm` and `.anm` from the grid.

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

Detection: offset 16. Binary: `str name, i32 damage (FP), i32 smpCost (to user), str program, i32 targetSmpDrain, i8 usableInBattle, i8 usableFromMenu, str statusEffect, str animation, str description`. The text form has the same fields, one per line.

### 8.2 Status effect — `.ste` (`RPGTLKIT STATUSE`)

Detection: offset 16. Binary: `str name, i16 rounds, i16 speedUp, i16 slowDown, i16 disable, i16 hpEnabled, i16 hpPerRound, i16 smpEnabled, i16 smpPerRound, i16 runProgram, str program`. Negative per-round amounts heal. The text form has the same fields, one per line.

### 8.3 Battle background — `.bkg` (`RPGTLKIT BKG`)

Detection: offset 12. Binary: `str image, str music, str menuMoveSound, str menuChooseSound, str readySound, str cantDoSound`.
The text form is a 19×19 tile grid, then the four sounds and the music, then the 19×19 shade grid. Convert the grid to a `.tbm`.

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
| Images | BMP, PNG, JPEG, GIF (incl. animated), ICO/WMF (import); anything the legacy image library loaded | `Bitmap/`, `Misc/` |
| Music | MIDI (`.mid`) is dominant; also MP3, OGG, WAV and tracker modules through the audio library | `Media/` |
| Sound effects | WAV, MP3, OGG | `Media/` |
| Video | AVI (Windows media pipeline) | `Media/` |
| Fonts | TrueType `.ttf`, registered for the game's lifetime | `Font/` |

Images are matched by **colour-key transparency** (per frame or image), not alpha. A rebuild should still keep alpha in PNGs.

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
* **Standalone EXE:** an engine executable with a ZIP appended. Its **last 12 bytes** are a trailer: ASCII `CMP1`, `i32 offsetOfZip` (the original executable length), `i32 zipLength`. Extracting `[offset, offset+length)` gives the game ZIP. A rebuild can import legacy standalone games this way.
* **Setup ZIP:** a plain ZIP of the `Main/` and `Game/` folders.

---

## 14. Known ambiguities / test checklist

* The order of `speed`/`idleTime` differs between `.tem` (idle, then speed) and `.itm` (speed, then idle).
* Enemy custom stances store the handle first. Player and item custom stances store the animation first.
* Tile bitmaps store an extra padding row and column.
* The `fightingDisabled` flag in `.gam` is inverted.
* Shade-layer run records always carry an explicit count. The tile matrix uses negative counts.
* Tile LUT index 0 is reserved for "no tile".
* Inline-RPGCode fallback for program/sprite program fields applies when the file is missing.
* Validate against `build/game/demo` and `build/game/Basic` from the legacy repo: they contain one of each common format.
