# Morning brief: make the thing, not the file

The useful shift is not “modernise every old window”. It is **remove the hand-offs between those windows**. A beginner wants a person who talks, a door that leads somewhere and water that moves—not a collection of files they must remember to connect.

Open [the interaction study](interaction-study.html) first if you want something to click. It is a small, honest sketch of four interactions, not the working editor. [The index](README.md) links the complete research.

## 1. The board becomes the place work happens

Left: Project / Outline / Assets. Middle: the board. Right: Properties for the selection.

- A Door has When / Then / Only if beside it; its destination is picked visually.
- A Person's line and route are local editing tasks, with a link to the reusable Person definition and artwork.
- Walls and walk-behind areas can be painted in whole cells **or** drawn with vertices, on the relevant layer.
- Images, lights and player/test markers are visible objects, not hidden numeric settings.
- A layer's drawing order and a player's walkable floor are not casually conflated. A canopy should not create a new storey.

**Walkthrough discovery:** a new door often points to a board that does not exist yet. The destination picker needs **Create board**, followed by a landing selection and an offered return link. “Create it elsewhere, then come back” is precisely the old friction we should remove.

See [board flows](flows/01-board-editor.md).

## 2. Common behaviour gets a short path, without a scripting ceiling

Place a Thing, pick an action, fill the meaningful blanks. **Say**, **Go to board**, **Give item**, **Play sound**, **Start battle** and simple conditions cover recurring jobs. RPGCode remains a proper editable programming surface with references, help, diagnostics and test scenarios.

Generated snippets have a visible owner and a grouped home under Programs. Board names make the group understandable; stable identity prevents a rename from severing the connection. The exact `_generated` spelling and metadata storage are recommendations, not yet decisions.

**Walkthrough discovery:** a quest needs condition/set/else composition, not just seven isolated action buttons. A “run once” chest already has a possible implementation through saved variables; it does not inherently require inventing a whole new runtime object type.

See [scripts](flows/02-scripts-and-blocks.md) and [Database](flows/04-characters-items-database.md).

## 3. Tile-making needs a redesign, not another wizard

This became the strongest new direction after your tile feedback:

| Task | Proposed authoring flow |
|---|---|
| Draw a house | Draw across a multi-cell region on the source sheet → Make brush → paint the house arrangement |
| Repair a grass seam | Edit source in real board context → check repeating preview → apply with shared/unique scope visible |
| Animate existing water art | Select frame regions → Make animated tile → preview/order/speed → paint |
| Draw the motion | Animate → duplicate frame → change only moving pixels → onion skin and loop preview |
| Make a waterfall | One multi-cell region per frame, one timeline, synchronised channels—not separate animations maintained by hand |
| Make terrain rules | Assign source art to labelled edge/corner roles and test actual map arrangements; no memorised filename or variant order |

The editor does bookkeeping; the artist still makes art. Pixel shifting, wrapping, palette shifts, mirroring and frame duplication are useful helpers, not claims that arbitrary art can be animated automatically.

**Walkthrough discovery:** a unique-looking tile edit may affect eight boards. “Used in…” and **Make unique here** are part of art-making, not optional project-management polish. Source images and region/frame relationships must remain editable rather than baked into anonymous fragments.

See [tile-making](flows/10-tile-making-without-the-grind.md), [tiles/import](flows/03-tiles-and-art-sources.md) and [animation](flows/05-animation-and-looks.md).

## 4. The main game file disappears from the beginner's workflow

Your project-file analogy is a useful rule: **defaults and conventions until an exception is needed**.

The starter creates a playable board and hero. “Start here” belongs to the board; starting party belongs to Party setup; Project settings shows effective values and links back to their owners. Startup hooks and plugin selection have discoverable conventions and explicit overrides.

**Important correction:** hiding `.gam` does not require replacing it. New text manifests and native data are storage choices to evaluate separately. Also, an old project assets folder may not contain its main file; import must accept the original root, a paired main file and assets, or a supported package.

See [conventions](flows/08-project-file-by-convention.md) and [shell/recovery/sharing](flows/07-project-shell-and-sharing.md).

## 5. Battle plugins need authoring tools, not just settings

Three levels of support are worth testing:

1. Typed commands with good labels and pickers.
2. Contributed fields rendered with the same good forms as the Database.
3. Specialist panels for formation, targeting, layouts or another system-specific job.

Shared game data remains shared. A plugin contributes what differs rather than replacing every editor. Stock tooling should prove the same contribution hooks extension authors receive.

**Walkthrough discovery:** a different battle system changes more than a screen. It can require new data, previews, migrations and test scenarios. A custom panel must still use ordinary undo, save/recovery, asset references and diagnostics. Switching systems must preserve data, and the balance helper cannot reuse Classic formulas for a different ruleset.

See [plugin editors](flows/09-plugin-editors.md) and [battles](flows/06-battle-and-effects.md).

## What did not survive review

The independent review caught incompatible definitions for Chest/Person/Stamp, duplicate owners for starting fields, conflicting Play behaviour, incorrect animation/battle details and a reversed census percentage. Those were reconciled rather than left as competing recommendations.

More importantly, earlier chat called several ideas “settled” without your approval. The [decision record](decisions.md) corrects that. Legacy write-back, save-first/current-board Play, block storage, native formats and component machinery remain proposals or open questions. The command scan is lexical; it does **not** prove that ten blocks cover 51% of complete programs.

## Picks for the next conversation—not a request to decide tonight

1. **Tile studio first:** pressure-test the house / seam / water / waterfall flows. This is the biggest remaining day-to-day effort problem.
2. **One full village journey:** create the place, person and door, then change them and recover from a mistake—not merely create them once.
3. **A plugin editor example:** design one concrete battle pack's specialist panel alongside the shared Database, without inventing an entire extension framework first.
4. **Try it with a beginner:** use the same jobs, watch the wrong turns and revise the interaction before treating these studies as a specification.

All ten studies include task paths and dependencies. They are research artifacts, not finished editor implementation, timings measured with users, or a mandate to alter the current plan.
