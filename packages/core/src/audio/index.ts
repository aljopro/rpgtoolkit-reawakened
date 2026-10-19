// The `core/audio` surface: the `audio` section schema v2, the track engine and
// cue emission, the saved-playback projection and the audio file decoders
// (docs/spec/engine/audio-media.md; AD-10, AD-16).
export {
  AUDIO_SCHEMA_VERSION,
  BUILTIN_TRACKS,
  MAX_TRACKS,
  MAX_VOICES,
  MEDIA_LOOP,
  MEDIA_ONCE,
  MEDIA_RESTART,
  MEDIA_TRACK_NAME,
  MEDIA_WAIT,
  asciiFold,
  createAudioSection,
  createTrack,
  fadeValue,
  findTrack,
  musicFile,
  voicePass,
  voicePosition,
  withoutSettings,
  type AudioFadeState,
  type AudioSettings,
  type AudioStateIsPlainData,
  type AudioStateV2,
  type AudioTrackState,
  type AudioTrackVolume,
  type AudioVoiceHandle,
  type AudioVoiceState,
} from "./model.ts";
export { AUDIO_HEADER_BYTES, assembleAudioDecoders, decodeAudioInfo } from "./info.ts";
export {
  createAudioRuntime,
  type AudioEffectBus,
  type AudioHost,
  type AudioLookup,
  type AudioNote,
  type AudioNoteDetail,
  type AudioPlayRequest,
  type AudioPlayResult,
  type AudioRuntime,
  type AudioRuntimeOptions,
  type AudioVoiceSelector,
  type AudioWait,
  type AudioWaitState,
} from "./runtime.ts";
export { audioSaveProjection, type AudioSaveProjection, type AudioSaveProjectionIsPlainData } from "./save.ts";
