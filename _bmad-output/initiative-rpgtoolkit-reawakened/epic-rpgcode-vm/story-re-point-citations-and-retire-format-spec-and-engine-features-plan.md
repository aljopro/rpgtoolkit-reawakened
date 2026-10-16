---
title: 'Re-point citations and retire format-spec.md and engine-features.md'
type: 'chore'
ticket: '28'
created: '2026-10-16'
status: 'in-progress'
baseline_revision: '42632ad8f425441b45683172913d3d7cf535890c'
route: 'full'
route_source: 'auto'
risk: 'medium'
context: ['{project-root}/docs/guardrails.md', '{project-root}/docs/adr/0007-docs-spec-is-the-normative-specification.md', '{project-root}/docs/spec/formats/README.md', '{project-root}/docs/spec/engine/']
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** `docs/format-spec.md` and `docs/engine-features.md` are frozen historical sources under ADR 0007, but live code comments, reader diagnostics, tests, contributor guidance, and active initiative artifacts still cite them. Those references make the normative source unclear and the old pages cannot be retired cleanly.

**Approach:** Re-point every live citation to the appropriate `docs/spec/` page and stable heading/E-xx anchor, preserving the rule or diagnostic meaning. Keep old citations only in completed plans/reviews and `docs/provenance/`, then delete the two frozen stub files. Update only dump expectations whose reports change solely because a diagnostic's section citation changed.

## Boundaries & Constraints

**Always:** Treat `docs/spec/` as normative; use its existing anchors, including `<a id="e-NN">` for E-xx. Map each old format section to its specific topic anchor, not just a page root. Preserve diagnostic semantics and error offsets. Update references in `packages/`, `tools/`, `CONTRIBUTING.md`, `docs/spec/` itself, and active/open epics' ticket/epic files. Verify every remaining in-scope citation resolves to a real page and anchor.

**Never:** Edit historical citations in done plans/reviews or provenance; add a citation map (ADR 0007 decision 5 rejects one); leave aliases/banners or compatibility stubs for the old pages; make unrelated prose or behavior changes; alter golden expectations except for citation-only dump drift; open `../rpgtoolkit` (G7).

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|---|---|---|---|
| Code section reference | A reader's `format-spec §6.1` constant or diagnostic | Cite the matching `docs/spec/formats/character.md` anchor; diagnostic still identifies the same format | Keep error content and offset unchanged apart from citation text |
| Engine feature citation | `engine-features E-xx` | Point to the existing `docs/spec/engine/<page>.md#e-xx` anchor | If the ID has no matching anchor, record it for plan correction; do not invent an anchor |
| Obsolete-page mention | Live source or active ticket cites either frozen filename | Replace with its current normative page, or remove the stale source citation while preserving useful meaning | Historical plans/provenance are intentionally excluded |
| Dump expectation | A report changes after section strings change | Re-record only when `dump:check` shows citation-only drift | Any unrelated digest/count drift blocks the change |

</frozen-after-approval>

## Code Map

