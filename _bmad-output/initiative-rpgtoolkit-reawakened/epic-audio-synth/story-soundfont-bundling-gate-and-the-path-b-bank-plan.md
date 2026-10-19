---
title: 'SoundFont bundling gate and the Path B bank'
type: 'feature'
ticket: 13
created: '2026-10-18'
status: done
baseline_revision: 'f212728587894ad87ae94de67ae14e31cb444a36'
risk: 'medium'
context:
  - 'docs/guardrails.md'
  - 'tools/licences/check.mjs'
  - 'tools/licences/config.json'
  - 'THIRD_PARTY_NOTICES'
---

## Intent
Ship a licence gate that makes every future bundled SoundFont auditable, while
keeping the repository free of a third-party bank until provenance is proven.

## Boundaries
The gate extension, its regression tests, the authored CC0 test bank and its
notice. No synth code (entry 6.12), no TK-16 bank (entry 6.14), and no user
`.sf2` runner contract.

## Key Decisions
Florestan Basic GM GS fails the Path B provenance bar. Its first-party page says
it was sampled from a Roland Sound Canvas but provides no first-party licence
grant for this bank; therefore PB-2 and PB-3 fail. The third-party “public
domain” labels are not evidence under PB-2, and no other bank is substituted.

The authored `packages/synth/test/fixtures/test-minimal.sf2` is CC0-1.0,
contains one short-loop instrument and no third-party samples. It is a test
fixture, not a bundled default. TK-16 (ticket 6.14) is the first candidate for
the project's bundled GM bank.

## Acceptance
The gate audits `bundledAssets.soundfonts` records for a safe
`media/soundfonts/` path, permissive licence, ADR reference, SHA-256, notice
entry, RIFF `sfbk` container and an 8 MiB (8,388,608-byte) ceiling. Any
SoundFont in `media/soundfonts/` that is absent from config fails the gate.

The gate has tests proving that a configured fixture passes, while missing
notices, a wrong hash and an unlisted on-disk bank fail.

## Path B audit (PB-1–PB-10)

| Criterion | Florestan Basic GM GS verdict | Evidence |
|---|---|---|
| PB-1 identity | Recorded by 6.3, but not adopted | 3,272,882-byte Internet Archive listing; no redistribution |
| PB-2 first-party grant | **FAIL** | First-party page has no licence sentence naming this bank |
| PB-3 sample origin | **FAIL** | First-party page says “sampled from a Roland Sound Canvas” |
| PB-4 licence class | FAIL (blocked by PB-2) | Third-party “public domain” label is not a licence grant |
| PB-5 contradiction scan | FAIL (unresolved) | Copyright footer and absent grant leave terms unresolved |
| PB-6 agreement | FAIL | First-party page and archive label do not agree on licence evidence |
| PB-7 inheritance | FAIL (unresolved) | Roland sample terms are not documented |
| PB-8 gate fields | Not applicable | No third-party bank is shipped |
| PB-9 evidence kept | PASS | This plan records the 6.3 evidence and outcome |
| PB-10 owner approval | Not approved | No bank choice is approved for shipping |

Consequently, no third-party SoundFont is added under `media/soundfonts/`.
The first bundled GM bank will be TK-16 in ticket 6.14, subject to a fresh
PB-1–PB-10 audit.

## Verification
Run the licence test matrix and `pnpm licence`; the clean repository has no
configured bundled SoundFonts, while temporary configured SoundFont cases prove
the pass and failure paths. The fixture hash is
`1644ef4f35ec33d4cf5cc73e65fb0ba1b49b6e15356baf445f47f04abcc80eb6`.
