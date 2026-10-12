# ToolkitZone.com file archive — plugins and RPG Code files (Internet Archive recovery)

Recovered 2026-10-11 for the clean-room rebuild. Everything below was read off the
public Wayback Machine; no legacy source tree (GPL VB/VC code) was opened, and source
members inside recovered archives were listed but never extracted or read (guard-rail G7).

## Method

`wb.py`/`wb2.py` (this directory) drove `web.archive.org` — CDX index queries and raw
`id_` replay fetches, one request at a time. Prefixes queried:

| Prefix | Match | Rows returned |
|---|---|---|
| `toolkitzone.com/` | domain | 2000 (CDX limit; truncated before `files.php`) |
| `toolkitzone.com/files.php` | prefix | 768 |
| `toolkitzone.com/fileman.php` | prefix | 3000 (CDX limit) |
| `toolkitzone.com/fileman/files/` | prefix | 88 |
| `toolkitzone.com/stuff/` | prefix | 232 |
| `toolkitzone.com/vault/` | prefix | 941 |

Listing pages captured: **164** distinct files were read off
`files.php?cats`, `files.php?cat=N[&page=M]`, `files.php?browse` and `files.php?new`
captures spanning 2007-01 to 2010-03.

Not captured: category pages `&page=2+` are archived **only** for cat 20 (2007-05-23)
and for cat 19/18 (2007-03-08); the 2009 and 2010 paged views of cats 17-20 exist only as
page 1. `files.php?cat=19&page=2|3` for 2009/2010 returns nothing from CDX.

## Provenance

| Item | Wayback snapshot URL | Captured | Confidence | Notes |
|---|---|---|---|---|
| Category index 2007-02-19 | https://web.archive.org/web/20070219183234id_/http://www.toolkitzone.com:80/files.php?cats | yes | high | `cats-20070219.html` |
| Category index 2007-11-22 | https://web.archive.org/web/20071122021245id_/http://www.toolkitzone.com:80/files.php?cats | yes | high | `cats-20071122.html` |
| Category index 2009-03-30 | https://web.archive.org/web/20090330100336id_/http://www.toolkitzone.com:80/files.php?cats | yes | high | `cats-20090330.html` |
| Category index 2010-02-10 | https://web.archive.org/web/20100210141403id_/http://www.toolkitzone.com:80/files.php?cats | yes | high | `cats-20100210.html` |
| Category index 2010-02-10 (dup) | (no sidecar; byte-identical to 2010-02-10) | yes | high | `files-cats.html` |
| Plugin listing captures | `https://web.archive.org/web/20070107111313id_/http://toolkitzone.com:80/files.php?cat=19` and 7 more | yes | high | see per-entry *Seen in* |
| Payload captures (`*/files/N.*`) | see per-entry **Payload** rows | partial | high | 209 distinct `*/files/` URLs in CDX |

Every listing page the catalogue below is built from, with its exact snapshot:

| Local capture | Snapshot URL | Bytes read |
|---|---|---|
| `browse-20070220.html` | https://web.archive.org/web/20070220080238id_/http://www.toolkitzone.com:80/files.php?browse | 3 rows |
| `browse-20090417.html` | https://web.archive.org/web/20090417032845id_/http://www.toolkitzone.com:80/files.php?browse | 3 rows |
| `browse-20100210.html` | https://web.archive.org/web/20100210141327id_/http://www.toolkitzone.com:80/files.php?browse | 3 rows |
| `cat17-20070107.html` | https://web.archive.org/web/20070107111254id_/http://toolkitzone.com:80/files.php?cat=17 | 10 rows |
| `cat17-20070220.html` | https://web.archive.org/web/20070220041748id_/http://www.toolkitzone.com:80/files.php?cat=17 | 10 rows |
| `cat17-20080118.html` | https://web.archive.org/web/20080118061250id_/http://www.toolkitzone.com:80/files.php?cat=17 | 7 rows |
| `cat17-20090330.html` | https://web.archive.org/web/20090330064209id_/http://www.toolkitzone.com:80/files.php?cat=17 | 9 rows |
| `cat17-20100210.html` | https://web.archive.org/web/20100210134845id_/http://www.toolkitzone.com:80/files.php?cat=17 | 10 rows |
| `cat18-20070107.html` | https://web.archive.org/web/20070107111303id_/http://toolkitzone.com:80/files.php?cat=18 | 10 rows |
| `cat18-20070302.html` | https://web.archive.org/web/20070302165934id_/http://www.toolkitzone.com:80/files.php?cat=18 | 10 rows |
| `cat18-20070308-p2.html` | https://web.archive.org/web/20070308002551id_/http://toolkitzone.com:80/files.php?cat=18&page=2 | 10 rows |
| `cat18-20070308-p3.html` | https://web.archive.org/web/20070308004005id_/http://toolkitzone.com:80/files.php?cat=18&page=3 | 3 rows |
| `cat18-20090330.html` | https://web.archive.org/web/20090330144533id_/http://www.toolkitzone.com:80/files.php?cat=18 | 10 rows |
| `cat18-20100210.html` | https://web.archive.org/web/20100210135449id_/http://www.toolkitzone.com:80/files.php?cat=18 | 10 rows |
| `cat19-20070107.html` | https://web.archive.org/web/20070107111313id_/http://toolkitzone.com:80/files.php?cat=19 | 10 rows |
| `cat19-20070302.html` | https://web.archive.org/web/20070302165945id_/http://www.toolkitzone.com:80/files.php?cat=19 | 10 rows |
| `cat19-20070308-p2.html` | https://web.archive.org/web/20070308004013id_/http://toolkitzone.com:80/files.php?cat=19&page=2 | 10 rows |
| `cat19-20070308-p3.html` | https://web.archive.org/web/20070308004024id_/http://toolkitzone.com:80/files.php?cat=19&page=3 | 10 rows |
| `cat19-20071122.html` | https://web.archive.org/web/20071122053433id_/http://www.toolkitzone.com:80/files.php?cat=19 | 10 rows |
| `cat19-20080509.html` | https://web.archive.org/web/20080509051346id_/http://www.toolkitzone.com:80/files.php?cat=19 | 10 rows |
| `cat19-20090330.html` | https://web.archive.org/web/20090330141435id_/http://www.toolkitzone.com:80/files.php?cat=19 | 10 rows |
| `cat19-20100305.html` | https://web.archive.org/web/20100305055700id_/http://www.toolkitzone.com:80/files.php?cat=19 | 10 rows |
| `cat20-20070107.html` | https://web.archive.org/web/20070107111326id_/http://toolkitzone.com:80/files.php?cat=20 | 10 rows |
| `cat20-20070220.html` | https://web.archive.org/web/20070220080450id_/http://www.toolkitzone.com:80/files.php?cat=20 | 10 rows |
| `cat20-20070523-p2.html` | https://web.archive.org/web/20070523204244id_/http://www.toolkitzone.com:80/files.php?cat=20&page=2 | 10 rows |
| `cat20-20070523-p3.html` | https://web.archive.org/web/20070523224338id_/http://www.toolkitzone.com:80/files.php?cat=20&page=3 | 10 rows |
| `cat20-20070523-p4.html` | https://web.archive.org/web/20070523224200id_/http://www.toolkitzone.com:80/files.php?cat=20&page=4 | 10 rows |
| `cat20-20070523-p5.html` | https://web.archive.org/web/20070523204350id_/http://www.toolkitzone.com:80/files.php?cat=20&page=5 | 5 rows |
| `cat20-20090330.html` | https://web.archive.org/web/20090330141252id_/http://www.toolkitzone.com:80/files.php?cat=20 | 10 rows |
| `cat20-20100210.html` | https://web.archive.org/web/20100210140240id_/http://www.toolkitzone.com:80/files.php?cat=20 | 10 rows |
| `new-20070219.html` | https://web.archive.org/web/20070219183355id_/http://www.toolkitzone.com:80/files.php?new | 19 rows |
| `new-20100210.html` | https://web.archive.org/web/20100210141852id_/http://www.toolkitzone.com:80/files.php?new | 2 rows |

## Category index and how it shrank

| Category (id) | 2007-02-19 | 2007-11-22 | 2009-03-30 | 2010-02-10 | 2010-02-10 (dup) |
|---|---|---|---|---|---|
| 1 Audio | 195 | 199 | 207 | 212 | 212 |
| 8 Background (audio) | 152 | 155 | 160 | 163 | 163 |
| 9 Effects (audio) | 40 | 41 | 44 | 46 | 46 |
| 22 Other (audio) | 3 | 3 | 3 | 3 | 3 |
| 2 Graphics | 330 | 337 | 365 | 388 | 388 |
| 10 Animations | 43 | 41 | 42 | 45 | 45 |
| 11 Battle Backgrounds | 14 | 14 | 16 | 17 | 17 |
| 21 Other (graphics) | 35 | 37 | 41 | 53 | 53 |
| 4 Tilesets | 238 | 245 | 266 | 273 | 273 |
| 7 Buildings (Exterior) | 27 | 27 | 27 | 27 | 27 |
| 12 Buildings (Interior) | 20 | 21 | 26 | 26 | 26 |
| 5 Characters | 68 | 73 | 82 | 84 | 84 |
| 13 Collections | 15 | 18 | 21 | 22 | 22 |
| 14 Items | 27 | 20 | 21 | 21 | 21 |
| 15 Monsters | 30 | 30 | 31 | 32 | 32 |
| 16 Other (tilesets) | 24 | 27 | 29 | 30 | 30 |
| 6 Terrain | 27 | 29 | 29 | 31 | 31 |
| 3 RPG Code | 164 | 108 | 71 | 81 | 81 |
| 17 Custom Systems | 30 | 7 | 9 | 14 | 14 |
| 18 Methods | 24 | 26 | 17 | 18 | 18 |
| 20 Other (code) | 80 | 45 | 23 | 26 | 26 |
| 19 Plugins | 30 | 30 | 22 | 23 | 23 |

The RPG Code parent count is exactly the sum of its four sub-categories in every capture
(2007-02-19: 30+24+80+30 = 164; 2009-03-30: 9+17+23+22 = 71; 2010-02-10: 14+18+26+23 = 81),
so `files.php?cat=3` itself never lists files — it is a pure sub-category page.

### Capture-by-capture totals and the Plugins 30 → 23 question

`files.php?cat=N` prints `Files (T) - Page P`, where `T` is the category total at the
moment of capture. Those headers, not the category-index counters, settle the change:

| Listing capture | Snapshot | Category total | Rows read |
|---|---|---|---|
| `browse-20070220.html` | https://web.archive.org/web/20070220080238id_/http://www.toolkitzone.com:80/files.php?browse | — | 3 |
| `browse-20090417.html` | https://web.archive.org/web/20090417032845id_/http://www.toolkitzone.com:80/files.php?browse | — | 3 |
| `browse-20100210.html` | https://web.archive.org/web/20100210141327id_/http://www.toolkitzone.com:80/files.php?browse | — | 3 |
| `cat17-20070107.html` | https://web.archive.org/web/20070107111254id_/http://toolkitzone.com:80/files.php?cat=17 | 23 | 10 |
| `cat17-20070220.html` | https://web.archive.org/web/20070220041748id_/http://www.toolkitzone.com:80/files.php?cat=17 | 22 | 10 |
| `cat17-20080118.html` | https://web.archive.org/web/20080118061250id_/http://www.toolkitzone.com:80/files.php?cat=17 | — | 7 |
| `cat17-20090330.html` | https://web.archive.org/web/20090330064209id_/http://www.toolkitzone.com:80/files.php?cat=17 | — | 9 |
| `cat17-20100210.html` | https://web.archive.org/web/20100210134845id_/http://www.toolkitzone.com:80/files.php?cat=17 | 14 | 10 |
| `cat18-20070107.html` | https://web.archive.org/web/20070107111303id_/http://toolkitzone.com:80/files.php?cat=18 | 31 | 10 |
| `cat18-20070302.html` | https://web.archive.org/web/20070302165934id_/http://www.toolkitzone.com:80/files.php?cat=18 | 23 | 10 |
| `cat18-20070308-p2.html` | https://web.archive.org/web/20070308002551id_/http://toolkitzone.com:80/files.php?cat=18&page=2 | 23 | 10 |
| `cat18-20070308-p3.html` | https://web.archive.org/web/20070308004005id_/http://toolkitzone.com:80/files.php?cat=18&page=3 | 23 | 3 |
| `cat18-20090330.html` | https://web.archive.org/web/20090330144533id_/http://www.toolkitzone.com:80/files.php?cat=18 | 17 | 10 |
| `cat18-20100210.html` | https://web.archive.org/web/20100210135449id_/http://www.toolkitzone.com:80/files.php?cat=18 | 18 | 10 |
| `cat19-20070107.html` | https://web.archive.org/web/20070107111313id_/http://toolkitzone.com:80/files.php?cat=19 | 30 | 10 |
| `cat19-20070302.html` | https://web.archive.org/web/20070302165945id_/http://www.toolkitzone.com:80/files.php?cat=19 | 30 | 10 |
| `cat19-20070308-p2.html` | https://web.archive.org/web/20070308004013id_/http://toolkitzone.com:80/files.php?cat=19&page=2 | 30 | 10 |
| `cat19-20070308-p3.html` | https://web.archive.org/web/20070308004024id_/http://toolkitzone.com:80/files.php?cat=19&page=3 | 30 | 10 |
| `cat19-20071122.html` | https://web.archive.org/web/20071122053433id_/http://www.toolkitzone.com:80/files.php?cat=19 | 30 | 10 |
| `cat19-20080509.html` | https://web.archive.org/web/20080509051346id_/http://www.toolkitzone.com:80/files.php?cat=19 | 32 | 10 |
| `cat19-20090330.html` | https://web.archive.org/web/20090330141435id_/http://www.toolkitzone.com:80/files.php?cat=19 | 22 | 10 |
| `cat19-20100305.html` | https://web.archive.org/web/20100305055700id_/http://www.toolkitzone.com:80/files.php?cat=19 | 23 | 10 |
| `cat20-20070107.html` | https://web.archive.org/web/20070107111326id_/http://toolkitzone.com:80/files.php?cat=20 | 65 | 10 |
| `cat20-20070220.html` | https://web.archive.org/web/20070220080450id_/http://www.toolkitzone.com:80/files.php?cat=20 | 67 | 10 |
| `cat20-20070523-p2.html` | https://web.archive.org/web/20070523204244id_/http://www.toolkitzone.com:80/files.php?cat=20&page=2 | 45 | 10 |
| `cat20-20070523-p3.html` | https://web.archive.org/web/20070523224338id_/http://www.toolkitzone.com:80/files.php?cat=20&page=3 | 45 | 10 |
| `cat20-20070523-p4.html` | https://web.archive.org/web/20070523224200id_/http://www.toolkitzone.com:80/files.php?cat=20&page=4 | 45 | 10 |
| `cat20-20070523-p5.html` | https://web.archive.org/web/20070523204350id_/http://www.toolkitzone.com:80/files.php?cat=20&page=5 | 45 | 5 |
| `cat20-20090330.html` | https://web.archive.org/web/20090330141252id_/http://www.toolkitzone.com:80/files.php?cat=20 | 23 | 10 |
| `cat20-20100210.html` | https://web.archive.org/web/20100210140240id_/http://www.toolkitzone.com:80/files.php?cat=20 | 26 | 10 |
| `new-20070219.html` | https://web.archive.org/web/20070219183355id_/http://www.toolkitzone.com:80/files.php?new | — | 19 |
| `new-20100210.html` | https://web.archive.org/web/20100210141852id_/http://www.toolkitzone.com:80/files.php?new | — | 2 |

So the plugin category peaked at **32** files in 2008-05, fell to **22** by 2009-03-30 and
recovered to **23** by 2010-03-05; the 2007 index page's `Plugins (30)` is simply an
earlier point on the same curve (30 in 2007-01 … 2007-11). The 30 → 23 drop is
deletion from the site, not a change in how the counter is computed: 8 files vanished
between 2008-05-09 (32) and 2009-03-30 (22) and one was added back afterwards.

## Plugins (cat 19) — 40 files recovered

#### 147 · Text Box
- **Category** Plugins (cat 19) · **Author** Dan · **Date added** December 30th, 2003 · **Rating** 3/5
- **Site downloads counter** 228 (maximum seen across captures) · **Version** not stated on the listing pages
- **Payload** no Wayback capture of any `*/files/N.*` path for this id
- **Local** — · **Contains DLL** unknown · **Bundled docs** unknown
> Allows you to use a simple text box which has customizable width, height, background and foreground colours, font, screen position and initial value.
- **Detail page** real author/source `Dan` · version `1.0` · archive 248.5 kb · downloaded 176 times at capture — `fman-id3-file147.html, fman-id5-file147.html, fman-id7-file147.html`
- *Seen in:* cat19-20070308-p3.html

