/**
 * `MidiSynth`, the Null backend and the MIDI source.
 *
 * A `MidiSynth` is a MIDI backend behind a port (AD-30): entry 6.12 adds the
 * SoundFont one; `NullMidiSynth` is the headless reference that keeps exact time
 * and renders silence of the right length.
 */
import { err } from "@tk-reawakened/core";
import type { Result } from "@tk-reawakened/core";
import { SilentVoice } from "./silent-voice.ts";
import { opened } from "./source.ts";
import type { AudioSource, SourceEnv, SourceError, SourceVoice } from "./source.ts";

/** A MIDI backend. `open` never throws. */
export interface MidiSynth {
  /** The backend id; `"null"` for headless runs. */
  readonly id: string;
  open(bytes: Uint8Array, env: SourceEnv): Result<SourceVoice, SourceError>;
}

function malformed(detail: string): Result<number, SourceError> {
  return err<number, SourceError>({ code: "format.malformed", detail });
}

const u16 = (b: Uint8Array, o: number): number => ((b[o] ?? 0) << 8) | (b[o + 1] ?? 0);
const u32 = (b: Uint8Array, o: number): number =>
  ((b[o] ?? 0) * 0x1000000) + (((b[o + 1] ?? 0) << 16) | ((b[o + 2] ?? 0) << 8) | (b[o + 3] ?? 0));
const tag = (b: Uint8Array, o: number): string =>
  String.fromCharCode(b[o] ?? 0, b[o + 1] ?? 0, b[o + 2] ?? 0, b[o + 3] ?? 0);

interface TempoEvent {
  readonly at: number;
  readonly microsPerQuarter: number;
}

/**
 * The length of a Standard MIDI File in 60 Hz ticks, rounded half up, following
 * the tempo map (default 120 BPM). SMPTE time division is `format.unsupported`.
 */
export function midiLengthTicks(bytes: Uint8Array): Result<number, SourceError> {
  if (bytes.length < 14 || tag(bytes, 0) !== "MThd") return malformed("missing MThd header");
  const headerLength = u32(bytes, 4);
  if (headerLength < 6) return malformed("MThd shorter than 6 bytes");
  const trackCount = u16(bytes, 10);
  const division = u16(bytes, 12);
  if ((division & 0x8000) !== 0) {
    return err<number, SourceError>({
      code: "format.unsupported",
      detail: "SMPTE time division is not supported",
    });
  }
  if (division === 0) return malformed("time division is zero");

  const tempos: TempoEvent[] = [];
  let endTick = 0;
  let pos = 8 + headerLength;
  let tracksSeen = 0;
  while (tracksSeen < trackCount) {
    if (pos + 8 > bytes.length) return malformed("file ends before all tracks");
    const size = u32(bytes, pos + 4);
    const start = pos + 8;
    const end = start + size;
    if (end > bytes.length) return malformed("track chunk runs past the end of the file");
    pos = end;
    if (tag(bytes, start - 8) !== "MTrk") continue;
    tracksSeen += 1;

    let p = start;
    let abs = 0;
    let running = 0;
    const readVlq = (): number => {
      let value = 0;
      for (let i = 0; i < 4; i++) {
        if (p >= end) return -1;
        const byte = bytes[p++] ?? 0;
        value = value * 128 + (byte & 0x7f);
        if ((byte & 0x80) === 0) return value;
      }
      return -1;
    };
    while (p < end) {
      const delta = readVlq();
      if (delta < 0) return malformed("bad variable-length delta time");
      abs += delta;
      let status = bytes[p] ?? 0;
      if (status < 0x80) {
        if (running === 0) return malformed("data byte with no running status");
        status = running;
      } else {
        p += 1;
      }
      if (status === 0xff) {
        running = 0;
        const type = bytes[p++] ?? 0;
        const length = readVlq();
        if (length < 0 || p + length > end) return malformed("meta event runs past its track");
        if (type === 0x51 && length === 3) {
          tempos.push({
            at: abs,
            microsPerQuarter: ((bytes[p] ?? 0) << 16) | ((bytes[p + 1] ?? 0) << 8) | (bytes[p + 2] ?? 0),
          });
        }
        p += length;
      } else if (status === 0xf0 || status === 0xf7) {
        running = 0;
        const length = readVlq();
        if (length < 0 || p + length > end) return malformed("sysex runs past its track");
        p += length;
      } else {
        running = status;
        p += (status & 0xf0) === 0xc0 || (status & 0xf0) === 0xd0 ? 1 : 2;
        if (p > end) return malformed("channel event runs past its track");
      }
    }
    if (abs > endTick) endTick = abs;
  }

  tempos.sort((a, b) => a.at - b.at);
  let micros = 500000;
  let previous = 0;
  let weighted = 0n;
  for (const tempo of tempos) {
    if (tempo.at > endTick) break;
    weighted += BigInt(tempo.at - previous) * BigInt(micros);
    previous = tempo.at;
    micros = tempo.microsPerQuarter;
  }
  weighted += BigInt(endTick - previous) * BigInt(micros);
  // ticks = round_half_up(weighted / division * 60 / 1e6)
  const denominator = 2n * BigInt(division) * 1_000_000n;
  return opened(Number((2n * weighted * 60n + BigInt(division) * 1_000_000n) / denominator));
}

/** The headless backend: silence of exactly the file's length, with exact timing. */
export class NullMidiSynth implements MidiSynth {
  readonly id = "null";

  open(bytes: Uint8Array, env: SourceEnv): Result<SourceVoice, SourceError> {
    const length = midiLengthTicks(bytes);
    if (!length.ok) return err<SourceVoice, SourceError>(length.error);
    return opened<SourceVoice>(new SilentVoice(length.value, env.outputRateHz));
  }
}

/** The `audio.midi` source: needs a SoundFont bank and renders through `synth`. */
export function createMidiSource(synth: MidiSynth): AudioSource {
  return {
    id: "audio.midi",
    extensions: ["mid", "midi", "kar"],
    detect: (header) => header.length >= 4 && tag(header, 0) === "MThd",
    bank: "soundfont",
    open: (bytes, env) => synth.open(bytes, env),
  };
}
