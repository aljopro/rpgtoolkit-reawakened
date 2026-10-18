---
type: epic
title: "Music, effects and MIDI play through a shared synth"
parent: initiative-rpgtoolkit-reawakened
covers: ["CAP-7"]
assignee: ""
risk: medium
---

# Music, effects and MIDI play through a shared synth

## Description

The core emits audio cues; a `synth` package (spessasynth_core only) renders General MIDI with a permissively licensed SoundFont and `runner-web` outputs it through spessasynth_lib, and music, sound effects and volume follow board, battle and script changes. AVI video is handled at import time.

## Outcome

Legacy MIDI-driven games sound the same on every web-based runner; the CAP-7 success check is the signal.

## Done when

1. Music and sound-effect cues from boards, battles, animation frames and scripts appear in headless null-audio tests.
2. The synth plays a sample MIDI file through the SoundFont in a browser test, with the SoundFont lazy-loaded and listed in `THIRD_PARTY_NOTICES`.
3. A user can point the runner at their own `.sf2`.
4. Audio built-ins register with the VM and drive the cues.

## Boundaries

Audio cues in core (full verb set, `cueId`, `audio.ended`), the `synth` package, and the AVI decision. Not the Web Audio output wiring in `runner-web` (epic web-runner-packaging). Tracker modules are a non-goal.

- Touch point: SpessaSynth and FluidR3_GM - consumed under their licences; owner: this epic

## References

- spec - _bmad-output/initiative-rpgtoolkit-reawakened/spec-rpgtoolkit-reawakened/spec-rpgtoolkit-reawakened.md, section Capabilities
- spine - _bmad-output/initiative-rpgtoolkit-reawakened/architecture-rpgtoolkit-reawakened/architecture-rpgtoolkit-reawakened.md, AD-14, AD-16
- constraint - docs/guardrails.md, section G6
- reference - docs/spec/engine/display-input-audio.md#e-100 to E-104
- reference - docs/architecture-options.md, section 7.3

## Notes

- Open question: AVI video - transcode on import in an editor tool, or drop.
- Unknown: the exact FluidR3_GM SF3 artifact, URL, SHA-256 and credits text for `THIRD_PARTY_NOTICES`; MuseScore's SF3 does not ship while its 'exclusively licensed' line is unresolved. SF3 decoding needs `wasm-unsafe-eval` in the CSP.
- Decision: epic set approved by the user, 2026-10-10.
- Waits on platform-baseline because: the synth package scaffold and licence gate.
- Waits on rpgcode-vm because: audio built-in registration.
- Decision: envelope re-sliced against the architecture spine, 2026-10-10.
- Decision: Jensen, 2026-10-15: `docs/spec/` replaces `docs/format-spec.md` and `docs/engine-features.md` as the normative spec (ADR 0007, entry 1.13); the owner attests it is clean (extraction-log round 4).
- Evidence (R-59): docs/spec/engine/display-input-audio.md says the original routed every music file through its MIDI path (a bug) and that animation-frame sounds bypassed PAK extraction, so they probably did not play in PAK games; parity need not reproduce either.
- Handoff (epic board-rendering inception, 2026-10-16): `GameState.audio` and its `cueId` counter are this epic's. Epic 4 does not emit `AudioCue`s: boot posts the board music (entry 4.20) and the animation phase posts per-frame `.anm` sounds (entry 4.23) as `audio` effects through the engine's `postEffect` (entry 4.11). This epic registers the `audio` section's applier with that bus at engine creation, and the pending effects posted before it registered drain to it in order (the queue is bounded; see entry 4.1's ruling). The applier turns them into cues. The initiative file now lists epic 4 in this epic's `after`.
- Evidence (pre-inception exploration, 2026-10-18): `discovery/audio-exploration.md` records the owner conversation, corpus audio facts (182 MIDI, 66 WAV including 3 ADPCM, 1 XM, no MP3/OGG), the draft breakdown and the open decisions for entry 6.1.
- Owner direction (2026-10-18): synths are pluggable behind a small `MidiSynth` interface in `synth`. `spessasynth_core` is wrapped, not rewritten; a Null backend serves headless runs. Other backends (OPL3 FM, Web MIDI passthrough) can plug in later without core changes.
- Owner direction (2026-10-18): the bundled SoundFont should lean toward a Super NES feel without ripped commercial samples. It lives in this monorepo under `media/soundfonts/`, pinned in `tools/licences/config.json` `bundledAssets` and in `THIRD_PARTY_NOTICES`. Assumption A-1 (to confirm): a curated compact public-domain GM bank (Florestan Basic or GMGSx, after provenance check) lands first; a project-authored "TK-16" bank built in Polyphone from CC0/MIT sources is its own entry and becomes the default once shipped. Chaos Bank is excluded: its readme reserves all rights despite "public domain" labels online.
- Owner direction (2026-10-18): the SoundFont is configuration, not a constant. The layers are the runner (`RunConfig` audio part), the game author (project default, a Reawakened setting because `.gam` has no field) and the player (runner override including any user `.sf2`, never saved in game state).
- Owner direction (2026-10-18): add Reawakened RPGCode built-ins `soundFont(file)` and `soundFontReset()`, which emit a new `AudioCue` kind `soundfont.set` and are restored after load. This amends AD-16's kind list, `rpgcode-functions.md` and the command-effect catalogue docs-first in entry 6.1.
- Open question (6.1): MP3/OGG decoding route, SFX channel count, music position after load, the BusDriver XM, XG/GS missing-bank fallback, battle-music hand-off. Conservative defaults are listed in `discovery/audio-exploration.md` §9.
- Assumption A-2 (to confirm): `synth` also carries the WAV decoders (PCM 8/16, MS-ADPCM, IMA-ADPCM, resampling), the mixer buses and the duration parsing AD-14's headless `audio.ended` needs. The package keeps its name.
- Assumption A-3 (to confirm): game volume (`setVolume`) is saved game state; player bus volumes and mute are runner preferences.
- Handoff (to epic web-runner-packaging, 2026-10-18): this epic rules the audio contract for autoplay unlock (hold the music state, drop SFX), focus pause, late SFX (drop after about 250 ms), audio prefetch hints and a SoundFont cache shared across games; epic 9 wires them.
- Nice to have (owner, 2026-10-18): modern formats (Ogg Vorbis, Opus, FLAC as a source format, gapless MP3) and chip/tracker formats (MOD/XM/S3M/IT, SPC, NSF, GBS, SID, VGM) as pluggable music sources; not in scope unless promoted. See `discovery/audio-exploration.md` §10 and `../nice-to-have.md`. Whatever entry 6.4 builds should keep a music-source seam so these can plug in later.
