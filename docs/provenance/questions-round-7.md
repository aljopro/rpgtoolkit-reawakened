<!-- Clean-room extraction round 7 (ADR 0006): question list. Answers, if obtained and reviewed, land in facts-round-7.md. -->

# Clean-room extraction, round 7 — rendering behaviour questions

* **Status:** answers received 2026-10-17 as an owner-relayed summary of differences from the defaults; recorded in [facts-round-7.md](facts-round-7.md). Q1 to Q8 and Q11 are answered fully or partly (some sub-questions remain unanswered, listed there); Q9 and Q10 were not asked.
* **Date:** 2026-10-17
* **Process:** [ADR 0006](../adr/0006-clean-room-spec-extraction.md) decision 2. The owner should forward this numbered list to the TK-side engineer and ask for short answers from memory, limited to the numbered questions. The answerer should describe behaviour in prose, not source code or the structure of the old program. A separate reviewer must check the returned prose before it enters `docs/`.
* **How answers land:** after the owner relays the answers, the reviewed prose goes in `facts-round-7.md`, with the answerer's confidence label preserved. The completed round then gets one row in [extraction-log.md](extraction-log.md), following round 5's owner-relayed precedent. This question-list commit does not record answers or claim legacy parity.
* **Scope:** these are the remaining rendering gaps identified by F-15a–F-15e. R-06 (F-15f) is already settled in the normative spec and is not a question. Earthquake is recorded below as answered by an owner-relayed fact; it must not be re-asked.

The defaults below are the Reawakened rules currently in force. An answer that differs from one of those defaults does not change implementation by itself: first amend the cited `docs/spec/` rule, then deliberately update the affected golden scene(s) and ledger entry under G5. The same doc-first path applies if an owner decides to replace a settled rule.

## Priority 1 — transitions and common UI (largest immediate output impact)

### 1. Fade types, ramps and timing

**Question for the TK-side engineer.** When a game calls `fade(1)`, `fade(2)`, `fade(3)` or `fade(4)`, what does each number visibly do? Does each kind fade linearly or use another ramp, how long does it last, and does the script wait until the last step? What should happen for zero or an out-of-range type?

**Affects.** Entry 4.22's `fade` effect and transition draw lists; entry 4.29's presentation transition contract; the `fade(int type)` command.

