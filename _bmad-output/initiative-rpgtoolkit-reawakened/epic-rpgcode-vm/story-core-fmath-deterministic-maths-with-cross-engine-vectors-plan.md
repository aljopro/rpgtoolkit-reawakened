---
title: 'core/fmath: deterministic maths with cross-engine vectors'
type: 'feature'
ticket: '4'
created: '2026-10-11'
status: 'built'
baseline_revision: '7ff33f40a790f689d3fc2e9fd8a267b4957b0fce'
route: 'full'
route_source: 'auto'
risk: 'medium'
review: 'quick'
review_source: 'pinned'
lenses_ran: ['quick']
review_loop_iteration: 0
context: ['docs/adr/0002-core-pixels-and-deterministic-maths.md', 'docs/guardrails.md']
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** ADR 0002 (Decision 2) and spine AD-13 need `core/fmath`: inside `core`, `Math` is an allowlist of exactly-specified members only, so `sin`/`cos`/`tan`/`atan2`/`exp`/`log`/`pow` and the rest must exist in `core`, built from `+ − × ÷` and `Math.sqrt` alone. Without it, movement and battle maths can differ in the last bit between JavaScript engines and break replay hashes.

**Approach:** add a dependency-free `packages/core/src/fmath` (implementation + barrel) that exports the module's maths surface with exact special-case rules, plus two test files: behaviour/accuracy against the native `Math` oracle, and a committed bit-pattern vector set that pins the exact doubles every engine must return.

## Boundaries & Constraints

**Always:** only `+ − × ÷`, comparisons and the G3 `Math` allowlist (`abs, ceil, floor, round, trunc, sign, min, max, fround, imul, clz32, sqrt`). `Math.PI`/`Math.LN2`-style constants are banned by that allowlist, so every constant is a plain decimal literal. `src/fmath` imports nothing. `pow` with an integer exponent multiplies (binary exponentiation), never `exp`/`log`. Cite ADR 0002 Decision 2 and AD-13 (E-xx where a doc names them) in the module doc.

**Never:** no VM, parser, registry or built-in code; no new npm dependency (G2 rule 3 allowlist stays `fflate`); no change to `eslint.config.js` (its AD-13 `Math` allowlist and `**` ban already cover `packages/core/src/**`); no change to `tools/deps/edges.json` (it lists package-to-package edges; `fmath` is a module inside `core`); no `Math.random`, `Date`, `performance`, `Intl`, `toLocale*`; no golden/harness plumbing.

**Assumptions recorded at planning (no human checkpoint on this ticket):**
1. "and the rest" (ADR 0002 line 51) = `asin`, `acos`, `atan`, `log2`, `log10`, `cbrt`, `hypot`, the constants and degree/radian converters. Hyperbolic functions and `expm1`/`log1p` are *not* built until a consumer needs them.
2. Trig argument reduction is implemented for `|x| ≤ 2^37` (about 1.4e11 radians); outside it the functions return `NaN` rather than a meaningless value, and the limit is documented and tested. Reason: an exact `k·(π/2)` product needs 16 significant bits of the constant plus the bits of `k`, i.e. `k < 2^37`; a full Payne–Hanek reduction is out of proportion for a game engine whose angles come from 0–360°.
3. The committed vectors live in the test file itself (as `canon.test.ts` keeps its RFC vectors inline), not in `golden/`, which is the harness's fixture directory.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| trig special values | `sin(NaN)`, `tan(Infinity)` | `NaN` | No error; documented |
| trig beyond reduction limit | `cos(1e12)` | `NaN` | No error; documented limit `2^37` |
| signed zero preserved | `sin(-0)`, `atan(-0)`, `atan2(-0, 1)` | `-0` | No error |
| exp range ends | `exp(710)`, `exp(-746)` | `Infinity`, `0` | No error |
| log domain | `log(0)`, `log(-1)` | `-Infinity`, `NaN` | No error |
| asin/acos domain | `asin(1.0000001)`, `acos(-2)` | `NaN` | No error |
| pow exact integer | `pow(2, 10)`, `pow(3, -1)` | `1024`, `1/3` by repeated multiplication | No error |
| pow rules | `pow(-8, 1/3)`, `pow(0, -1)`, `pow(1, Infinity)` | `NaN`, `Infinity`, `NaN` | No error |
| atan2 quadrants | `atan2(0, -1)`, `atan2(-Infinity, -Infinity)` | `π`, `-3π/4` | No error |

