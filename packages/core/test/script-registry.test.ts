// The plugin registry and the functional command contract (AD-8; ADR 0004
// decisions 2 and 6): layer order with `next`, the override and no-next
// warnings, the one rejection, the four tiers, by-ref write-back through a
// program and a restored snapshot, purity, the stamped effect log and the
// request handling (entry 9: the VM parks the thread and records the request).
import { deepEqual, equal } from "node:assert/strict";
import { test } from "node:test";
import {
  advanceScriptTick,
  assembleCommands,
  canon,
  createCommandLookup,
  createGameState,
  createScriptServices,
  restoreGameState,
  snapshot,
  startProgram,
  TIER_ORDER,
  type Arg,
  type BuiltinSpec,
  type CommandView,
  type GameState,
  type LogRecord,
  type Logger,
  type PluginDefinition,
  type ResolvedCommand,
  type ScriptError,
  type TierLookup,
} from "../src/index.ts";
import { advanceOrFail } from "./script-failures.ts";

/** A view that draws nothing, so a test can prove a command used no port. */
const FIXTURE_VIEW: CommandView = { rng: { nextUint32: () => 0 }, clock: { tick: () => 0 } };

function makeState(program: string): GameState {
  const state = createGameState({ seed: 0 });
  startProgram(state.vm, { kind: "inline", text: program, compiler: "2" });
  return state;
}

function errorOf(run: () => unknown): { code: string; message: string } {
  try {
    run();
  } catch (error) {
    const scriptError = error as ScriptError;
    equal(typeof scriptError.code, "string");
    return { code: scriptError.code, message: scriptError.message };
  }
  throw new Error("expected the call to throw");
}

function thrownMessage(run: () => unknown): string {
  try {
    run();
  } catch (error) {
    return (error as Error).message;
  }
  throw new Error("expected the call to throw");
}

function collectingLogger(): { logger: Logger; records: LogRecord[] } {
  const records: LogRecord[] = [];
  const logger: Logger = {
    debug(record) {
      records.push(record);
    },
    info(record) {
      records.push(record);
    },
    warn(record) {
      records.push(record);
    },
    error(record) {
      records.push(record);
    },
  };
  return { logger, records };
}

function pack(id: string, commands: readonly BuiltinSpec[]): PluginDefinition {
  return { id, version: "1.0.0", commands };
}

function noParamsSpec(name: string, call: BuiltinSpec["call"]): BuiltinSpec {
  return { name, aliases: [], params: [], call };
}

test("the later layer of a repeated name runs first, next reaches the earlier one, and one warning is logged", () => {
  const base = noParamsSpec("each", () => ({ value: 1 }));
  const top: BuiltinSpec = {
    name: "each",
    aliases: [],
    params: [],
    call: (view, args, next) => ({ value: (next(view, args, next).value as number) + 10 }),
  };
  const { logger, records } = collectingLogger();

  const registry = assembleCommands([pack("core", [base]), pack("overlay", [top])], logger);
  const resolved = registry.get("each");
  equal(resolved !== undefined, true);
  equal(resolved!.spec.call(FIXTURE_VIEW, [], resolved!.next).value, 11);

  equal(records.length, 1);
  equal(records[0]!.level, "warn");
  equal(records[0]!.code, "command.overridden");
  deepEqual(records[0]!.data, {
    name: "each",
    kind: "plugin",
    previous: "core",
    replacement: "overlay",
  });
});

test("a wrapper that calls next and edits its result wins; one that ignores next replaces the command", () => {
  const base = noParamsSpec("each", () => ({ value: 1 }));
  const edit: BuiltinSpec = {
    name: "each",
    aliases: [],
    params: [],
    call: (view, args, next) => {
      const below = next(view, args, next);
      return { value: (below.value as number) * 3, out: [[0, 7]] };
    },
  };
  const replace = noParamsSpec("each", () => ({ value: 42 }));
  const { logger } = collectingLogger();

  const editing = assembleCommands([pack("core", [base]), pack("overlay", [edit])], logger);
  const edited = editing.get("each")!;
  deepEqual(edited.spec.call(FIXTURE_VIEW, [], edited.next), { value: 3, out: [[0, 7]] });

  const replaced = assembleCommands([pack("core", [base]), pack("overlay", [replace])], logger);
  const ignoring = replaced.get("each")!;
  deepEqual(ignoring.spec.call(FIXTURE_VIEW, [], ignoring.next), { value: 42 });
});

