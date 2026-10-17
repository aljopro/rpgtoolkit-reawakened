---
title: 'Core rendering rulings: R-55, R-15, effects, waits, compositor, FontRef and metrics'
type: 'feature'
ticket: 1
created: '2026-10-17'
status: done
baseline_revision: '19d52630'
route: 'full'
route_source: 'pinned'
risk: 'medium'
review: 'quick'
review_source: 'pinned'
lenses_ran: []
review_loop_iteration: 0
context:
  - 'docs/guardrails.md'
  - 'docs/spec/engine/main-loop-and-startup.md'
  - 'docs/spec/engine/movement-and-collision.md'
  - 'docs/spec/engine/display-input-audio.md'
  - 'docs/spec/engine/rpgcode-functions.md'
  - 'docs/spec/engine/rpgcode-errors-and-threads.md'
  - 'docs/spec/engine/parity-checklist.md'
  - 'docs/spec/formats/board.md'
  - 'docs/spec/formats/tiles.md'
  - '_bmad-output/initiative-rpgtoolkit-reawakened/architecture-rpgtoolkit-reawakened/architecture-rpgtoolkit-reawakened.md'
  - '_bmad-output/initiative-rpgtoolkit-reawakened/epic-board-rendering/discovery/render-readiness.md'
  - '_bmad-output/initiative-rpgtoolkit-reawakened/epic-board-rendering/discovery/inception-proposal.md'
  - '_bmad-output/initiative-rpgtoolkit-reawakened/discovery/docs-spec-reconciliation.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Entries 4–28 and 30 share rendering contracts that are either only implicit in the architecture spine or are explicitly open in `docs/spec/`: the sprite order, R-15 scope, font payload and metrics, light and projection arithmetic, camera defaults, effect timing, wait visibility/consumption, and the resumable mid-tick engine cursor. Without one doc-first ruling entry, the oracle and every consumer can choose incompatible answers.

**Approach:** Amend the existing `docs/spec` behaviour/format anchors with Reawakened rule blocks, amend only the affected ADs in the architecture spine, and update the command-effect catalogue for the four camera additions. Every proposed rule below has a recommendation, evidence/provenance, logic, and a rejected alternative. This ticket is the plan checkpoint: the implementation commit changes no TypeScript, fixtures, goldens, or generated code.

## Boundaries & Constraints

**Always:** G7 docs-first clean-room work; `docs/spec/` remains normative (ADR 0007); plain-data state and explicit fixed-tick execution (G1/G3); draw-list replay only (G4); total ordering (AD-25); oracle goldens classified by their ledger rather than treated as legacy pixel proof; exact existing owner rulings are ratified rather than reopened.

**Never:** Open or copy legacy GPL source; edit `packages/**`; change a golden or fixture; select a font library (entry 3 owns that spike); decide entry 29's presentation/lifecycle/audio-cue rows; make `WaitView` mutable; make `vm.effects` the state-application mechanism; add a renderer loop or host API; silently turn an unverified default into a legacy-parity claim.

## Decision legend

- **RATIFY (OWNER):** already decided by Jensen or an accepted prior ruling; record it verbatim with its evidence and do not reopen it.
- **PROPOSE (OWNER):** docs/spec is silent or conflicting and this plan recommends a deterministic answer for the owner to approve before implementation.
- **DEFER:** the row belongs to entry 4.29 (presentation, lifecycle, and audio-cue rulings), entry 4.2 (extraction questions), or a named later provider; name that owner explicitly.

All implementation-facing judgement calls remain visibly marked `OWNER` in the eventual rule block. A recommendation is not a claim that the owner has approved it.

## Ruling matrix

### 1. Existing decisions to ratify

1. **R-55 / sprite total order — RATIFY (OWNER).** Amend `docs/spec/engine/movement-and-collision.md#e-29` and `docs/spec/formats/board.md#drawing-order-and-effects`. The total key is `(layer, screen-space y of the sprite reference point after projection, drawId)`. `drawId` is one stable integer, players before items, and each category is ordered by its index; a last-mover re-insertion never changes the key. For iso boards, `y` is the projected screen-space reference-point y, not raw board y. Evidence: the owner decision in `epic-board-rendering.md` (R-55 fixed), the conflict at E-29, E-11's bottom-centre/tile-centre reference points, and AD-25's total-order rule. Provenance is `docs/spec` plus the owner ruling, not a translation of legacy code. Logic: this gives every compositor and oracle one deterministic order and deliberately removes the legacy last-mover instability. Rejected alternative: preserve insertion order/last mover on top, which is the open conflict's historical bug and makes equal-y replay depend on movement history.

