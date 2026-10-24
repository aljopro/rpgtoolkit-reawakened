---
title: ".gam plugins mapping: stock packages in templates and legacy DLL names"
type: 'feature'
ticket: 12
created: '2026-10-19'
status: done
baseline_revision: '0975a26b54f8d7bf569f463a02b783b16ec0ea98'
risk: "medium"
context:
  - "spec - docs/spec/formats/main-file.md (rows 23, 24)"
  - "code - packages/core/src/formats/ main-file reader and writer"
  - "owner - '.gam is the csproj of the toolkit'"
---

## Intent

Mapping function and template default as core data; `pluginManifestFor` maps `MainFile.menuPlugin`, `fightPlugin` and `plugins[].pluginFile` to versioned `stock_menu`/`stock_battle` catalogue entries without mutating bytes, while the editor that writes `packagePlugins` is a later epic's consumer.

## Boundaries

Core data and mapping only; the editor's explicit save action is Epic 11 and 12, and package descriptor resolution is 19.17 (#562), with 19.16 as the closed docs handoff.

## Key Decisions

1. Mapping is in memory; explicit writing is an editor save action.
2. Legacy rows remain byte-preserved on open; templates write the TKR package-list extension, not legacy DLL rows.
3. An equivalent legacy and explicit package entry deduplicates; an unmapped custom DLL raises a located diagnostic through `boot.ts` while remaining data.

## Acceptance

1. Byte-identical open; explicit write on save; diagnostic for unknown dll.

## Verification

Format tests and dump gate.
