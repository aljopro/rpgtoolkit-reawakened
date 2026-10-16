// The binary primitives of docs/spec/formats/README.md#primitive-encoding (AD-18): the little-endian reader
// and writer every legacy format reader builds on, plus the Windows-1252 and
// COLORREF helpers they share.
export * from "./reader.ts";
export * from "./writer.ts";
export * from "./color.ts";
export * from "./cp1252.ts";
