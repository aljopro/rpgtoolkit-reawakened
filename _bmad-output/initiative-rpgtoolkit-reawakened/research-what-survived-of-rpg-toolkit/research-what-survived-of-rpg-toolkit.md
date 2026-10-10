---
title: 'domain research: what survived of RPG Toolkit'
type: 'domain'
topic: 'what survived of RPG Toolkit'
decision: 'Which classic, plugin-free community game becomes the first browser-playable proof, and who is left to reawaken'
source: 'native run'
status: complete
preset: 'standard'
validation: 'normal'
created: '2026-10-10'
updated: '2026-10-10'
---

# Domain research: what survived of RPG Toolkit

**Decision this research serves:** Which classic, plugin-free community game becomes the first browser-playable proof, and who is left to reawaken.

## Executive summary

**The short answer:** the community is small but findable, the earlier attempts didn't fail because of fighting, and "plugin-free" means something different from what we assumed.

1. **In version 3, the standard battle and menu systems are themselves plugins.** The official test game ships with two Windows plugins, `tk3fight.dll` (battles) and `tk3menu.dll` (menu) [1]. So almost every RPG Toolkit 3 game with fights or a menu "uses plugins". Our plan already rebuilds the standard battle and menu systems as part of the new engine, though. **So the real limit is games with *custom-built* plugins, not every game with a plugin folder.** The brief should say that.
2. **The earlier attempts stalled from exhaustion, not conflict.** We found no public evidence of arguments or a community split [6][7]. What we found instead:
   - Effort was spread across three or four rewrites in different programming languages at once [6].
   - The team shrank to one person [6].
   - The website went dark around 2017 [8].
   - Each new version dropped support for the old games [7][9][10].

   RPGWizard was the same lead developer carrying on under a new name, and he stopped in 2021 without giving a reason [9][11].
3. **A few people are still around, and someone else is already stirring.**
   - **Discord:** the official Discord has about 357 members [12]. Its invite was created by "euix", probably Chris Hutchinson, one of the version 3 and 4 maintainers [13].
   - **Website:** a GitHub user, arsekil, has been rebuilding the old community website since June 2026 [14].
   - **Original team on record:** SourceForge still lists the original developers, including Christopher Matthews and Phil Carty [13].

**First proof candidate:** *Final Destiny* (Christopher B. Matthews, 2002), the only notable game confirmed downloadable today [15]. It's by the creator, which makes it a perfect tribute. We haven't yet checked whether it uses plugins.

**Biggest caveat:** we haven't opened a single game's files yet. Every "plugin-free" judgment is still a guess until someone downloads a game and looks inside.

## D1. Which games survived, and where

- **The game catalog on rpgtoolkit.net is gone.** The live site shows only a placeholder and a download of version 3.2.1b [8][16].
- **Archived copies still list the games.** The 2011–15 games directory names, among others:
  - Dark Age, Dark Age 2 and Dark Age EX
  - Grindalf's Eek, Galaxy Defender and Sprite Wars
  - GarQuest
  - Gendin's Quest
  - The Dragoon
  - An Altered Course
  - The Wizard's Tower
  - Crystal
  - The Blobs series
  - Three Guys No Beer

  Those archived pages don't include working download links [16].
- **The community's most-awarded games** were Vii (7 awards), Heraldry: Freija (6), Tk Land (5), Dark Age 2 (3, including Best of Show, Summer 2004) and Mortalis (3) [17].
- **Confirmed downloadable today:** only *Final Destiny* (Matthews, 2002, about 3 MB), plus old Toolkit installers for versions 1.4 to 2.20b and a 2022 snapshot of the GitHub organization, all on archive.org [15]. *Medium confidence that nothing else survives.* We didn't search YouTube, and toolkitzone's archived download links haven't been tried yet.

## D2. Plugins: the surprise

- **Version 3 ships its standard battle and menu systems as Windows plugins** (`tk3fight.dll`, `tk3menu.dll`) [1]. *Verified against the official source repository.* Community "patch" plugins for both existed too, which confirms they could be swapped out [2].
- **Many well-known games built their own systems.** Dark Age 2's battle, menu and shops were all custom [17], and the community site kept a "Custom Systems" category separate from its 30 plugins [18]. Whether those custom systems were scripts or plugins isn't recorded.
- **Rough estimate:** at most 30–50% of notable version 3 games avoided plugins entirely. Version 2 games may do better. *Low confidence: no game files were opened.*
- **Why this matters less than it sounds:** the new engine already plans to rebuild the standard battle and menu systems. A game that only used the standard plugins should play. Games that brought their own custom plugins are the real gap.

