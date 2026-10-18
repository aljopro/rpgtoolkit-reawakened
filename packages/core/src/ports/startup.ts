/**
 * Start-up ports (docs/spec/engine/main-loop-and-startup.md#reawakened-startup-ports, E-02 steps 8 and 9).
 *
 * Boot reaches the epics that own the player and saved games only through
 * these data-only interfaces. Movement-triggers implements the presence check
 * over its `sprites` section and menu-party-save implements the saved-game
 * branch over its save model; until those epics land, tests supply doubles.
 * The first player (step 6) is not a port call: boot posts the `sprites`
 * effect `createplayer`, whose applier is `InitialPlayerPort.createFromInitChar`
 * (docs/spec/engine/main-loop-and-startup.md#reawakened-boot-sequence).
 */

declare const savePathBrand: unique symbol;

/** A path inside the `saves` blob area, as the menu-party-save epic names it (AD-17). */
export type SavePath = string & { readonly [savePathBrand]: "SavePath" };

/** What a `SavedGamePort.load` call reports (E-02 step 9). */
export type LoadResult =
  | { readonly kind: "loaded" }
  | { readonly kind: "missing" }
  | { readonly kind: "failed"; readonly reason: string };

/** E-02 step 8: movement-triggers owns the check that a player exists. */
export interface PlayerPresencePort {
  /** True once the first player (or any start-up added player) exists. */
  hasPlayer(): boolean;
}

/** E-02 step 9: menu-party-save owns `Load()` and the saved-game branch. */
export interface SavedGamePort {
  /** Restore the saved game at `path`; called by the `load` built-in. */
  load(path: SavePath): LoadResult;
  /** True when a `load` during this start-up restored a game, so `initBoard` is skipped. */
  restored(): boolean;
}

/** The ports a booting engine needs; both are required because a game cannot start without them. */
export type StartupPorts = {
  readonly presence: PlayerPresencePort;
  readonly savedGame: SavedGamePort;
};
