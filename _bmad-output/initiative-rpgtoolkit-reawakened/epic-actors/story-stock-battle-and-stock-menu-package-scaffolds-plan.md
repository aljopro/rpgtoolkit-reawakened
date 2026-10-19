---
title: "stock-battle and stock-menu package scaffolds"
type: 'feature'
ticket: 11
created: '2026-10-19'
status: draft
baseline_revision: '0975a26b54f8d7bf569f463a02b783b16ec0ea98'
risk: "medium"
context:
  - "spec - docs/spec/engine/plugins-and-battle.md (Plugin roles: without a battle plugin battles end immediately)"
  - "code - packages/core/src/script/manifest.ts"
  - "assumption - A-1 on where the package sources live and how they ship"
---

## Intent

The package shells exist so Epic 7 and 8 land content into a stable structure. Source location and distribution follow Assumption A-1.

## Boundaries

Structure, manifest, registration and the spec's empty behaviour. Battle and menu content are Epics 7 and 8.

## Key Decisions

1. Stock packages are ordinary packages: no engine privilege (E-99 one plugin contract).

## Acceptance

1. Both load, register, and respond per spec.

## Verification

Headless test; lint G2.
