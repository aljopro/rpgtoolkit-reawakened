import { test } from "node:test";
import { deepEqual, equal, throws } from "node:assert/strict";
import { assetKey } from "@tk-reawakened/core";
import {
  NullMidiSynth,
  SilentVoice,
  VoiceMachine,
  createAudioSourceRegistry,
  createMidiSource,
  createNullAudioRegistry,
  createNullPcmSource,
  midiLengthTicks,
  ticksToFrames,
} from "../src/index.ts";
import type { AudioEvent, AudioSource, BankRef } from "../src/index.ts";

const RATE = 6000; // 100 frames per tick keeps arithmetic obvious

const ascii = (s: string): number[] => [...s].map((c) => c.charCodeAt(0));
const be32 = (n: number): number[] => [(n >>> 24) & 255, (n >>> 16) & 255, (n >>> 8) & 255, n & 255];
const le32 = (n: number): number[] => [n & 255, (n >>> 8) & 255, (n >>> 16) & 255, (n >>> 24) & 255];
const le16 = (n: number): number[] => [n & 255, (n >>> 8) & 255];

/** One-track SMF, 480 ppq; events are (delta, tempo?) pairs ending in end-of-track. */
function midi(events: { delta: number; tempo?: number }[], endDelta: number): Uint8Array {
  const vlq = (n: number): number[] => {
    const out = [n & 0x7f];
    for (n >>= 7; n > 0; n >>= 7) out.unshift((n & 0x7f) | 0x80);
    return out;
  };
  const track: number[] = [];
  for (const e of events) {
    track.push(...vlq(e.delta), 0xff, 0x51, 3, (e.tempo! >> 16) & 255, (e.tempo! >> 8) & 255, e.tempo! & 255);
  }
  track.push(...vlq(endDelta), 0xff, 0x2f, 0);
  return Uint8Array.from([...ascii("MThd"), ...be32(6), 0, 0, 0, 1, 0x01, 0xe0, ...ascii("MTrk"), ...be32(track.length), ...track]);
}

/** 8-bit mono PCM WAV of `samples` bytes at `rate` Hz. */
function wav(samples: number, rate: number): Uint8Array {
  const fmt = [...le16(1), ...le16(1), ...le32(rate), ...le32(rate), ...le16(1), ...le16(8)];
  const body = [...ascii("WAVE"), ...ascii("fmt "), ...le32(16), ...fmt, ...ascii("data"), ...le32(samples), ...new Array<number>(samples).fill(128)];
  return Uint8Array.from([...ascii("RIFF"), ...le32(body.length), ...body]);
}

function good<T, E>(r: { ok: true; value: T } | { ok: false; error: E }): T {
  if (!r.ok) throw new Error("expected ok");
  return r.value;
}
function bad<T, E>(r: { ok: true; value: T } | { ok: false; error: E }): E {
  if (r.ok) throw new Error("expected error");
  return r.error;
}

const BANK: BankRef = { source: "bundled", id: "test", sha256: null };
const SECOND_OF_MIDI = midi([], 960); // 960 ticks at 480 ppq, 120 bpm = 1 s = 60 ticks

function machine(): VoiceMachine {
  const m = new VoiceMachine(createNullAudioRegistry(), { outputRateHz: RATE });
  m.handle({ kind: "setBank", bankKind: "soundfont", bank: BANK });
  return m;
}
const load = (m: VoiceMachine, voice: number, data: Uint8Array, asset = "a.mid"): AudioEvent[] =>
  m.handle({ kind: "load", voice, track: "music", asset: assetKey(asset), data });
const play = (m: VoiceMachine, voice: number, loop = false, positionTicks = 0): AudioEvent[] =>
  m.handle({ kind: "play", voice, cue: voice, loop, volume: 100, positionTicks });

test("ticks convert to frames rounding half up", () => {
  equal(ticksToFrames(1, 6000), 100);
  equal(ticksToFrames(1, 44100), 735);
  equal(ticksToFrames(1, 30), 1); // 0.5 rounds up
  equal(ticksToFrames(0, 44100), 0);
});

