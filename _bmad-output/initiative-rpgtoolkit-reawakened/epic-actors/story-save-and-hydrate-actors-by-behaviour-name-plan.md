---
title: "Save and hydrate actors by behaviour name"
type: 'feature'
ticket: 8
created: '2026-10-19'
status: done
baseline_revision: '934cd203'
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

## Implementation map

- `docs/spec/formats/save-game.md` defines the Reawakened canonical `actors`
  section: actor records are plain data and carry a behaviour name only.
- `packages/core/src/actors/model.ts` owns the persisted actor records and
  schema validation; `packages/core/src/save/snapshot.ts` migrates old saves
  without an actor section and validates the current section.
- `packages/core/src/script/package-startup.ts` rebuilds package behaviour
  registrations and resolves every actor after startup. The registry is
  session-only and is never part of the snapshot.
- `packages/runner-harness/src/script-host.ts` runs startup against a fresh
  state on boot and against both scratch and restored services on restore.
  This ensures restored actor operations use the rebuilt registry.

## Consumer verification

- `packages/runner-harness/test/script-host.test.ts` restores a saved actor
  without its package and asserts that the actor remains loaded, the core
  default operation commits, and one located `behaviour.missing` diagnostic is
  emitted.
- The same test restores the save with a newer implementation under the same
  behaviour name and asserts that the newer hook changes the committed actor
  result.
- The test asserts the saved actor has only plain data and no hook member or
  callable. It also keeps an unknown host type as data and asserts the located
  `object.invalid` diagnostic occurs only when its method is first called.
- Existing closure snapshot/restore tests remain the verification for ADR 0004
  (18.6); this ticket does not alter the closure schema.

## Review triage

No open review findings at implementation start. The prior 20.7 lifecycle
review is the prerequisite: startup receives the exact resolved plugin list,
runs in manifest order, and is applied to the actual restored services after
scratch validation. This ticket adds consumer coverage for the save/load
contract rather than another registry or package-loader surface.

## Independent review

The fresh independent review of the exact working-tree diff approved the
implementation with no actionable findings. It confirmed that the consumer
tests cover missing-behaviour fallback and located diagnostics, newer package
resolution, plain-data actor snapshots, and deferred missing-host-type
failure. The review also confirmed that restore rebuilds the registry before
actor use and that the plan and ticket remain aligned with the normative save
and actor contracts.

## Verification result

Focused actor/host restore tests pass (30 tests). Full required gates pass on
the implementation tree: fixture fetch/check, `test:strict` (1692/1692 with
no skips), typecheck, lint, build, Node golden, Bun golden/closing (8/8),
graph tests (8), licence tests (35), provenance tests (56), and catalogue
check.

## Remote review disposition

The exact remote-head review identified one documentation mismatch: the new
save-format section said actor schema version `1`, while the normative actor
contract and implementation use version `2` with version-1 migration. The
save-format wording is corrected to `2`; no runtime change is required.
