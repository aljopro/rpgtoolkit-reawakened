import {
  canon,
  encodeLog,
  fnv1a64,
  hashState,
  type AudioCue,
  type Breakpoint,
  type DrawCommand,
  type DrawList,
  type Engine,
  type InputEvent,
  type InputRecord,
  type StepReport,
  type SurfaceId,
  type SurfacePixels,
} from "@rpgtoolkit/core";

export type TestEngineState = {
  step: number;
  keys: string[];
  pointer: { x: number; y: number; buttons: number };
  other: number;
  cueId: number;
  log: string;
};

function deepCopyValue<T>(value: T): T {
  if (value instanceof Uint8Array) {
    const fresh = new Uint8Array(value.byteLength);
    fresh.set(value);
    return fresh as T;
  }
  if (Array.isArray(value)) {
    return value.map((item) => deepCopyValue(item)) as T;
  }
  if (typeof value === "object" && value !== null) {
    const copy: Record<string, unknown> = {};
    for (const key of Object.keys(value)) {
      copy[key] = deepCopyValue((value as Record<string, unknown>)[key]);
    }
    return copy as T;
  }
  return value;
}

export function createTestEngine(): Engine {
  const state: TestEngineState = {
    step: 0,
    keys: [],
    pointer: { x: 0, y: 0, buttons: 0 },
    other: 0,
    cueId: 0,
    log: "",
  };

  return {
    advance(
      steps: number,
      inputs: readonly InputRecord[],
      maxSteps?: number,
    ): StepReport {
      const actualSteps =
        maxSteps !== undefined && maxSteps < steps ? maxSteps : steps;
      const before = state.step;
      const endStep = before + actualSteps;

      for (const input of inputs) {
        if (input.step < before || input.step >= endStep) {
          throw new RangeError(
            `test double: input step ${input.step} is outside window [${before}, ${endStep})`,
          );
        }
      }

      const audioCues: AudioCue[] = [];
      const consumed: InputRecord[] = [];

      for (const record of inputs) {
        const event = record.event;
        switch (event.kind) {
          case "key": {
            if (event.down) {
              if (!state.keys.includes(event.name)) {
                state.keys.push(event.name);
                state.keys.sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));
              }
              state.cueId++;
              audioCues.push({
                cueId: state.cueId,
                kind: "volume.set",
                asset: null,
                loop: null,
                volume: 100,
              });
            } else {
              const index = state.keys.indexOf(event.name);
              if (index !== -1) {
                state.keys.splice(index, 1);
              }
            }
            break;
          }
          case "pointer": {
            state.pointer = {
              x: event.x,
              y: event.y,
              buttons: event.buttons,
            };
            break;
          }
          case "gamepad":
          case "asset":
          case "blob.loaded":
          case "blob.saved":
          case "blob.listed":
          case "extension.result":
          case "audio.ended":
          case "video.ended": {
            state.other++;
            break;
          }
          case "focus": {
            throw new Error("test double: focus pause is not modelled");
          }
          default: {
            const _never: never = event;
            throw new Error("test double: unexpected event kind");
          }
        }

        state.log = fnv1a64(state.log + canon(encodeLog(record)));
        consumed.push({
          step: record.step,
          event: deepCopyValue(record.event as InputEvent),
        });
      }

      state.step = endStep;
      const stateHash = hashState(state);

      return {
        stepsRun: actualSteps,
        stepAfter: state.step,
        consumed,
        audioCues,
        requests: [],
        diagnostics: [],
        loading: false,
        paused: null,
        stateHash,
      };
    },

    drawList(_alpha?: number): DrawList {
      const commands: DrawCommand[] = [
        {
          kind: "fill",
          rgb: { r: 0, g: 0, b: 0 },
        },
      ];

      for (let i = 0; i < state.keys.length; i++) {
        commands.push({
          kind: "rect",
          rect: { x: i * 16, y: 0, w: 16, h: 16 },
          rgb: { r: 255, g: 255, b: 255 },
          filled: true,
        });
      }

      commands.push({
        kind: "rect",
        rect: { x: state.pointer.x, y: state.pointer.y, w: 4, h: 4 },
        rgb: { r: 255, g: 0, b: 0 },
        filled: true,
      });

      return {
        step: state.step,
        width: 320,
        height: 240,
        commands,
      };
    },

    surfacePixels(_id: SurfaceId, _rev: number): SurfacePixels | null {
      return null;
    },

    setBreakpoints(_breakpoints: readonly Breakpoint[]): void {},
  };
}