test("midiLengthTicks follows the tempo map and rounds half up", () => {
  equal(good(midiLengthTicks(SECOND_OF_MIDI)), 60);
  equal(good(midiLengthTicks(midi([{ delta: 0, tempo: 1_000_000 }], 960))), 120);
  equal(good(midiLengthTicks(midi([{ delta: 480, tempo: 1_000_000 }], 480))), 90); // 0.5 s + 1 s
});

test("midiLengthTicks reports malformed and SMPTE files without throwing", () => {
  equal(bad(midiLengthTicks(Uint8Array.of(1, 2, 3))).code, "format.malformed");
  const smpte = Uint8Array.from(SECOND_OF_MIDI);
  smpte[12] = 0xe7;
  equal(bad(midiLengthTicks(smpte)).code, "format.unsupported");
  const truncated = SECOND_OF_MIDI.subarray(0, SECOND_OF_MIDI.length - 3);
  equal(bad(midiLengthTicks(truncated)).code, "format.malformed");
});

test("NullMidiSynth renders deterministic silence of the file's length", () => {
  const synth = new NullMidiSynth();
  equal(synth.id, "null");
  const voice = good(synth.open(SECOND_OF_MIDI, { outputRateHz: RATE, bank: BANK }));
  equal(voice.lengthTicks, 60);
  voice.start(0, false);
  const left = new Float32Array(RATE).fill(1);
  const right = new Float32Array(RATE).fill(1);
  voice.render(left, right, RATE - 1);
  equal(left.subarray(0, RATE - 1).every((s) => s === 0), true);
  equal(right.subarray(0, RATE - 1).every((s) => s === 0), true);
  equal(voice.ended, false);
  voice.render(left, right, 1);
  equal(voice.ended, true); // exactly 60 ticks = RATE frames
});

test("SilentVoice loops, seeks, pauses and fades on exact time", () => {
  const v = new SilentVoice(10, RATE); // 1000 frames
  const l = new Float32Array(1500);
  const r = new Float32Array(1500);
  v.start(0, true);
  v.render(l, r, 1500);
  equal(v.positionFrames, 500);
  equal(v.ended, false);
  v.setLoop(false);
  v.render(l, r, 1500);
  equal(v.ended, true);
  v.seek(5);
  equal(v.ended, false);
  v.pause();
  v.render(l, r, 100);
  equal(v.positionFrames, 500);
  v.resume();
  v.fade(100, 0, 10); // 1000 frames
  v.render(l, r, 250);
  equal(v.volume, 75);
  v.pause();
  v.render(l, r, 250);
  equal(v.volume, 75); // a fade freezes with the voice
});

test("the PCM source reads a WAV length; ADPCM is unsupported, not a throw", () => {
  const source = createNullPcmSource();
  equal(good(source.open(wav(8000, 8000), { outputRateHz: RATE, bank: null })).lengthTicks, 60);
  const adpcm = wav(16, 8000);
  adpcm[20] = 2;
  equal(bad(source.open(adpcm, { outputRateHz: RATE, bank: null })).code, "format.unsupported");
});

test("the registry dispatches by detect, then extension, in registration order", () => {
  const registry = createNullAudioRegistry();
  deepEqual(registry.sources.map((s) => s.id), ["audio.midi", "audio.wav"]);
  equal(registry.find(SECOND_OF_MIDI)?.id, "audio.midi");
  equal(registry.find(wav(8, 8000))?.id, "audio.wav");
  equal(registry.find(Uint8Array.of(9, 9, 9, 9)), null);
  throws(() => registry.register(createNullPcmSource()), /already registered/);

  const greedy = (id: string, extensions: string[]): AudioSource => ({
    id,
    extensions,
    detect: () => true,
    bank: null,
    open: (_b, env) => ({ ok: true, value: new SilentVoice(1, env.outputRateHz), warnings: [] }),
  });
  const ties = createAudioSourceRegistry([greedy("first", ["aaa"]), greedy("second", ["bbb"])]);
  equal(ties.find(Uint8Array.of(1), "bbb")?.id, "second");
  equal(ties.find(Uint8Array.of(1), "zzz")?.id, "first");
  equal(ties.find(Uint8Array.of(1), "BBB")?.id, "second");
});

