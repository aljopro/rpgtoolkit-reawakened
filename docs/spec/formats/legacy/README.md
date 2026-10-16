# Legacy formats

Games made with Toolkit 1.x, 2.x and early 3.0 releases stored their files in older layouts: line-based **text** files (Toolkit 1 and 2), and **older binary versions** of the 3.x formats. The original 3.1 editor converts most of them when a file is opened; the original 3.1 engine reads only some and rejects the rest with "Please save … in the editor". This section collects everything about those older layouts in one place so that the [current format pages](../README.md) only describe what a 3.1 game contains.

| Page | Contents |
|---|---|
| [text-formats.md](text-formats.md) | Line-by-line layouts of the Toolkit 1/2 text files: main file, character, item, enemy, fight background, status effect, special move, animation, font, board, single tile |
| [older-binary-versions.md](older-binary-versions.md) | Older minor versions of the binary formats: main file minors 1-8, pre-vector boards (minor 2-3), characters before minor 8, items before minor 7, saved games before minor 4 |
| [../../examples/versions/](../../examples/versions/README.md) | An example file for every version of every asset format, with annotated listings: fixtures for an importer |
| [conversion.md](conversion.md) | What the original programs generate when they convert legacy files (tile bitmaps, animations, tilesets), the file names they use, and the Toolkit 2 folder-layout upgrade |

## Recommendation for a new implementation

Treat legacy files as an **import** step, not as formats to load at run time:

1. Detect legacy files (below) when a project is opened in the editor.
2. Convert them with the rules in [conversion.md](conversion.md) and write the current layout.
3. Have the engine accept only the current layouts (plus the older binary minors listed on each current format page, which are cheap to support).

This matches what the original programs did in practice: the 3.1 engine could not load most legacy files, so games had to be re-saved in the editor first.

## Detecting a legacy file

| Format | Binary header text | Probe byte offset | `00` at probe → | anything else → |
|---|---|---|---|---|
| Main file | `RPGTLKIT MAIN` | 13 | binary | text (or Toolkit 1) |
| Board | `RPGTLKIT BOARD` | 14 | binary | Toolkit 2 text board (not readable by 3.1) |
| Character | `RPGTLKIT CHAR` | 13 | binary | text |
| Item | `RPGTLKIT ITEM` | 13 | binary | text |
| Enemy | `RPGTLKIT ENEMY` | 14 | binary | text |
| Fight background | `RPGTLKIT BKG` | 12 | binary | text |
| Status effect | `RPGTLKIT STATUSE` | 16 | binary | text |
| Special move | `RPGTLKIT SPLMOVE` | 16 | binary | text |
| Animation | `RPGTLKIT ANIM` | 13 | binary | text |
| Font | `RPGTLKIT FONT` | 13 | — (no binary form) | text |
| Single tile | `RPGTLKIT TILE` (text in both) | — | first line is the header → version 2 tile | version 1 tile |

The probe offset is the length of the header text, i.e. the position of the binary header's terminating `00`. In a text file that position holds part of the line ending or the next line.

## Who reads what (Toolkit 3.1)

| Legacy file | Original editor | Original engine |
|---|---|---|
| Text main file | converts | **rejects** ("Unrecognised File Format") |
| Main file, binary minor 1-8 | reads | reads (all minors) |
| Toolkit 2 text board | **rejects** | **rejects** |
| Board, binary minor 2-3 (pre-vector) | converts on open | converts in memory on every load |
| Text character | converts | **rejects** |
| Character, binary minor < 5 | converts | **rejects** |
| Character, binary minor 5-7 | reads | reads |
| Text item | converts | **rejects** |
| Item, binary minor < 4 | converts | converts (writing files) on every load |
| Item, binary minor 4-6 | reads | reads |
| Text enemy, background, status effect, special move | converts | tries to read, but a CRLF bug rejects them in practice; for enemies and backgrounds it would also read the wrong grid size |
| Text animation | reads | reads |
| Version 1 single tile | reads | reads |
| Saved game, minor < 4 (Toolkit 3.0) | — | reads |

**Toolkit 1 (R-24).** Toolkit 1 is out of scope for the first release (owner decision 2026-10-11): the Toolkit 1 main file and the version-1 single tile are recorded as evidence-backed but carry **no reader** — an importer detects them and reports them as unsupported. See the Reawakened rule on [text-formats.md](text-formats.md).

## §15 corpus evidence

Every layout on [text-formats.md](text-formats.md) was checked against the archive's real 2.x **data files**, not only against the original programs' reading logic. The evidence is the six-game corpus — **FinalDestiny, LittleMan, BusDriver, Caoquest, School2Demo, ChimeranEmpire** — plus the official 2.20b demo where it adds a sample, and the reviewed clean-room extraction in [../../../provenance/facts-round-5.md](../../../provenance/facts-round-5.md) (round 5). File counts, per extension:

| Extension | Corpus |
|---|---|
| `.gam` | 15 binary minor 2, 3 text (`DEMO.GAM`, `caoquest.gam`, `devilsnight.tpk`'s `main.gam`) |
| `.brd` | 144 binary minor 2, 17 text minor 1 |
| `.tem` | 16 binary minor 3-4, 2 text minor 2 |
| `.itm` | 87 binary minor 3, 16 text minor 1 |
| `.ene` | 52 text minor 0, no binary |
| `.spc` | 22 binary minor 2, 8 text minor 0 |
| `.ste` | 5 binary minor 2, no text |
| `.bkg` | 23 text minor 0, no binary |
| `.anm` | 17 text minor 0, no binary |
| `.fnt` | 5 text, no binary |
| `.tan` | 33 binary minor 0 |
| `.gph` | 6 v2 text |

The layouts, their per-file worked examples, their seven `<!-- OWNER: … -->` note entries and §15's open questions were migrated here from `format-spec.md` §15 (superseded; `docs/spec/` is now normative under [ADR 0007](../../../adr/0007-docs-spec-is-the-normative-specification.md)). Each format question is ruled in [text-formats.md](text-formats.md) as a legacy fact with its evidence, a **Reawakened rule** block, or a named open question — never silently. The open questions still open are the `.gam` text plugin count of 5 with four flags, the binary `.tem` minor-3/4 residual bytes, and the text `.bkg` line 218; §15.15's other five are closed.

**Zero-byte placeholder files — Reawakened rule (Z-1).** Tolerate a zero-byte file as an empty placeholder, with a warning. The corpus holds **7** zero-byte data files left by their authors — two `.brd` (one named `Boards/.brd` in School2Demo, one in ChimeranEmpire), two `.itm` (FinalDestiny, ChimeranEmpire) and three `.spc` (FinalDestiny and two in ChimeranEmpire) — and some are referenced by real games, so a hard error would break a shipped game. A reader treats such a file as an empty document and lets the referencing code see "no asset".

<!-- OWNER: placeholder files — alternatives: (a) tolerate a zero-byte file as an empty placeholder and let the referencing entry see "no asset"; (b) skip it silently; (c) report it as a located error. The corpus shows they were left by their authors and are referenced in some cases, so a hard error would break a real game; decided: (a) tolerate with a warning, and (b) only if a caller asks to skip. Change here if the owner prefers skip. -->
