---
title: 'ADR 0007: docs/spec is the normative specification'
type: 'chore'
ticket: '13'
created: '2026-10-15'
status: 'draft'
baseline_revision: '0fd79bfc7178d9254cb42d082268abe705482af4'
route: 'full'
route_source: 'auto'
risk: 'medium'
context: ['{project-root}/docs/guardrails.md', '{project-root}/docs/adr/0006-clean-room-spec-extraction.md', '{project-root}/_bmad-output/initiative-rpgtoolkit-reawakened/discovery/docs-spec-reconciliation.md', '{project-root}/docs/provenance/extraction-log.md']
---

<frozen-after-approval reason="human-owned intent — do not modify unless the human renegotiates">

## Intent

**Problem:** On 2026-10-15 the owner ruled that `docs/spec/` replaces `docs/format-spec.md` and `docs/engine-features.md` as the normative specification (`docs/editor-features.md` stays), and attested it clean as round 4 of the extraction log. That ruling is recorded only in a discovery note and in epic Notes. Every binding document still sends an implementer to the old files: `CLAUDE.md:23`, `docs/guardrails.md:99` and `:123`, `.github/pull_request_template.md:15`, `README.md:41-42`, `CONTRIBUTING.md:30` and `:114`, ADR 0006's context line, and 13 `format-spec` references in the architecture spine. `docs/spec/README.md` never says it is normative, and none of the seven `docs/spec/engine/` pages carries an E-xx ID, yet about 940 code and plan citations name `format-spec §…` or `E-xx`. Until an ADR fixes the precedence, the rule-block convention and the citation form, four migration entries (1.14, 2.23, 3.27, 16.13) and the sweep (3.28) have nothing to agree on, and every later reader or VM entry has two specs to cite and no rule for which wins.

**Approach:** Write ADR 0007 as `Proposed`, then amend the binding documents so each names `docs/spec/`, in one doc-only commit (G7). The ADR fixes four things: (1) `docs/spec/` describes Toolkit 3.1 and every Reawakened departure or addition sits beside the legacy behaviour as a marked **Reawakened rule** block; (2) real archive files beat prose, so a page the corpus contradicts is corrected and cites the files; (3) citations take the form `docs/spec/<path>#<anchor>`, E-xx IDs ride on the engine pages as labels, and a machine-readable old-section-to-new-anchor map is where the migration entries record their moves; (4) `format-spec.md` and `engine-features.md` get a superseded banner at the top and keep their bodies until 3.28 re-points every citation and deletes them. The human accepts the ADR; its status then becomes `Accepted`.

## Boundaries & Constraints

**Always:** Follow the format of ADR 0006 and ADR 0004 (`* **Status:**`, `* **Date:**`, `* **Context documents:**`, then Context, Decision, Consequences, Alternatives considered). Open with a short plain-language summary (the house rule from the ADR 0002 plan). State each decision as a rule with its reason in one sentence. Cite the reconciliation note's R-ids for every ruling it records. Keep each amended passage minimal and name what it used to say. Land the commit touching only `docs/`, `CLAUDE.md`, `README.md`, `CONTRIBUTING.md`, `.github/pull_request_template.md` and the architecture spine, as the entry's `verify` states. The plan and the doc change are separate commits (G7 rule 4).

**Never:** Rule any R-nn finding the reconciliation note marks proposed or deferred; this ADR records the precedence mechanism, not the content rulings (R-02 to R-16, R-17 to R-24, R-30 to R-39 and R-50 to R-61 belong to 2.23, 16.13, 3.27 and 1.14 and the epics that own them). Touch `docs/format-spec.md` or `docs/engine-features.md` beyond the banner. Edit any code, lint config or CI. Edit `docs/spec/` (it is the subject of the ADR, and 1.14 is the entry that adds the E-xx labels). Mark the ADR `Accepted` before the human accepts it. Claim `docs/spec/` followed ADR 0006's extraction steps; round 4 did not, and the ADR must say so plainly. Re-open the owner's ruling that `docs/editor-features.md` is not replaced.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Acceptance | Human reads ADR 0007 and accepts | Status line becomes `Accepted` with the date | If rejected, revise before any commit |
| Two pages disagree | `docs/spec/` page vs a still-live `format-spec.md` paragraph | `docs/spec/` wins; the old paragraph is not edited | A reader can resolve any conflict by the precedence order alone |
| Corpus contradicts prose | A `docs/spec/` statement fails on real archive files (R-17, R-18 are the known cases) | The page is corrected in place and cites the files with a count | Without a count the correction is not accepted |
| Citation in code | `format-spec §3.6` already in source | Stays valid until 3.28; new code cites `docs/spec/<path>#<anchor>` | No lint breaks: nothing validates citations today (census) |
| Old file opened | Reader opens `docs/format-spec.md` | First lines name `docs/spec/` as the replacement and say the body is frozen pending 3.28 | The body stays readable, so section numbers in 380 existing citations still resolve |

