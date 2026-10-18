// R3b-tasks step 2, tasks-12 (2.42304.0): the Plan comment popover and a held Escape.
//  Official: cccc2cf0a Ko = c96d752d0 Cat (2.37337.1 cd5a31703 Wlt) renders c82eca2bd Se (export M) with variant
//  "floating". Se's Escape branch calls pZ(up(field)) (shared-19 ya / shared-25 Ff), but Cat's document capture keydown
//  claims every Escape typed in the card first (preventDefault + stopPropagation + dismiss), so React never dispatches
//  that key to Se and pZ is not reached; the plan pane passes no restoreFocus, so Cat's Enter-repeat guard (xat) is off
//  too. The composer's window Escape handler (c227f4d5e) does not look at `repeat`. Net: holding Esc closes the comment
//  and its auto-repeats fall through — the audit's "swallows the held Escape" is corrected.
//  Local: planPopoverDocumentKeyDown (Cat t) and planCommentFieldKeyDown (Se, with the generated pZ/up) are exported;
//  a controlled mount of the real popover shows the same order and outcome.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import React, { act } from 'react';
import { createServer } from 'vite';
import react from '@vitejs/plugin-react';

const app = path.resolve(import.meta.dirname, '..');
const v1 = path.resolve(app, '../reference/installed-2.42304.0-20261017/ion-dist/assets/v1');
const official = name => fs.readFileSync(path.join(v1, name), 'utf8');
const count = (text, needle) => text.split(needle).length - 1;

let server, Plan;
test.before(async () => {
  server = await createServer({ configFile: false, root: app, plugins: [react()],
    server: { middlewareMode: true, hmr: false, watch: null }, appType: 'custom', logLevel: 'error' });
  (await server.ssrLoadModule('/electron/i18n/index.mjs')).setLocale('en-US');
  Plan = await server.ssrLoadModule('/src/source-plan-pane.jsx');
});
test.after(() => server?.close());

test('tasks-12 official: the Plan popover (Ko = Cat) claims Escape in a document capture listener before Se and its pZ', () => {
  const pane = official('cccc2cf0a-B0D--VZp.js');
  // The Plan comment layer renders Ko (c96d752d0 export p = Cat) and passes no restoreFocus.
  for (const text of ['p as Ko', 'inputLabel:r.formatMessage({defaultMessage:"Plan comment",id:"jSxzRTbh1Z"}),onSubmit:k,onChange:v,onDelete:j,onDismiss:x,boundaryRef:o}'])
    assert.equal(count(pane, text), 1, text);
  assert.equal(count(pane, 'restoreFocus'), 0);
  const popover = official('c96d752d0-BOCqU7c2.js');
  for (const text of ['Cat as p', 'var Cat=M(function({range:e,selectedText:t,initialValue:n', 'import{M as wxe}from"./c82eca2bd-1Y6mm3wZ.js"',
    // t: a key inside the card; Escape → preventDefault, stopPropagation, dismiss — registered on the document, capture.
    'e.key==="Escape"&&(e.preventDefault(),e.stopPropagation(),ve("escape"))', 'n.addEventListener("keydown",t,!0)',
    'onCancel:()=>ve("escape")', 'restoreFocus:E=!1', '_e.current&&(xat(t),ye())'])
    assert.equal(count(popover, text), 1, text);
  const editor = official('c82eca2bd-1Y6mm3wZ.js');
  for (const text of ['Se as M', '!S){let t=f(e.currentTarget);t&&te(t)}ue()', 'import{ya as te}from"./shared-19-CkPOiIKm.js"'])
    assert.equal(count(editor, text), 1, text);
  const keys = official('shared-19-CkPOiIKm.js');
  for (const text of ['function pZ(e){dZ("Escape",e)}', 'pZ as ya']) assert.equal(count(keys, text), 1, text);
  // The composer's window Escape (stop the turn): defaultPrevented, an approval card's claim (shared-156 BV), composing —
  // no `repeat` check.
  const composer = official('c227f4d5e-Ba-r--Rl.js');
  assert.equal(count(composer, 'e.key==="Escape"&&(e.defaultPrevented||mn(e)||e.isComposing||e.keyCode===229||!Ft()'), 1);
  assert.equal(count(composer, 'fr as mn'), 1);
  const shared156 = official('shared-156-Bikz018e.js');
  for (const text of ['BV as fr', 'function BV(e){return NV.has(e)}', 'e.key==="Escape"&&NV.add(e)']) assert.equal(count(shared156, text), 1, text);
  // The local popover reuses the generated pZ and up, not hand-written copies.
  const local = fs.readFileSync(path.join(app, 'src/source-plan-pane.jsx'), 'utf8');
  assert.match(local, /import \{ suppressEscapeRepeat \} from "\.\/generated\/code-editor-current\/keyboard-repeat\.mjs";/);
  assert.match(local, /import \{ ownerWindow \} from "\.\/generated\/files-changes\/owner-window\.mjs";/);
  assert.match(local, /const keys = \(event\) => planPopoverDocumentKeyDown\(event, \{ card: card\.current, dismiss: onDismiss \}\);/);
  assert.match(local, /const keyDown = \(event\) => planCommentFieldKeyDown\(event, \{ save, cancel: onDismiss \}\);/);
  assert.match(fs.readFileSync(path.join(app, 'src/generated/code-editor-current/keyboard-repeat.mjs'), 'utf8'), /function pZ\(e\) \{\n  dZ\("Escape", e\);\n\}/);
});

