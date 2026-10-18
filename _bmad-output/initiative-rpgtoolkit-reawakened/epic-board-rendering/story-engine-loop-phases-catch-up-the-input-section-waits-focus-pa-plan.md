---
title: 'Engine loop: phases, catch-up, input, waits, focus pause and presentation alpha'
type: feature
ticket: 19
created: '2026-10-17'
status: done
baseline_revision: 'fcd62d30'
route: full
route_source: pinned
risk: high
review: quick
review_source: pinned
lenses_ran: [quick]
review_loop_iteration: 0
context:
  - 'CLAUDE.md'
  - 'docs/guardrails.md'
  - 'docs/spec/engine/main-loop-and-startup.md#e-03'
  - 'docs/spec/engine/main-loop-and-startup.md#reawakened-presentation-alpha'
  - 'docs/spec/engine/display-input-audio.md#e-110'
  - 'docs/spec/engine/display-input-audio.md#e-113'
  - 'docs/spec/engine/rpgcode-errors-and-threads.md#threads'
  - '_bmad-output/initiative-rpgtoolkit-reawakened/architecture-rpgtoolkit-reawakened/architecture-rpgtoolkit-reawakened.md'
  - '_bmad-output/initiative-rpgtoolkit-reawakened/epic-board-rendering/epic-board-rendering.md'
  - '_bmad-output/initiative-rpgtoolkit-reawakened/epic-board-rendering/story-tracer-bullet-createengine-2d-board-composeboard-rasteriser-golden-png-plan.md'
  - '_bmad-output/initiative-rpgtoolkit-reawakened/epic-board-rendering/story-built-in-packs-seam-render-world-effects-plan.md'
---

<frozen-after-approval reason="delegated approval; build follows plan checkpoint">

## Intent

Complete `core/engine` as the deterministic fixed-tick coordinator. Preserve the public `Engine` seam from 4.5 while adding the named AD-26 phases, input ownership, read-only wait polling and claim protocol, focus pause, bounded catch-up, asset-reply latency invariance, and presentation-only alpha. The engine must execute real RPGCode programs through the existing VM registration seam and EffectBus without moving state ownership into the loop.

## Evidence policy

Implementation-facing choices cite the normative spec, AD decision, and merged code seam. Every proposed ruling states the rejected alternative. This plan does not read or copy legacy GPL source; docs/spec is the only behavior source.

## Key rulings

### R-1 Fixed phase list and registration

**Proposed ruling (pending owner review):** expose the exact ordered phase snapshot `input`, `waits`, `threads`, `movement`, `edges`, `triggers`, `battle`, `animation`, `audio`, `time`. `createEngine` accepts optional phase registrations keyed by these names; unknown names and duplicate registrations fail deterministically. Within a phase, registrations use explicit numeric rank then registration order. The loop calls phase owners only through data views and the existing EffectBus hook. **Evidence:** AD-26 fixes this list and rank ordering; AD-10 assigns one owner per state section; 4.5 already owns `createEngine`/asset loop and 4.11 requires synchronous effect posting. **Rejected:** letting modules append arbitrary callbacks or changing phase order per engine instance, which changes RNG/effect order and makes hashes depend on registration order.

### R-2 Input section and sequence claims

**Proposed ruling (pending owner review):** add `core/input` with plain-data key queue entries carrying a monotonic `seq`, held-key map, pointer state and focus state. The `input` phase applies all records stamped for the current tick in array order, records consumed events once, and updates input state without mutating VM waits. Asset/blob replies are applied before simulation and retain 4.5's loading freeze. Focus lost is consumed but causes no simulation ticks until a focus gained record is consumed. **Evidence:** AD-14 fixes input shape/order and core-written consumed log; E-110/E-113 require named-key queue and focus pause; AD-10 assigns `input` to core/input; 4.5 owns request/reply queuing. **Rejected:** resolving waits directly from the caller's input array or dropping key-up/focus events while paused, which makes batching and replay differ.

### R-3 Wait view and one-time key delivery

**Proposed ruling (pending owner review):** extend `WaitView` to a read-only `input`/`ui` view plus engine claim state. Parking an `input.key` wait stores the current input sequence as its lower bound. During `waits`, threads are visited ascending id; polling claims the lowest unclaimed key at or after that bound and returns it. Claims live in `engine`, are visible to later waiters in the same phase, and the input owner prunes claimed queue entries after polling. A key is therefore delivered exactly once; later ticks cannot redeliver it. **Evidence:** AD-9 and the AD-10/AD-26 rulings explicitly define the read-only view and engine claims; `ports/wait.ts` and `script/waits.ts` are the existing seams; acceptance requires two waiters/two keys. **Rejected:** writing the key into `input` or VM during each poll, which violates section ownership and allows same-tick ordering races; returning the first queue item without a claim, which redelivers it.

### R-4 Catch-up, fixed ticks, and batching

**Proposed ruling (pending owner review):** normalize `ticks` to a non-negative integer, apply `maxTicks` (argument override or init cap), and run that many complete 60 Hz ticks unless loading, paused, quit or breakpoint state prevents progress. Each tick runs the full phase list once; inputs are selected by absolute current tick and preserved in deterministic input order. An `advance` batch returns only completed ticks, and repeated calls with the same canonical log produce identical per-tick state and draw hashes regardless of batch size. **Evidence:** AD-1/AD-2/AD-26, E-03 and 4.5's current whole-tick API; G3 fixed tick; acceptance explicitly compares 1/7/60 batching. **Rejected:** advancing by elapsed fractional time or applying all inputs at batch start, which makes phase-visible state and event claims depend on caller batching.

