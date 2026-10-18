---
title: 'Independent movement oracle and authored fixtures'
type: 'feature'
ticket: 2
created: '2026-10-18'
status: 'draft'
baseline_revision: 'd53cdd804d5f93525c2aa4e444bc848e75f550a5'
risk: 'medium'
context:
  - 'docs/spec/engine/movement-and-collision.md'
  - '_bmad-output/initiative-rpgtoolkit-reawakened/epic-movement-triggers/discovery/movement-readiness.md'
  - '_bmad-output/initiative-rpgtoolkit-reawakened/epic-movement-triggers/discovery/inception-proposal.md'
---

## Intent
Produce the data source and observable oracle for every later movement and trigger implementation.

## Boundaries
Authored, anonymised or generated fixtures and a core-independent checker only. No legacy GPL source, no imports from `packages/core`, and no implementation behavior hidden in the fixture generator.

## Key Decisions
Use fixed-tick recorded inputs and named outcome facts, not legacy screenshot parity. Produce `movement-tile-pixel`, `collision-solid-stairs-under`, `collision-sprite-blocking`, `edges-board-link-program`, `board-entry-thread-lifecycle`, `triggers-precedence`, `actor-hydration-item-multitask`, `pathfinding-axial-diagonal-vector`, `input-replay-button-slots`, `movement-waits`, `animation-fallback-stance`, `random-encounter`, `demo-npc-pathfinding` and `demo-npc-battle-trigger`; include the reachable demo NPC/pathfinding scenario as a corpus case.

## Acceptance
Fixtures cover every named scene above. Each producer output has a stable name and expected per-tick outcome facts (positions, layers, fired triggers and events); core state/draw hashes are asserted by later consumer entries.

## Verification
Generator/check mode reproduces all committed fixtures; static import scan proves no `packages/core` dependency; later ticket references resolve to the concrete names above.
