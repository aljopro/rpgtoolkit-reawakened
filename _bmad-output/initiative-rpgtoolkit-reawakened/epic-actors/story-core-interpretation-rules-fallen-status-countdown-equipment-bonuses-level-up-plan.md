---
title: "Core interpretation rules: fallen, status countdown, equipment bonuses, level-up"
type: 'feature'
ticket: 6
created: '2026-10-19'
status: draft
baseline_revision: '0975a26b54f8d7bf569f463a02b783b16ec0ea98'
risk: "high"
context:
  - "spec - docs/spec/engine/actors.md (ACT rows from 20.1)"
  - "spec - docs/spec/engine/plugins-and-battle.md#e-75, E-77, E-78 (data only; the 'each round while charged' rule is stock-battle)"
  - "code - packages/core/src/actors/ (from 20.3)"
---

## Intent

Hooks with defaults: fallen, level-up and damage-taken exist as named hook points; entry 7 lets a behaviour override them. This entry builds the defaults and the hook call sites.

## Boundaries

No ATB, no damage formulas, no AI (Epic 7). No behaviour registration (7).

## Key Decisions

1. R-16 (resolved, owner 2026-10-19): level and experience are stats; level-up and the other abilities are standard equations in code with defaults, overridable by behaviours. The default level-up equation is the one 20.1 rules; Epic 7 inherits it.

2. Fallen is a state, never a removal (owner, 2026-10-19): default HP <= 0, behaviour-overridable; the actor stays in the party; revival is the state changing back (HP raised or a behaviour-defined revive); both `fallen` and `revived` events fire (emitted by 20.9).

## Acceptance

1. Four defaults implemented as hooks.
2. Round definition is the caller's.

## Verification

Unit tests with fixture data.
