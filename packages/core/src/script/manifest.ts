/**
 * The engine plugin manifest: plain-data selection and ordering for plugin
 * layers (ADR 0004 decision 6; docs/spec/engine/plugins-and-battle.md#e-99).
 *
 * The manifest deliberately has no version field. A host resolves ids to code;
 * core only validates and patches the data, so it never loads a module or
 * touches a host API.
 */

import type { PlainData } from "../ports/plain-data.ts";

/** One manifest entry. `core` is the first (bottom) pinned layer. */
export type PluginManifestEntry = {
  readonly id: string;
  readonly enabled?: boolean;
  readonly options?: PlainData;
};

/** The ordered, data-only plugin selection. */
export type PluginManifest = readonly PluginManifestEntry[];

/** A by-id edit to an effective manifest. */
export type PluginManifestOperation =
  | { readonly op: "remove"; readonly id: string }
  | { readonly op: "disable"; readonly id: string }
  | { readonly op: "reorder"; readonly ids: readonly string[] }
  | { readonly op: "replace"; readonly id: string; readonly entry: PluginManifestEntry }
  | { readonly op: "append"; readonly entry: PluginManifestEntry };

/** A patch is applied in array order, deterministically. */
export type PluginManifestPatch = readonly PluginManifestOperation[];

/** A located manifest error. `index` is an entry or operation index. */
export type PluginManifestDiagnostic = {
  readonly code: string;
  readonly path: string;
  readonly index: number;
  readonly message: string;
};

export type PluginManifestPatchResult = {
  readonly manifest: PluginManifest;
  readonly diagnostics: readonly PluginManifestDiagnostic[];
};

export type PluginManifestParseResult = {
  readonly manifest: PluginManifest | null;
  readonly diagnostics: readonly PluginManifestDiagnostic[];
};

/** The engine's current packs, in command-layer order. */
export const ENGINE_DEFAULT_MANIFEST: PluginManifest = [
  { id: "core" },
  { id: "catalogue" },
  { id: "gsmisc" },
  { id: "triuken" },
  { id: "filereadwrite" },
  { id: "proplug" },
  { id: "xfmwin" },
  { id: "kaimu" },
  { id: "twbutton" },
];

/** Descriptive alias for callers that want the default explicitly. */
export const DEFAULT_PLUGIN_MANIFEST = ENGINE_DEFAULT_MANIFEST;

function diagnostic(
  code: string,
  path: string,
  index: number,
  message: string,
): PluginManifestDiagnostic {
  return { code, path, index, message };
}

function isPlainData(value: unknown, seen: Set<object> = new Set()): value is PlainData {
  if (value === null) return true;
  if (typeof value === "boolean" || typeof value === "string") return true;
  if (typeof value === "number") return Number.isFinite(value) && !Object.is(value, -0);
  if (typeof value !== "object") return false;
  if (seen.has(value)) return false;
  seen.add(value);
  if (Array.isArray(value)) {
    for (let index = 0; index < value.length; index += 1) {
      if (!(index in value) || !isPlainData(value[index], seen)) return false;
    }
    seen.delete(value);
    return true;
  }
  if (Object.getPrototypeOf(value) !== Object.prototype && Object.getPrototypeOf(value) !== null) {
    return false;
  }
  for (const key of Object.keys(value)) {
    if (!isPlainData((value as Record<string, unknown>)[key], seen)) return false;
  }
  seen.delete(value);
  return true;
}

function hasOnlyKeys(value: Record<string, unknown>, keys: readonly string[]): boolean {
  const allowed = new Set(keys);
  return Object.keys(value).every((key) => allowed.has(key));
}

function parseEntry(
  value: unknown,
  path: string,
  index: number,
): { entry: PluginManifestEntry | null; diagnostic?: PluginManifestDiagnostic } {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    return { entry: null, diagnostic: diagnostic("manifest.entry", path, index, "entry must be an object") };
  }
  const record = value as Record<string, unknown>;
  if (!hasOnlyKeys(record, ["id", "enabled", "options"])) {
    return {
      entry: null,
      diagnostic: diagnostic("manifest.unknown-field", path, index, "entry contains an unknown field"),
    };
  }
  if (typeof record.id !== "string" || record.id.length === 0) {
    return { entry: null, diagnostic: diagnostic("manifest.id", path, index, "entry id must be a non-empty string") };
  }
  if (record.enabled !== undefined && typeof record.enabled !== "boolean") {
    return { entry: null, diagnostic: diagnostic("manifest.enabled", path, index, "entry enabled must be boolean") };
  }
  if (record.options !== undefined && !isPlainData(record.options)) {
    return { entry: null, diagnostic: diagnostic("manifest.options", path, index, "entry options must be plain JSON data") };
  }
  const entry: { id: string; enabled?: boolean; options?: PlainData } = { id: record.id };
  if (record.enabled !== undefined) entry.enabled = record.enabled;
  if (record.options !== undefined) entry.options = record.options;
  return { entry };
}

/** Validate untrusted manifest data and report every located error. */
export function parsePluginManifest(input: unknown, path = "manifest"): PluginManifestParseResult {
  if (!Array.isArray(input)) {
    return { manifest: null, diagnostics: [diagnostic("manifest.type", path, 0, "manifest must be an array")] };
  }
  const entries: PluginManifestEntry[] = [];
  const diagnostics: PluginManifestDiagnostic[] = [];
  const ids = new Set<string>();
  for (let index = 0; index < input.length; index += 1) {
    const parsed = parseEntry(input[index], path, index);
    if (parsed.diagnostic !== undefined) {
      diagnostics.push(parsed.diagnostic);
      continue;
    }
    const entry = parsed.entry!;
    if (ids.has(entry.id)) {
      diagnostics.push(diagnostic("manifest.duplicate-id", path, index, `duplicate plugin id "${entry.id}"`));
      continue;
    }
    ids.add(entry.id);
    entries.push(entry);
  }
  return { manifest: diagnostics.length === 0 ? entries : null, diagnostics };
}

