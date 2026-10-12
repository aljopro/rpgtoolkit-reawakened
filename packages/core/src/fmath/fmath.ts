/**
 * Deterministic maths for `core` (ADR 0002 Decision 2, AD-13).
 *
 * G3's enforcement inside `core` allows only the exactly-specified `Math`
 * members — `abs`, `ceil`, `floor`, `round`, `trunc`, `sign`, `min`, `max`,
 * `fround`, `imul`, `clz32`, `sqrt` — and bans `**`, `**=` and every other
 * `Math` member, because their results are implementation-approximated and can
 * differ in the last bit between JavaScript engines. Movement, collision and
 * battle formulas use trigonometry and powers, so a last-bit difference would
 * change a game's outcome and break replay hashes.
 *
 * This module rebuilds the rest of the maths surface from `+ - * /`,
 * comparisons and `Math.sqrt` alone, so the results are identical on every
 * engine (ADR 0002 Decision 2, cited by the architecture spine as AD-13).
 *
 * Two consequences shape the code:
 *
 * - Every constant is a plain decimal literal. The allowlist bans `Math.PI`
 *   and friends, so they cannot be referenced, and no constant may be derived
 *   with a banned operator.
 * - Trigonometry reduces its argument against a five-double split of pi/2 and
 *   is valid for `|x| <= 2^37` radians; outside that range it returns `NaN`
 *   rather than a meaningless value (a Payne–Hanek reduction is out of
 *   proportion for a game engine whose angles come from 0–360 degrees).
 *   Exponentials reduce against a two-double split of ln 2.
 *
 * The module imports nothing, so it stays pure `core` data (G2).
 */

// ── Constants (exact decimal literals; `Math.PI` is banned by the allowlist) ─

/** Pi, the ratio of a circle's circumference to its diameter. */
export const PI = 3.141592653589793;
/** Pi divided by two. */
export const HALF_PI = 1.5707963267948966;
/** Pi divided by four. */
export const QUARTER_PI = 0.7853981633974483;
/** The full turn, 2 * pi. */
export const TAU = 6.283185307179586;
/** Euler's number, the base of the natural logarithm. */
export const E = 2.718281828459045;
/** The natural logarithm of two. */
export const LN2 = 0.6931471805599453;
/** The natural logarithm of ten. */
export const LN10 = 2.302585092994046;
/** The base-two logarithm of Euler's number, 1 / ln 2. */
export const LOG2E = 1.4426950408889634;
/** The base-ten logarithm of Euler's number, 1 / ln 10. */
export const LOG10E = 0.4342944819032518;
/** The square root of two. */
export const SQRT2 = 1.4142135623730951;
/** One divided by the square root of two. */
export const SQRT1_2 = 0.7071067811865476;
/** Radians per degree, pi / 180. */
export const DEG_TO_RAD = PI / 180;
/** Degrees per radian, 180 / pi. */
export const RAD_TO_DEG = 180 / PI;
/** The tangent of pi / 8, the argument-reduction threshold for `atan`. */
export const TAN_PI_8 = 0.41421356237309515;
/**
 * The largest finite magnitude `sin`, `cos` and `tan` accept, 2^37 radians.
 * Beyond it the argument reduction's `k * (pi / 2)` product is no longer
 * exact, and the functions return `NaN`.
 */
export const TRIG_ARG_MAX = 137438953472;

// ── pi / 2 split (five doubles) ──────────────────────────────────────────────
//
// PIO2_A..PIO2_D carry 16 significant bits each, so for `|k| < 2^37` every
// product `k * PIO2_*` is exact and the residual is a pure subtraction chain.

const PIO2_A = 1.5707855224609375;
const PIO2_B = 1.0804273188114166e-05;
const PIO2_C = 6.077094383272197e-11;
const PIO2_D = 6.123201175701337e-17;
const PIO2_E = 3.2820035428735005e-22;
/** 2 / pi, the multiplier that turns a radian argument into a quadrant count. */
const INV_PIO2 = 0.6366197723675814;

