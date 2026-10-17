---
title: 'Refactor sweep'
type: 'refactor'
ticket: '10'
created: '2026-10-16'
status: done
baseline_revision: '37936b99'
route: 'full'
route_source: 'pinned'
risk: 'low'
review: 'quick'
review_source: 'pinned'
lenses_ran: ['quick']
review_loop_iteration: 0
context: ['{project-root}/docs/guardrails.md', '{project-root}/_bmad-output/initiative-rpgtoolkit-reawakened/deferred-work.md']
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** The TK2 reader sweep landed several harmless leftovers: an unused text-form error helper and imports, stale comments that still describe text readers as unsupported, duplicated literal format bounds, and fixture tests that silently return or point at an obsolete scratch corpus. These leave the code and gates harder to trust even though the intended readers and dump gate now cover TK2.

**Approach:** Remove dead helpers and imports, align reader/model comments with the implemented text support, reuse published format constants in implementation/tests, and make committed-fixture tests fail loudly while moving the four obsolete scratch-corpus checks to the fetched `fixtures/legacy` corpus. Keep reader behavior, fixture bytes, dump expectations, and golden outputs unchanged.

## Boundaries & Constraints

**Always:** Work only from `docs/` and repository evidence (G1–G7); preserve all reader results, diagnostics, residue policy, fixture bytes, and corpus expectations; run the complete required CI gate list after implementation.

**Never:** Add format features, alter accepted layouts or error behavior, weaken or delete meaningful coverage, edit legacy source, change golden recordings, or modify the frozen `docs/format-spec.md`.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|---------------|----------------------------|----------------|
| Fetched TK2 text corpus | `fixtures/legacy` after `pnpm fixtures:fetch` | `.brd`, `.tem`, `.itm`, and `.gam` text checks enumerate real files and parse to zero residue | A missing/invalid file fails the test; no silent return |
| Committed TAN fixture | `packages/core/test/fixtures/real/animatedTile.tan` | The fixture test always reads and validates the file | Missing fixture is a test failure |
| Animated-tile speed | Speed `0` or negative | Same located refusal as before, using the shared minimum constant | Existing error result and offset remain unchanged |

</frozen-after-approval>

## Code Map

- `packages/core/src/formats/battle/model.ts` and `packages/core/src/formats/battle/{special-move,status-effect,battle-background}.ts` -- `unsupportedTextForm` is unused after the text readers landed; imports and comments still describe text as rejected.
- `packages/core/src/formats/actor/{enemy.ts,model.ts}` -- module and `Enemy` comments still claim the minor-0 text form is rejected although `readEnemy` dispatches to `readTextEnemy`.
- `packages/core/src/formats/tile-animation/{model,reader,writer}.ts` -- `TILE_ANIMATION_MIN_SPEED` is exported but literal lower-bound checks duplicate it.
- `packages/core/src/formats/font/model.ts` and `packages/core/test/format-font.test.ts` -- `FONT_TOTAL_LINES` exists but the test repeats `2051`.
- `packages/core/test/format-tile-animation.test.ts` -- committed `animatedTile.tan` is guarded by an unnecessary `existsSync` return.
- `packages/core/test/{format-board-text,format-actor-text,format-main-file-text}.test.ts` -- four silent `/tmp/tk2-163` corpus checks; replace the scratch root with fetched `fixtures/legacy`, retaining direct reader and zero-residue assertions.

## Tasks & Acceptance

**Execution:**
- [x] Remove `unsupportedTextForm`, its unused imports, and stale text-rejection comments; update actor comments to describe both binary and TK2 text forms.
- [x] Replace animated-tile speed lower-bound literals with `TILE_ANIMATION_MIN_SPEED`; use `FONT_TOTAL_LINES` in the font test.
- [x] Remove the committed-fixture skip branch and migrate the four scratch-corpus tests to `fixtures/legacy` with recursive file collection and no silent absence.
- [x] Run all required gates and smoke-check representative TK2 text, binary, tile, font, image, registry, and dump paths.

**Acceptance Criteria:**
- Given the refactored sources, when typecheck/lint run, then no removed helper/import or duplicated bound remains and all diagnostics retain their prior values.
- Given fetched fixtures, when strict tests run, then every migrated TK2 text corpus assertion executes and reports zero residue; no test is skipped.
- Given the repository, when all required gates run, then typecheck, lint, fixtures fetch, strict tests, golden, graph, licence, provenance, catalogue check, and dump check pass without changing goldens.

## Implementation Notes

- 2026-10-16 — Removed the unused text-form error helper/imports and stale rejection comments; reused speed and font layout constants; made the committed TAN fixture mandatory; migrated four scratch corpus checks to fetched fixtures. The implementation agent initially omitted the worktree plan copy; the plan is now present here. Typecheck exposed unsupported `encoding` options on recursive `readdirSync`; those options were removed.
- 2026-10-16 — Follow-up: unit tests now use the repository's standard skip-option guard when fetched fixtures are absent; unfetched `pnpm test` passed with 15 expected skips, and fetched `pnpm test:strict` passed 943/943 with 0 skips.

## Plan Change Log

## Review Triage Log

- quick — no findings; reviewer checked the plan, repository rules, and unified diff.

## Verification

**Commands:**
- `pnpm typecheck && pnpm lint && pnpm fixtures:fetch && pnpm test:strict && pnpm golden && pnpm graph && pnpm licence && pnpm provenance && pnpm catalogue:check && pnpm dump:check` -- expected: all commands succeed with no skipped tests and unchanged goldens.
- `pnpm test` with `fixtures/legacy` temporarily absent -- expected: unit suite passes with fixture-dependent tests skipped; observed 928 passed, 0 failed, 15 skipped.
