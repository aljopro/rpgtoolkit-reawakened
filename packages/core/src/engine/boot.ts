/**
 * Pure helpers for the start-up sequence (E-02, docs/spec/engine/main-loop-and-startup.md#reawakened-boot-sequence).
 *
 * Nothing here touches state or the host: each function maps the loaded main
 * file and the asset index to plain data the engine then acts on.
 */

import type { MainFile } from "../formats/main-file/model.ts";
import { resolveReference, typeFolder, type AssetKind } from "../formats/main-file/layout.ts";
import { assetKey } from "../formats/resolver/resolver.ts";
import type { AssetIndex, AssetRoot } from "../formats/resolver/model.ts";
import type { PlainData } from "../ports/plain-data.ts";
import type { AssetKey } from "../ports/keys.ts";
import type { Diagnostic } from "../ports/engine.ts";
import type { SectionKey } from "../save/state.ts";
import {
  ENGINE_DEFAULT_MANIFEST,
  ENGINE_PLUGIN_TABLE,
  applyPluginManifestPatch,
  isPluginManifestEntryEnabled,
  type EffectKind,
  type PluginManifest,
  type PluginManifestPatch,
  type ResolvedPlugin,
} from "../script/index.ts";
import { withOwner } from "../script/program.ts";
import type { PackageCatalogueEntry } from "../script/plugin.ts";
import { foldNamespace } from "../script/manifest.ts";
import type { PostEffect } from "./effects.ts";

/** The canonical key prefix of `kind`'s folder under `root` (docs/spec/formats/README.md#paths-inside-files). */
function folderPrefix(root: AssetRoot, kind: AssetKind): string {
  return root.kind === "package" ? assetKey(`${typeFolder(kind)}/`) : assetKey(resolveReference("", root, kind, ""));
}

/** Every indexed key under `kind`'s folder whose key passes `accept`, in index order and without repeats. */
function keysUnder(index: AssetIndex, root: AssetRoot, kind: AssetKind, accept: (key: string) => boolean): AssetKey[] {
  const prefix = folderPrefix(root, kind);
  const seen = new Set<string>();
  const found: AssetKey[] = [];
  for (const key of index.keys) {
    if (!key.startsWith(prefix) || !accept(key) || seen.has(key)) continue;
    seen.add(key);
    found.push(key);
  }
  return found;
}

/** E-02 step 2: the TrueType files of the project's `Font\` folder, in index order. */
export function privateFontKeys(index: AssetIndex, root: AssetRoot): AssetKey[] {
  return keysUnder(index, root, "fonts", (key) => key.endsWith(".ttf"));
}

/** Every program source under `Prg\`, in index order, fetched so the script runtime can resolve names synchronously. */
export function programKeys(index: AssetIndex, root: AssetRoot): AssetKey[] {
  return keysUnder(index, root, "programs", () => true);
}

/** The ordered TKR package names from the main file's native extension. */
export function mainFilePluginNames(main: MainFile): string[] {
  return [...(main.packagePlugins ?? [])];
}

/** Convert the main file package list into the existing manifest patch seam. */
export function mainFilePluginPatch(main: MainFile, catalogue: readonly PackageCatalogueEntry[] = []): PluginManifestPatch {
  return mainFilePluginNames(main).map((id) => {
    const packageEntry = catalogue.find((item) => foldNamespace(item.name) === foldNamespace(id));
    return {
      op: "append",
      entry: packageEntry === undefined
        ? { id }
        : {
            id: foldNamespace(packageEntry.name),
            version: packageEntry.version,
            ...(packageEntry.namespace === undefined ? {} : { namespace: packageEntry.namespace }),
            requests: [...packageEntry.requests],
          },
    };
  });
}

/**
 * E-02 step 3: the engine default manifest plus the package entries named by
 * the main file. Legacy DLL rows are retained as data and never interpreted.
 */
export function pluginManifestFor(
  main: MainFile,
  mainKeyForDiagnostics: string,
  catalogue: readonly PackageCatalogueEntry[] = [],
): { readonly manifest: PluginManifest; readonly diagnostics: Diagnostic[] } {
  const baseManifest: PluginManifest = ENGINE_DEFAULT_MANIFEST.map((entry) => ({ id: entry.id }));
  const patched = applyPluginManifestPatch(baseManifest, mainFilePluginPatch(main, catalogue), mainKeyForDiagnostics);
  return {
    manifest: patched.manifest,
    diagnostics: patched.diagnostics.map((item) => ({
      code: item.code,
      file: item.path,
      line: item.index,
      message: item.message,
    })),
  };
}

/** Resolve manifest ids against engine defaults and the host's package catalogue. */
export function resolveManifestPlugins(
  manifest: PluginManifest,
  file = "",
  catalogue: readonly PackageCatalogueEntry[] = [],
): { readonly plugins: ResolvedPlugin[]; readonly diagnostics: Diagnostic[] } {
  const plugins: ResolvedPlugin[] = [];
  const diagnostics: Diagnostic[] = [];
  const byName = new Map<string, PackageCatalogueEntry>();
  const duplicates = new Set<string>();
  for (const item of catalogue) {
    const name = foldNamespace(item.name);
    if (byName.has(name)) duplicates.add(name);
    else byName.set(name, item);
  }
  for (let index = 0; index < manifest.length; index += 1) {
    const entry = manifest[index]!;
    if (!isPluginManifestEntryEnabled(entry)) continue;
    const definition = ENGINE_PLUGIN_TABLE[entry.id];
    if (definition !== undefined) {
      plugins.push(entry.options === undefined ? { definition } : { definition, options: entry.options });
      continue;
    }
    const packageName = foldNamespace(entry.id);
    const packageEntry = byName.get(packageName);
    if (
      packageEntry === undefined
      || duplicates.has(packageName)
      || packageEntry.version !== entry.version
      || foldNamespace(packageEntry.definition.id) !== packageName
      || packageEntry.definition.version !== entry.version
    ) {
      const packageIndex = index - ENGINE_DEFAULT_MANIFEST.length;
      diagnostics.push({
        code: "plugin.unresolved",
        file,
        line: packageIndex >= 0 ? packageIndex : 0,
        message: `manifest id "${entry.id}" has no matching host package definition`,
      });
      continue;
    }
    const namespace = entry.namespace ?? packageName;
    const startup = packageEntry.startup === undefined ? undefined : withOwner(packageEntry.startup, packageName);
    plugins.push({
      definition: packageEntry.definition,
      namespace,
      package: {
        name: packageName,
        version: packageEntry.version,
        namespace,
        requests: [...(entry.requests ?? [])],
      },
      ...(startup === undefined ? {} : { startup }),
    });
  }
  return { plugins, diagnostics };
}

/**
 * One engine-posted effect, shaped like a VM record without `seq` and `tick`
 * (A-13: boot and the animation phase post directly through `postEffect`).
 */
export function engineEffect(section: SectionKey, name: string, args: readonly PlainData[], kind: EffectKind = "state-write"): PostEffect {
  return {
    thread: 0,
    name,
    kind,
    args: [...args],
    out: {},
    result: null,
    patch: { section, path: [], op: "merge", value: null },
    wait: null,
    request: null,
  };
}
