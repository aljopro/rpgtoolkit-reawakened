---
title: 'World model: boards hydrate into the world section'
type: feature
ticket: 10
created: '2026-10-17'
status: done
baseline_revision: '42816c2a'
route: full
risk: high
review: quick
review_source: pinned
lenses_ran: [quick]
review_loop_iteration: 0
context:
  - 'CLAUDE.md'
  - 'docs/guardrails.md'
  - 'docs/spec/formats/board.md'
  - 'docs/spec/formats/legacy/older-binary-versions.md'
  - 'docs/spec/formats/legacy/text-formats.md'
  - 'docs/spec/formats/tiles.md'
  - 'docs/spec/engine/main-loop-and-startup.md'
  - '_bmad-output/initiative-rpgtoolkit-reawakened/architecture-rpgtoolkit-reawakened/architecture-rpgtoolkit-reawakened.md'
  - '_bmad-output/initiative-rpgtoolkit-reawakened/epic-board-rendering/tickets.toml'
---

## Intent

Hydrate every supported board reader output into the AD-10 `world` section as deterministic plain data. Preserve board metadata needed by later movement, trigger and rendering entries, select animated tile frames through `core/time.frameAt`, compact empty run-time item slots without changing raw reader models, and provide the 16×16 tile-doubling metadata/cache seam without drawing.

## Proposed rulings

- **World state shape (proposed ruling, pending owner review):** the hydrated world stores board identity, effective grid/pixel dimensions, ordered layers and tile references, vectors/programs/items/images/settings, constants/titles/links/start position, and the raw item slots alongside compact runtime items. Rejected alternative: retain the binary `Board` object in state, which couples saves to format readers and leaks residue/typed byte arrays.
- **Animation origin (proposed ruling, pending owner review):** board hydration selects `.tan` frames with `frameAt(0, tick, max(1, round(1000/speed)*60/1000), count, true)` using the fixed 60 Hz clock; no timer or frame-rate input is consulted. Rejected alternative: select in a runner/compositor, which makes state and asset requests delivery-dependent.
- **16×16 expansion (proposed ruling, pending owner review):** metadata records native tile dimensions and a doubled 32×32 logical tile for 16×16 details; decoded pixel bytes remain in the caller cache, never save state. Rejected alternative: store `Uint8Array` pixels in `GameState`, which violates G1/G2 and canonical snapshots.

## Implementation

- Extend `WorldBoard` and `WorldSection` with plain-data board fields and runtime item compaction data.
- Make hydration accept vector boards, pre-vector binary boards via `readPreVectorBoard` + `convertPreVectorBoard`, and TK2 text boards through existing dispatch; preserve deterministic dependencies and diagnostics.
- Expand effective grid and LUT references, animated frames, metadata/settings and per-layer data; validate/missing-report referenced assets without installing partial state.
- Add authored world tests covering canonical snapshot round-trip, frame selection, compaction/raw-slot preservation, pre-vector/TK2 hydration and 16×16 tile dimension metadata.

## Verification

Main agent runs all repository gates after merge. This worker does not run build/test gates per delegation rules.
