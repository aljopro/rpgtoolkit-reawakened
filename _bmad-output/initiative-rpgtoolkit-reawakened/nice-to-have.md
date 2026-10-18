# Nice to have

Ideas that are not features now but could be great ones later. Nothing here is approved, planned or scheduled, and nothing here is a ticket. `tickets.py` does not read this file. To act on an idea, the owner says so and it becomes a ticket through the usual process.

Add one entry per idea: what it is, who raised it and when, what it depends on, and what to settle first.

## Lighting as an entity (night mode)

- **Raised by:** owner, 2026-10-17.
- **Idea:** a light that belongs to an entity, such as a sprite, and moves with it. The example is a night-mode board: dark ambient with a pool of light around the player.
- **Today:** lights come from the board file. Ticket 4.13 bakes them into shading layer 0 when the board loads and discards the light objects, so a light cannot move or follow anything.
- **Depends on:** 4.15 (sprites in the compositor), 4.16 (camera), and the answer to round-7 question 8 (light falloff), which sets the look of the light's pool.
- **Settle first:** what the light is anchored to; how the shading is recomputed as it moves at a fixed, deterministic cost per tick; the script commands to attach and remove a light, with docs to the ADR 0004 standard.
- **Status:** the static night scene in the lit-scene oracle is a first independent check of the same round light.
