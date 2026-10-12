# 02 — Toolkit 3 documentation proper: the `tk3.toolkitzone.com` help application

Recovery target: the **RPGToolkit 3 Help** application at `tk3.toolkitzone.com/help/`
plus the manual/tutorial material it points at, as archived by the Internet Archive
Wayback Machine. Output feeds the clean-room rebuild at
`/Users/jensen/projects/rpgtoolkit-reawakened` (committed digest + local raw cache).

Clean-room note (G7): this pass read **documentation only** — HTML help pages,
manual pages, changelog, licence pages and their images. No legacy source file
(`*.bas`, `*.vb`, `*.cpp`, `*.h`, `*.frm`, `*.cls`) was opened, from the archive or
elsewhere, and the legacy source tree `../rpgtoolkit` was never read. Two parts of
the domain *are* the legacy source (`/source/`, a phpCVSview of the CVS tree) and
were deliberately **not** harvested; see *Gaps* §2. Raw captures live in the
git-ignored `fixtures/archaeology/` cache; the only tracked artefact is this report.

Report date: 2026-10-11.

---

## Method

All fetching used the task helper `fixtures/archaeology/wb.py` (`cdx` for
enumeration, `get` for the raw `id_` snapshot bytes) plus two local drivers written
for this pass: `fixtures/archaeology/fetchpages.sh` and `fixtures/archaeology/grab.py`
(a paced, resumable wrapper over `wb.py` that takes a TSV target list, skips files
already on disk, and retries through the `ECONNREFUSED` windows the Wayback replay
endpoint produced all session). Reading HTML was done by flattening with an inline
`flat.py` (strip `<script>/<style>`, tags → newlines, `html.unescape`). No browser
automation was used.

CDX queries run (files under `fixtures/archaeology/tk3-help/` unless noted):

| Query | Match | Result | File |
| --- | --- | --- | --- |
| `tk3.toolkitzone.com` | domain, `--collapse` | 440 distinct URLs (2005–2023) | `cdx-domain-collapsed.txt` |
| `tk3.toolkitzone.com/help/content/` | prefix, `--collapse` | 27 image URLs | `cdx-content-images.txt` |
| `rpgtoolkit.net/manual` | prefix, `--collapse` | 61 URLs | `../rpgtoolkit-net-manual/cdx-manual.txt` |
| `rpgtoolkit.net/tutorials` | prefix, `--collapse` | 89 URLs | `../rpgtoolkit-net-manual/cdx-tutorials.txt` |
| `rpgtoolkit.net/software` | prefix, `--collapse` | **connection refused** (retried by a peer; see §4) | — |

Fetched in this pass (all under `fixtures/archaeology/tk3-help/` unless stated):

* **Every recoverable help page**: 47 `?page=` URLs → `page*.html` (see the page map
  in §2.2). Nothing in the CDX page set is missing.
* **The application shell**: `js.js` (the TOC menu script), `styles/css.css`, the
  site root `help/` (`root.html`) and the 2005 root query variant.
* **The 2005 revision of `?page=18.4`** — a distinct, older page revision that no
  longer exists in the live TOC (`page18.4-20050726.html`). This is the single most
  valuable recovery of the pass; see §3.
* **All 27 archived help content images** (`content-imageN`, real GIF/PNG bytes —
  §2.5).
* 85 further captures of the same app **mirrored as static `.htm`** on
  `rpgtoolkit.net/manual/`, plus `rpgtoolkit.net/tutorials/*` and the
  `tk3.toolkitzone.com/dev/*` development pages (§4, §5).

**Not captured / not capturable** (honest list — details in *Gaps*):

* `?page=20` — the TOC's "plugins" page. **No capture exists in the CDX, at all**
  (queried `exact` twice, plus as part of the domain scan): `NOCAP`.
* `help/?image=N` redirect stubs (302) — superseded by the direct
  `help/content/imageN` fetch; 0–68 have stubs, only 27 have bodies.
* 116 of the 143 images the pages reference (`?image=8 … ?image=142`) were never
  crawled by the archive and cannot be recovered (§2.5).
* The `?page=17`/`?page=3` **2005** revisions — those URLs were only ever captured
  with a `PHPSESSID` query (2005), so an exact-URL 2005 fetch returns `NOCAP`.
* `help/page2.htm`, `help/?%` — 404 in the original; recorded as such.

---

## Provenance

Every factual claim in the body traces to a row below. `Captured` = the snapshot
timestamp replayed (the bytes were pulled 2026-10-11). Snapshot URL form is
`https://web.archive.org/web/<ts>id_/<original>`; the original host is
`http://tk3.toolkitzone.com:80` (or `http://rpgtoolkit.net:80`).

### Help application pages (one row per `?page=` id)

