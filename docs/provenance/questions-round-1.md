# Clean-room extraction, round 1 — question list

* **Status:** draft for owner approval
* **Date:** 2026-10-11
* **Process:** [ADR 0006](../adr/0006-clean-room-spec-extraction.md) decision 2. This list starts round 1 of the clean-room split. An extractor reads the legacy source **only** to answer these questions and writes prose facts; a separate reviewer checks the staging text; reviewed facts land in `docs/` in their own commit and the round is appended to [extraction-log.md](extraction-log.md).
* **Scope rule:** only questions that the archive evidence (installers, help files, sample games, community documents) **and** the allowed data files could not answer appear below. Everything the data already settled is under [Derived, not asked](#derived-not-asked).
* **Legacy source:** not read to write this list. No extraction was run.
* **`docs/provenance/`:** already present on `main` (`extraction-log.md`, landed with PR #31); no directory had to be created.

Question ids are stable and are the ids the extractor and reviewer cite. "Wanted output form" is the shape the prose answer must take so it can be dropped into a doc without further interpretation.

---

## Q1 — Exact text layout of `.brd` (`RPGTLKIT BOARD`)

**Question.** For a 2.x `.brd` board file (magic `RPGTLKIT BOARD`, byte 14 non-NUL, major 2, minor 1 — the 17 files in the corpus), list the file's lines in order with, for each line, whether it is a header field or one of a repeated group, the delimiter between fields on a line, the digit base and sign of numeric fields, the number of repetitions and how the repetition count is encoded, and which fields are optional or version-dependent. State the complete line sequence for one worked example and confirm the reader can reach end-of-file with no bytes left.

**Why the archive could not answer it.** `docs/format-spec.md` §4.1 and §1.3 name only the detection byte and say "support is optional"; §4.1 does not describe the text body. The official TST spec (`archive/wayback/rpgtoolkit.com/dev_repo/docs/tst.html`) and the TK 2.20b manual (`data/zip-texts/toolkit2.20b_wav.zip/zip_inner/help_help{1,2,3}.htm`) contain no byte- or line-level layout of data files. The research proved 17 such files exist (FinalDestiny 1, Caoquest 14, School2Demo 1, ChimeranEmpire 1) with their magic and `major 2 / minor 1`, but did not reverse-engineer the lines (`epic-tk2-support/discovery/tk2-formats-research.md`, Coverage table and Unknowns). No community document found describes it.

**Wanted output form.** A line-by-line layout table (order, field, type, delimiter) plus one worked example (the first ~30 lines of one Caoquest text `.brd`) annotating each line to its field.

**Consumed by.** epic-tk2-support ticket 3 (format-spec amendment) then ticket 4 (text board reader).

---

## Q2 — Exact text layout of `.gam` (`RPGTLKIT MAIN`)

**Question.** For a 2.x `.gam` main file (magic `RPGTLKIT MAIN`, byte 13 is CR, major 2, minor 0 — BusDriver `DEMO.GAM` and Caoquest), list the lines in order, their delimiters, numeric bases and signs, the repeated groups (plugin list, enemy list, extended key list) and how each group's length is encoded, and every optional/version-dependent line. Explain which fields carry the project path, startup program, initial board and initial character, so a text project can resolve the same way §1.5 does for binary. Give a full worked example parsed to end-of-file.

**Why the archive could not answer it.** `docs/format-spec.md` §2 opens with "Binary only" and describes the 43 logical binary rows; it never names a text form. The research detected the text form (CR at offset 13) and two files but did not reverse-engineer the lines (`tk2-formats-research.md`, Coverage table, `.gam` text row and Unknowns). The manual and TST spec have no layout. The reader currently fails at offset 0 with a §1.1 unterminated-string error.

**Wanted output form.** A line-by-line layout table plus one worked example with each line mapped to its §2 logical field.

**Consumed by.** epic-tk2-support ticket 3, then ticket 4.

---

## Q3 — Exact text layout of `.itm` (`RPGTLKIT ITEM`)

**Question.** For a 2.x `.itm` item file (magic `RPGTLKIT ITEM`, byte 13 non-NUL, major 2, minor 1 — the 16 Caoquest files), list the lines in order with their types and delimiters, including the per-character allowance list, the 51-entry allowed-handle block, the equip-slot flags, the pair of use programs and the battle animation, and how repeated/optional groups are terminated. State which §6.2 binary fields have no text counterpart and which text-only fields exist. Give a full worked example parsed to end-of-file.

**Why the archive could not answer it.** `docs/format-spec.md` §6.2 documents only the binary form (byte 13 must be 0). The research detected 16 text `.itm` files and their `major 2 / minor 1` but not their body (`tk2-formats-research.md`, Coverage table and Unknowns). No archive document describes it.

**Wanted output form.** A line-by-line layout table plus one worked example mapped to §6.2 field names.

**Consumed by.** epic-tk2-support ticket 3, then ticket 4.

---

## Q4 — Exact text layout of `.tem` (`RPGTLKIT CHAR`)

**Question.** For a 2.x `.tem` character file (magic `RPGTLKIT CHAR`, byte 13 non-NUL, major 2, minor 2 — the 2 Caoquest files), list the lines in order and their types/delimiters, including the nine script-variable names, the eight initial stats, the profile picture, the special-move list with learn conditions, the accessory slot names and the body-slot flags. Say how the special-move list length is encoded and which groups are optional. Give a full worked example parsed to end-of-file.

**Why the archive could not answer it.** `docs/format-spec.md` §6.1 supports only the binary form ("text versions must be re-saved"). The research detected 2 text `.tem` files and their version but not their body (`tk2-formats-research.md`, Coverage table and Unknowns).

**Wanted output form.** A line-by-line layout table plus one worked example mapped to §6.1 field names.

**Consumed by.** epic-tk2-support ticket 3, then ticket 4.

---

## Q5 — True binary `.gam` minor-2 (2.2) record list

**Question.** For a binary `.gam` with minor 2, give the exact ordered record list (each field's type, size and meaning) from the magic through end-of-file, correcting `docs/format-spec.md` §2 wherever its minor-keyed conditional rows are wrong for minor 2. In particular, state what the current ladder omits or adds at the tail, since the existing reader leaves 1506 bytes unread on every BusDriver file and runs off the end (EOF at 1917/1958) on the two FinalDestiny files. Confirm the field set against at least two 2.2 samples.

**Why the archive could not answer it.** No 2.x sample game is documented field-by-field; the archive installers `toolkit200.zip`/`toolkit207.zip` carry no sample project (runtime DLLs only). The mismatch was measured by the dump run but the residue bytes were not analysed and the true field set was not derived (`tk2-formats-research.md`, Coverage table `.gam` binary row, gap 9, and Unknowns). `docs/format-spec.md` §2 itself flags this as unverifiable with no sample.

**Wanted output form.** A corrected ordered field table for minor 2, with the offset each field occupies and the source of each correction; if any field cannot be stated with confidence, say so.

**Consumed by.** epic-tk2-support ticket 3, then ticket 6.

---

## Q6 — True binary `.tem` minor 3–4 field set

**Question.** For a binary `.tem` with minor 3 and with minor 4, give the exact ordered field list and the version split between them, correcting `docs/format-spec.md` §6.1. The current reader keys its branch on "minor ≥ 5 vs minor < 5", which is the TK3 layout, and leaves 407–797 bytes unread on all 16 TK2 files. State precisely which fields move, appear or disappear between minor 3 and minor 4 (e.g. the position of custom stances relative to the movement and idle animation strings), and confirm against at least two samples per minor.

**Why the archive could not answer it.** Same as Q5: the residue was measured but not analysed, and no archive document gives field-level layouts (`tk2-formats-research.md`, coverage `.tem` binary row, gap 10, Unknowns). The installers carry no sample.

**Wanted output form.** Two ordered field tables (minor 3, minor 4) with sizes and the differing region called out.

**Consumed by.** epic-tk2-support ticket 3, then ticket 6.

---

## Q7 — `.fnt` (`RPGTLKIT FONT`) internals

**Question.** For a `.fnt` game font file (magic `RPGTLKIT FONT`, a `version 2` marker observed in the header), give the complete byte layout: header fields and their types, the per-glyph table (glyph count, code range, name or index of each glyph), the pixel data encoding (bit depth, row order, transparent key, per-glyph width/height or a fixed cell), any palette table, and whether a bitmap/atlas section follows. State the file's length formula and confirm it against the 5 corpus files. Record enough for a reader to reach end-of-file with no residue.

**Why the archive could not answer it.** `.fnt` is absent from `docs/format-spec.md` entirely; the research found only the magic and a `version 2` marker and could find no format doc or community description (`tk2-formats-research.md`, coverage `.fnt` row, gap 13, Unknowns). The TST spec does not cover fonts.

**Wanted output form.** A byte layout table plus a length formula, confirmed against the 5 files (FinalDestiny 1, Caoquest 1, School2Demo 1, ChimeranEmpire 2).

**Consumed by.** epic-tk2-support ticket 3, then ticket 7.

---

## Q8 — 3.x update wizard: how it converts TK2 scripts, and which behaviours it preserves

**Question.** Describe what the 3.x RPGCode **update wizard** does, as a rule list a converter could implement: for each pre-3.1 construct (`#Mwin(…)` unquoted arguments, `=` as comparison, unquoted map keys, `!`/`$` sigils, loose dialogue lines, `method`/`returnMethod`, `*` comments, `{ }` blocks, `#` as a statement prefix, `#Branch`/`#FBranch`, namespace/implicit includes) state exactly what the wizard rewrites it to, whether the rewrite is always applied or offered, and what it does **not** change. State which TK2 runtime behaviours the converted program must still exhibit for the wizard's output to behave identically (e.g. single-`=` comparison semantics, bare-statement dialogue, `#FBranch` call-stack return, sigil-insensitivity), and flag any construct the wizard leaves broken or refuses.

**Why the archive could not answer it.** `docs/format-spec.md` §9.9 lists seven legacy forms and their 3.1 "meaning" but is a reader's acceptance table, not a description of the wizard's actual rewrites. `docs/editor-features.md` T-43/T-44 describe the wizard our editor should build, not what the legacy wizard did. The archive's help files (`help220.upd`, TK 2.20b manual) document RPGCode but not the wizard, and the only mention of the wizard in the archive is that it existed (`recovery-legacy-docs-and-plugins/findings/02-tk3-docs.md`, line 449). The corpus shows the TK2 forms but not what the engine rewrote them to.

**Wanted output form.** A rule sentence per legacy construct ("`<form>` becomes `<form>`; applied/conditional"), then a short list of behaviours the conversion must preserve. No code, no function names.

**Consumed by.** epic-tk2-support ticket 2 (extraction round, this list), and in the target: epic-rpgcode-vm tickets 1 (legacy-syntax rulings) and 15 (TK2 dialect frontend); `docs/editor-features.md` T-43/T-44 in epic-editor-p1.

---

## Q9 — Precedence among local, included, implicit, plugin and built-in names

**Question.** When an unqualified call is made, give the exact lookup order between: (a) a function defined in the current file, (b) a function in an explicitly `#Include`d file, (c) a function in a file already run/loaded, (d) a function of a file named by a prior implicit `file.func` call, (e) an engine built-in, (f) a plugin command, and (g) a user `#Method` command. State whether `file.func` always forces the named file's namespace and includes `Prg/<file>.prg` on first use, what happens when two loaded files define the same unqualified name (the corpus has real clashes: `Queues.prg` and `Stacks.prg` both define `AddLit`/`PopLit`), and whether a name added later replaces an earlier one or is shadowed.

**Why the archive could not answer it.** The community tutorial (`wayback/mysticsoftware.net/resources/Classes%20In%20RPGCode.txt`) gives rules R1–R10 but only *claims* the cross-file "unqualified after first use" behaviour (R5) and the drop-the-prefix-after-implicit-call behaviour (R4); the survey found corpus instances of the intra-file case only (`epic-rpgcode-vm/discovery/zip-survey.md`, Q1 and its Notes and Unknowns). `docs/format-spec.md` §9.6/§9.7 describe the two include forms separately and state no precedence. The corpus proves clashes and that `file.` disambiguates, but not the full order against plugin/built-in names.

**Wanted output form.** An ordered lookup list (one line per tier) plus a sentence for the clash/overwrite rule and the `file.`-forces-namespace rule.

**Consumed by.** epic-rpgcode-vm tickets 1 (MOD/LEX rulings), 8 (modules), and 3 (registry assembly).

---

## Q10 — `addplyr`, `cntrtext`, `sell`: are they built-ins, and what do they do?

**Question.** For each of the three TK2 command names `addplyr`, `cntrtext`, `sell`: is it an engine built-in, a plugin command, or a user method? Give its argument list (names, types, whether by-reference), its observable effect, and its return/out values. `addplyr("swim.tem")` is called as `#addplyr("swim.tem")` in one Caoquest file; `cntrtext(x,y,val!)` in a CustomShop file; `sell` is called bare with no arguments. State whether any of them is an alias or misspelling of a documented name (e.g. `addPlayer`, `addPlayer`-style file argument).

**Why the archive could not answer it.** `epic-rpgcode-vm/discovery/tk2-rpgcode-commands.csv` marks all three `class = unknown`; the survey states "no documentation anywhere in `data/zip-texts/`, `wayback/`, `archive-org/` or `research/`; not defined as `#Method` in any corpus file", and both the 2.20b help and `docs/format-spec.md` §9.11 are silent (`zip-survey.md`, Q3 and Unknowns; `tk2-rpgcode-coverage.md`, "Unknowns / not determinable"). They cannot be classified without the missing libraries/plugins.

**Wanted output form.** One short paragraph per command: class (built-in/plugin/user), signature, effect, return/out, and alias verdict.

**Consumed by.** epic-rpgcode-vm ticket 15 (command coverage) and ticket 21 (generic effect stubs).

---

## Q11 — `#GiveDP` / `#GiveFP`: origin and exact effect

**Question.** Are `#GiveDP` and `#GiveFP` late-2.x engine built-ins or commands supplied by a plugin (the archive points at MrG's Misc. Plugins, `GsMiscPlugins.dll`, readme lines 343/344)? Give their exact argument lists and observable effect (which stat is changed, by how much, on which party member, and the return/out values), and state whether the capitalised `#GiveDP`/`#GiveFP` form used in the Mazza201Methods file differs from any lower-cased form.

**Why the archive could not answer it.** The command names do not appear in the 2.20b help or in `docs/format-spec.md` §9.11; the coverage doc records the origin as `[INFERENCE]`-level and unresolved (`tk2-rpgcode-coverage.md`, Q3 row and Unknowns). The plugin readme lists the names at two lines but the survey did not establish the exact semantics or confirm the capitalised call resolves to the same command.

**Wanted output form.** One paragraph: class, signature, effect, return/out, and whether the two spellings are the same command.

**Consumed by.** epic-rpgcode-vm ticket 15 and ticket 21.

---

## Q12 — Could a script function or `#Method` override a built-in?

**Question.** When a program defines a function or `#Method` whose name matches an engine built-in (or a plugin command), which definition wins at a call site, and at what point in the program's life does the script definition take effect (before first run, on definition, on first call)? State whether the built-in is permanently shadowed, shadowed only in that file's namespace, or never shadowable, and whether the answer differs for a `file.`-qualified call.

**Why the archive could not answer it.** `docs/format-spec.md` §9.7 (object orientation) and §9.11 do not state a collision rule. The corpus contains 119 `#Method`-declared user commands and 141 mapped TK2 built-in names (`tk2-rpgcode-coverage.md`), so collisions are possible, but no observed file defines a method that collides with a built-in in a way that proves the winner. The community survey gives no rule for script-vs-built-in precedence (`zip-survey.md`, Q1/Q3).

**Wanted output form.** A rule sentence naming the winner and the moment the script definition takes effect, plus the `file.`-qualified case.

**Consumed by.** epic-rpgcode-vm tickets 3 (registry assembly), 8 (modules / flat command list) and 1 (MOD ruling).

---

## Q13 — Does plugin dispatch stop at the first plugin that claims a command?

**Question.** When the engine meets an unknown command, does it offer the name to each loaded plugin in load order and stop at the first one whose query returns "handled", or does it consider all of them (and if several claim it, which runs)? State the order plugins are consulted in (fixed `tkplug0…tkplug4` slots, the Multi-Plug `plugins.ini` order, or the `.gam` plugin list) and whether a plugin can be asked about a name the engine already knows as a built-in.

**Why the archive could not answer it.** The SDK comments describe the query/execute protocol (`TKPlugQuery` returns 1 if it handles the name, else 0) but not whether dispatch stops at the first claim; the survey states this only as "consistent with §9.11's closing line" (`zip-survey.md`, Q2 and Unknowns). Only two real plugin DLLs survive in the archive (`FTP.dll`, `tkplug1.dll`) and neither was executed, so the dispatch loop could not be observed. `docs/format-spec.md` §9.11 and §12 do not state it.

**Wanted output form.** A rule sentence for the dispatch loop (stop-at-first vs all) and a sentence for the consultation order and the built-in interaction.

**Consumed by.** epic-rpgcode-vm tickets 3 (PluginDefinition command registry) and 15; ADR 0004 decision 3.

---

## Derived, not asked

These were answered by the archive evidence and the allowed data files, so no extractor question is raised. Each is listed with the evidence that settled it; it still has to be written into `docs/format-spec.md` by epic-tk2-support ticket 3 (doc-first, G7).

| Fact the data answered | Evidence |
|---|---|
| Text-vs-binary detection is the file's own per-format rule (byte 13/14/16/12 or `i16 version`): non-NUL = text, `0x00` = binary | `tk2-formats-research.md`, "The spec's detection map" (verified against real bytes) |
| A text `.gam` form exists; its header reads magic, `major 2`, `minor 0` (BusDriver `DEMO.GAM`, Caoquest) | Coverage table `.gam` text row |
| Text header versions: `.brd` `minor 1`, `.itm` `minor 1`, `.tem` `minor 2` | Coverage table and Unknowns |
| Counts of each text form: 17 `.brd`, 2 `.gam`, 16 `.itm`, 2 `.tem`, 52 `.ene`, 16 `.anm`, 8 `.spc`, 23 `.bkg` | Coverage table, Gap list |
| Every TK2 `.ene` in the corpus is the minor-0 text form; the reader refuses all 52 | Gap 1 |
| Text `.anm`, `.spc`, `.ste`, `.bkg` forms exist (documented sketches corroborated by files); no text `.ste` sample | Coverage table; Unknowns |
| `.tan` is binary `major 2 / minor 0`, 33 files (all ChimeranEmpire) | Coverage table `.tan` row |
| `.gph` v2 text exists, 6 files (FinalDestiny 1, School2Demo 5) | Coverage table `.gph` row; §3.2 |
| `.fnt` magic is `RPGTLKIT FONT` with a `version 2` marker; 5 files | Coverage table `.fnt` row |
| Binary `.gam` minor 2 leaves 1506 bytes on each BusDriver file and EOF-fails on FinalDestiny's two (1917/1958) — proves the §2 ladder is wrong | Coverage table `.gam` binary row; gap 9 (the **true** field set is Q5) |
| Binary `.tem` minor 3–4 leaves 407–797 bytes per file; the `minor < 5` branch is the TK3 layout, not TK2 | Coverage table `.tem` binary row; gap 10 (the **true** field set is Q6) |
| `.tst` is version 20, detail 1 (76 files) and detail 2 (1); no 8-bit detail in the corpus; the official TST 2.0 spec supplies the header, details 1–6 and the VGA palette | `tk2-formats-research.md`, Documentation-gap verdict; gap 15 |
| Zero-byte placeholders exist: 1 `.itm`, 1 `.spc`, 3 empty-name `.brd` | Gap 14 (the skip-vs-tolerate decision is a ticket-4 decision, not a source question) |
| TK2 block syntax is `{ }`, not the `< … >` the spec claims; `#` is a statement introducer; `#Method`/`#ReturnMethod` are the user-command mechanism; `=` compares inside conditions; implicit `file.method` includes; `@` blank line | `tk2-rpgcode-coverage.md`, corpus totals table and "What the TK2 help says that §9.9 does not" |
| TK2 command coverage: 141 mapped to §9.11 names, 2 compat-only (`#Empty`, `#FBranch`), 39 unmapped (24 plugin, 11 implicit-include library, 1 engine namespace, 3 unknown), 119 user `#Method` | `tk2-rpgcode-coverage.md`, summary table; `zip-survey.md`, Q3 tally |
| The TK2 plugin ABI is `TKPlugInit, FunctionPtr, TKPlugBegin, TKPlugQuery, TKPlugExecute, TKPlugEnd`, with query-then-execute; the plugin inventory and the `plugins.ini` / `tkplug0…4` load model | `zip-survey.md`, Q2 |
| The six-game corpus identity and version markers (FinalDestiny 2.1.7.a, LittleMan/BusDriver/ChimeranEmpire 2.1.4.a, School2Demo 2.1.7.a, Caoquest TK2 `trans2.exe`) | `tk2-formats-research.md`, Method and evidence |

## Out of scope for this round

* TK 1.x (v1) data formats and RPGCode — a nice-to-have, not MVP (epic-tk2-support Notes).
* Writer parity for the TK2 text forms — the project writes only its own forms (epic-tk2-support Boundaries).
* Zero-byte placeholder skip-vs-tolerate — a reader-implementation decision (epic-tk2-support ticket 4).
* Where the six TK2 games are fetched from and their pinned hashes — epic-tk2-support ticket 9 `unknown`.
