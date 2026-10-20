# Editor research pilot: creator intent

Research date: 2026-10-20. Status: exploratory pilot, not validated personas or implementation requirements. This companion evaluates [the initial experience bank](editor-experience-bank.md), not the representativeness of the historical community. No implementation code or legacy source is used.

## Method, fixed before synthesis

### Research questions and decision rules

1. **Intent evidence:** a creator's stated desired change, attempted action, or reported outcome, situated in a project. Preserve the distinction between what someone asked for, tried, and achieved. Advice from a respondent is evidence of advice, not of the creator adopting it.
2. **Intent versus feature request:** record the requested mechanism separately from the desired result. “Add a layout tool” is a mechanism; “help players understand where to go” is an intent only if the source actually supports it. If the reason is absent, mark intent inferred and ask rather than inventing it.
3. **Friction versus documentation:** friction is an observed obstacle; documentation is one possible cause. Code causes separately as unknown, discoverability, explanation, integration, capability, reliability, or creative uncertainty. Not finding instructions does not prove none existed; a request for help does not prove the editor lacked a feature.
4. **Preference versus pattern:** one contribution supports a situated observation. A recurring candidate needs at least two independent creator situations with a materially similar goal or obstacle. Multiple replies, reposts, or captures do not multiply creators. Independence is checked privately within the selected records; unresolved identity overlap reduces confidence. This operational threshold is a pilot convention, not statistical validation.
5. **Contradictions:** attach disconfirming evidence to the same claim, describing its context. Distinguish actual source disagreement, variation in goals, and merely untested design tensions. Never resolve a contradiction by majority vote.
6. **Persona threshold:** a provisional composite needs at least two independent situations supporting a coherent goal/constraint relationship. Do not merge people merely because they asked for help. Interaction preferences, trust conditions, and failure signals unsupported by those sources are explicitly design hypotheses. Names are invented labels, not historical identities or personality diagnoses.
7. **Intent hypothesis instead:** retain a thinly supported, heterogeneous, single-source, or modern-only claim as an intent hypothesis. Do not create a named persona just to fill a taxonomy. One creator may move between situation-based composites.
8. **Anonymity:** omit names, handles, email, age, location, exact titles, personal links, screenshots, searchable quotes, and distinctive combinations of biography/project details. Generalize dates to year and mechanics where specificity is unnecessary. Source IDs are internal pseudonymous traceability, not a guarantee against re-identification by someone with archive access. Never publish a raw source link as an anonymous evidence card.
9. **Acceptance promotion:** a historical item can motivate a candidate scenario, not automatically a product requirement. Promote after corroborated intent, an explicit product decision, observable starting state/action/outcome, a failure/recovery branch, and review with current creators. Strategic safety requirements may be adopted independently, but must cite product policy rather than claim corpus validation. Automated checks prove state/behavior, not creator satisfaction.
10. **Real-creator validation:** current vocabulary, accessibility, interaction preference, AI consent/autonomy, perceived ownership, comprehension, success criteria, priorities, and willingness to continue need interviews or observed authoring sessions. Synthetic persona runs rehearse hypotheses and test mechanics; they provide no new human evidence.

### Evidence coding schema

Every card records: source ID; context/version; anonymous situation; observation; underlying intent; friction/blocker; workaround; desired outcome; contradictory evidence; confidence; observation versus inference; candidate cluster; open questions. A missing field is explicitly “not reported,” not assumed absent.

Labels: **O** = directly observed statement or reported behavior (not externally verified behavior); **I** = interpretation/inference; **H** = untested hypothesis; **S** = strategic addition from the modern product brief. Confidence has two axes: fidelity to the historical text and transfer to current creators. High textual confidence never implies high modern relevance. Priority is a research/design choice, not a frequency estimate.

### Sampling and repeatability

Use a purposive pilot: recheck the five existing bank sources for story, visual/layout direction, unusual mechanics, custom integration, and redirection; add two success/sharing records to counter the support-forum failure bias. Stop at seven included records; do not mine the whole archive. Added-record discovery may inspect at most eight candidate records. Record exclusions and gaps. This seed sample is anchored to the earlier bank and is therefore not independent corroboration of it.

The unit of analysis is a situated creator contribution plus the replies needed to interpret it, not a whole thread counted as one opinion. Inspect source frontmatter for completeness, dates, duplicates, and capture provenance. Treat absent resolution as unknown. Deduplicate captures and quoted posts; never infer population prevalence from search hits. Do not search personal profiles or reconstruct identities across platforms.

