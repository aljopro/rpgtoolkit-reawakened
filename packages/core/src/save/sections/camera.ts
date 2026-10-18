/** Owner: core/world; camera position, tracking, deadzone, smoothing, scripted pans and shake (AD-33, E-51). */

export type CameraPoint = {
  x: number;
  y: number;
};

export type CameraTrackingTarget =
  | { kind: "player" }
  | { kind: "entity"; entityId: number | string }
  | { kind: "point"; point: CameraPoint }
  | { kind: "path"; waypoints: CameraPoint[]; index: number };

export type CameraEasing = "linear" | "smoothstep" | "easeIn" | "easeOut" | "easeInOut";

export type CameraPanState = {
  startX: number;
  startY: number;
  targetX: number;
  targetY: number;
  elapsedTicks: number;
  durationTicks: number;
  easing: CameraEasing;
};

export type CameraShakeState = {
  amplitude: number;
  remainingTicks: number;
  elapsedTicks: number;
};

export type CameraSection = {
  x: number;
  y: number;
  prevX: number;
  prevY: number;
  viewportWidth: number;
  viewportHeight: number;
  deadzoneWidth: number;
  deadzoneHeight: number;
  smoothing: number;
  smallBoard: "center-if-small" | "clamp-to-scene";
  target: CameraTrackingTarget;
  pan: CameraPanState | null;
  shake: CameraShakeState | null;
};

export function createCameraSection(viewportWidth = 640, viewportHeight = 480): CameraSection {
  return {
    x: 0,
    y: 0,
    prevX: 0,
    prevY: 0,
    viewportWidth: Math.max(1, Math.round(viewportWidth)),
    viewportHeight: Math.max(1, Math.round(viewportHeight)),
    deadzoneWidth: 0,
    deadzoneHeight: 0,
    smoothing: 0,
    smallBoard: "center-if-small",
    target: { kind: "player" },
    pan: null,
    shake: null,
  };
}
