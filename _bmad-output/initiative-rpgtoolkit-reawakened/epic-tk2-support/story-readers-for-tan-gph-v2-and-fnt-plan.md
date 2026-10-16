---
title: 'Readers for .tan, .gph v2 and .fnt'
type: 'feature'
ticket: 7
created: '2026-10-16'
status: in-progress
baseline_revision: '8f2e5b62'
route: 'full'
route_source: 'auto'
risk: 'medium'
context: [
  '{project-root}/docs/guardrails.md',
  '{project-root}/docs/adr/0007-docs-spec-is-the-normative-specification.md',
  '{project-root}/docs/spec/formats/tiles.md',
  '{project-root}/docs/spec/formats/legacy/text-formats.md',
  '{project-root}/docs/spec/formats/legacy/README.md',
  '{project-root}/docs/spec/formats/README.md',
  '{project-root}/docs/format-spec.md',
  '{project-root}/packages/core/src/formats/tileset/dos-palette.ts',
  '{project-root}/packages/core/src/formats/resolver/resolver.ts',
  '{project-root}/packages/core/src/formats/animation/image-reference.ts',
  '{project-root}/_bmad-output/initiative-rpgtoolkit-reawakened/epic-tk2-support/tickets.toml'
]
---

<frozen-after-approval reason="human-owned intent — do not modify unless the human renegotiates">

## Intent

**Problem:** Toolkit 2 games and mixed-era projects build heavily on three distinct tile/font formats:
1. Animated tiles (`.tan`, binary 2.0, `RPGTLKIT TILEANIM`), referenced in board look-up tables (`LUT`) to cycle through frames at runtime (33 files across the archive corpus, all in *Chimeran Empire*, referenced 210 times across 40 boards);
2. Single tiles (`.gph` v2, text, `RPGTLKIT TILE`), both uncompressed and run-length compressed, with 24-bit COLORREF or 8-bit DOS palette pixels (6 files in the corpus: 1 in *Final Destiny*, 5 in *School2Demo*, referenced by character sheets and boards);
3. Bitmap fonts (`.fnt`, text, `RPGTLKIT FONT`), containing 2048 decimal values encoding 256 8×8 1-bit glyph bitplanes (5 files across four games: *Final Destiny*, *Caoquest*, *School2Demo*, *Chimeran Empire*).

None of these three formats has a reader in `core`: `packages/runner-headless/src/dump/formats.ts:84-85` skips `.gph` and `.tan` with "no reader in core yet", `.fnt` is unrecognised, and board LUTs or animation frames referencing `.tan` and `.gph` cannot resolve their assets or decode their tile contents.

**Approach:**
1. Implement `packages/core/src/formats/tile-animation/`: model (`TileAnimation`), pure reader (`readTileAnimation`), and writer (`writeTileAnimation`) following `docs/spec/formats/tiles.md#animated-tile-tan` (magic `RPGTLKIT TILEANIM`, `i16` major/minor, `i32` speed 1..200, `i32` true frameCount, and `frameCount` NUL-terminated frame strings).
2. Implement `packages/core/src/formats/single-tile/`: model (`SingleTile`), pure text reader (`readSingleTile`), writer (`writeSingleTile`), and RGBA expander (`expandSingleTileToRgba`) following `docs/spec/formats/tiles.md#single-tile-gph` (magic `RPGTLKIT TILE`, major 2, minor 0, detail 1..6 determining 32×32 or 16×16 dimensions, compression 0 uncompressed or 1 RLE, `-1` transparent key, COLORREF or `DOS_PALETTE` lookup).
3. Implement `packages/core/src/formats/font/`: model (`LegacyFont`), pure text reader (`readLegacyFont`), writer (`writeLegacyFont`), and glyph bitmap accessor (`glyphBitmap`) following `docs/spec/formats/legacy/text-formats.md#font-toolkit-2-text` (magic `RPGTLKIT FONT`, version 2, subversion 0, and 2048 decimal line values for 256 8×8 bitplanes).
4. Update `classifyImageReference` in `packages/core/src/formats/animation/image-reference.ts` and add `resolveTileReference` in `packages/core/src/formats/resolver/` so referencing boards and animations correctly recognize and resolve `.tan` and `.gph` tiles under `Tiles/`.
5. Keep changes to `core-decoders.ts` and `dump/formats.ts` minimal or deferred to ticket 16.8 ("Register the TK2 decoders in the format registry") to ease rebasing with concurrent sibling builds (16.4, 16.5, 16.6).

