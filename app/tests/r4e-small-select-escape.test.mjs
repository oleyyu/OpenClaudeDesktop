// R4e-small global-12: SourceSelect swallows the held Escape's auto-repeats after Escape closed its popup
// (2.42304.0 shared-frame zk/Bk), so they never bubble on and close an outer Dialog.
// Controlled events only: the real SourceSelect / SelectPopup run under a test hook dispatcher (as
// tests/sessions-page-current.test.mjs does) and their onKeyDown props receive hand-built events that bubble through
// a modelled outer Dialog handler. No browser, no GUI, no network.
import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import React from 'react';
import { createServer } from 'vite';
import react from '@vitejs/plugin-react';

const app = path.resolve(import.meta.dirname, '..');
const officialFrame = fs.readFileSync(path.join(app, '../reference/installed-2.42304.0-20261017/ion-dist/assets/v1/shared-frame-BfjMqbuN.js'), 'utf8');
const count = (text, needle) => text.split(needle).length - 1;

let server, Select;
before(async () => {
  // SelectPopup portals to document.body (react-dom only checks it is an element) and reads theme attributes from
  // <html>; Tab scans the body for the next control. Nothing else of the DOM is reached on the keyboard path.
  globalThis.document = { body: { nodeType: 1, querySelectorAll: () => [] }, documentElement: { getAttribute: () => null } };
  server = await createServer({ configFile: false, root: app, plugins: [react()],
    server: { middlewareMode: true, hmr: false, watch: null }, appType: 'custom', logLevel: 'error' });
  Select = await server.ssrLoadModule('/src/source-select.jsx');
});
after(async () => { await server?.close(); });

function nodes(tree, predicate) {
  if (!tree || typeof tree !== 'object') return [];
  if (Array.isArray(tree)) return tree.flatMap(node => nodes(node, predicate));
  // A portal keeps its subtree on .children, an element on .props.children.
  const children = tree.props ? tree.props.children : tree.children;
  return [...(predicate(tree) ? [tree] : []), ...nodes(children, predicate)];
}
function fixture(component, props) {
  let cursor = 0, tree;
  const cells = [], same = (a, b) => a && b && a.length === b.length && a.every((v, i) => Object.is(v, b[i]));
  const hooks = {
    useContext: context => context._currentValue,
    useId: () => ':sel:',
    useState(initial) {
      const i = cursor++;
      cells[i] ??= { value: typeof initial === 'function' ? initial() : initial };
      return [cells[i].value, value => { cells[i].value = typeof value === 'function' ? value(cells[i].value) : value; }];
    },
    useRef(initial) { const i = cursor++; cells[i] ??= { value: { current: initial } }; return cells[i].value; },
    useMemo(fn, deps) { const i = cursor++; if (!cells[i] || !same(cells[i].deps, deps)) cells[i] = { value: fn(), deps }; return cells[i].value; },
    useCallback(fn, deps) { return hooks.useMemo(() => fn, deps); },
    // Effects (positioning, focus, outside press) are not part of the keyboard path under test.
    useEffect() { cursor++; },
  };
  hooks.useLayoutEffect = hooks.useEffect;
  const render = () => {
    cursor = 0;
    const internal = React.__CLIENT_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE, old = internal.H;
    internal.H = hooks;
    try { return tree = component(props); } finally { internal.H = old; }
  };
  render();
  return { get tree() { return tree; }, render };
}

// A keydown that bubbles from the focused element through `chain` (the trigger or the popup, then the outer Dialog's
// handler); a handler that calls stopPropagation ends the walk, as the DOM would.
function press(chain, init) {
  const event = { key: 'Escape', repeat: false, altKey: false, metaKey: false, ctrlKey: false, shiftKey: false,
    defaultPrevented: false, propagationStopped: false, nativeEvent: { isComposing: false }, ...init,
    preventDefault() { this.defaultPrevented = true; }, stopPropagation() { this.propagationStopped = true; } };
  for (const [currentTarget, handler] of chain) {
    event.currentTarget = currentTarget;
    handler(event);
    if (event.propagationStopped) break;
  }
  return event;
}

function mountSelect() {
  const items = [{ value: 'light', label: 'Light' }, { value: 'dark', label: 'Dark' }];
  const select = fixture(Select.SourceSelect, { label: 'Theme', value: 'dark', items, onChange() {} });
  const button = () => nodes(select.tree, node => node.type === 'button' && node.props.role === 'combobox')[0];
  const triggerNode = { focused: 0, focus() { this.focused += 1; }, closest: () => null };
  button().props.ref.current = triggerNode;
  const dialog = { closed: 0 };
  const dialogNode = {}, onDialogKeyDown = event => { if (event.key === 'Escape' && !event.defaultPrevented) dialog.closed += 1; };
  const triggerKeys = () => [[triggerNode, button().props.onKeyDown], [dialogNode, onDialogKeyDown]];
  const open = () => {
    button().props.onClick();
    select.render();
    const popupElement = nodes(select.tree, node => typeof node.type === 'function' && node.props?.trigger)[0];
    assert.ok(popupElement, 'SelectPopup is mounted once the select is open');
    const popup = fixture(popupElement.type, popupElement.props);
    const surface = nodes(popup.tree, node => node.props?.className === 'sselect-popup')[0];
    assert.equal(surface.props['data-cds'], 'Combobox');
    return [[{}, surface.props.onKeyDown], [dialogNode, onDialogKeyDown]];
  };
  const isOpen = () => button().props['aria-expanded'] === true;
  return { select, triggerNode, dialog, triggerKeys, open, isOpen };
}

