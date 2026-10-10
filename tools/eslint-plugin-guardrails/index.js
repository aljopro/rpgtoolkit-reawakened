// Guard-rail suppressions (docs/guardrails.md, "Exceptions") must carry an
// inline marker naming the rule and the ADR that approved the exception, e.g.
// `// eslint-disable-next-line <rule> -- guardrail-exception: Gx ADR-NNNN`.
//
// Inline configuration itself is refused at the config level
// (`linterOptions.noInlineConfig`), so every inline config comment is inert and
// reported. The first rule below adds a dedicated, rule-attributed error for any
// inline comment that touches a guard-rail rule (or every rule) without a
// marker, covering both `eslint-disable*` directives and `/* eslint <rule>: … */`
// configuration comments.
import { existsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";

const GUARD_RAIL_RULES = new Set([
  "no-restricted-globals",
  "no-restricted-imports",
  "no-restricted-properties",
  "no-restricted-syntax",
  "guardrails/no-unmarked-suppression",
  "guardrails/no-escaping-relative-import",
]);

const MARKER = /guardrail-exception:\s*G\d+\s+ADR-\d{4}/;
const DISABLE = /^eslint-disable(-next-line|-line)?\b([\s\S]*)$/;
const CONFIG = /^eslint\b([\s\S]*)$/;
const RULE_NAME = /^[@a-zA-Z0-9_/-]+$/;
const CONFIG_RULE_NAME = /([@a-zA-Z0-9_/-]+)\s*:/g;

/** Rule names a disable directive lists; empty means "all rules". */
function disabledRules(rest) {
  const names = [];
  for (const token of rest.trim().split(/[\s,]+/)) {
    if (token === "--" || !RULE_NAME.test(token)) {
      // `--` starts the directive description; anything after it is prose.
      break;
    }
    names.push(token);
  }
  return names;
}

/** Rule names an inline `eslint` configuration comment sets (`rule: value`). */
function configuredRules(rest) {
  const names = [];
  for (const match of rest.matchAll(CONFIG_RULE_NAME)) {
    names.push(match[1]);
  }
  return names;
}

/**
 * Guard-rail rule names an inline config comment touches, and whether it
 * silences everything.
 * @returns {{ names: string[], all: boolean } | null}
 */
function guardRailTargets(text) {
  const trimmed = text.trim();
  const disable = DISABLE.exec(trimmed);
  if (disable !== null) {
    const names = disabledRules(disable[2]);
    return { names, all: names.length === 0 };
  }
  if (CONFIG.test(trimmed)) {
    return { names: configuredRules(trimmed), all: false };
  }
  return null;
}

/** Nearest ancestor directory of `filePath` that holds a `package.json`. */
function packageRoot(filePath) {
  let dir = dirname(filePath);
  for (;;) {
    if (existsSync(join(dir, "package.json"))) {
      return dir;
    }
    const parent = dirname(dir);
    if (parent === dir) {
      return null;
    }
    dir = parent;
  }
}

/** @type {import("eslint").ESLint.Plugin} */
export const guardrails = {
  rules: {
    "no-unmarked-suppression": {
      meta: {
        type: "problem",
        docs: {
          description:
            "require a `guardrail-exception: Gx ADR-NNNN` marker on guard-rail suppressions",
        },
        schema: [],
        messages: {
          missingMarker:
            "Guard-rail suppression without a marker. Inline configuration is refused (linterOptions.noInlineConfig); if the exception is approved, name it as `// eslint-disable-next-line <rule> -- guardrail-exception: Gx ADR-NNNN` and record the ADR (docs/guardrails.md, Exceptions).",
        },
      },
      create(context) {
        const sourceCode = context.sourceCode;
        return {
          Program() {
            for (const comment of sourceCode.getInlineConfigNodes()) {
              if (MARKER.test(comment.value)) {
                continue;
              }
              const targets = guardRailTargets(comment.value);
              if (targets === null) {
                continue;
              }
              const touchesGuardRail =
                targets.all ||
                targets.names.some((name) => GUARD_RAIL_RULES.has(name));
              if (touchesGuardRail) {
                context.report({
                  loc: comment.loc,
                  messageId: "missingMarker",
                });
              }
            }
          },
        };
      },
    },

    // G2 rule 3: a package may not reach into a sibling package through a
    // relative path. The importing file's absolute path and each relative
    // import's resolved path are classified by their nearest `package.json`,
    // so no directory glob can be fooled.
    "no-escaping-relative-import": {
      meta: {
        type: "problem",
        docs: {
          description: "disallow relative imports that escape the importing package",
        },
        schema: [],
        messages: {
          escaping:
            "G2.3: relative import '{{source}}' escapes this package; import through the package entry point.",
        },
      },
      create(context) {
        const filename = context.filename;
        if (typeof filename !== "string" || filename.startsWith("<")) {
          return {};
        }
        const importingRoot = packageRoot(filename);
        if (importingRoot === null) {
          return {};
        }
        const check = (source) => {
          if (
            source?.type !== "Literal" ||
            typeof source.value !== "string" ||
            !source.value.startsWith(".")
          ) {
            return;
          }
          const targetRoot = packageRoot(resolve(dirname(filename), source.value));
          if (targetRoot !== null && targetRoot !== importingRoot) {
            context.report({
              node: source,
              messageId: "escaping",
              data: { source: source.value },
            });
          }
        };
        return {
          ImportDeclaration(node) {
            check(node.source);
          },
          ExportNamedDeclaration(node) {
            check(node.source);
          },
          ExportAllDeclaration(node) {
            check(node.source);
          },
          ImportExpression(node) {
            check(node.source);
          },
        };
      },
    },
  },
};

export default guardrails;