## D3. Where the community is today

- **Discord:** the only live gathering place we found. It has about 357 members, with 40–45 online across two checks today [12]. How active its conversations are is unknown without joining.
- **Website revival:** arsekil's two GitHub repositories, "RPG Toolkit 4 website" and "RPG Toolkit Community Website", both say they're "reviving the old rpgtoolkit website". The latest push was 2026-09-26 [14]. We don't know whether arsekil is connected to the Discord.
- **Nothing found elsewhere:** no itch.io presence, no YouTube channel and no replacement forum [12]. AlternativeTo lists the project as discontinued [19].

## D4. The creators and the code

- **Origins:** Christopher B. Matthews created RPG Toolkit and first released it in 1997. Since then it has been "maintained by the Toolkit community" [20]. *Medium confidence: this comes from a search snippet.*
- **SourceForge** (registered 2004) still lists the developers: Christopher Matthews, Chris Hutchinson (euix), Phil Carty (pfxcarty), Delano, Michael J. Gajewski, Woozy, and a maintainer account. It lists the licenses as GPLv2 and BSD [13].
- **Toolkitzone.com**, the official community site around 2006–09, was run by Phil Carty [18]. *Unverified:* that Phil Carty is the "Phil (Xavier)" Jensen remembers. It's likely, but no source links the two names.
- **GitHub:** the official organization has 12 repositories. The last commit anywhere was 2017-05-19, and none are archived [21]. The main later contributors were swordmaster2k, goblinJoel, chutchinson and jdaly2k [21].

## D5. Earlier revivals, and why they stalled

- **2015–17: several version 4 rebuilds ran at once.** One was in C++/Lua, one in Java, one in JavaScript, plus a Java editor. Each stopped within months, and the editor team shrank to one person [6].
- **2015: the team agreed, without dispute, to drop compatibility with the old files** [7].
- **2017–2021: RPGWizard.** The same lead developer continued as RPGWizard, a "spiritual successor" with its own formats and JavaScript instead of RPGCode [9][22]. He made all of its 210 commits [9]. On 2021-10-01 he posted "no longer in development" [11]. *Verified.*
- **A planned 2.x would have broken compatibility again**, moving to Lua and removing an abandoned engine library it depended on [10].
- **The conflict hypothesis is not supported.** We found no hostile threads, dispute notices or rival forks. *Medium-high confidence.* Absence of evidence isn't proof, and old forums and Discord history weren't searchable.

## Cross-dimension insights

- **Every earlier attempt left the old games behind, and Reawakened is the first to make them the point.** The precedent scan for the brief found that successful revivals made old content playable first. The earlier RPG Toolkit attempts did the opposite: each one broke compatibility, and each lost its users. Reawakened's whole premise is the strategy they never tried.
- **The plugin finding and our engine plan fit together.** Because the standard battle and menu systems are plugins, a strictly plugin-free game would be rare. But rebuilding those standard systems, which the plan already does, unlocks most games that only used the defaults.
- **The stall pattern is a warning for us too.** One person carrying everything was the actual failure. Reawakened has one lead right now. The brief's culture work is how to avoid it, by bringing in maintainers, not just players.

## Recommendations

1. **Update the brief's known limit.** "Games that used plugins" becomes "games with custom-built plugins". Standard battles and menus are covered by the new engine. *(Feeds: brief Scope. High confidence on the fact; the coverage claim depends on the engine plan.)*
2. **Remove the conflict assumption from the brief.** Replace it with the real lesson: earlier attempts broke compatibility and ran out of people. *(Feeds: brief, What Makes This Different. Medium-high confidence.)*
3. **Make *Final Destiny* the first proof candidate**, once someone confirms it has no custom plugins. *(Feeds: brief First milestone. Medium confidence.)*
4. **Reach out to three people first:** euix (the Discord), arsekil (the website revival) and, through SourceForge, the original developers. *(Feeds: brief Open Questions. Medium confidence on who they are.)*
5. **Plan for more than one maintainer from the start.** *(Feeds: brief, From day one.)*

## Open questions

- **Does *Final Destiny* use plugins?** Download it from archive.org and look for a `Plugin/` folder or `.dll` files. Needs Jensen's go-ahead to download.
- **Is Phil Carty the same person as "Phil (Xavier)"?** Ask in the Discord.
- **Was version 2's battle system built in, or a plugin?** It decides whether version 2 games count as plugin-free. Check the version 2 installers on archive.org.
- **Do toolkitzone's archived download links still work?** There are 63 links and a few zip captures to try.
- **How active is the Discord?** Join it.
- **Why did the 2015 rebuilds and RPGWizard stop?** No reason was ever posted. Only the people involved know.

