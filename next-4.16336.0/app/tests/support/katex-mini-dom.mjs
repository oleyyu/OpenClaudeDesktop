// A minimal, test-only DOM for SSR tests that run the 3.6556.2 rehype-katex slice (src/generated/chat-renderer
// ca129fbf3): it turns KaTeX's own HTML (renderToString) back into nodes through `new DOMParser()` / `<template>`
// (hast-util-from-dom reads nodeType, namespaceURI, tagName, getAttributeNames / getAttribute, childNodes, nodeValue,
// content). KaTeX output is well-formed markup without scripts or comments; nothing else is parsed here.
const NS = { html: 'http://www.w3.org/1999/xhtml', svg: 'http://www.w3.org/2000/svg', mathml: 'http://www.w3.org/1998/Math/MathML' };
const VOID = new Set(['br', 'img', 'hr', 'input', 'meta', 'link', 'col', 'wbr', 'source', 'area', 'base', 'embed', 'track']);
const decode = (text) => text.replace(/&(#x[0-9a-f]+|#\d+|amp|lt|gt|quot|apos|nbsp);/gi, (match, name) => {
  if (name[0] === '#') return String.fromCodePoint(name[1] === 'x' || name[1] === 'X' ? parseInt(name.slice(2), 16) : parseInt(name.slice(1), 10));
  return { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ' }[name.toLowerCase()] ?? match;
});

class Text { constructor(value) { this.nodeType = 3; this.nodeValue = value; this.childNodes = []; } }
class Element {
  constructor(name, namespaceURI) {
    this.nodeType = 1; this.namespaceURI = namespaceURI; this.localName = name;
    this.tagName = namespaceURI === NS.html ? name.toUpperCase() : name;
    this.nodeName = this.tagName; this.attributes = new Map(); this.childNodes = [];
  }
  getAttributeNames() { return [...this.attributes.keys()]; }
  getAttribute(name) { return this.attributes.has(name) ? this.attributes.get(name) : null; }
  setAttribute(name, value) { this.attributes.set(name, String(value)); }
}
class Fragment {
  constructor() { this.nodeType = 11; this.childNodes = []; }
}

export function parseHtml(html, root = new Fragment()) {
  const stack = [root];
  const tokens = /<\/([A-Za-z][\w:-]*)\s*>|<([A-Za-z][\w:-]*)((?:\s+[^\s=/>]+(?:\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+))?)*)\s*(\/?)>|([^<]+)/g;
  for (const [, close, open, attrs, selfClose, text] of html.matchAll(tokens)) {
    const parent = stack.at(-1);
    if (text !== undefined) { parent.childNodes.push(new Text(decode(text))); continue; }
    if (close !== undefined) { if (stack.length > 1) stack.pop(); continue; }
    const name = open;
    const space = name === 'svg' ? NS.svg : name === 'math' ? NS.mathml : parent.namespaceURI ?? NS.html;
    const element = new Element(name, space);
    for (const [, key, , dq, sq, bare] of attrs.matchAll(/([^\s=/>]+)(\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+)))?/g))
      element.setAttribute(key, decode(dq ?? sq ?? bare ?? ''));
    parent.childNodes.push(element);
    if (!selfClose && !(space === NS.html && VOID.has(name))) stack.push(element);
  }
  return root;
}

class Template extends Element {
  constructor() { super('template', NS.html); this.content = new Fragment(); }
  set innerHTML(html) { this.content = parseHtml(html); }
}

// Installs DOMParser and a document whose createElement("template") parses; returns a function restoring the globals.
export function installKatexMiniDom() {
  const before = { DOMParser: globalThis.DOMParser };
  globalThis.DOMParser = class DOMParser {
    parseFromString(html) { const doc = { nodeType: 9, childNodes: [] }; parseHtml(html, doc); return doc; }
  };
  const document = globalThis.document;
  const createElement = document?.createElement;
  if (document) document.createElement = (name, ...rest) => (name === 'template' ? new Template() : createElement?.call(document, name, ...rest));
  return () => {
    if (before.DOMParser === undefined) delete globalThis.DOMParser; else globalThis.DOMParser = before.DOMParser;
    if (document) document.createElement = createElement;
  };
}
