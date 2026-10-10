---
type: epic
title: "Games play in the browser; desktop, mobile and packaging wrap the same core"
parent: initiative-rpgtoolkit-reawakened
covers: ["CAP-12"]
assignee: ""
risk: medium
---

# Games play in the browser; desktop, mobile and packaging wrap the same core

## Description

`render-webgl2` replays draw lists, `runner-web` outputs audio through Web Audio and loads assets by fetch and OPFS; `runner-desktop` and `runner-mobile` wrap it, and a game can be packaged into a single file and legacy packages imported.

## Outcome

Anyone can play a legacy game in a browser; the CAP-12 success check, sample games playing in the browser and a packaged file loading, is the signal.

## Done when

1. The sample games play in a browser from the same core build the headless runner uses.
2. The WebGL2 replayer and the CPU rasteriser agree within the golden tolerance on the golden draw lists (G4).
3. A recorded input log replays to identical state hashes under Node and in a headless browser (G3).
4. A packaged single-file game loads in the web and desktop runners.
5. The mobile wrapper runs a sample game on a device or emulator.

## Boundaries

`render-webgl2`, `runner-web`, `runner-desktop` and `runner-mobile` as wrappers, and game packaging through the core package writer. Not the desktop editor shell (epic desktop-shell) and not editor hosts.

- Touch point: Capacitor and the chosen desktop shell - consumed; owner: this epic for the runner wrapper, epic desktop-shell for the editor

## References

- spec - _bmad-output/initiative-rpgtoolkit-reawakened/spec-rpgtoolkit-reawakened/spec-rpgtoolkit-reawakened.md, section Capabilities
- spine - _bmad-output/initiative-rpgtoolkit-reawakened/architecture-rpgtoolkit-reawakened/architecture-rpgtoolkit-reawakened.md, AD-1, AD-3, AD-4, AD-5, AD-6, AD-14, AD-27
- constraint - docs/guardrails.md, sections G3 and G4
- reference - docs/engine-features.md, E-130 to E-132
- reference - docs/architecture-options.md, section 8

## Notes

- Open question: the desktop runner shell depends on the same Tauri, Electron or Electrobun spike as epic desktop-shell; decide which epic runs the spike.
- Decision: epic set approved by the user, 2026-10-10.
- Waits on board-rendering because: draw lists to replay.
- Waits on audio-synth because: audio cues and synth.
- Waits on battle because: battle.
- Waits on menu-party-save because: menu and save.
- Decision: envelope re-sliced against the architecture spine, 2026-10-10.
