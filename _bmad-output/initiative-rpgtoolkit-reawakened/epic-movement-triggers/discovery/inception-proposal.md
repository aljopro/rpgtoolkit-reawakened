---
type: discovery
title: "Inception proposal: epic-movement-triggers (epic 5)"
date: 2026-10-18
baseline_revision: d53cdd804d5f93525c2aa4e444bc848e75f550a5
---

# Inception proposal: sprites move, collide and fire triggers

Epic 5 is the next build epic after board-rendering. This proposal turns the existing envelope into a reviewable, doc-first breakdown. It is **not** owner approval of the proposed movement rules; the first ticket is a human checkpoint and records recommendations as pending until approved.

The source audit is `movement-readiness.md`. The ticket breakdown is `../tickets.toml`; table order is build order and ids are stable names.

## 1. Scope restatement

Epic 5 completes the core simulation gap deliberately left by Epic 4: unified actors, movement queues, collision and stairs, deterministic pathfinding, input bindings, movement waits and built-ins, trigger dispatch, board edges, board transitions, and the random-battle handoff. It owns the mutable `sprites` and `triggers` sections and the movement/input extension of `core/input`, while using Epic 4's world, engine, draw-list, camera and raw-input seams.

It does not own rendering/compositor ordering, battle resolution or UI, menus and saves, audio synthesis, runners, or editor tooling. It must not create a second loop, a second actor model, a second key-claim protocol, or a second trigger path.

## 2. Decision matrix

| ID | Question | Proposed disposition | Status | If the owner rules otherwise |
|---|---|---|---|---|
| R-50 | Game-speed adjustment and fixed-tick movement conversion | **PROPOSE:** retain the fixed-tick movement page formula: 4 px per speed interval; `intervalMs = max(oneTickMs, speedMs - 100 * gameSpeed)`; convert intervals deterministically through `core/time`; define `speed <= 0` as one tick. This preserves the explicit movement page and removes frame-rate dependence. | Owner approval required | Change the formula and movement oracle before 5.4; no code should encode either alternative before the ruling. |
| R-51 | Sprite collision versus path diversion | **PROPOSE:** collision winner/loser priority and the two-second frozen state apply to direct collisions (entry 4); a path-following actor may attempt one deterministic local diversion (entry 5, using the pathfinder) before applying entry 4's freeze/stop result, with wait and stop as explicit fallbacks. | Owner approval required | Rework 5.4 and 5.5 behavior and all sprite-blocking fixtures. |
| R-52 | Multiple matching trigger precedence | **PROPOSE:** filter by layer and condition first; choose qualifying items before regions; choose item by frontness then distance then compact runtime index; choose the last qualifying region in stored board order; a failed condition does not consume a candidate; apply set-after only after successful completion. | Owner approval required | Change 5.8 dispatch order and the precedence fixtures. |
| R-53 | Board-edge arrival alignment | **PROPOSE:** preserve the continuous coordinate along the opposite edge, clamp to the valid board extent, then reject the arrival if the collision base is blocked; do not silently snap to an 8/32 px grid. | Owner approval required | Change 5.9 placement and the two-board oracle. |
| R-54 | Wall-sliding threshold | **PROPOSE:** use the normative inclusive thresholds `>=45°` on ordinary boards and `>=27°` on isometric boards; compute with deterministic integer/fixed-point geometry and choose the lower total-order slide candidate on a tie. | Owner approval required | Change 5.4 collision response and slide fixtures. |
| E-112 | Gamepad contract | **PROPOSE:** normalized gamepad events expose directional axes/buttons as plain data; apply a fixed dead-zone, map direction/confirm/cancel through project bindings, use the same held/edge state as keyboard, and ignore disconnected devices. No host API enters core. | Owner approval required | Limit 5.6 to the documented payload or defer gamepad acceptance explicitly. |
| VM budget | Movement-visible budget behavior | **PROPOSE:** rpgcode-vm remains the numeric-budget owner; Epic 5 entry 5.12 verifies that the landed budget preserves movement waits and phase order, and owns a docs-first amendment if the provider contract is insufficient. | Provider verification required at closing | Do not tune a second budget in Epic 5; record the shared ruling and update the movement oracle before entry 5.12 closes. |
| R-09 | Polygon and animation fallbacks | Ratify the already reconciled defaults for both character and item actors; do not implement separate fallback rules. | Ratified | A source correction requires a docs-first amendment and fixture update. |
| Input claims | Key queue consumption | Ratify Epic 4's sequence-at-park, engine-claim, input-prune protocol; `get` and `clearBuffer` reuse it. | Ratified | Reopens AD-9 and Epic 4's completed handoff. |
| Fixed tick / total order | Simulation determinism | Ratify AD-2, AD-13, AD-14, AD-25 and AD-26. | Ratified | Reopens architecture and the replay contract. |

### Judgement calls worth the owner's attention

