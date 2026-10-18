/**
 * CameraTarget port: allows the camera to track players or entities (AD-33; E-51).
 * Movement-triggers' sprites section implements this port; tests supply a double.
 */

export type CameraPoint = {
  readonly x: number;
  readonly y: number;
};

export interface CameraTarget {
  /**
   * Return the pixel position of the active/selected player character,
   * or null if no player exists or the position is unavailable.
   */
  getPlayerPosition(): CameraPoint | null;

  /**
   * Return the pixel position of an entity (NPC, sprite, monster) by its ID,
   * or null if the entity is not found.
   */
  getEntityPosition(entityId: number | string): CameraPoint | null;
}
