/**
 * The tracer's parser: the three statement forms and their expressions
 * (format-spec §9.3/§9.5; ADR 0004 decision 1's Unified AST layer).
 *
 * A statement is an assignment (`name = expr`), a call (`name(args)`), or a
 * bare identifier alone on a line as a zero-argument call (`end` → `end()`,
 * format-spec §9.5). An expression is a literal, a variable read, or a call.
 * Everything else is a token the lexer already rejected, so the parser only
 * raises `syntax.error` for malformed input inside the subset.
 *
 * Format-spec §9.2/§9.3/§9.5/§9.15; docs/adr/0004 decision 1.
 */

import type { Ast, Expr, Statement } from "./ast.ts";
import { ScriptError } from "./errors.ts";
import type { Token } from "./lex.ts";

function isPunct(token: Token, text: string): boolean {
  return token.kind === "punct" && token.text === text;
}

function describe(token: Token): string {
  switch (token.kind) {
    case "identifier":
      return `identifier \`${token.name}\``;
    case "number":
      return `the number ${token.value}`;
    case "string":
      return "a string literal";
    case "punct":
      return `\`${token.text}\``;
    case "end":
      return "the end of a statement";
    case "eof":
      return "the end of the program";
  }
}

/** Parse a token list into the minimal Unified AST. */
export function parse(tokens: readonly Token[]): Ast {
  const eof: Token = { kind: "eof" };
  let index = 0;

  function peek(): Token {
    return tokens[index] ?? eof;
  }

  function skipEnds(): void {
    while (peek().kind === "end") index += 1;
  }

  function parseExpression(): Expr {
    const token = peek();
    if (token.kind === "number" || token.kind === "string") {
      index += 1;
      return { kind: "literal", value: token.value };
    }
    if (token.kind === "identifier") {
      index += 1;
      if (isPunct(peek(), "(")) {
        return { kind: "call", name: token.name, args: parseArgs() };
      }
      return { kind: "variable", name: token.name };
    }
    throw new ScriptError("syntax.error", `expected an expression but found ${describe(token)}`);
  }

  function parseArgs(): Expr[] {
    index += 1; // the current token is "("
    const args: Expr[] = [];
    if (isPunct(peek(), ")")) {
      index += 1;
      return args;
    }
    args.push(parseExpression());
    while (isPunct(peek(), ",")) {
      index += 1;
      args.push(parseExpression());
    }
    if (!isPunct(peek(), ")")) {
      throw new ScriptError("syntax.error", `expected \`)\` but found ${describe(peek())}`);
    }
    index += 1;
    return args;
  }

  function expectStatementEnd(): void {
    const token = peek();
    if (token.kind !== "end" && token.kind !== "eof") {
      throw new ScriptError(
        "syntax.error",
        `expected the end of a statement but found ${describe(token)}`,
      );
    }
  }

  function parseStatement(): Statement {
    const token = peek();
    if (token.kind !== "identifier") {
      throw new ScriptError("syntax.error", `expected a statement but found ${describe(token)}`);
    }
    index += 1;
    if (isPunct(peek(), "=")) {
      index += 1;
      const value = parseExpression();
      expectStatementEnd();
      return { kind: "assign", name: token.name, value };
    }
    if (isPunct(peek(), "(")) {
      const args = parseArgs();
      expectStatementEnd();
      return { kind: "call", name: token.name, args };
    }
    expectStatementEnd();
    return { kind: "call", name: token.name, args: [] };
  }

  const statements: Statement[] = [];
  skipEnds();
  while (peek().kind !== "eof") {
    statements.push(parseStatement());
    skipEnds();
  }
  return { statements };
}
