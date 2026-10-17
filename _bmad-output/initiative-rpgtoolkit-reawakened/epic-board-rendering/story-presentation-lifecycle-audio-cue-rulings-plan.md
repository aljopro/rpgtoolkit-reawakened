---
title: 'Presentation, lifecycle and audio-cue rulings'
type: 'feature'
ticket: 29
created: '2026-10-17'
status: done
baseline_revision: 'cf04834d'
route: full
route_source: pinned
risk: medium
review: quick
review_source: pinned
lenses_ran: []
review_loop_iteration: 0
context:
  - 'docs/guardrails.md'
  - 'docs/spec/engine/display-input-audio.md'
  - 'docs/spec/engine/main-loop-and-startup.md'
  - 'docs/spec/engine/rpgcode-functions.md'
  - 'docs/spec/engine/rpgcode-language.md'
  - 'docs/spec/engine/rpgcode-modules-and-objects.md'
  - 'docs/spec/engine/plugins-and-battle.md'
  - 'docs/spec/formats/main-file.md'
  - '_bmad-output/initiative-rpgtoolkit-reawakened/epic-board-rendering/epic-board-rendering.md'
  - '_bmad-output/initiative-rpgtoolkit-reawakened/epic-board-rendering/discovery/render-readiness.md'
  - '_bmad-output/initiative-rpgtoolkit-reawakened/epic-rpgcode-vm/discovery/command-effect-catalogue.json'
  - 'packages/core/src/script/catalogue-responders.ts'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Entries 4.20–4.25 and 4.31 need one authoritative contract for presentation defaults, lifecycle control, startup seams and audio records. The normative pages describe the command names but leave several visual defaults open, while the command-effect catalogue currently assigns lifecycle names to menu-party-save, marks `dos` and `windows` obsolete, and claims that `reset` writes `rng` and `time` even though E-06 does not clear them.

**Approach:** Amend the existing `docs/spec/engine` anchors with explicit Reawakened rule blocks, each with an `<!-- OWNER: ... -->` marker. Defaults that `docs/spec` does not establish are explicitly labelled **Reawakened rule (unverified default)** and sent to the extraction-question owner. Correct only the lifecycle ownership/obsolete/sections metadata in the discovery catalogue JSON; no TypeScript, fixtures, goldens or generated stubs are touched by the implementation commit. The plan does not reopen `earthquake`: entry 4.1/4.22 already rules it; this entry only applies the common help-text standard to its documentation.

## Boundaries & constraints

**Always:** G7 docs-first clean-room work; `docs/spec/` remains normative (ADR 0007); all state-affecting presentation and lifecycle behaviour is plain data and fixed-tick deterministic (G1/G3); renderers replay draw lists only (G4); effect records cross the engine `postEffect` seam; every proposed judgement remains visibly marked `OWNER` until the owner approves it.

**Never:** Open or translate legacy GPL source; edit `packages/**`; change fixtures or goldens; implement any command in this plan; invent a legacy-parity claim for an unspecified default; duplicate 4.1's camera/effect-dispatch/earthquake rule; construct `AudioCue` or mutate `GameState.audio` in board-rendering; make host quit behaviour part of core.

**Status:** This is a plan checkpoint. The implementation follows only after owner review. Entry 4.1 is building in flight on `feat/4-1`; this plan consumes its anchors and does not modify its plan or branch.

## Evidence policy

Each row below names: (1) the exact normative page and existing E-anchor or a stable new sub-anchor to add beside it; (2) the recommendation; (3) spec evidence; (4) corpus/provenance evidence; (5) why the rule is deterministic and useful; and (6) the rejected alternative. Corpus evidence is limited to the authored/fetched fixture paths and measurements already recorded in `render-readiness.md`; no legacy source is opened. `unverified` means the rule is a Reawakened default, not a recovered 3.1 fact.

## Ruling matrix — presentation

### P-1 Message-window geometry, margins, colours and text speed

**Anchor:** `docs/spec/engine/rpgcode-functions.md#e-55` (message window) and `docs/spec/engine/display-input-audio.md#e-50` (logical resolution); add stable sub-anchor `#reawakened-message-window-defaults` immediately after E-55.