2. **R-15 scope — RATIFY (OWNER).** Amend `docs/spec/formats/tiles.md#shading` and the matching arithmetic at `docs/spec/formats/board.md#tile-shading`: replace pure white with `(245,245,245)` and pure black with `(10,10,10)` only when the blit's full pre-summed tint is non-zero; then clamp once. Zero-tint art retains exact source colours. Evidence: R-15 in `docs-spec-reconciliation.md` §A, the existing tiles rule, and assumption A-2. Logic: pre-shade exists to make shaded extremes tintable, not to alter unshaded source art. Rejected alternative: apply the replacement unconditionally, which changes every unshaded white/black pixel and violates the owner's explicit sub-rule.

3. **R-01 and R-06 — RATIFY (OWNER).** Amend `docs/spec/formats/tiles.md#dos-palette` to identify `dos-palette.json` as the adopted palette (R-01), and `docs/spec/formats/board.md#items-placed-on-the-board-sprites` to distinguish raw slot preservation from run-time compact item numbering (R-06). Evidence: reconciliation rows R-01 and R-06, the landed format work, and F-15f. Logic: this records existing behaviour that entries 4.10 and later consume; it is not a new renderer choice. Rejected alternative: re-open the palette or expose raw empty slots to scripts, which would contradict landed decisions and the corpus-facing contract.

4. **R-56 and fixed tick — RATIFY (OWNER).** Amend `docs/spec/engine/main-loop-and-startup.md#timing` with a Reawakened fixed-60-Hz rule: no frame-rate cap is observable in simulation; runners convert elapsed time into whole ticks and presentation may interpolate. Evidence: R-56, AD-2, G3, and the existing open conflict. Logic: a cap is irrelevant to the state machine once state advances only by fixed ticks, while the rule prevents a runner from reintroducing frame-rate dependence. Rejected alternative: preserve the old frame-count/cap wording as a simulation rule, which conflicts with AD-2 and makes replay hashes runner-dependent.

5. **Presentation `alpha` — RATIFY (OWNER).** Amend `docs/spec/engine/main-loop-and-startup.md#drawing-a-frame` (using a new stable sub-anchor `#reawakened-presentation-alpha`) and `docs/spec/engine/movement-and-collision.md#e-11`: `alpha` is presentation-only interpolation of camera and optional prior sprite positions; it is never stored in simulation state or included in state/draw hashes. Evidence: A-7, AD-1, AD-2, and the `SpriteDraw.prev` contract in the epic breakdown. Logic: this permits smooth display without changing deterministic simulation. Rejected alternative: ignore alpha or let it influence state, because ignoring it removes the intended interpolation and state influence breaks cross-runner replay.

6. **Legacy screenshots and golden classes — RATIFY (OWNER).** Amend `docs/spec/engine/parity-checklist.md#golden-image-oracle` (new stable anchor) to define ledger classes `independent-reference`, `legacy-screenshot`, and `regression-baseline`; a legacy screenshot is decoded and reported with the metric approved below but is never a gating check. Evidence: R-58, G5, D-0d/D-19, the independent renderer limitation in F-16b, and the oracle-policy decision in the epic. Logic: no screenshot can prove parity where the spec leaves defaults open, while retaining it as a reported comparison is useful. Rejected alternative: gate on exact screenshot bytes or discard screenshots entirely; the former turns unknown defaults into false failures, the latter loses useful owner-supplied evidence.

7. **Oracle scene schema and ledger classes — RATIFY (OWNER).** The plan for entry 4 MUST consume a new scene-schema description under `docs/spec/engine/parity-checklist.md#golden-image-oracle` and record each scene's board files, `SpriteDraw` fields, global ambient, `view` (viewport size, camera, include flags), and tick. The ledger records PNG path, class, gating flag, and producer. Evidence: D-0d, A-5, inception §4 oracle ownership, and F-16e/F-16f. Logic: producers and consumers need one plain-data schema, and the ledger is the sole authority for whether a golden gates. Rejected alternative: infer schema from fixture code or treat PNG bytes as self-describing; both violate G7 and make producer ownership opaque.

### 2. Font payload, metrics, and substitution

8. **FontRef amendment A-1 — RATIFY (OWNER).** Amend `docs/spec/engine/display-input-audio.md#fonts` (new stable sub-anchor `#reawakened-fontref-and-metrics`) and the spine AD-15: `FontRef` is `{ asset, size, bold, italic }`; underline remains a `line` command, not a FontRef field. Evidence: F-03, A-1, AD-3/AD-15 and 79 corpus `fontsize` calls. Logic: size/style must be visible in draw-list hashes and runner inputs. Rejected alternative: encode style in glyph ids or rely on runner font state, which hides inputs from hashes and violates G4.

