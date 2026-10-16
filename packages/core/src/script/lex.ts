/**
 * The full RPGCode §9.2 tokenizer.
 *
 * Scans identifiers with sigils stripped and case-folded (LEX-10), numbers
 * (LEX-2), strings (LEX-8), operators and punctuation, line endings and EOF,
 * with 1-based line accounting on every token.
 *
 * docs/spec/engine/rpgcode-language.md#lexical-rules
 */

import { ScriptError } from "./errors.ts";
import { foldAscii } from "./values.ts";

export { foldAscii };

/** One lexical token. `end` terminates a statement; `eof` ends the source. */
export type Token =
  | { readonly kind: "identifier"; readonly name: string; readonly line: number }
  | { readonly kind: "number"; readonly value: number; readonly line: number }
  | { readonly kind: "string"; readonly value: string; readonly line: number }
  | { readonly kind: "op"; readonly text: string; readonly line: number }
  | { readonly kind: "end"; readonly line: number }
  | { readonly kind: "eof"; readonly line: number };

function isDigit(ch: string): boolean {
  return ch >= "0" && ch <= "9";
}

function isIdentifierStart(ch: string): boolean {
  return (ch >= "a" && ch <= "z") || (ch >= "A" && ch <= "Z") || ch === "_";
}

function isIdentifierChar(ch: string): boolean {
  return isIdentifierStart(ch) || isDigit(ch);
}

/** Reject a construct the rebuild excludes, naming the entry that adds it. */
function unsupported(construct: string, entry: string, line: number): never {
  throw new ScriptError(
    "syntax.unsupported",
    `${construct} is not in the tracer's RPGCode subset; ${entry} adds it`,
    { file: "", line },
  );
}

/** Reject malformed input (an unknown character, an unterminated string). */
function lexical(message: string, line: number): never {
  throw new ScriptError("syntax.error", message, { file: "", line });
}

/** Refuse an identifier the spec or scope excludes, by name and entry. */
function rejectKeyword(name: string, line: number): void {
  switch (name) {
    case "break":
    case "continue":
      throw new ScriptError(
        "syntax.unsupported",
        `the \`${name}\` statement is not in the RPGCode 3.1 specification (docs/spec/engine/rpgcode-language.md:55-70)`,
        { file: "", line },
      );
    case "class":
    case "struct":
    case "var":
    case "public":
    case "private":
    case "protected":
    case "this":
    case "new":
      unsupported(`the \`${name}\` class construct`, "entry 6", line);
      break;
    case "include":
    case "redirect":
    case "killredirect":
    case "killallredirects":
      unsupported(`\`${name}\``, "entry 8", line);
      break;
    default:
      break;
  }
}

/** Whether only spaces, tabs or a `//` comment lie from `index` to the newline. */
function restIsBlank(text: string, index: number, length: number): boolean {
  let cursor = index;
  while (
    cursor < length &&
    (text[cursor] === " " || text[cursor] === "\t" || text[cursor] === "\r")
  ) {
    cursor++;
  }
  if (cursor < length && text[cursor] === "/" && text[cursor + 1] === "/") return true;
  return cursor >= length || text[cursor] === "\n";
}

const THREE_CHAR_OPS = ["<<=", ">>="];
const TWO_CHAR_OPS = [
  "==",
  "~=",
  "!=",
  "<=",
  ">=",
  "<<",
  ">>",
  "+=",
  "-=",
  "*=",
  "/=",
  "%=",
  "^=",
  "&=",
  "|=",
  "`=",
  "++",
  "--",
  "&&",
  "||",
  "->",
  "::",
];
const SINGLE_CHAR_OPS = [
  "(",
  ")",
  "[",
  "]",
  "{",
  "}",
  ",",
  ":",
  "?",
  "=",
  "+",
  "-",
  "*",
  "/",
  "%",
  "^",
  "&",
  "|",
  "`",
  "~",
  "!",
  "<",
  ">",
];

/**
 * Tokenize `text` (format-spec §9.2). The last line need not end in a newline;
 * an empty source yields only the `eof` token.
 */
