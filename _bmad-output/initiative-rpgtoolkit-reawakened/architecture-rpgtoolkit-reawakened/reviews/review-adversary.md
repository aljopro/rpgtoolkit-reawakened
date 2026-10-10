---
lens: adversary
target: ../architecture-rpgtoolkit-reawakened.md
reviewed: '2026-10-10'
verdict: not ready to bind; 6 critical/high seam holes must close before epics start
---

# Adversary review: architecture spine, rpgtoolkit-reawakened

## Verdict

The spine names the right seams, but too many of them are only named, not specified. Below are 17 pairs of units, each one level down (epics, packages or built-in groups). Each unit in a pair obeys every AD as written, yet the two units build incompatibly. The two worst holes are the surface model (AD-3 and AD-4 give one canvas two mutation paths) and asset waits against the loading freeze (AD-9 and AD-5 contradict each other on determinism). Most ADs also name no check. The enforceability table at the end proposes one for each.

Method: for each contract the brief named, I picked two units that must agree on it. I read only the ADs (plus the docs they cite) and wrote down what each author would build. Evidence comes from the spine, c4.md, the epic files, guardrails.md, engine-features.md and format-spec.md.

Severity: **critical** means it breaks G1, G3 or G5, or corrupts state. **High** means two epics ship incompatible code. **Medium** means visible divergence or rework. **Low** means hygiene.

---

## A. Adversary pairs

### P1 — critical — Surfaces have two mutation paths and no lifetime (AD-3, AD-4)

- **Unit A, epic board-rendering (canvas built-ins and the draw-list builder).** AD-4 makes every script-readable surface a core-owned RGBA bitmap. So `drawLine(…, cnv)` rasterises into `GameState.surfaces[cnv]` through `core/raster`, and the builder emits `upload` for that bitmap. AD-3 also gives surfaces integer ids with `pushTarget`/`popTarget`, so for overlays the builder emits `pushTarget(cnv)` plus commands.
- **Unit B, epic web-runner-packaging (WebGL2 replayer).** It keeps a GPU render target per surface id. It applies `pushTarget(7)` commands to that target, and it applies `upload(7)` by replacing the texture. To save bandwidth it caches uploads by id. AD-3 allows that.
- **Clash.**
  1. Surface 7 is now mutated in two places: in the core bitmap and in the runner target. If a translucent fill is drawn both ways it is applied twice.
  2. AD-3 says "rebuilt per frame; no deltas", so either every canvas is re-uploaded every frame (1.2 MB per 640×480 canvas per frame, and all of it goes into `drawListHash`) or uploads are deltas, which AD-3 forbids.
  3. If the runner loses its WebGL context, the canvas is gone, because nothing lets it pull the bitmap again. That breaks AD-3's own rule that discarding a cache changes nothing observable.
  4. `killCanvas` followed by `createCanvas` can reuse an id, and the runner then serves a stale texture.
  5. Surface 0 is undefined. Scripts draw persistently on the screen (E-56, E-96: `drawLine` with no canvas, then `renderNow`). A per-frame rebuilt list has nowhere to keep that drawing unless surface 0 is defined.
- **Close with a new AD-3a "Surface model".**
  - Persistent surfaces are core-owned bitmaps in `GameState.surfaces`. They are mutated only by `core/raster` when a built-in calls it, and they are read-only in the draw list (blit source only).
  - `pushTarget` may address only frame-scoped scratch surfaces. These are cleared at `pushTarget` and dead at the end of the frame.
  - Surface ids come from a monotonic counter in state and are never reused.
  - A blit source is `{ surface, rev }`. `rev` increments on every mutation.
  - Pixels are pulled, not pushed. Replace `upload` with a pure accessor `engine.surfacePixels(id, rev)`, so a runner can refill a cache at any time.
  - Surface 0 is the composed frame: board composition (when world drawing is on), then the persistent script-screen surface, then overlay (E-57).
- **Check.** A type check (a `DrawCommand` union in which `pushTarget` takes `ScratchId`, a separate brand from `SurfaceId`). A runner-web test that replays every golden with all caches flushed on every frame and expects identical pixels.

### P2 — critical — Asset waits contradict the loading freeze, and inputs have no step index (AD-1, AD-5, AD-9, AD-14)

