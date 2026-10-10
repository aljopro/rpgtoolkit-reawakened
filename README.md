# RPG Toolkit Reawakened

A clean, from-scratch, MIT/Apache-licensed reimplementation of the RPG Toolkit 3 engine and authoring tools that can read legacy RPG Toolkit 3 game projects.

This repository currently holds product documentation only:

- [docs/format-spec.md](docs/format-spec.md) — legacy file formats (.gam, .brd, .prg, tiles, sprites, animations, battle data, saves, packages)
- [docs/engine-features.md](docs/engine-features.md) — runtime engine capability inventory and architecture
- [docs/editor-features.md](docs/editor-features.md) — authoring toolset capability inventory
- [docs/architecture-options.md](docs/architecture-options.md) — candidate stacks, core/runner seam, recommendation
- [docs/guardrails.md](docs/guardrails.md) — **binding** engineering rules G1–G7 and how they are enforced
- [docs/adr/0001-typescript-core.md](docs/adr/0001-typescript-core.md) — decision: TypeScript everywhere; VS Code extension + standalone editor

**Provenance:** The documents describe behaviour and file layouts observed in the GPL-2 legacy project. No legacy source code has been copied or ported. Implementation work must be done from these documents, not from the legacy source. Contributors and agents must follow [CONTRIBUTING.md](CONTRIBUTING.md) and [CLAUDE.md](CLAUDE.md).
