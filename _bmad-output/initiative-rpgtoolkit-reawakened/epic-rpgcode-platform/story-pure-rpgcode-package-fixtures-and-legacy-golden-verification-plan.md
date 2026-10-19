---
title: "Pure-RPGCode package fixtures and legacy golden verification"
type: 'feature'
ticket: 14
created: '2026-10-19'
status: draft
baseline_revision: '0975a26b54f8d7bf569f463a02b783b16ec0ea98'
risk: "high"
context:
  - "fixtures - packages/core/test/fixtures/"
  - "golden - golden/scenes/"
---

## Intent

Prove the platform end to end before Epic 20 builds on it. Fixtures are authored, never legacy games (G7).

## Boundaries

Fixtures and goldens only.

## Key Decisions

1. Fixtures live beside the 18.7 plugin fixtures.

## Acceptance

1. Three fixture packages pinned.
2. Zero legacy diffs.

## Verification

`pnpm test:strict`, golden job.
