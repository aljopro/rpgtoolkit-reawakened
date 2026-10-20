---
title: "Actor store: party members, enemies and NPCs as plain-data actors"
type: 'feature'
ticket: 3
created: '2026-10-19'
status: built
baseline_revision: '0975a26b54f8d7bf569f463a02b783b16ec0ea98'
risk: "high"
context:
  - "spec - docs/spec/engine/actors.md (20.1, 20.2)"
  - "spine - AD-10, AD-32"
  - "code - packages/core/src/sprites/, packages/core/src/save/"
  - "code - StatsPort (E-85) and vm.globals character stats"
---

## Intent

Lane A (core/actors): entries 3, 5, 6, 7, 8 run in order; entry 3 owns the actors barrel, section registration, deterministic scalar actor ids and the mapping from an id to the `actor:<id>` emitter key. Object handles are runtime views and never actor identity.

## Boundaries

Data, ids, section and StatsPort bridge only. No rules (5), no loading from files (6), no script objects or host-method hydration (4).

## Key Decisions

1. One owner per section (AD-10, amended 2026-10-19): `core/actors` owns the actor section, including actor stats; `vm.globals` character stats are aliases onto it. The actor id is stable data identity; the object handle and emitter registration are rebuilt runtime identities.

## Acceptance

1. Plain-data records; snapshot/restore; hash equality.
2. StatsPort path resolves to the actor section (one owner, no copies); the save shape change is one deliberate golden re-record (G5) and reset clears the actor section.

## Verification

Unit tests; `pnpm typecheck` PlainData rule.
