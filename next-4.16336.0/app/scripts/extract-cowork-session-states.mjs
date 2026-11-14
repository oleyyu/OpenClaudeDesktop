// w13-coworkui-session-states (research/w13-coworkui.md cwui-26, plan-w13.md "w13-coworkui-session-states"): extract the
// 3.6556.2 Cowork session "ended notice" — the block CoworkSessionView (c21f11e6d) hands its transcript as `endedNotice`,
// which ca2ef848d renders in place of the composer (`f("div",{ref:Wn,className:"px-2 md:px-0
// in-data-cds-dock-masked:bg-page",children:hn})`). Own generator, own output folder src/generated/cowork-session-states,
// own scripts/verify-gen-cowork-session-states.mjs (found by prepare-ui.mjs).
//
//   c21f11e6d  EM (the notice: data-testid "cowork-session-ended-notice"; "This task is read-only" / "This task is
//              archived" / "This task has ended", the org / role off texts, "Unarchive task", "New task"), TM (the
//              read_only -> failed fallback CoworkSessionView applies before rendering it). Both chunk-internal.
//   reached    shared-18 wq (the Cowork session action error toasts, "Couldn’t unarchive this task. Try again."),
//              shared-8 Ux (the window drop guard while the notice is up), shared-2 B5 ("data-composer-stand-in").
//
// Same engine as extract-cowork-progress.mjs (3.6556.2 rules: R1 constants from official-3.6556.2.mjs; R2/E5 features
// as text or looseFeature; R3 vendor-frame React aliases through official.reactAliases + assertVendorAlias; E3 the React
// Compiler helpers come from view-tabs by semantic name). A binding resolves, in this order, to: a host adapter of this
// graph (src/source-cowork-session-states-adapters.jsx; its original declaration must carry `features`), a host adapter
// routines-shared already uses for it (useIntl / FormattedMessage / useErrors / usePathname), a React alias of
// vendor-frame, a semantic public name of view-tabs (CdsButton), a binding routines-shared holds (shared-78 yG, the
// gated "secret:" message), a binding a linked graph holds (cowork-scheduled: shared-104 dP, D1), or a copy in this
// graph's module for its chunk. A service vendor binding, a class declaration, a dynamic import, a React context another
// graph holds, or a binding view-tabs holds without a semantic name stops generation. --survey prints the closure
// without writing.
//
// Two source contracts, two outputs (region batch 3 of the 4.16336.0 migration, region-plan G6 / cutover):
//   3.6556.2   src/generated/cowork-session-states: the production graph. session-rail (3.6556.2, region-plan
//              cutover.oldConsumersAtGeneration) links it by original identity (band-frame.mjs), so it stays on
//              3.6556.2, byte for byte, until session-rail moves (productionSwitchNotBeforeBatch 6). Its contract below
//              is the one this generator always had; its output is unchanged.
//   4.16336.0  src/generated/cowork-session-states-v4: the same two semantic roots cut from the frozen 4.16336.0 snapshot
//              (c21f11e6d-Cyj5xu_D.js SN / xN), each the only top-level declaration of its chunk carrying its features
//              (AST, prettier form of the whole chunk). Nothing imports it until the cutover. Resolution order: an own
//              host adapter (pinned to the 4.16336.0 original), a host adapter routines-shared-v4 records for that very
//              original (src/source-routines-shared-adapters.jsx), then the shared CDS graph cds-core (sharedGraph
//              'cds-core'): a React alias of vendor-frame, a cds-core publicName (its raw declaration must hash as
//              cds-core's, recorded as linkedSha256); then a binding routines-shared-v4 holds (the dependency region,
//              4.16336.0 staging: imported from its chunk module under the original local, module bytes / source hash /
//              declaration hash checked, D1: never sliced twice); then a binding cds-core holds without a publicName, cut
//              again only when it is pure and hashes the same (heldByCdsCore) — module state held that way stops
//              generation and is reported (error.stateConflicts {binding, heldBy, kind, text, reachedBy}, D46); then a
//              copy here. A stateful binding (Map / Set / WeakMap / WeakSet, React context, or a module binding its chunk
//              writes after declaring it) that another 4.16336.0 graph under src/generated already cuts is reported as
//              d1Pending (survey / manifest-free; the region report records it until cds-core wave 5 publishes it).
//              manifest.sharedGraphModules / linkedGraphModules pin the bytes of every cds-core / routines-shared-v4
//              module linked, so a regeneration there must be followed by a rerun here and --check.
//
// `node scripts/extract-cowork-session-states.mjs [--check] [--survey] [--version <v>]`: without --version, the 3.6556.2
// production contract and then the 4.16336.0 isolated contract.
import fs from 'node:fs/promises';
import path from 'node:path';
import { viewTabsManifestFor } from './view-tabs-compat.mjs';
import { routinesSharedManifestFor } from './routines-shared-compat.mjs';
import * as official3 from './official-3.6556.2.mjs';
import * as official4 from './official-4.16336.0.mjs';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { parsers } from '../../tools/node_modules/prettier/plugins/babel.mjs';
import { format } from '../../tools/node_modules/prettier/index.mjs';
import babel from '../../tools/node_modules/playwright/lib/transform/babelBundle.js';

const root = path.resolve(import.meta.dirname, '..');
const generatedRoot = path.join(root, 'src/generated');
const adapterModule = '../../source-cowork-session-states-adapters.jsx';
const sharedAdapterModule = '../../source-routines-shared-adapters.jsx';
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
// region-plan cowork-session-states cutover.oldConsumersAtGeneration: the 3.6556.2 areas that link the production graph.
export const legacyConsumers = Object.freeze(['session-rail']);

