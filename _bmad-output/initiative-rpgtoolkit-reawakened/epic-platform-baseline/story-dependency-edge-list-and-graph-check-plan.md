---
title: 'Dependency edge list and graph check'
type: 'chore'
ticket: '4'
created: '2026-10-10'
status: done
baseline_revision: '2562286dc40af6d71241741e556f4af8a27c4550'
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

**Problem:** G2.5 and G4.4 exist only as written rules: nothing stops a package importing a package it must not, a relative path escaping its package, a package's internal file instead of its entry point, or Phaser/PixiJS/Excalibur outside a runner's render folder; the architecture spine's dependency diagram can drift from the code.

**Approach:** `tools/deps/edges.json` is the single edge list; a generator writes the dependency-cruiser config and the spine's diagram from it; a check fails when the committed diagram differs; the engine rule is included. One workflow runs the tests and the check.

## Boundaries & Constraints

**Always:**
- `edges.json` keeps the spine's arrow meaning — `[a, b]` says *a may be depended on by b* — as an **ordered** list whose order is the diagram's line order, so the diagram is a literal transcription; the generator inverts the pairs when it writes the rules.
- The generated block reproduces the committed one exactly: LF, 2-space indent, one trailing newline. A node id is the label with every non-alphanumeric character removed; a collision is an error. A package with no edges emits no line.
- Pin `dependency-cruiser` at `18.5.0` (spine Stack) as a root devDependency; a new workflow keeps Node 24.21.0 and a frozen install.
- The generated config sets `tsPreCompilationDeps: true` (so `import type`, `export … from`, `require` and dynamic `import()` are seen), `tsConfig.fileName` on a generated `tsconfig.depcruise.json` (`paths`: `@rpgtoolkit/<pkg>` → `packages/<pkg>/src/index.ts`, so no build is needed), `enhancedResolveOptions.exportsFields: ["exports"]`, `doNotFollow` on `node_modules`, `preserveSymlinks: false`, and `exclude` for `packages/<pkg>/dist/` and `packages/<pkg>/test/fixtures/`.
- All rules `error`: for each package, only the packages its edges name may be imported, and no relative import may leave it — that second rule also catches a relative deep import into an allowed sibling, which the subpath rule cannot see once it resolves. The `from` scope is the whole package directory, so tests count. No `@rpgtoolkit/<pkg>/<subpath>` import at all. `phaser`, `pixi.js`, `@pixi/*` and `excalibur` only from `packages/runner-*/src/render/**` — the guardrails' own allow-list, so `render-webgl2` may not use them.
- Validate the list before generating: known names, no duplicate or self edges, no cycle, and every `packages/<pkg>/` on disk present with a matching `package.json` name.
- A violation exits non-zero naming the rule, file and target; the tool's own errors name the offending list entry, or the anchor and spine file.

**Never:** Weaken a rule to make a fixture pass; commit the two generated config files. Edit `docs/`, the ticket tree, other workflows, `CONTRIBUTING.md` (ticket 1.10), `eslint.config.js` or `tools/check-core-deps.mjs`. Add packages, dependencies or a build step to the graph job, or the jobs of entries 1.5 to 1.9. The spine's generated block may be rewritten, but only in the order the list gives it.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected |
|----------|--------------|----------|
| Clean tree | the three real packages, listed imports only | exit 0, no violations |
| Import not an edge | `packages/<a>/src/**` imports a package absent from `a`'s edges | `r1-<a>-workspace-edges`, naming file and target |
| Relative escape | `packages/<a>/src/**` imports `../../<b>/src/x.ts`, listed or not | `r1-<a>-no-relative-escape`, naming file and target |
| Deep import | `@rpgtoolkit/<b>/src/…`, `…/dist/…`, or the `import type` form | `r2-no-deep-package-imports` |
| Engine import | `phaser` outside, then inside, `packages/runner-*/src/render/` | `r3-render-engines-only-in-render` for the outside import only |
| Stale diagram | an edge added to the list, diagram not regenerated | names the spine file and `pnpm graph:write` |
| Bad list | unknown name, duplicate, self edge, cycle, or a `packages/<x>/` the list omits | named failure before generating |

</frozen-after-approval>

