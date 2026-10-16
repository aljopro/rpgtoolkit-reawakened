// The pure asset resolver and its index (docs/spec/formats/README.md#paths-inside-files, AD-5): the
// case-insensitive, separator- and type-folder-normalising lookup a runner
// answers asset requests from, and the asset roots a game folder or a package
// resolves against.
export * from "./model.ts";
export * from "./resolver.ts";
