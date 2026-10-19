---
title: "Actor, board and game events: fallen, status, leveledUp, enter and leave"
type: 'feature'
ticket: 9
created: '2026-10-19'
status: draft
baseline_revision: '0975a26b54f8d7bf569f463a02b783b16ec0ea98'
risk: "medium"
context:
  - "spec - docs/spec/engine/actors.md; emitter section (19.1)"
  - "code - packages/core/src/actors/, packages/core/src/world/"
  - "plan - epic-movement-triggers 5.9 (board edges and transitions)"
---

## Intent

Uses 19's emitters; the set of event names is ruled in 20.1. Whether party or battle become built-in emitters is Assumption A-3.

## Boundaries

Event sources only.

## Key Decisions

1. No bubbling: re-emitting on the game is code in the stock package, not engine behaviour.

## Acceptance

1. Event sources and payloads match the ruling.

## Verification

Unit tests and a quest-script fixture.
