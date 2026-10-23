---
title: "Menu state sections and owner ports"
type: 'feature'
ticket: 2
created: '2026-10-22'
risk: "high"
context:
  - "spine - AD-10, AD-23"
  - "spec - docs/spec/formats/save-game.md"
status: in-review
---

## Intent

Create the stable plain-data boundary used by every party, inventory, menu and save story. This is the tracer entry: prove the new section owners can be reset, snapshotted and restored through the existing headless engine path.

## Boundaries

Own the `party`, `inventory` and `menu` section shapes and their ports/migrations. Actor stats, UI message rendering, host storage and package startup remain owned by their existing layers.

## Key decisions

- Define serializable data only; no callables, host handles or renderer objects in sections.
- Each section owns its mutations and migration; cross-section workflows call owner ports rather than writing another section.
- Register sections through the current engine reset/snapshot/restore seams, amended by entry 1.
- The exact version-2 shapes, action unions, result/error record, cross-reference validation, immutable read views and `menu.state` effect routing are specified in `docs/spec/formats/save-game.md#reawakened-canonical-party-inventory-and-menu-state`.
- Prefer an object-valued capability façade over a flat callback list; section ports are internal core capabilities. The RPGCode-facing menu presentation façade belongs to entry 7 and will use OOP-12 rather than serialized methods.
- EMIT-8/EMIT-13 remain for the event-producing stories. This entry introduces no built-in party/inventory emitters or item/gold events and therefore requires no additional owner ruling.

## Acceptance

An authored headless script mutates each section through its owner port and observes the same canonical state after snapshot/restore and reset.

The G5 state-hash baselines deliberately change because three formerly empty
sections and their schema versions now carry explicit version-2 data. Record
the script corpus, battle-script and sample-game closing hashes; no pixel,
draw-list, audio-cue or gameplay outcome is intended to change. For both battle
fixtures, rehashing every captured state with only these three sections and
schema versions projected back to their version-1 placeholders reproduced
every previous pinned per-tick hash.

## Verification

Add deterministic tests for valid initial state, mutation boundaries, migrations, cross-section ownership and equal hashes after a round trip.

## Implementation map

Inspect the existing save section registry, reset seam, `GameState` and Epic 20 actor state; keep new types and migrations in `core/menu` and reuse the snapshot contract rather than introducing a second store.
