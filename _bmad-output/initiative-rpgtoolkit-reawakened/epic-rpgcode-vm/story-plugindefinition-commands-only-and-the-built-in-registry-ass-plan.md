---
title: 'PluginDefinition (commands only) and the built-in registry assembly'
type: 'feature'
ticket: '3'
created: '2026-10-15'
status: built
baseline_revision: '0fd79bfc7178d9254cb42d082268abe705482af4'
route: 'full'
route_source: 'auto'
risk: 'medium'
context: ['{project-root}/docs/guardrails.md', '{project-root}/docs/adr/0004-script-ast-step-ir-and-plugins.md', '{project-root}/_bmad-output/initiative-rpgtoolkit-reawakened/epic-rpgcode-vm/epic-rpgcode-vm.md', '{project-root}/_bmad-output/initiative-rpgtoolkit-reawakened/epic-rpgcode-vm/discovery/plugin-definition-spike.md']
---

<frozen-after-approval reason="human-owned intent — do not modify unless the human renegotiates">

## Intent

**Problem:** The VM's command registry is the tracer's stand-in. `packages/core/src/script/builtins.ts` holds a flat `BuiltinLookup` over `PROVISIONAL_BUILTINS` (`end` and `sleep`), each `call(ctx, args)` returning `{ done, out } | { yield }`. There is no `PluginDefinition`, no way to layer one definition over another, no way for a command to call the one below it, no `Logger` port, and `createScriptServices` and `ScriptHost` take a raw `BuiltinSpec[]`. Every later entry registers through the contract this one fixes: 3.5 to 3.17 register the pure built-ins, 3.21 and 3.22 register the whole catalogue, 3.14 adds `decoders`, 3.25 adds the manifest, 3.15 the TK2 compat pack. Ruled on 2026-10-11 and 2026-10-12 (spike 3.23): one ungated contract, commands as middleware, last registered wins with a warning, `PluginDefinition` starts with `commands` only.

**Approach:** Define `PluginDefinition = { id, version, commands }` (ADR 0004 decisions 2 and 6) where a command is an AD-8 `BuiltinSpec` whose `call` becomes `(view, args, next) -> { out, effects, wait? }`, with an optional AD-17 `request` carrying a `then` continuation (ADR 0004 decision 7). Add a pure assembly function over an ordered `PluginDefinition[]`: the later layer runs first, `next` reaches the layer below, and a repeated name or alias emits one `command.overridden` warn record through a new minimal `Logger` port (AD-24). Add the four-tier lookup skeleton (redirect, script function, built-in, empty extension tier). The VM's `call` dispatch moves onto the assembled registry and writes by-reference `out` back through the machinery entry 2 built. The tracer's provisional list becomes the first `core` pack. In a doc-first commit (G7) amend ADR 0004, AD-8 and AD-10 to state the functional contract and the last-wins rule.

## Boundaries & Constraints

**Always:** Land the doc amendment (ADR 0004, AD-8, AD-10) in its own commit before any code (G7 rule 4). Keep `core` free of DOM, Node, I/O and timers (G2) and of `Math.random`, `Date` and `Intl` (G3). Keep every value in a result plain data (G1). Keep the `Arg = { value, ref }` clause, with an absent reference `null` (AD-14). Command wrappers get the layer below as `next`; commands never mutate the view. Migrate every caller of the old `BuiltinSpec[]` seam (clean cutover, no shim). Cite `docs/spec/engine/rpgcode-language.md` and `docs/spec/engine/plugins-and-battle.md` for the legacy dispatch behaviour the lookup keeps (an unknown call is offered to the extension tier by name). The G5 goldens must pass unchanged. Put a regression test behind each rule the entry's `verify` names.