## Code Map

- `tools/deps/edges.json` -- new. `packages` (every planned package; npm name `@rpgtoolkit/<name>`), `edges` (ordered `[depended-on, dependent]` pairs in diagram line order), `diagram: { file, anchor }`.
- `tools/deps/graph.mjs` -- new; optional `root` argument (default the repo root) like `tools/check-core-deps.mjs`. Writes `<root>/.dependency-cruiser.mjs` and `<root>/tsconfig.depcruise.json`, compares (or with `--write` replaces) the spine's block, then runs the CLI with `cwd: root` and the binary resolved from this repo's `node_modules`, so a fixture root needs none.
- `tools/deps/test/graph.test.mjs` -- new. Temp-dir fixtures, one per matrix row; the engine rows write a stub `node_modules/phaser/{package.json,index.js}` at test time.
- `package.json` (root) -- devDependency `dependency-cruiser: 18.5.0`; scripts `graph`, `graph:write`, `graph:test`. `.gitignore` -- the two generated files.
- `.github/workflows/graph.yml` -- new; Node 24.21.0, frozen install, `pnpm graph:test`, `pnpm graph`.

## Tasks & Acceptance

**Execution:**
- [ ] `tools/deps/edges.json` -- the spine's 23 arrows as an ordered list, plus `packages` and the diagram target -- one source of truth for G2.5 and G4.4
- [ ] `tools/deps/graph.mjs` -- validate, generate the config and the diagram, check, run depcruise -- AD-22
- [ ] `package.json`, `.gitignore` -- devDependency, scripts, ignored output -- CI can run it
- [ ] `tools/deps/test/graph.test.mjs` -- one fixture per matrix row -- proves each rule fires
- [ ] `.github/workflows/graph.yml` -- tests, then the check -- later entries add their own workflow

**Acceptance Criteria:**
- Given a fixture importing a package absent from its edges, when the tool runs against it, then it exits non-zero with `r1-<a>-workspace-edges` naming file and target.
- Given a fixture whose relative import leaves its package, when the tool runs against it, then `r1-<a>-no-relative-escape` reports it.
- Given `@rpgtoolkit/<b>/src/x.ts` in value and `import type` forms, when the tool runs against the fixture, then `r2-no-deep-package-imports` reports both; importing the entry reports nothing.
- Given `phaser` imported outside `packages/runner-*/src/render/`, when the tool runs against the fixture, then `r3-render-engines-only-in-render` reports it; from inside `src/render/` it is silent.
- Given an edge added to a fixture's list without regenerating the diagram, when the check runs, then it fails naming the spine file and `pnpm graph:write`; after `--write` it passes.
- Given a `packages/<x>/` on disk the list omits, when the tool runs, then it fails naming the package.
- Given the committed tree, when `pnpm graph:test` and `pnpm graph` run, then both pass and the diagram is unchanged.
- Given a pull request, when Actions run, then the graph workflow runs both.

## Implementation Notes

## Plan Change Log

- **Iteration 1.** Trigger: independent review findings 1 to 15. Amended: (a) the diagram cannot be reproduced from a keyed map -- the committed block interleaves `render-webgl2`'s arrows (spine lines 8 and 14), so the list is now *ordered* and the diagram is a literal transcription; (b) a `r1-<pkg>-no-relative-escape` rule was in the probe config but had been dropped from the plan text, and without it a relative deep import into an allowed sibling bypasses every rule -- restored, with a row and a criterion; (c) the config knobs that decide what is even seen (`tsPreCompilationDeps`, `tsConfig`, `exportsFields`, `exclude`, `preserveSymlinks`) moved into Always; (d) list validation, id collisions, newline handling, the fixture's stub `phaser`, and the root/cwd/binary mechanics are now stated; (e) the engine names and the `render-webgl2` question answered from the guardrails' own allow-list; (f) every matrix row now has a criterion. KEEP: the pinned versions, the arrow-direction inversion, generated-and-ignored config files, the fixture-per-row test shape and the four verify cases.

## Review Triage Log

