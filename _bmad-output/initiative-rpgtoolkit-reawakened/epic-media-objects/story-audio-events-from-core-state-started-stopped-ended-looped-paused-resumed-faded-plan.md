---
title: "Audio events from core state: started, stopped, ended, looped, paused, resumed, faded"
type: 'feature'
ticket: 3
created: '2026-10-19'
status: ready-for-dev
baseline_revision: '6863560522aea599a75e9317270dfa648a3290a3'
risk: "medium"
route: 'full'
route_source: 'auto'
context:
  - "docs/guardrails.md"
  - "docs/spec/engine/audio-media.md#media-2"
  - "docs/spec/engine/audio-media.md#audio-time-model"
  - "docs/spec/engine/audio-media.md#audio-track-wait"
  - "docs/spec/engine/rpgcode-modules-and-objects.md#emit-1"
  - "docs/spec/engine/rpgcode-modules-and-objects.md#emit-20"
---

## Intent

Implement #482 / 21.3: observe core-authoritative voice transitions through the existing queued emitter bus, independently of the runner's audio device. Rebased on main after merged #480/#481. Owner-approved defaults and the FIFO/traversal-consistent simultaneous-transition policy are normative in the separate docs-first commit `89dc5576`; this plan is ready for implementation.

## Boundaries & Constraints

**Always:** Follow G1–G7, derive behavior only from `docs/`, keep event state plain JSON, and reuse the single emitter queue and dispatcher. Preserve the existing cue stream, playback/wait behavior, and Toolkit 3.1 calls. Dependencies #480 (21.1), #460 (19.10), and #462 (19.12) are closed/Done.

