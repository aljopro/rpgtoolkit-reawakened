---
title: 'TK2 dialect frontend, command coverage and the TK2 compatibility plugin'
type: 'feature'
ticket: 15
created: '2026-10-16'
status: built
baseline_revision: 'a66b186c'
route: 'full'
risk: 'medium'
context:
  - 'docs/guardrails.md'
  - 'docs/spec/engine/rpgcode-dialects.md'
  - 'docs/spec/engine/rpgcode-language.md'
  - 'docs/adr/0004-script-ast-step-ir-and-plugins.md'
  - '_bmad-output/initiative-rpgtoolkit-reawakened/epic-rpgcode-vm/discovery/tk2-rpgcode-coverage.md'
  - '_bmad-output/initiative-rpgtoolkit-reawakened/epic-rpgcode-vm/discovery/tk2-rpgcode-commands.csv'
---

## Intent

Add a non-destructive Toolkit 2.x frontend that produces the existing Unified AST/Step IR, and ship the manifest-selectable TK2 compatibility plugin. TK2 uses `#` statement prefixes, `{}` blocks, loose dialogue, unquoted command arguments, sigil variables, `=` equality in conditions, labels, methods, includes and legacy flow forms. TK 1.x remains explicitly out of scope. Existing TK3 compilation and the single `PluginDefinition` registry contract must remain unchanged.

## Boundaries and decisions

- Frontend code is pure core code and never edits source or uses host APIs. It parses TK2 into the existing AST; lowering and VM remain shared.
- A TK2 compile entry point accepts a command-parameter lookup so unquoted words can become raw string literals only where the selected `ParamSpec` expects a string/unquoted value; variable sigils are stripped. Unknown calls preserve raw arguments and receive extension-tier handling.
- `#Method`/`#ReturnMethod` map to `function`/`return`, `#Branch` maps to the existing branch command, and `#FBranch`/`#Empty` remain compatibility commands. `#Include`, implicit `file.method`, redirects and `#RPGCode` preserve their raw expressions. Loose text becomes `mwin`.
- Add package `@tk-reawakened/plugin-tk2-compat`, exporting a `PluginDefinition` with `empty`, `fbranch`, and signature adapters for `setimage` (five arguments), `walkspeed`/`itemwalkspeed` (string-to-number), and `newplyr` (alias to `newPlayer`). Unknown observed plugin/library names are recorded-effect stubs with failure defaults and no I/O. Unsupported names have located diagnostics and the coverage table is machine-checkable.
- Add the `tk2` manifest id to core's default manifest only through the host resolver's supplied definition; core does not import the package or load modules. TK2 callers explicitly select the dialect and resolved plugin.
- No goldens or legacy files change. Tests use authored synthetic TK2 fixtures and the checked-in coverage CSV only.

## Code map and ordered tasks

1. Add `packages/core/src/script/tk2.ts` (TK2 lexer/parser adapter and `compileTk2`) plus exports. Reuse AST types and `lower`; preserve line locations and reject TK1 `< >` forms with a located diagnostic. Add a dialect field to compilation input only if required by the host seam; keep `ProgramRef` save data plain and backwards-compatible.
2. Add `packages/plugin-tk2-compat` package metadata, source and tests. Implement commands through `BuiltinSpec`/`CommandResult`, using recorded effects for compat operations and `ScriptError` for unsupported operations. Keep conversion deterministic and avoid files/network.
3. Extend manifest/harness integration so a TK2 host can resolve the `tk2` pack from its `.gam` plugin list while TK3 defaults stay unchanged. Add an explicit resolver helper and a coverage report/table that classifies mapped, compat-only, extension and unsupported names with program counts.
4. Add core and plugin tests for grammar boundaries, AST parity with equivalent TK3, raw argument binding, labels/methods/includes, command adapter arity and conversion, plugin effects/failures, manifest activation, and every CSV class. Update package references and dependency graph metadata only where required.
5. Mark the plan built after the full repository gates and smoke-run both a synthetic TK2 program and a TK3 equivalent.

## Acceptance criteria

- Given the synthetic TK2 program covering prefixes, sigils, blocks, loose text, `=`, labels, `Branch`/`FBranch`, methods, includes and `For`, compile and lower it without modifying source; its AST/IR command/control shapes match an equivalent TK3 program.
- Given unquoted TK2 arguments, string/unquoted `ParamSpec` positions preserve raw text while variable/number/expression positions evaluate normally; unknown calls remain resolvable through the extension tier.
- Given each observed CSV command, it is mapped to a built-in, supplied by the compat plugin, answered by an extension stub with a failure default, or listed unsupported with its count and located diagnostic; no command silently disappears.
- Given compat calls, adapters enforce the documented TK2 signatures and record deterministic effects; no network/file access occurs; `empty` and `fbranch` produce their specified VM-compatible outcomes.
- Given a `.gam` plugin list selecting TK2, the host resolves the `tk2` manifest id and runs the program; ordinary TK3 manifest resolution remains unchanged.
- Given TK1 `< >` syntax, compilation rejects it as out of MVP with a located diagnostic.

## Proposed ruling (pending owner review)

TK2 `#FBranch(:label)` is represented as the existing `branch` command with a compatibility effect carrying `call` semantics; the compat plugin cannot mutate VM instruction pointers directly. This preserves G1 and avoids a new VM opcode. Alternative rejected: frontend-only jump lowering, because it would bypass the plugin registry and make `FBranch` unavailable to manifest composition.

## Verification

`pnpm typecheck`; targeted core/plugin tests; `pnpm test`; `pnpm test:strict` after fixtures fetch; `pnpm lint`; `pnpm graph`; `pnpm golden`; `pnpm provenance`; `pnpm licence`. Confirm no tracked golden changes and no imports from `../rpgtoolkit`.

## Implementation Notes

Initial plan derived from ticket 3.15, dialect specification, ADR 0004 decisions 1/3/6, TK2 coverage study and current manifest/registry seams.

## Plan Change Log

- 2026-10-16 — initial plan and proposed FBranch effect ruling.

## Design Notes

The existing TK3 parser is intentionally not made legacy-aware. TK2 gets a separate frontend seam, but its output is the same AST and lowering path. The raw-argument binding layer is command metadata, not heuristics in the VM, so domain packs can override a command without changing the dialect parser.
