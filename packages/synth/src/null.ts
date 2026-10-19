import { createSpessaMidiSource, type SpessaSynthOptions } from "./spessa.ts";
import { createMidiSource, NullMidiSynth } from "./midi.ts";
import { createNullPcmSource, createPcmSource } from "./pcm.ts";
import { createAudioSourceRegistry } from "./source.ts";
import type { AudioSourceRegistry } from "./source.ts";

/** The headless registry: MIDI and WAV both preserve exact time while rendering silence. */
export function createNullAudioRegistry(): AudioSourceRegistry {
  return createAudioSourceRegistry([createMidiSource(new NullMidiSynth()), createNullPcmSource()]);
}

/** The reference runner registry: SpessaSynth MIDI plus deterministic decoded WAV. */
export function createSpessaAudioRegistry(options: SpessaSynthOptions = {}): AudioSourceRegistry {
  return createAudioSourceRegistry([createSpessaMidiSource(options), createPcmSource()]);
}
