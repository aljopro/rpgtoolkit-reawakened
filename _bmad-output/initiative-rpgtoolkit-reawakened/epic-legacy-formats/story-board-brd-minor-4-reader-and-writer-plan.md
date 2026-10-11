---
title: 'Board (.brd) minor 4 reader and writer'
type: 'chore'
ticket: '5'
created: '2026-10-11'
status: 'done'
baseline_revision: 'edf9d3840b748d6cd587c0a12ac406db139f0fa1'
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

**Problem:** A board is the scene container of a Toolkit game — a 3-D grid of tiles beside images, collision and trigger geometry, sprites, lighting and per-board settings. Nothing reads the 3.1.0 vector layout (`RPGTLKIT BOARD`, minor ≥ 4) yet, so the headless runner has no boards to load. The layout is the densest in the corpus: a lookup table, a run-length tile matrix whose runs wrap rows and layers, run-length shading, lights, four kinds of vector geometry, program regions, sprite slots, then the trailing board properties.

**Approach:** Add `packages/core/src/formats/board/` on the ticket-2.1 `Result`/`FormatError` contract (AD-18) and `BinaryReader`/`BinaryWriter` (§1). `readBoard(reader)` applies the §4.1 dispatch exactly: a non-zero byte at offset 14 is the 2.x text form and is refused; minors 0–1 are refused as obsolete; minors 2–3 are refused with a pointer at the pre-vector layout of §4.8 (ticket 2.8 converts it, not this reader); minor ≥ 4 reads the §4.2 fields in the documented order. `writeBoard(model)` re-emits the version that was read and reproduces the bytes exactly.

## Boundaries & Constraints

**Always:** `core` stays pure (G2): no DOM, no Node, no `Buffer`, no `process`, no other workspace package. Determinism (G3): only the allowlisted `Math` members, no `**`, no `Date`/`performance`/`Intl`/`Math.random`; the module needs no maths at all. Every file names its `docs/format-spec.md` section (G7). One public entry per package (AD-22). `kebab-case.ts` files, `PascalCase` types, `camelCase` functions. Every slot — empty strings included — is kept so LUT, program and sprite indices stay stable (§4.2). Unmodelled bytes stay in `residue` so a write is byte-identical (AD-18).

**Never:** convert the pre-vector layout here (ticket 2.8), add a runtime dependency, touch the legacy GPL source, edit `golden/**`, or drop empty slots to "tidy" the model.

</frozen-after-approval>

## Tasks & Acceptance

**Execution:**
- [x] `packages/core/src/formats/board/model.ts` — `Board` and its section types (`BoardTileRun`, `BoardShadeLayer`/`BoardShadeRecord`, `BoardLight`, `BoardVector`, `BoardProgram`, `BoardSprite`, `BoardImage`, `BoardLinks`, `BoardProperties`, `BoardRgb`), the magic/detect-offset/vector-minor constants, and `boardGrid(sizeX, sizeY, coordType)` giving the §4.2/§5 stored grid (`(sizeX + sizeY)²` when the `ISO_ROTATED` bit is set).
- [x] `packages/core/src/formats/board/reader.ts` — `readBoard(reader)`: §4.1 dispatch, then §4.2 in order — dimensions, LUT, run-length tile matrix (decompressed to one LUT index per cell, with the stored runs kept), shading layers, lights, vectors, programs, sprites, images, threads, constants, layer titles, the four links (N, S, E, W) and the trailing properties; trailing bytes become `residue`.
- [x] `packages/core/src/formats/board/writer.ts` — `writeBoard(model)` deriving every bound back from the model's arrays and re-emitting each field in the same order, so an unmodified board writes back byte-for-byte.
- [x] `packages/core/src/formats/board/index.ts` and `packages/core/src/formats/index.ts` — re-exports (one added line).
- [x] `packages/core/test/format-board.test.ts` — synthetic boards pinning the tricky rules (a run wrapping a row end, a run wrapping a layer boundary, a one-cell run marker re-encoded identically, the reserved LUT index 0, shading `runCount` 0/1, `closed = -1`, empty program/sprite slots, an iso-rotated 147-cell matrix, residue), the located errors (text board, wrong magic, minors 0–3, a negative minor, a truncated file, a negative run index), and the three sample boards.

