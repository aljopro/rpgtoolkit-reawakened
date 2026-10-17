---
title: 'Refactor sweep'
type: 'chore'
ticket: 18
status: 'built'
baseline_revision: '0be8869dd64238044a6c0eff4a6ea03e98672063'
route: 'full'
route_source: 'pinned'
risk: 'low'
context: ['docs/guardrails.md', '_bmad-output/initiative-rpgtoolkit-reawakened/deferred-work.md', '_bmad-output/initiative-rpgtoolkit-reawakened/epic-rpgcode-vm/tickets.toml']
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Ticket 3.18 is the final refactor sweep of epic `rpgcode-vm`. Earlier tickets and reviews deferred items for the sweep, and several minor inconsistencies, dead identifiers, and a continuation name typo in file built-ins accumulated during the epic.

**Approach:** Apply a behavior-preserving cleanup pass:
1. Sweep and resolve open deferred items in `deferred-work.md` that trace to this epic and platform baseline prerequisites (the `canon` depth bound and allocation optimization from 1.8 resolved by 3.11, and the AD-8 required keys finding from 3.2 resolved by 3.3).
2. Fix the `filePut` continuation command name in `builtins/files.ts` (`${INTERNAL}.save.done` -> `${INTERNAL}save_done`) and prefix unused `view` parameters with `_view`.
3. Remove dead code and unused imports in `builtins.ts` (`NO_PARAMS`), `legacy-plugins.ts` (`BuiltinSpec`, `ParamSpec`, `CommandHandler`), `lower.ts` (`BinaryOp`), and `runner-harness` (`AudioCueKind`, `ProgramRef`, `SYNTHETIC_9_V2`, `TickRecord`).
4. Replace magic number `60` with `TICKS_PER_SECOND` in `virtuals.ts` for `gametime`.
5. Remove duplicate JSDoc comment in `state.ts` above `ObjectRecord`.
6. Complete script package exports in `index.ts` by including `PURE_SPECS` and `FILE_SPECS` alongside the other builtin spec families.
7. Add test coverage for `filePut` in `runner-harness` to exercise the corrected continuation.

## Boundaries & Constraints

**Always:** Follow `docs/guardrails.md` (G1–G7). Preserve all observable runtime and golden behavior. Strict test suite must pass with 0 skips.

**Never:** Add new language features or modify language semantics; weaken any tests or assertions; change golden recordings.

## I/O & Edge-Case Matrix

| Area | Current State | Refactored State | Observable Behavior |
|---|---|---|---|
| `deferred-work.md` | Canon depth bound (1.8 F10/F11) and AD-8 ParamSpec (3.2 review) listed as open | Moved to `## Resolved` with citations to entries 3.11 and 3.3 | Documentation reflects resolved status |
| `builtins/files.ts` | `filePut` requests `${INTERNAL}.save.done` continuation | Dispatches `${INTERNAL}save_done` matching registered command | `filePut` successfully updates file data on save reply |
| `virtuals.ts` | `gametime` divides by literal `60` | Divides by `TICKS_PER_SECOND` | Identical tick-to-second calculation, canonical constant |
| `builtins.ts` | Dead `NO_PARAMS` constant | Removed | Zero dead declarations |
| `state.ts` | Duplicate `LocalSlot` doc comment on `ObjectRecord` | Removed | Clean, accurate JSDoc |
| `script/index.ts` | `PURE_SPECS` and `FILE_SPECS` missing from re-exports | Re-exported | Complete builtin spec API surface |

</frozen-after-approval>

## Code Map

- `_bmad-output/initiative-rpgtoolkit-reawakened/deferred-work.md`: move resolved items (canon depth bound and AD-8 required keys) to `## Resolved`.
- `packages/core/src/script/builtins/files.ts`: fix `${INTERNAL}.save.done` -> `${INTERNAL}save_done`; prefix unused `view` parameters.
- `packages/core/src/script/builtins.ts`: delete unused `NO_PARAMS`.
- `packages/core/src/script/virtuals.ts`: use `TICKS_PER_SECOND`.
- `packages/core/src/script/state.ts`: remove duplicate comment.
- `packages/core/src/script/legacy-plugins.ts`: remove unused imports.
- `packages/core/src/script/lower.ts`: remove unused import.
- `packages/core/src/script/index.ts`: export `PURE_SPECS` and `FILE_SPECS`.
- `packages/runner-harness/src/audio.ts`: remove unused import.
- `packages/runner-harness/src/corpus.ts`: remove unused import and dead constant.
- `packages/runner-harness/src/job.ts`: remove unused import.
- `packages/runner-harness/test/script-host.test.ts`: add `filePut` coverage.

## Tasks & Acceptance

- [x] Update `deferred-work.md` to record resolution of open findings.
- [x] Clean up dead code, unused imports, and `filePut` continuation typo in `packages/core/src/script/`.
- [x] Clean up unused imports in `packages/runner-harness/`.
- [x] Add regression test verifying `filePut` completes via `saveBlob` continuation.
- [x] Run all CI checks: `typecheck`, `lint`, `pnpm fixtures:fetch`, `test:strict`, `golden`, `graph`, `licence`, `provenance`, `catalogue:check`, `dump:check`.

**Acceptance Criteria:**
- Given all project checks run, then typecheck, lint, strict tests (0 skips), golden replay, dependency graph, licence, provenance, and catalogue checks all pass.
- Given `deferred-work.md`, then resolved items for epic rpgcode-vm are accounted for under `## Resolved`.
- Given `filePut`, when executed against an output file handle, then bytes are written and the continuation updates the handle.

## Implementation Notes

- Applied behavior-preserving cleanups across `core/script`, `runner-harness`, and `deferred-work.md`.
- Appended verified resolutions in `deferred-work.md` for entry 1.8 F10/F11 (resolved by 3.11 with `CANON_MAX_DEPTH = 256` and dense-array optimizations) and 3.2 tracer review (resolved by 3.3 in AD-8 with required ParamSpec fields and Arg ref clause).
- Corrected `filePut` continuation name typo `${INTERNAL}.save.done` to `${INTERNAL}save_done` and prefixed unused `view` parameters with `_view` in `builtins/files.ts`.
- Removed dead `NO_PARAMS` constant in `builtins.ts`, unused imports in `legacy-plugins.ts` and `lower.ts`, duplicate JSDoc comment in `state.ts`, and unused imports/constants in `runner-harness` (`audio.ts`, `corpus.ts`, `job.ts`).
- Canonicalized `gametime` tick conversion to use `TICKS_PER_SECOND` in `virtuals.ts`.
- Re-exported `PURE_SPECS` and `FILE_SPECS` in `script/index.ts` alongside other builtin specs.
- Added regression test in `script-host.test.ts` proving `filePut` saves binary bytes through the sandbox blob port via continuation.

## Review Triage Log

- 2026-10-16: Refactor sweep verified clean across all 942 strict tests with zero skips and all project CI gates passing.
