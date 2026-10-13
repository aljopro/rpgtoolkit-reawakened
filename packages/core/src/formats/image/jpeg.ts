/**
 * Baseline JPEG decoding for `decodeTexture` (format-spec §10, AD-28).
 *
 * Hand-written rather than delegated to `jpeg-js`. That library fails the
 * "prefer the library" test this ticket sets: its shipped `index.d.ts` names
 * Node's `Buffer` (`type BufferRet = RawImageData<Buffer>`, `type BufferLike =
 * Buffer | …`), so under `core`'s `"types": []` it only type-checks because
 * `skipLibCheck` hides the missing global — `tsc` without it reports TS2591
 * "Cannot find name 'Buffer'". It is also a CommonJS module (`module.exports`,
 * `require('./lib/…')`) with a `window` fallback branch. The evidence is in the
 * story plan. This decoder touches no host global at all (G2).
 *
 * It handles the Baseline sequential DCT process (SOF0) and the 8-bit extended
 * sequential process (SOF1) — the two share one decoding path — one or three
 * components with any sampling factor from 1×1 to 4×4 (the fixtures are
 * 4:2:0), Huffman-coded entropy data (DHT) with optional restart intervals,
 * dequantisation, a separable floating-point IDCT over `+ - * /` with a fixed
 * evaluation order, nearest-neighbour chroma upsampling and YCbCr→RGB (or
 * component-copy for an Adobe RGB transform). Anything else — progressive
 * (SOF2), 12-bit, CMYK/YCCK, a spectral-selection scan — comes back as a
 * located `FormatError` (AD-18), never a wrong picture.
 */

import { err, ok, type Result } from "../result.ts";
import type { DecodedTexture } from "./model.ts";

const SECTION = "format-spec §10";

/**
 * The largest image this decoder will allocate for, in pixels. A header is
 * untrusted input, so a `width × height` beyond this is refused instead of
 * attempting the allocation.
 */
const MAX_PIXELS = 100_000_000;

/** Zig-zag scan order: `ZIGZAG[k]` is the natural index of coefficient `k`. */
const ZIGZAG: readonly number[] = [
  0, 1, 8, 16, 9, 2, 3, 10, 17, 24, 32, 25, 18, 11, 4, 5, 12, 19, 26, 33, 40, 48, 41, 34, 27, 20,
  13, 6, 7, 14, 21, 28, 35, 42, 49, 56, 57, 50, 43, 36, 29, 22, 15, 23, 30, 37, 44, 51, 58, 59,
  52, 45, 38, 31, 39, 46, 53, 60, 61, 54, 47, 55, 62, 63,
];

/**
 * The 1-D inverse-DCT basis `BASIS[u][x] = 0.5 · C(u) · cos((2x+1)·u·π/16)`,
 * with `C(0) = 1/√2` and `C(u) = 1` otherwise. Two half-factors give the 1/4 of
 * the double sum, so `f(x,y) = ΣΣ BASIS[u][x]·BASIS[v][y]·F(u,v)`. The values
 * are literals because `Math.cos` and `Math.PI` are outside G3's allowlist, and
 * literal doubles are identical on every engine.
 */
