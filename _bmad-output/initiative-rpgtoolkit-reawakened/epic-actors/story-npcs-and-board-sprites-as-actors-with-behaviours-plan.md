---
title: "Actor-backed NPCs and board sprites with behaviours"
type: 'feature'
ticket: 10
created: '2026-10-19'
status: draft
baseline_revision: '0975a26b54f8d7bf569f463a02b783b16ec0ea98'
risk: "medium"
context:
  - "spine - AD-32"
  - "plan - epic-movement-triggers 5.3 (unified actor and sprite runtime state)"
  - "code - packages/core/src/sprites/"
---

Actor data and board sprite data remain separate plain-data records. A board sprite may reference an actor, while actor-backed NPCs receive the same behaviour and action dispatch without making the sprite an actor subtype.

Join actor-backed board integration without changing observable movement behaviour; Lane A continues.

## Boundaries

Representation join only.

## Key Decisions

1. Movement observables are the 5.x oracle; nothing here may move a hash.

## Acceptance

1. An actor-backed board sprite references an actor; Epic 5 movement, collision, trigger and golden behaviour remains unchanged.

## Verification

`pnpm test:strict`, golden job.
