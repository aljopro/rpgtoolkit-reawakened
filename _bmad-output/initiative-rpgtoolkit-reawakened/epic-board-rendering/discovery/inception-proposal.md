---
type: discovery
title: "Inception proposal: epic board-rendering (epic 4)"
date: 2026-10-16
baseline_revision: 76aaf0f9
---

# Inception proposal: boards render through draw lists in 2D and both iso modes

The owner approved inception of epic 4 on 2026-10-16 and asked for uninterrupted progress except for genuine owner decisions. This document restates the scope, records every choice made for the owner as a decision or an assumption, gives the breakdown and the cross-epic wiring, and records each validation round. The raw audit behind it is `render-readiness.md` (findings F-nn). The breakdown is `../tickets.toml`; build order is table order. Ids 1 to 28 are the first draft's; entries 29, 30 and 31 came from the first independent review and stand earlier in the table than their ids suggest (the earlier eleven-slice outline the owner approved is kept as the shape; slices were split where size or dependency demanded, never narrowed).

## 1. Scope restatement

Epic 4 (CAP-2 and CAP-6) delivers, in `core`: the engine loop (`createEngine`, phases, input section, focus pause, breakpoints, boot, `send`, reset, quit); the world model for 2D and both iso layouts; the camera (tracking, deadzone, centring, scripted pans); the compositor `composeBoard` with shading, ambient, lights, parallax, animated tiles, sprites in strict order, `under` vectors and iso drawing; the reference rasteriser and persistent surfaces; text layout, glyphs and fonts; the message window, modal prompts, cursor maps and the mouse cursor; transitions and script animations; canvases and every drawing built-in. All 92 catalogue names the catalogue assigns to this epic, the lifecycle names docs/spec assigns to it, and the camera additions register through the VM's plugin registry.

Not in scope: sprite movement, triggers, input bindings (epic 5); the WebGL2 replayer, runners, packaging (epic 9); audio cues and the `audio` section (epic 6); battle and menus (epics 7, 8); the editor program test mode (R-60, editor epics); pixel parity for 2D tiles on iso boards and the legacy scroll cache (non-goals in the envelope).

**Approved scope and where each part lives:** startup, `send` (20); reset, quit and lifecycle names (31); scene and camera (10, 16, 18); engine debug and focus (19, 30); complete script built-ins (11, 12, 16, 20, 21 to 25, 31: 92 names, 8 virtual variables, 5 camera additions, 8 lifecycle names); surfaces (7, 24); oracle and fixtures (4, 17, 26, 28).

## 2. Decisions and assumptions

The Notes of the envelope carry the dated lines (A-1 to A-14). "Decided" rows are the owner's own rulings of 2026-10-16.

