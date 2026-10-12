# Mystic Software — the RPGCode Shack and the surviving Toolkit web estate (Wayback recovery)

Recovery of the *documentation prose* of `mysticsoftware.net` and its Toolkit
sub-sites for the clean-room rebuild: **MrG's Shack** (`mrgoldsoft.mysticsoftware.net/shack/`,
the "RPGCode Shack"), the main host's Toolkit sections (`code.php`, `help.php`,
`resources/`, `reviews/`, `games/`), `tkcommunity.mysticsoftware.net` and
`tkgr.mysticsoftware.net`.

Report date **2026-10-11**. This is the *new* material beyond the earlier round
(`README.md`, `plugins.md`, `findings/01–06`): those covered `rpgtoolkit.net`,
`rpgtoolkit.com`, `toolkitzone.com` and the official distributions. Nothing in
this file was known to that round. **Headline:** the Shack is a *third*,
hitherto-invisible plugin catalogue — 29 described plugins with authors, sizes
and download filenames — and it is the only place that documents **how to install
a plugin**, **how the VB/ActiveX plugin loader worked**, and **MrG's own answers
about plugins**. It also gives a clean crosswalk between the Shack catalogue and
the payload archives mirrored at `mysticsoftware.net/files/`.

Guard-rails followed: the legacy source tree was never opened; inside the
archives only documentation was read (`*.html`, `*.htm`, `*.txt`, `*.js`
catalogue data). The `.prg`/`.zip`/`.exe` payloads are **inventoried, not read**
(the `test.php?mode=6` "view RPGCode" pages were identified as such and only
their page shape sampled — the scripts themselves are left for the format-spec
work and the payload owner).

## Method

All work was CDX-first: enumerate what exists, then fetch the raw `id_` replay of
each page (one serial keep-alive loop per process; `wb3.py`; 1.2 s spacing).
Tools are the git-ignored `fixtures/archaeology/wb.py`, `wb2.py`, `wb3.py`.

| Query (`wb.py cdx …`) | Match | Rows | Unique URLs |
| --- | --- | --- | --- |
| `mysticsoftware.net` | domain (60 000-row page, `mimetype:text/html` filtered) | 6 000 (cap) | — |
| `mysticsoftware.net/files/` | prefix | 103 | 99 |
| `mysticsoftware.net/resources/` | prefix | 85 | 82 |
| `mysticsoftware.net/reviews/` | prefix | 914 | 391 |
| `mysticsoftware.net/games_html/` | prefix | 399 | 112 |
| `mysticsoftware.net/games/` | prefix | 2 151 | 950 |
| `mysticsoftware.net/tk` | prefix | 86 | 43 (`tkgr/…`) |
| `mysticsoftware.net/index` | prefix | 56 | 27 |
| `mrgoldsoft.mysticsoftware.net` | domain | 1 540 | 286 |
| `tkcommunity.mysticsoftware.net` | domain | 333 | 46 |
| `tkgr.mysticsoftware.net` | domain | 603 | 94 |

Requests are cheap but slow; `archive.org` refused connections repeatedly
(`Connection refused`, 503) and every query needed retries with backoff. Fetched:

* **`mystic-web/`** (new, this job): 196 files — main-site Toolkit sections,
  `tkcommunity`, `tkgr`, the `resources`/`games` listings, `reviews`, and the
  `code.php?mode=2&type=plugins` + `help.php?article=` documentation pages, each
  with a `.json` provenance sidecar (except the 34 `code.php?mode=2…` /
  `help.php?article=…` files whose sidecars collapsed onto one name — see
  *Gaps*).
* **`mrgoldsoft/shack/`** (shared with the `Main` sibling, which owns the static
  pages): I added the **66 `test.php?…` catalogue pages** — the category/rating
  listings (`?type=plugins|bs|ms|methods|mwin|misc|editors|newfiles`, plus
  `&mode=3&rating=1..3`, 17 pages) and the **49 `?mode=6&file=…` file-viewer
  pages** — plus cross-checked the static pages against CDX.

Not fetched (owned by siblings / out of lane): the payload bytes under
`fixtures/archaeology/mystic-files/` (the `MysticFiles` sibling) and the static
Shack pages (the `Main` sibling).

## Provenance

`Captured` = Wayback capture timestamp of the bytes quoted in this file.
`Conf.` = confidence that the item is what it claims to be / is complete.

