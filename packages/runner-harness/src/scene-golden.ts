import { comparePngPixels } from "./png.ts";
import { runTracerScene, type TracerScene } from "./tracer.ts";

export type SceneGoldenInput = {
  readonly sceneText: string;
  readonly assets: readonly { readonly path: string; readonly bytes: Uint8Array }[];
  readonly referencePng: Uint8Array;
  readonly ledgerText: string;
};
export type SceneGoldenOutcome = { readonly ok: boolean; readonly message: string; readonly drawHash: string; readonly stateHash: string };

type LedgerEntry = { readonly path: string; readonly scene: string; readonly class: string; readonly gating: boolean; readonly producer: string };
type Ledger = { readonly schema: number; readonly goldens: readonly LedgerEntry[] };

function readLedger(text: string): Ledger {
  const ledger = JSON.parse(text) as Ledger;
  if (ledger.schema !== 1 || !Array.isArray(ledger.goldens)) throw new Error("ledger schema must be 1 with a goldens array");
  for (const entry of ledger.goldens) {
    if (typeof entry.path !== "string" || typeof entry.scene !== "string" || typeof entry.class !== "string" || typeof entry.gating !== "boolean" || typeof entry.producer !== "string" || entry.producer === "") throw new Error(`ledger entry for ${entry.scene || "<unnamed>"} lacks path, class, gating or producer`);
    if (entry.class === "legacy-screenshot" && entry.gating) throw new Error(`${entry.scene}: legacy-screenshot entries cannot gate`);
    if (!["independent-reference", "regression-baseline", "legacy-screenshot"].includes(entry.class)) throw new Error(`${entry.scene}: unknown golden class ${entry.class}`);
  }
  return ledger;
}

function checkScene(input: SceneGoldenInput, ledger: Ledger): SceneGoldenOutcome {
  let scene: TracerScene;
  try {
    scene = JSON.parse(input.sceneText) as TracerScene;
  } catch {
    return { ok: false, message: "scene JSON is invalid", drawHash: "", stateHash: "" };
  }
  const entry = ledger.goldens.find((golden) => golden.scene === scene.name);
  if (entry === undefined) return { ok: false, message: `${scene.name}: no ledger entry`, drawHash: "", stateHash: "" };
  if (entry.path !== `golden/reference/${scene.name}.png` && entry.path !== `golden/regression/${scene.name}.png`) return { ok: false, message: `${scene.name}: ledger path is not a supported oracle path`, drawHash: "", stateHash: "" };
  const files = new Map(input.assets.map((asset) => [asset.path, asset.bytes]));
  const result = runTracerScene(scene, files);
  const flushed = runTracerScene(scene, files);
  if (result.error !== null) return { ok: false, message: `${scene.name}: ${result.error}`, drawHash: result.drawHash, stateHash: result.stateHash };
  if (flushed.error !== null || flushed.drawHash !== result.drawHash || flushed.stateHash !== result.stateHash || flushed.ticks.length !== result.ticks.length || flushed.pixels.length !== result.pixels.length || flushed.pixels.some((value, index) => value !== result.pixels[index])) return { ok: false, message: `${scene.name}: cache-flush replay changed pixels or hashes`, drawHash: result.drawHash, stateHash: result.stateHash };
  const compare = comparePngPixels(result.png, input.referencePng);
  if (compare.error !== null) return { ok: false, message: `${scene.name}: ${compare.error}`, drawHash: result.drawHash, stateHash: result.stateHash };
  if (!compare.equal && entry.class !== "legacy-screenshot") return { ok: false, message: `${scene.name}: first differing pixel ${JSON.stringify(compare.firstDifference)}; maximum channel error ${compare.maxChannelError}`, drawHash: result.drawHash, stateHash: result.stateHash };
  const metric = compare.equal ? "exact RGBA match" : `reported legacy screenshot (max channel error ${compare.maxChannelError})`;
  return { ok: true, message: `${scene.name}: ${metric} (${entry.class}, gating=${entry.gating}, producer=${entry.producer}); cache-flush and per-tick hashes stable`, drawHash: result.drawHash, stateHash: result.stateHash };
}

/** Validate one independent-reference scene, retained as the focused public helper used by existing tests. */
export function checkSceneGolden(input: SceneGoldenInput): SceneGoldenOutcome {
  try {
    const ledger = readLedger(input.ledgerText);
    const outcome = checkScene(input, ledger);
    if (!outcome.ok) return outcome;
    const scene = JSON.parse(input.sceneText) as TracerScene;
    const entry = ledger.goldens.find((golden) => golden.scene === scene.name);
    if (entry?.class !== "independent-reference" || entry.gating !== true) return { ...outcome, ok: false, message: `${scene.name} ledger entry is missing or not a gating independent reference` };
    return outcome;
  } catch (error) {
    return { ok: false, message: error instanceof Error ? error.message : String(error), drawHash: "", stateHash: "" };
  }
}

/** Run every ledger scene and reject missing/orphaned scene metadata before pixel comparison. */
export function checkSceneGoldens(inputs: readonly SceneGoldenInput[], ledgerText: string): { readonly ok: boolean; readonly lines: readonly string[] } {
  try {
    const ledger = readLedger(ledgerText);
    const names = new Set(inputs.map((input) => (JSON.parse(input.sceneText) as { readonly name?: unknown }).name));
    for (const entry of ledger.goldens) {
      if (!names.has(entry.scene)) throw new Error(`${entry.scene}: ledger scene is missing`);
    }
    const seen = new Set<string>();
    const lines: string[] = [];
    for (const input of inputs) {
      const scene = JSON.parse(input.sceneText) as { readonly name?: unknown };
      if (typeof scene.name !== "string" || seen.has(scene.name)) throw new Error("scene names must be unique and non-empty");
      seen.add(scene.name);
      const outcome = checkScene(input, ledger);
      if (!outcome.ok) throw new Error(outcome.message);
      lines.push(`${outcome.message}; draw=${outcome.drawHash}; state=${outcome.stateHash}`);
    }
    if (seen.size !== ledger.goldens.length) throw new Error(`ledger has ${ledger.goldens.length} entries but ${seen.size} scenes were replayed`);
    return { ok: true, lines };
  } catch (error) {
    return { ok: false, lines: [error instanceof Error ? error.message : String(error)] };
  }
}
