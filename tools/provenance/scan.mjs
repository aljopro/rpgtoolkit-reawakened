// Clean-room provenance scan (guard-rail G7, docs/guardrails.md; CAP-13).
//
//   node tools/provenance/scan.mjs [root] [--markers <file>]
//
// Walks `root` (default: this repository) and fails when a source or config
// file carries a legacy marker: GPL licence header text, a legacy copyright
// holder name, a legacy module or class identifier, VB6 syntax, or a VB6 file
// extension. `tools/provenance/markers.json` is the single source of truth for
// the markers and for the scan scope (extension allowlist, path exclusions);
// this file holds no marker text. `--markers <file>` swaps in another list
// with the same shape. The markers file is validated before anything is
// scanned.
//
// Diagnostics go to stderr, one per hit:
//
//   <root-relative path>:<line>:<col>: [G7 <category>] <message>
//
// Matching, per category kind:
//   phrase      wrapped text is matched through a normalised view of the file:
//               comment leaders (`//` and longer runs of `/`, `/*`, `*/`, `*`,
//               `#`, `'`, `<!--`, `-->`), the quote, backtick, `,`, `+` and
//               `|` characters and string escapes (`\n`, `\r`, `\t`, any other
//               backslash) are gaps, and so are runs of whitespace; every gap
//               collapses to one space, so a notice wrapped over several
//               comment lines still matches; the hit maps back to the line and
//               column where the phrase starts. Case folds when the category
//               is not case-sensitive.
//   identifier  whole word (`\b<id>\b`) on the raw text.
//   pattern     a regular expression tested against one line at a time, so the
//               line anchors in the pattern mean what they say.
//   extension   the file name, whatever the allowlist says; the file's content
//               is not read.
//
// There is no inline suppression. An approved exception is a change to
// markers.json (its scope or its markers) in a pull request that cites an ADR.
//
// Files are counted as scanned when their content was examined or their name
// was checked against the banned extensions. A run that scans no file exits 1,
// because a clean result over nothing proves nothing.
//
// A file with a NUL byte in its first 8 KB is binary and is skipped, except
// that a file starting with a UTF-16 byte-order mark (FF FE or FE FF) is text:
// it is decoded as UTF-16, without the mark, and scanned like any other file.
// UTF-16 without a byte-order mark is not detected and is skipped as binary.
import { readdirSync, readFileSync, realpathSync, statSync } from "node:fs";
import { dirname, extname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(here, "..", "..");
const defaultMarkersPath = join(here, "markers.json");
const TOOL = "tools/provenance/scan.mjs";
const BINARY_PROBE_BYTES = 8192;

// The five categories the plan fixes. A markers file must define exactly these:
// a missing one would silently switch a check off.
const CATEGORY_KINDS = {
  gplLicenseHeaders: { kind: "phrase", label: "GPL licence header text" },
  legacyCopyrightHolders: { kind: "phrase", label: "legacy copyright holder" },
  legacyIdentifiers: { kind: "identifier", label: "legacy identifier" },
  vb6SyntaxMarkers: { kind: "pattern", label: "VB6 syntax" },
  bannedExtensions: { kind: "extension", label: "legacy VB6 file extension" },
};

const SCOPE_KEYS = [
  "sources",
  "extensions",
  "skipRootPaths",
  "skipDirectoryNames",
  "skipFileNames",
  "keepDotDirectories",
];
const CATEGORY_KEYS = ["caseSensitive", "sources", "markers"];
const MARKER_KEYS = ["marker", "examples", "nonExamples"];

// The decoded text of a UTF-16 file, else null. A file is UTF-16 only when it
// starts with a byte-order mark (FF FE or FE FF), is not UTF-32LE (FF FE 00
// 00) and has a NUL in its first 8 KB, as real UTF-16 source text always does;
// anything else is left to the plain-text and binary rules. A stray odd
// trailing byte is dropped.
function utf16Body(bytes) {
  if (bytes.length < 2) return null;
  const little = bytes[0] === 0xff && bytes[1] === 0xfe;
  const big = bytes[0] === 0xfe && bytes[1] === 0xff;
  if (!little && !big) return null;
  if (little && bytes[2] === 0 && bytes[3] === 0) return null;
  if (!bytes.subarray(0, BINARY_PROBE_BYTES).includes(0)) return null;
  const body = Buffer.from(bytes.subarray(2, 2 + ((bytes.length - 2) & ~1)));
  return (big ? body.swap16() : body).toString("utf16le");
}

/** The markers file failed validation; `problems` names every defect found. */
export class MarkersError extends Error {
  constructor(path, problems) {
    super(`${path}: ${problems.join("; ")}`);
    this.name = "MarkersError";
    this.path = path;
    this.problems = problems;
  }
}

// ------------------------------------------------------------ normalised view

// Length of the comment leader starting at `index`, or 0.
function leaderLength(text, index) {
  const char = text[index];
  const next = text[index + 1];
  if (char === "/" && next === "/") {
    let end = index + 2;
    while (text[end] === "/") end += 1;
    return end - index;
  }
  if (char === "/" && next === "*") return 2;
  if (char === "*" && next === "/") return 2;
  if (char === "<" && text.startsWith("<!--", index)) return 4;
  if (char === "-" && text.startsWith("-->", index)) return 3;
  if (char === "*" || char === "#" || char === "'") return 1;
  if (char === '"' || char === "`" || char === "," || char === "+" || char === "|") return 1;
  if (char === "\\") return next === "n" || next === "r" || next === "t" ? 2 : 1;
  return 0;
}

/**
 * The text with comment leaders and whitespace runs collapsed to a single
 * space, optionally case-folded, plus `map[k]` = the offset in `text` of
 * character `k` of the view. The view has no leading or trailing space, so a
 * phrase normalised the same way is found with a plain `indexOf`.
 */
function buildView(text, fold) {
  let out = "";
  const map = [];
  let gapAt = -1;
  let index = 0;
  while (index < text.length) {
    const leader = leaderLength(text, index);
    if (leader > 0) {
      if (gapAt < 0) gapAt = index;
      index += leader;
      continue;
    }
    const code = text.codePointAt(index);
    const char = String.fromCodePoint(code);
    if (/\s/.test(char)) {
      if (gapAt < 0) gapAt = index;
      index += char.length;
      continue;
    }
    if (gapAt >= 0) {
      if (out.length > 0) {
        out += " ";
        map.push(gapAt);
      }
      gapAt = -1;
    }
    const folded = fold ? char.toLowerCase() : char;
    for (let unit = 0; unit < folded.length; unit += 1) map.push(index);
    out += folded;
    index += char.length;
  }
  return { text: out, map };
}

// ------------------------------------------------------------ line positions

const LINE_BREAK = /\r\n|\r|\n/g;

function lineStartsOf(text) {
  const starts = [0];
  for (const match of text.matchAll(LINE_BREAK)) starts.push(match.index + match[0].length);
  return starts;
}

function locate(starts, index) {
  let low = 0;
  let high = starts.length - 1;
  while (low < high) {
    const middle = (low + high + 1) >> 1;
    if (starts[middle] <= index) low = middle;
    else high = middle - 1;
  }
  return { line: low + 1, col: index - starts[low] + 1 };
}

// ------------------------------------------------------------------ the list

const isObject = (value) => value !== null && typeof value === "object" && !Array.isArray(value);
const isText = (value) => typeof value === "string" && value.trim() !== "";
const escapeRegExp = (text) => text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

function unknownKeys(value, allowed) {
  return Object.keys(value).filter((key) => !allowed.includes(key));
}

function validateScope(scope, problem) {
  if (!isObject(scope)) {
    problem("scope", "must be an object");
    return null;
  }
  for (const key of unknownKeys(scope, SCOPE_KEYS)) problem(`scope.${key}`, "unknown key");
  if (!isText(scope.sources)) problem("scope.sources", "must name the governing document");

  const list = (key, { allowEmpty, valid, rule }) => {
    const value = scope[key];
    if (!Array.isArray(value) || (!allowEmpty && value.length === 0)) {
      problem(`scope.${key}`, `must be ${allowEmpty ? "an array" : "a non-empty array"}`);
      return [];
    }
    value.forEach((item, position) => {
      if (!isText(item) || !valid(item)) problem(`scope.${key}[${position}]`, rule);
    });
    return value.filter((item) => isText(item) && valid(item));
  };

  const extensions = list("extensions", {
    allowEmpty: false,
    valid: (item) => /^\.[A-Za-z0-9]+$/.test(item),
    rule: 'must be a file extension with its dot, for example ".ts"',
  });
  const skipRootPaths = list("skipRootPaths", {
    allowEmpty: true,
    valid: (item) => !/^\/|\/$|\\|(^|\/)\.\.?(\/|$)/.test(item),
    rule: "must be a root-relative path with `/` separators, no leading or trailing `/`, no `.` or `..`",
  });
  const skipDirectoryNames = list("skipDirectoryNames", {
    allowEmpty: true,
    valid: (item) => !/[/\\]/.test(item),
    rule: "must be a single directory name",
  });
  const skipFileNames = list("skipFileNames", {
    allowEmpty: true,
    valid: (item) => !/[/\\]/.test(item),
    rule: "must be a single file name",
  });
  const keepDotDirectories = list("keepDotDirectories", {
    allowEmpty: true,
    valid: (item) => item.startsWith(".") && !/[/\\]/.test(item),
    rule: 'must be a single dot-directory name such as ".github"',
  });

  return {
    extensions: new Set(extensions.map((item) => item.toLowerCase())),
    skipRootPaths: new Set(skipRootPaths),
    skipDirectoryNames: new Set(skipDirectoryNames),
    skipFileNames: new Set(skipFileNames),
    keepDotDirectories: new Set(keepDotDirectories),
  };
}

// Compiles one marker for its category kind, reporting through `problem`.
function compileMarker(kind, text, caseSensitive, problem) {
  switch (kind) {
    case "phrase": {
      const needle = buildView(text, !caseSensitive).text;
      if (needle === "") problem("marker", "is empty once comment leaders and whitespace are removed");
      return { needle };
    }
    case "identifier": {
      if (!/^\w+$/.test(text)) {
        problem("marker", "must be one identifier of letters, digits and underscores");
        return {};
      }
      return { regex: new RegExp(`\\b${escapeRegExp(text)}\\b`, caseSensitive ? "g" : "gi") };
    }
    case "pattern": {
      let regex;
      try {
        regex = new RegExp(text, caseSensitive ? "" : "i");
      } catch (error) {
        problem("marker", `is not a valid regular expression: ${error.message}`);
        return {};
      }
      if (regex.test("")) problem("marker", "matches an empty line, so it would flag every line");
      return { regex };
    }
    case "extension": {
      if (!/^\.\w+$/.test(text)) {
        problem("marker", 'must be a file extension with its dot, for example ".bas"');
        return {};
      }
      return { extension: caseSensitive ? text : text.toLowerCase() };
    }
    default:
      throw new Error(`unhandled marker kind ${kind}`);
  }
}

/**
 * Reads and validates a markers file. Throws a MarkersError naming every
 * defect (unknown or missing category, empty marker, invalid regular
 * expression, bad scope, unreadable or non-JSON file); nothing is scanned
 * against a list that failed.
 */
export function loadAndValidateMarkers(markersPath = defaultMarkersPath) {
  const path = resolve(markersPath);
  let data;
  try {
    data = JSON.parse(readFileSync(path, "utf8"));
  } catch (error) {
    throw new MarkersError(path, [`cannot read the markers file: ${error.message}`]);
  }

  const problems = [];
  const problemAt = (where) => (field, text) => {
    const location = field === "" ? where : where === "" ? field : `${where}.${field}`;
    problems.push(`${location}: ${text}`);
  };
  const rootProblem = problemAt("");

  if (!isObject(data)) {
    throw new MarkersError(path, ["the top level must be an object with `scope` and `categories`"]);
  }
  for (const key of unknownKeys(data, ["scope", "categories"])) rootProblem(key, "unknown top-level key");

  const scope = validateScope(data.scope, rootProblem);

  const categories = {};
  if (!isObject(data.categories)) {
    rootProblem("categories", "must be an object keyed by category name");
  } else {
    const known = Object.keys(CATEGORY_KINDS);
    for (const name of Object.keys(data.categories)) {
      if (!Object.hasOwn(CATEGORY_KINDS, name)) {
        rootProblem(`categories.${name}`, `unknown category (expected ${known.join(", ")})`);
      }
    }
    for (const name of known) {
      if (!Object.hasOwn(data.categories, name)) {
        rootProblem(`categories.${name}`, "missing category");
        continue;
      }
      const category = data.categories[name];
      const at = problemAt(`categories.${name}`);
      if (!isObject(category)) {
        at("", "must be an object");
        continue;
      }
      for (const key of unknownKeys(category, CATEGORY_KEYS)) at(key, "unknown key");
      if (typeof category.caseSensitive !== "boolean") at("caseSensitive", "must be true or false");
      if (!isText(category.sources)) at("sources", "must cite the governing repo document");
      if (!Array.isArray(category.markers) || category.markers.length === 0) {
        at("markers", "must be a non-empty array");
        continue;
      }

      const { kind, label } = CATEGORY_KINDS[name];
      const markers = [];
      category.markers.forEach((entry, position) => {
        const atMarker = problemAt(`categories.${name}.markers[${position}]`);
        if (!isObject(entry)) {
          atMarker("", "must be an object");
          return;
        }
        for (const key of unknownKeys(entry, MARKER_KEYS)) atMarker(key, "unknown key");
        if (!isText(entry.marker)) {
          atMarker("marker", "must be a non-empty string");
          return;
        }
        if (!Array.isArray(entry.examples) || entry.examples.length === 0) {
          atMarker("examples", "must be a non-empty array of strings the marker matches");
        } else if (!entry.examples.every(isText)) {
          atMarker("examples", "must hold only non-empty strings");
        }
        if (entry.nonExamples !== undefined) {
          if (!Array.isArray(entry.nonExamples) || !entry.nonExamples.every(isText)) {
            atMarker("nonExamples", "must be an array of non-empty strings the marker does not match");
          }
        }
        const compiled = compileMarker(kind, entry.marker, category.caseSensitive === true, atMarker);
        markers.push({
          marker: entry.marker,
          examples: Array.isArray(entry.examples) ? entry.examples : [],
          nonExamples: Array.isArray(entry.nonExamples) ? entry.nonExamples : [],
          ...compiled,
        });
      });
      categories[name] = {
        kind,
        label,
        caseSensitive: category.caseSensitive === true,
        sources: category.sources,
        markers,
      };
    }
  }

  if (problems.length > 0) throw new MarkersError(path, problems);
  return { path, scope, categories };
}

// ------------------------------------------------------------------- matching

const shown = (category, marker) =>
  category.kind === "pattern" ? `/${marker}/` : JSON.stringify(marker);

function describe(category, entry) {
  return `${category.label} ${shown(category, entry.marker)}; see ${category.sources}`;
}

function scanText(text, file, categories, violations) {
  const starts = lineStartsOf(text);
  const views = new Map();
  const viewFor = (caseSensitive) => {
    if (!views.has(caseSensitive)) views.set(caseSensitive, buildView(text, !caseSensitive));
    return views.get(caseSensitive);
  };
  let lines = null;
  const found = [];
  const report = (name, category, entry, index) => {
    const { line, col } = locate(starts, index);
    found.push({ file, line, col, category: name, marker: entry.marker, message: describe(category, entry) });
  };

  for (const [name, category] of Object.entries(categories)) {
    if (category.kind === "phrase") {
      const view = viewFor(category.caseSensitive);
      for (const entry of category.markers) {
        let from = 0;
        for (;;) {
          const at = view.text.indexOf(entry.needle, from);
          if (at < 0) break;
          report(name, category, entry, view.map[at]);
          from = at + entry.needle.length;
        }
      }
    } else if (category.kind === "identifier") {
      for (const entry of category.markers) {
        for (const match of text.matchAll(entry.regex)) report(name, category, entry, match.index);
      }
    } else if (category.kind === "pattern") {
      lines ??= text.split(LINE_BREAK);
      for (const entry of category.markers) {
        lines.forEach((content, position) => {
          const match = entry.regex.exec(content);
          if (match === null) return;
          const indent = match[0].length - match[0].trimStart().length;
          report(name, category, entry, starts[position] + match.index + indent);
        });
      }
    }
  }

  found.sort((a, b) => a.line - b.line || a.col - b.col);
  violations.push(...found);
}

function checkFileName(name, file, categories, violations) {
  const category = categories.bannedExtensions;
  const extension = extname(name);
  let hit = false;
  for (const entry of category.markers) {
    const candidate = category.caseSensitive ? extension : extension.toLowerCase();
    if (candidate !== entry.extension) continue;
    hit = true;
    violations.push({
      file,
      line: 1,
      col: 1,
      category: "bannedExtensions",
      marker: entry.marker,
      message: `${describe(category, entry)}; the file name is the violation`,
    });
  }
  return hit;
}

// ------------------------------------------------------------------ the walk

/**
 * Scans `root` against a validated markers object (`options.markers`, default:
 * the committed list) and returns `{ root, scanned, violations }`. Violations
 * are `{ file, line, col, category, marker, message }` with `file` relative to
 * `root` and `/`-separated, ordered by path, line and column. Throws when the
 * root is missing or not a directory, or a directory or file cannot be read.
 */
export function scanProvenance(root, options = {}) {
  const config = options.markers ?? loadAndValidateMarkers(defaultMarkersPath);
  const { scope, categories } = config;
  const rootPath = resolve(root);

  let rootInfo;
  try {
    rootInfo = statSync(rootPath);
  } catch (error) {
    if (error.code === "ENOENT") throw new Error(`root directory ${rootPath} does not exist`);
    throw new Error(`cannot access root directory ${rootPath}: ${error.message}`);
  }
  if (!rootInfo.isDirectory()) throw new Error(`root ${rootPath} is not a directory`);

  const violations = [];
  let scanned = 0;

  const scanFile = (absolute, file, name) => {
    if (scope.skipFileNames.has(name)) return;
    if (checkFileName(name, file, categories, violations)) {
      scanned += 1;
      return;
    }
    if (!scope.extensions.has(extname(name).toLowerCase())) return;
    let bytes;
    try {
      bytes = readFileSync(absolute);
    } catch (error) {
      throw new Error(`cannot read ${file}: ${error.message}`);
    }
    const utf16 = utf16Body(bytes);
    if (utf16 === null && bytes.subarray(0, BINARY_PROBE_BYTES).includes(0)) return;
    scanned += 1;
    const text = utf16 ?? bytes.toString("utf8");
    scanText(text.charCodeAt(0) === 0xfeff ? text.slice(1) : text, file, categories, violations);
  };

  const walk = (directory, prefix) => {
    let entries;
    try {
      entries = readdirSync(directory, { withFileTypes: true });
    } catch (error) {
      throw new Error(`cannot read directory ${prefix === "" ? rootPath : prefix}: ${error.message}`);
    }
    entries.sort((a, b) => (a.name < b.name ? -1 : a.name > b.name ? 1 : 0));
    for (const entry of entries) {
      if (entry.isSymbolicLink()) continue;
      const file = prefix === "" ? entry.name : `${prefix}/${entry.name}`;
      if (scope.skipRootPaths.has(file)) continue;
      if (entry.isDirectory()) {
        if (scope.skipDirectoryNames.has(entry.name)) continue;
        if (entry.name.startsWith(".") && !scope.keepDotDirectories.has(entry.name)) continue;
        walk(join(directory, entry.name), file);
      } else if (entry.isFile()) {
        scanFile(join(directory, entry.name), file, entry.name);
      }
    }
  };
  walk(rootPath, "");

  violations.sort(
    (a, b) =>
      (a.file < b.file ? -1 : a.file > b.file ? 1 : 0) || a.line - b.line || a.col - b.col,
  );
  return { root: rootPath, scanned, violations };
}

/** `file:line:col: [G7 category] message`, the line the CLI prints per hit. */
export function formatViolation(violation) {
  return `${violation.file}:${violation.line}:${violation.col}: [G7 ${violation.category}] ${violation.message}`;
}

// ------------------------------------------------------------------------ CLI

function parseArguments(argv) {
  const positional = [];
  const unknown = [];
  let markersPath;
  for (let position = 0; position < argv.length; position += 1) {
    const argument = argv[position];
    if (argument === "--markers") {
      const value = argv[position + 1];
      if (value === undefined || value.startsWith("-")) {
        throw new Error("--markers needs a markers file argument");
      }
      if (markersPath !== undefined) throw new Error("--markers given more than once");
      markersPath = value;
      position += 1;
    } else if (argument.startsWith("-")) {
      unknown.push(argument);
    } else {
      positional.push(argument);
    }
  }
  if (unknown.length > 0) throw new Error(`unknown flag(s): ${unknown.join(", ")}`);
  if (positional.length > 1) {
    throw new Error(
      `expected at most one root argument, got ${positional
        .map((argument) => JSON.stringify(argument))
        .join(", ")}`,
    );
  }
  return { root: positional.length === 1 ? resolve(positional[0]) : repoRoot, markersPath };
}

function main(argv) {
  let args;
  try {
    args = parseArguments(argv);
  } catch (error) {
    console.error(`${TOOL}: ${error.message}`);
    return 1;
  }

  let markers;
  try {
    markers = loadAndValidateMarkers(args.markersPath ?? defaultMarkersPath);
  } catch (error) {
    if (!(error instanceof MarkersError)) throw error;
    for (const problem of error.problems) console.error(`${TOOL}: invalid markers ${error.path}: ${problem}`);
    return 1;
  }

  let result;
  try {
    result = scanProvenance(args.root, { markers });
  } catch (error) {
    console.error(`${TOOL}: ${error.message}`);
    return 1;
  }

  console.log(`scanned ${result.scanned} files`);
  if (result.scanned === 0) {
    console.error(
      `${TOOL}: zero scannable files found under ${result.root}; every file was skipped by the extension allowlist or the path exclusions, so a clean result would prove nothing`,
    );
    return 1;
  }
  if (result.violations.length > 0) {
    for (const violation of result.violations) console.error(formatViolation(violation));
    console.error(
      `${TOOL}: ${result.violations.length} violation(s) of guard-rail G7 (clean-room provenance, docs/guardrails.md)`,
    );
    return 1;
  }
  console.log("0 violations");
  return 0;
}

// Only run when invoked as a script, so the tests can import the functions.
function isEntryPoint() {
  if (!process.argv[1]) return false;
  try {
    return realpathSync(process.argv[1]) === realpathSync(fileURLToPath(import.meta.url));
  } catch {
    return false;
  }
}
const isMain = isEntryPoint();

if (isMain) {
  process.exitCode = main(process.argv.slice(2));
}
