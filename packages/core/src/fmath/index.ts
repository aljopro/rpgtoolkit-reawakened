/**
 * Deterministic maths (ADR 0002 Decision 2, AD-13): the trigonometry,
 * exponential, logarithm, power and root functions `core` may not take from
 * `Math`, plus the mathematical constants. Everything is built from `+ - * /`
 * and `Math.sqrt`.
 */

export {
  PI,
  HALF_PI,
  QUARTER_PI,
  TAU,
  E,
  LN2,
  LN10,
  LOG2E,
  LOG10E,
  SQRT2,
  SQRT1_2,
  DEG_TO_RAD,
  RAD_TO_DEG,
  TAN_PI_8,
  TRIG_ARG_MAX,
  sin,
  cos,
  tan,
  atan,
  atan2,
  asin,
  acos,
  exp,
  log,
  log2,
  log10,
  sqrt,
  pow,
  cbrt,
  hypot,
  toRadians,
  toDegrees,
} from "./fmath.ts";
