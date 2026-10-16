/**
 * The save tree, the RNG and time sections, and snapshots (AD-7, AD-10,
 * AD-11, AD-23).
 *
 * AD-10 (one state tree) and AD-11 (one canonical form); docs/spec/formats/save-game.md#layout-minor-4 (the
 * saved game).
 */

export { createGameState, createSchemaState, SCHEMA_VERSIONS } from "./state.ts";
export type { GameState, GameStateIsPlainData, SchemaState, SectionKey } from "./state.ts";
export { restoreGameState, snapshot } from "./snapshot.ts";
export type {
  AudioSection,
  BattleSection,
  CameraSection,
  EngineSection,
  FxSection,
  InputSection,
  InventorySection,
  MenuSection,
  PartySection,
  SpritesSection,
  SurfacesSection,
  TriggersSection,
  UiSection,
  WorldSection,
} from "./sections.ts";