// ── 3.6556.2: the production graph (unchanged contract, byte-identical output) ──────────────────────────────────────
const legacy = (() => {
  const official = official3;
// The roots: chunk -> original local -> { name, export, features }. `features` must appear in the root's prettier form
// (text or looseFeature, R2/E5); `export` is the root's export alias in its chunk when it has one.
const roots = {
  'c21f11e6d-Cyd8_HO8.js': {
    EM: { name: 'CoworkSessionEndedNotice', features: ['"data-testid": "cowork-session-ended-notice"',
      '"flex flex-col gap-4 rounded-t-xl border-0.5 bg-surface-1 p-6 font-sans text-secondary sm:flex-row sm:items-center sm:justify-between"',
      'r = t === "cowork_off" || t === "cowork_off_role" || t === "cowork_cloud_off_role" || t === "hub_off_role",',
      'defaultMessage: "This task is read-only", id: "SX9PdEMtWE"', 'defaultMessage: "This task is archived", id: "4X+u5HHdgl"',
      'defaultMessage: "This task has ended", id: "POtKzYuLZu"', 'id: "mgOxD3x0rc"', 'id: "gcSc6XaNBz"', 'id: "H7Npp95P96"',
      'defaultMessage: "Unarchive task", id: "AXO+OS7yXO"', 'defaultMessage: "New task", id: "K4O03zh0vo"',
      '"cowork ended-notice unarchive failed"', 'variant: t === "archived" && n ? "secondary" : "primary",'] },
    TM: { name: 'coworkEndedReason', features: ['return e === "read_only" ? (t ? "read_only" : "failed") : e;'] },
  },
};
// vendor-frame's CommonJS interop namespaces for React itself map to namespace imports, never to a copy.
const namespaceImports = { [`${official.vendorFrame}#c`]: 'react', [`${official.vendorFrame}#me`]: 'react/jsx-runtime', [`${official.vendorFrame}#Hn`]: 'react-dom' };
// Pure vendor declarations this graph may copy (chunk#local -> features).
const vendorCopies = {};
// The UI library chunks view-tabs also copies from (Base UI, clsx, zustand). Service / data vendors are never copied.
const copyableVendors = ['vendor-frame-', 'vendor-base-ui-', 'vendor-all-0-', 'vendor-icons-'];
// Host services of this graph: chunk -> original local -> { name, features, also }. Each one is documented where it is
// implemented (src/source-cowork-session-states-adapters.jsx).
const adapters = {
  // The "New task" href (shared-78 Uy: the hub look's "/new", else Wy: the iframe "/task/new" or "/new?surface=cowork").
  'shared-78-D5Fw2h0a.js': {
    Uy: { name: 'useNewTaskHref', features: ['return Vy() ? "/new" : Wy();'], also: { Wy: ['return H() ? Qi : Ei;'] } },
  },
};
// Raw minified text the host follows (each must occur exactly once; `{ loose }` through looseFeature).
// The composer slot CoworkSessionView's endedNotice replaces (ca2ef848d; the host renders the same stand-in wrapper) and
// the archived restore it passes (c21f11e6d: the notice gets onRestore only for an archived session).
const rawCallSites = [
  { source: 'ca2ef848d-ChLvq6yZ.js', role: 'The ended notice replaces the composer inside the official stand-in wrapper',
    features: ['className:"px-2 md:px-0 in-data-cds-dock-masked:bg-page"'] },
  { source: 'c21f11e6d-Cyd8_HO8.js', role: 'An archived session clears endedReason / isArchived after a successful unarchive',
    features: [{ loose: 'patchSession(X,{endedReason:void 0,isArchived:!1})' }] },
];
const allowedGlobals = new Set(['Math', 'Number', 'Array', 'Object', 'Error', 'TypeError', 'String', 'Boolean', 'Set', 'Map', 'WeakMap', 'WeakSet', 'JSON',
  'Symbol', 'Promise', 'RegExp', 'Date', 'Intl', 'undefined', 'Infinity', 'NaN', 'globalThis', 'window', 'document', 'navigator', 'console',
  'setTimeout', 'clearTimeout', 'setInterval', 'clearInterval', 'requestAnimationFrame', 'cancelAnimationFrame', 'performance', 'encodeURIComponent', 'decodeURIComponent',
  'URL', 'URLSearchParams', 'parseInt', 'parseFloat', 'isNaN', 'isFinite', 'Reflect', 'Proxy', 'getComputedStyle', 'ResizeObserver', 'AbortController',
  'MutationObserver', 'IntersectionObserver', 'HTMLElement', 'Element', 'Node', 'queueMicrotask', 'structuredClone', 'localStorage', 'sessionStorage',
  'RangeError', 'HTMLButtonElement', 'HTMLInputElement', 'HTMLTextAreaElement', 'SVGElement', 'Event', 'FocusEvent', 'KeyboardEvent',
  'MouseEvent', 'PointerEvent', 'NodeFilter', 'CSS', 'arguments']);
  return { official, output: path.join(root, 'src/generated/cowork-session-states'), roots, namespaceImports, vendorCopies, copyableVendors,
    adapters, rawCallSites, allowedGlobals, linkedDirs: ['cowork-scheduled'] };
})();

