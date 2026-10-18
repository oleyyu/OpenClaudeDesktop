import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import React, { act } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createRoot } from 'react-dom/client';
import { createServer } from 'vite';
import react from '@vitejs/plugin-react';
import { extractR3bTranscript } from '../scripts/extract-r3b-transcript.mjs';
import { transcriptRowCrashKind } from '../src/transcript-row-boundary-model.mjs';
import { createToolGroupExpansion, groupExpansionKey, rowExpansionKey } from '../src/tool-group-expansion.mjs';

// R3b-transcript step 1: transcript-03 (suggested task bottom edge), cov1-06 (streaming table column freeze),
// transcript-v01 (per-row crash boundary) and cov2-05 (unavailable transcript, Archive hidden once archived), all from
// the installed 2.42304.0 originals generated into src/generated/r3b-transcript. Source/AST, SSR and a small fake DOM
// driven by hand (controlled events through React's own props): no browser, no Electron, no network.
const app = path.resolve(import.meta.dirname, '..');
const directory = path.join(app, 'src/generated/r3b-transcript');
const manifest = JSON.parse(fs.readFileSync(path.join(directory, 'manifest.json'), 'utf8'));
const reference = path.resolve(app, '../reference', manifest.referenceSnapshot, 'ion-dist/assets/v1');
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const raw = file => fs.readFileSync(path.join(reference, file), 'utf8');
const occurrences = (text, needle) => text.split(needle).length - 1;

let server, Region, Freeze, Row, Unavailable, Host, Table, Adapters, Expansion;
before(async () => {
  server = await createServer({ configFile: false, root: app, plugins: [react()], server: { middlewareMode: true, hmr: false, ws: false, watch: null }, appType: 'custom', logLevel: 'error' });
  Region = await server.ssrLoadModule('/src/generated/r3b-transcript/transcript-region-edge.mjs');
  Freeze = await server.ssrLoadModule('/src/generated/r3b-transcript/table-column-freeze.mjs');
  Row = await server.ssrLoadModule('/src/generated/r3b-transcript/transcript-row-boundary.mjs');
  Unavailable = await server.ssrLoadModule('/src/generated/r3b-transcript/transcript-unavailable.mjs');
  Host = await server.ssrLoadModule('/src/source-r3b-transcript.jsx');
  Adapters = await server.ssrLoadModule('/src/source-r3b-transcript-adapters.jsx');
  Table = await server.ssrLoadModule('/src/source-response-table.jsx');
  Expansion = await server.ssrLoadModule('/src/tool-group-expansion.mjs');
});
after(async () => { await server?.close(); });

// A small fake DOM (as tests/r3b-tasks.test.mjs), with what these components read: attribute closest(), table
// sections, per-element rects and the element window's ResizeObserver.
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
const reactProps = element => element[Object.keys(element).find(key => key.startsWith('__reactProps$'))];
const classOf = element => element.getAttribute('class') ?? '';
const press = element => ({ preventDefault() {}, stopPropagation() {}, isDefaultPrevented: () => false, currentTarget: element, target: element, button: 0, detail: 1, nativeEvent: {} });

