import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createServer } from 'vite';
import react from '@vitejs/plugin-react';
import { breadcrumbCut, graphemeEnds, headCut, observeWidth } from '../src/generated/code-current/breadcrumb-measure.mjs';
import { breadcrumbSegments, pathWithinRoot, segmentMenuTarget, segmentKeys } from '../src/generated/code-current/breadcrumb-paths.mjs';
import { createBreadcrumbLister } from '../src/file-breadcrumb-model.mjs';

test('middle truncation keeps the first folder and the nearest suffix that fit', () => {
  const widths = [30, 40, 50, 60, 100];
  const cut = budget => breadcrumbCut({ widths, ellipsisWidth: 20, budget });
  assert.equal(cut(300), null);
  assert.equal(cut(279.6), null, 'half-pixel tolerance prevents resize oscillation');
  assert.deepEqual(cut(260), { from: 2, to: 3 });
  assert.deepEqual(cut(200), { from: 2, to: 4 });
  assert.deepEqual(cut(120), { from: 0, to: 4 });
  assert.deepEqual(breadcrumbCut({ widths: [10, 10, 100], ellipsisWidth: 20, budget: 115 }), { from: 0, to: 0 }, 'do not replace shorter directory text with a wider ellipsis');
});

test('filename prefix measurement respects graphemes and leaves room for an ellipsis', () => {
  assert.deepEqual(graphemeEnds('a\u0301😀👩‍💻z'), [2, 4, 9, 10]);
  assert.equal(headCut({ cuts: graphemeEnds('ab😀cd'), widthTo: end => end * 10, ellipsisWidth: () => 10, budget: 45 }), 2);
  assert.equal(headCut({ cuts: [2], widthTo: () => 40, ellipsisWidth: () => 10, budget: 30 }), null, 'CSS fallback when even the first grapheme does not fit');
  assert.equal(headCut({ cuts: [1, 2], widthTo: end => end * 10, ellipsisWidth: () => 10, budget: 19.6 }), null);
});

test('width observers are shared per window, dispatch per element and detach cleanly', () => {
  const observers = [], values = [];
  const view = { ResizeObserver: class {
    constructor(callback) { this.callback = callback; this.nodes = new Set(); observers.push(this); }
    observe(node) { this.nodes.add(node); }
    unobserve(node) { this.nodes.delete(node); }
  } };
  const a = { ownerDocument: { defaultView: view } }, b = { ownerDocument: { defaultView: view } };
  const stopA = observeWidth(a, (width, window) => values.push(['a', width, window === view]));
  const stopB = observeWidth(b, width => values.push(['b', width]));
  assert.equal(observers.length, 1);
  observers[0].callback([{ target: a, contentRect: { width: 100 } }, { target: b, contentRect: { width: 200 } }]);
  assert.deepEqual(values, [['a', 100, true], ['b', 200]]);
  stopA(); stopB();
  assert.equal(observers[0].nodes.size, 0);
  observers[0].callback([{ target: a, contentRect: { width: 300 } }]);
  assert.equal(values.length, 2);
});

test('relative display segments retain absolute menu paths and only list directories inside the root', () => {
  const parts = breadcrumbSegments({ displayPath: 'src/lib/app.js', fullPath: '/repo/src/lib/app.js', root: '/repo', posix: true });
  assert.deepEqual(parts.dirs, [{ label: 'src', absPath: '/repo/src', listsDir: '/repo/src' }, { label: 'lib', absPath: '/repo/src/lib', listsDir: '/repo/src/lib' }]);
  assert.deepEqual(parts.name, { label: 'app.js', absPath: '/repo/src/lib/app.js', listsDir: '/repo/src/lib' });
  const outside = breadcrumbSegments({ displayPath: '/else/file.txt', fullPath: '/else/file.txt', root: '/repo', posix: true });
  assert.equal(outside.name.listsDir, undefined);
  const hidden = { ...parts.dirs[0], spoken: 'src/lib' };
  assert.deepEqual(segmentMenuTarget(hidden, false), { absPath: '/repo/src', isDirectory: true, heading: 'src' });
  assert.equal(segmentMenuTarget({ absPath: '\\\\server\\share\\file' }, true), undefined);
  assert.equal(pathWithinRoot('/repository/file', '/repo', true), false);
  assert.equal(pathWithinRoot('/repo/../else', '/repo', true), false);
  assert.equal(pathWithinRoot('c:\\repo\\file', 'C:\\repo', false), true);
  const windows = breadcrumbSegments({ displayPath: 'src\\app.js', fullPath: 'C:\\repo\\src\\app.js', root: 'C:\\repo', posix: false });
  assert.equal(windows.dirs[0].listsDir, 'C:\\repo\\src');
});

test('folder lists use absolute display identities while opening preserves existing relative tabs', async () => {
  const calls = [];
  const lister = createBreadcrumbLister({ root: '/repo', list: async path => { calls.push(['list', path]); return [{ path: 'src/a.js', name: 'a.js', directory: false }]; }, onOpenFile: (path, options) => calls.push(['open', path, options]) });
  assert.deepEqual(await lister.list('/repo/src'), [{ path: '/repo/src/a.js', name: 'a.js', directory: false }]);
  lister.onOpenFile('/repo/src/a.js', { keep: true });
  assert.deepEqual(calls, [['list', 'src'], ['open', 'src/a.js', { keep: true }]]);
  lister.onOpenFile('/outside/a.js', { keep: false });
  assert.equal(calls.at(-1)[1], '/outside/a.js', 'outside paths remain absolute for the existing scope guard');
});

