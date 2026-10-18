---
title: 'Movement, collision, trigger and gamepad rulings'
type: 'feature'
ticket: 1
created: '2026-10-18'
status: 'draft'
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
