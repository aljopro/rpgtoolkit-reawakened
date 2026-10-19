---
title: "Cancelable beforePlay for script and engine-originated audio"
type: 'feature'
ticket: 4
created: '2026-10-19'
status: draft
baseline_revision: '0975a26b54f8d7bf569f463a02b783b16ec0ea98'
risk: "high"
context:
  - "spec - docs/spec/engine/audio-media.md#r-59-routing"
  - "code - packages/core/src/audio/runtime.ts, packages/core/src/engine/engine.ts"
  - "spike - epic-rpgcode-platform/discovery/step-budget-spike.md"
---

## Intent

Lane B (events). One cancelable step in front of every voice start at the applier, so one listener sees every sound the game makes.

## Boundaries

Does not change the effect records Epic 4 posts. Ordering of the effect queue is unchanged when no listener is registered.

## Key Decisions

1. Dispatch runs listeners in registration order inside the audio phase and never waits on input (Assumption A-3).
2. The event carries its source.

## Acceptance

1. Cancel, change and replace work for each source.
2. No listener: cue stream and Epic 6 goldens unchanged.

## Verification

Unit tests; golden; step-cost measurement against the 19.2 headroom.