## Sources

| # | Supports | Publisher | Pub date | Accessed | Confidence |
|---|---|---|---|---|---|
| [1] | Version 3 test game ships tk3fight.dll and tk3menu.dll | [rpgtoolkit GitHub (trans3)](https://github.com/rpgtoolkit/trans3/tree/master/Trans3_2/test/game/demo/Plugin) | 2014-12 | 2026-10-10 | high (verified) |
| [2] | Default Battle System Patch plugin | [rpgtoolkit.net via Wayback](https://web.archive.org/web/20120116141900/http://rpgtoolkit.net/extend/plugins/default-battle-system-patch) | 2009-02 | 2026-10-10 | high |
| [6] | Parallel version 4 rebuilds and team attrition | [GitHub API, rpgtoolkit org](https://api.github.com/orgs/rpgtoolkit/repos) | 2015–2017 | 2026-10-10 | high |
| [7] | Agreement to drop old-format compatibility | [GitHub, editor issue #19](https://github.com/rpgtoolkit/editor/issues/19) | 2015-06-18 | 2026-10-10 | high |
| [8] | rpgtoolkit.net placeholder since 2017 | [Wayback](https://web.archive.org/web/20170107114423/http://www.rpgtoolkit.net/) | 2017 | 2026-10-10 | high |
| [9] | RPGWizard: same lead, own formats, 210 single-author commits | [GitHub API, rpgwizard](https://api.github.com/repos/swordmaster2k/rpgwizard/commits) | 2017–2020 | 2026-10-10 | high |
| [10] | RPGWizard 2.x plan drops 1.x formats | [GitHub, rpgwizard README](https://github.com/swordmaster2k/rpgwizard) | 2022-09-18 | 2026-10-10 | high |
| [11] | "No longer in development" notice | [GitHub, rpgwizard commit](https://github.com/swordmaster2k/rpgwizard) | 2021-10-01 | 2026-10-10 | high (verified) |
| [12] | Discord about 357 members; no itch.io presence | [Discord invite API](https://discord.com/api/v10/invites/ckNQwgW?with_counts=true) | live | 2026-10-10 | high |
| [13] | SourceForge developer list and licenses | [SourceForge](https://sourceforge.net/projects/rpgtoolkit/) | 2004– | 2026-10-10 | high |
| [14] | arsekil website revival repos | [GitHub, arsekil/rpgtkweb-vite](https://github.com/arsekil/rpgtkweb-vite) | 2026-09 | 2026-10-10 | high |
| [15] | Final Destiny and old installers on archive.org | [Internet Archive](https://archive.org/details/FinalDestiny_201810) | 2018 | 2026-10-10 | high |
| [16] | 2011–15 games directory; live site placeholder | [Wayback CDX, rpgtoolkit.net/games](https://web.archive.org/cdx/search/cdx?url=rpgtoolkit.net/games/*) | 2011–2015 | 2026-10-10 | high |
| [17] | Community awards; Dark Age 2 custom systems | [toolkitzone via Wayback](https://web.archive.org/web/2008/http://toolkitzone.com/games.php?mode=awards) | 2008 | 2026-10-10 | high |
| [18] | Toolkitzone "Custom Systems" category, run by Phil Carty | [toolkitzone via Wayback](https://web.archive.org/web/2007/http://toolkitzone.com/files.php?cats) | 2007 | 2026-10-10 | medium |
| [19] | AlternativeTo lists as discontinued | [AlternativeTo](https://alternativeto.net/software/rpgtoolkit/about) | 2022-09 | 2026-10-10 | medium |
| [20] | Created by Matthews in 1997; community-maintained | [rpgmaker.net (search snippet)](https://rpgmaker.net/engines/rpgtk) | n.d. | 2026-10-10 | medium |
| [21] | GitHub org: 12 repos, last commit 2017-05-19, contributors | [GitHub API](https://api.github.com/orgs/rpgtoolkit/repos) | 2017 | 2026-10-10 | high |
| [22] | RPGWizard launch post, "spiritual successor" | [rpgwizard.org via Wayback](https://web.archive.org/web/20170813133658/http://rpgwizard.org/blogs/blog-1.html) | 2017-05-26 | 2026-10-10 | high |

## Staleness map

- **Discord membership and arsekil's activity** change fastest. Re-check by **2027-01** (3 months).
- **GitHub repository state and RPGWizard status:** re-check by 2027-04.
- **Historical findings** (games, awards, plugins, the 2015–21 timeline) don't go stale.

The earliest re-check is **2027-01**.
