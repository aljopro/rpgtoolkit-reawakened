# Official RPG Toolkit 3 distribution + rpgtoolkit.com documentation (Internet Archive recovery)

Recovered 2026-10-11 for the clean-room rebuild. Everything below was read off the public
Wayback Machine. **Guard-rail G7 was honoured throughout**: the legacy GPL source tree
(`../rpgtoolkit`) was never opened, and the recovered archives contain no source files at
all (the 3.2.1 zip has zero `*.bas/*.vb/*.cpp/*.vbp/*.frm/*.cls` members). Only
documentation (help pages, readmes, changelogs, format specs) was extracted or read;
binaries were listed and had their *version strings* read, never disassembled.

## Method

`wb.py` (this directory) drove `web.archive.org` — CDX index queries and raw `id_` replay
fetches, serialised at one request/second. URLs / prefixes queried:

| Query | Match | Result |
|---|---|---|
| `rpgtoolkit.net/vault/official/rpgtoolkit321b.zip` | exact | only a 2015-09-24 `200` (+ 2015 revisit, 2016 `301`) — **no 2019 capture on this path** |
| `rpgtoolkit.net` | domain | found the 2019-02-18 `200` at the *other* path `rpgtoolkit.net/rpgtoolkit321b.zip` (36,856,168 B) — this is the copy fetched |
| `rpgtoolkit.net/vault/official/rpgtoolkit310.exe` | exact | 2012-08-07 and 2013-06-13 `200`s; fetched 2013-06-13 |
| `toolkitzone.com/vault/toolkit/releases/7.exe` | exact | one `200` (2007-07-29), later `404`s; fetched |
| `toolkitzone.com/vault/toolkit/releases/` | prefix | also lists `12.exe`, `tk1.zip`, `tk2.zip` (the latter later `404`) |
| `rpgtoolkit.com/docs/ver2/` | prefix | help1/2/3.htm + `Image386…444.jpg` + `main.html` (404) |
| `rpgtoolkit.com/dev_repo/docs/` | prefix | article1, distribFAQ, perspective, rpgcode_tricks_and_tips, tst, tileart/*, images, basicEULA.txt, translating.txt, license.pdf |
| `rpgtoolkit.com/software/` | prefix | `help220.upd`, `upd220b.udc`, `Tk220bSource.udc`, `TLKITV14.ZIP`, `gate.zip`, `toolkit2.zip` |
| `rpgtoolkit.com/web/` | prefix | only late (2021) Baidu-ad hijack JS — nothing of use |
| `rpgtoolkit.com/help/` | prefix | no captures |
| `toolkitzone.com/fileman.php?id=3&file=861` / `819` | exact | plugin-SDK listing pages (2004-2006) |

Total raw captures kept: **1 distribution zip, 2 installer exes, 3 installer help trees,
1 `.upd` doc bundle (2.20b), 1 `.udc` update, 12 HTML/text dev_repo pages, 3 ver2 pages,
5 dev_repo PNGs, 3 tileart GIFs, 3 plugin-SDK pages.** Everything is under
`fixtures/archaeology/` (git-ignored).

The `.upd`/`.udc` containers are a private `UPD1` format whose payload is byte-shifted by
+1 (every byte minus 1 recovers a normal `PK` zip); the 2.20b help was unpacked that way.

## Provenance

| Item | Wayback snapshot URL | Captured | Confidence | Notes |
|---|---|---|---|---|
| Official 3.2.1 distribution | https://web.archive.org/web/20190218044009id_/http://rpgtoolkit.net/rpgtoolkit321b.zip | yes | high | 36,856,168 B original; `PK` magic; `dist/rpgtoolkit321b.zip` |
| 3.1.0 installer | https://web.archive.org/web/20130613141333id_/http://rpgtoolkit.net/vault/official/rpgtoolkit310.exe | yes | high | 7,222,483 B; SFX-zip; `dist/rpgtoolkit310.exe` |
| ToolkitZone release "7" | https://web.archive.org/web/20070729110947id_/http://www.toolkitzone.com/vault/toolkit/releases/7.exe | yes | high | 5,300,161 B; UPX SFX-zip; `dist/tk-release-7.exe` |
| rpgtoolkit.net download alias | https://web.archive.org/web/20110219053622id_/http://rpgtoolkit.net/software/download/ (302) | yes | high | resolves to the **same** 3.1.0 installer bytes as `rpgtoolkit310.exe` (sha256 `32cc5bb0…`); no distinct build |
| 3.2.1 help tree | (extracted from zip above) | yes | high | 199 files → `dist/rpgtoolkit321-docs/` |
| 3.1.0 help tree | (extracted from 310 exe) | yes | high | 201 files → `dist/rpgtoolkit310-docs/` |
| 3.0.6 help tree | (extracted from 7.exe) | yes | high | 121 files → `dist/tk306-docs/` |
| 3.2.1 / 3.1.0 / 3.0.6 readmes | (extracted) | yes | high | `dist/installer-readmes/` |
| 2.20b help bundle | https://web.archive.org/web/20030724201435id_/http://rpgtoolkit.com:80/software/help220.upd | yes | high | 1,548,983 B; `UPD1`; unpacked → `rpgtoolkit-com/help220b-docs/` |
| 2.20b program update | https://web.archive.org/web/20030803233758id_/http://rpgtoolkit.com:80/software/upd220b.udc | yes | medium | 4,589,388 B; `SZDD`/`UPD1`; program update, not mined for docs |
| software.html | https://web.archive.org/web/20030406022941id_/http://www.rpgtoolkit.com:80/software.html | yes | high | Version 1 / Version 2 download hub |
| ver2 help1 (v2.0 guide) | https://web.archive.org/web/20010630032304id_/http://www.rpgtoolkit.com:80/docs/ver2/help1.htm | yes | high | "VERSION 2.0 USER'S GUIDE" |
| ver2 help2 (RPGCode2) | https://web.archive.org/web/20010716200856id_/http://www.rpgtoolkit.com:80/docs/ver2/help2.htm | yes | high | "PROGRAMMING IN RPGCODE2" |
| ver2 help3 | https://web.archive.org/web/20010722131618id_/http://www.rpgtoolkit.com:80/docs/ver2/help3.htm | yes | high | bonus third page (RPGCode2 reference) |
| dev_repo article1 | https://web.archive.org/web/20030908131537id_/http://rpgtoolkit.com:80/dev_repo/docs/article1.html | yes | high | "The Art of RPG Production", Cyrus Martin |
| dev_repo distribFAQ | https://web.archive.org/web/20021220032638id_/http://www.rpgtoolkit.com:80/dev_repo/docs/distribFAQ.htm | yes | high | documents v2.07 beta 7 |
| dev_repo perspective | https://web.archive.org/web/20030406061739id_/http://www.rpgtoolkit.com:80/dev_repo/docs/perspective.htm | yes | high | "Maintaining Perspective In An RPG" |
| dev_repo rpgcode_tricks_and_tips | https://web.archive.org/web/20030406062910id_/http://www.rpgtoolkit.com:80/dev_repo/docs/rpgcode_tricks_and_tips.htm | yes | high | C. B. Matthews, 1999 |
| dev_repo tst | https://web.archive.org/web/20030908131652id_/http://rpgtoolkit.com:80/dev_repo/docs/tst.html | yes | high | "Tileset (TST) File Format Specification", v2.0 |
| dev_repo tileart index..page5 | https://web.archive.org/web/20030617152228id_/http://www.rpgtoolkit.com:80/dev_repo/docs/tileart/index.html (+ page2/3/4/5) | yes | high | "Drawing Tiles" by Jerry Liang |
| dev_repo basicEULA.txt | https://web.archive.org/web/20030908130530id_/http://rpgtoolkit.com:80/dev_repo/docs/basicEULA.txt | yes | high | |
| dev_repo translating.txt | https://web.archive.org/web/20030908130157id_/http://rpgtoolkit.com:80/dev_repo/docs/translating.txt | yes | high | |
| dev_repo license.pdf | https://web.archive.org/web/20030715134148id_/http://rpgtoolkit.com:80/dev_repo/docs/license.pdf | yes | high | 142,824 B |
| dev_repo images Image1/3/4/5/17.png | e.g. https://web.archive.org/web/20030126111159id_/http://rpgtoolkit.com:80/dev_repo/docs/Image3.png | partial | high | 5 of 7 archived |
| tileart img3/5/7.gif | e.g. https://web.archive.org/web/20020315085635id_/http://rpgtoolkit.com:80/dev_repo/docs/tileart/img3.gif | partial | high | 3 of 10 archived (rest not captured) |
| C++ Plugin SDK listing | https://web.archive.org/web/20060612030954id_/http://www.toolkitzone.com:80/fileman.php?id=3&file=861 | yes | high | SDK v2.0, TK 3.04+, 48.6 kb |
| VB Plugin SDK listing | https://web.archive.org/web/20050318134057id_/http://www.toolkitzone.com:80/fileman.php?id=3&file=819 | yes | high | Asimir, TK 3.0.4+, 31.6 kb |
| SDK download action | https://web.archive.org/web/20051219003438id_/http://www.toolkitzone.com:80/fileman.php?id=5&file=861 | yes | high | only the "please wait" page — the SDK **zip itself is not archived** |

## The official distributions

Three distinct Toolkit 3 distributions were recovered; each is a self-extracting zip
(SFX) whose embedded zip lists and extracts cleanly (`unzip -l`, `python zipfile`):

| Package | Claimed version | Engine string (`trans3.exe`) | Editor string | EULA version | Date |
|---|---|---|---|---|---|
| `rpgtoolkit321b.zip` | **3.2.1** (folder `RPGToolkit 3.2.1/`, `.lnk` names) | `RPGToolkit Engine Version 3.2.0` | `RPG Toolkit Development System, Version 3` | Version 3.2.0 | build files 2014 |
| `rpgtoolkit310.exe` | **3.1.0** | `RPGToolkit Engine Version 3.1.0` | `RPG Toolkit Development System, Version 3` | Version 3.1.0 | Sep 2007 |
| `tk-release-7.exe` | **3.0.6** | `RPG Toolkit Translator (Version 3)` | `RPG Toolkit Development System, Version 3` | AC Open License (2005) | Apr 2005 |

Note the 3.2.1 package's folder/link labels say "3.2.1" while its EULA text and the
compiled engine both report **3.2.0** — the shipped build is the 3.2.1 *package* wrapping a
3.2.0 engine. (The 3.1.0 exe's readme is titled "RPGTOOLKIT DEVELOPMENT SYSTEM, VERSION
3.1.0", September 2007.)

Contents of the 3.2.1 package (`rpgtoolkit321/RPGToolkit 3.2.1/`): `Toolkit3/` (the editor
`toolkit3.exe` 654,848 B, engine `trans3.exe` 1,755,136 B, `bard3.exe`, DLLs/OCXs,
`gpl.txt`, `eula.txt`, `help/`, `game/Basic`, `game/TheWizardsTower`), `RPGCode Express 1.0/`
(`rpgcodeexpress.exe` 171,008 B — a .NET RPGCode IDE) and `Resources/`. 739 files total.

## Documentation shipped by the 3.2.1 distribution

The zip ships a full HTML help system plus language reference files. Extracted
documentation tree = `dist/rpgtoolkit321-docs/…/Toolkit3/help/` (32 `.htm` pages,
142 images, `styles/css.css`, `js.js`) plus `Toolkit3/gpl.txt`, `Toolkit3/eula.txt`,
`RPGCode Express 1.0/gpl.txt`. Language-reference data files also shipped:
`help/rpgcodeEN.ref` (36,011 B), `help/eventsEN.ref` (28,106 B), `help/tipEN.tip` (863 B).

The manual's own table of contents (`help/index.htm`) reads verbatim:

> RPGToolkit Help — tk3 ( home , dev , source , bugs , help ) … quick-start | editor | editor
> environment … main file editor | board editor | tile editor | program editor | character
> editor | item editor | enemy editor | animation editor | tile bitmap editor | special move
> editor | status effect editor | background editor | playing | default systems | distribution
> | rpgcode | language features | function reference | object oriented coding … troubleshooting
> | faq | technical issues | system requirements | about | history | links | 3.1.0 changelog

> This is the manual of the RPGToolkit, Version 3 … 3.1.0 status: * = updated, ** = rewritten,
> *** = new page … All contents copyright © 2005, 2007 Colin James Fitzpatrick, Jonathan
> Hughes, and Samuel Bedwell.

Chapter map (page → topic), read from the index links and the pages themselves: `page1`
quick-start, `page2` editor, `pageed_environment` editor environment, `page3` main file
editor, `page4`/`4.1`/`4.2` board editor + vector overview, `page5` tile editor, `page6`
program editor, `page7` character, `page8` item, `page9` enemy, `page10` animation,
`page11` tile bitmap, `page12` special move, `page13` status effect, `pageed_background`,
`page14` playing, `page15` default systems, `page16` distribution, `page17` RPGCode,
`page18`+`18.1…18.6` language features, `page19` function reference, `page21` object
oriented coding, `page22` troubleshooting, `page23` FAQ, `page25` technical issues,
`page26` system requirements, `page28` about, `page29` history, `page30` links,
`page31` 3.1.0 changelog. The 3.1.0 changelog (`page31`) states licensing verbatim:

> The RPGToolkit version 3.1.0 is licensed under the GNU General Public License (GPL) v3.
> This includes the engine trans3.exe, the editor toolkit3.exe, and the graphics library
> actkrt3.dll.

## Plugin-authoring documentation — the answer

**The 3.1.0 / 3.2.1 distribution ships *no* plugin-authoring documentation.** There is no
plugin SDK, no plugin API reference and no plugin-authoring chapter. The manual *refers* to
plugins and to an SDK that lives off-site, and a "plugins" help page was planned but never
shipped:

- `help/page17.htm` (RPGCode chapter TOC) contains the link **commented out**:
  `<!-- <li><a href="page20.htm">plugins</a></li> -->` — i.e. a `page20.htm` "plugins" page
  was intended but is absent from the package (and none of `page20/24/27.htm` exist).
- `help/page3.htm` (main file editor) — verbatim:

  > **Plugins** — If you have downloaded (or even written!) a plugin, it must be added here
  > before it can be used. Plugins go in the Game\Plugins folder; a short description of the
  > plugin appears when one is added. Additionally, you can specify plugins to be used in
  > place of the default menu and fight plugins. For more information on Plugins, click here.

  (the "here" link points to `page23.htm#faq_4.2`; an earlier "Built-In Fighting System"
  paragraph says "…either in RPGCode or using the **TK Plugin SDKs**").

- `help/page31.htm` (3.1.0 changelog) has a "Plugins and callbacks" section that lists
  engine callback names (`CBGetPlayerNum(PLAYER_DIR_FACING, …)`, `CBSetPlayerNum(…)`,
  `CBGetGeneralString(GEN_PLYROTHERHANDLES, GEN_PLYROTHERFILES)`) and credits
  "Colin Fitzpatrick … **plugin subsystem, most plugin callbacks**, battle system subsystem".
- `help/page29.htm` (history) records that plugin authoring was never finished:
  "**KSNiloc's VB Plugin SDK is not included with 3.0.4 - this will be released separately
  at a later date.**" and, in the 3.0.3 notes, "Finalized plugin SDK should be released."

**The 3.0.6 (TK) distribution *did* ship plugin-authoring help.** In `tk-release-7.exe`
the help page `help/page18.4.htm` is "Advanced Features", and its "Plugins" subsection is
the only shipped how-to-write-a-plugin text (recovered to `dist/tk306-docs/help/page18.4.htm`):

> **Plugins:** You can create your own RPGCode commands that are embedded into the toolkit,
> instead of creating methods, with the use of plugins. You can write plugins for the
> RPGToolkit with any programming language that supports COM, but the dominating programming
> language to write plugins for the Toolkit in is C++. To create plugins, you need to
> download the plugin SDK (Software Development Kit). At the time of this writing, there are
> two TK3 plugin SDK's; a C++ SDK, and a VB SDK. To add a plugin into your game, simply click
> the project editor and select the plugins tab. …
> **Plugin SDK Downloads** — Microsoft Visual C++ SDK / Microsoft Visual Basic 6 SDK

Those two SDK links resolve to `http://toolkitzone.com/fileman.php?id=3&file=861` (C++ SDK)
and `…&file=819` (VB SDK). Their (Wayback) download listings describe them verbatim:

> **C++ Plugin SDK, 3.04+ Version** — Author/Source Colin James Fitzpatrick … Version SDK
> version 2.0 … "This is a plugin SDK updated for 3.04, it shows how you can use COM to
> communicate with trans3. Updated, now with an example." (48.6 kb)

> **VB Plugin SDK (TK 3.0.4+)** — author Asimir … "This nice little software development kit
> allows you to build plugins for TK3 using Visual Basic. The instructions are very basic…"
> (31.6 kb)

In 3.1.0/3.2.1 that Plugins subsection was **dropped**: `page18.4.htm` now covers
"Variable scope / Using autolocal / Other uses", and the topic only survives as the
commented-out `page20` link. So the shipped engine + editor are usable, but the
plugin-authoring API documentation must come from the (off-site, unarchived) SDKs or from
the 3.0.6 help page above.

### Shipped `Plugin/` folders (file names + sizes only)

3.2.1 (`rpgtoolkit321/RPGToolkit 3.2.1/Toolkit3/game/Basic/Plugin/`):

| File | Size (B) |
|---|---|
| `tk3menu.dll` | 106,496 |
| `tk3fight.dll` | 98,304 |
| `tk3fight.dll.x.manifest` | 821 |

`game/TheWizardsTower/Plugin/` is an empty folder. The 3.1.0 package ships the same two
DLLs at the same sizes (`tk3menu.dll` 106,496, `tk3fight.dll` 98,304); the 3.0.6 package
ships smaller early builds (`tk3menu.dll` 27,136, `tk3fight.dll` 26,624). These are the
default **menu** and **fight** plugins; no sample/example plugin source or docs accompany
them.

## rpgtoolkit.com — the original cbm documentation

### The live ver2 help pages document Toolkit **2.0**, not 2.20b

`rpgtoolkit.com/docs/ver2/help1.htm` (newest `200` capture, 2001-06-30) is titled verbatim
"**RPG Toolkit Development System — VERSION 2.0 USER'S GUIDE**", and its introduction reads
"Welcome to the RPG Toolkit Development System, Version 2.0! … built upon the same concepts
as version 1.4". The sibling `help2.htm` is "**PROGRAMMING IN RPGCODE2**" (the RPGCode2
language primer, addressing "version 1.4 people"), and `help3.htm` (2001-07-22) is the
RPGCode2 reference. **It was not Toolkit 2.20b** — the CDX history for `/docs/ver2/help1.htm`
ends its `200` captures in mid-2001 (later captures are `302`), so this path only ever served
the 2.0 manual. (No `2.2`/`2.20`-specific text appears anywhere in `help1/2/3.htm`.)

### The 2.20b ("Powerhouse Edition") help is `help220.upd`

`rpgtoolkit.com/software/help220.upd` (2003-07-24, 1,548,983 B) is the v2.20b help update. It
is a `UPD1` container whose ~1.5 MB payload is byte-shifted by one (`b-1` recovers a normal
`PK` zip) holding `extract_to_help_folder.zip` → extracted to
`rpgtoolkit-com/help220b-docs/` (`help1.htm` 515,241 B, `help2.htm` 183,063 B,
`help3.htm` 744,784 B, + `help*_files/` images; authored "cbm", Word-generated, dated
2002-06-13). `help1.htm` opens verbatim:

> Users Guide … Welcome to the RPG Toolkit Development System, **Version 2.2**! This version,
> the **Powerhouse Edition**, features a wider arr…

So **2.20b documentation was recovered** — but from `/software/help220.upd`, not from
`/docs/ver2/`. `help1`=Users Guide, `help2`=RPGCode Primer, `help3`=RPGCode Reference.

A second, larger file `rpgtoolkit.com/software/upd220b.udc` (2003-08-03, 4,589,388 B —
`SZDD`-wrapped `UPD1`) is the 2.20b *program* update (contains `regocx.bat` etc.); it was
captured but not mined for docs, since `help220.upd` already carries the manual.
`rpgtoolkit.com/software/Tk220bSource.udc` (982,470 B) is TK2 **source** — deliberately not
fetched or opened (G7).

### `dev_repo/docs` — developer articles and format specs

| Page | Kind | Version it documents | Key content |
|---|---|---|---|
| `article1.html` | essay | v2 era | "The Art of RPG Production", Cyrus Martin |
| `distribFAQ.htm` | FAQ | **v2.07 (beta 7)** | "Preparing A Game For Distribution" (Trans2.exe, Brddraw.exe, Base.fnt, 256RGB.pal, …) |
| `perspective.htm` | article | v2 era | "Maintaining Perspective In An RPG" (Final Fantasy-style overhead) |
| `rpgcode_tricks_and_tips.htm` | article | v2 (RPGCode) | C. B. Matthews 11/30/99 — `#Start`, `#Method`, etc. |
| `tst.html` | **format spec** | v2.0 | "**Tileset (TST) File Format Specification**" — WORD version/NumberOfTiles/detail header |
| `tileart/index.html…page5` | tutorial | v2 era | "**Drawing Tiles**" by Jerry Liang (The Head Taker) — tile-drawing steps + style advice |
| `basicEULA.txt` / `translating.txt` / `license.pdf` | docs | v2 | license / localisation notes |

### Where the Toolkit **3** help actually lived

`rpgtoolkit.com` never hosted the TK3 manual. The 3.x help lived (a) inside each distribution's `help/` folder, (b) online at
`tk3.toolkitzone.com/help/` — the 3.2.1 help pages link out to `http://tk3.toolkitzone.com/help/`,
`http://tk3.toolkitzone.com/help/page19.htm` and `http://tk3.toolkitzone.com/source`
(source page) — and (c) as an HTML mirror on `rpgtoolkit.net/manual/*` (the official 3.1.0
help, incl. the full RPGCode function reference). The `/docs`, `/web` and `/software`
prefixes on `rpgtoolkit.com` return only the v2 material above (plus later Baidu-ad spam
under `/web/`); `/help/` has no captures.
Those online TK3 help/source pages sit on the `toolkitzone.com` and `rpgtoolkit.net`
hosts and are covered by the ToolkitZone / rpgtoolkit.net manual workstreams, not this one.

## Gaps / not recovered

- **2.20b help as site pages.** `rpgtoolkit.com/docs/ver2/help1.htm` has no post-2001 `200`
  capture; the 2.20b manual survives only inside `help220.upd`. Exact failing query:
  `wb.py cdx rpgtoolkit.com/docs/ver2/help1.htm --match exact` → `200` captures stop at
  `20010630032304`, then only `302`.
- **The plugin SDK zips themselves.** The C++/VB SDK download actions
  (`fileman.php?id=5&file=861`, `fileman.php?id=5&file=819`) are archived only as the
  "Please wait for your file to begin downloading" HTML page — the `.zip` payloads were not
  captured. Exact queries that failed to find a binary:
  `wb.py cdx "toolkitzone.com/fileman.php?id=5&file=819" --match exact` → 0 rows.
- **A "plugins"/`page20.htm` help page** in 3.1.0/3.2.1 — referenced only as a commented-out
  link; never shipped.
- **Most ver2 help images.** `docs/ver2/Image386…444.jpg` are archived only as the server's
  HTML error page (mimetype `text/html`, not `image/jpeg`), so they are not images at all;
  genuinely 404/never-captured: Image391, 403, 405–418, 420–432, 434–444, and the odd in-range
  gaps. (The 2.20b manual's own images *were* recovered inside `help220.upd`.)
- **dev_repo images.** `tileart/img2,4,6,8,9.gif` and `dev_repo/Image2.png`, `Image6.png`
  have no `200` capture (CDX shows only `302`s / nothing). Recovered: `img3/5/7.gif`,
  `Image1/3/4/5/17.png`.
- **TK3 online help (`tk3.toolkitzone.com/help/`)** — not chased here (other workstream);
  the distributions already carry the same help tree offline.
