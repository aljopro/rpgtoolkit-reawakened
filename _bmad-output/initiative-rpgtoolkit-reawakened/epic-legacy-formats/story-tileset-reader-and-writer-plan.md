---
title: 'Tileset (.tst) reader and writer'
type: 'chore'
ticket: '2'
created: '2026-10-11'
status: 'done'
baseline_revision: '68d7839ca5b6a416a5316f0bf171e99b162e1c7a'
route: 'full'
route_source: 'auto'
risk: 'low'
review: 'quick'
review_source: 'pinned'
lenses_ran: ['quick']
review_loop_iteration: 1
context: ['{project-root}/docs/guardrails.md', '{project-root}/docs/format-spec.md', '{project-root}/_bmad-output/initiative-rpgtoolkit-reawakened/architecture-rpgtoolkit-reawakened/architecture-rpgtoolkit-reawakened.md']
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Boards reference tiles positionally by a tileset name plus a 1-based index (format-spec §1.6), so nothing can be drawn until `.tst`/`.iso` tilesets can be read. The formats are small but fiddly: a 6-byte header with no magic, a `detail` level that changes the tile geometry and pixel width, a column-major pixel order that is easy to get backwards, two different transparent keys, and an isometric packing whose diamond mask is stated only as four quadrant inequalities.

**Approach:** Add `packages/core/src/formats/tileset/` with a `readTileset`/`writeTileset` pair built on the existing `BinaryReader`/`BinaryWriter` (ticket 2.1) and the shared `Result`/`FormatError` contract (AD-18). The model keeps the stored pixel bytes verbatim so `writeTileset` re-emits the input byte-for-byte; a separate `expandTileToRgba` accessor resolves the transparent key, the VGA palette and the isometric diamond for the renderer without the writer losing the original encoding. The VGA default palette ships as data in its own file, built from the public mode-13h palette, not the legacy source.

## Boundaries & Constraints

**Always:** `core` stays pure (G2): no DOM, no Node, no `Buffer`, no `process`, no imports of other packages. Determinism (G3): only the allowlisted `Math` members, no `**`, no `Date`/`performance`/`Intl`/`Math.random`. Every implementing file names its `docs/format-spec.md` section (G7). One public entry per package (AD-22): consumers import `@rpgtoolkit/core`, never a deep path. `kebab-case.ts` files, `PascalCase` types, `camelCase` functions. `tileCount` is a **true count** (§3.1), read with `readTrueCount`.

**Never:** add a runtime dependency, touch the legacy GPL source, edit `golden/**`, change the existing `canon`/`ports`/`validate`/`binary` exports, or invent palette colours.

</frozen-after-approval>

## Tasks & Acceptance

**Execution:**
- [x] `packages/core/src/formats/tileset/tileset.ts` — `readTileset`/`writeTileset` for versions 20 (`.tst`) and 30 (`.iso`); the `detail` table (1 → 32×32×3, 2 → 16×16×3, 3/5 → 32×32×1, 4/6 → 16×16×1, 150 → 32×32×3 isometric), the column-major pixel order, the 24-bit R=0,G=1,B=2 and 8-bit index-255 keys, residue for trailing bytes (AD-18), and `expandTileToRgba` as the separate RGBA accessor — §3.1, §3.3.
- [x] `packages/core/src/formats/tileset/iso-diamond.ts` — `isInsideIsoDiamond` and `ISO_INSIDE_PIXEL_COUNT` for the §3.3 four-quadrant mask (exactly 1024 inside pixels) — §3.3.
- [x] `packages/core/src/formats/tileset/vga-palette.ts` — the public VGA/DOS mode-13h 256-colour default palette as 768 bytes of data plus `vgaPaletteEntry`, with a comment naming its provenance — §3.1.
- [x] `packages/core/src/formats/tileset/index.ts`, `packages/core/src/formats/index.ts` — re-exports.
- [x] `packages/core/test/format-tileset.test.ts` — synthetic buffers pinning the header, column-major order, both transparent keys, the palette path and the iso mask (1024 inside pixels); located EOF/bounds errors; and a fixtures-guarded sample test.
- [x] `tickets.toml` entry 2 — description corrected from "upper-bound count handling" to "true-count handling" (the spec says `tileCount` is a true count).

