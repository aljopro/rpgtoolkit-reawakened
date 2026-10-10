---
title: 'Guard-rail lint and type rules for core'
type: 'feature'
ticket: '3'
created: '2026-10-10'
status: 'draft'
baseline_revision: 'de4cc2b7a401bf18d74547adc8761e4e8e547ba0'
route: 'full'
route_source: 'auto'
risk: 'high'
review: ''
review_source: ''
lenses_ran: []
review_loop_iteration: 0
context:
  - '{project-root}/docs/guardrails.md'
  - '{project-root}/docs/adr/0002-core-pixels-and-deterministic-maths.md'
  - '{project-root}/_bmad-output/initiative-rpgtoolkit-reawakened/architecture-rpgtoolkit-reawakened/architecture-rpgtoolkit-reawakened.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** The guard-rails G1 to G3 are only prose. Nothing stops code in `core` from using a DOM or Node API, a generator or `Promise` in the VM scope, `Math.random`, a `Math` function outside the AD-13 allowlist, `**`, `console`, or the bare `fflate` import. Nothing proves `core`'s runtime dependencies match their allowlist, that VM state is plain data, or that a guard-rail suppression names its ADR.

**Approach:** Add the workspace ESLint base and its own CI workflow, the `core`-scoped rules for each of those, the `PlainData` type in `core/ports` with its type-level constraint, a check that `core`'s runtime dependencies equal an allowlist file (initially empty), and a rule that rejects a guard-rail suppression without a `guardrail-exception: Gx ADR-NNNN` marker. Prove every rule with a fixture that violates it.

## Boundaries & Constraints

**Always:** Use ESLint 10.12.0 and typescript-eslint 8.71.1 with the `typescript` alias (TypeScript 6 API) already installed. Use ESLint flat config at the repo root. Scope the G1 rules (no generator, `async`, `await`, `Promise`, `queueMicrotask`) to `packages/core/src/script/**`; scope the G2, G3 and AD-13, AD-24 rules to `packages/core/src/**`. `Math` is an allowlist: `abs`, `ceil`, `floor`, `round`, `trunc`, `sign`, `min`, `max`, `fround`, `imul`, `clz32`, `sqrt`; every other `Math` member and the `**` and `**=` operators fail. Ban DOM and Node globals and imports (`node:*` and bare Node built-ins), timers, `Date`, `performance`, `Intl`, `toLocale*`, `console`, imports of other workspace packages, and the bare `fflate` specifier and its async exports. `PlainData` is `null | boolean | finite number (not -0, expressed in the type as number) | string | PlainData[] | { [k: string]: PlainData }` and lives in `core/ports`, exported from `core`'s public entry. The allowlist lives in a file in `packages/core` and starts empty (G2.3). One workflow file for lint; one root script `lint`. Every new dev dependency's licence must pass G6 as amended by ADR 0003 (rated Bronze or better on the Blue Oak Council list, not MS-PL) or be named in an ADR before it lands.

**Never:** Add the graph check, licence gate, provenance scan or golden job (entries 1.4 to 1.9). Add any runtime dependency to `core`. Edit docs, the spine, the ticket tree, or CI files other than the new lint workflow. Weaken or skip a rule to make fixtures pass. Lint or typecheck the violation fixtures as normal source.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Clean core | `core` source with no violations | `pnpm lint` and `pnpm typecheck` pass | none |
| Banned API | A fixture using one banned global, import, `Math` member, `**`, `console`, bare `fflate` or an async/generator in `core/src/script` | Lint fails with that rule | none |
| Allowed Math | `Math.sqrt`, `Math.floor` and the rest of the allowlist | Passes | none |
| Non-plain data | A function type, `undefined`, `Map` or class instance in a `PlainData` position | Typecheck fails | none |
| Unlisted dependency | A runtime dependency in `core`'s package.json not in the allowlist | The allowlist check fails and names it | Exit non-zero |
| Unmarked suppression | `eslint-disable` of a guard-rail rule with no `guardrail-exception: Gx ADR-NNNN` | Lint fails | none |
| Marked suppression | The same with a valid marker | Passes | none |

