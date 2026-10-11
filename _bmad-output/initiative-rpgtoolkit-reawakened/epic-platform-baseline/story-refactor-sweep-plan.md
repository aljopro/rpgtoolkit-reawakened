---
title: 'Refactor sweep'
type: 'story'
ticket: '11'
created: '2026-10-10'
status: 'built'
baseline_revision: 'eddc75c87ad8939f77bb816c6c430ec8baf4627d'
route: 'full'
route_source: 'auto'
risk: 'low'
review: 'quick'
review_source: 'pinned'
lenses_ran: ['quick']
review_loop_iteration: 1
context: ['{project-root}/docs/guardrails.md', '{project-root}/_bmad-output/initiative-rpgtoolkit-reawakened/deferred-work.md', '{project-root}/_bmad-output/initiative-rpgtoolkit-reawakened/epic-platform-baseline/tickets.toml']
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Earlier entries deferred findings "for the sweep" with no checklist pinning them. Two are live: the G6 licence gate is silent through a symlink, and entry 2's tracer plus entry 9's copied test shims remain.

**Approach:** One mechanical, suite-provable pass: fix the licence `isMain` guard, delete core's `add` tracer, de-duplicate the `node-test.d.ts` shims, move `fixtures:test` into the required `unit` job and delete `fixtures.yml` (subject to Open Question 2), append the tickets.py finding plus a `## Resolved` section to `deferred-work.md`, and account for every other deferred item below. No behaviour, golden or contract change.

## Boundaries & Constraints

**Always:** each task names its deferred source; the required set in Verification stays green; G1–G7 unchanged; `core` keeps `lib: ["ES2022"]`, `types: []`, no host imports.

**Never:** touch `Math`/clock/RNG, `core/{canon,ports,validate}` or their exports (`core` is `private` at `0.0.0`, so removing `add` releases nothing); edit `golden/**` (G5.3); edit entries 1–12's plans or frontmatter; edit `deferred-work.md` in place (append only); implement the engine/VM/audio/DAP/web-runner items (§4–§20); add `merge_group:` for a queue that does not exist; edit `_bmad/method/**`; rename a required job id.

</frozen-after-approval>

## Deferred inventory

Keys: `dw` = `deferred-work.md` (`§N` = entry); `1.9 L129` = that plan, line 129. Verdicts checked at `eddc75c`.

| # | Source | Item | Verdict |
|---|--------|------|---------|
| 1 | dw §1, provenance L129 | `check.mjs` `isMain`: unresolved `argv[1]` vs symlinked `import.meta.url` | **In — S1.** Real run prints `Licence check PASSED. … 134 packages`; symlinked: silent, exit 0; the other three tools realpath (F10). |
| 2 | §2 | `fixtures/` missing from `scope.skipRootPaths` | **Resolved** by 1.7. |
| 3 | §3 | golden must run `fixtures:check` | **Resolved** (`ci.yml`). |
| 4 | §4 (1.8 F8) | `encodeLog` not total | **Other epic** — rpgcode-vm (E-99 first). |
| 5 | §5 (1.8 F10) | `canon` unbound depth | **Other epic** — VM (AD-17). |
| 6 | §6 (1.8 F11) | `canon` ~13× `JSON.stringify` | **Other epic** — engine. |
| 7 | §7 (1.9) | focus-pause replay (E-03) | **Other epic** — engine. |
| 8 | §8 (1.9) | `audio.ended` / `video.ended` | **Other epic** — audio-synth. |
| 9 | §9 (1.9) | `./testing` export | **Other epic** — lsp/dap. |
| 10 | §10 (1.9) | driver rejects non-empty `requests`/`diagnostics` | **Other epic** — engine. |
| 11 | §11 (1.10) | `merge_group:` if a queue exists | **Not doing** — none. |
| 12 | 1.9 L129 | core `add` + copied `node-test.d.ts` | **In — S2, S3.** |
| 13 | 1.10 D3, M1 | `fixtures.yml` non-required, sole run of the tool's tests | **In — S4, pending OQ 2.** |
| 14 | accepts: 1.8 F9/F13, 1.10 N2, 1.12 r2-n1…n3 | documented tripwire, V8 and unreachable-value limits | **Not in scope** — accepted. |
| 15 | planning find | `tickets.py find` aborts on block `context:` lists (ten plans) | **Logged — S5.** |
| 16 | 1.1 L50 | `CLAUDE.md` G3 stale | **Resolved** (entry 1, `bb6c540`). |
| 17 | defers: 1.3 f15, 1.4 item 11 | `Math` string-indexing bypass; `./testing` rule gap (`graph.mjs:233`) | **Recorded, not in scope** (F3). |
| 18 | 1.8 L186 | `createEngine` / `RunConfig` out of contract | **Other epic** — engine (F2). |
| 19 | 1.8 L41 | runner loops, synthesis, headless "to ticket 9" | **Resolved** by 1.9; synthesis → audio epic (F2). |
| 20 | epic Notes L47 | G1 snapshot test → rpgcode-vm; browser G3 replay → web-runner-packaging | **Other epic** — closer's ledger (F4). |