</frozen-after-approval>

## Code Map

- `packages/core/src/fmath/fmath.ts` — new; the module (constants, then the functions). Only existing file it resembles is `packages/core/src/canon/fnv1a.ts`: same `/** … */` doc-comment style naming the AD, same plain export style, no imports.
- `packages/core/src/fmath/index.ts` — new barrel, exported symbols only, mirroring `packages/core/src/canon/index.ts`.
- `packages/core/src/index.ts` — append one `export * from "./fmath/index.ts";` line (additive; expect parallel branches to touch this file, keep it to one line).
- `packages/core/test/fmath.test.ts` — new; behaviour + accuracy vs the native `Math` oracle, plus the source-scan test.
- `packages/core/test/fmath-vectors.test.ts` — new; committed bit patterns + repeated-run stability + export coverage.
- `packages/core/test/node-env.d.ts` — read only; it declares the handful of `node:*` members the tests may use and a minimal `process`.
- `eslint.config.js` — read only: `g2Syntax` (line 148) already bans `Math.random`, every non-allowlisted `Math` member, `**`, `**=`, `toLocale*`; the `coreSourceFiles` block applies it to `packages/core/src/**`. Nothing to change.
- `tools/check-core-deps.mjs`, `tools/deps/edges.json`, `tools/provenance/markers.json` — read only; no dependency, edge or marker change is needed (no legacy identifiers in this module).
- Do not touch: `packages/core/src/ports/**`, `packages/core/src/script/**` (does not exist yet), any other package.

## Tasks & Acceptance

**Execution:**
- [ ] `packages/core/src/fmath/fmath.ts` — implement the surface in Design Notes with the exact constants and series — this is the ticket.
- [ ] `packages/core/src/fmath/index.ts` + `packages/core/src/index.ts` — export it additively — consumers (entries 5 and 13) import from the package root.
- [ ] `packages/core/test/fmath.test.ts` — behaviour, special values, accuracy against `Math`, and the "imports nothing banned" source scan — the ticket's verify sentence needs an oracle test and a guard test.
- [ ] `packages/core/test/fmath-vectors.test.ts` — committed bit patterns for a fixed input set covering every export, each computed twice in the same process — bit-identity across runs is the ticket's verify sentence.
- [ ] `node --test packages/core/test/fmath.test.ts packages/core/test/fmath-vectors.test.ts` — iterate until green; record the measured worst ULP per function in Implementation Notes — the accuracy bounds are evidence, not guesses.

**Acceptance Criteria:**
- Given the implementation, when the fixed vector set is evaluated twice in two interleaved passes, then both passes return the committed bit patterns exactly.
- Given an integer exponent, when `pow` runs, then the result equals repeated multiplication (`pow(2,10) === 1024`, `pow(3,5) === 243`) and never calls `exp`/`log`.
- Given a fractional exponent, when `pow` runs, then the value matches `Math.pow` within the documented relative error (`|y·ln x|` drives it).
- Given the fmath sources, when they are scanned, then they contain no import, no `require`, no banned global, no `Math` member outside the G3 allowlist, no `**`/`**=`, and no `toLocale*`.
- Given the twelve required repo checks, when they run, then all pass.

## Implementation Notes

Implemented from this plan by a dispatched subagent, then audited and fixed by the parent against an independent native-`Math` oracle sweep (see below).

**Parent-audited accuracy (fixed deterministic grids, ULP vs `Math`):** sin 2, cos 2, tan 3, atan 1, atan2 1, asin 3, acos 2, exp 1, log 2, log2 1, log10 1, cbrt 1, hypot 0; integer `pow` ≤ 1 ULP for small exponents and bit-exact against `Math.pow` on the pinned cases; fractional `pow` worst relative error 4.3e-15 on a 20 000-case grid. All 19 special-value cases from the frozen matrix match, including signed zeros.

