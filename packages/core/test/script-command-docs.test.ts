import { deepEqual, equal } from "node:assert/strict";
import { test } from "node:test";
import {
  advanceScriptTick,
  commandDocumentation,
  createGameState,
  createScriptServices,
  hashState,
  startProgram,
  type BuiltinSpec,
  type PluginDefinition,
  validateCommandDocumentation,
} from "../src/index.ts";
const call = () => ({ value: null });

function plugin(command: BuiltinSpec): PluginDefinition {
  return { id: "fixture.docs", version: "1.0.0", commands: [command] };
}

function resolved(definition: PluginDefinition) {
  return [{ definition }];
}

test("projection copies docs, parameters and aliases as deterministic plain data", () => {
  const definition = plugin({
    name: "measure",
    aliases: ["m"],
    params: [{ name: "distance", optional: false, byRef: false, variadic: false, unit: "pixels", doc: "Distance to measure." }],
    call,
    doc: {
      summary: "Measure a distance.",
      behaviour: "Returns the distance in pixels without waiting.",
      examples: ["x = measure(4)"],
    },
  });
  deepEqual(commandDocumentation(resolved(definition)), [
    {
      pluginId: "fixture.docs",
      pluginVersion: "1.0.0",
      canonicalName: "measure",
      name: "measure",
      aliases: ["m"],
      params: [{ name: "distance", optional: false, byRef: false, variadic: false, unit: "pixels", doc: "Distance to measure." }],
      summary: "Measure a distance.",
      behaviour: "Returns the distance in pixels without waiting.",
      examples: ["x = measure(4)"],
      status: "current",
    },
    {
      pluginId: "fixture.docs",
      pluginVersion: "1.0.0",
      canonicalName: "measure",
      name: "m",
      aliases: ["m"],
      params: [{ name: "distance", optional: false, byRef: false, variadic: false, unit: "pixels", doc: "Distance to measure." }],
      summary: "Measure a distance.",
      behaviour: "Returns the distance in pixels without waiting.",
      examples: ["x = measure(4)"],
      status: "legacy-alias",
    },
  ]);
});

test("missing transitional documentation is explicit null output and allowlist-exempt", () => {
  const definition = plugin({ name: "oldcommand", aliases: [], params: [], call });
  const entries = commandDocumentation(resolved(definition));
  equal(entries[0]?.summary, null);
  equal(entries[0]?.behaviour, null);
  equal(entries[0]?.status, null);
  equal(validateCommandDocumentation(resolved(definition), [], ["fixture.docs/oldcommand"]).length, 0);
  equal(validateCommandDocumentation(resolved(definition), [], []).some((item) => item.code === "doc.required"), true);
});

test("validator reports partial docs, native summary drift and obsolete status", () => {
  const definition = plugin({
    name: "obsolete",
    aliases: ["old"],
    params: [],
    call,
    doc: { summary: "Wrong", behaviour: "It does something." },
  });
  const diagnostics = validateCommandDocumentation(resolved(definition), [
    { name: "obsolete", purpose: "Obsolete.", obsolete: true, section: "Test" },
    { name: "old", purpose: "Obsolete.", aliasOf: "obsolete", obsolete: true, section: "Test" },
  ], []);
  equal(diagnostics.some((item) => item.code === "native.summary-mismatch"), true);
  equal(diagnostics.some((item) => item.code === "native.status"), true);
});

test("projection preserves plugin and declaration order including overridden layers", () => {
  const first = plugin({ name: "same", aliases: [], params: [], call, doc: { summary: "First", behaviour: "First." } });
  const second: PluginDefinition = { ...plugin({ name: "same", aliases: [], params: [], call, doc: { summary: "Second", behaviour: "Second." } }), id: "fixture.second" };
  deepEqual(commandDocumentation([...resolved(first), ...resolved(second)]).map((item) => `${item.pluginId}/${item.name}`), [
    "fixture.docs/same",
    "fixture.second/same",
  ]);
});

test("documentation metadata never enters the state hash", () => {
  const withoutDocs = plugin({ name: "doccommand", aliases: [], params: [], call });
  const withDocs = plugin({
    name: "doccommand",
    aliases: [],
    params: [],
    call,
    doc: { summary: "Run a documented command.", behaviour: "Returns no value and does not wait." },
  });
  const run = (definition: PluginDefinition) => {
    const state = createGameState({ seed: 4 });
    startProgram(state.vm, { kind: "inline", text: "doccommand()\nend()\n", compiler: "2" });
    advanceScriptTick(state, createScriptServices(state, resolved(definition)));
    return state;
  };
  equal(hashState(run(withDocs)), hashState(run(withoutDocs)));
});
