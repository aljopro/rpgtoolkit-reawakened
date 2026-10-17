# 2D oracle scene schema

A scene is a versioned JSON object consumed by `render.py`, not a renderer-specific fixture program.

- `schema`: integer `1`.
- `name`: stable scene identifier; it also names the output PNG.
- `boardFiles`: non-empty paths relative to the repository root. The first path is the `.brd`; following paths declare assets used by the scene.
- `sprites`: `SpriteDraw` records with `id`, `key`, `layer`, pixel reference `x`/`y`, stable `drawId`, and optional previous `prev: [x,y]` and `under` flag vector.
- `ambient`: signed RGB offsets applied in addition to the board ambient.
- `view`: logical `viewport: [width,height]`, `camera: [x,y]`, and booleans `include.shading`, `include.images`, `include.sprites`. Optional `smallBoard: "center-if-small"`, layer-image descriptors and blit descriptors are plain data.
- `tick`: non-negative fixed simulation tick used to select animated frames.

`render.py` validates every field and rejects malformed or unversioned scenes before loading assets. It reads formats via `docs/spec/tools/rpgtk_formats.py`, and compares generated PNGs by decoded RGBA pixels. The ledger, not a PNG filename convention, defines the oracle class and gating policy.