test("an alias equal to a lower command's name takes the override rule and one warning", () => {
  const base = noParamsSpec("sleep", () => ({ value: "core" }));
  const aliased: BuiltinSpec = { ...noParamsSpec("rest", () => ({ value: "overlay" })), aliases: ["sleep"] };
  const { logger, records } = collectingLogger();

  const registry = assembleCommands([pack("core", [base]), pack("overlay", [aliased])], logger);
  equal(registry.get("sleep")!.spec.call(FIXTURE_VIEW, [], registry.get("sleep")!.next).value, "overlay");
  equal(registry.get("rest")!.spec.call(FIXTURE_VIEW, [], registry.get("rest")!.next).value, "overlay");

  equal(records.length, 1);
  deepEqual(records[0]!.data, {
    name: "sleep",
    kind: "plugin",
    previous: "core",
    replacement: "overlay",
  });
  deepEqual([...registry.keys()], ["sleep", "rest"]);
});

test("one plugin repeating a name or alias within itself is rejected, naming the plugin", () => {
  const first = noParamsSpec("each", () => ({ value: 1 }));
  const repeated: BuiltinSpec = { ...noParamsSpec("other", () => ({ value: 2 })), aliases: ["each"] };
  const { logger } = collectingLogger();

  const message = thrownMessage(() => assembleCommands([pack("broken", [first, repeated])], logger));
  equal(message.includes("broken"), true);
  equal(message.includes("each"), true);
  equal(message.includes("more than once"), true);
});

test("the tiers resolve in AD-8's order: redirect, script function, built-in, extension", () => {
  deepEqual([...TIER_ORDER], ["redirect", "scriptFunction", "builtin", "extension"]);
  const seen: string[] = [];
  const tierFor = (first: string, tier: string): TierLookup => {
    return (name) => {
      seen.push(tier);
      if (tier !== first) return undefined;
      return {
        spec: noParamsSpec(name, () => ({ value: tier })),
        next: () => ({ value: null }),
      };
    };
  };

  for (const first of TIER_ORDER) {
    seen.length = 0;
    const lookup = createCommandLookup({
      redirect: tierFor(first, "redirect"),
      scriptFunction: tierFor(first, "scriptFunction"),
      builtin: tierFor(first, "builtin"),
      extension: tierFor(first, "extension"),
    });
    const hit = lookup.get("each");
    equal(hit!.spec.call(FIXTURE_VIEW, [], hit!.next).value, first);
    deepEqual(seen, [...TIER_ORDER].slice(0, TIER_ORDER.indexOf(first) + 1));
  }

  // The stubs the VM leaves unwired resolve nothing, so entry 8, 5/6 and 21/22
  // can fill them without changing the order.
  equal(createCommandLookup({}).get("each"), undefined);
});

test("next with no layer below returns the empty result and warns once per call", () => {
  const only: BuiltinSpec = {
    name: "each",
    aliases: [],
    params: [],
    call: (view, args, next) => next(view, args, next),
  };
  const { logger, records } = collectingLogger();

  const registry = assembleCommands([pack("A", [only])], logger);
  const resolved = registry.get("each")!;

  deepEqual(resolved.spec.call(FIXTURE_VIEW, [], resolved.next), { value: null });
  deepEqual(resolved.spec.call(FIXTURE_VIEW, [], resolved.next), { value: null });
  equal(records.length, 2);
  equal(records[0]!.code, "command.no-next");
  equal(records[0]!.level, "warn");
  deepEqual(records[0]!.data, { name: "each" });
});

