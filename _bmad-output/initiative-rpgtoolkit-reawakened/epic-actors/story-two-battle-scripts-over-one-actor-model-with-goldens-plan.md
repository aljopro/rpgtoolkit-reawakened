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

Closing end-to-end proof of the actor boundary. Fixtures are authored (G7).

## Boundaries

Fixtures and goldens; not the stock battle (Epic 7).

## Key Decisions

None beyond the epic Notes.

## Acceptance

1. Two pinned scripts.
2. Zero legacy diffs.

## Verification

`pnpm test:strict`, golden job.
