/**
 * Bytes and the structured-cloneable port family (AD-1, AD-5, AD-7).
 *
 * `PlainData` (see `plain-data.ts`) is the saveable-state family and never
 * holds bytes. AD-1 and AD-5 put bytes on the runner seam — asset replies,
 * blob payloads and `surfacePixels` — so port positions use `PortData`:
 * `PlainData` plus `Uint8Array` leaves, structured-cloneable, so every engine
 * argument and result survives a Worker boundary (AD-1). Every port-contract
 * field is required and an absent value is `null` (never an omitted key, never
 * `undefined`); `exactOptionalPropertyTypes` is a backstop for that rule, not
 * the rule itself.
 */

import type { PlainData } from "./plain-data.ts";

/**
 * A byte sequence crossing the runner seam. Outputs never alias state: every
 * emitted `Bytes` owns its whole buffer (`byteOffset` 0) and is a copy, and a
 * host may transfer a buffer only when the core marks it handed off (AD-1).
 */
export type Bytes = Uint8Array;

/**
 * Everything a port — an engine input, report or request — may carry: the
 * saveable `PlainData` family plus `Uint8Array` leaves, nested through arrays
 * and string-keyed records. Structured-cloneable (AD-1).
 */
export type PortData =
  | PlainData
  | Bytes
  | readonly PortData[]
  | { readonly [key: string]: PortData };

/**
 * Type-level constraint helper for port positions. Annotate an engine input,
 * report or request with `AssertPortData<T>` and the compiler fails unless `T`
 * is assignable to `PortData`:
 *
 * ```ts
 * type _ReportIsPortData = AssertPortData<TickReport>;
 * ```
 *
 * A function-typed or `undefined` field fails the constraint (AD-1).
 */
export type AssertPortData<T extends PortData> = T;
