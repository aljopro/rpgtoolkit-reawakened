---
title: ".gam plugins mapping: stock packages in templates and legacy DLL names"
type: 'feature'
ticket: 12
created: '2026-10-19'
status: draft
baseline_revision: '0975a26b54f8d7bf569f463a02b783b16ec0ea98'
risk: "medium"
context:
  - "spec - docs/spec/formats/main-file.md (rows 23, 24)"
  - "code - packages/core/src/formats/ main-file reader and writer"
  - "owner - '.gam is the csproj of the toolkit'"
---

## Intent

Mapping function and template default as core data; the editor that writes it is a later epic's consumer.

## Boundaries

Core data and mapping only; the editor's save action is Epic 11 and 12.

## Key Decisions

1. Mapping is in memory; explicit writing is an editor save action.

## Acceptance

1. Byte-identical open; explicit write on save; diagnostic for unknown dll.

## Verification

Format tests and dump gate.
