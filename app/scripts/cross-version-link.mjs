// Cross-version linking (R5-V1, round3-decisions.json userDecisions): a graph sliced from one official build (the claude.ai
// live web build d0407c9a7d) links a binding of an already generated graph sliced from another build (cds-core, 4.16336.0)
// only when the two declarations are proven equal here, at generation time, from the two frozen snapshots — never by a
// name, never by a table alone.
//
// Input: a reviewed candidate table (live chunk#local -> base chunk#local; scripts/<area>-crosslink-pins.json, written by the
// review tool, sha-pinned by the generator). A candidate is only a hypothesis. `equivalent(liveKey)` returns the base key when
// the pair is deep-equal:
//   - local equality: both declarations, parsed on their own with scope analysis, serialize to the same canonical text:
//     identifiers bound inside the declaration are numbered by first occurrence; the declaration's own name is SELF; a free
//     identifier is replaced by what it resolves to: a React alias of vendor-frame (by each build's own alias table:
//     react:<module>:<member>), a platform global (by name), or a top-level binding (followed through imports and
//     re-exports to its declaring chunk), which on the live side is written as its candidate base key (or live:<key> when it
//     has none, which never equals a base key). Parentheses and `var X = (function(…){…})` vs `function X(…){…}` are
//     normalized (the live minifier's form); everything else (literals, operators, property names, message ids) must match.
//   - deep equality: every pair reachable from it through the candidates of its references is locally equal (a greatest
//     fixpoint: cycles are fine, one unequal pair anywhere below makes every pair above it unequal).
// `candidate(liveKey)` returns the table's hypothesis whether proven or not: a live graph that slices a binding whose
// candidate another graph holds as module state would split that state (D1); runSlicer and the d1 gate use it for that.
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import babel from '../../tools/node_modules/playwright/lib/transform/babelBundle.js';

const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const SKIP = new Set(['start', 'end', 'loc', 'range', 'extra', 'leadingComments', 'trailingComments', 'innerComments', 'comments', 'tokens', 'errors']);

