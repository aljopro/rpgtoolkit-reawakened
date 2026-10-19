---
title: "Rulings: objects, receivers, packages, emitters and the trust baseline"
type: 'feature'
ticket: 1
created: '2026-10-19'
status: done
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
4. Emitters: `on`, `off`, `once`, `emit`; no bubbling or capture; plain emit is queued; cancelable emit parks the emitter thread until listeners ran in registration order and returns the event object; one bus for RPGCode and TypeScript; AD-32's synchronous event bus line is amended to the queued (asynchronous) model (owner, 2026-10-19). 19.1 states the G1 check: dispatch is parked plain-JSON state, saveable mid-dispatch, with deterministic registration order; the 19.2 spike verifies there is no state-machine issue. Final emitter names: `on`, `off`, `once`, `emit`, `emitCancelable`.
5. Trust baseline: RPGCode packages are trusted because the VM contains them (G2, AD-17 sandbox); 19.1 rewrites the E-99 Reawakened rule and ADR 0008 states this, with no RPGCode trust gating; manifests declare host requests; native TypeScript plugins stay author-installed; no capability model yet.
6. Plugin-language guidance: TypeScript only when RPGCode cannot do it or is too slow.
10. Runtime errors are also emitted on the game emitter as a non-cancelable `error` event, detail `{ code, message, file, line, handled }`, fired in addition to ERR-2 handling whether or not a handler caught the error; 19.1 rules the shape, 19.12 builds it.
9. `kill` and virtual-variable writes (owner, 2026-10-19): `kill()` deletes only storage the script owns; `tk*` constants, engine virtual variables and actor stat aliases are system-controlled, so `kill()` on them is a catchable runtime error (`kill.system-owned`, a new ERR-2 row); `kill(obj.field)` removes the key; writes to system-controlled names write through where writable or are a catchable runtime error (`assign.read-only`, a new ERR-2 row), and the 3.1 broken-link quirk is not reproduced (compatibility layer case by case). Lands in the `kill` row of rpgcode-functions.md and rpgcode-language.md.
8. Initiative principle (owner, 2026-10-19): 3.1 is a compatibility layer, not the model; the core is built on objects and forward design, and legacy 3.1 names, commands and data shapes are aliases/adapters onto it. Written into docs/adr/0009-compatibility-layer-not-the-model.md and the CLAUDE.md working notes; consistent with ADR 0005.
7. Built-in object types: an object whose type the host or a package provides (an actor, a Media voice) saves as data only; its methods are supplied on load by hydration, as actor behaviours are, so no closure is stored for them. Needed by Epic 20 and Epic 21.5. Engine-phase cancelable emits (no script thread to park) are ruled here with 21.1 (Epic 21, Assumption A-3).

## Acceptance

1. Every row of the ruling tables cites evidence (file:line or spec anchor) and a rejected alternative.
2. The package, emitter and object sections are anchored so entries 3 to 14 can cite them (`#pkg-1`, `#emit-1`, `#oop-12`).
3. docs/adr/0009 states the compatibility-layer principle and CLAUDE.md's working notes carry it.
4. docs/adr/0008 states the trust baseline in the repo's ADR shape and links from ADR 0004.
5. The `kill` and virtual-variable write rules are anchored rows in rpgcode-language.md and rpgcode-functions.md.
6. The AD-32 event-bus line is amended to the queued model with the G1 check written; E-99's Reawakened rule is rewritten; both are recorded as Decisions in the epic Notes.

## Verification

Link/anchor check on the changed docs; `pnpm provenance` and `pnpm licence` stay green; owner approves at the plan and done checkpoints.