function cloneEntry(entry: PluginManifestEntry): PluginManifestEntry {
  const copy: { id: string; enabled?: boolean; options?: PlainData } = { id: entry.id };
  if (entry.enabled !== undefined) copy.enabled = entry.enabled;
  if (entry.options !== undefined) copy.options = entry.options;
  return copy;
}

function locate(manifest: readonly PluginManifestEntry[], id: string): number {
  return manifest.findIndex((entry) => entry.id === id);
}

/** Apply a data-only patch; invalid operations leave the current list unchanged. */
export function applyPluginManifestPatch(
  manifest: PluginManifest,
  patch: PluginManifestPatch,
  path = "manifest",
): PluginManifestPatchResult {
  const entries = manifest.map(cloneEntry);
  const diagnostics: PluginManifestDiagnostic[] = [];
  const seen = new Set<string>();
  for (let index = 0; index < entries.length; index += 1) {
    const entry = entries[index]!;
    if (seen.has(entry.id)) {
      diagnostics.push(diagnostic("manifest.duplicate-id", path, index, `duplicate plugin id "${entry.id}"`));
    }
    seen.add(entry.id);
    if (entry.id === "core" && (index !== 0 || entry.enabled === false)) {
      diagnostics.push(diagnostic("manifest.core-pinned", path, index, 'plugin "core" must be enabled at the bottom layer'));
    }
  }
  const reject = (code: string, index: number, message: string): void => {
    diagnostics.push(diagnostic(code, path, index, message));
  };

  for (let index = 0; index < patch.length; index += 1) {
    const operation = patch[index]!;
    if (operation === null || typeof operation !== "object" || Array.isArray(operation)) {
      reject("manifest.operation", index, "manifest patch operation must be an object");
      continue;
    }
    if (operation.op === "append") {
      const parsed = parseEntry(operation.entry, path, index);
      if (parsed.diagnostic !== undefined) {
        diagnostics.push(parsed.diagnostic);
        continue;
      }
      const entry = parsed.entry!;
      if (entry.id === "core") {
        reject("manifest.core-pinned", index, 'plugin "core" must remain the bottom layer');
        continue;
      }
      if (locate(entries, entry.id) >= 0) {
        reject("manifest.duplicate-id", index, `duplicate plugin id "${entry.id}"`);
        continue;
      }
      entries.push(cloneEntry(entry));
      continue;
    }
    if (operation.op === "remove" || operation.op === "disable") {
      const at = locate(entries, operation.id);
      if (at < 0) {
        reject("manifest.unknown-id", index, `unknown plugin id "${operation.id}"`);
        continue;
      }
      if (operation.id === "core") {
        reject("manifest.core-pinned", index, 'plugin "core" cannot be removed or disabled');
        continue;
      }
      if (operation.op === "remove") entries.splice(at, 1);
      else entries[at] = { ...entries[at]!, enabled: false };
      continue;
    }
    if (operation.op === "replace") {
      const parsed = parseEntry(operation.entry, path, index);
      if (parsed.diagnostic !== undefined) {
        diagnostics.push(parsed.diagnostic);
        continue;
      }
      const entry = parsed.entry!;
      const at = locate(entries, operation.id);
      if (at < 0) {
        reject("manifest.unknown-id", index, `unknown plugin id "${operation.id}"`);
        continue;
      }
      if (operation.id === "core" || entry.id === "core") {
        reject("manifest.core-pinned", index, 'plugin "core" cannot be replaced');
        continue;
      }
      const duplicateAt = locate(entries, entry.id);
      if (duplicateAt >= 0 && duplicateAt !== at) {
        reject("manifest.duplicate-id", index, `duplicate plugin id "${entry.id}"`);
        continue;
      }
      entries[at] = cloneEntry(entry);
      continue;
    }
    if (operation.op === "reorder") {
      const ids = operation.ids;
      if (!Array.isArray(ids)) {
        reject("manifest.reorder", index, "reorder ids must be an array");
        continue;
      }
      const expected = new Set(entries.map((entry) => entry.id));
      const supplied = new Set<string>();
      let valid = ids.length === entries.length;
      for (const id of ids) {
        if (supplied.has(id)) {
          reject("manifest.duplicate-id", index, `duplicate plugin id "${id}" in reorder`);
          valid = false;
        }
        if (!expected.has(id)) {
          reject("manifest.unknown-id", index, `unknown plugin id "${id}" in reorder`);
          valid = false;
        }
        supplied.add(id);
      }
      if (ids.length !== entries.length) {
        reject("manifest.reorder", index, "reorder must name every effective plugin exactly once");
        valid = false;
      }
      if (supplied.size !== expected.size) {
        reject("manifest.reorder", index, "reorder must retain every effective plugin");
        valid = false;
      }
      if (valid && ids[0] !== "core") {
        reject("manifest.core-pinned", index, 'plugin "core" must remain the bottom layer');
        valid = false;
      }
      if (valid) {
        const byId = new Map(entries.map((entry) => [entry.id, entry]));
        entries.splice(0, entries.length, ...ids.map((id) => byId.get(id)!));
      }
      continue;
    }
    reject("manifest.operation", index, "unknown manifest patch operation");
  }

  return { manifest: entries, diagnostics };
}

/** True only for an enabled entry; disabled layers are never resolved. */
export function isPluginManifestEntryEnabled(entry: PluginManifestEntry): boolean {
  return entry.enabled !== false;
}
