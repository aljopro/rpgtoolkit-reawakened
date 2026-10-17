# RPGCode: language and execution

RPGCode is the scripting language of every game event. This page describes the language as the 3.1 engine actually accepts and runs it, including the quirks existing games may depend on, and states where this rebuild deliberately differs. The built-in commands are listed in [rpgcode-functions.md](rpgcode-functions.md). Four sibling pages cover one area each: [modules and objects](rpgcode-modules-and-objects.md), [errors and threads](rpgcode-errors-and-threads.md), [values, scope and conversion](rpgcode-runtime.md), and the [older dialects](rpgcode-dialects.md).

<a id="e-90"></a>
**E-90 Language.** The language surface is the subject of this page and its four siblings: dynamic values, arrays and maps, functions with overloading and references, classes with multiple inheritance, operator overloading, destructors, includes and implicit includes, redirects, error handlers, plus the legacy syntax the frontends accept. Every feature named there is a parity requirement.

**How to read this page.** A plain paragraph says what Toolkit 3.1 does. A block that opens with the words **Reawakened rule** is a deliberate addition or difference of this project, written beside the legacy behaviour it changes ([ADR 0007](../../adr/0007-docs-spec-is-the-normative-specification.md), decision 2). Where such a rule is a *departure* — a case where Toolkit 3.1 behaved differently and a game written for 3.1 could notice — the block says so and gives the reason. Rule ids such as LEX-2 and STX-4 are stable labels that code, tests and plans cite.

## Programs and encodings

A program is a `.prg` file. Its byte layout is in [../formats/rpgcode-program.md](../formats/rpgcode-program.md). The loading rules are:

- **Source text** is single-byte ANSI text (Windows-1252 on Western systems), with CR/LF or LF line endings.
- An **empty file** (0 bytes) is valid, empty program: it loads and does nothing.
- A file whose **last line has no final newline** is valid; that last line is still a statement.
- A file whose **first byte is `0x00`** is a pre-compiled program, not source text. Supporting it is optional; rejecting it with a clear message ("re-save the source") is allowed.
- A source program loads and runs exactly what it contains.

**PRG-2.** These loading rules are settled by the 3.1 corpus: all 10 sample files load, and none starts with `0x00`.

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

The rules behind the table, with the id each carries:

* **Case (LEX-10).** Keywords, identifiers and built-in names are compared and stored after ASCII lower-casing (`A`–`Z` only). The fold covers keywords, variables, labels, class and member names, function and built-in names. It does **not** cover string contents or map keys written as strings, and no locale-sensitive operation is ever used. Include file names are matched case-insensitively by the asset resolver, not by lower-casing the program's text. <!-- OWNER: LEX-10 — alternatives: lower-case only variables (leave keywords fixed), or lower-case everything including path text. Decided: ASCII lower-case for names, resolver handles paths. -->
* **Numbers (LEX-2).** A number token is `digits [ . digits ] [ e [ + | - ] digits ]` (`12`, `1.5`, `1e+6`): the longest run of characters with that shape. A run that starts with a digit but does not fit (`2x`, `1e`) is an **identifier**, not a malformed number. <!-- OWNER: LEX-2 — alternatives: make `2x` an error, or reserve `e` as the only exponent letter. Decided: longest-match, else identifier, because identifiers may legally start with a digit. -->
* **Reserved literals (LEX-9).** `true` = 1, `false` = 0 and `null` = 0 are reserved, matched case-insensitively; a variable may not be called `true`, `false` or `null`.
* **Strings (LEX-8).** A string is `"…"`, single-line. There are no escape sequences, a string cannot contain `"`, and a string cannot contain a newline; an unterminated string is an error at the end of its line. Non-ASCII bytes inside a string or comment decode as Windows-1252. <!-- OWNER: LEX-8 — alternatives: treat the bytes as raw/opaque, or as Latin-1. Decided: Windows-1252, the editor's ANSI code page. -->
* **Sigils.** A trailing `!` (numeric) or `$` (string) directly after an identifier is a legacy type sigil and is ignored: `x!`, `x$` and `x` are the same variable everywhere, including in parameters, array names and assignment targets.
* **`~` has three roles (LEX-4).** `~a` is bitwise NOT, `a ~= b` is "not equal", and `~Name` is a destructor name, recognised only directly after `method` or `::`.
* **`!=` and the sigil (LEX-3).** Toolkit 3.1 has no `!=` operator. `!` after a name is the numeric type sigil, so in 3.1 `if (opt!=1)` reads as "assign 1 to `opt!`": the assignment's value is the value assigned, so the `if` tests 1, is always true, and `opt` becomes 1. Games written that way were silently wrong under 3.1 (round 5, Q3). A `!` or `$` followed by anything but `=` is still a sigil, so `x! = 1` is `x = 1` with the sigil ignored. `operator!` and `operator$` are single operator names, not a name plus a sigil.

  **Reawakened rule — a deliberate departure from 3.1.** Adjacent `!=` is read as "not equal", a second spelling of `~=`. A `!` immediately followed by `=` is always the operator; only that adjacency decides it. `x!=1` is therefore `x != 1`, where 3.1 performed an assignment and tested its result. This is an edge case, and it is kept because the sample corpus contains an adjacent `if (opt!=1)` whose 3.1 reading is almost certainly not what the author meant; a compatibility warning may be added when a `!=` site is compiled. <!-- OWNER: LEX-3 — alternatives: (a) keep `!=` out of 3.1 and require `~=`; (b) always read `!` as a sigil so `x!=1` cannot be parsed. Decided: adjacency rule, which reproduces both corpus forms (`x! = 1` spaced, `if (opt!=1)` adjacent). -->
