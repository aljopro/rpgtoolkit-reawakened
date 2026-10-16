---
title: 'Effect records and generic command stubs: every catalogue name responds'
type: 'feature'
ticket: 21
created: '2026-10-15'
status: in-progress
baseline_revision: '43189ac35038e110f4265fd4e8e93342b575dedf'
route: 'full'
route_source: 'auto'
risk: 'medium'
context:
  - '{project-root}/docs/guardrails.md'
  - '{project-root}/docs/adr/0004-script-ast-step-ir-and-plugins.md'
  - '{project-root}/_bmad-output/initiative-rpgtoolkit-reawakened/epic-rpgcode-vm/epic-rpgcode-vm.md'
  - '{project-root}/_bmad-output/initiative-rpgtoolkit-reawakened/epic-rpgcode-vm/discovery/command-effect-catalogue.md'
  - '{project-root}/_bmad-output/initiative-rpgtoolkit-reawakened/epic-rpgcode-vm/discovery/command-effect-catalogue.json'
  - '{project-root}/docs/spec/engine/rpgcode-functions.md'
  - '{project-root}/docs/spec/engine/rpgcode-language.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless the human renegotiates">

## Intent

**Problem:** Ticket 3.3 (`PluginDefinition` and registry assembly) instituted an interim `services.effects: (effect: CommandEffect) => void` sink on `ScriptServices` (decision U1; `packages/core/src/script/plugin.ts:59`, `packages/core/src/script/vm.ts:53,82,228`). The sink is an external function rather than engine state, so reported effects are not stamped with simulation time or thread identity, cannot be saved, restored, or audited across ticks, and vanish in headless runs. Furthermore, only the tracer's two commands (`end` and `sleep`, `packages/core/src/script/builtins.ts:58-83`) exist in the built-in `core` pack: executing real game scripts (such as `start.prg` or `system.prg`) or TK2 programs crashes immediately with `unknown.command` for any of the ~280 RPGCode built-in names (`docs/spec/engine/rpgcode-functions.md:6`). The domain epics (board-rendering, movement-triggers, audio-synth, battle, menu-party-save) are not implemented yet, but scripts need to execute without failing, write by-reference outputs back to variables, and leave an inspectable reconciliation log in state.

