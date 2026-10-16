// The binary primitives of docs/spec/formats/README.md#primitive-encoding (AD-18): exact round-trips through
// synthetic buffers, and located errors for EOF, bounds and strings.
//
// The reader never throws, so the tests assert on values and on the error's
// offset, section and message rather than on exceptions.
import { test } from "node:test";
import { deepEqual, equal } from "node:assert/strict";
import {
  BinaryReader,
  BinaryWriter,
  decodeCp1252,
  encodeCp1252,
  err,
  ok,
  packColorref,
  trueCount,
  unpackColorref,
  upperBoundCount,
} from "../src/index.ts";
import type { Result } from "../src/index.ts";

/** Unwrap a result the test expects to succeed. */
function unwrap<T>(result: Result<T>): T {
  if (!result.ok) {
    throw new Error(`expected ok, got: ${result.error.message}`);
  }
  return result.value;
}

test("every primitive round-trips exactly", () => {
  const w = new BinaryWriter();
  w.u8(200);
  w.i8(-100);
  w.u16(65_535);
  w.i16(-12_345);
  w.u32(4_294_967_295);
  w.u32(2_147_483_648); // high bit set, read as unsigned
  w.i32(-2_147_483_648);
  w.f64(-0);
  w.f64(Number.NaN);
  w.f64(Number.POSITIVE_INFINITY);
  w.f64(Number.NEGATIVE_INFINITY);
  w.f64(1.5);

  const r = new BinaryReader(w.toBytes());
  equal(unwrap(r.u8()), 200);
  equal(unwrap(r.i8()), -100);
  equal(unwrap(r.u16()), 65_535);
  equal(unwrap(r.i16()), -12_345);
  equal(unwrap(r.u32()), 4_294_967_295);
  equal(unwrap(r.u32()), 2_147_483_648);
  equal(unwrap(r.i32()), -2_147_483_648);
  equal(Object.is(unwrap(r.f64()), -0), true);
  equal(Number.isNaN(unwrap(r.f64())), true);
  equal(unwrap(r.f64()), Number.POSITIVE_INFINITY);
  equal(unwrap(r.f64()), Number.NEGATIVE_INFINITY);
  equal(unwrap(r.f64()), 1.5);
  equal(r.eof, true);
  equal(r.remaining, 0);
});

test("multi-byte integers are written little-endian", () => {
  const w = new BinaryWriter();
  w.u16(0x1234);
  w.u32(0x01020304);
  w.i16(-2);
  w.i32(1);
  deepEqual([...w.toBytes()], [0x34, 0x12, 0x04, 0x03, 0x02, 0x01, 0xfe, 0xff, 0x01, 0x00, 0x00, 0x00]);
});

test("an empty string is a single NUL", () => {
  const w = new BinaryWriter();
  equal(w.str("").ok, true);
  deepEqual([...w.toBytes()], [0]);
  const r = new BinaryReader(w.toBytes());
  equal(unwrap(r.str()), "");
  equal(r.eof, true);
});

test("multi-byte and high-byte Windows-1252 strings round-trip", () => {
  const w = new BinaryWriter();
  equal(w.str("café").ok, true); // é = 0xE9
  equal(w.str("€100").ok, true); // € = 0x80, in the 0x80–0x9F extension block
  equal(w.str("“quoted”").ok, true); // curly quotes 0x93 / 0x94
  const bytes = w.toBytes();
  deepEqual(
    [...bytes],
    [
      0x63, 0x61, 0x66, 0xe9, 0x00,
      0x80, 0x31, 0x30, 0x30, 0x00,
      0x93, 0x71, 0x75, 0x6f, 0x74, 0x65, 0x64, 0x94, 0x00,
    ],
  );
  const r = new BinaryReader(bytes);
  equal(unwrap(r.str()), "café");
  equal(unwrap(r.str()), "€100");
  equal(unwrap(r.str()), "“quoted”");
  equal(r.eof, true);
});

test("undefined Windows-1252 bytes decode to their C1 code point and round-trip", () => {
  const bytes = new Uint8Array([0x81, 0x8d, 0x8f, 0x90, 0x9d, 0x00]);
  const r = new BinaryReader(bytes);
  equal(unwrap(r.str()), "\u0081\u008D\u008F\u0090\u009D");
  const w = new BinaryWriter();
  equal(w.str("\u0081\u008D\u008F\u0090\u009D").ok, true);
  deepEqual([...w.toBytes()], [0x81, 0x8d, 0x8f, 0x90, 0x9d, 0x00]);
});

test("the cp1252 codec is usable on its own", () => {
  deepEqual([...unwrap(encodeCp1252("é€"))], [0xe9, 0x80]);
  equal(decodeCp1252(new Uint8Array([0xe9, 0x80]), 0, 2), "é€");
});

test("an unencodable character is reported, not mangled", () => {
  const w = new BinaryWriter();
  const result = w.str("AĀ"); // U+0100 has no cp1252 byte
  equal(result.ok, false);
  if (!result.ok) {
    equal(result.error.section, "docs/spec/formats/README.md#primitive-encoding");
    equal(result.error.offset, 1);
    equal(result.error.message.includes("U+0100"), true);
  }
  equal(w.toBytes().length, 0); // a failed string appends nothing
});

