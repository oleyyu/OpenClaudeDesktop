// w10-curchat-progress-gen (research/w10-curchat.md CC-07, plan-w10.md "w10-curchat-progress-gen"): extract the 3.6556.2
// Cowork progress panel the host's SourceCoworkProgress (src/source-surfaces.jsx) composes. Own generator, own output
// folder src/generated/cowork-progress, own scripts/verify-gen-cowork-progress.mjs (found by prepare-ui.mjs).
//
//   c21f11e6d  vT (the Progress section, old 2.31226.0 Px), yT (the empty Outputs body "View and open files created during
//              this task.", old Fx); both are chunk-internal (CoworkSessionView's activity panel renders them).
//              w13-coworkui-outputs adds xT (the Outputs / Working folder section, with its folder groups tT, empty
//              state bT, Download all Lb and the hosted CLAUDE.md button rT), kT (the folder instructions dialog over
//              IS) and Bb (the file browser over Vb); their data comes from src/cowork-outputs-model.mjs.
//   cc5a62f6f  F (the panel column, export p; old j), L (the collapsible Section, export t; old N), T (the output row
//              classes, export i; old y), ne (the "merged" context, export h; old m), w (the layout context, export f;
//              old v), C (the flat layout, export u; old _), S (the card layout, export l; old g).
//   c4038fd41  t (the todo checklist vT renders, reached through vT, old ym).
//
// Same engine as extract-cowork-scheduled.mjs (3.6556.2 rules: R1 constants from official-3.6556.2.mjs; R2/E5 features
// as text or looseFeature; R3 vendor-frame React aliases through official.reactAliases + assertVendorAlias, `Oo` being
// react/compiler-runtime's c; E3 the React Compiler helpers come from view-tabs by semantic name). A binding resolves, in
// this order, to: a host adapter of this graph (src/source-cowork-progress-v3-adapters.jsx; its original declaration
// must carry `features`), a host adapter routines-shared already uses for it, a React namespace / alias of vendor-frame,
// a semantic public name of view-tabs (D1/D24/D46), a binding routines-shared holds, or a copy in this graph's module for
// its chunk, unless a linked graph (linkedGraphs: cowork-scheduled, mcp-app-card) already holds it (w11-sweep-curchat, D1):
// then it is imported from that graph's module under the name the module exports it as. A service vendor binding, a class declaration, a dynamic import, a React context another graph holds, or a
// binding view-tabs holds without a semantic name stops generation. --survey prints the closure without writing.
//
// Illustrations: 3.6556.2 points the empty-state art at the site root ("/images/illustrations/…"); the host loads
// dist/index.html from file://, so — as extract-chat-ui.mjs already does for the same files — the emitted text points
// at "./images/illustrations/…" (manifest `rewrites`). The four SVGs are pinned by their 3.6556.2 snapshot sha256; this
// generator writes the served copies (public/images/illustrations) from the 3.6556.2 snapshot and --check requires them
// byte-identical (manifest `illustrations`; prepare-ui.mjs no longer copies them from 2.2553.1, w11-sweep-curchat).
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
const output = path.join(root, 'src/generated/cowork-progress');
const adapterModule = '../../source-cowork-progress-v3-adapters.jsx';
const sharedAdapterModule = '../../source-routines-shared-adapters.jsx';
const sha = bytes => createHash('sha256').update(bytes).digest('hex');

