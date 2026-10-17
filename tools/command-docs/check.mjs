import { readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { parseSpecTable } from "./spec-table.mjs";

const root = resolve(fileURLToPath(new URL("../..", import.meta.url)));
const core = await import(pathToFileURL(join(root, "packages/core/dist/index.js")).href);
const { commandDocumentation, validateCommandDocumentation, CORE_PLUGIN, CATALOGUE_PLUGIN, NATIVE_PACK_TABLE } = core;
const specPath = join(root, "docs/spec/engine/rpgcode-functions.md");
const allowlistPath = join(root, "tools/command-docs/legacy-allowlist.json");

function readAllowlist() {
  const value = JSON.parse(readFileSync(allowlistPath, "utf8"));
  if (value === null || typeof value !== "object" || !Array.isArray(value.commands)) {
    throw new Error("legacy-allowlist.json must contain a commands array");
  }
  return value.commands;
}

function defaultPlugins() {
  const ids = ["core", "catalogue", "gsmisc", "triuken", "filereadwrite", "proplug", "xfmwin", "kaimu", "twbutton"];
  const definitions = { core: CORE_PLUGIN, catalogue: CATALOGUE_PLUGIN, ...NATIVE_PACK_TABLE };
  return ids.map((id) => {
    const definition = definitions[id];
    if (definition === undefined) throw new Error(`default plugin ${id} is not available`);
    return { definition };
  });
}

export function check({ plugins = defaultPlugins(), rows = parseSpecTable(readFileSync(specPath, "utf8")), allowlist = readAllowlist() } = {}) {
  const diagnostics = validateCommandDocumentation(plugins, rows, allowlist);
  return { diagnostics, documentation: commandDocumentation(plugins) };
}

if (process.argv[1] !== undefined && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const result = check();
    if (result.diagnostics.length > 0) {
      for (const diagnostic of result.diagnostics) {
        const location = diagnostic.pluginId === undefined ? "allowlist" : `${diagnostic.pluginId}/${diagnostic.name}`;
        console.error(`${diagnostic.code}: ${location}: ${diagnostic.message}`);
      }
      process.exitCode = 1;
    }
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}
