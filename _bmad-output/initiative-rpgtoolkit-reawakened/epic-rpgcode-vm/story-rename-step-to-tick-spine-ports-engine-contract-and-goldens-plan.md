---
title: 'Rename step to tick: spine, ports, engine contract and goldens'
type: 'refactor'
ticket: '26'
created: '2026-10-12'
status: 'built'
baseline_revision: 'a0b41ba'
route: 'full'
route_source: 'auto'
risk: 'medium'
review: 'quick'
review_source: 'pinned'
lenses_ran: ['quick']
review_loop_iteration: 0
context: ['docs/guardrails.md', 'CLAUDE.md']
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** One fixed simulation update (1/60 s) is called a "step" in the spine, docs, `Engine` port, logs and goldens. "Step" is also the script VM's own unit (Step IR, `step(budget)`) and a legacy gameplay word (step-on, seconds per step), so entries 2 to 25 would blur three meanings. Jensen ruled on 2026-10-12 that the simulation unit is a **tick**, before entry 2 writes more code with the old name.

**Approach:** Doc-first (G7): amend the spine and docs in their own commit; then rename the `Engine` contract, the log and golden formats and the harness in code (goldens regenerated and explained, G5); then fix the open tickets' wording. Decide each hit by what advances: the simulation → tick; the VM's instructions or legacy gameplay → stays step.

## Boundaries & Constraints

**Always:**
- Rename in code and prose: fixed/time/simulation step, step counter, step pipeline, open-step cursor, mid-step, per-step budget → tick, tick counter, tick pipeline, open-tick cursor, mid-tick, per-tick budget. `StepReport`→`TickReport`, `stepsRun`→`ticksRun`, `stepAfter`→`tickAfter`, `advance(steps, inputs, maxSteps?)`→`advance(ticks, inputs, maxTicks?)`, `StepRecord`→`TickRecord`; the `step`/`steps` fields of `InputRecord`, `DrawList`, `time`, run.json and golden.json → `tick`/`ticks`; spine-only `secondsToSteps`, `fpsToSteps`, `originStep`, `stepsPerFrame` → `secondsToTicks`, `fpsToTicks`, `originTick`, `ticksPerFrame`. "Step" as a verb for the simulation advancing ("subsystems step", "threads keep stepping") → tick or advance. In human-facing docs, the first use of "tick" says what it is (one fixed update of the simulation).
- Keep `step` for: (1) the VM's own unit: step machine/VM (G1, ADR 0001, 0004), Step IR, `step(budget)`, "step budget" (VM steps allowed per tick), the "random step" snapshot test, the THR-3 "snapshot step" row (entry 3.9 rules it); (2) legacy gameplay: step-on, seconds per step, tile/pixel steps, steps walked (E-87, party `steps`), game-speed "per step", `playerStep`/`itemStep`; (3) other meanings: build/CI/fixture/migration steps, algorithm steps, `for (init; cond; step)`, "first step, doc-first", debugger stepping; (4) records left as written: finished plans, reviews, discovery/research/provenance notes, memlogs, `deferred-work.md`, ADR 0002's `tick(dt)` history, entry 26's own text, entry 2's draft plan (refreshed when entry 2 starts, per the ticket note).
- Three local commits in this order, each staging only its named paths (never `git add -A`; no push): docs (G7), code with goldens, tickets.
- G5: `golden.json` is written only by `pnpm golden:record`; `run.json` and `hash-vectors.json` change only by renamed keys and the hash values that follow from them; `schema` stays 1; the hash algorithm is untouched. The code commit body says why each regenerated fixture changed.

**Never:** rename a VM, gameplay, algorithm or build "step"; rewrite records; change what any rule or contract requires (wording only: `docs/guardrails.md` reserves rule changes for an ADR), behaviour, `schema`, the hash algorithm or any dependency; edit `_bmad/`, entry 26's text or the entry 2 plan; push.

</frozen-after-approval>

## Code Map

Line numbers drift; `git grep -n -i step <file>` finds every hit.