**Never:** Add `beforePlay` (#483), implement the control/return-value object API (#484), retire procedural commands (#485), change runner authority, add listeners or closures to audio state, or consult legacy GPL source.

## Verified Event Contract

1. `audio-media.md#media-2` defines exactly seven non-cancelable types: `started`, `stopped`, `ended`, `looped`, `paused`, `resumed`, `faded`.
2. The plain-data detail has exactly `track`, `slot`, `cueId`, `file`, `tick`. The original draft's `slot` spelling is correct; the existing runtime's `voice` selector is not the event-field spelling. `tick` is the core tick of the applied transition, not device time or delivery time.
3. For each notification, enqueue voice, then track, then global `media`, preserving detail. These are explicit re-emits, not bubbling. EMIT-14 then preserves queue order and listener-registration order.
4. EMIT-6/14 defines the envelope as `type`, `target`, `detail`, `cancelable`, `canceled`, `cancel`. No playback `source` or `synthetic` field is ruled. The six-value `source` list belongs only to MEDIA-3's `beforePlay`; do not copy it into lifecycle detail or invent an origin discriminator.
5. EMIT-14 places dispatch after `threads`: events queued in `waits`/`threads` may deliver that tick; events queued in `animation`/`audio` deliver next tick, subject to the shared step budget. Notification production must not synchronously run a listener.
6. MEDIA-1 specifies stop before start for replacement and wake in the following waits phase. P2/P5 make natural-end waits core-authoritative. A runner's `audio.ended` cannot create a lifecycle notification or change ordering.

## Code Map

- `packages/core/src/audio/runtime.ts` — `startVoice`, `stopVoice`, pause/resume, `refresh`, `phase`, `fade`, `pollWait`, and `load` own transitions and cues. Natural end is currently retired in `phase()`; fades are also finalized by refresh calls. Reuse these decisions rather than infer changes from runner cues.
- `packages/core/src/engine/engine.ts` — constructs audio runtime; `waits` resolves script waits before `threads`; `audio` later calls `audio.phase()`. Wire notifications to the shared bus without moving retirement or wakes.
- `packages/core/src/events/emitter.ts` — `registerEmitter`, `queueNativeEvent`, and unregister/deferred retirement implement built-in identity, plain detail conversion, and queue ownership.
- `packages/core/src/events/dispatch.ts`, `native.ts` — reuse dispatch, native event views, saved queue, and GC roots; do not create a second bus.
- `packages/core/test/audio-runtime.test.ts`, `audio-engine.test.ts`, `audio-restore.test.ts` — existing playback, wait, cue and restore regression suites; extend with permanent event tests after the contract is settled.
- `docs/spec/engine/rpgcode-modules-and-objects.md#emit-13` — add standard-event rows once semantics are ruled; lifecycle events must not accidentally become undeclared custom types.

## Approved Lifecycle Decisions

- Natural retirement emits `ended` in audio, without `stopped`; a wait may wake first. Explicit stop/displacement before retirement emits `stopped` and suppresses `ended`. Replacement/stealing emits old `stopped` before new `started`.
- `looped` is only a natural wrap, not a seek/flag change. `faded` is once per completed voice fade, or per active voice at track-fade completion, including zero-duration application; empty tracks emit none.
- Audio traversal is configured track order: all finite retirements by slot, then natural wraps by slot, then surviving voice-fade completions by slot, then track-fade completions by slot. Each event relays voice → track → media before the next event. Explicit operations and their refreshes retain FIFO application order.
- Game load reconstructs cues without lifecycle notifications; snapshot restore resumes saved queue/state without duplicates. No outstanding owner questions remain.

## Tasks & Acceptance

**Execution:**
- [x] `docs/spec/engine/audio-media.md#media-2` — record owner answers in a separate docs-first commit, reconcile P2/P5 timing, then complete this plan and commit `ready-for-dev` before code.
- [ ] `packages/core/src/audio/runtime.ts`, `engine/engine.ts` — produce all seven ruled events at their authoritative transition points without changing cues or waits.
- [ ] `packages/core/src/events/emitter.ts`, `native.ts` — reuse registered emitter identities and the one queue; expose detail with the exact ruled keys and casing.
- [ ] `packages/core/test/audio-runtime.test.ts`, `audio-engine.test.ts`, `audio-restore.test.ts` — cover every event, relay and registration order, wake timing, replacement, fade/loop edge cases, and restore at every tick.
- [ ] `docs/spec/engine/rpgcode-modules-and-objects.md#emit-13` — register the implemented lifecycle surface; update this plan to built only after verification, never done before review/merge.

**Acceptance Criteria:**
- Given an authored scripted run, when playback changes, then all seven event types have the ruled detail, order, and core tick; listener delivery and wait wake match the resolved phase contract.
- Given the same seed and inputs, when run twice and with a snapshot/restore at every tick, then event histories and state hashes match, including queued and in-flight dispatch.
- Given null and real audio backends, when the same scripted run plays, then core event histories match; early, late, duplicate and unknown `audio.ended` reports create no event and change no state hash.
- Given existing Toolkit 3.1 audio calls, when the current audio regression/golden suites run, then cue behavior remains unchanged.

## Verification

Planned, not executed: install dependencies, build, then run changed-path audio/engine/emitter/restore tests and null/real backend equivalence smoke. Run CONTRIBUTING.md's available local gates: typecheck, lint, tests and fixture-backed strict tests, golden/closing/dump/oracle checks, graph, licence/audit, provenance, fixture/catalogue/command-doc/no-skips/icon tool tests, and Bun replay. Record actual results and unavailable prerequisites individually; do not claim a real-device check from a null-backend test.

## Implementation Notes

No implementation or normative spec changes made. Dedicated worktree `/private/tmp/rpgtoolkit-482-audio-events`, branch `feat/482-audio-events`; other worktrees and tracked root-checkout content are preserved.

## Plan Change Log

- 2026-10-22 — Rebased the skeletal draft from `0975a26b54f8d7bf569f463a02b783b16ec0ea98` to `6863560522aea599a75e9317270dfa648a3290a3`; expanded the verified MEDIA-2/EMIT contract and isolated missing owner decisions rather than treating draft as approved.
- 2026-10-22 — Owner approved the defaults and authorized explicit FIFO/traversal-consistent order. Normative MEDIA-2/P2/P5 amended in `89dc5576`; removed the resolved questions and marked ready-for-dev before implementation.

## Review Triage Log

No implementation review performed.
