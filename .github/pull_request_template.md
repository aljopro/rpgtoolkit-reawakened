## What & why

<!-- Summary. Cite the spec: docs sections and capability IDs (E-xx / T-xx). -->

## Guard-rails checklist ([docs/guardrails.md](../docs/guardrails.md))

- [ ] **G1** Script VM changes keep the step-machine model; state stays plain JSON data; snapshot/restore test passes.
- [ ] **G2** No DOM/Node/I/O/timers in `core`; `editor-ui` uses only platform-services; dependency direction respected.
- [ ] **G3** No `Math.random`/`Date`/`performance.now`/`Intl` in `core`; only allowlisted `Math` members and no `**` (other maths via `core/fmath`); replay-hash test passes.
- [ ] **G4** Renderers only replay draw lists; no game state or loop in renderer code.
- [ ] **G5** Headless golden suite passes; any golden change is explained below.
- [ ] **G6** Every new dependency's licence is rated Bronze or better on the Blue Oak Council list and not on the exception list (see G6 and ADR 0003); notices updated for bundled assets.
- [ ] **G7** Implemented from `docs/` only; no legacy source consulted or copied; doc fixes landed first if needed.
- [ ] No guard-rail exception, **or** exception marked inline with its ADR (`guardrail-exception: Gx ADR-NNNN`).

## Golden changes (if any)

<!-- Which goldens changed and why the new output is correct. -->
