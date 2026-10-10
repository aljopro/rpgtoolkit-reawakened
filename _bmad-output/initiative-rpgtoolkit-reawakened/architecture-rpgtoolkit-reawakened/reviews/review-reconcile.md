---
lens: reconcile
target: ../architecture-rpgtoolkit-reawakened.md
companions-read: [../c4.md, ../.memlog.md]
inputs-reconciled:
  - docs/guardrails.md (G1-G7)
  - docs/adr/0001-typescript-core.md
  - docs/architecture-options.md §2, §8 (plus §1 R1-R9)
  - docs/engine-features.md §1.2, §1.3, E-01..E-132
  - docs/editor-features.md T-01..T-82, §10, §11
  - docs/format-spec.md §1.5, §9, §13 (plus §4.5, §11, §14)
  - spec-rpgtoolkit-reawakened.md (CAP-1..CAP-18, Constraints) and packages.md
  - 15 epic envelopes + tickets.toml
date: 2026-10-10
verdict: needs-amendment
---

# Reconcile review — architecture spine

## Verdict

The spine faithfully carries G1-G7, ADR 0001 and most of the seam, and its AD set is well aimed at cross-epic divergence. It is **not yet a safe build substrate**: five load-bearing inputs are contradicted or silently dropped (VM state shape vs G1, the per-frame screen model for script drawing, the blob round-trip, the dependency graph vs C4/AD-21/epics, and AD-4 vs AD-15 over text on canvases), and several quiet engine requirements (exclusive blocking programs, `multiRun`, per-step phase order, input-buffer state, audio cue verbs) have no owner AD. All fixes are amendments to existing ADs or one new AD; none needs a paradigm change.

Severity scale: **high** = independently built epics will diverge or a CAP success check cannot pass as written; **medium** = a named E-xx/T-xx behaviour has no home or is under-specified at a cross-epic seam; **low** = wording, tagging or enforcement gap.

---

## Part A — Real conflicts (spine contradicts an input)

### C-1 (high) AD-7 VmState schema omits state that G1 and E-120 require; `Frame.program` cannot represent dynamic code
- **Spine:** AD-7 fixes `VmState = { threads, globals, objects }`, `Thread = { id, kind, owner, frames, status, wait }`, `Frame = { program: { path, hash }, ip, locals }`, and says compiled programs are "rebuilt from asset bytes on restore".
- **Inputs contradicted:**
  - guardrails G1 rule 2 lists "instruction pointer, call frames, locals, **operand stack**, thread table, sleep and wait reasons, **error-handler state**" as required plain-data state. AD-7 has no operand stack (needed when a blocking built-in yields mid-expression, e.g. `x = wait() + 1`) and no error-handler state (format-spec §9.8 `setErrorHandler`, `setResumeNextHandler`, per function).
  - E-120 lists **redirects** in the save; format-spec §9.6 `redirect()` is global and also remaps built-ins. Not in VmState.
  - E-95 source/target context is per running program; format-spec §9.3 `autoLocal(true)` is per function/program. Neither has a slot.
  - `rpgCode(line)`, `tellThread(id, code)` (E-93, §9.11) and inline-RPGCode trigger programs (E-40 table note, format-spec §14, editor-features §10) execute code that has **no asset path**, so `program: { path, hash }` + "rebuild from asset bytes" cannot restore them.
  - `ip` indexes compiled code; a save from build N restored in build N+1 with a changed compiler resumes at a wrong instruction. AD-23 migrations cannot migrate an `ip`. Nothing says what happens when the restored file's hash differs.
- **Fix:** widen AD-7: `Frame += { operands: Value[], errorHandler: { kind: 'none'|'label'|'resumeNext', label? }, autoLocal }`; `Thread += { source, target }`; `VmState += { redirects: Entry[] }`; `program` becomes `{ kind: 'file', path, hash } | { kind: 'inline', text }`; add `compilerVersion` to `SaveState` and state the rule on hash/compiler mismatch (e.g. restart the thread from the top, which format-spec §11 already permits as a fallback, plus a diagnostic).