**Proposed ruling (pending owner review; OWNER): Reawakened rule (unverified default).** The message window is in logical screen pixels, anchored at the top edge as E-55 says, with x = 10% of logical width, y = 4% of logical height, width = 80% and height = 24% (all rounded with integer `floor(x + 0.5)`). Its inner margin is 8 px on every side, clamped so the inner rectangle remains non-negative. Default background is opaque DOS colour 0, default text is DOS colour 15, and the configured image/colour/translucency overrides those values without changing geometry. The default text speed is 60 revealed glyphs per second, converted to whole fixed-60-Hz ticks; `textspeed(0)` means reveal immediately, and a non-positive value other than zero is a located `builtin.bad-arg`.

**Evidence:** E-55 requires a top-of-screen dialogue box with background, size, translucency, font, style and colour but specifies none of these numbers; E-50 and E-53 establish logical-resolution pixels. Corpus `fixtures/legacy` has 954 `mwin` calls and 351 `text` calls (F-16d), so this is a high-use compatibility seam, but no corpus fixture records a complete default geometry. Provenance is the owner-confirmed A-10 gap and F-15b, plus the extraction-question procedure in `docs/provenance/extraction-log.md`/round 7; the recommendation is not a legacy claim. A fixed glyph rate makes repeated runs independent of render cadence and keeps `wait`/modal text state snapshottable. **Rejected alternative:** derive geometry from the current font or runner window size, which changes draw lists across fonts/runners; preserve an opaque platform-default message box, which violates G2/G4.

### P-2 `msgBox` layout and cursor-map interaction

**Anchor:** `docs/spec/engine/rpgcode-functions.md#e-60` and the `msgbox` table row; add `#reawakened-msgbox-layout` beside E-60.

**Proposed ruling (pending owner review; OWNER): Reawakened rule (unverified default).** `msgbox(text, title, style, textColor, backColor, bitmap)` uses the same logical-resolution UI surface and 8 px margin as P-1. The panel is centred, 60% of screen width and 22% of screen height, with title at the top inner row and body below; body text wraps at the inner width using the current font metrics. Style 0 creates one centred `OK` button; style 1 creates `YES` then `NO` buttons in that deterministic order. Buttons are laid out left-to-right in a 16 px-high row with 8 px gaps, selected index 0, and the function yields `render.msgbox` until a cursor-map key selects a button. Explicit colours/image replace only their respective defaults. Invalid style values are a located `builtin.bad-arg`.

**Evidence:** E-60 specifies a message box with OK or Yes/No buttons and cursor-map navigation, and AD-9/F-19 require a named, saveable wait; F-15b records that the layout is otherwise open. The corpus contains no `msgbox` calls (F-16d), which means this is an unverified compatibility default rather than a corpus inference. Provenance is the docs/spec modal-UI description and A-10. The fixed panel and button order give cursor-map waits a stable draw list and resume value. **Rejected alternative:** let each runner choose native modal widgets, which violates G4 and makes headless replay impossible; encode button order in host callbacks, which cannot be snapshotted.

### P-3 Fade types

**Anchor:** `docs/spec/engine/rpgcode-functions.md#e-59` and the `fade` table row; add `#reawakened-fade-types` beside E-59.

**Proposed ruling (pending owner review; OWNER): Reawakened rule (unverified default).** Accept fade types 1–4: 1 = fade out from the current frame to the current border colour; 2 = fade in from the current border colour to the current frame; 3 = fade out then in (the current frame is captured once); 4 = crossfade from the captured current frame to the next composed frame. The default duration is 30 ticks (0.5 seconds at fixed 60 Hz), with linear integer alpha at each tick; the command records a blocking `fx.fade` effect and resumes after the final tick. Type 0 and values outside 1–4 raise `builtin.bad-arg` rather than silently selecting a runner-specific effect.

**Evidence:** E-59 says only that several fade types exist and the table says the current colour is used; F-15a confirms no numeric enumeration or timing. The corpus has 39 `fade` calls (F-16d), so numeric behaviour must be explicit, but no fixture establishes the missing map. Provenance is A-10 and the round-7 extraction-question route. A bounded tick count and integer alpha preserve deterministic blocking semantics. **Rejected alternative:** accept arbitrary type numbers and let a renderer decide, which makes the same script produce different draw lists; use wall-clock duration, which violates G3.

### P-4 Wipe effects 1–12 and speed

**Anchor:** `docs/spec/engine/rpgcode-functions.md#e-59` and the `wipe` table row; add `#reawakened-wipe-effects-and-speed` beside E-59.

