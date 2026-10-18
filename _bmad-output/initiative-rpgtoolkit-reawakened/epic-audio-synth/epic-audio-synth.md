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
- Waits on legacy-formats because: the asset resolver for Media-folder names (2.10).
- Decision: envelope re-sliced against the architecture spine, 2026-10-10.
- Decision: Jensen, 2026-10-15: `docs/spec/` replaces `docs/format-spec.md` and `docs/engine-features.md` as the normative spec (ADR 0007, entry 1.13); the owner attests it is clean (extraction-log round 4).
- Evidence (R-59): docs/spec/engine/display-input-audio.md says the original routed every music file through its MIDI path (a bug) and that animation-frame sounds bypassed PAK extraction, so they probably did not play in PAK games; parity need not reproduce either.
- Handoff (epic board-rendering inception, 2026-10-16): `GameState.audio` and its `cueId` counter are this epic's. Epic 4 does not emit `AudioCue`s: boot posts the board music (entry 4.20) and the animation phase posts per-frame `.anm` sounds (entry 4.23) as `audio` effects through the engine's `postEffect` (entry 4.11). This epic registers the `audio` section's applier with that bus at engine creation, and the pending effects posted before it registered drain to it in order (the queue is bounded; see entry 4.1's ruling). The applier turns them into cues. The initiative file now lists epic 4 in this epic's `after`.
- Evidence (pre-inception exploration, 2026-10-18): `discovery/audio-exploration.md` records the owner conversation, corpus audio facts (182 MIDI, 66 WAV including 3 ADPCM, 1 XM, no MP3/OGG), the draft breakdown and the open decisions for entry 6.1.
- Owner direction (2026-10-18): synths are pluggable behind a small `MidiSynth` interface in `synth`. `spessasynth_core` is wrapped, not rewritten; a Null backend serves headless runs. Other backends (OPL3 FM, Web MIDI passthrough) can plug in later without core changes.
- Owner direction (2026-10-18): the bundled SoundFont should lean toward a Super NES feel without ripped commercial samples. It lives in this monorepo under `media/soundfonts/`, pinned in `tools/licences/config.json` `bundledAssets` and in `THIRD_PARTY_NOTICES`. Assumption A-1 (to confirm): a curated compact public-domain GM bank (Florestan Basic or GMGSx, after provenance check) lands first; a project-authored "TK-16" bank built in Polyphone from CC0/MIT sources is its own entry and becomes the default once shipped. Chaos Bank is excluded: its readme reserves all rights despite "public domain" labels online.
- Owner direction (2026-10-18): the SoundFont is configuration, not a constant. The layers are the runner (`RunConfig` audio part), the game author (project default, a Reawakened setting because `.gam` has no field) and the player (runner override including any user `.sf2`, never saved in game state).
- Owner direction (2026-10-18): add Reawakened RPGCode built-ins `soundFont(file)` and `soundFontReset()`, which emit a new `AudioCue` kind `soundfont.set` and are restored after load. This amends AD-16's kind list, `rpgcode-functions.md` and the command-effect catalogue docs-first in entry 6.3; entry 6.6 emits the cue and entry 6.8 registers the commands.
- Open question (entries 6.1 to 6.3): MP3/OGG decoding route, voice counts, music position after load, the BusDriver XM, XG/GS missing-bank fallback, battle-music hand-off. Conservative defaults are listed in `discovery/audio-exploration.md` §9.
- Assumption A-2 (to confirm): `synth` also carries the WAV decoders (PCM 8/16, MS-ADPCM, IMA-ADPCM, resampling) for playback and the mixer buses; the pure length parsing (`AudioInfo`) lives in core (A-4, entry 6.5). The package keeps its name.
- Assumption A-3 (SUPERSEDED, owner decision 2026-10-18): volumes are settings, not saved game state. Master and per-track volumes are held by the host, untouched by `reset()` and `load()`, and never enter a save or the state hash.
- Handoff (to epic web-runner-packaging, 2026-10-18): this epic rules the audio contract for autoplay unlock (hold the music state, drop SFX), focus pause, late SFX (drop after about 250 ms), audio prefetch hints and a SoundFont cache shared across games; epic 9 wires them.
- Nice to have (owner, 2026-10-18): modern formats (Ogg Vorbis, Opus, FLAC as a source format, gapless MP3) and chip/tracker formats (MOD/XM/S3M/IT, SPC, NSF, GBS, SID, VGM) as pluggable music sources; not in scope unless promoted. See `discovery/audio-exploration.md` §10 and `../nice-to-have.md`. Whatever entry 6.11 builds should keep a music-source seam so these can plug in later.
- Owner direction (2026-10-18): the audio platform is extensible, so new music sources are easy to add. Assumption A-4 (to confirm): reuse AD-31 and do not add a second plugin system. Each format has a core `AssetDecoder<AudioInfo>` (length, loop, bank need; pure; entry 6.5) and a runner-side `AudioSource` registered with `synth` (entry 6.11). MIDI and PCM are the first two sources on that same seam; a shared conformance kit gates every source (entry 6.15); a missing source is a diagnostic plus silence, never a state change. Entry 6.3 amends AD-16 and AD-31. Detail: `discovery/audio-exploration.md` §11.
- Owner direction (2026-10-18): core audio behaviour is defined generically, and the runner side has a well-defined shape usable in most runner setups, in any language, with the same shape. Assumption A-5 (to confirm):
  - entry 6.3 writes the runner audio protocol as plain-data messages (`load`/`play`/`pause`/`resume`/`stop`/`seek`/`fade`/`setVolume`/`setBank` in; `ready`/`ended`/`error` out) and a voice state machine, and entry 6.1 writes the cue semantics;
  - entry 6.15 publishes a language-neutral schema and data-driven conformance vectors any runner can replay; the TypeScript `AudioSource` is one binding and stays the reference (AD-30).

  Detail: `discovery/audio-exploration.md` §12.
