# RPG Toolkit documentation — consolidated recovery digest

Every documentation generation of the RPG Toolkit that the Internet Archive still
holds, what was recovered, and how it maps onto the rebuild's `docs/`.

**Headline:** the **Toolkit 3.1.0 user guide** is recovered in full — 34 pages in the
online mirror, 47 `.htm` files in the shipped help — including the **262-function
RPGCode reference** with signatures and descriptions
— together with the Toolkit 2 and 2.20b guides, the shipped help of the 3.0.6 /
3.1.0 / 3.2.1 distributions, and ~270 community articles and tutorials. What is
*not* in any of them is a plugin-authoring chapter: that lives only in the
recovered SDK (`plugins.md` §4).

Companion files: `plugins.md` (plugin catalogue and the plugin API),
`findings/01-rpgtoolkit-net.md`, `findings/02-tk3-docs.md`,
`findings/03-toolkitzone.md`, `findings/04-distribution.md`,
`findings/05-toolkitzone-library.md`, `findings/06-plugin-sdk.md`.
Raw captures are in the git-ignored `fixtures/archaeology/`.

## 1. The four documentation generations

| Generation | Document set | Recovered | Local cache | Report |
| --- | --- | --- | --- | --- |
| **Toolkit 2.0** | `rpgtoolkit.com/docs/ver2/help1.htm` ("VERSION 2.0 USER'S GUIDE"), `help2.htm` (RPGCode2 primer), `help3.htm` (RPGCode2 reference) | yes — the live pages are 2.0, **not** 2.20b | `fixtures/archaeology/rpgtoolkit-com/` | `findings/04-distribution.md` |
| **Toolkit 2.20b** ("Powerhouse Edition") | help1/2/3 inside the `help220.upd` self-extracting update | yes, extracted from the UPD1 byte-shifted payload | `fixtures/archaeology/dist/help220b-docs/` | `findings/04-distribution.md` |
| **Toolkit 3.0.x** | shipped help (`help/*.htm`, 121 files) incl. the only plugin-authoring text anywhere in an official package; `.ref` language files | yes (3.0.6 package) | `fixtures/archaeology/dist/tk306-docs/` | `findings/04-distribution.md`, `findings/02-tk3-docs.md` |
| **Toolkit 3.1.0 / 3.2.x** | the full user guide: 13 editors, default menu/battle systems, distribution, RPGCode primer + 262-function reference + OOP reference, troubleshooting; shipped as `help/` (47 `.htm` pages, 144 images) plus the online help app | yes — 3.1.0 package, 3.2.1 package (same help) and the live help app (47 page ids) | `fixtures/archaeology/dist/rpgtoolkit321-docs/`, `…/rpgtoolkit310-docs/`, `fixtures/archaeology/tk3-help/`, `fixtures/archaeology/rpgtoolkit-net/manual/` | `findings/02-tk3-docs.md`, `findings/01-rpgtoolkit-net.md` §3 |

The **3.1.0 guide is documented independently three times**: the help app at
`tk3.toolkitzone.com/help/?page=N`, the same manual mirrored statically at
`rpgtoolkit.net/manual/*.htm`, and the shipped `Toolkit3/help/` tree inside the
3.1.0 and 3.2.1 packages. They agree page-for-page (`page1`…`page31`, plus
`page4.2`, `page18.3`, `pageed_environment`, `pageed_background`), which makes the
recovered text cross-verifiable rather than single-sourced.

Authorship (from `?page=28`, verbatim): *"This user guide written by: Jonathan
Hughes (Delano) — Editor Guides, Quick Start Guide, Vector Tutorial; Colin James
Fitzpatrick — Engine Guides, and OOP Reference; Samuel Bedwell
(Occasionally_Correct) — RPGCode Features."* Copyright line on every page:
*"© 2005, 2007 C.J. Fitzpatrick, Jonathan Hughes, and Samuel Bedwell."*

Documented version signals: the nav's last item is `3.1.0 changelog`;
`?page=31` is titled *"RPGToolkit 3.1.0 Changelog … changes and new features in
RPGToolkit version 3.1.0 from version 3.0.6"*; the help home carries a
`3.1.0 status: * = updated, ** = rewritten, *** = new page` legend and a news log
dated 2007-08-18…09-06 (quick start, minor editors, RPGCode language pages, board
editor + vector tutorial, function reference, changelog). `?page=29` (history)
still carries the 3.0.x text, so the guide is a 3.1.0 layer over a 3.0.x body.

