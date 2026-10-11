// The binary primitives of format-spec §1 (AD-18): the little-endian reader
// and writer every legacy format reader builds on, plus the Windows-1252 and
// COLORREF helpers they share.
export * from "./reader.ts";
export * from "./writer.ts";
export * from "./color.ts";
export * from "./cp1252.ts";
