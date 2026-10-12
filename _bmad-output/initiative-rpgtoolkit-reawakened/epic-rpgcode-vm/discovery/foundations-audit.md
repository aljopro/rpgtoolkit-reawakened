# Epic-3 foundations audit — found vs owned

Repos searched (both, read-only):
- **[A]** `/Users/jensen/.omp/wt/wt-20261011-185124-57e1d90` = stale local `main` (`0b7f5fd`)
- **[B]** `/Users/jensen/.omp/wt/wt-20261011-151109-57e1d90` = PR #25 tip (`d5beb9c`; origin/main content)
Hit tags say which repo. Where a hit is in both, both are listed once with both paths. `../rpgtoolkit` never opened.

## Verdict table

| # | Item | (a) IMPLEMENTED | (b) ASSIGNED (owner) | (c) REFERENCED ONLY | (d) VERDICT |
|---|---|---|---|---|---|
| 1 | `core/fmath` (sin/cos/tan/atan2/exp/log/pow on + − × ÷ & sqrt) | **none** (no `packages/` source) | none outside epic 3 | AD-13 spine, ADR 0002, guardrails G3 | **UNOWNED** |
| 2 | `core/rng` / `RngPort` / xoshiro128** / SplitMix32 | **none** | none outside epic 3 | AD-12 spine, `.memlog`, `c4.md` | **UNOWNED** |
| 3 | `Logger` port | **none** | none | AD-24 spine only | **UNOWNED** |
| 4 | `core/engine` step pipeline / `createEngine` / phase list | **none** (`engine.ts` is types-only; `createEngine` explicitly deferred) | epic-board-rendering claims the loop; epic 3 the builtin API | AD-1/AD-8/AD-10/AD-26 spine | **split: owned-by epic-board-rendering (loop) + epic-rpgcode-vm (builtin assembly)** |
| 5 | `hashState` wired into `advance` + `GameState` type | `hashState` **implemented** (`core/canon`); wiring + `GameState` **none** | none (deferred "engine epic") | AD-7/AD-11 spine; deferred-work F11 | **partial: hashState implemented; wiring + GameState UNOWNED** |
| 6 | `ProgramCache` / `sourceHash` | **none** | none | ADR 0004 decision 1 / consequences; E-91 | **UNOWNED** |
| 7 | `PluginDefinition` (TS type) | **none** (no TS type in `packages/`) | epic-legacy-formats explicitly hands plugin registration *out* of epic 2 | ADR 0004 decision 2; AD-31; epic-legacy-formats.md:49 | **UNOWNED** |
| 8 | `BuiltinSpec` / `ParamSpec` (TS types) | **none** | none outside epic 3 | AD-8 spine (line 140); epic-battle references AD-8 | **UNOWNED** |
| 9 | `StepReport.requests` / `diagnostics` types | **implemented** (`ports/engine.ts`, `ports/requests.ts`) | epic-platform-baseline entry 1.8 | AD-1/AD-14/AD-24 spine | **owned-by epic-platform-baseline 1.8** |
| 10 | Unified AST / Step IR types (TS) | **none** | none outside epic 3 | ADR 0004; epic-rpgcode-tooling envelope (parser) | **UNOWNED** |
| 11 | E-03 focus-pause state | **none** | none in the 3 named epics; deferred-work says "the engine epic" (unnamed) | spine AD-14; deferred-work.md:20-21 | **UNOWNED (deferred to unnamed "engine epic")** |
| 12 | `core/raster` | **does not exist** (`packages/core/src/raster`: No such file or directory) | epic-board-rendering claims it | spine AD-4/AD-15/AD-27 | **owned-by epic-board-rendering (not built yet)** |
| 13 | VM-side breakpoint/pause hook (`setBreakpoints`, `paused`/`PausedState`) | types **implemented**; VM side **none** | none (epic-rpgcode-tooling builds the DAP *client*) | AD-1 spine; epic-rpgcode-tooling.md:14,25; docs/architecture-options.md:164 | **UNOWNED** |
| 14 | `createEngine` split | **none** (deferred) | epic-board-rendering (loop); spine AD-8 (builtin assembly); epic-rpgcode-tooling (catalogue check) | — | **UNOWNED as a whole; split across 3 epics** |
| 15 | `runner-harness` double | **implemented** (`double/test-engine.ts`, `driver.ts`) | epic-platform-baseline entry 1.9 | — | **owned-by epic-platform-baseline 1.9** |

