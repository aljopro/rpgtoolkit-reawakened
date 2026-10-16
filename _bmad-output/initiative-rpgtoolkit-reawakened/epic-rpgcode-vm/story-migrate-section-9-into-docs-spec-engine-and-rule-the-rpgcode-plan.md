---
title: 'Migrate section 9 into docs/spec/engine and rule the RPGCode conflicts'
type: 'chore'
ticket: '27'
created: '2026-10-15'
status: done
baseline_revision: '4843c435566ed7110cdd0cd8e019b95865455a2a'
route: 'full'
route_source: 'auto'
risk: 'high'
context: ['{project-root}/docs/guardrails.md', '{project-root}/docs/adr/0007-docs-spec-is-the-normative-specification.md', '{project-root}/_bmad-output/initiative-rpgtoolkit-reawakened/discovery/docs-spec-reconciliation.md', '{project-root}/docs/spec/engine/rpgcode-language.md', '{project-root}/docs/spec/engine/rpgcode-functions.md']
---

<frozen-after-approval reason="human-owned intent — do not modify unless the human renegotiates">

## Intent

**Problem:** `docs/format-spec.md` §9 (lines 706 to 1323, 618 lines) holds the whole RPGCode specification our script VM is built from: lexical rules, operators, statements, modules, objects, error handling, the older dialects, the engine variables, the catalogue and 26 owner rulings. The normative page for it, `docs/spec/engine/rpgcode-language.md`, is 90 lines, and `docs/spec/engine/rpgcode-functions.md` covers the catalogue. Almost all of §9 therefore has no counterpart on the normative page, and ten findings (R-30 to R-39) say the two disagree. Entries 3.5, 3.7, 3.9, 3.12, 3.16 and 3.21 cannot be built from a spec that exists in two places, and 3.28 cannot delete the old one.

**Approach:** In one doc-only commit (G7), move §9 onto the two `docs/spec/engine/` pages under ADR 0007. Where `docs/spec` states what Toolkit 3.1 does and our §9 differs, `docs/spec` wins and our text goes. Where our rule is a deliberate departure forced by a guard-rail or an owner ruling, it stays as a **Reawakened rule** block beside the legacy behaviour. Everything in §9 with no counterpart (the rule ids LEX, EXP, STX, FUN, PRG, SEM, OOP, ERR, MOD and THR, the dialects, §9.12 to §9.14) migrates as Reawakened rule blocks with its OWNER rulings kept. Bring the command catalogue JSON to the 282 names of `docs/spec/engine/rpgcode-functions.md`.

## Boundaries & Constraints

**Always:** Rule each of R-30 to R-39 as a legacy fact, a Reawakened rule or a named open question, and cite the owner's ruling beside any rule that departs from `docs/spec`. Keep all 26 OWNER comments of §9 and the rulings they record. Mark a departure from Toolkit 3.1 as a departure (round 5, Q3: 3.1 read `opt!=1` as an assignment). Cite the corpus or the round-5 facts where a statement rests on them (`docs/provenance/facts-round-5.md`). Keep the commit to `docs/spec/engine/` and the discovery catalogue JSON. Follow the Reawakened-rule marker of ADR 0007 decision 2.

**Never:** Edit `docs/format-spec.md` beyond what 3.28 owns (it is frozen under its banner). Touch any code, test or golden. Build the per-project thread-wait setting (see U1). Add E-xx anchors to these pages (entry 1.14 owns them). Open `../rpgtoolkit` (G7). Re-rule R-01 to R-16, R-17 to R-24 or R-50 to R-61. Decide R-37's extras or R-35's warning silently: they are marked below.

## I/O & Edge-Case Matrix

Rulings the plan carries. "Owner" means Jensen's 2026-10-15 ruling that `docs/spec` wins, with the carve-outs of ADR 0007 and his earlier rulings.

