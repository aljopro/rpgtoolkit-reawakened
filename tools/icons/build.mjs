// Build the logo's icon set from the master image (media/tkr.png).
//
//   node tools/icons/build.mjs [--src media/tkr.png] [--out media/icons]
//
// Writes, under `--out`:
//
//   png/tkr-<size>.png   transparent PNGs, one per size in PNG_SIZES
//   favicon.ico          16, 32 and 48 px, for a web page's favicon
//   tkr.ico              16 to 256 px, for a Windows app icon
//   tkr.icns             16 to 1024 px (with the @2x slots), for a macOS app icon
//
// It uses only Node's own `zlib`, so it adds no dependency (guard-rail G6) and
// runs the same on every platform. The master is decoded, scaled down with an
// area-average filter on premultiplied alpha (so a transparent edge never
// bleeds dark), centred on a square canvas with a small transparent margin, and
// re-encoded. Output is deterministic for a given master and Node's zlib.
//
// The master is never upscaled: every size is at most its own width.
import { deflateSync, inflateSync, crc32 } from "node:zlib";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

/** Sizes written as standalone PNGs (16 to 1024; 180/192/512 cover touch icons and PWA manifests). */
export const PNG_SIZES = [16, 24, 32, 48, 64, 96, 128, 180, 192, 256, 512, 1024];
/** Transparent margin on each side, as a share of the icon's size. */
export const MARGIN = 0.06;

const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

/** @typedef {{ width: number, height: number, data: Uint8Array }} Image  RGBA, 8 bits per channel, row-major */

/** Decode an 8-bit, non-interlaced RGB or RGBA PNG into straight-alpha RGBA. */
export function decodePng(bytes) {
  const buf = Buffer.from(bytes);
  if (!buf.subarray(0, 8).equals(PNG_SIGNATURE)) throw new Error("not a PNG file");
  let width = 0;
  let height = 0;
  let colourType = -1;
  const idat = [];
  for (let at = 8; at < buf.length; ) {
    const length = buf.readUInt32BE(at);
    const type = buf.toString("latin1", at + 4, at + 8);
    const body = buf.subarray(at + 8, at + 8 + length);
    if (type === "IHDR") {
      width = body.readUInt32BE(0);
      height = body.readUInt32BE(4);
      const depth = body[8];
      colourType = body[9];
      if (depth !== 8 || (colourType !== 2 && colourType !== 6)) {
        throw new Error(`unsupported PNG: bit depth ${depth}, colour type ${colourType} (need 8-bit RGB or RGBA)`);
      }
      if (body[12] !== 0) throw new Error("unsupported PNG: interlaced");
    } else if (type === "IDAT") {
      idat.push(body);
    } else if (type === "IEND") {
      break;
    }
    at += 12 + length;
  }
  if (width === 0 || height === 0) throw new Error("PNG has no IHDR");

  const bpp = colourType === 6 ? 4 : 3;
  const stride = width * bpp;
  const raw = inflateSync(Buffer.concat(idat));
  if (raw.length !== (stride + 1) * height) throw new Error("PNG pixel data has the wrong length");

  const out = new Uint8Array(width * height * 4);
  const prev = new Uint8Array(stride);
  const line = new Uint8Array(stride);
  for (let y = 0; y < height; y++) {
    const filter = raw[y * (stride + 1)];
    const src = raw.subarray(y * (stride + 1) + 1, (y + 1) * (stride + 1));
    for (let x = 0; x < stride; x++) {
      const a = x >= bpp ? line[x - bpp] : 0;
      const b = prev[x];
      const c = x >= bpp ? prev[x - bpp] : 0;
      let predictor = 0;
      if (filter === 1) predictor = a;
      else if (filter === 2) predictor = b;
      else if (filter === 3) predictor = (a + b) >> 1;
      else if (filter === 4) {
        const p = a + b - c;
        const pa = Math.abs(p - a);
        const pb = Math.abs(p - b);
        const pc = Math.abs(p - c);
        predictor = pa <= pb && pa <= pc ? a : pb <= pc ? b : c;
      } else if (filter !== 0) throw new Error(`PNG row ${y} has filter type ${filter}`);
      line[x] = (src[x] + predictor) & 0xff;
    }
    for (let x = 0; x < width; x++) {
      const o = (y * width + x) * 4;
      out[o] = line[x * bpp];
      out[o + 1] = line[x * bpp + 1];
      out[o + 2] = line[x * bpp + 2];
      out[o + 3] = bpp === 4 ? line[x * bpp + 3] : 255;
    }
    prev.set(line);
  }
  return { width, height, data: out };
}

