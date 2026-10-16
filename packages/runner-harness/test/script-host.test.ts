// The VM-backed test host (AD-1; the tracer ticket's acceptance): the tracer
// program end to end through `runLog`, snapshot/restore across every split, and
// the empty Engine contract that keeps the golden job green.
import { deepEqual, equal } from "node:assert/strict";
import { test } from "node:test";
import type { BuiltinSpec, PluginDefinition, SurfaceId } from "@tk-reawakened/core";
import { createNullAudio, createScriptHost, restoreScriptHost, runLog, type Run } from "../src/index.ts";

const TRACER = 'greeting = "hi"\ncount = 2\nsleep(count)\ncount = 3\nend()\n';

function tracerHost(seed = 0) {
  return createScriptHost({ program: TRACER, seed });
}

test("runs the tracer program to completion across the sleep yield through runLog", () => {
  const host = tracerHost();
  const records = runLog(host, { schema: 1, ticks: 3, log: [] }, 1, createNullAudio());

  equal(records.length, 3);
  deepEqual(
    records.map((record) => record.tick),
    [1, 2, 3],
  );
  equal(host.state().vm.globals.greeting, "hi");
  equal(host.state().vm.globals.count, 3);
  equal(host.state().vm.threads[0]!.status, "finished");
});

test("the mid-run snapshot restores into a fresh host and finishes with the identical state hash", () => {
  const host = tracerHost();
  host.advance(1, []);
  equal(host.state().vm.threads[0]!.status, "waiting");

  const restored = restoreScriptHost(host.snapshot(), {});
  host.advance(2, []);
  restored.advance(2, []);

  equal(restored.stateHash(), host.stateHash());
  equal(restored.state().vm.globals.count, 3);
});

test("every split point from 0 to 3 ticks restores to the identical hash", () => {
  const total = 3;
  for (let split = 0; split <= total; split++) {
    const host = tracerHost();
    host.advance(split, []);
    const restored = restoreScriptHost(host.snapshot(), {});

    for (let step = 0; step < total - split; step++) {
      host.advance(1, []);
      restored.advance(1, []);
      equal(restored.stateHash(), host.stateHash(), `split ${split}, tick ${split + step + 1}`);
    }
    equal(restored.stateHash(), host.stateHash(), `split ${split} final`);
  }
});

test("batch sizes 1, 2 and 3 ticks give identical per-tick state and draw hashes", () => {
  const run: Run = { schema: 1, ticks: 3, log: [] };
  const batch = (n: number) => runLog(tracerHost(), run, n, createNullAudio());

  const byTick = new Map<number, { state: string; draw: string }>();
  for (const record of batch(1)) byTick.set(record.tick, { state: record.state, draw: record.draw });
  for (const n of [2, 3]) {
    for (const record of batch(n)) {
      const seen = byTick.get(record.tick);
      equal(seen !== undefined, true, `tick ${record.tick} appears at n=${n}`);
      deepEqual({ state: record.state, draw: record.draw }, seen);
    }
  }
});

test("the host satisfies the Engine contract with empty requests, diagnostics and cues", () => {
  const report = tracerHost().advance(1, []);
  equal(report.ticksRun, 1);
  equal(report.tickAfter, 1);
  deepEqual(report.consumed, []);
  deepEqual(report.audioCues, []);
  deepEqual(report.requests, []);
  deepEqual(report.diagnostics, []);
  equal(report.loading, false);
  equal(report.paused, null);
  equal(typeof report.stateHash, "string");
});

test("an empty batch changes nothing and maxTicks clamps the advance", () => {
  const host = tracerHost();
  const before = host.stateHash();

  const empty = host.advance(0, []);
  equal(empty.ticksRun, 0);
  equal(empty.tickAfter, 0);
  equal(empty.stateHash, before);

  const clamped = host.advance(5, [], 2);
  equal(clamped.ticksRun, 2);
  equal(clamped.tickAfter, 2);
});

test("drawList is a pure function of state and has no commands", () => {
  const host = tracerHost();
  const before = host.drawList(0);
  deepEqual(before, { tick: 0, width: 320, height: 240, commands: [] });

  host.advance(1, []);
  deepEqual(host.drawList(0), host.drawList(1));
  equal(host.drawList(0).tick, 1);
});

test("surfacePixels is null and setBreakpoints changes no state", () => {
  const host = tracerHost();
  equal(host.surfacePixels(0 as SurfaceId, 0), null);

  const before = host.stateHash();
  host.setBreakpoints([{ file: "a.prg", line: 1 }]);
  equal(host.stateHash(), before);
});

test("a fixture built-in drawing through view.rng leaves the draw in state and restores identically", () => {
  const roll: BuiltinSpec = {
    name: "roll",
    aliases: [],
    params: [{ name: "target", optional: false, byRef: true, variadic: false }],
    call: (view) => ({ value: null, out: [[0, view.rng.nextUint32()]] }),
  };
  const plugins: readonly PluginDefinition[] = [
    { id: "test.roll", version: "1.0.0", commands: [roll] },
  ];
  const program = "roll(r)\nend()\n";

  const host = createScriptHost({ program, seed: 5, plugins });
  host.advance(1, []);
  const drawn = host.state().vm.globals.r;
  equal(typeof drawn, "number");

  const restored = restoreScriptHost(host.snapshot(), { plugins });
  equal(restored.state().vm.globals.r, drawn);
  equal(restored.stateHash(), host.stateHash());

  host.advance(1, []);
  restored.advance(1, []);
  equal(restored.stateHash(), host.stateHash());
});