* **Statement end.** A statement ends at a newline or a `;`; the semicolon is optional. A block header is not a statement until its `{` (see the brace rule under keywords and structure).
* **Line continuation (LEX-1, LEX-5).** A `_` that is its own token (whitespace before it) at the end of a line continues the statement onto the next line, optionally with a `//` comment after the `_`. An `_` that is part of an identifier or number (`foo_`) continues nothing. A continued line is not "the first non-blank line", so a leading `*` on it is an operator, not a comment. <!-- OWNER: LEX-1, LEX-5 — alternatives: require `_` to hug the preceding token, or count a continued line as first-non-blank. Decided: standalone `_` token (all 6 corpus uses have the space) and no comment on a continued line. -->
* **Comments.** `// …` to the end of the line; `/* … */` (may span lines); legacy `* …` when `*` is the first non-blank character; `** …`. In a legacy Toolkit 2 file `*` may also start a trailing comment after a complete statement ([older dialects](rpgcode-dialects.md)).
* **`#` lines (LEX-6).** `#include` is the one directive read in 3.1 source; it is matched case-insensitively and `#` may be separated from `include` by whitespace. Any other leading `#` is a legacy command prefix and is ignored on that line. A `#` that is not at the start of a line is not special. Unquoted legacy arguments such as `#Mwin(Hello there)` are not 3.1 syntax and belong to the legacy frontends ([older dialects](rpgcode-dialects.md)). <!-- OWNER: LEX-6 — alternatives: reject every other `#` line, or accept `#Command` in 3.1 too. Decided: ignore other `#` lines (existing rule), `#Mwin` forms dialect-only. -->
* **Board constants (LEX-7).** Board constants and engine constants both appear as names. Engine constants fold into the compiled program. A board constant does not: the compiled code names the constant and reads its value from the board the program runs on, so a compiled file does not depend on which board loads it and the program cache can key on the file alone. <!-- OWNER: LEX-7 — alternatives: (a) bake board constants at compile time and add the board's constant set to the cache key; (b) resolve every board constant at run time (as above). Decided: (b), because it keeps a compiled program valid across boards and matches compile-from-text plus cache-by-file. -->
* **Unknown characters (LEX-11).** A character that belongs to no token — `@`, a backslash, or a `$` with no identifier before it — is a **lexical error**, reported with file and line. A legacy dialect frontend may accept the characters its own syntax uses (Toolkit 2.x uses `@` for a blank Message-Window line). <!-- OWNER: LEX-11 — alternatives: silently ignore an unknown character. Decided: error, so a typo cannot be swallowed; no corpus file contains one. -->

## Keywords and structure

