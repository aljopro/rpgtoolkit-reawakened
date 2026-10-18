<!-- Owner-relayed fact sheet, clean-room extraction round 7 (ADR 0006). Status: prose facts as relayed by the owner, not yet folded into docs/spec/; each ruling that uses them is its own doc-first commit (G7). Questions: questions-round-7.md. -->

# Clean-room extraction, round 7 — answers (OWNER-RELAYED SUMMARY)

* **Source consulted:** not stated. The answerer is the TK-side engineer. The owner relayed a *summary of where each answer differs from our default*; the full answer prose is not in this repository, so nothing below goes beyond that summary.
* **Answerer:** Jensen's TK-side engineer contact, relayed by the owner on 2026-10-17. The transcript is not given to implementers (ADR 0006 decision 1).
* **Date:** 2026-10-17
* **Questions answered (fully or partly):** Q1 to Q8 and Q11 of `questions-round-7.md`. Q9 (earthquake) and Q10 (R-15) were not asked; both are already settled.
* **Confidence labels:** a label is recorded only where the owner gave one. Where none was given, the row says *owner-relayed, confidence not stated*; high confidence is **not** assumed. Nothing was observed in a running game as far as this summary says.
* **Review:** no separate reviewer agent has read the answerer's original prose; the owner relayed a summary only. Implementers must treat every row as an owner-relayed behaviour statement.
* **Wording rewrites:** one phrase in the summary described how the legacy program is organised rather than what a player sees, and is rewritten as behaviour (see Q8). The Zoom-duration caveat refers to how the answerer arrived at the figure; it is kept as a statement of confidence, not of structure.
* Everything below is behaviour prose; no source expression is reproduced.

---

**Q1. Fade types, ramps and timing.** *Owner-relayed, confidence not stated.*
* The type numbers do **not** match our default's out / in / out-then-in / crossfade table. Each legacy type is a stepped visual effect:
  * 0: a growing box. This is also what happens when no argument is given.
  * 1: stripes sweeping across the screen.
  * 2: a grey ramp.
  * 3: a sliding grey strip.
  * 4: black ellipse rings.
  * 5: a colour overlay.
* There is no fixed duration.
* A type outside the range does nothing (it does not raise `builtin.bad-arg`).

**Q2. Wipe effects 1 to 12 and speed.** *Owner-relayed, confidence not stated.*
* Effects 1 to 4 agree with our default.
* Effects 5 to 8 are diagonals; effects 9 to 12 are push slides.
* The default speed is 1.
* The speed unit is pixels per redraw, scaled by the frame rate.
* Speed 0 hangs the program.
* No final full-image draw happens, so the old image can remain on screen when the call returns.

**Q3. Message-window geometry, margins, text speed and colours.** *Owner-relayed, confidence not stated.*
* The window is fixed at 600 by 100 pixels, centred horizontally, at the top of the screen, with no margin.
* Default translucency is 50%.
* Text appears all at once.
* `textspeed` is obsolete and raises an error on any argument.
* The summary says nothing about default background and text colours or negative speeds: **unanswered**.

**Q4. `msgBox` layout and buttons.** *Owner-relayed, confidence not stated.*
* The panel is sized from the wrapped text.
* Buttons are 80 by 28 pixels and read "Yes" and "No".
* The title is merged into the body text.
* Return codes are 1 for OK, 6 for Yes and 7 for No.
* The wrap rule, button placement and order, initial selection, spacing and wait behaviour are **unanswered** (the summary says nothing about them).

**Q5. `text()` cell size and coordinates.** *Owner-relayed; confidence not stated for the cell size and coordinate base; **newline behaviour is MEDIUM confidence**.*
* A cell is one font size square, not 8 by 16.
* Coordinates are 1-based.
* The newline behaviour was answered with MEDIUM confidence; the summary does not give its content, so it is **not recorded here and must not be invented**.
* Fractional and negative coordinates, clipping, and the difference from `pixeltext` are **unanswered**.

