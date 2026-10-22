---
title: "Audio events from core state: started, stopped, ended, looped, paused, resumed, faded"
type: 'feature'
ticket: 3
created: '2026-10-19'
status: built
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
- [x] `packages/core/src/audio/runtime.ts`, `engine/engine.ts` — produce all seven ruled events at authoritative transition points without moving retirement or waits.
- [x] `packages/core/src/audio/events.ts`, `events/native.ts`, `events/model.ts`, `save/snapshot.ts` — reuse registered emitter identities and the one queue, preserve exact detail casing, and save/validate loop-observation cursors.
- [x] `packages/core/test/audio-{events,lifecycle-runtime,lifecycle-engine,lifecycle-replay}.test.ts`, `packages/synth/test/core-lifecycle.test.ts`, `audio-engine.test.ts` — cover all events, relay order, wake race, replacement, fade/loop edges, every-tick queued/in-flight restoration, and actual null/PCM source parity.
- [x] `docs/spec/engine/rpgcode-modules-and-objects.md#emit-13` — register lifecycle events.

**Acceptance Criteria:**
- Given an authored scripted run, when playback changes, then all seven event types have the ruled detail, order, and core tick; listener delivery and wait wake match the resolved phase contract.
- Given the same seed and inputs, when run twice and with a snapshot/restore at every tick, then event histories and state hashes match, including queued and in-flight dispatch.
- Given null and real audio backends, when the same scripted run plays, then core event histories match; early, late, duplicate and unknown `audio.ended` reports create no event and change no state hash.
- Given existing Toolkit 3.1 audio calls, when the current audio regression/golden suites run, then cue behavior remains unchanged except the owner-approved alias-routing repair and deliberate synthetic battle oracle update described below.

## Verification

`pnpm install --frozen-lockfile`, `pnpm fixtures:fetch` and `pnpm build` completed. Final changed-path smoke: 126 passed, 0 failed/skipped. Full `pnpm test` and fixture-backed `pnpm test:strict`: each 1770 passed, 0 failed/skipped. Passed gates: typecheck, lint, fixtures:check, closing (8/8 baselines), dump:check, oracle:check, graph:test/graph, licence:test/licence, audit --prod, provenance:test/provenance, fixtures:test, fixtures:author:check, catalogue:check, command-docs:test/check, no-skips:test, icons:test. Local logs: `/private/tmp/rpgtoolkit-482-gates/`. Tools: Node 26.8.1 (not CI-pinned 24.21.0), pnpm 12.10.1, Bun 1.4.2, Pillow 12.3.0.

**Deliberate G5 oracle update approved by owner:** include the documented alias-routing repair in #482 and update only `golden/audio/cues.json`'s `syntheticBattle.cues`. The repair now correctly applies initial title music at tick 1 before the synthetic battle handoff: title `media.play`, its `media.stop`, then battle `media.play`. The old synthetic oracle omitted the title play/stop because script aliases were not dispatched. Insert those two cues and advance subsequent cue ids by two; the tick-61 village handoff is otherwise unchanged. All normal sample-game cue rows and all unrelated goldens remain untouched. This explicit exception supersedes the epic's unchanged-cue-goldens expectation only for that synthetic stream; no mocked playback or weakened acceptance is used.

**Separate Basic oracle approval:** owner subsequently expressly approved correcting Basic too. The same documented alias-routing repair adds title `media.play` (cue 2) at tick 1 and `media.stop` (cue 3) at tick 61 after its existing `soundfont.set`. Only `games.Basic` gains those two rows; retain the approved synthetic correction and leave every other golden unchanged except the subsequently approved Demo correction below.

**Separate Demo oracle approval:** owner expressly approved Demo's missing title play at tick 1 and stop at tick 61; its existing village play at tick 61 is unchanged except cueId 2→4. A read-only in-memory routing-disabled comparison exactly reproduced the prior Demo oracle, proving all its deltas derive from the documented alias repair. Updated only that row; Basic and synthetic approvals remain in force, with every other golden untouched.

Final verification: `pnpm golden` and `pnpm golden:bun` both pass all eight sample cue streams, synthetic battle, script snapshots and independent scene goldens; Bun closing matches 8/8 baselines. Subsequent full rerun passes every gate listed above, including unit/strict (1770 each, no failures/skips), Node closing, and production audit. Final logs: `/private/tmp/rpgtoolkit-482-final-gates/`. Built, not Done; review/merge ownership remains external.

## Implementation Notes

Implemented in dedicated worktree `/private/tmp/rpgtoolkit-482-audio-events`, branch `feat/482-audio-events`; other worktrees/root checkout preserved. Owner-approved transitions are core-authoritative; native and script listeners share the existing queue. Media registration is lazy so an unused event domain does not change old state hashes. Voice registrations retire after pending notifications; loop cursors are plain saved event state, including mid-boundary snapshots. Game-load cue reconstruction suppresses lifecycle callbacks.

Acceptance exposed a pre-existing script/applier mismatch: VM effect records retain the called name (`wav`, `mediaplay`, etc.) while audio dispatch expected canonical dotted operations. The applier now maps the already-documented names to their existing canonical argument layouts without copying or rewriting the saved effect log. This makes actual script transitions observable rather than testing a fabricated callback. The existing batching regression driver was corrected to count total consumed ticks across asset stalls instead of only its last report.

Permanent tests include 55 snapshots, fresh runtime/script-service reconstruction from every one, and comparison of every subsequent state hash and delivered script history with queued and waiting in-flight dispatch. A separate one-tick-wrap test proves a snapshot inside a boundary/loop-setting tick cannot duplicate a wrap. The real engine waiter tests cover no mutation, explicit stop and an applied cached-asset restart before retirement. Null/real runner equivalence uses actual `VoiceMachine` null and PCM source registries, decodes/renders the authored WAV, verifies real non-zero PCM versus silence, feeds actual source completion reports back to core, and compares per-tick hashes and lifecycle histories. No physical audio device/browser check is claimed.

## Plan Change Log

- 2026-10-22 — Rebased the skeletal draft from `0975a26b54f8d7bf569f463a02b783b16ec0ea98` to `6863560522aea599a75e9317270dfa648a3290a3`; expanded the verified MEDIA-2/EMIT contract and isolated missing owner decisions rather than treating draft as approved.
- 2026-10-22 — Owner approved the defaults and authorized explicit FIFO/traversal-consistent order. Normative MEDIA-2/P2/P5 amended in `89dc5576`; removed the resolved questions and marked ready-for-dev before implementation.
- 2026-10-22 — Implemented and exercised the full lifecycle contract; kept status in-progress and old goldens unchanged pending owner adjudication of the pre-existing alias repair versus cue-golden preservation.
- 2026-10-22 — Owner expressly approved including the alias repair and the synthetic-only oracle correction in #482; updated that oracle with its rationale, retaining all unrelated goldens.
- 2026-10-22 — Owner separately approved Basic's two missing title music cues; made the minimum Basic-only correction, retaining the synthetic update and all other golden rows.
- 2026-10-22 — Owner separately approved Demo's title cues and consequential village cue-id advance; no other oracle changes authorized or made.

## Review Triage Log

Independent reviewer `epic21-audio-review` reviewed committed implementation/source/tests and reported no concrete actionable correctness or maintainability findings. Reviewer ran no gates; all exercised gate evidence above is from this implementation workstream.
