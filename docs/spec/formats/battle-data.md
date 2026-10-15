# Battle data: fight backgrounds, status effects, special moves

Three small files used by battles and the menu. All three have no version branches in their binary form; the editor writer and the engine reader agree field for field.

## Fight background (`.bkg`)

Lives in `Bkrounds\`. Referenced by boards (`battleBackground`) and scripts.

| # | Field | Type | Meaning |
|---|---|---|---|
| 1 | header | string | `RPGTLKIT BKG` |
| 2 | major, minor | short, short | the editor writes 2, 3; ignored |
| 3 | image | string | background image in `Bitmap\` (often a `.tbm`) |
| 4 | music | string | battle music in `Media\` |
| 5 | selectSound | string | menu cursor moved |
| 6 | chooseSound | string | menu item chosen |
| 7 | readySound | string | a fighter's charge bar is full |
| 8 | cantDoSound | string | action not possible |

Toolkit 2 text backgrounds: [legacy/text-formats.md](legacy/text-formats.md#fight-background).

## Status effect (`.ste`)

Lives in `StatusE\`. Applied by special moves and scripts during battle.

| # | Field | Type | Meaning |
|---|---|---|---|
| 1 | header | string | `RPGTLKIT STATUSE` |
| 2 | major, minor | short, short | the editor writes 2, 2; ignored |
| 3 | name | string | |
| 4 | rounds | short | how many rounds it lasts; decremented each round, removed at 0 |
| 5 | speed | short | non-zero = the fighter charges faster (charge rate +2 per tick while active) |
| 6 | slow | short | non-zero = the fighter charges slower (−2 per tick) |
| 7 | disable | short | non-zero = the fighter's charge is frozen (cannot act) |
| 8 | hp | short | non-zero = remove HP every round … |
| 9 | hpAmount | short | … this much (positive = damage, negative = healing; HP is clamped at 0) |
| 10 | smp | short | non-zero = remove SMP every round … |
| 11 | smpAmount | short | … this much (clamped at 0) |
| 12 | code | short | non-zero = run `prg` every round, with the affected fighter as both source and target |
| 13 | prg | string | program in `Prg\` |

Toolkit 2 text status effects: [legacy/text-formats.md](legacy/text-formats.md#status-effect).

## Special move (`.spc`)

Lives in `SpcMove\`. Learned by characters (see [character.md](character.md)) and used by enemies.

| # | Field | Type | Meaning |
|---|---|---|---|
| 1 | header | string | `RPGTLKIT SPLMOVE` |
| 2 | major, minor | short, short | the editor writes 2, 2; ignored |
| 3 | name | string | |
| 4 | fp | int | HP removed from the target (negative = healing; HP clamped at 0) |
| 5 | smp | int | SMP it costs the user (clamped at 0; the built-in enemy AI only picks a move it can afford) |
| 6 | prg | string | program run when the move is used |
| 7 | targetSmp | int | SMP removed from the target (clamped at 0) |
| 8 | battle | byte | usable in battle (see note) |
| 9 | menu | byte | usable from the menu (see note) |
| 10 | statusEffect | string | `.ste` applied to the target |
| 11 | animation | string | `.anm` played when it is used |
| 12 | description | string | |

**Compatibility note on fields 8-9:** the 3.1.0 editor writes these two flags inverted relative to its checkboxes and loads them back without inverting, so re-opening a move in the editor can flip them (inferred from the editor code; no sample file exists). The engine passes the raw values to plugins. A new implementation should decide on one meaning (1 = usable is the natural reading) and treat existing files with care.

Toolkit 2 text special moves: [legacy/text-formats.md](legacy/text-formats.md#special-move).

## Examples

[../examples/listings/fireball.spc.txt](../examples/listings/fireball.spc.txt), [../examples/listings/burn.ste.txt](../examples/listings/burn.ste.txt), [../examples/listings/forest.bkg.txt](../examples/listings/forest.bkg.txt).
