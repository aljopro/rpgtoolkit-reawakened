/**
 * The WAV decoder: `AssetDecoder<AudioInfo>` for RIFF/WAVE files
 * (docs/spec/engine/audio-media.md#audio-wav-midi-length rule F4 items 1 and 2,
 * docs/spec/engine/audio-media.md#audio-info-seam).
 *
 * Supported: PCM 8-bit, PCM 16-bit, MS-ADPCM and IMA-ADPCM, one or two
 * channels. Anything else is a `FormatError` and the caller plays silence with
 * an unknown length. The decoder reads the chunk headers and counts sample
 * frames; it never decodes a sample (that is the runner's PCM source).
 *
 * Pure (G2) and deterministic (G3): whole-number arithmetic on the bytes, no
 * host API, clock or floating point.
 */

import { ok, type Result } from "../result.ts";
import type { AssetDecoder } from "../registry/decoder.ts";
import {
  audioError,
  AUDIO_SECTION,
  AUDIO_WAV_ID,
  floorDiv,
  type AudioInfo,
} from "./model.ts";

const TAG_PCM = 0x0001;
const TAG_MS_ADPCM = 0x0002;
const TAG_IMA_ADPCM = 0x0011;

/** The largest sample rate rule F4 accepts. */
export const WAV_MAX_RATE_HZ = 192000;

/** The 60 Hz tick rate, doubled so the half-up rounding stays in whole numbers (`120 = 2 * 60`). */
const TWICE_TICKS_PER_SECOND = 120;

/** The fixed part of a `fmt ` chunk: tag, channels, rate, byte rate, block align, bits. */
const FMT_MIN_SIZE = 16;
/** The size at which the `fmt ` chunk carries `cbSize` and the ADPCM samples-per-block word. */
const FMT_ADPCM_MIN_SIZE = 20;

function ascii(bytes: Uint8Array, at: number, text: string): boolean {
  for (let index = 0; index < text.length; index += 1) {
    if (bytes[at + index] !== text.charCodeAt(index)) return false;
  }
  return true;
}

function u16(bytes: Uint8Array, at: number): number {
  return (bytes[at] ?? 0) | ((bytes[at + 1] ?? 0) << 8);
}

function u32(bytes: Uint8Array, at: number): number {
  return (
    ((bytes[at] ?? 0) |
      ((bytes[at + 1] ?? 0) << 8) |
      ((bytes[at + 2] ?? 0) << 16) |
      ((bytes[at + 3] ?? 0) << 24)) >>>
    0
  );
}

/**
 * The length of `frames` sample frames at `rate` Hz in ticks:
 * `max(1, floor((120 * frames + rate) / (2 * rate)))`, the 6.1 rule
 * `max(1, floor(seconds * 60 + 0.5))` evaluated exactly (F4 item 2).
 */
export function wavLengthTicks(frames: number, rate: number): number {
  return Math.max(
    1,
    floorDiv(TWICE_TICKS_PER_SECOND * frames + rate, 2 * rate),
  );
}

/** Whether the header is a RIFF container holding a WAVE form. */
export function detectWav(header: Uint8Array): boolean {
  return header.length >= 12 && ascii(header, 0, "RIFF") && ascii(header, 8, "WAVE");
}

/** What the chunk walk found. */
type Chunks = {
  fmtAt: number;
  fmtSize: number;
  fact: number | null;
  dataAt: number;
  dataBytes: number;
  dataDeclared: number;
};