test('generator: the check passes, every module and call site is pinned to the installed 2.42304.0 chunks', async () => {
  await extractR3bTranscript({ check: true });
  assert.equal(manifest.referenceVersion, '2.42304.0');
  for (const entry of [...manifest.modules, ...manifest.callSites])
    assert.equal(entry.sourceSha256, sha(fs.readFileSync(path.join(reference, entry.source))), entry.source);
  assert.deepEqual(manifest.modules.map(m => m.target), ['owner-resize-observer.mjs', 'transcript-region-edge.mjs', 'table-column-freeze.mjs',
    'define-messages.mjs', 'row-crash-messages.mjs', 'chunk-load-error.mjs', 'error-stack.mjs', 'render-error-boundary.mjs',
    'transcript-row-boundary.mjs', 'empty-state.mjs', 'prevent-mouse-down.mjs', 'transcript-unavailable.mjs',
    // Step 2 (toolcards-06/07): the Turn edits card and what it reads.
    'summary-card.mjs', 'file-basename.mjs', 'windows-path.mjs', 'relative-path.mjs', 'muted-action-class.mjs', 'session-output-files.mjs',
    'file-icon-override.mjs', 'source-extensions.mjs', 'file-kind-tables.mjs', 'file-icon-name.mjs', 'session-file-access.mjs', 'turn-edits-card.mjs']);
  assert.deepEqual(manifest.inlineStyles.map(s => [s.target, s.source, s.id]), [['summary-card.css', 'c425fb3cf-CEgSkv8l.js', 'cbbd9b21e']]);
  for (const entry of manifest.inlineStyles) assert.equal(entry.sourceSha256, sha(fs.readFileSync(path.join(reference, entry.source))), entry.source);
  // Every host dependency is a named adapter of this lane, React, view-tabs or a sibling module: nothing else.
  const kinds = new Set(manifest.modules.flatMap(m => m.imports.map(i => i.kind)));
  assert.deepEqual([...kinds].sort(), ['adapter', 'generated', 'react', 'view-tabs']);
  for (const i of manifest.modules.flatMap(m => m.imports).filter(i => i.kind === 'view-tabs'))
    assert.ok(['CdsButton', 'CdsIcon', 'CdsTooltip', 'CdsTooltipProvider', 'cdsClassNames'].includes(i.name), i.name);
  // The distinctive strings, once each in the minified originals.
  const pins = [
    ['cf74bc599-D9NZWRyl.js', 'jv="--epitaxy-suggested-task-end"'], ['cf74bc599-D9NZWRyl.js', 'ge=Nv(jv,me,ab)'],
    ['cf74bc599-D9NZWRyl.js', '"text-body text-primary break-words line-clamp-6"'], ['cf74bc599-D9NZWRyl.js', 'closest("[data-epitaxy-transcript-region]")??'],
    ['c89efce1a-8S3RzgR0.js', 'Math.min(kc,Math.max(1,Math.floor(e/Oc)))'], ['c89efce1a-8S3RzgR0.js', 'l-f.rows<Ac(f.rows)'], ['c89efce1a-8S3RzgR0.js', 's=jc(Ze(),t)'],
    ['c4a9ee384-ZZIKqgNM.js', 'componentName:"TranscriptRow"'], ['c4a9ee384-ZZIKqgNM.js', '"data-transcript-row-crashed":e'], ['c4a9ee384-ZZIKqgNM.js', 'sp="__gb__3525173228"'],
    ['c05b96c7f-DklIyA-P.js', 'id:"qlw7hIBZl4"'], ['c05b96c7f-DklIyA-P.js', 'id:"vHA8qpGWmW"'],
    ['cf74bc599-D9NZWRyl.js', 'Session not found on disk'], ['cf74bc599-D9NZWRyl.js', 'n&&!d?null:'], ['cf74bc599-D9NZWRyl.js', 'isArchived:T.isArchived===!0'],
    ['c96d752d0-BOCqU7c2.js', 't.kind==="assistant"||t.kind==="assistantItem"?"reply":"row"'],
  ];
  for (const [file, needle] of pins) assert.equal(occurrences(raw(file), needle), 1, `${file}: ${needle}`);
  // The adapter flag is the generated flag.
  assert.equal(Row.TRANSCRIPT_ROW_BOUNDARY_FLAG, '__gb__3525173228');
  assert.equal(Adapters.HOST_FLAGS[Row.TRANSCRIPT_ROW_BOUNDARY_FLAG], true);
});

