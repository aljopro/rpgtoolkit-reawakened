/**
 * FNV-1a 64-bit over UTF-8 bytes (AD-11).
 *
 * The specification is the BigInt form:
 *
 * ```ts
 * hash = 0xcbf29ce484222325n;
 * for (const byte of bytes) hash = ((hash ^ BigInt(byte)) * 0x100000001b3n) & 0xffffffffffffffffn;
 * ```
 *
 * `stateHash` runs on every `advance`, so the shipped implementation keeps the
 * 64-bit accumulator as two 32-bit limbs and multiplies with `Math.imul`
 * instead, allocating nothing per byte. The BigInt form stays as the test
 * oracle; the two agree on the fixed vectors and on generated strings.
 */

import { utf8Encode } from "./utf8.ts";

// 0xcbf29ce484222325 split into 32-bit halves.
const OFFSET_BASIS_HIGH = 0xcbf29ce4;
const OFFSET_BASIS_LOW = 0x84222325;

// 0x100000001b3 = 2^40 + 0x1b3, so the prime's high limb is 0x100 and the low
// limb is 0x1b3.
const PRIME_LOW = 0x1b3;

/**
 * The 16-lowercase-hex FNV-1a 64-bit hash of `input`. A string is encoded to
 * UTF-8 first, so `fnv1a64("a")` hashes the same byte as `fnv1a64(utf8Encode("a"))`.
 */
export function fnv1a64(input: string | Uint8Array): string {
  const bytes = typeof input === "string" ? utf8Encode(input) : input;
  let high = OFFSET_BASIS_HIGH;
  let low = OFFSET_BASIS_LOW;

  for (let i = 0; i < bytes.length; i++) {
    low = (low ^ bytes[i]!) >>> 0;

    // low * 0x1b3 as a 48-bit product, kept in two limbs.
    const productLow = Math.imul(low & 0xffff, PRIME_LOW);
    const productHigh = Math.imul(low >>> 16, PRIME_LOW);
    const middle = (productHigh + (productLow >>> 16)) >>> 0;

    const nextLow = (((middle & 0xffff) << 16) | (productLow & 0xffff)) >>> 0;
    const carry = middle >>> 16;

    // high * primeLow + low * primeHigh + carry, mod 2^32. The prime's high
    // limb is 0x100, so low * primeHigh is low << 8.
    high = (Math.imul(high, PRIME_LOW) + (low << 8) + carry) >>> 0;
    low = nextLow;
  }

  return (
    high.toString(16).padStart(8, "0") + low.toString(16).padStart(8, "0")
  );
}