- **Unit A, epic rpgcode-vm.** AD-9 lists `asset` as a core wait kind. So `bitmap(file)` and `run(prg)` yield `{ kind: 'asset', key }` and other threads keep running. That is a correct reading of AD-9.
- **Unit B, epic board-rendering.** A board load is a blocking request under AD-5: `loading: true`, no steps consumed.
- **Clash 1, determinism.** Under A, the number of steps other threads run while `bitmap()` waits depends on delivery latency. Headless delivers at once and web delivers at step S+k, so state hashes differ between runners. That is exactly what AD-5's "Prevents" line says cannot happen. AD-14's log rescues replay of one recording, but not G3 item 3 (same data, seed and inputs give identical state on every runner), because the latency is not a game input.
- **Clash 2, step numbering.**
  - `advance(steps, inputs)` takes an `inputs` list with no step index. AD-14 logs `{ step, event }`. Runner-web calls `advance(3, keys)` and expects the keys on the first step. Runner-headless replays the log one step at a time. Nothing says which step "step" names: the value before the step or after it.
  - `StepReport` does not say how many steps actually ran when loading starts partway through `advance(3)`. Runner-web's time accumulator subtracts 3 while only 1 step ran.
  - Inputs that arrive while loading are not defined as dropped, held or applied.
  - Each runner builds its own log, so two runners record the same session differently.
- **Close by tightening AD-5, AD-9 and AD-14.**
  - Delete the `asset` wait kind. Every asset need is a global freeze.
  - Classify requests: `blocking` (freeze) or `stream` (music and video bytes, which never freeze and never touch state).
  - `advance(steps, inputs: { step, event }[])`. `step` is the absolute value of `time.step` at the start of the step that consumes the input. Inputs apply in array order within a step.
  - `StepReport` gains `stepsRun`, `stepAfter` and `consumed: InputRecord[]`. The canonical log is the concatenation of `consumed`, so the core writes the log and runners do not.
  - Non-delivery inputs that arrive during loading are queued in state and consumed at the next real step.
- **Check.** A latency-fuzz test: replay the same session with random delivery delays of 0–N calls and expect identical per-step hashes. An `InputRecord` type in `core/ports`.

### P3 — high — `loadBlob` has no reply event, and the blob namespace is shared (AD-14, AD-17)

- **Unit A, epic menu-party-save.** `load(file)` emits `loadBlob`.
- **Unit B, epic rpgcode-vm.** `openFileInput` emits `loadBlob`.
- **Clash.**
  - AD-14's event list (`key`, `pointer`, `gamepad`, `asset`, `audio.ended`, `video.ended`, `focus`) has no blob-reply event, so the result of either request has no input to arrive in. The core's input dispatch has no branch for it.
  - `dirSav` (E-60, a picker over existing saves) needs a listing, and there is no `listBlobs` request.
  - A save writes `slot1.sav`, and script file I/O writes `Saved/slot1.sav` (format-spec §1.5 folders). Each host maps these keys freely. OPFS is case-sensitive while legacy file I/O is not, so `Data.txt` and `data.txt` break.
- **Close by tightening AD-14 and AD-17.**
  - Add the events `blob.loaded { reqId, bytes | missing }`, `blob.saved { reqId, ok }` and `blob.listed { reqId, names }`.
  - Every request carries a core-assigned `reqId`.
  - Blob keys are `{ area: 'saves' | 'files', path }` with the AD-5 case fold applied in core.
  - `saveBlob` and `loadBlob` are blocking requests, so they freeze like assets.
- **Check.** A type check (the event union is exhaustive in a `switch` with a `never` default). A headless round-trip test for `save`, `load`, `openFileOutput`/`openFileInput` and `dirSav`.

### P4 — high — `TexRef` is ambiguous on key form, index base, tile bitmaps, animated tiles, decoding and geometry (AD-2, AD-3, AD-5)

- **Unit A, the epic board-rendering builder.**
  - It emits `{ asset: 'Tiles/Default.tst', tile: 12 }`. That is a logical path, as AD-3 says, keeping the game's case, as the conventions say. The tile index is 1-based, as format-spec §1.6 says.
  - It emits `{ asset: 'water.tan' }` and lets the runner animate.
  - It emits a `.tbm` as one `TexRef`.
- **Unit B, the epic web-runner-packaging texture loader.**
  - It holds bytes keyed by the canonical key it delivered (AD-5), so a logical path misses its cache.
  - It indexes tiles from 0.
  - It must write its own `.tst`/`.iso`/`.tbm`/`.gph` decoders (column-major order, the transparent triple 0,1,2, 16→32 pixel doubling, iso diamond packing, palette), because no AD exports a decoder. Two decoders then drift.
  - It has nowhere to put the `.tan` frame clock without holding time state, which breaks G4.
- **Further gaps.**
  - `blit` has no source rectangle or destination size. Yet `canvasDrawPart`, `sizedAnimation`, stretched backgrounds, `zoom` and 2D-on-iso projection (format-spec §3.4) all need scaling or an affine transform. Nothing says whether the core or the runner projects 2D tiles onto iso boards.
  - Animation timing is split. `.tan` is in fps, `.anm` in f64 seconds per frame and GIF in centiseconds, while AD-2 centralises only "seconds-per-step". So board-rendering and movement-triggers round animation phase differently. Phase origin (global step or instance start) is also unstated.