const BASIS: readonly (readonly number[])[] = [
  [
    0.35355339059327373, 0.35355339059327373, 0.35355339059327373, 0.35355339059327373,
    0.35355339059327373, 0.35355339059327373, 0.35355339059327373, 0.35355339059327373,
  ],
  [
    0.4903926402016152, 0.4157348061512726, 0.27778511650980114, 0.09754516100806417,
    -0.0975451610080641, -0.277785116509801, -0.4157348061512727, -0.4903926402016152,
  ],
  [
    0.46193976625564337, 0.19134171618254492, -0.19134171618254486, -0.46193976625564337,
    -0.4619397662556434, -0.19134171618254517, 0.191341716182545, 0.46193976625564326,
  ],
  [
    0.4157348061512726, -0.0975451610080641, -0.4903926402016152, -0.2777851165098011,
    0.2777851165098009, 0.4903926402016152, 0.09754516100806439, -0.41573480615127256,
  ],
  [
    0.3535533905932738, -0.35355339059327373, -0.35355339059327384, 0.3535533905932737,
    0.35355339059327384, -0.35355339059327334, -0.3535533905932736, 0.3535533905932733,
  ],
  [
    0.27778511650980114, -0.4903926402016152, 0.09754516100806415, 0.41573480615127273,
    -0.41573480615127256, -0.09754516100806401, 0.4903926402016153, -0.27778511650980076,
  ],
  [
    0.19134171618254492, -0.4619397662556434, 0.46193976625564326, -0.19134171618254495,
    -0.19134171618254528, 0.46193976625564337, -0.4619397662556432, 0.19134171618254478,
  ],
  [
    0.09754516100806417, -0.2777851165098011, 0.41573480615127273, -0.4903926402016153,
    0.4903926402016152, -0.4157348061512725, 0.27778511650980076, -0.09754516100806429,
  ],
];

/** A quantisation table in natural (de-zig-zagged) order. */
interface QuantTable {
  readonly values: Int32Array;
}

/** A canonical Huffman table with the T.81 Annex F decode arrays. */
interface HuffmanTable {
  /** Smallest code of each length (indexed 1–16). */
  readonly minCode: Int32Array;
  /** Largest code of each length (indexed 1–16; `-1` when the length is unused). */
  readonly maxCode: Int32Array;
  /** Offset into `values` of the first symbol of each length (1–16). */
  readonly valPtr: Int32Array;
  /** The symbols in canonical order. */
  readonly values: Uint8Array;
}

/** One frame component and its decoded sample plane. */
interface Component {
  readonly id: number;
  /** Horizontal sampling factor (1–4). */
  readonly h: number;
  /** Vertical sampling factor (1–4). */
  readonly v: number;
  /** Which quantisation table the component uses (0–3). */
  readonly quantId: number;
  /** Blocks per line in the component's own grid. */
  readonly blocksPerLine: number;
  /** Blocks per column in the component's own grid. */
  readonly blocksPerColumn: number;
  /** `blocksPerLine·8 × blocksPerColumn·8` samples, 0–255. */
  readonly plane: Uint8Array;
}

/** A parsed SOF0 frame. */
interface Frame {
  readonly width: number;
  readonly height: number;
  /** The largest horizontal sampling factor across the components. */
  readonly maxH: number;
  /** The largest vertical sampling factor across the components. */
  readonly maxV: number;
  /** MCUs per line across the frame. */
  readonly mcuColumns: number;
  /** MCU rows across the frame. */
  readonly mcuRows: number;
  readonly components: Component[];
}

/** One component of a scan, with the tables it uses and its DC predictor slot. */
interface ScanComponent {
  readonly component: Component;
  readonly quant: QuantTable;
  readonly dc: HuffmanTable;
  readonly ac: HuffmanTable;
  /** Index into the frame's component list, for the DC predictor array. */
  readonly predictor: number;
}

/** A located error while decoding a JPEG (AD-18). */
function fail(offset: number, message: string, path?: string): Result<never> {
  return err({ ...(path === undefined ? {} : { path }), offset, section: SECTION, message });
}

/**
 * A marker-aware bit reader over the entropy-coded scan. Bytes are delivered
 * MSB-first; `FF 00` is the stuffed form of a data byte `FF`, and a real marker
 * ends the scan. `overrun` records that a read needed a byte that was not
 * there, which makes a truncated file an error instead of silent garbage.
 */
class BitReader {
  private readonly data: Uint8Array;
  /** The offset of the next unconsumed byte; after a scan, the next marker. */
  private at: number;
  private bits = 0;
  private available = 0;
  /** Set when a read reached the end of the data or a marker. */
  overrun = false;
  /** The caller's `ref`, so errors from inside the scan carry it. */
  readonly path: string | undefined;

  constructor(data: Uint8Array, start: number, path?: string) {
    this.data = data;
    this.at = start;
    this.path = path;
  }

  /** The offset of the next unconsumed byte (where the scan ended). */
  get position(): number {
    return this.at;
  }

