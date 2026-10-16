/**
 * Minimal responders for the non-stub 9.11 catalogue (ticket 3.22).
 *
 * The domain owners can replace these layers later. Until then every catalogue
 * name has the real AD-8 shape: waits yield plain data, requests cross the
 * AD-17 boundary, and all other parts are recorded by the VM.
 *
 * Source: docs/spec/engine/rpgcode-functions.md and the discovery catalogue.
 */
import type { PlainData } from "../ports/plain-data.ts";
import type { NamedWaitKind, Wait } from "../ports/wait.ts";
import { MAX_TICK, secondsToTicks } from "../time/time.ts";
import type { BuiltinSpec, ParamSpec } from "./builtins.ts";
import { ScriptError } from "./errors.ts";
import { COMPILER_VERSION } from "./program.ts";
import type { CommandEffect, PluginDefinition } from "./plugin.ts";
import { CATALOGUE_STUBS_PLUGIN } from "./catalogue-stubs.ts";
import type { SectionKey } from "../save/state.ts";
import { toNumberValue, toStringValue } from "./values.ts";
type Row = {
  readonly name: string;
  readonly kind: "mixed" | "wait" | "request" | "spawn-thread" | "flow-control";
  readonly params: string;
  readonly sections: readonly SectionKey[];
  readonly wait: string | null;
  readonly obsolete: boolean;
  readonly byRefOut: boolean;
};