**Proposed ruling (pending owner review; OWNER): Reawakened rule (unverified default).** `wipe(file, effect, speed)` captures the current frame, resolves `file` as the next image, and applies a blocking wipe over the logical surface. Effects are: 1 left-to-right, 2 right-to-left, 3 top-to-bottom, 4 bottom-to-top, 5 horizontal centre-out, 6 horizontal edges-in, 7 vertical centre-out, 8 vertical edges-in, 9 top-left diagonal, 10 top-right diagonal, 11 bottom-left diagonal, 12 bottom-right diagonal. Progress is an integer percentage [0,100] advanced by `speed` percentage points per tick; omitted speed is 4, so the default is 25 ticks. Speed 0 is a one-tick completed wipe; negative or >100 values are `builtin.bad-arg`. The final frame is exactly the resolved image and the effect releases its blocking wait after progress reaches 100.

**Evidence:** E-59/table state an image, effect 1–12 and optional speed, but no geometry or units; F-15a confirms the gap. The corpus has no `wipe` calls (F-16d), so all 12 mappings and speed are unverified defaults. Provenance is A-10 and the clean-room round-7 question list. Integer percentage progression makes all runners agree and gives every effect the same completion contract. **Rejected alternative:** map only the four cardinal directions and treat 5–12 as aliases, which would make the documented 1–12 range misleading; use pixels-per-frame speed, which changes duration with resolution and frame rate.

### P-5 Zoom

**Anchor:** `docs/spec/engine/rpgcode-functions.md#e-59` and the `zoom` row; add `#reawakened-zoom` beside E-59. `earthquake` is deliberately not re-ruled here; cite the 4.1/4.22 anchor and apply only the help-text rule below.

**Proposed ruling (pending owner review; OWNER): Reawakened rule (unverified default).** `zoom(percent)` treats 100 as one-to-one (no zoom), values 1–400 as the target scale percentage, and rejects values outside that range. The camera remains centred on its current logical centre; source sampling is nearest-neighbour, and the scale is applied immediately to the next draw list. A call supersedes the prior zoom target, writes the `fx` state, and does not yield. `zoom(100)` clears the zoom effect. This is a presentation transform only and never changes world coordinates or camera-follow state.

**Evidence:** E-59 says “zoom into the centre of the board by the specified percent” but gives no range, interpolation or sampling rule; F-15a records the gap and F-16d records seven corpus calls. The recommendation follows AD-3 integer draw commands and G3. **Rejected alternative:** interpret the argument as an additive percentage (where 100 means 200%), which makes the natural no-op value ambiguous; animate over host frames, which violates fixed-tick replay.

### P-6 Default arrow and cursor hand

**Anchor:** `docs/spec/engine/display-input-audio.md#e-61`, `docs/spec/engine/rpgcode-functions.md#e-60`, and the `mousecursor`/`cursormaphand` rows; add `#reawakened-default-cursors` beside E-61.

**Proposed ruling (pending owner review; OWNER): Reawakened rule (unverified default).** `TK DEFAULT` resolves to a bundled 16×16 arrow asset with hot spot (0,0), transparent background and no platform cursor dependency. `cursorMapHand` with no custom image resolves to a bundled 16×16 hand with hot spot (1,1); its existing `stretch=true` default scales it to 32×32 with nearest-neighbour sampling, while `stretch=false` keeps 16×16. `mouseCursor("TK DEFAULT")` and an empty file restore the arrow. The asset keys, dimensions and hot spots are part of the deterministic UI state and are not loaded from the host OS.

**Evidence:** E-61 requires a built-in arrow and E-60 says cursor maps may use a custom cursor image; the function table says `TK DEFAULT` restores the default and `cursormaphand` has a stretch option, but neither default pixels nor hand are specified. F-15b records the cursor-hand gap; corpus F-16d has six `cursormapadd` and two `cursormaprun` calls but no proof of default pixels. Provenance is A-10 and the docs-only clean-room process. **Rejected alternative:** use browser/desktop native cursors, which differ by OS and cannot be hashed; make the hand an alias of the arrow, which loses the documented separate hand control.

### P-7 `text` cell size

**Anchor:** `docs/spec/engine/rpgcode-functions.md#e-56`, the `text` row and `pixeltext` row; add `#reawakened-text-cell-size` beside E-56.

