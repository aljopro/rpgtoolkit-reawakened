// The media objects (MEDIA-1, MEDIA-2; entry 21.5): `media`, track objects and the
// data-only voice `mediaPlay` returns. These drive the real VM, the real audio
// applier and the real post-order effect bus; nothing is mocked.
import { deepEqual, equal, ok } from "node:assert/strict";
import { test } from "node:test";
import {
  assetKey,
  collectStateGarbage,
  CORE_PLUGIN,
  createAudioRuntime,
  createGameState,
  createMediaScriptService,
  createScriptServices,
  drainDiagnostics,
  hashGameState,
  mediaEventsActive,
  mediaVoiceRef,
  queueAudioEvent,
  MEDIA_PLUGIN,
  restoreGameState,
  runEventsPhase,
  runThreadsPhase,
  runTimePhase,
  runWaitsPhase,
  snapshot,
  startProgram,
  STEP_BUDGET,
  type AudioCue,
  type AudioLookup,
  type AudioNote,
  type AudioRuntime,
  type GameState,
  type PluginDefinition,
  type ScriptServices,
} from "../src/index.ts";
import { EffectBus } from "../src/engine/effects.ts";
import { engineEffect } from "../src/engine/boot.ts";
import type { AssetKey } from "../src/ports/keys.ts";

type Diagnostic = { readonly code: string; readonly message: string };

type Rig = {
  readonly state: GameState;
  readonly services: ScriptServices;
  readonly audio: AudioRuntime;
  readonly notes: AudioNote[];
  readonly diagnostics: Diagnostic[];
  readonly cues: AudioCue[];
  tick(): void;
  run(ticks: number): void;
};

/** A real VM + audio applier + effect bus; the script's commands reach the one owner. */
function rig(lengths: Record<string, number | null | "pending">, program: string, extraPlugins: readonly PluginDefinition[] = []): Rig {
  const state = createGameState({ seed: 7 });
  const notes: AudioNote[] = [];
  const diagnostics: Diagnostic[] = [];
  const cues: AudioCue[] = [];
  const bus = new EffectBus(state);
  const media = createMediaScriptService(
    state,
    (name, args) => bus.postEffect("audio", engineEffect("audio", name, args, "draw-audio-cue")),
    (code, op, _detail) => {
      diagnostics.push({ code, message: `${op}: ${code}` });
    },
  );
  const audio = createAudioRuntime(state, {
    lookup: (asset): AudioLookup => {
      const found = lengths[asset.slice("media/".length)];
      if (found === undefined) return { kind: "unsupported" };
      if (found === "pending") return { kind: "pending" };
      return { kind: "known", lengthTicks: found };
    },
    bindVoice: (handle, result) => media.bind(handle, result),
    transition: (event) => queueAudioEvent(state, event),
    transitionsActive: () => mediaEventsActive(state),
    notify: (note) => {
      notes.push(note);
      if (note.kind === "diag") diagnostics.push({ code: note.code, message: `${note.op}: ${note.code}` });
    },
  });
  audio.register(bus);
  const services = createScriptServices(
    state,
    [{ definition: CORE_PLUGIN }, { definition: MEDIA_PLUGIN }, ...extraPlugins.map((definition) => ({ definition }))],
    undefined,
    undefined,
    undefined,
    "media-objects-test",
    (section, effect) => bus.dispatchRecorded(section, effect),
    undefined,
    undefined,
    [],
    false,
    media,
  );
  for (const diagnostic of drainDiagnostics(services)) diagnostics.push({ code: diagnostic.code, message: diagnostic.message });
  startProgram(state.vm, { kind: "inline", text: program, compiler: "2" });
  const made: Rig = {
    state,
    services,
    audio,
    notes,
    diagnostics,
    cues,
    tick() {
      runWaitsPhase(state.vm, {
        tick: state.time.tick,
        events: state.events,
        audio: state.audio,
        ...(state.engine.pendingEffects?.audio === undefined ? {} : { pendingAudio: state.engine.pendingEffects.audio }),
        mediaStart: (handle: number) => {
          const record = state.vm.objects.find((item) => item.handle === handle);
          return record === undefined ? null : mediaVoiceRef(record);
        },
      });
      runThreadsPhase(state.vm, services, STEP_BUDGET);
      runEventsPhase(state, services, STEP_BUDGET);
      audio.retry();
      audio.phase();
      collectStateGarbage(state, []);
      runTimePhase(state.time);
      for (const diagnostic of drainDiagnostics(services)) diagnostics.push({ code: diagnostic.code, message: diagnostic.message });
      cues.push(...audio.drain());
    },
    run(ticks: number) {
      for (let index = 0; index < ticks; index += 1) made.tick();
    },
  };
  return made;
}