- Owner direction (2026-10-18, standard media commands): audio plays on named tracks; five built-in tracks exist (`music`, `sfx`, `ambience`, `voice`, `ui`) and authors may add more; voices are a property of a track (a sound-effect slot is a one-voice track), with a total cap of 32; cues are generic per-track kinds (option A); a standard `media*` command family covers load, play, stop, pause, resume, seek, loop, volume, fade and wait with matching queries; legacy audio commands stay and are marked obsolete in documentation only. Detail: `discovery/audio-exploration.md` §13.
- Decision: Jensen, 2026-10-18: `mp3pause(file)` follows 3.1.0 and is `mediaPlay(file, 'sfx', tkMD_ONCE | tkMD_WAIT)`; the version rule is to follow 3.1.0 unless the later behaviour is a clear deliberate fix.
- Decision: Jensen, 2026-10-18: a paused track is still active, so a wait suspends on pause and ends on finish or stop.
- Source conflict (rule at 6.1): AD-14 and AD-9 let the runner's `audio.ended` reply wake a wait (the headless runner emits it after the parsed duration), while this epic makes the core the only clock. Proposed: end tick is start plus asset length, `audio.ended` is advisory, cues carry the tick they were due. Amends AD-9 and AD-14.
- Source conflict (rule at 6.1): round 8 Q11 says legacy saves stored no audio, while AD-16 says the core re-emits what plays after load. Proposed: keep AD-16 and record the departure in the parity ledger.
- Source conflict (to confirm at 6.3, D-10): Done-when item 2 asks for a browser test of the synth and item 3 for a user-supplied `.sf2`, but the repository has no browser harness and no `runner-web`. Proposed: entry 6.16 proves the render path offline in Node, and epic 9 owns the browser test, the user `.sf2` runner contract and the `wasm-unsafe-eval` CSP note.
- Source conflict (to confirm at 6.3): Done-when item 1 asks for battle cues, but no battle runtime exists (epic 7 has no tickets and is not upstream of this epic). Proposed: entries 6.6 and 6.16 prove the hand-off rules (Q8, Q9) with a synthetic effect record whose source is `battle`; real battle cues are epic 7's.
- Source conflict (rule at 6.1): the board-music path in the engine (`postBoardMusic`, `state.engine.musicAsset`) decides same-file and silence itself, and the `music` virtual variable reads `state.audio.music`. Proposed (D-17, D-18): the audio applier decides, the effect names stay, and the variable reads the `music` track's file (Q5 to Q8, Q10, Q19).
- Assumption (to confirm at 6.1, D-19): "volumes are settings" is read as script volume (core state, outside the game save, untouched by reset and load; Q12, Q13) plus the player's mix (a runner-side multiplier that never enters core).
- Note: the FluidR3_GM touch point and artifact unknown above predate the owner's bank direction (assumption A-1: a compact public-domain bank first, then the authored TK-16 bank); entries 6.3 and 6.13 settle which bank ships and whether FluidR3_GM is used at all.
- Sequenced: 2026-10-18: entries 6.1 to 6.3 are owner-approval docs checkpoints; entry 6.4 produces the audio timeline oracle; the tracer bullet is entry 6.6 (a board-music effect becomes a track, a cue and an oracle-checked state); 6.13 and 6.14 (SoundFont bank and its gate) run beside the core lane; 6.17 is the closing sweep. Nothing here is approved until the owner approves entries 6.1 to 6.3.
- Handoff (epic menu-party-save): per-track volumes are settings outside the save; playback state is saved; the options menu uses the five built-in tracks.
- Handoff (epic battle): battle music is posted as audio effects with source `battle`; the pre-fight track restarts after a fight (Q9); a fight with no music is silent (Q8). The battle envelope does not mention this yet.
- Handoff (editor epics): audio preview through `synth`, the project default-SoundFont setting, the editor warning for obsolete audio commands (`../nice-to-have.md`), and the MP3/OGG and AVI transcode-on-import tools, which no entry builds.
