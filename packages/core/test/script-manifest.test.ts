import { deepEqual, equal } from "node:assert/strict";
import { test } from "node:test";
import {
  applyPluginManifestPatch,
  assembleCommands,
  ENGINE_DEFAULT_MANIFEST,
  parsePluginManifest,
  type BuiltinSpec,
  type Logger,
} from "../src/index.ts";

const logger: Logger = { debug: () => {}, info: () => {}, warn: () => {}, error: () => {} };

function command(name: string, call: BuiltinSpec["call"]): BuiltinSpec {
  return { name, aliases: [], params: [], call };
}

test("the default manifest is core and catalogue followed by owner/native packs", () => {
  deepEqual(ENGINE_DEFAULT_MANIFEST.map((entry) => entry.id), [
    "core",
    "catalogue",
    "world",
    "render",
    "gsmisc",
    "triuken",
    "filereadwrite",
    "proplug",
    "xfmwin",
    "kaimu",
    "twbutton",
  ]);
});

test("manifest patch applies append, disable, replace and remove by id", () => {
  const base = [{ id: "core" }, { id: "catalogue" }] as const;
  const result = applyPluginManifestPatch(base, [
    { op: "append", entry: { id: "game", options: { timeout: 3 } } },
    { op: "replace", id: "game", entry: { id: "game.v2", enabled: true } },
    { op: "disable", id: "catalogue" },
    { op: "remove", id: "game.v2" },
  ], "game.tkr/plugins");
  deepEqual(result.manifest, [{ id: "core" }, { id: "catalogue", enabled: false }]);
  equal(result.diagnostics.length, 0);
});

test("reorder must retain every id and cannot move the pinned core layer", () => {
  const base = [{ id: "core" }, { id: "catalogue" }] as const;
  const valid = applyPluginManifestPatch(base, [
    { op: "append", entry: { id: "game" } },
    { op: "reorder", ids: ["core", "game", "catalogue"] },
  ]);
  deepEqual(valid.manifest.map((entry) => entry.id), ["core", "game", "catalogue"]);
  const invalid = applyPluginManifestPatch(base, [
    { op: "reorder", ids: ["catalogue", "core"] },
  ], "main/plugins");
  deepEqual(invalid.manifest, base);
  equal(invalid.diagnostics[0]?.code, "manifest.core-pinned");
  equal(invalid.diagnostics[0]?.path, "main/plugins");
  equal(invalid.diagnostics[0]?.index, 0);
});

test("remove, disable and replace of core are refused with located diagnostics", () => {
  const result = applyPluginManifestPatch(ENGINE_DEFAULT_MANIFEST, [
    { op: "remove", id: "core" },
    { op: "disable", id: "core" },
    { op: "replace", id: "core", entry: { id: "other" } },
  ]);
  deepEqual(result.manifest, ENGINE_DEFAULT_MANIFEST);
  deepEqual(result.diagnostics.map((item) => item.code), [
    "manifest.core-pinned",
    "manifest.core-pinned",
    "manifest.core-pinned",
  ]);
});

test("unknown and duplicate ids are diagnosed without ambiguous assembly", () => {
  const result = applyPluginManifestPatch(ENGINE_DEFAULT_MANIFEST, [
    { op: "remove", id: "missing" },
    { op: "append", entry: { id: "catalogue" } },
    { op: "reorder", ids: ["core", "catalogue", "catalogue"] },
  ]);
  deepEqual(result.manifest, ENGINE_DEFAULT_MANIFEST);
  equal(result.diagnostics.length >= 3, true);
});

test("manifest parser rejects unknown fields and non-plain options at their entry", () => {
  const parsed = parsePluginManifest([
    { id: "one", unexpected: true },
    { id: "two", options: { value: undefined } },
  ], "project/main");
  equal(parsed.manifest, null);
  deepEqual(parsed.diagnostics.map((item) => [item.code, item.index, item.path]), [
    ["manifest.unknown-field", 0, "project/main"],
    ["manifest.options", 1, "project/main"],
  ]);
});

test("resolved layer options are injected only into the owning command view", () => {
  let seen: unknown;
  const base = command("probe", (view) => {
    seen = view.options;
    return { value: "base" };
  });
  const registry = assembleCommands([
    { definition: { id: "core", version: "1", commands: [base] } },
    { definition: { id: "game", version: "1", commands: [] }, options: { speed: 2 } },
  ], logger);
  const resolved = registry.get("probe")!;
  resolved.spec.call({ rng: { nextUint32: () => 0 }, clock: { tick: () => 0 } }, [], resolved.next);
  equal(seen, undefined);

  const configured = assembleCommands([
    { definition: { id: "core", version: "1", commands: [base] }, options: { core: true } },
  ], logger).get("probe")!;
  configured.spec.call({ rng: { nextUint32: () => 0 }, clock: { tick: () => 0 } }, [], configured.next);
  deepEqual(seen, { core: true });
});
