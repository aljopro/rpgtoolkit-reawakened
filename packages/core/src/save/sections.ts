/**
 * State section declarations for AD-10. The seven sections owned by this
 * rendering entry are split into modules under `save/sections/`; this barrel
 * preserves the public imports and keeps the remaining sections explicit
 * placeholders until their owning epics land.
 *
 * AD-10 (one state tree, one owner per section); AD-11 (one canonical form);
 * docs/spec/formats/save-game.md#layout-minor-4 (the saved game).
 */

export type { WorldSection } from "./sections/world.ts";
export type { CameraSection } from "./sections/camera.ts";
export type { UiSection } from "./sections/ui.ts";
export type { FxSection } from "./sections/fx.ts";
export type { SurfacesSection } from "./sections/surfaces.ts";
export type { InputSection } from "./sections/input.ts";
export type { EngineSection } from "./sections/engine.ts";

/** Owner: `core/sprites` (players, items, queues, facing). Filled by epic movement-triggers. */
export type SpritesSection = Record<string, never>;

/** Owner: `core/menu` (roster, selection, steps). Filled by epic menu-party-save. */
export type PartySection = Record<string, never>;

/** Owner: `core/menu` (items, equipment, gold). Filled by epic menu-party-save. */
export type InventorySection = Record<string, never>;

/** Owner: `core/triggers` (armed and fired state, repeat counters). Filled by epic movement-triggers. */
export type TriggersSection = Record<string, never>;

/** Owner: `core/battle` (fighter references, charge, status). Filled by epic battle. */
export type BattleSection = Record<string, never>;

/** Owner: `core/menu` (open screens). Filled by epic menu-party-save. */
export type MenuSection = Record<string, never>;

/** Owner: `core/audio` (playing music and effects, `cueId`). Filled by epic audio-synth. */
export type AudioSection = Record<string, never>;