Commit 1, docs:
- `_bmad-output/initiative-rpgtoolkit-reawakened/architecture-rpgtoolkit-reawakened/architecture-rpgtoolkit-reawakened.md` — the spine: front matter `paradigm` and `scope`, intro and layer table, G3 row, AD-1, AD-2 (retitle "Time is the tick counter"), AD-3, AD-5, the state table (`time`, `engine`), AD-12, AD-14, AD-17, AD-24, AD-26 (retitle "Tick pipeline and program modes"), camera bullets, consistency table, package tree, Deferred list. AD-9 has no step wording. `party`'s "steps" (walked) stays.
- `.../architecture-rpgtoolkit-reawakened/c4.md`, `.../spec-rpgtoolkit-reawakened/spec-rpgtoolkit-reawakened.md`, `.../spec-rpgtoolkit-reawakened/packages.md` — copies of the contract.
- `docs/guardrails.md` (G3 row, rule 2 and test; G5 rule 2), `docs/engine-features.md` (the loop intro, E-04), `docs/architecture-options.md` (R3, the seam's `advance`, the core table row), `docs/adr/0004-script-ast-step-ir-and-plugins.md` (subsystems, requests, threads), `CLAUDE.md` (G3 bullet).
- Expect no change: `docs/format-spec.md`, `docs/editor-features.md`, ADR 0001 and 0006, `README.md`, `CONTRIBUTING.md`, `.github/`.

Commit 2, code (behaviour identical):
- `packages/core/src/ports/{engine,input,draw,requests,bytes}.ts`, `packages/core/src/canon/log.ts` (comment).
- `packages/runner-harness/src/{driver,golden,job,index}.ts`, `src/double/test-engine.ts` — `Run.ticks`, `TickRecord`, parse and compare messages, `run: N ticks`. The `1,3,S` batch label stays.
- Tests: `packages/core/test/canon.test.ts`, `packages/core/test/fixtures/ports/good.ts` (`time: { tick }`), `packages/runner-harness/test/{driver,golden,job,double,vectors}.test.ts`, `packages/runner-headless/test/cli.test.ts`.
- Fixtures: `golden/test-double/run.json` (rename keys by hand), `golden/test-double/golden.json` (`pnpm golden:record`), `golden/hash-vectors.json` (rename `step` in the `hashState`, `hashDrawList` and `rev` inputs; recompute their hashes with a throwaway script calling `hashState`/`hashDrawList`).
- Leave: `packages/core/test/fixtures/script/clean.ts` (VM `step(budget)`), `fmath`, `formats/**`, `tools/**`, `runner-headless/src/dump/cli.ts`, `.github/workflows/ci.yml`.

Commit 3, tickets (open entries only; finished entries stay):
- `_bmad-output/initiative-rpgtoolkit-reawakened/epic-rpgcode-vm/tickets.toml` — 3.7, 3.8 (`StepReport`, "step report"); 3.9 (title, per-step budget, recorded step, open-step cursor, and the THR-1 note: `secondsToSteps`, "a tick is one fixed simulation step", same step, `sleep(steps)`); 3.13 (step pipeline); 3.19 (N steps); 3.21 (effect record field `step`, "drained per step").
- `.../epic-rpgcode-vm/epic-rpgcode-vm.md` (the `StepReport` decision line) and `.../epic-board-rendering/epic-board-rendering.md` (fixed-step loop, step pipeline, open-step cursor).

## Tasks & Acceptance

**Execution:**
- [ ] Docs: rename in every Commit 1 file; commit `docs: call the simulation unit a tick (epic 3.26)` with a plain-language body.
- [ ] Code: rename in every Commit 2 file; keep `1,3,S`; typecheck and test.
- [ ] Fixtures: rename `run.json`; run `pnpm golden:record`; recompute `hash-vectors.json`; run the proof script (Design Notes); commit `refactor(core,harness): rename step to tick in the engine contract and goldens (epic 3.26)` with a body explaining each fixture.
- [ ] Tickets: apply the Commit 3 edits; commit `chore(tickets): use tick wording in open epic 3 entries (3.26)`.
- [ ] Search: run the residual search (Verification) and list each remaining hit under its exception class in Implementation Notes.

**Acceptance Criteria:**
- Given the living files (everything outside exception class 4), when searching for the old names (`StepReport`, `stepsRun`, `stepAfter`, `StepRecord`, `maxSteps`, `secondsToSteps`, `fpsToSteps`, `originStep`, `stepsPerFrame`, "step counter", "step pipeline", "open-step", "per-step budget"), then nothing matches; and every other remaining "step" belongs to exception class 1, 2 or 3 and is listed.
- Given the spine, `docs/guardrails.md` and `docs/engine-features.md`, when read, then AD-1, AD-2, AD-3, AD-5, AD-14, AD-17, AD-24, AD-26 and G3 say tick and no rule calls the simulation unit a step.
- Given the old and the regenerated fixtures, when compared, then `run.json` differs only by `steps`→`ticks` and `step`→`tick`, `golden.json` keeps its 24 numbers under `tick`, and every changed hash equals the old input renamed then hashed.
- Given `pnpm golden`, when run, then it prints `run: 24 ticks` and passes, as does every command under Verification.
- Given `git log <baseline>..HEAD --stat`, when read, then commit 1 touches only docs and spec files, commit 2 only code, tests and golden files, commit 3 only tickets and epic files.

## Implementation Notes

- Three commits on `a0b41ba`: docs `3dc1e8d`, code and goldens `4a64137`, tickets `81f12a9` (amended once for the review patch).
- Fixture proof (throwaway script): baseline test engine over the old `run.json`, keys renamed `step`->`tick` deeply, hashed with the new `hashState`/`hashDrawList`; all 24 golden hashes and both changed `hash-vectors.json` hashes match. New hash constants also checked with an independent FNV-1a 64 oracle.
- The plan's `:(exclude)_bmad` pathspec does not exclude `_bmad-output/`; the residual search therefore also lists living BMAD files. Remaining hits are: VM step (step machine, Step IR, step budget, random step), legacy gameplay (step-on, seconds per step, steps walked), other meanings (CI/git steps, algorithm steps, debugger stepping), and records (entry 26's text, finished entry 1.8, memlogs, reviews, discovery, plans).
- Orchestrator re-ran typecheck, lint, test:strict (458 pass, 0 skipped), golden (`run: 24 ticks`), dump:check, graph, provenance, licence, fixtures:check: all pass.

