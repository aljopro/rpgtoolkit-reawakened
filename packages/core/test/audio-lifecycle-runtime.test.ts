import { test } from "node:test";
import { deepEqual, equal } from "node:assert/strict";
import { createAudioRuntime, type AudioLookup, type AudioRuntime } from "../src/audio/runtime.ts";
import type { AudioLifecycleEvent } from "../src/audio/events.ts";
import { audioSaveProjection } from "../src/audio/save.ts";
import { createGameState, restoreGameState, snapshot } from "../src/save/index.ts";
import type { AssetKey } from "../src/ports/keys.ts";
import type { GameState } from "../src/save/state.ts";

const key = (name: string): AssetKey => `media/${name}` as AssetKey;

type Rig = {
  readonly state: GameState;
  readonly runtime: AudioRuntime;
  readonly events: AudioLifecycleEvent[];
};

function rig(lengths: Record<string, number | null> = {}): Rig {
  const state = createGameState({ seed: 0 });
  const events: AudioLifecycleEvent[] = [];
  const made: Rig = {
    state,
    events,
    runtime: createAudioRuntime(state, {
      lookup: (asset): AudioLookup => ({ kind: "known", lengthTicks: lengths[asset] ?? 20 }),
      transition: (event) => events.push(event),
    }),
  };
  return made;
}

function types(events: readonly AudioLifecycleEvent[]): string[] {
  return events.map((event) => event.type);
}

test("lifecycle details identify each applied voice transition and omit no-ops", () => {
  const r = rig({ "media/a.wav": 10, "media/b.wav": 10 });
  r.state.time.tick = 4;
  const first = r.runtime.play({ track: "sfx", asset: key("a.wav"), loop: false });
  equal(first.kind, "started");
  if (first.kind !== "started") return;
  deepEqual(r.events, [{
    type: "started",
    detail: { track: "sfx", slot: 0, cueId: first.cueId, file: key("a.wav"), tick: 4 },
  }]);
  r.runtime.pause("sfx");
  r.runtime.pause("sfx");
  r.state.time.tick = 7;
  r.runtime.resume("sfx");
  r.runtime.resume("sfx");
  r.runtime.stop("sfx");
  r.runtime.stop("sfx");
  deepEqual(types(r.events), ["started", "paused", "resumed", "stopped"]);
  deepEqual(r.events.slice(1), [
    { type: "paused", detail: { track: "sfx", slot: 0, cueId: first.cueId, file: key("a.wav"), tick: 4 } },
    { type: "resumed", detail: { track: "sfx", slot: 0, cueId: first.cueId, file: key("a.wav"), tick: 7 } },
    { type: "stopped", detail: { track: "sfx", slot: 0, cueId: first.cueId, file: key("a.wav"), tick: 7 } },
  ]);
});

test("replacement and stealing stop the old cue identity before starting the new one", () => {
  const r = rig({ "media/a.wav": 30, "media/b.wav": 30, "media/c.wav": 30 });
  r.state.time.tick = 1;
  const first = r.runtime.play({ track: "sfx", asset: key("a.wav"), loop: false });
  r.state.time.tick = 2;
  const second = r.runtime.play({ track: "sfx", asset: key("b.wav"), loop: false });
  equal(first.kind, "started");
  equal(second.kind, "started");
  if (first.kind !== "started" || second.kind !== "started") return;
  deepEqual(types(r.events), ["started", "stopped", "started"]);
  equal(r.events[1]?.detail.cueId, first.cueId);
  equal(r.events[2]?.detail.cueId, second.cueId);

  r.runtime.play({ track: "voice", asset: key("a.wav"), loop: false, priority: 0 });
  r.runtime.play({ track: "voice", asset: key("b.wav"), loop: false, priority: 1 });
  r.state.time.tick = 3;
  r.runtime.play({ track: "voice", asset: key("c.wav"), loop: false, priority: 2 });
  deepEqual(types(r.events.slice(-3)), ["started", "stopped", "started"]);
  equal(r.events.at(-2)?.detail.slot, 0);
});

