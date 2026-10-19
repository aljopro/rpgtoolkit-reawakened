---
title: "Legacy classes on the dictionary runtime"
type: 'feature'
ticket: 5
created: '2026-10-19'
status: draft
baseline_revision: '0975a26b54f8d7bf569f463a02b783b16ec0ea98'
risk: "high"
context:
  - "spec - docs/spec/engine/rpgcode-modules-and-objects.md (OOP-1 to OOP-10)"
  - "code - packages/core/src/script/ (class lowering and object table)"
---

## Intent

Delete the parallel legacy object representation once the dictionary runtime exists. Done clean-cutover: migrate every caller, no shim. If a state-hash change is unavoidable the plan lists it and the golden is re-recorded deliberately (G5).

## Boundaries

Representation of classes only; no new syntax. Legacy behaviour is the oracle.

## Key Decisions

1. Legacy compatibility is the 3.1 behaviour in docs/spec, not the previous Reawakened save format (owner, 2026-10-18).

## Acceptance

1. One object runtime.
2. All legacy object behaviour rows still pass.
3. Goldens unchanged or deliberately re-recorded with reasons.

## Verification

`pnpm test:strict`, golden job.

Handoff: the editor (Epic 11/12 or editor P1) should later offer a legacy-class to dictionary-object conversion tool (nice-to-have.md).