## 2. What the 3.1.0 guide covers

| Section | Pages | Notes |
| --- | --- | --- |
| Quick start | `page1` | a full onboarding walkthrough with concrete filenames |
| Editor (13 editors) | `page2`, `pageed_environment`, `page3` (main file), `page4` + `page4.2` (board + vector overview, new in 3.1.0), `page5` (tile), `page6` (program), `page7` (character), `page8` (item), `page9` (enemy), `page10` (animation), `page11` (tile bitmap), `page12` (special move), `page13` (status effect), `pageed_background` | tab/toolbar/tool-group/dialog/shortcut level detail |
| Playing | `page14` | |
| **Default systems** | `page15` | the stock **menu** (Items/Equip/Abilities/Save/Load/Quit) and **battle** (charge bars, screen zones A/B/C, Fight/Special Move/Items/Run) — the systems that were themselves plugins |
| Distribution | `page16` | runtime file set: `\Main\Main.gam`, `\Game\<name>`, `trans3.exe`, `actkrt3.dll`, `audiere.dll`, `freeimage.dll`; PakFile `.tpk`, setup ZIP, standalone `.exe` |
| RPGCode | `page17` (scripting), `page18` + `page18.3` (+ `18.1`, `18.2` not archived) language features and creating functions, `page21` OOP | |
| **Function reference** | `page19` | **262 functions**: alphabetical index, every overload signature with parameter types and by-reference outputs, valid flag constants, one-line descriptions, plus the RPGCode variable-type glossary |
| Troubleshooting | `page22`, `page23` (FAQ), `page25` (technical issues), `page26` (system requirements) | behavioural errata catalogue |
| About | `page28`, `page29` (history: 3.0.0 May 2003 → 3.0.6 Apr 2005), `page30`, `page31` (3.1.0 changelog) | |

### 2.1 The function reference is the highest-value artefact

`page19` flattens to ~43 000 characters and yields **262 documented functions**
with signature *and* description. Archived signature style:

> `void activePlayer( variant handle)` / `handle activePlayer(void)`
> Set or get the active player, by handle.

> `void boardGetProgram( int programIndex, string &program, int &pointCount, int &layer, bool &isClosed, int &attributes, int &distanceRepeat) int boardGetProgram()`
> Returns the properties of a given program. Returns the number of programs on the board.

> `void boardSetProgram( int programIndex, string program, int pointCount, int layer, bool isClosed, int attributes, int distanceRepeat)`
> … Possible flags: `tkPRG_STEP`, `tkPRG_KEYPRESS`, `tkPRG_REPEAT`, `tkPRG_STOPS_MOVEMENT`.