const keyEvent = (init) => {
  const event = { defaultPrevented: false, stopped: false, isComposing: false, keyCode: 0, repeat: false, shiftKey: false, altKey: false, ...init,
    preventDefault() { event.defaultPrevented = true; }, stopPropagation() { event.stopped = true; } };
  return event;
};

test('tasks-12 local: the document handler is Cat t — Escape in the card closes it, a composing Escape only stays in', () => {
  const field = { id: 'field' }, outside = { id: 'outside' };
  const card = { contains: node => node === field, querySelectorAll: () => [] };
  let dismissed = 0;
  const dismiss = () => { dismissed += 1; };
  const escape = keyEvent({ key: 'Escape', target: field });
  Plan.planPopoverDocumentKeyDown(escape, { card, dismiss });
  assert.deepEqual([escape.defaultPrevented, escape.stopped, dismissed], [true, true, 1]);
  const composing = keyEvent({ key: 'Escape', target: field, isComposing: true });
  Plan.planPopoverDocumentKeyDown(composing, { card, dismiss });
  assert.deepEqual([composing.defaultPrevented, composing.stopped, dismissed], [false, true, 1]);
  const elsewhere = keyEvent({ key: 'Escape', target: outside });
  Plan.planPopoverDocumentKeyDown(elsewhere, { card, dismiss });
  assert.deepEqual([elsewhere.defaultPrevented, elsewhere.stopped, dismissed], [false, false, 1]);
});

// A window with capture listeners, as pZ needs (shared-19 dZ: keydown/keyup on the window, capture).
const listenerWindow = () => {
  const listeners = [];
  return {
    listeners,
    addEventListener(type, fn, capture) { listeners.push({ type, fn, capture }); },
    removeEventListener(type, fn, capture) { const at = listeners.findIndex(entry => entry.type === type && entry.fn === fn && entry.capture === capture); if (at >= 0) listeners.splice(at, 1); },
    fire(type, init) { const event = keyEvent({ type, ...init }); for (const entry of [...listeners]) if (entry.type === type) entry.fn(event); return event; },
  };
};

