# Extension adoption: corpus re-check for I-13 and I-14

Research date: 2026-10-20. Status: exploratory, not validated personas or requirements. This is a bounded follow-up to the [research pilot](../../../../docs/editor-research-pilot.md), applying its method (independent situations, advice is not adoption, no population claims) to two intents: **I-13** (make an acquired system work here) and **I-14** (configure and extend the game from code, owner-reported). It is not part of the pilot's seven-record sample.

**Anonymity.** Records are cited by internal pseudonymous ID only; no handles, titles, links or quotes are reproduced. The corpus retains handles, so the IDs are traceability aids, not anonymity, and must not be published with a resolver. Dates are years. Descriptions are paraphrases.

**Sampling.** Two scouts searched forum threads, files, games, docs and code records, with a cap of 14 candidates inspected and 6 included per intent. Searches were varied but not exhaustive; absence of a pattern here is not evidence of absence. One record (12372) was then read in full by the main session. Snippet-only hits are leads, not evidence.

## Evidence cards

Labels follow the pilot: **O** observed, **I** inferred, **H** hypothesis.

| ID | Year / era | Situation (O) | Support for | Limits |
|---|---|---|---|---|
| CORPUS-FORUM-7190 | 2004, TK2 era | Acquired a third-party battle system and a menu system; cannot invoke or configure them. Replier asks what the systems are. | I-13 | No resolution. Cause among install, configuration, invocation and documentation is unknown. |
| CORPUS-FORUM-12372 | 2004, TK2 era | Installed a third-party battle system; reports a missing shared-library dependency and an unusable support site. Replies split: the system is buggy, build your own; the system's author says it is old, written for TK2 and best used as a reference. The asker then says they are new and not proficient at coding. | I-13; weaker, I-14 entry | Resolution unknown. The asker's own wording suggests the dependency is findable, but no fix is reported. |
| CORPUS-FORUM-19357 | 2002, TK2 | Downloaded a plugin SDK and cannot start. Advice names a compiler and a language the creator must learn. | I-14 barrier; also I-13 failure | Advice only. No outcome. |
| CORPUS-FORUM-1435 | 2001, TK2 | Built a custom battle system; experience points accumulate but level-up logic never runs. Asks for a command. A reply says a community plugin already offers it. | I-14 command-discovery gap | Undocumented; adoption unknown. The ask is for a command, not a build path. |
| CORPUS-FORUM-4746 | 2004, TK2 era | Wanted to change the editor and how scripts are parsed through a C++ plugin. Replies say the editor is built in another language and the plugin route does not reach it. | I-14 engine boundary | No success reported. |
| CORPUS-FORUM-4812 | 2004, TK2 to TK3 | A TK2-era save system failed under TK3; the plugin failed; built-in file commands were undocumented; the creator reports output lagging runtime. A replier added file I/O and a command text. | I-14 discovery and slow-loop; also I-13 | Only record mentioning loop speed. Creator still blocked. Mixed consumer and author signals. |
| CORPUS-FORUM-4486 | 2004, TK2 era | Wanted compound conditions in one conditional. A replier points to a plugin that returns 0 or 1 and advises reading its readme. | Plugin as a workaround | Asker is a script user, not an author. Adoption unknown. Weak for I-14. |
| CORPUS-GAME-1966 | 2007 profile | A lead developer built an online game around an external server and a C++ network plugin. Status in development. | I-14 trace | No outcome or loop evidence. Author independence unresolved. |

## Independence

- **I-13:** 7190 and 12372 have different thread starters and different years' threads; both concern third-party battle systems. This clears the pilot's two-independent-situations bar **narrowly**. The starter of 7190 is a guest, so identity overlap cannot be fully excluded. Reads as one historical pattern (a consumer cannot run an acquired battle system), not breadth across system types.
- **I-14:** 19357, 1435, 4746 and 4812 have distinct thread starters. 4486 is a script user. The game profile's author was not captured. Only four situations are authors or would-be authors; each blocker differs (SDK entry, command gap, engine boundary, documentation and loop speed). No two share a materially similar obstacle, so **no I-14 pattern clears the pilot's threshold.**

## Contradictions and negative cases

- Several creators used or wanted plugins without writing code (a plugin installed from instructions with no code; a wish for someone else to build a battle system; a statement that the default system would be fine if it worked). These are not extenders.
- A routing pattern recurs in replies: acquire a shared system, read or edit it, or build your own. That is advice, not adoption, and it blurs the consumer and author roles.
- No creator who was fluent in code and needed nothing beyond stock behaviour was found within the cap. This is a search gap, not a finding.
- Advice to build your own may reflect a poor-quality or outdated acquired system (the 12372 author says so) as much as a creator wish to extend.

## What the evidence supports

| Question | Reading |
|---|---|
| Are I-13 and I-14 roughly the same scenario? | **Distinct situations on a shared substrate.** I-13 is a consumer who cannot run something acquired. I-14 is a producer or would-be producer who hits SDK, command or boundary limits. No full record shows a consumer who then extends, or a producer who failed to acquire. |
| Do they ever blur? | Yes at the entry. 19357 and 4812 are would-be extenders who also failed as consumers, and 12372's replies steer a consumer toward authoring. Whether this is one adoption path is **H**, not established. |
| Does I-13 have a recurrence? | **Narrowly yes** for acquired battle systems (7190, 12372), 2004 only, resolutions unknown. |
| Does I-14 have corpus support? | **Fragments only.** Plausible barriers and engine limits exist; none recurs, and the owner's fast, code-first loop is supported by one weak mention. It remains an **owner-reported hypothesis** with some corroborating situations. |
| Is I-14 a working mode of I-13? | Not shown. The study question stays open. |

## Open questions

- Do I-13 consumers ever start authoring, and what causes it? Follow threads, game profiles and later posts only within the pilot's identity rules.
- Is the version gap (a TK2-era system under a later engine) the blocker, not general integration skill? 12372 and 4812 both hint at it.
- Do code-fluent authors report a slow test loop or poor command discovery in contexts the search did not reach (docs, code records, later boards)?
- Are there extender-first creators whose first act was building, not acquiring?

## Lead records not counted

Snippet-only or over-cap leads: 12302 (plugin call failed in an FTP plugin), 22766 (plugin problem fixed, mechanism unrecorded), 10208 (advice on copying a plugin file), 3989 and 11107 (producer-side shares), 10210 (wish for a plugin editor with replies saying it is not hard), 2057 (stock battle system cannot be entered). They are lines for a future bounded pass, not evidence.
