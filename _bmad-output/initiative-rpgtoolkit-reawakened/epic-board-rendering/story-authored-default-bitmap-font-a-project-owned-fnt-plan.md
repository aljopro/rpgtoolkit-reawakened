---
title: 'Authored default bitmap font: a project-owned .fnt'
type: 'feature'
ticket: 32
created: '2026-10-17'
status: done
baseline_revision: '42816c2a'
route: 'full'
route_source: 'auto'
risk: 'medium'
review: 'quick'
review_source: 'pinned'
lenses_ran: []
review_loop_iteration: 0
context:
  - 'CLAUDE.md'
  - 'docs/guardrails.md'
  - 'docs/spec/formats/legacy/text-formats.md'
  - '_bmad-output/initiative-rpgtoolkit-reawakened/epic-board-rendering/story-font-strategy-spike-plan.md'
  - '_bmad-output/initiative-rpgtoolkit-reawakened/epic-board-rendering/discovery/font-library-spike.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** The renderer has a Toolkit 2 `.fnt` reader and glyph raster path but no project-owned fallback asset. Missing TrueType data, TK2 games without a supplied font, and deterministic text tests therefore have no stable authored source.

**Approach:** Author a generic retro 8-bit 8×8 glyph set from scratch in a small plain-text cell source, generate the complete TK2 text layout reproducibly, and exercise it through the existing reader and raster path. The asset covers ASCII U+0020–U+007E plus an explicit U+FFFD replacement glyph while remaining distinct from fetched legacy `BASE.FNT` data.

## Boundaries & Constraints

**Always:** Use the documented `RPGTLKIT FONT`, version `2`, subversion `0` layout with 256 indexed 8×8 glyphs; keep generation deterministic and host-only; record the project MIT licence, author/date and the exact provenance statement “original work, no third-party glyph data”; keep the source, generator, generated `.fnt`, conformance tests and raster golden under tracked project paths; cite `docs/spec/formats/legacy/text-formats.md#font-toolkit-2-text`.

**Never:** Trace, inspect, copy, or derive glyphs from a legacy font, game, screenshot or third-party font; ship fetched `BASE.FNT`; change existing goldens; add a runtime dependency or core I/O; claim legacy pixel parity; broaden the ticket into TrueType parsing or text layout.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Authored source | Source rows for U+0020–U+007E and U+FFFD | Generator emits exactly 2051 CRLF-separated lines and the reader returns 2048 indexed row bytes | Reject missing, duplicate, malformed, out-of-range or incomplete glyph rows |
| Covered glyph | Reader result and code point 32–126 | `glyphToRgba` returns the authored 8×8 pixels with bit 7 at the left edge | No error |
| Replacement glyph | Reader result and U+FFFD | Explicit authored replacement cell renders deterministically | No fallback to legacy bytes |
| Legacy comparison | Fetched fixture present or absent | If any `BASE.FNT` exists, authored glyph bytes differ; otherwise test remains applicable without fixture | Missing fixture is not a failure; malformed fixture reports a test error |

</frozen-after-approval>

## Code Map

- `packages/core/src/formats/font/{model,reader,writer,glyph}.ts` — existing 256×8×8 TK2 model, parser/writer and bit-plane rasteriser; reuse unchanged.
- `packages/core/test/format-font.test.ts` — current reader/writer/glyph vectors; extend with the authored asset, covered range and U+FFFD checks.
- `tools/fixtures/fetch.mjs` and `fixtures/legacy/**/Font/BASE.FNT` — fetched compatibility inputs only; never copy or commit them.
- `tools/fixtures/author/generate.mjs` — existing docs-first deterministic fixture-generator convention; the font tool must use the same check/reproduce shape without importing core.
- `package.json` — add a focused `font:generate`/`font:check` command while retaining all existing gates.
- `media/fonts/tkr-8x8.txt`, `media/fonts/tkr-8x8.fnt`, `media/fonts/tkr-8x8.NOTICE.txt` — authored source, generated product asset and provenance/licence notice.
- `tools/fonts/generate.mjs` and `tools/fonts/test/generate.test.mjs` — parser/generator and deterministic drift tests.
- `golden/` and existing `runner-headless` golden seam — add a separate regression-baseline pangram image/check only if the established raster path accepts a font fixture; do not alter existing ledger entries.

