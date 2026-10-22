---
title: "Party operations and RPGCode built-ins"
type: 'feature'
ticket: 3
created: '2026-10-22'
risk: "high"
context:
  - "spec - docs/spec/engine/plugins-and-battle.md#e-85"
  - "spec - docs/spec/engine/actors.md"
---

## Intent

Expose the party operations and legacy player/party built-ins over Epic 20's actor model through the Epic 8 party owner port.

## Boundaries

Roster membership, active-member selection, slot ordering and party-facing RPGCode adapters only. Actor-owned stats and battle fighter state are not copied into the party section.

## Acceptance

A deterministic RPGCode fixture adds and removes members, swaps party positions, changes the active member, reads/writes allowed party fields, and confirms actor identity and state remain linked.

## Verification

Assert operation results, boundary diagnostics, built-in registration, exact party and actor snapshots, and identical post-restore behavior; retain existing actor tests unchanged.

## Implementation map

Build on the section/port contracts from entry 2 and the actor operations from Epic 20; keep aliases thin and preserve the documented RPGCode calling convention.