**Proposed ruling (pending owner review; OWNER): Reawakened rule (unverified default).** `text(x,y,...)` interprets x and y as integer character-cell coordinates with an 8×16 logical-pixel cell: origin `(x*8, y*16)`, using integer truncation for non-integer arguments. `pixeltext` remains pixel coordinates. Text layout, wrapping and glyph advances use the current `FontRef` metrics from entry 4.1, but cell placement does not change with the font asset; an explicit newline advances one 16 px cell row. Out-of-range coordinates clip to the target surface.

**Evidence:** E-56 explicitly allows tile-cell or pixel coordinates but does not choose the cell dimensions; F-15b records this gap, and F-16d records 351 `text` calls. The 8×16 choice is a deterministic character-cell convention compatible with the TK2 8×8 bitmap source doubled to 16×16 and the 16 px default text row, but is not a legacy assertion. **Rejected alternative:** derive cells from `fontSize` or glyph metrics, which changes coordinate meaning when a script changes fonts; treat `text` and `pixeltext` as aliases, which contradicts E-56's distinction.

### P-8 `drawEnemy`

**Anchor:** `docs/spec/engine/rpgcode-functions.md#e-83` and the `drawenemy` row; add `#reawakened-draw-enemy` beside E-83.

**Proposed ruling (pending owner review; OWNER): Reawakened rule (unverified default).** `drawEnemy(file,x,y[,cnv])` resolves `file` through the `battle` asset port, selects frame 0 at native dimensions, and emits the same deterministic `blit`/colour-key draw operation used by board sprites. x and y are logical pixel coordinates; omitted `cnv` targets the script screen surface. It never creates an enemy, changes battle state, or consumes RNG. A missing file produces the normal located asset diagnostic and no partial draw.

**Evidence:** The command table only says “Draw an enemy”; E-83 documents battle context, and AD-3/G4 require draw-list operations. The catalogue marks `drawEnemy` as board-rendering, reads `battle,surfaces`, and calls its confidence `[INFERENCE]`; F-16d has no `drawenemy` corpus call. Provenance is the catalogue plus docs/spec, not legacy source. **Rejected alternative:** delegate to a host battle renderer or mutate `battle` to make a temporary enemy, which violates the draw-list boundary and makes a supposedly visual command affect simulation.

## Ruling matrix — lifecycle, startup and ownership

### L-1 Lifecycle ownership and command names

**Anchor:** `docs/spec/engine/rpgcode-functions.md#ownership-of-names-with-no-single-owner`, `#program-flow-errors--debugging`, `#files-saves--os`, and `docs/spec/engine/main-loop-and-startup.md#e-06`; add `#reawakened-lifecycle` beside the ownership section.

**Proposed ruling (pending owner review; OWNER):** Board-rendering (entry 4) owns `reset`, `mainFile`, `win`, `gone`, `over`, boot and quit. The catalogue JSON changes those five rows from owner 8/menu-party-save to owner 4/board-rendering. `win` remains an obsolete error; `over` shows the game-over flow; `mainFile` requests a new main file; `reset` restarts the documented startup path; `gone` suppresses the currently executing trigger until leaving the board. `done`, `end` and `stop` remain program-only VM flow controls.

`start(file)` is changed to **obsolete: raises an error** and is removed from the lifecycle ownership bullet: the normative table describes shell-open, no web host can provide that capability, and no fixture calls it. `godos(command)` remains obsolete with its argument. A new Reawakened `quitGame()` is added as a board-rendering built-in; `dos()` and `windows()` are legacy aliases of it, not obsolete commands. All three emit one AD-17 `quit` request and do not specify whether a host closes a window, stops a VS Code session or shows an ended screen. The spec's “exit to windows” wording and the “obsolete and dropped” bullet are corrected accordingly.

**Evidence:** E-06 names `windows()` and `dos()` as the script quit path; E-02 defines startup; the table has `start` shell-open, `win` obsolete, and live `dos`/`windows`; the ownership bullet and JSON disagree with those rows. F-13/F-14a document the conflict. Corpus evidence is explicit owner-relayed fixture evidence: both 3.1 sample games call `windows()` from their start menus (`fixtures/legacy/demo/Prg/start.prg:73`, `fixtures/legacy/Basic/Prg/start.prg:77`) and five `dos()` calls occur in `fixtures/legacy` (the paths are also recorded in the epic assumption). Provenance is docs/spec (normative under ADR 0007), the owner ruling A-3/A-4 and the clean-room extraction log; no source file is used. **Rejected alternative:** keep all names with menu-party-save because the JSON guessed owner 8, which contradicts the normative ownership map and boot/quit boundary; drop `dos`/`windows` because their corpus use would break both sample start menus; expose a host shell-open for `start`, which violates the cross-platform host contract.