| Item | Page id | Wayback ts | Bytes | Confidence | Notes |
| --- | --- | --- | --- | --- | --- |
| `page-1.html` | `?page=-1` | 20081228144804 | 4 401 | high | renders the **full TOC** + a Login form; used as the TOC source |
| `root.html` | `help/` | 20100215003623 | 8 956 | high | help **home**: news log, intro, "3.1.0 status" legend |
| `page1.html` | `?page=1` | 20090318150834 | 20 733 | high | Beginner's Tutorial (quick-start) |
| `page2.html` | `?page=2` | 20081228132744 | 5 623 | high | Editor Guide (index) |
| `page3.html` | `?page=3` | 20081228135342 | 14 100 | high | Main file editor (+ **Plugins** tab section) |
| `page4.html` | `?page=4` | 20090226113751 | 21 236 | high | Board editor: basics, coordinates, layers, vectors, objects, lighting |
| `page4.1.html` | `?page=4.1` | 20081008233301 | 39 611 | high | Board editor: New Board screen, tabs, toolbars, menus |
| `page4.2.html` | `?page=4.2` | 20081228144700 | 33 449 | high | **Vector overview** (new in 3.1.0) |
| `page5.html` | `?page=5` | 20081228135358 | 23 231 | high | Tile editor, tilesets, tile grabber, tileset editor |
| `page6.html` | `?page=6` | 20081228135403 | 8 494 | high | Program editor |
| `page7.html` | `?page=7` | 20081228135408 | 22 202 | high | Character editor (stats, moves, graphics, equipment, levels) |
| `page8.html` | `?page=8` | 20081228135413 | 12 562 | high | Item editor |
| `page9.html` | `?page=9` | 20081228135419 | 9 891 | high | Enemy editor |
| `page10.html` | `?page=10` | 20081228135221 | 11 379 | high | Animation editor |
| `page11.html` | `?page=11` | 20081228135227 | 7 001 | high | Tile bitmap editor |
| `page12.html` | `?page=12` | 20081228135232 | 7 175 | high | Special move editor |
| `page13.html` | `?page=13` | 20081228135237 | 6 208 | high | Status effect editor |
| `page14.html` | `?page=14` | 20081228135242 | 4 843 | high | Playing your game (index) |
| `page15.html` | `?page=15` | 20081228135247 | 9 292 | high | Default systems: menu + battle system layout |
| `page16.html` | `?page=16` | 20081228135252 | 6 515 | high | Distribution: PakFile, setup, EXE, third-party file list |
| `page17.html` | `?page=17` | 20081228135258 | 6 025 | high | RPGCode index — **contains the commented-out "plugins" entry** |
| `page18.html` | `?page=18` | 20081228135305 | 6 690 | high | RPGCode — Language Features (index) |
| `page18.1.html` | `?page=18.1` | 20090101045040 | 16 214 | high | Language Features — Basics |
| `page18.2.html` | `?page=18.2` | 20090101045046 | 26 670 | high | Language Features — Program flow |
| `page18.3.html` | `?page=18.3` | 20090101045329 | 14 905 | high | Language Features — Creating functions |
| `page18.4.html` | `?page=18.4` | 20081231193703 | 7 579 | high | Language Features — Scope (current revision) |
| `page18.5.html` | `?page=18.5` | 20081231193708 | 7 897 | high | Language Features — Error handling |
| `page18.6.html` | `?page=18.6` | 20090101045050 | 10 598 | high | Language Features — Reserved variables and constants |
| `page19.html` | `?page=19` | 20090227060251 | 97 235 | high | **RPGCode Function Reference** — 262 documented functions |
| `page21.html` | `?page=21` | 20081228135315 | 5 356 | high | Object Oriented Coding (index) |
| `page21_1…21_6.html` | `?page=21_1…21_6` | 2007-12-09 … 2009-01-01 | 7 035–8 697 | high | OOP: Old vs New, Methods and Using, Overloading Operators, Returning References, Copy Constructors, Polymorphism |
| `page22.html` | `?page=22` | 20081228135320 | 5 072 | high | Troubleshooting (index) |
| `page23.html` | `?page=23` | 20090426235028 | 15 865 | high | FAQ (incl. "Open Source and Development") |
| `page25.html` | `?page=25` | 20090318212331 | 12 459 | high | Technical issues |
| `page26.html` | `?page=26` | 20081228135325 | 5 151 | high | System requirements |
| `page28.html` | `?page=28` | 20081228135332 | 5 270 | high | About the Toolkit (+ author credits) |
| `page29.html` | `?page=29` | 20081228135338 | 55 086 | high | Version history (3.0.0–3.0.6 bug lists) |
| `page30.html` | `?page=30` | 20100419071005 | 5 108 | high | Links (ToolkitZone, MysticSoftware) |
| `page31.html` | `?page=31` | 20091112114153 | 25 313 | high | **RPGToolkit 3.1.0 Changelog** (+ "Plugins and callbacks", credits, licence) |
| `pageed_environment.html` | `?page=ed_environment` | 20081228135442 | 14 450 | high | Editor environment |
| `pageed_background.html` | `?page=ed_background` | 20081228135436 | 5 719 | high | Background (battle) editor |
| `pagefile_report.html` | `?page=file_report` | 20081228144819 | 7 932 | high | "Filing an RPGCode Bug Report" |
| `pagesearch.html` | `?page=search` | 20090428220635 | 4 994 | high | Search box |

### Help application shell, older revision, images, and the dev section

| Item | Wayback snapshot URL | Captured ts | Confidence | Notes |
| --- | --- | --- | --- | --- |
| `js.js` | `…id_/http://tk3.toolkitzone.com:80/help/js.js` | 20070313150451 | high | `// All contents copyright 2005, Colin James Fitzpatrick.` Reveals the five top menus: `editor`, `engine`, `rpgcode`, `troubleshooting`, `about` (+ hidden `rpgcode_oop`, `rpgcode_features`) |
| `styles/css.css` | `…/help/styles/css.css` | 20051224230215 | medium | styling only |
| `root-query` (`help/?&`) | `…/help/?&` | — | — | **Not captured** (no exact capture without `PHPSESSID`) |
| **`page18.4-20050726.html`** | `…/help/?page=18.4` @ 20050726075259 | 20050726075259 | high | **2005 "Advanced Features" revision with the Plugins section** |
| `content-image{0,1,2,5,6,7,9,10,13,22,23,26,38,40,42,43,46,50,51,54,55,56,57,58,59,60,61}` | `…/help/content/imageN` | 2007–2008 | high | 27 real images; server sent `text/plain` but the bytes are GIF/PNG (§2.5) |
| `dev/dev-{index,code,dev,gen,join_dev,licence_main,submit_patch,test,admin,gpl,acol,acold}.html` | `…/dev/?page=…` | 2009–2010 | high | project/development pages incl. coding guidelines and licensing (§5) |

### `rpgtoolkit.net` mirror, tutorials, and related reports

