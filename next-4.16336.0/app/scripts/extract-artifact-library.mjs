// w10-curchat-artifacts-gen (3.6556.2 migration wave 10, research/w10-curchat.md CC-08 / CC-09 / CC-10, plan-w10.md
// "w10-curchat-artifacts-gen"): extract the 3.6556.2 artifact library page shell and the artifact viewer primitives
// without executing any desktop runtime (decision D0: own generator, own output folder src/generated/artifact-library,
// own scripts/verify-gen-artifact-library.mjs). Replaces the 2.31226.0 current-chat slices c230724a2 Vi / Jr,
// c2bb74286 ui / mi and shared-9 bf / xf once the host moves (w10-curchat-artifacts-host).
//
//   c230724a2  Ns, the gallery page shell the library routes (ey / gv) render: title, tabs, search, view toggle, primary
//              action, banner, the grid (zs) / list (hs) listings, the loading skeletons (Bs), the empty and no-match
//              states and the search announcement. Only Ns's closure is sliced; the route roots ey / gv (server
//              pagination, design mode, account) stay out (plan-w10 step 1), the host feeds Ns its own records.
//   cbbbbbd87  I, the artifact glyph (old c230724a2 Jr: `data-gallery-type-media`, "flex h-full w-full items-center
//              justify-center", Code / Palette / Artifacts by source) and V (export a), the card thumbnail around it.
//              research/w10-curchat.md named shared-9 nT as a candidate; the text comparison shows nT is the typed
//              artifact mark (cai artifact types, gated), while I is the old Jr verbatim (CC-09).
//   c2bb74286  Lt (export r), the artifact viewer title (old ui), and Bt, the viewer header action (old mi: glyph, label,
//              detail over the CDS icon button and tooltip).
//   shared-9   fh / ph / mh (exported dr / ur / cr): the viewer frame, header row and body classes (old bf / xf).
//
// The engine is the code-routines one (scripts/extract-code-routines.mjs): every emitted binding is an original
// top-level declaration sliced from the 3.6556.2 chunk; the bindings of each chunk are the reachable closure of the roots
// across chunks. A binding resolves, in this order, to: a named host adapter in src/source-artifact-v3-adapters.jsx (its
// original declaration must carry `features`), an adapter another 3.6556.2 graph already answers it with (that graph's
// adapter module, the same host service), a vendor-frame React export (official-3.6556.2.mjs reactAliases, checked with
// assertVendorAlias; R3), a semantic public name of view-tabs (D1/E3), a binding another 3.6556.2 graph holds
// (routines-shared, code-routines, cowork-scheduled: imported from its generated module under the original local name,
// so contexts stay one object each), or a copy in this graph's module for its chunk. Features (R2/E5) match the
// declaration's prettier form as text or through looseFeature().
import fs from 'node:fs/promises';
import path from 'node:path';
import { viewTabsManifestFor } from './view-tabs-compat.mjs';
import { routinesSharedManifestFor } from './routines-shared-compat.mjs';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { parsers } from '../../tools/node_modules/prettier/plugins/babel.mjs';
import { format } from '../../tools/node_modules/prettier/index.mjs';
import babel from '../../tools/node_modules/playwright/lib/transform/babelBundle.js';
import * as official from './official-3.6556.2.mjs';

const root = path.resolve(import.meta.dirname, '..');
const referenceVersion = official.referenceVersion;
const referenceSnapshot = official.referenceSnapshot;
const source = official.ionSource;
const output = path.join(root, 'src/generated/artifact-library');
const viewTabs = path.join(root, 'src/generated/view-tabs');
const adapterModule = '../../source-artifact-v3-adapters.jsx';
// Other 3.6556.2 graphs whose slices this graph imports instead of copying (D1), in priority order.
const heldGraphs = ['routines-shared', 'code-routines', 'cowork-scheduled'];
// Graphs that also hold bindings this closure reaches (w11-sweep-curchat, D1): imported, never sliced a second time.
// cowork-home holds shared-156's time constants / formatters and shared-3 uh; mcp-app-card shared-78 Cv; transcript-rows
// shared-28 cF. Held only (their host adapters are not borrowed); a binding is imported only when the holder's module
// exports it, under that export name, and only when the declaration is byte-identical (sha256).
const linkedGraphs = ['cowork-home', 'mcp-app-card', 'transcript-rows'];
const sha = bytes => createHash('sha256').update(bytes).digest('hex');

