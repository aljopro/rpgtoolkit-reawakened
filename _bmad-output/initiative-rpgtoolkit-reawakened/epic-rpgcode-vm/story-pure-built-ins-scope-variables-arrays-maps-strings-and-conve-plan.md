---
title: 'Pure built-ins: scope, variables, arrays, maps, strings and conversions'
type: 'feature'
ticket: 12
created: '2026-10-16'
status: done
baseline_revision: '9d4004bfce19395e7e48a1ee184295e27e781e18'
route: 'full'
route_source: 'auto'
risk: 'medium'
context: ['{project-root}/docs/guardrails.md', '{project-root}/docs/adr/0004-script-ast-step-ir-and-plugins.md', '{project-root}/_bmad-output/initiative-rpgtoolkit-reawakened/epic-rpgcode-vm/epic-rpgcode-vm.md', '{project-root}/docs/spec/engine/rpgcode-runtime.md', '{project-root}/docs/spec/engine/rpgcode-language.md', '{project-root}/docs/spec/engine/rpgcode-functions.md', '{project-root}/_bmad-output/initiative-rpgtoolkit-reawakened/epic-rpgcode-vm/discovery/command-effect-catalogue.json']
---

<frozen-after-approval reason="human-owned intent — do not modify unless the human renegotiates">

## Intent

**Problem:**
Ticket 3.5 built the RPGCode grammar, lowerer, and instruction pipeline, and Ticket 3.21 provided generic stubs for catalogue names so scripts don't crash on unresolved commands. However, the core language lacks real implementations for its fundamental pure built-ins: string operations, string/numeric conversions, explicit scope management (`autoLocal`, `kill`), array/map mutations, and the E-92 engine-backed virtual variables. Currently, calling `len("hello")`, `split("a,b", ",", arr)`, or `castNum("42")` either hits dummy stubs that return `0`/`null` or throws runtime errors, preventing real scripts (such as `start.prg` and `system.prg`) from performing real string parsing and variable calculations.

**Approach:**
1. **Core Language Built-Ins Pack (`packages/core/src/script/builtins/`):**
   Implement the 23 pure language built-ins across dedicated modules and register them in `CORE_PLUGIN` (`packages/core/src/script/builtins.ts`):
   - **Strings & Conversions (`strings.ts` & `conversions.ts`):** `len`, `length` (alias of `len`), `left`, `right`, `mid` (1-based offset), `inStr` (1-based offset and return, 0 if not found), `replace`, `regExpReplace`, `split` (writes `arr[0..n-1]` and returns `count + 1` per SEM-6/R2-Q15), `trim`, `lcase`, `ucase`, `asc`, `chr`, `charAt` (1-based index), `castLit` (uses `numberToString` 6 significant digits), `castNum` (uses `stringToNumber`), `castInt` (uses `toInt32`), and `spliceVariables` (substitutes `<var>` from globals per catalogue note).
   - **Scope & Variables (`scope.ts`):** `autoLocal(bool)` (controls dynamic local creation in current frame), `kill(var, ...)` (variadic deletion: deletes single variable, array element `a[i]`, or entire array `a[...]`), and functional forms of `local(name[, &ret])` and `global(name[, &ret])`.
2. **E-92 Engine-Backed Virtual Variables (`packages/core/src/script/virtuals.ts`):**
   - Provide `VirtualVariablePort` and `createDefaultVirtuals(state: GameState)` to read engine state for the 44 legacy virtual variables and Reawakened additions (E-92, R-37, owner ruling U2): `gametime` (seconds elapsed from `state.time.tick`), `music`, `playerx[0..4]`, `playery[0..4]`, `playerlayer[0..4]`, `playerhandle[0..4]`, `boardtitle[1..8]`, `constant[0..10]`, `boardbackground`, `boardskill`, `cnvrendernow`, `threads[i]`, and `ambientRed`/`ambientGreen`/`ambientBlue`.
   - Wire `virtuals` into `ScriptServices` and `loadArg` in `packages/core/src/script/vm.ts`. Reading checks `frame.locals`, then `vm.globals`, then `virtuals`. As documented (E-92 compatibility note), assigning to a virtual variable writes to `vm.globals`, breaking the link for the remainder of the session.
