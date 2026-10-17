/**
 * Pure command documentation projection and validation (ADR 0004; ticket 3.29).
 *
 * This module deliberately receives resolved plugin data rather than a registry or
 * VM. Documentation is registration metadata and never participates in dispatch,
 * save state, effects or hashes.
 */

import type { BuiltinDoc, BuiltinSpec, DocTag, ParamDoc, ParamSpec, RunnerSupport } from "./builtins.ts";
import type { ResolvedPlugin } from "./plugin.ts";

export type CommandParamDocumentation = {
  readonly name: string;
  readonly optional: boolean;
  readonly byRef: boolean;
  readonly variadic: boolean;
  readonly summary: string | null;
  readonly unit: string | null;
  readonly tags: readonly DocTag[];
  readonly support: RunnerSupport | null;
};

export type CommandDocumentation = {
  readonly pluginId: string;
  readonly pluginVersion: string;
  /** Canonical registered name for this definition. */
  readonly canonicalName: string;
  /** Public lookup spelling represented by this entry. */
  readonly name: string;
  readonly aliases: readonly string[];
  readonly params: readonly CommandParamDocumentation[];
  readonly summary: string | null;
  readonly behaviour: string | null;
  readonly examples: readonly string[];
  readonly tags: readonly DocTag[];
  readonly support: RunnerSupport | null;
};

/** One normative row parsed from docs/spec/engine/rpgcode-functions.md. */
export type NativeCommandRow = {
  readonly name: string;
  readonly purpose: string;
  readonly section?: string;
  readonly aliasOf?: string;
  readonly obsolete?: boolean;
};

export type CommandDocumentationDiagnostic = {
  readonly code: string;
  readonly pluginId?: string;
  readonly name?: string;
  readonly key?: string;
  readonly row?: string;
  readonly message: string;
};

function fold(name: string): string {
  return name.toLowerCase();
}

function copySupport(support: RunnerSupport | undefined): RunnerSupport | null {
  if (support === undefined) return null;
  const copy: Record<string, { readonly level: "full" | "partial" | "none"; readonly note?: string }> = {};
  for (const [runnerId, value] of Object.entries(support)) {
    copy[runnerId] = value.note === undefined ? { level: value.level } : { level: value.level, note: value.note };
  }
  return copy;
}

function copyTags(tags: readonly DocTag[] | undefined): DocTag[] {
  return tags === undefined ? [] : [...tags];
}

function paramDocumentation(param: ParamSpec): CommandParamDocumentation {
  const doc = param.doc;
  return {
    name: param.name,
    optional: param.optional,
    byRef: param.byRef,
    variadic: param.variadic,
    summary: doc?.summary ?? null,
    unit: doc?.unit ?? null,
    tags: copyTags(doc?.tags),
    support: copySupport(doc?.support),
  };
}

function entry(
  plugin: ResolvedPlugin,
  command: BuiltinSpec,
  name: string,
  alias: boolean,
): CommandDocumentation {
  const doc: BuiltinDoc | undefined = command.doc;
  const tags = copyTags(doc?.tags);
  if (alias && !tags.includes("alias")) tags.push("alias");
  return {
    pluginId: plugin.definition.id,
    pluginVersion: plugin.definition.version,
    canonicalName: command.name,
    name,
    aliases: [...command.aliases],
    params: command.params.map(paramDocumentation),
    summary: doc?.summary ?? null,
    behaviour: doc?.behaviour ?? null,
    examples: doc?.examples === undefined ? [] : [...doc.examples],
    tags,
    support: copySupport(doc?.support),
  };
}

/** Project every registered definition, retaining order and every layer. */
export function commandDocumentation(
  plugins: readonly ResolvedPlugin[],
): readonly CommandDocumentation[] {
  const output: CommandDocumentation[] = [];
  for (const plugin of plugins) {
    for (const command of plugin.definition.commands) {
      output.push(entry(plugin, command, command.name, false));
      for (const alias of command.aliases) output.push(entry(plugin, command, alias, true));
    }
  }
  return output;
}

function commandKey(pluginId: string, name: string): string {
  return `${pluginId}/${name}`;
}

function nativeRowsByName(rows: readonly NativeCommandRow[]): Map<string, NativeCommandRow> {
  const byName = new Map<string, NativeCommandRow>();
  for (const row of rows) byName.set(fold(row.name), row);
  return byName;
}

function canonicalNativeRow(
  row: NativeCommandRow | undefined,
  rows: ReadonlyMap<string, NativeCommandRow>,
): NativeCommandRow | undefined {
  if (row?.aliasOf === undefined) return row;
  return rows.get(fold(row.aliasOf)) ?? row;
}

function hasText(value: string | undefined): boolean {
  return value !== undefined && value.trim().length > 0;
}

const DOC_TAGS = new Set<DocTag>(["legacy", "alias", "deprecated", "obsolete"]);
const RUNNER_ID = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const SUPPORT_LEVELS = new Set(["full", "partial", "none"]);

