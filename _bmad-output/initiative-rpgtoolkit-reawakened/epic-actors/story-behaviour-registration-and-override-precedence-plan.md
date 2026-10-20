---
title: "Behaviour registration and override precedence"
type: 'feature'
ticket: 7
created: '2026-10-19'
status: draft
baseline_revision: '0975a26b54f8d7bf569f463a02b783b16ec0ea98'
risk: "high"
context:
  - "spec - docs/spec/engine/actors.md"
  - "code - packages/core/src/script/ (registerPlugin from 19.8)"
  - "code - packages/core/src/actors/"
---

## Intent

A behaviour is a separate package-start-up registration, not a `registerPlugin` key: `registerBehaviour(name, hooks)` stores session data beside the 19.8 layers and is rebuilt by the 19.16 loader at every boot/reset/restore.

## Boundaries

Registration and resolution only; saving and generic object hydration are entry 8.

## Key Decisions

1. Behaviour names use the package grammar `namespace.name` (for example `stock_rpg.hero`); an actor stores only the name.
2. The hook list is closed and defined by core: unknown hook names, malformed names, wrong package namespaces and duplicates diagnose and register nothing; packages may still emit custom events.
3. Resolution is behaviour hook first, core default second; no behaviour or an unknown name uses the default and emits one located diagnostic for the unknown name.

## Acceptance

1. Override and default paths; namespacing.

## Verification

Unit tests with two test packages.
