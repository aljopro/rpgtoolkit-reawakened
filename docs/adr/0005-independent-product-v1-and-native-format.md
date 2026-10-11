# ADR 0005 — Reawakened is an independent product (v1.0); a native format is permitted, not required

* **Status:** Accepted
* **Date:** 2026-10-11
* **Context documents:** [0001-typescript-core.md](0001-typescript-core.md), [format-spec.md](../format-spec.md), [engine-features.md](../engine-features.md), [editor-features.md](../editor-features.md)

## Context

The project is described in several places as a rebuild or successor of RPG Toolkit 3. That wording invites the reading that this is "RPG Toolkit 3.x" or "RPG Toolkit 4". It is neither. It is a clean-room, separate project that can open and play legacy worlds, and it should be understood, named and versioned as its own product.

**Precedent.** The project's stewards said the same thing in 2005. Phil "Xavier" Carty, steward of ToolkitZone and RPG Toolkit after Christopher B. Matthews, wrote on 7 June 2005: "There will never be a 4.0." He expected 3.0.7 or 3.1.0 instead. Source: Wayback Machine capture of a ToolkitZone library post, <https://web.archive.org/web/20061006224635/http://toolkitzone.com/library.php?mode=read&doc=239&PHPSESSID=a820148b616163a5ea1de7ec3d784861>, as quoted by the project owner. Reawakened honours that: there is no "4.0", and we are a successor with our own name and version line.

## Decision

1. **Independent product, first release is v1.0.** We are **Reawakened** (abbreviated **TKR**), not RPG Toolkit. We strive to bring back the magic of RPG Toolkit and describe ourselves as its **successor**: a successor in spirit and community, not a version. We do not continue the RPG Toolkit 3 version line and are not "v4". "v1.0" describes the product, not any file format.
2. **Legacy compatibility is an import/playback feature, not an identity.** We read and play TK3 formats (`.gam`, `.brd`, `.prg` and related; see [format-spec.md](../format-spec.md)) and aim to keep legacy worlds running. TK3 behaviour is a compatibility target, not a design constraint.
3. **A native format is permitted, not required.** Because we are not TK3, we are free to define our own format ("TKR", working name) **when legacy formats limit a feature**. Until that happens, legacy formats stay first-class. If it does, it is a major bump on the existing magic + major/minor header convention (format-spec §1.4), not a rewrite, and legacy formats are read through importers/converters (epics 2.8, 2.10) into it.
4. **Legacy-write support is not a promise.** Round-tripping to TK3 formats may be offered where cheap.
5. **Naming follows identity.** Package scopes, repo names, binaries and docs use Reawakened/TKR, never "RPG Toolkit" as our own name. Saying we are "the successor to RPG Toolkit" is a description of lineage and a tribute, not a name, and must not imply endorsement. "TK3" refers only to the legacy tool and its formats.

## Open questions

Not decided yet, and deliberately not decided here:

* Whether and when a native format is needed, and the first feature that justifies it.
* The name and extension of the native format ("TKR" is a placeholder).
* The npm scope and repository name (see §5).
* Container layout (folder of files vs single package) and how it relates to the distribution package writer (epic 2.12).
* Schema versioning and migration policy.
* Whether any TK3 formats remain first-class editable, or only importable.
* Branding and naming consequences of "not a TK version" (README, store listings, package names).

A follow-up ADR (or a native-format section in `format-spec.md`) will settle these before the editor writes any project to disk.

## Consequences

* All docs, READMEs and package metadata should avoid "v3", "v4" or "next version" framing for the product itself. "TK3" refers only to the legacy tool and its formats.
* Format work must separate the *legacy reader* layer from the *native model*, so the native format can evolve without breaking importers.
* Goldens and corpus gates (G5) continue to validate legacy playback; native-format tests are added as that format is specified.
* Contributors and agents should treat compatibility with TK3 as a requirement of the importers and runner, not of the native data model.