test("audio-phase ordering is ended, looped, voice faded, then track faded", () => {
  const r = rig({ "media/once.wav": 3, "media/loop.wav": 3 });
  r.runtime.play({ track: "ambience", asset: key("once.wav"), loop: false, voice: 0 });
  r.runtime.play({ track: "ambience", asset: key("loop.wav"), loop: true, voice: 1 });
  r.runtime.fade("ambience", 10, 3, 0);
  r.runtime.fade("ambience", 20, 3, 1);
  r.runtime.fade("ambience", 30, 3);
  r.events.splice(0);
  r.state.time.tick = 3;
  r.runtime.phase();
  deepEqual(types(r.events), ["ended", "looped", "faded", "faded"]);
  deepEqual(r.events.map((event) => [event.type, event.detail.slot, event.detail.tick]), [
    ["ended", 0, 3], ["looped", 1, 3], ["faded", 1, 3], ["faded", 1, 3],
  ]);
});

test("zero-duration fades complete immediately, while paused voice fades stay frozen", () => {
  const r = rig({ "media/a.wav": 20 });
  r.runtime.play({ track: "sfx", asset: key("a.wav"), loop: false });
  r.runtime.fade("sfx", 0, 0, 0);
  equal(r.events.at(-1)?.type, "faded");
  r.runtime.fade("sfx", 10, 0);
  equal(r.events.filter((event) => event.type === "faded").length, 2);
  r.events.splice(0);
  r.runtime.fade("sfx", 10, 3, 0);
  r.state.time.tick = 1;
  r.runtime.pause("sfx");
  r.state.time.tick = 20;
  r.runtime.phase();
  deepEqual(types(r.events), ["paused"]);
  r.runtime.resume("sfx");
  r.state.time.tick = 21;
  r.runtime.phase();
  deepEqual(types(r.events), ["paused", "resumed"]);
  r.state.time.tick = 22;
  r.runtime.phase();
  equal(r.events.at(-1)?.type, "faded");
});

test("loop notifications are natural wraps only and are not duplicated by refresh, seek, or flags", () => {
  const r = rig({ "media/loop.wav": 3 });
  r.runtime.play({ track: "ambience", asset: key("loop.wav"), loop: true });
  r.events.splice(0);
  r.state.time.tick = 3;
  r.runtime.phase();
  r.runtime.phase();
  deepEqual(types(r.events), ["looped"]);
  r.runtime.seek("ambience", 0);
  equal(types(r.events).length, 1, "seek does not synthesize a loop");
  r.state.time.tick = 6;
  r.runtime.phase();
  equal(types(r.events).filter((type) => type === "looped").length, 2);
  r.runtime.setLoop("ambience", false);
  r.runtime.setLoop("ambience", true);
  equal(types(r.events).filter((type) => type === "looped").length, 2, "loop flags do not synthesize a loop");
  r.state.time.tick = 9;
  r.runtime.phase();
  equal(types(r.events).at(-1), "looped");
  equal(types(r.events).filter((type) => type === "looped").length, 3);
});

test("game load re-emits cues without lifecycle events and replay stays JSON-identical per tick", () => {
  const a = rig({ "media/loop.wav": 4 });
  const b = rig({ "media/loop.wav": 4 });
  a.runtime.play({ track: "ambience", asset: key("loop.wav"), loop: true });
  b.runtime.play({ track: "ambience", asset: key("loop.wav"), loop: true });
  a.events.splice(0);
  b.events.splice(0);
  for (let tick = 1; tick <= 10; tick += 1) {
    a.state.time.tick = tick;
    b.state.time.tick = tick;
    a.runtime.phase();
    b.runtime.phase();
    deepEqual(JSON.stringify(a.state.audio), JSON.stringify(b.state.audio), `audio replay at tick ${tick}`);
    deepEqual(JSON.stringify(a.events), JSON.stringify(b.events), `event replay at tick ${tick}`);
  }
  const saved = audioSaveProjection(a.state.audio, a.state.time.tick);
  const loaded = restoreGameState(snapshot(a.state));
  const loadedEvents: AudioLifecycleEvent[] = [];
  const loadedRuntime = createAudioRuntime(loaded, {
    lookup: () => ({ kind: "known", lengthTicks: 4 }),
    transition: (event) => loadedEvents.push(event),
  });
  loadedRuntime.load(saved);
  equal(loadedEvents.length, 0);
  const restored = restoreGameState(snapshot(a.state));
  const restoredEvents: AudioLifecycleEvent[] = [];
  const restoredRuntime = createAudioRuntime(restored, {
    lookup: () => ({ kind: "known", lengthTicks: 4 }),
    transition: (event) => restoredEvents.push(event),
  });
  restoredRuntime.phase();
  equal(restoredEvents.length, 0);
});
