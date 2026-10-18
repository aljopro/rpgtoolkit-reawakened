---
title: 'Actor animation and presentation integration'
type: 'feature'
ticket: 10
created: '2026-10-18'
status: 'draft'
baseline_revision: 'd53cdd804d5f93525c2aa4e444bc848e75f550a5'
risk: 'medium'
context:
  - 'docs/spec/formats/character.md#defaults-and-fall-backs'
  - 'docs/spec/engine/movement-and-collision.md#e-21'
  - '_bmad-output/initiative-rpgtoolkit-reawakened/epic-board-rendering/epic-board-rendering.md'
---

## Intent
Connect actor movement state to directional animation and the already-landed compositor contract.

## Boundaries
Own actor facing/frame selection, idle/walk/stance timing and prior-position presentation data. Do not reorder draw commands, own camera state or create a renderer.

## Key Decisions
Use fixed ticks and documented fallback animations; keep presentation alpha out of state and hashes; stance completion resolves through existing waits.

## Acceptance
Animation fixtures prove fallback, timing, facing, stance completion and state/draw hash separation; SpriteDraw consumers remain unchanged.

## Verification
Focused animation, movement-wait and compositor integration tests.
