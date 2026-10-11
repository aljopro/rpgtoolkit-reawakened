import {
  canon,
  fnv1a64,
  hashDrawList,
  hashState,
  type DrawList,
  type PlainData,
} from "@rpgtoolkit/core";

function doubleFromHex(hex: string): number {
  const buf = new ArrayBuffer(8);
  const view = new DataView(buf);
  view.setBigUint64(0, BigInt("0x" + hex));
  return view.getFloat64(0);
}

function hexToBytes(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = Number.parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  }
  return bytes;
}

export function checkVectors(text: string): { count: number } {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch (e) {
    throw new Error(
      `hash-vectors.json: invalid JSON: ${e instanceof Error ? e.message : String(e)}`,
    );
  }

  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
    throw new Error("hash-vectors.json: root must be an object");
  }

  const root = parsed as Record<string, unknown>;

  const canonRows = Array.isArray(root.canon) ? root.canon : [];
  const fnvRows = Array.isArray(root.fnv1a64) ? root.fnv1a64 : [];
  const stateRows = Array.isArray(root.hashState) ? root.hashState : [];
  const drawRows = Array.isArray(root.hashDrawList) ? root.hashDrawList : [];
  const revRows = Array.isArray(root.rev) ? root.rev : [];

  const totalCount =
    canonRows.length +
    fnvRows.length +
    stateRows.length +
    drawRows.length +
    revRows.length;

  if (totalCount === 0) {
    throw new Error("hash-vectors.json: zero vector rows");
  }

  for (const row of canonRows) {
    const r = row as Record<string, unknown>;
    const id = String(r.id);
    let actual: string;
    if (typeof r.bits === "string") {
      actual = canon(doubleFromHex(r.bits));
    } else {
      actual = canon(r.input as PlainData);
    }
    const expected = String(r.canonical);
    if (actual !== expected) {
      throw new Error(
        `vector ${id}: canon mismatch (expected ${expected}, actual ${actual})`,
      );
    }
  }

  for (const row of fnvRows) {
    const r = row as Record<string, unknown>;
    const id = String(r.id);
    let actual: string;
    if (typeof r.hex === "string") {
      actual = fnv1a64(hexToBytes(r.hex));
    } else {
      actual = fnv1a64(String(r.utf8));
    }
    const expected = String(r.hash);
    if (actual !== expected) {
      throw new Error(
        `vector ${id}: fnv1a64 mismatch (expected ${expected}, actual ${actual})`,
      );
    }
  }

  for (const row of stateRows) {
    const r = row as Record<string, unknown>;
    const id = String(r.id);
    const actual = hashState(r.input as PlainData);
    const expected = String(r.hash);
    if (actual !== expected) {
      throw new Error(
        `vector ${id}: hashState mismatch (expected ${expected}, actual ${actual})`,
      );
    }
  }

  for (const row of drawRows) {
    const r = row as Record<string, unknown>;
    const id = String(r.id);
    const actual = hashDrawList(r.input as DrawList);
    const expected = String(r.hash);
    if (actual !== expected) {
      throw new Error(
        `vector ${id}: hashDrawList mismatch (expected ${expected}, actual ${actual})`,
      );
    }
  }

  for (const row of revRows) {
    const r = row as Record<string, unknown>;
    const id = String(r.id);
    const hashA = hashDrawList(r.a as DrawList);
    const hashB = hashDrawList(r.b as DrawList);
    if (hashA === hashB) {
      throw new Error(
        `vector ${id}: rev pair hashes must differ (expected differing hashes, actual ${hashA})`,
      );
    }
  }

  return { count: totalCount };
}
