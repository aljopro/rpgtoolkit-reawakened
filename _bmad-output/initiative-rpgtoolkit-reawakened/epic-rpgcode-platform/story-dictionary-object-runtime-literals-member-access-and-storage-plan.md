---
title: "Dictionary object runtime: literals, member access and storage"
type: 'feature'
ticket: 3
created: '2026-10-19'
status: built
baseline_revision: '0975a26b54f8d7bf569f463a02b783b16ec0ea98'
risk: "high"
context:
  - "spec - docs/spec/engine/rpgcode-modules-and-objects.md (OOP-10)"
  - "code - packages/core/src/script/values.ts, vm.ts, cells.ts, lower.ts"
  - "code - packages/core/src/save/sections/vm.ts"
---

## Intent

Build the storage the ruling OOP-10 names, on the existing handle table and `vm.cells` so there is one object runtime. Lane A (objects), shared files vm.ts/lower.ts/values.ts: entries 3, 4 and 5 run in order.

## Boundaries

Storage, access and collection only. No receiver binding (entry 4), no legacy class migration (entry 5), no emitter. Plain data only (G1).

## Key Decisions

1. Members hold any Value including callables; the object itself is a handle like a legacy object so snapshot and collection reuse 18.6.
2. Iteration order is insertion order, deterministic (G3).

## Acceptance

1. Create, read, write, delete and nested access work through all three access forms.
2. Restore after a mid-run save yields an equal hash; a lambda stored in a member survives.
3. Unreachable objects and their cells are freed by the end-of-tick pass.

## Verification

Unit tests in packages/core/test, `pnpm test`, goldens unchanged.