- **Close by tightening AD-3.**
  - `TexRef.asset` is the AD-5 canonical key, never a logical path.
  - `tile` is 1-based, as in format-spec §1.6.
  - `.tan` and `.tbm` never cross the seam: the builder resolves them to concrete tile `TexRef`s plus per-cell tint.
  - `core` exports `decodeTexture(bytes, ref) -> { w, h, rgba }`, used by `core/raster`, every runner and the editor.
  - `blit` gets `src {x,y,w,h}` and `dst {x,y,w,h}` (integers), plus an explicit `iso2d` projection flag whose reference is `core/raster`.
- **Tighten AD-2 as well.** `core/time` owns `secondsToSteps`, `fpsToSteps` and `frameAt(originStep, step, stepsPerFrame, count, loop)`. Animated tiles use origin 0.
- **Check.** A dependency-cruiser rule that `runner-*` and `editor-ui` import no `formats/*` decoder except through `decodeTexture`. A type check on `TexRef.asset: AssetKey` (branded). A cross-check of CPU against WebGL2 on a fixture of `.tbm`, `.tan` and 2D-on-iso tiles.

### P5 — high — Order of tint, key, alpha and blend; tint range; rounding (AD-3, AD-4)

- **Unit A, the `core/raster` author (board-rendering).** Per channel: key-test the source pixel, then `clamp(src + tint)`, then blend.
- **Unit B, the WebGL2 shader author (web-runner-packaging).**
  - Tints after the key test, but the colour key uses `≈` because of texture filtering.
  - Applies board ambient as a second pass over the composed layer, giving `clamp(clamp(src + shade) + ambient)`.
- **Clash.**
  - Format-spec §4.5 requires a single clamp of the sum of shade layer, board ambient and global ambient, plus the `.tbm` cell shade. That sum runs from −1020 to +1020, but AD-3 caps `tint` at ±255. A builder must therefore pre-clamp the sum, which changes results. Example: src 100, shade −255, board −255, global +255. A single clamp gives 0. A clamped pre-sum (−255) also gives 0. Stepwise clamping gives 255.
  - Nothing defines how percentages map to `alpha` (`spriteTranslucency(%)`, mwin %, "translucent 50%", "additive %").
  - Nothing defines the blend rounding formula. Raster output is script-visible through `getPixel` and `canvasGetScreen`, so it reaches VM state and `stateHash`. Rounding is therefore a G3 contract, not a golden-tolerance matter.
- **Close by tightening AD-3 with one normative pixel pipeline in `core/raster`.**
  1. Skip the pixel when it is a format-transparent source pixel or equals `key`. The test is on the untinted source.
  2. `c = clamp(src + tint, 0, 255)`, where `tint` is the full pre-summed offset, range ±1020, clamped exactly once.
  3. Blend:
     - `normal`: `c`.
     - `translucent`: `(dst·(255−a) + c·a + 127) / 255` with integer division.
     - `additive`: `min(255, dst + (c·a + 127)/255)`.
  4. `percentToAlpha(p) = (p·255 + 50) / 100` with integer division, in `core/render`.
- **Check.** Raster unit vectors. The WebGL2 conformance fixture must match exactly for key and tint (tolerance applies to edges only). A lint rule that no builder computes a tint outside `core/render/shade.ts`.

### P6 — high — Primitive and text command shapes are unspecified, and text can never pass the CPU-vs-WebGL2 gate (AD-3, AD-15, G4)

- **Units A and B are three draw-list producers**: board-rendering (`fillRect`, `drawCircle`, mwin), menu-party-save ("default menu draw lists") and battle ("default battle UI built from draw lists").
- **Clash 1, command shapes.** AD-3 gives fields only for `blit`, so each producer picks its own:
  - colour as `0xRRGGBB`, as `[r, g, b]`, or as a DOS index;
  - `rect` as `x1, y1, x2, y2` inclusive or as `x, y, w, h`;
  - `fill` meaning clear-target or filled rectangle;
  - `ellipse` filled or outlined;
  - line width and endpoint inclusivity.
  
  Runner-web parses one of these choices.
- **Clash 2, text.**
  - AD-15 has runners draw platform-font glyphs, while AD-4 has `core/raster` draw text with core metrics, which means the bitmap font.
  - The web-runner-packaging Done-when item 2 ("WebGL2 replayer and CPU rasteriser agree within the golden tolerance") then fails on every frame that contains text: the mwin, menus and the battle UI.
  - "Per-line `text` commands" contradicts "glyph positions come from a metrics table", because a runner must place glyphs inside a line.
- **Close by tightening AD-3 and AD-15.**
  - Publish the full `DrawCommand` union in `core/ports`, with field types:
    - `Rgb = { r, g, b }`, integers 0–255;
    - rectangles as `x, y, w, h`, half-open;
    - `filled: boolean`;
    - lines 1 px wide with inclusive endpoints;
    - ellipses by bounding box.
  - `text` carries per-glyph x advances. Glyphs come from a core glyph atlas, uploaded through the AD-3a surface pull, and every runner (and `core/raster`) draws them identically. Platform fonts are allowed only behind a `RunConfig.platformFonts` flag, which is off in conformance and golden runs.
