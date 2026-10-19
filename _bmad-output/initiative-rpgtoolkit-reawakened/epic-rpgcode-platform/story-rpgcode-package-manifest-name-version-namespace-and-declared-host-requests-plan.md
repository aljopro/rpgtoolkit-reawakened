---
title: "RPGCode package manifest: name, version, namespace and declared host requests"
type: 'feature'
ticket: 6
created: '2026-10-19'
status: done
baseline_revision: '0975a26b54f8d7bf569f463a02b783b16ec0ea98'
risk: "high"
context:
  - "code - packages/core/src/script/manifest.ts, plugin.ts"
  - "spine - AD-8 (later-wins by manifest order), AD-17"
  - "adr - docs/adr/0008-rpgcode-packages-and-trust-baseline.md (written by 19.1)"
---

## Intent

One manifest and one dispatch. Lane B (packages): entries 6, 7, 8 run in order; manifest.ts and plugin.ts belong to this lane.

## Boundaries

Data shape, validation and the read API. No namespace resolution (7), no `registerPlugin` (8), no `.gam` reading (9).

## Key Decisions

1. Declared host requests are informational: nothing is refused for using an undeclared request (no capability model yet). See Assumption A-4 on whether undeclared use should log a warning.

## Acceptance

1. Package fields validate; native entries are unchanged.
2. Declared requests are queryable.
3. Diagnostics are located by manifest index.

## Verification

Unit tests; `pnpm test`; lint dependency rule G2.