9. **TrueType metrics — PROPOSE (OWNER).** Amend `docs/spec/engine/display-input-audio.md#reawakened-fontref-and-metrics`. For a font with `unitsPerEm`, scale each advance, kerning adjustment, ascent, descent, and line gap by `size / unitsPerEm`; round each non-negative scaled advance/kerning and the final line-height with integer `floor(value + 0.5)`; take ascent, descent and line gap from the `hhea` table only (never `OS/2` typo or win metrics, which can disagree for the same font); `ascentPx = round(ascent * size / unitsPerEm)`, `descentPx = round(-descent * size / unitsPerEm)` (hhea descent is negative) and `lineGapPx = round(lineGap * size / unitsPerEm)`, with `lineHeight = ascentPx + descentPx + lineGapPx`, so the baseline and the text rows always agree to the pixel (owner accepted this `hhea` and sum-of-rounded-parts form on 2026-10-17, replacing the earlier single rounded sum). Kerning is applied before line-wrap width decisions. Evidence: E-132's font selection and current AD-15, the corpus's font/size calls, and deterministic integer arithmetic required by G3/AD-13. Provenance is standard TrueType metric semantics plus the architecture's fixed-pixel contract; no legacy source is consulted. Logic: one-unit scaling and explicit rounding make Node/Bun output identical and make advances, kerning, and vertical metrics observable. Rejected alternative: defer rounding to a host font API or round only final strings, which lets platforms wrap and position text differently. This is a genuine owner decision because docs/spec does not settle the scale/rounding convention.

10. **Font-name substitution by family — RATIFY/CLARIFY (OWNER).** Amend the same font anchor and `docs/spec/engine/rpgcode-functions.md#message-window-text-and-fonts` (new stable sub-anchor if needed): resolve a project asset by case-insensitive family name; otherwise use bundled family substitutions `Arial`/sans-serif → Liberation Sans, `Times New Roman`/serif → Liberation Serif, and `Courier New`/monospace → Liberation Mono, with the documented fallback family. `.fnt` selection follows A-9 (when the name resolves to a `.fnt` or the project is TK2); other names use family substitution. Evidence: A-9, F-16c, E-132 and the owner’s 2026-10-17 Liberation decision. Logic: family resolution preserves the script-visible intent without platform fonts. Rejected alternative: silently use a host-installed font or route every name to `.fnt`, both of which make pixels host-dependent or break TK3. The family map is an explicit owner-facing recommendation; entry 3 still owns library and file licences.

### 3. Raster and lighting rules

11. **Ellipse integer algorithm — PROPOSE (OWNER).** Amend `docs/spec/engine/display-input-audio.md#e-17` (new `#reawakened-light-and-raster-arithmetic` sub-anchor) and `docs/spec/engine/parity-checklist.md#golden-image-oracle`. Use a midpoint ellipse over the inclusive integer bounding box: plot four-way symmetric points, update the integer decision term in the two standard regions, treat zero width/height as a point/line, and fill each produced scanline between its paired extrema. All tie decisions are integer and fixed; no `Math` trig or floating-point edge test. Evidence: AD-3's integer primitives, G3's math allowlist, the `ellipse` light node representation at `docs/spec/formats/board.md#lights`, and the entry 6 requirement for a defined integer algorithm. Logic: midpoint scanlines are portable and share the same boundary convention as the reference rasteriser. Rejected alternative: delegate ellipse rasterisation to Canvas/SVG or use floating-point parametric samples, which changes edge pixels across engines. This is a genuine owner decision on the exact algorithm/boundary convention.

12. **Light falloff — PROPOSE (OWNER; unverified Reawakened default).** Amend `docs/spec/formats/board.md#lights` and `docs/spec/engine/display-input-audio.md#e-17`: bake all three light types into shading layer 0 at load; ellipse uses normalized elliptical radius with linear endpoint falloff (`1` at centre, `0` at the radius); gradient uses clamped projection along its two nodes; clipped gradient applies the same projection only inside its polygon/clip shape; interpolate the two stored colours in fixed-point integer steps and clamp the resulting shade. The stored light layer remains ignored as documented. Evidence: F-15c, board light fields, E-17, and the independent-reference scene requirement. Provenance is the format data model plus a deliberately labelled Reawakened default; the extraction question remains in entry 4.2. Logic: linear, endpoint-normalized falloff is deterministic, intuitive, and testable without inventing a host shader. Rejected alternative: retain an unspecified curve, use a host GPU gradient, or keep a light per frame; these leave oracle and runner behaviour undefined. This is a genuine owner decision; mark the rule `unverified` until an extraction answer changes it.

