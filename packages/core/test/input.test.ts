import { deepEqual, equal } from "node:assert/strict";
import { test } from "node:test";
import { applyInputEvent, createInputSection, inputView, pruneClaimed } from "../src/input/index.ts";
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