- **Check.** A type check (one exported union). A per-command CPU-vs-WebGL2 conformance fixture in CI.

### P7 — high — `GameState` sections leave state homeless and give one entity two owners (AD-10)

- **Unit A, epic movement-triggers.** It registers "movement, sprite and input built-ins" (from its epic file), so it owns `addPlayer`, `removePlayer` and `activePlayer` (players are sprites) and keeps the roster in `sprites`.
- **Unit B, epic menu-party-save.** It registers "menu, inventory, party and save built-ins", so it owns the same names and keeps the roster in `menu`.
- **Clash 1, two owners of the party roster.**
- **Clash 2, two owners of HP.** E-85 puts character stats in VM globals named by the `.tem` file, so they belong to `vm`. Epic battle keeps a `fighter.hp` in `battle` under AD-10 and mutates it each turn. A custom fight program reading the stat global mid-battle then sees a stale value.
- **Clash 3, homeless state.** E-120 also requires saving state that no section names:
  - inventory and equipment, and gold;
  - the key buffer (`clearBuffer`, E-110), held keys and on-screen buttons;
  - mwin text, font and colour settings;
  - the overlay canvas and `renderNow`;
  - screen-save slots, camera, in-flight fades and wipes, and persistent animations (`endAnimation`);
  - cursor maps;
  - redirects;
  - movement mode and the game-speed offset;
  - the global ambient level.

  Each epic will put these in whichever section it already owns.
- **Close by tightening AD-10.**
  - An exhaustive section table: section, owning module, owning epic, port, and E-xx list. Add `party` (roster and selection), `inventory` (items, equipment, gold), `input` (buffer, held keys, buttons), `screen` (mwin, fonts, overlay, saved screens, camera, effects, animations) and `vm.redirects`.
  - Character stats have one owner: `vm.globals`, behind a `StatsPort`. Battle stores only fighter references, charge and status, and never copies HP or SMP.
  - Each built-in name maps to exactly one epic, in a table checked in CI.
- **Check.** A dependency-cruiser rule that only `core/<section>/**` imports the mutable `<Section>State` type; other modules see `DeepReadonly` through ports. A CI test that fails on duplicate built-in registration.

### P8 — high — Two wake paths for waits, and the shared `ui` kind collides (AD-8, AD-9)

- **Unit A, the epic rpgcode-vm scheduler.** Each step it calls `isSatisfied(state, wait)`. On `true` it calls `resume(ctx, wait, undefined)`, because the satisfying signal is in state.
- **Unit B, epic audio-synth, blocking `wav(file)`.** Its `resume` expects `event = { type: 'audio.ended', cueId }`. That event never arrives through `isSatisfied`, so the thread never returns.
- **Clash 1.** `key` has the same problem. `wait()` must return the key name, but `isSatisfied(state, …)` cannot see an event unless the input was first queued in state, and AD-10 has no `input` section (P7).
- **Clash 2, the `ui` kind.**
  - `ui` is one core kind, but its payload is defined independently by board-rendering (msgBox, prompt, cursor maps under E-60) and by menu-party-save (menu screens).
  - Both register `isSatisfied` for `'ui'`.
  - Modal widget state (cursor index, typed text) lives in the wait payload inside `vm`. The menu module must mutate it every step, which breaks AD-10 ownership.
  - When several threads are satisfied in the same step, the resume order is unstated.
- **Close by tightening AD-9.**
  - A single wake contract: `poll(view, wait) -> null | { value: Value }`, called in ascending thread-id order after the input phase. Inputs reach waits only through owned state sections (input buffer, audio-ended set).
  - Kinds are namespaced by owner (`input.key`, `render.msgbox`, `menu.screen`, `audio.sfx`).
  - The registry rejects duplicates.
  - Widget state lives in the owner's section, and the wait holds only its id.
- **Check.** A unit test that registering a duplicate kind throws at `createEngine`. A type check with `poll` as the only resolver signature.

### P9 — high — The built-in contract lacks by-reference outputs, overloads, collisions and handle resolution (AD-8)