## Boundaries & Constraints

**Always:**
- Implement strictly from `docs/spec/` (G7).
- Keep `core` free of DOM, Node, I/O, timers, `Math.random`, `Date` and unapproved math functions (G1, G2, G3).
- Return a located `FormatError` (`path`, `offset`, `section`, `message`) on invalid or truncated data; never throw (AD-18).
- Validate counts and geometry before allocating buffers (AD-17, `docs/spec/formats/README.md:63`).
- Preserve case-folding and path normalization rules per §1.5 (`\` to `/`, ASCII case-insensitive).
- Ensure all 33 `.tan`, 6 `.gph`, and 5 `.fnt` files parse with 0 trailing bytes and referencing boards resolve them.

**Never:**
- Open or inspect `../rpgtoolkit` (G7).
- Add runtime dependencies (G6).
- Change `golden/legacy-corpus.json` or modify dump baselines prematurely (G5).
- Mutate shared decoder registry structures beyond what is required, leaving full registry cutover to ticket 16.8.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Valid binary `.tan` | 69-byte `water.tan` (`speed = 5`, `frameCount = 3`, 3 frames) | `TileAnimation` with speed 5, 3 frame strings, 0 residue | — |
| Valid `.tan` with 0 speed | `speed = 0` in header | Refused before reading frames | Located error citing `format-spec §3.5` (division by zero) |
| Negative `.tan` speed | `speed < 0` in header | Refused | Located error at speed offset |
| Negative `.tan` frame count | `frameCount < 0` | Refused | Located error citing count rule |
| Oversized `.tan` frame count | `frameCount > remaining bytes` | Refused before frame loop | Located error naming declared count vs remaining bytes |
| `.tan` trailing residue | Extra bytes after last frame string | `residue` captured, warning emitted | Warning, parse succeeds |
| Corrupt `.tan` magic | Magic is not `RPGTLKIT TILEANIM` | Refused at offset 0 | Located error naming read magic |
| Truncated `.tan` | Any byte cutoff in header or strings | Returns `ok: false`, never throws | Located error at truncated field |
| Valid v2 `.gph` uncompressed | 1029 lines `tile_v2_uncompressed.gph` (detail 1, compression 0) | `SingleTile` 32×32 with 1024 pixel values | — |
| Valid v2 `.gph` compressed | 2053 lines `tile_v2_compressed.gph` (detail 1, compression 1) | `SingleTile` 32×32 with 1024 expanded pixel values | — |
| Valid v2 `.gph` detail 2 | `tile_v2_detail2.gph` (detail 2, 16×16) | `SingleTile` 16×16 with 256 expanded pixel values | — |
| `.gph` with VB6 whitespace | Numbers formatted with leading/trailing spaces (`" 2 "`, `"-1 "`) | Whitespace trimmed, numbers parsed cleanly | — |
| `.gph` v1 file (TK1) | 288-byte `tile_v1.gph` (no `RPGTLKIT TILE` header) | Refused with helpful message that v1 is out of scope | Located error at offset 0 |
| Invalid `.gph` detail | `detail = 7` or `0` | Refused | Located error naming invalid detail |
| Invalid `.gph` compression | `compression = 2` | Refused | Located error naming invalid compression flag |
| Incomplete `.gph` runs | Run-length sum does not reach `width × height` | Refused | Located error naming short pixel count |
| Overflowing `.gph` runs | Run-length sum exceeds `width × height` | Refused | Located error naming over-long run |
| `.gph` expand to RGBA | Detail 1/2 COLORREF, detail 3/5 DOS palette, `-1` transparent | Straight RGBA buffer of `width × height × 4` bytes | — |
| Valid `.fnt` font | Exactly 2051 lines (`RPGTLKIT FONT`, 2, 0, 2048 values) | `LegacyFont` with 2048 bytes (256 glyphs of 8 rows) | — |
| `.fnt` wrong magic | Line 1 is not `RPGTLKIT FONT` | Refused at line 1 | Located error |
| `.fnt` wrong version | Version line not 2 or subversion not 0 | Refused | Located error citing version |
| `.fnt` truncated lines | Fewer than 2051 lines | Refused | Located error naming line count |
| `.fnt` value out of range | Line value `< 0` or `> 255` | Refused | Located error naming invalid value |
| Board LUT referencing `.tan` | Board LUT slot holds `"water.tan"` | `resolveTileReference` resolves to `tiles/water.tan` | — |
| Board LUT referencing `.gph` | Board LUT slot holds `"flower.gph"` | `resolveTileReference` resolves to `tiles/flower.gph` | — |
| Animation frame referencing `.gph` | Frame image string is `"flower.gph"` | `classifyImageReference` classifies as `singleTile` | — |

</frozen-after-approval>

## Code Map

**The rulings and specs.**
- `docs/spec/formats/tiles.md#animated-tile-tan`: binary layout of `.tan` (format-spec §3.5, §15.10).
- `docs/spec/formats/tiles.md#single-tile-gph`: text layout of `.gph` v2 (format-spec §3.2, §15.11).
- `docs/spec/formats/legacy/text-formats.md#font-toolkit-2-text`: layout of `.fnt` (format-spec §15.12).
- `docs/spec/formats/README.md#tile-references`: grammar of tile references (`name.tstN`, `name.isoN`, `name.gph`, `name.tan`).
- `docs/spec/formats/animation.md:18`: animation frame image references accepting tile references including `.gph`.

**The code to change and add.**
- `packages/core/src/formats/tile-animation/` (new):
  - `model.ts`: `TileAnimation` interface and constants (`TILE_ANIMATION_MAGIC`, `TILE_ANIMATION_SECTION`).
  - `reader.ts`: `readTileAnimation(reader: BinaryReader): Result<TileAnimation>`.
  - `writer.ts`: `writeTileAnimation(writer: BinaryWriter, model: TileAnimation): Result<void>`.
  - `index.ts`: module exports.
- `packages/core/src/formats/single-tile/` (new):
  - `model.ts`: `SingleTile` interface and constants (`SINGLE_TILE_MAGIC`, `SINGLE_TILE_SECTION`).
  - `reader.ts`: `readSingleTile(source: string | Uint8Array, path?: string): Result<SingleTile>`.
  - `writer.ts`: `writeSingleTile(model: SingleTile): string`.
  - `rgba.ts`: `expandSingleTileToRgba(tile: SingleTile): Result<Uint8Array>`.
  - `index.ts`: module exports.
- `packages/core/src/formats/font/` (new):
  - `model.ts`: `LegacyFont` interface and constants (`FONT_MAGIC`, `FONT_SECTION`).
  - `reader.ts`: `readLegacyFont(source: string | Uint8Array, path?: string): Result<LegacyFont>`.
  - `writer.ts`: `writeLegacyFont(font: LegacyFont): string`.
  - `glyph.ts`: `glyphBitmap(font: LegacyFont, glyphCode: number, inkRgba?, bgRgba?): Uint8Array`.
  - `index.ts`: module exports.
- `packages/core/src/formats/animation/image-reference.ts`:
  - Extend `ImageReference` union with `{ readonly kind: "singleTile"; readonly path: string }`.
  - Recognize `.gph` in `classifyImageReference`.
- `packages/core/src/formats/resolver/`:
  - Add `resolveTileReference(index: AssetIndex, root: AssetRoot, ref: string)` helper in `resolver.ts` and `index.ts`.
- `packages/core/src/formats/index.ts`:
  - Re-export `tile-animation`, `single-tile`, and `font`.
- Tests:
  - `packages/core/test/format-tile-animation.test.ts` (new): unit tests, edge cases, round-trips, and real corpus checks.
  - `packages/core/test/format-single-tile.test.ts` (new): uncompressed, compressed RLE, details 1..6, RGBA expansions, edge cases.
  - `packages/core/test/format-font.test.ts` (new): 2051-line layout, 2048 values, glyph bitplanes, error handling.
  - `packages/core/test/format-resolver.test.ts`: test resolution of `.tan` and `.gph` from board LUTs and animation frames.
  - `packages/core/test/format-animation.test.ts`: test `.gph` classification.

## Tasks & Acceptance

**Execution:**
- [ ] `docs/spec/formats/tiles.md` (edit) — doc-first commit: update "Readers not yet built" to note that `.tan` and `.gph` readers are now implemented.
- [ ] `packages/core/src/formats/tile-animation/` (new) — implement `TileAnimation` model, `readTileAnimation`, and `writeTileAnimation`.
- [ ] `packages/core/src/formats/single-tile/` (new) — implement `SingleTile` model, `readSingleTile`, `writeSingleTile`, and `expandSingleTileToRgba`.
- [ ] `packages/core/src/formats/font/` (new) — implement `LegacyFont` model, `readLegacyFont`, `writeLegacyFont`, and `glyphBitmap`.
- [ ] `packages/core/src/formats/animation/image-reference.ts` (edit) — extend `ImageReference` and `classifyImageReference` for `.gph`.
- [ ] `packages/core/src/formats/resolver/` (edit) — export `resolveTileReference` and tile reference resolution helpers.
- [ ] `packages/core/src/formats/index.ts` (edit) — export the new format modules.
- [ ] Unit test suites — add `format-tile-animation.test.ts`, `format-single-tile.test.ts`, `format-font.test.ts`, and update resolver/animation tests.
- [ ] Corpus validation — verify all 33 `.tan`, 6 `.gph`, and 5 `.fnt` files parse with 0 trailing bytes and referencing boards resolve them.

**Acceptance Criteria:**
- Given `water.tan` or any of the 33 corpus `.tan` files, when read by `readTileAnimation`, it returns `ok: true`, correct speed and frame count, and 0 residue.
- Given `tile_v2_compressed.gph`, `tile_v2_uncompressed.gph`, or any of the 6 corpus `.gph` files, when read by `readSingleTile`, it returns `ok: true` with exactly `width × height` pixels.
- Given any of the 5 corpus `.fnt` files, when read by `readLegacyFont`, it returns `ok: true` with exactly 2048 decimal glyph row values.
- Given an invalid speed (0 or negative), invalid counts, truncated inputs, or malformed magic, the readers return `ok: false` with located `FormatError`s and never throw.
- Given an animation frame referencing `flower.gph`, `classifyImageReference` classifies it as `singleTile`.
- Given a board LUT slot referencing `water.tan` or `flower.gph`, `resolveTileReference` resolves the asset key under `tiles`.
- All repo checks (`pnpm typecheck`, `pnpm test`, `pnpm lint`, `pnpm graph`, `pnpm provenance`, `pnpm licence`, `pnpm golden`) pass with 0 errors.

## Implementation Notes

- **Pure TypeScript:** All parsing is done in pure memory without Node I/O, timers, or DOM (G2).
- **Whitespace handling in text formats:** VB6 writes non-negative numbers with leading and trailing spaces (` 2 `) and negative numbers with trailing spaces (`-1 `). All string-to-number parsing trims whitespace per line.
- **Run-length accumulation:** For compressed `.gph`, run lengths continue from column to column until the full `width × height` grid is populated.
- **Font bitplane representation:** In `.fnt`, each decimal value represents one 8-pixel row of an 8×8 glyph, with MSB (bit 7) as the leftmost pixel and `1` representing ink.
