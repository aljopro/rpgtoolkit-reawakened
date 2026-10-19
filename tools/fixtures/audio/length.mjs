// Independent length readers for the audio oracle (ticket 6.4). Imports nothing from packages/core.
//
// These implement docs/spec/engine/audio-media.md#audio-wav-midi-length (rule F4) a second time,
// from the written rule alone, in whole-number arithmetic. They exist so that:
//   * the authored WAV and MIDI files can be proved to parse to their hand-worked lengths
//     (`checkAudioFiles` in index.mjs), and
//   * the pinned corpus files can be re-measured when the corpus has been fetched.
// They are not the core decoders (entry 6.5): a core decoder must agree with them, not share them.
//
//   wavInfo(bytes)  -> { ok: true, codec, channels, rate, frames, lengthTicks } | { ok: false, error }
//   midiInfo(bytes) -> { ok: true, type, division, lengthTicks, dialect, bankSelect } | { ok: false, error }

const u16 = (b, o) => b[o] | (b[o + 1] << 8);
const u32 = (b, o) => (b[o] | (b[o + 1] << 8) | (b[o + 2] << 16) | (b[o + 3] << 24)) >>> 0;
const tag = (b, o) => String.fromCharCode(b[o], b[o + 1], b[o + 2], b[o + 3]);

/** `max(1, floor(seconds * 60 + 1/2))` for `frames` frames at `rate` Hz, exactly (rule F4 item 2). */
export function wavTicks(frames, rate) {
  return Math.max(1, Math.floor((120 * frames + rate) / (2 * rate)));
}

const MAX_RATE = 192000;

export function wavInfo(bytes) {
  if (bytes.length < 12 || tag(bytes, 0) !== "RIFF" || tag(bytes, 8) !== "WAVE") return { ok: false, error: "not a RIFF WAVE file" };
  let fmt = null;
  let fact = null;
  let dataBytes = null;
  let offset = 12;
  while (offset + 8 <= bytes.length) {
    const id = tag(bytes, offset);
    const size = u32(bytes, offset + 4);
    const body = offset + 8;
    if (id === "fmt ") {
      if (size < 16 || body + size > bytes.length) return { ok: false, error: "truncated fmt chunk" };
      fmt = { tag: u16(bytes, body), channels: u16(bytes, body + 2), rate: u32(bytes, body + 4), blockAlign: u16(bytes, body + 12), bits: u16(bytes, body + 14), body, size };
      if (size >= 20) fmt.samplesPerBlock = u16(bytes, body + 18);
    } else if (id === "fact") {
      if (size >= 4) fact = u32(bytes, body);
    } else if (id === "data") {
      dataBytes = Math.min(size, bytes.length - body);
    }
    offset = body + size + (size & 1);
  }
  if (fmt === null) return { ok: false, error: "no fmt chunk" };
  if (dataBytes === null) return { ok: false, error: "no data chunk" };
  if (fmt.channels < 1 || fmt.channels > 2) return { ok: false, error: "channel count not supported" };
  if (fmt.rate === 0 || fmt.rate > MAX_RATE) return { ok: false, error: "sample rate out of range" };
  let codec;
  let frames;
  if (fmt.tag === 1 && (fmt.bits === 8 || fmt.bits === 16)) {
    codec = `pcm${fmt.bits}`;
    frames = Math.floor(dataBytes / fmt.blockAlign);
  } else if (fmt.tag === 2 || fmt.tag === 0x11) {
    codec = fmt.tag === 2 ? "ms-adpcm" : "ima-adpcm";
    const perBlock = fmt.samplesPerBlock ?? 0;
    frames = fact !== null ? fact : Math.floor(dataBytes / fmt.blockAlign) * perBlock;
  } else {
    return { ok: false, error: `codec ${fmt.tag} not supported` };
  }
  if (frames === 0) return { ok: false, error: "no frames" };
  return { ok: true, codec, channels: fmt.channels, rate: fmt.rate, frames, lengthTicks: wavTicks(frames, fmt.rate) };
}

/** The tick length of a MIDI file from the sum N of delta ticks times tempo (rule F4 item 3). */
export function midiTicks(n, division) {
  const d = BigInt(division);
  const value = (12n * n + 100000n * d) / (200000n * d);
  return value < 1n ? 1 : Number(value);
}

