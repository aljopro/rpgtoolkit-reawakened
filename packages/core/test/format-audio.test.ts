// The WAV and MIDI `AssetDecoder<AudioInfo>` decoders of ticket 6.5
// (docs/spec/engine/audio-media.md#audio-wav-midi-length and #audio-info-seam).
//
// Three sources of expected values, none sharing code with the decoders:
//   * the authored files of ticket 6.4 and the hand-worked lengths in their manifest
//     (`fixtures/audio/manifest.json`, built by `tools/fixtures/audio`, which imports nothing from core);
//   * the committed corpus table (`fixtures/audio-corpus.json`), measured by the oracle's independent
//     reader, checked against the fetched legacy games when they are present (G5 rule 4);
//   * bytes written here straight from the SMF and RIFF layouts, for the rules and the malformed cases.
//
// A decoder never throws for bad data (AD-18), so the tests assert on `ok` and on the error's offset
// and section rather than on exceptions.
import { test } from "node:test";
import { deepEqual, equal, ok } from "node:assert/strict";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  assembleDecoders,
  AUDIO_MIDI_ID,
  AUDIO_PLUGIN,
  AUDIO_WAV_ID,
  createAssetIndex,
  decodeMidi,
  decodeWav,
  detectMidi,
  detectWav,
  MIDI_DECODER,
  midiLengthTicks,
  PACKAGE_ROOT,
  WAV_DECODER,
  wavLengthTicks,
} from "../src/index.ts";
import type {
  AssetResolver,
  AudioInfo,
  AudioInfoIsPlainData,
  FormatError,
  Logger,
  LogRecord,
  Result,
} from "../src/index.ts";

const testDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(testDir, "..", "..", "..");
const audioDir = join(testDir, "fixtures", "audio");
const SECTION = "docs/spec/engine/audio-media.md#audio-wav-midi-length";

// Compile-time only: the record is plain data (G1, AD-7).
const PLAIN: AudioInfoIsPlainData = { format: "x", lengthTicks: null, sampleRateHz: null, channels: null, bank: null };
equal(PLAIN.format, "x");

const RESOLVER: AssetResolver = { index: createAssetIndex([]), root: PACKAGE_ROOT };

function unwrap(result: Result<AudioInfo>): AudioInfo {
  if (!result.ok) {
    throw new Error(`expected ok, got: ${result.error.message} (offset ${result.error.offset})`);
  }
  return result.value;
}

function failure(result: Result<AudioInfo>): FormatError {
  if (result.ok) {
    throw new Error(`expected a FormatError, got ${JSON.stringify(result.value)}`);
  }
  return result.error;
}

/** The typed-error contract: a finite non-negative integer offset, the spec section, a message. */
function assertTyped(error: FormatError): void {
  ok(Number.isInteger(error.offset) && error.offset >= 0, `offset ${error.offset}`);
  equal(error.section, SECTION);
  ok(error.message.length > 0);
}

// ---------------------------------------------------------------------------------------------
// Writers: bytes straight from the layouts.

function le16(value: number): number[] {
  return [value & 0xff, (value >> 8) & 0xff];
}
function le32(value: number): number[] {
  return [value & 0xff, (value >>> 8) & 0xff, (value >>> 16) & 0xff, (value >>> 24) & 0xff];
}
function be16(value: number): number[] {
  return [(value >> 8) & 0xff, value & 0xff];
}
function be32(value: number): number[] {
  return [(value >>> 24) & 0xff, (value >>> 16) & 0xff, (value >>> 8) & 0xff, value & 0xff];
}
function text(value: string): number[] {
  return [...value].map((c) => c.charCodeAt(0));
}

function chunk(id: string, body: readonly number[]): number[] {
  return [...text(id), ...le32(body.length), ...body, ...(body.length % 2 === 1 ? [0] : [])];
}

function riff(...chunks: number[][]): Uint8Array {
  const body = [...text("WAVE"), ...chunks.flat()];
  return Uint8Array.from([...text("RIFF"), ...le32(body.length), ...body]);
}

interface FmtOptions {
  tag?: number;
  channels?: number;
  rate?: number;
  blockAlign?: number;
  bits?: number;
  samplesPerBlock?: number;
}

