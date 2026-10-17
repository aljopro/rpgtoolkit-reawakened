---
title: 'Tracer bullet: createEngine, a 2D board, composeBoard and the rasteriser to a golden PNG'
type: feature
ticket: 5
created: '2026-10-17'
status: draft
baseline_revision: 'c149f128'
route: full
route_source: pinned
risk: high
review: quick
review_source: pinned
lenses_ran: []
review_loop_iteration: 0
context:
  - 'CLAUDE.md'
  - 'docs/guardrails.md'
  - 'docs/spec/engine/main-loop-and-startup.md'
  - 'docs/spec/formats/board.md'
  - 'docs/spec/formats/tiles.md'
  - 'docs/spec/formats/images.md'
  - 'docs/spec/formats/README.md'
  - '_bmad-output/initiative-rpgtoolkit-reawakened/architecture-rpgtoolkit-reawakened/architecture-rpgtoolkit-reawakened.md'
  - '_bmad-output/initiative-rpgtoolkit-reawakened/epic-board-rendering/epic-board-rendering.md'
  - '_bmad-output/initiative-rpgtoolkit-reawakened/epic-board-rendering/discovery/render-readiness.md'
  - '_bmad-output/initiative-rpgtoolkit-reawakened/epic-board-rendering/story-core-rendering-rulings-r-55-r-15-effects-waits-compositor-fontref-and-metrics-plan.md'
  - '_bmad-output/initiative-rpgtoolkit-reawakened/epic-board-rendering/story-reference-oracle-for-2d-boards-independent-renderer-sc-sc-plan.md'
  - '_bmad-output/initiative-rpgtoolkit-reawakened/epic-board-rendering/story-presentation-lifecycle-audio-cue-rulings-plan.md'
  - 'tools/fixtures/reference/SCHEMA.md'
  - 'golden/scenes/S-01.json'
  - 'golden/ledger.json'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** the public `Engine` and draw-list contracts, the legacy board readers, the independent 2D oracle and the headless golden job exist, but no real core engine connects them. The current harness still drives a deliberately fake engine. Without one narrow vertical path, later world, raster, compositor, camera and built-in entries would each invent a different asset-loading or frame-composition seam.

**Approach:** build the smallest real path from `createEngine` through the AD-5 request/reply loop, a hydrated 2D board, `composeBoard`, the pure CPU rasteriser and a deterministic PNG comparison. The tracer uses the already-committed S-01 scene: a 512×384 village board view at camera `(0,0)`, tick `0`, with shading, images and sprites excluded. It proves the board layers and colour-keyed tiles without claiming to implement shading, camera physics, sprites, text or the rest of the engine. The same engine and draw-list hash run under Node and a pinned Bun lane.

## Boundaries & constraints

**Always:** G1 plain-data state and explicit phase machine; G2 core has no host I/O and runners use only the public core entry point; G3 fixed 60 Hz ticks and deterministic integer pixel operations; G4 `composeBoard` emits draw commands and the rasteriser is the sole reference pixel path; G5 S-01 is an independent-reference oracle, not proof of legacy parity; G7 implementation cites only `docs/` and the authored/independent oracle contract. Keep decoded bytes and decoded textures in an engine-owned cache outside `GameState`; copy input bytes before retaining them.

**Never:** open or translate the GPL source; add shading, lights, layer images, sprites, iso projection, camera movement, surfaces, text, UI, audio or built-ins beyond the minimal phase seam; put decoded pixels or host handles in state; let the runner compose boards or apply colour keys; change the committed oracle PNGs, scene JSON, ledger or `docs/spec/tools/render.py`; use the test double for the S-01 assertion; let asset delivery order affect request order, state hashes or draw lists.

**Status:** plan checkpoint. This plan consumes the approved 4.1 rendering rulings and the merged 4.4 oracle. It uses 4.29 only to avoid taking ownership of presentation/lifecycle/audio rows. Implementation follows only after owner review.

## Evidence policy

Every implementation-facing choice below cites a normative anchor, current code shape or the 4.4 oracle schema, states whether it is ratified or proposed, and names the rejected alternative. “Independent-reference” describes the ledger class; it is not a claim of 3.1 pixel parity. Any later answer to an extraction question changes behaviour through a doc-first amendment and an intentional golden change.

