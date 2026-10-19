/**
 * Audio cues: the core states what plays (AD-16;
 * docs/spec/engine/audio-media.md#audio-cue-contract).
 *
 * A cue says what a named track should do and when; it holds no runner handle.
 * Cues are the core's record of audio state, re-emitted after a load; `synth`
 * and runners realise them and hold no game decision. `cueId` comes from a
 * monotonic counter in `GameState.audio` and `audio.ended { cueId }` replies
 * are advisory; an unknown `cueId` is ignored.
 */

import type { AssetKey } from "./keys.ts";

/**
 * The verbs a cue can ask for (AD-16). `soundfont.set` names the effective
 * core-side SoundFont (docs/spec/engine/audio-media.md#soundfont-cue); every
 * other kind acts on a track.
 */
export type AudioCueKind =
  | "media.load"
  | "media.play"
  | "media.stop"
  | "media.pause"
  | "media.resume"
  | "media.seek"
  | "media.volume"
  | "media.fade"
  | "media.flags"
  | "soundfont.set";

/**
 * One audio cue (AD-16). Every key is required and a field a kind does not use
 * is `null`; an omitted key or `undefined` is not a valid cue. `tick` is the
 * core due tick, from which a late runner catches up, never a wall-clock time.
 * `media.volume` with `track: null` is the script master volume; with
 * `voice: null` it is the track's. `media.fade` carries the start volume in
 * `volume`, `tick` as the start tick and the duration in `durationTicks`.
 */
export type AudioCue = {
  readonly cueId: number;
  readonly tick: number;
  readonly kind: AudioCueKind;
  readonly track: string | null;
  readonly voice: number | null;
  readonly asset: AssetKey | null;
  readonly loop: boolean | null;
  readonly flags: number | null;
  readonly positionTicks: number | null;
  readonly volume: number | null;
  readonly targetVolume: number | null;
  readonly durationTicks: number | null;
};
