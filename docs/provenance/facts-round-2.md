<!-- Reviewed fact sheet, clean-room extraction round 2 (ADR 0006). Status: reviewed prose facts, not yet folded into format-spec.md or engine-features.md; each ruling that uses them is its own doc-first commit (G7). Questions: questions-round-2.md. Legacy revision consulted: 9191b919. Review: two independent reviewers; zero blockers after edits; see extraction-log.md. -->

# Clean-room extraction, round 2 - staging answers (REVIEWED, EDITED)

* **Source consulted:** legacy RPG Toolkit checkout, revision 9191b919 (full 9191b9191c9bda0998c6faae16929b3331ed2ead). Only the C++ (3.1-line) RPGCode interpreter, its lexer/grammar, the plugin host and the plugin callback layer were used. The older VB (3.0-line) engine was not examined.
* **Date:** 2026-10-12
* **Questions answered:** R2-Q1 to R2-Q26, from `questions-round-2.md`.
* **Terminology used below:** the unset number is the value a never-assigned variable or a failed call produces: it behaves as the number 0 in numeric contexts and as the empty string in string contexts (see R2-Q14). A report is the interpreter's error report: an on-screen box with the program file name, an approximate source line and a message, which waits for a key other than an arrow key and then lets the program continue. A frame is one active script-function call.
* Everything below is prose; no source expression is reproduced. Where a fact is inferred from structure rather than visible in a single place, it is marked as inferred.

---

## R2-Q1 - A command name that nothing claims

* **Outcome.** The call is a runtime error raised when the call is reached (not at load time): a report is shown (unless debug messages have been switched off, see R2-Q11), and then the program carries on with the next instruction. The program is not stopped, and nothing is logged to a file.
* **Top level versus function.** There is no difference in outcome. The only difference is that inside a function a handler set by that function can intercept the error (R2-Q3, R2-Q10); at top level no handler can exist, so the report is always the result.
* **Note.** Names are resolved when a program is loaded (and again when a runtime include adds code), never lazily at call time: first built-ins, then script functions of matching name and parameter count (program plus includes), then plugins. A name that resolves to none of these stays flagged as unresolved and raises the error each time the call is reached.

## R2-Q2 - Value of an unclaimed call inside an expression

The failed call leaves behind the unset number (a number 0 that reads as the empty string in string context), and evaluation continues with it.

| Context | Resulting value and type |
|---|---|
| Statement on its own | Nothing observable beyond the report. |
| Assignment `x = unknown(1)` | The variable is created (if new) and holds the unset number: numeric 0, and the empty string as a string. |
| Condition `if (unknown() == 0)` | Compares as number 0 against 0, so true. `if (unknown())` is false. Compared with a string it compares as the empty string. |
| Argument to another call | Passed as the unset number. |

This only applies when execution continues after the report or under a resume-next handler. If a labelled handler takes over, the rest of the statement is abandoned (R2-Q10).

## R2-Q3 - Can an error handler observe an unclaimed call?

* **Catchable:** yes. It is raised as an ordinary runtime error and goes through exactly the same handler path as built-in failures, so a handler set in the calling function (labelled handler or resume-next handler) intercepts it. It does not bypass handlers.
* **Resume behaviour:** with the resume-next handler the error is swallowed and execution continues at the very next instruction unit (which may be in the middle of the same statement, with the failed call contributing the unset number). With a labelled handler, control jumps to the label; `resumeNext()` there continues at the statement after the failing one. Neither the failing name nor the line is made available to the script (no variable or function exposes the message or line).

## R2-Q4 - A plugin that claims a name and then fails or returns nothing

* **Claim time.** Plugins are asked once, when the calling program is loaded: each plugin that declares RPGCode capability is asked in load order whether it handles the (lower-cased) name, and the first yes wins and is remembered for that call site. The name is never re-offered to later plugins at run time, and a script function with the same name and parameter count takes precedence over any plugin.
* **Failure.** The success flag returned by the plugin's execute step is ignored. A plugin that reports failure is therefore indistinguishable from one that returned nothing; no error is raised and no message is shown.
* **Void.** The call's value is the unset number (0 / empty string).
* **Number.** The value is that number.
* **String.** The value is that string (never parsed; R2-Q8).

## R2-Q5 - TK2 `#Name(...)` lines for an unknown name

