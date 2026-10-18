// R3b-tasks step 1 (2.42304.0):
//  tasks-09  the Scheduled page renders the 2.42304.0 page shell (ccd3f68fe Oi = cd75b47e6 t) around the
//            2.42304.0 CdsPage (view-tabs c193cfc9b k): fade hidden as "invisible opacity-0", panels closed;
//            a controlled mount drives the page's IntersectionObserver and watches the fade come back.
//  tasks-02  the sub-agent / task list content-visibility variant is a GrowthBook gate (__gb__81656526 read through
//            shared-25 Zs = `.on`); with no GrowthBook the host stays on the gate-off branch.
//  cov1-03 / cov11-01  pinned evidence that the changes live only in the Code (CCD) routine form / Run now path.
import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import React, { act } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createRoot } from 'react-dom/client';
import { createServer } from 'vite';
import react from '@vitejs/plugin-react';

const app = path.resolve(import.meta.dirname, '..');
const v1 = path.resolve(app, '../reference/installed-2.42304.0-20261017/ion-dist/assets/v1');
const official = name => fs.readFileSync(path.join(v1, name), 'utf8');
const count = (text, needle) => text.split(needle).length - 1;

let server, Routines, Primitives;
before(async () => {
  server = await createServer({ configFile: false, root: app, plugins: [react()],
    server: { middlewareMode: true, hmr: false, watch: null }, appType: 'custom', logLevel: 'error' });
  (await server.ssrLoadModule('/electron/i18n/index.mjs')).setLocale('en-US');
  Routines = await server.ssrLoadModule('/src/source-routines.jsx');
  Primitives = await server.ssrLoadModule('/src/source-sessions-primitives.jsx');
});
after(() => server?.close());

const pending = () => new Promise(() => {});
const renderRoutines = (props = {}) => renderToStaticMarkup(React.createElement(Routines.SourceRoutines, {
  call: pending, executionProfile: { model: 'test-model', permission: 'ask' }, ...props }));

// ---- tasks-09 ------------------------------------------------------------------------------------------------------

test('tasks-09: the Scheduled page uses the 2.42304.0 page shell and CdsPage, not the 2.31226.0 Page', () => {
  const source = fs.readFileSync(path.join(app, 'src/source-routines.jsx'), 'utf8');
  assert.match(source, /import \{ SessionsPageShell as Page \} from '\.\/source-sessions-primitives\.jsx';/);
  assert.doesNotMatch(source, /c193cfc9b-2wgBbI8O/);
  const shell = fs.readFileSync(path.join(app, 'src/source-sessions-primitives.jsx'), 'utf8');
  assert.match(shell, /import \{CdsPage as CurrentPage\} from '\.\/generated\/view-tabs\/c193cfc9b-DSvIG0kE\.js';/);
  // ccd3f68fe (the official Scheduled page) imports its Page from the cd75b47e6 shell, which wraps c193cfc9b n.
  assert.equal(count(official('ccd3f68fe-DGWS8cEm.js'), 'import{t as Oi}from"./cd75b47e6-DDrZDYuB.js"'), 1);
  const wrapper = official('cd75b47e6-DDrZDYuB.js');
  for (const text of ['import{n as o,t as s}from"./c193cfc9b-DSvIG0kE.js"', 'n("panels")?', '"data-scrolls-under-page-header":void 0'])
    assert.equal(count(wrapper, text), 1, text);
});