const ROWS: readonly Row[] = [
  { name: "wingraphic", kind: "mixed", params: "file", sections: ["ui"], wait: null, obsolete: false, byRefOut: false },
  { name: "font", kind: "mixed", params: "file", sections: ["ui"], wait: null, obsolete: false, byRefOut: false },
  { name: "textspeed", kind: "mixed", params: "speed", sections: ["ui"], wait: null, obsolete: false, byRefOut: false },
  { name: "prompt", kind: "wait", params: "question[,&dest]", sections: ["ui"], wait: "render.msgbox", obsolete: false, byRefOut: true },
  { name: "msgbox", kind: "wait", params: "...", sections: ["ui"], wait: "render.msgbox", obsolete: false, byRefOut: false },
  { name: "wait", kind: "wait", params: "[&dest]", sections: [], wait: "input.key", obsolete: false, byRefOut: true },
  { name: "get", kind: "mixed", params: "[&dest]", sections: ["input"], wait: null, obsolete: false, byRefOut: true },
  { name: "mouseclick", kind: "wait", params: "&x,&y[,noWait]", sections: [], wait: "input.mouse", obsolete: false, byRefOut: true },
  { name: "scan", kind: "mixed", params: "x,y,layer,&mem", sections: ["world"], wait: null, obsolete: false, byRefOut: false },
  { name: "mem", kind: "mixed", params: "x,y[,layer],mem", sections: ["world"], wait: null, obsolete: false, byRefOut: false },
  { name: "cursormaprun", kind: "wait", params: "...", sections: ["ui"], wait: "input.key", obsolete: false, byRefOut: false },
  { name: "bitmap", kind: "mixed", params: "file[,cnv]", sections: ["surfaces"], wait: null, obsolete: false, byRefOut: false },
  { name: "setimage", kind: "mixed", params: "file,x,y,w,h", sections: ["surfaces"], wait: null, obsolete: false, byRefOut: false },
  { name: "setimagetransparent", kind: "mixed", params: "file,x,y,w,h,r,g,b", sections: ["surfaces"], wait: null, obsolete: false, byRefOut: false },
  { name: "setimagetranslucent", kind: "mixed", params: "file,x,y,w,h[,%]", sections: ["surfaces"], wait: null, obsolete: false, byRefOut: false },
  { name: "setimageadditive", kind: "mixed", params: "file,x,y,w,h,%", sections: ["surfaces"], wait: null, obsolete: false, byRefOut: false },
  { name: "wipe", kind: "mixed", params: "file,effect[,speed]", sections: ["fx"], wait: null, obsolete: false, byRefOut: false },
  { name: "viewbrd", kind: "mixed", params: "file[,x,y[,cnv]]", sections: ["surfaces"], wait: null, obsolete: false, byRefOut: false },
  { name: "send", kind: "mixed", params: "board,x,y[,layer]", sections: ["world","camera","sprites","vm","engine"], wait: null, obsolete: false, byRefOut: false },
  { name: "addplayer", kind: "mixed", params: "file", sections: ["party","inventory"], wait: null, obsolete: false, byRefOut: false },
  { name: "newplayer", kind: "mixed", params: "file", sections: ["party","sprites"], wait: null, obsolete: false, byRefOut: false },
  { name: "activeplayer", kind: "mixed", params: "[handle]", sections: ["party"], wait: null, obsolete: false, byRefOut: false },
  { name: "restoreplayer", kind: "mixed", params: "file", sections: ["party","sprites"], wait: null, obsolete: false, byRefOut: false },
  { name: "playerdirection", kind: "mixed", params: "[h,]dir", sections: ["sprites"], wait: null, obsolete: false, byRefOut: false },
  { name: "playerspeed", kind: "mixed", params: "[h,]speed", sections: ["sprites"], wait: null, obsolete: false, byRefOut: false },
  { name: "playerstance", kind: "mixed", params: "slot[,h]", sections: ["sprites"], wait: null, obsolete: false, byRefOut: false },
  { name: "characterspeed", kind: "mixed", params: "speed", sections: ["sprites"], wait: null, obsolete: false, byRefOut: false },
  { name: "walkspeed", kind: "mixed", params: "fast/slow", sections: ["sprites"], wait: null, obsolete: false, byRefOut: false },
  { name: "createitem", kind: "mixed", params: "file[,mem]", sections: ["sprites"], wait: null, obsolete: false, byRefOut: false },
  { name: "itemdirection", kind: "mixed", params: "[h,]dir", sections: ["sprites"], wait: null, obsolete: false, byRefOut: false },
  { name: "itemspeed", kind: "mixed", params: "[h,]speed", sections: ["sprites"], wait: null, obsolete: false, byRefOut: false },
  { name: "itemstance", kind: "mixed", params: "slot[,h]", sections: ["sprites"], wait: null, obsolete: false, byRefOut: false },
  { name: "push", kind: "mixed", params: "dirs[,h[,flags]]", sections: ["sprites"], wait: "movement", obsolete: false, byRefOut: false },
  { name: "pushitem", kind: "mixed", params: "itemnum,dirs", sections: ["sprites"], wait: null, obsolete: false, byRefOut: false },
  { name: "playerstep", kind: "mixed", params: "h,x,y[,flags]", sections: ["sprites"], wait: "movement", obsolete: false, byRefOut: false },
  { name: "itemstep", kind: "mixed", params: "itemnum,x,y[,flags]", sections: ["sprites"], wait: "movement", obsolete: false, byRefOut: false },
  { name: "playerpath", kind: "mixed", params: "h,flags,\u2026", sections: ["sprites"], wait: "movement", obsolete: false, byRefOut: false },
  { name: "itempath", kind: "mixed", params: "h,flags,\u2026", sections: ["sprites"], wait: "movement", obsolete: false, byRefOut: false },
  { name: "smartstep", kind: "mixed", params: "...", sections: ["sprites"], wait: null, obsolete: false, byRefOut: false },
  { name: "stance", kind: "mixed", params: "slot,handle", sections: ["sprites"], wait: null, obsolete: false, byRefOut: false },
  { name: "posture", kind: "mixed", params: "slot,handle", sections: ["sprites"], wait: null, obsolete: false, byRefOut: false },
  { name: "giveexp", kind: "mixed", params: "h,amount", sections: ["vm","engine"], wait: null, obsolete: false, byRefOut: false },
  { name: "inn", kind: "mixed", params: "", sections: ["vm"], wait: null, obsolete: false, byRefOut: false },
  { name: "equip", kind: "mixed", params: "h,slot,item", sections: ["inventory","vm"], wait: null, obsolete: false, byRefOut: false },
  { name: "remove", kind: "mixed", params: "h,slot", sections: ["inventory","vm"], wait: null, obsolete: false, byRefOut: false },
  { name: "getitemname", kind: "mixed", params: "item,&dest", sections: [], wait: null, obsolete: false, byRefOut: true },
  { name: "getitemdesc", kind: "mixed", params: "item,&dest", sections: [], wait: null, obsolete: false, byRefOut: true },
  { name: "getitemcost", kind: "mixed", params: "item,&dest", sections: [], wait: null, obsolete: false, byRefOut: true },
  { name: "getitemsellprice", kind: "mixed", params: "item,&dest", sections: [], wait: null, obsolete: false, byRefOut: true },
  { name: "callshop", kind: "wait", params: "item1,\u2026", sections: ["menu"], wait: "menu.screen", obsolete: false, byRefOut: false },
  { name: "fight", kind: "mixed", params: "skill,bkg", sections: ["battle","engine"], wait: null, obsolete: false, byRefOut: false },
  { name: "fightenemy", kind: "mixed", params: "e1,\u2026,bkg", sections: ["battle","engine"], wait: null, obsolete: false, byRefOut: false },
  { name: "applystatus", kind: "mixed", params: "h,file", sections: ["battle"], wait: null, obsolete: false, byRefOut: false },
  { name: "fightmenugraphic", kind: "mixed", params: "file", sections: ["ui","battle"], wait: null, obsolete: false, byRefOut: false },
  { name: "menugraphic", kind: "mixed", params: "file", sections: ["ui"], wait: null, obsolete: false, byRefOut: false },
  { name: "mediaplay", kind: "mixed", params: "file", sections: ["audio"], wait: null, obsolete: false, byRefOut: false },
  { name: "wav", kind: "mixed", params: "file[,block]", sections: ["audio"], wait: "audio.sfx", obsolete: false, byRefOut: false },
  { name: "sound", kind: "mixed", params: "file[,block]", sections: ["audio"], wait: "audio.sfx", obsolete: false, byRefOut: false },
  { name: "mp3pause", kind: "mixed", params: "file", sections: ["audio"], wait: null, obsolete: false, byRefOut: false },
  { name: "playavi", kind: "mixed", params: "file", sections: ["engine"], wait: "video", obsolete: false, byRefOut: false },
  { name: "playavismall", kind: "mixed", params: "file", sections: ["engine"], wait: "video", obsolete: false, byRefOut: false },
  { name: "midiplay", kind: "mixed", params: "file", sections: ["audio"], wait: null, obsolete: false, byRefOut: false },
  { name: "playmidi", kind: "mixed", params: "file", sections: ["audio"], wait: null, obsolete: false, byRefOut: false },
  { name: "mp3", kind: "mixed", params: "file", sections: ["audio"], wait: null, obsolete: false, byRefOut: false },
  { name: "animation", kind: "mixed", params: "file,x,y[,persist]", sections: ["fx"], wait: null, obsolete: false, byRefOut: false },
  { name: "sizedanimation", kind: "mixed", params: "file,x,y,xs,ys[,persist]", sections: ["fx"], wait: null, obsolete: false, byRefOut: false },
  { name: "run", kind: "spawn-thread", params: "prg", sections: ["vm"], wait: null, obsolete: false, byRefOut: false },
  { name: "change", kind: "flow-control", params: "prg", sections: ["vm"], wait: null, obsolete: false, byRefOut: false },
  { name: "rpgcode", kind: "flow-control", params: "line", sections: ["vm"], wait: null, obsolete: false, byRefOut: false },
  { name: "delay", kind: "wait", params: "sec", sections: ["vm"], wait: "sleep", obsolete: false, byRefOut: false },
  { name: "done", kind: "flow-control", params: "", sections: ["vm"], wait: null, obsolete: false, byRefOut: false },
  { name: "stop", kind: "flow-control", params: "", sections: ["vm"], wait: null, obsolete: false, byRefOut: false },
  { name: "branch", kind: "flow-control", params: ":label", sections: ["vm"], wait: null, obsolete: false, byRefOut: false },
  { name: "autocommand", kind: "flow-control", params: "...", sections: ["vm"], wait: null, obsolete: false, byRefOut: false },
  { name: "save", kind: "mixed", params: "file", sections: ["engine"], wait: null, obsolete: false, byRefOut: false },
  { name: "load", kind: "mixed", params: "file", sections: ["world","sprites","party","inventory","triggers","vm","battle","menu","ui","camera","fx","audio","surfaces","rng","time"], wait: null, obsolete: false, byRefOut: false },
  { name: "dirsav", kind: "mixed", params: "...", sections: ["menu"], wait: "menu.screen", obsolete: false, byRefOut: false },
  { name: "reset", kind: "flow-control", params: "", sections: ["world","sprites","party","inventory","triggers","vm","battle","menu","ui","camera","fx","audio","surfaces","rng","time"], wait: null, obsolete: false, byRefOut: false },
  { name: "start", kind: "flow-control", params: "file", sections: ["vm","engine"], wait: null, obsolete: false, byRefOut: false },
  { name: "mainfile", kind: "flow-control", params: "gam", sections: ["engine"], wait: null, obsolete: false, byRefOut: false },
  { name: "win", kind: "flow-control", params: "", sections: ["engine"], wait: null, obsolete: false, byRefOut: false },
  { name: "gone", kind: "flow-control", params: "", sections: ["sprites","engine"], wait: null, obsolete: false, byRefOut: false },
  { name: "over", kind: "flow-control", params: "", sections: ["engine"], wait: null, obsolete: false, byRefOut: false },
  { name: "godos", kind: "flow-control", params: "command", sections: ["engine"], wait: null, obsolete: true, byRefOut: false },
  { name: "dos", kind: "flow-control", params: "", sections: ["engine"], wait: null, obsolete: true, byRefOut: false },
  { name: "windows", kind: "flow-control", params: "", sections: ["engine"], wait: null, obsolete: true, byRefOut: false },
  { name: "openfileinput", kind: "request", params: "file,folder", sections: ["engine"], wait: null, obsolete: false, byRefOut: false },
  { name: "openfileoutput", kind: "request", params: "file,folder", sections: ["engine"], wait: null, obsolete: false, byRefOut: false },
  { name: "openfileappend", kind: "request", params: "file,folder", sections: ["engine"], wait: null, obsolete: false, byRefOut: false },
  { name: "openfilebinary", kind: "request", params: "file,folder", sections: ["engine"], wait: null, obsolete: false, byRefOut: false },
  { name: "fileinput", kind: "mixed", params: "handle,&line", sections: [], wait: null, obsolete: false, byRefOut: true },
  { name: "fileprint", kind: "mixed", params: "handle,text", sections: ["engine"], wait: null, obsolete: false, byRefOut: false },
  { name: "fileget", kind: "mixed", params: "handle,&byte", sections: [], wait: null, obsolete: false, byRefOut: true },
  { name: "fileput", kind: "mixed", params: "handle,byte", sections: ["engine"], wait: null, obsolete: false, byRefOut: false },
];

