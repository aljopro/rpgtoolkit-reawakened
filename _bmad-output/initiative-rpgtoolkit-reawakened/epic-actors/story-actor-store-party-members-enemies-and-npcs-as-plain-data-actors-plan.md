---
title: "Actor store: party members, enemies and NPCs as plain-data actors"
type: 'feature'
ticket: 3
created: '2026-10-19'
status: draft
baseline_revision: '0975a26b54f8d7bf569f463a02b783b16ec0ea98'
risk: "high"
context:
  - "spec - docs/spec/engine/actors.md (20.1, 20.2)"
  - "spine - AD-10, AD-32"
  - "code - packages/core/src/sprites/, packages/core/src/save/"
  - "code - StatsPort (E-85) and vm.globals character stats"
---

## Intent

Lane A (core/actors): entries 3, 5, 6, 7, 8 run in order; entry 3 owns the actors barrel and the section registration.

## Boundaries

Data, ids, section and StatsPort bridge only. No rules (5), no loading from files (6), no script objects (4).

## Key Decisions

1. One owner per section (AD-10): `core/actors` owns the actor section.

## Acceptance

1. Plain-data records; snapshot/restore; hash equality.
2. StatsPort path reads and writes through the owner.

## Verification

Unit tests; `pnpm typecheck` PlainData rule.