- **Unit A, epic movement-triggers.** It implements `playerLocation(h, &x, &y, &layer)` by returning a map `Value` and expects the VM to scatter it into the arguments.
- **Unit B, epic menu-party-save.** It implements `getGp(&out)` by asking for `ctx.setRef(1, v)`, an API it invents.
- **Unit C, epic rpgcode-vm.** It evaluates `args` as values, so both by-reference outputs are silently lost. E-94 makes trailing by-reference outputs a parity requirement, and format-spec §9.11 says most getters accept one.
- **Further gaps.**
  - `params` has no shape. Optional parameters, defaults, by-reference flags and variadics (`fightEnemy(e1, …, bkg)`, `callShop`) are unspecified, and epic rpgcode-tooling needs `params` for hover and call tips.
  - There is no rule for alias names (`midiPlay`/`playMidi`/`mediaPlay`, `hp`/`getHp`).
  - Names claimed by two epics have no resolution. `internalMenu` and `menuGraphic` sit under Battle in format-spec §9.11 but under menu in E-80.
  - Lookup precedence is undefined among redirect, script function, built-in, and E-99 extension. The LSP and the VM will resolve differently.
  - Handle resolution (`"source"`, `"target"`, name, index, slot under E-94 and E-95) is left to every domain author.
  - "The registry is code" sits beside "no singletons in core", so who instantiates the registry, and in what order, is open.
- **Close by tightening AD-8.**
  - `params: ParamSpec[]`, where `ParamSpec = { name, optional?, byRef?, variadic? }`.
  - `call(ctx, args: Arg[])`, where `Arg = { value, ref?: RefId }`. Outputs are returned as `{ done: Value, out?: [index, Value][] }`, and the VM writes them back.
  - The `Value` union is published in `core/ports`.
  - Aliases are `aliases[]` on one spec.
  - Each domain module exports `builtins: BuiltinSpec[]`. `createEngine` assembles them in a fixed module order and rejects duplicates.
  - Precedence: redirect, then script function, then built-in, then extension.
  - A `HandlePort` is the only resolver for handles.
- **Check.** A type check. Epic rpgcode-tooling's catalogue test also asserts that no name is registered twice and that every by-reference getter in §9.11 declares `byRef`.

### P10 — high — `PlainData` leaf rules contradict each other, and Worker transfer detaches state (AD-1, AD-4, AD-7)

- **Unit A, epic board-rendering.** It stores `surfaces[id].pixels: Uint8Array`, which AD-4 allows, and passes the same buffer as `upload.bytes`. AD-1 calls `Uint8Array` "a transferable leaf".
- **Unit B, epic web-runner-packaging.** Its Worker wrapper calls `postMessage(report, transferList)` to avoid copies. That detaches the core's own state buffer, so later `getPixel` calls read a zero-length array.
- **Unit C, epic menu-party-save.** It types `SaveState` as `PlainData`, following AD-7's "no typed array". `Uint8Array` fails that type, and if forced through `JSON.stringify` (as the G1 test does) it becomes a `{"0":…}` object.
- **Further gaps.**
  - `-0` round-trips through JSON as `0`, and `1/x` then differs after restore.
  - `undefined` fields survive structured clone but disappear in JSON, so the Worker path and the save path disagree on shape.
  - Sparse RPGCode arrays (format-spec §9.3) need a defined representation.
- **Close by tightening AD-1 and AD-7 with one `PlainData` definition for the whole `GameState`.**
  - `PlainData` is `null`, `boolean`, a finite number other than `-0`, `string`, an array of `PlainData`, or `{ [k: string]: PlainData }`.
  - No `undefined`.
  - Bitmaps in state are `{ t: 'rgba', w, h, b64 }`. A decoded cache may live outside state, keyed by `rev`.
  - Outputs never alias state: every `Uint8Array` in a `StepReport` or `DrawList` is a fresh copy the caller owns.
- **Check.** A type check (`GameState extends PlainData`). A test that mutating or transferring every returned buffer leaves `stateHash` unchanged. A property test that `canon(restore(canon(s))) === canon(s)`.

### P11 — high — Canonical JSON is not defined well enough for two writers or verifiers to agree (AD-11)

- **Unit A, the epic battle state builder.** It creates a fighter as `{ ...base, hp }` on one path and `{ hp, ...base }` on another.
- **Unit B, the epic menu-party-save migration function.** It rebuilds objects in its own key order.
- **Clash.**
  - "Fixed field order" is unspecified. If it means insertion order (AD-25 bans only *non-string*-key order reliance), the G1 snapshot/restore and save/load hashes differ for identical logical state.
  - Number formatting, string escaping (single-byte ANSI text above 0x7F), the hash input bytes (UTF-8 or UTF-16) and the FNV-1a 64-bit offset basis and prime are all unstated. An external golden tool, or the Rust/wasm hot-path escape hatch in the spec constraints, would compute different hashes.
- **Close by tightening AD-11.**
  - Canonical form is RFC 8785 (JCS): keys sorted by UTF-16 code unit, numbers per ECMAScript `Number::toString`, minimal escaping.
  - `-0` is normalised to `0` before writing; P10 rejects it in state anyway.
  - The hash is FNV-1a 64-bit over the UTF-8 bytes, with the standard offset basis `0xcbf29ce484222325` and prime `0x100000001b3`, rendered as 16 lowercase hex digits.
- **Check.** Unit tests against the RFC 8785 vectors and fixed hash vectors.

### P12 — high — Save migration is per-tree, but state is per-epic; program identity breaks across versions and for inline code (AD-7, AD-23)

