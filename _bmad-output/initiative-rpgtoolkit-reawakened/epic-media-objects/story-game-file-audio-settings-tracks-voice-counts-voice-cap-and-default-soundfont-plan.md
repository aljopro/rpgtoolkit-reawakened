---
title: "Game-file audio settings: tracks, voice counts, voice cap and default SoundFont"
type: 'feature'
ticket: 2
created: '2026-10-22'
status: 'ready-for-dev'
baseline_revision: 'fb53f26250e9aa821f095788a0f522e8a8b819ad'
route: 'full'
route_source: 'auto'
risk: 'medium'
review: 'quick'
review_source: 'auto'
lenses_ran: []
review_loop_iteration: 0
context:
  - 'docs/guardrails.md'
  - 'docs/spec/formats/main-file.md'
  - 'docs/spec/engine/audio-media.md'
  - 'docs/spec/engine/main-loop-and-startup.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** The game file has no authored audio configuration. Tracks and their voice counts are created by the retired-API `mediaTrack`, and the default SoundFont is an engine start-up argument, so a game cannot declare its sound setup and a save can drift from it.

**Approach:** Add a second additive, tagged TKR block to the main file, beside the package list, carrying ordered named tracks with voice counts, the voice cap and an optional default SoundFont AssetKey. Decode it into the main-file model, write it back deterministically, and apply it to `state.audio` during the real boot path before the audio applier registers. Check the cap once at load.

## Boundaries & Constraints

**Always:** Legacy rows and the package-list block stay byte-identical and are never derived from audio settings; missing block means Epic 6 defaults and cap 32; the five built-ins stay first in fixed order and are unique; envelope names, counts, cap and font bounds are validated with located errors before the model exists; settings never enter a game save and a load never changes them; core stays pure (G2, G3).

**Never:** Do not implement the package-declared-track clause of the old draft: recon found no manifest field, spec or owner path for it, so there is no contract to implement. Do not retire the procedural media surface, add event/object APIs, change the cue/state timing, or invent a runner SoundFont layer. Do not consult legacy source (G7).

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Legacy file | No TKR blocks | `audioSettings` absent; byte-identical round-trip; Epic 6 tracks, cap 32 | No error |
| Authored block | 5 built-ins with overrides, extra tracks, cap, font | Same order/counts after read/write; boot configures `state.audio.tracks`; `soundfont.set` carries the font | No error |
| Both blocks | Package list then audio block, then residue | Both recognised in that order; residue preserved | No error |
| `voiceCap` overflow | Sum of counts > cap, structurally valid | File loads; built-in default tracks/cap 32; one `media.voice-cap` diagnostic at the offending track index | Non-fatal diagnostic |
| Invalid envelope | Bad tag shape, duplicate/out-of-order built-in, bad name, count out of range, truncated | Located format error; no partial model | Refuse read/write |
| Missing font asset | Font key not in the index | Treated as `null`; one `media.soundfont-missing`; cue carries `null` | Diagnostic, boot continues |
| Save and load | Configured tracks/font, then save + load | Projection omits voice counts/config; load keeps current names/counts/cap/font and applies only configured tracks | No setting change |

</frozen-after-approval>

## Code Map

- `docs/spec/formats/main-file.md` — package-list section is the precedent; add the byte layout and validation for the audio block.
- `packages/core/src/formats/main-file/model.ts` — `MainFileAudioTrack`, `MainFileAudioSettings`, optional model fields, tag/bound constants.
- `packages/core/src/formats/main-file/reader.ts` / `writer.ts` — parse package block then audio block then residue; write package then audio then residue.
- `packages/core/src/audio/model.ts` — `asFold`, `createTrack`, built-in defaults and `MAX_VOICES`; add the resolved default settings helper here or in `runtime.ts`.
- `packages/core/src/audio/runtime.ts` — closure `voiceCap` and `defaultSoundFont`; new `applyGameAudio`; `configureTrack` checks the configured cap; `load` preserves configuration and ignores unconfigured saved tracks.
- `packages/core/src/audio/save.ts` — projection type drops `voiceCount`; copy helper omits it.
- `packages/core/src/engine/engine.ts` — apply settings in boot stage `main`; register the audio applier after settings in boot mode; locate the overflow diagnostic at `mainKey` and track index.
- `packages/core/test/format-main-file.test.ts`, `engine-boot.test.ts`, `audio-runtime.test.ts`, `audio-restore.test.ts` — permanent consumer-visible regressions.
- Do not change: legacy row order/widths, package-list encoding, `state.audio.settings`, the script `soundfont` commands (21.6 owns retirement), or golden cue timing.

