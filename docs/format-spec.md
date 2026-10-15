> **Superseded.** [`docs/spec/`](spec/README.md) is the normative specification of what Toolkit 3.1 does, and this file no longer is ([ADR 0007](adr/0007-docs-spec-is-the-normative-specification.md)). It is frozen: nothing is added here. Its body stays until entry 3.28 re-points every citation and deletes it, because some content (the Toolkit 2 section and its corpus evidence, the pre-vector and package rulings) has not yet moved to `docs/spec/`. Its section numbers stay valid for the citations that still use them.

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

Most repeated sections start with an **upper bound**, not a count. The bound is an `i16` unless the section says otherwise (the custom-stance lists in §6.1, §6.2 and §6.3 use an `i32`). A value `n` means the entries are indexed `0..n`, so there are **`n + 1` entries**. A value of **`-1` means none**; no other negative value is valid, and a reader reports one as an error. A reader must also check `n` against the bytes that remain rather than trusting it, so that a damaged or untrusted file cannot make it read past the end or reserve a huge block up front. Where a format uses a true count, this spec says so. "None" is not the same as an empty entry: a board's tile lookup table, for example, reserves its index 0 for the empty "no tile" reference (§4.2), which is a real entry that keeps later indices stable — the table is absent entirely only when its `lutUpperBound` is `-1`.

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
* **What the fold is.** Rewrite `\` as `/`, then fold `A`–`Z` to `a`–`z` and leave **every other code point exactly as it is**. A name containing `U+212A` (KELVIN SIGN) keeps that character and is a **different** name from the same name written with ASCII `k`; `U+0130` (LATIN CAPITAL LETTER I WITH DOT ABOVE) stays one code point instead of becoming `i` followed by `U+0307`. The same fold covers everything else these sections make case-insensitive for the same reason: a leading type-folder prefix, the `Game` first segment of a stored project path, and a three-character extension (§1.6). A reference and an index entry match when their folded forms are equal; two index entries with one folded form are one file to a reader, and a package holding such a pair is refused as ambiguous (§13, L10).
* **Why the fold stops at ASCII.** The legacy platform's own fold is its **upper**-case table, in which `U+212A` maps to itself: a Unicode *lower*-case fold is therefore not the legacy behaviour — it merges two names Windows kept apart — and it also expands some code points into several. A full Unicode fold further depends on the runtime's Unicode tables, so two runners could key one project differently and disagree on a save hash (guard-rail G3), and folding bytes above `0x7F` would rest on the *assumed* Windows‑1252 decode of §1.1.
* *Consequence:* a reference that differs from the stored name only in the case of a letter above `0x7F` (`Café.brd` for `CAFÉ.BRD`) resolved on the legacy platform and does not here; it is reported as a missing asset, never as a different file. No reference in the sample corpus needs such a match — all 161 file references match the stored spelling exactly and no stored string is non-ASCII — and a pinned non-ASCII table can be added by ADR if a real game needs one.
<!-- OWNER: chose an ASCII-only fold over a full-Unicode fold because the legacy fold is the upper-case table (U+212A maps to itself, so Unicode lower-casing invents a collision Windows never had), because G3 wants one fold on every runner, and because folding bytes above 0x7F rests on an assumed code page. Revisit if the corpus ever ships a non-ASCII path. -->
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

One per game. It holds global settings and the startup sequence. The rows below are the binary (3.x) layout; the 2.x era also wrote a **text** form, documented in §15.2. Two of the rows below carried a four-byte reserved field in the 3.x layout where the 2.x minor-2 files carry a two-byte one; both rows are marked, and §15.14 has the evidence.

The table below details all **43 logical rows** across the file's lifetime, including the **12 version-dependent fields** controlled by `minor`. Every row carries a unique number 1–43 in storage order, so a citation like "row 29" names exactly one row (the version-dependent summary below uses the same numbering):
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
| 10 | i16 | *(minor < 3 only)* reserved | old parallax value; ignore. **`i16`, not `i32`** — the 2.x minor-2 files only close with a two-byte field (§15.14, `GAMB`). |
| 11 | i16 | disableProtectReg | obsolete |
| 12 | str | languageFile | obsolete |
| 13 | str | **startupPrg** | program run at boot (required in practice) |
| 14 | str | **initBoard** | first board; may be empty if the start program sends the player somewhere |
| 15 | str | **initChar** | first player character (`.tem`); may be empty if the start program adds one |
| 16 | str | runTimePrg | program bound to the run-time key |
| 17 | i16 | runTimeKey | **ASCII code** of the key (uppercase letter/digit) |
| 18 | i16 | menuKey | ASCII code of the key that opens the menu |
| 19 | i16 | activationKey | ASCII code of the general "interact" key |
| 20 | i16 | extKeys upper bound | then per entry: `i16 asciiKey`, `str program`. Extra run-time keys (up to 50). Skip entries with an empty program. |
| 21 | | *(minor ≥ 3)* `str menuPlugin`, `str fightPlugin` | *(minor < 3)* `i16` reserved; defaults are the stock menu and battle plugins. **`i16`, not `i32`** (§15.14, `GAMB`). |
| 22 | | *(minor ≤ 2)* `i32`, `i16` reserved | multitask speed and memory protection; ignore |
| 23 | i16 | fightingDisabled | **inverted flag: 0 = fighting enabled**, non-zero = disabled |
| 24 | i16 | enemy list upper bound | then per entry: `str enemyFile`, `i16 skillLevel` (random-encounter pool) |
| 25 | i16 | fightType | 0 = random (1-in-*chances* per check), 1 = planned (every *chances* tiles) |
| 26 | i32 | chances | |
| 27 | i16 | useCustomFightPrg | 0/1 |
| 28 | str | customFightPrg | RPGCode run instead of the built-in battle |
| 29 | | *(minor < 3)* `i16` reserved | old fight style; ignore |
| 30 | str | gameOverPrg | run when the party is defeated |
| 31 | str | skinButton | legacy UI skin image |
| 32 | str | skinWindow | legacy UI skin image |
| 33 | i16 | plugin list upper bound | *(minor ≤ 2)* per entry `i16 enabled`; the plugin name is implied as `tkplug<N>`. *(minor ≥ 3)* per entry `str pluginFile`. |
| 34 | i16 | useDayNight | 0/1 (largely unused at runtime) |
| 35 | i16 | dayNightType | 0 = real clock, 1 = game clock |
| 36 | i32 | dayLengthMinutes | |
| 37 | | *(minor ≥ 3)* `str cursorMoveSound`, `str cursorSelectSound`, `str cursorCancelSound`, `u8 useJoystick`, `u8 colorDepth` | |
| 38 | | *(minor ≥ 4)* `u8 gameSpeed`, `u8 pixelMovement` | gameSpeed: if minor ≥ 8 the stored byte is `speed + 128` (range −4…+4, each step ±10 %); if minor < 8 the byte is the raw speed. pixelMovement: 0 = tile steps, 1 = pixel steps. Default 0/0 when absent. |
| 39 | | *(minor = 5)* `u8 cursorEnabled` → cursor is "TK DEFAULT" or none | |
| 40 | | *(minor ≥ 6)* `str mouseCursor`, `u8 hotSpotX`, `u8 hotSpotY`, `color transparent` | `mouseCursor` = `"TK DEFAULT"` (built-in arrow, transparent colour pure red), `""` (none), or an image/tile reference. Before minor 5 the default cursor is used. |
| 41 | | *(minor ≥ 7)* `i32 resX`, `i32 resY` | custom resolution |
| 42 | | *(minor ≥ 8)* `u8 showFpsInTitle` | |
| 43 | | *(minor ≥ 9)* `i16 pathfindHeuristic`, `i32 drawVectorsFlags`, `color pathColor`, `i32 movementControls`, then 8 × `i16 movementScanCode` | heuristic: axial / diagonal / vector (default diagonal before minor 9). drawVectors: debug-overlay bit flags (board vectors, sprite vectors, player path, destination). movementControls bits: 1 = keyboard, 2 = mouse, 4 = allow diagonals (default 1 + 4). The scan codes are **hardware keyboard scan codes**, ordered E, SE, S, SW, W, NW, N, NE. 0 = unbound. Defaults: arrow keys for E/S/W/N, diagonals unbound. |

**Version-dependent fields summary (12 conditional rows):**
1. `minor < 3`: Row 10 (reserved **`i16`** old parallax value).
2. `minor ≥ 3`: Row 21 (`str menuPlugin, str fightPlugin`) vs `minor < 3`: reserved **`i16`**.
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

**Palette (8-bit detail).** Indices refer to the standard **VGA/DOS 256-colour default palette** (16 EGA colours, 16 greys, then hue ramps). A reimplementation must ship this table. Build it from the public VGA default palette, not from the legacy source. Details **5 and 6** use only the **first sixteen** entries (the EGA set, the first 16 colours of the 13h VGA palette), not the full 256; details 3 and 4 use all 256. The official 2.0 Tileset specification fixes both rules and the transparency keys — see §15.13.

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

*Effective grid*: **isometric** boards are those whose `coordType` has bit 1 (`ISO_STACKED`) or bit 2 (`ISO_ROTATED`) set, i.e. `(coordType & 1) || (coordType & 2)` is non-zero (§5). Only the **isometric-rotated** style (bit 2) stores the tile matrix on rotated axes, as `(sizeX + sizeY) × (sizeX + sizeY)` per layer; every other style — 2D, iso-stacked, and any of them combined with the pixel-absolute bit 4 — stores `sizeX × sizeY` per layer.

*Size limits*: a negative `sizeX`, `sizeY` or `sizeL` is invalid, and a reader reports it. A reader also refuses a board whose tile matrix would hold more than 4,194,304 cells (the effective grid times `sizeL`). That second rule is an implementation limit, not part of the format: a run marker fills up to 32,768 cells with four bytes, so without it a file of a few kilobytes could make a reader reserve gigabytes. Real boards are about a hundred times smaller. A writer refuses a board the reader would refuse.

**Tile lookup table (LUT)**

| Type | Field |
|---|---|
| i16 | lutUpperBound |
| str × (lutUpperBound + 1) | tile references. When the table exists (`lutUpperBound ≥ 0`) it has `lutUpperBound + 1` entries, and **index 0 is always the "no tile" entry (an empty string)**. `-1` means the board has **no table at all** (§1.2), and then there is no index 0; no other negative value is valid. Inside an existing table, unused slots may be empty; an empty slot is not the same as the table being absent, because it keeps later indices stable (§1.2). |

**Tile matrix:** for each layer z = 1…sizeL, then each row y = 1…H, then each column x = 1…W (row-major within a layer), read an `i16`:
* **≥ 0:** LUT index for this one cell.
* **< 0:** run-length marker. `count = −value`. The next `i16` is the LUT index, which applies to the next `count` cells in the same traversal order. Runs may wrap rows and layers. That index **MUST** be `≥ 0`: a negative value — a run marker whose cell index is itself a marker — is invalid (runs do not nest), and a reader reports it rather than reading a second run.

A run may carry the traversal past the end of the grid — past a layer boundary, or past the last layer. A reader reads such a run in full, keeps the extra cell indices it produced, and reports a **warning**; it does not refuse the board, so an over-long run still round-trips (a writer re-emits the stored runs verbatim, AD-18). The same policy holds for a shading layer's records: they may cover more cells than the grid has, which a reader reports as a warning rather than an error.

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

**Conversion rules to vector board.** A pre-vector board converts to the §4.2 model (minor 4), keeping the source's `coordType`, by these rules:

* **Grid.** The tile matrix is always `sizeX × sizeY` cells per layer, in the z, y, x order above (z outer, then y, then x), and the converted shade layer covers the same `sizeX × sizeY` cells. Minors 2–3 have no `(sizeX + sizeY) × (sizeX + sizeY)` effective grid of the kind §4.2 gives iso-rotated boards, and `coordType` is the *last* field of a minor-3 file (absent in minor 2), so a reader reads `sizeX × sizeY` cells per layer before it can know the coordinate style. **Size limits** apply as in §4.2, on this layout's own measure: a negative `sizeX`, `sizeY` or `sizeL` is invalid and a reader reports it, and a reader refuses a board whose tile matrix would hold more than 4,194,304 cells — `sizeX × sizeY × sizeL`, with no rotated-grid factor — reporting a located error before it allocates anything.
* **Cell polygon.** A cell's polygon is, on a 2D board, the closed rectangle `((x−1)·32, (y−1)·32)`–`(x·32, y·32)` (§5, a 32×32 tile). On an iso-stacked board it is the closed 64×32 diamond centred on the tile (§4.6 with §5's stacked mapping, whose base point is the tile centre).
* **Tile type vectorization.** For each layer, cells of one type are merged into geometry (§4.7 lists the types):
  * `0` (Normal): no vector emitted.
  * `1` (Solid): a closed `TT_SOLID` polygon per maximal horizontal run of solid cells.
  * `2` (Under): a closed `TT_UNDER` (`2`) polygon per maximal horizontal run, with `attributes = TA_BRD_BACKGROUND` (`1`, include the board background image).
  * `3` (North–South) and `4` (East–West): two open (`closed = 0`) `TT_SOLID` polylines per tile along its blocking edges — a north–south passage blocks its west and east edges, an east–west passage blocks its north and south edges. Passages are never merged.
  * `11…18` (Stairs 1…8): a closed `TT_STAIRS` (`8`) polygon per maximal horizontal run, with `attributes = tileType − 10` (the destination layer 1…8).
  * **Any other cell type** (`5…10` or above `18`, which §4.7 does not define): no vector emitted, and the cell is not reported — it has no documented conversion.
* **Merge.** Merging is per maximal horizontal run of one type within one layer, on 2D boards only: a run `x…xEnd` at row `y` becomes one closed polygon spanning `((x−1)·32, (y−1)·32)`–`(xEnd·32, y·32)`. An iso-stacked board emits one diamond per tile, because the horizontal-run rule has no diamond analogue.
* **Program trigger regions.** Each program slot at tile `(x, y)` becomes a closed (`closed = −1`) polygon around that cell: the cell rectangle on a 2D board, the cell diamond on an iso-stacked board. Every converted program's `activationType` receives `PRG_STOPS_MOVEMENT` (`4`) OR-ed in — old programs always stop the player's movement. The pre-vector record has no distance field, so `repeatDistance` is **0** and bit 2 of `activationType` (`2`, "repeat every `repeatDistance` px while inside", §4.4) is passed through unchanged: a legacy file that set it repeats on every step (`0` px). <!-- OWNER: chose to keep bit 2 with repeatDistance 0 over masking the bit off, because masking silently discards a behaviour the file asked for; 0 px can only mean "every step" here. -->
* **Empty slots.** Every program and sprite slot is converted, empty ones included, so indices stay stable. An **empty program slot** (empty `program` string) carries no region: its point list is empty (§1.2, `points upper bound = −1`) and `closed = 0`. An **empty sprite slot** (empty `itemFile`) carries position `(0, 0)` and its stored layer, and nothing is drawn. Neither invents a region around tile `(0, 0)`. <!-- OWNER: chose an empty point list / the origin over a region around tile (0,0), because the file gives an empty slot no position and (0,0) is off-board. -->
* **Shading.** The per-cell RGB of every layer are **summed** into a single shade layer (index 0), because §4.5 makes shades additive offsets. The sums are **not clamped** on conversion — a cell shaded `+255` on two layers becomes `+510` — because §4.5's clamp is applied when a tile is drawn. The cast layer is the **highest** layer that carried any non-zero shade, and a board whose cells are all unshaded has no shade layer. <!-- OWNER: chose unclamped sums over clamping to ±255 at conversion, because each stored shade is already in range and clamping is a render-time concern of §4.5. -->
* **Positions.** Convert the player start and every sprite position from tile coordinates to pixels through §5, with the base point §5 states (`+16, +31` on 2D; the tile centre, `+0, +0`, on iso stacked). If `startX ≤ 0` **or** `startY ≤ 0`, the whole start is `(64, 64)` on layer 1; otherwise its layer is `startLayer`, or 1 when `startLayer ≤ 0`. The start is the only field with a fallback: a sprite or program at a non-positive tile converts through §5 with no special case.
* **Dropped fields.** The registration pair (`i16`, `str`), the foreground image, the border image, the border colour, the day/night fields (`i16 × 3, str`) and the reserved trailing string have no §4.2 field and are dropped. The background image becomes §4.2's `backgroundImage` with `backgroundDrawType = 1` (parallax). The ambient preset maps to §4.2's additive ambience: `0` → none, `1` → `(+75,+75,+75)`, `2` → `(−75,−75,−75)`, `3` → `(0,0,+75)`; any other value becomes none and is reported as a warning.
* **Numeric constants and layer titles.** The eleven `i16` constants become the eleven entries of §4.2's `constants` list as their **decimal strings**, in order (`constant[0]`…`constant[10]`). The nine stored layer titles fill §4.2's `layerTitles[0…sizeL]`: index `i` takes stored title `i` while `i ≤ sizeL` and `i < 9`; a stored title beyond `sizeL` and any index above 8 are dropped, and a missing index is an empty string.
* **Default vector bases.** This conversion generates **no** base. §4.2's `BoardSprite` carries none, because a sprite's collision and activation bases come from its own `.itm`/`.tem` (§6). The "standard default vector bases" of a pre-vector-era item are the §6 defaults, produced when that actor file is read (§6), not by this conversion. <!-- OWNER: withdrew the old "pre-vector items receive standard default vector bases" sentence rather than have the board conversion synthesise a base, because the board model has no base field; the defaults belong to the actor file. -->
* **Iso-rotated boards are deliberately unspecified.** A pre-vector board whose `coordType` is `2`, or `6` (`2` plus §5's `PX_ABSOLUTE` flag `4`), is **refused** with a located error: §4.8 records no mapping from the `sizeX × sizeY` matrix onto §4.2's `(sizeX + sizeY)²` rotated grid, and the program-region rule above names only the 2D rectangle and the iso-stacked diamond. `coordType` `0`, `4`, `1` and `5` convert, and `PX_ABSOLUTE` (`4`) is passed through unchanged. <!-- OWNER: chose to refuse iso-rotated pre-vector boards over guessing a rotated mapping, because neither §4.8 nor §4.2 pins one. -->

**Evidence for these rules.** The fetched sample corpus holds no minor 2–3 board (all three fixture `.brd` files are minor 4), so the rules above are pinned by synthetic fixtures and by the allowed TK2-era archive corpus: 144 binary minor-2 boards (FinalDestiny 25, Caoquest 2, School2Demo 19, ChimeranEmpire 98) read and convert cleanly (`_bmad-output/initiative-rpgtoolkit-reawakened/epic-tk2-support/discovery/tk2-formats-research.md`). That corpus contains no minor-3 board and no isometric board, so the minor-3-only fields (`threads`, `coordType`) and every iso rule here rest on §4.6/§5 rather than on an observed file, and the iso-rotated refusal stands.

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

**Default bases** when a file has none (old versions): 2D collision is a small rectangle at the feet; activation is a larger rectangle roughly the frame's footprint. Isometric boards use diamonds instead. A file that predates stored bases — a `.tem` below §6.1's base-bearing minor, an `.itm` below §6.2's — stores none and takes these defaults when it is read; the §4.8 pre-vector board conversion generates no base.

### 6.1 Character — `.tem` (`RPGTLKIT CHAR`)

Detection: byte at offset 13. Only the binary form is supported (text versions must be re-saved); the text form is documented in §15.5.

**Versions:** accepted `minor` **0–8** (the range the rows below describe: `minor = 3`, `minor < 5`, `minor ≥ 5`, `≥ 6`, `≥ 7`, `≥ 8`). A reader refuses `minor` 9 or higher, a negative version field and the text form, rather than guessing a neighbouring layout (§1.4). The newest samples (`demo/Chrs/start.tem`, `Basic/Chrs/start.tem`) are `minor` 8. *Caveat:* the 2.x era also wrote `.tem` at `minor` 3 and 4, and wrote a **text** form (§15.5). The minor-3/4 binary field set is described in §15.14 (`TEMB`), not in the rows above; a reader that applies the rows above to a minor-3/4 file leaves 407–797 residue bytes.

<!-- OWNER: chose 0–8 for §6.1 (the range the conditional rows span and the reader hard-codes) over a narrower 3–8, because §6.1's minor<5 rows exist and a TK2-era minor 3/4 file must at least be recognised; the mismatch is named rather than silently accepted. -->

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

**Versions:** accepted `minor` **0–7** (the range the rows below describe: `i32` prices at `minor ≥ 3`, movement at `≥ 4`, idle and speed/idleTime at `≥ 5`, bases at `≥ 7`, legacy walk frames at `minor < 4`). A reader refuses `minor` 8 or higher, a negative version field and the text form (§1.4). The samples (`demo/Item/man.itm`, `demo/Item/oldman.itm`) are `minor` 7, and the 2.x era wrote `minor` 3, which this layout covers. The 2.x **text** form is a separate layout, documented in §15.4.

<!-- OWNER: chose 0–7 for §6.2 (the range the conditional rows span and the reader hard-codes) over 3–7, because the minor<4 legacy walk-frame row is part of the layout and must be addressable. -->

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

The **text form** (minor 0) lists name, HP, SMP, FP, DP, run, crits, then a W×H tile grid for the rest image, then 101 special/weakness pairs, AI, program, rewards, programs, 4 blank lines, and 4 stance animations. A reader synthesises a rest `.tbm` and `.anm` from the grid. **All 52 corpus text `.ene` files are exactly 363 lines** and the rest-image block is padded to a fixed length; §15.6 has the layout, the counts and the open question about the block's empty cells.

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

**Text form:** lines `RPGTLKIT ANIM`, major, minor, width, height, a frame-count line, then per frame three lines (image, transparent colour as decimal, sound), then the delay. In all 17 corpus text `.anm` files the frame-count line is written `0` while 51 frames follow, each file exactly 160 lines; a reader must take the frames from the block before the final delay line, not from the count. See §15.7.

### 7.2 Animated GIF

Anywhere an `.anm` is accepted, an animated `.gif` in `Misc/` may be used instead. Frame count, size and per-frame delay come from the GIF itself.

---

## 8. Battle data

### 8.1 Special move — `.spc` (`RPGTLKIT SPLMOVE`)

Detection: byte at offset 16 (`0x00` = binary, non-zero = text).

**Versions:** accepted `minor` **2–3**. The field list does not vary with `minor`, so it selects no layout; the 2.x-era binary archive writes 2 and the 3.1.0 sample family writes 3 (`.bkg`). A reader refuses `minor` 0, 1 and 4-or-more, and a negative version field (§1.4), rather than guessing a neighbouring layout; the 2.x text form is refused by the detection byte above, whatever `minor` it carries.

<!-- OWNER: chose 2–3 for §8.1 over "any non-negative minor", because §1.4 wants a stated accepted set and the corpus shows only 2 (2.x-era) and 3 (3.1.0); if a 3.1.0-era `.spc` is ever found at another minor, widen the range rather than guess a layout. -->

**Binary:**
* Header: `str magic ("RPGTLKIT SPLMOVE")`, `i16 major`, `i16 minor`.
* Fields: `str name`, `i32 damage (FP)`, `i32 smpCost (to user)`, `str program`, `i32 targetSmpDrain`, `i8 usableInBattle`, `i8 usableFromMenu`, `str statusEffect`, `str animation`, `str description`.

The **text form** lists the header `RPGTLKIT SPLMOVE`, major, minor, then the same fields, one per line. Verified against the 8 corpus text special moves, all 13 lines — see §15.8.

### 8.2 Status effect — `.ste` (`RPGTLKIT STATUSE`)

Detection: byte at offset 16 (`0x00` = binary, non-zero = text).

**Versions:** accepted `minor` **2–3**. The field list does not vary with `minor`, so it selects no layout; the 2.x-era binary archive writes 2. A reader refuses `minor` 0, 1 and 4-or-more, and a negative version field (§1.4), rather than guessing a neighbouring layout; the 2.x text form is refused by the detection byte above, whatever `minor` it carries.

<!-- OWNER: chose 2–3 for §8.2 for the same reason as §8.1; no binary `.ste` sample exists in either corpus beyond the 2.x-era minor 2. -->

**Binary:**
* Header: `str magic ("RPGTLKIT STATUSE")`, `i16 major`, `i16 minor`.
* Fields: `str name`, `i16 rounds`, `i16 speedUp`, `i16 slowDown`, `i16 disable`, `i16 hpEnabled`, `i16 hpPerRound`, `i16 smpEnabled`, `i16 smpPerRound`, `i16 runProgram`, `str program`. Negative per-round amounts heal.

The **text form** lists the header `RPGTLKIT STATUSE`, major, minor, then the same fields, one per line. **Unverified:** the corpus holds no text `.ste` sample (5 binary only); the form is not ratified — see §15.8 and §15.15.

### 8.3 Battle background — `.bkg` (`RPGTLKIT BKG`)

Detection: byte at offset 12 (`0x00` = binary, non-zero = text).

**Versions:** accepted `minor` **2–3**. The field list does not vary with `minor`, so it selects no layout; the 3.1.0 sample (`demo/Bkrounds/bkg.bkg`) is `minor` 3, and the family's 2.x-era binaries are `minor` 2. A reader refuses `minor` 0, 1 and 4-or-more, and a negative version field (§1.4), rather than guessing a neighbouring layout; the 2.x text form (the only `.bkg` form in the TK2 archive) is refused by the detection byte above.

<!-- OWNER: chose 2–3 for §8.3 over "3 only", because §8.1–§8.3 share one header and era pattern and a 2.x-era binary `.bkg` (unobserved) would be minor 2, not 3. -->

**Binary:**
* Header: `str magic ("RPGTLKIT BKG")`, `i16 major`, `i16 minor`.
* Fields: `str image`, `str music`, `str menuMoveSound`, `str menuChooseSound`, `str readySound`, `str cantDoSound`.

The **text form** lists the header `RPGTLKIT BKG`, major, minor, then a **19 × 11** grid of tile references (209 cells), then the music followed by the four menu sounds, then one further name line (empty in every sample), then the shade grid of 209 cells × three colour values. See §15.9 for the worked evidence; read as 19 × 11 the 209 cells and the 627 shade values line up exactly (23 files, all 845 lines). Convert the grid to a `.tbm`.

---

## 9. RPGCode programs — `.prg`

### 9.1 Two encodings

1. **Source text** (normal). Single-byte ANSI text with CR/LF or LF line endings.
2. **Pre-compiled** (rare). The **first byte is `0x00`**. It contains a function-name table, class table and an instruction stream that depend on the legacy engine's internal function list. **Support is optional.** A rebuild can reject these with a clear message ("re-save the source"). If you do implement it, the outline is:
   * NUL-terminated names of the built-in functions used, ending with an empty string.
   * Classes: name; base names (end with ""); members as `name, i32 visibility`; methods as `name, i32 paramCount, u32 entryIndex, i32 visibility` (each list ends with "").
   * Then units: `i32 kind flags` (1 unset, 2 number, 4 string, 8 identifier, 16 call, 32 open-brace, 64 close-brace, 128 end-of-statement, 256 object, 512 label, 1024 plugin call), followed by an f64 for number/brace, a str for string/identifier/label/plugin, or `i32 functionIndex, i32 paramCount` for calls.

**Loading rules.** A source program loads and runs exactly what it contains.

* An **empty file** (0 bytes) is a valid, empty program: it loads and does nothing.
* A file whose **last line has no final newline** is valid; that last line is still a statement.
* A file whose **first byte is `0x00`** is a pre-compiled program (item 2 above), not source text. Rejecting it is allowed.

### 9.2 Lexical rules (3.1.0)

Source is single-byte Windows-1252 text (the ANSI code page of the era); the last line need not end in a newline.

* **Case-insensitive** keywords, identifiers and built-in names. Identifiers are `[A-Za-z0-9_]`. An identifier may start with a digit as long as a letter follows, and a destructor name may have a leading `~`.
* **Case normalisation.** Names are compared and stored after ASCII lower-casing (`A`–`Z` only). This covers keywords, variables, labels, class and member names, function names and built-in names. It does **not** cover string contents or map keys written as strings, and it never uses a locale-sensitive operation. Include file names are matched case-insensitively by the asset resolver (§1.5), not by lower-casing the program's text. <!-- OWNER: LEX-10 — alternatives: lower-case only variables (leave keywords fixed), or lower-case everything including path text. Decided: ASCII lower-case for names, resolver handles paths. -->
* **Numbers.** A number token is `digits [ . digits ] [ e [ + | - ] digits ]` (for example `12`, `1.5`, `1e+6`): the longest run of characters that fits that shape. A run that starts with a digit but does not fit (for example `2x`, `1e`) is an **identifier**, not a malformed number. <!-- OWNER: LEX-2 — alternatives: make `2x` an error, or reserve `e` as the only exponent letter. Decided: longest-match, else identifier, because identifiers may legally start with a digit. -->
* `true` = 1, `false` = 0 and `null` = 0 are reserved literals, matched case-insensitively; a variable may not be called `true`, `false` or `null`.
* **Strings.** `"…"`, single-line. There are no escape sequences, a string cannot contain `"`, and a string cannot contain a newline; an unterminated string is an error at the end of its line. Non-ASCII bytes inside a string or comment decode as Windows-1252. <!-- OWNER: LEX-8 — alternatives: treat the bytes as raw/opaque, or as Latin-1. Decided: Windows-1252, the editor's ANSI code page. -->
* **Sigils.** A trailing `!` (numeric) or `$` (string) directly after an identifier is a **legacy type sigil and is ignored**: `x!`, `x$` and `x` are the same variable, everywhere (parameters, array names and assignment targets included).
* **`!=` is "not equal"**, a second spelling of `~=`. A `!` directly followed by `=` is always the operator; a `!` or `$` followed by anything else is a sigil. So `x!=1` is `x != 1`, while `x! = 1` is `x = 1` with the sigil ignored. `operator!` and `operator$` are single operator names, not a name plus a sigil. <!-- OWNER: LEX-3 — alternatives: (a) keep `!=` out of 3.1 and require `~=`; (b) always read `!` as a sigil so `x!=1` cannot be parsed. Decided: adjacency rule, which reproduces both corpus forms (`x! = 1` spaced, `if (opt!=1)` adjacent). -->
* **`~` has three roles.** `~a` is bitwise NOT, `a ~= b` is "not equal", and `~Name` is a destructor name, recognised only directly after `method` or `::` (see §9.7).
* **Statements end at a newline** or `;`; the semicolon is optional. A block header is not a statement: see the brace rule in §9.5.
* **Line continuation.** A `_` that is its own token (whitespace before it) at the end of a line continues the statement onto the next line, optionally with a `//` comment after the `_`. An `_` that is part of an identifier or number (`foo_`) does not continue anything. A continued line is not "the first non-blank line", so a leading `*` on it is an operator, not a comment. <!-- OWNER: LEX-1, LEX-5 — alternatives: require `_` to hug the preceding token, or count a continued line as first-non-blank. Decided: standalone `_` token (all 6 corpus uses have the space) and no comment on a continued line. -->
* **Comments.** `// …` to the end of the line; `/* … */` (may span lines); legacy `* …` when `*` is the first non-blank character; `** …`. In a legacy TK2 file `*` may also start a trailing comment after a complete statement (§9.9).
* **`#` lines.** `#include` is the one directive read in 3.1 source; it is matched case-insensitively and `#` may be separated from `include` by whitespace. Any other leading `#` is a legacy command prefix and is ignored on that line. A `#` that is not at the start of a line is not special. Unquoted legacy arguments such as `#Mwin(Hello there)` are not 3.1 syntax and belong to the legacy frontends (§9.9). <!-- OWNER: LEX-6 — alternatives: reject every other `#` line, or accept `#Command` in 3.1 too. Decided: ignore other `#` lines (existing rule), `#Mwin` forms dialect-only. -->
* **Board constants** (§4.2) and engine constants. Engine constants are folded into the compiled program. A board constant is not: the compiled code names the constant and reads its value from the board when the program runs for that board, so the compiled form of a file does not depend on which board loads it, and the program cache can key on the file alone. <!-- OWNER: LEX-7 — alternatives: (a) bake board constants at compile time and add the board's constant set to the cache key; (b) resolve every board constant at run time (as above). Decided: (b), because it keeps a compiled program valid across boards and matches compile-from-text plus cache-by-file. -->
* **Unknown characters.** A character that belongs to no token — for example `@`, a backslash, or a `$` with no identifier before it — is a **lexical error**, reported with file and line. A legacy dialect frontend may accept the characters its own syntax uses (Toolkit 2.x uses `@` for a blank Message-Window line, §9.9). <!-- OWNER: LEX-11 — alternatives: silently ignore an unknown character. Decided: error, so a typo cannot be swallowed; no corpus file contains one. -->

