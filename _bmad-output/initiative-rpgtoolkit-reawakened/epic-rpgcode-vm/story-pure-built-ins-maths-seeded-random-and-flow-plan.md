---
title: 'Pure built-ins: maths, seeded random and flow'
type: 'feature'
ticket: 13
created: '2026-10-16'
status: 'built'
baseline_revision: '536f33051b503ed5da72c2ce1a55ef8ab0402ce2'
route: 'full'
route_source: 'pinned'
risk: 'medium'
review: ''
review_source: ''
lenses_ran: []
review_loop_iteration: 0
context:
  - /Users/jensen/projects/rpgtoolkit-reawakened/docs/guardrails.md
  - /Users/jensen/projects/rpgtoolkit-reawakened/docs/spec/engine/rpgcode-language.md
  - /Users/jensen/projects/rpgtoolkit-reawakened/_bmad-output/initiative-rpgtoolkit-reawakened/architecture-rpgtoolkit-reawakened/architecture-rpgtoolkit-reawakened.md
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** The catalogue currently resolves the language's mathematical, random and clock calls through generic responders, so scripts receive placeholder values instead of deterministic results. Flow names exist, but this ticket must prove their program-boundary semantics, especially `end()` at arbitrary call depth and across included and `run()` programs.

**Approach:** Add a pure built-in pack for `random`, `sin`, `cos`, `tan`, `sqrt`, `log`, `iif` and `getTickCount`, using the injected RNG/clock and `core/fmath`; keep flow effects as plain-data VM controls and harden them with end-to-end tests and snapshot replay coverage.

## Boundaries & Constraints

**Always:** G1 explicit step-machine/plain-data state; G3 fixed tick and one seeded RNG; mathematical operations use only `core/fmath`; optional by-reference outputs follow AD-8; `end` clears every pending frame and wait.

**Never:** host APIs, `Math.random`, forbidden `Math` members, wall-clock time, generators/Promises, or domain effects outside pure VM flow.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|---|---|---|---|
| random happy path | positive whole max | inclusive integer in 1..max; one RNG draw | invalid max is `builtin.bad-arg` |
| math | finite or domain-edge number | fmath result and optional output write-back | fmath determines NaN/Infinity domain result |
| end nested | end in deeply called function | all frames abandoned, thread finished, later statements skipped | no return frame remains |
| end snapshot | snapshot before end, restore, execute | restored run ends identically and preserves RNG/state hash | restore uses existing schema checks |
| run/include | end in inline run or included function | whole owning program chain terminates | no pending caller frame resumes |

</frozen-after-approval>

## Code Map

- `packages/core/src/script/builtins.ts` -- core command pack assembly; add the pure pack here so it is the pinned implementation rather than a generic catalogue result.
- `packages/core/src/script/builtins/pure.ts` -- new handlers for deterministic math, random, conditional, and tick count; reuse `fmath`, `RngPort`, `ClockPort`, and shared value conversion.
- `packages/core/src/script/catalogue-stubs.ts` -- generated catalogue placeholders; leave catalogue metadata intact while ensuring implemented names are not selected over the pure pack.
- `packages/core/src/script/catalogue-responders.ts` -- existing plain-data `run`, `rpgcode`, `delay`, `done`, `stop`, and `branch` controls; reuse these effects and avoid a second flow mechanism.
- `packages/core/src/script/vm.ts` -- applies `vm.control` effects; existing end/run handling is the frame-unwind/program-replacement seam to verify and only adjust if tests expose a gap.
- `packages/core/test/script-builtins-pure.test.ts`, `script-control-flow.test.ts`, `script-state.test.ts` -- existing harnesses for built-ins, flow, and snapshot restore.

## Tasks & Acceptance

**Execution:**
- [ ] `packages/core/src/script/builtins/pure.ts`, `builtins.ts` -- implement and register pure names with correct optional by-ref signatures and deterministic ports.
- [ ] `packages/core/src/script/catalogue-stubs.ts`, `catalogue-responders.ts` -- prevent generic layers from shadowing the real pure handlers while preserving catalogue completeness and existing flow controls.
- [ ] `packages/core/test/script-builtins-pure.test.ts`, `script-control-flow.test.ts`, `script-state.test.ts` -- test math/fmath routing, inclusive seeded random and snapshot continuation, flow calls, nested/include/run end unwinding, and restored end behavior.

**Acceptance Criteria:**
- Given equal seeds and identical calls, when random sequences execute and a snapshot is restored, then both runs produce identical values and canonical state.
- Given math calls, when scripts invoke every registered pure math name, then results match `core/fmath` including edge/domain behavior and optional outputs.
- Given nested calls, an included function, or a `run()` program, when `end`/`done`/`stop` executes, then every pending frame is abandoned and no later statement runs.
- Given a snapshot taken before end, when restored and advanced, then it finishes with the same end result and state hash.

## Implementation Notes

Implemented the pure built-in pack and registration cutover:

- Added `PURE_SPECS` for fmath-backed `sin`, `cos`, `tan`, `sqrt`, and `log`; seeded `random`; `iif`; fixed-tick `getTickCount`; and VM flow (`run`, `change`, `rpgcode`, `delay`, `end`/`done`/`stop`, `branch`).
- Added deterministic `fmath.sqrt` export and pinned vectors, and filtered implemented names (including aliases) from generated/default catalogue layers.
- Added math/domain, seeded random snapshot, nested/include/run unwinding, and snapshot-before-end tests.

Verification completed: `pnpm typecheck`, `pnpm lint`, `pnpm fixtures:fetch`, `pnpm test:strict` (894 passed, 0 skipped), `pnpm golden`, `pnpm graph`, `pnpm licence`, `pnpm provenance`, and `pnpm catalogue:check`.

## Plan Change Log

## Review Triage Log

## Design Notes

Random uses the existing xoshiro port's next `u32` and a deterministic modulo mapping (`1 + draw % max`); this fixes draw order without adding a second stream or state. `getTickCount` derives integer milliseconds from the fixed 60 Hz tick (`floor(tick * 1000 / 60)`), never host time. Existing flow responders already emit the required plain-data controls; the implementation should retain their effects and focus tests on the FUN-7 boundary.

## Verification

**Commands:**
- `pnpm typecheck` -- all TypeScript project references pass.
- `pnpm lint` -- G1/G3 restrictions pass.
- `pnpm fixtures:fetch` then `pnpm test:strict` -- all tests pass with no skips.
- `pnpm test:golden`, `pnpm graph:check`, `pnpm licence:check`, `pnpm provenance:check` -- repository gates pass.