- `docs/adr/0007-docs-spec-is-the-normative-specification.md` — decision 5 forbids a citation map; decision 6 freezes the old files until this cutover.
- `_bmad-output/initiative-rpgtoolkit-reawakened/epic-legacy-formats/story-migrate-format-spec-sections-1-to-14-into-docs-spec-formats-plan.md` — source-verified §1–§14 mapping. Key targets: formats README anchors for §1; `main-file.md#layout`; `tiles.md#tileset-tst-and-isometric-tileset-iso`, `#single-tile-gph`, `#animated-tile-tan`, `#tile-bitmap-tbm`; `board.md#version-dispatch` and `#vector-layout-minor-4-and-later`; `character.md`, `item.md`, `enemy.md`, `animation.md`, `battle-data.md`; `save-game.md`; `packaging-and-paths.md`; `README.md#cross-format-test-checklist`.
- Citation map for implementation (working only, not a deliverable): §1 → `formats/README.md`; §2 → `formats/main-file.md`; §3 → `formats/tiles.md`; §4–5 → `formats/board.md` and `formats/legacy/older-binary-versions.md`; §6 → `formats/character.md`, `item.md`, `enemy.md`; §7 → `formats/animation.md`; §8 → `formats/battle-data.md`; §9 → the six `engine/rpgcode-*.md` pages listed above; §10 → `formats/images.md#the-shared-decode-contract`, `#windows-bitmap-bmp`, `#gif`; §11 → `formats/save-game.md`; §12 → `engine/plugins-and-battle.md#plugin-roles` and `plugin-constants.md`; §13 → `formats/packaging-and-paths.md`; §14 → `formats/README.md#cross-format-test-checklist`; §15 → `formats/legacy/README.md`, `text-formats.md`, `older-binary-versions.md`, and `conversion.md`. When one old section spans topics, resolve each citation by its claim and format, not by section number alone.
- `_bmad-output/initiative-rpgtoolkit-reawakened/epic-tk2-support/story-migrate-section-15-into-docs-spec-formats-legacy-and-rule-it-plan.md` — source-verified §15 targets in `formats/legacy/README.md`, `text-formats.md`, `older-binary-versions.md`, and `conversion.md`.
- `_bmad-output/initiative-rpgtoolkit-reawakened/epic-rpgcode-vm/story-migrate-section-9-into-docs-spec-engine-and-rule-the-rpgcode-plan.md` — §9 maps to `engine/rpgcode-language.md`, `rpgcode-functions.md`, `rpgcode-runtime.md`, `rpgcode-modules-and-objects.md`, `rpgcode-errors-and-threads.md`, and `rpgcode-dialects.md`.
- `docs/spec/engine/` — current E-xx anchors; preserve the ID and link to the page containing that ID. `docs/spec/formats/images.md` and `docs/spec/engine/display-input-audio.md` still have live old-page references that must be reconciled.
- `packages/core/src/formats/**` — reader `*_SECTION` constants, comments, and diagnostic strings; these values flow into dump reports. `packages/runner-headless/src/dump/**` — parser/report and committed expectation gates.
- `CONTRIBUTING.md`, `tools/`, active initiative `epic-*.md` and `tickets.toml` — live project guidance and open work; completed plan/review files are history, not a migration target.

## Tasks & Acceptance

**Execution:**
- [ ] `packages/core/src/formats/**` and relevant format tests — inventory and re-point section constants, comments, and diagnostic text to their rule-owning `docs/spec/formats/` anchors; keep parser behavior and offsets unchanged.
- [ ] `packages/runner-headless/src/dump/**` and committed dump expectations — verify any report drift is citation-only and re-record only those changed expectations.
- [ ] `tools/**`, `CONTRIBUTING.md`, `docs/spec/**` — replace live old-page citations with current page/anchor links; preserve the surrounding guidance and rule.
- [ ] `_bmad-output/initiative-rpgtoolkit-reawakened/**/epic-*.md` and `tickets.toml` — update only active/open epics and tickets; leave completed plans and reviews untouched.
- [ ] `docs/format-spec.md` and `docs/engine-features.md` — delete after all live references are migrated.
- [ ] In-scope files and citation targets — run a throwaway reference/anchor check, then remove its scaffolding; run the dump check and update only citation-only expectation drift.

**Acceptance Criteria:**
- Given the final repository state, when searched in current operational artifacts (code, tests, contributor guidance, `docs/spec/`, tools, and active tickets/epics), then no in-scope file contains a live citation to `format-spec` or `engine-features.md`. Historical initiative documents—including completed plans/reviews and discovery/deferred-work records—and `docs/provenance/` are excluded; this plan is excluded as well.
- Given every `docs/spec/...#anchor` citation added or retained in scope, when resolved against the target file's headings or explicit anchors, then the page and anchor both exist.
- Given a changed dump expectation, when its old and new records are compared, then only diagnostic section citation text differs; legacy game data and unrelated digests remain unchanged.
- Given the final branch, when all required checks run, then typecheck, strict tests (zero skips), lint, graph, provenance, licence, golden, and dump checks pass.

## Implementation Notes


## Plan Change Log


## Review Triage Log


## Design Notes

Apply citations mechanically only after grouping by source claim. For format rules, section number alone is insufficient where one old section split across multiple pages; use the symbol's owning format or the quoted rule to choose the anchor. For engine features, E-xx IDs are stable anchors and are a safer destination than guessing from the old page's heading. Exempt historical records explicitly rather than rewriting evidence that was accurate when authored.

## Verification

**Commands:**
- `pnpm typecheck` — expected: workspace and test projects pass.
- `pnpm test:strict` — expected: all tests run with zero skips.
- `pnpm lint`, `pnpm graph`, `pnpm provenance`, `pnpm licence`, `pnpm golden` — expected: all required gates pass.
- `pnpm dump:check` — expected: expectations match; any re-record is citation-only.

**Manual checks:**
- Search the full in-scope tree for both old filenames and old citation forms; classify permitted history/provenance separately.
- Resolve every in-scope `docs/spec/...#anchor` to a heading or explicit E-xx anchor.
- Confirm both old files are deleted and no index/link points to them.