13. **2D-on-iso projection — PROPOSE (OWNER; non-parity Reawakened default).** Amend `docs/spec/formats/tiles.md#isometric-tiles` (new `#reawakened-iso2d-projection` sub-anchor) and `docs/spec/engine/display-input-audio.md#e-53`: project an ordinary 32×32 source tile to the same 64×32 diamond using a fixed nearest-neighbour affine map from source-square coordinates to diamond coordinates, with transparent pixels outside the exact diamond mask; use integer floor/round rules stated beside the formula, and set `blit.iso2d` so the rasteriser/replayer uses this path. Evidence: E-13/E-53, tiles.md's statement that `.tst` tiles are rotated and squashed, the existing `iso2d` field in AD-3, and F-15d/F-16a (no corpus iso boards and pixel parity explicitly out of scope). Logic: one integer map gives both oracle and renderer a reproducible answer while acknowledging no legacy pixel claim. Rejected alternative: leave projection to a runner or claim parity from the `.iso` diamond pour; those produce engine-specific pixels and confuse two different source formats. This is a genuine owner decision and must remain an explicitly labelled unverified Reawakened rule.

14. **Under-vector flags and span blits — RATIFY (OWNER).** Amend `docs/spec/formats/board.md#vectors` and `docs/spec/engine/main-loop-and-startup.md#e-52`: flags 1, 2, and 4 mean respectively background, all lower layers, and frame-intersection trigger; for each affected row, compute polygon intersections and redraw contiguous covered spans of the promoted tile/image content over the sprite, without a new draw command or alpha clip. Evidence: board vector field 20, E-30, F-04 and A-8. Logic: span blits express the polygon without changing AD-3 and preserve per-row deterministic ordering. Rejected alternative: introduce a `clip`/mask command or alpha fill, which changes the published draw union and web-runner conformance seam.

### 4. Camera, effects, waits, and the engine cursor

15. **Camera defaults — RATIFY (OWNER).** Amend `docs/spec/engine/movement-and-collision.md#e-51` and the spine AD-33: follow the selected player by default; deadzone and smoothing default to zero; `center-if-small` is the default small-scene policy; larger scenes clamp to scene bounds; `positionAt(alpha)` interpolates only for presentation. Evidence: A-6, AD-33, E-51, and the inception done-when. Logic: direct following matches the documented legacy default while centring makes small authored scenes deterministic and avoids void borders. Rejected alternative: top-left small scenes or nonzero smoothing/deadzone defaults, which are unsupported by the available docs and change the pinned oracle.

16. **Camera built-ins and easing — PROPOSE (OWNER).** Amend `docs/spec/engine/movement-and-collision.md#e-51` and `docs/spec/engine/rpgcode-functions.md#board-tiles-vectors-and-screen-effects` (new `#reawakened-camera-built-ins`): add `cameraPanTo(x, y, duration, easing)`, `cameraFollow(entityId)`, `cameraReset()`, and `cameraShake(duration, amplitude)` as Reawakened additions; use effect kind `mixed`, so the catalogue generator emits no stubs and `pnpm catalogue:check` remains authoritative. Recommend the closed easing set `linear`, `smoothstep`, `easeIn`, `easeOut`, and `easeInOut`, represented as plain JSON names and evaluated with deterministic fixed-point/injected-tick arithmetic. `getCorner` remains the existing built-in. **Owner-ruled signatures (2026-10-17, calibration-tunable later):** `cameraShake(double duration, double amplitude)`: `duration` in seconds, `amplitude` in logical-viewport pixels; non-blocking (a script that must wait uses `delay`; concurrency is what threads are for). `durationTicks = ceil(seconds × tickRate)`, minimum one tick when the duration is positive; both `cameraShake` and `earthquake` run on one shared primitive `shake(amplitude, ticks)` with no randomness: tick `t` of a shake shows the corner offset `(±a, ±a)` for `a` = amplitude, cycling up-left, up-right, down-left, down-right, so the offset is a pure function of tick and amplitude, the RNG is never drawn (a shake cannot change `rng` or later random numbers), and the screen never moves along a single axis; intensity converts to amplitude by `amplitudeForIntensity(p) = p × PX_PER_INTENSITY` with `PX_PER_INTENSITY = 1` (legacy offsets equal the pass number in pixels), a named constant that calibration may change; a non-finite argument is an error, a negative value clamps to 0, and 0 is a no-op; a new shake replaces the active one and never stacks. `cameraPanTo`'s `duration` is likewise in seconds, converted by the same function. Evidence: AD-33's signatures, F-14b, the catalogue gap, A-6, and G3. Logic: a small named set is portable, serialisable, and sufficient for authored cutscenes. Rejected alternative: accept arbitrary callback/easing expressions or add the names as ordinary catalogue stubs, which violates G1/G3 or leaves programs silently unimplemented. The signatures are owner-approved additions; the exact easing set is a genuine owner decision.

