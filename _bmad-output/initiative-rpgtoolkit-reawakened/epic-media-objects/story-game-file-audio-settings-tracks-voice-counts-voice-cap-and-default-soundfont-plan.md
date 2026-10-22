---
title: "Game-file audio settings: tracks, voice counts, voice cap and default SoundFont"
type: 'feature'
ticket: 2
created: '2026-10-22'
status: 'built'
baseline_revision: 'fb53f26250e9aa821f095788a0f522e8a8b819ad'
route: 'full'
route_source: 'auto'
risk: 'medium'
review: 'quick'
review_source: 'pinned'
lenses_ran: [quick]
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

**Always:** Legacy rows and the package-list block stay byte-identical and are never derived from audio settings; missing block means Epic 6 defaults and cap 32; the five built-ins stay first in fixed order and are unique; envelope names, counts, cap and font bounds are validated with located errors before the model exists; an over-cap game-file aggregate uses Epic 6 default tracks and cap 32, keeps the independent `defaultSoundFont`, and reports one diagnostic at the first offending track; package-declared track additions are merged after game-file tracks in selected package order and declaration order, duplicate names keep the larger voice count, and a package contribution exceeding the effective cap is rejected without rolling back the game-file configuration or earlier accepted package tracks; package `voiceCount` defaults to 1; settings never enter a game save and a load never changes them; core stays pure (G2, G3).

**Never:** Do not add `assetRoot` or a package descriptor/filesystem lookup; package declarations name tracks only, with media files still selected by RPGCode. Do not retire the procedural media surface, add event/object APIs, change cue/state timing, or invent a runner SoundFont layer. Do not consult legacy source (G7).

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Legacy file | No TKR blocks | `audioSettings` absent; byte-identical round-trip; Epic 6 tracks, cap 32 | No error |
| Authored block | 5 built-ins with overrides, extra tracks, cap, font | Same order/counts after read/write; boot configures `state.audio.tracks`; `soundfont.set` carries the font | No error |
| Both blocks | Package list then audio block, then residue | Both recognised in that order; residue preserved | No error |
| `voiceCap` overflow | Sum of counts > cap, structurally valid | File loads; Epic 6 default tracks/cap 32; block `defaultSoundFont` still applies; one `media.voice-cap` diagnostic at the first track whose cumulative count crosses the cap | Non-fatal diagnostic |
| Invalid envelope | Bad tag shape, duplicate/out-of-order built-in, bad name, count out of range, truncated | Located format error; no partial model | Refuse read/write |
| Missing font asset | Font key not in the index | Treated as `null`; one `media.soundfont-missing`; cue carries `null` | Diagnostic, boot continues |
| Save and load | Configured tracks/font, then save + load | Projection omits voice counts/config; load keeps current names/counts/cap/font and applies only configured tracks | No setting change |
| Package tracks | Game file with packages A then B; each declares ordered tracks | New names append after game-file tracks; packages follow selection order and each declaration retains order; omitted voiceCount is 1 | No error |
| Duplicate package track | Game file and package declare same name at different counts | Track remains in its original position and uses the larger voiceCount | No error |
| Package contribution exceeds cap or 16-track limit | A new package track or a larger duplicate would exceed a bound | Reject only that package contribution; retain game-file tracks and earlier accepted package declarations | Located package-track diagnostic |
| Invalid package track declaration | Bad name or non-positive/non-integer voiceCount | Reject only that declaration; later valid declarations remain eligible | Located package-track diagnostic |

</frozen-after-approval>

## Code Map