**Q6. Zoom semantics and range.** *Owner-relayed, confidence not stated for the first two points; **the duration figure is LOW confidence**.*
* The argument is a shrink amount, not a scale.
* Each call blocks until it has finished.
* The answer says a call runs for minutes at 60 frames per second. This came from reading the timing arithmetic, not from running a game: **LOW confidence**.
* Accepted range, anchor, sampling and replacement are **unanswered** (nothing beyond the above in the summary).

**Q7. Cursor hand image, hot spot and stretching.** *Owner-relayed, confidence not stated.*
* The bundled hand and arrow images are both 32 by 32 pixels.
* The hand has no hot spot; it is drawn at an offset of (-40, -10) from the map point.
* The stretch option, the arrow's hot spot and details beyond the above are **unanswered**.

**Q8. Light falloff, gradient direction and clipping.** *Owner-relayed, confidence not stated.*
* Gradient direction, baking into layer 0 and ignoring the stored light layer agree with our default.
* Legacy lighting does not clamp the result. *(Rewritten from the summary's description of a "light routine"; the fact is that the displayed result is not clamped.)*
* The ellipse boundary is excluded from the lit area.

**Q9 and Q10.** Not asked in this round; both are already settled (earthquake: owner-relayed fact in the 2026-10-17 change-log entry of the core-rendering ruling plan; R-15: the owner's R-15/A-2 ruling).

**Q11. 2D-tile projection on isometric boards.** *Owner-relayed, confidence not stated.*
* The legacy conversion averages pairs of pixels rather than choosing the nearest pixel.
* The opaque diamond is 62 pixels wide.
* Edge pixels, behaviour outside the diamond and layout differences are **unanswered**.

---

## What remains unanswered or partial

* **Fully unaddressed sub-questions:** Q3 default colours and negative speed; Q4 wrap rule, button placement, selection and waiting; Q5 fractional/negative coordinates, clipping and `pixeltext`; Q6 range, anchor, sampling and replacement; Q7 stretch option and arrow hot spot; Q11 edge pixels and outside-diamond handling.
* **Low or medium confidence:** Q6 duration (LOW); Q5 newline behaviour (MEDIUM, content not relayed).
* **Not observed:** the summary does not claim any answer was observed in a running game.

---

## Round 7 decisions (Proposed ruling, pending owner review)

These are the doc-first spec amendments made from the answers above (G7). Each row says what was decided, the evidence (the round-7 answer, owner-relayed) and the rejected alternative. Confidence is the confidence of the *evidence*; "inferred" marks a Reawakened choice made where the answer was silent.

| Q | Row | Decision | Spec anchor | Evidence confidence | Rejected alternative |
|---|---|---|---|---|---|
| 1 | Fade types | ADOPT types 0 to 5 as stepped effects (0 default when omitted); 30 fixed ticks, blocking (Reawakened determinism choice); other types do nothing. Per-step geometry and end state left to the owner and 4.22's plan | `rpgcode-functions.md#reawakened-fade-types` | not stated; geometry and end state unanswered | Keeping the out/in/out-in/crossfade table (contradicted); inventing exact geometry from a one-word description |
| 2 | Wipe 1 to 4 | KEEP (answer agrees) | `#reawakened-wipe-effects-and-speed` | not stated | none |
| 2 | Wipe 5 to 12 | ADOPT 5 to 8 diagonals, 9 to 12 push slides; corner and direction order is a Reawakened assumption | same | not stated; order unanswered | Keeping centre-out and edges-in as 5 to 8 (contradicted); extra effects 13 to 16 for them (no demand) |
| 2 | Wipe speed | ADOPT default 1; unit pixels per fixed tick (factor 1 for frame-rate scaling, assumption) | same | not stated; scale factor unanswered | Percentage progress with default 4 (contradicted) |
| 2 | Wipe speed 0 | KEEP a defined failure: `builtin.bad-arg` (legacy hangs); negative treated alike | same | not stated | One-tick completion for 0 (hides an author mistake); reproducing the hang (G1/determinism) |
| 2 | Wipe final frame | ADD final exact-image draw (legacy can leave the old image) | same | not stated | Reproducing the stale image |
| 3 | Message window | ADOPT 600 × 100 centred at top, no margin, 50% translucency, text all at once | `#reawakened-message-window-defaults` | not stated | Percentage rectangle with 8-pixel margin (contradicted) |
| 3 | `textspeed` | ADOPT obsolete error on any call | same, and the `textspeed` table row | not stated | Keeping glyphs-per-second reveal (contradicted) |
| 3 | Colours, negative speed | UNANSWERED: colours kept (DOS 0 / 15); negative speed moot | same | n/a | none |
| 4 | `msgBox` | ADOPT sized from wrapped text, 80 × 28 `Yes`/`No`, title merged into body (first line, inferred), returns 1/6/7 | `#reawakened-msgbox-layout` | not stated; wrap rule, placement, selection unanswered (earlier bounds kept) | Fixed 60% × 22% panel with 16-pixel buttons (contradicted) |
| 5 | `text()` cell and base | ADOPT square cell of one font size, 1-based coordinates; origin `((x−1)s, (y−1)s)`. Changes merged 4.8 (PR C) | `#reawakened-text-cell-size` | not stated | Fixed 8 × 16 zero-based cell (contradicted) |
| 5 | `text()` newlines | KEEP one-row advance, now one cell row | same | **MEDIUM**; content not relayed | Inventing a different newline rule |
| 6 | Zoom argument | ADOPT "shrink amount" reading: camera shows `100 − percent` per cent; 0 to 75; owner to review | `#reawakened-zoom` | **LOW** for the unit; not stated for shrink and blocking | Scale reading with 100 one-to-one (contradicted); pixel-shrink reading (unit not given) |
| 6 | Zoom blocking and duration | ADOPT blocking, bounded to 30 ticks; legacy "minutes at 60 fps" not adopted | same | **LOW** (from reading arithmetic, not run) | Adopting minutes-long calls; keeping non-blocking |
| 7 | Cursors | ADOPT both bundled images 32 × 32; hand no hot spot, drawn at (−40, −10) from the map point; arrow hot spot (0,0) kept; stretch policy kept | `#reawakened-default-cursors` | not stated; arrow hot spot and stretch unanswered | 16 × 16 assets with hot spot (1,1) (contradicted) |
| 8 | Light layer, bake, direction | KEEP (answer agrees) | `display-input-audio.md#reawakened-light-and-raster-arithmetic`, `board.md#lights` | not stated | none |
| 8 | Clamping | KEEP our single final clamp (deliberate departure; legacy does not clamp) | same | not stated | Removing the clamp (unbounded shades, determinism and safety) |
| 8 | Ellipse boundary | ADOPT excluding the boundary; built code and the S-LIGHT-ELLIPSE oracle still include it, so ticket 4.34 follows | same | not stated | Keeping inclusive boundary (our falloff includes it) |
| 11 | Iso2d averaging, 62-wide diamond | DEFER: recorded in both iso2d anchors, no rule change (non-parity rule; 4.18 is building on it) | `tiles.md#reawakened-iso2d-projection`, `display-input-audio.md#reawakened-iso2d-projection` | not stated | Changing the rule now under 4.18 |

### Decisions the owner should look at hardest

1. **Zoom (Q6, LOW):** the unit of the "shrink amount" is not in the answer; the percent-of-view reading and the 30-tick bound are inferences.
2. **Fade (Q1):** only visual names were relayed; the geometry, end state and colours are unspecified, and 4.22's plan must settle them.
3. **Wipe speed (Q2):** one pixel per tick is 640 ticks across a 640-wide surface (about 10.7 seconds); the frame-rate scale factor was not relayed. Diagonal corners and push directions are assumptions.
4. **Light boundary (Q8):** adopting it requires a golden change in follow-up ticket 4.34.
5. **`text` (Q5):** changes the merged 4.8 behaviour and its committed vectors.
