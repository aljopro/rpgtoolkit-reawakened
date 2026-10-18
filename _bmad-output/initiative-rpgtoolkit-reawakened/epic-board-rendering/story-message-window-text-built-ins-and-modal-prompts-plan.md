---
title: "Message window, text built-ins and modal prompts"
ticket: 21
type: feature
status: built
---

# Ticket 4.21 plan

Implement the E-55 message window and the dialogue group's 27 built-ins through the render/UI pack. The state remains plain JSON data; the engine appends a deterministic UI overlay after board composition and registers the `render.msgbox` wait resolver.

Normative sources: `docs/spec/engine/rpgcode-functions.md#e-55`, `#reawakened-message-window-defaults`, `#message-window-text-and-fonts`, `#reawakened-text-cell-size`, and `#reawakened-msgbox-layout`.

The message window uses the amended fixed 600x100 centered-top geometry, DOS black/white defaults, 50% translucency, all-at-once text, `<var>` splicing, and obsolete errors for `mwinSize`, `textSpeed`, and `staticText`. Text commands record deterministic bitmap/TrueType draw operations and metrics; modal prompts persist saveable state, wrap title/body text, render fixed 80x28 buttons, and resolve OK/Yes/No as 1/6/7 through claimed input events. UI state is materialised lazily on the first UI effect so empty games preserve existing state hashes.

The command-documentation fallback reuses the UI pack docs with exact native summary text and obsolete replacement metadata. The legacy allowlist entries for the implemented UI names are removed. Focused tests cover all 27 registrations, defaults, variable splicing, cell/pixel coordinates, metrics, and modal wait resolution.