| # | Finding | Verdict | Route | Evidence / action |
|---|---------|---------|-------|-------------------|
| 1 | Relative escape has no rule, row or criterion | high | patch | Verified: the Intent names it, the rules did not. Restored `r1-<pkg>-no-relative-escape`; row and criterion added. |
| 2 | A relative deep import into an allowed sibling passes | high | patch | Same rule: it fires on resolved `local` targets outside the importing package; stated in Always. |
| 3 | Byte-for-byte is false; the diagram interleaves `render-webgl2` | high | bad_plan | Verified in the spine: line 8 `renderwebgl2 --> runnerweb`, line 14 `renderwebgl2 --> editorui`. `edges.json` is now an ordered pair list. |
| 4 | Import forms that depend on pre-compilation are not pinned | medium | patch | `tsPreCompilationDeps: true` and the `tsConfig` file named in Always; `packages/core/src/index.ts` already uses `export type … from`, so the form is real. |
| 5 | Engine list incomplete; `render-webgl2` undefined | medium | patch | Engines listed as `phaser`, `pixi.js`, `@pixi/*`, `excalibur`; the allow-list is the guardrails' G4 enforcement (`runner-*/src/render/**`), so `render-webgl2` may not use them. |
| 6 | The engine fixture needs a `phaser` that resolves | medium | patch | The fixture writes a stub `node_modules/phaser/` at test time; an unresolved engine import passes silently because the rule matches resolved paths. |
| 7 | Generated root files may break local lint or typecheck | medium | patch | Verification runs `pnpm graph` before `pnpm lint` and `pnpm typecheck` in one checkout. |
| 8 | "Never commit generated files" contradicts the committed diagram | medium | patch | Now says "the two generated config files", and allows rewriting the spine's generated block. |
| 9 | `edges.json` is unvalidated | medium | patch | Always requires known names, no duplicates, self edges or cycles; errors name the entry. |
| 10 | Matrix and criteria disagree | medium | patch | Rows added and criteria aligned, including rule names and the `graph:write` hint. |
| 11 | `./testing` banned though AD-22 allows it | low | defer | No package has a subpath entry today; the generator is the named extension point. Recorded, not built. |
| 12 | Root-argument semantics ambiguous | medium | patch | Stated: `cwd: root`, config written into `root`, binary resolved from this repo's `node_modules`. |
| 13 | Licence check is manual | low | reject | Mechanically gating licences is entry 1.5's job, which this ticket forbids here. Probe evidence: dependency-cruiser's tree is Apache-2.0, ISC and MIT only. |
| 14 | Id derivation, collisions, isolated nodes unspecified | low | patch | Stated: non-alphanumerics stripped, a collision is an error, no-edge packages emit no line. |
| 15 | Newline handling unspecified | low | patch | Stated: exact comparison, LF, one trailing newline. |

## Design Notes

- **One inversion.** The spine's arrow means "may be depended on by"; the list keeps that shape, so the diagram is a literal transcription and the generator inverts the pairs for the rules -- the only inversion.
- **No build.** Probe on a replica pnpm workspace: dependency-cruiser resolves a workspace dependency's exported entry to its real `packages/<p>/dist/index.d.ts` and reports `couldNotResolve` without a built `dist/`. The generated `paths` map removes the build; `exportsFields: ["exports"]` (dependency-cruiser's default condition names lack `default`, so the `exports` map never matches) then resolves the entry while a *subpath* stays unresolved -- what `r2` keys on.
- **Why these exclusions.** `packages/<pkg>/dist/` (its `.d.ts` files re-export transitively, giving false hits) and `packages/<pkg>/test/fixtures/` (entry 1.3's deliberately illegal fixtures). Everything else, tests included, is cruised.
- **Engine rule shape.** `to.path` matches the *resolved* path and there is no `to.module`, so engines are matched as `node_modules/(\.pnpm/)?phaser[@/]` and its siblings -- pnpm's real layout -- with `from.pathNot` on the render folder.

## Verification

**Commands:**
- `pnpm install --frozen-lockfile && pnpm graph:test && pnpm graph` -- pass, exit 0
- `pnpm graph && pnpm lint && pnpm typecheck && pnpm test` -- unchanged, pass (catches a generated file the other checks trip over)
- `pnpm why dependency-cruiser && pnpm licenses list` -- 18.5.0; Apache-2.0, ISC and MIT only