| ID | Item | Taken | Status | If ruled otherwise |
|---|---|---|---|---|
| D-0a | R-55 | Fixed: strict layer, screen-space y, `drawId` order; last mover no longer on top | **Decided** | n/a; entry 15 implements, 1 writes it down |
| D-0b | R-15, R-01, R-06, 60 Hz tick distinct from presentation | As the owner settled | **Decided** | n/a |
| D-0c | Fonts | Vetted permissive library, none selected | **Decided** (strategy) | the choice is entry 3's output |
| D-0d | Oracles | Independent renders are seeds and regression oracles, not parity proof; ledger classes; screenshots not prohibited, none assumed | **Decided** | n/a |
| D-1 | `FontRef` lacks size and style (F-03) | Amend AD-15: `FontRef { asset, size, bold, italic }`, underline as a `line` | A-1, **owner to confirm** | Packing size into glyph ids hides data from hashes and runners; either way `golden/hash-vectors.json` changes once |
| D-2 | R-15 scope | Only under a non-zero tint (F-15e) | A-2 | Always-on changes every unshaded white and black pixel |
| D-3 | Lifecycle ownership | This epic registers `reset`, `mainFile`, `win`, `gone`, `over`; `start` stays with epic 3 (F-13) | A-3 | If the catalogue JSON wins, epic 8 registers them and entry 31 keeps reset mechanics only |
| D-4 | `dos`, `windows`, `godos` | Quit aliases and an obsolete error (F-14a) | A-4 | "dropped" removes the names; a script calling them hits the unknown-name path |
| D-5 | Python reference in CI | Not run in CI; `--check` compares decoded RGBA locally (F-16f) | A-5 | Running it needs Python and Pillow pinned in CI |
| D-6 | Camera defaults and centring | Deadzone 0, smoothing 0, `center-if-small` for every board | A-6 | Top-left placement of small boards is a one-line default; one scene changes |
| D-7 | Presentation `alpha` | Interpolates camera and sprite positions; state never depends on it | A-7 | "Accepted and ignored" is smaller: remove `prev` from `SpriteDraw` |
| D-8 | Clip and alpha fill | None added; span blits and `colourSurface` (F-04) | A-8 | A `clip` command or alpha `fill` is an AD-3 amendment and a conformance-vector change for epic 9 |
| D-9 | TK2 `.fnt` use | `.fnt` when the name resolves to one or the project is TK2 | A-9 | TK2 games draw text with a TrueType substitute |
| D-10 | Unspecified rows (F-15a to F-15d) | Reawakened defaults, marked unverified; extraction questions prepared (entry 2); nobody waits | A-10 | Waiting would block entries 13, 21, 22, 25 on a human round trip |
| D-11 | `input` section | Entry 19 builds `core/input` and the raw-event half; epic 5 extends | A-11 | If epic 5 must own it whole, 21 and 25 wait on epic 5, which is circular (5 waits on 4) |
| D-12 | Breakpoints | Engine single-steps with `stepThread` budget 1 while breakpoints exist; cursor ruled in entry 1, built in 30 | Decision | A pre-instruction hook in `core/script` is faster but reopens a done epic |
| D-13 | Entry count | 31 in one epic | Decision | Split after entry 31 (core vs presentation) |
| D-14 | Closing suite | Offered and included (28), after the sweep | Decision | Declining removes 28 and the corpus boot check |
| D-15 | Audio cues (F-20) | `audio` effect records; epic 6 turns them into cues and now lists epic 4 in its `after` | A-12 | Building `GameState.audio` here moves epic 6's section into this epic |
| D-16 | Effect dispatch (F-18) | One bus, `postEffect`, entry 11: appliers run at once in post order; built-ins reach it through one VM hook, phases post directly; `vm.effects` stays a bounded audit log; unowned records wait in a bounded per-section pending queue with a dropped counter | A-13 | Draining per tick leaves `put` then `getBoardTile` stale and can evict records; an unbounded queue grows without limit before epics 5, 6 and 8 land |
| D-17 | Wait access to state and key consumption (F-19) | AD-9 `WaitView` becomes a read-only state view; a key wait stores the input sequence at park, the engine claims the lowest key at or after it and the input owner prunes | A-14 | A read-only poll alone delivers one key to several waiters and again on later ticks; writing the key into `vm` breaks AD-10 |
| D-18 | Reset (F-21) | Ruled section by section in entry 29; checked per named section | Decision | "Equals a fresh boot" contradicts E-06, which does not reset `time` or `rng` |
| D-19 | Legacy-screenshot goldens | Reported with a stated metric, never gating | Decision (entry 1 writes the metric) | An exact compare fails by design while defaults are unverified |

## 3. Genuine unresolved decisions (owner), with recommendations

1. **D-1, the `FontRef` amendment.** The fixed AD-3/AD-15 schema cannot express font size or bold and italic, which scripts set (79 `fontsize` calls in the corpus alone). *Recommend:* amend AD-15 now in entry 1 (`size`, `bold`, `italic`). It touches one type and one hash-vector file and no runner exists yet.
2. **Default-font licence (inside entry 3).** Arimo, Cousine and Tinos (metric-compatible with Arial, Courier New and Times New Roman, the names the corpus asks for) publish Apache-2.0 and OFL-1.1 files side by side upstream. Blue Oak rates Apache-2.0 Gold; OFL-1.1 is not on the list the licence gate uses [INFERENCE, to re-check in the spike]. *Recommend:* use them only if the Apache-2.0 text is the one that governs the files shipped; otherwise ask for an ADR 0003 amendment that admits OFL for font assets, or pick CC0 fonts.
3. **Whether to relay the extraction questions (entry 2).** Fade and wipe types, message-window geometry, light falloff are unknowable from the documents we have (F-15). *Recommend:* relay the list as round 7; meanwhile the unverified defaults let work proceed.
4. **Camera centring default (A-6).** No page we have says the legacy engine centres small boards. *Recommend:* keep `center-if-small` as AD-33 and Done-when 1 say; it is a default, not a format change.
5. **Entry count and split (D-13).** *Recommend:* keep one epic; the shared seams are the cost of a split, not its saving.

