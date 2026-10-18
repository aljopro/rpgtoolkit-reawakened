---
title: 'Replay, snapshot, reset and downstream contract sweep'
type: 'feature'
ticket: 12
created: '2026-10-18'
status: 'draft'
baseline_revision: 'd53cdd804d5f93525c2aa4e444bc848e75f550a5'
risk: 'high'
context:
  - '_bmad-output/initiative-rpgtoolkit-reawakened/epic-movement-triggers/discovery/movement-readiness.md'
  - '_bmad-output/initiative-rpgtoolkit-reawakened/epic-movement-triggers/discovery/inception-proposal.md'
  - '_bmad-output/initiative-rpgtoolkit-reawakened/architecture-rpgtoolkit-reawakened/architecture-rpgtoolkit-reawakened.md, AD-1, AD-23'
---

## Intent
Prove Epic 5 end to end and reconcile every shared seam and downstream handoff.

## Boundaries
Integration/replay tests, migrations, reset registration, catalogue/barrel/phase reconciliation and documentation of battle/menu/save/web/tooling contracts. No new movement behavior belongs here.

## Key Decisions
Use recorded inputs, state/draw hashes and explicit outcomes; compare different advance batching and cache policies; treat the demo NPC scenario as a compatibility case, not a parity oracle.

## Acceptance
Authored and reachable corpus scenarios replay identically, snapshots restore, cache flushes do not change outputs, all owned names resolve, reset is section-correct, and handoffs are complete.

## Verification
Run the full repository gates required by the epic workflow: typecheck, test, lint, provenance, licence, fixture fetch/strict tests, golden, graph, catalogue and dependency checks.