- **Methods:** `method name(a, b) { … }` (also `function`), `return value`. Parameters prefixed with `&` are passed by reference.
- **Control flow:** `if (c) { } elseif (c) { } else { }`, `while (c) { }`, `until (c) { }`, `for (init; cond; step) { }`, `switch (x) { case 1: … default: … }`. **Braces are mandatory.** In the original engine `if`, `elseif`, `else`, `while` and `until` are built-in functions, not keywords; they must be followed by `{`.
- **Labels and jumps:** `:label` lines, `branch(:label)`.
- **Classes:** `class Name : Base1, Base2 { public: var x; method f() { } private: … }`; `struct` is a class with public members. Objects are created with `Name(args)`, members accessed with `obj->member`. Operators can be overloaded with methods named `operator+` etc. The detail is in [modules and objects](rpgcode-modules-and-objects.md).
- **Includes:** `include "file.prg"` compiles another program into this one.
- **Redirects:** `redirect(old, new)` makes calls to command `old` go to method `new`. **It takes effect at compile time** and only affects code compiled afterwards.
- **Error handling:** `on error goto :label`, `on error resume next`, `resume next`. The detail is in [errors and threads](rpgcode-errors-and-threads.md).
- **Scope:** variables are created on first use. Plain names are global unless a local of that name exists (or the reverse after `autolocal(true)`). A leading `:` forces a global. `local(x)` / `global(x)` declare explicitly.

The program shapes, with the id each carries:

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

