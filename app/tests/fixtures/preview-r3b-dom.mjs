// R3b-preview step 2: a small fake DOM, enough for React to mount the Preview pane (src/source-preview-pane.jsx) and its
// tab strip, with a selector engine for the pane's own queries (descendant / child combinators; tag, .class, #id,
// [attr], [attr="v"], [attr^="v"], :not(...)). Events are driven by hand through React's props; nothing renders to a
// screen, no network, no processes.

function splitTop(text, separator) {
  const parts = [];
  let depth = 0, quote = null, start = 0;
  for (let index = 0; index < text.length; index++) {
    const char = text[index];
    if (quote) { if (char === quote) quote = null; continue; }
    if (char === '"' || char === "'") quote = char;
    else if (char === '[' || char === '(') depth++;
    else if (char === ']' || char === ')') depth--;
    else if (depth === 0 && separator.test(char)) { parts.push(text.slice(start, index)); start = index + 1; }
  }
  parts.push(text.slice(start));
  return parts.map(part => part.trim()).filter(Boolean);
}

function parseCompound(text) {
  const parts = [];
  let index = 0;
  const ident = () => { const match = /^[\w-]+/.exec(text.slice(index)); if (!match) throw new Error(`selector: ${text}`); index += match[0].length; return match[0]; };
  if (text[0] === '*') index = 1;
  else if (/[\w]/.test(text[0] ?? '')) parts.push({ kind: 'tag', name: ident().toLowerCase() });
  while (index < text.length) {
    const char = text[index];
    if (char === '.') { index++; parts.push({ kind: 'class', name: ident() }); }
    else if (char === '#') { index++; parts.push({ kind: 'id', name: ident() }); }
    else if (char === '[') {
      const end = text.indexOf(']', index);
      const body = text.slice(index + 1, end);
      index = end + 1;
      const match = /^([\w-]+)\s*(?:([\^*$~|]?=)\s*(?:"([^"]*)"|'([^']*)'|([^\]\s]*)))?$/.exec(body.trim());
      if (!match) throw new Error(`selector: [${body}]`);
      parts.push({ kind: 'attr', name: match[1], op: match[2] ?? null, value: match[3] ?? match[4] ?? match[5] ?? null });
    } else if (char === ':') {
      index++;
      const name = ident();
      if (text[index] === '(') {
        let depth = 0, end = index;
        for (; end < text.length; end++) { if (text[end] === '(') depth++; else if (text[end] === ')' && --depth === 0) break; }
        const inner = text.slice(index + 1, end);
        index = end + 1;
        parts.push({ kind: 'pseudo', name, list: name === 'not' ? parseList(inner) : null });
      } else parts.push({ kind: 'pseudo', name, list: null });
    } else throw new Error(`selector: ${text}`);
  }
  return parts;
}

function parseComplex(text) {
  const tokens = [];
  let current = '', depth = 0, quote = null;
  const flush = () => { if (current.trim()) tokens.push(current.trim()); current = ''; };
  for (const char of text) {
    if (quote) { current += char; if (char === quote) quote = null; continue; }
    if (char === '"' || char === "'") { quote = char; current += char; continue; }
    if (char === '[' || char === '(') depth++;
    if (char === ']' || char === ')') depth--;
    if (depth === 0 && (char === ' ' || char === '>')) { flush(); if (char === '>') tokens.push('>'); continue; }
    current += char;
  }
  flush();
  const steps = [];
  let combinator = ' ';
  for (const token of tokens) {
    if (token === '>') { combinator = '>'; continue; }
    steps.push({ combinator, compound: parseCompound(token) });
    combinator = ' ';
  }
  return steps;
}

const cache = new Map();
function parseList(text) {
  if (!cache.has(text)) cache.set(text, splitTop(text, /,/).map(parseComplex));
  return cache.get(text);
}

function memoryStorage() {
  const values = new Map();
  return { getItem: key => (values.has(key) ? values.get(key) : null), setItem: (key, value) => { values.set(key, String(value)); }, removeItem: key => { values.delete(key); }, clear: () => values.clear(), key: index => [...values.keys()][index] ?? null, get length() { return values.size; } };
}

