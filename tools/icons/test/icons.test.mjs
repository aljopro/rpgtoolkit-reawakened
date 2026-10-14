import assert from "node:assert/strict";
import { test } from "node:test";
import {
  ICNS_SLOTS,
  buildIcns,
  buildIco,
  decodePng,
  encodePng,
  renderIcon,
  resize,
} from "../build.mjs";

/** A `size` x `size` image: opaque left half in `colour`, fully transparent right half. */
function halfImage(size, colour) {
  const data = new Uint8Array(size * size * 4);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size / 2; x++) data.set([...colour, 255], (y * size + x) * 4);
  }
  return { width: size, height: size, data };
}

test("a PNG survives an encode and decode round trip, including transparent pixels", () => {
  const image = halfImage(8, [200, 30, 40]);
  const back = decodePng(encodePng(image));
  assert.equal(back.width, 8);
  assert.deepEqual([...back.data], [...image.data]);
});

test("scaling down keeps an edge's colour: a transparent neighbour does not darken it", () => {
  const scaled = resize(halfImage(16, [200, 30, 40]), 4, 4);
  for (let y = 0; y < 4; y++) {
    const left = (y * 4) * 4;
    const right = (y * 4 + 3) * 4;
    assert.deepEqual([...scaled.data.subarray(left, left + 4)], [200, 30, 40, 255]);
    assert.equal(scaled.data[right + 3], 0);
  }
  // Column 2 sits exactly on the opaque/transparent boundary of the 16px source.
  const seam = resize(halfImage(16, [200, 30, 40]), 2, 2);
  assert.deepEqual([...seam.data.subarray(0, 4)], [200, 30, 40, 255]);
});

test("an icon has a transparent margin all the way round", () => {
  const solid = { width: 64, height: 64, data: new Uint8Array(64 * 64 * 4).fill(255) };
  const icon = renderIcon(solid, 32, 0.25);
  const alphaAt = (x, y) => icon.data[(y * 32 + x) * 4 + 3];
  assert.equal(alphaAt(0, 0), 0);
  assert.equal(alphaAt(31, 31), 0);
  assert.equal(alphaAt(7, 16), 0);
  assert.equal(alphaAt(8, 16), 255);
  assert.equal(alphaAt(23, 16), 255);
  assert.equal(alphaAt(24, 16), 0);
});

test("an ICO's directory points at each embedded PNG, with 256px stored as 0", () => {
  const small = encodePng(halfImage(16, [1, 2, 3]));
  const large = encodePng(halfImage(32, [1, 2, 3]));
  const ico = buildIco([
    { size: 16, png: small },
    { size: 256, png: large },
  ]);
  assert.equal(ico.readUInt16LE(2), 1);
  assert.equal(ico.readUInt16LE(4), 2);
  assert.equal(ico[6], 16);
  assert.equal(ico[6 + 16], 0);
  const entryAt = (i) => ({ length: ico.readUInt32LE(6 + 16 * i + 8), offset: ico.readUInt32LE(6 + 16 * i + 12) });
  assert.deepEqual(ico.subarray(entryAt(0).offset, entryAt(0).offset + entryAt(0).length), small);
  assert.deepEqual(ico.subarray(entryAt(1).offset, entryAt(1).offset + entryAt(1).length), large);
});

test("an ICNS's length fields add up and every slot is present", () => {
  const png = encodePng(halfImage(4, [9, 9, 9]));
  const sizes = new Map(ICNS_SLOTS.map(([, size]) => [size, png]));
  const icns = buildIcns(sizes);
  assert.equal(icns.toString("latin1", 0, 4), "icns");
  assert.equal(icns.readUInt32BE(4), icns.length);
  const types = [];
  for (let at = 8; at < icns.length; ) {
    types.push(icns.toString("latin1", at, at + 4));
    at += icns.readUInt32BE(at + 4);
  }
  assert.deepEqual(types, ICNS_SLOTS.map(([type]) => type));
  assert.throws(() => buildIcns(new Map()), /no 16px PNG/);
});
