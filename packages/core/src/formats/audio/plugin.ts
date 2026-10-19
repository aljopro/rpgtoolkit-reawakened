/**
 * The built-in audio pack: the two `AssetDecoder<AudioInfo>` decoders as one
 * plugin's `decoders` (docs/spec/engine/audio-media.md#audio-info-seam, AD-31).
 *
 * `audio.midi` and `audio.wav` are the first two audio formats and register
 * through the same `PluginDefinition.decoders` seam a third-party pack uses.
 * The pack has no commands; the media built-ins belong to entry 6.8. The host
 * lists it before any plugin pack so a pack's decoder ties after these
 * (docs/spec/engine/audio-media.md#audio-format-policy).
 */

import type { PluginDefinition } from "../../script/plugin.ts";
import { MIDI_DECODER } from "./midi.ts";
import { WAV_DECODER } from "./wav.ts";

/** The plugin id of the built-in audio pack. */
export const AUDIO_PLUGIN_ID = "audio";

/** The built-in audio decoders, MIDI then WAV, as a plugin definition. */
export const AUDIO_PLUGIN: PluginDefinition = {
  id: AUDIO_PLUGIN_ID,
  version: "1.0.0",
  commands: [],
  decoders: [MIDI_DECODER, WAV_DECODER],
};
