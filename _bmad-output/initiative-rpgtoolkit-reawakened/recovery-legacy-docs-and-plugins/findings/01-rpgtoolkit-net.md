# rpgtoolkit.net — the community plugin catalogue, manuals and tutorials

Recovery target: the *community* site `rpgtoolkit.net` (run by Phil Carty; first archived
February 2011, gone by mid-2016) as archived by the Internet Archive Wayback
Machine. Output feeds the clean-room rebuild in `rpgtoolkit-reawakened`:
plugin/script-function documentation for the `extend` catalogue, the on-site
manuals and tutorials, and whatever plugin binaries survived.

Clean-room note (G7): only documentation, manual, readme, changelog and help
material was read out of these captures. No legacy source file (`*.bas`, `*.vb`,
`*.cpp`, `*.h`, `*.frm`, `*.cls`) was opened from the archive or from
`../rpgtoolkit`, and the legacy source tree was never read. The raw captures are
kept in the git-ignored `fixtures/archaeology/rpgtoolkit-net/` cache; the only
tracked artefact is this report.

Report date: 2026-10-11.

## Summary

- **Plugins:** 15 detail pages recovered in full (name, author, release date, view/download/comment/like counters, verbatim summary + About, all three tab bodies). Only **1 of 15** has a populated Reference tab (`jackyboys-misc`, 25 functions); 2 more document their commands in the About tab (`xlibio`, `time-date`). One further plugin (`Enemy Info`, jackyboy, 29 comments) and one further method (`Brenthenry's Methodpack`) are known by name only — never archived.
- **Rest of `extend`:** 14 more items recovered in full (2 classes, 2 methods, 4 "other" engines/systems, 6 utilities including the VB6 and C++ plugin SDKs).
- **Listing pages:** 9 `/extend/plugins` index captures + 37 tag pages + every category listing are **empty shells** — the catalogue is filled by `?ajax=true` JSON no crawler ever fetched (proved from the site's own `rpgtk.js`). So the plugin *set* is reconstructed from the CDX URL space, and the tag→plugin mapping is lost.
- **Manuals:** the Toolkit **3 (3.1.0)** help manual, 33 of 34 pages (`pagesearch.htm` never archived), including the **complete RPGCode function reference: 262 functions** with signatures and descriptions → machine-readable extract at `fixtures/archaeology/rpgtoolkit-net/manual/function-reference.json`.
- **Tutorials:** 20 articles + 6 index/category pages, the largest being `Marz's RPG Code Tutorial` (137.9K chars of text).
- **Binaries:** **1 of 29** known plugin payloads survived — `vault/object/4305.zip` (the TK310 C++ SDK, 54,528 bytes). Everything else (`/vault/object/<id>.zip`, `/vault/files/`, `/fileman/files/*.zip`) is gone; the old toolkit releases under `/vault/toolkit/releases/` are 500-error captures only.
- **Bonus:** the pre-2011 `rpgtoolkit.com` downloads page (captured on the `www.` vhost, with the full TK1/TK2/TK3 distribution list), the site's `rpgtk.js` (which explains all the empty listings), and a 7.3 MB Toolkit executable behind `/software/download/` (flagged to the DistDocs workstream).

## Method

CDX enumeration (all via `fixtures/archaeology/wb.py cdx <url> --match prefix`,
no `--collapse`, results stored under `fixtures/archaeology/rpgtoolkit-net/_cdx/`):

| CDX query | rows | file |
| --- | --- | --- |
| `rpgtoolkit.net/extend/plugins` (prefix) | 222 | `_cdx/plugins.txt` |
| `rpgtoolkit.net/extend` (prefix) | 526 | `_cdx/extend.txt` |
| `rpgtoolkit.net/manual` (prefix) | 286 | `_cdx/manual.txt` |
| `rpgtoolkit.net/tutorials` (prefix) | 778 | `_cdx/tutorials.txt` |
| `rpgtoolkit.net/software` (prefix) | 1 | `_cdx/software.txt` (plus three targeted follow-ups: `/software/`, `/software/manual`, `www.rpgtoolkit.net/software`) |
| `rpgtoolkit.net/fileman` (prefix) | 4 | `_cdx/fileman.txt` |
| `rpgtoolkit.net/vault` (prefix) | 628 | `_cdx/vault.txt` |
| `rpgtoolkit.net/vault/object` (prefix) | 2 | `_cdx/vaultobject.txt` |
| `rpgtoolkit.net/vault/files` (prefix) | 0 | `_cdx/vaultfiles.txt` (empty) |
| `rpgtoolkit.net/download` (prefix) | 31 | `_cdx/download.txt` |
| `rpgtoolkit.net/static` (prefix, `original:.*rpgtk\.js.*` filter) | 10+ | used for `static/rpgtk.js?1` (§5.5) |

Total: 2,478 CDX rows enumerated across the queries above minus the follow-ups.

Fetching used two local drivers: `wb.py get` (CDX → snapshot) and
`fixtures/archaeology/drive2.py`, which builds the
`https://web.archive.org/web/<ts>id_/<original>` URL directly (raw, unrewritten
bytes — no Wayback banner), skips files already on disk, and retries through
`ECONNREFUSED` windows (the replay endpoint refused connections intermittently
for the whole session; every fetched row is in `_cdx/manifest.jsonl` /
`manifest-bins.jsonl`, failures are listed under *Gaps*).

Page parsing/analysis helpers (local, git-ignored): `flatten.py` (HTML → text),
`parse_item.py` (item-page metadata + tab bodies), `aggregate.py` (per-plugin
digest), `report_data.py` (manual/tutorial inventory).

Nothing was fetched through a browser: plain HTTP only.

## Provenance

Every factual claim below traces to a row in this table. "Captured" is the date
the bytes were pulled from the Wayback Machine (2026-10-11 for everything
retrieved in this pass). Confidence is `high` where the snapshot is a 200 `text/html`
capture of the page in question and the field is present verbatim in the bytes.

### Plugin detail pages (one row per plugin, the newest snapshot used for the entry)

| Item | Wayback snapshot URL | Captured | Confidence | Notes |
| --- | --- | --- | --- | --- |
| `32-bit-image-support` | https://web.archive.org/web/20120917213652id_/http://rpgtoolkit.net/extend/plugins/32-bit-image-support | 2026-10-11 | high | `extend-plugins-32-bit-image-support.20120917213652.html`; 3 snapshots (2012-06-15, 2012-06-17, 2012-09-17) |
| `adapter` | https://web.archive.org/web/20120719162039id_/http://rpgtoolkit.net/extend/plugins/adapter | 2026-10-11 | high | `extend-plugins-adapter.20120719162039.html`; 3 snapshots (2012-05-18, 2012-05-20, 2012-07-19) |
| `bitmap-fonts` | https://web.archive.org/web/20141119220640id_/http://rpgtoolkit.net/extend/plugins/bitmap-fonts/ | 2026-10-11 | high | `extend-plugins-bitmap-fonts.20141119220640.html`; only capture |
| `default-battle-system-patch` | https://web.archive.org/web/20120116141900id_/http://rpgtoolkit.net/extend/plugins/default-battle-system-patch | 2026-10-11 | high | `extend-plugins-default-battle-system-patch.20120116141900.html`; only capture |
| `default-menu-patch` | https://web.archive.org/web/20150921074659id_/http://rpgtoolkit.net/extend/plugins/default-menu-patch/ | 2026-10-11 | high | `extend-plugins-default-menu-patch.20150921074659.html`; 2 snapshots (2014-11-19, 2015-09-21) |
| `fmod-audio` | https://web.archive.org/web/20150921005007id_/http://rpgtoolkit.net/extend/plugins/fmod-audio/ | 2026-10-11 | high | `extend-plugins-fmod-audio.20150921005007.html`; 3 snapshots (2011-05-04, 2011-08-30, 2015-09-21) |
| `http` | https://web.archive.org/web/20120719161206id_/http://rpgtoolkit.net/extend/plugins/http | 2026-10-11 | high | `extend-plugins-http.20120719161206.html`; 3 snapshots |
| `item-data` | https://web.archive.org/web/20120719161258id_/http://rpgtoolkit.net/extend/plugins/item-data | 2026-10-11 | high | `extend-plugins-item-data.20120719161258.html`; 3 snapshots |
| `jackyboys-misc` | https://web.archive.org/web/20150921074704id_/http://rpgtoolkit.net/extend/plugins/jackyboys-misc/ | 2026-10-11 | high | `extend-plugins-jackyboys-misc.20150921074704.html`; 2 snapshots (2011-05-04, 2015-09-21); both carry the Reference tab |
| `menu-help` | https://web.archive.org/web/20150921074709id_/http://rpgtoolkit.net/extend/plugins/menu-help/ | 2026-10-11 | high | `extend-plugins-menu-help.20150921074709.html`; 3 snapshots |
| `online-support` | https://web.archive.org/web/20150921005012id_/http://rpgtoolkit.net/extend/plugins/online-support/ | 2026-10-11 | high | `extend-plugins-online-support.20150921005012.html`; 3 snapshots fetched of 10 in the CDX |
| `read-xml` | https://web.archive.org/web/20120719161837id_/http://rpgtoolkit.net/extend/plugins/read-xml | 2026-10-11 | high | `extend-plugins-read-xml.20120719161837.html`; 3 snapshots |
| `time-date` | https://web.archive.org/web/20150921005017id_/http://rpgtoolkit.net/extend/plugins/time-date/ | 2026-10-11 | high | `extend-plugins-time-date.20150921005017.html`; 3 snapshots |
| `xlibio` | https://web.archive.org/web/20150921005022id_/http://rpgtoolkit.net/extend/plugins/xlibio/ | 2026-10-11 | high | `extend-plugins-xlibio.20150921005022.html`; 2 snapshots (2014-12-25, 2015-09-21) |
| `xlibtimers` | https://web.archive.org/web/20150707202609id_/http://rpgtoolkit.net/extend/plugins/xlibtimers/ | 2026-10-11 | high | `extend-plugins-xlibtimers.20150707202609.html`; 2 snapshots (2015-07-06, 2015-07-07) |

### Index, listing, manual, tutorial and asset captures

| Item | Wayback snapshot URL | Captured | Confidence | Notes |
| --- | --- | --- | --- | --- |
| Plugin index `/extend/plugins` (9 captures, all shells) | https://web.archive.org/web/20110506150536id_/http://rpgtoolkit.net/extend/plugins | 2026-10-11 | high | `extend-plugins.20110506150536.html`, `.20110830021604`, `.20120518210826`, `.20120618094240`, `.20140106004543`, `.20141109043150`, `.20150706201237`, `.20150707171243`, `.20150921005001` (all `.html`) |
| `extend/classes/array` | https://web.archive.org/web/20120719163526id_/http://rpgtoolkit.net/extend/classes/array | 2026-10-11 | high | `extend-classes-array.20120719163526.html`; 2 captures |
| `extend/classes/item-list-system` | https://web.archive.org/web/20120719163955id_/http://rpgtoolkit.net/extend/classes/item-list-system | 2026-10-11 | high | `extend-classes-item-list-system.20120719163955.html`; 2 captures |
| `extend/methods/marzs-methodpack` | https://web.archive.org/web/20120719163139id_/http://rpgtoolkit.net/extend/methods/marzs-methodpack | 2026-10-11 | high | `extend-methods-marzs-methodpack.20120719163139.html` |
| `extend/methods/ocs-spritesheet-library` | https://web.archive.org/web/20120719174711id_/http://rpgtoolkit.net/extend/methods/ocs-spritesheet-library | 2026-10-11 | high | `extend-methods-ocs-spritesheet-library.20120719174711.html` |
| `extend/other/ctshop` | https://web.archive.org/web/20141120150828id_/http://rpgtoolkit.net/extend/other/ctshop/ | 2026-10-11 | high | `extend-other-ctshop.20141120150828.html` |
| `extend/other/dungeon-master-example` | https://web.archive.org/web/20120719164008id_/http://rpgtoolkit.net/extend/other/dungeon-master-example | 2026-10-11 | high | `extend-other-dungeon-master-example.20120719164008.html` |
| `extend/other/platform-engine` | https://web.archive.org/web/20150921074641id_/http://rpgtoolkit.net/extend/other/platform-engine/ | 2026-10-11 | high | `extend-other-platform-engine.20150921074641.html` |
| `extend/other/zelda-bs-aurum34s-mod` | https://web.archive.org/web/20110928085857id_/http://rpgtoolkit.net/extend/other/zelda-bs-aurum34s-mod/ | 2026-10-11 | high | `extend-other-zelda-bs-aurum34s-mod.20110928085857.html` |
| `extend/utilities/c-plugin-sdk` | https://web.archive.org/web/20120818040240id_/http://rpgtoolkit.net/extend/utilities/c-plugin-sdk | 2026-10-11 | high | `extend-utilities-c-plugin-sdk.20120818040240.html` |
| `extend/utilities/notepad-autocomplete-and-syntax-files` | https://web.archive.org/web/20150708112808id_/http://rpgtoolkit.net/extend/utilities/notepad-autocomplete-and-syntax-files | 2026-10-11 | high | `extend-utilities-notepad-autocomplete-and-syntax-files.20150708112808.html` |
| `extend/utilities/racegen` | https://web.archive.org/web/20150707202618id_/http://rpgtoolkit.net/extend/utilities/racegen/ | 2026-10-11 | high | `extend-utilities-racegen.20150707202618.html` |
| `extend/utilities/rpg-helper` | https://web.archive.org/web/20150706222559id_/http://rpgtoolkit.net/extend/utilities/rpg-helper | 2026-10-11 | high | `extend-utilities-rpg-helper.20150706222559.html` |
| `extend/utilities/vb6-plugin-sdk` | https://web.archive.org/web/20111010080702id_/http://rpgtoolkit.net/extend/utilities/vb6-plugin-sdk/ | 2026-10-11 | high | `extend-utilities-vb6-plugin-sdk.20111010080702.html` |
| `extend/utilities/wordname-generator` | https://web.archive.org/web/20150707202627id_/http://rpgtoolkit.net/extend/utilities/wordname-generator/ | 2026-10-11 | high | `extend-utilities-wordname-generator.20150707202627.html` |
| `/extend` landing page, 2016 (the only server-rendered listing) | https://web.archive.org/web/20160309113334id_/http://rpgtoolkit.net/extend/ | 2026-10-11 | high | `extend/extend.20160309113334.html` (also `extend.20160126083016.html`) — source of §2.1 |
| Tag listing pages (shells) | https://web.archive.org/web/20150708035005id_/http://rpgtoolkit.net/extend/plugins/tags/canvas/ | 2026-10-11 | high | `extend-plugins-tags-canvas.20150708035005.html`, `…-tags-patch.20150708035325.html`, `…-tags-battles.20110508014134.html`; `#content` is 78 bytes in all three |
| Site routing/AJAX JavaScript | https://web.archive.org/web/20110814201437id_/http://rpgtoolkit.net/static/rpgtk.js?1 | 2026-10-11 | high | `site-assets/static-rpgtk.js` (256,972 bytes) — source of §5.5 |
| Manual set: `index.htm`, `page1–page31`, `page4.2`, `page18.3`, `pageed_environment`, `pageed_background` (33 URLs, 39 captures) | https://web.archive.org/web/20160530223422id_/http://rpgtoolkit.net/manual/page19.htm | 2026-10-11 | high | `manual/manual-*.htm*`; `page19` = function reference, captured 2016-05-30 |
| Manual, earliest captures (version check) | https://web.archive.org/web/20120617003512id_/http://rpgtoolkit.net/manual/page1.htm | 2026-10-11 | high | `manual/manual-page1.20120617003512.htm` (+ `manual-index.20151021020237.htm` and the 2012/2015 early captures) |
| Manual support files | https://web.archive.org/web/20130420032447id_/http://rpgtoolkit.net/manual/js.js | 2026-10-11 | high | `site-assets/manual-js.20130420032447.js`, `site-assets/manual-css.20130420032447.css` |
| Manual images (`image1`, `image20` samples) | https://web.archive.org/web/20130420032452id_/http://rpgtoolkit.net/manual/images/image1 | 2026-10-11 | high | `site-assets/manual-images-image1.20130420032452.html` — HTML catch-all, not an image (§5.4) |
| Tutorial articles + category pages (20 articles, 6 index/category pages) | https://web.archive.org/web/20160220053340id_/http://rpgtoolkit.net/tutorials/coding/creating-a-turn-based-battle-system | 2026-10-11 | high | `tutorials/tutorials-*.html` (31 files) |
| Tutorial index (shell) | https://web.archive.org/web/20110219053920id_/http://rpgtoolkit.net/tutorials/ | 2026-10-11 | high | `tutorials/tutorials.20110219053920.html`, `tutorials.20160314143315.html` — 2,171/1,771 chars, empty `#content` |
| `Lotusware's Pixel Art Tutorial` (newest capture is a shell) | https://web.archive.org/web/20150702205957id_/http://rpgtoolkit.net/tutorials/graphics/lotuswares-pixel-art-tutorial | 2026-10-11 | high | `tutorials/tutorials-graphics-lotuswares-pixel-art-tutorial.20150702205957.html` (46,485 bytes); the 2016-03-13 capture is a 283-char shell |
| Download redirect probes (30 `/download/N/` + 3 `/fileman/files/*.zip` + 1 `/fileman.php` + 2 `/vault/object/*`) | https://web.archive.org/web/20110506001035id_/http://rpgtoolkit.net/download/54/ | 2026-10-11 | high | `downloads/*.redirect.html` + `.meta.json` (`location` recorded); index in `_cdx/manifest-bins.jsonl` |
| Surviving payload: C++ Plugin SDK | https://web.archive.org/web/20150429170536id_/http://rpgtoolkit.net/vault/object/4305.zip | 2026-10-11 | high | `downloads/vault-object-4305.zip.20150429170536.redirect.html` (54,528 bytes, real ZIP; `unzip -l` in §5.1). Licence text extracted to `/tmp/tk310sdk` for reading, not committed |
| `/vault/object/*` payload enumeration | https://web.archive.org/cdx/search/cdx?url=rpgtoolkit.net%2Fvault%2Fobject&matchType=prefix | 2026-10-11 | high | `_cdx/vaultobject.txt` — exactly 2 rows (`2516.PNG` 403, `4305.zip` 200) |
| `/software/manual/` redirect into the manual | https://web.archive.org/web/20110301031754id_/http://rpgtoolkit.net/software/manual/ | 2026-10-11 | high | `software/manual-20110301031754.redirect.html` (8,956 bytes, `<title>RPGToolkit Help —`) |
| `/software/` + `/software/faq/` pages | https://web.archive.org/web/20110219053618id_/http://rpgtoolkit.net/software/ | 2026-10-11 | high | `software/software.20110219053618.html`, `software/faq.20110228234845.html` — shells |
| `/software/download/` payload | https://web.archive.org/web/20110219053622id_/http://rpgtoolkit.net/software/download/ | 2026-10-11 | high | `software/download.20110219053622.redirect.html` — PE32 Windows GUI executable, 7,363,646 bytes (§5.3) |
| `www.rpgtoolkit.net/downloads.html` (pre-2011 host; the old rpgtoolkit.com downloads page) | https://web.archive.org/web/20050217114219id_/http://www.rpgtoolkit.net/downloads.html | 2026-10-11 | high | `downloads/downloads.html.20050217114219.redirect.html` (13,191 bytes, 200 in CDX) — source of §3.5 |
| `Enemy Info` (CND query, zero rows) | https://web.archive.org/cdx/search/cdx?url=rpgtoolkit.net%2Fextend%2Fplugins%2Fenemy-info&matchType=prefix | 2026-10-11 | high | empty result — the page was never archived |
| `Brenthenry's Methodpack` (CDX query, zero rows) | https://web.archive.org/cdx/search/cdx?url=rpgtoolkit.net%2Fextend%2Fmethods%2Fbrenthenrys-methodpack&matchType=prefix | 2026-10-11 | high | empty result — known only from the 2016 landing page |
| `/manual/pagesearch.htm` (404s only) | https://web.archive.org/web/20120621043618id_/http://rpgtoolkit.net/manual/pagesearch.htm | 2026-10-11 | high | CDX rows are 404 (5 captures) — never archived |

## 1. The `extend/plugins` catalogue

### 1.1 How the catalogue can (and cannot) be recovered

The plugin **detail pages** are server-rendered and complete: title, author,
release date, view/download counters, the short summary, and the three
`1. About / 2. Reference / 3. Examples` tab bodies are all in the HTML.

The plugin **listing pages** are not. In every capture of
`/extend/plugins` (2011-05-06 … 2015-09-21) the content container is literally
empty:

```html
<div id="content" class="subcontent"></div>   <div class="clear"></div>
```

The same is true of the sub-section listings (`/extend/classes`,
`/extend/methods`, `/extend/other`, `/extend/utilities`) and of the tag pages
(`/extend/plugins/tags/<tag>/`). The site filled those lists client-side from a
`?<token>&ajax=true` endpoint — the CDX proves the pattern exists on this site
(`http://rpgtoolkit.net/tutorials/graphics?im453t83&ajax=true` is archived as a
302) but no `ajax=true` capture was ever taken for the plugin listings. So the
**plugin set has to be reconstructed from the CDX URL space**, which is what
section 1.2 does; the tag→plugin mapping (section 1.5) is consequently
recoverable only from the tag URLs' own slugs, not their contents.

The comment threads are in the same boat: the count is rendered server-side
("34 comments have been written") but the thread itself is loaded into
`<div id="ocm" class="oid-48">` after page load, so no comment text survives.
Only the Web Archive's own crawl of a `/comments/`-style endpoint would have it,
and no such capture exists.

### 1.2 The plugin set

Fifteen plugin detail pages exist in the CDX for `/extend/plugins/*`, listed with
the newest capture used. All fifteen were recovered as full HTML.

| Plugin | Slug | Author (member) | Released | Views / Downloads (at capture) | Comments / Likes | Tags | Download id | Local page |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 32-bit Image Support | `32-bit-image-support` | Shao (`shao`) | 2007-05-11 | 591 / 387 (2012-09) | 12 / 5 | not recovered | `download/55/` | `extend/extend-plugins-32-bit-image-support.20120917213652.html` |
| Adapter | `adapter` | John@aljo (`johnaljo`) | 2006-04-05 | 263 / 144 (2012-07) | 1 / 2 | not recovered | `download/57/` | `extend/extend-plugins-adapter.20120719162039.html` |
| Bitmap Fonts | `bitmap-fonts` | Khin (`khin`) | 2010-11-14 | 821 / 366 (2014-11) | 11 / 2 | not recovered | `download/41/` | `extend/extend-plugins-bitmap-fonts.20141119220640.html` |
| Default Battle System Patch | `default-battle-system-patch` | jackyboy | 2009-02-21 | 477 / 312 (2012-01) | 12 / 3 | not recovered | `download/51/` | `extend/extend-plugins-default-battle-system-patch.20120116141900.html` |
| Default Menu Patch | `default-menu-patch` | jackyboy | 2009-06-03 | 3,098 / 951 (2015-09) | 26 / 13 | not recovered | `download/50/` | `extend/extend-plugins-default-menu-patch.20150921074659.html` |
| FMod Audio | `fmod-audio` | Oyerth (`oyerth`) | 2008-08-08 | 2,818 / 1,329 (2015-09) | 15 / 14 | not recovered | `download/54/` | `extend/extend-plugins-fmod-audio.20150921005007.html` |
| HTTP | `http` | furyX639 (`furyx639`) | 2009-01-28 | 346 / 148 (2012-07) | 18 / 7 | not recovered | `download/52/` | `extend/extend-plugins-http.20120719161206.html` |
| Item Data | `item-data` | Sander (`sander`) | 2006-05-08 | 1,589 / 1,112 (2012-07) | 6 / 1 | not recovered | `download/56/` | `extend/extend-plugins-item-data.20120719161258.html` |
| Jackyboy's Misc | `jackyboys-misc` | jackyboy | 2009-09-14 | 2,372 / 752 (2015-09) | 34 / 14 | not recovered | `download/48/` | `extend/extend-plugins-jackyboys-misc.20150921074704.html` |
| Menu Help | `menu-help` | jackyboy | 2009-06-06 | 3,658 / 1,201 (2015-09) | 25 / 16 | not recovered | `download/49/` | `extend/extend-plugins-menu-help.20150921074709.html` |
| Online Support | `online-support` | William (`william`) | 2012-06-01 | 3,175 / 621 (2015-09) | 37 / 10 | not recovered | `download/4789/` | `extend/extend-plugins-online-support.20150921005012.html` |
| Read XML | `read-xml` | xavero (`xavero`) | 2009-10-04 | 191 / 92 (2012-07) | 7 / 4 | not recovered | `download/47/` | `extend/extend-plugins-read-xml.20120719161837.html` |
| Time & Date | `time-date` | playsoon (`playsoon`) | 2014-07-22 | 665 / 119 (2015-09) | 1 / 0 | not recovered | `download/5605/` | `extend/extend-plugins-time-date.20150921005017.html` |
| xLib.IO | `xlibio` | Xavier (`xavier`) | 2014-07-22 | 1,108 / 189 (2015-09) | 0 / 2 | not recovered | `download/5606/` | `extend/extend-plugins-xlibio.20150921005022.html` |
| xLib.Timers | `xlibtimers` | Xavier (`xavier`) | 2010-04-22 | 654 / 260 (2015-07) | 9 / 3 | not recovered | `download/44/` | `extend/extend-plugins-xlibtimers.20150707202609.html` |

"Tags: not recovered" means the mapping exists only on the tag listing pages,
which are client-side shells (section 1.1). "Download id" is the `/download/<id>/`
redirect target of the page's Download button; whether the bytes behind it
survived is section 5.

#### `32-bit-image-support` — 32-bit Image Support

Author Shao (`member/shao/`), released May 11th, 2007. Captured at
`20120917213652` (also 2012-06-15, 2012-06-17): viewed 548 → 591, downloaded
367 → 387, 12 comments, 5 likes. Download `download/55/`.

> Improves the graphic capabilities when drawing images, including alpha channels and hundreds of file formats.

About tab:

> This plugin greatly improves the toolkit's abilities in setting images to the screen. It includes support for over a hundred different formats, supports alpha channels, and comes with the ability to accomplish many different effects in only fractions of a second!
>
> This is definitely a must-have plugin for anyone who wants to accomplish rich graphical effects in their toolkit game.
>
> Please note this plugin uses DLLs that disallow any game that uses it to be distributed commercially! Non-commercial use only.

Reference / Examples tabs: empty in every capture. The licence caveat is worth
carrying into the rebuild notes: this plugin wraps third-party DLLs whose terms
forbid commercial distribution (relevant to G6 packaging decisions, not to the
clean-room implementation itself).

#### `adapter` — Adapter

Author John@aljo (`member/johnaljo/`), released April 5th, 2006. Captured at
`20120719162039` (also 2012-05-18, 2012-05-20): viewed 253 → 263, downloaded
141 → 144, 1 comment, 2 likes. Download `download/57/`.

> Lets you run external programs from within your game.

About tab:

> Provides a pretty simple, but very useful, functionality in the way of the command execute(command$) which allows you to run any external program.

Reference / Examples tabs: empty. The one documented command is quoted verbatim
above: `execute(command$)`.

#### `bitmap-fonts` — Bitmap Fonts

Author Khin (`member/khin/`), released November 14th, 2010. Captured at
`20141119220640` (only capture): viewed 821, downloaded 366, 11 comments,
2 likes. Download `download/41/`.

> Create and use stylised bitmap fonts to really give your game a distinct look.

About tab:

> Comes with a fantastic 13-page manual guiding you through all the commands with example code.

Reference / Examples tabs: empty. The 13-page manual is inside the download, not
on the site.

#### `default-battle-system-patch` — Default Battle System Patch

Author jackyboy, released February 21st, 2009. Captured at `20120116141900`
(only capture): viewed 477, downloaded 312, 12 comments, 3 likes. Download
`download/51/`.

> Fixes several bugs within the default battle system.

About tab:

> For anyone who uses the default battle system, this plugin fixes several issues including: the infamous "item not found" bug, displays the player's name variable for player name, and the issue where the enter key was too responsive.

Reference / Examples tabs: empty.

#### `default-menu-patch` — Default Menu Patch

Author jackyboy, released June 3rd, 2009. Captured at `20150921074659` (also
2014-11-19): viewed 3,098, downloaded 951, 26 comments, 13 likes. Download
`download/50/`.

> Fixes the item bugs in the default menu, plus adds some new functionality too.

About tab:

> If you use the default menu system then this plugin is a must have. It's identical to default menu, but with some changes that fix the item bugs. Be sure to read the included pdf as some new functionality was added as well.

Reference / Examples tabs: empty (the new commands are documented in the included
PDF).

#### `fmod-audio` — FMod Audio

Author Oyerth (`member/oyerth/`), released August 8th, 2008. Captured at
`20150921005007` (also 2011-05-04, 2011-08-30): viewed 1,268 → 2,818, downloaded
940 → 1,329, 14 → 15 comments, 11 → 14 likes. Download `download/54/`.

> Massive array of new audio capabilities, such as playing multiple files at the same time and fade effects.

About tab:

> Introduces new audio capabilities for the Toolkit. Supporting a total of 22 file types, this plugin provides 24 audio related commands allowing you to, in short, play multiple sounds at the same time, group sounds, apply audio effects, fade outs, individual volumes and pausing. It also comes complete with documentation providing summaries of all commands to get you started.

Reference / Examples tabs: empty in both templates. The "24 audio related
commands" are documented only inside the package.

#### `http` — HTTP

Author furyX639 (`member/furyx639/`), released January 28th, 2009. Captured at
`20120719161206` (also 2012-05-18, 2012-05-20): viewed 329 → 346, downloaded
145 → 148, 18 comments, 7 likes. Download `download/52/`.

> Lets you make HTTP requests, letting you load a webpage or upload a file.

About tab:

> Allows you to make HTTP requests from the RPG Toolkit. You can load a page using getURL or upload a file using putURL. Also includes the added ability to store and retrieve text from the clipboard. Download has sample PHP scripts that show you how to make the plugin communicate with your web server.

Reference / Examples tabs: empty. Commands named in the prose verbatim:
`getURL`, `putURL`.

#### `item-data` — Item Data

Author Sander (`member/sander/`), released May 8th, 2006. Captured at
`20120719161258` (also 2011-05-04, 2011-10-10, 2012-05-18, 2012-05-20): viewed
1,550 → 1,589, downloaded 1,102 → 1,112, 6 comments, 1 like. Download
`download/56/`.

> Gain access to all the item data that was previously unavailable.

About tab:

> Introduces 24 new functions, each returning one of the variables of an item such as if it's equipable or if it's a key item. Very handy addition to those wishing to customise their games beyond the default systems.

Reference / Examples tabs: empty; 24 functions named nowhere on the site.

#### `jackyboys-misc` — Jackyboy's Misc

Author jackyboy, released September 14th, 2009. Captured at `20150921074704`
(also 2011-05-04 — the oldest plugin capture on the site, 3757-byte record):
viewed 2,372, downloaded 752, 34 comments, 14 likes. Download `download/48/`.

> Provides a wide array of functions requested by the community.

About tab (verbatim list):

> Provides functions for;
> Set/get the background image/color for a board
> Save a canvas as an image file
> Get the filename for an item on a board
> Rotate a canvas
> Get the number of item slots being used on a board
> Get the board's width/height
> Get an image's width/height
> Get a canvas width/height
> Get the experienced required for the player to progress to the next level
> A function to determine if the game is running as a standalone exe
> Mathematical functions: atan, acos, and asin
> Get item by index

**Reference tab — the only non-empty Reference tab in the whole catalogue**
(identical text in the 2011-05-04 and 2015-09-21 captures; 25 documented
RPGCode functions):

> changeBoardBkg("Filename");
> Changes the board's background image..
> changeBoardRGB(red, green, blue);
> Changes the board's background color.
> file = getBoardBkg();
> Returns the current image used as the board's background image.
> red = getBoardRed();
> green = getBoardGreen();
> blue = getBoardBlue();
> Returns the amount of red/green/blue in the board's background color.
> saveToBitmap(CanvasID, "Filename");
> Saves a canvas to an image file.
> file = getItemFilename(itemNumber);
> Will return the filename of an item on the board.
> rotateCanvas(SrcCnv, x, y, angle[, DestCnv]);
> Rotates a canvas and draws it to the screen or optionally to another canvas.
> items = countBoardItems();
> Counts the number of items loaded into slots on the board.
> handle = getItemByIndex(Index)
> Retrieves the handle of item at a specific index number.
> width = boardWidth();
> height = boardHeight();
> Returns the current width/height of the board in tiles.
> width = getImageWidth("Filename");
> height = getImageHeight("Filename");
> Returns the width/height of an image in pixels.
> width = getCanvasWidth(CanvasID);
> height = getCanvasHeight(CanvasID);
> Returns the width/height of a canvas.
> exp = expToNextLevel(UserID);
> Returns how much EXP is needed before the next level-up.
> pct = percentToNextLevel(UserID);
> Returns the current EXP as a percentage of next level.
> deg = aTan(x);
> Returns the inverse tangent in degrees.
> deg = aTan2(x, y);
> Returns the arctangent of Y/X in degrees.
> deg = aCos(x);
> Returns the inverse of cosine in degrees.
> deg = aSin(x);
> Returns the inverse of sine in degrees.
> degrees = toDegrees(x);
> Converts radians to degrees and returns the result.
> radians = toRadians(x);
> Converts degrees to radians and returns the result.

Examples tab: empty. Function names for the rebuild: `changeBoardBkg`,
`changeBoardRGB`, `getBoardBkg`, `getBoardRed`, `getBoardGreen`, `getBoardBlue`,
`saveToBitmap`, `getItemFilename`, `rotateCanvas`, `countBoardItems`,
`getItemByIndex`, `boardWidth`, `boardHeight`, `getImageWidth`, `getImageHeight`,
`getCanvasWidth`, `getCanvasHeight`, `expToNextLevel`, `percentToNextLevel`,
`aTan`, `aTan2`, `aCos`, `aSin`, `toDegrees`, `toRadians`.

#### `menu-help` — Menu Help

Author jackyboy, released June 6th, 2009. Captured at `20150921074709` (also
2012-05-20, 2012-06-20, 2012-07-21): viewed 2,076 → 3,658, downloaded 709 →
1,201, 22 → 25 comments, 13 → 16 likes. Download `download/49/`.

> Grants access to internal game data that was previously unavailable, such as for items and special moves. Also has some unrelated bonus commands.

About tab:

> An amazingly useful plugin that is a must have add on for any custom systems. It adds many useful RPG Code commands, most notably it allows you to work with RPG Toolkit's internal systems including items, special moves, and inventory.
>
> Also has much requested features like drawing canvases transparently and translucently at once, a command to check if a key is being pressed down, and a command that returns the location of the mouse as well as if the left/right buttons are being pressed!

Reference / Examples tabs: empty.

#### `online-support` — Online Support

Author William (`member/william/`), released June 1st, 2012. Captured at
`20150921005012` (also 2012-06-17, 2012-07-22, 2014-11-09/19, 2014-12-18,
2015-01-19, 2015-02-06, 2015-07-06/07): viewed 3,002 → 3,175, downloaded 596 →
621, 37 comments, 10 likes. Download `download/4789/`. There is also a
`/extend/plugins/online-support/achievements/` page in the CDX.

> Provides a plugin, server and RPG Code to turn your project into a multiplayer game. Supports things like internal chat while you play.

About tab:

> Be wary that this is the first release, so may include bugs or other issues. Provide as much feedback as you can if you encounter any.

Reference / Examples tabs: empty. The package is plugin **plus server** plus RPG
Code glue — the most architecturally interesting item for the rebuild's
"multiplayer/online" notes.

#### `read-xml` — Read XML

Author xavero (`member/xavero/`), released October 4th, 2009. Captured at
`20120719161837` (also 2012-05-18, 2012-05-20): viewed 174 → 191, downloaded
89 → 92, 7 comments, 4 likes. Download `download/47/`.

> Read and query XML files, allowing you to access and organise information akin to a database.

About tab:

> This handy plugin parses XML files, allowing you to query the XML file as you would a database. Some possible implementations may be for a save/load system, or you could even replace some of the internal formats with a custom solution (enemies, items, player stats).

Reference / Examples tabs: empty.

#### `time-date` — Time & Date

Author playsoon (`member/playsoon/`), released July 22nd, 2014. Captured at
`20150921005017` (also 2014-10-11, 2014-11-19): viewed 665, downloaded 119,
1 comment, 0 likes. Download `download/5605/`.

> Allows easy ouput of the current date and time in a multitude of formats.

About tab (verbatim, includes the function documentation):

> Provides the command;
>
> date(format)
>
> Some examples;
>
> date("m/d/yy")
> date("mmmm-yy")
> date("h:mm:ss am/pm")
>
> Outputs;
>
> 6/21/14
> June-14
> 09:33am
>
> Full formatting reference

"Full formatting reference" links out to
`http://www.vb6.us/tutorials/formating-dates-and-times-vb6` (verbatim href in the
capture) — i.e. the author reused the VB6 `Format` date tokens. Command:
`date(format)`.

#### `xlibio` — xLib.IO

Author Xavier (`member/xavier/`), released July 22nd, 2014. Captured at
`20150921005022` (also 2014-12-25): viewed 430 → 1,108, downloaded 85 → 189,
0 comments, 2 likes. Download `download/5606/`.

> Read and write functionality to text files.

About tab (verbatim, includes the function documentation):

> Provides more concise commands for easy writing and reading, especially as the Toolkit 3.2 input/output commands are broke.
>
> id = ioOpen(filename, mode)
>
> Filename is relative to your game directory, so you can include a path (e.g. Misc/file.txt). Mode is either r (read), w (write, overwrites any existing file), or a (append, adds to any existing file).
>
> If the file doesn't exist, it creates it for you. The command returns a numerical id for referencing with future commands.
>
> ioWrite(id, text)
>
> Writes the next line.
>
> text = ioRead(id)
>
> Reads the next line.
>
> end = ioEndOfFile(id)
>
> Whether you've reached the end of the file when reading lines, 1 = yes, 0 = no
>
> ioClose(id)
>
> Close the file when you're done with it, releasing memory.
>
> ioDelete(filename)
>
> Delete a file for good. Filename is relative to your game directory, so you can include a path (e.g. Misc/file.txt).

Commands: `ioOpen(filename, mode)`, `ioWrite(id, text)`, `ioRead(id)`,
`ioEndOfFile(id)`, `ioClose(id)`, `ioDelete(filename)`. The author's note that
"the Toolkit 3.2 input/output commands are broke" is a useful bug lead for the
rebuild — `[INFERENCE]` it refers to the shipped 3.2 file I/O commands being
unusable, not to a spec.

#### `xlibtimers` — xLib.Timers

Author Xavier (`member/xavier/`), released April 22nd, 2010. Captured at
`20150707202609` (also 2015-07-06): viewed 653 → 654, downloaded 260, 9 comments,
3 likes. Download `download/44/`.

> Adds multi-tasking events, allowing you to run code after or every X seconds.

About tab:

> This will add much needed multitasking event handling to RPG Code.  Timers work both in programs as well as during gameplay.  You have two options for multitasking: the first is a lot like threads, code will be run repeatedly with an interval delay between each run, the second is a timeout.  Timeouts let you set a future event that will be run once after a given amount of time has passed.
>
> Some examples of uses may be time-driven events, day/night systems, and a countdown timer.

Reference / Examples tabs: empty. Directly relevant to G1 (explicit step machine) —
this is how the community bolted interval/timeout multitasking onto RPGCode.



### 1.3 Index pages at several dates, and what they show

`/extend/plugins` was captured nine times and every capture was fetched
(2011-05-06, 2011-08-30, 2012-05-18, 2012-06-18, 2014-01-06, 2014-11-09,
2015-07-06, 2015-07-07, 2015-09-21). **They add nothing to the plugin set**: all
nine are the same shell with an empty `#content`, so the 2011→2015 evolution of
the catalogue cannot be read off the index. What *can* be read is the crawler's
coverage per plugin (first and last 200 capture) against the release dates the
pages themselves state:

| Plugin | Released (per page) | First crawl | Last crawl | 200 captures |
| --- | --- | --- | --- | --- |
| 32-bit Image Support | 2007-05-11 | 2012-06-15 | 2012-09-17 | 5 |
| Adapter | 2006-04-05 | 2012-05-18 | 2012-07-19 | 4 |
| Bitmap Fonts | 2010-11-14 | 2014-11-19 | 2014-11-19 | 1 |
| Default Battle System Patch | 2009-02-21 | 2012-01-16 | 2012-01-16 | 1 |
| Default Menu Patch | 2009-06-03 | 2014-11-19 | 2015-09-21 | 2 |
| FMod Audio | 2008-08-08 | 2011-05-04 | 2015-09-21 | 6 |
| HTTP | 2009-01-28 | 2012-05-18 | 2012-07-19 | 4 |
| Item Data | 2006-05-08 | 2011-05-04 | 2012-07-19 | 6 |
| Jackyboy's Misc | 2009-09-14 | 2011-05-04 | 2015-09-21 | 3 |
| Menu Help | 2009-06-06 | 2012-05-20 | 2015-09-21 | 5 |
| Online Support | 2012-06-01 | 2012-06-17 | 2015-09-21 | 10 |
| Read XML | 2009-10-04 | 2012-05-18 | 2012-07-19 | 4 |
| Time & Date | 2014-07-22 | 2014-10-11 | 2015-09-21 | 3 |
| xLib.IO | 2014-07-22 | 2014-10-11 | 2015-09-21 | 5 |
| xLib.Timers | 2010-04-22 | 2015-07-06 | 2015-07-07 | 2 |

`[INFERENCE]` the site's plugin population was small (the 2016 landing page's
"most commented" strip lists `Enemy Info`, which is the only named item with no
page at all, section 2.1), and the crawler's first-sight dates track when the
plugin was *listed*, not when it was published — e.g. Time & Date and xLib.IO
were published on the same day in July 2014 but first crawled in October 2014.