// The roots: chunk -> original local -> { name, export, features }.
const roots = {
  'c230724a2-Dey3VRG9.js': {
    Ns: { name: 'ArtifactLibraryPage', features: ['title: t,', 'tabs: n,', 'tabPanel: r,', 'contentGap: i,', 'search: a,', 'viewToggle: c,', 'primaryAction: p,',
      'defaultMessage: "No artifacts matching \\u201C{search}\\u201D",', 'defaultMessage: "No artifacts match your search",', '"data-testid": "gallery-load-more-sentinel",',
      'primaryActionCompactIcon: "Add",'] },
  },
  'cbbbbbd87-VKX81sbm.js': {
    I: { name: 'ArtifactGlyph', features: ['{ source: r, icon: i, typeIcon: a, tint: o, iconSize: s, bare: c } = t,', '"flex h-full w-full items-center justify-center",',
      '(r === "frame" ? "Code" : r === "design" ? "Palette" : "Artifacts")', '"data-gallery-type-media": f,', '"text-muted-as-secondary"'] },
    V: { name: 'ArtifactThumbnail', export: 'a', features: ['{ item: t, priority: r, markless: i } = e,', 'if (t.thumbnail)', 'iconSize: "lg", bare: !0'] },
  },
  'c2bb74286-CQLOwqIZ.js': {
    Lt: { name: 'ArtifactTitle', export: 'r', features: ['{ title: t, titlePending: r, heading: i } = e,', 'i ? "h2" : "span"', '"data-testid": "frame-artifact-title",'] },
    Bt: { name: 'ArtifactAction', features: ['({ glyph: r, label: i, detail: t, menuOpen: o, ...a } = e)', '"aria-label": i', 'detail: t, open: s'] },
  },
  // cn: the card / row "More options for {label}" trigger c69e9937a sn renders for an item without its own `menu`
  // (published so tests and the host can name it; w11-sweep-curchat: the host no longer mirrors it).
  'c69e9937a-BIwXoJBq.js': {
    cn: { name: 'ArtifactMenuTrigger', features: ['{ defaultMessage: "More options for {label}", id: "rKQPgfPvWS" }', 'icon: "DotsVertical",', 'tooltip: !1,',
      '"bg-surface-1 hover:bg-surface-3 aria-expanded:bg-surface-3"', '"[scroll-margin-top:var(--list-header-scroll-offset)]"'] },
  },
  'shared-9-CM21XrJw.js': {
    fh: { name: 'artifactFrameClass', export: 'dr', features: ['fh = "cds-pane-ground flex h-full min-h-0 flex-col"'] },
    ph: { name: 'artifactHeaderClass', export: 'ur', features: ['"flex h-frame-row shrink-0 items-center justify-between gap-sm bg-surface-3 ps-2 pe-3 pb-[var(--frame-row-line,0px)] -mb-[var(--frame-row-line,0px)]"'] },
    mh: { name: 'artifactBodyClass', export: 'cr', features: ['after:border-[color:var(--cds-border-line,var(--cds-alpha-1))]', '"relative min-h-0 flex-1 bg-surface-2'] },
  },
};
// Lazy declarations kept with a rewritten specifier: key -> { target chunk: original export alias `pick` reads }.
const lazyImports = {};
// Pure vendor declarations this graph may copy (chunk#local -> features).
const vendorCopies = {};
// Declarations view-tabs holds without a semantic name (D46 names them in extract-view-tabs.mjs, outside this lane):
// this graph copies them (as working-line copies shared-frame yo and code-composer wh), each recorded in the manifest's
// `viewTabsCopies`; a copied context would split the provider, so a createContext among them stops generation. What a
// copy reads resolves through the same order (CdsSurfaceContext, CdsModeStoreContext… by their semantic view-tabs name).
// Host services and unreachable boundaries (checked first): chunk -> original local -> { name, features, also, boundary }.
const adapterTable = {
  'shared-16-ByfgAyLr.js': {
    // $l: the lazy handle of the official artifact menu items (artifact_menu, ce9de3a9d ArtifactMenuItems); Ns preloads
    // it on idle (shared-3 uh: `t && e?.enqueueIdle()`). The host has no such chunk: a null handle preloads nothing.
    $l: { name: 'artifactMenuItemsLazy', features: ['$l = Yl.handle'], also: { Jl: ['id: "artifact_menu",', 'import("./ce9de3a9d-DfaDmykL.js")'] },
      boundary: 'The official artifact menu chunk (ce9de3a9d: rename, duplicate, copy link, delete over the claude.ai artifact APIs) is not loaded; the idle preload has no handle.' },
    // uu: the official artifact menu (context menu fu / dropdown du over Vl's items plus the item's menuExtras). c69e9937a
    // on renders it for an item without `menu` that has actions or menuExtras: { item, contextMenuTrigger } for a row's
    // right click, { item, trigger: cn } for the "More options" button. Host items carry their local actions as
    // menuExtras (open, open in default app, Show in Finder, open conversation), so the host menu is that list in the
    // view-tabs CdsContextMenu (fu's mode "context") or CdsDropdown (du's mode "dropdown", Popup align "end").
    uu: { name: 'ArtifactItemMenu', features: ['e.contextMenuTrigger ? a(fu, { ...e }) : a(du, { ...e })'],
      boundary: 'The official artifact actions (claude.ai artifact APIs: rename, duplicate, copy link, delete) are not offered; the menu lists only the host item\'s menuExtras, in the CDS context menu (right click) or dropdown (the official cn trigger).' },
    // Vl: which official artifact menu actions an item offers (pin / rename / duplicate / copy link / remove / delete).
    // on() asks it only for an item without `menu`; the host offers none of them through it.
    Vl: { name: 'artifactMenuActions', features: ['copy_link: zl(e),', 'remove_from_list: !!e.onRemoveFromList,'],
      boundary: 'The official per-item action list (claude.ai artifact APIs) is empty on the host; items bring their local actions as menuExtras.' },
  },
  'ce645a5d4-D-kmL21d.js': {
    // s (exported n): the owner name of an artifact another account shared (org members query cd2e30834 o). The host
    // library lists this machine's files only (no rel "shared", no ownerAccountUuid), so no row has an owner name.
    s: { name: 'useArtifactOwners', features: ['e.rel === "shared" &&', '{ membersByUuid: m } = r(d);'],
      boundary: 'Shared-artifact owner names (org members query) are not available: the host has no account; every row answers undefined, as for a card of your own.' },
  },
  'cbbbbbd87-VKX81sbm.js': {
    // N: the claude.ai chat artifact preview (published screenshot or a markdown / code excerpt). V renders it only for
    // source "chat"; the host items are source "cowork" (local files), so it is unreachable.
    N: { name: 'ChatArtifactPreview', features: ['{ title: t, type: r, preview: i, publishedArtifactUuid: a } = e,', '`/public/artifacts/${a}/screenshot`'],
      boundary: 'claude.ai chat artifact previews (published screenshot, markdown excerpt) are not shown: host items are local cowork files (source "cowork"); null.' },
  },
};