| Item | Wayback snapshot URL | Captured | Conf. | Notes |
| --- | --- | --- | --- | --- |
| Shack front page | `…/web/20040411085825id_/http://mrgoldsoft.mysticsoftware.net/shack/index.htm` | 2004-04-11 | high | category tooltips; "RPGCode Shack" |
| Shack front page (early) | `…/web/20020814182108id_/http://mrgoldsoft.mysticsoftware.net/shack/` | 2002-08-14 | high | 2002 wording of the category tooltips; "plugfuncs" news |
| Shack `plugins.htm` | `…/web/20040116084533id_/…/shack/plugins.htm` | 2004-01-16 | high | alphabetical + by-rating lists |
| `plugins.js` (catalogue) | `…/web/20030921094828id_/…/shack/plugins.js` | 2003-09-21 | high | 29 plugin entries w/ descriptions |
| `content1.js` (battle systems) | `…/web/20040116091033id_/…/shack/content1.js` | 2004-01-16 | high | 13 entries |
| `content2.js` (menu systems) | `…/web/20030417230402id_/…/shack/content2.js` | 2003-04-17 | high | 7 entries |
| `content3.js` (custom MWins) | `…/web/20040112221632id_/…/shack/content3.js` | 2004-01-12 | high | 13 entries |
| `content4.js` (methods) | `…/web/20030923010622id_/…/shack/content4.js` | 2003-09-23 | high | 33 entries |
| `content5.js` (misc) | `…/web/20030923010752id_/…/shack/content5.js` | 2003-09-23 | high | 27 entries |
| `editors1.js` (editors) | `…/web/20040114171553id_/…/shack/editors1.js` | 2004-01-14 | high | 8 entries |
| `test.php?type=plugins` | `…/web/20031212170311id_/…/shack/test.php?type=plugins` | 2003-12-12 | high | inline catalogue, 30 entries, id 110–147 |
| `test.php?type={bs,ms,methods,mwin,misc,editors,newfiles}` | `…/web/20040412211223id_/…`, `…2211912id_/…`, `…2211619id_/…`, `…20040220060713id_/…`, `…2211641id_/…`, `…2211414id_/…`, `…20040220060854id_/…` | 2004-02/04 | high | category shells (data in the `.js`) |
| `test.php?type=plugins&mode=3&rating=1` | `…/web/20040113144439id_/…` | 2004-01-13 | high | "Gold" tier listing |
| `test.php?mode=6&file=files/hpbar.prg` | `…/web/20040101105617id_/…` | 2004-01-01 | high | "view RPGCode" page (syntax-highlighted source) |
| `askmrg.htm` (Q&A) | `…/web/20040430161548id_/…/shack/askmrg.htm` | 2004-04-30 | high | 51 questions w/ inline answers |
| `askxorlak.htm` (Q&A) | `…/web/20040412235249id_/…/shack/askxorlak.htm` | 2004-04-12 | high | 13 answers, RPGCode/battle-system |
| `help.htm` (all help articles) | `…/web/20040413000149id_/…/shack/help.htm` | 2004-04-13 | high | incl. "Setting Up Plugins" |
| `submit.htm` | `…/web/20040412211049id_/…/shack/submit.htm` | 2004-04-12 | high | submission form fields |
| `search.htm` | `…/web/20040412210735id_/…/shack/search.htm` | 2004-04-12 | high | Title/Author/Category/Rating/Description |
| `bstut/bstut2.htm` | `…/web/20040223002328id_/…/shack/bstut/bstut2.htm` | 2004-02-23 | high | "Battle System Tutorial Part One" (MrG+Triuken) |
| `features.htm` | `…/web/20040207100205id_/…/shack/features.htm` | 2004-02-07 | high | gallery + "Tip du Jour" |
| `code.php?type=plugins` | `…/web/20150220122207id_/http://mysticsoftware.net/code.php?type=plugins` | 2015-02-20 | high | nav "Plugins (30)"; late state |
| `code.php?type={bs,methods,ms,mwin,misc,newfiles}` | `…/20071021083750id_/…`, `…20070703001047id_/…`, `…20070703001054id_/…`, `…20040504022027id_/…`, `…20070623124900id_/…`, `…20150220062509id_/…` | 2004–2015 | high | per-category listings |
| `code.php?type=editors` | `…/web/20080120054628id_/http://www.mysticsoftware.net/code.php?type=editors` | 2008-01-20 | high | (only www capture) |
| `code.php?mode=2&type=plugins&sort=0&id=110…269` | e.g. `…/web/20050127133558id_/http://mysticsoftware.net/code.php?mode=2&type=plugins&sort=0&id=170` | 2005-01 | high | 34 detail pages, per-plugin description |
| `help.php` (article list) | `…/web/20040504022135id_/http://mysticsoftware.net/help.php` | 2004-05-04 | high | 22 articles incl. two plugin ones |
| `help.php?mode=1&article=19` "Setting Up Plugins" | `…/web/20040504141745id_/…/help.php?mode=1&article=19` | 2004-05-04 | high | MrG's install steps |
| `help.php?mode=1&article=21` "Setting UP VB Plugins" | `…/web/20041106104519id_/http://www.mysticsoftware.net/help.php?mode=1&article=21` | 2004-11-06 | high | `plugins.ini` spec, by KSNiloc |
| `help.php?mode=1&article={2,3,7,14,16,20,22}` | `…/2004xxxxid_/…` (see `mystic-web/*articleE*`) | 2004 | high | RPGCode docs, no plugin content |
| `resources/` (dir listing) | `…/web/20230129211722id_/http://mysticsoftware.net/resources/` | 2023-01-29 | high | Apache index, 2008 mtimes |
| `files/` payload dir | CDX only: `…/files/<name>.zip` | 2004–2007 | high | 99 archives; listing page not captured |
| `reviews.php` / `?mode=2` | `…/20050220082555id_/…`, `…20071123071011id_/…` | 2005/2007 | high | game reviews only |
| `reviews/reviews_1.htm` | `…/web/20031211031514id_/http://www.mysticsoftware.net/reviews/reviews_1.htm` | 2003-12-11 | high | review index (game/score) |
| `games.php` | `…/web/20151127021936id_/http://mysticsoftware.net/games.php` | 2015-11-27 | high | game DB categories |
| `games/` (dir listing) | `…/web/20230129232858id_/http://mysticsoftware.net/games/` | 2023-01-29 | high | game downloads |
| `index.php` | `…/web/20221201095113id_/http://mysticsoftware.net/index.php` | 2022-12-01 | high | modern landing page |
| `index.php?mode=1` (news) | `…/web/20150220112656id_/…/index.php?mode=1` | 2015-02-20 | high | news archive to 2008 |
| `index.html` (early) | `…/web/20020510232614id_/http://www.mysticsoftware.net/index.html` | 2002-05-10 | high | pre-2004 "MS.net" shell |
| `library/rpgc_manual/chapter1.htm` | `…/web/20020627000357id_/…` | 2002-06-27 | high | old RPGC manual chapter |
| `tkcommunity` `index.html` | `…/web/20020619003303id_/http://tkcommunity.mysticsoftware.net/index.html` | 2002-06-19 | high | Matt72186's portal |
| `tkcommunity` `tncommunityN.html`, `humor.html` | `…/20020623095041id_/…tkcommunity1.html` etc. | 2002-06 | high | poem/humor pages |
| `tkcommunity` `?rid=1/2/3/4/9`, `?rid=3&uid=N` | `…/web/20040212123347id_/…/?rid=1`, `…12123948id_/…/?rid=3`, `…12190711id_/…/?rid=3&uid=1` | 2004-02 | high | news / humor / member list / signup / profile |
| `tkgr` `index2.html`, `home.html`, `awards.html` | `…/web/20021224153754id_/http://tkgr.mysticsoftware.net/index2.html` etc. | 2002–2007 | high | Toolkit Game Reviews |
| `tkgr` star pages `1/2/3/4/5stargames.html`, `3star*.html` | `…/20050204131029id_/…/5stargames.html` etc. | 2005-02 | high | ratings + reviews |
| `tkgr` `awards/2001/index.htm`, `awards/2002/` | `…/web/20050204164906id_/…/awards/2001/index.htm` | 2005-02 | high | award categories |
| `www…/tkgr/…` (same site, main host) | `…/web/20070222094725id_/http://www.mysticsoftware.net/tkgr/awards.html` | 2007-02 | high | pre-subdomain location |

