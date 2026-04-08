function tokenize(input) {
  const s = String(input || '').trim();
  const tokens = [];
  let i = 0;

  function isSpace(ch) { return /\s/.test(ch); }
  function isAlpha(ch) { return /[A-Za-z_]/.test(ch); }
  function isNum(ch) { return /[0-9.]/.test(ch); }

  while (i < s.length) {
    const ch = s[i];
    if (isSpace(ch)) { i += 1; continue; }

    if (ch === '(' || ch === ')') {
      tokens.push({ type: ch });
      i += 1;
      continue;
    }

    const two = s.slice(i, i + 2);
    if (two === '<=' || two === '>=' || two === '==' || two === '!=') {
      tokens.push({ type: 'OP', value: two });
      i += 2;
      continue;
    }
    if (ch === '<' || ch === '>') {
      tokens.push({ type: 'OP', value: ch });
      i += 1;
      continue;
    }

    if (isAlpha(ch)) {
      let j = i + 1;
      while (j < s.length && /[A-Za-z0-9_]/.test(s[j])) j += 1;
      const word = s.slice(i, j);
      const upper = word.toUpperCase();
      if (upper === 'AND' || upper === 'OR') {
        tokens.push({ type: upper });
      } else {
        tokens.push({ type: 'IDENT', value: word });
      }
      i = j;
      continue;
    }

    if (isNum(ch) || ch === '-') {
      let j = i;
      if (s[j] === '-') j += 1;
      while (j < s.length && isNum(s[j])) j += 1;
      const numStr = s.slice(i, j);
      const val = Number(numStr);
      if (Number.isNaN(val)) throw new Error(`invalid_number:${numStr}`);
      tokens.push({ type: 'NUMBER', value: val });
      i = j;
      continue;
    }

    throw new Error(`unexpected_char:${ch}`);
  }

  return tokens;
}

function parse(dsl) {
  const tokens = tokenize(dsl);
  let pos = 0;

  function peek() { return tokens[pos]; }
  function consume(type) {
    const t = tokens[pos];
    if (!t || t.type !== type) throw new Error(`expected_${type}`);
    pos += 1;
    return t;
  }

  function parsePrimary() {
    const t = peek();
    if (!t) throw new Error('unexpected_eof');

    if (t.type === '(') {
      consume('(');
      const expr = parseExpr();
      consume(')');
      return expr;
    }

    // comparison: IDENT OP NUMBER
    if (t.type === 'IDENT') {
      const ident = consume('IDENT').value;
      const op = consume('OP').value;
      const num = consume('NUMBER').value;
      return { type: 'CMP', indicator: ident, operator: op, value: num };
    }

    throw new Error(`unexpected_token:${t.type}`);
  }

  function parseAnd() {
    let left = parsePrimary();
    while (peek() && peek().type === 'AND') {
      consume('AND');
      const right = parsePrimary();
      left = { type: 'AND', left, right };
    }
    return left;
  }

  function parseExpr() {
    let left = parseAnd();
    while (peek() && peek().type === 'OR') {
      consume('OR');
      const right = parseAnd();
      left = { type: 'OR', left, right };
    }
    return left;
  }

  const ast = parseExpr();
  if (pos !== tokens.length) throw new Error('trailing_tokens');
  return ast;
}

function optimize(ast) {
  // Simple optimizer:
  // - flatten associative AND/OR
  // - sort comparisons (cheap first) for better short-circuit (heuristic)
  function flatten(node) {
    if (!node) return node;
    if (node.type === 'CMP') return node;
    const type = node.type;
    const items = [];

    function gather(n) {
      const nn = flatten(n);
      if (nn.type === type) {
        gather(nn.left);
        gather(nn.right);
      } else {
        items.push(nn);
      }
    }

    gather(node.left);
    gather(node.right);

    // heuristic: CMP nodes first.
    items.sort((a, b) => (a.type === 'CMP' ? -1 : 1) - (b.type === 'CMP' ? -1 : 1));

    // rebuild as left-deep tree
    let cur = items[0];
    for (let i = 1; i < items.length; i += 1) cur = { type, left: cur, right: items[i] };
    return cur;
  }

  return flatten(ast);
}

function compare(actual, operator, expected) {
  if (actual == null || Number.isNaN(actual)) return false;
  switch (operator) {
    case '<': return actual < expected;
    case '<=': return actual <= expected;
    case '>': return actual > expected;
    case '>=': return actual >= expected;
    case '==': return actual === expected;
    case '!=': return actual !== expected;
    default: return false;
  }
}

function evaluateAst(ast, indicatorContext) {
  if (!ast) return { triggered: false, evaluations: [] };

  if (ast.type === 'CMP') {
    const actual = indicatorContext[ast.indicator];
    const matched = compare(actual, ast.operator, ast.value);
    return {
      triggered: matched,
      evaluations: [{
        indicator: ast.indicator,
        operator: ast.operator,
        expected: ast.value,
        actual,
        matched
      }]
    };
  }

  if (ast.type === 'AND') {
    const left = evaluateAst(ast.left, indicatorContext);
    if (!left.triggered) return { triggered: false, evaluations: left.evaluations };
    const right = evaluateAst(ast.right, indicatorContext);
    return { triggered: left.triggered && right.triggered, evaluations: left.evaluations.concat(right.evaluations) };
  }

  if (ast.type === 'OR') {
    const left = evaluateAst(ast.left, indicatorContext);
    if (left.triggered) return { triggered: true, evaluations: left.evaluations };
    const right = evaluateAst(ast.right, indicatorContext);
    return { triggered: right.triggered, evaluations: left.evaluations.concat(right.evaluations) };
  }

  throw new Error(`unknown_ast_node:${ast.type}`);
}

function compileDsl(dsl) {
  const ast = optimize(parse(dsl));
  return { dsl: String(dsl), ast };
}

module.exports = {
  compileDsl,
  parseDsl: parse,
  optimizeDslAst: optimize,
  evaluateAst
};