## Code Map

- `tools/licences/check.mjs:437` — the broken guard; `scan.mjs:628`/`fetch.mjs:610` realpath both sides and `tools/provenance/test/provenance.test.mjs:911` is the regression-test model. `tools/deps/graph.mjs`, `tools/check-core-deps.mjs`, `packages/runner-headless/src/cli.ts`: read-only, reasons in Design Notes.
- `tools/licences/test/licences.test.mjs` — has `withTempWorkspace` + `spawnSync`; gains the symlink row. `packages/core/src/index.ts:1-3` (`add`) + `packages/core/test/index.test.ts` — tracer and its only test.
- `packages/{core,runner-harness,synth}/test/node-test.d.ts` — three drifted copies (harness adds unused `ok`/`notEqual`/`match`); their `tsconfig.test.json` `include`s; new root `types/node-test.d.ts`. `core`'s `node-env.d.ts` stays; `runner-headless` untouched.
- `.github/workflows/ci.yml` (`unit`); `.github/workflows/fixtures.yml` (deleted (a) / trimmed (b) / unchanged (c)); `CONTRIBUTING.md:27,42-44,54`; `deferred-work.md` append only.

## Tasks & Acceptance

**Execution:**
- [x] `tools/licences/check.mjs` — `realpathSync` both sides of the `isMain` guard — §1.
- [x] `tools/licences/test/licences.test.mjs` — invoke the CLI through a symlinked directory, assert the pass summary on stdout — regression for §1.
- [x] `packages/core/src/index.ts`, `packages/core/test/index.test.ts` — delete `add` and its test — 1.9 L129.
- [x] `types/node-test.d.ts` (new; exactly `test`, `equal`, `deepEqual`, `throws`), the three copies deleted, three `include`s added, `runner-headless` excluded — 1.9 L129, F6.
- [x] `.github/workflows/ci.yml` `unit` gains `pnpm fixtures:test`; `fixtures.yml` deleted; `CONTRIBUTING.md` corrected — 1.10 D3 + M1 — **only under OQ 2 (a)**.
- [x] `deferred-work.md` — append the tickets.py entry, two F10 notes (unguarded script-only tools; `cli.ts`'s one-sided realpath) and a trailing `## Resolved` section, editing no existing entry: §2 by 1.7 (`scope.skipRootPaths` lists `"fixtures"`), §3 by 1.9, `CLAUDE.md G3 summary (entry 1.1 plan L50) — by entry 1 (bb6c540)` — §§2–3, 15, 16 + OQ 1.

**Acceptance Criteria:**
- Given `node <symlink>/check.mjs`, then stdout carries `Licence check PASSED.` and the violation count (before: no output, exit 0).
- Given S2/S3, then `typecheck && lint && test` are green, `find . -name node-test.d.ts` matches one file, and dropping the shared `include` fails with `TS2591`.
- Given S4 under OQ 2 (a), then `unit` runs `fixtures:test`, `golden` still runs fetch + check, no required job id changed, and the `fixtures` check is gone.
- Given the required set, then all green with no golden change and `deferred-work.md` altered only by appended lines.

## Implementation Notes

- **What changed.** S1: `tools/licences/check.mjs`'s entry guard resolves both `argv[1]` and `import.meta.url` with `realpathSync` (the `tools/provenance/scan.mjs` pattern), plus a symlink regression row that fails against the old file and passes against the new one. S2: core's `add` tracer and its only test are gone. S3: one shared `types/node-test.d.ts` (declaring exactly `test`, `equal`, `deepEqual`, `throws`) replaces three drifted per-package copies and is included by the three `tsconfig.test.json` files. S4: `pnpm fixtures:test` moved into the required `unit` job and `.github/workflows/fixtures.yml` deleted; `CONTRIBUTING.md` corrected. S5: two new deferred entries (the `tickets.py` frontmatter abort; the unguarded `graph.mjs`/`check-core-deps.mjs` and the one-sided `cli.ts` realpath) plus a `## Resolved` section for §1, §2, §3 and the CLAUDE.md item.
- **Decisions (human, 2026-10-11, at the approval checkpoint).** `deferred-work.md` is closed with a trailing `## Resolved` section, existing entries untouched; `fixtures.yml` is deleted and its tests became required, superseding entry 1.10's Decision 3, which had allowed trimming only.
- **Test count.** `pnpm test` is 77, one fewer than before, because S2 deleted the tracer's test; the licence tool's suite grew to 27.
- **Accepted limits (review).** Nothing asserts that core's public surface stays minimal, and nothing enforces "exactly one `node-test.d.ts`", so S2 and a future re-drift are not caught by a test; the S4 step is observable only in CI. Recorded in the triage, not fixed.

## Plan Change Log

## Review Triage Log

Independent context-free review by review-1-11 (report `/tmp/review-1-11.md`), with the pre-fix licence tool recovered from `eddc75c` and a cold-cache fixtures run. Result: 0 blockers, 1 major, 2 minor, 7 nit.

| # | Finding | Verdict | Route | Evidence / action |
|---|---------|---------|-------|-------------------|
| F1 | The `## Resolved` section omitted §1, the licence-guard item this entry itself fixed | major | patch | A §1 line was appended with the fix and its regression evidence. |
| F2 | The new `tickets.py` evidence blamed `cmd_find`; the abort comes from the strict re-parse in `load_folder`, and `find`/`status`/`next`/`pull` all fail identically | minor | patch | The evidence and the plan's two citations were corrected. |
| F3 | `types/node-test.d.ts` is untracked, so a careless `git commit -a` would omit it and break the required `typecheck` job | minor | accept | New files are untracked until the entry's commit, which stages it explicitly (shown in the staged list); recorded here. |
| n1 | The new licence row asserted only the pass banner, not the package count the plan's AC 1 names | nit | patch | Both symlink variants now also assert `Total (prod + dev) packages checked: <n>`. |
| n2 | The shared shim's comment said "core's tsconfig" although it serves three packages | nit | patch | Comment reworded. |
| n3 | The plan cited "1.10 N2" for the CONTRIBUTING/`fixtures.yml` finding | nit | patch | Corrected to 1.10 M1; the provenance-path nit keeps N2. |
| n4 | The plan's Verification chain omitted `pnpm audit --prod`, a step of the required `licence` job | nit | patch | Added to the chain. |
| n5 | The plan's Execution boxes were unchecked | nit | patch | Ticked at mark-built. |
| n6 | `fixtures:test` measured 22.3 s on a busy machine, not 18-19 s | nit | patch | The plan now says roughly 18-22 s. |
| n7 | `runner-headless/src/cli.ts` resolves only one side and is a silent no-op under `--preserve-symlinks-main` | nit | accept | Latent only (no such flag anywhere in the repo); logged in `deferred-work.md` with the other guard findings. |

Verified by the reviewer running it: the S1 defect reproduced on the pre-fix file through file and directory symlinks and fixed on the working tree; the new row fails against the old file and passes against the new; `tickets.py` aborts for `find`/`status`/`next`/`pull`; the fixtures cache cold-started and still reached `golden: 24 compared`; `fixtures:test` passes with the network denied; `deferred-work.md`'s diff is append-only and each `## Resolved` line is true against the tree; the 20-row inventory accounts for every deferred item; the full local chain is green (77/77 unit, 27/27 licence, 8/8 graph, 56/56 provenance, 49/49 fixtures, 24 golden steps, `pnpm audit --prod` clean) with no guard-rail, golden, dependency or job-id impact.

## Design Notes

- **Shim (verified).** Each `tsconfig.test.json` includes `"../../types/node-test.d.ts"`. In a scratch copy at `eddc75c`, on `tsc` 7.0.2 (the scripts' compiler) and `tsc6` 6.0.3: exit 0 with it, `TS2591` without it, and no `TS6059` above `rootDir: "."` under `noEmit`. The four members are exactly what every test uses; the harness copy's `ok`/`notEqual`/`match` are unused and go. `runner-headless` keeps `types: ["node"]`, no include.
- **`fixtures:test` moves to `unit`.** `pnpm test` globs only `packages/*/test/*.test.ts`, so the tool's tests need a job before `fixtures.yml` goes. Offline (own git fixtures) but ~18–22 s locally (49 tests). Only `CONTRIBUTING.md:27,54` names the file elsewhere (1.10 M1, accepted).
- **Other entry guards (F10).** `graph.mjs`/`check-core-deps.mjs` export nothing and every call site spawns them (`graph.test.mjs:80`, `lint-rules.test.ts`, `package.json`) — script-only, guard-free by design, logged not fixed. `cli.ts` realpaths one side only, but Node realpaths the main module by default, so it still detects the entry through a symlinked directory (observed `golden: 24 compared`); only `--preserve-symlinks-main`, unused, could mis-detect — left, noted in the same S5 entry.
- **S4 reverses an approved decision.** 1.10's Decision 3 allowed trimming only; deleting the workflow and making `fixtures:test` required is more, so OQ 2 re-carries it — (b) is the variant it already covers.
- **Resolution marking is an append.** Existing entries are immutable, so §2, §3 and the CLAUDE.md item go in a trailing `## Resolved` section, each naming its source (OQ 1).
- **tickets.py logged, not fixed.** `_bmad/method/**` is method-owned; both fixes (the strict re-parse in `load_folder`; inline lists across ten plans) break the Never list.

## Verification

**Commands:**
- `node tools/licences/check.mjs` — pass summary, exit 0; then `d=$(mktemp -d) && ln -s "$PWD/tools" "$d/tools" && node "$d/tools/licences/check.mjs"` — same summary (before S1: silence, exit 0).
- `node --test tools/licences/test/licences.test.mjs` — 26 rows plus the symlink row.
- both halves of AC 2: `find . -name node-test.d.ts -not -path './node_modules/*' | wc -l` → `1`; with the `include` stripped from a copy of `packages/core/tsconfig.test.json`, `node_modules/.bin/tsc -p <copy> | grep -q TS2591` → match.
- `pnpm install --frozen-lockfile && pnpm typecheck && pnpm lint && pnpm test && pnpm graph:test && pnpm graph && pnpm licence:test && pnpm licence && pnpm audit --prod && pnpm provenance:test && pnpm provenance && pnpm fixtures:test && pnpm fixtures:fetch && pnpm fixtures:check && pnpm golden` — green; `golden` prints `N compared`, no mismatch.
- `git status --porcelain golden docs _bmad/method` — empty; `git diff -- deferred-work.md` shows only added lines, ending in `## Resolved`.
- a `node -e` shape assertion on `ci.yml`: ids still `typecheck lint unit golden licence provenance graph` + `gate`, and either `fixtures:test` in `unit` with `fixtures.yml` absent (OQ 2 (a)) or `fixtures.yml` present (b/c).

## Decisions (human, 2026-10-11, at the approval checkpoint)

1. **`deferred-work.md` closure**: append a trailing `## Resolved` section, one evidence line each for the items this entry verifiably resolved, naming each item's own source; do not edit any existing entry.
2. **`fixtures.yml` (Open Question 2, option a)**: move `pnpm fixtures:test` into the required `unit` job of `ci.yml` and delete `.github/workflows/fixtures.yml`. The human accepted this as a supersession of entry 1.10's Decision 3 (which had allowed trimming only), on the evidence that the fixtures tool's tests otherwise run in no required job, that adding them costs `unit` roughly 18-22 seconds (measured), and that no required job id changes.
3. The independent plan review found 0 blockers and 0 majors (6 minor, 4 nit); all ten corrections were folded in, including the measured `fixtures:test` cost and the entry-guard findings for `graph.mjs`, `check-core-deps.mjs` and `runner-headless/src/cli.ts` (no live bug; logged).
