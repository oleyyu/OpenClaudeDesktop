// A controlled, layout-free DOM for mounting the split view separators and the tile layout host with react-dom/client
// (R3-toolcards TT-12 / TT-14). No browser, no painting: geometry comes from `rect(element)`, React handlers are called
// with synthetic-shaped events, document listeners receive dispatched plain events. Shaped after the environment in
// tests/sidebar-resize-current.test.mjs.
import React, { act } from 'react';
import { createRoot } from 'react-dom/client';

export function createEnvironment({ dir = 'ltr', rect = () => null, styleOf = () => ({}) } = {}) {
  const events = {
    addEventListener(type, fn, options) {
      const capture = typeof options === 'boolean' ? options : !!options?.capture, signal = typeof options === 'object' ? options?.signal : undefined;
      if (signal?.aborted) return;
      const map = (this.__listeners ??= new Map()), list = map.get(type) ?? map.set(type, []).get(type);
      if (list.some(l => l.fn === fn && l.capture === capture)) return;
      list.push({ fn, capture, once: typeof options === 'object' && !!options?.once });
      signal?.addEventListener('abort', () => this.removeEventListener(type, fn, { capture }), { once: true });
    },
    removeEventListener(type, fn, options) {
      const capture = typeof options === 'boolean' ? options : !!options?.capture, list = this.__listeners?.get(type);
      const i = list?.findIndex(l => l.fn === fn && l.capture === capture) ?? -1;
      if (i >= 0) list.splice(i, 1);
    },
    dispatchEvent(event) {
      const list = this.__listeners?.get(event.type) ?? [];
      for (const entry of [...list.filter(l => l.capture), ...list.filter(l => !l.capture)]) {
        if (event.immediateStopped) break;
        if (!list.includes(entry)) continue;
        if (entry.once) list.splice(list.indexOf(entry), 1);
        entry.fn.call(this, event);
      }
      return !event.defaultPrevented;
    },
    listenerCount(type) { return this.__listeners?.get(type)?.length ?? 0; },
  };
  const document = Object.assign(Object.create(events), { nodeType: 9, nodeName: '#document', activeElement: null });
  const style = () => {
    const values = new Map();
    return { cursor: '', userSelect: '', setProperty(k, v) { values.set(k, String(v)); }, getPropertyValue(k) { return values.get(k) ?? ''; }, removeProperty(k) { values.delete(k); } };
  };
  const simple = /^(\.[\w-]+)+$/;
  const zero = { left: 0, top: 0, right: 0, bottom: 0, width: 0, height: 0 };
  class Element {
    constructor(tag) { Object.assign(this, { tagName: tag.toUpperCase(), nodeName: tag.toUpperCase(), localName: tag, nodeType: 1, namespaceURI: 'http://www.w3.org/1999/xhtml', ownerDocument: document, childNodes: [], parentNode: null, attributes: new Map() }); this.style = style(); }
    get parentElement() { return this.parentNode?.nodeType === 1 ? this.parentNode : null; }
    get firstChild() { return this.childNodes[0] ?? null; }
    get nextSibling() { const s = this.parentNode?.childNodes; return s ? s[s.indexOf(this) + 1] ?? null : null; }
    get isConnected() { for (let x = this; x; x = x.parentNode) if (x === document) return true; return false; }
    get className() { return this.getAttribute('class') ?? ''; }
    set className(value) { this.setAttribute('class', value); }
    set textContent(_value) { this.childNodes = []; }
    get clientWidth() { return this.getBoundingClientRect().width; }
    get clientHeight() { return this.getBoundingClientRect().height; }
    setAttribute(k, v) { this.attributes.set(k, String(v)); }
    getAttribute(k) { return this.attributes.has(k) ? this.attributes.get(k) : null; }
    hasAttribute(k) { return this.attributes.has(k); }
    removeAttribute(k) { this.attributes.delete(k); }
    toggleAttribute(k, force) { const on = force ?? !this.attributes.has(k); on ? this.attributes.set(k, '') : this.attributes.delete(k); return on; }
    appendChild(child) { child.parentNode?.removeChild(child); this.childNodes.push(child); child.parentNode = this; return child; }
    insertBefore(child, ref) { child.parentNode?.removeChild(child); const i = ref ? this.childNodes.indexOf(ref) : -1; if (i < 0) this.childNodes.push(child); else this.childNodes.splice(i, 0, child); child.parentNode = this; return child; }
    removeChild(child) { const i = this.childNodes.indexOf(child); if (i >= 0) this.childNodes.splice(i, 1); child.parentNode = null; return child; }
    remove() { this.parentNode?.removeChild(this); }
    contains(node) { for (let x = node; x; x = x.parentNode) if (x === this) return true; return false; }
    matches(selector) { if (!simple.test(selector)) return false; const own = this.className.split(/\s+/); return selector.slice(1).split('.').every(c => own.includes(c)); }
    closest(selector) { for (let x = this; x?.nodeType === 1; x = x.parentNode) if (x.matches(selector)) return x; return null; }
    querySelector(selector) { return this.querySelectorAll(selector)[0] ?? null; }
    querySelectorAll(selector) { const out = [], walk = n => n.childNodes?.forEach(c => { if (c.nodeType === 1) { if (c.matches(selector)) out.push(c); walk(c); } }); walk(this); return out; }
    focus() { document.activeElement = this; }
    getBoundingClientRect() { const box = rect(this); return box ? { ...zero, right: box.width ?? 0, bottom: box.height ?? 0, ...box } : zero; }
  }
  Object.assign(Element.prototype, events);
  Object.assign(document, { createElement: tag => new Element(tag), createTextNode: text => ({ nodeType: 3, nodeName: '#text', textContent: text, ownerDocument: document, parentNode: null }) });
  document.documentElement = new Element('html');
  document.documentElement.parentNode = document;
  document.documentElement.dir = dir;
  document.body = document.documentElement.appendChild(new Element('body'));
  const observers = [];
  const window = Object.assign(Object.create(events), {
    document, innerWidth: 1600, innerHeight: 1000, HTMLIFrameElement: class {},
    matchMedia: query => ({ media: query, matches: false, addEventListener() {}, removeEventListener() {} }),
    getComputedStyle: element => ({ getPropertyValue: name => element.style.getPropertyValue(name), ...styleOf(element) }),
    ResizeObserver: class { constructor(callback) { this.callback = callback; observers.push(this); } observe() {} unobserve() {} disconnect() {} },
  });
  document.defaultView = window;
  document.hasFocus = () => true;
  const container = document.body.appendChild(new Element('div'));
  return { window, document, container, observers, Element };
}

