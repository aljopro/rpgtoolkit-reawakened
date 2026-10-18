import type { PlainData } from "../../ports/plain-data.ts";
import type { Wait } from "../../ports/wait.ts";
import { ScriptError } from "../errors.ts";
import type { BuiltinDoc, BuiltinSpec } from "../builtins.ts";
import { effectCommand, pack } from "./common.ts";
import { GRAPHICS_COMMANDS } from "./graphics.ts";
import { validateFxArgument } from "../../render/fx.ts";
import { UI_COMMANDS } from "./ui.ts";

function transitionDoc(summary: string, behaviour: string, wait: string): BuiltinDoc {
  return {
    summary,
    behaviour,
    groups: ["board-tiles-vectors-screen-effects-33"],
    waits: { kind: "ticks", summary: wait },
    see: ["docs/spec/engine/rpgcode-functions.md#e-59"],
  };
}

function sleepWait(viewTick: number, ticks: number): Wait {
  return { kind: "sleep", global: true, until: viewTick + ticks, resumesCall: true };
}

function transition(name: string, params: BuiltinSpec["params"], doc: BuiltinDoc, ticks: (args: readonly { readonly value: unknown }[]) => number): BuiltinSpec {
  return {
    name,
    aliases: [],
    params,
    doc,
    call: (view, args) => {
      validateFxArgument(name, args);
      const values = args.map((arg) => arg.value as PlainData);
      if (name === "fade" && values.length > 0 && typeof values[0] === "number" && (values[0] < 0 || values[0] > 5)) return { value: null };
      return {
        value: null,
        effects: [{ kind: "mixed", section: "fx", args: values }],
        wait: sleepWait(view.clock.tick(), ticks(args)),
      };
    },
  };
}

const FADE = transition(
  "fade",
  [{ name: "type", optional: true, byRef: false, variadic: false }],
  transitionDoc(
    "Play one of the six deterministic screen fades.",
    "Plays the selected growing-box, stripe, grey-ramp, grey-strip, ellipse-ring or colour-overlay effect. Technically, omitted type is 0, valid types are 0 to 5, the effect takes exactly 30 fixed ticks and the script waits; other types do nothing and do not wait.",
    "Blocks for the fixed 30-tick transition.",
  ),
  () => 30,
);

const WIPE = transition(
  "wipe",
  [
    { name: "file", optional: false, byRef: false, variadic: false },
    { name: "effect", optional: false, byRef: false, variadic: false },
    { name: "speed", optional: true, byRef: false, variadic: false },
  ],
  transitionDoc(
    "Reveal an image with a directional wipe.",
    "Reveals an image from a side, diagonal corner or push direction. Technically, effects 1 to 12 select the documented geometry, speed is logical pixels per fixed tick and defaults to 1, and the last frame is exactly the resolved image; non-positive speed is a catchable bad-argument error and the script waits until completion.",
    "Blocks for the fixed-tick wipe transition.",
  ),
  (args) => {
    const speed = typeof args[2]?.value === "number" ? args[2].value : 1;
    const effect = typeof args[1]?.value === "number" ? Math.trunc(args[1].value) : 1;
    const total = effect >= 5 && effect <= 8 ? 640 + 480 - 1 : effect === 3 || effect === 4 || effect >= 11 ? 480 : 640;
    return Math.max(1, Math.ceil(total / speed));
  },
);

const ZOOM = transition(
  "zoom",
  [{ name: "percent", optional: false, byRef: false, variadic: false }],
  transitionDoc(
    "Zoom the board toward its current centre.",
    "Shrinks the visible part of the board by the requested amount. Technically, percent is a shrink amount from 0 to 75, nearest-neighbour sampling keeps the current logical centre, the target is reached in 30 fixed ticks and the script waits; other values raise a catchable bad-argument error.",
    "Blocks for the fixed 30-tick zoom.",
  ),
  () => 30,
);

const EARTHQUAKE = transition(
  "earthquake",
  [{ name: "intensity", optional: false, byRef: false, variadic: false }],
  {
    summary: "Shake the whole game screen, from barely noticeable to strongest.",
    behaviour: "Shakes the screen in increasingly strong four-tick bursts. Technically, intensity is clamped to 1..10; pass p moves the screen p logical pixels through the four corners, for 4*i fixed ticks total, and the script waits until the final pass.",
    groups: ["board-tiles-vectors-screen-effects-33"],
    waits: { kind: "ticks", summary: "Blocks through all four-corner shake passes." },
    see: ["docs/spec/engine/rpgcode-functions.md#reawakened-earthquake"],
  },
  (args) => {
    const intensity = args[0]?.value;
    if (typeof intensity !== "number" || !Number.isFinite(intensity)) throw new ScriptError("builtin.bad-arg", "earthquake intensity must be finite");
    return Math.max(1, Math.min(10, Math.trunc(intensity))) * 4;
  },
);

const BORDER_COLOR = effectCommand("bordercolor", "fx");
/** Rendering owner pack: camera, UI, effects and surfaces are separate command layers. */
export const RENDER_PLUGIN = pack("render", "Deterministic rendering, camera, UI and visual-effect commands.", [
  ...UI_COMMANDS,
  effectCommand("drawline", "surfaces", "state-write", "drawLine"),
  effectCommand("drawrect", "surfaces", "state-write", "drawRect"),
  effectCommand("fillrect", "surfaces", "state-write", "fillRect"),
  effectCommand("clear", "surfaces"),
  FADE,
  WIPE,
  ZOOM,
  EARTHQUAKE,
  BORDER_COLOR,
  ...GRAPHICS_COMMANDS,
]);