// ── ln 2 split (two doubles) ─────────────────────────────────────────────────
//
// LN2_HI carries 32 significant bits, so `k * LN2_HI` is exact for
// `|k| < 2^21`; LN2_LO carries the tail.

const LN2_HI = 0.6931471803691238;
const LN2_LO = 1.9082149292705877e-10;

// ── exp range ends (decimal forms of ln(MAX_VALUE) and ln(2^-1075)) ─────────

const EXP_ARG_MAX = 709.782712893384;
const EXP_ARG_MIN = -745.1332191019411;

/** 2^52, used to normalise a subnormal mantissa when reading an exponent. */
const TWO_POW_52 = 4503599627370496;
/** 2^53; every double at or above it is an even integer. */
const TWO_POW_53 = 9007199254740992;

// Scratch buffer for reading an IEEE-754 exponent without allocating per call.
const scratch = new DataView(new ArrayBuffer(8));

// ── Trigonometry ─────────────────────────────────────────────────────────────

/**
 * The residual `x - k * (pi / 2)` for a quadrant count `k`. The five-double
 * split makes each product exact and each subtraction carry no rounding, so
 * the residual is the true one up to the split's own tail.
 */
function residual(x: number, k: number): number {
  return (
    (((x - k * PIO2_A) - k * PIO2_B) - k * PIO2_C) - k * PIO2_D -
    k * PIO2_E
  );
}

/** Horner evaluation of the 12-term Taylor series for `sin`, valid on |r| <= pi/4. */
function sinSeries(r: number): number {
  const r2 = r * r;
  let s = -1 / 25852016738884976640000; // -1 / 23!
  s = s * r2 + 1 / 51090942171709440000; // 1 / 21!
  s = s * r2 - 1 / 121645100408832000; // 1 / 19!
  s = s * r2 + 1 / 355687428096000; // 1 / 17!
  s = s * r2 - 1 / 1307674368000; // 1 / 15!
  s = s * r2 + 1 / 6227020800; // 1 / 13!
  s = s * r2 - 1 / 39916800; // 1 / 11!
  s = s * r2 + 1 / 362880; // 1 / 9!
  s = s * r2 - 1 / 5040; // 1 / 7!
  s = s * r2 + 1 / 120; // 1 / 5!
  s = s * r2 - 1 / 6; // 1 / 3!
  s = s * r2 + 1; // 1 / 1!
  return r * s;
}

/** Horner evaluation of the 11-term Taylor series for `cos`, valid on |r| <= pi/4. */
function cosSeries(r: number): number {
  const r2 = r * r;
  let s = 1 / 2432902008176640000; // 1 / 20!
  s = s * r2 - 1 / 6402373705728000; // 1 / 18!
  s = s * r2 + 1 / 20922789888000; // 1 / 16!
  s = s * r2 - 1 / 87178291200; // 1 / 14!
  s = s * r2 + 1 / 479001600; // 1 / 12!
  s = s * r2 - 1 / 3628800; // 1 / 10!
  s = s * r2 + 1 / 40320; // 1 / 8!
  s = s * r2 - 1 / 720; // 1 / 6!
  s = s * r2 + 1 / 24; // 1 / 4!
  s = s * r2 - 1 / 2; // 1 / 2!
  s = s * r2 + 1;
  return s;
}

/**
 * The sine of `x` radians, for `|x| <= TRIG_ARG_MAX`; `NaN` outside that range
 * (including for `NaN` and infinities). Preserves the sign of a zero argument.
 */
export function sin(x: number): number {
  if (!(x >= -TRIG_ARG_MAX && x <= TRIG_ARG_MAX)) return NaN;
  if (x === 0) return x;
  const k = Math.round(x * INV_PIO2);
  const r = residual(x, k);
  const q = k - 4 * Math.floor(k / 4);
  if (q === 0) return sinSeries(r);
  if (q === 1) return cosSeries(r);
  if (q === 2) return -sinSeries(r);
  return -cosSeries(r);
}

/**
 * The cosine of `x` radians, for `|x| <= TRIG_ARG_MAX`; `NaN` outside that
 * range (including for `NaN` and infinities).
 */