// ── 4.16336.0: the isolated graph (src/generated/cowork-session-states-v4) ──────────────────────────────────────────
const target4 = (() => {
  const official = official4;
  // The same two roots, now c21f11e6d-Cyj5xu_D.js SN / xN (both still chunk-internal: export null). 4.16336.0 adds a
  // `read_only` branch (the gated messages zr: title bN, body "xq7bz7", the "/upgrade?feature=cowork…&returnTo=" button
  // "1edigmz" over the current pathname) and renames the "New task" message id (K4O03zh0vo -> ziKnROhlML).
  const roots = {
    'c21f11e6d-Cyj5xu_D.js': {
      SN: { name: 'CoworkSessionEndedNotice', export: null, features: ['"data-testid": "cowork-session-ended-notice"',
        '"flex flex-col gap-4 rounded-t-xl border-0.5 bg-surface-1 p-6 font-sans text-secondary sm:flex-row sm:items-center sm:justify-between"',
        'r = t === "cowork_off" || t === "cowork_off_role" || t === "cowork_cloud_off_role" || t === "hub_off_role",',
        'defaultMessage: "This task is read-only", id: "SX9PdEMtWE"', 'defaultMessage: "This task is archived", id: "4X+u5HHdgl"',
        'defaultMessage: "This task has ended", id: "POtKzYuLZu"', 'id: "mgOxD3x0rc"', 'id: "WGCQVy+0Y4"', 'id: "/xtcJzrGDc"', 'id: "gSJcYMkiVL"',
        'id: "gcSc6XaNBz"', 'id: "H7Npp95P96"', 'defaultMessage: "Unarchive task", id: "AXO+OS7yXO"', 'defaultMessage: "New task", id: "ziKnROhlML"',
        '"cowork ended-notice unarchive failed"', 'variant: t === "archived" && n ? "secondary" : "primary",',
        '`/upgrade?feature=cowork&hide_free=true&returnTo=${encodeURIComponent(a)}`', 'id: "xq7bz7"', 'id: "1edigmz"'] },
      xN: { name: 'coworkEndedReason', export: null, features: ['return e === "read_only" ? (t ? "read_only" : "failed") : e;'] },
    },
  };
  const vendorCopies = {};
  // The same host service as 3.6556.2 under the same adapter name, pinned to the 4.16336.0 original it replaces.
  // shared-123 h_ is 3.6556.2 shared-78 Uy: the hub look's "/new" (p_: mode "c3" with hubLook), else g_: the iframe
  // "/task/new" (shared-62 Ul) or "/new?surface=cowork" (shared-62 Gl). The host answers Gl, as before.
  const adapters = {
    'shared-123-1Hc1RTKl.js': {
      h_: { name: 'useNewTaskHref', features: ['return p_() ? "/new" : g_();'], also: { g_: ['return Ih() ? ti : Qi;'] } },
    },
  };
  // The same two raw sites as 3.6556.2 (ca2ef848d's composer stand-in wrapper, c21f11e6d's archived restore), plus how
  // CoworkSessionView renders the notice in 4.16336.0: a read-only session shows xN(reason, flag) without a restore; an
  // archived one gets onRestore only when the session can be restored (new third condition, mc(Z)).
  const rawCallSites = [
    { source: 'ca2ef848d-DA54buzo.js', role: 'The ended notice replaces the composer inside the official stand-in wrapper',
      features: ['className:"px-2 md:px-0 in-data-cds-dock-masked:bg-page"'] },
    { source: 'c21f11e6d-Cyj5xu_D.js', role: 'An archived session clears endedReason / isArchived after a successful unarchive',
      features: [{ loose: 'patchSession(X,{endedReason:void 0,isArchived:!1})' }] },
    { source: 'c21f11e6d-Cyj5xu_D.js', role: 'Read-only sessions render the notice for xN(reason, flag) without onRestore; archived ones pass onRestore only when the session is archived, restorable (onUnarchive) and mc(id) holds',
      features: [{ loose: 'K2($,608,b,Rc,xN(b,Rc))' }, { loose: 'p(SN,{reason:e},Z)' }, { loose: 'Oa==="archived"&&zo&&mc(Z)?async()=>{try{await zo(Z)}catch(e){let t=e;throw Gs(Z),t}' },
        { loose: 'p(SN,{reason:Oa,onRestore:e},Z)' }] },
  ];
  return { official, output: path.join(root, 'src/generated/cowork-session-states-v4'), sharedGraph: 'cds-core', uniqueRoots: true,
    dependencyGraph: 'routines-shared-v4',
    isolatedGraph: { productionOutput: 'src/generated/cowork-session-states', productionSwitchNotBeforeBatch: 6, heldBy: legacyConsumers },
    roots, namespaceImports: {}, vendorCopies, copyableVendors: [], adapters, rawCallSites, allowedGlobals: legacy.allowedGlobals };
})();

export const contracts = Object.freeze({ [official3.referenceVersion]: legacy, [official4.referenceVersion]: target4 });
export const contractVersions = Object.freeze(Object.keys(contracts));