const global = (state: GameState, name: string): unknown => state.vm.globals[name.toLowerCase()] ?? 0;

const track = (state: GameState, name: string) => state.audio.tracks.find((item) => item.name === name)!;

const voice = (state: GameState, name: string, slot: number) => track(state, name).voices.find((item) => item.index === slot);

const cueKinds = (cues: readonly AudioCue[]): string[] => cues.map((cue) => cue.kind);

test("mediaPlay returns a bound voice whose readable fields are the core voice state", () => {
  const world = rig({ "boom.wav": 60 }, [
    'v = mediaPlay("boom.wav", { track: "sfx" })',
    "vtrack = v.track",
    "vfile = v.file",
    "vstate = v.state",
    "vpos = v.position",
    "vlen = v.length",
    "vvol = v.volume",
    "vloop = v.loop",
  ].join("\n"));
  world.run(2);
  deepEqual(world.diagnostics, []);
  equal(global(world.state, "vtrack"), "sfx");
  equal(global(world.state, "vfile"), "media/boom.wav");
  equal(global(world.state, "vstate"), "playing");
  equal(global(world.state, "vlen"), 1);
  equal(global(world.state, "vvol"), 100);
  equal(global(world.state, "vloop"), 0);
  const record = voice(world.state, "sfx", 0)!;
  equal(record.file, "media/boom.wav");
  equal(global(world.state, "vpos"), 0);
  deepEqual(cueKinds(world.cues), ["soundfont.set", "media.play"]);
});

test("voice and track methods apply the same deterministic operations as the procedural commands", () => {
  const world = rig({ "boom.wav": 600 }, [
    'v = mediaPlay("boom.wav", { track: "sfx", loop: 0 })',
    "v.pause()",
    "paused = v.state",
    "v.volume = 40",
    "v.loop = 1",
    "v.resume()",
    "v.seek(0.5)",
    "v.fade(0, 1)",
    "media.music.volume = 20",
    "media.music.fade(0, 2)",
    "tv = media.music.volume",
  ].join("\n"));
  world.run(2);
  deepEqual(world.diagnostics, []);
  equal(global(world.state, "paused"), "paused");
  equal(global(world.state, "tv"), 20);
  const record = voice(world.state, "sfx", 0)!;
  equal(record.loop, true);
  equal(record.fade?.targetVolume, 0);
  const music = world.state.audio.settings.trackVolumes.find((entry) => entry.name === "music");
  equal(music?.volume, 20);
  equal(music?.fade?.targetVolume, 0);
  ok(cueKinds(world.cues).includes("media.pause"));
  ok(cueKinds(world.cues).includes("media.resume"));
  ok(cueKinds(world.cues).includes("media.seek"));
  ok(cueKinds(world.cues).includes("media.fade"));
  ok(cueKinds(world.cues).includes("media.volume"));
});

test("a replaced voice reads as no live voice and its methods diagnose without touching the replacement", () => {
  const world = rig({ "a.wav": 600, "b.wav": 600 }, [
    'v = mediaPlay("a.wav", { track: "sfx" })',
    'w = mediaPlay("b.wav", { track: "sfx" })',
    "vfile = v.file",
    "vstate = v.state",
    "vvol = v.volume",
    "vlen = v.length",
    "v.stop()",
    "wstate = w.state",
  ].join("\n"));
  world.run(2);
  equal(global(world.state, "vfile"), "");
  equal(global(world.state, "vstate"), "stopped");
  equal(global(world.state, "vvol"), 0);
  equal(global(world.state, "vlen"), 0);
  equal(global(world.state, "wstate"), "playing");
  equal(voice(world.state, "sfx", 0)?.file, "media/b.wav");
  deepEqual(world.diagnostics.map((entry) => entry.code), ["media.unknown-voice"]);
});