test('global-12 official: shared-frame Bk swallows a repeated Escape on the trigger whose popup the Escape closed (zk)', () => {
  for (const needle of [
    'var zk=new WeakSet;function Bk(e){let t=e.currentTarget;if(e.key!=="Escape"||Lk(e))return;if(e.repeat&&zk.has(t)){e.preventDefault(),e.stopPropagation();return}zk.delete(t);',
    'let n=Xi(t),r=t.ownerDocument.getElementById(t.getAttribute("aria-controls")??"");t.getAttribute("aria-expanded")==="true"&&n!==void 0&&r!==null&&(e.stopPropagation(),Rk(r,n,"Escape")&&(zk.add(t),e.preventDefault()))}',
    // Its two callers: the composable Combobox trigger Vk runs the caller's onKeyDown first, then Bk …
    'd=J(e=>{i?.(e),Bk(e)},[i]);return H(de,{ref:u,...l?{}:{"aria-labelledby":s},"data-cds":"Combobox"',
    // … and Ak, the single/select Combobox that SourceSelect mirrors, puts Bk straight on its non-searchable trigger.
    'function Ak(e){let{"data-cds":t="Combobox",mode:n="select",',
    'T(de,{ref:St,disabled:Re,...Kt,onKeyDown:Bk,',
  ]) assert.equal(count(officialFrame, needle), 1, needle);
  // Definition + Vk's call; no other reference besides Ak's onKeyDown:Bk.
  assert.equal(count(officialFrame, 'Bk('), 2);
  assert.equal(count(officialFrame, 'zk.add(t)'), 1);
});

test('global-12 local: holding Escape closes only the popup; the repeats stop at the trigger and the outer Dialog stays open', () => {
  const s = mountSelect();
  const popupKeys = s.open();
  assert.equal(s.isOpen(), true);
  // First Escape, inside the popup (focus is in its list): the popup closes, focus returns to the trigger.
  const first = press(popupKeys, {});
  assert.equal(first.propagationStopped, true);
  assert.equal(first.defaultPrevented, true);
  s.select.render();
  assert.equal(s.isOpen(), false);
  assert.equal(s.triggerNode.focused, 1);
  assert.equal(s.dialog.closed, 0);
  // The held key's auto-repeats now land on the trigger: swallowed (preventDefault + stopPropagation), every time.
  for (let i = 0; i < 3; i += 1) {
    const repeat = press(s.triggerKeys(), { repeat: true });
    assert.equal(repeat.propagationStopped, true);
    assert.equal(repeat.defaultPrevented, true);
  }
  assert.equal(s.dialog.closed, 0);
  // Releasing and pressing Escape again is a fresh (non-repeat) key: it clears the mark and reaches the Dialog.
  const fresh = press(s.triggerKeys(), { repeat: false });
  assert.equal(fresh.propagationStopped, false);
  assert.equal(s.dialog.closed, 1);
  // … and so does that press's own auto-repeat, since the mark is gone (official zk.delete).
  press(s.triggerKeys(), { repeat: true });
  assert.equal(s.dialog.closed, 2);
});

test('global-12 local: without an Escape-closed popup, a repeated Escape on the trigger is not swallowed', () => {
  // Never opened: the repeat bubbles to the Dialog as before.
  const idle = mountSelect();
  const event = press(idle.triggerKeys(), { repeat: true });
  assert.equal(event.propagationStopped, false);
  assert.equal(idle.dialog.closed, 1);
  // Closed by Tab (not Escape): the trigger is not marked either.
  const tabbed = mountSelect();
  const popupKeys = tabbed.open();
  press(popupKeys, { key: 'Tab' });
  tabbed.select.render();
  assert.equal(tabbed.isOpen(), false);
  press(tabbed.triggerKeys(), { repeat: true });
  assert.equal(tabbed.dialog.closed, 1);
  // The mark is per trigger: another select's trigger is unaffected by the first one's Escape close.
  const a = mountSelect(), b = mountSelect();
  press(a.open(), {});
  press(b.triggerKeys(), { repeat: true });
  assert.equal(b.dialog.closed, 1);
  press(a.triggerKeys(), { repeat: true });
  assert.equal(a.dialog.closed, 0);
});

test('global-12 local helper: other keys and already-handled Escapes pass through untouched (official Lk)', () => {
  const owner = {};
  Select.markEscapeClosed(owner);
  const make = init => ({ key: 'Escape', repeat: true, currentTarget: owner, defaultPrevented: false, stopped: false,
    preventDefault() { this.defaultPrevented = true; }, stopPropagation() { this.stopped = true; }, ...init });
  const other = make({ key: 'Enter' });
  assert.equal(Select.swallowRepeatedEscape(other), false);
  assert.equal(other.stopped, false);
  const handled = make({ defaultPrevented: true });
  assert.equal(Select.swallowRepeatedEscape(handled), false);
  assert.equal(handled.stopped, false);
  // The mark survived both, so the next repeat is still swallowed.
  const repeat = make({});
  assert.equal(Select.swallowRepeatedEscape(repeat), true);
  assert.equal(repeat.stopped, true);
});