In the C++ interpreter there is no separate TK2 path: the lexer simply discards a `#` character wherever it occurs, so `#Name(...)` is the same call as `Name(...)` and an unknown name follows R2-Q1 to R2-Q3 exactly (error report, then continue). It is never turned into dialogue. A loose text line with no call syntax is not accepted by the grammar at all (a load-time syntax error report), because converting such lines is the job of the editor's update step, not the engine (inferred; nothing in the C++ interpreter converts them). Whether the older VB engine turned bare text lines into dialogue is not settled; it was not examined.

## R2-Q6 - Plugin callbacks into the interpreter: nested or queued?

* **Nested versus queued:** nested and immediate. The run-a-line-of-RPGCode callback builds a brand-new, independent program from the given text and runs it to completion on the spot, inside the plugin call; nothing is queued. When it returns the plugin continues, and then the calling script resumes after the plugin call. The caller's position, stack and locals are untouched.
* **Recursion:** allowed with no guard. The nested program is parsed afresh, so it resolves names (including the same plugin) like any program, and the plugin can be re-entered to any depth until the host's own stack runs out. The nested program has its own local variables (it cannot see the caller's locals); globals are shared. The variable get/set callbacks, in contrast, address the variables of the program that made the plugin call (including its locals) while a plugin call is active.

## R2-Q7 - Does a plugin call block the whole interpreter and engine?

* **Rule:** yes, everything waits. The plugin is called synchronously on the one thread that runs scripts and the game; no other script thread, movement or rendering step runs until it returns, and there is no time limit or watchdog. A plugin that wants the game to keep moving must use the callbacks that themselves pump events or draw. (That rendering and movement wait is inferred; see Confidence.)
* **Confidence:** the blocking rule is certain at the interpreter and plugin-host level. The top-level game loop that schedules threads and rendering was not found in the checkout, so the statement about rendering waiting is inferred.

## R2-Q8 - What a plugin's return value becomes

| Return type | Statement | Assignment | Condition |
|---|---|---|---|
| Void (no value set) | Ignored | Variable gets the unset number | Reads as 0 (false) |
| Number | Ignored | Variable gets the number | Truthy if non-zero |
| String | Ignored | Variable gets the string (typed string) | Read as number via leading-numeric conversion (R2-Q12), so usually false unless it starts with a non-zero number |

A returned string is never parsed or executed as RPGCode.

## R2-Q9 - File plugin paths

