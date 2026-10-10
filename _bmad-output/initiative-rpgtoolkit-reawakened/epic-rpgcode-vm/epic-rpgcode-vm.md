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

The RPGCode 3.1 language runs on an explicit step-machine VM whose entire state is plain JSON: parser, interpreter, functions, classes, includes, error handlers, cooperative threads, blocking by yielded status, source/target context and sandboxed file I/O. The VM exposes a built-in registration API that every domain epic uses.

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
- spine - _bmad-output/initiative-rpgtoolkit-reawakened/architecture-rpgtoolkit-reawakened/architecture-rpgtoolkit-reawakened.md, AD-7, AD-8, AD-9, AD-12, AD-13, AD-17, AD-24, AD-26
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
