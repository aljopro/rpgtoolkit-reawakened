/**
 * `PlainData` is the JSON-value family the engine's saveable state must stay
 * inside: `null`, a boolean, a finite number (never `-0`, but `number` in the
 * type — the sign of zero is a runtime property the state machine asserts),
 * a string, an array of `PlainData`, or a string-keyed record of `PlainData`.
 *
 * It exists so the compiler rejects `undefined`, functions, `Map`/`Set` and
 * class instances in a saveable position (G1 rule 2, AD-7). Values that are
 * not JSON numbers (`NaN`, `Infinity`) use a tagged form like
 * `{ t: 'nan' | 'inf' | '-inf' }`; maps and sparse arrays become ordered
 * entry lists.
 */
export type PlainData =
  | null
  | boolean
  | number
  | string
  | PlainData[]
  | { [key: string]: PlainData };

/**
 * Type-level constraint helper for saveable positions. Annotate a state type
 * (or a value) with `AssertPlainData<T>` and the compiler fails unless `T` is
 * assignable to `PlainData`:
 *
 * ```ts
 * type VmState = { threads: Thread[]; globals: { [k: string]: Value } };
 * type _VmStateIsPlainData = AssertPlainData<VmState>;
 * ```
 *
 * A function type, `undefined`, `Map`/`Set` or a class instance all fail the
 * constraint (G1 rule 2, AD-7).
 */
export type AssertPlainData<T extends PlainData> = T;