## Key rulings

### R-1 Engine initialisation and the asset reply loop

**Proposed ruling (pending owner review; OWNER):** `createEngine(init)` accepts a plain-data init containing the seed, an `AssetIndex`/`AssetRoot`, the canonical initial board key, logical viewport dimensions, and the configured catch-up cap. It does not accept filesystem callbacks or decoded assets. The first `advance(0, [])` exposes the initial `asset` request; this keeps construction pure and makes all external delivery an AD-14 input. The engine assigns monotonically increasing request ids in `GameState.engine`, requests the board first, then discovers its tile dependencies in board/LUT order and requests each unique canonical `.tst`/`.tan` asset once. A `.tan` also causes its selected frame reference to be requested before the board becomes drawable. Requests are issued in a stable sorted-by-discovery order, never in reply order.

An asset reply is consumed in the `input` phase. While the board or any dependency is outstanding, the engine returns `loading: true`, `ticksRun: 0`, the unchanged simulation tick and no draw list is considered valid; input records are queued in `engine` and do not advance time. A `bytes: null` reply resolves the request with one located `asset.missing` diagnostic, clears the affected load, leaves the world unloaded and unblocked, and does not install a partial board. A malformed board/tile result follows the same no-partial-world rule with its format error diagnostic. A valid board and every requested tile are copied into the out-of-state cache, then the world becomes drawable at the next `drawList()` call. Retries are not implicit.

**Evidence:** AD-1 requires structured-cloneable `createEngine`/`advance`/`drawList`; AD-5 requires an `AssetIndex`, blocking asset requests and matching input replies; AD-14 fixes input order and the consuming tick; AD-17 forbids core I/O. `ports/requests.ts` already defines `{ kind: 'asset', reqId, key }`, and `ports/input.ts` defines the byte-or-null reply. `formats/resolver` already owns canonical keys and ASCII-only folding. **Rejected alternative:** pass board bytes or an asset callback into `createEngine`, which bypasses the request/reply seam; request dependencies as replies arrive, which makes request ids and state hashes depend on host latency; silently continue after a missing asset, which would produce a partial and non-replayable world.

### R-2 Tracer world state is a 2D, no-effects subset

**Proposed ruling (pending owner review; OWNER):** split `save/sections.ts` into one module per section this epic owns (`world`, `camera`, `ui`, `fx`, `surfaces`, `input`, `engine`) while retaining the barrel's public exports. This entry fills only the minimal `world`, `input` and `engine` shapes needed by the tracer; the other five remain explicit empty placeholders for their later owners. `WorldSection` stores a plain-data loaded board: `coordType`, logical dimensions, board pixel dimensions, background colour, ordered layers, each layer's row-major tile references, and the board's ambient. The raw format model remains available to the loader/cache for round-trip fidelity, but `GameState` contains no bytes, `Uint8Array`, decoded pixels or format-reader object. `EngineSection` stores phase/load status, the request id counter, pending asset keys, queued input records and the fixed phase-list cursor. `InputSection` stores only the reply/event queue required by this entry.

