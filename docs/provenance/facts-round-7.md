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
