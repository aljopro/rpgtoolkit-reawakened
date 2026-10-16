# ADR 0004 — Unified Script AST, Step IR, and Deterministic Plugin Event Infrastructure

* **Status:** Accepted
* **Date:** 2026-10-11
* **Context documents:** [architecture-options.md](../architecture-options.md), [spec/README.md](../spec/README.md), [guardrails.md](../guardrails.md), [0001-typescript-core.md](0001-typescript-core.md)

## Context

Legacy RPG Toolkit 3 had two major architectural bottlenecks in extensibility and scripting:

1. **Native Win32 DLL Plugins:** Subsystems like menus (`menuPlugin`) and battles (`fightPlugin`), along with arbitrary community extensions, were implemented as Win32 DLLs called via raw string dispatch on unrecognized script tokens. This model breaks cross-platform execution (web, mobile, macOS, Linux), cannot be sandboxed, violates rule **G2** (core touches no OS APIs), and prevents serializing mid-tick game state (**G1**).
2. **Two Incompatible Scripting Dialects:** The project must support legacy game worlds spanning two eras:
   * **Toolkit 2.x:** Line-oriented BASIC-style scripts (`#Command` syntax, bare text lines treated as dialogue boxes, unquoted string arguments, variable sigils `$` and `!`, `< >` block delimiters, and `#Fbranch` subroutine call stacks).
   * **Toolkit 3.x:** C-style block expressions (`{ }`, `//` comments, dynamic variants, C++ style class declarations, operator overloads, and explicit string quotes).
   Forensic analysis confirmed that a 100% mechanical source-to-source file conversion from TK2 to TK3 is impossible without lossy heuristics or broken script logic. Modifying a user's legacy `.prg` files on disk is unacceptable.
3. **Core Engine Constraints:** Under **G1** (VM is an explicit step machine with plain JSON state) and **G3** (strict determinism), script execution and event handling must never rely on asynchronous Node `EventEmitter`s, Promises, or microtasks. Mid-tick state must remain fully serializable for save games and headless golden replay (**G5**).

## Decision

1. **Three-Tier Script Lowering Pipeline:**
   Script execution is separated into three distinct layers:
   * **Dialect Frontends:** Independent parsers for TK2 and TK3 produce an identical **Unified Semantic AST**. TK2 scripts are parsed under non-destructive TK2 grammatical rules (bare lines $\rightarrow$ dialogue, unquoted words without sigils in commands $\rightarrow$ strings, `< >` $\rightarrow$ blocks) without modifying files on disk.
   * **Lowering to Step IR:** The compiler lowers the Unified AST to a flat, linear array of serializable step instructions (`StepIR`: `OP_PUSH`, `OP_CALL`, `OP_JUMP`, `OP_YIELD`, `OP_RETURN`). The runtime VM never interprets AST nodes or source syntax during game loops; it steps through IR instructions.
   * **Runtime Dispatch:** When `OP_CALL` executes, the VM resolves the command name through a unified Command Registry.

2. **Dogfooded Standard Library as Plugins:**
   The core RPGCode built-in library (~280 functions across dialogue, graphics, audio, movement, and math) implements the `PluginDefinition` interface. Core commands and community extensions share the exact same runtime contract:
   ```typescript
   export interface PluginDefinition {
     id: string;
     version: string;
     commands?: readonly BuiltinSpec[]; // { name, aliases, params, call } — AD-8
     decoders?: readonly AssetDecoder[]; // ordered format contributions — AD-31
     subsystems?: {
       battle?: BattleSubsystem;
       menu?: MenuSubsystem;
       dialogue?: DialogueSubsystem;
     };
   }
   ```
   `decoders` is an optional ordered contribution to the asset pipeline. The
   plugin assembly layer starts with the core decoder set and layers plugin
   definitions in manifest order. A plugin's own duplicate decoder id or
   extension is rejected as a programmer error; across plugin layers, the later
   plugin wins and emits exactly one `decoder.overridden` warning per replaced
   claim, naming the previous and replacement plugins. The low-level
   `createAssetRegistry` registration API remains strict for direct callers and
   rejects every duplicate.
   No command has private backdoors into the VM.

   A `CommandHandler` is a pure function `(view, args, next) -> { value, out?, effects?, wait? }`, which the shorthand `{ out, effects, wait? }` abbreviates to the parts beyond a plain return. It reads a read-only view of the world and never mutates state: `value` is the call's result (`null` when the command has none), `out` carries by-reference outputs as `[index, Value]` pairs the VM writes back to the caller's variables, `effects` are plain-data records the VM drains to the section owners that apply them, and `wait` parks the calling thread (AD-9). `next` is the definition the same name has in the layer below. A handler may call `next` and adjust its result, or ignore it and replace the command; where no lower layer defines the name, `next` returns the empty result (`value: null`, no `out`, no `effects`, no `wait`) and emits one `command.no-next` warning. Each name is therefore a stack of layers (command middleware), not a single winner. A repeated name or alias is an **override, not an error**: the later layer runs first and its `next` reaches the earlier definition, and the registry emits exactly one `command.overridden` warning naming the previous and replacement plugins. The only rejection is one plugin repeating a name or alias *within itself*, which assembly refuses naming the plugin. The language constructs themselves (control flow, assignment, labels, calls, returns) are `StepIR` ops and are not in the command chain, so they can be neither removed nor wrapped.