## Per-item detail

### 1. `core/fmath` — UNOWNED
(a) `packages/`: **none**. (c) `docs/adr/0002-core-pixels-and-deterministic-maths.md:51`: "`core/fmath` supplies `sin`, `cos`, `tan`, `atan2`, `exp`, `log`, `pow` and the rest using only `+ − × ÷` and `sqrt`." Spine `architecture-rpgtoolkit-reawakened.md:220` (AD-13) states the same rule; `docs/guardrails.md:69` cites it. No epic file outside `epic-rpgcode-vm/` says any epic builds it.

### 2. `core/rng` / `RngPort` / xoshiro128** / SplitMix32 — UNOWNED
(a) none. (c) spine `architecture-rpgtoolkit-reawakened.md:213` (AD-12): "one xoshiro128** instance in `core/rng`. `RunConfig.seed` is a `u32`, expanded into the four state words by SplitMix32..." Spine line 173 (`| rng | core/rng | generator state |`); `.memlog.md:63`; `c4.md:89`. No epic files.

### 3. `Logger` port — UNOWNED
(a) none; `grep -rn 'Logger' packages/ docs/` → no hits in either repo. (c) spine `architecture-rpgtoolkit-reawakened.md:293` (AD-24): "`core` takes a `Logger` port with levels and plain-data records." Nothing else.

### 4. `core/engine` step pipeline / `createEngine` / phase list
(a) none. `packages/core/src/ports/engine.ts:4`: "`createEngine(init)` returns an `Engine` (deferred to the engine epic)." (b) epic-board-rendering `epic-board-rendering.md:14` (envelope Description): "The core boots a game, runs the fixed-step main loop..."; and `:31` (Boundaries): "Core world model, **the step pipeline's main loop**, draw-list builder...". Epic 3's `after`-pin in `tickets.toml` says epic 4 needs epic 3 "the VM registration API and program execution for rendering built-ins". (c) spine AD-26 (`:307-313`), AD-10 (`:150`), AD-8 (`:140`). **Split.**

### 5. `hashState` wired into `advance` + `GameState`
(a) `hashState` **is implemented**: [A] & [B] `packages/core/src/canon/canon.ts:22`: "export function hashState(state: PlainData): string {" (also exported via `canon/index.ts:6`; used in `runner-harness/src/double/test-engine.ts:139` and `vectors.ts:95`). Wired into `advance`: **no** — `advance` contract only carries `StepReport.stateHash` (`engine.ts:65`); `createEngine` deferred. A real `GameState` type: **none**; only test stand-ins — [A]&[B] `packages/core/test/fixtures/ports/good.ts:55`: "// Thread, VmState, and GameState are stand-ins until the VM epic defines the AD-7 shapes." (c) AD-7/AD-11; `deferred-work.md` F11 ("decide when the engine epic calls `hashState` per `advance`"). **Partial.**

### 6. `ProgramCache` / `sourceHash` — UNOWNED
(a) none. (b) none. (c) `docs/adr/0004-script-ast-step-ir-and-plugins.md:77`: "IR is cached by source hash (`ProgramCache`, E-91); compilation occurs at asset load time." AD-7 spine mentions `sourceHash` in `ProgramRef`. No epic builds it.

