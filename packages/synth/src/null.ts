import { createMidiSource, NullMidiSynth } from "./midi.ts";
import { createNullPcmSource } from "./pcm.ts";
import { createAudioSourceRegistry } from "./source.ts";
import type { AudioSourceRegistry } from "./source.ts";

/** The headless registry: MIDI through `NullMidiSynth` and PCM, both silent, both exact in length. */
export function createNullAudioRegistry(): AudioSourceRegistry {
  return createAudioSourceRegistry([createMidiSource(new NullMidiSynth()), createNullPcmSource()]);
}