export function createPreviewDom() {
  const events = {
    addEventListener(type, fn, options) { (this.__l ??= new Map()).set(type, [...(this.__l.get(type) ?? []), { fn, capture: options === true || !!options?.capture }]); },
    removeEventListener(type, fn) { const list = this.__l?.get(type); if (list) this.__l.set(type, list.filter(entry => entry.fn !== fn)); },
    dispatchEvent(event) { for (const entry of [...(this.__l?.get(event.type) ?? [])]) entry.fn.call(this, event); return !event.defaultPrevented; },
    listeners(type) { return (this.__l?.get(type) ?? []).length; },
  };
  const document = Object.assign(Object.create(events), { nodeType: 9, nodeName: '#document', hidden: false, activeElement: null, visibilityState: 'visible' });
  const style = () => {
    const values = new Map();
    return new Proxy({ setProperty(name, value) { values.set(name, String(value)); }, removeProperty(name) { values.delete(name); },
      getPropertyValue(name) { return values.get(name) ?? ''; } }, {
      get(target, key) { return key in target ? target[key] : values.get(key) ?? ''; },
      set(target, key, value) { if (value === '' || value == null) values.delete(key); else values.set(key, String(value)); return true; },
    });
  };
  const matchCompound = (node, compound) => compound.every((part) => {
    switch (part.kind) {
      case 'tag': return node.localName === part.name;
      case 'class': return (node.getAttribute('class') ?? '').split(/\s+/).includes(part.name);
      case 'id': return node.getAttribute('id') === part.name;
      case 'attr': {
        const value = node.getAttribute(part.name);
        if (value === null) return false;
        if (!part.op) return true;
        if (part.op === '=') return value === part.value;
        if (part.op === '^=') return value.startsWith(part.value);
        if (part.op === '*=') return value.includes(part.value);
        if (part.op === '$=') return value.endsWith(part.value);
        if (part.op === '~=') return value.split(/\s+/).includes(part.value);
        return false;
      }
      case 'pseudo':
        if (part.name === 'not') return !part.list.some(steps => matchSteps(node, steps));
        if (part.name === 'focus') return document.activeElement === node;
        return false; // :focus-visible, :hover … never match here
      default: return false;
    }
  });
  function matchSteps(node, steps, index = steps.length - 1) {
    if (!matchCompound(node, steps[index].compound)) return false;
    if (index === 0) return true;
    const { combinator } = steps[index];
    for (let at = node.parentElement; at; at = at.parentElement) {
      if (matchSteps(at, steps, index - 1)) return true;
      if (combinator === '>') return false;
    }
    return false;
  }
  const walk = (root, visit) => { for (const child of root.childNodes) if (child.nodeType === 1) { if (visit(child) === false) return false; if (walk(child, visit) === false) return false; } return true; };
  const query = (root, selector, first) => {
    const list = parseList(selector), found = [];
    walk(root, (node) => { if (list.some(steps => matchSteps(node, steps))) { found.push(node); if (first) return false; } return true; });
    return first ? found[0] ?? null : found;
  };
  class Node {
    get parentElement() { return this.parentNode?.nodeType === 1 ? this.parentNode : null; }
    get nextSibling() { const siblings = this.parentNode?.childNodes; return siblings ? siblings[siblings.indexOf(this) + 1] ?? null : null; }
    get previousSibling() { const siblings = this.parentNode?.childNodes; return siblings ? siblings[siblings.indexOf(this) - 1] ?? null : null; }
    get isConnected() { for (let at = this; at; at = at.parentNode) if (at === document) return true; return false; }
    remove() { this.parentNode?.removeChild(this); }
  }
  class Text extends Node {
    constructor(text) { super(); Object.assign(this, { nodeType: 3, nodeName: '#text', data: String(text), ownerDocument: document, parentNode: null, childNodes: [] }); }
    get nodeValue() { return this.data; }
    set nodeValue(value) { this.data = String(value); }
    get textContent() { return this.data; }
    set textContent(value) { this.data = String(value); }
  }
  class Element extends Node {
    constructor(tag, namespaceURI = 'http://www.w3.org/1999/xhtml') {
      super();
      Object.assign(this, { tagName: tag.toUpperCase(), nodeName: tag.toUpperCase(), localName: tag.toLowerCase(), nodeType: 1, namespaceURI,
        ownerDocument: document, childNodes: [], parentNode: null, attributes: new Map(), scrollLeft: 0, scrollTop: 0 });
      this.style = style();
    }
    get firstChild() { return this.childNodes[0] ?? null; }
    get lastChild() { return this.childNodes.at(-1) ?? null; }
    get children() { return this.childNodes.filter(node => node.nodeType === 1); }
    get textContent() { return this.childNodes.map(node => node.textContent ?? '').join(''); }
    set textContent(value) { for (const child of this.childNodes) child.parentNode = null; this.childNodes = value ? [new Text(value)] : []; for (const child of this.childNodes) child.parentNode = this; }
    set innerHTML(value) { this.textContent = ''; this.__html = String(value); }
    get innerHTML() { return this.__html ?? ''; }
    get className() { return this.getAttribute('class') ?? ''; }
    set className(value) { this.setAttribute('class', value); }
    get id() { return this.getAttribute('id') ?? ''; }
    set id(value) { this.setAttribute('id', value); }
    get tabIndex() { const value = this.getAttribute('tabindex'); return value === null ? (['button', 'input', 'textarea', 'select', 'a'].includes(this.localName) ? 0 : -1) : Number(value); }
    set tabIndex(value) { this.setAttribute('tabindex', String(value)); }
    get disabled() { return this.hasAttribute('disabled'); }
    set disabled(value) { if (value) this.setAttribute('disabled', ''); else this.removeAttribute('disabled'); }
    get hidden() { return this.hasAttribute('hidden'); }
    set hidden(value) { if (value) this.setAttribute('hidden', ''); else this.removeAttribute('hidden'); }
    get dataset() {
      const node = this;
      return new Proxy({}, { get: (_target, key) => node.getAttribute(`data-${String(key).replace(/[A-Z]/g, c => `-${c.toLowerCase()}`)}`) ?? undefined });
    }
    setAttribute(name, value) { this.attributes.set(String(name).toLowerCase() === 'tabindex' ? 'tabindex' : String(name), String(value)); }
    setAttributeNS(_ns, name, value) { this.setAttribute(name, value); }
    getAttribute(name) { const key = String(name).toLowerCase() === 'tabindex' ? 'tabindex' : String(name); return this.attributes.has(key) ? this.attributes.get(key) : null; }
    hasAttribute(name) { return this.getAttribute(name) !== null; }
    removeAttribute(name) { this.attributes.delete(String(name).toLowerCase() === 'tabindex' ? 'tabindex' : String(name)); }
    removeAttributeNS(_ns, name) { this.removeAttribute(name); }
    toggleAttribute(name, force) { const on = force ?? !this.hasAttribute(name); if (on) this.setAttribute(name, ''); else this.removeAttribute(name); return on; }
    appendChild(child) { child.parentNode?.removeChild(child); this.childNodes.push(child); child.parentNode = this; return child; }
    append(...nodes) { for (const node of nodes) this.appendChild(typeof node === 'string' ? new Text(node) : node); }
    insertBefore(child, ref) { child.parentNode?.removeChild(child); const index = ref ? this.childNodes.indexOf(ref) : -1; if (index < 0) this.childNodes.push(child); else this.childNodes.splice(index, 0, child); child.parentNode = this; return child; }
    removeChild(child) {
      const index = this.childNodes.indexOf(child);
      if (index >= 0) this.childNodes.splice(index, 1);
      child.parentNode = null;
      // A removed focused node (or one holding focus) leaves focus on the body, as browsers do.
      if (document.activeElement && child.contains?.(document.activeElement)) document.activeElement = document.body;
      return child;
    }
    contains(node) { for (let at = node; at; at = at.parentNode) if (at === this) return true; return false; }
    matches(selector) { return parseList(selector).some(steps => matchSteps(this, steps)); }
    closest(selector) { for (let at = this; at?.nodeType === 1; at = at.parentNode) if (at.matches(selector)) return at; return null; }
    querySelector(selector) { return query(this, selector, true); }
    querySelectorAll(selector) { return query(this, selector, false); }
    focus() { if (!this.isConnected || this.disabled) return; document.activeElement = this; }
    blur() { if (document.activeElement === this) document.activeElement = document.body; }
    select() {}
    setSelectionRange() {}
    scrollIntoView() {}
    getClientRects() { return []; }
    getBoundingClientRect() { return { x: 0, y: 0, top: 0, bottom: 0, left: 0, right: 0, width: 0, height: 0 }; }
    get offsetLeft() { return 0; }
    get offsetTop() { return 0; }
    get offsetWidth() { return 0; }
    get offsetHeight() { return 0; }
    get clientWidth() { return 0; }
    get clientHeight() { return 0; }
    get scrollWidth() { return 0; }
    get scrollHeight() { return 0; }
    get clientLeft() { return 0; }
    get clientTop() { return 0; }
    getRootNode() { let at = this; while (at.parentNode) at = at.parentNode; return at; }
    find(predicate) { if (predicate(this)) return this; for (const child of this.children) { const hit = child.find(predicate); if (hit) return hit; } return null; }
  }
  Object.assign(Element.prototype, events);
  Object.assign(document, {
    createElement: tag => new Element(tag),
    createElementNS: (ns, tag) => new Element(tag, ns),
    createTextNode: text => new Text(text),
    createComment: text => Object.assign(new Text(text), { nodeType: 8, nodeName: '#comment' }),
    querySelector: selector => query(document, selector, true),
    querySelectorAll: selector => query(document, selector, false),
    elementFromPoint: () => null,
    getSelection: () => ({ toString: () => '', rangeCount: 0, removeAllRanges() {} }),
    hasFocus: () => true,
    childNodes: [],
    contains(node) { for (let at = node; at; at = at.parentNode) if (at === document) return true; return false; },
  });
  document.documentElement = new Element('html');
  document.documentElement.parentNode = document;
  document.childNodes.push(document.documentElement);
  document.head = document.documentElement.appendChild(new Element('head'));
  document.body = document.documentElement.appendChild(new Element('body'));
  document.activeElement = document.body;
  const observers = { resize: [], mutation: [] };
  class ResizeObserver { constructor(callback) { this.callback = callback; observers.resize.push(this); } observe() {} unobserve() {} disconnect() {} }
  class MutationObserver { constructor(callback) { this.callback = callback; observers.mutation.push(this); } observe() {} disconnect() {} takeRecords() { return []; } }
  const frames = new Map();
  let nextFrame = 0;
  const window = Object.assign(Object.create(events), {
    document, innerWidth: 1200, innerHeight: 800, devicePixelRatio: 2, ResizeObserver, MutationObserver,
    HTMLIFrameElement: class {}, HTMLElement: Element, Element, Node, Text,
    getComputedStyle: () => ({ direction: 'ltr', getPropertyValue: () => '', fontSize: '16px', overflowX: 'visible', overflowY: 'visible' }),
    matchMedia: query => ({ media: query, matches: false, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {} }),
    // Frames run on setImmediate, so a test that mocks setTimeout still gets them.
    requestAnimationFrame: fn => { const id = ++nextFrame; frames.set(id, setImmediate(() => { frames.delete(id); fn(Date.now()); })); return id; },
    cancelAnimationFrame: id => { clearImmediate(frames.get(id)); frames.delete(id); },
    localStorage: memoryStorage(),
    getSelection: () => document.getSelection(),
  });
  document.defaultView = window;
  return { window, document, Element, Text, observers };
}

