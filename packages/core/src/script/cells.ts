/**
 * Closure cells and the places a script value lives (FUN-8; ADR 0004 decision 8;
 * entry 18.6, docs/spec/engine/rpgcode-language.md#keywords-and-structure).
 *
 * `vm.cells` holds the private storage of the closures, by id, and a callable
 * value names its cells in `captures`. Four things need to know where a value
 * or a cell reference can sit in the `vm` section, so they share one walker,
 * `eachRootValue`: the cell collector below, the load-time shape check
 * (`core/save/handles.ts`) and the program-aware check (`restore-check.ts`).
 *
 * Everything here is a plain function over plain data (G1) with no clock, no
 * randomness and no iteration order the language leaves open (G3).
 */

import type { CallableValue, Value } from "../ports/value.ts";
import type { ProgramRef } from "./program.ts";
import type { VmState } from "./state.ts";

/** The text of a cell reference's scope, `cell:<id>` (see `cellRef`). */
const CELL_REF_PREFIX = "cell:";

/** The id a cell number is written as: `cell` and a positive whole number with no leading zero. */
const CELL_ID = /^cell[1-9][0-9]*$/;

/** The cell number of `id` (`cell12` is 12), or `null` when `id` is not an id the VM issues. */
export function cellNumber(id: string): number | null {
  if (!CELL_ID.test(id)) return null;
  const number = Number(id.slice(4));
  return Number.isSafeInteger(number) ? number : null;
}

/** The cell id a `cell:<id>` reference names, or `null` when `ref` is not one. */
export function cellIdOfRef(ref: unknown): string | null {
  return typeof ref === "string" && ref.startsWith(CELL_REF_PREFIX) ? ref.slice(CELL_REF_PREFIX.length) : null;
}

/** Whether `value` is a plain JSON object (not `null`, not an array); its fields stay `unknown`. */
export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/**
 * Whether `value`, which may be a raw parsed snapshot value, is a callable record
 * with the two fields the cell walkers read, a `def` text and a `captures` list.
 * The load-time shape check has already refused anything less whole.
 */
export function isCallableRecord(value: unknown): value is CallableValue {
  return (
    isRecord(value) &&
    value.type === "callable" &&
    typeof value.def === "string" &&
    Array.isArray(value.captures)
  );
}

/**
 * Visit every place outside the cell table where a script `Value` or a
 * variable reference sits in a `vm` section, with the path that names the place
 * (`vm.threads[0].frames[1].locals.n.value`). These are the roots a cell is
 * reached from: the globals, the members of every object, and each frame's
 * locals, operands and return value, plus a wait's resume references and
 * stored reply. `vm.cells` is not visited: a cell's value is reached only
 * through the cell.
 *
 * It reads a state that may be a raw parsed snapshot, so it skips whatever is
 * not the expected container instead of throwing; the shape check reports it.
 */
export function eachRootValue(
  vm: Readonly<Record<string, unknown>>,
  onValue: (path: string, value: unknown) => void,
  onRef: (path: string, ref: unknown) => void,
): void {
  const table = (base: string, entries: unknown): void => {
    if (!isRecord(entries)) return;
    for (const name of Object.keys(entries)) onValue(`${base}.${name}`, entries[name]);
  };
  table("vm.globals", vm.globals);
  if (Array.isArray(vm.objects)) {
    vm.objects.forEach((record: unknown, index) => {
      if (isRecord(record)) table(`vm.objects[${index}].members`, record.members);
    });
  }
  if (!Array.isArray(vm.threads)) return;
  vm.threads.forEach((thread: unknown, threadIndex) => {
    if (!isRecord(thread)) return;
    const base = `vm.threads[${threadIndex}]`;
    const wait = thread.wait;
    if (isRecord(wait)) {
      if (Array.isArray(wait.resumeRefs)) {
        wait.resumeRefs.forEach((ref: unknown, index) => onRef(`${base}.wait.resumeRefs[${index}]`, ref));
      }
      if (isRecord(wait.reply) && Object.hasOwn(wait.reply, "value")) {
        onValue(`${base}.wait.reply.value`, wait.reply.value);
      }
    }
    if (!Array.isArray(thread.frames)) return;
    thread.frames.forEach((frame: unknown, frameIndex) => {
      if (!isRecord(frame)) return;
      const at = `${base}.frames[${frameIndex}]`;
      if (isRecord(frame.locals)) {
        for (const name of Object.keys(frame.locals)) {
          const slot = frame.locals[name];
          if (!isRecord(slot)) continue;
          onValue(`${at}.locals.${name}.value`, slot.value);
          onRef(`${at}.locals.${name}.ref`, slot.ref);
        }
      }
      if (Array.isArray(frame.operands)) {
        frame.operands.forEach((arg: unknown, index) => {
          if (!isRecord(arg)) return;
          onValue(`${at}.operands[${index}].value`, arg.value);
          onRef(`${at}.operands[${index}].ref`, arg.ref);
        });
      }
      if (Object.hasOwn(frame, "returnValue")) onValue(`${at}.returnValue`, frame.returnValue);
    });
  });
}

/**
 * Record `ref` as the program that owns the definition `def` (FUN-8; entry
 * 18.6), unless one is already recorded: the first owner stays. A callable
 * names its definition only by `def`, and a restore rebuilds only the programs
 * its frames name, so this is what lets it find the program of a callable whose
 * creating program has ended.
 */
export function recordOwner(vm: VmState, def: string, ref: ProgramRef): void {
  const owners = (vm.defOwners ??= {});
  if (Object.hasOwn(owners, def)) return;
  Object.defineProperty(owners, def, { value: ref, writable: true, enumerable: true, configurable: true });
}

/**
 * Free every closure cell that no script can reach any more, and drop the
 * `vm.defOwners` entry of every definition no reachable callable names (FUN-8;
 * entry 18.6). Run once per tick, just before the object pass, so a cell that
 * only a dead cell's callable named goes with it and an object that only a freed
 * cell named is freed by the same tick's object pass (R-34).
 *
 * A cell is reachable when a root names it — a callable's `captures` entry or a
 * `cell:` reference in a frame slot, an operand or a wait's resume references —
 * or when another reachable cell's value is a callable that captures it.
 * Reachability, not a count, decides it, so a recursive local lambda, whose
 * cell holds a callable that captures that same cell, is freed with nothing
 * outside naming it. `vm.cellSeq` is not touched, so an id is never issued
 * twice. A state with no cell and no `vm.defOwners` is left alone.
 */
export function collectCells(vm: VmState): void {
  const owners = vm.defOwners;
  const cells = vm.cells;
  if (cells === undefined && owners === undefined) return;
  const table: { [id: string]: Value } = cells ?? {};
  const live = new Set<string>();
  const liveDefs = new Set<string>();
  const pending: string[] = [];
  const reach = (id: string | null): void => {
    if (id === null || id === "" || live.has(id) || !Object.hasOwn(table, id)) return;
    live.add(id);
    pending.push(id);
  };
  const visit = (value: unknown): void => {
    if (!isCallableRecord(value)) return;
    liveDefs.add(value.def);
    for (const id of value.captures) reach(id);
  };
  eachRootValue(
    vm,
    (_path, value) => visit(value),
    (_path, ref) => reach(cellIdOfRef(ref)),
  );
  for (let id = pending.pop(); id !== undefined; id = pending.pop()) visit(table[id]);
  for (const id of Object.keys(table)) {
    if (!live.has(id)) delete table[id];
  }
  if (owners !== undefined) {
    for (const def of Object.keys(owners)) {
      if (!liveDefs.has(def)) delete owners[def];
    }
  }
}
