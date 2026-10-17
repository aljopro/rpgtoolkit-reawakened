---
title: 'Command documentation in code: a doc on every plugin command'
type: 'feature'
ticket: 29
created: '2026-10-17'
status: built
baseline_revision: 'cf04834d'
route: 'full'
route_source: 'pinned'
risk: 'medium'
context:
  - '{project-root}/docs/guardrails.md'
  - '{project-root}/docs/adr/0004-script-ast-step-ir-and-plugins.md'
  - '{project-root}/docs/spec/engine/rpgcode-functions.md'
  - '{project-root}/docs/spec/engine/rpgcode-language.md'
  - '{project-root}/docs/spec/engine/rpgcode-errors-and-threads.md'
  - '{project-root}/CLAUDE.md'
  - '{project-root}/packages/core/src/script/builtins.ts'
  - '{project-root}/packages/core/src/script/plugin.ts'
  - '{project-root}/tools/catalogue/generate.mjs'
---

## Open Questions

1. **Tags and aliases:** should generated output expand aliases into separate entries? **Proposed ruling (pending owner review):** use orthogonal explicit `DocTag` values (`legacy`, `alias`, `deprecated`, `obsolete`) rather than a status enum. The registered definition keeps only its explicit tags; each generated alias-spelling entry automatically adds `alias` (but never `legacy`). An explicit `alias` tag on a canonical spelling is invalid. This keeps compatibility, lineage and lifecycle independent without changing dispatch or requiring one `BuiltinSpec` per alias.
2. **Allowlist enforcement:** how should the transition from the existing catalogue happen? **Proposed ruling (pending owner review):** commit a generated, explicit `plugin-id/command-name` allowlist for commands that exist at the baseline without docs. A command absent from that allowlist must carry `doc.summary` and `doc.behaviour`; each PR that documents a command removes its allowlist entry. Do not add a catch-all exemption for “legacy” or for an entire plugin.
3. **Normative-row comparison:** how much Markdown normalisation may the check perform? **Proposed ruling (pending owner review):** parse the `docs/spec/engine/rpgcode-functions.md` command tables, trim and collapse Markdown whitespace only, and compare the resulting `Purpose` text exactly to the native command's `summary`. Resolve rows marked `alias of` to their canonical row before comparing. Do not silently rewrite punctuation, spelling or wording; a purposeful spec correction is a docs/spec change first under G7.
4. **Undocumented output during rollout:** should the pure generator omit an allowlisted command, or expose that it has no docs? **Proposed ruling (pending owner review):** emit every registered command and represent an allowlisted missing doc as `doc: null` in the output. This makes coverage visible to the future docs site and LSP and prevents a temporary migration exception from becoming invisible.
5. **Native rows versus non-native plugins:** a plugin not represented in `docs/spec` needs no row, but still needs its own documentation. **Proposed ruling (pending owner review):** the row check applies only to the native names found in the function tables; the required `summary`/`behaviour` check applies to every non-allowlisted plugin command, including third-party commands and internal continuation commands unless an explicit baseline allowlist entry covers them.

<frozen-after-approval reason="human-owned intent — do not modify unless the human renegotiates">

## Intent

**Problem:** `BuiltinSpec` currently carries only dispatch data (`name`, `aliases`, `params`, `call`). The engine, editor help and future documentation consumers therefore have no typed, discoverable explanation of what a command means, what units and waits it uses, or whether a spelling is current, an alias or obsolete. The normative function tables already have a user-facing `Purpose`, but there is no check that a registered native command remains aligned with that specification. The ticket requires a doc-first contract amendment, a staged migration for the approximately 282 existing catalogue names, a pure data-only documentation projection, and a CI check without putting documentation in saveable VM state.

**Approach:** Amend ADR 0004 first. Add an optional plain-data `doc` to `BuiltinSpec`, with orthogonal command tags and runner support metadata, and make `ParamSpec.doc` an optional object containing parameter summary, unit, tags and runner support. Keep dispatch unchanged: docs are registration metadata on a plugin command, not part of `CommandResult`, `CommandView`, `GameState`, `VmState`, effects or hashes. Add a pure `commandDocumentation(plugins)` projection that walks the ordered resolved plugin list and emits only plain data. Add a tool/check in the style of `pnpm catalogue:check`: it validates required fields, tags, runner support notes, checks the native summary against the `Purpose` row in `docs/spec`, checks obsolete/alias consistency where applicable, and applies the explicit shrinking baseline allowlist. Add fixture tests for documented commands, independent tags and aliases, runner support, parameter metadata, missing summary/behaviour, a native summary mismatch, an alias and a non-native plugin.

