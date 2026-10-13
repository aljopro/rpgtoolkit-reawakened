# epic-board-rendering — proposed story breakdown (UNAPPROVED DRAFT)

> Draft only. Nothing was written to the repo except this file and the draft breakdown it describes, `tickets.toml` in this folder, so `tickets.py` could be run against it. A copy of the same TOML sits at `/tmp/epic-board-rendering.tickets.proposal.toml`.
> Built 2026-10-12 against this worktree's main (`3ec2ab9`).
> Sources: `epic-board-rendering/epic-board-rendering.md`; the architecture spine (`AD-1`–`AD-4`, `AD-10`, `AD-15`–`AD-17`, `AD-26`–`AD-29`, `AD-32`, `AD-33`, and its `Deferred` list); `docs/engine-features.md` E-01..E-06, E-10..E-19, E-50..E-63; `docs/format-spec.md` sections 3–5, 7.1, 9.11; `docs/guardrails.md` G3–G5; the epics 1, 2 and 3 `tickets.toml` and epic 3's `discovery/command-effect-catalogue.md`; `deferred-work.md`; `spec-rpgtoolkit-reawakened.md` CAP-2 and CAP-6; `epic-legacy-formats/discovery/{spec-readiness,corpus-inventory}.md`.
> G7 compliance: no file under the legacy GPL tree (`../rpgtoolkit`) was opened, read, grepped or executed. Read-only git commands only.

## In one paragraph

Epic 4 is "boards render through draw lists in 2D and both iso modes". The 18 build entries below split it into a **render lane** — rasteriser, tiles and coordinate systems, the board compositor, shading arithmetic, text and the message window, surfaces and canvases, screen effects, animations — and a **world/engine lane** — the board world model, the camera, the engine with its phase list, the startup/`send` lifecycle, runtime board edits, the VM-facing seams, and the built-ins that register with the RPGCode VM. Nothing in the render lane reads epic 3's code, and no entry in either lane needs the RPGCode VM to run; every epic-3 pin falls on entry 1 (the tick rename) and on entries 9 and 12–17. So the epic is buildable in parallel with epic 3, starting as soon as epic 3's `3.26` lands — which is startable today.

## 1. Scope restatement (sanity check)

**Done when** (six checks in the envelope): golden PNGs for 2D, iso-stacked and iso-rotated boards with camera tracking, small-scene centering and multi-layer parallax; layer order, colour keys, shading plus ambient arithmetic and animated tiles matching format-spec 4.3 and 4.5; startup, `send`, board edits and a reset cycle leaving the expected state on a scripted board; the message window, text, primitives and transitions as draw-list operations that replay identically; the rendering built-ins registered with the VM; and persistent surfaces per AD-27 with a cache-flush replay giving identical pixels.

**Already built** (consumed, not re-done): the draw-list command union and the `Engine` port (`packages/core/src/ports/draw.ts`, `engine.ts`, `audio.ts`); canonical form and hashes (`core/canon`); the board, tileset, actor, animation and image models and their readers (epic 2 entries 2.2–2.6, 2.9, 2.10, 2.13); and the headless driver, null audio and golden job (epic 1 entry 1.9) — `goldenJob` takes an `engineFactory`, so a board host can drive it.

**Not built anywhere yet**: `core/raster`, `core/render`, `core/world`, `core/engine`, the surface store, the compositor, text layout and glyphs, and the PNG writer. `createEngine` is a comment at `packages/core/src/ports/engine.ts:4` and nothing more. `core/time` is created by epic rpgcode-vm entry 3.2.

**Boundaries held**: sprite movement and triggers, the WebGL2 replayer, audio realisation and the format readers belong to other epics; every seam is named in the entry that consumes it.

## 2. What must be settled, and what this draft assumes

Each item is a question for you (D) or an assumption this draft makes so the breakdown exists at all (A). Each names the entries it changes.

