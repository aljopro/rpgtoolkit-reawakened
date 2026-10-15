# Saved game (`.sav`)

The only binary game file the engine writes. RPGCode `Save(name)` writes `Saved\<name>.sav` (relative to the Toolkit folder) and `Load(name)` reads it. It captures every script global, the party, inventory, equipment, position, the current board's items and threads (including each running script's full execution state), and a few display settings.

Header text: `RPGTLKIT SAVE`. The engine writes major **3**, minor **4** (Toolkit 3.1.0). Readers handle minors below 4 (Toolkit 3.0) as noted.

**Counts here are exact counts** (not upper bounds), except the thread list.

## Layout (minor 4)

| # | Field | Type | Notes |
|---|---|---|---|
| 1 | header | string | `RPGTLKIT SAVE` |
| 2 | major, minor | short, short | 3, 4 |
| 3 | numeric globals: count; × (name, value) | int; (string, double) | script variables. On load a trailing `!` or `"` in the name is stripped. |
| 4 | object globals: count; × (name, value) | int; (string, double) | variables holding object handles |
| 5 | string globals: count; × (name, value) | int; (string, string) | on load `$` and `"` are stripped from the name |
| 6 | redirects: count; × (from, to) | int; (string, string) | active RPGCode `redirect`s |
| 7 | party size | int | minor < 4: always 5 slots |
| 8 | × party: name, file | string, string | character file relative to `Chrs\` (minor < 4: the path is stripped) |
| 9 | inventory count | **short** | |
| 10 | × item: file, name, quantity | string, string, int | `file` is stored **with the project path** (e.g. `Game\demo\Item\man.itm`); readers keep the part after `Item\` |
| 11 | equipment | 16 slots × party × (file, name) | slot-major: all members' slot 1, then slot 2, … |
| 12 | equipment bonuses | party × (int hp, int sm, int dp, int fp) | |
| 13 | (unused) | int | 0 |
| 14 | selected player | int | out of range → 0 |
| 15 | gold | int | |
| 16 | message window colour | colour | |
| 17 | message window background | string | |
| 18 | debug messages | int | non-zero = show script warnings |
| 19 | text colour | colour | |
| 20 | font name | string | |
| 21 | font size | int | |
| 22 | bold, underline, italic | int × 3 | |
| 23 | game time | int | seconds played |
| 24 | steps | int | steps taken, in tiles |
| 25 | main file | string | `.gam` name; reloaded from `Main\` (or the PAK root) |
| 26 | board | string | current board, relative to `Boards\` (minor < 4: path stripped); loaded **without** starting its threads (they come from field 37) |
| 27 | × party: x, y | double, double | **pixels** (minor < 4: tile coordinates) |
| 28 | × party: layer | int | |
| 29 | × party: active | int | minor ≥ 4 |
| 30 | × party: path vector, cycles, next node, attributes | int × 4 | minor ≥ 4; index of the waypoint vector the character follows (−1 = none) and its progress |
| 31 | × party: nextLevel, levelProgression | int, int | |
| 32 | other players | 26 × (string, string) | unused; written empty |
| 33 | menu graphic, fight menu graphic | string, string | |
| 34 | (unused) | int | 0 |
| 35 | selected player's replacement graphics | string | set by RPGCode `NewPlayer` |
| 36 | board items: count | int | minor ≥ 4 |
| 37 | × item: file | string | empty = empty slot, nothing more follows for it |
| 37a | prgActivate, prgMultitask, initialVar, initialValue, finalVar, finalValue | string × 6 | `loadingVar/Value` are not saved |
| 37b | activate, activationType | short × 2 | |
| 37c | x, y | double × 2 | pixels |
| 37d | layer, active | int × 2 | |
| 37e | path vector, cycles, next node, attributes | int × 4 | |
| 38 | thread UB | int | thread count − 1 |
| 39 | × thread: name | string | `Prg\` path or inline code |
| 40 | persistent | int | 0 = belongs to the board |
| 41 | (position) | int | minor < 4 only; ignored |
| 42 | isItemThread | int | minor ≥ 4 and persistent |
| 43 | item index | int | only if `isItemThread` |
| 44 | sleeping | int | |
| 45 | sleep remaining | double | milliseconds (minor < 4: seconds); 0 = not sleeping |
| 46 | program state | see below | minor ≥ 4 and name non-empty |
| 46′ | legacy local variables | heaps of (name, double) / (name, string) lists | minor < 4; ignored |
| 47 | movement size | double | 0.0 = pixel movement, 1.0 = tile movement |
| 48 | objects: count; × (handle, class) | int; (unsigned int, string) | minor ≥ 1 |
| 49 | game speed offset | int | minor ≥ 2 |

## Program state (inside each thread, field 46)

A running script's full state, so threads resume mid-program after loading. The program text itself is not stored; it is recompiled from the name.

| # | Field | Type | Notes |
|---|---|---|---|
| 1 | stack index | int | −1 = nothing more follows |
| 2 | stack frame count | int | |
| 3 | × frame: item count | int | |
| 4 | × item: number, text, type flags | double, string, int | |
| 5 | local scope count | int | |
| 6 | × scope: variable count; × (name, number, text, type flags) | int; (string, double, string, int) | |
| 7 | call count | int | |
| 8 | × call: returns, return position, closing brace position, object, reference count | int, uint, uint, uint, int | |
| 9 | × reference: parameter index, frame (0 = global), variable name | uint, uint, string | |
| 10 | program position | int | index of the next instruction |
| 11 | scope mode | int | 0 = globals first, 1 = locals first |
| 12 | include count; × name | int; string | |

**Compatibility note:** "positions" are indices into the compiled instruction list of the *original* engine's compiler. A reimplementation with a different compiler cannot resume saved threads exactly; it should restart them, or map positions to source lines in a new save format.

Not saved: per-call error handlers.

## Behaviour notes

- Loading first destroys all globals, redirects and threads, then reads. A corrupt file leaves a half-loaded game.
- A missing file shows "File not found"; a wrong header shows "Invalid save file"; in both cases the game continues unchanged.
- When the game runs from a PAK or standalone EXE the original engine wrote saves into its temporary folder, which is deleted on exit (inferred), so saves did not survive the session.

## Example

[../examples/listings/slot1.sav.txt](../examples/listings/slot1.sav.txt) — a save with globals, one party member, one inventory item and no running threads.
