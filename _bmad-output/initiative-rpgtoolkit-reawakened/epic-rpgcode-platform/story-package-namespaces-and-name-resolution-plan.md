---
title: "Package namespaces and name resolution"
type: 'feature'
ticket: 7
created: '2026-10-19'
status: done
baseline_revision: '0975a26b54f8d7bf569f463a02b783b16ec0ea98'
risk: "high"
context:
  - "spine - AD-8"
  - "code - packages/core/src/script/registry.ts, vm.ts (resolveCall)"
  - "spec - docs/spec/engine/rpgcode-language.md (FUN-8)"
---

## Intent

Resolution only; the table 18.5 built stays the single mechanism.

## Boundaries

No registration command (entry 8).

## Key Decisions

1. A namespace is a read-only view over the effective manifest's layer stacks, not a stored dictionary object: it adds nothing to a save, and `namespace.name(...)` reaches that package's own layer with `next` the layer below (PKG-4, ruled in its own docs commit). Exports are the commands a package's definition lists; script functions and objects join the same lookup when the PKG-7 loader supplies them.

## Acceptance

1. Qualified and unqualified calls resolve as ruled.
2. AD-8's single-warning rule holds.

## Verification

Unit tests and a golden with two packages.