export function cos(x: number): number {
  if (!(x >= -TRIG_ARG_MAX && x <= TRIG_ARG_MAX)) return NaN;
  const k = Math.round(x * INV_PIO2);
  const r = residual(x, k);
  const q = k - 4 * Math.floor(k / 4);
  if (q === 0) return cosSeries(r);
  if (q === 1) return -sinSeries(r);
  if (q === 2) return -cosSeries(r);
  return sinSeries(r);
}

/**
 * The tangent of `x` radians, for `|x| <= TRIG_ARG_MAX`; `NaN` outside that
 * range (including for `NaN` and infinities). Preserves the sign of a zero
 * argument.
 */
export function tan(x: number): number {
  if (!(x >= -TRIG_ARG_MAX && x <= TRIG_ARG_MAX)) return NaN;
  if (x === 0) return x;
  const k = Math.round(x * INV_PIO2);
  const r = residual(x, k);
  const s = sinSeries(r);
  const c = cosSeries(r);
  if (k - 2 * Math.floor(k / 2) === 0) return s / c;
  return -c / s;
}

/**
 * Horner evaluation of the alternating series for `atan`, valid on
 * |t| <= tan(pi/8), 25 terms. Horner rounds once per coefficient, unlike
 * `term *= -t * t; sum += term / (2i + 1)`, whose per-term division costs up
 * to 4 ULP.
 */
function atanSeries(t: number): number {
  const u = t * t;
  let s = 1 / 49; // i = 24
  s = s * u - 1 / 47;
  s = s * u + 1 / 45;
  s = s * u - 1 / 43;
  s = s * u + 1 / 41;
  s = s * u - 1 / 39;
  s = s * u + 1 / 37;
  s = s * u - 1 / 35;
  s = s * u + 1 / 33;
  s = s * u - 1 / 31;
  s = s * u + 1 / 29;
  s = s * u - 1 / 27;
  s = s * u + 1 / 25;
  s = s * u - 1 / 23;
  s = s * u + 1 / 21;
  s = s * u - 1 / 19;
  s = s * u + 1 / 17;
  s = s * u - 1 / 15;
  s = s * u + 1 / 13;
  s = s * u - 1 / 11;
  s = s * u + 1 / 9;
  s = s * u - 1 / 7;
  s = s * u + 1 / 5;
  s = s * u - 1 / 3;
  s = s * u + 1;
  return t * s;
}

/**
 * The arc tangent of `x`, in radians, in `(-pi/2, pi/2)`. Preserves the sign
 * of a zero argument; `atan(+-Infinity)` is `+-pi/2`.
 */
export function atan(x: number): number {
  if (x !== x) return NaN;
  if (x === Infinity) return HALF_PI;
  if (x === -Infinity) return -HALF_PI;
  if (x === 0) return x;
  const neg = x < 0;
  let a = neg ? -x : x;
  let complement = false;
  if (a > 1) {
    a = 1 / a;
    complement = true;
  }
  let shift = 0;
  if (a > TAN_PI_8) {
    a = (a - 1) / (a + 1);
    shift = QUARTER_PI;
  }
  let r = atanSeries(a) + shift;
  if (complement) r = HALF_PI - r;
  return neg ? -r : r;
}

/**
 * The angle in radians of the point `(x, y)` against the positive x axis, in
 * `(-pi, pi]`, following the IEEE-754 quadrant, zero and infinity rules.
 * `atan2(-0, 1)` is `-0`; `atan2(-Infinity, -Infinity)` is `-3 * pi / 4`.
 */