test("an unknown format gives a diagnostic and silence, never a throw", () => {
  const m = machine();
  const events = load(m, 1, Uint8Array.of(0, 1, 2, 3), "junk.xyz");
  equal(events.length, 1);
  equal(events[0]?.kind, "error");
  if (events[0]?.kind !== "error") throw new Error("expected error");
  equal(events[0].code, "format.unsupported");
  equal(events[0].voice, 1);
  equal(m.stateOf(1), "failed");
  deepEqual(play(m, 1), []); // terminal voice ignores messages
  const l = new Float32Array(64).fill(1);
  const r = new Float32Array(64).fill(1);
  deepEqual(m.render(l, r, 64), []);
  equal(l.every((s) => s === 0) && r.every((s) => s === 0), true);
});

test("a MIDI voice without a bank fails with bank.missing; WAV is unaffected", () => {
  const m = new VoiceMachine(createNullAudioRegistry(), { outputRateHz: RATE });
  const e = load(m, 1, SECOND_OF_MIDI);
  if (e[0]?.kind !== "error") throw new Error("expected error");
  equal(e[0].code, "bank.missing");
  const w = load(m, 2, wav(8000, 8000), "a.wav");
  deepEqual(w, [{ kind: "ready", voice: 2, lengthTicks: 60 }]);
});

test("the voice machine follows the ruled transitions and events", () => {
  const m = machine();
  equal(m.stateOf(1), undefined);
  deepEqual(load(m, 1, SECOND_OF_MIDI), [{ kind: "ready", voice: 1, lengthTicks: 60 }]);
  equal(m.stateOf(1), "ready");
  // pause before play is illegal
  const rejected = m.handle({ kind: "pause", voice: 1 });
  if (rejected[0]?.kind !== "error") throw new Error("expected error");
  equal(rejected[0].code, "protocol.state");
  equal(m.stateOf(1), "ready");
  deepEqual(play(m, 1), []);
  equal(m.stateOf(1), "playing");
  const again = play(m, 1);
  equal(again[0]?.kind, "error");
  m.handle({ kind: "pause", voice: 1 });
  equal(m.stateOf(1), "paused");
  m.handle({ kind: "resume", voice: 1 });
  equal(m.stateOf(1), "playing");
  const l = new Float32Array(RATE);
  const r = new Float32Array(RATE);
  deepEqual(m.render(l, r, RATE - 100), []);
  deepEqual(m.render(l, r, 100), [{ kind: "ended", voice: 1, cue: 1 }]);
  equal(m.stateOf(1), "ended");
  // a stale stop after the natural end is normal and silent
  deepEqual(m.handle({ kind: "stop", voice: 1 }), []);
  equal(m.stateOf(1), "ended");
  deepEqual(m.render(l, r, 10), []); // exactly one ended
});

test("looping voices never end; stop emits nothing; ids are never reused", () => {
  const m = machine();
  load(m, 1, SECOND_OF_MIDI);
  play(m, 1, true);
  const l = new Float32Array(RATE);
  const r = new Float32Array(RATE);
  deepEqual(m.render(l, r, RATE), []);
  deepEqual(m.render(l, r, RATE), []);
  m.handle({ kind: "setLoop", voice: 1, loop: false });
  deepEqual(m.render(l, r, RATE), [{ kind: "ended", voice: 1, cue: 1 }]);
  load(m, 2, SECOND_OF_MIDI);
  deepEqual(m.handle({ kind: "stop", voice: 2 }), []);
  equal(m.stateOf(2), "stopped");
  const reuse = load(m, 2, SECOND_OF_MIDI);
  equal(reuse[0]?.kind, "error");
  equal(m.stateOf(2), "stopped");
});

