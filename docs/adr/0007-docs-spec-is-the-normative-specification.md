# ADR 0007 — `docs/spec/` is the normative specification

* **Status:** Accepted (2026-10-15)
* **Date:** 2026-10-15
* **Amends:** [0006-clean-room-spec-extraction.md](0006-clean-room-spec-extraction.md) (adds a second provenance path); [guardrails.md](../guardrails.md) G5 and G7 (which spec they name)
* **Context documents:** [guardrails.md](../guardrails.md) G7, [0006-clean-room-spec-extraction.md](0006-clean-room-spec-extraction.md), [../provenance/extraction-log.md](../provenance/extraction-log.md) round 4, [../spec/README.md](../spec/README.md)

## In plain terms

On 2026-10-15 the owner added `docs/spec/`, a byte-by-byte and behaviour-by-behaviour description of Toolkit 3.1, and decided it replaces `docs/format-spec.md` and `docs/engine-features.md`. This ADR writes that decision down so every later change has one spec to cite and one rule for what happens when two pages disagree. It does not decide any of the content disagreements between the old and new specs; those are ruled one by one in the tickets that migrate each area.

## Context

The decision so far lives only in a discovery note and in epic Notes. The binding documents still send an implementer to the old files: `CLAUDE.md`, `docs/guardrails.md` (G5 rationale, G7 rule 2), `README.md`, `CONTRIBUTING.md`, the pull request template, ADR 0006's context line and the architecture spine. `docs/spec/README.md` does not say it is normative, and none of its engine pages carries the E-xx IDs the epics cite.

Citations are everywhere. A census on 2026-10-15 counted `format-spec` in 382 places across 86 files in `packages/`, 194 across 37 files in `_bmad-output/`, 75 across 15 files in `docs/` and 3 in `tools/`. Nothing validates a citation; the provenance scan, the licence gate and the dependency graph do not look at them.

`docs/spec/` was not produced under ADR 0006. The owner states it was written under a clean-room process, contains no legacy source and may be used as-is. The extraction log records that as round 4, with no question list, no extractor and no reviewer.

## Decision

1. **`docs/spec/` is the normative specification** of what Toolkit 3.1 does: its file formats and its engine behaviour. It replaces `docs/format-spec.md` and `docs/engine-features.md`. `docs/editor-features.md` (T-xx) is not replaced. *Reason: one spec to implement from, and a rule for which wins, removes the cost of reading two and guessing.*
2. **Reawakened rules sit beside the legacy behaviour.** Where this project deliberately differs from, or adds to, what Toolkit 3.1 does (determinism, size limits, our own package format, owner rulings), the rule goes into the `docs/spec/` page that covers the legacy behaviour, as a block opening with the words **Reawakened rule**. *Reason: one page then shows both, and an implementer can tell which is which.*
3. **Real files beat prose.** Where the archive corpus contradicts a `docs/spec/` statement, the page is corrected in place and cites the files with a count. *Reason: `docs/spec/` itself says its legacy layouts come from the original programs' reading logic and that no Toolkit 1–2 sample files were available; files are the stronger evidence.*
4. **Citations take the form `docs/spec/<path>#<anchor>`.** Headings keep their automatic Markdown anchors (for example `docs/spec/formats/tiles.md#tile-bitmap-tbm`). E-xx IDs are carried on the `docs/spec/engine/` pages as explicit lowercase anchors, `<a id="e-33"></a>`, on the line before the paragraph they label, so an existing E-xx citation stays resolvable. New code and plans cite this form from now on. *Reason: a citation that can be followed is the only kind that stays checked by readers.*
5. **No old-to-new citation map is kept.** Entry 3.28 re-points every remaining citation by hand at the end of the three migrating epics, and verifies it by searching for the old file names, since no tool checks citations. *Reason: a map would have to be maintained by four tickets for one sweep; the owner chose not to carry it.*
6. **The two old files get a banner, not a replacement.** `docs/format-spec.md` and `docs/engine-features.md` open with a notice that `docs/spec/` replaces them and that they are frozen pending entry 3.28. Their bodies stay until 3.28 deletes both files, because they hold content that exists nowhere else yet (the Toolkit 2 section and its corpus evidence, the pre-vector and package rulings, the E-xx catalogue). Nothing is added to them. Their section numbers stay valid for the citations that still use them.
7. **Provenance.** Owner attestation is recognised as the provenance of `docs/spec/` (extraction log round 4). ADR 0006's steps 1 to 4 remain the only path for any later extraction from the legacy source.

## Consequences

* Every behaviour change cites one spec. During the migration, a citation to either old file is still valid; a citation to `docs/spec/` is preferred.
* The migration tickets (1.14 engine features, 2.23 formats §1–§14, 16.13 Toolkit 2 §15, 3.27 RPGCode §9, then the sweep 3.28) now have a shared rule for where a rule goes and how it is cited.
* Re-pointing about 580 citations at the end is manual work and is the main cost of decision 5.
* The 120-fps loop, the sprite speed rules, the battle model and the other conflicts the discovery note lists as R-50 to R-61 stay open and are ruled by the epics that own them.
* G5 and G7 text, `CLAUDE.md`, `README.md`, `CONTRIBUTING.md`, the pull request template and the spine change to name `docs/spec/`; the guard-rails' intent does not change.

## Not decided here

The content rulings of the reconciliation note (`R-02` to `R-39` and `R-50` to `R-61`). Only the mechanism is fixed here: which spec is normative, where a Reawakened rule goes, which evidence wins and how a citation is written.

## Alternatives considered

* **Keep all three specs and rule precedence page by page.** Rejected: two sources of truth for the same layout invite the disagreements this ADR exists to end.
* **Replace the old files with short stubs now.** Rejected: it would delete content that has not yet been migrated.
* **Delete the old files now and re-point every citation in one sweep.** Rejected: about 580 citations would change at once, before the content they point to exists in `docs/spec/`.
* **Keep an old-to-new citation map.** Rejected by the owner (decision 5).

## References

* `_bmad-output/initiative-rpgtoolkit-reawakened/discovery/docs-spec-reconciliation.md`, "Owner decisions" and "What 'replaces' means in practice".
* `docs/provenance/extraction-log.md`, round 4.
* Ticket 1.13, plan `_bmad-output/initiative-rpgtoolkit-reawakened/epic-platform-baseline/story-adr-0007-docs-spec-is-the-normative-specification-plan.md`.
