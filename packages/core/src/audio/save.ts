/**
 * The saved playback of a game save (docs/spec/engine/audio-media.md#audio-save-load and
 * #audio-core-pins item 8): track playback and the cue counter, never bank or track
 * configuration, script volume settings or the player's mix.
 */

import type { AssertPlainData } from "../ports/plain-data.ts";
import { voicePosition, type AudioFadeState, type AudioStateV2, type AudioTrackState, type AudioVoiceState } from "./model.ts";

/**
 * One saved track: playback only. `voiceCount` is game-file configuration and is
 * reconstructed from the loaded game, never read from a save
 * (docs/spec/engine/audio-media.md#audio-save-load).
 */
export type AudioSavedTrack = Omit<AudioTrackState, "voiceCount">;

/** What a game save keeps of the `audio` section. `tick` is the tick it was taken at. */
export type AudioSaveProjection = {
  tick: number;
  cueId: number;
  tracks: AudioSavedTrack[];
};

/** Build-time proof that a saved projection is plain data (G1 rule 2). */
export type AudioSaveProjectionIsPlainData = AssertPlainData<AudioSaveProjection>;

/** A copy of a fade descriptor, with its start moved by `shift` ticks. */
export function copyFade(fade: AudioFadeState | null, shift = 0): AudioFadeState | null {
  return fade === null ? null : { fromVolume: fade.fromVolume, targetVolume: fade.targetVolume, startTick: fade.startTick + shift, durationTicks: fade.durationTicks };
}

/** A copy of a voice with its position taken at `tick`; no part of the result aliases the original. */
export function copyVoice(voice: AudioVoiceState, tick: number): AudioVoiceState {
  return { ...voice, positionTicks: voicePosition(voice, tick), fade: copyFade(voice.fade) };
}

/** A copy of a track with every voice's position taken at `tick`; `voiceCount` stays with the game configuration. */
export function copyTrack(track: AudioTrackState, tick: number): AudioSavedTrack {
  const voices = track.voices.map((voice) => copyVoice(voice, tick));
  const primary = voices.find((voice) => voice.index === 0);
  return {
    name: track.name, state: track.state, flags: track.flags, file: track.file, voices,
    positionTicks: primary?.positionTicks ?? 0,
    lengthTicks: primary?.lengthTicks ?? null,
    fade: copyFade(primary?.fade ?? null),
  };
}

/** The saved playback of `audio` as of `tick`; the settings stay out. */
export function audioSaveProjection(audio: AudioStateV2, tick: number): AudioSaveProjection {
  return { tick, cueId: audio.cueId, tracks: audio.tracks.map((track) => copyTrack(track, tick)) };
}
