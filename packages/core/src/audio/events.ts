/** Core-authoritative playback notifications (docs/spec/engine/audio-media.md#media-2). */
import type { AssetKey } from "../ports/keys.ts";
import type { GameState } from "../save/state.ts";
import { queueNativeEvent, registerEmitter } from "../events/emitter.ts";
import { emitterHandle } from "../events/model.ts";
import { findObject } from "../script/objects.ts";

export type AudioLifecycleType = "started" | "stopped" | "ended" | "looped" | "paused" | "resumed" | "faded";
export type AudioLifecycleDetail = {
  readonly track: string;
  readonly slot: number;
  readonly cueId: number;
  readonly file: AssetKey;
  readonly tick: number;
};
export type AudioLifecycleEvent = {
  readonly type: AudioLifecycleType;
  readonly detail: AudioLifecycleDetail;
};
export const MEDIA_EMITTER = "media";
export function mediaTrackEmitterKey(track: string): string {
  return `media.track:${track}`;
}
export function mediaVoiceEmitterKey(voice: Pick<AudioLifecycleDetail, "track" | "slot" | "cueId">): string {
  return `media.voice:${voice.track}:${voice.slot}:${voice.cueId}`;
}

/** Lazy like the game emitter: worlds that never use media emitters keep their existing state. */
export function mediaEventsActive(state: Pick<GameState, "events" | "vm">): boolean {
  for (const key in state.events.emitters) {
    if (Object.hasOwn(state.events.emitters, key) && isMediaEmitter(key)) return true;
  }
  return state.events.listeners.some((listener) => {
    if (isMediaEmitter(listener.emitter)) return true;
    const handle = emitterHandle(listener.emitter);
    // An unbound returned voice already owns ordinary object listeners.
    return handle !== null && findObject(state.vm, handle)?.hostType === "media.voice";
  });
}
function isMediaEmitter(key: string): boolean {
  return key === MEDIA_EMITTER || key.startsWith("media.track:") || key.startsWith("media.voice:");
}

/** One FIFO bus, not bubbling or a synchronous listener callback. */
export function queueAudioEvent(state: GameState, event: AudioLifecycleEvent): void {
  if (!mediaEventsActive(state)) return;
  const keys = [mediaVoiceEmitterKey(event.detail), mediaTrackEmitterKey(event.detail.track), MEDIA_EMITTER];
  for (const key of keys) {
    registerEmitter(state.vm, state.events, key);
    queueNativeEvent(state.vm, state.events, key, event.type, event.detail);
  }
  if (event.type === "stopped" || event.type === "ended") {
    const retiring = state.events.retiring ?? [];
    if (!retiring.includes(keys[0]!)) state.events.retiring = [...retiring, keys[0]!];
  }
}
