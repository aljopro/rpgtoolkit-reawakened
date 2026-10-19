// Package namespaces and name resolution (PKG-4; FUN-8; entry 19.7), through the
// manifest-resolving script host: `namespace.name(...)` reaches that package's own
// layer, the plain call goes to the last package in manifest order (AD-8) with one
// `command.overridden` warning, another manifest order gives another fixed answer,
// and a package left out of the manifest leaves the earlier binding.
import { deepEqual, equal } from "node:assert/strict";
import { test } from "node:test";
import { TextEncoder } from "node:util";
import {
  assetKey,
  createAssetIndex,
  ENGINE_DEFAULT_MANIFEST,
  PACKAGE_ROOT,
  type BuiltinSpec,
  type LogRecord,
  type PluginDefinition,
  type PluginManifest,
  type PluginManifestPatch,
  type ProgramLoader,
} from "@tk-reawakened/core";
import { createScriptHost, restoreScriptHost, type ScriptHost } from "../src/index.ts";

function command(name: string, call: BuiltinSpec["call"]): BuiltinSpec {
  return { name, aliases: [], params: [], call };
}

/** A package whose `greet` answers `value`, plus an `only` command nothing else supplies. */
function greeter(id: string, value: number): PluginDefinition {
  return {
    id,
    version: "1",
    commands: [command("greet", () => ({ value })), command(`only${id}`, () => ({ value: value * 100 }))],
  };
}

const ALPHA = greeter("alpha", 1);
const BETA = greeter("beta", 2);
/** Wraps `greet` and passes the call to the layer below itself, times ten. */
const GAMMA: PluginDefinition = {
  id: "gamma",
  version: "1",
  commands: [command("greet", (view, args, next) => ({ value: (next(view, args, next).value as number) * 10 }))],
};

const DEFINITIONS = [ALPHA, BETA, GAMMA];

function manifestOf(...ids: readonly string[]): PluginManifest {
  return [...ENGINE_DEFAULT_MANIFEST, ...ids.map((id) => ({ id, version: "1" }))];
}

type Run = { readonly host: ScriptHost; readonly records: LogRecord[]; readonly diagnostics: { code: string; message: string }[] };

function run(
  program: string,
  ids: readonly string[],
  options: { readonly patch?: PluginManifestPatch; readonly loader?: ProgramLoader; readonly ticks?: number } = {},
): Run {
  const records: LogRecord[] = [];
  const host = createScriptHost({
    program,
    seed: 0,
    manifest: manifestOf(...ids),
    plugins: DEFINITIONS,
    ...(options.patch === undefined ? {} : { patch: options.patch }),
    ...(options.loader === undefined ? {} : { loader: options.loader }),
    sinks: [(record) => records.push(record)],
  });
  const diagnostics: { code: string; message: string }[] = [];
  for (let tick = 0; tick < (options.ticks ?? 3); tick += 1) {
    for (const item of host.advance(1, []).diagnostics) diagnostics.push({ code: item.code, message: item.message });
  }
  return { host, records, diagnostics };
}

/** The `command.overridden` warnings about one name, in the order raised. */
function overrides(records: readonly LogRecord[], name: string): readonly LogRecord[] {
  return records.filter((record) => record.code === "command.overridden" && record.message.startsWith(`"${name}" is defined by`));
}

function globalsOf(host: ScriptHost): Record<string, unknown> {
  return host.state().vm.globals;
}

const PROGRAM = "plain = greet()\nfromalpha = alpha.greet()\nfrombeta = beta.greet()\n";

test("two packages exporting one name: the later wins the plain call with one warning, ns.name reaches its own package", () => {
  const { host, records, diagnostics } = run(PROGRAM, ["alpha", "beta"]);

  deepEqual(diagnostics, []);
  equal(globalsOf(host).plain, 2, "the later package wins the plain call");
  equal(globalsOf(host).fromalpha, 1, "alpha.greet() reaches alpha even though beta is on top");
  equal(globalsOf(host).frombeta, 2);
  const warned = overrides(records, "greet");
  equal(warned.length, 1, "exactly one override warning, none per qualified call");
  deepEqual(warned[0]!.data, { name: "greet", kind: "plugin", previous: "alpha", replacement: "beta" });
});

test("the same packages in the other manifest order give the other, equally fixed result", () => {
  const first = run(PROGRAM, ["beta", "alpha"]);
  const again = run(PROGRAM, ["beta", "alpha"]);

  equal(globalsOf(first.host).plain, 1);
  equal(globalsOf(first.host).fromalpha, 1);
  equal(globalsOf(first.host).frombeta, 2);
  deepEqual(overrides(first.records, "greet").map((record) => record.data), [
    { name: "greet", kind: "plugin", previous: "beta", replacement: "alpha" },
  ]);
  equal(first.host.stateHash(), again.host.stateHash(), "deterministic across two runs");
});

