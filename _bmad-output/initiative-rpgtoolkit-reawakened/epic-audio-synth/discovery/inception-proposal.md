---
type: discovery
title: "Inception proposal: epic-audio-synth (epic 6)"
date: 2026-10-18
baseline_revision: f212728587894ad87ae94de67ae14e31cb444a36
---

# Inception proposal: music, effects and MIDI through a shared synth

This turns the Epic 6 envelope and the long pre-inception exploration (`audio-exploration.md`) into a reviewable ticket breakdown. It is **not** owner approval. Entries 6.1 to 6.3 are human checkpoints; everything in section 2 marked *proposed* stays pending until the owner approves it there. The ticket breakdown is `../tickets.toml`; table order is build order and ids are stable names. The source audit is `audio-readiness.md`.

## 1. Scope restatement

Epic 6 gives the core a track-based audio model and cue stream, the standard `media*` command family with the legacy commands kept as obsolete aliases, the `audio.track` and `video` waits, and a pluggable `synth` package (MIDI through a SoundFont, PCM sources, per-track mixing) with a language-neutral runner protocol. It owns `GameState.audio`, `cueId`, the cue vocabulary, the audio and video built-ins, the `AudioInfo` decoders, the bundled SoundFont and its licence gate, and the headless cue goldens.

It does not own the Web Audio output, autoplay unlock, focus handling or the browser test (epic 9), the battle rules (epic 7), the menu and save UI (epic 8), the editor's audio preview, project SoundFont setting and obsolete-command warning (editor epics), or the MP3/OGG and AVI transcode-on-import tools. It must not create a second cue vocabulary, a second wait path for audio, or a second clock.

## 2. Decision matrix

| ID | Question | Disposition | Status | If the owner rules otherwise |
|---|---|---|---|---|
| D-1 | Volumes: saved game state or settings | **Settings**: not in a game save, untouched by `reset()` and `load()`, held by the host (owner, 2026-10-18). Supersedes envelope assumption A-3. | Decided | Reopen 6.1 P1 and the epic 8 handoff |
| D-2 | Marking the old audio commands obsolete | **Documentation only**; no runtime warning; the editor warns later (owner, 2026-10-18) | Decided | Add an R-36 warning in 6.9 |
| D-3 | Pause during a wait | **Suspend**: a paused track is still active; the wait ends on finish or stop (owner) | Decided | Change the 6.8 wake rule and `media-wait-suspend` |
| D-4 | Total voice cap | **32**, a general default (owner) | Decided | Change the cap in 6.7 |
| D-5 | Cue vocabulary | **Generic per-track kinds** with a `track` field (owner, option A) | Decided | Rework 6.1 and 6.6 |
| D-6 | Built-in tracks | **`music`, `sfx`, `ambience`, `voice`, `ui`** plus author-created tracks (owner) | Decided | Edit the table in 6.2 |
| D-7 | Version baseline and `mp3pause` | **Follow 3.1.0** unless the later behaviour is a deliberate fix; `mp3pause(file)` is play-once-then-wait on `sfx` (owner direction) | Decided | Edit the parity ledger in 6.2 |
| D-8 | Who decides "it ended" | **PROPOSE:** core is the only clock; end tick is start plus asset length; `audio.ended` is advisory; cues carry the tick they were due so a late runner catches up. This **amends AD-9 and AD-14**, which let the runner's reply drive the wake. | Owner approval required (6.1) | Keep AD-14 as written and let the headless runner's `audio.ended` drive waits, accepting device-dependent timing on real runners |
| D-9 | Saved playback versus legacy Q11 (saves stored no audio) | **PROPOSE:** keep AD-16's rule that core records what plays and re-emits it after load; record the departure from Q11 in the parity ledger; music after load restarts from the top (section 9 default) | Owner approval required (6.1) | Save nothing; rebuild music from the board on load |
| D-10 | Envelope Done-when item 2 (browser test) and item 3 (user `.sf2`) | **Assumption to confirm at the 6.3 checkpoint:** no browser harness exists, so 6.16 proves the render path offline in Node and epic 9 owns the browser test and the user `.sf2` runner contract | To confirm (6.3) | Add a browser harness entry here, delaying 6.16 |
| D-11 | One rulings entry or three | **Assumption to confirm:** three (6.1 core, 6.2 commands and behaviour, 6.3 platform), each with its own owner checkpoint | To confirm | Merge into one checkpoint |
| D-12 | Epic size | 17 entries, above the typical range; kept as one epic as Epic 4 was, because the lanes share one cue contract | To confirm | Split synth and bank (6.11 to 6.14) into a second epic |
| D-13 | Per-track voice counts and the track limit | **PROPOSE for 6.2:** `music` 1, `sfx` 1 (legacy parity), `ambience` 4, `voice` 2, `ui` 4, at most 16 named tracks, total 32. An overlapping-effects track is author-created with `mediaTrack(name, voices)` (for example `effects` with 16), not a sixth built-in, so D-6 stands. | Owner choice, unverified defaults | Change the defaults table |
| D-14 | Where audio length comes from | **Assumption A-4:** pure core `AssetDecoder<AudioInfo>` (WAV, MIDI) through entry 3.14's `decoders`; the synth carries the playback decoders | To confirm | Move length parsing into `synth` and pass lengths in as asset metadata |
| D-15 | MP3 and OGG | **Section 9 default:** transcode on import; core and synth handle WAV and MIDI only. No entry in any epic builds the transcoder. | Owner approval required (6.3) | Add decoders to 6.5 and 6.12 |
| D-16 | Tracker/XM and unknown formats | Envelope non-goal stands: diagnostic plus silence, never a state change | Ratified | Promote the section 10 nice-to-have |
| D-17 | Epic 4's effect-record names | **PROPOSE:** keep `music.play` and `sfx.play` as the Epic 4 to Epic 6 effect vocabulary; the applier maps them to the `music` and `sfx` tracks. What changes is who decides: `postBoardMusic` and `engine.musicAsset` stop deciding same-file and silence at board entry, and the applier does (Q5 to Q8, Q10). | Owner approval required (6.1) | Rename the effects in a migration of entries 4.20 and 4.23's producers |
| D-18 | The `music` virtual variable (Q19) | **PROPOSE:** read from the `music` track's file (battle track during a fight, not empty after `mediaStop`), replacing the `state.audio.music` read | Owner approval required (6.1) | Keep a separate `audio.music` string beside the tracks |
| D-19 | Script volume versus the player's mix (clarifies D-1) | **PROPOSE:** a volume a script sets and reads (`setvolume`, `mediaVolume`) is core state that is outside the game save and untouched by `reset()` and `load()` (Q12, Q13); the player's own mix (the options sliders) is a runner-side multiplier that never enters core. Both are "settings" in the sense that a save never carries them. | **Owner to confirm** (6.1) | Make all volumes host-held and give scripts no read-back |

