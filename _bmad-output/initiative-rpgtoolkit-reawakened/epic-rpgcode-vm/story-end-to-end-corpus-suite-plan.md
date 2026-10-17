---
title: 'End-to-end corpus suite'
type: 'feature'
ticket: 19
created: '2026-10-16'
status: 'built'
baseline_revision: '71097e95b8141a24d2b95e58303fab58afd5bbad'
route: 'full'
risk: 'low'
context:
  - 'docs/guardrails.md'
  - 'docs/spec/engine/rpgcode-functions.md'
  - 'docs/spec/engine/rpgcode-dialects.md'
  - 'docs/spec/engine/rpgcode-language.md'
  - 'docs/spec/engine/rpgcode-errors-and-threads.md'
  - 'docs/adr/0004-script-ast-step-ir-and-plugins.md'
  - '_bmad-output/initiative-rpgtoolkit-reawakened/epic-rpgcode-vm/discovery/language-readiness.md'
  - '_bmad-output/initiative-rpgtoolkit-reawakened/epic-rpgcode-vm/discovery/inception-proposal.md'
  - '_bmad-output/initiative-rpgtoolkit-reawakened/epic-rpgcode-vm/epic-rpgcode-vm.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:**
Ticket 3.17 wired the nine synthetic discovery programs, the synthetic TK2 program, and two sample programs (`start.prg` and `system.prg`) into the golden job. However, the closing deliverable of epic 3 (CAP-5, ticket 3.19) requires an end-to-end corpus closing suite: one job that executes the whole fetched legacy corpus across both sample games (`demo` and `Basic`) headlessly with scripted input, using a defined finish line for programs that never end (`same state hash after N ticks`, per `discovery/language-readiness.md:253`). Currently, the remaining programs in the fetched corpus (`win.prg`, `oldman.prg`, `man.prg`, `man_wander.prg`, `sys_test.prg` in `demo`, and `wander.prg` in `Basic`) are not part of the corpus suite, `run("man.prg")` in `man_wander.prg` does not resolve sibling `.prg` files through the loader, and `checkSnapshotRestore` does not pass post-split scripted inputs to both hosts, preventing full corpus verification.

**Approach:**
1. In `packages/core/src/script/vm.ts`, update `action === "run"` so that when a loader is available and `resolveProgram(services.loader, target)` resolves a `.prg` asset under `Prg/`, `run(target)` lower and lowers that file as a `fileProgramRef`, allowing `man_wander.prg` to transfer control to `man.prg` as intended in legacy RPGCode while preserving inline text evaluation when no matching file asset exists.
2. In `packages/runner-harness/src/restore-check.ts`, extend `checkSnapshotRestore` to accept an optional `inputsForTick?: (tick: number) => readonly InputRecord[]` so that both fresh and restored hosts receive identical scripted inputs at ticks `split .. ticks`.
3. In `packages/runner-harness/src/corpus.ts`:
   - Add the definitions and scripted inputs for all remaining programs in the fetched legacy corpus:
     - `sample-win-demo` (`demo/Prg/win.prg`, 2 ticks, `ENTER` on tick 1)
     - `sample-oldman-demo` (`demo/Prg/oldman.prg`, 2 ticks, `ENTER` on tick 1)
     - `sample-man-demo` (`demo/Prg/man.prg`, 2 ticks, `ENTER` on tick 1)
     - `sample-man-wander-demo` (`demo/Prg/man_wander.prg`, 4 ticks, `ENTER` on tick 3 to complete intercepted `man.prg`)
     - `sample-sys-test-demo` (`demo/Prg/sys_test.prg`, 1 tick, 0-byte file)
     - `sample-wander-basic` (`Basic/Prg/wander.prg`, 5 ticks, defined finish line for the infinite `wander("target")` loop)
   - Expose `buildCorpus()` with all 20 programs (10 synthetic/TK2 + 10 legacy programs covering the complete fetched corpus for both games).
   - Add helper functions to load and run the fetched corpus directly from disk fixtures (`fixtures/legacy/demo` and `fixtures/legacy/Basic`).
4. In `packages/runner-headless/src/index.ts`, add the `corpus` CLI subcommand (`pnpm corpus`) to execute the end-to-end corpus suite directly over the fetched legacy fixtures and verify every program's execution, defined finish line, and snapshot-restore parity.
5. In `golden/scripts/golden.json`, update the committed golden expectation to include all 20 programs.
6. In `packages/runner-harness/test/corpus.test.ts`, add comprehensive tests asserting:
   - Full 20-program corpus execution and random-step snapshot restore parity.
   - Direct execution of all 10 legacy programs from `fixtures/legacy/demo` and `fixtures/legacy/Basic`.
   - Defined finish line behavior for `Basic/Prg/wander.prg` (identical state hash across straight and restored runs after 5 ticks).
   - Drift detection: a mismatch in state hash or restore under the finish line fails the suite.
   - `run("man.prg")` file resolution in `man_wander.prg`.