function fmtChunk(o: FmtOptions = {}): number[] {
  const tag = o.tag ?? 1;
  const channels = o.channels ?? 1;
  const bits = o.bits ?? 16;
  const blockAlign = o.blockAlign ?? (channels * bits) / 8;
  const body = [...le16(tag), ...le16(channels), ...le32(o.rate ?? 8000), ...le32(0), ...le16(blockAlign), ...le16(bits)];
  if (o.samplesPerBlock !== undefined) {
    body.push(...le16(2), ...le16(o.samplesPerBlock));
  }
  return chunk("fmt ", body);
}

function pcmWav(frames: number, o: FmtOptions = {}): Uint8Array {
  const channels = o.channels ?? 1;
  const bits = o.bits ?? 16;
  return riff(fmtChunk(o), chunk("data", new Array<number>(frames * channels * (bits / 8)).fill(0)));
}

interface MidiEvent {
  delta: number;
  bytes: readonly number[];
}

function vlq(value: number): number[] {
  const out = [value & 0x7f];
  let rest = Math.floor(value / 128);
  while (rest > 0) {
    out.unshift((rest & 0x7f) | 0x80);
    rest = Math.floor(rest / 128);
  }
  return out;
}

function track(events: readonly MidiEvent[]): number[] {
  const body = events.flatMap((e) => [...vlq(e.delta), ...e.bytes]);
  return [...text("MTrk"), ...be32(body.length), ...body];
}

function midi(type: number, division: number, tracks: readonly (readonly MidiEvent[])[]): Uint8Array {
  return Uint8Array.from([
    ...text("MThd"),
    ...be32(6),
    ...be16(type),
    ...be16(tracks.length),
    ...be16(division),
    ...tracks.flatMap((t) => track(t)),
  ]);
}

const END: MidiEvent = { delta: 0, bytes: [0xff, 0x2f, 0x00] };
function tempo(delta: number, micros: number): MidiEvent {
  return { delta, bytes: [0xff, 0x51, 0x03, (micros >> 16) & 0xff, (micros >> 8) & 0xff, micros & 0xff] };
}
function endAfter(delta: number): MidiEvent {
  return { delta, bytes: [0xff, 0x2f, 0x00] };
}
function cc(controller: number, value: number): MidiEvent {
  return { delta: 0, bytes: [0xb0, controller, value] };
}

// ---------------------------------------------------------------------------------------------
// Detection and the registry.

test("detect recognises each format's own header and nothing else", () => {
  ok(detectWav(pcmWav(1)));
  ok(!detectWav(midi(0, 480, [[END]])));
  ok(!detectWav(Uint8Array.from(text("RIFF"))));
  ok(!detectWav(Uint8Array.from([...text("RIFF"), 0, 0, 0, 0, ...text("AVI ")])));
  ok(detectMidi(midi(0, 480, [[END]])));
  ok(!detectMidi(pcmWav(1)));
  ok(!detectMidi(Uint8Array.from(text("MTh"))));
  ok(!detectMidi(new Uint8Array(0)));
});

test("the audio pack registers both decoders through PluginDefinition.decoders", () => {
  deepEqual(AUDIO_PLUGIN.decoders?.map((d) => d.id), [AUDIO_MIDI_ID, AUDIO_WAV_ID]);
  equal(AUDIO_PLUGIN.commands.length, 0);
  const records: LogRecord[] = [];
  const logger: Logger = {
    debug: (r) => void records.push(r),
    info: (r) => void records.push(r),
    warn: (r) => void records.push(r),
    error: (r) => void records.push(r),
  };
  const registry = assembleDecoders([AUDIO_PLUGIN], logger);
  equal(records.length, 0);

  const wav = pcmWav(4);
  const mid = midi(0, 480, [[END]]);
  equal(registry.byExtension("WAV"), WAV_DECODER);
  equal(registry.byExtension("mid"), MIDI_DECODER);
  equal(registry.byExtension("midi"), MIDI_DECODER);
  equal(registry.byHeader(wav), WAV_DECODER);
  equal(registry.byHeader(mid), MIDI_DECODER);
  // A mislabelled file is still found by its bytes (F1: the bytes decide).
  equal(registry.resolve("ogg", wav), WAV_DECODER);
  equal(registry.resolve("xyz", mid), MIDI_DECODER);

  for (const decoder of [WAV_DECODER, MIDI_DECODER]) {
    equal(decoder.section, SECTION);
    ok(decoder.id.startsWith("audio."));
  }
  const decoded = unwrap(WAV_DECODER.decode(wav, RESOLVER));
  equal(decoded.format, AUDIO_WAV_ID);
});

