---
title: 'Actor animation and presentation integration'
type: 'feature'
ticket: 10
created: '2026-10-18'
status: done
baseline_revision: 'a3c1a027'
route: 'full'
route_source: 'pinned'
risk: 'medium'
review: ''
review_source: ''
lenses_ran: []
review_loop_iteration: 0
context:
  - 'docs/spec/formats/character.md#defaults-and-fall-backs'
  - 'docs/spec/engine/movement-and-collision.md#e-21'
  - 'docs/guardrails.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

Connect actor movement state to directional animation and the already-landed compositor contract.

## Boundaries & Constraints

**Always:** Use one plain-data animation state for players and items, fixed 60 Hz ticks, R-09 fallback selection, existing `SpriteDraw` and compositor interpolation, and a deterministic stance-completion result for entry 5.7.

**Never:** Duplicate compositor or camera state, depend on provider 4.23 audio effects, use wall-clock timing, or make presentation alpha part of simulation outcomes.

</frozen-after-approval>

## Code Map

- `packages/core/src/sprites/model.ts` -- unified actor visual and movement state; extend with plain-data animation metadata and stance completion state.
- `packages/core/src/sprites/movement.ts` -- fixed-tick actor transitions, facing and `prev`; release held stances when movement starts.
- `packages/core/src/sprites/runtime.ts` -- authoritative actor-to-`SpriteDraw` conversion; populate the existing frame/phase fields without changing compositor ordering.
- `packages/core/src/sprites/animation.ts` -- actor animation selection, fixed-tick frame timing, stance commands and animation-phase registration.
- `packages/core/src/sprites/index.ts` -- additive public exports.
- `packages/core/test/sprites-animation.test.ts` -- core-driven authored fixture cases, per-tick facts, state/draw hash separation, and snapshot/batching invariants.
- `packages/core/test/fixtures/movement/animation-fallback-stance.json` -- all four authored cases and expected per-tick facts; no fixture cases are deferred.
- `packages/core/src/render/compose.ts` -- existing `SpriteFrame`, `prev`, and alpha interpolation contract; do not modify.
- `packages/core/src/render/animation.ts` -- existing script animation phase; actor animation must register alongside it, not duplicate it or audio handling.

## Tasks & Acceptance

**Execution:**
- [x] Add shared actor animation metadata and deterministic plain-data state, including resolved key, frame, tick counter, idle counter, stance completion and held/released result.
- [x] Implement directional walk/idle fallbacks, fixed-tick frame timing, stance start/hold/complete/release, and animation-phase registration for both players and items.
- [x] Feed selected file/frame through `SpriteDraw` and preserve `prev` for compositor alpha; do not own camera/compositor state.
- [x] Drive every `animation-fallback-stance` case through core and assert every expected tick, plus state/draw hash and snapshot/restore batching invariants.

**Acceptance Criteria:**
- Given a missing diagonal walk or idle, when the animation phase runs, then it selects the nearest horizontal walk or walk-as-idle fallback for players and items.
- Given fixed-tick animation metadata, when ticks advance, then frame changes occur only at `secondsToTicks(delay)` and idle starts after `idleTime`.
- Given a custom stance, when it reaches its final frame, then a deterministic completion record is emitted once; held stances complete as held and release on movement.
- Given movement followed by a draw, when alpha is supplied to the compositor, then `SpriteDraw.prev` supplies interpolation while state and draw hashes remain separated from alpha.

## Implementation Notes

Implemented the shared player/item animation owner in `sprites/animation.ts`. Directional slots use the character/item format order and R-09 falls back diagonal requests to the matching horizontal slot; an absent idle slot falls back to walk. Frame and idle counters advance only from fixed ticks using `secondsToTicks`, while stance start/completion/release records are plain deterministic data. Selected file/frame are emitted through the existing `SpriteDraw` contract, with movement `prev` left authoritative for compositor interpolation. Provider 4.23 is not a dependency: this entry does not add animation audio effects and registers alongside the existing animation phase.

## Plan Change Log

## Review Triage Log

## Design Notes

Actor animation metadata is an injected, saveable description of decoded animation timing (`frames`, `delayTicks`, optional frame payload). The animation owner selects filenames from actor-format direction slots and leaves actual image decoding to existing asset/compositor providers. Completion events are returned from the animation phase as plain data so the movement-wait owner can consume them without callbacks in saved state.

## Verification

- `pnpm exec tsc -p packages/core/tsconfig.json --noEmit` -- expected: typecheck succeeds.
- `pnpm exec eslint packages/core/src/sprites packages/core/test/sprites-animation.test.ts` -- expected: lint succeeds.
- `pnpm fixtures:fetch` -- expected: required fixture corpus is available.
- `pnpm test:strict` -- expected: strict core and package tests succeed.
- `pnpm fixtures:author:check` -- expected: authored movement fixture integrity succeeds.
- `pnpm fixtures:test` -- expected: independent oracle and all named animation cases succeed.
- `pnpm golden` -- expected: headless golden outputs succeed.
- `pnpm golden:bun` -- expected: Bun golden outputs succeed.
- `pnpm graph` -- expected: dependency graph check succeeds.
- `pnpm licence` -- expected: dependency licence check succeeds.
- `pnpm provenance` -- expected: provenance check succeeds.
- `pnpm catalogue:check` -- expected: command catalogue check succeeds.
- `pnpm command-docs:check` -- expected: command documentation check succeeds.