Hydration supports vector-layout 2D boards (`coordType` 0, including the scene's ordinary village board) and preserves the reader's 1-based tile/LUT semantics. It expands a `.tan` reference to the frame selected by `frameAt(originTick = 0, tick, ticksPerFrame, count, loop)` but does not implement animation sound or any other effect. It rejects iso boards in this tracer with a located unsupported-coordinate diagnostic; iso rendering belongs to entries 4.17/4.18. The 2D board pixel size is `32 × sizeX` by `32 × sizeY`, and empty LUT entries do not emit commands.

**Evidence:** AD-10 assigns `world` to `core/world`, `input` to `core/input`, and `engine` to `core/engine`; AD-2 makes `core/time` the owner of `frameAt`; `board.md#coordinates`, `#vector-layout-minor-4-and-later` and `#animated-tiles` define the dimensions, traversal and LUT expansion; `golden/scenes/S-01.json` pins the no-shading/no-image/no-sprite view. `save/sections.ts` currently has placeholders and stale owner comments, so this split is the required partition seam. **Rejected alternative:** keep the whole board reader model directly in mutable state, which couples save shape to binary implementation and violates the out-of-state cache rule; start implementing iso here, which expands a deliberately 2D tracer and duplicates entry 4.18.

### R-3 The tracer compositor has one order and one input view

**Ratified with the approved 4.1 rulings (OWNER):** `composeBoard` is pure and consumes a read-only world view containing the hydrated board, current tick, camera, viewport, `alpha` and include flags. For S-01 it emits, in order: one background `fill`, then each non-empty tile cell by layer (layer ascending, y ascending, x ascending), culled against the viewport. A normal 2D tile emits a full-tile `blit` with a `TexRef` (`asset`, 1-based tile), source and destination rectangles in integer logical pixels, transparent key `(0,1,2)`, zero tint, alpha `255`, normal blend and `iso2d: false`. The view's `include.shading`, `include.images` and `include.sprites` flags are honoured; the tracer rejects no-op unsupported content by omitting it because S-01 explicitly excludes it. `Engine.drawList(alpha)` calls this function and does not compose independently. `alpha` is accepted but has no effect in this no-sprite/no-camera-motion scene and is excluded from hashes.

**Evidence:** AD-3 defines the flat command union and integer rectangles; AD-28 says decoders never apply colour keys; AD-29/E-52 establish one compositor and the full order; `board.md#drawing-order-and-effects` fixes layer order and `tiles.md#tileset-tst-and-isometric-tileset-iso` fixes 32×32 tiles and the `(0,1,2)` transparent key; the 4.1 plan ratifies `alpha` as presentation-only. **Rejected alternative:** draw directly into pixels in `core/world`, which bypasses the draw-list seam; let each runner choose tile order or key handling, which breaks G4 and the S-01 hash; silently render images/sprites in this ticket, which takes ownership from later entries.

### R-4 Reference rasteriser and PNG comparison

**Proposed ruling (pending owner review; OWNER):** add a pure `core/raster` replay entry point for the tracer's `fill` and normal `blit` commands. It owns a fresh RGBA target, applies the key test to the untinted source before any colour arithmetic, copies non-key pixels with nearest-neighbour sampling, and leaves all unsupported command kinds as located implementation errors in the tracer rather than silently ignoring them. The normal path uses the AD-3 integer pixel convention and never premultiplies alpha. The rasteriser receives decoded textures through an explicit read-only asset map; it does not read the engine cache or perform I/O.

Add a host-neutral PNG encoder in `runner-harness` that writes deterministic RGBA PNG bytes using fixed zlib/store blocks and integer CRC-32, then compare the encoded result's decoded RGBA against the committed `golden/reference/S-01.png` through the public core image decoder. The comparison reports first differing pixel and maximum channel error; the independent-reference gate is exact RGBA equality. No PNG is rewritten by the normal golden command.

**Evidence:** AD-3 specifies `fill`, `blit`, key-before-tint and normal blend; AD-4 makes `core/raster` the single reference path; AD-28's `DecodedTexture` is straight RGBA; G5 requires headless golden tests. The 4.4 schema requires decoded-pixel comparison rather than PNG-byte comparison and its ledger marks S-01 `independent-reference`/`gating: true`. **Rejected alternative:** use Pillow, Canvas or a runner image API in the consumer; compare compressed PNG bytes, which makes harmless encoder choices observable; add a Node/zlib dependency to `runner-harness`, which violates its host-neutral public surface.

### R-5 Harness adapter and pinned Bun lane

**Proposed ruling (pending owner review; OWNER):** add a scene adapter in `runner-harness` that accepts the already-read S-01 JSON plus a plain map of canonical asset bytes, creates the real `core` engine, drains asset requests by returning `InputRecord` replies, and exposes the resulting draw list, raster pixels and hashes. `runner-headless` remains the only Node shell: it reads the scene and referenced files, constructs the map, reads the expected PNG and invokes the adapter. The existing test-double golden stages remain unchanged and still run; the new real-engine S-01 stage is an additional required stage of `pnpm golden`, so a green legacy double cannot mask a tracer regression.

Pin the cross-engine lane to Bun `1.4.2` (the version available during planning) in a `golden:bun` script/CI job. It runs the same compiled harness scene adapter, checks the S-01 draw-list hash and RGBA pixels, and compares the Node and Bun hashes. Add the Bun job to the required CI gate only after the command works locally; the job must not regenerate goldens. If the owner chooses a different pinned Bun version, record it in this plan and the workflow before implementation.

**Evidence:** AD-1's batching and hash check, AD-11's canonical state/draw hashes, AD-22's public-entry rule, `runner-harness/src/job.ts`'s existing golden stages, and `ci.yml`'s required-job gate establish the integration points. The render-readiness audit F-25 records that no Bun lane currently exists. **Rejected alternative:** run a second hand-written compositor in the harness, which would make the test pass without exercising `createEngine`; use the host's filesystem from `runner-harness`, which would make the adapter Node-only; compare only PNG files and not draw-list hashes, which misses a deterministic command-order regression.

## Implementation file map

### Core lane (one owner: this ticket)

- `packages/core/src/save/sections/{world,camera,ui,fx,surfaces,input,engine}.ts` — split the seven owned section declarations; retain explicit placeholders for sections not implemented here.
- `packages/core/src/save/sections.ts` and `packages/core/src/save/state.ts` — barrel/state wiring and plain-data assertions; no second state tree.
- `packages/core/src/engine/engine.ts` and `packages/core/src/engine/index.ts` — `createEngine`, fixed phase list, input/reply application, request ids, loading freeze, tick advancement, state/draw hashes, and the public `Engine` methods.
- `packages/core/src/world/model.ts`, `hydrate.ts` and `index.ts` — 2D board state view, board hydration, LUT/tile dependency discovery and animated-tile frame selection.
- `packages/core/src/render/compose.ts` and `index.ts` — pure 2D `composeBoard` and the S-01 layer/tile command order.
- `packages/core/src/raster/raster.ts` and `index.ts` — pure RGBA target and `fill`/normal-`blit` replay; export only through `packages/core/src/index.ts`.
- `packages/core/src/index.ts` — additive public exports only; no deep-import consumers.

### Harness/host lane

- `packages/runner-harness/src/tracer.ts` — scene-to-engine adapter, deterministic asset-reply drain, S-01 run result, state/draw hash collection.
- `packages/runner-harness/src/png.ts` and `src/scene-golden.ts` — host-neutral RGBA PNG encoder and exact decoded-pixel comparator; no `node:*`, DOM or timers.
- `packages/runner-harness/src/job.ts` and `src/index.ts` — additional real-engine S-01 stage and public exports while preserving existing test-double stages.
- `packages/runner-headless/src/index.ts` — Node-only scene/asset file reading and invocation of the harness adapter; keep filesystem operations out of core/harness.
- `package.json`, `.github/workflows/ci.yml` and the smallest required Bun script/config — pinned Bun lane and required gate wiring, with no production dependency added.

### Tests and fixtures

- `packages/core/test/engine.test.ts`, `world.test.ts`, `render.test.ts`, `raster.test.ts` — request ordering, loading freeze, missing/malformed replies, board hydration, layer/cell order, key transparency, and replay determinism.
- `packages/runner-harness/test/tracer.test.ts`, `png.test.ts`, `scene-golden.test.ts` — adapter reply drain, PNG vectors, exact S-01 compare and two-run hashes.
- `packages/runner-headless/test/golden.test.ts` or the existing golden test seam — real-engine stage is required and the old test-double stage remains covered.
- No changes to `golden/scenes/*.json`, `golden/reference/*.png`, `golden/ledger.json`, `tools/fixtures/reference/*` or `docs/spec/tools/render.py`; S-01 is consumed, not regenerated.

## Acceptance mapping

1. `createEngine` is exported through `@tk-reawakened/core`; its first asset request is observable through `advance(0, [])`, each reply is an AD-14 input, and no core file imports Node, DOM or a timer.
2. With the S-01 asset map, the engine requests the board and its unique tile dependencies in stable order, freezes while any reply is pending, hydrates a 2D world and emits no partial draw list.
3. At S-01's view (`512×384`, camera `0,0`, tick `0`, all include flags false), `Engine.drawList(0)` and a direct `composeBoard` call produce the same ordered fill/tile commands. Empty cells emit nothing; normal tiles carry key `(0,1,2)` and zero tint.
4. The core rasteriser replays the list to RGBA with exact key transparency and normal blits. The harness encoder produces a deterministic PNG, and its decoded pixels equal `golden/reference/S-01.png` exactly; the ledger's `independent-reference`/gating metadata is reported rather than changed.
5. Two independent Node runs have identical state and draw-list hashes. The pinned Bun lane has the same draw-list hash and pixels. Batch size and asset-reply delivery order do not change the completed state or draw output.
6. Existing test-double goldens, format fixtures and required package gates remain green; no new runtime dependency or generated golden is introduced.

## Genuine owner decisions required at this checkpoint

1. **R-1 initial request timing and init shape:** approve exposing the first asset request from `advance(0, [])`, with `AssetIndex`/`AssetRoot`, board key, seed, viewport and catch-up cap in `createEngine` init rather than passing bytes/callbacks.
2. **R-1 missing-asset policy:** approve a located diagnostic, no partial world, and unblocked `loading: false` after a `bytes: null` reply; no implicit retry.
3. **R-2 state/cache boundary:** approve the minimal 2D `WorldSection` and `EngineSection` shapes, with board data in plain state and bytes/decoded textures only in the engine-owned cache outside state.
4. **R-4 raster/PNG boundary:** approve a pure `core/raster` RGBA replay plus host-neutral fixed-store PNG encoding/comparison in `runner-harness`, with exact decoded-RGBA gating and no Node image dependency.
5. **R-5 Bun lane:** approve Bun `1.4.2` as the pinned version and adding the real-engine S-01 job to the required CI gate without changing committed goldens.

All other choices are ratified by the ticket, AD-1/3/4/5/10/11/14/26/28/29, the 4.1 rulings, or the 4.4 oracle. The 4.29 plan's presentation/lifecycle/audio rows remain outside this entry; no owner decision there is duplicated.

## Risks and mitigations

| Risk | Mitigation |
|---|---|
| A loading request can deadlock or vary with delivery order | Stable dependency discovery, explicit pending keys, replies processed by request id, missing replies resolve with a diagnostic, and a latency/order-fuzz test. |
| Format reader output leaks into save state | Keep reader models/cache outside state; hydrate an explicit plain-data world shape and retain `GameStateIsPlainData`. |
| The first golden accidentally uses the double engine | Make the real S-01 stage fail if it receives a double, and log the engine path/scene name in the golden output. |
| Colour-key or tile storage orientation drifts | Use existing `readTileset`/`expandTileToRgba` contracts, key-before-tint vectors and a 16×16 doubled tile test; do not duplicate format parsing in the harness. |
| PNG encoding makes cross-engine bytes differ | Compare decoded RGBA for the oracle and draw-list/state hashes for engine equivalence; pin encoder output vectors and use fixed-store blocks. |
| Bun or CI setup is unavailable | Pin one explicit version, keep the lane running compiled public-entry code, and fail the plan rather than silently skipping the cross-engine check. |
| Later entries collide in shared seams | The section modules, `core/engine`, `core/world`, `core/render` and `core/raster` ownership are listed in build order; later entries consume exports instead of editing this ticket's internals. |

## Plan change log

- 2026-10-17: Initial plan from `origin/main` `c149f128`; consumed the merged 4.1 docs/AD rulings, 4.4 scene schema and ledger, and 4.29 boundaries. Proposed the AD-5 asset loop, minimal 2D state, pure raster/PNG seam and pinned Bun lane for owner review.

## Verification (after owner approval; this plan worker runs only the plan checks)

- `git diff --check` — plan has no whitespace errors.
- `pnpm lint` — no guard-rail or import violations in the plan branch.
- `pnpm provenance` — no clean-room markers introduced by the plan.
- `pnpm catalogue:check` — the existing command catalogue remains unchanged and consistent.
- `python3 _bmad/method/scripts/tickets.py --project-root . status initiative-rpgtoolkit-reawakened` — no ticket-store drift or dependency-order errors.

The plan checkpoint itself does not run typecheck, unit, golden, fixture, licence, Bun or implementation checks. Those run after owner approval and code implementation. No fixture, golden, docs/spec or generated catalogue file is changed by this plan.

</frozen-after-approval>
