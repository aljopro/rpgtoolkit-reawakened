# Editor Experience Bank

> **Initial hypothesis draft, retained for research comparison.** This document proposes anonymous persona and intent lenses; it does not establish evidence-backed or validated personas. The [research pilot](editor-research-pilot.md) supersedes its evidence interpretations, confidence labels, and persona-support claims. In particular, source 7751 concerns website design, and source 8178 requests a plot for a non-Toolkit game. Read the pilot's evidence cards and section F before using any candidate below in design or acceptance decisions. This is not a feature checklist or final UI.

## Design rule

The editor is organized around creator intent and coherent experience flows. Files, assets, and implementation objects support those flows; they do not define them.

A legacy feature such as a board, program, character, or tileset is evidence of something the old tool stored or exposed. It is not, by itself, evidence that the creator wanted to think in those boundaries. New editor work MUST begin with a creator situation and desired outcome, then decide which surfaces and data are needed to support it.

## Evidence and anonymity rules

- Corpus material is research evidence, not a source for identifying or profiling people.
- Public and committed research artifacts MUST NOT contain real names, usernames, email addresses, locations, or other identifying details from the corpus.
- Persona names are invented by this project. They are deliberately unrelated to corpus identities.
- Evidence is cited with opaque source IDs such as `CORPUS-FORUM-8178`, not contributor names.
- Prefer anonymized paraphrase or aggregate patterns. Preserve verbatim wording only in a private research ledger when necessary and safe.
- One post does not establish a universal persona.
- Contradictions are evidence and MUST remain visible rather than being averaged away.
- Corpus frequency is directional evidence, not a representative user survey.
- The corpus may inform intent, friction, workaround, and historical context. It MUST NOT be used to copy legacy implementation. Compatibility behavior comes from `docs/spec/`; editor experience is designed here.

## Entry model

Every accepted entry should contain:

1. **Persona** — an invented human name and a short situation-based snapshot.
2. **Starting state** — what the creator already has or understands.
3. **Intent** — what the creator is trying to accomplish now.
4. **Preferred interaction** — direct manipulation, conversation, text, or a mixture.
5. **Editor responsibility** — what the product should make possible.
6. **Creator judgment** — what must remain the creator's decision.
7. **Success evidence** — an observable outcome and the desired feeling.
8. **Failure and recovery** — how the flow can become confusing and how the creator can recover.
9. **Evidence** — anonymous source IDs and confidence.
10. **Test status** — research entry, design scenario, acceptance scenario, automated E2E, or human-evaluated.

## Current evidence base

The first pass combines the existing feature inventory with a small, deliberately mixed corpus sample. The sample is useful for discovering patterns, not for estimating prevalence.

| Source ID | Anonymous pattern observed | Editor implication |
|---|---|---|
| `CORPUS-FORUM-8178` | A creator had a strong need for a game story and sought help specifically with plot and title, while separating story creation from implementation. | Support idea clarification and story shaping without requiring technical implementation at the start. |
| `CORPUS-FORUM-7751` | A creator wanted to improve the visual feel of a project and sought examples or guidance rather than a file-specific operation. | Treat visual direction and presentation as creator goals; do not make the user hunt through asset types to improve a scene's feel. |
| `CORPUS-FORUM-7190` | A creator acquired custom systems but did not know how to connect or use them. The immediate problem was orientation and integration. | Make extensions and advanced systems discoverable, explain their effect, and provide a guided path from installed capability to working result. |
| `CORPUS-FORUM-7118` | A creator asked how to make any minigame; community advice moved from examples and brainstorming toward paper design and then implementation. | Support intent decomposition: brainstorm, choose a small interaction, model it, implement it, and playtest it. |
| `CORPUS-FORUM-7148` | A creator reconsidered a project because its visual direction no longer matched the intended style and had only a small amount of board work completed. | Support safe revision, visual iteration, and changing direction without treating early work as a commitment to the whole project. |

The legacy feature inventory supplies additional candidate intent surfaces, including new project setup and test run (T-04, T-07), board composition (T-20–T-35), asset creation and preview (T-36–T-39, T-60–T-62), scripting and visual event construction (T-40–T-45), actor and item design (T-50–T-58), and packaging (T-70–T-74). These IDs are implementation evidence and scope anchors, not personas.

