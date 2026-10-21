# Saved game (`.sav`)

The only binary game file the engine writes. RPGCode `Save(name)` writes `Saved\<name>.sav` (relative to the Toolkit folder) and `Load(name)` reads it. It captures every script global, the party, inventory, equipment, position, the current board's items and threads (including each running script's full execution state), and a few display settings.

Header text: `RPGTLKIT SAVE`. The engine writes major **3**, minor **4** (Toolkit 3.1.0). Readers handle minors below 4 (Toolkit 3.0) as noted.

**Counts here are exact counts** (not upper bounds), except the thread list.

**Our own save format — Reawakened rule (R-13).** A rebuild may use its own save format; the legacy `.sav` layout on this page is an **import** concern only, not a format this project must write. Reading legacy saves is scoped with the menu/party/save work. Also note that the split into separate lists — numeric globals, object-handle globals and string globals, then redirects, party, inventory, equipment and the miscellany — is what a loader must reproduce; and since the serialised interpreter state (field 46) is engine-specific, a rebuild may fall back to restarting each saved thread from the top rather than resuming mid-program.
### Reawakened canonical actor state

The Reawakened runtime uses its canonical state snapshot for its own save/load
surface. The legacy binary layout above remains an import specification. The
canonical state contains an `actors` section with schema version `2`, a
monotonic `nextId`, and an `actors` array. Each actor record stores only:

| Field | Type | Save rule |
|---|---|---|
| `id` | positive integer | Stable actor identity; never a VM object handle |
| `kind` | `party`, `enemy`, or `npc` | Actor source domain |
| `source` | asset reference string | Source asset, never a raw program path |
| `name` | string | Actor display name |
| `stats` | plain-data record | Current and maximum stats |
| `statuses` | string-to-integer record | Active status counters |
| `equipment` | plain-data record | Equipped references and derived bonuses |
| `progression` | plain-data record | Compatibility and policy values |
| `behaviour` | string or `null` | Package behaviour name only |
| `customEvents` | string array | Declared actor event names |

An actor record MUST NOT contain a callable, compiled program, host object,
emitter listener, closure, or raw `.prg` path. VM object records may retain a
host type name and ordinary plain-data members; their host methods are
re-hydrated from the installed packages after load.

Package startup runs in manifest order before actor hydration on boot and
restore. It rebuilds the session behaviour registry and host declarations from
the installed package code; neither registry is save data. Hydration resolves
each saved behaviour name against that rebuilt registry. A missing behaviour
keeps the actor data, uses core defaults, and emits one located
`behaviour.missing` diagnostic per missing name. Loading never refuses a save
for that condition. Reinstalling a package before loading resolves the same
saved name to the newly installed implementation; actor records do not carry a
package version.

The actor section schema version MUST be bumped, with a migration and a
previous-version restore fixture, whenever the persisted actor shape changes.


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
