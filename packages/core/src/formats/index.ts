// Legacy-format reading and writing (format-spec §1): the shared result
// contract (AD-18) and the primitives and readers built on it — the binary
// primitives, animations, tilesets, battle data and game images (§10, AD-28),
// plus the resolution of a reference to an asset key (§1.5, AD-5) and the
// package loader for loose folders, `.tpk` and appended-ZIP EXEs (§13, AD-6).
export * from "./result.ts";
export * from "./binary/index.ts";
export * from "./animation/index.ts";
export * from "./board/index.ts";
export * from "./battle/index.ts";
export * from "./tileset/index.ts";
export * from "./image/index.ts";
export * from "./main-file/index.ts";
export * from "./actor/index.ts";
export * from "./resolver/index.ts";
export * from "./package/index.ts";