The output is deliberately a projection rather than a second source of truth. `docs/spec` remains normative for native behaviour; the code doc makes the runtime registration self-describing and supplies the simple-language/help and deterministic technical text required by `CLAUDE.md`.

## Exact Contract

### `BuiltinSpec` and `ParamSpec`

In `packages/core/src/script/builtins.ts`, retain the existing dispatch fields and add:

```ts
export type DocTag = "legacy" | "alias" | "deprecated" | "obsolete";

export type RunnerSupport = {
  readonly [runnerId: string]: {
    readonly level: "full" | "partial" | "none";
    readonly note?: string;
  };
};

export type BuiltinDoc = {
  readonly summary: string;
  readonly behaviour: string;
  readonly examples?: readonly string[];
  readonly tags?: readonly DocTag[];
  readonly support?: RunnerSupport;
};

export type ParamDoc = {
  readonly summary: string;
  readonly unit?: string;
  readonly tags?: readonly DocTag[];
  readonly support?: RunnerSupport;
};

export type ParamSpec = {
  readonly name: string;
  readonly optional: boolean;
  readonly byRef: boolean;
  readonly variadic: boolean;
  readonly doc?: ParamDoc;
};

export type BuiltinSpec = {
  readonly name: string;
  readonly aliases: readonly string[];
  readonly params: readonly ParamSpec[];
  readonly call: CommandHandler;
  readonly doc?: BuiltinDoc;
};
```

`doc` is optional in the transitional type because the baseline catalogue is migrated by allowlist, not by hand-writing 282 entries in this ticket. A non-allowlisted command is nevertheless required to have it by the checker. `summary` and `behaviour` are required whenever `doc` is present; no empty string is accepted. `summary` follows the owner help-text standard: simple terms first for a game author. `behaviour` follows it with the deterministic technical action: units, fixed ticks or seconds, ordering, outputs, and whether the calling script/thread waits. `examples` are complete RPGCode snippets, not pseudocode; they are optional and retain source order. `tags` are independent: `legacy` records lineage, `alias` identifies a compatibility spelling, `deprecated` marks a discouraged command and `obsolete` marks a callable obsolete command. An alias output entry automatically adds `alias`, but never `legacy`; a canonical definition cannot explicitly carry `alias`.

`support` is absent when every runner supports the command. Its open-string runner ids must be non-empty lowercase kebab-case; `partial` and `none` levels require a non-empty note describing the difference in plain words. The checker validates these constraints, while the absence of an entry means support is expected everywhere.

`ParamSpec.doc` is an object with a required author-facing `summary`, optional short `unit`, independent tags (never `alias`) and the same runner support map. Neither field changes arity, coercion or by-reference binding. Do not put handlers, closures, logger values, effects, waits, state paths or host handles in the documentation object.

### Generated command-documentation output

Add a pure function in `packages/core/src/script/command-docs.ts`:

```ts
export type CommandParamDocumentation = {
  readonly name: string;
  readonly optional: boolean;
  readonly byRef: boolean;
  readonly variadic: boolean;
  readonly summary: string | null;
  readonly unit: string | null;
  readonly tags: readonly DocTag[];
  readonly support: RunnerSupport | null;
};

export type CommandDocumentation = {
  readonly pluginId: string;
  readonly pluginVersion: string;
  /** Canonical registered name for this definition. */
  readonly canonicalName: string;
  /** Public lookup spelling represented by this entry. */
  readonly name: string;
  readonly aliases: readonly string[];
  readonly params: readonly CommandParamDocumentation[];
  readonly summary: string | null;
  readonly behaviour: string | null;
  readonly examples: readonly string[];
  readonly tags: readonly DocTag[];
  readonly support: RunnerSupport | null;
};

export function commandDocumentation(
  plugins: readonly ResolvedPlugin[],
): readonly CommandDocumentation[];
```

The input is the same ordered `ResolvedPlugin[]` used by `assembleCommands`; it is not a `GameState`, VM or registry with mutable runtime state. The function walks plugins in manifest order and commands in declaration order, emits one canonical entry and one alias entry per public spelling, and copies only immutable plain data. Alias entries retain `canonicalName` and automatically add the `alias` tag without adding `legacy`; explicit command tags remain independent. A missing allowlisted doc produces `summary: null`, `behaviour: null`, empty `tags` and `support: null`; `aliases`, `examples` and parameter arrays are always present, and optional input fields become `null`/`[]` in output, so the output is deterministic JSON data with no `undefined` keys.