test('breadcrumb keys open a directory or move to visible neighboring segments only', () => {
  const focused = [], opened = [];
  const nodes = [0, 1, 2].map(index => ({ focus: () => focused.push(index) }));
  for (const node of nodes) node.closest = () => ({ querySelectorAll: () => nodes });
  let prevented = 0;
  const press = (key, extra = {}) => segmentKeys({ key, currentTarget: nodes[1], preventDefault: () => prevented++, ...extra }, () => opened.push(true));
  press('ArrowLeft'); press('ArrowRight'); press('ArrowDown'); press('ArrowLeft', { altKey: true });
  assert.deepEqual(focused, [0, 2]); assert.deepEqual(opened, [true]); assert.equal(prevented, 3);
});

// ---- R3-files FT-06 / SC-2 / FT-16: the 2.42304.0 breadcrumb (code-current breadcrumb-view.mjs = cfac349aa Kt/Jt/Yt/
// Q/qt/Ht, breadcrumb-file.mjs = cd2efac6e Yl) and its folder popover (files-changes breadcrumb-folder.mjs = cfac349aa
// Pt/Nt/Lt, file-tree-compact.mjs = ca7840910 ie), checked by generator provenance, SSR, a hook dispatcher, a real
// QueryClient and controlled events (no DOM, no desktop). ----
const ROOT = path.resolve(import.meta.dirname, '..');
const OFFICIAL = path.join(ROOT, '../reference/installed-2.42304.0-20261017/ion-dist/assets/v1');
const official = (name) => fs.readFileSync(path.join(OFFICIAL, name), 'utf8');
const source = (file) => fs.readFileSync(path.join(ROOT, file), 'utf8');
let server;
const ssr = (file) => server.ssrLoadModule(file);
before(async () => {
  server = await createServer({ configFile: false, root: ROOT, plugins: [react()], server: { middlewareMode: true, hmr: false, watch: null }, appType: 'custom', logLevel: 'error' });
});
after(async () => { await server?.close(); });

// A hook dispatcher whose state persists across calls of one component (no React DOM). `contexts` answers use() /
// useContext() for the given contexts; `context` answers every other one.
function harness(component, { contexts = new Map(), context } = {}) {
  const slots = [];
  let index = 0;
  const read = (usable) => (contexts.has(usable) ? contexts.get(usable) : context !== undefined ? context : usable._currentValue);
  const hooks = {
    use: read, useContext: read,
    useState: (initial) => { const at = index++; if (!(at in slots)) slots[at] = typeof initial === 'function' ? initial() : initial; return [slots[at], (value) => { slots[at] = typeof value === 'function' ? value(slots[at]) : value; }]; },
    useRef: (initial) => { const at = index++; if (!(at in slots)) slots[at] = { current: initial }; return slots[at]; },
    useCallback: (fn) => { index++; return fn; },
    useMemo: (fn) => { index++; return fn(); },
    useEffect: () => { index++; }, useLayoutEffect: () => { index++; },
  };
  return (...args) => {
    index = 0;
    const internal = React.__CLIENT_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE, old = internal.H;
    internal.H = hooks;
    try { return component(...args); } finally { internal.H = old; }
  };
}
const tick = (ms = 0) => new Promise((resolve) => setTimeout(resolve, ms));
const settle = () => { let resolve, reject; const promise = new Promise((a, b) => { resolve = a; reject = b; }); return { promise, resolve, reject }; };