const PARAM_NAMES: Readonly<Record<string, string>> = { "%": "percent", "0/1": "flag", "on/off": "state" };

function params(notation: string, byRefOut: boolean): ParamSpec[] {
  const text = notation.trim();
  if (text === "" || text === "—") return [];
  if (text === "...") return [{ name: "args", optional: true, byRef: false, variadic: true }];
  const result: ParamSpec[] = [];
  let depth = 0;
  let token = "";
  const flush = (): void => {
    const raw = token.trim();
    token = "";
    if (raw === "") return;
    const byRef = raw.startsWith("&");
    const bare = byRef ? raw.slice(1) : raw;
    if (bare === "..." || bare === "…") {
      result.push({ name: "args", optional: true, byRef: false, variadic: true });
      return;
    }
    result.push({ name: PARAM_NAMES[bare] ?? bare, optional: depth > 0, byRef, variadic: false });
  };
  for (const ch of text) {
    if (ch === ",") flush();
    else if (ch === "[") { flush(); depth += 1; }
    else if (ch === "]") { flush(); depth -= 1; }
    else token += ch;
  }
  flush();
  if (byRefOut && result.length > 0 && !result.some((param) => param.variadic)) {
    const last = result.length - 1;
    if (!result[last]!.byRef) result[last] = { ...result[last]!, byRef: true };
  }
  return result;
}