test("a command that uses neither port is pure over the same view and args", () => {
  let draws = 0;
  let ticks = 0;
  const view: CommandView = {
    rng: {
      nextUint32() {
        draws += 1;
        return 1;
      },
    },
    clock: {
      tick() {
        ticks += 1;
        return 3;
      },
    },
  };
  const pure: BuiltinSpec = {
    name: "pure",
    aliases: [],
    params: [{ name: "a", optional: false, byRef: true, variadic: false }],
    call: () => ({ value: 2, out: [[0, 4]], effects: [{ kind: "pure", args: [1, "a"] }] }),
  };
  const { logger } = collectingLogger();
  const registry = assembleCommands([pack("test.pure", [pure])], logger);
  const resolved: ResolvedCommand = registry.get("pure")!;
  const args: readonly Arg[] = [{ value: 5, ref: null }];

  const first = resolved.spec.call(view, args, resolved.next);
  const second = resolved.spec.call(view, args, resolved.next);
  deepEqual(first, second);
  deepEqual(first, { value: 2, out: [[0, 4]], effects: [{ kind: "pure", args: [1, "a"] }] });
  equal(draws, 0);
  equal(ticks, 0);
  deepEqual(args, [{ value: 5, ref: null }]);
});

test("a by-ref out writes the caller's variable, including from a snapshot taken before the call", () => {
  const writer: BuiltinSpec = {
    name: "writev",
    aliases: [],
    params: [{ name: "target", optional: false, byRef: true, variadic: false }],
    call: () => ({ value: null, out: [[0, 9]] }),
  };
  const plugins = [pack("test.writev", [writer])];

  const state = makeState("writev(v)\n");
  const before = snapshot(state);
  advanceScriptTick(state, createScriptServices(state, plugins));
  equal(state.vm.globals.v, 9);

  const restored = restoreGameState(before);
  advanceScriptTick(restored, createScriptServices(restored, plugins));
  equal(restored.vm.globals.v, 9);
  equal(canon(restored), canon(state));
});

test("the VM stamps a command's effects into the vm section's effect log", () => {
  const shout: BuiltinSpec = {
    name: "shout",
    aliases: [],
    params: [],
    call: () => ({ value: null, effects: [{ kind: "state-write", section: "ui" }] }),
  };
  const plugins = [pack("test.shout", [shout])];

  const state = makeState("shout()\n");
  advanceScriptTick(state, createScriptServices(state, plugins));

  deepEqual(state.vm.effects, [
    {
      seq: 1,
      tick: 0,
      thread: 1,
      name: "shout",
      kind: "state-write",
      args: [],
      out: {},
      result: null,
      patch: { section: "ui", path: [], op: "merge", value: null },
      wait: null,
      request: null,
    },
  ]);
  equal(state.vm.effectSeq, 1);
  equal(canon(state).includes("shout"), true);
});

test("a request is accepted by the registry unmodified and parked by the VM", () => {
  const ask: BuiltinSpec = {
    name: "ask",
    aliases: [],
    params: [],
    call: () => ({
      value: null,
      request: { kind: "asset", key: { area: "files", path: "a.txt" } },
      then: { command: "ask.done", args: ["a.txt"] },
    }),
  };
  const plugins = [pack("test.ask", [ask])];
  const { logger } = collectingLogger();
  const resolved = assembleCommands(plugins, logger).get("ask")!;

  const result = resolved.spec.call(FIXTURE_VIEW, [], resolved.next);
  deepEqual(result.request, { kind: "asset", key: { area: "files", path: "a.txt" } });
  deepEqual(result.then, { command: "ask.done", args: ["a.txt"] });

  const state = makeState("ask()\n");
  advanceScriptTick(state, createScriptServices(state, plugins));
  const thread = state.vm.threads[0]!;
  equal(thread.status, "waiting");
  equal(thread.wait?.kind, "request");
  equal(state.vm.requestSeq, 1);
  deepEqual(state.vm.effects[0]!.request, {
    kind: "asset",
    key: { area: "files", path: "a.txt" },
    reqId: 1,
  });
});

test("a name no tier resolves is still unknown.command, and core stays the default pack", () => {
  const unknown = makeState("nope()\n");
  equal(
    errorOf(() => advanceOrFail(unknown, createScriptServices(unknown))).code,
    "unknown.command",
  );

  const tracer = makeState("count = 2\nsleep(count)\nend()\n");
  advanceScriptTick(tracer, createScriptServices(tracer));
  equal(tracer.vm.threads[0]!.status, "waiting");
  deepEqual(tracer.vm.threads[0]!.wait, {
    kind: "sleep",
    global: true,
    until: 2,
    resumesCall: true,
  });
});
