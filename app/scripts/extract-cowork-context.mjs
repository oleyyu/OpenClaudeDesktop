// w13-coworkui-context (research/w13-coworkui.md §1.2 rows 9-10, cwui-19/20; plan-w13.md "w13-coworkui-context"): extract
// the 3.6556.2 Cowork activity panel's Context section. Own generator, own output folder src/generated/cowork-context, own
// scripts/verify-gen-cowork-context.mjs (found by prepare-ui.mjs, which runs every verify-gen-*.mjs).
//
//   c21f11e6d  TT (the Context section: title "Context" / "Used in this session", the activity list mS with category
//              headers, the empty body CT/wT "Track tools and referenced files used in this task." over the
//              session-context illustration gT, and wT's suggested connectors Kw) and Gw (the "Suggested connectors"
//              card Kw renders: Dismiss, the cycling rows Ww/Uw, "See all connectors"). Both are chunk-internal (the
//              session activity panel AT renders TT; Kw renders Gw).
//
// TT reaches the panel Section (cc5a62f6f L, export t), the activity list mS and its rows, and the illustration pT through
// cowork-progress (linked graph, D1), so the rows, the category headers (Fx), the verbs (Ux) and the "{count}
// connectors" pile (sS) are that graph's single copy. Branches a local session never takes (remote session header action
// Fy and sources _S, mounted projects ww, the kind-grouped rows mw/_w that 3.6556.2 never enables, the directory-backed
// suggestions Kw) are host adapters (src/source-cowork-context-adapters.jsx) answering the original's branch for this
// host; the built-in browser row Ab is cowork-live's slice (linked). The section's data comes from src/cowork-context-model.mjs.
//
// Same engine as extract-cowork-progress.mjs (3.6556.2 rules: R1 constants from official-3.6556.2.mjs; R2/E5 features
// as text or looseFeature; R3 vendor-frame React aliases through official.reactAliases + assertVendorAlias; E3 the React
// Compiler helpers come from view-tabs by semantic name). A binding resolves, in this order, to: a host adapter of this
// graph (its original declaration must carry `features`), a host adapter routines-shared already uses for it, a React
// namespace / alias of vendor-frame, a semantic public name of view-tabs, a binding routines-shared holds, a binding a
// linked graph (cowork-progress, mcp-app-card) holds and exports, or a copy in this graph's module for its chunk. A service
// vendor binding, a class declaration, a dynamic import, a React context another graph holds, or a binding view-tabs holds
// without a semantic name stops generation. --survey prints the closure without writing.
//
// Illustrations: the empty body's art (gT) points at "/images/illustrations/session-context(-dark).svg"; the emitted text
// points at "./images/illustrations/…" (dist/index.html is loaded from file://), and this generator writes the served
// copies from the 3.6556.2 snapshot (--check requires them byte-identical), as extract-cowork-progress.mjs does for its four.
import fs from 'node:fs/promises';
import path from 'node:path';
import { viewTabsManifestFor } from './view-tabs-compat.mjs';
import { routinesSharedManifestFor } from './routines-shared-compat.mjs';
import * as official from './official-3.6556.2.mjs';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { parsers } from '../../tools/node_modules/prettier/plugins/babel.mjs';
import { format } from '../../tools/node_modules/prettier/index.mjs';
import babel from '../../tools/node_modules/playwright/lib/transform/babelBundle.js';

const root = path.resolve(import.meta.dirname, '..');
const referenceVersion = official.referenceVersion;
const referenceSnapshot = official.referenceSnapshot;
const source = official.ionSource;
const output = path.join(root, 'src/generated/cowork-context');
const adapterModule = '../../source-cowork-context-adapters.jsx';
const sharedAdapterModule = '../../source-routines-shared-adapters.jsx';
const sha = bytes => createHash('sha256').update(bytes).digest('hex');

