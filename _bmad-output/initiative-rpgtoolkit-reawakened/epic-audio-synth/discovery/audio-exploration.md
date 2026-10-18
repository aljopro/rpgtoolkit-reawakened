---
type: discovery
title: "Pre-inception exploration: audio ecosystem, SoundFonts and asset caching (epic 6)"
date: 2026-10-18
baseline_revision: d5991847
status: exploration — nothing here is an owner ruling unless marked "Owner direction"
---

# Pre-inception exploration: audio ecosystem, SoundFonts and asset caching

This records an owner conversation held before epic 6 (`epic-audio-synth`) was incepted. Items marked **Owner direction** are things the owner asked for. Everything else is a proposal, and inception entry 6.1 (rulings) has to confirm it or rule otherwise. Caching items that belong to other epics are also recorded in those epics' envelopes.

## 1. Corpus facts (fetched legacy fixtures, measured 2026-10-18)

| Format | Files | Detail |
|---|---|---|
| MIDI | 182 | 103 SMF type 0, 79 SMF type 1; division 120 to 960 PPQN. A byte scan flagged 28 files with possible Yamaha XG sysex and 23 with possible non-zero bank select (heuristic; may over-count). No CC111 or text loop markers. |
| WAV | 66 | Mostly 8-bit mono (26 at 8000 Hz); odd rates 22255 Hz and 12025 Hz; 2 MS-ADPCM and 1 IMA-ADPCM; 2 stereo. |
| XM (tracker) | 1 | `BusDriver/Media/track02.xm`, although tracker modules are an envelope non-goal. |
| MP3 / OGG | 0 | The spec says they were supported; no fetched game uses them. |

Per-game size (uncompressed): ChimeranEmpire 33.4 MB (audio 3.3 MB, 665 files), School2Demo 22.3 MB, Caoquest 12.3 MB, FinalDestiny 3.7 MB, demo and Basic about 3.2 MB, LittleMan and BusDriver under 0.3 MB.

Audio fields in the formats: board `bkgMusic`; fight background `music`, `selectSound`, `chooseSound`, `readySound`, `cantDoSound`; main file `cursorMoveSound`, `cursorSelectSound`, `cursorCancelSound` (minor ≥ 3); animation frame `sound`.

## 2. Synth: wrap an existing engine, keep it pluggable

- **Proposal:** do not write a MIDI or SoundFont synthesiser. Wrap `spessasynth_core` (Apache-2.0, TypeScript, headless PCM rendering, no DOM) inside `@tk-reawakened/synth`; `runner-web` may use `spessasynth_lib` for Web Audio output. The rejected alternatives are a scratch synth (an SMF sequencer, the SF2 2.04 generators and envelopes, filters, interpolation, voice stealing and effects add up to months of DSP work), FluidSynth (LGPL) and rustysynth (adds a Rust/wasm toolchain).
- **Owner direction:** synths should be pluggable, the way MIDI cards took swappable SoundFonts and hardware modules. `synth` defines a small `MidiSynth` interface (init, optional `loadSoundFont`, play/stop/pause/resume, `setVolume`, optional offline `render`) with capabilities. It ships with `SpessaMidiSynth` and `NullMidiSynth` (headless). Later backends (OPL3 FM, Web MIDI passthrough to hardware, wasm synths) implement the same interface. Neither core nor game logic changes.
- **Proposal:** with PCM decoders, compressed formats, a mixer and duration parsing, `synth` is really the shared audio package, and MIDI is one of its sources. Keep the spine's package name and widen its description; no rename.

## 3. SoundFonts

**Owner direction:** the bundled SoundFont should have a little Super NES character without using ripped commercial samples. Most "SNES SoundFonts" are ROM rips of game samples, which G6/G7 rule out.

What the SNES sound is made of (it can be recreated without rips): 16–32 kHz mono samples in 64 KB of audio RAM, BRR ADPCM grit, short loops, the SPC700 Gaussian interpolation (a soft low-pass around 8–10 kHz) and the 8-tap FIR echo.

- **Path B (curate):** adopt an existing permissively licensed compact GM bank as the immediate default and test font. Candidates:
  - **Florestan Basic GM GS** (3.3 MB, declared public domain): <https://dev.nando.audio/pages/soundfonts.html>
  - **GMGSx** (3.9 MB, declared public domain): <https://musical-artifacts.com/artifacts/841>

  Provenance must be verified before adoption. Florestan's page says it was sampled from a Roland Sound Canvas, which needs a closer licence and provenance check under G6.
