---
title: 'Corpus, catalogue completeness and golden-job wiring'
type: 'feature'
ticket: 17
created: '2026-10-16'
status: 'built'
baseline_revision: '0429a7531877f6dc4cf409cf5d5ad17d07eb5032'
route: 'full'
risk: 'medium'
context:
  - 'docs/guardrails.md'
  - 'docs/spec/engine/rpgcode-functions.md'
  - 'docs/spec/engine/rpgcode-dialects.md'
  - 'docs/spec/engine/rpgcode-language.md'
  - 'docs/spec/engine/rpgcode-errors-and-threads.md'
  - 'docs/adr/0004-script-ast-step-ir-and-plugins.md'
  - '_bmad-output/initiative-rpgtoolkit-reawakened/epic-rpgcode-vm/discovery/language-readiness.md'
  - '_bmad-output/initiative-rpgtoolkit-reawakened/epic-rpgcode-vm/discovery/command-effect-catalogue.json'
  - '_bmad-output/initiative-rpgtoolkit-reawakened/epic-rpgcode-vm/discovery/tk2-rpgcode-commands.csv'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:**
Ticket 3.15 landed the TK2 grammar frontend and compatibility pack; tickets 3.21 and 3.22 landed the catalogue stubs and responders. However, the nine synthetic programs identified during discovery (`discovery/language-readiness.md:257-268`) have not been collected into a unified headless corpus, `system.prg` and `start.prg` have not been wired to run to completion headlessly against those stubs without hand-written domain doubles, catalogue completeness across all 282 functions and mapped TK2 commands has not been asserted in a single gate, and the golden job (`pnpm golden`) currently compares only the synthetic test double from baseline, leaving the script VM unverified by G5.

**Approach:**
1. Collect the nine synthetic programs specified in `discovery/language-readiness.md`:
   - (1) Expression-heavy code with nested call arguments/indexes, deep recursion, locals shadowing globals, `autoLocal(true)`.
   - (2) OOP classes: constructors, destructors, `operator=`, `operator[]` as lvalue, `release()`, multiple inheritance, object hierarchy.
   - (3) User functions with `&` parameters, built-in by-reference outputs (`prompt`, `getcolor`, etc.).
   - (4) Error handlers: `setErrorHandler`, `setResumeNextHandler`, `resumeNext`, `on error goto`, `on error resume next`, line-located failures.
   - (5) Threads: `thread()`, sleep, wake, `getThreadId()`, `threadSleepRemaining()`, `killThread()`, `tellThread()`.
   - (6) Modules: `#include`, hoisted functions, implicit includes `file.func`, `redirect`, `killRedirect`.
   - (7) Numbers & data: division by zero, fractional exponents via `fmath`, `NaN`, multi-dimensional arrays, maps `m["key"]`, `kill()`.
   - (8) Sandboxed file I/O round-trips through AD-17 requests (`openFileInput`, `fileInput`, `openFileOutput`, `filePrint`, etc.).
   - (9) Source-hash and compiler mismatch restart on snapshot restore.
2. In `packages/runner-harness/src/script-host.ts`, support `loader` in host initialization/restoration and service `input.key` waits from `inputs: readonly InputRecord[]` so that `cursorMapRun` and `wait()`/`pause()` in `start.prg` complete headlessly with scripted input without domain doubles.
3. In `packages/core/src/script/catalogue-responders.ts`, add the two missing catalogue entries `fbranch` and `newplyr` as documented aliases so all 282 catalogue names resolve under `CATALOGUE_PLUGIN`.
4. In `packages/core/src/script/vm.ts`, clone `result.wait` when recording effect logs to prevent subsequent wait-resolution mutation (such as setting `thread.wait.key`) from altering historical `vm.effects` records, ensuring bit-identical hashState parity between fresh and restored runs.
5. In `packages/runner-harness/src/corpus.ts`, implement the corpus runner, scripted input drivers for `demo/Prg/start.prg`, `Basic/Prg/start.prg`, `system.prg`, and the synthetic TK2 program, and assert catalogue completeness (all 282 catalogue names and all mapped TK2 commands).
6. In `packages/runner-harness/src/job.ts` and `packages/runner-headless/src/index.ts`, wire the script corpus into `goldenJob` and `golden/scripts/golden.json`. The golden job runs every program headlessly with scripted input and verifies random-step snapshot restore parity via `checkSnapshotRestore`.

