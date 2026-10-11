---
title: 'Pre-vector board converter'
type: 'chore'
ticket: '8'
created: '2026-10-11'
status: 'done'
baseline_revision: '05de90ce8dd865a5ad69d53662c9d85e7040683a'
route: 'full'
route_source: 'auto'
risk: 'medium'
review: 'quick'
review_source: 'pinned'
lenses_ran: ['quick']
review_loop_iteration: 1
context: ['{project-root}/docs/guardrails.md', '{project-root}/docs/format-spec.md', '{project-root}/_bmad-output/initiative-rpgtoolkit-reawakened/architecture-rpgtoolkit-reawakened/architecture-rpgtoolkit-reawakened.md']
---

<frozen-after-approval reason="human-owned intent — do not modify unless the human renegotiates">

## Intent

**Problem:** The vector board reader of AD-18 refuses minors 2–3 and points at the pre-vector layout of format-spec §4.8, because those boards store object positions in tile coordinates and collision as a per-tile type rather than as geometry. Until they are read and converted, a legacy 3.0.x project cannot load at all: entry 2.5 covers only minor ≥ 4, and the corpus of sample games ships no minor 2–3 board.

**Approach:** Add `packages/core/src/formats/board/pre-vector-reader.ts` for the §4.8 binary layout (minors 2 and 3) and `pre-vector-convert.ts` for §4.8's conversion rules into the existing vector `Board` model of §4.2: per-tile-type vectorization, program trigger regions, shading flattened into layer 0, and tile → pixel positions for the start point and the sprites. Both are pure and deterministic (G2, G3): the reader consumes a `BinaryReader` and returns a located `Result`, and the converter is a pure function of the model, so the same bytes always produce the identical `Board`.

## Boundaries & Constraints

**Always:** `core` stays pure (G2): no DOM, no Node, no `Buffer`, no `process`, no imports of other packages. Determinism (G3): only the allowlisted `Math` members (`Math.min` here), no `**`, no `Date`/`performance`/`Intl`/`Math.random`. Every implementing file names its `docs/format-spec.md` section (G7). One public entry per package (AD-22): the new modules are re-exported from `board/index.ts`, which `formats/index.ts` already re-exports. `kebab-case.ts` files, `PascalCase` types, `camelCase` functions. The landed vector reader, writer and model are untouched.

**Never:** add a runtime dependency; change the behaviour of the minor ≥ 4 reader or writer; edit `golden/**`; touch the legacy GPL source; invent geometry the spec does not pin (it is recorded instead).

</frozen-after-approval>

## Tasks & Acceptance

