/** Deterministic actor animation playback (E-21; character.md#defaults-and-fall-backs). */
import { secondsToTicks } from "../time/time.ts";
import type { EnginePhaseRegistration } from "../engine/engine.ts";
import type { GameState } from "../save/state.ts";
import type { Facing, SpriteActor, SpriteVisual, SpritesSection } from "./model.ts";

/** The decoded timing metadata supplied by a runner or fixture. */
export type SpriteAnimationSpec = {
  readonly file: string;
  readonly frames: number;
  readonly delayTicks: number;
  readonly hold?: boolean;
};

export type SpriteAnimationResolver = (file: string) => SpriteAnimationSpec | null;

export type SpriteAnimationEvent =
  | { readonly type: "stance-start"; readonly tick: number; readonly actor: string; readonly stance: string }
  | { readonly type: "stance-complete"; readonly tick: number; readonly actor: string; readonly held: boolean }
  | { readonly type: "stance-released"; readonly tick: number; readonly actor: string };

export type SpriteAnimationOptions = {
  readonly resolve?: SpriteAnimationResolver;
  readonly onEvent?: (event: SpriteAnimationEvent) => void;
};

type Selection = { readonly key: string; readonly file: string; readonly spec: SpriteAnimationSpec };

const SLOT: Readonly<Record<Facing, number>> = { S: 0, N: 1, E: 2, W: 3, NW: 4, NE: 5, SW: 6, SE: 7 };

function defaultSpec(file: string): SpriteAnimationSpec {
  return { file, frames: 1, delayTicks: 1 };
}

function specFor(file: string, resolve: SpriteAnimationResolver | undefined): SpriteAnimationSpec {
  const result = resolve?.(file);
  if (result === null || result === undefined) return defaultSpec(file);
  return { ...result, file, frames: Math.max(1, Math.trunc(result.frames)), delayTicks: Math.max(1, Math.trunc(result.delayTicks)) };
}

function visual(value: SpriteVisual): SpriteVisual {
  return {
    movement: value.movement ?? [], idle: value.idle ?? [], battle: value.battle ?? [], custom: value.custom ?? [],
    animation: value.animation ?? null, file: value.file ?? null, stance: value.stance ?? null,
    frame: value.frame ?? 0, frameTicks: value.frameTicks ?? 0, idleTicks: value.idleTicks ?? 0,
    stanceHeld: value.stanceHeld === true, stanceComplete: value.stanceComplete === true,
  };
}

function actors(section: SpritesSection): SpriteActor[] {
  return [...section.players, ...section.items];
}

function replace(section: SpritesSection, next: SpriteActor): void {
  const list = next.kind === "player" ? section.players : section.items;
  const index = list.findIndex((actor) => actor.id === next.id);
  if (index < 0) return;
  if (next.kind === "player") section.players = list.map((actor, i) => i === index ? next : actor);
  else section.items = list.map((actor, i) => i === index ? next : actor);
}

function actor(section: SpritesSection, id: string): SpriteActor | null {
  return actors(section).find((value) => value.id === id) ?? null;
}


function horizontalFallback(facing: Facing): Facing | null {
  if (facing === "NE" || facing === "SE") return "E";
  if (facing === "NW" || facing === "SW") return "W";
  return null;
}

function directional(files: readonly string[], facing: Facing): string {
  return files[SLOT[facing]] ?? "";
}

function walkSelection(value: SpriteActor, facing: Facing, resolve: SpriteAnimationResolver | undefined): Selection | null {
  const direct = directional(value.visual.movement, facing);
  let file = direct;
  let key = `walk.${facing}`;
  if (file === "") {
    const horizontal = horizontalFallback(facing);
    if (horizontal !== null) {
      file = directional(value.visual.movement, horizontal);
      key = `walk.${horizontal}`;
    }
  }
  if (file === "") return null;
  return { key, file, spec: specFor(file, resolve) };
}

function idleSelection(value: SpriteActor, facing: Facing, resolve: SpriteAnimationResolver | undefined): Selection | null {
  const direct = directional(value.visual.idle, facing);
  let file = direct;
  let key = `idle.${facing}`;
  if (file === "") {
    const horizontal = horizontalFallback(facing);
    if (horizontal !== null) {
      file = directional(value.visual.idle, horizontal);
      key = `idle.${horizontal}`;
    }
  }
  if (file !== "") return { key, file, spec: specFor(file, resolve) };
  return walkSelection(value, facing, resolve);
}

function idleTicks(actorValue: SpriteActor): number {
  return secondsToTicks(actorValue.idleTime) ?? 1;
}

function event(options: SpriteAnimationOptions, record: SpriteAnimationEvent, events: SpriteAnimationEvent[]): void {
  events.push(record);
  options.onEvent?.(record);
}

function choose(value: SpriteActor, selection: Selection, nextState: SpriteActor["state"]): SpriteActor {
  const current = visual(value.visual);
  const changed = current.animation !== selection.key || current.file !== selection.file;
  const nextVisual: SpriteVisual = changed
    ? { ...current, animation: selection.key, file: selection.file, frame: 0, frameTicks: 0 }
    : current;
  return { ...value, state: nextState, visual: nextVisual };
}

function advanceLoop(value: SpriteActor, selection: Selection): SpriteActor {
  const current = visual(value.visual);
  let frameTicks = current.frameTicks + 1;
  let frame = current.frame;
  if (frameTicks >= selection.spec.delayTicks) {
    frameTicks = 0;
    frame = (frame + 1) % selection.spec.frames;
  }
  return { ...value, visual: { ...current, frameTicks, frame } };
}