test('transcript-03: presets on (D10), the floating suggested task card is not mounted and nothing publishes its edge', async () => {
  // 2.42304.0 cf74bc599 Xx mounts the floating card lb only while `lr` is false (`lr=Zs(cr,t)`, cr = the presets switch);
  // the inline card (c96d752d0 R$ / z$ → B$) reads no Nv/jv, so --epitaxy-suggested-task-end has no publisher on this branch.
  // The host takes that branch (R4f-proposal P5): the floating card is retired and no host file publishes the variable.
  const xx = raw('cf74bc599-D9NZWRyl.js');
  assert.equal(occurrences(xx, 'cr=to(),lr=Zs(cr,t)'), 1);
  assert.equal(occurrences(xx, 'Or&&t&&dr&&!lr&&u(lb,{sessionRef:t,scrollRef:r,captureGuardedSnapToBottom:x},`chip-${e}`)'), 1);
  assert.equal(fs.existsSync(path.join(app, 'src/source-suggested-tasks.jsx')), false);
  const hostFiles = fs.readdirSync(path.join(app, 'src')).filter(name => /\.(jsx|mjs|js)$/.test(name));
  assert.deepEqual(hostFiles.filter(name => fs.readFileSync(path.join(app, 'src', name), 'utf8').includes('SUGGESTED_TASK_END')), []);
  assert.equal(Region.SUGGESTED_TASK_END, '--epitaxy-suggested-task-end');
  assert.equal(Region.STICKY_PROMPT_END, '--epitaxy-sticky-prompt-end');
  assert.equal(Region.SUGGESTED_TASK_EDGE_OFFSET, 12);
  // The generated hook (Nv) stays for a later publisher (the sticky prompt bubble): what lb did with it, kept tested.
  function Edge({ shown }) {
    const ref = Region.useTranscriptRegionEdge(Region.SUGGESTED_TASK_END, shown, Region.SUGGESTED_TASK_EDGE_OFFSET);
    return shown ? React.createElement('div', { ref, 'data-edge': '' }) : null;
  }
  await withDom(({ dom, container, root }) => {
    container.rect = { top: 40, bottom: 640, left: 0, right: 800, width: 800, height: 600 };
    act(() => root.render(React.createElement(Edge, { shown: true })));
    const anchor = container.find(node => node.hasAttribute?.('data-edge'));
    assert.ok(anchor, 'edge mounted');
    // Nv's fallback region is the parent (no [data-epitaxy-transcript-region] in this host): bottom - top + 12, measured
    // at once (the fake anchor has no box yet: 0 - 40 + 12).
    assert.equal(container.style.getPropertyValue('--epitaxy-suggested-task-end'), '-28px');
    const observer = dom.observers.find(o => o.targets.includes(anchor));
    assert.ok(observer, 'the anchor is observed through its window ResizeObserver');
    anchor.rect = { top: 52, bottom: 172, left: 0, right: 800, width: 800, height: 120 };
    act(() => observer.callback([]));
    assert.equal(container.style.getPropertyValue('--epitaxy-suggested-task-end'), '144px');
    // The edge goes away: the variable is removed with its observer.
    act(() => root.render(React.createElement(Edge, { shown: false })));
    assert.equal(container.style.getPropertyValue('--epitaxy-suggested-task-end'), '');
    assert.equal(observer.disconnected, true);
  });
  // A real region attribute wins over the parent.
  await withDom(({ dom, container, root }) => {
    container.setAttribute('data-epitaxy-transcript-region', '');
    container.rect = { top: 100, bottom: 700, left: 0, right: 800, width: 800, height: 600 };
    function Card() {
      const ref = Region.useTranscriptRegionEdge(Region.STICKY_PROMPT_END, true, 0);
      return React.createElement('div', null, React.createElement('div', { ref, 'data-card': '' }));
    }
    act(() => root.render(React.createElement(Card)));
    const card = container.find(node => node.hasAttribute?.('data-card'));
    card.rect = { top: 120, bottom: 160, left: 0, right: 10, width: 10, height: 40 };
    act(() => dom.observers.find(o => o.targets.includes(card)).callback([]));
    assert.equal(container.style.getPropertyValue('--epitaxy-sticky-prompt-end'), '60px');
    assert.equal(card.parentElement.style.getPropertyValue('--epitaxy-sticky-prompt-end'), '');
  });
});

test('cov1-06: the re-measure stride is min(16, max(1, floor(rows / 16)))', () => {
  const stride = Freeze.tableRemeasureStride;
  assert.deepEqual([1, 15, 31, 32, 47, 48, 60, 255, 256, 1000].map(stride), [1, 1, 1, 2, 2, 3, 3, 15, 16, 16]);
});

// A streaming Markdown table in the fake DOM: header cells and the table report the widths given here.
function mountTable(root, container, rows, streaming) {
  const header = React.createElement('thead', null, React.createElement('tr', null, React.createElement('th', null, 'A'), React.createElement('th', null, 'B')));
  const body = React.createElement('tbody', null, Array.from({ length: rows }, (_, index) => React.createElement('tr', { key: index },
    React.createElement('td', null, `a${index}`), React.createElement('td', null, `b${index}`))));
  act(() => root.render(React.createElement(Table.SourceTableScope, { scopeKey: 's1' },
    React.createElement(Table.SourceResponseTable, { isStreaming: streaming }, header, body))));
  return container.find(node => node.tagName === 'TABLE');
}
function setWidths(table, [a, b], room = 600) {
  const [thA, thB] = table.tHead.rows[0].cells;
  thA.rect = { ...thA.rect, width: a };
  thB.rect = { ...thB.rect, width: b };
  table.rect = { ...table.rect, width: a + b };
  table.parentElement.rect = { ...table.parentElement.rect, width: room };
}
const minWidths = table => table.tHead.rows[0].cells.map(cell => cell.style.minWidth);

test('cov1-06: a streaming table freezes its header widths and re-measures only every Ac(rows) rows past 32', async () => {
  await withDom(({ container, root }) => {
    let table = mountTable(root, container, 40, true);
    // The first streamed render measured nothing yet (all widths 0): pin, then give the cells real widths.
    setWidths(table, [100, 200]);
    table = mountTable(root, container, 41, true);
    assert.deepEqual(minWidths(table), ['100px', '200px']);
    assert.doesNotMatch(classOf(table) + JSON.stringify(table.style.getPropertyValue('table-layout')), /fixed/);
    // 42 rows: 42 - 41 = 1 < Ac(41) = 2 and the table still fits its frozen width: no re-measure, even though the cells
    // would now measure wider.
    setWidths(table, [150, 260]);
    table.rect = { ...table.rect, width: 300 };
    table = mountTable(root, container, 42, true);
    assert.deepEqual(minWidths(table), ['100px', '200px']);
    // 43 rows: 43 - 41 = 2 is not < 2: re-measured, and the change (> max(16px, 10%)) is adopted.
    setWidths(table, [150, 260]);
    table = mountTable(root, container, 43, true);
    assert.deepEqual(minWidths(table), ['150px', '260px']);
    // Settled: the freeze is cleared.
    table = mountTable(root, container, 43, false);
    assert.deepEqual(minWidths(table), ['', '']);
  });
  // Below 32 rows Ac is 1: every new row re-measures (the 2.37337.1 behaviour).
  await withDom(({ container, root }) => {
    let table = mountTable(root, container, 10, true);
    setWidths(table, [100, 200]);
    table = mountTable(root, container, 11, true);
    assert.deepEqual(minWidths(table), ['100px', '200px']);
    setWidths(table, [150, 260]);
    table.rect = { ...table.rect, width: 300 };
    table = mountTable(root, container, 12, true);
    assert.deepEqual(minWidths(table), ['150px', '260px']);
  });
});