## Boundaries & Constraints

**Always:**
- Follow G1 (explicit step machine, PlainData state, JSON snapshot serialization), G2 (no DOM/Node I/O in core), G3 (deterministic execution, fixed ticks, injected RNG and clock), G5 (headless golden tests pass; golden changes deliberate and explained), G6 (licence allowlist), G7 (clean-room: docs only, no opening `../rpgtoolkit`).
- Use the stubs and responders of tickets 3.21 and 3.22; do not write hand-written domain doubles for drawing, audio, or battle commands.
- Check catalogue completeness: all 282 command names in `docs/spec/engine/rpgcode-functions.md` must resolve.
- All mapped TK2 commands in `discovery/tk2-rpgcode-commands.csv` must resolve.
- Fail the golden job if any program cannot restore or if its state hash diverges after snapshot restoration.

**Never:**
- Never commit whole legacy games (G5 rule 4).
- Never allow `vm.effects` to be retroactively mutated by runtime wait resolution.
- Never weaken or bypass existing `goldenJob` test-double checks.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|---|---|---|---|
| Synthetic Programs 1–9 | Each synthetic script from `discovery/language-readiness.md` | Runs to completion; state hash is deterministic | Throws on parse or runtime error |
| `start.prg` (demo & Basic) | Scripted input: `"0"` for `cursorMapRun`, `"ENTER"` for `wait`/`pause` | Runs through `intro()`, completes via `end()` in 3 ticks | Deadlock or unhandled wait throws |
| `system.prg` | Standalone execution | Defines classes/methods; finishes in 1 tick | Error on compilation throws |
| Synthetic TK2 Program | TK2 dialect `#` prefixes, sigils, `{}` blocks, loose text, `=` equality | Compiles and executes against stubs & TK2 compat plugin | Rejects TK 1.x syntax with located error |
| Random-step snapshot | For every program, split at `randomSplit(seed, ticks)` | `checkSnapshotRestore` passes; every tick post-split has identical `stateHash` | Divergence names first mismatching tick and throws |
| Catalogue completeness | Scan of all 282 names from `docs/spec/engine/rpgcode-functions.md` | All 282 resolve in `services.commands` | Missing name throws with name listed |
| TK2 mapped completeness | Scan of mapped commands from `tk2-rpgcode-commands.csv` | All mapped commands resolve in registry or compiler keywords | Missing command throws |
| Golden job compare | `pnpm golden` | Runs vectors, run, batching, double golden, and script golden | Mismatch exits 1 |

</frozen-after-approval>

## Proposed rulings (pending owner review)

1. **`ScriptHost` services `input.key` waits from `inputs: readonly InputRecord[]`**:
   When a thread is in `waiting` state with `wait.kind === "input.key"`, key-down events (`record.event.kind === "key" && record.event.down`) assign `wait.key = record.event.name` and are recorded as `consumed`. For `start.prg`, scripted input `"0"` selects choice 0 (New Game) for `cursorMapRun`, and `"ENTER"` satisfies `wait()` and `pause()`.
   *Evidence:* `packages/core/src/script/waits.ts:31` (`pollInputKey` wakes when `wait.key !== null`), `discovery/language-readiness.md:230` ("Completion therefore needs cursorMapRun to be scripted to return 1 or 2"). Alternative rejected: inventing a special non-standard hook, because `inputs` is the standard engine input mechanism (AD-14).

2. **`EffectRecord.wait` shallow cloning**:
   `recordEffect` stores `{ ...result.wait }` rather than the live mutable `result.wait` reference passed to `thread.wait`.
   *Evidence:* In-place wait resolution (e.g. setting `thread.wait.key`) mutated `vm.effects` in the fresh run but not in the restored run (where `JSON.parse` created distinct objects), causing snapshot hash divergence. Alternative rejected: prohibiting `thread.wait.key` mutation, because `pollInputKey` requires `wait.key` to be set to wake the thread.

3. **`CATALOGUE_RESPONDERS_PLUGIN` aliases for `fbranch` and `newplyr`**:
   Add `fbranch` (flow-control alias of `branch`) and `newplyr` (mixed alias of `newplayer`) to `ROWS` in `packages/core/src/script/catalogue-responders.ts`.
   *Evidence:* `docs/spec/engine/rpgcode-functions.md:13` explicitly lists `fbranch` and `newplyr` as members of the 282-name catalogue. Adding them to `ROWS` ensures `CATALOGUE_PLUGIN` covers all 282 functions without depending on external plugins.