### Judgement calls worth the owner's attention

- <!-- OWNER: D-8 --> Demoting `audio.ended` makes script timing independent of the sound device, at the cost of changing two spine rules and needing an asset length for every playable file.
- <!-- OWNER: D-9 --> Keeping saved playback departs from the legacy engine; the alternative loses what a stinger or ambience track was doing at the moment of a save.
- <!-- OWNER: D-10 --> Offline rendering proves the synth path but not Web Audio; the browser proof and the user `.sf2` contract move to epic 9, confirmed at the 6.3 checkpoint.
- <!-- OWNER: D-19 --> The owner decision was "volumes are settings". A value a script can read back must still be replay-safe, so this proposal splits it into script volume (core state, not saved) and the player's mix (runner-side); confirm that is what was meant.
- <!-- OWNER: D-15 --> If the transcoder is never built, an MP3 or OGG file in a game is silent with a diagnostic. The corpus has none.

## 3. Breakdown

| # | Title | after | Risk | Lane | Check |
|---|---|---|---|---|---|
| 1 | Core audio rulings: tracks, time, cues and waits | 3.9, 3.27, 4.29 | high | docs | OWNER-marked rules for P1, P2, P4, P5; AD-9, AD-14, AD-16 amended; person approves |
| 2 | Media commands, voices, layered audio and legacy parity rulings | 1, 3.27, 3.29 | high | docs | command family, voice model, parity ledger, the `deprecated` marker; docs only, catalogue and Audio-table edits left to 8 and 9; person approves |
| 3 | Platform rulings: SoundFont policy, sources, runner protocol and video | 1, 2, 1.5, 3.14 | high | docs | R-59, formats, bank, protocol, video, Done-when items 1 to 3 assigned; person approves |
| 4 | Independent audio timeline oracle and authored audio fixtures | 1, 2, 3, 1.9 | medium | fixtures | 15 named scenes and authored WAV and MIDI with hand-worked lengths; check mode; no core imports |
| 5 | AudioInfo decoders for WAV and MIDI | 3, 4, 2.10, 3.14 | medium | core decoders | authored and corpus files decode to the oracle lengths |
| 6 | Audio state section, track engine and cue emission | 1, 2, 4, 5, 3.11, 3.21, 4.11, 4.19, 4.20, 4.23, 4.31 | high | core audio (tracer) | board music boot to cue to oracle state, the board-music authority and `music` variable moved, `soundfont.set`, snapshot, settings kept |
| 7 | Voices, voice stealing, fades and synced starts | 2, 4, 6 | high | core audio | four scenes per tick; stealing and fades deterministic |
| 8 | Media control built-ins and the track wait | 2, 6, 7, 2.10, 3.3, 3.9, 3.22, 3.25, 3.29 | high | VM seam | control pack incl. both `mediaVolume` forms and the audio read view, `soundFont` commands, `audio.track` wait replacing the unresolved `audio.sfx` wait, diagnostics, help text |
| 9 | Media query built-ins, legacy command mapping and catalogue sweep | 8, 3.17 | medium | VM seam | query pack on the audio view, legacy names routed, `deprecated` marker, parity scene, corpus equivalence |
| 10 | Video built-ins and the video wait | 3, 6, 8, 9, 3.22 | medium | VM seam | `playavi` and `playavismall` resolve on `video.ended` and no longer park on an unresolved wait; music restarts |
| 11 | synth: MidiSynth, the Null backend and the AudioSource seam | 3, 1.9 | medium | synth | interfaces, Null backend, registry, voice state machine |
| 12 | SpessaSynth backend, PCM sources, track buses and voice pool | 5, 7, 11, 1.5 | high | synth | sources agree with `AudioInfo`; buses match oracle ramps; licence gate |
| 13 | SoundFont bundling gate and the Path B bank | 3, 1.5 | medium | licence | gate audits SoundFonts; bank provenance verified; person approves |
| 14 | Path C: the authored TK-16 SoundFont | 13 | medium | assets | provenance per sample; person approves the sound |
| 15 | Runner audio protocol schema and conformance vectors | 3, 7, 11, 12 | medium | protocol | schema checked against types; vectors replay through the Null and PCM sources |
| 16 | Headless null-audio cue goldens and the offline MIDI render test | 6, 7, 9, 10, 12, 13, 15, 1.9 | medium | conformance | cue goldens in Node and Bun with a synthetic battle-music hand-off; offline render non-silent |
| 17 | Replay, reset and downstream contract sweep | 9, 10, 14, 15, 16, 3.11, 4.31 | high | integration | replay under batching, reset, catalogue, handoffs, sweep |

