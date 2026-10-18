import { deepEqual, equal, throws } from "node:assert/strict";
import { test } from "node:test";
import {
  advanceFx,
  applyFxDrawList,
  applyFxEffect,
  createCameraSection,
  createFxSection,
  createGameState,
  createScriptServices,
  updateCamera,
  RENDER_PLUGIN,
  type EffectRecord,
  type DrawList,
} from "../src/index.ts";

function effect(name: string, args: (string | number)[]): EffectRecord {
  return { seq: 1, tick: 0, thread: 1, name, kind: "mixed", args, out: {}, result: null, patch: null, wait: null, request: null };
}

function blank(): DrawList {
  return { tick: 0, width: 640, height: 480, commands: [] };
}

test("fx section defaults are deterministic and saveable", () => {
  deepEqual(createFxSection(), {
    borderColor: { r: 0, g: 0, b: 0 },
    fade: null,
    wipe: null,
    zoomPercent: 0,
    zoom: null,
    earthquake: null,
  });
});

test("fade advances exactly 30 ticks and leaves a terminal primitive", () => {
  const state = createGameState({ seed: 1 });
  state.camera = createCameraSection(640, 480);
  applyFxEffect(state, effect("fade", [0]));
  for (let i = 0; i < 29; i += 1) advanceFx(state);
  equal(state.fx.fade?.elapsedTicks, 29);
  equal(applyFxDrawList(blank(), state.fx).commands.length, 1);
  advanceFx(state);
  equal(state.fx.fade?.elapsedTicks, 30);
});

test("wipe progress uses logical pixels per tick and reaches exact final image", () => {
  const state = createGameState({ seed: 1 });
  state.camera = createCameraSection(640, 480);
  applyFxEffect(state, effect("wipe", ["next.png", 1, 4]));
  advanceFx(state);
  equal(state.fx.wipe?.progress, 4);
  for (let i = 0; i < 159; i += 1) advanceFx(state);
  const commands = applyFxDrawList(blank(), state.fx).commands;
  equal(state.fx.wipe?.progress, 640);
  equal(commands[commands.length - 1]?.kind, "blit");
  deepEqual((commands[commands.length - 1] as { dst: unknown }).dst, { x: 0, y: 0, w: 640, h: 480 });
});

test("zoom interpolates integer shrink amount over 30 ticks", () => {
  const state = createGameState({ seed: 1 });
  state.camera = createCameraSection(640, 480);
  applyFxEffect(state, effect("zoom", [75]));
  for (let i = 0; i < 15; i += 1) advanceFx(state);
  equal(state.fx.zoomPercent, 37);
  for (let i = 0; i < 15; i += 1) advanceFx(state);
  equal(state.fx.zoomPercent, 75);
  equal(state.fx.zoom, null);
});

test("earthquake clamps intensity and cycles the shared shake primitive", () => {
  const state = createGameState({ seed: 1 });
  state.camera = createCameraSection(640, 480);
  applyFxEffect(state, effect("earthquake", [99]));
  equal(state.fx.earthquake?.intensity, 10);
  equal(state.camera.shake?.amplitude, 1);
  for (let i = 0; i < 4; i += 1) {
    state.camera = updateCamera(state.camera, null);
    advanceFx(state);
  }
  equal(state.camera.shake?.amplitude, 2);
});

test("fx argument validation rejects invalid wipe speed and zoom range", () => {
  const services = createScriptServices(createGameState({ seed: 1 }));
  const wipe = RENDER_PLUGIN.commands.find((command) => command.name === "wipe");
  const zoom = RENDER_PLUGIN.commands.find((command) => command.name === "zoom");
  if (wipe === undefined || zoom === undefined) throw new Error("transition commands are not registered");
  const next = (): { value: null } => ({ value: null });
  throws(() => wipe.call(services.view, [{ value: "next.png", ref: null }, { value: 1, ref: null }, { value: 0, ref: null }], next));
  throws(() => zoom.call(services.view, [{ value: 76, ref: null }], next));
});

test("fade types outside 0..5 are a no-op without a wait", () => {
  const services = createScriptServices(createGameState({ seed: 1 }));
  const fade = RENDER_PLUGIN.commands.find((command) => command.name === "fade");
  if (fade === undefined) throw new Error("fade command is not registered");
  const result = fade.call(services.view, [{ value: 6, ref: null }], () => ({ value: null }));
  equal(result.wait, undefined);
  equal(result.effects, undefined);
});
