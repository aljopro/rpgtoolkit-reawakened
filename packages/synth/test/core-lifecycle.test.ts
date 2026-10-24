// #482: the same real engine run through silent and PCM-rendering cue consumers.
import { test } from "node:test";
import { deepEqual, equal, ok } from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  assetKey, createAssetIndex, createEmptyBoard, createEngine, PACKAGE_ROOT, readEvent, writeBoard,
  CORE_PLUGIN, MEDIA_PLUGIN,
  type EventView, type InputRecord, type PluginDefinition,
} from "@tk-reawakened/core";
import { VoiceMachine, createNullAudioRegistry, createAudioSourceRegistry, createPcmSource } from "../src/index.ts";

const bytes = readFileSync(join(dirname(fileURLToPath(import.meta.url)), "../../core/test/fixtures/audio/files/pcm8-mono-8000.wav"));

test("null and real PCM-rendering runners produce identical core lifecycle histories and per-tick hashes", () => {
  function run(real: boolean) {
    const written = writeBoard(createEmptyBoard());
    if (!written.ok) throw new Error(written.error.message);
    const files = new Map([[assetKey("boards/start.brd"), written.value], [assetKey("media/step.wav"), bytes]]);
    const history: { event: EventView; delivered: number }[] = [];
    const plugin: PluginDefinition = {
      id: "observe_audio", version: "1.0.0",
      listeners: ["started", "ended", "stopped"].map((type) => ({ emitter: "media", type, command: "heard" })),
      commands: [{ name: "heard", aliases: [], params: [{ name: "event", optional: false, byRef: false, variadic: false }],
        call(view, args) {
          const event = readEvent(view.state!, args[0]!.value);
          if (event !== undefined) history.push({ event, delivered: view.clock.tick() });
          return { value: 0 };
        } }],
    };
    const engine = createEngine({ seed: 17, assetRoot: PACKAGE_ROOT, assetIndex: createAssetIndex([...files.keys()]),
      initialBoard: "start.brd", width: 32, height: 32, maxTicks: 60,
      program: 'wav("step.wav")\nthreadSleep(getThreadId(), 1)\nend()', plugins: [{ definition: CORE_PLUGIN }, { definition: MEDIA_PLUGIN }, { definition: plugin }] });
    const machine = new VoiceMachine(real ? createAudioSourceRegistry([createPcmSource()]) : createNullAudioRegistry(), { outputRateHz: 6000 });
    const slots = new Map<string, number>();
    const left = new Float32Array(100);
    const right = new Float32Array(100);
    const hashes: string[] = [];
    let inputs: InputRecord[] = [];
    let peak = 0;
    let endedReports = 0;
    for (let guard = 0; hashes.length < 40 && guard < 100; guard += 1) {
      const report = engine.advance(1, inputs);
      deepEqual(report.diagnostics, []);
      inputs = report.requests.flatMap((request) => request.kind === "asset"
        ? [{ tick: report.tickAfter, event: { kind: "asset" as const, reqId: request.reqId, bytes: files.get(request.key) ?? null } }] : []);
      for (const cue of report.audioCues) {
        const slot = `${cue.track}:${cue.voice}`;
        if (cue.kind === "media.play") {
          ok(cue.asset !== null && cue.track !== null);
          const loaded = machine.handle({ kind: "load", voice: cue.cueId, track: cue.track, asset: cue.asset, data: files.get(cue.asset)! });
          equal(loaded[0]?.kind, "ready", "consumer genuinely decodes the authored WAV");
          deepEqual(machine.handle({ kind: "play", voice: cue.cueId, cue: cue.cueId, loop: cue.loop!, volume: cue.volume!, positionTicks: cue.positionTicks! }), []);
          slots.set(slot, cue.cueId);
        } else if (cue.kind === "media.stop") {
          const voice = slots.get(slot);
          if (voice !== undefined) deepEqual(machine.handle({ kind: "stop", voice }), []);
        } else equal(cue.kind, "soundfont.set", "this fixture generates no other transport cues");
      }
      if (report.ticksRun === 0) continue;
      hashes.push(report.stateHash);
      for (const event of machine.render(left, right, 100)) {
        equal(event.kind, "ended");
        if (event.kind === "ended") {
          endedReports += 1;
          inputs.push({ tick: report.tickAfter, event: { kind: "audio.ended", cueId: event.cue } });
        }
      }
      for (const sample of left) peak = Math.max(peak, Math.abs(sample));
    }
    equal(hashes.length, 40);
    equal(endedReports, 1, "the source genuinely reaches its natural end and reports back");
    deepEqual(history.map(({ event }) => event.type), ["started", "ended"]);
    const end = history[1]!;
    equal(end.delivered, Number(end.event.detail.tick) + 1, "audio retirement delivers in the next events phase");
    return { history, hashes, peak };
  }
  const silent = run(false);
  const pcm = run(true);
  equal(silent.peak, 0);
  ok(pcm.peak > 0, "real PCM consumer must render non-silent samples, not echo core events");
  deepEqual(pcm.history, silent.history);
  deepEqual(pcm.hashes, silent.hashes);
});