const GLOBALS = ['localStorage', 'window', 'document', 'ResizeObserver', 'MutationObserver', 'requestAnimationFrame', 'cancelAnimationFrame', 'getComputedStyle', 'CSS', 'HTMLElement', 'Element', 'Node'];

/** Runs `body(dom)` with the fake DOM installed as the globals React and the pane read, then restores them. */
export async function withPreviewDom(body) {
  const dom = createPreviewDom();
  const saved = GLOBALS.map(name => [name, Object.getOwnPropertyDescriptor(globalThis, name)]);
  const values = {
    localStorage: dom.window.localStorage, window: dom.window, document: dom.document, ResizeObserver: dom.window.ResizeObserver, MutationObserver: dom.window.MutationObserver,
    requestAnimationFrame: dom.window.requestAnimationFrame, cancelAnimationFrame: dom.window.cancelAnimationFrame, getComputedStyle: dom.window.getComputedStyle,
    CSS: { escape: value => String(value).replace(/["\\]/g, '\\$&') }, HTMLElement: dom.Element, Element: dom.Element, Node: dom.Element,
  };
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  for (const name of GLOBALS) Object.defineProperty(globalThis, name, { value: values[name], configurable: true, writable: true });
  try { return await body(dom); }
  finally { for (const [name, descriptor] of saved) descriptor ? Object.defineProperty(globalThis, name, descriptor) : delete globalThis[name]; }
}

/** React's props on a mounted host node (the same handlers a real event would reach). */
export function reactProps(node) {
  const key = Object.keys(node).find(name => name.startsWith('__reactProps$'));
  return key ? node[key] : {};
}

/** A desktop bridge stub: answers `call` from `handlers[action]` and records every call; `push` delivers an event. */
export function createDesktop(handlers = {}) {
  const calls = [], listeners = new Set();
  return {
    calls,
    count: action => calls.filter(entry => entry.action === action).length,
    last: action => calls.filter(entry => entry.action === action).at(-1)?.params,
    call(action, params = {}) {
      calls.push({ action, params });
      const handler = handlers[action];
      if (!handler) return new Promise(() => {}); // unanswered requests stay pending, as a slow main would
      try { return Promise.resolve(handler(params)); } catch (error) { return Promise.reject(error); }
    },
    onEvent(listener) { listeners.add(listener); return () => listeners.delete(listener); },
    push(event) { for (const listener of [...listeners]) listener(event); },
  };
}
