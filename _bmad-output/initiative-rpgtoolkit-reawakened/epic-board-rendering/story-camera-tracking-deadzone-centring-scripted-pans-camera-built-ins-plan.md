---
ticket: 16
type: feature
status: done
---

# Camera: tracking, deadzone, centring, scripted pans and camera built-ins

Implements the `camera` section in `core/world` (AD-33): position and clamp, follow-player default, track entity, focus point and waypoint path, tick-based smoothing and deadzone (defaults ruled in entry 1), `clamp-to-scene` and `center-if-small`, scripted pans with plain-JSON easing curves, shake (the shared `shake(amplitude, ticks)` primitive: corner-cycle offsets, no RNG, plus `cameraShake`; entry 22's `earthquake` sequences it), re-alignment on `send`, `positionAt(alpha)` for presentation, and the built-ins `cameraPanTo`, `cameraFollow`, `cameraReset`, `cameraShake` and `getCorner` through the `world` pack. It reads the followed position through a `CameraTarget` port that movement-triggers' `sprites` section will implement (tests supply a double) and gives `composeBoard` its `view.camera`.

## Code map

- `packages/core/src/ports/camera.ts`: `CameraPoint` and `CameraTarget` port interface.
- `packages/core/src/ports/index.ts`: export camera port types.
- `packages/core/src/save/sections/camera.ts`: `CameraSection` plain-data state schema.
- `packages/core/src/world/camera.ts`: camera initialization, bounds clamping, centring for small boards, tracking, smoothing, deadzones, scripted pans with easing, shared deterministic `shake`, and synchronous `applyCameraEffect`.
- `packages/core/src/world/index.ts`: re-export camera utilities and types.
- `packages/core/src/script/packs/world.ts`: register real camera built-ins `cameraPanTo`, `cameraFollow`, `cameraReset`, `cameraShake` and `getcorner` with BuiltinDoc.
- `packages/core/src/script/packs/render.ts`: remove placeholder camera commands so no command override occurs.
- `tools/catalogue/generate.mjs`: add `getcorner` to `REAL_PACK_COMMANDS` and regenerate `catalogue-stubs.ts`.
- `tools/command-docs/legacy-allowlist.json`: remove `catalogue/getcorner`.
- `packages/core/src/engine/engine.ts`: initialize camera section in `createEngine`, register camera effect applier, update camera during simulation, and feed `positionAt(state.camera, presentationAlpha)` to `composeBoard`.
- `packages/core/test/camera.test.ts`: test camera tracking, deadzone, smoothing, clamping, centring, scripted pans with easing curves, shake, RPGCode built-in execution, and presentation interpolation.

## Acceptance

1. Camera defaults to following the player with zero deadzone and zero smoothing (AD-33, E-51).
2. Small scenes smaller than the viewport center with clean borders under `center-if-small`; larger boards clamp to board boundaries.
3. Scripted pans interpolate smoothly with deterministic easing (`linear`, `smoothstep`, `easeIn`, `easeOut`, `easeInOut`).
4. Shared `shake(amplitude, ticks)` cycles corners `(-a,-a)`, `(a,-a)`, `(-a,a)`, `(a,a)` per tick without RNG.
5. `cameraPanTo`, `cameraFollow`, `cameraReset`, `cameraShake` and `getcorner` resolve from the real pack and document their behavior per BuiltinDoc standard.
6. All repository quality gates pass (`typecheck`, `lint`, `test:strict`, `catalogue:check`, `command-docs:check`).