// The roots: chunk -> original local -> { name, export, features }. `features` must appear in the root's prettier form
// (text or looseFeature, R2/E5); `export` is the root's export alias in its chunk when it has one.
const roots = {
  'c21f11e6d-Cyd8_HO8.js': {
    vT: { name: 'CoworkProgressSection', features: ['defaultMessage: "Progress", id: "sIMS7iH+wa"', 'disableTodoCommentAttachment: u,',
      'disableCommentAttachment: u,', 'defaultMessage: "{count} of {count}",', 'id: "BYBvgncezG",', 'values: { count: t.length },', 'headerHostedToggle: o,',
      'contentClassName: _,', 'collapsible: v,', 'headerLeftAction: y,'] },
    yT: { name: 'CoworkEmptyOutputs', features: ['defaultMessage: "View and open files created during this task.",', 'id: "p41Nenxyun"',
      '"flex flex-col items-start gap-3"', '"text-muted-as-secondary font-small"'] },
    xT: { name: 'CoworkOutputsSection', features: ['defaultMessage: "Working folders", id: "LtMr5Lrv6p"', 'defaultMessage: "Working folder", id: "jNSi3V9hUE"',
      'defaultMessage: "Go to folder", id: "EAUt85Zlu/"', 'defaultMessage: "Browse files", id: "LPKxPHsYaQ"', '_t?.writeLocalFile',
      '"flex items-center gap-2.5 py-1.5 px-1 rounded -mx-1 hover:bg-surface-0 w-full text-start"', 'children: " \\u00B7 CLAUDE.md"',
      'isExpanded: w("__ungrouped__", 0),', 'outputsByFolder: x,', 'userSelectedFolders: N,'] },
    // kT has no literal of its own (it forwards its props to IS): its features are the prop shapes, which featureHit also
    // matches through looseFeature (1-3 letter names generalized, R2/E5), as are Bb's folder_count and xT's isExpanded.
    kT: { name: 'CoworkFolderInstructionsDialog', features: ['{ isOpen: t, setIsOpen: n, folderPath: r, sessionId: i } = e,',
      'isOpen: t, onClose: a, folderPath: r, sessionId: i'] },
    Bb: { name: 'CoworkFileBrowserDialog', features: ['event_key: "cowork.file_explorer.opened"', 'defaultMessage: "Browse files", id: "r54z1q6Q3W"',
      'size: "3xl"', 'folder_count: r.length'] },
  },
  'cc5a62f6f-CwJjes2b.js': {
    F: { name: 'CoworkPanel', export: 'p', features: ['shrinkSections: c,', '{ flat: d } = i(w),',
      '"min-h-0 overflow-visible"', '"divide-y divide-alpha-1"', '"aria-busy": f, className: g, children: l'] },
    L: { name: 'CoworkPanelSection', export: 't', features: ['"data-section-header": ""', '"aria-expanded": p,', 'name: "CaretRight", size: W, rotate: G',
      '"group/section-header can-focus w-full flex items-center justify-between text-start select-none draggable-none"',
      '"dframe-card rounded-lg bg-[var(--df-sidebar-bg,var(--cds-surface-1))] [box-shadow:var(--df-shadow-card,none)]"', 'maxContentHeight: S,', 'shrinkTo: C,'] },
    T: { name: 'coworkPanelRow', export: 'i', features: ['"can-focus -mx-2 flex w-[calc(100%+1rem)] items-center gap-2.5 rounded px-2 py-1.5 text-start hover:bg-fill-ghost-hover"',
      'glyph: "flex h-5 w-5 shrink-0 items-center justify-center text-secondary",', 'kind: "shrink-0 text-caption text-muted-as-secondary",'] },
    ne: { name: 'CoworkPanelMergedContext', export: 'h', features: ['ne = o(!1)'] },
    // w13-close-gen-dedup (coworkui-panel-02): the section-header toggle display context (AT's Xh); the host reads it
    // by this name, not by the module's local.
    re: { name: 'CoworkPanelSectionToggleContext', export: 'm', features: ['re = o("always")'] },
    w: { name: 'CoworkPanelLayoutContext', export: 'f', features: ['w = o(S)'] },
    C: { name: 'coworkPanelFlatLayout', export: 'u', features: ['C = { tooltipSide: "left", tooltipSideOffset: 52, flat: !0 }'] },
    S: { name: 'coworkPanelCardLayout', export: 'l', features: ['S = { tooltipSide: "top", tooltipSideOffset: 4, flat: !1 }'] },
  },
};
// The illustrations the roots render: emitted path -> 3.6556.2 snapshot file under ion-dist (byte-identical served copy).
const illustrations = ['session-progress.svg', 'session-progress-dark.svg', 'session-artifacts.svg', 'session-artifacts-dark.svg'];
const rewrites = [{ from: '"/images/illustrations/', to: '"./images/illustrations/', reason: 'dist/index.html is loaded from file://' }];
// vendor-frame's CommonJS interop namespaces for React itself map to namespace imports, never to a copy.
const namespaceImports = { [`${official.vendorFrame}#c`]: 'react', [`${official.vendorFrame}#me`]: 'react/jsx-runtime', [`${official.vendorFrame}#Hn`]: 'react-dom' };
// Pure vendor declarations this graph may copy (chunk#local -> features).
// w13-coworkui-outputs: TanStack Query's replaceEqualDeep (vendor-query E, the row list's structural sharing uS) and the
// three plain helpers it calls; pure functions, no query client.
const vendorCopies = {
  'vendor-query-DVJ0goAF.js#E': ['if (n > 500) return t;', 'return i === o && c === i ? e : s;'],
  'vendor-query-DVJ0goAF.js#te': ['Array.isArray(e) && e.length === Object.keys(e).length'],
  'vendor-query-DVJ0goAF.js#O': ['n.hasOwnProperty("isPrototypeOf")'],
  'vendor-query-DVJ0goAF.js#ne': ['Object.prototype.toString.call(e) === "[object Object]"'],
  'vendor-query-DVJ0goAF.js#ee': ['ee = Object.prototype.hasOwnProperty'],
};
// The UI library chunks view-tabs also copies from (Base UI, clsx, zustand). Service / data vendors are never copied.
const copyableVendors = ['vendor-frame-', 'vendor-base-ui-', 'vendor-all-0-', 'vendor-icons-'];
// Host services of this graph: chunk -> original local -> { name, features, also }. Each one is documented where it is
// implemented (src/source-cowork-progress-v3-adapters.jsx).
const adapters = {
  // The section reads whether it sits in the desktop frame (shared-78 gK, export fs: dramatic_shrimp + the frame store);
  // this host is the desktop frame, so the dframe-card surface applies (as the 2.31226.0 slice's useDesktopFrame did).
  'shared-78-D5Fw2h0a.js': {
    gK: { name: 'useDesktopFrame', features: ['t = iK(),', 'return it(i);'], also: { iK: ['V("dramatic_shrimp")', '!!n.featureGateEnabled'] } },
  },
  // A todo row's "Comment on this item" handler (c4038fd41 L: analytics activity_panel.feedback + the composer's
  // pending attachment store, shared-182 sv). The host has no chat attachment store for Cowork todos and always renders
  // the official disableCommentAttachment branch, so the handler is the unavailable one.
  'c4038fd41-Dh3fgKd4.js': {
    L: { name: 'useTodoCommentAttachment', features: ['event_key: "activity_panel.feedback",', 'file_name: "todo_item.txt",', 'a = x(R);'] },
  },
  // w13-coworkui-outputs: the desktop file system bridge (window["claude.web"].FileSystem) the Outputs section, the folder
  // groups, the file rows and the file browser read: listFilesInFolder / showInFolder over the host IPC; no writeLocalFile.
  'shared-0-DDOOdL6P.js': {
    oC: { name: 'FileSystem', features: ['globalThis["claude.web"]?.FileSystem'] },
  },
  'c21f11e6d-Cyd8_HO8.js': {
    // The working-documents section: renders the funnel of the Cowork VM scratch root (c1373296b Xt); null without one.
    by: { name: 'CoworkWorkingDocuments', features: ['localSessionId: t,', 'f?.readWorkingFile ?? null', 'return (', 'f === null'] },
    // A non-file output row (artifacts, connector items: cc1aae219 drawers) and its thumbnail provider: no such outputs here.
    ox: { name: 'CoworkNonFileOutputRow', features: ['{ item: t, handlers: n } = e'] },
    Sx: { name: 'CoworkNonFileOutputsFrame', features: ['{ onlyForThumbs: !0 }', '{ outputs: t, handlers: n, children: r } = e,'] },
  },
  // The lazily loaded activity detail panes a row preloads on hover (skill / MCP server / web search) and the file source
  // view preload: not sliced; a row click goes to the host through onActivityClick.
  'c41de644f-Cwwg8Lzg.js': { i: { name: 'unavailableActivityDetail', features: ['i = n.handle'], also: { n: ['id: "skill_activity_detail"'] } } },
  'ca2ef848d-ChLvq6yZ.js': {
    e4: { name: 'unavailableActivityDetail', features: ['e4 = Q2.handle'], also: { Q2: ['id: "mcp_server_activity_detail"'] } },
    O4: { name: 'unavailableActivityDetail', features: ['O4 = E4.handle'], also: { E4: ['id: "web_search_activity_detail"'] } },
    // The Office add-in bridge (connected Word / Excel / PowerPoint files): none here.
    o1: { name: 'useConnectedOfficeFiles', features: ['K0($, 0, [])'] },
  },
  'c46809900-Ce_qNtlz.js': { m: { name: 'usePreloadFileSourceView', features: ['e && p();'], also: { u: ['id: "file_pane_source_view"'] } } },
  // The file browser preview and an entry's context menu (c45a8b2e8 k / E: the cowork file APIs).
  'c45a8b2e8-OnBJQ8u0.js': {
    k: { name: 'CoworkFilePreview', features: ['hideTaskLink: f,', 'inDockingCard: h'] },
    E: { name: 'CoworkFileEntryMenuItems', features: ['defaultMessage: "Path copied to clipboard.",', 'errorSource: c'] },
  },
  // The connector lookup over the claude.ai MCP store a row reads for an MCP tool's display name: cowork-scheduled's
  // adapter for the same binding (an empty store), re-exported by this graph's adapter module.
  'shared-156-BLTosN8U.js': { iw: { name: 'useConnectorLookup', features: ['return X(rw);'] } },
  // react-intl defineMessage (identity) the save error message goes through.
  'vendor-intl-DYfox5Co.js': { nn: { name: 'defineMessage', features: ['function nn(e) {', 'return e;'] } },
  // Download one output / all outputs (the claude.ai files API and served URLs).
  'shared-6-sd9jbJqs.js': {
    lb: { name: 'useDownloadOutput', features: ['"wiggle.file.download_failed"', '"files_api"'] },
    db: { name: 'useDownloadOutputs', features: ['writeFileDownload', '"served_url"'] },
    tS: { name: 'newestOutputFileUuid', features: ['newestVersionByConversation[e]?.get(t)'] },
  },
};
// Raw minified text the host panel follows (each must occur exactly once; `{ loose }` through looseFeature).
// The two context roots (ne, w) are one-statement declarations; their raw neighbourhood and the createContext import
// (vendor-frame to, official reactAliases) pin them beyond the 1-3 letter names (R2/E5, w11-sweep-curchat).
const rawCallSites = [
  { source: 'cc5a62f6f-CwJjes2b.js', role: 'The merged context ne = createContext(false) and the layout context w = createContext(card layout S)',
    features: ['to as o,', 'ne=o(!1),re=o("always"),S={tooltipSide:"top",tooltipSideOffset:4,flat:!1}', 'C={tooltipSide:"left",tooltipSideOffset:52,flat:!0},w=o(S),T={button:"can-focus', 'ne as h,', 'w as f,'] },
];
// The gate / config keys the generated roots read (w13-close-gen-dedup, coworkui-outputs-03), each pinned on the raw
// chunk text (exactly once) and recorded in the manifest with the host's answer (src/cowork-outputs-model.mjs).
const gates = [
  { key: 'claudeai_cowork_file_explorer_main', kind: 'growthbook-gate', reader: 'c21f11e6d AT zn (Wn: file browser Bb, xT "Browse files")',
    host: 'off (D29/D31; cowork-outputs-model FILE_EXPLORER_GATE)', raw: [['c21f11e6d-Cyd8_HO8.js', 'zn=Pe("claudeai_cowork_file_explorer_main")']] },
  { key: 'enableAdditionalDirectoriesClaudeMd', kind: 'dynamic-config', reader: 'shared-18 Ov (yukon_silver_config); xT\'s CLAUDE.md row with _t?.writeLocalFile',
    host: 'on (cowork-outputs-model COWORK_CLAUDE_MD_CONFIG)', raw: [['shared-18-D3y8YMFN.js', 'function Ov(){return ov().enableAdditionalDirectoriesClaudeMd??!1}'],
      ['c21f11e6d-Cyd8_HO8.js', 'enableAdditionalDirectoriesClaudeMd:g,']] },
];
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
// Graphs that already hold bindings this closure reaches (D1: imported, never sliced twice). cowork-scheduled holds
// shared-18's check glyphs (Gv/Kv/MC/NC); mcp-app-card holds shared-182's scoped state hook zL (with IL/RL, the WeakMap
// keyed by scope, so one copy). Only held bindings the linked module exports are imported (by its export name); their
// host adapters are not borrowed. files-changes (w13-coworkui-outputs) holds ca7840910's compact folder tree F, which the
// file browser renders, and shared-52's path basename nk (path-basename.mjs; chat-projects, which reads this graph, copies
// its own, so holding nk here would change that graph): only the bindings listed in linkedBySource are taken from it,
// pinned by the whole source chunk's sha256 (files-changes records its own declaration hashes), so one copy each.
// w13-close-gen-dedup (G1 crossLane 1, D1): shared-104's withLoadingFlag Cm is files-changes' loading-flag.mjs too (the
// one sessions-page imports). mcp-app-card publishes shared-78's tO / nO / q / qz (coworkui-outputs-02), so the error tag
// WeakMap is one instance.
const linkedBySource = { 'files-changes': ['ca7840910-By5J0kGX.js#F', 'shared-52-uHFNjl7C.js#nk', 'shared-104-CTONUSaz.js#Cm'] };
// Bindings a linked graph holds but its module does not export (so this graph copies them): recorded in the manifest as
// pendingDedupe for the holder's generator to export (cowork-scheduled is W12's; w13-coworkui-outputs does not edit it).
const heldUnexported = new Map();
async function linkedGraphs() {
  const held = new Map();
  for (const dir of ['cowork-scheduled', 'mcp-app-card', 'files-changes']) {
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

export async function extractCoworkProgress({ check = false, survey = false } = {}) {
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
    referenceVersion, referenceSnapshot, generator: 'scripts/extract-cowork-progress.mjs', adapterModule: 'src/source-cowork-progress-v3-adapters.jsx',
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
    const header = `// Original Claude Desktop ${referenceVersion} bindings from ${file}; generated by extract-cowork-progress.mjs.\n// Edit the extractor or src/source-cowork-progress-v3-adapters.jsx, never this file.\n`;
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
    if (check && (!served || sha(served) !== sha(bytes))) throw Error(`public/images/illustrations/${name} is not the ${referenceVersion} file. Run scripts/extract-cowork-progress.mjs.`);
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
  files['index.mjs'] = await format(`// Semantic names for the cowork-progress roots; generated by extract-cowork-progress.mjs.\n${indexLines.join('\n')}\n`, { parser: 'babel' });
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
  manifest.gates = [];
  for (const gate of gates) {
    for (const [file, feature] of gate.raw) {
      const count = (await readSource(file, cache)).code.split(feature).length - 1;
      if (count !== 1) throw Error(`gate ${gate.key}: ${JSON.stringify(feature)} occurs ${count} times in ${file}, expected 1`);
    }
    manifest.gates.push({ key: gate.key, kind: gate.kind, reader: gate.reader, host: gate.host, raw: gate.raw.map(([source, feature]) => ({ source, feature })) });
  }
  files['manifest.json'] = JSON.stringify(manifest, null, 2) + '\n';
  if (check) {
    const present = (await fs.readdir(output).catch(() => [])).sort(), expected = Object.keys(files).sort();
    if (JSON.stringify(present) !== JSON.stringify(expected)) throw Error(`Cowork progress output set changed: ${present.join(',')}. Run scripts/extract-cowork-progress.mjs.`);
    for (const [name, text] of Object.entries(files))
      if (await fs.readFile(path.join(output, name), 'utf8') !== text) throw Error(`Cowork progress source mismatch: ${name}. Run scripts/extract-cowork-progress.mjs.`);
  } else {
    await fs.mkdir(output, { recursive: true });
    for (const name of await fs.readdir(output)) if (!(name in files)) await fs.rm(path.join(output, name));
    for (const [name, text] of Object.entries(files)) await fs.writeFile(path.join(output, name), text);
    const served = path.join(root, 'public/images/illustrations');
    await fs.mkdir(served, { recursive: true });
    for (const [name, bytes] of illustrationBytes) await fs.writeFile(path.join(served, name), bytes);
  }
  const count = manifest.modules.reduce((n, m) => n + m.bindings.length, 0);
  console.log(`${check ? 'Verified' : 'Extracted'} ${manifest.modules.length} cowork progress modules (${count} original ${referenceVersion} bindings, ${Object.keys(manifest.publicNames).length} roots, ${manifest.adapters.length} adapters, ${manifest.sharedAdapters.length} shared adapters, ${used.routinesShared.size} routines-shared imports, ${used.linked.size} linked imports).`);
  return manifest;
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url))
  await extractCoworkProgress({ check: process.argv.includes('--check'), survey: process.argv.includes('--survey') });