## Candidate personas

These are named research lenses, not claims that every creator belongs to one category. A creator may move between several during one project.

### Jordan Rhubarb — the idea-first creator

Jordan has a strong premise, mood, or story but does not know how to turn it into a project. Jordan wants a concrete beginning, not a lesson in file organization.

- Typical starting state: premise, scene, character, or mood.
- Primary intent: “Give this idea a beginning I can see and play.”
- Preferred interaction: conversation first, then visual inspection and direct refinement.
- Trust condition: the editor distinguishes Jordan's stated ideas from its own inferences.
- Failure signal: a large generated structure appears before Jordan recognizes the original idea.
- Evidence: `CORPUS-FORUM-8178`; strategic addition for the new editor.
- Confidence: strongly inferred plus strategic addition.

### Casey Lantern — the visual composer

Casey thinks through spaces, atmosphere, movement, color, and presentation. Casey may know the desired feeling before knowing the names of the assets or systems involved.

- Typical starting state: reference image, rough layout, tiles, or a desired mood.
- Primary intent: “Make this place feel like the scene in my head.”
- Preferred interaction: canvas, live preview, visual comparison, and optional conversational direction.
- Trust condition: direct manipulation remains fast and reversible.
- Failure signal: the editor exposes asset mechanics but cannot help Casey evaluate the scene as a whole.
- Evidence: `CORPUS-FORUM-7751`, `CORPUS-FORUM-7148`; `docs/editor-features.md` T-20–T-39.
- Confidence: strongly inferred.

### Morgan Quill — the story architect

Morgan thinks in characters, plot, choices, and consequences. Morgan wants to shape the dramatic experience before implementing every event.

- Typical starting state: premise, cast, plot outline, or a desired player choice.
- Primary intent: “Turn this story beat into a playable scene.”
- Preferred interaction: conversation, structured outline, then scene and event editing.
- Trust condition: the editor preserves narrative intent while making implementation concrete.
- Failure signal: Morgan must translate a story concept into low-level commands before seeing whether it works.
- Evidence: `CORPUS-FORUM-8178`; strategic addition for the new editor.
- Confidence: strongly inferred plus strategic addition.

### Avery Circuit — the systems experimenter

Avery wants to make a mechanic, minigame, custom battle, or unusual interaction. Avery may learn by experimenting and comparing results rather than reading a complete manual first.

- Typical starting state: mechanic idea, example, or borrowed system that needs adaptation.
- Primary intent: “Make this interaction work and let me try it.”
- Preferred interaction: small guided prototype, direct editing, playtest, and targeted AI implementation.
- Trust condition: the editor provides a small working loop and explains the important moving parts.
- Failure signal: an advanced system is present but the path from installation to working behavior is opaque.
- Evidence: `CORPUS-FORUM-7190`, `CORPUS-FORUM-7118`; `docs/editor-features.md` T-41, T-45, T-56–T-58.
- Confidence: strongly inferred.

### Rowan Restart — the returning creator

Rowan has an unfinished or changed project and wants to resume, revise, or redirect it. Rowan may be carrying old habits, old assets, and uncertainty about what still works.

- Typical starting state: existing project, partial boards, assets, or a changed creative direction.
- Primary intent: “Help me understand where I am and make the next change safely.”
- Preferred interaction: project overview, previews, explainable migration, and reversible edits.
- Trust condition: existing work is preserved and the editor makes consequences visible.
- Failure signal: changing direction requires destructive cleanup or rediscovering the entire project structure.
- Evidence: `CORPUS-FORUM-7148`; `docs/editor-features.md` T-03, T-06, T-28, T-31, T-43–T-44, T-73.
- Confidence: strongly inferred.

## Candidate intent inventory