test('SC-2 generator: breadcrumb-view / breadcrumb-file are 2.42304.0 cfac349aa / cd2efac6e, pinned (closure, features, import meaning)', async () => {
  const { extractCurrentCodeHelpers } = await import('../scripts/extract-code-ui-current.mjs');
  await extractCurrentCodeHelpers({ check: true, only: new Set(['breadcrumb-view.mjs', 'breadcrumb-file.mjs', 'file-tree-style.mjs']) });
  const manifest = JSON.parse(source('src/generated/code-current/manifest.json'));
  const entry = (target) => manifest.modules.find((module) => module.target === target);
  for (const [target, chunk, bindings] of [['breadcrumb-view.mjs', 'cfac349aa-BiPinwNg.js', ['Ht', 'Kt', 'Q', 'qt', 'Jt', 'Yt']], ['breadcrumb-file.mjs', 'cd2efac6e-C1jvGOgh.js', ['Yl']]]) {
    assert.equal(entry(target).referenceVersion, '2.42304.0', target);
    assert.equal(path.basename(entry(target).source), chunk, target);
    assert.deepEqual(entry(target).bindings, bindings, target);
    assert.equal(entry(target).sourceSha256, createHash('sha256').update(fs.readFileSync(path.join(OFFICIAL, chunk))).digest('hex'), target);
  }
  const view = source('src/generated/code-current/breadcrumb-view.mjs'), shell = source('src/generated/code-current/breadcrumb-file.mjs');
  assert.match(view, /className: "shrink-0 ps-0\.75 text-muted-as-secondary"/);
  assert.match(view, /o\(Q, \{ text: g, className: "ps-0\.75" \}\)/);
  assert.doesNotMatch(view, /pl-0\.75|"shrink-0 text-muted"/, 'no 2.37337.1 physical / muted classes');
  assert.match(view, /import \{ useFileGone as Ee \} from "\.\.\/files-changes\/file-gone-check\.mjs";/);
  assert.match(view, /import \{ BreadcrumbFolderSegment as Pt \} from "\.\.\/files-changes\/breadcrumb-folder\.mjs";/);
  assert.match(view, /import \{ BreadcrumbContextMenu as De \} from "\.\.\/\.\.\/source-breadcrumb-adapters\.jsx";/);
  assert.match(shell, /askIfGone: p,/);
  assert.match(shell, /import \{ BreadcrumbBody as Da \} from "\.\/breadcrumb-view\.mjs";/);
  // Feature strings in the shipped (minified) chunks.
  const cfac = official('cfac349aa-BiPinwNg.js'), cd2e = official('cd2efac6e-C1jvGOgh.js');
  for (const feature of ['className:`shrink-0 ps-0.75 text-muted-as-secondary`', 'askIfGone:m', '{gone:g,beforeOpen:_}=Ee(h,h)', 'beforeOpen:_,children:m?l?.({...m,gone:g}):null'])
    assert.ok(cfac.includes(feature) || cfac.includes(feature.replace(/`/g, '"')), feature);
  assert.ok(cd2e.includes('askIfGone:Tp') && cd2e.includes('askIfGone:p,byline'), 'cd2efac6e passes askIfGone');
  // The binding map's c230724a2 fa (old sl) is not the guard: it calls preventBaseUIHandler.
  assert.match(official('c230724a2-B7qAGVlb.js'), /preventBaseUIHandler/);
});

test('SC-2 pins: a changed feature, a missing provided binding or a re-pointed import fails the emit', async () => {
  const { filesPins, pinFilesHelper } = await import('../scripts/code-current-files-pins.mjs');
  const pin = filesPins['breadcrumb-view.mjs'];
  const original = structuredClone({ features: pin.features, provided: pin.provided, imports: pin.imports });
  const restore = () => Object.assign(pin, structuredClone(original));
  try {
    pin.features = { ...pin.features, Jt: [...pin.features.Jt, 'gone: g, beforeOpen: _, askIfGone'] };
    await assert.rejects(pinFilesHelper('breadcrumb-view.mjs', OFFICIAL), /Jt lacks/);
    restore();
    const { Pt, ...rest } = pin.provided; pin.provided = rest;
    await assert.rejects(pinFilesHelper('breadcrumb-view.mjs', OFFICIAL), /closure of/);
    restore();
    pin.imports = { ...pin.imports, Ee: ['c856385e2-DVsjb2QL.js:vt', '../files-changes/file-selection.mjs', 'useFileGone'] };
    await assert.rejects(pinFilesHelper('breadcrumb-view.mjs', OFFICIAL), /is not c856385e2-DVsjb2QL\.js's V/);
    restore();
    pin.imports = { ...pin.imports, u: ['vendor-frame-DfPJ1QmD.js:oo', 'react', 'useMemo'] };
    await assert.rejects(pinFilesHelper('breadcrumb-view.mjs', OFFICIAL), /is not react useMemo/);
  } finally { restore(); }
  const { bindings, imports, exports } = await pinFilesHelper('breadcrumb-view.mjs', OFFICIAL);
  assert.deepEqual(bindings, ['Ht', 'Kt', 'Q', 'qt', 'Jt', 'Yt']);
  assert.match(imports, /import \{breadcrumbSegments as Gt,segmentMenuTarget as Vt,folderLabel as Xt\} from '\.\/breadcrumb-paths\.mjs';/);
  assert.match(exports, /Kt as BreadcrumbBody/);
});

test('FT-16 generator: the folder popover, compact tree and their runtime are 2.42304.0 originals with resolved imports', () => {
  const manifest = JSON.parse(source('src/generated/files-changes/manifest.json'));
  const byTarget = Object.fromEntries(manifest.modules.map((module) => [module.target, module]));
  const expect = {
    'breadcrumb-folder.mjs': 'cfac349aa-BiPinwNg.js', 'file-tree-compact.mjs': 'ca7840910-DSVFtTw1.js', 'file-browser-query.mjs': 'vendor-query-Dqcf4jOo.js',
    'react-store.mjs': 'vendor-all-0-CTKbbUUg.js', 'file-type-icon.mjs': 'c280f9bbb-Dw5U-PIG.js', 'file-kind-icon-name.mjs': 'shared-9-D7uuiUv7.js',
    'retry-button.mjs': 'c30c42d34-DW_r0HJ_.js', 'file-entry-order.mjs': 'shared-18-D4XxL6Tg.js', 'file-relative-path.mjs': 'shared-28-DcgD7xXH.js',
    'diff-widget-background.mjs': 'c6e73333a-HHjd1vH0.js', 'arrow-key-direction.mjs': 'c7037f09e-DXK8RSre.js', 'loading-flag.mjs': 'shared-104-Cqo2-vQh.js',
  };
  for (const [target, chunk] of Object.entries(expect)) assert.equal(byTarget[target]?.source, chunk, target);
  const imports = (target) => Object.fromEntries(byTarget[target].imports.map((entry) => [entry.local, `${entry.kind}:${entry.from.replace('../../source-files-changes-adapters.jsx', 'host')}:${entry.name}`]));
  const folder = imports('breadcrumb-folder.mjs');
  assert.equal(folder.jt, 'code-current:../code-current/breadcrumb-paths.mjs:segmentClass', 'the segment class is not duplicated');
  assert.equal(folder.Mt, 'code-current:../code-current/breadcrumb-paths.mjs:segmentKeys');
  assert.equal(folder.Ne, 'code-current:../code-current/path-tooltip.mjs:pathTooltipContent');
  assert.equal(folder.M, 'generated:./file-browser-query.mjs:useQueryClient');
  assert.equal(folder.N, 'generated:./file-browser-query.mjs:useQuery');
  assert.equal(folder.we, 'generated:./file-tree-compact.mjs:FolderTree');
  assert.equal(folder.Ve, 'generated:./retry-button.mjs:RetryButton');
  assert.equal(folder.le, 'generated:./react-store.mjs:create');
  for (const [local, name] of [['O', 'FilesPopover'], ['D', 'FilesTooltip'], ['te', 'FilesSkeletonGroup'], ['E', 'FilesSkeleton'], ['ce', 'useIntl'], ['j', 'FormattedMessage']])
    assert.equal(folder[local], `adapter:host:${name}`, local);
  const tree = imports('file-tree-compact.mjs');
  assert.equal(tree.E, 'code-current:../code-current/file-tree-style.mjs:fileTreeIconSize');
  assert.equal(tree.L, 'code-current:../code-current/file-tree-style.mjs:treeIndent');
  assert.equal(tree.P, 'generated:./file-tree-row-classes.mjs:fileTreeCompactRow');
  assert.equal(tree.f, 'code-current:../code-current/surface-chord-platform.mjs:isMacUserAgent');
  assert.equal(tree.h, 'adapter:host:CdsIcon');
  assert.equal(tree.ee, 'generated:./file-type-icon.mjs:FileTypeIcon');
  assert.equal(imports('file-entry-order.mjs').Ct, 'code-current:../code-current/lazy-init.mjs:lazyInit');
  assert.equal(imports('react-store.mjs').c, 'react:react:default');
  assert.deepEqual(Object.values(imports('file-browser-query.mjs')).every((value) => value.startsWith('react:')), true, 'TanStack Query needs only React');
  const cfac = official('cfac349aa-BiPinwNg.js');
  for (const feature of ['kt=150', 'At=`opacity-0 pointer-events-none`', 'Tt=200', 'Et=6', 'Files in {folder}', 'Listing this folder', 'Empty folder', 'variant:`compact`', `epitaxy-file-browser-tree`])
    assert.ok(cfac.includes(feature) || cfac.includes(feature.replace(/`/g, '"')), feature);
});

