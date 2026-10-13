# Render readiness: what the docs do not decide

Research produced for the epic's inception, 2026-10-12. Docs-only, no legacy source opened (G7). It is the render-side analogue of `epic-rpgcode-vm/discovery/language-readiness.md`: the list of places where `docs/` does not determine the implementation, and therefore where an implementer would have to invent behaviour that G7 forbids inventing.

Sources audited: `docs/format-spec.md` §3, §4, §5, §7.1 and §9.11; `docs/engine-features.md` E-01..E-06, E-10..E-19, E-50..E-63; the architecture spine (`AD-1`–`AD-4`, `AD-10`, `AD-15`, `AD-25`–`AD-30`, `AD-32`, `AD-33`); and, as the empirical cross-check, `epic-legacy-formats/discovery/spec-readiness.md` and `corpus-inventory.md`.

**This is what entry 21 rules.** Every finding below is either settled in a docs-only commit (its own commit, G7) or explicitly deferred with the entry it affects named. Nothing in the render lane is built from an invented default.

## The findings, most blocking first

| # | Section / id | What is undetermined | Blocked entries |
|---|---|---|---|
| 1 | format-spec §3.4 | The `iso2d` projection's sampling filter (nearest or bilinear), the sampling grid and its sub-pixel offset, the fractional tie rounding, and the diamond clip boundary are unstated — §3.4 says only "some reasonable affine resample" and waives pixel parity. Deterministic pixels need the rule. | 2, 3 |
| 2 | format-spec §4.3, §5; E-53 | The tile traversal order within a layer is unstated for iso-stacked (staggered columns) and iso-rotated (the `(sizeX+sizeY)²` grid), so which tile covers which, and where a sprite occludes a tile, is undefined. | 3, 4 |
| 3 | E-30, E-31, E-52; format-spec §4.4; AD-3 | Under-vector promotion: clip to the polygon hull or to whole cells, how promotion combines with E-31's sprite translucency, and how any of it is expressed when AD-3's command union has no polygon clip. | 2, 4 |
| 4 | E-55; format-spec §9.11 | Message window geometry and defaults: size percentage, default font and point size, interior padding, line leading, the unit and rate of the reveal speed, word-wrap rules, and what happens on overflow (scroll, page or clip). | 6 |
| 5 | format-spec §4.2, §4.5; E-17 | Shading: whether overlapping shade layers with overlapping cast scopes add or take a maximum, the tint for cells a run list does not reach, and the attenuation formulas for elliptical spotlights and linear and clipped gradients. | 5 |
| 6 | format-spec §4.5; E-17, E-52; AD-3 | The ambient boundary: §4.5 and E-17 enumerate tiles, images and sprite frames, while AD-3's post-composite tint reads as a blanket. Does ambient reach the message window, the persistent overlay, canvases, animations and modal widgets? | 5, 6, 7 |
| 7 | format-spec §4.3; E-29; AD-25 | Sprite z-order has no secondary tie-breaker when anchors are equal, and E-29's re-insert-on-move rule is insertion-order hysteresis, which AD-25's total-order rule forbids. | 4 |
| 8 | format-spec §4.2, §4.3 | Parallax: the scroll formula divides by zero when the board matches the screen, behaviour is undefined when image or board is smaller than the screen, how an image's stored `left`/`top` combines with camera displacement is unstated, and normal-mode background tiling is unstated. | 4 |
| 9 | format-spec §2 row 43; E-05 | Debug overlays: `.gam` stores only `pathColor`, with no fields for board-vector, sprite-vector or destination-marker colours; the bit positions of `drawVectorsFlags` are unassigned; the marker's shape and the tile-grid overlay's toggle have no storage at all. | 4 |
| 10 | E-60, E-61; format-spec §9.11 | Modal widgets: parameter signatures, return codes, screen position, box and button dimensions, hotspot geometry, fonts and border rules are absent. | 16 |
| 11 | E-58; format-spec §9.11; AD-27 | Screen save and restore: the slot range and capacity, the parameter signatures, slot lifetime across `send` and across save and load, and whether an empty slot restores transparently or errors. | 7 |
| 12 | E-56, E-57; format-spec §9.11 | Canvas built-ins: the six parameter lists are `...`, the sub-rectangle coordinate system is unstated, and `renderNow(bool)` does not say which canvas becomes the overlay. | 7 |
| 13 | E-59; format-spec §9.11; AD-33 | Transitions: which fade types exist, the wipe effect ids and mask semantics, default durations in ticks, whether a transition blocks the script, the earthquake decay equation, and its audio cue — on top of the fx-versus-camera ownership split. | 8, 11 |
| 14 | AD-33; E-51 | Camera: the deadzone box dimensions, the per-tick smoothing coefficient or velocity cap, the recognised easing curves, and the border fill for centred small boards. | 11 |
| 15 | E-63; format-spec §9.11 | `viewBrd`: whether `(x, y)` is the camera focus, the tile origin or the destination position; whether the board's sprites, shading and ambient are drawn; and the clip. | 4, 17 |
| 16 | format-spec §3.5, §4.3; E-13 | `.tan`: whether "static" means only `animatedTiles(false)` or also pause and focus loss, the fallback when a referenced `.tan` is missing or empty, and whether a `.tan` may reference another. The reader itself is epic tk2-support entry 16.7's. | 9, 22 |
| 17 | format-spec §7.1; E-54; format-spec §9.11 | Animations: whether a finished non-persistent animation frees itself or holds its last frame, `sizedAnimation`'s argument list, and whether frame sounds retrigger on each loop. | 9 |
| 18 | E-15; format-spec §4.2, §9.12 | E-15 promises board constants substituted by name, but §4.2 stores only an unnamed 0-indexed array; the name mapping cannot come from board data alone. | 15 |
| 19 | E-14; format-spec §9.11 | `put` and `layerPut`: whether coordinates are 1-based cells or follow `PX_ABSOLUTE`, the out-of-bounds error, and whether a redraw rebuilds synchronously or marks the world dirty for the next tick. | 14, 17 |
| 20 | E-56; format-spec §9.11; AD-15 | Text defaults: the boot font family, point size and colour; how `text`'s cell units map to pixels and where its anchor is; and `pixelText`'s anchor. | 6 |
| 21 | AD-3; E-56; format-spec §9.11 | Native texture alpha against the blit's `alpha`, and E-56's fixed "50 % translucent" against §9.11's variable percentage. | 2 |
| 22 | E-19 | `send`'s visual cutover: blank to black, hold the previous frame until the enter program yields, or cut on the next tick. | 13 |