</frozen-after-approval>

## Code Map

- `package.json` (root) -- add the `lint` script and devDependencies `eslint`, `typescript-eslint`; keep the TypeScript aliases.
- `eslint.config.js` -- new, flat config; rule scopes as above; ignores the fixture folder and build output.
- `packages/core/src/ports/` -- new `PlainData` type and its type-level constraint helper; `packages/core/src/index.ts` exports it.
- `packages/core/dependency-allowlist.json` -- new, empty list; `tools/check-core-deps.mjs` -- new check that compares `core`'s `dependencies` to it.
- A small custom rule or plugin in `tools/` for the suppression marker.
- `packages/core/test/` -- one node test that runs ESLint on each violation fixture and expects that rule to fire, and typechecks the `PlainData` fixtures expecting errors; fixtures live in a folder excluded from the normal lint and typecheck.
- `.github/workflows/lint.yml` -- new, Node 24.21.0, frozen install, `pnpm lint`; model on `.github/workflows/unit.yml`.
- Existing: `tsconfig.base.json` has `erasableSyntaxOnly`, NodeNext, strict; `packages/core/tsconfig.json` has `lib: ["ES2022"]`, `types: []`; the one `core` test uses a module-only declaration for `node:test`.
- Known: a scratch install showed `minimatch` (BlueOak-1.0.0, the Blue Oak Model licence) in ESLint's tree; every other package was MIT, Apache-2.0, ISC, BSD-2-Clause or BSD-3-Clause. All pass G6 as amended by ADR 0003 (accepted 2026-10-10, commit de4cc2b).

## Tasks & Acceptance

**Execution:**
- [ ] `package.json`, `eslint.config.js` -- install ESLint and typescript-eslint, write the flat config with the scoped rules -- G1 to G3, AD-13, AD-24, AD-6 enforcement
- [ ] `packages/core/src/ports/`, `packages/core/src/index.ts` -- `PlainData` and its constraint -- AD-7 type check
- [ ] `packages/core/dependency-allowlist.json`, `tools/check-core-deps.mjs`, root `lint` script -- allowlist check -- G2.3
- [ ] `tools/` custom rule -- reject unmarked guard-rail suppressions -- guardrails Exceptions section
- [ ] `packages/core/test/` and its fixture folder -- one violating fixture per rule plus clean and allowed cases -- proves the rules fire
- [ ] `.github/workflows/lint.yml` -- run `pnpm lint` -- later entries add their own workflows

**Acceptance Criteria:**
- Given the repository, when `pnpm lint`, `pnpm typecheck` and `pnpm test` run, then all pass on clean code.
- Given a fixture per rule listed in the matrix, when the test runs, then each fixture fails with its own rule and the allowed-`Math` and marked-suppression fixtures pass.
- Given a function type in a `PlainData` position, when typechecked, then it fails.
- Given a runtime dependency added to `core` that is not in the allowlist, when `pnpm lint` runs, then it fails and names the dependency.
- Given the installed dev dependency tree, when every package's licence is read, then each is rated Bronze or better on the Blue Oak Council list (BlueOak-1.0.0, MIT, Apache-2.0, ISC, BSD-2-Clause, BSD-3-Clause and the like) and none is MS-PL, or is named in an accepted ADR.
- Given a pull request, when Actions run, then the lint workflow runs `pnpm lint`.

## Implementation Notes

## Plan Change Log

## Review Triage Log

## Verification

**Commands:**
- `pnpm install --frozen-lockfile && pnpm lint && pnpm typecheck && pnpm test` -- expected: all pass
- a licence listing of `node_modules/.pnpm` -- expected: every licence rated Bronze or better on the Blue Oak list (none MS-PL), or named in an accepted ADR

**Manual checks (if no CLI):**
- A pull request shows the lint workflow running.
