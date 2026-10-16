import {
  isPluginManifestEntryEnabled,
  type PluginDefinition,
  type PluginManifest,
  type PluginManifestDiagnostic,
  type ResolvedPlugin,
} from "@tk-reawakened/core";

/** Host-owned id table. Core receives only the resolved definitions. */
export type PluginDefinitionTable = Readonly<Record<string, PluginDefinition>>;

export type PluginManifestResolution = {
  readonly plugins: readonly ResolvedPlugin[];
  readonly diagnostics: readonly PluginManifestDiagnostic[];
};

/** Resolve an effective manifest without putting a loader in core. */
export function resolvePluginManifest(
  manifest: PluginManifest,
  table: PluginDefinitionTable,
  path = "manifest",
): PluginManifestResolution {
  const plugins: ResolvedPlugin[] = [];
  const diagnostics: PluginManifestDiagnostic[] = [];
  const seen: Record<string, true> = {};
  for (let index = 0; index < manifest.length; index += 1) {
    const entry = manifest[index]!;
    if (seen[entry.id] === true) {
      diagnostics.push({
        code: "manifest.duplicate-id",
        path,
        index,
        message: `duplicate plugin id "${entry.id}"`,
      });
      continue;
    }
    seen[entry.id] = true;
    if (!isPluginManifestEntryEnabled(entry)) continue;
    const definition = table[entry.id];
    if (definition === undefined) {
      diagnostics.push({
        code: "plugin.unresolved",
        path,
        index,
        message: `plugin id "${entry.id}" could not be resolved`,
      });
      continue;
    }
    const resolved: ResolvedPlugin =
      entry.options === undefined ? { definition } : { definition, options: entry.options };
    plugins.push(resolved);
  }
  return { plugins, diagnostics };
}