| # | Item | Draft's assumption | If you rule otherwise |
|---|---|---|---|
| **D1** | **The golden-image reference.** The envelope records this as an Unknown: no legacy screenshots are committed (G7), so the expected images have no source. CAP-6's success line asks for a "golden tolerance". | **A1** — the reference is this rasteriser's own output, reviewed by a person once per board and mode, then frozen as the golden, with the review a hitl step on entries 1, 3 and 18; comparison is an exact pixel hash with no tolerance. | A tolerance or a hash-only golden changes the `verify` lines of entries 1, 3 and 18 and needs a stated reason in the golden files (G5). |
| **D2** | **The TrueType rasteriser and the glyph-metric source** (the envelope's open question; the spine's `Deferred` list names this epic as owner). | **A2** — AD-15's assumption: a hand-written pure-TypeScript rasteriser plus a bundled bitmap fallback and test font, ruled doc-first as entry 6's first step. | A permissive library instead means a G6 licence check and an ADR note; entry 6's first step and its references change, nothing else. |
| **D3** | **Who owns the `GameState` shell.** Epic 3's entry 3.2 creates it; `tickets.toml:45` says its slots are filled by that epic's own entries 6, 7, 9 and 10. | **A3** — each section's type and operations are defined by its owning module inside this epic, pure and testable on their own; entry 12 composes them into the shell 3.2 creates. | If 3.2 instead expects the sections to exist before it runs, entries 6, 7, 8, 10 and 11 gain `3.2` and `12`'s gate moves earlier — the practical effect is that the whole epic waits for epic 3's tracer. For strict file isolation, `3.2` should also be pinned on entry 1: it and 3.2 both append to `packages/core/src/index.ts` and add files under `packages/runner-harness/src`, which the draft leaves as an append-only merge. |
| **D4** | **The engine's gate on epic 3's harness change.** Entry 3.7 makes the harness report able to carry requests and diagnostics; this epic's engine emits asset requests (AD-5). | **A4** — keep it with 3.7 (one writer to the harness report shape). Entry 12 carries `3.7`. | Epic 4 could make the change itself; the deferred-work item's stated trigger is exactly "when a real engine emits diagnostics or blocking requests". Entry 12 loses `3.7` and epic 3's 3.7 keeps only the diagnostics half. |
| **D5** | **Animated GIF (E-54) and the other image kinds.** `deferred-work.md:54` records no GIF/BMP/ICO/WMF decoder and no tracking ticket; epic 2 entry 2.19 is the doc amendment that must rule on them. | **A5** — animated GIF is out of v1 (the sample games ship none) and goes to `deferred-work`; entry 9 delivers `.anm` and `.tan` only. | A small epic legacy-formats entry adds the decoder and entry 9 gains it in `after`. |
| **D6** | **AVI video (E-62).** The spec's open question is "transcode on import, or drop?", and the command catalogue assigns `playAvi`/`playAviSmall` to epic audio-synth (E-100..E-104). | **A6** — not this epic's; recorded here and in the Notes rather than delivered. | If it lands here it is one more entry after 12 (the blocking wait, the `playVideo` request, the `video.ended` input). |
| **D7** | **The sprite seam.** AD-10 gives the `sprites` section to `core/sprites`, which epic movement-triggers owns. | **A7** — entry 10 places the board's *declared* sprites at load and entry 4 draws them through a sprite view with a fixture view standing in; epic 5 owns every later movement. | If epic 5 owns loading too, entries 4 and 10 use a test view and the real sprites arrive with epic 5. |
| **D12** | **The `.tan` reader's home.** Entry 9 selects frames from a `.tan` table (format-spec 3.5), but no entry in epics 1, 2 or 3 reads `.tan`; the dump skips it as "no reader". | **A12** — entry 9 adds the small 3.5 reader in `core/formats/tileset`, recorded as a boundary exception. | The cleaner home is a new epic legacy-formats entry beside 2.2; entry 9 then pins it instead of building it. |
| **D13** | **The sprites, triggers and input sections** that entries 13, 14 and 16 consume belong to epic movement-triggers, which waits on this epic and so cannot be a prerequisite. | **A13** — those entries reach the sections through epic 5's ports, with test implementations standing in until it lands, as epic 3's own tracer does with its VM host. | The alternative is to move the player placement, the arrival-region deactivation and the modal input loop to epic 5 — which would move Done-when 3 out of this epic. |
| **D14** | **Where the `reset` built-in lives.** Format-spec 9.11's catalogue gives `reset` to epic menu-party-save (it clears every section); this epic's References cite E-06. | **A14** — the built-in is epic 8's; entry 13 delivers the startup re-entry and this epic's own sections' reset through a port. | If this epic owns the built-in, entry 13 gains the cross-section clear and the catalogue is amended. |
| **D8** | **Epic 4 is 18 build entries**, past the 8–12 band the method calls typical. | **A8** — one epic: two tightly coupled capabilities (CAP-2, CAP-6) with one owner and two cleanly separable lanes. | The honest reduction is a split: `epic-board-rendering` keeps the world/engine and boundary lanes (10–17) and a new `epic-render-pipeline` takes CAP-6 (1–9, 18). That needs a new `[[epic]]`, the CAP-6 `covers` moved and the envelope's Done-when re-cut. |
| **D9** | **Modal widgets' boundary** with epic 5 (input and buttons) and epic 8 (`dirSav`). | **A9** — this epic owns widget rendering and the two wait kinds (`render.msgbox`, `cursorMapRun`'s `input.key`); epic 5 supplies the input section and the buttons and epic 8 supplies `dirSav` (`tickets.toml` entries 16 and 17 claim none of them). | Moving the whole modal set to epic 5 takes entry 16 with it. |
| **D10** | **E-05 debug overlays.** | **A10** — the board-vector and tile-grid overlays are entry 4's; the sprite-vector, destination-marker and queued-path overlays are epic 5's and the title-bar FPS is the runner's. | Any other split changes entries 4 and 16. |
| **D11** | **Checkpoints for unattended runs.** | **A11** — the house pattern of epics 1–3: `plan_checkpoint` on entries 1 and 6 (hitl) and on the two highest-risk integrators, 12 and 15. The hitl entries are 1, 3, 6 and 18. | Add `done_checkpoint` to any entry you want to pause after; nothing else changes. |
| **D15** | **The iso, parallax and lighting fixtures.** The sample games' boards are all 2D, have no board or background images, lights or non-zero ambient, and the corpus ships no `.iso` or detail-2/4/6 tileset (`epic-legacy-formats/discovery/spec-readiness.md:84,94-95`, `corpus-inventory.md:203,417`). | **A15** — entries 3 and 18 pin epic legacy-formats entries 2.18 and 2.22 for the fixture boards and the iso-detection rule, and their goldens are fixture-based. | Amending Done-when 1 to say so explicitly is the alternative; the check's wording needs a user edit. |

