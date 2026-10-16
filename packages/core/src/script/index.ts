/**
 * The script VM's public surface (AD-22: the harness reaches it through
 * `@tk-reawakened/core` only).
 *
 * docs/adr/0004 (the AST, Step IR and plugin chain); format-spec §9.2/§9.5/
 * §9.15.
 */

export { ScriptError } from "./errors.ts";
export type { StepOp } from "./ops.ts";
export type { Ast, Expr, Statement } from "./ast.ts";
export { tokenize } from "./lex.ts";
export type { Token } from "./lex.ts";
export { parse } from "./parse.ts";
export { lower } from "./lower.ts";
export { COMPILER_VERSION, compileInline, compileProgram } from "./program.ts";
export type { Program, ProgramRef } from "./program.ts";
export { createVmState, globalRef, localRef, startProgram } from "./state.ts";
export type {
  Frame,
  Thread,
  ThreadKind,
  ThreadOwner,
  ThreadStatus,
  VmState,
} from "./state.ts";
export { CORE_PLUGIN } from "./builtins.ts";
export type { Arg, BuiltinSpec, ParamSpec } from "./builtins.ts";
export type {
  CommandContinuation,
  CommandEffect,
  CommandHandler,
  CommandRequest,
  CommandResult,
  CommandView,
  PluginDefinition,
} from "./plugin.ts";
export {
  assembleCommands,
  createCommandLookup,
  TIER_ORDER,
} from "./registry.ts";
export type {
  CommandLookup,
  CommandRegistry,
  CommandTiers,
  ResolvedCommand,
  TierLookup,
} from "./registry.ts";
export {
  advanceScriptTick,
  createScriptServices,
  pollSleep,
  runThreadsPhase,
  runWaitsPhase,
  STEP_BUDGET,
} from "./vm.ts";
export type { ScriptServices, ScriptStatus } from "./vm.ts";