**Approach:**
1. Define the plain-data `EffectRecord` in `packages/core/src/script/effects.ts` with exactly the 11 fields `{ seq, tick, thread, name, kind, args, out, result, patch, wait, request }` (`tickets.toml:130`, `discovery/command-effect-catalogue.md:559-588`), alongside `EffectPatch = { section, path, op, value }` and `EffectKind`. Prove plain-data at build time via `AssertPlainData<EffectRecord>`.
2. Expand `VmState` in `packages/core/src/script/state.ts:56-66` to include `effects: EffectRecord[]` and `effectSeq: number`. Bump `SCHEMA_VERSIONS.vm` from 1 to 2 in `packages/core/src/save/state.ts:44-55` under the AD-23 / AD-7 schema-bump rule, and add a v1 fixture save under `packages/core/test/fixtures/save/v1-vm.json` with a restore test.
3. Clean cutover for the temporary U1 sink: remove `services.effects` from `ScriptServices` and `createScriptServices` (`packages/core/src/script/vm.ts:53,82,101`). During VM dispatch (`packages/core/src/script/vm.ts:228`), drain the command's reported `CommandEffect`s, stamp each with `{ seq: ++vm.effectSeq, tick: services.view.clock.tick(), thread: thread.id, name: op.name, ... }`, append to `vm.effects`, and enforce the ring cap `EFFECT_LOG_CAP = 256`. Export `drainEffects(vm, section?: SectionKey)` so section owners and phase drivers can drain records per tick.
4. Build `tools/catalogue/generate.mjs` (precedent: `tools/fixtures/author/generate.mjs`) to read `_bmad-output/.../discovery/command-effect-catalogue.json`, filter the 176 stub-safe commands (`effectKind ∈ {pure, state-write, draw-audio-cue}`; 170 from §9.11 plus 6 added by entry 27's docs/spec migration), parse their `params` notations into `ParamSpec[]` (`packages/core/src/script/builtins.ts:30`), derive defaults (`0` for `pure` getters per §9.16 unset-read rules, `null` for `state-write` and `draw-audio-cue`), and emit the committed TS file `packages/core/src/script/catalogue-stubs.ts` exporting `CATALOGUE_STUBS_PLUGIN: PluginDefinition`. Provide `--check` in the tool and wire `pnpm catalogue:check` into CI.
5. Register `CATALOGUE_STUBS_PLUGIN` in `createScriptServices` (`packages/core/src/script/vm.ts:74`) as a default layer above `CORE_PLUGIN` and below caller plugins (`[CORE_PLUGIN, CATALOGUE_STUBS_PLUGIN, ...plugins]`), so every catalogue stub responds out of the box until an owner epic overrides it.
6. Provide comprehensive test suite `packages/core/test/script-catalogue.test.ts` verifying that all 176 stub names resolve, check arity, write by-reference outputs back to variables, record side effects in `vm.effects`, restore identically across snapshots with stable `hashState`, and enforce the ring cap.

## Boundaries & Constraints

**Always:**
- Keep `EffectRecord`, `EffectPatch` and `VmState` strictly `PlainData` (G1 rule 2, AD-7, AD-10); assert via `AssertPlainData<VmState>`. No `undefined`, no functions, no class instances, no `-0` (`ports/plain-data.ts:25-35`, AD-11).
- Bump `SCHEMA_VERSIONS.vm` from 1 to 2 in `packages/core/src/save/state.ts:51`; commit a v1 fixture save `packages/core/test/fixtures/save/v1-vm.json` and a restore test asserting v1 saves restore seamlessly into v2 `VmState` with `effects: []` and `effectSeq: 0` (AD-23, AD-7 schema-bump rule).
- Clean cutover (no shims): completely delete `services.effects` from `ScriptServices` and `createScriptServices` in `packages/core/src/script/vm.ts`. Migrate existing tests in `packages/core/test/script-registry.test.ts:270-285` to assert directly on `state.vm.effects`.
- Stamped `seq` is strictly monotonic and never reused across calls (`discovery/command-effect-catalogue.md:560,590`).
- Stamp `tick` using `services.view.clock.tick()` from the injected `ClockPort` (G3, AD-2).
- The stub registry must never collide with or override names defined in `CORE_PLUGIN` (`end`, `sleep`; `builtins.ts:58-83`).
- Clean-room discipline (G7): implement only from `docs/` and discovery JSON. Never open, copy, or translate `../rpgtoolkit` (legacy GPL-2 source).
- The golden job (`pnpm golden`) must pass without `--record` and with `git diff golden/` empty (G5).

**Never:**
- Never stub commands whose kind is `wait`, `request`, `spawn-thread`, `flow-control`, or `mixed` (ticket 3.22 / entries 9, 13, 16 own those 106 names; `command-effect-catalogue.md:537,599`).
- Never allow a command to mutate `view`, `vm`, or any `GameState` section directly (AD-8, AD-10, G1). Stubs only return `CommandResult`.
- Never use `Math.random`, `Date.now`, or timers in `core` (G2, G3, `eslint.config.js:28-80`).
- Never introduce `undefined` or omitted keys in `EffectRecord` (AD-11, AD-14: absent values must be explicit `null`).
- Never modify `packages/core/src/ports/engine.ts` or add `createEngine` (epic 4 owns it; `tickets.toml:39,78`).
- Never edit files in the main checkout; work exclusively in `/Users/jensen/projects/rpgtoolkit-reawakened/.worktrees/plans-batch-3`.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Pure getter without byRef | Script calls `getColor()` with no args | Returns numeric default `0`; stamps 1 record in `vm.effects`: `{ seq: 1, tick: T, thread: 1, name: "getcolor", kind: "pure", args: [], out: {}, result: 0, patch: null, wait: null, request: null }` | Arity violation throws `arity.mismatch` `ScriptError` |
| Pure getter with byRef output | Script calls `getColor(r, g, b)` with 3 variables | Returns `0`; writes `0` into variables `r`, `g`, `b` in caller frame; stamps 1 record with `out: {"0": 0, "1": 0, "2": 0}`, `patch: null` | Non-variable argument for byRef parameter throws `builtin.out-not-by-ref` `ScriptError` |
| Single-section state write | Script calls `mwin("hello")` | Returns `null`; stamps 1 record with `kind: "state-write"`, `result: null`, `args: ["hello"]`, `patch: { section: "ui", path: [], op: "merge", value: null }` | Wrong arity throws `arity.mismatch` |
| Multi-section write | Script calls `destroyPlayer(0)` (`sectionsWrite: ["sprites", "party"]`) | Returns `null`; stamps 2 records in `vm.effects` in catalogue section order: seq 1 for `sprites`, seq 2 for `party`, each with `patch: { section: <sec>, path: [], op: "merge", value: null }` | Wrong arity throws `arity.mismatch` |
| Bounded log overflow | 300 stub calls executed when `EFFECT_LOG_CAP = 256` | `vm.effects.length === 256`; the oldest 44 records are evicted; surviving records have `seq: 45..300`; `vm.effectSeq === 300` | No error; eviction is deterministic and maintains monotonic ordering |
| Optional param omitted | Script calls `drawEnemy("orc", 10, 20)` for `drawEnemy(file, x, y [, cnv])` | Arity check succeeds (3 required, 4 max); 4th arg is absent; `args: ["orc", 10, 20]`; `out: {}` | If < 3 args provided, throws `arity.mismatch` |
| Variadic command stub | Script calls `setConstants(1, "a", 3)` (`params: "..."`) | Arity check succeeds (0 required, Infinity max); `args: [1, "a", 3]`; 1 record stamped with all passed arguments | None |
| Obsolete command stub | Script calls `underarrow()` or `itemwalkspeed()` (`docs/spec/engine/rpgcode-functions.md:14`) | Raises catchable `builtin.obsolete` `ScriptError`; statement is skipped; no record is appended to `vm.effects` | Handled by script error handler if present |
| Snapshot & restore with effects | Take snapshot after 5 stub calls (`vm.effects.length === 5`, `effectSeq: 5`), restore into fresh state, advance 1 tick calling 1 stub | Restored state has 5 records and `effectSeq: 5`; subsequent call stamps `seq: 6`; state hash matches a run that was not interrupted | Corrupt JSON throws `restore.shape` |
| Restore v1 save fixture | Restore v1 snapshot (`schema.vm === 1`, missing `effects` and `effectSeq`) | Migration populates `effects: []` and `effectSeq: 0`, updates `schema.vm` to 2; restored state passes validation | Mismatched compiler throws `restore.compiler-mismatch` |
| Section drain per tick | Call `drainEffects(state.vm, "ui")` on state containing 3 `ui` and 2 `sprites` records | Returns the 3 `ui` records; removes them from `state.vm.effects`; 2 `sprites` records remain; `state.vm.effectSeq` unchanged | If section not found, returns `[]` without modifying state |
| Command override by caller plugin | Custom plugin registered with `mwin` replacement | Custom plugin's command executes instead of the stub; assembly emits single `command.overridden` warning | Handled by ticket 3.3 registry assembly |

</frozen-after-approval>

## Code Map

- `packages/core/src/script/effects.ts` (NEW) — Core effect record types and runtime helpers:
  - `EffectKind = "pure" | "state-write" | "request" | "wait" | "spawn-thread" | "flow-control" | "draw-audio-cue" | "mixed"` (`command-effect-catalogue.md:17-27`)
  - `EffectPatchOp = "set" | "append" | "remove" | "add" | "merge"` (`command-effect-catalogue.md:580-588`)
  - `EffectPatch = { readonly section: SectionKey; readonly path: readonly string[]; readonly op: EffectPatchOp; readonly value: PlainData }`
  - `EffectRecord = { readonly seq: number; readonly tick: number; readonly thread: number; readonly name: string; readonly kind: EffectKind; readonly args: readonly PlainData[]; readonly out: { readonly [index: string]: PlainData }; readonly result: PlainData; readonly patch: EffectPatch | null; readonly wait: Wait | null; readonly request: CommandRequest | null }` (`tickets.toml:130`)
  - `AssertPlainData<EffectRecord>` compile-time check
  - `EFFECT_LOG_CAP = 256` constant
  - `recordEffect(vm: VmState, record: Omit<EffectRecord, "seq">): EffectRecord` — stamps `seq: ++vm.effectSeq`, appends to `vm.effects`, evicts oldest if over `EFFECT_LOG_CAP`.
  - `drainEffects(vm: VmState, section?: SectionKey): EffectRecord[]` — extracts and removes matching records in-place, returning them.
- `packages/core/src/script/state.ts:56-74` —
  - `VmState` adds `effects: EffectRecord[]` and `effectSeq: number`.
  - `createVmState()` initializes `effects: []` and `effectSeq: 0`.
  - `AssertPlainData<VmState>` compile-time check.
- `packages/core/src/save/state.ts:44-55` —
  - `SCHEMA_VERSIONS`: bump `vm: 1` to `vm: 2` (`AD-23`, `AD-7`).
- `packages/core/src/save/snapshot.ts:31-62` —
  - `restoreGameState()`: support migrating v1 saves (`effects: []`, `effectSeq: 0`, `schema.vm = 2`).
- `packages/core/src/script/plugin.ts:59-70, 87-95` —
  - Widen `CommandEffect` to `{ readonly kind: EffectKind; readonly section?: SectionKey; readonly patch?: EffectPatch | null; readonly args?: readonly PlainData[] }`.
- `packages/core/src/script/vm.ts` —
  - `:53`: remove `readonly effects: (effect: CommandEffect) => void` from `ScriptServices`.
  - `:74-84, 101`: remove `effects` argument and field from `createScriptServices`.
  - `:228`: replace `services.effects(effect)` with VM stamping and storing: iterate `result.effects ?? []` (or synthetic effect for pure stubs), call `recordEffect(vm, ...)`.
  - Layer `CATALOGUE_STUBS_PLUGIN` in `createScriptServices` between `CORE_PLUGIN` and caller plugins.
- `packages/core/src/script/catalogue-stubs.ts` (NEW, generated by tool) —
  - Exports `CATALOGUE_STUBS_PLUGIN: PluginDefinition` containing all 176 stub `BuiltinSpec` objects.
- `packages/core/src/script/index.ts:35-58` —
  - Re-export `EffectRecord`, `EffectPatch`, `EffectKind`, `EFFECT_LOG_CAP`, `drainEffects` from `./effects.ts`, and `CATALOGUE_STUBS_PLUGIN` from `./catalogue-stubs.ts`.
- `tools/catalogue/generate.mjs` (NEW) —
  - CLI script reading `_bmad-output/.../discovery/command-effect-catalogue.json`.
  - Parses `params` notations into `ParamSpec[]`.
  - Generates `packages/core/src/script/catalogue-stubs.ts`.
  - Supports `--check` flag for CI validation (exits 1 if output differs from disk).
- `tools/catalogue/test/generate.test.mjs` (NEW) —
  - Node test suite verifying the parameter notation parser against all 88 distinct catalogue param strings.
- `package.json` —
  - Add `"catalogue:generate": "node tools/catalogue/generate.mjs"`.
  - Add `"catalogue:check": "node tools/catalogue/generate.mjs --check"`.
  - Add `"catalogue:test": "node --test tools/catalogue/test/generate.test.mjs"`.
- `.github/workflows/ci.yml:41-45` —
  - Add `pnpm catalogue:test` and `pnpm catalogue:check` to the `unit` CI job.
- `packages/core/test/script-catalogue.test.ts` (NEW) —
  - Test resolving every one of the 176 stub names.
  - Test calling each with valid args and verifying effect record shape and fields.
  - Test by-reference output write-back for all 68 byRef stub commands.
  - Test snapshot and restore state hash stability across calls.
  - Test `EFFECT_LOG_CAP` ring eviction (300 calls).
  - Test `drainEffects` filtering by section.
  - Test obsolete commands (`underarrow`, `itemwalkspeed`) raising `builtin.obsolete`.
- `packages/core/test/fixtures/save/v1-vm.json` (NEW) —
  - Canonical snapshot of a GameState with `schema.vm === 1` and without `effects` or `effectSeq`.
- `packages/core/test/save-migration.test.ts` (NEW) —
  - Test restoring `v1-vm.json` produces valid v2 `GameState` with `effects: []`, `effectSeq: 0`, and `schema.vm === 2`.
- `packages/core/test/script-registry.test.ts:270-285` —
  - Migrate U1 test: remove 4th argument to `createScriptServices`, assert on `state.vm.effects`.

## Tasks & Acceptance

**Execution:**
- [ ] Define effect record contracts in `packages/core/src/script/effects.ts`: `EffectRecord`, `EffectPatch`, `EffectKind`, `EFFECT_LOG_CAP = 256`, `recordEffect`, and `drainEffects`. Prove plain-data with `AssertPlainData`.
- [ ] Update `VmState` in `packages/core/src/script/state.ts:56-74` with `effects: EffectRecord[]` and `effectSeq: number`. Initialize in `createVmState()`.
- [ ] Bump `SCHEMA_VERSIONS.vm` to `2` in `packages/core/src/save/state.ts:51`. Create fixture `packages/core/test/fixtures/save/v1-vm.json` and migration logic in `packages/core/src/save/snapshot.ts` with test in `packages/core/test/save-migration.test.ts`.
- [ ] Clean cutover of U1 sink: remove `services.effects` from `ScriptServices` and `createScriptServices` in `packages/core/src/script/vm.ts`. Update `runThread` call dispatch in `vm.ts:228` to stamp and record effects in `state.vm`.
- [ ] Migrate existing tests: update `packages/core/test/script-registry.test.ts:270-285` to inspect `state.vm.effects`.
- [ ] Implement `tools/catalogue/generate.mjs` and `tools/catalogue/test/generate.test.mjs`: parse the 88 catalogue param notations, filter the 176 stub-safe commands, and generate `packages/core/src/script/catalogue-stubs.ts`.
- [ ] Wire `CATALOGUE_STUBS_PLUGIN` into `packages/core/src/script/vm.ts:74` as the default intermediate layer above `CORE_PLUGIN`.
- [ ] Add npm scripts in `package.json` (`catalogue:generate`, `catalogue:check`, `catalogue:test`) and wire into `.github/workflows/ci.yml`.
- [ ] Author `packages/core/test/script-catalogue.test.ts` to test all 176 stub names, arity validation, byRef write-backs, record stamping, snapshot/restore hash stability, and ring-cap eviction.
- [ ] Run complete CI validation: `pnpm typecheck`, `pnpm test`, `pnpm test:strict`, `pnpm lint`, `pnpm graph`, `pnpm licence`, `pnpm provenance`, `pnpm catalogue:check`, and `pnpm golden`.

**Acceptance Criteria:**
- Given the 176 stub-safe names in the catalogue, when looked up via `services.commands.get(name)`, then every single name resolves to a `ResolvedCommand` with valid `ParamSpec` declarations matching catalogue arity and `byRef` parameters.
- Given each stub-safe command, when invoked with valid arguments through a VM program, then exactly one effect record (or N records for multi-section writes) is appended to `vm.effects` carrying `{ seq, tick, thread, name, kind, args, out, result, patch, wait: null, request: null }`, where `kind` matches the catalogue kind and `patch.section` matches `sectionsWrite`.
- Given a stub command with by-reference parameters (e.g. `getColor(&r, &g, &b)`), when called with variables, then the VM writes the documented default `0` back into each variable in the caller frame, and the record's `out` maps the parameter indices as string keys (`{"0": 0, "1": 0, "2": 0}`).
- Given a command with optional parameters, when called without the optional arguments, then arity checks pass, no error is thrown, and omitted optional parameters produce no entries in `out`.
- Given a script invoking obsolete commands `underarrow` or `itemwalkspeed`, when run, then a `builtin.obsolete` `ScriptError` is raised, and no effect record is added to `vm.effects`.
- Given more than 256 effect records generated in a run, when `vm.effects` is inspected, then `vm.effects.length === 256`, the oldest records have been evicted, and `vm.effectSeq` reflects the total cumulative count without resets.
- Given `drainEffects(vm, "ui")`, when called on a state with multiple section records, then all `ui` records are returned and removed from `vm.effects`, while non-ui records remain in place with unaltered `seq` numbers.
- Given a game state after running multiple stub commands, when snapshotted and restored into a fresh VM, then the restored state has identical `hashState` and subsequent commands continue stamping strictly monotonic `seq` numbers.
- Given an existing v1 save fixture (`packages/core/test/fixtures/save/v1-vm.json`), when restored with `restoreGameState`, then it restores cleanly with `schema.vm === 2`, `effects: []`, and `effectSeq: 0`.
- Given `pnpm golden`, when executed, then it passes with zero differences in `golden/` (G5).

## Implementation Notes

- **Catalogue count reconciliation:** The ticket description (`tickets.toml:130`) states: *"170 of the 271 names in format-spec 9.11; entry 27 brings the catalogue to the 282 of docs/spec/engine/rpgcode-functions.md and assigns the 8 new names to the stub or wait sets"*.
  - As measured against `_bmad-output/.../discovery/command-effect-catalogue.json` (`meta.title`, `summaries.totalNames: 282`), there are 282 total entries:
    - 271 entries originate from §9.11 (`paramsSource != "docs/spec"`), of which exactly 170 are `pure`, `state-write`, or `draw-audio-cue` (`command-effect-catalogue.md:537`).
    - 11 entries originate from `docs/spec/engine/rpgcode-functions.md` (`paramsSource == "docs/spec"`): `mbox`, `fbranch`, `resumeNext`, `setErrorHandler`, `setResumeNextHandler`, `empty`, `underarrow`, `newplyr`, `itemwalkspeed`, `shopcolors`, `restorearrayscreen`.
    - Among these 11, 6 are stub-safe (`mbox`, `empty`, `underarrow`, `itemwalkspeed`, `shopcolors`, `restorearrayscreen`), 4 are flow-control (`fbranch`, `resumeNext`, `setErrorHandler`, `setResumeNextHandler`), and 1 is mixed (`newplyr`).
  - Total stub-safe set is therefore **176 names** (170 + 6). The plan targets the authoritative filter `effectKind ∈ {pure, state-write, draw-audio-cue}`, covering all 176 names.
- **ParamSpec derivation from catalogue notation:** The 176 stub names contain 88 distinct `params` strings in the catalogue:
  - `""` or `"—"`: empty parameters (`NO_PARAMS = []`).
  - `"..."`: variadic arguments (`[{ name: "args", optional: true, byRef: false, variadic: true }]`).
  - Bracketed groups like `x,y,s[,cnv]`: parameters outside brackets are required; inside brackets `[ ... ]` are optional.
  - Leading `&`: marks `byRef: true`.
  - Trailing byRef without `&`: 7 catalogue rows mark `byRefOut: true` without explicit `&` in `params` (`tileType`, `boardGetVector`, `boardGetVectorPoint`, `boardGetProgram`, `boardGetProgramPoint`, `split`, `charAt`). For non-variadic commands (`tileType`, `split`, `charAt`), the trailing parameter is marked `byRef: true` following the §9.11 rule ("Most getters also accept a trailing by-reference output parameter").
- **Documented defaults:**
  - `pure`: returns numeric `0` (the legacy unset read value per §9.16 / SEM-5 / FUN-2).
  - `state-write` and `draw-audio-cue`: returns `null` (AD-14 explicit absence).
  - byRef write-backs: all byRef parameters write `0` back to the caller's variable upon return.
- **Obsolete commands:** `underarrow` and `itemwalkspeed` are marked in `docs/spec/engine/rpgcode-functions.md:14` (R-36) as *"obsolete: raises an error and the statement is skipped"*. The stub implementation for these two names throws a catchable `ScriptError("builtin.obsolete", ...)` and writes no effect record.
- **Patch convention for generic stubs:** Since generic stubs precede domain epic implementations and have no datum-level target in state, stubs emit `patch: { section, path: [], op: "merge", value: null }` where `section` is taken from `sectionsWrite[0]`. An empty `path: []` signifies the section as a whole; `value: null` indicates no datum payload. For `pure` getters where `sectionsWrite` is empty, `patch: null`.
- **Ring-cap bound vs per-tick drain:** `EFFECT_LOG_CAP = 256` prevents runaway memory and oversized snapshots in long runs or loops. Section owners in later epics drain their records each tick via `drainEffects(state.vm, section)`; until those epics land, the ring cap provides the hard bound.

## Plan Change Log

- 2026-10-15 — Initial plan authored for Ticket 3.21. Reconciled 170 vs 176 stub counts; defined 11-field `EffectRecord` and `EffectPatch`; established schema v2 bump with v1 restore migration; designed parameter notation parser generator; established clean cutover removing temporary U1 sink.
- 2026-10-15 — Implementation update: Reconciled schema bump to vm: 2 → 3 (ticket 3.5 previously bumped vm to 2 for operand stack); fixture updated to `v2-vm.json` with v2 → v3 restore migration.
## Design Notes

- **Why a codegen tool (`tools/catalogue/generate.mjs`) instead of hand-authoring 176 stubs:** Hand-authoring 176 command specifications with parameter specs, aliases, and kinds across 900+ lines of TypeScript introduces severe human transcription risk and drifts easily when entry 27 updates catalogue definitions. The generator is hermetic, fast, tested with unit tests against all 88 notation variants, emits deterministic committed TypeScript, and provides `--check` in CI to guarantee that `packages/core/src/script/catalogue-stubs.ts` never desynchronizes from `command-effect-catalogue.json`.
- **Why schema bump vm: 1 → 2:** `VmState` gains two new properties (`effects` and `effectSeq`). Under the architecture spine AD-23 and AD-7 rules, any change to a `*State` type requires a section schema version bump and a fixture save from the previous version with a restore test. Bumping `SCHEMA_VERSIONS.vm` from 1 to 2 satisfies this non-negotiable contract.
- **Why `wait` and `request` are `null` on stub records:** Ticket 3.21 explicitly covers stub-safe commands (`pure`, `state-write`, `draw-audio-cue`). Wait, request, spawn, and flow commands cannot be generic stubs without desynchronizing VM control flow (`command-effect-catalogue.md:537,599`). Ticket 3.22 (entry 22) later implements the 106 waiting and requesting commands. Keeping `wait: Wait | null` and `request: CommandRequest | null` in `EffectRecord` now guarantees that the record shape is stable and won't require a schema v3 bump in entry 22.
- **Why `ScriptServices.effects` is cleanly deleted rather than deprecated:** Under the repo's Clean Cutover contract, obsolete code, comments, aliases, and shims must be deleted immediately. The U1 sink on `ScriptServices` was documented as an interim test sink for ticket 3.3. Replacing it with direct in-VM recording and state storage completes the architectural design.

## Verification

**Commands:**
- `pnpm catalogue:generate && pnpm catalogue:check` — expected: generates cleanly and check passes with exit code 0.
- `pnpm catalogue:test` — expected: parameter notation parser passes all test vectors.
- `pnpm typecheck` — expected: all packages and test suites pass TypeScript checking with zero errors.
- `pnpm test` — expected: unit test suite passes, including `script-catalogue.test.ts` and `save-migration.test.ts`.
- `pnpm test:strict` — expected: no skipped tests.
- `pnpm lint` — expected: zero ESLint errors; guardrails plugin clean; no `console` calls in `core`.
- `pnpm graph` — expected: dependency edges verified.
- `pnpm licence` — expected: Blue Oak Bronze allowlist compliant.
- `pnpm provenance` — expected: G7 clean-room scan clean.
- `pnpm golden` — expected: passes with no re-record; `git diff golden/` remains clean.

**Manual checks:**
- Inspect `packages/core/src/script/catalogue-stubs.ts` to confirm exactly 176 command specs are exported.
- Confirm `git diff packages/core/src/script/vm.ts` shows complete removal of `services.effects` and no lingering U1 shims.
