# RPG Toolkit Reawakened

**Make your own role-playing game in a web browser, and play the classic ones again.**

In the early 2000s, Christopher B. Matthews' RPG Toolkit let a whole generation make their first maps, write their first scripts and share their first games. The community around it has been quiet for years, and the tool only runs on Windows machines of twenty years ago. RPG Toolkit Reawakened brings it back, rebuilt from scratch for the web.

## What you'll be able to do

- **Play.** Open a classic RPG Toolkit game from a link, and it plays the way it used to.
- **Make.** Draw maps, design characters, write the story and script the battles in an editor that runs in your browser.
- **Share.** Send your game to a friend as a link, or package it to publish anywhere.
- **Bring it home.** Made something with the old Toolkit? Your game opens again, and you can keep working on it.

Nothing to install, nothing to buy. Desktop, mobile and VS Code versions are planned from the same core.

## Free, and what you make is yours

The code is open source under the [MIT license](LICENSE). You can share your games, change them, or sell them. Nobody has to open up their own work. All we ask is that the license notice and credit travel with the engine.

## Where it stands

Early days. Nothing is playable yet. The full written specification and architecture are done, and the project's workspace and checks are being set up. The first goal is the player: a classic game with no plugins playing start to finish in a browser. The editor comes right after.

One known limit: the old Toolkit allowed Windows-only plugins, and those can't run in a browser. Games without plugins play as they are. Games that used plugins will need those parts rebuilt with the new extension system.

## Who it's for

- **The next beginner,** anyone who wants to make the RPG in their head with little or no coding.
- **Returning creators,** who made games with the Toolkit years ago and want to see them play again.
- **Players,** who remember these games or are meeting them for the first time.

## Read more

- [Format specification](docs/format-spec.md): the legacy file formats the player has to read
- [Engine features](docs/engine-features.md) and [editor features](docs/editor-features.md): what the engine and the editor do
- [Architecture options](docs/architecture-options.md) and [decision records](docs/adr/0001-typescript-core.md): how it is built, and why
- [Engineering rules](docs/guardrails.md): the rules every change follows

## Helping out

Start with [CONTRIBUTING.md](CONTRIBUTING.md). It has the commands to build and test the project and the few rules that keep the project's license clean.

*Contributors: this is a clean-room project, so implement from `docs/` only. The rules are in [CONTRIBUTING.md](CONTRIBUTING.md).*
