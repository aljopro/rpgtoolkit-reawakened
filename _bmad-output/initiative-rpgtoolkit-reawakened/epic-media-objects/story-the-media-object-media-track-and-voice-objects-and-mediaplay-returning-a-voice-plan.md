---
title: "The media object: media, track and voice objects, and mediaPlay returning a voice"
type: 'feature'
ticket: 5
created: '2026-10-19'
status: draft
baseline_revision: '0975a26b54f8d7bf569f463a02b783b16ec0ea98'
risk: "high"
context:
  - "spec - docs/spec/engine/audio-media.md as amended by 21.1"
  - "spec - object and receiver rows written by 19.1"
  - "code - packages/core/src/script/packs/media.ts, packages/core/src/audio/runtime.ts"
---

## Intent

Lane C (objects). Builds the script-facing object model over the unchanged audio state.

## Boundaries

No new playback behaviour: fades, seeks, loops, waits and stealing are the Epic 6 rules reached through methods. Does not remove the old commands; that is 21.6.

## Key Decisions

1. The voice object holds data only; the stale check is the cueId check Epic 6 already has.
2. A method call that waits parks the thread on the existing `audio.track` wait.

## Acceptance

1. Ruled results through objects.
2. A stale voice cannot control its successor.
3. No callable in the audio section of a save.

## Verification

Unit tests; snapshot at every tick; alias goldens unchanged.
