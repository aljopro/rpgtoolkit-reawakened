---
title: 'Built-in packs seam: render and world packs, same-statement effect application, catalogue stub replacement'
type: feature
ticket: 11
created: '2026-10-17'
status: built
baseline_revision: '42816c2a'
route: full
route_source: pinned
risk: medium
review: quick
review_source: pinned
lenses_ran: [quick]
review_loop_iteration: 0
context:
  - 'CLAUDE.md'
  - 'docs/guardrails.md'
  - 'docs/spec/engine/rpgcode-runtime.md#reawakened-effect-dispatch'
  - '_bmad-output/initiative-rpgtoolkit-reawakened/architecture-rpgtoolkit-reawakened/architecture-rpgtoolkit-reawakened.md'
  - '_bmad-output/initiative-rpgtoolkit-reawakened/epic-board-rendering/epic-board-rendering.md'
  - '_bmad-output/initiative-rpgtoolkit-reawakened/epic-rpgcode-vm/discovery/command-effect-catalogue.json'
---

<frozen-after-approval reason="delegated implementation intent">

## Intent

Create the engine's render and world built-in packs, wire one synchronous section-effect bus, and replace catalogue stubs for commands owned by this epic without changing the public VM step-machine contract.

## Approach

The effect bus keeps pending records and dropped counters in the engine section, dispatches registered appliers synchronously in FIFO order, and exposes a VM callback invoked immediately after each audit-log record. Packs are layered above the catalogue and split by consuming lane so later entries add modules rather than editing one shared command list. Catalogue generation excludes names claimed by these packs.

## Boundaries

No renderer, world-edit, UI, animation, camera, or lifecycle behaviour beyond deterministic command effects is implemented here; owner commands report plain-data effects and the section appliers own mutation. No host APIs or legacy source are used.

## Ruling

**Proposed ruling (pending owner review):** `EffectBus` stamps direct posts with the VM audit sequence and current tick; VM-recorded effects are dispatched without a second audit record. Pending queues are capped at 256 per section, FIFO eviction increments a persistent dropped counter and appends a diagnostic. Rejected alternative: drain the VM audit log once per tick, which makes same-turn getters stale and couples application order to phase scheduling.

## Acceptance mapping

- `render` and `world` are present in the default manifest and exported as definitions.
- A registered applier sees a preceding built-in write before the next statement; 300 same-turn writes are all applied.
- Unowned effects queue and drain in order; cap eviction is observable through the dropped counter and diagnostic.
- Catalogue generation/check remains deterministic and owner names resolve through real packs; disabling a pack leaves catalogue responders available.
- Existing VM audit log remains bounded and plain data.

</frozen-after-approval>