Source resolution is intentionally internal: under the archive's `tk-corpus/forums/`, resolve `CORPUS-FORUM-N` using `**/*tN.md`; use the cited post ordinal or native post number within that record. Game records use their kind/site/native-ID envelope; the pilot supplies an unambiguous resolver if needed. Public cards link only to the anonymous evidence sections below. A restricted archive reader can follow each record's `source_captures` to capture hashes and originals. That resolver reveals contributors and must not be embedded in a public persona or shared with participants. No separate identity ledger is created.

For repetition: freeze the selected files' hashes; resolve each ID uniquely; read the referenced prose and adjacent replies; independently fill O fields before I/H/S fields; compare differences at claim level; retain disagreements; then reconsider clusters. Do not read legacy code or execute downloaded games. A second extraction is quality control, not a new independent human observation.

The public corpus removes some PII but deliberately retains handles (archive `tk-corpus/SCHEMA.md`, Redaction). Therefore its publication status is not sufficient anonymity for this study.

## A. Pilot evidence

Seven records included: five seed threads and two added game profiles. The five thread starters are distinct within the sampled metadata; the two game profiles have different author metadata. This establishes local source independence, not verified real-world identity. Forum records are dated 2004 and marked complete with no declared gaps; that means captured-thread completeness, not resolved requests. Game-record completeness is unknown. None of the seven establishes independently verified player success.