  /** Read one bit. */
  bit(): number {
    if (this.available === 0) {
      this.bits = this.nextByte();
      this.available = 8;
    }
    this.available -= 1;
    return (this.bits >> this.available) & 1;
  }

  /** Read `count` bits (count ≥ 15 is never used by baseline entropy coding). */
  receive(count: number): number {
    let value = 0;
    for (let i = 0; i < count; i += 1) {
      value = (value << 1) | this.bit();
    }
    return value;
  }

  /** Discard the rest of the current byte, as a restart marker requires. */
  align(): void {
    this.available = 0;
  }

  /** Consume the `FF D0 … FF D7` restart marker at the current position. */
  readRestart(): Result<void> {
    this.align();
    const started = this.at;
    let at = this.at;
    // T.81 §B.1.1.2: any number of `FF` fill bytes may precede a marker, the
    // same repetition `nextByte` already skips inside the entropy data.
    while (at < this.data.length && this.data[at] === 0xff) {
      at += 1;
    }
    if (at === started) {
      return fail(started, `expected a restart marker (FF D0–FF D7)`, this.path);
    }
    if (at >= this.data.length) {
      return fail(started, "truncated restart marker", this.path);
    }
    const marker = this.data[at]!;
    if (marker < 0xd0 || marker > 0xd7) {
      return fail(started, `expected a restart marker (FF D0–FF D7)`, this.path);
    }
    this.at = at + 1;
    return ok(undefined);
  }

  /** The next entropy byte, undoing `FF 00` stuffing and stopping at a marker. */
  private nextByte(): number {
    const data = this.data;
    while (this.at < data.length) {
      const byte = data[this.at]!;
      this.at += 1;
      if (byte !== 0xff) {
        return byte;
      }
      const markerStart = this.at - 1;
      while (this.at < data.length && data[this.at] === 0xff) {
        this.at += 1;
      }
      if (this.at >= data.length) {
        this.at = markerStart;
        this.overrun = true;
        return 0;
      }
      if (data[this.at] === 0x00) {
        this.at += 1;
        return 0xff;
      }
      this.at = markerStart;
      this.overrun = true;
      return 0;
    }
    this.overrun = true;
    return 0;
  }
}

/**
 * Extend a Huffman-decoded magnitude to its signed value (T.81 Annex F):
 * values below half the range are negative.
 */
function extend(value: number, size: number): number {
  if (size === 0) {
    return 0;
  }
  const threshold = 1 << (size - 1);
  return value < threshold ? value - (1 << size) + 1 : value;
}

/** Build the canonical decode arrays from a DHT's counts and symbols. */
function buildHuffman(counts: Uint8Array, values: Uint8Array): HuffmanTable {
  const minCode = new Int32Array(17);
  const maxCode = new Int32Array(17);
  const valPtr = new Int32Array(17);
  let code = 0;
  let symbol = 0;
  for (let length = 1; length <= 16; length += 1) {
    const count = counts[length - 1]!;
    if (count > 0) {
      valPtr[length] = symbol;
      minCode[length] = code;
      code += count;
      maxCode[length] = code - 1;
      symbol += count;
    } else {
      maxCode[length] = -1;
    }
    code <<= 1;
  }
  return { minCode, maxCode, valPtr, values };
}

/** Decode one symbol from a Huffman table, or `-1` for a code that is not in it. */
function decodeHuffman(reader: BitReader, table: HuffmanTable): number {
  let code = reader.bit();
  let length = 1;
  while (length <= 16 && (table.maxCode[length]! < 0 || code > table.maxCode[length]!)) {
    code = (code << 1) | reader.bit();
    length += 1;
  }
  if (length > 16) {
    return -1;
  }
  const index = table.valPtr[length]! + code - table.minCode[length]!;
  return index >= 0 && index < table.values.length ? table.values[index]! : -1;
}