| Item | Wayback snapshot URL | Captured ts | Confidence | Notes |
| --- | --- | --- | --- | --- |
| `../rpgtoolkit-net-manual/manual-index.htm.html` | `…/rpgtoolkit.net/manual/index.htm` | 20151021020237 | high | nav links identical to the help app's `?page=` ids |
| `../rpgtoolkit-net-manual/pages/*.htm` (32 pages) | `…/rpgtoolkit.net/manual/page*.htm` | 2015–2016 | high | same TK3 3.1.0 manual, static mirror (§4.1) |
| `../rpgtoolkit-net-manual/manual-index.html` | `…/rpgtoolkit.net/manual/` | 20160530180204 | high | directory index |
| `../rpgtoolkit-net-manual/manual-js.js` | `…/rpgtoolkit.net/manual/js.js` | 20130420032447 | high | the same TOC script |
| `../rpgtoolkit-net-tutorials/*.html` (14) | `…/rpgtoolkit.net/tutorials/*` | 2011–2016 | high | community tutorials (§4.2) |
| `findings/01-rpgtoolkit-net.md` | — | 2026-10-11 | high | peer pass over `rpgtoolkit.net` (manual page map, function-reference JSON, `/software/manual/` 302) |
| `findings/03-toolkitzone.md` | — | 2026-10-11 | high | peer pass over `toolkitzone.com` file archive |
| `findings/05-toolkitzone-library.md` | — | 2026-10-11 | high | peer pass over the TKZ library articles (`library.php?doc=N`) |
| `findings/06-plugin-sdk.md` | — | 2026-10-11 | high | **the recovered C++ plugin SDK** (`fileman/files/861.zip`, 49 728 b) defining the plugin interface |

---

## 1. What the help application is

A small server-rendered PHP help site, not a static manual. Evidence:

* Every page is served from `/help/?page=<id>` — a single PHP script switching on a
  `page` parameter; a session cookie `PHPSESSID` appears in nearly every 2005–2006
  capture of the URLs (`?page=1&PHPSESSID=…`), and the 2005 captures only exist with
  it.
* `?page=-1` renders a **login form**: *"Please enter your password below to obtain
  editing capabilities"* — `[INFERENCE]` the help content was editable in-browser by
  privileged users (an admin/wiki hybrid).
* The page footer carries `[ search, administrative, valid xhtml, valid css ]`
  (an admin link) and the header `tk3 ( home, dev, source, bugs, help )` linking to
  the other site sections (`/dev` development, `/source` phpCVSview of the source,
  `/bugs` a bug tracker).
* A site-wide JS TOC (`js.js`) drives hover menus named `showMenu('editor'|'engine'|
  'rpgcode'|'troubleshooting'|'about'|'rpgcode_oop'|'rpgcode_features')`.
* Content is authored in-house by the 3.1.0 team and credited on `?page=28`
  (see §2.4). `?page=19` is described on the changelog page as "the RPGCode function
  reference http://tk3.toolkitzone.com/help/?page=19".

By 2019–2023 the host had become an unrelated home-repair site on nginx
(`carpeting.htm`, `decking.htm`, …; `favicon.ico` 404) — useful only to explain why
some later CDX rows are junk.

---

## 2. The table of contents, page map and the version it documents

### 2.1 Table of contents (verbatim, from the nav on `?page=-1` / `?page=1`)

```
tk3 ( home, dev, source, bugs, help )
  home | quick-start |
  editor |
      editor environment
      main file editor
      board editor
      tile editor
      program editor
      character editor
      item editor
      enemy editor
      animation editor
      tile bitmap editor
      special move editor
      status effect editor
      background editor
  playing |
      default systems
      distribution
  rpgcode |
      language features
      function reference
      object oriented coding
  troubleshooting |
      faq
      technical issues
      system requirements
  about |
      history
      links
      3.1.0 changelog
```

The RPGCode sub-menu on `?page=17` expands further (`language features` →
basics / program flow / creating functions / scope / error handling / reserved
variables and constants; `object oriented coding` → old vs. new / methods and using
/ overloading operators / returning references / copy constructors / polymorphism).

### 2.2 Page-id map (id → topic, as captured)

| id | topic | id | topic |
| --- | --- | --- | --- |
| `1` | Beginner's Tutorial (quick-start) | `18.1` | Language features — Basics |
| `2` | Editor Guide (index) | `18.2` | Language features — Program flow |
| `3` | Main file editor | `18.3` | Language features — Creating functions |
| `4` | Board editor | `18.4` | Language features — Scope |
| `4.1` | Board editor (New Board screen, tabs, toolbars, menus) | `18.5` | Language features — Error handling |
| `4.2` | **Vector overview** (new in 3.1.0) | `18.6` | Language features — Reserved variables and constants |
| `5` | Tile editor / tilesets / tile grabber / tileset editor | `19` | **RPGCode Function Reference** (262 functions) |
| `6` | Program editor | `21` | Object Oriented Coding (index) |
| `7` | Character editor | `21_1…21_6` | OOP: old vs new / methods / operator overloading / references / copy ctors / polymorphism |
| `8` | Item editor | `22` | Troubleshooting (index) |
| `9` | Enemy editor | `23` | FAQ |
| `10` | Animation editor | `25` | Technical issues |
| `11` | Tile bitmap editor | `26` | System requirements |
| `12` | Special move editor | `28` | About the Toolkit |
| `13` | Status effect editor | `29` | Version history |
| `14` | Playing your game (index) | `30` | Links |
| `15` | Default systems (menu + battle) | `31` | 3.1.0 changelog |
| `16` | Distribution | `ed_environment` | Editor environment |
| `17` | RPGCode (index) | `ed_background` | Background editor |
| `18` | RPGCode — Language Features (index) | `file_report` | Filing an RPGCode bug report |
| | | `search` | Search box |

`page20`, `page24`, `page27` **do not exist in the archive and are not reachable
from any captured page** (`page20` is referenced only from a commented-out TOC
line — §3.1).

### 2.3 Documented version: **Toolkit 3.1.0** (with 3.0.x history)

Three independent signals:

1. The nav's last "about" item is literally `3.1.0 changelog` (`?page=31`), and
   `?page=31` says verbatim:
   > **RPGToolkit 3.1.0 Changelog** — *This document details the changes and new
   > features in RPGToolkit version 3.1.0 from version 3.0.6. Also refer to the
   > updated help files at http://tk3.toolkitzone.com/help/ and the RPGCode function
   > reference http://tk3.toolkitzone.com/help/?page=19*
2. The help **home** (`help/`) news log dates the 3.1.0 rewrite of the manual:
   > `2007-08-18 Started updating to version 3.1.0: quick start, minor editors (Delano)`
   > `2007-08-19 Added rewritten RPGCode language feature pages. (OC)`
   > `2007-08-22 Updated board editor/added vector tutorial. (Delano)`
   > `2007-09-06 Updated function reference, added changelog (Delano)`
   and carries the legend *"3.1.0 status: * = updated, ** = rewritten, *** = new
   page."* Marked: quick-start `**`, editor environment `*`, main file editor `*`,
   board editor `**`, character editor `*`, item editor `*`, animation editor `*`,
   scripting in rpgcode `*`, language features `**`, function reference `**`,
   **vector overview `***`**, **3.1.0 changelog `***`**.
3. `?page=18` states the language section "has been completely rewritten" for 3.1.0,
   signed *"— Samuel Bedwell (Occasionally_Correct)"*.

The **version history** page (`?page=29`) still carries the older 3.0.x history text
(3.0.0 May 2003 → 3.0.6 April 2005) plus the full 3.0.6 editor/engine fix lists, and
several pages still say "(3.0.6)" — the visible docs are a 3.1.0 layer over a 3.0.x
body.

### 2.4 Coverage and authorship

The manual covers, by section:

* **Editor (13 editors)** — environment, main file, board, tile, program, character,
  item, enemy, animation, tile bitmap, special move, status effect, background; with
  board-editor sub-pages for the New Board screen and the vector overview.
* **Engine/playing** — the default **menu system** (Items/Equip/Abilities/Save/Load/
  Quit) and **battle system** (charge bars, screen zones A/B/C, Fight/Special
  Move/Items/Run), plus **distribution** (PakFile `.tpk`, native setup ZIP,
  standalone `.exe`, third-party packaging).
* **RPGCode** — a 6-page language primer, the 262-function reference, and a 6-page
  OOP reference.
* **Troubleshooting** — FAQ, technical issues, system requirements.
* **About** — history, links, changelog.

`?page=28` credits the authors verbatim:

> This user guide written by:
> Jonathan Hughes (Delano) — Editor Guides, Quick Start Guide, Vector Tutorial
> Colin James Fitzpatrick — Engine Guides, and OOP Reference
> Samuel Bedwell (Occasionally_Correct) — RPGCode Features

`?page=16` (distribution) enumerates the runtime file set a shipped game needs:
`\Main\Main.gam`, `\Game\YourGame`, `trans3.exe`, `actkrt3.dll`, `audiere.dll`,
`freeimage.dll`.

`?page=4.2` (vector overview, new in 3.1.0) adds engine semantics not stated
anywhere else, e.g. bounding-box pre-testing for intersections, the open/closed
vector rules, and:

> Board programs are launched when the player's collision base intersects the
> programs' vectors, not when its activation base intersects (**the player's
> activation base is presently unused**).

### 2.5 Images

The help pages reference screenshots/icons as `?image=N` (which redirects to
`help/content/imageN`). The server served them with `Content-Type: text/plain`,
which is why they look like "text" in the CDX; the bytes are ordinary images:

* **Captured (all 27 archived)**: ids `0,1,2,5,6,7,9,10,13,22,23,26,38,40,42,43,46,
  50,51,54,55,56,57,58,59,60,61`. The 25×25 ones are editor toolbar icons (GIF/PNG);
  the large ones are screenshots, e.g. `image38` 640×470 PNG (202 687 b), `image50`
  600×431 GIF (32 578 b), `image51` 34 240 b.
* **Not archived**: 116 of the 143 ids the pages reference (8, 12, 14–21, 24–25,
  27–37, 39, 41, 44–45, 47–49, 52–53, 62–142). The entire **vector overview**
  illustration set (`?image=113…142`) and most board/tile-editor screenshots are
  gone. Not chased further, per the brief.

---

## 3. Plugin authoring / API documentation — the explicit answer

**Short answer.** The live help application does **not** document how to write a
plugin: it has no plugin page, no plugin API, and no stock-plugin internals. It only
(a) tells you the Plugin tab *exists*, (b) names the stock plugins, (c) mentions
"TK Plugin SDKs" and links to download them, and (d) lists a handful of **callback
names** in the changelog. The plugin *interface documentation* is the SDK itself,
which a peer recovered separately (`findings/06-plugin-sdk.md`). One **older
revision** of the manual (`?page=18.4`, 2005) did carry a short prose "Plugins"
section — recovered here at
`fixtures/archaeology/tk3-help/page18.4-20050726.html`.

All findings below are verbatim from the captures.

### 3.1 The live TOC reserves a "plugins" page and comments it out

`?page=17` (RPGCode index) contains, in the page's own HTML:

```html
<li><a href="?page=19">function reference</a></li>
<!-- <li><a href="?page=20">plugins</a></li> -->
<li>
    <a href="?page=21">object oriented coding</a>
```

So `?page=20` was planned, titled **plugins**, and **disabled in the live page** —
and `?page=20` was **never archived** (`NOCAP`, twice). Page ids `20`, `24`, `27`
are absent from every capture of the domain. *[INFERENCE]* the plugin reference was
pulled/never finished and the TOC entry was hidden rather than deleted.

### 3.2 Every cross-reference to "plugin documentation" points at a page that no

longer holds it. Both the main-file-editor page and the FAQ link the word
"plugins" to `?page=18.4#adv.e`:

* `?page=3`: `If you have downloaded (or even written!) a plugin, it must be added
  here… For more information on Plugins, click <a href="?page=18.4#adv.e">here</a>.`
* `?page=23`: `Technically it is possible through <a href="?page=18.4#adv.e">plugins</a>,
  but it has not yet been achieved.`