test('FT-06 SSR: the 2.42304.0 body classes, folder segments as popover triggers, and segment menus asked with `gone`', async () => {
  const { SourceFileBreadcrumb } = await ssr('/src/source-file-breadcrumb.jsx');
  const targets = [];
  const lister = { root: '/repo', list: async () => [], onOpenFile() {} };
  const segmentMenu = { entries: (target) => (targets.push(target), [{ kind: 'item', action: 'copy', label: 'Copy', value: target.path }]), select() {} };
  const html = renderToStaticMarkup(React.createElement(SourceFileBreadcrumb, { displayPath: '/repo/src/a.js', fullPath: '/repo/src/a.js', lister, segmentMenu }));
  assert.match(html, /<span class="shrink-0 ps-0\.75 text-muted-as-secondary">\/<\/span>/, 'Kt lead');
  assert.match(html, /<span data-text="\/" class="shrink-0 before:content-\[attr\(data-text\)\] ps-0\.75"><\/span>/, 'sizer lead');
  assert.doesNotMatch(html, /pl-0\.75|class="shrink-0 text-muted"/);
  const segment = /<button type="button" data-breadcrumb-segment="true" class="rounded-\[3px\] px-0\.75 bg-transparent border-0 text-start cursor-default focus-visible:outline-hidden hide-focus-ring focus-visible:shadow-focus hover:bg-fill-ghost-hover aria-expanded:bg-fill-ghost-hover shrink-0 text-muted-as-secondary" aria-description="\/repo\/src" aria-haspopup="dialog" aria-expanded="false">src<\/button>/;
  assert.match(html, segment, 'Pt: jt + Jt className, the Popover trigger state');
  assert.match(html, /<span aria-hidden="true" class="shrink-0 text-muted-as-secondary">\/<\/span>/, 'separators');
  // Jt renders its menu content eagerly: every in-root segment's target carries gone (false: no desktop answered).
  assert.deepEqual(targets.map(({ path: p, directory, gone, outside }) => [p, directory, gone, outside]),
    [['/repo', true, false, false], ['/repo/src', true, false, false], ['/repo/src/a.js', false, false, false]]);
  // No lister: the copy-path button (Yl) with no folder segments.
  const plain = renderToStaticMarkup(React.createElement(SourceFileBreadcrumb, { displayPath: 'src/a.js', fullPath: '/repo/src/a.js', onCopyPath() {} }));
  assert.match(plain, /aria-label="Copy path \/repo\/src\/a\.js"/);
  assert.doesNotMatch(plain, /data-breadcrumb-segment/);
  // Host wiring: the lister handed over is cd2efac6e wt's local shape; askIfGone is cd2efac6e Tp's rule.
  const wiring = source('src/source-file-breadcrumb.jsx');
  assert.match(wiring, /<QueryClientProvider client=\{fileBrowserQueryClient\}>/);
  assert.match(wiring, /const sessionId = use\(CurrentSessionIdContext\);/);
  assert.match(wiring, /askIfGone = lister \? \(\{ absPath, isDirectory \}\) => !isDirectory \|\| pathWithinRoot\(absPath, lister\.root, posix\) : undefined/);
  assert.match(wiring, /gone: gone === true,/);
  assert.match(source('src/source-file-viewer.jsx'), /unavailable: target\.outside \? "outside_root" : target\.directory \? undefined : file\.unavailable, gone: target\.gone === true \}/);
  const { folderLister } = await ssr('/src/source-breadcrumb-adapters.jsx');
  const listed = folderLister({ root: '/repo', list: async (dir) => [{ name: 'a', path: `${dir}/a`, directory: true }, { name: 'l', path: `${dir}/l`, directory: false, symlink: true, link: { target: 'x', state: 'dangling' } }] }, 's1');
  assert.deepEqual({ ...listed, listDirectory: undefined }, { sessionId: 's1', scope: 'local', root: '/repo', listDirectory: undefined });
  assert.deepEqual(await listed.listDirectory('/repo/src'), [{ name: 'a', path: '/repo/src/a', isDirectory: true }, { name: 'l', path: '/repo/src/l', isDirectory: false, link: { target: 'x', state: 'dangling' } }]);
  assert.equal(folderLister(null, 's1'), null);
});

