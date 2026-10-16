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
- reference - docs/spec/engine/main-loop-and-startup.md#e-130 to E-132
- reference - docs/architecture-options.md, section 8

## Notes

- Open question: the desktop runner shell depends on the same Tauri, Electron or Electrobun spike as epic desktop-shell; decide which epic runs the spike.
- Decision: epic set approved by the user, 2026-10-10.
- Waits on board-rendering because: draw lists to replay.
- Waits on audio-synth because: audio cues and synth.
- Waits on battle because: battle.
- Waits on menu-party-save because: menu and save.
- Decision: envelope re-sliced against the architecture spine, 2026-10-10.
- Open question: image storage and transfer for web play. Legacy art is BMP, GIF and JPG with no PNG (`docs/spec/formats/images.md` survey, PR 2.19). Decide the stored image format, whether BMP and GIF transcode to it on import, and whether lossless WebP is added beside PNG. Settle at inception.
- Assumption: PNG is the baseline stored format, indexed where the image has 256 colours or fewer. JPG stays JPG, never transcoded to a lossless format.
- Assumption: WebP is adopted only if lossless WebP beats PNG by enough on the sample games, after gzip or brotli, to justify a second pure-TS decoder in core (G2, G3). Any encoder dependency must meet G6; `sharp` is out because libvips is LGPL.
- Assumption: a per-board asset preload and a decoded-pixel cache live in the runner layer and can be discarded without changing behaviour (G4, guardrails.md section G4).
- Waits on tk2-support because: BMP and GIF decoders (entries 16.11 and 16.12) to transcode from.
- Decision: image-storage work is this epic's, 2026-10-12; it may move to another epic at inception.
- Decision: Jensen, 2026-10-15: `docs/spec/` replaces `docs/format-spec.md` and `docs/engine-features.md` as the normative spec (ADR 0007, entry 1.13); the owner attests it is clean (extraction-log round 4).
- Evidence: docs/spec/examples/files/example_game.tpk and standalone_layout.exe.bin are a committed `.tpk` and `CMP1` EXE, usable for Done-when 4. docs/spec notes the original wrote saves from PAK games into a temporary folder deleted on exit.
