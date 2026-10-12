---
title: 'Tracer bullet: source text to a restored snapshot through the harness'
type: 'feature'
ticket: '2'
created: '2026-10-11'
status: 'draft'
baseline_revision: '7ff33f40a790f689d3fc2e9fd8a267b4957b0fce'
route: 'full'
route_source: 'auto'
risk: 'high'
review: ''
review_source: ''
lenses_ran: []
review_loop_iteration: 0
context: ['docs/guardrails.md', 'docs/format-spec.md', 'packages/core/src/ports/engine.ts', 'packages/runner-harness/src/driver.ts']
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** nothing in `packages/core` can run RPGCode. Models, readers and the port contracts exist (epic 1 and 2), but there is no VM, no state tree, no built-in seam and no snapshot contract, so the harness can only drive a fake `Engine` and every later entry of epic 3 (registry, grammar, classes, errors, threads, snapshot hardening) plus epics 4–8 wait on shapes that are still undefined.

**Approach:** drive one inline program the whole way once — source text → lex/parse the minimal TK3 subset → linear Step IR → provisional built-in registry (`end`, `sleep`) → the step machine yielding one AD-9 `sleep` wait and waking on the step counter → a mid-run snapshot restored into a fresh VM → a VM-backed `Engine` test host in `runner-harness` that the existing `runLog`/golden driver drives. Ship, with it, the `GameState`/`VmState` shell (AD-10), `core/rng` (AD-12) and a reusable snapshot→restore→hash check.

## Boundaries & Constraints

**Always:** G1 — explicit step machine, statuses never promises, all VM state plain data (`AssertPlainData<GameState>`); G2 — `core` imports nothing outside `core`, `runner-harness` imports only the `@tk-reawakened/core` entry (no deep paths, AD-22); G3/AD-13 — no `Date`/`performance`/`Math.random`/`Intl` in `core`, `Math.imul` is the only `Math` member the RNG needs; AD-7/AD-10 — the state shapes are exactly the ones AD-7 lists and each section has one owner, with the sections entry 2 does not own left empty; AD-8 — `end` and `sleep` are ordinary `BuiltinSpec`s with no VM backdoor; AD-11 — snapshot and hash use `canon`/`hashState`; ADR 0004 decision 1 — three-tier lowering (Unified AST → Step IR → registry dispatch); G7 — cite `docs/format-spec.md` §9.2/§9.3/§9.5/§9.11 and `docs/adr/0004` in every new core file's header, and never open the legacy tree; house style — kebab-case files, `erasableSyntaxOnly` (no `enum`, no parameter properties), `verbatimModuleSyntax` (`import type`), every new field explicit (`null`, never `undefined`).