### Lane and shared-seam ownership

- **Rulings:** 1, then 2, then 3 (2 and 3 both extend `audio-media.md`, which entry 1 creates, so they run in order; 4 waits on all three because it authors scenes for the `soundFont` and battle rules from 3).
- **Fixtures:** 4 is the sole producer; later entries cite its scene names.
- **Core lane:** 5 then 6 (tracer bullet) then 7 then 8 then 9 then 10.
- **Synth lane:** 11 then 12 (12 also needs 5 and 7).
- **Bank lane:** 13 then 14, independent of the core lane until 16.
- **Shared seams:** entry 6 owns the `audio` section type (including the voice and fade fields) and the `core/audio` barrel; entry 7 adds behaviour without changing the type; entry 8 owns the control pack and the `audio.track` wait registration; entry 9 the query pack and legacy mapping; entry 10 the video pack; entry 17 reconciles the barrels, catalogue rows and the stub removal. No parallel entry edits another lane's section type or command array.
- **Tracer bullet:** entry 6 (a board-music effect becomes a track, a cue and an oracle-checked state at a fixed tick).

## 4. Cross-epic wiring

| Epic 6 consumer | Provider pins | Why |
|---|---|---|
| Rulings and docs | 3.9, 3.27, 3.29, 4.29, 3.14, 1.5 | Wait registry, spec migration, command documentation, audio-cue rulings, decoder wiring, licence gate |
| Fixtures and decoders | 1.9, 2.10, 3.14 | Golden job and null audio, asset resolver for Media-folder names, `decoders` |
| Core audio | 3.11, 3.21, 4.11, 4.19, 4.20, 4.23, 4.31 | Snapshot hardening, effect records, effect bus, engine loop, board-music and animation producers, reset seam |
| Built-ins | 2.10, 3.3, 3.9, 3.17, 3.22, 3.25, 3.29 | Registry, waits, catalogue completeness, responders, manifest, docs in code |
| Synth and bank | 1.5, 1.9 | Licence gate, synth scaffold |

