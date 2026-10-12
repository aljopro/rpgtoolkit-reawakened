# TK2-era (2.x) data formats: what exists in the wild and what epic 2 already reads

Research output for the owner decision "TK2 games AND TK3 games must both play at launch".
Point-in-time: 2026-10-11. Read-only work; nothing written under either worktree.

Companion decisions referenced: epic `epic-legacy-formats` (tickets 2.1–2.14),
`docs/format-spec.md`, `docs/engine-features.md` E-130/E-131 + §14, AD-31.

---

## Method and evidence

- **Reader behaviour** was read from the newer worktree
  `/Users/jensen/.omp/wt/wt-20261011-151109-57e1d90/packages/core/src/formats/**`
  and measured by actually running the built dump tool
  `packages/runner-headless/dist/cli.js dump <path>` (no build needed; the newer
  worktree's `dist/` runs under node v26.8.1). The dump was run on scratch copies
  of six games extracted under `/tmp/tk2formats-scratch/`.
- **Corpus**: TK2-era games extracted from the archive (allowed material only:
  archive-org installers/game zips, Wayback community zips, help files). No
  GitHub bundle / git bundle / source repo was opened. No `.exe` was run.
  - `FinalDestiny` — archive-org, `ver.ver` = 2.1.7.a (README calls it TK2, 2002)
  - `LittleMan` (Little Man Classic) — Wayback aljo, `ver.ver` = 2.1.4.a
  - `BusDriver` (Bus Driver + 10 sibling `.gam` projects) — Wayback aljo, 2.1.4.a
  - `Caoquest` — Wayback mysticsoftware (`trans2.exe` marker, TK2)
  - `School2Demo` — Wayback mysticsoftware, 2.1.7.a
  - `ChimeranEmpire` — Wayback mysticsoftware, 2.1.4.a
  - For contrast only (pre-2.0, out of scope): `Toolkit1.4` demo from
    archive-org `toolkit14.zip`.
- **Classification** implemented the spec's *own* per-format detection rule
  (`format-spec.md` §1.3 + each format's offset), not a generic heuristic:
  read the magic, inspect the byte at the stated offset (13/14/16/12) or the
  `i16 version`; `0x00` at the offset = binary, non-NUL = text. Script:
  `/tmp/tk2formats-scratch/classify.py` (throwaway).
- Counts below are file counts observed on disk. Path citations are given as
  "game:extension" plus the extraction path where useful.

### The spec's detection map (verified against real TK2 bytes)

| ext | magic | detection | TK2 reality |
|---|---|---|---|
| `.gam` | `RPGTLKIT MAIN` | spec: binary only | **text form exists** (CR at offset 13) |
| `.brd` | `RPGTLKIT BOARD` | byte 14 == 0 → binary | text when byte 14 non-NUL |
| `.tem` | `RPGTLKIT CHAR` | byte 13 == 0 → binary | text when byte 13 non-NUL |
| `.itm` | `RPGTLKIT ITEM` | byte 13 == 0 → binary | text when byte 13 non-NUL |
| `.ene` | `RPGTLKIT ENEMY` | byte 14 == 0 → binary 2.1 | text = minor 0 |
| `.spc` | `RPGTLKIT SPLMOVE` | byte 16 == 0 → binary | text when non-NUL |
| `.ste` | `RPGTLKIT STATUSE` | byte 16 == 0 → binary | (no TK2 text sample) |
| `.bkg` | `RPGTLKIT BKG` | byte 12 == 0 → binary | text when non-NUL |
| `.anm` | `RPGTLKIT ANIM` | header minor | text form exists but detection = magic NUL (unstated in spec) |
| `.tst` | none | `i16 version` 20/30 | only version 20 observed |
| `.tan` | `RPGTLKIT TILEANIM` | major/minor | binary 2.0 |
| `.gph` | `RPGTLKIT TILE` (v2) | text | v2 (TK2), v1 (TK1) |
| `.fnt` | `RPGTLKIT FONT` | — | **not in format-spec at all** |

---

## Coverage table — TK2-era corpus (six games) vs epic-2 readers

Legend for the last column — **yes** = parses cleanly; **yes\*** = parses but
leaves residue bytes (partial read, data loss); **refused** = reader returns a
located error naming it as an unsupported text form; **wrong-refusal/** = refused
but the file is the normal format for its era; **no reader** = dump skips / no
reader in `core`; **partial-** = accepted minor but misparsed.

| ext | form | version seen | files | games | epic-2 reader outcome |
|---|---|---|---|---|---|
| `.gam` | binary | minor 2 | 15 | FD 2, LM 1, BusD 10, S2D 1, Chim 1 | **partial-**: reader accepts minor 2, but leaves 1506 residue bytes on all 9 BusD files and **fails outright** on FD's 2 (EOF at 1917/1958) |
| `.gam` | text | major 2 / minor 0 | 2 | BusD `DEMO.GAM`, Caoquest | **refused** (§1.1 unterminated string at offset 0) |
| `.brd` | binary | minor 2 (pre-vector) | 144 | FD 25, Cao 2, S2D 19, Chim 98 | **yes** (pre-vector reader + §4.8 conversion; 2.13 registry pending) |
| `.brd` | text | major 2 / minor 1 | 17 | FD 1, Cao 14, S2D 1, Chim 1 | **refused** (§4.1 offset 14 non-NUL) |
| `.tem` | binary | minor 4 (15), minor 3 (1) | 16 | FD 2, Cao 2, S2D 2, Chim 10 | **yes\***: parses early fields, **residue 407–797 bytes** on every file (spec's minor<5 branch is the TK3 layout, not the TK2 one) |
| `.tem` | text | major 2 / minor 2 | 2 | Caoquest | **refused** (§6.1 offset 13) |
| `.itm` | binary | minor 3 | 87 | FD 9, S2D 29, Chim 49 | **yes** (FK sample: residue 0). 1 zero-byte `.itm` fails |
| `.itm` | text | major 2 / minor 1 | 16 | Caoquest | **refused** (§6.2 offset 13) |
| `.ene` | text | major 2 / minor 0 | 52 | FD 7, Cao 5, S2D 7, Chim 33 | **refused** (§6.3 offset 14) — and this is the *only* TK2 `.ene` form in the corpus |
| `.spc` | binary | minor 2 | 22 | FD 4, S2D 1, Chim 17 | **yes** (accepted; no minor check) |
| `.spc` | text | major 2 / minor 0 | 8 | Caoquest | **refused** (§8.1 offset 16) |
| `.ste` | binary | minor 2 | 5 | FD 2, S2D 1, Chim 2 | **yes** |
| `.bkg` | text | major 2 / minor 0 | 23 | FD 3, Cao 5, S2D 6, Chim 9 | **refused** (§8.3 offset 12) |
| `.anm` | text | major 2 / minor 0 | 16 | Cao 7, Chim 9 | **refused** as §1.1 (magic has no NUL) — the spec documents a text form but the reader has no text branch |
| `.tst` | binary | version 20, detail 1 (76), detail 2 (1) | 77 | FD 4, Cao 17, S2D 32, Chim 24 | **yes**; no 8-bit (detail 3–6) and no `.iso` in corpus |
| `.tbm` | — | — | 0 | — | no reader (dump skip) |
| `.tan` | binary | major 2 / minor 0 | 33 | Chim 33 | **no reader** (dump skip "no reader in core yet") |
| `.gph` | text | v2 (major 2 / minor 0) | 6 | FD 1, S2D 5 | **no reader** (dump skip) |
| `.fnt` | binary | magic `RPGTLKIT FONT` | 5 | FD 1, Cao 1, S2D 1, Chim 2 | **unrecognised extension** — not in spec, no reader |
| `.prg` | text | source (0 compiled) | ~600 | all | **skip** (source text, as designed) |
| `.sav` | — | — | 0 | — | out of scope (epic) |

### Dump run summary (measured, scratch copies)

| game | parsed | skipped | failed |
|---|---:|---:|---:|
| FinalDestiny | 50 | 109 | 15 |
| LittleMan | 1 | 58 | 0 |
| BusDriver | 9 | 31 | 2 |
| Caoquest | 26 | 89 | 58 |
| School2Demo | 100 | 146 | 17 |
| ChimeranEmpire | 231 | 385 | 57 |

Failure breakdown per game (from the dump, grouped by reader):
- FinalDestiny: 3 `.bkg` text, 1 `.brd` text, 7 `.ene` text, 2 `.gam` binary minor 2, 1 zero-byte `.itm`, 1 zero-byte `.spc`.
- BusDriver: 2 `.gam` (text DEMO.GAM; binary Thequest.gam runs off the end).
- Caoquest: 7 `.anm` text, 5 `.bkg` text, 14 `.brd` text, 2 `.tem` text, 5 `.ene` text, 1 `.gam` text, 16 `.itm` text, 8 `.spc` text.
- School2Demo: 6 `.bkg` text, 2 zero-byte/empty-name `.brd` (§1.1), 1 `.brd` text, 7 `.ene` text, 1 `.gam` text.
- ChimeranEmpire: 9 `.anm` text, 9 `.bkg` text, 1 zero-byte `.brd`, 1 `.brd` text, 33 `.ene` text, 1 `.gam`, 1 zero-byte `.itm`, 2 zero-byte `.spc`.

**Pre-2.0 (Toolkit 1.4)**, out of scope but noted: its `.gam/.brd/.tem/.spc/.bkg`
are a *magic-less* line-oriented format (first line is the file's own name, e.g.
`demo.gam`; the TST transition note in the TK2 manual says the tileset format was
"introduced in Revision 4"). `.gph` there is the v1 character grid. These are
older than TK2 and are not part of this ticket.

---

## Gap list (with file counts)

1. **Text `.ene` readers** — 52 files (FD 7, Cao 5, S2D 7, Chim 33). Every TK2
   `.ene` in the corpus is the minor-0 text form; the reader refuses all of them.
   Spec §6.3 already sketches the text layout (unverified).
2. **Text `.brd` boards** — 17 files (FD 1, Cao 14, S2D 1, Chim 1). `format-spec`
   §4.1 refuses them ("Support is optional"); §1.3 names the detection byte.
   The actual text layout is **not documented**.
3. **Text `.bkg` battle backgrounds** — 23 files (FD 3, Cao 5, S2D 6, Chim 9).
   Spec §8.3 sketches the 19×19 grid text form.
4. **Text `.itm` items** — 16 files (Cao 16). Layout **not documented**.
5. **Text `.anm` animations** — 16 files (Cao 7, Chim 9). Spec §7.1 documents the
   text form; the reader has no text branch and fails with a generic read error,
   not the "text form" message.
6. **Text `.spc` special moves** — 8 files (Cao 8). Spec §8.1 sketches the text form.
7. **Text `.tem` characters** — 2 files (Cao 2). Layout **not documented**.
8. **Text `.gam` main files** — 2 files (BusD `DEMO.GAM`, Caoquest). Layout **not documented**;
   reader fails at offset 0.
9. **Binary `.gam` minor 2** — 15 files (FD 2, LM 1, BusD 10, S2D 1, Chim 1).
   Reader accepts the minor but the record list is wrong: 1506 residue bytes on
   BusD and hard EOF failure on FD. The spec itself flags `.gam` as "unverifiable"
   (spec-readiness: HIGH risk, no sample). This is the most dangerous gap.
10. **Binary `.tem` minors 3–4** — 16 files (FD 2, Cao 2, S2D 2, Chim 10). Reader
    produces 407–797 residue bytes per file: the "minor ≥ 5 / < 5" branches are
    the TK3 layout, not the TK2 2.2 layout. Silently wrong, not refused.
11. **`.tan` animated tiles** — 33 files (Chim). Spec §3.5 documents the binary
    layout; no reader. Needed because boards reference them as tiles.
12. **`.gph` single tiles (v2)** — 6 files (FD 1, S2D 5). Spec §3.2 documents the
    text form; no reader. Referenced by boards/anims in these games.
13. **`.fnt` game font** — 5 files. `RPGTLKIT FONT` magic; **absent from
    `format-spec.md`** entirely. Referenced by the game text engine (E-132).
14. **Zero-byte placeholder files** — 1 `.itm`, 1 `.spc`, 3 empty-name `.brd`.
    Reader fails them (§1.1). Decide: skip vs. tolerate (a real author left them).
15. **`.tst` detail 3–6 (8-bit) + `.iso`** — 0 files in this corpus, but the spec
    requires the VGA palette table; the official TK2 TST spec (below) supplies it.
    Coverage is unproven, not absent.

---

## Documentation-gap verdict (G7)

**What documentation exists for TK2 (allowed sources only):**

- **Official TST spec**: `archive/wayback/rpgtoolkit.com/dev_repo/docs/tst.html`
  — "RPG Toolkit Development System, 2.0 — Tileset (TST) File Format
  Specification, Copyright 2000 By Christopher B. Matthews". It documents the
  6-byte header (`version / NumberOfTiles / detail`), **details 1–6** with pixel
  sizes and transparent keys (`0,1,2` for 24-bit; `255` for 8-bit), the column-major
  loop, and the **"default DOS 13h VGA palette"** for the 8-bit details. It states
  version 20 = 2.0, 21 = 2.1, and "currently the Toolkit only produces version 20".
  This is a clean-room-suitable primary source and closes spec ambiguity A-TST-3.
  A second copy exists at `.../rpgtoolkit.com-asof2005/dev_repo/docs/tst.html`.
- **TK 2.20b manual** (HTML help, `data/zip-texts/toolkit2.20b_wav.zip/zip_inner/help_help1..3.htm`):
  user-level descriptions of files (mentions `.GAM`, `.tem`, `.itm`,
  `.gph`, `.tst`), the TST/GPH history, and RPGCode; **no byte-level layouts** of
  the text-era data files.
- **`history.txt`** (in the TK2.20b kit and the toolkit2.20b wav zip): RPGCode
  changes and the `.tpk` change; nothing about the data-file text layouts.
- **No other format spec found.** A full grep of the archive for
  "file format specification" returns only the TST page (plus site nav pages).

**Verdict:**

- **TST is fully documented** (official spec + format-spec §3.1); a reader can be
  written and verified for details 1–6 today, including the palette table.
- **Binary layouts for `.tan`/`.tbm` exist in `format-spec.md`** (§3.5/§3.6) but
  have no corpus sample; `.tan` 2.0 is now sampled (33 files) so it is checkable.
- **The TK2 text layouts for `.brd`, `.gam`, `.itm`, `.tem` are undocumented**
  (neither the official TST spec nor the manual nor the manual's HTML describes
  them). The text forms of `.ene`, `.anm`, `.spc`, `.ste`, `.bkg` are sketched in
  `format-spec.md` but were never verified against data, and the reader has no
  text branch for `.anm` at all.
- **`.gam` binary minor 2 is documented wrongly** (the §2 minor<3 rows do not
  match real 2.2 files — 1506-byte residue / EOF). `.tem` minors 3–4 likewise.
- **`.fnt` (`RPGTLKIT FONT`) is undocumented.**

Because G7 requires the doc first, a clean-room reader **is** writable from
`docs/` + the archive's own primary docs + the allowed data files — but only
*after* `docs/format-spec.md` is extended (text layouts for `.brd/.gam/.itm/.tem`,
the corrected `.gam`/`.tem` version branches, `.anm`/`.bkg`/`.ene`/`.spc`/`.ste`
text forms, `.fnt`, `.tan` minor, and the TST palette/8-bit details). Deriving
those layouts from the data files (byte-level observation, no source) is exactly
the clean-room process; it just has to be a **doc-first commit** before the code.

**What is missing / cannot be answered from docs:** the exact TK2 text layouts
for the four undocumented extensions and the corrected `.gam`/`.tem` binary
branches — they must be reverse-engineered from the allowed data (or confirmed by
community docs we have not yet found). See Unknowns.

---

## Recommended tickets

These do not fit the current `epic-legacy-formats` scope as approved: its
Description and Boundaries explicitly exclude "optional formats (text-era
formats, compiled `.prg`, legacy `.sav`)" and list the 2.x-text open question in
Notes. The owner decision reverses that for TK2 games, so the cleanest home is a
**new epic `epic-tk2-support`**, depending on `epic-legacy-formats` entries 2.1–2.14
(especially 2.13 the registry and 2.14 the sweep). The first entry is the
**doc-first spec amendment** and is the only `hitl` entry. House format matches
`_bmad-output/initiative-rpgtoolkit-reawakened/epic-legacy-formats/tickets.toml`.

`[[entry]] id = 1 — Documentation amendment: TK2 (2.x) formats  (hitl)`
type = "story"; covers = ["CAP-1"]; after = []; hitl = true; risk = "medium"
- title: "Format-spec amendment for TK2 (2.x) formats"
- description: "Extends docs/format-spec.md, from allowed primary sources
  (archive TST spec, TK2.20b manual, community docs) and the allowed data files,
  with: per-extension text-form layouts for `.brd`, `.gam`, `.itm`, `.tem`; the
  corrected `.gam` binary-2.2 row list (kill the 1506-byte residue / FD EOF
  mismatch); the corrected `.tem` minor 3–4 branches; the `.anm` text form and its
  detection rule; the sight-checked `.ene`/`.spc`/`.ste`/`.bkg` text forms; the
  `.tan` major 2 / minor 0 header; the `.gph` v2 header; and the new `.fnt`
  (`RPGTLKIT FONT`) section. Adds the TST 8-bit detail palette (DOS 13h VGA) and
  detail 3–6 layout from the official TST spec. Doc-only commit (G7)."
- verify: "Every new/changed section cites the archive evidence path and file
  count used to derive it; the four previously undocumented text layouts have a
  worked byte/line example checked against at least two games."
- after = [] (must land before any reader entry)

`[[entry]] id = 2 — Text-form readers for TK2 boards, characters, items, main file`
type = "story"; covers = ["CAP-1"]; after = [1, "epic-legacy-formats 2.5/2.6/2.9"]; hitl = false; risk = "high"
- title: "TK2 text readers: `.brd`, `.tem`, `.itm`, `.gam`"
- description: "Adds text-form branches to the board, character, item and main-file
  readers for the 2.x line-oriented layouts documented in entry 1, selected by the
  spec's detection byte. Text boards convert to the vector model through the same
  §4.8-style path; text `.gam` projects resolve the §1.5 layout."
- verify: "All 17 text `.brd`, 2 text `.tem`, 16 text `.itm` and 2 text `.gam` files
  in FinalDestiny, Caoquest, School2Demo, ChimeranEmpire and BusDriver parse with 0
  trailing bytes; the dump's failed count drops by those 37."

`[[entry]] id = 3 — Text-form readers for TK2 enemy, animation, special move, status, background`
type = "story"; covers = ["CAP-1"]; after = [1, "epic-legacy-formats 2.4/2.6/2.7"]; hitl = false; risk = "medium"
- title: "TK2 text readers: `.ene`, `.anm`, `.spc`, `.ste`, `.bkg`"
- description: "Adds text-form branches for the minor-0 text enemies (synthesising
  rest `.tbm`/`.anm` from the grid), the documented `.anm`/`.spc`/`.ste`/`.bkg`
  text forms and a friendly 're-save' error where the spec still says optional."
- verify: "All 52 text `.ene`, 16 text `.anm`, 8 text `.spc`, 23 text `.bkg` files
  parse with 0 trailing bytes."

`[[entry]] id = 4 — Corrected TK2 binary versions: `.gam` 2.2 and `.tem` 3–4`
type = "story"; covers = ["CAP-1"]; after = [1, "epic-legacy-formats 2.6/2.9"]; hitl = false; risk = "high"
- title: "Correct TK2-era binary `.gam` and `.tem` layouts"
- description: "Fixes the `.gam` minor-2 record list (currently leaves 1506 residue
  bytes / fails FinalDestiny) and the `.tem` minor 3–4 field set (currently 407–797
  residue bytes) to the layouts entry 1 records, so those files read to the last byte."
- verify: "15 binary `.gam` (incl. FinalDestiny's two) and 16 `.tem` minor 3–4 read
  with 0 trailing bytes; the dump's failure/residue counts for those extensions drop
  to zero."

`[[entry]] id = 5 — Missing 2.x readers: `.tan`, `.gph`, `.fnt``
type = "story"; covers = ["CAP-1"]; after = [1]; hitl = false; risk = "medium"
- title: "Animated tile `.tan`, single tile `.gph` v2, font `.fnt` readers"
- description: "Adds readers for `.tan` (binary 2.0, format-spec §3.5), `.gph`
  v2 (text, §3.2) and a new reader for `.fnt` (`RPGTLKIT FONT`, added to the spec
  by entry 1). Wires them into the dump/registry so ChimeranEmpire's 33 `.tan`
  and the games' `.gph`/`.fnt` load instead of being skipped."
- verify: "33 `.tan`, 6 `.gph` and 5 `.fnt` files parse; boards/animations that
  reference them resolve."

`[[entry]] id = 6 — Registry integration (AD-31, follows epic-2 ticket 2.13)`
type = "story"; covers = ["CAP-1"]; after = [2, 3, 4, 5, "epic-legacy-formats 2.13"]; hitl = false; risk = "low"
- title: "Register the TK2 text/tile/font decoders in the core format registry"
- description: "Registers the new text-form and `.tan`/`.gph`/`.fnt` decoders
  through the `AssetDecoder` interface / core format registry built by epic-2
  ticket 2.13, dispatching by extension and magic as AD-31 states."
- verify: "Every TK2 sample file with a registered extension decodes through the
  registry to the model its reader returns; the dump still matches its expectation."

`[[entry]] id = 7 — Corpus verification gate (extends epic-2 ticket 2.11/2.13)`
type = "story"; covers = ["CAP-1"]; after = [2, 3, 4, 5, 6]; hitl = false; risk = "low"
- title: "Extend the dump corpus gate to the six TK2 games"
- description: "Fetches the TK2 sample games as CI fixtures (never committed, G-rules)
  and extends `golden/legacy-corpus.json` / `dump --check` so FinalDestiny,
  LittleMan, BusDriver, Caoquest, School2Demo and ChimeranEmpire must reach zero
  failures and zero residue on their data files."
- verify: "`pnpm dump:check` runs over the six TK2 games and reports 0 failed and 0
  residue-bearing parses; a fixture fetch keeps the games out of git."

Notes on placement relative to 2.13/2.14:
- Entry 6 is the AD-31 registry touch-point; it must follow 2.13 (registry) and
  this epic's 2–5. It is **not** the same work as 2.13; 2.13 stays as approved.
- Entry 7 rides on 2.14's expectation tooling the same way 2.13 did, but is a new
  corpus, so it belongs to this epic, run after 2.14.
- Writers are **not** proposed for TK2 text formats: the spec treats text boards as
  read-only legacy ("re-save in the editor is optional"), the project writes only
  its own binary forms and its own distribution package (epic-2 2.12, AD-6). Only
  readers (and the existing binary writers) are needed. If the owner wants TK2 text
  *writer* parity, that is a separate decision requiring the spec to say so first.

---

## Unknowns

- **Exact TK2 text layouts for `.brd`, `.gam`, `.itm`, `.tem`** are not written
  down anywhere we found. They must be derived from the allowed data files (a
  doc-first reverse-engineering commit). We did **not** fully reverse-engineer
  them here; we only proved they exist, their detection bytes, their first
  header lines (magic, major 2, and minor = 1/1/2/0 respectively) and their line
  counts. Whether they are stable across all 2.x minors is unverified.
- **Correct `.gam` binary minor-2 record list.** We observed the mismatch
  (1506 residue on BusD, EOF failure on FinalDestiny) but did not determine the
  true field set. [INFERENCE] the TK2 2.2 main file uses a different tail than the
  spec's minor≤2 rows; needs the doc entry to settle it from the data.
- **Correct `.tem` minor 3–4 field set.** Same situation (residue 407–797 bytes).
  The residue content was not analysed.
- **`.fnt` internal structure** (`RPGTLKIT FONT`) is entirely unknown beyond the
  magic and a `version 2` marker observed in the header — no format doc, no
  community description found.
- **`.tan` minor numbers.** Observed major 2 / minor 0; the spec does not state
  which minors exist, and whether 2.x ever wrote a text `.tan` is unknown (none seen).
- **`.ste` text form.** Documented in the spec but **no text `.ste` exists in this
  corpus** (all 5 are binary 2.0), so the text branch is unverified — may or may
  not occur in the wild.
- **`.tst` details 3–6 (8-bit) and `.iso`.** Zero samples; the palette and pixel
  format are documented (official TST spec) but not exercised.
- **`.tbm`.** Zero samples in the TK2 corpus (TK3 only). Its TK2-era use is unproven;
  `.ene` text synthesises an `.tbm`, so a writer/synthesis path may be needed.
- **Whether older TK2 minors (2.0, 2.1, 2.07) differ** from the 2.2 layouts observed
  here. The installers `toolkit200.zip`/`toolkit207.zip` carry no sample game
  (only runtime DLLs), so only 1.4 and 2.20b-era data were available. TK 2.0 Beta 1
  and 2.07 data files are **not in the archive** — the remaining 2.x minors are
  unobserved.
- **Cross-game reproducibility.** The corpus is six games from one era (2.1.4.a /
  2.1.7.a). A single public sample per layout would raise confidence; none is
  known beyond these.
- **Reading vs. playing.** This ticket covers *reading* every observed data file.
  Whether TK2 RPGCode semantics (a separate workstream) and TK2-era engine defaults
  (e.g. no built-in battle plugin) are handled is **out of scope here** and is the
  subject of the TK2 RPGCode workstream.

---

## Evidence index

- Readers/behaviour: `packages/core/src/formats/{main-file,board,actor,animation,battle,tileset}/**`
  (newer worktree), and the live run of `packages/runner-headless/dist/cli.js dump`.
- Spec and features: `docs/format-spec.md` §1.3–§1.4, §2, §3.1–§3.2, §3.5, §4.1,
  §4.8, §6.1–§6.3, §7.1, §8.1–§8.3, §9.1; `docs/engine-features.md` E-130/E-131, §14.
- Epic docs: `_bmad-output/.../epic-legacy-formats/{epic-legacy-formats.md,
  tickets.toml, discovery/spec-readiness.md, discovery/corpus-inventory.md}`.
- Archive (allowed): `archive-org/FinalDestiny_201810/Final_Destiny.zip`,
  `wayback/aljo.afraid.org/games/{littleman,busd}/*.zip`,
  `wayback/mysticsoftware.net/{caoquest,School2Demo,chimeran_empire}.zip`,
  `archive-org/rpg-toolkit-{14,200,207,220b}`, `archive-org/SHA256SUMS`,
  `data/game-versions.tsv`, `data/zip-catalog.txt`,
  `wayback/rpgtoolkit.com/dev_repo/docs/tst.html` (official TST 2.0 spec),
  `data/zip-texts/toolkit2.20b_wav.zip/zip_inner/help_help{1,2,3}.htm` (TK2.20b manual).
- Scratch (deleted after use): `/tmp/tk2formats-scratch/` (extractions + `classify.py`).