### R-5 Focus and presentation alpha

**Proposed ruling (pending owner review):** focus loss sets `input.focused=false`, returns `ticksRun:0` while preserving queued inputs and requests, and consumes no non-focus events until focus is regained; focus gained reopens normal input processing without advancing a paused tick in the same event pass. `drawList(alpha)` clamps alpha to `[0,1]`, uses it only for camera/prior-sprite interpolation, and never stores or hashes it; alpha defaults to zero. **Evidence:** E-03/E-113 define pause, AD-1 and the 4.1/4.29 ruling make alpha presentation-only; current compose accepts alpha but engine forwards it. **Rejected:** advancing while unfocused then hiding the draw, which changes simulation; storing alpha in `GameState`, which violates deterministic state/hash contracts.

### R-6 Program execution and EffectBus seam

**Proposed ruling (pending owner review):** the threads phase drives the existing explicit-step VM with a bounded instruction budget, then dispatches recorded effects through the merged 4.11 EffectBus hook in post order. Blocking programs suspend idle input/triggers but background/persistent/item threads continue according to AD-26. Waits poll before thread execution, so a key claimed in the current tick can resume exactly once. **Evidence:** G1, AD-8/AD-9/AD-26, E-03/E-96, and 4.11's same-statement synchronous applier contract. **Rejected:** generators/native callbacks or a once-per-frame effect drain, which violate saveable state and make same-turn reads stale.

### R-7 Host input records stay outside save state

**Proposed ruling (pending owner review):** keep the not-yet-consumed `InputRecord` delivery queue in the engine loop closure, while the `input` save section contains only deterministic key/pointer/focus state and the key queue. A mid-flight snapshot/restore of `GameState` therefore does not capture pending external records or their host byte payloads; the runner MUST preserve and replay the canonical `TickReport.consumed` input log (and re-submit any not-yet-consumed records) to reproduce the run. **Evidence:** G1 requires `GameState` to satisfy `PlainData`; `AssetReply` and blob events carry `Uint8Array` bytes and therefore cannot be serialized as save-state values, while AD-5/AD-14 still require replies to remain ordered until consumed. **Rejected:** storing the complete external record queue in `GameState`, which makes the state non-plain and breaks snapshot/hash typing; encoding host bytes into save state, which adds an unapproved wire-format conversion and unnecessary allocation.

## Implementation map

- `packages/core/src/input/` — input section owner, sequence queue, held/pointer/focus updates and read-only view.
- `packages/core/src/save/sections/input.ts`, `engine.ts` and `save/state.ts` — plain-data queue/claim/phase/open-tick state and schema wiring.
- `packages/core/src/ports/input.ts`, `ports/wait.ts` and `script/waits.ts` — published input/wait view contracts and key polling/claim semantics.
- `packages/core/src/engine/engine.ts`, `engine/index.ts`, `engine/effects.ts` — fixed phase registry, input/reply application, catch-up/focus behavior, VM/EffectBus integration and alpha forwarding.
- `packages/core/test/engine.test.ts`, new `input.test.ts` and relevant script tests — phase snapshot, batching/latency invariance, key waits/claims, focus, cap, alpha and RPGCode execution.
- Update only package barrels/public entry points required by the existing graph; do not add host APIs or dependencies.

## Acceptance mapping

1. Phase snapshot equals the AD-26 list and registration order is deterministic.
2. One input log batched as 1, 7 and 60 ticks and asset replies delayed by varied ticks yields identical per-tick state/draw hashes.
3. A scripted key event resolves an `input.key` wait; two waiting threads receive two keys once each; no later redelivery occurs.
4. Focus loss consumes no simulation ticks until focus gained; `maxTicks` bounds catch-up.
5. `drawList(alpha)` is presentation-only and preserves state hash.
6. An authored RPGCode program runs through the engine and effects reach the 4.11 bus.

## Risks and mitigations

| Risk | Mitigation |
| --- | --- |
| Recent 4.5/4.11 seams drift while building | Merge origin/main before implementation and before gates; use existing public ports and EffectBus APIs only. |
| Input claims duplicate or reorder keys | Monotonic sequence, explicit lower bound, engine-local claim set and post-phase pruning tests. |
| Batching changes event visibility | Select by absolute tick and run one full phase list per completed tick; replay at 1/7/60 in tests. |
| VM loops starve the engine | Enforce per-tick instruction budget and test a bounded authored program. |
| Focus events strand queued input | Consume focus transitions while paused and retain non-focus events until the next real tick. |

## Plan change log

- 2026-10-17: Initial high-risk plan from `origin/main` `fcd62d30`; checked against AD-1/5/11/14/26, 4.5's engine/asset seam, 4.11's EffectBus, and the normative main-loop/input specs. Build proceeds immediately under delegated approval.

## Verification

After implementation the main agent should run all required gates. This worker will not run verification commands unless explicitly requested; expected checks include typecheck, lint, strict tests, golden/golden:bun, graph, licence, provenance, catalogue:check and command-docs:check.

</frozen-after-approval>
