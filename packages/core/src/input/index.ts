export {
  applyInputEvent,
  configureInput,
  createInputSection,
  inputView,
  processGamepadEvents,
  pruneClaimed,
  takeInputActions,
} from "./input.ts";
export type { InputAction, InputConfig, InputKey, InputView } from "./input.ts";
export { inputPhaseRegistration, runInputPhase } from "./registration.ts";
export type { InputPhaseOptions } from "./registration.ts";
