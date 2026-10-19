---
title: "NPCs and board sprites as actors with behaviours"
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

## Intent

Join the two actor representations without changing observable movement behaviour; Lane A continues.

## Boundaries

Representation join only.

## Key Decisions

1. Movement observables are the 5.x oracle; nothing here may move a hash.

## Acceptance

1. Sprite is an actor; Epic 5 goldens unchanged.

## Verification

`pnpm test:strict`, golden job.