Everything else in section 2 is an assumption with a recommended default; none blocks a build.

## 4. Breakdown

Table order is build order. `type` is `story` except entry 3 (`spike`). `hitl` is true for entries 1, 2, 3 and 29. Prerequisites show siblings by number and other epics as `epic.entry`.

| # | Title | after | Risk | Lane | Check (abridged) |
|---|---|---|---|---|---|
| 1 | Core rendering rulings | 1.14, 2.23, 3.27 | medium | docs | only docs, spine, catalogue JSON; person approves |
| 29 | Presentation, lifecycle and audio-cue rulings | 1 | medium | docs | only docs and catalogue JSON; person approves |
| 2 | Extraction questions | 1, 29 | low | docs | numbered list; `pnpm provenance`; owner relays or declines |
| 3 | Font strategy spike | 1, 1.5 | medium | docs | verdict with evidence incl. static census; fonts licensed |
| 4 | Reference oracle for 2D boards (producer, scene schema, ledger) | 1, 2.22, 2.26 | medium | fixtures | `--check`; S-01 equals `board.png` outside marker; ledger |
| 5 | **Tracer bullet** | 4, 1.8, 1.9, 2.2, 2.5, 2.10, 2.13, 3.2 | high | core | `pnpm golden` S-01 through the real engine; Bun lane |
| 6 | Reference rasteriser and conformance vectors | 5 | medium | raster | per-command vectors; formulas hand-checked |
| 7 | Surfaces, rev, colour surfaces, read-back | 6 | medium | raster | cache-flush replay; snapshot; `colourSurface` |
| 8 | Text layout, bitmap fonts, `text` command | 1, 3, 6, 16.7 | medium | text | layout and pixels baselines; text vectors; `BASE.FNT` |
| 9 | TrueType glyphs | 3, 8 | high | text | pangram baseline; metric vectors; Node and Bun match; wrapper lint |
| 10 | World model | 1, 5, 2.8, 2.16, 16.4, 16.7 | high | world | hydrate and round trip; `frameAt`; compaction; TK2 boards |
| 11 | Built-in packs seam and effect-apply hook | 1, 5, 3.3, 3.21, 3.22, 3.25, 3.27 | medium | packs | same-turn read-after-write; 300 calls lose nothing; ownership test |
| 19 | Engine loop, input section, waits, focus, alpha | 5, 10, 11, 3.9, 3.11, 3.26 | high | engine | batching and latency invariance; key wait; focus; program runs |
| 30 | Breakpoints and resume | 19 | high | engine | stop, resume hash, never-hit equals none |
| 12 | Board edit built-ins and virtual variables | 10, 11, 19 | medium | packs | program edits board, same-turn reads; 21 names real |
| 13 | Shading, ambient and lights | 1, 4, 6, 10, 2.8 | medium | compose | ledger scenes exact; tint lint rule |
| 14 | `composeBoard` for 2D boards | 4, 6, 10, 13, 2.3, 2.25, 16.7, 16.11 | high | compose | ledger 2D scenes and S-01b exact; `drawList` equals `composeBoard` |
| 15 | Sprites in the compositor | 14, 2.4, 2.6 | high | compose | sprite scenes exact; R-55 check |
| 16 | Camera and camera built-ins | 1, 4, 10, 11, 14, 19 | medium | world | Node and Bun identical; centring; clamp |
| 17 | Reference oracle for iso boards (producer) | 1, 4 | low | fixtures | both iso scenes regenerate; `grass.iso` equals spec render |
| 18 | Isometric drawing | 15, 16, 17 | high | compose | both iso scenes exact; conversion round trip |
| 20 | Boot and send | 8, 12, 16, 19, 29, 2.9, 2.10, 3.25 | high | engine | boot hash; music effect record; send state; doubles named |
| 31 | Reset, quit, lifecycle names, reset seam | 20, 29 | medium | engine | per-section reset; quit request; 8 names real |
| 21 | Message window and modal prompts | 7, 10, 11, 14, 19, 29, 31, 3.9 | medium | ui | baselines; wait restores; reset clears; 27 names real |
| 22 | Transitions and effects | 7, 11, 14, 16, 19, 29, 31 | medium | fx | per-tick tables; restore mid-effect; 6 names real |
| 23 | Script animations, audio effect records | 22, 2.4, 16.12 | medium | fx | frame at tick; GIF reading; audio records; restore |
| 24 | Canvases, drawing, screen save, `viewBrd` | 7, 8, 11, 14, 18, 19, 29, 31 | medium | surfaces | primitives, read-back, preview 2D and iso; 27 names real |
| 25 | Cursor maps, mouse cursor, overlay, debug overlays | 9, 11, 19, 21, 24, 29, 31 | low | ui | cursor last; overlay order; 6 names real |
| 26 | Golden scenes and replay gates | 18, 20 to 25, 30, 31 | high | gates | all scenes; Node and Bun; cache flush; Worker contract; ledger check |
| 27 | Refactor sweep | 1 to 26, 29 to 31 | low | sweep | no stub left; gates pass; no behaviour change |
| 28 | Closing suite: sample games boot and render | 27, 1.7, 2.11, 3.15, 16.4, 16.8, 16.9 | medium | gates | baselines for 8 games; fails on drift |