- **Unit A, epic battle.** It bumps `schema` from 7 to 8 on its branch.
- **Unit B, epic menu-party-save.** It also bumps 7 to 8 on its own branch. Two migrations are now numbered 7→8.
- **Clash 1, compiler changes without a schema bump.** Epic rpgcode-vm changes the compiler's instruction layout in release N+1. `VmState`'s shape is unchanged, so no schema bump is required. A saved `Frame.ip` now points at a different instruction, and the restored game silently runs the wrong code. AD-7 has no compiler version, and the behaviour when `Frame.program.hash` mismatches the delivered bytes (the game was updated) is undefined.
- **Clash 2, code with no file.** `Frame.program = { path, hash }` cannot represent `rpgCode(line)`, `tellThread(id, code)` or the inline single-line trigger programs (engine-features §5: "a single inline line … when the referenced file doesn't exist"). None of these has bytes to rebuild from on restore.
- **Clash 3, missing fields.** AD-7's exact `Frame` and `Thread` shapes omit fields that G1 item 2 requires: the operand stack and error-handler state. They also omit the source/target context (E-95), `autoLocal` and redirects (E-120). The VM author must widen the shape, while the DAP author (epic rpgcode-tooling) builds against it as written.
- **Close by tightening AD-23 and AD-7.**
  - Per-section schema numbers, `schema: { world: n, … }`, with migration chains owned by each section owner.
  - `Frame.program = { path, sourceHash, compiler: n } | { inline: source, compiler: n }`.
  - Restore refuses with a typed diagnostic when `compiler` or `sourceHash` differs, unless an ip-remap migration exists.
  - List AD-7's fields as a minimum, open record: operand stack, handler state, source/target and `autoLocal` are required.
- **Check.** A CI rule that any change to `*State` types or to the compiler's opcode table needs a schema or compiler bump plus a fixture save from the previous version. A restore test over every fixture.

### P13 — high — The dependency graph forbids edges that AD-21, C4 and the epics require

- **Unit A, epic platform-baseline.** It encodes the Design Paradigm mermaid graph into dependency-cruiser rules, as AD-22 says.
- **Unit B, epic editor-foundation.** It imports runner-web for preview and test-run. C4 has "editor-ui → runner-web: Previews with", and the epic "waits on web-runner-packaging because: runner-web for preview and test-run".
- **Unit C, epic rpgcode-tooling.** Its `dap` imports runner-headless, as AD-21 says.
- **Clash.**
  - Neither edge exists in the graph, and neither does host-web → runner-web. CI blocks B and C, or the graph is relaxed with no rule in its place.
  - The editor board canvas (T-20 to T-35), export image (T-32, with sprites, images and shading optional) and `viewBrd` (E-63) all need to compose a board that is not the running engine's current board. Only `Engine.drawList()` exists, so editor-ui will write a second board compositor and drift from §4.5.
- **Close with a new AD and a corrected graph.**
  - Core exports a pure `composeBoard(board, assets, view: { camera, layers, include: { sprites, images, shading } }) -> DrawCommand[]`, used by `Engine.drawList`, `viewBrd`, the editor canvas and export.
  - Split the WebGL2 replayer into a `render-webgl2` package at the runner layer. Both runner-web and editor-ui may import it.
  - Draw the edges runner-headless → dap and runner-web → editor-ui and the hosts, or route test-run only through `platform-services.run`.
- **Check.** Dependency-cruiser rules generated from one checked-in edge list. The mermaid diagram should be generated from the same list.

### P14 — medium — No step-pipeline owner; RNG consumer list too narrow (AD-1, AD-10, AD-12)

- **Units: epic battle and epic movement-triggers.** Battle adds a charge-tick phase and movement-triggers adds trigger tests. Each inserts its phase where convenient. E-03 gives an order (input, multitask, move, edge check, render), but no AD makes it a contract. Battle ticks, animation advance, `audio.ended` handling and exclusive blocking-program mode (engine-features §1.2: "the world is frozen") are not placed.
- **Clash 1, RNG draw order.** With one shared RNG (AD-12), phase order decides draw order, so two valid placements give different random streams.
- **Clash 2, forbidden consumers.** AD-12 limits consumers to "random built-ins and battle". `wander` (E-32, epic movement-triggers) and random idle behaviour cannot legally draw. The author either fakes randomness from the step counter or calls through a built-in.
- **Close with a new AD-26 "Step pipeline".** A fixed, named phase list in `core/engine`. Modules register into named phases only, and the order within a phase is fixed by module rank. Exclusive-program mode is a state flag that skips named phases. AD-12 changes to "any core module through `RngPort`; draw order is fixed by the pipeline".
- **Check.** A unit test that snapshots the phase list. A dependency-cruiser rule that only `core/rng` constructs the generator.

### P15 — medium — The audio cue union is missing catalogue operations; `cueId` semantics (AD-16)