function parseChunk(dir, file) {
  const p = path.join(dir, file);
  if (!fs.existsSync(p)) return null;
  const bytes = fs.readFileSync(p), code = bytes.toString();
  const ast = babel.babelParse(code, file, true);
  const top = new Map(), exported = new Map();
  for (const node of ast.program.body) {
    if (node.type === 'ImportDeclaration') for (const s of node.specifiers)
      top.set(s.local.name, { kind: 'import', file: node.source.value.replace(/^\.\//, ''), alias: s.type === 'ImportNamespaceSpecifier' ? '*' : s.imported?.name ?? s.imported?.value ?? 'default' });
    else if (node.type === 'ExportNamedDeclaration' && !node.source) for (const s of node.specifiers ?? []) exported.set(s.exported.name ?? s.exported.value, s.local.name);
    else if (node.type === 'FunctionDeclaration' || node.type === 'ClassDeclaration') top.set(node.id.name, { kind: node.type === 'ClassDeclaration' ? 'class' : 'function', node, declKind: null });
    else if (node.type === 'VariableDeclaration') for (const d of node.declarations) {
      const names = [];
      babel.traverse.cheap?.(d.id, n => { if (n.type === 'Identifier') names.push(n.name); });
      if (!babel.traverse.cheap) (function walk(n) { if (!n || typeof n !== 'object') return; if (n.type === 'Identifier') names.push(n.name); for (const k of ['properties', 'elements', 'value', 'argument', 'left', 'key']) { const v = n[k]; if (Array.isArray(v)) v.forEach(walk); else if (v && typeof v === 'object' && !(k === 'key' && n.type === 'ObjectProperty' && !n.computed)) walk(v); } })(d.id);
      for (const id of new Set(names)) top.set(id, { kind: 'var', node: d, declKind: node.kind, pattern: d.id.type !== 'Identifier' });
    }
  }
  return { file, code, bytes, sha256: sha(bytes), top, exported };
}

export function createCrossVersionLinker({ live, base, candidates, label = 'cross-version' }) {
  // live / base: { source (chunk folder), reactAliases, vendorFrame }; candidates: Map | object liveKey -> baseKey.
  const cand = candidates instanceof Map ? candidates : new Map(Object.entries(candidates));
  const sides = { live, base };
  const chunks = { live: new Map(), base: new Map() };
  const chunkOf = (side, file) => {
    const m = chunks[side];
    if (!m.has(file)) m.set(file, parseChunk(sides[side].source, file));
    return m.get(file);
  };
  // A free name of `file` -> terminal token or { key } of its declaring chunk.
  const resolve = (side, file, name, depth = 0) => {
    const c = chunkOf(side, file);
    if (!c || depth > 12) return { token: `unresolved:${file}#${name}` };
    const e = c.top.get(name);
    if (!e) return { token: `global:${name}` };
    if (e.kind !== 'import') {
      // vendor-frame's own top-level React member (4.16 declares contexts inside vendor-frame: `C(void 0)` is createContext)
      if (file === sides[side].vendorFrame) for (const [alias, local] of c.exported) if (local === name && sides[side].reactAliases[alias]) {
        const react = sides[side].reactAliases[alias]; return { token: `react:${react[0]}:${react[1]}` };
      }
      return { key: `${file}#${name}` };
    }
    if (e.file === sides[side].vendorFrame) {
      const react = sides[side].reactAliases[e.alias];
      if (react) return { token: `react:${react[0]}:${react[1]}` };
    }
    const dep = chunkOf(side, e.file);
    if (!dep) return { token: `external:${e.file}:${e.alias}` };
    if (e.alias === '*') return { token: `namespace:${side === 'live' ? (cand.get(`${e.file}#*`) ?? `live:${e.file}`) : e.file}` };
    const local = dep.exported.get(e.alias);
    if (!local) return { token: `unexported:${e.file}:${e.alias}` };
    return resolve(side, e.file, local, depth + 1);
  };
  const localMemo = new Map();
  // Canonical text of one declaration plus the binding keys it references (on its own side).
  const canonical = (side, key) => {
    const memoKey = `${side}:${key}`;
    if (localMemo.has(memoKey)) return localMemo.get(memoKey);
    const [file, name] = key.split('#');
    const c = chunkOf(side, file), e = c?.top.get(name);
    if (!e || e.kind === 'import') { const r = { text: `missing:${key}`, refs: [] }; localMemo.set(memoKey, r); return r; }
    const node = e.node;
    let text = c.code.slice(node.start, node.end);
    if (e.kind === 'var') text = `${e.declKind} ${text};`;
    const ast = babel.babelParse(text, `${side}:${key}`, true);
    const names = new Map(); let n = 0; const refs = new Set();
    const tokenOf = new Map();
    babel.traverse(ast, {
      Identifier(p) {
        if (!p.isReferencedIdentifier() && !p.isBindingIdentifier()) return;
        const nm = p.node.name, b = p.scope.getBinding(nm);
        if (b && b.scope.block.type !== 'Program') { if (!names.has(b)) names.set(b, `L${++n}`); tokenOf.set(p.node, names.get(b)); return; }
        if (b && b.scope.block.type === 'Program') {
          // the declaration's own top-level name(s)
          if (nm === name || (e.pattern && c.top.get(nm)?.node === node)) { tokenOf.set(p.node, nm === name ? 'SELF' : `SELF.${nm}`); return; }
        }
        const r = resolve(side, file, nm);
        if (r.token) { tokenOf.set(p.node, r.token); return; }
        refs.add(r.key);
        tokenOf.set(p.node, { ref: r.key });
      },
    });
    let order;
    const ser = node => {
      if (node === null || node === undefined) return 'null';
      if (Array.isArray(node)) return `[${node.map(ser).join(',')}]`;
      if (typeof node !== 'object') return JSON.stringify(node);
      if (node.type === 'Identifier') {
        const t = tokenOf.get(node);
        if (t && typeof t === 'object') { order.push(t.ref); return '#ref'; }
        return t ? `#${t}` : `id:${node.name}`;
      }
      // live `var X = (function(…){…})` / `const X = function(…){…}` == base `function X(…){…}`
      if (node.type === 'VariableDeclaration' && node.declarations.length === 1) {
        const d = node.declarations[0];
        if (d.id.type === 'Identifier' && d.init?.type === 'FunctionExpression' && !d.init.id) return `fn(${ser(d.id)},${!!d.init.async},${!!d.init.generator},${ser(d.init.params)},${ser(d.init.body)})`;
      }
      if (node.type === 'FunctionDeclaration') return `fn(${ser(node.id)},${!!node.async},${!!node.generator},${ser(node.params)},${ser(node.body)})`;
      const keys = Object.keys(node).filter(k => !SKIP.has(k) && k !== 'type').sort();
      return `${node.type}{${keys.map(k => `${k}:${ser(node[k])}`).join(',')}}`;
    };
    const body = ast.program.body.length === 1 ? ast.program.body[0] : ast.program.body;
    order = [];
    const shape = ser(body);
    const r = { shape, order, refs: [...refs], text: shape + '|' + order.map(k => side === 'live' ? (cand.get(k) ?? `live:${k}`) : k).join(',') };
    localMemo.set(memoKey, r);
    return r;
  };
  const localEqual = new Map();
  const isLocalEqual = liveKey => {
    if (localEqual.has(liveKey)) return localEqual.get(liveKey);
    const baseKey = cand.get(liveKey);
    const ok = !!baseKey && canonical('live', liveKey).text === canonical('base', baseKey).text;
    localEqual.set(liveKey, ok);
    return ok;
  };
  const deep = new Map();
  // Deep equality: every candidate pair reachable through references is locally equal.
  const equivalentKey = liveKey => {
    if (deep.has(liveKey)) return deep.get(liveKey);
    if (!cand.has(liveKey)) { deep.set(liveKey, null); return null; }
    const seen = new Set([liveKey]), order = [liveKey];
    let bad = false;
    for (let i = 0; i < order.length && !bad; i++) {
      const k = order[i];
      if (deep.get(k) === null && deep.has(k)) { bad = true; break; }
      if (deep.has(k)) continue; // proven deep-equal earlier: its whole reachable set is
      if (!isLocalEqual(k)) { bad = true; break; }
      for (const r of canonical('live', k).refs) if (!seen.has(r)) {
        if (!cand.has(r)) { bad = true; break; }
        seen.add(r); order.push(r);
      }
    }
    if (bad) { deep.set(liveKey, null); return null; }
    for (const k of order) if (!deep.has(k)) deep.set(k, cand.get(k));
    return cand.get(liveKey);
  };
  // Bisimulation (the linking proof): live L ~ base B iff their shapes are equal and their i-th references are pairwise
  // bisimilar under one consistent mapping (greatest fixpoint; a failure anywhere below is a genuine difference and is
  // cached, a success is cached only once its top-level check succeeds with every assumption it made).
  // Identity-bearing declarations (module state and anything whose identity can be observed: a `var` initialized by a call,
  // `new`, an object / array / class / regexp literal, or with no initializer) are bisimilar only to their reviewed
  // counterpart: two equal `new Map` are two states. Functions, arrow functions and primitive literals carry no identity.
  const identityMemo = new Map();
  const identityBearing = (side, key) => {
    const mk = `${side}:${key}`;
    if (identityMemo.has(mk)) return identityMemo.get(mk);
    const [file, name] = key.split('#');
    const e = chunkOf(side, file)?.top.get(name);
    let r = false;
    if (e?.kind === 'class') r = true;
    else if (e?.kind === 'var') {
      const init = e.node.init;
      r = e.pattern || !init || !['FunctionExpression', 'ArrowFunctionExpression', 'StringLiteral', 'NumericLiteral', 'BooleanLiteral', 'NullLiteral', 'TemplateLiteral', 'UnaryExpression', 'BinaryExpression', 'Identifier', 'MemberExpression', 'BigIntLiteral'].includes(init.type)
        || (init.type === 'TemplateLiteral' && init.expressions.length > 0 && false);
      if (!r && init.type === 'MemberExpression') r = true; // a read off another binding at load time: keep identity
    }
    identityMemo.set(mk, r);
    return r;
  };
  const bisimNo = new Set(), bisimYes = new Map();
  const bisim = (l, b) => {
    const assume = new Map(), stack = [[l, b]];
    while (stack.length) {
      const [x, y] = stack.pop();
      if (bisimYes.get(x) === y) continue;
      if (assume.has(x)) { if (assume.get(x) !== y) return false; continue; }
      if (bisimNo.has(`${x}=${y}`)) return false;
      if ((identityBearing('live', x) || identityBearing('base', y)) && cand.get(x) !== y) { bisimNo.add(`${x}=${y}`); return false; }
      const cx = canonical('live', x), cy = canonical('base', y);
      if (cx.shape !== cy.shape || cx.order.length !== cy.order.length) { bisimNo.add(`${x}=${y}`); return false; }
      assume.set(x, y);
      for (let i = cx.order.length - 1; i >= 0; i--) stack.push([cx.order[i], cy.order[i]]);
    }
    for (const [x, y] of assume) bisimYes.set(x, y);
    return true;
  };
  // link(liveKey, linkable): the one base key among `linkable` (a Set of keys some graph publishes or holds) bisimilar to
  // the live declaration; null when none; throws when two distinct linkable declarations are (needs review).
  let shapeIndex = null, indexedFor = null;
  const link = (liveKey, linkable) => {
    if (indexedFor !== linkable) {
      shapeIndex = new Map();
      for (const k of linkable) { const s = canonical('base', k).shape; if (!shapeIndex.has(s)) shapeIndex.set(s, []); shapeIndex.get(s).push(k); }
      indexedFor = linkable;
    }
    if (bisimYes.has(liveKey) && linkable.has(bisimYes.get(liveKey))) return bisimYes.get(liveKey);
    const shape = canonical('live', liveKey).shape;
    const hits = (shapeIndex.get(shape) ?? []).filter(b => bisim(liveKey, b));
    if (hits.length > 1) {
      const preferred = cand.get(liveKey);
      if (preferred && hits.includes(preferred)) return preferred;
      // pure declarations (no identity, see identityBearing) are interchangeable: the reviewed counterpart when it is one
      // of them, else the first by key order (deterministic output)
      if (!identityBearing('live', liveKey)) return [...hits].sort()[0];
      return { ambiguous: hits };
    }
    return hits[0] ?? null;
  };
  return {
    label,
    link,
    bisim,
    candidate: liveKey => cand.get(liveKey) ?? null,
    equivalent: equivalentKey,
    localEqual: isLocalEqual,
    canonical,
    stats: () => ({ candidates: cand.size, decided: deep.size, equal: [...deep.values()].filter(Boolean).length }),
    sourceSha256: (side, file) => chunkOf(side, file)?.sha256 ?? null,
  };
}

// The reviewed candidate table: { schema, live, base, pairs: { liveKey: baseKey } } with its own sha256 pinned by the generator.
export function readCandidatePins(file) {
  const bytes = fs.readFileSync(file);
  const pins = JSON.parse(bytes.toString());
  if (pins.schema !== 'cross-version-candidates/1' || !pins.pairs || typeof pins.pairs !== 'object') throw Error(`${file}: not a cross-version candidate table`);
  for (const [l, b] of Object.entries(pins.pairs)) if (!/^[\w.-]+\.js#[\w$]+$/.test(l) || !/^[\w.-]+\.js#[\w$]+$/.test(b)) throw Error(`${file}: bad pair ${l} -> ${b}`);
  return { pins, sha256: sha(bytes), map: new Map(Object.entries(pins.pairs)) };
}
