/**
 * Placeholder section types for the AD-10 sections entry 2 does not own
 * (decisions Q3/Q2; AD-10).
 *
 * Each alias is the empty-object placeholder `Record<string, never>` until its
 * owner module lands; the comment names the owner and the epic/entry that fills
 * it. `core/save` is the composer and the one documented exemption to
 * AD-10's "only `core/<section>/**` imports its section type" rule: it imports
 * every section type here and in `state.ts`.
 *
 * AD-10 (one state tree, one owner per section); AD-11 (one canonical form);
 * format-spec §11 (the saved game).
 */

/** Owner: `core/world` (board, layers, vectors, lighting, ambient). Filled by epic movement-triggers. */
export type WorldSection = Record<string, never>;

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

/** Owner: `core/input` (key queue, held keys, mouse). Filled by epic platform-baseline. */
export type InputSection = Record<string, never>;

/** Owner: `core/render` (message window, fonts, cursor maps). Filled by epic board-rendering. */
export type UiSection = Record<string, never>;

/** Owner: `core/world` (camera position and clamp; AD-33). Filled by epic board-rendering. */
export type CameraSection = Record<string, never>;

/** Owner: `core/render` (persistent animations, transitions, effects). Filled by epic board-rendering. */
export type FxSection = Record<string, never>;

/** Owner: `core/audio` (playing music and effects, `cueId`). Filled by epic audio-synth. */
export type AudioSection = Record<string, never>;

/** Owner: `core/raster` (persistent bitmaps, `SurfaceId` counter; AD-27). Filled by epic board-rendering. */
export type SurfacesSection = Record<string, never>;

/** Owner: `core/engine` (phase state, pending requests, queued inputs). Filled by epic rpgcode-vm entry 4. */
export type EngineSection = Record<string, never>;