* **Braces are required (STX-1, STX-4).** Every block body is written `{ … }`; a brace-less body (`if (x) stmt`) is not 3.1 syntax. A newline is allowed between a block header and its `{`: the brace may be on the header line or the line after it. A block header is not a complete statement until its `{`. <!-- OWNER: STX-1, STX-4 — alternatives: (a) require the brace on the header line (the old literal reading, which fails 6 of 9 sample programs); (b) allow brace-less single-statement bodies. Decided: brace on either line, brace-less bodies not allowed. -->
* **`}` ends the statement before it (STX-6).** A statement immediately before a closing `}` needs no `;` or newline. <!-- OWNER: STX-6 — alternative: require `;`/newline before `}`. Decided: `}` terminates, so `{ x = 1 }` is well-formed. -->
* **`else` (STX-3).** `else` may be written on the closing `}` line or on a later line; `else if` (two words) is accepted as a synonym of `elseif`. <!-- OWNER: STX-3 — alternative: allow `else` only on the `}` line, and reject `else if`. Decided: both positions, and `else if` accepted. -->
* **`case` and `default` (STX-2).** A case value is a full expression. The colon is optional: `case (v):`, `case (v)` and `case v:` are the same label. `default` may take an optional colon. Blocks do not fall through. <!-- OWNER: STX-2 — the corpus uses the colon-less `case (1)` form and never uses `default`; alternatives: make the colon mandatory (the old text) or accept both (decided). -->
* **`for` parts (STX-4).** The three parts are separated by `;` and each may be empty (`for (; cond; )`); those `;` are separators, not statement terminators.
* **`until` (SEM-2)** checks its condition **first**, then loops until the expression is true.
* **Parameters (FUN-1).** A parameter is `[Type] name [&]` — an optional class name, then the name, then an optional `&` for by-reference. The type is documentation only: it is not checked at run time and takes no part in choosing an overload. Overloading is by **parameter count** only. <!-- OWNER: FUN-1 — alternatives: (a) use the type in overload choice and check it; (b) require the type to name a real class; (c) ignore it (decided). The corpus has `method clone(CArray rhs)` but no evidence of a type check or a type-keyed overload. -->
* **No default values (FUN-5).** Default parameter values, variadics and declared return types do not exist in 3.1, and an overload never matches on type.
* **`inline` (FUN-6).** `inline` has no effect beyond its hint.
* **`return &lvalue` (FUN-3)** returns a reference, so a function call can be an assignment target; any lvalue is allowed — a variable, an index (`return &a[i]`), or a member access. <!-- OWNER: FUN-3 — alternative: restrict `return &` to a plain variable. Decided: any lvalue, because the corpus returns `&m_data[idx]`. -->
* **Labels (STX-5)** are scoped to the function (or program) that contains them; `branch(:label)` jumps within that scope and never crosses a function boundary. A label may also be passed as an argument (`branch(:label)`, `setErrorHandler(:label)`). <!-- OWNER: STX-5 — alternatives: program-wide labels, or labels that `branch` can cross out of a function. Decided: function/program scope, no crossing. -->
* **`end()`, `done` and `stop` (FUN-7)** end **the program whose code is running**, immediately and whatever the call depth: every pending function frame of that program is abandoned. Functions from included files are part of the including program, so `end()` there ends the including program. `run(prg)` ends the calling program *before* it starts the new one, so when the `run()` program calls `end()` the whole chain is finished and the rest of the game keeps running. (Reviewed extraction fact R2-Q20, `docs/provenance/facts-round-2.md`; it replaces the earlier ruling that a `run()` program returns to its caller. How a thread's own `end()` behaves is part of the thread rules.)
* **A bare identifier** on its own line is treated as a zero-argument call (legacy `end` → `end()`).
* **`method` and `function` (FUN-4)** are interchangeable, and neither is legacy; `returnMethod` is the Toolkit 2.x return spelling ([older dialects](rpgcode-dialects.md)).

### Values and variables

* **Dynamic typing.** A value is a number (a double) or a string. Mixing in `+` concatenates (`"Hello " + 32` → `"Hello 32"`). Object handles are numbers. [Values, scope and conversion](rpgcode-runtime.md) settles comparison and conversion.
* **No declaration needed; scope defaults to global (SEM-4).** `local(x)` / `global(x)` select scope explicitly, and `autoLocal(true)` makes new variables local to the current function or program. The full scope rules are in [values, scope and conversion](rpgcode-runtime.md).
* **Declare and assign (FUN-2).** `local(x) = v` and `global(x) = v` declare the variable in the chosen scope and assign it in one statement; this is the ordinary form for a new local (for example in a `for` initialiser) and it uses the reference-return rule above. `local(x)` on its own declares the variable and leaves it unset. <!-- OWNER: FUN-2 — alternatives: make `local(x)` alone an error (must be assigned), or have it return the variable's value. Decided: it declares and leaves unset, matching an unset variable's `""`/0 read. -->
* **`kill` (SEM-1).** `kill(x)` unsets a variable; `kill(a[i])` unsets one array element; `kill(a, b, …)` unsets several in one call. Whether `kill(a)` on a whole array differs from unsetting it element by element is a binding question settled by the entry that implements the built-ins. <!-- OWNER: SEM-1 — this is a runtime-meaning row; the forms the corpus uses are stated here so the parser is complete, and entry 12 confirms the binding semantics. Alternatives: element-only, or whole-array as a distinct form. -->
* **Arrays and maps.** `a[0]`, `a[1][2]`, `m["key"]`. Any expression can be an index, multi-dimensional arrays are allowed, and arrays are sparse.
* **Bare identifier index (EXP-1).** An index written as a bare identifier (`a[i]`) is a variable lookup: `i` is evaluated as a variable. The legacy Toolkit 2.x form, where an unquoted word is taken as a string key (`m[key]` meaning `m["key"]`), is not 3.1 syntax and is handled by the Toolkit 2.x frontend ([older dialects](rpgcode-dialects.md)).
* **Unset variables** read as `""` / 0. The full rule is in [values, scope and conversion](rpgcode-runtime.md).

## Expressions

Precedence, lowest to highest:

assignment (`= += -= *= /= %= ^= &= |= <<= >>=`, right-associative) → `?:` → `||` → `&&` → `|` → `` ` `` (xor) → `&` → `==` `~=` → `<` `>` `<=` `>=` → `<<` `>>` → `+` `-` → `*` `/` `%` → `^` (power, **left**-associative) → unary `!` `~` `-` `++` `--` → postfix `++` `--`, `->`, call, `[]`.

Operators on one row have equal precedence. Written from the top down, as a parser should build it:

| Precedence | Operators | Associativity |
|---|---|---|
| 1 (tightest) | `()` call, `[]` index, `->` member, postfix `++` `--` | left |
| 2 | unary `-` `+` `!` `~`, prefix `++` `--` | right |
| 3 | `^` (power) | left |
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
| 15 (loosest) | `=` `+=` `-=` `*=` `/=` `%=` `^=` `&=` `\|=` `` `= `` `<<=` `>>=` | right |

* **`^` is power, and it binds looser than unary minus (R-30).** It is left-associative: `-2^2` is `(-2)^2` = 4, and `2^3^2` is `(2^3)^2` = 64. The backtick `` ` `` is XOR, not `^`. This reading is the settled one; the earlier Reawakened reading that put `^` above unary minus and made it right-associative was withdrawn by the owner's 2026-10-15 ruling that this page wins, because scripts were written against the legacy table. <!-- OWNER: EXP-2 — the two judgement calls: (a) `^` is power and sits above unary minus, right-associative, so `-2^2` is `-(2^2)`; (b) the bitwise operators `&`, the backtick and `|` sit *below* the comparisons, as in C, so `x & y == z` is `x & (y == z)`. Alternatives: put `^` below unary minus (C-ish `-2^2` = `(-2)^2`), or rank the bitwise operators above comparisons (as some BASICs do). This is the table entry 5 must implement; change it here if you prefer the alternatives. --> <!-- SUPERSEDED: EXP-2 part (a) withdrawn by the owner's ruling of 2026-10-15 (R-30) — `^` now sits below unary minus and is left-associative, as this page's table shows; part (b) is unchanged. -->
* **Comparison:** `==`, `~=`, `!=`, `<`, `<=`, `>`, `>=`. `~=` and, under the departure above, `!=` mean "not equal".
* **Logical:** `&&` and `||`, and the words `and` / `or`; `!` is logical NOT, `~` is bitwise NOT.
* **Arithmetic:** `+ - * / % ^` (power), unary `-` and unary `+` (numeric identity), `++` / `--` (prefix and postfix).
* **`&` has three roles (EXP-3),** told apart by position: a parameter written `&name` declares a by-reference parameter; `return &lvalue` returns a reference; everywhere else it is the bitwise AND operator. An explicit `&x` in an argument list is **not** how by-reference is expressed — the callee's parameter decides — so `&` in an argument position is the bitwise operator, or an error. <!-- OWNER: EXP-3 — alternatives: allow an explicit `&x` at the call site to force by-reference (older BASIC style). Decided: no; by-reference is the callee's `ParamSpec`, which avoids an unary/binary ambiguity. -->
* **`=` in a condition (EXP-4).** In 3.1 syntax a single `=` in a condition is an **assignment** (its value is then tested), never a comparison; `==` is equality. The legacy reading of `=` as equality applies only inside files parsed by the Toolkit 2.x frontend ([older dialects](rpgcode-dialects.md)). <!-- OWNER: EXP-4 — alternatives: (a) treat `=` as equality everywhere (the legacy reading), so `x = 5` in an `if` never assigns; (b) gate the legacy reading on a file that is detected as TK2 (as decided). Decided: (b), because the one 3.1 corpus site reads as assignment and 293 TK2 sites are equality. -->
* **Where `:` and `.` are legal (EXP-5).** `:` appears in the ternary `a ? b : c`, in a label `:name`, after a `case` value, after an access label (`public:` `private:` `protected:`), in a class base list (`class CName : CBase, COther`) and in the scope separator `::` (`method CName::CName`). `.` is not an operator: member access is `->`, and a `.` only separates the file and function names of an implicit include (`file.func`, [modules and objects](rpgcode-modules-and-objects.md)) or appears inside a string a program builds itself. `++`/`--` may not be split across a line. <!-- OWNER: EXP-5 — alternatives: give `.` a member-access meaning, or allow `++` across lines. Decided: `:` in those six places only, `.` is not an operator. -->
* **Indexing (EXP-6)** is a postfix `[expr]` that may follow any primary value: a variable, a call result (`f(x)[i]`), a member access (`obj->arr[i]`), or another index, so `a[1][2]` indexes twice. `m["key"]` is a string-keyed map. <!-- OWNER: EXP-6 — the grammar was prose-only; alternatives: forbid indexing a call result, or make `[ ]` follow only names. Decided: postfix on any primary. -->
* **Ternary and member access:** `a ? b : c`; `obj->member` / `obj->method()`.

### Compatibility notes

1. **Adjacent `!=` is read as "not equal" here, not as 3.1's assignment** (see LEX-3 above) — a deliberate departure.
2. **No short-circuit evaluation (R-40).** `&&`, `||` and `?:` evaluate all operands.
3. **Reading a variable truncates its number to an integer.** `x = 1.5; y = x + 0` gives `y = 1`. Literals and intermediate results keep their fractions. (Inferred from the code, not observed.)
4. **Strings are true unless they equal `"off"`** (case-insensitive), so `""` is true (R-39). This is the truth test for a condition; note that it differs from the plain numeric truthiness the older §9.16 used.
5. **Numbers convert to text with 6 significant digits.** The full algorithm is in [values, scope and conversion](rpgcode-runtime.md).
6. Arrays are not containers: `a[i]` is just a variable whose name is `a[<value of i>]`. `a[1]` and `a["1"]` are the same.
7. `++x` followed by a binary operator can mis-parse in the original grammar; write `(++x) == y`.

## Execution

- Each program is compiled once per session and cached by file name. **Edits to a program during play are not picked up** (R-38c).
- A **blocking** program (started by a trigger, the menu, the start-up program, or `Run`) runs to completion before the game continues; the window stays responsive. See [errors and threads](rpgcode-errors-and-threads.md) for what a blocking command does inside a thread.
- An error in a built-in either jumps to the active `on error goto` label, is ignored (`on error resume next`), or shows an "RPGCode Error" message box; **execution then continues with the next statement** (R-38c). `Debug(on)` turns error and warning messages on or off (`Debugger(text)` shows a message).
- Compile errors are reported when the program is first loaded.
- **Error line numbers (R-38a).** A report names the exact line of the failing statement.

  **Reawakened rule.** Reports carry the exact line, with no offset. *Legacy fact:* 3.1 prepends a dummy first line before compiling and compensates for it, so syntax errors came out exact; two declaration errors — a method defined twice with the same parameter count, and a call to a class method that does not exist — came out one line too high, an unmatched brace came out approximate, and a runtime error was approximate and probably exact (round 5, Q5). Since a script cannot observe the offset, reporting the exact line is the safest reading and nothing depends on the old off-by-one.

<a id="e-91"></a>
**E-91 Program cache.** Parsed programs are cached by file name, so re-running one is cheap.

<a id="e-98"></a>
**E-98 Debugging.** A debug window shows runtime error messages ("near line N") that name the file and the line; `Debugger(text)` writes to it, and a debug toggle (`Debug(on)`) turns error and warning output on or off. Which line a message names is the R-38a rule above.

## Threads

A thread is a whole program run in the background, a slice of instructions per frame ([main-loop-and-startup.md](main-loop-and-startup.md#timing)), while the game keeps playing.

- Created by board threads, by an item's "multitask" program, or by `Thread(file, persistent)`. If `file` does not exist in `Prg\`, the text itself is compiled as code.
- Non-persistent threads belong to the current board and are destroyed when the board changes. Persistent threads survive board changes.
- `ThreadSleep(thread, seconds)` pauses a thread; `ThreadWake(thread)` wakes it.
- **Threads do not pump window messages.** A blocking command (`Wait`, `Delay`, `Prompt`…) inside a thread freezes the whole game until it completes.
- A finished thread stays registered until it is killed or its board is left.
- Threads are saved with their full execution state ([../formats/save-game.md](../formats/save-game.md#program-state-inside-each-thread-field-46)).

The sleep unit, the per-thread `source`/`target` handles, the preemption budget and the blocking-command rule are in [errors and threads](rpgcode-errors-and-threads.md).

<a id="e-93"></a>
**E-93 Threads.** Board threads (they die on board exit), persistent threads (`Thread(file, true)`) and item threads (they die with the item). The operations are sleep (timed or indefinite), wake, query the remaining sleep, kill, get id, and `TellThread(id, code)` to run code in the thread's context. A thread whose program reaches its end finishes, and loops must be explicit.

<a id="e-46"></a>
**E-46 Item multitask program.** Runs as a thread for as long as the item is on the board and active; `source` and `target` are the item.

## Objects and memory

Objects are numeric handles. Their members are stored as global variables named `<handle>::<member>`. A collector runs every 10 minutes and removes the members of objects no longer referenced by any variable; destructors are **not** called by it. Those are legacy facts; this rebuild replaces the wall-clock collector with a deterministic per-tick pass, and the class and object rules are in [modules and objects](rpgcode-modules-and-objects.md).

## Virtual variables

The engine exposes 44 read-only variables that mirror engine state (R-37):

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

**Reawakened rule.** Two engine-backed names that the legacy engine also had are kept as additions here, because existing games use them and `docs/spec` does not list them: `threads[i]`, the live thread table, and `ambientRed`, `ambientGreen`, `ambientBlue`, the ambient light level (call `forceRedraw()` after assigning one). They are marked as additions, not as part of the 44 read-only set, so an implementer can tell which names come from the legacy specification. (Owner ruling U2, 2026-10-15.)

<a id="e-92"></a>
**E-92 Variables.** One global namespace that persists across programs and boards and is included in saves; locals are per call; the engine-backed "virtual" variables in the table above are read and written through the engine (party positions, board data, ambient light, game time).

<a id="e-15"></a>
**E-15 Board constants and titles.** The current board's constants and layer titles are exposed to scripts (`constant[0..10]`, `boardtitle[1..8]`) and are also substituted as named constants, under the board-constant rule (LEX-7) in the lexical rules above.

<a id="e-87"></a>
**E-87 Game time and steps.** The total play time in seconds and the total step count are exposed to scripts (`gametime`) and are saved with the game.

## Compile-time constants

The lexer substitutes 24 named constants before parsing:

| Name | Value |
|---|---|
| `tkMV_PAUSE_THREAD` | 1 |
| `tkMV_CLEAR_QUEUE` | 2 |
| `tkMV_PATHFIND` | 4 |
| `tkMV_WAYPOINT_PATH` | 8 |
| `tkMV_WAYPOINT_LINK` | 16 |
| `tkVT_SOLID` / `UNDER` / `STAIRS` / `WAYPOINT` | 1 / 2 / 8 / 16 |
| `tkVT_BKGIMAGE` / `ALL_LAYERS_BELOW` / `FRAME_INTERSECT` | 1 / 2 / 4 |
| `tkPRG_STEP` / `KEYPRESS` / `REPEAT` / `STOPS_MOVEMENT` | 0 / 1 / 2 / 4 |
| `tkDIR_E`, `SE`, `S`, `SW`, `W`, `NW`, `N`, `NE` | 1 … 8 |

The `tkVT_*` (vector types), `tkPRG_*` (program activation types) and `tkDIR_*` (directions) values match the board-file and movement values in this spec.

**Special handles.** `"target"` and `"source"` refer to the entity currently acting or acted upon: the item being talked to, the fighters in a battle move, the sprite that owns the thread. Many sprite functions also accept a party handle (a character name), a party index, or a board item slot number. The per-thread lifetime of the pair is in [errors and threads](rpgcode-errors-and-threads.md).

## Plugin commands

A call that matches neither a built-in nor a method of the program is offered to the loaded RPGCode plugins when the program is compiled. At run time the call is passed to the plugin **as rebuilt source text**: numbers formatted, strings quoted (not escaped), and variables passed **by name** so the plugin can read and write them through the callback interface ([plugins-and-battle.md](plugins-and-battle.md)).

## Open questions

These follow from the migration and are recorded here rather than silently decided. Each is owned by the entry named, and none is a rule yet:

1. **ADR 0004, decision 1** still says Toolkit 2.x used `< … >` block delimiters. It did not: `< … >` with `then` is Toolkit 1.x, and Toolkit 2.x uses `{ }` ([older dialects](rpgcode-dialects.md)). The ADR needs correcting.
2. **The architecture spine's `Deferred` list** still carries the per-tick budget and the legacy seconds-per-step conversion as unruled. The settling rules are in [errors and threads](rpgcode-errors-and-threads.md); the spine line should be marked done, keeping the budget's *number* provisional.
3. ~~**AD-7's `ProgramRef`** has no field for a program's ordered run-time include list.~~ Settled by entry 3.8: a program reference carries an optional `includes` list (folded references, in the order `include()` added them), omitted when empty.
4. ~~**AD-7's compiled-program cache key** must cover the redirect table in force at compile time.~~ Settled by entry 3.8: a program reference carries an optional `redirects` table, and the cache key is the source (text, or path and source hash), the compiler version, the include list and the redirect table.
5. **AD-10's `GameState`** carries no VM-step counter, while a snapshot "step" is defined as one VM instruction ([errors and threads](rpgcode-errors-and-threads.md)); the entry that adds per-step snapshot comparisons must place that counter or fold it into the time section.
6. **The `system.prg` role and the ownership map** are recorded in [modules and objects](rpgcode-modules-and-objects.md) and [rpgcode-functions.md](rpgcode-functions.md); the epic and architecture documents that name an owner should be checked against them when their entries are planned.
7. **An importer warning for `FileInput`.** Read lines correctly is the rule ([values, scope and conversion](rpgcode-runtime.md)); the only files whose behaviour changes are data files with LF-only lines or no final newline. Whether the importer should warn about those is open, and nothing is built for it.
