# Is the RPGCode language spec precise enough to write a parser from?

Point-in-time finding of 2026-10-11, taken against the two sample games at the pinned revision 9191b9191c9bda0998c6faae16929b3331ed2ead. Produced by throwaway scripts. No sample-file content is quoted, and `docs/` was not changed: every doc fix named here is a proposal for a later, human-approved commit.

This report replaces an earlier regular-expression census of the same ten programs, whose call counts could not be reproduced; the figures below come from a real tokenizer and are the ones to use.

## Summary for the human

- I wrote a throwaway tokenizer and a statement-and-expression parser for RPGCode, from `docs/format-spec.md` section 9 only, and ran it over the 10 sample programs (9 non-empty, 1 empty file) plus the 3 one-line code strings stored inside the sample boards.
- The tokenizer is fine: all 10 files and all 3 inline strings break into tokens with no unknown character (2298 tokens). Section 9.2 is precise enough to write it from.
- The parser is not yet: read literally, only 3 of the 9 non-empty programs parse. The other 6 stop at a construct the spec does not describe. With 9 small, named leniencies all 9 parse and every bracket balances.
- The most important gaps: (1) opening braces on their own line (24 of 72 braces, the spec's wording forbids it); (2) `case (1)` with no colon (the spec says `case v:`); (3) every class method is written inside the class body (22 of 22), the spec shows a bare prototype plus an outside definition; (4) typed parameters (`CArray rhs`), `local(x) = value` and `return &m_data[i]` are used but not described; (5) the word `this` is used and not described.
- `system.prg` is a library: loading it runs nothing (it only defines `pause` and a class `CArray`). Nothing in the 10 programs ever creates a `CArray`, so "run `system.prg` to completion" is true but proves almost nothing. `start.prg` is the real test: it runs a title menu and leaves through `end()`.
- 26 world, screen, audio, battle and menu built-ins are called; 19 of them (one of which, `windows`, is obsolete) are needed to run `start.prg` and `system.prg` in isolation. Their owner epics are listed below; 3 names have no single owner in the docs (`wait`, `dirSav`, `windows`).
- As a test corpus for "snapshot at any step, restore, same result" the 10 programs are very weak: 227 statements, one thread program, no error handler, no object ever created, no user function with a by-reference parameter, no multi-statement inline code. Synthetic programs are needed for almost every item in the epic's Done-when.
- The colleague's census is right on bytes, line counts and file counts (10 of 10 files). The call-site headline (128 calls, 44 names) cannot be reproduced exactly: I get 130 call sites and 45 names with a real tokenizer. The census count of "single `=` in a condition" (6) is mostly the `~=` operator; the real count is 1 per copy of `system.prg`.
- Verdict: write the tokenizer now; write the parser only after the 12 doc fixes below (the samples already settle the syntax half of the 14 rows in the first ambiguity table); error handlers, legacy syntax, threads beyond sleep, and most of the class rules cannot be checked from these samples at all.

## Readiness table

"Sample evidence" counts uses in the 10 files (both games). Verdicts: ready, needs doc fix, unverifiable (the samples never use it).

| Area | Spec section | Sample evidence | Verdict |
|---|---|---|---|
| Tokenizer: whitespace, comments, strings, numbers, identifiers, operators | 9.2, 9.4 | 10 of 10 files clean, 0 unknown characters, 2298 tokens (498 identifiers, 925 operators, 54 strings, 59 numbers) | ready (small questions LEX-1 to LEX-12) |
| Line continuation `_` | 9.2 | 6 uses, always after `&&`, always preceded by a space | ready |
| `#include` | 9.2, 9.6 | 1 use (Basic `start.prg`) | ready |
| Expressions and precedence | 9.4 | 14 operator kinds seen (`&&`, `~=`, `<=`, `\|`, `?:`, unary `-`, `++` pre and post, ...) | needs doc fix (`^`, `&`, `=` in conditions) |
| Statements and control flow | 9.5 | `if`, `else`, `while`, `until`, `for`, `switch`, `case`, `return`, `end()`; no `elseif`, `default`, labels, `branch` | needs doc fix (braces, `case`) |
| Function definitions and parameters | 9.5 | 7 top-level `method` definitions, 0 `function`; typed params; `local(x) = v` 18 times | needs doc fix |
| Classes, objects, operators | 9.7 | 1 class (`CArray`), 22 members, `operator=`, `operator[]`, destructor, `->` 8 times | needs doc fix (and 3 open semantic questions) |
| Modules: include, implicit include, redirect | 9.6 | 1 `#include`; 0 implicit includes; 0 redirects | partly verified |
| Error handling | 9.8 | 0 uses | unverifiable |
| Legacy syntax (RPGCode 2) | 9.9 | 0 uses | unverifiable (spec's own examples: 2 of 6 legacy forms do not parse without a converter) |
| Engine-backed variables and constants | 9.10 | 0 virtual variables; 2 constants (`tkMV_PAUSE_THREAD`, `tkMV_PATHFIND`) used 2 times each | partly verified |
| Threads, sleep, source/target | E-33, E-93, E-95 | 1 thread program, `threadSleep` + `getThreadId` once, `"source"`/`"target"` handles 5 times | unverifiable beyond that |
| Built-in catalogue | 9.11, E-94 | 45 distinct names called; 0 not covered by the catalogue or defined in-file | ready |

### Re-derivation of the census headline numbers

Scripts `analyze.py`, `reconcile.py`, `census_repro.py`, `eq_repro.py`; outputs `langparse-analysis.out`, `langparse-reconcile.out`, `langparse-census-repro.out`, `langparse-eq-repro.out`.

| Census number | Mine | Match |
|---|---|---|
| 10 `.prg` files | 10 | yes |
| 16667 bytes | 16667 | yes (all 10 per-file byte counts agree) |
| LF lines per file | all 10 agree | yes |
| identifier tokens per file | 7 of 10 agree; the other 3 (`system.prg` x2, Basic `start.prg`) agree once the census' counting of `_` continuation markers and the `include` word of `#include` as identifiers is added | yes, explained |
| call tokens per file | 8 of 10 agree; both `system.prg` files: mine 23, census 22 | no (off by one in 2 files; cause not found) |
| 128 call sites | 130 (122 plain calls + 8 `->` calls) | no |
| 44 distinct call names | 45 (43 plain + 2 arrow names) | no. 44 distinct names is only reproduced by dropping control keywords, method-definition names and the names `local`, `global`, `kill`, `end`; that variant gives 114 sites, not 128 |
| 12 distinct in-file definition names | 14 distinct lowercase names (`operator=`, `operator[]` and the destructor `~carray` counted separately; the class name equals the constructor name) | yes under the census rule: 12 results if both operator forms count as one name and the destructor is dropped. 29 callable definitions (+ 2 class lines); the census says 27 (the 2 destructors) |
| `=` used as a comparison in conditions (census 6) | 2 (one per `system.prg`) | no: 4 of the census 6 are the `~=` operator |
| "case: 6, switch: 2 are call names" | 6 `case` clauses and 2 `switch` statements, parsed as keywords, not calls | the census counts keywords as calls |

## What the parser found

### Per file (script `analyze.py` / `tables.py`; output `langparse-tables.out`)

| file | bytes | lines | tokens | statements | max block depth | max expression tree height | strict (literal spec) | lenient (9 rules) |
|---|---|---|---|---|---|---|---|---|
| Basic/start | 2331 | 103 | 327 | 38 | 4 | 3 | fail @29: BRACE-ON-NEXT-LINE | ok |
| Basic/system | 4854 | 219 | 641 | 60 | 4 | 5 | fail @39: ASSIGN-TO-CALL | ok |
| Basic/wander | 443 | 14 | 27 | 2 | 1 | 2 | fail @9: BRACE-ON-NEXT-LINE | ok |
| demo/man | 144 | 7 | 29 | 4 | 0 | 2 | ok | ok |
| demo/man_wander | 1335 | 50 | 233 | 18 | 3 | 6 | fail @6: BRACE-ON-NEXT-LINE | ok |
| demo/oldman | 264 | 8 | 34 | 5 | 0 | 2 | ok | ok |
| demo/start | 2241 | 117 | 334 | 36 | 4 | 3 | fail @25: BRACE-ON-NEXT-LINE | ok |
| demo/sys_test (0 bytes) | 0 | 0 | 2 | 0 | 0 | 0 | ok | ok |
| demo/system | 4854 | 219 | 641 | 60 | 4 | 5 | fail @39: ASSIGN-TO-CALL | ok |
| demo/win | 201 | 10 | 30 | 4 | 0 | 2 | ok | ok |

Totals: 227 statements, 747 lines; max block depth 4 (class, method, `for`/`if`, `if`); max expression tree height 6 (a doubly parenthesised `&&` of two `abs(...) <` tests). Token kinds over all files: NL 751, OP 925, IDENT 498, NUM 59, STR 54, INCLUDE 1, EOF 10. Self-check: the 151 statement terminators (146 `;`, 5 newline-only) equal 129 expression statements + 15 `return` + 6 member `var` + 1 `#include`.

"Strict" = the most literal reading of section 9; each failure names the first undocumented construct (the spec rule that is missing is in the next table). "Lenient" = all rules of the next table enabled; 9 of 9 non-empty files then parse with every `{`/`}` balanced (72 each) and 0 lexical errors.

### Construct counts per file (script `tables.py`)

(columns in the order of the table above)

| construct | Basic/start | Basic/system | Basic/wander | demo/man | demo/man_wander | demo/oldman | demo/start | demo/sys_test | demo/system | demo/win | total |
|---|---|---|---|---|---|---|---|---|---|---|---|
| top-level `method` definition | 2 | 1 | 0 | 0 | 1 | 0 | 2 | 0 | 1 | 0 | 7 |
| top-level `function` definition | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| class | 0 | 1 | 0 | 0 | 0 | 0 | 0 | 0 | 1 | 0 | 2 |
| in-class method (all with bodies) | 0 | 11 | 0 | 0 | 0 | 0 | 0 | 0 | 11 | 0 | 22 |
| constructor | 0 | 2 | 0 | 0 | 0 | 0 | 0 | 0 | 2 | 0 | 4 |
| destructor | 0 | 1 | 0 | 0 | 0 | 0 | 0 | 0 | 1 | 0 | 2 |
| operator overload | 0 | 2 | 0 | 0 | 0 | 0 | 0 | 0 | 2 | 0 | 4 |
| typed parameter (`Type name`) | 0 | 2 | 0 | 0 | 0 | 0 | 0 | 0 | 2 | 0 | 4 |
| access specifier | 0 | 2 | 0 | 0 | 0 | 0 | 0 | 0 | 2 | 0 | 4 |
| member `var` | 0 | 3 | 0 | 0 | 0 | 0 | 0 | 0 | 3 | 0 | 6 |
| member array with empty `[]` | 0 | 1 | 0 | 0 | 0 | 0 | 0 | 0 | 1 | 0 | 2 |
| `if` | 1 | 6 | 0 | 0 | 2 | 0 | 1 | 0 | 6 | 0 | 16 |
| `elseif` | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| `else` | 0 | 2 | 0 | 0 | 1 | 0 | 0 | 0 | 2 | 0 | 5 |
| `while` | 1 | 0 | 1 | 0 | 1 | 0 | 1 | 0 | 0 | 0 | 4 |
| `until` | 0 | 1 | 0 | 0 | 0 | 0 | 0 | 0 | 1 | 0 | 2 |
| `for` | 0 | 3 | 0 | 0 | 0 | 0 | 0 | 0 | 3 | 0 | 6 |
| `switch` / `case` / `default` | 1 / 3 / 0 | 0 | 0 | 0 | 0 | 0 | 1 / 3 / 0 | 0 | 0 | 0 | 2 / 6 / 0 |
| `return` with value / `return &ref` / bare | 0 / 0 / 0 | 4 / 3 / 0 | 0 | 0 | 1 / 0 / 0 | 0 | 0 | 0 | 4 / 3 / 0 | 0 | 9 / 6 / 0 |
| label, `branch`, `on error`, `setErrorHandler` | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| plain call | 29 | 19 | 1 | 4 | 13 | 5 | 28 | 0 | 19 | 4 | 122 |
| `->` call | 0 | 4 | 0 | 0 | 0 | 0 | 0 | 0 | 4 | 0 | 8 |
| assignment `=` | 3 | 21 | 0 | 0 | 4 | 0 | 3 | 0 | 21 | 0 | 52 |
| assignment to a call result (`local(x) = v`) | 0 | 9 | 0 | 0 | 0 | 0 | 0 | 0 | 9 | 0 | 18 |
| index `[ ]` (always a variable, never a literal) | 0 | 7 | 0 | 0 | 0 | 0 | 0 | 0 | 7 | 0 | 14 |
| ternary `?:` | 0 | 0 | 0 | 0 | 1 | 0 | 0 | 0 | 0 | 0 | 1 |
| `&&` | 0 | 4 | 0 | 0 | 2 | 0 | 0 | 0 | 4 | 0 | 10 |
| `\|` | 0 | 0 | 0 | 0 | 2 | 0 | 0 | 0 | 0 | 0 | 2 |
| `~=` | 1 | 4 | 0 | 0 | 0 | 0 | 1 | 0 | 4 | 0 | 10 |
| `==` / `<` / `<=` / `>` / `>=` | 0 | 0 / 0 / 4 / 1 / 3 | 0 | 0 | 2 / 3 / 0 / 0 / 0 | 0 | 0 | 0 | 0 / 0 / 4 / 1 / 3 | 0 | 2 / 3 / 8 / 2 / 6 |
| `+` / `-` / `*` binary | 0 | 2 / 0 / 0 | 0 | 0 | 2 / 4 / 2 | 0 | 0 | 0 | 2 / 0 / 0 | 0 | 6 / 4 / 2 |
| unary `-` / prefix `++` / postfix `++` | 0 | 1 / 1 / 2 | 0 | 0 | 1 / 0 / 0 | 0 | 0 | 0 | 1 / 1 / 2 | 0 | 3 / 2 / 4 |
| `true` literal | 3 | 1 | 1 | 0 | 1 | 0 | 2 | 0 | 1 | 0 | 9 |
| string / integer / fraction literal | 13 / 16 / 2 | 7 / 8 / 0 | 1 / 0 / 0 | 3 / 0 / 0 | 6 / 5 / 1 | 4 / 0 / 0 | 11 / 17 / 2 | 0 | 7 / 8 / 0 | 2 / 0 / 0 | 54 / 54 / 5 |
| `#include` | 1 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 1 |
| `_` line continuation | 0 | 3 | 0 | 0 | 0 | 0 | 0 | 0 | 3 | 0 | 6 |
| `//` comment | 33 | 114 | 8 | 3 | 14 | 3 | 31 | 0 | 114 | 5 | 325 |
| `;`-terminated / newline-only statements | 29 / 1 | 31 / 2 | 1 / 0 | 4 / 0 | 13 / 0 | 5 / 0 | 28 / 0 | 0 | 31 / 2 | 4 / 0 | 146 / 5 |

Never used anywhere: `function`, `inline`, `struct`, base classes, pure virtual, `release()`, `elseif`, `default`, labels, `branch`, `goto`, error handlers, `.`/implicit includes, redirects, `^`, shifts, XOR, compound assignment (only plain `=`), `/* */` and legacy `*` comments, sigils (`!`, `$`), `#` prefix lines, exponent numbers, multi-dimensional arrays, string-keyed maps, user functions with `&` parameters, file I/O, `thread()`, `multiRun`, `tellThread`, virtual variables (`playerX` ...), and `<name>` splicing inside strings (0 of 54 strings). Case-insensitivity is also never needed: all 91 distinct identifiers are spelled with one capitalisation each, everywhere. Whitespace facts: 672 tab bytes, 0 CR bytes, 3 files with no final newline, 0 non-ASCII bytes.

### Inline code strings stored in the boards (script `inline_parse.py`; output `langparse-inline.out`)

3 strings (2 board programs in `demo` boards, 1 sprite multitask string). Each is exactly one statement containing one call (`send(...)` twice, `itemPath(...)` once), and lexes and parses cleanly even in strict mode. The other 4 program fields in those boards name real `.prg` files in `Prg/`. So the "inline program" path (spec 4.2, AD-7 `ProgramRef` inline) is exercised only by one-line calls.

### Every use of a construct the spec does not describe (the strict-failure sites)

95 sites, 9 distinct rules, 6 of 10 files. Script `analyze.py`; output `langparse-analysis.out`.

| Rule id | Sites (files) | What the programs do that section 9 does not describe |
|---|---|---|
| BRACE-ON-NEXT-LINE | 24 (6 files) | `{` alone on the next line after `if`, `while`, `switch`, `case`, `class` and `method` headers. 24 of 72 braces. The other 48 are on the header line. Section 9.2 says statements end at a newline |
| CASE-COLON-OMITTED | 6 (2 files) | `case (1)` newline `{`: parentheses, no colon. Spec 9.5 writes `case v: { ... }` |
| CLASS-METHOD-INLINE-BODY | 22 (2 files) | Every member method has its body inside the class. Spec 9.7 shows a body-less prototype in the class and a separate `method CName::CName(a, b) { ... }` outside. 0 out-of-class definitions exist |
| TYPED-PARAMETER | 4 (2 files) | `method clone(CArray rhs)`: a class name before the parameter name |
| ASSIGN-TO-CALL | 18 (2 files) | `local(x) = value` (16 times, including as the `for` initialiser) and `global(x) = value` (2 times). The only call-as-target form 9.5 describes is a reference-returning function |
| RETURN-REF-EXPR | 4 (2 files) | `return &m_data[idx]` (2 per copy): the operand of `return &` is an index expression, spec says `return &var`. The third `return &` per copy returns a plain global variable and is within the spec |
| INDEX-BARE-IDENT | 14 (2 files) | `a[ident]`. All 14 identifiers are real variables (10 declared by `local()`, 4 parameters); none is an unquoted string key. This is a flagged ambiguity (9.3 "any expression is an index" against 9.9 "unquoted map keys"), not a syntax error |
| EMPTY-ARRAY-DECL | 2 (2 files) | `var m_data[]` with empty brackets. Spec shows `m_array[10]` |
| ELSE-NEXT-LINE | 1 (1 file) | `else` on the line after `}`. 4 other `else` are on the `}` line |

## Call targets (script `classify.py`; output `langparse-classify.out`)

(a) language-only and pure built-ins: owned by this epic. (b) domain built-ins: owner epic is my mapping from the E-id ranges that each epic file lists under References; the docs do not tie function names to epics, so the mapping is marked. (c) functions, methods and classes defined in the file (or in a file it `#include`s).

Call sites per file, by class:

| file | (a) pure | (b) domain | (c) in-file | total |
|---|---|---|---|---|
| Basic/start | 3 | 23 | 3 | 29 |
| Basic/system | 14 | 1 | 8 | 23 |
| Basic/wander | 0 | 1 | 0 | 1 |
| demo/man | 0 | 4 | 0 | 4 |
| demo/man_wander | 6 | 5 | 2 | 13 |
| demo/oldman | 0 | 5 | 0 | 5 |
| demo/start | 2 | 24 | 2 | 28 |
| demo/system | 14 | 1 | 8 | 23 |
| demo/win | 0 | 4 | 0 | 4 |
| all | 39 | 68 | 23 | 130 |

Distinct names:

| Class | Names (call sites) |
|---|---|
| (a) pure / language-only, 11 names | `local` 16, `end` 5, `kill` 4, `debugger` 4, `global` 2, `castLit` 2, `random` 2, `autoLocal` 1, `getThreadId` 1, `threadSleep` 1, `run` 1 |
| (c) in-file, 8 names | `CArray` 4 (constructor calls), `clean` 4, `getBound` 4 (arrow), `isDynamic` 4 (arrow), `drawTitle` 2, `intro` 2, `abs` 2, `pause` 1 |
| (b) domain, 26 names, by owner | see next table |

Domain built-ins by owner epic:

| Owner (per the E-id ranges in each epic's References) | Names |
|---|---|
| board-rendering (E-55, E-56, E-59, E-60) | `bold`, `clear`, `createCursorMap`, `cursorMapAdd`, `cursorMapRun`, `font`, `fontSize`, `killCursorMap`, `mwin`, `mwinCls`, `text`, `winGraphic` |
| movement-triggers (E-20 to E-34) | `eraseItem`, `itemLocation`, `itemPath`, `playerLocation`, `spriteTranslucency`, `wander` |
| menu-party-save (E-80, E-121) | `load`, `menuGraphic` (9.11 files `menuGraphic` under Battle, E-80 puts it in the menu) |
| battle (E-70 to E-79) | `fightEnemy`, `fightMenuGraphic` |
| audio-synth (E-100) | `mediaPlay` |
| SPLIT, no single owner named in the docs | `wait` (key input is E-110 in movement-triggers; the `input.key` wait kind is the VM's, AD-9), `dirSav` (E-60 picker is board-rendering, the save list is E-120 menu-party-save) |
| UNOWNED | `windows` (9.11 calls the group "godos/dos/windows (obsolete)" and no epic mentions it) |

By-reference output arguments in the samples: `playerLocation("name", x, y, layer)` twice and `itemLocation("name", x, y, layer)` once, each with 3 variable arguments that are written back. No user-written function declares a `&` parameter (0 of 7 top-level and 22 in-class definitions). The special handles `"source"` (4) and `"target"` (1) are used in `itemLocation`, `itemPath` twice, `eraseItem` and `wander`. `tkMV_PAUSE_THREAD | tkMV_PATHFIND` is passed to `itemPath` twice (both engine constants are in the 9.10 table).

## What `system.prg` needs from the VM (item 4)

`system.prg` is byte-identical in `demo` and `Basic` (it appears in the 10-file corpus twice but is one program). It contains no top-level statements that execute: it defines the function `pause` and the class `CArray`. In `Basic` the `start.prg` pulls it in with `#include`; in `demo` nothing refers to it (no `#include`, no board or item field, no call), and the docs never say how or when `system.prg` is run. Spec 9.6 ("only functions and classes are imported; loose code does not run") is consistent with what the file contains.

| What the VM must do for it to LOAD and RUN | Evidence in `system.prg` (per copy) | Spec status |
|---|---|---|
| Parse a class with `public:`/`private:` labels and `var` members | 2 access labels, 3 `var` members | precise for `public:`/`private:` and `var x`; `protected`, default access of `class` not stated |
| Member array declared `var m_data[]` (empty brackets) | 1 | ambiguous: spec shows only `m_array[10]` |
| Methods with bodies inside the class | 11 | not specified (spec shows prototype + outside definition) |
| Constructor overloading by parameter count (0 and 1 parameter) | 2 constructors | precise (9.5 "overloading by parameter count") |
| Destructor `~CArray()` that calls another method | 1 | precise that `release()` runs it; when else a destructor runs is not stated. `release()` is never called in the corpus |
| Object creation by calling the class name, result kept in a local | `local(ret) = CArray()` and `CArray(bound)` inside `clone` | precise (9.7); the handle-and-object table shape is AD-7 `objects` |
| Typed parameter `CArray rhs` | 2 methods | not specified: is the type checked, does it take part in overload choice? |
| Member access with `->` on a parameter | `rhs->getBound()`, `rhs->isDynamic()` (4 sites) | precise |
| Implicit field access (`m_bound = ...`) and implicit method call (`clean()` inside methods) | many; 2 unqualified method calls | fields precise (9.7 example); an unqualified call resolving to a member before a global function: not stated |
| `this` as an object | `this[idx] = rhs[idx]` once | not specified anywhere |
| Operator overloading dispatch for `=` and `[]` | `operator=`, `operator[]` (1 parameter each) | precise that they are overloadable; dispatch rules are not: no statement that `obj[i]` on either side of `=` calls `operator[]`, or that `a = b` between objects calls `operator=` |
| Assignment through a reference returned from a call | `return &m_data[idx]` and `return &g_null`; used as `ret[i] = rhs[i]` | 9.5 says "a function call can be an assignment target" (precise in principle); operand forms other than `&var` are not listed |
| Call result as assignment target for scope | `local(x) = v`, `global(x) = v` (18 sites) | not specified |
| Arrays: sparse, numeric index, grow by assignment | `m_data[idx]` | precise ("arrays are sparse", unset reads as empty/0); no bound is ever declared, the class tracks its own bound in a member |
| Bounds checking by hand | `idx > bound` test then `debugger(msg)` then return a reference to a global | `debugger` writes to the debug window (E-98) and execution continues; precise enough |
| `kill` of one array element (`kill(m_data[idx])`) and of two variables at once (`kill(a, b)`) | 2 sites per copy | 9.3 says only `kill(x)` unsets a variable; element and two-argument forms are unspecified. Killing a whole array is not exercised |
| Dynamic typing, string + number concatenation | `"..." + castLit(n)` | precise (9.3 `"Hello " + 32`); what `castLit` does is only a name in the catalogue |
| `for (local(i) = 0; i <= bound; ++i)` | 3 loops | precise except the `local(i) = 0` initialiser (above); closed upper bounds match the "n means n+1" convention of the file formats |
| `until` with a condition spanning four lines | 1 loop | precise (9.5 "loop until expr becomes true"). The data fit the check-first reading: the key variable is set to a value that makes the condition false before the loop, so the body must run once. [INFERENCE from lengths and equality only: the four compared words are all upper-case, lengths 4, 5, 2, 4] |
| Line continuation `_` after `&&` | 3 | precise |
| Hoisting: a function may be called before its definition in the file | `intro` and `drawTitle` in `start.prg` are called earlier in the file than they are defined | not stated; the samples settle it (definitions are visible before their line) |

To RUN anything in the class a harness must instantiate it, because no sample program does. A one-line driver that calls `CArray(2)`, writes and reads elements, calls `resize`, `clone`, `operator=` by `=`, and `release()` is the smallest test that exercises the 20 or so rules above.

## VM-epic implications

### Minimal test doubles to run `start.prg` and `system.prg` in isolation (script `doubles.py`; output `langparse-doubles.out`)

Distinct domain built-ins that appear in these four files (demo and Basic `start.prg`, `system.prg` x2): 19, one of which (`windows`) is obsolete. Names only, by owner:

- board-rendering: `bold`, `clear`, `createCursorMap`, `cursorMapAdd`, `cursorMapRun`, `font` (Basic only), `fontSize`, `killCursorMap`, `mwin`, `text`, `winGraphic`.
- menu-party-save: `load`, `menuGraphic`.
- battle: `fightMenuGraphic`.
- audio-synth: `mediaPlay`.
- movement-triggers: `spriteTranslucency` (demo only).
- SPLIT: `wait`, `dirSav`.
- UNOWNED: `windows`.
- VM-owned (not doubles, but they must exist): `local`, `global`, `kill`, `end`, `castLit`, `debugger`, `autoLocal` (Basic only).

Path reading of `start.prg` (both games, same shape): straight-line setup calls, then `while (true)` showing a title (`clear`, `text` x4), building a cursor map (`createCursorMap`, `cursorMapAdd` x3, `cursorMapRun`, `killCursorMap`), then `switch` on the result: case 1 runs `intro()` (`mwin`, then `wait`; in Basic `intro` calls `pause()`, defined in `system.prg`) and `end()`; case 2 calls `dirSav` then `load` then `end()`; case 3 calls `windows()` and the loop repeats. Completion therefore needs `cursorMapRun` to be scripted to return 1 or 2. Only case 1 needs no `dirSav`, `load` or `windows`, but all three must still resolve. `system.prg` alone needs nothing; calling `pause()` adds `wait`; the `debugger` calls are only on error paths.

For the remaining programs: `man.prg` (`mwin`, `wait`, `mwinCls`, `fightEnemy`), `oldman.prg` (`mwin`, `wait`), `win.prg` (`mwin`, `wait`, `mwinCls`, `eraseItem`), Basic `wander.prg` (`wander`), `man_wander.prg` (`playerLocation`, `itemLocation`, `itemPath`, `random`, `run`, `end`, `threadSleep`, `getThreadId`). Over all 10 programs: 26 domain names to double.

Wait kinds the samples force (AD-9 vocabulary): `input.key` (`wait`, `cursorMapRun`), `sleep` (`threadSleep`), `movement` (`itemPath` with `tkMV_PAUSE_THREAD`, 2 sites), a blob/menu kind for `dirSav`/`load`, and a battle wait for `fightEnemy` that AD-9's kind list does not contain (the battle epic would register one).

### Done-when items 1 to 6: what the samples can and cannot exercise

| # | Done-when item | Can the 10 programs exercise it? |
|---|---|---|
| 1 | `system.prg` and `start.prg` run to completion with scripted input | `start.prg` yes (needs a scripted cursor-map result of 1 or 2 and key input for `wait`). `system.prg` completes trivially; its class is never run |
| 2 | Snapshot at a random step, restore, identical result and state hash, for every program in the corpus | Weakly, see below |
| 3 | Threads: board, persistent, item; sleep, wake, `tellThread`, blocking, `multiRun` | Only: one item-thread program (`man_wander.prg`, `while (true)` with `threadSleep(getThreadId(), n)`, ends via `end()`), one inline item multitask string, Basic `wander.prg` (`while (true)` around one blocking `wander` call). No `thread()`, no wake, no kill, no `tellThread`, no `multiRun`, no board or persistent thread |
| 4 | Errors report file and line; handlers and `resume` forms | No: 0 handlers, 0 runtime errors by design; `debugger()` is the only error-like call (4 sites, all on validation paths). File and line can only be tested by a synthetic bad program |
| 5 | Language-only and pure built-ins | Only 11 names are touched: `local`, `global`, `kill`, `autoLocal`, `end`, `run`, `random`, `castLit`, `debugger`, `getThreadId`, `threadSleep`. Not touched: all string functions except `castLit`, all math except `random`, every file-I/O call, arrays beyond one numeric-indexed class member, maps |
| 6 | State shape and contracts of AD-7 to AD-9 | Inline programs: 3 one-line strings. Operand stack: mid-expression snapshots are possible in the 18 assignments whose target is a call and in the 8 `->` calls. By-reference outputs: 3 built-in call sites, each with 3 output variables (9 output slots). Handler state: none. Duplicate-name rejection: the in-file `abs` does not clash (no `abs` in the catalogue); no real clash exists. Restart on compiler mismatch: not testable |

### How weak the corpus is for the snapshot and restore test (Done-when 2)

- 9 non-empty files, but only 8 distinct programs (`system.prg` twice) and 1 empty file; 227 statements; 747 lines of which most are comments (325 comment lines).
- 4 of the 9 non-empty programs are only 2 to 5 statements long (`man` 4, `oldman` 5, `win` 4, Basic `wander` 2): straight-line `mwin`/`wait` sequences or one loop. A random-step snapshot in them lands inside one built-in call or between two.
- Only 1 program can create an object (`CArray`) and no program does. The object table, references, destructors and operator dispatch would be snapshotted empty.
- Largest call depth in the corpus is about 3 by static reading (`start` -> `intro` -> `pause`); no recursion; no user function with a by-reference parameter; max expression height 6.
- Loops: 4 `while (true)`, 2 `until`, 6 `for` (all bounded). Of the 4 infinite loops, 3 can end through `end()` (both `start.prg` copies after a scripted menu choice, and `man_wander.prg` through its `run`/`end` branch); Basic `wander.prg` never ends by itself, so "finishes with identical results" is undefined for it. A step budget or "same state hash after N steps" comparison has to define the finish line.
- Randomness: `random` is called at 2 sites in 1 file. The RNG state in snapshots (AD-12) is essentially untested.
- Yield points: `wait` 6, `cursorMapRun` 2, `dirSav` 2, `threadSleep` 1, `itemPath` 2, `fightEnemy` 1. Everything else is straight-line code.

Synthetic programs the epic will need (none of these exist in the corpus):
1. Expression-heavy code with calls inside arguments and inside indexes, so a snapshot lands mid-operand-stack; deep recursion; locals shadowing globals; `autoLocal(true)`.
2. Classes: instantiate, copy, `operator=`, `operator[]` as lvalue, `release()` and destructor order, multiple inheritance with virtual overrides, pure virtual, objects holding objects.
3. User functions with `&` parameters, with built-in by-reference outputs, snapshotted between the call and the write-back.
4. Error handlers: `setErrorHandler`, `setResumeNextHandler`, `resumeNext`, `on error goto`, `on error resume next`; errors in nested calls; errors with file and line, including inside an included file and inside inline code.
5. Threads: board, persistent and item threads, `thread()`, sleep and wake, `threadSleepRemaining`, `killThread`, `tellThread` (injected inline code), `multiRun` with movement coupling, thread start order, a blocking program that never yields (budget preemption).
6. Includes and implicit includes (`file.func`), `redirect`/`killRedirect`, include cycles.
7. Numbers: division by zero, `^` with fractions (through `fmath`), `NaN` and infinities, `-0`, large ints; string and map keys, multi-dimensional sparse arrays, `kill` on elements.
8. File I/O round-trips through the AD-17 requests mid-script; save and load of a running snapshot.
9. Compiler or source-hash mismatch on restore.
10. The legacy-syntax converter (9.9), once its output form is decided.

## Ambiguity list

IDs: LEX lexical, EXP expressions, STX statements and blocks, FUN functions, OOP classes and objects, SEM runtime meaning, MOD includes and modules, ERR error handling, THR threads and handles, PRG program-level. "Corpus can settle?" = Settled (the 10 programs answer it), Partly, No.

### Settled by the corpus (spec wrong or silent; fix the doc)

| ID | Section | Issue | Proposed fix | Corpus |
|---|---|---|---|---|
| STX-1 | 9.2, 9.5 | Newline ends a statement, so `{` on the next line should be an error; 24 of 72 braces (6 of 9 non-empty files) are on their own line | State that a newline between a block header and its `{` is allowed (and, if so, what else may precede `{`) | Settled |
| STX-2 | 9.5 | `case v: { }` vs `case (1)` newline `{` with no colon (6 sites) | Document the parenthesised, colon-less form; say whether the colon form is also accepted, whether the value is a full expression, and whether `default` takes a colon | Settled for the two forms seen; `default` unused |
| STX-3 | 9.5 | `else` on the line after `}` (1 site) and on the `}` line (4 sites) | State both are accepted; also state whether `else if` (two words) exists | Settled for `else`; `elseif` and `else if` unused |
| OOP-1 | 9.7 | Class members are written with bodies inside the class (22 of 22); the doc shows only prototype + `method CName::CName(...)` | Document in-class bodies as a form; say whether both forms may be mixed and whether an in-class prototype needs a later body | Settled for in-class; out-of-class form unexercised |
| FUN-1 | 9.5 | Typed parameters `CArray rhs` | Document the grammar and what the type does (check, coercion, overload choice) | Syntax settled; meaning not |
| FUN-2 | 9.3, 9.5 | `local(x) = v` and `global(x) = v` as the declare-and-assign form, including as a `for` initialiser (18 sites; all 16 `local` calls are targets) | Document `local(x) = v` / `global(x) = v` as declaration forms and say whether `local(x)` alone declares | Settled |
| FUN-3 | 9.5 | `return &m_data[idx]` (index, 2 per copy); the third `return &` per copy returns a plain global and is within the spec | State which operands `return &` accepts (any lvalue) | Settled for the index form |
| OOP-2 | 9.7 | `var m_data[]` empty brackets declare a growable array member | Document it and what it means next to `m_array[10]` | Settled (syntax) |
| OOP-3 | 9.7 | The identifier `this` is used (`this[idx] = rhs[idx]`) | Document `this` (type, lvalue, `this->x`, whether `this[i]` calls `operator[]`) | Syntax settled; semantics partly |
| SEM-1 | 9.3 | `kill` with an element argument (`kill(m_data[idx])`) and with two variables (`kill(a, b)`), 2 sites per copy | Say which element, whole-array and variadic forms exist | Settled that they are used; meaning inferred only; whole-array kill not exercised |
| MOD-1 | 9.6 | A function may be called before its definition in the same file, and a function defined in an included file may be called from the includer | State that definitions are hoisted per file and are visible after `#include` at load time | Settled |
| EXP-1 | 9.3 vs 9.9 | `a[ident]` (14 sites): the identifier is always a variable (10 `local()` names, 4 parameters); the legacy "unquoted map key" reading is never needed | Say that a bare identifier index is a variable lookup and that the legacy converter, not the parser, handles unquoted keys | Settled for the samples |
| SEM-2 | 9.5 | `until (expr)` loops while the condition is false and checks before the first pass (inferred from the one use) | State "check first, stop when true" explicitly | Partly (one use, consistent with the spec's wording) |
| FUN-4 | 9.5 vs 9.9 | `method` is called a legacy keyword in 9.9 but used as the current one in 9.5 and 9.7; the samples use only `method` (29 definitions, 0 `function`) | Say that `method` and `function` are interchangeable and neither is legacy; keep `returnMethod` as the legacy return | Settled |

### Open: the corpus cannot settle them

| ID | Section | Issue | Proposed question or fix | Corpus |
|---|---|---|---|---|
| LEX-1 | 9.2 | `_` is both an identifier character and the continuation marker. The rule "`_` at the end of a line" does not say whether a space must precede it, whether `foo_` ending a line continues, or whether it may be followed by `//`. The samples always put a space before it and nothing after | State: a lone `_` token (space before it) ending a line, optionally followed by `//` comment | Partly (6 uses, one shape) |
| LEX-2 | 9.2 | Identifiers may start with digits "as long as a letter follows". Then `1e6`, `2x` and `1e+6` collide: number or identifier? A leading digit identifier is never used. 5 fractional numbers (`d.d`) and 0 exponents appear | State the longest-match rule: a number token is `digits[.digits][e[+-]digits]` when the whole run is that; otherwise an identifier | No |
| LEX-3 | 9.2 | `!` and `$` after an identifier are sigils to ignore. That makes `x!=1` a sigil followed by `=`, `operator$()` (spec's own 9.7 example) lex as `operator` plus a sigil, and leaves `!=` undefined (the not-equal operator is `~=` only). 0 sigils, 0 `!` in the samples | Special-case `operator$` and `operator!`; say that `!=` is not an operator, or add it | No (the spec's own 9.7 class example fails a literal lexer) |
| LEX-4 | 9.2, 9.4 | `~` is unary NOT, the `~=` operator, and the leading character of a destructor name. `~obj()` in an expression is NOT applied to a call, while `method ~CArray()` is a name | State that the destructor `~` is only recognised right after `method` or `::` | Partly (2 destructors, 10 `~=`) |
| LEX-5 | 9.2 | A leading `*` makes a legacy comment "when `*` is the first non-blank character". A continued line starting with a `*` multiplication would be eaten; does `**` start a comment even after a continuation? | State that a continued line is not "first non-blank" | No (0 uses) |
| LEX-6 | 9.2 | A leading `#` is "ignored" and `#include` is a directive. Rules for `# include`, `#INCLUDE`, a `#` inside a line, and `#Mwin(text)` unquoted arguments are missing | Give the exact `#` grammar or send all `#` lines to the 9.9 converter | No (1 `#include`, nothing else) |
| LEX-7 | 9.2, 9.10 | "Board constants and engine constants are substituted at lex time". Board constants change per board, so a program's compiled form would depend on the board that runs it; this clashes with AD-7 (compiled code rebuilt from file text) and E-91 (cache by file name) | Say whether substitution is at lex time or read time; if lex time, the cache key must include the board | Partly (2 engine constants seen, no board constants) |
| LEX-8 | 9.2 | String literals: can a string contain a newline? (`"` cannot appear.) Windows-1252 bytes above 127 inside strings and comments | State newline in strings is an error; confirm cp1252 | No (0 non-ASCII bytes; 54 strings, all single-line) |
| LEX-9 | 9.2 | `true`, `false`, `null`: keywords or constants substituted at lex time? Case-insensitive? Can a variable be called `true`? | State they are reserved case-insensitive literals | Partly (9 uses of `true`) |
| LEX-10 | 9.2 | Case-insensitivity covers which names: variables, labels, class and member names, built-ins, file names in `#include`? How are names normalised in a snapshot (G3 forbids `Intl`)? | State ASCII lower-casing of identifiers only | No (all 91 identifiers have a single spelling) |
| LEX-11 | 9.2 | Unknown characters (`@`, backslash, a lone `$`): error or ignored? | State error with file and line | No (0 occurrences) |
| EXP-2 | 9.4 | "Precedence follows C conventions" but `^` is power (not XOR in C), `` ` `` is XOR, `~` is NOT, `and`/`or` are words, and C ranks `&`, `^`, `\|` below comparisons. Where does `^` sit relative to unary minus? Is it right associative? Is `x & y == z` `x & (y == z)`? | Add a precedence table | Partly: only `\|` (2 uses, between two engine constants inside an argument) and `&&` (10) occur |
| EXP-3 | 9.4, 9.5 | `&` is bitwise AND, the by-reference parameter marker, and the `return &var` marker. In an argument, is `&x` allowed (explicit by-reference at the call site)? | State where unary `&` is legal | No |
| EXP-4 | 9.9 | `if (x = 5)`: assignment (C reading, 9.4 "assignments are expressions") or comparison (legacy rule)? Syntax cannot tell them apart. The only occurrence in the samples is in `system.prg`: a variable on the left, a method call on the right, written inside an `if` condition. [INFERENCE: it behaves as assignment-then-truth test, because its two branches build either a dynamic or a fixed-size array; this is the opposite of the legacy rule] | Decide the rule (for example: legacy rule only in files flagged legacy, never in 3.1 syntax) | No (1 site per copy; ambiguous in meaning) |
| EXP-5 | 9.4 | Ternary `a ? b : c` vs label `:name`, `case v:` and `public:` all use `:`; `++`/`--` as expression statements vs operators across lines; unary plus; `.` operator | List where each `:` is legal | Partly (1 ternary) |
| EXP-6 | 9.3 | Index syntax on call results (`f(x)[i]`, `obj->arr[i]`), multi-dimensional `a[1][2]`, and map keys `m["key"]`: all documented in prose only | Add a grammar table | No (14 index sites, all `name[var]`) |
| STX-4 | 9.5 | Are brace-less bodies (`if (x) stmt`) allowed? `for (init; cond; step)` uses `;` that is also the statement terminator; may parts be empty? | State braces required; empty parts allowed or not | Partly (0 brace-less bodies; 6 `for` all fully filled) |
| STX-5 | 9.5 | Labels: `:label` statement vs `:label` as an argument (`branch(:label)`, `setErrorHandler(:label)`); label scope (function or program) and whether `branch` crosses function bounds | Define scope and lifetime | No (0 labels) |
| STX-6 | 9.2, 9.5 | A statement before `}` without `;` or newline (`{ x = 1 }`) | State whether `}` terminates the statement | No (0 uses; the 9.5 examples always put `;`) |
| STX-7 | 9.9 | Loose text lines and `#Mwin(Hello there)` with unquoted arguments cannot be tokenised by 9.2 at all; both fail in the spec-example probe | State that these exist only in files that go through the update converter | No (0 uses) |
| FUN-5 | 9.5 | Default parameter values, variadics, return types, overloading by type as well as count | State they do not exist | No |
| FUN-6 | 9.5 | `inline function`: "hint: expand at call sites": no semantic effect? | State it has no effect | No (0 uses) |
| FUN-7 | 9.5 | `end()` inside a function inside an included file or a nested `run()`: does it end the current program only? Samples call `end()` 5 times inside `while`, `switch`, and `if`; `run(prg)` is called once before an `end()` | Define unwinding of nested frames | Partly |
| OOP-4 | 9.7 | Assignment between objects: "copies by calling `operator=` or a copy constructor, otherwise shallow" vs "objects are reference handles". When is a new handle stored and when is `operator=` called? What is a "copy constructor" when a 1-argument constructor is a "cast ctor"? | State: if the target already holds an object call `operator=`; otherwise store the handle | No (no object is ever assigned to another object) |
| OOP-5 | 9.7 | Destructors: only `release()` runs them? When is memory freed? "Objects are not garbage-collected" | Say that `kill(obj)` and program end do not run destructors, or that they do | No (0 `release()` calls; 2 destructors defined) |
| OOP-6 | 9.7 | Member lookup order inside a method: local, member field, member method, global function, built-in? Does `this->x` need to be written? | Define the order (also needed for AD-8 lookup precedence) | Partly (unqualified `clean()` call inside methods) |
| OOP-7 | 9.7 | `operator$()` and `operator!()` may exist "only one"; `operator()`, `operator->`; unary vs binary operators distinguished by parameter count? Which operators does the dispatcher consult for `a[i] = v`? | Define dispatch for each | No (only `=` and `[]` used) |
| OOP-8 | 9.7 | Multiple inheritance order, diamond bases, constructor chaining, `super`, virtual dispatch, pure-virtual abstract instantiation error | Define MRO and error | No (0 base classes) |
| OOP-9 | 9.7 | Class access labels: `protected`, default access for `class`, whether `private` is enforced at run time | Define | Partly (`public:` and `private:` once each per copy) |
| SEM-3 | 9.3 | Comparison of strings with `==` / `~=`: case-sensitive? Number-versus-string comparison and coercion; division by zero; integer overflow; what `castLit`, `castNum`, `castInt` do exactly | State the coercion table | No (the only string compare is `~=` against upper-case words) |
| SEM-4 | 9.3 | `local(x)` scope: from declaration to the end of the function? the block? `autoLocal(true)` at program level (Basic `start.prg` line 7): are variables of a program visible to its own functions, to `run()` programs, to included files? | Define scope and visibility | No (the functions in that file use no outer variable) |
| SEM-5 | 9.3, 9.10 | Reads of unset variables give `""`/0: type of `""` vs 0 in `~=` and `+`? Do array elements default separately? | State | No |
| SEM-6 | 9.11 | By-reference outputs of built-ins: a call-site variable written back; for user functions `&param` only. Is writing back on yield-and-resume atomic (AD-8 `out`)? Which built-ins take output parameters is only a prose rule "most getters" | Make the catalogue list each built-in's `byRef` parameters | Partly (3 sites, each with three trailing output variables, in `playerLocation`/`itemLocation`) |
| MOD-2 | 9.6 | `#include` path root (`Prg/`), already-included files, cycles, include inside a function, include of an empty file; implicit include `file.func(args)` vs `.` token | Define | Partly (1 `#include "x.prg"`, no path separator) |
| MOD-3 | 9.6 | `redirect`/`killRedirect`: global map in snapshot state (`redirects`); redirect to a built-in name; redirect chain | Define | No (0 uses) |
| ERR-1 | 9.8 | "Error handlers work inside functions only": program top level? Are labels resolved in the function or the program? `resumeNext()` resumes "after the failing statement": mid-expression state is dropped? Does a handler also see errors from nested built-ins? | Define precisely | No |
| ERR-2 | 9.8, AD-24 | What is an error: unknown function, wrong arity, type errors, array bound, division by zero, built-in failure? Which are catchable? | List the error classes | No |
| THR-1 | E-93 | `threadSleep(id, seconds)`: unit and resolution under a fixed step; "indefinite" sleep value; wake order when several wake the same step | Define units | Partly (`threadSleep(getThreadId(), n)` once; n is a number, unit not visible) |
| THR-2 | E-93, E-95 | `"source"`/`"target"` handles are resolved by the domain built-in per call; samples use them in 5 calls from 3 programs. The VM must carry source and target per thread and per `tellThread` | Say whether `source`/`target` are saved per frame or per thread | Partly (5 uses) |
| THR-3 | E-33, AD-26 | A thread that calls `itemPath` with `tkMV_PAUSE_THREAD` waits for the movement; a thread that never yields (`while (true)` with a non-blocking body) is preempted at a budget. Where does the budget count toward snapshot step numbers? | Define "step" for snapshot tests | No |
| PRG-1 | E-02, E-01 | How `system.prg` is loaded and run is not stated anywhere in `docs/`; `demo`'s copy is referenced by nothing | State when and by what it runs, or say it is an ordinary library file | No |
| PRG-2 | 9.1 | An empty program (the 0-byte `sys_test.prg`) and a program with no final newline (3 files) must load; a first byte of `0x00` marks pre-compiled files | State both | Settled for these two cases (all 10 files load; none starts with 0x00) |

## Doc-fix proposals (not applied; `docs/` untouched)

1. 9.2/9.5: allow newlines before a block's `{`; give the examples with the brace on its own line.
2. 9.5: document `case (v)` without colon and say whether the colon form is also accepted; document `default` form; state whether `case` values are expressions; keep "no fall-through".
3. 9.5: document `else` on a later line than `}` (and decide `else if`).
4. 9.5/9.7: document typed parameters, or say they are ignored.
5. 9.3/9.5: document `local(x) = v` and `global(x) = v` as declaration-and-assignment forms; list the allowed operands of `return &`.
6. 9.7: document in-class method bodies; `var x[]`; `this`; the member lookup order; when a destructor runs; when `operator=` is called; how `operator[]` serves reads and writes.
7. 9.3: document `kill` forms (element, whole array, several arguments).
8. 9.2: tighten the lexical rules: number versus identifier, `_` continuation, `#` lines, `!`/`$` sigil special cases (`operator$`, `operator!`, `!=`), `~` roles; state that string literals cannot span lines.
9. 9.4: add a precedence and associativity table including `^`, `` ` ``, `~`, `and`, `or`, `?:`, assignment operators and the three roles of `&`.
10. 9.9: resolve the contradiction about `method` and `returnMethod` (current or legacy); say that the `=`-as-comparison rule never applies to 3.1 syntax (the samples use `=` inside an `if` condition as assignment); state that unquoted-argument and loose-text legacy forms are handled by the converter, not by the parser.
11. 9.6: state that definitions are hoisted per file and visible after `#include`; give the include path root and cycle rule.
12. docs (engine or format spec): say how and when `system.prg` runs; say what `windows`, `wait` and `dirSav` belong to (epic ownership) and where `menuGraphic` sits (9.11 files it under Battle).

## Commands used

All scripts are in `/tmp/disc/scripts/langparse/`, each run as `python3 SCRIPT > /tmp/disc/langparse-NAME.out 2>&1; echo "exit=$?" >> /tmp/disc/langparse-NAME.out`, and every output ends in `exit=0`. No repo file was written, no git command was run, and the legacy source tree was never touched. Program text is read by the scripts only; no program text appears in any output.

| Script | Output | Purpose |
|---|---|---|
| `lex.py` | (library) | Tokenizer from 9.2 and 9.4; every non-literal decision is a named note |
| `parse.py` | (library) | Recursive-descent statement and expression parser from 9.3 to 9.8; `strict` mode is the literal reading, lenient mode records each use of a missing rule |
| `run_probe.py` | `langparse-probe.out` | First pass over the 10 files (strict and lenient) used to find the missing rules |
| `analyze.py`, `tables.py` | `langparse-analysis.out`, `langparse-analysis.json`, `langparse-tables.out`, `langparse-calls.json` | Per-file token, statement, depth and construct counts, rule sites, call sites, definitions |
| `reconcile.py`, `census_repro.py`, `eq_repro.py` | `langparse-reconcile.out`, `langparse-census-repro.out`, `langparse-eq-repro.out` | Comparison with the colleague's census |
| `classify.py`, `doubles.py` | `langparse-classify.out`, `langparse-owners.json`, `langparse-perfile-names.json`, `langparse-doubles.out` | Call-target classes, owner epics, test-double sets |
| `skeleton.py` | `langparse-skeleton.out` | Ordered statement skeleton per file (kinds, callee names, assignment target kinds) |
| `inline_parse.py` | `langparse-inline.out` | Parse of the 3 inline code strings stored in the sample boards (reuses my board reader from the earlier task) |
| `facts.py`, `facts2.py`, `handles.py`, `lexfacts.py`, `bracefacts.py`, `loopfacts.py`, `detail.py` | `langparse-facts.out`, `langparse-facts2.out`, `langparse-handles.out`, `langparse-lexfacts.out`, `langparse-bracefacts.out`, `langparse-loopfacts.out`, `langparse-detail.out` | Argument shapes, operator sites, constants, handles, spellings, brace style, loop shapes, bare-index classification |
| `refs.py` | `langparse-refs.out` | Which `.prg` files are named by other programs or by board fields (shows `system.prg` is named only by the one `#include`) |
| `spec_examples.py` | `langparse-spec-examples.out`, `langparse-spec-examples-summary.out` | The spec's own 9.2 to 9.9 examples through the parser: 36 examples, 29 parse literally, 7 do not (class example with `operator$`, `operator!`, `file.func(...)`, `m[key]`, `#Mwin(Hello there)`, loose text); 2 do not parse even leniently (the two unquoted legacy forms) |
| `showkinds.py` | (terminal only) | Token-kind view of single lines while debugging; names withheld in outputs |
| Totals | `langparse-totals.out` | Token-kind totals and rule totals |

A first draft of the parser failed in strict and lenient mode at several lines; each failure produced one new rule (`BRACE-ON-NEXT-LINE`, `CASE-COLON-OMITTED`, `TYPED-PARAMETER`, `ASSIGN-TO-CALL`, `RETURN-REF-EXPR`, `EMPTY-ARRAY-DECL`). A first run of `classify.py` also had a lower-casing bug that was fixed before the numbers above were taken.

These scripts were throwaway and live only in the author's temporary folder; they are not kept in the repository.

## What I could not determine

- The meaning of the sample behaviour I only inferred from structure: that `until` checks before the first pass, that the `if (m_isDynamic = ...)` line is an assignment, and what the four compared words in `pause` are. All three are marked [INFERENCE] in the tables.
- Whether the census call-token difference (23 mine against 22) in `system.prg` and the missing 2 call sites come from one construct; I did not find which.
- Anything about runtime behaviour: nothing here executes a program. Statement counts are static; "steps" in the snapshot test are undefined until the VM's step is defined.
- The ownership of `wait`, `dirSav`, `windows` and `menuGraphic`: the docs name no function-level owner. My mapping from E-id ranges is a proposal.
- Error handlers, legacy syntax, implicit includes, redirects, file I/O, board and persistent threads, `tellThread`, `multiRun`, inheritance, `release()`: zero uses; only the spec text and its examples are available, and the spec's own class example fails a literal lexer at `operator$`.
- Whether `abs` or other names the samples define themselves would clash with built-ins: only built-in names listed in 9.11 were checked; 278 distinct names result from my slash-form expansion of the catalogue spans (the doc says "about 280"), which I did not use to settle anything.
- Pre-compiled `.prg` (9.1): no sample file is pre-compiled, so nothing was checked.
