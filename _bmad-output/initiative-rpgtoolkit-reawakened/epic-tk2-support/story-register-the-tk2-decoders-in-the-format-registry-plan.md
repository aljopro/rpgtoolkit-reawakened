---
title: "Register the TK2 decoders in the format registry"
ticket: 8
status: done
---
 
## Intent

Register the Toolkit 2 readers delivered by tickets 16.4–16.7 and the image readers from 16.11–16.12 in the shared `AssetDecoder` registry, and route their dump extensions through that same registry. The ticket's verify criterion requires each sample file with a registered extension to decode to the model returned by its reader and the dump expectation to match.

## Boundaries

- Preserve the existing `AssetDecoder` dispatch contract (AD-31): extension dispatch is case-insensitive, header dispatch uses the decoder predicate, and the dump calls the same registered decoder.
- Register only reader families already implemented: `.brd`, `.tem`, `.itm`, `.gam`, `.ene`, `.anm`, `.spc`, `.ste`, `.bkg`, `.tan`, `.gph`, `.fnt`, `.bmp`, and `.gif` as applicable to existing decoders. Keep non-data media and unsupported formats skipped.
- Keep `packages/runner-headless/src/dump/parse.ts` summaries aligned with decoder ids; do not introduce a second dispatch table or new decoder behavior.
- Update corpus expectations only for the deliberate consequence of newly parsed files; keep the existing legacy corpus unchanged unless `dump:check` proves the registered files are present there and its digest changes are intentional.
- Follow G1–G7, especially G5 (no unreviewed golden changes) and G7 (docs/spec remains normative; never inspect `../rpgtoolkit`).

## Implementation

1. Confirm that the formats have normative `docs/spec` coverage and existing reader tests/fixtures.
2. Add the new reader families to `CoreDecoders`/`CORE_DECODERS`, with correct magic detection and extensions; retain image-signature dispatch for BMP/GIF and resolve `.gph` versus `.tan` prefix ambiguity.
3. Remove skip-table entries for formats now registered; leave unsupported media and other intentionally skipped formats unchanged.
4. Add registry and dump tests that exercise extension/header routing and successful sample parsing through the registry.
5. Run the relevant dump gates. Record expectation changes only where the files now parse, with no changes to unrelated corpus digests.

## Acceptance

- Every newly registered extension resolves to its intended decoder through `CORE_REGISTRY`, with case-insensitive extension lookup and correct header routing where the format has a magic signature.
- Committed examples for the newly registered formats parse through the registry and produce the same model/digest as the direct reader path.
- `pnpm dump:check` and `pnpm dump:check:examples` pass; any changed expectation entries correspond to files made parseable by this registration.
- Typecheck, strict tests (no skips), lint, graph, provenance, licence, and golden gates pass.

## Verification Commands

`pnpm typecheck`, `pnpm test:strict`, `pnpm lint`, `pnpm graph`, `pnpm provenance`, `pnpm licence`, `pnpm golden`, `pnpm dump:check`.