// The roots: chunk -> original local -> { name, export, features }. `features` must appear in the root's prettier form
// (text or looseFeature, R2/E5); `export` is the root's export alias in its chunk when it has one.
const roots = {
  "c21f11e6d-Cyd8_HO8.js": {
    TT: { name: "CoworkContextSection", features: ['defaultMessage: "Used in this session", id: "d2ykzrGcrl"', 'defaultMessage: "Context", id: "Qrvq7+mBse"',
      "contextResourceActivity: y,", "hasContextCardContent: M,", "alwaysShowCategoryHeaders: !0,", "isRemoteSession: s,", "headerLeftAction: R,", "contentClassName: z,"] },
    Gw: { name: "CoworkSuggestedConnectorsCard", features: ['defaultMessage: "Suggested connectors", id: "4lWgUGlrk4"',
      'defaultMessage: "Dismiss suggested connectors", id: "oTpBaPoiSn"', 'defaultMessage: "See all connectors", id: "7fCBPXAUhO"',
      'defaultMessage: "Cowork uses connectors to browse websites, manage tasks, and more.",', "handleSeeAllConnectors: l,", "isCycling: u,"] },
  },
};
const illustrations = ["session-context.svg", "session-context-dark.svg"];
const rewrites = [{ from: '"/images/illustrations/', to: '"./images/illustrations/', reason: 'dist/index.html is loaded from file://' }];
const namespaceImports = { [`${official.vendorFrame}#c`]: "react", [`${official.vendorFrame}#me`]: "react/jsx-runtime", [`${official.vendorFrame}#Hn`]: "react-dom" };
const vendorCopies = {};
const copyableVendors = ["vendor-frame-", "vendor-base-ui-", "vendor-all-0-", "vendor-icons-"];
const adapters = {
  "c21f11e6d-Cyd8_HO8.js": {
    Fy: { name: "CoworkAddFolderAction", features: ["\"session_panel_add_folder\"", "Rt?.grantRemoteSessionFolders"] },
    ww: { name: "CoworkMountedProjects", features: ["defaultMessage: \"Open project\", id: \"fUM67kBzPI\""] },
    _w: { name: "CoworkContextKindGroupsWithBrowser", features: ["{ previewId: i, isPaneOpen: t, onTogglePane: r, ...n } = e"] },
    mw: { name: "CoworkContextKindGroups", features: ["mw = E(pw)"] },
    _S: { name: "CoworkRemoteContextSources", features: ["trustedLocalFolders: r,", "e.folderBasename === void 0"] },
    Kw: { name: "CoworkSuggestedConnectors", features: ["{ source: ju.SuggestedConnectors }", "{ servers: D } = sd(),", "$e = D.length > 0;"] },
  },
};
const rawCallSites = [];
const allowedGlobals = new Set(['Math', 'Number', 'Array', 'Object', 'Error', 'TypeError', 'String', 'Boolean', 'Set', 'Map', 'WeakMap', 'WeakSet', 'JSON',
  'Symbol', 'Promise', 'RegExp', 'Date', 'Intl', 'undefined', 'Infinity', 'NaN', 'globalThis', 'window', 'document', 'navigator', 'console',
  'setTimeout', 'clearTimeout', 'setInterval', 'clearInterval', 'requestAnimationFrame', 'cancelAnimationFrame', 'performance', 'encodeURIComponent', 'decodeURIComponent',
  'URL', 'URLSearchParams', 'parseInt', 'parseFloat', 'isNaN', 'isFinite', 'Reflect', 'Proxy', 'getComputedStyle', 'ResizeObserver', 'AbortController',
  'MutationObserver', 'IntersectionObserver', 'HTMLElement', 'Element', 'Node', 'queueMicrotask', 'structuredClone', 'localStorage', 'sessionStorage',
  'RangeError', 'HTMLButtonElement', 'HTMLInputElement', 'HTMLTextAreaElement', 'SVGElement', 'Event', 'FocusEvent', 'KeyboardEvent',
  'MouseEvent', 'PointerEvent', 'NodeFilter', 'CSS', 'arguments', 'TextEncoder']);