### 7. `PluginDefinition` — UNOWNED
(a) `grep 'PluginDefinition' packages/ tools/` → **no TS type in `packages/`** (both repos). (b) epic-legacy-formats hands it OUT — `epic-legacy-formats.md:49`: "Source conflict: AD-31 — decoders register through `PluginDefinition.decoders` (ADR 0004) vs ADR 0004 — `PluginDefinition` has `id`, `version`, `commands` and `subsystems`, and no `decoders` field. The Decision below settles it for this epic; the two documents still disagree until the plugin work amends one of them." (c) ADR 0004 decision 2 (TS interface quoted), AD-31. **UNOWNED.**

### 8. `BuiltinSpec` / `ParamSpec` — UNOWNED
(a) none. (b) none outside epic 3 (epic-battle lists AD-8 in References, `epic-battle.md:35`). (c) spine AD-8 `:140`: "`BuiltinSpec { name, aliases, params: ParamSpec[], call, resume? }` with `ParamSpec { name, optional?, byRef?, variadic? }`."

### 9. `StepReport.requests` / `diagnostics` — owned-by epic-platform-baseline 1.8
(a) **implemented** — quoted in full below (engine.ts:21-26 `Diagnostic`, :56-66 `StepReport`; requests.ts:80-89 `RunnerRequest` union). (b) `epic-platform-baseline/story-contract-types-canonical-form-and-hashes-plan.md:60`: "`packages/core/src/ports/engine.ts` -- `Engine` interface, `StepReport`, `Diagnostic` (AD-1)."; `:72`: "runner contract types (`Engine`, `StepReport`, `InputRecord`, `RunnerRequest`) on `PortData`".

### 10. Unified AST / Step IR types — UNOWNED
(a) none. (b) none outside epic 3; epic-rpgcode-tooling builds the LSP/DAP *over* the parser. (c) ADR 0004 decision 1 (Step IR `OP_PUSH`/`OP_CALL`/`OP_JUMP`/`OP_YIELD`/`OP_RETURN`).

### 11. E-03 focus-pause state — UNOWNED
(a) none. (b) the three named epics **do not mention it**: `grep -i 'E-03|pause'` in `epic-board-rendering.md`, `epic-movement-triggers.md`, `epic-web-runner-packaging.md` → **no hits** (both repos). (c) `deferred-work.md:20`: "Pause replay lands with the engine epic."; `:21`: "Revisit when the engine epic implements E-03 pause state."; spine AD-14 "The core owns the Pause state of E-03"; AD-26 lists phase "`time` (E-03)". Naming an unnamed "engine epic".

### 12. `core/raster` — owned-by epic-board-rendering (not built yet)
(a) **does not exist** in either repo. (b) `epic-board-rendering.md:14`: "The reference rasteriser in `core/raster` (also used for script read-back) replays them to PNG..."; `:31` boundary: "and the reference rasteriser". (c) spine AD-4, AD-15, AD-27.

### 13. VM-side breakpoint/pause hook — UNOWNED
(a) types implemented (`engine.ts:29-39` `PausedState`/`Breakpoint`, `:62` `paused`, `:91` `setBreakpoints`); the VM side that actually stops mid-step: none.
(b) none — epic-rpgcode-tooling builds the debugger **client**, not the VM hook. Hits (both repos):
- `epic-rpgcode-tooling/epic-rpgcode-tooling.md:14`: "a DAP launches programs against a test fixture with breakpoints, stepping, watches, threads and call stack."
- `epic-rpgcode-tooling/epic-rpgcode-tooling.md:25`: "A DAP session built on `runner-harness` sets a breakpoint, steps and shows threads, call stack and variables against a test fixture..."
- `docs/architecture-options.md:164`: "RPGCode debug adapter (DAP) | ... Breakpoints, step, watch variables, thread list, call stack. The step VM (R1) makes this cheap to build."
- `spec-rpgtoolkit-reawakened.md:65` and `packages.md:27` (StepReport carries `paused`).
- AD-1 spine `:90`: "`engine.setBreakpoints(bps)` takes data; a hit stops mid-step and returns `paused { thread, frame, line }`, with the open-step cursor stored in `GameState` so it snapshots". **UNOWNED.**

