---
title: 'TrueType glyphs: the library entry 3 approves, outline coverage fill and bundled fonts'
type: feature
ticket: 9
created: '2026-10-17'
status: done
baseline_revision: 'b8cc89e3'
route: 'full'
risk: 'high'
review: 'quick'
review_source: 'delegated'
lenses_ran: []
review_loop_iteration: 0
context:
  - 'docs/guardrails.md'
  - 'docs/adr/0003-permissive-licences-acceptable.md'
  - 'docs/spec/engine/display-input-audio.md'
  - '_bmad-output/initiative-rpgtoolkit-reawakened/architecture-rpgtoolkit-reawakened/architecture-rpgtoolkit-reawakened.md'
  - '_bmad-output/initiative-rpgtoolkit-reawakened/epic-board-rendering/discovery/font-library-spike.md'
  - '_bmad-output/initiative-rpgtoolkit-reawakened/epic-board-rendering/tickets.toml'
---

## Intent

Delivers TrueType vector glyph support for `core/render` and `core/raster` based on the ticket 4.3 approved candidate `opentype.js@2.0.0` behind a strict, host-free sfnt/glyf input gate and vetted wrapper seam. Bundles unmodified upstream Liberation Sans, Liberation Serif and Liberation Mono font files under ADR 0003's asset-only exception, updates `tools/licences` to audit path-scoped bundled font records while rejecting OFL software dependencies, implements a deterministic fixed-point outline coverage rasteriser with nonzero winding, integrates TrueType font metrics and family substitution into `core/render/text.ts`, and verifies byte-identical metrics, outlines and rendered pixels between Node and Bun with committed conformance vectors and a pangram golden baseline.

## Boundaries and Constraints

- **G1:** VM state remains plain JSON data; parsed fonts and rasterised glyph caches live strictly outside VM state.
- **G2:** `core` remains pure and host-free; `opentype.js` is imported only by the internal TrueType wrapper module, guarded by local type declarations without DOM or Node declarations, and adheres to core's `tsconfig.json` (`lib: ["ES2022"]`, `types: []`).
- **G3:** All glyph outline flattening and coverage calculations use only exact allowed arithmetic (`+`, `-`, `*`, `/`, `sqrt`, `floor`, `round`, `abs`, `min`, `max`); no unapproved `Math` functions or non-deterministic operators (`**`). Edge pixels and metrics match across Node and Bun.
- **G4:** Rasteriser only replays draw lists into straight-RGBA byte buffers; TrueType glyphs render through the standard `text` draw command.
- **G5:** Committed pangram golden baseline for Liberation Mono Regular under `golden/reference/` is regression-tested and stable across supported runtimes.
- **G6:** `opentype.js@2.0.0` (MIT) is added to `packages/core/package.json`, `packages/core/dependency-allowlist.json` and `THIRD_PARTY_NOTICES`. Unmodified upstream Liberation font files (OFL-1.1) are admitted only as path-scoped bundled assets under ADR 0003 with full notices and hashes. OFL software dependencies remain strictly rejected.
- **G7:** Clean-room implementation based on repository docs, the 4.3 spike findings, and AD-15 rulings; no legacy GPL code reference.

## Implementation Steps

1. **Licence Tooling and Font Assets:**
   - Add path-scoped `bundledAssets.fonts` schema and entries to `tools/licences/config.json` for `media/fonts/LiberationSans-Regular.ttf`, `media/fonts/LiberationSerif-Regular.ttf`, and `media/fonts/LiberationMono-Regular.ttf` with upstream SHA-256 and release metadata.
   - Extend `tools/licences/check.mjs` to audit bundled font assets (existence, SHA-256 match, ADR-0003 approval check, `THIRD_PARTY_NOTICES` verification) and verify unlisted font paths on disk are rejected while preserving the ban on OFL software dependencies.
   - Add comprehensive tests in `tools/licences/test/licences.test.mjs`.
   - Update `THIRD_PARTY_NOTICES` with `opentype.js 2.0.0` (MIT) and the three Liberation Fonts (OFL-1.1 with Reserved Font Name terms, upstream archive hash, and file hashes).
   - Place unmodified upstream Liberation font files in `media/fonts/`.

2. **Core Dependency and Allowlist:**
   - Add `"opentype.js": "2.0.0"` to `packages/core/package.json` and update `pnpm-lock.yaml`.
   - Add `"opentype.js"` to `packages/core/dependency-allowlist.json`.

3. **Input Gate and opentype.js Wrapper:**
   - Create `packages/core/src/formats/font/opentype.d.ts` declaring only vetted types and methods.
   - Implement `packages/core/src/formats/font/truetype.ts` containing the sfnt/glyf input gate (rejecting non-sfnt, CFF/CFF2, WOFF, variable fonts, and malformed tables before library invocation) and wrapper calling only vetted `opentype.js` APIs (`parse`, `names`, `unitsPerEm`, `tables.hhea`, `charToGlyph`, `getPath`, `advanceWidth`, `getKerningValue`).
   - Add unit tests for input gate rejection, malformed buffer handling, and static/dynamic API boundary assertion.

4. **Outline Flattening and Fixed-Point Nonzero-Winding Rasterisation:**
   - Implement deterministic curve flattening in `packages/core/src/raster/glyph.ts` decomposing Bézier curves into line segments using only allowed maths (`+ - * /`, `sqrt`).
   - Implement fixed-point (26.6) integer scanline coverage rasteriser with nonzero winding rule producing anti-aliased 8-bit coverage masks.
   - Implement an external glyph raster cache to avoid repeated outline flattening and rasterisation.
   - Wire `drawText` in `packages/core/src/raster/raster.ts` to support TrueType font assets alongside legacy bitmap fonts.

5. **Text Layout and Font Resolution Integration:**
   - Update `packages/core/src/render/text.ts` and `resolveFont` to resolve project TrueType assets and default family substitutions (`Arial`/sans-serif -> Liberation Sans, `Times New Roman`/serif -> Liberation Serif, `Courier New`/monospace -> Liberation Mono) with `hhea`-based metrics calculation per AD-15.
   - Export parsed TrueType models and helpers in `packages/core/src/index.ts`.

6. **Conformance Vectors and Pangram Baseline Golden:**
   - Add TrueType text vectors to `tools/fixtures/conformance/raster/text-vectors.json` (or companion conformance fixture).
   - Add pangram baseline golden test and reference image for Liberation Mono Regular.
   - Verify Node and Bun output bit-identical outline hashes, metric vectors, and raster bytes.

## Verification

Run all repository gates:
- `pnpm install`
- `pnpm fixtures:fetch`
- `pnpm typecheck`
- `pnpm lint`
- `pnpm test:strict`
- `pnpm golden`
- `pnpm golden:bun`
- `pnpm graph`
- `pnpm licence`
- `pnpm provenance`
- `pnpm catalogue:check`
- `pnpm command-docs:check`