test("a package removed from the manifest leaves the earlier binding, and its namespace is gone", () => {
  const removed = run("plain = greet()\nfromalpha = alpha.greet()\n", ["alpha", "beta"], {
    patch: [{ op: "remove", id: "beta" }],
  });

  deepEqual(removed.diagnostics, []);
  equal(globalsOf(removed.host).plain, 1, "the earlier package's binding is the one a plain call reaches again");
  equal(globalsOf(removed.host).fromalpha, 1);
  equal(overrides(removed.records, "greet").length, 0, "nothing overrides it any more");

  const gone = run("x = beta.greet()\n", ["alpha", "beta"], { patch: [{ op: "remove", id: "beta" }] });
  equal(gone.diagnostics.length, 1);
  equal(gone.diagnostics[0]!.code, "include.missing", "no namespace and no file: the file path reports the missing qualifier");
});

test("a disabled package contributes neither a layer nor a namespace", () => {
  const { host, diagnostics } = run("plain = greet()\nfromalpha = alpha.greet()\n", ["alpha", "beta"], {
    patch: [{ op: "disable", id: "beta" }],
  });

  deepEqual(diagnostics, []);
  equal(globalsOf(host).plain, 1);
});

test("a wrapper package's namespaced call reaches the layer below it, and the plain call runs the wrapper", () => {
  const { host, records, diagnostics } = run(
    "plain = greet()\nviagamma = gamma.greet()\nviabeta = beta.greet()\nviaalpha = alpha.greet()\n",
    ["alpha", "beta", "gamma"],
  );

  deepEqual(diagnostics, []);
  equal(globalsOf(host).plain, 20, "gamma wraps beta, the layer below it");
  equal(globalsOf(host).viagamma, 20);
  equal(globalsOf(host).viabeta, 2);
  equal(globalsOf(host).viaalpha, 1);
  equal(overrides(records, "greet").length, 2, "one warning for each override step, nothing per call");
});

test("a package that supplies nothing under the name is unknown.command, not a fallback to another package", () => {
  const { host, diagnostics } = run("a = alpha.onlybeta()\nb = 5\n", ["alpha", "beta"]);

  equal(diagnostics.length, 1);
  equal(diagnostics[0]!.code, "unknown.command");
  equal(diagnostics[0]!.message.includes("alpha"), true);
  equal(diagnostics[0]!.message.includes("onlybeta"), true);
  equal(globalsOf(host).a, 0, "the failed call stored nothing");
  equal(run("a = beta.onlybeta()\n", ["alpha", "beta"]).host.state().vm.globals.a, 200);
});

test("a declared namespace is the qualifier, and the qualifier is case-folded", () => {
  const records: LogRecord[] = [];
  const host = createScriptHost({
    program: "a = al.greet()\nb = AL.greet()\n",
    seed: 0,
    manifest: [...ENGINE_DEFAULT_MANIFEST, { id: "alpha", version: "1", namespace: "Al" }],
    plugins: [ALPHA],
    sinks: [(record) => records.push(record)],
  });
  deepEqual(host.advance(1, []).diagnostics, []);
  equal(globalsOf(host).a, 1);
  equal(globalsOf(host).b, 1);
});

test("a live object under the namespace's name keeps the object-first rule; a namespace wins over a file", () => {
  const object = run("alpha = { greet: () => 55 }\nx = alpha.greet()\n", ["alpha", "beta"]);
  deepEqual(object.diagnostics, []);
  equal(globalsOf(object.host).x, 55);

  const bytes = new Map<string, Uint8Array>([
    [assetKey("Prg/alpha.prg"), new TextEncoder().encode("function greet() {\n  return 77\n}\n")],
  ]);
  const loader: ProgramLoader = {
    index: createAssetIndex(["Prg/alpha.prg"]),
    root: PACKAGE_ROOT,
    read: (key) => bytes.get(key),
  };
  const file = run("a = alpha.greet()\nb = alpha.greet()\n", ["alpha", "beta"], { loader });
  deepEqual(file.diagnostics, []);
  equal(globalsOf(file.host).a, 1, "the package, not the file");
  equal(globalsOf(file.host).b, 1);
  const hidden = file.records.filter((record) => record.code === "namespace.hides-file");
  equal(hidden.length, 1, "one warning for the namespace and file, however many calls");
  deepEqual(hidden[0]!.data, { namespace: "alpha", file: "alpha.prg" });
});

test("a parameter qualifier is a local, never a namespace", () => {
  const { host, diagnostics } = run(
    "function pick(alpha) {\n  return alpha.greet()\n}\nobj = { greet: () => 9 }\nx = pick(obj)\n",
    ["alpha", "beta"],
  );

  deepEqual(diagnostics, []);
  equal(globalsOf(host).x, 9);
});

test("a save holds no namespace: a host restored over the same manifest keeps resolving ns.name and matches tick by tick", () => {
  const program = "a = alpha.greet()\nsleep(2)\nb = beta.greet()\nc = greet()\n";
  const manifest = manifestOf("alpha", "beta");
  const original = createScriptHost({ program, seed: 0, manifest, plugins: DEFINITIONS });
  original.advance(1, []);
  const json = original.snapshot();
  equal(json.includes("namespace"), false, "no namespace is written into the save");

  const restored = restoreScriptHost(json, { manifest, plugins: DEFINITIONS });
  equal(restored.stateHash(), original.stateHash());
  for (let tick = 0; tick < 4; tick += 1) {
    original.advance(1, []);
    restored.advance(1, []);
    equal(restored.stateHash(), original.stateHash(), `tick ${tick}`);
  }
  equal(globalsOf(restored).b, 2);
  equal(globalsOf(restored).c, 2);
});
