---
title: "Pure-RPGCode media package fixtures and legacy golden verification"
type: 'feature'
ticket: 7
created: '2026-10-19'
status: draft
baseline_revision: '0975a26b54f8d7bf569f463a02b783b16ec0ea98'
risk: "medium"
context:
  - "fixtures - packages/core/test/fixtures/plugins/ (audio-stems.prg is the 18.7 predecessor)"
  - "golden - golden/scenes/"
---

## Intent

Lane D (proof). Ducking, stems and region music written as RPGCode packages on events, the case the epic exists for.

## Boundaries

Fixtures and goldens only.

## Key Decisions

1. Packages load by name from the manifest and use no TypeScript.

## Acceptance

1. Deterministic with a save at every tick.
2. Legacy audio goldens unchanged.

## Verification

Headless goldens; full gate set.
