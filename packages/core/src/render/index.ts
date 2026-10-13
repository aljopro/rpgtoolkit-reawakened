/**
 * The draw-list builders (AD-29): one compositor from a board plus a view to
 * ordered commands. Runners, the editor canvas and a `viewBrd` preview all call
 * it, so the same board cannot look different in two places.
 */

export * from "./compose.ts";
