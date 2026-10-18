---
title: 'Board edges and transitions'
type: 'feature'
ticket: 9
created: '2026-10-18'
status: 'draft'
baseline_revision: 'd53cdd804d5f93525c2aa4e444bc848e75f550a5'
risk: 'high'
context:
  - 'docs/spec/engine/movement-and-collision.md#e-28'
  - 'docs/spec/engine/movement-and-collision.md#e-47'
  - 'docs/spec/engine/movement-and-collision.md#e-19'
  - 'docs/spec/engine/main-loop-and-startup.md#reawakened-board-entry'
---

## Intent
Complete edge/link movement and board-entry lifecycle over Epic 4's boot/send seam.

## Boundaries
Own edges phase behavior, arrival checks, links, thread lifecycle, destination deactivation, trigger reload, camera handoff and path-cache clearing. Do not own save loading or battle/menu behavior.

## Key Decisions
Apply approved R-53 alignment; distinguish board and `.prg` links; preserve persistent threads; reject blocked destinations without partial board replacement; use existing audio/effect routes.

## Acceptance
Two-board scenes cover no-link blocking, successful/blocked arrivals, program links, entry programs, thread lifecycle, deactivation, camera and cache behavior.

## Verification
Fixed-tick replay under one-tick and batched advances, state hashes, diagnostics and board-entry tests.