| ID | Creator intent | Likely personas | Priority | Current status |
|---|---|---|---:|---|
| I-01 | “I have an idea; help me find the first concrete step.” | Jordan, Morgan | P0 | Research entry |
| I-02 | “Explain what I mean and turn it into a small project shape.” | Jordan, Morgan | P0 | Research entry |
| I-03 | “Make this place feel right.” | Casey, Jordan | P0 | Research entry |
| I-04 | “Turn this story beat into a playable scene.” | Morgan, Jordan | P0 | Research entry |
| I-05 | “Make this mechanic or minigame work.” | Avery | P1 | Research entry |
| I-06 | “Implement the technical parts of my design.” | Jordan, Morgan, Avery | P0 | Strategic addition: AI design surface |
| I-07 | “Show me what was made and what you inferred.” | All | P0 | Strategic addition: AI transparency |
| I-08 | “Change the result without losing the parts I like.” | All | P0 | Research entry |
| I-09 | “Play this as a player and tell me what is wrong.” | All | P0 | Design scenario candidate |
| I-10 | “I changed direction; help me revise safely.” | Rowan, Casey | P1 | Research entry |
| I-11 | “I have an existing project; help me continue.” | Rowan | P0 | Research entry |
| I-12 | “Finish and share a complete game.” | All | P1 | Feature-supported, flow not yet designed |

Priority is provisional. P0 means the intent is central to the editor promise and should be represented in the first experience bank; it does not mean every supporting feature must ship immediately.

## Contradictions to preserve

| Tension | What it may mean for design |
|---|---|
| Some creators want the editor to make strong decisions; others need to approve every important interpretation. | Offer progressive autonomy: visible proposals, adjustable confirmation, and a clear record of changes. |
| Some creators want a visual canvas; others think in story or conversation. | Provide multiple design surfaces over one project model rather than forcing one universal workflow. |
| Some creators want to start with a tiny experiment; others begin with a large world. | Make the smallest playable slice easy without preventing a larger project structure. |
| Returning creators may value compatibility and familiar concepts; new creators may find those concepts opaque. | Preserve useful continuity while explaining concepts in creator language rather than exposing file boundaries first. |
| Advanced users may want direct control; beginners may need guided help. | Let guidance recede as confidence grows; do not create separate beginner and expert products prematurely. |

## First experience flow to design and test

### I-01 / I-02 / I-04: idea to first playable scene

**Scenario:** Jordan or Morgan describes a tense opening scene. The editor helps shape the idea, creates a small playable slice, and lets the creator revise it through both conversation and direct editing.

**Acceptance outcomes:**

- The creator can describe the idea in natural language or begin directly in the editor.
- The editor reflects important assumptions before applying ambiguous decisions.
- Creator-provided details, inferred details, and generated scaffolding are distinguishable.
- The creator can correct an interpretation without restarting.
- The result is a shared project state visible through both conversational and direct editor surfaces.
- The creator can play the scene, identify a change, apply it, and play again.
- The editor preserves confirmed decisions during later revisions.
- The flow ends with a clear next intent rather than a dead-end artifact.

**Human-evaluation questions:**

- Does the creator recognize their idea in the first result?
- Can the creator explain what the editor changed?
- Does the creator know what to do next without coaching?
- Does the creator feel ownership rather than authorship by the AI?
- Can the creator recover when the editor misunderstands them?

**Automated E2E candidate:**

1. Start a new project.
2. Submit a deterministic scene brief through the conversational surface.
3. Review and revise an interpretation.
4. Verify the shared project contains the expected scene.
5. Open the same project in the direct editor.
6. Play the scene.
7. Make a direct edit.
8. Re-enter through conversation and verify the edit is represented.
9. Play again and verify the intended changed outcome.

Synthetic persona sessions MAY rehearse this flow through the real editor and MCP surface, but they are simulations. Human creator evidence outranks their results.

## Research status and next work

This initial bank is a candidate inventory, not a final taxonomy. Next research should:

1. Mine a broader, anonymized corpus sample for repeated intents, friction, workarounds, and contradictions.
2. Add evidence from game profiles and creator project descriptions without exposing contributor identity.
3. Separate observed historical patterns from strategic additions for modern design-first and AI-assisted creation.
4. Promote only supported candidates to formal acceptance scenarios.
5. Test the first flow with real creators, then revise persona names, descriptions, and priorities when evidence contradicts them.