### 14. `createEngine` split — UNOWNED as a whole
`packages/core/src/ports/engine.ts:4` "deferred to the engine epic"; epic-platform-baseline's plan (`:184`) calls it "Out ... deferred to the engine epic". Three claims compete:
- **Loop / world:** `epic-board-rendering.md:31` "Core world model, the step pipeline's main loop…"; `epic-movement-triggers.md:45` "Waits on board-rendering because: world model and loop."
- **Builtin assembly:** spine AD-8 `:140` "Each domain module exports `builtins: BuiltinSpec[]`; `createEngine` assembles them in fixed module order and rejects duplicate names or aliases." — the registry is epic 3's ("The VM exposes a built-in registration API that every domain epic uses").
- **Duplicate check / catalogue:** spine AD-8 `:141` "`createEngine` throws on a duplicate; the catalogue test of epic rpgcode-tooling asserts every by-reference getter of format-spec §9.11 declares `byRef`."
So **no single epic owns `createEngine`**; epic 4 claim (loop) and epic 3 claim (registry/builtin assembly) overlap inside it, and epic 10 checks it.

### 15. `runner-harness` double — owned-by epic-platform-baseline 1.9
Implemented at [A]&[B] `packages/runner-harness/src/double/test-engine.ts` and `src/driver.ts`. Quoted API below.

## Addendum quotes

### `packages/core/src/ports/engine.ts` — every export (verbatim)

```ts
export type Diagnostic = { readonly code: string; readonly file: string; readonly line: number; readonly message: string; };
export type PausedState = { readonly thread: number; readonly frame: number; readonly line: number; };
export type Breakpoint = { readonly file: string; readonly line: number; };
export type SurfacePixels = { readonly w: number; readonly h: number; readonly rgba: Bytes; };
export type StepReport = {
  readonly stepsRun: number;
  readonly stepAfter: number;
  readonly consumed: readonly InputRecord[];
  readonly audioCues: readonly AudioCue[];
  readonly requests: readonly RunnerRequest[];
  readonly diagnostics: readonly Diagnostic[];
  readonly loading: boolean;
  readonly paused: PausedState | null;
  readonly stateHash: string;
};
export interface Engine {
  advance(steps: number, inputs: readonly InputRecord[], maxSteps?: number): StepReport;
  drawList(alpha?: number): DrawList;
  surfacePixels(id: SurfaceId, rev: number): SurfacePixels | null;
  setBreakpoints(breakpoints: readonly Breakpoint[]): void;
}
```

### `packages/core/src/ports/requests.ts` — the `requests` union (verbatim tail)

```ts
export type RunnerRequest =
  | AssetRequest | LoadBlobRequest | SaveBlobRequest | ListBlobsRequest
  | ExtensionCallRequest | QuitRequest | OpenUrlRequest | PlayVideoRequest;
```
(each carries `readonly reqId: number`; `ExtensionCallRequest` adds `name: string`, `args: readonly PortData[]`.)

### `packages/runner-harness/src/double/test-engine.ts` — exported API

```ts
export type TestEngineState = { step: number; keys: string[]; pointer: { x: number; y: number; buttons: number }; other: number; cueId: number; log: string; };
export function createTestEngine(): Engine;
```
Key behaviours (line-quoted): `advance` throws `RangeError` when an input step is outside `[before, endStep)` (`:68-72`); `focus` → `throw new Error("test double: focus pause is not modelled")` (`:123`); default → `Error("test double: unexpected event kind")` (`:127`); `stateHash = hashState(state)` (`:139`); report always `requests: []`, `diagnostics: []`, `loading: false`, `paused: null` (`:146-149`); `surfacePixels` returns `null` (`:187`); `setBreakpoints` is a no-op (`:190`). `drawList` returns a 320×240 list of `fill`/`rect` commands (`:154-183`).

### `packages/runner-harness/src/driver.ts` — exported API and every throw

