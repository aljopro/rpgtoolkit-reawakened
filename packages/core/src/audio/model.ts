/**
 * The `audio` section: what each track is doing, for how long, and which cue
 * made it so (docs/spec/engine/audio-media.md#audio-state and
 * #audio-core-pins; AD-10, AD-16).
 *
 * Everything here is plain data (G1): ordered arrays, integers, `null` for
 * absence, no `Map`, no handle. Time is the integer 60 Hz tick (AD-2). The
 * section's owner is `core/audio`; other modules read it through the runtime
 * and the pure helpers below.
 */

import type { AssertPlainData } from "../ports/plain-data.ts";
import type { AssetKey } from "../ports/keys.ts";

/** The section's own schema number (`GameState.schema.audio` carries the same). */
export const AUDIO_SCHEMA_VERSION = 2;

/** `tkMD_ONCE`: finish at the first asset boundary (docs/spec/engine/audio-media.md#media-command-family). */
export const MEDIA_ONCE = 0;
/** `tkMD_LOOP`: continue at every asset boundary. */
export const MEDIA_LOOP = 1;
/** `tkMD_WAIT`: park the calling thread until the voice's wait condition is met. */
export const MEDIA_WAIT = 2;
/** `tkMD_RESTART`: restart a same-file voice from zero instead of carrying on. */
export const MEDIA_RESTART = 4;

/** At most this many named tracks, the five built-ins included. */
export const MAX_TRACKS = 16;
/** At most this many configured voice slots across all tracks. */
export const MAX_VOICES = 32;

/** The built-in tracks in creation order, with their default voice counts (6.2 P6). */
export const BUILTIN_TRACKS: readonly (readonly [string, number])[] = [
  ["music", 1],
  ["sfx", 1],
  ["ambience", 4],
  ["voice", 2],
  ["ui", 4],
];

/** A track name: 1 to 32 ASCII letters, digits, `_`, `.` and `-` (6.2 P3). */
export const MEDIA_TRACK_NAME = /^[A-Za-z0-9_.-]{1,32}$/;

/** A linear volume ramp over fixed ticks (6.2 P7); evaluated by the fade owner, entry 6.7. */
export type AudioFadeState = {
  fromVolume: number;
  targetVolume: number;
  startTick: number;
  durationTicks: number;
};

/** One playback slot inside a track. */
export type AudioVoiceState = {
  index: number;
  state: "playing" | "paused";
  file: AssetKey;
  /** The cue that started this occupant; a handle from an earlier occupant never matches. */
  cueId: number;
  /** Stealing priority, default 0. */
  priority: number;
  /** The voice's script volume, 0..100. */
  volume: number;
  /** Repeat at the asset boundary. */
  loop: boolean;
  startTick: number;
  /** The position at the end of the last `audio` phase; the held position while paused. */
  positionTicks: number;
  lengthTicks: number | null;
  /** The tick a finite one-shot ends at; `null` for a loop or an unknown length. */
  endTick: number | null;
  /** The tick a paused voice was paused at; `null` while playing. */
  pausedTick: number | null;
  fade: AudioFadeState | null;
};

/** A named, ordered container of voices. */
export type AudioTrackState = {
  name: string;
  /** Configured voice slots, at least 1. */
  voiceCount: number;
  state: "stopped" | "playing" | "paused";
  /** The loop bit of voice 0, kept after a stop. */
  flags: number;
  /** The file most recently started here; stop keeps it, a null music request clears it. */
  file: AssetKey | null;
  /** The primary (voice 0) view: its position, length and fade, or `0`, `null`, `null`. */
  positionTicks: number;
  lengthTicks: number | null;
  voices: AudioVoiceState[];
  fade: AudioFadeState | null;
};

/** A track-wide script volume, present only when it is not 100 or a track fade runs. */
export type AudioTrackVolume = {
  name: string;
  volume: number;
  fade: AudioFadeState | null;
};

/**
 * Script volumes. They are runtime state for replay and snapshots but are not
 * part of a game save, are not touched by `reset()` or a game load, and never
 * enter the state hash (`hashGameState`).
 */
export type AudioSettings = {
  masterVolume: number;
  trackVolumes: AudioTrackVolume[];
};

/** The `GameState.audio` section, schema v2. */
export type AudioStateV2 = {
  schema: 2;
  /** The next unused cue id; starts at 1 and is never reused. */
  cueId: number;
  /** The script-chosen SoundFont bank; `null` means the author's default. */
  soundFont: AssetKey | null;
  /** Built-ins first, then creation order. */
  tracks: AudioTrackState[];
  settings: AudioSettings;
};

/** Build-time proof that the section stays plain data (G1 rule 2, AD-7). */
export type AudioStateIsPlainData = AssertPlainData<AudioStateV2>;

/** A track with no voice. */
export function createTrack(name: string, voiceCount: number): AudioTrackState {
  return { name, voiceCount, state: "stopped", flags: 0, file: null, positionTicks: 0, lengthTicks: null, voices: [], fade: null };
}

/** A fresh section: the five built-in tracks stopped, counter at 1, volumes at 100. */
export function createAudioSection(): AudioStateV2 {
  return {
    schema: AUDIO_SCHEMA_VERSION,
    cueId: 1,
    soundFont: null,
    tracks: BUILTIN_TRACKS.map(([name, voiceCount]) => createTrack(name, voiceCount)),
    settings: { masterVolume: 100, trackVolumes: [] },
  };
}

/**
 * A voice's position at `tick`: the held position when paused, the elapsed
 * ticks for an unknown length (never wrapping), the elapsed ticks modulo the
 * length for a loop and the elapsed ticks clamped to the length for a one-shot
 * (docs/spec/engine/audio-media.md#audio-time-model item 2).
 */
export function voicePosition(voice: AudioVoiceState, tick: number): number {
  if (voice.state === "paused") return voice.positionTicks;
  const elapsed = tick - voice.startTick;
  const length = voice.lengthTicks;
  if (length === null) return elapsed;
  return voice.loop ? elapsed % length : Math.min(elapsed, length);
}

/** The pass number of a looping voice at `tick`: `floor((tick - startTick) / lengthTicks)`, or `null` without a known length. */
export function voicePass(voice: AudioVoiceState, tick: number): number | null {
  const length = voice.lengthTicks;
  if (length === null) return null;
  const elapsed = tick - voice.startTick;
  return (elapsed - (elapsed % length)) / length;
}

/** The track named `name` (ASCII case-insensitive), or `undefined`. */
export function findTrack(audio: AudioStateV2, name: string): AudioTrackState | undefined {
  const folded = asciiFold(name);
  return audio.tracks.find((track) => track.name === folded);
}

/** The music track's file: what the `music` virtual variable reads (Q19). */
export function musicFile(audio: AudioStateV2): AssetKey | null {
  return audio.tracks.find((track) => track.name === "music")?.file ?? null;
}

/** ASCII-only case fold; the stored name of a track (the 6.2 P3 rule, never a locale fold). */
export function asciiFold(text: string): string {
  let out = "";
  for (let index = 0; index < text.length; index += 1) {
    const code = text.charCodeAt(index);
    out += code >= 0x41 && code <= 0x5a ? String.fromCharCode(code + 0x20) : text.charAt(index);
  }
  return out;
}

/** The section without its settings: what the state hash and a game save see. */
export function withoutSettings(audio: AudioStateV2): Omit<AudioStateV2, "settings"> {
  const { settings: _settings, ...rest } = audio;
  return rest;
}
