---
title: 'SoundFont bundling gate and the Path B bank'
type: 'feature'
ticket: 13
created: '2026-10-18'
status: 'draft'
baseline_revision: 'f212728587894ad87ae94de67ae14e31cb444a36'
risk: 'medium'
context:
  - 'docs/guardrails.md'
  - 'tools/licences/check.mjs'
  - 'tools/licences/config.json'
  - 'THIRD_PARTY_NOTICES'
---

## Intent
Ship a General MIDI bank we can legally redistribute, with a gate that keeps it honest.

## Boundaries
The gate extension, the bank file and its notices. No synth code (entry 6.12) and no authored bank (entry 6.14).

## Key Decisions
Chaos Bank is excluded (its readme reserves all rights). A bank is added only after its provenance is verified from the source's own licence text; a person approves the bank choice (licence risk).

## Acceptance
The gate treats audio assets like bundled fonts and rejects unlisted SoundFonts.

## Verification
Gate tests with good and bad configs; a person approves the plan checkpoint for the bank choice.
