import { hashState } from "../canon/index.ts";
import { withoutSettings } from "../audio/model.ts";
import type { GameState } from "./state.ts";

/**
 * The state hash of a whole game state (AD-11): `hashState` of the tree
 * without `audio.settings`. The script volume settings are not game state a
 * replay compares (docs/spec/engine/audio-media.md#audio-core-pins item 7), so
 * they never enter the hash; a snapshot still carries them.
 */
export function hashGameState(state: GameState): string {
  return hashState({ ...state, audio: withoutSettings(state.audio) });
}