### 9.3 Values and variables

* Dynamic typing: number (double) or string. Mixing in `+` concatenates (`"Hello " + 32` → `"Hello 32"`). Object handles are numbers.
* Variables need no declaration. **Scope defaults to global.** `local(x)` / `global(x)` select scope explicitly. `autoLocal(true)` makes new variables local to the current function or program. `kill(x)` unsets a variable.
* **Declare and assign.** `local(x) = v` and `global(x) = v` declare the variable in the chosen scope and assign it in one statement; this is the ordinary form for a new local (for example in a `for` initialiser) and it uses the reference-return rule of §9.5. `local(x)` on its own declares the variable and leaves it unset. <!-- OWNER: FUN-2 — alternatives: make `local(x)` alone an error (must be assigned), or have it return the variable's value. Decided: it declares and leaves unset, matching an unset variable's `""`/0 read. -->
* **`kill` forms.** `kill(x)` unsets a variable; `kill(a[i])` unsets one array element; `kill(a, b, …)` unsets several in one call. Whether `kill(a)` on a whole array differs from unsetting it element by element is settled by the entry that implements the built-ins. <!-- OWNER: SEM-1 — this is a runtime-meaning row; the forms the corpus uses are stated here so the parser is complete, and entry 12 confirms the binding semantics. Alternatives: element-only, or whole-array as a distinct form. -->
* Arrays and maps: `a[0]`, `a[1][2]`, `m["key"]`. Any expression can be an index. Multi-dimensional arrays are allowed. Arrays are sparse.
* An index written as a **bare identifier** (`a[i]`) is a variable lookup: `i` is evaluated as a variable. The legacy TK2 form where an unquoted word is taken as a string key (`m[key]` meaning `m["key"]`) is not 3.1 syntax and is handled by the TK2 frontend (§9.9).
* Unset variables read as `""` / 0.

### 9.4 Operators

Every operator yields a value, including assignments. The table lists precedence from **highest** (binds tightest) to **lowest**; operators on one row have equal precedence.

| Precedence | Operators | Associativity |
|---|---|---|
| 1 | `()` call, `[]` index, `->` member, postfix `++` `--` | left |
| 2 | unary `-` `+` `!` `~`, prefix `++` `--` | right |
| 3 | `^` (power) | right |
| 4 | `*` `/` `%` | left |
| 5 | `+` `-` | left |
| 6 | `<<` `>>` | left |
| 7 | `<` `<=` `>` `>=` | left |
| 8 | `==` `~=` `!=` | left |
| 9 | `&` (bitwise AND) | left |
| 10 | `` ` `` (bitwise XOR) | left |
| 11 | `\|` (bitwise OR) | left |
| 12 | `&&`, the word `and` | left |
| 13 | `\|\|`, the word `or` | left |
| 14 | `?:` | right |
| 15 | `=` `+=` `-=` `*=` `/=` `%=` `^=` `&=` `\|=` `` `= `` `<<=` `>>=` | right |

<!-- OWNER: EXP-2 — the two judgement calls: (a) `^` is power and sits above unary minus, right-associative, so `-2^2` is `-(2^2)`; (b) the bitwise operators `&`, the backtick and `|` sit *below* the comparisons, as in C, so `x & y == z` is `x & (y == z)`. Alternatives: put `^` below unary minus (C-ish `-2^2` = `(-2)^2`), or rank the bitwise operators above comparisons (as some BASICs do). This is the table entry 5 must implement; change it here if you prefer the alternatives. -->