- <!-- OWNER: R-50 --> The recommendation intentionally chooses the movement page's explicit fixed-time formula over the legacy inventory's ±10% wording; it is easier to make deterministic and already has units.
- <!-- OWNER: R-51 --> The recommendation treats diversion as a path-following response layered on direct collision, rather than silently discarding either source behavior.
- <!-- OWNER: R-52 --> “Last region in board order” is made explicit only after layer and condition filtering; runtime item numbering uses the compacted item list, never raw slots.
- <!-- OWNER: R-53 --> Continuous edge alignment avoids invented snapping and follows the more specific movement page; blocked arrivals fail without changing the source board.
- <!-- OWNER: R-54 --> Inclusive thresholds and a fixed tie-break prevent borderline geometry from differing across JS engines.
- <!-- OWNER: E-112 --> Gamepad is a bounded Reawakened addition; its normalized event shape is more portable than exposing browser or native controller APIs.

### Deferred rows and ownership closure

- Battle charge, damage, statuses, UI and battle resolution belong to Epic 7; Epic 5 only posts a deterministic encounter/fighter handoff.
- Party roster operations, `Load()`, `dirSav`, `menu.screen` and save schema belong to Epic 8; Epic 5 exposes selected-player and live board/sprite state.
- Draw-list replay and compositor ordering belong to Epic 4; Epic 5 supplies authoritative `SpriteDraw` data and must preserve its ordering contract.
- Audio cue realization belongs to Epic 6; Epic 5 posts only movement/board-trigger audio effects through the existing bus when applicable.
- Cursor-map rendering and the mouse cursor belong to Epic 4; Epic 5 owns input buttons and movement input only.
- Step-over/in/out, watches and call-stack presentation belong to Epic 10; no Epic 5 prerequisite is added.
- The numeric VM budget remains with Epic 3; entry 5.12 verifies the landed contract and may open a docs-first amendment only if movement-visible acceptance exposes a gap.

## 3. Breakdown

| # | Title | after | Risk | Lane | Check |
|---|---|---|---|---|---|
| 1 | Movement, collision, trigger and gamepad rulings | — | high | docs | docs/spec and affected spine/catalogue rows only; owner approves R-50–R-54 and E-112 |
| 2 | Independent movement oracle and authored fixtures | 1, 2.5, 2.6, 2.16 | medium | fixtures | authored scenes and recorded-input cases validate without importing `packages/core`; fixture checks pass |
| 3 | Unified actor and sprite runtime state | 1, 2, 2.5, 2.6, 2.9, 2.10, 2.13, 2.16, 2.25, 2.26, 3.2, 3.3, 3.11, 4.10, 4.12, 4.15, 4.16, 4.20, 4.31 | high | sprites | sprite state hydrates, item multitask threads follow lifecycle, snapshots/restores, supplies `SpriteDraw`, `CameraTarget` and player presence |
| 4 | Movement stepping and board/sprite collision | 2, 3, 2.16, 3.26, 4.19 | high | sprites | tile/pixel queues, solids, stairs, sliding, under, direct sprite blocking and state transitions match fixtures |
| 5 | Axial, diagonal and vector pathfinding | 2, 3, 4, 2.5, 2.16, 3.2, 4.12 | high | pathfinding | all modes, 1000-expansion cap, nearest-free target, tie order, sprite-blocking diversion and cache invalidation pass |
| 6 | Input bindings, click-to-move, gamepad and buttons | 1, 2, 3, 4, 5, 3.3, 3.9, 3.27, 4.19 | medium | input | recorded keyboard/pointer/gamepad inputs replay identically; held diagonals and button state work; Epic 4 entry 4.25 consumes the button-slot data |
| 10 | Actor animation and presentation integration | 3, 4, 4.15, 4.23 | medium | sprites/render seam | animation/facing/states, prior positions and stance completion feed existing compositor and waits |
| 7 | Movement waits and movement/input built-ins | 4, 5, 6, 3.3, 3.9, 3.21, 3.22, 3.25, 4.11, 10 | high | VM seam | movement waits, `Push`, paths, waypoints, `multiRun`, `wait`, `get`, `clearBuffer` and catalogue ownership work; stance APIs are supplied by 10 |
| 8 | Trigger state and activation dispatch | 4, 6, 7, 3.3, 4.11, 4.20, 4.31 | high | triggers | step/key/repeat, items-before-regions, conditions, stop movement, `gone`, layer matching and re-arm pass |
| 9 | Board edges and transitions | 4, 5, 8, 2.5, 2.9, 4.20, 4.31 | high | edges | blocked edges, board/program links, alignment, destination deactivation, thread lifecycle and cache clearing pass |
| 11 | Random battle trigger and fighter handoff | 8, 9, 2.6, 3.2, 3.21 | medium | trigger/battle seam | at-most-once-per-tile encounter sampling, deterministic RNG order and fighter references reach Epic 7 |
| 12 | Replay, snapshot, reset and downstream contract sweep | 5, 6, 7, 8, 9, 10, 11, 3.11, 4.29, 4.31 | high | integration | corpus/demo replay, NPC intercept and battle-trigger handoff, state/draw hashes, cache invalidation, reset registration, catalogue and handoffs all pass |

### Lane and shared-seam ownership

