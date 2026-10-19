/**
 * The Standard MIDI File decoder: `AssetDecoder<AudioInfo>` for type 0 and
 * type 1 files with a PPQN division
 * (docs/spec/engine/audio-media.md#audio-wav-midi-length rule F4 items 3 and 4,
 * docs/spec/engine/audio-media.md#midi-bank-fallback item 5,
 * docs/spec/engine/audio-media.md#audio-info-seam).
 *
 * The decoder walks every track once, merging their tempo events by absolute
 * tick, to find the length up to the last end-of-track, and scans the same
 * events for the bank the file needs. It plays nothing. A type 2 file, an
 * SMPTE division, and any malformed or truncated file is a `FormatError`.
 *
 * Pure (G2) and deterministic (G3): whole-number arithmetic on the bytes (the
 * sums stay below 2^53, which is checked), no host API, clock or floating
 * point.
 */

import { ok, type Result } from "../result.ts";
import type { AssetDecoder } from "../registry/decoder.ts";
import {
  audioError,
  AUDIO_MIDI_ID,
  AUDIO_SECTION,
  floorDiv,
  type AudioBankDialect,
  type AudioInfo,
} from "./model.ts";

/** The bank kind a MIDI file needs (F5). */
export const MIDI_BANK_KIND = "soundfont";

/** The tempo in force before any tempo event, in microseconds per quarter note (500000 is 120 BPM). */
const DEFAULT_TEMPO = 500000;

/** The length rule's constants: `12 = 2 * 6` and `100000 = 200000 / 2` fold the 60 Hz tick, microseconds and half-up rounding into one division. */
const SCALE = 12;
const HALF_UP = 100000;
const DIVISOR = 200000;

const MAX_SAFE = Number.MAX_SAFE_INTEGER;
/** A variable-length quantity is at most four bytes. */
const MAX_VLQ_BYTES = 4;

const STATUS_META = 0xff;
const STATUS_SYSEX = 0xf0;
const STATUS_SYSEX_ESCAPE = 0xf7;
const META_TEMPO = 0x51;
const META_END_OF_TRACK = 0x2f;
const CC_BANK_SELECT_MSB = 0;
const CC_BANK_SELECT_LSB = 32;
const MANUFACTURER_YAMAHA = 0x43;
const XG_MODEL = 0x4c;
const MANUFACTURER_ROLAND = 0x41;
const GS_MODEL = 0x42;

function ascii(bytes: Uint8Array, at: number, text: string): boolean {
  for (let index = 0; index < text.length; index += 1) {
    if (bytes[at + index] !== text.charCodeAt(index)) return false;
  }
  return true;
}

function be16(bytes: Uint8Array, at: number): number {
  return ((bytes[at] ?? 0) << 8) | (bytes[at + 1] ?? 0);
}

function be32(bytes: Uint8Array, at: number): number {
  return (
    (((bytes[at] ?? 0) << 24) |
      ((bytes[at + 1] ?? 0) << 16) |
      ((bytes[at + 2] ?? 0) << 8) |
      (bytes[at + 3] ?? 0)) >>>
    0
  );
}

/** Whether the header is a Standard MIDI File header chunk. */
export function detectMidi(header: Uint8Array): boolean {
  return header.length >= 4 && ascii(header, 0, "MThd");
}

/**
 * The tick length for the weighted sum `n = sum(deltaTicks * tempo)` at a
 * PPQN `division`: `max(1, floor((12 * n + 100000 * d) / (200000 * d)))`
 * (F4 item 3), or `null` when an intermediate would pass 2^53 - 1.
 */
export function midiLengthTicks(n: number, division: number): number | null {
  const half = HALF_UP * division;
  if (n > floorDiv(MAX_SAFE - half, SCALE)) return null;
  return Math.max(1, floorDiv(SCALE * n + half, DIVISOR * division));
}

/** Where a variable-length quantity read stopped: its value and the next offset, or a failure. */
type Vlq = { value: number; next: number } | { failedAt: number; reason: string };

function readVlq(bytes: Uint8Array, from: number, stop: number): Vlq {
  let value = 0;
  let at = from;
  for (let count = 0; count < MAX_VLQ_BYTES; count += 1) {
    if (at >= stop) return { failedAt: from, reason: "the track ends inside a variable-length number" };
    const byte = bytes[at] ?? 0;
    at += 1;
    value = value * 128 + (byte & 0x7f);
    if ((byte & 0x80) === 0) return { value, next: at };
  }
  return { failedAt: from, reason: "a variable-length number is longer than four bytes" };
}

/** One tempo event, in the order the walk met it. */
type TempoEvent = { tick: number; tempo: number; order: number };