Residual search (`git grep -n -I -i step -- . ':(exclude)_bmad' ...`, the Verification command). Every remaining hit is class 1, 2 or 3, except entry 26's own text at the end. Class 4 records (memlogs, reviews, discovery, `*-plan.md`, finished entries) are filtered out by the command's excludes or noted below.

**Class 1 — the VM's own unit (step machine / VM, Step IR, `step(budget)`, step budget, random-step snapshot, THR-3 "snapshot step", DAP stepping).** `.github/pull_request_template.md:8`; `CLAUDE.md:11`; `eslint.config.js:4`; `docs/guardrails.md:11,21,24,34`; `docs/adr/0001-typescript-core.md:21,37,47`; `docs/adr/0004-script-ast-step-ir-and-plugins.md:1,16,23,43,64,92,100,128,129,135`; `docs/architecture-options.md:19,89,164,210,240,266,282`; `docs/engine-features.md:42`; `docs/format-spec.md:1032` (THR-3 snapshot step row, ruled by entry 3.9); spine `:74` (G1 row); `epic-board-rendering.md:55` ("resumable step"); `epic-rpgcode-tooling.md:14,25` (DAP stepping); `epic-rpgcode-vm.md:3,10,14,23`; `epic-rpgcode-vm/tickets.toml:45,230,344`; `spec-.../packages.md:7,33`; `spec-.../spec-....md:65,66,82`; root `tickets.toml:26`; `packages/core/test/fixtures/script/clean.ts:2,4`.

**Class 2 — legacy gameplay (step-on, seconds per step, tile/pixel steps, steps walked, `playerStep`/`itemStep`, game-speed per step).** Spine `:162` (party `steps` walked), `:490` (legacy seconds-per-step); `epic-movement-triggers.md:14,24`; `spec-.../spec-....md:36`; `docs/editor-features.md:40,54,77,78,152`; `docs/engine-features.md:28,41,78,81,118,123,128,134,149,174,177,230,287,343`; `docs/format-spec.md:156,356,415,477,527,938,954,1183`; `packages/core/src/formats/actor/model.ts:248,346`; `formats/board/model.ts:181,217`; `formats/board/pre-vector-reader.ts:119`; `formats/main-file/model.ts:47,204`.

