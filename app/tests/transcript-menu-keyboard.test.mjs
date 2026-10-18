import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import React from 'react';
import { createServer } from 'vite';
import react from '@vitejs/plugin-react';
import { OPEN_CONTEXT_MENU, contextMenuOrigin, preventMenuContextMenu } from '../src/transcript-context-menu-model.mjs';

// TT-06 / transcript-05 (2.42304.0 c96d752d0-BOCqU7c2.js): the row's onContextMenu reads `byKeyboard: e.button === -1`,
// TNe re-dispatches a keyboard opening as PointerEvent("contextmenu", {button: -1}) and a pointer one as
// MouseEvent("contextmenu", {button: 2}); ENe's Popup takes `onContextMenu: xNe` (preventDefault).
const ROOT = path.resolve(import.meta.dirname, '..');
const OFFICIAL = path.join(ROOT, '../reference/installed-2.42304.0-20261017/ion-dist/assets/v1/c96d752d0-BOCqU7c2.js');

test('the official source: byKeyboard is button -1, TNe keeps the origin, and the popup prevents its own right-click', () => {
  const source = fs.readFileSync(OFFICIAL, 'utf8');
  assert.match(source, /byKeyboard:e\.button===-1/);
  assert.match(source, /t\.byKeyboard===!0\?new n\.PointerEvent\("contextmenu",\{\.\.\.r,button:-1\}\):new n\.MouseEvent\("contextmenu",\{\.\.\.r,button:2\}\)/);
  assert.match(source, /function xNe\(e\)\{e\.preventDefault\(\)\}/);
  assert.match(source, /ns\.Popup,\{onContextMenu:xNe,/);
  // jF reads the image under the event target into the same menu (`img:not([draggable="false"])` → imageSrc).
  assert.match(source, /r=t\?\.closest\('img:not\(\[draggable="false"\]\)'\)/);
  assert.match(source, /imageSrc:uNe\(r\)/);
});

test('contextMenuOrigin: button -1 is a keyboard opening; a right button (2) or a primary press (0) is not', () => {
  assert.deepEqual(contextMenuOrigin({ button: -1, clientX: 40, clientY: 80 }), { byKeyboard: true, point: { x: 40, y: 80 } });
  assert.deepEqual(contextMenuOrigin({ button: 2, clientX: 5, clientY: 6 }), { byKeyboard: false, point: { x: 5, y: 6 } });
  assert.equal(contextMenuOrigin({ button: 0, clientX: 1, clientY: 1 }).byKeyboard, false);
  assert.deepEqual(contextMenuOrigin({}), { byKeyboard: false, point: { x: 0, y: 0 } });
  assert.deepEqual(contextMenuOrigin(null), { byKeyboard: false, point: { x: 0, y: 0 } });
});

// An element stand-in: dispatching a real cancelable Event on it gives the handler a genuine target and preventDefault.
class Node extends EventTarget {
  constructor(matches, parent = null) { super(); this.nodeType = 1; this.matches = matches; this.parentElement = parent; }
  closest(selector) {
    assert.equal(selector, OPEN_CONTEXT_MENU);
    for (let node = this; node; node = node.parentElement) if (node.matches) return node;
    return null;
  }
}
const fire = (target) => {
  const event = new Event('contextmenu', { cancelable: true, bubbles: true });
  let handled;
  target.addEventListener('contextmenu', (e) => { handled = preventMenuContextMenu(e); }, { once: true });
  target.dispatchEvent(event);
  return { handled, prevented: event.defaultPrevented };
};

test('controlled events: a right-click inside the open menu (root popup or submenu) is prevented; elsewhere it is not', () => {
  const popup = new Node(true), item = new Node(false, popup);
  assert.deepEqual(fire(item), { handled: true, prevented: true }, 'a menu item');
  assert.deepEqual(fire(popup), { handled: true, prevented: true }, 'the popup itself');
  const submenu = new Node(true), subitem = new Node(false, submenu);
  assert.deepEqual(fire(subitem), { handled: true, prevented: true }, 'a submenu item');
  const row = new Node(false, new Node(false));
  assert.deepEqual(fire(row), { handled: false, prevented: false }, 'a transcript row keeps its own handling');
  // A text node target resolves to its parent element, as the transcript's own handler does.
  const text = { nodeType: 3, parentElement: item };
  const event = { target: text, prevented: false, preventDefault() { this.prevented = true; } };
  assert.equal(preventMenuContextMenu(event), true);
  assert.equal(event.prevented, true);
  assert.match(OPEN_CONTEXT_MENU, /\[data-cds="ContextMenu"\]/);
  assert.match(OPEN_CONTEXT_MENU, /\[role="menu"\]\[data-nested\]/);
});

test('source wiring: byKeyboard reaches the menu state and becomes initialHighlight "first"; the frame takes xNe', () => {
  const source = fs.readFileSync(path.join(ROOT, 'src/source-transcript.jsx'), 'utf8');
  const onContextMenu = source.slice(source.indexOf('function onContextMenu(event)'), source.indexOf('function openMessageMenu('));
  assert.match(onContextMenu, /const origin = contextMenuOrigin\(event\);/);
  assert.match(onContextMenu, /openMessageMenu\(target, origin\.point, null, origin\.byKeyboard\)/);
  assert.match(source, /function openMessageMenu\(target, point, image = null, byKeyboard = false\)/);
  assert.match(source, /setMenu\(\{ kind: "file", point, byKeyboard,/);
  assert.match(source, /setMenu\(\{ kind: "message", point, byKeyboard,/);
  assert.match(source, /initialHighlight=\{menu\.byKeyboard \? "first" : undefined\}/);
  const frame = source.slice(source.indexOf('className="source-transcript-frame"'), source.indexOf('ref={scroll.viewportRef}'));
  assert.match(frame, /onContextMenu=\{preventMenuContextMenu\}/);
  // The shared SourceMenu (not changed here) honours an explicit initialHighlight over its keydown heuristic.
  const menu = fs.readFileSync(path.join(ROOT, 'src/source-menu.jsx'), 'utf8');
  assert.match(menu, /useState\(\(\) => initialHighlight !== undefined \? initialHighlight/);
  assert.match(menu, /highlightOnOpen === "first" \? list\[0\]/);
});

// ---- the response image (source-response-image.jsx) --------------------------------------------------------------
// The official row reads an image under the pointer from the same contextmenu event (jF: `imageSrc: uNe(r)`), so a
// keyboard-invoked menu over an image is a byKeyboard menu like any other. Locally the image's own ContextMenu /
// Shift+F10 keydown opens it: openMessageMenu gets byKeyboard as its 4th argument, and the image's fallback menu (no
// message menu took it) gets initialHighlight "first". The component runs under a hook dispatcher (the
// sessions-page-current fixture pattern), and its real handlers receive controlled events.
function fixture(component, props, contexts) {
  let cursor = 0, tree;
  const cells = [];
  const hooks = {
    useContext: (c) => (contexts.has(c) ? contexts.get(c) : c._currentValue),
    useState(initial) { const i = cursor++; cells[i] ??= { value: typeof initial === 'function' ? initial() : initial };
      return [cells[i].value, (value) => { cells[i].value = typeof value === 'function' ? value(cells[i].value) : value; }]; },
    useRef(initial) { const i = cursor++; cells[i] ??= { value: { current: initial } }; return cells[i].value; },
    useEffect() { cursor++; },
  };
  hooks.useLayoutEffect = hooks.useEffect;
  const render = () => {
    cursor = 0;
    const internal = React.__CLIENT_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE, old = internal.H;
    internal.H = hooks;
    try { return (tree = component(props)); } finally { internal.H = old; }
  };
  render();
  return { get tree() { return tree; }, render };
}
const nodes = (tree, predicate) => {
  if (!tree || typeof tree !== 'object') return [];
  if (Array.isArray(tree)) return tree.flatMap((n) => nodes(n, predicate));
  return [...(predicate(tree) ? [tree] : []), ...nodes(tree.props?.children, predicate)];
};
const PNG = 'data:image/png;base64,iVBORw0KGgo=';
const keyEvent = (key, extra = {}) => ({ key, shiftKey: false, prevented: false, stopped: false, ...extra,
  preventDefault() { this.prevented = true; }, stopPropagation() { this.stopped = true; } });
const mouseEvent = (button, x, y) => ({ ...keyEvent(undefined), button, clientX: x, clientY: y });

test('response image: ContextMenu / Shift+F10 open the message menu with byKeyboard, a right-click without it', async () => {
  const server = await createServer({ configFile: false, root: ROOT, plugins: [react()],
    server: { middlewareMode: true, hmr: false, watch: null }, appType: 'custom', logLevel: 'error' });
  try {
    const { SourceResponseImage, ResponseImageMenuContext } = await server.ssrLoadModule('/src/source-response-image.jsx');
    const { SourceMenu } = await server.ssrLoadModule('/src/source-menu.jsx');
    const box = { getBoundingClientRect: () => ({ left: 12, bottom: 34 }) };
    const image = (f) => { const img = nodes(f.tree, (n) => n.type === 'img')[0]; img.props.ref.current = box; return img; };
    const popup = (f) => nodes(f.tree, (n) => n.type === SourceMenu.Popup)[0];

    // A message menu takes it: every opening goes through openMessageMenu, with byKeyboard as the 4th argument.
    const calls = [];
    const taken = fixture(SourceResponseImage, { src: PNG, cwd: '/w', call: async () => ({}) },
      new Map([[ResponseImageMenuContext, (...args) => { calls.push(args); return true; }]]));
    for (const event of [keyEvent('ContextMenu'), keyEvent('F10', { shiftKey: true })]) {
      image(taken).props.onKeyDown(event);
      assert.equal(event.prevented && event.stopped, true, `${event.key} is consumed`);
    }
    image(taken).props.onContextMenu(mouseEvent(2, 50, 60));
    image(taken).props.onContextMenu(mouseEvent(-1, 70, 80));
    const plain = keyEvent('F10');
    image(taken).props.onKeyDown(plain);
    assert.equal(plain.prevented, false, 'F10 without Shift is left alone');
    assert.deepEqual(calls.map(([target, point, handle, byKeyboard]) => [target, point, typeof handle?.copy, byKeyboard]), [
      [box, { x: 12, y: 34 }, 'function', true],
      [box, { x: 12, y: 34 }, 'function', true],
      [box, { x: 50, y: 60 }, 'function', false],
      [box, { x: 70, y: 80 }, 'function', true],
    ]);
    assert.equal(calls[0][2].src, PNG);

    // No message menu: the image's own Copy image / Save image menu, first item highlighted only from the keyboard.
    const own = fixture(SourceResponseImage, { src: PNG, cwd: '/w', call: async () => ({}) }, new Map([[ResponseImageMenuContext, null]]));
    assert.equal(popup(own), undefined);
    image(own).props.onKeyDown(keyEvent('ContextMenu'));
    own.render();
    assert.equal(popup(own).props.initialHighlight, 'first');
    assert.deepEqual(popup(own).props.point, { x: 12, y: 34 });
    assert.equal(popup(own).props.dataCds, 'ContextMenu');
    popup(own).props.onClose();
    own.render();
    assert.equal(popup(own), undefined);
    image(own).props.onContextMenu(mouseEvent(2, 5, 6));
    own.render();
    assert.equal(popup(own).props.initialHighlight, undefined, 'a pointer opening keeps the hover-driven highlight');
    assert.deepEqual(popup(own).props.point, { x: 5, y: 6 });
  } finally {
    await server.close();
  }
});
