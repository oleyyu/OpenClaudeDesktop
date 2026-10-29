// R4g-composer CP1 (X7-07, ledger composer-01): the Code composer runs under the original 2.42304.0 CDS root
// (shared-frame Za, view-tabs CdsRoot), and the seven React contexts extract-code-composer.mjs used to copy
// (contextCopies: xa / Oa / vn / da / hr from CdsRoot, Ea / Xl from the shell) are the view-tabs instances. So the
// card's focus shadow (shared-frame ch over Na / Pa) reads CdsRoot's colour-mode store and follows html[data-mode]:
// in dark mode the card gets the dark glow, not the light one the copy used to read. Source / generator facts, SSR of the
// root, and the original CdsRoot / store / readers driven under a minimal hook dispatcher with a stub document and a
// fake MutationObserver. Nothing opens a window.
import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createServer } from 'vite';
import react from '@vitejs/plugin-react';
import { appSheets, computed, element, find, loadCascade, parseMarkup } from './fixtures/transcript-css-cascade.mjs';
import { withMemoCache } from './support/react-memo-cache.mjs';

const app = path.resolve(import.meta.dirname, '..');
const generated = path.join(app, 'src/generated/code-composer');
const viewTabsDir = path.join(app, 'src/generated/view-tabs');
const composerManifest = JSON.parse(fs.readFileSync(path.join(generated, 'manifest.json'), 'utf8'));
const viewTabsManifest = JSON.parse(fs.readFileSync(path.join(viewTabsDir, 'manifest.json'), 'utf8'));
const reference = path.resolve(app, '../reference', viewTabsManifest.referenceSnapshot, 'ion-dist/assets/v1');
const frame = 'shared-frame-6jtSkIit.js';
// 3.6556.2: view-tabs and code-composer are both 3.6556.2 (w1-cds-viewtabs, w2-composer-gen). The CdsRoot module is the new
// shared-frame; main.jsx imports CdsRoot through the view-tabs facade (R6, moved off the 2.42304.0 legacy shim in W7), the
// same instance.
const h = React.createElement;
let server, ViewTabs, Frame, Shell;
before(async () => {
  server = await createServer({ configFile: false, root: app, plugins: [react()], server: { middlewareMode: true, hmr: false, ws: false, watch: null }, appType: 'custom', logLevel: 'error' });
  ViewTabs = await server.ssrLoadModule('/src/generated/view-tabs/index.js');
  Frame = await server.ssrLoadModule('/src/generated/code-composer/chat-composer-frame.mjs');
  Shell = await server.ssrLoadModule('/src/generated/code-composer/chat-composer-shell.mjs');
});
after(() => server?.close());

// [semantic name, 3.6556.2 local, official export alias (none for Ma / Sa / Zn), reader feature (once in the chunk)].
const contexts = [
  ['CdsNaturalImageTilesContext', 'Ma', undefined, 'function Na(){return J(Ma)??!1}'],
  ['CdsOwnerWindowContext', 'za', '_d', 'function ao(){return J(za)}'],
  ['CdsLabelsContext', 'xn', 'wf', 'function wn(e,t,n){let $=J9(5),r=J(xn);'],
  ['CdsModeStoreContext', 'Sa', undefined, 'function Ga(){let e=J(Sa)??Ca;'],
  ['CdsFizzyLakePartsContext', 'Zn', undefined, 'function Qn(){return J(Zn)}'],
  ['CdsSurfaceContext', 'La', 'bd', 'function Xa(){return J(La)}'],
  ['CdsButtonIconSizeContext', 'Bu', 'Du', 'n=J(Bu);'],
];

