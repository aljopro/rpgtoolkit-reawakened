# Older binary versions

The 3.x binary formats grew by appending fields and bumping the minor version. Readers of current files must still accept these older minors. Most are small differences, already marked "Present when" in the current format pages; this page collects them and documents the two layouts that differ substantially (pre-vector boards and pre-3.0 characters and items).

## Summary

| Format | Current minor | Older minors still readable | Where the differences are documented |
|---|---|---|---|
| Main file | 9 | 1-8 | "Present when" column of [../main-file.md](../main-file.md#layout); history below |
| Board | 4 | 2, 3 | [below](#board-minor-2-and-3-pre-vector) |
| Character | 8 | 5-7 (engine and editor); < 5 (editor only, converted) | [below](#character-before-minor-8) |
| Item | 7 | 3-6 (both); < 3 and < 4 converted | [below](#item-before-minor-7) |
| Enemy | 1 | — (no version branches) | |
| Animation | 3 | — (only minor 3 is accepted) | |
| Fight background, status effect, special move | 3 / 2 / 2 | — (no version branches) | |
| Saved game | 4 | 0-3 (Toolkit 3.0) | [below](#saved-game-before-minor-4) |

## Main file minor history

| Minor | Adds |
|---|---|
| 1-2 | Toolkit 2.x binary main file: plugins as numbered `tkplug<i>.dll` flags; extra unused fields (see the main-file table) |
| 3 | plugin names (menu, battle, command plugins), cursor sounds, joystick, colour depth |
| 4 | game speed, pixel movement |
| 5 | a mouse-cursor on/off flag |
| 6 | full mouse cursor (image, hot spot, transparent colour) |
| 7 | custom resolution |
| 8 | FPS in title bar; game speed stored with the +128 bias (older files are re-biased on load) |
| 9 | path-finding mode, debug vectors, movement controls and keys |

When the original editor opens a minor ≤ 2 main file it copies the shared `Plugin\` folder's files into the project's `Plugin\` folder.

## Board minor 2 and 3 (pre-vector)

Read only (the 3.x editor upgrades and re-saves as minor 4). Fields after the version:

| # | Field | Type | Notes |
|---|---|---|---|
| 1 | registered, registration code | short, string | ignored |
| 2 | sizeX, sizeY, sizeL | short × 3 | |
| 3 | startX, startY, startL | short × 3 | **tile** coordinates |
| 4 | bDisableSaving | short | |
| 5 | LUT UB, LUT entries | short, strings | as the [current layout](../board.md#vector-layout-minor-4-and-later) |
| 6 | tile stream | | Order as the [current layout](../board.md#vector-layout-minor-4-and-later). A literal cell is `index, r, g, b` (4 shorts) then `tiletype` (byte). A run is `−count`, then `index, r, g, b` (shorts) and `tiletype` (byte). |
| 7 | background image | string | **the original engine loses this name** (a bug); the editor keeps it |
| 8 | foreground image, border image | 2 × string | ignored |
| 9 | bkgColor, border colour | colour, colour | border colour ignored |
| 10 | ambient effect | short | 0 none, 1 mist (+75 all), 2 dark (−75 all), 3 water (+75 blue); > 3 → 0 |
| 11 | links N, S, E, W | 4 × string | |
| 12 | battleSkill, battleBackground, bAllowBattles | short, string, short | |
| 13 | day/night: flag, night battles, night skill, night background | short, short, short, string | ignored |
| 14 | constants × 11 | short | become decimal strings |
| 15 | bkgMusic | string | |
| 16 | layer titles × 9 | string | fixed 9, not sizeL |
| 17 | program UB | short | |
| 18 | × program | | file (string; empty entries dropped), x, y, layer (shorts, tile coords), graphic (string), activate (short), initialVar, finalVar, initialValue, finalValue (strings — note the order), activationType (short; the engine adds the "stop movement" flag) |
| 19 | enterPrg, (unused) | string, string | |
| 20 | item UB | short | |
| 21 | × item | | file (string), x, y, layer (shorts, **tile** coords), activate (short), initialVar, finalVar, initialValue, finalValue (strings), activationType (short), prgActivate, prgMultitask (strings). `loadingVar/Value` are copied from `initialVar/Value`. |
| 22 | thread UB | **int** | minor 3 only |
| 23 | × thread | string | minor 3 only |
| 24 | coordType | **byte** | minor 3 (the engine); the editor also reads it for minor 2 |

**Upgrade rules applied on load:**
- **Tile types → vectors.** Old per-cell tile types: 0 normal, 1 solid, 2 under, 3 north-south wall, 4 east-west wall, 11-18 stairs to layer 1-8. Each layer's grid of types is traced into polygons: solid areas → solid vectors; walls → open solid polylines along the edge; stairs *n* → stairs vector with attributes *n*; under → under vector with the background flag.
- **Per-tile RGB → one shading layer**, using the tint of the highest layer whose tile has a non-zero tint.
- **Positions:** start position and item positions convert from tiles to pixels; program positions become square (or diamond, on isometric boards) activation polygons covering the tile.
- **Variable names:** `!` and `$` are stripped.
- **Compatibility note:** for minor 2 the original engine never reads `coordType` and keeps whatever the previously loaded board had; the editor reads a byte there. The two programs therefore disagree for minor-2 files.


## Character before minor 8

| Minor | Difference from the current layout |
|---|---|
| 7 | no collision or activation polygons (defaults apply, see [../character.md](../character.md#defaults-and-fall-backs)) |
| 6 | also no idle time and speed (defaults 3.0 s and 0.05 s) |
| 5 | also no idle animations |
| 3 | `levelType` is one byte instead of an int (only reachable through the editor's conversion) |
| < 5 | Toolkit 2 binary layout, below. **The original engine refuses these**; the editor converts them. |

**Minor < 5 layout.** Identical to the current layout up to and including `levelSm`, then:

| Field | Type |
|---|---|
| swipe, defend, special-move, death sounds | 4 × string |
| levelUpProgram | string |
| levelUpType, sizeType | byte, byte |
| walking tiles: 16 frames × (upper, lower) | 32 × string |
| battle tiles: for frame *x* = 0..3, for *y* = 0..1, for *z* = 0..1: fight, defend, special, death | 64 × string |
| battle rest: 2 × 2 | 4 × string |
| custom: 10 × (upper, lower) | 20 × string |

Nothing follows. The tile names are tile references; conversion turns them into tile bitmaps and animations ([conversion.md](conversion.md#characters)).

## Item before minor 7

| Minor | Difference from the current layout |
|---|---|
| 6 | no collision or activation polygons (defaults apply) |
| 5 | the rest animation (field 23) is moved to the south idle animation on load (applies to minors 4 and 5) |
| 4 | also no idle animations, speed or idle time (defaults 0.05 s and 3.0 s) |
| < 4 | **Toolkit 2 binary layout:** instead of fields 22-29 of the current layout (walk animations … custom stances), 16 walking frames × (upper, lower) tile names, then 2 rest tile names (34 strings). Both programs convert these ([conversion.md](conversion.md#items)); the original engine does it **on every load**. |
| < 3 | additionally, prices and all stat changes (fields 8, 12, 14, 16) are shorts instead of ints |

## Saved game before minor 4

Saved games from Toolkit 3.0 (minors 0-3) differ from the current layout ([../save-game.md](../save-game.md)) as follows:

- always 5 party slots; character paths stored with their folder (the folder is stripped on load);
- the board name stored with its folder;
- party positions in **tile** coordinates, and no active flag or path state;
- no board-item section;
- each thread stores a position (ignored) instead of item-thread information, a sleep time in **seconds**, and instead of the program state a list of local variable "heaps" (ignored on load);
- minor 0 has no object list; minors 0-1 have no game-speed offset.

**Compatibility note:** the original engine's reader for the legacy local-variable heaps reuses one loop counter for two nested loops, so any save with more than one heap, or a non-empty heap, misparses (inferred). Running scripts cannot be restored from these files in any case.