In the current `?page=18.4` that anchor does not exist (the page is now "Scope");
`#adv.e` is a leftover from the **2005** revision where `?page=18.4` was
**"Language Features — Advanced Features"** and carried anchor names
`adv`, `adv.a … adv.f` — `adv.e` = **Plugins**.

### 3.3 The 2005 `?page=18.4` — a real (short) Plugins section, recovered

`?page=18.4` at snapshot `20050726075259` (`page18.4-20050726.html`) has the
heading `Advanced Features` with sub-items *Implicit Includes, Scope, Arrays and
Maps, Commands as Parameters, **Plugins**, Error Handling*. The Plugins text,
verbatim:

> **Plugins:** You can create your own RPGCode commands that are embedded into the
> toolkit, instead of creating methods, with the use of plugins. You can write
> plugins for the RPGToolkit with any programming language that supports COM, but
> the dominating programming language to write plugins for the Toolkit in is C++.
> To create plugins, you need to download the plugin SDK (Software Development
> Kit). At the time of this writing, there are two TK3 plugin SDK's; a C++ SDK, and
> a VB SDK. To add a plugin into your game, simply click the project editor and
> select the plugins tab. From here you will be able to add and remove plugins.
> Once you have added the plugin to the main file, you can use the commands that you
> have implemented into the Toolkit.
>
> **Plugin SDK Downloads**
> — Microsoft Visual C++ SDK — `http://toolkitzone.com/fileman.php?id=3&file=861`
> — Microsoft Visual Basic 6 SDK — `http://toolkitzone.com/fileman.php?id=3&file=819`

That is the *entire* plugin-authoring content that ever lived in the manual: the
**model** (COM component supplying extra RPGCode commands), the **tooling** (C++ and
VB SDKs), and **installation** (the Plugins tab). It is a pointer to the SDKs, not
the SDK. The two `fileman.php` detail pages are archived (2004–2006), and a peer
recovered the C++ SDK payload itself (`fileman/files/861.zip`,
"**COM Plugin SDK (C++), version 2.0**") — see `findings/06-plugin-sdk.md`, which
transcribes its 98 callback declarations and 251 engine information codes.

### 3.4 What the current manual *does* say about plugins

* `?page=3` (Main file editor → **Plugins**):
  > `Built-In Fighting System — The Toolkit comes with a default battle system (the
  > "tk3fight.dll" plugin in the Game\Plugins folder and set in the Plugin tab — see
  > below), but many people write their own or download them, either in RPGCode or
  > using the TK Plugin SDKs. If you have an RPGCode battle system you can specify it
  > here.`

  > `Plugins — If you have downloaded (or even written!) a plugin, it must be added
  > here before it can be used. Plugins go in the Game\Plugins folder; a short
  > description of the plugin appears when one is added. Additionally, you can
  > specify plugins to be used in place of the default menu and fight plugins.`
* `?page=15` (Default systems):
  > *While the RPGToolkit allows you to create your own systems via RPGCode, or an
  > external language, this may not be appropriate for all situations…*
* `?page=19` (Function reference): `internalMenu` is documented as
  > *Show a menu using the menu plugin. 0 - main menu*
  and `openFile…` carries the aside *"…when plugins no longer display a silly
  warning box…"*.
