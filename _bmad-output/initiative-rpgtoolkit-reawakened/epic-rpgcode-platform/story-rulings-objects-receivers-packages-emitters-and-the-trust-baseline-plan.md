---
title: "Rulings: objects, receivers, packages, emitters and the trust baseline"
type: 'feature'
ticket: 1
created: '2026-10-19'
status: draft
baseline_revision: '0975a26b54f8d7bf569f463a02b783b16ec0ea98'
risk: "high"
context:
  - "spec - docs/spec/engine/rpgcode-modules-and-objects.md (MOD-4, OOP-10, OOP-11)"
  - "spec - docs/spec/engine/rpgcode-language.md (FUN-8)"
  - "spec - docs/spec/engine/plugins-and-battle.md#e-99"
  - "adr - docs/adr/0004-script-ast-step-ir-and-plugins.md, decision 8"
  - "spine - _bmad-output/initiative-rpgtoolkit-reawakened/architecture-rpgtoolkit-reawakened/architecture-rpgtoolkit-reawakened.md, AD-8, AD-10, AD-17, AD-26, AD-32"
  - "party - _bmad-output/initiative-rpgtoolkit-reawakened/epic-rpgcode-platform/discovery/inception-proposal.md, table D"
---

## Intent

Rule, before any code, the behaviour the 2026-10-19 party session decided, so entries 3 to 14 build against written spec. Work lands in three places: (1) `docs/spec/engine/rpgcode-modules-and-objects.md` gains the dictionary runtime, receiver and `bindThis` rows (replacing 18's note that they are not built), the package/namespace/`registerPlugin` section replacing the 'Proposed ruling' status of MOD-4, and an emitter section; (2) `docs/spec/engine/plugins-and-battle.md#e-99` gains the plugin-language decision tree and the trust baseline, and E-79's note that the actor data and its interpretation rules belong to core while battle systems are scripts; (3) `docs/adr/0008-rpgcode-packages-and-trust-baseline.md` records the trust baseline. Each new section follows the house shape: plain-language paragraph, ruling summary with counts, ratified / ruled-here / deferred tables with a one-line reason per row, judgement calls marked `<!-- OWNER: ... -->`, References list.

## Boundaries

Documentation only. No TypeScript, no fixtures. Does not touch the 18.x rows other than the ones this epic builds out (MOD-4 `registerPlugin` status, OOP-10/11 'not built' notes). AD-8's later-wins rule is referenced, not rewritten; the AD-32 event-bus line is amended by a Source-conflict-closing Decision in the spine, not paraphrased.

## Key Decisions

1. Objects: dictionary literals get runtime storage (they parse today and refuse with 'runtime storage is not available yet'); legacy classes sit on the same storage (OOP-10).
2. Receivers: `obj.method` and `obj->method` auto-bind `CallableValue.receiver`; tear-offs keep it; standalone lambdas have `this = null`; `bindThis(fn, obj)` returns a new bound callable (ADR 0004 decision 8).
3. Packages: one manifest, one dispatch; package = name + version + namespace + declared host requests; AD-8 later-wins by manifest order; `registerPlugin` only layers over the 18.5 environment-table interception.
4. Emitters: `on`, `off`, `once`, `emit`; no bubbling or capture; plain emit is queued; cancelable emit parks the emitter thread until listeners ran in registration order and returns the event object; one bus for RPGCode and TypeScript; AD-32's synchronous event bus line is superseded.
5. Trust baseline: VM contains RPGCode packages (G2, AD-17 sandbox); manifests declare host requests; native TypeScript plugins stay author-installed; no capability model yet.
6. Plugin-language guidance: TypeScript only when RPGCode cannot do it or is too slow.

## Acceptance

1. Every row of the ruling tables cites evidence (file:line or spec anchor) and a rejected alternative.
2. The package, emitter and object sections are anchored so entries 3 to 14 can cite them (`#pkg-1`, `#emit-1`, `#oop-12`).
3. docs/adr/0008 states the trust baseline in the repo's ADR shape and links from ADR 0004.
4. The AD-32 event-bus line carries a Decision closing the Source conflict recorded in the epic Notes.

## Verification

Link/anchor check on the changed docs; `pnpm provenance` and `pnpm licence` stay green; owner approves at the plan and done checkpoints.
