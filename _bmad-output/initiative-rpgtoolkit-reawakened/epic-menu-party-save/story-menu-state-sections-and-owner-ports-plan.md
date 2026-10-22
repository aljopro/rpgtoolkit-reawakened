---
title: "Menu state sections and owner ports"
type: 'feature'
ticket: 2
created: '2026-10-22'
risk: "high"
context:
  - "spine - AD-10, AD-23"
  - "spec - docs/spec/formats/save-game.md"
---

## Intent

Create the stable plain-data boundary used by every party, inventory, menu and save story. This is the tracer entry: prove the new section owners can be reset, snapshotted and restored through the existing headless engine path.

## Boundaries

Own the `party`, `inventory` and `menu` section shapes and their ports/migrations. Actor stats, UI message rendering, host storage and package startup remain owned by their existing layers.

## Key decisions

- Define serializable data only; no callables, host handles or renderer objects in sections.
- Each section owns its mutations and migration; cross-section workflows call owner ports rather than writing another section.
- Register sections through the current engine reset/snapshot/restore seams, amended by entry 1.

## Acceptance

An authored headless script mutates each section through its owner port and observes the same canonical state after snapshot/restore and reset.

## Verification

Add deterministic tests for valid initial state, mutation boundaries, migrations, cross-section ownership and equal hashes after a round trip.

## Implementation map

Inspect the existing save section registry, reset seam, `GameState` and Epic 20 actor state; keep new types and migrations in `core/menu` and reuse the snapshot contract rather than introducing a second store.
