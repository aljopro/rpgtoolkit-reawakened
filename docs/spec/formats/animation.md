# Animation (`.anm`)

A sequence of frames with a fixed delay, used for every sprite stance (walking, idling, battle), for scripts and for battle effects. Animations live in `Misc\`. Animated GIFs can be used anywhere an animation is expected.

Header text: `RPGTLKIT ANIM`. The only accepted minor is **3**; the engine rejects anything else with "This is not a valid animation file". The editor and the engine both write major 2, minor 3.

## Layout

| # | Field | Type | Meaning |
|---|---|---|---|
| 1 | header | string | `RPGTLKIT ANIM` |
| 2 | major | short | 2; ignored |
| 3 | minor | short | must be 3 |
| 4 | width | int | frame width in pixels |
| 5 | height | int | frame height in pixels |
| 6 | frame UB | int | upper bound of the frame list |
| 7 | × (UB+1) frame | | |
| 7a | image | string | an image in `Bitmap\` (any common format or `.tbm`), or a [tile reference](README.md#tile-references) such as `char.tst5` or `x.gph` |
| 7b | transpColor | colour | transparent colour for an image frame (the samples use white, `ff ff ff 00`) |
| 7c | sound | string | sound in `Media\` played when the frame is shown; empty = none |
| 8 | delay | double | seconds between frames |

**Empty frames.** The editor keeps 51 frame slots and writes all of them (UB = 50), most empty. The engine drops frames whose image is empty when playing; a gap in the middle of the list therefore shortens the sequence. The editor counts only up to the last non-empty frame.


## Older versions

Text animations (Toolkit 2) are still read by both original programs; see [legacy/text-formats.md](legacy/text-formats.md#animation).

## Animated GIF

When an animation name ends in `.gif`, the frames are the GIF's pages; the size comes from the first page, the delay from the first page's frame time, and the transparent colour from the first page's background colour (magenta `(255, 0, 255)` if absent).

## Written by the engine

The engine itself writes animations when it converts legacy items, enemies and fight backgrounds (see [legacy/conversion.md](legacy/conversion.md)): minor 3, delay 0.167 s, transparent white.

## Example

[../examples/listings/hero_walk_s.anm.txt](../examples/listings/hero_walk_s.anm.txt) — a two-frame walk animation from the example game.
