// The JPEG decoder of format-spec §10 (AD-28), exercised through
// `decodeTexture`: a small synthetic matrix built by a minimal baseline
// encoder pins the baseline picture, the 8-bit extended sequential frame
// (SOF1), the progressive refusal (SOF2), restart intervals with and without
// 0xFF fill bytes, 4:2:0 and 4:4:4 sampling and the Adobe APP14 RGB transform.
// The malformed cases pin the located errors for an out-of-range DC category,
// a duplicated frame component id, a repeated SOS entry, a frame component no
// scan decoded and a three-byte signature; a truncation and mutation loop
// proves the decoder never throws.
import { test } from "node:test";
import { deepEqual, equal } from "node:assert/strict";
import { decodeTexture } from "../src/index.ts";
import type { Result } from "../src/index.ts";

/** Unwrap a result the test expects to succeed. */
function unwrap<T>(result: Result<T>): T {
  if (!result.ok) {
    throw new Error(`expected ok, got: ${result.error.message}`);
  }
  return result.value;
}

/** Decode `bytes` and fail the test if the decoder throws instead of returning (AD-18). */
function decodeNoThrow(bytes: Uint8Array, what: string): void {
  try {
    decodeTexture(bytes);
  } catch (error) {
    throw new Error(`${what}: the decoder threw: ${String(error)}`);
  }
}

/** The RGBA of one pixel, as a plain array, for readable assertions. */
function pixel(rgba: Uint8Array, width: number, x: number, y: number): number[] {
  const at = (y * width + x) * 4;
  return [rgba[at]!, rgba[at + 1]!, rgba[at + 2]!, rgba[at + 3]!];
}

/** Concatenate byte arrays in order. */
function concat(parts: readonly Uint8Array[]): Uint8Array {
  let length = 0;
  for (const part of parts) {
    length += part.length;
  }
  const out = new Uint8Array(length);
  let at = 0;
  for (const part of parts) {
    out.set(part, at);
    at += part.length;
  }
  return out;
}

/** A marker segment: `FF`, the marker, a big-endian length (payload + 2), the payload. */
function segment(marker: number, payload: readonly number[]): Uint8Array {
  const length = payload.length + 2;
  return new Uint8Array([0xff, marker, length >> 8, length & 0xff, ...payload]);
}

/**
 * A baseline entropy encoder for the synthetic files. Data bytes are written
 * MSB-first and an `FF` byte is stuffed as `FF 00`; a restart marker is written
 * raw, after padding the current byte with 1 bits, with any requested `FF`
 * fill bytes in front of it (T.81 §B.1.1.2, §B.1.1.5).
 */
class BitWriter {
  private readonly out: number[] = [];
  private readonly fill: number;
  private bits = 0;
  private count = 0;

  constructor(fill: number) {
    this.fill = fill;
  }

  /** Write the low `width` bits of `value`, MSB first. */
  write(value: number, width: number): void {
    for (let shift = width - 1; shift >= 0; shift -= 1) {
      this.bits = (this.bits << 1) | ((value >> shift) & 1);
      this.count += 1;
      if (this.count === 8) {
        this.stuff(this.bits & 0xff);
        this.bits = 0;
        this.count = 0;
      }
    }
  }

  /** Pad to a byte boundary, then write a raw `FF <code>` restart marker. */
  marker(code: number): void {
    while (this.count !== 0) {
      this.write(1, 1);
    }
    for (let i = 0; i < this.fill; i += 1) {
      this.out.push(0xff);
    }
    this.out.push(0xff, code);
  }

  /** The entropy bytes, padded to a byte boundary with 1 bits. */
  finish(): Uint8Array {
    while (this.count !== 0) {
      this.write(1, 1);
    }
    return new Uint8Array(this.out);
  }

  /** Push a data byte, stuffing a literal `FF` as `FF 00`. */
  private stuff(byte: number): void {
    this.out.push(byte);
    if (byte === 0xff) {
      this.out.push(0x00);
    }
  }
}