* **The `filereadwrite` plugin itself:** not settled. No source or binary for it exists in the checkout, so nothing can be said about its own path handling.
* **Built-in file commands (openFileInput, openFileOutput, openFileAppend, and the legacy openFileBinary):** the second argument is a folder name. It is appended directly to the game project folder (the project path recorded in the game's main file), then a backslash and the file name. The one exception: a folder named Saved (any letter case) is used as given, relative to the engine's working directory, i.e. outside the project folder.
* **Escape handling:** none. No checking for `..`, drive letters or separators is done; `..` segments pass straight to the operating system, so a script can reach outside the game folder with them. An absolute path given as the folder or file name does not work as an absolute path (it is simply appended after the project path and fails to open).
* **Writable set:** any folder under the project folder (including Boards, Prg and so on) plus the Saved folder; there is no allowlist.

## R2-Q10 - Handler scope and resume (ERR-1)

* **Top level:** a handler cannot be set at program top level. Setting one outside a function raises an error itself (a report); handlers exist only inside functions.
* **Handler storage:** the handler belongs to the single function frame that set it, and lasts until that frame returns. It stays active after being used (it is only cleared if its label cannot be found).
* **Labels:** resolved over the whole loaded program (main file followed by appended includes) by a first-match scan for a label of that name, case-insensitively; labels are not function-local. The first match in program order is used, which may be in another function.
* **Resume:** `resumeNext()` continues at the statement after the one that was executing when the error was raised. The error return point is remembered per frame and consumed on use. Calling it with no handler invoked, or outside a function, is itself an error.
* **Half-evaluated state:** values already pushed for the failing statement stay on the evaluation stack until the first complete statement in the handler finishes, at which point the stack is cleared; so effectively the partial state is dropped.
* **Nested built-ins and called functions:** a built-in that fails inside the frame is seen by that frame's handler. An error inside a called script function is seen only by the callee's own handler; if it has none it is reported and the callee continues, and it never propagates to the caller's handler (consistent with the format-spec statement).

## R2-Q11 - Which failures are errors and catchable (ERR-2)

All of the following are raised the same way and are catchable by a frame handler unless noted; the default outcome without a handler is report, then continue with the next instruction, never a stop. Reports are suppressed when debug messages are disabled with `debug(false)` (default is enabled). A failure of a non-standard kind (a host exception not of the interpreter's own error kinds) is always reported as an error of unknown kind and is not affected by `debug`.

| Failure class | Outcome | Catchable |
|---|---|---|
| Unknown function or wrong argument count for a script function | Runtime error, report, continue; call yields unset number | Yes |
| Wrong argument count or invalid argument for a built-in | Runtime error naming the required count, report, continue | Yes |
| Type mismatch for ordinary values | Not an error: values are coerced (R2-Q12) | n/a |
| Typed parameter given an object of the wrong class | Runtime error | Yes |
| Invalid object handle, missing class, inaccessible member or method | Runtime error | Yes |
| Array index out of range | Not an error: arrays are sparse maps; reading creates an unset element | n/a |
| Division by zero (`/`) | Not an error: floating point infinity or NaN results (assuming the default floating-point mode; the build's exception mode was not found) | n/a |
| Modulo by zero | Integer fault; not settled whether the original build converted it to a catchable error | Not settled |
| Built-in failure (missing file, item, player, board index, etc.) | Runtime error, report, continue; some built-ins instead silently return nothing (for example file reads on an unopened file) | Yes where raised |
| Obsolete built-ins | Raised as an error (or, for a few, a warning); both kinds go through handlers identically | Yes |
| Load-time problems (syntax error, unmatched brace, missing base class, missing constructor) | Reported once while loading; the partly built program still runs | No (before any frame exists) |

## R2-Q12 - Comparison and coercion (SEM-3)

Rules:
* Values are numbers (double) or strings. A variable that has never been assigned counts as a number for typing purposes.
* `==` and `~=`: if both operands are number-typed, numeric comparison; otherwise both are converted to strings and compared exactly, byte for byte, case-sensitively. `<`, `<=`, `>`, `>=` always compare numerically (strings are converted by leading-numeric parsing), so string ordering is not available. `&&`, `||`, `!` are numeric truthiness; both sides of `&&`/`||` are always evaluated (no short-circuit).
* String to number: leading numeric prefix is parsed (optional sign, digits, fraction, exponent); the rest is ignored; no numeric prefix gives 0.
* Number to string: default stream formatting, six significant digits, shortest form (no trailing zeros); large or small values use exponent form. Exponent digit count depends on the runtime of the original build (old MSVC runtimes wrote three digits).
* **Surprising rule (high confidence from source):** when a number is read from a variable by name (as opposed to a literal or a computed temporary), it is truncated toward zero to a whole 32-bit integer before use in arithmetic, comparisons, `castNum` and numeric arguments. Assigning (`y = x`) and string conversion keep the full value. So `x = 2.5; y = x * 2` gives 4, while `y = 2.5 * 2` gives 5.
* Division by zero gives infinity/NaN (no error), assuming the default floating-point mode; the build's exception mode was not found. Arithmetic has no integer overflow (doubles). `%`, shifts and bitwise operators convert operands to 32-bit signed integers (truncation) first; results for out-of-range inputs or shift counts follow the host CPU (not settled further).

| Case | Worked value |
|---|---|
| `"abc" == "ABC"` | 0 (case-sensitive) |
| `5 == "5"` | 1 (compared as strings "5" and "5") |
| `"5.0" == 5` | 0 (strings "5.0" and "5") |
| `"abc" < "abd"` | 0 (both read as 0) |
| `"10" < "9"` | 0 (10 < 9 numerically) |
| `"Hello " + 32` | `"Hello 32"` |
| `1 + "2"` | `"12"` (one side is a string, so concatenation) |
| `7 / 2` | 3.5; `1 / 0` is infinity |
| `castInt(-2.7)` | -2 (truncates toward zero, does not round) |
| `castInt("3.9abc")` | 3 |
| `castNum("12abc")` | 12; `castNum("abc")` is 0 |
| `castLit(2.50)` | `"2.5"` |
| `castLit(1234567)` | `"1.23457e+06"` (six significant digits) |
| `castNum(x)` with variable x = 2.5 | 2 (name-read truncation) |

`castLit`, `castNum`, `castInt` each take one value and return the converted value, or take a second argument naming a variable to store it in.

## R2-Q13 - Variable scope (SEM-4)

Name lookup in a frame: a `:`-prefixed name is explicitly global; a parameter name; a member of the current object (inside a method); then ordinary scope. Ordinary scope: with the default (autoLocal off) a name resolves to the frame's own local if one exists, otherwise to the global variable of that name, creating it if needed (so plain assignment creates globals). Locals live in one flat map per function call frame, popped on return. No block scope exists: `if`/loops share the function's frame.

| Declaration form | Visible to |
|---|---|
| Plain assignment, default scope | Everything in every program (one process-wide global table) |
| `local(x)` inside a function | That call's frame only, from the point of creation until return; not callees, not callers, not other calls of the same function |
| `local(x)` at program top level | Top-level code of that program only; no function can see it (they see the global of the same name, if any) |
| `global(x)` | Global table, bypassing any same-named local |
| `autoLocal(true)` | Switches the program's default: a new name becomes local to the current frame, but a name that already exists as a global still resolves to that global. At top level the new names are local to the program and vanish when it ends |
| Parameters | The function's frame only |
| Class members | The object, by name inside its methods |

Other programs: a program started with `run()` is a separate program with its own locals; it sees all globals. Included files are merged into the including program, so included functions behave exactly like local ones (own frames, shared globals). `autoLocal` is per program and not reset at function boundaries. A child program used for `tellThread` shares the target thread's local frames.

## R2-Q14 - Unset variables and array defaults (SEM-5)

* **Scalars:** an unset variable behaves as number 0 for numeric use and as the empty string for string use; its type is number, so `==`/`~=` against a number is numeric, against a string is a string comparison with the empty string, and `+` with another number-typed value is numeric addition (0 + 0 = 0) while `+` with a string concatenates the empty string. Reading a variable by name creates it.
* **Array elements:** each element is an independent variable named by array name plus the formatted index (so `a[1]`, `a["1"]` and `a[1.0]` are the same element; indexes are text with six-digit number formatting); each unset element independently reads as unset. Reading an element creates it; there are no bounds. Case in string keys is preserved (`a["Key"]` and `a["key"]` differ) though bare identifiers are lower-cased.

## R2-Q15 - By-reference output parameters (SEM-6)

* **Rule:** there is no atomic write-back. Each output parameter is a variable name; the built-in resolves and writes each one separately, left to right, in parameter order. Each variable is looked up by normal scope rules and created (as a global, or local under autoLocal) if it does not exist. For several location/geometry getters all output variables are given numeric type first, before the object lookup, so if the lookup fails (error raised) those variables are left numeric (value unchanged or 0) rather than untouched. A non-variable argument is treated as a variable named by its text.
* **Single trailing optional output** (the final extra argument receives a copy of the returned value, also returned normally), in alphabetical order: appPath, asc, castInt, castLit, castNum, charAt, chr, cos, createCanvas, createCursorMap, createItem (position), cursorMapRun, fileEof, fileGet, fileInput, get, getBoardName, getBoardTile, getBoardTileType, getDp, getFontSize, getFp, getGp, getHp, getItemCost, getItemDesc, getItemName, getItemSellPrice, getLevel, getMaxHp, getMaxSmp, getSmp, getThreadId, global (second arg), itemCount, lcase, left, len, local (second arg), log, mid, prompt, random, replace, right, sin, sourceHandle, sqrt, tan, targetHandle, thread (third arg), threadSleepRemaining, trim, ucase, wait.
* **Fixed multiple outputs (parameter positions, one-based), in alphabetical order:** boardGetProgram(index, **program, pointCount, layer, isClosed, attributes, distanceRepeat**) 2-8; boardGetProgramPoint(program, index, **x, y**) 3-4; boardGetVector(vector, **type, pointCount, layer, isClosed, attributes**) 2-6; boardGetVectorPoint(vector, index, **x, y**) 3-4; getColor(**r, g, b**) 1-3; getCorner(**x, y**) 1-2; getPixel(x, y, **r, g, b** [, canvas]) 3-5; getRes(**x, y**) 1-2; itemGetPath / playerGetPath(handle, index, **x, y**) 3-4; itemLocation(handle, **x, y, layer**) 2-4; mouseClick(**x, y** [, noWait]) 1-2; mouseMove(**x, y**) 1-2; pathFind(x1, y1, x2, y2, **result** [, layer]) 5; playerLocation(handle, **x, y, layer**) 2-4; sourceLocation(**x, y**) 1-2; targetLocation(**x, y**) 1-2.
* `split(string, delimiter, array)` writes array elements 0..n-1 as separate variables and returns the count plus one.

## R2-Q16 - Assignment between objects (OOP-4)

* The built-in assignment stores the right-hand side's value (object handle plus object type flag) into the left-hand variable. Both variables then refer to the same object: shallow, by reference, no copy of members.
* If the left-hand variable currently holds an object whose class has an `operator=` taking one parameter, that method is called instead (with the left object as `this` and the right value as argument) and the built-in store is not performed. If the class has no such method, the built-in store happens silently.
* Assignment never calls a copy constructor. A one-parameter constructor runs only when an object is constructed by name (`Cls(a)`).
* Assigning a fresh construction to an unset or non-object variable is always a plain handle store.

## R2-Q17 - Destructors and memory (OOP-5)

* **`release()`:** looks for the destructor (zero parameters) of the object's class. If one exists it is called as a normal method; nothing frees the object's variables afterwards by this call. If the class has no destructor, the object's variables and handle are freed immediately.
* **`kill(obj)`:** only removes that variable (as for any variable); no destructor runs and the object is not freed by this call.
* **Program end:** nothing runs and nothing is freed; locals are simply dropped.
* **Memory reclamation:** a background collector wakes every 600000 milliseconds (ten minutes) and removes the member variables of every object not referenced by any global, local or evaluation-stack value; it never runs destructors. Object records for handles are not removed by it. References held in members of other objects count as reachable, so cycles are never reclaimed. `empty()` clears all globals and all objects. Whether handle numbers are reused after an explicit free is not settled (not confirmed from the collector). This contradicts the format-spec's statement that objects are not garbage-collected, for this engine (3.1 line).

## R2-Q18 - Member lookup order (OOP-6)

Variables (inside a method), first match wins:
1. An explicit `:name` global form.
2. The method's parameters (substituted when the program is loaded, so they shadow members).
3. A member field of the current object's class (own and inherited, any visibility), by name.
4. A local variable of the frame, or the global of that name (R2-Q13 order).

Calls of an unqualified name `f(...)`, in order:
1. A built-in of that name (decided when the program is loaded; it always wins over a script function or member of the same name).
2. Inside a method: a member method of the current object's class with that name and argument count, any visibility (an implicit `this` call).
3. A script function of that name and argument count in the program or its includes.
4. A plugin claiming the name.
5. Otherwise the unknown-call error (R2-Q1).

`this->x` need not be written; `this` is available as a local variable named `this`. Access from outside the class to non-public members is an error.

## R2-Q19 - Operator dispatch (OOP-7)

Rule: the first (left or only) operand is examined; if it is an object, the interpreter looks in that object's class for a method named `operator` plus the operator's symbol that accepts exactly (operand count - 1) parameters. Private is allowed only from inside a method of the same class. Right-hand operands are never consulted. Unary and binary forms are distinguished purely by parameter count.

| Syntax form | Method called | If missing |
|---|---|---|
| `a + b`, `-`, `*`, `/`, `%`, `^`, `&`, `\|`, `` ` ``, `<<`, `>>`, `&&`, `\|\|`, `<`, `<=`, `>`, `>=` | `operator<sym>(b)` (1 param) | Runtime error |
| `a == b`, `a ~= b` | `operator==(b)`, `operator~=(b)` | Falls back to comparing handles/values |
| `a = b` (a holds an object) | `operator=(b)` | Falls back to plain handle store |
| `a += b` and the other compound forms (`-= *= /= %= ^= &= \|= `` ` ``= <<= >>= \|\|= &&=`) | `operator+=(b)` etc., one method per form (the plain binary method is not used) | Runtime error |
| `-a` | `operator-()` (0 params; binary minus has 1) | Runtime error |
| `!a`, `~a` | `operator!()`, `operator~()` | Runtime error |
| `++a`, `a++`, `--a`, `a--` | `operator++()` / `operator--()` (pre and post are not distinguished) | Runtime error |
| `a[i]` | `operator[](i)` | Falls back to a plain element variable named `a[i]` |

Not dispatched: `->`, the ternary, call-style `()`, and any string/number conversion operator (a `$` or `!` after a name is only a type-suffix character in the lexer; no conversion operator is consulted anywhere).
For `a[i] = v`: `operator[]` is consulted first on `a`; if it yields a reference (via `return &ref`), the store goes through that reference, and `operator=` is consulted only if the referenced variable currently holds an object; otherwise the value is stored directly.

## R2-Q20 - What `end()` unwinds (FUN-7)

`end()` (and `done()`/`stop`) finishes the one program that executes it, immediately, regardless of call depth, abandoning all its pending function frames. Included functions are part of the including program, so `end()` there ends the including program. In a program started by `run()`, `end()` ends only that program; the caller had already been ended by the `run()` call itself (which ends the caller before starting the new program), so on return the caller is finished too and the net effect is that the whole chain is done. A child program (tellThread or the plugin run-a-line callback) ends only itself. A thread's `end()` finishes that thread; it stays in the thread table doing nothing until killed.

## R2-Q21 - Includes (MOD-2)

* **Folder:** relative to the project's program folder (the `Prg` folder under the project folder). The name is used as written, with its extension.
* **Timing:** include directives with a literal name are collected while the file is parsed, wherever they appear (even inside a function or a branch never executed) and are applied once parsing ends. A computed `include(expr)` is executed at run time.
* **Already-included file:** within one program a repeated name (exact text match) is added once. Functions whose name and parameter count already exist in the including program are skipped silently, so the first definition wins (own definitions before included ones, earlier includes before later ones); existing classes likewise win. At run time an already-included file is skipped silently only if the same full path was recorded by an earlier runtime include.
* **Cycle:** not guarded (inferred): each included file is parsed afresh and only cached after its own parse completes, so A including B including A recurses without end.
* **Inside a function:** allowed, but has no scoping effect; it is a program-wide include as above.
* **What is imported:** only function bodies and class definitions; loose top-level code is not.
* **Missing or empty file:** at load time a missing file is silently ignored (no message); an empty file imports nothing and is not an error. A runtime include of a missing file raises a runtime error.
* **Implicit `file.func(args)`:** at load time the lower-cased first part plus the extension `.prg` is added to the include list and the call is to `func` as an ordinary global name (the file part is not remembered). So it includes on load, not on first use; if `func` is a built-in's name the built-in is called.

## R2-Q22 - Redirects (MOD-3)

* **Where kept:** one process-wide table of old name to new name (lower-case), also written to and restored from saved games, and cleared when a saved game is loaded or a new game starts.
* **When it takes effect:** `redirect`, `killRedirect` and `killAllRedirects` act when the source text is parsed, not when the line executes (so they take effect even on code that never runs, in textual order within a file, and they only affect programs and lines parsed afterwards; programs already loaded and cached keep their old bindings).
* **To a built-in:** yes; the target name is looked up like any other call name after the substitution.
* **Chaining:** none: a single substitution is made, so a to b and b to c turns a into b only. A target of the form `file.func` also includes that file.
* **Stops applying:** only by `killRedirect(name)`, `killAllRedirects()`, or loading a saved game; it is not tied to a program ending. It applies to call syntax only.

## R2-Q23 - Thread sleep units and wake order (THR-1)

* **Unit:** the second argument is seconds (fractions allowed), converted to whole milliseconds by truncation of seconds times 1000; time is wall-clock based (millisecond tick counter, about 10-16 ms granularity).
* **Sleep until woken:** a duration of 0 means indefinite sleep until `threadWake` (the same state movement commands put a thread in while its move is pending). A negative value is not defined (converted to a huge unsigned duration).
* **Waking:** `threadWake` clears the sleeping flag; a timed sleep also ends by itself when the duration has elapsed, checked when the thread is next considered. `threadSleepRemaining` returns the remaining seconds, 0 for indefinite or not sleeping.
* **Order when several wake together:** no priority or wake order exists. Threads are stepped in the iteration order of the thread table, which is a pointer-ordered set (ascending address of the thread objects), so the order is effectively unspecified and not tied to creation or wake time. The step quantum per thread and the place where threads are scheduled were not found in the checkout.

## R2-Q24 - Source and target per thread (THR-2)

The source and target slots are two engine-global entity slots, shared by everything; they are not saved per thread or per frame. They are set (and restored afterwards) by whoever starts an entity event: an item's own thread sets both to that item for each slice it runs; equipping or removing an item sets the target to that player for the duration of the program; sprite-triggered programs and fights set them for their duration. Plain threads do not set them, so there they hold whatever is currently in effect globally. `tellThread` code runs at once in the caller's moment, sees the caller's current slots (not those of the owning entity of the target thread), and uses the target thread's local variables. `run()` does not change them.

## R2-Q25 - When engine and board constants are substituted (LEX-7)

Engine constants (the `tk...` names, plus `true`, `false`, `null`) are replaced by their values while the program is lexed and compiled; they cannot change. Board constants are not substituted at all: they are the global variables `constant[0]` to `constant[10]`, read at run time from whichever board is current each time they are read, as strings (numeric use converts them with leading-numeric parsing), so the same compiled program sees different values on different boards.

## R2-Q26 - Which names are case-insensitive (LEX-10)

| Name kind | Case-sensitive? |
|---|---|
| Variables (including array base names and member names) | No (lower-cased on lexing) |
| Labels | No (matched case-insensitively) |
| Class names, method and function names, parameters | No (lower-cased) |
| Keywords and built-in names | No |
| String contents, including array keys given as strings | Yes (case preserved) |
| `==`/`~=` string comparison | Yes |
| Include file names given in quotes | Compared case-sensitively for duplicates; the Windows file system itself is case-insensitive |

The first-seen spelling is not kept anywhere: identifiers are lower-cased on entry, so original capitalisation is lost.

---

## Not settled

* R2-Q7: where the engine's main loop schedules script threads and rendering was not found in the checkout; everything-else-waits is inferred from there being no other thread, and thread step quantum is unknown.
* R2-Q9: the `filereadwrite` plugin has no source in the checkout; only the built-in file commands are described.
* R2-Q11 and R2-Q12: behaviour of modulo by zero, out-of-range double to 32-bit integer conversion, shift counts of 32 or more, and the text form of infinity/NaN depend on the original compiler and CPU; the build's exception-handling mode was not found.
* R2-Q17: whether handle numbers are reused after an explicit free was not confirmed from the collector.
* R2-Q21: the include cycle outcome is inferred from structure, not observed.
* R2-Q23: thread scheduling site, per-turn instruction budget and order of threads were not found; order is only known to be address order of the thread table.
* R2-Q5: whether the older VB engine converted bare text lines to dialogue was not found; the C++ interpreter does not.

---

## Edit log

* Header and terminology: removed the claim of consulting the older engine for 2.x-era questions; stated that it was not examined; dropped quotation marks around defined terms.
* Finding 1 (R2-Q1, BLOCKER): removed the older-engine bullet containing the quoted message string.
* Finding 2 (R2-Q4, BLOCKER): removed the older-engine bullet containing the quoted message string.
* Finding 3 (R2-Q15, MINOR): both output lists now in alphabetical order.
* Finding 4 (R2-Q7, MINOR): removed the sentence about other worker threads and locks.
* Finding 5 (scope, MINOR): removed older-engine bullets in R2-Q1 and R2-Q4, the older-engine clause in R2-Q17, and the older-engine closing Not settled bullet; the R2-Q5 sentence and its Not settled item kept in neutral wording without any quoted message.
* Finding 6 (R2-Q4, MINOR): removed the old-style plugin result-preset bullet.
* Finding 7 (R2-Q8, MINOR): removed the paragraph on the rebuilt command-line text format.
* Finding 8 (R2-Q9, MINOR): removed the packaged-game sentence and the handles bullet; case-insensitivity of file handles is no longer stated in this answer.
* Finding 9 (R2-Q26, MINOR): removed the rows for redirect names, implicit file.func name, plugin query names, file handles and special handles.
* Finding 10 (R2-Q17, MINOR): removed the older-engine release-scheme clause.
* Handle-reuse claim (R2-Q17, MINOR): reworded as not settled, with a matching Not settled entry. Also added the reviewer's optional refinement that member-held references count as reachable.
* R2-Q1 (form, MINOR): trimmed to outcome and top-level-versus-function rules plus one short note.
* R2-Q2, R2-Q5, R2-Q14: replaced quoted marker words and quoted message text with plain description.
* R2-Q20, R2-Q24 (form, MINOR): left as single paragraphs, which the review accepted.
* R2-Q4, R2-Q17, R2-Q24, R2-Q25, R2-Q26: removed leftover quotation marks around descriptive words; remaining quoted items are data values (the Saved folder name, worked comparison values, number formats).