test('tasks-09: SSR keeps the default fade (invisible opacity-0, opacity+visibility transition) and no panels parts', () => {
  const html = renderRoutines();
  assert.match(html, /data-cds="Page"/);
  assert.match(html, /<header[^>]*data-cds="PageHeader"[^>]*data-band="compact"/);
  assert.match(html, /<h1[^>]*>Scheduled tasks<\/h1>/);
  // The page's own controls still reach the 2.42304.0 header: search (collapsed to its icon button while the query is
  // empty, cf35aed38 L "collapsed"), the Sort icon menu and New task.
  assert.match(html, /<div data-cds-part="controls"/);
  assert.match(html, /<button type="button" data-cds="Button" data-cds-icon-only="" data-cds-ghost=""[^>]*aria-label="Search scheduled tasks"/);
  assert.match(html, /aria-label="Sort tasks"/);
  assert.match(html, />New task</);
  const fade = html.match(/<div aria-hidden="true" data-cds-part="fade" class="([^"]*)"/);
  assert.ok(fade, 'fade part rendered');
  assert.equal(fade[1], 'page-fade-t absolute inset-x-0 -bottom-8 h-8 transition-[opacity,visibility] duration-fast invisible opacity-0');
  for (const part of ['line', 'stuck-mark', 'level-mark', 'page-title-motion']) assert.doesNotMatch(html, new RegExp(`data-cds-part="${part}"`), part);
  // Gate closed: W = 0 before measuring, so the offsets are the non-panels fallbacks (10rem / 7rem).
  assert.match(html, /style="--cds-page-header-scroll-offset:10rem;--cds-page-header-pinned-height:7rem"/);
  // The shell's content div (cd75b47e6) holds the page body.
  assert.match(html, /<div class="flex flex-1 flex-col" style="--list-header-scroll-offset:var\(--cds-page-header-scroll-offset\)"><p class="text-body text-muted">Scheduled tasks run while/);
  // The official chunk: one fade with both classes, panels behind u("panels") (shared-frame vr).
  const page = official('c193cfc9b-DSvIG0kE.js');
  for (const text of ['"invisible opacity-0"', 'page-fade-t absolute inset-x-0 -bottom-8 h-8 transition-[opacity,visibility] duration-fast',
    '"data-cds-part":N?"line":"fade"', '"data-cds-part":"stuck-mark"', 'N=u("panels")', '${X+(N?16:48)}px'])
    assert.equal(count(page, text), 1, text);
  const frame = official('shared-frame-BfjMqbuN.js');
  for (const text of ['function vr(e){return _r(gr(),e)}', 'hr=G(void 0)', 'function _r(e,t){return e?.split(" ").includes(t)??!1}'])
    assert.equal(count(frame, text), 1, text);
});

