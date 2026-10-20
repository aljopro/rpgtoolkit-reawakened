# Engine parity checklist

The summary of what "plays legacy games" means, area by area. It is the reference the headless golden tests hold the engine to (G5 in [../../guardrails.md](../../guardrails.md)): a golden may only change in a pull request that says why and is reviewed as a behaviour change.

The table is migrated verbatim from the legacy inventory's own summary (the §14 summary of the retired feature inventory), with its references re-pointed at this spec. **Must-have** is what a runner needs before it can claim to play a Toolkit 3.1 game; **nice-to-have** is worth having but a game can be played without it.

| Area | Must-have for "plays legacy games" | Nice-to-have |
|---|---|---|
| Formats | every format in [../formats/](../formats/README.md) | text-era formats, compiled `.prg`, legacy `.sav` |
| World | 2D + both iso modes, layers, animated tiles, images, parallax | |
| Collision | vector solid/stairs/under, sprite bases, sliding, edges | |
| Movement | queues, direction strings, paths, waypoints (copy and link), 3 pathfinders | |
| Triggers | E-40…E-49 exactly ([movement-and-collision.md](movement-and-collision.md#activation-programs-and-items)) | |
| Script | full RPGCode 3.1 language and built-ins, threads, blocking semantics | legacy-syntax auto-upgrade |
| Render | layer compositing, occlusion and translucency, shading and ambient, mwin, canvases, transitions | exact scroll-cache behaviour |
| Battle/Menu | default systems with identical rules, custom RPGCode replacements | identical visuals |
| Audio | looping music incl. **MIDI**, effects, volume | tracker modules |
| Save | full state incl. threads | legacy `.sav` import |
| Packaging | load a folder | import `.tpk` / appended-ZIP EXE |

**Reawakened rule.** Two rows are read through this specification rather than through the legacy inventory, and the Reawakened rulings there bind this checklist: **Render** keeps the *observable* compositing order but not the scroll cache or the frame-counted timing ([main-loop-and-startup.md](main-loop-and-startup.md#drawing-a-frame)), and **Script** means the rules the script pages settle, including the deliberate departures (a resumable interpreter, adjacent `!=`, exact error lines). "Exact scroll-cache behaviour" stays a nice-to-have, so no golden may depend on cache geometry.

Conflicts between the legacy inventory's wording and this spec are recorded on the page that owns the behaviour, each naming the epic that rules it, and none is ruled here; the twelve the migration found are R-50 to R-61. R-50 to R-54 were ruled by the owner on 2026-10-18 and are now rules on [movement-and-collision.md](movement-and-collision.md#r-50), with the E-112 gamepad contract in [display-input-audio.md](display-input-audio.md#reawakened-gamepad-contract).

> **Open conflict R-58 — the golden-image oracle.** the legacy feature inventory makes "exact scroll-cache behaviour" a nice-to-have and names no reference images; this spec, `docs/spec/engine/parity-checklist.md:15`, keeps that same row a nice-to-have, while `docs/spec/examples/renders/` holds three renders produced by an independent renderer (`docs/spec/tools/render.py`) rather than by the original engine. Owner epic: **board-rendering**. Landed code: none. The owner settles what the goldens may be compared against at inception; this page rules nothing.

<a id="golden-image-oracle"></a>
## Golden-image oracle (OWNER)

The ledger classifies every PNG as exactly one of `independent-reference`, `legacy-screenshot` or `regression-baseline`. It records the PNG path, class, gating flag and producer; the ledger is the sole authority for whether a golden gates CI. `independent-reference` scenes are authored from this specification by the independent renderer; `regression-baseline` scenes lock a Reawakened result; `legacy-screenshot` images are decoded and reported but never gate.

Each scene is plain data containing its board files, sprite records and every `SpriteDraw` field, global ambient, `view` (logical viewport size, camera and include flags) and tick. The compositor and raster oracle consume this schema rather than infer inputs from fixture code or PNG bytes.

<a id="closing-suite-baselines"></a>
**Closing suite (proposed, pending owner review; ticket 4.28).** Each fetched sample game (both 3.1 games and the six Toolkit 2 games) is booted through the real engine by `pnpm closing`, which follows `golden/closing/plan.json`: scripted key presses, frames at fixed ticks, and the same hashes under three different tick batchings (and under Bun in `pnpm golden:bun`: Node is covered by `pnpm golden` and `pnpm closing`, and Bun replays against the same committed baselines). Its frames are `regression-baseline` rows with `"suite": "closing"` in `golden/ledger.json`, filed under `golden/regression/closing/`, never under `golden/reference/`: they lock what Reawakened draws today and no independent renderer covers them. `golden/regression/closing.json` records, for each game, its outcome, the tick it reached, its located diagnostics, the state hash at every checkpoint and each frame's state, draw-list and pixel hashes. A game that cannot boot yet is a named expected failure in the plan (its epic and reason) and its recorded diagnostic is part of the baseline; a known failure that starts to succeed fails the suite until the plan is updated on purpose. An owner-supplied screenshot of a named frame can be added as a `legacy-screenshot` row for that frame; it is reported with the metric below and never gates.

**Legacy screenshot metric (OWNER).** Report decoded RGBA drift as both the per-pixel maximum absolute channel error and the mean absolute channel error. This is reporting only: exact screenshot bytes and either metric never create a pass/fail gate.

**Ellipse oracle rule (OWNER).** Independent-reference scenes use the integer midpoint ellipse and scanline fill defined at [display-input-audio.md#reawakened-light-and-raster-arithmetic](display-input-audio.md#reawakened-light-and-raster-arithmetic), not a floating-point edge test.