| ID | Topic | Ruling | Source | Code that changes later |
|----|-------|--------|--------|-------------------------|
| R-30 | `^` precedence | `docs/spec`: below unary minus, left-associative; `-2^2 = 4`, `2^3^2 = 64`. EXP-2 part (a) goes; part (b), bitwise operators below comparisons, is not contested and stays | Owner, specs win | None yet. `lex.ts` lexes `^`; entry 3.5 implements the table |
| R-31 | `!=` | Keep LEX-3 (adjacent `!=` is "not equal") as a Reawakened rule, **stated as a departure**: 3.1 read `opt!=1` as an assignment, so the `if` was always true | Owner 2026-10-15; round 5 Q3 | `lex.ts:7-8, 284-290`, `script-frontend.test.ts:33-43` stay as built for 3.5 |
| R-32 | Blocking command inside a thread | `docs/spec`: a blocking command anywhere stops all script execution, movement and frame updates until it finishes; the screen keeps redrawing so the window does not look hung. Replaces our per-thread waits | Owner 2026-10-15; round 5 Q4 (certain, read from logic) | `vm.ts` waits phase (`:104-124`), `script-vm.test.ts:205-249`, AD-9 per-thread wait model; owners 3.9 and 3.22 |
| R-33 | Thread budget | The legacy formula `(fps - 60) x 10`, at least 10, is recorded as a legacy fact. At our fixed 60 Hz it gives 0 floored to 10, so the number stays tuned in 3.9. The unsigned wrap is not reproduced | Carve-out 2 (fixed tick); note's own ruling | `STEP_BUDGET = 1000` (`vm.ts:44`) stays provisional |
| R-34 | Object lifetime | Keep our deterministic lifetime (freed at the end of the tick it becomes unreferenced) as a Reawakened rule; record the 10-minute wall-clock collector and `<handle>::<member>` globals as legacy facts | Carve-out 2 (G3 forbids a wall clock) | None yet (3.6) |
| R-35 | Built-in vs same-named script method | `docs/spec`: built-ins bind at compile time, so a script method with a built-in's name is never called at those sites. Flips AD-8's tier order (built-in before script function) | Owner, specs win | 3.3 leaves the order open (no conflict); 3.8 |
| R-36 | Catalogue | 282 names; add `empty`, `fbranch`, `mbox`, `newplyr` (alias `newplayer`), `restorearrayscreen`, `underarrow`, `itemwalkspeed`, `shopcolors`; obsolete commands raise an error and the statement is skipped | Owner, specs win | `command-effect-catalogue.json`; 3.21 |
| R-37 | Virtual variables | `docs/spec`: 44 read-only variables, `playerx`/`playery` are tile positions. `threads[i]` and `ambientRed/Green/Blue` are not in `docs/spec`: kept as Reawakened additions (see U2) | Owner, specs win; extras per U2 | 3.12 |
| R-38a | Error line numbers | Report the exact line (a Reawakened rule). Record the legacy fact precisely: syntax errors are exact; two declaration errors are one too high | Round 5 Q5 (scripts cannot observe the offset) | 3.7 |
| R-38b | `FileInput` | **Ruled (Jensen, 2026-10-15): read lines correctly.** Strip CRLF or LF and drop nothing else. A Reawakened rule, written up as a deliberate departure from 3.1, where a line ending in LF only, or a final line with no line ending, lost its last character (CRLF lines were exact, and `FilePrint` writes CRLF so its files round-trip). The rule names the final-line case: a 3.1 author may have padded the last line of a hand-made data file, and would now get one extra character | Round 5 Q6; owner | 3.16 |
| R-38c | Other execution details | `docs/spec`: an error without a handler continues with the next statement; edits to a program during play are not picked up | Owner, specs win | 3.7, 3.8 |
| R-39 | String truthiness | `docs/spec`: strings are true unless they equal `"off"` (case-insensitive), so `""` is true | Owner, specs win | 3.5, 3.12 |
| R-40 | Short-circuit | `docs/spec`: `&&`, `\|\|` and `?:` evaluate all operands. Our §9 does not say otherwise; the old side is unverified | Owner, specs win | 3.5 |
| R-41 to R-44 | Module and error rulings | Not conflicts. Our earlier owner rulings (last definition wins with a warning, `file.` binding, in-function error handlers, modulo by zero is a catchable error) migrate unchanged as Reawakened rule blocks | Earlier owner rulings | None |

</frozen-after-approval>

## Code Map

