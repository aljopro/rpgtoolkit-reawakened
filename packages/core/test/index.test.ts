import { test } from "node:test";
import { equal } from "node:assert/strict";
import { add } from "../src/index.ts";

test("add sums two numbers", () => {
  equal(add(2, 3), 5);
});