**Never:** Build `subsystems`, `decoders` or a dialect hook (3.14 owns `decoders`; `dialects` never joins `PluginDefinition`, spike 3.23). Build the manifest, `core` pinning or manifest patching (3.25). Build the effect record, the AD-23 `vm` section schema or the catalogue stubs (3.21). Build `request` handling in the VM, threads or `then` resumption (3.9). Build `createEngine` (epic 4 owns it). Rule R-35 (a script method named like a built-in); the tier order here is AD-8's as written and 3.27 rules R-35. Add a runtime dependency. Touch a golden file. Open `../rpgtoolkit` (G7).

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Layered name | Plugins `[core, A]` both define `sleep` | A's handler runs first; `next` reaches core's | One `command.overridden` warn record `{ name, kind: "plugin", previous: "core", replacement: "A" }`; the assembled registry still builds |
| Wrapper ignores `next` | A's handler never calls `next` | A's result is the result; core's handler does not run | None |
| Wrapper calls `next` | A's handler calls `next(args)` and edits its result | The edited result is the result | None |
| Alias collision | A defines an alias equal to core's command name | Same override rule and the same single warning | One record per replaced name |
| One plugin repeats itself | One definition lists the same name or alias twice | Assembly rejects it, naming the plugin | Thrown error (AD-8's rejection survives only here) |
| By-ref output | A command returns `out: [[0, 7]]` for a `byRef` parameter | The caller's variable is written back | An `out` index with no `byRef` parameter is a located `ScriptError` |
| Purity | The same command run twice on the same view and args | Equal results; the view is unchanged | — |
| Request result | A command returns `request` with `then: { command, args }` | The contract accepts it; the registry returns it unmodified | See Unknown U3 for the VM |
| Lookup order | A name in every tier | redirect, then script function, then built-in, then extension; first hit wins | Nothing resolves: the existing `unknown.command` `ScriptError` |
| Bottom layer calls `next` | Handler calls `next` and no lower layer defines the name | `next` returns an empty result (no `out`, no `effects`, no `wait`, value `null`) | One `command.no-next` warn record per call through the `Logger` (Decision U4) |

</frozen-after-approval>

## Code Map

- `packages/core/src/script/builtins.ts:1-95` — today's provisional seam: `ParamSpec`, `Arg`, `BuiltinResult`, `BuiltinCtx = { rng, clock }`, `BuiltinSpec { name, aliases, params, call(ctx, args) }`, `PROVISIONAL_BUILTINS` (`end`, `sleep`), `BuiltinLookup`, `createBuiltinLookup`. Its header says entry 3 rewrites it; keep `ParamSpec` and `Arg`, replace `BuiltinSpec.call`, `BuiltinResult`, `BuiltinCtx` and the lookup.
- `packages/core/src/script/vm.ts` — `ScriptServices` (`:53`), `createScriptServices(state, extraBuiltins?)` (`:68`), and the dispatch half: `case "call"` (`:200`) does `takeArgs`, `lookup.get`, `checkArity`, `spec.call(services.ctx, args)` and writes `out` back. This is what moves onto the registry. `advanceScriptTick` (`:144`) and `runThreadsPhase` (`:132`) stay.
- `packages/core/src/script/index.ts` — exports; add the new modules.
- `packages/core/src/ports/` — has `rng.ts` and `time.ts`; `Logger` is **absent today** (searched `packages/core/src`). Add `ports/logger.ts` and export it from `ports/index.ts`.
- `packages/runner-harness/src/script-host.ts` — `ScriptHostInit.builtins` (`:40`) and `ScriptHostRestore.builtins` (`:46`); migrate to `plugins`.
- Callers to migrate: `packages/core/test/script-vm.test.ts`, `packages/core/test/script-state.test.ts`, `packages/runner-harness/test/script-host.test.ts`.
- `docs/adr/0004-script-ast-step-ir-and-plugins.md:34-58` — decisions 2 and 6 hold `PluginDefinition` and the contract; `:72-119` decision 7 holds `request` and `then`. Amend for last-wins.
- Architecture spine, AD-8 (`:137`, still lists `ParamSpec { optional?, byRef?, variadic? }`, `out?`, `resume?` and duplicate rejection), AD-9 (`:144`, read-only here), AD-10 (`:151`, one owner per state section; the functional contract changes who applies effects), AD-24 (`:294`, the `Logger` port).
- `_bmad-output/initiative-rpgtoolkit-reawakened/epic-rpgcode-vm/discovery/plugin-definition-spike.md:59-71` — the commands ruling this entry implements.
- `story-tracer-bullet-...-plan.md:103, 143, 194, 226, 250` — what 3.2 deferred here: the registry assembly, duplicate names, aliases and precedence, the by-ref `out` write-back, and the AD-8 sentence to rewrite.
- `docs/spec/engine/rpgcode-language.md:90` and `docs/spec/engine/plugins-and-battle.md:51-53` — the legacy behaviour the extension tier keeps.

## Tasks & Acceptance

**Execution:**
- [ ] Doc-first commit — `docs/adr/0004-...md` decisions 2 and 6, architecture spine AD-8 and AD-10: state the functional command contract, the layer stack with `next`, last-registered-wins with a warning, and that single-plugin repetition is the only rejection; keep the `Arg` clause (the 3.2 plan, `:250`) — settles the contract before any code
- [ ] `packages/core/src/ports/logger.ts` — `Logger` port: levels and plain-data records (AD-24), minimal; 3.7 extends it — gives the override warning a destination
- [ ] `packages/core/src/script/plugin.ts` — `PluginDefinition`, `CommandHandler`, the command view type, `CommandResult` — one contract for every later plugin
- [ ] `packages/core/src/script/registry.ts` — the pure assembly function, the layer stack, `next` wiring, override detection and warning, the four-tier lookup skeleton with stub tiers
- [ ] `packages/core/src/script/builtins.ts` — the tracer's `end` and `sleep` become the first `core` `PluginDefinition`; remove `PROVISIONAL_BUILTINS` and the flat lookup
- [ ] `packages/core/src/script/vm.ts` — `createScriptServices` takes `PluginDefinition[]` and a `Logger`; the `call` case resolves through the tiers, builds the view, runs the handler and writes `out` back
- [ ] `packages/runner-harness/src/script-host.ts` and the three test files — migrate to `plugins`
- [ ] `packages/core/test/script-registry.test.ts` — one test per behaviour in the matrix above
- [ ] Update `CONTRIBUTING.md` only if a command it lists changes; otherwise nothing

**Acceptance Criteria:**
- Given two plugins that define the same command name, when assembled, then the later one runs first, `next` reaches the earlier one, and exactly one `command.overridden` warn record `{ name, kind, previous, replacement }` reaches the `Logger`.
- Given a wrapper that calls `next` and one that ignores it, when run, then each behaves as the amended AD-8 documents.
- Given a repeated alias in another layer, when assembled, then it is handled as a repeated name, with one warning.
- Given one definition that repeats a name or alias itself, when assembled, then assembly rejects it naming the plugin.
- Given a command that returns `out` for a by-reference argument, when it runs in a program, then the caller's variable holds the value, including after a snapshot taken before the call is restored and run on.
- Given the same view and args, when a fixture command runs twice, then both results are equal and the view is byte-for-byte unchanged.
- Given a fixture command that returns a `request` with a `then` continuation, when it is returned from the registry, then the contract accepts it unmodified.
- Given a name present in every tier, when looked up, then redirect, script function, built-in and extension resolve in that order.
- Given `pnpm golden` with no `golden:record`, when run, then it passes (the dispatch rewrite changes no state shape or hash).
- Given ADR 0004, AD-8 and AD-10, when read, then each states the functional contract and last-wins, with no remaining "rejects duplicate names" sentence for plugins.

## Implementation Notes

- **Decision U1 (Jensen, 2026-10-15): a sink on `ScriptServices`.** A command's `effects` are plain-data `CommandEffect = { kind: string, args: readonly PlainData[] }`; the VM hands them to an `effects` sink on `ScriptServices` (a function, not state), so the snapshot shape and goldens are untouched. Entry 21 replaces the sink with the stamped, stored record and may widen `CommandEffect`; treat it as a starting point, not a frozen type. The U1 paragraph below is the question as asked.
- **Unknown U1 — where `effects` go.** The contract returns `effects`, and the entry says "effects drained", but the effect record (seq, tick, thread, name, kind, args, out, result, patch, wait, request) and its storage in the `vm` section are entry 21's. A drain that writes into `VmState` changes the snapshot shape and the goldens, which 3.11 owns. Proposed: 3.3 types a command's `effects` as a plain-data `CommandEffect = { kind: string, args: readonly PlainData[] }` and the VM hands them to an `effects` sink on `ScriptServices` (a function, not state); the tests use a collecting sink and 21 replaces it with the stamped, stored record. Nothing is lost silently in the interim because no catalogue command yet produces an effect. <!-- OWNER: U1 — alternative: drop `effects` from the 3.3 contract and add it in 21, which breaks the ADR 0004 signature `(view, args, next) -> { out, effects, wait? }` for one entry. Needs your ruling at the checkpoint. -->
- **Decision U2 (Jensen, 2026-10-15): the view carries the `rng` and `clock` ports.** A command is pure over game state; drawing from the injected seeded RNG port (whose position lives in the snapshotted state) is the one declared exception, so replay and restore stay identical. "Same view and args gives equal results" is tested only on fixture commands that use neither port. Open idea for entry 13, not decided here: derive `random` from the tick plus a per-tick draw counter (a counter-based RNG), which would remove the exception but replaces `core/rng`, entry 13's "single seeded RNG" ruling and the hash vectors and goldens (G5). The U2 paragraph below is the question as asked.
- **Unknown U2 — `random` against "commands never mutate state".** Entry 13 draws `random` from the single seeded RNG, which advances state. Proposed: the view carries the same two injected ports 3.2's `BuiltinCtx` carries (`rng`, `clock`) and "same view and args gives equal results" is stated for commands that use neither; the port draw is the declared exception (G3's injected clock and seeded RNG). Alternative: a `draw` effect. <!-- OWNER: U2 — the purity test in `verify` only holds for fixture commands that avoid the ports; a `random` that is a pure function of a state-held RNG would instead need the view to expose the RNG state. Ruling needed before entry 13. -->
- **Decision U3 (Jensen, 2026-10-15): a `request` before 3.9 is a located error.** The contract accepts a `request` with its `then` continuation and the registry returns it unmodified; the VM raises a located `ScriptError` `command.request-unsupported` when one arrives, so a host interaction is never silently dropped. 3.9 replaces the error with the real handling. No catalogue command emits a request before 3.16 and 3.22, so nothing real hits it meanwhile. The U3 paragraph below is the question as asked.
- **Unknown U3 — what the VM does with `request` before 3.9.** The contract accepts it; the entry says the VM side is 3.9. Proposed: until 3.9 the VM raises a located `ScriptError` code `command.request-unsupported` rather than dropping it, because a silently dropped request loses a host interaction and corrupts replay. <!-- OWNER: U3 — alternative is to pass it up into `TickReport.requests`, but the harness driver rejects non-empty requests until 3.7. -->
- **Decision U4 (Jensen, 2026-10-15): `next` with nothing below is a no-op plus a warning.** It returns an empty result and emits a `command.no-next` warn record through the `Logger`, so a wrapper placed below the layer it meant to wrap (an editable-manifest mistake) is visible, not silent. A warning per call is accepted for now; 3.7's `Logger` sinks can de-duplicate. This supersedes the located-error proposal in the paragraph below.
- **Unknown U4 — `next` with nothing below.** A wrapper in the lowest layer for a name no layer defines has no `next`. Proposed: calling it raises a located `ScriptError` `command.no-next`, and registering such a name is a plain new command (no override, no warning).
- **Decision (Jensen, 2026-10-15): all three assumptions confirmed.** The minimal `Logger` carries `warn` and `error` only, with a record `{ level, code, message, data }` (entry 7 adds the rest and the sinks). A name or alias repeated inside one plugin is rejected by assembly with an `Error`, not by an ESLint rule. The `core` pack sits at layer 0 of the ordered list; pinning it is 3.25.
- **Assumptions to confirm.** The minimal `Logger` carries `warn` and `error` only, with a record `{ level, code, message, data }` (entry 7 adds the rest and the sinks). A repeated name inside one definition is rejected by assembly with an `Error` rather than by an ESLint rule, since AD-8's text says "lint" without naming one. The `core` pack's layer is index 0 in the ordered list; pinning it is 3.25. The legacy engine offered an unknown name to each plugin in order and the first claim won (epic Notes, zip-survey); the ruling here is the opposite, last wins, as the owner decided on 2026-10-11 (unverified that the legacy stops at the first claim).
- **R-35 is open.** `docs/spec` says built-ins bind at compile time, so a script method named like a built-in is never called at those sites. AD-8's order (script function before built-in) says the reverse. This entry follows AD-8 and leaves the choice to 3.27; do not encode either as a test that 3.27 must delete.
- **Sequence.** 3.3 `after = [2]` only. It does not wait on 1.13 or 3.27; its `references` still say `format-spec §9.11`. Re-pointing them is 3.28's job.