Do not collapse overridden layers in this function. Every plugin command must be inspectable by the documentation site, including a wrapper or replaced lower layer; `pluginId` and declaration order preserve provenance. The language server can select the last registered matching spelling using the same layer rule as `assembleCommands`, while the documentation site can group by plugin or show the effective entry. The output contains no `call`, `next`, `CommandView`, `CommandResult`, effects, waits or state references.

Documentation is registration metadata, not VM state. `assembleCommands` may retain the `BuiltinSpec` reference for dispatch, but `createVmState`, `GameState`, snapshots, effects, `hashState` and all state hashes MUST remain unchanged when a command gains or changes a `doc`. The regression test constructs equivalent runs with and without docs and asserts equal state hashes; it does not hash the plugin definition or documentation output as simulation state.

## Native `docs/spec` relationship and rollout

`docs/spec/engine/rpgcode-functions.md` remains the normative native command source under ADR 0007/G7. Its command tables have four columns: `Command`, `Signature`, `Purpose`, and `Notes`. The checker parses those rows into a small internal table, folds names as the language does, records `alias of` relationships, and treats the `Purpose` cell as the normative native summary. The code's `doc.behaviour` is intentionally more precise than the table's short purpose and is not required to be byte-for-byte equal to any one table cell; it must cite the relevant spec sections in the implementation comments/tests where the deterministic detail comes from.

For each native command definition (canonical name and aliases), the check:

1. requires `doc.summary` and `doc.behaviour` unless the exact `pluginId/name` key is in the baseline allowlist;
2. compares the canonical `doc.summary` to the normalised `Purpose` row and fails on any difference;
3. follows an alias row's `alias of` note to the canonical row, so an alias cannot silently acquire a contradictory summary;
4. reports a stable diagnostic containing plugin id, command spelling, and the spec row/section; and
5. checks `obsolete` rows against the `obsolete` tag, rejects an explicit `alias` tag on a canonical definition, and validates runner ids and required notes for partial/none support entries (without requiring documentation metadata for an allowlisted missing doc).

Commands not found in the native function tables are not forced to invent a spec row. They still require their own `doc` unless allowlisted, and their summary/behaviour are the plugin author's contract. This is how a game-shipped or third-party plugin can be documented without pretending it is a legacy native command.

The initial allowlist is explicit and generated mechanically from the baseline assembled command set and the 282-name native catalogue; it is not a hand-written block of 282 prose entries and does not provide docs. Store it as stable `pluginId/name` keys under `tools/command-docs/legacy-allowlist.json`, with a generated/checkable representation if core needs it. Include current internal continuation names (for example `__file_*`) only where they exist at the baseline and are not user-callable. The allowlist is reviewed like code: no new command may be added to it merely to silence a check. Each owning command PR adds its doc and removes its key. The check fails if an allowlist key no longer exists, so the list can only shrink. A new catalogue row or new native command is therefore required to add docs in the same PR, while existing coverage can roll out by owner pack without one 282-entry prose migration.

This reconciles the apparent tension in the ticket between “a doc on every plugin command” and an optional field: the final invariant is every command has a doc, while the explicit, shrinking allowlist is the time-bounded migration exception. The check's error message must name the allowlist key only when it is the intentional baseline exemption; it must never describe an undocumented new command as legacy automatically.

## Check and command-line integration

Add a small `tools/command-docs/` tool, following `tools/catalogue/generate.mjs` and its `--check`/Node test pattern:

- `spec-table.mjs` (or equivalent module) parses only the stable command tables in `docs/spec/engine/rpgcode-functions.md`; it must reject a malformed row instead of silently dropping it and must have a fixture test for aliases, obsolete notes, embedded punctuation and the Reawakened additions.
- `check.mjs` loads the checked-in allowlist, assembles the shipped default plugin definitions (after the normal TypeScript build), invokes the pure core validator/projection, compares native summaries, and exits non-zero with all diagnostics grouped by plugin/command. A documented synthetic command is an in-process positive fixture; synthetic missing and mismatch cases prove the two required failures. The check does not read or write game state.
- `legacy-allowlist.json` is explicit data. A generator/check mode may derive the initial rows from the spec/native catalogue, but a check must reject unknown keys, duplicate keys and allowlist growth without an intentional file diff.
- `tools/command-docs/test/` covers parser, required-field diagnostics, native summary mismatch, independent tags and alias handling, runner support validation, non-native plugin docs, allowlist shrink validation, deterministic output ordering and the no-state-hash regression at the core test boundary.
- `package.json` adds `command-docs:check` and `command-docs:test`; CI runs both beside `catalogue:check` (the check may run after `typecheck` because the CLI imports the built core output). The command must be documented in the CI script comments, not in a new user-facing Markdown file.

