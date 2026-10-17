/**
 * Pure command documentation projection and validation (ADR 0004; ticket 3.29).
 *
 * This module deliberately receives resolved plugin data rather than a registry or
 * VM. Documentation is registration metadata and never participates in dispatch,
 * save state, effects or hashes.
 */

import type { BuiltinSpec, CommandDocStatus, ParamSpec } from "./builtins.ts";
import type { ResolvedPlugin } from "./plugin.ts";

export type CommandParamDocumentation = {
  readonly name: string;
  readonly optional: boolean;
  readonly byRef: boolean;
  readonly variadic: boolean;
  readonly unit: string | null;
  readonly doc: string | null;
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
  readonly status: CommandDocStatus | null;
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

function paramDocumentation(param: ParamSpec): CommandParamDocumentation {
  return {
    name: param.name,
    optional: param.optional,
    byRef: param.byRef,
    variadic: param.variadic,
    unit: param.unit ?? null,
    doc: param.doc ?? null,
  };
}

function entry(
  plugin: ResolvedPlugin,
  command: BuiltinSpec,
  name: string,
  alias: boolean,
): CommandDocumentation {
  const doc = command.doc;
  const obsolete = doc?.status === "obsolete";
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
    status: doc === undefined ? null : obsolete ? "obsolete" : alias ? "legacy-alias" : (doc.status ?? "current"),
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

/**
 * Validate required documentation, the explicit migration allowlist, and
 * native Purpose/status relationships. The caller owns Markdown and JSON I/O.
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
      for (const name of [command.name, ...command.aliases]) {
        const key = commandKey(pluginId, name);
        commandKeys.add(key);
        const doc = command.doc;
        const allowlisted = allowed.has(key);
        if (doc === undefined) {
          if (!allowlisted) {
            diagnostics.push({
              code: "doc.required",
              pluginId,
              name,
              key,
              message: `${key} requires doc.summary and doc.behaviour`,
            });
          }
        } else {
          if (!hasText(doc.summary)) {
            diagnostics.push({ code: "doc.summary", pluginId, name, key, message: `${key} has an empty doc.summary` });
          }
          if (!hasText(doc.behaviour)) {
            diagnostics.push({ code: "doc.behaviour", pluginId, name, key, message: `${key} has an empty doc.behaviour` });
          }
        }

        const row = canonicalNativeRow(rows.get(fold(name)), rows);
        if (doc !== undefined && row !== undefined && hasText(doc.summary)) {
          if (doc.summary.trim().replace(/\s+/g, " ") !== row.purpose.trim().replace(/\s+/g, " ")) {
            diagnostics.push({
              code: "native.summary-mismatch",
              pluginId,
              name,
              key,
              row: row.section === undefined ? row.name : `${row.section}:${row.name}`,
              message: `${key} summary does not match native Purpose row ${row.name}: ${JSON.stringify(doc.summary)} != ${JSON.stringify(row.purpose)}`,
            });
          }
        }
        if (doc !== undefined && row?.obsolete === true && doc.status !== "obsolete") {
          diagnostics.push({
            code: "native.status",
            pluginId,
            name,
            key,
            row: row.name,
            message: `${key} is obsolete in native row ${row.name} and requires status obsolete`,
          });
        }
      }
    }
  }

  for (const key of allowlist) {
    if (!commandKeys.has(key)) {
      diagnostics.push({ code: "allowlist.stale", key, message: `allowlist key ${key} does not exist in the assembled commands` });
    }
  }

  // A documented definition's projected aliases must have the generated status.
  for (const item of commandDocumentation(plugins)) {
    const row = rows.get(fold(item.name));
    if (item.status !== null && row?.aliasOf !== undefined && row.obsolete !== true && item.status !== "legacy-alias") {
      diagnostics.push({
        code: "native.alias-status",
        pluginId: item.pluginId,
        name: item.name,
        key: commandKey(item.pluginId, item.name),
        row: row.name,
        message: `${item.pluginId}/${item.name} must be projected with status legacy-alias`,
      });
    }
  }

  return diagnostics;
}