async function readSource(source, name, cache) {
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
// 4.16336.0 root location: the prettier form of every top-level function / identifier declaration of the chunk (the
// whole chunk formatted once), so a root can be proved to be the only declaration carrying its features.
async function chunkDeclarations(src) {
  if (src.declarations) return src.declarations;
  const code = await format(src.code, { parser: 'babel' });
  const out = new Map();
  for (const node of parsers.babel.parse(code, {}).program.body) {
    if (node.type === 'FunctionDeclaration') out.set(node.id.name, code.slice(node.start, node.end));
    else if (node.type === 'VariableDeclaration')
      for (const d of node.declarations) if (d.id.type === 'Identifier') out.set(d.id.name, `var ${code.slice(d.start, d.end)};`);
  }
  src.declarations = out;
  return out;
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
// A feature looseFeature() cannot tokenise is matched as text only.
const loose = (official, f) => {
  const key = `${official.referenceVersion}\0${f}`;
  if (!looseCache.has(key)) { let pattern = null; try { pattern = official.looseFeature(f); } catch { /* text only */ } looseCache.set(key, pattern); }
  return looseCache.get(key);
};
const featureHit = (official, text, flat, f) => text.includes(f) || flat.includes(normalised(f)) || !!loose(official, f)?.test(text);
function assertFeatures(official, label, text, features = []) {
  const flat = normalised(text);
  const missing = features.filter(f => !featureHit(official, text, flat, f));
  if (missing.length) throw Error(`${label} lacks ${missing.map(f => JSON.stringify(f)).join(', ')}`);
}
async function resolveImport(source, entry, cache, via) {
  let file = entry.file, alias = entry.alias;
  for (let hops = 0; hops < 8; hops++) {
    const dep = await readSource(source, file, cache);
    const local = dep.exported.get(alias);
    if (!local) throw Error(`${via}: ${file}:${alias} is not exported`);
    const target = dep.top.get(local);
    if (!target) throw Error(`${via}: ${file}:${alias} (${local}) is not declared`);
    if (target.kind !== 'import') return { file, local };
    file = target.file; alias = target.alias;
  }
  throw Error(`${via}: re-export chain too long`);
}
// The resolved bindings ("file#local") a top-level declaration reads directly.
async function readsOf(source, src, name, cache) {
  const out = new Set();
  for (const dep of declarationDeps(src, name)) {
    const entry = src.top.get(dep);
    const target = entry.kind === 'import' ? await resolveImport(source, entry, cache, `${src.name}#${name}`) : { file: src.name, local: dep };
    out.add(`${target.file}#${target.local}`);
  }
  return out;
}
// 4.16336.0: the root is the only top-level declaration of its chunk that carries every feature (and reads every binding
// in `reads`, resolved "file#local").
async function assertUniqueRoot(official, label, src, name, features = [], { reads = [], source, cache } = {}) {
  if (!features.length) throw Error(`${label}: root ${name} has no features to locate it by`);
  const hits = [];
  for (const [other, text] of await chunkDeclarations(src)) {
    const flat = normalised(text);
    if (!features.every(f => featureHit(official, text, flat, f))) continue;
    if (reads.length) {
      const read = await readsOf(source, src, other, cache);
      if (!reads.every(key => read.has(key))) continue;
    }
    hits.push(other);
  }
  if (hits.length !== 1 || hits[0] !== name) throw Error(`${label}: root ${name} is not the unique declaration of ${src.name} with its features (${hits.join(', ') || 'none'})`);
}
async function viewTabsGraph(official) {
  const manifest = await viewTabsManifestFor(official.referenceVersion);
  if (manifest.referenceVersion !== official.referenceVersion) throw Error(`view-tabs is ${manifest.referenceVersion}, expected ${official.referenceVersion}`);
  const published = new Map();
  for (const [name, entry] of Object.entries(manifest.publicNames ?? {})) published.set(`${entry.file}#${entry.local}`, name);
  const held = new Set();
  for (const mod of manifest.modules ?? []) for (const b of mod.bindings ?? []) held.add(`${mod.source}#${typeof b === 'string' ? b : b.name}`);
  const pending = new Map();
  for (const [name, entry] of Object.entries(manifest.pendingNames ?? {})) pending.set(`${entry.file}#${entry.local}`, name);
  return { published, held, pending };
}
// Graphs that already hold bindings this closure reaches (D1: imported, never sliced twice). cowork-scheduled holds
// shared-104 dP (`e?.[lP] === !0`, lP "elevatedAuthGateHandled": wq's Tu skips an error the auth gate already handled).
// Only held bindings the linked module exports are imported (by its export name); their host adapters are not borrowed.
async function linkedGraphs(official, dirs) {
  const held = new Map();
  for (const dir of dirs) {
    const manifest = JSON.parse(await fs.readFile(path.join(root, 'src/generated', dir, 'manifest.json'), 'utf8'));
    if (manifest.referenceVersion !== official.referenceVersion) throw Error(`${dir} is ${manifest.referenceVersion}, expected ${official.referenceVersion}`);
    for (const mod of manifest.modules) {
      const exported = await moduleExports(path.join(root, 'src/generated', dir, mod.target));
      for (const b of mod.bindings) {
        const key = `${mod.source}#${b.name}`;
        if (!held.has(key) && exported.has(b.name)) held.set(key, { dir, target: mod.target, sha256: b.sha256, exportName: exported.get(b.name) });
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
async function routinesSharedGraph(official) {
  const manifest = await routinesSharedManifestFor(official.referenceVersion);
  if (manifest.referenceVersion !== official.referenceVersion) throw Error(`routines-shared is ${manifest.referenceVersion}, expected ${official.referenceVersion}`);
  const held = new Map();
  for (const mod of manifest.modules) for (const b of mod.bindings) held.set(`${mod.source}#${b.name}`, { target: mod.target, sha256: b.sha256 });
  const shared = new Map((manifest.adapters ?? []).map(a => [a.original, a.name]));
  return { held, adapters: shared, contexts: new Set(manifest.contexts ?? []) };
}
// 4.16336.0 dependency region (routines-shared-v4, staging): its manifest is on this version and snapshot, every module's
// bytes equal its recorded sha256 and were cut from the official chunk this generator reads, and each module exports
// every binding it holds under the original local name (checked when a binding is imported). Its adapters are the host
// adapters it records for 4.16336.0 originals (same module, src/source-routines-shared-adapters.jsx).
async function dependencyGraph(official, area) {
  const dir = path.join(generatedRoot, area);
  const manifest = JSON.parse(await fs.readFile(path.join(dir, 'manifest.json'), 'utf8'));
  if (manifest.referenceVersion !== official.referenceVersion || manifest.referenceSnapshot !== official.referenceSnapshot)
    throw Error(`${area} is ${manifest.referenceVersion} ${manifest.referenceSnapshot}, expected ${official.referenceVersion} ${official.referenceSnapshot}`);
  if (manifest.adapterModule !== 'src/source-routines-shared-adapters.jsx') throw Error(`${area} adapters live in ${manifest.adapterModule}`);
  const held = new Map(), modules = new Map();
  for (const m of manifest.modules) {
    const text = await fs.readFile(path.join(dir, m.target), 'utf8');
    const moduleSha256 = sha(text);
    if (moduleSha256 !== m.sha256) throw Error(`${area}/${m.target} differs from its manifest; run its generator`);
    const bytes = await fs.readFile(path.join(official.ionSource, m.source)).catch(() => null);
    if (!bytes || sha(bytes) !== m.sourceSha256) throw Error(`${area}/${m.target} was cut from another ${m.source}; run its generator`);
    modules.set(m.target, { ...m, text });
    for (const b of m.bindings) held.set(`${m.source}#${b.name}`, { area, target: m.target, sha256: b.sha256 });
  }
  return { area, held, modules, adapters: new Map((manifest.adapters ?? []).map(a => [a.original, a.name])), contexts: new Set(manifest.contexts ?? []) };
}
// sharedGraph 'cds-core' (4.16336.0): the manifest is on this version and snapshot, every module's bytes equal its
// recorded sha256 and its sourceSha256 equals the official chunk this generator reads, and every publicName is a
// binding its target module exports under exportName (as extract-routines-shared.mjs reads it).
async function cdsCoreGraph(official, area) {
  const dir = path.join(generatedRoot, area);
  const manifestBytes = await fs.readFile(path.join(dir, 'manifest.json'));
  const manifest = JSON.parse(manifestBytes);
  if (manifest.referenceVersion !== official.referenceVersion) throw Error(`${area} is ${manifest.referenceVersion}, expected ${official.referenceVersion}`);
  if (manifest.referenceSnapshot !== official.referenceSnapshot) throw Error(`${area} snapshot is ${manifest.referenceSnapshot}, expected ${official.referenceSnapshot}`);
  const modules = new Map(), held = new Map(), published = new Map();
  for (const m of manifest.modules) {
    if ((m.referenceVersion ?? manifest.referenceVersion) !== official.referenceVersion) throw Error(`shared module ${area}/${m.target} is ${m.referenceVersion}, expected ${official.referenceVersion}`);
    if (sha(await fs.readFile(path.join(dir, m.target))) !== m.sha256) throw Error(`${area}/${m.target} differs from its manifest`);
    const bytes = await fs.readFile(path.join(official.ionSource, path.basename(m.source))).catch(() => null);
    if (!bytes || !/^[0-9a-f]{64}$/.test(m.sourceSha256 ?? '') || sha(bytes) !== m.sourceSha256)
      throw Error(`${area}/${m.target} was sliced from ${m.source} ${m.sourceSha256 ?? '(no sourceSha256)'}, which is not the source this area reads`);
    modules.set(m.target, m);
    for (const b of m.bindings) held.set(`${path.basename(m.source)}#${typeof b === 'string' ? b : b.name}`, { target: m.target, sha256: typeof b === 'string' ? null : b.sha256 });
  }
  for (const [name, entry] of Object.entries(manifest.publicNames ?? {})) {
    const m = modules.get(entry.target);
    const exported = m && (m.exports?.[entry.local] ?? (m.sharedExports?.includes(entry.local) ? entry.local : null));
    if (!m || path.basename(m.source) !== entry.file || !m.bindings.some(b => (typeof b === 'string' ? b : b.name) === entry.local) || !entry.exportName || exported !== entry.exportName)
      throw Error(`${area} publicName ${name} (${entry.file}#${entry.local}) is not exported by ${entry.target} as ${entry.exportName}`);
    published.set(`${entry.file}#${entry.local}`, { name, ...entry });
  }
  return { area, modules, held, published, manifestSha256: sha(manifestBytes) };
}
// D1 (4.16336.0): what the other 4.16336.0 graphs under src/generated already cut (file#local -> [area]); cds-core, the
// dependency region and this region's own outputs are not counted.
async function otherTargetGraphs(official, own) {
  const out = new Map();
  for (const entry of await fs.readdir(generatedRoot, { withFileTypes: true })) {
    if (!entry.isDirectory() || own.has(entry.name)) continue;
    let manifest;
    try { manifest = JSON.parse(await fs.readFile(path.join(generatedRoot, entry.name, 'manifest.json'), 'utf8')); } catch { continue; }
    if (!Array.isArray(manifest.modules)) continue;
    for (const m of manifest.modules) {
      if ((m.referenceVersion ?? manifest.referenceVersion) !== official.referenceVersion || typeof m.source !== 'string') continue;
      for (const b of m.bindings ?? []) {
        const key = `${path.basename(m.source)}#${typeof b === 'string' ? b : b.name}`;
        if (!out.has(key)) out.set(key, []);
        out.get(key).push(entry.name);
      }
    }
  }
  return out;
}
// The top-level bindings of a chunk that some code assigns after their declaration (Babel constantViolations).
function writtenBindings(src) {
  if (src.written) return src.written;
  const ast = babel.babelParse(src.code, src.name, false);
  let written;
  babel.traverse(ast, { Program(p) { written = new Set(Object.entries(p.scope.bindings).filter(([, b]) => b.constantViolations.length).map(([n]) => n)); p.stop(); } });
  src.written = written;
  return written;
}
// Module state a second copy would split (D46 / D1): a module-level WeakMap / Map / Set / WeakSet, a React context, or a
// module-level binding the chunk assigns after its declaration.
async function moduleStateKind(official, source, src, entry, cache) {
  if (entry.kind !== 'var') return null;
  if (writtenBindings(src).has(entry.node.id.name)) return 'module-level binding written after its declaration';
  const init = entry.node.init;
  if (init?.type === 'NewExpression' && init.callee.type === 'Identifier' && ['WeakMap', 'Map', 'Set', 'WeakSet'].includes(init.callee.name)) return `module ${init.callee.name}`;
  if (init?.type === 'CallExpression' && init.callee.type === 'Identifier') {
    const callee = src.top.get(init.callee.name);
    const target = callee?.kind === 'import' ? await resolveImport(source, callee, cache, `${src.name}#${init.callee.name}`) : { file: src.name, local: init.callee.name };
    if (target.file === official.vendorFrame) {
      const vendor = await readSource(source, target.file, cache);
      const alias = reactAlias(official, vendor, target.local);
      if (alias && official.reactAliases[alias]?.[1] === 'createContext') return 'context (createContext)';
    }
  }
  return null;
}
const moduleName = file => file.replace(/\.js$/, '.mjs');
const reactAlias = (official, src, local) => [...src.exported].find(([alias, l]) => l === local && Object.hasOwn(official.reactAliases, alias))?.[0];

// `version` picks the source contract (default 3.6556.2, the production graph). `contract` (tests only): a variant of a
// source contract, run check-only so it can never write an output folder.
export async function extractCoworkSessionStates({ check = false, survey = false, version = official3.referenceVersion, contract: variant } = {}) {
  if (variant && !check && !survey) throw Error('extract-cowork-session-states: a contract variant runs with check: true only');
  const contract = variant ?? contracts[version];
  if (!contract) throw Error(`extract-cowork-session-states has no ${version} source contract`);
  const { official, output, roots, namespaceImports, vendorCopies, copyableVendors, adapters, rawCallSites, allowedGlobals } = contract;
  const { referenceVersion, referenceSnapshot } = official;
  const source = official.ionSource;
  const cds = contract.sharedGraph === 'cds-core';
  const cache = new Map();
  const { published, held, pending } = cds ? { published: new Map(), held: new Set(), pending: new Map() } : await viewTabsGraph(official);
  const graph = cds ? await cdsCoreGraph(official, contract.sharedGraph) : null;
  const dep = cds ? await dependencyGraph(official, contract.dependencyGraph) : null;
  const rs = cds ? { held: dep.held, adapters: dep.adapters, contexts: dep.contexts } : await routinesSharedGraph(official);
  const linked = cds ? new Map() : await linkedGraphs(official, contract.linkedDirs);
  const resolved = new Map();
  const chunks = new Map();
  const used = { adapters: new Set(), sharedAdapters: new Set(), react: new Set(), viewTabs: new Set(), routinesShared: new Set(), linked: new Set() };
  const stateConflicts = [];
  const heldByCdsCore = new Map(); // file -> Set(local) cut again because cds-core holds them without a publicName (pure, same hash)
  const classify = async (key, reachedBy = []) => {
    if (resolved.has(key)) return resolved.get(key);
    const [file, local] = key.split('#');
    const src = await readSource(source, file, cache);
    const entry = src.top.get(local);
    let result;
    const adapter = adapters[file]?.[local];
    const isRoot = !!roots[file]?.[local];
    if (adapter && !isRoot) {
      if (rs.held.has(key)) throw Error(`adapter ${key}: routines-shared holds this binding; import it, do not replace it`);
      if (!entry || entry.kind === 'import') throw Error(`adapter ${key} is not a declaration`);
      assertFeatures(official, `adapter ${key}`, await featureText(src, entry), adapter.features);
      for (const [other, features] of Object.entries(adapter.also ?? {})) {
        const also = src.top.get(other);
        if (!also || also.kind === 'import') throw Error(`adapter ${key} pins ${other}, which is not a declaration of ${file}`);
        assertFeatures(official, `adapter ${key} (${other})`, await featureText(src, also), features);
      }
      result = { kind: 'adapter', name: adapter.name };
    } else if (rs.adapters.has(key) && !isRoot) {
      if (!entry || entry.kind === 'import') throw Error(`shared adapter ${key} is not a declaration`);
      result = { kind: 'shared-adapter', name: rs.adapters.get(key) };
    } else if (graph) {
      // 4.16336.0: a cds-core publicName is linked (its declaration must hash as cds-core's); a binding cds-core holds
      // without a publicName is cut again only when it is pure and hashes the same (module state stops generation, D46);
      // any other binding the dependency region routines-shared-v4 holds is imported from it (one copy, D1).
      const shared = graph.published.get(key), owned = graph.held.get(key), fromDep = dep.held.get(key);
      if (file === official.vendorFrame && !shared && reactAlias(official, src, local)) {
        const { module, member } = official.assertVendorAlias(src.code, reactAlias(official, src, local));
        result = { kind: 'react', module, name: member };
      } else if (shared) {
        if (isRoot) throw Error(`root ${key} is cds-core ${shared.name}; import it from cds-core instead of rooting it here`);
        if (!entry || entry.kind === 'import') throw Error(`${key} (cds-core ${shared.name}) is not a declaration`);
        if (!owned?.sha256 || owned.sha256 !== sha(declarationText(src, entry))) throw Error(`${key} differs from the declaration cds-core publishes as ${shared.name}`);
        result = { kind: 'shared-graph', file, target: shared.target, name: shared.exportName, publicName: shared.name, linkedSha256: owned.sha256 };
      } else if (owned) {
        if (!entry || entry.kind === 'import') throw Error(`${key} (held by cds-core) is not a declaration`);
        const state = await moduleStateKind(official, source, src, entry, cache);
        if (state) {
          stateConflicts.push({ binding: key, heldBy: `${graph.area}/${owned.target}`, kind: state, text: declarationText(src, entry).slice(0, 400), reachedBy: reachedBy.map(k => k.replace(/-[\w-]{8}\.js#/, '#')).join(' <- ') });
          result = { kind: 'problem' };
        } else {
          if (owned.sha256 !== sha(declarationText(src, entry))) throw Error(`${key} differs from the declaration cds-core/${owned.target} holds`);
          if (!heldByCdsCore.has(file)) heldByCdsCore.set(file, new Set());
          heldByCdsCore.get(file).add(local);
          result = { kind: 'generated', file, local };
        }
      } else if (fromDep && !isRoot) {
        if (!entry || entry.kind === 'import' || sha(declarationText(src, entry)) !== fromDep.sha256) throw Error(`${key}: ${dep.area} holds a different declaration; rerun its generator`);
        const m = dep.modules.get(fromDep.target);
        const exported = await moduleExports(path.join(generatedRoot, dep.area, m.target));
        if (exported.get(local) !== local) throw Error(`${dep.area}/${m.target} does not export ${local} under its original name`);
        result = { kind: 'routines-shared', name: local, target: fromDep.target, linkedSha256: fromDep.sha256 };
      } else if (file.startsWith('vendor-frame-')) {
        throw Error(`vendor-frame ${local} (${entry ? declarationText(src, entry).slice(0, 60) : '?'}) is neither a React export nor a cds-core binding`);
      } else if (file.startsWith('vendor-') && !vendorCopies[key]) {
        throw Error(`${key} is a vendor binding (${entry ? declarationText(src, entry).slice(0, 80) : '?'}); give it an adapter`);
      }
    } else if (namespaceImports[key]) {
      result = { kind: 'react', module: namespaceImports[key], name: '*' };
    } else if (file === official.vendorFrame && !published.has(key) && reactAlias(official, src, local)) {
      const { module, member } = official.assertVendorAlias(src.code, reactAlias(official, src, local));
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
      if (!entry || sha(declarationText(src, entry)) !== h.sha256) throw Error(`${key}: ${h.dir} holds a different declaration; rerun its generator`);
      result = { kind: 'linked', name: h.exportName, from: `../${h.dir}/${h.target}` };
    } else if (file.startsWith('vendor-') && !vendorCopies[key] && !copyableVendors.some(prefix => file.startsWith(prefix))) {
      throw Error(`${key} is a vendor binding (${entry ? declarationText(src, entry).slice(0, 80) : '?'}); give it an adapter`);
    }
    if (!result) {
      if (!entry) throw Error(`${key} is not declared`);
      if (entry.kind === 'class' || (graph && entry.kind === 'pattern')) throw Error(`${key} is a ${entry.kind} declaration (${declarationText(src, entry).slice(0, 80)}); give it an adapter`);
      if (/\bimport\s*\(/.test(declarationText(src, entry))) throw Error(`${key} has a dynamic import (${declarationText(src, entry).slice(0, 120)}); give it an adapter`);
      if (vendorCopies[key]) assertFeatures(official, `vendor copy ${key}`, await featureText(src, entry), vendorCopies[key]);
      result = { kind: 'generated', file, local };
    }
    resolved.set(key, result);
    return result;
  };
  const problems = [];
  const parent = new Map();
  const chain = key => { const out = []; for (let k = key; k && out.length < 12; k = parent.get(k)) out.push(k.replace(/-[\w-]{8}\.js#/, '#')); return out.join(' < '); };
  const trail = key => { const out = []; for (let k = key; k && out.length < 24; k = parent.get(k)) out.push(k); return out.slice(1); };
  const bucket = kind => ({ adapter: 'adapters', 'shared-adapter': 'sharedAdapters', react: 'react', 'view-tabs': 'viewTabs', 'view-tabs-held': 'viewTabs', 'shared-graph': 'viewTabs', 'routines-shared': 'routinesShared', linked: 'linked' })[kind];
  const visit = async (key, from) => {
    if (!parent.has(key)) parent.set(key, from);
    let cls;
    try { cls = await classify(key, trail(key)); } catch (error) { if (!survey) throw error; problems.push(`${error.message}\n      ${chain(key)}`); resolved.set(key, { kind: 'problem' }); return; }
    if (cls.kind === 'problem') return;
    if (cls.kind !== 'generated') { used[bucket(cls.kind)].add(key); return; }
    const { file, local } = cls;
    if (!chunks.has(file)) chunks.set(file, new Set());
    if (chunks.get(file).has(local)) return;
    chunks.get(file).add(local);
    const src = await readSource(source, file, cache);
    for (const name of declarationDeps(src, local)) {
      const entry = src.top.get(name);
      const target = entry.kind === 'import' ? await resolveImport(source, entry, cache, key) : { file, local: name };
      await visit(`${target.file}#${target.local}`, key);
    }
  };
  for (const [file, names] of Object.entries(roots)) {
    const src = await readSource(source, file, cache);
    for (const [local, spec] of Object.entries(names)) {
      const entry = src.top.get(local);
      if (!entry || entry.kind === 'import') throw Error(`root ${file}#${local} is not a declaration`);
      if (spec.export !== undefined && spec.export !== null && src.exported.get(spec.export) !== local) throw Error(`root ${file}#${local} (${spec.name}) is not exported as ${spec.export}`);
      if (spec.export === null && [...src.exported.values()].includes(local)) throw Error(`root ${file}#${local} (${spec.name}) is exported; pin its alias`);
      assertFeatures(official, `root ${file}#${local} (${spec.name})`, await featureText(src, entry), spec.features);
      if (contract.uniqueRoots) await assertUniqueRoot(official, `root ${spec.name}`, src, local, spec.features, { reads: spec.reads, source, cache });
      await visit(`${file}#${local}`);
    }
  }
  for (const [file, locals] of Object.entries(adapters)) for (const local of Object.keys(locals))
    if (!used.adapters.has(`${file}#${local}`)) { if (!survey) throw Error(`adapter ${file}#${local} is not reached; remove it`); problems.push(`unreached adapter ${file}#${local}`); }
  // E3 (4.16336.0): every React Compiler helper cut again here is the one official.assertCompilerHelpers proves.
  if (graph && official.compilerHelpers) {
    const helperLocals = new Set(Object.values(official.compilerHelpers).map(h => h.local));
    if ([...(chunks.get(official.sharedFrame) ?? [])].some(local => helperLocals.has(local)))
      official.assertCompilerHelpers((await readSource(source, official.sharedFrame, cache)).code);
  }
  // D1 (4.16336.0): bindings cut here that another 4.16336.0 graph also cuts; the stateful ones are d1Pending (they must
  // end up with one owner, cds-core wave 5).
  const d1 = [], d1Pending = [];
  if (graph) {
    const others = await otherTargetGraphs(official, new Set([path.basename(output), graph.area, dep.area, ...Object.values(contracts).map(c => path.basename(c.output))]));
    for (const [file, locals] of chunks) for (const local of locals) {
      const key = `${file}#${local}`;
      const src = await readSource(source, file, cache);
      const state = await moduleStateKind(official, source, src, src.top.get(local), cache);
      if (state && !heldByCdsCore.get(file)?.has(local)) d1Pending.push({ binding: key, kind: state, areas: [...new Set(others.get(key) ?? [])].sort() });
      if (heldByCdsCore.get(file)?.has(local) || !others.has(key)) continue;
      d1.push({ binding: key, areas: [...new Set(others.get(key))].sort(), ...(state ? { state } : {}) });
    }
  }

  if (survey) {
    for (const p of problems) console.log('PROBLEM', p);
    for (const c of stateConflicts) console.log('STATE', JSON.stringify(c));
    for (const c of d1) console.log('D1', JSON.stringify(c));
    for (const c of d1Pending) console.log('D1-STATEFUL', JSON.stringify(c));
    for (const [file, locals] of chunks) console.log('CHUNK', file, [...locals].join(' '), heldByCdsCore.has(file) ? `(heldByCdsCore ${[...heldByCdsCore.get(file)].join(' ')})` : '');
    for (const [k, set] of Object.entries(used)) console.log('USED', k, [...set].map(key => `${key}=>${resolved.get(key).name}`).join(' '));
    return { problems, stateConflicts, d1, d1Pending };
  }
  // D46: module state cds-core holds without a semantic name stops generation; nothing is written or checked.
  if (stateConflicts.length) {
    const error = Error(`module state ${graph.area} holds without a semantic name (add it to ${graph.area} publicNames, D46): ${stateConflicts.map(c => c.binding).join(', ')}`);
    error.stateConflicts = stateConflicts;
    throw error;
  }
  const files = {};
  const manifest = {
    referenceVersion, referenceSnapshot, generator: 'scripts/extract-cowork-session-states.mjs', adapterModule: 'src/source-cowork-session-states-adapters.jsx',
    sharedAdapterModule: 'src/source-routines-shared-adapters.jsx',
    ...(graph ? { sharedGraph: graph.area, dependencyGraph: dep.area, isolatedGraph: contract.isolatedGraph } : {}),
    publicNames: {}, modules: [], contexts: [], callSites: [],
  };
  const createContextKeys = new Set([...used.react].filter(k => resolved.get(k).name === 'createContext'));
  const moduleGraph = new Map();
  const unboundGlobals = [];
  const sharedTargets = new Set(), depTargets = new Set();
  for (const [file, locals] of [...chunks].sort((a, b) => a[0].localeCompare(b[0]))) {
    const src = await readSource(source, file, cache);
    const order = [...locals].map(l => [l, src.top.get(l)]).sort((a, b) => a[1].node.start - b[1].node.start);
    const imports = new Map();
    for (const [local] of order) {
      for (const name of declarationDeps(src, local)) {
        if (locals.has(name) && src.top.get(name).kind !== 'import') continue;
        const entry = src.top.get(name);
        const target = entry.kind === 'import' ? await resolveImport(source, entry, cache, `${file}#${local}`) : { file, local: name };
        const key = `${target.file}#${target.local}`;
        const cls = resolved.get(key);
        let spec;
        if (cls.kind === 'adapter') spec = { from: adapterModule, name: cls.name, kind: 'adapter' };
        else if (cls.kind === 'shared-adapter') spec = { from: sharedAdapterModule, name: cls.name, kind: 'shared-adapter' };
        else if (cls.kind === 'react') spec = { from: cls.module, name: cls.name, kind: 'react' };
        else if (cls.kind === 'view-tabs' || cls.kind === 'view-tabs-held') spec = { from: `../view-tabs/${cls.file}`, name: cls.name, kind: cls.kind };
        else if (cls.kind === 'shared-graph') { spec = { from: `../${graph.area}/${cls.target}`, name: cls.name, kind: cls.kind, linkedSha256: cls.linkedSha256 }; sharedTargets.add(cls.target); }
        else if (cls.kind === 'routines-shared' && graph) { spec = { from: `../${dep.area}/${cls.target}`, name: cls.name, kind: 'routines-shared', linkedSha256: cls.linkedSha256 }; depTargets.add(cls.target); }
        else if (cls.kind === 'routines-shared') spec = { from: `../routines-shared/${cls.target}`, name: cls.name, kind: 'routines-shared' };
        else if (cls.kind === 'linked') spec = { from: cls.from, name: cls.name, kind: 'linked' };
        else if (cls.kind === 'generated') {
          if (cls.file === file) throw Error(`${file}#${name} resolves to its own chunk but is not selected`);
          spec = { from: `./${moduleName(cls.file)}`, name: cls.local, kind: 'generated' };
        } else throw Error(`${key}: unresolved (${cls.kind})`);
        const prev = imports.get(name);
        if (prev && (prev.from !== spec.from || prev.name !== spec.name)) throw Error(`${file}#${name} resolves two ways`);
        imports.set(name, { ...spec, via: key });
      }
    }
    for (const [local, entry] of order) {
      const init = entry.kind === 'var' ? entry.node.init : null;
      if (init?.type !== 'CallExpression' || init.callee.type !== 'Identifier') continue;
      const callee = init.callee.name;
      const calleeEntry = src.top.get(callee);
      if (!calleeEntry) continue;
      const target = calleeEntry.kind === 'import' ? await resolveImport(source, calleeEntry, cache, `${file}#${local}`) : { file, local: callee };
      if (createContextKeys.has(`${target.file}#${target.local}`)) {
        if (held.has(`${file}#${local}`) || rs.held.has(`${file}#${local}`) || linked.has(`${file}#${local}`) || graph?.held.has(`${file}#${local}`)) throw Error(`${file}#${local} is a context another graph holds; it must be imported, not copied`);
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
    const blocks = order.filter(([, entry]) => !emittedNodes.has(entry.node) && emittedNodes.add(entry.node)).map(([, entry]) => emittedText(src, entry));
    const exportText = `export { ${order.map(([l]) => l).join(', ')} };`;
    const header = `// Original Claude Desktop ${referenceVersion} bindings from ${file}; generated by extract-cowork-session-states.mjs.\n// Edit the extractor or src/source-cowork-session-states-adapters.jsx, never this file.\n`;
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
      imports: [...imports].map(([local, e]) => ({ local, from: e.from, name: e.name, kind: e.kind, via: e.via, ...(e.linkedSha256 ? { linkedSha256: e.linkedSha256 } : {}) })),
      ...(graph ? { heldByCdsCore: [...(heldByCdsCore.get(file) ?? [])].sort() } : {}),
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
  const indexLines = [];
  for (const [file, names] of Object.entries(roots)) {
    const groups = new Map();
    for (const [local, spec] of Object.entries(names)) {
      const cls = resolved.get(`${file}#${local}`);
      const rsDir = graph ? dep.area : 'routines-shared';
      const from = cls?.kind === 'generated' ? `./${moduleName(file)}` : cls?.kind === 'routines-shared' ? `../${rsDir}/${cls.target}` : null;
      if (!from) throw Error(`root ${file}#${local} (${spec.name}) is answered by ${cls?.kind}; import it from there instead`);
      manifest.publicNames[spec.name] = { file, local, ...(spec.export !== undefined && spec.export !== null && { export: spec.export }), ...(cls.kind === 'routines-shared' && { routinesShared: cls.target }) };
      if (!groups.has(from)) groups.set(from, []);
      groups.get(from).push(`${local} as ${spec.name}`);
    }
    for (const [from, specs] of groups) indexLines.push(`export { ${specs.join(', ')} } from "${from}";`);
  }
  files['index.mjs'] = await format(`// Semantic names for the cowork-session-states roots; generated by extract-cowork-session-states.mjs.\n${indexLines.join('\n')}\n`, { parser: 'babel' });
  manifest.adapters = [];
  for (const [file, locals] of Object.entries(adapters)) for (const [local, spec] of Object.entries(locals))
    manifest.adapters.push({ original: `${file}#${local}`, name: spec.name });
  manifest.sharedAdapters = [...used.sharedAdapters].sort().map(original => ({ original, name: rs.adapters.get(original) }));
  manifest.routinesSharedImports = used.routinesShared.size;
  manifest.linkedImports = [...used.linked].sort().map(key => ({ original: key, from: resolved.get(key).from, name: resolved.get(key).name }));
  for (const site of rawCallSites) {
    const bytes = (await readSource(source, site.source, cache)).bytes;
    const text = bytes.toString();
    for (const feature of site.features) {
      const count = typeof feature === 'string' ? text.split(feature).length - 1 : [...text.matchAll(official.looseFeature(feature.loose, { flags: 'g' }))].length;
      if (count !== 1) throw Error(`call site ${site.source} (raw): ${JSON.stringify(feature)} occurs ${count} times, expected 1`);
    }
    manifest.callSites.push({ source: site.source, role: site.role, sourceSha256: sha(bytes), raw: true, features: site.features });
  }
  if (graph) {
    // The cds-core and routines-shared-v4 modules this graph links, by bytes (a regeneration there must be followed by a
    // rerun here and --check).
    manifest.sharedGraphModules = Object.fromEntries([...sharedTargets].sort().map(target => [target, graph.modules.get(target).sha256]));
    manifest.linkedGraphModules = Object.fromEntries([...depTargets].sort().map(target => [`${dep.area}/${target}`, dep.modules.get(target).sha256]));
  }
  files['manifest.json'] = JSON.stringify(manifest, null, 2) + '\n';
  const label = graph ? `Cowork session states ${referenceVersion}` : 'Cowork session states';
  if (check) {
    const present = (await fs.readdir(output).catch(() => [])).sort(), expected = Object.keys(files).sort();
    if (JSON.stringify(present) !== JSON.stringify(expected)) throw Error(`${label} output set changed: ${present.join(',')}. Run scripts/extract-cowork-session-states.mjs.`);
    for (const [name, text] of Object.entries(files))
      if (await fs.readFile(path.join(output, name), 'utf8') !== text) throw Error(`${label} source mismatch: ${name}. Run scripts/extract-cowork-session-states.mjs.`);
  } else {
    await fs.mkdir(output, { recursive: true });
    for (const name of await fs.readdir(output)) if (!(name in files)) await fs.rm(path.join(output, name));
    for (const [name, text] of Object.entries(files)) await fs.writeFile(path.join(output, name), text);
  }
  const count = manifest.modules.reduce((n, m) => n + m.bindings.length, 0);
  console.log(`${check ? 'Verified' : 'Extracted'} ${manifest.modules.length} cowork session states modules (${count} original ${referenceVersion} bindings, ${Object.keys(manifest.publicNames).length} roots, ${manifest.adapters.length} adapters, ${manifest.sharedAdapters.length} shared adapters, ${used.routinesShared.size} routines-shared imports, ${used.linked.size} linked imports${graph ? `, ${used.viewTabs.size} ${graph.area} links ${graph.manifestSha256.slice(0, 8)}, ${manifest.callSites.length} pinned call sites` : ''}).`);
  if (graph) Object.defineProperty(manifest, 'd1', { value: { overlaps: d1, pending: d1Pending }, enumerable: false });
  return manifest;
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const at = process.argv.indexOf('--version');
  const versions = at > 0 ? [process.argv[at + 1]] : contractVersions;
  for (const version of versions)
    await extractCoworkSessionStates({ check: process.argv.includes('--check'), survey: process.argv.includes('--survey'), version });
}
