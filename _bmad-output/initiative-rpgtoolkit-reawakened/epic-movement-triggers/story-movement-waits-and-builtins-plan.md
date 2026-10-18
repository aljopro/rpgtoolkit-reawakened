---
title: 'Movement waits and movement and input built-ins'
type: 'feature'
ticket: 7
created: '2026-10-18'
status: 'draft'
baseline_revision: 'd53cdd804d5f93525c2aa4e444bc848e75f550a5'
risk: 'high'
context:
  - 'docs/spec/engine/rpgcode-functions.md'
  - '_bmad-output/initiative-rpgtoolkit-reawakened/architecture-rpgtoolkit-reawakened/architecture-rpgtoolkit-reawakened.md, AD-8, AD-9'
  - 'packages/core/src/ports/wait.ts'
---

## Intent
Replace movement test doubles with real wait/effect behavior and register the movement/input command surface.

## Boundaries
Own movement wait resolution and movement/input built-in modules, including by-reference outputs and multiRun coupling. Do not mutate sprites/input directly from command callbacks.

## Key Decisions
Use the existing `movement` wait and key-claim protocol; commands emit effects, requests, outputs or waits through AD-8; VM numeric budget remains Epic 3's concern.

## Acceptance
Script fixtures cover paths, waits, waypoints, multiRun, locations, restore mid-wait, wait/get/clearBuffer and buttons; catalogue ownership has no duplicate stubs.

## Verification
Run script, wait, snapshot and catalogue responder tests plus focused end-to-end movement programs.