- `docs/format-spec.md:706-1323` — §9.1 to §9.17, the source. Subsections: 9.1 encodings (14 lines), 9.2 lexical (19), 9.3 values (10), 9.4 operators (34), 9.5 statements (25), 9.6 modules (28), 9.7 objects (28), 9.8 errors (47), 9.9 older dialects (64), 9.10 variables (23), 9.11 catalogue (25), 9.12 rulings (85), 9.13 ownership (29), 9.14 follow-ups (21), 9.15 threads (39), 9.16 runtime meaning (73), 9.17 classes and objects (52).
- `docs/spec/engine/rpgcode-language.md` (90 lines) — target; headings today: `#lexical-rules`, `#keywords-and-structure`, `#expressions`, `#compatibility-notes`, `#execution`, `#threads`, `#objects-and-memory`, `#virtual-variables`, `#compile-time-constants`, `#plugin-commands`.
- `docs/spec/engine/rpgcode-functions.md` (352 lines) — the catalogue, 282 names, 14 aliases.
- `docs/spec/formats/rpgcode-program.md` — §9.1's encodings already land here; §9.9's TK2 forms may belong in `docs/spec/formats/legacy/`; the builder rules where.
- `_bmad-output/initiative-rpgtoolkit-reawakened/epic-rpgcode-vm/discovery/command-effect-catalogue.json` — 271 names today; the entry that 3.21 builds on.
- `docs/provenance/facts-round-5.md` — Q3, Q4, Q5 and Q6 answers this plan relies on.
- Landed code that cites §9 rule ids (not changed here, re-pointed by 3.28): `packages/core/src/script/lex.ts`, `errors.ts`, `vm.ts`, `builtins.ts`, and `packages/core/test/script-*.test.ts`.
- Section map, rule by rule (the evidence the builder works from): §9.2 LEX-1 to LEX-11 mostly have no `docs/spec` row (LEX-3, LEX-6, LEX-8, LEX-9, LEX-10 partly); §9.4 EXP-1 to EXP-6 (EXP-2 conflicts); §9.5 STX-1 to STX-7 and FUN-1 to FUN-7 (none or partial); §9.6 MOD-1 to MOD-3 (none); §9.7 and §9.17 OOP-1 to OOP-9 (OOP-1 and OOP-7 partly); §9.8 ERR-1, ERR-2 (partly); §9.15 THR-1 to THR-3 (partly); §9.16 SEM-1 to SEM-6 (partly; SEM-3 note 4 is R-39); §9.9 dialects, §9.12 to §9.14: none.

## Tasks & Acceptance

**Execution:**
- [ ] `docs/spec/engine/rpgcode-language.md` — migrate §9.2 to §9.9, §9.15, §9.16 and §9.17 as legacy-fact text where `docs/spec` already speaks and as Reawakened rule blocks where it does not; apply the R-30, R-32, R-35, R-39 and R-40 rulings; add the R-31, R-33, R-34 and R-38 rule blocks; keep every OWNER comment
- [ ] `docs/spec/engine/rpgcode-functions.md` — add the eight missing names with their aliases, the obsolete-command rule, and the §9.13 ownership rule block
- [ ] `docs/spec/engine/rpgcode-language.md#virtual-variables` — reconcile §9.10 with the 44 read-only variables (R-37), with the extras marked as Reawakened additions
- [ ] `command-effect-catalogue.json` — bring to 282 names and assign each of the eight new names to the stub set or the wait set from its `docs/spec` description (the assignment entry 21 expects)
- [ ] §9.12 and §9.14 — distribute the 33 settled rows into the sections they rule; §9.14's follow-ups either land in the architecture spine's Deferred list by a separate decision or are recorded as open questions here

**Acceptance Criteria:**
- Given each of R-30 to R-39, when `docs/spec/engine/` is read, then it states the item as a legacy fact, a Reawakened rule or a named open question, and the table above is reproduced nowhere else as a source of truth.
- Given R-32, when read, then the page says a blocking command stops all scripts, movement and frame updates, the screen keeps redrawing, and that our earlier per-thread wait model is withdrawn, with the owner's reasoning.
- Given R-31, when read, then the rule block says 3.1 read `opt!=1` as an assignment and that our reading is a deliberate departure.
- Given §9's 26 OWNER comments, when searched for in `docs/spec/engine/`, then each one's ruling is present.
- Given the catalogue JSON, when counted, then it holds 282 names and every name in `rpgcode-functions.md`.
- Given the commit, when its files are listed, then they are within `docs/spec/engine/`, `docs/spec/formats/` (only if §9.1 or §9.9 move there) and the catalogue JSON.
- Given a person's review, when the plan-checkpoint and the commit are read, then a person approved it.

## Implementation Notes