/**
 * Run the separable IDCT over the dequantised coefficients and write the 8×8
 * samples (level-shifted by +128, rounded, clamped) into the component plane.
 * Rows then columns, fixed order, IEEE-754 `+ ·` only (G3).
 *
 * An interleaved scan can ask a component for blocks past its own block grid:
 * the frame's MCU grid is `ceil(width / (8·maxH)) × ceil(height / (8·maxV))` and
 * each MCU carries `h × v` blocks, while the component's plane holds only
 * `ceil(width·h / (8·maxH)) × ceil(height·v / (8·maxV))` of them (T.81 §A.2.2).
 * Those dummy blocks are decoded to keep the entropy stream in step but are not
 * part of the picture; writing one at this flat offset would land in the next
 * plane row and overwrite samples already decoded, so it is dropped here
 * (format-spec §10.3).
 */
function idct(
  coeff: Float64Array,
  tmp: Float64Array,
  component: Component,
  blockRow: number,
  blockCol: number,
): void {
  if (blockRow >= component.blocksPerColumn || blockCol >= component.blocksPerLine) {
    return;
  }
  for (let y = 0; y < 8; y += 1) {
    const row = y * 8;
    for (let x = 0; x < 8; x += 1) {
      let sum = 0;
      for (let u = 0; u < 8; u += 1) {
        sum += BASIS[u]![x]! * coeff[row + u]!;
      }
      tmp[row + x] = sum;
    }
  }
  const planeWidth = component.blocksPerLine * 8;
  const origin = blockRow * 8 * planeWidth + blockCol * 8;
  for (let x = 0; x < 8; x += 1) {
    for (let y = 0; y < 8; y += 1) {
      let sum = 0;
      for (let v = 0; v < 8; v += 1) {
        sum += BASIS[v]![y]! * tmp[v * 8 + x]!;
      }
      const value = Math.round(sum + 128);
      component.plane[origin + y * planeWidth + x] = value < 0 ? 0 : value > 255 ? 255 : value;
    }
  }
}

/** Decode one 8×8 block into the component plane at `(blockRow, blockCol)`. */
function decodeBlock(
  reader: BitReader,
  scan: ScanComponent,
  blockRow: number,
  blockCol: number,
  coeff: Float64Array,
  tmp: Float64Array,
  predictors: Int32Array,
): Result<void> {
  const quant = scan.quant.values;
  coeff.fill(0);

  const category = decodeHuffman(reader, scan.dc);
  if (category < 0) {
    return fail(reader.position, "invalid DC Huffman code", reader.path);
  }
  if (category > 11) {
    return fail(
      reader.position,
      `DC difference category ${category} is outside 0–11 for 8-bit samples`,
      reader.path,
    );
  }
  const difference = category === 0 ? 0 : extend(reader.receive(category), category);
  const dc = predictors[scan.predictor]! + difference;
  predictors[scan.predictor] = dc;
  coeff[0] = dc * quant[0]!;

  let k = 1;
  while (k < 64) {
    const symbol = decodeHuffman(reader, scan.ac);
    if (symbol < 0) {
      return fail(reader.position, "invalid AC Huffman code", reader.path);
    }
    const run = symbol >> 4;
    const size = symbol & 15;
    if (size === 0) {
      if (run === 15) {
        k += 16;
        continue;
      }
      break;
    }
    k += run;
    if (k > 63) {
      return fail(reader.position, `AC coefficient index ${k} runs past 63`, reader.path);
    }
    const natural = ZIGZAG[k]!;
    coeff[natural] = extend(reader.receive(size), size) * quant[natural]!;
    k += 1;
  }

  idct(coeff, tmp, scan.component, blockRow, blockCol);
  return ok(undefined);
}

/**
 * Decode every MCU of one scan. An interleaved scan walks the frame's MCU grid
 * and decodes each component's `h × v` blocks per MCU; a single-component scan
 * walks that component's own block grid one block per MCU (T.81 §A.2.2).
 */