## Tasks & Acceptance

**Execution:**
- [ ] `docs/spec/formats/main-file.md` — specify tag `TRKAUD\0`, `u16` track count, each track (NUL-terminated CP1252 name + `u16` voiceCount), `u16` voiceCap, `u8` font-present + optional NUL-terminated CP1252 AssetKey; block order after package list; validation and overflow rule — the doc precedes code (G7).
- [ ] `packages/core/src/formats/main-file/model.ts` — add the optional settings type and constants — decode/write need one shape.
- [ ] `packages/core/src/formats/main-file/reader.ts` — recognise the audio tag after an optional package block and validate it — additivity.
- [ ] `packages/core/src/formats/main-file/writer.ts` — emit the block after the package block and refuse an unrepresentable model — AD-18.
- [ ] `packages/core/src/audio/runtime.ts` — add `applyGameAudio`, use the configured cap in `configureTrack`, and make `load` apply playback onto configured tracks only — runtime contract.
- [ ] `packages/core/src/audio/save.ts` — omit `voiceCount` from the saved track projection — configuration is not save data.
- [ ] `packages/core/src/engine/engine.ts` — apply the decoded settings before audio registration in boot mode and report overflow once — real startup path.
- [ ] Tests — cover every I/O matrix row and the #481 verification list — permanent regressions.
- [ ] Re-run `pnpm dump:check`/`dump:check:examples` (or `pnpm dump` when fixtures are absent) — legacy digests unchanged.

**Acceptance Criteria:**
- Given a legacy `.gam`, when read then written, then every byte is unchanged and `audioSettings` is absent.
- Given an authored block, when read, written and read again, then track order, counts, cap, font and residue survive.
- Given a booted game with a block, when the engine starts, then `state.audio.tracks` match the block, the applier emits one `soundfont.set` with the configured key, and a missing key is one located diagnostic.
- Given an over-cap block, when booted, then the game still runs with default tracks and exactly one located `media.voice-cap` diagnostic.
- Given a configured game, when a save is taken and loaded, then the projection has no track definition or cap/font, and `state.audio` keeps its names, counts, cap and default font.

## Design Notes

The block is a sibling tagged block, not a new field inside `TKRPLUG`: the package parser owns `TKRPLUG` and its trailing residue, so the reader tries package first, then audio, then keeps residue. The audio module receives the decoded settings after the format layer has validated structure; the only semantic check left is the cap total, deliberately non-fatal per #481. On overflow the whole track configuration falls back to Epic 6 defaults (and cap 32) so the game still boots; the block's `defaultSoundFont` still applies. This reading of "defaults for the excess" is recorded as an assumption because MEDIA-4 does not spell out the recovery; it is surfaced in the final report for owner review.

## Plan Change Log

- 2026-10-22 — Replaced the stale `draft` plan (baseline `0975a26b…`) with the pinned plan at `fb53f262…`. Resolved the old draft's "package-declared tracks" line as a conflict: no manifest field, spec anchor or owner path exists, so it is out of scope and reported, not invented.

## Review Triage Log

</frozen-after-approval>

## Verification

**Commands:**
- `pnpm build` / `pnpm typecheck` — expected: success.
- `node --test packages/core/test/format-main-file.test.ts packages/core/test/engine-boot.test.ts packages/core/test/audio-runtime.test.ts packages/core/test/audio-restore.test.ts packages/core/test/audio-engine.test.ts` — expected: pass.
- `pnpm lint`, `pnpm provenance`, `pnpm licence` — expected: pass.
- `pnpm dump:check:examples` — expected: unchanged digests; `pnpm dump:check` too when `fixtures/legacy` is present.
