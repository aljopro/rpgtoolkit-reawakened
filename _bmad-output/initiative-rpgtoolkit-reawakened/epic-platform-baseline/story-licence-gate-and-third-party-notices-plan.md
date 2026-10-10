---
title: 'Licence gate and THIRD_PARTY_NOTICES'
type: 'chore'
ticket: '5'
created: '2026-10-10'
status: done
baseline_revision: '409500f2d845ac456216e2b63ab1107af8ae1c0a'
route: 'full'
route_source: 'auto'
risk: 'medium'
review: 'quick'
review_source: 'pinned'
lenses_ran: ['quick']
review_loop_iteration: 0
context:
  - '{project-root}/docs/guardrails.md'
  - '{project-root}/docs/adr/0003-permissive-licences-acceptable.md'
  - '{project-root}/docs/adr/0002-core-pixels-and-deterministic-maths.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Guard-rail G6 exists only as documentation: nothing automatically stops copyleft, restricted, Lead-rated, or unapproved licences from entering dependencies, nothing verifies `THIRD_PARTY_NOTICES`, and nothing enforces lockfile pinning or vulnerability audits in CI.

**Approach:** Commit the pinned Blue Oak Council list (v16) and policy config under `tools/licences/`, add `tools/licences/check.mjs` to audit production and dev dependency licences against Bronze-or-better and `MS-PL` exception rules and verify `THIRD_PARTY_NOTICES`, record the `ovsx` dev exemption, and add a CI workflow with `pnpm audit --prod` and frozen lockfile checks.

## Boundaries & Constraints

**Always:**
- Pin Blue Oak Council list v16 in `tools/licences/blue-oak-list.json`.
- Config `tools/licences/config.json`: minimum rating `Bronze` (`Model`, `Gold`, `Silver`, `Bronze` pass; `Lead` fails); `MS-PL` blocked (ADR 0003); dev exemption for `ovsx` under `EPL-2.0` (ADR 0002).
- Recursively check all workspace packages via `pnpm -r licenses list --prod --json` for prod deps, and `pnpm -r licenses list --json` for dev deps.
- Prod dependency licences must be Bronze or better and not blocked; every prod dependency must appear in `THIRD_PARTY_NOTICES`.
- Dev-only dependencies must be Bronze or better, or listed in `devExemptions` with their ADR reference.
- Compound SPDX: `OR` passes if >=1 choice passes; `AND` requires all choices to pass.
- Maintain `THIRD_PARTY_NOTICES` at repo root.
- `tools/licences/check.mjs` accepts optional `[root]` arg (default repo root), exiting non-zero on violations.
- Match CI conventions: Node 24.21.0, frozen install, workflow `.github/workflows/licence.yml`.

**Never:**
- Do not edit `docs/` or ADRs (G6, ADR 0002, ADR 0003 are normative).
- Do not allow copyleft, Lead, or unapproved licences in production dependencies.
- Do not allow unexempted non-passing licences in dev dependencies.
- Do not add external npm dependencies for the licence check tool (use committed JSON and built-in Node modules).

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected |
|----------|--------------|----------|
| Clean tree | Current workspace dependencies | `pnpm licence` exits 0 with passing summary |
| GPL prod dep | Prod dependency with `license: "GPL-3.0"` | Fails: copyleft licence blocked by G6 |
| MS-PL prod dep | Prod dependency with `license: "MS-PL"` | Fails: blocked by exception list (ADR 0003) |
| Lead-rated dep | Prod dependency with `license: "WTFPL"` | Fails: rated Lead on Blue Oak list |
| Unlisted licence | Prod dependency with unknown licence | Fails: not on Blue Oak permissive list |
| Missing notice | Prod dependency not listed in `THIRD_PARTY_NOTICES` | Fails: missing from `THIRD_PARTY_NOTICES` |
| Missing notices file | `THIRD_PARTY_NOTICES` absent | Fails: missing file |
| Dev exemption allowed | Dev dependency `ovsx` with `license: "EPL-2.0"` | Passes: recorded in `devExemptions` (ADR-0002) |
| Dev exemption in prod | Prod dependency `ovsx` with `license: "EPL-2.0"` | Fails: dev exemption cannot appear in prod tree |
| Compound OR passing | Prod dependency with `(MIT OR GPL-3.0)` | Passes: permissive alternative available |
| Compound AND failing | Prod dependency with `(MIT AND GPL-3.0)` | Fails: all components must pass |

</frozen-after-approval>

## Code Map