// Pinned on the minified bytes (each must occur exactly once; `{ loose }` through looseFeature).
const rawCallSites = [
  { source: 'c230724a2-Dey3VRG9.js', role: 'The library routes render Ns (gv: rn = Ns; ey: T = Ns), the main one with the mode title, banners, tabs, search, view toggle and the primary action (no contentGap: the "lg" default)',
    features: ['rn=Ns,', 'T=Ns,', 's(Ns,{title:s(Vv,{mode:a}),topBanner:', 'primaryActionCompactIcon:"Add"', 'No artifacts match your search', '"data-testid":"gallery-load-more-sentinel"'] },
  { source: 'cbbbbbd87-VKX81sbm.js', role: 'The artifact glyph I (old c230724a2 Jr) and the export list (V thumbnail a, B row icon o)',
    features: ['function I(t){let $=J9(11),{source:r,icon:i,typeIcon:a,tint:o,iconSize:s,bare:c}=t', 'export{V as a,W as i,J as n,B as o,K as r,N as s,q as t}'] },
  { source: 'c2bb74286-CQLOwqIZ.js', role: 'The viewer header action Bt (old mi), also the artifact switcher trigger',
    features: ['function Bt(e){let $=J9(15),t,r,i,a,o;J1($,0,e)?({glyph:r,label:i,detail:t,menuOpen:o,...a}=e', 'render:n(Bt,{glyph:b,label:v,"data-testid":"frame-artifact-switcher-button"})'] },
];
// Globals the emitted modules may read (browser and language built-ins the original declarations use).
const allowedGlobals = new Set(['Math', 'Number', 'Array', 'Object', 'Error', 'TypeError', 'String', 'Boolean', 'Set', 'Map', 'WeakMap', 'WeakSet', 'JSON',
  'Symbol', 'Promise', 'RegExp', 'Date', 'Intl', 'undefined', 'Infinity', 'NaN', 'globalThis', 'window', 'document', 'navigator', 'console',
  'setTimeout', 'clearTimeout', 'setInterval', 'clearInterval', 'requestAnimationFrame', 'cancelAnimationFrame', 'performance', 'encodeURIComponent', 'decodeURIComponent',
  'URL', 'URLSearchParams', 'parseInt', 'parseFloat', 'isNaN', 'isFinite', 'Reflect', 'Proxy', 'getComputedStyle', 'ResizeObserver', 'AbortController',
  'MutationObserver', 'IntersectionObserver', 'HTMLElement', 'Element', 'Node', 'queueMicrotask', 'structuredClone', 'localStorage', 'sessionStorage',
  'NodeFilter', 'Event', 'BigInt', 'WeakRef', 'CSS', 'Float64Array', 'Image', 'matchMedia']);

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
const emittedText = (src, entry) => (entry.kind === 'var' ? `var ${declarationText(src, entry)};` : declarationText(src, entry));
async function featureText(src, entry) {
  if (!src.formatted.has(entry)) src.formatted.set(entry, await format(emittedText(src, entry), { parser: 'babel' }));
  return src.formatted.get(entry);
}
// A declaration's free variables that are top-level bindings of its chunk.
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
// R2/E5: a feature is the declaration's text (whitespace-insensitive) or, failing that, its looseFeature() pattern.
const looseCache = new Map();
const loose = f => { if (!looseCache.has(f)) looseCache.set(f, official.looseFeature(f)); return looseCache.get(f); };
const featureHit = (text, flat, f) => text.includes(f) || flat.includes(normalised(f)) || loose(f).test(text);
function assertFeatures(label, text, features = []) {
  const flat = normalised(text);
  const missing = features.filter(f => !featureHit(text, flat, f));
  if (missing.length) throw Error(`${label} lacks ${missing.map(f => JSON.stringify(f)).join(', ')}`);
}
// Follow an import (and re-export chains) to the declaring chunk.
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
// local -> exported name of a generated module's `export { … }` lists (a holder may export under an official alias).
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
async function linkedGraph(label) {
  const dir = path.join(root, 'src/generated', label);
  const manifest = JSON.parse(await fs.readFile(path.join(dir, 'manifest.json'), 'utf8'));
  if (manifest.referenceVersion !== referenceVersion) throw Error(`${label} is ${manifest.referenceVersion}, expected ${referenceVersion}`);
  const held = new Map(), exportNames = new Map(), shas = new Map();
  for (const mod of manifest.modules ?? []) {
    const exported = await moduleExports(path.join(dir, mod.target));
    for (const b of mod.bindings ?? []) {
      const key = `${mod.source}#${b.name}`;
      if (held.has(key) || !exported.has(b.name)) continue;
      held.set(key, mod.target); exportNames.set(key, exported.get(b.name)); shas.set(key, b.sha256);
    }
  }
  return { label, published: new Map(), held, exportNames, shas, adapted: new Map(), adapterFrom: null, pending: new Map(), contexts: new Set(manifest.contexts ?? []) };
}
async function heldGraph(dir, label) {
  const manifest = label === 'view-tabs' ? await viewTabsManifestFor(referenceVersion) : label === 'routines-shared' ? await routinesSharedManifestFor(referenceVersion) : JSON.parse(await fs.readFile(path.join(dir, 'manifest.json'), 'utf8'));
  const adapterFrom = manifest.adapterModule ? `../../${path.basename(manifest.adapterModule)}` : null;
  if (manifest.referenceVersion !== referenceVersion) throw Error(`${label} is ${manifest.referenceVersion}, expected ${referenceVersion}`);
  const published = new Map();
  for (const [name, entry] of Object.entries(manifest.publicNames ?? {})) published.set(`${entry.file}#${entry.local}`, name);
  const held = new Map();
  for (const mod of manifest.modules ?? []) for (const b of mod.bindings ?? []) held.set(`${mod.source}#${typeof b === 'string' ? b : b.name}`, mod.target ?? mod.source);
  const adapted = new Map();
  for (const a of manifest.adapters ?? []) adapted.set(a.original, a.name);
  // D46: names extract-view-tabs.mjs has settled but not published yet (other areas still slice those bindings).
  const pending = new Map();
  for (const [name, entry] of Object.entries(manifest.pendingNames ?? {})) pending.set(`${entry.file}#${entry.local}`, name);
  return { label, published, held, adapted, adapterFrom, pending, contexts: new Set(manifest.contexts ?? []) };
}
const moduleName = file => file.replace(/\.js$/, '.mjs');
// The vendor-frame export alias of `local` that official-3.6556.2.mjs knows as a React export, or undefined.
const reactAlias = (src, local) => [...src.exported].find(([alias, l]) => l === local && Object.hasOwn(official.reactAliases, alias))?.[0];

