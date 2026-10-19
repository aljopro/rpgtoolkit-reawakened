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

A behaviour is one more export of a package, registered through 19.8's `registerPlugin` layer, so there is one registration mechanism.

## Boundaries

Registration and resolution only; saving and hydration are entry 8.

## Key Decisions

1. Behaviour names are package-namespaced strings; the registry holds callables in script state (saved per 18.6), the actor holds the string.

## Acceptance

1. Override and default paths; namespacing.

## Verification

Unit tests with two test packages.