17. **Effect dispatch bus — RATIFY core route; PROPOSE queue bound (OWNER).** Amend `docs/spec/engine/rpgcode-runtime.md#effects` (new stable `#reawakened-effect-dispatch`) and the spine AD-8/AD-10: `postEffect(section, effect)` is the only route to a section owner; VM-built-in effects reach it through a hook immediately after recording, phases post directly, and the registered applier runs synchronously in post order so same-turn reads see writes. `vm.effects` remains only a bounded audit log. Unowned effects go to a bounded per-section pending queue in `engine`, drain in order when the owner registers, and report drops diagnostically. Recommend cap 256 records per section with FIFO eviction of the oldest pending record and a monotonic dropped counter. Evidence: F-18, A-13, entry 11's 300-call acceptance, AD-8's effects contract, and the existing 256 audit-log cap. Logic: synchronous application fixes read-after-write while the separate bounded queue prevents memory growth before later epics register owners. Rejected alternative: drain only once per tick (stale reads), use one shared ring (cross-section interference), or use an unbounded queue (unbounded state). The route is owner-confirmed; cap and eviction are genuine owner decisions.

18. **WaitView and deterministic key consumption — RATIFY (OWNER).** Amend `docs/spec/engine/rpgcode-errors-and-threads.md#waits` (new `#wait-view-and-key-claims`) and the spine AD-9/AD-10: `WaitView` is a read-only view of `input` and `ui` state; an `input.key` waiter stores the input sequence at park, polling returns the lowest unclaimed key at or after it, the engine claims it in `engine` (visible to the rest of the same waits phase and never written to `input` or `vm`), and the input owner prunes claimed keys. `get` and `clearBuffer` use the same protocol. Evidence: F-19, A-14, AD-9, E-110, E-55 and the two-waiter/two-key acceptance. Logic: sequence-at-park plus an engine claim gives one deterministic consumer per key without violating section ownership. Rejected alternative: a read-only poll that does not claim (duplicate delivery) or writing the consumed key into `vm` (AD-10 violation).

19. **Open-tick cursor, resume modes, and `ticksRun` — PROPOSE (OWNER).** Amend `docs/spec/engine/main-loop-and-startup.md#e-03` (new `#reawakened-breakpoint-cursor`) and the spine AD-1: while breakpoints exist, the engine uses `stepThread` with budget 1 and stores a plain-data open-tick cursor containing the ready-thread list snapshot, current thread, and steps used. A breakpoint returns `paused { thread, frame, line }`; `continue` finishes that open tick before later ticks; `step` executes exactly one instruction and pauses again; a snapshot at the stop resumes to the uninterrupted hash. Recommend `ticksRun` counts completed simulation ticks only: a breakpoint hit before the open tick completes reports zero for that call, and the resume call reports one when it completes. Debug hooks read state only. Evidence: AD-1, F-08, the ticket 4.30 contract, the inception breakpoint decision, and G1/G3 snapshot rules. Logic: the cursor is sufficient to preserve phase order and ready-thread scheduling without a pre-instruction VM hook. Rejected alternative: mutate the VM with a debugger callback, restart the tick on resume, or count a partially executed tick as complete; each changes state/hash or makes `ticksRun` lie. Cursor mechanics are owner-decided in principle; the exact `ticksRun` accounting is a genuine owner decision.

20. **AD-16 audio effect records — RATIFY (OWNER).** Amend `docs/spec/engine/display-input-audio.md#e-16` and the spine AD-16: this epic posts `audio` effects for board music and per-frame `.anm` sounds through `postEffect`; epic audio-synth registers the applier and creates `AudioCue`s later. No `GameState.audio` or `cueId` is owned here. Evidence: A-12, F-20, E-16, E-17's animation sound row, and the audio-synth handoff. Logic: boot/animation can emit deterministic records before the audio section exists, and the later owner can turn them into cues. Rejected alternative: construct `AudioCue` directly in board-rendering, which duplicates the audio section and breaks the agreed dependency order.