* `^` is **power**, not XOR; the backtick `` ` `` is XOR.
* Comparison: `==`, `~=`, `!=`, `<`, `<=`, `>`, `>=`. `~=` and `!=` both mean "not equal" (see §9.2).
* Logical: `&&` and `||`, and the words `and` / `or`; `!` is logical NOT, `~` is bitwise NOT.
* Arithmetic: `+ - * / % ^` (power), unary `-` and unary `+` (numeric identity), `++` / `--` (prefix and postfix).
* **`&` has three roles**, told apart by position: a parameter written `&name` declares a by-reference parameter (§9.5); `return &lvalue` returns a reference (§9.5); everywhere else it is the bitwise AND operator. An explicit `&x` in an argument list is **not** how by-reference is expressed — the callee's parameter decides — so `&` in an argument position is the bitwise operator, or an error. <!-- OWNER: EXP-3 — alternatives: allow an explicit `&x` at the call site to force by-reference (older BASIC style). Decided: no; by-reference is the callee's `ParamSpec`, which avoids an unary/binary ambiguity. -->
* **`=` in a condition.** In 3.1 syntax a single `=` in a condition is an **assignment** (its value is then tested), never a comparison; `==` is equality. The legacy reading of `=` as equality applies only inside files parsed by the TK2 dialect frontend (§9.9). <!-- OWNER: EXP-4 — alternatives: (a) treat `=` as equality everywhere (the legacy reading), so `x = 5` in an `if` never assigns; (b) gate the legacy reading on a file that is detected as TK2 (as decided). Decided: (b), because the one 3.1 corpus site reads as assignment and 293 TK2 sites are equality. -->
* **Where `:` and `.` are legal.** `:` appears in the ternary `a ? b : c`, in a label `:name`, after a `case` value, after an access label (`public:` `private:` `protected:`), in a class base list (`class CName : CBase, COther`) and in the scope separator `::` (`method CName::CName`). `.` is not an operator: member access is `->`, and a `.` only separates the file and function names of an implicit include (`file.func`, §9.6) or appears inside a string a program builds itself. `++`/`--` may not be split across a line. <!-- OWNER: EXP-5 — alternatives: give `.` a member-access meaning, or allow `++` across lines. Decided: `:` in those six places only, `.` is not an operator. -->
* **Indexing** is a postfix `[expr]` that may follow any primary value: a variable, a call result (`f(x)[i]`), a member access (`obj->arr[i]`), or another index, so `a[1][2]` indexes twice. `m["key"]` is a string-keyed map. <!-- OWNER: EXP-6 — the grammar was prose-only; alternatives: forbid indexing a call result, or make `[ ]` follow only names. Decided: postfix on any primary. -->
* Ternary `a ? b : c`. Member access `obj->member` / `obj->method()`.

### 9.5 Statements and control flow

```
if (expr) { … } elseif (expr) { … } else { … }
while (expr) { … }
until (expr) { … }                   // check first; loop until expr is true
for (init; cond; step) { … }         // any of the three parts may be empty
switch (expr) { case v: { … }  default: { … } }   // no fall-through
function name(a, b, &byRef) { … return expr; }   // "method" is a synonym
inline function f(x) { … }           // "inline" is a hint only
:label                               // label (used by error handling / branch)
```

* **Braces are required.** Every block body is written `{ … }`; a brace-less body (`if (x) stmt`) is not 3.1 syntax. A newline is allowed between a block header and its `{`: the brace may be on the header line or on the line after it. A block header is not a complete statement until its `{`. <!-- OWNER: STX-1, STX-4 — alternatives: (a) require the brace on the header line (the old literal reading, which fails 6 of 9 sample programs); (b) allow brace-less single-statement bodies. Decided: brace on either line, brace-less bodies not allowed. -->
* **`}` ends the statement before it**, so a statement immediately before a closing `}` needs no `;` or newline. <!-- OWNER: STX-6 — alternative: require `;`/newline before `}`. Decided: `}` terminates, so `{ x = 1 }` is well-formed. -->
* **`else`** may be written on the closing `}` line or on a later line; `else if` (two words) is accepted as a synonym of `elseif`. <!-- OWNER: STX-3 — alternative: allow `else` only on the `}` line, and reject `else if`. Decided: both positions, and `else if` accepted. -->
* **`case` and `default`.** A case value is a full expression. The colon is optional: `case (v):`, `case (v)` and `case v:` are the same label. `default` may take an optional colon. Blocks do not fall through. <!-- OWNER: STX-2 — the corpus uses the colon-less `case (1)` form and never uses `default`; alternatives: make the colon mandatory (the old text) or accept both (decided). -->
* **`for` parts** are separated by `;` and may each be empty (`for (; cond; )`); those `;` are separators, not statement terminators.
* **Parameters.** A parameter is `[Type] name [&]` — an optional class name, then the parameter name, then an optional `&` for by-reference. The type is documentation only: it is not checked at run time and it does not take part in choosing an overload. Overloading is by **parameter count** only. <!-- OWNER: FUN-1 — alternatives: (a) use the type in overload choice and check it; (b) require the type to name a real class; (c) ignore it (decided). The corpus has `method clone(CArray rhs)` but no evidence of a type check or a type-keyed overload. -->
* **Default parameter values, variadics and declared return types do not exist** in 3.1, and an overload never matches on type.
* `return &lvalue` returns a reference, so a function call can be an assignment target; any lvalue is allowed — a variable, an index (`return &a[i]`), or a member access. <!-- OWNER: FUN-3 — alternative: restrict `return &` to a plain variable. Decided: any lvalue, because the corpus returns `&m_data[idx]`. -->
* **Labels** are scoped to the function (or program) that contains them; `branch(:label)` jumps within that scope and never crosses a function boundary. A label may also be passed as an argument (`branch(:label)`, `setErrorHandler(:label)`). <!-- OWNER: STX-5 — alternatives: program-wide labels, or labels that `branch` can cross out of a function. Decided: function/program scope, no crossing. -->
* `end()`, `done` and `stop` end **the program whose code is running**, immediately and whatever the call depth: every pending function frame of that program is abandoned. Functions from included files are part of the including program, so `end()` there ends the including program. `run(prg)` ends the calling program *before* it starts the new one, so when the `run()` program calls `end()` the whole chain is finished; the rest of the game keeps running. (Reviewed extraction fact R2-Q20, `docs/provenance/facts-round-2.md`; it replaces the earlier ruling that a `run()` program returns to its caller. How a thread's own `end()` behaves is entry 3.9's, THR.)
* A bare identifier on its own line is treated as a zero-argument call (legacy `end` → `end()`).

### 9.6 Modules

A module rule decides what a program's other files contribute to it; the VM needs it fixed because a restored snapshot must resolve every call the same way the original run did.

* `#include "file.prg"` or `include("file.prg")`. Only functions and classes are imported; loose top-level code in an included file does not run. The include root is `Prg/` under the project folder, and a name with no path separator resolves there. — legacy behaviour (R2-Q21). **Our rule:** resolution and matching go through the asset resolver, so the `Prg/` root, its subfolders and the ASCII-only fold of §1.5 are the one path rule the readers and the scripts share; the legacy reader used the name exactly as written.
* **Implicit include:** `file.func(args)` queues `Prg/file.prg` for inclusion while the program is loaded, and only then is `func` a name to call. — legacy behaviour (R2-Q21); it corrects the earlier "on first use" reading.
* **A `file.`-qualified call binds to that file — our rule.** The compiled call site records the file. At run time the file is queued for inclusion and `func` is resolved among that file's own definitions first; only when the file defines no such name does the ordinary order apply (a built-in before a script function). This departs from legacy, which dropped the file part and then let a built-in win (R2-Q21). The compiled call stores the folded file name, so a restore reproduces the binding.
* **Hoisting and include position.** Definitions are hoisted within their file, so a function may be called earlier in that file than its definition. A literal `#include` is collected wherever it appears in the file — even inside a function or a branch that never runs — and applied when that file's parse ends, so a call written before the `#include` line still resolves once the file is loaded. — legacy behaviour (R2-Q21). A computed `include(expr)` runs at run time, and its file's definitions are available from that point on.
* **One flat list of script functions (working rule).** `#include`, an implicit `file.func` call, and the first run of a file each add that file's functions to a single flat list of script-function names at that moment. When two entries in that list share a name (and parameter count), the **last one added wins**. A `file.`-qualified call bypasses the flat list and reaches that file's own definition (see above). Every override raises a warning naming the old and new definition. **This ordering is our rule and it is not the legacy behaviour:** legacy kept the first definition and silently skipped a later one of the same name and parameter count (R2-Q21, R1-Q9). Entry 3.8 keeps the owner's last-wins rule on purpose, with the divergence recorded here so a later fidelity review can reverse it. <!-- OWNER: MOD-1 / entry 3.8 — alternatives: adopt the legacy first-wins ordering (silent skip) or keep the owner's last-wins ordering with a warning (decided). The unqualified-after-include question is answered below: an include merges the file into the program, so the unqualified name is reachable once the include has been read. -->
* **Ruled (entry 3.8, doc-first) — includes: repeats, cycles, missing files and visibility.**
  * An included file is merged into the including program, so its functions and classes become part of that program and an unqualified name in it is reachable once the program is loaded. — legacy behaviour (R2-Q21).
  * The same include name is added once; a repeated include does not add its definitions a second time. — legacy behaviour (R2-Q21, which matched the exact text at load time). **Our rule:** matching is on the folded path, at load and at run time alike, so one file included under two spellings is still one file.
  * An include inside a function is allowed but has no scoping effect: it is a program-wide include. — legacy behaviour (R2-Q21).
  * A missing file is ignored silently at load time; an empty file imports nothing and is not an error; `include()` of a missing file at run time raises a runtime error. — legacy behaviour (R2-Q21).
  * An include cycle is not guarded in legacy: each included file is parsed afresh and cached only after its own parse finishes, so A including B including A recursed without end. — legacy behaviour (R2-Q21, inferred). **Our rule:** an include whose file is already being parsed is treated as already included and reported as a cycle diagnostic, so parsing always terminates; a rebuild must not hang or crash on a cycle.
  * **Our rule — where a run-time include list lives:** the ordered list of files a program has included at run time is part of that program's compiled record, and the program's source hash covers its main text plus that list, so a restore rebuilds the same include set before any call resolves. (The compiled record is rebuilt from the program reference on restore; the reference needs a field for that list — see the follow-ups in §9.14.)
* `redirect("oldName", "newName")` remaps a function name globally (including built-ins). `killRedirect("name")` and `killAllRedirects()` undo it. The legacy `#`-prefixed operands and an implicit `file.method` target (`#redirect(#a, #b.c)`) are dialect forms (§9.9).
* **Ruled (entry 3.8, doc-first) — redirects.**
  * There is one redirect table for the whole run. — legacy behaviour (R2-Q22); **our rule** holds it as the VM's `redirects` state section, so it travels in a saved game and a snapshot restores it.
  * `redirect`, `killRedirect` and `killAllRedirects` take effect when source text is parsed, in textual order, and only on text parsed after them; a program already compiled keeps its old bindings. — legacy behaviour (R2-Q22). **Our rule — a restore stays faithful:** the redirect table in force when a program is compiled is recorded in that program's compiled record and folded into its cache key, so recompiling after a restore uses the same table; if the current table no longer matches, the program is recompiled and the state-restore mismatch policy restarts the thread from source.
  * A target may be a built-in name; after substitution the name is looked up like any other call name. — legacy behaviour (R2-Q22).
  * There is no chaining: one substitution is made, so with a→b and b→c the name a becomes b only. — legacy behaviour (R2-Q22).
  * A target of the form `file.func` also queues that file for inclusion. — legacy behaviour (R2-Q22).
  * A redirect stops applying only through `killRedirect`/`killAllRedirects` or by loading a saved game, never because a program ended. It applies to call syntax only. — legacy behaviour (R2-Q22).
  * **Our rule:** redirect names fold like every other name (the ASCII fold of §1.5), so a redirect and the call it matches agree on every runner.