test("an AudioInfo has every key and survives a JSON round trip unchanged", () => {
  for (const bytes of [pcmWav(100, { rate: 8000 }), midi(0, 480, [[endAfter(1920)]])]) {
    const decoder = detectWav(bytes) ? WAV_DECODER : MIDI_DECODER;
    const result = decoder.decode(bytes, RESOLVER);
    const info = unwrap(result);
    deepEqual(Object.keys(info), ["format", "lengthTicks", "sampleRateHz", "channels", "bank"]);
    deepEqual(JSON.parse(JSON.stringify(info)), info);
  }
});

// ---------------------------------------------------------------------------------------------
// The length rules, hand-worked from F4.

test("the WAV length rule is exact: half a tick rounds up and the minimum is one", () => {
  equal(wavLengthTicks(8000, 8000), 60); // 1 s
  equal(wavLengthTicks(4000, 8000), 30); // (480000 + 8000) / 16000 = 30.5
  equal(wavLengthTicks(200, 8000), 2); // exactly 1.5 ticks rounds up
  equal(wavLengthTicks(1, 8000), 1); // 0.5075 floors to 0, raised to 1
  equal(wavLengthTicks(1, 192000), 1);
  // Odd rates from the corpus: 22255 Hz and 12025 Hz.
  equal(wavLengthTicks(22255, 22255), 60);
  equal(wavLengthTicks(12025, 12025), 60);
  // A frame count that would round the wrong way in floating point seconds.
  equal(wavLengthTicks(1_000_000_000, 44100), 1360544); // 22675.7369... s = 1360544.2 ticks
  equal(wavLengthTicks(0xffff_ffff, 1), 0xffff_ffff * 60);
});

test("the MIDI length rule is exact: the spec example, half ticks, and the overflow guard", () => {
  equal(midiLengthTicks(960_000_000, 480), 120); // d = 480, tempo 500000, 1920 ticks: 2 s
  equal(midiLengthTicks(0, 480), 1);
  equal(midiLengthTicks(950_000_000, 480), 119); // 118.75 rounds up
  equal(midiLengthTicks(240_000_000, 480), 30); // 30.5 floors to 30
  equal(midiLengthTicks(Number.MAX_SAFE_INTEGER, 480), null);
  equal(midiLengthTicks(Number.MAX_SAFE_INTEGER, 1), null);
  ok(midiLengthTicks(1_000_000_000_000, 480) !== null);
});

// ---------------------------------------------------------------------------------------------
// The authored files of ticket 6.4 against their hand-worked facts.

interface AuthoredFile {
  file: string;
  kind: "wav" | "midi";
  bytes: number;
  channels?: number;
  rate?: number;
  lengthTicks: number;
  bank?: { dialect: "gm" | "gs" | "xg"; bankSelect: boolean };
}

const manifest = JSON.parse(readFileSync(join(audioDir, "manifest.json"), "utf8")) as { files: AuthoredFile[] };

function decodeFile(bytes: Uint8Array): Result<AudioInfo> {
  const decoder = detectWav(bytes) ? WAV_DECODER : MIDI_DECODER;
  return decoder.decode(bytes, RESOLVER);
}

