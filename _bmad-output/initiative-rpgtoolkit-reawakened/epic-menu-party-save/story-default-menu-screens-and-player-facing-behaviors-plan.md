---
title: "Default menu screens and player-facing behaviors"
type: 'feature'
ticket: 8
created: '2026-10-22'
risk: "high"
context:
  - "spec - docs/spec/engine/plugins-and-battle.md#e-80"
  - "spec - docs/spec/engine/plugins-and-battle.md#e-123"
---

## Intent

Deliver the stock player menu screens and all E-80 behavior through the controller established in entry 7.

## Boundaries

Main, inventory, equipment and abilities screen draw lists and choices; item/party operations stay in entries 3–6, the controller in entry 7, and Save/Load mechanics in entries 9–10, which this screen integration consumes.

## Acceptance

Scripted inputs cover party portraits/stats, gold/play time, item use/info/drop and key-item refusal, member/slot/item selection and removal, abilities use/info, and Save/Load/Quit routed through their implemented behavior, plus direct screen entry, `MenuGraphic` and cursor sounds.

## Verification

Headless golden and state tests assert exact draw-list order, selected values, command results, save gating and deterministic sound cues for each screen.

## Implementation map

Read and invoke the owner ports; presentation replays draw lists and never holds menu/game state inside a renderer.