## 1. The estate at a glance

The domain is a *Toolkit community hub*, not a vendor site: a games/resource
host, a code archive ("RPG Code Shack") in two copies, a game-review site and a
member portal. Four hosts:

| Host | Role | Toolkit content |
| --- | --- | --- |
| `mysticsoftware.net` (and `www.`) | main site | news, `code.php` = **RPG Code Shack** (code/plugin tileset archive, 7 categories), `help.php` (tutorials incl. plugin install), `resources/` + `files/` + `games/` download dirs, `reviews.php`, `articles.php` |
| `mrgoldsoft.mysticsoftware.net/shack/` | **MrG's Shack** — a *parallel, hand-curated* RPG Code Shack | 7 file categories + "New Files", each entry with a reviewed description, author, size and a gold/silver/bronze recommendation; the same `resources/` content mirrored |
| `tkcommunity.mysticsoftware.net` | member portal (Matt72186) | none — news, humor, member list, PM |
| `tkgr.mysticsoftware.net` (earlier `www…/tkgr/`) | Toolkit Game Reviews | game reviews + annual awards; **no plugin content** |

## 2. MrG's Shack — site, categories, file browser

The front page title is "**RPGCode Shack**" / "**RPGCode In A Nice Blue Shack**"
(snapshot `20040411085825`). Its navigation is the category structure, and each
category carries a one-line manifesto delivered via JS tooltips. These are the
Shack's own definitions of its file categories (verbatim):

> Battle Systems: Templates, classic styles, and fresh concepts.
> Menu Systems: Menus with gold display, time display, custom stat screens and some with fish.
> Methods: Inns, status bars, better NPCs, weather, graphical tricks and whatnot.
> Custom MWins: Message windows with prompts, conversation bubbles, profiles, and lots of other goodies.
> Misc Programs: Character selection, minigames, save points, and all that misc goodness.
> Editors: RPGCode editors with code wizards, error checking, etc. and other TK editors.
> Plugins: C++/Delphi/VB SDKs, screen buffers, item/SM fiddling, multiplayer, file read/writing and more.
> Help: Here you can find all kinds of tutorials and the mysterious Ask MrG FAQ page.

— `index.htm`/`plugins.htm` nav (2004). The earlier 2002 front page
(`index.html`, `20020814182108`) used slightly different wording for Plugins —
"…new features through C++ and Delphi. Item and special move manipulation, string
manipulation, file reading/writing, and true type font display" — and for Methods
("…things like inns, status bars, graphical tricks, better NPCs and weather") and
MWins ("Grab all the different kinds of this RPGCode fad"), which shows the
`VB`/SDK emphasis being added later.

### The file browser

The Shack is a PHP file archive driven by `test.php`, with a client-side copy of
the same data in seven `.js` files (`plugins.js`, `content1–5.js`, `editors1.js`).
Three `test.php` views:

* `?type=<cat>` — the category listing (server-rendered shell + inline
  `content[]` JS array). `?type=plugins` also lists each plugin's functions.
* `?mode=3&rating=<1|2|3>` — the same category filtered by the Shack's rating
  tier (**Gold / Silver / Bronze / Unrated / All**, per `search.htm`).
* `?mode=6&file=<path>` — an **"open RPGCode" viewer**: a file's source rendered
  syntax-highlighted in the browser (the catalogue's own per-file link is
  `files/openrpgcode.php?file=…`), e.g.
  `test.php?mode=6&file=files/hpbar.prg` shows `#Method HPbar(HPorSMP!, X!, Y!, endY!, Max!, Value!)…`.

`search.htm` exposes the archive's own fields — **Title, Author, Category, Rating,
Description** — and `submit.htm` the submission form: **Title, Author,
Description, ".Prg File", Other** (posted to `filesubmit.cgi`). Every catalogue
entry is *hand-written prose*, e.g. (plugins.js):

> Title: Juicy — "Here we have a cool new plugin from MrG with a very silly title.
> This lets you have multiple #SaveScreen/#RestoreScreen buffers, it lets you
> layer and save tiles, and it includes some other cool graphical effects. A very
> useful little graphical plugin!" — Author: MrG — Size: 75kb — Highly Recommended

### The catalogue (130 entries, seven categories)

| Category | File | Entries | Example entries (author) |
| --- | --- | --- | --- |
| Plugins | `plugins.js` / `test.php?type=plugins` | 29 (30 in 2003 listing) | Multi-Plug (Awesome Computing), Juicy (MrG), Flash Plugin (Triuken), Multiplayer (Cyranoid), VC++/Delphi/ExtendedPlugin SDKs |
| Battle Systems | `content1.js` | 13 | Zelda Template 2.0 (MrG), DragBattle (Dragcash), Planet Siege BS (Aaron Pierce) |
| Menu Systems | `content2.js` | 7 | Spyder's Menu System, DoddyMenu 1.2 (DoddyUK), menututorial (Stalfospk) |
| Custom MWins | `content3.js` | 13 | XF Message Window (Leuf), Message Bubble (Disrupter), Nih's MWin |
| Methods | `content4.js` | 33 | Transformation & Lighting Engine (MrG), Wintermoon's Method Pack, Martin's Methods |
| Misc Programs | `content5.js` | 27 | Card Game (Wasteland), NetLayer (Flood Software), Jukebox (Scott West) |
| Editors | `editors1.js` | 8 | Euphoria 1.3b (Vampz), VorteX 3.1 (Cyranoid), MoonCode (MrX) |