test("every authored file's AudioInfo equals the oracle's hand-worked length", () => {
  equal(manifest.files.length, 17);
  equal(manifest.files.filter((f) => f.kind === "wav").length, 9);
  equal(manifest.files.filter((f) => f.kind === "midi").length, 8);
  for (const entry of manifest.files) {
    const bytes = new Uint8Array(readFileSync(join(audioDir, entry.file)));
    equal(bytes.length, entry.bytes, `${entry.file} size`);
    const info = unwrap(decodeFile(bytes));
    if (entry.kind === "wav") {
      deepEqual(
        info,
        { format: "audio.wav", lengthTicks: entry.lengthTicks, sampleRateHz: entry.rate, channels: entry.channels, bank: null },
        entry.file,
      );
    } else {
      ok(entry.bank !== undefined);
      deepEqual(
        info,
        {
          format: "audio.midi",
          lengthTicks: entry.lengthTicks,
          sampleRateHz: null,
          channels: null,
          bank: { kind: "soundfont", dialect: entry.bank.dialect, bankSelect: entry.bank.bankSelect },
        },
        entry.file,
      );
    }
  }
});

test("the ADPCM codecs count frames from the fact chunk, else whole blocks", () => {
  const frames = (name: string): number | undefined => manifest.files.find((f) => f.file === `files/${name}`)?.lengthTicks;
  equal(frames("msadpcm-mono-8000.wav"), 15);
  equal(frames("msadpcm-mono-8000-fact.wav"), 14);
  equal(frames("ima-adpcm-stereo-8000.wav"), 8);
});

// ---------------------------------------------------------------------------------------------
// WAV: supported layouts and refusals.

test("PCM 8 and 16 bit, mono and stereo, count frames by block align", () => {
  deepEqual(unwrap(decodeWav(pcmWav(8000, { bits: 8 }))), {
    format: "audio.wav",
    lengthTicks: 60,
    sampleRateHz: 8000,
    channels: 1,
    bank: null,
  });
  const stereo = unwrap(decodeWav(pcmWav(44100, { bits: 16, channels: 2, rate: 44100 })));
  equal(stereo.lengthTicks, 60);
  equal(stereo.channels, 2);
  equal(stereo.sampleRateHz, 44100);
  equal(unwrap(decodeWav(pcmWav(96000, { rate: 192000 }))).lengthTicks, 30);
});

test("chunk order does not matter, odd chunks are padded, and the first fmt and data win", () => {
  const data = chunk("data", new Array<number>(160).fill(0));
  const info = unwrap(decodeWav(riff(chunk("LIST", text("INFOabc")), data, fmtChunk({ rate: 8000 }), chunk("data", [1, 2]))));
  equal(info.lengthTicks, 1); // 80 frames at 8000 Hz: (9600 + 8000) / 16000 = 1.1
});

test("an ADPCM file needs the samples-per-block word unless nothing else is read", () => {
  const data = chunk("data", new Array<number>(512).fill(0));
  const ima = unwrap(decodeWav(riff(fmtChunk({ tag: 0x11, bits: 4, blockAlign: 256, samplesPerBlock: 505 }), data)));
  equal(ima.lengthTicks, 8); // 2 blocks x 505 = 1010 frames: (121200 + 8000) / 16000 = 8.075 -> 8
  const ms = unwrap(decodeWav(riff(fmtChunk({ tag: 2, bits: 4, blockAlign: 256, samplesPerBlock: 500 }), chunk("fact", le32(1900)), data)));
  equal(ms.lengthTicks, 14);

  const short = failure(decodeWav(riff(fmtChunk({ tag: 0x11, bits: 4, blockAlign: 256 }), data)));
  assertTyped(short);
  const zero = failure(decodeWav(riff(fmtChunk({ tag: 0x11, bits: 4, blockAlign: 256, samplesPerBlock: 0 }), data)));
  assertTyped(zero);
  const wrongBits = failure(decodeWav(riff(fmtChunk({ tag: 2, bits: 8, blockAlign: 256, samplesPerBlock: 500 }), data)));
  assertTyped(wrongBits);
});