21. **composeBoard inputs — RATIFY (OWNER).** Amend `docs/spec/engine/main-loop-and-startup.md#e-52` and the spine AD-29: `composeBoard` consumes a read-only world view including run-time board edits, sprites, current tick, `alpha`, and a view containing camera and include flags; `Engine.drawList`, `viewBrd`, editor canvas and export call the same pure compositor. Evidence: AD-29, A-7, entries 14–18, E-52 and E-63. Logic: one input contract prevents editor/runtime drift and keeps presentation interpolation outside simulation. Rejected alternative: let the compositor read mutable engine state or let each consumer compose independently.

## Genuine owner decisions required by this plan

These are the only unresolved choices in the matrix; each has a recommendation. All other rows are ratifications of owner-confirmed decisions or explicitly deferred below.

1. **TrueType metric rounding and line-height formula (item 9):** APPROVED 2026-10-17 in the `hhea` sum-of-rounded-parts form of item 9: scale-by-`unitsPerEm`, per-component `floor(x + 0.5)`, `lineHeight = ascentPx + descentPx + lineGapPx`.
2. **Light falloff (item 12):** approve linear normalized ellipse falloff, clamped segment projection for gradients, clipped polygon masking, and fixed-point interpolation; retain `unverified` until extraction answers.
3. **2D-on-iso projection (item 13):** approve the proposed fixed nearest-neighbour affine map and exact integer boundary/mask convention as a Reawakened non-parity rule.
4. **Camera easing set (item 16):** approve exactly `linear`, `smoothstep`, `easeIn`, `easeOut`, `easeInOut` as serialisable names.
5. **Pending-effect queue policy (item 17):** approve cap 256 per section, FIFO oldest eviction, and monotonic diagnostic dropped counter.
6. **Legacy screenshot reporting metric (item 6):** approve decoded-RGBA reporting as per-pixel maximum absolute channel error plus mean absolute channel error (no pass/fail gate). This reports useful numeric drift without implying parity; exact screenshot bytes remain non-gating.
7. **Breakpoint `ticksRun` accounting (item 19):** approve counting only completed ticks, so an interrupted open tick reports zero until resumed/completed.

The owner may change any recommendation before approval; the build MUST follow the approved rule and update this plan's change log, not silently invent a second rule.

## Deferred rows and ownership closure

The following are deliberately not decided here:

- Entry 4.29 owns message-window geometry/margins/colours/text speed, `msgBox` layout, fade/wipe/zoom/earthquake defaults, cursor hand, text cell size, `drawEnemy`, lifecycle ownership, `start`/`quitGame`/`dos`/`windows`/`godos`, reset sections, player/presence/save ports, and audio cue realisation. Entry 4.2 owns the extraction-question list for the unspecified presentation rows and light falloff follow-up; answers can amend docs first and then require deliberate goldens.
- Entry 4.3 owns font-library selection, bundled Liberation font files/licences, and the bitmap fallback; entry 4.8/4.9 consume this plan's FontRef/metrics/substitution contract.
- Entry 4.4 owns authored 2D scenes, the schema validator, independent Python reference, PNGs, and ledger rows; entry 4.17 extends it for stacked/rotated iso scenes. The oracle class policy itself is ratified here.
- Entry 4.5 owns `createEngine`/asset loop and the first tracer. Entry 4.6 owns command replay and vectors, consuming this plan's ellipse and `iso2d` rules. Entry 4.7 owns surfaces and `colourSurface` under AD-27.
- Entry 4.10 owns world hydration and run-time R-06 compaction; entry 4.11 owns the effect hook, queue implementation, plugin packs, and catalogue replacement; entry 4.19 owns `WaitView`, input claims and applier registration; entry 4.30 owns the breakpoint implementation. This plan owns the contracts only.
- Entry 4.13 owns shade/light implementation; entry 4.14 owns `composeBoard`; entry 4.15 owns sprite sorting and under redraw; entry 4.16 owns camera implementation and the five camera built-ins; entry 4.18 owns both iso compositors. They must cite the rule anchors above and must not add competing defaults.
- Entries 4.21–4.25 consume the wait/effect/compositor contracts but wait on entry 4.29 for presentation rows. Entry 4.26 checks the ledger classes/gating flags, 4.27 performs the sweep, and 4.28 owns sample-game regression baselines.

### Dependency closure table (entries 4–28 and 30)

