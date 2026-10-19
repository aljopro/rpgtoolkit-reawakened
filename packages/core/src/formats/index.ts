// Legacy-format reading and writing (docs/spec/formats/README.md#primitive-encoding):
// the shared result contract (AD-18) and the primitives and readers built on it —
// binary primitives, animations, tilesets, battle data and images
// (`docs/spec/formats/images.md`), asset references (`docs/spec/formats/README.md#tile-references`)
// and package loading (`docs/spec/formats/packaging-and-paths.md`).
// The core format registry (AD-31) dispatches a file to the decoder for its
// extension or magic header.
export * from "./result.ts";
export * from "./binary/index.ts";
export * from "./animation/index.ts";
export * from "./board/index.ts";
export * from "./battle/index.ts";
export * from "./tileset/index.ts";
export * from "./tile-bitmap/index.ts";
export * from "./image/index.ts";
export * from "./main-file/index.ts";
export * from "./actor/index.ts";
export * from "./resolver/index.ts";
export * from "./package/index.ts";
export * from "./registry/index.ts";
export * from "./tile-animation/index.ts";
export * from "./single-tile/index.ts";
export * from "./font/index.ts";
export * from "./text/index.ts";
export * from "./audio/index.ts";