export function atan2(y: number, x: number): number {
  if (y !== y || x !== x) return NaN;
  if (y === Infinity) {
    if (x === Infinity) return QUARTER_PI;
    if (x === -Infinity) return 3 * QUARTER_PI;
    return HALF_PI;
  }
  if (y === -Infinity) {
    if (x === Infinity) return -QUARTER_PI;
    if (x === -Infinity) return -3 * QUARTER_PI;
    return -HALF_PI;
  }
  if (x === Infinity || x === -Infinity) {
    if (x === Infinity) return y === 0 ? y : y < 0 ? -0 : 0;
    return y < 0 || (y === 0 && 1 / y < 0) ? -PI : PI;
  }
  if (y === 0) {
    if (x > 0) return y;
    if (x < 0) return 1 / y < 0 ? -PI : PI;
    return 1 / x > 0 ? y : 1 / y < 0 ? -PI : PI;
  }
  if (x === 0) return y > 0 ? HALF_PI : -HALF_PI;
  const r = atan(y / x);
  if (x > 0) return r;
  return y > 0 ? r + PI : r - PI;
}

/**
 * The arc sine of `x`, in `[-pi/2, pi/2]`; `NaN` when `|x| > 1`.
 */
export function asin(x: number): number {
  if (x < -1 || x > 1) return NaN;
  return atan2(x, Math.sqrt((1 - x) * (1 + x)));
}

/**
 * The arc cosine of `x`, in `[0, pi]`; `NaN` when `|x| > 1`.
 */
export function acos(x: number): number {
  if (x < -1 || x > 1) return NaN;
  return atan2(Math.sqrt((1 - x) * (1 + x)), x);
}

// ── Exponential and logarithm ────────────────────────────────────────────────

/**
 * `e` raised to the power `x`. `exp(710)` is `Infinity` and `exp(-746)` is
 * `0`; `exp(-Infinity)` is `0`.
 */
export function exp(x: number): number {
  if (x !== x) return NaN;
  if (x === Infinity) return Infinity;
  if (x === -Infinity) return 0;
  if (x > EXP_ARG_MAX) return Infinity;
  if (x < EXP_ARG_MIN) return 0;
  const k = Math.round(x * LOG2E);
  const r = (x - k * LN2_HI) - k * LN2_LO;
  // Horner evaluation of the 21-term Taylor series for `exp`, valid on
  // |r| <= ln(2) / 2. Horner rounds once per coefficient, unlike the obvious
  // `term = term * r / i` recurrence, whose repeated division costs ~4 ULP.
  let y = 1 / 2432902008176640000; // 1 / 20!
  y = y * r + 1 / 121645100408832000; // 1 / 19!
  y = y * r + 1 / 6402373705728000; // 1 / 18!
  y = y * r + 1 / 355687428096000; // 1 / 17!
  y = y * r + 1 / 20922789888000; // 1 / 16!
  y = y * r + 1 / 1307674368000; // 1 / 15!
  y = y * r + 1 / 87178291200; // 1 / 14!
  y = y * r + 1 / 6227020800; // 1 / 13!
  y = y * r + 1 / 479001600; // 1 / 12!
  y = y * r + 1 / 39916800; // 1 / 11!
  y = y * r + 1 / 3628800; // 1 / 10!
  y = y * r + 1 / 362880; // 1 / 9!
  y = y * r + 1 / 40320; // 1 / 8!
  y = y * r + 1 / 5040; // 1 / 7!
  y = y * r + 1 / 720; // 1 / 6!
  y = y * r + 1 / 120; // 1 / 5!
  y = y * r + 1 / 24; // 1 / 4!
  y = y * r + 1 / 6; // 1 / 3!
  y = y * r + 1 / 2; // 1 / 2!
  y = y * r + 1; // 1 / 1!
  y = y * r + 1; // 1 / 0!
  return scaleByPow2(y, k);
}

/**
 * `2^k` for an integer `k` with `|k| <= 1024`, by repeated squaring. Every
 * factor is a power of two, so no step rounds.
 */
function pow2(k: number): number {
  let m = k < 0 ? -k : k;
  let p = 1;
  let b = k < 0 ? 0.5 : 2;
  while (m > 0) {
    if (m - 2 * Math.floor(m / 2) === 1) p *= b;
    b *= b;
    m = Math.floor(m / 2);
  }
  return p;
}

