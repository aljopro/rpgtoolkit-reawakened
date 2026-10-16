# RPGCode: values, scope and conversion

How a value is compared, converted, scoped and written back, and what a file read returns. The language itself is in [rpgcode-language.md](rpgcode-language.md); the failure table is in [errors and threads](rpgcode-errors-and-threads.md).

**How to read this page.** Each rule is marked **legacy behaviour** when the extraction facts fix it, and **Reawakened rule** when this project deliberately departs from or adds to 3.1 ([ADR 0007](../../adr/0007-docs-spec-is-the-normative-specification.md), decision 2); a departure says why.

Terms used below: a **value** is either a number (a double) or a string; the **unset value** is what a never-assigned variable or a failed call produces; a **numeric context** is arithmetic, a numeric comparison, `castNum`, a numeric argument or an array index.

## SEM-3 — comparison and conversion

* A value is a number or a string; a variable that was never assigned counts as a number. — legacy behaviour (R2-Q12).
* `==` and `~=`: numeric when both sides are number-typed, otherwise both become strings and compare exactly, byte for byte, case-sensitively. — legacy behaviour (R2-Q12).
* `<`, `<=`, `>`, `>=` always compare numerically, with a string side converted by the string-to-number rule below; string ordering is not available. — legacy behaviour (R2-Q12).
* `&&`, `||` and `!` use the truth test of the language: a string is true unless it equals `"off"` (case-insensitive), so `""` is true, and a number is true when it is not zero. Both sides of `&&`/`||` are always evaluated (there is no short-circuit). — legacy behaviour for the evaluation order and the number case; the string rule is the one this page adopts (R-39). The older Reawakened reading that treated `&&`, `||` and `!` as pure numeric truthiness is **withdrawn**: `docs/spec`'s `"off"` rule wins.
* **String to number — Reawakened rule (the grammar legacy left open).** Skip leading spaces and tabs, then match the longest of these: an optional `+` or `-`, digits, an optional `.` with digits after it, and an optional `e`/`E` with an optional sign and at least one digit. So `.5` and `5.` count, `1e` matches only the `1`, and a hex form, `inf`, `Infinity` and `nan` do not match. The matched prefix converts to the nearest double, and the rest of the string is ignored; no match gives 0.
* **Number to string — Reawakened rule (the full algorithm).** A finite number is written with six significant digits.
  * Let `X` be the decimal exponent, the position of the leading digit, so `10^X ≤ |v| < 10^(X+1)`.
  * Use exponent form when `X < -4` or `X ≥ 6`; otherwise use plain decimal form.
  * Round the exact value to six significant digits, to the nearer; a value exactly halfway rounds away from zero, so `1234565` gives `1.23457e+06`.
  * Drop trailing zeros in the fraction and any trailing point. Exponent form is one leading digit, then up to five more, then `e`, then the exponent's sign (`+` or `-`, always written) and at least two digits (`+06`, `-07`, `+123`).
  * `0` and `-0` print as `"0"`; positive infinity, negative infinity and NaN print as `"Infinity"`, `"-Infinity"` and `"NaN"` (all three are reachable through `1/0` and `0/0`).
  * No locale call (`Intl`, `toLocaleString`, `toLocaleFormat`) is used at any step.
  * Reason: the legacy engine printed six significant digits through its C runtime, so `castLit` and string concatenation differed by build and ties fell a different way; one stated algorithm makes every runner print a number identically.
* **The name-read truncation.** Reading a number *from a variable by name* — not from a literal or a computed temporary — truncates it toward zero to a whole 32-bit integer before it is used in any numeric context. Assigning it and converting it to a string keep the full value. — legacy behaviour (R2-Q12); **Reawakened rule:** the conversion is pinned to JavaScript's `ToInt32` (wrap modulo 2^32; NaN and ±Infinity become 0), because the legacy out-of-range result depended on the build and a rebuild must agree with itself. An array index that comes from a name read is truncated the same way, so the key `a[x]` uses is the truncated value.
* Division by zero (`/`) gives infinity or NaN, not an error. — legacy behaviour (R2-Q12).
* `%`, the shifts and the bitwise operators first convert their operands with `ToInt32` (truncating), and a shift count is taken modulo 32. — legacy behaviour (R2-Q12); **Reawakened rule:** an out-of-range input or shift count is pinned to JavaScript's defined 32-bit result instead of the legacy dependence on the host CPU, because two runners must agree. A zero divisor in `%` is the catchable error ruled in [errors and threads](rpgcode-errors-and-threads.md).
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

## SEM-4 — scope and visibility

* Inside a frame, a name is looked up in this order, first match wins: an explicit `:name` global; a parameter; a member of the current object (inside a method); then an ordinary name, which is the frame's local if one exists and otherwise the global of that name, created if it is missing. — legacy behaviour (R2-Q13); the member step belongs to the class rules in [modules and objects](rpgcode-modules-and-objects.md).
* Locals live in one flat list per call and are discarded on return. There is no block scope, so an `if` and a loop share the frame. — legacy behaviour (R2-Q13).
* A plain assignment creates a global, unless `autoLocal(true)` is in force. — legacy behaviour (R2-Q13).
* `local(x)` inside a function is visible only in that call, from where it is declared until return; `local(x)` at program top level is visible only to that program's own top-level code, whose functions see the global of the same name instead; `global(x)` reaches the global table past a same-named local; `autoLocal(true)` makes a new name local to the current frame but still resolves a name that already exists as a global. — legacy behaviour (R2-Q13).
* A parameter is visible in its frame only; a class member is visible by name inside its object's methods. — legacy behaviour (R2-Q13).
* A `run()` program is a separate program with its own locals and the shared globals; an included file is merged into the including program, so an included function behaves as a local one. — legacy behaviour (R2-Q13).
* `autoLocal` is set per program and is not reset at a function boundary. — legacy behaviour (R2-Q13).
* **Character stats** are ordinary globals whose names come from the `.tem` file ([../formats/](../formats/)); changing those globals changes the stats.
* **Reawakened rule:** the global table is the VM's globals state section and a frame's locals are its own list, both inside the snapshot, so scope state restores with the snapshot.

