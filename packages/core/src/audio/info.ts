/**
 * Turning a file's bytes into its `AudioInfo` (docs/spec/engine/audio-media.md#audio-format-policy
 * dispatch and #audio-core-pins item 4).
 *
 * The core never decodes sound; it only learns how long a file is. The decoders
 * are the built-in `audio.midi` and `audio.wav` followed by those of the
 * plugins, assembled through `assembleDecoders` like every other format. The
 * file's bytes, not its track and not its name, choose the decoder: candidates
 * are the decoders whose `detect` accepts the first 64 bytes, ordered so a
 * decoder that names the file's extension comes first, then registration order.
 * The first candidate that decodes to an `AudioInfo` wins; a file no candidate
 * accepts is "unsupported" and plays with an unknown length.
 */

import type { AssetDecoder, AssetResolver } from "../formats/registry/decoder.ts";
import { assembleDecoders } from "../formats/registry/assembly.ts";
import type { AudioInfo } from "../formats/audio/model.ts";
import { AUDIO_PLUGIN } from "../formats/audio/plugin.ts";
import type { Logger } from "../ports/logger.ts";
import type { AssetKey } from "../ports/keys.ts";
import type { PluginDefinition } from "../script/plugin.ts";
import { asciiFold } from "./model.ts";

/** How many leading bytes a decoder's `detect` sees for audio dispatch. */
export const AUDIO_HEADER_BYTES = 64;

/** The decoders audio files dispatch through: `AUDIO_PLUGIN` first, then the plugins, in order. */
export function assembleAudioDecoders(plugins: readonly PluginDefinition[], logger: Logger): readonly AssetDecoder[] {
  return assembleDecoders([AUDIO_PLUGIN, ...plugins], logger).decoders;
}

const AUDIO_INFO_KEYS = ["bank", "channels", "format", "lengthTicks", "sampleRateHz"];

/** True for a record that has exactly the five `AudioInfo` keys with their types. */
function isAudioInfo(value: unknown): value is AudioInfo {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return false;
  const record = value as Record<string, unknown>;
  const keys = Object.keys(record).sort();
  if (keys.length !== AUDIO_INFO_KEYS.length || keys.some((key, index) => key !== AUDIO_INFO_KEYS[index])) return false;
  const nullableNumber = (item: unknown): boolean => item === null || (typeof item === "number" && Number.isInteger(item));
  return typeof record.format === "string" && nullableNumber(record.lengthTicks) && nullableNumber(record.sampleRateHz) && nullableNumber(record.channels) && (record.bank === null || (typeof record.bank === "object" && record.bank !== null));
}

/** The text after the last `.` of the key's file name, ASCII-folded, or `""`. */
function extensionOf(key: AssetKey): string {
  const name = key.slice(key.lastIndexOf("/") + 1);
  const dot = name.lastIndexOf(".");
  return dot < 0 ? "" : asciiFold(name.slice(dot + 1));
}

/**
 * The `AudioInfo` of `bytes`, or `null` when no decoder accepts them (an
 * unsupported or malformed file: the caller plays it with an unknown length).
 */
export function decodeAudioInfo(decoders: readonly AssetDecoder[], bytes: Uint8Array, key: AssetKey, context: AssetResolver): AudioInfo | null {
  const header = bytes.subarray(0, AUDIO_HEADER_BYTES);
  const candidates = decoders.filter((decoder) => decoder.detect(header));
  const extension = extensionOf(key);
  const named = candidates.filter((decoder) => decoder.extensions.some((item) => asciiFold(item) === extension));
  const ordered = [...named, ...candidates.filter((decoder) => !named.includes(decoder))];
  for (const decoder of ordered) {
    const result = decoder.decode(bytes, context);
    if (result.ok && isAudioInfo(result.value)) return result.value;
  }
  return null;
}
