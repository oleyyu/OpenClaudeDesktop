// Code current (base), 4.16336.0 contract (OpenClaude v0.3 -> Claude 4.16336.0, frozen snapshot
// reference/snapshots/claude-4.16336.0-20261104): the small source-owned helpers of src/generated/code-current, re-located in
// the 4.16336.0 chunks and sliced into the isolated graph src/generated/code-current-v4.
//
// Region plan (batch 3, code-current:base, large split): src/generated/code-current stays 3.6556.2, byte for byte, written by
// scripts/extract-code-ui-current.mjs (not changed here). Thirteen 3.6556.2 areas link it by original identity
// (cutover.oldConsumersAtGeneration: code-current:upper, code-transcript, files-changes, pierre-changes, session-rail,
// session-rail-changes, session-rail-kit, sessions-page, sidebar-hover-card, sidebar-reorder, sidebar-routines,
// sidebar-sections, transcript-rows), so this graph is staged next to it (productionSwitchNotBeforeBatch 11). The twelve
// "upper" modules (breadcrumb-file/-view, environment-delete-question, sessions-page-view, sidebar-filter-controls/-view,
// sidebar-nested-caret, terminal-action-bar, titlebar-folder-pill/-seed-latch/-spawn-lead/-spawn-origin) belong to
// code-current:upper (batch 7, its own output) and are not part of this contract. The eight 3.6556.2 targets written into
// electron/generated are emitted here as electron-<name>.mjs (manifest electronTargets names their production path; this
// area may not write electron/generated while staged).
//
// Engine (raw chunk text; prettier only formats the emitted modules):
//   - semantic modules (extract-code-current-v4-roots.mjs) keep the 3.6556.2 file names and export names. Every root is
//     pinned by its chunk export alias (`aliases`, null for a private root, which the chunk must not export), by loose
//     features of its own raw declaration (official-4.16336.0.mjs looseFeature: identifiers of at most three characters
//     generalised), and by uniqueness: the only top-level declaration of its chunk carrying them, or (`readBy`) the only
//     same-chunk dependency of a located root carrying them; `reads` adds features a same-chunk dependency of the root must
//     carry (two declarations of the same shape reading different constants). `select` roots are one expression of their
//     owner declaration (the 3.6556.2 sourceSelections: a whole conditional, or the init of a nested local), emitted as
//     `function <owner>(<parameters>) { return <fragment>; }`; every free name of the fragment is a top-level binding of the
//     chunk or a listed parameter.
//   - every binding reached from a root is the original top-level declaration, sliced once (D1): a same-chunk dependency
//     goes into the module that reaches it first; a binding of another chunk no module roots goes into that chunk's own
//     module (chunk-<chunk>.mjs). Nothing is hand-picked; every cross-chunk edge is the original import.
//   - an import resolves, in order, to: a host adapter (contract `adapters`, file:alias, its original pinned by features of
//     its same-chunk closure), the host answer cds-core gives the same import (cds-core manifest adapter imports), a React
//     export of vendor-frame (assertVendorAlias), a cds-core publicName (linked; its raw declaration hash equal to
//     cds-core's), an export of a linked 4.16336.0 area (linkedAreas; declaration hash equal), a root of a semantic module,
//     or a slice as above. A declaration answered by a host adapter (`localAdapters`, file#local, pinned by features) is
//     replaced by it.
//   - a binding cds-core holds without a publicName is sliced again only when pure and its raw declaration hashes as
//     cds-core's; module state (React context, module-level Map / Set / WeakMap / WeakSet, a module binding written
//     elsewhere) stops generation (D46) with stateConflicts {binding, kind, text, reachedBy}. Module state a linked area
//     holds without exporting it stops generation too (a second instance, D1).
//   - module state this graph holds that d1/wave5-candidates.json lists for cds-core's fifth wave is reported in the
//     manifest (d1Pending): it is held here only until cds-core publishes it.
//   - a top-level expression statement that assigns to a held binding or its members (the csv vendor's Buffer polyfill,
//     `_.from = function…`) is carried by that binding's module, in source order, with its own dependencies; one that
//     assigns bindings two modules hold stops generation (it would run twice). The manifest lists them (`initializers`).
//   - every emitted module is closed apart from `hostGlobals`; a dynamic import() inside a sliced declaration stops
//     generation unless a local adapter answers that declaration.
// No pin-refresh script exists: any drift (alias, feature, uniqueness, hash, linked graph bytes) stops generation.
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { parsers } from '../../tools/node_modules/prettier/plugins/babel.mjs';
import { format } from '../../tools/node_modules/prettier/index.mjs';
import babel from '../../tools/node_modules/playwright/lib/transform/babelBundle.js';
import * as official4 from './official-4.16336.0.mjs';
import { contract as rootsContract } from './extract-code-current-v4-roots.mjs';

const root = path.resolve(import.meta.dirname, '..');
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
export const CODE_CURRENT_V4_OUTPUT = 'src/generated/code-current-v4';

const featureRegExp = new Map();
const featureMatches = (text, f) => {
  const key = typeof f === 'string' ? f : JSON.stringify(f);
  if (!featureRegExp.has(key)) featureRegExp.set(key, official4.looseFeature(typeof f === 'string' ? f : f.loose, { keep: typeof f === 'string' ? [] : (f.keep ?? []) }));
  return featureRegExp.get(key).test(text);
};
function assertFeatures(label, text, features = []) {
  const missing = features.filter(f => !featureMatches(text, f));
  if (missing.length) throw Error(`${label} lacks ${missing.map(f => JSON.stringify(f)).join(', ')}`);
}