test("seeking a finite voice to its end ends it; play past the end ends it", () => {
  const m = machine();
  load(m, 1, SECOND_OF_MIDI);
  play(m, 1);
  deepEqual(m.handle({ kind: "seek", voice: 1, positionTicks: 60 }), [{ kind: "ended", voice: 1, cue: 1 }]);
  load(m, 2, SECOND_OF_MIDI);
  m.handle({ kind: "stop", voice: 3 }); // unknown id is ignored
  deepEqual(m.handle({ kind: "seek", voice: 2, positionTicks: 5 }).map((e) => e.kind), ["error"]);
});

test("bank messages: setBank is valid any time; an unknown bank kind is a diagnostic", () => {
  const m = new VoiceMachine(createNullAudioRegistry(), { outputRateHz: RATE });
  deepEqual(m.handle({ kind: "setBank", bankKind: "soundfont", bank: BANK }), []);
  equal(m.bankOf("soundfont"), BANK);
  deepEqual(m.handle({ kind: "setBank", bankKind: "soundfont", bank: null }), []);
  equal(m.bankOf("soundfont"), null);
  const e = m.handle({ kind: "setBank", bankKind: "tracker", bank: BANK });
  equal(e[0]?.kind, "error");
});

test("bus and master volume messages reach the mixer; a master fade is a diagnostic", () => {
  const calls: string[] = [];
  const m = new VoiceMachine(createNullAudioRegistry(), {
    outputRateHz: RATE,
    mixer: {
      setVolume: (bus, v) => calls.push(`set ${bus} ${v}`),
      fade: (bus, a, b, d) => calls.push(`fade ${bus} ${a} ${b} ${d}`),
    },
  });
  m.handle({ kind: "setVolume", scope: "master", voice: null, bus: null, volume: 50 });
  m.handle({ kind: "setVolume", scope: "bus", voice: null, bus: "music", volume: 40 });
  m.handle({ kind: "fade", scope: "bus", voice: null, bus: "music", fromVolume: 40, targetVolume: 0, durationTicks: 30 });
  deepEqual(calls, ["set null 50", "set music 40", "fade music 40 0 30"]);
  const e = m.handle({ kind: "fade", scope: "master", voice: null, bus: null, fromVolume: 1, targetVolume: 0, durationTicks: 1 });
  equal(e[0]?.kind, "error");
});

test("a custom test source registers and plays with no change elsewhere", () => {
  let opened = 0;
  const custom: AudioSource = {
    id: "test.tone",
    extensions: ["tone"],
    detect: (h) => h[0] === 0x54 && h[1] === 0x4e,
    bank: null,
    open(bytes, env) {
      opened += 1;
      return { ok: true, value: new SilentVoice(bytes[2] ?? 0, env.outputRateHz), warnings: [] };
    },
  };
  const registry = createNullAudioRegistry();
  registry.register(custom);
  const m = new VoiceMachine(registry, { outputRateHz: RATE });
  deepEqual(m.handle({ kind: "load", voice: 7, track: "sfx", asset: assetKey("x.tone"), data: Uint8Array.of(0x54, 0x4e, 30) }), [
    { kind: "ready", voice: 7, lengthTicks: 30 },
  ]);
  equal(opened, 1);
});

test("a source that throws becomes source.failed", () => {
  const boom: AudioSource = {
    id: "test.boom",
    extensions: [],
    detect: () => true,
    bank: null,
    open() {
      throw new Error("bad");
    },
  };
  const m = new VoiceMachine(createAudioSourceRegistry([boom]), { outputRateHz: RATE });
  const e = m.handle({ kind: "load", voice: 1, track: "t", asset: assetKey("a.b"), data: Uint8Array.of(1) });
  if (e[0]?.kind !== "error") throw new Error("expected error");
  equal(e[0].code, "source.failed");
  equal(m.stateOf(1), "failed");
});

test("createMidiSource reports its bank kind and detects only MThd", () => {
  const source = createMidiSource(new NullMidiSynth());
  equal(source.bank, "soundfont");
  equal(source.detect(SECOND_OF_MIDI), true);
  equal(!source.detect(wav(8, 8000)), true);
});
