// R4i-transcript TR2 (D34, transcript-v01): the host-only transcript rows (the local /status row, auto-review lines, the
// turn footer, pinned chapter headings and the turn error card, main and /btw child) each sit in their own row boundary,
// so one of them throwing replaces only that row. 2.42304.0: every feed row goes through c96d752d0 u9; an API error is an
// item of the assistant entry, so its row is a reply.
import test, { before, after } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import React, { act } from "react";
import { createRoot } from "react-dom/client";
import { createServer } from "vite";
import react from "@vitejs/plugin-react";

const app = path.resolve(import.meta.dirname, "..");
const v1 = path.resolve(app, "../reference/installed-2.42304.0-20261017/ion-dist/assets/v1");
const occurrences = (text, needle) => text.split(needle).length - 1;
let server, Host, TurnError, AutoReview;
before(async () => {
  server = await createServer({ configFile: false, root: app, plugins: [react()], server: { middlewareMode: true, hmr: false, ws: false, watch: null }, appType: "custom", logLevel: "error" });
  Host = await server.ssrLoadModule("/src/source-r3b-transcript.jsx");
  TurnError = await server.ssrLoadModule("/src/source-turn-error.jsx");
  AutoReview = await server.ssrLoadModule("/src/source-auto-review.jsx");
});
after(async () => { await server?.close(); });

function createDom() {
  const events = {
    addEventListener(type, fn) { (this.__l ??= new Map()).set(type, [...(this.__l.get(type) ?? []), fn]); },
    removeEventListener(type, fn) { const list = this.__l?.get(type); if (list) this.__l.set(type, list.filter(entry => entry !== fn)); },
    dispatchEvent(event) { for (const fn of [...(this.__l?.get(event.type) ?? [])]) fn.call(this, event); return true; },
  };
  const document = Object.assign(Object.create(events), { nodeType: 9, nodeName: '#document', activeElement: null });
  const style = () => {
    const values = new Map();
    return new Proxy({ setProperty(name, value) { values.set(name, String(value)); }, removeProperty(name) { values.delete(name); },
      getPropertyValue(name) { return values.get(name) ?? ''; } }, {
      get(target, key) { return key in target ? target[key] : values.get(key) ?? ''; },
      set(target, key, value) { if (value === '' || value == null) values.delete(key); else values.set(key, String(value)); return true; },
    });
  };
  const childrenTagged = (node, tag) => node.childNodes.filter(child => child.tagName === tag);
  class Element {
    constructor(tag) {
      Object.assign(this, { tagName: tag.toUpperCase(), nodeName: tag.toUpperCase(), localName: tag, nodeType: 1, namespaceURI: 'http://www.w3.org/1999/xhtml',
        ownerDocument: document, childNodes: [], parentNode: null, attributes: new Map() });
      this.style = style();
      this.rect = { top: 0, bottom: 0, left: 0, right: 0, width: 0, height: 0 };
    }
    get parentElement() { return this.parentNode?.nodeType === 1 ? this.parentNode : null; }
    get children() { return this.childNodes.filter(node => node.nodeType === 1); }
    get firstChild() { return this.childNodes[0] ?? null; }
    get nextSibling() { const siblings = this.parentNode?.childNodes; return siblings ? siblings[siblings.indexOf(this) + 1] ?? null : null; }
    get isConnected() { for (let at = this; at; at = at.parentNode) if (at === document) return true; return false; }
    set textContent(value) { this.childNodes = value ? [document.createTextNode(value)] : []; }
    get textContent() { return this.childNodes.map(node => (node.nodeType === 3 ? node.nodeValue : node.textContent) ?? '').join(''); }
    setAttribute(name, value) { this.attributes.set(name, String(value)); }
    getAttribute(name) { return this.attributes.has(name) ? this.attributes.get(name) : null; }
    hasAttribute(name) { return this.attributes.has(name); }
    removeAttribute(name) { this.attributes.delete(name); }
    appendChild(child) { child.parentNode?.removeChild?.(child); this.childNodes.push(child); child.parentNode = this; return child; }
    insertBefore(child, ref) { child.parentNode?.removeChild?.(child); const index = ref ? this.childNodes.indexOf(ref) : -1; if (index < 0) this.childNodes.push(child); else this.childNodes.splice(index, 0, child); child.parentNode = this; return child; }
    removeChild(child) { const index = this.childNodes.indexOf(child); if (index >= 0) this.childNodes.splice(index, 1); child.parentNode = null; return child; }
    contains(node) { for (let at = node; at; at = at.parentNode) if (at === this) return true; return false; }
    // Only `[attribute]` selectors are needed here.
    closest(selector) {
      const name = /^\[([\w-]+)\]$/.exec(selector)?.[1];
      if (!name) throw Error(`fake closest: ${selector}`);
      for (let at = this; at && at.nodeType === 1; at = at.parentNode) if (at.hasAttribute(name)) return at;
      return null;
    }
    getBoundingClientRect() { return { ...this.rect }; }
    get clientWidth() { return this.rect.width; }
    get tHead() { return childrenTagged(this, 'THEAD')[0] ?? null; }
    get tBodies() { return childrenTagged(this, 'TBODY'); }
    get rows() { return childrenTagged(this, 'TR'); }
    get cells() { return this.childNodes.filter(child => child.tagName === 'TH' || child.tagName === 'TD'); }
    focus() { document.activeElement = this; }
    find(predicate) {
      if (predicate(this)) return this;
      for (const child of this.childNodes) { const hit = child.nodeType === 1 ? child.find(predicate) : null; if (hit) return hit; }
      return null;
    }
    findAll(predicate, out = []) {
      if (predicate(this)) out.push(this);
      for (const child of this.childNodes) if (child.nodeType === 1) child.findAll(predicate, out);
      return out;
    }
  }
  Object.assign(Element.prototype, events);
  Object.assign(document, {
    createElement: tag => new Element(tag),
    createElementNS: (ns, tag) => Object.assign(new Element(tag), { namespaceURI: ns }),
    createTextNode: text => ({ nodeType: 3, nodeName: '#text', textContent: text, nodeValue: text, ownerDocument: document, parentNode: null }),
    querySelectorAll: () => [],
  });
  document.documentElement = new Element('html');
  document.documentElement.parentNode = document;
  document.body = document.documentElement.appendChild(new Element('body'));
  const observers = [];
  class ResizeObserver { constructor(callback) { this.callback = callback; this.targets = []; observers.push(this); } observe(target) { this.targets.push(target); } unobserve() {} disconnect() { this.targets = []; this.disconnected = true; } }
  const frames = [];
  const window = Object.assign(Object.create(events), { document, ResizeObserver, location: { pathname: '/' }, HTMLIFrameElement: class {}, getComputedStyle: () => ({ lineHeight: '20px', direction: 'ltr' }),
    matchMedia: () => ({ matches: false, addEventListener() {}, removeEventListener() {} }),
    requestAnimationFrame: fn => frames.push(fn), cancelAnimationFrame() {} });
  document.defaultView = window;
  return { window, document, Element, observers, frames };
}
async function withDom(run) {
  const dom = createDom();
  const names = ['window', 'document', 'ResizeObserver', 'getComputedStyle'];
  const saved = names.map(name => [name, Object.getOwnPropertyDescriptor(globalThis, name)]);
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  for (const [name, value] of [['window', dom.window], ['document', dom.document], ['ResizeObserver', dom.window.ResizeObserver], ['getComputedStyle', dom.window.getComputedStyle]])
    Object.defineProperty(globalThis, name, { value, configurable: true, writable: true });
  const container = dom.document.body.appendChild(new dom.Element('div'));
  const root = createRoot(container);
  const error = console.error;
  const logged = [];
  console.error = (...args) => { logged.push(args); };
  try { return await run({ dom, container, root, logged }); }
  finally {
    act(() => root.unmount());
    console.error = error;
    for (const [name, descriptor] of saved) { if (descriptor) Object.defineProperty(globalThis, name, descriptor); else delete globalThis[name]; }
  }
}
// React's own props for a host element (a controlled event without a DOM event system).