### L-2 Catalogue and responder corrections

**Anchor:** `docs/spec/engine/rpgcode-functions.md#reawakened-lifecycle`, `docs/spec/engine/main-loop-and-startup.md#e-06`, and the discovery JSON.

**Proposed ruling (pending owner review; OWNER):** In `command-effect-catalogue.json`, set `owner = 4`, `ownerEpic = "board-rendering"` for `reset`, `mainFile`, `win`, `gone`, `over`, `dos`, `windows` and new `quitGame`; set `godos` to owner 4 only if the obsolete error is registered by the same lifecycle pack, otherwise retain the explicit obsolete owner but ensure it is not emitted as a runnable stub. Mark `start` `obsolete = true`, with `effectKind = "flow-control"`, note “obsolete: raises an error; shell-open is unavailable in Reawakened”, and remove it from the ownership map's lifecycle list. Set `dos`/`windows` `legacyAlias = true`, `obsolete = false`, note “alias of quitGame; emits one quit request”. Set `godos` `legacyAlias = false` (it takes a command string and is not an alias). The catalogue's `sectionsRead`/`sectionsWrite` must match L-3 and L-4 below. `catalogue-responders.ts` is evidence for the stale generated responder rows; the later implementation must let the real board-rendering pack override those rows and must not add a second responder or generated stub.

**Evidence:** The JSON currently assigns all nine rows to owner 8 and marks `dos`/`windows` obsolete; responders currently list `reset`, `start`, `mainfile`, `win`, `gone`, `over`, `godos`, `dos`, `windows` with the stale metadata (source lines 111–119). The spec and A-3/A-4 are the authority. **Rejected alternative:** hand-edit only the TypeScript responder table, which would leave the catalogue generator and docs disagreeing; keep JSON aliases obsolete, which would make catalogue checks and the sample games disagree.

### L-3 `reset` section-by-section contract

**Anchor:** `docs/spec/engine/main-loop-and-startup.md#e-06`, `#e-02`, and `docs/spec/engine/rpgcode-modules-and-objects.md#redirects` (add `#reawakened-reset-sections` immediately after E-06).

**Proposed ruling (pending owner review; OWNER):** `reset()` clears the state that E-06 names and the transient run/UI state needed for a fresh startup, then reruns startup at E-02 step 3. The reset write set is exactly `engine`, `world`, `sprites`, `party`, `inventory`, `triggers`, `vm`, `battle`, `menu`, `ui`, `camera`, `fx`, `audio`, `surfaces`, and `input`; it does **not** write `rng` or `time`.

| Section | Reset action | Reason / owner |
|---|---|---|
| `engine` | Enter reset/startup control state, clear pending lifecycle/quit state, then run startup from plugin installation. | `core/engine`, board-rendering |
| `world` | Drop the active board/runtime objects and reload the main-file project/board during startup. | movement-triggers port; E-02/E-10 |
| `sprites` | Clear players/items and recreate the first player from `initChar`; startup additions then apply. | movement-triggers `InitialPlayerPort` |
| `party`, `inventory` | Clear to new-game defaults; startup/menu may add members, stats and items. | menu-party-save |
| `triggers` | Clear armed/repeat/gone state and rebuild it with the board; no old trigger remains suppressed. | movement-triggers |
| `vm` | Clear globals, redirects, running threads and plugin command state; run startup program anew. | VM/board-rendering; E-06 and R2-Q22 |
| `battle`, `menu` | Close active battle/menu and discard their transient screens. | battle/menu-party-save |
| `ui` | Hide/clear mwin/msgBox, cursor maps and buttons; restore project/default font and colour settings. | board-rendering |
| `camera` | Reset follow target and transform to AD-33 defaults; board startup then selects the first player. | board-rendering; 4.1 camera ruling |
| `fx` | Cancel fades, wipes, zoom, animations and pending screen effects. | board-rendering |
| `audio` | Stop one-shot effects and clear board-music ownership; startup/board entry emits the new board music record. | audio-synth applier, A-12 |
| `surfaces` | Clear script canvases and screen captures; do not retain old pixels across a fresh run. | core/raster |
| `input` | Drop queued/held transient input and pointer/button state before startup; later events are new-run input. | movement-triggers input owner |
| `rng` | **Preserve seed/state**; reset is not a new engine seed and no E-06 text clears RNG. | core/rng |
| `time` | **Preserve elapsed tick/play-time counters** unless the owner explicitly chooses new-game time; E-06 does not clear time. | core/time |

