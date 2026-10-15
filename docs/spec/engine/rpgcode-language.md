# RPGCode: language and execution

RPGCode is the scripting language of every game event. This page describes the language as the 3.1 engine actually accepts and runs it, including the quirks existing games may depend on. The built-in commands are listed in [rpgcode-functions.md](rpgcode-functions.md).

## Lexical rules

| Topic | Rule |
|---|---|
| Statement end | newline or `;` |
| Line continuation | `_` at the end of a line |
| Comments | `//` and `**` to end of line; a line starting with `*`; `/* … */` |
| Legacy marker | a leading `#` on a command is ignored (Toolkit 2 syntax) |
| Identifiers | letters, digits and `_`, may start with digits if they contain a letter or `_`, optional leading `~`. **Case-insensitive** (lower-cased). A trailing `!` (number) or `$` (string) is ignored, so `x`, `x!` and `x$` are the same variable. |
| Strings | `"…"`, no escape sequences |
| Numbers | decimal, double precision |
| Booleans | `true`, `false`; `null` |

## Keywords and structure

- **Methods:** `method name(a, b) { … }` (also `function`), `return value`. Parameters prefixed with `&` are passed by reference.
- **Control flow:** `if (c) { } elseif (c) { } else { }`, `while (c) { }`, `until (c) { }`, `for (init; cond; step) { }`, `switch (x) { case 1: … default: … }`. **Braces are mandatory.** In the original engine `if`, `elseif`, `else`, `while` and `until` are built-in functions, not keywords; they must be followed by `{`.
- **Labels and jumps:** `:label` lines, `branch(:label)`.
- **Classes:** `class Name : Base1, Base2 { public: var x; method f() { } private: … }`; `struct` is a class with public members. Objects are created with `Name(args)`, members accessed with `obj->member`. Operators can be overloaded with methods named `operator+` etc.
- **Includes:** `include "file.prg"` compiles another program into this one.
- **Redirects:** `redirect(old, new)` makes calls to command `old` go to method `new`. **It takes effect at compile time** and only affects code compiled afterwards.
- **Error handling:** `on error goto :label`, `on error resume next`, `resume next`.
- **Scope:** variables are created on first use. Plain names are global unless a local of that name exists (or the reverse after `autolocal(true)`). A leading `:` forces a global. `local(x)` / `global(x)` declare explicitly.

## Expressions

Precedence, lowest to highest:

assignment (`= += -= *= /= %= ^= &= |= <<= >>=`, right-associative) → `?:` → `||` → `&&` → `|` → `` ` `` (xor) → `&` → `==` `~=` → `<` `>` `<=` `>=` → `<<` `>>` → `+` `-` → `*` `/` `%` → `^` (power, **left**-associative) → unary `!` `~` `-` `++` `--` → postfix `++` `--`, `->`, call, `[]`.

**Compatibility notes:**

1. **Not-equal is `~=`.** `a != b` is read as `a!` `=` `b`, an assignment, because `!` is a type sigil.
2. **No short-circuit evaluation.** `&&`, `||` and `?:` evaluate all operands.
3. **Reading a variable truncates its number to an integer.** `x = 1.5; y = x + 0` gives `y = 1`. Literals and intermediate results keep their fractions. (Inferred from the code, not observed.)
4. **Strings are true unless they equal `"off"`** (case-insensitive), so `""` is true.
5. **Numbers convert to text with 6 significant digits.**
6. Arrays are not containers: `a[i]` is just a variable whose name is `a[<value of i>]`. `a[1]` and `a["1"]` are the same.
7. `++x` followed by a binary operator can mis-parse in the original grammar; write `(++x) == y`.

## Execution

- Each program is compiled once per session and cached by file name. **Edits to a program during play are not picked up.**
- A **blocking** program (started by a trigger, the menu, the start-up program, or `Run`) runs to completion before the game continues; the window stays responsive.
- An error in a built-in either jumps to the active `on error goto` label, is ignored (`on error resume next`), or shows an "RPGCode Error" message box; **execution then continues with the next statement**. `Debug(on)` turns error and warning messages on or off (`Debugger(text)` shows a message).
- Compile errors are reported when the program is first loaded.

## Threads

A thread is a whole program run in the background, a slice of instructions per frame ([main-loop-and-startup.md](main-loop-and-startup.md#timing)), while the game keeps playing.

- Created by board threads, by an item's "multitask" program, or by `Thread(file, persistent)`. If `file` does not exist in `Prg\`, the text itself is compiled as code.
- Non-persistent threads belong to the current board and are destroyed when the board changes. Persistent threads survive board changes.
- `ThreadSleep(thread, seconds)` pauses a thread; `ThreadWake(thread)` wakes it.
- **Threads do not pump window messages.** A blocking command (`Wait`, `Delay`, `Prompt`…) inside a thread freezes the whole game until it completes.
- A finished thread stays registered until it is killed or its board is left.
- Threads are saved with their full execution state ([../formats/save-game.md](../formats/save-game.md#program-state-inside-each-thread-field-46)).

## Objects and memory

Objects are numeric handles. Their members are stored as global variables named `<handle>::<member>`. A collector runs every 10 minutes and removes the members of objects no longer referenced by any variable; destructors are **not** called by it.

## Virtual variables

44 read-only variables mirror engine state:

| Names | Meaning |
|---|---|
| `playerx[0..4]`, `playery[0..4]`, `playerlayer[0..4]` | tile position and layer of party member *i* |
| `playerhandle[0..4]` | name of party member *i* |
| `boardtitle[1..8]` | the current board's layer titles |
| `constant[0..10]` | the current board's constants |
| `music` | the music file playing |
| `gametime` | seconds played |
| `boardbackground`, `boardskill` | the current board's battle background and skill |
| `cnvrendernow` | canvas handle of the script overlay |

**Compatibility note:** assigning to a virtual variable in the original engine breaks its link to the engine for the rest of the session.

## Compile-time constants

The lexer substitutes 24 named constants before parsing: movement flags `tkMV_PAUSE_THREAD` (1), `tkMV_CLEAR_QUEUE` (2), `tkMV_PATHFIND` (4), `tkMV_WAYPOINT_PATH` (8), `tkMV_WAYPOINT_LINK` (16), and the `tkVT_*` (vector types), `tkPRG_*` (program activation types) and `tkDIR_*` (directions) families, whose values match the board-file and movement values in this spec.

## Plugin commands

A call that matches neither a built-in nor a method of the program is offered to the loaded RPGCode plugins when the program is compiled. At run time the call is passed to the plugin **as rebuilt source text**: numbers formatted, strings quoted (not escaped), and variables passed **by name** so the plugin can read and write them through the callback interface ([plugins-and-battle.md](plugins-and-battle.md)).
