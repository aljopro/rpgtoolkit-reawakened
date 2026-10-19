import { err } from "@tk-reawakened/core";
import type { Result } from "@tk-reawakened/core";
import { SilentVoice } from "./silent-voice.ts";
import { opened } from "./source.ts";
import type { AudioSource, SourceError, SourceVoice } from "./source.ts";

const tag = (b: Uint8Array, o: number): string =>
  String.fromCharCode(b[o] ?? 0, b[o + 1] ?? 0, b[o + 2] ?? 0, b[o + 3] ?? 0);
const u16 = (b: Uint8Array, o: number): number => (b[o] ?? 0) | ((b[o + 1] ?? 0) << 8);
const u32 = (b: Uint8Array, o: number): number =>
  (b[o] ?? 0) + (b[o + 1] ?? 0) * 0x100 + (b[o + 2] ?? 0) * 0x10000 + (b[o + 3] ?? 0) * 0x1000000;

function fail(code: SourceError["code"], detail: string): Result<SourceVoice, SourceError> {
  return err<SourceVoice, SourceError>({ code, detail });
}

/**
 * The `audio.wav` PCM source for headless runs: it reads a RIFF/WAVE file's
 * linear-PCM length and renders silence of that length. Sample decoding, ADPCM
 * and resampling belong to the PCM source of entry 6.12.
 */
export function createNullPcmSource(): AudioSource {
  return {
    id: "audio.wav",
    extensions: ["wav"],
    detect: (header) =>
      header.length >= 12 && tag(header, 0) === "RIFF" && tag(header, 8) === "WAVE",
    bank: null,
    open(bytes, env) {
      let byteRate = 0;
      let dataBytes = -1;
      let pos = 12;
      while (pos + 8 <= bytes.length && dataBytes < 0) {
        const id = tag(bytes, pos);
        const size = u32(bytes, pos + 4);
        const body = pos + 8;
        if (id === "fmt ") {
          if (body + 16 > bytes.length) return fail("format.malformed", "fmt chunk is truncated");
          if (u16(bytes, body) !== 1) {
            return fail("format.unsupported", "only linear PCM (format tag 1) is read here");
          }
          byteRate = u32(bytes, body + 8);
        } else if (id === "data") {
          dataBytes = Math.min(size, bytes.length - body);
        }
        pos = body + size + (size % 2);
      }
      if (byteRate === 0) return fail("format.malformed", "no usable fmt chunk");
      if (dataBytes < 0) return fail("format.malformed", "no data chunk");
      const lengthTicks = Math.floor((2 * dataBytes * 60 + byteRate) / (2 * byteRate));
      return opened<SourceVoice>(new SilentVoice(lengthTicks, env.outputRateHz));
    },
  };
}