**Acceptance Criteria:**
- Given any minor-4 board, `readBoard` returns every field of §4.2 in order, keeps every slot and consumes the whole file (`reader.remaining === 0`).
- Given the three sample boards, the reader reports zero trailing bytes and `writeBoard` reproduces the input bytes exactly.
- Given a 2.x text board the reader returns a located error at offset 14; given minor 0/1 it says obsolete; given minor 2/3 it names the pre-vector layout and cites §4.8.
- Given a run marker, the decompressed matrix matches the traversal order (runs wrapping rows and layers), and the stored encoding is preserved so the write is byte-identical.

## Implementation Notes

- **Dispatch order.** `BinaryReader.isBinaryAt(14)` does not move the cursor, so the reader can read the header first (as the ticket describes) and still check the detection byte before any header error. A text board cannot yield a matching magic — a matching magic *is* a NUL at offset 14 — so the detection check is total over text boards, including one with no NUL at all.
- **Grid vs. shading.** The stored grid is `sizeX × sizeY` per layer, and `(sizeX + sizeY)²` per layer for iso-rotated boards (coordType bit 2, §5). The tile matrix has `sizeL` such layers; each shading layer covers one grid.
- **RLE kept exact.** `BoardTileRun.marker` records whether the file used a negative marker, so a `-1` marker covering a single cell round-trips as a marker rather than being "normalised" to a bare index. `tileMatrix` is the decompressed view of `tileRuns`; the writer reads `tileRuns`.
- **Bound overruns are warnings, not errors.** A run that covers more cells than the grid leaves gets a `warnings[]` entry and the extra cells are kept, so a permissive read still round-trips. A *truncated* file is still an error from the field's first byte.
- **`closed` and `reserved` are stored verbatim.** `closed` is written back as read (`-1` from legacy VB `CInt(True)`); `reserved` keeps `-1` on sprites and `100` on images.
- **Bounds from lengths.** The writer derives each upper bound as `length - 1` (`-1` for none) so empty slots survive; it fails, located, when a LUT, run, point list or layer-title count cannot fit its field.
- **`tileMatrix` duplicated by design.** Keeping both the decompressed cells and the stored runs is deliberate: the decoded grid is what a renderer wants and the runs are what byte-identity needs.

## Plan Change Log

- 2026-10-11 — initial implementation; spec §4.2 verified field-by-field against the three sample boards before the TypeScript reader was written.

## Review Triage Log

## Design Notes

- No new dependency: `Uint8Array`/`DataView` only, through the shared binary primitives.
- The board files cite `format-spec §4.1` (dispatch) and `format-spec §4.2` (layout) in their headers, and `§4.8` in the minor 2–3 refusal message, per G7.
- A local `fail(offset, section, message, path)` mirrors the tileset/battle readers so every located error in the format layer is built the same way.

## Verification

**Commands (all in the worktree, baseline `edf9d38`):**
- `pnpm install --frozen-lockfile` — exit 0.
- `pnpm typecheck` — exit 0.
- `pnpm test` — exit 0; 188 tests pass, 0 fail, 0 skipped.
- `pnpm lint` — exit 0; `check-core-deps: 1 core runtime dependency matches the allowlist`, eslint clean.
- `pnpm graph` — exit 0; `no dependency violations found (88 modules, 240 dependencies cruised)`.
- `pnpm provenance` — exit 0; `scanned 175 files`, `0 violations`.

**Sample boards (all three: zero trailing bytes, byte-identical round-trip):**
- `demo/Boards/out.brd` — 20×15×2, coordType 4, LUT 34, 600 tile cells, 6 vectors, 1 program, 1 sprite, start (204, 246) layer 1.
- `demo/Boards/start.brd` — 20×11×2, coordType 4, LUT 19, 440 tile cells, 17 vectors, 1 program, 1 sprite, start (213, 146) layer 1.
- `Basic/Boards/start.brd` — 20×15×2, coordType 0, LUT 2, 600 tile cells, 0 vectors, 0 programs, 0 sprites, start (304, 192) layer 1.