The reusable core validator should accept the assembled plugin list, native rows and allowlist as data and return diagnostics rather than throwing or logging. This keeps G2 intact and lets the future documentation site and language server reuse the same validation/projection rules without importing the CLI or filesystem code. The CLI owns Markdown I/O and allowlist loading; core never imports `node:fs`, `node:path`, Markdown, JSON files or a host loader.

## Boundaries & Constraints

**Always:** Land the ADR 0004 amendment before TypeScript or tool code (G7). Keep docs plain data and deterministic. Reuse the existing `ParamSpec`, `BuiltinSpec`, `PluginDefinition`, `ResolvedPlugin`, manifest order and registry name folding. Preserve aliases and command-layer order. Keep the docs/spec Purpose row normative for native summaries. Keep `doc.behaviour` explicit about units, ticks, order, outputs and waits. Return plain data from the projection and diagnostics from the validator. Test that documentation never reaches `GameState` or a state hash. Use only the spec and repository discovery/fixtures as sources.

**Never:** Put docs in `CommandResult`, `CommandView`, `VmState`, effects, snapshots, save schema, input logs or hashes. Do not make a handler inspect or mutate its own docs. Do not make the documentation site or LSP in this ticket. Do not replace docs/spec rows with code docs, copy the entire 282-row table into TypeScript, or use a blanket `legacy` exemption. Do not parse or open `../rpgtoolkit`. Do not add host I/O or a runtime dependency to `core`. Do not alter command semantics, arity, alias resolution, layer precedence, wait behaviour, generated catalogue effects or golden files.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behaviour | Error Handling |
|---|---|---|---|
| Documented command | A plugin command has summary, behaviour, tags/support, one parameter doc/unit and an example | Projection contains the plugin id, canonical name, params with summary/unit/tags/support, example and command tags/support | None |
| Missing new doc | A command is not in the allowlist and `doc` is absent | No documentation entry is accepted by the check | Diagnostic names `pluginId/name` and says summary/behaviour are required |
| Partial doc | `doc` has summary but no behaviour, or vice versa | Fails validation; no partial command doc is treated as complete | Diagnostic names the missing field |
| Empty text | Summary or behaviour is `""` or whitespace | Fails validation | Diagnostic names the empty field |
| Native summary drift | Native `mwin` row says one Purpose and the code doc says another | Check fails; the docs/spec row remains authoritative | Diagnostic includes the Markdown row and both values |
| Native alias | `len`/`length` or `end`/`done`/`stop` is registered through aliases | One canonical doc and deterministic alias entries; aliases compare against the canonical native row and gain the `alias` tag without gaining `legacy` | Contradictory alias summary/tag is diagnosed |
| Obsolete native | A spec row says obsolete and the registered command is callable | It may still be registered for compatibility, but its docs carry the `obsolete` tag and explain the skipped/warning behaviour | Missing/incorrect tag is diagnosed after the allowlist entry is removed |
| Non-native plugin | A plugin command has no docs/spec row | It is checked for summary/behaviour and appears in output with plugin provenance | Missing docs fails unless the exact baseline key is allowlisted |
| Allowlisted baseline | An existing command has no doc and its exact key is in the allowlist | Output contains `doc: null`; check reports no required-field failure | Unknown/stale/duplicate allowlist key fails |
| Newly registered catalogue name | A new generated catalogue command appears without a baseline key | It is not silently treated as legacy | Check fails until a doc is added; adding a new allowlist key is rejected by policy/review |
| Override layers | Two plugins define the same name with different docs | Projection emits both definitions in plugin order; the registry's effective last layer remains deterministic | No docs are lost or merged silently |
| Param metadata | A parameter has unit/doc, or has neither | Output carries the value or explicit `null`; arity/by-ref/variadic flags are unchanged | Malformed empty units/docs fail validation if the implementation chooses to validate text |
| State hash | Run the same VM with plugin definitions differing only in docs | `hashState` and all saveable state bytes are equal | Any doc field in state is a regression |
| Core boundary | CLI parses Markdown and allowlist | Filesystem work stays in `tools/`; the core projection/validator remains pure | Core dependency/graph check must reject host imports |

</frozen-after-approval>

## Code Map