function validateSupport(
  support: RunnerSupport | undefined,
  location: string,
  diagnostics: CommandDocumentationDiagnostic[],
): void {
  if (support === undefined) return;
  for (const [runnerId, value] of Object.entries(support)) {
    if (!RUNNER_ID.test(runnerId)) {
      diagnostics.push({ code: "support.runner-id", key: location, message: `${location} has invalid runner id ${JSON.stringify(runnerId)}; expected lowercase kebab-case` });
    }
    if (!SUPPORT_LEVELS.has(value.level)) {
      diagnostics.push({ code: "support.level", key: location, message: `${location}/${runnerId} has invalid support level ${JSON.stringify(value.level)}` });
    }
    if ((value.level === "partial" || value.level === "none") && !hasText(value.note)) {
      diagnostics.push({ code: "support.note", key: location, message: `${location}/${runnerId} requires a non-empty note for ${value.level} support` });
    }
  }
}

function validateTags(
  tags: readonly DocTag[] | undefined,
  location: string,
  diagnostics: CommandDocumentationDiagnostic[],
  allowAlias: boolean,
): void {
  if (tags === undefined) return;
  const seen = new Set<string>();
  for (const tag of tags) {
    if (!DOC_TAGS.has(tag)) {
      diagnostics.push({ code: "doc.tag", key: location, message: `${location} has unknown documentation tag ${JSON.stringify(tag)}` });
    }
    if (seen.has(tag)) {
      diagnostics.push({ code: "doc.tag-duplicate", key: location, message: `${location} repeats documentation tag ${JSON.stringify(tag)}` });
    }
    seen.add(tag);
    if (tag === "alias" && !allowAlias) {
      diagnostics.push({ code: "doc.alias-tag", key: location, message: `${location} cannot explicitly carry the alias tag on its canonical definition` });
    }
  }
}

function validateParamDoc(
  param: ParamSpec,
  location: string,
  diagnostics: CommandDocumentationDiagnostic[],
): void {
  const doc: ParamDoc | undefined = param.doc;
  if (doc === undefined) return;
  if (!hasText(doc.summary)) diagnostics.push({ code: "param.summary", key: location, message: `${location} has an empty parameter doc.summary` });
  if (doc.unit !== undefined && !hasText(doc.unit)) diagnostics.push({ code: "param.unit", key: location, message: `${location} has an empty parameter doc.unit` });
  validateTags(doc.tags, location, diagnostics, true);
  if (doc.tags?.includes("alias") === true) {
    diagnostics.push({ code: "param.alias-tag", key: location, message: `${location} cannot carry the alias documentation tag` });
  }
  validateSupport(doc.support, location, diagnostics);
}

/**
 * Validate required documentation, the explicit migration allowlist, and
 * native Purpose/tag relationships. The caller owns Markdown and JSON I/O.
 */
export function validateCommandDocumentation(
  plugins: readonly ResolvedPlugin[],
  nativeRows: readonly NativeCommandRow[],
  allowlist: readonly string[],
): readonly CommandDocumentationDiagnostic[] {
  const diagnostics: CommandDocumentationDiagnostic[] = [];
  const rows = nativeRowsByName(nativeRows);
  const allowed = new Set<string>();
  const commandKeys = new Set<string>();

  for (const key of allowlist) {
    if (allowed.has(key)) {
      diagnostics.push({ code: "allowlist.duplicate", key, message: `duplicate allowlist key ${key}` });
    }
    allowed.add(key);
  }

  for (const plugin of plugins) {
    const pluginId = plugin.definition.id;
    for (const command of plugin.definition.commands) {
      const canonicalKey = commandKey(pluginId, command.name);
      const doc = command.doc;
      validateTags(doc?.tags, canonicalKey, diagnostics, false);
      validateSupport(doc?.support, canonicalKey, diagnostics);
      for (let index = 0; index < command.params.length; index += 1) {
        validateParamDoc(command.params[index]!, `${canonicalKey}/param/${index}`, diagnostics);
      }
      for (const name of [command.name, ...command.aliases]) {
        const key = commandKey(pluginId, name);
        commandKeys.add(key);
        const allowlisted = allowed.has(key);
        if (doc === undefined) {
          if (!allowlisted) {
            diagnostics.push({ code: "doc.required", pluginId, name, key, message: `${key} requires doc.summary and doc.behaviour` });
          }
        } else {
          if (!hasText(doc.summary)) diagnostics.push({ code: "doc.summary", pluginId, name, key, message: `${key} has an empty doc.summary` });
          if (!hasText(doc.behaviour)) diagnostics.push({ code: "doc.behaviour", pluginId, name, key, message: `${key} has an empty doc.behaviour` });
        }

        const row = canonicalNativeRow(rows.get(fold(name)), rows);
        if (doc !== undefined && row !== undefined && hasText(doc.summary)) {
          const summary = doc.summary.trim().replace(/\s+/g, " ");
          const purpose = row.purpose.trim().replace(/\s+/g, " ");
          if (summary !== purpose) {
            diagnostics.push({ code: "native.summary-mismatch", pluginId, name, key, row: row.section === undefined ? row.name : `${row.section}:${row.name}`, message: `${key} summary does not match native Purpose row ${row.name}: ${JSON.stringify(doc.summary)} != ${JSON.stringify(row.purpose)}` });
          }
        }
        if (doc !== undefined && row?.obsolete === true && !doc.tags?.includes("obsolete")) {
          diagnostics.push({ code: "native.obsolete-tag", pluginId, name, key, row: row.name, message: `${key} is obsolete in native row ${row.name} and requires the obsolete tag` });
        }
      }
    }
  }

  for (const key of allowlist) {
    if (!commandKeys.has(key)) diagnostics.push({ code: "allowlist.stale", key, message: `allowlist key ${key} does not exist in the assembled commands` });
  }

  return diagnostics;
}
