import { deepEqual, equal } from "node:assert/strict";
import { test } from "node:test";
import { createAssetIndex, createEngine, PACKAGE_ROOT } from "../src/index.ts";

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
