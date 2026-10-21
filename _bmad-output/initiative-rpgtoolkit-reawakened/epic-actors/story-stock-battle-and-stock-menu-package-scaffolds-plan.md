---
title: "stock_battle and stock_menu package scaffolds"
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

The package shells exist so Epic 7 and 8 land content into a stable structure. Source, descriptor and distribution follow 19.16's host catalogue seam and the underscore-only package grammar: `stock_battle` and `stock_menu`.

## Boundaries

Structure, descriptor, manifest, start-up registration and the spec's empty behaviour. Battle and menu content are Epics 7 and 8; this entry does not implement their full systems.

## Key Decisions

1. Stock packages are ordinary packages: no engine privilege (E-99 one plugin contract).
2. `stock_battle` wraps existing `fight`/`fightenemy` role commands; `stock_menu` supplies the host-defined no-op menu role. If the owner requires a different menu command, only the role mapping changes, not package loading.
3. The package loader implementation is 19.17 (#562); 19.16 is the closed docs handoff. Package ids are lower-case ASCII identifiers with underscores, and package start-ups are the only registration path.

## Acceptance

1. Both load, register, and respond per spec.

## Verification

Headless test; lint G2.