**Evidence:** E-06 explicitly clears globals, redirects, plugins and threads and reruns startup; F-21 says it is silent on `time`, `rng`, `ui`, `fx`, `camera`, `surfaces`, and F-20/A-12 establish audio ownership. R2-Q22 says redirects are process-wide and cleared by loading a saved game or starting a new game. The JSON's current `sectionsWrite` incorrectly includes `rng` and `time` and omits `engine` and `input`; this is the source conflict to correct. The section table makes the reset seam testable without pretending that a whole-state hash is zeroed. **Rejected alternative:** clear every section including `rng` and `time`, which invents behaviour E-06 does not state and destroys deterministic continuation; clear only VM/world and leave stale UI/surfaces, which leaks a prior run into the new startup.

### L-4 `gone`, startup ports and saved-game branch

**Anchor:** `docs/spec/engine/main-loop-and-startup.md#e-02`, `#e-10`, `docs/spec/engine/movement-and-collision.md#e-40`, `#e-41`, and `docs/spec/engine/rpgcode-functions.md#reawakened-lifecycle`.

**Proposed ruling (pending owner review; OWNER):** `gone()` writes only the `triggers` section: mark the currently running board program's trigger instance as suppressed until the active board is left, without deleting the source program, changing sprites, or ending unrelated threads. Leaving the board clears all `gone` suppression through normal trigger reload. This corrects the JSON's current `sectionsWrite: ["sprites","engine"]` and its “removes this program” note.

Name the cross-epic ports explicitly:

- `InitialPlayerPort.createFromInitChar(initChar: AssetKey): PlayerId` — movement-triggers creates the first player during E-02 step 6 and exposes its variables.
- `PlayerPresencePort.hasPlayer(): boolean` — movement-triggers owns the E-02 step-8 no-player check and emits the specified diagnostic if false.
- `SavedGamePort.load(path: SavePath): LoadResult` — menu-party-save owns E-02 step 9's saved-game branch; a successful load skips `initBoard`, while a miss/failure returns control to the ordinary `initBoard` path according to its documented load result.

These names are proposed interfaces, not code in this ticket. The engine invokes them through data-only ports; the first player and no-player check are not hidden in the renderer, and `Load()`/`dirSav` remain menu-party-save responsibilities.

**Evidence:** E-02 steps 6–9 explicitly name first-player creation, the no-player stop, and the saved-game `Load()` branch; E-10 defines board load side effects; E-40/E-41 establish trigger lifecycle. F-21 and the epic handoff say movement-triggers implements player/presence and menu-party-save implements `Load()`/`dirSav`. Corpus evidence includes the two sample startup menus calling `windows()`, showing that startup/quit must cross the core/host seam rather than invoke shell APIs. **Rejected alternative:** keep `gone` as a sprite/engine mutation, which can remove the wrong entity and cannot express “until board left”; make engine own player creation and save loading, which duplicates movement/menu owners and violates AD-10.

## Ruling matrix — audio records

### A-1 Board music and animation-frame sound records

**Anchor:** `docs/spec/engine/display-input-audio.md#e-16`, `#e-101`, `docs/spec/engine/main-loop-and-startup.md#e-52`, and architecture AD-16; add `#reawakened-audio-effect-records` beside E-16.

**Proposed ruling (pending owner review; OWNER):** Board-rendering emits plain `audio` effect records through `postEffect` for (a) board `bkgMusic` on board entry/change, with `loop: true`, and (b) each `.anm` frame sound when that frame becomes visible, with `loop: false`. A record carries `{ kind: "music.play" | "sfx.play", asset, loop, volume, source, tick }` (and no `cueId`); the board/animation phase owns ordering by phase order and frame index. The audio-synth epic registers the `audio` applier, assigns monotonic `cueId`s in `GameState.audio`, realises `AudioCue`s and handles `audio.ended`. Until it registers, records stay in 4.1's bounded per-section pending queue. Repeated board entry with the same music asset emits no replacement record; a different asset emits a new music record. Frame sounds are one record per displayed frame occurrence, not one per render call.

