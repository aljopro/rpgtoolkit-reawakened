import { deepEqual, equal } from "node:assert/strict";
import { test } from "node:test";
import {
  applyInputEvent,
  createInputSection,
  inputView,
  processGamepadEvents,
  pruneClaimed,
} from "../src/input/index.ts";
import { createGameState, restoreGameState, snapshot } from "../src/save/index.ts";
import { pollInputKey } from "../src/script/waits.ts";

test("input records have monotonic sequences and claims deliver each key once", () => {
  const state = createInputSection();
  applyInputEvent(state, { kind: "key", name: "A", code: "KeyA", char: "a", down: true });
  applyInputEvent(state, { kind: "key", name: "B", code: "KeyB", char: "b", down: true });
  const first = pollInputKey({ tick: 0, input: inputView(state), claims: [] }, { kind: "input.key", global: true, key: null, parkSeq: 1 });
  if (first === null) throw new Error("expected first key");
  equal(first.value, "A");
  const second = pollInputKey({ tick: 0, input: inputView(state), claims: [first.claim ?? -1] }, { kind: "input.key", global: true, key: null, parkSeq: 1 });
  if (second === null) throw new Error("expected second key");
  equal(second.value, "B");
  pruneClaimed(state, [first.claim ?? -1, second.claim ?? -1]);
  equal(pollInputKey({ tick: 1, input: inputView(state), claims: [] }, { kind: "input.key", global: true, key: null, parkSeq: 1 }), null);
});

test("configured keyboard edges and disabled diagonals are deterministic", () => {
  const state = createInputSection({
    bindings: { keys: { ArrowUp: "up", ArrowRight: "right", Enter: "confirm" } },
    allowDiagonals: false,
  });
  applyInputEvent(state, { kind: "key", name: "UP", code: "ArrowUp", char: null, down: true });
  applyInputEvent(state, { kind: "key", name: "RIGHT", code: "ArrowRight", char: null, down: true });
  applyInputEvent(state, { kind: "key", name: "RIGHT", code: "ArrowRight", char: null, down: true, repeat: true });
  equal(state.keys.length, 2);
  equal(state.actions.up, true);
  equal(state.actions.right, true);
  deepEqual(state.directionOrder, ["up", "right"]);
  applyInputEvent(state, { kind: "key", name: "UP", code: "ArrowUp", char: null, down: false });
  equal(state.actions.up, false);
});

test("gamepad dead-zone, merge, device ordering and disconnect share edge state", () => {
  const state = createInputSection({ bindings: { keys: { ArrowRight: "right", Enter: "confirm", Escape: "cancel" } } });
  applyInputEvent(state, { kind: "gamepad", device: 1, connected: true, axes: { x: 250, y: 0 }, buttons: 16 });
  applyInputEvent(state, { kind: "gamepad", device: 0, connected: true, axes: { x: 0, y: 0 }, buttons: 32 });
  processGamepadEvents(state);
  deepEqual(state.keys.map((key) => key.name), ["cancel", "right", "confirm"]);
  equal(state.actions.right, true);
  equal(state.actions.confirm, true);
  equal(state.actions.cancel, true);
  applyInputEvent(state, { kind: "gamepad", device: 1, connected: true, axes: { x: 249, y: 0 }, buttons: 0 });
  processGamepadEvents(state);
  equal(state.actions.right, false);
  applyInputEvent(state, { kind: "gamepad", device: 1, connected: false, axes: { x: 0, y: 0 }, buttons: 0 });
  processGamepadEvents(state);
  equal(state.gamepads["1"]?.connected, false);
});

test("button slots use logical half-open hit tests and click destinations use camera pixels", () => {
  const state = createInputSection({
    buttons: [{ id: "ok", x: 10, y: 20, w: 20, h: 10, action: "confirm", enabled: true }],
    camera: { x: 100, y: 200 },
  });
  applyInputEvent(state, { kind: "pointer", x: 10, y: 20, buttons: 1 });
  applyInputEvent(state, { kind: "pointer", x: 30, y: 30, buttons: 1 });
  applyInputEvent(state, { kind: "pointer", x: 31, y: 30, buttons: 1 });
  deepEqual(state.keys.map((key) => key.name), ["confirm"]);
  deepEqual(state.pendingClicks, [{ x: 130, y: 230 }, { x: 131, y: 230 }]);
});

test("extended input section snapshots restore exactly", () => {
  const state = createGameState({ seed: 7 });
  state.input = createInputSection({
    bindings: { keys: { ArrowUp: "up" } },
    allowDiagonals: true,
    buttons: [{ id: "go", x: 1, y: 2, w: 3, h: 4, action: "confirm", enabled: true }],
  });
  applyInputEvent(state.input, { kind: "key", name: "UP", code: "ArrowUp", char: null, down: true });
  const restored = restoreGameState(snapshot(state));
  deepEqual(restored.input, state.input);
});

test("focus and held state are owned by the input section", () => {
  const state = createInputSection();
  applyInputEvent(state, { kind: "key", name: "LEFT", code: "ArrowLeft", char: null, down: true });
  equal(state.held.LEFT, true);
  equal(state.held.ArrowLeft, true);
  applyInputEvent(state, { kind: "focus", state: "lost" });
  equal(state.focused, false);
  applyInputEvent(state, { kind: "focus", state: "gained" });
  equal(state.focused, true);
  deepEqual(state.pointer, { x: 0, y: 0, buttons: 0 });
});
