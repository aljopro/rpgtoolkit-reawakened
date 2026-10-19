// Audio metadata decoders (docs/spec/engine/audio-media.md#audio-info-seam):
// the `AudioInfo` model, the WAV and Standard MIDI File decoders, and the
// built-in audio pack that registers them through `PluginDefinition.decoders`.
export * from "./model.ts";
export { decodeWav, detectWav, WAV_DECODER, WAV_MAX_RATE_HZ, wavLengthTicks } from "./wav.ts";
export { decodeMidi, detectMidi, MIDI_BANK_KIND, MIDI_DECODER, midiLengthTicks } from "./midi.ts";
export * from "./plugin.ts";