test("unsupported WAV codecs and layouts are typed errors", () => {
  const cases: [string, Uint8Array][] = [
    ["a-law", riff(fmtChunk({ tag: 6, bits: 8 }), chunk("data", [0, 0]))],
    ["mu-law", riff(fmtChunk({ tag: 7, bits: 8 }), chunk("data", [0, 0]))],
    ["float", riff(fmtChunk({ tag: 3, bits: 32, blockAlign: 4 }), chunk("data", [0, 0, 0, 0]))],
    ["24-bit pcm", riff(fmtChunk({ bits: 24 }), chunk("data", new Array<number>(6).fill(0)))],
    ["32-bit pcm", riff(fmtChunk({ bits: 32 }), chunk("data", new Array<number>(8).fill(0)))],
    ["mp3 inside wav", riff(fmtChunk({ tag: 0x55, bits: 0, blockAlign: 1 }), chunk("data", [0, 0]))],
    ["extensible", riff(fmtChunk({ tag: 0xfffe }), chunk("data", [0, 0]))],
    ["three channels", pcmWav(4, { channels: 3 })],
    ["zero channels", riff(fmtChunk({ channels: 0, blockAlign: 2 }), chunk("data", [0, 0]))],
    ["rate 0", pcmWav(4, { rate: 0 })],
    ["rate above 192000", pcmWav(4, { rate: 192001 })],
    ["block align 0", riff(fmtChunk({ blockAlign: 0 }), chunk("data", [0, 0]))],
    ["block align not a frame", riff(fmtChunk({ blockAlign: 3 }), chunk("data", [0, 0, 0]))],
    ["no frames", pcmWav(0)],
    ["a frame short", riff(fmtChunk({ channels: 2 }), chunk("data", [0, 0, 0]))],
  ];
  for (const [name, bytes] of cases) {
    const result = decodeWav(bytes);
    ok(!result.ok, name);
    assertTyped(failure(result));
  }
});

test("malformed and truncated WAV bytes are typed errors, never exceptions", () => {
  assertTyped(failure(decodeWav(new Uint8Array(0))));
  assertTyped(failure(decodeWav(Uint8Array.from(text("RIFF")))));
  assertTyped(failure(decodeWav(Uint8Array.from([...text("RIFX"), ...le32(4), ...text("WAVE")]))));
  assertTyped(failure(decodeWav(riff(chunk("data", [0, 0])))));
  assertTyped(failure(decodeWav(riff(fmtChunk()))));
  assertTyped(failure(decodeWav(riff(chunk("fmt ", new Array<number>(15).fill(0)), chunk("data", [0, 0])))));
  assertTyped(failure(decodeWav(midi(0, 480, [[END]]))));

  // Every cut of an authored PCM file before its first sample frame is an error; a cut inside the
  // sample data is the data length that is present, with a warning.
  const bytes = new Uint8Array(readFileSync(join(audioDir, "files", "pcm16-stereo-8000.wav")));
  const dataStart = bytes.length - 1600;
  for (let cut = 0; cut < dataStart + 4; cut += 1) {
    const result = decodeWav(bytes.subarray(0, cut));
    ok(!result.ok, `cut at ${cut}`);
    assertTyped(failure(result));
  }
  const partial = decodeWav(bytes.subarray(0, dataStart + 40));
  ok(partial.ok);
  if (partial.ok) {
    equal(partial.value.lengthTicks, 1); // 10 frames at 8000 Hz
    equal(partial.warnings.length, 1);
  }
  const whole = decodeWav(bytes);
  ok(whole.ok);
  if (whole.ok) equal(whole.warnings.length, 0);
});

test("a data chunk that declares more than the file holds counts the bytes present", () => {
  const body = [...fmtChunk({ rate: 8000 }), ...text("data"), ...le32(0xffff_ffff), ...new Array<number>(16000).fill(0)];
  const info = unwrap(decodeWav(Uint8Array.from([...text("RIFF"), ...le32(body.length + 4), ...text("WAVE"), ...body])));
  equal(info.lengthTicks, 60); // 8000 frames
});

// ---------------------------------------------------------------------------------------------
// MIDI: lengths, the tempo map and the bank scan.

test("a type 0 file's length is its end-of-track at the default tempo", () => {
  const info = unwrap(decodeMidi(midi(0, 480, [[{ delta: 0, bytes: [0x90, 60, 100] }, endAfter(1920)]])));
  equal(info.lengthTicks, 120);
  deepEqual(info.bank, { kind: "soundfont", dialect: "gm", bankSelect: false });
  equal(info.sampleRateHz, null);
  equal(info.channels, null);
});

