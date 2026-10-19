---
title: "Main-file plugins list: read, write and feed the manifest"
type: 'feature'
ticket: 9
created: '2026-10-19'
status: draft
baseline_revision: '0975a26b54f8d7bf569f463a02b783b16ec0ea98'
risk: "medium"
context:
  - "spec - docs/spec/formats/main-file.md (rows 23, 24, 37, 38b)"
  - "code - packages/core/src/formats/ (main file reader and writer)"
  - "spec - docs/spec/formats/packaging-and-paths.md"
---

## Intent

Lane C (formats), independent of the VM lanes. '.gam is the csproj of the toolkit.' Writing a package list uses the native-format extension point ADR 0005 allows.

## Boundaries

Data only. The dll-name to stock-package mapping and new-project template defaults belong to Epic 20 (20.12).

## Key Decisions

1. Legacy rows stay exactly as read; the package list is an additive field.

## Acceptance

1. Round-trip tests; manifest patch from the list.

## Verification

Format tests, dump gate.