test('FT-06 Jt: a segment menu asks the gone hook only when askIfGone says so, and hands its answer to renderMenu', async () => {
  const { BreadcrumbSegment } = await ssr('/src/generated/code-current/breadcrumb-view.mjs');
  const { CurrentSessionIdContext } = await ssr('/src/generated/files-changes/session-context.mjs');
  const { BreadcrumbContextMenu } = await ssr('/src/source-breadcrumb-adapters.jsx');
  const previousWindow = globalThis.window;
  const calls = [];
  globalThis.window = { navigator: { userAgent: 'Mozilla/5.0 (Macintosh) Electron' }, desktop: { call: (action, params) => { calls.push([action, params]); return true; } } };
  try {
    const menus = [];
    const props = (extra) => ({ segment: { label: 'a.js', absPath: '/repo/src/a.js', listsDir: '/repo/src' }, isName: true, current: '/repo/src/a.js',
      title: '/repo/src/a.js', lister: null, renderMenu: (target) => (menus.push(target), 'menu'), className: 'shrink-0', ...extra });
    const segment = harness(BreadcrumbSegment, { contexts: new Map([[CurrentSessionIdContext, 's1']]) });
    let element = segment(props({ askIfGone: (target) => (menus.push(['asked', target.absPath]), true) }));
    assert.equal(element.type, BreadcrumbContextMenu);
    assert.equal(element.props.disabled, false);
    assert.equal(element.props.children, 'menu');
    assert.deepEqual(menus.at(-1), { absPath: '/repo/src/a.js', isDirectory: false, heading: undefined, gone: false });
    const pending = element.props.beforeOpen();
    assert.ok(pending instanceof Promise, 'the menu waits for the check');
    await pending;
    element = segment(props({ askIfGone: () => true }));
    assert.equal(menus.at(-1).gone, true, 'the answer reaches the menu content');
    assert.deepEqual(calls, [['file:gone', { sessionId: 's1', path: '/repo/src/a.js' }]]);
    // askIfGone false (a folder outside the root): no question, the menu opens at once.
    const outside = harness(BreadcrumbSegment, { contexts: new Map([[CurrentSessionIdContext, 's1']]) });
    element = outside(props({ askIfGone: () => false }));
    assert.equal(element.props.beforeOpen(), undefined);
    assert.equal(menus.at(-1).gone, false);
    // No renderMenu: disabled, no content; no askIfGone at all: never asked.
    element = harness(BreadcrumbSegment)(props({ renderMenu: undefined, askIfGone: () => true }));
    assert.equal(element.props.disabled, true);
    assert.equal(element.props.children, null);
    element = harness(BreadcrumbSegment, { contexts: new Map([[CurrentSessionIdContext, 's1']]) })(props({}));
    assert.equal(element.props.beforeOpen(), undefined);
    assert.equal(calls.length, 1);
  } finally { globalThis.window = previousWindow; }
});

test('FT-06 De (host BreadcrumbContextMenu): a pending beforeOpen opens the menu when it settles; a press first cancels', async () => {
  const { BreadcrumbContextMenu } = await ssr('/src/source-breadcrumb-adapters.jsx');
  const { menuPending } = await ssr('/src/generated/files-changes/menu-pending.mjs');
  const view = new EventTarget();
  view.document = {};
  const anchor = { nodeType: 1, getBoundingClientRect: () => ({ left: 10, bottom: 20 }), ownerDocument: { defaultView: view, activeElement: null } };
  const event = (x = 5, y = 6) => ({ clientX: x, clientY: y, currentTarget: anchor, preventDefault() { this.prevented = true; }, stopPropagation() {} });
  const opened = [];
  for (const [label, check] of [['pending', settle()], ['press first', settle()], ['none', null]]) {
    const menu = harness(BreadcrumbContextMenu);
    const props = { trigger: React.createElement('span'), disabled: false, onOpenChange: (open) => opened.push([label, open]), beforeOpen: check ? () => check.promise : () => undefined, children: 'items' };
    let element = menu(props);
    const contextMenu = element.props.children[0].props.onContextMenu, at = event();
    contextMenu(at);
    assert.equal(at.prevented, true, label);
    if (check) {
      assert.equal(menuPending(view.document), true, `${label}: the document knows a menu is waiting`);
      assert.equal(menu(props).props.children[1], null, `${label}: not open while the check runs`);
      if (label === 'press first') view.dispatchEvent(new Event('pointerdown'));
      check.resolve(false);
      await tick();
    }
    element = menu(props);
    const popup = element.props.children[1];
    if (label === 'press first') { assert.equal(popup, null); continue; }
    assert.deepEqual(popup.props.point, { x: 5, y: 6 }, label);
    assert.equal(popup.props.anchor, anchor);
    assert.equal(popup.props.contextMenuGuard, 'always');
    assert.equal(popup.props.dataCds, 'ContextMenu');
    assert.equal(popup.props.children, 'items');
  }
  assert.deepEqual(opened, [['pending', true], ['none', true]]);
  // disabled: the trigger's right click does nothing.
  const disabled = harness(BreadcrumbContextMenu)({ trigger: React.createElement('span'), disabled: true, onOpenChange: () => opened.push('x'), children: null });
  const at = event();
  disabled.props.children[0].props.onContextMenu(at);
  assert.equal(at.prevented, undefined);
});

