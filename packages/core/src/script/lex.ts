/**
 * The tracer's tokenizer: the format-spec §9.2 lexical subset only.
 *
 * IN: identifiers `[A-Za-z0-9_]` with a trailing `!`/`$` sigil stripped and
 * ASCII case-folded (LEX-10; `N` and `n` are one variable), decimal and
 * fractional numbers with an optional exponent (LEX-2), `"strings"` with no
 * escapes (LEX-8), the punctuation `(`, `)`, `,`, `=` (LEX-3's adjacency rule
 * keeps `x!=1` an operator and `x! = 1` a sigil), a statement ending at a
 * newline or `;`, `//` comments, `true`/`false`/`null` as `1`/`0`/`0`, and a
 * leading `#` line ignored as legacy — except `#include`, which is recognised
 * by name and rejected (LEX-6).
 *
 * OUT: every other operator (§9.4), arrays/indexes and blocks, `local(x)` /
 * `global(x)` declarations, `if`/`while`/`until`/`for`/`switch`/`function`/
 * `method`/`class`/`label`/`return`, `_` continuation and C-style block
 * comments, `#include` / implicit includes / `redirect` and the Toolkit 2.x
 * forms. Each
 * is rejected with a `ScriptError` naming the construct and the entry that adds
 * it. The rules these rejections cite are in format-spec §9.2/§9.12/§9.13 and
 * ADR 0004 decision 1.
 *
 * Format-spec §9.2/§9.3/§9.5/§9.15; docs/adr/0004 decision 1.
 */

import { ScriptError } from "./errors.ts";

/** One lexical token. `end` terminates a statement; `eof` ends the source. */
export type Token =
  | { readonly kind: "identifier"; readonly name: string }
  | { readonly kind: "number"; readonly value: number }
  | { readonly kind: "string"; readonly value: string }
  | { readonly kind: "punct"; readonly text: "(" | ")" | "," | "=" }
  | { readonly kind: "end" }
  | { readonly kind: "eof" };

function isDigit(ch: string): boolean {
  return ch >= "0" && ch <= "9";
}

function isIdentifierStart(ch: string): boolean {
  return (ch >= "a" && ch <= "z") || (ch >= "A" && ch <= "Z") || ch === "_";
}

function isIdentifierChar(ch: string): boolean {
  return isIdentifierStart(ch) || isDigit(ch);
}

/**
 * ASCII-only case fold (LEX-10): `A`–`Z` to `a`–`z`, every other code point
 * unchanged. Written out rather than `String.prototype.toLowerCase`, which
 * follows the engine's Unicode tables (G3 wants one answer on every runner).
 */
function foldAscii(text: string): string {
  let out = "";
  for (let index = 0; index < text.length; index++) {
    const code = text.charCodeAt(index);
    out += code >= 65 && code <= 90 ? String.fromCharCode(code + 32) : text[index]!;
  }
  return out;
}

/** Reject a construct the subset excludes, naming the entry that adds it. */
function unsupported(construct: string, entry: string): never {
  throw new ScriptError(
    "syntax.unsupported",
    `${construct} is not in the tracer's RPGCode subset; ${entry} adds it`,
  );
}

/** Reject malformed subset input (an unknown character, an unterminated string). */
function lexical(message: string): never {
  throw new ScriptError("syntax.error", message);
}

/** Refuse an identifier the subset treats as a keyword, by name and entry. */
function rejectKeyword(name: string): void {
  switch (name) {
    case "if":
    case "elseif":
    case "else":
    case "while":
    case "until":
    case "for":
    case "switch":
    case "case":
    case "default":
    case "break":
    case "continue":
    case "return":
    case "inline":
      unsupported(`the \`${name}\` statement`, "entry 5");
      break;
    case "function":
    case "method":
      unsupported(`a \`${name}\` definition`, "entry 5");
      break;
    case "class":
    case "struct":
    case "var":
    case "public":
    case "private":
    case "protected":
    case "this":
    case "new":
      unsupported(`the \`${name}\` class construct`, "entry 6");
      break;
    case "local":
    case "global":
      unsupported(`the \`${name}(x)\` declaration`, "entry 5");
      break;
    case "include":
    case "redirect":
    case "killredirect":
    case "killallredirects":
      unsupported(`\`${name}\``, "entry 8");
      break;
    case "and":
    case "or":
      unsupported(`the \`${name}\` operator`, "entry 5");
      break;
    default:
      break;
  }
}