| Internal source ID | Anonymous observation | Pattern supported / limit | Evidence card |
|---|---|---|---|
| CORPUS-FORUM-8178 | Requests narrative help; a respondent describes difficulty turning writing into a game | Creative collaboration; **not a Toolkit project**, not proof of a strong existing premise | [8178](#e8178) |
| CORPUS-FORUM-7751 | Wants guidance improving a website's presentation | Adjacent-domain visual help; **not game-layout evidence** | [7751](#e7751) |
| CORPUS-FORUM-7190 | Has acquired custom systems but cannot use them | Acquisition is not successful integration | [7190](#e7190) |
| CORPUS-FORUM-7118 | Asks how to construct minigames; another participant reports making them | Different capability levels coexist; advice is not demonstrated learning | [7118](#e7118) |
| CORPUS-FORUM-7148 | Plans to change direction while retaining useful existing work | Restart can mean selective revision, not total replacement | [7148](#e7148) |
| CORPUS-GAME-735 | Presents a small completed project and invites participation | Small work can be a finished outcome, not merely a prototype | [735](#e735) |
| CORPUS-GAME-764 | Presents a full game with manual installation instructions | Creation completion and distribution usability are separate | [764](#e764) |

### E8178

- **Context/version:** 2004; version unknown; requester explicitly excludes Toolkit. Source: first post, lines 34–39; respondent, lines 41–43.
- **Situation / O:** creator seeks someone to supply a plot and title; respondent reports being able to write plots but struggling to make games from them.
- **Intent / desired outcome:** obtain a narrative contribution suitable for a game. A story-to-playable gap is separately reported by the respondent, not the requester.
- **Friction:** missing creative contribution for requester; reported execution gap for respondent. Causes unknown.
- **Workaround:** respondent offers writing help and a sample; acceptance or use not reported.
- **Contradiction:** this does not establish an idea-rich Toolkit beginner or a preference for AI. Creative assistance and technical assistance are distinct.
- **Confidence:** high textual fidelity; low modern transfer. **O:** requests and self-report. **I:** collaboration may bridge complementary skills.
- **Cluster:** narrative collaboration; story-to-playable hypothesis.
- **Open questions:** did either contribution become a game? Would the requester prefer human collaboration, a prompt, an example, or AI? External sample uninspected; outcome unknown.

### E7751

- **Context/version:** 2004, web-design context; engine version not applicable. Source: first two posts, lines 31–40.
- **Situation / O:** creator wants tutorials for improving an existing website's graphical presentation; another offers help and examples.
- **Intent / desired outcome:** improve website appearance.
- **Friction:** uncertain how to achieve a visual result; documentation availability and editor limitations are not established.
- **Workaround:** offered peer help; no reported adoption.
- **Contradiction:** transferring this to game-scene composition changes the domain and is inference, not observation.
- **Confidence:** high textual fidelity; very low direct editor transfer. **O:** website request. **I:** examples may assist visual decision-making across domains.
- **Cluster:** adjacent-domain visual direction; excluded from game-persona support.
- **Open questions:** does this behavior occur during game composition? Was the website changed? Off-thread help is unavailable.

### E7190

- **Context/version:** 2004, Toolkit community; precise version unknown. Source: initial request and clarification, lines 36–59.
- **Situation / O:** creator has downloaded custom systems but cannot determine how to use them.
- **Intent / desired outcome:** make an acquired system work in a project.
- **Friction:** integration knowledge gap observed; installation, configuration, invocation, compatibility, and missing documentation remain competing explanations.
- **Workaround:** respondent requests system identification; creator supplies it. No functioning configuration reported. Repeated clarification is not another observation.
- **Contradiction:** finding/downloading the capability did not make it usable. Does not prove a defective system or absent documentation.
- **Confidence:** high textual fidelity; low modern transfer. **O:** acquired but unusable-to-creator. **I:** contextual integration guidance may help.
- **Cluster:** capability-to-working-interaction.
- **Open questions:** what exact step blocked progress, what instructions were available, and what resolved it? External resources uninspected.

### E7118

- **Context/version:** 2004; precise version unknown. Source: request and advice, lines 35–44; implementation self-report, line 60; further discussion, lines 77–94.
- **Situation / O:** starter asks how to make a minigame; a different contributor reports existing implementations. Replies suggest scripts and examples.
- **Intent / desired outcome:** starter wants a construction path for a playable interaction.
- **Friction:** no concrete starting model is demonstrated; neither inability to program nor a missing engine capability is established.
- **Workaround:** example-based/script-based advice, not reported successful use by the starter. Requested code is not supplied in the captured discussion.
- **Contradiction:** novice demand coexists with reported successful creation; a finished example is not automatically transferable instruction.
- **Confidence:** high for the request; medium for actual implementation success (self-report only); low modern transfer. **O:** request, advice, success claim. **I:** bounded examples may bridge intention and construction.
- **Cluster:** capability-to-working-interaction.
- **Open questions:** did the starter try anything? Would a worked example, structured authoring, code, or conversation be preferred? No resolution demonstrated.

### E7148

- **Context/version:** 2004; a future TK3 release is mentioned, but current engine and precise version are unknown. Source: redirection, lines 49–52; progress and preservation, lines 178–201.
- **Situation / O:** creator plans a visual change after limited scene work and intends to retain other useful materials.
- **Intent / desired outcome:** bring an unfinished project into a preferred direction without discarding all prior work.
- **Friction:** dissatisfaction and inactivity reported; no editor failure or lost-work incident demonstrated.
- **Workaround:** selective retention is a plan, not an observed completed migration.
- **Contradiction:** “restart” does not mean deletion; the desired change is selective.
- **Confidence:** high textual fidelity; low modern transfer. **O:** plan and self-reported state. **I:** previews and reversible changes could support it.
- **Cluster:** selective redirection, currently one source.
- **Open questions:** what was retained successfully? Was the project resumed? Compatibility and migration difficulty remain unknown.

### E735

- **Context/version:** profile captured in 2005; Toolkit 2.x. Capture year is not assumed authoring year. Resolve `CORPUS-GAME-735` by envelope `id: "toolkitzone.com/735"` under `tk-corpus/games/`; inspect status, description, sharing/news, and file sections.
- **Situation / O:** a creator presents a compact project as completed and invites community participation.
- **Intent / desired outcome:** share a finished small game and have others engage with it.
- **Friction:** none reported; do not manufacture a blocker from modest scope.
- **Workaround:** none reported; the participation invitation is not a workaround.
- **Contradiction:** small work can be an end product. A completion claim and file section do not prove successful player execution.
- **Confidence:** high that completion/sharing is claimed; actual playability unknown; low modern transfer. **O:** published claim and invitation. **I:** lightweight sharing may be a valuable authoring endpoint.
- **Cluster:** creator-to-audience handoff.
- **Open questions:** did recipients play or respond? Completeness unknown; linked binaries not tested.

### E764

- **Context/version:** profile captures in 2006; Toolkit 2.x. Resolve `CORPUS-GAME-764` by envelope `id: "toolkitzone.com/764"` under `tk-corpus/games/`; inspect status, description, news, and file sections.
- **Situation / O:** creator presents a full game and supplies a multi-step download/extraction/loading procedure.
- **Intent / desired outcome:** get a finished release into players' hands, distinguishing it from an earlier demo.
- **Friction:** manual setup steps are observed; whether players experienced them as difficult is **I**, not reported failure.
- **Workaround:** creator-provided installation instructions; no evidence recipients completed them.
- **Contradiction:** finished content does not establish a smooth distribution experience; a larger project and a small project can both be legitimate completion goals.
- **Confidence:** high for release claim and instructions; actual playability unknown; low modern transfer. **O:** claim/procedure. **I:** packaging may impose a separate completion barrier.
- **Cluster:** creator-to-audience handoff.
- **Open questions:** which steps actually failed for recipients? Completeness unknown; multiple captures are not multiple creators.

### Selection log and frozen source fingerprints

Added-record discovery inspected seven candidates and selected two. Nonselected game IDs: 734 (overlaps the small-work/team situation), 2053 (completion label but no corroborating distribution or recipient evidence in the inspected record), 826 (in development). Nonselected forum IDs from the acforum collection: 37100 (unfinished shared demo), 8609 (in-progress, code-oriented discussion). These are selection decisions, not claims that unfinished work is unimportant. A future pass should deliberately sample unfinished sharing rather than repeat this completion-biased selection.

Hashes below fingerprint the normalized Markdown actually sampled, not original captures. Original capture hashes remain in source envelopes. Changed hashes require re-extraction; never silently reuse old locators.

| Source | SHA-256 |
|---|---|
| CORPUS-FORUM-8178 | `bdc355b020267d1482d3ca163d85fdf2c4d94cdc172cc12af9397adce9808418` |
| CORPUS-FORUM-7751 | `2a43f7a1cd99d818f238c325ceb06070954caa9841d16323ef502e9ab9a1ad4a` |
| CORPUS-FORUM-7190 | `d0da3bfba910cbf9cd4486ce2e91c34bed7ec6fbc3778861e4ff8112897193fa` |
| CORPUS-FORUM-7118 | `998fbd7b820c0d74a69375636ca9cdeabe6c3512a0e6c9521979351ac0724327` |
| CORPUS-FORUM-7148 | `c04706029feb1c5b646a904184db54154ff35931d94ec06559a121b6645f634b` |
| CORPUS-GAME-735 | `d4f6400ffed219bc6c5a1a3b6279da2cab433b34c8fd899ba81eb64ddd2dab86` |
| CORPUS-GAME-764 | `d0beef6a0c9e3145cc0afd71b62e64e000117595c0063ef9eacceb8a3fa0fc43` |

## B. Provisional composites

Only two composites clear this pilot's minimal cross-situation threshold. They are **not validated personas**. Names are invented; no demographic or personality traits are assigned. Jordan, Morgan, Casey, and Rowan from the initial bank remain useful hypothesis labels, not evidence-backed composites established here.

### Avery Circuit — finding the path to a working interaction

- **Human snapshot:** has a capability in mind or in hand but cannot yet turn it into something playable.
- **Starting state:** an acquired system or a broad mechanic idea.
- **Goals:** identify a concrete next action, connect necessary parts, try the result.
- **Constraints:** incomplete construction/integration knowledge; exact technical skill and available time unknown.
- **Preferred interaction style:** **H:** choose a worked example or structured guide, with direct/code editing and optional conversation. The sources support asking people for help, not an AI preference.
- **Typical intents:** I-05 mechanic construction; I-13 acquired-system integration.
- **Trust conditions:** **H/S:** explain what is required, distinguish a proposed change from a working result, preserve work outside the change.
- **Failure signals:** no actionable next step; acquired capability remains unusable. **H:** an example works but cannot be adapted.
- **Support:** [E7190](#e7190), [E7118](#e7118), distinct starters.
- **Contradictions:** building a mechanic and integrating one may require different kinds of help. Other participants already report successful implementation.
- **Confidence:** moderate for a historical “construction path missing” lens; low for preferred mode and modern applicability.
- **Falsify/revise:** split the composite if current creators solve integration through dependency/configuration tools but mechanic creation through exploratory design; retire “guided” preference if experienced users consistently prefer direct APIs or examples alone.

### Ellis Clover — getting finished work to an audience

- **Human snapshot:** has something worth sharing, whether compact or substantial, and wants people to experience it.
- **Starting state:** a reported finished project with a public presentation or distribution procedure.
- **Goals:** deliver the intended version and invite play or feedback.
- **Constraints:** scope and packaging differ; recipient environment and actual success are unknown.
- **Preferred interaction style:** **H:** direct release controls with a clear preview of what recipients receive; conversational assistance optional, never assumed.
- **Typical intents:** I-12 finish/share; distinguish a release from a demo.
- **Trust conditions:** **H/S:** release contents and prerequisites are explicit; packaging does not alter authored content.
- **Failure signals:** **H:** wrong version reaches players, required files are missing, or recipients cannot launch.
- **Support:** [E735](#e735), [E764](#e764), different profile author metadata.
- **Contradictions:** a small finished work is not an incomplete large game; manual installation may be acceptable to some audiences. No player failure is observed here.
- **Confidence:** moderate for the historical sharing goal; low for modern workflow/preferences.
- **Falsify/revise:** split by audience or release intent if private collaborative sharing and public distribution need materially different flows; revise if current creators value feedback on unfinished work more than “release” completion.

## C. Candidate intent inventory

Existing I-01–I-12 IDs are retained for continuity; I-13 makes integration explicit and I-14 records the owner's code-centered usage style. **P0** means exercise in the first design study, **P1** means next research coverage—not shipping order or measured demand. Status describes the intent claim; individual design responses remain I/H/S even where the goal was observed.

| ID / user-language intent | Likely lens; starting state → outcome | Modes and editor responsibility | Human judgment; failure → recovery | Evidence; priority; status |
|---|---|---|---|---|
| I-01 “Help me find a first step.” | Avery; broad mechanic or uncertain idea → chosen next action | **H:** conversation, structured prompts, examples; identify a bounded action | What is worth making; wrong direction → choose another action | E7118 supports mechanic case, general idea-first case H; P0; **inferred** |
| I-02 “Help me make this idea concrete.” | Idea-first hypothesis; partial brief → reviewable scene plan | **S:** text/conversation/structured outline; separate stated details from proposals | Meaning and scope; overinterpretation → edit/reject assumptions | E8178 adjacent only; modern brief; P0; **hypothesized** |
| I-03 “Make this place feel right.” | Visual-composer hypothesis; unsatisfying scene → preferred direction | **H:** canvas, comparison, structured properties, optional conversation; preview changes | Aesthetic intent; wrong treatment → revert/selectively retain | E7148 supports style redirection, not direct manipulation; E7751 excluded; P1; **inferred** |
| I-04 “Turn this story beat into something playable.” | Story-author hypothesis; prose → playable interaction | **S:** outline, events/code, canvas, conversation; expose causal sequence | Narrative meaning; flattened story → change staging/choices | E8178 respondent adjacent-domain report; P0; **inferred** |
| I-05 “Help me make this mechanic work.” | Avery; broad mechanic → runnable interaction | **H:** example, structured rules, code, optional AI; connect rules and test | Rules/fun; mismatch → inspect and revise a rule | E7118; P0; **observed** |
| I-06 “Implement the technical parts of my design.” | Avery and idea/story hypotheses; approved brief → inspectable changes | Conversation/MCP plus direct surfaces; execute scoped changes | Creative decisions and authorization; wrong scope → reject/revise | Modern brief only; P0; **strategic addition** |
| I-07 “Show what you changed and assumed.” | All lenses; proposed/applied work → understandable account | Change summary and direct inspection; distinguish facts from assumptions | Acceptability; uncertainty hidden → stop and ask/correct | Modern authorship/control policy; P0; **strategic addition** |
| I-08 “Keep what I like while changing the rest.” | Redirection hypothesis; partial work → selective revision | **H/S:** selection, preview, undo, optional conversation | What to preserve; excess change → undo and narrow scope | E7148 plan, not successful operation; P0; **inferred** |
| I-09 “Let me try this and find what needs changing.” | All lenses; runnable slice → informed revision | Direct playtest and optional diagnostic explanation | Whether enjoyable/expressive; behavior mismatch → inspect causal rule | T-07/T-41 capability anchors, not user evidence; P0; **hypothesized** |
| I-10 “I changed direction; help me revise.” | Redirection hypothesis; unfinished project → revised direction | **H:** overview, comparison, selective edits | New direction; wasted work → retain reusable parts | E7148; P1; **observed** |
| I-11 “Help me resume this project.” | Returning-creator hypothesis; unfamiliar existing work → understood next step | **H:** project overview, inspection, optional explanation | Whether to continue; incorrect summary → inspect actual state | E7148 inactivity is not evidence of a resumption workflow; P1; **hypothesized** |
| I-12 “Let others experience what I made.” | Ellis; finished work → intended version delivered | **H:** release preview, packaging, optional conversation; surface prerequisites | Audience, readiness, publication consent; failed launch → diagnose/repackage | E735/E764; P1; **observed** |
| I-13 “Make this acquired system work here.” | Avery; downloaded capability → configured, testable use | **H:** structured setup, docs/examples, code, optional AI; reveal prerequisites and integration steps | Whether it fits the game; incompatibility → explain and preserve project | E7190; P0; **observed** |
| I-14 “Let me configure and extend the game from code.” | Riley (owner-reported lens); engine familiarity → fast run-and-inspect loop | **H:** code editing, command discovery, direct configuration; never hide code or imply unsupported capability | Which boundaries to push; slow loop or hard board/genre limit → expose actual capability and errors | Owner report, no corpus support; P1 (research); **owner-reported hypothesis** |

The brief's “AI as expert implementation partner” is a strategic direction. It is not proven by historical requests for human help. Likewise, I-09 does not authorize AI to judge whether a game is good.

## D. Contradictions, omissions, and validation

### Source-supported tensions

- **Requesting a story versus having a story:** E8178 contains complementary situations, not a single idea-first persona. Ask whether the creator wants creative invention, implementation, or both.
- **Learning versus already making:** E7118 contains both. Do not force guidance on everyone or classify an entire thread as novice behavior.
- **Restart versus preserve:** E7148 explicitly retains useful work. A “start over” flow must not infer deletion.
- **Small completed work versus substantial release:** E735/E764 support different legitimate scopes. Do not make growth into a large RPG the success metric.
- **Completed content versus delivered experience:** E764 supplies installation instructions but no recipient result. The handoff is a separate evaluation boundary.
- **Website appearance versus game composition:** E7751 is adjacent evidence, not direct corroboration.

### Design tensions not demonstrated by this sample

Strong AI autonomy versus approval of every change; visual versus conversational preference; returning-user compatibility versus newcomer terminology; and beginner guidance versus expert speed are **hypotheses**, not observed opposing camps. Preserve them as study questions rather than asserting a validated segmentation.

### Missing creators and biases

Missing: silent/self-sufficient users, people who never posted, current first-time creators, accessibility and assistive-technology needs, team collaboration, non-English authoring, experienced code-first users in depth, AI enthusiasts and refusers, failed distributors, successful recipients, and creators who intentionally share unfinished work. No demographic inference is justified.

This is one historical community ecosystem, mainly early forum activity plus later TK2 profiles. Survival, capture, support-seeking, selection, and success-reporting biases all apply. Five seed records were chosen by an earlier hypothesis draft; re-reading them is correction, not independent confirmation. Game metadata and self-reports are not usability observations. Forum `complete: true` does not mean the author's problem was solved. We inspected no recipient environments or downloadable games.

### Current-creator sessions

Recruit by actual situation, not by asking participants to identify with persona names: someone with an idea but no implementation, someone adapting a system, someone revising existing work, and someone trying to share. Include direct/code-first and AI-unwilling participants. This is purposive formative research, not prevalence measurement.

1. Ask participants to bring a small real goal and explain what success means before showing a proposed flow.
2. Observe their present process, where they seek help, and what they refuse to delegate.
3. Offer direct and assisted paths without presenting either as superior; vary order to reduce priming.
4. Introduce a recoverable misunderstanding and observe whether they notice, correct, and retain the parts they value.
5. Ask them to explain the resulting project and choose an unprompted next change.
6. Record task outcomes, assistance required, incorrect assumptions, recovery, and stated ownership separately. Do not convert a fluent session or satisfaction answer into proof of durable learning.

Ask: What did the creator already know? Is the proposed first slice meaningful? Which judgments are nondelegable? Does a change summary help or overwhelm? Can they resume after a gap? Can someone else receive and run the result? These questions require people, not synthetic persona agreement.

## E. Two complete candidate experience flows

Both are design proposals grounded partly in historical motivation and partly in the modern brief. They are not implemented behavior, accepted requirements, or executed E2E tests. Implementation semantics must come from `docs/spec/`; the flow does not prescribe runtime internals or final screens.

### Flow 1 — “I have an idea but do not know where to start”

**Goal:** choose and make one meaningful, playable first step without surrendering creative decisions.

**Starting context:** creator has a partial idea, reference, or desired interaction; no existing project is required. No assumption that the story is complete. Evidence: E7118 supports starting uncertainty around mechanics; E8178 distinguishes creative help from implementation. The general conversational flow is S.

| Step | Direct-editor path | Conversational/AI path | Shared state and decision |
|---|---|---|---|
| 1. State the aim | Write a brief or choose to begin with a scene/interaction | Describe the idea; assistant reflects the aim | Brief distinguishes supplied details, unanswered questions, and proposals |
| 2. Choose the first slice | Select one player action and observable consequence | Assistant proposes a bounded slice, not an entire game | Creator accepts/revises scope; unconfirmed suggestions remain proposals |
| 3. Make important choices | Set initial situation, action, consequence, and what to retain | Resolve only ambiguity that materially changes the slice | Creator can defer art/story decisions; temporary choices are labeled |
| 4. Build | Compose a scene and rules through visual/structured/event/code surfaces | AI uses the editor/MCP surface for the approved changes | Same project model and stable object identity; no separate AI-only project |
| 5. Inspect and play | Inspect objects/rules and run the slice | Explain changes, then let the creator inspect/play directly | Playtest reflects the current project; unsupported parts are explicit |
| 6. Correct and continue | Change one property/rule; play again; save | Correct an interpretation; review proposed revision; apply and play | Confirmed details survive unrelated revision; creator chooses the next intent or stops |

**Branches and recovery:** no idea yet → offer a creative exploration branch, not false implementation certainty. Already has a project → inspect it before proposing new objects. Wants code-first → bypass guided planning. Rejects AI → complete the direct path. AI unavailable → retain state and continue directly. Ambiguous change → ask a bounded question or keep a proposal unapplied. Misunderstood premise → amend the brief, show affected changes, undo only the mistaken work without discarding unrelated edits. Missing capability/asset → disclose it and let the creator choose an alternative or stop; never claim the scene works.

**Shared-state expectations (S):** direct changes are visible to the next assisted action; stale proposals cannot silently overwrite intervening edits; save/reopen retains authored state; cancellation leaves no unexplained partial work. These are product-control candidates, not corpus findings or an imposed transaction API.

**Success outcome:** creator can play one meaningful action/consequence, explain what was made, revise it, and name a next step—or deliberately stop with saved work.

**Human evaluation:** Is the slice worth making? Does the creator recognize their intent? Did the tool supply unwanted creative content? Can they continue without coaching? Is the amount of confirmation appropriate?

**Candidate acceptance criteria:**

- A creator can reach the same authored slice through direct or assisted authoring without mandatory AI participation.
- A material ambiguity is reviewable before the affected change; rejection preserves prior project state.
- A correction changes its intended target and retains unrelated confirmed details.
- After direct modification, the assisted path reflects it or explicitly resolves a stale proposal.
- The slice can be played, revised, saved, reopened, and played with the revision intact.

**Candidate automated E2E checks:** use an authored brief and controlled assistant proposal fixture, not claims of deterministic live language generation. Create one scene with an authored action/consequence; reject an incorrect proposal and compare semantic state; approve a corrected proposal and exercise the action; edit directly and verify the next MCP read; reject/resolve a stale write; save/reopen and exercise the revised consequence. Assertions concern visible outcome and project preservation, not screenshot existence or nonempty output. A separate live-model human session evaluates interpretation.

**Automation cannot prove:** meaningful scope, narrative understanding, enjoyment, ownership, discoverability, or that a beginner can finish without help.

### Flow 2 — “Turn this story or design idea into a playable scene”

**Goal:** express a specific beat as player experience, then revise it without losing its intent.

**Starting context:** a short scene idea or design beat and either a new scene or an existing project. Story-to-game motivation is adjacent evidence from E8178's respondent; preservation is motivated by E7148. Cross-surface and AI behavior are S.

For evaluation only, use an invented non-corpus brief: “At a closed garden gate, the player reads a note and decides whether to enter.” No source story, asset, or distinctive historical mechanic is reused.

| Step | Direct-editor path | Conversational/AI path | Shared state and decision |
|---|---|---|---|
| 1. Identify the beat | Record the situation and intended player experience | Restate what is explicit and ask whether omitted decisions should remain open | Narrative intent stays distinct from implementation suggestions |
| 2. Define agency | Author actions and consequences in structured/event/code form | Propose interpretations: for example, reading alone must not imply entry | Creator chooses what the player can decide and what follows |
| 3. Stage the scene | Place the gate, note, start, and relevant spatial relationships | Propose staging inside the approved scene scope | Visual objects and behavior refer to the same project entities |
| 4. Connect behavior | Attach inspection, choice, and consequence | Apply approved behavior through editor/MCP operations | No silent change to unrelated scenes or confirmed wording |
| 5. Rehearse branches | Play from the intended starting state; try entry and refusal | Explain how to exercise both branches, without asserting narrative quality | Playthrough distinguishes authored state from transient test state |
| 6. Revise meaning | Edit text, placement, or consequence; replay | Correct an interpretation and inspect the scoped proposal | Preserve creator-authored edits not targeted by the correction |
| 7. Save and hand back | Save/reopen; identify the next beat or stop | Summarize applied changes and remaining open decisions | No hidden “finished” claim when a branch or capability is unresolved |

**Branches and recovery:** incomplete story → leave creative choices open or explicitly request invention. Existing scene → reuse chosen entities, do not duplicate by default. Creator wants purely visual storytelling → do not force dialogue. Ambiguous “enter” → ask what action triggers it. Incorrect automatic entry → restore the last accepted state, revise the causal rule, retest both choices. Broken interaction → reveal the relevant condition/trigger and let the creator inspect it. Unsupported behavior → disclose the limit before claiming a playable result. Interrupt during assistance → show what actually applied and resume from actual project state, not conversation memory.

**Shared-state expectations (S):** visual placement, structured properties, authored events/code, conversational inspection, and MCP refer to one model; mode switches do not flatten or silently replace authored logic. Playtest state does not accidentally become the saved starting state. No specific representation or implementation strategy is selected here.

**Success outcome:** the scene expresses the creator's chosen agency; both branches can be tried; a revision remains inspectable and survives reopening.

**Human evaluation:** Does the scene communicate the intended beat? Is the choice meaningful? Did staging change the tone? Can the creator predict consequences from the authored rules? Can they reject the assistant's interpretation without starting over?

**Candidate acceptance criteria:**

- Merely reading the note does not enter the garden unless explicitly authored.
- Choosing entry and choosing refusal produce their authored, distinct consequences.
- Correcting the interaction preserves unrelated text and placement.
- Direct and assisted edits target the same scene and preserve authored behavior across mode switches.
- Saving after playtesting preserves the authored starting state, not accidental transient progress.

**Candidate automated E2E checks:** construct the invented scene via the real editor operation surface; play read-only, enter, and refuse paths from fresh starts; assert the actual authored branch outcomes; apply a scoped assisted change after a direct text edit and assert text preservation; undo the change; save/reopen and replay. Include a stale-proposal conflict and a cancelled operation with observable state assertions. These are proposed checks, not tests run during this research pass.

**Automation cannot prove:** emotional effect, quality of prose, player understanding, meaningful choice, authorial ownership, or whether the assistant's staging is artistically appropriate.

## F. Method critique and next research assignments

### Audit of the initial experience bank

| Initial claim or section | Pilot disposition |
|---|---|
| Intent-led design rather than file-led organization | Keep as a product principle; this sample does not compare alternative editor organizations |
| Anonymous sources and visible contradictions | Keep; add source completeness, domain, provenance fingerprints, and O/I/H/S coding |
| “Evidence-backed personas” in the opening | Too strong for the initial draft; use candidate/hypothesis bank pending research |
| E8178 supports Jordan and Morgan as strongly inferred composites | Revise: requester lacks a plot and excludes Toolkit; respondent reports writing-to-game difficulty. Neither alone justifies either composite |
| E7751 supports Casey's game-scene composition | Withdraw direct support: it is website design. E7148 alone leaves a visual-direction intent, not a multi-source persona |
| Avery from E7190/E7118 | Retain a narrower provisional construction-path composite; interaction preference and AI trust remain H/S |
| Rowan from E7148 | Retain selective revision as observed intent; downgrade named returning-creator persona and migration/resumption claims to hypotheses |
| I-06/I-07 AI execution and transparency | Keep explicitly strategic; historical peer assistance is not validation of AI demand |
| I-09 “tell me what is wrong” | Separate behavioral diagnostics from human creative evaluation; no source here validates delegating quality judgment |
| I-12 sharing | Now supported by two creator presentation records, but actual player launch/success remains unverified |
| Contradictions table | Relabel unsupported polarities as design tensions to test; do not claim opposing user groups were observed |
| Initial priorities | Product hypotheses, not evidence-ranked demand; research priorities here deliberately differ from feature-parity priorities |
| Initial acceptance outcomes/E2E | Retain as candidate design checks with explicit failure/recovery and human evaluation; none is validated by this pilot |

### What this method did well and where it remains weak

Domain checking overturned a misleading inference before it became a persona. Distinguishing requester from respondent recovered a useful story-to-game observation without attributing it to the wrong person. Success records countered help-seeking bias without pretending that release claims prove playability.

The sample remains anchored to an earlier draft, concentrated in one historical ecosystem, and dependent on normalized extraction. Two independent situations are a low bar for a **provisional** composite, not saturation. A shared bottleneck can conceal very different underlying needs. Textual confidence is subjective and should be independently recoded. IDs and hashes support audit but do not make the original public contributors unidentifiable; release only generalized summaries outside the internal research context.

### Sol: bounded, repeatable extraction

Assign a next batch only after agreeing its sampling frame: two current gaps per batch, fixed candidate cap, selection/exclusion log, source hashes, no identity output. Useful next strata are game-scene composition (not websites), actual story-to-playable attempts, selective restarts with follow-through, and recipient reports of successful or failed launches. Include self-directed/code-first work and unfinished sharing, not just help requests.

Sol should resolve and deduplicate records, check domain/version/completeness, code requester and respondent separately, fill O fields before proposing I fields, record nonresolution and negative cases, and return anonymous cards. Sol must not infer preferences, promote personas, assign demographic traits, equate advice with adoption, or convert frequency into priority. First repeat this seven-record pilot blind to its interpretations and report claim-level disagreements; this calibrates extraction without adding evidence.

### Astra: deeper interpretation and study design

Return questions about whether integration and creation belong in one composite, whether story invention and story implementation need distinct flows, whether “restart” is a state or a recurring persona, and how much control creators want to delegate. Interpret contradictory cases before changing the bank. Design current-creator sessions around authorship, correction, mode switching, scope, and handoff. Only after those sessions should the team promote personas, rank unmet needs, or adopt candidate acceptance scenarios as requirements.

**Bottom line:** the defensible output is a repeatable pilot, two narrow provisional composites, several still-useful intent hypotheses, and two testable experience proposals—not a validated taxonomy or a modern-user demand forecast.
