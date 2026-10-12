# RPG Toolkit plugins — consolidated recovery digest

What survived of the Toolkit's plugin ecosystem, after recovering everything the
Internet Archive holds for `rpgtoolkit.net`, `rpgtoolkit.com`, `toolkitzone.com`,
`tk3.toolkitzone.com` and the official distributions.

**Headline:** the plugin *interface* is documented (a recovered C++ COM SDK plus
the 3.1.0 manual's RPGCode function reference); the plugin *catalogue* is
recoverable by name, author, date and description with **no binaries**: of 69
plugin payloads referenced across both community archives, **3 sets of bytes**
survived, all of them SDKs or the two stock plugins.

Companion files in this directory: `findings/01-rpgtoolkit-net.md` (the
`extend/plugins` catalogue, detail pages, tabs), `findings/03-toolkitzone.md`
(the toolkitzone file archive, 40 plugins), `findings/05-toolkitzone-library.md`
(community articles, the 2007 GPL change), `findings/06-plugin-sdk.md` (the
plugin API), `docs.md` (the documentation inventory).

## 1. What a "plugin" was in the Toolkit

Three kinds, bit-flagged and combinable in one DLL (`PT_RPGCODE` 1, `PT_MENU` 2,
`PT_FIGHT` 4 — recovered SDK, `findings/06-plugin-sdk.md` §*Plugin kinds*):

| Kind | What it did | How the engine found it |
| --- | --- | --- |
| **RPGCode extension** | added new RPGCode commands | offered every unknown function call (`docs/engine-features.md` E-99); plugin registers a `commandMap[]` of name → function |
| **Menu** | replaced the whole menu system | named as `menuPlugin` in the `.gam` (`docs/format-spec.md` row 21) |
| **Battle** | replaced the whole battle system | named as `fightPlugin` in the `.gam`; entered with a `FIGHT_STRUCT`, fed `FIGHT_EVENT`s |

Toolkit 2 plugins were plain Win32 DLLs. For Toolkit 3 two plugin ABIs are
documented, five years apart (`findings/06-plugin-sdk.md`):

* **COM (the 2004 SDK, "for 3.04+")** — one `IMain` `IDispatch` coclass, which is
  why that kit's readme could claim "any language can be used", and why a
  community plugin (FMod) could be written in VB (Library doc 123).
* **Native exports (the TK310 SDK, 2011, for 3.1.0)** — thirteen required
  `TKPlug*` exports (`TKPlugInit`, `TKPlugQuery`, `TKPlugExecute`, `TKPlugMenu`,
  `TKPlugFight`, `TKPlugFightInform`, `TKPlugEventInform`, `TKPlugInputRequested`,
  `TKPlugType`, …) plus a C++ class library; the shipped example is what the
  engine's own `tk3fight.dll`/`tk3menu.dll` were.

Both kits use the same `PT_RPGCODE`/`PT_MENU`/`PT_FIGHT` capability flags, the
same `MNU_*`/`INFORM_*` constants and the same fight structures, so the contract
is stable across the ABI change.

The plugin list is per-game: it lives in the `.gam` (row 29, `str pluginFile` in
minor ≥ 3; an implied `tkplug<N>` in older files), and the editor's Plugins tab
adds them and shows each plugin's self-declared description string
(`docs/editor-features.md` T-14; the SDK's `misc.h` is exactly that string).

## 2. The two stock plugins

Toolkit 3 shipped its default menu and battle systems **as plugins** — the single
most important fact for compatibility, because any TK3 game with a menu or a
fight therefore "uses plugins".

| Package | `tk3menu.dll` | `tk3fight.dll` | Notes |
| --- | --- | --- | --- |
| 3.0.6 (Apr 2005) | 27,136 B | 26,624 B | early builds |
| 3.1.0 (Sep 2007) | 106,496 B | 98,304 B | |
| 3.2.1 package (engine reports 3.2.0) | 106,496 B | 98,304 B | plus `tk3fight.dll.x.manifest` (821 B) |

Sizes read from the recovered distributions (`findings/04-distribution.md`). The
same 106,496/98,304 pair is what the CI fixtures already carry at
`fixtures/legacy/{Basic,demo}/Plugin/`. The bytes were **not** disassembled (G7).

Both were GPL from the 3.1.0 release onward (the 3.1.0 changelog states GPL v3 for
`trans3.exe`, `toolkit3.exe`, `actkrt3.dll`; the February 2007 announcement adds
the engine, editor *and* `tk3menu.dll`/`tk3fight.dll`), so a rebuild reproduces
their behaviour, never their code.

## 3. The community plugin catalogue

Two archives, overlapping; both are recovered as **metadata only**. Detail:
`findings/01-rpgtoolkit-net.md` §1.2 and `findings/03-toolkitzone.md` §*Plugins*.

### 3.1 `rpgtoolkit.net/extend/plugins` (2006–2016, 15 plugins)

| Plugin | Author | Released | Views/downloads at capture | Site's description (verbatim) |
| --- | --- | --- | --- | --- |
| 32-bit Image Support | Shao | 2007-05-11 | 591 / 387 | "Improves the graphic capabilities when drawing images, including alpha channels and hundreds of file formats." |
| Adapter | John@aljo | 2006-04-05 | 263 / 144 | — |
| Bitmap Fonts | Khin | 2010-11-14 | 821 / 366 | — |
| Default Battle System Patch | jackyboy | 2009-02-21 | 477 / 312 | "Fixes several bugs within the default battle system." |
| Default Menu Patch | jackyboy | 2009-06-03 | 3,098 / 951 | — |
| FMod Audio | Oyerth | 2008-08-08 | 2,818 / 1,329 | — |
| HTTP | furyX639 | 2009-01-28 | 346 / 148 | — |
| Item Data | Sander | 2006-05-08 | 1,589 / 1,112 | — |
| Jackyboy's Misc | jackyboy | 2009-09-14 | 2,372 / 752 | **the only page with a populated Reference tab (25 RPGCode functions)** |
| Menu Help | jackyboy | 2009-06-06 | 3,658 / 1,201 | — |
| Online Support | William | 2012-06-01 | 3,175 / 621 | — |
| Read XML | xavero | 2009-10-04 | 191 / 92 | — |
| Time & Date | playsoon | 2014-07-22 | 665 / 119 | — |
| xLib.IO | Xavier | 2014-07-22 | 1,108 / 189 | — |
| xLib.Timers | Xavier | 2010-04-22 | 654 / 260 | — |

Known by name only (never archived): **Enemy Info** (jackyboy) and
**Brenthenry's Methodpack**. The category's listing pages are client-side shells
filled from `?ajax=true` JSON that no crawler ever fetched, so the full catalogue
set and the tag→plugin mapping are unrecoverable — the 15 above are what the CDX
URL space proves existed.

### 3.2 `toolkitzone.com` file archive — Plugins category (40 files, 2003–2010)

Full entries (author, date, rating, downloads counter, verbatim description,
detail-page provenance) in `findings/03-toolkitzone.md` §*Plugins (cat 19)*.
Highlights from the recovered titles:

`147 Text Box`, `148 Misc Pack`, `149 Multi-Plug` (TK2), `152 FTP`,
`153 Juicy`, `154 Flash`, `155 Misc Pack`, `156 Multiplayer`, `157 Programmer's
Plugin`, `158 Misc Pack`, `169 Shell`, `170 Never Fail Read Write Plugin`,
`171 Edit Box`, `221 Advanced RPGCode`, `304 VB Mini-Game`,
`313 Resolution Changer`, `468 E-Mail Plugin`, `478 DMenu [Vortex plugin]`,
`550 Binary Read/Write Plugin`, `552 Movie Player`, `559 Winsock Plugin`,
`613 Common Dialog`, **`819 VB Plugin SDK (TK 3.0.4+)`**, `823 Canvas Get Screen`,
**`861 C++ Plugin SDK, 3.04+`**, `964 SaveScreen Fix`, `1244 FMod Audio Plugin`,
`1294 Adapter`, `1310 Item Plugin`, `1326 Yet Another Item Plugin`,
`1503 32-bit Image Support`, `1590 Default Battle System with Item bug workaround`,
`1599 Menu Help Plugin`, `1629 Enemy info Plugin`, `1630 Default Menu Patch`,
`1652 FileBrowserPlugin`, `1654 GetSaveData Plugin`, `1661 HTTP Plugin`,
`1671 Misc Plugin`, `1723 Read XML plugin`.

Authors recovered where the detail page survived: Dan (147, 148), Xavier (149, 152,
153…), Christopher Matthews (Multi-Plug, i.e. `cbm`), MrG (153, 155), Triuken
(154), Cyranoid (156), Leuf (157), Kaptan (152), **Colin James Fitzpatrick**
(**819 VB SDK** — description written by Asimir — and **861 C++ SDK**, 48.6 kb;
SDK version 2.0), `1590` a fix to `tk3fight.dll` ("Item bug fixed").

The same site's older `fileman.php` taxonomy counted the engine-extension space
separately: sections 24 *plugins*, 25 *Methods*, 26 *Battle Systems*,
33 *Message windows*, 51 *Menu Systems*, alongside 34 *Tutorials* — i.e. menu and
battle replacements were catalogued as their own kinds, matching the three plugin
types.

### 3.3 Cross-reference (same plugin, both archives)

| Plugin | rpgtoolkit.net | toolkitzone file id |
| --- | --- | --- |
| FMod Audio | ✓ 2008 | 1244 |
| Adapter | ✓ 2006 | 1294 |
| Default Battle System patch | ✓ 2009 | 1590 |
| Default Menu Patch | ✓ | 1630 |
| Menu Help | ✓ | 1599 |
| 32-bit Image Support | ✓ 2007 | 1503 |
| Item Data | ✓ 2006 | 1310 / 1326 |
| HTTP | ✓ 2009 | 1661 |
| Read XML | ✓ 2009 | 1723 |
| Enemy Info | name only | 1629 |
| Online/multiplayer | Online Support (William, 2012) | 156 Multiplayer, 559 Winsock (Cyranoid, 2003) |

The toolkitzone copies are the earlier generation (2003–2010, TK2/TK3.x), the
rpgtoolkit.net ones the maintained later generation (2006–2016); for six plugins
the toolkitzone capture is now the only surviving description.

## 4. Plugin documentation — what exists

| Artefact | What it documents | Where | In git? |
| --- | --- | --- | --- |
| **COM Plugin SDK 2.0** (C++, 2004, for 3.04+) | the whole 2004 plugin contract: `IMain`, 98 `CB*` engine callbacks, RPGCode `commandMap[]`, `CCanvas`/`CAnimation`, fight structs, 251 engine info codes | recovered zip `fileman-861.zip`; transcribed locally to `fixtures/archaeology/toolkitzone/sdk-interface.md` + `sdk-constants.md` | no — `findings/06-plugin-sdk.md` §*The plugin contract* |
| **TK310 C++ SDK** (2011, **for 3.1.0**) | the version-matched contract: 13 `TKPlug*` exports, **131** `CB*` callbacks (flat `CBCanvas*`/`CBAnimation*`), a worked skeleton per plugin kind, `Readme.h`, public-domain parameter parser | recovered zip `rpgtoolkit.net/vault/object/4305.zip`; transcribed locally to `fixtures/archaeology/rpgtoolkit-net/sdk310-interface.md` | no — `findings/06-plugin-sdk.md` §*The other SDK* |
| **VB Plugin SDK (TK 3.0.4+)** | a VB-facing plugin kit — "The instructions are very basic, so you will need an idea of what you're doing beforehand" (site description, written by Asimir); author of the kit itself is Colin James Fitzpatrick | toolkitzone file 819 — **payload never archived**, only the listing (31.6 kb) | no |
| **TK 3.0.6 help, `page18.4.htm` "Plugins"** | the only *shipped* how-to-write-a-plugin text: needed SDK, two SDKs exist (C++/VB), how to add a plugin in the editor; links to files 861/819 | recovered 3.0.6 distribution, `fixtures/archaeology/dist/tk306-docs/help/page18.4.htm` | no — quoted in `findings/04-distribution.md` |
| **RPGCode Function Reference (TK 3.1.0, 262 functions)** | the full scripting surface with signatures, descriptions and the variable-type glossary — the reference the stock menu/battle plugins and every RPGCode plugin were written against | `fixtures/archaeology/rpgtoolkit-net/manual/function-reference.json`, from `manual/page19.htm` | no — summarised in `docs.md` |
| **jackyboy's Misc Reference tab** | 25 RPGCode functions a single plugin added, with the site's own phrasing | `fixtures/archaeology/rpgtoolkit-net/extend/` | no — quoted in `findings/01-rpgtoolkit-net.md` |
| **Default Battle System patch / Menu patch pages** | what the two most-used "patch" plugins changed | same catalogue + toolkitzone 1590's bundled readme ("Item bug fixed") | no |
| **Progress updates and release notes** | the developers' own account of the plugin subsystem, the COM design and the GPL re-licence | toolkitzone Library docs 100, 123, 169, 282 | no — quoted in `findings/05-toolkitzone-library.md` |

The official **3.1.0/3.2.1 help ships no plugin-authoring chapter**: a `plugins`
page (`page20.htm`) was planned and is still commented out in the RPGCode TOC, and
the "Plugins" subsection was dropped from the help after 3.0.6. So the SDK
recovered from toolkitzone is not a nice-to-have — it is the only complete
statement of the plugin contract that survives.

## 5. Did the binaries survive?

| Archive | Plugin payloads referenced | Bytes recovered |
| --- | --- | --- |
| rpgtoolkit.net `extend/plugins` | 29 `/download/<id>/` redirects + `/vault/object/`, `/vault/files/`, `/fileman/files/` | **1** — `vault/object/4305.zip`, the **TK310 C++ SDK for 3.1.0** (54,528 B) |
| toolkitzone.com Plugins (cat 19) | 40 | **2** — `861` C++ SDK, `1590` battle-system fix |
| toolkitzone.com other categories | ~124 (Custom Systems, Methods, Other code) | 42 more zips/dlls/exes, all *not* plugins |
| Official distributions | 2 stock plugins | `tk3fight.dll`, `tk3menu.dll` in 3.0.6 / 3.1.0 / 3.2.1 packages |

Download endpoints on rpgtoolkit.net were JS-driven (`/download/N/` returned a
JSON stub; the bytes were never crawled), and 26 toolkitzone payloads exist only
behind `?PHPSESSID=` captures that Wayback replays as 404. Nothing else is
recoverable from the Wayback Machine.

`keyDown.dll` (toolkitzone `stuff/files/226`, 7,481 B) and
`MegaProgramOfDoom.exe` did survive, but both are utilities, not plugins.

## 6. Gaps

* **No plugin binaries** for any community plugin — the recovered bytes are two
  copies of the same C++ SDK plus one `tk3fight.dll` patch.
* **No VB plugin SDK payload** (file 819) — only its listing text; its kit is
  therefore undocumented beyond "very basic instructions".
* **rpgtoolkit.net listing/tag pages are empty shells** — the plugin set is
  reconstructed from URL evidence, so an unknown number of plugins that were
  never linked from an archived page remain invisible (the tag→plugin mapping is
  gone entirely).
* **Comment threads** (where authors answered "how do I use this?") are AJAX and
  only their counts survive; 9 lines of plugin-page activity text did survive on
  the 2016 landing page.
* **No post-3.1.0 SDK** — the recovered kit is SDK 2.0 for 3.04+ (2004); the
  Library says later SDKs existed and were re-licensed, but none are archived.
* **The engine side of the contract is not recovered** — only the plugin-facing
  half (see `findings/06-plugin-sdk.md` §*Coverage and limits*).

## 7. What this means for the rebuild

* The rebuild's native menu and battle systems have a documented interface to
  match (`docs/engine-features.md` E-79/E-80, now with real shapes from
  `findings/06-plugin-sdk.md`), and the community's "patch" plugins tell us which
  stock behaviours were considered broken (item-not-found in the battle system;
  over-responsive enter key; the default menu's issues).
* The rebuilt extension point (E-99) has a concrete prior art to learn from —
  plugin kinds, capability flags, an unknown-command dispatch, a callback object,
  and two known boundary designs (COM/`IDispatch` in 2004, native exports in
  2011) with a stable contract across both.
* **Nothing here is implementable yet.** Per G7 the next step is a `docs/` entry
  that states *our* extension contract, in our own words, in its own commit — the
  findings and the local caches are evidence, not spec. Per G6 no recovered
  artefact (SDK, DLL, or manual) may be copied into or depended on by this
  MIT/Apache codebase.
