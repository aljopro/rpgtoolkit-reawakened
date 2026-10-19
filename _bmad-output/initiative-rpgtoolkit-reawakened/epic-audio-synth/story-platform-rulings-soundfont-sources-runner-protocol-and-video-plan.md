---
title: 'Platform rulings: SoundFont policy, sources, runner protocol and video'
type: 'feature'
ticket: 3
created: '2026-10-18'
status: built
baseline_revision: '22cd1db4'
risk: 'high'
context:
  - 'CLAUDE.md'
  - 'docs/guardrails.md'
  - 'docs/spec/engine/audio-media.md'
  - 'docs/spec/engine/display-input-audio.md'
  - 'docs/provenance/facts-round-8.md'
  - 'docs/provenance/facts-round-9.md'
  - '_bmad-output/initiative-rpgtoolkit-reawakened/architecture-rpgtoolkit-reawakened/architecture-rpgtoolkit-reawakened.md, AD-5, AD-9, AD-14, AD-16, AD-17, AD-30, AD-31'
  - '_bmad-output/initiative-rpgtoolkit-reawakened/epic-audio-synth/discovery/audio-readiness.md'
  - '_bmad-output/initiative-rpgtoolkit-reawakened/epic-audio-synth/discovery/audio-exploration.md'
  - '_bmad-output/initiative-rpgtoolkit-reawakened/epic-web-runner-packaging/epic-web-runner-packaging.md'
---

## Intent
Rule the audio platform: formats, banks, the runner-facing protocol and the video policy.

## Boundaries
Docs only. Does not rule core track state (entry 6.1) or the command surface (entry 6.2) except for the explicit amendments listed in `audio-media.md#platform-amendments`. Does not build the Web Audio output (epic 9), decoders, synth backends, SoundFont bundling, built-ins, runner protocol code, fixtures or goldens (entries 6.4 to 6.17).

## Key Decisions
Synths are pluggable behind `MidiSynth`; the SoundFont is configuration with player, script, author, runner and bundled layers; a language-neutral runner protocol with data-driven vectors (owner direction); MP3/OGG transcode on import (conservative default, section 9). Library licences and browser support quoted in the exploration are unverified until checked (G6).

## Acceptance
Every inherited decision is ruled or deferred by name; the protocol page lists messages in (`load`, `play`, `pause`, `resume`, `stop`, `seek`, `fade`, `setVolume`, `setBank`, plus the added `setLoop`) and events out (`ready`, `ended`, `error`) with fixed keys; the Path B bank has a provenance checklist (PB-1 to PB-10) entry 6.13 can verify.

## Verification
Provenance, licence and link/anchor checks; independent validation; a person approves the plan checkpoint.

## Normative rulings recorded

All rulings are **Proposed ruling (pending owner review)** at this HITL checkpoint. The normative text, evidence and rejected alternative for each is in `docs/spec/engine/audio-media.md`, section "Platform rulings", at the anchor shown.

| ID | Ruling | Anchor |
|---|---|---|
| amendments | The eight explicit amendments to 6.1/6.2 (`soundFont` state, `soundfont.set` cue, diagnostics, Q14, lateness, `video.ended { reqId }`, verify wording) | `platform-amendments` |
| F1 | Format matrix, detect-first dispatch, unsupported files keep state and cue stream unchanged | `audio-format-policy` |
| F2 | MP3, Ogg, Opus, FLAC transcoded to WAV at import, name-preserving, gapless | `audio-import-policy` |
| F3 | Tracker modules (the BusDriver XM): diagnostic only; a deliberate departure from 3.1.0 | `audio-tracker-policy` |
| F4 | PCM source and exact integer length formulas for WAV and PPQN MIDI | `audio-wav-midi-length` |
| F5 | XG/GS missing bank falls back to GM bank 0 (percussion to bank 128) | `midi-bank-fallback` |
| R-59 | Routing by bytes; frame sounds are `sfx` voices; menu sounds on `ui`; amends Q14 | `r-59-routing` |
| S1, S2 | `AssetDecoder<AudioInfo>` (AD-31 amendment) and `AudioSource` seams | `audio-info-seam`, `audio-source-seam` |
| B1 to B4 | SoundFont layers, `soundFont`/`soundFontReset`, `soundfont.set`, user `.sf2` contract | `soundfont-layers`, `soundfont-commands`, `soundfont-cue`, `soundfont-user-bank` |
| B5 | Path B: Florestan Basic is the only candidate, GMGSx removed, ten-item bar, failure branch, FluidR3_GM not bundled | `path-b-bank` |
| P1 to P4 | Protocol v1 (ten messages, three events), voice state machine, cue player mapping, runner latitude and test rules | `runner-audio-protocol`, `voice-state-machine`, `cue-player`, `runner-may-decide` |
| BM | Synthetic battle music effect for Done-when item 1 | `battle-music-synthetic` |
| H1 to H7 | Autoplay, focus, late sounds, prefetch, SoundFont cache, browser test and CSP, authoring handoffs | `epic9-audio-handoff`, `audio-authoring-handoff` |
| D-10 | Done-when items 2 and 3 move to epic 9 | `audio-done-when` |
| V1 to V5 | Video import profile, `playVideo`/`video.ended`, the `video` wait and time hold, music restart, headless reply | `video-policy` to `video-headless` |
| deferrals | Named owner deferrals | `audio-deferrals` |

