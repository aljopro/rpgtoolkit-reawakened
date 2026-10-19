---
title: "Save and hydrate actors by behaviour name"
type: 'feature'
ticket: 8
created: '2026-10-19'
status: draft
baseline_revision: '0975a26b54f8d7bf569f463a02b783b16ec0ea98'
risk: "high"
context:
  - "spec - docs/spec/formats/save-game.md (new actors section, version bump rules)"
  - "code - packages/core/src/save/sections/"
  - "adr - docs/adr/0004 (18.6 saving closures)"
---

## Intent

'A service that takes the actor': hydration walks the actor section after the host has rebuilt services. Owns the save section schema version and migration.

## Boundaries

Save/restore only; no new rules.

## Key Decisions

1. Package version governs code, saves cannot go stale against new code.

## Acceptance

1. Missing-behaviour path.
2. Version-upgrade path.
3. No callable in the section.

## Verification

Unit tests; round-trip hash equality; golden for restore.