### C-2 (high) AD-4 makes every script canvas a core bitmap, AD-15 makes runners draw text with platform fonts: game fonts disappear from canvases and screen restores
- **Spine:** AD-4: every surface a script can read (`canvas*`, `getPixel`, `canvasGetScreen`, screen save/restore) is a core-owned RGBA bitmap; read-back text uses core metrics. AD-15: runners draw glyphs with platform fonts; a bundled bitmap font is the test font.
- **Inputs:** E-56 text works on off-screen canvases; E-96 custom screens are built from canvases; E-58 save/restore screen; E-132 game-private `.ttf` fonts are available to text rendering.
- **Conflict:** every canvas is script-readable (`getPixel` takes a canvas), so under AD-4 all text drawn to a canvas, and every `saveScreen` → `restoreScreen`, is rasterised in core — where no TrueType rasteriser exists, only "metrics". Result: custom title menus and HUDs (the E-96 use case) show the fallback bitmap font instead of the game's font, and the screen changes font after a restore. AD-15's own deferred question (glyph *metrics* for E-132) is the smaller half; the missing half is glyph *rasterisation* in core.
- **Fix:** decide in AD-4/AD-15 one of: (a) core rasterises TrueType (pure-TS rasteriser on the `core` allowlist, fonts delivered as assets) so live and read-back text are identical; or (b) canvases are retained command lists replayed by runners, and only an explicit read (`getPixel`, `canvasGetScreen`) forces a core raster with the documented divergence; record which and add it to ADR 0002.

