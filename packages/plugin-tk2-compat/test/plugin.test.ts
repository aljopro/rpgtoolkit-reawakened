import { deepEqual, equal, throws } from "node:assert/strict";
import { test } from "node:test";
import { TK2_COMPAT_PLUGIN } from "../src/index.ts";

test("TK2 compatibility pack exposes the manifest id and required commands", () => {
  equal(TK2_COMPAT_PLUGIN.id, "tk2");
  const names = new Set(TK2_COMPAT_PLUGIN.commands.flatMap((command) => [command.name, ...command.aliases]));
  for (const name of ["empty", "fbranch", "setimage", "walkspeed", "itemwalkspeed", "newplyr", "httpread", "ftpconnect"]) {
    equal(names.has(name), true, name);
  }
});

test("signature adapters validate SetImage and convert named speeds", () => {
  const image = TK2_COMPAT_PLUGIN.commands.find((command) => command.name === "setimage");
  if (image === undefined) throw new Error("setimage command missing");
  equal(image.params.length, 5);
  const result = image.call({} as never, [
    { value: "title.gif", ref: null }, { value: 0, ref: null }, { value: 0, ref: null },
    { value: 32, ref: null }, { value: 32, ref: null },
  ], () => ({ value: null }));
  deepEqual(result.effects?.[0]?.args, ["title.gif", 0, 0, 32, 32]);

  const speed = TK2_COMPAT_PLUGIN.commands.find((command) => command.name === "walkspeed");
  if (speed === undefined) throw new Error("walkspeed command missing");
  const converted = speed.call({} as never, [{ value: "Fast", ref: null }], (_view, args) => ({ value: args[0]?.value ?? null }));
  equal(converted.value, 3);
  throws(() => speed.call({} as never, [{ value: "unknown", ref: null }], () => ({ value: null })), /unknown TK2 speed/);
});

test("unmapped plugin commands fail safely without host I/O", () => {
  const command = TK2_COMPAT_PLUGIN.commands.find((item) => item.name === "httpread");
  if (command === undefined) throw new Error("httpread command missing");
  throws(() => command.call({} as never, [], () => ({ value: null })), /no native implementation/);
});