**Evidence:** E-16 says board music starts on entry and changes on board send/edge; E-101 says animation frames can produce one-shot effects; E-52 fixes animation phase order. A-12 and F-20 explicitly place `audio` state/cueId in epic audio-synth after this epic, while 4.1 rules `postEffect`. The corpus has 15 `wingraphic`, 21 `restorescreen`, 40 `earthquake` and animation-related uses in the measured render census but no claim that audio bytes are available in fixtures; provenance is the normative docs and owner handoff, not a source translation. **Rejected alternative:** construct `AudioCue` in board-rendering, which creates a second cue counter and violates section ownership; emit sounds from the renderer every frame, which duplicates cues when a cache is replayed and breaks deterministic headless runs.

## Help-text standard and explicit non-scope

Every help entry added or corrected by this ticket follows the owner standard in `epic-board-rendering.md` and `CLAUDE.md`: explain the command in simple terms first, then the deterministic technical action (logical units, tick conversion, ordering and whether the script waits). Apply this to the help rows/rule blocks for `mwin`, `textspeed`, `msgbox`, `fade`, `wipe`, `zoom`, `mousecursor`, `cursormaphand`, `text`, `drawenemy`, `reset`, `mainFile`, `win`, `gone`, `over`, `quitGame`, `dos`, `windows`, `start` and `godos`, and to the audio-effect documentation. For `earthquake`, do not change the ruling from 4.1/4.22; only ensure its help text says the simple intensity meaning first, then passes, pixel offsets, four frames per pass, fixed ticks/seconds and that it blocks. `cameraShake` receives the same help-text shape under its 4.1 anchor, without a second behavioural ruling here.

## Genuine owner decisions required

These are the decisions to approve at this checkpoint; each recommendation is recorded above.

1. **P-1:** message-window geometry, 8 px margins, DOS 0/15 colours, 60 glyphs/s and `textspeed(0)` immediate.
2. **P-2:** centred 60% × 22% `msgBox`, 8 px margin, styles 0/1, button order and 16 px row.
3. **P-3:** fade type mapping 1–4, 30-tick duration and blocking/error behaviour.
4. **P-4:** all twelve wipe mappings, percentage-per-tick speed, default 4 and validation.
5. **P-5:** zoom scale interpretation (100 = no-op), range 1–400 and immediate non-blocking effect.
6. **P-6:** bundled 16×16 arrow/hand assets, hot spots and stretch behaviour.
7. **P-7:** fixed 8×16 `text` cell and truncation/newline rules.
8. **P-8:** drawEnemy's battle asset port, frame 0, pixel coordinates and no battle mutation.
9. **L-1/L-2:** board-rendering lifecycle ownership; `start`/`godos` obsolete errors; `quitGame` addition; `dos`/`windows` live aliases; exact JSON owner/alias/obsolete fields and responder override path.
10. **L-3:** exact reset write set and section actions, especially whether `engine`, `input`, `audio`, `ui`, `fx`, `camera` and `surfaces` clear as proposed while `rng` and `time` remain untouched.
11. **L-4:** `gone` writes `triggers` only and the three proposed port names/signatures.
12. **A-1:** audio record shape, same-track suppression, frame-occurrence semantics and audio-synth cue realisation.
13. **Help text:** approve the simple-then-deterministic standard, including the explicit earthquake non-scope note.

All unspecified presentation values remain **unverified Reawakened defaults** until owner approval and/or the extraction answer. A later owner-relayed fact changes a default only through a doc-first amendment and deliberate golden update (G5).

## Source conflicts found

