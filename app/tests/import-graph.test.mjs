import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { parseAst } from 'rolldown/parseAst';

// Whole-app relative import graph (3.6556.2 migration E35, plan-review C1). Static only: nothing here runs app code.
// Every relative ESM `import … from` / `export … from` in src/**/*.{js,jsx,mjs} (generated areas included) and
// electron/**/*.{cjs,mjs,js}, and every literal CommonJS `require('./…')`, must name a file that exists; every name an
// ESM module imports or re-exports from another ESM module must be among that module's exports (`export *` expanded
// recursively, `default` excluded from it as in ESM). This is what keeps a generator that moves to a new official
// release (renamed chunk files, re-minified locals) from breaking an area that still imports its previous output: the
// link error would otherwise only show at build or app start.
const app = path.resolve(import.meta.dirname, '..');
const roots = [['src', /\.(?:js|jsx|mjs)$/], ['electron', /\.(?:cjs|mjs|js)$/]];
const esmExtensions = /\.(?:js|jsx|mjs)$/;
const probe = ['', '.js', '.jsx', '.mjs', '.cjs', '.json', '/index.js', '/index.jsx', '/index.mjs', '/index.cjs'];

function walkFiles(dir, pattern, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === 'node_modules' || entry.name.startsWith('.')) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walkFiles(full, pattern, out);
    else if (entry.isFile() && pattern.test(entry.name)) out.push(full);
  }
  return out;
}

const parsed = new Map();
function parse(file) {
  if (parsed.has(file)) return parsed.get(file);
  const code = fs.readFileSync(file, 'utf8');
  let program, error;
  for (const lang of file.endsWith('.jsx') ? ['jsx'] : ['js', 'jsx']) {
    try { program = parseAst(code, { lang }, file); error = null; break; } catch (e) { error = e; }
  }
  const result = { program, error };
  parsed.set(file, result);
  return result;
}

