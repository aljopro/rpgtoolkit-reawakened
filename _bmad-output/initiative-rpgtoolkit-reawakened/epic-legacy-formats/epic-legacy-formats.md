---
type: epic
title: "Legacy projects load: formats, packages and asset resolver"
parent: initiative-rpgtoolkit-reawakened
covers: ["CAP-1"]
assignee: ""
risk: medium
---

# Legacy projects load: formats, packages and asset resolver

## Description

Every file format in the legacy sample games parses in pure TypeScript from bytes, from a folder, a `.tpk` or an appended-ZIP EXE, through a case-insensitive asset resolver, images decode once to RGBA (`decodeTexture`), the project's own distribution package (a `.tpk`-compatible ZIP with `manifest.json`) reads and writes, and pre-vector boards upgrade to the vector model. Every reader implements the pluggable `AssetDecoder` interface (AD-31) registered through the core format registry. A headless dump tool prints each file.

## Outcome

Legacy authors and the engine can open any file of a legacy project; the CAP-1 success check, a dump and round-trip of every sample-game file, is the signal.

## Done when

1. The dump tool parses every file in `demo` and `Basic` without error and prints it as readable data.
2. Formats the project writes round-trip as format-spec states, byte-for-byte or semantically.
3. A `.tpk` and an appended-ZIP EXE load to the same project as the extracted folder, and path lookup is case-insensitive.
4. A pre-vector board converts to vectors, programs, shading and pixel positions as format-spec section 4.8 states.
5. The distribution package round-trips with its manifest, and `decodeTexture` returns identical RGBA for every sample-game image. The core package still builds with no DOM or Node types (G2), imports only `fflate/browser` with sync APIs, and cites the format-spec section each reader implements.

## Boundaries

Byte readers and writers, the asset resolver, package import and pre-vector upgrade, all in `core`. Not the editor's use of them, not rendering, and not optional formats (text-era formats, compiled `.prg`, legacy `.sav`) pending the open questions. The upgrade logic of T-31 is built here and reused by the editor later.

## References

- spec - _bmad-output/initiative-rpgtoolkit-reawakened/spec-rpgtoolkit-reawakened/spec-rpgtoolkit-reawakened.md, section Capabilities
- spine - _bmad-output/initiative-rpgtoolkit-reawakened/architecture-rpgtoolkit-reawakened/architecture-rpgtoolkit-reawakened.md, AD-5, AD-6, AD-18, AD-28, AD-31
- constraint - docs/format-spec.md, sections 1-13
- reference - docs/engine-features.md, E-01, E-10, E-130, E-131

## Notes

- Open question: are 2.x text boards, other text-era formats and compiled `.prg` rejected with a clear message or supported? Entries for them wait on the spec's answer.
- Unknown: the exact legacy `Basic` and `demo` file versions present; discover at inception.
- Decision: epic set approved by the user, 2026-10-10.
- Waits on platform-baseline because: the monorepo, CI and fixture fetch.
- Open question: the JPEG decoder (library under the allowlist, or hand-written) and resource limits for untrusted packages are chosen in this epic.
- Decision: envelope re-sliced against the architecture spine, 2026-10-10.
- Decision: entry 13 added 2026-10-11, approved by the user. The `AssetDecoder` interface of AD-31 and the core format registry that this Description names were never sliced, because the Description gained that sentence after the breakdown (commit e2f4fd7). Entry 13 builds them; entries 1 to 12 stay done.
- Assumption: entry 13 keeps the rules the dump already follows. `.brd` has one decoder that peeks the minor (a vector board, or a pre-vector board converted to the vector model). Only the dump's data-format rows move onto the registry; its skip reasons (`.prg`, `.gph`, `.tan`, `.tbm`, `.sav`, media, unrecognised files) stay in the dump. The decode context that AD-31 calls `AssetResolver` is a new type over the landed `AssetIndex` and `AssetRoot`.
- Source conflict: AD-31 — decoders register through `PluginDefinition.decoders` (ADR 0004) vs ADR 0004 — `PluginDefinition` has `id`, `version`, `commands` and `subsystems`, and no `decoders` field, and no entry owns adding one. Entry 13 leaves plugin registration out until the user settles it.