- `docs/adr/0004-script-ast-step-ir-and-plugins.md` — doc-first amendment to decision 2's `BuiltinSpec`/`ParamSpec` contract and decision 6's ordered plugin metadata; state explicitly that docs are registration metadata, not saveable state.
- `packages/core/src/script/builtins.ts` — add `DocTag`, `BuiltinDoc`, `ParamDoc`, runner support and parameter doc fields; leave all handlers and command semantics unchanged.
- `packages/core/src/script/plugin.ts` — update the contract comments/import surface if needed to say `BuiltinSpec.doc` is metadata and is excluded from `CommandView`/`CommandResult`; do not add docs to the handler result.
- `packages/core/src/script/command-docs.ts` (new) — `CommandParamDocumentation`, `CommandDocumentation`, deterministic projection, plain-data validator/diagnostic types and native-row comparison helpers that receive data rather than performing I/O.
- `packages/core/src/script/index.ts` — export the command-doc types, projection and validator.
- `packages/core/test/script-command-docs.test.ts` (new) — documented plugin fixture, aliases, null transitional output, missing-field diagnostics, summary mismatch, deterministic ordering and equal `hashState`.
- `tools/command-docs/spec-table.mjs` and `tools/command-docs/check.mjs` (new) — Markdown/native-row parsing and CLI check; keep all filesystem and process access outside `core`.
- `tools/command-docs/legacy-allowlist.json` (new) — generated explicit baseline `pluginId/name` exceptions; it shrinks as command owners add docs.
- `tools/command-docs/test/*.test.mjs` (new) — parser/check/allowlist fixtures, including malformed tables and the catalogue's aliases/obsolete notes.
- `package.json` and `.github/workflows/ci.yml` — add `command-docs:check` and `command-docs:test` beside `catalogue:check`; do not make the future docs site a dependency.
- `docs/spec/engine/rpgcode-functions.md` — read as normative input; no broad copy or rewrite. If a Purpose or alias relation is wrong, repair docs/spec in a separate doc-first change before changing code docs.

## Tasks & Acceptance

**Execution order:**

- [ ] **ADR first:** amend ADR 0004 decision 2/6 with the exact plain-data doc shape, parameter metadata, independent tags, runner support and alias projection semantics, output projection boundary and the no-state/hash rule. This is the G7 prerequisite; no code or tool change precedes it.
- [ ] **Types:** add the `BuiltinDoc`/`DocTag`/`ParamDoc` types and parameter fields without changing `CommandHandler`, `CommandResult`, registry arity or plugin assembly semantics. Add contract-level type tests for readonly/plain data.
- [ ] **Pure projection/validator:** implement `commandDocumentation(ResolvedPlugin[])` and data-only diagnostics. Preserve plugin/command order, expand aliases, use explicit nulls for missing transitional docs and include no runtime behaviour fields.
- [ ] **Core tests:** cover the matrix, including a doc-bearing plugin appearing with parameter units/docs/examples, missing summary/behaviour failures, native summary mismatch and unchanged `hashState`.
- [ ] **Native checker:** implement the docs/spec table parser, canonical/alias matching, exact normalised summary comparison, obsolete/tag and runner-support diagnostics. Reject malformed or silently skipped rows.
- [ ] **Allowlist rollout:** generate the initial explicit baseline allowlist from the current assembled catalogue and native names; check unknown/duplicate/stale entries and require the list to shrink. Do not hand-author 282 prose docs in this ticket.
- [ ] **CLI/CI:** add the check and tool tests, run after the core build/typecheck as needed, and wire them beside `catalogue:check` without adding a docs-site or LSP implementation.
- [ ] **All callers:** ensure default plugin assembly and any manifest/host path that invokes the checker passes the assembled ordered list; migrate no command semantics and keep external plugin docs required when not allowlisted.

**Acceptance criteria:**

- Given a plugin command with `doc`, when the pure projection runs, then its summary, technical behaviour, examples, parameter docs/units/tags/support, command tags/support, canonical name, aliases and plugin provenance appear as deterministic plain data.
- Given a command outside the explicit baseline allowlist with no summary or behaviour, when the check runs, then it fails with a stable diagnostic naming the command and missing field.
- Given a native command whose code summary differs from its `docs/spec` Purpose row, when the check runs, then it fails and identifies both the row and values; the spec row remains normative.
- Given the baseline catalogue, when the migration starts, then existing undocumented names are represented only by an explicit generated allowlist that can shrink, while any newly registered name requires docs in the same change.
- Given aliases and obsolete native rows, when projected and checked, then aliases are identifiable by the `alias` tag (without automatic `legacy`), obsolete commands by `obsolete`, and the canonical normative row is not duplicated or contradicted.
- Given equivalent VM runs whose plugin docs differ, when `hashState` is computed, then saveable state and the hash are unchanged and docs never enter `GameState`/`VmState`/effects.
- Given a plugin outside `docs/spec`, when it is not allowlisted, then it still needs its own summary and behaviour and appears with plugin provenance in the projection.
- Given all required checks, when they run, then typecheck, strict tests, lint, graph, provenance, licence, catalogue check, command-docs check/tests and headless goldens pass without intentional golden changes.

