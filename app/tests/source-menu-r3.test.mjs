// R3-menu (D25): the shared SourceMenu primitives against 2.42304.0 shared-frame-BfjMqbuN.js —
//  1. XS (Menu.Item) disabledReason as any ReactNode (`I = E.disabled === !0 && Wc(p)`, Wc = `!!e`; `ie` wraps whenever
//     `p !== void 0`; Yc keyed by qc), reached from the chunks' <FormattedMessage> reasons (code-current SidebarMenuItem);
//  2. KS → Hx header / footer / maxVisibleItems (the SearchablePopup yC search field stays above the scrolling list);
//  3. the Popup's onContextMenu as an opt-in prop (contextMenuGuard: ca5db7aaf F / c82eca2bd Be), set only at the local
//     menus whose 2.42304.0 Popup passes a handler.
import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createServer } from 'vite';
import react from '@vitejs/plugin-react';
import { withMemoCache } from './support/react-memo-cache.mjs';

const ROOT = path.resolve(import.meta.dirname, '..');
const OFFICIAL = path.join(ROOT, '../reference/installed-2.42304.0-20261017/ion-dist/assets/v1');
const official = (name) => fs.readFileSync(path.join(OFFICIAL, name), 'utf8');
const source = (name) => fs.readFileSync(path.join(ROOT, 'src', name), 'utf8');
let server, SourceMenu, menu;
before(async () => {
  server = await createServer({ configFile: false, root: ROOT, plugins: [react()], server: { middlewareMode: true, hmr: false, ws: false, watch: null }, appType: 'custom', logLevel: 'error' });
  menu = await server.ssrLoadModule('/src/source-menu.jsx');
  SourceMenu = menu.SourceMenu;
});
after(async () => { await server?.close(); });

// A hook dispatcher for one component call: the element tree it returns, without React DOM (the Popup portals to
// document.body, which SSR cannot render).
function renderOnce(component, props) {
  const hooks = {
    useContext: (context) => context._currentValue, useId: () => ':menu:', useState: (initial) => [typeof initial === 'function' ? initial() : initial, () => {}],
    useRef: (initial) => ({ current: initial }), useMemo: (fn) => fn(), useCallback: (fn) => fn, useEffect() {}, useLayoutEffect() {},
    useSyncExternalStore: (subscribe, getSnapshot, getServerSnapshot) => (getServerSnapshot ?? getSnapshot)(),
  };
  const internal = React.__CLIENT_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE, old = internal.H;
  internal.H = withMemoCache(hooks);
  try { return component(props); } finally { internal.H = old; }
}
function find(tree, predicate) {
  if (!tree || typeof tree !== 'object') return null;
  if (Array.isArray(tree)) { for (const node of tree) { const hit = find(node, predicate); if (hit) return hit; } return null; }
  if (tree.props && predicate(tree)) return tree;
  return find(tree.props?.children ?? tree.children, predicate);
}
function withDocument(run) {
  const had = 'document' in globalThis;
  if (!had) globalThis.document = { body: { nodeType: 1 }, documentElement: null };
  try { return run(); } finally { if (!had) delete globalThis.document; }
}
const popupNode = (props) => withDocument(() => {
  const element = renderOnce(SourceMenu.Popup, { label: 'Menu', onClose() {}, children: React.createElement('div', { 'data-rows': '' }), ...props });
  return find(renderOnce(element.type, element.props), (node) => node.props.role === 'menu');
});
const classOf = (node) => node?.props?.className;

