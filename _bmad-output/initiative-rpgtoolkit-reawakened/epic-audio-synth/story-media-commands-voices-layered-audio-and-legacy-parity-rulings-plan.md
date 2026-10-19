---
title: 'Media commands, voices, layered audio and legacy parity rulings'
type: 'feature'
ticket: 2
created: '2026-10-18'
status: built
baseline_revision: 'f212728587894ad87ae94de67ae14e31cb444a36'
risk: 'high'
context:
  - 'docs/guardrails.md'
  - 'docs/spec/engine/rpgcode-functions.md'
  - 'docs/spec/engine/rpgcode-language.md'
  - 'docs/provenance/facts-round-8.md'
  - 'docs/provenance/facts-round-9.md'
  - '_bmad-output/initiative-rpgtoolkit-reawakened/epic-audio-synth/discovery/audio-exploration.md'
---

## Intent
Rule the author-facing audio surface and the legacy behaviour it must keep, so builders do not guess a signature or a corner case.

## Boundaries
Docs only. Obsolete audio commands stay callable and are marked obsolete in documentation only (owner); no runtime warning. Does not rule core state or cues (entry 6.1).

## Key Decisions
The standard family from section 13 of the exploration; names, argument order and `tkMD_` values are ratified here. Version rule: follow 3.1.0 unless the later behaviour is a clear deliberate fix. `mp3pause(file)` is `mediaPlay(file, 'sfx', tkMD_ONCE | tkMD_WAIT)`. Total voice cap 32 (owner). Obsolete marking is documentation only and uses the `deprecated` tag, so old games still run quietly. Proposed defaults (owner choice): `ambience` 4 voices, `voice` 2, `ui` 4, at most 16 named tracks; author-created tracks such as an overlapping-effects track use `mediaTrack`, not a sixth built-in.

## Acceptance
`audio-media.md` names each legacy name's standard equivalent and the `deprecated` and `replacedBy` marker; the Audio-table and catalogue edits are assigned to entries 6.8 and 6.9; every new name has a signature, units, defaults, a worked example and help text in the simple-first style; the stealing order, same-file rule, fade maths and sync rule are deterministic with a worked example each.

## Verification
Catalogue, command-docs, provenance and link/anchor checks; independent validation; a person approves the plan checkpoint.
