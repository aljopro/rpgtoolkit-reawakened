# Main game file (`.gam`)

One per game. It holds the game-wide settings: title, the first program, board and character, key bindings, the random-encounter table, plugins, display mode, game speed and movement options. The engine reads it once at start-up and again when a saved game is loaded. It lives in the Toolkit's `Main\` folder, **outside** the project folder, and its `projectPath` field says where the project is. Inside a PAK archive it is `main.gam` at the archive root.

Header text: `RPGTLKIT MAIN`. Newest minor: **9** (Toolkit 3.1.0). The editor always writes every field of minor 9.

## Layout

Types and conventions are defined in [README.md](README.md#primitive-encoding). "UB" = upper bound (entries = UB + 1).

| # | Field | Type | Present when | Meaning and values |
|---|---|---|---|---|
| 1 | header | string | always | `RPGTLKIT MAIN` |
| 2 | major | short | always | 2; ignored |
| 3 | minor | short | always | selects which fields follow |
| 4 | registered | short | always | legacy shareware flag; the editor writes `1`; ignored |
| 5 | registration code | string | always | the editor writes `NOCODE`; ignored. See the alignment note below. |
| 6 | projectPath | string | always | project folder relative to the Toolkit folder, with trailing `\`, e.g. `Game\demo\`. Ignored when running from a PAK. |
| 7 | gameTitle | string | always | window title |
| 8 | mainScreenType | short | always | historic display API choice; new projects store 1; **ignored** by the engine |
| 9 | extendToFullScreen | short | always | 0 windowed, 1 full screen |
| 10 | mainResolution | short | always | 0 = 640×480, 1 = 800×600, 2 = 1024×768, any other value (the editor writes 4) = custom `resX`×`resY` |
| 11 | (unused) | int | minor < 3 | discarded |
| 12 | mainDisableProtectReg | short | always | legacy; ignored |
| 13 | language file | string | always | editor UI language, e.g. `0english.lng`; ignored by the engine |
| 14 | startupPrg | string | always | program in `Prg\` run at start |
| 15 | initBoard | string | always | first board in `Boards\` |
| 16 | initChar | string | always | first character in `Chrs\` |
| 17 | runTime | string | always | "run-time" program, run when `runKey` is pressed; empty = none |
| 18 | runKey | short | always | ASCII code of the run-time key |
| 19 | menuKey | short | always | ASCII code of the menu key (13 = Enter in new projects) |
| 20 | key | short | always | ASCII code of the general activation key (the demo game uses 32, space) |
| 21 | runTimeKeys UB | short | always | the editor writes 50 |
| 22 | × (UB+1): key, program | short, string | always | extra run-time keys (ASCII) and their programs; entries with an empty program are ignored |
| 23 | menuPlugin | string | minor ≥ 3 | menu plugin DLL in `Plugin\` |
| 24 | fightPlugin | string | minor ≥ 3 | battle plugin DLL in `Plugin\` |
| 23′ | (unused) | int | minor < 3 | discarded; plugins default to `tk3menu.dll` and `tk3fight.dll` |
| 25 | (unused) | int, short | minor ≤ 2 | discarded |
| 26 | fightGameYn | short | always | **0 = random battles enabled, 1 = disabled** (the name is inverted) |
| 27 | enemy list UB | short | always | the editor writes 500 |
| 28 | × (UB+1): enemy, skill | string, short | always | random-encounter enemy file (`Enemy\`) and its skill level |
| 29 | fightType | short | always | 0 = random chance per step, 1 = every *chances* steps |
| 30 | chances | int | always | the "1 in N" chance, or the step count |
| 31 | fprgYn | short | always | 1 = run `fightPrg` instead of the normal battle |
| 32 | fightPrg | string | always | custom battle program |
| 33 | (unused) | short | minor < 3 | discarded |
| 34 | gameOverPrg | string | always | program run when the party loses; empty = built-in "Game over" and reset |
| 35 | skinButton | string | always | legacy; ignored |
| 36 | skinWindow | string | always | legacy; ignored |
| 37 | plugin list UB | short | always | RPGCode command plugins |
| 38a | × (UB+1): enabled | short | minor ≤ 2 | non-zero adds `tkplug<i>.dll` |
| 38b | × (UB+1): plugin | string | minor ≥ 3 | plugin DLL names; empty entries ignored |
| 39 | mainUseDayNight | short | always | day/night cycle flag; stored only (not implemented by the engine) |
| 40 | mainDayNightType | short | always | 0 real-world clock, 1 fixed day length; stored only |
| 41 | mainDayLength | int | always | minutes; stored only |
| 42 | cursorMoveSound | string | minor ≥ 3 | menu sound effects (`Media\`) |
| 43 | cursorSelectSound | string | minor ≥ 3 | |
| 44 | cursorCancelSound | string | minor ≥ 3 | |
| 45 | useJoystick | byte | minor ≥ 3 | 0/1 |
| 46 | colorDepth | byte | minor ≥ 3 | 0 = 16-bit, 1 = 24-bit, 2 = 32-bit (bits = 16 + 8 × value) |
| 47 | gameSpeed | byte (unsigned) | minor ≥ 4 | speed + 128; see Game speed below. Absent → 0. |
| 48 | pixelMovement | byte | minor ≥ 4 | 0 = tile movement, 1 = pixel movement with tile-sized pushes, 2 = pixel movement with pixel pushes. Absent → 0 |
| 49 | cursor enabled | byte | minor = 5 only | non-zero → `mouseCursor = "TK DEFAULT"`, else no cursor |
| 50 | mouseCursor | string | minor ≥ 6 | image in `Bitmap\`, `TK DEFAULT` for the built-in arrow, or empty. Minor < 5 → `TK DEFAULT`. |
| 51 | hotSpotX | byte | minor ≥ 6 | cursor hot spot, pixels |
| 52 | hotSpotY | byte | minor ≥ 6 | |
| 53 | transpColor | colour | minor ≥ 6 | cursor transparent colour; forced to red `RGB(255,0,0)` when the cursor is `TK DEFAULT` |
| 54 | resX | int | minor ≥ 7 | custom width |
| 55 | resY | int | minor ≥ 7 | custom height |
| 56 | bFpsInTitleBar | byte | minor ≥ 8 | show frames per second in the title bar |
| 57 | pfHeuristic | short | minor ≥ 9 | path-finding mode: 0 previous, 1 axial (4-way grid), 2 diagonal (8-way grid), 3 vector (any angle). Absent → 2 |
| 58 | drawVectors | int | minor ≥ 9 | debug drawing bit mask: 1 board vectors, 2 sprite vectors, 4 paths, 8 destination circles, 16 selected player's path, 32 selected player's destination |
| 59 | pathColor | colour | minor ≥ 9 | colour for path debug drawing; absent → white |
| 60 | movementControls | int | minor ≥ 9 | bit mask: 1 keyboard, 2 mouse, 4 allow diagonals. Absent → 1 + 4 |
| 61 | movementKeys × 8 | short each | minor ≥ 9 | DirectInput keyboard scan codes in the order E, SE, S, SW, W, NW, N, NE; 0 = unbound. Absent → arrow keys (E `0xCD`, S `0xD0`, W `0xCB`, N `0xC8`), diagonals 0 |

The file ends after the last field present.

## Compatibility notes

- **Alignment accident in fields 4-5.** The editor writes a 2-byte `registered` and then the string `NOCODE`. The original engine reads a 4-byte int and then a string, so it sees `CODE`. Both are discarded and the total length is the same, so the following field lines up either way. A new reader should read *short + string*.
- **Game speed.** The byte is `speed + 128`; the decoded speed is `byte − 128` (the editor offers −4..+4). Files with minor < 8 stored the signed value directly and are re-biased on load (`stored + 128`). The decoded value is used as a per-frame step offset (see [../engine/movement-and-collision.md](../engine/movement-and-collision.md#speed)).
- **Keys** in fields 18-22 are ASCII character codes; the engine converts them to keyboard scan codes with the current keyboard layout when loading. Movement keys (field 61) are already scan codes.
- **Default path-finding mode differs.** The engine defaults to 2 (diagonal) for files older than minor 9. The editor's "new project" default is 1 (axial). A re-saved file always carries an explicit value. A value of 0 or out of range probably crashed the original engine when path-finding was first used (inferred from the code; not observed).
- **Fields stored but unused by the engine:** `mainScreenType`, `mainDisableProtectReg`, the language file, both skins, the three day/night fields.
- **Array sizes.** The editor always writes 51 run-time key slots and 501 enemy slots, so an empty project's `.gam` is about 1.9 KB.

## Validation in the original programs

Missing file → message "File not found"; wrong header → "Unrecognised File Format!"; both abort loading the game. No value is range-checked.

## Older versions

The minor-version history and the Toolkit 1 and 2 text main files are in [legacy/older-binary-versions.md](legacy/older-binary-versions.md#main-file-minor-history) and [legacy/text-formats.md](legacy/text-formats.md#main-file-toolkit-2-text).

## Example

[../examples/listings/main.gam.txt](../examples/listings/main.gam.txt) is an annotated byte listing of a complete minor-9 file built by the example generator.