</frozen-after-approval>

## Code Map

- `_bmad-output/initiative-rpgtoolkit-reawakened/discovery/docs-spec-reconciliation.md:11-23` — the owner decisions and the "What 'replaces' means in practice" bullets this ADR records; read-only here.
- `docs/adr/0006-clean-room-spec-extraction.md` — format model; its context line (`:5`) links `format-spec.md`; amend by an `Amended by ADR 0007` note and by naming `docs/spec/` as a second recognised provenance path (owner attestation, round 4), following ADR 0002's `Amends:` precedent. Do not rewrite its steps 1 to 4.
- `docs/provenance/extraction-log.md:10,12` — round 4 is already recorded as owner-attested; cite it, do not edit it.
- `docs/guardrails.md` — G5 rationale `:99` ("engine-features §14"), G7 rule 2 `:123` (names format-spec, engine-features, editor-features), and the Exceptions example `:138` (`guardrail-exception: G3 ADR-0007`). The last one becomes wrong the moment ADR 0007 exists with a different subject; change the example to a neutral placeholder.
- `CLAUDE.md:23` — Working notes "Specs:" line; amend to name `docs/spec/` (with E-xx labels on its engine pages) and `docs/editor-features.md` (T-xx).
- `README.md:41-42` — the two spec links; amend.
- `CONTRIBUTING.md:30` (authored fixtures cite format-spec) and `:114` (the dump paragraph lists readers by `format-spec` section); amend to the new form only where the ADR's rule applies, and leave section numbers that still resolve in the banner-only old file.
- `.github/pull_request_template.md:15` — the "I cited the docs/ sections" checkbox names "format-spec sections"; amend.
- `_bmad-output/initiative-rpgtoolkit-reawakened/architecture-rpgtoolkit-reawakened/architecture-rpgtoolkit-reawakened.md` — 13 `format-spec` and 1 `engine-features` mention; the entry's `verify` lets this commit touch the spine, so point each at `docs/spec/` or at the ADR's map. Check first whether a single "Source documents" sentence covers most of them.
- `docs/format-spec.md`, `docs/engine-features.md` — a superseded banner as the first lines, nothing else.
- `docs/spec/README.md` — states no normative status today (verified: the word does not appear). The ADR names this a 1.14 or 2.23 task; do not edit it here.

## Tasks & Acceptance

**Execution:**
- [ ] `docs/adr/0007-docs-spec-is-the-normative-specification.md` — new ADR, status `Proposed`, dated; Context (the owner decisions, the census numbers, the round-4 provenance), Decision 1 to 4 as in Intent, Consequences, Alternatives (keep both specs and rule precedence per page; copy `docs/spec/` into the old files; delete the old files now and re-point in one sweep), References.
- [ ] `docs/guardrails.md` — G5 rationale and G7 rule 2 re-pointed; G7 gains one sentence recognising owner attestation as the provenance for `docs/spec/`; Exceptions example made neutral.
- [ ] `docs/adr/0006-clean-room-spec-extraction.md` — amendment note and the second provenance path.
- [ ] `CLAUDE.md`, `README.md`, `CONTRIBUTING.md`, `.github/pull_request_template.md` — one-line re-points.
- [ ] Architecture spine — re-point the `format-spec` and `engine-features` mentions.
- [ ] `docs/format-spec.md`, `docs/engine-features.md` — superseded banner.