#### 148 · Misc Pack
- **Category** Plugins (cat 19) · **Author** Dan · **Date added** December 30th, 2003 · **Rating** 3/5
- **Site downloads counter** 267 (maximum seen across captures) · **Version** not stated on the listing pages
- **Payload** no Wayback capture of any `*/files/N.*` path for this id
- **Local** — · **Contains DLL** unknown · **Bundled docs** unknown
> Introduces a whole array of new commands to RPG Code related to file input/output and string manipulation. Also comes with a well written reference to all the commands.
- **Detail page** real author/source `Dan` · version `1.0` · archive 252.3 kb · downloaded 218 times at capture — `fman-id3-file148.html, fman-id5-file148.html`
- *Seen in:* cat19-20070308-p3.html

#### 149 · Multi-Plug
- **Category** Plugins (cat 19) · **Author** Xavier · **Date added** December 30th, 2003 · **Rating** 5/5
- **Site downloads counter** 930 (maximum seen across captures) · **Version** not stated on the listing pages
- **Payload** no Wayback capture of any `*/files/N.*` path for this id
- **Local** — · **Contains DLL** unknown · **Bundled docs** unknown
> Multiplug looks in your Toolkit2Plugin folder for other plugins and will automatically load them. For more information and help on setting this up, click here. Toolkit 2 Only
- **Detail page** real author/source `Christopher Matthews` · archive 51.4 kb · downloaded 829 times at capture — `fman-id3-file149.html`
- *Seen in:* cat19-20070308-p3.html

#### 152 · FTP
- **Category** Plugins (cat 19) · **Author** Xavier · **Date added** December 30th, 2003 · **Rating** 4/5
- **Site downloads counter** 412 (maximum seen across captures) · **Version** not stated on the listing pages
- **Payload** no Wayback capture of any `*/files/N.*` path for this id
- **Local** — · **Contains DLL** unknown · **Bundled docs** unknown
> A great plugin that allows you to move files to and from an FTP directory. Comes with a decent help file too.
- **Detail page** real author/source `Kaptan` · archive 7.7 kb · downloaded 278 times at capture — `fman-id3-file152.html`
- *Seen in:* cat19-20070308-p3.html

#### 153 · Juicy
- **Category** Plugins (cat 19) · **Author** Xavier · **Date added** December 30th, 2003 · **Rating** 4/5
- **Site downloads counter** 1472 (maximum seen across captures) · **Version** not stated on the listing pages
- **Payload** no Wayback capture of any `*/files/N.*` path for this id
- **Local** — · **Contains DLL** unknown · **Bundled docs** unknown
> The usual high standard from MrG as he introduced a great set of new features for RPG Code such as mouse functions and tile manipulation.
- **Detail page** real author/source `MrG` · version `1.0` · archive 124.0 kb · downloaded 1192 times at capture — `fman-id3-file153.html, fman-id5-file153.html, fman-id7-file153.html`
- *Seen in:* cat19-20070308-p3.html

#### 154 · Flash
- **Category** Plugins (cat 19) · **Author** Xavier · **Date added** December 30th, 2003 · **Rating** 5/5
- **Site downloads counter** 1896 (maximum seen across captures) · **Version** not stated on the listing pages
- **Payload** no Wayback capture of any `*/files/N.*` path for this id
- **Local** — · **Contains DLL** unknown · **Bundled docs** unknown
> Fantastic plugin that allows you to use flash movies within your game. Help file included although it could do with having some examples to aid the less abled programmers unde...
- **Detail page** real author/source `Triuken` · version `0.01` · archive 670.9 kb · downloaded 1432 times at capture — `files-idx-file154.html, fman-id3-file154.html, fman-id5-file154.html, fman-id7-file154.html`
- *Seen in:* cat19-20070308-p3.html

#### 155 · Misc Pack
- **Category** Plugins (cat 19) · **Author** Xavier · **Date added** December 30th, 2003 · **Rating** 4/5
- **Site downloads counter** 2417 (maximum seen across captures) · **Version** not stated on the listing pages
- **Payload** no Wayback capture of any `*/files/N.*` path for this id
- **Local** — · **Contains DLL** unknown · **Bundled docs** unknown
> Another varied plugin from the ever reliable MrG adding various commands dealing with special moves, items and characters.
- **Detail page** real author/source `MrG` · archive 21.7 kb · downloaded 1993 times at capture — `files-idx-file155.html, fman-id3-file155.html, fman-id5-file155.html, fman-id7-file155.html`
- *Seen in:* cat19-20070308-p3.html

#### 156 · Multiplayer
- **Category** Plugins (cat 19) · **Author** Cyranoid · **Date added** December 30th, 2003 · **Rating** 3/5
- **Site downloads counter** 2191 (maximum seen across captures) · **Version** not stated on the listing pages
- **Payload** no Wayback capture of any `*/files/N.*` path for this id
- **Local** — · **Contains DLL** unknown · **Bundled docs** unknown
> Well, they asked for it and they got it. A plugin from Cyranoid with various features to help support an online Toolkit game. There are also unrelated commands for string mani...
- **Detail page**  — `fman-id3-file156.html, fman-id5-file156.html, fman-id7-file156.html`
- *Seen in:* cat19-20070308-p3.html

#### 157 · Programmer's Plugin
- **Category** Plugins (cat 19) · **Author** Xavier · **Date added** December 30th, 2003 · **Rating** 4/5
- **Site downloads counter** 436 (maximum seen across captures) · **Version** not stated on the listing pages
- **Payload** no Wayback capture of any `*/files/N.*` path for this id
- **Local** — · **Contains DLL** unknown · **Bundled docs** unknown
> Leuf has introduced a whole host of commands that will please the coders out there with support for string manipulation and more.
- **Detail page** real author/source `Leuf` · archive 14.9 kb · downloaded 364 times at capture — `fman-id3-file157.html, fman-id5-file157.html, fman-id7-file157.html`
- *Seen in:* cat19-20070308-p3.html

#### 158 · Misc Pack
- **Category** Plugins (cat 19) · **Author** Xavier · **Date added** December 30th, 2003 · **Rating** 4/5
- **Site downloads counter** 1010 (maximum seen across captures) · **Version** not stated on the listing pages
- **Payload** no Wayback capture of any `*/files/N.*` path for this id
- **Local** — · **Contains DLL** unknown · **Bundled docs** unknown
> This plugin adds much needed TrueType font support as well as introducing other useful commands.
- **Detail page** real author/source `Triuken` · version `0.5.1` · archive 69.5 kb · downloaded 916 times at capture — `fman-id3-file158.html, fman-id5-file158.html, fman-id7-file158.html`
- *Seen in:* cat19-20070308-p3.html

#### 169 · Shell
- **Category** Plugins (cat 19) · **Author** John@aljo · **Date added** January 1st, 2004 · **Rating** 3/5
- **Site downloads counter** 202 (maximum seen across captures) · **Version** not stated on the listing pages
- **Payload** no Wayback capture of any `*/files/N.*` path for this id
- **Local** — · **Contains DLL** unknown · **Bundled docs** unknown
> Offers a range of commands such as get current directory and file size. The download also comes with a method pack with more related routines to help you along.
- **Detail page** real author/source `John@aljo` · version `1.0` · archive 8.9 kb · downloaded 131 times at capture — `fman-id3-file169.html, fman-id5-file169.html, fman-id7-file169.html`
- *Seen in:* cat19-20070308-p2.html

#### 170 · Never Fail Read Write Plugin
- **Category** Plugins (cat 19) · **Author** John@aljo · **Date added** January 1st, 2004 · **Rating** 3/5
- **Site downloads counter** 220 (maximum seen across captures) · **Version** not stated on the listing pages
- **Payload** no Wayback capture of any `*/files/N.*` path for this id
- **Local** — · **Contains DLL** unknown · **Bundled docs** unknown
> Exactly what you might expect; a collection of commands for reading and writing files as well as one or two other useful things.
- **Detail page** real author/source `John@aljo` · version `3.0` · archive 8.3 kb · downloaded 208 times at capture — `fman-id3-file170.html, fman-id5-file170.html, fman-id7-file170.html`
- *Seen in:* cat19-20070308-p2.html

#### 171 · Edit Box
- **Category** Plugins (cat 19) · **Author** John@aljo · **Date added** January 1st, 2004 · **Rating** 4/5
- **Site downloads counter** 671 (maximum seen across captures) · **Version** not stated on the listing pages
- **Payload** no Wayback capture of any `*/files/N.*` path for this id
- **Local** — · **Contains DLL** unknown · **Bundled docs** unknown
> Updated version of the superior edit box plugin from the Aljo brothers which supports a whole host of customizable features and comes with a well written help file which inclu...
- **Detail page** real author/source `Aljo Brothers` · version `2.2` · archive 19.5 kb · downloaded 601 times at capture — `fman-id3-file171.html`
- *Seen in:* cat19-20070308-p2.html

#### 221 · Advanced RPGCode
- **Category** Plugins (cat 19) · **Author** BP_da_Coder · **Date added** January 8th, 2004 · **Rating** 4/5
- **Site downloads counter** 581 (maximum seen across captures) · **Version** not stated on the listing pages
- **Payload** no Wayback capture of any `*/files/N.*` path for this id
- **Local** — · **Contains DLL** unknown · **Bundled docs** unknown
> A plugin for the more experienced coders out there, allowing you to access all the plugin SDK callbacks in normal RPG Code.
- **Detail page** real author/source `BP da Coder` · version `Alpha 0.9` · archive 21.7 kb · downloaded 455 times at capture — `fman-id3-file221.html, fman-id5-file221.html, fman-id7-file221.html`
- *Seen in:* cat19-20070308-p2.html

#### 304 · VB Mini-Game
- **Category** Plugins (cat 19) · **Author** Colin · **Date added** February 21st, 2004 · **Rating** 3/5
- **Site downloads counter** 183 (maximum seen across captures) · **Version** not stated on the listing pages
- **Payload** no Wayback capture of any `*/files/N.*` path for this id
- **Local** — · **Contains DLL** unknown · **Bundled docs** unknown
> Scary concept first percived by CBM as "the main use for plugins" This mini game shows how easy the vb sdk can manipulate this idea. Not exactly the best mini game out there b...
- **Detail page** real author/source `KSNiloc` · version `1.2` · archive 291.8 kb · downloaded 153 times at capture — `fman-id3-file304.html, fman-id5-file304.html, fman-id7-file304.html`
- *Seen in:* cat19-20070308-p2.html

#### 313 · Resolution Changer
- **Category** Plugins (cat 19) · **Author** Colin · **Date added** February 22nd, 2004 · **Rating** 3/5
- **Site downloads counter** 170 (maximum seen across captures) · **Version** not stated on the listing pages
- **Payload** no Wayback capture of any `*/files/N.*` path for this id
- **Local** — · **Contains DLL** unknown · **Bundled docs** unknown
> nice Resolution Changing plugin. Not much to it but change res and change res back. Remeber to change res back because otherwise your puter gets stuck in the res you specified...
- **Detail page** real author/source `KSNiloc` · archive 9.9 kb · downloaded 129 times at capture — `files-idx-file313.html, fman-id3-file313.html, fman-id7-file313.html`
- *Seen in:* cat19-20070308-p2.html

#### 468 · E-Mail Plugin
- **Category** Plugins (cat 19) · **Author** Colin · **Date added** April 2nd, 2004 · **Rating** 3/5
- **Site downloads counter** 188 (maximum seen across captures) · **Version** not stated on the listing pages
- **Payload** no Wayback capture of any `*/files/N.*` path for this id
- **Local** — · **Contains DLL** unknown · **Bundled docs** unknown
> When you think plugins for everything have been thought of here comes a new wacky idea, wacky in a good sense. Email a player or visa versa with this VB plugin, you can find i...
- **Detail page** real author/source `KSNiloc` · version `1.0` · archive 8.7 kb · downloaded 144 times at capture — `fman-id3-file468.html`
- *Seen in:* cat19-20070308-p2.html

#### 478 · DMenu [Vortex plugin]
- **Category** Plugins (cat 19) · **Author** dragcash · **Date added** April 4th, 2004 · **Rating** 5/5
- **Site downloads counter** 2528 (maximum seen across captures) · **Version** not stated on the listing pages
- **Payload** no Wayback capture of any `*/files/N.*` path for this id
- **Local** — · **Contains DLL** unknown · **Bundled docs** unknown
> Plugin for RPG Code editor Vortex, adding a menu builder to the program. Comes with a good step by step tutorial to help you construct your point and click game menu!
- **Detail page** real author/source `Dragcash` · version `1.0` · archive 369.3 kb · downloaded 1975 times at capture — `files-idx-file478.html, fman-id3-file478.html, fman-id5-file478.html, fman-id7-file478.html`
- *Seen in:* cat19-20070308-p2.html

#### 550 · Binary Read/Write Plugin
- **Category** Plugins (cat 19) · **Author** Colin · **Date added** April 25th, 2004 · **Rating** 3/5
- **Site downloads counter** 169 (maximum seen across captures) · **Version** not stated on the listing pages
- **Payload** no Wayback capture of any `*/files/N.*` path for this id
- **Local** — · **Contains DLL** unknown · **Bundled docs** unknown
> KSNiloc has put together a simple and sweet read and write plugin for binary. Included is a handy document explaining the commands that come with.
- *Seen in:* cat19-20070308-p2.html

#### 552 · Movie Player
- **Category** Plugins (cat 19) · **Author** Colin · **Date added** April 25th, 2004 · **Rating** 3/5
- **Site downloads counter** 476 (maximum seen across captures) · **Version** not stated on the listing pages
- **Payload** no Wayback capture of any `*/files/N.*` path for this id
- **Local** — · **Contains DLL** unknown · **Bundled docs** unknown
> Another piece of quick work by KSNiloc, putting together this plugin after it was requested earlier today! Allows you to play movie files in the Toolkit in a far superior mann...
- **Detail page**  — `files-idx-file552.html`
- *Seen in:* cat19-20070308-p2.html

#### 559 · Winsock Plugin
- **Category** Plugins (cat 19) · **Author** computerdude800 · **Date added** Apr 27th, '04 / April 27th, 2004 · **Rating** 3/5
- **Site downloads counter** 325 (maximum seen across captures) · **Version** not stated on the listing pages
- **Payload** no Wayback capture of any `*/files/N.*` path for this id
- **Local** — · **Contains DLL** unknown · **Bundled docs** unknown
> Online gaming your thing? Well CompDude has come up with a new Winsock plugin. *gasps* A rival against Cy and Kaptan's online plugins. At this moment it can only connect a server and a client but the commands are set up well, so he could connect an infinite amount of clients in later releases. If you don't like the outside server thing Cy offers or writing to an ftp host then this is your way to go. Oh and a MMORG can be made by the FTP plugin just so you know CompDude.
- **Detail page**  — `files-idx-file559.html`
- *Seen in:* cat19-20070107.html, cat19-20070302.html

#### 613 · Common Dialog
- **Category** Plugins (cat 19) · **Author** computerdude800 · **Date added** May 20th, '04 / May 20th, 2004 · **Rating** 3/5
- **Site downloads counter** 323 (maximum seen across captures) · **Version** not stated on the listing pages
- **Payload** no Wayback capture of any `*/files/N.*` path for this id
- **Local** — · **Contains DLL** unknown · **Bundled docs** unknown
> Allows you to use the common dialogs, like the ones you see in windows. What you use them for is up to you . Includes file open/save, color picker, and font dialogs. It is a VB plugin so try reading this if you don't know how to set one up.
- **Detail page**  — `files-idx-file613.html`
- *Seen in:* cat19-20070107.html, cat19-20070302.html, cat19-20071122.html

#### 819 · VB Plugin SDK (TK 3.0.4+)
- **Category** Plugins (cat 19) · **Author** Colin · **Date added** September 16th, 2004 · **Rating** 5/5
- **Site downloads counter** 935 (maximum seen across captures) · **Version** not stated on the listing pages
- **Payload** no Wayback capture of any `*/files/N.*` path for this id
- **Local** — · **Contains DLL** unknown · **Bundled docs** unknown
> This nice little software development kit allows you to build plugins for TK3 using Visual Basic. The instructions are very basic, so you will need an idea of what you're doing beforehand, but this is nonetheless a highly recommended download for VB programmers.
- **Detail page** real author/source `Colin James Fitzpatrick` · archive 31.6 kb · downloaded 680 times at capture — `files-idx-file819.html, fman-id3-file819.html`
- *Seen in:* cat19-20070107.html, cat19-20070302.html, cat19-20071122.html

#### 823 · Canvas Get Screen
- **Category** Plugins (cat 19) · **Author** Colin · **Date added** September 17th, 2004 · **Rating** 3/5
- **Site downloads counter** 205 (maximum seen across captures) · **Version** not stated on the listing pages
- **Payload** no Wayback capture of any `*/files/N.*` path for this id
- **Local** — · **Contains DLL** unknown · **Bundled docs** unknown
> I wouldn't stop complaining at KSNiloc that the TK couldn't do this, so he made it as a plugin. This lets you use restorescreen to restore canvases to the screen. Without this command, canvases and savescreen states are completely seperate (As far as the RPGCode is concerned.) but this command allows you to use both systems together, giving you slightly more power.
- **Detail page**  — `files-idx-file823.html`
- *Seen in:* cat19-20070107.html, cat19-20070302.html, cat19-20071122.html, cat19-20080509.html

