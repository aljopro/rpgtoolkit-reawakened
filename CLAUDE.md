# RPG Toolkit Reawakened — agent instructions

Clean-room, MIT/Apache rebuild of the RPG Toolkit 3 engine and editor in **TypeScript** ([ADR 0001](docs/adr/0001-typescript-core.md)).

## Non-negotiable: the guard-rails

Read and follow **[docs/guardrails.md](docs/guardrails.md)** (G1–G7) for every change. In short:

- **G1** The RPGCode VM is an explicit step machine. State is plain JSON data. No generators, async/await or Promises for script threads.
- **G2** `core` touches no DOM, Node, I/O or timers. `editor-ui` reaches the host only through platform-services. Dependencies flow `core ← synth ← runners/lsp/dap/editor-ui ← host-*`.
- **G3** No `Math.random`, `Date`, `performance.now` or `Intl` in `core`. Use the injected clock and seeded RNG, with a fixed time step.
- **G4** Renderers only replay draw lists. Phaser and Pixi are never the loop and never hold state.
- **G5** The headless golden tests must pass. Change goldens only deliberately, and explain why.
- **G6** Dependencies only under MIT, Apache-2.0, BSD, ISC, Zlib, 0BSD (CC0 for assets). Never add GPL, LGPL or AGPL.
- **G7** Clean-room: implement only from `docs/`. Never open, copy or translate the legacy GPL source (`../rpgtoolkit`) while writing code. If the docs are wrong or missing something, fix the doc first in its own commit, then the code.

If a task seems to need breaking a rule, stop and ask. Exceptions require an ADR.

## Working notes

- Specs: `docs/format-spec.md`, `docs/engine-features.md` (E-xx IDs), `docs/editor-features.md` (T-xx IDs). Cite IDs and sections in commits and PRs.
- Editor features land in `editor-ui` first. Host packages (`host-vscode`, `host-web`, `host-desktop`) contain only platform services and chrome. The VS Code extension is a primary host, not the only one.
- Legacy sample games are CI fixtures fetched at test time. Never commit them.