**Acceptance Criteria:**
- Given ADR 0007, when read, then it states the four decisions, each traceable to the owner's 2026-10-15 ruling or the reconciliation note's "What replaces means" list, and its status is `Proposed` until accepted.
- Given any file named in the Code Map, when read after the change, then every pointer to a spec names `docs/spec/` (or `docs/editor-features.md`), and none still tells an implementer to treat `format-spec.md` or `engine-features.md` as normative.
- Given `docs/format-spec.md` and `docs/engine-features.md`, when opened, then each begins with a banner naming `docs/spec/` and ADR 0007, and `git diff --stat` shows only added lines for both.
- Given the staged files, when listed, then they are within `docs/`, `CLAUDE.md`, `README.md`, `CONTRIBUTING.md`, `.github/pull_request_template.md` and the architecture spine only.
- Given ADR 0007's citation rule, when a migration entry (1.14, 2.23, 3.27, 16.13) is planned, then the ADR tells it where its old-section-to-new-anchor map goes and what a row looks like.
- Given every relative link in the ADR and the edited docs, when followed, then it resolves.

## Implementation Notes

- **Why a banner and not a stub.** The entry's description says the old files "become redirect stubs", and its `verify` says they "open with a stub". Replacing the body now would delete content that exists nowhere else yet: §15's corpus evidence, the §4.8 and §13 rulings, L1 to L26, and the E-xx catalogue that 1.14 has not migrated. This plan reads "stub" as "a banner that opens the file" and leaves the bodies for 3.28.
- **Citation map is a small addition beyond the entry text.** The reconciliation note says citations are "re-pointable mechanically". That needs a table from old section to new anchor, written by the four migration entries as they move content, or 3.28 cannot be mechanical. The ADR fixes only the form (a markdown table under `docs/spec/`, one row per old section or E-xx id, columns old, new, status); it builds no tool. <!-- OWNER: citation-map — added because the sweep is unscriptable without it. Alternative: let 3.28 reconstruct the map by hand at the end of three epics. Change here if you prefer that. -->
- **Anchor form.** Existing `docs/spec/` pages use ordinary Markdown headings, which GitHub slugs automatically (for example `tiles.md#tile-bitmap-tbm`, already used by entry 2.25). E-xx labels need an explicit anchor because they sit on paragraphs, not headings: the ADR fixes `<a id="e-33"></a>` (lowercase) on the line before the paragraph. <!-- OWNER: e-xx-anchor — alternatives are a heading per E-xx (noisy) or a bracketed `[E-33]` prefix with no anchor (not linkable). Chosen: explicit lowercase anchor. -->
- **Census, for the Context section.** `packages/`: 382 `format-spec` occurrences in 86 files; `_bmad-output/`: 194 in 37 files; `docs/`: 75 in 15 files; `tools/`: 3; `docs/spec/` and `golden/`: 0. No tool validates a citation, so the ADR should say that re-pointing in 3.28 is verified by grep, not by a gate.
- **Provenance wording.** Round 4 states "owner-attested clean", with no question list, no extractor and no reviewer (log line 12). The ADR records that as an accepted second path for a whole-spec authoring pass, and the ADR 0006 amendment keeps steps 1 to 4 as the path for any later extraction round.

## Design Notes

Order of work: draft the ADR as `Proposed`; present it at the plan-checkpoint review with the two OWNER markers above; set `Accepted` with the date only after the human accepts; then amend the binding documents and make the one doc-only commit. The entry carries `plan_checkpoint = true`, so nothing past this plan runs before the human approves it.

## Verification

**Commands:**
- `git diff --name-only` — expected: only the paths in the acceptance criterion above.
- `git diff --stat docs/format-spec.md docs/engine-features.md` — expected: insertions only.
- `grep -rn "format-spec\|engine-features" CLAUDE.md README.md .github/pull_request_template.md docs/guardrails.md` — expected: no line that tells an implementer to treat either as normative.
- `pnpm provenance && pnpm licence` — expected: pass (docs-only still has to pass).

**Manual checks:**
- Follow every relative link in ADR 0007 and in each amended passage.
- Read ADR 0007 beside `docs-spec-reconciliation.md` "What replaces means in practice" and confirm no ruling in the ADR goes beyond it.

## Plan Change Log

- 2026-10-15 — initial plan, drafted from the entry, the reconciliation note and a census of the citations. Two OWNER markers (citation map, E-xx anchor form) and one reading of "stub" (banner, not replacement) are marked for the plan-checkpoint review.