## 3. Proposed breakdown (build order)

Lanes: **R** render/raster, **W** world/engine, **B** boundary/integration. Every entry's `covers` is CAP-2 and/or CAP-6.

| # | Title | after | Lane | hitl |
|---|---|---|---|---|
| 1 | **Tracer bullet**: one sample board to a golden PNG | 1.7, 1.8, 1.9, 2.2, 2.3, 2.5, 2.9, 2.10, 2.13, **3.26** | R | yes |
| 2 | `core/raster`: the pixel pipeline and the screen primitives | 1 | R | |
| 3 | Tiles and coordinate systems: 2D and both iso modes | 1, 2, **2.18**, **2.22** | R | yes |
| 4 | `composeBoard`: layers, images, parallax, sprite z-order and debug overlays | 1, 2, 3 | R | |
| 5 | Shading arithmetic: shade layers, baked lights and ambient | 2, 4 | R | |
| 6 | Text: glyph rasterisation, layout and the message window | 2, 4 | R | yes |
| 7 | Persistent surfaces, canvases, the overlay and screen save and restore | 2, 4 | R | |
| 8 | Fades, wipes, zoom, border colour and the earthquake shake | 2, 4, 7 | R | |
| 9 | Animations: `.anm` playback and animated tiles | 2, 3, 4, 8, **3.13** | R | |
| 10 | Board world model: instantiation, layer isolation, ambient, `disableSaving` | 2, 4 | W | |
| 11 | Camera and viewport | 10 | W | |
| 12 | The engine: `createEngine`, the phase list and the world loop | 2, 4, 5, 6, 7, 8, 9, 10, 11, **3.2**, **3.7**, **3.9** | W | |
| 13 | Lifecycle: the startup sequence and `send` | 12, **3.3**, **3.8**, **3.9**, **3.25** | W | |
| 14 | Runtime board edits and redraw | 13 | W | |
| 15 | The VM-facing engine: breakpoints, focus pause and board data | 12, 13, 14, **3.9**, **3.12** | B | |
| 16 | Modal widgets, cursor maps and the message-box wait | 6, 7, 12, 15, **3.9** | B | |
| 17 | Rendering built-ins register with the VM | 14, 15, 16, **3.3**, **3.21**, **3.22**, **3.25** | B | |
| 18 | The golden corpus: 2D, both iso modes and the cache-flush replay | 17 | R | yes |
| 19 | Refactor sweep | 1–18 | | |
| 20 | *(offered)* End-to-end render suite | 18, 19 | | |