test("COLORREF keeps red in the low byte", () => {
  const w = new BinaryWriter();
  w.color({ r: 0x11, g: 0x22, b: 0x33 });
  deepEqual([...w.toBytes()], [0x11, 0x22, 0x33, 0x00]);
  const r = new BinaryReader(w.toBytes());
  deepEqual(unwrap(r.color()), { r: 0x11, g: 0x22, b: 0x33 });
});

test("COLORREF packs 0x00BBGGRR and ignores the high byte", () => {
  deepEqual(unpackColorref(0x00_33_22_11), { r: 0x11, g: 0x22, b: 0x33 });
  equal(packColorref({ r: 0x11, g: 0x22, b: 0x33 }), 0x00_33_22_11);
  const r = new BinaryReader(new Uint8Array([0x11, 0x22, 0x33, 0xff]));
  deepEqual(unwrap(r.color()), { r: 0x11, g: 0x22, b: 0x33 });
});

test("the upper-bound count rule is n + 1 entries and -1 is none", () => {
  equal(upperBoundCount(0), 1);
  equal(upperBoundCount(4), 5);
  equal(upperBoundCount(-1), 0);
  const w = new BinaryWriter();
  w.i32(-1);
  w.i32(3);
  const r = new BinaryReader(w.toBytes());
  equal(unwrap(r.readUpperBound("i32")), 0);
  equal(unwrap(r.readUpperBound("i32")), 4);
});

test("a stored upper bound below -1 is reported, not read as none", () => {
  const w = new BinaryWriter();
  w.i16(3); // 4 entries
  w.i16(-2); // invalid: only -1 means "none" (docs/spec/formats/README.md#counts-are-usually-upper-bounds)
  const r = new BinaryReader(w.toBytes());
  equal(unwrap(r.readUpperBound()), 4);
  const bad = r.readUpperBound();
  equal(bad.ok, false);
  if (!bad.ok) {
    equal(bad.error.section, "docs/spec/formats/README.md#counts-are-usually-upper-bounds");
    equal(bad.error.offset, 2); // the invalid bound's first byte
  }
});

test("raw byte spans copy out instead of aliasing", () => {
  const r = new BinaryReader(new Uint8Array([1, 2, 3, 4]));
  const span = unwrap(r.readBytes(3));
  deepEqual([...span], [1, 2, 3]);
  span[0] = 99;
  equal(unwrap(r.seek(0)), undefined);
  equal(unwrap(r.u8()), 1);
  equal(unwrap(r.readBytes(0)).length, 0);
});

test("a short read reports the field offset and does not advance", () => {
  const r = new BinaryReader(new Uint8Array([1, 2]), "demo.brd");
  const short = r.u32();
  equal(short.ok, false);
  if (!short.ok) {
    equal(short.error.offset, 0);
    equal(short.error.section, "docs/spec/formats/README.md#primitive-encoding");
    equal(short.error.path, "demo.brd");
  }
  equal(r.offset, 0);
  equal(r.remaining, 2);
  equal(r.eof, false);
});

test("a later EOF reports its own field offset", () => {
  const r = new BinaryReader(new Uint8Array([1, 2, 3]));
  equal(unwrap(r.u8()), 1);
  const bad = r.i32();
  equal(bad.ok, false);
  if (!bad.ok) {
    equal(bad.error.offset, 1);
  }
});

test("an error omits path when the reader has none", () => {
  const r = new BinaryReader(new Uint8Array());
  const e = r.u8();
  equal(e.ok, false);
  if (!e.ok) {
    equal(e.error.path, undefined);
  }
});

test("seek and skip report out-of-range targets", () => {
  const r = new BinaryReader(new Uint8Array([1, 2, 3]));
  equal(r.seek(3).ok, true); // the EOF position is in range
  equal(r.eof, true);
  const past = r.seek(4);
  equal(past.ok, false);
  if (!past.ok) {
    equal(past.error.offset, 4);
  }
  equal(r.seek(-1).ok, false);
  equal(unwrap(r.seek(1)), undefined);
  const beyond = r.skip(5);
  equal(beyond.ok, false);
  if (!beyond.ok) {
    equal(beyond.error.offset, 6);
  }
  const back = new BinaryReader(new Uint8Array([1, 2, 3]));
  equal(back.skip(-1).ok, false);
  equal(unwrap(back.skip(3)), undefined);
  equal(back.eof, true);
});

test("an unterminated string is an error at its first byte", () => {
  const r = new BinaryReader(new Uint8Array([0x41, 0x42]));
  const s = r.str();
  equal(s.ok, false);
  if (!s.ok) {
    equal(s.error.offset, 0);
    equal(s.error.section, "docs/spec/formats/README.md#primitive-encoding");
    equal(s.error.message.includes("unterminated"), true);
  }
  const later = new BinaryReader(new Uint8Array([1, 0x41]));
  equal(unwrap(later.u8()), 1);
  const s2 = later.str();
  equal(s2.ok, false);
  if (!s2.ok) {
    equal(s2.error.offset, 1);
  }
});