/** Decode a Standard MIDI File to its `AudioInfo`, or a located `FormatError`. */
export function decodeMidi(bytes: Uint8Array): Result<AudioInfo> {
  if (!detectMidi(bytes)) {
    return audioError(0, 'not a Standard MIDI File: the header chunk "MThd" is missing');
  }
  if (bytes.length < 14) {
    return audioError(bytes.length, 'the file ends inside the "MThd" header chunk');
  }
  const headerLength = be32(bytes, 4);
  if (headerLength < 6) {
    return audioError(4, `the "MThd" chunk is ${headerLength} bytes; at least 6 are required`);
  }
  const type = be16(bytes, 8);
  const trackCount = be16(bytes, 10);
  const division = be16(bytes, 12);
  if (type > 1) {
    return audioError(8, `MIDI file type ${type} is not supported; types 0 and 1 are`);
  }
  if ((division & 0x8000) !== 0) {
    return audioError(12, "an SMPTE time division is not supported; a PPQN division is required");
  }
  if (division === 0) {
    return audioError(12, "the time division is 0");
  }

  const tempos: TempoEvent[] = [];
  let end = 0;
  let xg = false;
  let gs = false;
  let bankSelect = false;
  let offset = 8 + headerLength;
  let tracks = 0;

  while (tracks < trackCount) {
    if (offset + 8 > bytes.length) {
      return audioError(offset, `the file ends before track ${tracks + 1} of ${trackCount}`);
    }
    const length = be32(bytes, offset + 4);
    const body = offset + 8;
    const stop = body + length;
    if (stop > bytes.length) {
      return audioError(offset, `the chunk at offset ${offset} declares ${length} bytes but the file holds ${bytes.length - body}`);
    }
    if (!ascii(bytes, offset, "MTrk")) {
      // A chunk of another type is skipped, as the file format requires.
      offset = stop;
      continue;
    }
    tracks += 1;

    let at = body;
    let tick = 0;
    let running = 0;
    let sawEnd = false;
    while (at < stop) {
      const delta = readVlq(bytes, at, stop);
      if ("failedAt" in delta) return audioError(delta.failedAt, delta.reason);
      tick += delta.value;
      at = delta.next;
      if (at >= stop) {
        return audioError(at, "the track ends after a delta time with no event");
      }

      let status = bytes[at] ?? 0;
      if (status < 0x80) {
        if (running === 0) {
          return audioError(at, "a data byte arrives with no running status");
        }
        status = running;
      } else {
        at += 1;
        if (status < STATUS_SYSEX) running = status;
      }

      if (status === STATUS_META) {
        if (at >= stop) return audioError(at, "the track ends inside a meta event");
        const metaType = bytes[at] ?? 0;
        const size = readVlq(bytes, at + 1, stop);
        if ("failedAt" in size) return audioError(size.failedAt, size.reason);
        at = size.next;
        if (at + size.value > stop) {
          return audioError(at, "the track ends inside a meta event");
        }
        if (metaType === META_TEMPO && size.value === 3) {
          const tempo = ((bytes[at] ?? 0) << 16) | ((bytes[at + 1] ?? 0) << 8) | (bytes[at + 2] ?? 0);
          tempos.push({ tick, tempo, order: tempos.length });
        } else if (metaType === META_END_OF_TRACK) {
          sawEnd = true;
          end = Math.max(end, tick);
        }
        at += size.value;
      } else if (status === STATUS_SYSEX || status === STATUS_SYSEX_ESCAPE) {
        const size = readVlq(bytes, at, stop);
        if ("failedAt" in size) return audioError(size.failedAt, size.reason);
        at = size.next;
        if (at + size.value > stop) {
          return audioError(at, "the track ends inside a system-exclusive message");
        }
        if (status === STATUS_SYSEX && size.value >= 3) {
          if (bytes[at] === MANUFACTURER_YAMAHA && bytes[at + 2] === XG_MODEL) xg = true;
          if (bytes[at] === MANUFACTURER_ROLAND && bytes[at + 2] === GS_MODEL) gs = true;
        }
        at += size.value;
      } else if (status >= 0xf1) {
        return audioError(at - 1, `status byte 0x${status.toString(16)} is not valid inside a track`);
      } else {
        const kind = status & 0xf0;
        const dataBytes = kind === 0xc0 || kind === 0xd0 ? 1 : 2;
        if (at + dataBytes > stop) {
          return audioError(at, "the track ends inside a channel event");
        }
        if (kind === 0xb0) {
          const controller = bytes[at] ?? 0;
          if (
            (controller === CC_BANK_SELECT_MSB || controller === CC_BANK_SELECT_LSB) &&
            (bytes[at + 1] ?? 0) !== 0
          ) {
            bankSelect = true;
          }
        }
        at += dataBytes;
      }
    }
    // A track with no end-of-track still ends at its last event.
    if (!sawEnd) end = Math.max(end, tick);
    offset = stop;
  }

  // Tempo events merge across tracks by absolute tick; a later one wins a tie.
  tempos.sort((a, b) => a.tick - b.tick || a.order - b.order);
  let weighted = 0;
  let tempo = DEFAULT_TEMPO;
  let cursor = 0;
  for (const event of tempos) {
    if (event.tick >= end) break;
    weighted += (event.tick - cursor) * tempo;
    if (weighted > MAX_SAFE) return audioError(bytes.length, "the length overflows 2^53 - 1");
    cursor = event.tick;
    tempo = event.tempo;
  }
  weighted += (end - cursor) * tempo;
  if (weighted > MAX_SAFE) return audioError(bytes.length, "the length overflows 2^53 - 1");

  const lengthTicks = midiLengthTicks(weighted, division);
  if (lengthTicks === null) {
    return audioError(bytes.length, "the length overflows 2^53 - 1");
  }

  const dialect: AudioBankDialect = xg ? "xg" : gs ? "gs" : "gm";
  return ok({
    format: AUDIO_MIDI_ID,
    lengthTicks,
    sampleRateHz: null,
    channels: null,
    bank: { kind: MIDI_BANK_KIND, dialect, bankSelect },
  });
}

/** The built-in MIDI decoder (S1): `audio.midi`, answering for `.mid` and `.midi` files. */
export const MIDI_DECODER: AssetDecoder<AudioInfo> = {
  id: AUDIO_MIDI_ID,
  section: AUDIO_SECTION,
  extensions: ["mid", "midi"],
  detect: detectMidi,
  decode: (bytes) => decodeMidi(bytes),
};
