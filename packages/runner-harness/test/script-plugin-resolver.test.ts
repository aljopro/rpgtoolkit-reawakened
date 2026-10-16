import { deepEqual, equal } from "node:assert/strict";
import { test } from "node:test";
import {
  ENGINE_DEFAULT_MANIFEST,
  type PluginDefinition,
} from "@tk-reawakened/core";
import { resolvePluginManifest } from "../src/index.ts";

const CORE: PluginDefinition = { id: "core", version: "1", commands: [] };
const CATALOGUE: PluginDefinition = { id: "catalogue", version: "1", commands: [] };
const GAME: PluginDefinition = { id: "game", version: "1", commands: [] };

test("host resolver maps ids to definitions and preserves manifest order and options", () => {
  const result = resolvePluginManifest([
    { id: "core" },
    { id: "game", options: { timeout: 4 } },
    { id: "catalogue" },
  ], { core: CORE, catalogue: CATALOGUE, game: GAME }, "game/main");
  deepEqual(result.plugins.map((item) => item.definition.id), ["core", "game", "catalogue"]);
  deepEqual(result.plugins[1]?.options, { timeout: 4 });
  equal(result.diagnostics.length, 0);
});

test("disabled and unresolved ids do not stop the remaining layers", () => {
  const result = resolvePluginManifest([
    ...ENGINE_DEFAULT_MANIFEST,
    { id: "disabled", enabled: false },
    { id: "missing" },
    { id: "game" },
  ], { core: CORE, catalogue: CATALOGUE, game: GAME });
  deepEqual(result.plugins.map((item) => item.definition.id), ["core", "catalogue", "game"]);
  equal(result.diagnostics.length, 1);
  equal(result.diagnostics[0]?.code, "plugin.unresolved");
  equal(result.diagnostics[0]?.index, 3);
});

test("duplicate ids produce a located diagnostic and only one definition", () => {
  const result = resolvePluginManifest([{ id: "core" }, { id: "core" }], { core: CORE });
  equal(result.plugins.length, 1);
  deepEqual(result.diagnostics, [{
    code: "manifest.duplicate-id",
    path: "manifest",
    index: 1,
    message: 'duplicate plugin id "core"',
  }]);
});