test('tasks-12 local: the field branch is Se — pZ(up(field)) swallows the held Escape\'s repeats until keyup or another key', () => {
  const view = listenerWindow();
  const dialog = {};
  const field = { nodeType: 1, ownerDocument: { nodeType: 9, defaultView: view }, closest: selector => selector === '[role="dialog"], [role="alertdialog"]' ? dialog : null };
  let cancelled = 0, saved = 0;
  const handlers = { save: () => { saved += 1; }, cancel: () => { cancelled += 1; } };
  const escape = keyEvent({ key: 'Escape', currentTarget: field, nativeEvent: { isComposing: false } });
  Plan.planCommentFieldKeyDown(escape, handlers);
  assert.deepEqual([escape.defaultPrevented, escape.stopped, cancelled, saved], [true, true, 1, 0]);
  assert.deepEqual(view.listeners.map(entry => [entry.type, entry.capture]), [['keydown', true], ['keyup', true]]);
  const repeat = view.fire('keydown', { key: 'Escape', repeat: true });
  assert.deepEqual([repeat.defaultPrevented, repeat.stopped], [true, true]);
  assert.equal(view.listeners.length, 2, 'still armed after a repeat');
  view.fire('keyup', { key: 'Escape' });
  assert.equal(view.listeners.length, 0, 'keyup releases it');
  // Another key releases it too, and is left alone.
  Plan.planCommentFieldKeyDown(keyEvent({ key: 'Escape', currentTarget: field, nativeEvent: {} }), handlers);
  const other = view.fire('keydown', { key: 'a' });
  assert.deepEqual([other.defaultPrevented, other.stopped, view.listeners.length], [false, false, 0]);
  // A read-only field (Se `!S`) does not arm it; outside a dialog the key keeps propagating.
  const loose = { ...field, closest: () => null };
  const readOnly = keyEvent({ key: 'Escape', currentTarget: loose, nativeEvent: {} });
  Plan.planCommentFieldKeyDown(readOnly, { ...handlers, readOnly: true });
  assert.deepEqual([readOnly.defaultPrevented, readOnly.stopped, view.listeners.length, cancelled], [true, false, 0, 3]);
  // Enter saves once; a held Enter's repeat does not save again; composing keys are left to the IME.
  Plan.planCommentFieldKeyDown(keyEvent({ key: 'Enter', currentTarget: field, nativeEvent: {} }), handlers);
  Plan.planCommentFieldKeyDown(keyEvent({ key: 'Enter', repeat: true, currentTarget: field, nativeEvent: {} }), handlers);
  Plan.planCommentFieldKeyDown(keyEvent({ key: 'Escape', keyCode: 229, currentTarget: field, nativeEvent: { isComposing: true } }), handlers);
  assert.deepEqual([saved, cancelled, view.listeners.length], [1, 3, 0]);
});

