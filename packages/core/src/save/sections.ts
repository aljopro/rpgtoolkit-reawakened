/**
 * State section declarations for AD-10. The seven sections the board-rendering
 * epic owns (`world`, `camera`, `ui`, `fx`, `surfaces`, `input`, `engine`) live
 * in modules under `save/sections/`; this barrel re-exports them and declares
 * the seven sections still owned by later epics (`sprites`, `party`,
 * `inventory`, `triggers`, `battle`, `menu`, `audio`) as explicit empty
 * placeholders.
 *
 * AD-10 (one state tree, one owner per section); AD-11 (one canonical form);
 * docs/spec/formats/save-game.md#layout-minor-4 (the saved game).
 */

export type { WorldSection } from "./sections/world.ts";
export {
  createCameraSection,
  type CameraEasing,
  type CameraPanState,
  type CameraPoint,
  type CameraSection,
  type CameraShakeState,
  type CameraTrackingTarget,
} from "./sections/camera.ts";
export { createUiSection, type UiSection, type UiMessageWindow, type UiModal, type UiTextDraw, type UiCursorPoint, type UiCursorMap, type UiCursorImage, type UiCursorHand, type UiButton } from "./sections/ui.ts";
export {
  createFxSection,
  type AnimationFrameState,
  type AnimationState,
  type EarthquakeState,
  type FadeState,
  type FxColor,
  type FxSection,
  type WipeState,
  type ZoomState,
} from "./sections/fx.ts";
export type { RgbaSnapshot, SurfaceState, SurfacesSection } from "./sections/surfaces.ts";
export { INPUT_SCHEMA_VERSION, type InputBindings, type InputButton, type InputButtonSlot, type InputGamepad, type InputImageButton, type InputSection } from "./sections/input.ts";
export type { EngineSection } from "./sections/engine.ts";

export type { SpritesSection } from "../sprites/model.ts";

/** Owner: `core/menu` (roster, selection, steps). Filled by epic menu-party-save. */
export type PartySection = Record<string, never>;

/** Owner: `core/menu` (items, equipment, gold). Filled by epic menu-party-save. */
export type InventorySection = Record<string, never>;

/** Owner: `core/triggers` (armed and fired state, repeat counters). */
export type { TriggersSection } from "../triggers/model.ts";

/** Owner: `core/battle` (fighter references, charge, status). Filled by epic battle. */
export type BattleSection = Record<string, never>;

/** Owner: `core/menu` (open screens). Filled by epic menu-party-save. */
export type MenuSection = Record<string, never>;

/** Owner: `core/audio` (playing music and effects, `cueId`). Filled by epic audio-synth. */
export type AudioSection = Record<string, never>;
