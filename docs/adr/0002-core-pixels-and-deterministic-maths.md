# ADR 0002 — Pixels and text in the core, deterministic maths, dev-only tools

* **Status:** Accepted (2026-10-10)
* **Date:** 2026-10-10
* **Amends:** [guardrails.md](../guardrails.md) G3, G4 and G6; [architecture-options.md](../architecture-options.md) §2
* **Context documents:** [ADR 0001](0001-typescript-core.md), [guardrails.md](../guardrails.md), [architecture-options.md](../architecture-options.md), [spec/README.md](../spec/README.md)

## Summary

Three changes, in plain terms:

1. **The core draws pixels after all.** One drawing engine that turns the core's drawing instructions into pixels now lives inside `core`, together with font and image decoding. Scripts can read pixels back, so those pixels must be the same on every runner, and only the core can promise that.
2. **The core uses only exact maths.** Inside `core`, only the `Math` functions that give the same answer on every JavaScript engine are allowed. Everything else (`sin`, `pow`, the `**` operator, …) comes from a small core module built from exact operations.
3. **Tools we only use to publish are not "shipped".** The `ovsx` command-line tool (EPL-2.0), used to upload the VS Code extension to Open VSX, is outside the licence gate's shipped tree because it never ends up in anything we ship.

Before this ADR, the guard-rails and the architecture comparison said the core produces no pixels and that text layout is a runner job. The architecture spine needs the opposite, and the guard-rails can only change through an ADR. This ADR is that change.

## Terms

