# Oracle scene schema

A scene is a versioned JSON object consumed by `render.py`, not a renderer-specific fixture program.

- `schema`: integer `1`.
- `name`: stable scene identifier; it also names the output PNG.
- `layout`: optional `2d`, `iso-stacked`, or `iso-rotated` label; the renderer checks it against the board coordinate type.
- `boardFiles`: non-empty paths relative to the repository root. The first path is the `.brd`; following paths declare assets used by the scene.
- `sprites`: `SpriteDraw` records with `id`, `key`, `layer`, pixel reference `x`/`y`, stable `drawId`, and optional previous `prev: [x,y]` and `under` flag vector. A sprite is drawn on its own layer: after that layer's tiles and before the next layer's, so higher-layer tiles cover it (`docs/spec/formats/board.md#drawing-order-and-effects`); layer 1 also takes any sprite with a lower layer, and sprites above the top layer draw last.
- `ambient`: signed RGB offsets applied in addition to the board ambient.
- Board light sources live in the referenced `.brd` (not in the scene JSON). The independent renderer bakes each static ellipse, gradient, or clipped-gradient light into shading layer 0 at 32×32 tile centres using the fixed-point rules in `docs/spec/engine/display-input-audio.md#reawakened-light-and-raster-arithmetic`; the board's stored light layer is ignored.
- `view`: logical `viewport: [width,height]`, `camera: [x,y]`, and booleans `include.shading`, `include.images`, `include.sprites`. A camera is clamped to the board pixel dimensions; optional `smallBoard: "center-if-small"`, layer-image descriptors and blit descriptors are plain data.
- `tick`: non-negative fixed simulation tick used to select animated frames.

For `iso-stacked` and `iso-rotated`, the board's coordinate type determines the
effective tile grid and the documented pixel dimensions. `.iso` tiles are poured
into the 64×32 diamond using the X-outer/Y-inner file order. Ordinary 32×32 tiles
use the fixed integer nearest-neighbour `iso2d` projection from
`docs/spec/engine/display-input-audio.md#reawakened-iso2d-projection`.

`render.py` validates every field and rejects malformed or unversioned scenes before loading assets. It reads formats via `docs/spec/tools/rpgtk_formats.py`, and compares generated PNGs by decoded RGBA pixels. The ledger, not a PNG filename convention, defines the oracle class and gating policy.