### 1.4 Reference-tab coverage

Of the fifteen plugin pages, **one** carries a non-empty Reference tab in any
capture: `jackyboys-misc`. Two more carry their command documentation in the
*About* tab instead (`xlibio`, `time-date`). The rest state in prose that the
commands are documented in the downloadable package:

- `fmod-audio` — "It also comes complete with documentation providing summaries of all commands to get you started."
- `bitmap-fonts` — "Comes with a fantastic 13-page manual guiding you through all the commands with example code."
- `default-menu-patch` — "Be sure to read the included pdf as some new functionality was added as well."
- `item-data` — "Introduces 24 new functions, each returning one of the variables of an item…"

That matters for the rebuild: for most third-party plugins the on-site
documentation is a *summary only*, and the per-function reference lives in the
plugin package (`.pdf`/`.txt`/`.chm`) — which is exactly what section 5 tries to
recover.

### 1.5 Tags

The `tags` list on the site is a fixed vocabulary — 30 tags in the 2011-05 index
nav, 36 by 2015-09, with 37 distinct `/extend/plugins/tags/<tag>/` URLs archived: battles, board, canvas, colour, data, date, effects, enemies, events,
external, files, fonts, http, image, images, inventory, items, keys, load, math,
menu, mouse, multi-task, multiplayer, online, output, patch, read, save, sound,
"special moves", time, translucent, transparent, web, write, xml. Tag detail
pages exist in the CDX (`/extend/plugins/tags/<tag>/`) but their bodies are empty
shells too, so which plugin carries which tag is **not recovered** (see Gaps).
The tag vocabulary itself is quoted from the tag pages' navigation markup.