## Plan Change Log

- 2026-10-15 — initial plan, drafted from the entry, the epic Notes, spike 3.23's rulings, ADR 0004, the 3.2 and 3.26 plans and the landed code. Four Unknowns (U1 to U4) and three assumptions are marked for the plan-checkpoint review.
- 2026-10-15 — owner ruled U1 (effects sink on `ScriptServices`), U2 (view carries `rng` and `clock`), U3 (`request` is a located error until 3.9) and U4 (`next` with nothing below is a no-op plus a `command.no-next` warning); the I/O matrix row for `next` was updated to match. The three assumptions and the plan as a whole still await approval.

## Design Notes

Order of work: doc-first commit; then `Logger`, `plugin.ts` and `registry.ts` with their tests against hand-built `PluginDefinition` fixtures; then the VM dispatch cutover; then migrate the three callers; run `pnpm golden` last, since an unchanged golden is the proof that the rewrite is state-neutral. The entry carries `plan_checkpoint = true`, so nothing past this plan runs before the human has ruled U1 to U3.

## Verification

**Commands:**
- `pnpm typecheck && pnpm test && pnpm lint && pnpm graph && pnpm provenance && pnpm licence` — expected: all pass.
- `pnpm fixtures:fetch && pnpm test:strict && pnpm golden` — expected: pass with no `golden:record` run and `git diff golden/` empty.
- `grep -rn "PROVISIONAL_BUILTINS\|createBuiltinLookup\|extraBuiltins" packages/` — expected: no match.
- `grep -rn "console\." packages/core/src` — expected: none (AD-24).

**Manual checks:**
- Read the amended AD-8 beside ADR 0004 decision 2 and confirm they state one contract.