#### 861 · C++ Plugin SDK, 3.04+ Version
- **Category** Plugins (cat 19) · **Author** Colin · **Date added** October 11th, 2004 · **Rating** 5/5
- **Site downloads counter** 1316 (maximum seen across captures) · **Version** not stated on the listing pages
- **Payload** `fileman/files/861.zip` via `http://www.toolkitzone.com:80/fileman/files/861.zip` (snapshot `20051018141409`, recovered, 49728 B on disk)
- **Payload** `fileman/files/861.zip` via `http://www.toolkitzone.com:80/fileman/files/861.zip` (snapshot `20051226073717`, recovered, 49728 B on disk)
- **Local** `downloads/fileman-861.zip`
- **Contains DLL** no · **Bundled docs** yes
- `readme - GUIDGEN.txt` (232 B):
  > ========================================================== GUIDGEN ========================================================== GUIDGEN is copyright Microsoft 1996 - 1998. Use this application as indicated in GUIDs.h. -Colin
- `readme - SDK.txt` (3439 B):
  > ========================================================== COM Plugin SDK (C++), version 2.0 ========================================================== ========================================================== What is this? ========================================================== This is an updated plugin SDK for TK 3.04+ and an outlook into Trans3 & COM. ========================================================== Updates ========================================================== 2.0: Mostly r
> This is a plugin SDK updated for 3.04, it shows how you can use COM to communicate with trans3. Updated, now with an example.
- **Detail page** real author/source `Colin James Fitzpatrick` · version `SDK version 2.0` · archive 48.6 kb · downloaded 825 times at capture — `files-idx-file861.html, fman-id3-file861.html`
- *Seen in:* cat19-20070107.html, cat19-20070302.html, cat19-20071122.html, cat19-20080509.html

#### 964 · SaveScreen Fix
- **Category** Plugins (cat 19) · **Author** Colin · **Date added** January 2nd, 2005 · **Rating** 4/5
- **Site downloads counter** 348 (maximum seen across captures) · **Version** not stated on the listing pages
- **Payload** no Wayback capture of any `*/files/N.*` path for this id
- **Local** — · **Contains DLL** unknown · **Bundled docs** unknown
> This plugin provides a fix to all problems with the savescreen commands. It also gives two new related commands to use. The readme explains fully.
- **Detail page**  — `files-idx-file964.html`
- *Seen in:* cat19-20070107.html, cat19-20070302.html, cat19-20071122.html, cat19-20080509.html

#### 1244 · FMod Audio Plugin
- **Category** Plugins (cat 19) · **Author** Oyerth · **Date added** August 8th, 2008 / February 10th, 2006 · **Rating** 5/5
- **Site downloads counter** 815 (maximum seen across captures) · **Version** not stated on the listing pages
- **Payload** no Wayback capture of any `*/files/N.*` path for this id
- **Local** — · **Contains DLL** unknown · **Bundled docs** unknown
> Plugin from Oyerth that introduces a whole array of fantastic new audio capabilities for the Toolkit. Supporting a total of 22 file types, this plugin provides 24 audio related commands allowing you to, in short, play multiple sounds at the same time, group sounds, apply audio effects, fade outs, individual volumes and pausing. It also comes complete with documentation providing summaries of all commands to get you started. However melodramatic I may sound, this really does revolutionise the audio prowess of the Toolkit. Update - 15th Feb 2006: Two new commands for pitch and tempo, fixed bug with fading a channel and reduced plugin size.
- **Detail page** real author/source `Oyerth` · version `1.0.1` · archive 276.1 kb · downloaded 285 times at capture — `files-idx-file1244.html, fman-id3-file1244.html, fman-id5-file1244.html, fman-id7-file1244.html`
- *Seen in:* cat19-20070107.html, cat19-20070302.html, cat19-20071122.html, cat19-20080509.html, cat19-20090330.html, cat19-20100305.html

#### 1294 · Adapter
- **Category** Plugins (cat 19) · **Author** John@aljo · **Date added** Apr 5th, '06 / April 5th, 2006 · **Rating** 3/5
- **Site downloads counter** 87 (maximum seen across captures) · **Version** not stated on the listing pages
- **Payload** no Wayback capture of any `*/files/N.*` path for this id
- **Local** — · **Contains DLL** unknown · **Bundled docs** unknown
> Plugin from John@aljo that provides a pretty simple, but very useful, functionality in the way of the command execute(command$) which allows you to run any external program.
- **Detail page** real author/source `John Chappell` · version `1.0` · archive 45.2 kb · downloaded 40 times at capture — `files-idx-file1294.html, fman-id3-file1294.html, fman-id5-file1294.html, fman-id7-file1294.html`
- *Seen in:* cat19-20070107.html, cat19-20070302.html, cat19-20071122.html, cat19-20080509.html

#### 1310 · Item Plugin
- **Category** Plugins (cat 19) · **Author** Sander · **Date added** May 8th, '06 / May 8th, 2006 · **Rating** 4/5
- **Site downloads counter** 911 (maximum seen across captures) · **Version** not stated on the listing pages
- **Payload** no Wayback capture of any `*/files/N.*` path for this id
- **Local** — · **Contains DLL** unknown · **Bundled docs** unknown
> Often a user wishes to create their own item menu system but the RPG Code functions are lacking when it comes to accessing the details of a specific item. Sander's plugin introduces 24 new functions, each returning one of the variables of an item such as if it's equipable or if it's a key item. Very handy addition to those wishing to customise their games beyond the default systems.
- **Detail page** real author/source `Sander` · version `1.0.0` · archive 47.5 kb · downloaded 264 times at capture — `files-idx-file1310.html, fman-id3-file1310.html, fman-id5-file1310.html, fman-id7-file1310.html`
- *Seen in:* cat19-20070107.html, cat19-20070302.html, cat19-20071122.html, cat19-20080509.html

#### 1326 · Yet Another Item Plugin
- **Category** Plugins (cat 19) · **Author** John@aljo · **Date added** Jun 20th, '06 / June 20th, 2006 · **Rating** 3/5
- **Site downloads counter** 446 (maximum seen across captures) · **Version** not stated on the listing pages
- **Payload** no Wayback capture of any `*/files/N.*` path for this id
- **Local** — · **Contains DLL** unknown · **Bundled docs** unknown
> Provides six new item related commands, often seeking to improve on what TK 3.0.6 currently offers or get around the bugs it currently has, including getting the direction the player is facing. Comes with readme and source.
- **Detail page** real author/source `John Chappell` · version `1.0` · archive 32.4 kb · downloaded 91 times at capture — `files-idx-file1326.html, fman-id3-file1326.html`
- *Seen in:* cat19-20070107.html, cat19-20070302.html, cat19-20071122.html, cat19-20080509.html

#### 1503 · 32-bit Image Support
- **Category** Plugins (cat 19) · **Author** Shao · **Date added** May 11th, 2007 · **Rating** 5/5
- **Site downloads counter** 207 (maximum seen across captures) · **Version** not stated on the listing pages
- **Payload** no Wayback capture of any `*/files/N.*` path for this id
- **Local** — · **Contains DLL** unknown · **Bundled docs** unknown
> This plugin greatly improves the toolkit's abilities in setting images to the screen. It includes support for over a hundred different formats, supports alpha channels, and c...
- **Detail page**  — `files-idx-file1503.html`
- *Seen in:* cat19-20071122.html, cat19-20080509.html, cat19-20090330.html

#### 1590 · Default Battle System with Item bug workaround
- **Category** Plugins (cat 19) · **Author** jackyboy · **Date added** February 19th, 2008 / February 21st, 2009 · **Rating** 4/5
- **Site downloads counter** 153 (maximum seen across captures) · **Version** not stated on the listing pages
- **Payload** `vault/files/1590.zip` via `http://toolkitzone.com/vault/files/1590.zip` (snapshot `20100101231543`, recovered, 32351 B on disk)
- **Local** `downloads/vault-1590.zip`
- **Contains DLL** yes: tk3fight.dll · **Bundled docs** yes
- `ReadMe.txt` (230 B):
  > Recent changes made to the tk3fight.dll 1.) Item bug fixed 2.) Equip animations - when placed on left or right hand - now show 3.) Extreme sensitivity to Enter key 4.) Name now reflects name given by the Player Name variable
> For anyone who uses the default battle system, this plugin fixes several issues including: the infamous "item not found" bug, displays the player's name variable for player na...
- **Detail page**  — `files-idx-file1590.html`
- *Seen in:* cat19-20080509.html, cat19-20090330.html, cat19-20100305.html

#### 1599 · Menu Help Plugin
- **Category** Plugins (cat 19) · **Author** jackyboy · **Date added** April 24th, 2008 / August 14th, 2008 / June 6th, 2009 · **Rating** 5/5
- **Site downloads counter** 360 (maximum seen across captures) · **Version** not stated on the listing pages
- **Payload** no Wayback capture of any `*/files/N.*` path for this id
- **Local** — · **Contains DLL** unknown · **Bundled docs** unknown
> An amazingly useful plugin that will let you work with RPG Toolkit's item, inventory, and special moves systems from RPG Code. I can imagine this being very helpful to anyone...
- *Seen in:* cat19-20080509.html, cat19-20090330.html, cat19-20100305.html

#### 1629 · Enemy info Plugin
- **Category** Plugins (cat 19) · **Author** jackyboy · **Date added** October 13th, 2008 / October 4th, 2009 · **Rating** 5/5
- **Site downloads counter** 125 (maximum seen across captures) · **Version** not stated on the listing pages
- **Payload** no Wayback capture of any `*/files/N.*` path for this id
- **Local** — · **Contains DLL** unknown · **Bundled docs** unknown
> The Enemy info plugin allows you to load *.ene files into multiple slots. From there you may access all the information from the enemy file as well as the variables for that ...
- **Detail page**  — `files-idx-file1629.html`
- *Seen in:* cat19-20090330.html, cat19-20100305.html

#### 1630 · Default Menu Patch
- **Category** Plugins (cat 19) · **Author** jackyboy · **Date added** August 14th, 2008 / June 3rd, 2009 · **Rating** 4/5
- **Site downloads counter** 154 (maximum seen across captures) · **Version** not stated on the listing pages
- **Payload** no Wayback capture of any `*/files/N.*` path for this id
- **Local** — · **Contains DLL** unknown · **Bundled docs** unknown
> If you use the default menu system then this plugin is a must have. It's identical to default menu, but with some changes that fix the item bugs. Be sure to read the include...
- **Detail page**  — `files-idx-file1630.html`
- *Seen in:* cat19-20090330.html, cat19-20100305.html

#### 1652 · FileBrowserPlugin
- **Category** Plugins (cat 19) · **Author** Johnstein · **Date added** February 19th, 2010 / January 6th, 2009 · **Rating** 4/5
- **Site downloads counter** 59 (maximum seen across captures) · **Version** not stated on the listing pages
- **Payload** no Wayback capture of any `*/files/N.*` path for this id
- **Local** — · **Contains DLL** unknown · **Bundled docs** unknown
> In under a day Johnstein has managed to create a plugin in response to a forum discussion. This plugin can display a file browser to the user that allows one or multiple file...
- **Detail page**  — `files-idx-file1652.html`
- *Seen in:* cat19-20090330.html, cat19-20100305.html

#### 1654 · GetSaveData Plugin
- **Category** Plugins (cat 19) · **Author** Johnstein · **Date added** January 10th, 2009 · **Rating** 5/5
- **Site downloads counter** 57 (maximum seen across captures) · **Version** not stated on the listing pages
- **Payload** no Wayback capture of any `*/files/N.*` path for this id
- **Local** — · **Contains DLL** unknown · **Bundled docs** unknown
> This plugin allows you to extract data from a save file (*.sav). It can be usd with the File Browser Plugin to get a list of all save files, and display a custom save/load sc...
- **Detail page**  — `files-idx-file1654.html`
- *Seen in:* cat19-20090330.html, cat19-20100305.html

#### 1661 · HTTP Plugin
- **Category** Plugins (cat 19) · **Author** furyX639 · **Date added** January 28th, 2009 · **Rating** 5/5
- **Site downloads counter** 41 (maximum seen across captures) · **Version** not stated on the listing pages
- **Payload** no Wayback capture of any `*/files/N.*` path for this id
- **Local** — · **Contains DLL** unknown · **Bundled docs** unknown
> The HTTP Plugin allows you to make HTTP requests from the RPG Toolkit. You can load a page using getURL or upload a file using putURL. It also includes sample PHP scripts ...
- **Detail page**  — `files-idx-file1661.html`
- *Seen in:* cat19-20090330.html, cat19-20100305.html

#### 1671 · Misc Plugin
- **Category** Plugins (cat 19) · **Author** jackyboy · **Date added** March 14th, 2009 / September 14th, 2009 · **Rating** 5/5
- **Site downloads counter** 129 (maximum seen across captures) · **Version** not stated on the listing pages
- **Payload** no Wayback capture of any `*/files/N.*` path for this id
- **Local** — · **Contains DLL** unknown · **Bundled docs** unknown
> Jackyboy's miscellaneous plugin holds a collection of functions per users' requests. Functions included are: * Changing a board's background image and background color. *...
- **Detail page**  — `files-idx-file1671.html`
- *Seen in:* cat19-20090330.html, cat19-20100305.html

#### 1723 · Read XML plugin
- **Category** Plugins (cat 19) · **Author** xavero · **Date added** October 4th, 2009 · **Rating** 4/5
- **Site downloads counter** 18 (maximum seen across captures) · **Version** not stated on the listing pages
- **Payload** no Wayback capture of any `*/files/N.*` path for this id
- **Local** — · **Contains DLL** unknown · **Bundled docs** unknown
> This handy plugin parses XML files. It can be very useful for organizing and accessing data. You can query the XML file as you would a database. Some possible implementatio...
- *Seen in:* cat19-20100305.html

## Custom Systems (cat 17) — 23 files recovered

#### 655 · Scrollbar Menu
- **Category** Custom Systems (cat 17) · **Author** Asimir · **Date added** Jun 12th, '04 / June 12th, 2004 · **Rating** 3/5
- **Site downloads counter** 1701 (maximum seen across captures) · **Version** not stated on the listing pages
- **Payload** `fileman/files/655.zip` via `http://www.toolkitzone.com:80/fileman/files/655.zip?PHPSESSID=57c5c9b68d2ee0570798a5b0dd80d1a8` (snapshot `20060222205244`, 3759 B recorded in CDX)
- **Local** — (capture did not replay / not downloaded)
> Asimir's description for his method pack: "This method pack contains various commands for making a menu with a scrollbar. You can make multiple menus at once with different IDs, use custom graphics for the background, scrollbar and cursor, change the keys used for input, add and remove options from the menus and clear the menus from the screen again afterwards, all with very little coding effort." Aye. All is true. Very simple to make menus with his wonderful shell. Try it out and see what you think.
- *Seen in:* cat17-20070107.html, cat17-20070220.html, cat17-20080118.html

#### 916 · One-on-One
- **Category** Custom Systems (cat 17) · **Author** zeno · **Date added** Nov 24th, '04 / November 24th, 2004 · **Rating** 1/5
- **Site downloads counter** 636 (maximum seen across captures) · **Version** not stated on the listing pages
- **Payload** no Wayback capture of any `*/files/N.*` path for this id
- **Local** — · **Contains DLL** unknown · **Bundled docs** unknown
> One on One battle system from Zeno, nothing too advanced in terms of coding and uses branches to the extreme. Unfortunately, you also have to hard code the enemy stats.
- *Seen in:* cat17-20070107.html, cat17-20070220.html

#### 925 · XSMWin
- **Category** Custom Systems (cat 17) · **Author** spitfire · **Date added** Nov 27th, '04 / November 27th, 2004 · **Rating** 3/5
- **Site downloads counter** 447 (maximum seen across captures) · **Version** not stated on the listing pages
- **Payload** no Wayback capture of any `*/files/N.*` path for this id
- **Local** — · **Contains DLL** unknown · **Bundled docs** unknown
> Simple custom message window, allowing for display at the top or bottom of the screen and up to four lines of text that you can specify. You can include character profiles by naming the image the same as the character name you pass to the message window. Short and simple, good for new users to pickup and expand from.
- *Seen in:* cat17-20070107.html, cat17-20070220.html, cat17-20080118.html

