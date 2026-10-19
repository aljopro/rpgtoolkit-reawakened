---
title: 'Main-file plugins list: read, write and feed the manifest'
type: 'feature'
ticket: 9
created: '2026-10-19'
status: 'built'
baseline_revision: 'd5564edfe11da102e931151de74c34e47ee3ab8e'
route: 'full'
route_source: 'auto'
risk: 'medium'
review: ''
review_source: ''
lenses_ran: []
review_loop_iteration: 0
context:
- 'docs/spec/formats/main-file.md'
- 'docs/adr/0009-compatibility-layer-not-the-model.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Legacy `.gam` files expose only DLL-named plugin rows, while Reawakened package manifests need an ordered package selection that can be authored and loaded without interpreting legacy binaries.

**Approach:** Keep all documented legacy plugin rows unchanged and add a documented TKR extension after the main-file rows carrying an ordered, bounded list of package names. Decode that list into the plain main-file model, write it deterministically, and turn it into append operations on the existing default plugin manifest during the real engine boot path.

## Boundaries & Constraints

**Always:** Core remains pure and host-I/O-free; missing extensions mean an empty list; package order is preserved; empty lists round-trip; names and counts are validated before writing/parsing; legacy rows and unknown residue remain byte-preserved; manifest assembly is the only consumer seam.

**Never:** Do not map `menuPlugin`, `fightPlugin`, or command-plugin DLL names; do not add template defaults, namespace resolution, or `registerPlugin`; do not invent a legacy TK3 byte layout. The native extension is a TKR-owned tagged trailing block, specified before code.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Legacy file | No TKR extension | `packagePlugins=[]`; all legacy rows and residue round-trip byte-identically | No error |
| Authored list | Tagged extension with names in authored order | Names decode/write in the same order; boot patch appends entries in that order | No error |
| Empty list | Tagged extension count zero | Empty list is retained and writes the tagged empty block | No error |
| Invalid extension | Truncated block, invalid count, empty/invalid name, duplicate name or over-limit count | Located format error; no partial model | Refuse input/write |
| Unknown trailing bytes | Non-extension residue | Preserve residue verbatim and warn as existing behavior | No error |

</frozen-after-approval>

## Code Map

- `docs/spec/formats/main-file.md` -- normative rows and the TKR trailing package-list extension ruling.
- `packages/core/src/formats/main-file/model.ts` -- add ordered package-name data to `MainFile`.
- `packages/core/src/formats/main-file/reader.ts` / `writer.ts` -- decode and encode the tagged extension while preserving legacy rows/residue.
- `packages/core/src/engine/boot.ts` -- convert decoded package names to `PluginManifestPatch` append operations; leave legacy-name mapping out.
- `packages/core/src/engine/engine.ts` -- existing boot seam already assembles and resolves the manifest; feed the new patch there.
- `packages/core/test/format-main-file.test.ts` and engine boot tests -- round-trip, validation, ordering, and actual manifest consumption.

## Tasks & Acceptance

**Execution:**
- [ ] Update `docs/spec/formats/main-file.md` with the TKR extension byte convention and bounds before implementation.
- [ ] Extend the main-file model, reader, and writer with package-list read/write and validation.
- [ ] Feed package names into the existing engine manifest assembly as ordered append patch entries.
- [ ] Add tests for legacy/missing/empty/nonempty/invalid lists, preservation, and boot selection order.

**Acceptance Criteria:**
- Given a legacy fixture, when read then written, then bytes including plugin rows are identical.
- Given an authored TKR list, when read and written, then names and order survive including an empty list.
- Given a loaded main file, when boot assembles plugins, then the effective manifest contains package entries after defaults in file order and no DLL row is interpreted.
- Given malformed or over-limit extension data, when read or written, then a located diagnostic is returned.

## Implementation Notes

## Plan Change Log

## Review Triage Log

## Design Notes

The extension uses the existing residue boundary: ASCII tag `TKRPLUG\0`, unsigned little-endian `u16` true count, then `count` NUL-terminated Windows-1252 strings. The reader recognizes only this exact tag at the start of trailing bytes; any other residue remains opaque. A maximum of 256 names and 255 encoded bytes per name keeps allocations bounded. The writer emits the tag even for an explicitly authored empty list and appends opaque residue after it.

## Verification

**Commands:**
- `pnpm install` -- dependencies install successfully.
- `pnpm fixtures:fetch` -- legacy fixtures available.
- `pnpm typecheck`, `pnpm lint`, `pnpm test:strict`, `pnpm golden`, `pnpm golden:bun`, `pnpm graph`, `pnpm licence`, `pnpm provenance`, `pnpm catalogue:check`, `pnpm command-docs:check`, `pnpm oracle:check` -- all pass; the closing golden deliberately drops the legacy DLL diagnostic because legacy rows are now data-only.