- **Unit A, epic audio-synth.** It registers `wavStop` and `mp3pause` (format-spec §9.11) and finds no `sfx.stop` or `music.pause`/`music.resume` kind. It adds them, but runner-web's `switch` drops them.
- **`cueId` is unstated in three ways:**
  - Whether `audio.ended` carries a `cueId`.
  - Whether music re-emitted after load reuses the old `cueId` (does the runner restart the track or dedupe?).
  - How a stale `audio.ended` for a pre-load cue is ignored.
- **Other gaps.**
  - The unit of `volume` (0–100 or 0–1) is unstated.
  - The form of `asset` (logical path or canonical key) is unstated; see P4.
  - Per-frame `.anm` sounds have no defined producer.
- **Close.** Complete the union from §9.11. `cueId` comes from a monotonic counter in `GameState.audio`. `audio.ended { cueId }`, and an unknown `cueId` is ignored. Volume is an integer percentage. `asset: AssetKey`.
- **Check.** A runner-side exhaustive `switch` with a `never` default. A headless test of each catalogue audio built-in.

### P16 — medium — Document ownership in VS Code; save, backup and revert direction (AD-19, AD-20)

- **Unit A, host-vscode.** It registers a custom editor, which allows multiple panels per document. Each webview boots its own editor-ui, so one file gets two documents with two edit stacks.
- **Unit B, host-web.** It has one document per file.
- **Clash.**
  - VS Code-initiated save, hot-exit backup and revert all start in the host. AD-20 only defines calls from editor-ui into the host, and AD-19 defines only undo and redo in the host-to-editor-ui direction. Host-vscode will serialise through some path of its own.
  - Behaviour on an external change while the document is dirty (`fs.watch`) is unstated.
- **Close.**
  - AD-19 adds a host→editor-ui `DocumentController`: `save`, `saveAs`, `backup`, `revert`, `undo`, `redo`, `onExternalChange`.
  - The document (model plus edit stack) has exactly one instance per URI per host. In VS Code it lives in one webview, with `supportsMultipleEditorsPerDocument: false`, or in the extension-host process with webviews as views.
- **Check.** A test harness that runs one host-conformance suite against both hosts.

### P17 — medium — Input event schema and focus ownership (AD-14)

- **Unit A, runner-web.** It logs DOM `key`/`code` values with keydown auto-repeat, because the DOM-to-legacy table lives in `core/input`.
- **Unit B, the epic movement-triggers test author.** It writes logs with `"ENTER"` and only down events.
- **Clash.**
  - E-24 diagonals need held state, so key-up events are required, and AD-14's `key` does not say whether it carries a phase.
  - Pointer coordinates are unscaled (CSS pixels, device pixel ratio) rather than logical integers.
  - On focus loss (E-113), runner-web stops calling `advance`, while runner-headless sends `focus` and keeps stepping, so the two produce different `gameTime`.
- **Close.**
  - `{ type: 'key', phase: 'down' | 'up', name: LegacyKey, scan }`. Runners call the exported `core.input.fromDom` and log legacy form only, with no repeats; the core synthesises repeat if legacy needs it.
  - Pointer events carry logical integer pixels, floored.
  - Runners always forward `focus` and keep advancing. The core owns pause and play-time accounting.
- **Check.** A type check. A golden that uses focus loss.

Lower-severity notes, not pairs:
- `drawList(alpha)` interpolation (AD-1) is undefined. If board-rendering interpolates the camera and movement-triggers does not interpolate sprites, sprites jitter. Either drop `alpha` or state that only the camera and sprite positions interpolate, from previous positions held in state.
- The "Deferred" note says the thread budget "cannot diverge because AD-2 centralises the conversion". The thread budget is not a time conversion, so give it its own owner and constant in `core/script`.

---

## B. Is each AD Rule enforceable? Proposed checks