test("same-file music carries on and returns the live voice; the same request on sfx returns null", () => {
  const world = rig({ "song.mid": 600, "ding.wav": 60 }, [
    'a = mediaPlay("song.mid", { track: "music" })',
    'b = mediaPlay("song.mid", { track: "music" })',
    "same = a.cueId == b.cueId",
    'c = mediaPlay("ding.wav", { track: "sfx" })',
    'd = mediaPlay("ding.wav", { track: "sfx" })',
    "ignored = d == null",
  ].join("\n"));
  world.run(2);
  deepEqual(world.diagnostics, []);
  equal(global(world.state, "same"), 1);
  equal(global(world.state, "ignored"), 1);
  equal(world.notes.filter((note) => note.kind === "same-file").length, 2);
});

test("priority steals the lowest-priority voice when every slot is active", () => {
  const world = rig({ "a.wav": 600, "b.wav": 600, "c.wav": 600, "d.wav": 600, "e.wav": 600 }, [
    'a = mediaPlay("a.wav", { track: "ambience", priority: 5 })',
    'b = mediaPlay("b.wav", { track: "ambience", priority: 1 })',
    'c = mediaPlay("c.wav", { track: "ambience", priority: 3 })',
    'd = mediaPlay("d.wav", { track: "ambience", priority: 4 })',
    'e = mediaPlay("e.wav", { track: "ambience", priority: 9 })',
    "bstate = b.state",
    "estate = e.state",
  ].join("\n"));
  world.run(2);
  deepEqual(world.diagnostics, []);
  equal(global(world.state, "bstate"), "stopped");
  equal(global(world.state, "estate"), "playing");
  equal(voice(world.state, "ambience", 1)?.file, "media/e.wav");
  ok(world.notes.some((note) => note.kind === "steal" && note.voice === 1));
});

test("sync starts at the source track's modulo position", () => {
  const world = rig({ "pad.wav": 600, "drum.wav": 120 }, [
    'p = mediaPlay("pad.wav", { track: "ambience", loop: 1 })',
    "threadSleep(getThreadId(), 0.05)",
    "src = p.position",
    's = mediaPlay("drum.wav", { track: "ui", sync: "ambience" })',
    "pos = s.position",
  ].join("\n"));
  world.run(8);
  deepEqual(world.diagnostics, []);
  const src = Number(global(world.state, "src"));
  ok(src > 0, "the source had advanced before the synced start");
  equal(global(world.state, "pos"), 0.05);
});

test("media.track reaches a configured track and diagnoses an unknown name without creating one", () => {
  const before = rig({}, 't = media.track("ambience")\ntname = t.name\n');
  before.run(1);
  deepEqual(before.diagnostics, []);
  equal(global(before.state, "tname"), "ambience");

  const unknown = rig({}, 't = media.track("nosuch")\n');
  unknown.run(1);
  ok(unknown.diagnostics.some((entry) => entry.code === "media.unknown-track"));
  equal(unknown.state.audio.tracks.some((item) => item.name === "nosuch"), false);
});

test("voice, track and media hear one transition in voice then track then media order", () => {
  const order: string[] = [];
  const recorder = (scope: string): PluginDefinition["commands"][number] => ({
    name: `record_${scope}`,
    aliases: [],
    params: [{ name: "event", optional: false, byRef: false, variadic: false }],
    call: () => {
      order.push(scope);
      return { value: 0 };
    },
  });
  const plugin: PluginDefinition = {
    id: "media-order-test",
    version: "1.0.0",
    commands: [recorder("voice"), recorder("track"), recorder("media")],
    listeners: [
      { emitter: "media.voice:sfx:0:2", type: "stopped", command: "record_voice" },
      { emitter: "media.track:sfx", type: "stopped", command: "record_track" },
      { emitter: "media", type: "stopped", command: "record_media" },
    ],
  };
  const world = rig({ "a.wav": 600 }, 'v = mediaPlay("a.wav", { track: "sfx" })\nv.stop()\n', [plugin]);
  world.run(2);
  deepEqual(world.diagnostics, []);
  deepEqual(order, ["voice", "track", "media"]);
});

test("the media event domain stays lazy: a play alone adds no emitter registration", () => {
  const world = rig({ "a.wav": 60 }, 'v = mediaPlay("a.wav", { track: "sfx" })\n');
  world.run(2);
  equal(world.state.events.emitters, undefined);
});

