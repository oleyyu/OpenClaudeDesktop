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

const app = path.resolve(import.meta.dirname, '..');
const generated = path.join(app, 'src/generated/code-composer');
const viewTabsDir = path.join(app, 'src/generated/view-tabs');
const composerManifest = JSON.parse(fs.readFileSync(path.join(generated, 'manifest.json'), 'utf8'));
const viewTabsManifest = JSON.parse(fs.readFileSync(path.join(viewTabsDir, 'manifest.json'), 'utf8'));
const reference = path.resolve(app, '../reference', viewTabsManifest.referenceSnapshot, 'ion-dist/assets/v1');
const frame = 'shared-frame-BfjMqbuN.js';
const h = React.createElement;
let server, ViewTabs, Frame, Shell;
before(async () => {
  server = await createServer({ configFile: false, root: app, plugins: [react()], server: { middlewareMode: true, hmr: false, ws: false, watch: null }, appType: 'custom', logLevel: 'error' });
  ViewTabs = await server.ssrLoadModule(`/src/generated/view-tabs/${frame}`);
  Frame = await server.ssrLoadModule('/src/generated/code-composer/chat-composer-frame.mjs');
  Shell = await server.ssrLoadModule('/src/generated/code-composer/chat-composer-shell.mjs');
});
after(() => server?.close());

// [semantic name, 2.42304.0 local, official export alias (none for xa / da / hr), reader feature (once in the chunk)].
const contexts = [
  ['CdsNaturalImageTilesContext', 'xa', undefined, 'function Sa(){return W(xa)??!1}'],
  ['CdsOwnerWindowContext', 'Oa', '$l', 'function Ya(){return Ji(W(Oa))}'],
  ['CdsLabelsContext', 'vn', 'rd', 'function Z(e,t,n){return bn(W(vn),e,t,n)}'],
  ['CdsModeStoreContext', 'da', undefined, 'function Pa(){let e=W(da)??fa;'],
  ['CdsFizzyLakePartsContext', 'hr', undefined, 'function gr(){return W(hr)}'],
  ['CdsSurfaceContext', 'Ea', 'nu', 'function za(){return W(Ea)}'],
  ['CdsButtonIconSizeContext', 'Xl', 'll', 'n=W(Xl);'],
];

test('the seven contexts are view-tabs semantic names over the 2.42304.0 declarations (official alias where the chunk exports one)', () => {
  const original = fs.readFileSync(path.join(reference, frame), 'utf8');
  const exportsText = original.slice(original.lastIndexOf('export{'));
  const generatedText = fs.readFileSync(path.join(viewTabsDir, frame), 'utf8');
  for (const [name, local, alias, reader] of contexts) {
    assert.deepEqual(viewTabsManifest.publicNames[name], { file: frame, local, ...(alias ? { export: alias } : {}) }, name);
    assert.equal(original.split(`${local}=G(void 0)`).length - 1, 1, `${name}: ${local}=G(void 0) once`);
    assert.equal(original.split(reader).length - 1, 1, `${name}: ${reader} once`);
    if (alias) assert.match(exportsText, new RegExp(`[{,]${local.replace('$', '\\$')} as ${alias.replace('$', '\\$')}[,}]`), name);
    else assert.doesNotMatch(exportsText, new RegExp(`[{,]${local} as `), `${name}: the chunk does not export ${local}`);
    assert.match(generatedText.slice(generatedText.lastIndexOf('\nexport {')), new RegExp(`[{,]${local} as ${name}[,}]`), name);
    assert.ok(viewTabsManifest.modules.find((m) => m.source === frame).bindings.includes(local), `${name} was already selected`);
    assert.equal(typeof ViewTabs[name]?.Provider, 'object', name);
  }
  // CdsRoot provides the first five: they are the Providers of its own return.
  const root = generatedText.split('\n').find((line) => line.startsWith('function Za('));
  for (const local of ['xa', 'vn', 'da', 'hr', 'Ea']) assert.ok(root.includes(`H(${local}.Provider,{value:`), local);
});

