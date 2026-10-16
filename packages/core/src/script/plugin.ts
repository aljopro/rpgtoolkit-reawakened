/**
 * The plugin contract: `PluginDefinition`, the command handler and its result
 * (AD-8; ADR 0004 decisions 2 and 6).
 *
 * ADR 0004 decision 2 dogfoods the engine's own command library as a plugin, so
 * first-party packs, the TK2 compat layer and a game-shipped plugin all use one
 * shape: `PluginDefinition = { id, version, commands, decoders? }`. Decision 6
 * adds the composition — the host resolves manifest ids to definitions and
 * hands an ordered list to `script/registry.ts`, which layers them, later first.
 *
 * The handler is AD-8's functional contract,
 * `(view, args, next) -> { value, out?, effects?, wait? }`:
 *
 * - `view` is read-only: game state plus the injected `rng` and `clock` ports
 *   (decision U2). A command mutates no state, which is what makes a command
 *   replayable and the registry pure.
 * - `value` is the call's result (`null` when there is none). ADR 0004 writes
 *   the contract as `{ out, effects, wait? }`; the call's value is what the VM
 *   pushes for `x = command()`, and the tracer's `done` carried it before this
 *   entry. The plan's edge-case matrix is explicit that the empty result of a
 *   `next` with no layer below has "value `null`" beside no `out`, no `effects`
 *   and no `wait`.
 * - `out` carries by-reference outputs as `[index, Value]` pairs; the VM writes
 *   each back to the caller's variable (AD-8's `Arg.ref`, AD-14's `null`).
 * - `effects` are plain-data records the VM stamps with `{ seq, tick, thread,
 *   name, … }` and stores in the `vm` section's effect log; the section owners
 *   drain them and apply the change (AD-10; decision U1; entry 21).
 * - `wait` parks only the calling thread (AD-9).
 * - `request` with `then` asks the host for something (ADR 0004 decision 7).
 *   Entry 3 accepts it in the contract and returns it unmodified; the VM
 *   refuses it until entry 9 implements the handling (decision U3).
 *
 * docs/adr/0004 (decisions 2 and 6); AD-8, AD-10.
 */

import type { AssetDecoder } from "../formats/registry/decoder.ts";
import type { PlainData } from "../ports/plain-data.ts";
import type { RngPort } from "../ports/rng.ts";
import type { ClockPort } from "../ports/time.ts";
import type { Value } from "../ports/value.ts";
import type { Wait } from "../ports/wait.ts";
import type { GameState, SectionKey } from "../save/state.ts";
import type { Arg, BuiltinSpec } from "./builtins.ts";
import type { EffectKind } from "./effects.ts";

/**
 * The read-only view a command runs against (AD-8; decision U2). It holds game
 * state read-only plus the two injected ports a command may draw from: the
 * seeded RNG (a draw advances `GameState.rng`, the one declared exception to
 * "a command mutates nothing") and the clock (G3).
 */
export type CommandView = {
  readonly rng: RngPort;
  readonly clock: ClockPort;
  readonly state?: GameState;
};

/**
 * One side effect a command reports as plain data (AD-10; decision U1). The
 * owning module applies it; a command never mutates a section itself.
 *
 * `section` names the AD-10 section the command writes; the VM turns it into
 * the recorded `EffectPatch` (`path: []`, `op: "merge"`, `value: null`). A
 * `pure` command reports no section, so its record's patch is `null`. `args`
 * lets a command report the arguments to record; absent means the VM records
 * the call's own argument values. `vm.control` is an internal marker the core
 * pack uses to unwind control flow (FUN-7): it is consumed by the VM and never
 * becomes an `EffectRecord`.
 */
export type CommandEffect = {
  readonly kind: EffectKind | "vm.control";
  readonly section?: SectionKey;
  readonly args?: readonly PlainData[];
};

/**
 * The continuation a `request` resumes with (ADR 0004 decision 7): a named
 * command plus plain-data arguments, never a closure, so it survives a save.
 */
export type CommandContinuation = {
  readonly command: string;
  readonly args: readonly PlainData[];
};

/**
 * A host request a command wants performed (AD-5, AD-17). Entry 3 accepts it as
 * plain data and does not interpret it; entry 9 wires the handling and may
 * narrow it to the published request union.
 */
export type CommandRequest = {
  readonly kind: string;
  readonly [field: string]: PlainData;
};

/**
 * What a command returns (AD-8). Only `value` is always present; every other
 * field is optional, so a command that returns nothing writes `{ value: null }`.
 */
export type CommandResult = {
  readonly value: Value;
  readonly out?: readonly (readonly [number, Value])[];
  readonly effects?: readonly CommandEffect[];
  readonly wait?: Wait;
  readonly request?: CommandRequest;
  readonly then?: CommandContinuation;
};

/**
 * The command contract `(view, args, next) -> CommandResult` (AD-8).
 *
 * `next` is the definition the same name has in the layer below: a wrapper may
 * call it and adjust its result, or ignore it and replace the command. Where no
 * lower layer defines the name `next` returns the empty result and warns
 * (decision U4).
 */
export type CommandHandler = (
  view: CommandView,
  args: readonly Arg[],
  next: CommandHandler,
) => CommandResult;

/** One plugin: an ordered command and asset pack (ADR 0004 decisions 2 and 6). */
export type PluginDefinition = {
  readonly id: string;
  readonly version: string;
  readonly commands: readonly BuiltinSpec[];
  /** Optional format contributions layered after the core decoder set (AD-31). */
  readonly decoders?: readonly AssetDecoder[];
};
