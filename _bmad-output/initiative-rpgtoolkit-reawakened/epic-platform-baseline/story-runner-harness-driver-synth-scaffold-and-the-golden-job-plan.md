---
title: 'runner-harness driver, synth scaffold and the golden job'
type: 'chore'
ticket: '9'
created: '2026-10-10'
status: done
baseline_revision: 'b09ff49910ec3d09274a87bd9ccd05253de37cac'
route: 'full'
route_source: 'auto'
risk: 'medium'
review: 'quick'
review_source: 'pinned'
lenses_ran: ['quick']
review_loop_iteration: 1
context: ['{project-root}/docs/guardrails.md', '{project-root}/_bmad-output/initiative-rpgtoolkit-reawakened/architecture-rpgtoolkit-reawakened/architecture-rpgtoolkit-reawakened.md']
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** G5 needs a required headless golden job, but nothing replays an input log, hashes steps or compares them with a reference. `synth` does not exist, and `core` has no `Engine` implementation to replay against.

**Approach:** `runner-harness` gains the input-log driver, null audio, golden compare, a hash-vector self-check and a test-double `Engine`. `runner-headless` becomes the Node shell that reads the golden files; `pnpm golden` runs it. An empty `synth` package is added, and `golden.yml` runs fetch, check and golden.

## Boundaries & Constraints