**Reawakened default now in force.** Types 1–4 are, respectively: fade out to the current border colour; fade in from that colour; fade out then in using one captured frame; and crossfade from the captured frame to the next composed frame. The default is 30 fixed-60-Hz ticks with linear integer alpha; the call records a blocking `fx.fade` effect and resumes after the final tick. Type 0 and values outside 1–4 raise `builtin.bad-arg`. See [`rpgcode-functions.md#reawakened-fade-types`](../spec/engine/rpgcode-functions.md#reawakened-fade-types) (E-59).

**If the answer differs.** Amend that E-59 rule first, including the type table, ramp, duration, blocking behaviour or invalid-value handling; then deliberately revise the transition goldens and their G5 ledger classification.

### 2. Wipe effects 1–12 and speed

**Question for the TK-side engineer.** What visible direction or shape does each wipe number 1 through 12 use? What unit does the optional speed use, what is the default speed, and does the call wait until the new image is fully shown? What do zero, negative and very large speeds do?

**Affects.** Entry 4.22's `wipe` effect and transition draw lists; entry 4.29's presentation transition contract; the `wipe(file, effect, speed)` command.

**Reawakened default now in force.** Effects 1–12 are, in order: left-to-right, right-to-left, top-to-bottom, bottom-to-top, horizontal centre-out, horizontal edges-in, vertical centre-out, vertical edges-in, top-left diagonal, top-right diagonal, bottom-left diagonal and bottom-right diagonal. Progress is an integer percentage from 0 to 100, advanced by `speed` points per fixed tick; omitted speed is 4, so the default lasts 25 ticks. Speed 0 completes in one tick; negative or greater-than-100 speeds raise `builtin.bad-arg`. The final frame is exactly the resolved image and the call blocks until it is shown. See [`rpgcode-functions.md#reawakened-wipe-effects-and-speed`](../spec/engine/rpgcode-functions.md#reawakened-wipe-effects-and-speed) (E-59).

**If the answer differs.** Amend the E-59 wipe rule before changing code, including all twelve mappings, speed unit/default, edge cases and waiting; then deliberately revise any wipe transition goldens and their G5 ledger classification.

### 3. Message-window geometry, margins, text speed and default colours

**Question for the TK-side engineer.** On a normal screen, where is the message window, how large is it, and how much space is left inside it around the text? What are its default background and text colours, and how quickly do letters appear by default? Does setting speed to zero reveal all text immediately, and does a negative speed do anything special?

**Affects.** Entry 4.21's `mwin`, `mwincls`, `mbox`, `show`, `textspeed`, `winGraphic`, `winColor`, `winColorRgb` and `setMwinTranslucency`; entry 4.29's presentation/UI contract; message-window draw lists and waits.

**Reawakened default now in force.** In logical screen pixels, the window is x = 10% of width, y = 4% of height, width = 80% and height = 24%, each rounded with `floor(value + 0.5)`. Its inner margin is 8 pixels on every side, clamped to a non-negative rectangle. The default background is opaque DOS colour 0, the default text is DOS colour 15, and image, colour and translucency settings replace only their corresponding defaults. The default reveal rate is 60 glyphs per second, converted to whole fixed-60-Hz ticks; `textspeed(0)` reveals immediately, a negative value other than zero raises `builtin.bad-arg`, and a positive value changes the rate without waiting. See [`rpgcode-functions.md#reawakened-message-window-defaults`](../spec/engine/rpgcode-functions.md#reawakened-message-window-defaults) (E-55) and [`display-input-audio.md#e-50`](../spec/engine/display-input-audio.md#e-50).

**If the answer differs.** Amend the E-55/defaults rule (and any affected logical-resolution wording) first; then deliberately update message-window/text-speed goldens and their G5 ledger classification.

### 4. `msgBox` layout and button behaviour

**Question for the TK-side engineer.** How is a message box placed and sized? Where do its title and body go, how does text wrap, and where are the OK or YES/NO buttons placed and ordered? Which button is selected first, what does the stretch between buttons measure, and what does the call do while it waits for a choice?

**Affects.** Entry 4.21's `msgBox`/`msgbox` command and cursor-map wait; entry 4.25's cursor-map input and UI draw list; entry 4.29's modal-UI contract.

**Reawakened default now in force.** The panel is centred on the logical surface at 60% width and 22% height with an 8-pixel inner margin. The title occupies the top inner row and the body wraps below using current font metrics. Style 0 displays one centred `OK` button; style 1 displays `YES` then `NO` left-to-right. Buttons are 16 pixels high with 8-pixel gaps, index 0 is selected, and the command yields `render.msgbox` until a cursor-map key selects a button. Explicit colours or a bitmap replace only their defaults; invalid styles raise `builtin.bad-arg`. See [`rpgcode-functions.md#reawakened-msgbox-layout`](../spec/engine/rpgcode-functions.md#reawakened-msgbox-layout) (E-60).

**If the answer differs.** Amend the E-60 modal-UI rule first, including panel, text, buttons, selection and wait semantics; then deliberately revise `msgBox`/cursor-map goldens and their G5 ledger classification.

### 5. `text()` cell size and coordinates

**Question for the TK-side engineer.** In the ordinary `text(x, y, ...)` command, are x and y character-cell positions or pixels? If they are cells, how wide and high is one cell, what happens to fractional or negative coordinates, and how do new lines and text beyond the screen behave? Is this different from `pixeltext`?

**Affects.** Entry 4.21's `text`, `pixeltext`, `print`, font and layout operations; entry 4.29's presentation text contract; text draw lists and text goldens.

**Reawakened default now in force.** `text` uses stable 8×16 logical-pixel character cells, truncates each coordinate toward zero, and maps `(x, y)` to `(x*8, y*16)`. Newlines advance one 16-pixel row; out-of-range text clips to the target surface. `pixeltext` keeps pixel coordinates, and both use current `FontRef` metrics for glyph layout. See [`rpgcode-functions.md#reawakened-text-cell-size`](../spec/engine/rpgcode-functions.md#reawakened-text-cell-size) (E-56).

**If the answer differs.** Amend the E-56 text-cell rule first, including coordinate conversion, newline and clipping behaviour; then deliberately revise text goldens and their G5 ledger classification.

### 6. Zoom semantics and range

**Question for the TK-side engineer.** When a game calls `zoom(percent)`, is 100 the unscaled view or an added 100 percent? What values are accepted, where is the view anchored, how are pixels sampled, does a later call replace an earlier one, and does the script wait?

**Affects.** Entry 4.22's `zoom` effect and camera/presentation draw lists; entry 4.29's presentation transform contract; the `zoom(int percent)` command.

**Reawakened default now in force.** `zoom` treats 100 as one-to-one and accepts target scales 1–400; other values raise `builtin.bad-arg`. The camera remains centred on its current logical centre, nearest-neighbour sampling is used, and the transform applies immediately to the next draw list. A new call replaces the previous target, `zoom(100)` clears it, and the command does not wait or change world coordinates. See [`rpgcode-functions.md#reawakened-zoom`](../spec/engine/rpgcode-functions.md#reawakened-zoom) (E-59).

**If the answer differs.** Amend the E-59 zoom rule first, including scale interpretation, range, centre, sampling, replacement and waiting; then deliberately revise zoom goldens and their G5 ledger classification.

### 7. Cursor hand image, hot spot and stretching

**Question for the TK-side engineer.** What picture is used for the cursor-map hand when no custom picture is supplied, what are its exact dimensions and hot spot, and what does the stretch option do? Is the ordinary default mouse arrow a separate picture, and where is its hot spot?

**Affects.** Entry 4.25's `cursorMapHand`, cursor-map navigation and `mouseCursor`; entry 4.29's cursor presentation contract; cursor draw lists.

**Reawakened default now in force.** The cursor-map hand is a bundled 16×16 asset with hot spot (1,1); `cursormaphand(..., true)` scales it to 32×32 with nearest-neighbour sampling and `false` keeps 16×16. The separate bundled default arrow is 16×16 with transparent background and hot spot (0,0); `mousecursor("TK DEFAULT",...)` or an empty file restores it instead of using a host cursor. See [`rpgcode-functions.md#reawakened-default-cursors`](../spec/engine/rpgcode-functions.md#reawakened-default-cursors) (E-60/E-61).

**If the answer differs.** Amend the E-60/E-61 cursor rule first, including asset identity, pixels, dimensions, hot spots and stretching; then deliberately revise cursor goldens and their G5 ledger classification.

## Priority 2 — lighting and already-recorded effect rulings

### 8. Light falloff, gradient direction and clipping

**Question for the TK-side engineer.** For an elliptical light, how does brightness change from its centre to its edge? For a gradient, which direction do the two colour points define, and for a clipped gradient where does the colour stop applying? Does the light's stored layer change any of these results?

**Affects.** Entry 4.13's light/shading rasterisation and entry 4.1's shared rendering arithmetic; ellipse lights, linear gradients and clipped gradients in board draw lists.

**Reawakened default now in force.** Lights are baked into shading layer 0 at load and the stored light layer is ignored. Ellipse falloff uses normalized elliptical radius with linear endpoint falloff (1 at centre, 0 at the radius); a gradient uses clamped projection along its two nodes; a clipped gradient uses that projection only inside its polygon/clip shape. The two stored colours are interpolated in fixed-point integer steps and the resulting shade is clamped. See [`display-input-audio.md#reawakened-light-and-raster-arithmetic`](../spec/engine/display-input-audio.md#reawakened-light-and-raster-arithmetic) (E-17).

**If the answer differs.** Amend the E-17 light-falloff rule first, including the curve, direction, clip and layer handling; then deliberately revise light/shading goldens and their G5 ledger classification.

### 9. Earthquake intensity — answered; do not re-ask

**Question status.** This row is already answered by an owner-relayed fact. The engineer's recorded answer is that intensity is a count of passes and also the pixel offset: pass `p` runs four corner frames at `p` pixels (up-left, up-right, down-left, down-right), followed by the reported short delay. The deterministic Reawakened rule uses `i` clamped to 1–10 and `4*i` fixed ticks, with the command blocking; it does not reproduce the reported wall-clock delay. No further question should be relayed for this row.

**Affects.** Entry 4.22's `earthquake`, the shared `shake` primitive and help text; entry 4.29 only consumes that rule; the `earthquake(int intensity)` command.

**Reawakened default now in force.** The normative rule clamps intensity to 1–10 and runs `i` consecutive four-tick `shake` calls with amplitudes increasing by pass, for `4*i` ticks, blocking through the sleep wait. The shared corner cycle and amplitude constant are defined at [`movement-and-collision.md#e-51`](../spec/engine/movement-and-collision.md#e-51), and the command/help rule is at [`rpgcode-functions.md#reawakened-earthquake`](../spec/engine/rpgcode-functions.md#reawakened-earthquake). The owner-relayed pass/pixel/corner/delay fact is recorded in the 2026-10-17 change-log entry of [`the core-rendering ruling plan#plan-change-log`](../../_bmad-output/initiative-rpgtoolkit-reawakened/epic-board-rendering/story-core-rendering-rulings-r-55-r-15-effects-waits-compositor-fontref-and-metrics-plan.md#plan-change-log); it is to be carried into `facts-round-7.md` after review.

**If the answer differs.** Treat that as a new owner decision: amend the cited earthquake and shared-shake rules first, then deliberately revise earthquake goldens and their G5 ledger classification. Do not replace the deterministic tick rule with the reported wall-clock delay without an explicit doc-first ruling.

### 10. R-15 colour-key replacement scope — settled; do not re-ask

**Question status.** This is already settled by the owner's R-15/A-2 ruling, not an unanswered extraction gap: does replacing pure white with (245,245,245) and pure black with (10,10,10) happen only when the full pre-summed tint is non-zero? Yes. With zero tint, source white and black stay exact.

**Affects.** Entry 4.1's shared shading contract and entry 4.13's tile/light rasterisation; tile and tile-built-sprite draw lists.

**Reawakened default now in force.** Under a non-zero full pre-summed tint, replace pure white and pure black before adding shade/ambient and clamp once; under zero tint, preserve source colours exactly. See [`tiles.md#shading`](../spec/formats/tiles.md#shading) and the matching shading arithmetic in [`board.md`](../spec/formats/board.md).

**If the owner later changes the settled answer.** Amend both cited shading rules first, then deliberately revise affected shaded and unshaded tile/sprite goldens and their G5 ledger classification. This is not a question for the TK-side engineer in this round.

## Priority 3 — low-priority projection question

### 11. 2D-tile projection on isometric boards

**Question for the TK-side engineer.** When an ordinary square 2D tile is put on an isometric board, how is it squeezed and rotated into the diamond, which edge pixels are included, and what happens outside the diamond? Is the rule the same for every isometric layout?

**Affects.** Entry 4.17's isometric fixtures, entry 4.18's isometric compositor and entry 4.6's draw/replay path; ordinary 2D tiles placed on iso boards.

**Reawakened default now in force.** A 32×32 source tile is projected to a 64×32 diamond with a fixed nearest-neighbour affine map; integer floor/round rules are fixed beside the compositor formula, pixels outside the exact diamond mask are transparent, and the draw command sets `blit.iso2d: true`. This is explicitly a non-parity Reawakened rule. See [`tiles.md#reawakened-iso2d-projection`](../spec/formats/tiles.md#reawakened-iso2d-projection), [`display-input-audio.md#reawakened-iso2d-projection`](../spec/engine/display-input-audio.md#reawakened-iso2d-projection) (E-53).

**If the answer differs.** Because this is a low-priority non-parity rule, amend both cited projection anchors first, then deliberately revise the isometric fixture/oracle goldens and their G5 ledger classification.
