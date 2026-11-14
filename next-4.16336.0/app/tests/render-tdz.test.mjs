import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { parseAst } from 'rolldown/parseAst';

// Wave integration guard. Parallel batches insert hooks into the long render
// bodies of main.jsx; F12's band hold read `workdir` in a useMemo deps array
// about 35 lines before F08/F11's `const workdir`, and the production build
// threw "Cannot access 'Cr' before initialization" on the first render (blank
// window in every offscreen suite). This check finds that class of bug without
// a build: inside each top-level function, an identifier evaluated directly in
// the body (not inside a nested function, which runs later) must not name a
// const/let/class that the same body declares further down.
const src = path.resolve(import.meta.dirname, '../src');
const FILES = ['main.jsx'];

const NESTED = new Set(['FunctionExpression', 'ArrowFunctionExpression', 'FunctionDeclaration', 'ClassBody']);

function bindingNames(pattern, out = []) {
  if (!pattern) return out;
  switch (pattern.type) {
    case 'Identifier': out.push(pattern.name); break;
    case 'ObjectPattern': for (const prop of pattern.properties) bindingNames(prop.type === 'RestElement' ? prop.argument : prop.value, out); break;
    case 'ArrayPattern': for (const element of pattern.elements) bindingNames(element, out); break;
    case 'RestElement': bindingNames(pattern.argument, out); break;
    case 'AssignmentPattern': bindingNames(pattern.left, out); break;
  }
  return out;
}

// Identifiers read while the statement itself runs (nested functions skipped).
function eagerReads(node, out = [], parent = null, key = null) {
  if (!node || typeof node.type !== 'string') return out;
  if (NESTED.has(node.type) && parent) return out;
  if (node.type === 'Identifier') {
    const property = (parent?.type === 'MemberExpression' && key === 'property' && !parent.computed)
      || ((parent?.type === 'Property' || parent?.type === 'MethodDefinition' || parent?.type === 'PropertyDefinition') && key === 'key' && !parent.computed && !parent.shorthand)
      || (parent?.type === 'LabeledStatement' || parent?.type === 'BreakStatement' || parent?.type === 'ContinueStatement');
    if (!property) out.push({ name: node.name, start: node.start });
    return out;
  }
  for (const [childKey, value] of Object.entries(node)) {
    if (childKey === 'type' || childKey === 'start' || childKey === 'end') continue;
    if (Array.isArray(value)) for (const child of value) eagerReads(child, out, node, childKey);
    else if (value && typeof value === 'object') eagerReads(value, out, node, childKey);
  }
  return out;
}

function topLevelFunctions(ast) {
  const found = [];
  for (const node of ast.body) {
    const declaration = node.type === 'ExportNamedDeclaration' || node.type === 'ExportDefaultDeclaration' ? node.declaration : node;
    if (declaration?.type === 'FunctionDeclaration' && declaration.body) found.push({ name: declaration.id?.name ?? 'default', body: declaration.body.body });
  }
  return found;
}

function lineOf(code, offset) { return code.slice(0, offset).split('\n').length; }

test('main.jsx render bodies read no const/let before its declaration (TDZ)', () => {
  const problems = [];
  for (const file of FILES) {
    const code = readFileSync(path.join(src, file), 'utf8');
    const ast = parseAst(code, { lang: 'jsx' });
    const functions = topLevelFunctions(ast);
    assert.ok(functions.some((fn) => fn.name === 'App'), 'App is found');
    for (const fn of functions) {
      const declaredAt = new Map();
      fn.body.forEach((statement, index) => {
        if (statement.type === 'VariableDeclaration' && statement.kind !== 'var')
          for (const declarator of statement.declarations) for (const name of bindingNames(declarator.id)) if (!declaredAt.has(name)) declaredAt.set(name, index);
        if (statement.type === 'ClassDeclaration' && statement.id) declaredAt.set(statement.id.name, index);
      });
      fn.body.forEach((statement, index) => {
        if (statement.type === 'FunctionDeclaration') return; // hoisted, runs later
        for (const read of eagerReads(statement)) {
          const declared = declaredAt.get(read.name);
          if (declared !== undefined && declared > index)
            problems.push(`${file}:${lineOf(code, read.start)} ${fn.name} reads ${read.name} before line ${lineOf(code, fn.body[declared].start)}`);
        }
      });
    }
  }
  assert.deepEqual(problems, []);
});
