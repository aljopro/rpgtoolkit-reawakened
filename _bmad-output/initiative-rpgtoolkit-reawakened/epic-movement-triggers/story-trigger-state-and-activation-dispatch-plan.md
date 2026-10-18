---
title: 'Trigger state and activation dispatch'
type: 'feature'
ticket: 8
created: '2026-10-18'
status: 'draft'
baseline_revision: 'd53cdd804d5f93525c2aa4e444bc848e75f550a5'
risk: 'high'
context:
  - 'docs/spec/engine/movement-and-collision.md#e-40'
  - 'docs/spec/engine/movement-and-collision.md#e-44'
  - 'docs/spec/formats/board.md'
  - '_bmad-output/initiative-rpgtoolkit-reawakened/epic-movement-triggers/discovery/inception-proposal.md'
---

## Intent
Implement deterministic board/item activation and trigger lifecycle in the triggers section.

## Boundaries
Own trigger state, candidate selection, conditions, repeat/armed state, gone suppression and trigger-phase program starts. Do not own VM frames or battle resolution.

## Key Decisions
Filter layer and condition before selection; items precede regions; use compact item indices and approved board order; set-after occurs only after successful completion; trigger-owned movement is silent.

## Acceptance
Fixtures prove step/key/repeat, item precedence/frontness, layer matching, conditions, stop movement, gone scope, run-once and re-arm behavior.

## Verification
Trigger phase tests, blocking-program integration, catalogue checks and snapshot/reset coverage.
