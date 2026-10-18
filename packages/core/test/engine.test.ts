import { deepEqual, equal } from "node:assert/strict";
import { test } from "node:test";
import { ENGINE_PHASES, createAssetIndex, createEmptyBoard, createEngine, PACKAGE_ROOT, writeBoard } from "../src/index.ts";

test("createEngine exposes its initial board request at advance(0) and missing bytes unblock loading", () => {
  const engine = createEngine({ seed: 7, assetIndex: createAssetIndex(["Boards/start.brd"]), assetRoot: PACKAGE_ROOT, initialBoard: "start.brd", width: 512, height: 384, maxTicks: 8 });
  const first = engine.advance(0, []);
  equal(first.requests.length, 1);
  const request = first.requests[0];
  if (request?.kind !== "asset") throw new Error("expected board asset request");
  equal(request.reqId, 1);
  deepEqual(request.key, "boards/start.brd");
  equal(first.loading, true);
  const missing = engine.advance(1, [{ tick: 0, event: { kind: "asset", reqId: request.reqId, bytes: null } }]);
  equal(missing.ticksRun, 0);
  equal(missing.loading, false);
  equal(missing.diagnostics[0]?.code, "asset.missing");
});

test("engine queues non-asset inputs while loading and respects consuming ticks", () => {
  const engine = createEngine({ seed: 7, assetIndex: createAssetIndex(["Boards/start.brd"]), assetRoot: PACKAGE_ROOT, initialBoard: "start.brd", width: 512, height: 384, maxTicks: 8 });
  const first = engine.advance(0, []);
  const request = first.requests[0];
  if (request?.kind !== "asset") throw new Error("expected board asset request");
  const futureReply = engine.advance(0, [{ tick: 1, event: { kind: "asset", reqId: request.reqId, bytes: null } }]);
  equal(futureReply.consumed.length, 0);
  const queued = engine.advance(0, [{ tick: 0, event: { kind: "key", name: "A", code: "KeyA", char: "a", down: true } }]);
  equal(queued.consumed.length, 0);
  const failed = engine.advance(0, [{ tick: 0, event: { kind: "asset", reqId: request.reqId, bytes: null } }]);
  equal(failed.consumed.length, 1);
  const afterFailure = engine.advance(0, []);
  equal(afterFailure.consumed.length, 1);
  equal(afterFailure.consumed[0]?.event.kind, "key");
});

function loadedEngine(registrations: Parameters<typeof createEngine>[0]["phaseRegistrations"] = []) {
  const board = createEmptyBoard();
  const encoded = writeBoard(board);
  if (!encoded.ok) throw new Error(encoded.error.message);
  const engine = createEngine({
    seed: 7,
    assetIndex: createAssetIndex(["Boards/test.brd"]),
    assetRoot: PACKAGE_ROOT,
    initialBoard: "test.brd",
    width: 32,
    height: 32,
    maxTicks: 60,
    phaseRegistrations: registrations,
  });
  const first = engine.advance(0, []);
  const request = first.requests[0];
  if (request?.kind !== "asset") throw new Error("expected board asset request");
  const loaded = engine.advance(0, [{ tick: 0, event: { kind: "asset", reqId: request.reqId, bytes: encoded.value } }]);
  if (loaded.loading) throw new Error("expected authored board to load");
  return engine;
}

test("engine runs the fixed phase order, caps catch-up, and pauses on focus loss", () => {
  deepEqual(ENGINE_PHASES, ["input", "waits", "threads", "movement", "edges", "triggers", "battle", "animation", "audio", "time"]);
  const phases: string[] = [];
  const engine = loadedEngine([{ phase: "movement", run: (state) => phases.push(`movement:${state.time.tick}`) }]);
  const paused = engine.advance(2, [{ tick: 0, event: { kind: "focus", state: "lost" } }]);
  equal(paused.ticksRun, 0);
  const resumed = engine.advance(60, [{ tick: 0, event: { kind: "focus", state: "gained" } }], 2);
  equal(resumed.ticksRun, 2);
  equal(resumed.tickAfter, 2);
  deepEqual(phases, ["movement:0", "movement:1"]);
});

test("batching the same stamped input log produces the same state hash", () => {
  const one = loadedEngine();
  const batched = loadedEngine();
  const inputs = [
    { tick: 0, event: { kind: "key" as const, name: "A", code: "KeyA", char: "a", down: true } },
    { tick: 12, event: { kind: "pointer" as const, x: 4, y: 5, buttons: 1 } },
    { tick: 30, event: { kind: "key" as const, name: "A", code: "KeyA", char: "a", down: false } },
  ];
  for (let tick = 0; tick < 60; tick += 1) one.advance(1, inputs.filter((input) => input.tick === tick));
  const final = batched.advance(60, inputs);
  equal(final.ticksRun, 60);
  equal(final.stateHash, one.advance(0, []).stateHash);
});

test("an authored RPGCode program executes through the engine VM", () => {
  const board = writeBoard(createEmptyBoard());
  if (!board.ok) throw new Error(board.error.message);
  const engine = createEngine({
    seed: 7,
    assetIndex: createAssetIndex(["Boards/test.brd"]),
    assetRoot: PACKAGE_ROOT,
    initialBoard: "test.brd",
    width: 32,
    height: 32,
    maxTicks: 8,
    program: "x = 1\nsleep(1)\nend()\n",
  });
  const first = engine.advance(0, []);
  const request = first.requests[0];
  if (request?.kind !== "asset") throw new Error("expected board asset request");
  const started = engine.advance(1, [{ tick: 0, event: { kind: "asset", reqId: request.reqId, bytes: board.value } }]);
  equal(started.ticksRun, 1);
  equal(started.diagnostics.length, 0);
  const resumed = engine.advance(1, []);
  equal(resumed.ticksRun, 1);
  equal(resumed.diagnostics.length, 0);
});
