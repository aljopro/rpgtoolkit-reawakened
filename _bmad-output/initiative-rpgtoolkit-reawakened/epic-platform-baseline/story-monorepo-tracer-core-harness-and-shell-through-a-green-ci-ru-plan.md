---
title: 'Monorepo tracer: core, harness and shell through a green CI run'
type: 'chore'
ticket: '2'
created: '2026-10-10'
status: done
baseline_revision: '449ad49c6a38722314844094cac50c7ac0fe951d'
route: 'full'
route_source: 'auto'
risk: 'low'
review: 'quick'
review_source: 'pinned'
lenses_ran: ['quick']
review_loop_iteration: 2
context: ['{project-root}/_bmad-output/initiative-rpgtoolkit-reawakened/architecture-rpgtoolkit-reawakened/architecture-rpgtoolkit-reawakened.md', '{project-root}/docs/guardrails.md', '{project-root}/CONTRIBUTING.md']
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** The repo holds docs only. Every later entry (lint, graph check, licence gate, golden job) needs a workspace, a package layout and a CI that runs, and nothing proves they connect.

**Approach:** Build the thinnest path through every layer: a pnpm workspace, the TypeScript pair, the built-in `node:test` runner, three packages (`core`, `runner-harness`, `runner-headless`) where the shell runs the harness and the harness calls one tested `core` function, and one CI workflow file per check. A person creates the GitHub repository and enables Actions.

## Boundaries & Constraints