**References.** R2-Q21, R2-Q22, R1-Q9 (`docs/provenance/facts-round-2.md`, `docs/provenance/facts-round-1.md`); §1.5 (paths and the ASCII fold), §9.1 (pre-compiled refusal, entry 3.8's other work), §9.9 (dialect forms); AD-5 and AD-7 (`redirects` state section), AD-17 (host boundary) in the architecture spine.

### 9.7 Object orientation

```
class CName : CBase, COther {          // "struct" = class with public default
public:
    method CName(a, b) { m_field = a; } // constructor with its body in the class
    method ~CName() { clean(); }        // destructor
    method operator+(rhs)              // any operator except -> and .
    method operator[](i)
    method operator=(rhs)              // replacement for the plain handle store (OOP-4)
    method operator$()                 // declared conversion operator; never consulted (OOP-7)
    method virtualThing() = 0          // pure virtual (class becomes abstract)
private:
    var m_field                        // "var" declares a member inside a class
    var m_data[]                       // empty brackets declare a growable member array
    m_array[10]                        // fixed-size member array
}
method CName::CName(a, b) { m_field = a; }   // an out-of-class body is also accepted
obj = CName(1, 2);  obj->method();  obj->release();   // release() runs destructor and frees
```

* A method body may be written **inside the class** (the form used throughout the sample corpus) or as a body-less prototype in the class with a separate `method CName::CName(…)` definition outside; the two forms may be mixed.
* `var name` declares a member field; `var name[]`, with empty brackets, declares a member array that grows as it is assigned (§9.3). `m_array[10]` declares one with an initial size.
* `this` names the current object inside a method; it is an ordinary object value that may be used and indexed, and `this[i] = …` reaches the object's `operator[]` like any other indexed assignment (see the classes ruling below).
* **Ruled (entry 3.6, doc-first):** the class and object rules are in the classes ruling below. It settles the member-lookup order, `operator=` and `operator[]` dispatch, destructor timing, the access labels and inheritance order, so the paragraphs here are read with it.

Inheritance is multiple and methods are virtual: a call uses the object's actual class, not the declared type of the expression. An object is a reference handle; ordinary assignment stores the handle rather than copying members, though a class may define `operator=` to change that. `release()` runs the object's own-class destructor and then frees it; the ruling below also says what `kill` and program end do, and when an unreferenced object is freed.

### 9.8 Error handling

Error handlers work inside functions only:
* `setErrorHandler(:label)`: on a runtime error, jump to the label.
* `setResumeNextHandler()`: ignore errors and continue with the next statement.
* `resumeNext()`: from inside a handler, continue after the failing statement.
* Legacy forms: `on error goto :label`, `on error resume next`.

Errors in nested calls are **not** caught by the caller's handler.

* **Ruled (entry 3.7, doc-first):** these paragraphs settle which failures are catchable and how a handler, its label and `resumeNext` behave. Each rule is marked **legacy behaviour** (the extraction fact that fixes it) or **our rule** (with the reason it departs). Terms used below: a **frame** is one active function or method call; a **report** is the engine's error report (the file, an approximate line and a message); the **unset value** is what a never-assigned variable or a failed call produces (the number 0, which reads as the empty string in string context); a **VM step** is one instruction the interpreter executes, defined fully in the thread rulings below.

**ERR-1 — the handler, its label and `resumeNext`.**

* A handler can be set inside a function only. Setting one at program top level is itself an error; at top level an error is never caught, and it is reported unless messages are off. — legacy behaviour (R2-Q10).
* The handler belongs to the function frame that set it and lasts until that frame returns. It stays active after it fires; it is cleared only when the error fires and its label cannot be found in that function, in which case the error is reported. — legacy behaviour (R2-Q10) for the lifetime and the clearing rule, and **our rule** for the label check: a handler's label must be in the function that set the handler, so it can never jump into another function. Legacy resolved labels across the whole loaded program by a first-match scan (see the note below); the rebuild keeps the one label rule already ruled for `branch`.
* A built-in that fails inside a frame is seen by that frame's handler. An error raised inside a called script function is seen only by that function's own handler; with none there it is reported and the callee continues, and it never reaches the caller's handler. — legacy behaviour (R2-Q10).
* `setResumeNextHandler()` swallows the error and continues at the next VM step, which may be in the middle of the failing statement, with the failed call contributing the unset value. It is not "the next statement". — legacy behaviour (R2-Q3).
* `resumeNext()` continues at the statement after the one that was executing when the error was raised. The return point is remembered per frame and used once, and it is part of the frame's handler state, so a snapshot taken while a handler is running restores it. Calling `resumeNext()` when no handler is currently handling an error, or outside a function, is itself an error. — legacy behaviour (R2-Q10); **our rule** keeps the return point inside the frame's single handler slot.
* When a labelled handler takes over, the failing statement's partial operand state is dropped. — legacy behaviour (R2-Q10); **our rule** restates it as plain state so a snapshot taken inside a handler restores identically.

**ERR-2 — which failures are errors, and which are catchable.**

* Without a handler, a runtime error is reported and the program continues with the next VM step; a runtime error never stops the program. — legacy behaviour (R2-Q11).
* Reports are suppressed while `debug(false)` has turned messages off (they are on by default). A failure that is not one of the interpreter's own kinds is always reported and is not affected by `debug`. — legacy behaviour (R2-Q11).
* **Our rule:** every catchable runtime error is also handed to the host as a diagnostic carrying a code, the file, the line and a message, so a script error is both catchable by the script and visible to the harness.

| Failure | Outcome | Catchable |
|---|---|---|
| A call the resolver cannot match, or a script function called with the wrong number of arguments | Runtime error; the call's result is the unset value | Yes |
| A built-in called with the wrong number of arguments, or with an invalid one | Runtime error naming the count it needs | Yes |
| An ordinary parameter given a value of the wrong type | Not an error: the value is converted by the coercion rules | — |
| A typed parameter given an object of the wrong class | Runtime error | Yes |
| An invalid object handle, a missing class, or an inaccessible member or method | Runtime error | Yes |
| An array index with no element | Not an error: arrays are sparse, and reading a missing element yields the unset value | — |
| Division by zero (`/`) | Not an error: infinity or NaN | — |
| Modulo by zero (`%`) | A catchable runtime error of the division-by-zero class; no value is produced | Yes |
| A built-in that fails (a missing file, item, player or board index) | Runtime error; a handful instead return the unset value silently | Yes, where raised |
| An obsolete built-in | Runtime error for most, a warning for a few; a handler treats both the same way | Yes |
| A load-time problem (a syntax error, an unmatched brace, a missing base class or constructor) | Reported once while loading; the partially built program still runs | No — no frame exists yet |

Every row above except the modulo row is legacy behaviour (R2-Q11). The modulo row is **our rule** (R3-Q3): the legacy build had no zero check, so a zero divisor faulted the processor, producing no value and no catchable script error, and the process ended abnormally. The rebuild raises a catchable runtime error of the division-by-zero class instead, so a failed script is reported, replayable and never takes the runner down.

**Note (unreconciled).** Legacy error labels were found to be program-wide, so a handler could jump into another function (R2-Q10); the label ruling above keeps labels inside the function. Entry 3.7's rule follows the earlier label ruling, and the difference between the legacy engine and this spec is recorded here rather than hidden.

**References.** R2-Q3, R2-Q10, R2-Q11 (`docs/provenance/facts-round-2.md`); R3-Q3 (`docs/provenance/facts-round-3.md`); the label scope in the statements and control-flow subsection; AD-7 (the frame's handler slot) and AD-24 (diagnostics) in the architecture spine.

### 9.9 Older dialects: Toolkit 2.x (RPGCode 2) and Toolkit 1.x

> **Correction (3.1 amendment).** Earlier versions of this section — and ADR 0004 — said Toolkit 2.x used `< … >`
> block delimiters. That is wrong. The `< … >` form with `then` is **Toolkit 1.x only**; Toolkit 2.x uses `{ }` blocks
> exactly like 3.1. A Toolkit 2.x corpus of 268 programs contains 3,120 `{` and no `<`, while the Toolkit 1.4 demo uses
> the `< >` form. ADR 0004 still carries the old claim; §9.14 lists that as a separate docs fix.

A game from either dialect runs through that dialect's frontend — the Toolkit 2.x frontend, or a Toolkit 1.x frontend when
one is added. The 3.1 parser never sees these forms, and a file written for the 3.1 editor uses none of them. The 3.1 editor
shipped an **update wizard**, so a rebuild should either accept these forms or provide an equivalent converter.

**Toolkit 2.x (the dialect most surviving games use).**

* **`#` is the statement introducer**, stripped before parsing, and it appears on essentially every statement: commands
  (`#MwinCls`), control flow (`#If`, `#While`, `#For`), assignments (`#x! = 1`, `#a$ = "…"`), `#Method`, `#Include`. A
  keyword is case- and spacing-insensitive: `#if(cond)`, `#If (cond)` and `#IF` are the same.
* **Blocks are `{ }`.** A block may be written on the header line (`#If (c) { … }`) or with its brace on the next line.
* **`#For(init; cond; step)`** uses `;` between its three parts, like the 3.1 `for`; the parts may be empty.
* **Labels and flow.** `:label` defines a label; `#Branch(:label)` jumps to it (goto); `#FBranch(:label)` calls a labelled
  *section* as a subroutine and returns at the end of that section. `#FBranch` has no 3.1 twin — it and `#Empty` are the
  only two Toolkit 2.x commands with no 3.1 name, and both live in the TK2 compatibility plugin.
* **User commands.** `#Method name(params)` … `#ReturnMethod(v)` defines a command and returns a value. `#Method` is the current Toolkit 2.x keyword and is the same keyword as 3.1's `function` — neither is legacy. `#ReturnMethod(v)` is the Toolkit 2.x return and maps to 3.1 `return v`; there is no `returnMethod` in 3.1, so that one spelling is pre-3.1 only.
* **Comparisons.** Inside a `#If` or `#While` condition a **single `=` is equality** (the help says "you can use one equal
  sign"); the comparison set is `==`, `!=`, `~=`, `<`, `>`, `<=`, `>=`. `!=` is a second "not equal" spelling alongside
  `~=` (3.1 accepts both, §9.2). This rule is Toolkit 2.x only: in 3.1 `=` is assignment (§9.4).
* **Includes and redirects.** `#Include(filename$)`, an implicit namespace include `#lib.method(args)` (loads
  `Prg/lib.prg` and calls `method`), `#Redirect(old, new)`, `#KillRedirect(name)` and `#KillAllRedirects()`. The
  `#Redirect` operands may themselves be `#`-prefixed names and the target may be an implicit `file.method` — for example
  `#redirect(#a, #b.c)`.
* **`#RPGCode(expr)`** (or `rpgCode(expr)`) evaluates `expr` as a fresh RPGCode statement, a leading `#` allowed, in the
  current scope. This is how a Toolkit 2.x program builds a variable name or emulates an instance: it concatenates a
  command string and runs it.
* **`<var>` splices a variable into message text.** A string passed to a message or text built-in (`mwin`, `text`, …) has
  every `<name>` replaced by the value of `name` — the same expansion the `spliceVariables` built-in performs.
* **`*` comment** starts a line comment when it is the first non-blank character, **and** it may follow a completed
  statement on the same line (`#InternalMenu(3) * Opens Details Menu *`).
* **`@` on a line of its own** writes a blank Message-Window line.
* **Unquoted string arguments** (`#Mwin(Hello there)`, `#SetImage(title.gif, …)`) are read as strings, and a variable name
  may be passed where a value is wanted.
* **Loose text lines** with no `#`, `*`, `:` or brace are shown as dialogue.

**Toolkit 1.x (RPGCode v1, not in the first release).**

* Blocks are `< … >`, and an inline block is introduced by `then` (`if (c) then < … >`). Loose text lines are common. This
  dialect is out of scope for the first release; a Toolkit 1.x frontend can be added later through the same seam.

**Toolkit 2.x spellings a 3.1 reader may meet.**

| Legacy form | 3.1 meaning |
|---|---|
| `#Mwin(Hello there)` with unquoted string args | `mwin("Hello there")` |
| `if (x = 5)` (`=` as comparison inside a condition) | `if (x == 5)` |
| unquoted map keys `m[key]` | `m["key"]` |
| `x! = 1`, `name$ = "a"` | sigils ignored (`x = 1`, `name = "a"`) |
| loose text lines (no `#`) shown as dialogue | `mwin("…")` |
| `#Method` | `function` — the same keyword; neither is legacy |
| `#ReturnMethod(x)` | `return x` (pre-3.1 spelling; 3.1 has no `returnMethod`) |
| `* comment` lines | comments |
| `#Dos`, `#Windows`, `#Gone`, `#Over`, `#Reset`, `#Win` | obsolete engine controls, still listed in §9.11 |

**`system.*`.** The engine exposes its own namespace through the same dot syntax: `#system.pause` (used by many Toolkit 2.x
games) resolves to the engine's `pause`, not to a file. A game may also ship a `system.prg` library; it is an ordinary
library file (§9.14). <!-- OWNER: PRG-1 — alternatives: (a) load `system.prg` automatically at boot, as a shared library; (b) treat it as an ordinary library reached only by `#include` or an implicit call (decided). The demo copy is referenced by nothing, so (a) would invent behaviour the corpus does not show. -->

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

Calls to names that no built-in or script function defines are offered to **RPGCode plugins** (engine doc §9). Where a name's owning epic is not obvious from its group, §9.13 says who owns it.

### 9.12 Rulings on the ambiguity list (3.1 amendment)

This subsection settles the lexical, expression, statement, function and program questions a 3.1 parser needs. Each row
comes from the RPGCode language-readiness study. **Ratified** means the sample corpus already answers the question;
**ruled** means the evidence supports the reading given here; **deferred** means a later entry rules the question in its own
docs commit before writing code. Rows the owner should check hardest carry an `<!-- OWNER: … -->` note where they appear,
listing the alternatives. Short names below: LEX lexical, EXP expressions, STX statements, FUN functions, PRG program, OOP
classes, SEM runtime meaning, MOD modules, ERR errors, THR threads.

**Ruling summary:** 33 rows are settled in this amendment (8 ratified, 25 ruled) and 23 were deferred to the implementing
entries; those figures are for the 3.1 amendment only. Every deferred row that has since been ruled is listed under
"Ruled by a later entry" below, and the rest stay deferred. Twenty-seven `<!-- OWNER: … -->` notes flag the judgement
calls and list the alternatives; the owner review list below names the ones worth the most attention.

**Ratified — the corpus already settles these (8 of the 14 corpus-settled rows; the other 6 are class, module and runtime
rows, listed under "deferred" because their implementing entries rule them).**

| ID | Section | Rule |
|---|---|---|
| STX-1 | 9.2, 9.5 | A newline is allowed between a block header and its `{`; brace-on-header and brace-on-next-line are both accepted. |
| STX-2 | 9.5 | `case` takes a parenthesised, colon-less form (`case (1)`); the colon form is also accepted and `default` may take a colon. No fall-through. |
| STX-3 | 9.5 | `else` may be on the closing `}` line or on a later line. |
| FUN-1 | 9.3, 9.5 | Typed parameters `Type name` are 3.1 syntax; the type is documentation only. |
| FUN-2 | 9.3, 9.5 | `local(x) = v` and `global(x) = v` declare-and-assign; `local(x)` alone declares. |
| FUN-3 | 9.5 | `return &` accepts any lvalue, including `a[i]`. |
| EXP-1 | 9.3 | A bare identifier index is a variable lookup; unquoted map keys are legacy. |
| FUN-4 | 9.5, 9.9 | `method` and `function` are interchangeable and neither is legacy; `returnMethod` is the legacy return. |

**Ruled here — the corpus cannot settle them, so the amendment gives a reading and its reason.**

| ID | Ruling | Reason |
|---|---|---|
| LEX-1 | A `_` that is its own token, at the end of a line, optionally followed by `//`. | All 6 corpus uses have a space before it; an `_` inside a name must stay part of the name. |
| LEX-2 | Longest-match number `digits[.digits][e[+-]digits]`; otherwise a digit-leading run is an identifier. | No counter-example in the corpus; identifiers may legally start with a digit. |
| LEX-3 | `!=` (adjacent) is "not equal"; `!` or `$` otherwise is a sigil; `operator!` and `operator$` are single names. | Reproduces both corpus forms: `x! = 1` (spaced) and `if (opt!=1)` (adjacent). |
| LEX-4 | `~` is unary NOT; `~=` is "not equal"; a destructor `~` only directly after `method` or `::`. | The three uses never collide in one position. |
| LEX-5 | A continued line is not "first non-blank": a leading `*` on it is an operator. | No corpus use; keeps `_` followed by `*` unambiguous. |
| LEX-6 | In 3.1 source `#include` is the one directive, case-insensitive with optional space after `#`; other `#` lines are ignored legacy; `#Mwin(…)` unquoted args are dialect-only. | One `#include` and no other `#` in the 3.1 corpus; `#` is pervasive in Toolkit 2.x files. |
| LEX-7 | Engine constants fold at compile time; board constants are read from the board when the program runs, so the compiled form does not depend on the board and the cache keys on the file alone. | Otherwise a program compiled for one board is stale on another, clashing with compile-from-text and cache-by-file. |
| LEX-8 | Strings are single-line; source bytes decode as Windows-1252. | No corpus string spans a line; the original editor's ANSI code page is Windows-1252. |
| LEX-9 | `true`, `false`, `null` are reserved case-insensitive literals. | `true` is used 9 times; reserving avoids a name that cannot be used back. |
| LEX-10 | Case-insensitivity is ASCII-only and covers keywords, identifiers and built-in names; not string contents or string map keys; include paths are matched by the resolver. | Needed for the no-locale determinism rule; the corpus never relies on a second spelling. |
| LEX-11 | An unknown character is a lexical error with file and line. | No occurrences; an error is the safe default. |
| EXP-2 | The precedence table of §9.4 applies: postfix, unary, `^` (right), then `* / %`, `+ -`, shifts, comparisons, `== ~= !=`, `&`, backtick, `\|`, `&&`/`and`, `\|\|`/`or`, `?:`, assignment. `^` is power, above unary minus, right-associative; the bitwise operators sit below comparisons. | Keeps the C convention the section promised while honouring `^` = power and backtick = XOR. |
| EXP-3 | `&` is bitwise AND except as a `&name` parameter or after `return`; no explicit `&x` at a call site. | Avoids an unary/binary ambiguity; by-reference is the callee's contract. |
| EXP-4 | In 3.1 syntax `=` in a condition is assignment; the `=`-as-equality rule is Toolkit 2.x only. | The one 3.1 site reads as assignment-then-test; 293 Toolkit 2.x sites are equality. |
| EXP-5 | `:` is legal only in the ternary, a label, a case label, an access label, a class base list and the `::` scope separator; `.` is not an operator. | Each symbol gets one job; no corpus conflict. |
| EXP-6 | Indexing is a postfix that may follow a call result, a member or another index; multi-dimensional and string-keyed maps are allowed. | 14 corpus index sites, all `name[var]`; the grammar was prose-only. |
| STX-4 | Braces are required; `for` parts may be empty. | No brace-less bodies and 6 complete `for`s; an empty part is harmless and C-like. |
| STX-5 | Labels are function/program scoped; `branch` never crosses a function boundary. | No corpus labels; matches `branch(:label)` and `setErrorHandler(:label)`. |
| STX-6 | `}` terminates the statement before it. | No uses; makes `{ x = 1 }` and a last statement before `}` well-formed. |
| STX-7 | Loose text lines and `#Mwin` unquoted args exist only in legacy files; they are the frontends'/converter's job. | Two spec examples fail even leniently; 113 loose lines are legacy. |
| FUN-5 | No default parameter values, no variadics, no declared return types, no overload by type. | Nothing in the corpus or the section uses them. |
| FUN-6 | `inline` has no effect beyond its hint. | No uses; nothing observable can differ. |
| FUN-7 | `end()`/`done`/`stop` end the program whose code is running, immediately, abandoning its pending frames; `run(prg)` ends the caller before starting the new program, so `end()` in it finishes the whole chain. | Corrected to extraction fact R2-Q20; the corpus has 5 `end()` calls and 1 `run()` and no counter-example. |
| PRG-1 | `system.prg` is an ordinary library, loaded only by `#include` or a `system.`/implicit call; the `system.` prefix is the engine namespace. | The demo copy is referenced by nothing; `#system.pause` is the engine's. |
| PRG-2 | An empty file and a file with no final newline load; a first byte of `0x00` marks a pre-compiled file. | All 10 corpus files load; none starts with `0x00`. |

**Deferred — a later entry rules these doc-first, before it writes code.**

| ID | Affected entry | Note |
|---|---|---|
| SEM-1, SEM-2 | 3.12 | `kill` forms (element, whole array, variadic) and the `until` check-first reading. The forms the corpus settles are stated in §9.3 and §9.5 so the parser can be written; entry 3.12 confirms the binding semantics. |

**Ruled by a later entry (doc-first, before any code).** Each row below was deferred to an implementing entry and is now settled in its own docs commit inside section 9; the section named carries the rule.

| ID | Entry | Rule |
|---|---|---|
| OOP-1 … OOP-9 | 3.6 | Class and object syntax and semantics: assignment, lifetime, lookup order, operator dispatch, inheritance and access labels (§9.7, §9.17). |
| ERR-1, ERR-2 | 3.7 | Handler, label and `resume` semantics, and which failures are catchable, including modulo by zero (§9.8). |
| MOD-1, MOD-2, MOD-3 | 3.8 | The unqualified name after an include, include repeats, cycles and missing files, and the redirect chain (§9.6). The name-clash ordering keeps the owner's last-wins rule, recorded there as a deliberate departure from the legacy first-wins order. |
| THR-1, THR-2, THR-3 | 3.9 | The sleep unit, the `source`/`target` lifetime and the snapshot "step" definition (§9.15). |
| SEM-3, SEM-4, SEM-5, SEM-6 | 3.12 | Comparison and conversion, scope and visibility, unset reads and array elements, and by-reference write-back (§9.16). |

**Owner review list.** The rulings below are judgement calls rather than corpus results, and the owner should weigh them
hardest: EXP-2 (the precedence of `^` and of the bitwise operators), EXP-4 (`=` in conditions and its dialect gate),
LEX-3 (`!=` versus a `!` sigil), LEX-7 (where board constants resolve and what the cache keys on), FUN-7 (`end()`
unwinding across `run()`), FUN-1 (typed parameters ignored), STX-4 (braces required, empty `for` parts), STX-5 (label
scope) and PRG-1 (`system.prg`); and, from the later rulings, the in-function error-label scope (ERR-1), the last-wins
name-clash ordering (MOD-1) and the `file.`-qualified call (MOD-2), the nearest-tick sleep rounding (THR-1), the
per-thread `source`/`target` pair (THR-2), the exact number format (SEM-3, SEM-5), and the class rules: the transitive
base order (OOP-8), freeing an object at the end of the tick it becomes unreferenced (OOP-5), freeing an object after its
own destructor (OOP-5), the handle-numbering rule (OOP-5) and rejecting `protected` at load (OOP-9). The ownership
choices in §9.13 add one more. Change any of them at the `<!-- OWNER: … -->` note that carries it.

### 9.13 Built-in ownership for names with no single owner

The catalogue in §9.11 groups names by capability, not by which part of the engine implements them, and a few names fell
between two owners. This is the map the build uses so that every name resolves exactly once. It follows the
command-effect catalogue's proposal; where it differs from a §9.11 group label, this map wins.

* **Input** (`wait`, `get`, `mouseClick`, `mouseMove`, `scan`, `mem`, `clearBuffer`, `setButton`, `checkButton`,
  `clearButtons`) belongs to the **movement-and-input** part. The `input.key` and `sleep` wait *kinds* those commands
  yield are the **VM's** (the VM owns the wait registry); the built-in itself is the input part's.
* **Cursor maps and the mouse cursor** (`createCursorMap`, `cursorMapAdd`, `cursorMapRun`, `killCursorMap`,
  `cursorMapHand`, `mouseCursor`) belong to **board-rendering**, even though §9.11 files them under Input: they draw onto
  the `ui` surface, so the section owner decides.
* **`wait`** is the input part's built-in and its `input.key` wait kind is the VM's — a split name, both parts stated.
* **`dirSav`** (the save/load picker) belongs to **menu-and-save**, which owns the save list and the `menu.screen` wait;
  board-rendering supplies the surface it draws on — a split name.
* **Game lifecycle** (`reset`, `start`, `mainFile`, `win`, `gone`, `over`) belongs to **board-rendering**, which owns
  boot, reset and quit. §9.11's "Game state" group does not imply the menu part. <!-- OWNER: §9.13 game lifecycle — alternatives: leave these with menu-and-save (where the catalogue guessed) or move them to board-rendering (the proposal). Decided: board-rendering, to match the boot/reset/quit owner. -->
* **`menuGraphic`** belongs to **menu-and-save**, not battle, even though §9.11 lists it under Battle; `internalMenu`
  and `fightMenuGraphic` stay with menu-and-save and battle respectively.
* **`godos`, `dos` and `windows` are obsolete and dropped**: no owner registers them, and no game needs them to resolve.
* The remaining names the catalogue's ownership table flags as ambiguous (`itemCount`, `giveExp`, `sourceHandle`,
  `targetHandle`, `sourceLocation`, `targetLocation`, and the party/player movement names) are owned as that table says:
  movement-and-input for the sprite and player movement names, battle for the fight stat writes, the VM for the
  source/target handle reads.

<!-- OWNER: §9.13 — the owner should confirm the game-lifecycle move (to board-rendering) and the two split names (`wait`,
`dirSav`) hardest; the rest follows the catalogue. If the game-lifecycle names stay with menu-and-save, edit this bullet
and the catalogue together. -->

### 9.14 Follow-ups outside this document

The amendments and rulings change `format-spec.md` only. Other documents still carry statements they contradict or complete, and each needs its own docs commit:

1. **ADR 0004, decision 1** says Toolkit 2.x used `< >` block delimiters. It did not: `< … >` with `then` is Toolkit 1.x; Toolkit 2.x uses `{ }` (§9.9). That sentence in the ADR needs correcting.
2. **`system.prg`'s role and the ownership map** are recorded in §9.12 and §9.13 here; the epic and architecture documents that name an owner should be checked against §9.13 when those entries are planned.
3. **AD-2's "`[ASSUMPTION: 60 Hz; rounding values are Deferred]`" is now ruled.** The 60 Hz tick and the seconds-to-ticks rounding are fixed in the thread rulings (§9.15); the spine should drop the assumption and the "rounding values are Deferred" clause.
4. **The spine's Deferred list still carries the per-tick budget and the legacy seconds-per-step → ticks conversion as unruled** (owners `rpgcode-vm` and `movement-triggers`). The settling rules are §9.15; the spine line should be marked done, keeping the budget's *number* provisional.
5. **AD-7's `ProgramRef` needs a field for a program's ordered run-time include list**, so a snapshot restore rebuilds the same include set (§9.6). Without it, a run-time `include()` cannot be reproduced.
6. **AD-7's compiled-program cache key must cover the redirect table in force at compile time** (§9.6), so a restore does not silently rebind a program compiled before a later `redirect`.
7. **AD-10's `GameState` sections carry no VM-step counter**, while §9.15 defines a snapshot "step" as one VM instruction; the entry that adds per-step snapshot comparisons must place that counter or fold it into the time section.

Deferred by design: only the runtime-meaning questions `SEM-1` and `SEM-2` in §9.12 remain for entry 3.12's own docs commit; the class-and-object, error-handling, module and thread questions listed there are now ruled (§9.6, §9.7, §9.8, §9.15, §9.16, §9.17).

**References for this amendment.** The rulings above come from the RPGCode language-readiness study (the 12 doc-fix
proposals and the ambiguity list), the Toolkit 2.x coverage study and the TK2/community material survey in
`_bmad-output/initiative-rpgtoolkit-reawakened/epic-rpgcode-vm/discovery/`, the command-effect catalogue (the ownership
map), the guard-rail on clean-room provenance (`docs/guardrails.md`, G7), and [ADR 0004](adr/0004-script-ast-step-ir-and-plugins.md).

---

### 9.15 Threads (ruled by entry 3.9)

This subsection settles the three thread questions the code needs before it is written: the time unit of a sleep, who owns the `source` and `target` handles, and how a snapshot counts time while a thread is preempted. Each rule is marked **legacy behaviour** (the extraction fact that fixes it) or **our rule** (with the reason it departs). Terms used below: a **tick** is one fixed simulation update, 60 of them a second, and it runs a whole phase list; a **VM step** is one instruction the interpreter executes, so a tick holds many steps; a **thread** is one independent RPGCode execution with its own frames; a **wait** is the plain-data record a blocked thread holds until something wakes it.

**THR-1 — the sleep, its unit and wake order.**

* `threadSleep(id, seconds)` takes a number of real seconds, and a fraction is allowed. A duration of exactly `0` (or `-0`, which the rebuild normalises to `0`) means sleep until `threadWake`. `threadSleepRemaining` reports the time left in seconds, or `0` while the thread sleeps indefinitely or is not sleeping. — legacy behaviour (R2-Q23).
* **Our rule — the tick formula.** A positive duration is converted to whole ticks with exactly this formula and no other rounding:

  `ticks = max(1, floor(seconds * 60 + 0.5))`

  using a double multiply and `Math.floor`/`Math.max` only.
  * Reason: the legacy engine truncated seconds to whole milliseconds and woke on a wall clock (R2-Q23), which cannot be replayed. A stated formula removes the "halfway" ambiguity (the decimal half is not the binary half), keeps the error under half a tick, and stops a small positive sleep from aliasing the indefinite sleep.
* A negative or non-finite duration, or one whose tick count would exceed 2^53 − 1, is a catchable runtime error; a tick must stay an exact integer. — **our rule:** legacy left a negative duration undefined (it became a huge wait). No sleep is entered, and the thread continues with the next VM step unless a handler runs.
* **Our rule — the end tick.** The wait stores the absolute end tick `T + ticks`, where `T` is the tick in progress when the call runs. A one-tick sleep therefore ends in the next tick: the wait phase of tick `T + 1` sees `now >= end` and wakes the thread.
* **Our rule — remaining time.** `threadSleepRemaining` returns `(end − now) / 60`, unrounded, and `0` for an indefinite or not-sleeping thread.
* **Our rule — wake order.** When several threads are due to wake on the same tick they resume in ascending thread id. Legacy stepped threads in an unspecified order (a pointer-ordered set); ascending id is deterministic and matches the wait phase, which polls waiting threads in ascending id.

**THR-2 — the `source` and `target` handles.**

* Legacy kept `source` and `target` as two engine-wide slots shared by everything: the code that started an entity event (an item's thread, an equip, a sprite program, a fight) set them and restored them afterwards, a plain thread left them alone, and `tellThread` code saw whatever the caller had left there. — legacy behaviour (R2-Q24).
* **Our rule — one pair per thread, in state.** Each thread carries its own `source` and `target`, part of the snapshot, so a thread restored mid-run sees the same context.
  * An entity event (an item's own thread, an equip or a remove, a sprite-triggered program, a fight) sets the pair on the thread that runs that event's program, for the program's duration, and the previous values are restored when it ends. A plain thread has `null` for both.
  * The `"source"` and `"target"` special handles read those slots; `sourceHandle()` and `targetHandle()` return `0` when a slot is `null`.
  * `run()` does not change the pair. — legacy behaviour (R2-Q24).
  * Reason this departs from legacy: the shared slots make one thread's context depend on unrelated events and cannot be replayed; per-thread slots are deterministic.
* **Our rule — `tellThread` is queued, not immediate.** `tellThread(id, code)` stores the injected code on the target thread, which runs it at its next turn in the threads phase, spending the target thread's own budget and seeing the target thread's `source` and `target`; the caller's step is not interrupted. Legacy ran the code at once, inside the caller's moment, with the caller's slots; queuing keeps a step's outcome independent of another thread's state, which a deterministic replay requires.

**THR-3 — what a "step" is, and the preemption budget.**

* **Our rule — a step is one VM instruction.** In this spec a `step` is one instruction the VM executes, and it is not the same as a `tick`, which is one fixed simulation update (the whole phase list). A snapshot may be taken between any two steps, and a test that compares "the same state hash after N steps" counts VM steps, not ticks.
* **Our rule — the budget.** A thread's preemption budget counts the VM steps that thread runs in one tick. A thread that reaches the budget without yielding keeps its state and continues at the next tick, so being preempted is not an error.
* **Our rule — waiting and the budget.** A waiting thread runs no VM steps and so uses no budget. The wait phase polls waiting threads in ascending id before the threads phase, so a thread that wakes in a tick runs in that same tick and spends that tick's budget.
* The budget's number stays provisional; the entry that implements threads tunes it against the demo, together with the movement entry that shares it.

**References.** R2-Q23, R2-Q24 (`docs/provenance/facts-round-2.md`); the engine-provided variables and the thread operations in §9.10 and §9.11; AD-2 (fixed tick), AD-7 (`Thread.source`/`target` in state), AD-9 (one wait contract, ascending-id polling) and AD-26 (phase list and the per-tick budget) in the architecture spine.

---

### 9.16 Runtime meaning (ruled by entry 3.12)

This subsection fixes how values are compared and converted, what scope a variable has, what an unset value reads as, and how a by-reference output is written back. Each rule is marked **legacy behaviour** (the extraction fact that fixes it) or **our rule** (with the reason it departs). Terms used below: a **value** is either a number (a double) or a string; the **unset value** is what a never-assigned variable or a failed call produces; a **numeric context** is arithmetic, a numeric comparison, `castNum`, a numeric argument or an array index.

**SEM-3 — comparison and conversion.**

* A value is a number or a string; a variable that was never assigned counts as a number. — legacy behaviour (R2-Q12).
* `==` and `~=`: numeric when both sides are number-typed, otherwise both become strings and compare exactly, byte for byte, case-sensitively. — legacy behaviour (R2-Q12).
* `<`, `<=`, `>`, `>=` always compare numerically, with a string side converted by the string-to-number rule below; string ordering is not available. — legacy behaviour (R2-Q12).
* `&&`, `||` and `!` use numeric truthiness, and both sides of `&&`/`||` are always evaluated (there is no short-circuit). — legacy behaviour (R2-Q12).
* **String to number — our rule (the grammar legacy left open):** skip leading spaces and tabs, then match the longest of these: an optional `+` or `-`, digits, an optional `.` with digits after it, and an optional `e`/`E` with an optional sign and at least one digit. So `.5` and `5.` count, `1e` matches only the `1`, and a hex form, `inf`, `Infinity` and `nan` do not match. The matched prefix converts to the nearest double, and the rest of the string is ignored; no match gives 0.
* **Number to string — our rule (the full algorithm):** a finite number is written with six significant digits.
  * Let `X` be the decimal exponent, the position of the leading digit, so `10^X ≤ |v| < 10^(X+1)`.
  * Use exponent form when `X < -4` or `X ≥ 6`; otherwise use plain decimal form.
  * Round the exact value to six significant digits, to the nearer; a value exactly halfway rounds away from zero, so `1234565` gives `1.23457e+06`.
  * Drop trailing zeros in the fraction and any trailing point. Exponent form is one leading digit, then up to five more, then `e`, then the exponent's sign (`+` or `-`, always written) and at least two digits (`+06`, `-07`, `+123`).
  * `0` and `-0` print as `"0"`; positive infinity, negative infinity and NaN print as `"Infinity"`, `"-Infinity"` and `"NaN"` (all three are reachable through `1/0` and `0/0`).
  * No locale call (`Intl`, `toLocaleString`, `toLocaleFormat`) is used at any step.
  * Reason: the legacy engine printed six significant digits through its C runtime, so `castLit` and string concatenation differed by build and ties fell a different way; one stated algorithm makes every runner print a number identically.
* **The name-read truncation.** Reading a number *from a variable by name* — not from a literal or a computed temporary — truncates it toward zero to a whole 32-bit integer before it is used in any numeric context. Assigning it and converting it to a string keep the full value. — legacy behaviour (R2-Q12); **our rule** pins the conversion: JavaScript's `ToInt32` (wrap modulo 2^32; NaN and ±Infinity become 0), because the legacy out-of-range result depended on the build and a rebuild must agree with itself. An array index that comes from a name read is truncated the same way, so the key `a[x]` uses is the truncated value.
* Division by zero (`/`) gives infinity or NaN, not an error. — legacy behaviour (R2-Q12).
* `%`, the shifts and the bitwise operators first convert their operands with `ToInt32` (truncating), and a shift count is taken modulo 32. — legacy behaviour (R2-Q12); **our rule** pins an out-of-range input or shift count to JavaScript's defined 32-bit result instead of the legacy dependence on the host CPU, because two runners must agree. A zero divisor in `%` is the catchable error ruled in ERR-2.
* `castLit`, `castNum` and `castInt` take one value and return the conversion, or take a second argument naming a variable to store it in. — legacy behaviour (R2-Q12).
* Worked values (all legacy behaviour, R2-Q12):

| Expression | Value |
|---|---|
| `"abc" == "ABC"` | 0 |
| `5 == "5"` | 1 |
| `"5.0" == 5` | 0 |
| `"abc" < "abd"` | 0 |
| `"10" < "9"` | 0 |
| `"Hello " + 32` | `"Hello 32"` |
| `1 + "2"` | `"12"` |
| `7 / 2` | 3.5 (so `1 / 0` is infinity) |
| `castInt(-2.7)` | -2 |
| `castInt("3.9abc")` | 3 |
| `castNum("12abc")` | 12 (`castNum("abc")` is 0) |
| `castLit(2.50)` | `"2.5"` |
| `castLit(1234567)` | `"1.23457e+06"` |

**SEM-4 — scope and visibility.**

* Inside a frame, a name is looked up in this order, first match wins: an explicit `:name` global; a parameter; a member of the current object (inside a method); then an ordinary name, which is the frame's local if one exists and otherwise the global of that name, created if it is missing. — legacy behaviour (R2-Q13); the member step belongs to the classes ruling (§9.17).
* Locals live in one flat list per call and are discarded on return. There is no block scope, so an `if` and a loop share the frame. — legacy behaviour (R2-Q13).
* A plain assignment creates a global, unless `autoLocal(true)` is in force. — legacy behaviour (R2-Q13).
* `local(x)` inside a function is visible only in that call, from where it is declared until return; `local(x)` at program top level is visible only to that program's own top-level code, whose functions see the global of the same name instead; `global(x)` reaches the global table past a same-named local; `autoLocal(true)` makes a new name local to the current frame but still resolves a name that already exists as a global. — legacy behaviour (R2-Q13).
* A parameter is visible in its frame only; a class member is visible by name inside its object's methods. — legacy behaviour (R2-Q13).
* A `run()` program is a separate program with its own locals and the shared globals; an included file is merged into the including program, so an included function behaves as a local one. — legacy behaviour (R2-Q13).
* `autoLocal` is set per program and is not reset at a function boundary. — legacy behaviour (R2-Q13).
* **Our rule:** the global table is the VM's globals state section and a frame's locals are its own list, both inside the snapshot, so scope state restores with the snapshot.

**SEM-5 — unset variables and array elements.**

* Reading a variable that was never assigned yields the unset value: it behaves as 0 for arithmetic and as the empty string when a string is wanted, and it counts as a number, so `==`/`~=` against a number is numeric and against a string compares with the empty string. The read also creates the variable. — legacy behaviour (R2-Q14).
* Each array element is its own variable, named by the array name plus the formatted index, so `a[1]`, `a["1"]` and `a[1.0]` are the same element; reading one creates it; an unset element reads unset; there is no bound. — legacy behaviour (R2-Q14).
* An index is held as text in a fixed numeric format, and a string key keeps its case, so `a["Key"]` and `a["key"]` differ even though a bare identifier index is lower-cased like any name. — legacy behaviour (R2-Q14).
* **Our rule:** the index format is the number-to-string rule above (six significant digits), so every runner keys an array the same way.

**SEM-6 — by-reference write-back.**

* A built-in's output parameters are variable names. There is no atomic write-back: each is resolved by the ordinary scope rules, created if it does not exist, and written left to right in parameter order. — legacy behaviour (R2-Q15).
* For the getters that return several values, every output variable is given numeric type before the object is looked up, so a failed lookup leaves them numeric (0 or unchanged) rather than untouched. — legacy behaviour (R2-Q15).
* A non-variable argument in an output position is treated as a variable named by its text. — legacy behaviour (R2-Q15).
* **Our rule:** every built-in declares its `byRef` parameters in its registry entry, and the catalogue test asserts that each getter taking a trailing output declares one; a name not listed in the catalogue has no output parameters. A getter's trailing output is its last parameter and is also returned normally.
* The getters with a single trailing optional output are: `appPath`, `asc`, `castInt`, `castLit`, `castNum`, `charAt`, `chr`, `cos`, `createCanvas`, `createCursorMap`, `createItem` (position), `cursorMapRun`, `fileEof`, `fileGet`, `fileInput`, `get`, `getBoardName`, `getBoardTile`, `getBoardTileType`, `getDp`, `getFontSize`, `getFp`, `getGp`, `getHp`, `getItemCost`, `getItemDesc`, `getItemName`, `getItemSellPrice`, `getLevel`, `getMaxHp`, `getMaxSmp`, `getSmp`, `getThreadId`, `global` (second argument), `itemCount`, `lcase`, `left`, `len`, `local` (second argument), `log`, `mid`, `prompt`, `random`, `replace`, `right`, `sin`, `sourceHandle`, `sqrt`, `tan`, `targetHandle`, `thread` (third argument), `threadSleepRemaining`, `trim`, `ucase`, `wait` (all legacy behaviour, R2-Q15).
* The getters that write several output parameters (positions one-based) are the location, vector, colour, path, corner, resolution, pixel and cursor readers — for example `playerLocation(handle, x, y, layer)` writes parameters 2–4, `getColor(r, g, b)` writes 1–3, and `pathFind(x1, y1, x2, y2, result)` writes parameter 5. — legacy behaviour (R2-Q15); the extraction's list (`docs/provenance/facts-round-2.md`, R2-Q15) names every one and is the authority the registry follows.
* `split(string, delimiter, array)` writes array elements 0 to n−1 as separate variables and returns the count plus one. — legacy behaviour (R2-Q15).

**References.** R2-Q12, R2-Q13, R2-Q14, R2-Q15 (`docs/provenance/facts-round-2.md`); §9.3 (values and variables), §9.10 and §9.11 (engine variables, the catalogue); AD-7 (globals and frame locals in state), AD-8 (`byRef` on a `ParamSpec`), AD-10 (one owner per state section) in the architecture spine.

---

### 9.17 Classes and objects (ruled by entry 3.6)

This subsection settles the class and object questions the code needs before it is written: assignment, lifetime, lookup order, operator dispatch, inheritance and access. Each rule is marked **legacy behaviour** (the extraction fact that fixes it) or **our rule** (with the reason it departs). Terms used below: a **class** is a set of members and methods; an **object** is a live instance named by a small number, its **handle**; a **member** is a stored field and a **method** is a callable definition; a **base** is a class another class inherits from; **dispatch** is choosing which method definition a call runs.

**OOP-4 — assignment between objects.**

* An ordinary assignment stores the right-hand value, including its object handle and type, into the left-hand variable; afterwards both variables name the same object and no member is copied. — legacy behaviour (R2-Q16).
* If the left-hand variable currently holds an object whose class defines `operator=` taking one parameter, that method runs instead, with the left object as `this` and the right value as its argument, and the plain store does not happen; a class with no such method stores the handle silently. — legacy behaviour (R2-Q16).
* There is no copy constructor: a one-parameter constructor runs only when an object is built by name (`Cls(a)`), never as part of an assignment. Assigning a fresh construction to a variable that is unset or holds a non-object is a plain handle store. — legacy behaviour (R2-Q16). The earlier "copy constructor" wording is dropped, since neither the corpus nor the source has one.

**OOP-5 — object lifetime.**

* `release()` runs the destructor of the object's **own** class, and only if that class declared one; base-class destructors never run and there is no chaining. — legacy behaviour (R3-Q2, R2-Q17).
* **Our rule — free after the destructor.** When the destructor returns (or at once, when the class has none), the object's members and its handle are freed. Legacy freed an object only when its class had no destructor, and otherwise left it alive; freeing it keeps state bounded, keeps snapshots small, and makes the handle table the whole of the object state.
* `kill(obj)` removes the variable name only: it runs no destructor and frees nothing at that moment. — legacy behaviour (R2-Q17).
* **Our rule — unreferenced objects.** When no global, frame local, operand or member of another object names an object's handle, that object is freed at the end of the tick in which it became unreferenced, in a fixed order, and no destructor runs. Two objects that name each other are never freed. Legacy used a background collector that woke every ten minutes and never ran destructors (R2-Q17); a deterministic per-tick pass replaces it because a timer cannot be snapshotted, and the format spec previously said objects were never collected.
* At program end (`end()`, or falling off the program's end) the program's frames are dropped and its objects are freed by the same pass; no destructor runs. — legacy behaviour (R2-Q17).
* **Our rule — handle numbers.** A new object takes the smallest number that is not in the handle table and is greater than the table's size. With an empty table that is 1; with handle 1 live and handle 2 free, the next is 2; with handle 1 free and handle 2 live, the next is 3. — the numbering rule is legacy behaviour (R3-Q2); **our rule** is that it needs nothing but the current handle table, because our always-free `release` keeps every freed handle out of it, so a restore allocates the same next number.

**OOP-6 — where a name resolves.**

* Inside a method, a variable name is looked up in this order, first match wins: an explicit `:name` global; a parameter; a member field of the current object's class (its own and inherited, any visibility); then a frame local or, failing that, the global of that name. — legacy behaviour (R2-Q18).
* An unqualified call `f(...)` resolves in this order: a built-in; inside a method, a method of the current object's class with that name and parameter count (an implicit `this` call); a script function of the program or its includes; a plugin that claims the name; otherwise the unknown-call error. — legacy behaviour (R2-Q18). (A `file.`-qualified call is the one exception, and reaches that file's own definitions first; see the module ruling.)
* `this` is available inside a method as an ordinary local named `this`, and `this->x` need not be written. — legacy behaviour (R2-Q18).
* Reaching a non-public member or method from outside its class is an error; the access levels are under OOP-9. — legacy behaviour (R2-Q18).

**OOP-7 — operator dispatch.**

* The first operand decides: when it is an object, the interpreter looks in that object's class for `operator` plus the operator's symbol, taking exactly one parameter for a binary operator and none for a unary one; only the left operand is consulted, and the parameter count tells a unary form from a binary one. A missing method is a runtime error except where a rule below gives a fallback. — legacy behaviour (R2-Q19).
* `a == b` and `a ~= b` use `operator==` and `operator~=`, and fall back to comparing the handles when the method is missing. `a = b` uses `operator=`, else a plain handle store. `a[i]` uses `operator[]`, else a plain element variable. A compound assignment (`+=` and the rest) calls its own method (`operator+=`) and does not fall back to the plain binary method. — legacy behaviour (R2-Q19).
* `a[i] = v`: `operator[]` is consulted first on `a`; when it returns a reference, the store goes through that reference and `operator=` runs only if the referenced variable currently holds an object, and otherwise the value is stored directly. — legacy behaviour (R2-Q19).
* `->`, the ternary, call-style `()` and any string or number conversion operator are never dispatched; a `$` or `!` after a name is a sigil (the `operator$` and `operator!` declarations are never consulted for a conversion). — legacy behaviour (R2-Q19).

**OOP-8 — inheritance and construction.**

* Only the constructor of the class named in the construction call runs; a base constructor never runs before or after it, and there is no base sub-object, so a derived constructor assigns inherited members itself. — legacy behaviour (R3-Q1).
* A derived class's own method (same name and parameter count) beats a base's; when several bases define the same name and parameter count, the earliest-written base wins. — legacy behaviour (R3-Q1).
* A call on an object uses the object's **actual** class, not the declared type of the expression. There is no syntax to call a method's base version; a call is a plain name and resolves to the override. — legacy behaviour (R3-Q1).
* **Our rule — the transitive order.** A class's methods and members are its own definitions plus those of its ancestor classes. The ancestors are collected by a walk from the class that takes each base list in declaration order and uses a class only the first time it is met; the class's own definition wins, and between two ancestor definitions of the same name the one met first in that walk wins. This is deterministic and independent of class names, replacing the legacy order that depended on how the class names happened to sort (R3-Q1, inferred for the transitive case).
* A method declared `= 0` is pure virtual and makes its class abstract. — legacy behaviour (R3-Q1). **Our rule:** constructing an abstract class is a catchable runtime error of the invalid-object class in the failure table.

**OOP-9 — access labels.**

* A `class` body starts `private`; a `struct` body starts `public`; a member with no label takes the current access; the `public` and `private` labels switch it for the rest of the body. — legacy behaviour (R3-Q1).
* `protected` is not a word of the language. — legacy behaviour (R3-Q1). **Our rule:** the loader rejects it with a located diagnostic, because a file that uses it is not valid 3.1 and ignoring it would quietly change a program's meaning.
* Access is checked at each access, at run time, and a blocked access is a catchable runtime error. An access from outside any method, or from a method running on a different class, needs `public`; a method of the same class may also reach `private`. — legacy behaviour (R3-Q1).
* The check compares class identities, not instances: any method of class `C` may reach the private members of any `C` object. — legacy behaviour (R3-Q1).

**References.** R2-Q16, R2-Q17, R2-Q18, R2-Q19 (`docs/provenance/facts-round-2.md`); R3-Q1, R3-Q2 (`docs/provenance/facts-round-3.md`); §9.3 (values and variables), §9.5 (functions, `return &`, labels), §9.6 (the `file.`-qualified call), §9.7 (the syntax), §9.8 (the failure table), §9.16 (comparison and scope); AD-8 (call precedence), AD-10 (the vm state section) in the architecture spine.

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

**Partial MCUs and dummy blocks.** An interleaved scan walks the frame's MCU grid, `ceil(width / (8·maxH)) × ceil(height / (8·maxV))` MCUs, and every MCU carries that component's whole `h × v` blocks — but a component's own **block grid**, the grid its sample plane holds, is `ceil(width·h / (8·maxH)) × ceil(height·v / (8·maxV))`. The two agree only when the dimension is a whole number of MCUs; otherwise the MCUs along the right and bottom edges carry **dummy blocks** past the component's grid (T.81 §A.2.2), which the entropy stream gives no way to skip. A dummy block is decoded to keep the reader in step and then **dropped**: its samples are not part of the picture, and storing them at the plane's flat offset would land in the next plane row and silently overwrite samples already decoded. Upsampling reads only the component's real samples — the sample for pixel `(x, y)` is `(floor(x·h / maxH), floor(y·v / maxV))` — so no padding column or row is ever treated as picture.

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

Every form below carries the same files — the project folder of §1.5 plus the main file — and every one is **untrusted input**: a loader bounds it with §13.2's limits before allocating or parsing anything, treats a nested archive as an ordinary file (L14), and never throws.

### 13.1 Package forms

* **Loose folder.** A directory whose **own root is the package root**: the project folder's contents (the §1.5 type folders — `Tiles/`, `Boards/`, `Chrs/`, `Item/`, `Enemy/`, `SpcMove/`, `StatusE/`, `Bkrounds/`, `Misc/`, `Bitmap/`, `Media/`, `Prg/`, `Font/`, `Plugin/`) sit directly in it, together with the main file, *not* nested under `Game/<project>/`. The core performs no I/O (G2), so the host lists the folder's entries; each is a **file**, a **directory** (counted toward the entry limit but never served) or a **link** (refused, L23). The stored `projectPath` is ignored, exactly as for a `.tpk` — a package's root *is* the project folder. The folder form is subject to the same limits and path rules as an archive (L22–L26), so a game behaves identically whichever form it arrived in.
* **PakFile `.tpk`:** a standard ZIP archive with the project folder plus the main file. The **archive root is the project folder**: the §1.5 type folders sit at the root (their contents, not wrapped in a folder named after the project), and a legacy pak embeds the main file at the archive root as `main.gam`. Entry names use `/` and follow §1.5's case and separator rules. When playing from a pak, ignore the main file's stored `projectPath` (§1.5). <!-- OWNER: chose "project folder's contents at the archive root" over "the project folder nested under its own name" because the package resolver keys a reference at the package root (the project folder is the root, AD-5), §1.5 already says a pak embeds `main.gam` inside it, and this project's own writer emits the flat form; §13's one sentence fits both readings and no sample package pins it. -->
* **Standalone EXE:** an engine executable with a ZIP appended. Its **last 12 bytes** are a trailer:
  * `[end - 12 .. end - 9]`: ASCII string `CMP1` (4 bytes: `0x43 0x4D 0x50 0x31`).
  * `[end - 8 .. end - 5]`: `i32 offsetOfZip` (4 bytes, **little-endian**). This is the original executable length and marks the starting byte offset of the appended ZIP archive.
  * `[end - 4 .. end - 1]`: `i32 zipLength` (4 bytes, **little-endian**). This is the exact byte length of the appended ZIP archive.
  Extracting `[offsetOfZip, offsetOfZip + zipLength)` yields the clean game ZIP, laid out as a `.tpk` above. A rebuild can import legacy standalone games this way.
* **Setup ZIP:** a plain ZIP of the `Main/` and `Game/` folders.
* **Toolkit 2 Professional standalone EXEs are not supported.** A game exported from Toolkit 2 Professional as one EXE is a small engine launcher with a compressed payload in a private format. It has no `CMP1` trailer, and its data is not a plain appended ZIP. A self-extracting installer such as `zip.exe` is a different case: it has no `CMP1` trailer either, and its ZIP starts partway into the file, behind the launcher, at an offset that no trailer records. The loader refuses all of these with the "missing `CMP1` trailer" rule (L21) and its message says the game's author must extract the assets themselves, from the original project folder, its Setup ZIP or its `.tpk`. <!-- OWNER: chose to decline importing Toolkit 2 standalone EXEs rather than reverse-engineer their packer, because the same games are reachable through the Setup ZIP, `.tpk` and loose-folder forms and a private compressed payload would be guesswork. --> The evidence is five archived samples (`AMU_Aftermath`, `axeofyulon`, `Firesword13`, `GrandDragonElite`, `LegendofStorm`), none of which ends in `CMP1`, and one archived `zip.exe` whose ZIP starts at offset 24,054; a crawl of the whole archive found no EXE that carries `CMP1`. The `CMP1` form above stays the only standalone form this project reads.
* **Distribution package (this project's own):** a `.tpk`-compatible ZIP — the project folder at the archive root, exactly as for a `.tpk`, with the main file kept at its §1.5 path `Main/<game>.gam` <!-- OWNER: chose to keep our main file at its §1.5 path `Main/<game>.gam` (and name it in the manifest) rather than the legacy pak's root `main.gam`, because a legacy pak's embedded main is found by the engine and our package names it in `manifest.json`; a reader that accepts both forms ignores the difference. --> — that also holds a `manifest.json` at the archive root, next to the game files. The manifest is UTF-8 JSON with exactly three fields:
  * `schema`: a non-negative integer, the project schema version.
  * `main`: the in-package path of the main file, for example `Main/demo.gam`. It must name a game file in the archive and must not be `manifest.json` itself.
  * `index`: the in-package path of every game file except `manifest.json`, each listed once, in code-unit order. The order is the writer's, so that two writes of one asset tree are byte-identical (guard-rail G3): the caller's array order never reaches the file. A reader accepts the entries in any order, since it compares them as a set with `main`.
  Paths use `/` and follow §1.5 (matching ignores case and treats `\` as `/`). A reader checks that `main` and every `index` entry name a file in the archive and that no game file is missing from `index`, and it refuses a manifest with any other field. A legacy package has no manifest and loads without one; only packages this project writes are required to carry it.

### 13.2 Untrusted-package limits (L1–L26)

Games are untrusted input, so a loader bounds what a package can make it spend — bytes in, entry count, declared and actual sizes, compression ratio, path shape and the appended-EXE trailer — before it allocates or parses anything, and every rejection **names the rule it hit** so a failure, a code comment or a review finding can cite one row. The rules are numbered **L1–L26**; the loose-folder rows (L22–L26) restate the archive rows rather than widening them, so both forms accept and reject the same games.

**Every value is a proposal.** The numbers come from a 134-file, 6.3 MB corpus of two sample games plus `fflate`'s documented behaviour, and no sample ships a package, so the package numbers have no corpus evidence at all (the corpus only bounds the assets inside a package: largest file 430,086 bytes, max path depth 4 segments, max relative path 59 characters, max basename 47 characters). Change a value and its row together. <!-- OWNER: chose to make the discovery report's proposal values the spec's normative L1–L26 table because the code already enforces exactly these numbers under these ids, no sample package exists to measure them, and giving them ids is what lets a failure, a comment and a review finding cite one row; if you want a different value, it is a one-line change here and in `limits.ts`. -->

| # | Rule | Value |
|---|---|---|
| L1 | Max compressed input (the whole file, before parsing) | 256 MiB (268,435,456 bytes) |
| L2 | Max entries (files + directories) | 10,000 |
| L3 | Max single entry uncompressed size, checked before inflating | 64 MiB (67,108,864 bytes) |
| L4 | Max total uncompressed size (sum of declared sizes) | 512 MiB (536,870,912 bytes) |
| L5 | Max per-entry compression ratio (uncompressed ÷ compressed) | 100:1 (zip-bomb guard) |
| L6 | Max path length, UTF-8 bytes with `\` normalised to `/` | 256 |
| L7 | Max path depth (segments) | 16 |
| L8 | Max basename length (UTF-8 bytes) | 128 |
| L9 | Path escape (zip-slip) | reject an absolute path, a drive letter (`X:`), a `..` segment, a NUL, or a path that names nothing |
| L10 | Case-insensitive duplicates | reject two entries that differ only by case or separator |
| L11 | Encrypted entries (general-purpose flag bit 0) | reject |
| L12 | Compression methods | only 0 (stored) and 8 (deflate) |
| L13 | ZIP64 records (EOCD64 locator or `0xFFFFFFFF` sentinel) | reject |
| L14 | Nested archives | opaque: a nested `.zip`/`.tpk` is a file, never opened (nesting depth 0) |
| L15 | End-of-central-directory search window | last 65,557 bytes (22-byte record + 65,535-byte comment) |
| L16 | Declared size, before inflate | reject a declaration above L3 (defence in depth: L3 already refuses every entry that would reach it) |
| L17 | Declared vs actual size, after inflate | reject when the inflated length differs from the declared size |
| L18 | CRC-32 | verify the decoded bytes against the header's CRC-32 |
| L19 | Local-header / central-directory consistency | reject when name, method, compressed size or uncompressed size disagree; the same rule covers a corrupt central directory or end-of-central-directory record |
| L20 | Appended-EXE trailer validity | require `offsetOfZip ≥ 0`, `zipLength ≥ 0` and `offsetOfZip + zipLength ≤ fileLength − 12` |
| L21 | Appended-EXE trailer present | the last 12 bytes must start with `CMP1` |
| L22 | Loose folder: entry count | same as L2 |
| L23 | Loose folder: symlinks and reparse points | reject |
| L24 | Loose folder: total size | same as L4 |
| L25 | Loose folder: per-file size | same as L3 |
| L26 | Loose folder: path rules | same as L6–L10 |

---

## 14. Known ambiguities / test checklist

* The order of `speed`/`idleTime` differs between `.tem` (idle, then speed) and `.itm` (speed, then idle).
* Custom stances are serialized on disk as `str animation, str handle` across `.tem`, `.itm`, and `.ene`. (Legacy C++ inverted the key/value map read in `.ene` only).
* In `.ene`, custom stances count is an `i32` on disk, while standard stances upper bound is `5` (yielding 6 slots 0..5, where slot 5 is an unused editor boundary slot).
* In `.tem`, body slots are 7 bytes on disk: byte 0 is padding (0), followed by 6 body slots (1 head through 6 legs). Setting `maxLevel == 0` disables leveling entirely.
* In `.tem` and `.itm`, the vector bases count field is an upper bound stored as `1` (indicating 2 bases: collision base, then activation base).
* In `.brd`, the `closed` field is non-zero (specifically `-1` from legacy VB `CInt(True)`) for closed polygons and `0` for open polylines.
* In `.brd`, coordinate types are bitmask flags: `0` = 2D, `1` = iso stacked, `2` = iso rotated, `4` = pixel absolute (combinable with any of the first three). Isometric **detection** is `(coordType & 1) || (coordType & 2)` non-zero, but only the **iso-rotated** bit (2) expands the stored tile matrix to `(sizeX + sizeY)²` per layer; bit 1 and 2D store `sizeX × sizeY`, and bit 4 changes neither, so a reader keys the matrix shape on bit 2 alone (§4.2).
* In `.brd`, a run marker's following `i16` must be a LUT index `≥ 0`: a negative value (a marker whose cell index is itself a marker) is invalid and a reader reports it (§4.2).
* In `.brd`, a run that carries the traversal past the grid, and a shade layer whose records cover more cells than the grid, are **warnings**, not errors; the extra cells are kept and the stored runs are re-emitted verbatim (§4.2).
* Battle formats (`.bkg`, `.spc`, `.ste`) all share standard binary headers: `str magic, i16 major, i16 minor`, with binary detection at byte 12 (`.bkg`) or byte 16 (`.spc`, `.ste`).
* Standalone EXE appended ZIP trailer (`CMP1`) stores `offsetOfZip` and `zipLength` as little-endian 32-bit integers (`i32`).
* Main file layout (`.gam`): `<root>/Main/<game>.gam` is separate from project assets in `<root>/Game/<project>/`. The engine requires `.gam` to boot.
* Tile bitmaps store an extra padding row and column.
* The `fightingDisabled` flag in `.gam` is inverted.
* Shade-layer run records always carry an explicit count. The tile matrix uses negative counts.
* Tile LUT index 0 is reserved for "no tile" when the table exists; `lutUpperBound` `-1` means the board has no table at all, and then there is no index 0 (§4.2).
* Inline-RPGCode fallback for program/sprite program fields applies when the file is missing.
* Validate against `build/main/demo.gam` and project assets in `build/game/demo` and `build/game/Basic` from the legacy repo.

---

## 15. Toolkit 2 (2.x) formats

Toolkit 2 — the **2.x era** (2.0 to 2.2), the generation before the 3.x engine §1–§13 describe — is what most surviving RPG Toolkit games were made with, and the archive's 2.x games are why this section exists. Most of their data files are the same file kinds as §1–§13, but several are written as **line-oriented text** instead of the binary layouts: a header (magic, then major and minor) on its own lines, then one field per line, lines separated by a carriage-return/line-feed pair, no quoting and no length prefixes. Numbers are plain decimal; an empty line stands for an empty string or a zero; most groups have fixed repetition counts written out in full, empty slots included. A few extensions have no binary twin at all (`.fnt`), and two binary layouts in §2 and §6.1 were described with the wrong field widths for their 2.x versions. This section records all of it: the detection rule for the two forms (§15.1), each text layout with a short worked example (§15.2–§15.13), the corrections to §2 and §6.1 (§15.14), and the questions the evidence could not settle (§15.15).

**Evidence and process.** Every layout below cites either (a) the archive's own **data files** — reading legacy *data* is allowed, reading legacy *source* is not (G7) — with the number of files observed on disk, or (b) the reviewed clean-room extraction facts in `docs/provenance/facts-round-1.md` (the "entry 2" answers, ADR 0006). Each cited text file was read with the detection rule §1.3 states for its format and, where a worked example is given, parsed to end-of-file. File counts are for the six-game 2.x corpus the epic's gate uses — **FinalDestiny, LittleMan, BusDriver, Caoquest, School2Demo, ChimeranEmpire** — plus the official 2.20b demo where it adds a sample. No legacy source was opened for this section.

**Ruling summary.** Fourteen format questions are settled below and one is deferred. Eight are ratified by the data corpus alone; six are ruled here from a reviewed entry-2 answer with a data check on top; the `.ste` text form is deferred because the corpus has no text `.ste` sample at all. Six `<!-- OWNER: … -->` notes flag the judgement calls and name the alternative that was not taken.

| # | Section | Verdict | Because |
|---|---|---|---|
| GAM2 | 15.2 | ruled | entry-2 answer Q2, checked line-for-line against two games |
| BRD2 | 15.3 | ruled | entry-2 answer Q1, checked against 17 files in four games |
| ITM2 | 15.4 | ruled | entry-2 answer Q3, checked against all 16 text items |
| TEM2 | 15.5 | ruled | entry-2 answer Q4, checked against both text characters |
| FNT2 | 15.12 | ruled | entry-2 answer Q7, checked against all 5 font files |
| TST2 | 15.13 | ratified | the official 2.0 Tileset spec (`tst.html`) |
| ENE2 | 15.6 | ratified | 52 text enemies, all exactly 363 lines |
| ANM2 | 15.7 | ratified | 17 text animations, all exactly 160 lines |
| SPC2 | 15.8 | ratified | 8 text special moves, all exactly 13 lines |
| BKG2 | 15.9 | ratified | 23 text backgrounds, all exactly 845 lines |
| TAN2 | 15.10 | ratified | 33 animated tiles, all parse to the last byte |
| GPH2 | 15.11 | ratified | 6 v2 single tiles, runs sum to 32 × 32 |
| GAMB | 15.14 | ruled | entry-2 answer Q5, checked against all 15 binary `.gam` |
| TEMB | 15.14 | ruled | entry-2 answer Q6, checked against 14 of the 16 binary `.tem` |
| STE2 | 15.8 | **deferred** | no text `.ste` exists in the corpus (5 binary only) |

### 15.1 Telling the text form from the binary form

The rule is the one §1.3 already states: look at the byte at the format's own detection offset (the length of its magic, or a stated offset). If it is `0x00` the file is binary; if it is non-zero (a carriage return) the file is text. The table below collects the offsets for the formats this section covers, and what the corpus holds at each.

| Extension | Magic | Detection | Six-game corpus |
|---|---|---|---|
| `.gam` | `RPGTLKIT MAIN` | byte 13 non-NUL = text | 15 binary minor 2, 2 text |
| `.brd` | `RPGTLKIT BOARD` | byte 14 non-NUL = text (minor 0–1) | 144 binary minor 2, 17 text minor 1 |
| `.tem` | `RPGTLKIT CHAR` | byte 13 non-NUL = text | 16 binary minor 3–4, 2 text minor 2 |
| `.itm` | `RPGTLKIT ITEM` | byte 13 non-NUL = text | 87 binary minor 3, 16 text minor 1 |
| `.ene` | `RPGTLKIT ENEMY` | byte 14 non-NUL = text (minor 0) | 52 text minor 0, no binary |
| `.spc` | `RPGTLKIT SPLMOVE` | byte 16 non-NUL = text | 22 binary minor 2, 8 text minor 0 |
| `.ste` | `RPGTLKIT STATUSE` | byte 16 non-NUL = text | 5 binary minor 2, **no text sample** |
| `.bkg` | `RPGTLKIT BKG` | byte 12 non-NUL = text | 23 text minor 0, no binary |
| `.anm` | `RPGTLKIT ANIM` | byte 13 non-NUL = text | 16 text minor 0, no binary |
| `.fnt` | `RPGTLKIT FONT` | byte 13 non-NUL = text | 5 text, no binary seen |

Nothing in §15 changes the binary detection rules of §1.3 or the version rules of §1.4. A text file still carries `major` and `minor` on their own lines; for every text form seen the major is `2`, and the minor is `0`, `1` or `2` as the table in each subsection says. A text file has no NUL bytes.

### 15.2 Main file — text `.gam` (`RPGTLKIT MAIN`)

**2 files in the corpus**, BusDriver's `DEMO.GAM` and Caoquest's `caoquest.gam`, plus `main.gam` inside `devilsnight.tpk`; all three use the layout below and none uses the 17-character header `RPGTLKIT mainForm` the extraction found in one reader. Layout (entry-2 answer Q2, checked line for line):

| # | Lines | Field |
|---|---|---|
| 1 | 1 | magic `RPGTLKIT MAIN` |
| 2 | 1 | major (2) |
| 3 | 1 | minor (0) |
| 4 | 1 | registered flag (ignored) |
| 5 | 1 | **startupPrg** |
| 6 | 1 | runTimePrg |
| 7 | 1 | "use built-in menu" flag (ignored) |
| 8–10 | 3 | run key, menu key, interact key (ASCII codes) |
| 11 | 1 | **initBoard** |
| 12 | 1 | **initChar** |
| 13 | 1 | fightingDisabled (0 = fighting on) |
| 14–15 | 2 | multitask speed, memory protection (ignored) |
| 16 | 1002 | enemy list: **501 fixed records** of `enemy file`, `skill level`; an empty file name is an unused slot |
| 17–20 | 4 | fight type, chances, alternate-fight flag, fight program |
| 21–24 | 4 | an ignored field; game title; screen mode; an ignored field |
| 25–29 | 5 | gameOverPrg, **projectPath**, skin button image, skin window image, an ignored old target-platform field |
| 30 | 102 | extended run-time keys: **51 fixed records** of `key code`, `program` |
| 31 | 1 | an ignored field (old registration code) |
| 32–34 | 3 | extend-to-full-screen, resolution code, **plugin count n** |
| 35 | n | one enabled flag per plugin slot (slot `i` = `tkplug<i>.dll`) |
| 36–41 | 6 | day/night use, day/night type, day length, disable-protect-registered, an ignored old parallax field, language file |

**The whole tail from row 32 on is optional.** `DEMO.GAM` stops after row 31 (1133 lines: `3 + 12 + 1002 + 4 + 4 + 5 + 102 + 1`), and `caoquest.gam` and `devilsnight.tpk`'s `main.gam` both stop after row 40 (1146 lines: rows 1–31 + 3 + 5 + 6, less the missing language-file line), one line short of the full six-line closing group. A reader reads rows 1–31, then reads the remaining rows only while lines remain. Role answers match §1.5: projectPath is row 25, startupPrg row 5, initBoard row 11, initChar row 12. (Entry-2 answer Q2 numbers the same rows 1–38; the row numbers here differ only in how the fixed groups are bracketed.)

*Worked example — `DEMO.GAM` (BusDriver) and `caoquest.gam` (Caoquest), first 15 lines each, thin spaces shown as `·`:*

```
BusDriver/DEMO.GAM            Caoquest/caoquest.gam
RPGTLKIT MAIN                 RPGTLKIT MAIN
·2·                           ·2·
·0·                           ·0·
·1·                           ·0·
START.PRG                     start.prg
START.PRG                     (empty)
(empty)                       ·0·
(empty)                       ·0·
·13·                          ·13·
·32·                          ·32·
DEMO1.BRD                     Cao's house.brd
FRAP.TEM                      cao.tem
(empty)                       ·0·
·250·                         ·2000·
(empty)                       ·0·
```

`DEMO.GAM` is 1133 lines, `caoquest.gam` 1146. The two agree on every field they share, which is the cross-game check for this layout. <!-- OWNER: GAM2 — chose to document this layout behind the 13-character magic the corpus actually carries, over withholding it because one legacy reader tests for a 17-character `RPGTLKIT mainForm`; the corpus field sequence fits line for line, so the layout is usable, and which reader path the legacy engine took is recorded as an open question (§15.15). -->

### 15.3 Board — text `.brd` (`RPGTLKIT BOARD`)

**17 files in four games** (FinalDestiny 1, Caoquest 14, School2Demo 1, ChimeranEmpire 1), all `major 2 / minor 1`. Layout (entry-2 answer Q1; minor-0 differences noted). One field per line; the tile cube is stored with x outermost, then y, then layer innermost (the reverse nesting of §4.8).

| # | Lines | Field |
|---|---|---|
| 1–5 | 5 | magic, major (2), minor (0 or 1), registered flag, registration code (both ignored) |
| 6 | 2 | width and height in tiles — **minor 1 only**; minor 0 has none and means 19 × 11 |
| 7 | width × height × 8 × 5 | tiles, in cell order x, then y, then layer 1…8 innermost, each cell `tile name`, `ambient red`, `green`, `blue` (signed), `tile type`. The layer count is always 8 and is not stored. |
| 8–12 | 5 | background image, border image (unused), board background colour, border colour (unused), ambient effect preset (0 none, 1 mist, 2 darkness, 3 water) |
| 13 | 4 | direction links in order N, S, E, W |
| 14–16 | 3 | battle skill level, battle background, fighting-allowed flag |
| 17–19 | 11 | ten board constants (numbers) and the background music |
| 20 | 8 | layer titles 1…8 |
| 21 | 561 | program records: **51 fixed records of 11 lines** (file, x, y, layer, graphic, activation mode, activation variable, end variable, initial value, end value, activation type); an empty file name is an unused slot |
| 22 | 110 | item records: **11 fixed records of 10 lines** |
| 23–26 | 3 + 11 + 1 + 11 | player start x, y, layer; 11 per-item activation programs; the "can save here" flag; 11 per-item multitask programs |
| 27 | 4 | day/night flag, night battle override, night skill level, night battle background (all unused) — **absent in the 19 × 11 default boards** |

Total lines are `739 + 40 × width × height`, and the reader needs no trailing field: `739 + 40 × 19 × 20 = 15939` and `739 + 40 × 50 × 50 = 100739` hold exactly. **Fourteen of the 17 files parse to the last line; the three 19 × 11 `.brd` templates hold exactly 4 lines fewer than the formula** — they omit the closing day/night group (field 27), so a reader must accept the file ending after field 26.

*Worked example — the first seven lines of FinalDestiny's `start.brd` and of Caoquest's `town.brd`:*

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

`start.brd` is 9095 lines (the four-line day/night tail absent); `town.brd` is 15939. Both headers, and the Caoquest boards' 15939/11379/100739 line counts, fit the formula exactly — the cross-game check for this layout. <!-- OWNER: BRD2 — chose to record the trailing day/night group as optional over requiring it, because the three default 19 × 11 boards in FinalDestiny, School2Demo and ChimeranEmpire stop four lines early and a reader that demanded the group would refuse them. -->

### 15.4 Item — text `.itm` (`RPGTLKIT ITEM`)

**16 files, all Caoquest**, `major 2 / minor 1`. Layout (entry-2 answer Q3, checked against all 16):

| # | Lines | Field |
|---|---|---|
| 1–3 | 3 | magic, major (2), minor (1) |
| 4–8 | 5 | item name; equipable, menu-usable, board-usable, battle-usable flags |
| 9 | 7 | equip-slot flags in order head, neck, left hand, right hand, body, legs, accessory (the binary form has 8) |
| 10–13 | 1 + 4 | accessory name; equip bonus HP, DP, FP, SMP |
| 14–15 | 2 + 3 + 3 | on-equip program, on-remove program; menu use `+HP`, `+SMP`, program; battle use `+HP`, `+SMP`, program |
| 16–17 | 2 | the board multitask program; the activation program |
| 18 | 1 | size type (0 = embedded 32 × 32 pictures, 1 = 64 × 32 file pairs) — **minor 1 only** |
| 19 | see below | graphics |
| 20–22 | 1 + 50 + 3 | used-by flag; 50 allowed-character names (the binary form reserves 51, indices 0…50); buy price, sell price, key-item flag |
| 23–24 | 2 | one-line description; battle animation file |

*Graphics block (field 19).* **Size type 0:** seventeen embedded 32 × 32 pictures follow — 16 walking frames, then one rest picture. Each picture is one value; if that value is `-2` the picture is empty and holds no more lines, otherwise exactly 1024 pixel values follow (x outermost, y inner), the first of which is the value just read. **Size type 1:** 16 frame pairs of file names (top, bottom) for walking (frames 0–3 south, 4–7 east, 8–11 north, 12–15 west), then two lines for the rest pair.

The text form has no counterpart for the binary idle animations, speed, idle time, custom stances, vector bases or reserved strings; it has the embedded pixel pictures, the size-type line and the 50-entry character list as text-only features.

*Worked example — Caoquest's `dagger.itm` (size type 0, every picture empty) and `10smp.itm` (size type 0, one full picture), first 16 lines abbreviated:*

```
dagger.itm (104 lines)       10smp.itm (1127 lines)
RPGTLKIT ITEM                 RPGTLKIT ITEM
·2·                           ·2·
1                             1
Dagger                        Potion
·1·                           ·0·
(empty)                       ·1·
(empty)                       ·0·
(empty)                       ·1·
(empty)                       ·0·
(empty)                       ·0·
·0·                           ·0·
·1·                           ·0·
(empty)                       ·0·
(empty)                       ·0·
(empty)                       ·0·
(empty)                       ·0·
```

`dagger.itm` is 104 lines (`3 + 28 + 17 + 56`, each of its 17 pictures a single empty marker line); `10smp.itm` is 1127 (`3 + 28 + 1 × 1024 + 16 + 56`). All 16 files end exactly at the animation line — the cross-file check for this layout. <!-- OWNER: ITM2 — the text item form appears in only one corpus game (Caoquest's 16 files); the worked example is checked across the two files shown and the other 14, not across two games, because no other corpus game writes a text `.itm`. Named in §15.15. -->

### 15.5 Character — text `.tem` (`RPGTLKIT CHAR`)

**2 files, both Caoquest** (`start.tem`, `swim.tem`), `major 2 / minor 2`, size type 0. Layout (entry-2 answer Q4, arithmetic-checked):

| # | Lines | Field |
|---|---|---|
| 1–3 | 3 | magic, major (2), minor (2) |
| 4 | 1 | character name |
| 5–13 | 9 | script variable names, in order experience, DP, FP, HP, max HP, name, SMP, max SMP, level |
| 14–21 | 8 | initial stats: experience, HP, max HP, DP, FP, SMP, max SMP, level |
| 22 | 1 | profile picture |
| 23–1027 | 1005 | special moves: **201 fixed records of 5 lines** (file, minimum experience, minimum level, condition variable, condition value). The length is not stored. |
| 1028–1029 | 2 | special-move category name; "does special moves" flag (0 = yes) |
| 1030 | 1 | size type (0 = embedded pictures, 1 = 64 × 32 file pairs) — present when minor > 0 |
| size type 1: 1031–1150 | 120 | 32 walking names (16 frames × top, bottom), 64 fight-family names, 4 fight-rest names (2 × 2), 20 custom names (10 × top, bottom) |
| size type 0: 1031–44062 | 44032 | sixteen embedded 32 × 32 pictures (1024 pixel lines each, first value `-2` = an empty picture of one line), then for four directions the fight, special, defence and death pictures interleaved four per pixel (4096 lines per direction), then a rest picture, then ten custom pictures (1024 lines each) |
| last 29 | 10 + 6 + 13 | accessory slot names 1…10; body-slot-in-use flags 1…6; then level progression, experience factor, maximum level, four level-up increases, four obsolete sounds, the level-up program and the level-up type |

For a size-type-0 minor-2 file the total is `3 + 1027 + 44032 + 29 = 45091` lines; both corpus files are exactly that, which is the check for this layout.

*Worked example — the first 14 lines of Caoquest's `start.tem`:*

```
RPGTLKIT CHAR
·2·
2
(empty)
Undefined$
(empty)
(empty)
(empty)
(empty)
Undefined!
(empty)
(empty)
(empty)
·0·
```

`start.tem` and `swim.tem` are both 45091 lines. <!-- OWNER: TEM2 — the text character form appears in only one corpus game (Caoquest's 2 files); the layout is checked against both files, not two games, and against the arithmetic of the fixed blocks. Named in §15.15. -->

### 15.6 Enemy — text `.ene` (`RPGTLKIT ENEMY`)

**52 files in four games** (FinalDestiny 7, Caoquest 5, School2Demo 7, ChimeranEmpire 33), all `major 2 / minor 0`, and the only `.ene` form the 2.x corpus contains. **Every one is exactly 363 lines**, and this is the strongest text-form evidence in the corpus. The opening fields are `name`, HP, SMP, FP, DP, the run flag and the two critical-hit chances; the body holds the rest-image tile block, the special-move and weakness lists, the AI level and program, the experience and gold rewards, the defeat and run-away programs, and the closing sound names. Two of the early lines label the rest image's width and height (1 × 1 to 6 × 7 across the corpus) and the rest image is stored as a fixed block of tile names padded with empty lines, so the file length does not vary with the image size.

*Worked example — the first fourteen lines of FinalDestiny's `Rat Man.ene` (grid `1 × 1`) and ChimeranEmpire's `Drackt.ene` (grid `5 × 4`):*

```
FinalDestiny/Rat Man.ene      ChimeranEmpire/Drackt.ene
RPGTLKIT ENEMY                RPGTLKIT ENEMY
·2·                           ·2·
·0·                           ·0·
Rat Man                       Drackt
·30·                          ·300·
·4·                           ·0·
·6·                           ·95·
·4·                           ·35·
·0·                           ·0·
·0·                           ·40·
·0·                           ·30·
·1·                           ·5·
·1·                           ·4·
char.tst64                    new_rm2k.tst569
```

Both files are 363 lines, as are all 52. The exact cell encoding of the rest-image block, and the two lines that label it, are recorded as an open question in §15.15: the block length is fixed and every file's total confirms it, but the corpus does not pin how many lines belong to an empty cell.

### 15.7 Animation — text `.anm` (`RPGTLKIT ANIM`)

**17 files** (Caoquest 7, ChimeranEmpire 9, plus the official 2.20b demo's `explode.anm`), all `major 2 / minor 0`. **Every one is exactly 160 lines**: three header lines, then width, height, a frame-count line, then **51 frames of three lines each** (image, transparent colour as a decimal, sound) and a final delay line. The frame images may be ordinary picture files or tile references; an empty image line is an empty frame. In all 17 files the frame-count line is written `0` even though 51 frames follow, so a reader must read the frames as the block between that line and the final delay, never from the count.

*Worked example — the first eight lines and the last line of Caoquest's `combo.anm`:*

```
RPGTLKIT ANIM
·2·
·0·
·64·
·64·
·0·
swing2.bmp
·16711680·
…
·6.66666666666667E-02·    (line 160, the delay)
```

<!-- OWNER: ANM2 — chose "read frames to the second-to-last line" over "trust the frame-count line", because all 17 samples write `0` while storing 51 frames; the count's meaning is recorded as an open question (§15.15). -->

### 15.8 Special move and status effect — text `.spc` / `.ste`

**8 text `.spc` files (all Caoquest), all exactly 13 lines**, `major 2 / minor 0`. Layout: magic `RPGTLKIT SPLMOVE`, major, minor, then the ten fields of §8.1 one per line — name, damage (FP), SMP cost, program, target SMP drain, usable in battle, usable from menu, status effect, animation, description. The eight files end exactly at the description, which is the check.

**The text `.ste` form is deferred.** `docs/format-spec.md` §8.2 sketches it (magic, major, minor, then the §8.2 fields one per line), but the corpus holds no text `.ste` at all — its five `.ste` files are binary minor 2 — so nothing here ratifies that sketch. A reader must still recognise a text `.ste` at the §15.1 detection byte and report it as an unsupported text form rather than misreading it as binary. The layout is otherwise as §8.2 already describes it. **`STE2` is the one deferred question in this section.**

### 15.9 Battle background — text `.bkg` (`RPGTLKIT BKG`)

**23 files in four games** (FinalDestiny 3, Caoquest 5, School2Demo 6, ChimeranEmpire 9), all `major 2 / minor 0`, and the only `.bkg` form the 2.x corpus contains. **Every one is exactly 845 lines.** Layout:

| # | Lines | Field |
|---|---|---|
| 1–3 | 3 | magic, major (2), minor (0) |
| 4–212 | 209 | tile references, **19 wide × 11 high** |
| 213–217 | 5 | music, then four menu sounds (move, choose, ready, cannot-do) |
| 218 | 1 | a further name field, empty in all 23 files |
| 219–845 | 627 | the shade grid: **209 cells of three values each** (red, green, blue), in the corpus all three equal |

`3 + 209 + 5 + 1 + 627 = 845`, which holds for every file. The 209 tile references and the 209 shade cells are a **19 × 11** grid, so §8.3's "19 × 19" is corrected below (§15.14): read as 19 × 11, the shade grid's triples line up in rows of 19 across 11 rows, and read as 19 × 19 they do not.

*Worked example — ChimeranEmpire's `Cave Boss.bkg` (845 lines), with line numbers in brackets:*

```
[1]   RPGTLKIT BKG
[2]   ·2·
[3]   ·0·
[4-5] CaveSet.tst11, CaveSet.tst40   ⇒ the first two of 209 tile references (lines 4-212)
[213] vip - boss1.mid                 (the music)
[214] aa1.wav  [215] aa1.wav  [216] ready.wav  [217] illegal.wav   (the four sounds)
[218] (empty)
[219] -50  [220] -50  [221] -50       (first shade cell: red = green = blue)
```

Every one of the 23 files is 845 lines with 209 tile lines at 4…212 and 627 shade values at 219…845.

### 15.10 Animated tile — `.tan` (`RPGTLKIT TILEANIM`)

**33 files, all ChimeranEmpire**, all `major 2 / minor 0`. The §3.5 binary layout is verified: magic as a NUL-terminated string, then `i16` major, `i16` minor, `i32` framesPerSecond and `i32` frameCount, then `frameCount` NUL-terminated tile references. **All 33 files parse to the last byte** with no residue; frame counts across the corpus are 2, 4 and 7, and framesPerSecond ranges 15…77. The `.tan` text form does not occur in the corpus; whether 2.x ever wrote one is unverified, and the format's minimum accepted minor is stated in §3.5.

### 15.11 Single tile — `.gph` (`RPGTLKIT TILE`)

**6 v2 files** (FinalDestiny 1, School2Demo 5), all `major 2 / minor 0`, `detail 1`. The §3.2 v2 text layout is verified for compressed tiles: magic line, then major, minor, detail and the compressed flag (all `1`), then `runLength`/`colour` pairs. In all six files the run lengths sum to exactly **1024** (32 × 32), with an empty run length of `-1` as the transparent key.

**The v1 form is recorded but out of scope.** The owner's own editor output `v1tile.gph` is 288 bytes: a 16 × 16 character grid, 16 rows of 16 characters plus a CR/LF pair, each character a palette index stored as `character code − 33`. That matches the v1 sentence in §3.2. Toolkit 1.x is out of scope for the first release (as §9.9 already says of Toolkit 1.x RPGCode), so this section **records** the v1 form as evidence-backed but promises no reader for it.

<!-- OWNER: GPH2 — chose "record v1, promise no reader" over "add a v1 reader", because v1 is Toolkit 1.x and §9.9 already puts Toolkit 1.x out of scope for the first release; a later entry can add it from §3.2's v1 sentence plus the 288-byte sample. -->

### 15.12 Text font — `.fnt` (`RPGTLKIT FONT`)

**5 files in four games** (FinalDestiny 1, Caoquest 1, School2Demo 1, ChimeranEmpire 2), and **not described anywhere in §1–§14 before this section**. The file is **text**, not binary:

| # | Lines | Content |
|---|---|---|
| 1 | 1 | magic `RPGTLKIT FONT` |
| 2 | 1 | version (`2`) |
| 3 | 1 | subversion (`0`) |
| 4…2051 | 2048 | for glyph code 0…255 in order, eight decimal values 0…255, one per line: the bit pattern of one 8 × 8 cell, top row first |

Each value is one pixel row; the most significant bit is the leftmost pixel, `1` is ink and `0` the transparent background. Only the low eight bits matter. Every glyph is a fixed 8 × 8 cell indexed directly by character code; there is no palette, no per-glyph width and no trailing atlas. The lines are separated by CR/LF and the values are written with a space on each side, so the byte length is `21 + Σ(digits(v) + 4)` over the 2048 values. **All 5 files are exactly 2051 lines** with magic `RPGTLKIT FONT`, version `2`, subversion `0` and 2048 values, which is the check. A reader reaches the byte after the last value with nothing left. (Entry-2 answer Q7.)

### 15.13 Tileset 8-bit detail palette — `.tst`

The official 2.0 specification, "Tileset (TST) File Format Specification, Copyright 2000 by Christopher B. Matthews", in the archive at `wayback/rpgtoolkit.com/dev_repo/docs/tst.html`, supplies the facts §3.1 leaves implicit. Its 6-byte header is `WORD version`, `WORD NumberOfTiles`, `WORD detail`; version `20` means 2.0 and `21` means 2.1, and only version 20 was ever produced. Detail is uniform for the whole set and is one of six levels:

| detail | Cell | Bytes/pixel | Transparency | Colours |
|---|---|---|---|---|
| 1 | 32 × 32 | 3 | R=0, G=1, B=2 | 16.7 million |
| 2 | 16 × 16 | 3 | R=0, G=1, B=2 | 16.7 million |
| 3 | 32 × 32 | 1 | index 255 | 256 (the default DOS 13h VGA palette) |
| 4 | 16 × 16 | 1 | index 255 | 256 (the default DOS 13h VGA palette) |
| 5 | 32 × 32 | 1 | index 255 | 16 (the default DOS EGA palette, i.e. the first 16 entries of the 13h VGA palette) |
| 6 | 16 × 16 | 1 | index 255 | 16 (the same 16-colour EGA subset) |

The pixels are read column-major (x outermost, y inner), which matches §3.1. For details 3 and 4 the index is a **default DOS 13h VGA palette** entry; for details 5 and 6 it selects one of the **first sixteen** 13h entries (the EGA set). A reimplementation ships that table, built from the public VGA default palette, not from the legacy source (G7). The corpus holds detail 1 and detail 2 `.tst` files only (77 files, version 20), so the 8-bit path is documented but unexercised; §3.1's own text is extended to match below (§15.14).

### 15.14 Corrections to §2, §3.1, §6.1 and §8.3

Four existing statements are wrong against the corpus and are corrected here.

**§2, `.gam` binary minor 2 (`GAMB`).** §2 gives rows 10 and 21 as `i32` for `minor < 3`. They are **`i16`**: with `i16` the layout reads all **15** binary minor-2 `.gam` files to the last byte (FinalDestiny 2, LittleMan 1, BusDriver 10, School2Demo 1, ChimeranEmpire 1), and with `i32` it leaves 1506 unread bytes on each BusDriver file and runs off the end of FinalDestiny's two. Table row 10 becomes `i16` (old parallax) and row 21's `minor < 3` branch becomes `i16` (reserved); the "version-dependent fields summary" items 1 and 2 follow. §2's row-3 quirk is right and stays: the `i16` registration flag is followed by the code string, and a file that wrote the code without the flag still aligns because the `i16` swallows the first two characters of the code (`"NO"`) and the string read takes the rest (`"CODE"`). Entry-2 answer Q5 and the measured residue agree with this reading; the rows the extraction could not confirm (the true field set of the tail) are not needed, because the corrected rows consume the whole file.

**§6.1, `.tem` binary minor 3–4 (`TEMB`).** §6.1 says the 2.x minor-3/4 field set "this layout does not describe". It is described here from entry-2 answer Q6, and its two version differences are: at **minor 3** the level-up experience field is one byte and at **minor 4** it is four; and after the level-up type the file stores a `size type` byte followed by **120 NUL-terminated graphic names** (32 walking, 64 fight-family, 4 rest, 20 custom). Applying that layout, **14 of the 16 binary minor-3/4 files parse exactly** (all 15 minor-4 files except FinalDestiny's `Bill.tem`, which leaves 13 bytes). §6.1's caveat sentence is corrected to point here, and §6.1's version range stays 0–8. The two files that do not close (and the `size type` byte's value varying across writers) are open questions in §15.15; entry-2 answer Q6 itself could not confirm against samples.

**§3.1, `.tst` palette.** §3.1's "Palette (8-bit detail)" paragraph is extended with the official spec's rule that details **5 and 6** use only the first sixteen entries (the EGA set), not the full 256; the official spec citation sits in §15.13.

**§8.3, `.bkg` text grid.** §8.3 says the text form holds a 19 × 19 tile grid, then the sounds and music, then a 19 × 19 shade grid. The 23 corpus files fix a **19 × 11** grid of 209 tiles and 209 shade triples, with the **music first** and the four sounds after it, then one further name line, then the shades. §8.3's sentence is corrected to match §15.9.

### 15.15 Open questions

These remain unsettled. Each names the evidence that could not settle it, and none is a silent guess.

1. **`.gam` text header path.** The three text `.gam` files carry the 13-character magic `RPGTLKIT MAIN` and their fields fit entry-2 answer Q2 line for line, but Q2 also found one reader that tests for a 17-character `RPGTLKIT mainForm` and would route a 13-character file elsewhere. Which reader path the engine actually took, and whether the older path's field order differs, is unverified (`DEMO.GAM`, `caoquest.gam`, `devilsnight.tpk main.gam`).
2. **`.gam` text plugin count.** The corpus writes a plugin count of `5` but only four enabled-flag lines before the closing group; whether the count is a true count written one too high, or a fifth flag line belongs to the count and the language file is omitted, is not settled by two files (`caoquest.gam` 1146 lines, `devilsnight.tpk main.gam` 1146 lines). The tail-is-optional reading used here fits both.
3. **`.tem` binary minor 3–4 tail.** 14 of 16 files close exactly. FinalDestiny's `Bill.tem` (minor 4) leaves 13 bytes and FinalDestiny's `start.tem` (minor 3) leaves 96; the `size type` byte reads `99` on Caoquest's `red.tem` where its neighbour reads `1`, so some writers omit or shift that byte. Whether the graphic-name block has a different length for some writers, and whether minor 3 differs from minor 4 there, is unverified.
4. **`.ene` text rest-image block.** All 52 files are exactly 363 lines and their opening fields and tails are readable, but how many lines an empty cell in the rest-image block occupies (the block pads to a fixed length), and what the grid's two size lines exactly mean, are not pinned by the corpus.
5. **`.anm` text frame-count line.** It is written `0` in all 17 samples while 51 frames follow; its meaning is unknown. A reader that counts frames from it would read nothing.
6. **`.bkg` text line 218.** One name field sits between the four sounds and the shade grid and is empty in all 23 files; its role is unknown.
7. **`.ste` text form.** No text `.ste` exists in the corpus.
8. **Zero-byte placeholders.** The corpus holds seven zero-byte data files — two `.brd` (one with an empty base name, `Boards/.brd`, in School2Demo; one in ChimeranEmpire), two `.itm` (FinalDestiny, ChimeranEmpire) and three `.spc` (FinalDestiny and two in ChimeranEmpire). Whether a reader should **skip** them or **tolerate** them as empty documents is a decision for the reader entries, not a fact the bytes can settle.

<!-- OWNER: placeholder files (open question 8) — alternatives: (a) tolerate a zero-byte file as an empty placeholder and let the referencing entry see "no asset"; (b) skip it silently; (c) report it as a located error. The corpus shows they were left by their authors and are referenced in some cases, so a hard error would break a real game; the recommendation for the reader entries is (a) tolerate with a warning, and (b) only if a caller asks to skip. Decided: tolerate with a warning. Change here if the owner prefers skip. -->

**References for this section.** The layouts come from the archive's 2.x data files, read under the clean-room process of `docs/guardrails.md` G7 (data may be read; legacy source may not), and from the reviewed extraction facts in `docs/provenance/facts-round-1.md` (entry-2 answers Q1–Q7; the round is recorded in `docs/provenance/extraction-log.md`). The archive paths used are, under `/Users/jensen/projects/rpgtoolkit-archive/`: `wayback/mysticsoftware.net/games.mysticsoftware.net/` (`chimeran_empire.zip`, `School2Demo.zip`, `caoquest.zip`, `devilsnight.tpk`), `wayback/aljo.afraid.org/games/` (`littleman/…/zip.zip`, `busd/busd.zip`), `archive-org/FinalDestiny_201810/Final_Destiny.zip`, `archive-org/rpg-toolkit-220b/toolkit220b/zip/` (the official 2.20b demo), and `wayback/rpgtoolkit.com/dev_repo/docs/tst.html` (the official 2.0 Tileset specification). The coverage table and gap list that opened this work are in `_bmad-output/initiative-rpgtoolkit-reawakened/epic-tk2-support/discovery/tk2-formats-research.md`.