**Deviations the parent corrected (each pinned by a new vector row):**
1. `exp` scaled with a single `y * 2^k` product, so a subnormal result was rounded twice and `exp(-745)` returned `0` instead of the smallest subnormal. Replaced with `scaleByPow2` (two-step scaling below `2^-1022`, one fold above `2^1023`), as the plan specified.
2. `pow` with a negative integer exponent returned `0` whenever the positive power overflowed, even when the reciprocal is representable: `pow(2, -1074)` is `5e-324` and `pow(10, -309)` is `1e-309`, both previously `0`. `intPow` now accumulates the reciprocal (`1 / base`) in exactly that case, so the result rounds once from the right side.
3. Every `%` was removed (four uses: `tan` parity and three squaring loops) in favour of floor-based parity, so the module is literally built from `+ − × ÷` and the `Math` allowlist as ADR 0002 says; the source scan now rejects `%` too.
4. `splitMantissa` returned a `{ e, m }` object per call — an avoidable allocation under `log`, which `pow` and `cbrt` call. Split into `hiWord`/`mantissaOf`/`exponentOf`, which read the bits and allocate nothing.
5. The test imported `ok` from `node:assert/strict`, which the shared minimal test types (`types/node-test.d.ts`, `packages/core/test/node-env.d.ts`) do not declare. The test defines a one-line local `ok` instead of widening a shared declaration file that parallel branches also touch.

**Assumption 2 in action:** `sin`/`cos`/`tan` return `NaN` outside `|x| ≤ 2^37`, and the limit, the reason and the boundary value are documented on `TRIG_ARG_MAX` and tested both sides of the boundary.

**Evidence (all run in this worktree):** `node --test packages/core/test/fmath.test.ts packages/core/test/fmath-vectors.test.ts` 21/21 pass, 0 skip; `pnpm build`, `pnpm typecheck`, `pnpm test` (438 pass / 11 skip without fixtures), `pnpm test:strict` after `pnpm fixtures:fetch` (449/449, 0 skip), `pnpm lint`, `pnpm graph` (132 modules), `pnpm provenance` (221 files, 0 violations), `pnpm licence`, `pnpm golden`, `pnpm dump:check`, and the five tool self-tests — all green.

## Plan Change Log

Empty: no review loopback re-derived this plan.

## Review Triage Log

**Pass 1** — `review: quick` (pinned), one lens launched: `quick`. One finding filed, one verified; verdicts high 0 / medium 0 / low 1 / false 0 / maybe-false 0.

| # | Finding | Verdict | Route | Evidence and action |
|---|---------|---------|-------|--------------------|
| 1 | `packages/core/src/fmath/fmath.ts`, above `intPowPositive`: two stacked `/** … */` blocks, the first a leftover copy of `intPow`'s doc ("`base` raised to an integer `exponent` … small powers are exact"), so only the second block is attached and the first is dead text | low | patch | Confirmed in the file: the stray block sat between `isOddInteger` and the one-line `intPowPositive` doc, duplicating the block above `intPow`. Deleted the stray block (smallest fix, no surface change). Re-ran the plan's verification after the patch: fmath tests 21/21 pass, 0 skip; `pnpm typecheck`, `pnpm lint`, `pnpm test` (449/449, 0 skip) all green. |

No `intent_gap` or `bad_plan` entries, so no loopback; the single patch was applied in place and the checks re-run.

## Design Notes

**Constants (exact decimal literals — derived, not transcribed):** `PI = 3.141592653589793`, `HALF_PI = 1.5707963267948966`, `QUARTER_PI = 0.7853981633974483`, `TAU = 6.283185307179586`, `E = 2.718281828459045`, `LN2 = 0.6931471805599453`, `LN10 = 2.302585092994046`, `LOG2E = 1.4426950408889634`, `LOG10E = 0.4342944819032518`, `SQRT2 = 1.4142135623730951`, `SQRT1_2 = 0.7071067811865476`, `DEG_TO_RAD = PI / 180`, `RAD_TO_DEG = 180 / PI`, `TAN_PI_8 = 0.41421356237309515`, `TRIG_ARG_MAX = 137438953472` (2^37).