function decodeScan(
  reader: BitReader,
  frame: Frame,
  scan: readonly ScanComponent[],
  restartInterval: number,
): Result<void> {
  const coeff = new Float64Array(64);
  const tmp = new Float64Array(64);
  const predictors = new Int32Array(frame.components.length);
  const interleaved = scan.length === frame.components.length;
  const single = scan[0]!;
  const mcuColumns = interleaved ? frame.mcuColumns : single.component.blocksPerLine;
  const mcuRows = interleaved ? frame.mcuRows : single.component.blocksPerColumn;
  let mcu = 0;

  for (let mcuRow = 0; mcuRow < mcuRows; mcuRow += 1) {
    for (let mcuCol = 0; mcuCol < mcuColumns; mcuCol += 1) {
      if (restartInterval > 0 && mcu > 0 && mcu % restartInterval === 0) {
        const restarted = reader.readRestart();
        if (!restarted.ok) {
          return restarted;
        }
        predictors.fill(0);
      }
      for (const part of scan) {
        const hBlocks = interleaved ? part.component.h : 1;
        const vBlocks = interleaved ? part.component.v : 1;
        const baseCol = interleaved ? mcuCol * part.component.h : mcuCol;
        const baseRow = interleaved ? mcuRow * part.component.v : mcuRow;
        for (let v = 0; v < vBlocks; v += 1) {
          for (let h = 0; h < hBlocks; h += 1) {
            const decoded = decodeBlock(reader, part, baseRow + v, baseCol + h, coeff, tmp, predictors);
            if (!decoded.ok) {
              return decoded;
            }
          }
        }
      }
      mcu += 1;
    }
  }

  if (reader.overrun) {
    return fail(reader.position, "the entropy-coded data ended before the last MCU (truncated file)", reader.path);
  }
  return ok(undefined);
}

/** Round to an 8-bit sample, clamped. */
function clamp8(value: number): number {
  const rounded = Math.round(value);
  return rounded < 0 ? 0 : rounded > 255 ? 255 : rounded;
}

/** One component sample at full-resolution pixel `(x, y)`, nearest-neighbour. */
function sampleAt(frame: Frame, component: Component, x: number, y: number): number {
  const px = Math.floor((x * component.h) / frame.maxH);
  const py = Math.floor((y * component.v) / frame.maxV);
  return component.plane[py * component.blocksPerLine * 8 + px]!;
}

/** Upsample the component planes and convert to straight RGBA (AD-28). */
function compose(frame: Frame, adobeTransform: number | undefined): DecodedTexture {
  const { width, height, components } = frame;
  const rgba = new Uint8Array(width * height * 4);
  const grey = components[0]!;

  if (components.length === 1) {
    for (let y = 0; y < height; y += 1) {
      for (let x = 0; x < width; x += 1) {
        const value = sampleAt(frame, grey, x, y);
        const out = (y * width + x) * 4;
        rgba[out] = value;
        rgba[out + 1] = value;
        rgba[out + 2] = value;
        rgba[out + 3] = 255;
      }
    }
    return { w: width, h: height, rgba };
  }

  const first = components[0]!;
  const second = components[1]!;
  const third = components[2]!;
  // The Adobe APP14 transform byte: 0 means the three components are already
  // R, G and B; anything else (or no APP14) is the default YCbCr.
  const rgb = adobeTransform === 0;

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const a = sampleAt(frame, first, x, y);
      const b = sampleAt(frame, second, x, y);
      const c = sampleAt(frame, third, x, y);
      const out = (y * width + x) * 4;
      if (rgb) {
        rgba[out] = a;
        rgba[out + 1] = b;
        rgba[out + 2] = c;
      } else {
        rgba[out] = clamp8(a + 1.402 * (c - 128));
        rgba[out + 1] = clamp8(a - 0.344136 * (b - 128) - 0.714136 * (c - 128));
        rgba[out + 2] = clamp8(a + 1.772 * (b - 128));
      }
      rgba[out + 3] = 255;
    }
  }
  return { w: width, h: height, rgba };
}

