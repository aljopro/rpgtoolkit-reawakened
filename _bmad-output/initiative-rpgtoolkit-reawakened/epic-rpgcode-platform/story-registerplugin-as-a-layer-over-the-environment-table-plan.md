---
title: "registerPlugin as a layer over the environment table"
type: 'feature'
ticket: 8
created: '2026-10-19'
status: draft
baseline_revision: '0975a26b54f8d7bf569f463a02b783b16ec0ea98'
risk: "high"
context:
  - "spec - docs/spec/engine/rpgcode-modules-and-objects.md (MOD-4)"
  - "adr - docs/adr/0004, decision 8 and the 18.5 and 18.7 amendments"
  - "code - packages/core/src/script/builtins/, registry.ts"
---

## Intent

`registerPlugin` must be built here (ADR 0004 decision 8; owner, 2026-10-19). It is sugar: it computes the interception and the saved `original` for the author. The 18.7 fixtures remain valid.

## Boundaries

Commands only; events are entries 10 to 12.

## Key Decisions

1. Lifecycle: registration runs at package start-up, and the layers a package registers are rebuilt at every start-up and are NOT saved (MOD-4 lifecycle and point 3, owner ruling on PR #286; the save will hold only package names and versions). *Correction, entry 19.8:* this plan first said "saves carry the layers as values (18.7) so a restore does not need start-up to repeat", which is the alternative the owner rejected; the spec wins. The layers therefore live in the running game's layer table (script services), not in `GameState`; a call reaches them as part of the environment table's first entry, so `resolveCall` is unchanged; and a restore re-runs package start-up on a fresh state before loading the saved one (`runPackageStartup`), which makes the same layer ids and closure cells. The save record of package names and versions and the mismatch diagnostic wait for the package loader (PKG-7).

## Acceptance

1. Onion order, `next`, waits, save/restore, removal.
2. Catalogue and command-docs rows exist.

## Verification

Unit tests, the existing middleware golden unchanged, a new package golden.
