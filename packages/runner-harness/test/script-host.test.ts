// The VM-backed test host (AD-1; the tracer ticket's acceptance): the tracer
// program end to end through `runLog`, snapshot/restore across every split, and
// the empty Engine contract that keeps the golden job green.
import { deepEqual, equal } from "node:assert/strict";
import { test } from "node:test";
import type { BuiltinSpec, Diagnostic, LogRecord, PluginDefinition, SurfaceId } from "@tk-reawakened/core";
import { createNullAudio, createScriptHost, restoreScriptHost, runLog, type Run } from "../src/index.ts";

const TRACER = 'greeting = "hi"\ncount = 2\nsleep(count)\ncount = 3\nend()\n';

test("selects the TK2 dialect and compatibility manifest entry", () => {
  const host = createScriptHost({
    program: "#score! = 2\n#Mwin(Hello)\n#end\n",
    seed: 0,
    dialect: "tk2",
    manifest: [{ id: "tk2" }],
  });
  host.advance(1, []);
  equal(host.state().vm.globals.score, 2);
  equal(host.state().vm.threads[0]!.status, "finished");
});

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

test("mid-expression yield restores into a fresh host with identical per-tick stateHash", () => {
  const program = "result = 1 + sleep(2) + 3\nend()\n";
  const host = createScriptHost({ program, seed: 0 });

  // Tick 1: runs 1 + sleep(2) -> thread enters waiting with operands [result-ref, 1]
  host.advance(1, []);
  equal(host.state().vm.threads[0]!.status, "waiting");
  equal(host.state().vm.threads[0]!.frames[0]!.operands.length > 0, true);

  // Restore during the wait
  const restored = restoreScriptHost(host.snapshot(), {});
  equal(restored.stateHash(), host.stateHash());

  // Advance tick 2: wait not yet expired (sleep until tick 2)
  host.advance(1, []);
  restored.advance(1, []);
  equal(restored.stateHash(), host.stateHash());

  // Advance tick 3: wakes, evaluates 1 + 0 + 3 -> result is 4
  host.advance(1, []);
  restored.advance(1, []);
  equal(restored.stateHash(), host.stateHash());
  equal(host.state().vm.globals.result, 4);
  equal(restored.state().vm.globals.result, 4);
  equal(host.state().vm.threads[0]!.status, "finished");
  equal(restored.state().vm.threads[0]!.status, "finished");
});

test("a runtime failure reaches the report as a located diagnostic and runLog observes it", () => {
  const records: LogRecord[] = [];
  const host = createScriptHost({
    program: "a = 1\nnope()\nb = 2\n",
    seed: 0,
    sinks: [(record) => records.push(record)],
  });
  const seen: Diagnostic[] = [];
  const log = runLog(host, { schema: 1, ticks: 2, log: [] }, 1, createNullAudio(), (observation) => {
    seen.push(...observation.diagnostics);
  });

  equal(log.length, 2);
  deepEqual(seen, [
    { code: "unknown.command", file: "<inline>", line: 2, message: 'no built-in or function named "nope"' },
  ]);
  equal(host.state().vm.globals.b, 2);
  deepEqual(
    records.map((record) => record.code),
    ["unknown.command"],
  );
  // Draining is per advance: a later batch with no failure reports none.
  deepEqual(host.advance(1, []).diagnostics, []);
});
test("services sandboxed file blobs and preserves R-38b line endings", () => {
  const blobs = {
    blobs: {
      "saves:game/saved/input.txt": new Uint8Array([65, 13, 10, 66, 10, 67]),
    },
    assets: {},
  };
  const host = createScriptHost({
    program: [
      'openFileInput("input.txt", "Saved")',
      'fileInput("input.txt", first)',
      'fileInput("input.txt", second)',
      'fileInput("input.txt", third)',
      'fileInput("input.txt", fourth)',
      "end()",
    ].join("\n"),
    seed: 0,
    gameId: "game",
    blobs,
  });
  host.advance(12, []);
  equal(host.state().vm.globals.first, "A");
  equal(host.state().vm.globals.second, "B");
  equal(host.state().vm.globals.third, "C");
  equal(host.state().vm.globals.fourth, "");
  equal(host.state().vm.files.length, 1);
});

test("writes only through the sandbox blob port", () => {
  const blobs: { blobs: Record<string, Uint8Array>; assets: Record<string, Uint8Array> } = { blobs: {}, assets: {} };
  const host = createScriptHost({
    program: 'openFileOutput("output.txt", "Saved")\nfilePrint("output.txt", "ok")\nend()\n',
    seed: 0,
    gameId: "game",
    blobs,
  });
  host.advance(12, []);
  deepEqual([...(blobs.blobs["saves:game/saved/output.txt"] ?? [])], [111, 107, 13, 10]);
});
