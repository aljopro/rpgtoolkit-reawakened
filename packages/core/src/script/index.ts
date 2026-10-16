/**
 * The script VM's public surface (AD-22: the harness reaches it through
 * `@tk-reawakened/core` only).
 *
 * docs/adr/0004 (the AST, Step IR and plugin chain); docs/spec/engine/rpgcode-functions.md#rpgcode-built-in-commands/
 * docs/spec/engine/rpgcode-runtime.md.
 */

export { ScriptError } from "./errors.ts";
export type { BinaryOp, SourcePos, StepOp, UnaryOp } from "./ops.ts";
export type {
  Ast,
  Block,
  Expr,
  FunctionDef,
  IfBranch,
  Param,
  Statement,
  SwitchCase,
} from "./ast.ts";
export { foldAscii, tokenize } from "./lex.ts";
export type { Token } from "./lex.ts";
export { parse } from "./parse.ts";
export { lower } from "./lower.ts";
export type { FunctionInfo, LowerResult, ParamInfo } from "./lower.ts";
export { COMPILER_VERSION, compileInline, compileProgram } from "./program.ts";
export type { Program, ProgramRef } from "./program.ts";
export { createVmState, globalRef, localRef, startProgram } from "./state.ts";
export type {
  Frame,
  LocalSlot,
  Thread,
  ThreadKind,
  ThreadOwner,
  ThreadStatus,
  VmState,
} from "./state.ts";
export {
  compareEqual,
  compareRelational,
  indexKey,
  numberToString,
  stringToNumber,
  toInt32,
  toNumberValue,
  toStringValue,
  truthy,
} from "./values.ts";
export { CORE_PLUGIN } from "./builtins.ts";
export type { Arg, BuiltinSpec, ParamSpec } from "./builtins.ts";
export { CATALOGUE_STUBS_PLUGIN } from "./catalogue-stubs.ts";
export { drainEffects, EFFECT_LOG_CAP, recordEffect } from "./effects.ts";
export type {
  EffectKind,
  EffectPatch,
  EffectPatchOp,
  EffectRecord,
} from "./effects.ts";
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
  resolveCall,
  TIER_ORDER,
} from "./registry.ts";
export type {
  CallResolution,
  CommandLookup,
  CommandRegistry,
  CommandTiers,
  FunctionTarget,
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
export { createDefaultVirtuals } from "./virtuals.ts";
export type { VirtualVariablePort } from "./virtuals.ts";
export { STRING_SPECS } from "./builtins/strings.ts";
export { CONVERSION_SPECS } from "./builtins/conversions.ts";
export { SCOPE_SPECS } from "./builtins/scope.ts";