## Boundaries & Constraints

**Always:**
- Follow G1 (explicit step machine, PlainData state, JSON serialization for snapshots), G2 (no DOM/Node I/O in `core`), G3 (deterministic execution, fixed ticks, injected RNG and clock), G5 (headless golden tests pass; golden changes deliberate and explained), G6 (licence allowlist), G7 (clean-room: docs only, never open `../rpgtoolkit`).
- Use the stubs and responders of tickets 3.21 and 3.22; do not write hand-written domain doubles for drawing, audio, or battle commands.
- Run all 10 programs in the fetched corpus across both games (`demo` and `Basic`).
- Defined finish line for `wander.prg`: 5 ticks with identical state hash between fresh and restored runs.
- Fail the suite if any program's result or restore hash drifts under the finish line.

**Never:**
- Never commit whole legacy games to the git repository (G5 rule 4).
- Never allow an infinite loop to hang without a defined tick finish line.
- Never regress existing golden test double checks or synthetic script checks.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|---|---|---|---|
| `win.prg` (demo) | Scripted input `"ENTER"` at tick 1 | Clears dialogue, erases item, finishes at tick 2 | Hang or missing wait throws |
| `oldman.prg` (demo) | Scripted input `"ENTER"` at tick 1 | Prints intro text, clears wait, finishes at tick 2 | Hang or missing wait throws |
| `man.prg` (demo) | Scripted input `"ENTER"` at tick 1 | Prints challenge, runs `fightEnemy`, finishes at tick 2 | Hang or missing wait throws |
| `man_wander.prg` (demo) | Tick 0 movement wait, tick 1 intercept, tick 2 `man.prg` start, tick 3 `"ENTER"` | Intercepts player, transfers control via `run("man.prg")`, completes at tick 4 | Unresolved file or hang throws |
| `sys_test.prg` (demo) | 0-byte file | Compiles cleanly to empty op list, finishes at tick 1 | Non-zero error throws |
| `wander.prg` (Basic) | Infinite `while (true) { wander("target"); }` | Runs for defined finish line (5 ticks); fresh and restored snapshot runs produce identical state hash | Hash divergence throws |
| `pnpm corpus` | `fixtures/legacy` populated via `pnpm fixtures:fetch` | Runs all 10 fetched programs, verifies snapshot restore and finish lines, exits 0 | Missing fixtures or drift exits 1 |
| Hash drift | Mutated state or expectation | Compare detects mismatch, names differing program | Exits non-zero with error |

</frozen-after-approval>

## Proposed rulings (pending owner review)

1. **`run(program)` resolves file programs when a loader is present and the asset exists in the loader's index; otherwise it treats `program` as inline source**:
   In RPGCode 3.1, `run(string program)` is defined as "Transfer control to a different program" (`docs/spec/engine/rpgcode-functions.md:68`, `docs/spec/engine/rpgcode-language.md#lexical-rules`). In the legacy corpus, `demo/Prg/man_wander.prg:35` calls `run("man.prg")`, transferring execution to the sibling file `man.prg`. Resolving through `resolveProgram(services.loader, target)` when available ensures that legacy `.prg` files transferred to by `run` execute their intended source rather than treating the filename string as inline code statements, while preserving inline execution in tests where no loader or matching asset exists.
   *Evidence:* `demo/Prg/man_wander.prg:35` (`run("man.prg")`), `demo/Prg/man.prg:1-8` ("Program that runs when intercepting the item"), `docs/spec/engine/rpgcode-language.md:88` ("run(prg) ends the calling program before it starts the new one"). Alternative rejected: treating `run()` exclusively as inline code, because `run("man.prg")` would execute dummy member expressions on undefined variables instead of running the target script.

2. **Defined finish line for programs that never end (`Basic/Prg/wander.prg`) is a bounded tick horizon (5 ticks), where completion is defined as reaching the tick horizon with identical state hash between fresh and restored runs across random splits**:
   `discovery/language-readiness.md:253` explicitly observes: "Basic `wander.prg` never ends by itself, so 'finishes with identical results' is undefined for it. A step budget or 'same state hash after N steps' comparison has to define the finish line." Ticket 3.19 specifies "using a defined finish line for programs that never end (`same state hash after N ticks`, per the discovery)." 5 ticks exercises multiple loops with step-budget preemption, verifying determinism and snapshot-restore parity without excessive execution time.
   *Evidence:* `discovery/language-readiness.md:253`, `discovery/inception-proposal.md:78`. Alternative rejected: arbitrary infinite execution or timeout, because headless CI requires deterministic, bounded completion.

3. **`checkSnapshotRestore` accepts optional `inputsForTick` to service post-split ticks in both fresh and restored hosts**:
   In straight runs, interactive/scripted inputs (e.g. cursor choices, dialog confirmations) are supplied per tick. When snapshotting at an intermediate tick `split < ticks`, the restored host resumes from `split` and requires the remaining tick inputs to reach identical completion. Passing `inputsForTick` into `checkSnapshotRestore` ensures that both fresh and restored hosts receive the scheduled inputs at ticks `split .. ticks`.
   *Evidence:* `packages/runner-harness/src/restore-check.ts:48-57`. Alternative rejected: testing snapshot restore without input after split, which leaves hosts blocked on wait indefinitely whenever a split occurs before all inputs are consumed.