## Cross-epic interface pins (the same entry settles these)

Found by auditing epic `rpgcode-vm`'s provider entries against what epic 4 consumes. **Entry 21 lands these four contracts in the AD that owns each**; each is a place where epic 3's builder and epic 4's builder would otherwise invent different interfaces.

| Contract | State of the provider | Why it pins now |
|---|---|---|
| `waits` and `threads` phase handlers, and how a module registers into AD-26's phase list | 3.9 promises the handlers and an instruction-granular resumable step but names no signature; 3.2's plan exports `runWaitsPhase`/`runThreadsPhase` and hardcodes waits → threads → tick inside `advanceScriptStep` | 4.12 owns the phase list (AD-26) and must call them; 4.15's breakpoint cursor is the engine's |
| `GameState` section typing and replacement | 3.2's plan ships `GameState` with placeholder aliases (`Record<string, never>`) for the sections other epics own | 4.6, 4.7, 4.8, 4.10, 4.11, 4.12 and 4.16 give those sections (ui, surfaces, fx, world, camera and engine) real types; without a stated replacement rule the type rejects them |
| The harness request and reply seam | 3.7 removes the driver's throw on non-empty `requests` but adds no way to reply | 4.12's engine emits asset requests (AD-5); without a reply seam the golden run stalls in `loading` |
| The tick names | **Not a pin of entry 21.** 3.26 owns the rename and its own spine and doc amendments, and it **landed 2026-10-12**: the port is now `advance(ticks, …, maxTicks) -> TickReport` with `ticksRun` and `tickAfter`, and the spine says the tick counter and tick-based smoothing. Entry 21 and entry 1 both cite the landed names | 1 (through 3.26) |
| Program loading and thread spawning for the lifecycle | 3.8 covers `#include` and the program cache; 3.9 covers the thread kinds; neither exports the call 4.13's startup phase makes | 4.13 loads and starts the startup and enter programs |
| `core/time` signatures and rounding | AD-2 names `frameAt`, `secondsToSteps`, `fpsToSteps` and 3.13 ships them; the rounding values are marked Deferred in the spine | 4.9's animated tiles and animations use `frameAt`. The rounding rule is 3.9's own doc-first ruling (it tunes the budget); this audit only records that it must exist |
| Command-override warnings | 3.3 emits one `command.overridden` warning per replaced name, on the Logger port (AD-24) | 4.17 replaces dozens of stubbed rendering names; the warnings must reach the Logger and never `TickReport.diagnostics`, and 3.21's stub test must run against the stub pack in isolation. Recorded here; the Logger port is 3.3's and the stubs are 3.21's |