Each entry carries Title, Description, Author, Size, a `files/<name>.zip` (or
`.prg`) download and a rating word ("Highly Recommended" / "Recommended" / "Check
It Out!"). These are the Shack's **reviewed** descriptions and are the only
surviving prose for this catalogue — see §3 for the plugin ones.

## 3. Plugins on the Shack — the documentation

### 3.1 The Shack plugin catalogue (29 entries, 2003–2004)

`plugins.js` (2003-09-21) and `test.php?type=plugins` (2003-12-12) between them
hold the complete Shack plugin set with descriptions. Full list with author,
size, download and rating (download names are relative to the Shack's own
`files/`; see §4.3 for where the bytes actually survive):

| # | Plugin | Author | Download | Rating |
| --- | --- | --- | --- | --- |
| 1 | Multi-Plug | Awesome Computing | `multiplug.zip` | Highly Recommended *("only for TK2")* |
| 2 | File Read/Writer | Leuf | `fileread.zip` | Recommended *(will not work on Windows XP)* |
| 3 | Misc. Plugin Pack | MrG | `GsMiscPlugins.zip` | Highly Recommended *(requires MFC Runtimes)* |
| 4 | Triuken's Plugin Pack | Triuken | `Triukens_plugin.zip` | Highly Recommended |
| 5 | Programmer's Plugin | Leuf | `proplug.zip` | Highly Recommended |
| 6 | XFMWin | Leuf | `xfmwinplugin.zip` | Recommended |
| 7 | NPC Control System | Wintermoon | `npcplugin.zip` | Recommended |
| 8 | Visual C++ SDK | Awesome Computing | `vcplussdk.zip` | Highly Recommended *(SDK v2.19)* |
| 9 | Delphi SDK | Triuken | `delphisdk.zip` | Highly Recommended |
| 10 | Kaimu's Plugins | Kaimu | `KaimuPlugs.zip` | Recommended |
| 11 | VIP Plugin Pack | Chris Reeves | `VIPPluginPak2.zip` | Highly Recommended *(requires MFC)* |
| 12 | Flash Plugin | Triuken | `flashplug.zip` | Highly Recommended |
| 13 | Juicy | MrG | `juicy.zip` | Highly Recommended *(requires MFC)* |
| 14 | Time and Date Plugin | BP | `gettimedate.zip` | Check It Out! |
| 15 | Multi-Dimensional Arrays | BP | `multi-dim-array.zip` | Check It Out! |
| 16 | MFC Runtimes | Microsoft | `mfcruntimes.zip` | Highly Recommended |
| 17 | Erssy's Misc. Plugin | Ersuis | `ersmisc.zip` | Check It Out! |
| 18 | TWButton | Wintermoon | `twbutton.zip` | Recommended |
| 19 | FTPPlugin | kaptan | `ftpplugin.zip` | Highly Recommended |
| 20 | String Plugin | Aljo Productions | `Stringplugin.zip` | Recommended |
| 21 | FaeroSock | Faero | `FaeroSock.zip` | Recommended |
| 22 | ExtendedPlugin (SDK) | Triuken | `extendedplugin.zip` | Highly Recommended |
| 23 | Math Plugin | John Chappell (Jo of Aljo) | `extendedplugin.zip` *[sic]* | Recommended |
| 24 | EditBox2 Plugin | Aljo Productions | `Aljoseditboxplugin2.zip` | Highly Recommended |
| 25 | BP's Advanced RPGCode Plugin | BP | `bps_adv_rpgcode_plugin.zip` | Highly Recommended |
| 26 | Dan's TBox Plugin | Dan | `dantbox.zip` | Check It Out! |
| 27 | Cyranoid's MP Plugin | Cyranoid | `multip.zip` | Highly Recommended |
| 28 | Dan's Misc Plugin Pack | Dan | `danplugpack.zip` | Recommended |
| 29 | Never Fail RW Plugin | Aljo Productions | `neverfailrwplugin.zip` | Recommended |

The 2003-12 `test.php?type=plugins` copy holds **28** entries: it **drops
String Plugin and Math Plugin** from the `.js` set but **adds Launch Any File**
(KSNiloc, "VB plugin … launch any file … doesn't work too well with the TK3 …
security risk"), updates Juicy's description to add "some great mouse functions",
Multi-Plug to "Note, only for TK2", and updates sizes. The **later main-site copy
has 30** (see §4.2) — the catalogue kept churning; no single capture is the whole
set.

Descriptions worth quoting for the rebuild (plugins.js, verbatim):

> **Multi-Plug** — "This is an extremely useful plugin from the author of the
> Toolkit that not only allows you to use more than 5 plugins at a time, but also
> allows any kind of naming convention, so you know what plugins you're using and
> don't have to go by tkplugX.dll. Definitely the one plugin you must download if
> you plan on using plugins at all!"

> **ExtendedPlugin** — "Now this is cool. This plugin SDK allows extended plugin
> support through enabling access to plugins not normally supported by Trans2,
> i.e VB ActiveX DLLs. Only comes with a VB SDK in the package, but could be
> adapted to other languages."

> **Flash Plugin** — "…allows you to blend Flash animations and movies seamlessly
> into your Toolkit games. Through the use of callbacks to Flash, you can also
> code your own menu systems and battle systems in lovely, lovely Flash."

> **FTPPlugin** — "…the first real, workable multiplayer plugin for the TK. It
> allows you to copy files to and from an FTP directory, text files and binary
> files. It also lets you save web pages."

> **Visual C++ SDK** — "From the creator of the Toolkit, includes all the
> essential files and help! This is the official Visual C++ SDK, as of version
> 2.19."

Two facts here matter for `plugins.md` §1: the engine's plugin limit is **five**
("more than 5 plugins at a time" is the marquee feature of Multi-Plug), and the SDK
was at **version 2.19** — a version number that lines up with the shipped help's
"needed SDK" text and the COM SDK 2.0 recovered last round.

### 3.2 The RPGCode commands each plugin adds (`plugfuncs[]` — recovered)

`plugins.js` carries a second array, `plugfuncs[]`, keyed to the catalogue
entries; each entry is the plugin's **actual added-command list**, surfaced by the
"View Functions" link (`onMouseDown="changetext(plugfuncs[N])"` — the front-page
news of 2002-08-12 even announces "the Plugins page … now displays the plugin's
functions! Spiffy!"). 24 `plugfuncs[]` entries exist; **19 carry an explicit
command list** (Multi-Plug's is "None", two are blank). This is a *per-plugin
RPGCode surface* for the catalogue — the concrete data behind
`docs/engine-features.md` E-99 (unknown-command dispatch):

| Plugin | RPGCode commands it adds (verbatim from `plugfuncs[]`) |
| --- | --- |
| Multi-Plug | *(None — it is a loader)* |
| File Read/Writer (Leuf) | `#FileWrite #FileWriteParse #FileAppend #FileAppendParse #Fileread` |
| Misc. Plugin Pack (MrG) | `#GetBrightness #UseItem #GetEnemyStats #GetEquip #PutEnemy #GetDirection #GetItems #GetPlayerCoords #UseSpecialMove #GetSpecialMoves #GetSpecialMoveInfo #GetTime #GiveDP #GiveFP #EmptyEnemy #GetBoardName #GetBkgSounds #GetPlayerNum #GetPlayerString #SetPlayerNum #SetPlayerString` |
| Triuken's Plugin Pack | `#GetItemStats #FontProperties #FontPropertiesExtended #DrawText #GetSteps` |
| Programmer's Plugin (Leuf) | `#And #Or #Lprintf #litncpy #litcmp #litncmp #littolower #littoupper #littotitle #litisalpha #litisdigit #litisalphadigit #litlen` |
| XFMWin (Leuf) | `#XFMWin #XFMWinPrompt #XFMWinPromptNum` |
| NPC Control System (Wintermoon) | `#NPCSetSchedule #NPCReadSchedule` |
| Kaimu's Plugins | `#FadeMidiIn #FadeMidiOut #SetMidiVolume #FadeToBlack #FadeToWhite` |
| VIP Plugin Pack (Chris Reeves) | `#WritetoFile #AppendToFile #ReadFile #GetPlayerSMName #GetProfilePic #ReadFileArray #SetSprite #SetSpritePosition #SetSpriteImage #SetPic #DeleteSprite` |
| Juicy (MrG) | `#MeshTile #SaveTile #RotateTile #FlipTile #Texturize #Blur #CacheScreen #FlipScreen #ClearScreens #EmptyTileset` |
| Time and Date (BP) | `#GetTimeDate` |
| Multi-Dimensional Arrays (BP) | `#SetDimensionalArray #GetDimensionalArray` |
| Erssy's Misc. (Ersuis) | `#MessageBox #PrintDebug #ChangeResolution #GetTickCount` |
| TWButton (Wintermoon) | `#TWSetButton #TWCheckButton #TWDelButton` |
| FTPPlugin (kaptan) | `#httpread #ftpconnect #ftpopen #ftpread #ftpclose #ftpfileclose #ftpgetfile #ftpgetbinfile` |
| String Plugin (Aljo) | `#stringlength #getascii #getchar #toupper #tolower #reverse` |
| FaeroSock (Faero) | `#faerosock #fsockconnect #fsockclose #fsocksend #fsockget` |
| Math Plugin (Jo of Aljo) | `#pow #root #max #min #modulas #absolute #floor #ceiling #round` |
| EditBox2 (Aljo) | `#EditBox #GetText #SetText #ShowEdit #HideEdit #DestroyEdit #SetBGColor #SetFont #SetFontSize #SetBold #SetItalics #SetUnderline #SetStrikeThru #SetFontColor #SeledctText #TextLength #FindText #ReplaceText #Enter` |
| BP's Advanced RPGCode | *(the whole callback set — site's words: "A lot. We'll leave it at that")* |
| Dan's TBox | `#TBox #TBoxClose #GetText #SetText` |
| Flash Plugin (Triuken) | *"Just download it and read the Readme"* |

(The remaining ids — `Flash` aside, the SDK/runtime entries — have no function
list.) Note `#GetBrightness`, `#CacheScreen`, `#ChangeResolution`, `#GetTickCount`
etc. — these are things the *engine* also gained natively later; the list is
evidence of which gaps the plugin ecosystem filled first.

### 3.3 "What is a plugin?" and MrG's plugin advice — `askmrg.htm`

The Ask MrG archive is 51 questions with the answers stored inline. The
plugin-relevant ones (verbatim, snapshot `20040430161548`):

> **What is a plugin?** — "…A plugin is a collection of one or more extra RPGCode
> commands, written through C++ and plugged into the TK's RPGCode system through
> DLLs. They're quite spiffy and let the TK do all sorts of marvelous things you
> didn't think it could do. Yes, you."

> **My plugins say "Error, method not found!"** — "Another plugin question that
> needs to be near the top. 9/10 times the culprit in plugins not working is the
> fact you're trying to run them from the Program Editor. That's a no-no. They
> need to be ran while testing the game, cos the Program Editor doesn't work with
> plugins."

> **What plugins don't work on XP?** — "The most famous non-working XP plugin is
> Leuf's Read/Write plugin. But also Juicy, sadly, has been known not to work on
> XP … A trick that might get Juciy or even my Misc. Plugin Pack working is *not*
> to use MultiPlug and simply use them as tkplugX.dll."

> **What plugins work in TK3?** — "All plugins that worked for you in TK2 should
> work in TK3. For plugins made with the ExtendedPlugin SDK, you'll have to make a
> seperate Plugin folder in your Toolkit folder."

> **Is a multiplayer plugin possible in the TK?** — "There have been several
> attempts in the past to write a multiplayer plugin, several different ways. The
> newest released one is the somewhat enigmatic NetLayer, which you can find in
> the misc. programs section. I have to admit I haven't tested it thoroughly."

> **How do I use your plugin's #GiveEXP?** — "…the command name is actually
> #GiveEXPOld now, so you can redirect #GiveEXP to that." ·
> **How do I get the enemy's handles?** — "…you need my Misc. Plugin.
> #GetEnemyStats returns an array called enemy[x]$" ·
> **How do I get the board's file name?** — "…you need my misc. plugin. There's a
> command in there, strangely entitled #GetBoardName."

Also useful: **"How do you calculate range?"** documents `#GetPlayerCoords` from
MrG's plugin plus the range maths, and the **`askxorlak.htm`** column (Ask Xorlak,
13 answers) documents the realtime battle-system loop and the removal of the
2000-line program limit in 2.19b:

> "**How do realtime battle systems work?** … the main battle loop is usually
> going to look somewhat like this: `#while(battleover!=0) { #get(a$) #playerturn
> #enemyturn }`"

### 3.4 Installing a plugin — the only how-to text that survives

`help.htm` (Shack, snapshot `20040413000149`) and `help.php?mode=1&article=19`
(main site) carry the same article **"Setting Up Plugins — By MrG w/ a little
text from Vampz"** (verbatim):

> - Click on the Plugins page to the left.
> - Click on Multi-Plug, and then Download.
> - Save this file to your Toolkit2/Plugin directory.
> - Unzip this file using WinZip (www.winzip.com), and extract all the files to the Plugin directory.
> - If you cannot see a file called tkplugX.dll, click on View/Folder Options/View and then click on Show All under Hidden Files
> - Right click on tkplugX.dll, click Rename, and rename tkplugX.dll to tkplug0.dll
> - Open up the Toolkit
> - Click on the Main File Editor, then Plugins
> - Click on the square next to Use Plugin 0
> - Any further plugins you download, simply extract their DLL file to your Toolkit2/Plugin directory, and make sure its filename doesn't start with tkplug

This is the *user-facing* counterpart to the 3.0.6 `page18.4.htm` note already in
`plugins.md` §4, and it confirms the on-disk contract: `tkplug<N>.dll`, with
Multi-Plug escaping the N-limit.

### 3.5 The VB / ActiveX plugin loader — `plugins.ini` (the ExtendedPlugin model)

`help.php?mode=1&article=21` — **"Setting UP VB Plugins"** by **KSNiloc**
(cjf@mail15.com — i.e. Colin James Fitzpatrick, the author of toolkitzone file
**819 VB Plugin SDK**, per `plugins.md` §4) — is the missing documentation for the
ExtendedPlugin SDK. Verbatim:

> "Up until recently, Plugins had to be written in C++ or Delphi. The reason is
> quite simple: The RPGToolkit has no support for the only type of DLL Visual
> Basic could compile — ActiveX DLLs. … But thanks to Truiken, we can now write
> plugins in VB."

> **Understanding the System** — "The system works by using one plugin (similar to
> multiplug) to call other plugins. However, unlike Multiplug it requires a config
> file, namely "plugins.ini"."

> `[Config]` keys: `TKPlugDir=` (folder for regular TK plugins) · `StdDllDir=`
> (standard DLLs) · `ActiveXDllDir=` (ActiveX DLLs) · `ShowStartupScreen=1|0`
> (choose which plugins to launch) · `LogErrors=1|0` (log file in the "Plugin"
> folder).

> Per-plugin sections `[MyPlugin.dll]` with keys: `Name=` · `Type=` — *"TKPlugin",
> "Standard Dll", or "ActiveX Dll"* · `CLSID=` — *"the kicker for VB Plugins…
> something like "ProjectName.ClassName""* · `EnabledByDefault=1|0` · `Author=` ·
> `AuthorEmail=`.

> "There are always section titles … `Setting=Value` … You can "comment" out a
> line with a ";"."

This is a *third* plugin-loading mechanism beyond the two ABIs in `plugins.md` §4
(COM `IDispatch`, and native `TKPlug*` exports): a **loader plugin** that reads
`plugins.ini` and dispatches to three plugin *types* (native TK plugin, plain
Win32 "standard DLL", and VB ActiveX DLL). It explains why the community could
write plugins in VB despite the engine being C++/Delphi, and why the ExtendedPlugin
SDK needed its own `Plugin` sub-folder in TK3 (per the Ask MrG answer above).

### 3.6 Battle-system design (adjacent, for E-79/E-80)

`bstut/bstut2.htm` — **"Battle System Tutorial Part One: Battle System Theory"**
by MrG and Triuken (snapshot `20040223002328`) — is a design/discussion piece on
writing a custom battle system for "the RPG Toolkit 2.0": styles (real-time vs
turn-based; FF6 "The Default and the Classic"), balancing, and implementation
advice. It is the prose that pairs with the stock battle-system plugin behaviour
in `plugins.md` §2, and it is MrG's own account of what the engine already gave
you ("Basically what we already have in the TK is what FF6 style is").

## 4. The main site — `mysticsoftware.net`

### 4.1 The RPG Code Shack, second copy (`code.php`)

The main host's `code.php` presents itself as "**Mystic Software / RPG Code
Shack**" and is *the same archive as MrG's Shack, re-hosted*: same seven
categories, same per-category listings, same individual description pages
(`code.php?mode=2&type=…&sort=…&id=…`), same "Submitted by / Size / Download /
Rating" layout. Its nav counts (2004–2015 captures) show the archive scale:

> Resources — **RPG Code (185), Plugins (30), Tilesets (68), Media (33),
> Animations (10), Miscellaneous (7), New Files (0)** · plus Articles, Interviews
> (1), FAQ (0), **Help (22), Tutorials (5), Miscellaneous (1)**.

The Plugins listing page adds a **Gold / Silver / Bronze / All** filter
(`code.php?type=plugins&preference=2`) — the same rating tiers as the Shack.

### 4.2 The 30-plugin catalogue with detail pages

`code.php?mode=2&type=plugins&sort=0&id=<N>` returns the per-plugin page (34 ids
were archived: **110–136, 147, 170, 171, 175, 201, 207, 211, 215, 269**). The
2004-era listing (30 names) is the *later* generation, and it adds half a dozen
plugins absent from the Shack `.js`:

| Id | Plugin (author) — from the detail pages |
| --- | --- |
| 110 | Adv RPGCode Plugin (BP) · 111 Dan's Misc Plugin (Dan) · 112 Dan's TBox (Dan) · 114 Erssy's Misc Plugin (Ersuis) · 115 FaeroSock (Faero) · 116 Flash Plugin (Triuken) · 117 FTP Plugin (kaptan) · 118 Juicy (MrG) · 119 Kaimu's Plugins (Kaimu) · 120 Misc Plugin Pack (MrG) · 121 Multi-D Arrays (BP) · 122 Multiplayer Plugin (Cyranoid) · 123 Multi-Plug (Awesome Computing, "only for TK2") · 125 NPC Control System (Wintermoon) · 126 Programmer's Plugin (Leuf) · 127 Read/Write Plugin (Leuf) · 128 Time/Date Plugin (BP) · 129 Triuken's Plugin Pack (Triuken) · 130 TWButton (Wintermoon) · 131 Vip Plugin Pak (Chris Reeves) · 132 XFMWin Plugin (Leuf) · 133 Delphi SDK (Triuken) · 134 ExtendedPlugin SDK (Triuken) · 135 VC++ SDK (Awesome Computing, v2.19) · 136 MFC Runtimes (Microsoft) |
| 147 | **Launch Any File** (KSNiloc) — VB plugin; "doesn't work too well with the TK3 … could pose a security risk" |
| 170 | **Never Fail R/W Plugin V2.2** (Aljo) — "nifty Append function and a split command" |
| 171 | **Edit Box Plugin V2.1** (Aljo) — "An Editbox is contained inside the TK window instead of floating around the screen" |
| 175 | **DragSound** (KSNiloc) — "access to DirectX's sound resources … play a midi and set it to loop … set the volume and pan of EACH wave" |
| 201 | **Sendback System** — RPGCode program, not a DLL ("a program used to send the player back to a safer place after he dies") *(miscategorised under Plugins on the site)* |
| 207 | **VB Mini-Game** (KSNiloc) — "a full-screen, mouse driven game in the form of a VB plugin … I have included the source" |
| 211 | **Resolution Changer** (KSNiloc) — "One day I saw a plea on the toolkitzone.com forums. A plea asking how to change the resolution during runtime. … By simply creating a new callback of sorts to a module in the source called 'reschanger.bas'" |
| 215 | **E-Mail Plugin** (KSNiloc) — "Have you ever felt the need to contact the player? Or maybe to allow the player to contact you?" |
| 269 | **Binary Read/Write Plugin** (KSNiloc) — "…none with the capability to binary operations 'Put' and 'Get'" |

The KSNiloc entries (147, 175, 207, 211, 215, 269) are a distinct late-era
plugin family, and 207/211 are notable because their *source* was shipped and
because 211 is explicitly a third-party response to a **toolkitzone.com forum**
request — a direct cross-link to the archive already in
`findings/03-toolkitzone.md`.

### 4.3 The payload mirror (crosswalk — bytes live here, not on the Shack)

The Shack's download links are relative (`files/juicy.zip`), and the Shack's own
`shack/files/` directory was **never crawled** (only four `.prg` are archived
there). But the *main host's* `/files/` directory is the same payload set under
the same names, and **99 archives survive** there (CDX `2004–2007`; e.g.
`juicy.zip`, `flashplug.zip`, `multiplug.zip`, `multip.zip`, `proplug.zip`,
`fileread.zip`, `gettimedate.zip`, `npcplugin.zip`, `ersmisc.zip`, `twbutton.zip`,
`xfmwinplugin.zip`, `FaeroSock.zip`, `KaimuPlugs.zip`, `VIPPluginPak2.zip`,
`Triukens_plugin.zip`, `danplugpack.zip`, `dantbox.zip`, `GsMiscPlugins.zip`,
`bps_adv_rpgcode_plugin.zip`, `multi-dim-array.zip` (404 at capture),
`delphisdk.zip`, `vcplussdk.zip`, `extendedplugin.zip`, `mfcruntimes.zip`,
`Aljoseditboxplugin2.zip`, plus method/menu/tileset archives and
`rpgexinstall.exe`). The bytes themselves are the `MysticFiles` sibling's lane; the
point for this report is the **mapping**, which is new: the Shack catalogue's
download names resolve to surviving archives in `mysticsoftware.net/files/`.
`/files/` has **no captured index page** — the mapping was reconstructed from the
Shack catalogue plus the `/games/`, `/resources/` and `/games_html/` listings.

### 4.4 `resources/`, `games/`, `reviews/`, `help.php`, news

* **`resources/`** (Apache index, 2008 mtimes, captured 2021–2023) — the site's
  user-upload directory: `NNN_name.zip|prg|txt|doc` submissions plus the same
  `tutorial.txt`, `battlesystemtutorial.txt`, `A-What-Not-Primar.txt`,
  `Setting Up VB SDK Plugins.txt`, `Classes In RPGCode.txt`, `tutorial.txt`,
  `index.htmold`. This is exactly the Shack `uploads/` content, re-hosted.
* **`games/`, `games/manuals/`, `games/patches/`** — Toolkit game downloads and
  patches; `games_html/` is the older (2003–2004) alphabetical game index with
  author/company/rating. No plugin content.
* **`reviews.php` + `reviews/reviews_N.htm`** — a *game* review database (Dark
  Age 98/100, Dust Ball 90/100, …) with reviewer names; **no plugin reviews**.
  `articles.php` (categories 0–4, ~27 articles) and `help.php` (22 articles) are
  RPGCode/how-to; only `help.php` articles **19** and **21** concern plugins.
* **News** (`index.php?mode=1`) records the TK 3.1.0 release (2007-10-01, "The
  engine has also been completely re-written in C++"), the server move and
  Xorlak/Spyder/Michael J. Hill as moderators — the site was a community hub, not
  the Toolkit vendor.
* **`library.htm` / `library/rpgc_manual/chapter1.htm`** — the 2002-era
  "MS.net" library shell and an early RPGCode manual chapter (pre-dating the
  3.x help recovered last round).

## 5. `tkcommunity.mysticsoftware.net`

A **member portal**, run by Matt72186 (Matt / Michael J. Hill) from 2002 after
"Bracken's service to his faith". Query-driven pages: `?rid=1` news, `?rid=2`
humor list, `?rid=2&id=N` a humor item, `?rid=3` **Community List** (username,
contact, game, site, join date), `?rid=3&uid=N` a member profile, `?rid=4`
signup, `?rid=9&uid=N` private inbox ("You cannot access this page"). The
member list includes the Toolkit's own names — **MrG** (game "Zeo-K", site
"RPGCode Shack"), Cyranoid, Ersuis, kaptan, Matt72186, Michael J. Hill, TK Game
Boy, Xontu, Moonews. Static pages `humor.html` and `tkcommunity1/2/5/6/7/9.html`
hold poems/jokes. **No plugin or extension-API content at all** — this host adds
community context (who the plugin authors were, what they were building) and
nothing technical.

## 6. `tkgr.mysticsoftware.net` (Toolkit Game Reviews)

A game-review site made "with the great help of MysticSoftware" by a French
reviewer (`index2.html`: "i'm trying … to review every single game in our beloved
community"). Structure: `1stargames.html` … `5stargames.html` (star ratings),
`3starCDE/FGH/IJK/LMN/RST/UVW.html` (3-star pages split alphabetically),
`classics.html`, `othergames.html`, `interactivity.html` (a reader-submission
scheme: 1–10 per category, /100 overall), `awards.html` + `awards/2001/`,
`awards/2002/`, `tkgp/` (Toolkit Game Project pages). **It reviews games only**
(5★: Dark Age, Deceit and Conquest, Dustball; 4★: Crystal of Souls, Godiva:
Alpha, Fourth Dimension, Friends And Enemies, Platinum Blade, Warrior Legends…).
Awards had category prizes — "THE ORIGINALITY / GRAPHICS / STORY / GAMEPLAY / FUN
AWARD" plus a "SPECIAL PRIZE" and a "SPECIAL PUBLIC AWARD". The site was
originally at `www.mysticsoftware.net/tkgr/` before getting its own sub-domain.
**Nothing about plugins.**

## 7. What each site adds to `plugins.md`

| Site | Adds |
| --- | --- |
| **MrG's Shack** | A **third plugin catalogue** (28–30 entries, reviewed descriptions, authors, sizes, download names, ratings) — disjoint from the 15 `rpgtoolkit.net` and 40 `toolkitzone` lists and covering the **SDK** line (VC++ v2.19, Delphi, ExtendedPlugin) as "plugins". **And, uniquely, the RPGCode commands each plugin added** (`plugfuncs[]`, §3.2). The **only plugin *user* documentation**: install steps, "What is a plugin?", the method-not-found and XP/TK3 compatibility answers. Also the Shack's own **file taxonomy** (7 categories + "New Files") with per-category definitions. |
| **Main `code.php`** | The **same catalogue re-hosted** with a published scale (Plugins 30 / RPG Code 185 / …) and **34 per-plugin detail pages**, six of them a late **KSNiloc** family not in the Shack `.js`. |
| **Main `help.php`** | The **`plugins.ini` loader spec** ("Setting UP VB Plugins", KSNiloc) — the documentation for the ExtendedPlugin/ActiveX mechanism — and the duplicate "Setting Up Plugins" install guide. |
| **Main `/files/`** | The **payload mirror**: the Shack catalogue's download names resolve to ~99 surviving `mysticsoftware.net/files/*.zip` archives (byte-recovery is the payload sibling's job, not done here). |
| **`tkcommunity`** | Nothing technical (member/humor portal) — but it confirms the plugin authors as community members. |
| **`tkgr`** | Nothing about plugins (games only). |

Concretely, four things should fold back into `plugins.md`/`findings/06`:

1. **The engine plugin limit is five** (`tkplug0..4`), and the community's
   workaround was the Multi-Plug loader (TK2 only).
2. **A third plugin-loading ABI existed** — a loader plugin + `plugins.ini`
   dispatching to `TKPlugin` / `Standard Dll` / `ActiveX Dll` types (VB), which
   is how the "any language can be used" claim was realised for VB specifically.
3. **The install contract** (`Plugin/` folder, `tkplugN.dll` naming, "Use Plugin
   N" in the Main File Editor) is now documented from the user side, matching
   `docs/engine-features.md` E-99 and `docs/editor-features.md` T-14.
4. **A per-plugin RPGCode command inventory** (`plugfuncs[]`, §3.2) — ~135 named
   commands across 19 plugins, the concrete list of what community plugins added
   to the language, i.e. the acceptance set for a rebuilt extension point.

## Gaps / not recovered

* **The Shack's own payload directory** (`mrgoldsoft…/shack/files/*.zip`) was
  never crawled — only four `.prg` are archived there. The equivalent bytes
  survive in `mysticsoftware.net/files/` (§4.3), but a handful of Shack download
  names have **no matching archived archive** (`zelda2.zip`, `atomic.zip`,
  `dragbattle2.zip`, `blackmagic.zip`, `cgxbattlesystem.zip`, `Stringplugin.zip`,
  `selda…`, most `content1/2/3/5` battle/menu/mwin/misc zips) — they were never
  captured under either path.
* **`/files/` has no captured index page**; the Shack↔`/files/` mapping is
  reconstructed from catalogue download names + CDX URL space, not from a listing.
* **Sidecar collapse.** `wb3.py`'s meta filename uses `os.path.splitext`, which
  truncated at the first `.` inside `…code.php…`/`…help.php…`, so the **34
  `code.php?mode=2` and the `help.php?article=` sidecars overwrote one another**.
  All content is on disk; their provenance in this report is rebuilt from the CDX
  timestamps (the `…id_/` URLs above) rather than from a `.json`.
* **Two pages 404 on replay** (self-inflicted, harmless): `www…/REVIEWS/reviews_1.htm`
  and `library/FAQS/lionhearts_faq.htm` — captured as 404s; the `/reviews/reviews_1.htm`
  equivalent *was* fetched.
* **Comment/PM threads and the Shack's own `askmrg.txt`** (the CGI answer store at
  `/cgi-bin/cgiemail/mrgoldsoft/shack/askmrg.txt`) are not archived — only the
  inline-answer `askmrg.htm` snapshot survives.
* **`code.php` per-plugin detail pages for ids < 110 and the 3-star/ratings
  variants** may exist but were not enumerated; the 34 captured ids cover the
  named set fully.
* **The VB SDK kit's own bytes and full docs** remain missing (as in
  `plugins.md` §4/§6); the `plugins.ini` spec above is the best surviving
  documentation of that mechanism, but not the kit.
* **The Shack's rating rubric** (what made a file "Gold") is implied by the
  Gold/Silver/Bronze/Unrated tiers but never spelled out in any captured page.