### Tracer bullet and what can be seen

Entry 5: `pnpm golden` rasterises the village board of `docs/spec/examples` in S-01's pinned view (shading, images and sprites off, viewport equal to the 512×384 board, camera 0,0, tick 0) through the real engine and the PNG equals the independent render. It touches every layer (engine with an input phase for asset replies, asset loop, world, compositor, rasteriser, harness, Bun lane). The stories the owner is least sure of are entry 9 (TrueType) and, behind it, entries 13, 21 and 22 where docs/spec is silent; they carry plan checkpoints or unverified-default rulings.

### Oracle and fixture ownership

| Scene family | Producer | Consumers | Class |
|---|---|---|---|
| S-01 (village tiles, pinned view), 2D tiles, key colour, animated tiles at ticks, `.tan` and `.tbm` cells, layer images (normal, parallax, stretch), translucent and additive blits | 4 | 5, 14 | independent-reference |
| S-01b (full pipeline without sprites), S-01c (adds the item sprite), S-01d (main-file viewport with centring) | 4 | 14 (S-01b), 15 (S-01c), 16 (S-01d), 26 | independent-reference of Reawakened rules where docs/spec is silent |
| shade layers, ambient, lights | 4 (rules from entry 1) | 13 | independent-reference of a Reawakened rule; legacy parity unverified |
| sprites in layer and y order, `under` vector per flag, 2×2 `.tbm` frame | 4 | 15 | independent-reference |
| camera views, small board | 4 | 16 | independent-reference |
| iso stacked, iso rotated, 2D tile on iso, iso sprite order, iso camera clamp | 17 | 18 | independent-reference (the `iso2d` projection is a Reawakened rule) |
| text, message window, cursor, overlay | none (no independent rasteriser matches ours) | 8, 9, 21, 25 | regression-baseline; metric vectors in entries 8 and 9 |
| transitions, animations | none; arithmetic tables in the entries | 22, 23 | regression-baseline |
| sample-game first board and a later frame | 28 | 28 | regression-baseline (owner may add legacy-screenshot, reported, non-gating) |
| rasteriser per-command vectors | 6 (text vectors 8, 9) | 6, epic 9 | hand-checked table |

The scene description (JSON schema) is defined by entry 4 and consumed by 13, 15, 16 and 17. The ledger (entry 4 creates it with a gating flag per golden; 17, 26 and 28 extend it; 26 checks it) is the one place that says which golden is which.

## 5. Cross-epic `after` wiring

| This epic's entries | Provider pins | Initiative `[[epic]]` needs |
|---|---|---|
| 3 | 1.5 (licence gate) | epic 1 |
| 5, 28 | 1.7, 1.8, 1.9 | epic 1 |
| 1 | 1.14 | epic 1 |
| 4 | 2.22, 2.26 | epic 2 |
| 5, 10, 13, 14, 15, 20, 28 | 2.2, 2.3, 2.4, 2.5, 2.6, 2.8, 2.9, 2.10, 2.11, 2.13, 2.16, 2.25 | epic 2 |
| 1 | 2.23, 3.27 | epics 2, 3 |
| 5, 11, 19, 20, 21, 28 | 3.2, 3.3, 3.9, 3.11, 3.15, 3.21, 3.22, 3.25, 3.26 | epic 3 |
| 8, 10, 14, 23, 28 | 16.4, 16.7, 16.8, 16.9, 16.11, 16.12 | epic 16 |
| epic 6 (provider is this epic) | 4.20, 4.23 `audio` effects through `postEffect` (4.11) | `{ epic = 4 }` added to epic 6's `after` |
| epic 10 (provider is this epic) | 4.30 breakpoints, cursor, `continue` and `step` | `{ epic = 4 }` added to epic 10's `after` |