```ts
export function runLog(engine: Engine, run: Run, n: number, audio: AudioSink): StepRecord[];
```
Throws: `n` not integer ≥ 1 (`:17-19`); a record step before the window (`:37-41`); `stepsRun !== stepsToRun` (`:49-53`); `stepAfter !== before + stepsRun` (`:54-58`); `loading is true` (`:59-61`); **`paused is not null`** (`:62-64`); **`requests` non-empty** (`:65-69`); **`diagnostics` non-empty** (`:70-74`); `consumed` length mismatch (`:76-80`); `consumed` canonical text ≠ fed (`:82-86`); unconsumed inputs remain (`:102-106`). A real VM-backed `Engine` replacing the double in the golden job must therefore return `paused: null`, empty `requests`/`diagnostics`, exact `stepsRun`/`stepAfter`, and byte-identical `canon(encodeLog(consumed))`.

## Spine quotes (full)

### AD-10 — One state tree, one owner per section

> - **Binds:** CAP-2, CAP-3, CAP-4, CAP-5, CAP-9, CAP-10, CAP-11
> - **Prevents:** two modules mutating one datum; saves missing state; stats copied into two places.
> - **Rule:** `GameState` has exactly these sections, each owned and mutated only by its module. Others use its port and see a `DeepReadonly` view.
>
> | Section | Owner | Holds |
> | --- | --- | --- |
> | `schema` | `core/save` | per-section schema versions, `compiler` version |
> | `world` | `core/world` | board, layers, vectors, programs, board edits, lighting, ambient, movement mode, game-speed offset |
> | `sprites` | `core/sprites` | players and items on the board, queues, facing, waypoint links |
> | `party` | `core/menu` | roster, selection, steps |
> | `inventory` | `core/menu` | items, equipment, gold |
> | `triggers` | `core/triggers` | armed and fired state, repeat counters |
> | `vm` | `core/script` | threads, globals (incl. character stats), objects, redirects |
> | `battle` | `core/battle` | fighter references, charge, status effects only; never copies HP or SMP |
> | `menu` | `core/menu` | open screens |
> | `input` | `core/input` | key queue, held keys, mouse, on-screen buttons |
> | `ui` | `core/render` | message window, fonts, cursor maps, mouse cursor |
> | `camera` | `core/world` | camera position and clamp |
> | `fx` | `core/render` | persistent animations, transitions, screen effects |
> | `audio` | `core/audio` | playing music and effects, `cueId` counter |
> | `surfaces` | `core/raster` | persistent bitmaps, `SurfaceId` counter, saved screens |
> | `rng` | `core/rng` | generator state |
> | `time` | `core/time` | step counter |
> | `engine` | `core/engine` | phase state, pending requests, queued inputs, open-step cursor |
>
> Character stats have one owner: `vm.globals` behind `StatsPort` (E-85). `SaveState` is `GameState`; snapshot, save, hash and restore use one canonical form.
>
> - **Check:** dependency-cruiser rule that only `core/<section>/**` imports its mutable `<Section>State`; a type check that `GameState extends PlainData`.

### AD-26 — Step pipeline and program modes

> - **Binds:** CAP-2, CAP-3, CAP-4, CAP-5, CAP-8, CAP-9, CAP-10
> - **Prevents:** epics inserting their phase wherever convenient; changing RNG draw order; undefined behaviour for blocking programs.
> - **Rule:** `core/engine` runs a fixed, named phase list each step: `input`, `waits`, `threads`, `movement`, `edges`, `triggers`, `battle`, `animation`, `audio`, `time` (E-03). Modules register into named phases only; order inside a phase is fixed by module rank. `Thread.kind` is `blocking`, `board`, `persistent` or `item`; lifecycle owners are `core/script` for kinds and `core/world` for killing board threads on `send` and item threads on removal (E-19, E-93). At most one `blocking` thread exists; it suspends Idle input and triggers but not other threads. `multiRun` defers movement starts and then yields one `movement` wait over the collected sprites (E-33). A blocking program that never yields is preempted at the per-step budget.
> - **Check:** a unit test snapshots the phase list; a test of exclusive-program mode with `multiRun`.
