---
title: 'Make absent values explicit in the ports contract'
type: 'story'
ticket: '12'
created: '2026-10-10'
status: 'built'
baseline_revision: 'fa246780ff6ee193ddbab9d5ea0a9c22a9e15b79'
route: 'full'
route_source: 'auto'
risk: 'medium'
review: 'quick'
review_source: 'pinned'
lenses_ran: ['quick']
review_loop_iteration: 1
context:
  - '{project-root}/docs/guardrails.md'
  - '{project-root}/_bmad-output/initiative-rpgtoolkit-reawakened/architecture-rpgtoolkit-reawakened/architecture-rpgtoolkit-reawakened.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** An absent value has two spellings in the port contract — an omitted optional key (`char?`, `tile?`, `asset?`/`loop?`/`volume?`) or `missing: true` in one of two exclusive reply variants. Across a Worker boundary and in a canonical hash an absent key differs from `undefined`, and the difference surfaced as a late `canon` throw, not a compile error (entry 8 F1, R2-1). With no `core` check on incoming events, entry 9's `parseRun` grew duplicate field rules in the harness (CAP-12/CAP-13 drift).

**Approach:** Give every event one fixed key set. `KeyInput.char`, `TexRef.tile` and `AudioCue.asset`/`loop`/`volume` become required `T | null`; `AssetReply` and `BlobLoaded` collapse to one shape with `bytes: Bytes | null`; `missing` disappears. One runtime validator in `core` checks a decoded event and names the failing path; `parseRun` calls it and keeps only run-file structure rules. Re-record the run and golden, update the fixtures, and amend the architecture text that states the old shapes.

## Boundaries & Constraints

**Always:**
- An empty value is written `null` and spelled out in the type: every field of every port-contract type is required; `undefined` is never a value (AD-5, AD-14).
- `exactOptionalPropertyTypes` stays on in `tsconfig.base.json`, and the contract fixture tsconfigs keep extending it — a backstop, not the rule (entry 8 R2-1).
- The validator is pure `core`: ES2022, no DOM/Node/timers, no banned `Math` (G2, G3), returns a result naming a path, and never throws on malformed data. `parseRun` formats that result into an error with file, record index and path.
- The validator takes data **after** `decodeLog` restored `{t:'bytes',hex}` to `Uint8Array`; `parseRun` decodes each record first and wraps a codec failure with the record index.
- Golden files change only in this pull request, which states each changed value and why (G5.3).