const flush = () => new Promise(resolve => setImmediate(resolve));
export async function withEnvironment(options, run) {
  const env = createEnvironment(options);
  const names = ['window', 'document', 'getComputedStyle', 'ResizeObserver'];
  const saved = names.map(name => [name, Object.getOwnPropertyDescriptor(globalThis, name)]);
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  const values = { window: env.window, document: env.document, getComputedStyle: env.window.getComputedStyle, ResizeObserver: env.window.ResizeObserver };
  for (const name of names) Object.defineProperty(globalThis, name, { value: values[name], configurable: true, writable: true });
  try { return await run(env); }
  finally { for (const [name, descriptor] of saved) descriptor ? Object.defineProperty(globalThis, name, descriptor) : delete globalThis[name]; }
}

export async function mount(env, element) {
  const root = createRoot(env.container);
  const api = {
    render: async next => { await act(async () => { root.render(next); await flush(); }); },
    unmount: async () => { await act(async () => { root.unmount(); await flush(); }); },
    run: async fn => { await act(async () => { fn(); await flush(); }); },
  };
  await api.render(element);
  return api;
}

export const reactProps = node => node[Object.keys(node).find(k => k.startsWith('__reactProps$'))];
export function find(node, match) {
  if (match(node)) return node;
  for (const child of node.childNodes ?? []) { const hit = find(child, match); if (hit) return hit; }
  return null;
}
export const event = (type, fields = {}) => ({
  type, defaultPrevented: false, isComposing: false, repeat: false, metaKey: false, ctrlKey: false, altKey: false, shiftKey: false,
  preventDefault() { this.defaultPrevented = true; }, stopPropagation() {}, stopImmediatePropagation() { this.immediateStopped = true; }, ...fields,
});
export { React };
