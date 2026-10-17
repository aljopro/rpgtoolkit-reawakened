/**
 * Pure command documentation projection and validation (ADR 0004; ticket 3.29).
 *
 * This module deliberately receives resolved plugin data rather than a registry or
 * VM. Documentation is registration metadata and never participates in dispatch,
 * save state, effects or hashes.
 */

import type {
  BuiltinDoc,
  BuiltinSpec,
  DocExample,
  DocReturns,
  DocTag,
  DocThrow,
  DocWait,
  ParamDoc,
  ParamDocValue,
  ParamSpec,
  RunnerSupport,
} from "./builtins.ts";
import type { PluginDoc, PluginDefinition, ResolvedPlugin } from "./plugin.ts";

export type CommandParamDocumentation = {
  readonly name: string;
  readonly optional: boolean;
  readonly byRef: boolean;
  readonly variadic: boolean;
  readonly summary: string | null;
  readonly unit: string | null;
  readonly tags: readonly DocTag[];
  readonly support: RunnerSupport | null;
  readonly default: string | null;
  readonly ifOmitted: string | null;
  readonly range: { readonly min?: number; readonly max?: number; readonly note?: string } | null;
  readonly values: readonly ParamDocValue[];
  readonly type: string | null;
  readonly since: string | null;
};

export type PluginDocumentation = {
  readonly summary: string;
  readonly groups: readonly { readonly id: string; readonly name: string; readonly summary: string }[];
  readonly requires: readonly string[];
};