- `tools/licences/blue-oak-list.json` -- new. Committed copy of Blue Oak Council list v16 JSON.
- `tools/licences/config.json` -- new. Policy config: rating `Bronze`, blocked `["MS-PL"]`, dev exemption `ovsx` (EPL-2.0, ADR-0002).
- `tools/licences/check.mjs` -- new. CLI tool and evaluator; scans workspace prod/dev deps via pnpm, validates `THIRD_PARTY_NOTICES`, exports `evaluateLicense` and `checkLicences`, supports `[root]` and `--audit`.
- `tools/licences/test/licences.test.mjs` -- new. Tests covering all matrix rows via temp workspaces and evaluator tests.
- `THIRD_PARTY_NOTICES` -- new. Notice document at repo root for shipped packages and bundled assets (G6 rule 3).
- `package.json` (root) -- add scripts `licence`, `licence:test`, `license`, `license:test`.
- `.github/workflows/licence.yml` -- new. CI workflow running frozen install, `pnpm audit --prod`, `pnpm licence:test`, `pnpm licence`.

## Tasks & Acceptance

**Execution:**
- [ ] `tools/licences/blue-oak-list.json`, `tools/licences/config.json` -- create pinned list and policy config -- G6 policy truth
- [ ] `THIRD_PARTY_NOTICES` -- create repo root notices file -- G6 rule 3 tracking
- [ ] `tools/licences/check.mjs` -- implement licence checker with SPDX evaluator, pnpm workspace scanner, and notice check -- G6 gate
- [ ] `package.json`, `.github/workflows/licence.yml` -- add root scripts and CI workflow -- CI enforcement
- [ ] `tools/licences/test/licences.test.mjs` -- implement fixture-driven tests covering all matrix rows -- rule verification

**Acceptance Criteria:**
- Given a production dependency under GPL, when `pnpm licence` runs, then it fails reporting copyleft block.
- Given a production dependency under MS-PL, when `pnpm licence` runs, then it fails reporting ADR 0003 block.
- Given a production dependency under a Lead licence (WTFPL), when `pnpm licence` runs, then it fails reporting Lead tier.
- Given a production dependency missing from `THIRD_PARTY_NOTICES`, when `pnpm licence` runs, then it fails naming the package.
- Given the current clean repo, when `pnpm licence:test` and `pnpm licence` run, then both pass with 0 violations.
- Given a pull request, when Actions run, then the `licence` workflow runs and verifies gate, tests, audit, and lockfile.

## Implementation Notes

## Plan Change Log

## Review Triage Log

| # | Finding | Verdict | Route | Evidence / action |
|---|---------|---------|-------|-------------------|
| 1 | Empty THIRD_PARTY_NOTICES turns off notice check | high | patch | Verified: `noticesContent` truthiness test short-circuits when file is empty. Check `noticesFilePresent` and test for package notice regardless of length. |
| 2 | Notice check uses raw substring match | medium | patch | Verified: `noticesContent.includes(pkgName)` matches within other words (e.g. `ini` in "including"). Use word boundary or markdown heading matching. |
| 3 | Dev-only versions of package in prod skipped by name | medium | patch | Verified: `prodPackages.has(pkgName)` skips dev-only occurrences if another version is in prod. Skip only matching `(name, version)` occurrences. |
| 4 | GPL not reported as copyleft block | low | patch | Verified: matrix expects "Fails: copyleft licence blocked by G6". Report copyleft licences specifically. |
| 5 | Matrix tests never run pnpm licence, pnpm scan, or [root] CLI | medium | patch | Verified: tests only called in-memory `checkLicences()`. Add CLI end-to-end tests in `licences.test.mjs` against clean tree and fixture root. |
| 6 | Unknown flags and extra positional roots silently ignored | low | patch | Verified: `check.mjs` should reject unknown flags and multiple positionals, mirroring `graph.mjs`. |
| 7 | THIRD_PARTY_NOTICES has unbundled FluidR3_GM with unverified text | medium | patch | Verified: FluidR3_GM is not bundled in baseline (epic 6); unverified copyright line violates G7. Remove premature asset notice. |

## Design Notes

- **Committed Blue Oak list:** ADR 0003 §Decision 3 and §Guard-rail changes allow a committed copy. Committing `tools/licences/blue-oak-list.json` (v16) eliminates network dependency, keeps the check offline and deterministic, and adds no npm dependencies.
- **SPDX compound expression evaluator:** Recursive/token parser handles `OR` (>=1 acceptable licence required) and `AND` (all required) with parentheses.
- **Workspace scanning via pnpm:** `pnpm -r licenses list --prod --json` aggregates prod dependencies across all workspace packages; `pnpm -r licenses list --json` covers both prod and dev. Dev dependencies failing Bronze-or-better are allowed only if explicitly listed in `devExemptions` in `config.json`.
- **THIRD_PARTY_NOTICES validation:** Verifies every production package appears in `THIRD_PARTY_NOTICES`. The file opens with clear sections; as production packages or bundled assets (FluidR3_GM in epic 6) land, they are recorded with their notices.

## Verification

**Commands:**
- `pnpm licence:test && pnpm licence` -- expected: all fixture tests pass, repo check passes with 0 violations
- `pnpm audit --prod` -- expected: no known vulnerabilities
- `pnpm typecheck && pnpm lint && pnpm graph && pnpm test` -- expected: all existing checks remain green
