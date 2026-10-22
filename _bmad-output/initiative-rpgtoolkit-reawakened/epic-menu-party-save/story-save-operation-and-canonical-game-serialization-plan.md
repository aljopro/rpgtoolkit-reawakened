---
title: "Save operation and canonical game serialization"
type: 'feature'
ticket: 9
created: '2026-10-22'
risk: "high"
context:
  - "spec - docs/spec/formats/save-game.md"
  - "spine - AD-7, AD-10, AD-11, AD-17, AD-23"
---

## Intent

Write a versioned canonical snapshot of the complete game and route save I/O only through the injected `saveBlob` port keyed by `GameId`.

## Boundaries

Serialization, schema versioning and board-level permission check. `loadBlob` validation/restore is entry 10; the host filesystem is never accessed from core.

## Acceptance

A mid-script save includes globals, object/closure state, actor/party/inventory/equipment/menu and UI sections, board live-item records, all thread state, movement configuration, RNG and clock; a board that forbids saving refuses without modifying state.

## Verification

Serialize equivalent states twice and compare canonical bytes/hash; round-trip each required section, exercise the blocked-save boundary, and prove G1/G2/G3 compliance with no host calls or nondeterministic data.

## Implementation map

Reuse existing `saveBlob` request and canonical save section registry. Each section owner supplies its serializer; do not centralize domain mutation or copy shared state.