## Code Map

- `packages/core/src/script/catalogue-responders.ts` — add `fbranch` and `newplyr` to `ROWS`.
- `packages/core/src/script/vm.ts` — clone `result.wait` when recording effect logs.
- `packages/runner-harness/src/script-host.ts` — support `loader` in host init/restore; service `input.key` waits in `advance()`.
- `packages/runner-harness/src/corpus.ts` — define synthetic programs 1–9, sample program runners, TK2 synthetic runner, snapshot-restore verifier, and catalogue completeness asserts.
- `packages/runner-harness/src/job.ts` — wire script corpus into `goldenJob`.
- `packages/runner-headless/src/index.ts` — read `golden/scripts/golden.json` in `runGolden()`, pass to `goldenJob()`, and write on `--record`.
- `golden/scripts/golden.json` — committed golden expectation for script suite.
- `packages/runner-harness/test/corpus.test.ts` — unit test suite for corpus execution, snapshot restore, and catalogue completeness.
- `packages/runner-harness/test/job.test.ts` — unit tests for golden job scripts wiring and failure detection.

## Tasks & Acceptance

- [x] Add `fbranch` and `newplyr` to `catalogue-responders.ts` and clone `result.wait` in `vm.ts`.
- [x] Add `loader` support and `input.key` service to `script-host.ts`.
- [x] Implement `packages/runner-harness/src/corpus.ts` containing the 9 synthetic programs, `start.prg`/`system.prg` drivers, TK2 driver, and completeness assertions.
- [x] Wire `corpus` into `goldenJob` in `job.ts` and `runner-headless/src/index.ts`.
- [x] Record and commit `golden/scripts/golden.json`.
- [x] Add test suite `packages/runner-harness/test/corpus.test.ts` and extend `job.test.ts`.
- [x] Run all project gates (`typecheck`, `lint`, `fixtures:fetch`, `test:strict`, `golden`, `graph`, `licence`, `provenance`, `catalogue:check`) green.

**Acceptance Criteria:**
- Given the 9 synthetic programs, all compile and run headlessly to completion; when snapshotted at a random tick (`randomSplit`), restored VMs produce bit-identical `stateHash` values at every step.
- Given `fixtures/legacy/demo/Prg/start.prg` and `fixtures/legacy/Basic/Prg/start.prg`, both run to completion headlessly with scripted inputs against catalogue stubs with zero hand-written domain doubles.
- Given `fixtures/legacy/demo/Prg/system.prg` and `fixtures/legacy/Basic/Prg/system.prg`, both compile and run headlessly to completion.
- Given the synthetic TK2 program, it runs headlessly with stubs and `TK2_COMPAT_PLUGIN`.
- Given the catalogue of `docs/spec/engine/rpgcode-functions.md`, all 282 functions resolve.
- Given `discovery/tk2-rpgcode-commands.csv`, all mapped commands resolve.
- Given `pnpm golden`, the job runs every synthetic program plus `start.prg` and `system.prg`, compares random-step snapshot hashes, verifies golden hashes against `golden/scripts/golden.json`, and passes.
- A program that cannot restore or whose hash diverges fails the golden job.

## Verification

- `pnpm typecheck`
- `pnpm lint`
- `pnpm fixtures:fetch`
- `pnpm test:strict`
- `pnpm golden`
- `pnpm graph`
- `pnpm licence`
- `pnpm provenance`
- `pnpm catalogue:check`
**Results (2026-10-16):**
- `pnpm typecheck` passed cleanly across all packages.
- `pnpm lint` passed with 0 errors.
- `pnpm fixtures:fetch` verified demo and Basic fixtures cached.
- `pnpm test:strict`: 909 tests passed, 0 skipped.
- `pnpm golden`: all 5 stages passed (vectors: 20 rows ok; run: 24 ticks; batching: 1,3,S ok; golden: 24 compared; scripts: 14 programs ok (snapshot/restore verified)).
- `pnpm graph`: 0 dependency cruiser violations found (252 modules, 990 dependencies).
- `pnpm licence`: 0 violations found.
- `pnpm provenance`: scanned 356 files with 0 violations.
- `pnpm catalogue:check`: matches catalogue.