The initiative file now lists epic 2 in this epic's `after` (for 2.10); epics 1, 3 and 4 were already there.

Downstream handoffs (written by entry 6.17):

- **Epic 9:** the runner audio protocol, vectors, autoplay unlock (hold music state, drop sound effects), focus behaviour, late-sound threshold, prefetch hints, SoundFont cache, per-bus volume as settings, the browser playback test and the CSP `wasm-unsafe-eval` note.
- **Epic 8:** per-track volume settings live outside the save; playback state is saved; the options menu uses the five built-in tracks.
- **Epic 7:** battle music is posted as audio effects with source `battle`; the pre-fight track restarts after the fight (Q9); a fight with no music is silent (Q8). Epic 7's envelope does not mention this yet.
- **Editor epics:** audio preview through `synth`, the project default-SoundFont setting, the editor warning for obsolete audio commands, and the MP3/OGG and AVI transcoders.

### Done-when mapping

| Envelope Done-when | Delivered by | Note |
|---|---|---|
| 1. Music and sound-effect cues from boards, battles, animation frames and scripts appear in headless null-audio tests | 6.6 (boards, animation frames), 6.8 and 6.9 (scripts), 6.16 (goldens) | Battle cues: no battle runtime exists, so 6.16 and 6.6 prove the hand-off rules with a synthetic `source: battle` effect record; real battle cues are epic 7's. Confirmed at 6.3 |
| 2. The synth plays a sample MIDI through the SoundFont in a browser test | 6.12 and 6.16 (offline Node render), epic 9 (browser) | D-10, confirmed at 6.3 |
| 3. A user can point the runner at their own `.sf2` | 6.3 (the contract), epic 9 (the runner) | D-10, confirmed at 6.3 |
| 4. Audio built-ins register with the VM and drive the cues | 6.8, 6.9, 6.10 | |

## 5. Validation record

**Round 0 (author, 2026-10-18).** Read the envelope, the exploration (sections 1 to 13 and work packages P1 to P10), the facts of rounds 8 and 9, the spine rows AD-9, AD-14, AD-16, AD-26, AD-30 and AD-31, and the provider tickets. Four read-only scouts covered the spine and code seams, the provider and downstream entries, the spec and facts, and the corpus, licence and oracle tooling. No code or legacy GPL source was opened.

**Round 1 (independent reviewer, 2026-10-18).** Found, among other things: the board-music path (`postBoardMusic`, `engine.musicAsset`, the `music` virtual variable) had no owner and would block `same-file-rules`; entry 6.15 needed 6.12; entry 6.14's verify used the render test built later; battle goldens could not be produced without a battle runtime; Done-when items 2 and 3 had no checkpoint; the `video-restarts-music` scene sat in two entries; `mediaVolume` was split across two packs; the Audio table and the catalogue had two owners; "obsolete" already means `builtin.obsolete` machinery in this repository (F-14); D-13's `effects` track contradicted D-6; music after load had two owners; audit finding F-04 was wrong (a live unresolved-wait hazard) and two citations drifted; `soundfont.set` had no test. Each was corrected in the tickets, plans, audit, proposal and exploration. A new owner question surfaced: how a script-set volume relates to the player's mix (D-19).

**Round 2 (planned).** Re-run `tickets.py status` and `next`; a second independent review; require no cycle, `undeclared_after`, `order_conflict` or drift. Owner approval is still required for entries 6.1 to 6.3 before implementation entries become ready-for-dev.

## References

- `../epic-audio-synth.md`
- `audio-readiness.md` and `audio-exploration.md`
- `docs/spec/engine/display-input-audio.md` (E-16, E-100 to E-104, R-59) and `rpgcode-functions.md` (Audio table)
- `docs/provenance/facts-round-8.md` and `facts-round-9.md`
- Architecture AD-5, AD-9, AD-10, AD-14, AD-16, AD-25, AD-26, AD-30, AD-31
