# Holographic model of the community evidence (verified ledger)

Built 2026-10-11 from `data/evidence-ledger.jsonl` (457 rows). It replaces `quantified-holographic-nostalgia-research.md`, which is withdrawn (section 0). Every claim below can be traced to a verbatim quote in the source chat: `tools/verify-ledger.py` checks that each quote exists in the cited message and was written by the named speaker.

## 0. Retraction: the earlier "quantified" report

A day earlier this project published a "quantified holographic" report built by counting keyword hits in the #nostalgia messages. Re-checking the script showed the numbers were artefacts of how it matched text. The report is withdrawn, and the seven fact-store entries seeded from it were removed or corrected.

| Earlier claim | What the re-check found |
|---|---|
| "Menu & UI: 170 mentions, 30 blockers, the biggest crisis" | 117 of the 170 "mentions" were false hits, 110 of them the letters `ui` inside words like "quite" and "build". Of 10 sampled "blocker" messages, 9 matched `quit` inside "quite" and the tenth matched `dead` inside "deadline". |
| "Attrition cliff: 31 of 38 blockers (81.6%) in the finishing phase, zero delight" | The "blockers" were largely the same "quite" artefact. The arithmetic was also wrong (31 of 42, not 38), phases overlapped, and delight was only counted when no blocker or friction word was present. |
| "Beginner storytellers are 62.7% of the community" | 165 of the 200 matches rested on bare tokens such as "12", "kid", "story", "school". Persona cannot be measured from this chat. |
| "Resolution: 100% pain ratio; a fixed 800x600 window blocked commercial Toolkit games" | Seven loose messages, one of them about fixed resolution, and that one is about **RPGWizard**. The Toolkit 3 main file has custom-resolution fields (format-spec section 2, minor 7 and up). |
| "GIF import was universally praised" | One person praised it, repeatedly. Another member wrote that he did not know it existed. |
| "100% of attrition happens at the finish line" | Chat among people who stayed in touch cannot measure attrition. People who quit quietly are not in it. |

Also corrected elsewhere: a UI catalog whose pixel sizes and control lists had been written without looking at the images (replaced; see `legacy-ui-visual-archaeology.md`), and eleven quotations in `nostalgia-analysis-2019-2026.md` that were reworded, reordered or mis-cited.

## 1. Method

1. **Parse** each export to JSONL (`tools/parse-discord-export.py`). Messages get stable ids.
2. **Filter** #general to Toolkit-related and adjacent chat (`tools/filter-relevant.py`), then **curate** by reading what was kept and dropping personal or off-topic messages (`tools/curate-relevant.py`). #nostalgia is used whole.
3. **Code** claims into ledger rows against a fixed vocabulary (`data/ledger-vocab.json`): who said it, the verbatim quote, kind (pain, praise, request, departure, opinion, fact), issue key, severity, lifecycle phase, which tool era the experience belongs to, firsthand or not. Six coders each read one slice. Coders were told to under-code.
4. **Verify** every row mechanically: cited ids exist, the speaker wrote the first cited message, the quote is verbatim, and every controlled field is in the vocabulary. 457 of 457 rows pass.
5. **Review** by hand: every pain, departure and praise row and every #general row was read individually; a random sample of 28 across all kinds was read as a check. Six rows were corrected and six added (listed in `data/` history below).
6. **Aggregate** by distinct people (`tools/aggregate-ledger.py`). A chatty speaker counts once per issue, at the highest severity they reported. Pain about other tools is reported separately from pain about the Toolkit. Deleted accounts are never counted as one person.