3. **Array and Scope Hardening in VM (`packages/core/src/script/vm.ts`):**
   - In `loadArg`, when a variable is not found and `frame.autoLocal` is true, create it in `frame.locals` instead of `vm.globals` (SEM-4).
   - Ensure `autoLocal` propagates across nested frames in function calls.
   - Support `kill` deleting `vm.globals[name]`, `frame.locals[name]`, and matching array element keys `name[...]`.
4. **Catalogue Stub De-duplication (`tools/catalogue/generate.mjs`):**
   - Update `tools/catalogue/generate.mjs` to exclude names now implemented in `CORE_PLUGIN` so `catalogue-stubs.ts` does not contain dead duplicate stubs or cause override warnings during registry assembly.
   - Regenerate `catalogue-stubs.ts` via `node tools/catalogue/generate.mjs` and update `script-catalogue.test.ts` expectations accordingly.
5. **Comprehensive Verification Suite (`packages/core/test/script-builtins-pure.test.ts`):**
   - Exercise each built-in family as ruled by SEM-3 through SEM-6.
   - Assert unset reads return `0` / `""` and create variables as documented.
   - Verify trailing `&dest` by-reference write-backs.
   - Verify `kill` on scalar variables, single array elements, and whole arrays.
   - Verify snapshot/restore state hash preservation.

## Boundaries & Constraints

**Always:**
- Keep all VM state and built-in results strictly `PlainData` (G1 rule 2, AD-7, AD-10). No `undefined`, no functions, no class instances in `VmState`.
- Conform to SEM-3 through SEM-6 (`docs/spec/engine/rpgcode-runtime.md`):
  - Deterministic number-to-string using `numberToString` (6 significant digits; G3, ADR 0002).
  - String-to-number using longest-prefix `stringToNumber`.
  - Integer conversions truncated via `toInt32`.
  - `split(str, delim, arr)` writes 0-indexed elements and returns `count + 1` (SEM-6:73, R2-Q15).
  - 1-based indexing for `mid`, `charAt`, and `inStr` (`docs/spec/engine/rpgcode-functions.md`).
- Clean-room discipline (G7): implement only from `docs/` and specifications. Never open, copy, or translate `../rpgtoolkit`.
- Headless golden tests (`pnpm golden`) must pass without `--record` and with `git diff golden/` clean (G5).