6. **One Contract, Composition, No Trust Tiers (for now):**
   Plugins are extensions of the application and are not gated. First-party packs, the TK2 compat plugin, domain modules and game-shipped plugins all use the one `PluginDefinition`. A manifest (an ordered list of plugin entries, plain data) selects and orders them; the engine ships a default manifest of its useful packs, in the same format a game or user edits, and anything in it may be removed, disabled, reordered or added to. The built-in `core` pack is pinned at the bottom of the chain: it can be wrapped but not removed. Manifest order is layer order: where two plugins define the same command name or alias, the later entry's handler runs first and reaches the earlier one through `next`, and registration emits exactly one `command.overridden` warning naming both. The host resolves manifest ids to code and hands `PluginDefinition` values to the registry; core loads nothing (**G2**). Plugins remain bound by **G1** (plain-data state, no Promises in script threads), **G2** (external effects go through host requests) and **G3** (deterministic): these are correctness rules, not permission checks. A less-trusting model may be added later by extending manifest entries; it needs no change to the plugin contract.

3. **TK2 Compatibility Plugin (`@tk-reawakened/plugin-tk2-compat`):**
   Legacy TK2-specific commands (`#Mwin`, `#Prompt`, `#Item`, legacy `#Fbranch` subroutine call stacks, and integer `WalkSpeed` frame rate adapters) are encapsulated within a dedicated compatibility plugin. When a TK2 project loads, the TK2 plugin activates automatically. The core VM remains clean of legacy heuristics.

4. **Deterministic Event & Lifecycle Bus:**
   Engine event handling operates through a synchronous, priority-ordered event queue stored directly in the serializable world state (`world.eventQueue`):
   ```typescript
   export interface EngineEvent<T = unknown> {
     type: string;        // e.g. "board:entity_moved", "battle:turn_start"
     tick: number;        // Deterministic engine tick counter
     sourceId?: string;   // Entity or script thread ID
     payload: T;          // Plain JSON-serializable data
   }

   export interface PluginEventHook {
     event: string;
     priority: number;    // Deterministic execution order
     handle(event: EngineEvent, context: StepContext): void;
   }
   ```
   * Events are pushed during game ticks and drained deterministically before frame draw lists are emitted.
   * Plugins can subscribe to engine events or emit new custom events into the tick pipeline.
   * Because the event queue is plain data in the world state, any mid-tick snapshot or save file preserves in-flight events with zero state loss (**G1**, **G3**).

5. **Typed Subsystems Emitting Draw Lists (G4):**
   Heavy domains previously relegated to Win32 DLLs (battle engines, custom menu systems) are modeled as typed subsystem interfaces (`BattleSubsystem`, `MenuSubsystem`). Subsystems tick deterministically and emit `DrawCommand` lists and audio cues, allowing complete system replacements (e.g. Turn-based vs. Active Time vs. Tactical Grid) while remaining 100% renderer-agnostic.

