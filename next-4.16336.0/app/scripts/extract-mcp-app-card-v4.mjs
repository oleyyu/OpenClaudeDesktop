// Batch 3 (region mcp-app-card): the 4.16336.0 source contract of the transcript MCP App / Visualize widget card.
//
// The 3.6556.2 contract stays in scripts/extract-mcp-app-card.mjs (byte-for-byte unchanged, output src/generated/mcp-app-card,
// checked by scripts/verify-gen-mcp-app-card.mjs): nine 3.6556.2 areas (artifact-library, code-current:upper, cowork-*,
// session-rail, sessions-page) still link that library by original identity, so production cannot move yet
// (region-plan cutover.productionSwitchNotBeforeBatch 9). This file is the second output of the same generator family: the
// same engine (a module's statements are the reachable closure of its roots across chunks, each declaration parsed on its
// own with Babel's scope analysis; generated modules import each other by the original export aliases), on the frozen
// 4.16336.0 snapshot, with these changes of linked graphs:
//   - the shared graph is cds-core (runSlicer cfg.sharedGraph:'cds-core' contract): version, snapshot, module bytes and
//     source sha256 checked; a binding cds-core publishes is imported under its exportName; a pure binding cds-core holds
//     without a public name is re-sliced (heldByCdsCore); module state cds-core holds without a public name stops
//     generation (D46, stateConflicts {binding, text, reachedBy}).
//   - the MCP App host library is mcp-app-host-v4 (4.16336.0). It is linked by chunk and original local through the
//     names its modules export; a binding it slices without exporting may be re-sliced here only when it is pure;
//     host-held module state stops generation (D1).
//   - linked 4.16336.0 areas (D1: the region's plan dependency routines-shared, batch 2b, src/generated/routines-shared-v4):
//     a binding such an area exports is imported from it; module state it holds without exporting is reported
//     (d1Pending) instead of being silently copied.
//   - every root is located by AST: it must be a top-level declaration of its chunk, and the only one there carrying all
//     of its features (assertUniqueRoot over the prettier form of the whole chunk).
//
// Placement. mcp-app-host-v4 is staged under analysis/ (batch 1; it is not in src/generated yet). A generated module here
// imports ../mcp-app-host-v4/<target>, so writing this output into src/generated before the host library lands there would
// leave dangling imports (tests/import-graph.test.mjs). Until then the output is written to the batch-3 staging folder at
// the production-equivalent depth; once src/generated/mcp-app-host-v4/manifest.json exists, the default output is
// src/generated/mcp-app-card-v4.
//
// Usage: node scripts/extract-mcp-app-card-v4.mjs [--check] [--survey] [--dry-run]
import fs from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { parsers } from '../../tools/node_modules/prettier/plugins/babel.mjs';
import { format } from '../../tools/node_modules/prettier/index.mjs';
import babel from '../../tools/node_modules/playwright/lib/transform/babelBundle.js';
import * as official from './official-4.16336.0.mjs';

const root = path.resolve(import.meta.dirname, '..');
const { referenceVersion, referenceSnapshot } = official;
const source = official.ionSource;
const generatedRoot = path.join(root, 'src/generated');
const area = 'mcp-app-card-v4';
const migration = path.join(root, '../analysis/claude-4.16336.0-migrate-20261104');
const STAGED_HOST = path.join(migration, 'regions/batch1/mcp-app-host/staging/out/mcp-app-host-v4');
const STAGED_OUTPUT = path.join(migration, 'regions/batch3/mcp-app-card/staging/out', area);
const adapterModule = '../../source-mcp-app-card-adapters.jsx';
const HOST_CHUNK = 'c96d752d0-D9VB6ArX.js';
const sha = bytes => createHash('sha256').update(bytes).digest('hex');

// Where the host library is read from and where this output goes (see "Placement" above).
export function placement() {
  const appHost = path.join(generatedRoot, 'mcp-app-host-v4');
  if (existsSync(path.join(appHost, 'manifest.json'))) return { staged: false, hostDir: appHost, output: path.join(generatedRoot, area) };
  return { staged: true, hostDir: STAGED_HOST, output: STAGED_OUTPUT };
}

// D1: 4.16336.0 areas this card links: the plan dependency routines-shared (batch 2b), and working-line-v4, which holds
// the turn-status-rows context (ca7b95e24 u, its provider d) and TurnStatus (c734f318c zt) the card's row draws as a CDS
// step; a second copy would split that context.
export const LINKED_AREAS = ['routines-shared-v4', 'working-line-v4'];

// The names src/source-mcp-app-card-adapters.jsx exports (parsed, not run). `text` reads a patched copy instead
// (tests check the batch-3 adapter patch with it, without touching the host file).
export async function adapterExports(text) {
  text ??= await fs.readFile(path.join(root, 'src/source-mcp-app-card-adapters.jsx'), 'utf8');
  const out = new Set();
  for (const m of text.matchAll(/^export\s+(?:async\s+)?(?:function|const|let|class)\s+([A-Za-z_$][\w$]*)/gm)) out.add(m[1]);
  for (const m of text.matchAll(/^export\s*\{([^}]*)\}/gm))
    for (const spec of m[1].split(',').map(v => v.trim()).filter(Boolean)) out.add(spec.split(/\s+as\s+/).at(-1));
  return out;
}

export { chunks, adapters, callSites, ALLOWED_CLOSURE_CHUNKS };
import { chunks, adapters, callSites, ALLOWED_CLOSURE_CHUNKS, PLAIN_NODE_TARGETS, allowedGlobals } from './extract-mcp-app-card-v4-spec.mjs';

