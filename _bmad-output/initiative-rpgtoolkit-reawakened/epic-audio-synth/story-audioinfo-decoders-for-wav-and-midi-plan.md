---
title: 'AudioInfo decoders for WAV and MIDI'
type: 'feature'
ticket: 5
created: '2026-10-18'
status: built
baseline_revision: 'f212728587894ad87ae94de67ae14e31cb444a36'
risk: 'medium'
context:
  - 'docs/guardrails.md'
  - 'packages/core/src/formats/registry/decoder.ts'
  - 'docs/spec/engine/audio-media.md'
  - '_bmad-output/initiative-rpgtoolkit-reawakened/architecture-rpgtoolkit-reawakened/architecture-rpgtoolkit-reawakened.md, AD-31'
---

## Intent
Give core a pure, deterministic way to know how long an audio asset is, because track end ticks depend on it.

## Boundaries
Length, loop and bank-need only. No sample decoding for playback (entry 6.12), no MP3/OGG decoder (transcoded on import, entry 6.3), no tracker format.

## Key Decisions
Length is computed in integer ticks with the rounding rule of entry 6.1; a file whose length cannot be read returns a `FormatError` and the caller plays silence; what `mediaWait` and `mediaLength` do for an unreadable length is ruled in entry 6.1, not here.

## Acceptance
A decoder per format registers through the existing `decoders` array; an `AudioInfo` is `{ lengthTicks, loopStartTick, needsBank }` with every key present and `null` for absence (AD-14); the corpus table is committed.

## Verification
Unit tests over authored bytes and the corpus; the plain-data check; `typecheck`, `lint`, `graph`.

## Scope

Two pure core decoders, `audio.wav` and `audio.midi`, each an `AssetDecoder<AudioInfo>` registered through the built-in `audio` plugin's `decoders` (`AUDIO_PLUGIN`), the `AudioInfo` model, the corpus table and the tests. The Acceptance record above is the planning-time shape; the ratified shape is the 6.3 record of `docs/spec/engine/audio-media.md#audio-info-seam`: `{ format, lengthTicks, sampleRateHz, channels, bank }` with every key present and `null` for absence. There is no `loopStartTick` (legacy loops whole files; authored loop points are a deferral) and `needsBank` is `bank` (`{ kind, dialect, bankSelect }`, F5). Sample decoding stays in entry 6.12, MP3/OGG stay import-time formats, and no tracker decoder exists.

## Code Map

- `packages/core/src/formats/audio/model.ts` — `AudioInfo`, `AudioBank`, the decoder ids, the section anchors and the exact integer `floorDiv`.
- `packages/core/src/formats/audio/wav.ts` — `decodeWav`, `detectWav`, `wavLengthTicks`, `WAV_DECODER`: chunk walk, PCM 8/16, MS-ADPCM, IMA-ADPCM, 1 or 2 channels, frames by block align or the `fact` chunk, rate 1 to 192000.
- `packages/core/src/formats/audio/midi.ts` — `decodeMidi`, `detectMidi`, `midiLengthTicks`, `MIDI_DECODER`: SMF type 0 and 1, PPQN only, tracks merged by absolute tick for the tempo map, XG/GS/bank-select scan.
- `packages/core/src/formats/audio/plugin.ts` — `AUDIO_PLUGIN` (`id: "audio"`, no commands, decoders MIDI then WAV), exported from `@tk-reawakened/core`.
- `packages/core/test/format-audio.test.ts` — rule arithmetic, every authored file against its hand-worked manifest entry, malformed and truncated bytes (every strict prefix of every authored MIDI file, every cut of a PCM file), a deterministic mutation fuzz, registry dispatch, and the fetched corpus against the table.
- `packages/core/test/fixtures/audio-corpus.json` — the committed table: one row per MIDI and WAV file of the fetched corpus (path, SHA-256, length in ticks, and codec, channels, rate and frames or type, division, dialect and bank select), measured by the oracle's independent reader, not by the core decoders.
- `tools/fixtures/test/audio.test.mjs` — a new case re-measures every table row with the independent reader and checks the pinned digests when the corpus is fetched.
- `docs/spec/engine/audio-media.md` — F4 item 6 pins the decoder details the rule left open; F5 item 5 records the authoritative bank table.
- `types/node-test.d.ts` — declares `assert.ok` for the test type-check.

## Implementation notes

- **Corpus counts.** `pnpm fixtures:fetch` provides 171 MIDI and 66 WAV files (3 ADPCM: `Knifewish.wav` IMA, `boom.WAV` and `slash.wav` MS-ADPCM); the exploration's 182 MIDI also counted 11 `fixtures/archaeology` downloads that CI does not fetch (checked locally: all decode, all `gm`, no bank select). All 237 decode without error. Authoritative bank table: 23 `xg`, 1 `gs`, 147 `gm`; 29 with bank select; 103 type 0 and 68 type 1.
- **Truncation policy.** A WAV `data` chunk that declares more than the file holds counts the bytes present and the result carries a warning (streamed WAVs write `0xFFFFFFFF`); everything else cut short, and every strict prefix of a MIDI file, is a `FormatError` (a MIDI chunk length is checked against the file).
- **Lengths.** Whole-number arithmetic only; `floorDiv` uses the remainder so no rounded quotient is relied on; the MIDI guard checks the 2^53 − 1 bound on the weighted sum and on `12 * N + 100000 * d`.
- **Registration.** The decoders are not in `CORE_DECODERS`: `core-decoders.ts` and the headless data-format dump stay the legacy-format set, and the audio pack arrives by the plugin seam that ticket 3.14 wired (`assembleDecoders`). The host lists `AUDIO_PLUGIN` before any pack plugin so the built-ins win header ties. Wiring it into engine start is entry 6.6.

## How it is verified

`node --test packages/core/test/format-audio.test.ts` and `node --test tools/fixtures/test/audio.test.mjs`; the repository gates (`typecheck`, `lint`, `test:strict`, `golden`, `golden:bun`, `graph`, `licence`, `provenance`, `catalogue:check`, `command-docs:check`, `oracle:check`).