#### 939 · Dog's Diary MWin
- **Category** Custom Systems (cat 17) · **Author** Horizon · **Date added** Dec 10th, '04 / December 10th, 2004 · **Rating** 3/5
- **Site downloads counter** 473 (maximum seen across captures) · **Version** not stated on the listing pages
- **Payload** no Wayback capture of any `*/files/N.*` path for this id
- **Local** — · **Contains DLL** unknown · **Bundled docs** unknown
> A simple but handy mwin. It is used similarly to the default message window, in that you add each line of text to the message window with a seperate line of code. Generally, this is an advantage over other custom message windows, as you can use other code between lines of text. It also has support for profile pictures, which is always a nice feature for an mwin.
- *Seen in:* cat17-20070107.html, cat17-20070220.html

#### 1051 · Carls Battle System Demo
- **Category** Custom Systems (cat 17) · **Author** Special_Relativity · **Date added** Mar 28th, '05 · **Rating** 2/5
- **Site downloads counter** 314 (maximum seen across captures) · **Version** not stated on the listing pages
- **Payload** no Wayback capture of any `*/files/N.*` path for this id
- **Local** — · **Contains DLL** unknown · **Bundled docs** unknown
> It's not the best BS around, but it gets the job done. The style is similar to a Dragon Warrior type of fight, as depicted in the screenshots.
- *Seen in:* cat17-20070107.html

#### 1076 · Talking Profile & MWin
- **Category** Custom Systems (cat 17) · **Author** Destructino · **Date added** Apr 24th, '05 / April 24th, 2005 · **Rating** 2/5
- **Site downloads counter** 211 (maximum seen across captures) · **Version** not stated on the listing pages
- **Payload** no Wayback capture of any `*/files/N.*` path for this id
- **Local** — · **Contains DLL** unknown · **Bundled docs** unknown
> A small mwin program which seems to simulate talking to an extent. It isn't the most impressive mwin ever, but it gets the job done.
- *Seen in:* cat17-20070107.html, cat17-20070220.html

#### 1204 · Real Time Battle System
- **Category** Custom Systems (cat 17) · **Author** William · **Date added** March 27th, 2007 / Sep 20th, '05 / September 20th, 2005 · **Rating** 4/5
- **Site downloads counter** 2871 (maximum seen across captures) · **Version** not stated on the listing pages
- **Payload** `fileman/files/1204.zip` via `http://www.toolkitzone.com:80/fileman/files/1204.zip?PHPSESSID=57c5c9b68d2ee0570798a5b0dd80d1a8` (snapshot `20060224071500`, 146617 B recorded in CDX)
- **Payload** `fileman/files/1204.zip` via `http://www.toolkitzone.com:80/fileman/files/1204.zip?PHPSESSID=6150804f62b607601a72de12fc959311` (snapshot `20060224071530`, 146616 B recorded in CDX)
- **Local** — (capture did not replay / not downloaded)
> First version of a complete real-time battle system from William, accompanied by a ten page guide on using the system within your game. Has a range of variables to tweak and change to setup the system how you want and is relatively easy to understand and configure. TK3 Only.
- *Seen in:* cat17-20070107.html, cat17-20070220.html, cat17-20080118.html, cat17-20090330.html

#### 1220 · OC's Message Window Pack v1.2
- **Category** Custom Systems (cat 17) · **Author** Occasionally_Correct · **Date added** Nov 19th, '05 / November 19th, 2005 · **Rating** 5/5
- **Site downloads counter** 2019 (maximum seen across captures) · **Version** not stated on the listing pages
- **Payload** `fileman/files/1220.zip` — only a `301` redirect was archived (snapshot `20110823163030`), no bytes survived
- **Local** — (capture did not replay / not downloaded)
> A new release from OC that brings a feature packed and easy to use message window to the table, making use of the oft overlooked class functionality in Toolkit 3.x. A wide range of features, such as optional profile images and cursor maps, are backed up by a thorough help file that details all you need to know to use the pack. Update: 1.2 brings extra features and functionality, such as drop-shadow and outline effects.
- *Seen in:* cat17-20070107.html, cat17-20070220.html, cat17-20080118.html

#### 1239 · Item Menu System
- **Category** Custom Systems (cat 17) · **Author** volksgrenadier · **Date added** Jan 11th, '06 / January 11th, 2006 · **Rating** 1/5
- **Site downloads counter** 489 (maximum seen across captures) · **Version** not stated on the listing pages
- **Payload** no Wayback capture of any `*/files/N.*` path for this id
- **Local** — · **Contains DLL** unknown · **Bundled docs** unknown
> Custom menu system from volksgrenadier for listing items and related information, takes minimal effort to insert into your game. Comes with images and commented code. TK3 Only...
- *Seen in:* cat17-20070107.html, cat17-20070220.html, cat17-20080118.html

#### 1324 · Custom MWin
- **Category** Custom Systems (cat 17) · **Author** Malegnis · **Date added** Jun 11th, '06 / June 11th, 2006 · **Rating** 2/5
- **Site downloads counter** 227 (maximum seen across captures) · **Version** not stated on the listing pages
- **Payload** no Wayback capture of any `*/files/N.*` path for this id
- **Local** — · **Contains DLL** unknown · **Bundled docs** unknown
> A custom message window from Malegnis, fully commented and includes example images. Not the finest example of coding a message window, for example some things you might like to be customisable at runtime are hard coded, but still worth a look if you're into exploring code and its applications.
- *Seen in:* cat17-20070107.html, cat17-20070220.html, cat17-20080118.html, cat17-20090330.html

#### 1423 · CFuryMsgBox
- **Category** Custom Systems (cat 17) · **Author** furyX639 · **Date added** January 19th, 2007 · **Rating** 4/5
- **Site downloads counter** 55 (maximum seen across captures) · **Version** not stated on the listing pages
- **Payload** no Wayback capture of any `*/files/N.*` path for this id
- **Local** — · **Contains DLL** unknown · **Bundled docs** unknown
> A message box class for displaying text to the screen. It automatically constrains text in a width/height, and also has the ability to float an image to the side of the text....
- *Seen in:* cat17-20070220.html, cat17-20080118.html

#### 1588 · Fury's Custom Systems
- **Category** Custom Systems (cat 17) · **Author** furyX639 · **Date added** February 18th, 2008 · **Rating** 4/5
- **Site downloads counter** 105 (maximum seen across captures) · **Version** not stated on the listing pages
- **Payload** no Wayback capture of any `*/files/N.*` path for this id
- **Local** — · **Contains DLL** unknown · **Bundled docs** unknown
> Fury's Custom Systems includes sets of classes for a custom item system and for a custom menu system. Each comes with a sample to demonstrate the features of the custom syste...
- *Seen in:* cat17-20090330.html

#### 1617 · "Letter by Letter Type" Mwin
- **Category** Custom Systems (cat 17) · **Author** Kuraido · **Date added** June 29th, 2008 · **Rating** 3/5
- **Site downloads counter** 23 (maximum seen across captures) · **Version** not stated on the listing pages
- **Payload** no Wayback capture of any `*/files/N.*` path for this id
- **Local** — · **Contains DLL** unknown · **Bundled docs** unknown
> This is a custom message window that supports multiple lines of text. It also has built in word-wrapping.
- *Seen in:* cat17-20090330.html

#### 1625 · Mineat's Custom Game Menu
- **Category** Custom Systems (cat 17) · **Author** Mineat · **Date added** August 8th, 2008 · **Rating** 3/5
- **Site downloads counter** 81 (maximum seen across captures) · **Version** not stated on the listing pages
- **Payload** no Wayback capture of any `*/files/N.*` path for this id
- **Local** — · **Contains DLL** unknown · **Bundled docs** unknown
> This is a nice example of an RPG Code custom system that you can use instead of the default one that comes with the RPG Toolkit. Thanks to jackboy's Menu Help Plugin, this me...
- *Seen in:* cat17-20090330.html, cat17-20100210.html

#### 1635 · Shooter (Galaxy Defender)
- **Category** Custom Systems (cat 17) · **Author** Grindalf · **Date added** September 12th, 2008 · **Rating** 5/5
- **Site downloads counter** 43 (maximum seen across captures) · **Version** not stated on the listing pages
- **Payload** no Wayback capture of any `*/files/N.*` path for this id
- **Local** — · **Contains DLL** unknown · **Bundled docs** unknown
> This is the source code for Grindalf's amazingly popular Galaxy Defender series. It is fully functional out of the box, simply run the start program and you're good to go. I...
- *Seen in:* cat17-20090330.html, cat17-20100210.html

#### 1637 · Zelda BS
- **Category** Custom Systems (cat 17) · **Author** Grindalf · **Date added** October 19th, 2008 · **Rating** 5/5
- **Site downloads counter** 105 (maximum seen across captures) · **Version** not stated on the listing pages
- **Payload** no Wayback capture of any `*/files/N.*` path for this id
- **Local** — · **Contains DLL** unknown · **Bundled docs** unknown
> A very functional Zelda Battle System. In the test run it was very difficult to control, but basically everything you need is there. The enemies wander, if they get too clos...
- *Seen in:* cat17-20090330.html, cat17-20100210.html

