# What the `#general` chat says: RPG Toolkit community, 2025–2026

**Source:** 247 curated messages from 23 accounts, covering 2025-01-06 to 2026-10-11 (the most recent 5,000 messages of the channel; the earlier history is missing because of the export tool's row cap). Verbatim transcript: `discord-general-related-2025-2026.md`. Quantified claims cite rows in `data/evidence-ledger.jsonl`.

---

## 1. Executive summary

In 2025 and 2026, `#general` is not a place where people make Toolkit games; it is where former Toolkit members discuss what they are making *now*. The predominant modern engine among them is Godot, with RPG Maker treated as an accessible but frustrating alternative whose limitations remind people of the Toolkit. The dominant new theme is **AI-assisted authoring**: members report using large language models to write engine plugins that human contractors struggled with, while noting that existing models know almost nothing about the Toolkit itself.

---

## 2. Participants and key voices

The 23 accounts in the curated chat are former Toolkit members, many active under new handles. The most frequent contributors to game-making discussion:

| Handle | Known context | What they talk about in this period | Stance / tone |
|---|---|---|---|
| **_thomasdillon** | Calacruf, monochrome; artist on 2000s TK projects | Building a full commercial game (*The Secret of Luin*) in RPG Maker; uses ChatGPT for plugins; pitches to publishers | Driven, candid about tool regrets ("I regret choosing it for The Secret of Luin and wouldn't recommend it for any serious project") |
| **seafroggys** | Long-time community historian | Releases a musical; reflects on old community sites; comments on Godot and RPG Maker MV | The server's institutional memory |
| **.several** | Boxy / fantomdeath from the '10 Expo | Runs Godot mob-programming streams; shares game-jam news; acts as programmer on Dillon's game | Community-builder, Godot advocate |
| **toolkitz** | Community archivist; identified in chat as TKGB | Reports selling 20 copies on Steam ($200); shares scope-creep pain; hunts for his 2002 Hotmail to recover his first TK game | Wry, persistent preservationist; dislikes Discord |
| **cuthalionxvi** | Metalfroggys; worked on TK4 | Building a tactical RPG in Godot; advises on portfolio sites; observes server activity | Measured engineering voice |
| **aikoikari** | "Zappy" from the early 2000s | Returns after a decade; made an XNA engine in college; now a web developer | Warm reunion energy |
| **turplepony** | Did not use forums as a kid | Building an MMORPG (*Ninjora*); credits the Toolkit and William's multiplayer plugin with starting their path | Grateful on-ramp story |
| **unit0805** | Former member | Experiments with Wolf RPG; calls for a "99% modular" Toolkit rebuild; uses AI for GameMaker 6.1 | Curious tinkerer |
| **grindalfgames** | Prolific TK game maker | Confirms holding 169 TK games; recommends Godot to newcomers | Pragmatic shipper |
| **zerzic.** | Active in #general | Porting portfolios; asks whether AI could help classic TK games run smoothly; clashes over politics | Mixed |
| **feer04229** | Newcomer working on an MMORPG | Asks how the Toolkit's IDE connects to code and scenes | Beginner seeking structure |
| **spyder_ms** | Former Mystic Software host | Offers old email archives to help recover lost games | Elder archivist |

*Project owner note:* `jensenchappell` / `jensen_69111` (John@AlJo) posted on 2026-10-10 describing work on an agnostic TK3-compatible runtime [G261010-114558]. These messages are preserved in the transcript for context and are excluded from the evidence ledger.

---

## 3. High-level trends and recurring themes

### 3.1 Modern engine choices
- **Godot is the default recommendation.** Three members recommend or use it (.several, grindalfgames, cuthalionxvi) [G250528-115643, G250528-115747, G251018-193513].
- **RPG Maker is a cautionary tale.** Members describe running into limitations quickly (seafroggys on MV: "it was cool but I quickly ran into limitations" [G250528-153640]) and finding community/docs lacking compared to general engines (_thomasdillon: "getting seemingly simple things done turns into exhausting ordeals" [G250528-153634]).
- **The Toolkit is remembered as more flexible than RPG Maker.** Seafroggys: "Toolkit was considered a stepup above RPGMaker because of RPGCOde … it could do a lot more custom things....even if the engine was jankier and less smooth" [G250528-165628, G250528-165645].

### 3.2 AI-assisted development
- One developer reports using ChatGPT to write RPG Maker plugins that human contractors could not deliver: "ChatGPT is capable of coding plugins for my game that require a decent level of abstract thought … shit just works out of the box" [G260212-110437, G260212-110502].
- The same developer notes that AI struggles with coordinate layouts (menus and UI must still be mapped by hand) [G260212-112454].
- A shared limitation: "ChatGPT and Claude know almost nothing about TK" (_thomasdillon [G260701-192845]).

### 3.3 Commercial reality and finish-line scope
- Commercial sales among former members are modest: toolkitz reports "I sold 20 copies of my game on Steam and made $200" [G260207-223652]; cuthalionxvi jokes about going back to "my game that will sell 10 copies" [G260227-212648].
- Publishers evaluate demos on core systems: _thomasdillon reports that Chucklefish rejected an early demo because "I only had the animal village playable w no battle or menu systems" [G250206-041608].
- Scope creep is an explicit obstacle: toolkitz writes "I keep failing to go through with it because of scope creep" [G260102-205649].

### 3.4 Preservation and community continuity
- The community's history is remembered through its sites: seafroggys recounts the lineage from cbm's rpgtoolkit.com to Vampz's Toolkitzone and back [G250927-012417].
- Members mourn the loss of long-form forums: "nothing has replaced forums. Forums are still king" (seafroggys [G250911-193525]); "id kill for another site like toolkit. I loved creeping screenshots and the forum" (.several [G250911-192314]).
- Active rescue continues: toolkitz recovers old files from USB sticks and tries to regain access to a 2002 Hotmail account to retrieve their first game [G251003-091425, G260711-175202].

---

## 4. Praise: what made it special

- **Career on-ramp:** turplepony attributes their career to the Toolkit: "my love for game making began at rpgtoolkit when I was a little kid … I would not have been able to ever do this if I wasn't that little kid who stumbled upon rpg toolkit" [G250927-010816, G251002-142417].
- **The multiplayer plugin as an eye-opener:** William's 2000s multiplayer plugin is credited by two members with sparking their interest in online games, leading one to MirageSource and a commercial ORPG (*Key2Heaven*) [G250927-011734, G250929-212631].
- **Scripting power:** seafroggys's observation that RPGCode made the Toolkit more capable than RPG Maker despite the engine's jank [G250528-165628, G250528-165645].

---

## 5. Pain points and friction (what modern tools struggle with)

- **RPG Maker limitations:** lack of community documentation, visual effects performance bottlenecks (Dillon calls the web-wrapper architecture "jittery and glitchy" under VFX [G250528-153839]), and difficulty doing simple things compared to Godot [G250528-164846].
- **Discord fatigue:** multiple members express dissatisfaction with Discord for project development: "I dislike this discord format, and discord itself actually" (toolkitz [G251002-142003]); "I like forums better" (turplepony [G251002-142301]).
- **Demo requirements for publishers:** games cannot secure interest without working battle and menu systems [G250206-041608].

---

## 6. Vision and future opportunities

1. **A modular engine architecture:** unit0805 explicitly calls for "a rebuild of the toolkit to be 99% modular, uhh, editable y'know whut I mean, so jank like tactical battle engine can be developed easily enough" [G250528-195110].
2. **AI-ready documentation:** because LLMs know almost nothing about the Toolkit, machine-readable documentation (type definitions, function references, schema specs) would enable modern AI assistants to write RPGCode and plugins cleanly.
3. **The space between RPG Maker and Godot:** members describe RPG Maker as too restrictive and Godot as requiring more boilerplate for simple RPG tasks. An engine that offers the approachable scripting of the Toolkit with modern multiplatform export addresses that exact middle.
4. **Long-form community features:** the recurring desire for screenshot devlogs and bumped forum threads suggests that the revival's community platform should not be Discord-only.

---

## 7. Notable quotes

1. **_thomasdillon on RPG Maker vs. expectations [G250528-153534–153634]:**
   > "RPG Maker is very versatile but I regret choosing it for The Secret of Luin and wouldn't recommend it for any serious project. … Just lacks the kind of community and documentation that other engines have, to the point that getting seemingly simple things done turns into exhausting ordeals"

2. **seafroggys on the Toolkit's historical advantage [G250528-165628, G250528-165645]:**
   > "Toolkit was considered a stepup above RPGMaker because of RPGCOde … it could do a lot more custom things....even if the engine was jankier and less smooth"

3. **seafroggys on community platforms [G250911-193525]:**
   > "nothing has replaced forums. Forums are still king"

4. **.several on project discovery [G250911-192314]:**
   > "id kill for another site like toolkit. I loved creeping screenshots and the forum."

5. **toolkitz on commercial reality [G260207-223652]:**
   > "I sold 20 copies of my game on Steam and made $200."

6. **turplepony on the Toolkit's impact [G250927-010816]:**
   > "my love for game making began at rpgtoolkit when I was a little kid. now I'm making an MMORPG 🥲"