**Never:**
- Change `InputEvent` kinds or field names other than `missing`; change hash or canonical output for data that holds no changed field; touch the RFC 8785 or FNV-1a vectors (entry 8's record).
- Validate engine outputs (draw lists, audio cues), or adopt the rule at any other JSON boundary (story scope).
- Add a validation library, or leave `parseRun` a field rule the validator also states.
- Edit entry 8's or entry 9's plans, or any review or `.memlog` record — they are the record.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Null accepts | one valid event of each of the 11 kinds, incl. `char:null` and `bytes:null` | Accepted; value deep-equals the input | None |
| Required key absent | `{kind:'key',name:'A',code:'KeyA',down:true}` | Rejected, path `char` | `ok:false` |
| `undefined` at runtime | the five changed fields set to `undefined` | Rejected, path names the field | `ok:false` |
| Wrong type | `{kind:'pointer',x:'10',…}`; `{kind:'asset',reqId:2,bytes:5}` | Rejected, path `x` / `bytes` | `ok:false` |
| Unknown kind | `{kind:'nope'}` | Rejected, path `kind` | `ok:false` |
| Extra key | `{kind:'gamepad',extra:1}`; `missing` on a reply | Rejected, path `extra` / `missing` | `ok:false` |
| Empty name, multi-code-point char | `name:''`; `char:'AB'` | Rejected, path `name` / `char` | `ok:false` |
| Malformed bytes in a run | `bytes:{t:'bytes',hex:'zz'}` or odd length | `parseRun` rejects naming `run.json`, the record index and the field path | `Error` |
| `null` vs absent in the log | `char:null` and the key-absent record through `encodeLog`/`canon`/`decodeLog` | `null` returns as `null`; the canonical forms differ | None |
| Golden re-record | run.json with `char:null` at the key-up record | `golden:record` rewrites `golden.json`; `golden` exits 0 | CLI error |

</frozen-after-approval>

## Code Map

- `packages/core/src/ports/{input,draw,audio}.ts` — `char`, `tile`, `asset`/`loop`/`volume` become required `T | null`; `AssetReply`/`BlobLoaded` collapse to `bytes: Bytes | null`; `missing` gone; `bytes.ts` notes the backstop.
- `packages/core/src/canon/log.ts` — `decodeLog` throws `decodeLog: at <path>: …`; `canon.test.ts` pins it.
- `packages/core/src/validate/{input-event,index}.ts` (new) + `packages/core/src/index.ts` — validator exported as a **value** (ports stays `export type *`).
- `packages/core/test/{validate.test.ts (new),fixtures/ports/{good,bad}.ts}` — AC 4/5 tables; pins and negatives; canon null-vs-absent test (AC 7).
- `packages/runner-harness/src/golden.ts` — `parseRun` keeps only run-file structure checks, decodes each record, calls the validator; both paths survive; `parseBytesField` deleted.
- `packages/runner-harness/src/double/test-engine.ts` + harness tests — new fields on typed literals; each `fieldSnippet` re-derived (AC 6, 8).
- `golden/test-double/{run,golden}.json` — re-recorded.
- `_bmad-output/…/architecture-rpgtoolkit-reawakened.md` — AD-3 `tile`, AD-5 `bytes: Bytes | null`, AD-14 events + flag/backstop, AD-16 cues (AC 9).

## Tasks & Acceptance

**Execution:**
- [x] Spine — AD-3 `tile`, AD-5 `bytes: Bytes | null`, AD-14 + flag/backstop, AD-16 — AC 9.
- [x] Run both AC 9 greps under Verification — shape patterns clean in `docs/`; spine `missing` hits are only the new wording — AC 9.
- [x] `packages/core/src/canon/log.ts` + its test — `decodeLog` names the dotted path; roots keep the plain message — AC 6.
- [x] `packages/core/src/ports/{input,draw,audio}.ts` + `validate/*` + `src/index.ts` — required fields, single reply shape, `missing` gone, validator and its value export — AC 1–6.
- [x] `packages/runner-harness/src/golden.ts` — delegate event checks; keep only run-file structure — AC 5, 6.
- [x] `fixtures/ports/{good,bad}.ts` + `validate.test.ts` — pins; one defect per negative line; accept all kinds, name paths; only `test`/`equal`/`deepEqual`/`throws` — AC 1–5.
- [x] `canon.test.ts` + harness doubles/tests — literals; re-derive each `fieldSnippet` (`unexpected event kind`→`kind`, `mutually exclusive`→extra key `missing`, `invalid hex character`→codec message, `result is required`→`result`); add `char: null` in double/job/driver — AC 6, 7.
- [x] `golden/test-double/run.json` then `pnpm golden:record` — commit states 18 state values from step 7, 0 draw values, lowercase-hex tightening — AC 8.

**Acceptance Criteria:** the story's nine; AC 6 is structural — `parseRun`'s only event-shape logic is the `validateInputEvent` call, and harness tests assert both rejections name file, index and path.

## Implementation Notes

- **Decisions (human, 2026-10-10, at the plan checkpoint).**
  - `decodeLog` names the dotted path of a malformed payload (a small change to entry 8's codec), so the field name survives moving all event-shape checking into one validator.
  - `AudioCue` keeps required nullable fields rather than a `kind`-discriminated union (the story's default).
  - Uppercase hex in `run.json` is now rejected: bytes route through `decodeLog`, which accepts only the lowercase `encodeLog` writes, so the tolerance in entry 9's `parseBytesField` was an accident of a duplicate hex parser. No committed payload uses uppercase.
  - The plain-data fixture tsconfigs stay as they are (no `exactOptionalPropertyTypes`): a required `T | null` field rejects `undefined` with the flag off as well, so the flag is only a backstop.
  - The spine is the home of the new rule (AD-14 carries the sentence; AD-3/AD-5/AD-16 carry the shapes), because `docs/` held nothing stale.
- **Beyond the plan text.** `extension.result.result` is deep-checked rather than passed through untouched (see Review Triage Log B1), and `parseEvent` names `event` when a record's event member is missing or is not an object (M1).

## Plan Change Log

## Review Triage Log

Independent context-free review by review-1-12, in two rounds, with mutation testing in a throwaway copy.
Round 1: 1 blocker, 1 major, 4 minor, 4 nit; 28 mutants, 21 killed, 7 survived.
Round 2 (confirmation): 8 of 8 previously-surviving and newly targeted mutants killed; 0 survivors; 78/78 tests.

| # | Finding | Verdict | Route | Evidence / action |
|---|---------|---------|-------|-------------------|
| B1 | `validateInputEvent` accepted `undefined`, a function, a `Map` and nested non-`PortData` as `extension.result.result`, so a Worker-seam reply typed `InputEvent` still threw late inside `canon` | blocker | patch | `result` is now canonicalised in log form (`canon(encodeLog(result))`) inside a `try`/`catch` and rejected with path `result`. That is exactly the predicate the test double needs, is cycle-safe, cannot hang, and rejects every depth. Six rejected rows and three accepted rows added; a mutant that only checks `!== undefined` now dies. |
| M1 | `parseRun` reported `run.json: record 0: expected an object` with no field when a record's `event` was absent or not an object, regressing entry 9's message | major | patch | `parseEvent` now throws `run.json: record N: event: missing or not an object`; rows added for `{ step: 0 }` and `{ step: 0, event: 5 }`. |
| m1 | The record index in messages was never exercised past 0 (mutant survived) | minor | patch | A bad record at index 1 asserts `record 1`. |
| m2 | Object-valued `bytes` was not in the rejected table (mutant survived) | minor | patch | `bytes: {}` and `bytes: { t: 'bytes', hex: '00' }` rows added. |
| m3 | `decodeLog`'s sparse-array length/hole semantics were unpinned (mutant survived) | minor | patch | A sparse-array round-trip is pinned in `canon.test.ts`. |
| m4 | Uppercase hex in a run is now rejected | minor | patch | Stated in this plan and in the commit message. |
| n1 | The module doc claimed "never throws", but a hostile object with a throwing getter threw | nit | patch | The body is wrapped in `try`/`catch` returning `invalid("", …)`; a getter row is tested. |
| n2 | The accepted value's freshness was untested (mutant survived) | nit | patch | A test mutates the input after acceptance and asserts the result is unchanged. |
| n3 | The "no deep validation" note contradicted the fix | nit | patch | Design Notes corrected (above). |
| r2-n1 | A symbol-keyed extra property on an event is accepted | nit | accept | `Object.keys` ignores symbols, and `encodeLog`/`canon` ignore them too, so there is no hash effect; unreachable through `JSON.parse` or `structuredClone`. |
| r2-n2 | A hostile host object whose member read throws reports path `''` | nit | accept | Only reachable for objects that cannot cross `JSON.parse`/`structuredClone`; the field name is kept for every JSON-reachable failure. |
| r2-n3 | `result: -0` is accepted and canonicalises to `"0"` | nit | accept | Pre-existing and `PortData`-legal (RFC 8785 normalises `-0`). |

## Design Notes

**Validator.** New `core/validate/input-event.ts` (ports stays `export type *`):

`validateInputEvent(raw)` returns `{ok:true,value} | {ok:false,path,message}`.

Table (11 kinds) holds each field's rule and key set; the first failure returns `path`; a non-object gives `''`. As entry 9: `x`/`y` any integer; `step`/`reqId`/`cueId`/`buttons` `>= 0`; `name`/`code` non-empty; `state` `'lost'|'gained'`; `ok` boolean; `names` strings; `char` `null` or one code point; `bytes` `null` or `Uint8Array`; `result` is checked by canonicalising it in log form (`canon(encodeLog(result))`, which rejects `undefined`, non-plain values, `NaN`/`Infinity`, sparse arrays and cycles at any depth) and then passed through unchanged; `kind` one of 11.

**Decode before validate, paths preserved.** `parseRun` decodes each record once; the validator takes decoded data. AC 6's field name survives because `decodeLog` threads a dotted path — `decodeLog: at event.bytes: invalid hex digit`, a root keeping the plain message so entry 8's codec tests stay meaningful — and `parseRun` yields `run.json: record 3: decodeLog: at event.bytes: invalid hex digit`. Uppercase hex is therefore now rejected, matching `encodeLog`'s lowercase output.

**Contract changes.** Every field is required: `null` is the only way to write "no value", and `undefined` fails to compile regardless of the flag. Removing `missing` and requiring `T | null` deletes the `?: never` trick, so `PortData` assignability no longer depends on `exactOptionalPropertyTypes`; the flag stays purely a backstop — so the plain-data fixture tsconfigs, which do not extend `tsconfig.base.json`, need no change. Breaks the published `ports` surface (authorised). `AudioCue` keeps nullable fields (default taken); the validator does not cover cues.

**Golden migration.** `run.json` gains `"char": null` on its key-up record; `pnpm golden:record` rewrites `golden.json`. First changed state value: step 7; 18 state values (steps 7–24); 0 draw values. Commit states those counts (G5.3).

## Verification

**Commands:**
- `pnpm test` — `contracts.test.ts`: `good.ts` clean, one error per `export` in `bad.ts`; validator, canon and harness pass.
- `pnpm typecheck` — names every literal needing the new `null` fields.
- `pnpm golden:record && pnpm golden` — `golden: 24 recorded` then `24 compared`, exit 0.
- `SP=_bmad-output/initiative-rpgtoolkit-reawakened/architecture-rpgtoolkit-reawakened/architecture-rpgtoolkit-reawakened.md; grep -rn -E "missing: true|bytes \| missing|char\?|tile\?|asset\?|loop\?|volume\?|exactOptionalPropertyTypes" docs/ "$SP"` — expected: zero hits in `docs/`; spine hits are only the new text (the `exactOptionalPropertyTypes` backstop sentence in AD-14, with old shape patterns clean).
- `grep -rn "missing" "$SP"` — expected: hits only the new AD-5 reply wording (`null` means the asset is missing) and ordinary prose in other rules (e.g. AD-10's "saves missing state"), never a field or union member.
- `pnpm lint && pnpm graph && pnpm graph:test && pnpm licence && pnpm provenance` — clean.