## Tasks & Acceptance

**Execution:**
- [ ] Author source cells, notice and generator; emit the committed `.fnt` and fail `--check` on drift.
- [ ] Add core tests for reader loading, ASCII coverage, replacement glyph, stable bytes and optional fetched `BASE.FNT` non-identity.
- [ ] Add a deterministic pangram raster golden through the existing reader/raster path without changing prior goldens.
- [ ] Update package scripts and any narrowly required notice/catalogue metadata.
- [ ] Run every requested repository gate and record results here.

**Acceptance Criteria:**
- Given a clean checkout, when the generator runs twice, then the committed `.fnt` bytes are identical and exactly reproduce from the plain-text source.
- Given the generated file, when the existing reader loads it, then ASCII 32–126 and U+FFFD render through `glyphToRgba` with the authored pixels and no missing rows.
- Given fetched legacy fixtures, when `BASE.FNT` is present, then authored glyph data is not byte-identical; the test also passes without fetched fixtures.
- Given Node and the supported golden lane, when the pangram is rasterised, then the pixels and hashes are deterministic and stable.
- Given all licence/provenance checks, when the repository gates run, then the project-owned MIT asset and original-work notice introduce no third-party or legacy markers.

## Implementation Notes

### Proposed ruling (pending owner review; owner delegated for this build)

The source uses one explicit code-point header followed by eight `.#` rows per glyph, with `U+0020` through `U+007E` and `U+FFFD`; the generator fills all other indexed cells with zero rows, writes the existing TK2 header, and emits CRLF. Evidence: the reader requires 256 indexed glyphs and the normative text-format anchor defines direct code-point rows. Rejected alternative: a sparse runtime font map, which would not exercise the existing reader or reproduce the TK2 layout.

### Proposed ruling (pending owner review; owner delegated for this build)

The pangram is a regression baseline owned by this project, not a legacy-parity oracle, and the generated asset remains separate from fetched `BASE.FNT`. Evidence: discovery/font-library-spike.md §8–§9 explicitly assigns ticket 4.32 the MIT authored fallback and warns against parity claims. Rejected alternative: treating a fetched `BASE.FNT` as the product default, which imports uncertain provenance and makes tests dependent on network fixtures.

## Plan Change Log

## Design Notes

Use a readable 1px-stroke retro console style: uppercase/lowercase, digits and punctuation are authored as cells rather than transformed from another alphabet. Keep the space blank and make U+FFFD visibly distinct with a boxed question mark. Generated output is a format fixture, not hand-edited source.

## Verification

**Commands:**
- `pnpm font:check` — generated `.fnt` matches the source.
- `pnpm typecheck` — core/test additions compile.
- `pnpm lint` — no host or dependency violations.
- `pnpm test:strict` — reader, raster and generator-backed tests pass without skips.
- `pnpm golden` and `pnpm golden:bun` — pangram baseline is stable in both lanes.
- `pnpm fixtures:fetch` and `pnpm fixtures:check` — optional legacy comparison uses ignored fetched data only.
- `pnpm graph` — package direction remains unchanged.
- `pnpm licence` and `pnpm provenance` — MIT ownership and clean-room notice pass.
- `pnpm catalogue:check` and `pnpm command-docs:check` — unrelated generated surfaces remain consistent.

</frozen-after-approval>

## Implementation Notes

- Implemented `media/fonts/tkr-8x8.txt` as 96 authored cells (ASCII U+0020–U+007E plus U+FFFD), with U+FFFD emitted into TK2 byte slot 255.
- Added `tools/fonts/generate.mjs` and tests; generated `media/fonts/tkr-8x8.fnt` is CRLF-stable and reproduces exactly.
- Added `media/fonts/tkr-8x8.NOTICE.txt` with MIT, author/date and original-work provenance.
- Added `golden/reference/tkr-font-pangram.png` and `packages/runner-harness/test/font-golden.test.ts`; this is a project-owned regression baseline, not a legacy-parity oracle.
- Added reader/raster coverage and a fetched-fixture non-identity assertion in `packages/core/test/format-font.test.ts`.
- All requested gates passed; strict suite reported 962 passed, 0 skipped.