test("type 1 tracks merge their tempo events by absolute tick; tempo carries past a shorter track", () => {
  const tempoTrack = [tempo(120, 400000), tempo(240, 1000000), endAfter(120)]; // ends at 480
  const noteTrack = [{ delta: 0, bytes: [0x90, 60, 100] }, endAfter(720)];
  // 120 x 500000 + 240 x 400000 + 360 x 1000000 = 516000000 at division 240: 129.5 floors to 129.
  equal(unwrap(decodeMidi(midi(1, 240, [tempoTrack, noteTrack]))).lengthTicks, 129);
});

test("a tempo event at or after the end of the file changes nothing", () => {
  equal(unwrap(decodeMidi(midi(0, 480, [[endAfter(1920), tempo(0, 1)]]))).lengthTicks, 120);
  // A tempo event exactly on the end tick is past the last segment.
  equal(unwrap(decodeMidi(midi(0, 480, [[tempo(1920, 1), endAfter(0)]]))).lengthTicks, 120);
});

test("two tempo events on one tick: the later event wins", () => {
  const a = [tempo(0, 250000), endAfter(960)];
  const b = [tempo(0, 1000000), endAfter(0)];
  // Track b's event comes later in walk order and wins: 960 ticks at 1000000 is 2 s (120 ticks) at 480 PPQN.
  equal(unwrap(decodeMidi(midi(1, 480, [a, b]))).lengthTicks, 120);
  equal(unwrap(decodeMidi(midi(1, 480, [b, a]))).lengthTicks, 30);
});

test("an empty file is one tick and a file with no end-of-track ends at its last event", () => {
  equal(unwrap(decodeMidi(midi(0, 480, [[END]]))).lengthTicks, 1);
  equal(unwrap(decodeMidi(midi(0, 480, [[]]))).lengthTicks, 1);
  equal(unwrap(decodeMidi(midi(0, 480, [[{ delta: 1920, bytes: [0x90, 60, 100] }]]))).lengthTicks, 120);
  equal(unwrap(decodeMidi(midi(0, 480, []))).lengthTicks, 1);
});

test("running status, meta events, system-exclusive and every channel message are walked", () => {
  const events: MidiEvent[] = [
    { delta: 0, bytes: [0x90, 60, 100] },
    { delta: 10, bytes: [62, 100] }, // running status
    { delta: 10, bytes: [0xc1, 5] },
    { delta: 10, bytes: [0xd1, 5] },
    { delta: 10, bytes: [0xe1, 0, 64] },
    { delta: 10, bytes: [0xa1, 60, 5] },
    { delta: 10, bytes: [0xff, 0x03, 0x04, ...text("name")] },
    { delta: 10, bytes: [0xf7, 0x02, 0x01, 0x02] },
    { delta: 0, bytes: [0xff, 0x51, 0x02, 0x01, 0x02] }, // not a three-byte tempo: ignored
    endAfter(1920 - 70),
  ];
  equal(unwrap(decodeMidi(midi(0, 480, [events]))).lengthTicks, 120);
});

test("the bank scan: gm by default, gs and xg from system-exclusive data, bank select from CC0 and CC32", () => {
  const sysex = (...data: number[]): MidiEvent => ({ delta: 0, bytes: [0xf0, data.length + 1, ...data, 0xf7] });
  const bank = (events: MidiEvent[]): unknown => unwrap(decodeMidi(midi(0, 480, [[...events, endAfter(10)]]))).bank;
  deepEqual(bank([]), { kind: "soundfont", dialect: "gm", bankSelect: false });
  deepEqual(bank([sysex(0x7e, 0x7f, 0x09, 0x01)]), { kind: "soundfont", dialect: "gm", bankSelect: false });
  deepEqual(bank([sysex(0x41, 0x10, 0x42, 0x12)]), { kind: "soundfont", dialect: "gs", bankSelect: false });
  deepEqual(bank([sysex(0x43, 0x10, 0x4c, 0x00)]), { kind: "soundfont", dialect: "xg", bankSelect: false });
  deepEqual(bank([sysex(0x41, 0x10, 0x42, 0x12), sysex(0x43, 0x10, 0x4c, 0x00)]), { kind: "soundfont", dialect: "xg", bankSelect: false });
  deepEqual(bank([cc(0, 1)]), { kind: "soundfont", dialect: "gm", bankSelect: true });
  deepEqual(bank([cc(32, 3)]), { kind: "soundfont", dialect: "gm", bankSelect: true });
  deepEqual(bank([cc(0, 0), cc(32, 0)]), { kind: "soundfont", dialect: "gm", bankSelect: false });
  deepEqual(bank([cc(7, 100)]), { kind: "soundfont", dialect: "gm", bankSelect: false });
  // A three-byte system-exclusive body whose third byte is the terminator, not a model byte.
  deepEqual(bank([sysex(0x43, 0x4c)]), { kind: "soundfont", dialect: "gm", bankSelect: false });
});

