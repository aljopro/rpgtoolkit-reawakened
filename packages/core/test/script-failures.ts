// A test helper, not a test: runtime failures no longer escape the VM (ticket
// 3.7; ERR-2), they are reported as located diagnostics. Tests that assert "this
// program fails with code X" advance one tick through `advanceOrFail`, which
// rethrows the first collected diagnostic as a `ScriptError` so the assertion
// reads the stable code and message.
import {
  advanceScriptTick,
  drainDiagnostics,
  ScriptError,
  type GameState,
  type ScriptServices,
  type ScriptStatus,
} from "../src/index.ts";

export function advanceOrFail(
  state: GameState,
  services: ScriptServices,
  budget?: number,
): ScriptStatus {
  const status = advanceScriptTick(state, services, budget);
  const [first] = drainDiagnostics(services);
  if (first !== undefined) {
    throw new ScriptError(first.code, first.message, { file: first.file, line: first.line });
  }
  return status;
}
