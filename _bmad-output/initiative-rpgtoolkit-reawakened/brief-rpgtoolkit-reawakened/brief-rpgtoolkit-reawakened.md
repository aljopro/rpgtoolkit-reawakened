---
title: "Product Brief: RPG Toolkit Reawakened"
status: final
created: 2026-10-10
updated: 2026-10-10
---

# Product Brief: RPG Toolkit Reawakened

## Executive Summary

In the early 2000s, Christopher B. Matthews' RPG Toolkit opened a door. It was free, it was made for role-playing games, and a community grew up around it, led by Chris and Phil "Xavier" Carty. Young people made their first maps, wrote their first scripts and shared their first games there. Many of them went on to become engineers and artists. That community has been quiet since about 2006. The tool still exists, but it was built for Windows computers of twenty years ago, and the last attempts to modernize it stalled.

RPG Toolkit Reawakened brings it back, twenty years later, in a web browser. Classic community games play again from a link. New games are made and shared the same way. The project is free and open, and what you make with it is yours, including games you sell. **Your game, completely and freely.**

The community saw this coming. In 2005 it was already asking for an organized team, because "it is near impossible for one person to do it on their own", and asking whether the Toolkit would ever go cross-platform (Allan@Aljo, June 2005). Reawakened answers both.

It's a tribute first. But a tribute only lasts if new people walk through the door, so it's built for the next person ready to make their first game, with a welcome back for everyone who was there the first time.

## The Problem

- **The door has closed.** Someone curious about making an RPG today won't find RPG Toolkit. The website is a placeholder, and the tool doesn't run on modern machines without effort. Its code was last touched in 2017, and the community went quiet years before that.
- **The games are disappearing.** Years of community games sit on old hard drives and in archive snapshots, and most people can no longer play them.
- **Beginners have a gap.** Most RPG makers are paid desktop apps. RPG Maker costs about $80, and beginners get stuck once they need its coding add-ons. Free browser tools either aren't made for RPGs (GDevelop) or are deliberately tiny (Bitsy). Nothing we found is free, open, browser-based *and* built for RPGs. *(Details and sources in the addendum.)*
- **The community scattered.** About 357 people are still in an RPG Toolkit Discord, but there's nothing for them to gather around.

## The Solution

A modern rebuild of RPG Toolkit 3, the last major version, that runs in the browser first. Desktop and mobile versions, plus one for the VS Code code editor, are all built from the same foundation.

- **Play:** open a classic RPG Toolkit game from a link and it plays the way it used to.
- **Make:** draw maps, design characters, write the story and script the battles in an editor that runs in the browser.
- **Share:** send your game to a friend as a link, or package it to publish anywhere.
- **Bring it home:** made something with the old Toolkit? Your game opens again, and you can keep working on it. (See *Known limit* below for games that used plugins.)

## What Makes This Different

- **A classic RPG development ecosystem you can use right in your browser.** Nothing to install, nothing to buy, and nothing tied to one company's servers.
- **It comes with a library.** Beginners start with real community games they can play, open up and learn from. No other new tool has twenty years of games behind it.
- **What you make is yours.** It's free and open source under a permissive license, so you can share your games, change them, or sell them. Nobody is forced to open up their own work. All we ask is that the license notice and credit travel with the engine.
- **The community is looked after on purpose.** We bring real experience in building culture, including a book on empathy. A healthy, welcoming community is part of the product, not an afterthought, and so is sharing the work. Earlier revivals didn't fail over arguments. They ran out of people, until one person was carrying everything.
- **It keeps the old games.** Every earlier attempt to modernize the Toolkit (2015–2021) dropped support for existing games and lost its users along the way. Reawakened does the opposite. Making the old games playable is the first goal, which is what every successful revival of an old tool did first. A full written plan and technical design already exist.

## Who This Serves

- **First: the next beginner.** A teenager or hobbyist who wants to make the RPG in their head and has little or no coding experience. Success for them is finishing a small game and sending the link to a friend.
- **Welcome back: returning creators.** People who made games with the Toolkit years ago. Success is their old game playing in a browser, and the urge to make something new.
- **Players.** People who remember these games, or who are discovering them for the first time.
- **Bonus: small studios and commercial makers.** The permissive license means they can build and sell on it. We won't chase them in the first version.

## Success Criteria

- **First proof:** one classic game with no plugins plays start to finish from a link.
- **The old games come back:** a growing list of classic games playable in the browser, aiming for 5 in the first six months.
- **New games get made:** games made from scratch in the new editor and shared by link, aiming for 5 within three months of first release.
- **People gather:** the first community game jam runs and gets entries within three months of first release.
- **Culture holds:** newcomers are welcomed and disagreements get settled in the open. We measure that by people staying, not just people arriving.

## Scope

**First milestone:** the player. Classic games load and play in a browser from a link. The proof candidate is *Final Destiny* (Christopher B. Matthews, 2002), which is still downloadable and uses no plugins.

**First release:** the player plus the browser editor. You can make, play and share a new game from start to finish. The player comes first, and the editor follows right after.

**From day one:** a lightweight community foundation. That means a welcome, a code of conduct, a clear way to settle disagreements, and visible, regular releases. Culture gets set before the project takes off, not after.

**Known limit:** the old Toolkit let creators add Windows-only add-ons, called plugins, and those can't run in a browser. Toolkit 3's standard battle and menu systems were themselves plugins, but Reawakened rebuilds those as part of the engine, so games that used only the standard ones should play. The real limit is games with *custom-built* plugins. Those parts will need rebuilding using the new, safer way to add features.

**Not in the first release:**
- a full website
- community forums or hosting
- old plugins
- features beyond what RPG Toolkit 3 could do

## Open Questions

- **Credit:** how to credit Phil "Xavier" and other key community members, and what they'd want to be called.
- **The name (most important):** ask Christopher B. Matthews for his blessing to use the "RPG Toolkit" name. In 2005 the core team was clear that a true successor could only be started by Chris, and that anything else was a spin-off (toolkitzone.com, "Team Reorganisation", June 2005). Reawakened is written from scratch and deliberately isn't called "Toolkit 4". Even so, the name was seen as his to give, so ask before launch, not after.
- **The original team:** reach out to Phil "Xavier" Carty, Colin (KSNiloc), Euix and the other contributors too. Their support would mean a lot.
- **Custom plugins:** can we detect which plugins a game needs, and rebuild the most common community plugins on the new system so more games just work? This is a question for the team.
- **Toolkit 2 games:** *Final Destiny* is a Toolkit 2 game. We need to confirm the new engine opens Toolkit 2 files as well as Toolkit 3.
- **People to reach:** euix (the Discord, and remembered from the old days), arsekil (already rebuilding the old community website), and the original team listed on SourceForge.
- **Joining the Discord:** when to join, and listening before announcing anything.

The details are in the research report "What survived of RPG Toolkit".

## Vision

In two or three years, RPG Toolkit Reawakened is where a curious kid makes their first game again. The classic library is playable in any browser, a regular game jam keeps new games coming, and a small community that's known for being kind teaches the next generation the way Chris's community taught the last one.
