// E21 (composer-row-effort-in-model-menu): in the row / titlebar placement the Effort chord opens the model menu
// with its Effort submenu already open on the current level (3.6556.2 c227f4d5e Q6, shared-7 ww / gw).
import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import React from 'react';
import { createServer } from 'vite';
import react from '@vitejs/plugin-react';
import { withMemoCache } from './support/react-memo-cache.mjs';
import { ionSource } from '../scripts/official-3.6556.2.mjs';

const ROOT = path.resolve(import.meta.dirname, '..');
const raw = (name) => fs.readFileSync(path.join(ionSource, name), 'utf8');
const source = (name) => fs.readFileSync(path.join(ROOT, 'src', name), 'utf8');
let server, SourceMenu, SourceModelMenu;
before(async () => {
  server = await createServer({ configFile: false, root: ROOT, plugins: [react()], server: { middlewareMode: true, hmr: false, ws: false, watch: null }, appType: 'custom', logLevel: 'error' });
  SourceMenu = (await server.ssrLoadModule('/src/source-menu.jsx')).SourceMenu;
  SourceModelMenu = (await server.ssrLoadModule('/src/source-model-menu.jsx')).SourceModelMenu;
});
after(async () => { await server?.close(); });

// One component call under a hand-built dispatcher: the element tree it returns (the Popup portals, SSR cannot).
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

test('official 3.6556.2: Q6 opens the model menu on its Effort submenu; ww / gw open it and focus the level', () => {
  const view = raw('c227f4d5e-B-FYKrwT.js');
  for (const pin of ['T=y==="effort"||w&&x&&p', 'let t=e==="effort"&&(p||a<=1)?"model":e', 'b(t),S(e==="effort"&&p)', 'effortInModelMenu:bt', 'bt=et||$e'])
    assert.equal(view.split(pin).length - 1, 1, pin);
  const selector = raw('shared-7-DBAgAi5H.js');
  for (const pin of ['ee=J2($,18,f,Y)?K2($,18,f,Y,f===!0&&Y!=="separate"?{thinkingStyle:Y}:null):$[20],[X,te]=F(ee)',
    'defaultOpen:ne,closeParentOnEsc:ne,onOpenChange:e=>{e||te(null)}', 'ie=(U??R[0])?.id', 'function gw(e){let{levelRef:t}=e;return pe(t,!0),null}'])
    assert.equal(selector.split(pin).length - 1, 1, pin);
  assert.ok(selector.includes('ne?h(gw,{levelRef:re}):null'));
  assert.ok(selector.includes('rowRef:e.id===ie?re:void 0'));
});

test('SourceMenu.Submenu: defaultOpen mounts it open; closeParentOnEsc reaches the child popup', () => {
  const open = renderOnce(SourceMenu.Submenu, { defaultOpen: true, closeParentOnEsc: true, children: null });
  assert.equal(open.props.value.open, true);
  assert.equal(open.props.value.closeParentOnEsc, true);
  const plain = renderOnce(SourceMenu.Submenu, { children: null });
  assert.equal(plain.props.value.open, false, 'default closed');
  assert.equal(plain.props.value.closeParentOnEsc, false);
  const menu = source('source-menu.jsx');
  // Escape in a closeParentOnEsc child closes the whole tree (requestClose → rootClose); ArrowLeft still closes the child.
  assert.ok(menu.includes('if (key === "Escape" && submenu.closeParentOnEsc) { requestClose("escape-key"); return; }'));
  // gw / PT: "checked" highlights the checked row, else the first; a root that only focuses itself leaves focus in the child.
  assert.ok(menu.includes(': highlightOnOpen === "checked" ? list.find((node) => node.getAttribute("aria-checked") === "true") ?? list[0] ?? null : null;'));
  assert.ok(menu.includes('if (!target && [...popups].some((node) => node !== popupRef.current && node?.contains(document.activeElement))) return;'));
});

const levels = [{ reasoningEffort: 'low' }, { reasoningEffort: 'medium' }, { reasoningEffort: 'high' }];
const menuProps = (extra) => ({ anchor: null, models: [{ model: 'm1', displayName: 'Model One' }], selected: 'm1', onClose() {},
  effort: { levels, value: 'medium', onPick() {} }, ...extra });
const effortSection = (props) => {
  const tree = renderOnce(SourceModelMenu, menuProps(props));
  const section = find(tree, (node) => node.type?.name === 'EffortSection');
  assert.ok(section, 'EffortSection rendered');
  const body = renderOnce(section.type, section.props);
  const submenu = find(body, (node) => node.type === SourceMenu.Submenu);
  const popup = find(submenu.props.children, (node) => node.type === SourceMenu.Popup);
  return { section, submenu, popup };
};

test('SourceModelMenu effortOpen: the Effort submenu starts open, Escape closes the menu, the checked level is focused', () => {
  const { section, submenu, popup } = effortSection({ effortOpen: true });
  assert.equal(section.props.open, true);
  assert.equal(submenu.props.defaultOpen, true);
  assert.equal(submenu.props.closeParentOnEsc, true);
  assert.equal(popup.props.initialHighlight, 'checked');
  assert.equal(typeof submenu.props.onOpenChange, 'function', 'onOpenChange:e=>{e||te(null)}');
});

test('SourceModelMenu without effortOpen (click, /model, ⌘⇧I): a plain closed Effort submenu', () => {
  const { section, submenu, popup } = effortSection({});
  assert.equal(section.props.open, false);
  assert.equal(submenu.props.defaultOpen, false);
  assert.equal(submenu.props.closeParentOnEsc, false);
  assert.equal(popup.props.initialHighlight, undefined);
});

test('main.jsx: the Effort chord hands effortOpen to the model menu only from the row / env bar placement', () => {
  const main = source('main.jsx');
  for (const pin of [
    'const effortInModelMenu = !chinNode.querySelector(".sc-effort-trigger");',
    'const effortOpen = command === "effort" && effortInModelMenu, kind = request.kind;',
    'openMenu(CHIN_MENU_KINDS[kind], trigger, effortOpen ? { effortOpen: true } : undefined);',
    'effortOpen={!!menu.data?.effortOpen}',
  ]) assert.equal(main.split(pin).length - 1, 1, pin);
  // The Code composer has no separate effort chip (effortInModel = mode === "code"), so the chord always takes this path.
  assert.ok(source('source-composer.jsx').includes('const effortInModel = mode === "code";'));
});