## 2. The rest of `extend/`

The Extend section has five catalogues: `plugins`, `classes`, `methods`, `other`
and `utilities`. All five **listing** pages are empty shells (section 1.1); every
**detail** page listed below was recovered in full. `download/<id>/` is the
page's Download button target; whether the bytes survived is section 5.

| Item | Slug | Author | Released | Views / Downloads | Download id |
| --- | --- | --- | --- | --- | --- |
| Array (class) | `classes/array` | Marz | 2008-08-24 | 295 / 142 (2012-07) | `download/69/` |
| Item List System (class) | `classes/item-list-system` | Akura_TheDragonBlader | 2009-08-02 | 702 / 249 (2012-07) | `download/60/` |
| Marz's Methodpack (methods) | `methods/marzs-methodpack` | Marz | 2008-12-03 | 221 / 121 (2012-07) | `download/63/` |
| OC's Spritesheet Library (methods) | `methods/ocs-spritesheet-library` | Occasionally_Correct | 2010-11-14 | 2,636 / 323 (2012-07) | `download/66/` |
| Brenthenry's Methodpack (methods) | `methods/brenthenrys-methodpack` | Brenthenry | — | — | — |
| CTShop | `other/ctshop` | aurum34 | 2009-06-15 | 1,337 / 498 (2014-11) | `download/59/` |
| Dungeon Master Example | `other/dungeon-master-example` | Grindalf | 2010-05-22 | 281 / 130 (2012-07) | `download/67/` |
| Platform Engine | `other/platform-engine` | Grindalf | 2010-02-11 | 2,214 / 652 (2015-09) | `download/68/` |
| Zelda BS (Aurum34's Mod) | `other/zelda-bs-aurum34s-mod` | aurum34 | 2011-01-18 | 2,340 / 407 (2011-09) | `download/58/` |
| C++ Plugin SDK | `utilities/c-plugin-sdk` | onion | 2011-05-31 | 2,235 / 244 (2012-08) | `download/4305/` |
| Notepad++ Autocomplete and Syntax files | `utilities/notepad-autocomplete-and-syntax-files` | xavero | 2009-10-04 | 3,381 / 722 (2015-07) | `download/73/` |
| RaceGen | `utilities/racegen` | Mark_of_the_Dragon | 2004-05-12 | 1,412 / 790 (2015-07) | `download/72/` |
| RPG Helper | `utilities/rpg-helper` | quadfrog | 2010-12-24 | 5,196 / 574 (2015-07) | `download/71/` |
| VB6 Plugin SDK | `utilities/vb6-plugin-sdk` | Colin | 2011-04-28 | 1,065 / 84 (2011-10) | `download/4197/` |
| Word/Name Generator | `utilities/wordname-generator` | quadfrog | 2010-01-12 | 562 / 270 (2015-07) | `download/70/` |

Brenthenry's Methodpack is **not** in the CDX under any URL form (query
`wb.py cdx rpgtoolkit.net/extend/methods/brenthenrys-methodpack --match prefix`
returned zero rows); it is known only from two references on the 2016 `/extend`
landing page (item link and a "playsoon liked Brenthenry's Methodpack" activity
line).

