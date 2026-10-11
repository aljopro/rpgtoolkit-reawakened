// Legacy-format reading and writing (format-spec §1): the shared result
// contract (AD-18) and the primitives and readers built on it — the binary
// primitives, animations, tilesets, battle data and game images (§10, AD-28).
export * from "./result.ts";
export * from "./binary/index.ts";
export * from "./animation/index.ts";
export * from "./board/index.ts";
export * from "./battle/index.ts";
export * from "./tileset/index.ts";
export * from "./image/index.ts";
export * from "./main-file/index.ts";