test('official 2.42304.0 shapes the three primitives follow', () => {
  const frame = official('shared-frame-BfjMqbuN.js');
  // XS: the reason test, the wrapper condition and the Yc span.
  assert.match(frame, /function Wc\(e\)\{return!!e\}/);
  assert.match(frame, /I=E\.disabled===!0&&Wc\(p\)/);
  assert.match(frame, /ie=e=>p===void 0\?e:H\(Gv,\{content:I\?p:void 0,multiline:!0,closeOnClick:!1,children:T\("div",\{role:"none",children:\[e,H\(Yc,\{id:N,reason:I\?p:void 0\}\)\]\}\)\}\)/);
  assert.match(frame, /function Gv\(e\)\{let t=ge\(\)==="rtl"\?"left":"right";return H\(Zp,\{\.\.\.e,side:t\}\)\}/);
  assert.match(frame, /function Zp\(\{[^}]*hoverable:g=!0,closeOnClick:_[^}]*\}\)/);
  // KS passes header/footer/maxVisibleItems to Hx; Hx's classes; yC hands its search field to the header.
  assert.match(frame, /H\(Hx,\{header:p,footer:m,maxVisibleItems:h,children:f\}\)/);
  assert.match(frame, /zx="shrink-0 px-\[var\(--cds-menu-gutter,0\.25rem\)\] pt-\[var\(--cds-menu-gutter,0\.25rem\)\]"/);
  assert.match(frame, /Bx="-mt-\[var\(--cds-menu-gutter,0\.25rem\)\] shrink-0 px-\[var\(--cds-menu-gutter,0\.25rem\)\] pb-\[var\(--cds-menu-gutter,0\.25rem\)\]"/);
  assert.match(frame, /className:`\$\{Rx\}\$\{e\?" pt-0":""\}`/);
  assert.match(frame, /Vx="max\(var\(--cds-h-control\), var\(--cds-leading-body\)\)"/);
  assert.match(frame, /function yC\(\{[\s\S]{0,4000}?header:T\(l,\{children:\[o!==void 0&&H\("div"/);
  // ca5db7aaf F and c82eca2bd Be.
  assert.match(official('ca5db7aaf-DNznjmvJ.js'), /function F\(e\)\{u\(e\.target\)\|\|e\.preventDefault\(\)\}/);
  assert.match(official('c82eca2bd-1Y6mm3wZ.js'), /function Be\(e\)\{e\.preventDefault\(\)\}/);
});

test('XS disabledReason: a disabled item shows a ReactNode reason in Yc and joins it into aria-describedby', async () => {
  const reason = React.createElement('span', { 'data-message': '' }, 'Needs ', React.createElement('b', null, 'two'), ' rows');
  const html = renderToStaticMarkup(React.createElement(SourceMenu.Item, { disabled: true, disabledReason: reason }, 'Select all'));
  const span = html.match(/<span id="([^"]+)" hidden="" data-cds-disabled-reason=""><span data-message="">Needs <b>two<\/b> rows<\/span><\/span>/);
  assert.ok(span, html);
  assert.match(html, /^<div role="none" class="smenu-reason"><div role="menuitem"/);
  assert.match(html, new RegExp(`aria-describedby="${span[1]}"`));
  assert.match(html, /aria-disabled="true"/);
  // A string reason renders the same way (no trim rule: Wc is `!!e`).
  const text = renderToStaticMarkup(React.createElement(SourceMenu.Item, { disabled: true, disabledReason: 'Switch to this terminal first' }, 'Clear terminal'));
  assert.match(text, /data-cds-disabled-reason="">Switch to this terminal first<\/span><\/div>$/);
});

test('XS disabledReason: the wrapper exists whenever a reason prop is given; enabled or empty reasons leave Yc empty', () => {
  const enabled = renderToStaticMarkup(React.createElement(SourceMenu.Item, { disabled: false, disabledReason: 'Unused' }, 'Rename'));
  assert.match(enabled, /^<div role="none" class="smenu-reason"><div role="menuitem"/);
  assert.match(enabled, /<span id="[^"]+" hidden="" data-cds-disabled-reason=""><\/span><\/div>$/);
  assert.doesNotMatch(enabled, /aria-describedby/);
  assert.doesNotMatch(enabled, /Unused/);
  const empty = renderToStaticMarkup(React.createElement(SourceMenu.Item, { disabled: true, disabledReason: '' }, 'Rename'));
  assert.match(empty, /data-cds-disabled-reason=""><\/span><\/div>$/);
  assert.doesNotMatch(empty, /aria-describedby/);
  const none = renderToStaticMarkup(React.createElement(SourceMenu.Item, { disabled: true }, 'Rename'));
  assert.match(none, /^<div role="menuitem"/);
  assert.doesNotMatch(none, /smenu-reason|data-cds-disabled-reason/);
  // The span key follows qc (tooltipContentKey), so a changed reason remounts only the span; the tooltip gets the
  // reason only while it shows.
  const element = withDocument(() => renderOnce(SourceMenu.Item.render, { disabled: true, disabledReason: React.createElement('i', null, 'x'), children: 'Row' }));
  assert.equal(element.props.content.type, 'i');
  assert.equal(element.props.side, 'right');
  assert.equal(element.props.multiline, true);
  assert.equal(element.props.closeOnClick, false);
  assert.equal(element.props.hoverable, undefined);
  const tooltipCore = withDocument(() => renderOnce(element.type, element.props));
  assert.equal(tooltipCore.props.hoverable ?? true, true);
  const idle = withDocument(() => renderOnce(SourceMenu.Item.render, { disabled: false, disabledReason: 'x', children: 'Row' }));
  assert.equal(idle.props.content, undefined);
});

test('the code-current SidebarMenuItem path shows the chunks\' <FormattedMessage> reason (aZ iZ, R2-sections follow-up)', async () => {
  const { SidebarMenuItem } = await server.ssrLoadModule('/src/generated/code-current/sidebar-menu-groups.mjs');
  const { tooFewToSelectReason } = await server.ssrLoadModule('/src/generated/sidebar-sections/group-organize.mjs');
  const expected = renderToStaticMarkup(tooFewToSelectReason);
  assert.ok(expected.length > 10, 'the FormattedMessage formats to text');
  // R4g-sidebar SB3 (X7-06): the row renders shared-16 K's parts: the host SourceMenu inside a host SourceMenu body
  // (SourceMenuRows, SourceSidebarMenu), the CDS Dropdown item inside the CDS ContextMenu the section menus open.
  const { SourceMenuRows } = await server.ssrLoadModule('/src/source-sidebar-menu-kit.jsx');
  const { CdsContextMenu } = await server.ssrLoadModule('/src/generated/view-tabs/shared-frame-6jtSkIit.js');
  const item = React.createElement(SidebarMenuItem, { disabled: true, disabledReason: tooFewToSelectReason, children: 'Select all' });
  const html = renderToStaticMarkup(React.createElement(SourceMenuRows, null, item));
  assert.ok(html.includes(`data-cds-disabled-reason="">${expected}</span>`), html);
  const cds = renderToStaticMarkup(React.createElement(CdsContextMenu.Root, { open: true }, item));
  assert.ok(cds.includes(`data-cds-disabled-reason="">${expected}</span>`), cds);
  assert.match(cds, /^<div role="none"[^>]*data-base-ui-tooltip-trigger=""><div data-disabled="" role="menuitem" aria-disabled="true"/);
});

test('KS/Hx: with a header or footer only the list scrolls; without either the body is unchanged', () => {
  const plain = popupNode({});
  const plainBody = plain.props.children;
  assert.equal(classOf(plainBody), 'smenu-body scroll-fade-y');
  assert.equal(plainBody.props.style, undefined);
  assert.equal(plainBody.props['data-after-header'], undefined);

  const search = React.createElement('input', { 'aria-label': 'Search branches…' });
  const headed = popupNode({ header: search, footer: React.createElement('button', null, 'Choose…'), maxVisibleItems: 10.5 });
  const frame = headed.props.children;
  assert.equal(classOf(frame), 'smenu-frame');
  const [header, body, footer] = React.Children.toArray(frame.props.children);
  assert.equal(classOf(header), 'smenu-frame-header');
  assert.equal(header.props.children.type, 'input');
  assert.equal(classOf(body), 'smenu-body scroll-fade-y');
  assert.equal(body.props['data-after-header'], '');
  assert.ok(find(body, (node) => node.props['data-rows'] === ''), 'the rows are inside the scrolling list');
  assert.equal(body.props.style.maxHeight, 'calc(10.5 * max(var(--cds-h-control), var(--cds-leading-body)) + var(--cds-menu-gutter, 0.25rem) + 0.25rem)');
  assert.equal(classOf(footer), 'smenu-frame-footer');
  assert.equal(menu.menuListMaxHeight(6, false), 'calc(6 * max(var(--cds-h-control), var(--cds-leading-body)) + 2 * var(--cds-menu-gutter, 0.25rem))');
  assert.equal(menu.menuListMaxHeight(undefined, true), undefined);

  const footOnly = popupNode({ footer: 'x' }).props.children;
  const parts = React.Children.toArray(footOnly.props.children);
  assert.deepEqual(parts.map(classOf), ['smenu-body scroll-fade-y', 'smenu-frame-footer']);
  assert.equal(parts[0].props['data-after-header'], undefined, 'Rx keeps its top padding without a header');
});

test('Hx CSS: the frame, the fixed header and footer, pt-0 under a header (source-menu.css)', () => {
  const css = source('source-menu.css');
  assert.match(css, /\.smenu-frame \{ display: flex; min-height: 0; flex-direction: column; overflow: hidden; border-radius: inherit; \}/);
  assert.match(css, /\.smenu-frame-header \{ flex-shrink: 0; padding: var\(--cds-menu-gutter, \.25rem\) var\(--cds-menu-gutter, \.25rem\) 0; \}/);
  assert.match(css, /\.smenu-frame > \.smenu-body \{ flex: 1; border-radius: 0; \}/);
  assert.match(css, /\.smenu-body\[data-after-header\] \{ padding-top: 0; \}/);
  assert.match(css, /\.smenu-frame-footer \{\n  flex-shrink: 0;\n  margin-top: calc\(-1 \* var\(--cds-menu-gutter, \.25rem\)\);\n  padding: 0 var\(--cds-menu-gutter, \.25rem\) var\(--cds-menu-gutter, \.25rem\);\n\}/);
  // .smenu-body (min-height 0, overflow-y auto) is declared before the frame rules, so flex: 1 is what changes.
  assert.ok(css.indexOf('.smenu-body {') < css.indexOf('.smenu-frame {'));
});

const element = (tagName, { editable } = {}) => ({ nodeType: 1, tagName, ...(editable === undefined ? {} : { isContentEditable: editable }), closest: () => null, shadowRoot: null });
const contextEvent = (target) => ({ target, defaultPrevented: false, preventDefault() { this.defaultPrevented = true; } });

test('Popup onContextMenu is opt-in: none by default, F for contextMenuGuard, Be for "always", an explicit handler wins', async () => {
  const { suppressNativeContextMenu } = await server.ssrLoadModule('/src/generated/files-changes/menu-context-guard.mjs');
  const { preventContextMenu } = await server.ssrLoadModule('/src/generated/files-changes/diff-context-guard.mjs');
  const own = () => {};
  assert.equal(menu.menuContextMenuHandler(undefined, undefined), undefined);
  assert.equal(menu.menuContextMenuHandler(false, undefined), undefined);
  assert.equal(menu.menuContextMenuHandler(true, undefined), suppressNativeContextMenu);
  assert.equal(menu.menuContextMenuHandler('editable', undefined), suppressNativeContextMenu);
  assert.equal(menu.menuContextMenuHandler('always', undefined), preventContextMenu);
  assert.equal(menu.menuContextMenuHandler(true, own), own);
  assert.equal(popupNode({}).props.onContextMenu, undefined);
  assert.equal(popupNode({ contextMenuGuard: true }).props.onContextMenu, suppressNativeContextMenu);
  assert.equal(popupNode({ contextMenuGuard: 'always' }).props.onContextMenu, preventContextMenu);
  assert.equal(popupNode({ contextMenuGuard: true, onContextMenu: preventContextMenu }).props.onContextMenu, preventContextMenu);
  // Controlled events through the resolved handlers.
  const editableGuard = menu.menuContextMenuHandler(true);
  const row = contextEvent(element('DIV', { editable: false })), field = contextEvent(element('INPUT'));
  editableGuard(row); editableGuard(field);
  assert.equal(row.defaultPrevented, true);
  assert.equal(field.defaultPrevented, false, 'a search field keeps the native edit menu');
  const always = contextEvent(element('INPUT'));
  menu.menuContextMenuHandler('always')(always);
  assert.equal(always.defaultPrevented, true);
});

// Every 2.42304.0 Popup that passes onContextMenu, by file and local handler name, with the handler's kind.
const OFFICIAL_POPUPS = [
  ['ca5db7aaf-DNznjmvJ.js', 'g', 'F', 1, 'editable'], // U: "{pane} settings"
  ['cccc2cf0a-B0D--VZp.js', 'br', 'Mg', 1, 'editable'], // diff scope
  ['cccc2cf0a-B0D--VZp.js', 'Qn', 'Mg', 2, 'editable'], // Files tree row, Files search content row
  ['cd2efac6e-C1jvGOgh.js', 'N', 'ba', 1, 'editable'], // file viewer Nh
  ['c49d37e5f-BmDQ355F.js', 'J', 'Ot', 1, 'editable'], // simulator overflow (not in the host)
  ['c44d00c7f-zUAG9XyS.js', 'V', 'En', 5, 'always'], // Changes
  ['c0cdf4a08-h228IL-P.js', 'u', 'p', 1, 'always'], // shared point ContextMenu (breadcrumb, commit row, terminal body …)
  ['cfe7c4b3b-CP-IQXj8.js', 'O', 'F', 1, 'always'], // view-tab strip overflow
  ['cfe7c4b3b-CP-IQXj8.js', 'C', 'V', 1, 'always'], // view-tab context menu
  ['c96d752d0-BOCqU7c2.js', 'ns', 'xNe', 1, 'always'], // transcript
  ['cf580efe9-b-DCvKJg.js', 'U', '$r', 1, 'always'], // dev servers
];
test('official: the Popups that pass onContextMenu and what each handler does', () => {
  const imports = { Mg: 'cccc2cf0a-B0D--VZp.js', ba: 'cd2efac6e-C1jvGOgh.js', Ot: 'c49d37e5f-BmDQ355F.js' };
  for (const [name, file] of Object.entries(imports))
    assert.match(official(file), new RegExp(`[{,]s as ${name}\\}from"\\./ca5db7aaf-DNznjmvJ\\.js"`), `${file} imports ca5db7aaf F as ${name}`);
  assert.match(official('c44d00c7f-zUAG9XyS.js'), /y as En\}from"\.\/c82eca2bd-1Y6mm3wZ\.js"/);
  for (const [file, part, handler, count, kind] of OFFICIAL_POPUPS) {
    const text = official(file);
    const escaped = handler.replace(/\$/g, '\\$');
    const hits = text.match(new RegExp(`\\b${part}\\.Popup,\\{(?:[^{}]|\\{[^{}]*\\})*?onContextMenu:${escaped}[,}]`, 'g')) ?? [];
    assert.equal(hits.length, count, `${file} ${part}.Popup onContextMenu:${handler}`);
    if (kind === 'always' && file !== 'c44d00c7f-zUAG9XyS.js')
      assert.match(text, new RegExp(`function ${escaped}\\(e\\)\\{e\\.preventDefault\\(\\)\\}`), `${file} ${handler} always prevents`);
  }
});

// Local menus for those Popups (one-line prop edits at the call sites).
const CALL_SITES = [
  ['source-pane-controls.jsx', /label=\{label\} onClose=\{\(\) => setOpen\(null\)\} initialHighlight=\{open\.entry\} contextMenuGuard>/, 'ca5db7aaf U'],
  // W12 diff-cont: the scope menu is the official CdsDropdown Popup itself (cccc2cf0a $S `onContextMenu:Jv`, ca5db7aaf P).
  ['source-diff-scope.jsx', /<CdsDropdown\.Popup onContextMenu=\{suppressNativeContextMenu\} side="bottom" align="start" container=\{container\} collisionPadding=\{menuCollisionPadding\}>/, 'cccc2cf0a $S'],
  ['source-session.jsx', /trigger=\{rowRef\.current\?\.closest\('\[role="treeitem"\]'\)\}[^\n]*\n[^\n]*dataCds="ContextMenu" contextMenuGuard\n/, 'cccc2cf0a Qn (tree row)'],
  ['source-files-search.jsx', /anchor=\{menu\.row\} trigger=\{menu\.row\}[^\n]*\n[^\n]*dataCds="ContextMenu" contextMenuGuard\n/, 'cccc2cf0a Qn (search rows)'],
  ['source-file-viewer.jsx', /dataCds="ContextMenu" contextMenuGuard\n\s+label=\{FILE_VIEWER_LABELS\.fileActions\}/, 'cd2efac6e Nh'],
  ['source-file-editor.jsx', /anchor=\{menu\.view\.contentDOM\}[^\n]*\n[^\n]*dataCds="ContextMenu" contextMenuGuard\n/, 'cd2efac6e Nh (editor)'],
  ['source-diff.jsx', /anchor=\{headerRef\.current\}[^\n]*\n[^\n]*dataCds="ContextMenu" contextMenuGuard="always"\n/, 'c44d00c7f En (file header)'],
  ['source-diff.jsx', /anchor=\{rowRef\.current\} trigger=\{rowRef\.current\}[^\n]*\n[^\n]*dataCds="ContextMenu" contextMenuGuard="always"\n/, 'c44d00c7f En (tree row)'],
  ['source-diff-commits.jsx', /dataCds="ContextMenu" contextMenuGuard="always"\n\s+label=\{commit\.subject/, 'c44d00c7f xt → c0cdf4a08 p'],
  ['source-breadcrumb-adapters.jsx', /dataCds="ContextMenu" contextMenuGuard="always"\n\s+label=\{t\('File actions'\)\}/, 'cfac349aa De → c0cdf4a08 p'],
  // W12c files-tabbar: the Files tab menu (cfe7c4b3b V) and its "More files" menu (F) are the ViewTabBar's own
  // CdsContextMenu / overflow popups now (source-file-tabs.jsx, cccc2cf0a ND `ey`); the host passes only the items.
];
test('call sites: the local menus of those Popups opt in; menus without an official handler do not', () => {
  for (const [file, pattern, origin] of CALL_SITES) assert.match(source(file), pattern, `${file}: ${origin}`);
  // The terminal tab menu (cfe7c4b3b V in 2.42304.0) is no longer a host SourceMenu: w10-ccres-e31-terminal put the
  // strip on the official ViewTabBar (3.6556.2 cccc2cf0a Zx `u(ey,{…renderTabMenuItems:ye…})`), whose tab menu is the
  // CdsContextMenu popup that prevents the native menu itself (cfe7c4b3b `S.Popup,{anchor:ke,side:"bottom",
  // align:"start",onContextMenu:_e,` with `function _e(e){e.preventDefault()}`), in the official chunk and the
  // generated view-tabs file alike. The host passes only the menu items.
  const V3 = path.join(ROOT, '../reference/snapshots/claude-3.6556.2-20261025-192807/ion-dist/assets/v1/cfe7c4b3b-BF79K6ux.js');
  for (const text of [fs.readFileSync(V3, 'utf8'), source('generated/view-tabs/cfe7c4b3b-BF79K6ux.js')]) {
    assert.equal(text.split('S.Popup,{anchor:ke,side:"bottom",align:"start",onContextMenu:_e,').length, 2);
    assert.equal(text.split('function _e(e){e.preventDefault()}').length, 2);
    assert.equal(text.split('_.Popup,{side:"bottom",align:"end",onContextMenu:I,').length, 2, 'the strip overflow menu (cfe7c4b3b F → I)');
  }
  // w12b-terminal-preview-tabs TPT-1: the Preview strip too (cf580efe9 Oa `r(Qn,{…renderTabMenuItems:…kt…})`); its tab
  // menu item is the generated Ta (`r(O.Item,{onClick:a,children:n})`, O = CdsContextMenu).
  const preview = source('source-preview-tabs.jsx');
  assert.match(preview, /<SourceViewTabBar ref=\{strip\} className="min-w-0 flex-1 outline-none focus-visible:shadow-focus focus-visible:outline-hidden"/);
  assert.match(preview, /renderTabMenuItems=\{openInBrowserItem\}/);
  assert.doesNotMatch(preview, /SourceMenu|contextMenuGuard/);
  const terminal = source('source-terminal-pane.jsx');
  assert.match(terminal, /<SourceViewTabBar className="min-w-0 flex-1" aria-label=\{t\("Terminal tabs"\)\}/);
  assert.match(terminal, /renderTabMenuItems=\{renderTerminalTabMenuItems\} labels=\{stripLabels\} \/>/);
  assert.doesNotMatch(terminal, /setMenuOpen/);
  // w11-e31-terminal-cont: the terminal body menu is no longer a host SourceMenu either: cccc2cf0a iS renders
  // `u(kf,{onContextMenu:Le,onOpenChange:we,trigger:Je,children:Xe})`, kf = c0cdf4a08 g, whose CdsContextMenu popup
  // prevents the native menu itself (`o.Popup,{side:"bottom",align:"start",onContextMenu:f,…}` with
  // `function f(e){e.preventDefault()}`). The pane renders session-rail-changes' slice of g (RowContextMenu).
  const V3_KF = path.join(ROOT, '../reference/snapshots/claude-3.6556.2-20261025-192807/ion-dist/assets/v1/c0cdf4a08-C69Ng1c8.js');
  const kf = fs.readFileSync(V3_KF, 'utf8');
  assert.equal(kf.split('o.Popup,{side:"bottom",align:"start",onContextMenu:f,..._,anchor:x,children:v}').length, 2);
  assert.equal(kf.split('function f(e){e.preventDefault()}').length, 2);
  assert.match(source('generated/session-rail-changes/row-context-menu.mjs'), /^function f\(e\) \{\n\s+e\.preventDefault\(\);\n\}$/m);
  assert.match(source('generated/session-rail-changes/row-context-menu.mjs'), /side: "bottom",\n\s+align: "start",\n\s+onContextMenu: f,/);
  assert.match(terminal, /<RowContextMenu\n/);
  assert.doesNotMatch(terminal, /SourceMenu|contextMenuGuard|bodyMenu/);
  // Already wired without the prop: the Changes body menu passes Be itself, the transcript frame prevents for its
  // portaled ContextMenus (xNe), the generated 3.6556.2 preview pane / dev-server menus pass their own guards
  // (ca5db7aaf-qq5selW3 P, cf580efe9-BFcQCjF9 ai), and the Preview tab overflow menu is the CDS dropdown with ae's
  // preventDefault (cfe7c4b3b I, w10-trans-tab-overflow).
  assert.match(source('source-diff-comments.jsx'), /onContextMenu=\{preventContextMenu\}/);
  assert.match(source('source-transcript.jsx'), /onContextMenu=\{preventMenuContextMenu\}/);
  assert.match(source('generated/code-editor/preview-pane-menu.mjs'), /function P\(e\) \{\n\s+y\(e\.target\) \|\| e\.preventDefault\(\);\n\s+\}/);
  assert.match(source('generated/code-editor/preview-pane-menu.mjs'), /onContextMenu: P,/);
  assert.match(source('generated/code-editor/preview-server-menu.mjs'), /onContextMenu: ai,/);
  assert.match(source('source-preview-tab-overflow.jsx'), /<CdsDropdown\.Popup [^\n]*\n\s+onContextMenu=\{preventDefault\} onKeyDownCapture=\{onKeyDownCapture\}>/);
  assert.doesNotMatch(source('source-preview-tab-overflow.jsx'), /contextMenuGuard/);
  // Official menus without a handler (model, permission, account, sidebar …) stay without one.
  for (const file of ['source-model-menu.jsx', 'source-permission-menu.jsx', 'source-sidebar.jsx', 'source-sidebar-sections-adapters.jsx', 'source-git-status.jsx'])
    assert.doesNotMatch(source(file), /contextMenuGuard/, file);
  assert.doesNotMatch(source('source-menu.jsx'), /onContextMenu = suppressNativeContextMenu/);
});

test('contextMenuGuard call-site components render role="menu" with the expected onContextMenu handler', async () => {
  const { suppressNativeContextMenu } = await server.ssrLoadModule('/src/generated/files-changes/menu-context-guard.mjs');
  const { preventContextMenu } = await server.ssrLoadModule('/src/generated/files-changes/diff-context-guard.mjs');
  const { PaneSettingsMenu } = await server.ssrLoadModule('/src/source-pane-controls.jsx');
  const { BreadcrumbContextMenu } = await server.ssrLoadModule('/src/source-breadcrumb-adapters.jsx');
  const { SourceModelMenu } = await server.ssrLoadModule('/src/source-model-menu.jsx');

  const expandPopupToMenuRole = (node) => withDocument(() => {
    const walk = (cur) => {
      if (!cur || typeof cur !== 'object') return null;
      if (Array.isArray(cur)) {
        for (const child of cur) {
          const hit = walk(child);
          if (hit) return hit;
        }
        return null;
      }
      if (cur.type === SourceMenu.Popup) {
        const popupEl = renderOnce(SourceMenu.Popup, cur.props);
        const portalTree = renderOnce(popupEl.type, popupEl.props);
        return find(portalTree, (el) => el.props?.role === 'menu');
      }
      return walk(cur.props?.children ?? cur.children);
    };
    return walk(node);
  });

  const renderStatefulMenu = (Component, props, openTrigger) => {
    const states = [];
    let cursor = 0;
    const internal = React.__CLIENT_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE;
    const run = () => {
      cursor = 0;
      const prev = internal.H;
      internal.H = withMemoCache({
        useContext: (ctx) => ctx._currentValue,
        useState: (init) => {
          const idx = cursor++;
          if (!(idx in states)) states[idx] = typeof init === 'function' ? init() : init;
          const set = (next) => { states[idx] = typeof next === 'function' ? next(states[idx]) : next; };
          return [states[idx], set];
        },
        useRef: (init) => ({ current: init }),
        useId: () => `:cs-${cursor}:`,
        useMemo: (f) => f(),
        useCallback: (f) => f,
        useEffect() {},
        useLayoutEffect() {},
        useSyncExternalStore: (_sub, get, getServer) => (getServer ?? get)(),
      });
      try { return Component(props); }
      finally { internal.H = prev; }
    };
    const first = run();
    if (openTrigger) openTrigger(first);
    const second = openTrigger ? run() : first;
    return expandPopupToMenuRole(second);
  };

  // 1. PaneSettingsMenu (cd5e3435c z → ca5db7aaf F): contextMenuGuard (editable) → suppressNativeContextMenu.
  const paneMenu = renderStatefulMenu(
    PaneSettingsMenu,
    {
      paneName: 'Files',
      sections: [{ items: [{ label: 'Word wrap', checked: true, onSelect() {} }] }],
    },
    (tree) => {
      const btn = find(tree, (el) => el.type === 'button' && el.props?.['data-pane-settings'] === '');
      btn.props.onClick({ detail: 1 });
    },
  );
  assert.ok(paneMenu, 'PaneSettingsMenu renders role="menu"');
  assert.equal(paneMenu.props.onContextMenu, suppressNativeContextMenu);

  // 2. SourceDiffScope left SourceMenu (W12 diff-cont): its menu is the 3.6556.2 CDS dropdown Popup (cccc2cf0a $S / rC,
  //    view-tabs CdsDropdown) with ca5db7aaf P as onContextMenu; the call-site test above pins it (diff-scope-tree-w12 covers the rest).

  // 3. The Preview tab overflow menu left SourceMenu: it is the 3.6556.2 CDS dropdown (cfe7c4b3b ae, view-tabs CdsDropdown)
  //    whose Popup takes ae's own preventDefault; the call-site test above pins it (w10-trans-tab-overflow covers the SSR).

  // 4. BreadcrumbContextMenu (cfac349aa De → c0cdf4a08 p): contextMenuGuard="always" → preventContextMenu.
  const breadcrumbMenu = renderStatefulMenu(
    BreadcrumbContextMenu,
    {
      trigger: React.createElement('button', { type: 'button' }, 'src'),
      disabled: false,
      onOpenChange() {},
      children: React.createElement(SourceMenu.Item, null, 'Copy path'),
    },
    (tree) => {
      const btn = find(tree, (el) => el.type === 'button');
      btn.props.onContextMenu({
        preventDefault() {},
        stopPropagation() {},
        clientX: 12,
        clientY: 24,
        currentTarget: { getBoundingClientRect: () => ({ left: 0, bottom: 0 }), ownerDocument: { activeElement: null } },
      });
    },
  );
  assert.ok(breadcrumbMenu, 'BreadcrumbContextMenu renders role="menu"');
  assert.equal(breadcrumbMenu.props.onContextMenu, preventContextMenu);

  // 5. SourceModelMenu (official menu without onContextMenu): role="menu" has onContextMenu === undefined.
  const modelMenu = renderStatefulMenu(
    SourceModelMenu,
    {
      anchor: null,
      models: [{ id: 'claude-sonnet-4-6', displayName: 'Sonnet 4.6' }],
      selected: 'claude-sonnet-4-6',
      onSelect() {},
      onClose() {},
    },
    null,
  );
  assert.ok(modelMenu, 'SourceModelMenu renders role="menu"');
  assert.equal(modelMenu.props.onContextMenu, undefined);
});

// ---- 3.6556.2 (w2-menus-host): menus:C1 scroll body, menus:C2 / E25 skill and slash descriptions as the CDS Tooltip.
const V3 = path.join(ROOT, '../reference/snapshots/claude-3.6556.2-20261025-192807/ion-dist/assets/v1');
const v3 = (name) => fs.readFileSync(path.join(V3, name), 'utf8');
// One component call with fixed state values (in call order) and the memo cache.
function renderWith(component, props, states = []) {
  let cursor = 0;
  const hooks = {
    useContext: (context) => context._currentValue, useId: () => ':v3:',
    useState: (initial) => { const i = cursor++; return [i in states ? states[i] : typeof initial === 'function' ? initial() : initial, () => {}]; },
    useRef: (initial) => ({ current: initial }), useMemo: (fn) => fn(), useCallback: (fn) => fn, useEffect() {}, useLayoutEffect() {},
    useSyncExternalStore: (subscribe, getSnapshot, getServerSnapshot) => (getServerSnapshot ?? getSnapshot)(),
  };
  const internal = React.__CLIENT_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE, old = internal.H;
  internal.H = withMemoCache(hooks);
  try { return component(props); } finally { internal.H = old; }
}
const textOf = (node) => node == null || typeof node === 'boolean' ? '' : typeof node === 'string' || typeof node === 'number' ? String(node)
  : Array.isArray(node) ? node.map(textOf).join('') : node.type && typeof node.type === 'function' && !node.props?.children
    ? textOf(node.type(node.props)) : textOf(node.props?.children);

test('menus:C1 — 3.6556.2 QC / $C: every SourceMenu body is relative and never scrolls sideways', () => {
  const frame = v3('shared-frame-6jtSkIit.js');
  assert.ok(frame.includes('QC="relative min-h-0 overflow-y-auto overflow-x-hidden scroll-fade-y rounded-[inherit] border-b-[length:var(--cds-ring-inner)]'), 'plain body');
  assert.ok(frame.includes('$C="relative min-h-0 flex-1 overflow-y-auto overflow-x-hidden scroll-fade-y border-b-[length:var(--cds-ring-inner)]'), 'list under a header');
  const css = source('source-menu.css');
  assert.match(css, /\.smenu-body \{\n  position: relative;\n  min-height: 0;\n  overflow-y: auto;\n  overflow-x: hidden;\n  border-radius: inherit;/);
  // Both popup shapes render that one .smenu-body (plain, and the list between header and footer).
  assert.equal(classOf(popupNode({}).props.children), 'smenu-body scroll-fade-y');
  const headed = popupNode({ header: 'h' }).props.children;
  assert.equal(classOf(React.Children.toArray(headed.props.children)[1]), 'smenu-body scroll-fade-y');
  assert.doesNotMatch(css, /smenu-hovercard/, 'the hand-drawn skill card is gone');
});

test('menus:C2 / E25 — official c17e03edc d: the description is CdsTooltip with these props', () => {
  const official = v3('c17e03edc-fLVjIlvB.js');
  for (const feature of ['l={fallbackAxisSide:"none"}', 'u="max-w-[max(9rem,calc(var(--available-width,100vw)-1rem))]"',
    'align:"start",sideOffset:8,collisionAvoidance:l,hoverable:!1,content:', 'className:`line-clamp-[10] ${u}`',
    'highlightClassName:"font-semibold"', '"data-shrinkwrap":', 'defaultMessage:"via {repo}"', 'defaultMessage:"{pluginName} plugin"', '("inline-end",'])
    assert.ok(official.includes(feature), feature);
  // n = shared-frame Kl is Xm, the CDS Tooltip that view-tabs publishes as CdsTooltip; Xm renders data-cds "Tooltip".
  assert.ok(/import\{[^}]*\bKl as n\b[^}]*\}from"\.\/shared-frame-6jtSkIit\.js"/.test(official));
  const frame = v3('shared-frame-6jtSkIit.js');
  assert.ok(frame.includes('Xm as Kl'));
  const generated = fs.readFileSync(path.join(ROOT, 'src/generated/view-tabs/shared-frame-6jtSkIit.js'), 'utf8');
  assert.ok(generated.includes('"data-cds":"Tooltip",className:"data-[anchor-hidden]:invisible"'), 'the published tooltip popup');
  assert.ok(/\bXm as CdsTooltip\b/.test(generated));
});

test('SkillDescriptionTooltip: CdsTooltip from the view-tabs facade, content / detail / dir / query as c17e03edc d', async () => {
  const facade = await server.ssrLoadModule('/src/generated/view-tabs/index.js');
  const anchor = { current: null };
  const element = menu.SkillDescriptionTooltip({ anchor, description: 'Run the build', sourcePluginName: 'build-tools' });
  assert.equal(element.type, facade.CdsTooltip);
  const props = element.props;
  assert.equal(props.anchor, anchor);
  assert.deepEqual({ open: props.open, side: props.side, align: props.align, sideOffset: props.sideOffset, hoverable: props.hoverable, avoidance: props.collisionAvoidance },
    { open: true, side: 'right', align: 'start', sideOffset: 8, hoverable: false, avoidance: { fallbackAxisSide: 'none' } });
  assert.equal(props.content.props.className, 'line-clamp-[10] max-w-[max(9rem,calc(var(--available-width,100vw)-1rem))]');
  assert.equal(props.content.props.dir, undefined);
  assert.equal(props.detail.props.className, 'block max-w-[max(9rem,calc(var(--available-width,100vw)-1rem))]');
  assert.equal(textOf(props.detail), 'Build tools plugin', 'shared-52 mJ display name');
  // A repo wins over the plugin; without a description the source line is the content and there is no detail.
  const repoOnly = menu.skillDescriptionTooltipProps({ anchor, sourcePluginName: 'x', sourceRepo: 'acme/skills' });
  assert.equal(textOf(repoOnly.content), 'via acme/skills');
  assert.equal(repoOnly.detail, undefined);
  // RTL text (shared-0 LL) gets dir auto and the source line data-shrinkwrap="fill"; RTL direction mirrors the side.
  const hebrew = menu.skillDescriptionTooltipProps({ anchor, description: 'שלום', sourceRepo: 'r' });
  assert.equal(hebrew.content.props.dir, 'auto');
  assert.equal(hebrew.detail.props['data-shrinkwrap'], 'fill');
  assert.equal(menu.skillDescriptionTooltipProps({ anchor, description: 'a', direction: 'rtl' }).side, 'left');
  // Query matches (cdfb0c433 r, case of the query kept) are font-semibold spans.
  const matched = menu.skillDescriptionTooltipProps({ anchor, description: 'Build the app', query: 'the' });
  const runs = matched.content.props.children.type(matched.content.props.children.props).props.children;
  assert.deepEqual(runs.map((run) => [run.props.className ?? null, run.props.children]), [[null, 'Build '], ['font-semibold', 'the'], [null, ' app']]);
});

test('MenuSkillItem: hovering a described row mounts the CDS Tooltip on the row (c752b32f8 Qi → c17e03edc n)', () => {
  const item = { path: '/s/build', label: 'build', description: 'Run the build', sourcePluginName: 'tools' };
  const idle = renderWith(menu.SourceMenu.SkillItem, { item, onSelect() {} }, [false]);
  assert.equal(React.Children.toArray(idle.props.children).length, 1, 'nothing until hover');
  const hovered = renderWith(menu.SourceMenu.SkillItem, { item, onSelect() {} }, [true]);
  const [row, tip] = React.Children.toArray(hovered.props.children);
  assert.equal(tip.type, menu.SkillDescriptionTooltip);
  assert.equal(tip.props.anchor, row.ref, 'anchored to the row ref');
  assert.equal(tip.props.description, 'Run the build');
  assert.equal(tip.props.sourcePluginName, 'tools');
  assert.equal(renderToStaticMarkup(hovered).includes('smenu-hovercard'), false);
});

test('SourceSlashMenu: the active row is described by SkillDescriptionTooltip (ccc334009 B), no local description layer', async () => {
  const { SourceSlashMenu } = await server.ssrLoadModule('/src/source-slash-menu.jsx');
  const commands = [{ id: 'compact', description: 'Summarize earlier context' }, { id: 'nothing' }];
  const base = { commands, selected: 0, onSelect() {}, onHover() {}, onDismiss() {}, id: 'slash', query: 'earl', caret: { left: 10, top: 300, height: 20 } };
  const portal = withDocument(() => renderWith(SourceSlashMenu, base));
  const tip = find(portal.children, (node) => node.type === menu.SkillDescriptionTooltip);
  assert.ok(tip, 'the tooltip is rendered next to the menu');
  assert.equal(tip.props.open, true);
  assert.equal(tip.props.description, 'Summarize earlier context');
  assert.equal(tip.props.query, 'earl');
  assert.equal(tip.props.anchor.getBoundingClientRect().top, -1e6, 'ccc334009 z until the row element is known');
  const row = { nodeType: 1 };
  assert.equal(find(withDocument(() => renderWith(SourceSlashMenu, base, [row])).children, (node) => node.type === menu.SkillDescriptionTooltip).props.anchor, row);
  const quiet = find(withDocument(() => renderWith(SourceSlashMenu, { ...base, selected: 1 }, [row])).children, (node) => node.type === menu.SkillDescriptionTooltip);
  assert.equal(quiet.props.open, false, 'a row without a description closes it');
  assert.equal(find(portal.children, (node) => node.props?.role === 'tooltip'), null, 'no hand-drawn role="tooltip" layer');
  assert.doesNotMatch(source('source-slash-menu.css'), /slash-description/);
});