Reviewer changes: removed two rows (a self-blamed memory problem; praise of a member's own deltaTime function); recoded two Tiled complaints as tool-use facts rather than Toolkit pain; recoded two affection rows that had been filed under the wrong key; added six rows the #general coder missed (publisher feedback on a demo with no battle or menu systems, the multiplayer plugin lineage, two AI-written-plugin rows, the state of the Discord, the Toolkitzone history).

## 2. Results

Evidence base: 457 verified rows from 61 named people (general 14, nostalgia 55); 4 rows from deleted accounts are kept but never counted as one person. 96% of rows are firsthand. Most prolific speaker (chaihaveaproblem) wrote 22% of rows. Persona was self-stated in only 35 rows (20 people).

### Pain and departure reasons, by distinct people (firsthand)

| Issue | People | Blocker | Friction | Minor | excl. top speaker | Era (people) | Chan |
|---|---|---|---|---|---|---|---|
| `stability.modern-os` | 10 | 3 | 6 | 1 | 9 | modern 9, tk3-heyday 1 | N |
| `community.sites-lost` | 7 | 0 | 2 | 5 | 7 | modern 6, tk4 1 | G/N |
| `preservation.games-lost` | 7 | 0 | 2 | 5 | 7 | modern 4, n/a 1, tk2 1, tk3-heyday 1 | G/N |
| `scripting.rpgcode-limits` | 6 | 1 | 3 | 2 | 5 | tk3-heyday 5, modern 1 | N |
| `community.finish-rate` | 6 | 0 | 4 | 2 | 5 | tk3-heyday 3, n/a 2, tk2 1 | G/N |
| `stability.runtime-slow` | 5 | 1 | 4 | 0 | 4 | tk3-heyday 3, modern 2 | N |
| `plugins.rot` | 4 | 1 | 3 | 0 | 3 | modern 4 | N |
| `menu-ui.no-tooling` | 3 | 0 | 3 | 0 | 2 | tk3-heyday 2, modern 1 | N |
| `preservation.version-hunt` | 3 | 0 | 1 | 2 | 3 | modern 2, tk2 1 | N |
| `assets.art-burden` | 2 | 0 | 2 | 0 | 2 | tk3-heyday 2 | N |
| `battle.custom-effort` | 2 | 0 | 2 | 0 | 1 | modern 1, tk3-heyday 1 | N |
| `battle.default-broken` | 2 | 0 | 2 | 0 | 1 | modern 1, tk3-heyday 1 | N |
| `display.fullscreen-windowed` | 2 | 0 | 0 | 2 | 2 | modern 1, tk3-heyday 1 | N |
| `distribution.export-broken` | 2 | 0 | 2 | 0 | 1 | modern 1, tk3-heyday 1 | N |
| `docs.missing-or-lost` | 2 | 0 | 1 | 1 | 1 | modern 1, tk4 1 | N |
| `plugins.docs-lost` | 2 | 0 | 2 | 0 | 1 | modern 2 | N |
| `scripting.threads` | 2 | 0 | 2 | 0 | 1 | tk3-heyday 1, modern 1 | N |
| `stability.editor-crash` | 2 | 0 | 1 | 1 | 1 | tk3-heyday 1, modern 1 | N |
| `stability.non-windows` | 2 | 0 | 2 | 0 | 2 | modern 2 | N |
| `competitor.rpgmaker` | 1 | 1 | 0 | 0 | 1 | other-engine 1 | N |
| `assets.import-painful` | 1 | 0 | 1 | 0 | 1 | tk3-heyday 1 | N |
| `assets.limits` | 1 | 0 | 1 | 0 | 0 | modern 1 | N |
| `assets.tileset-workflow` | 1 | 0 | 1 | 0 | 0 | modern 1 | N |
| `audio.control-gap` | 1 | 0 | 1 | 0 | 0 | modern 1 | N |
| `audio.midi-reverb` | 1 | 0 | 1 | 0 | 0 | modern 1 | N |
| `community.platform` | 1 | 0 | 1 | 0 | 1 | n/a 1 | G |
| `community.review-culture` | 1 | 0 | 1 | 0 | 1 | tk3-heyday 1 | N |
| `community.safety` | 1 | 0 | 1 | 0 | 1 | tk3-heyday 1 | N |
| `competitor.other` | 1 | 0 | 1 | 0 | 1 | other-engine 1 | N |
| `competitor.unity` | 1 | 0 | 1 | 0 | 1 | other-engine 1 | N |

### Reasons people gave for leaving or never using the Toolkit

| Issue | People | Blocker | Friction | Who |
|---|---|---|---|---|
| `stability.modern-os` | 3 | 3 | 0 | cultmunism, datomas, grindalfgames |
| `competitor.rpgmaker` | 1 | 1 | 0 | enn44 |
| `scripting.rpgcode-limits` | 1 | 1 | 0 | borcthefirst |
| `stability.runtime-slow` | 1 | 1 | 0 | johnstein |
| `competitor.other` | 1 | 0 | 1 | zerzic. |
| `competitor.unity` | 1 | 0 | 1 | harry3227a |
| `other.feels-dated` | 1 | 0 | 1 | datomas |
| `other.outgrown-tools` | 1 | 0 | 1 | cuthalionxvi |
| `plugins.rot` | 1 | 0 | 1 | johnstein |
| `revival.skeptic` | 1 | 0 | 1 | chaihaveaproblem |

### Pain people reported about OTHER tools (competitive intelligence, firsthand)

| Issue | People | Who |
|---|---|---|
| `competitor.rpgmaker` | 2 | _thomasdillon, seafroggys |
| `assets.art-burden` | 1 | datomas |
| `community.finish-rate` | 1 | brndn69 |
| `plugins.ecosystem` | 1 | _thomasdillon |
| `stability.runtime-slow` | 1 | _thomasdillon |

### Praise, by distinct people

| Issue | People | Strong | excl. top speaker | Chan |
|---|---|---|---|---|
| `community.magic` | 13 | 6 | 12 | N |
| `onramp.career-forge` | 13 | 10 | 12 | G/N |
| `scripting.rpgcode-approachable` | 3 | 0 | 2 | N |
| `ai.assisted-dev` | 2 | 1 | 2 | G |
| `editor.workflow` | 2 | 2 | 2 | N |
| `onramp.easy-start` | 2 | 1 | 1 | N |
| `plugins.ecosystem` | 2 | 0 | 2 | G/N |
| `assets.gif-support` | 1 | 1 | 0 | N |
| `community.finish-rate` | 1 | 0 | 1 | N |
| `editor.ui-layout` | 1 | 0 | 1 | N |
| `editor.vector-system` | 1 | 0 | 0 | N |
| `other.affection-despite-flaws` | 1 | 1 | 0 | N |
| `other.personal-impact` | 1 | 1 | 1 | N |
| `stability.modern-os` | 1 | 0 | 1 | N |

### Requests, by distinct people

| Issue | People | Who |
|---|---|---|
| `revival.successor-want` | 3 | grindalfgames, schererja, unit0805 |
| `distribution.store-path` | 2 | arskeliss, grindalfgames |
| `revival.godot-addon` | 2 | cuthalionxvi, johnstein |
| `ai.assisted-dev` | 1 | zerzic. |
| `community.sites-lost` | 1 | .several |
| `preservation.collection` | 1 | faves |
| `preservation.version-hunt` | 1 | nihilisticnerd |

### Opinions about other tools and platforms, by distinct people

| Topic | People | Chan |
|---|---|---|
| `community.platform` | 8 | G/N |
| `competitor.rpgmaker` | 8 | G/N |
| `competitor.unity` | 8 | N |
| `competitor.godot` | 7 | G/N |
| `revival.skeptic` | 6 | N |
| `community.finish-rate` | 3 | N |
| `competitor.other` | 3 | G/N |
| `ai.assisted-dev` | 2 | G |
| `revival.successor-want` | 2 | N |
| `community.magic` | 1 | N |
| `community.sites-lost` | 1 | N |
| `revival.godot-addon` | 1 | N |
| `revival.rpgwizard-view` | 1 | N |

### Where in the making lifecycle the pain falls (unique person-issue pairs, firsthand)

| Subsystem | onboarding | building | finishing | replaying | community | n/a | total |
|---|---|---|---|---|---|---|---|
| stability | 0 | 6 | 2 | 11 | 0 | 0 | 19 |
| community | 0 | 3 | 1 | 1 | 10 | 1 | 16 |
| preservation | 0 | 0 | 0 | 10 | 0 | 0 | 10 |
| scripting | 0 | 9 | 0 | 0 | 0 | 0 | 9 |
| plugins | 0 | 2 | 0 | 5 | 0 | 0 | 7 |
| other | 1 | 1 | 0 | 1 | 1 | 1 | 5 |
| assets | 0 | 5 | 0 | 0 | 0 | 0 | 5 |
| menu-ui | 0 | 2 | 3 | 0 | 0 | 0 | 5 |
| battle | 1 | 0 | 3 | 0 | 0 | 0 | 4 |
| distribution | 0 | 0 | 3 | 0 | 0 | 1 | 4 |
| display | 0 | 0 | 1 | 2 | 0 | 0 | 3 |
| competitor | 1 | 1 | 0 | 0 | 0 | 1 | 3 |
| docs | 1 | 1 | 0 | 0 | 0 | 0 | 2 |
| audio | 0 | 2 | 0 | 0 | 0 | 0 | 2 |
| editor | 0 | 1 | 0 | 0 | 0 | 0 | 1 |
| revival | 0 | 0 | 0 | 0 | 0 | 1 | 1 |
| **all** | 4 | 33 | 13 | 30 | 11 | 5 | 96 |

### Which experience the pain comes from (unique person-issue pairs, firsthand)

modern: 50 · tk3-heyday: 30 · n/a: 6 · tk2: 4 · other-engine: 3 · tk4: 2 · rpgwizard: 1

## 3. Reading the tables

1. **The most widely reported problem is that the old software no longer runs reliably on current computers.** Ten people report it (`stability.modern-os`, three of them as a blocker), plus four on plugins that no longer load, two who cannot run it off Windows, two on fullscreen/windowed problems. Of 96 person-issue pairs about the Toolkit, **50 describe running a 20-year-old program today**; 30 describe the 2000s experience. It is also the most-cited reason for leaving (three people, one of them on hearsay). Counting people rather than issues, **14 of the 61 named people** report some form of "the old software no longer works" (modern Windows, plugins, non-Windows, fullscreen). A browser runtime removes this whole class of pain by construction.
2. **Loss is the second theme.** Seven people lament lost sites, seven lost games or work, three describe hunting for old versions or files. Fifteen people report some form of loss, and all ten preservation pairs fall in the "replaying old games" phase. This supports the brief's claim that the games are disappearing.
3. **Design-level pain is real but reported by fewer people than earlier analysis implied.** RPGCode and runtime limits: six people. Performance ceilings: five. Missing menu and HUD tooling: three. Default battle system broken or unusable: two (one of whom writes elsewhere that he never used the stock systems). Custom battle effort: two. Several of these are 2000s experiences, so they are not only decay. In total **nine people** report design-level pain (language and runtime limits, performance, menus, battle, asset limits, audio gaps, export), against 14 for decay and 15 for loss. The battle, menu and shipping trio specifically is **four people** (chaihaveaproblem, cuthalionxvi, grindalfgames, johnstein). **This corpus cannot rank battle against menus against assets;** the numbers are too small and rest heavily on one 2022 builder (the "excl. top speaker" column shows which counts depend on him).
4. **Why people left.** Ten people gave a reason (fourteen rows). Six point to tools they found more complete or capable (RPG Maker, GameMaker, Unity, "a more capable engine", Java, "more uh complete tools"). Three cite reliability on modern Windows (one on hearsay). Two cite performance or language limits. One says it "just seems super dated." Reasons overlap: some people gave more than one.
5. **What people loved is mostly the people and what it did for them, not specific features.** Community or "magic": 13 people. "It shaped my path": 13 people, and at least seven named people tie it directly to learning to program or working as a developer. Explicit praise for RPGCode itself comes from three people, while six describe its limits: it was an approachable on-ramp *and* a limiting runtime. GIF-as-animation and the vector depth system were each praised by one person.
6. **Community platform.** Of eight people with a stated preference, five lean towards forums or long-form discussion and three are positive about Discord; seafroggys argues both sides at different times. Separately, seven people lament lost sites. In June 2026 a long-time member described the server as "not a high-traffic server" and said its admin, Euix, is "not very active".
7. **Competitors.** RPG Maker drew opinions from eight people; the two who used it recently report friction (documentation and community, visual effects performance, limitations). Godot drew opinions from seven people; in #general it is the default recommendation (.several, grindalfgames and cuthalionxvi recommend or use it). Unity opinions are from #nostalgia only.
8. **AI-assisted authoring** comes up for five people. Two report using it for game development (_thomasdillon for RPG Maker plugins that a paid contractor struggled with; unit0805 for GameMaker help), two give opinions on AI-generated game content, and zerzic. wonders whether AI could make classic Toolkit games run smoothly. One says AI assistants "know almost nothing about TK". Five people is a signal to watch, not a finding.
9. **Requests are few.** A successor: three people. A Godot add-on: two. A path to Steam: two.

## 4. What this does and does not say about positioning

| Question | What the evidence supports | Confidence |
|---|---|---|
| Is getting the legacy games running worth doing first? | Yes. Reliability on modern machines is the top pain and top departure reason; loss of games and sites is the second theme. | Moderate to high: many people, consistent |
| Is "an approachable way in" the core of what people loved? | Yes, as an on-ramp: 13 say it shaped their path, at least seven to programming. But only three praise RPGCode itself and six describe its limits. | Moderate |
| Are battle, menus and export the "finishing" gaps to build the product around? | Plausible, thinly evidenced here: battle, menus and shipping together are four people (battle 3, menus 3, shipping 3, overlapping). One #general anecdote: publishers rejected a demo for lacking battle and menu systems (an RPG Maker project). | Low to moderate: validate before ranking |
| Does a long-form community home matter? | Supported: lost sites, a forum-leaning majority among those with an opinion, a quiet Discord. | Moderate |
| Is "a free RPG Maker" the right bar? | One member said it; two recent RPG Maker users criticise it; two members describe the Toolkit as a step up *because of RPGCode*. Mixed. | Low |
| Does commercial shipping matter? | Few people; one sold 20 copies and made $200. | Low |
| Which persona is the main market? | **Not measurable here.** Only 20 people state anything about themselves. | None |

## 5. Limits

- **Survivor bias.** The chat is people who stayed in touch for years. People who tried the Toolkit and quietly left, the likely majority, are absent. Nothing here measures attrition.
- **Small numbers, few voices.** 61 named people; one wrote 22% of the rows. Read the counts as ranks with wide error bars.
- **Judgement in the coding.** Six model coders under the same rules, then one review pass; fact and opinion rows were only sampled. Errors remain possible.
- **Era confound.** More than half the pain is about running old binaries now. Do not read it as the reason people left in the 2000s.
- **#general is truncated.** The export holds only the latest 5,000 messages (2025-01-06 to 2026-10-11). 2019 to early 2025 is missing.
- **The project owner posted in #general on 2026-10-10** (the last messages in the export). Their own messages are kept for context and are never coded as evidence.

## 6. What would raise confidence

A short survey or interviews with former users, including people who left early (the corpus cannot find them); the remaining #general history exported in date ranges under 5,000 rows each; and a re-run of this pipeline on any new export (`tools/` in the archive; the ledger is append-only).

## 7. Re-running

```
tools/parse-discord-export.py EXPORT.(html|csv) OUT.jsonl --channel NAME
tools/filter-relevant.py OUT.jsonl FILTERED.jsonl      # general-style channels only
tools/curate-relevant.py FILTERED.jsonl data/CURATION.json data/CHANNEL-messages.jsonl
# code new rows against data/ledger-vocab.json, then:
tools/verify-ledger.py data/evidence-ledger.jsonl       # must report 0 errors
tools/aggregate-ledger.py data/evidence-ledger.jsonl --json data/holographic-model.json --md TABLES.md
```
