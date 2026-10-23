---
title: "Cancelable beforePlay for script and engine-originated audio"
type: 'feature'
ticket: 4
created: '2026-10-19'
status: in-progress
baseline_revision: '98323e628792e16e31f89810f7fc7c95bdfd1190'
risk: "high"
context:
  - "spec - docs/spec/engine/audio-media.md#r-59-routing"
  - "code - packages/core/src/audio/runtime.ts, packages/core/src/engine/engine.ts"
  - "spike - epic-rpgcode-platform/discovery/step-budget-spike.md"
---

## Intent

Lane B (events). One cancelable step in front of every voice start at the applier, so one listener sees every sound the game makes.

## Boundaries

Use the existing MEDIA-3 contract and event system. Do not change unrelated effect records, event ordering, other event types, or audio routing. No-listener playback must retain the current cue stream and Epic 6 goldens.

## Key Decisions

1. Script-originated starts use ordinary cancelable dispatch and park the initiating script thread until listeners finish.
2. Engine-originated starts dispatch synchronously in the originating engine phase, in registration order, under the established step budget; they never park for input.
3. The applier is the shared start gate; cancellation must not allocate/steal/stop a voice or consume a cue ID.
4. Only `file`, `volume`, and `loop` are mutable. Invalid mutations diagnose and leave the corresponding original value unchanged.

## Acceptance

1. Each source (`script`, `board`, `animation`, `battle`, `menu`, `video`) reaches the same `media.beforePlay` listener sequence.
2. Listeners can cancel or mutate file, volume and loop; applied starts use validated values and cancellation emits no playback cue.
3. Script dispatch waits correctly, including `mediaPlay` returning a voice or null and `{wait:true}` continuing through voice completion.
4. Engine cancellation, wait attempts, and budget exhaustion do not park the engine phase or start playback after a failed dispatch.
5. Save/restore during dispatch completes with the same deterministic state hash.
6. With no listener, Epic 6 audio goldens and cue sequences remain unchanged.

## Implementation notes

- The audio runtime is the single application point for `script`, `board`, `animation`, `battle`, `menu` and `video` starts. It selects the slot before dispatch, so cancellation does not stop, steal, allocate a voice or consume a cue id.
- Script starts queue `media.beforePlay` through the ordinary event bus and park on an `event.dispatch` wait. The effect record retains the event handle and is retried after the events phase; accepted mutable `file`, `volume` and `loop` values are validated before the start.
- Engine starts use the detailed `runEngineCancelableEventOutcome` wrapper synchronously. Listener waits and budget exhaustion diagnose and terminate the listener without parking the originating engine phase.
- `media.beforePlay` native detail remains transient in `events.nativeDetails`; the script wait returns the voice record (or null/0 on cancellation), never the transient event object.
- Consumer tests cover script mutation/cancellation, cancellation without cue or voice allocation, parked-thread completion, and engine-effect starts for board cancellation, animation volume, battle replacement, menu and video source mapping, and listener order.
- Completed script dispatch synchronizes its handled marker and validated arguments into the matching `vm.effects` record, so saving/restoring the split pending-effect state resumes to the same deterministic hash.

## Verification

`pnpm typecheck`; `pnpm test` (1,796 passed; 19 fixture-fetch-dependent skips); `pnpm golden` (headless comparisons and all scene goldens pass); `pnpm lint`; focused audio/event suites and the event step-cost test (within 19.2 headroom).
