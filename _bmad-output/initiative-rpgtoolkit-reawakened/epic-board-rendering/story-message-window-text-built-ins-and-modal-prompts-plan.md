---
title: "Message window, text built-ins and modal prompts"
ticket: 21
type: feature
status: done
---

# Ticket 4.21 plan

Implement the E-55 message window and the dialogue group's 27 built-ins through the render/UI pack. The state remains plain JSON data; the engine appends a deterministic UI overlay after board composition and registers the `render.msgbox` wait resolver.

Normative sources: `docs/spec/engine/rpgcode-functions.md#e-55`, `#reawakened-message-window-defaults`, `#message-window-text-and-fonts`, `#reawakened-text-cell-size`, and `#reawakened-msgbox-layout`.

The message window uses the amended fixed 600x100 centered-top geometry, DOS black/white defaults, 50% translucency, all-at-once text, `<var>` splicing, and obsolete errors for `mwinSize`, `textSpeed`, and `staticText`. Text commands record deterministic bitmap/TrueType draw operations and metrics; modal prompts persist saveable state, wrap title/body text, render fixed 80x28 buttons, and resolve OK/Yes/No as 1/6/7 through claimed input events. UI state is materialised lazily on the first UI effect so empty games preserve existing state hashes.

The command-documentation fallback reuses the UI pack docs with exact native summary text and obsolete replacement metadata. The legacy allowlist entries for the implemented UI names are removed. Focused tests cover all 27 registrations, defaults, variable splicing, cell/pixel coordinates, metrics, and modal wait resolution.

## G5 hash-drift change log

After merging graphics PR #189, corpus hashes were recomputed. The root cause of the unrelated drift was that the new UI pack emitted every command as `section: ui` / `kind: mixed`; the script host records VM effects without dispatching them, so effect records changed hashes even though runtime UI remained empty. UI commands now preserve the established effect kinds: state-write for mutators, pure for getters, and draw-audio-cue for print/pixelText. Duplicate graphics draw commands were removed after the graphics pack became authoritative.

Changed vectors (old -> new):
- `synthetic-3-byref`: `c40fe35968a7a040` -> `35979ab6ca6db304`; UI getter commands now record deterministic pure effects and return their ruled values.
- `sample-start-demo`: `cf1eff002a295c51` -> `951b20e9f6924db7`; graphics #189 startup surface persistence plus the UI effect contract.
- `sample-start-basic`: `162494f8ee551f3e` -> `1197f03d646e11dc`; graphics #189 startup surface persistence plus the UI effect contract.

Verified unchanged after the fix: `sample-win-demo` `4e036c0c50414d2b`, `sample-oldman-demo` `f1521276019371da`, `sample-man-demo` `4592a1b263387977`, `sample-man-wander-demo` `81a9b1dcf6cefe3a`, `synthetic-tk2` `b60a14c58f9cf210`.
