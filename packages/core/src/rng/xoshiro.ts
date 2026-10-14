/**
 * The one seeded generator: xoshiro128** over four `u32` words, seeded by
 * SplitMix32 (AD-12; guard-rail G3.1/G3.4).
 *
 * Every operation is 32-bit (`Math.imul`, `>>>`, shifts), so the sequence is
 * identical on every JavaScript engine. The seed is a `u32`; SplitMix32 expands
 * it into `s0…s3`, with a non-zero guard because xoshiro's fixed point is the
 * all-zero state. `nextUint32(state)` advances the state in place and returns a
 * uniform `u32`; `createRngPort(state)` binds the port to the live state that
 * lives in `GameState.rng`. Only this module constructs or mutates the
 * generator (AD-12).
 *
 * SplitMix32 (public-domain algorithm, Tommy Ettinger) is used purely as a
 * seed-diffusion function: a Weyl counter `c` starts at `seed + 0x9e3779b9` and
 * is incremented by `0x9e3779b9` before each of the four words, which is the
 * mix of that counter value — not the previous mixed output.
 */

import type { RngPort } from "../ports/rng.ts";

/** The generator state, four `u32` words, plain data in `GameState.rng`. */
export type RngState = { s0: number; s1: number; s2: number; s3: number };

/** The SplitMix32 output mix of one counter value (public-domain algorithm). */
function mix32(counter: number): number {
  let z = counter >>> 0;
  z = Math.imul(z ^ (z >>> 16), 0x21f0aaad);
  z = Math.imul(z ^ (z >>> 15), 0x735a2d97);
  return (z ^ (z >>> 15)) >>> 0;
}

/** Rotate a `u32` left by `k` bits (`0 < k < 32`). */
function rotl(x: number, k: number): number {
  return ((x << k) | (x >>> (32 - k))) >>> 0;
}

/**
 * Expand a `u32` seed into the four generator words with SplitMix32: a Weyl
 * counter `c = (c + 0x9e3779b9) >>> 0` advances once per word and each word is
 * `mix32(c)` (AD-12). The words are not all zero: if the expansion produced the
 * fixed point, `s0` is set to a non-zero constant (AD-12's non-zero guard).
 */
export function seedRng(seed: number): RngState {
  let counter = (seed + 0x9e3779b9) >>> 0;
  const s0 = mix32(counter);
  counter = (counter + 0x9e3779b9) >>> 0;
  const s1 = mix32(counter);
  counter = (counter + 0x9e3779b9) >>> 0;
  const s2 = mix32(counter);
  counter = (counter + 0x9e3779b9) >>> 0;
  const s3 = mix32(counter);

  if (((s0 | s1 | s2 | s3) >>> 0) === 0) {
    return { s0: 0x9e3779b9, s1, s2, s3 };
  }
  return { s0, s1, s2, s3 };
}

/**
 * Draw the next `u32` and advance `state` in place, the xoshiro128** step.
 */
export function nextUint32(state: RngState): number {
  const result = Math.imul(rotl(Math.imul(state.s1, 5) >>> 0, 7) >>> 0, 9) >>> 0;
  const t = (state.s1 << 9) >>> 0;

  state.s2 = (state.s2 ^ state.s0) >>> 0;
  state.s3 = (state.s3 ^ state.s1) >>> 0;
  state.s1 = (state.s1 ^ state.s2) >>> 0;
  state.s0 = (state.s0 ^ state.s3) >>> 0;
  state.s2 = (state.s2 ^ t) >>> 0;
  state.s3 = rotl(state.s3, 11);

  return result;
}

/** Bind an `RngPort` to the live `RngState` it advances (AD-12). */
export function createRngPort(state: RngState): RngPort {
  return { nextUint32: () => nextUint32(state) };
}