**Always:** Follow the spine Stack: pnpm 12.10.1 via the `packageManager` field, `typescript` aliased to `npm:@typescript/typescript6@6.0.2` (API for tools) beside `@typescript/native` aliased to `npm:typescript@7.0.2` (`tsc` for typecheck and build), `node:test` with `node:assert` as the test runner (no test dependency; the user chose it over Vitest on 2026-10-10 to keep MPL-2.0 `lightningcss` out of the dev tree), Node 24.21.0 in CI. `core` compiles with `lib: ["ES2022"]` and `types: []`, imports nothing, and uses no Node or DOM API (G2). Each package exports one entry `src/index.ts` (AD-22), ESM only, target ES2022. One workflow file per check under `.github/workflows/` and one root script per check, so later entries add files and do not edit shared ones. Commit the lockfile. Package names are `@rpgtoolkit/core`, `@rpgtoolkit/runner-harness` and `@rpgtoolkit/runner-headless`, all `private: true`. The licence is MIT only: one root `LICENSE` file (copyright holder: the repo's git author, Jensen Chappell, 2026) and `"license": "MIT"` in every package.json.

**Never:** Add lint, the graph check, the licence gate, the provenance scan or the golden job (entries 1.3 to 1.9). Add any runtime dependency to `core`. Create packages other than the three named. Push or contact the remote. The remote is `git@github.com:aljopro/rpgtoolkit-reawakened.git`, already created by the user. Edit docs, the spine, or the ticket tree.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Fresh clone | `pnpm install --frozen-lockfile` then root scripts | Build, typecheck and test pass for all three packages with no test-runner dependency | A drifting lockfile fails install |
| Shell run | `runner-headless` start script | Prints the core function's result and exits 0 | Non-zero exit if the harness throws |
| Type error in `core` | A deliberate error added locally | `typecheck` fails | none |

</frozen-after-approval>

## Code Map

- `package.json`, `pnpm-workspace.yaml`, `pnpm-lock.yaml` -- root: `packageManager`, workspace globs, root scripts `build`, `typecheck`, `test`, devDependencies (the two TypeScript aliases and `@types/node` where needed).
- `tsconfig.base.json` -- shared strict options, ES2022, ESM; `packages/*/tsconfig.json` extend it; `core` sets `lib` and `types: []`.
- `packages/*/tsconfig.test.json` -- typechecks each package's `test/` and `src/` with `noEmit`, same `lib` and `types` as the package.
- `packages/core/src/index.ts` and one test -- the single exported function and its `node:test` test.
- `packages/runner-harness/src/index.ts` -- empty harness entry that calls the `core` function through core's public entry.
- `packages/runner-headless/src/` -- thin Node shell with a `start` script that runs the harness and prints the result.
- `.github/workflows/typecheck.yml`, `.github/workflows/unit.yml` -- Node 24.21.0, pnpm install frozen, one root script each.
- `LICENSE` -- MIT text.
- `.gitignore`, `.node-version` -- ignore `node_modules`, `dist`, `*.tsbuildinfo` and only the root `/fixtures/` folder (committed fixtures under `test/` folders must stay trackable); pin Node 24.21.0.
- `CONTRIBUTING.md` -- add the install, build, typecheck and test commands. Do not change its rules.
- Not present yet: `LICENSE`, `.gitignore`, any `package.json`. The GitHub repository now exists but is not yet a git remote here. pnpm is not installed locally; Node is 26.8.1 locally.

## Tasks & Acceptance

**Execution:**
- [ ] `package.json`, `pnpm-workspace.yaml`, `.node-version`, `.gitignore`, `LICENSE` -- create the workspace root with pinned tool versions -- one install for everything
- [ ] `tsconfig.base.json` and per-package `tsconfig.json` -- strict ES2022 ESM, `core` with `lib` ES2022 and `types: []` -- enforces G2 at compile time
- [ ] `packages/*/tsconfig.test.json` and the root `typecheck` script -- typecheck tests too -- test type errors and DOM/Node globals in tests fail CI
- [ ] `packages/core` -- one pure function and its test -- smallest real unit
- [ ] `packages/runner-harness`, `packages/runner-headless` -- harness calls core; shell runs the harness and prints -- proves the layers connect
- [ ] `.github/workflows/typecheck.yml`, `.github/workflows/unit.yml` -- one workflow per check -- later entries add files only
- [ ] `CONTRIBUTING.md` -- document the commands -- contributors can run what CI runs
- [ ] `git remote add origin git@github.com:aljopro/rpgtoolkit-reawakened.git` -- local config only, no contact with the remote
- [ ] A person pushes a branch, opens a pull request and checks that Actions are enabled and green -- hitl step

**Acceptance Criteria:**
- Given a fresh clone, when `pnpm install --frozen-lockfile` then the root `build`, `typecheck` and `test` scripts run, then all three packages pass.
- Given `runner-headless`'s start script, when run, then it prints the core function's result through the harness and exits 0.
- Given `core`'s tsconfig, when a file uses a DOM or Node global, then `typecheck` fails.
- Given the installed dev dependency tree, when every package's licence is read, then each one is on the G6 allowlist (MIT, Apache-2.0, BSD-2-Clause, BSD-3-Clause, ISC, Zlib, 0BSD).
- Given a pull request on the GitHub repository, when Actions run, then the typecheck and unit workflows are green.
- Given every package.json, when read, then `license` is `MIT` and the root `LICENSE` is the MIT text.

## Implementation Notes

## Plan Change Log

- **Iteration 1.** Trigger: review findings 2 and 3. Amended: Code Map and Tasks now require a per-package `tsconfig.test.json` (extends the package tsconfig, `include` `src` and `test`, `noEmit`, `types` as in the package) typechecked by the root `typecheck` script after `tsc -b`; `core`'s `types: []` and `lib: ["ES2022"]` apply to its tests; `.gitignore` anchors `/fixtures/`; Verification uses root scripts. Known-bad state avoided: test type errors and committed-fixture folders slipping through. KEEP: the package names, MIT licence and `LICENSE`, `.node-version`, root scripts `build` and `typecheck` as `tsc -b`, `test` as `tsc -b && vitest run`, `rootDir: src` / `outDir: dist` with exports pointing at `dist`, `@types/node` 24.0.0 only in `runner-headless`, project references core ← harness ← headless, workflows `typecheck.yml` and `unit.yml` on Node 24.21.0 with `pnpm/action-setup@v4`, the CONTRIBUTING Commands section, and the local `origin` remote (if it already exists, leave it). Do not emit compiled files into `src/`.

- **Iteration 2.** Trigger: finding 4 (intent_gap). The user replaced Vitest with `node:test`; the frozen block, Code Map and Verification were amended to match. KEEP everything in iteration 1's KEEP list except the Vitest dependency, `vitest run` in the `test` script, and the `@vitest` references. Run tests with `node --test` over TypeScript tests (Node's built-in type stripping, or a compile step: implementer's choice), still typechecked by each `tsconfig.test.json`.

## Review Triage Log

| # | Finding | Verdict | Route | Evidence / action |
|---|---------|---------|-------|-------------------|
| 1 | `pnpm -r build/typecheck/test` in Verification fails: only the root package has the scripts | low | reject | Verified: `pnpm -r build` fails. The frozen AC names the root scripts and the code matches them; the fix is a plan edit, which review rejects. Verification now uses the root scripts anyway, as part of finding 2's amendment. |
| 2 | Test files sit outside every tsconfig, so test type errors pass typecheck and CI, and the DOM/Node-global AC holds only for `src/` | medium | bad_plan | Verified: `include` is `["src"]`; a `.test.ts` error is not compiled. Fix changes tsconfig layout and the root `typecheck` script, which the plan did not specify. |
| 3 | `.gitignore` `fixtures/` ignores every `fixtures` folder at any depth | medium | bad_plan (folded into the re-derive) | Verified with `git check-ignore`: `packages/core/test/fixtures/x.json` is ignored. The spine needs committed fixtures (AD-7, AD-23 fixture saves; AD-3 conformance). Anchor to `/fixtures/`. |
| 4 | Vitest brings `lightningcss` 1.33.0 (MPL-2.0) into the dev tree; no ADR names it, so G6 and ADR 0002 Decision 3 would fail the licence job (entry 1.5) | medium | intent_gap, resolved: the user switched the runner to `node:test` (2026-10-10); frozen intent amended | Verified: `node_modules/.pnpm/lightningcss@*/package.json` has `"license": "MPL-2.0"`; `vite@8.3.4` lists it in `dependencies` and `pnpm why` shows vitest -> vite -> lightningcss. It is dev-only, never shipped. The plan forbids editing docs and does not say whether to name it in an ADR or avoid Vite. |
| 5 | Tests import `../src/index.ts` and run through Node type stripping, but `tsc -b` cannot accept `.ts` specifiers: with more than one `src` file no relative-import style passes both `tsc -b` and `node --test` | medium | patch | Reviewer reproduced it in `/tmp` (`ERR_MODULE_NOT_FOUND` for `./a.js`, TS5097 for `./a.ts`). Entry 1.8 and the spine's `core/src` layout (AD-22) make it the next change's problem. Smallest fix: `rewriteRelativeImportExtensions` and `allowImportingTsExtensions` in the emitting configs, `.ts` specifiers. |
| 6 | `erasableSyntaxOnly` is off while tests run `src` through strip-only Node: `enum`, value `namespace` or parameter properties pass `tsc` and fail `node --test` | medium | patch | Plausible in `core/src`; strip-only mode rejects that syntax with `ERR_UNSUPPORTED_TYPESCRIPT_SYNTAX`. Smallest fix: `"erasableSyntaxOnly": true` in `tsconfig.base.json`. |
| 7 | Root `typecheck` hard-codes the three `tsconfig.test.json` paths while `test` discovers tests by glob, so a new package's tests would not be typechecked | medium | patch | Brings back iteration 1's finding 2 and edits a shared script per package. Smallest fix: per-package `typecheck:tests` script and a root `pnpm -r --if-present run typecheck:tests`. |

## Verification

**Commands:**
- `corepack enable && pnpm install --frozen-lockfile` -- expected: installs from the committed lockfile
- `pnpm build && pnpm typecheck && pnpm test` -- expected: all pass with `node --test` and no test-runner dependency; a type error added to a `test/*.ts` file makes `pnpm typecheck` fail
- `pnpm --filter @rpgtoolkit/runner-headless start` -- expected: prints the core result, exit 0

**Manual checks (if no CLI):**
- A pull request on GitHub shows green typecheck and unit workflow runs.
