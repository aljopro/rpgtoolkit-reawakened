---
title: "Core interpretation rules: fallen, status countdown, equipment bonuses, level-up"
type: 'feature'
ticket: 6
created: '2026-10-20'
status: 'built'
baseline_revision: '123ad29d09cc0dd8849344c8d37299f28d1e0fd0'
route: 'full'
route_source: 'pinned'
risk: 'high'
review: ''
review_source: ''
lenses_ran: []
review_loop_iteration: 0
context:
  - "docs/spec/engine/actors.md"
  - "docs/spec/engine/progression-and-levels.md"
  - "docs/spec/engine/plugins-and-battle.md"
  - "packages/core/src/actors/"
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Actor records exist, but the core has no owner operations for the ruled fallen/revival state, status lifetime, equipment-derived bonuses, or progression arithmetic. Later event and behaviour owners need deterministic transition data without a second actor store or a battle loop.

**Approach:** Add pure, synchronous actor-owner rule operations that validate and commit plain-data changes, return transition records, and accept direct hook implementations without registering behaviours or dispatching events. Complete the documented progression state so large awards, thresholds, and max-level handling survive saves.

## Boundaries & Constraints

**Always:** Use the actor section as the sole mutable owner; preserve actors on falling; derive equipment bonuses from supplied item data; use integer deterministic arithmetic; clamp HP/SMP to their maxima; return `cause` and `source` transition details; keep hooks synchronous and plain-data; do not use a clock or RNG.

**Never:** Add ATB, battle rounds, damage formulas, AI, UI, event-bus dispatch, behaviour registration, inventory storage, executable state, or a `beforeDamage`/damage-taken core rule.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| FALLEN | HP crosses from positive to zero/negative | Retained actor plus one `fallen` transition with cause/source | Invalid cause/source rejected |
| REVIVAL | Fallen actor receives HP above zero | One `revived` transition; no removal or duplicate transition | HP remains non-positive means no revival |
| STATUS | `advanceStatus(n)` on several counters | Every counter decremented by n; zero counters removed; ordered `statusChanged` details | n must be a finite non-negative integer |
| EQUIPMENT | Equipped item references and four-number bonuses | Sum bonuses and apply stat deltas; HP/SMP remain clamped | Unknown/malformed item data rejected |
| LEVEL | XP award crosses multiple thresholds or max level | Total XP retained; each permitted level applies growth; current HP/SMP unchanged | Invalid award/policy rejected |

</frozen-after-approval>

## Code Map

- `packages/core/src/actors/model.ts` — authoritative actor records, validation, action boundary; extend progression state and preserve plain-data invariants.
- `packages/core/src/actors/rules.ts` — new core rule operations, hook contracts, deterministic equations, and transition records; no registry or event dispatch.
- `packages/core/src/actors/index.ts` — export the rule surface.
- `packages/core/src/actors/hydrate.ts` — initialize persisted progression state from character source fields.
- `packages/core/test/actors.test.ts` — existing owner/hydration contracts that must remain stable after the new state fields.
- `packages/core/test/actor-rules.test.ts` — fixture tests for transitions, two caller-defined round policies, equipment, hooks, progression branches, boundaries, and errors.
- `docs/spec/engine/actors.md` and `docs/spec/engine/progression-and-levels.md` — normative contracts; clarify transition payloads and saved progression fields before code if needed.

## Tasks & Acceptance

**Execution:**
- [x] Amend normative actor/progression wording first if exact transition or persisted progression fields are absent; commit that documentation separately.
- [x] Extend actor plain-data progression state and hydration defaults without storing callables.
- [x] Implement fallen/revival, `advanceStatus`, equipment derivation/application, and XP/level-up operations with the closed five-hook list (`levelUp`, `revive`, `statusChanged`, `equipmentChanged`, `statsChanged`).
- [x] Add focused permanent tests and update existing hydration expectations.
- [x] Run all ticket gates, then mark this plan `built` only after every gate passes.

**Acceptance Criteria:**
- Given HP changes, when the default predicate crosses HP <= 0, then the actor remains present and exactly one fallen/revived transition carries the ruled cause/source.
- Given any caller-defined timing policy, when it calls `advanceStatus(n)`, then the same counters and exact statusChanged details result independent of that policy.
- Given item definitions, when equipment is applied, then the actor owner stores their summed bonuses and derived stats without an inventory or battle dependency.
- Given a valid XP award, when thresholds are crossed, then both levelUpType branches, percentage exclusion of equipment, multi-level awards, maxLevel, legacy-program precedence, and no current HP/SMP refill hold.
- Given no hook/registry/event bus, when operations run, then core defaults execute synchronously and only plain transition data is returned.

## Implementation Notes
Implemented the actor-owner operations in `packages/core/src/actors/rules.ts`: HP-derived fallen/revival transitions, caller-defined status countdown, normalized `.itm` equipment bonus derivation, and deterministic XP/level-up arithmetic. Core returns plain transitions and a `legacyLevelUps` handoff for legacy level-up precedence without invoking a program or applying default growth. Equipment/current-stat semantics are explicit: HP/SMP bonuses change current and maximum values; removal clamps current values, and boundary transitions use `cause: "script"` and `source: null`. Item equip/remove programs remain Epic 8 ownership and are not executed here. Hydration derives non-initial threshold state by recurrence for stored levels above one. The E-82 anchor was verified at `docs/spec/engine/plugins-and-battle.md#e-82`.

The sequential continuation issue #472's behaviour/damage override work remains outside 20.6; the closed five-hook contract and battle-owned `beforeDamage` boundary were preserved.


## Plan Change Log
2026-10-20 — Added normative transition payload, progression persistence, equipment input/ownership, legacy handoff, and non-initial hydration wording before implementation commits. Reconciled item equip/remove programs to Epic 8; no executable program path or callable is stored.


## Review Triage Log
2026-10-20 — Independent review fixes: status hook receives clamped post-operation rounds; duplicate equipment references are rejected; negative growth policy is rejected; legacy awards return plain handoffs without core stat growth; stored levels above one derive recurrence state. Full ticket gates passed.


## Verification

- `pnpm fixtures:fetch` — SUCCESS
- `pnpm fixtures:check` — SUCCESS
- `pnpm fixtures:test` — SUCCESS (98)
- `pnpm test:strict` — SUCCESS (1,666; no skips)
- `pnpm typecheck` — SUCCESS
- `pnpm lint` — SUCCESS
- `pnpm build` — SUCCESS
- `pnpm golden` — SUCCESS
- `pnpm golden:bun` — SUCCESS
- `pnpm graph` / `pnpm graph:test` — SUCCESS
- `pnpm licence` / `pnpm licence:test` — SUCCESS
- `pnpm provenance` / `pnpm provenance:test` — SUCCESS
- `pnpm catalogue:check` — SUCCESS
- Repository ticket gates listed in the request — expected: SUCCESS.
