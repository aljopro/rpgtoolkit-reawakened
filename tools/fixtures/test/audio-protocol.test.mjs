import { test } from "node:test";
import { deepEqual } from "node:assert/strict";
import { check } from "../audio-protocol/generate.mjs";

test("audio protocol vectors are reproducible in check mode", () => {
  deepEqual(check(), []);
});