* **Draw list:** the ordered list of drawing instructions (blit an image, fill a rectangle, draw text, …) that the core emits each frame. It contains no pixels.
* **Rasteriser:** code that turns a draw list (and any stored bitmaps) into actual pixels.
* **Reference rasteriser:** the one rasteriser whose output is, by definition, correct. Other renderers are tested against it.
* **Renderer (in G4's sense):** a runner-side component that replays a draw list onto a screen, for example WebGL2 or Canvas2D.
* **Implementation-approximated:** a property of the JavaScript standard. For functions such as `Math.sin` or `Math.pow`, the standard lets each engine choose its own approximation, so results can differ in the last bit between browsers and Node versions.

## Context

The project's binding rules (G1–G7) and the architecture comparison were written before the architecture spine. The spine found three places where they block or miss something it needs.

**Pixels that scripts read.** RPGCode can read pixels back: `getPixel`, `canvasGetScreen`, and saving and restoring the screen to numbered slots. Scripts can also draw onto persistent off-screen canvases. If each runner produced its own pixels (WebGL2 in the browser, a CPU renderer in tests), a script reading a pixel could get different values on different runners, and a replay could diverge. The old seam handled this with "read-back requests" sent to the runner, which would make simulation results depend on the runner and its timing.

**Text and images.** The old seam made text layout a runner capability because platform fonts differ. That lets word wrap, glyph shapes and therefore script-visible pixels differ per platform. Image decoding had the same problem: a browser decoder and a Node decoder may disagree on colour-key edges or gamma.

**Maths.** G3 bans the obvious sources of non-determinism (`Math.random`, `Date`), but not the implementation-approximated `Math` functions. Movement, collision and battle formulas use trigonometry and powers, so a last-bit difference between JavaScript engines could change a game's outcome and break replay hashes.

**Publish-only tools.** Publishing to Open VSX uses the `ovsx` CLI, which is EPL-2.0. G6 blocks any licence outside its allowlist for every shipped artefact. `ovsx` is never bundled, linked or shipped, but G6 did not say so, and a naive scan of all dev dependencies would fail on it.

## Decision

1. **A single reference rasteriser, glyph rasterisation and image decoding live in `core`.**
   * `core/raster` is the one reference rasteriser. It is pure and does no I/O. It turns a draw list plus core-owned surfaces into a bitmap and serves pixel read-back and screen save and restore. *Reason: only the core can give scripts the same pixels on every runner.*
   * Persistent surfaces (script canvases, saved screens) are core-owned bitmaps in game state, changed only by `core/raster`. Runners read their pixels from the core; they never send pixels back. *Reason: one owner per bitmap means saves, replays and cache flushes cannot lose or fork a canvas.*
   * Line breaking, glyph advances and glyph rasterisation are done in `core`. Game fonts arrive as assets; a bundled bitmap font is the fallback and the test font. Platform fonts are an opt-in runner mode, off in golden and conformance runs. *Reason: word wrap and glyph pixels must not depend on which fonts the platform has.*
   * Game images are decoded once, in `core`, to straight RGBA, and the rasteriser applies the colour key (the `key` of a `blit`) to those pixels. Runners and the editor use the core's decoder and never decode game images themselves. *Reason: a runner's decoder could produce different pixels from the ones scripts read.* (Clarified 2026-10-11 in AD-28: the first wording said the decoder applies colour keys.)
   * The rasteriser is **not** a renderer in G4's sense. G4 still binds every runner-side renderer: they only replay draw lists, and they are tested against `core/raster`.
   * Any library added for this (PNG inflate, a font rasteriser, a JPEG decoder) joins the existing `core` runtime allowlist under G2 rule 3 after a licence check. No change to G2 is needed.

2. **Deterministic maths in `core`.**
   * In `core`, `Math` is an allowlist: `abs`, `ceil`, `floor`, `round`, `trunc`, `sign`, `min`, `max`, `fround`, `imul`, `clz32`, `sqrt`. These are exactly specified by the language standard. *Reason: every other `Math` function may round differently between engines.*
   * Every other `Math` member and the operators `**` and `**=` are banned in `core`. *Reason: `**` is implementation-approximated just like `Math.pow`.*
   * `core/fmath` supplies `sin`, `cos`, `tan`, `atan2`, `exp`, `log`, `pow` and the rest using only `+ − × ÷` and `sqrt`. `pow` with an integer exponent is exact by repeated multiplication. RPGCode's `^` operator calls `fmath.pow`. *Reason: these operations are exactly specified, so the results match on every engine.*
   * `core/fmath` square root and any NaN source in `core` returns one canonical positive NaN (exported as `CANONICAL_NAN`), ensuring identical bitwise representation across JavaScript engines.
   * This adds to G3's enforcement; G3's rules themselves are unchanged.

3. **Dev-only tools that are never shipped or linked sit outside G6's shipped tree.**
   * A tool used only during development or publishing, which is never bundled into, linked by or distributed with any artefact, is outside the production-dependency scan of G6. *Reason: G6 protects what users receive, and such a tool never reaches them.*
   * Each such tool must be named in this ADR, or in a later ADR, with its licence and why it is never shipped. The first and only one so far is **`ovsx`** (EPL-2.0), the Open VSX publishing CLI, run in the release job only.
   * The tool must stay out of every production dependency tree; the G6 scan still covers all production dependencies and fails if one appears there.
   * The same licence job also lists the licences of dev-only dependencies and fails on any outside the allowlist that is not named in an ADR. *Reason: the carve-out must be checked automatically, like every guard-rail.*

## Consequences

**Positive**
* Script-visible pixels, text and decoded images are identical on every runner, so replays and golden images stay valid across browsers, Node and native shells.
* The headless golden harness and the editor's image export use the same rasteriser as the core's read-back, so there is one source of truth for pixels.
* Movement and battle maths give bit-identical results on every JavaScript engine.
* The licence gate stays strict for shipped code without blocking the Open VSX release path.

**Negative / risks, with mitigations**
* *A CPU rasteriser in `core` is a hot path.* **Mitigation:** it sits behind a port; a runner may inject a faster (for example wasm) implementation, and the pure-TypeScript one stays the reference for goldens (ADR 0001's escape hatch). Any injected implementation must produce pixels bit-identical to `core/raster` and is checked by the same conformance fixtures.
* *Platform fonts may look better than the core's glyphs.* **Mitigation:** an opt-in `platformFonts` runner mode, never used in golden or conformance runs.
* *Hand-written maths is slower and less accurate than native `Math`.* **Mitigation:** `fmath` vector tests fix accuracy; exactness across engines matters more than the last digit.
* *A dev-only carve-out could be stretched.* **Mitigation:** each tool must be named in an ADR; the licence job also lists dev-only dependency licences and fails on any outside the allowlist that is not named in an ADR, and the G6 scan still fails if such a tool appears in a production tree.

## Alternatives considered

* **Runner read-back with a G3 exception.** Keep pixels in the runner and let the core request read-back. Rejected: simulation results would depend on the runner, its GPU and its timing, which needs a permanent exception to G3 and breaks replay hashes.
* **Retained canvas command lists.** Store each script canvas as the list of drawing commands that built it, replayed by the runner on demand. Rejected: `getPixel` still needs real pixels, the lists grow without bound, and every runner would still have to agree on the result pixel for pixel.

## Guard-rail changes

This ADR amends [guardrails.md](../guardrails.md) as follows. Everything not listed stays as it was.

* **G3 Enforcement:** the lint bullet adds the `Math` allowlist and the `**` / `**=` ban for `core` (Decision 2).
* **G4 Rule 1:** "CPU rasteriser" is removed from the renderer list. The rule now states that the single reference rasteriser lives in `core/raster`, is pure, and is not a renderer in G4's sense (Decision 1).
* **G4 Enforcement:** the agreement test compares `core/raster` with the WebGL2 renderer, and colour keys and tint must match exactly rather than within tolerance. *Reason: key and tint are integer rules, so any difference is a bug, not rounding.*
* **G6 Enforcement:** dev-only tools that are never shipped or linked sit outside the production-tree scan and are named in ADR 0002; the licence job also fails on any non-allowlisted dev-only dependency not named in an ADR (Decision 3).

The G3 summary in `CLAUDE.md` and the G3 item in the pull-request template are updated to match.

It also amends [architecture-options.md](../architecture-options.md) §2: the seam's `tick(dt)` becomes `advance`, read-back requests become core-owned persistent surfaces, and the "No pixels in the core" and "Text layout" bullets are rewritten to match Decision 1. In §1, R4 gains a note that read-back is served by `core/raster`, so runners need no copy back to the CPU.

## References

* Architecture spine (`_bmad-output/initiative-rpgtoolkit-reawakened/architecture-rpgtoolkit-reawakened/architecture-rpgtoolkit-reawakened.md`): AD-1 (engine API, `advance`), AD-3 (draw list and pixel pipeline), AD-4 (one reference rasteriser, in core), AD-6 (`fflate` as the first `core` allowlist entry), AD-13 (deterministic maths), AD-15 (text, fonts and layout are core-owned), AD-27 (surface model), AD-28 (images decoded once, in core), AD-30 (hot paths are ports); Deferred, "ADR 0002".
* Spec companion `packages.md` (`_bmad-output/initiative-rpgtoolkit-reawakened/spec-rpgtoolkit-reawakened/packages.md`): `core` responsibilities and the core ↔ runner seam; already consistent with this ADR.
* The engine spec ([spec/engine/](../spec/engine/)): [E-22](../spec/engine/movement-and-collision.md#e-22)…E-34 (movement), [E-56](../spec/engine/rpgcode-functions.md#e-56) (text and primitives, pixel get and set, off-screen canvases), [E-57](../spec/engine/main-loop-and-startup.md#e-57) (render-now overlay), [E-58](../spec/engine/rpgcode-functions.md#e-58) (screen save and restore), [E-70](../spec/engine/plugins-and-battle.md#e-70)…E-76 (battle), [E-132](../spec/engine/display-input-audio.md#e-132) (private fonts).
* The format spec ([spec/formats/](../spec/formats/README.md)): [tile shading](../spec/formats/board.md#tile-shading) (shading arithmetic), [images](../spec/formats/images.md) (media and assets).
* [guardrails.md](../guardrails.md): G2 rule 3 (`core` runtime allowlist), G3, G4, G5 rule 1, G6.