## Implementation Notes

The baseline has two different notions that must not be conflated: the normative function tables enumerate 282 legacy names (including aliases), while the runtime currently assembles `CORE_PLUGIN` plus generated catalogue responders/stubs and internal continuation commands. The allowlist is keyed by the actual assembled `pluginId/name`, not by a prose count, and the checker reports both counts so a future catalogue change cannot silently reduce coverage. The initial allowlist may be generated from the assembled definitions and spec rows, but its committed form is reviewed and must shrink monotonically.

The docs generator should not call `assembleCommands` itself: assembly emits logger warnings and returns a registry that intentionally hides lower layers. It receives the same ordered `ResolvedPlugin[]` before assembly, so it can preserve every definition and remain a pure projection. The checker may call both the projection and the registry in tests to prove they agree on order without making documentation a dispatch concern.

`docs/spec` Purpose is a short user-facing summary, while `behaviour` is the implementation-facing deterministic contract. The help-text standard is therefore satisfied by two intentionally different fields: simple terms first, then exact units/ticks/order/wait details. For a command whose existing table Purpose is too vague to support a truthful summary, repair the normative spec first rather than weakening the comparison.

## Plan Change Log

- 2026-10-17 — initial checkpoint plan from ticket 3.29, ADR 0004 decisions 2/6/7, current `BuiltinSpec`/`ParamSpec`/`PluginDefinition` code, `tools/catalogue/generate.mjs`, and the native function tables. Five proposed owner rulings record the independent tag/alias projection, staged allowlist, exact summary comparison, null transitional output and native/non-native scope.

## Review Triage Log

No review has run; this is the plan-checkpoint draft.

## Design Notes

Order matters: ADR amendment, type contract, pure core projection/validator, core regression tests, native table parser/check, generated allowlist and CLI/CI wiring. The implementation should keep the docs metadata adjacent to the command definition so first-party packs can add docs as they register commands, while the projection remains independent of the VM. The check is intentionally stricter than the type during rollout: optional source fields support a clean migration, but only the explicit baseline allowlist permits an undocumented existing command.

## Verification

**Commands:**

- `pnpm typecheck && pnpm test && pnpm lint && pnpm graph && pnpm provenance && pnpm licence` — expected: all pass; core has no host imports and docs metadata remains type-safe.
- `pnpm fixtures:fetch && pnpm test:strict && pnpm golden` — expected: pass with no `golden:record` and no tracked golden diff; documentation cannot alter state or draw hashes.
- `pnpm catalogue:check` — expected: existing generated catalogue remains unchanged.
- `pnpm command-docs:test && pnpm command-docs:check` — expected: parser, validator, allowlist and projection fixtures pass; the shipped assembled set has no undocumented non-allowlisted command and all native summaries match their rows.
- `git diff -- packages/core/src/save packages/core/src/script/state.ts golden` — expected: no save/state/golden files are changed by the docs feature.
- `grep -R "node:\|console\.\|GameState\|VmState" packages/core/src/script/command-docs.ts` — expected: no host I/O, logging or state ownership added to the pure module.

**Manual checks:**

- Read the ADR amendment beside `builtins.ts`, `plugin.ts`, `command-docs.ts` and `registry.ts`: docs are command registration metadata, not handler input or saveable state.
- Inspect a generated documentation entry for a fixture command and confirm it contains only plugin/name/alias/tags/support/parameter/example/summary/behaviour data, never `call`, `next`, effects, waits or state.
- Change only a fixture command's `doc`, run the state-hash test, and confirm the hash is byte-for-byte identical.
- Add a temporary new command with no docs and confirm `command-docs:check` fails; add its doc and confirm it passes without adding an allowlist key.
- Change one native `Purpose` row or code summary in a throwaway branch and confirm the checker fails with both sides named; restore the row without changing a golden.

</frozen-after-approval>