## Evidence and rejected alternatives

Each ruling carries an OWNER marker, evidence and a rejected alternative in `audio-media.md`. Sources: `audio-readiness.md` F-05, F-07, F-09, F-11, F-12; `audio-exploration.md` sections 3 to 12; facts rounds 8 and 9 (Q4, Q14 to Q18, M1); AD-5, AD-9, AD-14, AD-16, AD-17, AD-30, AD-31; G2, G3, G6, G7; the 6.1/6.2 rulings; first-party and third-party pages read on 2026-10-18 for the Path B candidates (the Nando Florestan SoundFont page via a Wayback snapshot, the Polyphone hub, the Internet Archive listing, the Arch Linux package record for GMGSx, the SynthFont download page). Not verified and marked so in the page: browser support for VP9 WebM and Opus, `decodeAudioData` ADPCM support, SF3 and `wasm-unsafe-eval`, libopenmpt's licence, the legacy MIDI pack's terms, whether any epic schedules the audio and video importers.

## Changed artifacts

* `docs/spec/engine/audio-media.md`: the "Platform rulings" section, the P1/P4 amendments (`soundFont` in the state, `soundfont.set` in the cue union), ledger rows Q14 to Q18, the seams and references.
* `docs/spec/engine/display-input-audio.md`: Formats, E-103, R-59, E-62 and E-104 point to the rulings.
* `architecture-rpgtoolkit-reawakened.md`: AD-5, AD-9, AD-14, AD-16, AD-17 and AD-31 amendments, the SoundFont pin row, the AVI open question and the SoundFont deferred line.
* `epic-audio-synth.md` and `epic-web-runner-packaging.md`: the proposed-rulings note and the epic 9 handoff.
* this plan: frontmatter `ticket: 3`, `type: feature`, and the checkpoint record.

## Plan impact on later entries (for the owner's review)

* 6.4: expect `soundfont.set` as the first cue at engine start and first on load; `soundfont-setting` and `video-restarts-music` scenes cite `soundfont-commands`, `battle-music-synthetic` and `video-music`.
* 6.5: use the exact length formulas of `audio-wav-midi-length`; SMPTE-division MIDI is unsupported.
* 6.10: its verify says the headless runner replies "after the declared duration"; V5 replaces that with "on its next `advance`".
* 6.13: verify the PB-1 to PB-10 bar; if Florestan fails, ship no third-party bank, land the gate, author the CC0 test fixture bank, and leave TK-16 as the first bundled bank. Its verify ("passes with the real bank") then holds for the test fixture only.
* 6.15: add `setLoop` to the schema and vectors, and SHOULD add cue-to-message vectors.
* 6.16: the offline render test uses whichever bank 6.13 or 6.14 ships, else the CC0 test bank.

## Verification

Run the repository's gates after the docs are complete: `pnpm install`, `pnpm fixtures:fetch`, `pnpm typecheck`, `pnpm lint`, `pnpm test:strict`, `pnpm golden`, `pnpm golden:bun`, `pnpm graph`, `pnpm licence`, `pnpm provenance`, `pnpm catalogue:check`, `pnpm command-docs:check` and `pnpm oracle:check`. No code, catalogue or golden files are expected to change.

## HITL checkpoint

The plan is built and the docs are ready for owner review. The implementation entries 6.4 to 6.17 stay blocked until the owner approves or changes the rulings above, and in particular: the Path B outcome rule, the `setLoop` message, the Q14 amendment, the `soundfont.set` cue at engine start, the focus default, and the G6/ADR wording deferral.