/** Parse a SOF0/SOF1 frame segment into a `Frame` (format-spec §10, T.81 §B.2.2). */
function readFrame(bytes: Uint8Array, segmentAt: number, segmentEnd: number, path?: string): Result<Frame> {
  const count = bytes[segmentAt + 5]!;
  if (segmentEnd - segmentAt !== 6 + count * 3) {
    return fail(segmentAt, `SOF0 holds ${segmentEnd - segmentAt} bytes for ${count} components`, path);
  }
  const precision = bytes[segmentAt]!;
  if (precision !== 8) {
    return fail(segmentAt, `unsupported sample precision ${precision}: this decoder handles 8-bit JPEG`, path);
  }
  const width = (bytes[segmentAt + 3]! << 8) | bytes[segmentAt + 4]!;
  const height = (bytes[segmentAt + 1]! << 8) | bytes[segmentAt + 2]!;
  if (width === 0 || height === 0) {
    return fail(segmentAt + 1, `SOF0 has a zero dimension: ${width}×${height}`, path);
  }
  if (width * height > MAX_PIXELS) {
    return fail(segmentAt + 1, `image is too large: ${width}×${height} exceeds ${MAX_PIXELS} pixels`, path);
  }
  if (count !== 1 && count !== 3) {
    return fail(segmentAt + 5, `unsupported component count ${count}: this decoder handles grey and YCbCr`, path);
  }

  const descriptions: { id: number; h: number; v: number; quantId: number }[] = [];
  let maxH = 1;
  let maxV = 1;
  for (let i = 0; i < count; i += 1) {
    const at = segmentAt + 6 + i * 3;
    const id = bytes[at]!;
    if (descriptions.some((earlier) => earlier.id === id)) {
      return fail(at, `component ${id} appears twice in the frame`, path);
    }
    const sampling = bytes[at + 1]!;
    const h = sampling >> 4;
    const v = sampling & 15;
    const quantId = bytes[at + 2]!;
    if (h < 1 || h > 4 || v < 1 || v > 4) {
      return fail(at + 1, `component ${id} has sampling ${h}×${v}; the spec allows 1–4`, path);
    }
    if (quantId > 3) {
      return fail(at + 2, `component ${id} names quantisation table ${quantId}; the spec allows 0–3`, path);
    }
    maxH = Math.max(maxH, h);
    maxV = Math.max(maxV, v);
    descriptions.push({ id, h, v, quantId });
  }

  const components = descriptions.map((description) => {
    const blocksPerLine = Math.ceil((width * description.h) / (maxH * 8));
    const blocksPerColumn = Math.ceil((height * description.v) / (maxV * 8));
    return {
      ...description,
      blocksPerLine,
      blocksPerColumn,
      plane: new Uint8Array(blocksPerLine * 8 * blocksPerColumn * 8),
    };
  });

  return ok({
    width,
    height,
    maxH,
    maxV,
    mcuColumns: Math.ceil(width / (maxH * 8)),
    mcuRows: Math.ceil(height / (maxV * 8)),
    components,
  });
}

/** Read a DQT segment into `quant` (format-spec §10, T.81 §B.2.4.1). */
function readQuant(bytes: Uint8Array, segmentAt: number, segmentEnd: number, quant: (QuantTable | undefined)[], path?: string): Result<void> {
  let at = segmentAt;
  while (at < segmentEnd) {
    const descriptor = bytes[at]!;
    const precision = descriptor >> 4;
    const id = descriptor & 15;
    at += 1;
    if (id > 3) {
      return fail(at - 1, `quantisation table id ${id} is outside 0–3`, path);
    }
    const values = new Int32Array(64);
    if (precision === 0) {
      if (at + 64 > segmentEnd) {
        return fail(at, "DQT ends inside its 8-bit table", path);
      }
      for (let i = 0; i < 64; i += 1) {
        values[ZIGZAG[i]!] = bytes[at + i]!;
      }
      at += 64;
    } else if (precision === 1) {
      if (at + 128 > segmentEnd) {
        return fail(at, "DQT ends inside its 16-bit table", path);
      }
      for (let i = 0; i < 64; i += 1) {
        values[ZIGZAG[i]!] = (bytes[at + i * 2]! << 8) | bytes[at + i * 2 + 1]!;
      }
      at += 128;
    } else {
      return fail(at - 1, `unsupported quantisation precision ${precision}`, path);
    }
    quant[id] = { values };
  }
  return ok(undefined);
}

