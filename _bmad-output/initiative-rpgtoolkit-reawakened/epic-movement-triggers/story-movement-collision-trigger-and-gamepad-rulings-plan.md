---
title: 'Movement, collision, trigger and gamepad rulings'
type: 'feature'
ticket: 1
created: '2026-10-18'
status: 'built'
baseline_revision: 'd53cdd804d5f93525c2aa4e444bc848e75f550a5'
risk: 'high'
context:
  - 'docs/guardrails.md'
  - 'docs/spec/engine/movement-and-collision.md'
  - 'docs/spec/engine/display-input-audio.md'
  - 'docs/spec/engine/main-loop-and-startup.md'
  - '_bmad-output/initiative-rpgtoolkit-reawakened/epic-movement-triggers/discovery/movement-readiness.md'
  - '_bmad-output/initiative-rpgtoolkit-reawakened/epic-movement-triggers/discovery/inception-proposal.md'
---

## Intent
Set the observable movement, collision, trigger precedence, edge-arrival and gamepad rules before implementation. This is the human-owned G7 checkpoint.

## Boundaries
Docs/spec and only the affected architecture/catalogue contract rows. No TypeScript, fixtures, goldens or generated code. Do not reopen Epic 4's key-claim or draw-list decisions.

## Key Decisions
- Proposed R-50 through R-54 and E-112 rules are recommendations pending owner approval.
- Ratify fixed 60 Hz, AD-25 total ordering, actor fallbacks, condition-before/set-after, and the shared key claim protocol.
- Proposed (pending entry 5.1 owner approval): the numeric VM budget remains an Epic 3 provider contract; entry 5.12 verifies its movement-visible behavior and may open a docs-first amendment if required.

## Acceptance
Every proposed row has evidence, a rejected alternative, an OWNER marker, and a stable anchor consumed by later tickets. The docs explicitly state what remains deferred to battle, menu/save, audio, runners and tooling.

## Verification
Run catalogue and provenance checks, link/anchor review, and the independent ticket-store validation. A person approves the plan checkpoint before implementation tickets become ready-for-dev.

## Implementation Notes

- **Ruled (Jensen, 2026-10-18):** R-50 to R-54 and E-112 approved exactly as written in `discovery/inception-proposal.md` section 2; the "Proposed" notes in this plan are approved.
- **Written to docs/spec:** `docs/spec/engine/movement-and-collision.md` anchors `#r-50`, `#r-51` (direct collision = entry 5.4, diversion = entry 5.5), `#r-52`, `#r-53`, `#r-54` and `#r-50-ratifications` (fixed tick, total order, actor fall-backs, condition-before/set-after, key claims, VM-budget boundary, deferrals); `docs/spec/engine/display-input-audio.md#reawakened-gamepad-contract` (E-112). Each carries an OWNER marker, evidence, the rejected alternative and a deterministic rule.
- **Unverified defaults inside the approved rules** (recorded in the docs, for owner awareness): R-51 120-tick wait, one diversion attempt per blocked step and queue-ahead; E-112 dead-zone 250, device range 0..3 and the bit layout; R-54 integer scaling (x256) and the `tan 63°` rational for the isometric threshold.
- **Other rows touched:** `parity-checklist.md` conflict note; spine Deferred bullet for the VM budget. No catalogue row changed. No TypeScript, fixtures or goldens.