test("chunks of another type between tracks are skipped", () => {
  const base = midi(1, 480, [[tempo(0, 500000), endAfter(0)], [endAfter(1920)]]);
  const firstTrackEnd = 14 + track([tempo(0, 500000), endAfter(0)]).length; // MThd and the first track
  const alien = [...text("XFIH"), ...be32(3), 1, 2, 3];
  const bytes = Uint8Array.from([...base.subarray(0, firstTrackEnd + 0), ...alien, ...base.subarray(firstTrackEnd)]);
  equal(unwrap(decodeMidi(bytes)).lengthTicks, 120);
});

test("unsupported MIDI files are typed errors: type 2, SMPTE, zero division, overflow", () => {
  assertTyped(failure(decodeMidi(midi(2, 480, [[END]]))));
  assertTyped(failure(decodeMidi(midi(0, 0xe728, [[END]])))); // -25 fps, 40 ticks per frame
  assertTyped(failure(decodeMidi(midi(0, 0, [[END]]))));
  // 2^24 - 1 microseconds per quarter over ~4.5e8 ticks passes 2^53 / 12.
  assertTyped(failure(decodeMidi(midi(0, 1, [[tempo(0, 0xffffff), endAfter(0x0fffffff), endAfter(0x0fffffff), endAfter(0x0fffffff)]]))));
});

test("malformed and truncated MIDI bytes are typed errors, never exceptions", () => {
  assertTyped(failure(decodeMidi(new Uint8Array(0))));
  assertTyped(failure(decodeMidi(Uint8Array.from(text("MThd")))));
  assertTyped(failure(decodeMidi(Uint8Array.from([...text("MThd"), ...be32(2), 0, 0, 0, 1, 0, 1, 0xe7, 0x28]))));
  assertTyped(failure(decodeMidi(pcmWav(4))));
  // A declared track that is not there.
  assertTyped(failure(decodeMidi(Uint8Array.from([...text("MThd"), ...be32(6), ...be16(0), ...be16(1), ...be16(480)]))));
  // A running-status byte with no status before it.
  assertTyped(failure(decodeMidi(midi(0, 480, [[{ delta: 0, bytes: [0x40, 0x40] }, END]]))));
  // A status that is not valid inside a track.
  assertTyped(failure(decodeMidi(midi(0, 480, [[{ delta: 0, bytes: [0xf8] }, END]]))));
  // A five-byte delta time.
  const fiveByte = Uint8Array.from([...midi(0, 480, [[]]).subarray(0, 14), ...text("MTrk"), ...be32(8), 0x81, 0x80, 0x80, 0x80, 0x00, 0xff, 0x2f, 0x00]);
  assertTyped(failure(decodeMidi(fiveByte)));
  // Cuts inside each event kind, with the chunk length patched so the cut is inside the track.
  for (const bytes of [
    [0x90, 60],
    [0xc0],
    [0xff, 0x51, 0x03, 1],
    [0xff, 0x2f],
    [0xf0, 0x05, 1, 2],
    [0xff],
  ]) {
    assertTyped(failure(decodeMidi(midi(0, 480, [[{ delta: 0, bytes }]]))));
  }
  // A delta time with no event after it.
  assertTyped(failure(decodeMidi(midi(0, 480, [[{ delta: 5, bytes: [] }]]))));

  // Every strict prefix of every authored MIDI file is an error: the header and each chunk length are checked.
  for (const entry of manifest.files.filter((f) => f.kind === "midi")) {
    const bytes = new Uint8Array(readFileSync(join(audioDir, entry.file)));
    for (let cut = 0; cut < bytes.length; cut += 1) {
      const result = decodeMidi(bytes.subarray(0, cut));
      ok(!result.ok, `${entry.file} cut at ${cut}`);
      assertTyped(failure(result));
    }
  }
});

