---
type: discovery
title: "Render readiness: what the code, docs/spec and the corpus give epic board-rendering"
date: 2026-10-16
baseline_revision: 76aaf0f9
---

# Render readiness audit

Source-backed audit behind the inception of `epic-board-rendering`. Every finding cites a file and line, or says how it was measured. Claims I could not observe are marked **[INFERENCE]**. The last column names the entries (ids of `../tickets.toml`) that the finding blocks or shapes. The probes in F-14 to F-17 ran on 2026-10-16 in `/tmp`, outside the repository; nothing from them is committed.

## A. What exists in the code

| ID | Finding | Evidence | Blocks / shapes |
|---|---|---|---|
| F-01 | `core` has no `world`, `render`, `raster`, `camera` or `engine` module. The directories are `canon`, `fmath`, `formats`, `ports`, `rng`, `save`, `script`, `time`, `validate`. | `ls packages/core/src` | 5 to 25 |
| F-02 | The draw-list types are already published: `DrawCommand` is the eight-command AD-3 union with `BlitCommand { source, src, dst, key, tint, alpha, blend, iso2d }`. `Engine`, `TickReport`, `SurfacePixels` and `Breakpoint` are published too. `createEngine` is absent: the file says it is "deferred to the engine epic". So the epic implements these types, it does not define them. | `packages/core/src/ports/draw.ts:84-100,160-177`; `ports/engine.ts:1-8,51-92` | 5, 6, 19 |
| F-03 | **Gap in the fixed schema.** `FontRef` is `{ asset }` only: no size, bold or italic, yet scripts set all three (`fontSize`, `bold`, `italics`, 79 `fontsize` calls in the corpus). `TextCommand` has no other place for them. Underline can be a `line` command. The schema is "fixed AD-3", so this needs a deliberate amendment (proposal D-1). | `ports/draw.ts:73-76,134-147`; AD-15 | 1, 8, 9, 21 |
| F-04 | AD-3 has no clip, no mask and no alpha fill. Two needs follow: a polygon-shaped `under` vector redraw, and a translucent window or fade overlay. Both are expressible without a schema change: per-row span blits for the polygon, and a one-pixel colour surface owned by the `ui` or `fx` section (state, not built per frame) blitted with a translucent blend. Command counts rise. Entry 6 reports any case where this fails. | AD-3 text (`architecture-…md:107`); `board.md:109,112` (`under` flags) | 1, 6, 15, 21, 22 |
| F-05 | `core/time` has no `frameAt` yet: its header says it arrives with the entries that use it. Animated tiles (origin 0) and script animations need it. | `packages/core/src/time/time.ts:13` | 10, 23 |
| F-06 | `GameState` has 18 sections; four are real (`schema`, `vm`, `rng`, `time`) and fourteen are `Record<string, never>` placeholders in `save/sections.ts`. This epic fills seven: `world`, `camera`, `ui`, `fx`, `surfaces`, `engine` and the raw-event half of `input`. The file is a shared seam between this epic and epics 5 to 8. | `packages/core/src/save/state.ts:1-20`, `:39-55` | 5 (partition owner) |
| F-07 | The harness has no engine. `script-host.ts` says it is "deliberately **not** `createEngine`" and `setBreakpoints` only stores its argument. The golden job records `{ tick, state, draw }` hashes per tick and has no PNG pipeline. | `packages/runner-harness/src/script-host.ts:5-13,221-280`; `golden.ts:11-15` | 5, 19, 26 |
| F-08 | The VM exposes `runWaitsPhase`, `runThreadsPhase`, `advanceScriptTick` and a resumable `stepThread(thread, vm, services, budget)`, and a budget of 1 single-steps. It has **no pre-instruction hook**, so a breakpoint cannot stop it from inside. Entry 30 therefore single-steps from the engine while breakpoints exist, which needs no change to `core/script`. | `packages/core/src/script/vm.ts:271-290,310-330,1355-1380` | 30 |
| F-09 | Catalogue stubs are generated: `tools/catalogue/generate.mjs` writes `catalogue-stubs.ts` from `command-effect-catalogue.json`, and `CATALOGUE_PLUGIN` already filters names the `core` pack owns. A real render or world pack would otherwise trigger the "every override warns" rule once per name. Entry 11 settles replacement. | `tools/catalogue/generate.mjs:1-40`; `packages/core/src/script/catalogue-responders.ts:224-232` | 11 and every built-in entry |
| F-10 | Format-side pieces the renderer consumes already exist: `decodeTexture` and `decodeGif`, `expandTileToRgba` and `iso-diamond.ts`, the DOS palette from `dos-palette.json` (R-01 landed in 2.24), the `.tan`, `.tbm`, `.anm` readers and the TK2 `.fnt` reader (16.7). R-15's 245/10 pre-shade is not implemented anywhere. | `packages/core/src/formats/**`; `formats/font/model.ts:1-22` | 5, 8, 13, 14 |
| F-11 | `core`'s runtime dependencies must equal `packages/core/dependency-allowlist.json` exactly; today that is `fflate` alone. A font library is a second entry and needs a licence check. | `tools/check-core-deps.mjs:1-60`; `packages/core/package.json` | 3, 9 |

