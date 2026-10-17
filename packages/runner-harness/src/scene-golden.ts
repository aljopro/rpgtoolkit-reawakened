import { comparePngPixels } from "./png.ts";
import { runTracerScene, type TracerScene } from "./tracer.ts";

export type SceneGoldenInput = { readonly sceneText: string; readonly assets: readonly { readonly path: string; readonly bytes: Uint8Array }[]; readonly referencePng: Uint8Array; readonly ledgerText: string };
export type SceneGoldenOutcome = { readonly ok: boolean; readonly message: string; readonly drawHash: string; readonly stateHash: string };

/** Validate S-01's oracle metadata, run the core adapter, and compare decoded pixels exactly. */
export function checkSceneGolden(input: SceneGoldenInput): SceneGoldenOutcome {
  let scene: TracerScene;
  let ledger: { readonly schema: number; readonly goldens: readonly { readonly path: string; readonly scene: string; readonly class: string; readonly gating: boolean; readonly producer: string }[] };
  try { scene = JSON.parse(input.sceneText) as TracerScene; ledger = JSON.parse(input.ledgerText) as typeof ledger; }
  catch { return { ok: false, message: "scene or ledger JSON is invalid", drawHash: "", stateHash: "" }; }
  const entry = ledger.goldens.find((golden) => golden.scene === scene.name);
  if (ledger.schema !== 1 || entry?.path !== "golden/reference/S-01.png" || entry.class !== "independent-reference" || entry.gating !== true || entry.producer !== "4.4") return { ok: false, message: "S-01 ledger entry is missing or not a gating independent reference from producer 4.4", drawHash: "", stateHash: "" };
  const files = new Map(input.assets.map((asset) => [asset.path, asset.bytes]));
  const result = runTracerScene(scene, files);
  if (result.error !== null) return { ok: false, message: result.error, drawHash: result.drawHash, stateHash: result.stateHash };
  const compare = comparePngPixels(result.png, input.referencePng);
  if (compare.error !== null) return { ok: false, message: compare.error, drawHash: result.drawHash, stateHash: result.stateHash };
  if (!compare.equal) return { ok: false, message: `first differing pixel ${JSON.stringify(compare.firstDifference)}; maximum channel error ${compare.maxChannelError}`, drawHash: result.drawHash, stateHash: result.stateHash };
  return { ok: true, message: `${scene.name}: exact RGBA match (${entry.class}, gating=${entry.gating})`, drawHash: result.drawHash, stateHash: result.stateHash };
}