**Always:**
- Harness is platform-neutral (`lib` ES2022, `types: []`): text and data in, results out. `runner-headless` does fs, argv and printing and imports only `@rpgtoolkit/runner-harness` (no `core` edge).
- Run file `golden/test-double/run.json`: `{schema:1, steps:N, log:[…]}`; `log` is the concatenation of `StepReport.consumed` (AD-14) in `encodeLog` form. One record per line is formatting only: parse is `JSON.parse` of the whole file, then `decodeLog`.
- `parseRun` validates before any `advance`: `schema`, integer `steps` ≥ 1, `log` an array; per record an integer `step` ≥ 0, non-decreasing, < `steps`, and an event valid against the `InputEvent` union (all 11 kinds; field types as in core's `InputEvent`; `step`, `reqId`, `cueId`, `buttons` finite integers ≥ 0; `name` and `code` non-empty strings; `char`, when present, one code point; `bytes` xor `missing: true`; no extra keys at any level), as an exhaustive `switch` with a `never` default. Errors name the record index and field.
- Driver `runLog(engine, run, n, audio)` always passes `maxSteps = n` and, with `before` the counter before a call, exactly the records with `before ≤ step < before + n`, in order. It throws, naming call and cause, unless `stepsRun === n`, `stepAfter === before + stepsRun`, `loading` false, `paused` null, `requests` and `diagnostics` empty, and the concatenated `consumed` equals the log. It accepts `log: []`. Each batching run parses the run text afresh.
- Step record `{step, state, draw}`: `step` is `stepAfter`; `state` is `StepReport.stateHash`; `draw` is `hashDrawList(engine.drawList(0))`.
- Golden `golden/test-double/golden.json`: `{schema:1, records:[…]}`, one record per line (formatting only), `step` 1…N in order, 16 lowercase hex. `pnpm golden` never writes it. `golden:record` runs the vectors, run and batching stages, then writes the golden from the run (replacing any existing file; an absent one is created); a failing stage writes nothing. A golden change goes in a PR that says why (G5.3).
- `goldenJob` (harness, builds the double itself) rejects an empty log, zero vector rows and empty `records`. Compare reports the first differing step with every differing field (`golden: step 7: state hash differs (expected …, actual …); draw-list hash differs (…)`); extra and missing steps are named.
- `golden/hash-vectors.json` is checked first; rows are copied from core's tests: `canon {id, input|bits, canonical}` (RFC 8785 §3.2.2 sample, §3.2.3 key sort, Appendix B numbers incl. `-0`), `fnv1a64 {id, utf8|hex, hash}`, `hashState`/`hashDrawList {id, input, hash}`, and a `rev` pair `{id, a, b}` (a `blit` from `{surface, rev}` and `rev + 1`; hashes must differ).
- CLI `cli.js golden [root] [--record]`; root defaults to cwd; exit 0, or 1 for any named error. `main(argv)` prints and returns the exit code and catches any error thrown below it, printing one named line with exit 1; only `cli.ts` sets `process.exitCode` from it, never `process.exit` after printing. Guard: `entry !== undefined && realpathSync(entry) === fileURLToPath(import.meta.url)`. Stages, one line each: `vectors: N rows ok`, `run: S steps`, `batching: 1,3,S ok`, then `golden: S compared`, or with `--record` `golden: S recorded`.
- Root scripts: `golden` = `tsc -b && node packages/runner-headless/dist/cli.js golden`; `golden:record` = the same plus `--record`. `runner-headless` has no `start` script (the CLI needs a subcommand). `synth` source is `src/index.ts` only, with `build`, `typecheck`, `lint` and `test` scripts.
- `golden.yml`: job `golden`, no `if:`, no path filters, Node 24.21.0, triggers and cache key as `fixtures.yml`; steps checkout, pnpm, node, install, cache, `fixtures:fetch`, `fixtures:check`, `golden`.

**Never:** a `createEngine`, format readers or a renderer; `audio.ended` or `video.ended` emission; focus-pause replay; timers or Node in harness; `core` imported from `runner-headless`; an edit to generated depcruise rules or `edges.json`; a test that uses the network or the repo's `fixtures/`.

## I/O & Edge-Case Matrix

Rows marked (table) are one table-driven test over the listed variants.

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Replay matches | Committed run (24 steps; key down/up with `"` and `\` in a name and a non-BMP `char`, pointer, gamepad, `asset` reply with bytes below 0x10, `audio.ended`, `video.ended`; no focus) and golden | The stage lines; exit 0 | No error expected |
| Golden differs | State altered at step N; draw altered; both at one step; two steps altered | Exit 1 naming step N and the field(s); only the first step reported (table) | CLI error |
| Changed log | Every field of every record kind in the committed log mutated in turn (name, code, char, down, x, y, buttons, reqId, cueId, one byte, missing); two same-step records swapped (table) | Exit 1 at step stamp + 1 | CLI error |
| Moved stamp | A record's stamp changed to another valid value (table); stamps breaking the non-decreasing order or reaching `steps` are `parseRun` rejections (see Bad record) | Exit 1 at step min(old, new) + 1 | CLI error |
| Extra / missing steps | Golden shorter / longer than `steps` | Exit 1 `run has step K the golden lacks` / `golden has step K the run lacks` | CLI error |
| Nothing compared | `goldenJob` with `log: []`, `records: []`, zero vector rows (table); `runLog` with `log: []`, 24 steps | Exit 1 naming which; `runLog` returns 24 records | CLI error |
| Vector differs | One row of each kind altered; a `rev` pair with equal hashes (table) | Exit 1 naming row id (expected, actual) | CLI error |
| Bad files | `run.json` or `golden.json` absent, not JSON; `schema` 2; `steps` missing, 0, fractional, negative, a string; `log` or `records` not an array; golden step numbers not 1…N; bad hex (table) | Exit 1 naming file and field; with `--record` an absent golden is created | CLI error |
| Bad record | Stamps 3 then 2, negative, fractional, ≥ `steps`; unknown kind, missing field, wrong type, `bytes` with `missing`, extra key, `{t:'bytes',hex:'zz'}`, odd-length hex (table) | Rejected before any `advance`; exit 1 naming `run.json`, record index and field | CLI error |
| Windows | Spy engine, `steps` 7, `n` 3, a record stamped at each window start | Calls n = 3, 3, 1 with windows [0,3), [3,6), [6,7) and `maxSteps` = n | Test fails |
| Feeds exactly | Stub that drops or alters a consumed record; `stepsRun` 0, below or above n; `stepAfter` ≠ before + `stepsRun`; `loading`; `paused`; a request; a diagnostic; clamps when `maxSteps` is omitted; runs past `maxSteps` (table) | Driver throws naming call and cause; the clamping stub still reports n | Throws |
| Batching | Steps per call 1, 3, N, and 25 steps with batch 3 (last n = 1), agree at shared steps; a stub whose hash depends on batch size; a stub that mutates its `inputs`; mutating returned `consumed` and the caller's log after a call (table) | Agrees; the hash-dependent stub fails at the first shared step; later runs and `stateHash` unaffected | Throws / exit 1 |
| Double semantics | Hand-written literal state and draw list for a 3-record log (key down, pointer, key up); key-up for an unheld key; past- and future-stamped input; a `focus` record (table) | Literals match, key-up removes nothing; `RangeError` for stamps; plain `Error` naming `focus` | Throws |
| Null audio | `Record<AudioCueKind, AudioCue>` table; a cue with an unknown `kind` | Recorded in order; `TypeError` naming the kind | Throws |
| Record | `golden:record` (`--record`) twice; invalid run, failing vector, batching disagreement, double throwing mid-run (table); an existing invalid golden | Byte-identical golden and `golden` then passes; an existing golden, valid or not, is replaced; a failing stage writes nothing, no partial file | CLI error |
| CLI | Unknown flag, two roots; run via symlink; temp root with its own empty `fixtures/` and with none (table) | Exit 1 named; same result for symlink and both roots | CLI error |
| Surface, synth | `Object.keys` of harness `index.ts`; import synth `src/index.ts` and run `pnpm --filter @rpgtoolkit/synth test` | Equals the pinned list (no double); synth has no runtime exports and one test runs | Test fails |
| CI | Pull request | `golden` passes; log shows the fetch step's `<game>: <n> files` lines and the stage lines; a changed golden or log fails with the step | CI job fails |

</frozen-after-approval>

## Code Map

- `packages/runner-harness/src/` -- `driver.ts` (`runLog`; structural audio sink type), `audio.ts` (`createNullAudio`), `golden.ts` (`parseRun`, golden parse/format, `compareGolden`), `vectors.ts`, `job.ts` (`goldenJob(texts, record)`), `double/test-engine.ts` (ships in `dist`, not exported), `index.ts` (replaces `runHarness`). `test/`: one flat `test/<module>.test.ts` per module plus the surface test, no subfolders, helpers not ending in `.test.ts`; a module-only `node-test.d.ts` copied from core's. No new scripts.
- `packages/runner-headless/src/` -- `index.ts` (`main(argv)` prints and returns the exit code), `cli.ts` (entry guard; sets `process.exitCode`); replaces the placeholder `console.log`. `test/` builds temp roots and spawns the CLI. `package.json`: `start` is removed; no new scripts.
- `packages/synth/` -- new: `package.json` (`@rpgtoolkit/synth`, no dependencies; `build` = `tsc -b`, `typecheck` = `tsc -b && pnpm run typecheck:tests`, `lint` = `eslint .`, `test` = `tsc -b && node --test "test/*.test.ts"`, `typecheck:tests` = `tsc -p tsconfig.test.json`), `tsconfig.json`, `tsconfig.test.json`, `src/index.ts` (`export {};`), `test/index.test.ts`, `test/node-test.d.ts`.
- `golden/hash-vectors.json`, `golden/test-double/{run,golden}.json` -- new, tracked.
- `tsconfig.json` -- add the `packages/synth` reference. `pnpm-lock.yaml` -- add `packages/synth: {}` by hand beside `packages/core: {}`; do not regenerate (it moves `acorn`; `--frozen-lockfile` is green with or without it). `package.json` -- scripts `golden`, `golden:record`. `.github/workflows/golden.yml` -- new, shape of `fixtures.yml`. `_bmad-output/initiative-rpgtoolkit-reawakened/deferred-work.md` -- append entries.
- No change: `packages/core`, `eslint.config.js`, `tools/` (the edge list already holds `synth` and its edges), `pnpm-workspace.yaml`, `.gitignore`, provenance config.

## Tasks & Acceptance

**Execution:**
- [x] `packages/runner-harness/src/*`, `test/*` -- driver, `parseRun`, null audio, compare, vectors, job, double; one test per matrix row except CI (the workflow) -- CAP-12, CAP-13
- [x] `packages/runner-headless/src/*`, `test/*` -- CLI, record, symlink, misuse rows
- [x] `packages/synth/*` -- scaffold, four scripts, one test
- [x] `golden/*` -- vectors and run by hand, then `pnpm golden:record`
- [x] root `tsconfig.json`, `package.json`, `pnpm-lock.yaml`, `.github/workflows/golden.yml` -- wiring, CI
- [x] `_bmad-output/initiative-rpgtoolkit-reawakened/deferred-work.md` -- append focus-pause replay (engine epic), `audio.ended`/`video.ended` emission (audio epic), an exported `./testing`, and that the driver rejects non-empty `diagnostics` (revisit when a real engine reports them) -- deferrals this entry creates

**Acceptance Criteria:**
- Given a pull request, when Actions run, then `golden` passes and its log shows the fetch step's `<game>: <n> files` line for each game and the golden stages.
- Given one `state` value in `golden.json` (or one record in `run.json`) changed, when `pnpm golden` runs, then it exits 1 naming the step and the hash.
- Given a fresh clone, when `pnpm install --frozen-lockfile`, `typecheck`, `lint`, `graph` and `test` run, then all pass with `synth` included, and `synth` has `build`, `typecheck`, `lint` and `test` scripts that each pass.

## Implementation Notes

- **Decisions (human, 2026-10-10, at the plan checkpoint):**
  - AudioPort: AD-8 reserves the name `AudioPort` in `core/ports` for the VM's service port. `core` was left untouched; `createNullAudio` is local to `runner-harness`.
  - Fixtures stage dropped from `pnpm golden`: `fixtures:fetch` and `fixtures:check` in the workflow satisfy the fetch evidence requirement; `pnpm golden` runs offline.
  - Test double log digest: to detect any log mutation (name, code, char, down, x, y, buttons, reqId, cueId, bytes, missing), `log = fnv1a64(log + canon(encodeLog(record)))` is chained per consumed record.
  - Entry 1.12 heads-up: all event-shape validation in `parseRun` is isolated into `parseEvent(raw, recordIndex)` in `src/golden.ts`; `src/driver.ts` has zero event field rules.
  - Four scripts on `synth` only (`build`, `typecheck`, `lint`, `test`); root scripts cover the rest.
- **Known limits, deliberate:**
  - Test double throws plain `Error` on `focus` (AD-14/E-03 focus pause lands with the engine epic; logged in `deferred-work.md`).
  - Headless runner does not emit `audio.ended` or `video.ended` (requires audio readers from audio-synth epic; logged in `deferred-work.md`).
  - Driver throws on non-empty `requests` or `diagnostics` (logged in `deferred-work.md`).

## Plan Change Log

## Review Triage Log

Independent context-free review by review-1-9 with 55 mutation attacks:
- F1 (major): `parseEvent` accepted `extension.result` without `result` field. Fixed: `"result" in rawEvent` check added; `decodeLog` wrapped in try/catch naming record and field.
- F2 (minor): Malformed payload in `extension.result` threw bare TypeError. Fixed: named diagnostic with record index and field.
- F3 (minor): `parseEvent` switch had runtime throw instead of `never` default. Fixed: compile-time `_never: never` check added.
- F5/F6 (minor): Test coverage gaps. Fixed: added tests for empty name, multi-code-point char, missing result, malformed hex, audio cue forwarding, specific cause messages in driver tests, key-down deduplication, and batching disagreement.
- F9 (nit): Removed unused `test/node-env.d.ts` from harness.
- F11 (nit): `cli.test.ts` changed log test now asserts exact step (step 4).
All 71 workspace tests pass; full golden pipeline green.

## Design Notes

- **Split.** Data-in, data-out logic is in harness (`dap` reuses it); files, argv and exit codes are in `runner-headless`, a leaf in the edge list, so harness never hands the shell a core type.
- **What the job adds.** Core's tests already pin RFC 8785 and FNV-1a. The job re-asserts a small table first, so a broken `canon` reads "vector row 2 differs", not "step 1 differs"; it adds replay, hashes and batching (AD-1). `pnpm test` runs the harness and headless tests, so there is no `golden:test`.
- **Double.** All four `Engine` methods: `surfacePixels` returns `null`, `setBreakpoints` is a no-op; reports carry empty `diagnostics` and `requests`, `loading` false, `paused` null. State `{step, keys, pointer, other, cueId, log}`: `key` adds or removes `name` by `down`, `pointer` sets a point, `gamepad`, replies and `audio.ended`/`video.ended` bump `other`, in an exhaustive `switch`; `focus` throws a plain `Error` naming the unsupported kind (E-03 pause deferred). `log = fnv1a64(log + canon(encodeLog(record)))` per consumed record, so every field and the order of same-step records reach `stateHash`. Constants are the implementer's to choose and are fixed by the "Double semantics" literals (initial `log` is `""`, `keys` sorted ascending, pointer `{x, y, buttons}`, the cue and draw-list sizes). A key-down emits a `volume.set` cue; the draw list is `fill` plus a `rect` per held key and one at the pointer. It deep-copies `consumed` and throws `RangeError` for a record outside the call's window. The committed log's replies and `audio.ended`/`video.ended` records exercise the codec and parser only (the double emits no requests). It ships in `dist` but is not exported (a surface test pins `index.ts`); `goldenJob` builds it, so replacing it is one line in `job.ts`. AD-22's `./testing` waits for `dap` (rule r2 bans subpaths).
- **Null audio.** `createNullAudio()` is harness-local: `handle(cue)` and a read-only record of cues seen, via an exhaustive `switch`. No shared port: AD-8 reserves `AudioPort` for the VM's service port, and the interface that realises cues is shaped by `synth` and `runner-web` in the audio epic. `audio.ended`/`video.ended` emission needs audio readers `core` lacks.
- **Fixtures.** `golden` does not read the games (no readers yet). The `fixtures:fetch` and `fixtures:check` steps are the job's use of them and satisfy the entry-1.9 obligation in `deferred-work.md`; `pnpm golden` runs offline.
- **Scope.** The four scripts go on `synth` only, deliberately: the ticket says "each new package"; the root `typecheck`, `lint` and `test` cover the rest. The symlink-safe guard follows the `isMain` item in `deferred-work.md`. `runHarness` and the headless `console.log` go now; core's `add` and the copied `node-test.d.ts` files wait for entry 11.

## Verification

**Commands:**
- `pnpm install --frozen-lockfile && pnpm typecheck && pnpm lint && pnpm graph && pnpm test` -- expected: green (`pnpm test` covers the harness and headless tests)
- `pnpm --filter @rpgtoolkit/synth build && … typecheck && … lint && … test` -- expected: pass
- `pnpm fixtures:fetch && pnpm fixtures:check && pnpm golden` -- expected: one `<game>: <n> files` line per game, 0 tracked, the stage lines (`pnpm golden` also runs offline)
- Change one hash in `golden/test-double/golden.json`, run `pnpm golden` -- expected: exit 1 naming the step; then `git checkout` the file