test("TR2: the official error row is an item of the assistant entry, so u9 gives it the reply copy", () => {
  const feed = fs.readFileSync(path.join(v1, "c96d752d0-BOCqU7c2.js"), "utf8");
  assert.equal(occurrences(feed, "case\"error\":g(s,VK(n.id,u,\"error\","), 1);
  assert.equal(occurrences(feed, "function u9(e,t,n,r,i,a){return e?b(jce,{kind:t.kind===\"assistant\"||t.kind===\"assistantItem\"?\"reply\":\"row\","), 1);
  // kind overrides the item-derived copy; without it the item decides, as before.
  assert.equal(Host.rowBoundaryKind({ type: "userMessage" }), "row");
});

test("TR2: a throwing /status row, auto-review line, turn footer, chapter heading or turn error is replaced alone", async () => {
  const Throw = () => { throw Error("row exploded"); };
  const plain = (row) => React.createElement("p", { "data-row": row }, row);
  const exploding = (base, key) => new Proxy(base, { get(target, name) { if (name === key) throw Error("row exploded"); return target[name]; } });
  const user = { id: "u1", type: "userMessage", turnId: "t1" }, reply = { id: "a1", type: "agentMessage", turnId: "t1" };
  const cases = [
    // main.jsx: if(item.localCommand)return <SourceTranscriptRowBoundary key={item.id} … kind="row"><div data-local-command="status">…
    { name: "/status", sessionId: "s-tr2", item: { id: "local:status", localCommand: "status" }, kind: "row", expect: "row", row: () => React.createElement(Throw) },
    // main.jsx: the auto-review lines after their item (the item decides the copy).
    { name: "auto reviews", sessionId: "s-tr2", item: { id: "c1", type: "commandExecution", turnId: "t1" }, expect: "reply",
      row: () => React.createElement(AutoReview.SourceAutoReviews, { reviews: exploding([{ reviewId: "r1", status: "denied" }], "map") }) },
    // main.jsx: <SourceTranscriptRowBoundary … kind="reply"><SourceTurnFooter …
    { name: "turn footer", sessionId: "s-tr2", item: user, kind: "reply", expect: "reply", row: () => React.createElement(Throw) },
    // main.jsx: a pinned chapter heading over a reply row still reads as a row.
    { name: "chapter heading", sessionId: "s-tr2", item: reply, kind: "row", expect: "row", row: () => React.createElement(Throw) },
    // main.jsx and source-btw-pane.jsx: the turn error card, kind "reply" even after a user-only turn.
    { name: "main turn error", sessionId: "s-tr2", item: user, kind: "reply", expect: "reply",
      row: () => React.createElement(TurnError.SourceTurnError, { error: exploding({ message: "x" }, "message"), turnId: "t1", variant: "card" }) },
    { name: "btw child turn error", sessionId: "child-tr2", item: user, kind: "reply", expect: "reply",
      row: () => React.createElement(TurnError.SourceTurnError, { error: exploding({ message: "x" }, "codexErrorInfo"), turnId: "t1", variant: "card" }) },
  ];
  for (const c of cases) {
    await withDom(({ container, root }) => {
      act(() => root.render(React.createElement("div", { tabIndex: -1, "data-feed": "" },
        React.createElement(Host.SourceTranscriptRowBoundary, { sessionId: c.sessionId, item: { id: "above", type: "userMessage" } }, plain("above")),
        React.createElement(Host.SourceTranscriptRowBoundary, { sessionId: c.sessionId, item: c.item, kind: c.kind }, c.row()),
        React.createElement(Host.SourceTranscriptRowBoundary, { sessionId: c.sessionId, item: { id: "below", type: "agentMessage" } }, plain("below")))));
      const crashed = container.findAll(node => node.hasAttribute?.("data-transcript-row-crashed"));
      assert.equal(crashed.length, 1, c.name + ": only the failing row is replaced");
      assert.equal(crashed[0].getAttribute("data-transcript-row-crashed"), c.expect, c.name + ": the u9 kind");
      assert.ok(crashed[0].textContent.includes(c.expect === "reply" ? "This response didn’t load." : "Couldn’t load this."), c.name);
      assert.ok(container.find(node => node.getAttribute?.("data-row") === "above"), c.name + ": the row above still renders");
      assert.ok(container.find(node => node.getAttribute?.("data-row") === "below"), c.name + ": the row below still renders");
    });
  }
});

