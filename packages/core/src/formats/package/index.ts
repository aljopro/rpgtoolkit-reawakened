// The package loader of format-spec §13 (AD-6): loose folders, `.tpk` ZIP
// archives and standalone EXEs with an appended ZIP behind a `CMP1` trailer,
// all loading to one file list plus the resolver's index, under one exported
// set of untrusted-input limits (AD-17).
export * from "./limits.ts";
export * from "./model.ts";
export * from "./package.ts";
export * from "./zip.ts";
