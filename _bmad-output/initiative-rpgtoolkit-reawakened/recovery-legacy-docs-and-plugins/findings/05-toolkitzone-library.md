# The toolkitzone.com Library — recovered articles, and what they say about Toolkit 3 and plugins

Recovery target: the **Library** section of toolkitzone.com (the community's
"official home of the RPG Toolkit", ~2005–2010, run by Phil Carty), the third
major documentation source after the site's help app and the plugin catalogue.
The Library is the community's *prose*: release notes, developer progress
updates, and programming/tutorial articles — the only place where Toolkit 3's
post-2004 development is written down.

Raw captures (HTML), extracted text and machine-readable indexes are in the
git-ignored `fixtures/archaeology/toolkitzone/library/`. The only tracked
artefact is this report.

Clean-room note (G7): only articles, release notes and readmes were read; no
legacy source file (`*.bas`, `*.vb`, `*.cpp`, `*.h`, `*.frm`) was opened, and the
legacy source tree `../rpgtoolkit` was never read.

Report date: 2026-10-11.

## Method

| Step | Tool | Result |
| --- | --- | --- |
| Enumerate article ids | `wb.py cdx "toolkitzone.com/library.php" --match prefix` (4 087 rows, 200 only) | 280 distinct `doc=` ids (1…486, gaps), URLs normalised, comment-add/review variants dropped |
| Fetch article bodies | `wb._open` loop over the largest capture per id, one request/second, plus two patient passes (`bg_71`, `sweep_library.py`) that retried failures and followed the `?PHPSESSID=`-canonicalised captures | **240 bodies** (`library/doc-NNNN.html`) |
| Fetch listing pages | `fetch_library_index.py` | 23 listing pages (`library/index/*.html`): 20 `cat=N`, plus `browse`, `cats`, `new`, `search&page=2` |
| Extract text + titles | `lib_index.py` | `library/text/doc-NNNN.txt`, `library/articles.json` |
| Merge listings with bodies | `parse_library_index.py` | `library/inventory.json` — **253 articles** known, 240 with body |

Titles are taken from the article page's breadcrumb (`Library › Category ›
Title`, repeated as the heading); authors and dates come from the listing pages
where available, otherwise from the article's `By …` line.

## Provenance

| Item | Wayback snapshot | Captured | Confidence | Notes |
| --- | --- | --- | --- | --- |
| `library.php?cats` (category index) | https://web.archive.org/web/20100305144712id_/http://www.toolkitzone.com:80/library.php?cats | 2026-10-11 | high | every category with its document count |
| `library.php?new` (all newest) | https://web.archive.org/web/20081221202022id_/http://www.toolkitzone.com:80/library.php?new | 2026-10-11 | high | 68 899 bytes; largest listing capture |
| `library.php?browse` | https://web.archive.org/web/20100305154633id_/http://www.toolkitzone.com:80/library.php?browse | 2026-10-11 | high | most-viewed + category tree |
| `library.php` (home, 2007) | https://web.archive.org/web/20070305232756id_/http://www.toolkitzone.com:80/library.php | 2026-10-11 | high | recent/popular sidebar, breadcrumbs |
| 20 category listings | see `fixtures/archaeology/toolkitzone/library/index/snapshots.json` | 2026-10-11 | high | cats 2,3,4,5,9p3,11,12p5,17,18,19,20,21,22,23,25,26,31,32 + `browse`,`new`,`cats`,`search p2` |
| 240 article bodies | one row per article in `library/index.json` (`original`, `snapshot`, `timestamp`, `bytes`) | 2026-10-11 | high | bodies are `id_` raw captures of `library.php?mode=read&doc=N` / `library.php?doc=N` |
| `library.php` 2013 capture | https://web.archive.org/web/20131210061625id_/http://www.toolkitzone.com:80/library.php | 2026-10-11 | high | **GoDaddy parking page** — the domain lapsed 2013-10-31, so nothing after that date is recoverable |

## What the Library holds

The 2010 category index gives the shape of the whole section (documents per
category, site's own counts):

| Section | Categories | Count |
| --- | --- | --- |
| RPG Toolkit (engine/editor) | News 24, RPG Toolkit 25 | 49 |
| RPG Code / programming | **RPG Code 18**, Classes 5, Canvases 3, Custom Systems 3, Functions 2, Tips & Tricks 2 | 33 |
| Game Creation | Boards 7, Design 10, Graphics 20, Sprites 5, 3D 4, Audio 2, Writing 1 | 47 |
| Community / meta | Community 188, Zone Awards 62, Contests 19, Interviews 7 | 276 |
| Other | Games 10, Editorials 3, Comment 4 | 17 |

Of the 253 articles this recovery knows by id, **240 have their body** and 13 are
listing-only (titles/descriptions survive, bodies do not — see *Gaps*).

## The articles that matter for the rebuild

**Toolkit 3 release notes — the closest thing to an official TK3 changelog.**

| id | Title | Note |
| --- | --- | --- |
| 7 | toolkit 3 features | Xavier, 2004-09-06 — points at Serge's feature preview on tk_gaming |
| 12 | 3.0.4 september release | `cbm`, 2004-09-13 |
| 100 | TK3 3.0.5 | *"the complete feature/fix list for the release of RPG Toolkit version 3.0.5"* — contributors "Colin, Delano, faero, Occasionally_Correct, Shao"; lists Trans3 engine bug fixes and additions |
| 102 | 3.0.5 Release | Xavier |
| 216 | TK3 3.0.6 | release feature/fix list |
| 217 | 3.0.6 Release | |
| 41, 123, 169, 194, 207, 246, 282 | Progress Update (Dec 2004 … Feb 2007) | the development diary of Trans3: the C++ rewrite, the vector/pixel-movement engine, the new board editor |

The 3.0.5 list is directly usable as an engine-behaviour source. Its bug-fix
lines name engine semantics our `docs/engine-features.md` currently describes
only in outline, for example:

> "Under" tile transluscency problems in pixel movement fixed. — *TK3 3.0.5 (doc 100)*
>
> Walking against a solid tile, the player didn't change direction (if he was facing a different direction to the wall). — *TK3 3.0.5 (doc 100)*
>
> Plugins could not be sent variables enables the multiplayer plugin to work). — *TK3 3.0.5 (doc 100)* [sic — the capture is missing the opening parenthesis]

**Programming articles (the RPG Code category and the plugin-adjacent ones).**

| id | Title | Author | Body |
| --- | --- | --- | --- |
| 64 | RPGCode OOP Overview | Colin | yes |
| 127, 136 | RPG Code Class 1 | — | yes (duplicate) |
| 179, 183 | Optimizing RPGCode, Parts I–II | Colin | yes |
| 181 | The basics of inheritance | Occasionally_Correct | yes |
| 188 | More about Inheritance | Occasionally_Correct | yes — recovered on the final sweep |
| 212 | Miscellaneous RPGCode | — | yes |
| 364 | Object Oriented Programming (OOP) Tutorial | — | yes |
| 61 | C++ Basics A1 | — | yes |
| 158 | The Dead Basics of C++ | — | yes — written *for plugin authors*: "C++ is … the optimal language for writing plugins and such for the Toolkit … it provides both speed and versatility" |
| 262 | The True Nature of Multirun() | UltimaWizard, 2007-01-04 | yes — recovered on the final sweep |
| 328 | Marz's RPG Code Tutorial | Marz, 2008-09-07 | yes — 69 kB capture, recovered on the final sweep |

The RPGCode articles are reference material for the VM workstream
(`docs/format-spec.md` §9, E-90…E-99): `Multirun()`, OOP/inheritance in RPGCode,
optimisation, and Colin's own explanations of the language. The last sweep closed
the two biggest gaps here — `The True Nature of Multirun()` (doc 262) and
`More about Inheritance` (doc 188) — and `Marz's RPG Code Tutorial` (doc 328).

