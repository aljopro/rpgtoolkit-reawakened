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

'A service that takes the actor': after `restoreScriptHost` or the engine restore seam rebuilds package services and runs `runPackageStartup` on a scratch state, hydration walks the actor section and resolves the saved behaviour name and host type. It owns the save section schema version and migration.

## Boundaries

Save/restore and hydration only; no new rules or package loader (19.16 owns the catalogue-to-start-up seam).

## Key Decisions

1. Package version governs code, saves cannot go stale against new code, and actors record no version.
2. Behaviour registrations and host methods are session data rebuilt at package start-up; the save carries actor data, host type name and behaviour name only.
3. A missing behaviour falls back to the core default with a located diagnostic; a missing host type leaves data loaded and diagnoses when its method is first called.

## Acceptance

1. Missing-behaviour path.
2. Version-upgrade path.
3. No callable in the section.

## Verification

Unit tests; round-trip hash equality; golden for restore.
