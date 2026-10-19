---
title: "Audio events from core state: started, stopped, ended, looped, paused, resumed, faded"
type: 'feature'
ticket: 3
created: '2026-10-19'
status: draft
baseline_revision: '0975a26b54f8d7bf569f463a02b783b16ec0ea98'
risk: "medium"
context:
  - "spec - docs/spec/engine/audio-media.md (P2, P5)"
  - "code - packages/core/src/audio/runtime.ts, packages/core/src/ports/audio.ts"
  - "spec - emitter section written by 19.1"
---

## Intent

Lane B (events). The audio core emits plain-data events where it already decides the transition. It does not read a runner or a device.

## Boundaries

Events out only; `beforePlay` is 21.4 and the objects are 21.5. A runner's `audio.ended` stays advisory and never produces an event.

## Key Decisions

1. End ticks emit at the waits phase; the order against a wait's wake is the ruled one.
2. Event fields are plain data: track, slot, cueId, file, tick.

## Acceptance

1. Ruled events, order and ticks.
2. Same stream with a null and a real runner.

## Verification

Unit tests; hash equality across restore; golden for event order.
