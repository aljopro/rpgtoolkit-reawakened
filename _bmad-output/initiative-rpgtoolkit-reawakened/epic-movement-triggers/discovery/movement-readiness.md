---
type: discovery
title: "Movement and trigger readiness: what the code, docs/spec and corpus give epic-movement-triggers"
date: 2026-10-18
baseline_revision: d53cdd804d5f93525c2aa4e444bc848e75f550a5
---

# Movement and trigger readiness audit

This audit is the source-backed input to Epic 5 inception. It does not open or translate the legacy GPL source. Claims are grounded in `docs/spec/`, the architecture spine, repository code, authored fixtures, or the fetched fixture manifest. The last column identifies the proposed ticket that consumes each finding.

## A. Runtime seams already landed

| ID | Finding | Evidence | Shapes |
|---|---|---|---|
| F-01 | The engine already reserves the authoritative phase order, including the three phases Epic 5 owns: `movement`, `edges`, and `triggers`. | `_bmad-output/initiative-rpgtoolkit-reawakened/architecture-rpgtoolkit-reawakened/architecture-rpgtoolkit-reawakened.md` AD-26; `packages/core/src/engine/engine.ts:55-66,517-563` | 5.1, 5.4, 5.8, 5.9 |
| F-02 | Raw input state is already plain data with monotonic key sequence numbers, held keys, pointer state and focus; movement bindings, gamepad and buttons are intentionally deferred. | `packages/core/src/save/sections/input.ts:1-18`; `packages/core/src/input/input.ts:1-65`; `packages/core/src/ports/input.ts:1-112` | 5.6, 5.7 |
| F-03 | The published wait contract already contains `movement` waits and `input.key` park sequences; Epic 5 must resolve these, not introduce a second wait kind or claim protocol. | `packages/core/src/ports/wait.ts:1-130`; architecture spine AD-9 | 5.7 |
| F-04 | Camera and startup ports are published for Epic 5: `CameraTarget`, `PlayerPresencePort`, and the first-player effect/applier seam. | `packages/core/src/ports/camera.ts:1-29`; `packages/core/src/ports/startup.ts:1-45`; Epic 4 handoff in `epic-board-rendering.md` | 5.3, 5.9 |
| F-05 | `sprites` and `triggers` are still placeholder state sections with schema version 1; `input` is real raw state. Any shape change needs per-section migration and restore coverage. | `packages/core/src/save/sections.ts:27-48`; `packages/core/src/save/state.ts:50-111`; AD-10 and AD-23 | 5.3, 5.8, 5.12 |
| F-06 | World hydration already preserves board vectors, programs, links, compacted runtime items, start point, animation references and actor format data. The missing layer is actor instantiation and runtime behavior. | `packages/core/src/world/model.ts:36-158`; `packages/core/src/world/hydrate.ts:150-218`; `packages/core/src/formats/actor/model.ts`; Epic 4 entry 4.10 | 5.3, 5.4, 5.8, 5.9 |
| F-07 | The compositor already consumes `SpriteDraw` and strict Epic 4 ordering; Epic 5 supplies the authoritative sprite list and `CameraTarget` rather than editing compositor sorting. | `packages/core/src/render/compose.ts:38-80`; Epic 4 entries 4.15 and 4.16 | 5.3, 5.10 |
| F-08 | Existing engine tests cover boot, send, raw input, focus, waits and phase order, but no runtime movement, pathfinding, trigger or gamepad behavior exists. | `packages/core/test/engine-boot.test.ts`, `input.test.ts`, `camera.test.ts`, `script-catalogue-responders.test.ts`; no `sprites`, `triggers` or `pathfinding` modules under `packages/core/src` | 5.2, 5.4-5.12 |

## B. Normative behavior and unresolved rows