// A small fake DOM, enough for React to mount the page and for the page's observers to be driven by hand.
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
  class Element {
    constructor(tag) {
      Object.assign(this, { tagName: tag.toUpperCase(), nodeName: tag.toUpperCase(), localName: tag, nodeType: 1, namespaceURI: 'http://www.w3.org/1999/xhtml',
        ownerDocument: document, childNodes: [], parentNode: null, attributes: new Map() });
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
    toggleAttribute(name, force) { const on = force ?? !this.attributes.has(name); if (on) this.attributes.set(name, ''); else this.attributes.delete(name); return on; }
    appendChild(child) { child.parentNode?.removeChild?.(child); this.childNodes.push(child); child.parentNode = this; return child; }
    insertBefore(child, ref) { child.parentNode?.removeChild?.(child); const index = ref ? this.childNodes.indexOf(ref) : -1; if (index < 0) this.childNodes.push(child); else this.childNodes.splice(index, 0, child); child.parentNode = this; return child; }
    removeChild(child) { const index = this.childNodes.indexOf(child); if (index >= 0) this.childNodes.splice(index, 1); child.parentNode = null; return child; }
    contains(node) { for (let at = node; at; at = at.parentNode) if (at === this) return true; return false; }
    querySelector() { return null; }
    querySelectorAll() { return []; }
    matches() { return false; }
    closest() { return null; }
    get offsetHeight() { return 0; }
    get offsetWidth() { return 0; }
    getBoundingClientRect() { return { top: 0, bottom: 0, left: 0, right: 0, width: 0, height: 0 }; }
    scrollIntoView() {}
    find(predicate) {
      if (predicate(this)) return this;
      for (const child of this.childNodes) { const hit = child.nodeType === 1 ? child.find(predicate) : null; if (hit) return hit; }
      return null;
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
  const observers = { intersection: [], resize: [] };
  class IntersectionObserver { constructor(callback) { this.callback = callback; this.targets = []; observers.intersection.push(this); } observe(target) { this.targets.push(target); } unobserve() {} disconnect() { this.targets = []; } }
  class ResizeObserver { constructor(callback) { this.callback = callback; observers.resize.push(this); } observe() {} unobserve() {} disconnect() {} }
  const window = Object.assign(Object.create(events), { document, innerWidth: 1200, innerHeight: 800, IntersectionObserver, ResizeObserver,
    HTMLIFrameElement: class {}, getComputedStyle: () => ({ direction: 'ltr' }), matchMedia: () => ({ matches: true, addEventListener() {}, removeEventListener() {} }),
    requestAnimationFrame: fn => setTimeout(fn, 0), cancelAnimationFrame: id => clearTimeout(id) });
  document.defaultView = window;
  return { window, document, Element, observers, IntersectionObserver, ResizeObserver };
}

test('tasks-09: the mounted page shows the fade once its sentinel scrolls away and hides it again (gate closed)', () => {
  const dom = createDom();
  const saved = ['window', 'document', 'IntersectionObserver', 'ResizeObserver'].map(name => [name, Object.getOwnPropertyDescriptor(globalThis, name)]);
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  for (const [name, value] of [['window', dom.window], ['document', dom.document], ['IntersectionObserver', dom.IntersectionObserver], ['ResizeObserver', dom.ResizeObserver]])
    Object.defineProperty(globalThis, name, { value, configurable: true, writable: true });
  const host = dom.document.body.appendChild(new dom.Element('div'));
  const root = createRoot(host);
  try {
    act(() => root.render(React.createElement(Primitives.SessionsPageShell, { title: 'Scheduled tasks', contentGap: 'lg' }, React.createElement('p', null, 'Body'))));
    const fade = () => host.find(node => node.getAttribute?.('data-cds-part') === 'fade');
    assert.ok(fade(), 'fade mounted');
    assert.match(fade().getAttribute('class'), /transition-\[opacity,visibility\] duration-fast invisible opacity-0$/);
    assert.equal(host.find(node => ['stuck-mark', 'level-mark', 'line'].includes(node.getAttribute?.('data-cds-part'))), null, 'no panels parts');
    // Gate closed: one IntersectionObserver, on the h-0 top sentinel only.
    assert.equal(dom.observers.intersection.length, 1);
    const [observer] = dom.observers.intersection;
    assert.equal(observer.targets.length, 1);
    assert.equal(observer.targets[0].getAttribute('class'), 'h-0');
    act(() => observer.callback([{ target: observer.targets[0], isIntersecting: false }]));
    assert.match(fade().getAttribute('class'), /duration-fast opacity-100$/);
    assert.doesNotMatch(fade().getAttribute('class'), /invisible/);
    act(() => observer.callback([{ target: observer.targets[0], isIntersecting: true }]));
    assert.match(fade().getAttribute('class'), /duration-fast invisible opacity-0$/);
    // The page's own style keeps the non-panels scroll offset fallbacks (W stays 0 in this DOM).
    const page = host.find(node => node.getAttribute?.('data-cds') === 'Page');
    assert.equal(page.style.getPropertyValue('--cds-page-header-scroll-offset'), '10rem');
    act(() => root.unmount());
    assert.deepEqual(observer.targets, [], 'observer disconnected on unmount');
  } finally {
    for (const [name, descriptor] of saved) descriptor ? Object.defineProperty(globalThis, name, descriptor) : delete globalThis[name];
  }
});

// ---- tasks-02 ------------------------------------------------------------------------------------------------------

test('tasks-02: content-visibility is GrowthBook-gated in 2.42304.0; the host stays on the gate-off classes', () => {
  const chunk = official('cccc2cf0a-B0D--VZp.js');
  for (const text of ['TO="__gb__81656526"', 'wD="__gb__81656526"', 'v=B(TO)', 'F=B(wD)', 'className:o?DO:EO', 'Th as B',
    'supports-[(overflow-anchor:auto)_and_(contain-intrinsic-block-size:auto_1px)]:[&>*]:[content-visibility:auto]',
    'supports-[(overflow-anchor:auto)_and_(contain-intrinsic-block-size:auto_1px)]:[&>*]:[contain-intrinsic-block-size:auto_2rem]'])
    assert.equal(count(chunk, text), 1, text);
  const flags = official('shared-25-DP8p7i1Z.js');
  for (const text of ['function Zs(e){return Rs(I(e)).on}', 'Zs as Th']) assert.equal(count(flags, text), 1, text);
  // Gate off (no GrowthBook payload): no content-visibility, overflow-clip-margin or contain-intrinsic-* in the host views.
  for (const file of ['src/source-agent.css', 'src/source-background-tasks.css', 'src/source-agent.jsx', 'src/source-background-tasks.jsx']) {
    const text = fs.readFileSync(path.join(app, file), 'utf8');
    assert.doesNotMatch(text, /content-visibility|overflow-clip-margin|contain-intrinsic/, file);
  }
});

// ---- cov1-03 / cov11-01 --------------------------------------------------------------------------------------------

test('cov1-03: branch empty states and "(Ant only)" live only in the Code routine form; the host form has neither', () => {
  const form = official('c0fd2fda3-DzTjEtm3.js');
  for (const text of ['emptyMessage:u?null:l.length===0?s.formatMessage(Y.noBranches):s.formatMessage(Y.noBranchesMatch)',
    'noBranchesMatch:{defaultMessage:`No branches match`,id:`8ChEUc76Ev`}'.replaceAll('`', '"'), '{label} (Ant only)'])
    assert.equal(count(form, text), 1, text);
  assert.equal(count(official('c97b955f1-BlGH1qrk.js'), 'No branches'), 0, 'the Cowork routine form has no branch picker');
  // "(Ant only)" is the Runs-on machine picker's label for Anthropic accounts: c43d31dd8 h = _() = shared-52 Lm(account).
  const ant = official('c43d31dd8-EEJLxHyj.js');
  assert.equal(count(ant, 'function _(){return i(n()?.account)}'), 1);
  // The host Cowork page renders the 2.42304.0 c97b955f1 Ca (cowork-scheduled UpsertScheduledTaskModal, R4g-routines RTC)
  // through its page host wrapper; no branch picker or "(Ant only)" in it.
  const local = fs.readFileSync(path.join(app, 'src/source-routines.jsx'), 'utf8');
  assert.match(local, /CoworkUpsertScheduledTaskModal as OriginalRoutineForm \} from '\.\/source-routine-cowork-page-adapters\.jsx';/);
  const wrapper = fs.readFileSync(path.join(app, 'src/source-routine-cowork-page-adapters.jsx'), 'utf8');
  assert.match(wrapper, /import \{ ScheduledTaskDetail, UpsertScheduledTaskModal \} from '\.\/generated\/cowork-scheduled\/index\.mjs';/);
  const generated = fs.readFileSync(path.join(app, 'src/generated/cowork-scheduled/c97b955f1-BlGH1qrk.mjs'), 'utf8');
  for (const text of ['No branches', '(Ant only)']) assert.equal(generated.includes(text), false, text);
});

test('cov11-01: the cause sentence is only in the CCD Run now path (cbd6c85c8 Hc), keyed off [ccdErrorCategory:…]', () => {
  const code = official('cbd6c85c8-PO73iD62.js');
  for (const [text, times] of [['id:"y23y/6SwxU"', 2], ['id:"HLoYm650Bw"', 2], ['scheduledTaskManualStart:!0', 1], ['tags:{source:"epitaxy_scheduled_task_run_now"}', 3]])
    assert.equal(count(code, text), times, text);
  // The Cowork Scheduled page closure (page, run hook, card menu, both routine forms) has no cause sentence; a full
  // `grep -c -F y23y/6SwxU` over v1/*.js finds it only in cbd6c85c8 (see reports/R3b/R3b-tasks.md).
  for (const name of ['ccd3f68fe-DGWS8cEm.js', 'shared-18-D4XxL6Tg.js', 'cdbc75b4b-DdrHYWQG.js', 'c97b955f1-BlGH1qrk.js', 'c0fd2fda3-DzTjEtm3.js'])
    assert.equal(official(name).includes('y23y/6SwxU'), false, name);
  assert.equal(count(official('shared-52-DGviI8xb.js'), 'xx=/\\[ccdErrorCategory:([a-z_]+)\\]$/'), 1);
  // The Cowork Scheduled page's local Run now (shared-18 kB) reports through EB, not the cause sentence.
  assert.equal(count(official('shared-18-D4XxL6Tg.js'), 'e(Dz(r,t)??zn(r)??t.formatMessage(n.runFailed)'), 1);
});
