/**
 * The handle table and the dictionary objects that live in it (OOP-10, entry
 * 19.3; docs/spec/engine/rpgcode-modules-and-objects.md#oop-10).
 *
 * A dictionary is an `ObjectRecord` with no class: its members are a plain JSON
 * object and `keys` is the order they were first written, which is the order a
 * dictionary is enumerated and saved in. Every function here is a plain
 * function over plain data (G1) with no clock, no randomness and no
 * enumeration order the language leaves open (G3).
 */

import type { Value } from "../ports/value.ts";
import type { ObjectRecord, VmState } from "./state.ts";

/** The `className` of a dictionary object: it has no class. */
export const DICTIONARY_CLASS = "";

/** Whether `record` is a dictionary object rather than a legacy class instance. */
export function isDictionary(record: ObjectRecord): boolean {
  return record.className === DICTIONARY_CLASS;
}

/**
 * The handle the next object takes (OOP-5, "handle numbers"): one more than the
 * table's size, moved past any live handle at or above it. It needs nothing but
 * the current handle table, so a restore allocates the same number.
 */
export function allocateHandle(vm: Pick<VmState, "objects">): number {
  let handle = vm.objects.length + 1;
  for (const item of vm.objects) if (item.handle >= handle) handle = item.handle + 1;
  return handle;
}

/** Make an empty dictionary object in the handle table and return its record (OOP-10). */
export function createDictionary(vm: Pick<VmState, "objects">): ObjectRecord {
  const record: ObjectRecord = {
    handle: allocateHandle(vm),
    className: DICTIONARY_CLASS,
    program: null,
    members: {},
    keys: [],
  };
  vm.objects.push(record);
  return record;
}

/** The record the handle table holds under `handle`, or `undefined` when it was freed. */
export function findObject(vm: Pick<VmState, "objects">, handle: number): ObjectRecord | undefined {
  return vm.objects.find((item) => item.handle === handle);
}

/**
 * Read member `key`: its value, or the unset value `0` when the object has no
 * such member (OOP-10: a missing key is not an error, like a missing array
 * element). Only the object's own members count; the key `"toString"` is not
 * found on the prototype chain.
 */
export function readMember(record: ObjectRecord, key: string): Value {
  return Object.hasOwn(record.members, key) ? record.members[key]! : 0;
}

/**
 * Write member `key`. A dictionary gains the key at the end of its enumeration
 * order when it was not there; writing an existing key keeps its place (OOP-10).
 * The property is defined, never assigned, so a key such as `"__proto__"` is
 * ordinary data.
 */
export function writeMember(record: ObjectRecord, key: string, value: Value): void {
  if (record.keys !== undefined && !Object.hasOwn(record.members, key)) record.keys.push(key);
  Object.defineProperty(record.members, key, { value, writable: true, enumerable: true, configurable: true });
}

/**
 * Remove member `key` (`kill(obj.key)`, KILL-1). A key that is not there is left
 * alone. Removing a key and writing it again puts it last (OOP-10).
 */
export function removeMember(record: ObjectRecord, key: string): void {
  if (!Object.hasOwn(record.members, key)) return;
  delete record.members[key];
  if (record.keys === undefined) return;
  const at = record.keys.indexOf(key);
  if (at >= 0) record.keys.splice(at, 1);
}

/** The member names of a dictionary in the order they were first written (OOP-10). */
export function dictionaryKeys(record: ObjectRecord): readonly string[] {
  return record.keys ?? Object.keys(record.members);
}