export type CommandDocumentation = {
  readonly pluginId: string;
  readonly pluginVersion: string;
  readonly plugin: PluginDocumentation | null;
  /** Canonical registered name for this definition. */
  readonly canonicalName: string;
  /** Public lookup spelling represented by this entry. */
  readonly name: string;
  readonly aliases: readonly string[];
  readonly params: readonly CommandParamDocumentation[];
  readonly summary: string | null;
  readonly behaviour: string | null;
  readonly examples: readonly DocExample[];
  readonly groups: readonly string[];
  readonly returns: DocReturns | null;
  readonly throws: readonly DocThrow[];
  readonly see: readonly string[];
  readonly since: string | null;
  readonly replacedBy: { readonly kind: "command"; readonly name: string } | { readonly kind: "syntax"; readonly text: string } | null;
  readonly reason: string | null;
  readonly access: "public" | "internal";
  readonly waits: DocWait | null;
  readonly effects: readonly string[];
  readonly todo: readonly string[];
  readonly author: string | null;
  readonly license: string | null;
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

type SupportEntry = { readonly level: "full" | "partial" | "none"; readonly note?: string };

function copySupport(support: RunnerSupport | undefined): RunnerSupport | null {
  if (support === undefined) return null;
  const copy: Record<string, SupportEntry> = {};
  for (const [runnerId, value] of Object.entries(support)) {
    copy[runnerId] = value.note === undefined ? { level: value.level } : { level: value.level, note: value.note };
  }
  return copy;
}

function copyTags(tags: readonly DocTag[] | undefined): DocTag[] {
  return tags === undefined ? [] : [...tags];
}

function copyPluginDoc(doc: PluginDoc | undefined): PluginDocumentation | null {
  if (doc === undefined) return null;
  return {
    summary: doc.summary,
    groups: doc.groups === undefined ? [] : doc.groups.map((group) => ({ id: group.id, name: group.name, summary: group.summary })),
    requires: doc.requires === undefined ? [] : [...doc.requires],
  };
}

function copyExamples(examples: readonly DocExample[] | undefined): readonly DocExample[] {
  if (examples === undefined) return [];
  return examples.map((example) => typeof example === "string" ? example : {
    code: example.code,
    ...(example.caption === undefined ? {} : { caption: example.caption }),
    ...(example.result === undefined ? {} : { result: example.result }),
  });
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
    default: doc?.default ?? null,
    ifOmitted: doc?.ifOmitted ?? null,
    range: doc?.range === undefined ? null : { ...doc.range },
    values: doc?.values === undefined ? [] : doc.values.map((value) => ({ value: value.value, summary: value.summary })),
    type: doc?.type ?? null,
    since: doc?.since ?? null,
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
    plugin: copyPluginDoc(plugin.definition.doc),
    canonicalName: command.name,
    name,
    aliases: [...command.aliases],
    params: command.params.map(paramDocumentation),
    summary: doc?.summary ?? null,
    behaviour: doc?.behaviour ?? null,
    examples: copyExamples(doc?.examples),
    groups: doc?.groups === undefined ? [] : [...doc.groups],
    returns: doc?.returns === undefined ? null : { ...doc.returns },
    throws: doc?.throws === undefined ? [] : doc.throws.map((item) => ({ code: item.code, when: item.when })),
    see: doc?.see === undefined ? [] : [...doc.see],
    since: doc?.since ?? null,
    replacedBy: doc?.replacedBy === undefined ? null : { ...doc.replacedBy },
    reason: doc?.reason ?? null,
    access: doc?.access ?? "public",
    waits: doc?.waits === undefined ? null : { ...doc.waits },
    effects: doc?.effects === undefined ? [] : [...doc.effects],
    todo: doc?.todo === undefined ? [] : [...doc.todo],
    author: doc?.author ?? null,
    license: doc?.license ?? null,
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

const DOC_TAGS = new Set<DocTag>(["legacy", "alias", "deprecated", "obsolete", "experimental"]);
const PARAM_TAGS = new Set<DocTag>(["legacy", "deprecated", "obsolete", "experimental"]);
const RUNNER_ID = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const GROUP_ID = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const SUPPORT_LEVELS = new Set(["full", "partial", "none"]);
const WAIT_KINDS = new Set(["never", "ticks", "until-input", "until-event", "host-request", "other"]);

function derivedGroup(section: string): string {
  return section.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

function validateSupport(
  support: RunnerSupport | undefined,
  location: string,
  diagnostics: CommandDocumentationDiagnostic[],
): void {
  if (support === undefined) return;
  for (const [runnerId, value] of Object.entries(support)) {
    if (!RUNNER_ID.test(runnerId)) diagnostics.push({ code: "support.runner-id", key: location, message: `${location} has invalid runner id ${JSON.stringify(runnerId)}; expected lowercase kebab-case` });
    if (!SUPPORT_LEVELS.has(value.level)) diagnostics.push({ code: "support.level", key: location, message: `${location}/${runnerId} has invalid support level ${JSON.stringify(value.level)}` });
    if ((value.level === "partial" || value.level === "none") && !hasText(value.note)) diagnostics.push({ code: "support.note", key: location, message: `${location}/${runnerId} requires a non-empty note for ${value.level} support` });
  }
}

function validateTags(
  tags: readonly DocTag[] | undefined,
  location: string,
  diagnostics: CommandDocumentationDiagnostic[],
  parameter: boolean,
): void {
  if (tags === undefined) return;
  const allowed = parameter ? PARAM_TAGS : DOC_TAGS;
  const seen = new Set<string>();
  for (const tag of tags) {
    if (!allowed.has(tag)) diagnostics.push({ code: "doc.tag", key: location, message: `${location} has an invalid documentation tag ${JSON.stringify(tag)}` });
    if (seen.has(tag)) diagnostics.push({ code: "doc.tag-duplicate", key: location, message: `${location} repeats documentation tag ${JSON.stringify(tag)}` });
    seen.add(tag);
    if (!parameter && tag === "alias") diagnostics.push({ code: "doc.alias-tag", key: location, message: `${location} cannot explicitly carry the alias tag on its canonical definition` });
  }
  if (!parameter && tags.includes("experimental") && tags.includes("obsolete")) diagnostics.push({ code: "doc.tag-conflict", key: location, message: `${location} cannot be both experimental and obsolete` });
  if (!parameter && tags.includes("experimental") && tags.includes("deprecated")) diagnostics.push({ code: "doc.tag-conflict", key: location, message: `${location} cannot be both experimental and deprecated` });
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
  if (doc.default !== undefined && !hasText(doc.default)) diagnostics.push({ code: "param.default", key: location, message: `${location} has an empty parameter doc.default` });
  if (doc.ifOmitted !== undefined && !hasText(doc.ifOmitted)) diagnostics.push({ code: "param.ifOmitted", key: location, message: `${location} has an empty parameter doc.ifOmitted` });
  if (doc.range !== undefined) {
    if (doc.range.min !== undefined && !Number.isFinite(doc.range.min)) diagnostics.push({ code: "param.range", key: location, message: `${location} has a non-finite range.min` });
    if (doc.range.max !== undefined && !Number.isFinite(doc.range.max)) diagnostics.push({ code: "param.range", key: location, message: `${location} has a non-finite range.max` });
    if (doc.range.min !== undefined && doc.range.max !== undefined && doc.range.min > doc.range.max) diagnostics.push({ code: "param.range", key: location, message: `${location} has range.min greater than range.max` });
    if (doc.range.note !== undefined && !hasText(doc.range.note)) diagnostics.push({ code: "param.range", key: location, message: `${location} has an empty range.note` });
  }
  if (doc.type !== undefined && !hasText(doc.type)) diagnostics.push({ code: "param.type", key: location, message: `${location} has an empty parameter doc.type` });
  validateTags(doc.tags, location, diagnostics, true);
  if (doc.values !== undefined) {
    for (const value of doc.values) {
      if (!hasText(value.value) || !hasText(value.summary)) diagnostics.push({ code: "param.value", key: location, message: `${location} has an enum value with empty value or summary` });
    }
  }
  validateSupport(doc.support, location, diagnostics);
}

function validateCommandDoc(
  command: BuiltinSpec,
  pluginId: string,
  commandNames: ReadonlySet<string>,
  rows: ReadonlyMap<string, NativeCommandRow>,
  pluginGroups: ReadonlySet<string>,
  specGroups: ReadonlySet<string>,
  diagnostics: CommandDocumentationDiagnostic[],
): void {
  const doc = command.doc;
  const key = commandKey(pluginId, command.name);
  if (doc === undefined) return;
  validateTags(doc.tags, key, diagnostics, false);
  validateSupport(doc.support, key, diagnostics);
  const hasReplacement = doc.replacedBy !== undefined &&
    ((doc.replacedBy.kind === "command" && hasText(doc.replacedBy.name)) ||
      (doc.replacedBy.kind === "syntax" && hasText(doc.replacedBy.text)));
  if ((doc.tags?.includes("deprecated") === true || doc.tags?.includes("obsolete") === true) && (!hasReplacement || !hasText(doc.reason))) {
    diagnostics.push({ code: "doc.replacement", key, message: `${key} requires replacedBy and reason for deprecated or obsolete documentation` });
  }
  if (doc.replacedBy !== undefined) {
    if (doc.replacedBy.kind === "command") {
      if (!commandNames.has(fold(doc.replacedBy.name))) diagnostics.push({ code: "doc.replacedBy", key, message: `${key} replacedBy command ${doc.replacedBy.name} does not resolve to a registered command` });
    } else if (doc.replacedBy.kind !== "syntax" || !hasText(doc.replacedBy.text)) {
      diagnostics.push({ code: "doc.replacedBy", key, message: `${key} has an invalid syntax replacement target` });
    }
  }
  if (doc.returns !== undefined && !hasText(doc.returns.summary)) diagnostics.push({ code: "doc.returns", key, message: `${key} has an empty returns.summary` });
  if (doc.throws !== undefined) for (const item of doc.throws) if (!hasText(item.code) || !hasText(item.when)) diagnostics.push({ code: "doc.throws", key, message: `${key} has a throw entry with empty code or when` });
  if (doc.see !== undefined) {
    for (const link of doc.see) {
      if (commandNames.has(fold(link)) || /^docs\/spec\/[^#]+#[A-Za-z0-9._-]+$/.test(link)) continue;
      diagnostics.push({ code: "doc.see", key, message: `${key} see link ${JSON.stringify(link)} does not resolve to a command or docs/spec anchor` });
    }
  }
  if (doc.waits !== undefined) {
    if (!WAIT_KINDS.has(doc.waits.kind) || !hasText(doc.waits.summary)) diagnostics.push({ code: "doc.waits", key, message: `${key} has invalid waits metadata` });
    if (doc.waits.kind === "ticks" && !/\bticks?\b/i.test(doc.waits.summary)) diagnostics.push({ code: "doc.waits", key, message: `${key} tick waits summary must name ticks` });
  }
  for (const list of [doc.effects, doc.todo]) if (list !== undefined) for (const value of list) if (!hasText(value)) diagnostics.push({ code: "doc.list", key, message: `${key} has an empty metadata list entry` });
  const row = canonicalNativeRow(rows.get(fold(command.name)), rows);
  const groups = doc.groups ?? [];
  if (doc.groups !== undefined) {
    const seenGroups = new Set<string>();
    for (const group of doc.groups) {
      if (!GROUP_ID.test(group)) diagnostics.push({ code: "doc.group-id", key, message: `${key} has invalid group id ${JSON.stringify(group)}` });
      if (seenGroups.has(group)) diagnostics.push({ code: "doc.group-duplicate", key, message: `${key} repeats group ${group}` });
      seenGroups.add(group);
      if (!pluginGroups.has(group) && !specGroups.has(group)) diagnostics.push({ code: "doc.group-unknown", key, message: `${key} group ${group} is not declared by its plugin or the native spec` });
    }
  }
  if (row?.section !== undefined && !groups.includes(derivedGroup(row.section))) diagnostics.push({ code: "native.group", key, row: row.name, message: `${key} groups must include native spec group ${derivedGroup(row.section)}` });
}

function validatePluginDoc(
  plugin: PluginDefinition,
  pluginIds: ReadonlySet<string>,
  diagnostics: CommandDocumentationDiagnostic[],
): ReadonlySet<string> {
  const doc = plugin.doc;
  if (doc === undefined) return new Set();
  const key = `plugin/${plugin.id}`;
  const groups = new Set<string>();
  if (!hasText(doc.summary)) diagnostics.push({ code: "plugin.summary", key, message: `${key} has an empty summary` });
  for (const group of doc.groups ?? []) {
    if (!GROUP_ID.test(group.id)) diagnostics.push({ code: "plugin.group-id", key, message: `${key} has invalid group id ${JSON.stringify(group.id)}` });
    if (groups.has(group.id)) diagnostics.push({ code: "plugin.group-duplicate", key, message: `${key} repeats group ${group.id}` });
    groups.add(group.id);
    if (!hasText(group.name) || !hasText(group.summary)) diagnostics.push({ code: "plugin.group", key, message: `${key} has a group with empty name or summary` });
  }
  for (const required of doc.requires ?? []) if (!pluginIds.has(required)) diagnostics.push({ code: "plugin.requires", key, message: `${key} requires unknown plugin ${required}` });
  return groups;
}

/** Validate documentation and migration allowlist. The caller owns Markdown and JSON I/O. */
export function validateCommandDocumentation(
  plugins: readonly ResolvedPlugin[],
  nativeRows: readonly NativeCommandRow[],
  allowlist: readonly string[],
): readonly CommandDocumentationDiagnostic[] {
  const diagnostics: CommandDocumentationDiagnostic[] = [];
  const rows = nativeRowsByName(nativeRows);
  const allowed = new Set<string>();
  const commandKeys = new Set<string>();
  const commandNames = new Set<string>();
  const pluginIds = new Set(plugins.map((plugin) => plugin.definition.id));
  const pluginGroups = new Map<string, ReadonlySet<string>>();
  const specGroups = new Set(nativeRows.flatMap((row) => row.section === undefined ? [] : [derivedGroup(row.section)]));

  for (const key of allowlist) {
    if (allowed.has(key)) diagnostics.push({ code: "allowlist.duplicate", key, message: `duplicate allowlist key ${key}` });
    allowed.add(key);
  }
  for (const plugin of plugins) {
    pluginGroups.set(plugin.definition.id, validatePluginDoc(plugin.definition, pluginIds, diagnostics));
    for (const command of plugin.definition.commands) {
      commandNames.add(fold(command.name));
      for (const alias of command.aliases) commandNames.add(fold(alias));
    }
  }
  for (const plugin of plugins) {
    const pluginId = plugin.definition.id;
    for (const command of plugin.definition.commands) {
      const canonicalKey = commandKey(pluginId, command.name);
      validateCommandDoc(command, pluginId, commandNames, rows, pluginGroups.get(pluginId) ?? new Set(), specGroups, diagnostics);
      for (let index = 0; index < command.params.length; index += 1) validateParamDoc(command.params[index]!, `${canonicalKey}/param/${index}`, diagnostics);
      for (const name of [command.name, ...command.aliases]) {
        const key = commandKey(pluginId, name);
        commandKeys.add(key);
        const doc = command.doc;
        if (doc === undefined) {
          if (!allowed.has(key)) diagnostics.push({ code: "doc.required", pluginId, name, key, message: `${key} requires doc.summary and doc.behaviour` });
        } else {
          if (!hasText(doc.summary)) diagnostics.push({ code: "doc.summary", pluginId, name, key, message: `${key} has an empty doc.summary` });
          if (!hasText(doc.behaviour)) diagnostics.push({ code: "doc.behaviour", pluginId, name, key, message: `${key} has an empty doc.behaviour` });
        }
        const row = canonicalNativeRow(rows.get(fold(name)), rows);
        if (doc !== undefined && row !== undefined && hasText(doc.summary)) {
          const summary = doc.summary.trim().replace(/\s+/g, " ");
          const purpose = row.purpose.trim().replace(/\s+/g, " ");
          if (summary !== purpose) diagnostics.push({ code: "native.summary-mismatch", pluginId, name, key, row: row.section === undefined ? row.name : `${row.section}:${row.name}`, message: `${key} summary does not match native Purpose row ${row.name}: ${JSON.stringify(doc.summary)} != ${JSON.stringify(row.purpose)}` });
        }
        if (doc !== undefined && row?.obsolete === true && !doc.tags?.includes("obsolete")) diagnostics.push({ code: "native.obsolete-tag", pluginId, name, key, row: row.name, message: `${key} is obsolete in native row ${row.name} and requires the obsolete tag` });
      }
    }
  }
  for (const key of allowlist) if (!commandKeys.has(key)) diagnostics.push({ code: "allowlist.stale", key, message: `allowlist key ${key} does not exist in the assembled commands` });
  return diagnostics;
}