function values(args: readonly { readonly value: unknown }[]): PlainData[] {
  return args.map((arg) => arg.value as PlainData);
}

function makeWait(row: Row, args: readonly { readonly value: unknown; readonly ref: string | null }[], tick: number): Wait {
  const refs = args.filter((arg) => arg.ref !== null).map((arg) => arg.ref!);
  if (row.wait === "sleep") {
    const seconds = toNumberValue(args[0]?.value as never ?? 0);
    const ticks = secondsToTicks(seconds);
    if (ticks === null || ticks < 1 || tick + ticks > MAX_TICK) throw new ScriptError("builtin.bad-arg", `"${row.name}": ${seconds} is not a valid duration`);
    return { kind: "sleep", global: true, until: tick + ticks, resumesCall: true };
  }
  if (row.wait === "movement") return { kind: "movement", global: true, moves: [{ sprite: "script", until: tick + 1 }] };
  if (row.wait === "input.key") return { kind: "input.key", global: true, key: null, resumeRefs: refs };
  return { kind: row.wait as NamedWaitKind, global: true, id: row.name, payload: values(args), resumeRefs: refs };
}

function controlFor(row: Row, args: readonly { readonly value: unknown }[], thread: number | undefined): CommandEffect | null {
  if (row.name === "run") return { kind: "vm.control", args: ["run", { kind: "inline", text: toStringValue(args[0]?.value as never ?? ""), compiler: COMPILER_VERSION }] };
  if (row.name === "rpgcode" && thread !== undefined) return { kind: "vm.control", args: ["threadTell", thread, toStringValue(args[0]?.value as never ?? "")] };
  if (row.name === "branch") return { kind: "vm.control", args: ["jump", toStringValue(args[0]?.value as never ?? "")] };
  if (row.name === "end" || row.name === "done" || row.name === "stop") return { kind: "vm.control", args: ["end"] };
  return null;
}