## B. The catalogue and who owns which name

| ID | Finding | Evidence | Blocks / shapes |
|---|---|---|---|
| F-12 | The command-effect catalogue gives this epic **92** of 282 names: Dialogue & text 27, Input (cursor maps and the mouse cursor) 6, Screen & drawing 28, Canvases 6, Board 22, Animations 3. Plus 8 virtual variables (`boardBackground`, `boardSkill`, `boardTitle[i]`, `constant[i]`, `ambientRed/Green/Blue`, `cnvRenderNow`). Allocation: 11 owns the table; 12 the board names (21, `send` is in 20); 16 `getCorner` and the camera additions; 20 `send`; 21 the 27 dialogue names; 22 six effect names; 23 three animation names; 24 27 graphics names; 25 six cursor names. 21 + 1 + 27 + 6 + 27 + 3 + 6 + 1 (getCorner) = 92. | `epic-rpgcode-vm/discovery/command-effect-catalogue.json` (`names[].owner == 4`) | 11, 12, 16, 20 to 25 |
| F-13 | **Source conflict.** `docs/spec/engine/rpgcode-functions.md#ownership-of-names-with-no-single-owner` gives the game lifecycle (`reset`, `start`, `mainFile`, `win`, `gone`, `over`) to board-rendering. The catalogue JSON gives `reset`, `mainFile`, `win`, `gone`, `over` to menu-party-save (8) and `start` to rpgcode-vm (3). docs/spec is normative (ADR 0007). The same page's own catalogue row calls `start` "Open a file with the shell". | `rpgcode-functions.md:412`; catalogue JSON | 1 (rules), 11, 20 |
| F-14a | `godos`, `dos` and `windows`: the ownership bullet says they are "obsolete and dropped" (`rpgcode-functions.md:414`), but the catalogue rows for `dos` and `windows` are not marked obsolete (`:63-64`) and E-06 says a script quit uses `windows()` and `dos()`. Entry 1 rules it; assumption A-4 registers `dos` and `windows` as `quit` requests and `godos` as the obsolete error. | `rpgcode-functions.md:63-64,72,414`; `main-loop-and-startup.md:157-162` | 1, 20 |
| F-14b | Camera names in AD-33 (`cameraPanTo`, `cameraFollow`, `cameraReset`, `cameraShake`) are not in the 282-name catalogue. `getCorner` is. | AD-33; `rpgcode-functions.md:149` | 1, 16 |

## C. What docs/spec leaves open

| ID | Finding | Evidence | Blocks / shapes |
|---|---|---|---|
| F-15a | Transitions have no numbers. `fade` has "several different types" (nothing enumerates them), `wipe` takes an effect 1 to 12 and a speed that no page describes, `zoom` and `earthquake` give a percent and an intensity only. The shipped 3.1 help (`rpgcodeEN.ref`, in the local archaeology cache) repeats the same one-line descriptions. | `rpgcode-functions.md:138,147,148,156`; `fixtures/archaeology/dist/rpgtoolkit310-docs/help/rpgcodeEN.ref` (`fade(int type)`, `wipe(`) | 1, 2, 22 |
| F-15b | E-55 gives the message window's features but no geometry, margins, text speed or default colours. `msgBox` layout, the cursor hand and the `text` cell size (E-56 says "tile-cell or pixel coordinates") are also unspecified. | `rpgcode-functions.md:53-54,335`; `plugins-and-battle.md` (`CBCanvasDrawText` positions text in character cells) | 1, 2, 21, 25 |
| F-15c | Light rasterisation has nodes and colours only: no falloff curve for the ellipse, no direction or clip rule for the gradients. The original also "ignores" a light's layer. | `board.md:71-83` | 1, 2, 13 |
| F-15d | 2D tiles on iso boards are "rotated and squashed into the same 64×32 diamond at draw time"; no formula. The envelope already makes pixel parity here a non-goal, but the projection must be deterministic. | `tiles.md:39` | 1, 6, 18 |
| F-15e | R-15 is ruled as written, but its scope is not: replacing white with 245 only matters under a tint; applying it with a zero tint would change unshaded art. Recommended sub-rule: only under a non-zero tint (assumption A-2). | `tiles.md:43`; `board.md:69` | 1, 13 |
| F-15f | R-06 is already stated: "item indices are always compacted" at run time, program indices kept on minor 4. Entry 10 implements it; nothing new to rule. | `board.md:154` | 10 |

