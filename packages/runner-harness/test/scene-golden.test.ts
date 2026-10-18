import { equal } from "node:assert/strict";
import test from "node:test";
import { checkSceneGoldens } from "../src/scene-golden.ts";

test("scene golden replay rejects a ledger row without a scene descriptor", () => {
  const ledgerText = JSON.stringify({
    schema: 1,
    goldens: [{
      path: "golden/reference/ORPHAN.png",
      scene: "ORPHAN",
      class: "independent-reference",
      gating: true,
      producer: "test",
    }],
  });
  const result = checkSceneGoldens([], ledgerText);
  equal(result.ok, false);
  equal(result.lines[0], "ORPHAN: ledger scene is missing");
});