`tickets.py status` reports no `undeclared_after`, `unpinned_after` or `order_conflict`. Downstream (Notes only): epic 5 supplies sprites, targets, input extensions, the `gone` effect and registers into the reset seam; epic 8 keeps `dirSav`, `Load()` and the saved-game and presence ports; epic 9 replays entry 6's vectors (and 8, 9's text vectors) and entry 26's draw lists; epic 6 registers the `audio` applier and turns audio effects into cues; epic 10 builds step over, in and out from entry 30's `step`. Each has a dated handoff line in its envelope.

## 6. Parallelism

- Wave 1 (docs and research): 1 first; then 29 and 3 together; then 2 and 4. No shared files: entry 29 and entry 1 both write docs/spec, so 29 waits on 1.
- Entry 5, the tracer, follows alone.
- Then lanes, each with its own files: raster and text (6, then 7; 8, then 9); world, packs and engine (10, 11, then 19 and 30; 12); compositor (13, then 14, 15; 17 is parallel fixtures; 18 after 16 and 17); camera (16); boot and reset (20, 31); presentation (21, 22, 23, 24, 25) after 31.
- Shared seams and owners: `save/sections.ts` (5), effect-apply hook and pack command modules (11), `composeBoard` (14, 15, 18 in order), `core/engine` (5, 19, 30, 20, 31 in order), the reset seam (31), the `fx` section (22 then 23), the `ui` section (21 then 25).
- Deferred scope: none from the approved scope. Parked on purpose: the editor program test mode (R-60, editor epics) and anything the extraction round (entry 2) may later change, which is a doc-first amendment and a deliberate golden change.

## 7. Validation record

**Round 0 (author, 2026-10-16).** Walked the Dependencies section by hand. Fixes: the tracer owns the PNG encoder and the asset loop; `.tan`, `.tbm`, texture and BMP decoder pins added to entries 10 and 14; entry 19 owns the raw-event half of `input`; epic 16 added to the initiative `after`. `tickets.py status` and `next` ran clean.

**Round 1 (independent reviewer ReviewEpic4, 2026-10-16): 25 findings (5 P1, 17 P2, 3 P3); verdict not ready.** I re-read the cited lines for each before accepting it (F-18 to F-25 in the audit); all were substantiated. Resolution:

