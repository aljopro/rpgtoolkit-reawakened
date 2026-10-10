---
type: epic
title: "Editor foundation: editor-ui, platform-services and two hosts"
parent: initiative-rpgtoolkit-reawakened
covers: ["CAP-15", "CAP-18"]
assignee: ""
risk: high
---

# Editor foundation: editor-ui, platform-services and two hosts

## Description

`editor-model` holds documents and command stacks, `editor-ui` hosts panels, the platform-services interface abstracts file access, test-run and export, and `host-vscode` and `host-web` run the same UI. The workspace, file tree, main-file editor and program editor with test-run work in both hosts.

## Outcome

Authors can open a legacy project in VS Code or in the browser and edit its settings and scripts; the CAP-15 and CAP-18 success checks, the same editor-ui opening and saving in both, are the signal.

## Done when

1. The same `editor-ui` build opens and saves a project through platform-services in VS Code (including a `vscode.dev` build) and in the PWA.
2. The workspace, file tree, folder-aware pickers with copy-in, and unsaved-change tracking work in both hosts.
3. The main-file editor reads and writes `.gam` so the result loads in the runner.
4. The program editor edits a program with the LSP and test-runs it against test fixtures in both hosts.
5. The dependency-graph check proves `editor-ui` imports no `host-*` package and neither host imports the other, and one host-conformance suite (undo by `editId`, save, revert, backup, external change) passes against both hosts.

## Boundaries

`editor-model`, `editor-ui` shell, `host-vscode`, `host-web`, platform-services (incl. `language.connect`), T-01 to T-14 and T-40 to T-41. Not asset editors (epic editor-assets-p0) and not the desktop shell (epic desktop-shell). Every feature lands in `editor-ui` first.

- Touch point: VS Code APIs, CodeMirror 6, File System Access API - consumed; owner: this epic

## References

- spec - _bmad-output/initiative-rpgtoolkit-reawakened/spec-rpgtoolkit-reawakened/spec-rpgtoolkit-reawakened.md, section Capabilities
- spine - _bmad-output/initiative-rpgtoolkit-reawakened/architecture-rpgtoolkit-reawakened/architecture-rpgtoolkit-reawakened.md, AD-19, AD-20, AD-21, AD-22
- constraint - docs/guardrails.md, section G2
- reference - docs/editor-features.md, T-01 to T-14, T-40, T-41
- reference - docs/architecture-options.md, sections 4 and 8

## Notes

- Open question: the platform-services interface surface; settled by the architecture spine.
- Assumption: epic editor-foundation owns CAP-18 until the desktop shell epic adds `host-desktop`. Confirm.
- Decision: epic set approved by the user, 2026-10-10.
- Waits on legacy-formats because: format readers.
- Waits on web-runner-packaging because: runner-web for preview and test-run.
- Waits on rpgcode-tooling because: the program editor's language tooling.
- Decision: envelope re-sliced against the architecture spine, 2026-10-10.