#### 1656 · Widgets
- **Category** Custom Systems (cat 17) · **Author** comfox · **Date added** December 29th, 2008 · **Rating** 4/5
- **Site downloads counter** 11 (maximum seen across captures) · **Version** not stated on the listing pages
- **Payload** no Wayback capture of any `*/files/N.*` path for this id
- **Local** — · **Contains DLL** unknown · **Bundled docs** unknown
> This is an interesting little proof of concept that comfox has created here. With this you can easily assemble widgets that function like windows forms (should be familiar to...
- *Seen in:* cat17-20090330.html, cat17-20100210.html

#### 1658 · Mywin Message System
- **Category** Custom Systems (cat 17) · **Author** Maria · **Date added** December 31st, 2008 · **Rating** 2/5
- **Site downloads counter** 50 (maximum seen across captures) · **Version** not stated on the listing pages
- **Payload** no Wayback capture of any `*/files/N.*` path for this id
- **Local** — · **Contains DLL** unknown · **Bundled docs** unknown
> A very simple, but functional message window. It's features are the ability to define the name of the player talking, a portrait image, and you can specify the window to eith...
- *Seen in:* cat17-20090330.html, cat17-20100210.html

#### 1691 · Brenthenry's Custom Shop
- **Category** Custom Systems (cat 17) · **Author** brenthenry · **Date added** June 3rd, 2009 · **Rating** 3/5
- **Site downloads counter** 44 (maximum seen across captures) · **Version** not stated on the listing pages
- **Payload** no Wayback capture of any `*/files/N.*` path for this id
- **Local** — · **Contains DLL** unknown · **Bundled docs** unknown
> A very basic example of a custom shop system featuring basic functionality. It lists as many items as can fit on the screen, and you may select which item to buy.
- *Seen in:* cat17-20100210.html

#### 1692 · CTShop
- **Category** Custom Systems (cat 17) · **Author** aurum34 · **Date added** June 14th, 2009 · **Rating** 4/5
- **Site downloads counter** 50 (maximum seen across captures) · **Version** not stated on the listing pages
- **Payload** no Wayback capture of any `*/files/N.*` path for this id
- **Local** — · **Contains DLL** unknown · **Bundled docs** unknown
> A very simple but limited buy/sell shop system. In the latest version aurum34 has added item descriptions. Very little code is needed to make it work, and customizing it's a...
- *Seen in:* cat17-20100210.html

#### 1693 · Item List System
- **Category** Custom Systems (cat 17) · **Author** Akura_TheDragonBlader · **Date added** August 2nd, 2009 · **Rating** 3/5
- **Site downloads counter** 32 (maximum seen across captures) · **Version** not stated on the listing pages
- **Payload** no Wayback capture of any `*/files/N.*` path for this id
- **Local** — · **Contains DLL** unknown · **Bundled docs** unknown
> The Item List System is a class that stores data for the player's inventory. It's definitely useful when used with other custom systems (menu, battle, shop) since the interna...
- *Seen in:* cat17-20100210.html

#### 1741 · ZeldaBS (modified by Aurum34)
- **Category** Custom Systems (cat 17) · **Author** aurum34 · **Date added** January 31st, 2010 · **Rating** 5/5
- **Site downloads counter** 86 (maximum seen across captures) · **Version** not stated on the listing pages
- **Payload** no Wayback capture of any `*/files/N.*` path for this id
- **Local** — · **Contains DLL** unknown · **Bundled docs** unknown
> This is Grindalf's Zelda Battle System with some useful new features added that you may want to use. The readme documents a lot of the changes as well as a guide on how you c...
- *Seen in:* browse-20100210.html, cat17-20100210.html, new-20100210.html

#### 1742 · Day/Night Time
- **Category** Custom Systems (cat 17) · **Author** aurum34 · **Date added** January 7th, 2010 · **Rating** 3/5
- **Site downloads counter** 15 (maximum seen across captures) · **Version** not stated on the listing pages
- **Payload** no Wayback capture of any `*/files/N.*` path for this id
- **Local** — · **Contains DLL** unknown · **Bundled docs** unknown
> A day/night system that changes the ambient levels based on time. It features a date/time system, and it has the ability to prevent specific boards from being rendered as day...
- *Seen in:* cat17-20100210.html

## Methods (cat 18) — 30 files recovered

#### 175 · Misc Method Pack
- **Category** Methods (cat 18) · **Author** EB · **Date added** January 1st, 2004 · **Rating** 4/5
- **Site downloads counter** 1496 (maximum seen across captures) · **Version** not stated on the listing pages
- **Payload** no Wayback capture of any `*/files/N.*` path for this id
- **Local** — · **Contains DLL** unknown · **Bundled docs** unknown
> Offers a wide array of features often aksed for by Toolkit users; such as custom message window and screen fade among others. Requires a plugin by MrG, click here to download ...
- *Seen in:* cat18-20070308-p3.html

#### 178 · Fading Text
- **Category** Methods (cat 18) · **Author** Horizon · **Date added** January 2nd, 2004 · **Rating** 3/5
- **Site downloads counter** 386 (maximum seen across captures) · **Version** not stated on the listing pages
- **Payload** no Wayback capture of any `*/files/N.*` path for this id
- **Local** — · **Contains DLL** unknown · **Bundled docs** unknown
> Handy method for adding a fading text effect to your game, the program comes with each part described to help you understand the code. Customizable features include rate at wh...
- *Seen in:* cat18-20070308-p3.html

#### 269 · TheElemethian Method Pack
- **Category** Methods (cat 18) · **Author** TheElemethian · **Date added** February 12th, 2004 · **Rating** 2/5
- **Site downloads counter** 208 (maximum seen across captures) · **Version** not stated on the listing pages
- **Payload** no Wayback capture of any `*/files/N.*` path for this id
- **Local** — · **Contains DLL** unknown · **Bundled docs** unknown
> Rather nifty barebones bank. Also some other stuff such as the give FP and DP. Requires MrG's Misc Plugin.
- *Seen in:* cat18-20070308-p3.html

#### 393 · Rainbow Colored Text
- **Category** Methods (cat 18) · **Author** DEXTER · **Date added** March 10th, 2004 · **Rating** 2/5
- **Site downloads counter** 149 (maximum seen across captures) · **Version** not stated on the listing pages
- **Payload** no Wayback capture of any `*/files/N.*` path for this id
- **Local** — · **Contains DLL** unknown · **Bundled docs** unknown
> Was a small little program, Now is a great little Method, Rainbow text comes to portable code near you! great little method that makes text flash in a huge variety of colors. ...
- *Seen in:* cat18-20070308-p2.html

#### 401 · Elusive Text
- **Category** Methods (cat 18) · **Author** John@aljo · **Date added** March 12th, 2004 · **Rating** 2/5
- **Site downloads counter** 147 (maximum seen across captures) · **Version** not stated on the listing pages
- **Payload** no Wayback capture of any `*/files/N.*` path for this id
- **Local** — · **Contains DLL** unknown · **Bundled docs** unknown
> Just a little code snippet I worked on after playing with the Rainbow Text. Basically I was trying to get the text to run away from your mouse cursor. What is the usefulness ...
- *Seen in:* cat18-20070308-p2.html

#### 483 · OC's Method Pack
- **Category** Methods (cat 18) · **Author** Occasionally_Correct · **Date added** April 5th, 2004 · **Rating** 4/5
- **Site downloads counter** 1368 (maximum seen across captures) · **Version** not stated on the listing pages
- **Payload** no Wayback capture of any `*/files/N.*` path for this id
- **Local** — · **Contains DLL** unknown · **Bundled docs** unknown
> Latest version of OC's method pack has made a vast improvement on the fadingText methods by making them into one and pretty much doing an overhaul on em.. The method pack come...
- *Seen in:* cat18-20070308-p2.html

#### 516 · TSD's Methods
- **Category** Methods (cat 18) · **Author** The_Sleeping_Dragon · **Date added** April 17th, 2004 · **Rating** 3/5
- **Site downloads counter** 130 (maximum seen across captures) · **Version** not stated on the listing pages
- **Payload** no Wayback capture of any `*/files/N.*` path for this id
- **Local** — · **Contains DLL** unknown · **Bundled docs** unknown
> Has one great method that causes something that you specify to fly off in so many frames and returns them in some arrays. The other two methods are to do with some kind of enc...
- *Seen in:* cat18-20070308-p2.html

#### 614 · Graphical Effects
- **Category** Methods (cat 18) · **Author** DEXTER · **Date added** May 20th, 2004 · **Rating** 3/5
- **Site downloads counter** 260 (maximum seen across captures) · **Version** not stated on the listing pages
- **Payload** no Wayback capture of any `*/files/N.*` path for this id
- **Local** — · **Contains DLL** unknown · **Bundled docs** unknown
> bunch of graphics made by this threesome. So far the circular one that does those wierd patterns I like the best. Word2 made a circle chase the mouse cursor. It doesn't say wi...
- *Seen in:* cat18-20070308-p2.html

#### 637 · Stacks and Queues
- **Category** Methods (cat 18) · **Author** OBCT · **Date added** May 31st, 2004 · **Rating** 2/5
- **Site downloads counter** 110 (maximum seen across captures) · **Version** not stated on the listing pages
- **Payload** no Wayback capture of any `*/files/N.*` path for this id
- **Local** — · **Contains DLL** unknown · **Bundled docs** unknown
> Although very functional, it is missing a main feature of a stack and a queue. When you pop or dequeue usually something is returned. Without this it makes the stack and queue...
- *Seen in:* cat18-20070308-p2.html

#### 650 · Stack & Queue
- **Category** Methods (cat 18) · **Author** Asimir · **Date added** June 9th, 2004 · **Rating** 4/5
- **Site downloads counter** 424 (maximum seen across captures) · **Version** not stated on the listing pages
- **Payload** no Wayback capture of any `*/files/N.*` path for this id
- **Local** — · **Contains DLL** unknown · **Bundled docs** unknown
> Stack & Queue that is very correctly implemented, not only allowing you to use all the basic features of a queue or stack but it allows for more than one! Quality code, ex...
- *Seen in:* cat18-20070308-p2.html

#### 703 · Gifont
- **Category** Methods (cat 18) · **Author** TKGB · **Date added** July 1st, 2004 · **Rating** 4/5
- **Site downloads counter** 379 (maximum seen across captures) · **Version** not stated on the listing pages
- **Payload** no Wayback capture of any `*/files/N.*` path for this id
- **Local** — · **Contains DLL** unknown · **Bundled docs** unknown
> Simple but impressive idea TKGB came up with here - bitmap fonts. Useful for lots of things, and he makes sure it's simple to use with detailed explanations. It just needs a n...
- *Seen in:* cat18-20070308-p2.html

#### 721 · Tifont
- **Category** Methods (cat 18) · **Author** TKGB · **Date added** July 16th, 2004 · **Rating** 4/5
- **Site downloads counter** 247 (maximum seen across captures) · **Version** not stated on the listing pages
- **Payload** no Wayback capture of any `*/files/N.*` path for this id
- **Local** — · **Contains DLL** unknown · **Bundled docs** unknown
> TKGB adds to his alternative font methods with this tileset concept, allowing for gradients, borders and other little extras. Limitations are obvious; you're stuck with the si...
- *Seen in:* cat18-20070308-p2.html

#### 739 · Town Scroll
- **Category** Methods (cat 18) · **Author** Gnarf · **Date added** August 3rd, 2004 · **Rating** 3/5
- **Site downloads counter** 314 (maximum seen across captures) · **Version** not stated on the listing pages
- **Payload** no Wayback capture of any `*/files/N.*` path for this id
- **Local** — · **Contains DLL** unknown · **Bundled docs** unknown
> Simple position saving tool that you can easily implement into your game. Allows you to, at any time, save the current board, x, y layer positions with a simple command. At a...
- *Seen in:* cat18-20070308-p2.html, cat18-20090330.html

#### 769 · Bar Save
- **Category** Methods (cat 18) · **Author** Marc · **Date added** August 23rd, 2004
- **Site downloads counter** 219 (maximum seen across captures) · **Version** not stated on the listing pages
- **Payload** no Wayback capture of any `*/files/N.*` path for this id
- **Local** — · **Contains DLL** unknown · **Bundled docs** unknown
> This program gives you an option to save or not. If you choose to save, it saves in a location of your choice (Not the user's choice) and displays a progress bar after saving...
- *Seen in:* cat18-20070302.html

#### 814 · Collision
- **Category** Methods (cat 18) · **Author** Marc · **Date added** Sep 12th, '04 / September 12th, 2004 · **Rating** 3/5
- **Site downloads counter** 323 (maximum seen across captures) · **Version** not stated on the listing pages
- **Payload** no Wayback capture of any `*/files/N.*` path for this id
- **Local** — · **Contains DLL** unknown · **Bundled docs** unknown
> Basically this set of methods is a small system to let you know when you collided with another item or player.
- *Seen in:* cat18-20070107.html, cat18-20070302.html, cat18-20090330.html, cat18-20100210.html

#### 1082 · Word Wrap
- **Category** Methods (cat 18) · **Author** John@aljo · **Date added** Apr 27th, '05 / April 27th, 2005 · **Rating** 4/5
- **Site downloads counter** 398 (maximum seen across captures) · **Version** not stated on the listing pages
- **Payload** no Wayback capture of any `*/files/N.*` path for this id
- **Local** — · **Contains DLL** unknown · **Bundled docs** unknown
> A word wrap program. ** Updated **
- *Seen in:* cat18-20070107.html, cat18-20070302.html, cat18-20090330.html, cat18-20100210.html

#### 1172 · Scrolling Text
- **Category** Methods (cat 18) · **Author** Maria · **Date added** Jul 7th, '05 · **Rating** 3/5
- **Site downloads counter** 302 (maximum seen across captures) · **Version** not stated on the listing pages
- **Payload** no Wayback capture of any `*/files/N.*` path for this id
- **Local** — · **Contains DLL** unknown · **Bundled docs** unknown
> A great method pack that contains scrolling methods for both images and text. A must have for that true cinematic experience. Code heavily based on OC's methods.
- *Seen in:* cat18-20070107.html

#### 1207 · Mouse Click Move
- **Category** Methods (cat 18) · **Author** Frost · **Date added** Sep 26th, '05 / September 26th, 2005
- **Site downloads counter** 438 (maximum seen across captures) · **Version** not stated on the listing pages
- **Payload** no Wayback capture of any `*/files/N.*` path for this id
- **Local** — · **Contains DLL** unknown · **Bundled docs** unknown
> Small method from Frost that uses his player co-ordinate function to allow the sprite to move to the location you click. TK3 Only.
- *Seen in:* cat18-20070107.html, cat18-20070302.html

#### 1208 · Get Player Co-Ordinates
- **Category** Methods (cat 18) · **Author** Frost · **Date added** Sep 26th, '05 / September 26th, 2005
- **Site downloads counter** 235 (maximum seen across captures) · **Version** not stated on the listing pages
- **Payload** no Wayback capture of any `*/files/N.*` path for this id
- **Local** — · **Contains DLL** unknown · **Bundled docs** unknown
> Function that returns the co-ordinates of a given player. TK3 Only.
- *Seen in:* cat18-20070107.html, cat18-20070302.html

#### 1221 · The Dummy's Text Shadow Method
- **Category** Methods (cat 18) · **Author** DarkClownNizzo · **Date added** Nov 28th, '05 / November 28th, 2005
- **Site downloads counter** 91 (maximum seen across captures) · **Version** not stated on the listing pages
- **Payload** no Wayback capture of any `*/files/N.*` path for this id
- **Local** — · **Contains DLL** unknown · **Bundled docs** unknown
> DarkClownNizzo's self-titled "Ridiculously Simple Shadow Text Module" that adds a shadow to whatever text you specify. Has a few oversights such as the shadow colour being hardcoded
- *Seen in:* cat18-20070107.html, cat18-20070302.html, cat18-20090330.html, cat18-20100210.html

#### 1230 · Fading Text
- **Category** Methods (cat 18) · **Author** Arch Angel · **Date added** Dec 11th, '05 / December 11th, 2005
- **Site downloads counter** 54 (maximum seen across captures) · **Version** not stated on the listing pages
- **Payload** no Wayback capture of any `*/files/N.*` path for this id
- **Local** — · **Contains DLL** unknown · **Bundled docs** unknown
> Simple fadeIn and fadeOut functions to which you supply the x and y co-ordinates of the text, the text itself, colour and fade speed.
- *Seen in:* cat18-20070107.html, cat18-20070302.html

#### 1236 · Text Alteration Pack
- **Category** Methods (cat 18) · **Author** Lord_Valanx · **Date added** Jan 3rd, '06 / January 3rd, 2006
- **Site downloads counter** 54 (maximum seen across captures) · **Version** not stated on the listing pages
- **Payload** no Wayback capture of any `*/files/N.*` path for this id
- **Local** — · **Contains DLL** unknown · **Bundled docs** unknown
> Set of text related methods such as word wrapping, text fading, and centering. No documentation or comments for newer users to appreciate what's going on, which is a shame.
- *Seen in:* cat18-20070107.html, cat18-20070302.html

#### 1237 · Powerbar & Berrytree
- **Category** Methods (cat 18) · **Author** Lord_Valanx · **Date added** Jan 3rd, '06 / January 3rd, 2006
- **Site downloads counter** 147 (maximum seen across captures) · **Version** not stated on the listing pages
- **Payload** no Wayback capture of any `*/files/N.*` path for this id
- **Local** — · **Contains DLL** unknown · **Bundled docs** unknown
> Another pack of methods from Lord_Valanx, this time providing functionality for a powerbar and something called a berrytree whereby you specify an item that a tree gives a player and the amount of time before it does so again.
- *Seen in:* cat18-20070107.html, cat18-20070302.html

#### 1367 · Fading Text Method
- **Category** Methods (cat 18) · **Author** Arch Angel · **Date added** Sep 14th, '06 / September 14th, 2006 · **Rating** 3/5
- **Site downloads counter** 98 (maximum seen across captures) · **Version** not stated on the listing pages
- **Payload** no Wayback capture of any `*/files/N.*` path for this id
- **Local** — · **Contains DLL** unknown · **Bundled docs** unknown
> Arch Angel's fade method allows for up to four lines, each can differ in colour, size and font, to be faded in and out after a specified number of seconds and at a certain speed. Works very well, although a more appropiate solution using a class would allow for any number of lines to be added as opposed to an arbitary number that leads to lots of redundant parameters if you want less than the maximum.
- *Seen in:* cat18-20070107.html, cat18-20070302.html, cat18-20090330.html, cat18-20100210.html

#### 1509 · Letter by Letter Typing Method
- **Category** Methods (cat 18) · **Author** Chadderz · **Date added** May 19th, 2007 · **Rating** 2/5
- **Site downloads counter** 77 (maximum seen across captures) · **Version** not stated on the listing pages
- **Payload** no Wayback capture of any `*/files/N.*` path for this id
- **Local** — · **Contains DLL** unknown · **Bundled docs** unknown
> A simple method that prints text to the screen one letter at a time.
- *Seen in:* cat18-20090330.html, cat18-20100210.html

#### 1516 · Range()
- **Category** Methods (cat 18) · **Author** narnianwolf · **Date added** June 4th, 2007 · **Rating** 2/5
- **Site downloads counter** 41 (maximum seen across captures) · **Version** not stated on the listing pages
- **Payload** no Wayback capture of any `*/files/N.*` path for this id
- **Local** — · **Contains DLL** unknown · **Bundled docs** unknown
> Useful method that will return a random number between two numbers unlike RPG Code's Random() function which only returns values starting at 1.
- *Seen in:* cat18-20090330.html, cat18-20100210.html

#### 1534 · fillTriangle
- **Category** Methods (cat 18) · **Author** SuperIsoRPG · **Date added** July 19th, 2007 · **Rating** 2/5
- **Site downloads counter** 17 (maximum seen across captures) · **Version** not stated on the listing pages
- **Payload** no Wayback capture of any `*/files/N.*` path for this id
- **Local** — · **Contains DLL** unknown · **Bundled docs** unknown
> A RPG Code program that allow you to draw a filled triangle. May be useful for drawing complex polygons. Alternatively, the MenuHelp Plugin includes the ability to draw fi...
- *Seen in:* cat18-20090330.html, cat18-20100210.html

#### 1650 · Marz's Method Pack
- **Category** Methods (cat 18) · **Author** Marz · **Date added** December 3rd, 2008 · **Rating** 5/5
- **Site downloads counter** 33 (maximum seen across captures) · **Version** not stated on the listing pages
- **Payload** no Wayback capture of any `*/files/N.*` path for this id
- **Local** — · **Contains DLL** unknown · **Bundled docs** unknown
> Marz's Method Pack provides several useful functions including word wrapping, an aim bar, and a way to select a tile using an image cursor.
- *Seen in:* cat18-20090330.html, cat18-20100210.html

#### 1676 · Necromancer's Method Pack
- **Category** Methods (cat 18) · **Author** necromancer13 · **Date added** March 24th, 2009 · **Rating** 2/5
- **Site downloads counter** 13 (maximum seen across captures) · **Version** not stated on the listing pages
- **Payload** no Wayback capture of any `*/files/N.*` path for this id
- **Local** — · **Contains DLL** unknown · **Bundled docs** unknown
> Necromancer's Method Pack includes the ability to display a random message out of three, a method that displays an image and allows the player to select an option, fading text...
- *Seen in:* browse-20090417.html, cat18-20090330.html, cat18-20100210.html

#### 1703 · Aurum34 Methodpack
- **Category** Methods (cat 18) · **Author** aurum34 · **Date added** August 11th, 2009 · **Rating** 2/5
- **Site downloads counter** 10 (maximum seen across captures) · **Version** not stated on the listing pages
- **Payload** no Wayback capture of any `*/files/N.*` path for this id
- **Local** — · **Contains DLL** unknown · **Bundled docs** unknown
> Aurum's method pack features several functions including a replacement cursor map function, a function to replace a color in an image, and drawing gradients.
- *Seen in:* cat18-20100210.html

## Other RPG Code (cat 20) — 51 files recovered

#### 53 · Mega Heal Pack
- **Category** Other (code) (cat 20) · **Author** Neol · **Date added** December 20th, 2003
- **Site downloads counter** 535 (maximum seen across captures) · **Version** not stated on the listing pages
- **Payload** no Wayback capture of any `*/files/N.*` path for this id
- **Local** — · **Contains DLL** unknown · **Bundled docs** unknown
> If you're lazy or is begining with RPG Code, these healing programs can give you a head start. A HP regenerating move is also included.
- *Seen in:* cat20-20070523-p5.html

#### 88 · VorteX 4
- **Category** Other (code) (cat 20) · **Author** Cyranoid · **Date added** December 22nd, 2003 · **Rating** 5/5
- **Site downloads counter** 2826 (maximum seen across captures) · **Version** not stated on the listing pages
- **Payload** `fileman/files/88.zip` via `http://www.toolkitzone.com:80/fileman/files/88.zip?PHPSESSID=6150804f62b607601a72de12fc959311` (snapshot `20060324061243`, 453828 B recorded in CDX)
- **Local** — (capture did not replay / not downloaded)
> Version four is here and Vortex is looking better than ever. Use of icons for RPG Code commands is one of the many interface changes, creating a much more smoother environment...
- *Seen in:* cat20-20070523-p5.html

#### 184 · Custom Prompt
- **Category** Other (code) (cat 20) · **Author** Sander · **Date added** January 3rd, 2004 · **Rating** 2/5
- **Site downloads counter** 162 (maximum seen across captures) · **Version** not stated on the listing pages
- **Payload** no Wayback capture of any `*/files/N.*` path for this id
- **Local** — · **Contains DLL** unknown · **Bundled docs** unknown
> Not the most flexible of prompts made, nor very novice friendly. But it is a nice example of the possibilities of RPG Code, and those who want a ready to go feature would pref...
- *Seen in:* cat20-20070523-p5.html

#### 300 · Sendback System
- **Category** Other (code) (cat 20) · **Author** Colin · **Date added** February 20th, 2004 · **Rating** 5/5
- **Site downloads counter** 1724 (maximum seen across captures) · **Version** not stated on the listing pages
- **Payload** no Wayback capture of any `*/files/N.*` path for this id
- **Local** — · **Contains DLL** unknown · **Bundled docs** unknown
> Allows you to make save points so when you get a game over, have a spell or some other trigger you can use it to send you back to the last point specified as the send back poi...
- *Seen in:* cat20-20070523-p5.html

#### 358 · Phoenix
- **Category** Other (code) (cat 20) · **Author** computerdude800 · **Date added** March 1st, 2004 · **Rating** 5/5
- **Site downloads counter** 1654 (maximum seen across captures) · **Version** not stated on the listing pages
- **Payload** no Wayback capture of any `*/files/N.*` path for this id
- **Local** — · **Contains DLL** unknown · **Bundled docs** unknown
> Fierce battles, or collaberation, seems to work wonders. This time the release of Phoenix is great! Plugin system, recoding of the editor itself, much smaller size, and proje...
- *Seen in:* cat20-20070523-p5.html

#### 368 · Redrose
- **Category** Other (code) (cat 20) · **Author** Colosseus · **Date added** March 4th, 2004 · **Rating** 4/5
- **Site downloads counter** 844 (maximum seen across captures) · **Version** not stated on the listing pages
- **Payload** no Wayback capture of any `*/files/N.*` path for this id
- **Local** — · **Contains DLL** unknown · **Bundled docs** unknown
> Well I'll be a Uncle's Monkey! Redrose finally has, after 4 updates, a basic menu! Yes, now you do not have to follow the little pictoglyphs any longer! Now one of the mos...
- *Seen in:* cat20-20070523-p4.html

#### 415 · EuixCode
- **Category** Other (code) (cat 20) · **Author** Euix · **Date added** March 18th, 2004 · **Rating** 5/5
- **Site downloads counter** 1504 (maximum seen across captures) · **Version** not stated on the listing pages
- **Payload** no Wayback capture of any `*/files/N.*` path for this id
- **Local** — · **Contains DLL** unknown · **Bundled docs** unknown
> EuixCode, what can I say about it? Has a lot of the features an RPGCode editor should have. Color coding, MDI, non-floating interface that wasn't in its first release. Very we...
- *Seen in:* cat20-20070523-p4.html

#### 416 · Lazy Methods
- **Category** Other (code) (cat 20) · **Author** Marc · **Date added** March 18th, 2004 · **Rating** 3/5
- **Site downloads counter** 348 (maximum seen across captures) · **Version** not stated on the listing pages
- **Payload** no Wayback capture of any `*/files/N.*` path for this id
- **Local** — · **Contains DLL** unknown · **Bundled docs** unknown
> If you wanna call these methods, I guess thats what they are to Word2 anyway. Basically 3 programs - an inn, a shop and a random font color selector. Not hard to make a method...
- *Seen in:* cat20-20070523-p4.html

#### 421 · Image Editor
- **Category** Other (code) (cat 20) · **Author** Jer1400 · **Date added** March 19th, 2004 · **Rating** 4/5
- **Site downloads counter** 394 (maximum seen across captures) · **Version** not stated on the listing pages
- **Payload** no Wayback capture of any `*/files/N.*` path for this id
- **Local** — · **Contains DLL** unknown · **Bundled docs** unknown
> Although a very cute program and worthy recognition, for most people this program would not run correctly. It uses Leuf's Read/Write plugin which doesn't seem to like WinXP. T...
- *Seen in:* cat20-20070523-p4.html

#### 427 · Title / Entrance
- **Category** Other (code) (cat 20) · **Author** Marc · **Date added** March 20th, 2004 · **Rating** 2/5
- **Site downloads counter** 172 (maximum seen across captures) · **Version** not stated on the listing pages
- **Payload** no Wayback capture of any `*/files/N.*` path for this id
- **Local** — · **Contains DLL** unknown · **Bundled docs** unknown
> A fading text program, although would be much better suited to method format.
- *Seen in:* cat20-20070523-p4.html

#### 439 · Stats
- **Category** Other (code) (cat 20) · **Author** Marc · **Date added** March 21st, 2004 · **Rating** 4/5
- **Site downloads counter** 980 (maximum seen across captures) · **Version** not stated on the listing pages
- **Payload** no Wayback capture of any `*/files/N.*` path for this id
- **Local** — · **Contains DLL** unknown · **Bundled docs** unknown
> This is an extension to the Supersayen program. Makes it that much better with status bars and all that good stuff. Wanna learn more? read the readme. he has a very good descr...
- *Seen in:* cat20-20070523-p4.html

#### 446 · Notes
- **Category** Other (code) (cat 20) · **Author** Marc · **Date added** March 23rd, 2004 · **Rating** 3/5
- **Site downloads counter** 240 (maximum seen across captures) · **Version** not stated on the listing pages
- **Payload** no Wayback capture of any `*/files/N.*` path for this id
- **Local** — · **Contains DLL** unknown · **Bundled docs** unknown
> This program is a piece of notebook paper with which you can do just about anything. Would look really neat in some games with a little bit of sprucing up. Maybe a tear here a...
- *Seen in:* cat20-20070523-p4.html

#### 450 · Armor Maker
- **Category** Other (code) (cat 20) · **Author** Mick · **Date added** March 25th, 2004 · **Rating** 3/5
- **Site downloads counter** 1022 (maximum seen across captures) · **Version** not stated on the listing pages
- **Payload** no Wayback capture of any `*/files/N.*` path for this id
- **Local** — · **Contains DLL** unknown · **Bundled docs** unknown
> A little adventurous and want to create a bunch of items that can be merged together into another item? This program does the trick, somewhat. Without the other stuff like the...
- *Seen in:* cat20-20070523-p4.html

#### 481 · Game Over Pack
- **Category** Other (code) (cat 20) · **Author** DEXTER · **Date added** April 5th, 2004 · **Rating** 2/5
- **Site downloads counter** 394 (maximum seen across captures) · **Version** not stated on the listing pages
- **Payload** no Wayback capture of any `*/files/N.*` path for this id
- **Local** — · **Contains DLL** unknown · **Bundled docs** unknown
> An example to show how to write a game over program. Despite what the ReadMe says, both programs are the same thing. The midi included, but not used, is also really nice for a...
- *Seen in:* cat20-20070523-p4.html

#### 499 · EuixCode?
- **Category** Other (code) (cat 20) · **Author** Euix · **Date added** April 12th, 2004 · **Rating** 5/5
- **Site downloads counter** 2027 (maximum seen across captures) · **Version** not stated on the listing pages
- **Payload** no Wayback capture of any `*/files/N.*` path for this id
- **Local** — · **Contains DLL** unknown · **Bundled docs** unknown
> Second version of EuixCode - and it's setting the trend for smooth and reliable editors, with an array of features such as plugins, project files and command references. Colou...
- *Seen in:* cat20-20070523-p4.html

#### 517 · VorteX 4 [Plugin SDK]
- **Category** Other (code) (cat 20) · **Author** Cyranoid · **Date added** April 17th, 2004 · **Rating** 4/5
- **Site downloads counter** 246 (maximum seen across captures) · **Version** not stated on the listing pages
- **Payload** no Wayback capture of any `*/files/N.*` path for this id
- **Local** — · **Contains DLL** unknown · **Bundled docs** unknown
> The SDK (software development kit) for plugins in Vortex. With this you can add various features of your own to Vortex such as wizards. For advanced programmers.
- *Seen in:* cat20-20070523-p3.html

#### 523 · Cheat Prompt
- **Category** Other (code) (cat 20) · **Author** mega deth · **Date added** April 19th, 2004 · **Rating** 2/5
- **Site downloads counter** 271 (maximum seen across captures) · **Version** not stated on the listing pages
- **Payload** no Wayback capture of any `*/files/N.*` path for this id
- **Local** — · **Contains DLL** unknown · **Bundled docs** unknown
> Looky what the cat brought in, a cheat system! Yeah this thing will make your players biggest fantasies come true - giving gp, health and that kinda stuff. Who could ask for m...
- *Seen in:* cat20-20070523-p3.html

#### 571 · Pay it or Play it
- **Category** Other (code) (cat 20) · **Author** William · **Date added** May 2nd, 2004 · **Rating** 3/5
- **Site downloads counter** 224 (maximum seen across captures) · **Version** not stated on the listing pages
- **Payload** no Wayback capture of any `*/files/N.*` path for this id
- **Local** — · **Contains DLL** unknown · **Bundled docs** unknown
> A nice slot machine program made by Will here. Yall need to check it out.
- *Seen in:* cat20-20070523-p3.html

#### 580 · Multi-Cheat Program
- **Category** Other (code) (cat 20) · **Author** Dol Fina · **Date added** May 4th, 2004 · **Rating** 3/5
- **Site downloads counter** 333 (maximum seen across captures) · **Version** not stated on the listing pages
- **Payload** no Wayback capture of any `*/files/N.*` path for this id
- **Local** — · **Contains DLL** unknown · **Bundled docs** unknown
> A great program for one of our newest members. A multi cheat code program, But it could be used for so much more, maybe a safe or maybe even a switch lock. The possiblilities...
- *Seen in:* cat20-20070523-p3.html

#### 587 · Random Message Picker
- **Category** Other (code) (cat 20) · **Author** zzz · **Date added** May 9th, 2004 · **Rating** 2/5
- **Site downloads counter** 148 (maximum seen across captures) · **Version** not stated on the listing pages
- **Payload** no Wayback capture of any `*/files/N.*` path for this id
- **Local** — · **Contains DLL** unknown · **Bundled docs** unknown
> Testing his wits with the random function. Zzz comes up with some random statement code.
- *Seen in:* cat20-20070523-p3.html

#### 588 · Spin Mini Game
- **Category** Other (code) (cat 20) · **Author** zzz · **Date added** May 10th, 2004 · **Rating** 2/5
- **Site downloads counter** 85 (maximum seen across captures) · **Version** not stated on the listing pages
- **Payload** no Wayback capture of any `*/files/N.*` path for this id
- **Local** — · **Contains DLL** unknown · **Bundled docs** unknown
> Lets just say it's not his best work. It could use some animation effects, basically an instantanious roulette table.
- *Seen in:* cat20-20070523-p3.html

#### 593 · RaceGen
- **Category** Other (code) (cat 20) · **Author** Mark_of_the_Dragon · **Date added** May 12th, 2004 · **Rating** 3/5
- **Site downloads counter** 529 (maximum seen across captures) · **Version** not stated on the listing pages
- **Payload** no Wayback capture of any `*/files/N.*` path for this id
- **Local** — · **Contains DLL** unknown · **Bundled docs** unknown
> Need that special character and really have not a clue on how to picture it? Well here is a great program that generates a random description of a character or race of charact...
- *Seen in:* cat20-20070523-p3.html

#### 617 · Mock MS Paint
- **Category** Other (code) (cat 20) · **Author** zzz · **Date added** May 21st, 2004 · **Rating** 3/5
- **Site downloads counter** 158 (maximum seen across captures) · **Version** not stated on the listing pages
- **Payload** no Wayback capture of any `*/files/N.*` path for this id
- **Local** — · **Contains DLL** unknown · **Bundled docs** unknown
> Really nice except.... Do you like a program to tell you what to do? I think not. Would be really nice if he could make it like MSPaint and beable to click a tool and paint fo...
- *Seen in:* cat20-20070523-p3.html

#### 638 · Pic2RPG
- **Category** Other (code) (cat 20) · **Author** computerdude800 · **Date added** June 1st, 2004 · **Rating** 2/5
- **Site downloads counter** 173 (maximum seen across captures) · **Version** not stated on the listing pages
- **Payload** no Wayback capture of any `*/files/N.*` path for this id
- **Local** — · **Contains DLL** unknown · **Bundled docs** unknown
> If you really are hankering to do everything in rpgCode with no picture file support then here is your answer. Although not quite what I would consider coder friendly it does ...
- *Seen in:* cat20-20070523-p3.html

#### 660 · Door Lock
- **Category** Other (code) (cat 20) · **Author** cloud1804 · **Date added** June 14th, 2004 · **Rating** 2/5
- **Site downloads counter** 520 (maximum seen across captures) · **Version** not stated on the listing pages
- **Payload** no Wayback capture of any `*/files/N.*` path for this id
- **Local** — · **Contains DLL** unknown · **Bundled docs** unknown
> Very simple way of setting up a locked door/key system. I remeber using code very similar to this in my old "The Quest of Friends" game. Comes with a key item also for you to ...
- *Seen in:* cat20-20070523-p3.html

#### 683 · Mini Game Pack
- **Category** Other (code) (cat 20) · **Author** Talyn · **Date added** June 20th, 2004 · **Rating** 3/5
- **Site downloads counter** 539 (maximum seen across captures) · **Version** not stated on the listing pages
- **Payload** no Wayback capture of any `*/files/N.*` path for this id
- **Local** — · **Contains DLL** unknown · **Bundled docs** unknown
> A decent mini game pack, with the usual lottery style game but you also have some new ones like a beer drinking contest. Not really all that bad, so check 'em out.
- *Seen in:* cat20-20070523-p2.html

#### 730 · One Pixel Movement
- **Category** Other (code) (cat 20) · **Author** zzz · **Date added** July 24th, 2004 · **Rating** 2/5
- **Site downloads counter** 226 (maximum seen across captures) · **Version** not stated on the listing pages
- **Payload** no Wayback capture of any `*/files/N.*` path for this id
- **Local** — · **Contains DLL** unknown · **Bundled docs** unknown
> Simple program using key presses to move a bar around the screen by one pixel. Not exactly advanced code, and the use of branch instead of loop doesn't help the rating - but a...
- *Seen in:* cat20-20070523-p2.html

#### 731 · RaceGen
- **Category** Other (code) (cat 20) · **Author** Mark_of_the_Dragon · **Date added** July 25th, 2004 · **Rating** 2/5
- **Site downloads counter** 201 (maximum seen across captures) · **Version** not stated on the listing pages
- **Payload** no Wayback capture of any `*/files/N.*` path for this id
- **Local** — · **Contains DLL** unknown · **Bundled docs** unknown
> Rather simplistic tool by Mark of the Dragon to generate race descriptions, allowing you to set the environment in which they live. Could be expanded to include more options a...
- *Seen in:* cat20-20070523-p2.html

#### 755 · Generic Steal Program
- **Category** Other (code) (cat 20) · **Author** serpentine lord · **Date added** August 20th, 2004 · **Rating** 3/5
- **Site downloads counter** 584 (maximum seen across captures) · **Version** not stated on the listing pages
- **Payload** no Wayback capture of any `*/files/N.*` path for this id
- **Local** — · **Contains DLL** unknown · **Bundled docs** unknown
> A rather original way of allowing you to steal from enemies with the default Battle System. You will steal the item in battle without knowing what it is that you've stolen, t...
- *Seen in:* cat20-20070523-p2.html

#### 759 · Adv Notepad
- **Category** Other (code) (cat 20) · **Author** Linkin · **Date added** August 21st, 2004 · **Rating** 2/5
- **Site downloads counter** 107 (maximum seen across captures) · **Version** not stated on the listing pages
- **Payload** no Wayback capture of any `*/files/N.*` path for this id
- **Local** — · **Contains DLL** unknown · **Bundled docs** unknown
> A rather simple notepad type program. It allows you to open multiple files at once, but that's really the only advantage it has over notepad. It comes with the source code t...
- *Seen in:* cat20-20070523-p2.html

#### 791 · Slow Typing Program
- **Category** Other (code) (cat 20) · **Author** zzz · **Date added** September 3rd, 2004 · **Rating** 2/5
- **Site downloads counter** 116 (maximum seen across captures) · **Version** not stated on the listing pages
- **Payload** no Wayback capture of any `*/files/N.*` path for this id
- **Local** — · **Contains DLL** unknown · **Bundled docs** unknown
> Hey its John back into the rating and ranting mode. What better program to start it on than this slow typing program. This is a simple program that reads an array of character...
- *Seen in:* cat20-20070523-p2.html

#### 801 · Item Fusion Shop
- **Category** Other (code) (cat 20) · **Author** machsprinter · **Date added** September 7th, 2004 · **Rating** 4/5
- **Site downloads counter** 1594 (maximum seen across captures) · **Version** not stated on the listing pages
- **Payload** no Wayback capture of any `*/files/N.*` path for this id
- **Local** — · **Contains DLL** unknown · **Bundled docs** unknown
> This is a program for an Item Fusion Shop, similar to the Synthesis Shops in Final Fantasy IX. It allows you to combine two items to create one more useful item. It works wel...
- *Seen in:* cat20-20070523-p2.html, cat20-20090330.html

#### 825 · Etch-A-Sketch
- **Category** Other (code) (cat 20) · **Author** thing · **Date added** September 17th, 2004 · **Rating** 3/5
- **Site downloads counter** 347 (maximum seen across captures) · **Version** not stated on the listing pages
- **Payload** no Wayback capture of any `*/files/N.*` path for this id
- **Local** — · **Contains DLL** unknown · **Bundled docs** unknown
> All the fun of etch-a-sketch in an rpgcode program. The uses are rather limited, but it's nice and fun.
- *Seen in:* cat20-20070523-p2.html, cat20-20090330.html

#### 844 · My Programs
- **Category** Other (code) (cat 20) · **Author** Koeran · **Date added** September 26th, 2004 · **Rating** 4/5
- **Site downloads counter** 585 (maximum seen across captures) · **Version** not stated on the listing pages
- **Payload** no Wayback capture of any `*/files/N.*` path for this id
- **Local** — · **Contains DLL** unknown · **Bundled docs** unknown
> A small collection of programs, with the required images. It includes a bank with an ATM, a roulette table and a shares program. Only the ATM program is documented, but the...
- *Seen in:* cat20-20070523-p2.html, cat20-20090330.html

#### 877 · Code Impression
- **Category** Other (code) (cat 20) · **Author** Colosseus · **Date added** October 23rd, 2004 · **Rating** 4/5
- **Site downloads counter** 438 (maximum seen across captures) · **Version** not stated on the listing pages
- **Payload** no Wayback capture of any `*/files/N.*` path for this id
- **Local** — · **Contains DLL** unknown · **Bundled docs** unknown
> This editor has many useful features such as a command list, tabbed multi-document interface, colour coding and a few wizards. A nicely designed and presented editor. This ...
- *Seen in:* cat20-20070523-p2.html, cat20-20090330.html, cat20-20100210.html

#### 1079 · Name Generator
- **Category** Other (code) (cat 20) · **Author** Allan@Aljo · **Date added** Apr 26th, '05 / April 26th, 2005 · **Rating** 4/5
- **Site downloads counter** 1031 (maximum seen across captures) · **Version** not stated on the listing pages
- **Payload** no Wayback capture of any `*/files/N.*` path for this id
- **Local** — · **Contains DLL** unknown · **Bundled docs** unknown
> A great name generator program.
- *Seen in:* cat20-20070107.html, cat20-20090330.html, cat20-20100210.html

#### 1146 · Organized RPG
- **Category** Other (code) (cat 20) · **Author** Ryan · **Date added** Jun 11th, '05 / June 11th, 2005 · **Rating** 3/5
- **Site downloads counter** 309 (maximum seen across captures) · **Version** not stated on the listing pages
- **Payload** no Wayback capture of any `*/files/N.*` path for this id
- **Local** — · **Contains DLL** unknown · **Bundled docs** unknown
> Ever feel unorganized with your projects? Sure you have. Organized RPG let's you keep an organized 'work area' for your projects, in every aspect. Development is sure to spike once you get organized!
- *Seen in:* cat20-20070107.html, cat20-20090330.html, cat20-20100210.html

#### 1199 · Cheat Program
- **Category** Other (code) (cat 20) · **Author** Arch Angel · **Date added** Sep 2nd, '05 / September 2nd, 2005 · **Rating** 3/5
- **Site downloads counter** 758 (maximum seen across captures) · **Version** not stated on the listing pages
- **Payload** no Wayback capture of any `*/files/N.*` path for this id
- **Local** — · **Contains DLL** unknown · **Bundled docs** unknown
> This program enables the user to add a cheat system to their project. The program includes cheats like: 'Heal', 'HealAll', 'Restore', and 'RestoreAll'. The logic is rather simple, so adding onto this program is a simple task.
- *Seen in:* cat20-20070107.html, cat20-20070220.html, cat20-20090330.html, cat20-20100210.html

#### 1214 · Calculator
- **Category** Other (code) (cat 20) · **Author** Maria · **Date added** Oct 22nd, '05 / October 22nd, 2005
- **Site downloads counter** 64 (maximum seen across captures) · **Version** not stated on the listing pages
- **Payload** no Wayback capture of any `*/files/N.*` path for this id
- **Local** — · **Contains DLL** unknown · **Bundled docs** unknown
> Basic code behind an RPG Code calculator, lacks any comments for novices but is pretty simple stuff.
- *Seen in:* cat20-20070107.html, cat20-20070220.html

#### 1222 · Collision Movement System
- **Category** Other (code) (cat 20) · **Author** Caliber Mengsk · **Date added** Nov 29th, '05 / November 29th, 2005
- **Site downloads counter** 147 (maximum seen across captures) · **Version** not stated on the listing pages
- **Payload** no Wayback capture of any `*/files/N.*` path for this id
- **Local** — · **Contains DLL** unknown · **Bundled docs** unknown
> Early system, developed by Caliber Mengsk, for a collision movement system that allows for "gravity" and jumping. By his own admission it has some speed and memory issues, but further development is planned.
- *Seen in:* cat20-20070107.html, cat20-20070220.html

#### 1249 · The Game Database 2.5
- **Category** Other (code) (cat 20) · **Author** SuperIsoRPG · **Date added** Feb 15th, '06 / February 15th, 2006 · **Rating** 2/5
- **Site downloads counter** 231 (maximum seen across captures) · **Version** not stated on the listing pages
- **Payload** no Wayback capture of any `*/files/N.*` path for this id
- **Local** — · **Contains DLL** unknown · **Bundled docs** unknown
> A simple program to create and store character and level information, allowing for general summaries of their importance, relations to the game and so forth. Probably a little too rigid and awkward to replace whatever manual system, if any, you currently use to store details about game.
- *Seen in:* cat20-20070107.html, cat20-20070220.html, cat20-20090330.html, cat20-20100210.html

#### 1266 · Mini-game Jumping
- **Category** Other (code) (cat 20) · **Author** DrJ · **Date added** Mar 18th, '06 / March 18th, 2006 · **Rating** 2/5
- **Site downloads counter** 193 (maximum seen across captures) · **Version** not stated on the listing pages
- **Payload** no Wayback capture of any `*/files/N.*` path for this id
- **Local** — · **Contains DLL** unknown · **Bundled docs** unknown
> Set of methods by DrJ for implementing a simple jumping action, marked as being for mini-games since it's not transferable to board based games. Code is fully commented and comes with readme.
- *Seen in:* cat20-20070107.html, cat20-20070220.html

#### 1269 · Time, Movement & Stat
- **Category** Other (code) (cat 20) · **Author** DrJ · **Date added** Mar 18th, '06 / March 18th, 2006 · **Rating** 2/5
- **Site downloads counter** 270 (maximum seen across captures) · **Version** not stated on the listing pages
- **Payload** no Wayback capture of any `*/files/N.*` path for this id
- **Local** — · **Contains DLL** unknown · **Bundled docs** unknown
> Set of methods from DrJ including getPlayerCoords, a realtime clock and an example of creating a dynamic stat bar. Little to no commenting/help for those new to RPG Code to grasp what's going on.
- *Seen in:* cat20-20070107.html, cat20-20070220.html

#### 1316 · EasyMenu
- **Category** Other (code) (cat 20) · **Author** comfox · **Date added** June 13th, 2008 / May 20th, '06 / May 20th, 2006 · **Rating** 5/5
- **Site downloads counter** 1914 (maximum seen across captures) · **Version** not stated on the listing pages
- **Payload** no Wayback capture of any `*/files/N.*` path for this id
- **Local** — · **Contains DLL** unknown · **Bundled docs** unknown
> A menu creation system by comfox that is run from the Toolkit itself and requires no RPG Coding. Using building blocks called "cells" you can build the menu interface, defining the position and size of the cells, their type (image, button, text, variable, variable-defined image), and the value relating to the type (e.g. text literal for text type). The system uses a popup menu on mouse click which presents the various options such as create, edit and delete cells. Editing allows you to click a cell which brings up a further menu allowing you to modify its settings, you can also render your menu to preview its in-game appearence while editing it. When you're finished you can save the menu to file and then include it in your game how you wish. Comes with detailed ReadMe, covering all the features and how to use them. Update: Now comes with copy and move features for cells, including the ability to edit cell positions via the keyboard, plus a few big fixes.
- *Seen in:* cat20-20070107.html, cat20-20070220.html, cat20-20090330.html, cat20-20100210.html

#### 1361 · Floor Tiles
- **Category** Other (code) (cat 20) · **Author** polraudio · **Date added** Aug 10th, '06 / August 10th, 2006 · **Rating** 1/5
- **Site downloads counter** 67 (maximum seen across captures) · **Version** not stated on the listing pages
- **Payload** no Wayback capture of any `*/files/N.*` path for this id
- **Local** — · **Contains DLL** unknown · **Bundled docs** unknown
> Described as floor tiles, although it would have to be something of a psychedelic setting as these colours are loud.
- *Seen in:* cat20-20070107.html, cat20-20070220.html

#### 1428 · Push blocks
- **Category** Other (code) (cat 20) · **Author** k-hos · **Date added** January 25th, 2007 · **Rating** 1/5
- **Site downloads counter** 10 (maximum seen across captures) · **Version** not stated on the listing pages
- **Payload** no Wayback capture of any `*/files/N.*` path for this id
- **Local** — · **Contains DLL** unknown · **Bundled docs** unknown
> A simple example on how you can code pushable blocks. The code is not very reusable, but it can help you if you don't know where to get started in your block puzzle game like...
- *Seen in:* cat20-20070220.html, new-20070219.html

#### 1439 · Travel
- **Category** Other (code) (cat 20) · **Author** William · **Date added** January 30th, 2007 · **Rating** 1/5
- **Site downloads counter** 2 (maximum seen across captures) · **Version** not stated on the listing pages
- **Payload** no Wayback capture of any `*/files/N.*` path for this id
- **Local** — · **Contains DLL** unknown · **Bundled docs** unknown
> This is a very basic example of a travel program. The main problem is that it's not reusable, you have to copy and recode it for every combination of travel dialogs. There...
- *Seen in:* cat20-20070220.html, new-20070219.html

#### 1631 · Array Class
- **Category** Other (code) (cat 20) · **Author** Marz · **Date added** August 24th, 2008 · **Rating** 4/5
- **Site downloads counter** 29 (maximum seen across captures) · **Version** not stated on the listing pages
- **Payload** no Wayback capture of any `*/files/N.*` path for this id
- **Local** — · **Contains DLL** unknown · **Bundled docs** unknown
> This is an Array class, similar to the one from RPG Toolkit's documentation, but with some added features to make it more useful.
- *Seen in:* cat20-20090330.html, cat20-20100210.html

#### 1724 · Notepad++ Autocomplete and Syntax files
- **Category** Other (code) (cat 20) · **Author** xavero · **Date added** October 4th, 2009 · **Rating** 5/5
- **Site downloads counter** 14 (maximum seen across captures) · **Version** not stated on the listing pages
- **Payload** no Wayback capture of any `*/files/N.*` path for this id
- **Local** — · **Contains DLL** unknown · **Bundled docs** unknown
> This is an excellent addition for anyone who uses Notepad++ as their text editor of choice. It adds all of the RPG Code commands, as well as, defines RPG Code's syntax enabli...
- *Seen in:* cat20-20100210.html

#### 1727 · Point & Click "Shooter"
- **Category** Other (code) (cat 20) · **Author** RPGWarriorX · **Date added** October 20th, 2009 · **Rating** 2/5
- **Site downloads counter** 8 (maximum seen across captures) · **Version** not stated on the listing pages
- **Payload** no Wayback capture of any `*/files/N.*` path for this id
- **Local** — · **Contains DLL** unknown · **Bundled docs** unknown
> Running the program will draw two enemies to the screen that you can click on. When you click an enemy three times, it's health is reduced to zero.
- *Seen in:* cat20-20100210.html

#### 1737 · Word/Name Generator
- **Category** Other (code) (cat 20) · **Author** quadfrog · **Date added** January 12th, 2010 · **Rating** 3/5
- **Site downloads counter** 7 (maximum seen across captures) · **Version** not stated on the listing pages
- **Payload** no Wayback capture of any `*/files/N.*` path for this id
- **Local** — · **Contains DLL** unknown · **Bundled docs** unknown
> This program randomly generates a word. It somewhat follows a logical pattern in that most words it creates are pronounceable. You can use this in your game for such things ...
- *Seen in:* browse-20100210.html, cat20-20100210.html

## Other categories seen (browse / what's-new pages) — 20 files

#### 1388 · Anatomy's floor tiles
- **Category** Graphics (cat 2) · **Author** Anatomy · **Date added** — · **Rating** 3/5
- **Site downloads counter** 2 (maximum seen across captures) · **Version** not stated on the listing pages
- **Payload** no Wayback capture of any `*/files/N.*` path for this id
- **Local** — · **Contains DLL** unknown · **Bundled docs** unknown
> A nice set from Anatomy containing 58 very nice floor tiles,not including the name tiles that were put in, for your game. The tiles range from vibrant, uniquely patterned flo...
- *Seen in:* new-20070219.html

#### 1409 · Anatomy's Castle Tiles
- **Category** Graphics (cat 2) · **Author** Anatomy · **Date added** — · **Rating** 3/5
- **Site downloads counter** 3 (maximum seen across captures) · **Version** not stated on the listing pages
- **Payload** no Wayback capture of any `*/files/N.*` path for this id
- **Local** — · **Contains DLL** unknown · **Bundled docs** unknown
> A very nice pack of two sets, containing a combined total of 188 tiles, for creating a castle, both inside and outside. The shading on the tiles is very simple, but it is stil...
- *Seen in:* new-20070219.html

#### 1418 · Rock's Effects 3
- **Category** Audio (cat 1) · **Author** rockoneforyou · **Date added** — · **Rating** 3/5
- **Site downloads counter** — (maximum seen across captures) · **Version** not stated on the listing pages
- **Payload** no Wayback capture of any `*/files/N.*` path for this id
- **Local** — · **Contains DLL** unknown · **Bundled docs** unknown
> Due to a problem stated below, I was not able to listen to a lot of these files. But from what I heard, the sounds were good, and sound effects are a bit tough to come across....
- *Seen in:* new-20070219.html

#### 1419 · Rock's Effects 3.1
- **Category** Audio (cat 1) · **Author** rockoneforyou · **Date added** — · **Rating** 3/5
- **Site downloads counter** 3 (maximum seen across captures) · **Version** not stated on the listing pages
- **Payload** no Wayback capture of any `*/files/N.*` path for this id
- **Local** — · **Contains DLL** unknown · **Bundled docs** unknown
> This is a set of 58 Misc .wav files that include some FX like a car horn, a saw, a toilet flush, and much more. Note: I didn't seem to have the same problem with this set a...
- *Seen in:* new-20070219.html

#### 1420 · Sprite Templates
- **Category** Graphics (cat 2) · **Author** valermos5 · **Date added** — · **Rating** 3/5
- **Site downloads counter** 27 (maximum seen across captures) · **Version** not stated on the listing pages
- **Payload** no Wayback capture of any `*/files/N.*` path for this id
- **Local** — · **Contains DLL** unknown · **Bundled docs** unknown
> A pack of tiles and a bitmap of sprite templates from RPG Maker XP. However the way the tiles were ripped is awkward. The front and back views have 3 tiles, while the side vie...
- *Seen in:* new-20070219.html

#### 1425 · RPG Maker XP
- **Category** Audio (cat 1) · **Author** DelphinusMach1 · **Date added** — · **Rating** 5/5
- **Site downloads counter** 17 (maximum seen across captures) · **Version** not stated on the listing pages
- **Payload** no Wayback capture of any `*/files/N.*` path for this id
- **Local** — · **Contains DLL** unknown · **Bundled docs** unknown
> A collection of great RPGM XP midis. A wide variety of midis included, such as Bosses, Battles, Towns, Dungeons, and more. Another pack I highly suggest, and my rating proves ...
- *Seen in:* new-20070219.html

#### 1426 · RPG Maker XP
- **Category** Audio (cat 1) · **Author** DelphinusMach1 · **Date added** — · **Rating** 4/5
- **Site downloads counter** 11 (maximum seen across captures) · **Version** not stated on the listing pages
- **Payload** no Wayback capture of any `*/files/N.*` path for this id
- **Local** — · **Contains DLL** unknown · **Bundled docs** unknown
> We have the background music RPGMXP set, now for the effects. Although not typical effects (more like really short Background music files), it deserves a download. Its an arra...
- *Seen in:* new-20070219.html

#### 1427 · Tech Mwin Backgrounds
- **Category** Graphics (cat 2) · **Author** Bagel · **Date added** — · **Rating** 4/5
- **Site downloads counter** 6 (maximum seen across captures) · **Version** not stated on the listing pages
- **Payload** no Wayback capture of any `*/files/N.*` path for this id
- **Local** — · **Contains DLL** unknown · **Bundled docs** unknown
> A very nice set of 8 futuristic/tech style message window backgrounds. Most were designed to be used for custom message windows but there are some in there designed to replace...
- *Seen in:* new-20070219.html

#### 1433 · Perfect Dark 64
- **Category** Audio (cat 1) · **Author** rockoneforyou · **Date added** — · **Rating** 3/5
- **Site downloads counter** 2 (maximum seen across captures) · **Version** not stated on the listing pages
- **Payload** no Wayback capture of any `*/files/N.*` path for this id
- **Local** — · **Contains DLL** unknown · **Bundled docs** unknown
> This is a set of Perfect Dark 64 midis from ROFY. They have a cool, but unique sound to them. The pack includes tracks like Air Crash Site, End Credits, Datapak Menu, and more...
- *Seen in:* new-20070219.html

#### 1434 · Xenogears
- **Category** Audio (cat 1) · **Author** rockoneforyou · **Date added** — · **Rating** 4/5
- **Site downloads counter** 8 (maximum seen across captures) · **Version** not stated on the listing pages
- **Payload** no Wayback capture of any `*/files/N.*` path for this id
- **Local** — · **Contains DLL** unknown · **Bundled docs** unknown
> This is another pack from ROFY, but for Xenogears. They sound great, and the pack contains a nice bundle of songs. Songs like Blue Traveler, Chain of Ocean and Fire, Awaken, a...
- *Seen in:* new-20070219.html

#### 1435 · Kingdom Hearts
- **Category** Audio (cat 1) · **Author** rockoneforyou · **Date added** — · **Rating** 4/5
- **Site downloads counter** 25 (maximum seen across captures) · **Version** not stated on the listing pages
- **Payload** no Wayback capture of any `*/files/N.*` path for this id
- **Local** — · **Contains DLL** unknown · **Bundled docs** unknown
> This is a small pack for Kingdom Hearts. They do indeed sound great and it includes tracks like Hallow Bastion, Halloween Town, Go For It, and more. Download this pack from RO...
- *Seen in:* new-20070219.html

#### 1441 · Darstalkers Sound Effects
- **Category** Audio (cat 1) · **Author** TK Game Boy · **Date added** — · **Rating** 5/5
- **Site downloads counter** 10 (maximum seen across captures) · **Version** not stated on the listing pages
- **Payload** no Wayback capture of any `*/files/N.*` path for this id
- **Local** — · **Contains DLL** unknown · **Bundled docs** unknown
> This set of effects from TKGB is awesome. Includes a bunch of sound effects from a cow to aliens! Good luck finding a better pack, download yours now. Contains: 80 wavs Go...
- *Seen in:* new-20070219.html

#### 1443 · Deku Tree Tiles
- **Category** Graphics (cat 2) · **Author** valermos5 · **Date added** — · **Rating** 4/5
- **Site downloads counter** 3 (maximum seen across captures) · **Version** not stated on the listing pages
- **Payload** no Wayback capture of any `*/files/N.*` path for this id
- **Local** — · **Contains DLL** unknown · **Bundled docs** unknown
> Some very nice Deku Tree tiles for your Legend of Zelda game that were made by a guy named DJVenom. The tileset is extensive, however, it is disorganized. Remember, if you use...
- *Seen in:* new-20070219.html

#### 1445 · Pok�mon Ultimate Collection
- **Category** unclassified · **Author** sasuke · **Date added** February 11th, 2007 · **Rating** 4/5
- **Site downloads counter** 1 (maximum seen across captures) · **Version** not stated on the listing pages
- **Payload** no Wayback capture of any `*/files/N.*` path for this id
- **Local** — · **Contains DLL** unknown · **Bundled docs** unknown
> An absolutely massive collection of Pok�mon from the games "Pok�mon Leaf Green","Pok�mon Fire Red","Pok�mon Ruby", and "Pokemon Sapphire". The pack contains both enemy and you...
- *Seen in:* browse-20070220.html, new-20070219.html

#### 1446 · ChaoTileset
- **Category** Graphics (cat 2) · **Author** Vox · **Date added** — · **Rating** 4/5
- **Site downloads counter** 5 (maximum seen across captures) · **Version** not stated on the listing pages
- **Payload** no Wayback capture of any `*/files/N.*` path for this id
- **Local** — · **Contains DLL** unknown · **Bundled docs** unknown
> This set contains emotions/walking frames for 15 different chaos as seen in some of the Sonic Games. Some of these are ripped and some might be original, I couldn't track all ...
- *Seen in:* new-20070219.html

#### 1447 · Sol and Luna Temples
- **Category** unclassified · **Author** k-hos · **Date added** February 15th, 2007 · **Rating** 4/5
- **Site downloads counter** 5 (maximum seen across captures) · **Version** not stated on the listing pages
- **Payload** no Wayback capture of any `*/files/N.*` path for this id
- **Local** — · **Contains DLL** unknown · **Bundled docs** unknown
> A beautiful pair of two original tilesets from k-hos. The tilesets are for making a "Sol Temple"(Sun Temple) and a "Luna Temple" (Moon Temple). They are both pretty expansive ...
- *Seen in:* browse-20070220.html, new-20070219.html

#### 1451 · Graveyard Tiles
- **Category** unclassified · **Author** D.Bolt · **Date added** February 19th, 2007 · **Rating** 2/5
- **Site downloads counter** 1 (maximum seen across captures) · **Version** not stated on the listing pages
- **Payload** no Wayback capture of any `*/files/N.*` path for this id
- **Local** — · **Contains DLL** unknown · **Bundled docs** unknown
> A set of original tiles made by D.Bolt to create your own graveyard. It comes with tiles to make trees, gravestones, torches, and fences.
- *Seen in:* browse-20070220.html, new-20070219.html

#### 1669 · Fire Emblem Set
- **Category** unclassified · **Author** necromancer13 · **Date added** April 6th, 2009
- **Site downloads counter** — (maximum seen across captures) · **Version** not stated on the listing pages
- **Payload** no Wayback capture of any `*/files/N.*` path for this id
- **Local** — · **Contains DLL** unknown · **Bundled docs** unknown
> A huge set of animations from Fire Emblem franchise that includes most of the enemies and playable characters.
- *Seen in:* browse-20090417.html

#### 1672 · Antquest Bug Monsters
- **Category** unclassified · **Author** Hephaestus16 · **Date added** April 13th, 2009
- **Site downloads counter** — (maximum seen across captures) · **Version** not stated on the listing pages
- **Payload** no Wayback capture of any `*/files/N.*` path for this id
- **Local** — · **Contains DLL** unknown · **Bundled docs** unknown
> Included are tilesets for bug monsters used in Hepheastus' game Antquest.
- *Seen in:* browse-20090417.html

#### 1745 · RMVX Custom Sprites
- **Category** unclassified · **Author** victimofgrace · **Date added** February 3rd, 2010 · **Rating** 3/5
- **Site downloads counter** 2 (maximum seen across captures) · **Version** not stated on the listing pages
- **Payload** no Wayback capture of any `*/files/N.*` path for this id
- **Local** — · **Contains DLL** unknown · **Bundled docs** unknown
> A tileset of 28 different characters with all walking stances included.
- *Seen in:* browse-20100210.html, new-20100210.html

## Recovered binaries

| Local file | Bytes | Kind | DLLs inside | Documentation inside |
|---|---|---|---|---|
| `downloads/fileman-1058.exe` | 5355949 | zip | actkrt3.dll, audiere.dll, ctl3d32.dll, exeHost.dll, freeImage.dll, game/Basic/Plugin/tk3fight.dll, game/Basic/Plugin/tk3menu.dll, game/demo/Plugin/tk3fight.dll, game/demo/Plugin/tk3menu.dll, msimg32.dll, tkzip.dll, vb5stkit.dll | eula.txt, game/Basic/Media/VIP - RPGToolkit Fo Sho Music Pak  EULA.txt, game/Basic/Tiles/base EULA.txt, game/demo/Media/VIP - RPGToolkit Fo Sho Music Pak  EULA.txt, game/demo/Tiles/base EULA.txt, help/index.htm, help/page1.htm, help/page-1.htm, help/page10.htm, help/page11.htm, help/page12.htm, help/page13.htm, help/page14.htm, help/page15.htm, help/page16.htm, help/page17.htm, help/page18.1.htm, help/page18.2.htm, help/page18.3.htm, help/page18.4.htm, help/page18.5.htm, help/page18.htm, help/page19.htm, help/page2.htm, help/page-2.htm, help/page21.htm, help/page21_1.htm, help/page21_2.htm, help/page21_3.htm, help/page21_4.htm, help/page21_5.htm, help/page21_6.htm, help/page22.htm, help/page23.htm, help/page25.htm, help/page26.htm, help/page28.htm, help/page29.htm, help/page3.htm, help/page30.htm, help/page4.htm, help/page5.htm, help/page6.htm, help/page7.htm, help/page8.htm, help/page9.htm, help/pageed_background.htm, help/pageed_environment.htm, history.txt, readme.txt, toolkit.cfg, uninstall.exe |
| `downloads/fileman-110.zip` | 157288 | zip | — | Readme.txt |
| `downloads/fileman-135.zip` | 960 | zip | — | Readme.txt |
| `downloads/fileman-141.zip` | 111836 | zip | — | Readme.txt |
| `downloads/fileman-165.zip` | 4780 | zip | — | Readme.txt, Shop.doc |
| `downloads/fileman-237.zip` | 75137 | zip | — | Readme.txt |
| `downloads/fileman-308.zip` | 5283 | zip | — | Step-by-Step Tuts.doc, TKZone Readme.txt |
| `downloads/fileman-325.zip` | 4473 | zip | — | Creating methods.doc, TKZone Readme.txt |
| `downloads/fileman-347.zip` | 14974 | zip | — | — |
| `downloads/fileman-380.zip` | 5661 | zip | — | Read me.txt, TKZone Readme.txt |
| `downloads/fileman-396.zip` | 243058 | zip | — | — |
| `downloads/fileman-403.zip` | 1911 | zip | — | README.txt |
| `downloads/fileman-404.zip` | 23710 | zip | — | Readme.txt |
| `downloads/fileman-463.zip` | 2668063 | zip | — | about.txt |
| `downloads/fileman-496.zip` | 2830857 | zip | — | — |
| `downloads/fileman-497.zip` | 2854915 | zip | — | — |
| `downloads/fileman-506.zip` | 2320792 | zip | — | — |
| `downloads/fileman-595.zip` | 78598 | zip | — | — |
| `downloads/fileman-658.zip` | 82163 | zip | — | Read.txt |
| `downloads/fileman-816.zip` | 5303882 | zip | CTL3D32.DLL, npmod32.dll, tkzip.dll, vb5stkit.dll | eula.txt, WS_FTP.LOG |
| `downloads/fileman-861.zip` | 49728 | zip | — | readme - GUIDGEN.txt, readme - SDK.txt |
| `downloads/fileman-957.zip` | 2803187 | zip | — | — |
| `downloads/fileman-99.zip` | 1650 | zip | — | tutorial.html, Readme.txt |
| `downloads/stuff-101_CLinkedList.zip` | 1922 | zip | — | — |
| `downloads/stuff-1188_Mountain_20TST.zip` | 19962 | zip | — | — |
| `downloads/stuff-226_WhatIsThis.txt` | 276 | txt | — | — |
| `downloads/stuff-226_keyDown.dll` | 11264 | dll | — | — |
| `downloads/stuff-344_MegaProgramOfDoom.exe` | 40960 | exe | — | — |
| `downloads/stuff-5250_100.mid` | 9606 | mid | — | — |
| `downloads/stuff-5250_120.mid` | 21868 | mid | — | — |
| `downloads/stuff-5250_135.mid` | 18525 | mid | — | — |
| `downloads/stuff-5250_140.mid` | 13730 | mid | — | — |
| `downloads/stuff-5250_155.mid` | 4736 | mid | — | — |
| `downloads/stuff-5250_156.mid` | 16444 | mid | — | — |
| `downloads/stuff-5250_157.mid` | 7614 | mid | — | — |
| `downloads/stuff-5250_158.mid` | 25066 | mid | — | — |
| `downloads/stuff-5250_160.mid` | 13207 | mid | — | — |
| `downloads/stuff-5250_161.mid` | 11837 | mid | — | — |
| `downloads/stuff-5250_162.mid` | 6518 | mid | — | — |
| `downloads/vault-1092.zip` | 207187 | zip | — | readme-rmxp_overworld_tiles.txt |
| `downloads/vault-110.zip` | 157288 | zip | — | Readme.txt |
| `downloads/vault-118.zip` | 546641 | zip | — | Readme.txt |
| `downloads/vault-1590.zip` | 32351 | zip | tk3fight.dll | ReadMe.txt |
| `downloads/vault-406.zip` | 86947 | zip | — | Readme.txt |

## Detail pages captured

79 detail pages were parsed; see `details.json` in this directory for
the full text of each, including any version string the page carried.

## Payload id ⇄ file id mapping

The `*/files/<N>.zip` payloads are keyed by the same `N` the catalogue uses. Two
confirmations from inside the archives themselves:

- file **861** *C++ Plugin SDK, 3.04+ Version* → `fileman/files/861.zip`, whose
  `readme - SDK.txt` opens *"COM Plugin SDK (C++), version 2.0 … an updated plugin SDK for
  TK 3.04+ and an outlook into Trans3 & COM"*.
- file **1590** *Default Battle System with Item bug workaround* → `vault/files/1590.zip`,
  whose `ReadMe.txt` reads *"Recent changes made to the tk3fight.dll 1.) Item bug fixed"*.

Both ids are the same on the listing page and in the payload path, so the catalogue's ids
can be used to look up a payload. Coverage is nevertheless thin: **only 2 of the 40
recovered plugins have an archived payload** (ts). The other recovered payloads belong to
files that sit in categories outside this ticket's focus, or whose categories were never
captured, so they have no catalogue entry here.

The same payload was mirrored under `fileman/files/` in the 2005-2006 captures and under
`vault/files/` from 2007 (e.g. `118.zip`: CDX length 155 860 recorded 2006-03-14 under
`fileman/`, 155 980 recorded 2007-03-21 under `vault/`). [INFERENCE] that mirror move is
why so many `fileman/files/` captures carry a `PHPSESSID` query string.

## What the catalogue says about the plugin surface

Grouping the recovered descriptions, the third-party plugin API extended RPG Code with:

- **SDKs / plugin host ABI** — a VB SDK (819) and a C++/COM SDK "updated for 3.04" (861),
  plus 221 *Advanced RPGCode* to "access all the plugin SDK callbacks in normal RPG Code".
- **Item / inventory / menu data** — 1310 (24 item accessors), 1326, 1599, 1630, 1590.
- **Graphics and image formats** — 1503 (100+ formats, alpha), 823 (`restorescreen`),
  158 (TrueType), 313 (resolution).
- **Audio** — 1244 *FMod* (24 commands, 22 file types, multiple simultaneous streams).
- **Networking** — 559 (Winsock), 152 (FTP), 468 (e-mail), 1661 (HTTP getURL/putURL).
- **File I/O and data** — 148, 170, 550 (binary read/write), 1723 (XML), 1652, 1654.
- **UI / input / shell** — 147 (text box), 171 (edit box), 613 (common dialogs),
  169 (cwd/file size), 1294 (`execute(command$)`), 154 (flash), 552 (movie player).
- **Multiplayer / mini-games** — 156, 149, 304, 478.

Nothing in the recovered listings documents the plugin ABI itself; only the two SDK
archives (819, 861) could, and their interior is summarised under *Recovered binaries*.

## Two taxonomies, and three views per file, in one archive

The site folded two generations together.

- **2004-2006 legacy pages.** `fileman.php?id=S&file=N` serves three views of one record:
  `id=3` is the file page (description, `DOWNLOAD (size)` button, download counter, About
  box), `id=5` is the download-redirect page ("Please wait for your file to begin
  downloading"), `id=7` is an About-only page. Its sidebar taxonomy is the older section
  list with ids in `index.php?id=N`: *Utilities* (23), *plugins* (24), *Methods* (25),
  *Battle Systems* (26), *Other* (27), *Message windows* (33), *Tutorials* (34),
  *Menu Systems* (51).
- **2007+ pages.** `files.php?cat=N` carries the category ids used in the tables above
  (17 Custom Systems, 18 Methods, 19 Plugins, 20 Other), and `files.php?file=N` is the
  detail page. Legacy ids below ~1200 resolve on `fileman.php`; later files exist only on
  `files.php?file=N`.

Files were migrated between the two generations, which is why a file added in 2003 is
listed beside one added in 2009 in the same 2009 category page.

## Gaps / not recovered

- Paged category views (`&page=2+`) are archived only for cat 20 (2007-05-23) and
  cat 19/18 (2007-03-08). 2009/2010 pages 2-3 of cats 17-20 are absent, so the 40
  recovered plugin ids are a union across capture dates, not any single snapshot's list.
  CDX query that fails to help: `toolkitzone.com/files.php?cat=19` `--match prefix`
  returns only the 8 captures listed above.
- Many `fileman.php?id=3&file=N&PHPSESSID=…` captures 404 on replay, so older plugin
  detail pages (full description, version string, archive name) stay unrecovered.
- Payloads whose only capture is a `?PHPSESSID=` URL could not be replayed. **26 of the
  69 archived `fileman/files/*.zip` payloads are in this class** — ids 61, 81, 88, 92,
  119, 120, 123, 188, 195, 253, 484, 602, 619, 626, 655, 724, 764, 810, 1149, 1186,
  1190, 1191, 1197, 1201, 1204 and `118` — each fails with `404 NOT FOUND` on the
  literal replay URL, and on the same URL with the query stripped. Neither CDX prefix
  query exposes a session-free alternative for them.
- `files.php?cat=19&page=2|3` for 2008-05-09 (the 32-file peak) is not archived, so the
  8 files deleted before 2009-03-30 cannot all be identified by name.

