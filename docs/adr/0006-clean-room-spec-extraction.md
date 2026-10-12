# ADR 0006 — Clean-room spec extraction from the legacy source

* **Status:** Accepted
* **Date:** 2026-10-11
* **Context documents:** [guardrails.md](../guardrails.md) G7, [format-spec.md](../format-spec.md), [0003-permissive-licences-acceptable.md](0003-permissive-licences-acceptable.md), [0005-independent-product-v1-and-native-format.md](0005-independent-product-v1-and-native-format.md)

## Context

G7 says implement only from `docs/` and never open the legacy GPL source while writing code; when the docs are wrong or missing something, fix the doc first. Toolkit 2 coverage (2.x text formats, TK2 RPGCode, the 3.x update wizard's conversion rules) may be answerable only from the legacy source. We need a documented way to learn facts from it without contaminating the people and agents who write the code.

## Decision

1. **Separate roles.** An *extractor* may read the legacy source to answer a written question list. An *implementer* (human or agent) writes code and reads only `docs/`. The extractor is a disposable subagent session started for one round; the assistant that orchestrates the work and writes tickets and code never reads the source itself. The extractor's transcript is not given to implementers.
2. **Questions first.** Each round starts from a numbered question list, approved by the project owner, derived from gaps that the archive evidence (installers, help files, sample games, community documents) could not answer. The extractor answers only those questions.
3. **Output is prose facts.** Allowed: byte and field layouts, value tables, ordering and precedence rules, behaviour in the extractor's own words, constants that are data (magic strings, enum values). Not allowed: source code or pseudocode that follows its structure, identifiers, comments, error strings, file or function names beyond what a question needs, or the structure or order of the original program.
4. **Review by a second agent.** A separate reviewer subagent, which has not seen the extractor's transcript, reads the extractor's staging file, checks it for copied expression against the rules in 3, and returns findings. Only reviewed text enters `docs/`, in its own commit (G7), citing the question list. The provenance scan does not cover this step: it skips `docs/` and checks code.
5. **Audit.** Every round appends an entry to `docs/provenance/extraction-log.md`: date, source revision consulted, the questions, extractor and reviewer session ids, the reviewer's verdict, and the commit that landed the facts. The assistant tells the project owner when a round starts and when it finishes, and the owner may spot-check any round.
6. **Minimal reach.** Where the archive evidence answers a question, the source is not consulted.

## Consequences

* The MIT/Apache claim rests on an auditable separation, as the format spec already does.
* Extraction is slower than reading the source while coding; that is deliberate.
* Implementers who find the docs silent raise a question instead of looking it up.

## Open questions

* Whether a reviewer agent catches paraphrase that follows the original's structure; the owner's spot checks are the backstop.