// A small DOM with capture/bubble propagation (window → document → … → target → … → window), enough for React to mount
// the popover into a portal on <body> and to receive keys through its own root listeners.
function createDom() {
  const events = {
    addEventListener(type, fn, options) { (this.__l ??= []).push({ type, fn, capture: options === true || options?.capture === true }); },
    removeEventListener(type, fn, options) { const capture = options === true || options?.capture === true; this.__l = (this.__l ?? []).filter(entry => !(entry.type === type && entry.fn === fn && entry.capture === capture)); },
  };
  // oninput: React (imported once this DOM is global) takes it as a browser with input events, not the IE polyfill.
  const document = Object.assign(Object.create(events), { nodeType: 9, nodeName: '#document', activeElement: null, parentNode: null, oninput: null });
  const style = () => {
    const values = new Map();
    return new Proxy({ setProperty(name, value) { values.set(name, String(value)); }, removeProperty(name) { values.delete(name); },
      getPropertyValue(name) { return values.get(name) ?? ''; } }, {
      get(target, key) { return key in target ? target[key] : values.get(key) ?? ''; },
      set(target, key, value) { if (value === '' || value == null) values.delete(key); else values.set(key, String(value)); return true; },
    });
  };
  class Element {
    constructor(tag) {
      Object.assign(this, { tagName: tag.toUpperCase(), nodeName: tag.toUpperCase(), localName: tag, nodeType: 1, namespaceURI: 'http://www.w3.org/1999/xhtml',
        ownerDocument: document, childNodes: [], parentNode: null, attributes: new Map(), value: '', scrollTop: 0, scrollHeight: 0 });
      this.style = style();
    }
    get parentElement() { return this.parentNode?.nodeType === 1 ? this.parentNode : null; }
    get firstChild() { return this.childNodes[0] ?? null; }
    get nextSibling() { const siblings = this.parentNode?.childNodes; return siblings ? siblings[siblings.indexOf(this) + 1] ?? null : null; }
    get isConnected() { for (let at = this; at; at = at.parentNode) if (at === document) return true; return false; }
    set textContent(value) { this.childNodes = value ? [document.createTextNode(value)] : []; }
    get textContent() { return this.childNodes.map(node => node.textContent ?? '').join(''); }
    setAttribute(name, value) { this.attributes.set(name, String(value)); }
    getAttribute(name) { return this.attributes.has(name) ? this.attributes.get(name) : null; }
    hasAttribute(name) { return this.attributes.has(name); }
    removeAttribute(name) { this.attributes.delete(name); }
    appendChild(child) { child.parentNode?.removeChild?.(child); this.childNodes.push(child); child.parentNode = this; return child; }
    insertBefore(child, ref) { child.parentNode?.removeChild?.(child); const index = ref ? this.childNodes.indexOf(ref) : -1; if (index < 0) this.childNodes.push(child); else this.childNodes.splice(index, 0, child); child.parentNode = this; return child; }
    removeChild(child) { const index = this.childNodes.indexOf(child); if (index >= 0) this.childNodes.splice(index, 1); child.parentNode = null; return child; }
    contains(node) { for (let at = node; at; at = at.parentNode) if (at === this) return true; return false; }
    closest(selector) {
      const roles = selector === '[role="dialog"], [role="alertdialog"]' ? ['dialog', 'alertdialog'] : null;
      for (let at = this; at?.nodeType === 1; at = at.parentNode) if (roles?.includes(at.getAttribute('role'))) return at;
      return null;
    }
    find(predicate) {
      if (predicate(this)) return this;
      for (const child of this.childNodes) { const hit = child.nodeType === 1 ? child.find(predicate) : null; if (hit) return hit; }
      return null;
    }
    querySelector() { return null; }
    querySelectorAll() { return []; }
    matches() { return false; }
    focus() { document.activeElement = this; }
    blur() { if (document.activeElement === this) document.activeElement = document.body; }
    setSelectionRange() {}
    getBoundingClientRect() { return { top: 0, bottom: 40, left: 0, right: 320, width: 320, height: 40 }; }
  }
  Object.assign(Element.prototype, events);
  Object.assign(document, {
    createElement: tag => new Element(tag),
    createElementNS: (ns, tag) => Object.assign(new Element(tag), { namespaceURI: ns }),
    createTextNode: text => ({ nodeType: 3, nodeName: '#text', textContent: text, nodeValue: text, ownerDocument: document, parentNode: null }),
    querySelectorAll: () => [],
    getSelection: () => null,
  });
  document.documentElement = new Element('html');
  document.documentElement.parentNode = document;
  document.body = document.documentElement.appendChild(new Element('body'));
  class ResizeObserver { observe() {} unobserve() {} disconnect() {} }
  const window = Object.assign(Object.create(events), { document, innerWidth: 1200, innerHeight: 800, ResizeObserver,
    HTMLIFrameElement: class {}, getComputedStyle: () => ({ direction: 'ltr' }), matchMedia: () => ({ matches: false, addEventListener() {}, removeEventListener() {} }),
    requestAnimationFrame: fn => setTimeout(fn, 0), cancelAnimationFrame: id => clearTimeout(id) });
  document.defaultView = window;
  // DOM event dispatch: capture from the window down to the target's parent, both phases at the target, then bubble.
  const dispatch = (target, init) => {
    let stop = false, immediate = false;
    const event = { bubbles: true, cancelable: true, defaultPrevented: false, timeStamp: 1, isTrusted: true, ...init, target,
      preventDefault() { event.defaultPrevented = true; }, stopPropagation() { stop = true; }, stopImmediatePropagation() { stop = immediate = true; } };
    const path = [];
    for (let at = target; at; at = at.parentNode) path.push(at);
    path.push(window);
    const run = (node, phase) => {
      event.currentTarget = node; event.eventPhase = phase;
      for (const entry of [...(node.__l ?? [])]) {
        if (entry.type !== event.type || (phase === 1 && !entry.capture) || (phase === 3 && entry.capture)) continue;
        window.event = event;
        try { entry.fn.call(node, event); } finally { window.event = undefined; }
        if (immediate) break;
      }
    };
    const down = [...path].reverse();
    for (const node of down.slice(0, -1)) { run(node, 1); if (stop) return event; }
    run(target, 2); if (stop) return event;
    for (const node of path.slice(1)) { run(node, 3); if (stop) return event; }
    return event;
  };
  return { window, document, Element, dispatch };
}