4. **Corpus suite covers the entire fetched corpus (both `demo` and `Basic` games, all 10 `.prg` files) both directly against `fixtures/legacy` and wired into the headless golden job**:
   Ticket 3.19 requires "one job that runs the whole fetched corpus (both games) headlessly with scripted input". The fetched fixtures contain 7 programs in `demo/Prg/` (`win.prg`, `system.prg`, `sys_test.prg`, `start.prg`, `oldman.prg`, `man_wander.prg`, `man.prg`) and 3 in `Basic/Prg/` (`wander.prg`, `system.prg`, `start.prg`). Incorporating all 10 programs into `buildCorpus()` and supporting direct execution against `fixtures/legacy` provides both CI golden verification (G5) and end-to-end fixture execution.
   *Evidence:* Ticket 3.19 description and verify criteria, `fixtures/legacy/{demo,Basic}/Prg/*.prg`. Alternative rejected: testing only `start.prg` and `system.prg`, which leaves half the corpus unexercised by G5.

## Code Map

- `packages/core/src/script/vm.ts` — resolve `run(target)` via `resolveProgram(services.loader, target)` when asset exists.
- `packages/runner-harness/src/restore-check.ts` — support `inputsForTick` in `checkSnapshotRestore`.
- `packages/runner-harness/src/corpus.ts` — add the 6 remaining legacy programs to `buildCorpus()` (20 programs total) and export `runFetchedCorpus` for direct execution against `fixtures/legacy`.
- `packages/runner-headless/src/index.ts` — add `corpus` subcommand to CLI for standalone execution of the fetched corpus suite.
- `package.json` — add `"corpus"` script.
- `golden/scripts/golden.json` — update golden hashes to include all 20 programs.
- `packages/runner-harness/test/corpus.test.ts` — unit/integration tests for 20-program corpus, fetched fixtures suite, finish line, and drift detection.
- `packages/runner-headless/test/cli.test.ts` — verify `corpus` CLI command.

## Tasks & Acceptance

- [x] In `vm.ts`, implement file resolution for `action === "run"` when `services.loader` is present.
- [x] In `restore-check.ts`, extend `checkSnapshotRestore` with `inputsForTick`.
- [x] In `corpus.ts`, implement `sample-sys-test-demo`, `sample-win-demo`, `sample-oldman-demo`, `sample-man-demo`, `sample-man-wander-demo`, and `sample-wander-basic`.
- [x] In `corpus.ts`, implement `runFetchedCorpus` to execute the whole fetched corpus directly over `fixtures/legacy`.
- [x] In `runner-headless/src/index.ts`, add the `corpus` subcommand.
- [x] Update `golden/scripts/golden.json` with all 20 programs and verify `pnpm golden`.
- [x] Add tests in `packages/runner-harness/test/corpus.test.ts` and `packages/runner-headless/test/cli.test.ts`.
- [x] Run all project CI gates green.

**Acceptance Criteria:**
- Given the whole fetched corpus from both sample games (`demo` with 7 `.prg` files and `Basic` with 3 `.prg` files), all 10 programs run headlessly with scripted inputs to their defined finish lines.
- Given `Basic/Prg/wander.prg`, it runs for 5 ticks, and random-step snapshot restore verifies identical state hashes between fresh and restored hosts at every tick.
- Given `demo/Prg/man_wander.prg`, it intercepts the player, transfers control to `man.prg` via `run("man.prg")`, and completes headlessly upon receiving key input.
- Given `pnpm golden`, all 5 stages pass including Stage 5 comparing 20 programs against `golden/scripts/golden.json`.
- Given `pnpm corpus`, all 10 programs in `fixtures/legacy` run and pass.
- Given any program whose hash or restore drifts under the defined finish line, the suite fails.

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
- `pnpm corpus`

**Results (2026-10-16):**
- `pnpm typecheck`: cleanly passed across all 6 workspace packages and test tsconfigs.
- `pnpm lint`: passed with 0 errors.
- `pnpm fixtures:fetch`: verified cached demo and Basic fixtures.
- `pnpm test:strict`: all tests passed with 0 skipped.
- `pnpm golden`: all 5 stages passed (vectors: 20 rows ok; run: 24 ticks; batching: 1,3,S ok; golden: 24 compared; scripts: 20 programs ok (snapshot/restore verified)).
- `pnpm corpus`: all 10 fetched legacy programs passed across both games.
- `pnpm graph`: 0 dependency cruiser violations.
- `pnpm licence`: 0 violations.
- `pnpm provenance`: scanned files with 0 violations.
- `pnpm catalogue:check`: matches catalogue.