Bold `after` ids are other epics' entries: `3.2` the `GameState` shell and `core/time`, `3.3` the built-in registry assembly, `3.7` the harness report change, `3.8` program loading, `3.9` the thread kinds, phase handlers and resumable step, `3.12` the virtual-variable port, `3.13` `core/time`'s `frameAt` and conversions, `3.21` and `3.22` the generic and mixed-command stubs, `3.25` the plugin manifest, `3.26` the tick rename; `2.18` the amended board-reader rules, `2.22` the iso and detail-2/4/6 fixtures.

**Entry count and justification.** 18 build entries (+ sweep + offered suite). Above the typical band, deliberately: 30 E-ids across two capabilities, and one entry per requirement cluster on the render side. The honest way lower is D8's split, not merging entries; the honest way to parallelise more is D3's alternative.

**Tracer bullet** — entry 1, the thinnest path through every layer this epic touches: a fetched sample board → `composeBoard` → `core/raster` → a PNG golden through the harness, driven by a board test host that entry 12's `createEngine` later supersedes. It creates the shared helpers (PNG writer, the load-compose-raster-hash helper, the `composeBoard` signature) and freezes the first golden reference.

**Critical path** — `1 → 2 → 3 → 4 → {5, 6, 7, 10} → {8, 11} → 9 → 12 → 13 → 14 → 15 → 16 → 17 → 18`. Epics 5, 6, 8 and 9 wait on this epic's world model and draw lists, so entries 10 and 18 are the two results to watch.

## 4. `after` wiring to other epics