test("TR2: main.jsx and the /btw pane mount a row boundary on each host-only transcript row", () => {
  const main = fs.readFileSync(path.join(app, "src/main.jsx"), "utf8");
  assert.equal(occurrences(main, "if(item.localCommand)return <SourceTranscriptRowBoundary key={item.id} sessionId={current} item={item} kind=\"row\"><div data-local-command=\"status\">"), 1);
  assert.equal(occurrences(main, "}))}/></div></SourceTranscriptRowBoundary>;"), 1);
  assert.equal(occurrences(main, "<SourceTranscriptRowBoundary key={`chapter:${chapter.id}`} sessionId={current} item={item} kind=\"row\"><SourceChapterHeading"), 1);
  assert.equal(occurrences(main, "<SourceChapterHeading"), 1, "no transcript chapter heading outside a boundary");
  assert.equal(occurrences(main, "return reviews?.length ? <SourceTranscriptRowBoundary sessionId={current} item={item}>\n                          <SourceAutoReviews reviews={reviews}"), 1);
  assert.equal(occurrences(main, "<SourceAutoReviews "), 1);
  assert.equal(occurrences(main, "return <SourceTranscriptRowBoundary sessionId={current} item={item} kind=\"reply\"><SourceTurnFooter sessionKey={current}"), 1);
  assert.equal(occurrences(main, "<SourceTurnFooter "), 1);
  assert.equal(occurrences(main, "return <SourceTranscriptRowBoundary key={`${current}:${item.turnId}:${variant}`} sessionId={current} item={item} kind=\"reply\"><SourceTurnError "), 1);
  assert.equal(occurrences(main, ": null} /></SourceTranscriptRowBoundary>;"), 2, "the footer and the turn error close their boundaries");
  const btw = fs.readFileSync(path.join(app, "src/source-btw-pane.jsx"), "utf8");
  assert.equal(occurrences(btw, "{failure && <SourceTranscriptRowBoundary key={`${sessionId}:${item.turnId}:${variant}`} sessionId={sessionId} item={item} kind=\"reply\">"), 1);
  assert.equal(occurrences(btw, "model={meta?.model || ''}/></SourceTranscriptRowBoundary>}"), 1);
});
