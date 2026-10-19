/**
 * The one object model: the handle table and every object that lives in it,
 * dictionaries and legacy class instances alike (OOP-10, entries 19.3 and 19.5;
 * docs/spec/engine/rpgcode-modules-and-objects.md#oop-10).
 *
 * An object is an `ObjectRecord`: a class tag (`className`, `""` for a
 * dictionary, which has no class), its `members` as a plain JSON object, and
 * `keys`, the order they were first written in, which is the order an object is
 * enumerated and saved in. Whether an object has a class decides which rule set
 * applies to it (OOP-9 access labels and declared fields for a class instance;
 * any public key for a dictionary); the storage, the member read and write, the
 * call and the collection are the same. Every function here is a plain function
 * over plain data (G1) with no clock, no randomness and no enumeration order the
 * language leaves open (G3).
 */

import type { RefId, Value } from "../ports/value.ts";
import { declaredMembers, findMember } from "./classes.ts";
import { ScriptError } from "./errors.ts";
import type { SourcePos } from "./ops.ts";
import type { Program, ProgramRef } from "./program.ts";
import type { ObjectRecord, VmState } from "./state.ts";

/** The `className` of a dictionary object: it has no class. */
export const DICTIONARY_CLASS = "";

/** Whether `record` is a dictionary, an object with no class, rather than a legacy class instance. */
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

/**
 * Make an empty object in the handle table and return its record: a dictionary
 * when `tag` is `null`, an instance of the class `tag` names otherwise.
 */
export function createObject(
  vm: Pick<VmState, "objects">,
  tag: { readonly className: string; readonly program: ProgramRef } | null,
): ObjectRecord {
  const record: ObjectRecord = {
    handle: allocateHandle(vm),
    className: tag === null ? DICTIONARY_CLASS : tag.className,
    program: tag === null ? null : tag.program,
    members: {},
    keys: [],
  };
  vm.objects.push(record);
  return record;
}

/**
 * Make an instance of the class `className` that `program` declares (OOP-10):
 * every field of the class and its ancestors is a member, set to the unset value
 * `0`, in the order `declaredMembers` gives. A fixed array `m[10]` contributes
 * the elements `m[0]` to `m[9]`; a growable `var m[]` contributes none until an
 * element is written.
 */
export function instantiate(
  vm: Pick<VmState, "objects">,
  program: Program,
  ref: ProgramRef,
  className: string,
): ObjectRecord {
  const record = createObject(vm, { className, program: ref });
  for (const member of declaredMembers(program, className)) {
    if (member.arraySize === null) {
      writeMember(record, member.name, 0);
      continue;
    }
    for (let index = 0; index < member.arraySize; index += 1) writeMember(record, `${member.name}[${index}]`, 0);
  }
  return record;
}

/** The record the handle table holds under `handle`, or `undefined` when it was freed. */
export function findObject(vm: Pick<VmState, "objects">, handle: number): ObjectRecord | undefined {
  return vm.objects.find((item) => item.handle === handle);
}

/**
 * The check a `.` or `->` access makes before it reads or writes member `name`
 * (OOP-9, OOP-10). A dictionary has every key and all of them are public. An
 * object with a class has only the fields its class and ancestors declare, and
 * a private one needs the running method to be of the object's own class:
 * `accessClass` is the class of the running method, the one that defined it,
 * which is what access compares (`undefined` outside any method).
 */
export function checkMemberAccess(
  program: Program,
  record: ObjectRecord,
  name: string,
  accessClass: string | undefined,
  pos: SourcePos,
): void {
  if (isDictionary(record)) return;
  const member = findMember(program, record.className, name);
  if (member === undefined) throw new ScriptError("object.invalid", `unknown member ${name}`, pos);
  if (member.access === "private" && accessClass !== record.className) {
    throw new ScriptError("object.inaccessible-member", `member ${name} is private`, pos);
  }
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
 * Write member `key`. The object gains the key at the end of its enumeration
 * order when it was not there; writing an existing key keeps its place (OOP-10).
 * The property is defined, never assigned, so a key such as `"__proto__"` is
 * ordinary data.
 */
export function writeMember(record: ObjectRecord, key: string, value: Value): void {
  if (!Object.hasOwn(record.members, key)) record.keys.push(key);
  Object.defineProperty(record.members, key, { value, writable: true, enumerable: true, configurable: true });
}

/**
 * Remove member `key` (`kill(obj.key)`, KILL-1). A key that is not there is left
 * alone. Removing a key and writing it again puts it last (OOP-10).
 */
export function removeMember(record: ObjectRecord, key: string): void {
  if (!Object.hasOwn(record.members, key)) return;
  delete record.members[key];
  const at = record.keys.indexOf(key);
  if (at >= 0) record.keys.splice(at, 1);
}

/** The member names of an object in the order they were first written (OOP-10). */
export function objectKeys(record: ObjectRecord): readonly string[] {
  return record.keys;
}

/** The reference a member of object `handle` is read and written through: `object:<handle>:<name>`. */
export function objectRef(handle: number, name: string): RefId {
  return `object:${handle}:${name}` as RefId;
}

/** The handle and member name an `object:` reference names, or `null` when `ref` is not one. */
export function parseObjectRef(ref: string): { handle: number; name: string } | null {
  if (!ref.startsWith("object:")) return null;
  const separator = ref.indexOf(":", 7);
  if (separator < 0) return null;
  const handle = Number(ref.slice(7, separator));
  if (!Number.isInteger(handle)) return null;
  return { handle, name: ref.slice(separator + 1) };
}