/** Reject an operator or punctuation character the subset excludes. */
function rejectCharacter(ch: string): never {
  switch (ch) {
    case "+":
    case "-":
    case "*":
    case "/":
    case "%":
    case "^":
    case "<":
    case ">":
    case "&":
    case "|":
    case "~":
    case "!":
    case "?":
    case "`":
      unsupported(`the \`${ch}\` operator`, "entry 5");
      break;
    case "[":
    case "]":
      unsupported("an array or index expression", "entry 5");
      break;
    case "{":
    case "}":
      unsupported("a `{ }` block", "entry 5");
      break;
    case ":":
      unsupported("a label or the ternary `:`", "entry 5");
      break;
    case ".":
      unsupported("a `.` (implicit-include or member syntax)", "entry 8");
      break;
    case "@":
      unsupported("the Toolkit 2.x `@` line", "entry 15");
      break;
    default:
      lexical(
        `unknown character ${JSON.stringify(ch)}; format-spec §9.2 (LEX-11) makes this a lexical error`,
      );
  }
}

/**
 * Tokenize `text` (format-spec §9.2). The last line need not end in a newline;
 * an empty source yields only the `eof` token.
 */
export function tokenize(text: string): Token[] {
  const tokens: Token[] = [];
  const length = text.length;
  let index = 0;
  let atLineStart = true;

  while (index < length) {
    const ch = text[index]!;

    if (ch === " " || ch === "\t" || ch === "\r") {
      index++;
      continue;
    }
    if (ch === "\n") {
      tokens.push({ kind: "end" });
      index++;
      atLineStart = true;
      continue;
    }
    if (ch === ";") {
      tokens.push({ kind: "end" });
      index++;
      atLineStart = false;
      continue;
    }

    if (ch === "/" && text[index + 1] === "/") {
      index += 2;
      while (index < length && text[index] !== "\n") index++;
      continue;
    }
    if (ch === "/" && text[index + 1] === "*") {
      unsupported("a `/* */` block comment", "entry 5");
    }

    if (ch === "#" && atLineStart) {
      let lineEnd = index;
      while (lineEnd < length && text[lineEnd] !== "\n") lineEnd++;
      const line = text.slice(index, lineEnd);
      if (/^#\s*include\b/i.test(line)) {
        unsupported("`#include`", "entry 8");
      }
      index = lineEnd;
      continue;
    }

    if (ch === '"') {
      let cursor = index + 1;
      let value = "";
      while (cursor < length && text[cursor] !== '"' && text[cursor] !== "\n") {
        value += text[cursor]!;
        cursor++;
      }
      if (cursor >= length || text[cursor] !== '"') {
        lexical("unterminated string; a string is single-line and ends with `\"` (format-spec §9.2 LEX-8)");
      }
      tokens.push({ kind: "string", value });
      index = cursor + 1;
      atLineStart = false;
      continue;
    }

    if (ch === "(" || ch === ")" || ch === "," || ch === "=") {
      if (ch === "=" && text[index + 1] === "=") {
        unsupported("the `==` operator", "entry 5");
      }
      tokens.push({ kind: "punct", text: ch });
      index++;
      atLineStart = false;
      continue;
    }

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
          tokens.push({ kind: "number", value: Number(text.slice(start, cursor)) });
          index = cursor;
          atLineStart = false;
          continue;
        }
      }

      let end = start;
      while (end < length && isIdentifierChar(text[end]!)) end++;
      const nameEnd = end;
      // LEX-3: only `!` directly followed by `=` is the not-equal operator; a
      // `$` (or a `!` not followed by `=`) is a sigil and is ignored.
      if (end < length && text[end] === "!") {
        if (text[end + 1] === "=") {
          unsupported("the `!=` operator", "entry 5");
        }
        end++;
      } else if (end < length && text[end] === "$") {
        end++;
      }
      const name = foldAscii(text.slice(start, nameEnd));

      if (name === "true" || name === "false") {
        tokens.push({ kind: "number", value: name === "true" ? 1 : 0 });
      } else if (name === "null") {
        tokens.push({ kind: "number", value: 0 });
      } else if (name === "_" && restIsBlank(text, end, length)) {
        unsupported("the `_` line continuation", "entry 5");
      } else {
        rejectKeyword(name);
        tokens.push({ kind: "identifier", name });
      }

      index = end;
      atLineStart = false;
      continue;
    }

    rejectCharacter(ch);
  }

  tokens.push({ kind: "eof" });
  return tokens;
}

/** Whether only spaces, tabs or a `//` comment lie from `index` to the newline. */
function restIsBlank(text: string, index: number, length: number): boolean {
  let cursor = index;
  while (cursor < length && (text[cursor] === " " || text[cursor] === "\t" || text[cursor] === "\r")) {
    cursor++;
  }
  if (cursor < length && text[cursor] === "/" && text[cursor + 1] === "/") return true;
  return cursor >= length || text[cursor] === "\n";
}
