// The core format registry (AD-31): the `AssetDecoder` interface and its
// `AssetResolver` decode context, the registry that dispatches bytes to a
// decoder by file extension and magic header, and the core decoders that wrap
// every landed reader.
export * from "./decoder.ts";
export * from "./registry.ts";
export * from "./core-decoders.ts";