/**
 * Multiplies `y` by `2^k`. Above `2^1023` one factor of two folds into the
 * significand, and below `2^-1022` the scaling happens in two steps, so a
 * result in the subnormal range is rounded once instead of twice — without
 * that, `exp(-745)` returns zero where the smallest subnormal is correct.
 */
function scaleByPow2(y: number, k: number): number {
  if (k > 1023) return (y * 2) * pow2(k - 1);
  if (k < -1022) return (y * pow2(k + 1022)) * pow2(-1022);
  return y * pow2(k);
}

/** The high 32 bits of `x`'s IEEE-754 pattern. */
function hiWord(x: number): number {
  scratch.setFloat64(0, x, false);
  return scratch.getUint32(0, false);
}

/**
 * The mantissa of a positive finite `x`, normalised into `[0.7071, 1.4142)`,
 * by reading the IEEE-754 bit pattern (no banned `Math` member involved). The
 * matching exponent is `exponentOf(x)`; the two are separate so `log` stays
 * allocation-free, which matters because it sits under `pow` and `cbrt`.
 */
function mantissaOf(x: number): number {
  let hi = hiWord(x);
  if (((hi >>> 20) & 0x7ff) === 0) {
    // Subnormal: scale by 2^52 to bring it into the normal range.
    hi = hiWord(x * TWO_POW_52);
  }
  scratch.setUint32(0, (hi & 0xfffff) | 0x3ff00000, false);
  const m = scratch.getFloat64(0, false);
  return m > SQRT2 ? m * 0.5 : m;
}

/** The exponent `e` such that `x = mantissaOf(x) * 2^e`, for a positive finite `x`. */
function exponentOf(x: number): number {
  let hi = hiWord(x);
  let e = ((hi >>> 20) & 0x7ff) - 1023;
  if (e === -1023) {
    // Subnormal: scale by 2^52 to bring it into the normal range.
    hi = hiWord(x * TWO_POW_52);
    e = ((hi >>> 20) & 0x7ff) - 1023 - 52;
  }
  scratch.setUint32(0, (hi & 0xfffff) | 0x3ff00000, false);
  return scratch.getFloat64(0, false) > SQRT2 ? e + 1 : e;
}

/** `log(m)` for a mantissa `m` in `(0.7071, 1.4142)`, via `2 * atanh((m-1)/(m+1))`. */
function logSeries(m: number): number {
  const s = (m - 1) / (m + 1);
  const s2 = s * s;
  let term = s;
  let sum = s;
  for (let i = 1; i < 14; i++) {
    term *= s2;
    sum += term / (2 * i + 1);
  }
  return 2 * sum;
}

/**
 * The natural logarithm of `x`. `log(0)` is `-Infinity` and `log(x < 0)` is
 * `NaN`.
 */
export function log(x: number): number {
  if (x !== x) return NaN;
  if (x < 0) return NaN;
  if (x === 0) return -Infinity;
  if (x === Infinity) return Infinity;
  const e = exponentOf(x);
  return e * LN2_HI + (logSeries(mantissaOf(x)) + e * LN2_LO);
}

/** The base-two logarithm of `x`, exact at powers of two. */
export function log2(x: number): number {
  if (x !== x) return NaN;
  if (x < 0) return NaN;
  if (x === 0) return -Infinity;
  if (x === Infinity) return Infinity;
  return exponentOf(x) + logSeries(mantissaOf(x)) / LN2;
}

/** The base-ten logarithm of `x`. */
export function log10(x: number): number {
  return log(x) * LOG10E;
}

// ── Powers and roots ─────────────────────────────────────────────────────────

/** Whether `y` is an integer (all doubles at or above 2^53 are). */
function isInteger(y: number): boolean {
  return Math.trunc(y) === y;
}

/** Whether `y` is an odd integer; a non-integer is never odd. */
function isOddInteger(y: number): boolean {
  const t = Math.trunc(y);
  if (t !== y) return false;
  const h = y / 2;
  return Math.floor(h) !== h;
}

