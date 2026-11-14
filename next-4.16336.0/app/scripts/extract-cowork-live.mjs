// w13-coworkui-panel-live (research/w13-coworkui.md §1.2 rows 6-8, cwui-23 / cwui-24; plan-w13.md
// "w13-coworkui-panel-live"): extract the 3.6556.2 live sections of the Cowork session activity panel (c21f11e6d AT,
// readable :12929-12969): the in-app browser (kb / Ab), Claude in Chrome (hb) and Computer use (bb). Own generator, own
// output folder src/generated/cowork-live, own scripts/verify-gen-cowork-live.mjs (found by prepare-ui.mjs, which runs
// every verify-gen-*.mjs).
//
//   c21f11e6d  hb  CoworkBrowserSection: "Claude in Chrome" over the live frame card c5f921d63 D (export a, bg in
//                  c21f11e6d), the "Switch browser" popover ib and the clau.de chat link Wy (GrowthBook __gb__306342525).
//              bb  CoworkComputerUseSection: the computer-use preview store reader over xb ("Computer use", "Live",
//                  "Full control · {target}" / "Background · {target}", "Open computer use activity").
//              xb  CoworkComputerUseCard: the card itself, given the preview (bb's store read) as a prop.
//              kb  CoworkInAppBrowserTabsProbe: the header-hosted variant (reports whether the in-app browser has tabs).
//              Ab  CoworkInAppBrowserSection: the in-app browser row over jb ("Browser", "Open browser" / "Close browser").
//              pb  useCoworkToolRunning: AT's "a browser / computer-use tool is running" signal with its 2.5 s linger
//                  (fb), feeding isBrowserToolRunning / isComputerUseToolRunning.
//              sb  useCoworkBrowserScreenshot (w13-close-cowork-ui): ob(W, Qn), the newest Claude in Chrome result image.
//              db  useCoworkBrowserActivityText (w13-close-rail-regen, coworkui-panel-live-02): AT's Ir / Lr, the newest
//                  Claude in Chrome event's title through Dd (shared-130 WK and its closure: the computer / browser tool
//                  action titles) and the current domain (ub over navigate, inside lb batch / browser_batch /
//                  computer_batch steps too), over the resource activity coworkLiveResourceActivity builds.
//   AT renders them in this order after the Outputs section: `cr && o && kb`, `cr && !o && Ab`, hb, `Vn && bb` (Vn =
//   shared-78 bR, the GrowthBook gate cowork_computer_use_side_panel_card; cr = the Cowork built-in browser flag). The
//   panel (w13-coworkui-panel) owns those conditions; the props come from src/source-cowork-live-adapters.jsx
//   (coworkLiveActivity).
//
// Same engine as extract-cowork-progress.mjs (3.6556.2 rules: R1 constants from official-3.6556.2.mjs; R2/E5 features
// as text or looseFeature; R3 vendor-frame React aliases through official.reactAliases + assertVendorAlias, `Oo` being
// react/compiler-runtime's c; E3 the React Compiler helpers come from view-tabs by semantic name). A binding resolves, in
// this order, to: a host adapter of this graph (src/source-cowork-live-adapters.jsx; its original declaration must carry
// `features`), a host adapter routines-shared already uses for it, a React namespace / alias of vendor-frame, a semantic
// public name of view-tabs (D1/D24/D46), a binding routines-shared holds, or a copy in this graph's module for its chunk,
// unless a linked graph (linkedGraphs: cowork-progress, cowork-scheduled, mcp-app-card, files-changes) already holds it
// (D1): then it is imported from that graph's module under the name the module exports it as (cowork-progress gives
// the panel Section L, the row classes T and the layout context w; the live frame card's contexts come from there too).
// A service vendor binding, a class declaration, a dynamic import, a React context another graph holds, or a binding
// view-tabs holds without a semantic name stops generation. --survey prints the closure without writing.
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
const output = path.join(root, 'src/generated/cowork-live');
const adapterModule = '../../source-cowork-live-adapters.jsx';
const sharedAdapterModule = '../../source-routines-shared-adapters.jsx';
const sha = bytes => createHash('sha256').update(bytes).digest('hex');

