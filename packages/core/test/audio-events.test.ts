import { deepEqual, equal, ok } from "node:assert/strict";
import { test } from "node:test";
import {
  assetKey, createGameState, registerEmitter, queueAudioEvent, mediaVoiceEmitterKey, mediaTrackEmitterKey,
  readEvent, snapshot, restoreGameState, runEventsPhase, hashGameState,
} from "../src/index.ts";
import { createScriptServices } from "./script-test-services.ts";
import type { AudioLifecycleEvent, GameState } from "../src/index.ts";

const event: AudioLifecycleEvent = {
  type: "started", detail: { track: "sfx", slot: 0, cueId: 2, file: assetKey("media/step.wav"), tick: 3 },
};
function queued(state: GameState) {
  return state.events.queue.map((item) => readEvent(state, { kind: "object", handle: item.event, className: "" }));
}

test("unused media emitter domain does not allocate state or change legacy hashes", () => {
  const state = createGameState({ seed: 1 });
  const before = snapshot(state);
  queueAudioEvent(state, event);
  equal(snapshot(state), before);
});

test("active media queues every scope with exact detail even before scoped listeners exist", () => {
  const state = createGameState({ seed: 1 });
  registerEmitter(state.vm, state.events, "media");
  queueAudioEvent(state, event);
  deepEqual(queued(state), [mediaVoiceEmitterKey(event.detail), mediaTrackEmitterKey("sfx"), "media"].map((emitter) => ({
    type: "started", emitter, detail: event.detail, cancelable: false, canceled: false,
  })));
  const restored = restoreGameState(snapshot(state));
  deepEqual(queued(restored), queued(state));
  equal(hashGameState(restored), hashGameState(state));
});

test("terminal voice retirement preserves all pending history, then releases the registration", () => {
  const state = createGameState({ seed: 1 });
  registerEmitter(state.vm, state.events, "media");
  queueAudioEvent(state, event);
  queueAudioEvent(state, { ...event, type: "paused" });
  queueAudioEvent(state, { ...event, type: "stopped" });
  equal(state.events.queue.length, 9, "retiring a voice must not discard earlier notifications");
  const restored = restoreGameState(snapshot(state));
  deepEqual(queued(restored), queued(state));
  for (const current of [state, restored]) {
    ok(current.events.emitters?.[mediaVoiceEmitterKey(event.detail)]);
    runEventsPhase(current, createScriptServices(current));
    equal(current.events.queue.length, 0);
    equal(current.events.emitters?.[mediaVoiceEmitterKey(event.detail)], undefined);
    ok(current.events.emitters?.[mediaTrackEmitterKey("sfx")]);
    ok(current.events.emitters?.media);
  }
  equal(hashGameState(restored), hashGameState(state));
});
