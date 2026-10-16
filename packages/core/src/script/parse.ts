/**
 * The full RPGCode §9.3/§9.5 parser.
 *
 * Precedence-climbing over the 15-level operator table (EXP-2), statement
 * forms (`if`, `while`, `until`, `for`, `switch`, `label`, `return`,
 * assignment, call), function declarations with typed and `&` parameters
 * (FUN-1), and declaration forms (`local(x)`, `global(x)`).
 *
 * docs/adr/0004 decision 1; docs/spec/engine/rpgcode-language.md#keywords-and-structure
 */

import type {
  Ast,
  Block,
  Expr,
  FunctionDef,
  IfBranch,
  Param,
  Statement,
  SwitchCase,
} from "./ast.ts";
import { ScriptError } from "./errors.ts";
import type { Token } from "./lex.ts";
import type { BinaryOp, UnaryOp } from "./ops.ts";

function isOp(token: Token, text: string): token is Token & { kind: "op" } {
  return token.kind === "op" && token.text === text;
}

function isIdent(token: Token, name: string): token is Token & { kind: "identifier" } {
  return token.kind === "identifier" && token.name === name;
}

function describe(token: Token): string {
  switch (token.kind) {
    case "identifier":
      return `identifier \`${token.name}\``;
    case "number":
      return `the number ${token.value}`;
    case "string":
      return "a string literal";
    case "op":
      return `\`${token.text}\``;
    case "end":
      return "the end of a statement";
    case "eof":
      return "the end of the program";
  }
}

const ASSIGNMENT_OPS = [
  "=",
  "+=",
  "-=",
  "*=",
  "/=",
  "%=",
  "^=",
  "&=",
  "|=",
  "`=",
  "<<=",
  ">>=",
];

// Binding powers for binary operators (higher = tighter, 15 tightest .. 1 loosest)
// Level 3: ^ (BP 13, left-assoc)
// Level 4: * / % (BP 12, left)
// Level 5: + - (BP 11, left)
// Level 6: << >> (BP 10, left)
// Level 7: < <= > >= (BP 9, left)
// Level 8: == ~= != (BP 8, left)
// Level 9: & (BP 7, left)
// Level 10: ` (BP 6, left)
// Level 11: | (BP 5, left)
// Level 12: && and (BP 4, left)
// Level 13: || or (BP 3, left)
// Level 14: ?: (BP 2, right)
// Level 15: assignments (BP 1, right)
function binaryBindingPower(opText: string): number | undefined {
  if (ASSIGNMENT_OPS.includes(opText)) return 1;
  if (opText === "?") return 2;
  if (opText === "||" || opText === "or") return 3;
  if (opText === "&&" || opText === "and") return 4;
  if (opText === "|") return 5;
  if (opText === "`") return 6;
  if (opText === "&") return 7;
  if (opText === "==" || opText === "~=" || opText === "!=") return 8;
  if (opText === "<" || opText === "<=" || opText === ">" || opText === ">=") return 9;
  if (opText === "<<" || opText === ">>") return 10;
  if (opText === "+" || opText === "-") return 11;
  if (opText === "*" || opText === "/" || opText === "%") return 12;
  if (opText === "^") return 13;
  return undefined;
}

