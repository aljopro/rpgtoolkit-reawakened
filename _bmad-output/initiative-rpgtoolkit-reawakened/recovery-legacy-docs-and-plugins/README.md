# Legacy docs & plugin recovery — RPG Toolkit (Wayback Machine)

Recovery of the RPG Toolkit's documentation and plugin material from the Internet
Archive, for the clean-room rebuild. Started from the question *"do we have
anything on Toolkit plugins — a list, any documentation?"*; the repository had
only `docs/format-spec.md` §12 (plugins are Windows DLLs; not portable) and
`docs/engine-features.md` E-99 (a rebuild should provide a sandboxed extension
point). Both are thin. This directory is what the web still holds.

Report date: 2026-10-11. Recovery performed against the Wayback Machine only
(no browser automation, no legacy source opened — see *Guard-rails* below).

## The answer, in short

| Question | Answer |
| --- | --- |
| Is there a plugin list? | **Yes**, two overlapping community catalogues: 15 plugins at `rpgtoolkit.net/extend/plugins` (2006–2016) and 40 in toolkitzone.com's Plugins category (2003–2010), plus the two stock plugins. Metadata (author, date, downloads, description) recovered; none of the plugin binaries survived. → `plugins.md` |
| Is there plugin documentation? | **Yes, and better than expected — two SDKs.** The **COM SDK 2.0** (C++, 2004, for TK 3.04+): `IMain` entry point, 98 engine callbacks, the RPGCode command-map mechanism, canvas/animation classes, battle structs, 251 engine information codes. And the **TK310 C++ SDK** (2011, for **3.1.0**): 13 `TKPlug*` exports, 131 callbacks, a worked skeleton per plugin kind. → `findings/06-plugin-sdk.md`, `plugins.md` §4 |
| Are the Toolkit 3 docs recovered? | **Yes.** The full **TK 3.1.0 user guide** — 34 pages in the online mirror, 47 `.htm` files in the shipped help, including the **262-function RPGCode reference** — from three independent sources (the `tk3.toolkitzone.com` help app, the static mirror at `rpgtoolkit.net/manual/`, and the shipped help inside the 3.1.0/3.2.1 packages). → `docs.md` |
| Did any plugin binaries survive? | Almost none: of 69 plugin payloads referenced across both archives, **three sets of bytes** — the 2004 COM SDK, the 2011 TK310 SDK, and one `tk3fight.dll` patch — plus the two stock DLLs inside the official distributions. |
| What does *not* exist | A plugin-authoring chapter in any official manual (a `page20` "plugins" page was planned and never shipped), the VB plugin SDK's bytes, and the plugin comment threads (AJAX, never crawled). |

## Contents

| File | What it is |
| --- | --- |
| `plugins.md` | Consolidated plugin digest: what a plugin was, the two stock plugins, both catalogues, cross-references, the recovered plugin documentation, payload survival, gaps |
| `docs.md` | Consolidated documentation digest: the four doc generations, the 3.1.0 guide's coverage, the 262-function reference, community corpora, licensing, and a 13-item `docs/` gap list |
| `findings/01-rpgtoolkit-net.md` | `rpgtoolkit.net`: `extend/plugins` detail pages and tabs, manuals, tutorials, binaries |
| `findings/02-tk3-docs.md` | `tk3.toolkitzone.com/help`: the TK 3.1.0 help app, its TOC, images, `dev/` pages, and the `docs/` comparison |
| `findings/03-toolkitzone.md` | toolkitzone.com file archive: 40 plugins, 23 Custom Systems, 30 Methods, 51 other code files, 44 downloaded payloads |
| `findings/04-distribution.md` | Official 3.2.1 / 3.1.0 / 3.0.6 distributions, their shipped help, and `rpgtoolkit.com`'s Toolkit 2 docs |
| `findings/05-toolkitzone-library.md` | The toolkitzone Library: 253 community articles (240 bodies), release notes/progress updates, and what they say about plugins and licensing |
| `findings/06-plugin-sdk.md` | The recovered COM plugin SDK: the full interface inventory, transcribed |

## How it was done

Four workstreams (one per source group) ran in parallel, each with the same
tooling and report contract, plus a fifth slice (the toolkitzone Library) run
directly. Everything was fetched as raw `id_` Wayback replays of the original
bytes, with CDX enumeration first so that "does a capture exist" was answered
before fetching anything.

Local tooling (git-ignored, under `fixtures/archaeology/`):