export function midiInfo(bytes) {
  if (bytes.length < 14 || tag(bytes, 0) !== "MThd") return { ok: false, error: "no MThd header" };
  const be16 = (o) => (bytes[o] << 8) | bytes[o + 1];
  const be32 = (o) => ((bytes[o] << 24) | (bytes[o + 1] << 16) | (bytes[o + 2] << 8) | bytes[o + 3]) >>> 0;
  const headerLength = be32(4);
  if (headerLength < 6) return { ok: false, error: "short MThd" };
  const type = be16(8);
  const trackCount = be16(10);
  const division = be16(12);
  if ((division & 0x8000) !== 0) return { ok: false, error: "SMPTE division is not supported" };
  if (division === 0) return { ok: false, error: "zero division" };
  if (type > 1) return { ok: false, error: "format 2 is not supported" };
  let offset = 8 + headerLength;
  const tempos = []; // [absoluteTick, microsPerQuarter]
  let end = 0;
  let xg = false;
  let gs = false;
  let bankSelect = false;
  for (let track = 0; track < trackCount; track += 1) {
    if (offset + 8 > bytes.length || tag(bytes, offset) !== "MTrk") return { ok: false, error: "missing MTrk" };
    const length = be32(offset + 4);
    let at = offset + 8;
    const stop = at + length;
    if (stop > bytes.length) return { ok: false, error: "truncated track" };
    let tick = 0;
    let running = 0;
    let sawEnd = false;
    while (at < stop) {
      let delta = 0;
      for (;;) {
        if (at >= stop) return { ok: false, error: "truncated delta time" };
        const byte = bytes[at];
        at += 1;
        delta = delta * 128 + (byte & 0x7f);
        if ((byte & 0x80) === 0) break;
      }
      tick += delta;
      let status = bytes[at];
      if (status < 0x80) {
        if (running === 0) return { ok: false, error: "data byte without running status" };
        status = running;
      } else {
        at += 1;
        if (status < 0xf0) running = status;
      }
      if (status === 0xff) {
        const type8 = bytes[at];
        let len = 0;
        at += 1;
        for (;;) {
          const byte = bytes[at];
          at += 1;
          len = len * 128 + (byte & 0x7f);
          if ((byte & 0x80) === 0) break;
        }
        if (at + len > stop) return { ok: false, error: "truncated meta event" };
        if (type8 === 0x51 && len === 3) tempos.push([tick, (bytes[at] << 16) | (bytes[at + 1] << 8) | bytes[at + 2]]);
        if (type8 === 0x2f) { sawEnd = true; end = Math.max(end, tick); }
        at += len;
      } else if (status === 0xf0 || status === 0xf7) {
        let len = 0;
        for (;;) {
          const byte = bytes[at];
          at += 1;
          len = len * 128 + (byte & 0x7f);
          if ((byte & 0x80) === 0) break;
        }
        if (at + len > stop) return { ok: false, error: "truncated sysex" };
        if (status === 0xf0 && len >= 3) {
          if (bytes[at] === 0x43 && bytes[at + 2] === 0x4c) xg = true;
          if (bytes[at] === 0x41 && bytes[at + 2] === 0x42) gs = true;
        }
        at += len;
      } else {
        const kind = status & 0xf0;
        const data = kind === 0xc0 || kind === 0xd0 ? 1 : 2;
        if (at + data > stop) return { ok: false, error: "truncated channel event" };
        if (kind === 0xb0 && (bytes[at] === 0 || bytes[at] === 32) && bytes[at + 1] !== 0) bankSelect = true;
        at += data;
      }
    }
    if (!sawEnd) end = Math.max(end, tick);
    offset = stop;
  }
  // Tempo events merge across tracks by absolute tick; a later track's event wins a tie.
  const ordered = tempos.map((entry, index) => ({ tick: entry[0], tempo: entry[1], index })).sort((a, b) => a.tick - b.tick || a.index - b.index);
  let n = 0n;
  let tempo = 500000;
  let cursor = 0;
  for (const event of ordered) {
    if (event.tick >= end) break;
    n += BigInt(event.tick - cursor) * BigInt(tempo);
    cursor = event.tick;
    tempo = event.tempo;
  }
  n += BigInt(end - cursor) * BigInt(tempo);
  if (n > BigInt(Number.MAX_SAFE_INTEGER)) return { ok: false, error: "length overflows 2^53 - 1" };
  return { ok: true, type, division, lengthTicks: midiTicks(n, division), dialect: xg ? "xg" : gs ? "gs" : "gm", bankSelect };
}
