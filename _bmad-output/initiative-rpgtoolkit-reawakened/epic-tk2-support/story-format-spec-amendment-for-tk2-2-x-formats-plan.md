---
title: 'Format-spec amendment for TK2 (2.x) formats'
type: 'chore'
ticket: '3'
created: '2026-10-14'
status: done
baseline_revision: '4347c433e7a17bf2d2c943655eef851d428a8ddb'
risk: 'medium'
context: ['{project-root}/docs/guardrails.md', '{project-root}/docs/adr/0006-clean-room-spec-extraction.md', '{project-root}/docs/format-spec.md', '{project-root}/_bmad-output/initiative-rpgtoolkit-reawakened/epic-tk2-support/discovery/tk2-formats-research.md', '{project-root}/docs/provenance/facts-round-1.md']
---

<frozen-after-approval reason="human-owned intent — do not modify unless the human renegotiates">

## Intent

**Problem:** Toolkit 2 (2.x) games are the majority of the surviving corpus, and `docs/format-spec.md` cannot currently describe them. It documents several formats as binary-only, and it gets two 2.x binary layouts wrong: the `.gam` minor-2 record list uses `i32` where the 2.x files use `i16` (leaving 1506 unread bytes on every BusDriver file and running off the end of FinalDestiny's two), and the `.tem` minor 3–4 field set is missing entirely (leaving 407–797 residue bytes per file). Four extensions have text layouts documented nowhere, one extension (`.fnt`) appears in no section, and the `.bkg` text grid is stated as 19 × 19 when the files are 19 × 11. Under G7 no reader for any of this can be written until the doc says it first.

**Approach:** Add a new section `§15 — Toolkit 2 (2.x) formats` to `docs/format-spec.md`, in its own doc-only commit, following the house model of §9.12: a plain-language introduction, a ruling summary, one subsection per format with a short worked example, the corrections to the existing sections, an open-questions list and a References block. Also correct the four existing statements in place (§2 rows 10 and 21, §3.1's palette paragraph, §6.1's caveat, §8.3's text-form sentence) so the document does not contradict itself. Every layout cites either the archive's own data files with a file count, or a reviewed entry-2 answer, and nothing is taken from the legacy source (G7 allows reading legacy *data*, never legacy *source*).

</frozen-after-approval>

## Boundaries & Constraints

**Always:** doc-only — no code, no readers, no fixtures (that is tickets 4–7 and 16.9); one commit for `docs/format-spec.md` in its own commit and the plan in a separate commit (G7 rule 4); cite the evidence for every section; mark any question the evidence cannot settle as an explicit open question; keep worked examples short and anonymised of anything that reads as game prose; follow §9.12's shape (ratified / ruled / deferred verdicts, `<!-- OWNER: … -->` notes naming the alternative, References at the end).

**Never:** open `../rpgtoolkit` or the TK3 source bundle in the archive (G7 — the rule is about the GPL source, not about data files); push, open a PR, or advance the ticket past `ready-for-dev` before the owner's plan-checkpoint review; re-do the already-committed §13.1 TK2 Pro ruling (L21); invent a layout the data does not support; present an unverified sketch as verified.

## Key Decisions

1. **One new §15 rather than edits scattered through §2–§13.** The text forms are a coherent body of evidence and belong together; the four wrong existing statements are corrected in place with a pointer into §15 so the spec never contradicts itself. (§9.12 is the precedent for a numbered amendment section.)
2. **The four undocumented text layouts rest on the entry-2 answers plus a data check.** `.brd` and `.gam` are checked against two games each; `.itm` and `.tem` are checked against two files each because the corpus writes those two forms in only one game. That limitation is stated in the amendment and repeated here rather than hidden. <!-- OWNER: the `.itm` and `.tem` worked examples cannot be "checked against at least two games" — no second corpus game writes either text form. Alternative: widen the corpus for those two extensions by mining more archive games, which the ticket's evidence list does not offer and 16.9 does not cover. Decided: check the two files in the only game that has them and record the limitation. -->
3. **`.gph` v1 is recorded, not promised.** The owner's own `v1tile.gph` (288 bytes) confirms §3.2's v1 sentence, but Toolkit 1.x is out of scope for the first release (§9.9), so §15 records it as evidence-backed and promises no reader. <!-- OWNER: chose "record v1, promise no reader" over "add a v1 reader"; a later entry can add it from §3.2's v1 sentence plus the sample. -->
4. **Zero-byte placeholders: tolerate with a warning.** Seven zero-byte data files exist (2 `.brd`, 2 `.itm`, 3 `.spc`), some referenced by real games. <!-- OWNER: alternatives were skip silently or refuse with a located error; a hard error would break a game the author shipped, so the amendment recommends tolerating an empty placeholder with a warning. Change here if the owner prefers skip. -->
5. **The `.bkg` text grid is 19 × 11, not 19 × 19.** 209 tile references and 209 shade cells, with the shade triples lining up in rows of 19 across 11 rows. This corrects §8.3 in place and is recorded in §15.14.

## Per-section table

The right column names the entry-2 (16.2) answer each section uses, or "—" when the section rests on the archive data alone.

| §15 section | Evidence (archive path + file count) | 16.2 answer |
|---|---|---|
| 15.2 text `.gam` | BusDriver `DEMO.GAM`, Caoquest `caoquest.gam`, `devilsnight.tpk` `main.gam` — 3 files, 2 games + 1 bundle | Q2 |
| 15.3 text `.brd` | FinalDestiny 1, Caoquest 14, School2Demo 1, ChimeranEmpire 1 — 17 files, 4 games | Q1 |
| 15.4 text `.itm` | Caoquest 16 — 16 files, 1 game | Q3 |
| 15.5 text `.tem` | Caoquest `start.tem`, `swim.tem` — 2 files, 1 game | Q4 |
| 15.6 text `.ene` | FinalDestiny 7, Caoquest 5, School2Demo 7, ChimeranEmpire 33 — 52 files, all 363 lines | — |
| 15.7 text `.anm` | Caoquest 7, ChimeranEmpire 9, 2.20b demo 1 — 17 files, all 160 lines | — |
| 15.8 text `.spc` | Caoquest 8 — all 13 lines; no text `.ste` anywhere (deferred) | — |
| 15.9 text `.bkg` | FinalDestiny 3, Caoquest 5, School2Demo 6, ChimeranEmpire 9 — 23 files, all 845 lines | — |
| 15.10 `.tan` | ChimeranEmpire 33 — all parse to the last byte | — |
| 15.11 `.gph` v2 | FinalDestiny 1, School2Demo 5 — 6 files, runs sum to 1024 | — |
| 15.12 `.fnt` | FinalDestiny 1, Caoquest 1, School2Demo 1, ChimeranEmpire 2 — 5 files, all 2051 lines | Q7 |
| 15.13 `.tst` palette | official 2.0 Tileset spec `wayback/rpgtoolkit.com/dev_repo/docs/tst.html` | — |
| 15.14 `.gam` minor 2 | FinalDestiny 2, LittleMan 1, BusDriver 10, School2Demo 1, ChimeranEmpire 1 — 15 files, 0 residue with `i16` | Q5 |
| 15.14 `.tem` minor 3–4 | FinalDestiny 2 (one minor 3, one minor 4), Caoquest 2, School2Demo 2, ChimeranEmpire 10 — 16 files; 14 close exactly | Q6 |

## Acceptance

- `docs/format-spec.md` gains §15 with subsections for every format the ticket names: the text layouts of `.gam`, `.brd`, `.itm`, `.tem`, the verified text forms of `.ene`, `.anm`, `.spc`, `.bkg`, the `.tan` and `.gph` v2 verifications, the new `.fnt` section and the `.tst` 8-bit palette.
- Every new or changed section cites either an archive evidence path with a file count or an entry-2 answer id.
- The four previously undocumented text layouts (`.gam`, `.brd`, `.itm`, `.tem`) each carry a worked example; `.brd` and `.gam` are checked against two games, and `.itm`/`.tem` against two files in the one game that writes them (limitation recorded, Key Decision 2).
- §2 rows 10 and 21, §3.1's palette paragraph, §6.1's caveat and §8.3's text-form sentence are corrected in place so no section contradicts §15.
- The two new binary corrections are stated with their measured effect: 15/15 `.gam` minor-2 files reach the last byte; 14/16 `.tem` minor-3/4 files do, with the two that do not named as open questions.
- Everything the evidence could not settle is an explicit open question (§15.15) and is repeated in this plan, never a silent guess.

## Verification

- `pnpm typecheck && pnpm test && pnpm lint && pnpm provenance && pnpm licence` — all pass with the doc change in place (docs-only still has to pass).
- Every file count quoted in §15 was measured on the extracted corpus (`/tmp/tk2-163`, a throwaway extraction of the six games plus the 2.20b demo) with the spec's own detection byte; the `.gam` and `.tem` corrections were checked by parsing every relevant binary file to end-of-file.
- The `.brd`, `.gam`, `.itm` and `.tem` worked examples were read from the files named and their line totals checked against the layout's arithmetic.
- Review: this plan and the amendment are drafts; the owner reads them at the plan checkpoint before any reader entry starts.

## Plan Change Log

- 2026-10-14 — initial amendment: §15 written from the archive data and the entry-2 answers; in-place corrections to §2, §3.1, §6.1 and §8.3; two open questions promoted from the discovery notes (`.gam` text header path, `.gam` text plugin count) and two new ones recorded (`.tem` minor 3–4 tail, `.bkg` text line 218).
