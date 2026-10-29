// w10-shell-menu-skill-slash (notdone 36): the composer "+" menu skill row (3.6556.2 c752b32f8 Qi over the CDS Menu
// Item dT / uT) and the slash command menu's scroll body (shared-5 TO with shared-frame QC, ccc334009 k).
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
const V3 = path.join(ROOT, '../reference/snapshots/claude-3.6556.2-20261025-192807/ion-dist/assets/v1');
const v3 = (name) => fs.readFileSync(path.join(V3, name), 'utf8');
const source = (name) => fs.readFileSync(path.join(ROOT, 'src', name), 'utf8');
let server, menu;
before(async () => {
  server = await createServer({ configFile: false, root: ROOT, plugins: [react()], server: { middlewareMode: true, hmr: false, ws: false, watch: null }, appType: 'custom', logLevel: 'error' });
  menu = await server.ssrLoadModule('/src/source-menu.jsx');
});
after(async () => { await server?.close(); });

// One component call with fixed state values (in call order) and the memo cache.
function renderWith(component, props, states = []) {
  let cursor = 0;
  const hooks = {
    useContext: (context) => context._currentValue, useId: () => ':w10:',
    useState: (initial) => { const i = cursor++; return [i in states ? states[i] : typeof initial === 'function' ? initial() : initial, () => {}]; },
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

test('official 3.6556.2: Qi passes labelDir/hint/disabled/className to the CDS Menu Item, which only honours labelDir in RTL', () => {
  const add = v3('c752b32f8-mYZAs6yC.js');
  assert.ok(add.includes('labelDir:"auto",ref:b,icon:c,hint:m,disabled:_,onClick:C,onMouseEnter:x,onMouseLeave:S,className:T,children:s})'), 'Qi row');
  assert.ok(add.includes('w=typeof l=="string"&&l,T=J1($,7,w)?K1($,7,w,e("group",w)):$[8]'), 'Qi className');
  assert.match(add, /^import\{Ba as e,/, 'e = vendor-frame Ba');
  const frame = v3('shared-frame-6jtSkIit.js');
  assert.ok(frame.includes('function uT(e,t,n){return e==="auto"&&t?{dir:"auto",className:`${n} rtl:text-right`}:{className:n}}'), 'uT');
  assert.ok(frame.includes('hint:d,labelDir:f,'), 'dT reads labelDir');
  assert.ok(frame.includes('F=C()==="rtl"'), 'dT direction');
  assert.ok(frame.includes('...uT(f,F,"truncate")') && frame.includes('...uT(f,F,"min-w-0 flex-1 truncate")'), 'both label spans');
});

test('menuLabelDirProps mirrors uT; MenuItem keeps labelDir off the DOM and the host (ltr) label plain', () => {
  assert.deepEqual(menu.menuLabelDirProps('auto', true, 'smenu-label'), { dir: 'auto', className: 'smenu-label rtl:text-right' });
  assert.deepEqual(menu.menuLabelDirProps('auto', false, 'smenu-label'), { className: 'smenu-label' });
  assert.deepEqual(menu.menuLabelDirProps(undefined, true, 'smenu-label'), { className: 'smenu-label' });
  const html = renderToStaticMarkup(React.createElement(menu.SourceMenu.Item, { labelDir: 'auto' }, 'build'));
  assert.doesNotMatch(html, /labelDir|labeldir/i);
  assert.match(html, /<span class="smenu-label smenu-copy-single">build<\/span>/);
  const described = renderToStaticMarkup(React.createElement(menu.SourceMenu.Item, { labelDir: 'auto', description: 'd' }, 'build'));
  assert.match(described, /<span class="smenu-label">build<\/span>/);
});

test('MenuSkillItem: labelDir "auto", hint = pluginLabel, disabled, className clsx("group", item.className) as Qi', () => {
  assert.equal(menu.skillItemClassName(undefined), 'group');
  assert.equal(menu.skillItemClassName(''), 'group');
  assert.equal(menu.skillItemClassName('w-full'), 'group w-full');
  assert.equal(menu.skillItemClassName({}), 'group');
  const item = { path: '/s/build', label: 'build', icon: 'Scroll', description: 'Run the build', pluginLabel: 'Tools', className: 'x-skill' };
  const element = renderWith(menu.SourceMenu.SkillItem, { item, onSelect() {} }, [false]);
  const [row] = React.Children.toArray(element.props.children);
  assert.equal(row.type, menu.SourceMenu.Item);
  assert.deepEqual({ labelDir: row.props.labelDir, icon: row.props.icon, hint: row.props.hint, disabled: row.props.disabled, className: row.props.className },
    { labelDir: 'auto', icon: 'Scroll', hint: 'Tools', disabled: false, className: 'group x-skill' });
  const html = renderToStaticMarkup(element);
  assert.match(html, /class="smenu-item group x-skill"/);
  assert.match(html, /<span class="smenu-hint">Tools<\/span>/);
  const disabled = renderToStaticMarkup(renderWith(menu.SourceMenu.SkillItem, { item: { ...item, pluginLabel: undefined, disabled: true }, onSelect() {} }, [false]));
  assert.match(disabled, /aria-disabled="true"/);
  assert.match(disabled, /data-disabled=""/);
  assert.doesNotMatch(disabled, /smenu-hint/);
  // A host skill row (customize-model skillMenuItems: no pluginLabel / className / disabled) is a plain enabled "group" row.
  const plain = renderWith(menu.SourceMenu.SkillItem, { item: { path: '/s/a', label: 'a', icon: 'Scroll' }, onSelect() {} }, [false]);
  const plainRow = React.Children.toArray(plain.props.children)[0];
  assert.deepEqual({ hint: plainRow.props.hint, disabled: plainRow.props.disabled, className: plainRow.props.className }, { hint: undefined, disabled: false, className: 'group' });
});

test('official 3.6556.2 slash menu: TO popover and QC body, k rows in "flex flex-col" below A = 30', () => {
  const slash = v3('shared-5-Bg6ZMqvt.js');
  assert.ok(slash.includes('"flex flex-col min-w-60 max-w-[min(32rem,calc(100vw-16px))] max-h-96"'), 'TO popover classes');
  assert.ok(slash.includes('h("div",{ref:fe,className:Le,children:c})'), 'TO body');
  for (const binding of ['is as Le', 'cs as je', 'Al as ee']) assert.ok(slash.includes(binding), binding);
  const frame = v3('shared-frame-6jtSkIit.js');
  for (const binding of ['QC as is', 'IC as cs', 'ig as Al']) assert.ok(frame.includes(binding), binding);
  assert.ok(frame.includes('QC="relative min-h-0 overflow-y-auto overflow-x-hidden scroll-fade-y rounded-[inherit] border-b-[length:var(--cds-ring-inner)] border-transparent forced-colors:border-b-0 p-[var(--cds-menu-gutter,0.25rem)]"'));
  assert.ok(frame.includes('IC="rounded-[calc(var(--cds-radius)+var(--cds-menu-gutter,calc(0.25rem*var(--cds-rem-scale,1))))]"'));
  const list = v3('ccc334009-BcS3oSTB.js');
  assert.ok(list.includes('n("div",{className:"flex flex-col",children:c})'), 'k');
  assert.ok(list.includes('var A=30'), 'virtualized from 30 rows');
});

test('source-slash-menu.css: the body is QC (relative, no sideways scroll, gutter padding, forced-colors) and the menu radius IC', () => {
  const css = source('source-slash-menu.css');
  assert.ok(css.includes('.source-slash-body{position:relative;min-height:0;overflow-y:auto;overflow-x:hidden;border-radius:inherit;border-bottom:var(--cds-ring-inner,0px) solid transparent;padding:var(--cds-menu-gutter,.25rem);}'));
  assert.ok(css.includes('@media (forced-colors:active){.source-slash-body{border-bottom-width:0}}'));
  assert.ok(css.includes('border-radius:calc(var(--cds-radius,6px) + var(--cds-menu-gutter,calc(.25rem * var(--cds-rem-scale,1))))'));
  assert.ok(css.includes('min-width:240px;max-width:min(512px,calc(100vw - 16px))'), 'min-w-60 max-w-[min(32rem,calc(100vw-16px))]');
});

test('SourceSlashMenu: role="menu" > .source-slash-body.scroll-fade-y > div.flex.flex-col > rows', async () => {
  const { SourceSlashMenu } = await server.ssrLoadModule('/src/source-slash-menu.jsx');
  const commands = [{ id: 'compact', description: 'Summarize earlier context' }, { id: 'clear' }];
  const base = { commands, selected: 0, onSelect() {}, onHover() {}, onDismiss() {}, id: 'slash', query: '', caret: { left: 10, top: 300, height: 20 } };
  const portal = withDocument(() => renderWith(SourceSlashMenu, base));
  const popup = find(portal.children, (node) => node.props?.role === 'menu');
  const body = popup.props.children;
  assert.equal(body.props.className, 'source-slash-body scroll-fade-y');
  const list = React.Children.toArray(body.props.children).find((node) => node?.props?.className === 'flex flex-col');
  assert.ok(list, 'the k wrapper');
  const rows = React.Children.toArray(list.props.children);
  assert.equal(rows.length, 2);
  assert.ok(rows.every((row) => row.props.role === 'menuitem'));
  assert.equal(rows[0].props['data-highlighted'], '');
});
