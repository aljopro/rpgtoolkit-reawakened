# Extraction log (ADR 0006)

One entry per round in which an extractor read the legacy source. Newest last.

| Round | Date | Source revision | Questions | Extractor session | Reviewer session | Reviewer verdict | Landed in |
|---|---|---|---|---|---|---|---|
| 1 | 2026-10-12 | 9191b919 (and 08f2fe3d for the 2.x text board reader) | questions-round-1.md, Q1 to Q13, plus an addendum Q14 to Q18 later moved to round 2 | disposable extractor subagent (ids in the orchestrating session's transcript) | reviewer subagent, then a second confirming reviewer, after an editor applied the first review | PASS WITH EDITS twice: 2 blockers and 12 minor findings reworded, then 0 blockers and 4 minor points applied | 55588ce, `facts-round-1.md` |
| 2 | 2026-10-12 | 9191b919 | questions-round-2.md, R2-Q1 to R2-Q26 | disposable extractor subagent (ids in the orchestrating session's transcript) | reviewer subagent, then a second confirming reviewer, after an editor applied the first review | PASS WITH EDITS twice: 2 blockers and 9 minor findings reworded, then 0 blockers and 3 minor wording points applied | 25ae06e, `facts-round-2.md` |
| 3 | 2026-10-12 | 9191b919 | questions-round-3.md, R3-Q1 to R3-Q3 | disposable subagents Extractor3 and Reviewer3 in the orchestrating session | disposable subagents Extractor3 and Reviewer3 in the orchestrating session | PASS WITH EDITS, edits applied; second confirming review PASS WITH EDITS, edits applied | this commit, `facts-round-3.md` |