async function readSource(name, cache) {
  if (cache.has(name)) return cache.get(name);
  const bytes = await fs.readFile(path.join(source, name));
  const code = bytes.toString();
  const ast = parsers.babel.parse(code, {});
  const exported = new Map(ast.program.body.filter(n => n.type === 'ExportNamedDeclaration')
    .flatMap(n => n.specifiers.map(s => [s.exported.name, s.local.name])));
  const top = new Map();
  const patternNames = (node, out = []) => {
    if (!node) return out;
    if (node.type === 'Identifier') out.push(node.name);
    else if (node.type === 'ObjectPattern') for (const p of node.properties) patternNames(p.type === 'RestElement' ? p.argument : p.value, out);
    else if (node.type === 'ArrayPattern') for (const e of node.elements) patternNames(e, out);
    else if (node.type === 'AssignmentPattern') patternNames(node.left, out);
    else if (node.type === 'RestElement') patternNames(node.argument, out);
    return out;
  };
  for (const node of ast.program.body) {
    if (node.type === 'ImportDeclaration')
      for (const s of node.specifiers) top.set(s.local.name, { kind: 'import', file: node.source.value.replace(/^\.\//, ''), alias: s.imported?.name ?? 'default' });
    else if (node.type === 'FunctionDeclaration') top.set(node.id.name, { kind: 'function', node });
    else if (node.type === 'VariableDeclaration') {
      for (const d of node.declarations) {
        if (d.id.type === 'Identifier') top.set(d.id.name, { kind: 'var', node: d });
        else for (const n of patternNames(d.id)) top.set(n, { kind: 'pattern', node: d });
      }
    } else if (node.type === 'ClassDeclaration') top.set(node.id.name, { kind: 'class', node });
  }
  const record = { name, bytes, code, ast, exported, top, formatted: new Map(), deps: new Map() };
  cache.set(name, record);
  return record;
}
const declarationText = (src, entry) => src.code.slice(entry.node.start, entry.node.end);
const emittedText = (src, entry) => (entry.kind === 'var' || entry.kind === 'pattern' ? `var ${declarationText(src, entry)};` : declarationText(src, entry));
async function featureText(src, entry) {
  if (!src.formatted.has(entry)) src.formatted.set(entry, await format(emittedText(src, entry), { parser: 'babel' }));
  return src.formatted.get(entry);
}
function declarationDeps(src, name) {
  if (src.deps.has(name)) return src.deps.get(name);
  const entry = src.top.get(name);
  const ast = babel.babelParse(emittedText(src, entry), `${src.name}#${name}`, true);
  let globals;
  babel.traverse(ast, { Program(p) { globals = Object.keys(p.scope.globals); p.stop(); } });
  const deps = globals.filter(n => n !== name && src.top.has(n));
  src.deps.set(name, deps);
  return deps;
}
const normalised = text => text.replace(/\s+/g, ' ');
const looseCache = new Map();
const loose = f => { if (!looseCache.has(f)) looseCache.set(f, official.looseFeature(f)); return looseCache.get(f); };
const featureHit = (text, flat, f) => text.includes(f) || flat.includes(normalised(f)) || loose(f).test(text);
function assertFeatures(label, text, features = []) {
  const flat = normalised(text);
  const missing = features.filter(f => !featureHit(text, flat, f));
  if (missing.length) throw Error(`${label} lacks ${missing.map(f => JSON.stringify(f)).join(', ')}`);
}
async function resolveImport(entry, cache, via) {
  let file = entry.file, alias = entry.alias;
  for (let hops = 0; hops < 8; hops++) {
    const dep = await readSource(file, cache);
    const local = dep.exported.get(alias);
    if (!local) throw Error(`${via}: ${file}:${alias} is not exported`);
    const target = dep.top.get(local);
    if (!target) throw Error(`${via}: ${file}:${alias} (${local}) is not declared`);
    if (target.kind !== 'import') return { file, local };
    file = target.file; alias = target.alias;
  }
  throw Error(`${via}: re-export chain too long`);
}
async function viewTabsGraph() {
  const manifest = await viewTabsManifestFor(referenceVersion);
  if (manifest.referenceVersion !== referenceVersion) throw Error(`view-tabs is ${manifest.referenceVersion}, expected ${referenceVersion}`);
  const published = new Map();
  for (const [name, entry] of Object.entries(manifest.publicNames ?? {})) published.set(`${entry.file}#${entry.local}`, name);
  const held = new Set();
  for (const mod of manifest.modules ?? []) for (const b of mod.bindings ?? []) held.add(`${mod.source}#${typeof b === 'string' ? b : b.name}`);
  const pending = new Map();
  for (const [name, entry] of Object.entries(manifest.pendingNames ?? {})) pending.set(`${entry.file}#${entry.local}`, name);
  return { published, held, pending };
}
// Graphs that already hold bindings this closure reaches (D1: imported, never sliced twice): cowork-progress holds the
// panel Section, the activity list mS (with its rows, category labels and verbs) and the illustration pT; mcp-app-card
// holds shared-7's favicon helpers Hk/… the suggested connector rows use. Only held bindings the linked module exports
// are imported (by its export name); their host adapters are not borrowed. cowork-live (w13-close-gen-dedup,
// coworkui-context-02) holds c21f11e6d Ab, the built-in browser row TT renders (published there as
// CoworkInAppBrowserSection), so the row is that one slice, not a host adapter.
const linkedDirs = ['cowork-progress', 'mcp-app-card', 'cowork-live'];
const linkedBySource = {};
// Bindings a linked graph holds but its module does not export (so this graph copies them): recorded in the manifest as
// pendingDedupe for the holder's generator to export.
const heldUnexported = new Map();
async function linkedGraphs() {
  const held = new Map();
  for (const dir of linkedDirs) {
    const manifest = JSON.parse(await fs.readFile(path.join(root, 'src/generated', dir, 'manifest.json'), 'utf8'));
    if (manifest.referenceVersion !== referenceVersion) throw Error(`${dir} is ${manifest.referenceVersion}, expected ${referenceVersion}`);
    for (const mod of manifest.modules) {
      const exported = await moduleExports(path.join(root, 'src/generated', dir, mod.target));
      for (const b of mod.bindings) {
        const key = `${mod.source}#${b.name}`;
        if (linkedBySource[dir] && !linkedBySource[dir].includes(key)) continue;
        if (!exported.has(b.name) && !linkedBySource[dir]) heldUnexported.set(key, [...(heldUnexported.get(key) ?? []), dir]);
        if (!held.has(key) && exported.has(b.name)) held.set(key, { dir, target: mod.target, ...(linkedBySource[dir] ? { sourceSha256: mod.sourceSha256 } : { sha256: b.sha256 }), exportName: exported.get(b.name) });
      }
    }
  }
  return held;
}
// local -> exported name of a generated module's `export { … }` lists.
async function moduleExports(file) {
  const text = await fs.readFile(file, 'utf8');
  const out = new Map();
  for (const m of text.matchAll(/^export \{([^}]*)\};/gm))
    for (const spec of m[1].split(',').map(x => x.trim()).filter(Boolean)) {
      const [local, as] = spec.split(/\s+as\s+/);
      if (!out.has(local)) out.set(local, as ?? local);
    }
  return out;
}
async function routinesSharedGraph() {
  const manifest = await routinesSharedManifestFor(referenceVersion);
  if (manifest.referenceVersion !== referenceVersion) throw Error(`routines-shared is ${manifest.referenceVersion}, expected ${referenceVersion}`);
  const held = new Map();
  for (const mod of manifest.modules) for (const b of mod.bindings) held.set(`${mod.source}#${b.name}`, { target: mod.target, sha256: b.sha256 });
  const shared = new Map((manifest.adapters ?? []).map(a => [a.original, a.name]));
  return { held, adapters: shared, contexts: new Set(manifest.contexts ?? []) };
}
const moduleName = file => file.replace(/\.js$/, '.mjs');
const reactAlias = (src, local) => [...src.exported].find(([alias, l]) => l === local && Object.hasOwn(official.reactAliases, alias))?.[0];
const applyRewrites = text => rewrites.reduce((t, r) => t.split(r.from).join(r.to), text);

export async function extractCoworkContext({ check = false, survey = false } = {}) {
  const cache = new Map();
  const { published, held, pending } = await viewTabsGraph();
  const rs = await routinesSharedGraph();
  const linked = await linkedGraphs();
  const resolved = new Map();
  const chunks = new Map();
  const used = { adapters: new Set(), sharedAdapters: new Set(), react: new Set(), viewTabs: new Set(), routinesShared: new Set(), linked: new Set() };
  const classify = async key => {
    if (resolved.has(key)) return resolved.get(key);
    const [file, local] = key.split('#');
    const src = await readSource(file, cache);
    const entry = src.top.get(local);
    let result;
    const adapter = adapters[file]?.[local];
    const isRoot = !!roots[file]?.[local];
    if (adapter && !isRoot) {
      if (rs.held.has(key)) throw Error(`adapter ${key}: routines-shared holds this binding; import it, do not replace it`);
      if (!entry || entry.kind === 'import') throw Error(`adapter ${key} is not a declaration`);
      assertFeatures(`adapter ${key}`, await featureText(src, entry), adapter.features);
      for (const [other, features] of Object.entries(adapter.also ?? {})) {
        const also = src.top.get(other);
        if (!also || also.kind === 'import') throw Error(`adapter ${key} pins ${other}, which is not a declaration of ${file}`);
        assertFeatures(`adapter ${key} (${other})`, await featureText(src, also), features);
      }
      result = { kind: 'adapter', name: adapter.name };
    } else if (rs.adapters.has(key) && !isRoot) {
      if (!entry || entry.kind === 'import') throw Error(`shared adapter ${key} is not a declaration`);
      result = { kind: 'shared-adapter', name: rs.adapters.get(key) };
    } else if (namespaceImports[key]) {
      result = { kind: 'react', module: namespaceImports[key], name: '*' };
    } else if (file === official.vendorFrame && !published.has(key) && reactAlias(src, local)) {
      const { module, member } = official.assertVendorAlias(src.code, reactAlias(src, local));
      result = { kind: 'react', module, name: member };
    } else if (published.has(key)) {
      result = { kind: 'view-tabs', name: published.get(key), file };
    } else if (held.has(key)) {
      if (!pending.has(key)) throw Error(`${key} is held by view-tabs without a semantic name; name it in extract-view-tabs.mjs (D46)`);
      result = { kind: 'view-tabs-held', name: local, file, pendingName: pending.get(key) };
    } else if (rs.held.has(key)) {
      const h = rs.held.get(key);
      if (!entry || sha(declarationText(src, entry)) !== h.sha256) throw Error(`${key}: routines-shared holds a different declaration; rerun its generator`);
      result = { kind: 'routines-shared', name: local, target: h.target };
    } else if (linked.has(key)) {
      const h = linked.get(key);
      if (!entry || (h.sourceSha256 ? sha(src.bytes) !== h.sourceSha256 : sha(declarationText(src, entry)) !== h.sha256)) throw Error(`${key}: ${h.dir} holds a different declaration; rerun its generator`);
      result = { kind: 'linked', name: h.exportName, from: `../${h.dir}/${h.target}` };
    } else if (file.startsWith('vendor-') && !vendorCopies[key] && !copyableVendors.some(prefix => file.startsWith(prefix))) {
      throw Error(`${key} is a vendor binding (${entry ? declarationText(src, entry).slice(0, 80) : '?'}); give it an adapter`);
    } else {
      if (!entry) throw Error(`${key} is not declared`);
      if (entry.kind === 'class') throw Error(`${key} is a ${entry.kind} declaration (${declarationText(src, entry).slice(0, 80)}); give it an adapter`);
      if (/\bimport\s*\(/.test(declarationText(src, entry))) throw Error(`${key} has a dynamic import (${declarationText(src, entry).slice(0, 120)}); give it an adapter`);
      if (vendorCopies[key]) assertFeatures(`vendor copy ${key}`, await featureText(src, entry), vendorCopies[key]);
      result = { kind: 'generated', file, local };
    }
    resolved.set(key, result);
    return result;
  };
  const problems = [];
  const parent = new Map();
  const chain = key => { const out = []; for (let k = key; k && out.length < 12; k = parent.get(k)) out.push(k.replace(/-[\w-]{8}\.js#/, '#')); return out.join(' < '); };
  const bucket = kind => ({ adapter: 'adapters', 'shared-adapter': 'sharedAdapters', react: 'react', 'view-tabs': 'viewTabs', 'view-tabs-held': 'viewTabs', 'routines-shared': 'routinesShared', linked: 'linked' })[kind];
  const visit = async (key, from) => {
    if (!parent.has(key)) parent.set(key, from);
    let cls;
    try { cls = await classify(key); } catch (error) { if (!survey) throw error; problems.push(`${error.message}\n      ${chain(key)}`); resolved.set(key, { kind: 'problem' }); return; }
    if (cls.kind === 'problem') return;
    if (cls.kind !== 'generated') { used[bucket(cls.kind)].add(key); return; }
    const { file, local } = cls;
    if (!chunks.has(file)) chunks.set(file, new Set());
    if (chunks.get(file).has(local)) return;
    chunks.get(file).add(local);
    const src = await readSource(file, cache);
    for (const dep of declarationDeps(src, local)) {
      const entry = src.top.get(dep);
      const target = entry.kind === 'import' ? await resolveImport(entry, cache, key) : { file, local: dep };
      await visit(`${target.file}#${target.local}`, key);
    }
  };
  for (const [file, names] of Object.entries(roots)) {
    const src = await readSource(file, cache);
    for (const [local, spec] of Object.entries(names)) {
      const entry = src.top.get(local);
      if (!entry || entry.kind === 'import') throw Error(`root ${file}#${local} is not a declaration`);
      if (spec.export !== undefined && src.exported.get(spec.export) !== local) throw Error(`root ${file}#${local} (${spec.name}) is not exported as ${spec.export}`);
      assertFeatures(`root ${file}#${local} (${spec.name})`, await featureText(src, entry), spec.features);
      await visit(`${file}#${local}`);
    }
  }
  for (const [file, locals] of Object.entries(adapters)) for (const local of Object.keys(locals))
    if (!used.adapters.has(`${file}#${local}`)) { if (!survey) throw Error(`adapter ${file}#${local} is not reached; remove it`); problems.push(`unreached adapter ${file}#${local}`); }

  if (survey) {
    for (const p of problems) console.log('PROBLEM', p);
    for (const [file, locals] of chunks) console.log('CHUNK', file, [...locals].join(' '));
    for (const [k, set] of Object.entries(used)) console.log('USED', k, [...set].map(key => `${key}=>${resolved.get(key).name}`).join(' '));
    return null;
  }
  const files = {};
  const manifest = {
    referenceVersion, referenceSnapshot, generator: 'scripts/extract-cowork-context.mjs', adapterModule: 'src/source-cowork-context-adapters.jsx',
    sharedAdapterModule: 'src/source-routines-shared-adapters.jsx', publicNames: {}, modules: [], contexts: [], callSites: [], rewrites, illustrations: [],
  };
  const createContextKeys = new Set([...used.react].filter(k => resolved.get(k).name === 'createContext'));
  const moduleGraph = new Map();
  const unboundGlobals = [];
  for (const [file, locals] of [...chunks].sort((a, b) => a[0].localeCompare(b[0]))) {
    const src = await readSource(file, cache);
    const order = [...locals].map(l => [l, src.top.get(l)]).sort((a, b) => a[1].node.start - b[1].node.start);
    const imports = new Map();
    for (const [local] of order) {
      for (const dep of declarationDeps(src, local)) {
        if (locals.has(dep) && src.top.get(dep).kind !== 'import') continue;
        const entry = src.top.get(dep);
        const target = entry.kind === 'import' ? await resolveImport(entry, cache, `${file}#${local}`) : { file, local: dep };
        const key = `${target.file}#${target.local}`;
        const cls = resolved.get(key);
        let spec;
        if (cls.kind === 'adapter') spec = { from: adapterModule, name: cls.name, kind: 'adapter' };
        else if (cls.kind === 'shared-adapter') spec = { from: sharedAdapterModule, name: cls.name, kind: 'shared-adapter' };
        else if (cls.kind === 'react') spec = { from: cls.module, name: cls.name, kind: 'react' };
        else if (cls.kind === 'view-tabs' || cls.kind === 'view-tabs-held') spec = { from: `../view-tabs/${cls.file}`, name: cls.name, kind: cls.kind };
        else if (cls.kind === 'routines-shared') spec = { from: `../routines-shared/${cls.target}`, name: cls.name, kind: 'routines-shared' };
        else if (cls.kind === 'linked') spec = { from: cls.from, name: cls.name, kind: 'linked' };
        else if (cls.kind === 'generated') {
          if (cls.file === file) throw Error(`${file}#${dep} resolves to its own chunk but is not selected`);
          spec = { from: `./${moduleName(cls.file)}`, name: cls.local, kind: 'generated' };
        } else throw Error(`${key}: unresolved (${cls.kind})`);
        const prev = imports.get(dep);
        if (prev && (prev.from !== spec.from || prev.name !== spec.name)) throw Error(`${file}#${dep} resolves two ways`);
        imports.set(dep, { ...spec, via: key });
      }
    }
    for (const [local, entry] of order) {
      const init = entry.kind === 'var' ? entry.node.init : null;
      if (init?.type !== 'CallExpression' || init.callee.type !== 'Identifier') continue;
      const callee = init.callee.name;
      const calleeEntry = src.top.get(callee);
      if (!calleeEntry) continue;
      const target = calleeEntry.kind === 'import' ? await resolveImport(calleeEntry, cache, `${file}#${local}`) : { file, local: callee };
      if (createContextKeys.has(`${target.file}#${target.local}`)) {
        if (held.has(`${file}#${local}`) || rs.held.has(`${file}#${local}`) || linked.has(`${file}#${local}`)) throw Error(`${file}#${local} is a context another graph holds; it must be imported, not copied`);
        manifest.contexts.push(`${file}#${local}`);
      }
    }
    const groups = new Map();
    const namespaceLines = [];
    for (const [local, spec] of imports) {
      if (spec.name === '*') { namespaceLines.push(`import * as ${local} from ${JSON.stringify(spec.from)};`); continue; }
      if (!groups.has(spec.from)) groups.set(spec.from, []);
      groups.get(spec.from).push(spec.name === local ? local : `${spec.name} as ${local}`);
    }
    moduleGraph.set(moduleName(file), [...groups.keys()].filter(f => f.startsWith('./')).map(f => f.slice(2)));
    const importText = [...groups].sort((a, b) => a[0].localeCompare(b[0]))
      .map(([from, names]) => `import { ${names.sort().join(', ')} } from ${JSON.stringify(from)};`).concat(namespaceLines.sort()).join('\n');
    const emittedNodes = new Set();
    const blocks = order.filter(([, entry]) => !emittedNodes.has(entry.node) && emittedNodes.add(entry.node)).map(([, entry]) => applyRewrites(emittedText(src, entry)));
    const exportText = `export { ${order.map(([l]) => l).join(', ')} };`;
    const header = `// Original Claude Desktop ${referenceVersion} bindings from ${file}; generated by extract-cowork-context.mjs.\n// Edit the extractor or src/source-cowork-context-adapters.jsx, never this file.\n`;
    const target = moduleName(file);
    const text = await format(`${header}${importText}\n${blocks.join('\n')}\n${exportText}\n`, { parser: 'babel' });
    const closed = babel.babelParse(text, target, true);
    let globals;
    babel.traverse(closed, { Program(p) { globals = Object.keys(p.scope.globals); p.stop(); } });
    const unbound = globals.filter(name => !allowedGlobals.has(name));
    if (unbound.length) unboundGlobals.push(`${target}: ${unbound.join(', ')}`);
    files[target] = text;
    manifest.modules.push({
      target, source: file, sourceSha256: sha(src.bytes), sha256: sha(text), referenceVersion,
      bindings: order.map(([name, entry]) => ({ name, sha256: sha(declarationText(src, entry)) })),
      imports: [...imports].map(([local, e]) => ({ local, from: e.from, name: e.name, kind: e.kind, via: e.via })),
    });
  }
  if (unboundGlobals.length) throw Error(`unbound globals:\n${unboundGlobals.join('\n')}`);
  const state = new Map();
  const walk = (name, trail) => {
    if (state.get(name) === 'done') return;
    if (state.get(name) === 'open') throw Error(`module cycle: ${[...trail, name].join(' -> ')}`);
    state.set(name, 'open');
    for (const next of moduleGraph.get(name) ?? []) walk(next, [...trail, name]);
    state.set(name, 'done');
  };
  for (const name of moduleGraph.keys()) walk(name, []);
  for (const rewrite of rewrites) {
    const hits = Object.values(files).reduce((n, text) => n + text.split(rewrite.to).length - 1, 0);
    if (!hits) throw Error(`rewrite ${rewrite.from} -> ${rewrite.to} no longer applies; remove it`);
    if (Object.values(files).some(text => text.includes(rewrite.from))) throw Error(`rewrite ${rewrite.from} left behind`);
  }
  const emittedText_ = Object.values(files).join('\n');
  const illustrationBytes = new Map();
  for (const name of illustrations) {
    const bytes = await fs.readFile(path.resolve(source, '../../images/illustrations', name));
    illustrationBytes.set(name, bytes);
    const served = await fs.readFile(path.join(root, 'public/images/illustrations', name)).catch(() => null);
    if (check && (!served || sha(served) !== sha(bytes))) throw Error(`public/images/illustrations/${name} is not the ${referenceVersion} file. Run scripts/extract-cowork-context.mjs.`);
    if (!emittedText_.includes(`"./images/illustrations/${name}"`)) throw Error(`illustration ${name} is no longer referenced; remove it`);
    manifest.illustrations.push({ path: `images/illustrations/${name}`, source: `ion-dist/images/illustrations/${name}`, sha256: sha(bytes) });
  }
  const indexLines = [];
  for (const [file, names] of Object.entries(roots)) {
    const groups = new Map();
    for (const [local, spec] of Object.entries(names)) {
      const cls = resolved.get(`${file}#${local}`);
      const from = cls?.kind === 'generated' ? `./${moduleName(file)}` : cls?.kind === 'routines-shared' ? `../routines-shared/${cls.target}` : null;
      if (!from) throw Error(`root ${file}#${local} (${spec.name}) is answered by ${cls?.kind}; import it from there instead`);
      manifest.publicNames[spec.name] = { file, local, ...(spec.export !== undefined && { export: spec.export }), ...(cls.kind === 'routines-shared' && { routinesShared: cls.target }) };
      if (!groups.has(from)) groups.set(from, []);
      groups.get(from).push(`${local} as ${spec.name}`);
    }
    for (const [from, specs] of groups) indexLines.push(`export { ${specs.join(', ')} } from "${from}";`);
  }
  files['index.mjs'] = await format(`// Semantic names for the cowork-context roots; generated by extract-cowork-context.mjs.\n${indexLines.join('\n')}\n`, { parser: 'babel' });
  manifest.adapters = [];
  for (const [file, locals] of Object.entries(adapters)) for (const [local, spec] of Object.entries(locals))
    manifest.adapters.push({ original: `${file}#${local}`, name: spec.name });
  manifest.sharedAdapters = [...used.sharedAdapters].sort().map(original => ({ original, name: rs.adapters.get(original) }));
  manifest.routinesSharedImports = used.routinesShared.size;
  manifest.pendingDedupe = manifest.modules.flatMap(mod => mod.bindings.map(b => `${mod.source}#${b.name}`))
    .filter(key => heldUnexported.has(key) && !linked.has(key)).sort().map(original => ({ original, holder: heldUnexported.get(original) }));
  manifest.linkedImports = [...used.linked].sort().map(key => ({ original: key, from: resolved.get(key).from, name: resolved.get(key).name }));
  for (const site of rawCallSites) {
    const bytes = (await readSource(site.source, cache)).bytes;
    const text = bytes.toString();
    for (const feature of site.features) {
      const count = typeof feature === 'string' ? text.split(feature).length - 1 : [...text.matchAll(official.looseFeature(feature.loose, { flags: 'g' }))].length;
      if (count !== 1) throw Error(`call site ${site.source} (raw): ${JSON.stringify(feature)} occurs ${count} times, expected 1`);
    }
    manifest.callSites.push({ source: site.source, role: site.role, sourceSha256: sha(bytes), raw: true, features: site.features });
  }
  files['manifest.json'] = JSON.stringify(manifest, null, 2) + '\n';
  if (check) {
    const present = (await fs.readdir(output).catch(() => [])).sort(), expected = Object.keys(files).sort();
    if (JSON.stringify(present) !== JSON.stringify(expected)) throw Error(`Cowork context output set changed: ${present.join(',')}. Run scripts/extract-cowork-context.mjs.`);
    for (const [name, text] of Object.entries(files))
      if (await fs.readFile(path.join(output, name), 'utf8') !== text) throw Error(`Cowork context source mismatch: ${name}. Run scripts/extract-cowork-context.mjs.`);
  } else {
    await fs.mkdir(output, { recursive: true });
    for (const name of await fs.readdir(output)) if (!(name in files)) await fs.rm(path.join(output, name));
    for (const [name, text] of Object.entries(files)) await fs.writeFile(path.join(output, name), text);
    const served = path.join(root, 'public/images/illustrations');
    await fs.mkdir(served, { recursive: true });
    for (const [name, bytes] of illustrationBytes) await fs.writeFile(path.join(served, name), bytes);
  }
  const count = manifest.modules.reduce((n, m) => n + m.bindings.length, 0);
  console.log(`${check ? 'Verified' : 'Extracted'} ${manifest.modules.length} cowork context modules (${count} original ${referenceVersion} bindings, ${Object.keys(manifest.publicNames).length} roots, ${manifest.adapters.length} adapters, ${manifest.sharedAdapters.length} shared adapters, ${used.routinesShared.size} routines-shared imports, ${used.linked.size} linked imports).`);
  return manifest;
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url))
  await extractCoworkContext({ check: process.argv.includes('--check'), survey: process.argv.includes('--survey') });