**Never:**
- Never use `Math.random`, `Date.now`, `performance.now`, or `Intl` in `core` (G2, G3).
- Never introduce `undefined` or omitted keys in `EffectRecord` or `VmState`.
- Never mutate state sections directly from command handlers (AD-8, AD-10). Handlers return `CommandResult`.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| `len` / `length` string | `len("hello")` | Returns `5` | Arity check: 1 to 2 arguments |
| `len` with byRef output | `len("test", v)` | Returns `4`, writes `4` to caller variable `v` | Non-variable argument for byRef throws `builtin.out-not-by-ref` |
| `left` normal & clamped | `left("abcdef", 3)` / `left("abc", 10)` / `left("abc", -1)` | Returns `"abc"` / `"abc"` / `""` | None |
| `right` normal & clamped | `right("abcdef", 3)` / `right("abc", -1)` | Returns `"def"` / `""` | None |
| `mid` 1-based offset | `mid("abcdef", 2, 3)` | Returns `"bcd"` (character index 1 to 3 in JS) | None |
| `inStr` 1-based match | `inStr("haystack", "stack")` | Returns `4` | Returns `0` when needle not found |
| `inStr` with offset | `inStr("banana", "an", 3)` | Returns `4` | None |
| `replace` multiple occurrences | `replace("banana", "a", "o")` | Returns `"bonono"` | None |
| `regExpReplace` regex match | `regExpReplace("foo123bar", "[0-9]+", "X")` | Returns `"fooXbar"` | Invalid regex pattern throws `builtin.bad-arg` |
| `split` by-reference array | `split("apple,banana,orange", ",", fruits)` | Writes `fruits[0] = "apple"`, `fruits[1] = "banana"`, `fruits[2] = "orange"`; returns `4` (`count + 1`) | Non-variable array argument throws `builtin.out-not-by-ref` |
| `trim` whitespace | `trim("  hello world \t\n ")` | Returns `"hello world"` | None |
| `lcase` / `ucase` ASCII | `lcase("Hello!")` / `ucase("Hello!")` | Returns `"hello!"` / `"HELLO!"` (uses `foldAscii` / uppercase) | None |
| `asc` / `chr` ASCII conversion | `asc("A")` / `chr(65)` | Returns `65` / `"A"` | Empty string `asc("")` returns `0` |
| `charAt` 1-based position | `charAt("hello", 1, ch)` | Returns `"h"`, writes `"h"` to `ch` | Out of range returns `""` |
| `castLit` number formatting | `castLit(1234567)` | Returns `"1.23457e+06"` (SEM-3 rule) | None |
| `castNum` string to number | `castNum("12abc")` / `castNum("abc")` | Returns `12` / `0` (SEM-3 prefix rule) | None |
| `castInt` truncate toward zero | `castInt(-2.7)` / `castInt("3.9abc")` | Returns `-2` / `3` (SEM-3 ToInt32 rule) | None |
| `spliceVariables` substitution | Global `hero = "Alex"`, `spliceVariables("Welcome <hero>!")` | Returns `"Welcome Alex!"` | Unset `<unknown>` evaluates to `""` |
| `autoLocal(true)` in frame | Call `autoLocal(true)`, then assign `x = 10` | `x` is created in `frame.locals`, not `vm.globals` | None |
| `autoLocal(false)` restores default | Call `autoLocal(false)`, then assign `y = 20` | `y` is created in `vm.globals` | None |
| `kill(x)` scalar variable | `x = 10; kill(x); print(x)` | `x` is deleted from scope; reading returns unset `0` | None |
| `kill(a[1])` array element | `a[0] = "first"; a[1] = "second"; kill(a[1])` | `a[1]` deleted; `a[0]` remains `"first"`; reading `a[1]` returns `0` | None |
| `kill(a)` whole array | `a[0] = 1; a[1] = 2; kill(a)` | All elements with prefix `a[...]` deleted | None |
| `kill(a, b, c)` variadic | `kill(x, y, z)` | Deletes all three variables | None |
| E-92 read `gametime` | Unassigned `gametime` read | Returns `Math.floor(state.time.tick / 60)` | None |
| E-92 assign breaks link | Assign `gametime = 99`, read `gametime` | Returns `99` (breaks engine link per E-92) | None |
| E-92 `constant[0]` | Read `constant[0]` | Reads current board constant or `0` | None |

</frozen-after-approval>

## Code Map

- `packages/core/src/script/builtins/strings.ts` (NEW) — Pure string functions (`len`, `length`, `left`, `right`, `mid`, `inStr`, `replace`, `regExpReplace`, `split`, `trim`, `lcase`, `ucase`, `asc`, `chr`, `charAt`, `spliceVariables`).
- `packages/core/src/script/builtins/conversions.ts` (NEW) — Pure conversion functions (`castLit`, `castNum`, `castInt`).
- `packages/core/src/script/builtins/scope.ts` (NEW) — Pure scope management functions (`autoLocal`, `kill`, `local`, `global`).
- `packages/core/src/script/virtuals.ts` (NEW) — E-92 virtual variables port, default reader, and name pattern matchers.
- `packages/core/src/script/builtins.ts` (EDIT) — Register the 23 pure built-in specs in `CORE_PLUGIN`.
- `packages/core/src/script/vm.ts` (EDIT) —
  - Wire `virtuals` into `ScriptServices`, `createScriptServices`, and `loadArg`.
  - Update `loadArg` to respect `frame.autoLocal` (allocate in `frame.locals` when true).
  - Propagate `autoLocal` across function call frames.
  - Implement variadic and array-pattern deletions in `kill`.