test('extract-code-composer.mjs copies none of the seven: their readers import the view-tabs instances', () => {
  // R4g-composer CP4 (X7-10) copied the CDS Skeleton's xu / Su; R4i-graph GR3 named them in view-tabs
  // (CdsSkeletonShimmerContext / CdsSkeletonElementContext). The one copy left is the layer base Vd under the pane drop
  // halo's z-index (view-tabs holds that name back for mcp-app-card), listed with its reason; none of the seven CdsRoot /
  // shell contexts and neither Skeleton context is among the copies.
  assert.deepEqual(composerManifest.modules.filter((m) => m.contextCopies).map((m) => [m.target, Object.keys(m.contextCopies)]), [['chat-composer-frame.mjs', ['Vd']]]);
  const source = fs.readFileSync(path.join(app, 'scripts/extract-code-composer.mjs'), 'utf8');
  assert.match(source, /\nconst contextCopies = \{\n  'shared-frame-BfjMqbuN\.js': \{\n/, 'the guard stays');
  const table = source.slice(source.indexOf('\nconst contextCopies = {'), source.indexOf('\n};\n', source.indexOf('\nconst contextCopies = {')));
  for (const local of [...contexts.map(([, local]) => local), 'xu', 'Su']) assert.doesNotMatch(table, new RegExp(`\\n    ${local.replace('$', '\\$')}: `), local);
  assert.match(source, /would be a second instance; list it in contextCopies with the reason, or have view-tabs name it/);
  const byTarget = Object.fromEntries(composerManifest.modules.map((m) => [m.target, m]));
  const viewTabsImports = (target) => byTarget[target].imports.filter((i) => i.kind === 'view-tabs').map((i) => `${i.original}=${i.name}`);
  for (const pair of ['xa=CdsNaturalImageTilesContext', 'Oa=CdsOwnerWindowContext', 'vn=CdsLabelsContext', 'da=CdsModeStoreContext', 'hr=CdsFizzyLakePartsContext'])
    assert.ok(viewTabsImports('chat-composer-frame.mjs').includes(pair), pair);
  for (const pair of ['xu=CdsSkeletonShimmerContext', 'Su=CdsSkeletonElementContext'])
    assert.ok(viewTabsImports('chat-composer-frame.mjs').includes(pair), pair);
  for (const pair of ['Ea=CdsSurfaceContext', 'Xl=CdsButtonIconSizeContext'])
    assert.ok(viewTabsImports('chat-composer-shell.mjs').includes(pair), pair);
  // No generated composer module declares one of them any more.
  for (const file of fs.readdirSync(generated).filter((f) => f.endsWith('.mjs'))) {
    const text = fs.readFileSync(path.join(generated, file), 'utf8');
    for (const [, local] of contexts) assert.doesNotMatch(text, new RegExp(`\\bvar ${local} = G\\(`), `${file} declares ${local}`);
  }
  assert.deepEqual(Object.keys(byTarget['chat-composer-frame.mjs'].exports).filter((k) => k === 'Ea' || k === 'Xl'), []);
  assert.equal(typeof Shell.ChatComposerShell, 'object', 'the shell still loads over the view-tabs contexts');
});

test('main.jsx wraps the Code composer (renderMainComposer) in the view-tabs CdsRoot, with main.cds-root\'s density / font / platform and className "contents"', () => {
  const main = fs.readFileSync(path.join(app, 'src/main.jsx'), 'utf8');
  assert.equal(main.split('import { CdsRoot } from "./generated/view-tabs/shared-frame-BfjMqbuN.js";').length - 1, 1);
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
  // R4i-graph GR3, the /btw side-session pane around its composer (tests/composer-pane-drop.test.mjs pins it).
  for (const file of fs.readdirSync(path.join(app, 'src')).filter((f) => /\.(jsx|mjs|js)$/.test(f) && f !== 'main.jsx' && f !== 'source-btw-pane.jsx'))
    assert.doesNotMatch(fs.readFileSync(path.join(app, 'src', file), 'utf8'), /<CdsRoot\b|createElement\(CdsRoot|h\(CdsRoot/, file);
  assert.equal(fs.readFileSync(path.join(app, 'src/source-btw-pane.jsx'), 'utf8').split('<CdsRoot ').length - 1, 1);
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
  assert.equal(color.from?.sheet, 'public/assets/v1/c6a992d55-sXiDGMFQ.css');
  assert.match(fs.readFileSync(path.join(app, 'public/assets/v1/c6a992d55-sXiDGMFQ.css'), 'utf8'), /\.contents\{display:contents\}/);
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
    cursor = 0; internal.H = hooks;
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

test('the card focus shadow (ch) reads CdsRoot\'s mode store: dark html → the dark glow; without a root → the light one (the old copy\'s answer)', (t) => {
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
  const shadow = () => hookFixture(() => Frame.surfaceFocusShadowStyle('surface-3'), new Map([[ViewTabs.CdsModeStoreContext, store]])).render();
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
  const bare = hookFixture(() => Frame.surfaceFocusShadowStyle('surface-3')).render();
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
  // Z (useCdsLabel) under the root's labels context: the root's labels win, the English default is the fallback.
  const read = (key, fallback) => hookFixture(() => Frame.useCdsLabel(key, fallback), new Map([[ViewTabs.CdsLabelsContext, labels]])).render();
  assert.equal(read('reply', 'Reply'), 'Antworten');
  assert.equal(read('dropFiles', 'Drop files here'), 'Drop files here');
  // Ya (useRootOwnerWindow) reads CdsOwnerWindowContext: an element there yields its window.
  const win = { name: 'owner' };
  assert.equal(hookFixture(() => Frame.useRootOwnerWindow(), new Map([[ViewTabs.CdsOwnerWindowContext, { ownerDocument: { defaultView: win } }]])).render(), win);
  assert.equal(hookFixture(() => Frame.useRootNaturalImageTiles(), new Map([[ViewTabs.CdsNaturalImageTilesContext, 'sized']])).render(), 'sized');
  assert.equal(hookFixture(() => Frame.useRootNaturalImageTiles()).render(), false);
  assert.equal(hookFixture(() => Frame.useFizzyLakePart('bubbles'), new Map([[ViewTabs.CdsFizzyLakePartsContext, 'bubbles panels']])).render(), true);
  assert.equal(hookFixture(() => Frame.useFizzyLakePart('bubbles')).render(), false);
});