| Tool | Purpose |
| --- | --- |
| `wb.py` | CDX query + fetch newest (or chosen) 200 capture; writes a provenance JSON sidecar |
| `wb2.py` | direct snapshot fetch with keep-alive, 503 backoff, and `?PHPSESSID=`-canonicalised URL variants |
| `lib_index.py`, `parse_library_index.py`, `fetch_library_index.py`, `sweep_library.py` | toolkitzone Library: extract, index, listing capture, final retry sweep |
| `parse_sdk.py` | the recovered SDK headers → `sdk-interface.md` / `.json` |
| workstream drivers (`drive*.py`, `flatten.py`, `parse_item.py`, …) | per-source fetching and parsing, documented in each findings file |

Roughly 2 400 files (~127 MB) were pulled: ~860 HTML/HTM pages, 47 binaries
(zips, DLLs, installers, MIDIs), the three distributions (~50 MB) and their
documentation-only extracts, plus a provenance JSON for each fetch. The archive.org
replay endpoint intermittently refused connections ("Connection refused"/503)
under load; the fetchers retry with backoff, and every failed item is listed as a
gap in the relevant findings file rather than silently dropped.

## Guard-rails respected

* **G7 (clean room).** The legacy source tree `../rpgtoolkit` was never opened.
  Nothing was fetched from the archived `/source/` (the phpCVSview of the CVS
  tree). No implementation file (`*.cpp`, `*.bas`, `*.vb`, `*.frm`, `*.cls`) from
  any recovered archive was extracted or read. The plugin SDKs are the one place
  where the line was drawn at *interface*, deliberately and reversibly: their
  public headers, `.idl`/`.def`, constants, readmes and licences were read and
  transcribed locally, because a published SDK header is the interface a plugin
  author coded against; their implementation files were not touched. That call,
  its rationale and how to reverse it are written up in
  `findings/06-plugin-sdk.md` §*Reading boundary*. Raw captures stay in
  git-ignored `fixtures/archaeology/`; the tracked artefacts are these reports.
* **G6 (licences).** Recovered: 3.0.2–3.0.6 under the AC Open Licence; **3.1.0
  onward GPL v3** (engine, editor *and* `tk3menu.dll`/`tk3fight.dll`, with a
  game-EXE exception); the plugin libraries and both SDKs under the AC Open
  Licence / AC Open Licence Derivative (© 2003 Christopher Matthews), and the
  2004 SDK additionally carrying © 2004 Colin James Fitzpatrick with a
  "you must give credit to the author" notice. ACOL-D even requires derivative
  works to publish their source, so it fails G6's Bronze bar outright. Nothing
  recovered may be copied into or depended on by this MIT/Apache codebase, which
  is why only facts about the interfaces are recorded, with attribution.

## Decision required before any of this is used

Everything here is **evidence, not spec**. G7 says implementation comes from
`docs/`. Two things need a call from the user:

1. **Promote the recovered interface into `docs/`.** The rebuild wants an
   extension point (E-99) and native menu/battle systems (E-80). Recommended:
   write a `docs/` page stating *our* extension contract — derived from the
   recovered interface facts, not copied — in its own commit, then implement from
   it. Start with the plugin kinds/capability flags, the unknown-command
   dispatch, and the `FIGHT_STRUCT`/`FIGHT_EVENT` shapes.
2. **Correct `docs/format-spec.md` §12 / §1.5.** It says plugins are "native
   Windows DLLs of three kinds" and names the folder `Plugin/`. The recovered
   3.x guide and SDK show a **COM component model**, folder `Game\Plugins`,
   `menuPlugin`/`fightPlugin` slots and named callbacks. This is a doc fix, and
   per G7 it goes in its own commit before any related code. (`docs.md` §6 item 9
   has the detail.)

Also worth deciding: whether the recovered RPGCode function reference should
become the seed of the rebuild's own function reference (it currently appears in
`docs/format-spec.md` §9.11 as names only), and whether to keep the recovered
SDK transcription local or publish a derived interface description.

## Gaps

Per-source detail is in each findings file; the shape of it:

* Plugin **binaries** are essentially gone (3 of 69 payloads; the VB SDK never).
* `rpgtoolkit.net`'s listing pages are AJAX shells, so the catalogues are
  reconstructed from URL evidence — an unknown number of never-linked items
  remain invisible.
* Manual **figures** are largely lost (CMS catch-all responses; only 27 of the
  help app's 143 images crawled).
* Toolkit 2.0 vs 2.20b: only the 2.0 pages are live; 2.20b survives solely inside
  `help220.upd`.
* No 3.2.x-specific documentation, no post-2004 SDK, no plugin comment threads.
