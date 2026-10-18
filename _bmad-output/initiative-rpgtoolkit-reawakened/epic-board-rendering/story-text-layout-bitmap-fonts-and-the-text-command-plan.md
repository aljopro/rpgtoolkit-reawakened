---
ticket: 8
type: feature
status: done
---

# Text layout, bitmap fonts and the text command

## Intent

Delivers core-owned text layout and draw-list emission (AD-15, E-132) without requiring a vector font engine, supporting project-owned bitmap fonts, Toolkit 2 `.fnt` reading, and deterministic reference rasterisation.

## Built components and rulings

- **FontRef structure**: R-55 / AD-15 amendment in `packages/core/src/ports/draw.ts` updates `FontRef` to `{ readonly asset: AssetKey; readonly size: number; readonly bold: boolean; readonly italic: boolean }`. Underline is emitted as a separate `line` command rather than being embedded in `FontRef`.
- **Font resolution and family fallbacks**: `resolveFont` in `packages/core/src/render/text.ts` matches asset names case-insensitively, supporting standard family substitutions (`arial`/`sans-serif` -> `liberation-sans`, `times new roman`/`serif` -> `liberation-serif`, `courier new`/`monospace` -> `liberation-mono`), falling back to the project default bitmap font (`tkr-8x8.fnt`).
- **Deterministic layout and metrics**: `layoutText`, `getTextWidth`, and `getTextHeight` calculate glyph advances, word wrapping at `maxWidth`, and preserve explicit `\n` line breaks across all platforms and runtimes.
- **Text cell truncation**: `emitCellText` maps cell coordinates to pixels using fixed 8×16 cells with truncation toward zero (`Math.trunc(cellX) * 8`, `Math.trunc(cellY) * 16`).
- **Reference rasterisation**: `drawText` in `packages/core/src/raster/raster.ts` renders bitmap font glyphs with synthetic bold (extra pixel at `x + 1`) and synthetic italic (slanted x offset `Math.floor((7 - sourceY) * size / 32)`).
- **Owner help-text rule**: The `text` command BuiltinDoc in `packages/core/src/script/packs/common.ts` provides a clear game-developer summary ("Draw text on the current screen.") followed by exact technical and deterministic execution details without waiting.
- **Conformance vectors**: Bitmap text layout and rasterisation vectors committed to `tools/fixtures/conformance/raster/text-vectors.json`.

## Acceptance

- Fixed strings lay out to deterministic line breaks and advances with the project bitmap font.
- `text` commands replay through `rasterize` with synthetic bold and italic.
- Node and Bun produce bit-identical results.
