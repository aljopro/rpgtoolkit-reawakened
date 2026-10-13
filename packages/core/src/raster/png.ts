/**
 * PNG encoding for the reference surface (AD-4).
 *
 * The rasteriser's output is reviewed by a person and diffed by CI, so it has
 * to be a file anyone can open: 8-bit RGBA, no palette, no interlacing, one
 * `IDAT` chunk. The deflate stream comes from `fflate`'s synchronous
 * `zlibSync` — the same allowlisted dependency the PNG decoder inflates with
 * (AD-6) — and every chunk carries its CRC-32, so a corrupted golden is a
 * located error rather than a silently wrong image.
 *
 * The bytes are a pure function of the pixels: same surface, same file.
 */

import { zlibSync } from "fflate/browser";
import { crc32 } from "../formats/image/crc32.ts";
import type { Surface } from "./surface.ts";

const SIGNATURE = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

/** Encode a surface as an 8-bit RGBA PNG (AD-4). */
export function encodePng(surface: Surface): Uint8Array {
  const parts: Uint8Array[] = [SIGNATURE, chunk("IHDR", encodeHeader(surface)), chunk("IDAT", deflate(surface)), chunk("IEND", new Uint8Array(0))];
  return concat(parts);
}

/** `IHDR`: width, height, bit depth 8, colour type 6 (RGBA), no filter trick, no interlace. */
function encodeHeader(surface: Surface): Uint8Array {
  const header = new Uint8Array(13);
  writeUint32(header, 0, surface.width);
  writeUint32(header, 4, surface.height);
  header[8] = 8;
  header[9] = 6;
  header[10] = 0;
  header[11] = 0;
  header[12] = 0;
  return header;
}

/**
 * One filter byte (`0`, no filtering) per row, then the row's bytes, deflated.
 * A stored filter would cost an extra pass for no gain: the reference output is
 * what a person eyes and a hash compares, and no filtering keeps the two
 * identical on every engine.
 */
function deflate(surface: Surface): Uint8Array {
  const stride = surface.width * 4;
  const raw = new Uint8Array(surface.height * (stride + 1));
  for (let y = 0; y < surface.height; y += 1) {
    const at = y * (stride + 1);
    raw[at] = 0;
    raw.set(surface.rgba.subarray(y * stride, y * stride + stride), at + 1);
  }
  return zlibSync(raw);
}

/** One PNG chunk: length, type, data, CRC-32 over the type and data. */
function chunk(type: string, data: Uint8Array): Uint8Array {
  const out = new Uint8Array(12 + data.length);
  writeUint32(out, 0, data.length);
  for (let i = 0; i < 4; i += 1) {
    out[4 + i] = type.charCodeAt(i);
  }
  out.set(data, 8);
  writeUint32(out, 8 + data.length, crc32(out.subarray(4, 8 + data.length)));
  return out;
}

/** Big-endian `u32`, the byte order every PNG field uses. */
function writeUint32(out: Uint8Array, at: number, value: number): void {
  out[at] = (value >>> 24) & 0xff;
  out[at + 1] = (value >>> 16) & 0xff;
  out[at + 2] = (value >>> 8) & 0xff;
  out[at + 3] = value & 0xff;
}

/** Concatenate byte spans into one buffer. */
function concat(parts: readonly Uint8Array[]): Uint8Array {
  let total = 0;
  for (const part of parts) {
    total += part.length;
  }
  const out = new Uint8Array(total);
  let at = 0;
  for (const part of parts) {
    out.set(part, at);
    at += part.length;
  }
  return out;
}