export function tokenize(text: string): Token[] {
  const tokens: Token[] = [];
  const length = text.length;
  let index = 0;
  let line = 1;
  let firstNonBlankOnLine = true;

  while (index < length) {
    const ch = text[index]!;

    if (ch === " " || ch === "\t" || ch === "\r") {
      index++;
      continue;
    }

    if (ch === "\n") {
      tokens.push({ kind: "end", line });
      index++;
      line++;
      firstNonBlankOnLine = true;
      continue;
    }

    if (ch === ";") {
      tokens.push({ kind: "end", line });
      index++;
      firstNonBlankOnLine = false;
      continue;
    }

    // Line comment //
    if (ch === "/" && text[index + 1] === "/") {
      index += 2;
      while (index < length && text[index] !== "\n") index++;
      continue;
    }

    // Block comment /* ... */
    if (ch === "/" && text[index + 1] === "*") {
      index += 2;
      while (index < length && !(text[index] === "*" && text[index + 1] === "/")) {
        if (text[index] === "\n") line++;
        index++;
      }
      if (index >= length) {
        lexical("unterminated block comment; a `/* */` comment must end with `*/`", line);
      }
      index += 2;
      continue;
    }

    // Legacy comment ** anywhere on line
    if (ch === "*" && text[index + 1] === "*") {
      index += 2;
      while (index < length && text[index] !== "\n") index++;
      continue;
    }

    // Legacy comment * at start of non-blank line
    if (ch === "*" && firstNonBlankOnLine) {
      index++;
      while (index < length && text[index] !== "\n") index++;
      continue;
    }

    // Legacy # line (LEX-6)
    if (ch === "#" && firstNonBlankOnLine) {
      let lineEnd = index;
      while (lineEnd < length && text[lineEnd] !== "\n") lineEnd++;
      const lineText = text.slice(index, lineEnd);
      if (/^#\s*include\b/i.test(lineText)) {
        unsupported("`#include`", "entry 8", line);
      }
      index = lineEnd;
      continue;
    }

    // String literal "..."
    if (ch === '"') {
      let cursor = index + 1;
      let value = "";
      while (cursor < length && text[cursor] !== '"' && text[cursor] !== "\n") {
        value += text[cursor]!;
        cursor++;
      }
      if (cursor >= length || text[cursor] !== '"') {
        lexical(
          "unterminated string; a string is single-line and ends with `\"` (format-spec §9.2 LEX-8)",
          line,
        );
      }
      tokens.push({ kind: "string", value, line });
      index = cursor + 1;
      firstNonBlankOnLine = false;
      continue;
    }

    // Numbers or Identifiers
    if (isDigit(ch) || isIdentifierStart(ch)) {
      const start = index;

      if (isDigit(ch)) {
        let cursor = start;
        while (cursor < length && isDigit(text[cursor]!)) cursor++;
        if (cursor < length && text[cursor] === ".") {
          let fraction = cursor + 1;
          if (fraction < length && isDigit(text[fraction]!)) {
            while (fraction < length && isDigit(text[fraction]!)) fraction++;
            cursor = fraction;
          }
        }
        if (cursor < length && (text[cursor] === "e" || text[cursor] === "E")) {
          let exponent = cursor + 1;
          if (exponent < length && (text[exponent] === "+" || text[exponent] === "-")) exponent++;
          let digits = 0;
          while (exponent < length && isDigit(text[exponent]!)) {
            exponent++;
            digits++;
          }
          if (digits > 0) cursor = exponent;
        }
        if (cursor >= length || !isIdentifierChar(text[cursor]!)) {
          const literal = text.slice(start, cursor);
          const value = Number(literal);
          if (!Number.isFinite(value)) {
            lexical(`the number literal \`${literal}\` is not finite (format-spec §9.2)`, line);
          }
          tokens.push({ kind: "number", value, line });
          index = cursor;
          firstNonBlankOnLine = false;
          continue;
        }
      }

      let end = start;
      while (end < length && isIdentifierChar(text[end]!)) end++;
      const nameEnd = end;

      // LEX-3: only `!` directly followed by `=` is the not-equal operator; a
      // `$` (or a `!` not followed by `=`) is a sigil and is ignored.
      if (end < length && text[end] === "!") {
        if (text[end + 1] !== "=") {
          end++;
        }
      } else if (end < length && text[end] === "$") {
        end++;
      }
      const name = foldAscii(text.slice(start, nameEnd));

      if (name === "true" || name === "false") {
        tokens.push({ kind: "number", value: name === "true" ? 1 : 0, line });
      } else if (name === "null") {
        tokens.push({ kind: "number", value: 0, line });
      } else if (name === "and" || name === "or") {
        tokens.push({ kind: "op", text: name, line });
      } else if (name === "_" && restIsBlank(text, end, length)) {
        // Line continuation: consume to newline, increment line, do not emit end
        let scan = end;
        while (scan < length && text[scan] !== "\n") scan++;
        if (scan < length && text[scan] === "\n") {
          scan++;
          line++;
        }
        index = scan;
        firstNonBlankOnLine = false; // continued line is not start of line (so * is multiply)
        continue;
      } else {
        rejectKeyword(name, line);
        tokens.push({ kind: "identifier", name, line });
      }

      index = end;
      firstNonBlankOnLine = false;
      continue;
    }

    // Check operators / punctuation
    const sub3 = text.slice(index, index + 3);
    if (THREE_CHAR_OPS.includes(sub3)) {
      tokens.push({ kind: "op", text: sub3, line });
      index += 3;
      firstNonBlankOnLine = false;
      continue;
    }

    const sub2 = text.slice(index, index + 2);
    if (TWO_CHAR_OPS.includes(sub2)) {
      if (sub2 === "->") {
        unsupported("the `->` member access operator", "entry 6", line);
      }
      if (sub2 === "::") {
        unsupported("the `::` class scope operator", "entry 6", line);
      }
      tokens.push({ kind: "op", text: sub2, line });
      index += 2;
      firstNonBlankOnLine = false;
      continue;
    }

    if (SINGLE_CHAR_OPS.includes(ch)) {
      tokens.push({ kind: "op", text: ch, line });
      index += 1;
      firstNonBlankOnLine = false;
      continue;
    }

    // Unsupported single-character constructs
    if (ch === ".") {
      unsupported("a `.` (implicit-include or member syntax)", "entry 8", line);
    }
    if (ch === "@") {
      unsupported("the Toolkit 2.x `@` line", "entry 15", line);
    }

    lexical(
      `unknown character ${JSON.stringify(ch)}; format-spec §9.2 (LEX-11) makes this a lexical error`,
      line,
    );
  }

  tokens.push({ kind: "eof", line });
  return tokens;
}
