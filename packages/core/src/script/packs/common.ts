/** Shared deterministic command definitions for first-party render/world packs. */
import type { PlainData } from "../../ports/plain-data.ts";
import type { BuiltinSpec } from "../builtins.ts";
import type { CommandEffect, PluginDefinition } from "../plugin.ts";

export function effectCommand(
  name: string,
  section: "world" | "camera" | "fx" | "ui" | "surfaces",
  kind: CommandEffect["kind"] = "state-write",
  alias?: string,
): BuiltinSpec {
  const textDoc = name === "text";
  return {
    name,
    aliases: alias === undefined ? [] : [alias],
    params: [{ name: "args", optional: true, byRef: false, variadic: true }],
    doc: {
      summary: textDoc
        ? "Draw text on the current screen."
        : `${name} applies a deterministic ${section} command to the current game state.`,
      behaviour: textDoc
        ? "Draws text on a grid of square cells as wide and tall as the current font size, counting from cell (1, 1) at the top left. Technically, each coordinate is truncated toward zero and maps to the pixel origin ((x - 1) × size, (y - 1) × size); a newline moves down one cell row (size pixels), text outside the surface is clipped, and glyph layout uses the current FontRef metrics. The call records one ui effect and does not wait."
        : `The command records one ${kind} effect for ${section}; arguments are retained in source order and the call does not wait.`,
      groups: [section],
      waits: { kind: "never", summary: "The command completes in the current script turn." },
      effects: kind === "pure" ? [] : [section],
      tags: ["legacy"],
    },
    call: (_view, args) => ({
      value: null,
      effects: [{ kind, ...(kind === "pure" ? {} : { section }), args: args.map((arg) => arg.value as PlainData) }],
    }),
  };
}

export function pack(id: string, summary: string, commands: readonly BuiltinSpec[]): PluginDefinition {
  return { id, version: "1.0.0", doc: { summary, groups: [] }, commands };
}
