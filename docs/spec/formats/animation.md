# Animation (`.anm`)

A sequence of frames with a fixed delay, used for every sprite stance (walking, idling, battle), for scripts and for battle effects. Animations live in `Misc\`. Animated GIFs can be used anywhere an animation is expected.

Header text: `RPGTLKIT ANIM`. The only accepted minor for the binary layout is **3**; the Toolkit 2 line-based text form is minor 0 ([legacy/text-formats.md](legacy/text-formats.md#animation)). Detection is the byte at offset 13: `00` = binary, non-zero = text.

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

When an animation name ends in `.gif`, the frames are the GIF's pages; the size comes from the first page, the delay from the first page's frame time, and the transparent colour from the first page's background colour (magenta `(255, 0, 255)` if absent). **Reawakened rule (R-10):** this is the ruled reading — one delay from the first page, size from the first page, colour from the background colour with the magenta fallback; the GIF decoder's owner is entry 16.12.

## Written by the engine

The engine itself writes animations when it converts legacy items, enemies and fight backgrounds (see [legacy/conversion.md](legacy/conversion.md)): minor 3, delay 0.167 s, transparent white.

## Example

[../examples/listings/hero_walk_s.anm.txt](../examples/listings/hero_walk_s.anm.txt) — a two-frame walk animation from the example game.