test('the seven contexts are view-tabs semantic names over the 3.6556.2 declarations (official alias where the chunk exports one)', () => {
  assert.equal(viewTabsManifest.referenceVersion, '3.6556.2');
  const original = fs.readFileSync(path.join(reference, frame), 'utf8');
  const exportsText = original.slice(original.lastIndexOf('export{'));
  const generatedText = fs.readFileSync(path.join(viewTabsDir, frame), 'utf8');
  for (const [name, local, alias, reader] of contexts) {
    assert.deepEqual(viewTabsManifest.publicNames[name], { file: frame, local, ...(alias ? { export: alias } : {}) }, name);
    assert.equal(original.split(`${local}=ut(void 0)`).length - 1, 1, `${name}: ${local}=ut(void 0) once`);
    assert.equal(original.split(reader).length - 1, 1, `${name}: ${reader} once`);
    if (alias) assert.match(exportsText, new RegExp(`[{,]${local.replace('$', '\\$')} as ${alias.replace('$', '\\$')}[,}]`), name);
    else assert.doesNotMatch(exportsText, new RegExp(`[{,]${local} as `), `${name}: the chunk does not export ${local}`);
    assert.match(generatedText.slice(generatedText.lastIndexOf('\nexport {')), new RegExp(`[{,]${local} as ${name}[,}]`), name);
    assert.ok(viewTabsManifest.modules.find((m) => m.source === frame).bindings.includes(local), `${name} was already selected`);
    assert.equal(typeof ViewTabs[name]?.Provider, 'object', name);
  }
  // CdsRoot (lo, exported yd) provides the first five: they are the Providers of its own return.
  assert.deepEqual(viewTabsManifest.publicNames.CdsRoot, { file: frame, local: 'lo', export: 'yd' });
  const root = generatedText.split('\n').find((line) => line.startsWith('function lo('));
  for (const local of ['Ma', 'xn', 'Sa', 'Zn', 'La']) assert.ok(root.includes(`b(${local}.Provider,{value:`), local);
});

test('extract-code-composer.mjs copies none of the seven: their readers import the view-tabs instances', () => {
  // 3.6556.2 (w2-composer-gen): the last copy (the layer base Vd under the pane drop halo) is gone too, since view-tabs
  // names CdsLayerBaseContext / useCdsLayerAwareZIndex (E4); the guard that refuses a second instance stays.
  assert.equal(composerManifest.referenceVersion, '3.6556.2');
  assert.deepEqual(composerManifest.modules.filter((m) => m.contextCopies).map((m) => m.target), []);
  const source = fs.readFileSync(path.join(app, 'scripts/extract-code-composer.mjs'), 'utf8');
  assert.match(source, /\nconst contextCopies = \{\};\n/, 'the guard table is empty');
  assert.match(source, /would be a second instance; list it in contextCopies with the reason, or have view-tabs name it/);
  const byTarget = Object.fromEntries(composerManifest.modules.map((m) => [m.target, m]));
  const viewTabsImports = (target) => byTarget[target].imports.filter((i) => i.kind === 'view-tabs').map((i) => `${i.original}=${i.name}`);
  for (const pair of ['Ma=CdsNaturalImageTilesContext', 'Sa=CdsModeStoreContext'])
    assert.ok(viewTabsImports('chat-composer-frame.mjs').includes(pair), pair);
  for (const pair of ['La=CdsSurfaceContext', 'Bu=CdsButtonIconSizeContext', 'wn=useCdsLabel', 'er=useFizzyLakePart'])
    assert.ok(viewTabsImports('chat-composer-shell.mjs').includes(pair), pair);
  // No generated composer module holds one of them as its own binding any more.
  for (const module of composerManifest.modules.filter((m) => m.source === frame))
    for (const [name, local] of contexts) assert.ok(!module.bindings.some((b) => (b.name ?? b) === local), `${module.target} copies ${name}`);
  assert.deepEqual(Object.keys(byTarget['chat-composer-frame.mjs'].exports).filter((k) => contexts.some(([, local]) => local === k)), []);
  assert.equal(typeof Shell.ChatComposerShell, 'object', 'the shell still loads over the view-tabs contexts');
});