test("a negative byte span is reported", () => {
  const r = new BinaryReader(new Uint8Array([1]));
  const b = r.readBytes(-1);
  equal(b.ok, false);
  if (!b.ok) {
    equal(b.error.section, "docs/spec/formats/README.md#primitive-encoding");
  }
});

test("ok carries warnings and err carries the error", () => {
  deepEqual(ok(7, ["assumed codes"]), { ok: true, value: 7, warnings: ["assumed codes"] });
  const bad = err({ offset: 2, section: "docs/spec/formats/README.md#primitive-encoding", message: "x" });
  equal(bad.ok, false);
  if (!bad.ok) {
    equal(bad.error.offset, 2);
  }
});

test("raw byte spans write verbatim", () => {
  const w = new BinaryWriter();
  w.writeBytes(new Uint8Array([9, 8, 7]));
  w.u8(1);
  deepEqual([...w.toBytes()], [9, 8, 7, 1]);
});

test("i16 and i32 keep the sign for negative markers", () => {
  const w = new BinaryWriter();
  w.i16(-1);
  w.i16(-42);
  w.i32(-1);
  deepEqual([...w.toBytes()], [0xff, 0xff, 0xd6, 0xff, 0xff, 0xff, 0xff, 0xff]);
  const r = new BinaryReader(w.toBytes());
  equal(unwrap(r.i16()), -1);
  equal(unwrap(r.i16()), -42);
  equal(unwrap(r.i32()), -1);
});

test("booleans read any non-zero as true and write the canonical 1", () => {
  const w = new BinaryWriter();
  w.bool(true);
  w.bool(false);
  deepEqual([...w.toBytes()], [1, 0, 0, 0]);
  const r = new BinaryReader(w.toBytes());
  equal(unwrap(r.bool()), true);
  equal(unwrap(r.bool()), false);
  const legacy = new BinaryReader(new Uint8Array([0xff, 0xff])); // legacy -1
  equal(unwrap(legacy.bool()), true);
});

test("readUpperBound takes the bound width", () => {
  const w = new BinaryWriter();
  w.i16(2); // 3 entries
  w.i32(4); // 5 entries
  const r = new BinaryReader(w.toBytes());
  equal(unwrap(r.readUpperBound()), 3);
  equal(unwrap(r.readUpperBound("i32")), 5);
});

test("the true-count rule is exactly n entries, with no +1", () => {
  equal(trueCount(0), 0);
  equal(trueCount(7), 7);
  const w = new BinaryWriter();
  w.i16(3);
  w.i32(9);
  const r = new BinaryReader(w.toBytes());
  equal(unwrap(r.readTrueCount()), 3);
  equal(unwrap(r.readTrueCount("i32")), 9);
});

test("the header helper reads magic, major and minor", () => {
  const w = new BinaryWriter();
  equal(w.str("RPGTLKIT BOARD").ok, true);
  w.i16(3);
  w.i16(9);
  const r = new BinaryReader(w.toBytes());
  deepEqual(unwrap(r.header()), { magic: "RPGTLKIT BOARD", major: 3, minor: 9 });
  equal(r.eof, true);
});

test("a negative version field is an error at its own byte", () => {
  // magic (14) + NUL = 15, so major sits at 15 and minor at 17.
  const negativeMinor = new BinaryWriter();
  equal(negativeMinor.str("RPGTLKIT BOARD").ok, true);
  negativeMinor.i16(3);
  negativeMinor.i16(-1);
  const minorResult = new BinaryReader(negativeMinor.toBytes()).header();
  equal(minorResult.ok, false);
  if (!minorResult.ok) {
    equal(minorResult.error.section, "docs/spec/formats/README.md#header-and-version");
    equal(minorResult.error.offset, 17);
  }

  const negativeMajor = new BinaryWriter();
  equal(negativeMajor.str("RPGTLKIT BOARD").ok, true);
  negativeMajor.i16(-2);
  negativeMajor.i16(9);
  const majorResult = new BinaryReader(negativeMajor.toBytes()).header();
  equal(majorResult.ok, false);
  if (!majorResult.ok) {
    equal(majorResult.error.section, "docs/spec/formats/README.md#header-and-version");
    equal(majorResult.error.offset, 15);
  }
});

test("the detection probe reports binary at a caller offset without moving", () => {
  const binary = new BinaryReader(new Uint8Array([0x41, 0x00, 0x03]));
  equal(unwrap(binary.isBinaryAt(1)), true);
  equal(binary.offset, 0);
  const text = new BinaryReader(new Uint8Array([0x41, 0x0d, 0x0a]));
  equal(unwrap(text.isBinaryAt(1)), false);
  const out = text.isBinaryAt(9);
  equal(out.ok, false);
  if (!out.ok) {
    equal(out.error.section, "docs/spec/formats/README.md#header-and-version");
  }
});