- **Ruled — U1 (Jensen, 2026-10-15): every blocking command waits the whole game, always.** There is no per-project setting for per-thread waits. A setting for new games (imported games defaulting to off) is a possible future enhancement; the rule block in `docs/spec/engine/rpgcode-language.md` may mention it as one, and nothing is built or reserved for it.
- **Ruled — U2 (Jensen, 2026-10-15): keep the R-37 extras.** `threads[i]` and `ambientRed/Green/Blue` stay as Reawakened additions, marked as such.
- **Ruled — R-38b (Jensen, 2026-10-15): read lines correctly**, as a deliberate departure from 3.1, with the final-line caveat named in the rule block (see the matrix). Optional, not ruled: the importer could warn when a game ships data files with LF-only lines or no final newline, the only files whose behaviour changes. That warning is recorded as an open question and nothing is built.
- **Ruled — U5 (Jensen, 2026-10-15): reading past the end of a file returns an empty string with no error and stays at the end.** Any diagnostic goes to a debug log, not a script error. The paragraph below holds the legacy facts (round 5, Q11) and the rule as proposed.
- **U5 — reading past the end of a file: answered (round 5, Q11, `docs/provenance/facts-round-5.md`); the rule is proposed, not yet ruled.** Legacy facts, read from logic, with one Windows end-of-file detail from memory and unchecked: `FileInput` past the end returns an empty string with no error, the position does not move, and a blank line looks the same as the end; `FileEOF` is true once the position reaches the file's size, so after the last line (line ending included) it is already true and a `while (!FileEOF(...))` loop never reads past the end; `FileInput` on a file that is not open silently does nothing and sets no return value. Proposed Reawakened rule (the answerer's recommendation): reading past the end returns an empty string with no error and leaves the position at the end; any diagnostic goes to a debug log, not a script error, because 3.1 games may read past the end routinely. A tiny hang risk exists only if Windows reports end of file as a successful zero-byte read, which does not apply to a rebuild. <!-- OWNER: U5 — confirm the proposed rule at the checkpoint. -->
- **Ruled — U4 (Jensen, 2026-10-15): warn.** A script method named like a built-in is never called at compile-bound sites, as in 3.1, and the rule block requires a warning at the definition, in line with the owner's 2026-10-11 rule that every override warns.
- **Ruled — the entry's map clause (Jensen, 2026-10-15): no section map.** The entry's `verify` asked for a row per §9 subsection in a map for entry 28. ADR 0007 decision 5 keeps no citation map, and 3.28 re-points by hand, so building one here would be work 3.28 repeats. The section map in the Code Map is working evidence for the builder, not a deliverable, and the entry's `verify` was amended to match.
- **Size.** The migration adds roughly 500 lines to a 90-line page. The builder may split it into more pages under `docs/spec/engine/` if one page becomes unreadable; the entry names two pages, so splitting is a plan change, not a free choice.
- **Why risk is high.** Nine source and test files under `packages/core` cite these rule ids (`lex.ts`, `errors.ts`, `vm.ts` and the script tests among them), and R-32 reverses a landed design (AD-9's per-thread waits). The doc commit changes no code, but 3.9 and 3.22 must build to it.
- **What this does not settle.** R-50 to R-61 (movement, battle, audio, editor, plugin contract) belong to their epics; R-33's number is 3.9's.

## Plan Change Log

- 2026-10-15 — initial plan, from the entry, the reconciliation note, a scout's section map and conflict table, and the owner's rulings of the same day: specs win with the ADR 0007 carve-outs, R-31 kept, R-32 ruled (freeze). Round 5 answered Q3 to Q6 and supplied the legacy facts for R-31, R-32 and R-38. Four open points (U1 to U4) and the entry's map clause are marked for the plan-checkpoint review.
- 2026-10-15 — owner ruled R-38b: read lines correctly, as a named departure from 3.1 (the plan had provisionally reproduced the drop; U3 is closed). A new open point U5 (reading past the end of a file) was added because the detail was cut off. Corrected a wrong baseline hash and a miscount of test files in the first draft. Open points now: U1, U2, U4, U5 and the entry's map clause.
- 2026-10-15 — owner ruled U1 (always wait the whole game; no setting, a possible future enhancement), U2 (keep the R-37 extras) and U4 (warn on a script method shadowed by a built-in). The U5 answer arrived the same day (round 5, Q11, reviewed and logged); it is recorded as legacy facts plus a proposed rule. Still open: confirmation of the U5 rule and the entry's section-map clause.
- 2026-10-15 — owner confirmed the U5 rule (empty string, no error, position stays at the end). Only the entry's section-map clause is still open.
- 2026-10-15 — owner ruled the map clause: no section map (ADR 0007 decision 5), and the entry's `verify` was amended. All open points are closed; plan is `ready-for-dev`.


## Design Notes

Order of work: pages first (R-30, R-35, R-36, R-39, R-40 are mechanical), then the rule blocks for the departures (R-31, R-33, R-34, R-38a), then the R-32 rewrite, which has the largest ripple, then the catalogue JSON. The entry carries `plan_checkpoint = true`: no migration starts before the human has approved this plan and ruled U1 to U4.

## Verification

**Commands:**
- `git diff --name-only` — expected: only the paths in the acceptance criterion above.
- `node -e "console.log(require('./_bmad-output/initiative-rpgtoolkit-reawakened/epic-rpgcode-vm/discovery/command-effect-catalogue.json').names.length)"` — expected: 282 (it is 271 today).
- `grep -c "OWNER:" docs/spec/engine/rpgcode-language.md` — expected: at least the 26 §9 comments migrated.
- `pnpm provenance && pnpm licence` — expected: pass.

**Manual checks:**
- Read each R-30 to R-39 block in `docs/spec/engine/` against the matrix above.
- Follow every relative link in the edited pages.