## What the Library says about plugins

It answers the "why were plugins the extension point?" question in the
developers' own words, and it records the licensing decision that constrains
this rebuild.

**Plugins were the deliberate extension mechanism.** From the July 2006
progress update (doc 123), Colin and Xavier in the comments:

> "I think adding functions to the engine itself is only justified if they are difficult to write in a plugin, or if there is a high demand for them."
>
> "Your suggestions don't sound too taxing; they could probably be achieved through a plugin." — *doc 123*
>
> "That's what plugins are for." — *doc 169*

The same thread corrects a common claim: the FMod audio plugin was "a C++
plugin", "which it's not (it's a VB plugin)" — i.e. plugins were not
single-language.

**The licence changed to GPL, and it covered the stock menu and battle plugins.**
From the February 2007 progress update (doc 282), the artefact that explains why
this rebuild has to be clean-room and why legacy binaries cannot be reused:

> "The Toolkit will henceforth be licenced under the GNU General Public License; this licence applies to the editor (toolkit3.exe, actkrt3.dll) and the engine (trans3.exe) and the default menu and battle systems (tk3menu.dll, tk3fight.dll). Previous releases (3.0.2–3.0.6) will remain under the original licence."
>
> "The 3.0.4+ plugin SDKs, written by Colin, will be upgraded and rereleased under the GPL with the inclusion of an exception allowing users who do not release plugins made with the SDKs for public not to have to include the sources… If a plugin is released for public use in other games, the source must be included." — *doc 282, Progress Update – February 2007*

Two consequences worth recording with the recovered plugin catalogue
(`findings/03-toolkitzone.md`) and the SDK reference
(`findings/06-plugin-sdk.md`):

1. **G6.** The TK3 engine, editor, stock menu/battle plugins and the 3.0.4+ SDKs
   are GPL (the pre-2007 releases under the older ACOL licence). None of that
   code may be a dependency of, or be copied into, this MIT/Apache rebuild.
2. **G7.** The same fact is why the plugin *interface* — not its implementation —
   is the only thing worth recovering, and why the SDK findings below are
   recorded as an interface inventory for a future `docs/` entry rather than as
   material to port.

## Gaps

* **13 listing-only articles** (bodies not archived: the id appears in the CDX
  only with non-200 statuses, or the bytes are gone): `my games`, `90,000 and
  counting…`, `bits and bobs`, `Basics of Blender`, `Making A Story Work, Part
  2`, `How Can I Make My Game Great?`, `Saphyra's Journal` (two entries),
  `Audio Manual`, `Midi Music Contest - Results`, `Marz's How To Guides`,
  `Game Design: Let's Get Real`, `Welcome to the Zone Awards`. Doc ids:
  10, 15, 16, 89, 125, 157, 171, 177, 308, 347, 418, 429, 452.
* **Listing pages not archived:** `cat=1`, `cat=6`, `cat=7`, `cat=8`, `cat=13`,
  `cat=15`, `cat=16`, `cat=27`, `cat=29`, `cat=30`, `search`, and most `&page=2+`
  views. The 2010 `cats` index still gives their counts, so their size is known
  even where their contents are not.
* **The 167 "unlisted" articles** (bodies recovered from `doc=N` captures but
  never seen in a recovered listing page) have titles taken from the article
  page itself; a handful of 2005-era pages carry no breadcrumb and their titles
  are `(untitled)` or an author name.
* **Nothing after 2013-10-31** — the domain lapsed; the only later capture is a
  GoDaddy parking page.