| Provider | Entries that name it | Why |
|---|---|---|
| `1.7` sample-game fixture fetch | 1 | the sample board, tileset and images |
| `1.8` contract types, canonical form and hashes | 1 | `DrawList`, `hashDrawList` and the state hash the goldens compare |
| `1.9` runner-harness driver and golden job | 1 | `goldenJob(engineFactory)`, the run log and the batching invariance check |
| `2.2` tileset reader | 1 | `.tst` tiles and the transparent key |
| `2.3` texture decoders PNG and JPEG | 1 | decoded RGBA for board images |
| `2.5` board reader | 1 | the `Board` model everything renders |
| `2.9` main game file and project layout | 1 | the project root (the samples ship no `.gam`, so the logical resolution comes from `RunConfig`) |
| `2.10` asset resolver | 1 | asset keys for `TexRef` |
| `2.13` AssetDecoder registry | 1 | the seam the renderer decodes through |
| `2.18` amended boards/actors rules in the readers | 3 | the iso-detection rule (`(coordType & 1) \|\| (coordType & 2)`) |
| `2.22` fixtures for the untested paths | 3 | iso, detail-2/4/6 and palette tilesets, since the corpus has none |
| `3.2` `GameState` shell and `core/time` | 9, 12 | `frameAt` for animated tiles and animations, and the shell the engine composes |
| `3.3` built-in registry assembly | 13, 17 | the startup and enter programs, and this epic's built-ins |
| `3.7` harness report change | 12 | a report may carry the asset requests the engine emits |
| `3.8` modules: includes, redirects, program cache | 13 | the startup and enter programs load `.prg` through the resolver |
| `3.9` thread kinds, phase handlers, resumable step | 12, 13, 15, 16 | running programs and threads, and the `render.msgbox` wait |
| `3.13` `core/time`: `frameAt`, `secondsToSteps`, `fpsToSteps` | 9 | frame selection for animated tiles and animations (AD-2) |
| `3.12` virtual-variable port | 15 | `constant[i]`, `boardTitle[i]` and named constants |
| `3.21` generic command stubs, `3.22` mixed-command stubs | 17 | this epic's real definitions layer above both sets of stubs for the same names |
| `3.25` plugin manifest | 13, 17 | the default manifest's order and the plugin load and clear |
| `3.26` tick rename | 1 | entry 1 implements the `Engine` contract and the golden formats, which the rename changes |
| **not needed** | | `2.14` (epic 2's sweep), `2.4`/`2.6`/`2.7` (the animation and actor readers — the `Board` model already carries what this epic draws), `3.11` (the canon cost fixes; entry 12 only wires the hash into the report), epic 1's other entries |

Epic 4's initiative-level `after` lines (epics 1, 2 and 3) are now pinned per entry. The method says to replace those epic-level lines with the specific entries; `tickets.py status` is clean either way, so that edit is yours (one line each in `initiative-rpgtoolkit-reawakened/tickets.toml`, and epics 5–9 carry the same style of line pointing at epic 4 — those can now point at entries 10 and 18).

## 5. Why nobody is blocked

**The single gate at the front is epic rpgcode-vm entry `3.26`, the tick rename.** Entry 1 implements the `Engine` contract and the golden formats, and 3.26 renames both, so 4.1 waits for it. 3.26 is `planned` and startable today, as is 3.1. **Start 3.1 and 3.26 first and the whole render lane opens.**

**Then, in order and without any VM work:** 1 (tracer) → 2 (rasteriser) → 3 (tiles and iso geometry) → 4 (compositor), after which 5, 6, 7 and 10 run concurrently, then 8 and 11, then 9. That is entries 1–11 — the whole render lane plus the world model and camera, which is exactly what epics 5, 6, 8 and 9 are waiting for — with no entry needing the RPGCode VM, the `GameState` shell or any epic-3 code except 3.26 at the very front.

**Gated on epic 3, and on what:**

| Epic 4 entry | Waits on | Which opens when |
|---|---|---|
| 9 animations | `3.13` (`frameAt`) | epic 3's maths and flow built-ins |
| 12 engine | `3.2`, `3.7`, `3.9` | epic 3's tracer, errors, threads |
| 13 lifecycle | `3.3`, `3.8`, `3.9`, `3.25` | registry, modules, threads, manifest |
| 15 VM-facing engine | `3.9`, `3.12` | threads and waits, pure built-ins |
| 16 widgets | `3.9`, and 15 for the shared `core/engine` assembly | threads and waits |
| 17 built-ins | `3.3`, `3.21`, `3.22`, `3.25` | registry, stub catalogue, manifest |

So the epic's far half is gated on entries that are themselves early and startable in epic 3 — nothing here waits for epic 3 to finish.

**Rendering built-ins and the VM:** entry 17 is the only place a script drives this epic's work, and it is the last build entry before the corpus. Everything the render lane does is exercised through the harness and the compositor directly, so no entry is blocked on the VM to be *verifiable*.

**Two collisions the check raised, resolved:**

- Entries 5, 6, 7, 10 and the rest of the render lane all add one export line to `packages/core/src/index.ts` and their own module to `core/raster` or `core/render`. Entry 2 owns `core/raster`'s public entry and entry 4 owns `core/render`'s; each later entry adds its own module file and one export line; the refactor sweep reconciles the barrel. This is the same partition epic rpgcode-vm's approved breakdown uses for `VmState` and `Frame` (`epic-rpgcode-vm/tickets.toml:126`), and the alternative — serialising five entries — costs far more than it buys.
- The board test host (entry 1) does not grow per entry: it drives `composeBoard`, which is the only thing that changes, and it stays out of the harness's pinned public surface (`packages/runner-harness/test/surface.test.ts`), so no required check changes.

## 6. Result of the set and dependency checks

The method requires the Set and Dependencies checks on a draft before you are asked to approve it. The Dependencies walk was run while drafting; an independent reviewer subagent then ran the **Set**, **Dependencies** and **Ticket** checks. Both rounds changed the draft.

**Mechanical (`tickets.py status` on this folder):** no cycle, no `undeclared_after`, no `order_conflict`, no `problems`; the only `unpinned_after` is pre-existing on `epic-legacy-formats` (epic 2's initiative-level `after` on epic 1) and is not this draft's. `tickets.py next` lists no epic-4 entry as ready yet, because 4.1 waits on 3.26; mark 3.26 done and 4.1 becomes ready.

**What the check changed** (each was a real gap, not a style point):

1. **The iso, parallax and lighting goldens had no fixtures.** The sample boards are all 2D with no images, lights or ambient, and no `.iso` or detail-2/4/6 tileset ships. Entries 3 and 18 now pin `2.18` and `2.22`, and their `verify` says the fixture boards carry the iso, parallax and lighting cases. (D15/A15)
2. **Animated tiles had no `.tan` reader anywhere.** Entry 9 now owns the 3.5 reader as a marked boundary exception, with the alternative recorded. (D12/A12)
3. **Three entries wrote sections another epic owns and this epic does not wait on** (`sprites`, `triggers`, `input`), which is circular — epic movement-triggers waits on this epic. Entries 10, 13 and 16 now reach those sections through epic 5's ports with test implementations standing in. (D13/A13) Entry 10 places the declared items and sprites through that port and never writes the section itself; the compositor draws through a view.
4. **E-01 had no entry.** Entry 12 now names it (the single-program test mode; discovery and the picker are epic 2's and epic 9's).
5. **E-62 and E-54's GIF were dropped silently.** Both are now recorded, `playAvi`/`playAviSmall` are handed to epic audio-synth by the catalogue, and the GIF assumption is written down. (D5/A5, D6/A6)
6. **Entry 13 needed the script phase handlers before the VM-facing entry registered them.** Entry 12 now calls epic 3's `waits` and `threads` handlers directly (and gains `3.9`); entry 15 is only the breakpoint hook, the focus pause and the board data, and no longer depends on 13.
7. **The phase list had no single owner while five entries advanced per tick before it existed.** Entry 12 owns the phase list and calls each module's per-tick function; entries 6, 8, 9 and 11 now say so and test their functions with an explicit tick.
8. **Camera shake and ambient each had two writers.** The catalogue gives `earthquake` to `fx` and AD-33 gives `cameraShake()` to camera, so entry 8 keeps the fx shake and entry 11 the script call (see the second round); the `world` ambient state moved out of entry 5 into entry 10, leaving entry 5 the arithmetic alone.
9. **Entry 17 contradicted epic 3 entry 3.3's ruling** (later layer wins with a `command.overridden` warning, not duplicate rejection). Entry 17's verify now states the ruling.
10. **Several `verify` lines assumed a snapshot and restore path that does not exist.** The render-lane entries now verify by re-run determinism from the same state and tick, entry 7 by a `canon` round-trip of the stored bitmap, and entry 15 by the cursor being readable by the next `advance`; restoring a paused engine across a save is epic menu-party-save's check, recorded as a handoff.
11. **Two owners for the PNG writer, and for `hashState`'s cost work.** Entry 1 adds the writer, entry 2 owns its public entry; the cost fixes are epic 3 entry 3.11's and entry 12 only wires the hash into the report.
12. **Names this epic claimed are other epics'**, per the command catalogue: `setButton`/`checkButton`/`clearButtons` are epic 5's, `dirSav` and `reset` are epic 8's, and `cursorMapRun`'s wait is `input.key`. Entries 16 and 17 no longer claim them, and the `reset` conflict is recorded as a Source conflict. (D14/A14)
13. **Uncovered E-details added**: E-05's board-vector and tile-grid overlays, E-14's legacy tile-type change, E-15's named-constant substitution and `setConstants`, E-55's `<var>` splicing, E-56's canvases.
14. **The golden references now name their reviewers**: entries 3 and 18 are `hitl`, so new modes do not freeze goldens unreviewed.

**Second round, 2026-10-12.** A re-check of the revised draft found a wrong provider pin and four incomplete fixes, all now applied:

- **`frameAt` is epic 3 entry `3.13`'s, not `3.2`'s** (its own plan says the conversions arrive with `delay`/`getTickCount`). Entry 9 now pins `3.13`.
- **Entry `2.22` supplies tilesets, not boards.** Entries 3 and 18 now say entry 3 authors the iso, parallax and lighting fixture boards as `Board` models in its own fixtures, drawing 2.22's tilesets.
- **`cueId` had no provider.** Entries 8, 9 and 13 now emit cues through the audio port with epic audio-synth's counter and section standing behind a test implementation (A13).
- **The earthquake shake belongs to `fx`**, per format-spec 9.11 and the catalogue, while AD-33's `cameraShake` is camera state; entry 8 delivers the fx half and entry 11 the script call, with the conflict recorded.
- **Two new collisions** from dropping 15's dependency on 13: entries 13/15 and 14/15 share `core/engine` and `core/world`. `14` and `13` are now in entry 15's `after`, and entries 14 (→13) and 16 (→15) state that their ordering is for the shared module surface, not for a value they consume.
- **Entry 10's `verify` named entry 5's tint** with no path between them; the tint clause is gone and entry 5 stands alone.
- Entry 17 pins `3.21` as well as `3.22`, since both stub names this epic owns; entry 1 no longer edits `job.ts` (the golden job already takes an `engineFactory`).

**Rejected as scope changes, left to you:** D3 (epic 3 owns the shell), D8 (the one-epic split), D9 (widgets), D10 (overlays), D14 (`reset`) — each is a real fork the draft resolves one way and the table in §2 argues about.

## 7. Deferred scope, named explicitly

- **AVI video (E-62)** — epic audio-synth's, pending the spec's transcode-or-drop question.
- **Animated GIF and the other image kinds** — out of v1 under A5; epic 2 entry 2.19 is the doc amendment that rules on them.
- **The WebGL2 replayer** — epic web-runner-packaging; AD-3's CPU-vs-WebGL2 conformance fixtures live there.
- **Sprite movement, pathfinding, triggers and the `core/sprites` / `core/input` / `core/triggers` sections** — epic movement-triggers.
- **Music and sound realisation, and the `audio` section's `cueId` counter** — epic audio-synth.
- **The `reset` built-in and the cross-section clear** — epic menu-party-save (D14).
- **Pixel parity for 2D tiles projected on iso boards and the legacy scroll cache** — non-goals in the spec; entry 3's projection is an approximation and says so.
- **The distribution package, the command-line dump and every editor view** — other epics; `composeBoard` and `viewBrd` are the seams they use.
- **The title-bar FPS display (E-05)** — the runner's, with E-05's sprite-vector and path overlays in epic 5.

## 8. What this means for how the epic is built

With `bmad-build`, each entry is refined during the build, so nothing here needs full acceptance criteria. With `bmad-build-auto` or a loop, **4.1 is the only startable ticket, and it waits on epic 3's `3.26`** — so the sequence to run is 3.1 (epic 3's doc-first rulings) and 3.26 first, then 4.1. The two places a person is required before entry 12 are entry 1's plan checkpoint and golden review, and entry 6's font ruling.
