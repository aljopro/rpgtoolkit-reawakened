# RPG Toolkit Reawakened

**Your game, completely and freely.**

A classic RPG development ecosystem you can use right in your browser. Make your own role-playing game, and play the classic ones again.

In the early 2000s, Christopher B. Matthews' RPG Toolkit opened a door for a whole generation. It was free, it was made for role-playing games, and a community grew up around it where young people made their first maps, wrote their first scripts and shared their first games. Many of them went on to become engineers and artists. That community has been quiet for years, and the tool only runs on Windows machines of twenty years ago. RPG Toolkit Reawakened brings it back, rebuilt from scratch for the web.

## What you'll be able to do

- **Play.** Open a classic RPG Toolkit game from a link, and it plays the way it used to.
- **Make.** Draw maps, design characters, write the story and script the battles in an editor that runs in your browser.
- **Share.** Send your game to a friend as a link, or package it to publish anywhere.
- **Bring it home.** Made something with the old Toolkit? Your game opens again, and you can keep working on it.

Nothing to install, nothing to buy. Desktop, mobile and VS Code versions are planned from the same core.

## Free, and what you make is yours

The code is open source under the [MIT license](LICENSE). You can share your games, change them, or sell them. Nobody has to open up their own work. All we ask is that the license notice and credit travel with the engine.

## Where it stands

It's early days, and nothing is playable yet. The full written specification and architecture are done, and we're setting up the project's workspace and checks. The first goal is the player: a classic community game playing start to finish in a browser. Our first candidate is *Final Destiny*, by Christopher B. Matthews himself. The editor comes right after.

One known limit: the old Toolkit allowed Windows-only add-ons called plugins, and those can't run in a browser. Toolkit 3's standard battle and menu systems were plugins too, but we're rebuilding those as part of the engine, so games that used only the standard ones should play. Games with custom-built plugins will need those parts rebuilt with the new extension system.

## Who it's for

- **The next beginner,** anyone who wants to make the RPG in their head with little or no coding.
- **Returning creators,** who made games with the Toolkit years ago and want to see them play again.
- **Players,** who remember these games or are meeting them for the first time.

## Read more

- [Format specification](docs/format-spec.md): the legacy file formats the player has to read
- [Engine features](docs/engine-features.md) and [editor features](docs/editor-features.md): what the engine and the editor do
- [Architecture options](docs/architecture-options.md) and [decision records](docs/adr/0001-typescript-core.md): how it's built, and why
- [Engineering rules](docs/guardrails.md): the rules every change follows

## Helping out

We'd love the help. The earlier revivals stalled when too few people were left carrying them, so this one is meant to be built together. Start with [CONTRIBUTING.md](CONTRIBUTING.md). It has the commands to build and test the project, and the few rules that keep the project's license clean.

*Contributors: this is a clean-room project, so implement from `docs/` only. The rules are in [CONTRIBUTING.md](CONTRIBUTING.md).*

---

*Reawakened by Jensen Chappell, in tribute to Christopher B. Matthews, Phil "Xavier" Carty, and the RPG Toolkit community.*