### C-3 (high) The dependency graph forbids imports that C4, AD-21 and the epics require
- **Spine (Design Paradigm graph, enforced by AD-22):** edges only `core→synth→{runner-web, runner-headless, lsp, dap, editor-ui}`, `runner-web→{runner-desktop, runner-mobile}`, `editor-ui→host-*`, `{lsp,dap}→host-vscode`.
- **Contradicted by:** c4.md `Rel(eui, rweb, "Previews with")` and `Rel(dap, rhead, …)`; AD-21 "dap runs the game through runner-headless" and "`MessageChannel` in a browser" (lsp must be loadable by host-web / editor-ui's CodeMirror); packages.md "runner-web … also the WYSIWYG renderer inside editor hosts"; tickets.toml epic 11 waits on epic 9 "runner-web for preview and test-run"; AD-20 `run.startGame` implemented by hosts needs a runner.
- **Effect:** the dependency-cruiser rule built from this graph (platform-baseline epic, G2/G4 checks) will reject `dap → runner-headless`, `editor-ui → runner-web` and `host-web → lsp` on day one, or the scaffold will quietly diverge from the spine.
- **Fix:** add `runnerheadless --> dap`, `runnerweb --> editorui` (or `runnerweb --> host-*` if preview lives in hosts — pick one), `lsp --> editorui` or `lsp --> hostweb/hostdesktop`, and state that same-tier edges are allowed only where drawn. G2 item 5 lists tiers, not intra-tier rules, so this is an elaboration, not a G2 change.

### C-4 (medium) AD-15, AD-1 and AD-4 silently rewrite the seam of architecture-options §2 and packages.md; ADR 0002's scope lists only AD-4 and AD-13
- architecture-options §2 and packages.md (part of the spec's "canonical contract") say: inputs `tick(dt)`; outputs include "read-back requests"; "**Text layout is a runner capability** (the core requests measure/draw text)"; the CPU rasteriser lives in `runner-headless`.
- The spine changes all four: `advance(steps)` (AD-1), core-owned bitmaps instead of read-back requests (AD-4), core-owned layout (AD-15), rasteriser in `core/raster` (AD-4). The memlog even records "text layout is a runner capability" as an inherited constraint, then AD-15 reverses it without an amendment note. Only AD-4 is flagged for ADR 0002.
- AD-4 also touches G4, not only §2: G4 rule 1 names the CPU rasteriser as a renderer that "implements the draw-list replay interface and nothing more"; under AD-4 a renderer inside `core` produces pixels that become game state (`canvasGetScreen` → `getPixel` → script variables). guardrails.md says rules change only by an ADR that amends the file.
- **Fix:** extend the Deferred ADR 0002 item to "amend architecture-options §2 seam bullets (tick, read-back, text layout), packages.md seam section and the G4 rule 1 wording"; mark AD-15 "amends §2 (text layout)".

### C-5 (medium) AD-21 "pausing means the runner stops calling `advance`" cannot honour breakpoints or statement stepping
- CAP-14 and the rpgcode-tooling epic require breakpoints, stepping, watches, threads and call stack. A breakpoint hits **inside** a 60 Hz step (AD-1 runs whole steps; one step executes many statements across threads). Stopping between `advance` calls cannot stop at a line, and stopping mid-step leaves `GameState` in a half-step condition that AD-21 says hooks may never create.
- **Fix:** add to AD-1/AD-21 a debug entry point, e.g. `advance` returns `{ paused: { thread, frame, line } }` with the step left open and resumable, the open-step cursor being part of `GameState` (so it snapshots), and debug hooks reading but not writing it.

### C-6 (low) AD-2 misquotes G3
- AD-2 says "G3 injects none; time is derived". G3 rule 1 says `core` **MUST** obtain time only from an injected clock. Deriving time from the step counter is compatible with G3, but the parenthetical states the opposite of the rule.
- **Fix:** "the step counter is the injected clock (G3.1); no wall clock enters `core`".

### C-7 (medium) board-rendering epic Done-when 4 vs AD-3/AD-4 on what a canvas is
- Epic board-rendering: "message window, text, primitives, **canvases** … are draw-list operations". AD-3 gives off-screen surfaces ids and `pushTarget/popTarget` (draw into them in the runner); AD-4 says every script-readable surface (all canvases) is a core bitmap shipped by `upload`. One canvas cannot be both a runner render target and an authoritative core bitmap without two diverging copies.
- **Fix:** state in AD-3 which surfaces `pushTarget` addresses (e.g. runner-private composition targets only: layer caches, transitions) and that script canvases are only ever `upload`ed; update the epic wording at inception. (Resolves together with C-2.)

---

## Part B — Gaps (input requirement with no home in the spine)

### G-1 (high) No AD fixes the per-step phase order or the exclusive blocking-program mode (§1.2, E-03, E-33, E-96)
- engine-features §1.2: a trigger-started program **takes exclusive control**; the world is frozen except for what it does, while threads keep their slices. E-03 fixes the frame order: Idle-only input → multitask → move → edge check → trigger test → random battle → render, with states Idle/Movement/Pause/Quit. E-33: movement from a blocking program runs to completion unless inside `multiRun { … }`; from a thread it runs concurrently or pauses with `tkMV_PAUSE_THREAD`. E-96: a blocking script may own the frame indefinitely while frames still present and input still arrives.
- The spine has wait kinds and a thread budget (deferred), but no rule for: how the exclusive program is represented (a `Thread` with a `kind`? a separate slot?), whether threads run while it runs, its per-step budget (a non-yielding loop is preempted at the budget end, which makes `gameTime`/`getTickCount` advance where legacy did not), the `Thread.kind` values and who kills board threads on `send` (E-19) or item threads on item removal (E-93), and how `multiRun` collects several sprites into one `movement` wait.
- Five epics plug into this order (board-rendering owns "main loop", movement-triggers, rpgcode-vm, battle, menu-party-save). This is exactly the cross-epic divergence the spine exists to stop.
- **Fix:** new AD "Step phases and program modes": the enumerated phase order per step; `Thread.kind ∈ {'blocking','board','persistent','item'}` with lifecycle owners; at most one `blocking` thread, which suspends Idle input/triggers but not other threads; its budget rule; `multiRun` as a block that defers movement starts and then yields one `movement` wait over the collected sprite set.

### G-2 (high) No model for script drawing that persists on the screen (E-56, E-57, E-58, E-96)
- RPGCode drawing is immediate mode: `text`, `bitmap`, `fillRect`, `drawCanvas` onto the screen persist until cleared or redrawn (`forceRedraw`, format-spec §9.10/§9.11); `renderNow` composites the overlay canvas every frame (E-57); `saveScreen` captures the current screen (E-58).
- AD-1/AD-3 say `drawList()` is a pure function of state, rebuilt every frame with no deltas. Unstated: where the script's accumulated screen drawing lives in state (an unbounded retained command list? a core screen bitmap, which turns every frame into one `upload` and makes the WebGL replayer pointless?), when board rendering overwrites it (idle frames vs during a blocking program), and how the overlay is ordered.
- **Fix:** add to AD-3/AD-4: the screen = board composite (rebuilt from world state) + a script screen layer that is a core bitmap (or bounded retained list) cleared by `forceRedraw`/board render, + overlay canvas when `renderNow` is on, in that order; and state when the board composite is suppressed (blocking program not waiting on movement).

### G-3 (high) `loadBlob`/`saveBlob` replies have no input event, no wait kind, and no list request (E-97, E-120/E-121, E-60)
- AD-17 emits `saveBlob`/`loadBlob` requests; AD-14's closed event list (`key, pointer, gamepad, asset, audio.ended, video.ended, focus`) has **no blob delivery or save-result event**, and AD-9's core wait kinds have no `blob`. A `load(file)` or `openFileInput` result therefore cannot enter the core as a logged input, so replay (G3) and headless saves (CAP-11 success check) cannot be reproduced. AD-5's "loading freezes time" covers only `asset` requests.
- `dirSav` (E-60 save-file picker) needs to enumerate saves: no `listBlobs` request. `fileEof`/`closeFile` and append mode need defined semantics over blobs.
- E-97 / format-spec §9.11 `openFileInput(file, folder)` reads files **inside the game's folders**; AD-17 maps all file I/O to the save area, so games that read shipped data files break.
- **Fix:** add `blob` (`{ key, bytes | missing | error }`) and `blobList` events to AD-14; add `blob` wait kind (or extend AD-5 freeze to blob requests); add `listBlobs` to AD-17; define the read path as save area first, then the game folders read-only via `asset` requests.

### G-4 (medium) GameState sections named in AD-10 do not cover E-120's save list or the input buffer
- AD-10 enumerates `{ schema, world, sprites, triggers, vm, battle, menu, audio, surfaces, rng, time }` with "exactly one owner". With no owner: the **key buffer** (E-110 "buffered key queue that can be cleared", `clearBuffer`, `wait()` consumes from it), mouse position/buttons for polling (E-111), **message-window and font settings** (E-55, explicitly in E-120), **camera** (E-51), persistent screen animations (E-54 `animation(..., persist)`), running transitions/effects (E-59), modal UI state (message box, prompt, cursor maps, buttons; E-60; the `ui` wait kind's owner), mouse cursor (E-61), party and inventory (E-81..E-86; `menu` or `world`?), movement mode and game-speed offset (E-120).
- **Fix:** add `input`, `ui` (mwin, fonts, cursor maps, buttons, cursor), `camera` and `fx` (animations, transitions) sections, name the owning epic for each, and say where party/inventory live.

### G-5 (medium) AD-16 cue union is closed and drops catalogue verbs
- AD-16: `music.play | music.stop | sfx.play | volume.set`. format-spec §9.11 and E-100/E-101 also need `wavStop` (sfx stop), `mp3pause` (music pause/resume), and blocking effects correlated to `audio.ended` by `cueId`. Unlike AD-9 the union is not an open registry, so the audio-synth epic must edit a cross-epic contract.
- **Fix:** add `sfx.stop`, `music.pause`, `music.resume`, and say `audio.ended` carries the `cueId`.

### G-6 (medium) Input mapping is under-specified (E-24, E-110..E-113, E-61)
- AD-14 key events carry a legacy name and a scan code. Missing: down/up edges (E-24 holding two keys gives a diagonal), the **character** produced (E-110 "character-coded menu, activation and run-time keys" from `.gam`, layout-dependent), pointer coordinates stated in **logical integer pixels** (E-50 scaling; otherwise replays differ with window size), and whether the custom cursor (E-61) is drawn by the core in the draw list or by the runner.
- Video: AD-14 gives headless `audio.ended` timing but no rule for `video.ended` in headless (E-62 is blocking), so fresh headless play-throughs of games with intro videos have undefined timing.
- **Fix:** `key { name, code, char?, down }`; `pointer { x, y }` in logical pixels; cursor drawn by core as the last draw-list command; headless emits `video.ended` after the parsed (or transcoded) duration.

### G-7 (medium) Pixel arithmetic of draw commands is not fixed although two epics build two rasterisers
- `core/raster` (board-rendering epic) is the reference and WebGL2 (web-runner-packaging epic) must agree within tolerance (G4, CAP-6). AD-3 fixes command *shapes* but not: colour-key test before tint (format-spec §4.5 "transparent pixels are left alone"), clamp per channel after summing shade + board ambient + global ambient (§4.5, E-17), how `translucent` (E-56: 50 %) differs from `alpha`, and what percentage `additive` takes (E-56 "additive (%)").
- **Fix:** add a short normative pixel formula per `blit` blend mode to AD-3 citing format-spec §4.5 and E-56.

### G-8 (medium) `upload` + "rebuilt per frame, no deltas" re-ships every core bitmap every frame
- With AD-4 the overlay canvas (E-57) and every displayed canvas are core bitmaps reaching runners only as `upload`. AD-3 rebuilds the list each frame with no deltas, and the list is canonical-hashed per step for G3 replays (AD-11). A 640×480 RGBA overlay is ~1.2 MB per frame through structured clone (AD-1 Worker) and through FNV hashing.
- **Fix:** `upload { surface, version }` emitted only when `version` changes, bytes carried out of band, and `drawListHash` covering `version`, not bytes.

### G-9 (medium) No contract for the project's own single-file package (E-131, T-70, CAP-12)
- E-131: "a rebuild needs its own equivalents (e.g. a web bundle, a desktop binary with an embedded archive)". CAP-12 and epics web-runner-packaging and editor-assets-p0 both require "a packaged single-file game loads". AD-6 only covers reading legacy `.tpk`/EXE. The writer (editor export) and the readers (runner-web, runner-desktop) sit in different epics.
- **Fix:** add to AD-6 the new package layout (e.g. ZIP with a manifest carrying `schema`, entry main file, AssetIndex) or state that the export *is* a legacy-compatible `.tpk`.

### G-10 (low) AD-13 leaves the `**` operator open
- AD-13 bans `Math` transcendental functions; JS `**`/`**=` is implementation-approximated exactly like `Math.pow`. RPGCode `^` (format-spec §9.4) will most naturally be written with `**`.
- **Fix:** add `**` and `**=` to the `core` lint ban; route `^` through `fmath.pow`.

### G-11 (low) AD-5 resolver rule hardens an assumption and omits two §1.5 rules
- The memlog tags "ASCII-only case fold" as an ASSUMPTION; AD-5 states it as a rule and tags only the async choice. format-spec §1.5 bases case-insensitivity on the legacy file system, which also folds non-ASCII ANSI names (and §9.1 says program text is single-byte ANSI, code page unstated). §1.5 also requires resolving relative to the type folder and stripping a leading type-folder prefix, and §13 says to ignore `projectPath` inside a `.tpk`.
- **Fix:** restore the [ASSUMPTION] tag, name the byte→string decoding (e.g. Windows-1252), and list the type-folder and `projectPath` rules in AD-5.

### G-12 (low) The ADR 0001 wasm escape hatch has no plug point in `core`
- ADR 0001 and the spec constraints let a hot path (pathfinding, CPU rasterising, synth) move to Rust/wasm behind an unchanged TS interface. AD-4 moves CPU rasterising into `core`, whose `lib: ES2022` has no `WebAssembly`, and AD-6 makes the dependency allowlist one entry long. Nothing says how a wasm module reaches `core` (for example a runner-injected port implementation).
- **Fix:** one sentence in AD-8 or AD-22: hot-path modules are ports; a runner may inject a wasm implementation; the pure-TS one stays the reference for goldens.

### G-13 (low) platform-services misses two named editor behaviours
- T-03 "open in the OS default application for non-Toolkit files" and T-82 file association (named in CAP-18's intent) have no capability in AD-20.
- **Fix:** add `shell.openExternal` and a `fileAssociation` capability flag.

---

## Part C — What landed (checked, no action)

| Input | Where it lands |
| --- | --- |
| G1 lint scope, PlainData, snapshot test | AD-7/AD-8/AD-9 (with C-1 fixes) |
| G2 tiers, `core` allowlist, `editor-ui` only via platform-services | AD-6, AD-20, AD-22 (graph needs C-3) |
| G3 seeded RNG, fixed step, iteration order | AD-2, AD-12, AD-25, AD-11 |
| G4 replay only, caches discardable | AD-3 |
| G5/G6/G7 | Inherited table, Stack, Conventions (spec cites), Deferred `ovsx` |
| ADR 0001 hosts, SpessaSynth + FluidR3_GM, desktop spike, Capacitor | Stack, Deferred, AD-19/AD-20 |
| arch-options §2 "no I/O in core", logical paths, audio as cues, blocking never blocks host | AD-5, AD-16, AD-1 loading flag |
| arch-options §2 headless swappability test | Satisfied by `runner-headless` over `core/raster`; note that the test then no longer proves an independent renderer: the G4 WebGL2 cross-check carries that weight alone |
| format-spec §13 `.tpk` and `CMP1` trailer | AD-6 |
| E-17 / §4.5 signed tint range | AD-3 `tint` −255…+255 (the range is enough: clamping the summed tint to ±255 gives the same result for src in 0…255); formula still needed (G-7) |
| E-62 video as request + `video.ended` | AD-17, AD-14 (headless timing in G-6) |
| E-99 extension boundary | AD-17; API deferred to rpgcode-vm epic |
| T-28 undo, T-30/T-31 explicit upgrades | AD-19, AD-18 |
| Epic owners in Deferred | match tickets.toml slugs |

## Suggested amendment order

1. C-1, C-3, G-3 (they block platform-baseline and rpgcode-vm scaffolding).
2. New "step phases and program modes" AD (G-1) together with G-2 and G-4: one pass over AD-1/AD-3/AD-10.
3. C-2 + C-7 + G-8 decided together as one AD-4/AD-15 revision, then fold C-4 into ADR 0002's scope.
4. Remaining medium items, then the low ones.
