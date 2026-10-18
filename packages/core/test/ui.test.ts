import { deepEqual, equal } from "node:assert/strict";
import test from "node:test";
import {
  applyUiEffect,
  colourSurface,
  composeUi,
  createGameState,
  createScriptServices,
  createSurfacesSection,
  pollRenderMsgBox,
  UI_COMMANDS,
  UI_PLUGIN,
  type Arg,
  type Wait,
} from "../src/index.ts";

function arg(value: Arg["value"], ref: string | null = null): Arg {
  return { value, ref: ref as never };
}

function command(name: string, state: ReturnType<typeof createGameState>, args: readonly Arg[]) {
  const services = createScriptServices(state, [{ definition: UI_PLUGIN }]);
  const spec = services.commands.get(name)?.spec;
  if (spec === undefined) throw new Error(`missing ${name}`);
  return spec.call(services.view, args, () => ({ value: null }));
}

function firstEffect(result: ReturnType<typeof command>): NonNullable<NonNullable<ReturnType<typeof command>["effects"]>[number]> {
  const effect = result.effects?.[0];
  if (effect === undefined) throw new Error("command emitted no effect");
  return effect;
}

test("UI pack exposes all 27 message-window and text commands", () => {
  equal(UI_COMMANDS.length, 27);
  equal(new Set(UI_COMMANDS.map((entry) => entry.name)).size, 27);
  equal(UI_COMMANDS.every((entry) => (entry.doc?.summary.length ?? 0) > 0 && (entry.doc?.behaviour.length ?? 0) > 0), true);
});

test("message-window effects splice globals and use deterministic defaults", () => {
  const state = createGameState({ seed: 0 });
  state.vm.globals.name = "Ada";
  const effect = firstEffect(command("mwin", state, [arg("Hello <name>")]));
  applyUiEffect(state, "mwin", effect.args ?? []);
  equal(state.ui.message.visible, true);
  equal(state.ui.message.text, "Hello Ada");
  deepEqual(state.ui.message.background, { r: 0, g: 0, b: 0 });
  equal(state.ui.message.translucency, 50);
  equal(composeUi(state.ui, 800, 600).some((entry) => entry.kind === "rect"), true);
});

test("engine-backed message windows use the default translucent colour surface", () => {
  const state = createGameState({ seed: 0 });
  state.surfaces = createSurfacesSection();
  const expected = colourSurface(state.surfaces, { r: 0, g: 0, b: 0 });
  const effect = firstEffect(command("mwin", state, [arg("Hello")]));
  applyUiEffect(state, "mwin", effect.args ?? []);
  equal(state.ui.message.translucency, 50);
  equal(state.ui.backgroundSurface, expected);
  equal(composeUi(state.ui, 800, 600)[0]?.kind, "blit");
});

test("text and pixelText record draws and text metrics", () => {
  const state = createGameState({ seed: 0 });
  for (const [name, args] of [["text", [arg(2), arg(3), arg("A\\nB")]], ["pixeltext", [arg(10), arg(20), arg("C")]]] as const) {
    const effect = firstEffect(command(name, state, args));
    applyUiEffect(state, name, effect.args ?? []);
  }
  equal(state.ui.draws.length, 2);
  equal(state.ui.draws[0]?.x, 8);
  equal(state.ui.draws[0]?.y, 16);
  equal(state.ui.draws[0]?.cell, true);
  equal(state.ui.draws[1]?.x, 10);
  equal(state.ui.draws[1]?.cell, false);
  equal(command("gettextwidth", state, [arg("AB")]).value, 16);
});

test("prompt and msgBox waits resolve from modal state or unclaimed keys", () => {
  const state = createGameState({ seed: 0 });
  const prompt = command("prompt", state, [arg("Name?"), arg("", "answer")]);
  const promptEffect = firstEffect(prompt);
  applyUiEffect(state, "prompt", promptEffect.args ?? []);
  const promptWait = prompt.wait as Wait;
  equal(pollRenderMsgBox({ tick: 0, ui: state.ui as never, input: { keys: [], focused: true }, claims: [] }, promptWait), null);
  const typed = pollRenderMsgBox({ tick: 0, input: { keys: [{ seq: 3, name: "Enter", code: "Enter", char: "Ada" }], focused: true }, claims: [] }, promptWait);
  deepEqual(typed, { value: "Ada", ok: true, claim: 3 });

  const msg = command("msgbox", state, [arg("Continue?"), arg("Notice"), arg(1)]);
  const msgEffect = firstEffect(msg);
  applyUiEffect(state, "msgbox", msgEffect.args ?? []);
  const msgWait = msg.wait as Wait;
  equal(pollRenderMsgBox({ tick: 0, input: { keys: [{ seq: 4, name: "No", code: "KeyN", char: null }], focused: true }, claims: [] }, msgWait)?.value, 7);
});