## D. Oracles and fixtures

| ID | Finding | Evidence | Blocks / shapes |
|---|---|---|---|
| F-16a | **No isometric board exists in any available data.** Every board the reference reader parses in the fetched corpus has `coordType` 0 (`Basic`) or 4 (`demo`); the TK2 boards are pre-vector binary boards (no `coordType`; R-04) or text boards; the example village board is `coordType` 0. Both iso layouts need authored scenes. | measured: `python3 docs/spec/tools/rpgtk_formats.py` `parse()` over `fixtures/legacy/**/*.brd` (trace field `coordType`); `docs/spec/examples/game/Game/Example/Boards/village.brd` parses to minor 4, 16×12, 2 layers, coordType 0 | 4, 17, 18, 26 |
| F-16b | The in-spec "independent renderer" draws tiles only: no shading, ambient, lights, layer images, sprites or iso boards, and it adds a red start-position circle. `board.png` is therefore an oracle for the tile layers of one 2D board and nothing else; `grass_iso.png` covers one iso tile. | `docs/spec/tools/render.py:111-126` | 4, 17 |
| F-16c | The corpus has no TrueType font. The four TK2 games that carry a `Font\` folder ship `BASE.FNT` (an 8×8 bitmap font). The scripts request fonts by system name: `font("courier")` ×9, `font("arial")` ×1, `font("Comic Sans MS")` ×1. Text pixels therefore depend on whatever font data the rebuild ships; legacy text parity is not available, so text goldens are regression baselines. | measured: `grep -rhoiE 'font\s*\(\s*"…"' --include=*.prg fixtures/legacy`; `find fixtures/legacy -iname '*.fnt' -o -iname '*.ttf'` | 3, 8, 9, 26 |
| F-16d | Render built-in use in the corpus (calls over all `.prg`): `mwin` 954, `text` 351, `send` 193, `setimage` 124, `fontsize` 79, `setimagetransparent` 61, `layerput` 51, `earthquake` 40, `fade` 39, `savescreen` 22, `restorescreen` 21, `wingraphic` 15, `font` 12, `put` 10, `zoom` 7, `cursormapadd` 6, `viewbrd` 5, `setimagetranslucent` 4, `cursormaprun` 2, `setimageadditive` 1; no calls to `wipe`, `animation`, `createcanvas`, `rendernow`, `setambientlevel`, `prompt` or `msgbox`. All 92 names stay in scope; this orders risk, not scope. | measured as F-16c | 21 to 25 |
| F-16e | The ledger is new work: nothing today records which golden has which oracle. Classes: `independent-reference` (a separate implementation from docs/spec text; where the spec defers to a Reawakened rule, the rule is what is checked, not legacy parity), `legacy-screenshot` (an owner-supplied image; G7 does not forbid screenshots, their copyright is a separate check; none is assumed), `regression-baseline` (the TS output itself, recorded). | `docs/guardrails.md` G5; user ruling 2026-10-16 | 4, 17, 26, 28 |
| F-16f | `tools/fixtures/author` already authors fixtures from `docs/spec` alone with a `--check` mode and imports nothing from `packages/core`: the pattern for entries 4 and 17. The reference renderer is Python with Pillow (as `docs/spec/tools/render.py` is); CI should compare committed bytes only and not run Python (assumption A-5). | `tools/fixtures/author/generate.mjs:1-12` | 4, 17 |

## E. Font library candidates (probe results)

Fonts used for the probes were macOS system fonts (Courier New, Arial, Comic Sans MS): used only to run the probes, never committed or redistributed.

| ID | Candidate | Finding | Evidence |
|---|---|---|---|
| F-14 | **opentype.js 2.0.0** | MIT, zero dependencies, published 2026-05-06 (1.3.5 on 2026-04-29, so maintained). The tarball ships only `dist/` (`files: ["dist"]`, no `types`, no `.d.ts`); `opentype.mjs` is 494,695 bytes, `sideEffects: false`. The bundle contains `document.` (SVG and canvas helpers, `:810`, `:5679`, `:10793`), a `TextDecoder` use and one `require(` in a deprecation message (`:16297`); the `process.` hits are `font.variation.process`, not Node's. It parses and returns outlines (`getPath`); it has no pixel rasteriser. | `npm view opentype.js`; `npm pack`; `grep` on `dist/opentype.mjs` |
| F-15 | opentype.js probe 1 | In a `vm` context with no `document`, `window`, `process` or `require`, `parse` of Courier New, `charToGlyph('A')`, `getPath(0,0,16)` (49 commands), `stringToGlyphs`, `getKerningValue` all ran. The only `Math` members executed were `round` (3 calls) and `abs` (16): both on the G3 allowlist. The bundle does contain `Math.pow` and `Math.log` (`:241`, `:304`, `:1232`, `:3663`, `:9202`, `:12995`), on write, bounding-box and hinting-delta paths that this probe did not reach. | `/tmp/fontstudy/probe.mjs`, run 2026-10-16 |
| F-16 | opentype.js probe 2 | The SHA-256 prefix of every glyph's path commands for a 50-character string at sizes 8, 12, 13, 16 and 24 is **identical on Node 26.8.1 (V8) and Bun (JavaScriptCore)** for all three fonts: Courier New `d004b5ff2d1ed27e`, Arial `9ea26b1b82f0a76d`, Comic Sans MS `5998ec97a90a07c6`. Limits: one outline technology (TrueType `glyf`), no CFF, no variable fonts, no hinting, two engines. | `/tmp/fontstudy/xeng.mjs`, run 2026-10-16 |
| F-17a | Typr.js 1.0.0 | MIT, 55 KB, but `npm view` shows `1.0.0` created 2018-01-26 and nothing newer; the code reads `window["TextDecoder"]` and uses CommonJS `module` at load (my probe failed on `module is not defined`); no types. Only `Math.abs/min/max` appear in the source. Weaker candidate. | `npm view typr.js time`; probe |
| F-17b | fontkit 2.0.4 | MIT; nine direct dependencies (`dfa`, `clone`, `brotli`, `restructure`, `@swc/helpers`, `tiny-inflate`, `unicode-trie`, `fast-deep-equal`, `unicode-properties`), each a separate allowlist and licence entry; Node and browser builds differ. Not probed. | `npm view fontkit` |
| F-17c | fonteditor-core 2.6.3 | The tarball has an MIT `LICENSE`, but the npm `license` field is empty; depends on `@xmldom/xmldom`; `src/common/DOMParser.js` and `src/ttf/i18n.js` reference host APIs. Not probed. | `npm view fonteditor-core`; `grep` in `src/` |
| F-17d | Default font licences | The current `googlefonts/Arimo` repository carries both `LICENSE.txt` (Apache-2.0) and `OFL.txt`, and `google/fonts` lists it under `ofl/arimo` (an older `apache/arimo` path existed). Cousine and Tinos are the same family of fonts [INFERENCE: not opened]. Blue Oak rates Apache-2.0 Gold; OFL-1.1 is not on the list the licence gate uses [INFERENCE: not re-checked against the pinned list]. So the default-font licence is unresolved, not chosen: it is part of entry 3. | web search 2026-10-16 (googlefonts/Arimo, google/fonts) |

**Verdict recorded here.** No library is selected. opentype.js 2.0.0 is the lead candidate and passed two probes, but it has no types, one font technology was tested, hinting and write paths were not exercised, and the default fonts' licence is open; a rasteriser (outline coverage fill) is core's own either way. Entry 3 is the research-gated spike that turns this into a verified choice or the owner's fallback. Entry 9 waits on it.

## F. Spec and spine gaps by entry

| Entry | Needs ruled first (entry 1 = core rulings, 29 = presentation, lifecycle, audio) |
|---|---|
| 4, 5, 6 | ellipse algorithm; `iso2d` projection; scene description schema (entry 4 defines it) |
| 8, 9 | `FontRef` size and style; TrueType metrics; substitution by family; default and fallback font files (entry 3); `text` cell size (29); when `.fnt` is used |
| 11, 19 | same-statement effect application; waits read a state view (AD-9); the `input` section's owner |
| 13 | R-15 scope; light formulas |
| 15 | sort key `(layer, screen-space y, drawId)`; `under` flags and span-blit method |
| 16 | camera defaults; `camera*` signatures and easing set; `alpha` |
| 14, 15, 18 | `composeBoard` inputs (AD-29: world view, sprites, tick, `alpha`) |
| 30 | breakpoint cursor, resume modes and `ticksRun` (AD-1) |
| 20, 31 | lifecycle ownership; `dos`/`windows`/`godos`; `gone` as an effect on `triggers`; reset section by section; names of the player-creation, presence and saved-game ports; audio cues as effect records |
| 21 to 25 | message-window, `msgBox`, transition, cursor defaults (unverified); `drawEnemy`; the button-overlay seam |

## G. Provider pins checked

All 79 provider tickets are `done` (`tickets.py status` counts 79 of 79). Pins used by `tickets.toml`: 1.5 licence gate, 1.7 fixture fetch, 1.8 contract types and hashes, 1.9 harness driver and golden job, 1.14 engine-features migration; 2.2 tileset, 2.3 texture decoders, 2.4 animation, 2.5 board, 2.6 actors, 2.8 and 2.16 pre-vector converter, 2.9 main file, 2.10 resolver, 2.11 dump tool, 2.13 registry, 2.22 fixtures for untested paths, 2.23 formats migration, 2.25 tile bitmaps, 2.26 examples gate; 3.2 `GameState` shell, 3.3 registry, 3.9 waits and threads, 3.11 `hashState` in `advance`, 3.15 TK2 dialect plugin, 3.21 and 3.22 responders, 3.25 default manifest, 3.26 tick rename, 3.27 §9 migration; 16.4 TK2 text readers, 16.7 `.tan` and `.fnt` readers, 16.8 TK2 decoder registration, 16.9 TK2 corpus gate, 16.11 BMP and 16.12 GIF decoders. The initiative's `[[epic]] after` for this epic names epics 1, 2, 3 and 16, and epic 6 now names epic 4.

## H. Findings from the first independent review (2026-10-16), re-checked against the code

Each was verified by reading the cited line before it was accepted.

| ID | Finding | Evidence | Resolved by |
|---|---|---|---|
| F-18 | A built-in records only `{ section, path: [], op: "merge", value: null }` in `vm.effects`; the log is a ring of 256 (`EFFECT_LOG_CAP`) that evicts the oldest record; owners drain it later. Nothing applies an effect before the next instruction, so `put` then `getBoardTile` in one turn would read stale state, and a loop of more than 256 calls would evict unapplied records. | `packages/core/src/script/vm.ts:1195-1213`; `script/effects.ts:98` | entry 1 (ruling), entry 11 (hook) |
| F-19 | `WaitView` is `{ readonly tick }` and `pollInputKey` resolves only when `wait.key` is non-null, i.e. when the input owner has written it into the thread's wait in `vm`, against AD-9 and AD-10. `runWaitsPhase` receives `state.time`. A `render.msgbox` or cursor-map poll cannot see `ui` or `input`. | `packages/core/src/ports/wait.ts:106`; `script/waits.ts:30-33`; `script/vm.ts:324` | entry 1 (AD-9 amendment), entry 19 |
| F-20 | `AudioSection` is owned by `core/audio` and "filled by epic audio-synth", which builds after this epic, so `cueId` does not exist when boot and animations need to emit sound. | `packages/core/src/save/sections.ts:48-49`; AD-16 | entry 29 (audio effect records), epic 6 handoff and `after` |
| F-21 | E-06 resets variables, redirects, threads and plugins and reruns start-up from step 3; it says nothing of `time`, `rng`, `ui`, `fx`, `camera` or `surfaces`. "A reset equals a fresh boot" is not what the spec says. Boot also needs the first player (sprites) and the no-player check (party), which later epics own. | `docs/spec/engine/main-loop-and-startup.md:62-69,158,162` | entry 29, entries 20 and 31 |
| F-22 | `createDefaultVirtuals` already reads `world.board.{background,skill,layerTitles,constants}`, `world.ambient` and `surfaces.renderNow` and silently falls back to `""` or `0`. | `packages/core/src/script/virtuals.ts:37-49,103-115` | entries 12 and 24 replace the reads |
| F-23 | `save/sections.ts` still says the world is "filled by epic movement-triggers" and the input section "by epic platform-baseline", against AD-10's owner modules (`camera` in `core/world`, `ui` and `fx` in `core/render`, `surfaces` in `core/raster`, `input` in `core/input`). | `packages/core/src/save/sections.ts:15,39` | entry 5 |
| F-24 | The in-spec render draws only the tile layers onto a 512×384 canvas with a black background; the full village board also has shading, a light and a layer image, and the engine's viewport is the main-file resolution with `center-if-small`. S-01 must therefore pin its view; the full pipeline is a separate scene (S-01b). | `docs/spec/tools/render.py:111-126`; `docs/spec/examples/README.md:12` | entries 4 and 5 |
| F-25 | Nothing in the repository runs Bun, yet cross-engine checks are promised in several entries. | `grep -rIl -i '\bbun\b'` over `.github`, `package.json`, `tools` and `packages/*/package.json` returns nothing | entry 5 (pinned Bun lane) |