* `?page=17` → `?page=21` (OOP) is the closest the manual gets to "extend RPGCode":
  it is about writing your own **classes/methods in RPGCode**, explicitly pitched as
  the alternative to plugins (`?page=18.4` 2005: *"instead of creating methods, with
  the use of plugins"*).

### 3.5 Plugin callbacks named in the changelog (`?page=31`)

The 3.1.0 changelog has a section **"Plugins and callbacks"**:

> CBGetPlayerNum(PLAYER_DIR_FACING, ...), CBSetPlayerNum(...). The values assigned to
> each direction have changed to the following values, which correspond to the new
> RPGCode constants associated with the PlayerDirection() and ItemDirection()
> functions: East tkDIR_E 1 / Southeast tkDIR_SE 2 / South tkDIR_S 3 / … / Northeast
> tkDIR_NW 8
> CBGetGeneralString(GEN_PLYROTHERHANDLES, GEN_PLYROTHERFILES),
> CBSetGeneralString(sim.). No mechanism currently exists to restore removed players,
> so these variables are not stored.

and the credits confirm the subsystem's owner:

> Colin Fitzpatrick: RPGCode subsystem (including threaded RPGCode), most file
> readers, most RPGCode functions, **plugin subsystem, most plugin callbacks**, battle
> system subsystem, RPGCode update wizard, various trivial things

and licensing:

> Licensing — The RPGToolkit version 3.1.0 is licensed under the GNU General Public
> License (GPL) v3. This includes the engine trans3.exe, the editor toolkit3.exe, and
> the graphics library actkrt3.dll.

(For G6 context: `dev/?page=licence_main` states *"The RPGToolkit Version 3.1 (3.1.0)
is licensed under the GNU General Public Licence (GPL). The RPGToolkit Version 3.0
(3.0.2-3.0.6) is licensed under the AC Open Licence. Works derived or incorporating
content from the RPGToolkit 3.0 and some plugin SDKs fall under the AC Open Licence
Derivative."* — note the SDKs are treated separately from the GPL code.)

### 3.6 Why it leaves a hole in the docs

`?page=19` (the function reference) offers unknown calls to plugins but does not
describe the mechanism; `?page=23` FAQ only says plugin support "has not yet been
achieved" for MMO. There is **no help-app page that lists the plugin API, the
menu/battle plugin contract, or the DLL exports.** That material is (i) the SDKs
(peer-recovered, `findings/06-plugin-sdk.md`) and (ii) the shipped plugins
`tk3menu.dll` / `tk3fight.dll`. `docs/format-spec.md` §12 ("Plugins (binary, not
portable)") therefore needs correcting: plugins are **COM components** (any COM
language, with C++/VB SDKs), not merely "native Windows libraries of three kinds",
and their interfaces are documented in the recovered SDK.

---

## 4. `rpgtoolkit.net` — manual mirror, tutorials, software

A peer pass covers this domain in depth (`findings/01-rpgtoolkit-net.md`); this
section records what this pass captured and confirms the identity of the material.

### 4.1 `rpgtoolkit.net/manual/*` — the **same TK3 3.1.0 manual**, mirrored

Captured the index (`manual/index.htm`, `manual/`), the TOC script
(`manual/js.js`), and **32 pages** under `fixtures/archaeology/rpgtoolkit-net-manual/pages/`.

* **Version: Toolkit 3 — 3.1.0.** Identical page ids and titles to the
  `tk3.toolkitzone.com/help/` app (e.g. `page9` = "Editor Guide — Enemy Editor",
  `page4.2` = "editor guide — vector overview", `page31` = "RPGToolkit 3.1.0
  Changelog"); the index nav links the same `page*.htm` set including
  `pagesearch.htm`.
* **It is not a different document.** The markup, headings, screenshots
  (`images/imageN`) and prose match the live help app page-for-page; it is the
  official manual rehosted statically on the community site, with the nav's
  `/dev`, `/source`, `/bugs` links left dangling (they belong to the toolkit
  project site).
* **Same holes.** No `page20`, no `page24`, no `page27`; the mirror's `pagesearch.htm`
  is the only 404 (`?page=search` *does* exist in the help app); it lacks the
  `18.1/18.2/18.4/18.5/18.6`, `21_*` and `pagefile_report` sub-pages *as separate
  files* (the help app's `?page=` variants cover them — captured in §2.2).

Per-page topics recovered (all 3.1.0, all "Toolkit 3" — none are Toolkit 2; the
Toolkit 2 help lives at `rpgtoolkit.com/docs/ver2/`, out of scope here):
quick-start `page1`; editor index `page2`; main-file `page3`; board `page4`;
vector overview `page4.2`; tile `page5`; program `page6`; character `page7`; item
`page8`; enemy `page9`; animation `page10`; tile-bitmap `page11`; special-move
`page12`; status-effect `page13`; `pageed_environment`, `pageed_background`;
playing `page14`; default systems `page15`; distribution `page16`; RPGCode
`page17`; language features `page18`; creating functions `page18.3`; **function
reference `page19`**; OOP `page21`; troubleshooting `page22`, FAQ `page23`,
technical `page25`, system requirements `page26`; about `page28`, history `page29`,
links `page30`, changelog `page31`.

### 4.2 `rpgtoolkit.net/tutorials/*` — community tutorials (not the manual)

Captured 14 index/content pages under
`fixtures/archaeology/rpgtoolkit-net-tutorials/`. These are **community-written**,
not 3.1.0 team docs, and mostly about authoring technique; the coding ones are the
relevant ones for the rebuild:

| Tutorial | Bytes | Relevance |
| --- | --- | --- |
| `coding/marzs-rpg-code-tutorial` | 213 656 | large RPGCode tutorial |
| `coding/creating-a-turn-based-battle-system` | 147 077 | custom (RPGCode) battle system |
| `coding/class-and-object-reference` | 76 653 | RPGCode OOP reference |
| `coding/understanding-canvases` | 13 582 | off-screen canvas API |
| `editor/marzs-how-to-guides` | 27 683 | editor how-tos |
| `audio/creating-a-catchy-tune`, `graphics/*`, `other/*` | — | asset/authoring technique |

The many `…/like/`, `…/like/who/`, `…/tags/…`, `…/achievements/` URLs in the CDX are
social-widget/tag shells, not content, and were not fetched.

### 4.3 `rpgtoolkit.net/software/*` — version pages and the manual pointer

`rpgtoolkit.net/software` returns **1 CDX row** and that row was not retrievable in
this pass (connection refused); the peer pass resolved it
(`findings/01-rpgtoolkit-net.md` §3.4): `/software/manual/` is a single **302**
capture (2011-03-01) redirecting to `/manual/`; `/software/` and
`/software/download/` are 2011-02 captures; and the only `www.`-host capture under
`/software` is `www.rpgtoolkit.net/downloads.html` (2005). No `software/` page
points at a *different* host for the manual beyond that redirect — the manual
mirror is the same `rpgtoolkit.net/manual/*`. The `tk3.toolkitzone.com` help app and
the `rpgtoolkit.net/manual` mirror are the two renderings of the one 3.1.0 manual.

---

## 5. The `tk3.toolkitzone.com/dev/` section (also captured)

Not the manual, but the same host's development pages, captured for completeness:

* `dev/` — "Development" hub: principles, join-as-developer/tester.
* `dev/?page=code` — **Coding Guidelines** (VB6 + C++ style rules, tabs, `extern "C"`,
  naming, `GoTo`/`GoSub` bans). Guidance aimed at *their* source tree; a docs file,
  not source.
* `dev/?page=gen` — general development principles (proposal/vote process).
* `dev/?page=licence_main`, `page=gpl`, `page=acol`, `page=acold` — **licensing**:
  3.1.0 GPL; 3.0.2–3.0.6 AC Open Licence; derivatives/SDKs AC Open Licence
  Derivative; the GPL text plus the **game-EXE exception**.
* `dev/?page=submit_patch`, `page=join_dev`, `page=join_test`, `page=test`,
  `page=admin`, `page=dev` — process pages (patch submission, joining, testing).

Relevant to G6 (licence hygiene): confirmed here that the 3.1.0 engine/editor and
the graphics library are **GPL v3**, that 3.0.x was under the AC Open Licence, and
that the plugin SDKs are treated under a separate AC Open Licence Derivative — i.e.
the *documentation and the SDK interface facts* are recoverable, but no GPL code may
be copied.

---

## 6. `docs/` coverage gap list (compared against the rebuilt repo's `docs/`)

The point of the exercise: what do the recovered 3.1.0 docs cover that
`docs/format-spec.md`, `docs/engine-features.md` and `docs/editor-features.md` do
**not**? (Read the three docs to compare.) Each item names the recovered source.

**Gap 1 — Per-function reference (biggest gap).** `?page=19` documents **262
functions** each with its **overload signatures, parameter types, by-reference
outputs, valid flag constants and a description** — e.g.
`void playerPath( variant handle, int flags | tkMV_WAYPOINT_PATH, variant boardpath,
int cycles)` with the note *"Set cycles = 0 to walk infinitely"*. The repo's
`format-spec.md` §9.11 is a **name-only catalogue** ("~280 names"); it has no
signatures, defaults, or per-function flag semantics. Source: `?page=19`
(`page19.html`); peer-extracted machine-readable form in
`fixtures/archaeology/rpgtoolkit-net/manual/function-reference.json`.

**Gap 2 — Editor UI inventory per editor.** The help gives, for every editor, its
**tabs, toolbars, tool groups, menus and dialogs button-by-button** (e.g. board
editor: *New Board screen, Board Tab, Left-hand Toolbar, Right-hand Toolbar,
Properties Tab, Menus*, with shortcut labels `Vectors (Alt+V)`, `Programs (Alt+P)`,
`Sprites (Alt+S)`, `Images (Alt+I)`, `Lighting (Alt+L)`; tile editor menus
*File/Edit/Image/Draw/Effects*; editor-environment menus
*File/Toolkit/Build/Window/Help*). `editor-features.md` is feature-level only
(T-01…T-82) and never lists the actual chrome. Source: `?page=4.1`, `?page=5`,
`?pageed_environment`, `?page=3`.

**Gap 3 — Stock menu & battle *screen layout and navigation*.** `?page=15` describes
the actual default menu screens (main stat panel with portraits; Items =
Use/Info/Drop/Return/Back; Equip = Equip/Remove/Back; Abilities = Use/Info/Back;
Save/Load/Quit) and the battle screen layout (zone **A** party, **B** enemies,
**C** charge-bar stats; actions Fight / Special Move / Items / Run) with the note
*"Enemies also have charge bars, though you cannot see them"*. `engine-features.md`
§7–§8 gives the **rules** (E-70…E-87) but not the stock presentation/flow. Source:
`?page=15`.

**Gap 4 — Distribution runtime file set / third-party packaging.** `?page=16` lists the
exact files a shippable game needs (`\Main\Main.gam`, `\Game\YourGame`, `trans3.exe`,
`actkrt3.dll`, `audiere.dll`, `freeimage.dll`) and the three packaging routes.
`format-spec.md` §13 and `editor-features.md` T-70…T-74 cover the *formats/tools* but
not the **runtime dependency list**. Source: `?page=16`.

**Gap 5 — Legacy platform / system requirements.** `?page=26`: Windows 95/98/98SE/ME/
2000/XP, DirectX 8.0+, 32 MB RAM, ~30 MB disk, Windows Media Player 7–9; recommended
Win 2000/XP, 700 MHz, 128 MB RAM, 16 MB VRAM. Not stated in any `docs/` file. Source:
`?page=26`.

**Gap 6 — Historical-known-issues / errata catalogue.** `?page=22/23/25` + the
changelog's "Known issues" give failure modes a rebuild must handle: Windows 9x GDI
rendering bugs ("fuzzy/coloured squares", transparency glitches, horizontal lines);
"Use Recursive Flood" needed for flood fill / >100×100 boards; `MSVBVM60.DLL`/VB
runtimes; "switching out of a full-screen game (Alt-Tab) will cause the game to
crash"; `prompt()` does not accept `"("`; `#global` unimplemented;
`CallPlayerSwap()` unimplemented; *"Pathfinding is not infallible. Sprites will get
stuck in complex and busy environments."* `format-spec.md` §14 lists format
ambiguities but there is no **behavioural errata** list. Source: `?page=23`,
`?page=25`, `?page=31`, `?page=29`.

**Gap 7 — Full 3.1.0 changelog: the deprecated/renamed function map and signature
changes.** `?page=31` enumerates the **obsolete** list (`Sound()`, `Win()`, `GoDos()`,
`WalkSpeed()`, `ItemWalkSpeed()`, `CharacterSpeed()`, `BorderColor()`, `UnderArrow()`,
`FightStyle()`, `BattleSpeed()`, `TextSpeed()`, `MwinSize()`, `Stance()`,
`StaticText()`, `Parallax()`, `AnimatedTiles()`, `SmartStep()`, `Autocommand()`,
`SetConstants()`, `ShopColors()`, `IIf()`), the **alterations to existing
functions** (new optional flags/params for `ViewBrd`, `PlayerStep`, `ItemStep`,
`Push`, `PushItem`, `DirSav`, `ClearButtons`, `PlayerStance`, `ItemStance`,
`EraseItem`, `DestroyItem`, `ItemLocation`) and the new 3.1.0 functions. The repo's
`format-spec.md` §9.9/§9.11 mention some legacy aliases but not this mapping.
Source: `?page=31`.

**Gap 8 — Release history 3.0.0–3.0.6.** `?page=29` carries the per-release fix lists
for both `trans3` and `toolkit3` (e.g. "Threads almost completely broken",
"Day/Night system partially dysfunctional — removed", "PushItem(), ItemStep() always
moves the zeroth item"). Useful for triage; absent from `docs/`. Source: `?page=29`.

**Gap 9 — Plugin interface facts.** `docs/format-spec.md` §12 says only "native Windows
libraries (`Plugin/*.dll`) of three kinds … cannot be loaded". The recovered docs add:
plugins are **COM components** usable from any COM language (C++/VB SDKs); the store
is `Game\Plugins`; the main file's Plugin tab selects menu/fight replacements; stock
= `tk3fight.dll` + a menu plugin; and 3.1.0 exposes **plugin callbacks**
(`CBGetPlayerNum`, `CBSetPlayerNum`, `CBGetGeneralString`/`CBSetGeneralString` with
`GEN_*` codes). The full contract is the recovered SDK
(`findings/06-plugin-sdk.md`: `pluginSDK.idl`, `Initiate()`/`Terminate()`,
`showMenu(int)`, `runFight(FIGHT_STRUCT)`, 98 callbacks, 251 info codes). Source:
`?page=3`, `?page=23`, `?page=31`, and `page18.4-20050726.html`.

**Gap 10 — Licensing / commercial terms.** `?page=31` + `dev/?page=licence_main` +
`dev/?page=gpl`: 3.1.0 = GPL v3 (engine, editor, `actkrt3.dll`); 3.0.2–3.0.6 = AC Open
Licence; SDKs = AC Open Licence Derivative; the **game-EXE exception**; the
"you may sell 3.0.x games but must credit the Toolkit" answer. Not in any `docs/`
file (and directly relevant to the G6 licence gate). Source: `?page=31`,
`dev/?page=licence_main`, `dev/?page=gpl`, `?page=23`.

**Gap 11 — Vector authoring/optimisation semantics.** `?page=4.2` adds authoring
guidance and engine detail beyond `format-spec.md` §4/§5 and
`engine-features.md` E-26: bounding-box pre-test cost vs. vector size guidance,
open-vs-closed rules, and that *"the player's activation base is presently unused"*
while a sprite's program fires on the player's **collision** base intersecting the
sprite's **activation** base. Source: `?page=4.2`.

**Gap 12 — Numeric menu ids / legacy aliases used by the stock UI.** `?page=19`
documents `internalMenu(n)` (`0 - main menu`) and the legacy alias set; the repo docs
name `internalMenu(n)` but not the id map. Source: `?page=19`.

**Gap 13 — Onboarding tutorial.** `?page=1` is a step-by-step "build a game" walkthrough
with concrete filenames/programs (`start.brd`, `start.tem`, `start.prg`,
`man_s.anm`, `hello.prg`, `npc.itm`). `editor-features.md` T-09 only mentions that a
9-step tutorial existed. Source: `?page=1`, `?page=30`.

*(Minor/no-gap: the editor/menu/engine feature *behaviour* is well covered by the
existing `docs/`; the gaps above are where the recovered docs are the only source or
where they correct the existing text. Two corrections to make now: `format-spec.md`
§12 (plugin model, see G9) and a note in `format-spec.md` §9.11 pointing at the
recovered per-function reference (G1).)*

---

## Gaps / not recovered

**1. Pages that never existed or were never captured**

| Wanted | Exact CDX query used | Result |
| --- | --- | --- |
| `?page=20` ("plugins", TOC entry commented out) | `wb.py cdx "http://tk3.toolkitzone.com/help/?page=20" --match exact` | `NOCAP` — no capture in the CDX at all (also absent from the 440-row domain scan) |
| `?page=24`, `?page=27` | domain scan `tk3.toolkitzone.com --match domain --collapse` | not present (never linked from any captured page) |
| `?page=17` / `?page=3` **2005** revisions | `wb.py cdx "…/help/?page=17" --match exact` | only `…?page=17&PHPSESSID=…` was captured in 2005, so an exact 2005 fetch is `NOCAP`; the 2005-era TOC could not be reconstructed page-by-page (only `?page=18.4` had a session-free 2005 capture) |
| `help/?&` (root, non-`page`) | `wb.py cdx "http://tk3.toolkitzone.com/help/?&" --match exact` | `NOCAP` — only `help/?&PHPSESSID=…` variants exist |
| `help/page2.htm` | domain scan | 404 in the original (captured as 404) |

**2. Deliberately not harvested (G7)**

`/source/` on `tk3.toolkitzone.com` is a **phpCVSview of the CVS repository**
(160 URLs under `source/`, e.g. `source/?mp=/vc/trans3/plugins/`,
`source/?mp=/build/help/`, `source/?mp=/build/readme.txt`). It is the legacy source
tree, so it was **not** opened or fetched — including the `build/help/` and
`build/readme.txt` members inside it (which would have to be treated as source-tree
extraction under G7). Noted here so another task can decide deliberately; the
`source/` nav link is present on every help page but was not followed.

**3. Images**

116 of the 143 images the help pages reference were never crawled
(`?image=8,12,14–21,24–25,27–37,39,41,44–45,47–49,52–53,62–142`). The whole vector
overview illustration set (113–142) is missing. Only the 27 archived ones were kept,
per the brief.

**4. Wayback reliability**

`web.archive.org` intermittently refused TCP connections to this egress IP all
session (`ECONNREFUSED`), including on CDX queries — hence the paced `grab.py`
driver (`GRAB_SPACING`, `GRAB_TRIES`) and the retries. Every fetch that ultimately
failed is listed above; nothing was silently skipped (`grab.py` prints `NOCAP`/`FAIL`
and the manifests live beside the files as `*.json` sidecars).

**5. Related domains out of this task's scope**

`rpgtoolkit.com/docs/ver2/*` (the **Toolkit 2** help) and `toolkitzone.com/library.php`
articles (`?doc=88` plugins/MMO, `?doc=104` installer workarounds, `?doc=158` C++
guide for plugin authors) are covered by the sibling reports
(`findings/01-rpgtoolkit-net.md`, `findings/05-toolkitzone-library.md`,
`findings/06-plugin-sdk.md`).

**6. Local cache (git-ignored)**

* `fixtures/archaeology/tk3-help/` — 47 `page*.html` (one per captured `?page=` id)
  + `.json` sidecars, plus `page18.4-20050726.html`, `js.js`, `root.html`,
  27 `content-imageN`, `cdx-*.txt`, `flat/` text mirrors, `downloads/`.
* `fixtures/archaeology/rpgtoolkit-net-manual/` — `manual-index*.html`, `manual-js.js`,
  `pages/*.htm` (32), CDX lists.
* `fixtures/archaeology/rpgtoolkit-net-tutorials/` — 14 tutorial pages.
* `fixtures/archaeology/dev/` — 12 `dev-*.html` pages.
* Helpers added: `fixtures/archaeology/flat.py`, `fetchpages.sh`, `grab.py`,
  `targets.txt`.