**Acceptance Criteria:**
- Given a synthetic `.tst`/`.iso`, the reader returns the version, the true tile count and the detail, and the writer reproduces the exact bytes.
- Given a full tile, `expandTileToRgba` places stored pixel `k` at output (x, y) = (k ÷ size, k mod size), proving column-major order; a row-major read gives different bytes.
- Given the 24-bit triple R=0,G=1,B=2 the expanded alpha is 0 and any one byte off is opaque; given 8-bit index 255 the alpha is 0; other indices resolve through the VGA palette.
- Given the 64×32 diamond mask, exactly 1024 pixels are inside; detail 150 unpacks them in column-major order and leaves the corners transparent.
- Given a truncated header or tile run, an unlisted version or detail, or a negative count, the reader returns `ok: false` with the failing field's offset and a `section` string, and never throws.
- Given the legacy sample tilesets (`demo`/`Basic` `char.tst`, `default.tst`), they parse with zero trailing bytes and round-trip byte-identically; the test skips cleanly when the fixtures are not fetched.

## Implementation Notes

- **Header, not magic+major+minor.** §3.1 (and §1.4) say `.tst`/`.iso` begin with a single `i16 version` (20/30), then `i16 tileCount`, then `i16 detail`. `BinaryReader.header()` is deliberately not used; an unlisted version is a `FormatError`, not a neighbouring-layout guess.
- **True count.** `readTrueCount("i16")` applies the §1.2 true-count rule (no `+1`); `tileCount` is validated non-negative, since a true count has no `-1 = none` meaning.
- **Column-major.** Tile *n* starts at `6 + (n−1) × size × size × bytesPerPixel`; within a tile the outer loop is x and the inner loop is y (§3.1). `expandTileToRgba` writes output pixel (x, y) at `(x·size + y)·4` and each synthetic test builds stored bytes that differ under a row-major read.
- **Round-trip (AD-18).** `TilesetTile.pixels` holds the stored bytes verbatim and `Tileset.residue` holds anything after the last tile, so the writer is a pure re-emit. Bytes after the tiles are not defined by the spec, so they are kept and reported as a warning rather than dropped or rejected.
- **RGBA on demand.** `expandTileToRgba` resolves both transparent keys to alpha 0, the 8-bit details through the VGA palette, and detail 150 through the §3.3 diamond; it never mutates the stored encoding.
- **Isometric.** `isInsideIsoDiamond` takes the spec's four quadrant inequalities literally with `qx = x mod 32`, `qy = y mod 16`; the count is 1024 (256 per quadrant). Unpacking walks the 64×32 image column-major and consumes stored pixels in order.
- **Palette provenance.** The values are the IBM VGA mode-13h default palette (16 EGA colours, 16 greys, 216 hue ramp, 8 black), the 6-bit DAC levels widened with `round(v·255/63)`, cross-checked against the BSD-3-Clause `fzipp/vga` table. It is its own data file so the legacy source is never a reference (G7).
- **Errors.** Tileset-level failures (unknown version/detail, negative count, writer size mismatch) cite `format-spec §3.1`; truncated reads keep the reader's `format-spec §1.1` section and the field's first byte as `offset`.

## Plan Change Log

- 2026-10-11 — initial plan.

## Review Triage Log

## Design Notes

- The residue field is what makes a byte-identical round-trip safe on unexpected input: the alternative (rejecting trailing bytes) would refuse a file the legacy engine would have read.
- `expandTileToRgba` returns `Result` like every other reader-side call, so an out-of-range index is data, not a thrown programmer error.
- The palette file is 768 literal bytes with a one-line comment on where they come from; a `vgaPaletteEntry` accessor keeps call sites from re-deriving the `3·i` stride.

## Verification

**Commands (all in the worktree, baseline `68d7839`):**
- `pnpm install --frozen-lockfile` — exit 0.
- `pnpm typecheck` — exit 0.
- `pnpm test` — exit 0; 116 tests pass, 0 fail, 0 skipped (the sample-fixture test ran against the fetched `demo`/`Basic` tilesets).
- `pnpm lint` — exit 0; `check-core-deps: 0 core runtime dependencies matches the allowlist`, eslint clean.
- `pnpm graph` — exit 0; `no dependency violations found (64 modules, 158 dependencies cruised)`.
- `pnpm provenance` — exit 0; `scanned 152 files`, `0 violations`.
- `uv run _bmad/method/scripts/tickets.py --project-root . status` — exit 0, entry 2.2 shown as `done`.
