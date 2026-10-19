---
title: "Game-file audio settings: tracks, voice counts, voice cap and default SoundFont"
type: 'feature'
ticket: 2
created: '2026-10-19'
status: draft
baseline_revision: '0975a26b54f8d7bf569f463a02b783b16ec0ea98'
risk: "medium"
context:
  - "spec - docs/spec/formats/main-file.md"
  - "spec - docs/spec/engine/audio-media.md (SoundFont policy, deferrals)"
  - "code - packages/core/src/formats/, packages/core/src/audio/"
---

## Intent

Lane A (formats). '.gam is the csproj of the toolkit.' Adds the additive audio settings block next to the 19.9 plugins list and feeds it to the audio core at startup.

## Boundaries

Data and startup wiring only. The ruled field names and the extension point are 21.1's and 19.9's. Package-declared tracks are merged by the same check.

## Key Decisions

1. Legacy rows stay exactly as read; the block is additive.
2. The voice cap is checked once, at load, with one located diagnostic on overflow.
3. Settings are never part of a save.

## Acceptance

1. Round-trip tests; no block gives the Epic 6 defaults.
2. Overflow gives a diagnostic and defaults for the excess.

## Verification

Format tests, dump gate.
