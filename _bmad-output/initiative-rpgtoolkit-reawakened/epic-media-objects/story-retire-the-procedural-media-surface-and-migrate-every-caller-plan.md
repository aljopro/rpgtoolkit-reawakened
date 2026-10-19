---
title: "Retire the procedural media surface and migrate every caller"
type: 'feature'
ticket: 6
created: '2026-10-19'
status: draft
baseline_revision: '0975a26b54f8d7bf569f463a02b783b16ec0ea98'
risk: "medium"
context:
  - "code - packages/core/src/script/packs/media.ts, virtuals.ts"
  - "fixtures - packages/core/test/fixtures/audio/, tools/fixtures/audio/"
  - "spec - audio-media.md, rpgcode-functions.md"
---

## Intent

Lane C (objects). Clean cutover: nothing of the removed surface stays as a shim or alias.

## Boundaries

Only the net-new names the 21.1 list names. Every 3.1 alias stays.

## Key Decisions

1. Each re-recorded golden gets a written reason (G5).

## Acceptance

1. A repository search finds no removed name outside the ruled history notes.
2. Catalogue and command-docs gates pass.

## Verification

Full suite, catalogue:check, command-docs:check.
