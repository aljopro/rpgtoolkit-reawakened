# ADR 0004 — Unified Script AST, Step IR, and Deterministic Plugin Event Infrastructure

* **Status:** Accepted
* **Date:** 2026-10-11
* **Context documents:** [architecture-options.md](../architecture-options.md), [engine-features.md](../engine-features.md), [format-spec.md](../format-spec.md), [guardrails.md](../guardrails.md), [0001-typescript-core.md](0001-typescript-core.md)

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
     commands?: Record<string, CommandHandler>;
     subsystems?: {
       battle?: BattleSubsystem;
       menu?: MenuSubsystem;
       dialogue?: DialogueSubsystem;
     };
   }
   ```
   No command has private backdoors into the VM.

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
   Heavy domains previously relegated to Win32 DLLs (battle engines, custom menu systems) are modeled as typed subsystem interfaces (`BattleSubsystem`, `MenuSubsystem`). Subsystems step deterministically and emit `DrawCommand` lists and audio cues, allowing complete system replacements (e.g. Turn-based vs. Active Time vs. Tactical Grid) while remaining 100% renderer-agnostic.

## Consequences

**Positive**
* **Clean-room separation:** The core engine remains modern TypeScript without legacy syntactic clutter.
* **100% backward compatibility:** 1990s and 2000s legacy games run directly from disk without destructive source conversion.
* **Ecosystem parity:** Third-party modders build plugins using the exact same API used by the engine's standard library.
* **Save/replay safety:** Event hooks and custom events cannot cause non-deterministic desyncs or un-saveable closure states.

**Negative / risks, with mitigations**
* *IR Lowering overhead:* Compiling AST to Step IR introduces a small compilation step. **Mitigation:** IR is cached by source hash (`ProgramCache`, E-91); compilation occurs at asset load time.
* *Plugin execution budget:* Malicious or buggy plugins could loop indefinitely. **Mitigation:** VM step machine enforces a maximum step budget per tick; commands must yield cooperatively.
* *Command collisions:* Two plugins could register the same command name. **Mitigation:** Command registry enforces namespace registration with explicit collision rejection.

## Alternatives considered

* **Raw AST Interpretation:** Stepping an AST tree directly at runtime. Rejected: tree-walking state is bulky to serialize in save states; linear IR simplifies VM step serialization.
* **Node EventEmitter:** Using asynchronous event emitters. Rejected: violates **G1** and **G3**; asynchronous microtasks cannot be deterministically serialized or replayed.
* **Destructive File Transpilation:** Forcing users to convert TK2 scripts to TK3 files before running. Rejected: forensic research showed lossy conversions that break user scripts.
