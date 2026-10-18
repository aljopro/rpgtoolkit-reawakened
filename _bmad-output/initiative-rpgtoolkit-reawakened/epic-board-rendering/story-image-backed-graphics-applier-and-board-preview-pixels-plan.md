---
ticket: 35
type: feature
status: done
---

# Image-backed graphics applier and board preview pixels

## Intent

Complete image-backed surface effects and board-preview rendering using decoded RGBA assets supplied through the engine's AD-5 asset reply loop.

## Change

- Decode requested bitmap assets in the core image decoder and retain decoded textures only in the engine cache, outside saveable state.
- Apply image effects to persistent surfaces only after the asset reply succeeds; missing or invalid assets produce located diagnostics and leave the destination unchanged.
- Feed decoded board image assets into `composeBoard` for both 2D and isometric previews and ensure board hydration requests image dependencies.
- Preserve surface revision and reset/cache-flush determinism, with authored pixel fixtures and focused regressions.

## Ruling

**Proposed ruling (pending owner review):** Existing graphics names (`bitmap`, `setimage`, `setimagetransparent`, `setimagetranslucent`, `setimageadditive`) are the documented image command surface; the ticket's `image`, `drawImage`, `drawImagePart`, `imagePut`, and `imageLoad` wording names the applier/effect operations rather than additional catalogue commands. Rejected alternative: add undocumented commands with guessed signatures, which would change the catalogue contract without docs/spec support.

## Verification

Main agent should run the complete gate set, including strict tests, golden Node/Bun runs, catalogue and command-doc checks, oracle and provenance gates. Focused checks cover requested image replies, missing-image atomicity, key/alpha/additive blits, board image dependencies and 2D/iso draw-list rasterization.