export async function extractArtifactLibrary({ check = false, survey = false, extraAdapters = {} } = {}) {
  const cache = new Map();
  // extraAdapters (tests only, with check): merged into the table, so an adapter the closure never reaches stops generation.
  const adapters = Object.fromEntries([...new Set([...Object.keys(adapterTable), ...Object.keys(extraAdapters)])]
    .map(file => [file, { ...adapterTable[file], ...extraAdapters[file] }]));
  const vt = await heldGraph(viewTabs, 'view-tabs');
  const graphs = [];
  for (const label of heldGraphs) graphs.push(await heldGraph(path.join(root, 'src/generated', label), label));
  for (const label of linkedGraphs) graphs.push(await linkedGraph(label));
  const heldBy = key => graphs.find(g => g.held.has(key));
  const adaptedBy = key => graphs.find(g => g.adapted.has(key));
  const resolved = new Map();
  const chunks = new Map(); // file -> Set(local)
  const edges = new Map();
  const viewTabsCopies = new Set();
  const used = { adapters: new Set(), sharedAdapters: new Set(), react: new Set(), viewTabs: new Set(), held: new Set() };
  const classify = async key => {
    if (resolved.has(key)) return resolved.get(key);
    const [file, local] = key.split('#');
    const src = await readSource(file, cache);
    const entry = src.top.get(local);
    let result;
    const adapter = adapters[file]?.[local];
    const isRoot = !!roots[file]?.[local];
    if (adapter && !isRoot) {
      if (!entry || entry.kind === 'import') throw Error(`adapter ${key} is not a declaration`);
      if (heldBy(key) || vt.held.has(key)) throw Error(`adapter ${key} replaces a binding another graph holds; import it instead`);
      assertFeatures(`adapter ${key}`, await featureText(src, entry), adapter.features);
      for (const [other, features] of Object.entries(adapter.also ?? {})) {
        const also = src.top.get(other);
        if (!also || also.kind === 'import') throw Error(`adapter ${key} pins ${other}, which is not a declaration of ${file}`);
        assertFeatures(`adapter ${key} (${other})`, await featureText(src, also), features);
      }
      result = { kind: 'adapter', name: adapter.name };
    } else if (adaptedBy(key)) {
      const g = adaptedBy(key);
      result = { kind: 'shared-adapter', name: g.adapted.get(key), from: g.adapterFrom, graph: g.label };
    } else if (file === official.vendorFrame && !vt.published.has(key) && reactAlias(src, local)) {
      // R3: vendor-frame re-exports React as a top-level `local=<namespace>.<member>` (official-3.6556.2.mjs reactAliases,
      // proved on the chunk by assertVendorAlias; `Oo` is react/compiler-runtime's c).
      const { module, member } = official.assertVendorAlias(src.code, reactAlias(src, local));
      result = { kind: 'react', module, name: member };
    } else if (vt.published.has(key)) {
      result = { kind: 'view-tabs', name: vt.published.get(key), from: `../view-tabs/${file}` };
    } else if (heldBy(key)) {
      const g = heldBy(key);
      if (g.shas && (!entry || sha(declarationText(src, entry)) !== g.shas.get(key))) throw Error(`${key}: ${g.label} holds a different declaration; rerun its generator`);
      result = { kind: 'held', name: g.exportNames?.get(key) ?? local, from: `../${g.label}/${g.held.get(key)}`, graph: g.label };
    } else if (vt.held.has(key) && vt.pending.has(key)) {
      // D1/D46: a name view-tabs still holds back (`pendingNames`) is imported by its local until it is published.
      result = { kind: 'view-tabs-held', name: local, from: `../view-tabs/${file}`, pendingName: vt.pending.get(key) };
    } else if (file.startsWith('vendor-') && !file.startsWith('vendor-frame-') && !vendorCopies[key]) {
      throw Error(`${key} is a vendor binding (${entry ? declarationText(src, entry).slice(0, 80) : '?'}); give it an adapter`);
    } else {
      if (!entry) throw Error(`${key} is not declared`);
      if (entry.kind === 'pattern' || entry.kind === 'class') throw Error(`${key} is a ${entry.kind} declaration (${declarationText(src, entry).slice(0, 80)}); give it an adapter`);
      const text = declarationText(src, entry);
      if (/\bimport\s*\(/.test(text)) {
        const pins = lazyImports[key];
        if (!pins) throw Error(`${key} has a dynamic import (${text.slice(0, 160)}); give it an adapter`);
        let rest = text;
        for (const target of Object.keys(pins)) {
          const spec = `import("./${target}")`;
          if (rest.split(spec).length - 1 !== 1) throw Error(`${key}: expected one ${spec}`);
          rest = rest.split(spec).join('');
        }
        if (/\bimport\s*\(/.test(rest)) throw Error(`${key}: unpinned dynamic import`);
      }
      if (vendorCopies[key]) assertFeatures(`vendor copy ${key}`, await featureText(src, entry), vendorCopies[key]);
      if (vt.held.has(key)) viewTabsCopies.add(key);
      result = { kind: 'generated', file, local };
    }
    resolved.set(key, result);
    return result;
  };
  const problems = [];
  const parent = new Map();
  const chain = key => { const out = []; for (let k = key; k && out.length < 12; k = parent.get(k)) out.push(k.replace(/-[\w-]{8}\.js#/, '#')); return out.join(' < '); };
  const visit = async (key, from) => {
    if (!parent.has(key)) parent.set(key, from);
    let cls;
    try { cls = await classify(key); } catch (error) { if (!survey) throw error; problems.push(`${error.message}\n      ${chain(key)}`); resolved.set(key, { kind: 'problem' }); return; }
    if (cls.kind === 'problem') return;
    if (cls.kind !== 'generated') {
      const bucket = { adapter: 'adapters', 'shared-adapter': 'sharedAdapters', react: 'react', 'view-tabs': 'viewTabs', 'view-tabs-held': 'viewTabs', held: 'held' }[cls.kind];
      used[bucket].add(key);
      return;
    }
    const { file, local } = cls;
    if (!chunks.has(file)) chunks.set(file, new Set());
    if (chunks.get(file).has(local)) return;
    chunks.get(file).add(local);
    const src = await readSource(file, cache);
    const reads = new Set();
    edges.set(key, reads);
    for (const dep of declarationDeps(src, local)) {
      const entry = src.top.get(dep);
      const target = entry.kind === 'import' ? await resolveImport(entry, cache, key) : { file, local: dep };
      const depKey = `${target.file}#${target.local}`;
      reads.add(depKey);
      await visit(depKey, key);
    }
  };
  for (const [file, names] of Object.entries(roots)) {
    const src = await readSource(file, cache);
    for (const [local, spec] of Object.entries(names)) {
      const entry = src.top.get(local);
      if (!entry || entry.kind === 'import') throw Error(`root ${file}#${local} is not a declaration`);
      if (spec.export !== undefined && src.exported.get(spec.export) !== local) throw Error(`root ${file}#${local} (${spec.name}) is not exported as ${spec.export}`);
      try { assertFeatures(`root ${file}#${local} (${spec.name})`, await featureText(src, entry), spec.features); }
      catch (error) { if (!survey) throw error; problems.push(error.message); }
      if (survey && !spec.features.length) problems.push(`root ${file}#${local} has no features`);
      await visit(`${file}#${local}`);
    }
  }
  for (const [file, locals] of Object.entries(adapters)) for (const local of Object.keys(locals))
    if (!used.adapters.has(`${file}#${local}`)) { if (!survey) throw Error(`adapter ${file}#${local} is not reached; remove it`); problems.push(`unreached adapter ${file}#${local}`); }
  for (const [key, pins] of Object.entries(lazyImports)) {
    if (!edges.has(key)) { if (!survey) throw Error(`lazy declaration ${key} is not reached`); problems.push(`unreached lazy ${key}`); continue; }
    for (const [target, alias] of Object.entries(pins)) {
      const src = await readSource(target, cache);
      const local = src.exported.get(alias);
      if (!local || !chunks.get(target)?.has(local)) { if (!survey) throw Error(`lazy ${key}: ${target} ${alias} is not in this graph`); problems.push(`lazy ${key}: ${target} ${alias} missing`); }
    }
  }

  if (survey) {
    const size = async key => { const [f, l] = key.split('#'); const s = await readSource(f, cache); return declarationText(s, s.top.get(l)).length; };
    let total = 0;
    const rows = [];
    for (const [file, locals] of chunks) { let b = 0; for (const l of locals) b += await size(`${file}#${l}`); total += b; rows.push([b, file, locals.size]); }
    rows.sort((a, b) => b[0] - a[0]);
    for (const p of problems) console.log('PROBLEM', p);
    for (const k of (process.env.SURVEY_CHAIN ?? '').split(',').filter(Boolean)) console.log('CHAIN', chain(k));
    for (const k of (process.env.SURVEY_SHOW ?? '').split(',').filter(Boolean)) { const [f, l] = k.split('#'); const s = await readSource(f, cache); console.log('SHOW', k, '\n' + (await featureText(s, s.top.get(l))).split('\n').slice(0, +(process.env.SURVEY_LINES ?? 1e9)).join('\n')); }
    for (const k of (process.env.SURVEY_DEPS ?? '').split(',').filter(Boolean)) {
      const [f, l] = k.split('#'); const s = await readSource(f, cache);
      const rows = [];
      for (const dep of declarationDeps(s, l)) {
        const e = s.top.get(dep);
        const t = e.kind === 'import' ? await resolveImport(e, cache, k) : { file: f, local: dep };
        const tk = `${t.file}#${t.local}`, c = resolved.get(tk);
        const ts = await readSource(t.file, cache), te = ts.top.get(t.local);
        rows.push(`${dep} -> ${tk} [${c?.kind ?? '?'}${c?.name ? ' ' + c.name : ''}] ${te ? declarationText(ts, te).slice(0, +(process.env.SURVEY_WIDTH ?? 140)).replace(/\s+/g, ' ') : ''}`);
      }
      console.log('DEPS', k, '\n  ' + rows.join('\n  '));
    }
    if (process.env.SURVEY_USED) for (const [k, v] of Object.entries(used)) console.log('USED', k, [...v].join(' '));
    console.log('total', total);
    for (const r of rows) console.log(r[0], r[1], r[2], process.env.SURVEY_NAMES ? [...chunks.get(r[1])].join(' ') : '');
    const subtree = key => { const seen = new Set(), st = [key]; while (st.length) { const k = st.pop(); if (seen.has(k) || !edges.has(k)) continue; seen.add(k); for (const d of edges.get(k)) st.push(d); } return seen; };
    const cross = new Map();
    for (const [k, reads] of edges) for (const d of reads) if (edges.has(d) && d.split('#')[0] !== k.split('#')[0]) { if (!cross.has(d)) cross.set(d, new Set()); cross.get(d).add(k); }
    const out = [];
    for (const [d, from] of cross) { let b = 0; for (const k of subtree(d)) b += await size(k); out.push([b, d, [...from].slice(0, 3).join(' ')]); }
    out.sort((a, b) => b[0] - a[0]);
    for (const r of out.slice(0, +(process.env.SURVEY_TOP ?? 30))) console.log('  edge', r[0], r[1], '<-', r[2]);
    return null;
  }
  // Emit one module per source chunk.
  const files = {};
  const manifest = {
    referenceVersion, referenceSnapshot, generator: 'scripts/extract-artifact-library.mjs', adapterModule: 'src/source-artifact-v3-adapters.jsx', heldGraphs, linkedGraphs,
    publicNames: {}, modules: [], contexts: [], lazyImports: [], callSites: [], adapters: [], sharedAdapters: [], hostDifferences: [],
  };
  const createContextKeys = new Set([...used.react].filter(k => resolved.get(k).name === 'createContext'));
  const moduleGraph = new Map();
  const unboundGlobals = [];
  const lazyAliases = new Map(); // target chunk -> Map(alias -> local)
  for (const pins of Object.values(lazyImports)) for (const [target, alias] of Object.entries(pins)) {
    const src = await readSource(target, cache);
    if (!lazyAliases.has(target)) lazyAliases.set(target, new Map());
    lazyAliases.get(target).set(alias, src.exported.get(alias));
  }
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
        else if (cls.kind === 'shared-adapter') spec = { from: cls.from, name: cls.name, kind: 'shared-adapter' };
        else if (cls.kind === 'react') spec = { from: cls.module, name: cls.name, kind: 'react' };
        else if (cls.kind === 'view-tabs' || cls.kind === 'view-tabs-held' || cls.kind === 'held') spec = { from: cls.from, name: cls.name, kind: cls.kind };
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
      const calleeKey = `${target.file}#${target.local}`;
      const calleeSrc = await readSource(target.file, cache), calleeDecl = calleeSrc.top.get(target.local);
      const isCreateContext = createContextKeys.has(calleeKey)
        || (target.file.startsWith('vendor-frame-') && calleeDecl?.kind === 'var' && /^[\w$]+=[\w$]+\.createContext$/.test(declarationText(calleeSrc, calleeDecl)));
      if (isCreateContext) manifest.contexts.push(`${file}#${local}`);
    }
    const groups = new Map();
    for (const [local, spec] of imports) {
      if (!groups.has(spec.from)) groups.set(spec.from, []);
      groups.get(spec.from).push(spec.name === local ? local : `${spec.name} as ${local}`);
    }
    moduleGraph.set(moduleName(file), [...groups.keys()].filter(f => f.startsWith('./')).map(f => f.slice(2)));
    const importText = [...groups].sort((a, b) => a[0].localeCompare(b[0]))
      .map(([from, names]) => `import { ${names.sort().join(', ')} } from ${JSON.stringify(from)};`).join('\n');
    const blocks = order.map(([local, entry]) => {
      let text = emittedText(src, entry);
      const pins = lazyImports[`${file}#${local}`];
      if (pins) for (const target of Object.keys(pins)) text = text.split(`import("./${target}")`).join(`import("./${moduleName(target)}")`);
      return text;
    });
    let exportText = `export { ${order.map(([l]) => l).join(', ')} };`;
    const aliases = lazyAliases.get(file);
    if (aliases) {
      for (const alias of aliases.keys()) if (locals.has(alias)) throw Error(`${file}: export alias ${alias} collides with a local`);
      exportText += `\nexport { ${[...aliases].map(([alias, local]) => `${local} as ${alias}`).join(', ')} };`;
    }
    const header = `// Original Claude Desktop ${referenceVersion} bindings from ${file}; generated by extract-artifact-library.mjs.\n// Edit the extractor or src/source-artifact-v3-adapters.jsx, never this file.\n`;
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
  const copiedContexts = manifest.contexts.filter(k => viewTabsCopies.has(k));
  if (copiedContexts.length) throw Error(`view-tabs holds these contexts without a semantic name; publish them in extract-view-tabs.mjs (D46): ${copiedContexts.join(', ')}`);
  manifest.viewTabsCopies = [...viewTabsCopies].sort();
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
    const specs = Object.entries(names).map(([local, spec]) => { manifest.publicNames[spec.name] = { file, local }; return `${local} as ${spec.name}`; });
    indexLines.push(`export { ${specs.join(', ')} } from "./${moduleName(file)}";`);
  }
  files['index.mjs'] = await format(`// Semantic names for the artifact-library roots; generated by extract-artifact-library.mjs.\n${indexLines.join('\n')}\n`, { parser: 'babel' });
  for (const [file, locals] of Object.entries(adapters)) for (const [local, spec] of Object.entries(locals)) {
    manifest.adapters.push({ original: `${file}#${local}`, name: spec.name });
    if (spec.boundary) manifest.hostDifferences.push({ original: `${file}#${local}`, adapter: spec.name, difference: spec.boundary });
  }
  for (const key of [...used.sharedAdapters].sort()) manifest.sharedAdapters.push({ original: key, name: resolved.get(key).name, graph: resolved.get(key).graph, from: resolved.get(key).from });
  for (const [key, pins] of Object.entries(lazyImports)) for (const [target, alias] of Object.entries(pins))
    manifest.lazyImports.push({ declaration: key, target: moduleName(target), alias });
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
    if (JSON.stringify(present) !== JSON.stringify(expected)) throw Error(`Artifact library output set changed: ${present.join(',')}. Run scripts/extract-artifact-library.mjs.`);
    for (const [name, text] of Object.entries(files))
      if (await fs.readFile(path.join(output, name), 'utf8') !== text) throw Error(`Artifact library source mismatch: ${name}. Run scripts/extract-artifact-library.mjs.`);
  } else {
    await fs.mkdir(output, { recursive: true });
    for (const name of await fs.readdir(output)) if (!(name in files)) await fs.rm(path.join(output, name));
    for (const [name, text] of Object.entries(files)) await fs.writeFile(path.join(output, name), text);
  }
  const count = manifest.modules.reduce((n, m) => n + m.bindings.length, 0);
  console.log(`${check ? 'Verified' : 'Extracted'} ${manifest.modules.length} artifact library modules (${count} original ${referenceVersion} bindings, ${Object.keys(manifest.publicNames).length} roots, ${manifest.adapters.length} adapters, ${manifest.sharedAdapters.length} shared adapters, ${manifest.callSites.length} pinned call sites).`);
  return manifest;
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url))
  await extractArtifactLibrary({ check: process.argv.includes('--check'), survey: process.argv.includes('--survey') });