| Conflict | Evidence | Resolution recommended here |
|---|---|---|
| Lifecycle owner | `rpgcode-functions.md#ownership-of-names-with-no-single-owner` says board-rendering; JSON rows say owner 8/menu-party-save; `catalogue-responders.ts:111-119` mirrors stale rows. | Normative docs and A-3 win: owner 4; update docs, JSON and later real responder registration together. |
| `dos`/`windows` status | E-06 and table list them live; ownership bullet and JSON mark all three `godos`/`dos`/`windows` obsolete; both sample starts call `windows`, fixtures contain five `dos`. | `quitGame` request with `dos`/`windows` aliases; only `godos` obsolete. |
| `start` | Table says shell-open; old ownership bullet includes it; owner ruling drops it because no cross-platform shell operation and no fixture call. | Mark obsolete error in docs/JSON and remove from lifecycle ownership. |
| Reset write set | E-06 names globals/redirects/plugins/threads only; JSON writes `rng`/`time`, omits `engine`/`input`; F-21 says other sections are unspecified. | Add explicit section table; recommend no `rng`/`time`, and correct JSON to the approved table. |
| `gone` effect | Table says remove current program; JSON writes `sprites`/`engine`; trigger docs define armed/re-armed programs. | Use a trigger suppression marker cleared on board leave; `sectionsWrite: ["triggers"]`. |
| Audio ownership | AD-16 describes eventual `AudioCue`; A-12/F-20 put `audio` state/cueId in later audio-synth, while E-16/E-101 require board/animation sounds now. | Emit `audio` effect records only; audio-synth assigns cue IDs and realises cues. |
| Presentation defaults | E-55/E-56/E-59/E-60/E-61/E-83 describe capabilities but not numbers or layouts; F-15a/b confirms the gaps. | Keep all recommendations labelled unverified and route extraction questions to entry 4.2. |
| Fixed-tick effects | Legacy E-03/E-04 describe uncapped/frame-rate timing; entry 4.1 already rules fixed 60 Hz and earthquake/cameraShake semantics. | Consume 4.1; do not reopen earthquake or add a second timing rule. |

## Implementation file map (after approval)

- `docs/spec/engine/rpgcode-functions.md` — presentation rule blocks, lifecycle table/help rows, `quitGame`, `start`/`godos` obsolete wording, ownership map and help text.
- `docs/spec/engine/display-input-audio.md` — message/cursor/audio rule anchors and E-16 record handoff.
- `docs/spec/engine/main-loop-and-startup.md` — E-02 startup ports, E-06 reset/quit/lifecycle rule and reset section table.
- `docs/spec/engine/movement-and-collision.md` — E-40/E-41 `gone` trigger suppression handoff (only if the trigger rule is the clearest home).
- `docs/spec/engine/plugins-and-battle.md` — only a cross-reference for `drawEnemy` if needed; no battle rule is invented there.
- `_bmad-output/initiative-rpgtoolkit-reawakened/epic-rpgcode-vm/discovery/command-effect-catalogue.json` — owner, aliases, obsolete flags, effect kinds and exact sections for lifecycle rows; add `quitGame` as a Reawakened addition without changing unrelated rows.

No package code, generated `catalogue-stubs.ts`, fixtures, images or goldens are part of this plan commit. The eventual implementation must let the board-rendering pack replace stale catalogue responders in `catalogue-responders.ts`; that code change is downstream of this docs checkpoint.

## Risks and mitigations

| Risk | Mitigation |
|---|---|
| An unverified default is mistaken for 3.1 parity | Use the exact phrase **Reawakened rule (unverified default)** in every affected rule block; route extraction questions to 4.2. |
| JSON/docs/responder ownership drifts again | Treat the normative docs, catalogue JSON and real pack registration as one ordered cutover; catalogue check is required after implementation. |
| Reset clears too much or too little state | Keep the section-by-section table and exact `sectionsWrite` list; test each section independently and preserve `rng`/`time` unless the owner changes the ruling. |
| Renderer or host invents UI/audio behaviour | Keep geometry/effects in core state/draw lists and audio as `postEffect` records; no native widgets, platform cursors or renderer-generated sounds. |
| Entry 4.29 duplicates entry 4.1 | Link to 4.1 anchors for camera/effect dispatch and earthquake; only add help-text wording here. |

## Plan change log

- 2026-10-17: Initial plan from `origin/main` `cf04834d`; mapped every entry-29 presentation, lifecycle, startup-port and audio-cue row to exact docs/spec anchors and recorded source conflicts.

## Verification (after owner approval; not run by this plan worker)

- `git diff --check` — no whitespace errors.
- `pnpm catalogue:check` — lifecycle JSON has one owner per name, `quitGame` is present once, `start`/`godos` are obsolete errors, and `dos`/`windows` are live aliases.
- Link/anchor review of every path in the matrix — all new stable anchors resolve.
- `python3 _bmad/method/scripts/tickets.py --project-root . status initiative-rpgtoolkit-reawakened` — no ticket-store order/pin problems and no ticket edits.
- `pnpm provenance` / `pnpm provenance:test` — docs-only changes contain no legacy source markers.

The plan checkpoint itself runs no build, test, lint, golden, fixture, licence or implementation checks. The owner approval is required before the doc/catalogue implementation commit.

</frozen-after-approval>