About-tab content worth quoting (everything else is in the recovered HTML):

- **Array** (class) — the About body is the literal string `None`, i.e. the PHP
  template printed a null: `> None`. Same for **Marz's Methodpack** and
  **RaceGen**. `[INFERENCE]` those three pages were published without an About
  body and the CMS rendered `null`.
- **Item List System** — `> This class stores data for the player's inventory, which is definitely useful when used with other custom systems (menu, battle, shop) since the internal inventory system is not traversable without the use of a plugin.`
- **OC's Spritesheet Library** — `> Allows you to create custom sprite objects and animations out of a single image. You can control the sprite in a number of ways, and you can queue up animations. It's very easy to use and can easily be implemented into any type of game.`
- **CTShop** — `> A functional, yet simple shop system. In the latest version aurum34 has added item descriptions. Very little code is needed to make it work, and customizing it's appearance is as simple as replacing the background image.`
- **Platform Engine** — `> Grindalf's platform game code made famous by his highly rated game Fishbate the Worm. This is a must have download for anyone making a platform game or even if you're not making a platform, it is still a great example of well-written code demonstrating the versatility of the RPG Toolkit engine. Includes a Super Mario demo game!`
- **Zelda BS (Aurum34's Mod)** — `> Aurum34 has managed to take Grindalf's excellent battle system, and turn it into something more akin to a full-fledged Zelda experience. The system is complete with working bombs, arrows, a boomerang, and triple-slash action. Also provided is an extensive readme with a guide on how to easily customize and integrate the system into any project.`
- **C++ Plugin SDK** — `> Recommended for those well versed in programming with C++ and comes with documentation explaining what's what.`
- **VB6 Plugin SDK** — `> Comes with little documentation and commenting, so is best suited for those with programming know-how. Originally released several years ago.`
- **Notepad++ Autocomplete and Syntax files** — `> This is an excellent addition for anyone who uses Notepad++ as their text editor of choice. It adds all of the RPG Code commands, as well as, defines RPG Code's syntax enabling syntax highlighting and auto-complete.` — `[INFERENCE]` if its payload survives it is a *complete RPGCode command vocabulary* (`download/73/`), which is why section 5 checks it specifically.

No Reference tab is populated on any page in this section either.

### 2.1 The 2016 `/extend` landing page — a server-rendered listing

Two captures of the Extend *landing* page (2016-01-26, 2016-03-09) are
13.5 KB of real content — unlike every listing page, this one was rendered
server-side. It contains a tag cloud (including tags added late: `arrays`,
`animations`, `buttons`, `sprites`, `text`, `shop`, `platform`, `enemies`,
`arrays`), a "latest extensions" strip, a recent-activity feed and a
"most commented" strip. Verbatim items not otherwise recoverable:

> xLib.IO » Read and write functionality to text files. — Xavier · July 22nd, 2014
> Time & Date » Allows easy ouput of the current date and time in a multitude of formats. — playsoon · July 22nd, 2014
> Online Support » Provides a plugin, server and RPG Code to turn your project into a multiplayer game. Supports things like internal chat while you play. — William · June 1st, 2012

> Shao commented on 32-bit Image Support — February 24th
> CrossTheStyxx commented on C++ Plugin SDK — May 2nd, 2015
> playsoon commented on Time & Date — April 27th, 2015
> playsoon commented on Online Support — February 4th, 2015
> Cloudberry commented on Online Support — February 4th, 2015
> playsoon liked Brenthenry's Methodpack — December 10th, 2014
> TwistedKinaesthetix liked xLib.IO — December 7th, 2014
> Sirdeanalot commented on FMod Audio — November 30th, 2014

Most-commented strip (counts at 2016-01/03):

> Zelda BS (Aurum34's Mod) — aurum34 · 37 comments
> Online Support — William · 37 comments
> Jackyboy's Misc — jackyboy · 34 comments
> Enemy Info — jackyboy · 29 comments
> Default Menu Patch — jackyboy · 26 comments

Most-viewed strip (same captures): RPG Helper 5,630 views · Zelda BS 5,589 ·
OC's Spritesheet Library 4,351 · Notepad++ Autocomplete and Syntax files 4,278 ·
C++ Plugin SDK 4,087.

**`Enemy Info` is a seventeenth plugin page that was never archived** — it is not
in the CDX prefix dump of `/extend/plugins` and
`wb.py cdx rpgtoolkit.net/extend/plugins/enemy-info --match prefix` returns zero
rows. Known only from the name, author (jackyboy) and comment count above.



## 3. Manuals on this domain

### 3.1 Which Toolkit version is this?

**Toolkit 3 — specifically the 3.1.0 help set.** The manual's own home page says so
verbatim:

> This is the manual of the RPGToolkit, Version 3—the powerful role-playing game creation system. These pages contain all the information you need to begin making your game. Additional reading—help, information, articles, and tutorials—can be found on the constantly updated official site. All content is written for toolkit users by toolkit users.

and its navigation carries a page called `3.1.0 changelog` (= `page31.htm`), plus a
`3.1.0 status: * = updated, ** = rewritten, *** = new page` legend on the home
page that marks which pages the 3.1.0 revision touched.

So the two doc sets on the old domains are different products and must not be
conflated: `rpgtoolkit.com/docs/ver2/help1.htm` is the **Toolkit 2** help, while
`rpgtoolkit.net/manual/*` is the **Toolkit 3 (3.1.0)** help. The copy here is the
*official* manual hosted by the community site, not community-written: every page
ends with

> All contents copyright © 2005, 2007 C.J. Fitzpatrick, Jonathan Hughes, and Samuel Bedwell.

(the Toolkit 3 authors; "Colin" = C.J. Fitzpatrick also published the VB6 Plugin
SDK in the Extend catalogue — section 2).

### 3.2 Page map

The nav in `index.htm` maps every page to its topic. `page20`, `page24`, `page27`
never existed; `page4.2` and `page18.3` are sub-pages that the nav reaches
indirectly.

| Page | Topic | Local file (newest capture) |
| --- | --- | --- |
| `index.htm` | home / contents | `manual/manual-index.20151021020237.htm` |
| `page1.htm` | quick-start guide | `manual-page1.20151108050757.htm` |
| `page2.htm` | editor | `manual-page2.20160530180436.htm` |
| `pageed_environment.htm` | editor environment | `manual-pageed_environment.*` |
| `page3.htm` | main file editor | `manual-page3.20151120225539.htm` |
| `page4.htm` | board editor | `manual-page4.20160530200608.htm` |
| `page4.2.htm` | vector overview (new in 3.1.0) | `manual-page4.2.20150921005042.htm` |
| `page5.htm` | tile editor | `manual-page5.20151212001701.htm` |
| `page6.htm` | program editor | `manual-page6.20160531204523.htm` |
| `page7.htm` | character editor | `manual-page7.20160530222742.htm` |
| `page8.htm` | item editor | `manual-page8.20160530223709.htm` |
| `page9.htm` | enemy editor | `manual-page9.20160531202622.htm` |
| `page10.htm` | animation editor | `manual-page10.20160531202617.htm` |
| `page11.htm` | tile bitmap editor | `manual-page11.20151120225437.htm` |
| `page12.htm` | special move editor | `manual-page12.20160530064221.htm` |
| `page13.htm` | status effect editor | `manual-page13.20160531203356.htm` |
| `pageed_background.htm` | background editor | `manual-pageed_background.20160530064419.htm` |
| `page14.htm` | playing your game | `manual-page14.20160530223357.htm` |
| `page15.htm` | default systems | `manual-page15.20160530064358.htm` |
| `page16.htm` | distribution | `manual-page16.20160530180209.htm` |
| `page17.htm` | scripting in RPGCode | `manual-page17.20160531204512.htm` |
| `page18.htm` | language features | `manual-page18.20151120225514.htm` |
| `page18.3.htm` | language features — creating functions | `manual-page18.3.20150716000408.htm` |
| `page19.htm` | **function reference** | `manual-page19.20160530223422.htm` |
| `page21.htm` | object oriented coding | `manual-page21.20160530222705.htm` |
| `page22.htm` | troubleshooting | `manual-page22.20151107181318.htm` |
| `page23.htm` | frequently asked questions | `manual-page23.20151006011926.htm` |
| `page25.htm` | technical issues | `manual-page25.20151107181349.htm` |
| `page26.htm` | system requirements | `manual-page26.20151006012049.htm` |
| `page28.htm` | about the toolkit | `manual-page28.20160530222350.htm` |
| `page29.htm` | history | `manual-page29.20151120225535.htm` |
| `page30.htm` | links | `manual-page30.20160530223426.htm` |
| `page31.htm` | 3.1.0 changelog | `manual-page31.20160530064414.htm` |
| `pagesearch.htm` | searching | **not captured** — only 404s (see Gaps) |

Pages `page18.1.htm` and `page18.2.htm` (further "language features" sub-pages
linked from `page19.htm`) are not in the CDX at all — another gap.

### 3.3 The function reference is the single most valuable artefact here

`page19.htm` is the **RPGCode Function Reference for Toolkit 3.1.0**: an
alphabetical index plus, for each function, every overload signature and a one-line
description, plus a leading glossary of RPGCode variable types. It flattens to
~43,000 characters and yields **262 documented functions** with signature *and*
description. Signature style as archived:

> `void activePlayer( variant handle)` / `handle activePlayer(void)`
> Set or get the active player, by handle.

> `void boardGetProgram( int programIndex, string &program, int &pointCount, int &layer, bool &isClosed, int &attributes, int &distanceRepeat) int boardGetProgram()`
> Returns the properties of a given program.
> Returns the number of programs on the board.

> `void boardSetProgram( int programIndex, string program, int pointCount, int layer, bool isClosed, int attributes, int distanceRepeat)`
> Sets the properties of a given program; creates a new program if one-past-the-end index is given. Use val = boardGetProgram() to get the next index. distanceRepeat in pixels always.
> Possible flags: tkPRG_STEP, tkPRG_KEYPRESS, tkPRG_REPEAT, tkPRG_STOPS_MOVEMENT.

Variable-type glossary from the same page (opening entries verbatim):

> array — Array: a collection of variables using the same identifer
> bool — Boolean: true or false
> canvas — Canvas: the handle (pointer) to an off-screen bitmap. Must be generated with createCanvas() and freed using killCanvas()
> cursor_map — Cursor map: handle (pointer) to a cursor map object as created by createCursorMap() and destroyed using killCursorMap().
> string — Literal: any character (must be quoted)
> thread — Thread: a handle (pointer) to a thread, created with thread() and destroyed with killThread()
> variant — Variant: may be numerical or literal (see handle)
> void — Void: the function does not return a value

A machine-readable extract of all 262 entries (name, signatures, description) was
generated from the capture into the local cache:
`fixtures/archaeology/rpgtoolkit-net/manual/function-reference.json`
(`extract_functions.py` in the same cache directory). `[INFERENCE]` this is
functionally the same reference the shipped Toolkit 3 help contains, so it should
be cross-checked against the clean-room `docs/` before being treated as
authoritative, but it gives the rebuild a complete command surface with arity and
types.

The RGBCode *language* pages (`page17` scripting, `page18` language features,
`page18.3` creating functions, `page21` object oriented coding) also recovered —
`page18.3` covers functions, return values, parameters, `include` and overloading.

### 3.4 `/software/manual/` and the 2005 host

- `rpgtoolkit.net/software/manual/` exists in the CDX as a **single 302** capture
  (2011-03-01) — i.e. the old "software manual" URL was redirected, almost
  certainly to `/manual/`; its 302 body is captured in
  `software/manual-20110301031754.redirect.html`.
- `/software/`, `/software/download/` and `/software/faq/` are the only other
  `/software/*` captures (2011-02), plus `/software/faq/tags/*` shells.
- `www.rpgtoolkit.net/downloads.html` (2005) surfaced in the `/download` prefix
  query (the urlkey shares the prefix); it is the pre-2011 host's own page — see
  section 3.5.
- The manual references its images as `images/imageN` (no file extension) —
  e.g. `page1.htm` ends with `<img src="images/image80" alt="Finished game" />`.
  Around twenty `manual/images/imageN` URLs are in the CDX (2013-04-20) but they
  are recorded as `text/html`; whether real image bytes are behind them was
  spot-checked, see section 5.4.
- The manual's own nav links to `/dev`, `/source` and `/bugs` on the same host
  (paths that do not exist on `rpgtoolkit.net` — the pages were authored for the
  toolkit's project site and mirrored here). `/source` was deliberately **not**
  followed (G7: legacy source).
- `manual/js.js` and `manual/styles/css.css` are archived (the toggle/accordion
  script and stylesheet the manual pages use).



### 3.5 Bonus: the 2005 `www.` host served the old rpgtoolkit.com downloads page

`http://www.rpgtoolkit.net/downloads.html` (captured 2005-02-17, 13,191 bytes,
`downloads/downloads.html.20050217114219.redirect.html`) is not a
`rpgtoolkit.net` page at all — it is the **pre-2011 rpgtoolkit.com "Downloads"
page** (`<title>rpgtoolkit.com - Downloads</title>`, "Copyright © 2003 by
Christopher Matthews"), which the `www.rpgtoolkit.net` vhost was serving at the
time. It is the only page recovered in this sweep that documents the whole
distribution landscape, so it is transcribed here verbatim (its payload host,
`rpgtoolkit.com`, belongs to the DistDocs workstream — no file behind these
links was fetched):

> Latest Open Source Release: Version 3.0.1
> Latest Toolkit 2: Version 2.20b
> Version 2 is more stable than TK3 at the moment. If you're new, you might want to download version 2. However, TK3 is an open-source project and will improve with time.
> TK3 is now an open source project.

| Distribution | File | Size | Description (verbatim) |
| --- | --- | --- | --- |
| TK3 3.0.1 main | `tk3ce.zip` | 4.3 MB | RPG Toolkit Development System, Version 3.0.1 |
| TK3 plugin SDK | `tk3pluginSDK.zip` | 0.4 MB | Software Development Kit for creating version 3 plugins. |
| TK2 2.20b main | `toolkit2.zip` | 4.8 MB | RPG Toolkit Development System, Version 2.20b (Standard [Community] Edition) — Includes the RPG Toolkit program, help files and a demo game. Includes: English, Français, Deutsch, Español, Italiano |
| TK2 help graphics | `helpfiles220.zip` | 1.2 MB | Graphics for help files |
| TK2 Powerhouse upgrade | `upd220b.udc` | 4.5 MB | Upgrade to version 2.20b |
| VB6 runtimes | `vb6runtime.zip` | 1.0 MB | Visual Basic 6 Runtimes |
| TK2 plugin SDK | `pluginSDK_219b.zip` | 0.3 MB | Software Development Kit for creating version 2 plugins. |
| TK2 multi-plugin loader | `multiplug.zip` | 0.005 MB | The multiplug plugin. A must-have plugin if you will be using lots of plugins in version 2. |
| TK1 1.4 | `tlkitv14.zip` | 1.2 MB | RPG Toolkit Development System, Version 1.4 — The first generation Toolkit. Runs in DOS! |
| Misc | `javb.zip` | 0.005 MB | JAVB — Converts Visual Basic forms into Java source code. |

and its licence/disclaimer text (verbatim):

> All software released of this website is released as Shareware/Freeware. This means that you are free to disribute it, but you must not distribute it commercially in any way. By downloading software from this site, you show that you agree and comply with this.

Note the two different plugin ABIs this documents (`pluginSDK_219b.zip` for
Toolkit 2, `tk3pluginSDK.zip` for Toolkit 3) as against the C++ SDK recovered in
§5.1 (TK3.1.0 era) — `[INFERENCE]` the plugin SDK was re-cut per engine release.

## 4. Tutorials

Twenty tutorial articles in five categories were recovered in full. Like the
plugin listings, the tutorial **category/index** pages are client-side shells
(`tutorials/`, `tutorials/<category>`) — `rpgtk.js` wires
`(tutorials/([a-zA-Z0-9-]+))` to `rpgtk.common.listing.list`, which fetches
`<url>?ajax=true` and injects the JSON — so the article set below comes from CDX
URL enumeration plus the article pages themselves. Article pages *are*
server-rendered and carry their tab body, comment count and like count.

| Article | Category | Author (verbatim byline) | Comments / Likes | Local file (chars of text) |
| --- | --- | --- | --- | --- |
| Creating a Catchy Tune | audio | Written by Pezzer (Perry Swain) | 17 / 2 | `tutorials-audio-creating-a-catchy-tune.20130318162616.html` (7,916) |
| Class and Object Reference | coding | Written by Occasionally_Correct | 20 / 11 | `tutorials-coding-class-and-object-reference.20160304194836.html` (27,985) |
| Creating A Turn-Based Battle System | coding | Written by aurum34 | 33 / 17 | `tutorials-coding-creating-a-turn-based-battle-system.20160220053340.html` (61,771) |
| Marz's RPG Code Tutorial | coding | Written by Marz | 53 / 61 | `tutorials-coding-marzs-rpg-code-tutorial.20150706071512.html` (137,909) |
| Understanding Canvases | coding | Written by Occasionally_Correct | 9 / 2 | `tutorials-coding-understanding-canvases.20140613220533.html` (5,526) |
| Marz's How To Guides | editor | Written by Marz | 6 / 4 | `tutorials-editor-marzs-how-to-guides.20160305181021.html` (14,711) |
| Basic Guidelines for Anatomy | graphics | Written by TK Game Boy | 12 / 1 | `tutorials-graphics-basic-guidelines-for-anatomy.20150702210917.html` (23,628) |
| Creating and Using a Sprite Base | graphics | Written by StarRaven | 26 / 20 | `tutorials-graphics-creating-and-using-a-sprite-base.20160304194914.html` (16,896) |
| House Interior Tutorial | graphics | Written by 7LegionArmy | 6 / 2 | `tutorials-graphics-house-interior-tutorial.20150706070532.html` (1,955) |
| How Heraldry Boards are Made | graphics | Written by Khin | 25 / 7 | `tutorials-graphics-how-heraldry-boards-are-made.20150119060442.html` (8,659) |
| Isometric Tutorial | graphics | Written by 7LegionArmy | 12 / 7 | `tutorials-graphics-isometric-tutorial.20140612165624.html` (2,604) |
| Lotusware's Pixel Art Tutorial | graphics | (page byline: Lotusware) | 40 / 24 | `tutorials-graphics-lotuswares-pixel-art-tutorial.20150702205957.html` (17,994) |
| MS Paint Can Be Your Friend Too | graphics | Written by TK Game Boy | 25 / 4 | `tutorials-graphics-ms-paint-can-be-your-friend-too.20151116182134.html` (41,198) |
| Pixeling a Monster Sprite | graphics | Written by venstor | 14 / 7 | `tutorials-graphics-pixeling-a-monster-sprite.20150704062356.html` (14,639) |
| Realistic Board Design | graphics | Written by Seafroggys | 7 / 5 | `tutorials-graphics-realistic-board-design.20140612193704.html` (18,049) |
| Sprite Drawing Tutorial | graphics | Written by Khin | 14 / 2 | `tutorials-graphics-sprite-drawing-tutorial.20160217065103.html` (17,545) |
| Sprite Drawing Tutorial 2 | graphics | Written by Khin | 5 / 0 | `tutorials-graphics-sprite-drawing-tutorial-2.20150628213909.html` (5,259) |
| StarRaven's Pixel Art Tips — Eliminating the Grid | graphics | Written by StarRaven | 11 / 7 | `tutorials-graphics-starravens-pixel-art-tips-eliminating-the-grid.20150628063550.html` (2,512) |
| Making A Story Work, Part 1 | other | Written by OBCT | 7 / 1 | `tutorials-other-making-a-story-work-part-1.20110830204743.html` (8,217) |
| Titling A Game Effectively | other | Written by OBCT | 33 / 2 | `tutorials-other-titling-a-game-effectively.20141017141224.html` (4,671) |

Rebuild-relevant programming tutorials (the rest are art/music/writing craft):
`Marz's RPG Code Tutorial` (137.9K chars, the largest document recovered in this
sweep — a full RPGCode course), `Creating A Turn-Based Battle System` (61.8K),
`Class and Object Reference` (28.0K, the class/OO surface the 3.x engine exposed
to scripts), `Understanding Canvases` (drawing model), `Marz's How To Guides`
(editor workflow).

Two capture traps worth recording:

- `tutorials/graphics/lotuswares-pixel-art-tutorial` is an **empty shell in its
  newest (2016-03) capture** — only 283 characters of nav. The real content was
  taken from the 2015-07-02 capture (`…20150702205957.html`); the 2014-12-20
  capture holds the same article and is also kept.
- The 2011-03 captures of the articles (pre-redesign flat URLs such as
  `/tutorials/lotuswares-pixel-art-tutorial/`) are shells or legacy stubs; they
  are kept as evidence of the earlier URL layout, not as content.

Tutorial pages carry the same `#ocm` AJAX comment area as plugins, so their
comment threads are lost too (only the counts above survive).

### 4.1 Note on scope

The tutorial index is where the site advertised its wider content (games,
community articles, devlog), but this sweep intentionally stayed inside the
plugin/manual/tutorial scope. Only the tutorial pages were fetched from
`/tutorials/*`; nothing under `/games/*`, `/community/*` or `/devlog/*` was
retrieved.


## 5. Plugin binaries — did the bytes survive?

Every Extend item page's Download button points at `/download/<id>/`, which the
CMS answers with a **302** to `/vault/object/<id>.<ext>`. Thirty of those 302
captures exist (26 distinct `/download/<id>/` URLs; Location headers recorded
this pass in `_cdx/manifest-bins.jsonl`); the payloads behind them mostly were
**not**: the CDX for the whole `/vault/object/` prefix contains exactly two
rows, and the second of them is the only 200:

```
20220410005941 403 application/xml  861      http://rpgtoolkit.net/vault/object/2516.PNG
20150429170536 200 application/zip  51998    http://rpgtoolkit.net/vault/object/4305.zip
```

`/vault/files/` has **zero** captures. So of the entire Extend catalogue, exactly
**one payload survives: `4305.zip`** (the C++ Plugin SDK).

| Item | Download URL | Redirect target (from the captured 302) | Bytes survived | Local path |
| --- | --- | --- | --- | --- |
| 32-bit Image Support | `/download/55/` | `/vault/object/55.zip` | no | — |
| Adapter | `/download/57/` | `/vault/object/57.zip` | no | — |
| Bitmap Fonts | `/download/41/` | (no 302 captured) | no | — |
| Default Battle System Patch | `/download/51/` | (no 302 captured) | no | — |
| Default Menu Patch | `/download/50/` | (no 302 captured) | no | — |
| FMod Audio | `/download/54/` | `/vault/object/54.zip` | no | — |
| HTTP | `/download/52/` | `/vault/object/52.zip` | no | — |
| Item Data | `/download/56/` | `/vault/object/56.zip` | no | — |
| Jackyboy's Misc | `/download/48/` | (no 302 captured) | no | — |
| Menu Help | `/download/49/` | (no 302 captured) | no | — |
| Online Support | `/download/4789/` | `/vault/object/4789.zip` | no | — |
| Read XML | `/download/47/` | `/vault/object/47.zip` | no | — |
| Time & Date | `/download/5605/` | (no 302 captured) | no | — |
| xLib.IO | `/download/5606/` | (no 302 captured) | no | — |
| xLib.Timers | `/download/44/` | `/vault/object/44.zip` | no | — |
| Array (class) | `/download/69/` | `/vault/object/69.zip` | no | — |
| Item List System (class) | `/download/60/` | `/vault/object/60.zip` | no | — |
| Marz's Methodpack | `/download/63/` | `/vault/object/63.zip` | no | — |
| OC's Spritesheet Library | `/download/66/` | `/vault/object/66.zip` | no | — |
| CTShop | `/download/59/` | `/vault/object/59.zip` | no | — |
| Dungeon Master Example | `/download/67/` | `/vault/object/67.zip` | no | — |
| Platform Engine | `/download/68/` | `/vault/object/68.zip` | no | — |
| Zelda BS (Aurum34's Mod) | `/download/58/` | `/vault/object/58.zip` | no | — |
| **C++ Plugin SDK** | `/download/4305/` | `/vault/object/4305.zip` | **yes — 54,528 bytes** | `downloads/vault-object-4305.zip.20150429170536.redirect.html` |
| Notepad++ Autocomplete/Syntax files | `/download/73/` | `/vault/object/73.zip` | no | — |
| RaceGen | `/download/72/` | `/vault/object/72.zip` | no | — |
| RPG Helper | `/download/71/` | `/vault/object/71.zip` | no | — |
| VB6 Plugin SDK | `/download/4197/` | (no 302 captured) | no | — |
| Word/Name Generator | `/download/70/` | `/vault/object/70.zip` | no | — |

Other `/download/<id>/` probes (these are game downloads, not extend items, so
the file keeps them out of the table above):

| Download URL | Redirect target | Bytes survived | Local path |
| --- | --- | --- | --- |
| `/download/333/` | `…/download/333/antquest.rar` (capture absent) | no | `downloads/download-333.20120511021358.redirect.html` |
| `/download/2746/` | `http://pc.hrej.cz/plne-hry/rpg/the-blobs-annihilation/` (external) | no | `downloads/download-2746.20150429132656.redirect.html` |
| `/download/3685/` | `/vault/object/3685.exe` | no | `downloads/download-3685.20111129054157.redirect.html` |
| `/download/3763/` | `/vault/object/3763.zip` | no | `downloads/download-3763.20140829034346.redirect.html` |
| `/download/3845/` | `/vault/object/3845.exe` | no | `downloads/download-3845.20150429151207.redirect.html` |

### 5.1 The one payload that survived: the TK310 C++ SDK

`unzip -l` on the recovered bytes (`compression method=store`, 30 files,
321 KB uncompressed):

> `TK310 C++ SDK/AC Open License.txt`, `AC Open License Derivative.txt`,
> `LICENSE.txt`, `FightPlugin.cpp`, `MenuPlugin.cpp`, `Plugin.cpp`, `Readme.h`,
> `Resource.h`, `res/tkplugin.rc2`, `RPGCodePlugin.cpp`, `sdk/tkplugcallbacks.cpp`,
> `sdk/tkplugcallbacks.h`, `sdk/tkplugdefines.h`, `sdk/Tkplugin.h`,
> `sdk/tkpluginbase.cpp`, `sdk/tkpluglocalfns.cpp`, `sdk/tkpluglocalfns.h`,
> `StdAfx.cpp`, `StdAfx.h`, `tkParameter.cpp`, `tkParameter.h`, `Tkplugin.def`,
> `tkplugin.rc`, `tkplugin.sln`, `tkplugin.suo`, `tkplugin.vcproj`, `tkXml.cpp`

**G7 handling**: the archive contains C++ source (`.cpp`/`.h`) — that is legacy
implementation, not documentation, so nothing inside it was read except the three
plain-text licence files. The listing above is an inventory only; `Readme.h` was
deliberately *not* opened because it is a `.h`.

> Later, in consolidation, the interface **declarations** of this SDK were read
> (`sdk/Tkplugin.h` constants, `Tkplugin.def` exports, `sdk/tkplugcallbacks.h`
> declarations, `Readme.h`) and transcribed to
> `fixtures/archaeology/rpgtoolkit-net/sdk310-interface.md` — a deliberate
> widening of this workstream's rule for interface files only, with the rationale
> and its reversal written up in `findings/06-plugin-sdk.md` §*Reading boundary*.
> No implementation file from this archive was read at any point.

The licence files say the SDK is under the **AC Open License v1.0** and the
bundled Menu plugin under the **AC Open License Derivative v1.0** (both
"Copyright (c) 2003, Christopher Matthews"), a BSD-3-clause-like licence whose
*Derivative* variant adds condition 6a:

> If a Derivative Work is created: 6a) The entire Derivative Work (including source code) must be made available to anyone at no charge and no royalty fee for the Derivative Work itself.

and 6b, that the derivative must carry the same licence. That is a
source-availability (reciprocal) obligation, so this SDK must **never** be pulled
into the MIT/Apache-2.0 rebuild — flagging it for G6 rather than treating it as
another permissive Bronze-tier dependency. `[INFERENCE]` the licence name does
not appear on the Blue Oak Council list, so it would need an ADR even if the code
were wanted, which it is not (clean-room rebuild, and it targets the C++ plugin
ABI rather than anything we ship).

### 5.2 `/fileman/` — the pre-2011 file manager

| URL | Result |
| --- | --- |
| `/fileman/files/126.zip`, `/fileman/files/129.zip`, `/fileman/files/1220.zip` | 302 → `/home/` (file gone), bodies captured in `downloads/fileman-files-*.redirect.html` |
| `/fileman.php?id=5&file=129&PHPSESSID=…` | 302 → `/home/?id=5&file=129&…` |

So the old file manager's payloads are dead links in the archive: no plugin
bytes there.

### 5.3 `/software/download/` — a full Toolkit executable (not a plugin)

The `/software/download/` 302 of 2011-02-19 resolves to a **7,363,646-byte PE32
Windows GUI executable** — the Toolkit 3 **3.1.0 installer**, i.e. the same file
as `/vault/official/rpgtoolkit310.exe` (which is the DistDocs workstream's to
fetch, not mine). It landed in my cache because it sits behind a `/software/*`
redirect on this domain:

- `software/download.20110219053622.redirect.html` — PE32 executable, 7,363,646 bytes;
  sha256 `32cc5bb039c74db9ec409ed5c8e5acf547b298c9cbdc9018747224afd293e72a`,
  md5 `989897858dce2abcf69073d00e0ad03a`. The DistDocs workstream cross-checked
  these hashes against `dist/rpgtoolkit310.exe` and found them **byte-identical**
  (reported 2026-10-11); the CDX `length` figure 7,222,475 is a WARC record
  length, not the payload size.

Nothing was extracted from it (it is installer material, not plugin
documentation); it is raw cache only, and DistDocs has recorded it as a redirect
alias of the 3.1.0 installer rather than a distinct build.

### 5.4 Manual images and `/software/` pages

- `/manual/images/imageN` (the manual's own `<img src="images/imageN">`
  references) serve an **HTML page** — the CMS catch-all "home > latest news"
  template — not image bytes. Spot-checked `image1` (16,984 bytes of HTML) and
  `image20` (12,911 bytes of HTML) in `site-assets/`. The manual's illustrations
  are therefore **lost**; the pages survive with their `alt` text only.
- `/software/` (2011-02-19) and `/software/faq/` (2011-02-28) were recovered but
  are client-side shells (the `/software/` landing shows only nav plus the
  built-in Twitter feed JSON) — the Software section's own listings were
  AJAX-rendered too (`rpgtk.js`: `software/faq/?$` → `listing.keywords`).
- `/software/manual/` (2011-03-01) redirects into the Toolkit 3 manual — the
  fetched body is a manual page (`<title>RPGToolkit Help —`), confirming the
  pre-2011 `/software/manual/` URL and the 2011+ `/manual/` URL are the same doc
  set. Local: `software/manual-20110301031754.redirect.html`.
- `manual/js.js` (4,781 bytes) and `manual/styles/css.css` (2,498 bytes) are the
  manual's own script and stylesheet (the accordion behind `page19`'s
  "Collapse All / Expand All").

### 5.5 What the site's own JavaScript tells us

`static/rpgtk.js?1` (256,972 bytes, capture 2011-08-14, saved as
`site-assets/static-rpgtk.js`) is the one site asset that explains the shape of
everything else. Relevant verbatim fragments:

```js
updateJSON:function(){...var values=new Hash();values.set('ajax',true);if(!this.isFirst){values.set('page',this.page);...}this.ajax.get.delay(500,this.ajax,values)}
```

```js
'extend\/?$':[rpgtk.common.listing.keywords],'(extend\/([a-zA-Z0-9-]+))\/?$':[rpgtk.common.listing.list],'(extend\/([a-zA-Z0-9-]+)\/tags\/([a-zA-Z0-9-]+))\/?$':[rpgtk.common.listing.list]
```

```js
'extend\/([a-zA-Z0-9-]+)\/([a-zA-Z0-9-]+)(\/#[a-zA-Z-0-9]+)?\/?$':[[rpgtk.common.pages,{'type':'cond','id':'paper-pagination'}],[rpgtk.common.comments,{'type':'cond','id':'ocm','args':['oid']}],[rpgtk.common.like,...]]
```

Read together: (a) every listing route (`extend/<cat>`, `extend/<cat>/tags/<tag>`,
`tutorials/<cat>`, …) is filled by a JSON request with `ajax=true` and `page=N`
— which no crawler ever made, hence the empty `#content`; (b) detail pages get
their tabs from in-page markup (`paper-pagination`) but their **comments** from
another AJAX call into `#ocm`. That is precisely why the comment counts survive
and the comment text does not.


## Gaps / not recovered

Everything below is *looked for and not found*, with the query or capture that
proves it.

1. **Plugin listing pages (all `extend` categories, all tag pages, all their
   pagination).** Every capture has an empty `#content`
   (`<div id="content" class="subcontent"></div>`), because the list is fetched by
   `GET <route>?ajax=true[&page=N]` (proof in §5.5).
   `python3 wb.py cdx rpgtoolkit.net/extend/plugins --match prefix` returns 222
   rows and **none** with `ajax=true`, so the listing JSON is not in the archive.
   Consequences: the tag→plugin mapping is unrecoverable, and the 15-page plugin
   set is a *lower bound* on the catalogue (only pages the crawler saw).
2. **Comment threads.** The thread is AJAX-loaded into `<div id="ocm" class="oid-N">`
   (`rpgtk.common.comments`); only counts are server-rendered. No `/comments/`
   URL exists in the `--match prefix` dumps of `/extend`, `/tutorials` or
   `/manual` — the only comment text recovered anywhere is the nine activity
   lines quoted in §2.1 from the 2016 `/extend` landing page.
3. **`Enemy Info` (17th plugin).** `python3 wb.py cdx rpgtoolkit.net/extend/plugins/enemy-info
   --match prefix` → **zero rows**. Known only from the 2016 landing page
   (name, author jackyboy, 29 comments).
4. **`Brenthenry's Methodpack`.** `python3 wb.py cdx rpgtoolkit.net/extend/methods/brenthenrys-methodpack
   --match prefix` → **zero rows**. Known only from the 2016 landing page.
5. **Plugin payloads (28 of 29).** `wb.py cdx rpgtoolkit.net/vault/object --match prefix`
   → 2 rows total (`2516.PNG` 403, `4305.zip` 200). `wb.py cdx rpgtoolkit.net/vault/files
   --match prefix` → **zero rows**. So every `/vault/object/<id>.zip` except 4305
   is missing, and with it the in-package documentation that 14 of the 15 plugin
   pages point at (§1.4).
6. **Old toolkit releases.** `wb.py cdx rpgtoolkit.net/vault --match prefix` (628
   rows) contains `vault/toolkit/releases/12.exe`, `tk1.zip`, `tk2.zip` — all
   captured only with **status 500** (server error pages, no payload).
7. **`/fileman/files/*.zip`.** 126.zip, 129.zip, 1220.zip all 302 to `/home/`
   (`downloads/fileman-files-*.redirect.html`) — the pre-2011 file manager's
   payloads are dead links in the archive.
8. **`/download/333/antquest.rar`** (the only `/download/N/` target that is a
   direct file URL rather than `/vault/object/`): exact CDX query → **zero rows**.
9. **Manual pages that never existed / were never archived.**
   `/manual/pagesearch.htm` has 5 captures, **all 404**;
   `/manual/page18.1.htm` and `/manual/page18.2.htm` (the "language features"
   sub-pages linked from `page19`) are absent from the 286-row `/manual`
   prefix dump — only `page18.3.htm` is there.
10. **Manual images.** `manual/images/imageN` URLs are archived but serve the
    CMS catch-all HTML page ("home > latest news"), not image bytes — samples
    `image1` (16,984 B) and `image20` (12,911 B) in `site-assets/`. The manual's
    figures are lost; only their `alt` text remains in the pages.
11. **`/software/*` beyond four pages.** The successful queries
    (`rpgtoolkit.net/software/`, `/software/manual`, `/www.rpgtoolkit.net/software`)
    yield only: `/software/` (2011-02-19), `/software/download/` (302 →
    executable), `/software/faq/` (2011-02-28), `/software/manual/` (302 → the
    manual), and `/software/faq/tags/*` shells. The Software section's own
    listings were AJAX too (`software/faq/?$` → `listing.keywords`). The very
    first `--match prefix` query for `rpgtoolkit.net/software` returned an error
    ("connection refused") twice before succeeding with 1 row — the wider list
    above came from the three targeted follow-up queries.
12. **Tutorial listing JSON.** `tutorials/graphics?im453t83&ajax=true`,
    `tutorials/coding?io99xbcv&ajax=true`, `tutorials/editor?io99t63z&ajax=true`
    are in the CDX only as **301/302** rows (no bodies) → no article-list JSON.
13. **Site JavaScript under its clean URL.** `wb.py cdx rpgtoolkit.net/static/rpgtk.js`
    (exact) → zero rows; only `static/rpgtk.js?1` is archived (fetched, §5.5).
    Many other `static/*` assets are 500 captures in the CDX
    (`static/listing/view-older-button.png`, `static/library/fancyupload/*`).
14. **`vault/object/2516.PNG`** is a 403 capture (2022-04-10) — the archive
    itself refuses to serve it, so nothing can be said about that file.
15. **Wayback availability.** The replay endpoint
    (`web.archive.org`) returned `ECONNREFUSED` intermittently for the whole
    session; pacing had to be raised to ~6 s/request with per-row retries. Four
    rows gave up during the first (aborted) pass — all four were
    `20120618094240`/`/extend/plugins` and were re-fetched successfully later.
    Final state: every row in every plan that the drivers ran completed
    (`fail-left=0` in each run log), i.e. **no planned capture is outstanding**;
    the *reduction* in ambition (a 351-row "every snapshot" extend plan cut to a
    targeted 50-row one) is a deliberate scope choice, not a failure — the extra
    snapshots would have been duplicate content (the plugin pages barely change
    between captures beyond the view/download counters, which are recorded
    per-plugin above).
16. **Deliberately out of scope.** `/games/*`, `/community/*`, `/devlog/*`,
    `/home/*` and the manual's `/source` link were not fetched (scope + G7);
    `/vault/official/{rpgtoolkit310.exe,rpgtoolkit321b.zip}` and
    `fixtures/archaeology/dist/` belong to the DistDocs workstream and were left
    to it (they are visible in `_cdx/vault.txt`).