/** The DC difference categories the synthetic Huffman table can code. */
const DC_SYMBOLS: readonly number[] = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15];

/** A DHT segment: one DC table of four-bit categories and one AC table whose only symbol is EOB. */
function dhtSegment(): Uint8Array {
  const dcCounts = [0, 0, 0, DC_SYMBOLS.length, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
  const acCounts = [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
  return segment(0xc4, [0x00, ...dcCounts, ...DC_SYMBOLS, 0x10, ...acCounts, 0x00]);
}

/** A DQT segment: one 8-bit quantisation table of all ones, id 0. */
function dqtSegment(): Uint8Array {
  const payload: number[] = [0x00];
  for (let i = 0; i < 64; i += 1) {
    payload.push(1);
  }
  return segment(0xdb, payload);
}

/** One frame component as SOF describes it (the quantisation table is always 0). */
interface FrameComponent {
  readonly id: number;
  readonly h: number;
  readonly v: number;
}

/** A SOF segment at `precision`, with the dimensions and the component descriptions. */
function sofSegment(
  marker: number,
  precision: number,
  width: number,
  height: number,
  components: readonly FrameComponent[],
): Uint8Array {
  const payload = [precision, height >> 8, height & 0xff, width >> 8, width & 0xff, components.length];
  for (const component of components) {
    payload.push(component.id, (component.h << 4) | component.v, 0);
  }
  return segment(marker, payload);
}

/** A SOS segment naming `ids`, all on Huffman tables 0/0, Ss=0 Se=63 Ah=Al=0. */
function sosSegment(ids: readonly number[]): Uint8Array {
  const payload = [ids.length];
  for (const id of ids) {
    payload.push(id, 0x00);
  }
  payload.push(0, 63, 0);
  return segment(0xda, payload);
}

/** An APP14 "Adobe" segment carrying the colour-transform byte. */
function app14Segment(transform: number): Uint8Array {
  return segment(0xee, [0x41, 0x64, 0x6f, 0x62, 0x65, 0, 100, 0, 0, 0, 0, transform]);
}

/** A DRI segment with the restart interval in MCUs. */
function driSegment(interval: number): Uint8Array {
  return segment(0xdd, [interval >> 8, interval & 0xff]);
}

/** The dequantised DC coefficient of a flat block that decodes to sample `level` (0–255). */
function dcForLevel(level: number): number {
  return (level - 128) * 8;
}

/** The T.81 difference category of `value`: the bits its signed form needs. */
function magnitudeCategory(value: number): number {
  let magnitude = value < 0 ? -value : value;
  let category = 0;
  while (magnitude !== 0) {
    magnitude >>= 1;
    category += 1;
  }
  return category;
}

/** Write one DC-only block: the 4-bit category code, its difference bits and the EOB AC code. */
function writeBlock(writer: BitWriter, difference: number): void {
  const category = magnitudeCategory(difference);
  writer.write(category, 4);
  if (category > 0) {
    writer.write(difference > 0 ? difference : difference + (1 << category) - 1, category);
  }
  writer.write(0, 1);
}

/** Encode every MCU's blocks, inserting a restart marker each `restartInterval` MCUs. */
function encodeScan(
  mcus: readonly (readonly number[])[],
  slots: readonly number[],
  restartInterval: number,
  restartFill: number,
): Uint8Array {
  const writer = new BitWriter(restartFill);
  const predictors = new Map<number, number>();
  let mcu = 0;
  for (const blocks of mcus) {
    if (restartInterval > 0 && mcu > 0 && mcu % restartInterval === 0) {
      writer.marker(0xd0 + ((mcu / restartInterval - 1) % 8));
      predictors.clear();
    }
    blocks.forEach((dc, index) => {
      const slot = slots[index]!;
      const previous = predictors.get(slot) ?? 0;
      writeBlock(writer, dc - previous);
      predictors.set(slot, dc);
    });
    mcu += 1;
  }
  return writer.finish();
}

/** One synthetic file the builder assembles. */
interface JpegSpec {
  readonly width: number;
  readonly height: number;
  readonly components: readonly FrameComponent[];
  /** The flat sample level (0–255) of each frame component. */
  readonly levels: readonly number[];
  /** The frame marker: 0xc0 (baseline), 0xc1 (extended sequential) or 0xc2 (progressive). */
  readonly frameMarker?: number;
  /** The frame's sample precision; 8 unless a test asks otherwise. */
  readonly precision?: number;
  /** The APP14 colour-transform byte; omitted means no APP14 segment. */
  readonly adobeTransform?: number;
  /** The SOF components a single scan names, by index; defaults to every one. */
  readonly scan?: readonly number[];
  /** Overrides the first block's DC coefficient, for the out-of-range category case. */
  readonly firstBlockDc?: number;
  /** The restart interval in MCUs; 0 (default) writes no DRI segment. */
  readonly restartInterval?: number;
  /** Extra 0xFF fill bytes before each restart marker. */
  readonly restartFill?: number;
}

/** Assemble a baseline-sequential file from `spec`, laying out one interleaved scan. */
function buildJpeg(spec: JpegSpec): Uint8Array {
  const { width, height, components } = spec;
  const scan = spec.scan ?? components.map((_component, index) => index);
  const interleaved = scan.length === components.length;
  let maxH = 1;
  let maxV = 1;
  for (const component of components) {
    maxH = Math.max(maxH, component.h);
    maxV = Math.max(maxV, component.v);
  }
  const first = components[scan[0]!]!;
  // The scan's MCU grid: the frame's for an interleaved scan, the single
  // component's own block grid otherwise (T.81 §A.2.2).
  const mcuColumns = interleaved
    ? Math.ceil(width / (maxH * 8))
    : Math.ceil((width * first.h) / (maxH * 8));
  const mcuRows = interleaved
    ? Math.ceil(height / (maxV * 8))
    : Math.ceil((height * first.v) / (maxV * 8));

  // The component slot of each block in one MCU, in the order the decoder reads them.
  const slots: number[] = [];
  for (const slot of scan) {
    const component = components[slot]!;
    const blocks = interleaved ? component.h * component.v : 1;
    for (let i = 0; i < blocks; i += 1) {
      slots.push(slot);
    }
  }

  const mcus: number[][] = [];
  for (let mcu = 0; mcu < mcuColumns * mcuRows; mcu += 1) {
    mcus.push(slots.map((slot) => dcForLevel(spec.levels[slot]!)));
  }
  if (spec.firstBlockDc !== undefined) {
    mcus[0]![0] = spec.firstBlockDc;
  }

  const restartInterval = spec.restartInterval ?? 0;
  const parts: Uint8Array[] = [new Uint8Array([0xff, 0xd8])];
  if (spec.adobeTransform !== undefined) {
    parts.push(app14Segment(spec.adobeTransform));
  }
  parts.push(dqtSegment());
  parts.push(sofSegment(spec.frameMarker ?? 0xc0, spec.precision ?? 8, width, height, components));
  parts.push(dhtSegment());
  if (restartInterval > 0) {
    parts.push(driSegment(restartInterval));
  }
  parts.push(sosSegment(scan.map((slot) => components[slot]!.id)));
  parts.push(encodeScan(mcus, slots, restartInterval, spec.restartFill ?? 0));
  parts.push(new Uint8Array([0xff, 0xd9]));
  return concat(parts);
}

/** The payload offset of the first segment with `marker`, found by its `FF <marker>` signature. */
function segmentPayload(bytes: Uint8Array, marker: number): number {
  for (let at = 2; at + 4 <= bytes.length; at += 1) {
    if (bytes[at] === 0xff && bytes[at + 1] === marker) {
      return at + 4;
    }
  }
  throw new Error(`no FF ${marker.toString(16)} segment in the file`);
}

/** A grey 8×8 file whose only block is flat at `level`. */
function grey(level: number): JpegSpec {
  return { width: 8, height: 8, components: [{ id: 1, h: 1, v: 1 }], levels: [level] };
}

test("a baseline frame and its 8-bit extended sequential twin decode alike", () => {
  const baseline = unwrap(decodeTexture(buildJpeg(grey(200))));
  equal(baseline.w, 8);
  equal(baseline.h, 8);
  equal(baseline.rgba.length, 8 * 8 * 4);
  deepEqual(pixel(baseline.rgba, 8, 0, 0), [200, 200, 200, 255]);
  deepEqual(pixel(baseline.rgba, 8, 7, 7), [200, 200, 200, 255]);

  const extended = unwrap(decodeTexture(buildJpeg({ ...grey(200), frameMarker: 0xc1 })));
  deepEqual(extended.rgba, baseline.rgba);
});

test("SOF1 with a precision other than 8 and SOF2 are both refused", () => {
  const twelveBit = buildJpeg({ ...grey(200), frameMarker: 0xc1, precision: 12 });
  const notEight = decodeTexture(twelveBit);
  equal(notEight.ok, false);
  if (!notEight.ok) {
    equal(notEight.error.section, "format-spec §10");
    equal(notEight.error.offset, segmentPayload(twelveBit, 0xc1));
  }

  const progressive = buildJpeg({ ...grey(200), frameMarker: 0xc2 });
  const sof2 = decodeTexture(progressive);
  equal(sof2.ok, false);
  if (!sof2.ok) {
    equal(sof2.error.section, "format-spec §10");
  }
});

test("4:4:4 and 4:2:0 sampling both decode to flat RGB through APP14 transform 0", () => {
  const full = buildJpeg({
    width: 8,
    height: 8,
    components: [
      { id: 1, h: 1, v: 1 },
      { id: 2, h: 1, v: 1 },
      { id: 3, h: 1, v: 1 },
    ],
    levels: [200, 100, 50],
    adobeTransform: 0,
  });
  const fourFourFour = unwrap(decodeTexture(full));
  equal(fourFourFour.rgba.length, 8 * 8 * 4);
  deepEqual(pixel(fourFourFour.rgba, 8, 0, 0), [200, 100, 50, 255]);
  deepEqual(pixel(fourFourFour.rgba, 8, 7, 7), [200, 100, 50, 255]);

  const quartered = buildJpeg({
    width: 16,
    height: 16,
    components: [
      { id: 1, h: 2, v: 2 },
      { id: 2, h: 1, v: 1 },
      { id: 3, h: 1, v: 1 },
    ],
    levels: [200, 100, 50],
    adobeTransform: 0,
  });
  const fourTwoZero = unwrap(decodeTexture(quartered));
  equal(fourTwoZero.w, 16);
  equal(fourTwoZero.h, 16);
  equal(fourTwoZero.rgba.length, 16 * 16 * 4);
  // Nearest-neighbour upsampling of the chroma planes keeps every pixel flat.
  for (let y = 0; y < 16; y += 1) {
    for (let x = 0; x < 16; x += 1) {
      deepEqual(pixel(fourTwoZero.rgba, 16, x, y), [200, 100, 50, 255], `pixel ${x},${y}`);
    }
  }
});

test("a restart interval resynchronises, with and without 0xFF fill bytes", () => {
  const base: JpegSpec = {
    width: 16,
    height: 8,
    components: [{ id: 1, h: 1, v: 1 }],
    levels: [200],
    restartInterval: 1,
  };
  const plain = unwrap(decodeTexture(buildJpeg(base)));
  equal(plain.w, 16);
  equal(plain.h, 8);
  equal(plain.rgba.length, 16 * 8 * 4);
  // The second MCU starts from a reset predictor: a missing reset would double
  // its DC and clamp the pixel, so its exact value pins the resynchronisation.
  deepEqual(pixel(plain.rgba, 16, 8, 0), [200, 200, 200, 255]);
  deepEqual(pixel(plain.rgba, 16, 15, 7), [200, 200, 200, 255]);

  const filled = unwrap(decodeTexture(buildJpeg({ ...base, restartFill: 1 })));
  deepEqual(filled.rgba, plain.rgba);
});

test("a DC difference category above 11 is refused, not decoded", () => {
  const jpeg = buildJpeg({ ...grey(128), firstBlockDc: 2048 });
  const result = decodeTexture(jpeg);
  equal(result.ok, false);
  if (!result.ok) {
    equal(result.error.section, "format-spec §10");
    // The failure is in the scan data — after the SOS header, at its first byte.
    equal(result.error.offset, segmentPayload(jpeg, 0xda) + 7);
  }
});

test("a duplicated frame component id is a located error", () => {
  const jpeg = buildJpeg({
    width: 8,
    height: 8,
    components: [
      { id: 1, h: 1, v: 1 },
      { id: 1, h: 1, v: 1 },
      { id: 3, h: 1, v: 1 },
    ],
    levels: [200, 100, 50],
    adobeTransform: 0,
  });
  const result = decodeTexture(jpeg);
  equal(result.ok, false);
  if (!result.ok) {
    equal(result.error.section, "format-spec §10");
    // The second component's id byte: the frame payload, its 6-byte header and
    // the 3-byte first component description.
    equal(result.error.offset, segmentPayload(jpeg, 0xc0) + 9);
  }
});

test("a repeated SOS component entry is a located error", () => {
  const jpeg = buildJpeg({
    width: 8,
    height: 8,
    components: [
      { id: 1, h: 1, v: 1 },
      { id: 2, h: 1, v: 1 },
      { id: 3, h: 1, v: 1 },
    ],
    levels: [200, 100, 50],
    adobeTransform: 0,
    scan: [0, 0],
  });
  const result = decodeTexture(jpeg);
  equal(result.ok, false);
  if (!result.ok) {
    equal(result.error.section, "format-spec §10");
    // The second entry's id byte, after the SOS count and the first entry.
    equal(result.error.offset, segmentPayload(jpeg, 0xda) + 3);
  }
});

test("a frame component no scan decoded is refused before composing", () => {
  const jpeg = buildJpeg({
    width: 8,
    height: 8,
    components: [
      { id: 1, h: 1, v: 1 },
      { id: 2, h: 1, v: 1 },
      { id: 3, h: 1, v: 1 },
    ],
    levels: [200, 100, 50],
    adobeTransform: 0,
    scan: [0],
  });
  const result = decodeTexture(jpeg);
  equal(result.ok, false);
  if (!result.ok) {
    equal(result.error.section, "format-spec §10");
    // Located at the frame the incomplete scan belongs to.
    equal(result.error.offset, segmentPayload(jpeg, 0xc0));
  }
});

test("a three-byte FF D8 FF file is reported as too short", () => {
  const result = decodeTexture(new Uint8Array([0xff, 0xd8, 0xff]));
  equal(result.ok, false);
  if (!result.ok) {
    equal(result.error.section, "format-spec §10");
    // Offset 3 is the end of the signature, not the "not a JPEG" offset 0.
    equal(result.error.offset, 3);
  }
});

test("a truncated or mutated JPEG never throws", () => {
  const jpeg = buildJpeg({
    width: 8,
    height: 8,
    components: [
      { id: 1, h: 1, v: 1 },
      { id: 2, h: 1, v: 1 },
      { id: 3, h: 1, v: 1 },
    ],
    levels: [200, 100, 50],
    adobeTransform: 0,
  });
  for (let cut = 0; cut <= jpeg.length; cut += 1) {
    decodeNoThrow(jpeg.subarray(0, cut), `truncated to ${cut}`);
  }
  for (let at = 0; at < jpeg.length; at += 1) {
    const mutated = jpeg.slice();
    mutated[at] = mutated[at]! ^ 0xff;
    decodeNoThrow(mutated, `byte ${at} inverted`);
  }
});