7. **Async at the Boundary (modern JavaScript lives in the host):**
   `core` has no Promises (**G1**), but plugin authors and the engine's own packs still need asynchronous work (file I/O, `fetch`, decoding). This decision adds no mechanism of its own; it states how plugins use the ones AD-5, AD-8, AD-9 and AD-17 already define:
   * **Requests and replies are AD-5's.** A command that needs something external asks for it through an AD-17 request. Every request is **blocking** (time freezes: `advance` returns `loading` and consumes no ticks, so no thread moves) or **stream** (never touches state). Its reply is an input event, `asset { reqId, bytes }`, `blob.loaded` and so on, recorded in the canonical input log with its tick, so replay and restore are deterministic. There is no per-thread asset wait.
   * **Per-thread waits are AD-9's.** A command that must park one thread returns a `wait` of an AD-9 kind (`sleep`, `blob`, `input.key`, a plugin's own kind). Other threads keep ticking; the wait's `poll` resolves it.
   * **Continuation.** A command that needs its reply to finish names a continuation command and plain-data arguments in its result's `then`; the reply value is prepended. It is a named command, never a closure, so it survives save and restore.
   * **Host side.** The host performs the request with ordinary `async`/`await` and delivers the reply as an input. Promises never cross into `core`.
   * **Script side.** To an RPGCode author the call blocks. For a request that freezes time the whole engine waits (`loading`); for an AD-9 wait only that thread does.

   A reply that never arrives must not hang the game. For a **frozen request** ticks do not advance, so the timeout lives in the host: its timer delivers a failure reply (`bytes: null` for an asset) as an ordinary input, which is recorded like any other. For a **per-thread wait** the timeout is a tick count in the wait payload, as `sleep`'s `until` is, layered like a test runner's timeout: engine default, plugin manifest `options`, the wait's own value, then the harness override; zero means no limit. On expiry the thread resumes with an error result and a located diagnostic its error handler can catch. Separately, the VM detects a **deadlock**: every live thread is parked on another parked thread and no reply is outstanding. It reports the stuck threads and what each waits on, and in headless runs and goldens it is a hard failure.

   Illustrative example (names are provisional until entry 3 fixes the contract):

   ```typescript
   // Plugin: shows the first line of a game file.
   export const notes: PluginDefinition = {
     id: 'example.notes',
     version: '1.0.0',
     commands: {
       // Step 1: ask the host. Plain data only; no await, no closure.
       showNote: (view, [path]) => ({
         out: {},
         effects: [],
         request: { kind: 'asset', key: { area: 'files', path } },
         then: { command: 'showNote.done', args: [path] },
       }),

       // Step 2: runs when the reply input is applied. `bytes` was prepended.
       'showNote.done': (view, [bytes, path]) => ({
         out: {},
         effects: [{ kind: 'dialogue', text: firstLine(decodeText(bytes)), source: path }],
       }),
     },
   };
   ```

   ```typescript
   // Host side: ordinary modern JavaScript.
   host.handle('asset', async ({ key }) => {
     const res = await fetch(resolveUrl(key));
     return new Uint8Array(await res.arrayBuffer());
   });
   ```

   Rules that keep this safe: a result needed inside one command invocation is split into request and continuation, or provided by the host as a synchronous lookup it can answer from memory; the headless harness scripts replies as inputs, so plugin tests need no host. A small helper that builds the request-and-continuation record, and a test helper for scripted replies, belong with entry 3.

## Consequences

**Positive**
* **Clean-room separation:** The core engine remains modern TypeScript without legacy syntactic clutter.
* **100% backward compatibility:** 1990s and 2000s legacy games run directly from disk without destructive source conversion.
* **Ecosystem parity:** Third-party modders build plugins using the exact same API used by the engine's standard library.
* **Save/replay safety:** Event hooks and custom events cannot cause non-deterministic desyncs or un-saveable closure states.

**Negative / risks, with mitigations**
* *IR Lowering overhead:* Compiling AST to Step IR introduces a small compilation step. **Mitigation:** IR is cached by source hash (`ProgramCache`, E-91); compilation occurs at asset load time.
* *Plugin execution budget:* Malicious or buggy plugins could loop indefinitely. **Mitigation:** VM step machine enforces a maximum step budget per tick; commands must yield cooperatively.
* *Plugin collisions:* Command layers stack in manifest order and the later layer runs first, with `next` reaching the one below; a repeated name raises one `command.overridden` warning. Decoder layers use the same later-plugin-wins rule and emit one `decoder.overridden` warning per replaced id or extension. A plugin repeating its own command or decoder claim is rejected, while direct `createAssetRegistry` registration remains strict.
* *Untrusted plugin code:* Plugins are ungated, so a game-shipped plugin runs with the engine's authority. **Accepted for now.** The seam for a stricter model is the manifest entry (see decision 6); the engine rules G1 to G3 still bind every plugin.

## Alternatives considered

* **Raw AST Interpretation:** Stepping an AST tree directly at runtime. Rejected: tree-walking state is bulky to serialize in save states; linear IR simplifies VM step serialization.
* **Node EventEmitter:** Using asynchronous event emitters. Rejected: violates **G1** and **G3**; asynchronous microtasks cannot be deterministically serialized or replayed.
* **Destructive File Transpilation:** Forcing users to convert TK2 scripts to TK3 files before running. Rejected: forensic research showed lossy conversions that break user scripts.