/** Parse a token list into the full Unified AST. */
export function parse(tokens: readonly Token[]): Ast {
  const eof: Token = {
    kind: "eof",
    line: tokens[tokens.length - 1]?.line ?? 1,
  };
  let index = 0;

  function peek(): Token {
    return tokens[index] ?? eof;
  }

  function skipEnds(): void {
    while (peek().kind === "end") index += 1;
  }

  function peekSkippingEnds(): Token {
    let cursor = index;
    while (tokens[cursor]?.kind === "end") cursor += 1;
    return tokens[cursor] ?? eof;
  }

  function consume(): Token {
    const token = peek();
    index += 1;
    return token;
  }

  function expectOp(text: string, context: string): Token {
    const token = peek();
    if (!isOp(token, text)) {
      throw new ScriptError(
        "syntax.error",
        `expected \`${text}\` ${context} but found ${describe(token)}`,
        { file: "", line: token.line },
      );
    }
    return consume();
  }

  function expectStatementEnd(): void {
    const token = peek();
    if (token.kind === "end" || token.kind === "eof") {
      if (token.kind === "end") consume();
      return;
    }
    if (isOp(token, "}")) {
      // STX-6: '}' ends the statement before it; do not consume '}'
      return;
    }
    throw new ScriptError(
      "syntax.error",
      `expected the end of a statement but found ${describe(token)}`,
      { file: "", line: token.line },
    );
  }

  function expectBlock(context: string): Block {
    skipEnds();
    const token = peek();
    if (!isOp(token, "{")) {
      throw new ScriptError(
        "syntax.unsupported",
        `braces are mandatory (STX-1): expected \`{\` ${context} but found ${describe(token)}`,
        { file: "", line: token.line },
      );
    }
    consume(); // consume '{'
    return parseBlockStatements();
  }

  function parseBlockStatements(): Block {
    const statements: Statement[] = [];
    skipEnds();
    while (peek().kind !== "eof" && !isOp(peek(), "}")) {
      statements.push(parseStatement(true));
      skipEnds();
    }
    if (!isOp(peek(), "}")) {
      throw new ScriptError(
        "syntax.error",
        `expected \`}\` to close block but found ${describe(peek())}`,
        { file: "", line: peek().line },
      );
    }
    consume(); // consume '}'
    return statements;
  }

  // --- Expressions ---

  function parsePrimary(inArgs = false): Expr {
    skipEnds();
    const token = peek();

    if (token.kind === "number") {
      consume();
      return { kind: "literal", value: token.value, line: token.line };
    }

    if (token.kind === "string") {
      consume();
      return { kind: "literal", value: token.value, line: token.line };
    }

    // Parenthesized expression: ( expr )
    if (isOp(token, "(")) {
      consume();
      const expr = parseExpression();
      skipEnds();
      expectOp(")", "to close parenthesized expression");
      return expr;
    }

    // :name -> label reference in args list (STX-5), global-forcing name read elsewhere (SEM-4)
    if (isOp(token, ":")) {
      const line = token.line;
      consume();
      const next = peek();
      if (next.kind !== "identifier") {
        throw new ScriptError(
          "syntax.error",
          `expected an identifier after \`:\` but found ${describe(next)}`,
          { file: "", line },
        );
      }
      consume();
      if (inArgs) {
        return { kind: "labelRef", name: next.name, line };
      }
      return { kind: "variable", name: next.name, scope: "global", line };
    }

    // local(x) or global(x) declaration form (FUN-2)
    if (token.kind === "identifier" && (token.name === "local" || token.name === "global")) {
      const next = tokens[index + 1];
      if (next && isOp(next, "(")) {
        const line = token.line;
        const scope = token.name as "local" | "global";
        consume(); // consume local/global
        consume(); // consume (
        skipEnds();
        const ident = peek();
        if (ident.kind !== "identifier") {
          throw new ScriptError(
            "syntax.error",
            `expected variable name in \`${scope}()\` declaration but found ${describe(ident)}`,
            { file: "", line: ident.line },
          );
        }
        consume();
        skipEnds();
        expectOp(")", `after \`${scope}(${ident.name})\``);
        return { kind: "decl", scope, name: ident.name, line };
      }
    }

    // Plain identifier: variable
    if (token.kind === "identifier") {
      consume();
      return { kind: "variable", name: token.name, scope: null, line: token.line };
    }

    throw new ScriptError(
      "syntax.error",
      `expected an expression but found ${describe(token)}`,
      { file: "", line: token.line },
    );
  }

  function parsePostfix(inArgs = false): Expr {
    let expr = parsePrimary(inArgs);

    while (true) {
      const token = peek();

      // Function call: expr(args)
      if (isOp(token, "(")) {
        if (expr.kind !== "variable") {
          throw new ScriptError(
            "syntax.error",
            "only named functions can be called",
            { file: "", line: token.line },
          );
        }
        consume(); // consume '('
        const args = parseArgs();
        expr = {
          kind: "call",
          name: expr.name,
          args,
          line: expr.line,
        };
        continue;
      }

      // Index access: expr[idx]
      if (isOp(token, "[")) {
        consume(); // consume '['
        skipEnds();
        const indexExpr = parseExpression();
        skipEnds();
        expectOp("]", "to close index expression");
        expr = {
          kind: "index",
          base: expr,
          index: indexExpr,
          line: expr.line,
        };
        continue;
      }

      // Postfix ++ / --
      if (isOp(token, "++") || isOp(token, "--")) {
        consume();
        expr = {
          kind: "postfix",
          operator: token.text as "++" | "--",
          operand: expr,
          line: expr.line,
        };
        continue;
      }

      break;
    }

    return expr;
  }

  function parseUnary(inArgs = false): Expr {
    skipEnds();
    const token = peek();

    // Level 2 prefix operators: - + ! ~ ++ --
    if (
      isOp(token, "-") ||
      isOp(token, "+") ||
      isOp(token, "!") ||
      isOp(token, "~") ||
      isOp(token, "++") ||
      isOp(token, "--")
    ) {
      consume();
      const operand = parseUnary(inArgs);
      return {
        kind: "unary",
        operator: token.text as UnaryOp,
        operand,
        line: token.line,
      };
    }

    return parsePostfix(inArgs);
  }

  function parseBinary(minBindingPower: number, inArgs = false): Expr {
    let left = parseUnary(inArgs);

    while (true) {
      const token = peek();
      if (token.kind !== "op") break;

      const bp = binaryBindingPower(token.text);
      if (bp === undefined || bp < minBindingPower) break;

      const op = token;
      consume();

      // Level 15: assignment operators (right-associative)
      if (ASSIGNMENT_OPS.includes(op.text)) {
        const right = parseBinary(bp, inArgs);
        left = {
          kind: "assign",
          operator: op.text,
          target: left,
          value: right,
          line: op.line,
        };
        continue;
      }

      // Level 14: ternary ?: (right-associative)
      if (op.text === "?") {
        skipEnds();
        const thenExpr = parseBinary(1, inArgs);
        skipEnds();
        expectOp(":", "in ternary conditional expression");
        skipEnds();
        const elseExpr = parseBinary(bp, inArgs);
        left = {
          kind: "ternary",
          cond: left,
          then: thenExpr,
          else: elseExpr,
          line: op.line,
        };
        continue;
      }

      // Level 3 to 13: left-associative binary operators
      // Standard precedence climbing: right child gets bp + 1
      const right = parseBinary(bp + 1, inArgs);
      const binaryOp: BinaryOp =
        op.text === "and" ? "&&" : op.text === "or" ? "||" : (op.text as BinaryOp);
      left = {
        kind: "binary",
        operator: binaryOp,
        left,
        right,
        line: op.line,
      };
    }

    return left;
  }

  function parseExpression(inArgs = false): Expr {
    return parseBinary(0, inArgs);
  }

  function parseArgs(): Expr[] {
    const args: Expr[] = [];
    skipEnds();
    if (isOp(peek(), ")")) {
      consume();
      return args;
    }
    args.push(parseExpression(true));
    skipEnds();
    while (isOp(peek(), ",")) {
      consume();
      skipEnds();
      args.push(parseExpression(true));
      skipEnds();
    }
    expectOp(")", "to close argument list");
    return args;
  }

  // --- Function parameter list (FUN-1) ---

  function parseParams(): Param[] {
    expectOp("(", "at start of parameter list");
    const params: Param[] = [];
    skipEnds();
    if (isOp(peek(), ")")) {
      consume();
      return params;
    }

    function parseOneParam(): Param {
      skipEnds();
      let byRef = false;
      let typeName: string | null = null;

      if (isOp(peek(), "&")) {
        consume();
        byRef = true;
      }

      const first = peek();
      if (first.kind !== "identifier") {
        throw new ScriptError(
          "syntax.error",
          `expected parameter name but found ${describe(first)}`,
          { file: "", line: first.line },
        );
      }
      consume();

      let nameToken: Token & { kind: "identifier" };
      const second = peek();
      if (second.kind === "identifier") {
        typeName = first.name;
        nameToken = second;
        consume();
      } else {
        nameToken = first;
      }

      // Check trailing `&` form: `n &`
      if (isOp(peek(), "&")) {
        consume();
        byRef = true;
      }

      return {
        name: nameToken.name,
        byRef,
        typeName,
        line: nameToken.line,
      };
    }

    params.push(parseOneParam());
    skipEnds();
    while (isOp(peek(), ",")) {
      consume();
      skipEnds();
      params.push(parseOneParam());
      skipEnds();
    }

    expectOp(")", "at end of parameter list");
    return params;
  }

  // --- Statements ---

  function parseFunction(isInline: boolean): FunctionDef {
    const fnToken = consume(); // 'function' or 'method'
    skipEnds();
    const nameToken = peek();
    if (nameToken.kind !== "identifier") {
      throw new ScriptError(
        "syntax.error",
        `expected function name after \`${fnToken.kind === "identifier" ? fnToken.name : "function"}\` but found ${describe(nameToken)}`,
        { file: "", line: nameToken.line },
      );
    }
    consume();
    const params = parseParams();
    const body = expectBlock(`in \`function ${nameToken.name}\``);
    return {
      name: nameToken.name,
      params,
      body,
      isInline,
      line: fnToken.line,
    };
  }

  function parseIf(): Statement {
    const ifToken = consume(); // 'if'
    skipEnds();
    expectOp("(", "after `if`");
    const cond = parseExpression();
    skipEnds();
    expectOp(")", "after `if` condition");
    const body = expectBlock("after `if` condition");

    const branches: IfBranch[] = [{ cond, body, line: ifToken.line }];
    let elseBody: Block | null = null;

    // Check for `elseif` or `else if` (STX-3)
    while (true) {
      const next = peekSkippingEnds();
      if (isIdent(next, "elseif")) {
        skipEnds();
        const elifToken = consume();
        skipEnds();
        expectOp("(", "after `elseif`");
        const elifCond = parseExpression();
        skipEnds();
        expectOp(")", "after `elseif` condition");
        const elifBody = expectBlock("after `elseif` condition");
        branches.push({ cond: elifCond, body: elifBody, line: elifToken.line });
        continue;
      }
      if (isIdent(next, "else")) {
        // Peek ahead to see if it's `else if`
        let cursor = index;
        while (tokens[cursor]?.kind === "end") cursor++;
        cursor++; // skip 'else'
        while (tokens[cursor]?.kind === "end") cursor++;
        const afterElse = tokens[cursor];
        if (afterElse && isIdent(afterElse, "if")) {
          skipEnds();
          const elseToken = consume(); // 'else'
          skipEnds();
          consume(); // 'if'
          skipEnds();
          expectOp("(", "after `else if`");
          const elifCond = parseExpression();
          skipEnds();
          expectOp(")", "after `else if` condition");
          const elifBody = expectBlock("after `else if` condition");
          branches.push({ cond: elifCond, body: elifBody, line: elseToken.line });
          continue;
        }

        // Plain `else`
        skipEnds();
        consume(); // 'else'
        elseBody = expectBlock("after `else`");
        break;
      }
      break;
    }

    return {
      kind: "if",
      branches,
      elseBody,
      line: ifToken.line,
    };
  }

  function parseWhile(): Statement {
    const token = consume(); // 'while'
    skipEnds();
    expectOp("(", "after `while`");
    const cond = parseExpression();
    skipEnds();
    expectOp(")", "after `while` condition");
    const body = expectBlock("after `while` condition");
    return { kind: "while", cond, body, line: token.line };
  }

  function parseUntil(): Statement {
    const token = consume(); // 'until'
    skipEnds();
    expectOp("(", "after `until`");
    const cond = parseExpression();
    skipEnds();
    expectOp(")", "after `until` condition");
    const body = expectBlock("after `until` condition");
    return { kind: "until", cond, body, line: token.line };
  }

  function parseFor(): Statement {
    const token = consume(); // 'for'
    skipEnds();
    expectOp("(", "after `for`");

    let init: Expr | null = null;
    if (peek().kind !== "end") {
      init = parseExpression();
    }
    if (peek().kind !== "end") {
      throw new ScriptError("syntax.error", `expected \`;\` after \`for\` initialiser but found ${describe(peek())}`, { file: "", line: peek().line });
    }
    consume(); // consume ';'

    let cond: Expr | null = null;
    if (peek().kind !== "end") {
      cond = parseExpression();
    }
    if (peek().kind !== "end") {
      throw new ScriptError("syntax.error", `expected \`;\` after \`for\` condition but found ${describe(peek())}`, { file: "", line: peek().line });
    }
    consume(); // consume ';'

    let step: Expr | null = null;
    if (!isOp(peek(), ")")) {
      step = parseExpression();
    }
    expectOp(")", "after `for` step");

    const body = expectBlock("after `for` header");
    return { kind: "for", init, cond, step, body, line: token.line };
  }

  function parseSwitch(): Statement {
    const token = consume(); // 'switch'
    skipEnds();
    expectOp("(", "after `switch`");
    const value = parseExpression();
    skipEnds();
    expectOp(")", "after `switch` value");

    skipEnds();
    const openBrace = peek();
    if (!isOp(openBrace, "{")) {
      throw new ScriptError(
        "syntax.unsupported",
        `braces are mandatory (STX-1): expected \`{\` after \`switch\` but found ${describe(openBrace)}`,
        { file: "", line: openBrace.line },
      );
    }
    consume();

    const cases: SwitchCase[] = [];
    let defaultBody: Block | null = null;

    skipEnds();
    while (peek().kind !== "eof" && !isOp(peek(), "}")) {
      const caseOrDef = peek();
      if (isIdent(caseOrDef, "case")) {
        consume(); // 'case'
        skipEnds();
        const caseValue = parseExpression();
        skipEnds();
        if (isOp(peek(), ":")) consume(); // colon is optional (STX-2)
        const caseBody = expectBlock("in `case` label");
        cases.push({ value: caseValue, body: caseBody, line: caseOrDef.line });
        skipEnds();
        continue;
      }
      if (isIdent(caseOrDef, "default")) {
        consume(); // 'default'
        skipEnds();
        if (isOp(peek(), ":")) consume(); // colon is optional
        defaultBody = expectBlock("in `default` label");
        skipEnds();
        continue;
      }
      throw new ScriptError(
        "syntax.error",
        `expected \`case\` or \`default\` inside \`switch\` but found ${describe(caseOrDef)}`,
        { file: "", line: caseOrDef.line },
      );
    }

    if (!isOp(peek(), "}")) {
      throw new ScriptError(
        "syntax.error",
        `expected \`}\` to close \`switch\` but found ${describe(peek())}`,
        { file: "", line: peek().line },
      );
    }
    consume(); // '}'

    return {
      kind: "switch",
      value,
      cases,
      defaultBody,
      line: token.line,
    };
  }

  function parseReturn(): Statement {
    const token = consume(); // 'return'
    const next = peek();

    // Bare return
    if (next.kind === "end" || next.kind === "eof" || isOp(next, "}")) {
      expectStatementEnd();
      return { kind: "return", value: null, byRef: false, line: token.line };
    }

    // return &lvalue (FUN-3)
    if (isOp(next, "&")) {
      consume(); // consume '&'
      const value = parseExpression();
      expectStatementEnd();
      return { kind: "return", value, byRef: true, line: token.line };
    }

    // return expr
    const value = parseExpression();
    expectStatementEnd();
    return { kind: "return", value, byRef: false, line: token.line };
  }

  function parseStatement(inBlock = false): Statement {
    const token = peek();

    // Inline function hint
    if (isIdent(token, "inline")) {
      const next = tokens[index + 1];
      if (next && (isIdent(next, "function") || isIdent(next, "method"))) {
        if (inBlock) {
          throw new ScriptError(
            "syntax.error",
            "function definitions cannot appear inside blocks",
            { file: "", line: token.line },
          );
        }
        consume(); // 'inline'
        const fn = parseFunction(true);
        functions.push(fn);
        return {
          kind: "expr",
          expr: { kind: "literal", value: 0, line: token.line },
          line: token.line,
        };
      }
    }

    // Function or method definition
    if (isIdent(token, "function") || isIdent(token, "method")) {
      if (inBlock) {
        throw new ScriptError(
          "syntax.error",
          "function definitions cannot appear inside blocks",
          { file: "", line: token.line },
        );
      }
      const fn = parseFunction(false);
      functions.push(fn);
      return {
        kind: "expr",
        expr: { kind: "literal", value: 0, line: token.line },
        line: token.line,
      };
    }

    // Control statements
    if (isIdent(token, "if")) return parseIf();
    if (isIdent(token, "while")) return parseWhile();
    if (isIdent(token, "until")) return parseUntil();
    if (isIdent(token, "for")) return parseFor();
    if (isIdent(token, "switch")) return parseSwitch();
    if (isIdent(token, "return")) return parseReturn();

    // :label statement (STX-5) vs :x = 1 global variable write
    if (isOp(token, ":")) {
      const next = tokens[index + 1];
      const after = tokens[index + 2];
      if (
        next &&
        next.kind === "identifier" &&
        after &&
        (after.kind === "end" || after.kind === "eof" || isOp(after, "}"))
      ) {
        consume(); // ':'
        consume(); // identifier
        expectStatementEnd();
        return { kind: "label", name: next.name, line: token.line };
      }
    }

    // Bare identifier alone on a line: zero-argument call (e.g. `end\n` -> `end()`)
    if (token.kind === "identifier") {
      const next = tokens[index + 1];
      if (next && (next.kind === "end" || next.kind === "eof" || isOp(next, "}"))) {
        consume();
        expectStatementEnd();
        return {
          kind: "expr",
          expr: { kind: "call", name: token.name, args: [], line: token.line },
          line: token.line,
        };
      }
    }

    // Expression statement (assignment, call, decl, etc.)
    const expr = parseExpression();
    expectStatementEnd();
    return { kind: "expr", expr, line: expr.line };
  }

  const statements: Statement[] = [];
  const functions: FunctionDef[] = [];

  skipEnds();
  while (peek().kind !== "eof") {
    const stmt = parseStatement(false);
    // Function definitions are collected into `functions` and leave a dummy expr;
    // do not add them to top-level statements
    if (
      !(
        stmt.kind === "expr" &&
        stmt.expr.kind === "literal" &&
        stmt.expr.value === 0 &&
        functions.length > 0 &&
        functions[functions.length - 1]?.line === stmt.line
      )
    ) {
      statements.push(stmt);
    }
    skipEnds();
  }

  return { statements, functions };
}