test("a save at every tick restores the same hash and keeps the audio section plain data", () => {
  const world = rig({ "a.wav": 600, "b.wav": 60 }, [
    'v = mediaPlay("a.wav", { track: "sfx", loop: 0 })',
    'w = mediaPlay("b.wav", { track: "ambience" })',
    "v.volume = 55",
    "w.fade(0, 1)",
    "v.pause()",
    "v.resume()",
  ].join("\n"));
  for (let tick = 0; tick < 6; tick += 1) {
    world.tick();
    const saved = snapshot(world.state);
    const restored = restoreGameState(saved);
    equal(hashGameState(restored), hashGameState(world.state), `tick ${tick} hash`);
    equal(snapshot(restored), saved, `tick ${tick} snapshot`);
    const audio = (JSON.parse(saved) as { audio?: unknown }).audio;
    ok(audio !== undefined, "the save has an audio section");
    equal(JSON.stringify(audio).includes("=>"), false);
  }
  deepEqual(world.diagnostics, []);
});

test("the one-argument mediaPlay keeps the Toolkit 3.1 void form and its cue", () => {
  const world = rig({ "song.mid": 600 }, [
    'x = mediaPlay("song.mid")',
    "isnull = 0",
    "if (x == null) { isnull = 1 }",
  ].join("\n"));
  world.run(1);
  deepEqual(world.diagnostics, []);
  equal(global(world.state, "isnull"), 1);
  deepEqual(cueKinds(world.cues), ["soundfont.set", "media.play"]);
  equal(voice(world.state, "music", 0)?.file, "media/song.mid");
});

test("a wait requested on a start held for its asset parks until it binds, then waits for the finite end", () => {
  const lengths: Record<string, number | null | "pending"> = { "a.wav": "pending" };
  const world = rig(lengths, [
    'v = mediaPlay("a.wav", { track: "sfx", wait: 1 })',
    "done = 1",
  ].join("\n"));
  world.tick();
  equal(global(world.state, "done"), 0);
  const waiting = world.state.vm.threads.find((thread) => thread.status === "waiting");
  equal(waiting?.wait?.kind, "audio.track");
  const payload = waiting?.wait?.payload[0] as { readonly cueId: number } | undefined;
  equal(payload?.cueId, 0);
  lengths["a.wav"] = 60;
  world.run(70);
  equal(global(world.state, "done"), 1);
  equal(world.diagnostics.some((entry) => entry.code === "media.unknown-voice"), false);
});

test("an invalid loop assignment diagnoses and leaves the flag unchanged", () => {
  const world = rig({ "a.wav": 600 }, [
    'v = mediaPlay("a.wav", { track: "sfx", loop: 1 })',
    "before = v.loop",
    "v.loop = 2",
    "after = v.loop",
  ].join("\n"));
  world.run(1);
  equal(global(world.state, "before"), 1);
  equal(global(world.state, "after"), 1);
  ok(world.diagnostics.some((entry) => entry.code === "builtin.bad-arg"));
});

test("the Toolkit 3.1 aliases keep their cue streams and the retired positional form is gone", () => {
  const legacy = rig({ "song.mid": 600, "hit.wav": 60, "ding.wav": 60 }, [
    'midiplay("song.mid")',
    'wav("hit.wav")',
    'mp3pause("ding.wav")',
  ].join("\n"));
  legacy.run(2);
  const object = rig({ "song.mid": 600, "hit.wav": 60 }, [
    'mediaPlay("song.mid", { track: "music", loop: 1 })',
    'mediaPlay("hit.wav", { track: "sfx", loop: 0 })',
  ].join("\n"));
  object.run(2);
  deepEqual(cueKinds(legacy.cues), ["soundfont.set", "media.play", "media.play", "media.stop", "media.play"]);
  const shape = (cue: AudioCue): unknown[] => [cue.kind, cue.track, cue.asset, cue.loop];
  deepEqual(legacy.cues.slice(0, 3).map(shape), object.cues.map(shape));
  ok(legacy.state.vm.threads.every((thread) => thread.wait?.kind !== "audio.track"), "the 3.1 aliases never park, as before");

  const retired = rig({}, 'mediaPlay("f.wav", "sfx", 4)\n');
  retired.run(1);
  ok(retired.diagnostics.some((entry) => entry.code === "arity.mismatch"));
});
