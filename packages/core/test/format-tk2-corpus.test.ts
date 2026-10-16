// Corpus verification test for ticket 16.7:
// Proves that all 33 .tan, 6 .gph, and 5 .fnt files from the TK2 archive corpus
// parse with 0 trailing bytes and that referencing boards resolve them.

import { test } from "node:test";
import { deepEqual, equal } from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { unzipSync } from "fflate/browser";
import {
  BinaryReader,
  createAssetIndex,
  readLegacyFont,
  readSingleTile,
  readTileAnimation,
  resolveTileReference,
  type AssetKey,
} from "../src/index.ts";
const ARCHIVE_ROOT = "/Users/jensen/projects/rpgtoolkit-archive";

const CHIMERAN_ZIP =
  `${ARCHIVE_ROOT}/wayback/mysticsoftware.net/games.mysticsoftware.net/chimeran_empire.zip`;
const SCHOOL2_ZIP =
  `${ARCHIVE_ROOT}/wayback/mysticsoftware.net/games.mysticsoftware.net/School2Demo.zip`;
const CAOQUEST_ZIP =
  `${ARCHIVE_ROOT}/wayback/mysticsoftware.net/games.mysticsoftware.net/caoquest.zip`;
const FINAL_DESTINY_ZIP =
  `${ARCHIVE_ROOT}/archive-org/FinalDestiny_201810/Final_Destiny.zip`;

function unwrapZip(zipPath: string): Record<string, Uint8Array> {
  const outer = unzipSync(new Uint8Array(readFileSync(zipPath)));
  if (outer["zip.zip"] !== undefined) {
    return unzipSync(outer["zip.zip"]);
  }
  return outer;
}

const hasCorpus =
  existsSync(CHIMERAN_ZIP) &&
  existsSync(SCHOOL2_ZIP) &&
  existsSync(CAOQUEST_ZIP) &&
  existsSync(FINAL_DESTINY_ZIP);

test(
  "TK2 corpus verification: 33 .tan, 6 .gph, 5 .fnt parse cleanly and boards resolve",
  { skip: hasCorpus ? false : "TK2 archive zip files are not present on this machine" },
  () => {
  const chimeranFiles = unwrapZip(CHIMERAN_ZIP);
  const school2Files = unwrapZip(SCHOOL2_ZIP);
  const caoquestFiles = unwrapZip(CAOQUEST_ZIP);
  const finalDestinyFiles = unwrapZip(FINAL_DESTINY_ZIP);

  const allGameFiles = [
    { name: "ChimeranEmpire", files: chimeranFiles },
    { name: "School2Demo", files: school2Files },
    { name: "Caoquest", files: caoquestFiles },
    { name: "FinalDestiny", files: finalDestinyFiles },
  ];

  let tanCount = 0;
  let gphCount = 0;
  let fntCount = 0;

  for (const { name: gameName, files } of allGameFiles) {
    for (const [path, bytes] of Object.entries(files)) {
      const lower = path.toLowerCase();
      if (lower.endsWith(".tan")) {
        tanCount += 1;
        const res = readTileAnimation(new BinaryReader(bytes, path));
        equal(res.ok, true, `failed to read .tan file: ${gameName}/${path}`);
        if (res.ok) {
          equal(res.value.magic, "RPGTLKIT TILEANIM");
          equal(res.value.residue?.length ?? 0, 0, `${path} must have 0 residue bytes`);
          equal(res.value.frames.length, res.value.frameCount);
        }
      } else if (lower.endsWith(".gph")) {
        gphCount += 1;
        const res = readSingleTile(bytes, path);
        equal(res.ok, true, `failed to read .gph file: ${gameName}/${path}`);
        if (res.ok) {
          equal(res.value.magic, "RPGTLKIT TILE");
          equal(res.value.pixels.length, res.value.width * res.value.height);
        }
      } else if (lower.endsWith(".fnt")) {
        fntCount += 1;
        const res = readLegacyFont(bytes, path);
        equal(res.ok, true, `failed to read .fnt file: ${gameName}/${path}`);
        if (res.ok) {
          equal(res.value.magic, "RPGTLKIT FONT");
          equal(res.value.values.length, 2048);
        }
      }
    }
  }

  equal(tanCount, 33, "expected exactly 33 .tan files in the corpus");
  equal(gphCount, 6, "expected exactly 6 .gph files in the corpus");
  equal(fntCount, 5, "expected exactly 5 .fnt files in the corpus");

  // Verify referencing boards in Chimeran Empire resolve their .tan references
  const chimeranPaths = Object.keys(chimeranFiles);
  const chimeranIndex = createAssetIndex(chimeranPaths);
  const chimeranRoot = { kind: "game" as const, projectPath: "ChimeranEmpire" };

  // Beach 1.brd references "beach east.tan", "tree.tan", "tree2.tan", "water.tan"
  for (const tanRef of ["beach east.tan", "tree.tan", "tree2.tan", "water.tan"]) {
    const resolved = resolveTileReference(chimeranIndex, chimeranRoot, tanRef);
    equal(resolved.ok, true, `expected board reference ${tanRef} to resolve in Chimeran Empire`);
    if (resolved.ok) {
      equal(resolved.value.kind, "animatedTile");
      if (resolved.value.kind === "animatedTile") {
        equal(resolved.value.asset, `game/chimeranempire/tiles/${tanRef.toLowerCase()}` as AssetKey);
      }
    }
  }

  // School2Demo references bed.gph
  const school2Paths = Object.keys(school2Files);
  const school2Index = createAssetIndex(school2Paths);
  const school2Root = { kind: "game" as const, projectPath: "Schoolsout2" };
  const bedResolved = resolveTileReference(school2Index, school2Root, "bed.gph");
  equal(bedResolved.ok, true, "expected bed.gph to resolve in School2Demo");
  if (bedResolved.ok) {
    equal(bedResolved.value.kind, "singleTile");
    if (bedResolved.value.kind === "singleTile") {
      equal(bedResolved.value.asset, "game/schoolsout2/tiles/bed.gph" as AssetKey);
    }
  }
});