test('FT-16 Pt trigger (host Popover over SourcePopover): merges the tooltip and segment props, toggles the controlled open state', async () => {
  const { FolderPopover } = await ssr('/src/source-breadcrumb-adapters.jsx');
  const changes = [], anchors = [], seen = [];
  const popover = { open: false, id: 'p1', setAnchor: (node) => anchors.push(node), change: (open, event) => changes.push([open, event.type]) };
  const own = { current: null };
  const render = React.createElement('button', { type: 'button', 'data-breadcrumb-segment': true, ref: own, onPointerEnter: () => seen.push('warm'), onFocus: () => seen.push('warm-focus'), className: 'seg' }, 'src');
  const trigger = harness(FolderPopover.Trigger, { context: popover });
  const tooltipRef = { current: null };
  const element = trigger({ render, ref: tooltipRef, 'aria-label': 'src', 'aria-description': '/repo/src', onPointerEnter: () => seen.push('tooltip'), 'aria-describedby': 'tip' });
  assert.equal(element.type, 'button');
  assert.equal(element.props['aria-haspopup'], 'dialog');
  assert.equal(element.props['aria-expanded'], false);
  assert.equal(element.props['aria-controls'], undefined);
  assert.equal(element.props['aria-description'], '/repo/src');
  assert.equal(element.props['aria-describedby'], 'tip');
  assert.equal(element.props.className, 'seg');
  element.props.onPointerEnter({ type: 'pointerenter' });
  assert.deepEqual(seen.sort(), ['tooltip', 'warm'], 'Base UI mergeProps runs both handlers');
  element.props.onClick({ type: 'click' });
  assert.deepEqual(changes, [[true, 'click']]);
  const node = { tagName: 'BUTTON' };
  element.props.ref(node);
  assert.equal(own.current, node); assert.equal(tooltipRef.current, node); assert.deepEqual(anchors, [node]);
  const open = harness(FolderPopover.Trigger, { context: { ...popover, open: true } })({ render });
  assert.equal(open.props['aria-expanded'], true);
  assert.equal(open.props['aria-controls'], 'p1');
  // The popup's ref / initialFocus / onFocus reach the SourcePopover element (no extra DOM node).
  const adapters = source('src/source-breadcrumb-adapters.jsx');
  assert.match(adapters, /node\.addEventListener\('focusin', focus\);/);
  assert.match(adapters, /className=\{`\$\{className\} sfv-folder-popover`\.trim\(\)\} style=\{style\} initialFocus=\{initialFocus\}/);
});

test('FT-16 Nt: open fetches the folder, the popup is held (transparent) for at most 150 ms, warm prefetches, ssh/cloud do not warm', async () => {
  const { useFolderPopover, folderListQueryKey, folderHoldMs } = await ssr('/src/generated/files-changes/breadcrumb-folder.mjs');
  const { QueryClient } = await ssr('/src/generated/files-changes/file-browser-query.mjs');
  assert.equal(folderHoldMs, 150);
  const client = new QueryClient();
  const asks = [];
  let answer = settle();
  const lister = { sessionId: 's1', scope: 'local', root: '/repo', listDirectory: (dir) => (asks.push(dir), answer.promise) };
  const popover = harness(useFolderPopover, { context: client });
  let state = popover(lister, '/repo/src');
  assert.equal(state.open, false); assert.equal(state.held, false);
  state.onOpenChange(true);
  state = popover(lister, '/repo/src');
  assert.equal(state.open, true); assert.equal(state.held, true, 'held while the listing loads');
  assert.deepEqual(asks, ['/repo/src']);
  answer.resolve([{ name: 'b.ts', path: '/repo/src/b.ts', isDirectory: false }, { name: 'a', path: '/repo/src/a', isDirectory: true }]);
  await tick();
  state = popover(lister, '/repo/src');
  assert.equal(state.held, false, 'released when it lands');
  assert.deepEqual(client.getQueryData([...folderListQueryKey('s1', 'local'), '/repo', '/repo/src']).map((entry) => [entry.name, entry.relativePath, entry.isDirectory]),
    [['a', 'src/a', true], ['b.ts', 'src/b.ts', false]], 'J: folders first, relative to the root');
  state.close();
  state = popover(lister, '/repo/src');
  assert.equal(state.open, false);
  state.onOpenChange(true);
  state = popover(lister, '/repo/src');
  assert.equal(state.held, false, 'cached: no hold');
  // A slow listing: the hold ends after 150 ms even though it has not landed.
  answer = settle();
  const slow = harness(useFolderPopover, { context: client });
  let other = slow(lister, '/repo/lib');
  other.onOpenChange(true);
  assert.equal(slow(lister, '/repo/lib').held, true);
  await tick(170);
  assert.equal(slow(lister, '/repo/lib').held, false, 'kt = 150 ms');
  answer.reject(new Error('EACCES'));
  await tick();
  // warm: prefetch (local), none after an error; ssh / cloud have no warm.
  answer = settle();
  other = slow(lister, '/repo/doc');
  other.warm();
  assert.equal(asks.at(-1), '/repo/doc');
  answer.resolve([]);
  await tick();
  const failedBefore = asks.length;
  slow(lister, '/repo/lib').warm();
  assert.equal(asks.length, failedBefore, 'an errored folder is not prefetched again');
  assert.equal(harness(useFolderPopover, { context: client })({ ...lister, scope: 'ssh' }, '/repo').warm, undefined);
  assert.equal(harness(useFolderPopover, { context: client })({ ...lister, scope: 'cloud' }, '/repo').warm, undefined);
});

