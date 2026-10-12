# ADR 0006 — Clean-room spec extraction from the legacy source (UNAPPROVED DRAFT)

* **Status:** Proposed
* **Date:** 2026-10-11
* **Context documents:** [guardrails.md](../guardrails.md) G7, [format-spec.md](../format-spec.md), [0003-permissive-licences-acceptable.md](0003-permissive-licences-acceptable.md), [0005-independent-product-v1-and-native-format.md](0005-independent-product-v1-and-native-format.md)

## Context

G7 says implement only from `docs/` and never open the legacy GPL source while writing code; when the docs are wrong or missing something, fix the doc first. TK2 coverage (2.x text formats, TK2 RPGCode, the 3.x update wizard's conversion rules) may be answerable only from the legacy source. We need a documented way to learn facts from it without contaminating the implementers.

## Decision

1. **Two roles that never overlap.** An *extractor* may read the legacy source to answer a written list of questions. An *implementer* (human or agent) writes code and reads only `docs/`. A person or agent session that acted as extractor never writes implementation code for the covered area, and extractor transcripts are not given to implementers.
2. **Questions first.** Each extraction round starts from a numbered question list committed or attached to the ticket, derived from gaps found in non-source evidence (installers, help files, sample games). The extractor answers only those questions.
3. **Output is prose facts.** Allowed: byte and field layouts, value tables, ordering and precedence rules, behaviour described in the extractor's own words, constants that are data (magic strings, enum values). Not allowed: source code or pseudocode that follows its structure, identifiers, comments, error strings, file or function names beyond what the question needs, structure or ordering of the original program.
4. **Review gate.** A person other than the extractor reviews the output for copied expression before it enters `docs/`, and the provenance scan (`tools/provenance`) must pass. The doc lands in its own commit (G7), citing the question list.
5. **Provenance record.** Each round records the source revision consulted, the date, who acted as extractor and who reviewed, in the commit message and in `docs/provenance/`.
6. **Minimal reach.** Where the archive evidence (installers, help, sample data) answers a question, the source is not consulted.

## Consequences

* The MIT/Apache claim rests on an auditable separation, as the format spec already does.
* Extraction is slower than reading the source while coding; that is deliberate.
* Implementers hit "docs are silent" and raise a question instead of looking it up.

## Open questions

* Who acts as extractor and who reviews (the owner, a person she trusts, or a discarded agent session plus owner review).
* Whether the provenance scan needs new markers for extractor output.
