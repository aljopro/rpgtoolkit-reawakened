/**
 * The one state tree (AD-10, AD-23; decisions Q2/Q3).
 *
 * `GameState` has exactly AD-10's 18 sections. Entry 2 owns four of them —
 * `schema` (here), `vm` (`core/script`), `rng` (`core/rng`) and `time`
 * (`core/time`); of the other fourteen, seven are real sections declared under
 * `save/sections/` (`world`, `camera`, `ui`, `fx`, `surfaces`, `input`,
 * `engine`) and seven are the `Record<string, never>` placeholders of
 * `sections.ts` that later epics fill. `SchemaState` is AD-23's per-section version
 * map plus the compiler version, and `SCHEMA_VERSIONS` is the current version
 * of every section, each starting at 1.
 *
 * **The schema-bump rule (AD-7's check).** A change to any `*State` type or to
 * `StepOp` needs either a section's version in `SCHEMA_VERSIONS` bumped or
 * `COMPILER_VERSION` changed, *plus* a fixture save from the previous version
 * and a restore test over it. `restore.compiler-mismatch` catches a compiler
 * bump; the per-section numbers are the migration chain's keys.
 *
 * AD-10 (the state tree), AD-11 (the canonical form) and AD-23 (per-section
 * versions); docs/spec/formats/save-game.md#layout-minor-4 (the saved game).
 */

import type { AssertPlainData } from "../ports/plain-data.ts";
import { seedRng, type RngState } from "../rng/xoshiro.ts";
import { COMPILER_VERSION } from "../script/program.ts";
import { createVmState, type VmState } from "../script/state.ts";
import { createTimeState, type TimeState } from "../time/time.ts";
import {
  createCameraSection,
  createUiSection,
  createFxSection,
  type AudioSection,
  type BattleSection,
  type CameraSection,
  type EngineSection,
  type FxSection,
  type InputSection,
  type InventorySection,
  type MenuSection,
  type PartySection,
  type SpritesSection,
  type SurfacesSection,
  type TriggersSection,
  type UiSection,
  type WorldSection,
} from "./sections.ts";
import { createTriggersSection } from "../triggers/model.ts";
import { createSpritesSection } from "../sprites/model.ts";
import { createInputSection } from "../input/input.ts";

/** Every `GameState` section key (AD-10), i.e. the schema version map's keys. */
export const SCHEMA_VERSIONS = {
  schema: 1,
  world: 1,
  sprites: 2,
  party: 1,
  inventory: 1,
  triggers: 2,
  vm: 5,
  battle: 1,
  menu: 1,
  input: 2,
  ui: 1,
  camera: 1,
  fx: 1,
  audio: 1,
  surfaces: 1,
  rng: 1,
  time: 1,
  engine: 1,
} as const;

/** One `GameState` section key. */
export type SectionKey = keyof typeof SCHEMA_VERSIONS;

/** AD-23's `GameState.schema`: a version per section plus the compiler version. */
export type SchemaState = {
  schema: number;
  world: number;
  sprites: number;
  party: number;
  inventory: number;
  triggers: number;
  vm: number;
  battle: number;
  menu: number;
  input: number;
  ui: number;
  camera: number;
  fx: number;
  audio: number;
  surfaces: number;
  rng: number;
  time: number;
  engine: number;
  compiler: string;
};

/** AD-10's 18-section state tree; `SaveState` is this type. */
export type GameState = {
  schema: SchemaState;
  world: WorldSection;
  sprites: SpritesSection;
  party: PartySection;
  inventory: InventorySection;
  triggers: TriggersSection;
  vm: VmState;
  battle: BattleSection;
  menu: MenuSection;
  input: InputSection;
  ui: UiSection;
  camera: CameraSection;
  fx: FxSection;
  audio: AudioSection;
  surfaces: SurfacesSection;
  rng: RngState;
  time: TimeState;
  engine: EngineSection;
};

/** Build-time proof that the whole state tree stays plain data (G1 rule 2). */
export type GameStateIsPlainData = AssertPlainData<GameState>;

/** The `schema` section at the current versions (AD-23). */
export function createSchemaState(): SchemaState {
  return {
    schema: SCHEMA_VERSIONS.schema,
    world: SCHEMA_VERSIONS.world,
    sprites: SCHEMA_VERSIONS.sprites,
    party: SCHEMA_VERSIONS.party,
    inventory: SCHEMA_VERSIONS.inventory,
    triggers: SCHEMA_VERSIONS.triggers,
    vm: SCHEMA_VERSIONS.vm,
    battle: SCHEMA_VERSIONS.battle,
    menu: SCHEMA_VERSIONS.menu,
    input: SCHEMA_VERSIONS.input,
    ui: SCHEMA_VERSIONS.ui,
    camera: SCHEMA_VERSIONS.camera,
    fx: SCHEMA_VERSIONS.fx,
    audio: SCHEMA_VERSIONS.audio,
    surfaces: SCHEMA_VERSIONS.surfaces,
    rng: SCHEMA_VERSIONS.rng,
    time: SCHEMA_VERSIONS.time,
    engine: SCHEMA_VERSIONS.engine,
    compiler: COMPILER_VERSION,
  };
}

/** A fresh `GameState`: empty sections, a seeded RNG and the tick counter at 0. */
export function createGameState(init: { seed: number }): GameState {
  return {
    schema: createSchemaState(),
    world: {},
    sprites: createSpritesSection(),
    party: {},
    inventory: {},
    triggers: createTriggersSection(),
    vm: createVmState(),
    battle: {},
    menu: {},
    input: createInputSection(),
    ui: {} as UiSection,
    camera: {} as CameraSection,
    fx: {} as FxSection,
    audio: {},
    surfaces: {} as SurfacesSection,
    rng: seedRng(init.seed),
    time: createTimeState(),
    engine: {},
  };
}
