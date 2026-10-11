import { test } from "node:test";
import { equal } from "node:assert/strict";
import * as synth from "../src/index.ts";

test("the public entry exports nothing yet", () => {
  equal(Object.keys(synth).length, 0);
});