/** Read a DHT segment into `huffman` (format-spec §10, T.81 §B.2.4.2). */
function readHuffman(
  bytes: Uint8Array,
  segmentAt: number,
  segmentEnd: number,
  huffman: (HuffmanTable | undefined)[][],
  path?: string,
): Result<void> {
  let at = segmentAt;
  while (at < segmentEnd) {
    const descriptor = bytes[at]!;
    const tableClass = descriptor >> 4;
    const id = descriptor & 15;
    at += 1;
    if (tableClass > 1 || id > 3) {
      return fail(at - 1, `Huffman table class ${tableClass} id ${id} is out of range`, path);
    }
    if (at + 16 > segmentEnd) {
      return fail(at, "DHT ends inside its code-length counts", path);
    }
    const counts = new Uint8Array(16);
    let total = 0;
    for (let i = 0; i < 16; i += 1) {
      counts[i] = bytes[at + i]!;
      total += counts[i]!;
    }
    at += 16;
    if (at + total > segmentEnd) {
      return fail(at, "DHT ends inside its symbol list", path);
    }
    huffman[tableClass]![id] = buildHuffman(counts, bytes.subarray(at, at + total));
    at += total;
  }
  return ok(undefined);
}

/**
 * Decode a baseline JPEG file to the file's own straight RGBA (AD-28,
 * format-spec §10): the component channels and alpha 255 (JPEG carries no
 * alpha), nothing added. No colour key is applied — the key is not part of the
 * file; it is the `key` of a `blit` (AD-3) and `core/raster` tests it on these
 * pixels. Never throws: nothing here is a `FormatError` escape hatch. `path`,
 * the asset path, is carried on every error.
 */