- **Path C (author):** build a project-owned "TK-16" GM bank, about 2–3 MB, in Polyphone from CC0/MIT sources (FreePats, Florestan if cleared). Downsample to 16–22.05 kHz mono, set short loops, shape the top end, and give special care to the 16-bit RPG palette (piano, pizzicato, pan flute, slap and acoustic bass, strings, orchestra hit, drum kit). Record every sample's source in `THIRD_PARTY_NOTICES`. The house precedent is the authored `media/fonts/tkr-8x8.fnt` (entry 4.32).
- **Do not use:** Chaos 4M/8M/12M Bank. A copy is labelled "CC0/public domain", but its own readme says "Copyright 1996 Chaos Club by Cyber-Punk. All rights reserved." That is an example of mislabelled provenance.
- **Proposed staging:** Path B lands first so the licence gate, the synth and headless tests are green. Path C is its own entry, and TK-16 becomes the default once it ships. Optional "SNES profile" DSP (low-pass plus echo) can make any bank sound more 16-bit.
- **Where to find more:**
  - Musical Artifacts (filter by licence): <https://musical-artifacts.com/>
  - FreePats: <https://freepats.zenvoid.org/>
  - Debian `main` packages (DFSG-audited; `fluid-soundfont-gm` is MIT)
  - Polyphone's SoundFont hub: <https://www.polyphone.io/en/soundfonts>
  - Internet Archive (historical; provenance often unclear)
  - Larger options: FluidR3_GM (MIT, about 141 MB), GeneralUser GS (custom permissive licence, about 30 MB), FatBoy (CC-BY 4.0, about 330 MB)
- **Owner direction:** keep it in this monorepo. The default bank goes in `media/soundfonts/`, pinned by SHA-256 and licence in `tools/licences/config.json` `bundledAssets` (as the Liberation fonts are) and listed in `THIRD_PARTY_NOTICES`. At 2–4 MB it needs no separate repo or LFS. Big banks stay external (CDN or user disk).

## 4. SoundFont choice is configuration, not a constant

**Owner direction:** our bank must not be the only choice. There are three layers:

1. **Runner:** a `RunConfig` audio part (SoundFont source, initial master volume, synth backend).
2. **Game author:** a project-level default SoundFont. The legacy `.gam` has no field for it, so it needs a Reawakened project setting or sidecar. This ties to research flow `08-project-file-by-convention`.
3. **Player:** runner audio settings offer the bundled default, other bundled or CDN banks, and "Custom…" (pick or drop any `.sf2`). This is a player preference and is never saved in game state.

`synth.loadSoundFont` hot-swaps without restarting playback.

## 5. RPGCode: `soundFont(file)` and `soundFontReset()`

**Owner direction:** a Reawakened addition, like the camera commands.

- `soundFont("bank.sf2")` posts an `audio` effect. The applier records the active bank in `GameState.audio` and emits a new cue kind `soundfont.set` with `asset`.
- `soundFontReset()` returns to the project default.
- Combined with the existing `mediaPlay`/`midiPlay`/`playMidi`, an author can swap the bank and then play a track, or set a bank once in a board's enter program.
- Save/load restores the bank (AD-16 re-emission). A missing or corrupt bank gives a non-fatal diagnostic and the runner keeps the current bank.
- **Needs a docs-first amendment:**
  - AD-16's closed `AudioCue.kind` list gains `soundfont.set`
  - `docs/spec/engine/rpgcode-functions.md` gains both rows
  - the command-effect catalogue gains both names

## 6. What a software audio stack needs that Windows used to provide

Decoding:
1. **A shared WAV decoder** in `synth`: PCM 8/16-bit, MS-ADPCM, IMA-ADPCM, and resampling of odd rates. Browser `decodeAudioData` support for ADPCM is unverified and probably uneven.
2. **MP3/OGG:** browser codecs, bundled permissive decoders, or transcode on import (as E-104 rules for video). No corpus game uses them.
3. **Tracker modules:** remain a non-goal for now, but one corpus game has an XM. Options: a diagnostic only, render to OGG on import, or a later pluggable source (libopenmpt is BSD).
4. **MIDI dialect:** XG/GS bank requests the SoundFont lacks need a ruling: fall back to GM bank 0, or stay silent.

Timing and determinism:

5. **Duration parsing.** AD-14 has the headless runner emit `audio.ended` "after the parsed duration". The shared code must compute durations for MIDI (walking the tempo map), WAV, MP3 and OGG. Blocking `wav(file, true)` and `mp3pause` depend on it.
6. **Music position after load:** restart from the top, or resume from a tick-derived position.
7. **Goldens hash the cue stream, not PCM.** Synth PCM may differ across JS engines; PCM checks need a tolerance or are smoke-only.

Mixing:

8. **SFX channels:** legacy is "one channel". Rule whether a new effect cuts the old one, and which channel menu, battle and frame sounds use.
9. **Battle music hand-off:** after a battle, does board music restart or resume, and does it fade?
10. **Two volume layers.** Game volume (`setVolume`, E-102) is saved, deterministic game state. Player volume (master, music, SFX, mute) is a runner preference. SoundFonts split the same way (author's `soundFont()` versus player override).
11. **Possible Reawakened additions:** crossfades, `musicFade()`, authored loop points (CC111 or markers). Legacy loops whole files only.

Platform (epic 9 wires it; epic 6 rules the contract):

12. **Browser autoplay unlock:** before the user's first gesture, hold only the current music state and drop SFX. The core never waits on unlock.
13. **Focus pause (E-03):** music pauses through the existing `focus` input.
14. **Preload and cache:** see section 7. SF3 needs `wasm-unsafe-eval` in the CSP.

Authoring and distribution:

15. **Project default SoundFont storage** (section 4).
16. **Packaging:** an exported game bundles its authored bank, warns on unclear bank licences, and never redistributes the legacy MIDI pack (own EULA).
17. **Editor preview:** asset editors play MIDI and WAV through `synth` with the project bank, with no running game required.
18. **Accessibility:** mute and per-bus sliders now; visual sound indicators later.

## 7. Asset caching and first-load stalls

**Owner concern:** a first load in the middle of a game could be painful.

Correctness is already safe. Under AD-5, a blocking request freezes time (`advance` returns `loading`, no ticks); music and video are streams that never touch state; prefetch hints are allowed and cannot change state; the core never fetches. `engine.ts` already de-duplicates pending requests. What remains is the visible stall, which comes from **network** and **decode** cost.

Proposals:

1. **Two load modes by package size.**
   - *Whole package* below a threshold (about 64 MB): one download with progress on the title screen, then offline. This covers every corpus game.
   - *Streaming* above the threshold, driven by item 2.
2. **The core computes a deterministic prefetch plan; the runner executes it.** It is sent as AD-5 hints in tiers:
   - *now:* the current board's assets, music and frame sounds
   - *next:* boards reachable by edge links and literal `send(...)` targets, the board's battle background with its music and sounds, and enemy files
   - *always:* main-file cursor sounds, menu assets and the active SoundFont

   Keeping the plan in core avoids a second board parser in each runner.
3. **Content-addressed cache:** hash and size per entry in AD-6's `manifest.json` `index`. Entries become immutable, updates are deltas, offline play is safe (service worker), and stale caches go away.
4. **Decode ahead in a worker on a hint:** images to RGBA, WAV/ADPCM to PCM, MIDI parsing, SoundFont loading.
5. **Audio never stalls the game.** Drop an SFX that arrives more than about 250 ms late. Blocking `wav` just waits longer for `audio.ended`, a logged input.
6. **Stall presentation:** keep the last frame, show a spinner only after about 300 ms, and keep the music playing.
7. **Author feedback:**
   - the editor test run reports stalls with the asset that caused them
   - warn on references the planner can't predict (`send(boardVar$)`)
   - an optional Reawakened `preload("file")` command that is a hint only
8. **SoundFonts are cached per runner and shared across games** (app-shell cache for the default bank).
9. **Storage limits:** call `navigator.storage.persist()`, fall back to streaming on quota errors, and offer PWA install. Safari eviction rules are unverified.

Ownership:

| Who | What |
|---|---|
| Core (AD-5 seam) | prefetch planner, hint tiers, manifest hashes |
| Epic 9 | storage tiers, load modes, service worker, worker decode, stall UX |
| Epic 6 | audio's share of the plan, the late-SFX rule, the shared SoundFont cache contract |
| Editor epics | stall reporting and unpredictable-reference warnings |

## 8. Proposed breakdown (draft, before validation)

| # | Entry |
|---|---|
| 6.1 | Audio rulings (hitl, docs): R-59, sections 5–7 decisions, AD-16 `soundfont.set` amendment, AVI request handling, `GameState.audio` shape |
| 6.2 | `GameState.audio`, the `audio` applier on the effect bus, cue emission, `audio.ended`, save/restore re-emission |
| 6.3 | Audio and video built-ins (14 catalogue names plus `soundFont`/`soundFontReset`), `audio.sfx` and `video` waits |
| 6.4 | `synth`: `MidiSynth` interface, SpessaSynth and Null backends, WAV/ADPCM decoders, duration parsing, mixer buses |
| 6.5 | Path B bundled SoundFont, licence gate and notices |
| 6.6 | Path C TK-16 SoundFont (authored, provenance-recorded) |
| 6.7 | Headless null-audio conformance and cue goldens |
| 6.8 | Browser/offline MIDI render test |
| 6.9 | Refactor sweep |

## 9. Open decisions for 6.1

| Decision | Conservative default if the owner delegates |
|---|---|
| MP3/OGG handling | transcode on import |
| SFX channels | one channel (parity) |
| Music after load | restart from the top |
| BusDriver XM | diagnostic only |
| XG/GS missing bank | fall back to GM bank 0 |
| Late SFX threshold | about 250 ms, drop |
| Path B bank | Florestan or GMGSx, after provenance verification |

## 10. Nice to have: modern and retro audio formats (owner, 2026-10-18)

**Status:** nice to have, not in the epic 6 scope unless the owner promotes it. Also logged in `../../nice-to-have.md`. Library licences and browser support below are from general knowledge and are **unverified**; check each before adoption (G6).

### Modern delivery formats

| Format | Role in a modern game | Fit for Reawakened |
|---|---|---|
| Ogg Vorbis | Standard for music and long ambience; good size/quality; royalty-free; loops cleanly | Strong candidate as the recommended **delivery** format for new music. Loop points can use the `LOOPSTART`/`LOOPLENGTH` comment-tag convention other RPG engines use (a Reawakened rule to confirm). The Ogg granule position gives the exact length cheaply, which is what AD-14's headless `audio.ended` needs. |
| WAV | Uncompressed PCM; editing source; short, low-latency SFX | Already required (legacy SFX, including ADPCM, §6.1). Stays the SFX format; too large for music. |
| MP3 | Historically common; encoder delay and padding cause loop gaps or pops; legacy patent history | Legacy support only. Proposal: transcode looping MP3 music to Ogg on import so loops are gapless; one-shot MP3 can play as is. |
| FLAC | Lossless; archiving and soundtrack distribution; large in builds | **Source** format: accepted on import and in the editor, transcoded to Ogg/Opus when packaging. Exact length is in `STREAMINFO`. |
| Opus | Best quality at low bitrate; decodes at 48 kHz; has pre-skip | Candidate delivery format beside Vorbis for small web bundles; duration must subtract pre-skip. Safari support for Opus in an Ogg container is unverified. |

Proposals:
- **Source and delivery formats are separate** (like the PNG/WebP image question in epic 9). Authors may bring WAV/FLAC/MP3/Ogg; packaging emits Ogg Vorbis or Opus for music and keeps WAV (or a compact form) for SFX. Editor import and export own the transcoding; the encoder dependency must meet G6.
- **Headless needs durations, not decoders.** Under null audio the core only needs each file's length (Ogg granule, FLAC `STREAMINFO`, Opus pre-skip, MP3 frame walk with the Xing/LAME header). Real decoding is a runner concern, either browser codecs or bundled permissive decoders.
- **Authored loop points** fit both MIDI (CC111 or markers, §6.11) and Ogg tags, so one loop rule covers both.

### Classic chip and tracker formats

| Format | What it is | Licence situation of well-known players (unverified) |
|---|---|---|
| MOD / XM / S3M / IT | Tracker modules: notes plus their own samples in one file | libopenmpt is BSD and would pass G6. The one corpus XM (`BusDriver`) would play. |
| SPC | SNES SPC700 program and RAM snapshot | Common players are LGPL or GPL (game-music-emu, snes_spc), which G6 blocks; a permissive SPC700 emulator would need finding or writing. |
| NSF | NES sound program | Same picture as SPC (game-music-emu is LGPL). |
| GBS | Game Boy sound program | Same as NSF. |
| SID | Commodore 64 music | reSID and libsidplayfp are GPL; blocked. |
| VGM / VGZ | Register-level logs for many arcade and console chips | The format is documented; each chip needs an emulator, and their licences vary. |

Proposals:
- **These fit the pluggable design as extra sources.** `synth` gains a general music-source interface beside `MidiSynth` (bytes in, PCM out, length or "loops forever"). Tracker and chip players are optional backends, and only permissively licensed ones may ship. The core stays the same: cues name an asset; the runner picks the source by format.
- **Content provenance is separate from format support.** Most SPC, NSF, GBS, SID and VGM files in circulation are rips of commercial game music. The runner may play files a user supplies but must never bundle such content (architecture-options §6 point 5, G7). Original chiptunes made in trackers are fine.
- **Fits the Super NES direction.** Original music written for SNES-style trackers and shipped as SPC or a tracker module would give the most authentic 16-bit sound. It depends on finding a permissive SPC700 player; until then, tracker modules through libopenmpt are the practical retro route.
- **Determinism is unaffected.** Chip and tracker playback happens in the runner. Files that loop forever never send `audio.ended`, the same as looping MIDI. A tagged length (for example SPC's ID666 length) can be used for one-shot playback.

### Settle first (if promoted)

1. The recommended delivery format for new music (Vorbis, Opus, or both) and the loop-tag rule.
2. Whether import-time transcoding lives in the editor epics, epic 9 packaging, or a shared tool, and which G6-clean encoder it uses.
3. The music-source interface shape in `synth`, and whether libopenmpt is adopted (it would also turn the BusDriver XM decision into "plays").
4. A licence survey of chip emulators (SPC700, NES APU, Game Boy APU, SID, common VGM chips) to see which, if any, pass G6.