- **Actor/movement lane:** 3 → 4 → 10.
- **Pathfinding lane:** 5 after actor geometry from 3/4.
- **Input lane:** 6, then 7 for shared key/built-in consumption.
- **Triggers/edges lane:** 8 → 9 → 11.
- **Fixtures/conformance:** 2 is the sole producer; later entries name its scenes and the demo corpus scenario.
- **Shared seams:** entry 3 owns the `sprites` section shape and public sprite barrel; entry 6 owns additions to `input`; entry 8 owns `triggers`; entry 7 owns movement wait/built-in registration modules; entry 12 performs the phase-registration, reset, catalogue and barrel sweep. No parallel entry edits another lane's section type or command array.

## 4. Cross-epic wiring

| Epic 5 consumer | Provider pins | Why |
|---|---|---|
| Actor/world hydration | 2.5, 2.6, 2.9, 2.10, 2.13, 2.16, 2.25, 2.26 | Board geometry, actors, movement settings, resolver, pre-vector corrections, tile-bitmap references and corpus gate |
| VM seam | 3.2, 3.3, 3.9, 3.11, 3.21, 3.22, 3.25, 3.26, 3.27 | State shell, registry, waits/threads, snapshot/hash, effect records, request plumbing, manifest, tick contract and catalogue |
| Engine/render seam | 4.10, 4.11, 4.12, 4.15, 4.16, 4.19, 4.20, 4.23, 4.29, 4.31 | World section, effect bus, vector invalidation, sprite draw contract, camera target, raw input/phase list, boot/send, animation/audio effects, lifecycle ownership and reset seam; Epic 4 entry 4.25 is a downstream button-overlay consumer, not a provider pin |

Downstream handoffs:

- **Epic 7:** a plain-data random-battle request with deterministic encounter selection, fighter references and the triggering board/actor context; Epic 5 does not implement battle rules.
- **Epic 8:** the `sprites` state shape, selected-player identity, live compacted item list, positions/layers/queues/waypoint links, and `triggers` reset/snapshot behavior.
- **Epic 9:** normalized input replay, completed movement draw inputs and state/draw hash invariants; no runner or renderer dependency is added.
- **Epic 10:** no prerequisite; it consumes Epic 4's breakpoint contract and can proceed in parallel.
- **Epic 6:** no prerequisite; it consumes Epic 4's audio effects and can proceed in parallel.

## 5. Validation record

**Round 0 (author, 2026-10-18).** Read the Epic 5 envelope, movement/input/startup specs, AD-2/7–10/13–14/25–26/32, current state and engine seams, Epic 4 handoff, provider tickets and fetched/authored fixture inventory. Four read-only scouts independently confirmed the five R-conflicts, the existing seams, corpus gaps and provider/downstream wiring. No code or legacy GPL source was opened.

**Round 1 (independent reviewer, 2026-10-18).** The reviewer found invalid plan statuses, a missing input dependency, unowned item multitask lifecycle, movement-wait/stance overlap, fixture producer/consumer gaps, an insufficient owner-approval checkpoint, unresolved VM-budget ownership, stale envelope outcome text, missing tracer/sequencing notes, provider-pin gaps, broken cross-file links, CAP overclaims and an unspecified button-slot consumer contract. These were corrected in the envelope, ticket graph and story-plan front matter/contexts; the owner-approval checkpoint remains intentionally pending.

**Rounds 2 to 4 (independent reviewers, 2026-10-18).** Three further reviews found: build-order inversion (entry 7 before 10), missing entry 5 title/description/4.12, wrong E-19/E-47/E-48/E-49 file citations, relative plan context paths, finalized-sounding notes, an entry 3 dependency on the fixture producer, fixture scenes consumers named but entry 2 did not list, an entry 6 check relying on entry 7 built-ins, the button-slot shape missing from Epic 4, and sprite diversion assigned to entry 4 before the pathfinder in entry 5. Each was corrected in the envelope, ticket graph, plans and proposal; entry 2 now names 14 scenes and records per-tick outcome facts, and R-51 is split between entry 4 (direct collision) and entry 5 (path diversion). `tickets.py status` and `next` report no cycle, `undeclared_after`, `unpinned_after` or `order_conflict`.

**Status.** The package is ready for owner review. Entry 5.1 (owner-approval docs checkpoint) is the only ready-to-start Epic 5 entry; implementation entries stay blocked until the owner rules on R-50 to R-54 and E-112.

## References

- `epic-movement-triggers.md`
- `discovery/movement-readiness.md`
- `docs/spec/engine/movement-and-collision.md#e-20` through `#e-51`
- `docs/spec/engine/display-input-audio.md#e-49`, `#e-110` through `#e-113`
- `docs/spec/engine/main-loop-and-startup.md#e-03`, `#e-04`, `#e-33`
- `docs/spec/engine/movement-and-collision.md#e-19`, `#e-47`, `#e-48`
- `docs/spec/formats/board.md`, `character.md`, `item.md`
- Architecture AD-2, AD-7 through AD-10, AD-13, AD-14, AD-25, AD-26, AD-32
- `_bmad-output/initiative-rpgtoolkit-reawakened/discovery/docs-spec-reconciliation.md` R-50 through R-54