**Execution:**
- [x] `packages/core/src/formats/board/pre-vector-reader.ts` — `readPreVectorBoard(reader) -> Result<PreVectorBoard>`, the §4.8 layout exactly: header (`str magic`, `i16 major`, `i16 minor` 2 or 3, byte 14 must be 0), the reserved registration pair (`i16`, `str`), `sizeX/sizeY/sizeL`, `startX/startY/startLayer` in tiles, `disableSaving`, the LUT (`i16` bound then `str` × bound+1, index 0 the "no tile" entry), the tile matrix (row-major within a layer; `i16 < 0` is a run marker `count = -value` followed by `i16 index, i16 r, i16 g, i16 b, i8 tileType` covering `count` cells; a non-negative value is a plain `i16 r, i16 g, i16 b, i8 tileType` for one cell), the background/foreground/border image strings, the background and border colours, the ambient preset, the four links in the order **N, S, E, W**, `battleSkill`, `battleBackground`, `allowBattles`, the day/night fields (`i16 × 3`, `str`), the `i16 × 11` constants, the background music, the `str × 9` layer titles, the programs (positions in tiles), `enterPrg`, the reserved string, the sprites (positions in tiles), and — only when minor ≥ 3 — the `i32` thread list and the `i8 coordType`. Refuses minor 0–1 and minor ≥ 4 and points at the right layout; a non-zero byte 14 is a text board; a wrong magic or a short file is a located `FormatError`.
- [x] `packages/core/src/formats/board/pre-vector-convert.ts` — `convertPreVectorBoard(board) -> Result<Board>` applying §4.8's conversion rules: tile-type vectorization (0 → nothing; 1 → closed TT_SOLID polygon; 2 → closed TT_UNDER with `TA_BRD_BACKGROUND`; 3/4 → open TT_SOLID polylines along the blocking edges; 11–18 → closed TT_STAIRS with `attributes = tileType − 10`), program trigger regions (a closed 32×32 rectangle, or §4.8's 64×32 diamond on an iso-stacked board), shading flattened into shade layer 0 with the cast layer at the highest shaded layer, and the tile → pixel conversion of the start point and the sprite positions via §5/§4.6 (with §4.8's `(64, 64)` on layer 1 fallback). The converted board's minor is 4 and its `coordType` the source's; every old program gets `activationType |= PRG_STOPS_MOVEMENT`; sprite loading conditions equal the activation conditions; legacy `!`/`$` variable suffixes are stripped.
- [x] `packages/core/src/formats/board/index.ts` — re-export both new modules; the landed reader/writer/model untouched.
- [x] `packages/core/test/format-board-pre-vector.test.ts` — synthetic minors 2 and 3 boards built byte by byte, covering runs that wrap a row end and a layer boundary, every converted tile type, a program rectangle, multi-layer shading, positions, determinism and the located errors.
- [x] `_bmad-output/initiative-rpgtoolkit-reawakened/deferred-work.md` — one entry for the §4.8 gaps that need a doc/human decision (below).
- [x] `tickets.toml` entry 8 — no change needed; the plan file marks it done.

**Acceptance Criteria:**
- Given a synthetic minor 2 or 3 board, `readPreVectorBoard` returns the exact layout and `convertPreVectorBoard` returns a `Board` with `minor === 4`, the source `coordType`, the vectorized geometry, the flattened shading and pixel positions.
- Given a run marker that wraps a row end or a layer boundary, the expanded matrix matches the §4.8 traversal order.
- Given a program at tile `(x, y)`, the converted program's points are the closed 32×32 rectangle `((x−1)·32, (y−1)·32)`–`(x·32, y·32)` (or the iso-stacked diamond) and its `activationType` carries the stops-movement bit.
- Converting the same bytes twice gives deep-equal boards (G3).
- Minor 0–1, minor ≥ 4, a wrong magic, a non-zero byte 14 and a truncated file all return located `FormatError`s, never throws.

## Implementation Notes

- **No minor 2–3 sample exists.** All three `.brd` files in the fetched corpus (`demo/Boards/start.brd`, `demo/Boards/out.brd`, `Basic/Boards/start.brd`) are minor 4 — verified from their headers (byte 14 is `0`, the minor field at bytes 17–18 is `4`). There is therefore no real pre-vector board to pin against, and §4.8 is pinned entirely by synthetic fixtures built byte by byte. The test file carries a guarded scan that converts any minor 2–3 board if one ever appears under `fixtures/legacy/`, and otherwise records that none exists.
- **Grid.** §4.8 gives the tile matrix as `sizeX/sizeY/sizeL` in z, y, x order and never states §4.2's `(sizeX + sizeY)²` effective grid. The reader therefore always reads `sizeX × sizeY` cells per layer — the only reading a reader can apply, since `coordType` is the final field and cannot be known before the matrix.
- **Iso-rotated is refused.** §4.8 records no mapping from the `sizeX × sizeY` pre-vector matrix onto §4.2's `(sizeX + sizeY)²` rotated grid, and its program-region rule names only the iso-stacked diamond. `convertPreVectorBoard` returns a located error rather than guess; recorded for a doc fix.
- **Iso-stacked is converted.** §5 gives the tile centre for a stacked board and §4.6 the 64×32 diamond, so a tile vector and a program region are both that diamond; tile vectors are emitted per tile because the merged-run rule has no diamond analogue.
- **Merge rule.** §4.8 says "merge contiguous non-zero tiles into vector geometry" but not how. A 2D board merges each maximal horizontal run of one type into one rectangle; passages emit both blocking edges per tile.
- **Shading.** §4.8 does not define how differing per-layer shades combine. They are summed per cell (shades are additive offsets, §4.5), the cast layer is the highest layer with any non-zero shade, and a board with no shading gets no shade layer.
- **Constants and titles.** §4.8's eleven constants are numeric and become their decimal strings in the §4.2 `constants` list; the nine fixed layer titles fill `sizeL + 1` entries, padded with empty strings when `sizeL + 1 > 9`.
- **Unused fields dropped on conversion:** the foreground and border images, the border colour, the day/night fields and the reserved trailing string have no §4.2 field; the background image becomes a parallax background (`backgroundDrawType = 1`), and the ambient preset maps to its §4.8 offsets (unknown presets become none, with a warning).

