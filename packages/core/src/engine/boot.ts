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
  CATALOGUE_PLUGIN,
  CORE_PLUGIN,
  MEDIA_PLUGIN,
  ENGINE_DEFAULT_MANIFEST,
  NATIVE_PACK_TABLE,
  getDeclinedPluginDiagnostic,
  isPluginManifestEntryEnabled,
  lookupLegacyPlugin,
  type EffectKind,
  type PluginManifest,
  type ResolvedPlugin,
} from "../script/index.ts";
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

/** The plugin names the main file lists (E-02 step 3): file names at minor 3 and later, `tkplug<N>` slots before. */
export function mainFilePluginNames(main: MainFile): string[] {
  const names: string[] = [];
  main.plugins.forEach((entry, slot) => {
    if (main.minor >= 3) {
      if (entry.pluginFile !== "") names.push(entry.pluginFile);
    } else if (entry.enabled !== 0) {
      names.push(`tkplug${slot}`);
    }
  });
  return names;
}

/**
 * E-02 step 3: the engine default manifest plus the native packs the main
 * file's plugin list names. A declined or unknown name is a located
 * diagnostic; menu and battle plugins are those subsystems', not manifest
 * entries (`subsystem` and `loader` rows add nothing here).
 */
export function pluginManifestFor(main: MainFile, mainKeyForDiagnostics: string): { readonly manifest: PluginManifest; readonly diagnostics: Diagnostic[] } {
  const manifest: { id: string }[] = ENGINE_DEFAULT_MANIFEST.map((entry) => ({ id: entry.id }));
  const diagnostics: Diagnostic[] = [];
  mainFilePluginNames(main).forEach((name, slot) => {
    const entry = lookupLegacyPlugin(name);
    if (entry === undefined) {
      diagnostics.push({ code: "plugin.unresolved", file: mainKeyForDiagnostics, line: 0, message: `plugin "${name}" is not a known legacy plugin and was not loaded` });
      return;
    }
    if (entry.status === "declined") {
      const declined = getDeclinedPluginDiagnostic(name, "main-file", slot);
      if (declined !== undefined) diagnostics.push({ code: declined.code, file: mainKeyForDiagnostics, line: 0, message: declined.message });
      return;
    }
    if (entry.status === "native" && entry.packId !== undefined && !manifest.some((existing) => existing.id === entry.packId)) {
      manifest.push({ id: entry.packId });
    }
  });
  return { manifest, diagnostics };
}

/** Resolve manifest ids to the engine's own definitions; a disabled entry is skipped and an unknown id is a diagnostic. */
export function resolveManifestPlugins(manifest: PluginManifest, file = ""): { readonly plugins: ResolvedPlugin[]; readonly diagnostics: Diagnostic[] } {
  const plugins: ResolvedPlugin[] = [];
  const diagnostics: Diagnostic[] = [];
  for (const entry of manifest) {
    if (!isPluginManifestEntryEnabled(entry)) continue;
    const definition = entry.id === "core" ? CORE_PLUGIN : entry.id === "media" ? MEDIA_PLUGIN : entry.id === "catalogue" ? CATALOGUE_PLUGIN : NATIVE_PACK_TABLE[entry.id];
    if (definition === undefined) {
      diagnostics.push({ code: "plugin.unresolved", file, line: 0, message: `manifest id "${entry.id}" has no engine definition` });
      continue;
    }
    plugins.push(entry.options === undefined ? { definition } : { definition, options: entry.options });
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