- `packages/core/src/script/index.ts` (EDIT) — Re-export virtuals types and helper utilities.
- `tools/catalogue/generate.mjs` (EDIT) — Exclude implemented commands from `catalogue-stubs.ts` generation.
- `packages/core/src/script/catalogue-stubs.ts` (REGENERATE) — Regenerated without the 23 implemented commands.
- `packages/core/test/script-catalogue.test.ts` (EDIT) — Update stub count assertion to 153.
- `packages/core/test/script-builtins-pure.test.ts` (NEW) — Test suite covering strings, conversions, scope, arrays, maps, and virtual variables.

## Tasks & Acceptance Criteria

### Task 1: String and Conversion Built-Ins
- **Path:** `packages/core/src/script/builtins/strings.ts`, `packages/core/src/script/builtins/conversions.ts`
- **Action:** Implement the 19 string and conversion commands adhering to SEM-3, SEM-5, and SEM-6.
- **Acceptance Criteria:**
  - Given a string, `len` and `length` return character count and write to optional trailing `&ret`.
  - Given `mid("abcdef", 2, 3)`, returns `"bcd"` using 1-based start.
  - Given `inStr("hello world", "world")`, returns `7` (1-based index); returns `0` if absent.
  - Given `split("1|2|3", "|", arr)`, writes `arr[0] = "1"`, `arr[1] = "2"`, `arr[2] = "3"`, and returns `4`.
  - Given `castLit`, `castNum`, and `castInt`, convert values matching `numberToString`, `stringToNumber`, and `toInt32` exact rules.
  - Given `spliceVariables("Hi <name>!")`, substitutes `<name>` from globals.

### Task 2: Scope Built-Ins and Dynamic AutoLocal
- **Path:** `packages/core/src/script/builtins/scope.ts`, `packages/core/src/script/vm.ts`
- **Action:** Implement `autoLocal`, `kill`, `local`, `global` and VM frame autoLocal behavior.
- **Acceptance Criteria:**
  - Given `autoLocal(true)`, new assignments inside the frame create local slots in `frame.locals`.
  - Given `kill(x)`, removes variable `x` from locals or globals.
  - Given `kill(a[1])`, removes the element variable `a[1]`.
  - Given `kill(a)`, removes all variables prefixed with `a[...]`.
  - Given `kill(a, b, c)`, removes all specified variables in one call.

### Task 3: E-92 Virtual Variables Reader
- **Path:** `packages/core/src/script/virtuals.ts`, `packages/core/src/script/vm.ts`
- **Action:** Implement `VirtualVariablePort` and default reader for E-92 virtual variables.
- **Acceptance Criteria:**
  - Given unassigned `gametime`, reading returns `Math.floor(state.time.tick / 60)`.
  - Given `constant[0]`, reading returns the board constant or `0`.
  - Given an assignment `gametime = 100`, subsequent reads return `100` (breaks engine link).

### Task 4: Registration, Catalogue Generator Update, and Stub De-duplication
- **Path:** `packages/core/src/script/builtins.ts`, `tools/catalogue/generate.mjs`, `packages/core/src/script/catalogue-stubs.ts`
- **Action:** Register commands in `CORE_PLUGIN`, update generator to exclude them, and regenerate stubs.
- **Acceptance Criteria:**
  - Given `createScriptServices(state)`, all 23 commands resolve to `CORE_PLUGIN` specs without override warnings.
  - Given `pnpm catalogue:check`, validates `catalogue-stubs.ts` cleanly.
  - Given `pnpm catalogue:test`, passes with 0 failures.

### Task 5: Comprehensive Test Suite & CI Validation
- **Path:** `packages/core/test/script-builtins-pure.test.ts`, `packages/core/test/script-catalogue.test.ts`
- **Action:** Author full unit test suite and run all workspace verification gates.
- **Acceptance Criteria:**
  - Given `pnpm test`, all tests pass including new pure built-ins suite.
  - Given `pnpm typecheck`, `pnpm lint`, `pnpm graph`, `pnpm licence`, `pnpm provenance`, and `pnpm golden`, all exit 0 cleanly.

## Verification Plan

Execute in workspace:
```bash
node tools/catalogue/generate.mjs --check
pnpm catalogue:test
pnpm typecheck
pnpm test
pnpm lint
pnpm graph
pnpm licence
pnpm provenance
pnpm golden
```