**π/2 split** (five doubles; the products `k*PIO2_A…D` are exact for `k < 2^37` because A–D carry 16 significant bits each): `PIO2_A = 1.5707855224609375`, `PIO2_B = 1.0804273188114166e-05`, `PIO2_C = 6.077094383272197e-11`, `PIO2_D = 6.123201175701337e-17`, `PIO2_E = 3.2820035428735005e-22`, `INV_PIO2 = 0.6366197723675814`.
**ln2 split:** `LN2_HI = 0.6931471803691238` (32 significant bits, so `k*LN2_HI` is exact for `|k| < 2^21`), `LN2_LO = 1.9082149292705877e-10`.

**Algorithms.** `sin`/`cos`: `k = Math.round(x * INV_PIO2)`; `r = ((((x - k*PIO2_A) - k*PIO2_B) - k*PIO2_C) - k*PIO2_D) - k*PIO2_E`; Horner Taylor in `r²` for `sin` (terms `1, -1/6, 1/120 …`, 12 terms — write the coefficients as divisions of integer literals, e.g. `1/1307674368000`) and `cos` (11 terms); select by `k - 4*Math.floor(k/4)` (0→sin r, 1→cos r, 2→−sin r, 3→−cos r). `tan` = the same reduction, then `sin(r)/cos(r)`, negated-and-inverted when `k` is odd. `exp`: `k = Math.round(x*LOG2E)`, `r = (x - k*LN2_HI) - k*LN2_LO`, Taylor to `r^20/20!`, scale by `2^k` built with a squaring loop (two-step scaling below `2^-1022`). `log`: split `x` into exponent `e` and mantissa `m ∈ [0.7071, 1.4142)` via the IEEE bit pattern (`Math.fround`-free: read the bits with a `Float64Array`, not `DataView` — either is fine, the allowlist only restricts `Math`), series `log(m) = 2·(s + s³/3 + …)`, `s = (m-1)/(m+1)`, 14 terms; result `e*LN2_HI + (series + e*LN2_LO)`. `log2` = `e + log(m)/LN2` (exact at powers of two), `log10` = `log(x)*LOG10E`. `atan`: reduce `|x| > 1` to `π/2 - atan(1/x)` and `|x| > TAN_PI_8` to `π/4 + atan((x-1)/(x+1))`, then the alternating series `t - t³/3 + …` with 25 terms. `atan2`: full IEEE quadrant/zero/infinity rules, `a > b ? π/2 - atan(b/a) : atan(a/b)`. `asin`/`acos` from `atan2(x, sqrt((1-x)*(1+x)))`. `pow`: ECMAScript's special-case table, integer exponents by binary exponentiation (halving with `Math.floor`, no bitwise ops), `|exp| ≥ 2^53` decided by `|base|` vs 1 (always even), fractional exponents by `exp(y*log(x))`. `cbrt`, `hypot` (scaled), `toRadians`, `toDegrees` are one-liners over the above; `sqrt`-class functions are left to `Math`.

**Measured accuracy (prototype, to be re-measured by the tests):** sin/cos/tan ≤ 4 ULP, atan ≤ 2, atan2/asin/acos ≤ 8, exp ≤ 2, log/log2 ≤ 4, log10 ≤ 8, cbrt ≤ 16, hypot ≤ 4, integer `pow` ULP-exact for small exponents, fractional `pow` relative error ≈ `|y·ln x| · 2^-53`.

**Vectors:** ~90 rows, one per call, `{ name, args, bits }` with `bits` as `"0x" + 16 hex digits` from the implementation (generate with a throwaway script, never by hand); cover every export, `±0`, `NaN`/`Infinity` results, domain errors and the pow rules. The test checks coverage against `Object.keys(await import("../src/fmath/index.ts"))` so a future export cannot slip out unpinned.

## Verification

**Commands:**
- `node --test packages/core/test/fmath.test.ts packages/core/test/fmath-vectors.test.ts` — expected: all tests pass, no skips.
- (parent, after implementation) `pnpm build`, `pnpm typecheck`, `pnpm test`, `pnpm lint`, `pnpm graph`, `pnpm provenance`, `pnpm licence` — expected: all green.
