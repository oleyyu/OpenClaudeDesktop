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
  internal.H = hooks;
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
  const { CdsContextMenu } = await server.ssrLoadModule('/src/generated/view-tabs/shared-frame-BfjMqbuN.js');
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
  ['source-diff-scope.jsx', /label=\{t\("Diff scope"\)\} onClose=\{\(\) => setOpen\(null\)\} initialHighlight=\{open\.entry\} contextMenuGuard>/, 'cccc2cf0a br'],
  ['source-session.jsx', /trigger=\{rowRef\.current\?\.closest\('\[role="treeitem"\]'\)\}[^\n]*\n[^\n]*dataCds="ContextMenu" contextMenuGuard\n/, 'cccc2cf0a Qn (tree row)'],
  ['source-files-search.jsx', /anchor=\{menu\.row\} trigger=\{menu\.row\}[^\n]*\n[^\n]*dataCds="ContextMenu" contextMenuGuard\n/, 'cccc2cf0a Qn (search rows)'],
  ['source-file-viewer.jsx', /dataCds="ContextMenu" contextMenuGuard\n\s+label=\{FILE_VIEWER_LABELS\.fileActions\}/, 'cd2efac6e Nh'],
  ['source-file-editor.jsx', /anchor=\{menu\.view\.contentDOM\}[^\n]*\n[^\n]*dataCds="ContextMenu" contextMenuGuard\n/, 'cd2efac6e Nh (editor)'],
  ['source-diff.jsx', /anchor=\{headerRef\.current\}[^\n]*\n[^\n]*dataCds="ContextMenu" contextMenuGuard="always"\n/, 'c44d00c7f En (file header)'],
  ['source-diff.jsx', /anchor=\{rowRef\.current\} trigger=\{rowRef\.current\}[^\n]*\n[^\n]*dataCds="ContextMenu" contextMenuGuard="always"\n/, 'c44d00c7f En (tree row)'],
  ['source-diff-commits.jsx', /dataCds="ContextMenu" contextMenuGuard="always"\n\s+label=\{commit\.subject/, 'c44d00c7f xt → c0cdf4a08 p'],
  ['source-breadcrumb-adapters.jsx', /dataCds="ContextMenu" contextMenuGuard="always"\n\s+label=\{t\('File actions'\)\}/, 'cfac349aa De → c0cdf4a08 p'],
  ['source-terminal-pane.jsx', /point=\{bodyMenu\} dataCds="ContextMenu" layer="contextmenu" label=\{t\("Terminal"\)\} contextMenuGuard="always"/, 'cccc2cf0a Xf → c0cdf4a08 p'],
  ['source-terminal-pane.jsx', /align="start" dataCds="ContextMenu" layer="contextmenu" contextMenuGuard="always"\n\s+onClose=\{\(\) => setMenuOpen\(false\)\}/, 'cfe7c4b3b V (terminal tab)'],
  ['source-session.jsx', /layer="contextmenu"\n\s+contextMenuGuard="always"\n\s+finalFocus=\{restoreTarget\}/, 'cfe7c4b3b V (file tab)'],
  ['source-session.jsx', /label=\{FILE_TAB_LABELS\.moreTabs\} contextMenuGuard="always"\n/, 'cfe7c4b3b F (file tabs overflow)'],
  ['source-preview-tabs.jsx', /label=\{t\('Tab actions'\)\} contextMenuGuard="always"\n/, 'cfe7c4b3b V (preview tab)'],
  ['source-preview-tab-overflow.jsx', /label=\{copy\.moreTabs\} className=\{className\} contextMenuGuard="always"\n/, 'cfe7c4b3b F (overflow)'],
];
test('call sites: the local menus of those Popups opt in; menus without an official handler do not', () => {
  for (const [file, pattern, origin] of CALL_SITES) assert.match(source(file), pattern, `${file}: ${origin}`);
  // Already wired without the prop: the Changes body menu passes Be itself, the transcript frame prevents for its
  // portaled ContextMenus (xNe), and the generated preview pane / dev-server menus pass their own F / $r copies.
  assert.match(source('source-diff-comments.jsx'), /onContextMenu=\{preventContextMenu\}/);
  assert.match(source('source-transcript.jsx'), /onContextMenu=\{preventMenuContextMenu\}/);
  assert.match(source('generated/code-editor/preview-pane-menu.mjs'), /onContextMenu: F,/);
  assert.match(source('generated/code-editor/preview-server-menu.mjs'), /onContextMenu: Mr,/);
  // Official menus without a handler (model, permission, account, sidebar …) stay without one.
  for (const file of ['source-model-menu.jsx', 'source-permission-menu.jsx', 'source-sidebar.jsx', 'source-sidebar-sections-adapters.jsx', 'source-git-status.jsx'])
    assert.doesNotMatch(source(file), /contextMenuGuard/, file);
  assert.doesNotMatch(source('source-menu.jsx'), /onContextMenu = suppressNativeContextMenu/);
});

test('contextMenuGuard call-site components render role="menu" with the expected onContextMenu handler', async () => {
  const { suppressNativeContextMenu } = await server.ssrLoadModule('/src/generated/files-changes/menu-context-guard.mjs');
  const { preventContextMenu } = await server.ssrLoadModule('/src/generated/files-changes/diff-context-guard.mjs');
  const { PaneSettingsMenu } = await server.ssrLoadModule('/src/source-pane-controls.jsx');
  const { SourceDiffScope } = await server.ssrLoadModule('/src/source-diff-scope.jsx');
  const { SourcePreviewTabOverflow } = await server.ssrLoadModule('/src/source-preview-tab-overflow.jsx');
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
      internal.H = {
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
      };
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

  // 2. SourceDiffScope (cccc2cf0a zm/Mg → ca5db7aaf F): contextMenuGuard (editable) → suppressNativeContextMenu.
  const diffScopeMenu = renderStatefulMenu(
    SourceDiffScope,
    {
      trigger: { ariaLabel: 'Diff scope: All changes', label: 'All changes' },
      sections: [{ items: [{ value: 'all', label: 'All changes', checked: true, onSelect() {} }] }],
    },
    (tree) => {
      const trigger = find(tree, (el) => el.props?.className === 'sds-trigger');
      trigger.props.onClick();
    },
  );
  assert.ok(diffScopeMenu, 'SourceDiffScope renders role="menu"');
  assert.equal(diffScopeMenu.props.onContextMenu, suppressNativeContextMenu);

  // 3. SourcePreviewTabOverflow (cfe7c4b3b se → F): contextMenuGuard="always" → preventContextMenu.
  const tabOverflowMenu = renderStatefulMenu(
    SourcePreviewTabOverflow,
    {
      anchor: null,
      tabs: [{ id: 't1', title: 'index.js', closable: true }],
      onActivate() {},
      onCloseTab() {},
      onClose() {},
    },
    null,
  );
  assert.ok(tabOverflowMenu, 'SourcePreviewTabOverflow renders role="menu"');
  assert.equal(tabOverflowMenu.props.onContextMenu, preventContextMenu);

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