## SEM-5 — unset variables and array elements

* Reading a variable that was never assigned yields the unset value: it behaves as 0 for arithmetic and as the empty string when a string is wanted, and it counts as a number, so `==`/`~=` against a number is numeric and against a string compares with the empty string. The read also creates the variable. — legacy behaviour (R2-Q14).
* Each array element is its own variable, named by the array name plus the formatted index, so `a[1]`, `a["1"]` and `a[1.0]` are the same element; reading one creates it; an unset element reads unset; there is no bound. — legacy behaviour (R2-Q14).
* An index is held as text in a fixed numeric format, and a string key keeps its case, so `a["Key"]` and `a["key"]` differ even though a bare identifier index is lower-cased like any name. — legacy behaviour (R2-Q14).
* **Reawakened rule:** the index format is the number-to-string rule above (six significant digits), so every runner keys an array the same way.

## SEM-6 — by-reference write-back

* A built-in's output parameters are variable names. There is no atomic write-back: each is resolved by the ordinary scope rules, created if it does not exist, and written left to right in parameter order. — legacy behaviour (R2-Q15).
* For the getters that return several values, every output variable is given numeric type before the object is looked up, so a failed lookup leaves them numeric (0 or unchanged) rather than untouched. — legacy behaviour (R2-Q15).
* A non-variable argument in an output position is treated as a variable named by its text. — legacy behaviour (R2-Q15).
* **Reawakened rule:** every built-in declares its `byRef` parameters in its registry entry, and the catalogue test asserts that each getter taking a trailing output declares one; a name not listed in the catalogue has no output parameters. A getter's trailing output is its last parameter and is also returned normally.
* The getters with a single trailing optional output are: `appPath`, `asc`, `castInt`, `castLit`, `castNum`, `charAt`, `chr`, `cos`, `createCanvas`, `createCursorMap`, `createItem` (position), `cursorMapRun`, `fileEof`, `fileGet`, `fileInput`, `get`, `getBoardName`, `getBoardTile`, `getBoardTileType`, `getDp`, `getFontSize`, `getFp`, `getGp`, `getHp`, `getItemCost`, `getItemDesc`, `getItemName`, `getItemSellPrice`, `getLevel`, `getMaxHp`, `getMaxSmp`, `getSmp`, `getThreadId`, `global` (second argument), `itemCount`, `lcase`, `left`, `len`, `local` (second argument), `log`, `mid`, `prompt`, `random`, `replace`, `right`, `sin`, `sourceHandle`, `sqrt`, `tan`, `targetHandle`, `thread` (third argument), `threadSleepRemaining`, `trim`, `ucase`, `wait` (all legacy behaviour, R2-Q15).
* The getters that write several output parameters (positions one-based) are the location, vector, colour, path, corner, resolution, pixel and cursor readers — for example `playerLocation(handle, x, y, layer)` writes parameters 2–4, `getColor(r, g, b)` writes 1–3, and `pathFind(x1, y1, x2, y2, result)` writes parameter 5. — legacy behaviour (R2-Q15); the extraction's list (`docs/provenance/facts-round-2.md`, R2-Q15) names every one and is the authority the registry follows.
* `split(string, delimiter, array)` writes array elements 0 to n−1 as separate variables and returns the count plus one. — legacy behaviour (R2-Q15).

## Files

* **Reading a line (R-38b). Reawakened rule — a deliberate departure from 3.1.** `fileInput` returns one line with its CRLF or LF line ending removed, and nothing else is stripped. *Legacy fact:* 3.1's reader stripped a final carriage return and then dropped one more character, so a line ending in CRLF came back exactly, while a line ending in LF only, **or a final line with no line ending at all**, lost its last real character (round 5, Q6). `FilePrint` always writes CRLF, so a file that `FilePrint` wrote round-trips exactly under 3.1 and continues to. The departure names the final-line case: a 3.1 author may have padded the last line of a hand-made data file by one character to compensate, and such a line now comes back one character longer. The only files whose behaviour changes are data files with LF-only lines or no final newline; whether the importer should warn about those is an open question, and nothing is built for it.
* **Reading past the end of a file (U5).** Reading past the end returns an empty string, with no error, and the position stays at the end, so every further read also returns an empty string. A blank line looks the same as the end; a script cannot tell them apart from the value alone. *Legacy facts (round 5, Q11):* `fileInput` past the end returned an empty string with no error and did not move the position; `FileEOF` is true once the position reaches the file's size, so after the last line (its line ending included) it is already true, and a `while (!FileEOF(...))` loop stops cleanly without ever reading past the end; `fileInput` on a file that is not open silently did nothing and set no return value.

  **Reawakened rule.** Reading past the end returns an empty string and leaves the position at the end, matching 3.1 in every case that matters (owner ruling U5, 2026-10-15). If a diagnostic is wanted, it goes to a debug log and never to a script error, because 3.1 games may read past the end routinely.

**References.** R2-Q12, R2-Q13, R2-Q14, R2-Q15 (`docs/provenance/facts-round-2.md`); `docs/provenance/facts-round-5.md` Q6, Q11; the values-and-variables rules in [rpgcode-language.md](rpgcode-language.md); AD-7 (globals and frame locals in state), AD-8 (`byRef` on a `ParamSpec`) and AD-10 (one owner per state section) in the architecture spine.