function advanceStance(value: SpriteActor, selection: Selection): SpriteActor {
  const current = visual(value.visual);
  let frameTicks = current.frameTicks + 1;
  let frame = current.frame;
  let finished = false;
  if (frameTicks >= selection.spec.delayTicks) {
    frameTicks = 0;
    if (frame + 1 >= selection.spec.frames) finished = true;
    else frame += 1;
  }
  return { ...value, visual: { ...current, frameTicks, frame, stanceComplete: finished } };
}

/** Start a named custom/battle stance and return the deterministic start record. */
export function startStance(section: SpritesSection, id: string, name: string, tick = 0, options: SpriteAnimationOptions = {}): SpriteAnimationEvent | null {
  const value = actor(section, id);
  if (value === null || !value.visible) return null;
  const lower = name.toLowerCase();
  const custom = value.visual.custom.find((stance) => stance.handle.toLowerCase() === lower || stance.animation.toLowerCase() === lower);
  const battleIndex = ["fight", "defend", "special", "die", "rest"].indexOf(lower);
  const file = custom?.animation ?? (battleIndex >= 0 ? value.visual.battle[battleIndex] ?? "" : "");
  if (file === "") return null;
  const next: SpriteActor = {
    ...value,
    state: "stance",
    visual: { ...visual(value.visual), animation: `stance.${name}`, file, stance: name, frame: 0, frameTicks: 0, idleTicks: 0, stanceHeld: false, stanceComplete: false },
  };
  replace(section, next);
  const record: SpriteAnimationEvent = { type: "stance-start", tick, actor: id, stance: name };
  options.onEvent?.(record);
  return record;
}

/** Alias used by command owners (`playerstance` and `itemstance`). */
export const playStance = startStance;

/** Advance all actor presentation state in stable player-before-item order. */
export function runAnimationPhase(section: SpritesSection, tick: number, options: SpriteAnimationOptions = {}): SpriteAnimationEvent[] {
  const events: SpriteAnimationEvent[] = [];
  for (const original of actors(section)) {
    let value = actor(section, original.id);
    if (value === null || !value.visible) continue;
    let stateVisual = visual(value.visual);
    if (value.state === "moving" && stateVisual.stance !== null) {
      value = {
        ...value,
        visual: {
          ...stateVisual,
          stance: null,
          stanceHeld: false,
          stanceComplete: false,
          animation: null,
          file: null,
          frame: 0,
          frameTicks: 0,
        },
      };
      replace(section, value);
      event(options, { type: "stance-released", tick, actor: value.id }, events);
      stateVisual = visual(value.visual);
    }
    if (value.state === "stance" && stateVisual.stance !== null) {
      if (!stateVisual.stanceComplete) {
        const selection: Selection = {
          key: stateVisual.animation ?? `stance.${stateVisual.stance}`,
          file: stateVisual.file ?? "",
          spec: specFor(stateVisual.file ?? "", options.resolve),
        };
        let next = advanceStance(value, selection);
        const after = visual(next.visual);
        if (after.stanceComplete) {
          if (selection.spec.hold === true) {
            next = { ...next, visual: { ...after, frame: selection.spec.frames - 1, stanceHeld: true } };
            event(options, { type: "stance-complete", tick, actor: next.id, held: true }, events);
          } else {
            next = { ...next, state: "waiting", visual: { ...after, frame: selection.spec.frames - 1 } };
            event(options, { type: "stance-complete", tick, actor: next.id, held: false }, events);
          }
        }
        replace(section, next);
      }
      continue;
    }
    if (value.state === "frozen" || value.state === "hidden") continue;
    if (stateVisual.stance !== null && stateVisual.stanceComplete && value.state !== "moving") continue;
    if (value.state === "moving") {
      const selection = walkSelection(value, value.facing, options.resolve);
      if (selection !== null) {
        const moving = { ...value, visual: { ...stateVisual, idleTicks: 0 } };
        replace(section, advanceLoop(choose(moving, selection, "moving"), selection));
      }
      continue;
    }
    if (value.state === "waiting") {
      const nextIdleTicks = stateVisual.idleTicks + 1;
      const idle = nextIdleTicks >= idleTicks(value) ? idleSelection(value, value.facing, options.resolve) : null;
      const withIdleTicks = { ...value, visual: { ...stateVisual, idleTicks: nextIdleTicks } };
      if (idle !== null) {
        replace(section, advanceLoop(choose(withIdleTicks, idle, "idling"), idle));
      } else {
        const walk = walkSelection(value, value.facing, options.resolve);
        if (walk !== null) {
          const next = choose(withIdleTicks, walk, "waiting");
          replace(section, { ...next, visual: { ...visual(next.visual), frame: 0, frameTicks: 0 } });
        }
      }
      continue;
    }
    if (value.state === "idling") {
      const idle = idleSelection(value, value.facing, options.resolve);
      if (idle !== null) replace(section, advanceLoop(choose(value, idle, "idling"), idle));
    }
  }
  return events;
}

/** Register actor playback in AD-26's existing animation phase. */
export function animationPhaseRegistration(options: SpriteAnimationOptions = {}): EnginePhaseRegistration {
  return {
    phase: "animation",
    rank: 0,
    run: (state: GameState): void => {
      runAnimationPhase(state.sprites, state.time.tick, options);
    },
  };
}