async function readSource(name, cache) {
  if (cache.has(name)) return cache.get(name);
  const bytes = await fs.readFile(path.join(source, name));
  const code = bytes.toString();
  const ast = parsers.babel.parse(code, {});
  const exported = new Map();
  const top = new Map(), statements = [], bareImports = [];
  for (const node of ast.program.body) {
    if (node.type === 'ExportNamedDeclaration') {
      if (node.declaration || node.source) throw Error(`${name}: unsupported export form`);
      for (const s of node.specifiers) exported.set(s.exported.name, s.local.name);
    } else if (node.type === 'ImportDeclaration') {
      if (!node.specifiers.length) bareImports.push(node.source.value.replace(/^\.\//, ''));
      for (const s of node.specifiers) {
        if (s.type !== 'ImportSpecifier') throw Error(`${name}: unsupported import form`);
        top.set(s.local.name, { kind: 'import', file: node.source.value.replace(/^\.\//, ''), alias: s.imported.name });
      }
    } else if (node.type === 'FunctionDeclaration') top.set(node.id.name, { kind: 'function', node });
    else if (node.type === 'ClassDeclaration') top.set(node.id.name, { kind: 'class', node });
    else if (node.type === 'VariableDeclaration') for (const d of node.declarations) top.set(d.id.name, { kind: 'var', node: d, keyword: node.kind });
    else statements.push({ kind: 'statement', node });
  }
  const record = { name, bytes, code, exported, top, statements, bareImports, formatted: new Map(), deps: new Map() };
  cache.set(name, record);
  return record;
}
const sliceText = (src, entry) => src.code.slice(entry.node.start, entry.node.end);
const emittedText = (src, entry) => (entry.kind === 'var' ? `${entry.keyword} ${sliceText(src, entry)};` : sliceText(src, entry));
async function featureText(src, entry) {
  if (!src.formatted.has(entry)) src.formatted.set(entry, await format(emittedText(src, entry).replace(/^(let|const) /, 'var '), { parser: 'babel' }));
  return src.formatted.get(entry);
}
function programGlobals(text, label) {
  const ast = babel.babelParse(text, label, true);
  let globals;
  babel.traverse(ast, { Program(p) { globals = Object.keys(p.scope.globals); p.stop(); } });
  return globals;
}
function unitDeps(src, entry, key) {
  if (src.deps.has(entry)) return src.deps.get(entry);
  const text = emittedText(src, entry).replace(/^(let|const) /, 'var ');
  const deps = programGlobals(text, `${src.name}#${key}`).filter(n => n !== key && src.top.has(n));
  src.deps.set(entry, deps);
  return deps;
}
function statementTargets(node) {
  const out = new Set();
  const visit = e => {
    if (!e) return;
    if (e.type === 'SequenceExpression') e.expressions.forEach(visit);
    else if (e.type === 'AssignmentExpression') { if (e.left.type === 'Identifier') out.add(e.left.name); }
    else if (e.type === 'CallExpression') {
      if (e.callee.type === 'Identifier') out.add(e.callee.name);
      if (e.callee.type === 'MemberExpression' && e.callee.object.name === 'Object' && e.callee.property.name === 'assign' && e.arguments[0]?.type === 'Identifier')
        out.add(e.arguments[0].name);
    }
  };
  if (node.type === 'ExpressionStatement') visit(node.expression);
  else if (node.type === 'ForOfStatement' && node.body.type === 'ExpressionStatement') visit(node.body.expression);
  return [...out];
}
const normalised = text => text.replace(/\s+/g, ' ');
const looseCache = new Map();
const loose = f => {
  if (!looseCache.has(f)) { let p = null; try { p = official.looseFeature(f); } catch { /* text only */ } looseCache.set(f, p); }
  return looseCache.get(f);
};
// A feature is a string of the prettier text (whitespace-insensitive), or { loose } (official looseFeature over the
// minified or the prettier text).
const featureHit = (text, flat, raw, f) => (typeof f === 'string'
  ? text.includes(f) || flat.includes(normalised(f))
  : !!loose(f.loose)?.test(raw) || !!loose(f.loose)?.test(text));
function missingFeatures(text, features = [], raw = '') {
  const flat = normalised(text);
  return features.filter(f => !featureHit(text, flat, raw, f));
}
function assertFeatures(label, text, features = [], raw = '') {
  const missing = missingFeatures(text, features, raw);
  if (missing.length) throw Error(`${label} lacks ${missing.map(f => JSON.stringify(f)).join(', ')}`);
}
// The prettier form of every top-level declaration of a chunk (the whole chunk formatted once).
async function chunkDeclarations(src) {
  if (src.declarations) return src.declarations;
  const code = await format(src.code, { parser: 'babel' });
  const out = new Map();
  for (const node of parsers.babel.parse(code, {}).program.body) {
    if (node.type === 'FunctionDeclaration' || node.type === 'ClassDeclaration') out.set(node.id.name, code.slice(node.start, node.end));
    else if (node.type === 'VariableDeclaration')
      for (const d of node.declarations) if (d.id.type === 'Identifier') out.set(d.id.name, `var ${code.slice(d.start, d.end)};`);
  }
  src.declarations = out;
  return out;
}
// A root is the only top-level declaration of its chunk that carries every one of its features.
async function assertUniqueRoot(label, src, name, features = []) {
  if (!features.length) throw Error(`${label}: root ${name} has no features to locate it by`);
  const hits = [];
  for (const [other, text] of await chunkDeclarations(src)) {
    const entry = src.top.get(other);
    if (!missingFeatures(text, features, entry && entry.kind !== 'import' ? sliceText(src, entry) : '').length) hits.push(other);
  }
  if (hits.length !== 1 || hits[0] !== name) throw Error(`${label}: root ${name} is not the unique declaration of ${src.name} with its features (${hits.join(', ') || 'none'})`);
}
function vendorImport(file, alias, src) {
  if (file !== official.vendorFrame) return null;
  if (!official.reactAliases[alias]) return null;
  const { module, member } = official.assertVendorAlias(src.code, alias);
  return [module, member];
}
function writtenBindings(src) {
  if (src.written) return src.written;
  const ast = babel.babelParse(src.code, src.name, false);
  let written;
  babel.traverse(ast, { Program(p) { written = new Set(Object.entries(p.scope.bindings).filter(([, b]) => b.constantViolations.length).map(([n]) => n)); p.stop(); } });
  src.written = written;
  return written;
}
// Module state a second copy would split (D46 / D1): a module-level WeakMap / Map / Set / WeakSet, a React context, or a
// module-level binding its chunk assigns after the declaration (the routines-shared-v4 rule).
async function moduleStateKind(src, entry, cache) {
  if (entry.kind !== 'var') return null;
  if (writtenBindings(src).has(entry.node.id.name)) return 'module-level binding written after its declaration';
  const init = entry.node.init;
  if (init?.type === 'NewExpression' && init.callee.type === 'Identifier' && ['WeakMap', 'Map', 'Set', 'WeakSet'].includes(init.callee.name)) return `module ${init.callee.name}`;
  if (init?.type === 'CallExpression' && init.callee.type === 'Identifier') {
    const callee = src.top.get(init.callee.name);
    if (callee?.kind === 'import' && callee.file === official.vendorFrame && official.reactAliases[callee.alias]?.[1] === 'createContext') return 'context (createContext)';
  }
  return null;
}
// The `export { local as name }` pairs of a generated module (local -> [names]).
function exportPairs(text) {
  const out = new Map();
  for (const block of text.matchAll(/^export \{([^}]*)\};/gm))
    for (const spec of block[1].split(',').map(v => v.trim()).filter(Boolean)) {
      const [local, as] = spec.split(/\s+as\s+/);
      out.set(local, [...(out.get(local) ?? []), as ?? local]);
    }
  return out;
}

// cds-core (runSlicer sharedGraph contract).
async function cdsCoreGraph() {
  const dir = path.join(generatedRoot, 'cds-core');
  const manifestBytes = await fs.readFile(path.join(dir, 'manifest.json'));
  const manifest = JSON.parse(manifestBytes);
  if (manifest.referenceVersion !== referenceVersion) throw Error(`cds-core is ${manifest.referenceVersion}, expected ${referenceVersion}`);
  if (manifest.referenceSnapshot !== referenceSnapshot) throw Error(`cds-core snapshot is ${manifest.referenceSnapshot}, expected ${referenceSnapshot}`);
  const byTarget = new Map(), published = new Map(), held = new Map();
  const moduleShas = {};
  for (const m of manifest.modules) {
    if ((m.referenceVersion ?? manifest.referenceVersion) !== referenceVersion) throw Error(`cds-core/${m.target} is ${m.referenceVersion}`);
    if (sha(await fs.readFile(path.join(dir, m.target))) !== m.sha256) throw Error(`cds-core/${m.target} differs from its manifest`);
    const bytes = await fs.readFile(path.join(source, path.basename(m.source))).catch(() => null);
    if (!bytes || !/^[0-9a-f]{64}$/.test(m.sourceSha256 ?? '') || sha(bytes) !== m.sourceSha256)
      throw Error(`cds-core/${m.target} was sliced from ${m.source} ${m.sourceSha256 ?? '(no sourceSha256)'}, which is not the source this area reads`);
    byTarget.set(m.target, m);
    moduleShas[m.target] = m.sha256;
    for (const b of m.bindings) held.set(`${path.basename(m.source)}#${typeof b === 'string' ? b : b.name}`, { target: m.target, sha256: typeof b === 'string' ? null : b.sha256 });
  }
  for (const [name, entry] of Object.entries(manifest.publicNames ?? {})) {
    const m = byTarget.get(entry.target);
    const exported = m && (m.exports?.[entry.local] ?? (m.sharedExports?.includes(entry.local) ? entry.local : null));
    if (!m || path.basename(m.source) !== entry.file || !m.bindings.some(b => (typeof b === 'string' ? b : b.name) === entry.local) || !entry.exportName || exported !== entry.exportName)
      throw Error(`cds-core publicName ${name} (${entry.file}#${entry.local}) is not exported by ${entry.target} as ${entry.exportName}`);
    published.set(`${entry.file}#${entry.local}`, { kind: 'shared-graph', from: `../cds-core/${entry.target}`, name: entry.exportName, publicName: name });
  }
  return { manifestSha256: sha(manifestBytes), published, held, moduleShas };
}
// A linked 4.16336.0 library (mcp-app-host-v4, routines-shared-v4): manifest on this version and snapshot, module bytes
// equal to the manifest, cut from the official chunk this generator reads; exports read from the module text.
async function linkedGraph(name, dir, kind) {
  const manifestBytes = await fs.readFile(path.join(dir, 'manifest.json'));
  const manifest = JSON.parse(manifestBytes);
  if (manifest.referenceVersion !== referenceVersion || manifest.referenceSnapshot !== referenceSnapshot)
    throw Error(`linked ${name} is ${manifest.referenceVersion} ${manifest.referenceSnapshot}, expected ${referenceVersion} ${referenceSnapshot}`);
  const exportsByKey = new Map(), held = new Map(), moduleShas = {};
  for (const m of manifest.modules) {
    const text = await fs.readFile(path.join(dir, m.target), 'utf8');
    if (sha(text) !== m.sha256) throw Error(`linked ${name}/${m.target} differs from its manifest; run its generator`);
    const file = path.basename(m.source);
    const bytes = await fs.readFile(path.join(source, file)).catch(() => null);
    if (!bytes || sha(bytes) !== m.sourceSha256) throw Error(`linked ${name}/${m.target} was cut from another ${file}`);
    moduleShas[m.target] = m.sha256;
    const names = new Map((m.bindings ?? []).map(b => (typeof b === 'string' ? [b, null] : [b.name, b.sha256])));
    for (const [local, bsha] of names) held.set(`${file}#${local}`, { target: m.target, sha256: bsha });
    for (const [local, as] of exportPairs(text)) {
      if (!names.has(local)) continue; // a re-export of an import is linked at its owner
      exportsByKey.set(`${file}#${local}`, { kind, from: `../${name}/${m.target}`, name: as[0], sha256: names.get(local), area: name });
    }
  }
  return { name, manifestSha256: sha(manifestBytes), exportsByKey, held, moduleShas };
}
// What other 4.16336.0 graphs under src/generated cut (file#local -> [area]); D1 report only.
async function otherTargetGraphs(own) {
  const out = new Map();
  for (const entry of await fs.readdir(generatedRoot, { withFileTypes: true })) {
    if (!entry.isDirectory() || own.has(entry.name) || entry.name === 'cds-core') continue;
    let manifest;
    try { manifest = JSON.parse(await fs.readFile(path.join(generatedRoot, entry.name, 'manifest.json'), 'utf8')); } catch { continue; }
    if (!Array.isArray(manifest.modules)) continue;
    for (const m of manifest.modules) {
      if ((m.referenceVersion ?? manifest.referenceVersion) !== referenceVersion || typeof m.source !== 'string') continue;
      for (const b of m.bindings ?? []) {
        const key = `${path.basename(m.source)}#${typeof b === 'string' ? b : b.name}`;
        if (!out.has(key)) out.set(key, []);
        out.get(key).push(entry.name);
      }
    }
  }
  return out;
}

export async function extractMcpAppCardV4({ check = false, survey = false, open = false, dryRun = false, output: outputOverride } = {}) {
  const cache = new Map();
  const place = placement();
  const output = outputOverride ?? place.output;
  const cds = await cdsCoreGraph();
  const host = await linkedGraph('mcp-app-host-v4', place.hostDir, 'mcp-app-host');
  const linked = [];
  for (const name of LINKED_AREAS) linked.push(await linkedGraph(name, path.join(generatedRoot, name), 'linked-area'));
  const others = await otherTargetGraphs(new Set([area, 'mcp-app-card', 'mcp-app-host-v4', ...LINKED_AREAS]));
  const external = key => cds.published.get(key) ?? host.exportsByKey.get(key) ?? linked.map(g => g.exportsByKey.get(key)).find(Boolean) ?? null;

  const specOf = file => {
    if (!chunks[file]) chunks[file] = { target: `${file.replace(/-[A-Za-z0-9_-]{8}\.js$/, '')}.mjs`, implicit: true };
    return chunks[file];
  };
  const needed = new Map(), resolved = new Map(), exportsNeeded = new Map(), kept = new Map(), dynamic = new Map(), cutsUsed = new Map();
  const heldCopies = new Map(), hostCopies = new Map(), linkedCopies = new Map();
  const stateConflicts = [], hostStateConflicts = [], d1Pending = [], boundaries = [], problems = [];
  const queue = [], reachedFrom = new Map();
  const chainOf = key => { const out = []; for (let k = key; k && out.length < 40; k = reachedFrom.get(k)) out.push(k.replace(/-[A-Za-z0-9_-]{8}\.js#/, '#')); return out.join(' <- '); };
  const need = (file, local, from) => queue.push({ file, local, from });
  const markExport = (file, local, alias) => {
    if (!exportsNeeded.has(file)) exportsNeeded.set(file, new Map());
    exportsNeeded.get(file).set(alias, local);
  };
  const allowList = new Set([HOST_CHUNK, ...Object.keys(chunks), ...ALLOWED_CLOSURE_CHUNKS]);
  // --survey --open (diagnosis only): every chunk may be entered, to measure the whole closure.
  const allowed = { has: file => allowList.has(file) || (survey && open && file !== official.vendorFrame) };
  for (const [file, spec] of Object.entries(chunks)) for (const local of Object.keys(spec.roots ?? {})) need(file, local, 'root');
  const ensure = file => { if (!needed.has(file)) { needed.set(file, new Set()); resolved.set(file, new Map()); } };
  const fail = message => { if (survey) problems.push(message); else throw Error(message); };
  const drain = async () => {
    while (queue.length) {
      const { file, local, from } = queue.shift();
      if (!allowed.has(file)) {
        if (survey) { boundaries.push({ file, local, from, chain: chainOf(from) }); continue; }
        throw Error(`${from}: ${file} is not on the allow-list (needs ${local}) [${chainOf(from)}]`);
      }
      const spec = specOf(file);
      ensure(file);
      if (needed.get(file).has(local)) continue;
      needed.get(file).add(local);
      reachedFrom.set(`${file}#${local}`, from);
      const src = await readSource(file, cache);
      const entry = src.top.get(local);
      if (!entry) { fail(`${from}: ${file} has no top-level ${local}`); continue; }
      const key = `${file}#${local}`;
      if (entry.kind !== 'import') {
        const ext = external(key);
        if (ext) { resolved.get(file).set(local, { ...ext, via: key, original: local }); continue; }
      }
      const cut = spec.localCuts?.[local];
      if (cut && entry.kind !== 'import') {
        try { assertFeatures(`local cut ${key}`, await featureText(src, entry), cut.features, sliceText(src, entry)); } catch (e) { fail(e.message); }
        resolved.get(file).set(local, { kind: 'adapter', from: adapterModule, name: cut.name, via: key, original: local });
        cutsUsed.set(key, cut.name);
        continue;
      }
      if (entry.kind === 'import') {
        const via = `${entry.file}:${entry.alias}`;
        const dep = await readSource(entry.file, cache);
        const depLocal = dep.exported.get(entry.alias);
        if (!depLocal) { fail(`${key}: ${via} is not exported`); continue; }
        const adapter = adapters[entry.file]?.[entry.alias];
        if (adapter) {
          const original = dep.top.get(depLocal);
          try {
            if (adapter.local !== depLocal) throw Error(`${key}: adapter alias ${via} is ${depLocal}, expected ${adapter.local}`);
            if (!original || original.kind === 'import') throw Error(`adapter ${via} (${depLocal}) is not a declaration`);
            assertFeatures(`adapter ${via} (${depLocal})`, await featureText(dep, original), adapter.features, sliceText(dep, original));
            for (const [other, features] of Object.entries(adapter.also ?? {})) {
              const also = dep.top.get(other);
              if (!also || also.kind === 'import') throw Error(`adapter ${via} pins ${other}, which is not a declaration of ${entry.file}`);
              assertFeatures(`adapter ${via} (${other})`, await featureText(dep, also), features, sliceText(dep, also));
            }
          } catch (e) { fail(e.message); }
          resolved.get(file).set(local, { kind: 'adapter', from: adapterModule, name: adapter.name, via, original: depLocal });
          continue;
        }
        const react = vendorImport(entry.file, entry.alias, dep);
        if (react) { resolved.get(file).set(local, { kind: 'react', from: react[0], name: react[1], via }); continue; }
        const ext = external(`${entry.file}#${depLocal}`);
        if (ext) { resolved.get(file).set(local, { ...ext, via, original: depLocal }); continue; }
        if (!allowed.has(entry.file)) {
          if (survey) { boundaries.push({ file: entry.file, local: depLocal, alias: entry.alias, from: key, chain: chainOf(key) }); resolved.get(file).set(local, { kind: 'boundary', from: '?', name: entry.alias, via }); continue; }
          throw Error(`${key}: unresolved import ${via} (${depLocal}); ${entry.file} is not on the allow-list [${chainOf(key)}]`);
        }
        resolved.get(file).set(local, { kind: 'generated', from: `./${specOf(entry.file).target}`, name: entry.alias, via });
        markExport(entry.file, depLocal, entry.alias);
        need(entry.file, depLocal, key);
        continue;
      }
      // Sliced here: copies of what another graph holds.
      const state = await moduleStateKind(src, entry, cache);
      const text = sliceText(src, entry);
      if (cds.held.has(key)) {
        if (state) stateConflicts.push({ binding: key, heldBy: `cds-core/${cds.held.get(key).target}`, kind: state, text: text.slice(0, 80), reachedBy: chainOf(key) });
        if (!heldCopies.has(file)) heldCopies.set(file, new Set());
        heldCopies.get(file).add(local);
      }
      if (host.held.has(key)) {
        if (state) hostStateConflicts.push({ binding: key, heldBy: `mcp-app-host-v4/${host.held.get(key).target}`, kind: state, text: text.slice(0, 80), reachedBy: chainOf(key) });
        if (!hostCopies.has(file)) hostCopies.set(file, new Set());
        hostCopies.get(file).add(local);
      }
      for (const g of linked) if (g.held.has(key)) {
        if (state) d1Pending.push({ binding: key, heldBy: `${g.name}/${g.held.get(key).target}`, kind: state, text: text.slice(0, 80), reachedBy: chainOf(key), reason: 'held by a linked area without an export' });
        if (!linkedCopies.has(file)) linkedCopies.set(file, new Set());
        linkedCopies.get(file).add(local);
      }
      if (state && others.has(key)) d1Pending.push({ binding: key, heldBy: others.get(key).join(', '), kind: state, text: text.slice(0, 80), reachedBy: chainOf(key), reason: 'also cut by another 4.16336.0 graph (not a plan dependency of this region)' });
      if (/\bimport\s*\(/.test(text)) {
        const rewrites = spec.dynamicImports?.[local];
        if (!rewrites) { fail(`${file}: dynamic import inside ${local} [${chainOf(key)}]`); continue; }
        for (const target of Object.keys(rewrites))
          if (text.split(`import("./${target}")`).length - 1 !== 1) fail(`${key}: expected one import("./${target}")`);
        if (text.replace(/import\("\.\/([^"]+)"\)/g, (m, t) => (rewrites[t] ? '' : m)).match(/\bimport\s*\(/)) fail(`${key}: unpinned dynamic import`);
        dynamic.set(key, rewrites);
      }
      for (const dep of unitDeps(src, entry, local)) need(file, dep, key);
    }
  };
  await drain();
  for (let changed = true; changed;) {
    changed = false;
    for (const [file, set] of needed) {
      const src = await readSource(file, cache);
      if (!kept.has(file)) kept.set(file, new Set());
      for (const stmt of src.statements) {
        if (kept.get(file).has(stmt)) continue;
        const targets = statementTargets(stmt.node);
        if (!targets.some(t => set.has(t) && !resolved.get(file).has(t))) continue;
        kept.get(file).add(stmt);
        changed = true;
        const text = src.code.slice(stmt.node.start, stmt.node.end);
        if (/\bimport\s*\(/.test(text)) fail(`${file}: dynamic import in a top-level statement`);
        for (const dep of programGlobals(text, `${file}#statement`).filter(n => src.top.has(n))) need(file, dep, `${file}#statement`);
      }
    }
    if (queue.length) { await drain(); changed = true; }
  }
  for (const [file, spec] of Object.entries(chunks)) for (const [local] of Object.entries(spec.localCuts ?? {}))
    if (!cutsUsed.has(`${file}#${local}`)) fail(`local cut ${file}#${local} was not reached`);

  const manifest = { referenceVersion, referenceSnapshot, generator: 'scripts/extract-mcp-app-card-v4.mjs', adapterModule: 'src/source-mcp-app-card-adapters.jsx',
    sharedGraph: 'cds-core', sharedGraphManifestSha256: cds.manifestSha256,
    hostLibrary: { area: 'mcp-app-host-v4', staged: place.staged, manifestSha256: host.manifestSha256 },
    linkedAreas: Object.fromEntries(linked.map(g => [g.name, g.manifestSha256])),
    isolatedGraph: { productionOutput: 'src/generated/mcp-app-card', productionVersion: '3.6556.2', productionSwitchNotBeforeBatch: 9,
      heldBy: ['artifact-library', 'code-current:upper', 'cowork-approval', 'cowork-context', 'cowork-home', 'cowork-live', 'cowork-progress', 'session-rail', 'sessions-page'] },
    modules: [], publicNames: {} };
  const files = {};
  const targets = new Set();
  for (const [file, spec] of Object.entries(chunks)) {
    if (!needed.has(file)) { if (spec.implicit) continue; fail(`on the allow-list but not reached: ${file}`); continue; }
    if (targets.has(spec.target)) throw Error(`duplicate target ${spec.target}`);
    targets.add(spec.target);
    const src = await readSource(file, cache);
    const set = needed.get(file);
    for (const [local, features] of Object.entries(spec.features ?? {})) {
      const entry = src.top.get(local);
      if (!entry || entry.kind === 'import') { fail(`${spec.target}: root ${local} is not a declaration of ${file}`); continue; }
      try {
        assertFeatures(`${spec.target}: root ${local}`, await featureText(src, entry), features, sliceText(src, entry));
        if (!survey) await assertUniqueRoot(`${spec.target}`, src, local, features);
      } catch (e) { fail(e.message); }
    }
    for (const local of Object.keys(spec.roots ?? {})) if (!spec.features?.[local]?.length) fail(`${spec.target}: root ${local} has no features`);
    for (const [feature, count] of spec.raw ?? []) {
      const found = src.code.split(feature).length - 1;
      if (found !== count) fail(`${file}: ${JSON.stringify(feature)} occurs ${found} times, expected ${count}`);
    }
    const units = [];
    for (const local of set) {
      const entry = src.top.get(local);
      if (entry && entry.kind !== 'import' && !resolved.get(file).has(local)) units.push({ local, entry, start: entry.node.start });
    }
    for (const stmt of kept.get(file) ?? []) units.push({ statement: true, entry: stmt, start: stmt.node.start });
    units.sort((a, b) => a.start - b.start);
    // `isolate`: these sliced declarations (and their in-chunk closure, which must be sliced here too) go to a module of
    // their own, so a plain `node --test` can import it without the rest of the chunk (E42: tool-names.mjs).
    const isolated = new Set();
    if (spec.isolate) {
      const stack = [...spec.isolate.locals];
      while (stack.length) {
        const l = stack.pop();
        if (isolated.has(l)) continue;
        const e = src.top.get(l);
        if (!e || e.kind === 'import' || resolved.get(file).has(l) || !set.has(l)) { fail(`${spec.isolate.target}: ${l} is not a declaration sliced from ${file}`); continue; }
        isolated.add(l);
        stack.push(...unitDeps(src, e, l));
      }
      const own = units.filter(u => u.local && isolated.has(u.local));
      const ownExports = Object.entries(spec.roots ?? {}).filter(([l]) => isolated.has(l));
      const header = `// Original Claude Desktop ${referenceVersion} code from ${file}; generated by extract-mcp-app-card-v4.mjs.\n// Edit the extractor or src/source-mcp-app-card-adapters.jsx, never this file.\n`;
      const text = await format(`${header}${own.map(u => emittedText(src, u.entry)).join('\n')}\nexport { ${ownExports.map(([l, n]) => `${l} as ${n}`).join(', ')} };\n`, { parser: 'babel' });
      if (targets.has(spec.isolate.target)) throw Error(`duplicate target ${spec.isolate.target}`);
      targets.add(spec.isolate.target);
      files[spec.isolate.target] = text;
      for (const [l, n] of ownExports) manifest.publicNames[n] = { module: spec.isolate.target, file, local: l };
      manifest.modules.push({
        target: spec.isolate.target, source: file, isolatedFrom: spec.target, sourceSha256: sha(src.bytes), sha256: sha(text), referenceVersion,
        statements: own.length, bindings: own.map(u => ({ name: u.local, sha256: sha(sliceText(src, u.entry)) })), sideEffects: [], droppedBareImports: [],
        imports: [], dynamicImports: [], exports: Object.fromEntries(ownExports.map(([l, n]) => [n, l])),
        heldByCdsCore: [], alsoInMcpAppHost: [], alsoInLinkedArea: [], features: {}, raw: [], localCuts: {},
      });
      for (let i = units.length - 1; i >= 0; i--) if (units[i].local && isolated.has(units[i].local)) units.splice(i, 1);
    }
    const blocks = units.map(u => {
      let text = emittedText(src, u.entry);
      const rewrites = u.local && dynamic.get(`${file}#${u.local}`);
      if (rewrites) for (const [from, to] of Object.entries(rewrites)) text = text.split(`import("./${from}")`).join(`import(${JSON.stringify(to)})`);
      return text;
    });
    const groups = new Map();
    for (const [local, r] of resolved.get(file)) {
      if (!set.has(local)) continue;
      if (!groups.has(r.from)) groups.set(r.from, []);
      groups.get(r.from).push(r.name === local ? local : `${r.name} as ${local}`);
    }
    const exportMap = new Map(exportsNeeded.get(file) ?? []);
    if (isolated.size) {
      const reads = new Set(programGlobals(blocks.join('\n'), `${spec.target}#isolated`));
      const used = [...isolated].filter(l => reads.has(l) || [...exportMap.values()].includes(l)).sort();
      if (used.length) groups.set(`./${spec.isolate.target}`, used);
    }
    const importText = [...groups].sort(([a], [b]) => a.localeCompare(b)).map(([from, names]) => `import { ${names.sort().join(', ')} } from ${JSON.stringify(from)};`).join('\n');
    for (const [local, name] of Object.entries(spec.roots ?? {})) {
      if (isolated.has(local)) continue;
      if (exportMap.has(name) && exportMap.get(name) !== local) throw Error(`${spec.target}: export ${name} is taken`);
      exportMap.set(name, local);
      const r = resolved.get(file).get(local);
      manifest.publicNames[name] = { module: spec.target, file, local, ...(r ? { linkedFrom: `${r.from}#${r.name}` } : {}) };
    }
    for (const [name, local] of exportMap) if (!set.has(local)) fail(`${spec.target}: export ${name} (${local}) is not kept`);
    const exportText = exportMap.size
      ? `export { ${[...exportMap].sort(([a], [b]) => a.localeCompare(b)).map(([name, local]) => (name === local ? local : `${local} as ${name}`)).join(', ')} };`
      : '';
    const header = `// Original Claude Desktop ${referenceVersion} code from ${file}; generated by extract-mcp-app-card-v4.mjs.\n// Edit the extractor or src/source-mcp-app-card-adapters.jsx, never this file.\n`;
    const text = await format(`${header}${importText}\n${blocks.join('\n')}\n${exportText}\n`, { parser: 'babel' });
    const unbound = programGlobals(text, spec.target).filter(name => !allowedGlobals.has(name));
    if (unbound.length) {
      const readers = units.filter(u => u.local && programGlobals(emittedText(src, u.entry).replace(/^(let|const) /, 'var '), u.local).some(n => unbound.includes(n))).map(u => `${u.local} [${chainOf(`${file}#${u.local}`)}]`);
      fail(`${spec.target}: unbound ${unbound.join(', ')} (read by ${readers.join(', ')})`);
    }
    files[spec.target] = text;
    manifest.modules.push({
      target: spec.target, source: file, sourceSha256: sha(src.bytes), sha256: sha(text), referenceVersion,
      statements: units.length,
      bindings: units.filter(u => u.local).map(u => ({ name: u.local, sha256: sha(sliceText(src, u.entry)) })),
      sideEffects: units.filter(u => u.statement).map(u => ({ at: u.start, sha256: sha(src.code.slice(u.entry.node.start, u.entry.node.end)) })),
      droppedBareImports: src.bareImports,
      imports: [...resolved.get(file)].filter(([local]) => set.has(local))
        .map(([local, r]) => ({ local, from: r.from, name: r.name, via: r.via, kind: r.kind, ...(r.original ? { original: r.original } : {}), ...(r.sha256 ? { linkedSha256: r.sha256 } : {}) }))
        .concat([...isolated].sort().map(local => ({ local, from: `./${spec.isolate.target}`, name: local, via: `${file}#${local}`, kind: 'isolated' }))),
      dynamicImports: [...dynamic].filter(([key]) => key.startsWith(`${file}#`)).map(([key, rewrites]) => ({ binding: key.split('#')[1], rewrites })),
      exports: Object.fromEntries([...exportMap].sort(([a], [b]) => a.localeCompare(b))),
      heldByCdsCore: [...(heldCopies.get(file) ?? [])].sort(),
      alsoInMcpAppHost: [...(hostCopies.get(file) ?? [])].sort(),
      alsoInLinkedArea: [...(linkedCopies.get(file) ?? [])].sort(),
      features: spec.features ?? {}, raw: spec.raw ?? [], localCuts: spec.localCuts ?? {},
    });
  }
  manifest.modules.sort((a, b) => a.target.localeCompare(b.target));
  // E42: a plain-node module's generated import closure stays inside this library (the react package aside).
  for (const target of PLAIN_NODE_TARGETS) {
    const seen = new Set(), stack = [target];
    while (stack.length) {
      const t = stack.pop();
      if (seen.has(t)) continue;
      seen.add(t);
      if (!files[t]) { fail(`plain-node ${target}: ${t} is not a module of this library`); continue; }
      for (const node of parsers.babel.parse(files[t], {}).program.body) {
        if (!node.source) continue;
        const from = node.source.value;
        if (from === 'react') continue;
        if (!/^\.\/[^/]+\.mjs$/.test(from)) { fail(`plain-node ${target}: ${t} imports ${from}`); continue; }
        stack.push(from.slice(2));
      }
    }
  }
  manifest.callSites = [];
  for (const site of callSites) {
    const src = await readSource(site.source, cache);
    const entry = src.top.get(site.binding);
    if (!entry || entry.kind === 'import') { fail(`call site ${site.source}:${site.binding} is not a declaration`); continue; }
    try { assertFeatures(`call site ${site.source}:${site.binding}`, await featureText(src, entry), site.features, sliceText(src, entry)); } catch (e) { fail(e.message); }
    manifest.callSites.push({ source: site.source, binding: site.binding, role: site.role, sha256: sha(sliceText(src, entry)), features: site.features });
  }
  manifest.sharedGraphModules = Object.fromEntries([...new Set(manifest.modules.flatMap(m => m.imports.filter(i => i.kind === 'shared-graph').map(i => path.basename(i.from))))].sort().map(t => [t, cds.moduleShas[t]]));
  manifest.hostLibraryModules = Object.fromEntries([...new Set(manifest.modules.flatMap(m => m.imports.filter(i => i.kind === 'mcp-app-host').map(i => path.basename(i.from))))].sort().map(t => [t, host.moduleShas[t]]));
  manifest.linkedAreaModules = Object.fromEntries(linked.map(g => [g.name, Object.fromEntries([...new Set(manifest.modules.flatMap(m => m.imports.filter(i => i.area === g.name || i.from.startsWith(`../${g.name}/`)).map(i => path.basename(i.from))))].sort().map(t => [t, g.moduleShas[t]]))]));
  manifest.d1Pending = d1Pending;
  // The host adapter contract: every adapter name this graph imports must be exported by the adapter module. A staged
  // output may record missing names (the batch-3 patch adds them); src/generated output may not.
  const adapterNames = [...new Set(manifest.modules.flatMap(m => m.imports.filter(i => i.kind === 'adapter').map(i => i.name)))].sort();
  const exported = await adapterExports();
  manifest.adapterContract = { module: manifest.adapterModule, names: adapterNames, missing: adapterNames.filter(n => !exported.has(n)) };
  if (manifest.adapterContract.missing.length && !place.staged && !survey)
    throw Error(`src/source-mcp-app-card-adapters.jsx lacks ${manifest.adapterContract.missing.join(', ')}`);
  files['manifest.json'] = JSON.stringify(manifest, null, 2) + '\n';
  const summary = { output: path.relative(path.resolve(root, '..'), output), staged: place.staged, modules: manifest.modules.length,
    statements: manifest.modules.reduce((n, m) => n + m.statements, 0), bindings: manifest.modules.reduce((n, m) => n + m.bindings.length, 0),
    importKinds: manifest.modules.flatMap(m => m.imports).reduce((o, i) => ({ ...o, [i.kind]: (o[i.kind] ?? 0) + 1 }), {}),
    heldByCdsCore: manifest.modules.reduce((n, m) => n + m.heldByCdsCore.length, 0),
    alsoInMcpAppHost: manifest.modules.flatMap(m => m.alsoInMcpAppHost.map(b => `${m.source}#${b}`)),
    missingAdapters: manifest.adapterContract.missing, stateConflicts, hostStateConflicts, d1Pending, problems, boundaries,
    ...(survey ? { sliced: manifest.modules.flatMap(m => m.bindings.map(b => `${m.source}#${b.name}`)) } : {}) };
  if (stateConflicts.length || hostStateConflicts.length) {
    const error = Error([
      ...(stateConflicts.length ? [`module state cds-core holds without a semantic name (D46):\n  ${stateConflicts.map(c => `${c.binding} (${c.text}) <- ${c.reachedBy}`).join('\n  ')}`] : []),
      ...(hostStateConflicts.length ? [`module state mcp-app-host-v4 holds without exporting it (D1):\n  ${hostStateConflicts.map(c => `${c.binding} (${c.text}) <- ${c.reachedBy}`).join('\n  ')}`] : []),
    ].join('\n'));
    error.summary = summary;
    if (!survey) throw error;
  }
  if (survey || dryRun) return { manifest, files, summary };
  if (check) {
    const present = (await fs.readdir(output).catch(() => [])).sort(), expected = Object.keys(files).sort();
    if (JSON.stringify(present) !== JSON.stringify(expected)) throw Error(`MCP App card v4 output set changed: ${present.join(',')}. Run scripts/extract-mcp-app-card-v4.mjs.`);
    for (const [name, text] of Object.entries(files))
      if (await fs.readFile(path.join(output, name), 'utf8') !== text) throw Error(`MCP App card v4 source mismatch: ${name}. Run scripts/extract-mcp-app-card-v4.mjs.`);
  } else {
    await fs.mkdir(output, { recursive: true });
    for (const name of await fs.readdir(output)) if (!(name in files)) await fs.rm(path.join(output, name));
    for (const [name, text] of Object.entries(files)) await fs.writeFile(path.join(output, name), text);
  }
  console.log(`${check ? 'Verified' : 'Extracted'} ${manifest.modules.length} MCP App card modules (${summary.statements} original ${referenceVersion} statements) in ${summary.output}.`);
  return { manifest, files, summary };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const survey = process.argv.includes('--survey');
  try {
    const { summary } = await extractMcpAppCardV4({ check: process.argv.includes('--check'), survey, open: process.argv.includes('--open'), dryRun: process.argv.includes('--dry-run') });
    if (survey || process.argv.includes('--dry-run')) console.log(JSON.stringify(summary, null, 1));
  } catch (error) {
    console.error(error.message);
    if (error.summary) console.error(JSON.stringify({ stateConflicts: error.summary.stateConflicts, hostStateConflicts: error.summary.hostStateConflicts }, null, 1));
    process.exitCode = 1;
  }
}
