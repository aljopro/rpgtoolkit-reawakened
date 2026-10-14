/**
 * The seeded random-number port (AD-12).
 *
 * Every core module draws randomness through `RngPort`; only `core/rng`
 * constructs or mutates the generator. `nextUint32` returns the next unsigned
 * 32-bit draw (`0 … 2^32 − 1`) and advances the generator state that lives in
 * `GameState.rng`.
 */

/** A uniform `u32` draw that also advances the generator state (AD-12). */
export type RngPort = { nextUint32(): number };