- `docs/spec/formats/main-file.md` — package-list section is the precedent; add the byte layout and validation for the audio block.
- `packages/core/src/formats/main-file/model.ts` — `MainFileAudioTrack`, `MainFileAudioSettings`, required nullable `audioSettings: MainFileAudioSettings | null` and `defaultSoundFont: string | null` fields, tag/bound constants.
- `packages/core/src/script/plugin.ts`, `script/manifest.ts`, `script/package-startup.ts`, and Epic 19.9/19.16 (#459/#540) — package declarations are host-resolved `PluginDefinition` metadata; add ordered optional audio-track declarations to that definition, not the `.gam` package list, manifest, startup program, or asset resolver.
- `packages/core/src/formats/main-file/reader.ts` / `writer.ts` — parse package block then audio block then residue; write package then audio then residue.
- `packages/core/src/audio/model.ts` — `asFold`, `createTrack`, built-in defaults and `MAX_VOICES`; add the resolved default settings helper here or in `runtime.ts`.
- `packages/core/src/audio/runtime.ts` — closure `voiceCap` and `defaultSoundFont`; new `applyGameAudio`; `configureTrack` checks the configured cap; `load` preserves configuration and ignores unconfigured saved tracks.
- `packages/core/src/audio/save.ts` — projection type drops `voiceCount`; copy helper omits it.
- `packages/core/src/engine/engine.ts` — apply settings in boot stage `main`; register the audio applier after settings in boot mode; locate the overflow diagnostic at `mainKey` and track index.
- `packages/core/test/format-main-file.test.ts`, `engine-boot.test.ts`, `audio-runtime.test.ts`, `audio-restore.test.ts` — permanent consumer-visible regressions.
- Do not change: legacy row order/widths, package-list encoding, `state.audio.settings`, the script `soundfont` commands (21.6 owns retirement), or golden cue timing.

## Tasks & Acceptance

**Execution:**
- [x] `docs/spec/formats/main-file.md` — specify tag `TRKAUD\0`, `u16` track count, each track (NUL-terminated CP1252 name + `u16` voiceCount), `u16` voiceCap, `u8` font-present + optional NUL-terminated CP1252 AssetKey; block order after package list; validation and overflow rule — the doc precedes code (G7).
- [x] `packages/core/src/formats/main-file/model.ts` — add required nullable audio-settings fields and constants — decode/write need one shape.
- [x] `packages/core/src/formats/main-file/reader.ts` — recognise the audio tag after an optional package block and validate it — additivity.
- [x] `packages/core/src/formats/main-file/writer.ts` — emit the block after the package block and refuse an unrepresentable model — AD-18.
- [x] `packages/core/src/audio/runtime.ts` — add `applyGameAudio`, use the configured cap in `configureTrack`, and make `load` apply playback onto configured tracks only — runtime contract.
- [x] `packages/core/src/audio/save.ts` — omit `voiceCount` from the saved track projection — configuration is not save data.
- [x] `packages/core/src/engine/engine.ts` — apply the decoded settings before audio registration in boot mode and report overflow once — real startup path.
- [x] `docs/spec/engine/rpgcode-package-loader.md` and `docs/spec/engine/audio-media.md` — define package track declaration shape, ordering, duplicate merge, voice-count default, cap rejection and diagnostics before code (G7).
- [x] `packages/core/src/script/plugin.ts`, `packages/core/src/engine/engine.ts`, and `packages/core/src/audio/runtime.ts` — accept ordered package track declarations and merge them after game-file tracks; duplicate names use the larger voice count; reject only a package contribution that exceeds the effective cap.
- [x] Tests — cover every I/O matrix row and the #481 verification list — permanent regressions.
- [x] Re-run `pnpm dump:check`/`dump:check:examples` (or `pnpm dump` when fixtures are absent) — inspect deliberate semantic digest changes; legacy bytes and unrelated digests remain unchanged.

**Acceptance Criteria:**
- Given a legacy `.gam`, when read then written, then every byte is unchanged and `audioSettings` is absent.
- Given an authored block, when read, written and read again, then track order, counts, cap, font and residue survive.
- Given a booted game with a block, when the engine starts, then `state.audio.tracks` match the block, the applier emits one `soundfont.set` with the configured key, and a missing key is one located diagnostic.
- Given an over-cap block, when booted, then the game still runs with default tracks and exactly one located `media.voice-cap` diagnostic.
- Given a configured game, when a save is taken and loaded, then the projection has no track definition or cap/font, and `state.audio` keeps its names, counts, cap and default font.
- Given selected package definitions declare audio tracks, when audio is configured at boot, then declarations append after game-file tracks in package selection order and declaration order, omitted voice counts mean 1, duplicate names keep the larger voice count, and a package addition over the effective cap is rejected without discarding game-file or earlier accepted configuration.

## Design Notes

The block is a sibling tagged block, not a new field inside `TKRPLUG`: the package parser owns `TKRPLUG` and its trailing residue, so the reader tries package first, then audio, then keeps residue. The marker is the literal seven bytes `TRKAUD\0` (six ASCII letters plus NUL), per the owner's correction. The audio module receives the decoded settings after the format layer has validated structure; the only semantic check left is the cap total, deliberately non-fatal per #481. On overflow the whole track configuration falls back to the Epic 6 default tracks and cap 32 so the game still boots, the first track whose cumulative count crosses the cap locates the single `media.voice-cap` diagnostic, and the block's independent `defaultSoundFont` is still applied. This recovery is owner-approved (2026-10-22).

## Package Track Decision (owner-approved)

The owner approved a declarative `audioTracks` list on each resolved package's `PluginDefinition`, containing a track `name` and optional positive `voiceCount` (default 1). It declares track configuration only: it has no `assetRoot`, file path or media bytes; scripts continue to choose files through the existing RPGCode media commands. Merge selected packages in the `.gam` package-list order, preserving each declaration's order. Append new names after game-file tracks; when a package track duplicates a configured name, retain the greater voice count. An invalid or over-cap package contribution is rejected individually with a located diagnostic; the game-file configuration and previously accepted package declarations remain. The user explicitly replaced the former instruction to block this clause with these shape and precedence rulings.

Relevant contract sources: `docs/spec/engine/rpgcode-package-loader.md` (host-resolved definitions and package order), `docs/spec/engine/audio-media.md#media-4` (game audio configuration and validation), `packages/core/src/script/plugin.ts` (`PluginDefinition`), and `packages/core/src/audio/runtime.ts` (track validation and voice cap).

## Plan Change Log

- 2026-10-22 — Owner decisions: keep the literal `TRKAUD\0` and correct the spec to seven bytes; approve over-cap recovery (Epic 6 default tracks/cap 32, retain `defaultSoundFont`, one diagnostic at the first offending track); package-declared tracks remain required and must use the same validation/cap check, blocking only that clause if 19.9 has no declaration source. Replaced the earlier "out of scope" wording; no invented precedence.
- 2026-10-22 — Owner ruling: add package audio configuration as ordered track names with optional `voiceCount` defaulting to 1; no `assetRoot`; append package tracks after game-file tracks in package selection/declaration order; duplicate names keep the larger voice count; reject only an invalid/over-cap package contribution without rolling back earlier configuration.
-

## Review Triage Log

</frozen-after-approval>

## Verification

**Commands:**
- `pnpm build` / `pnpm typecheck` — expected: success.
- `node --test packages/core/test/format-main-file.test.ts packages/core/test/engine-boot.test.ts packages/core/test/audio-runtime.test.ts packages/core/test/audio-restore.test.ts packages/core/test/audio-engine.test.ts` — expected: pass.
- `pnpm lint`, `pnpm provenance`, `pnpm licence` — expected: pass.
- `pnpm dump:check:examples` — expected: unchanged digests; `pnpm dump:check` too when `fixtures/legacy` is present.

## Recovery Execution Record — 2026-10-22

Recovered the interrupted implementation in `/private/tmp/rpgtoolkit-epic21-2-audio-settings`, branch `feat/481-game-audio-settings`, at `1c337390`. Its existing nine modified files were preserved and completed. The main worktree and the clean `feat/480-media-object-rulings` worktree were not edited; no commit, push or merge was made. The approved doc-first chain is already on this branch: `fb53f262` (#480 rulings), `a8fd3416` (audio block layout), `e66da682` (owner-approved layout/overflow recovery), `1c337390` (package-track clause awaiting a source).

### Completed independently specified work

- Binary model, reader and writer now carry the audio block with located structural validation and preserve legacy rows, package-list ordering and residue. The owner's explicit-absence clarification is applied at the decoded boundary: required `audioSettings: MainFileAudioSettings | null` and required `defaultSoundFont: string | null`, with no optional/undefined spelling. Empty and text main-file producers and the downstream dump fixture use the same shape.
- Real boot applies track definitions and the authored bank before registering audio. No block uses Epic 6 defaults; overflow uses the full default configuration and cap 32 while retaining the independent bank and reporting once at the first crossing track. Missing banks diagnose once and emit null. Existing host audio-applier override ordering remains unchanged.
- Playback saves omit bank and track configuration; load retains current configured tracks/counts/cap/bank and applies only eligible saved playback. Runtime and boot regressions cover this and every I/O-matrix row; no procedural command retirement or package schema was invented.

### Completed package-track clause

The owner-approved package-track clause is implemented; this no longer depends on a missing 19.9 source. `PluginDefinition.audioTracks` declares ordered track names and optional voice counts. Boot merges only selected package definitions after game-file settings, preserving declaration order; duplicate names keep the larger count; invalid or over-cap declarations are rejected individually with located diagnostics, without rolling back prior settings. The implementation adds no `assetRoot`, media path or package-file lookup; RPGCode remains responsible for selecting files.

Consumer-visible regressions cover package order, case-folded duplicates, default count 1, malformed declarations, cap rejection and the 16-track limit. The plan’s remaining package-track acceptance criterion is satisfied.

### Deliberate fixture/digest changes and verification

- `golden/spec-examples.json` and `golden/legacy-corpus.json` record the G5 reason in their `comment`: eleven example and seventeen corpus `.gam` semantic digests change solely because decoded models now include `audioSettings:null`. Corpus counts and non-main-file digests are unchanged; legacy byte-identical round-trip tests pass. The digest/canonicalizer was not weakened to hide the new field.
- The independent audio reference simulation now follows the already-approved `audio-save-load`/MEDIA-4 rule: playback loading preserves current bank/configuration. Its P-9 ledger and two affected scene descriptions explain the change; the old saved-bank scenario was renamed to current-bank and its assertions migrated. Stale `audio-layer-rulings` references now target the retained normative rules. Generated audio fixtures were deliberately re-recorded; no audio cue/image golden baseline or legacy-alias oracle was re-recorded.
- `pnpm fixtures:fetch` obtained the pinned game corpus (not legacy GPL source).
- `pnpm typecheck`, `pnpm lint`, `pnpm dump:check`, `pnpm dump:check:examples`, `pnpm fixtures:author:check`, `pnpm provenance`, and `pnpm licence` passed. Dump checks confirmed the deliberate `.gam` model digests and unchanged legacy bytes/non-main-file digests; provenance scanned 623 files with zero violations and the licence check found zero violations.
- Final focused smoke passed **269 tests, 0 failed, 0 skipped**: `node --test packages/core/test/format-main-file.test.ts packages/core/test/format-main-file-text.test.ts packages/core/test/engine-boot.test.ts packages/core/test/audio-runtime.test.ts packages/core/test/audio-restore.test.ts packages/core/test/audio-engine.test.ts packages/core/test/audio-scenes.test.ts packages/runner-harness/test/audio.test.ts packages/runner-headless/test/dump.test.ts tools/fixtures/test/audio.test.mjs`.
- No full-suite, browser or live audio-device verification is claimed.

- Final review clarification, 2026-10-22: removed the contradictory aggregate hard-limit wording from the format spec and MEDIA-4. Per the already-approved overflow ruling, individual structural bounds still reject malformed blocks, but an aggregate above the authored cap remains representable and recovers at boot to all Epic 6 tracks/cap 32, retaining the independent bank and reporting once at the first crossing track. This is a prose consistency fix, not a behavior or golden change.

### Review and completion

The pinned quick review returned **No findings**. All execution checklist items are complete; implementation and focused verification are finished.