// The roots: chunk -> original local -> { name, export, features }. `features` must appear in the root's prettier form
// (text or looseFeature, R2/E5); `export` is the root's export alias in its chunk when it has one.
const roots = {
  "c21f11e6d-Cyd8_HO8.js": {
    hb: { name: "CoworkBrowserSection", features: ["defaultMessage: \"Claude in Chrome\", id: \"1XvgYxOFV4\"", "id: \"2mDc1tSBbk\"",
      "defaultMessage: \"Open browser activity\", id: \"3x+WPYpgig\"", "hasBrowserActivity: t,", "isBrowserToolRunning: c,", "livePreviewSessionId: o,",
      "className: \"flex items-center gap-2.5 py-1.5\"", "name: \"Globe\", size: \"sm\""] },
    bb: { name: "CoworkComputerUseSection", features: ["{ previewSessionId: t } = e,", "n.state === \"ready\" && r !== void 0 && n.result.sessionId === r", "preview: i"] },
    xb: { name: "CoworkComputerUseCard", features: ["hasComputerUseActivity: t,", "isComputerUseToolRunning: s,", "preview: a,", "wantsCapture: !0", "g === ot.Display", "g === ot.App"] },
    kb: { name: "CoworkInAppBrowserTabsProbe", features: ["{ previewId: t, onHasTabsChange: n } = e,", ".tabs.length > 0,", "null"] },
    Ab: { name: "CoworkInAppBrowserSection", features: ["defaultMessage: \"New tab\", id: \"9a2ShG0Qn9\"", "{ tabs: c, activeTabId: l } = Eg(t),", "hasBrowserTabs: d,",
      "activeTabOrigin: v,", "onHasTabsChange: o"] },
    pb: { name: "useCoworkToolRunning", features: ["{ onMount: \"skip\" }", "setTimeout(() => a(!1), fb)", "r || i"] },
    db: { name: "useCoworkBrowserActivityText", features: ["latestActionText: i, currentDomain: n", "t.mcpToolName === \"navigate\"", "lb.has(t.mcpToolName)", ".text : void 0,"] },
    // w13-close-cowork-ui (coworkui-panel-live-02): AT's Claude in Chrome screenshot (`H = j ?? w ?? n` with n = sb(W)):
    // ob over the Chrome server's mcp_tool events, the newest result image through c82b159c8 o (Lm, the first image block)
    // and i (Im, a file_uuid preview URL with an organization, else a base64 data URL of an allowed media type).
    sb: { name: "useCoworkBrowserScreenshot", features: ["return ob(e, Qn);"] },
  },
};
const illustrations = [];
const rewrites = [];
// vendor-frame's CommonJS interop namespaces for React itself map to namespace imports, never to a copy.
const namespaceImports = { [`${official.vendorFrame}#c`]: "react", [`${official.vendorFrame}#me`]: "react/jsx-runtime", [`${official.vendorFrame}#Hn`]: "react-dom" };
const vendorCopies = {};
// The UI library chunks view-tabs also copies from (Base UI, clsx, zustand). Service / data vendors are never copied.
const copyableVendors = ["vendor-frame-", "vendor-base-ui-", "vendor-all-0-", "vendor-icons-"];
// Host services of this graph: chunk -> original local -> { name, features, also }. Each one is documented where it is
// implemented (src/source-cowork-live-adapters.jsx).
const adapters = {
  // The browser extension activity detail (a lazy pane the Claude in Chrome card preloads, il(bp, …)): not sliced.
  "ca2ef848d-ChLvq6yZ.js": { L1: { name: "unavailableActivityDetail", features: ["L1 = P1.handle"], also: { P1: ["id: \"browser_extension_activity_detail\""] } } },
  // The live frame card's fps: GrowthBook dynamic config cowork_activity_panel_live_preview, default { fps: 1 } (E).
  "c5f921d63-DIIF0_s9.js": { ae: { name: "useLivePreviewFps", features: ["return m(re, E, ie)?.fps ?? E.fps;"], also: { re: ["re = \"cowork_activity_panel_live_preview\""], E: ["E = { fps: 1 }"] } } },
  // The Claude in Chrome MCP client's browser listing / switching (shared-156 store localTools["claude-in-chrome"]).
  "c96143e67-DT6FIHom.js": { l: { name: "useConnectedBrowsers", features: ["isLoading: u, isSupported: n, refresh: f, select: p", "name: \"select_browser\""], also: { c: ["name: \"list_connected_browsers\""] } } },
  "c17c38211-B5y8e7So.js": { d: { name: "useSwitchBrowser", features: ["switchBrowser: o, isSwitching: e"], also: { u: ["name: \"switch_browser\""] } } },
  // The desktop live preview bridge (globalThis["claude.web"].ComputerUseLivePreview): one host implementation for both
  // chunks' copies of the declaration.
  "shared-0-DDOOdL6P.js": { KS: { name: "ComputerUseLivePreview", features: ["globalThis[\"claude.web\"]?.ComputerUseLivePreview"] } },
  "shared-1-BJhqMmkf.js": { Hu: { name: "ComputerUseLivePreview", features: ["globalThis[\"claude.web\"]?.ComputerUseLivePreview"] } },
};
// Raw minified text the sections carry that the host follows (each must occur exactly once in the chunk).
const rawCallSites = [
  { source: "c21f11e6d-Cyd8_HO8.js", role: "The computer-use card xb (bb renders it) and AT's live section order",
    features: ["defaultMessage:\"Open computer use activity\",id:\"YsvDvI5YpB\"", "defaultMessage:\"Live\",id:\"FAq+HlOlG7\"",
      "defaultMessage:\"Background \\u00B7 {target}\",id:\"bv0sdNmu+s\"", "defaultMessage:\"Full control \\u00B7 {target}\",id:\"YOk6ErXGPY\"",
      "defaultMessage:\"Computer use\",id:\"RfG2KsHAez\"", "fb=2500"] },
  { source: "shared-78-D5Fw2h0a.js", role: "The panel's server identities (iB Claude in Chrome, CR computer use) and the computer-use card gate (bR, AT Vn)",
    features: ["var _R=\"computer-use\",vR=\"cowork_computer_use_side_panel_card\";", "function bR(){return O(vR)}",
      "function CR({uuid:e,name:t}){return e?e===_R:t?t===\"computer-use\"||t===\"Computer use\":!1}",
      "e===\"a8f3c7e2-4b9d-4f1a-8c3e-9d2a5b7f8e1c\"||e===\"claude-in-chrome\""] },
];
const allowedGlobals = new Set(['Math', 'Number', 'Array', 'Object', 'Error', 'TypeError', 'String', 'Boolean', 'Set', 'Map', 'WeakMap', 'WeakSet', 'JSON',
  'Symbol', 'Promise', 'RegExp', 'Date', 'Intl', 'undefined', 'Infinity', 'NaN', 'globalThis', 'window', 'document', 'navigator', 'console',
  'setTimeout', 'clearTimeout', 'setInterval', 'clearInterval', 'requestAnimationFrame', 'cancelAnimationFrame', 'performance', 'encodeURIComponent', 'decodeURIComponent',
  'URL', 'URLSearchParams', 'parseInt', 'parseFloat', 'isNaN', 'isFinite', 'Reflect', 'Proxy', 'getComputedStyle', 'ResizeObserver', 'AbortController',
  'MutationObserver', 'IntersectionObserver', 'HTMLElement', 'Element', 'Node', 'queueMicrotask', 'structuredClone', 'localStorage', 'sessionStorage',
  'RangeError', 'HTMLButtonElement', 'HTMLInputElement', 'HTMLTextAreaElement', 'SVGElement', 'Event', 'FocusEvent', 'KeyboardEvent',
  'MouseEvent', 'PointerEvent', 'NodeFilter', 'CSS', 'arguments', 'TextEncoder', 'DOMMatrixReadOnly', 'matchMedia']);

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
// Graphs that already hold bindings this closure reaches (D1: imported, never sliced twice). cowork-progress holds the
// panel kit (cc5a62f6f Section L, row classes T, layout context w, the shared header-visibility context re) and the idle
// preload hook (shared-3 uh); cowork-scheduled holds the desktop bridges and stores both reach (shared-0 dC / oa,
// shared-25 Wi / oR / $r, shared-78 JJ, zustand v); mcp-app-card holds shared-182's scoped state hook zL. Only held
// bindings the linked module exports are imported (by its export name); their host adapters are not borrowed.
// files-changes is read the way cowork-progress reads it: only the bindings listed in linkedBySource, pinned by the
// whole source chunk's sha256 (none of them is reached here today).
// w13-close-rail-regen (D1, closeout cross-regen-02 / coworkui-panel-live-03): the pure bindings other areas sliced first
// are read the same way, one key each, so only the module that holds that key is imported:
//   sessions-page  shared-52 OT (pure-shared-52.mjs useLatchedValue, the latched value the live frame card c5f921d63 D
//                  reads; the Sessions page Hf and chat-projects import the same copy);
//   session-rail-kit  shared-5 Cy (element-size.mjs useElementSize; xy / Sy / wy are its closure), shared-frame co
//                  (window-actions.mjs useInOtherWindow) and shared-0 sW (plain-object.mjs isPlainObject, db's `at`): the
//                  modules import only view-tabs and React;
//   sidebar-resize  shared-130 Ef (clamp.mjs clamp, no imports).
// None of those modules imports a host adapter, so no rail / Sessions page adapter enters the Cowork graph (E41).
const linkedBySource = {
  'files-changes': ['ca7840910-By5J0kGX.js#F', 'shared-52-uHFNjl7C.js#nk'],
  'sessions-page': ['shared-52-uHFNjl7C.js#OT'],
  'session-rail-kit': ['shared-5-Bg6ZMqvt.js#Cy', 'shared-frame-6jtSkIit.js#co', 'shared-0-DDOOdL6P.js#sW'],
  'sidebar-resize': ['shared-130-dWztbTO1.js#Ef'],
};
// Bindings another area also slices that this graph keeps its own copy of, each with the reason (recorded in the manifest
// as keptCopies and checked against the holder's manifest). c155b6b71 (the in-app browser's preview tab store hooks):
// session-rail-sections/preview-tabs.mjs holds l / d / f / p / m / h / g but reaches the Launch bridge through the rail's
// own adapter (source-session-rail-sections-adapters.jsx claudeWebLaunch) and exports only g; importing it would pull a
// session-rail host adapter into the Cowork panel graph (E41), and this graph reads the bridge through cowork-scheduled's
// shared-0 dC like the rest of the panel. Pure functions and module-level Maps keyed by preview id, never written here
// (the Cowork in-app browser flag cr is off, home-gates).
const keptCopies = {
  // shared-0 _a / va / Ca / wa (the remote-devices and Claude_Browser__ tool-name prefixes Dd's RK / TK read) and shared-78
  // iB (db's Qn, the Claude in Chrome server test): transcript-rows also slices them, but its rows-shared-0 exports only
  // _a and rows-shared-78 imports the transcript host adapter (source-transcript-rows-adapters.jsx), which must not enter
  // the Cowork panel graph (E41). String constants and a pure predicate, no state.
  'transcript-rows': { keys: ['shared-0-DDOOdL6P.js#_a', 'shared-0-DDOOdL6P.js#va', 'shared-0-DDOOdL6P.js#Ca', 'shared-0-DDOOdL6P.js#wa', 'shared-78-D5Fw2h0a.js#iB'],
    reason: 'transcript-rows rows-shared-0 exports only _a and rows-shared-78 imports the transcript host adapter; importing would pull it into the Cowork graph (E41); constants and a pure predicate' },
  'session-rail-sections': { keys: ['l', 'd', 'f', 'p', 'm', 'h', 'g'].map(local => `c155b6b71-66pw54FW.js#${local}`),
    reason: 'preview-tabs.mjs imports the rail host adapter claudeWebLaunch and exports only g; importing it would pull a session-rail adapter into the Cowork graph (E41)' },
};
// Bindings a linked graph holds but its module does not export (so this graph copies them): recorded in the manifest as
// pendingDedupe for the holder's generator to export (cowork-scheduled is W12's; w13-coworkui-outputs does not edit it).
const heldUnexported = new Map();
async function linkedGraphs() {
  const held = new Map();
  for (const dir of ['cowork-progress', 'cowork-scheduled', 'mcp-app-card', 'files-changes', 'sessions-page', 'session-rail-kit', 'sidebar-resize']) {
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

export async function extractCoworkLive({ check = false, survey = false } = {}) {
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
    referenceVersion, referenceSnapshot, generator: 'scripts/extract-cowork-live.mjs', adapterModule: 'src/source-cowork-live-adapters.jsx',
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
    const header = `// Original Claude Desktop ${referenceVersion} bindings from ${file}; generated by extract-cowork-live.mjs.\n// Edit the extractor or src/source-cowork-live-adapters.jsx, never this file.\n`;
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
    if (check && (!served || sha(served) !== sha(bytes))) throw Error(`public/images/illustrations/${name} is not the ${referenceVersion} file. Run scripts/extract-cowork-live.mjs.`);
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
  files['index.mjs'] = await format(`// Semantic names for the cowork-live roots; generated by extract-cowork-live.mjs.\n${indexLines.join('\n')}\n`, { parser: 'babel' });
  manifest.adapters = [];
  for (const [file, locals] of Object.entries(adapters)) for (const [local, spec] of Object.entries(locals))
    manifest.adapters.push({ original: `${file}#${local}`, name: spec.name });
  manifest.sharedAdapters = [...used.sharedAdapters].sort().map(original => ({ original, name: rs.adapters.get(original) }));
  manifest.routinesSharedImports = used.routinesShared.size;
  manifest.pendingDedupe = manifest.modules.flatMap(mod => mod.bindings.map(b => `${mod.source}#${b.name}`))
    .filter(key => heldUnexported.has(key) && !linked.has(key)).sort().map(original => ({ original, holder: heldUnexported.get(original) }));
  manifest.linkedImports = [...used.linked].sort().map(key => ({ original: key, from: resolved.get(key).from, name: resolved.get(key).name }));
  // keptCopies: each listed key is still sliced here and still held by that area (else the note is stale: remove it).
  const own = new Set(manifest.modules.flatMap(mod => mod.bindings.map(b => `${mod.source}#${b.name}`)));
  manifest.keptCopies = [];
  for (const [area, { keys, reason }] of Object.entries(keptCopies)) {
    const other = JSON.parse(await fs.readFile(path.join(root, 'src/generated', area, 'manifest.json'), 'utf8'));
    const theirs = new Set(other.modules.flatMap(mod => (mod.bindings ?? []).map(b => `${path.basename(mod.source)}#${typeof b === 'string' ? b : b.name}`)));
    for (const key of keys) if (!own.has(key) || !theirs.has(key)) throw Error(`keptCopies ${area} ${key} is stale (sliced here: ${own.has(key)}, there: ${theirs.has(key)}); update it`);
    manifest.keptCopies.push({ area, originals: keys, reason });
  }
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
    if (JSON.stringify(present) !== JSON.stringify(expected)) throw Error(`Cowork live output set changed: ${present.join(',')}. Run scripts/extract-cowork-live.mjs.`);
    for (const [name, text] of Object.entries(files))
      if (await fs.readFile(path.join(output, name), 'utf8') !== text) throw Error(`Cowork live source mismatch: ${name}. Run scripts/extract-cowork-live.mjs.`);
  } else {
    await fs.mkdir(output, { recursive: true });
    for (const name of await fs.readdir(output)) if (!(name in files)) await fs.rm(path.join(output, name));
    for (const [name, text] of Object.entries(files)) await fs.writeFile(path.join(output, name), text);
    const served = path.join(root, 'public/images/illustrations');
    await fs.mkdir(served, { recursive: true });
    for (const [name, bytes] of illustrationBytes) await fs.writeFile(path.join(served, name), bytes);
  }
  const count = manifest.modules.reduce((n, m) => n + m.bindings.length, 0);
  console.log(`${check ? 'Verified' : 'Extracted'} ${manifest.modules.length} cowork live modules (${count} original ${referenceVersion} bindings, ${Object.keys(manifest.publicNames).length} roots, ${manifest.adapters.length} adapters, ${manifest.sharedAdapters.length} shared adapters, ${used.routinesShared.size} routines-shared imports, ${used.linked.size} linked imports).`);
  return manifest;
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url))
  await extractCoworkLive({ check: process.argv.includes('--check'), survey: process.argv.includes('--survey') });
