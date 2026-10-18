import { deepEqual, equal } from "node:assert/strict";
import { test } from "node:test";
import { ENGINE_PHASES, createAssetIndex, createEmptyBoard, createEngine, PACKAGE_ROOT, writeBoard, type Board } from "../src/index.ts";

function boardBytes(board: Board): Uint8Array {
  const encoded = writeBoard(board);
  if (!encoded.ok) throw new Error(encoded.error.message);
  return encoded.value;
}

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

function breakpointEngine(program: string, seed = 7) {
  const board = writeBoard(createEmptyBoard());
  if (!board.ok) throw new Error(board.error.message);
  const engine = createEngine({
    seed,
    assetIndex: createAssetIndex(["Boards/test.brd"]),
    assetRoot: PACKAGE_ROOT,
    initialBoard: "test.brd",
    width: 32,
    height: 32,
    maxTicks: 8,
    program,
  });
  const first = engine.advance(0, []);
  const request = first.requests[0];
  if (request?.kind !== "asset") throw new Error("expected board asset request");
  engine.advance(0, [{ tick: 0, event: { kind: "asset", reqId: request.reqId, bytes: board.value } }]);
  return engine;
}

test("breakpoints stop inside a tick and continue to the uninterrupted hash", () => {
  const uninterrupted = breakpointEngine("x = 1\nx = 2\nend()\n");
  const debugged = breakpointEngine("x = 1\nx = 2\nend()\n");
  const baseline = uninterrupted.advance(1, []);
  debugged.setBreakpoints([{ file: "<inline>", line: 2 }]);
  const stopped = debugged.advance(2, []);
  equal(stopped.ticksRun, 0);
  equal(stopped.tickAfter, 0);
  equal(stopped.paused?.line, 2);
  const resumed = debugged.advance(1, []);
  equal(resumed.ticksRun, 1);
  equal(resumed.paused, null);
  equal(resumed.stateHash, baseline.stateHash);
});

test("breakpoints that never hit preserve every tick hash", () => {
  const plain = breakpointEngine("x = 1\nend()\n", 11);
  const debugged = breakpointEngine("x = 1\nend()\n", 11);
  debugged.setBreakpoints([{ file: "<inline>", line: 99 }]);
  for (let tick = 0; tick < 3; tick += 1) equal(debugged.advance(1, []).stateHash, plain.advance(1, []).stateHash);
});

test("step resume executes one VM instruction and pauses again", () => {
  const engine = breakpointEngine("x = 1\nx = 2\nend()\n", 13);
  engine.setBreakpoints([{ file: "<inline>", line: 2 }]);
  const stopped = engine.advance(1, []);
  equal(stopped.paused?.line, 2);
  const stepped = engine.advance(0, [], undefined, "step");
  equal(stepped.ticksRun, 0);
  equal(stepped.tickAfter, 0);
  equal(stepped.paused?.thread, 1);
});

function authoredBmp(): Uint8Array {
  const bytes = new Uint8Array(62);
  bytes[0] = 0x42; bytes[1] = 0x4d;
  const put32 = (at: number, value: number): void => {
    bytes[at] = value & 255; bytes[at + 1] = (value >>> 8) & 255; bytes[at + 2] = (value >>> 16) & 255; bytes[at + 3] = (value >>> 24) & 255;
  };
  const put16 = (at: number, value: number): void => { bytes[at] = value & 255; bytes[at + 1] = (value >>> 8) & 255; };
  put32(2, 62); put32(10, 54); put32(14, 40); put32(18, 2); put32(22, 1); put16(26, 1); put16(28, 24); put32(34, 8);
  bytes.set([0, 0, 255, 0, 255, 0, 0, 0], 54);
  return bytes;
}

function authoredBoard(backgroundImage = ""): Uint8Array {
  const empty = createEmptyBoard();
  const board = { ...empty, properties: { ...empty.properties, backgroundImage } };
  const encoded = writeBoard(board);
  if (!encoded.ok) throw new Error(encoded.error.message);
  return encoded.value;
}

function pixelsAfter(command: string, boardBytes = authoredBoard()): Uint8Array {
  const engine = createEngine({
    seed: 19,
    assetIndex: createAssetIndex(["Boards/test.brd", "Bitmap/pixel.bmp"]),
    assetRoot: PACKAGE_ROOT,
    initialBoard: "test.brd",
    width: 4,
    height: 2,
    maxTicks: 20,
    program: `createcanvas(4, 2, c)\n${command}\nend()\n`,
  });
  let result = engine.advance(0, []);
  for (let step = 0; step < 8; step += 1) {
    const events = result.requests
      .filter((request) => request.kind === "asset")
      .map((request) => ({ tick: result.tickAfter, event: { kind: "asset" as const, reqId: request.reqId, bytes: request.key === "boards/test.brd" ? boardBytes : authoredBmp() } }));
    result = engine.advance(1, events);
    if (result.requests.length === 0 && !result.loading) break;
  }
  const surface = engine.surfacePixels(1 as never, 1) ?? engine.surfacePixels(1 as never, 2) ?? engine.surfacePixels(1 as never, 0);
  if (surface === null) throw new Error("expected rendered screen pixels");
  return surface.rgba;
}