/** Decode a WAV file to its `AudioInfo`, or a located `FormatError`. */
export function decodeWav(bytes: Uint8Array): Result<AudioInfo> {
  if (!detectWav(bytes)) {
    return audioError(0, 'not a WAV file: expected a "RIFF" container with a "WAVE" form');
  }

  const warnings: string[] = [];
  const found: Partial<Chunks> = {};
  let offset = 12;
  while (offset + 8 <= bytes.length) {
    const size = u32(bytes, offset + 4);
    const body = offset + 8;
    if (ascii(bytes, offset, "fmt ")) {
      if (found.fmtAt === undefined) {
        if (size < FMT_MIN_SIZE) {
          return audioError(offset, `the "fmt " chunk is ${size} bytes; at least ${FMT_MIN_SIZE} are required`);
        }
        if (body + size > bytes.length) {
          return audioError(offset, 'the file ends inside the "fmt " chunk');
        }
        found.fmtAt = body;
        found.fmtSize = size;
      }
    } else if (ascii(bytes, offset, "fact")) {
      if (found.fact === undefined && size >= 4 && body + 4 <= bytes.length) {
        found.fact = u32(bytes, body);
      }
    } else if (ascii(bytes, offset, "data")) {
      if (found.dataAt === undefined) {
        found.dataAt = body;
        found.dataDeclared = size;
        found.dataBytes = Math.min(size, bytes.length - body);
      }
    }
    offset = body + size + (size & 1);
  }

  if (found.fmtAt === undefined || found.fmtSize === undefined) {
    return audioError(bytes.length, 'the file has no "fmt " chunk');
  }
  if (found.dataAt === undefined || found.dataBytes === undefined || found.dataDeclared === undefined) {
    return audioError(bytes.length, 'the file has no "data" chunk');
  }

  const at = found.fmtAt;
  const tag = u16(bytes, at);
  const channels = u16(bytes, at + 2);
  const rate = u32(bytes, at + 4);
  const blockAlign = u16(bytes, at + 12);
  const bits = u16(bytes, at + 14);

  if (channels < 1 || channels > 2) {
    return audioError(at + 2, `${channels} channels are not supported; a WAV needs 1 or 2`);
  }
  if (rate === 0 || rate > WAV_MAX_RATE_HZ) {
    return audioError(at + 4, `sample rate ${rate} Hz is outside 1 to ${WAV_MAX_RATE_HZ}`);
  }
  if (blockAlign === 0) {
    return audioError(at + 12, "block align is 0");
  }

  let frames: number;
  if (tag === TAG_PCM) {
    if (bits !== 8 && bits !== 16) {
      return audioError(at + 14, `${bits}-bit PCM is not supported; a WAV needs 8 or 16 bits`);
    }
    const frameBytes = channels * (bits / 8);
    if (blockAlign !== frameBytes) {
      return audioError(at + 12, `block align ${blockAlign} is not ${frameBytes}, the size of a ${bits}-bit frame of ${channels} channel(s)`);
    }
    frames = Math.floor(found.dataBytes / blockAlign);
  } else if (tag === TAG_MS_ADPCM || tag === TAG_IMA_ADPCM) {
    const name = tag === TAG_MS_ADPCM ? "MS-ADPCM" : "IMA-ADPCM";
    if (bits !== 4) {
      return audioError(at + 14, `${name} is 4 bits per sample; the file says ${bits}`);
    }
    if (found.fmtSize < FMT_ADPCM_MIN_SIZE) {
      return audioError(at - 8, `the ${name} "fmt " chunk is ${found.fmtSize} bytes; at least ${FMT_ADPCM_MIN_SIZE} are required for the samples per block`);
    }
    const perBlock = u16(bytes, at + 18);
    if (perBlock === 0) {
      return audioError(at + 18, `${name} samples per block is 0`);
    }
    frames = found.fact ?? Math.floor(found.dataBytes / blockAlign) * perBlock;
  } else {
    return audioError(at, `WAV codec tag 0x${tag.toString(16).padStart(4, "0")} is not supported (PCM 8/16-bit, MS-ADPCM and IMA-ADPCM are)`);
  }

  if (frames === 0) {
    return audioError(found.dataAt - 8, "the file has no sample frames");
  }

  if (found.dataBytes < found.dataDeclared) {
    warnings.push(
      `the "data" chunk declares ${found.dataDeclared} bytes but the file holds ${found.dataBytes}; the length counts the bytes present (${AUDIO_SECTION})`,
    );
  }

  return ok(
    {
      format: AUDIO_WAV_ID,
      lengthTicks: wavLengthTicks(frames, rate),
      sampleRateHz: rate,
      channels,
      bank: null,
    },
    warnings,
  );
}

/** The built-in WAV decoder (S1): `audio.wav`, answering for `.wav` files. */
export const WAV_DECODER: AssetDecoder<AudioInfo> = {
  id: AUDIO_WAV_ID,
  section: AUDIO_SECTION,
  extensions: ["wav"],
  detect: detectWav,
  decode: (bytes) => decodeWav(bytes),
};