export function decodeJpeg(bytes: Uint8Array, path?: string): Result<DecodedTexture> {
  if (bytes.length < 3 || bytes[0] !== 0xff || bytes[1] !== 0xd8 || bytes[2] !== 0xff) {
    return fail(0, "not a JPEG: the file does not start with FF D8 FF", path);
  }
  if (bytes.length < 4) {
    return fail(bytes.length, "JPEG is too short: the file ends after its FF D8 FF signature", path);
  }

  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const quant: (QuantTable | undefined)[] = [undefined, undefined, undefined, undefined];
  const huffman: (HuffmanTable | undefined)[][] = [[], [], [], []];
  let frame: Frame | undefined;
  /** Offset of the frame's first field, for errors about the frame as a whole. */
  let frameAt = 0;
  /** Frame component indices a scan has actually decoded. */
  const decodedComponents = new Set<number>();
  let restartInterval = 0;
  let adobeTransform: number | undefined;
  let scanned = false;
  let at = 2;

  while (at < bytes.length) {
    if (bytes[at] !== 0xff) {
      return fail(at, "expected a marker (FF) between segments", path);
    }
    while (at < bytes.length && bytes[at] === 0xff) {
      at += 1;
    }
    if (at >= bytes.length) {
      return fail(at - 1, "truncated marker", path);
    }
    const marker = bytes[at]!;
    at += 1;
    if (marker === 0xd9) {
      break;
    }
    if (marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7)) {
      continue;
    }
    if (at + 2 > bytes.length) {
      return fail(at, `truncated FF ${marker.toString(16)} segment length`, path);
    }
    const length = view.getUint16(at, false);
    const segmentAt = at + 2;
    const segmentEnd = segmentAt + length - 2;
    if (length < 2 || segmentEnd > bytes.length) {
      return fail(at, `FF ${marker.toString(16)} segment length ${length} runs past the end of the file`, path);
    }

    if (marker === 0xc0 || marker === 0xc1) {
      const read = readFrame(bytes, segmentAt, segmentEnd, path);
      if (!read.ok) {
        return read;
      }
      frame = read.value;
      frameAt = segmentAt;
    } else if (marker === 0xc2) {
      return fail(at, "progressive JPEG (SOF2) is not supported", path);
    } else if (marker >= 0xc1 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc) {
      return fail(at, `unsupported JPEG frame type (marker FF ${marker.toString(16)})`, path);
    } else if (marker === 0xdb) {
      const read = readQuant(bytes, segmentAt, segmentEnd, quant, path);
      if (!read.ok) {
        return read;
      }
    } else if (marker === 0xc4) {
      const read = readHuffman(bytes, segmentAt, segmentEnd, huffman, path);
      if (!read.ok) {
        return read;
      }
    } else if (marker === 0xdd) {
      if (length !== 4) {
        return fail(at, `DRI length ${length} is not 4`, path);
      }
      restartInterval = (bytes[segmentAt]! << 8) | bytes[segmentAt + 1]!;
    } else if (marker === 0xee && length >= 14 && bytes[segmentAt] === 0x41 && bytes[segmentAt + 1] === 0x64 && bytes[segmentAt + 2] === 0x6f && bytes[segmentAt + 3] === 0x62 && bytes[segmentAt + 4] === 0x65) {
      adobeTransform = bytes[segmentAt + 11]!;
    } else if (marker === 0xda) {
      if (frame === undefined) {
        return fail(at, "SOS appears before any SOF0 frame", path);
      }
      const scanCount = bytes[segmentAt]!;
      if (scanCount < 1 || scanCount > frame.components.length) {
        return fail(segmentAt, `SOS names ${scanCount} components; the frame has ${frame.components.length}`, path);
      }
      if (segmentEnd - segmentAt !== 1 + scanCount * 2 + 3) {
        return fail(at, `SOS length ${length} does not match ${scanCount} components`, path);
      }
      const scan: ScanComponent[] = [];
      for (let i = 0; i < scanCount; i += 1) {
        const entry = segmentAt + 1 + i * 2;
        const id = bytes[entry]!;
        const component = frame.components.find((candidate) => candidate.id === id);
        if (component === undefined) {
          return fail(entry, `the scan names component ${id}, which SOF0 does not define`, path);
        }
        if (scan.some((named) => named.component === component)) {
          return fail(entry, `the scan names component ${id} twice`, path);
        }
        const tables = bytes[entry + 1]!;
        const dc = huffman[0]![tables >> 4];
        const ac = huffman[1]![tables & 15];
        if (dc === undefined || ac === undefined) {
          return fail(
            entry + 1,
            `the scan names Huffman tables ${tables >> 4}/${tables & 15}, which the file does not define`,
            path,
          );
        }
        const table = quant[component.quantId];
        if (table === undefined) {
          return fail(
            entry,
            `component ${id} uses quantisation table ${component.quantId}, which the file does not define`,
            path,
          );
        }
        scan.push({ component, quant: table, dc, ac, predictor: frame.components.indexOf(component) });
      }
      const ss = bytes[segmentAt + 1 + scanCount * 2]!;
      const se = bytes[segmentAt + 2 + scanCount * 2]!;
      const ahAl = bytes[segmentAt + 3 + scanCount * 2]!;
      if (ss !== 0 || se !== 63 || ahAl !== 0) {
        return fail(at, `only a baseline sequential scan (Ss=0, Se=63, Ah=Al=0) is supported; found ${ss}/${se}/${ahAl}`, path);
      }
      const reader = new BitReader(bytes, segmentEnd, path);
      const decoded = decodeScan(reader, frame, scan, restartInterval);
      if (!decoded.ok) {
        return decoded;
      }
      for (const part of scan) {
        decodedComponents.add(part.predictor);
      }
      scanned = true;
      at = reader.position;
      continue;
    }

    at = segmentEnd;
  }

  if (frame === undefined) {
    return fail(0, "no SOF0 frame: the file is not a baseline JPEG", path);
  }
  if (!scanned) {
    return fail(at, "no scan (SOS) was found", path);
  }
  for (let i = 0; i < frame.components.length; i += 1) {
    if (!decodedComponents.has(i)) {
      return fail(frameAt, `component ${frame.components[i]!.id} was never decoded by any scan`, path);
    }
  }
  return ok(compose(frame, adobeTransform));
}