function makeResponder(row: Row): BuiltinSpec {
  const declared = params(row.params, row.byRefOut);
  return {
    name: row.name,
    aliases: [],
    params: declared,
    call: (view, args) => {
      if (row.obsolete) throw new ScriptError("builtin.obsolete", `"${row.name}" is obsolete: the statement is skipped`);
      const out: (readonly [number, number])[] = [];
      for (let i = 0; i < declared.length; i += 1) if (declared[i]?.byRef && i < args.length) out.push([i, 0]);
      const effects: CommandEffect[] = row.sections.map((section) => ({ kind: row.kind, section }));
      if (effects.length === 0 && row.wait === null && row.kind !== "request") effects.push({ kind: row.kind });
      const control = controlFor(row, args, view.thread);
      if (control !== null) effects.push(control);
      const result: { value: null; out: readonly (readonly [number, number])[]; effects: readonly CommandEffect[]; wait?: Wait; request?: { kind: string; area: string; path: string; folder: string } } = { value: null, out, effects };
      if (row.wait !== null) result.wait = makeWait(row, args, view.clock.tick());
      if (row.kind === "request") result.request = { kind: "asset", area: "files", path: toStringValue(args[0]?.value as never ?? ""), folder: toStringValue(args[1]?.value as never ?? "") };
      return result;
    },
  };
}

/** All 9.11 non-stub responders not already owned by CORE_PLUGIN. */
export const CATALOGUE_RESPONDERS_PLUGIN: PluginDefinition = {
  id: "catalogue-responders",
  version: "1.0.0",
  commands: ROWS.map(makeResponder),
};

/** The default catalogue layer combines the safe stubs and these responders. */
export const CATALOGUE_PLUGIN: PluginDefinition = {
  id: "catalogue",
  version: "1.0.0",
  commands: [...CATALOGUE_STUBS_PLUGIN.commands, ...CATALOGUE_RESPONDERS_PLUGIN.commands],
};