**Class 3 — other meanings (build/CI/fixture steps, algorithm steps, `for (init; cond; step)`, "first step, doc-first", provenance process step).** `.github/workflows/ci.yml:11,22,33,46,74,87,99,114` (YAML `steps:`); `docs/adr/0006-clean-room-spec-extraction.md:16`; `docs/editor-features.md:30,186`; `docs/format-spec.md:788,873,1087` (`for` step clause, ADR filename); `epic-rpgcode-vm.md:53`; `epic-rpgcode-vm/tickets.toml:8,54,71,88,144,162,181,200,246,299,316,326,368` ("first step, doc-first", ADR filename, two-step split); `packages/core/src/fmath/fmath.ts:350,366,552`; `formats/image/crc32.ts:36`; `formats/image/png.ts:64`; `formats/tileset/iso-diamond.ts:6,19,24`; `formats/tileset/tileset.ts:266`; `packages/runner-headless/src/dump/cli.ts:18`; `tools/fixtures/check.mjs:23,76`; `tools/fixtures/fetch.mjs:42,95,292,320,321,324,328,334,461,462,463,616`; `tools/fixtures/test/fixtures.test.mjs:644`; `tools/no-skips/run.mjs:11`.

**Class 4 — records left as written.** Entry 26's own text: `epic-rpgcode-vm/tickets.toml:26,27,28,35,37,39`. Finished entries (stay per Commit 3): `epic-platform-baseline/tickets.toml:85` (`StepReport` in the finished entry 1.8), `:97` ("differing step"). Memlogs, reviews, discovery/research notes and `*-plan.md` (entry 2's draft plan) are filtered out by the search command; they are not touched.

No old name in the boundary list (`StepReport`, `stepsRun`, `stepAfter`, `StepRecord`, `maxSteps`, `secondsToSteps`, `fpsToSteps`, `originStep`, `stepsPerFrame`, "step counter", "step pipeline", "open-step", "per-step budget") remains anywhere outside `_bmad`/`fixtures`.

## Plan Change Log

## Review Triage Log

Pass 1 (quick lens, 1 finding): high 0, medium 0, low 1, false 0, maybe-false 0.

| Verdict | Route | Finding and evidence |
|---|---|---|
| low | patch | Entry 3.9's THR-1 note read "a tick is one fixed simulation tick", a definition that defines nothing. Verified in `tickets.toml`; reworded to "one fixed simulation update" and amended into the tickets commit. |

## Design Notes

- Hard cases: "A blocking program that never yields is preempted at the per-tick budget" (AD-26); "Subsystems tick deterministically" (ADR 0004, a verb); "Other threads keep running" (ADR 0004); "`advance` consumes no ticks" (AD-5, AD-14, ADR 0004). The spine's "step-machine simulation core" (`paradigm`, intro) describes the whole core advancing per tick, so it becomes "tick-driven"; "step machine" stays only for the VM (G1). ADR 0004's "step budget per tick" is already final.
- Proof for the regenerated fixtures, a throwaway script in `/tmp`, never committed: run the baseline test engine (`git show <baseline>:packages/runner-harness/src/double/test-engine.ts`) over the old `run.json` to get each tick's old state and draw objects, rename keys `step`→`tick` deeply, hash with `hashState`/`hashDrawList`, and compare with the new `golden.json`; do the same for each `hash-vectors.json` input. Canonical key order means a text substitution is not equivalent.

## Verification

Dependencies and sample-game fixtures are already installed in this worktree.

**Commands:**
- `pnpm typecheck && pnpm lint && pnpm test:strict` -- expected: pass, no skipped tests
- `pnpm golden && pnpm dump:check && pnpm graph && pnpm provenance && pnpm licence && pnpm fixtures:check` -- expected: pass; golden prints `run: 24 ticks`
- `git grep -n -I -i step -- . ':(exclude)_bmad' ':(exclude)fixtures' ':(exclude)docs/provenance' ':(exclude)*discovery*' ':(exclude)*-plan.md' ':(exclude)*memlog*' ':(exclude)*reviews*' ':(exclude)*research-*' ':(exclude)*recovery-*' ':(exclude)*deferred-work.md'` -- expected: only exception class 1, 2 or 3 lines, plus entry 26's own text (`git grep -E` has no `\b` here, so search the bare word)
