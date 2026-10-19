---
title: "Load actors from character, enemy, item and status data"
type: 'feature'
ticket: 5
created: '2026-10-19'
status: draft
baseline_revision: '0975a26b54f8d7bf569f463a02b783b16ec0ea98'
risk: "medium"
context:
  - "spec - docs/spec/formats/character.md, enemy.md, item.md, battle-data.md"
  - "code - packages/core/src/formats/"
  - "fixtures - docs/spec/examples/game/"
---

## Intent

Data gives the default behaviour. Authored fixtures plus the examples corpus are the data source; no invented values.

## Boundaries

Loading only; no rules, no scripts.

## Key Decisions

1. Loading never reads behaviour code; the `behaviour` field is set from the data file's declared value or empty.

## Acceptance

1. Field-by-field equality with the inventory.
2. Defaults documented.

## Verification

Unit tests over the examples corpus.