test('FT-16 Lt SSR: skeleton while pending, "Couldn’t list this folder" + Try again on error, "Empty folder", else the compact tree', async () => {
  const { BreadcrumbFolderList, folderListQuery, folderEntryLimit, folderSkeletonRows } = await ssr('/src/generated/files-changes/breadcrumb-folder.mjs');
  const { QueryClient, QueryClientProvider } = await ssr('/src/generated/files-changes/file-browser-query.mjs');
  assert.equal(folderEntryLimit, 200); assert.equal(folderSkeletonRows, 6);
  const render = (client, lister, dir, current) => renderToStaticMarkup(React.createElement(QueryClientProvider, { client },
    React.createElement(BreadcrumbFolderList, { dir, current, lister, onOpenFile() {} })));
  const lister = (list) => ({ sessionId: 's1', scope: 'local', root: '/repo', listDirectory: list });
  // Pending.
  const pending = render(new QueryClient(), lister(() => new Promise(() => {})), '/repo/src');
  assert.match(pending, /^<div data-cds="SkeletonGroup" data-motion="wave" data-hold="delayed" role="status" class="px-xs py-xs"><span class="sr-only" data-skeleton-label=""><\/span><div aria-hidden="true" class="contents">/);
  assert.equal(pending.match(/class="flex h-control items-center gap-xs compact:px-2 comfortable:px-2\.5"/g).length, 6, 'od: Et rows');
  assert.match(pending, /<div data-cds="Skeleton" class="h-\[1em\] max-w-full rounded bg-\[var\(--cds-skeleton-base\)\]" style="width:20px;height:20px;--cds-skel-i:0"><\/div>/);
  assert.match(pending, /style="width:160px;height:16px;--cds-skel-i:1"/);
  // Error (a local listing is not retried, J's lt).
  const failed = new QueryClient();
  const failing = lister(async () => { throw new Error('EACCES'); });
  await failed.fetchQuery(folderListQuery(failing, '/repo/src')).catch(() => {});
  const error = render(failed, failing, '/repo/src');
  assert.match(error, /^<div class="flex flex-wrap items-center justify-between pe-xs"><p class="flex items-center h-control px-md text-footnote text-muted-as-secondary">Couldn’t list this folder<\/p>/);
  assert.match(error, /data-cds="Button"[^>]*>[\s\S]*Try again/);
  assert.match(error, /<span role="status" class="sr-only"><\/span>/);
  // Empty.
  const empty = new QueryClient(), none = lister(async () => []);
  await empty.fetchQuery(folderListQuery(none, '/repo/src'));
  assert.equal(render(empty, none, '/repo/src'), '<p class="flex items-center h-control px-md text-footnote text-muted-as-secondary">Empty folder</p>');
  // Entries: a broken link is left out (tt), folders first, the current file marked; 205 entries show 200 + a note.
  const full = new QueryClient();
  const many = lister(async () => [
    { name: 'b.ts', path: '/repo/src/b.ts', isDirectory: false }, { name: 'a.md', path: '/repo/src/a.md', isDirectory: false },
    { name: 'lib', path: '/repo/src/lib', isDirectory: true }, { name: 'gone', path: '/repo/src/gone', isDirectory: false, link: { target: 'x', state: 'dangling' } },
    ...Array.from({ length: 202 }, (_, i) => ({ name: `z${String(i).padStart(3, '0')}.txt`, path: `/repo/src/z${i}.txt`, isDirectory: false }))]);
  await full.fetchQuery(folderListQuery(many, '/repo/src'));
  const tree = render(full, many, '/repo/src', '/repo/src/a.md');
  assert.match(tree, /^<div data-folder-tree="true" class="flex flex-col">/);
  const row = 'flex items-center gap-1 h-control app-list-row pe-md rounded text-body text-start w-full select-none focus-visible:outline-hidden hide-focus-ring focus-visible:shadow-focus';
  const escape = (text) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  assert.match(tree, new RegExp(`<button type="button" data-folder-tree-row="0" class="${escape(row)} bg-alpha-0 text-primary hover:bg-fill-ghost-hover data-\\[pressed\\]:bg-fill-ghost-hover" style="padding-inline-start:8px" aria-label="Expand folder lib" aria-expanded="false">`));
  assert.match(tree, new RegExp(`<button type="button" data-folder-tree-row="0" class="${escape(row)} bg-fill-control hover:bg-fill-control text-primary" style="padding-inline-start:8px" aria-current="true">`), 'the current file');
  assert.match(tree, /class="transition-transform duration-fast motion-reduce:transition-none"/, 'the caret');
  assert.match(tree, /<span class="text-muted-control shrink-0">/, 'a file icon slot');
  assert.doesNotMatch(tree, />gone</);
  assert.equal(tree.match(/data-folder-tree-row="0"/g).length, 200, 'Tt = 200 entries');
  assert.ok(tree.indexOf('Expand folder lib') < tree.indexOf('>a.md<'), 'folders first');
  assert.match(tree, /<div class="flex items-center h-control app-list-row text-footnote text-muted-as-secondary" style="padding-inline-start:8px">5 more items not shown<\/div>/);
});

test('FT-16 ie / cg: CDS icon names and plural copy (en / zh-CN) of the compact tree', async () => {
  const { fileKindIconName } = await ssr('/src/generated/files-changes/file-kind-icon-name.mjs');
  const { fileKindIcon } = await ssr('/src/file-kind-icon.mjs');
  const names = ['a.md', 'b.ts', 'c.csv', 'd.zip', 'SKILL.md', 'e.png', 'f.ico', 'g.pptx', 'h.json', 'i.html', 'Makefile', 'j.parquet', 'k.vue', 'l.pdf', 'm.mp4', 'n.svg', 'o.py', 'p'];
  const officialNames = names.map(fileKindIconName);
  assert.deepEqual(officialNames.slice(0, 5), ['Note', 'Code', 'Spreadsheet', 'Archive', 'Scroll']);
  // The 2.2553.1 local copy agrees on every name (it stays for the other surfaces that use it).
  assert.deepEqual(names.map(fileKindIcon), officialNames);
  const { FolderTree } = await ssr('/src/generated/files-changes/file-tree-compact.mjs');
  const i18n = await ssr('/electron/i18n/index.mjs');
  const entries = Array.from({ length: 3 }, (_, i) => ({ name: `f${i}`, path: `/r/f${i}`, isDirectory: false }));
  const tree = (props) => renderToStaticMarkup(React.createElement(FolderTree, { variant: 'compact', entries, maxEntries: 2, onFileClick() {}, ...props }));
  assert.match(tree(), />1 more item not shown</);
  const previous = i18n.getLocale();
  try {
    i18n.setLocale('zh-CN');
    assert.match(tree(), />另有 1 项未显示</);
    assert.match(renderToStaticMarkup(React.createElement(FolderTree, { variant: 'compact', entries: [{ name: 'lib', path: '/r/lib', isDirectory: true }] })), /aria-label="展开文件夹 lib"/);
  } finally { i18n.setLocale(previous); }
});