/** `base^exponent` by binary exponentiation, for a non-negative integer `exponent`. */
function intPowPositive(base: number, exponent: number): number {
  let result = 1;
  let b = base;
  let m = exponent;
  while (m > 0) {
    if (m - 2 * Math.floor(m / 2) === 1) result *= b;
    b *= b;
    m = Math.floor(m / 2);
  }
  return result;
}

/**
 * `base` raised to an integer `exponent` by binary exponentiation — halving
 * with `Math.floor`, never `exp`/`log` — so small powers are exact.
 */
function intPow(base: number, exponent: number): number {
  const negExp = exponent < 0;
  let m = negExp ? -exponent : exponent;
  if (m >= TWO_POW_53) {
    // Every double this large is an even integer; compare |base| with 1.
    const a = Math.abs(base);
    if (a > 1) return negExp ? 0 : Infinity;
    if (a < 1) return negExp ? Infinity : 0;
    return 1;
  }
  const result = intPowPositive(base, m);
  if (!negExp) return result;
  if (result === Infinity) {
    // The positive power overflowed, but its reciprocal can still be a
    // representable subnormal (`pow(2, -1074)` is the smallest, not zero), so
    // accumulate the reciprocal and round once from that side instead.
    return intPowPositive(1 / base, m);
  }
  return 1 / result;
}

/**
 * `base` raised to the power `exponent`, with the ECMAScript special-case
 * table. An integer exponent is computed by repeated multiplication (so
 * `pow(2, 10)` is exactly `1024`); a fractional exponent of a positive base is
 * `exp(y * log(x))`, whose relative error grows like `|y * ln x| * 2^-53`.
 */
export function pow(base: number, exponent: number): number {
  if (exponent !== exponent) return NaN;
  if (exponent === 0) return 1;
  if (base !== base) return NaN;
  if (base === Infinity) return exponent > 0 ? Infinity : 0;
  if (base === -Infinity) {
    const odd = isOddInteger(exponent);
    if (exponent > 0) return odd ? -Infinity : Infinity;
    return odd ? -0 : 0;
  }
  if (base === 0) {
    const odd = 1 / base < 0 && isOddInteger(exponent);
    if (exponent > 0) return odd ? -0 : 0;
    return odd ? -Infinity : Infinity;
  }
  if (exponent === Infinity) {
    const a = Math.abs(base);
    if (a > 1) return Infinity;
    if (a < 1) return 0;
    return NaN;
  }
  if (exponent === -Infinity) {
    const a = Math.abs(base);
    if (a > 1) return 0;
    if (a < 1) return Infinity;
    return NaN;
  }
  if (base < 0 && !isInteger(exponent)) return NaN;
  if (isInteger(exponent)) return intPow(base, exponent);
  return exp(exponent * log(base));
}

/**
 * The cube root of `x`, with the sign of `x`. Preserves a zero argument.
 */
export function cbrt(x: number): number {
  if (x !== x) return NaN;
  if (x === 0 || x === Infinity || x === -Infinity) return x;
  const neg = x < 0;
  const a = neg ? -x : x;
  let y = exp(log(a) / 3);
  // One Newton step (quadratic) turns the exp/log estimate into a good one.
  y = (2 * y + a / (y * y)) / 3;
  return neg ? -y : y;
}

/**
 * The length of the hypotenuse `(a, b)`, scaled so it cannot overflow or
 * underflow mid-computation. An infinite component gives `Infinity`.
 */
export function hypot(a: number, b: number): number {
  const ax = Math.abs(a);
  const ay = Math.abs(b);
  if (ax === Infinity || ay === Infinity) return Infinity;
  if (ax !== ax || ay !== ay) return NaN;
  const hi = Math.max(ax, ay);
  if (hi === 0) return 0;
  const lo = Math.min(ax, ay);
  const r = lo / hi;
  return hi * Math.sqrt(1 + r * r);
}

// ── Degree / radian conversion ───────────────────────────────────────────────

/** Converts `degrees` to radians. */
export function toRadians(degrees: number): number {
  return degrees * DEG_TO_RAD;
}

/** Converts `radians` to degrees. */
export function toDegrees(radians: number): number {
  return radians * RAD_TO_DEG;
}