| # | Finding | Resolution |
|---|---|---|
| 1 | S-01 cannot equal `board.png` once the full pipeline runs | S-01 pinned to a view; S-01b is the full pipeline (entries 4, 5, 14) |
| 2 | No owner or timing for effect application; 12, 16, 24 lacked 19 | Ruled in entry 1; hook owned by entry 11; entries 12, 16, 24 wait on 19 and 19 on 11 |
| 3 | Waits cannot see `input` or `ui` state | AD-9 `WaitView` amended in entry 1; implemented in entry 19; 21 and 25 poll through it |
| 4 | Audio cues before the audio section exists | `audio` effect records (A-12); epic 6 handoff note and `after` |
| 5 | Boot depends on later sections; reset verify cannot hold | Entry 29 rules reset per section and names the ports; entry 20 uses doubles; entry 31 owns the reset seam; verify checks named sections |
| 6 | Colour surface has no prerequisite and wrong owner | `colourSurface` in entry 7; 21 and 22 wait on 7; A-8 reworded |
| 7 | Fonts decided in two entries that both edit AD-15 | Entry 1 rules shape and substitution; entry 3 owns font files and licences and waits on 1; entry 8 waits on 3 |
| 8 | Library vetting covers executed paths only | Static census added to entry 3; wrapper lint in entry 9 |
| 9 | TrueType metrics unruled | In entry 1; metric vectors in entry 9 |
| 10 | Nobody produces text vectors | Entries 8 and 9 export them; epic 9 handoff updated |
| 11 | Entry 4 lacks scenes and a schema | Scenes and the scene description added to entry 4; 13, 15, 16, 17 consume it |
| 12 | `SpriteDraw` key underspecified | `id` and `key`, `drawId` rule and iso y ruled in entry 1; epic 5 note updated |
| 13 | Breakpoint and resume contract unpinned | AD-1 amendment in entry 1; entry 30 split out with a never-hit check |
| 14 | Amend list incomplete | AD-1, AD-8, AD-9, AD-10, AD-29 added to entry 1 |
| 15 | Section modules assigned to the wrong owners | AD-10 owner modules; entry 19 builds `core/input`; entry 5 corrects stale comments |
| 16 | Tracer has no input phase | Minimal `input` phase added to entry 5 |
| 17 | `virtuals.ts` already guesses the world shape | Entries 12 and 24 replace the reads and name the file |
| 18 | Bun has no owner | Entry 5 adds a pinned Bun lane |
| 19 | Done-when and Outcome contradict the oracle decision | Envelope reworded |
| 20 | Legacy-screenshot rule undefined | Reported, non-gating, metric ruled in entry 1; ledger gating flag |
| 21 | Entry 2 needs entry 1 | `after = [1, 29]` |
| 22 | Entry 1 too wide | Split into entries 1 and 29 |
| 23 | Pin the Python reference | `--check` compares decoded RGBA (A-5) |
| 24 | Missing provider pins | 2.8, 2.16, 16.4 (10); 2.8 (13); 3.15, 16.4, 16.8, 16.9 (28) added |
| 25 | Ticket sizes | 19 split (30 breakpoints), 20 split (31 reset and quit); 11 gives one command module per consuming entry. Entries 21 and 24 stay whole (27 mostly mechanical names each); the builder may split at plan time |

`tickets.py status` and `next` after the fixes: 31 planned, longest chain 14, no `undeclared_after`, `unpinned_after` or `order_conflict`, `next` lists entry 1 only.

**Round 2 (reviewer ReviewEpic4, 2026-10-16): 10 findings (3 P1, 6 P2, 1 P3).** Resolution:

| # | Finding | Resolution |
|---|---|---|
| 1 | Ring cap contradicts "records stay in place" | Audit log and pending queue separated: `vm.effects` is the bounded audit log; unowned records wait in a bounded per-section queue with a dropped counter; applied records leave the queue (entries 1, 11; verify covers it) |
| 2 | Phases cannot record effects | `postEffect` is the one route, owned by entry 11; entries 20 and 23 and the epic 6 note cite it |
| 3 | A read-only key poll cannot consume | Sequence-at-park, engine claim, input owner prunes (entries 1, 19; two-waiter check in 19's verify) |
| 4 | Entries 30 and 20 collide on `core/engine` | 30 added to 20's `after` |
| 5 | "One edit to `core/script`" is false | Header and entry 11 list every edit in order: 11, 19, 12, 24 |
| 6 | S-01b cannot pass at entry 14 | S-01b without sprites in the board viewport; S-01c with the item (15); S-01d main-file viewport (16) |
| 7 | Entry 21 lost entry 9 | `after` fixed: it had named 10 by mistake |
| 8 | `camera*` rows could break `catalogue:check` | Effect kind `mixed` (no stub); verify of entries 1 and 29 adds `pnpm catalogue:check` |
| 9 | No handoff to the debug adapter epic | Entry 30 adds `step`; epic 10 `after` and note |
| 10 | Who wires appliers is said twice | Entry 11 owns timing; entry 19 only registers appliers |

**Round 3 (reviewer ReviewEpic4, 2026-10-16): 6 findings (4 P2, 2 P3), all fixed; reviewer then confirmed PASS.** Fixes: entry 8 waits on 7 (raster order 6, 7, 8, 9); S-01d is sprites-off in a 640×480 viewport written into the scene description; AD-16 on entry 1's amend list; key claims kept in the `engine` section and visible within the same waits phase, with the `get`/`clearBuffer` line in epic 5's handoff; the header's `core/engine` order includes entry 11; stale entry references in render-readiness.md corrected.

Final checks: `tickets.py status` and `next` clean (31 planned, longest chain 14, no `undeclared_after`, `unpinned_after` or `order_conflict`, `next` lists entry 1 only); `pnpm typecheck`, `pnpm test` (943 passed, 0 skipped), `pnpm lint`, `pnpm provenance` and `pnpm licence` pass on the docs-only change.
