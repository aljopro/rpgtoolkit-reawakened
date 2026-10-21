---
title: "Two battle scripts over one actor model, with goldens"
type: 'feature'
ticket: 13
created: '2026-10-19'
status: draft
baseline_revision: '0975a26b54f8d7bf569f463a02b783b16ec0ea98'
risk: "high"
context:
  - "fixtures - packages/core/test/fixtures/"
  - "golden - golden/scenes/"
---

## Intent

Closing end-to-end proof of the actor boundary. Fixtures are authored (G7) and use the corpus `startups` seam that 19.14 already exercises, while 19.17 (#562) supplies the production package loader; 19.16 is the closed docs handoff.

## Boundaries

Fixtures and goldens; not the stock battle (Epic 7).

## Key Decisions

1. Two pinned scripts use one actor model; their fallen, damage-taken and level-up differences come only from `registerBehaviour` in package start-up. `beforeDamage` is sent by the battle thread, not from a listener, and the one-tick cancelable resume is included in the timing.

## Acceptance

1. Two pinned scripts.
2. Zero legacy diffs.

## Verification

`pnpm test:strict`, golden job.