Variable-type glossary (same page): `array`, `bool`, `canvas` ("handle … created
by `createCanvas()` … freed using `killCanvas()`"), `cursor_map`, `string`,
`thread` ("created with `thread()` … destroyed with `killThread()`"), `variant`,
`void`.

Machine-readable extracts:

* `fixtures/archaeology/rpgtoolkit-net/manual/function-reference.json` —
  name, signatures, description for all 262 (workstream A's extractor).
* the same reference is also present in the shipped 3.1.0/3.2.1 help tree
  (`dist/rpgtoolkit321-docs/…/help/page19.htm`), independently captured.
* the editor's language data files shipped alongside it —
  `help/rpgcodeEN.ref` (36 011 B), `help/eventsEN.ref` (28 106 B) — are the
  tool's own function/event tables, valuable as a machine-checkable cross-check.

`[INFERENCE]` the JSON extract reproduces the shipped reference; it should be
re-derived from the distribution copy and reconciled with `docs/` before being
treated as authoritative — see §6, gap 1.

## 3. Plugin documentation

Covered in full in `plugins.md` §4. In one line: **no official documentation
generation documents plugin authoring except the 3.0.6 help** (whose `page18.4`
"Plugins" section points at two off-site SDKs — C++ and VB), but **two of those
SDKs survived as binaries**: the 2004 COM SDK for 3.04+ (`fileman-861.zip`) and
the 2011 TK310 C++ SDK for 3.1.0 (`vault/object/4305.zip`) — see
`findings/06-plugin-sdk.md`. The VB SDK's bytes are gone. The 3.1.0/3.2.1 guide
itself dropped the topic — its "plugins" TOC entry (`page20`) is still a
commented-out line in the RPGCode page.

## 4. Community documentation

| Corpus | Size | Local cache | Report |
| --- | --- | --- | --- |
| `rpgtoolkit.net/tutorials/*` (2011–2016) | 20 articles + 6 index pages; the largest is *Marz's RPG Code Tutorial* (137 909 chars), then *Creating A Turn-Based Battle System* (61 771) and *Class and Object Reference* (27 985) | `fixtures/archaeology/rpgtoolkit-net/tutorials/` | `findings/01-rpgtoolkit-net.md` §4 |
| `toolkitzone.com` Library (2004–2010) | 253 articles known, 240 with body: TK3 release notes (3.0.4/3.0.5/3.0.6 complete fix lists), eight developer progress updates, RPGCode/OOP tutorials, contest and community writing | `fixtures/archaeology/toolkitzone/library/` (`inventory.json`, `text/`) | `findings/05-toolkitzone-library.md` |
| `tk3.toolkitzone.com/dev/*` | coding guidelines (VB6/C++), development process, **licensing pages** (ACOL, ACOL-Derivative, GPL + game-EXE exception) | `fixtures/archaeology/dev/` | `findings/02-tk3-docs.md` §5 |
| `rpgtoolkit.com/dev_repo/docs/*` | `article1.html`, `distribFAQ.htm` (v2.07), `perspective.htm`, `rpgcode_tricks_and_tips.htm`, `tst.html` / `tileart/index.html` (TST format, "Drawing Tiles") | `fixtures/archaeology/rpgtoolkit-com/` | `findings/04-distribution.md` |

The three tutorial corpora overlap: *Marz's RPG Code Tutorial* survives both on
rpgtoolkit.net (137.9K chars) and as toolkitzone Library doc 328; *Realistic Board
Design* and *Making A Story Work* likewise appear in both.

## 5. Licensing (matters for G6)

Recovered from the toolkitzone Library (February 2007) and the `dev/` licence
pages, verbatim in the source reports:

* **3.0.2–3.0.6** — AC Open Licence (ACOL).
* **3.1.0 onward** — **GNU GPL v3**, applied to the editor (`toolkit3.exe`,
  `actkrt3.dll`) and the engine (`trans3.exe`) *and the default menu and battle
  systems* (`tk3menu.dll`, `tk3fight.dll`), with a game-EXE exception.
* **Plugin SDKs** — AC Open Licence Derivative; from 2007 the 3.0.4+ SDKs were to
  be re-released under GPL with an exception for non-public plugins.

Consequence: the recovered documentation may be read and cited; **no recovered
code, DLL or SDK may be copied into, or depended on by, this MIT/Apache
repository** (G6), and the rebuild's extension point must be designed, not ported
(G7).

## 6. `docs/` coverage gap list

What the recovered 3.1.0 documentation covers that `docs/format-spec.md`,
`docs/engine-features.md` and `docs/editor-features.md` do not (workstream B's
comparison, verbatim items in `findings/02-tk3-docs.md` §6):

1. **Per-function reference (largest gap).** `?page=19` — 262 functions with
   signatures, parameter types, by-reference outputs, flag constants and
   descriptions. `docs/format-spec.md` §9.11 lists names only.
2. **Per-editor UI inventory** — tabs, toolbars, tool groups, menus, dialogs,
   shortcut keys (`page3`, `page4.1`, `page5`, `pageed_environment`).
   `editor-features.md` is feature-level.
3. **Stock menu/battle screen layout and flow** — menu sections, battle zones
   A/B/C, visible/invisible charge bars (`page15`). `engine-features.md` has the
   rules only.
4. **Distribution runtime file set and packaging routes** (`page16`).
5. **Legacy platform requirements** — Win95–XP, DirectX 8, WMP 7–9, RAM/VRAM
   (`page26`).
6. **Behavioural errata / known issues** — Win9x GDI glitches, recursive flood,
   Alt-Tab crash, `prompt()` without `(`, `#global` and `CallPlayerSwap`
   unimplemented, pathfinding not infallible (`page23`/`page25`/`page31`/`page29`).
7. **3.1.0 obsolete/renamed function map and signature changes** (`page31`).
8. **Release history 3.0.0–3.0.6 fix lists** (`page29`).
9. **Correction needed:** `docs/format-spec.md` §12 describes plugins as "native
   Windows DLLs of three kinds", and §1.5 names the folder `Plugin/`. The
   recovered evidence is a **COM component model** (2004 SDK, C++ and VB kits) for
   3.04/3.0x and a **native `TKPlug*` export model** (2011 SDK) for 3.1.0, with the
   folder `Game\Plugins`, `menuPlugin`/`fightPlugin` slots and named callbacks
   (`CBGetPlayerNum`, `CBSetPlayerNum`, `CBGetGeneralString`,
   `CBSetGeneralString`, `GEN_*` codes) — see `plugins.md` §1 and
   `findings/06-plugin-sdk.md`.
10. **Licensing/commercial terms** (§5 above).
11. **Vector authoring/optimisation semantics** — bounding-box pre-testing, the
    open/closed vector rules, and *"Board programs are launched when the player's
    collision base intersects the programs' vectors, not when its activation base
    intersects (the player's activation base is presently unused)"* (`page4.2`).
12. **`internalMenu(n)` numeric id map and legacy function aliases** (`page19`).
13. **Quick-start onboarding with concrete filenames** (`page1`).

Per G7 none of this is implemented from the captures: each item, if wanted, gets
written into `docs/` in its own commit first.

## 7. Local cache map (git-ignored)

```
fixtures/archaeology/                                         (~127 MB, git-ignored)
  wb.py wb2.py wb3.py            Wayback fetchers (CDX lookup, raw id_ replay, session-canonical URLs)
  lib_index.py                   toolkitzone Library: HTML → text + title/author index
  parse_library_index.py         Library listing pages → inventory.json
  fetch_library_index.py         Library category/browse/new index capture
  sweep_library.py               final retry pass for missing Library bodies
  parse_sdk.py                   plugin SDK headers → sdk-interface.md/.json
  (plus per-workstream drivers: drive*.py, flatten.py, parse_item.py,
   extract_functions.py, grab.py, plan_*.py, …)
  tk3-help/                      49 help-app pages (47 ids, incl. an older page18.4) + 27 images + js.js
  rpgtoolkit-net/manual/         33 manual pages + function-reference.json  (workstream A's copy)
  rpgtoolkit-net-manual/         same manual re-fetched as pages/*.htm + js.js (workstream B's copy)
  rpgtoolkit-net/tutorials/, rpgtoolkit-net-tutorials/   20 tutorial articles (+ index pages)
  rpgtoolkit-net/extend/         plugin/class/method detail pages
  rpgtoolkit-net/ …              site assets, CDX dumps, manifests, recovered binaries
  toolkitzone/                   file listings, detail pages, 44 payloads, downloads/
  toolkitzone/library/           240 article bodies + text/ + inventory.json + index/
  toolkitzone/extracted/fileman-861/SDK/    the recovered COM plugin SDK
  toolkitzone/sdk-interface.md, sdk-constants.md   local API/constant transcriptions
  dist/                          rpgtoolkit321b.zip, rpgtoolkit310.exe, tk-release-7.exe,
                                 doc-only extracts (…-docs/), plugin-sdk/ listings, installer-readmes/
  rpgtoolkit-com/                ver2 help, dev_repo docs, licence texts
  dev/                           tk3.toolkitzone.com/dev pages (guidelines, process, licences)
```

Some sources were fetched twice by different workstreams into different
directories (`rpgtoolkit-net/manual/` and `rpgtoolkit-net-manual/` for the same
3.1.0 guide); both copies are kept — they are independent captures and their
agreement is part of the evidence.


## 8. Gaps

* **`rpgtoolkit.net` 2011–2016 listing pages** are client-side shells
  (`?ajax=true` JSON was never crawled), so catalogues for plugins *and* tutorials
  are reconstructed from URL evidence, not from a listing.
* **Manual images**: `rpgtoolkit.net/manual/images/imageN` serve the CMS catch-all
  HTML (figures lost, alt text only); of the help app's 143 referenced images only
  27 were ever crawled, so the vector-overview illustration set is absent.
* **`pagesearch.htm`** and the rpgtoolkit.net mirror's `page18.1`/`page18.2` are
  not in the CDX; those two sub-pages *were* recovered from the help app and the
  shipped 3.1.0 help, so only the mirror copies are missing.
* **Toolkit 2.0/2.20b help images** (`Image386–444.jpg`) are archived only as HTML
  error pages.
* **No 3.2.1-specific help** — the 3.2.1 package ships the 3.1.0 manual; there is
  no 3.2.x changelog or addendum anywhere in the archive.
* **The `?page=20` "plugins" page never existed**, in any generation.
* **Nothing after 2016** for rpgtoolkit.net, **nothing after 2013-10-31** for
  toolkitzone.com (the domain lapsed and became a GoDaddy parking page).