// Sources: `name` is an ion-dist chunk file name, or `asar/<file>` for the main-process build.
const sourcePath = name => name.startsWith('asar/') ? path.join(official4.asarSource, name.slice(5)) : path.join(official4.ionSource, name);
// A parsed chunk is reduced to a compact index (the babel AST of a large chunk holds hundreds of MB, and a closure walks
// back and forth between chunks): every top-level binding is an import {file, imported} or a declaration {start, end,
// deps, state, dynamicImport}. Only `select` roots re-parse their owner (fullDeclarationPath).
const sourceCacheSize = 64;
function moduleStateOf(program, p) {
  if (!p.isVariableDeclarator()) return null;
  const binding = program.scope.getBinding(p.node.id.name);
  if (binding?.constantViolations.length) return 'module-level binding written elsewhere';
  const init = p.node.init;
  if (init?.type === 'NewExpression' && init.callee.type === 'Identifier' && ['WeakMap', 'Map', 'Set', 'WeakSet'].includes(init.callee.name)) return `new ${init.callee.name}`;
  if (init?.type === 'CallExpression' && init.callee.type === 'Identifier') {
    const callee = program.scope.getBinding(init.callee.name)?.path;
    if (callee?.isImportSpecifier()) {
      const file = callee.parent.source.value.replace(/^\.\//, '');
      if (file === official4.vendorFrame && official4.reactAliases[callee.node.imported.name]?.[1] === 'createContext') return 'context';
    }
  }
  return null;
}
async function parseChunk(name) {
  const bytes = await fs.readFile(sourcePath(name));
  const text = bytes.toString();
  const ast = parsers.babel.parse(text, {});
  let program;
  babel.traverse(ast, { Program(p) { program = p; } });
  return { bytes, text, ast, program };
}
async function readSource(name, cache) {
  if (cache.has(name)) { const hit = cache.get(name); cache.delete(name); cache.set(name, hit); return hit; }
  while (cache.size >= sourceCacheSize) cache.delete(cache.keys().next().value);
  if (process.env.CODE_CURRENT_V4_TRACE) console.error(`read ${name} (heap ${Math.round(process.memoryUsage().heapUsed / 1e6)}MB)`);
  const { bytes, text, ast, program } = await parseChunk(name);
  const exported = new Map(), exportOf = new Map();
  for (const n of ast.program.body) if (n.type === 'ExportNamedDeclaration' && !n.source) for (const s of n.specifiers) {
    const alias = s.exported.name ?? s.exported.value;
    exported.set(alias, s.local.name);
    if (!exportOf.has(s.local.name)) exportOf.set(s.local.name, []);
    exportOf.get(s.local.name).push(alias);
  }
  // Every reference (and write) of a top-level binding by position, for declaration dependencies.
  const refs = [], dynamicImports = [];
  for (const [n, b] of Object.entries(program.scope.bindings)) for (const q of [...b.referencePaths, ...b.constantViolations]) refs.push([q.node.start, n]);
  refs.sort((x, y) => x[0] - y[0]);
  babel.traverse(ast, { Import(q) { dynamicImports.push(q.node.start); }, ImportExpression(q) { dynamicImports.push(q.node.start); } });
  const dir = name.startsWith('asar/') ? 'asar/' : '';
  const record = { name, dir, text, exported, exportOf, refs, sourceSha256: sha(bytes), bindings: new Map() };
  for (const [n, b] of Object.entries(program.scope.bindings)) {
    const p = b.path;
    if (p.isImportSpecifier() || p.isImportDefaultSpecifier() || p.isImportNamespaceSpecifier())
      record.bindings.set(n, { kind: 'import', name: n, specifier: p.node.type, file: p.parent.source.value, imported: p.isImportSpecifier() ? (p.node.imported.name ?? p.node.imported.value) : null });
    else if (p.isFunctionDeclaration() || p.isVariableDeclarator() || p.isClassDeclaration()) {
      const { start, end } = p.node;
      record.bindings.set(n, { kind: 'decl', name: n, start, end, isVar: p.isVariableDeclarator(), state: moduleStateOf(program, p),
        dynamicImport: dynamicImports.some(at => at >= start && at < end) });
    } else record.bindings.set(n, { kind: 'other', name: n });
  }
  for (const d of record.bindings.values()) if (d.kind === 'decl') d.deps = depsIn(record, d.start, d.end).filter(x => x !== d.name);
  // Top-level expression statements that assign to a top-level binding or one of its members (the csv vendor's Buffer
  // polyfill: `_.from = function…`, `_.prototype.toString = …`): carried with the binding (as extract-working-line.mjs does).
  record.statements = [];
  for (const n of ast.program.body) {
    if (n.type !== 'ExpressionStatement') continue;
    const assigned = new Set();
    const visitAssign = e => {
      if (!e || typeof e !== 'object') return;
      if (e.type === 'SequenceExpression') e.expressions.forEach(visitAssign);
      else if (e.type === 'LogicalExpression') { visitAssign(e.left); visitAssign(e.right); }
      else if (e.type === 'AssignmentExpression') {
        let left = e.left;
        while (left.type === 'MemberExpression') left = left.object;
        if (left.type === 'Identifier' && record.bindings.has(left.name)) assigned.add(left.name);
        else if (left.type === 'AssignmentExpression') visitAssign(left);
        visitAssign(e.right);
      }
    };
    visitAssign(n.expression);
    if (assigned.size) record.statements.push({ start: n.start, end: n.end, assigned: [...assigned], deps: depsIn(record, n.start, n.end) });
  }
  cache.set(name, record);
  return record;
}
// The babel path of a top-level declaration, re-parsed (select roots only; never cached).
async function fullDeclarationPath(name, local) {
  const { program } = await parseChunk(name);
  return program.scope.getBinding(local)?.path;
}
const lowerBound = (refs, at) => { let lo = 0, hi = refs.length; while (lo < hi) { const mid = (lo + hi) >> 1; if (refs[mid][0] < at) lo = mid + 1; else hi = mid; } return lo; };
function depsIn(src, start, end) {
  const out = new Set();
  for (let i = lowerBound(src.refs, start); i < src.refs.length && src.refs[i][0] < end; i++) out.add(src.refs[i][1]);
  return [...out];
}
const getBinding = (src, name) => src.bindings.get(name);
const declarationText = (src, d) => src.text.slice(d.start, d.end);
const declarationDeps = (src, d) => d.deps;
const isDeclaration = d => d?.kind === 'decl';
// The same-chunk closure text of a binding (imports are not followed): what adapter features are matched against.
function closureText(src, name) {
  const seen = new Set(), parts = [];
  const visit = n => {
    if (seen.has(n)) return;
    seen.add(n);
    const d = getBinding(src, n);
    if (!isDeclaration(d)) return;
    parts.push(declarationText(src, d));
    for (const dep of d.deps) visit(dep);
  };
  visit(name);
  return parts.join('\n');
}
const topDeclarations = src => [...src.bindings].filter(([, d]) => isDeclaration(d));
const importTarget = (src, d) => `${src.dir}${d.file.replace(/^\.\//, '')}`;

// sharedGraph 'cds-core': version, snapshot, every module's bytes and source hash, every publicName exported by its module.
async function cdsCoreGraph(contract) {
  const area = contract.sharedGraph, dir = path.join(root, 'src/generated', area);
  const manifestBytes = await fs.readFile(path.join(dir, 'manifest.json'));
  const manifest = JSON.parse(manifestBytes);
  if (manifest.referenceVersion !== official4.referenceVersion) throw Error(`${area} is ${manifest.referenceVersion}, expected ${official4.referenceVersion}`);
  if (manifest.referenceSnapshot !== official4.referenceSnapshot) throw Error(`${area} snapshot is ${manifest.referenceSnapshot}, expected ${official4.referenceSnapshot}`);
  const byTarget = new Map(), held = new Map(), published = new Map(), byName = new Map(), adapters = new Map(), aliasAdapters = new Map();
  for (const m of manifest.modules) {
    if ((m.referenceVersion ?? manifest.referenceVersion) !== official4.referenceVersion) throw Error(`shared module ${area}/${m.target} is ${m.referenceVersion}`);
    if (sha(await fs.readFile(path.join(dir, m.target))) !== m.sha256) throw Error(`${area}/${m.target} differs from its manifest`);
    const bytes = await fs.readFile(path.join(official4.ionSource, path.basename(m.source))).catch(() => null);
    if (!bytes || sha(bytes) !== m.sourceSha256) throw Error(`${area}/${m.target} was sliced from other ${m.source} bytes`);
    byTarget.set(m.target, m);
    for (const b of m.bindings) held.set(`${path.basename(m.source)}#${typeof b === 'string' ? b : b.name}`, { target: m.target, sha256: typeof b === 'string' ? null : b.sha256 });
    for (const i of m.imports ?? []) if (i.kind === 'adapter' && /#/.test(i.via ?? '')) adapters.set(i.via, { from: i.from, name: i.name });
    for (const i of m.imports ?? []) if (i.kind === 'adapter' && /^[^#]+:[^:#]+$/.test(i.via ?? '')) {
      const seen = aliasAdapters.get(i.via);
      if (seen && (seen.from !== i.from || seen.name !== i.name)) throw Error(`${area}: ${i.via} is answered by two host adapters`);
      aliasAdapters.set(i.via, { from: i.from, name: i.name, original: i.original });
    }
  }
  for (const [name, entry] of Object.entries(manifest.publicNames ?? {})) {
    const m = byTarget.get(entry.target);
    const exported = m && (m.exports?.[entry.local] ?? (m.sharedExports?.includes(entry.local) ? entry.local : null));
    if (!m || path.basename(m.source) !== entry.file || !m.bindings.some(b => (typeof b === 'string' ? b : b.name) === entry.local) || !entry.exportName || exported !== entry.exportName)
      throw Error(`${area} publicName ${name} (${entry.file}#${entry.local}) is not exported by ${entry.target} as ${entry.exportName}`);
    published.set(`${entry.file}#${entry.local}`, { name, ...entry });
    byName.set(name, { name, ...entry });
  }
  return { area, held, published, byName, adapters, aliasAdapters, manifestSha256: sha(manifestBytes) };
}

// A 4.16336.0 area this graph links (D1: the dependency region holds the binding, one instance): same version and
// snapshot; every module cut from the very chunk bytes read here and equal to its manifest. Its exported bindings are
// linked (declaration hash equal, raw or as that area recorded it), never cut again; a binding it holds without exporting
// is cut again only when pure and its declaration hashes equal, module state stops generation.
async function linkedArea(contract, area, cache) {
  const dir = path.join(root, 'src/generated', area);
  const manifestBytes = await fs.readFile(path.join(dir, 'manifest.json'));
  const manifest = JSON.parse(manifestBytes);
  if (manifest.referenceVersion !== official4.referenceVersion || manifest.referenceSnapshot !== official4.referenceSnapshot)
    throw Error(`${area} is ${manifest.referenceVersion} (${manifest.referenceSnapshot}), expected ${official4.referenceVersion}`);
  const exported = new Map(), held = new Map(), modules = {};
  for (const m of manifest.modules) {
    if (!m.source) continue;
    const bytes = await fs.readFile(sourcePath(path.basename(m.source))).catch(() => null);
    if (!bytes || sha(bytes) !== m.sourceSha256) throw Error(`${area} ${m.target} was cut from other ${m.source} bytes`);
    const out = await fs.readFile(path.join(dir, m.target));
    if (sha(out) !== m.sha256) throw Error(`${area} ${m.target} differs from its manifest`);
    modules[m.target] = m.sha256;
    // The module's own export statements (areas such as routines-shared-v4 record only publicNames in their manifest; the
    // chunk modules export their held bindings to each other): exported name by local.
    const fileExports = new Map();
    for (const n of babel.babelParse(out.toString(), m.target, true).program.body)
      if (n.type === 'ExportNamedDeclaration' && !n.source) for (const sp of n.specifiers) if (!fileExports.has(sp.local.name)) fileExports.set(sp.local.name, sp.exported.name ?? sp.exported.value);
    for (const b of m.bindings ?? []) {
      const name = typeof b === 'string' ? b : b.name, sum = typeof b === 'string' ? null : b.sha256;
      held.set(`${path.basename(m.source)}#${name}`, { area, target: m.target, sha256: sum });
      const exportName = m.exports?.[name] ?? (m.sharedExports?.includes(name) ? name : null) ?? fileExports.get(name) ?? null;
      if (exportName) exported.set(`${path.basename(m.source)}#${name}`, { area, target: m.target, name: exportName, sha256: sum });
    }
  }
  return { area, exported, held, modules, manifestSha256: sha(manifestBytes) };
}
// A linked area records a binding's hash over its raw declaration or over its prettier-formatted declaration.
const declarationHashes = async text => [sha(text),
  sha(await format(`var ${text};`, { parser: 'babel' }).then(t => t.replace(/^var /, '').replace(/;\n$/, '')).catch(() => '')),
  sha(await format(text, { parser: 'babel' }).catch(() => '')), sha(await format(text, { parser: 'babel' }).then(t => t.replace(/\n$/, '')).catch(() => ''))];

// Survey only (never part of generation): bindings this graph cuts that another 4.16336.0 area also holds.
async function otherV4Areas(contract, self, linked) {
  const base = path.join(root, 'src/generated'), held = new Map();
  for (const area of (await fs.readdir(base)).sort()) {
    if (area === contract.sharedGraph || area === self || linked.includes(area)) continue;
    const manifest = await fs.readFile(path.join(base, area, 'manifest.json'), 'utf8').then(JSON.parse).catch(() => null);
    if (manifest?.referenceVersion !== official4.referenceVersion) continue;
    for (const m of manifest.modules ?? []) if (m.source) for (const b of m.bindings ?? []) {
      const key = `${path.basename(m.source)}#${typeof b === 'string' ? b : b.name}`;
      held.set(key, [...(held.get(key) ?? []), `${area}/${m.target}`]);
    }
  }
  return held;
}

// Module state a second copy would split (D46 / D1): moduleStateOf (a React context from vendor-frame createContext, a
// module-level WeakMap / Map / Set / WeakSet, or a module binding some declaration writes), recorded in the chunk index.
const chunkModuleName = file => `chunk-${file.startsWith('asar/') ? 'asar-' : ''}${(/^(shared-[^-]+|vendor-[a-z]+(?:-[a-z]+)*?|[^-]+)-/.exec(path.basename(file)) ?? [, path.basename(file).replace(/\.js$/, '')])[1]}.mjs`;

// A `select` root: one expression of its owner declaration (3.6556.2 selectBinding: `conditional` + whole, or the init of
// a nested `local` (direct, initType)). Returns the fragment's text and the top-level names it reads.
function selectFragment(src, label, ownerPath, select) {
  const matches = [];
  ownerPath.traverse({
    ConditionalExpression(q) { if (select.conditional !== undefined && src.text.slice(q.node.test.start, q.node.test.end) === select.conditional) matches.push(q); },
    VariableDeclarator(q) { if (select.local !== undefined && q.node.id.name === select.local && (!select.initType || q.node.init?.type === select.initType)) matches.push(q.get('init')); },
  });
  if (matches.length !== 1) throw Error(`${label}: select ${JSON.stringify(select)} matches ${matches.length} expressions`);
  const q = matches[0], text = src.text.slice(q.node.start, q.node.end);
  const parameters = select.parameters.split(',').map(s => s.trim()).filter(Boolean);
  if (parameters.some(n => !/^[A-Za-z_$][\w$]*$/.test(n))) throw Error(`${label}: select parameters must be plain names`);
  const free = new Set(), program = new Set();
  q.traverse({
    Identifier(r) {
      if (!r.isReferencedIdentifier()) return;
      const name = r.node.name, binding = r.scope.getBinding(name);
      if (!binding) return; // a global
      const inside = binding.path.node.start >= q.node.start && binding.path.node.end <= q.node.end;
      if (inside) return;
      if (parameters.includes(name)) return;
      if (binding.scope === q.scope.getProgramParent()) program.add(name); else free.add(name);
    },
  });
  if (free.size) throw Error(`${label}: select reads owner locals ${[...free].join(', ')} that are not parameters`);
  return { text, deps: [...program], parameters, fragmentSha256: sha(text) };
}

// A `pick` select root: an object of property values read from the object literal its owner variable is initialised with
// (3.6556.2 pins of shared-1 LV.<key>.shortcut.bindings): { exportKey: 'a.b.c' } follows plain keys only, and every picked
// value is closed apart from top-level bindings of the chunk.
function pickFragments(src, label, ownerPath, pick) {
  if (!ownerPath.isVariableDeclarator() || ownerPath.node.init?.type !== 'ObjectExpression') throw Error(`${label}: pick needs an object literal declaration`);
  const entries = [], deps = new Set(), texts = [];
  for (const [key, dotted] of Object.entries(pick)) {
    let q = ownerPath.get('init');
    for (const part of dotted.split('.')) {
      if (q.node.type !== 'ObjectExpression') throw Error(`${label}: pick ${dotted} reaches a ${q.node.type} before ${part}`);
      const props = q.get('properties').filter(r => r.isObjectProperty() && !r.node.computed && (r.node.key.name ?? r.node.key.value) === part);
      if (props.length !== 1) throw Error(`${label}: pick ${dotted} finds ${props.length} properties ${part}`);
      q = props[0].get('value');
    }
    q.traverse({
      Identifier(r) {
        if (!r.isReferencedIdentifier()) return;
        const binding = r.scope.getBinding(r.node.name);
        if (!binding) return;
        if (binding.path.node.start >= q.node.start && binding.path.node.end <= q.node.end) return;
        if (binding.scope !== q.scope.getProgramParent()) throw Error(`${label}: pick ${dotted} reads local ${r.node.name}`);
        deps.add(r.node.name);
      },
    });
    const text = src.text.slice(q.node.start, q.node.end);
    entries.push([key, text]); texts.push(`${key}=${text}`);
  }
  return { entries, deps: [...deps], fragmentSha256: sha(texts.join('\n')) };
}

// `survey`: resolve everything and return stateConflicts / problems / overlaps instead of throwing or writing.
export async function extractCodeCurrentV4({ check = false, dry = false, survey = false, contract = rootsContract } = {}) {
  const output = path.join(root, contract.output ?? CODE_CURRENT_V4_OUTPUT), label = contract.label;
  if (contract.output && survey === false && check === false && dry === false && contract !== rootsContract && !contract.allowWrite) throw Error('A test contract never writes');
  const cache = new Map();
  const graph = await cdsCoreGraph(contract);
  const linkedAreas = [];
  for (const area of contract.linkedAreas ?? []) linkedAreas.push(await linkedArea(contract, area, cache));
  const linkedExport = key => linkedAreas.map(a => a.exported.get(key)).find(Boolean);
  const linkedHeld = key => linkedAreas.map(a => a.held.get(key)).find(Boolean);
  const sharedFrame = await readSource(official4.sharedFrame, cache);
  official4.assertCompilerHelpers(sharedFrame.text);
  const wave5 = new Map((contract.d1Wave5 ?? []).map(c => [c.binding, c]));

  const modules = new Map(), order = [];
  const newModule = (spec, kind) => {
    const m = { spec, kind, target: spec.target, source: spec.source, selected: new Map(), imports: new Map(), seen: new Set(),
      rootNames: new Map(Object.entries(spec.exports ?? {})), reexports: new Set(), extraExports: new Set(), heldByCdsCore: [], heldByLinked: [], selections: [], initializers: new Map() };
    if (modules.has(m.target)) throw Error(`${m.target} is declared twice`);
    modules.set(m.target, m); order.push(m);
    return m;
  };
  const rootOwner = new Map(), holder = new Map(), parent = new Map(), stateConflicts = [], problems = [], d1Pending = [], graphEdges = {};
  const edge = (from, to) => { if (survey) (graphEdges[from] ??= []).push(to); };
  const exportFrom = (m, local) => m.rootNames.get(local) ?? (m.extraExports.add(local), local);
  const reachedBy = key => { const chain = []; for (let k = key; k && chain.length < 12; k = parent.get(k)) chain.push(k); return chain.join(' <- '); };
  const fail = message => { if (survey) problems.push(message); else throw Error(message); };
  const sharedImport = (file, local, text, via) => {
    const shared = graph.published.get(`${file}#${local}`);
    if (!shared) return null;
    const held = graph.held.get(`${file}#${local}`);
    if (!held?.sha256 || held.sha256 !== sha(text)) throw Error(`${file}#${local} differs from the declaration ${graph.area} publishes as ${shared.name}`);
    return { from: `../${graph.area}/${shared.target}`, name: shared.exportName, via, kind: 'shared-graph', original: local, linkedSha256: held.sha256 };
  };
  const linkedImport = async (key, local, text, via) => {
    const l = linkedExport(key);
    if (!l) return null;
    if (l.sha256 && !(await declarationHashes(text)).includes(l.sha256)) throw Error(`${key} differs from the declaration ${l.area}/${l.target} exports`);
    return { from: `../${l.area}/${l.target}`, name: l.name, via, kind: 'linked', original: local, linkedSha256: l.sha256 };
  };

  // Phase 1: claim and locate every root of the semantic modules (every failure is reported, then generation stops).
  const locateErrors = [];
  for (const spec of contract.modules) {
    const m = newModule(spec, 'semantic');
    if (!spec.source) { if (Object.keys(spec.exports ?? {}).length) locateErrors.push(`${spec.target}: roots without a source chunk`); continue; }
    const src = await readSource(spec.source, cache);
    try { assertFeatures(`${spec.target}: chunk ${spec.source}`, src.text, spec.chunkFeatures); } catch (e) { locateErrors.push(e.message); }
    for (const [local, name] of Object.entries(spec.exports ?? {})) try {
      const binding = getBinding(src, local);
      if (!isDeclaration(binding)) throw Error(`${spec.target}: root ${local} (${name}) is not a top-level declaration of ${spec.source}`);
      const alias = spec.aliases?.[local];
      if (alias === undefined) throw Error(`${spec.target}: root ${local} names no export alias (null for a private root)`);
      if (alias !== null && src.exported.get(alias) !== local) throw Error(`${spec.target}: ${spec.source} exports ${alias} as ${src.exported.get(alias) ?? 'nothing'}, not ${local} (${name})`);
      if (alias === null && src.exportOf.has(local)) throw Error(`${spec.target}: private root ${local} (${name}) is exported by ${spec.source} as ${src.exportOf.get(local).join(', ')}`);
      const features = spec.features?.[local];
      if (!features?.length) throw Error(`${spec.target}: root ${local} has no features`);
      const text = declarationText(src, binding);
      assertFeatures(`${spec.target}: root ${local} (${name})`, text, features);
      const reads = spec.reads?.[local] ?? [];
      const readsOk = p => reads.every(fs => declarationDeps(src, p).some(d => { const q = getBinding(src, d); return isDeclaration(q) && fs.every(f => featureMatches(declarationText(src, q), f)); }));
      const readBy = spec.readBy?.[local];
      const pool = readBy ? declarationDeps(src, isDeclaration(getBinding(src, readBy)) ? getBinding(src, readBy) : (() => { throw Error(`${spec.target}: readBy ${readBy} is not a declaration`); })())
        .map(n => [n, getBinding(src, n)]).filter(([, b]) => isDeclaration(b)) : topDeclarations(src);
      const usedIn = spec.usedIn?.[local];
      if (usedIn) {
        const reader = getBinding(src, usedIn.by);
        if (!reader || !isDeclaration(reader) || !declarationDeps(src, reader).includes(local)) throw Error(`${spec.target}: root ${local} (${name}) is not read by ${usedIn.by}`);
        assertFeatures(`${spec.target}: reader ${usedIn.by} of ${local} (${name})`, declarationText(src, reader), (usedIn.features ?? []).map(f => (typeof f === 'string' ? { loose: f, keep: [local] } : { ...f, keep: [...new Set([...(f.keep ?? []), local])] })));
      }
      // uniqueBy 'alias': an exported root whose shape repeats in its chunk (generic helpers) is pinned by its export alias
      // plus its features; 'reader': by the usedIn reader feature that names it (keep) plus its features.
      const uniqueBy = spec.uniqueBy?.[local];
      if (uniqueBy === 'alias' && alias === null) throw Error(`${spec.target}: root ${local} (${name}) is unique by alias but private`);
      if (uniqueBy === 'reader' && !usedIn?.features?.length) throw Error(`${spec.target}: root ${local} (${name}) is unique by reader without usedIn features`);
      if (uniqueBy !== undefined && uniqueBy !== 'alias' && uniqueBy !== 'reader') throw Error(`${spec.target}: root ${local} uniqueBy ${uniqueBy}`);
      const hits = pool.filter(([, b]) => features.every(f => featureMatches(declarationText(src, b), f)) && readsOk(b)).map(([n]) => n);
      if (uniqueBy ? !hits.includes(local) : (hits.length !== 1 || hits[0] !== local))
        throw Error(`${spec.target}: root ${local} (${name}) is not the unique ${readBy ? `dependency of ${readBy}` : 'declaration'} with its features (${hits.slice(0, 8).join(', ') || 'none'})`);
      const key = `${spec.source}#${local}`;
      if (rootOwner.has(key)) throw Error(`${spec.target}: root ${key} is already a root of ${rootOwner.get(key).target}`);
      if (graph.published.has(key)) throw Error(`${spec.target}: root ${key} is the cds-core publicName ${graph.published.get(key).name}; re-export it instead`);
      if (linkedExport(key)) m.reexports.add(local);
      if (spec.select?.[local]) m.selections.push(local);
      rootOwner.set(key, m);
    } catch (e) { locateErrors.push(e.message); }
  }
  if (locateErrors.length) throw Error(`${label}: ${locateErrors.length} root / feature failures:\n  ${locateErrors.join('\n  ')}`);

  // Phase 2: slice the closures.
  const resolveDecl = async (file, local, via, from, electron) => {
    const key = `${file}#${local}`;
    const owner = rootOwner.get(key);
    if (owner) {
      if (owner.selections.includes(local)) fail(`${key} is a select root of ${owner.target}, but ${from} reads the whole declaration (${reachedBy(from)})`);
      return { module: owner, name: exportFrom(owner, local), kind: 'generated' };
    }
    const src = await readSource(file, cache);
    const p = getBinding(src, local);
    if (isDeclaration(p)) {
      const text = declarationText(src, p);
      const shared = sharedImport(file, local, text, via);
      if (shared) return shared;
      const linked = await linkedImport(key, local, text, via);
      if (linked) return linked;
    }
    const replaced = graph.adapters.get(key) ?? (contract.localAdapters?.[key] && { ...contract.localAdapters[key], local: true });
    if (replaced) {
      if (replaced.local) { assertFeatures(`local adapter ${key}`, declarationText(src, p), replaced.features); return { from: replaced.module, name: replaced.name, via: key, kind: 'adapter', original: local }; }
      return { from: replaced.from, name: replaced.name, via: key, kind: 'adapter', original: local, sameAs: graph.area };
    }
    const held = holder.get(key);
    if (held) return { module: held, name: exportFrom(held, local), kind: 'generated' };
    // Bindings an electron target reaches first live in their own chunk modules (chunk-electron-*), so the main-process
    // closure is checked binding by binding, not through a web chunk module's other imports.
    const target = electron ? chunkModuleName(file).replace(/^chunk-/, 'chunk-electron-') : chunkModuleName(file);
    const m = modules.get(target) ?? newModule({ target, source: file, ...(electron ? { electronChunk: true } : {}) }, 'chunk');
    if (m.source !== file) throw Error(`${target} would hold bindings of ${m.source} and ${file}`);
    if (!parent.has(key)) parent.set(key, from);
    await visit(m, local, from);
    if (!m.selected.has(local) && !m.imports.has(local)) throw Error(`${key} was not sliced`);
    if (m.imports.has(local)) return { ...m.imports.get(local), via };
    return { module: m, name: exportFrom(m, local), kind: 'generated' };
  };
  const visit = async (m, name, from) => {
    if (m.seen.has(name)) return;
    m.seen.add(name);
    const src = await readSource(m.source, cache);
    const key = `${m.source}#${name}`;
    if (!parent.has(key)) parent.set(key, from);
    const binding = getBinding(src, name);
    if (!binding) throw Error(`${m.target}: unbound ${name}`);
    const p = binding;
    if (p.kind === 'import') {
      if (p.specifier !== 'ImportSpecifier') throw Error(`${m.target}: unsupported import of ${name} in ${m.source}`);
      const file = importTarget(src, p), alias = p.imported, via = `${file}:${alias}`;
      const adapter = m.spec.adapters?.[file]?.[alias] ?? contract.adapters?.[file]?.[alias];
      if (adapter) {
        const dep = await readSource(file, cache);
        const local = dep.exported.get(alias);
        if (!local) throw Error(`${m.target}: adapter alias ${via} is no longer exported`);
        assertFeatures(`${m.target}: adapter ${via} (${local})`, closureText(dep, local), adapter.features);
        m.imports.set(name, { from: adapter.module, name: adapter.name, via, kind: 'adapter', original: local });
        return;
      }
      const hostAnswer = graph.aliasAdapters.get(via);
      if (hostAnswer) {
        const dep = await readSource(file, cache);
        if (dep.exported.get(alias) !== hostAnswer.original) throw Error(`${m.target}: ${via} is ${dep.exported.get(alias) ?? 'not exported'}, not the ${hostAnswer.original} ${graph.area} answers by ${hostAnswer.name}`);
        m.imports.set(name, { from: hostAnswer.from, name: hostAnswer.name, via, kind: 'adapter', original: hostAnswer.original, sameAs: graph.area });
        return;
      }
      if (file === official4.vendorFrame && official4.reactAliases[alias]) {
        const dep = await readSource(file, cache);
        const { module, member } = official4.assertVendorAlias(dep.text, alias);
        m.imports.set(name, { from: module, name: member, via, kind: 'react' });
        return;
      }
      const dep = await readSource(file, cache);
      const local = dep.exported.get(alias);
      if (!local) throw Error(`${m.target}: ${file} does not export ${alias}`);
      edge(key, `${file}#${local}`);
      const r = await resolveDecl(file, local, via, key, !!(m.spec.electron || m.spec.electronChunk));
      m.imports.set(name, r.module ? { from: `./${r.module.target}`, name: r.name, via, kind: 'generated', original: local } : { ...r, via });
      return;
    }
    if (!isDeclaration(p)) throw Error(`${m.target}: unsupported declaration ${name} in ${m.source}`);
    const owner = rootOwner.get(key);
    if (owner && owner !== m) {
      if (owner.selections.includes(name)) fail(`${key} is a select root of ${owner.target}, but ${from} reads the whole declaration (${reachedBy(from)})`);
      m.imports.set(name, { from: `./${owner.target}`, name: exportFrom(owner, name), via: key, kind: 'generated', original: name }); return;
    }
    const text = declarationText(src, p);
    const shared = sharedImport(m.source, name, text, key);
    if (shared) { m.imports.set(name, shared); return; }
    const linked = await linkedImport(key, name, text, key);
    if (linked) { m.imports.set(name, linked); return; }
    const local = contract.localAdapters?.[key];
    if (local) {
      assertFeatures(`${m.target}: local adapter ${key}`, text, local.features);
      m.imports.set(name, { from: local.module, name: local.name, via: key, kind: 'adapter', original: name });
      return;
    }
    const replaced = graph.adapters.get(key);
    if (replaced) { m.imports.set(name, { from: replaced.from, name: replaced.name, via: key, kind: 'adapter', original: name, sameAs: graph.area }); return; }
    const held = holder.get(key);
    if (held && held !== m) { m.imports.set(name, { from: `./${held.target}`, name: exportFrom(held, name), via: key, kind: 'generated', original: name }); return; }
    const state = p.state;
    const cds = graph.held.get(key);
    if (cds) {
      if (state) {
        stateConflicts.push({ binding: key, heldBy: `${graph.area}/${cds.target}`, kind: state, text: text.slice(0, 160), reachedBy: reachedBy(key) });
        if (!survey) throw Error(`module state ${graph.area} holds without a publicName (D46): ${m.target}: ${key} (${state}); reached by ${reachedBy(key)}`);
      } else if (cds.sha256 !== sha(text)) fail(`${m.target}: ${key} differs from the declaration ${graph.area}/${cds.target} holds`);
      else m.heldByCdsCore.push(name);
    }
    const lheld = linkedHeld(key);
    if (lheld) {
      if (state && wave5.has(key)) m.heldByLinked.push(name); // a second copy until cds-core's fifth wave publishes it (d1Pending below)
      else if (state) fail(`${m.target}: module state ${key} (${state}) is held by ${lheld.area}/${lheld.target} without an export; a second copy would split it (D1)`);
      else if (lheld.sha256 && !(await declarationHashes(text)).includes(lheld.sha256)) fail(`${m.target}: ${key} differs from the declaration ${lheld.area}/${lheld.target} holds`);
      else m.heldByLinked.push(name);
    }
    if (state && wave5.has(key)) d1Pending.push({ binding: key, module: m.target, kind: state, wave5Action: wave5.get(key).action, suggestedName: wave5.get(key).suggestedName,
      ...(lheld ? { alsoHeldBy: `${lheld.area}/${lheld.target}` } : {}) });
    holder.set(key, m);
    let emitted = text, deps;
    const select = owner === m && m.spec.select?.[name];
    if (select?.pick) {
      const f = pickFragments(src, `${m.target}: ${name}`, await fullDeclarationPath(m.source, name), select.pick);
      emitted = `${name} = { ${f.entries.map(([k, t]) => `${JSON.stringify(k)}: ${t}`).join(', ')} }`;
      deps = f.deps;
      m.selections.push({ binding: name, pick: select.pick, fragmentSha256: f.fragmentSha256 });
    } else if (select) {
      const f = selectFragment(src, `${m.target}: ${name}`, await fullDeclarationPath(m.source, name), select);
      emitted = `function ${name}(${f.parameters.join(', ')}) { return ${f.text}; }`;
      deps = f.deps;
      m.selections.push({ binding: name, ...Object.fromEntries(Object.entries(select).filter(([k]) => k !== 'parameters')), parameters: select.parameters, fragmentSha256: f.fragmentSha256 });
    } else deps = declarationDeps(src, p);
    m.selected.set(name, { start: p.start, text: emitted, isVar: p.isVar && !(select && !select.pick), state, sha256: sha(emitted) });
    if (p.dynamicImport && !select) fail(`${m.target}: dynamic import inside ${name} (${reachedBy(key)})`);
    for (const dep of deps) { edge(key, `${m.source}#${dep}`); await visit(m, dep, key); }
  };
  // Electron targets first: what they reach is held by electron chunk modules.
  for (const m of [...order].sort((a, b) => !!b.spec.electron - !!a.spec.electron)) for (const name of Object.keys(m.spec.exports ?? {})) await visit(m, name, `${m.target}`);
  // Initializers: a top-level statement that assigns to a held binding comes along with its own dependencies (to a
  // fixpoint), once; every binding it assigns must be held by the same module (a second carrier would run it twice).
  const carrier = new Map();
  for (let changed = true; changed;) {
    changed = false;
    for (const m of [...order]) {
      if (!m.source) continue;
      const src = await readSource(m.source, cache);
      for (const st of src.statements) {
        const stKey = `${m.source}@${st.start}`;
        if (carrier.has(stKey) || !st.assigned.some(n => m.selected.has(n))) continue;
        carrier.set(stKey, m); m.initializers.set(st.start, { start: st.start, text: src.text.slice(st.start, st.end), assigned: st.assigned });
        changed = true;
        for (const dep of st.deps) { edge(stKey, `${m.source}#${dep}`); if (!parent.has(stKey)) parent.set(stKey, `${m.source}#${st.assigned.find(n => m.selected.has(n))}`); await visit(m, dep, stKey); }
      }
    }
  }
  for (const [stKey, m] of carrier) for (const n of m.initializers.get(+stKey.split('@').pop()).assigned)
    if (!m.selected.has(n)) fail(`${m.target}: top-level statement ${stKey} assigns ${n}, which ${m.target} does not hold (${holder.get(`${m.source}#${n}`)?.target ?? m.imports.get(n)?.from ?? 'unsliced'})`);
  for (const m of order) {
    if (m.kind !== 'semantic') continue;
    for (const n of Object.keys(m.spec.exports ?? {})) if (!m.selected.has(n) && !(m.reexports.has(n) && m.imports.get(n)?.kind === 'linked')) fail(`${m.target}: root ${n} was not sliced`);
  }
  // Re-exports: a 3.6556.2 export whose 4.16336.0 binding cds-core publishes, a linked area exports, or another semantic
  // module roots (the same declaration under two 3.6556.2 file names).
  const reexportLines = new Map();
  for (const m of order) for (const [exportName, r] of Object.entries(m.spec.reexports ?? {})) {
    let line;
    if (r.cds) {
      const p = graph.byName.get(r.cds);
      if (!p) { fail(`${m.target}: re-export ${exportName} names no ${graph.area} publicName ${r.cds}`); continue; }
      if (r.binding && r.binding !== `${p.file}#${p.local}`) { fail(`${m.target}: ${graph.area} ${r.cds} is ${p.file}#${p.local}, not ${r.binding}`); continue; }
      line = { from: `../${graph.area}/${p.target}`, name: p.exportName, kind: 'shared-graph', via: `${p.file}#${p.local}` };
    } else if (r.module) {
      const owner = modules.get(r.module);
      if (!owner || owner.kind !== 'semantic' || ![...owner.rootNames.values(), ...owner.extraExports].includes(r.name)) { fail(`${m.target}: re-export ${exportName}: ${r.module} does not export ${r.name}`); continue; }
      line = { from: `./${r.module}`, name: r.name, kind: 'generated' };
    } else if (r.linked) {
      const l = linkedExport(r.linked);
      if (!l) { fail(`${m.target}: re-export ${exportName}: no linked area exports ${r.linked}`); continue; }
      const [file, local] = r.linked.split('#');
      const src = await readSource(file, cache);
      const p = getBinding(src, local);
      if (!isDeclaration(p)) { fail(`${m.target}: re-export ${exportName}: ${r.linked} is not a declaration`); continue; }
      assertFeatures(`${m.target}: re-export ${exportName} (${r.linked})`, declarationText(src, p), r.features ?? []);
      if (l.sha256 && !(await declarationHashes(declarationText(src, p))).includes(l.sha256)) { fail(`${m.target}: ${r.linked} differs from ${l.area}/${l.target}`); continue; }
      line = { from: `../${l.area}/${l.target}`, name: l.name, kind: 'linked', via: r.linked, linkedSha256: l.sha256 };
    } else { fail(`${m.target}: re-export ${exportName} has no cds / module / linked source`); continue; }
    reexportLines.set(`${m.target}\0${exportName}`, { module: m.target, exportName, ...line });
  }
  // Electron targets: their production home is electron/generated (main process), so their transitive generated imports
  // must stay off React, cds-core and host adapters.
  const electronClosure = {};
  for (const m of order) if (m.spec.electron) {
    const seen = new Set(), stack = [m];
    while (stack.length) {
      const x = stack.pop();
      if (seen.has(x.target)) continue;
      seen.add(x.target);
      for (const [, e] of x.imports) {
        if (e.kind === 'generated') stack.push(modules.get(e.from.slice(2)));
        else fail(`${m.target}: electron target ${m.spec.electron} reaches ${e.kind} ${e.from} (${e.via}) through ${x.target}`);
      }
    }
    electronClosure[m.target] = { production: m.spec.electron, modules: [...seen].sort() };
  }
  if (survey) {
    const others = await otherV4Areas(contract, path.basename(output), contract.linkedAreas ?? []), overlap = [];
    for (const m of order) for (const [name, rec] of m.selected) {
      const other = others.get(`${m.source}#${name}`);
      if (other) overlap.push({ binding: `${m.source}#${name}`, module: m.target, alsoIn: other, state: rec.state });
    }
    return { stateConflicts, problems, d1Pending, overlapWithOtherV4Areas: overlap, graphEdges,
      holders: Object.fromEntries([...holder].map(([k, m]) => [k, m.target])),
      modules: order.map(m => ({ target: m.target, source: m.source, kind: m.kind, bindings: m.selected.size, imports: [...m.imports.values()].map(e => `${e.kind}:${e.from}`) })) };
  }

  // Phase 3: emit.
  const files = {}, unbound = [];
  const manifest = { referenceVersion: official4.referenceVersion, referenceSnapshot: official4.referenceSnapshot, generator: 'scripts/extract-code-current-v4.mjs',
    area: 'code-current:base', sharedGraph: graph.area, sharedGraphManifestSha256: graph.manifestSha256,
    linkedGraphs: Object.fromEntries(linkedAreas.map(a => [a.area, a.manifestSha256])),
    linkedGraphModules: Object.fromEntries(linkedAreas.map(a => [a.area, a.modules])),
    isolatedGraph: contract.isolatedGraph, adapterModules: contract.adapterModules, electronTargets: electronClosure, d1Pending,
    dropped: contract.dropped, blocked: contract.blocked, modules: [] };
  const semantic = order.filter(m => m.kind === 'semantic'), chunks = order.filter(m => m.kind === 'chunk').sort((a, b) => a.target.localeCompare(b.target));
  for (const m of [...semantic, ...chunks]) {
    const src = m.source ? await readSource(m.source, cache) : null;
    const sorted = [...m.selected].sort((a, b) => a[1].start - b[1].start);
    const inits = [...m.initializers.values()].sort((a, b) => a.start - b.start);
    const blocks = [...sorted.map(([, r]) => ({ start: r.start, text: r.isVar ? `var ${r.text};` : r.text })), ...inits.map(i => ({ start: i.start, text: i.text.endsWith(';') ? i.text : `${i.text};` }))]
      .sort((a, b) => a.start - b.start).map(b => b.text);
    const groups = new Map();
    for (const [local, entry] of m.imports) {
      if (!groups.has(entry.from)) groups.set(entry.from, []);
      groups.get(entry.from).push(entry.name === local ? local : `${entry.name} as ${local}`);
    }
    const exportsAll = { ...Object.fromEntries(m.rootNames), ...Object.fromEntries([...m.extraExports].map(n => [n, n])) };
    const reexported = [...reexportLines.values()].filter(r => r.module === m.target);
    const names = [...Object.values(exportsAll), ...reexported.map(r => r.exportName)];
    if (new Set(names).size !== names.length) throw Error(`${m.target}: duplicate export names ${names.join(', ')}`);
    for (const n of Object.keys(exportsAll)) if (!m.selected.has(n) && !(m.reexports.has(n) && m.imports.get(n)?.kind === 'linked')) throw Error(`${m.target}: exports ${n}, which it does not hold`);
    const importText = [...groups].map(([from, list]) => `import { ${list.join(', ')} } from ${JSON.stringify(from)};`).join('\n');
    const exportText = Object.keys(exportsAll).length ? `export { ${Object.entries(exportsAll).map(([local, name]) => (local === name ? local : `${local} as ${name}`)).join(', ')} };` : '';
    const reexportText = reexported.map(r => `export { ${r.name === r.exportName ? r.name : `${r.name} as ${r.exportName}`} } from ${JSON.stringify(r.from)};`).join('\n');
    const header = `// Original Claude Desktop ${official4.referenceVersion} bindings from ${m.source}; generated by extract-code-current-v4.mjs.\n// Edit the extractor or its adapter modules, never this file.\n`;
    const text = await format(`${header}${importText}\n${blocks.join('\n')}\n${exportText}\n${reexportText}\n`, { parser: 'babel' });
    let globals;
    babel.traverse(babel.babelParse(text, m.target, true), { Program(p) { globals = Object.keys(p.scope.globals); } });
    const foreign = globals.filter(n => !contract.hostGlobals.has(n));
    if (foreign.length) { unbound.push(`${m.target}: unbound ${foreign.join(', ')}`); continue; }
    files[m.target] = text;
    manifest.modules.push({
      target: m.target, source: m.source ?? null, kind: m.kind, sourceSha256: src?.sourceSha256 ?? null, sha256: sha(text), referenceVersion: official4.referenceVersion,
      ...(m.spec.electron ? { electron: m.spec.electron } : {}),
      bindings: sorted.map(([name, r]) => ({ name, sha256: r.sha256 })),
      ...(inits.length ? { initializers: inits.map(i => ({ assigns: i.assigned, sha256: sha(i.text) })) } : {}),
      ...(sorted.some(([, r]) => r.state) ? { ownedState: Object.fromEntries(sorted.filter(([, r]) => r.state).map(([name, r]) => [name, r.state])) } : {}),
      imports: [...m.imports].map(([local, e]) => ({ local, from: e.from, name: e.name, via: e.via, kind: e.kind, ...(e.original ? { original: e.original } : {}),
        ...(e.linkedSha256 ? { linkedSha256: e.linkedSha256 } : {}), ...(e.sameAs ? { sameAdapterAs: e.sameAs } : {}) })),
      exports: exportsAll,
      ...(reexported.length ? { reexportsFrom: reexported.map(({ module, ...r }) => r) } : {}),
      ...(m.kind === 'semantic' ? { roots: Object.fromEntries(Object.keys(m.spec.exports ?? {}).map(n => [n, m.spec.aliases[n]])), previous: m.spec.previous } : {}),
      ...(m.selections.filter(s => typeof s === 'object').length ? { sourceSelections: m.selections.filter(s => typeof s === 'object') } : {}),
      ...(m.reexports.size ? { linkedRoots: [...m.reexports] } : {}), heldByCdsCore: m.heldByCdsCore, heldByLinked: m.heldByLinked,
    });
  }
  if (unbound.length) throw Error(unbound.join('\n'));
  files['manifest.json'] = JSON.stringify(manifest, null, 2) + '\n';
  if (dry) {
    // nothing written
  } else if (check) {
    const present = (await fs.readdir(output).catch(() => [])).sort(), expected = Object.keys(files).sort();
    if (JSON.stringify(present) !== JSON.stringify(expected)) throw Error(`${label} output set changed (${present.length} present, ${expected.length} expected). Run scripts/extract-code-current-v4.mjs.`);
    for (const [name, text] of Object.entries(files))
      if (await fs.readFile(path.join(output, name), 'utf8') !== text) throw Error(`${label} source mismatch: ${name}. Run scripts/extract-code-current-v4.mjs.`);
  } else {
    await fs.mkdir(output, { recursive: true });
    for (const name of await fs.readdir(output)) if (!(name in files)) await fs.rm(path.join(output, name));
    for (const [name, text] of Object.entries(files)) await fs.writeFile(path.join(output, name), text);
  }
  const count = manifest.modules.reduce((n, m) => n + m.bindings.length, 0);
  console.log(`${dry ? 'Built' : check ? 'Verified' : 'Extracted'} ${manifest.modules.length} ${label} modules (${semantic.length} semantic, ${count} original ${official4.referenceVersion} bindings, cds-core ${graph.manifestSha256.slice(0, 8)}).`);
  return manifest;
}

// CLI: default writes src/generated/code-current-v4; --check compares; --dry builds only; --survey prints D46 / D1 data.
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const opts = { check: process.argv.includes('--check'), dry: process.argv.includes('--dry'), survey: process.argv.includes('--survey') };
  const result = await extractCodeCurrentV4(opts);
  if (opts.survey) console.log(JSON.stringify(result, null, 1));
}