| ID | Finding | Evidence | Shapes |
|---|---|---|---|
| F-09 | Unified actors are players and board items with transform, visual, collision/activation hulls, controllers and stats; positions are pixels and actors are layer-scoped. | `docs/spec/engine/movement-and-collision.md#e-20`; `docs/spec/engine/movement-and-collision.md#e-11`; architecture AD-32 | 5.1, 5.3 |
| F-10 | Movement is a FIFO queue supporting direction strings, direct point paths, pathfinding and copied or linked waypoint vectors; tile and pixel modes use different step sizes. | `docs/spec/engine/movement-and-collision.md#e-22`; `#e-23`; `#e-24` | 5.1, 5.4, 5.7 |
| F-11 | Board collision is polygon-based and layer-scoped: solids block, stairs change layer, under and waypoint vectors do not block, and open/closed vectors have different crossing rules. | `docs/spec/engine/movement-and-collision.md#e-26`; `#e-30` | 5.1, 5.4 |
| F-12 | Three pathfinders are required: axial A*, diagonal A*, and vector visibility-graph search; the cap is 1000 expansions, blocked goals approach the nearest free point, and caches invalidate on board/vector edits. | `docs/spec/engine/movement-and-collision.md#e-34`; path-finding section at lines 170-189 | 5.1, 5.2, 5.5 |
| F-13 | Trigger behavior includes step-on, key-press, repeat-distance, item activation, board entry, edge links, global keys and conditional check-before/set-after semantics. Items precede regions; movement inside a running trigger is silent. | `docs/spec/engine/movement-and-collision.md#e-40` to `#e-48`; `docs/spec/engine/display-input-audio.md#e-49`; `docs/spec/formats/board.md` trigger and condition sections | 5.1, 5.2, 5.8, 5.9 |
| F-14 | Input must distinguish movement bindings, activation/menu/runtime keys, pointer click-to-move, the shared script key queue, and optional gamepad controls. Focus behavior is already owned by the engine. | `docs/spec/engine/display-input-audio.md#e-110` to `#e-113`; architecture AD-14; Epic 4 handoff | 5.1, 5.2, 5.6, 5.7 |
| F-15 | Fixed 60 Hz simulation, explicit total ordering, seeded RNG and the AD-26 phase list are binding. Movement must not use wall-clock time, host events, object-key order or `Math.random`. | Architecture AD-2, AD-12, AD-13, AD-14, AD-25 and AD-26; `docs/guardrails.md` G1/G3 | 5.1, 5.4, 5.5, 5.11 |
| F-16 | Five explicit conflicts are assigned to this epic: R-50 speed/game-speed conversion, R-51 sprite collision outcome, R-52 multiple-trigger precedence, R-53 edge-arrival alignment, and R-54 wall-sliding threshold. | `_bmad-output/initiative-rpgtoolkit-reawakened/discovery/docs-spec-reconciliation.md:97-104`; Epic 5 envelope Notes | 5.1 |
| F-17 | E-112 leaves gamepad payload and behavior open and assigns it to this epic; it should be treated as a Reawakened addition with an explicit bounded contract. | `docs/spec/engine/display-input-audio.md#e-112`; `packages/core/src/ports/input.ts` | 5.1, 5.6 |
| F-18 | The numeric VM per-tick budget remains provisional and jointly named by the VM and movement epics; Epic 5 should specify only its observable interaction with movement and hand the number to Epic 3 unless the owner rules otherwise. | Architecture spine Deferred item at line 505 and AD-26 | 5.1, 5.7 |

## C. Corpus and fixture reality

| ID | Finding | Evidence | Shapes |
|---|---|---|---|
| F-19 | The fetched corpus contains 8 games and 1,445 files, but current runtime corpus tests only boot `demo`, `Basic` and `Caoquest`; no recorded-input playthrough exists. | `fixtures/legacy/.fetched.json:2-39`; `packages/core/test/engine-boot.test.ts:366-441`; `pnpm fixtures:fetch` workflow | 5.2, 5.12 |
| F-20 | The fetched demo contains a useful end-to-end NPC/pathfinding candidate: `man_wander.prg` uses `itemPath(... tkMV_PAUSE_THREAD | tkMV_PATHFIND ...)`, checks a 96-pixel intercept and runs `man.prg`; no test currently reaches it. | `fixtures/legacy/demo/Prg/man_wander.prg:1-58`, `man.prg`, `oldman.prg` | 5.2, 5.11, 5.12 |
| F-21 | Existing authored fixtures cover format and rendering cases, not movement, collision, stairs, edge links, pathfinding, trigger precedence or input replay. | `packages/core/test/fixtures/authored/`; `packages/core/test/format-fixtures.test.ts:1-17`; repository-wide fixture inventory | 5.2 |
| F-22 | Format tests partially cover solid/stair vectors, board links and activation fields, but no runtime test asserts their simulation behavior. | `packages/core/test/format-board.test.ts:486-501,553-604`; `format-board-pre-vector.test.ts:316-400,527-585`; board reader tests | 5.2, 5.4, 5.8, 5.9 |

## D. Inception consequences

1. The first entry MUST be a docs-only, owner-approved ruling checkpoint. It must amend the existing movement and input spec anchors rather than create a parallel behavior document.
2. The fixture entry is a producer. Every movement, pathfinding and trigger implementation ticket must name its authored scene or corpus scenario as its data source; no ticket may rely on “representative” data without an owner.
3. The simulation implementation should use four lanes: actor/movement, pathfinding, input, and triggers/edges. Shared seams (`GameState`, phase registrations, effect packs, built-in arrays, public barrels) need one owner and a closing sweep.
4. The acceptance oracle is deterministic recorded input plus state hashes, draw-list hashes and explicit outcome assertions. It is not an unverified claim of legacy pixel parity.
5. Epic 6 audio and Epic 10 tooling can proceed independently after their existing prerequisites; Epic 5 is the next build epic in initiative order, not a prerequisite for either.