function chunk(type, body) {
  const head = Buffer.alloc(8);
  head.writeUInt32BE(body.length, 0);
  head.write(type, 4, "latin1");
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([head.subarray(4), body])), 0);
  return Buffer.concat([head, body, crc]);
}

/** Encode straight-alpha RGBA as an 8-bit RGBA PNG (filter 0, best compression). */
export function encodePng(image) {
  const { width, height, data } = image;
  const header = Buffer.alloc(13);
  header.writeUInt32BE(width, 0);
  header.writeUInt32BE(height, 4);
  header[8] = 8;
  header[9] = 6;
  const stride = width * 4;
  const raw = Buffer.alloc((stride + 1) * height);
  for (let y = 0; y < height; y++) {
    raw.set(data.subarray(y * stride, (y + 1) * stride), y * (stride + 1) + 1);
  }
  return Buffer.concat([
    PNG_SIGNATURE,
    chunk("IHDR", header),
    chunk("IDAT", deflateSync(raw, { level: 9 })),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

/**
 * Scale `image` to `width` x `height` with an area-average (box) filter on
 * premultiplied alpha. Intended for scaling down; scaling up repeats pixels.
 */
export function resize(image, width, height) {
  const { width: sw, height: sh, data } = image;
  // Pass 1: horizontal, into a float buffer of premultiplied RGBA (sw columns -> width).
  const mid = new Float32Array(width * sh * 4);
  for (let dx = 0; dx < width; dx++) {
    const from = (dx * sw) / width;
    const to = ((dx + 1) * sw) / width;
    for (let sx = Math.floor(from); sx < Math.min(sw, Math.ceil(to)); sx++) {
      const weight = Math.min(sx + 1, to) - Math.max(sx, from);
      for (let y = 0; y < sh; y++) {
        const s = (y * sw + sx) * 4;
        const o = (y * width + dx) * 4;
        const alpha = (data[s + 3] / 255) * weight;
        mid[o] += data[s] * alpha;
        mid[o + 1] += data[s + 1] * alpha;
        mid[o + 2] += data[s + 2] * alpha;
        mid[o + 3] += alpha;
      }
    }
  }
  // Pass 2: vertical, normalised by the covered area, then un-premultiplied.
  const out = new Uint8Array(width * height * 4);
  const acc = new Float64Array(4);
  for (let dy = 0; dy < height; dy++) {
    const from = (dy * sh) / height;
    const to = ((dy + 1) * sh) / height;
    for (let dx = 0; dx < width; dx++) {
      acc.fill(0);
      for (let sy = Math.floor(from); sy < Math.min(sh, Math.ceil(to)); sy++) {
        const weight = Math.min(sy + 1, to) - Math.max(sy, from);
        const m = (sy * width + dx) * 4;
        acc[0] += mid[m] * weight;
        acc[1] += mid[m + 1] * weight;
        acc[2] += mid[m + 2] * weight;
        acc[3] += mid[m + 3] * weight;
      }
      const area = ((to - from) * sw) / width;
      const o = (dy * width + dx) * 4;
      const alpha = acc[3] / area;
      if (alpha > 0) {
        out[o] = Math.round(acc[0] / acc[3]);
        out[o + 1] = Math.round(acc[1] / acc[3]);
        out[o + 2] = Math.round(acc[2] / acc[3]);
      }
      out[o + 3] = Math.round(alpha * 255);
    }
  }
  return { width, height, data: out };
}

/** A square icon of `size` px: `master` scaled into the canvas, inside a transparent margin. */
export function renderIcon(master, size, margin = MARGIN) {
  const inner = Math.max(1, Math.round(size * (1 - 2 * margin)));
  const art = resize(master, inner, inner);
  const offset = Math.floor((size - inner) / 2);
  const data = new Uint8Array(size * size * 4);
  for (let y = 0; y < inner; y++) {
    data.set(art.data.subarray(y * inner * 4, (y + 1) * inner * 4), ((y + offset) * size + offset) * 4);
  }
  return { width: size, height: size, data };
}

/** An ICO file holding `entries` (`{ size, png }`), each stored as an embedded PNG. */
export function buildIco(entries) {
  const head = Buffer.alloc(6 + 16 * entries.length);
  head.writeUInt16LE(1, 2); // type: icon
  head.writeUInt16LE(entries.length, 4);
  let offset = head.length;
  entries.forEach(({ size, png }, i) => {
    const at = 6 + 16 * i;
    head[at] = size >= 256 ? 0 : size; // 0 means 256
    head[at + 1] = size >= 256 ? 0 : size;
    head.writeUInt16LE(1, at + 4); // colour planes
    head.writeUInt16LE(32, at + 6); // bits per pixel
    head.writeUInt32LE(png.length, at + 8);
    head.writeUInt32LE(offset, at + 12);
    offset += png.length;
  });
  return Buffer.concat([head, ...entries.map((e) => e.png)]);
}

/** ICNS slots: `[type, size in px]`. The @2x slots reuse the next size up. */
export const ICNS_SLOTS = [
  ["icp4", 16],
  ["icp5", 32],
  ["ic07", 128],
  ["ic08", 256],
  ["ic09", 512],
  ["ic10", 1024],
  ["ic11", 32],
  ["ic12", 64],
  ["ic13", 256],
  ["ic14", 512],
];

/** An ICNS file; `pngBySize` maps each size in ICNS_SLOTS to its PNG bytes. */
export function buildIcns(pngBySize) {
  const parts = ICNS_SLOTS.map(([type, size]) => {
    const png = pngBySize.get(size);
    if (png === undefined) throw new Error(`no ${size}px PNG for ICNS slot ${type}`);
    const head = Buffer.alloc(8);
    head.write(type, 0, "latin1");
    head.writeUInt32BE(png.length + 8, 4);
    return Buffer.concat([head, png]);
  });
  const total = 8 + parts.reduce((sum, part) => sum + part.length, 0);
  const head = Buffer.alloc(8);
  head.write("icns", 0, "latin1");
  head.writeUInt32BE(total, 4);
  return Buffer.concat([head, ...parts]);
}

/** Build every output as `{ path (relative to the out dir), bytes }`. */
export function buildAll(master) {
  const pngs = new Map();
  for (const size of PNG_SIZES) {
    if (size > master.width) throw new Error(`the master is ${master.width}px; ${size}px would be an upscale`);
    pngs.set(size, encodePng(renderIcon(master, size)));
  }
  const entry = (size) => ({ size, png: pngs.get(size) });
  const files = PNG_SIZES.map((size) => ({ path: join("png", `tkr-${size}.png`), bytes: pngs.get(size) }));
  files.push({ path: "favicon.ico", bytes: buildIco([16, 32, 48].map(entry)) });
  files.push({ path: "tkr.ico", bytes: buildIco([16, 24, 32, 48, 64, 128, 256].map(entry)) });
  files.push({ path: "tkr.icns", bytes: buildIcns(pngs) });
  return files;
}

function main(argv) {
  const root = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
  let src = join(root, "media", "tkr.png");
  let out = join(root, "media", "icons");
  for (let i = 0; i < argv.length; i += 2) {
    if (argv[i] === "--src" && argv[i + 1] !== undefined) src = resolve(argv[i + 1]);
    else if (argv[i] === "--out" && argv[i + 1] !== undefined) out = resolve(argv[i + 1]);
    else throw new Error(`usage: node tools/icons/build.mjs [--src <png>] [--out <dir>] (got ${argv[i]})`);
  }
  const master = decodePng(readFileSync(src));
  if (master.width !== master.height) throw new Error(`the master must be square; it is ${master.width}x${master.height}`);
  const files = buildAll(master);
  for (const { path, bytes } of files) {
    const target = join(out, path);
    mkdirSync(dirname(target), { recursive: true });
    writeFileSync(target, bytes);
  }
  console.log(`${files.length} files written to ${out} from ${src} (${master.width}px)`);
}

if (process.argv[1] !== undefined && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    main(process.argv.slice(2));
  } catch (error) {
    console.error(`tools/icons/build.mjs: ${error instanceof Error ? error.message : String(error)}`);
    process.exit(1);
  }
}
