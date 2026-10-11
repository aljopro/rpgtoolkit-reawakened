// The published core surface: the runner/editor port contracts (AD-1…AD-17)
// and the canonical form and hashes (AD-11).
export * from "./canon/index.ts";
export type * from "./ports/index.ts";
// The validator is a value: a consumer at an untyped boundary calls it.
export * from "./validate/index.ts";
// Legacy-format reading: the shared result contract and binary primitives
// (AD-18, format-spec §1).
export * from "./formats/index.ts";