**Never:** not `createEngine`, not the AD-26 phase list, not the game loop (epic 4 owns all three; the host calls core's script-phase step) · not the full grammar or the TK2 frontend (entry 5 / entry 15) · not the wait-kind registry with its duplicate rule (entry 9) · not the registry assembly, duplicate names, aliases or lookup precedence (entry 3) · not `hashState` hardening, bounds or the restore-versus-restart policy for a mismatch (entry 11) · not located diagnostics or the `Logger` port (entry 7) · not `core/fmath` (entry 4) · not objects or classes (entry 6) · no input handling, no `ProgramCache`, no `.prg` file programs (entry 8) · no new runtime dependency; no golden fixture may change; nothing in `runner-headless`, `tools/` or `eslint.config.js` moves.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Program runs to the end | IR falls off the end / `end()` then `return` | thread `finished`; `advance` keeps counting steps | none |
| Blocking call | `sleep(n)` runs at step `s` | thread `waiting`, `wait = { kind: 'sleep', until: s + n }`, `ip` already past the call, no value pushed | none |
| Wake | waits phase at a step where `time.step >= until` | `status: ready`, `wait: null`, the polled `value` pushed, waiting threads polled in ascending id order | none |
| Wake is early | waits phase at `time.step < until` | `null` from poll: thread stays `waiting`, nothing pushed | none |
| Unknown command | `call` of a name no spec defines | `ScriptError` code `unknown.command` | throws; entry 7 maps it to a located `Diagnostic` |
| Wrong argument count | more or fewer args than `ParamSpec[]` allows | `ScriptError` code `arity.mismatch` | throws |
| By-reference output | built-in returns `out: [[i, v]]` for `params[i].byRef` | the caller's variable holds `v` before the next step and inside the state hash | `out` for a non-`byRef` param → `ScriptError` code `builtin.out-not-by-ref` |
| Snapshot | any `GameState` | `canon` round-trips exactly: `canon(restoreGameState(canon(s))) === canon(s)` | different `schema.compiler` → `ScriptError` `restore.compiler-mismatch`; a missing section → `restore.shape` |
| Unset variable read | a name never assigned | `0` — the numeric default; the `""`/0 split is SEM-5 and lands with entry 12 | none |
| Empty batch | `advance(0, [])` | `stepsRun: 0`, `stepAfter` unchanged, state hash unchanged | none |
| Non-inline program | `ProgramRef { kind: 'file' }` | `ScriptError` code `program.file-unsupported` | throws (entry 8 loads files) |
| Second blocking thread | a blocking thread already exists (AD-26) | `ScriptError` code `thread.blocking-exists` | throws |
| Inputs offered | a non-empty input log | `consumed: []` — nothing consumes inputs yet; the driver reports the mismatch itself | none (documented, not silently swallowed) |

</frozen-after-approval>

## Code Map

Existing, read and reused (do not change): `packages/core/src/canon/{canon,fnv1a,log,utf8}.ts` — `canon`, `hashState`, `encodeLog`; `packages/core/src/ports/{plain-data,keys,engine,draw,input,audio,requests}.ts` — `PlainData`/`AssertPlainData`, the string-id brand style in `keys.ts`, `Engine`/`StepReport`/`DrawList`/`InputRecord`; `packages/core/src/index.ts` — `export *` for values, `export type *` for ports; `packages/runner-harness/src/{driver,golden,job,vectors}.ts` and `src/double/test-engine.ts` — `runLog`'s eight assertions (empty `requests`/`diagnostics`/`audioCues`, `paused` null, `loading` false, `stepsRun`/`stepAfter`/`consumed`), the `Run`/`StepRecord`/`Golden` formats, the `maxSteps` clamp and the 320×240 double to stay shape-compatible with; `packages/runner-harness/test/surface.test.ts` — the pinned export list (the only place public exports are asserted; core asserts no such list); `eslint.config.js` — the G1.4 bans for `packages/core/src/script/**` (Promise, `queueMicrotask`, generators, `async`, `await`), the G3 `Math` allowlist, the banned globals; `tools/deps/edges.json` — package-level only, so new folders need no change; `packages/core/test/fixtures/ports/good.ts` and `fixtures/plain-data/good.ts` — the stand-in `GameState`/`VmState`/`Thread` types whose comment already says they die when the VM epic defines the AD-7 shapes.

Not to touch: `packages/runner-harness/src/double/test-engine.ts` (still the golden default), `golden/**` (no regeneration), `packages/runner-headless/**` (its `.prg` skip stays), `tools/**`, `eslint.config.js`, `tools/deps/edges.json`, `docs/format-spec.md` (section 9 already states this subset; entry 1 amends it, not entry 2).

New files, all under `packages/core/src/` unless marked harness:

Ports (types only, additive to `ports/index.ts`): `ports/value.ts` — `Value`, `RefId`, `VarScope`; `ports/wait.ts` — `Wait`, `WaitView`, `WaitResult`, `WaitPoll`; `ports/rng.ts` — `RngPort`; `ports/time.ts` — `ClockPort`.

RNG: `rng/xoshiro.ts` — `RngState`, `seedRng`, `nextUint32`, `createRngPort`; `rng/index.ts`.

Time: `time/time.ts` — `TimeState`, `createTimeState`, `tick`, `createClockPort`; `time/index.ts`.

Script (all of it is the G1.4 lint scope): `script/ast.ts` — the minimal Unified AST; `script/lex.ts` — the §9.2 subset tokenizer; `script/parse.ts` — the three statement forms and their expressions; `script/ops.ts` — `StepOp`; `script/lower.ts` — AST → ops; `script/program.ts` — `ProgramRef`, `COMPILER_VERSION`, `Program`, `compileInline`, `compileProgram`; `script/state.ts` — `VmState`, `Thread`, `Frame`, `ThreadKind`, `ThreadStatus`, `createVmState`, `startProgram`; `script/builtins.ts` — `ParamSpec`, `Arg`, `BuiltinSpec`, `BuiltinResult`, `BuiltinCtx`, `PROVISIONAL_BUILTINS`, `createBuiltinLookup`; `script/errors.ts` — `ScriptError` with a `code`; `script/vm.ts` — `ScriptStatus`, `ScriptServices`, `createScriptServices`, `runWaitsPhase`, `pollSleep`, `runThreadsPhase`, `advanceScriptStep`, `STEP_BUDGET`; `script/index.ts`.

Save: `save/sections.ts` — one empty placeholder alias per unowned AD-10 section, each naming its owner and the entry that fills it; `save/state.ts` — `GameState`, `SchemaState`, `SCHEMA_VERSIONS`, `createGameState`; `save/snapshot.ts` — `snapshot`, `restoreGameState`; `save/index.ts`. `core/src/index.ts` gains four additive `export *` lines.

Harness: `src/script-host.ts` — `createScriptHost`, `restoreScriptHost`, `ScriptHost`, `ScriptHostInit`; `src/restore-check.ts` — `checkSnapshotRestore`, `randomSplit`, `SnapshotHost`; `src/index.ts` gains the additive exports.

Tests: `packages/core/test/script-frontend.test.ts`, `script-vm.test.ts`, `script-state.test.ts`, `rng.test.ts`, the two `fixtures/*/good.ts` updates, and `packages/runner-harness/test/script-host.test.ts`, `restore-check.test.ts`, `surface.test.ts` (pinned list).

## Tasks & Acceptance

**Execution:**
- [ ] `_bmad-output/initiative-rpgtoolkit-reawakened/architecture-rpgtoolkit-reawakened/architecture-rpgtoolkit-reawakened.md` — amend AD-8's `Arg = { value, ref?: RefId }` to `Arg = { value: Value, ref: RefId | null }` (AD-14's explicit-absence rule plus epic-1.12), in its own docs-only commit before any code — G7 requires the doc to be right first, and entry 3's later AD-8 rewrite must keep this clause.
- [ ] `packages/core/src/ports/value.ts` — publish `Value = number | string | null` (`null` = "no value"; §9.2's `null` literal lexes to `0`, and no op stores `null`), `RefId` (branded string `"global:name"` / `"local:name"`, names case-folded per §9.2, mirroring the brand style of `ports/keys.ts`), `VarScope = 'global' | 'local'` — AD-8 says the `Value` union lives in `core/ports`.
- [ ] `packages/core/src/ports/wait.ts` — `Wait = { kind: 'sleep'; until: number }` (AD-9 payload is plain data; the union grows one variant per owning epic), `WaitView = { readonly step: number }`, `WaitResult = { value: Value }`, `WaitPoll = (view: WaitView, wait: Wait) => WaitResult | null`.
- [ ] `packages/core/src/ports/rng.ts` and `packages/core/src/ports/time.ts` — `RngPort = { nextUint32(): number }` (AD-12: modules draw only through it) and `ClockPort = { step(): number }` (G3.1's injected clock; AD-2 makes the step counter the clock).
- [ ] `packages/core/src/ports/index.ts` — add `export type * from` for the four new port files — additive, so parallel epic-3 branches merge cleanly.
- [ ] `packages/core/src/rng/xoshiro.ts` (+ `index.ts`) — SplitMix32 expansion of the `u32` seed into four `s0..s3` words with the non-zero guard, xoshiro128** `nextUint32`, `createRngPort(state)` bound to the live `RngState`; 32-bit ops only (`Math.imul`, `>>>`, shifts) so every engine agrees — AD-12.
- [ ] `packages/core/src/time/time.ts` (+ `index.ts`) — `TimeState = { step: number }`, `createTimeState()`, `tick(state)` (the `time` phase action), `createClockPort(state)` — AD-2/AD-10; `secondsToSteps`/`fpsToSteps`/`frameAt` arrive with entry 13's `delay`/`getTickCount`.
- [ ] `packages/core/src/script/ast.ts`, `lex.ts`, `parse.ts`, `ops.ts`, `lower.ts` — the minimal frontend: the IN list of Design Notes only, each OUT construct rejected with a `ScriptError` naming the construct and the entry that adds it; lowers to the ops of Design Notes; every file header cites §9.2/§9.3/§9.5 and ADR 0004 decision 1.
- [ ] `packages/core/src/script/program.ts` — `ProgramRef` exactly as AD-7 writes it, `COMPILER_VERSION`, `Program = { ref, ops }`, `compileInline(text)`, `compileProgram(ref)` (inline only; `kind: 'file'` → `program.file-unsupported`, entry 8) — AD-7 keeps compiled code outside state and rebuilds it on restore.
- [ ] `packages/core/src/script/state.ts` — `VmState = { threads, globals, objects, redirects }`, `Thread = { id, kind, owner, source, target, frames, status, wait }`, `Frame = { program, ip, locals, operands, errorHandler, autoLocal }` with the minimum values of Design Notes, `createVmState()`, `startProgram(state, ref)` assigning `id = max(id) + 1` and refusing a second `blocking` thread — AD-7, AD-26.
- [ ] `packages/core/src/script/builtins.ts` — `ParamSpec`, `Arg`, `BuiltinSpec`, `BuiltinResult` (`{ done, out } | { yield }`), `BuiltinCtx = { rng, clock }`, `PROVISIONAL_BUILTINS` (`end`, `sleep`) and `createBuiltinLookup(specs)` — the AD-8 contract shape unchanged so entry 3 replaces only the assembly, lookup precedence and duplicate/warning rules.
- [ ] `packages/core/src/script/errors.ts` — `ScriptError` (a `code` plus a message; plain fields, no parameter properties) — the VM raises RPGCode errors and `core` throws only for programmer errors.
- [ ] `packages/core/src/script/vm.ts` — `advanceScriptStep` (waits → threads → `time` tick), `runWaitsPhase` (poll every waiting thread in ascending id, wake, push), `pollSleep`, `runThreadsPhase` (arg binding with `ref`, arity check, `out` write-back, op dispatch, `STEP_BUDGET` preemption), `createScriptServices(state, extraBuiltins?)` (rng port, clock port, lookup, small compiled-program memo outside state) — AD-8/AD-9/AD-26; a per-call ctx object is built once, not per call.
- [ ] `packages/core/src/script/index.ts` — re-export the script surface — the harness reaches it through `@tk-reawakened/core` only (AD-22 bans deep paths).
- [ ] `packages/core/src/save/sections.ts`, `state.ts`, `snapshot.ts`, `index.ts` — `GameState` with exactly AD-10's 18 sections (unowned ones `{}` with an owner comment), `SchemaState = { compiler, vm, rng, time }` + `SCHEMA_VERSIONS` (AD-23), `createGameState({ seed })`, `snapshot(state) = canon(state)`, `restoreGameState(json)`; document the schema-bump rule AD-7's check needs.
- [ ] `packages/core/src/index.ts` — four additive `export *` lines for `rng`, `time`, `script`, `save` — the harness seam.
- [ ] `packages/runner-harness/src/script-host.ts` — `createScriptHost({ program, seed, builtins? })` and `restoreScriptHost(snapshot, { builtins? })`, each returning a `ScriptHost` (`Engine` plus `snapshot()`, `stateHash()`, `state()`): `advance` clamps by `maxSteps` exactly as the double does, runs one whole step per step, and returns empty `consumed`/`requests`/`diagnostics`/`audioCues`, `loading: false`, `paused: null`; `drawList` is `{ step, width: 320, height: 240, commands: [] }`; `surfacePixels` is `null`; `setBreakpoints` stores into a private field and touches no state (epic 4 wires the hit) — the ticket's VM-backed test host, deliberately not `createEngine`.
- [ ] `packages/runner-harness/src/restore-check.ts` — `checkSnapshotRestore({ fresh, fromSnapshot }, { steps, split })` advancing step by step, comparing `StepReport.stateHash` at every step after the split and throwing with the first mismatching step named, plus `randomSplit(seed, steps)` drawn through `core/rng` (no `Math.random`) — the shared helper later entries and the corpus job reuse.
- [ ] `packages/runner-harness/src/index.ts` — additive exports for both files.
- [ ] `packages/runner-harness/test/surface.test.ts` — add the new names to the pinned list, keep `createTestEngine` out of it — the deliberate, visible record of the changed public surface.
- [ ] Tests `packages/core/test/{script-frontend,script-vm,script-state,rng}.test.ts` and `packages/runner-harness/test/{script-host,restore-check}.test.ts` — the list in Verification; `node:test` + `node:assert/strict`, `.ts` import suffixes, no skipped cases (the no-skips CI job).
- [ ] `packages/core/test/fixtures/ports/good.ts`, `fixtures/plain-data/good.ts` — replace the stand-in `Thread`/`VmState`/`GameState` with imports of the real AD-7 shapes, keep the `AssertPlainData` assertions and add a mid-yield `GameState` pin — one convention, not two.

**Acceptance Criteria:**
- Given the tracer program of Design Notes, when `runLog(host, { schema: 1, steps: 3, log: [] }, 1, createNullAudio())` runs, then it returns three records and afterwards `globals.greeting` is `"hi"`, `globals.count` is `3` and thread 1 is `finished` — the program ran to completion across the yield.
- Given the host advanced to the step after which the snapshot is taken (mid-yield), when that snapshot is restored into a fresh host and both runs finish, then the final `stateHash` is identical, and so is every per-step hash after the split.
- Given `sleep(n)` at step `s`, when the step machine runs and the state is snapshotted, then the thread is `waiting` with `wait = { kind: 'sleep', until: s + n }` and `ip` already past the call, and it resumes at the first step where `time.step >= until`.
- Given a fixture built-in with a `byRef` parameter, when it returns `out`, then the caller's variable is written back and the change is inside `hashState`.
- Given a fixed seed, when the RNG is drawn twice from it, then both sequences match the pinned vector, the expanded state is never all-zero, and an `RngState` restored from a snapshot continues the same sequence.
- Given the unchanged golden fixtures, when `pnpm golden` runs, then it stays green with no golden file edited.
- Given the whole change, when `pnpm typecheck`, `pnpm lint`, `pnpm test`, `pnpm graph`, `pnpm provenance` and `pnpm licence` run, then every one passes.

## Implementation Notes

Empty at planning time (route: full).

## Plan Change Log

Empty until the first bad_plan loopback.

## Review Triage Log

Empty until the first review pass.

## Design Notes

**The tracer program** (the golden example; one statement per line, §9.2/§9.5):

```
greeting = "hi"
count = 2
sleep(count)
count = 3
end()
```

Its step trace, with `advance(1, [])` = one whole step (`waits → threads → time`) and `time.step` starting at 0: step 0 runs `push "hi"`, `store greeting`, `pop`, `push 2`, `store count`, `pop`, `load count`, `call sleep 1` → yields, `ip` past the call, `wait = { kind: 'sleep', until: 0 + 2 }`; step 1 polls and stays waiting; step 2 wakes it (the polled `null` is pushed, then popped), stores `count = 3`, calls `end` and hits the `return`, so the thread is `finished` at `time.step = 3`. The mid-run snapshot is therefore taken after step 0 or 1, and the fresh host runs the remaining steps to the same hash.

**Step IR** (ADR 0004 decision 1's linear array; entry 5 extends the union):

```ts
export type StepOp =
  | { op: "push"; value: Value }                 // literal; §9.2 true/false/null lex to 1/0/0
  | { op: "load"; name: string }                 // variable read (locals, then globals); unset → 0
  | { op: "store"; name: string }                // pop and assign (write-back is entry 3's `out`)
  | { op: "call"; name: string; argc: number }    // pop argc args, dispatch, push the result
  | { op: "pop" }                                // discard a statement-position value
  | { op: "return" };                            // end the program; the lowering always emits it last
```

The kinds map to ADR 0004 decision 1's names (`push` ≙ `OP_PUSH`, `call` ≙ `OP_CALL`, `return` ≙ `OP_RETURN`); `load`/`store`/`pop` are this entry's additions for variable access and for discarding a statement-position value, and `jump`/`yield` are deliberately absent: `OP_JUMP` needs control flow (entry 5) and a blocking call *is* the yield (AD-8 makes yielding a call outcome, not an opcode) — see Q11.

**The frontend subset.** IN: identifiers `[A-Za-z0-9_]` with a trailing `!`/`$` sigil stripped and ASCII case-folded (§9.2 — `N` and `n` are one variable); decimal and fractional numbers; `"strings"` with no escapes; `(`, `)`, `,`, `=`; a statement ends at a newline or `;`; `//` comments; a leading `#` on a line ignored; `true`/`false`/`null` as the literals 1/0/0; a bare identifier alone on a line as a zero-argument call (§9.5's legacy `end` → `end()`); assignment to a variable; a call with literal or variable arguments. OUT, each rejected with a `ScriptError` naming the construct and its entry: every other operator (§9.4, entry 5), `if`/`while`/`until`/`for`/`switch`/`function`/`method`/`class`/`label`/`return` (entry 5/6), `local(x) = v` and `global(x) = v` (FUN-2, entry 5), arrays, indexes and maps (entry 5/12), `_` line continuation and `/* */` (entry 5), `#include`/`include()`/implicit includes/`redirect` (entry 8), the §9.9 legacy forms and TK2 (entry 15). The tracer's program uses only the IN list, so entry 2 does not depend on entry 1's rulings (the ticket's `after` is `1.3`, `1.8`, `1.9`).

**State shapes (AD-7's minimum, with the values entry 2 fixes).** `VmState = { threads: Thread[]; globals: { [name: string]: Value }; objects: never[]; redirects: Array<[string, string]> }` — `objects` is entry 6's and `redirects` entry 8's, both empty now. `Thread = { id: number; kind: ThreadKind; owner: ThreadOwner; source: string | null; target: string | null; frames: Frame[]; status: ThreadStatus; wait: Wait | null }` with `ThreadKind = 'blocking' | 'board' | 'persistent' | 'item'` (AD-26), `ThreadOwner = 'script' | 'world'` (AD-26), `ThreadStatus = 'ready' | 'waiting' | 'finished'`. `Frame = { program: ProgramRef; ip: number; locals: { [name: string]: Value }; operands: Value[]; errorHandler: null; autoLocal: boolean }` — `errorHandler` is entry 7's and is `null` until then. `GameState` has exactly AD-10's 18 sections; every section entry 2 does not own is `Record<string, never>` (the empty-object placeholder), with a comment naming its owner module and the entry that replaces the alias. `ScriptStatus = 'running' | 'waiting' | 'finished'` is what `advanceScriptStep` returns; it is not `Thread.status`.

**Built-in seam (provisional, AD-8's shape):**

```ts
export type ParamSpec = { readonly name: string; readonly optional: boolean; readonly byRef: boolean; readonly variadic: boolean };
export type Arg = { readonly value: Value; readonly ref: RefId | null };
export type BuiltinResult = { readonly done: Value; readonly out: readonly (readonly [number, Value])[] } | { readonly yield: Wait };
export type BuiltinCtx = { readonly rng: RngPort; readonly clock: ClockPort };
export type BuiltinSpec = { readonly name: string; readonly aliases: readonly string[]; readonly params: readonly ParamSpec[]; readonly call: (ctx: BuiltinCtx, args: readonly Arg[]) => BuiltinResult };
```

`PROVISIONAL_BUILTINS` is exactly `end` (no params, `done: null`) and `sleep` (one required step-count param, yields `{ kind: 'sleep', until: ctx.clock.step() + n }`). `end` returning normally is deliberate: it proves registry resolution and the dispatch path, while `end`/`done`/`stop`'s real unwinding (FUN-7) is entry 13's, and the AD-8 assembly, aliases, duplicates, warnings and precedence are entry 3's — Q1. `resume?` is not implemented (no resuming built-in exists yet; waking a yielded call is generic).

The `sleep` payload is the absolute `until` step, not a relative duration: the poll is then `view.step >= wait.until` with nothing else in state, whereas a duration would need the step the wait started at, which is a new `Thread` field and an AD-7 amendment.

**Snapshot semantics.** `snapshot(state) = canon(state)` and `restoreGameState(json) = JSON.parse` plus a compiler-version and section-presence check — one canonical form for snapshot, save, hash and restore (AD-10/AD-11), which also makes the plain-data discipline enforceable (`canon` throws on `undefined`, `NaN`, a sparse array or a class instance). Compiled programs are rebuilt from `ProgramRef` on restore (AD-7), so a fresh host recompiles lazily through its own `ProgramLookup`; the registry is code, not state, so `restoreScriptHost` takes the same `builtins` list.

**The host is not the engine.** `ScriptHost.advance` loops `advanceScriptStep(state, services, STEP_BUDGET)` once per requested step and reports the state hash; it holds no phase list, no game logic and no world. Epic 4's `createEngine(init)` will own `RunConfig` (including `seed`), the AD-26 phase list and the loop, and call `runWaitsPhase`/`runThreadsPhase` in its own order with the registry from entry 3 — Q6.

## Open Questions

Recommendations are what the implementer adopts if the plan is approved as written; each is a human ruling at this ticket's plan checkpoint.

1. **`end()` unwinding.** Options: (a) `end` is an ordinary registered call that returns `null` and the program finishes at its emitted `return` — the tracer proves the registry and the dispatch path, and entry 13 owns FUN-7 unwinding; (b) invent a termination channel now (`{ end: true }` or an effect record) so `end()` can stop mid-program. **Recommendation: (a)** — (b) invents contract surface that entry 3 (assembly, functional command contract, effect records) and entry 13 own, and ADR 0004 decision 2 forbids a backdoor for a specific name. Accepted cost: the tracer's acceptance reads "ran to completion", not "`end` stopped the program early"; if the human prefers (b), say which field and entry 3 must then keep it.
2. **Where the state tree lives:** `core/save` (which AD-10 makes the owner of `schema` and of `SaveState`-is-`GameState`) or a neutral `core/state` composer. **Recommendation: `core/save`** — the structural seed in the spine lists `save/` and no `state/`, and `schema` plus the snapshot/save/hash/restore functions are the save module's per the table. The composer necessarily imports each owner's section type, which AD-10's future dependency-cruiser rule ("only `core/<section>/**` imports its mutable `<Section>State`") must exempt; record that exemption when the rule lands.
3. **Placeholder for unowned sections:** one uniform `Record<string, never>` alias per section (empty until its owner lands) versus leaving the section out of `GameState` until its owner adds it. **Recommendation: the placeholder alias** — AD-10 says `GameState` has exactly those sections, entry 2's job is the shell that entries 6/7/9/10 fill and 11 reconciles, and an empty record is plain data that hashes, so the section set is visible from day one and a wrong slot cannot creep in silently.
4. **Snapshots as text:** `canon` string versus a structured clone object. **Recommendation: the `canon` string** — AD-10/AD-11 say one canonical form for snapshot, save, hash and restore, `canon` rejects anything outside `PlainData`, and equality is then string equality. Bounds, deep validation and the mismatch-versus-restart policy stay entry 11's.
5. **The shared restore/hash helper's home:** `runner-harness` versus a test-only module in `core`. **Recommendation: `runner-harness`** — G2 forbids `core` importing a runner, so a core test-only copy could not be shared with the corpus/golden consumer, and the helper plus its host is the harness's job (its verifies are named in entries 6/9/10/11 and 17). Later entries whose checks live in `core/test/` use `snapshot`/`restoreGameState`/`hashState` directly, which are the same primitives.
6. **Who owns the script-phase step and the budget constant:** `core/script` now versus waiting for epic 4's `core/engine` (AD-26's phase list). **Recommendation: `core/script/step.ts` exports `advanceScriptStep` (waits → threads → tick) and `STEP_BUDGET`**, epic 4 owns the phase *list* and the loop and calls the two phase handlers, and entry 9 tunes the budget — the tracer needs a runnable step now, and this keeps the host free of sequencing so epic 4 supersedes it rather than rewriting it.
7. **`RefId` shape:** a branded string (`"global:name"`), a `{ scope, name }` object, or a numeric index into a per-frame lvalue table. **Recommendation: the branded string** — plain data, no extra `Frame` field (so no AD-7 amendment), self-describing in a snapshot, and string ids are already house style (the `"source"`/`"target"` handles of §9.10, `AssetKey`). The lvalue table would need a new state slot and a schema bump.
8. **The provisional `sleep` name and unit:** `sleep(steps)` in whole fixed steps versus a legacy name with seconds. **Recommendation: `sleep(steps)`** — it matches the AD-9 kind it yields, it keeps seconds→steps conversion out of entry 2 (AD-2 says `core/time` alone owns `secondsToSteps`, and entry 13's `delay`/entry 9's `threadSleep` are the legacy spellings), and the ticket names `sleep` explicitly. Also note the provisional piece is throwaway in the sense that entries 3/9/13 replace its callers, not its contract.
9. **Public surface:** exporting the host and the helper from `runner-harness/src/index.ts` (and updating the pinned surface test) versus keeping them internal-only. **Recommendation: export** — the ticket's verify says the program is run "through a VM-backed test host in `runner-harness`", entry 4 supersedes it from another package, and later entries and the corpus job reuse `checkSnapshotRestore`; `createTestEngine` stays unexported.
10. **Plan size:** the workflow's target is 900–1600 tokens and this plan is larger, because the assignment for this ticket asks for the file list, the type shapes, the exact test list, the open questions and the risk list in one plan. **Recommendation: keep the full plan** — the tracer is one user-facing goal (nothing here can be merged as an independent shippable slice without ceasing to prove the seam), and the detail is what stops the implementer re-deriving contracts that entries 3–11 must keep.

11. **Does the IR need an explicit `yield` opcode?** ADR 0004 decision 1 lists `OP_YIELD` in the Step IR, while AD-8 and AD-9 make yielding the result of a built-in call. Options: (a) the union stays as Design Notes writes it and a blocking call is the only yield — nothing in the language emits a bare yield, so an `OP_YIELD` instruction would be dead code; (b) add `{ op: "yield" }` now so the union matches ADR 0004's list literally, and let entry 5/9 decide what lowers to it (for example the program-level yields `run` and `multiRun` need). **Recommendation: (a) for entry 2, and record the reconciliation as a doc fix** — the entry that first needs a program-level yield (entry 9's `multiRun`/`run`, or entry 5) adds the opcode and amends ADR 0004 / AD-8 in the same change; adding a dead opcode now would be an untested instruction in a state machine whose whole point is testability. If the human prefers (b), say so and the union gains `yield` with a lower-to-nowhere test.

## Verification

Commands (in the worktree, after `pnpm install`):
- `pnpm typecheck` — `tsc -b` plus every package's test typecheck; expected: no errors, including `core`'s `AssertPlainData<GameState>` assertions.
- `pnpm lint` — `node tools/check-core-deps.mjs && eslint .`; expected: clean; the G1.4 bans apply to every new `core/src/script/**` file with no suppression.
- `pnpm test` — `tsc -b && node --test "packages/*/test/*.test.ts"`; expected: all tests pass, none skipped, including the two updated fixtures.
- `pnpm graph` — expected: unchanged edge list, so no generated-rule or diagram change.
- `pnpm golden` — expected: green against the unchanged `golden/test-double/{run.json,golden.json}` and `golden/hash-vectors.json` (the double is still the default engine).
- `pnpm provenance` — expected: clean; no legacy identifier appears in any new or changed `.ts`.
- `pnpm licence` — expected: clean; no dependency was added.

The acceptance tests themselves, by name (the "exact test list"): `packages/runner-harness/test/script-host.test.ts` — "runs the tracer program to completion across the sleep yield through runLog", "the mid-run snapshot restores into a fresh host and finishes with the identical state hash", "every split point from 0 to 3 restores to the identical hash", "batch sizes 1, 2 and 3 give identical per-step state and draw hashes", "the host satisfies the Engine contract with empty requests, diagnostics and cues", "drawList is a pure function of state and has no commands", "surfacePixels is null and setBreakpoints changes no state", "a fixture built-in drawing through ctx.rng leaves the draw in state and restores identically"; `packages/runner-harness/test/restore-check.test.ts` — "randomSplit is deterministic and inside 0..steps", "a diverging restored run throws naming the first mismatching step"; `packages/runner-harness/test/surface.test.ts` — "runner-harness public surface matches the pinned export list with no double"; `packages/core/test/script-frontend.test.ts` — "tokenizes case-folded identifiers with sigils stripped", "rejects every construct the subset excludes naming its entry", "lowers the tracer program to the exact op array"; `packages/core/test/script-vm.test.ts` — "stores and loads a global and reads an unset name as 0", "binds a variable argument with its RefId and a literal without", "writes a by-ref out back into the caller's variable inside the hash", "throws unknown.command and arity.mismatch", "sleep leaves the thread waiting with ip past the call", "the waits phase wakes exactly at until and polls in ascending id order", "the budget preempts a long program with ip advanced by exactly the budget", "a second blocking thread is refused"; `packages/core/test/script-state.test.ts` — "GameState is PlainData and has exactly the AD-10 sections", "canon round-trips through restore for a mid-yield state", "restore rejects a different compiler version and a missing section"; `packages/core/test/rng.test.ts` — "SplitMix32 expands a fixed seed to the frozen words and never to all zeros", "xoshiro128** matches the pinned vector and the reference oracle over 1000 draws", "two ports from one seed agree and a restored RngState continues the sequence".

## Risks

1. **Provisional code that later entries replace** (the frontend subset, the registry, `sleep`, `end`'s result). Mitigation: each provisional piece sits in one file with a header naming the replacing entry (3, 5, 9, 13), nothing reaches into its internals, and the AD-8/AD-9 contract shapes are matched now so entry 3 replaces assembly, not contract.
2. **Entry 1's late rulings could move the frontend.** Entry 2 does not wait on entry 1, so the IN/OUT table avoids every row the discovery marks unsettled (LEX-2/9/10, STX-1..7, FUN-2/4, SEM-5, EXP-4); if entry 1 rules differently, entry 5 (which owns the grammar) re-derives the frontend from the amended §9.
3. **State-shape churn.** Entries 6/7/9/10 widen `VmState`/`Frame` and entry 11 reconciles; AD-7's check requires a schema or compiler bump plus a previous-version fixture. Mitigation: entry 2 seeds `schema`/`SCHEMA_VERSIONS` and documents the bump rule in `save/state.ts`.
4. **AD-10's dependency rule could flag the composer** (`core/save` importing every section type) and the VM's read of the step counter. Mitigation: the composer is the documented single exemption (Q2), and the VM sees time only through `ClockPort`/`WaitView.step` and mutates it only through `core/time`'s `tick`.
5. **The host could grow into a second engine.** Mitigation: no phase list, no game logic, no world in the host; it calls `advanceScriptStep` and reads hashes, and epic 4 supersedes it by calling the same registry and phase handlers.
6. **Determinism traps in the new code:** `Math.imul`/`>>>` only in the RNG, integer step maths only, no `Date`/`performance`, and `canon` throws on `-0`, `NaN`, sparse arrays or `undefined`, so the plain-data assertions must run at build time (the fixture update covers it).
7. **Lint/provenance traps:** no `enum` or parameter properties (`erasableSyntaxOnly`), `import type` everywhere (`verbatimModuleSyntax`), no legacy identifiers in fixtures or code (the provenance scan covers `.ts` and `.json`; `_bmad-output/` is out of scope but the code is not), no `Promise`/`async`/generator/`await` under `core/src/script/**`.
8. **The golden job must stay green**, which means no `golden/**` edit and no emission of `requests`, `diagnostics`, a cue or `paused` from the host — `runLog` throws on each of those, and on a `stepsRun`/`stepAfter`/`consumed` mismatch.
9. **Test-harness conventions:** `node:test` with `node --test "packages/*/test/*.test.ts"`, `.ts` import suffixes and no skipped tests (the no-skips job); `noUncheckedIndexedAccess` and `exactOptionalPropertyTypes` mean every new state/port type has explicit `| null` fields and every indexed access is checked.
10. **Scope creep around the seam:** `runner-headless`'s `.prg` skip, the dump corpus and the golden wiring belong to entry 17/19 — leave them; the plan's only public-surface change outside `core` is the two new harness exports and the pinned-list update.
