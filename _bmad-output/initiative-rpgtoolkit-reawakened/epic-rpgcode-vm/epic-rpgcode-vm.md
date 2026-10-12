---
type: epic
title: "RPGCode runs on a saveable step-machine VM"
parent: initiative-rpgtoolkit-reawakened
covers: ["CAP-5"]
assignee: ""
risk: high
---

# RPGCode runs on a saveable step-machine VM

## Description

The RPGCode 3.1 language runs on an explicit step-machine VM whose entire state is plain JSON: parser, interpreter, functions, classes, includes, error handlers, cooperative threads, blocking by yielded status, source/target context and sandboxed file I/O. The VM executes a linear Step IR lowered from a Unified AST produced by distinct TK2 and TK3 dialect frontends (ADR 0004). Legacy TK2 commands and runtime shims are encapsulated in `@tk-reawakened/plugin-tk2-compat`, keeping the core VM free of legacy heuristics. Core built-in commands register through the dogfooded `PluginDefinition` interface. The VM exposes a built-in registration API that every domain epic uses.

## Outcome

Script authors can run any legacy RPGCode program on a runtime with no OS threads; the CAP-5 success check, headless run of `system.prg` and `start.prg` and identical snapshot/restore, is the signal.

## Done when

1. `system.prg` and `start.prg` of the sample games run to completion headlessly with scripted input.
2. For every program in the corpus, a snapshot taken at a random step and restored into a fresh VM finishes with identical results and state hash (G1).
3. Threads (board, persistent, item), sleep, wake, `tellThread`, blocking and `multiRun`-style coupling behave as E-33 and E-93 state.
4. Runtime errors report file and line, and error handlers and `resume` forms work as format-spec section 9.8 states.
5. The language-only and pure built-ins (variables, math through `fmath`, string, flow, threads, file I/O through the AD-17 requests) work; domain built-ins register through the API and are owned by their epics.
6. The state shape, built-in contract and wake contract are exactly those of AD-7 to AD-9: inline programs, operand stack and handler state in a snapshot, by-reference outputs, duplicate-name rejection, and restart-on-compiler-mismatch.

## Boundaries

The language, the VM, threads, and the built-in registration API plus the pure built-ins. Built-ins that act on the world, drawing, audio, battle, menu or save belong to the epic that owns that domain and register through this epic's API. Not the LSP or DAP (epic rpgcode-tooling). Pre-compiled `.prg` is out unless the spec says otherwise.

- Touch point: world, render, audio, battle, menu and save built-ins - registered through the API; owners: epics board-rendering, movement-triggers, audio-synth, battle, menu-party-save

## References

- spec - _bmad-output/initiative-rpgtoolkit-reawakened/spec-rpgtoolkit-reawakened/spec-rpgtoolkit-reawakened.md, section Capabilities
- spine - _bmad-output/initiative-rpgtoolkit-reawakened/architecture-rpgtoolkit-reawakened/architecture-rpgtoolkit-reawakened.md, AD-7, AD-8, AD-9, AD-12, AD-13, AD-17, AD-24, AD-26, ADR 0004, AD-32
- constraint - docs/guardrails.md, section G1
- reference - docs/format-spec.md, section 9
- reference - docs/engine-features.md, E-33, E-90 to E-99

## Notes

- Assumption: the CAP-5 success check 'every built-in resolves' is met across epics: each domain epic registers its built-ins and epic rpgcode-tooling asserts the whole catalogue resolves. Confirm.
- Open question: the sandboxed extension mechanism replacing native plugins (E-99); its API is undefined, so entries for it wait on a decision.
- Waits on platform-baseline because: it needs the G1 lint and plain-data type constraint.
- Decision: epic set approved by the user, 2026-10-10.
- Waits on platform-baseline because: G1 lint and type rules.
- Decision: envelope re-sliced against the architecture spine, 2026-10-10.
- Decision: Jensen, 2026-10-11: TK2 and TK3 games both play at launch, so this epic covers the TK2 RPGCode dialect; RPGCode v1 (TK 1.x) is a nice to have and not part of the MVP.
- Decision: Jensen, 2026-10-11: `PluginDefinition` starts with `commands` only and grows as entries need it; every one of the catalogue's commands must respond and record its side effects in state, through the same contract third-party plugins will use, functional and immutable where viable. The sandboxed third-party mechanism (E-99) stays a separate question.
- Decision: Jensen, 2026-10-11: the semantic open rows (OOP, ERR, THR, SEM, MOD) are ruled by a doc-first step inside the entry that implements them; the breakpoint hook, pause state and `createEngine` belong to epic board-rendering.
- Source conflict: ADR 0004 and format-spec 9.9 attribute the `< >` inline-block form to TK2; it occurs only in TK 1.x (discovery/tk2-rpgcode-coverage.md). Entry 1 corrects the spec.
- Source conflict: ADR 0004 (community plugins share the in-process `PluginDefinition` contract) vs AD-17 and E-99 (games are untrusted; the extension mechanism is sandboxed and goes through host requests). Unreconciled; this epic builds the first-party mechanism only.
- Open question: the trust model for third-party plugins (E-99).
- Decision: Jensen, 2026-10-11: #httpRead, #ftpConnect, #ftpWrite and similar came from plugin DLLs shipped in the games (for example ftpPlugin.dll); they are not built-ins. They answer through recorded-effect stubs until E-99 is decided.
- Unknown: which of the 39 unmapped TK2 commands belong to which DLL; the discovery lists them in tk2-rpgcode-commands.csv with class unknown.
- Decision: Jensen, 2026-10-11: `#Include` makes the included file's functions reachable under a namespace-like nested name (file.func), the same shape as an implicit include. Open for the MOD-1/MOD-2 ruling in entry 1 and entry 8: whether the unqualified name is also visible after `#Include`, and what happens on a name clash.
- Evidence: legacy plugins exposed TKPlugQuery(name) and TKPlugExecute(full command string) and the engine asked each plugin about an unknown command name (discovery/zip-survey.md). Entry 3's lookup keeps the same shape: resolve by name, fall through to the extension tier.
- Evidence: the 39 unmapped TK2 commands split 24 plugin, 11 implicit-include library, 1 engine namespace, 3 undocumented (discovery/zip-survey.md).
- Decision: Jensen, 2026-10-11: working rule for script functions until evidence says otherwise: `#Include`, an implicit `file.func` call and first run each add the file's functions to one flat command list at that moment, and the last definition wins; the `file.` prefix always reaches that file's own definition. Unverified: the corpus never relies on a clash without the prefix.
- Decision: Jensen, 2026-10-11: AD-8's duplicate rejection is for plugin registration only, not script functions, and when two plugins define the same command the last one registered wins (with a warning diagnostic). This replaces rejection in AD-8 and ADR 0004; entry 3 amends both doc-first. Note: the legacy engine offered an unknown command to each loaded plugin in order, so the first plugin to claim it won (discovery/zip-survey.md); that is not verified to stop at the first claim.
- Evidence: legacy plugins were chosen by the main file: format-spec section 2 row 29 stores a plugin list (an enabled flag with the name implied as tkplug0 to tkplug4 for minor 2 and below, a file name per entry for minor 3 and above) plus menuPlugin and fightPlugin names; Multi-Plug read a plugins.ini. Entry 15's compat plugins activate from that list, as ADR 0004 decision 3 says.
