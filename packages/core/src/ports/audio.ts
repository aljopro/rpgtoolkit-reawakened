/**
 * Audio cues: the core states what plays (AD-16).
 *
 * Cues are the core's record of audio state, re-emitted after load; `synth`
 * and runners realise them and hold no game decision. `cueId` comes from a
 * monotonic counter in `GameState.audio` and `audio.ended { cueId }` replies;
 * an unknown `cueId` is ignored.
 */

import type { AssetKey } from "./keys.ts";

/** The verbs a cue can ask for (AD-16). */
export type AudioCueKind =
  | "music.play"
  | "music.stop"
  | "music.pause"
  | "music.resume"
  | "sfx.play"
  | "sfx.stop"
  | "volume.set";

/** One audio cue (AD-16). `volume` is an integer percent. */
export type AudioCue = {
  readonly cueId: number;
  readonly kind: AudioCueKind;
  readonly asset?: AssetKey;
  readonly loop?: boolean;
  readonly volume?: number;
};