test('FT-16 styles: the official classes are in the loaded CSS, the hand-written folder list rules are gone, max-height is released', () => {
  const loaded = fs.readdirSync(path.join(ROOT, 'public/assets/v1')).filter((name) => name.endsWith('.css')).map((name) => source(`public/assets/v1/${name}`)).join('\n');
  const escapeClass = (name) => `.${name.replace(/[^a-zA-Z0-9_-]/g, (ch) => `\\${ch}`)}`;
  for (const name of ['w-72', 'max-h-[min(24rem,var(--available-height))]', 'epitaxy-root', 'break-words', 'opacity-0', 'pointer-events-none', 'ps-0.75', 'text-muted-as-secondary',
    'h-control', 'pe-md', 'bg-alpha-0', 'data-[pressed]:bg-fill-ghost-hover', 'bg-fill-control', 'text-muted-control', 'rotate-90', 'duration-fast', 'motion-reduce:transition-none',
    'pe-xs', 'compact:px-2', 'comfortable:px-2.5', 'bg-[var(--cds-skeleton-base)]', 'h-[1em]', 'px-md', 'text-footnote'])
    assert.ok(loaded.includes(escapeClass(name)), name);
  const viewerCss = source('src/source-file-viewer.css');
  assert.doesNotMatch(viewerCss, /\.sfv-folder-(?:list|row|caret|icon|name|note|skeleton)\b/);
  assert.match(viewerCss, /\.sp-popup\.sfv-folder-popover \{ max-height: revert-layer; \}/);
  // R3-files: the in-app Reduce motion is covered by the official variant itself (no host rule).
  assert.doesNotMatch(viewerCss.replace(/\/\*[\s\S]*?\*\//g, ''), /data-reduce-motion/);
  assert.ok(loaded.includes('.motion-reduce\\:transition-none:where([data-reduce-motion=true],[data-reduce-motion=true] *){transition-property:none}'));
  // No other local rule styles the popover's rows or the tree.
  for (const file of fs.readdirSync(path.join(ROOT, 'src')).filter((name) => name.endsWith('.css')))
    assert.doesNotMatch(source(`src/${file}`), /data-folder-tree-row|\[data-folder-tree\]\s*(?:button|>)/, file);
  const adapters = source('src/source-breadcrumb-adapters.jsx');
  assert.doesNotMatch(adapters, /SourceFolderList|SourceFolderRow|useFolderEntries|sfv-folder-(?:row|list|note|skeleton)/, 'the host list is replaced by Lt / ie');
});

test('FT-16 Pt: a row opened with the mouse opens a preview tab, with the keyboard a kept tab; either closes the popover', async () => {
  const { BreadcrumbFolderSegment, BreadcrumbFolderList } = await ssr('/src/generated/files-changes/breadcrumb-folder.mjs');
  const { FolderPopover } = await ssr('/src/source-breadcrumb-adapters.jsx');
  const { QueryClient } = await ssr('/src/generated/files-changes/file-browser-query.mjs');
  const client = new QueryClient();
  const opened = [];
  const lister = { sessionId: 's1', scope: 'local', root: '/repo', listDirectory: async () => [] };
  const segment = harness(BreadcrumbFolderSegment, { context: client });
  const props = { label: 'src', dir: '/repo/src', dirLabel: 'src', current: '/repo/src/a.md', title: '/repo/src', lister, onOpenFile: (file, options) => opened.push([file, options]), className: 'shrink-0' };
  let root = segment(props);
  assert.equal(root.type, FolderPopover.Root);
  assert.equal(root.props.open, false);
  root.props.onOpenChange(true);
  root = segment(props);
  assert.equal(root.props.open, true);
  const [tooltip, popup] = root.props.children;
  assert.equal(tooltip.props.open, false, 'no segment tooltip over the open popover');
  assert.equal(popup.type, FolderPopover.Popup);
  assert.equal(popup.props['aria-label'], 'Files in src');
  assert.equal(popup.props.padding, 'sm');
  assert.deepEqual(popup.props.style, { backgroundColor: 'var(--diff-widget-bg, var(--cds-surface-3))' });
  assert.deepEqual(popup.props.collisionPadding, { top: 48, right: 8, bottom: 8, left: 8 });
  assert.equal(popup.props.initialFocus, popup.props.ref, 'the popup itself takes focus first');
  const list = popup.props.children;
  assert.equal(list.type, BreadcrumbFolderList);
  list.props.onOpenFile('/repo/src/a.md', { detail: 1 });
  assert.deepEqual(opened.at(-1), ['/repo/src/a.md', { keep: false }], 'a click: preview');
  assert.equal(segment(props).props.open, false, 'opening closes the popover');
  list.props.onOpenFile('/repo/src/b.ts', { detail: 0 });
  assert.deepEqual(opened.at(-1), ['/repo/src/b.ts', { keep: true }], 'Enter / Space: kept');
  // T (the popup's onFocus): focus on the popup itself goes to the current row, else the first.
  const rows = [{ focus() { opened.push('current'); } }];
  const popupNode = { querySelector: (selector) => (selector.endsWith('[aria-current="true"]') ? rows[0] : null) };
  popup.props.onFocus({ target: popupNode, currentTarget: popupNode });
  popup.props.onFocus({ target: {}, currentTarget: popupNode });
  assert.equal(opened.filter((entry) => entry === 'current').length, 1);
});