| AD | Check named in spine | Proposed check |
| --- | --- | --- |
| AD-1 | none | Type check: `Engine` type in `core/ports`. Test: `drawList()` called twice with no `advance` has an equal hash. Test: mutating or transferring outputs leaves `stateHash` unchanged (P10). |
| AD-2 | none | Lint: `no-restricted-syntax` on the literal `60` and on `/ 60`/`* 60` outside `core/time`. Review item: every duration goes through `core/time`. |
| AD-3 | canonical encoding only | Type check: one exported `DrawCommand` union, with `ScratchId` and `SurfaceId` brands. Test: cache-flush replay equivalence. Test: CPU-vs-WebGL2 per-command conformance fixture. |
| AD-4 | none | Dependency rule: only `core/raster` writes surface pixels. Test: `getPixel` after each primitive matches raster vectors. |
| AD-5 | none | Test: latency-fuzz replay (P2). Lint: no `fetch` (G2 already covers it). Type check: `AssetKey` brand. |
| AD-6 | implicit (G2 allowlist) | CI: the allowlist job lists `fflate` exactly. |
| AD-7 | G1 type check | Type check: `VmState extends PlainData`. Test: the G1 snapshot/restore test also covers inline and `tellThread` frames. |
| AD-8 | none | Dependency rule: `core/**/builtins/**` may import only `core/ports`. Test: duplicate registration throws. Test: catalogue completeness with `byRef` flags. |
| AD-9 | none | Lint: no `setTimeout` (G2 already covers it). Test: duplicate kind throws. Type check: `poll` signature. |
| AD-10 | none | Dependency rule: mutable `<Section>State` types importable only by their owner directory. Type check: `DeepReadonly` views in ports. Test: a save covers every E-120 item (a checklist test). |
| AD-11 | none | Test: RFC 8785 vectors and hash vectors. Lint: no `JSON.stringify` in `core` outside `core/canon`. |
| AD-12 | none | Dependency rule: only `core/rng` imports the generator implementation. Lint: `Math.random` (G3 already covers it). |
| AD-13 | lint (named) | Same; add a test with fixed input/output vectors for each `fmath` function. |
| AD-14 | none | Type check: exhaustive event union with a `never` default. Test: the core-produced `consumed` log replays identically. |
| AD-15 | none | Test: mwin layout golden with metrics. Test: CPU-vs-WebGL2 agreement on text frames (requires the P6 change). |
| AD-16 | none | Review item: "runner holds no game decisions". Type check: exhaustive cue `switch`. Test: music state after load. |
| AD-17 | none | Lint and dependency rule: no host API in `core` (G2). Type check: closed `Request` union. Test: extension-sandbox negative test (once E-99 is decided). |
| AD-18 | none | Test: round-trip every sample file, comparing bytes. Lint: no `throw` in `core/formats/**` except an `assertNever` helper. |
| AD-19 | none | Test: one host-conformance suite run against host-vscode and host-web. Review item: hosts call no format writer. |
| AD-20 | G2 dependency rule (inherited) | Dependency rule: editor-ui imports no `host-*`, `vscode` or shell package. Review item: "host adds no editor feature". The type check covers only the interface's shape. |
| AD-21 | none | Test: `stateHash` is identical with a debugger attached and stepping, and without one. |
| AD-22 | dependency graph (named) | Same; generate rules and the diagram from one edge list (P13). |
| AD-23 | none | CI rule: a `*State` diff requires a schema bump, a migration and a fixture. Test: restore every fixture. |
| AD-24 | none | Lint: `no-console` in `core`. Type check: `Diagnostic` shape. |
| AD-25 | none | Lint: ban `for…in` and `Object.keys`/`entries` on records whose key type is numeric, in `core`. Test: the cross-engine replay (G3). Review item: every `sort` has a total comparator. |
| Conventions: no singletons in `core` | none | Lint: `no-restricted-syntax` on module-level `let` and on mutable exported objects in `core`. |

Nineteen of the 25 ADs, plus the no-singletons convention, currently name no check. Each one's Rule line should end with a **Check:** clause, as AD-13 and AD-22 already do.

---

## C. ADs to add or tighten (summary)

- **New AD-3a**, surface model: persistent surfaces are read-only in the draw list, scratch targets are frame-scoped, ids are monotonic, and pixels are pulled by `rev`.
- **New AD-26**, step pipeline: named phases, registration only into phases, RNG draw order follows phases, exclusive-program mode.
- **New AD-27**, a board compositor shared by the engine, `viewBrd` and the editor, plus a `render-webgl2` package.
- **New AD-28**, a built-in ownership table: each name and alias maps to one epic, with precedence redirect, then script, then built-in, then extension.
- **Tighten:**
  - AD-1: input step index, `stepsRun`, `consumed`, no aliasing.
  - AD-2: fps, `.anm` and GIF conversions and `frameAt`.
  - AD-3: the full command union, `TexRef` by canonical key with 1-based tiles, src/dst rectangles, the iso flag, the pixel pipeline, `decodeTexture`.
  - AD-5: drop the `asset` wait kind; blocking versus streaming requests.
  - AD-7: minimum fields, inline program identity, compiler version.
  - AD-8: `ParamSpec`, by-reference outputs, `Value`, `HandlePort`, registry assembly.
  - AD-9: the single `poll` wake path, namespaced kinds.
  - AD-10: exhaustive sections with owners; HP owned by `vm.globals`.
  - AD-11: RFC 8785, UTF-8 bytes, hash constants.
  - AD-12: consumers.
  - AD-14: blob, list and phase events; logical pointer coordinates; focus.
  - AD-15: glyph atlas and advances.
  - AD-16: the complete cue union and `cueId` lifecycle.
  - AD-17: blob namespace and `reqId`.
  - AD-19 and AD-20: the host→editor `DocumentController`.
  - AD-23: per-section schemas.
- **Every AD** gains a **Check:** clause (section B).