| Entry | Required row | This plan's disposition | Owner/consumer anchor |
|---|---|---|---|
| 4 | scene schema, independent reference, ledger classes | Ratify policy; define schema/ledger contract | `parity-checklist.md#golden-image-oracle`; producer 4.4 |
| 5 | fixed tick, alpha, scene S-01 class | Ratify; defer PNG/engine implementation | `main-loop-and-startup.md#timing`, `#reawakened-presentation-alpha`; 4.5 |
| 6 | ellipse, `iso2d`, integer replay | Propose exact algorithms; 4.6 consumes | `display-input-audio.md#reawakened-light-and-raster-arithmetic`, `tiles.md#reawakened-iso2d-projection` |
| 7 | surface contract | Ratify existing AD-27; 4.7 owns implementation | spine AD-27 |
| 8–9 | FontRef, metrics, family/.fnt selection | Ratify A-1/A-9; propose metric convention; 4.3/4.8/4.9 own files | `display-input-audio.md#reawakened-fontref-and-metrics` |
| 10 | R-06 run-time compaction | Ratify landed R-06; 4.10 implements | `board.md#items-placed-on-the-board-sprites` |
| 11–12 | same-turn effects, catalogue ownership | Ratify route; propose queue cap; 4.11/4.12 implement | `rpgcode-runtime.md#reawakened-effect-dispatch` |
| 13 | R-15 scope, ambient/lights | Ratify R-15; propose light falloff | `tiles.md#shading`, `board.md#lights` |
| 14 | compose inputs, layer order, alpha | Ratify AD-29 and E-52 | `main-loop-and-startup.md#e-52` |
| 15 | total sprite key, iso y, under flags | Ratify R-55/A-8; 4.15 implements | `movement-and-collision.md#e-29`, `board.md#vectors` |
| 16 | camera defaults, easing, additions | Ratify A-6; propose easing; additions in catalogue | `movement-and-collision.md#e-51`, `rpgcode-functions.md#reawakened-camera-built-ins` |
| 17 | both iso scene contracts | Ratify class policy; propose 2D-on-iso projection | `tiles.md#reawakened-iso2d-projection`; producer 4.17 |
| 18 | iso y/projection and compositor inputs | Ratify/propose as above | `board.md#coordinates`, `tiles.md#isometric-tiles` |
| 19 | WaitView/key claims, fixed tick/alpha | Ratify A-14/A-7 | `rpgcode-errors-and-threads.md#wait-view-and-key-claims` |
| 20 | audio records, not direct cues | Ratify A-12 | `display-input-audio.md#e-16`; 4.29/epic 6 handoff |
| 21–25 | effects/waits/compositor; presentation rows | Ratify shared contracts; defer presentation rows to 4.29 | `rpgcode-runtime.md#reawakened-effect-dispatch`; 4.29 |
| 26 | ledger class/gating and replay policy | Ratify | `parity-checklist.md#golden-image-oracle` |
| 27 | no new behaviour | No additional ruling; cites all above | all owner anchors |
| 28 | sample-game regression class | Ratify non-gating class policy; defer baselines to 4.28 | `parity-checklist.md#golden-image-oracle` |
| 30 | open-tick cursor, continue/step, ticksRun | Propose accounting; 4.30 implements | `main-loop-and-startup.md#reawakened-breakpoint-cursor` |

## Files the build commit will touch

The implementation commit after approval is docs-only plus the two specified contract data files:

- `docs/spec/engine/main-loop-and-startup.md` — fixed-tick/presentation alpha, E-52 compositor inputs, breakpoint cursor, audio-record handoff.
- `docs/spec/engine/movement-and-collision.md` — E-29 sprite key and E-51 camera defaults/signatures.
- `docs/spec/engine/display-input-audio.md` — E-17 light/raster rules, E-53 iso projection, E-16 audio records, font payload/metrics.
- `docs/spec/engine/rpgcode-functions.md` — FontRef-facing font semantics and Reawakened camera additions.
- `docs/spec/engine/rpgcode-errors-and-threads.md` — WaitView and key-claim protocol.
- `docs/spec/engine/rpgcode-runtime.md` — effect dispatch and pending-queue contract.
- `docs/spec/engine/parity-checklist.md` — oracle classes, scene/ledger contract, screenshot metric.
- `docs/spec/formats/board.md` — R-06, lights, drawing order, vectors and sprite projection references.
- `docs/spec/formats/tiles.md` — R-01, R-15, and 2D-on-iso projection.
- `_bmad-output/initiative-rpgtoolkit-reawakened/architecture-rpgtoolkit-reawakened/architecture-rpgtoolkit-reawakened.md` — only the affected AD-1, AD-3, AD-8, AD-9, AD-10, AD-15, AD-16, AD-27, AD-29 and AD-33 clauses.
- `_bmad-output/initiative-rpgtoolkit-reawakened/epic-rpgcode-vm/discovery/command-effect-catalogue.json` — add the four camera names as Reawakened `mixed` additions and prevent generated stubs; do not alter unrelated ownership rows.

