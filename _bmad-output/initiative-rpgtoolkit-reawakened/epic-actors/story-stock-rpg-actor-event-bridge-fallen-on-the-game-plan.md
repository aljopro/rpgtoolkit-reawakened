---
title: "Stock RPG actor event bridge: fallen on the game"
type: 'feature'
ticket: 15
created: '2026-10-19'
status: done
baseline_revision: 'f34059b3'
risk: "high"
context:
  - "spec - docs/spec/engine/actors.md (fallen transition and stock package bridge)"
  - "spec - docs/spec/engine/rpgcode-modules-and-objects.md (EMIT-8, EMIT-13, EMIT-21)"
  - "code - stock/stock_rpg/manifest.json, packages/core/src/events/dispatch.ts"
---

## Intent

`stock_rpg` is a package the host installs like any other. Its definition declares one native
listener and one command; the listener watches every actor emitter for `fallen`, and the command
re-emits the transition on the game as `stock-rpg.fallen` with the actor id, the ruled `cause` and
the `source`. Core delivery on `actor:<id>` is unchanged, so an actor's own listeners still see
exactly one event per transition and nothing from another actor.

## Boundaries

One bridge event and the listener scope it needs. The `talked` bridge is Epic 8.12 (#564); the battle-thread
`beforeDamage` mutation is Epic 7.14.

## Key Decisions

1. A native listener's `emitter` may be the one pattern `actor:*` (EMIT-21). The dispatcher matches
   the pattern against the event's key, so the listener keeps its place in table order, is saved as
   plain data with the listener table, and is never filed under a key that does not exist. A
   malformed pattern is a located `plugin.listener-bad-emitter` warning and registers nothing. A
   script's `off` names a concrete emitter, so it can never remove the pattern.
   *Rejected alternatives:* a host-shipped TypeScript fan-out hook inside core (puts package
   behaviour in core, against 20.1), and an actor subscription API in the script host (a larger
   contract for the same bridge, with its own save and lifetime rules).
2. The package identity lives in `stock/stock_rpg/manifest.json`; the listener and command are
   host code, as 19.17 requires, and the start-up program still runs through the catalogue path.

## Acceptance

A package start-up fixture loads through 19.17, registers one actor listener and receives exactly
one game `stock-rpg.fallen` event per transition; repeated HP-zero writes do not duplicate it,
actor listeners remain isolated, and save/reset/restore preserve deterministic queued delivery.

## Verification

`packages/core/test/stock-rpg-bridge.test.ts`: two actors fall through a real owner operation, the
game sees `1:damage|` and `2:damage|` once each, a listener on `actor:1` hears one event while the
pattern hears two, a snapshot at every tick restores to the same hash and a replay matches, and a
malformed pattern warns without registering.
