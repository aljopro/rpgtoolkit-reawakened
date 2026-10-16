/**
 * The script VM's public surface (AD-22: the harness reaches it through
 * `@tk-reawakened/core` only).
 *
 * docs/adr/0004 (the AST, Step IR and plugin chain); docs/spec/engine/rpgcode-functions.md#rpgcode-built-in-commands/
 * docs/spec/engine/rpgcode-runtime.md.
 */

export {
  failureClass,
  HANDLER_NOT_HANDLING,
  HANDLER_TOP_LEVEL,
  HANDLER_UNKNOWN_LABEL,
  locateError,
  OBJECT_ABSTRACT_CLASS,
  OBJECT_INACCESSIBLE_MEMBER,
  OBJECT_INVALID,
  ScriptError,
  toDiagnostic,
} from "./errors.ts";
export type { FailureClass } from "./errors.ts";
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
export type {
  CompiledClass,
  FunctionInfo,
  LowerResult,
  ParamInfo,
  StatementRange,
} from "./lower.ts";
export { COMPILER_VERSION, compileInline, compileProgram } from "./program.ts";
export type { Program, ProgramRef } from "./program.ts";
export {
  createVmState,
  endBoardThreads,
  endItemThreads,
  findBlockingThread,
  findThread,
  globalRef,
  killThread,
  localRef,
  nextThreadId,
  refreshBlock,
  startProgram,
  startThread,
} from "./state.ts";
export type {
  CollectedMove,
  ErrorHandler,
  Frame,
  GlobalBlock,
  LocalSlot,
  PendingCall,
  QueuedInline,
  Thread,
  ThreadInit,
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
export { CATALOGUE_PLUGIN, CATALOGUE_RESPONDERS_PLUGIN } from "./catalogue-responders.ts";
export { CATALOGUE_STUBS_PLUGIN } from "./catalogue-stubs.ts";
export { drainEffects, EFFECT_LOG_CAP, recordDiagnostic, recordEffect } from "./effects.ts";
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
  ResolvedPlugin,
} from "./plugin.ts";
export type {
  PluginManifest,
  PluginManifestDiagnostic,
  PluginManifestEntry,
  PluginManifestOperation,
  PluginManifestParseResult,
  PluginManifestPatch,
  PluginManifestPatchResult,
} from "./manifest.ts";
export {
  applyPluginManifestPatch,
  DEFAULT_PLUGIN_MANIFEST,
  ENGINE_DEFAULT_MANIFEST,
  isPluginManifestEntryEnabled,
  parsePluginManifest,
} from "./manifest.ts";
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
  drainDiagnostics,
  createScriptServices,
  replyToRequest,
  runThreadsPhase,
  runWaitsPhase,
  STEP_BUDGET,
  stepThread,
} from "./vm.ts";
export {
  createWaitPoll,
  defaultWaitPoll,
  describeWait,
  pollInputKey,
  pollMovement,
  pollRequest,
  pollSleep,
  REQUEST_TIMEOUT_TEXT,
  WAIT_KIND_RESOLVERS,
} from "./waits.ts";
export type { ScriptServices, ScriptStatus } from "./vm.ts";
export { createDefaultVirtuals } from "./virtuals.ts";
export type { VirtualVariablePort } from "./virtuals.ts";
export { STRING_SPECS } from "./builtins/strings.ts";
export { CONVERSION_SPECS } from "./builtins/conversions.ts";
export { SCOPE_SPECS } from "./builtins/scope.ts";
export { THREAD_SPECS } from "./builtins/threads.ts";
export { ERROR_SPECS } from "./builtins/errors.ts";
export { createCollectingSink, createLogger, LOG_LEVELS, NULL_LOGGER } from "./logging.ts";