test("image graphics command families apply exact decoded pixels", () => {
  deepEqual(pixelsAfter('bitmap("pixel.bmp", c)').slice(0, 8), new Uint8Array([255, 0, 0, 255, 255, 0, 0, 255]));
  deepEqual(pixelsAfter('setimage("pixel.bmp", 1, 0, 2, 1, c)').slice(4, 12), new Uint8Array([255, 0, 0, 255, 0, 255, 0, 255]));
  deepEqual(pixelsAfter('setimagetransparent("pixel.bmp", 0, 0, 2, 1, 255, 0, 0, c)').slice(0, 8), new Uint8Array([0, 0, 0, 0, 0, 255, 0, 255]));
  deepEqual(pixelsAfter('setimagetranslucent("pixel.bmp", 0, 0, 2, 1, c)').slice(0, 8), new Uint8Array([128, 0, 0, 255, 0, 128, 0, 255]));
  deepEqual(pixelsAfter('setimageadditive("pixel.bmp", 0, 0, 2, 1, 50, c)').slice(0, 8), new Uint8Array([127, 0, 0, 255, 0, 127, 0, 255]));
});

test("board preview image pixels are applied after the image reply", () => {
  const rgba = pixelsAfter('viewbrd("test.brd", 0, 0, c)', authoredBoard("pixel.bmp"));
  deepEqual(rgba.slice(0, 8), new Uint8Array([255, 0, 0, 255, 0, 255, 0, 255]));
});

test("missing image reply is located and leaves the screen unchanged", () => {
  const engine = createEngine({ seed: 19, assetIndex: createAssetIndex(["Boards/test.brd", "Bitmap/pixel.bmp"]), assetRoot: PACKAGE_ROOT, initialBoard: "test.brd", width: 4, height: 2, maxTicks: 20, program: 'createcanvas(4, 2, c)\nsetimage("pixel.bmp", 0, 0, 2, 1, c)\nend()\n' });
  let result = engine.advance(0, []);
  for (let step = 0; step < 6; step += 1) {
    const events = result.requests.filter((request) => request.kind === "asset").map((request) => ({ tick: result.tickAfter, event: { kind: "asset" as const, reqId: request.reqId, bytes: request.key === "boards/test.brd" ? authoredBoard() : null } }));
    result = engine.advance(1, events);
    if (result.diagnostics.some((diagnostic) => diagnostic.code === "asset.missing")) break;
  }
  const surface = engine.surfacePixels(1 as never, 1) ?? engine.surfacePixels(1 as never, 2) ?? engine.surfacePixels(1 as never, 0);
  if (surface === null) throw new Error("expected unchanged screen pixels");
  deepEqual(surface.rgba, new Uint8Array(4 * 2 * 4));
  equal(result.diagnostics.some((diagnostic) => diagnostic.code === "asset.missing" && diagnostic.file === "bitmap/pixel.bmp"), true);
});

test("engine classifies .tbm board-image dependencies as tile requests", () => {
  const empty = createEmptyBoard();
  const board: Board = {
    ...empty,
    images: [{
      file: "tiles.tbm",
      left: 0,
      top: 0,
      layer: 0,
      drawType: 0,
      transparent: { r: 255, g: 0, b: 255 },
      reserved: 0,
    }],
  };
  const engine = createEngine({
    seed: 7,
    assetIndex: createAssetIndex(["Boards/test.brd", "Bitmap/tiles.tbm"]),
    assetRoot: PACKAGE_ROOT,
    initialBoard: "test.brd",
    width: 32,
    height: 32,
    maxTicks: 1,
  });
  const initial = engine.advance(0, []);
  const boardRequest = initial.requests[0];
  if (boardRequest?.kind !== "asset") throw new Error("expected board request");
  const loaded = engine.advance(0, [{ tick: 0, event: { kind: "asset", reqId: boardRequest.reqId, bytes: boardBytes(board) } }]);
  equal(loaded.requests[0]?.kind, "asset");
  equal(loaded.requests[0]?.key, "bitmap/tiles.tbm");
});

test("engine classifies .tan tile-animation dependencies as tile requests", () => {
  const board: Board = { ...createEmptyBoard(), lut: ["anim.tan"] };
  const engine = createEngine({
    seed: 7,
    assetIndex: createAssetIndex(["Boards/test.brd", "Tiles/anim.tan"]),
    assetRoot: PACKAGE_ROOT,
    initialBoard: "test.brd",
    width: 32,
    height: 32,
    maxTicks: 1,
  });
  const initial = engine.advance(0, []);
  const boardRequest = initial.requests[0];
  if (boardRequest?.kind !== "asset") throw new Error("expected board request");
  const loaded = engine.advance(0, [{ tick: 0, event: { kind: "asset", reqId: boardRequest.reqId, bytes: boardBytes(board) } }]);
  equal(loaded.requests[0]?.kind, "asset");
  equal(loaded.requests[0]?.key, "tiles/anim.tan");
});
