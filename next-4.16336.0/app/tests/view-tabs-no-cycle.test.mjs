import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { parseAst } from 'rolldown/parseAst';

// Regression lock for the view-tabs import cycle (W10 not-done rows 18 / 21; E41, E45). The view-tabs facade
// (src/generated/view-tabs/index.js) evaluates every view-tabs module, and c9c7785eb / ce58a0513 import
// source-code-start-adapters.jsx, shared-2 imports source-sessions-adapters.jsx. A host module those adapters reach
// (source-chat-adapters.jsx, source-menu.jsx and what they import) that went back to the facade would close a cycle
// through the generated graph again. Static only: the relative `import … from` / `export … from` edges of
// src/**/*.{js,jsx,mjs}, parsed with rolldown parseAst from src/main.jsx; no app code runs. Dynamic import() is not an
// evaluation edge and is left out.
const app = path.resolve(import.meta.dirname, '..');
const src = path.join(app, 'src');
const viewTabs = path.join(src, 'generated/view-tabs') + path.sep;
const facade = path.join(src, 'generated/view-tabs/index.js');
const probe = ['', '.js', '.jsx', '.mjs', '/index.js', '/index.jsx', '/index.mjs'];
const code = /\.(?:js|jsx|mjs)$/;
const rel = file => path.relative(app, file).split(path.sep).join('/');

function resolve(from, spec) {
  const base = path.resolve(path.dirname(from), spec.replace(/[?#].*$/, ''));
  for (const suffix of probe) {
    const candidate = base + suffix;
    if (fs.existsSync(candidate) && fs.statSync(candidate).isFile()) return candidate;
  }
  return null;
}

const edgesCache = new Map();
function edges(file) {
  if (edgesCache.has(file)) return edgesCache.get(file);
  const text = fs.readFileSync(file, 'utf8');
  let program;
  for (const lang of file.endsWith('.jsx') ? ['jsx'] : ['js', 'jsx']) {
    try { program = parseAst(text, { lang }, file); break; } catch { /* try the next dialect */ }
  }
  assert.ok(program, `${rel(file)} does not parse`);
  const out = [];
  for (const node of program.body) {
    if (!/^(?:ImportDeclaration|ExportNamedDeclaration|ExportAllDeclaration)$/.test(node.type) || !node.source) continue;
    if (node.importKind === 'type' || node.exportKind === 'type') continue;
    const spec = node.source.value;
    if (typeof spec !== 'string' || !(spec.startsWith('./') || spec.startsWith('../'))) continue;
    const target = resolve(file, spec);
    assert.ok(target, `${rel(file)} imports missing ${spec}`);
    if (code.test(target) && target.startsWith(src + path.sep)) out.push(target);
  }
  edgesCache.set(file, out);
  return out;
}

// Every module reachable from `entry` (the entry included).
function closure(entry) {
  const seen = new Set([entry]), stack = [entry];
  while (stack.length) for (const next of edges(stack.pop())) if (!seen.has(next)) { seen.add(next); stack.push(next); }
  return seen;
}

// Tarjan's strongly connected components, iterative (the generated graph is deep).
function components(entry) {
  const index = new Map(), low = new Map(), onStack = new Set(), stack = [], result = [];
  let counter = 0;
  const visit = root => {
    const work = [[root, 0]];
    index.set(root, counter); low.set(root, counter); counter++; stack.push(root); onStack.add(root);
    while (work.length) {
      const frame = work[work.length - 1], [node] = frame, next = edges(node);
      if (frame[1] < next.length) {
        const child = next[frame[1]++];
        if (!index.has(child)) {
          index.set(child, counter); low.set(child, counter); counter++; stack.push(child); onStack.add(child);
          work.push([child, 0]);
        } else if (onStack.has(child)) low.set(node, Math.min(low.get(node), index.get(child)));
        continue;
      }
      work.pop();
      if (work.length) { const parent = work[work.length - 1][0]; low.set(parent, Math.min(low.get(parent), low.get(node))); }
      if (low.get(node) === index.get(node)) {
        const scc = [];
        for (let member; member !== node;) { member = stack.pop(); onStack.delete(member); scc.push(member); }
        result.push(scc);
      }
    }
  };
  visit(entry);
  return result;
}

const main = path.join(src, 'main.jsx');

test('from src/main.jsx no strongly connected component mixes view-tabs files with host .jsx modules', () => {
  const reachable = closure(main);
  // Not vacuous: the app does reach the generated graph, its facade and the host adapters it imports.
  assert.ok(reachable.has(facade), 'main.jsx reaches the view-tabs facade');
  for (const host of ['source-code-start-adapters.jsx', 'source-sessions-adapters.jsx', 'source-chat-adapters.jsx', 'source-menu.jsx'])
    assert.ok(reachable.has(path.join(src, host)), `main.jsx reaches ${host}`);
  const sccs = components(main);
  assert.equal(sccs.reduce((n, scc) => n + scc.length, 0), reachable.size);
  const mixed = sccs.filter(scc => scc.some(f => f.startsWith(viewTabs)) && scc.some(f => !f.startsWith(path.join(src, 'generated') + path.sep) && f.endsWith('.jsx')));
  assert.deepEqual(mixed.map(scc => scc.map(rel).sort()), [], 'an import cycle runs through view-tabs and host code');
  // The view-tabs graph itself is acyclic with respect to the host: no SCC containing a view-tabs file reaches outside it.
  for (const scc of sccs.filter(s => s.some(f => f.startsWith(viewTabs))))
    assert.ok(scc.every(f => f.startsWith(viewTabs)), scc.map(rel).join(', '));
  // Rows 18 / 21: neither end of the old cycle sits in a component with anything else.
  for (const host of ['source-menu.jsx', 'source-chat-adapters.jsx', 'source-code-start-adapters.jsx']) {
    const scc = sccs.find(s => s.includes(path.join(src, host)));
    assert.ok(!scc.some(f => f.startsWith(viewTabs)), `${host} shares a cycle with view-tabs: ${scc.map(rel).join(', ')}`);
  }
});

test('E41: the menu and chat adapter graphs never evaluate the view-tabs facade', () => {
  for (const host of ['source-menu.jsx', 'source-chat-adapters.jsx']) {
    const reach = closure(path.join(src, host));
    assert.ok(!reach.has(facade), `${host} reaches src/generated/view-tabs/index.js`);
    // source-menu.jsx still uses the CDS controls, from concrete view-tabs files (E41), so the check is not vacuous.
    // source-chat-adapters.jsx keeps only the ICU message registry since w10-cleanup-final removed its dead host
    // adapters: it reaches no view-tabs file at all (stronger than E41).
    if (host === 'source-menu.jsx') assert.ok([...reach].some(f => f.startsWith(viewTabs)), `${host} imports no view-tabs file`);
    else assert.ok(![...reach].some(f => f.startsWith(viewTabs)), `${host} reaches a view-tabs file`);
  }
  // The adapters the view-tabs graph imports must not reach the facade either (that would be the cycle itself).
  for (const host of ['source-code-start-adapters.jsx', 'source-sessions-adapters.jsx', 'source-view-tabs-adapters.jsx'])
    if (fs.existsSync(path.join(src, host))) assert.ok(!closure(path.join(src, host)).has(facade), `${host} reaches the view-tabs facade`);
});