test('tasks-12 mounted: Escape in the Plan comment closes it through the document listener; the held key\'s repeats fall through, as in 2.42304.0', async () => {
  const dom = createDom();
  const saved = ['window', 'document', 'ResizeObserver'].map(name => [name, Object.getOwnPropertyDescriptor(globalThis, name)]);
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  for (const [name, value] of [['window', dom.window], ['document', dom.document], ['ResizeObserver', dom.window.ResizeObserver]])
    Object.defineProperty(globalThis, name, { value, configurable: true, writable: true });
  const { createRoot } = await import('react-dom/client');
  const host = dom.document.body.appendChild(new dom.Element('div'));
  const anchor = dom.document.body.appendChild(new dom.Element('p'));
  const range = { startContainer: anchor, collapsed: false, getClientRects: () => [{ left: 100, top: 200, right: 180, bottom: 216, width: 80, height: 16 }] };
  // The composer's window listeners (source-composer.jsx: the window Escape that stops a running turn), bubble phase.
  const reached = [];
  dom.window.addEventListener('keydown', event => { if (event.key === 'Escape') reached.push({ repeat: event.repeat, defaultPrevented: event.defaultPrevented }); });
  const root = createRoot(host);
  let dismissed = 0;
  const submitted = [];
  const props = { range, selectedText: 'parser', initialValue: 'Check the parser', isEditing: false, onSubmit: text => submitted.push(text), onDismiss: () => { dismissed += 1; } };
  try {
    await act(async () => { root.render(React.createElement(Plan.PlanCommentPopover, props)); });
    const popover = dom.document.body.find(node => node.getAttribute?.('data-plan-comment-popover') === '');
    assert.ok(popover, 'the popover is portalled into <body>');
    assert.equal(popover.getAttribute('role'), 'dialog');
    const field = popover.find(node => node.tagName === 'TEXTAREA');
    assert.equal(field.getAttribute('aria-label'), 'Plan comment');
    assert.equal(dom.document.activeElement, field, 'the field has the focus');
    // The window listeners already there (the tooltips' dismissal input) stay as they are; pZ would add keydown + keyup.
    const windowListeners = () => (dom.window.__l ?? []).filter(entry => entry.capture).map(entry => entry.fn);
    const baseline = windowListeners();
    // A key the document listener leaves alone reaches the field through React (its Se Enter branch): this DOM delivers.
    await act(async () => { dom.dispatch(field, { type: 'keydown', key: 'Enter', keyCode: 13 }); });
    assert.deepEqual(submitted, ['Check the parser']);
    // The press: the document capture listener claims it, React's onKeyDown (the Se branch) never runs, so no pZ.
    let pressed;
    await act(async () => { pressed = dom.dispatch(field, { type: 'keydown', key: 'Escape', keyCode: 27 }); });
    assert.equal(dismissed, 1);
    assert.equal(pressed.defaultPrevented, true);
    assert.deepEqual(reached, [], 'the press stops at the document');
    assert.deepEqual(windowListeners(), baseline, 'no repeat suppressor on the window');
    // The parent closes it (the layer's dismiss → idle): its listeners go with it.
    await act(async () => { root.render(null); });
    assert.equal(dom.document.body.find(node => node.getAttribute?.('data-plan-comment-popover') === ''), null);
    assert.deepEqual((dom.document.__l ?? []).filter(entry => entry.type === 'keydown' && entry.capture).length, 0, 'the document listener is gone');
    // The held key's auto-repeats now reach the window, unclaimed — what 2.42304.0 does too.
    await act(async () => { dom.dispatch(dom.document.body, { type: 'keydown', key: 'Escape', keyCode: 27, repeat: true }); });
    assert.deepEqual(reached, [{ repeat: true, defaultPrevented: false }]);
    assert.equal(dismissed, 1);
  } finally {
    await act(async () => root.unmount());
    for (const [name, descriptor] of saved) if (descriptor) Object.defineProperty(globalThis, name, descriptor); else delete globalThis[name];
  }
});