test('transcript-v01: the row kind, the expansion forget and the original Banner fallback (SSR)', () => {
  assert.equal(transcriptRowCrashKind({ type: 'agentMessage' }), 'reply');
  assert.equal(transcriptRowCrashKind({ type: 'commandExecution' }), 'reply');
  assert.equal(transcriptRowCrashKind({ type: 'reasoning' }), 'reply');
  assert.equal(transcriptRowCrashKind({ type: 'userMessage' }), 'row');
  assert.equal(transcriptRowCrashKind({ type: 'contextCompaction' }), 'row');
  assert.equal(transcriptRowCrashKind(null), 'row');
  const store = createToolGroupExpansion();
  store.set(groupExpansionKey('s1', 'g1'), true);
  store.set(groupExpansionKey('s10', 'g1'), true);
  store.set(rowExpansionKey('s1', 'i1'), false);
  let notified = 0;
  store.subscribe(() => { notified += 1; });
  store.forgetSession('s1');
  assert.equal(store.get(groupExpansionKey('s1', 'g1')), undefined);
  assert.equal(store.get(rowExpansionKey('s1', 'i1')), undefined);
  assert.equal(store.get(groupExpansionKey('s10', 'g1')), true);
  assert.equal(notified, 1);
  store.forgetSession('s1');
  assert.equal(notified, 1, 'nothing to forget, no notification');
  for (const [kind, copy] of [['reply', 'This response didn’t load.'], ['row', 'Couldn’t load this.']]) {
    const html = renderToStaticMarkup(React.createElement(Row.TranscriptRowCrashed, { kind, again: false, onRetry() {} }));
    assert.match(html, new RegExp(`^<div data-transcript-row-crashed="${kind}" class="py-sm"><div data-cds="Banner" data-prose-box="" data-icon-layout="first-line" data-cta-layout="inline" data-action-align="first-line" role="status" class="flex items-start gap-xs py-md font-sans text-body font-normal break-words px-lg rounded-card bg-surface-1 text-primary shadow-card-ring`));
    assert.match(html, /<span class="flex min-h-\[1lh\] shrink-0 items-center text-secondary">/);
    assert.match(html, /data-cds="Icon"[^>]*/);
    assert.ok(html.includes(copy), copy);
    assert.match(html, /<span data-step="3" class="flex shrink-0 items-center gap-xs min-h-control my-\[calc\(\(1lh-var\(--cds-h-control\)\)\/2\)\] -ms-\[2px\] -me-\[calc\(var\(--cds-pad-md\)-2px\)\]">/);
    assert.match(html, />Try again</);
  }
  // `again`: a row that failed again right after Try again offers no button.
  const again = renderToStaticMarkup(React.createElement(Row.TranscriptRowCrashed, { kind: 'row', again: true, onRetry() {} }));
  assert.doesNotMatch(again, /Try again|<button/);
  // R4f-graph G2: the Banner is the view-tabs original gT, so the branches the old host replica refused render as in
  // 2.42304.0: details over the CDS Collapsible (role "none", so no role attribute) and gT's ghost icon-only Dismiss.
  const details = renderToStaticMarkup(React.createElement(Adapters.CdsBanner, { details: 'More detail', defaultDetailsOpen: true }, 'Summary'));
  assert.match(details, /^<div data-cds="Banner" data-prose-box="" data-icon-layout="first-line" data-cta-layout="inline" data-action-align="first-line" class="flex items-start /);
  assert.match(details, /<div class="flex min-w-0 flex-1 flex-col"><div data-open="" data-cds="Collapsible" class="contents"><div class="flex min-w-0 flex-wrap items-start gap-y-sm gap-x-md"><button type="button" class="cds-reset flex min-w-0 grow select-none items-center gap-x-\[2px\] border-0 text-start /);
  assert.match(details, /aria-expanded="true"><div class="min-w-0">Summary<\/div><span data-cds="Icon"[^>]* class="shrink-0 text-secondary transition-transform rotate-0"/);
  assert.match(details, /<div class="pt-\[var\(--cds-gap-sm\)\]">More detail<\/div>/);
  const closed = renderToStaticMarkup(React.createElement(Adapters.CdsBanner, { details: 'More detail' }, 'Summary'));
  assert.match(closed, /<div data-closed="" data-cds="Collapsible" class="contents">/);
  assert.match(closed, /class="shrink-0 text-secondary transition-transform -rotate-90 rtl:rotate-90"/);
  assert.ok(!closed.includes('More detail'), 'a closed panel is not mounted');
  const dismiss = renderToStaticMarkup(React.createElement(Adapters.CdsBanner, { onDismiss() {} }, 'y'));
  assert.match(dismiss, /<span data-step="3" class="-me-\[calc\(var\(--cds-pad-md\)-2px\)\] flex h-\[1lh\] shrink-0 items-center"><button type="button" data-cds="Button" data-cds-icon-only="" data-cds-ghost=""[^>]* aria-label="Dismiss">/);
});

test('R4f-graph G2: the Banner, DisabledReason, Collapsible and useDirection adapters are the view-tabs originals', async () => {
  const shared = await server.ssrLoadModule('/src/generated/view-tabs/shared-frame-BfjMqbuN.js');
  const vendor = await server.ssrLoadModule('/src/generated/view-tabs/vendor-frame-DfPJ1QmD.js');
  assert.equal(Adapters.CdsBanner, shared.CdsBanner);
  assert.equal(Adapters.CdsDisabledReason, shared.CdsDisabledReason);
  assert.equal(Adapters.CdsCollapsible, shared.CdsCollapsible);
  assert.equal(Adapters.useDirection, vendor.useDirection);
  // The view-tabs names G1 published are the originals the generator routes here (exported oa / Ec / ca / Wn).
  const published = JSON.parse(fs.readFileSync(path.join(app, 'src/generated/view-tabs/manifest.json'), 'utf8')).publicNames;
  const routed = { CdsBanner: ['shared-frame-BfjMqbuN.js', 'gT', 'oa'], CdsDisabledReason: ['shared-frame-BfjMqbuN.js', 'Qp', 'Ec'],
    CdsCollapsible: ['shared-frame-BfjMqbuN.js', 'Qw', 'ca'], useDirection: ['vendor-frame-DfPJ1QmD.js', 'Td', 'Wn'] };
  const adapterImports = manifest.modules.flatMap(m => m.imports).filter(i => i.kind === 'adapter' && i.name in routed);
  assert.deepEqual([...new Set(adapterImports.map(i => i.name))].sort(), Object.keys(routed).sort());
  for (const [name, [file, local, exported]] of Object.entries(routed)) {
    assert.equal(published[name].file, file, name);
    assert.equal(published[name].local, local, name);
    assert.equal(occurrences(raw(file), `${local} as ${exported}`), 1, `${file}: ${local} as ${exported}`);
    for (const i of adapterImports.filter(i => i.name === name)) {
      assert.equal(i.via, `${file}:${exported}`, name);
      assert.equal(i.original, local, name);
    }
  }
  // No hand-written replica is left in the adapter file: it re-exports the view-tabs bindings.
  const source = fs.readFileSync(path.join(app, 'src/source-r3b-transcript-adapters.jsx'), 'utf8');
  assert.equal(occurrences(source, "export { CdsBanner } from './generated/view-tabs/shared-frame-BfjMqbuN.js';"), 1);
  assert.equal(occurrences(source, "export { CdsDisabledReason, CdsCollapsible } from './generated/view-tabs/shared-frame-BfjMqbuN.js';"), 1);
  assert.equal(occurrences(source, "export { useDirection } from './generated/view-tabs/vendor-frame-DfPJ1QmD.js';"), 1);
  for (const gone of ['function CdsBanner', 'function CdsDisabledReason', 'refuseCollapsible', 'function useDirection', 'BANNER_SURFACE', 'DISABLED_REASON_WRAPPER', 'isPictogram'])
    assert.ok(!source.includes(gone), gone);
});

test('transcript-v01: a row that throws while rendering is replaced alone; Try again restores it and forgets its expansion', async () => {
  await withDom(({ container, root }) => {
    const state = { fail: true, renders: 0 };
    function Flaky() { state.renders += 1; if (state.fail) throw Error('row exploded'); return React.createElement('p', { 'data-row': 'flaky' }, 'Recovered reply'); }
    const rows = (live = false) => React.createElement('div', { tabIndex: -1, 'data-feed': '' },
      React.createElement(Host.SourceTranscriptRowBoundary, { sessionId: 's-crash', item: { type: 'userMessage' } }, React.createElement('p', { 'data-row': 'user' }, 'Hello')),
      React.createElement(Host.SourceTranscriptRowBoundary, { sessionId: 's-crash', item: { type: 'agentMessage' }, isStreaming: live }, React.createElement(Flaky)),
      React.createElement(Host.SourceTranscriptRowBoundary, { sessionId: 's-crash', item: { type: 'commandExecution' } }, React.createElement('p', { 'data-row': 'tool' }, 'ls')));
    Expansion.toolGroupExpansion.set(groupExpansionKey('s-crash', 'g'), true);
    Expansion.toolRowExpansion.set(rowExpansionKey('s-crash', 'r'), true);
    act(() => root.render(rows()));
    const crashed = container.find(node => node.hasAttribute?.('data-transcript-row-crashed'));
    assert.ok(crashed, 'the failing row shows the crash fallback');
    assert.equal(crashed.getAttribute('data-transcript-row-crashed'), 'reply');
    assert.ok(crashed.textContent.includes('This response didn’t load.'));
    assert.ok(container.find(node => node.getAttribute?.('data-row') === 'user'), 'the row above still renders');
    assert.ok(container.find(node => node.getAttribute?.('data-row') === 'tool'), 'the row below still renders');
    assert.equal(container.findAll(node => node.hasAttribute?.('data-transcript-row-crashed')).length, 1);
    const button = crashed.find(node => node.tagName === 'BUTTON');
    assert.ok(button && button.textContent.includes('Try again'));
    // Try again while it still fails: the fallback comes back without the button (failed again within 10s).
    act(() => reactProps(button).onClick(press(button)));
    assert.equal(Expansion.toolGroupExpansion.get(groupExpansionKey('s-crash', 'g')), undefined, 'retry forgot the group expansion');
    assert.equal(Expansion.toolRowExpansion.get(rowExpansionKey('s-crash', 'r')), undefined, 'retry forgot the row expansion');
    const second = container.find(node => node.hasAttribute?.('data-transcript-row-crashed'));
    assert.ok(second);
    assert.equal(second.find(node => node.tagName === 'BUTTON'), null, 'no Try again right after a failed retry');
    // The same boundary sees the live tail change (resetOn): it resets and the row renders again.
    state.fail = false;
    act(() => root.render(rows(true)));
    assert.ok(container.find(node => node.getAttribute?.('data-row') === 'flaky'), 'the row recovered');
    assert.equal(container.find(node => node.hasAttribute?.('data-transcript-row-crashed')), null);
  });
  // No session: the original gate is closed (cp needs a view key) and the row is not wrapped.
  const bare = renderToStaticMarkup(React.createElement(Host.SourceTranscriptRowBoundary, { sessionId: null, item: { type: 'agentMessage' } }, React.createElement('p', null, 'x')));
  assert.equal(bare, '<p>x</p>');
});

test('cov2-05: the unavailable transcript offers Archive and Delete, and only Delete once the session is archived', async () => {
  const html = renderToStaticMarkup(React.createElement(Host.SourceTranscriptUnavailable, { sessionId: 's1', title: 'Old session', archive: async () => {}, requestDelete() {} }));
  assert.match(html, /^<div class="flex h-full flex-col items-center justify-center gap-md px-lg py-lg text-center">/);
  assert.match(html, /<p class="max-w-\[36ch\] text-pretty break-words text-body text-primary">Session not found on disk<\/p>/);
  assert.match(html, /<p class="max-w-\[36ch\] text-pretty break-words text-footnote text-muted-as-secondary">Send a message to start fresh in this directory\.<\/p>/);
  assert.doesNotMatch(html, /Import CLI sessions|retention policy|Earlier messages may have expired/);
  assert.match(html, /aria-label="Archive session"/);
  assert.match(html, /aria-label="Delete session"/);
  assert.ok(html.indexOf('Archive session') < html.indexOf('Delete session'));
  const archived = renderToStaticMarkup(React.createElement(Host.SourceTranscriptUnavailable, { sessionId: 's1', title: 'Old session', isArchived: true, archive: async () => {}, requestDelete() {} }));
  assert.doesNotMatch(archived, /Archive session/);
  assert.match(archived, /aria-label="Delete session"/);
  // Controlled presses: Archive runs the host archive (busy while it runs), Delete asks the host confirm.
  await withDom(async ({ container, root }) => {
    const calls = [];
    let finish;
    const archive = () => { calls.push('archive'); return new Promise(resolve => { finish = resolve; }); };
    act(() => root.render(React.createElement(Host.SourceTranscriptUnavailable, { sessionId: 's1', title: 'Old', archive, requestDelete: () => calls.push('delete') })));
    const button = label => container.find(node => node.tagName === 'BUTTON' && node.getAttribute('aria-label') === label);
    act(() => { reactProps(button('Archive session')).onClick(press(button('Archive session'))); });
    assert.deepEqual(calls, ['archive']);
    assert.ok(button('Archive session'), 'Archive stays while it runs (n && !d)');
    assert.equal(button('Archive session').getAttribute('aria-busy'), 'true', 'busy while the host archive runs');
    // A second press while it runs does nothing.
    act(() => { reactProps(button('Archive session')).onClick(press(button('Archive session'))); });
    assert.deepEqual(calls, ['archive']);
    await act(async () => { finish(); });
    assert.notEqual(button('Archive session').getAttribute('aria-busy'), 'true', 'no longer busy');
    act(() => { reactProps(button('Delete session')).onClick(press(button('Delete session'))); });
    assert.deepEqual(calls, ['archive', 'delete']);
  });
});

test('cov2-05 / transcript-v01: main.jsx mounts the row boundary on each message row and the unavailable state', () => {
  const main = fs.readFileSync(path.join(app, 'src/main.jsx'), 'utf8');
  assert.equal(occurrences(main, 'import { SourceTranscriptRowBoundary, SourceTranscriptUnavailable } from "./source-r3b-transcript.jsx";'), 1);
  // The message row's boundary wraps the Cowork in-place edit or the Message (cowork message edit).
  assert.equal(occurrences(main, '<SourceTranscriptRowBoundary sessionId={current} item={item} isStreaming={isItemStreaming(state, current, item)}>{coworkEdit && coworkActions?.onEditMessage && item.type === "userMessage" && coworkEdit.uuid === item.id'), 1);
  assert.equal(occurrences(main, ': <Message item={item} isInterrupting={stopping}'), 1);
  assert.equal(occurrences(main, 'onRewindTo: transcriptActions.onRewindTo, onForkFrom: transcriptActions.onForkFrom }) : null} />}</SourceTranscriptRowBoundary>}'), 1);
  assert.equal(occurrences(main, 'setHistoryUnavailable((value) => historyMissing(history, known, r.thread) ? id : value === id ? null : value);'), 1);
  assert.equal(occurrences(main, ': historyUnavailable === current ? "unavailable"'), 1);
  assert.match(main, /\{emptyPane === "unavailable" && <SourceTranscriptUnavailable sessionId=\{current\} title=\{session\?\.name \?\? null\} isArchived=\{session\?\.archived === true\}/);
  assert.match(main, /requestDelete=\{session \? \(\) => setConfirmDelete\(session\) : undefined\}/);
});

// R4g-btw BT2 (X7-19, D34): 2.42304.0 wraps every feed row in u9 (Jit and uat, one call each in c96d752d0), and the /btw
// child pane renders that same feed (c4ea84cb3 imports c96d752d0's lat / dat). The host's other row kinds follow.
test('X7-19: the 2.42304.0 feed wraps every row in u9, and the child pane feed is the same one', () => {
  const v1 = path.resolve(app, '../reference/installed-2.42304.0-20261017/ion-dist/assets/v1');
  const feed = fs.readFileSync(path.join(v1, 'c96d752d0-BOCqU7c2.js'), 'utf8');
  assert.equal(occurrences(feed, 'function u9(e,t,n,r,i,a){return e?b(jce,{kind:t.kind==="assistant"||t.kind==="assistantItem"?"reply":"row",'), 1);
  assert.equal(occurrences(feed, 'u9(gt,t,e.codesOwnView===!0?"code":"code_feed",S,_t,b(k9,'), 1);
  assert.equal(occurrences(feed, 'u9(l,t,"code_feed",O,u,b(k9,'), 1);
  assert.equal(occurrences(feed, 'lat=M(Jit)'), 1);
  assert.equal(occurrences(feed, 'dat=M(uat)'), 1);
  const child = fs.readFileSync(path.join(v1, 'c4ea84cb3-BcBaCeyg.js'), 'utf8');
  assert.equal(occurrences(child, 'C,S as ve,'), 1, 'c4ea84cb3 imports dat (C) and lat (S as ve)');
  // The row kind: a model-started workflow run is its turn's tool row; the local /workflow row and an optimistic send are not.
  assert.equal(Host.rowBoundaryKind({ id: 'w1', turnId: 't1', workflowRun: { id: 'run' } }), 'reply');
  assert.equal(Host.rowBoundaryKind({ id: 'local-workflow:run', workflowRun: { id: 'run' } }), 'row');
  assert.equal(Host.rowBoundaryKind({ id: 'p1', type: 'userMessage' }), 'row');
  assert.equal(Host.rowBoundaryKind({ id: 'a1', type: 'agentMessage' }), 'reply');
});

test('X7-19: a throwing WorkflowRow, pending-send row or /btw child row is replaced alone', async () => {
  const { WorkflowRow } = await server.ssrLoadModule('/src/source-workflow.jsx');
  const { SourceMessage } = await server.ssrLoadModule('/src/source-session.jsx');
  const { pendingSend, pendingUserRow } = await server.ssrLoadModule('/src/pending-send-model.mjs');
  const exploding = (base, key) => new Proxy(base, { get(target, name) { if (name === key) throw Error('row exploded'); return target[name]; } });
  const Throw = () => { throw Error('row exploded'); };
  const plain = (row) => React.createElement('p', { 'data-row': row }, row);
  const pending = pendingUserRow(pendingSend({ threadId: 's-x719', text: 'Queued hello', id: 'pending-1' }));
  const cases = [
    // main.jsx, the turn's model-started run: <SourceTranscriptRowBoundary …><WorkflowRow run={item.workflowRun} …/>
    { name: 'turn workflow', sessionId: 's-x719', item: { id: 'w1', turnId: 't1', workflowRun: exploding({ id: 'run-1' }, 'status') }, kind: 'reply',
      row: (item) => React.createElement(WorkflowRow, { run: item.workflowRun, warningLimits: null, onOpen() {} }) },
    // main.jsx, the local /workflow row (no turnId).
    { name: 'local workflow', sessionId: 's-x719', item: { id: 'local-workflow:run-2', workflowRun: exploding({ id: 'run-2' }, 'status') }, kind: 'row',
      row: (item) => React.createElement(WorkflowRow, { run: item.workflowRun, warningLimits: null, onOpen() {} }) },
    // main.jsx, the optimistic send (pendingUserRow): a user row.
    { name: 'pending send', sessionId: 's-x719', item: pending, kind: 'row', row: () => React.createElement(Throw) },
    // source-btw-pane.jsx, the child's own reply row, gated on the child's session.
    { name: 'btw child', sessionId: 'child-x719', item: exploding({ id: 'c1', type: 'agentMessage', turnId: 'own' }, 'text'), kind: 'reply',
      row: (item) => React.createElement(SourceMessage, { item, sessionKey: 'child-x719', isStreaming: false, turnStart: true }) },
  ];
  for (const c of cases) {
    await withDom(({ container, root }) => {
      act(() => root.render(React.createElement('div', { tabIndex: -1, 'data-feed': '' },
        React.createElement(Host.SourceTranscriptRowBoundary, { sessionId: c.sessionId, item: { id: 'above', type: 'userMessage' } }, plain('above')),
        React.createElement(Host.SourceTranscriptRowBoundary, { sessionId: c.sessionId, item: c.item }, c.row(c.item)),
        React.createElement(Host.SourceTranscriptRowBoundary, { sessionId: c.sessionId, item: { id: 'below', type: 'agentMessage' } }, plain('below')))));
      const crashed = container.findAll(node => node.hasAttribute?.('data-transcript-row-crashed'));
      assert.equal(crashed.length, 1, `${c.name}: only the failing row is replaced`);
      assert.equal(crashed[0].getAttribute('data-transcript-row-crashed'), c.kind, `${c.name}: the u9 kind`);
      assert.ok(crashed[0].textContent.includes(c.kind === 'reply' ? 'This response didn’t load.' : 'Couldn’t load this.'), c.name);
      assert.ok(container.find(node => node.getAttribute?.('data-row') === 'above'), `${c.name}: the row above still renders`);
      assert.ok(container.find(node => node.getAttribute?.('data-row') === 'below'), `${c.name}: the row below still renders`);
    });
  }
});

test('X7-19: main.jsx and the /btw pane mount the row boundary on workflow, pending-send and child rows', () => {
  const main = fs.readFileSync(path.join(app, 'src/main.jsx'), 'utf8');
  assert.equal(occurrences(main, 'if(item.workflowRun&&!item.turnId)return <SourceTranscriptRowBoundary key={item.id} sessionId={current} item={item}><WorkflowRow run={item.workflowRun}'), 1);
  assert.equal(occurrences(main, '{item.workflowRun ? <SourceTranscriptRowBoundary sessionId={current} item={item} isStreaming={isItemStreaming(state, current, item)}><WorkflowRow run={item.workflowRun}'), 1);
  assert.equal(occurrences(main, 'itemId:item.id}))}/></SourceTranscriptRowBoundary>'), 2);
  assert.equal(occurrences(main, 'return <SourceTranscriptRowBoundary key={`${current}:${row.id}`} sessionId={current} item={row}><Message item={row} sessionKey={current} isStreaming={false}'), 1);
  assert.equal(occurrences(main, '<WorkflowRow '), occurrences(main, '><WorkflowRow '), 'no transcript WorkflowRow outside a boundary');
  const btw = fs.readFileSync(path.join(app, 'src/source-btw-pane.jsx'), 'utf8');
  assert.equal(occurrences(btw, "import { SourceTranscriptRowBoundary } from './source-r3b-transcript.jsx';"), 1);
  assert.equal(occurrences(btw, '<SourceTranscriptRowBoundary sessionId={sessionId} item={item} isStreaming={isItemStreaming(state, sessionId, item)}>\n                <SourceMessage item={item}'), 1);
  assert.equal(occurrences(btw, 'onOpenFileRef={onOpenFile}/></SourceTranscriptRowBoundary>'), 1);
  assert.equal(occurrences(btw, '<SourceMessage '), 1);
});