test('main.jsx wraps the Code composer (renderMainComposer) in the view-tabs CdsRoot, with main.cds-root\'s density / font / platform and className "contents"', () => {
  const main = fs.readFileSync(path.join(app, 'src/main.jsx'), 'utf8');
  assert.equal(main.split('import { CdsRoot } from "./generated/view-tabs/index.js";').length - 1, 1);
  const start = main.indexOf('const renderMainComposer = () => (');
  const body = main.slice(start, main.indexOf('\n  );\n', start));
  // R4g-composer CP4 (X7-10): experimental is the Code pane's (generated shared-18 Ub), which the image tiles read.
  assert.match(body, /^const renderMainComposer = \(\) => \(\n    <CdsRoot density=\{themeDensity\(boot\?\.config\)\} font=\{cdsFont\} platform="desktop" experimental=\{codePaneExperimental\} className="contents">\n    <SourceComposer\n/);
  assert.equal(main.split('import { codePaneExperimental } from "./generated/code-composer/code-pane-experimental.mjs";').length - 1, 1);
  assert.ok(body.endsWith('    />\n    </CdsRoot>'), 'the root closes right after the composer');
  // No mode (the store follows html[data-mode]), no pageBackground (main.cds-root keeps .cds-root's --cds-page-bg).
  const open = body.slice(0, body.indexOf('>') + 1);
  for (const prop of ['mode=', 'pageBackground=', 'labels=']) assert.ok(!open.includes(prop), prop);
  // main.cds-root carries the same three attributes the root repeats.
  assert.match(main, /className="workspace epitaxy-root cds-root"\n\s+data-density=\{themeDensity\(boot\?\.config\)\}\n\s+data-font=\{cdsFont\}\n\s+data-platform="desktop"/);
  // Only main.jsx renders a CdsRoot among the host sources (the sidebar dialogs' generated ones aside), and, since
  // R4i-graph GR3, the /btw side-session pane around its composer (tests/composer-pane-drop.test.mjs pins it), and,
  // since w11-e31-terminal-cont, the terminal pane around its close confirmation (3.6556.2 cccc2cf0a Zx Ie: shared-frame
  // yd = CdsRoot, density comfortable, around the CdsConfirmationDialog), and, since W12 sidechat-cont, the floating side
  // chat (3.6556.2 cccc2cf0a qF: `u(be,{density:"compact",className:"contents",children:u("div",{ref:r,className:
  // "epitaxy-root …`, be = shared-frame yd), and, since W12b changes-files, the file editor's selection chip (3.6556.2
  // cbd02b8f2 li: `W!==null&&Z.length>0?p(n(oe,{children:n("div",{dir:Je…`, oe = shared-18 fx:
  // `m(Ce,{density:"compact",experimental:lx,className:"contents",children:t})`), and, since W12b terminal-preview-tabs,
  // the preview close-tabs dialog (3.6556.2 cf580efe9 va: `r(Pe,{children:r(E.Root,{open:f,…`, Pe = shared-18 Qd = fx).
  // w13-close-chat-surface (E77): and the incognito top bar's Exit incognito (3.6556.2 shared-20 Qg:
  // `i(ne,{mode:b,className:"contents",children:x})`, b the opposite of the resolved mode; source-incognito-shell.jsx).
  const roots = { 'source-btw-pane.jsx': 1, 'source-terminal-pane.jsx': 1, 'source-side-chat.jsx': 1, 'source-file-editor.jsx': 1, 'source-preview-tabs.jsx': 1, 'source-incognito-shell.jsx': 1 };
  for (const file of fs.readdirSync(path.join(app, 'src')).filter((f) => /\.(jsx|mjs|js)$/.test(f) && f !== 'main.jsx' && !(f in roots)))
    assert.doesNotMatch(fs.readFileSync(path.join(app, 'src', file), 'utf8'), /<CdsRoot\b|createElement\(CdsRoot|h\(CdsRoot/, file);
  for (const [file, count] of Object.entries(roots))
    assert.equal(fs.readFileSync(path.join(app, 'src', file), 'utf8').split('<CdsRoot ').length - 1, count, file);
  assert.match(fs.readFileSync(path.join(app, 'src/source-terminal-pane.jsx'), 'utf8'), /<CdsRoot density="comfortable" className="contents">/);
  assert.match(fs.readFileSync(path.join(app, 'src/source-side-chat.jsx'), 'utf8'), /<CdsRoot density="compact" className="contents">/);
  assert.match(fs.readFileSync(path.join(app, 'src/source-file-editor.jsx'), 'utf8'), /<CdsRoot density="compact" experimental=\{CHIP_ROOT_EXPERIMENTAL\} className="contents">/);
  assert.match(fs.readFileSync(path.join(app, 'src/source-preview-tabs.jsx'), 'utf8'), /<CdsRoot density="compact" experimental=\{codePaneExperimental\} className="contents">/);
});

test('SSR: the root is div.cds-root.text-primary.contents with the repeated attributes, the body font size, and no data-mode / data-page-bg', () => {
  const html = renderToStaticMarkup(h(ViewTabs.CdsRoot, { density: 'compact', font: 'sans', platform: 'desktop', className: 'contents' }, h('span', null, 'x')));
  assert.equal(html, '<div class="cds-root text-primary contents" data-density="compact" data-platform="desktop" data-font="sans" style="font-size:var(--cds-font-size-body)"><span>x</span></div>');
  // Real cascade: display: contents and the primary text colour come from the official sheet; the wrapper adds no box.
  const root = element('div', { id: 'root' });
  element('html', { class: 'cds-root', 'data-mode': 'dark', 'data-density': 'comfortable', 'data-platform': 'desktop', 'data-theme': 'claude' }, [element('body', {}, [root])]);
  const nodes = parseMarkup(html);
  for (const node of nodes) { node.parent = root; root.children.push(node); }
  const cascade = loadCascade(appSheets(app));
  const wrapper = find(root, (n) => n.attrs?.class === 'cds-root text-primary contents');
  const color = computed(cascade, wrapper, 'color');
  assert.equal(color.value, 'var(--cds-text-primary)');
  assert.equal(color.from?.sheet, 'public/assets/v1/c6a992d55-Che1orl5.css');
  assert.match(fs.readFileSync(path.join(app, 'public/assets/v1/c6a992d55-Che1orl5.css'), 'utf8'), /\.contents\{display:contents\}/);
});

// ---------------------------------------------------------------- the original root, store and readers, driven
function hookFixture(component, contexts = new Map()) {
  let cursor = 0, result;
  const cells = [], effects = [];
  const same = (a, b) => a && b && a.length === b.length && a.every((v, i) => Object.is(v, b[i]));
  const effect = (fn, deps) => { const i = cursor++; const cell = cells[i]; if (!cell || !deps || !same(cell.deps, deps)) { effects.push(fn); cells[i] = { deps }; } };
  const hooks = {
    useState(initial) { const i = cursor++; cells[i] ??= { value: typeof initial === 'function' ? initial() : initial }; return [cells[i].value, (v) => { cells[i].value = typeof v === 'function' ? v(cells[i].value) : v; }]; },
    useReducer(reducer, initial, init) { const [state, set] = hooks.useState(() => (init ? init(initial) : initial)); return [state, (action) => set((s) => reducer(s, action))]; },
    useRef(initial) { const i = cursor++; cells[i] ??= { value: { current: initial } }; return cells[i].value; },
    useMemo(fn, deps) { const i = cursor++; if (!cells[i] || !same(cells[i].deps, deps)) cells[i] = { value: fn(), deps }; return cells[i].value; },
    useCallback(fn, deps) { return hooks.useMemo(() => fn, deps); },
    useContext(context) { return contexts.has(context) ? contexts.get(context) : context._currentValue; },
    use(context) { return hooks.useContext(context); },
    useEffect: effect, useLayoutEffect: effect, useInsertionEffect: effect,
    useImperativeHandle() {},
    useSyncExternalStore(subscribe, get) { return get(); },
    useId() { const i = cursor++; cells[i] ??= { value: `:r${i}:` }; return cells[i].value; },
    useDebugValue() {}, useTransition() { return [false, (fn) => fn()]; }, useDeferredValue(v) { return v; },
  };
  const render = () => {
    const internal = React.__CLIENT_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE, old = internal.H;
    cursor = 0; internal.H = withMemoCache(hooks);
    try { result = component(); } finally { internal.H = old; }
    while (effects.length) effects.shift()();
    return result;
  };
  return { render };
}
const providerValue = (node, context) => {
  if (!node || typeof node !== 'object') return undefined;
  if (node.type === context.Provider || node.type === context) return { value: node.props.value };
  const kids = Array.isArray(node.props?.children) ? node.props.children : [node.props?.children];
  for (const kid of kids) { const found = providerValue(kid, context); if (found) return found; }
  return undefined;
};
const withGlobals = (t, globals) => {
  const saved = Object.fromEntries(Object.keys(globals).map((k) => [k, Object.getOwnPropertyDescriptor(globalThis, k)]));
  for (const [k, v] of Object.entries(globals)) Object.defineProperty(globalThis, k, { value: v, configurable: true, writable: true });
  t.after(() => { for (const [k, d] of Object.entries(saved)) { if (d) Object.defineProperty(globalThis, k, d); else delete globalThis[k]; } });
};
const LIGHT_GLOW = '0 0 6px 1px var(--cds-bg-accent)';
const DARK_GLOW = '0 0 6px 1px hsl(from var(--cds-role-accent-600) h s l / 60%)';

test('the card focus shadow (sg, old ch) reads CdsRoot\'s mode store: dark html → the dark glow; without a root → the light one (the old copy\'s answer)', (t) => {
  let mode = 'dark';
  const observers = [];
  class FakeMutationObserver { constructor(cb) { this.cb = cb; observers.push(this); } observe(node, options) { this.node = node; this.options = options; } disconnect() { this.disconnected = true; } takeRecords() { return []; } }
  const documentElement = { getAttribute: (name) => (name === 'data-mode' ? mode : null) };
  withGlobals(t, { document: { documentElement }, MutationObserver: FakeMutationObserver });
  // The host's CdsRoot props (main.jsx renderMainComposer): no mode, so the store follows html[data-mode].
  const root = hookFixture(() => ViewTabs.CdsRoot({ density: 'compact', font: 'sans', platform: 'desktop', className: 'contents', children: null })).render();
  const store = providerValue(root, ViewTabs.CdsModeStoreContext)?.value;
  assert.equal(typeof store?.subscribe, 'function', 'CdsRoot provides a colour-mode store');
  assert.equal(store.getSnapshot(), 'dark');
  // Mounted: CdsRoot's layout effect hands the store its div (R.current); the store reads the nearest [data-mode] from it.
  store.setElement({ isConnected: true, closest: (selector) => (selector === '[data-mode]' ? documentElement : null) });
  assert.equal(store.getSnapshot(), 'dark');
  // The composer's reader, under that store (the dispatcher's useSyncExternalStore reads getSnapshot, as a client render).
  const shadow = () => hookFixture(() => Frame.useSurfaceFocusShadowStyle('surface-3'), new Map([[ViewTabs.CdsModeStoreContext, store]])).render();
  assert.ok(shadow()['--cds-focus-shadow'].endsWith(DARK_GLOW), shadow()['--cds-focus-shadow']);
  assert.equal(shadow()['--cds-page-bg'], 'var(--cds-surface-3)');
  // A theme flip: the store watches html[data-mode] (subtree) and tells its subscribers; the reader then answers light.
  let told = 0;
  const unsubscribe = store.subscribe(() => { told += 1; });
  const watcher = observers.find((o) => o.node === documentElement);
  assert.deepEqual(watcher.options, { attributes: true, attributeFilter: ['data-mode'], subtree: true });
  mode = 'light'; watcher.cb([]);
  assert.equal(told, 1);
  assert.equal(store.getSnapshot(), 'light');
  assert.ok(shadow()['--cds-focus-shadow'].endsWith(LIGHT_GLOW));
  unsubscribe();
  assert.equal(watcher.disconnected, true);
  // No root: fa's undefined snapshot → "light" (what the context copy always read, dark or not).
  mode = 'dark';
  const bare = hookFixture(() => Frame.useSurfaceFocusShadowStyle('surface-3')).render();
  assert.ok(bare['--cds-focus-shadow'].endsWith(LIGHT_GLOW));
});

test('the other readers share CdsRoot\'s instances: owner window, labels, natural tiles, fizzy-lake parts, density', (t) => {
  withGlobals(t, { document: { documentElement: { getAttribute: () => null } }, MutationObserver: class { observe() {} disconnect() {} } });
  const root = hookFixture(() => ViewTabs.CdsRoot({ density: 'compact', font: 'sans', platform: 'desktop', className: 'contents', labels: (key) => (key === 'reply' ? 'Antworten' : undefined), children: null })).render();
  const value = (context) => providerValue(root, context)?.value;
  assert.equal(value(ViewTabs.CdsDensityContext), 'compact');
  assert.equal(value(ViewTabs.CdsNaturalImageTilesContext), undefined, 'no experimental: the default (MessageAttachments keeps data-fit off)');
  assert.equal(value(ViewTabs.CdsSurfaceContext), undefined, 'no pageBackground');
  const labels = value(ViewTabs.CdsLabelsContext);
  // wn (useCdsLabel, view-tabs) under the root's labels context: the root's labels win, the English default is the fallback.
  const read = (key, fallback) => hookFixture(() => ViewTabs.useCdsLabel(key, fallback), new Map([[ViewTabs.CdsLabelsContext, labels]])).render();
  assert.equal(read('reply', 'Reply'), 'Antworten');
  assert.equal(read('dropFiles', 'Drop files here'), 'Drop files here');
  // so (useCdsOwnerWindow, view-tabs) reads CdsOwnerWindowContext: an element there yields its window.
  const win = { name: 'owner' };
  assert.equal(hookFixture(() => ViewTabs.useCdsOwnerWindow(), new Map([[ViewTabs.CdsOwnerWindowContext, { ownerDocument: { defaultView: win } }]])).render(), win);
  assert.equal(hookFixture(() => Frame.useRootNaturalImageTiles(), new Map([[ViewTabs.CdsNaturalImageTilesContext, 'sized']])).render(), 'sized');
  assert.equal(hookFixture(() => Frame.useRootNaturalImageTiles()).render(), false);
  assert.equal(hookFixture(() => ViewTabs.useFizzyLakePart('bubbles'), new Map([[ViewTabs.CdsFizzyLakePartsContext, 'bubbles panels']])).render(), true);
  assert.equal(hookFixture(() => ViewTabs.useFizzyLakePart('bubbles')).render(), false);
});