const relative = spec => typeof spec === 'string' && (spec.startsWith('./') || spec.startsWith('../'));
function resolve(from, spec) {
  const base = path.resolve(path.dirname(from), spec.replace(/[?#].*$/, ''));
  for (const suffix of probe) {
    const candidate = base + suffix;
    if (fs.existsSync(candidate) && fs.statSync(candidate).isFile()) return candidate;
  }
  return null;
}
const nameOf = node => (node.type === 'Literal' ? String(node.value) : node.name);
function patternNames(node, out) {
  if (!node) return out;
  if (node.type === 'Identifier') out.push(node.name);
  else if (node.type === 'ObjectPattern') for (const p of node.properties) patternNames(p.type === 'RestElement' ? p.argument : p.value, out);
  else if (node.type === 'ArrayPattern') for (const e of node.elements) patternNames(e, out);
  else if (node.type === 'RestElement') patternNames(node.argument, out);
  else if (node.type === 'AssignmentPattern') patternNames(node.left, out);
  return out;
}
const isEsm = program => program.body.some(n => /^(?:Import|Export\w*)Declaration$/.test(n.type));

// The export names of an ESM file: { names: Set, open: boolean } (open = a star re-export of something not checked).
const exportCache = new Map();
function exportsOf(file, stack = new Set()) {
  if (exportCache.has(file)) return exportCache.get(file);
  if (stack.has(file)) return { names: new Set(), open: false }; // a star cycle adds nothing new
  stack.add(file);
  const names = new Set();
  let open = false;
  const { program } = parse(file);
  if (!program) open = true;
  for (const node of program?.body ?? []) {
    if (node.type === 'ExportDefaultDeclaration') names.add('default');
    else if (node.type === 'ExportNamedDeclaration') {
      const d = node.declaration;
      if (d?.type === 'VariableDeclaration') for (const v of d.declarations) for (const n of patternNames(v.id, [])) names.add(n);
      else if (d?.id) names.add(d.id.name);
      for (const s of node.specifiers ?? []) names.add(nameOf(s.exported));
    } else if (node.type === 'ExportAllDeclaration') {
      if (node.exported) { names.add(nameOf(node.exported)); continue; }
      const target = relative(node.source.value) ? resolve(file, node.source.value) : null;
      if (!target || !esmExtensions.test(target)) { open = true; continue; }
      const inner = exportsOf(target, stack);
      for (const n of inner.names) if (n !== 'default') names.add(n);
      open ||= inner.open;
    }
  }
  stack.delete(file);
  const result = { names, open };
  exportCache.set(file, result);
  return result;
}
// A target whose names are checked: an ESM source file that parses as a module (CommonJS / JSON / assets are not).
function checkedExports(target) {
  if (!esmExtensions.test(target)) return null;
  const { program } = parse(target);
  if (!program || (!target.endsWith('.mjs') && !isEsm(program) && /\brequire\(|module\.exports|exports\./.test(fs.readFileSync(target, 'utf8')))) return null;
  const result = exportsOf(target);
  return result.open ? null : result.names;
}

// Literal `require('./…')` calls, anywhere in a CommonJS file.
function requireCalls(node, out) {
  if (!node || typeof node !== 'object') return out;
  if (Array.isArray(node)) { for (const n of node) requireCalls(n, out); return out; }
  if (node.type === 'CallExpression' && node.callee?.type === 'Identifier' && node.callee.name === 'require'
    && node.arguments.length === 1 && node.arguments[0].type === 'Literal' && typeof node.arguments[0].value === 'string') out.push(node.arguments[0].value);
  for (const key in node) if (key !== 'start' && key !== 'end' && node[key] && typeof node[key] === 'object') requireCalls(node[key], out);
  return out;
}

function edgesOf(file) {
  const { program } = parse(file);
  const edges = [];
  for (const node of program.body) {
    if (node.type === 'ImportDeclaration') {
      const names = node.specifiers.flatMap(s => s.type === 'ImportSpecifier' ? [nameOf(s.imported)] : s.type === 'ImportDefaultSpecifier' ? ['default'] : []);
      edges.push({ kind: 'import', spec: node.source.value, names });
    } else if (node.type === 'ExportNamedDeclaration' && node.source) {
      edges.push({ kind: 'export', spec: node.source.value, names: node.specifiers.map(s => nameOf(s.local)) });
    } else if (node.type === 'ExportAllDeclaration') {
      edges.push({ kind: 'export *', spec: node.source.value, names: [] });
    }
  }
  if (file.endsWith('.cjs') || !isEsm(program)) for (const spec of requireCalls(program.body, [])) edges.push({ kind: 'require', spec, names: [] });
  return edges.filter(e => relative(e.spec));
}

const files = roots.flatMap(([dir, pattern]) => walkFiles(path.join(app, dir), pattern)).sort();
const rel = file => path.relative(app, file);

test('every app source file parses', () => {
  assert.ok(files.length > 1000, `only ${files.length} files found`);
  const broken = files.filter(f => parse(f).error).map(f => `${rel(f)}: ${parse(f).error.message.split('\n')[0]}`);
  assert.deepEqual(broken, []);
});

test('every relative import, re-export and require names an existing file and existing exports', () => {
  const missingFiles = [], missingNames = [];
  let edges = 0, named = 0;
  for (const file of files) {
    if (parse(file).error) continue;
    for (const edge of edgesOf(file)) {
      edges++;
      const target = resolve(file, edge.spec);
      if (!target) { missingFiles.push(`${rel(file)}: ${edge.kind} '${edge.spec}'`); continue; }
      if (edge.kind === 'require' || !edge.names.length) continue;
      const exported = checkedExports(target);
      if (!exported) continue;
      for (const name of edge.names) {
        named++;
        if (!exported.has(name)) missingNames.push(`${rel(file)}: ${edge.kind} { ${name} } from '${edge.spec}' (${rel(target)} has no such export)`);
      }
    }
  }
  assert.ok(edges > 1000 && named > 1000, `only ${edges} edges / ${named} names checked`);
  assert.deepEqual([...missingFiles, ...missingNames], []);
});

test('the checker itself: export * recursion, default, aliases and require', t => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'import-graph-'));
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  const write = (name, text) => fs.writeFileSync(path.join(dir, name), text);
  write('a.mjs', 'export const a = 1, { b, c: [d] } = {}; export default 1; export function f() {}');
  write('b.mjs', "export * from './a.mjs'; export { a as renamed } from './a.mjs'; export * as ns from './a.mjs';");
  write('c.mjs', "export * from './b.mjs'; export * from './c.mjs';");
  write('d.cjs', "const x = require('./a.mjs'); function g() { return require('../missing.cjs'); }");
  const c = exportsOf(path.join(dir, 'c.mjs'));
  assert.deepEqual([...c.names].sort(), ['a', 'b', 'd', 'f', 'ns', 'renamed']);
  assert.equal(c.names.has('default'), false);
  assert.equal(exportsOf(path.join(dir, 'a.mjs')).names.has('default'), true);
  assert.deepEqual(edgesOf(path.join(dir, 'd.cjs')).map(e => [e.kind, e.spec]), [['require', './a.mjs'], ['require', '../missing.cjs']]);
  assert.equal(resolve(path.join(dir, 'd.cjs'), '../missing.cjs'), null);
});