## What the audit confirmed rather than changed

- **The corpus pins less than the epic needs.** Three boards, all 2D (`coordType` 0 or 4), two layers each, no background or board images, no lights, ambient `(0,0,0)`, one shade layer each (real run records, values 0 to −30), two sprites in total, and every board link empty. Tilesets are version 20, detail 1 only. Zero fonts, zero `.tan`. The assets that do survive pin exact byte-level facts: the 24-bit key `(0,1,2)`, R,G,B byte order, column-major pixels, the `.anm` frame key `0x00FFFFFF`, and the 1024-pixel diamond mask. Entry 22 exists because of this.
- **`viewBrd` and the `put`/`layerPut` signatures are ruled here** because entries 4, 14 and 17 all read them; the `+8 px` iso sprite offset (conflict 6) is ruled here too, since entry 3 builds it.
- **The golden reference has no external source.** The recovered visual archaeology is Toolkit 2 editor chrome; the Toolkit 3 screenshot set is 85 % lost and covers no board rendering; the sample games supply input data, not appearance. So assumption A1 stands: the reference is this epic's own reviewed output, with the empirical facts above as the independent check.
- **The `.tan` reader has one owner: epic tk2-support entry 16.7** (format-spec §3.5 and the other TK2-era formats), which runs before this epic. Entries 9 and 22 pin it rather than writing a second reader.
- **Game fonts are TrueType.** Format-spec §1.5 and §10 name `.ttf` as the game font; the archived TK2 `.fnt` files (`RPGTLKIT FONT`) are a different, undocumented format owned by 16.7. Entry 22's fixture font is therefore a `.ttf`.
- **The sample corpus is exercisable for:** 2D boards, layer order, colour keys, animated-tile mechanics (with a fixture), shade records, and the message window's frame asset. **Not exercisable:** iso, parallax, lights, ambient, fonts, `.tan`, multi-layer boards, conditional items and a scripted startup and `send` — all of which entry 22 must author or source.

## Source conflicts worth recording

1. **Parallax mode with no image.** All three sample boards store `backgroundDrawType = 1` (parallax) with an empty `backgroundImage`. The compositor must treat that as a no-op rather than computing a scroll factor.
2. **Two transparent keys.** `.tst` uses `(0,1,2)`; every `.anm` frame stores `0x00FFFFFF`. A frame that references a tile must key on the tile's own key, not the frame's, or sprite backgrounds come out opaque.
3. **`mwinSize` is obsolete.** Format-spec §9.11 and E-55 present it as active; the recovered 3.1.0 help changelog lists it as obsolete. Keep it for compatibility and say so.
4. **`earthquake` is `fx` in the catalogue but camera state in AD-33** — deliver both halves, in entries 8 and 11.
5. **`reset` is epic menu-party-save's in the catalogue but E-06 is cited by this epic** — entry 13 delivers the startup re-entry and this epic's sections' reset through a port.
6. **The `+8 px` sprite offset on iso boards** is described against the editor display; whether it applies to runtime draw lists is unstated.
