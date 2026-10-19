---
title: "Game emitter, emitter registration seam and one bus for TypeScript plugins"
type: 'feature'
ticket: 12
created: '2026-10-19'
status: draft
baseline_revision: '0975a26b54f8d7bf569f463a02b783b16ec0ea98'
risk: "medium"
context:
  - "spine - AD-8 (effects, never direct mutation), AD-32"
  - "code - packages/core/src/script/plugin.ts (CommandView, CommandEffect)"
  - "spec - emitter section written by 19.1"
---

## Intent

The game emitter and the seam only; the per-board and per-actor emitters and the events they emit are Epic 20 (20.4, 20.9), because the board and actor state they hang off belongs to Epics 4, 5 and 20. Whether party or battle also become built-in emitters is Assumption A-3.

## Boundaries

No board or actor event sources.

## Key Decisions

1. TypeScript plugins listen through the manifest-declared package, not by passing closures into core state.

## Acceptance

1. Cross-language delivery both ways, one queue.
2. The game emitter fires the ruled non-cancelable `error` event for every runtime error (detail `{ code, message, file, line, handled }`), in addition to ERR-2 handling, with a test for a handled and an unhandled error.

## Verification

Unit tests with a native test plugin.