No code, fixture, PNG, ledger JSON, generated catalogue stub, or font asset is touched by this ticket's implementation commit. The plan file itself is the only `_bmad-output/.../epic-board-rendering` file added by this plan PR.

## Risks and mitigations

| Risk | Mitigation |
|---|---|
| A recommended default is mistaken for legacy parity | Label light/projection/ellipse defaults `Reawakened rule (unverified)` and route extraction questions to 4.2; use independent-reference or regression-baseline ledger classes, never a false parity claim. |
| The FontRef wording in the ticket is stale | Treat A-1 as authoritative: amend to carry `size`, `bold`, and `italic`; call out the stale phrase in review rather than implementing `{ asset }`. |
| Queue cap or breakpoint accounting changes replay semantics | Require owner approval for items 6, 9, 12, 13, 16, 17, and 19; keep cap, eviction, cursor, and ticksRun plain data and add the exact rule to the docs before any build. |
| Catalogue generator creates duplicate stubs | Set camera rows to Reawakened `mixed` and update only the discovery catalogue; run the catalogue check after the docs commit. |
| Docs anchors drift or duplicate | Add stable named anchors beside the existing E/section anchors and link every downstream entry to them; review links before approval. |
| Entry 29 and this entry overlap | Keep message/presentation/lifecycle/audio-cue realisation in 4.29; this entry only states shared effect records, fixed-tick contracts, and the audio handoff. |
| Independent oracle accidentally imports core | Entry 4's existing no-import boundary remains; this plan only defines the schema/class policy and does not author fixtures. |

## Plan Change Log

- 2026-10-17 (owner note): help text for `earthquake` (and `cameraShake`) must explain intensity both in user terms and in game terms (passes, pixels, ticks and seconds, blocking or not); the wording belongs to entry 4.22, which the owner approves.

- 2026-10-17 (owner review): item 9 takes metrics from `hhea` with `lineHeight = ascentPx + descentPx + lineGapPx` (owner accepted); `cameraShake` and `cameraPanTo` units, tick conversion, determinism, bad-value and overlap rules recorded in item 16; `earthquake(i)` is `i` consecutive `shake(amplitudeForIntensity(p), 4)` calls for `p` = 1 to `i`, blocking until the last ends, not a `cameraShake` call. Owner-relayed legacy fact (to be logged by entry 2 as a round 7 answer, not copied from source by an agent, G7): `i` is a count of passes and also the pixel offset; pass `p` (1 to `i`) draws four frames offset by `p` px toward the four corners (up-left, up-right, down-left, down-right, so the screen jumps between corners and never moves on one axis), each followed by a 5 ms delay, about `i × 4 × 5` ms plus render time. Ruling for 4.22 and 4.29: `i` clamped 1 to 10; `4·i` frames at one frame per tick (the 5 ms plus render time cannot be reproduced deterministically); the corner order above is the owner's listing and is unverified; it blocks through the `sleep` wait, which also matches the corpus (`Caoquest/Prg/earthquake.prg` chains 12 calls; `ChimeranEmpire/Prg/Fire Bomb.prg` plays a wav after one). `cameraShake` stays the separate, non-blocking, owner-specified feature.

- 2026-10-17: Initial plan from origin/main `19d52630`; all ticket rows mapped to exact spec anchors, with seven genuine owner decisions called out and entry 29/entry 2 boundaries preserved.

## Verification

**Commands after the docs implementation is approved (not run by this plan worker):**

- `pnpm catalogue:check` — expected: camera additions are represented once as `mixed`, no generated stub is required, and unrelated catalogue ownership is unchanged.
- `git diff --check` — expected: no whitespace errors.
- Link/anchor review of every path in the ruling matrix — expected: all new stable anchors exist and every downstream entry cites one owner.
- `python3 _bmad/method/scripts/tickets.py --project-root . status initiative-rpgtoolkit-reawakened` — expected: no `undeclared_after`, `unpinned_after`, or `order_conflict`; no ticket-store edits.

Per the ticket acceptance, this plan PR runs no build, test, lint, provenance, licence, golden, fixture, or implementation checks beyond the required ticket-store status check.

</frozen-after-approval>
