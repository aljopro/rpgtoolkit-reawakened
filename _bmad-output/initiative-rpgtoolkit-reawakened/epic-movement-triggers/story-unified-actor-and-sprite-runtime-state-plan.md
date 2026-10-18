---
title: 'Unified actor and sprite runtime state'
type: 'feature'
ticket: 3
created: '2026-10-18'
status: 'draft'
baseline_revision: 'd53cdd804d5f93525c2aa4e444bc848e75f550a5'
risk: 'high'
context:
  - '_bmad-output/initiative-rpgtoolkit-reawakened/architecture-rpgtoolkit-reawakened/architecture-rpgtoolkit-reawakened.md, AD-10, AD-32'
  - 'docs/spec/engine/movement-and-collision.md#e-20'
  - '_bmad-output/initiative-rpgtoolkit-reawakened/epic-board-rendering/epic-board-rendering.md'
---

## Intent
Turn hydrated character/item data into one plain-data Unified Actor runtime and supply the engine's sprite-facing ports.

## Boundaries
Own `sprites`, actor runtime state, selected player, queues/waypoints, SpriteDraw production, CameraTarget and PlayerPresencePort. Do not own board geometry, compositor sorting, party roster operations or save blobs.

## Key Decisions
Use compact runtime item indices; preserve actor hulls and animation references; schema-version the section; keep prior positions presentation-only.

## Acceptance
Board hydration creates deterministic players/items, snapshot/restore preserves state, draw IDs obey Epic 4's order, camera/player-presence ports read the same actors, and startup/reset seams use the published ports.

## Verification
Unit and integration tests cover hydration, selected-player lookup, state hash, migration/restore and SpriteDraw/CameraTarget contract behavior.