test("random bytes and mutated authored files decode to a value or a typed error, never an exception", () => {
  let seed = 0x2545f491;
  const next = (): number => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return seed;
  };
  const files = manifest.files.map((f) => new Uint8Array(readFileSync(join(audioDir, f.file))));
  let decoded = 0;
  for (let round = 0; round < 3000; round += 1) {
    const source = files[next() % files.length];
    ok(source !== undefined);
    const bytes = Uint8Array.from(source);
    for (let edits = 1 + (next() % 4); edits > 0; edits -= 1) {
      bytes[next() % bytes.length] = next() & 0xff;
    }
    for (const decoder of [WAV_DECODER, MIDI_DECODER]) {
      const result = decoder.decode(bytes, RESOLVER);
      if (result.ok) {
        decoded += 1;
        ok(result.value.lengthTicks === null || (Number.isInteger(result.value.lengthTicks) && result.value.lengthTicks >= 1));
      } else {
        assertTyped(result.error);
      }
    }
  }
  ok(decoded > 0);
  for (let round = 0; round < 500; round += 1) {
    const bytes = new Uint8Array(next() % 96);
    for (let index = 0; index < bytes.length; index += 1) bytes[index] = next() & 0xff;
    equal(typeof decodeWav(bytes).ok, "boolean");
    equal(typeof decodeMidi(bytes).ok, "boolean");
  }
});

// ---------------------------------------------------------------------------------------------
// The fetched corpus against the committed table.

interface CorpusRow {
  path: string;
  kind: "wav" | "midi";
  sha256: string;
  codec?: string;
  lengthTicks: number;
  channels?: number;
  rate?: number;
  dialect?: "gm" | "gs" | "xg";
  bankSelect?: boolean;
}

const table = JSON.parse(readFileSync(join(testDir, "fixtures", "audio-corpus.json"), "utf8")) as { files: CorpusRow[] };
const corpusRoot = join(repoRoot, "fixtures", "legacy");

test("the corpus table lists every committed pin: 171 MIDI and 66 WAV, 3 of them ADPCM", () => {
  equal(table.files.filter((f) => f.kind === "midi").length, 171);
  equal(table.files.filter((f) => f.kind === "wav").length, 66);
  equal(table.files.filter((f) => f.kind === "midi" && f.dialect === "xg").length, 23);
  equal(table.files.filter((f) => f.kind === "midi" && f.dialect === "gs").length, 1);
  equal(table.files.filter((f) => f.kind === "midi" && f.bankSelect === true).length, 29);
  equal(table.files.filter((f) => f.kind === "wav" && f.codec?.endsWith("adpcm")).length, 3);
});

test("every fetched corpus file decodes to its table row, and no other audio file is present", () => {
  if (!existsSync(corpusRoot)) {
    return; // fetched at test time (G5 rule 4); `pnpm test:strict` runs after `pnpm fixtures:fetch`.
  }
  const present = readdirSync(corpusRoot, { recursive: true })
    .filter((name) => /\.(mid|wav)$/i.test(name))
    .sort();
  deepEqual(present, table.files.map((f) => f.path));
  for (const row of table.files) {
    const bytes = new Uint8Array(readFileSync(join(corpusRoot, row.path)));
    const result = decodeFile(bytes);
    const info = unwrap(result);
    equal(info.lengthTicks, row.lengthTicks, `${row.path} length`);
    if (row.kind === "wav") {
      equal(info.format, "audio.wav");
      equal(info.channels, row.channels, `${row.path} channels`);
      equal(info.sampleRateHz, row.rate, `${row.path} rate`);
      equal(info.bank, null);
    } else {
      equal(info.format, "audio.midi");
      deepEqual(info.bank, { kind: "soundfont", dialect: row.dialect, bankSelect: row.bankSelect }, `${row.path} bank`);
    }
  }
});
