---
ticket: 24
type: feature
status: done
---

# Ticket 4.24 plan

Implement the E-56/E-58/E-63 graphics command pack on the existing persistent-surface model. Commands mutate core-owned RGBA surfaces through deterministic integer raster operations, expose by-reference outputs, and retain image/board preview effects for the shared asset/compositor seam. Register the complete graphics group in the real render pack, replace `cnvRenderNow` virtual reads with `surfaces`, and register the surfaces reset seam.

Evidence: `docs/spec/engine/rpgcode-functions.md#e-56`, `#e-58`, `#e-63`, `docs/spec/engine/main-loop-and-startup.md#e-57`, and the ticket description. The command pack uses surface 0 as the screen, monotonically allocated canvas handles, numbered screen slots, and the existing raster/surface revision contract from ticket 4.7.

No owner ruling is needed; all behavior implemented here is explicitly specified. Asset-backed image and board-preview calls record deterministic effects at the pack seam, allowing the engine/compositor owner to apply decoded assets without host APIs.

The authored `sample-start-demo` and `sample-start-basic` goldens change from `705fc13ae169af2e` to `cf1eff002a295c51` and from `9357ac666196fa53` to `162494f8ee551f3e`, respectively, deliberately: both startup programs use drawing calls, and the new persistent screen pixels are now part of the canonical save-state hash.

Status: built
