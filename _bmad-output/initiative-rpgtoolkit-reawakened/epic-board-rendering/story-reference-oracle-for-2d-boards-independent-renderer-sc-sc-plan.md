---
title: "Reference oracle for 2D boards: independent renderer, scene schema, authored scenes and golden ledger"
type: feature
ticket: 4
created: '2026-10-17'
status: built
baseline_revision: '458c68e9'
route: full
route_source: pinned
risk: medium
review: quick
review_source: pinned
lenses_ran: []
review_loop_iteration: 0
context:
  - 'CLAUDE.md'
  - 'docs/guardrails.md'
  - 'docs/spec/engine/parity-checklist.md#golden-image-oracle'
  - 'docs/spec/formats/board.md'
  - 'docs/spec/formats/tiles.md'
  - 'docs/spec/formats/images.md'
  - 'docs/spec/formats/animation.md'
  - 'docs/spec/tools/rpgtk_formats.py'
  - 'docs/spec/tools/render.py'
  - '_bmad-output/initiative-rpgtoolkit-reawakened/epic-board-rendering/epic-board-rendering.md'
---

## Intent

Create the producer-side oracle for 2D board rendering. Authored scenes remain plain data and authored files, are generated only from `docs/spec`, and are rendered by an independent Python/Pillow reference implementation. The committed decoded PNGs and `golden/ledger.json` provide stable inputs and oracle metadata for ticket 4.5 and later consumers.

## Boundaries & constraints

- Follow G7: no legacy source or files are opened or copied; authored fixtures use only the normative format documents and existing authored fixture conventions.
- `tools/fixtures/reference/` MUST NOT import `packages/core`.
- The reference renderer reads board/tiles/animation/bitmap files through `docs/spec/tools/rpgtk_formats.py` and implements the published AD-3 pixel pipeline needed by the scenes.
- Keep state plain JSON; no host renderer loop; no changes to `packages/core`.
- Existing `docs/spec/tools/render.py` remains unchanged; S-01 must agree with its board render except for the documented start marker comparison.

## Proposed rulings (pending owner review)

1. **Scene file layout:** use `golden/scenes/*.json` with a versioned root `{schema: 1, boardFiles, sprites, ambient, view, tick}` and explicit `SpriteDraw` fields (`id`, `key`, `layer`, `x`, `y`, `drawId`, optional `under`, `prev`). Evidence: `parity-checklist.md#golden-image-oracle` requires plain data containing these values; rejected alternative: infer inputs from fixture code or PNGs, which makes hashes and ownership opaque.
2. **Authored fixture location:** use `tools/fixtures/author/` as the generator source and `packages/core/test/fixtures/authored/render-oracle/` for generated board assets, while keeping scene JSON and PNGs under `golden/`. Evidence: the existing author generator is the documented G7 byte-authoring path and core fixtures are the existing fetched/authored asset fixture convention; rejected alternative: checking in generated source beside the reference renderer, which couples producer and consumer.
3. **Reference raster coverage:** implement deterministic 2D tile/layer/image/ambient/shade/light/blit/sprite composition in Python with integer channel arithmetic and nearest-neighbour scaling. Evidence: `docs/spec/formats/board.md`, `tiles.md#shading`, AD-3, and the S-01 requirements; rejected alternative: invoke TypeScript/core or a browser renderer, which violates independent-oracle ownership.
4. **Ledger classes:** S-01 through S-01d are `independent-reference` and gating; any fixture-only diagnostic images are `regression-baseline` and non-gating. Evidence: the owner-ratified ledger policy in `parity-checklist.md#golden-image-oracle`; rejected alternative: treating independent PNG bytes as proof of legacy pixel parity.

## Implementation steps

1. Extend the authored fixture generator with a self-contained render-oracle fixture project: a deterministic board, doubled 16x16 tileset, animated `.tan`, `.tbm`, layer image assets and metadata needed by the scenes.
2. Add the schema description and validator, plus four pinned scenes S-01, S-01b, S-01c and S-01d. Validate board files, sprite fields, ambient, view and tick and reject unknown/malformed data.
3. Add `tools/fixtures/reference/render.py` and a `--check` mode that renders every scene, compares decoded RGBA pixels (not PNG bytes), and checks the required no-core-import boundary.
4. Commit generated PNGs and `golden/ledger.json`; include producer entry, oracle class, gating flag and scene path for every PNG.
5. Add focused Python/Node tests for schema validation, renderer determinism and ledger completeness without importing `packages/core`.

## Acceptance mapping

- `node tools/fixtures/author/generate.mjs --check` reproduces authored bytes.
- `python3 tools/fixtures/reference/render.py --check` reproduces decoded RGBA goldens.
- S-01 matches `docs/spec/examples/renders/board.png` outside the start marker.
- Ledger lists every committed oracle PNG with class, gate and producer.
- Schema has written normative description and validator.
- No reference file imports `packages/core`.

## Verification

Main agent runs all gates required by ticket 4.4: `pnpm fixtures:fetch`, `pnpm typecheck`, `pnpm lint`, `pnpm test:strict`, `pnpm golden`, `pnpm graph`, `pnpm licence`, `pnpm provenance`, `pnpm catalogue:check`, and `pnpm command-docs:check`.

## Plan change log

- 2026-10-17: Initial plan from origin/main `458c68e9`; scene schema, authored fixture ownership, independent raster scope and ledger policy mapped to the normative spec and epic acceptance.
