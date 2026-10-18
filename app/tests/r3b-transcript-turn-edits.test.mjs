import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import React, { act } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createRoot } from 'react-dom/client';
import { createServer } from 'vite';
import react from '@vitejs/plugin-react';

// R3b-transcript step 2: toolcards-06 (the Turn edits card's 'See all' form), toolcards-07 (its rows' stops) and
// toolcards-16 (the tool group's running mark across wire gaps: not applicable here, pinned). The card is the generated
// 2.42304.0 original (c96d752d0 N2e / M2e in src/generated/r3b-transcript/turn-edits-card.mjs) over the generated
// c856385e2 session file contexts; the host services come from src/source-r3b-transcript-adapters.jsx. SSR and a small
// fake DOM driven by React's own props (controlled events): no browser, no Electron, no network.
const app = path.resolve(import.meta.dirname, '..');
const directory = path.join(app, 'src/generated/r3b-transcript');
const manifest = JSON.parse(fs.readFileSync(path.join(directory, 'manifest.json'), 'utf8'));
const reference = path.resolve(app, '../reference', manifest.referenceSnapshot, 'ion-dist/assets/v1');
const raw = file => fs.readFileSync(path.join(reference, file), 'utf8');
const occurrences = (text, needle) => text.split(needle).length - 1;

let server, Host, Card, Access, Adapters, Expansion;
before(async () => {
  server = await createServer({ configFile: false, root: app, plugins: [react()], server: { middlewareMode: true, hmr: false, watch: null }, appType: 'custom', logLevel: 'error' });
  Host = await server.ssrLoadModule('/src/source-turn-edits.jsx');
  Card = await server.ssrLoadModule('/src/generated/r3b-transcript/turn-edits-card.mjs');
  Access = await server.ssrLoadModule('/src/generated/r3b-transcript/session-file-access.mjs');
  Adapters = await server.ssrLoadModule('/src/source-r3b-transcript-adapters.jsx');
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
  // base-ui's tooltip trigger also checks `instanceof Element` / `HTMLElement`.
  const names = ['window', 'document', 'ResizeObserver', 'getComputedStyle', 'Element', 'HTMLElement', 'Node'];
  const saved = names.map(name => [name, Object.getOwnPropertyDescriptor(globalThis, name)]);
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  Object.assign(dom.window, { Element: dom.Element, HTMLElement: dom.Element, Node: dom.Element, setTimeout, clearTimeout });
  for (const [name, value] of [['window', dom.window], ['document', dom.document], ['ResizeObserver', dom.window.ResizeObserver], ['getComputedStyle', dom.window.getComputedStyle],
    ['Element', dom.Element], ['HTMLElement', dom.Element], ['Node', dom.Element]])
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
// CdsIcon draws its glyph as a private-use character of the icon font.
const visible = container => container.textContent.replace(/[\uE000-\uF8FF]/g, '');
const press = element => ({ preventDefault() {}, stopPropagation() {}, isDefaultPrevented: () => false, currentTarget: element, target: element, button: 0, detail: 1, nativeEvent: {} });
const buttons = container => container.findAll(node => node.tagName === 'BUTTON');
const buttonNamed = (container, label) => buttons(container).find(node => visible(node) === label);
const click = element => act(() => reactProps(element).onClick(press(element)));
const fileRefs = container => container.findAll(node => node.hasAttribute?.('data-file-ref')).map(node => node.getAttribute('data-file-ref'));
const file = (path, additions = 1, deletions = 1) => ({ path, additions, deletions, calls: [{ id: `call:${path}` }] });
const edits = files => ({ files, additions: 0, deletions: 0 });
function recorder() {
  const calls = [];
  return { calls, reveal: path => calls.push(['reveal', path]), changes: () => calls.push(['changes']), open: path => calls.push(['open', path]), undo: () => calls.push(['undo']) };
}
const card = (props, log) => React.createElement(Host.SourceTurnEdits, { turnId: 't1', sessionKey: 's1', canViewChanges: true,
  onRevealInChanges: log.reveal, onOpenChanges: log.changes, onOpenFile: log.open, ...props });

test('generator: the card, its contexts and the toolcards-16 call sites are pinned to the installed 2.42304.0 chunks', () => {
  const card = manifest.modules.find(m => m.target === 'turn-edits-card.mjs');
  assert.deepEqual(card.exports, { N2e: 'TurnEditsCard', S0: 'useTurnEditStop', F2e: 'useTurnEditFileOpener', A2e: 'turnEditFolderHints' });
  const imports = Object.fromEntries(card.imports.map(i => [i.local, `${i.kind}:${i.name}`]));
  assert.equal(imports.s0, 'adapter:turnEditsSummary');
  assert.equal(imports.P2e, 'adapter:useArtifactPageLink');
  assert.equal(imports.Zu, 'adapter:useSessionPresetsMain');
  assert.equal(imports.os, 'view-tabs:CdsTooltip');
  assert.equal(imports.Ss, 'view-tabs:CdsButton');
  assert.equal(imports.Vg, 'generated:useOutsideRootsCheck');
  assert.equal(imports.Xge, 'generated:SessionFileBlock');
  assert.deepEqual(manifest.callSites.map(s => s.binding).filter(b => ['v2', 'p2', 'C0', 'I2e', 'C2e', 'ZM', 'v2e', 'uM', 'nat', 'He', 'Ve'].includes(b)),
    ['v2', 'p2', 'C0', 'I2e', 'C2e', 'ZM', 'v2e', 'uM', 'nat', 'He', 'Ve']);
  const pins = [
    ['c96d752d0-BOCqU7c2.js', 'N2e=M(M2e)'], ['c96d752d0-BOCqU7c2.js', 'S=y&&!i'], ['c96d752d0-BOCqU7c2.js', '"claudeai_cc_epitaxy_turn_edits_card"'],
    ['c96d752d0-BOCqU7c2.js', 'flex h-control min-w-0 items-center justify-between gap-sm px-xs'],
    ['c96d752d0-BOCqU7c2.js', 'if(e(i,!0))return"outside_roots";if(t===null&&n?.(i)===!1)return r??"plain"'],
    ['c96d752d0-BOCqU7c2.js', '$x(`turn-edits:${e[0]?.calls[0]?.id??""}`)'],
    ['c425fb3cf-CEgSkv8l.js', 'epitaxy-summary-card-control-text flex w-full select-text flex-col gap-1 rounded-card px-md py-xs'],
    ['shared-11-BuQ3CK5I.js', 'Zo="claudeai_cc_epitaxy_session_presets_main"'], ['c856385e2-DVsjb2QL.js', 'id:"XWwZmSJGiL"'],
    // c5da7eb42 WN: the read refusal exists only for remote sessions.
    ['c5da7eb42-B8cTG8SI.js', 'n=t&&e?.type==="remote"?e.id:null'],
    // toolcards-16.
    ['c96d752d0-BOCqU7c2.js', 's=e?.runningIds?.some(a)??!1'], ['c96d752d0-BOCqU7c2.js', 'runningIds:e.flatMap(e=>e.status==="running"?[e.id]:[])'],
    ['c96d752d0-BOCqU7c2.js', 'ye=m_()'], ['c96d752d0-BOCqU7c2.js', 'He=uM(Ve,650,ye?cv:void 0)'], ['c26fb8b6b-DfPeiuGP.js', 'Ve="__gb__2846116625"'],
  ];
  for (const [name, needle] of pins) assert.equal(occurrences(raw(name), needle), 1, `${name}: ${needle}`);
  // The card text CSS the chunk injects is the generated stylesheet, verbatim.
  const css = fs.readFileSync(path.join(directory, 'summary-card.css'), 'utf8');
  const rule = '.epitaxy-root .epitaxy-summary-card-control-text{font-size:var(--cds-font-size-body--own,var(--cds-font-size-body));line-height:var(--cds-leading-body--own,var(--cds-leading-body))}';
  assert.ok(css.includes(rule));
  assert.equal(occurrences(raw('c425fb3cf-CEgSkv8l.js'), rule), 1);
  assert.equal(Adapters.HOST_GATES.claudeai_cc_epitaxy_session_presets_main, true, 'D10');
});

test('toolcards-06: See all reveals the first file the Changes diff lists, else opens Changes; a row reveals its own file, else opens it in Files', async () => {
  await withDom(({ container, root }) => {
    const log = recorder();
    const files = [file('/w/a.js'), file('/w/b.js', 2, 0)];
    act(() => root.render(card({ edits: edits(files), fileInChanges: p => p === '/w/b.js', onUndo: log.undo }, log)));
    assert.match(visible(container), /^Edited 2 filesUndoa\.js\+1−1b\.js\+2−0See all\+3−1$/);
    click(buttonNamed(container, 'See all'));
    assert.deepEqual(log.calls, [['reveal', '/w/b.js']], 'the probe finds b.js, then the opener reveals it');
    click(buttonNamed(container, 'a.js'));
    click(buttonNamed(container, 'b.js'));
    click(buttonNamed(container, 'Undo'));
    assert.deepEqual(log.calls.slice(1), [['open', '/w/a.js'], ['reveal', '/w/b.js'], ['undo']]);
    // Nothing listed (a loaded diff without these files): See all opens the pane, rows go to Files.
    log.calls.length = 0;
    act(() => root.render(card({ edits: edits(files), fileInChanges: () => false }, log)));
    assert.equal(buttonNamed(container, 'See all'), undefined, 'E is false: the See all row keeps only the totals');
    assert.match(visible(container), /b\.js\+2−0\+3−1$/);
    click(buttonNamed(container, 'a.js'));
    assert.deepEqual(log.calls, [['open', '/w/a.js']]);
    // No Changes pane for this session: same, and no diff opener.
    log.calls.length = 0;
    act(() => root.render(card({ edits: edits(files), canViewChanges: false, fileInChanges: () => true }, log)));
    assert.equal(buttonNamed(container, 'See all'), undefined);
    click(buttonNamed(container, 'b.js'));
    assert.deepEqual(log.calls, [['open', '/w/b.js']]);
    // One file: its row opens the turn's changes (the first listed file) and carries Undo.
    log.calls.length = 0;
    act(() => root.render(card({ edits: edits([file('/w/a.js')]), fileInChanges: () => true, onUndo: log.undo }, log)));
    assert.equal(visible(container), 'a.jsUndo+1−1');
    click(buttonNamed(container, 'a.js'));
    assert.deepEqual(log.calls, [['reveal', '/w/a.js']]);
  });
});

test('toolcards-06: past three files the disclosure row reads See all, expands (opening Changes) and collapses; its state is the session group store', async () => {
  const files = ['a', 'b', 'c', 'd', 'e'].map(name => file(`/w/${name}.js`));
  const key = Expansion.groupExpansionKey('s1', 'turn-edits:call:/w/a.js');
  Expansion.toolGroupExpansion.clear();
  await withDom(({ container, root }) => {
    const log = recorder();
    act(() => root.render(card({ edits: edits(files), fileInChanges: () => true }, log)));
    assert.deepEqual(fileRefs(container), ['/w/a.js', '/w/b.js', '/w/c.js']);
    const disclosure = buttonNamed(container, 'See all');
    assert.equal(disclosure.getAttribute('aria-expanded'), 'false');
    click(disclosure);
    assert.deepEqual(log.calls, [['reveal', '/w/a.js']], 'expanding also opens the changes (x0: i || r?.())');
    assert.equal(Expansion.toolGroupExpansion.get(key), true);
    assert.deepEqual(fileRefs(container), ['/w/a.js', '/w/b.js', '/w/c.js', '/w/d.js', '/w/e.js']);
    const less = buttonNamed(container, 'Show less');
    assert.equal(less.getAttribute('aria-expanded'), 'true');
    assert.match(visible(container), /Show less\+5−5$/);
    // A remount keeps the expansion (the session's store, not the component).
    act(() => root.render(null));
    act(() => root.render(card({ edits: edits(files), fileInChanges: () => true }, log)));
    assert.equal(fileRefs(container).length, 5);
    click(buttonNamed(container, 'Show less'));
    assert.deepEqual(log.calls, [['reveal', '/w/a.js']], 'collapsing opens nothing');
    assert.equal(fileRefs(container).length, 3);
    // A row's Try again forgets the session's expansion (c96d752d0 d9 over tool-group-expansion.mjs).
    click(buttonNamed(container, 'See all'));
    assert.equal(fileRefs(container).length, 5);
    act(() => Expansion.toolGroupExpansion.forgetSession('s1'));
    assert.equal(fileRefs(container).length, 3);
  });
});

// toolcards-07: the generated S0 / b0 with the session file contexts set directly (as each kind of official session
// would), around the generated card.
function stopped(contexts, files) {
  const { opener = null, diff = null, placement = null, refusal = null, block = null } = contexts;
  const tree = React.createElement(Adapters.TurnEditsHost.Provider, { value: { sessionKey: 's1', canViewChanges: diff !== null } },
    React.createElement(Access.SessionFileOpenerProvider, { value: opener },
      React.createElement(Access.DiffOpenerProvider, { value: diff },
        React.createElement(Access.DiffPlacementProvider, { value: placement },
          React.createElement(Access.ReadRefusalProvider, { value: refusal },
            React.createElement(Access.SessionLinksBlockProvider, { value: block },
              React.createElement(Card.TurnEditsCard, { items: edits(files) })))))));
  return renderToStaticMarkup(tree);
}
function StopProbe({ path }) { return String(Card.useTurnEditStop()(path)); }
function stopOf(contexts, filePath) {
  const { opener = null, diff = null, placement = null, refusal = null, block = null } = contexts;
  return renderToStaticMarkup(React.createElement(Access.SessionFileOpenerProvider, { value: opener },
    React.createElement(Access.DiffOpenerProvider, { value: diff }, React.createElement(Access.DiffPlacementProvider, { value: placement },
      React.createElement(Access.ReadRefusalProvider, { value: refusal }, React.createElement(Access.SessionLinksBlockProvider, { value: block },
        React.createElement(StopProbe, { path: filePath })))))));
}

test('toolcards-07: S0 — outside_roots under a read refusal, the links block or plain without a Files opener, else openable', () => {
  const open = () => {}, inDiff = p => p === '/w/listed.js';
  const diff = (p, o) => inDiff(p);
  const remote = p => !p.startsWith('/w/');
  // A local session (this host): a Files opener, no read refusal — every row opens.
  assert.equal(stopOf({ opener: open }, '/elsewhere/x.js'), 'undefined');
  // A remote session's read refusal (c5da7eb42 WN): outside its roots, unless the Changes diff places the file.
  assert.equal(stopOf({ opener: open, refusal: remote }, '/elsewhere/x.js'), 'outside_roots');
  assert.equal(stopOf({ opener: open, refusal: remote, diff, placement: p => p === '/elsewhere/x.js' }, '/elsewhere/x.js'), 'undefined');
  assert.equal(stopOf({ opener: open, refusal: remote }, '/w/in.js'), 'undefined');
  // No Files opener: a file the diff does not place stops with the session's links block, else plain.
  assert.equal(stopOf({ diff, placement: inDiff }, '/w/other.js'), 'plain');
  assert.equal(stopOf({ diff, placement: inDiff, block: 'resumable' }, '/w/other.js'), 'resumable');
  assert.equal(stopOf({ diff, placement: inDiff }, '/w/listed.js'), 'undefined');
  assert.equal(stopOf({}, '/w/any.js'), 'undefined', 'no placement answer: not stopped');
});

test('toolcards-07: a stopped row is static; any stop but plain wraps it in the reason (Bn over the disabled-reason wrapper)', () => {
  const remote = p => !p.startsWith('/w/');
  const outside = stopped({ opener: () => {}, refusal: remote }, [file('/w/a.js'), file('/elsewhere/x.js')]);
  const rowOf = (html, ref) => html.slice(html.lastIndexOf('<li', html.indexOf(`data-file-ref="${ref}"`)), html.indexOf('</li>', html.indexOf(`data-file-ref="${ref}"`)));
  assert.match(rowOf(outside, '/w/a.js'), /<span class="contents" data-file-ref="\/w\/a\.js"><button type="button"/);
  const blocked = rowOf(outside, '/elsewhere/x.js');
  // Uc's classes merged (cdsClassNames) with Bn's wrapper class and b0's "flex min-w-0 grow", as in the original.
  assert.match(blocked, /<span tabindex="0" aria-describedby="[^"]+" data-cds-disabled-reason-wrapper="" class="outline-none [^"]*transition-shadow duration-fast [^"]*rounded-sm focus-visible:outline-hidden focus-visible:shadow-focus flex min-w-0 grow"[^>]*><span class="contents" data-file-ref="\/elsewhere\/x\.js"><span class="flex min-h-7 min-w-0 grow items-center/);
  assert.match(blocked, /<span id="[^"]+" hidden="" data-cds-disabled-reason="">This file is outside this session’s folders, so it can’t be opened here\.<\/span>/);
  assert.ok(!blocked.includes('<button'), 'no opener on a stopped row');
  // Plain: static, no reason.
  const plain = stopped({ diff: () => false, placement: () => false }, [file('/w/a.js'), file('/w/b.js')]);
  assert.ok(!plain.includes('data-cds-disabled-reason-wrapper'));
  assert.match(rowOf(plain, '/w/a.js'), /<span class="contents" data-file-ref="\/w\/a\.js"><span class="flex min-h-7 min-w-0 grow items-center/);
  // The links block's reason.
  const resumable = stopped({ diff: () => false, placement: () => false, block: 'resumable' }, [file('/w/a.js'), file('/w/b.js')]);
  assert.match(resumable, /data-cds-disabled-reason="">This session isn’t running, so its files can’t be opened\. Send a message to start it again\.<\/span>/);
  // This host (SourceTurnEdits) provides no read refusal: a file outside the session folders still opens in Files,
  // whose own outside_root card answers (host difference, as an official local session).
  const host = renderToStaticMarkup(card({ edits: edits([file('/w/a.js'), file('/elsewhere/x.js')]), fileInChanges: () => false }, recorder()));
  assert.ok(!host.includes('data-cds-disabled-reason-wrapper'));
  assert.match(host, /data-file-ref="\/elsewhere\/x\.js"><button type="button"/);
});

test('R4f-graph G2: the embedded card renders through the original CDS Collapsible; a folder hint reads the view-tabs direction', async () => {
  const { DirectionContext } = await server.ssrLoadModule('/src/generated/view-tabs/vendor-frame-DfPJ1QmD.js');
  const render = (props, direction) => {
    const card = React.createElement(Adapters.TurnEditsHost.Provider, { value: { sessionKey: 's1', canViewChanges: true } },
      React.createElement(Access.SessionFileOpenerProvider, { value: () => {} }, React.createElement(Card.TurnEditsCard, props)));
    return renderToStaticMarkup(direction ? React.createElement(DirectionContext.Provider, { value: { direction } }, card) : card);
  };
  // M2e `M = i && !w`: the embedded form is Qw.Root (rendered as the list wrapper) with the file list in Qw.Panel. This
  // host never embeds the card; the old adapter refused to render it, the original renders it closed.
  const embedded = render({ items: edits(['a', 'b', 'c', 'd', 'e'].map(name => file(`/w/${name}.js`))), embedded: true });
  assert.match(embedded, /^<div class="flex w-full select-text flex-col gap-0\.5" data-closed="" data-cds="Collapsible"><ul role="list"/);
  assert.match(embedded, /<button type="button" class="group\/disclosure [^"]*" tabindex="0" aria-disabled="false" aria-expanded="false">/);
  assert.match(embedded, />5 files</);
  assert.ok(!embedded.includes('data-file-ref'), 'the closed panel lists no files');
  // b0 `x() === "rtl"`: under the view-tabs DirectionContext an RTL card isolates the folder hint and keeps the name LTR.
  const hinted = { items: edits([file('/w/src/a/index.js'), file('/w/src/b/index.js')]) };
  const rowOf = html => html.slice(html.indexOf('data-file-ref="/w/src/a/index.js"'), html.indexOf('</li>', html.indexOf('data-file-ref="/w/src/a/index.js"')));
  assert.match(rowOf(render(hinted, 'rtl')), /<span class="min-w-0 truncate text-primary" dir="ltr">index\.js<span class="ms-xs text-footnote text-muted-as-secondary"><span class="sr-only">, <\/span><bdi>a<\/bdi><\/span>/);
  assert.match(rowOf(render(hinted, 'ltr')), /<span class="min-w-0 truncate text-primary">index\.js<span class="ms-xs text-footnote text-muted-as-secondary"><span class="sr-only">, <\/span>a<\/span>/);
  assert.equal(render(hinted), render(hinted, 'ltr'), 'no provider reads as ltr');
});

test('folder hints of repeated names (the original A2e / r0 over shared-28 HO)', () => {
  const hints = files => [...Card.turnEditFolderHints(files.map(p => ({ path: p })))];
  assert.deepEqual(hints(['/w/src/a/index.js', '/w/src/b/index.js', '/w/x.js']), [['/w/src/a/index.js', 'a'], ['/w/src/b/index.js', 'b']]);
  assert.deepEqual(hints(['/w/a/lib/util.ts', '/w/b/lib/util.ts']), [['/w/a/lib/util.ts', 'a/lib'], ['/w/b/lib/util.ts', 'b/lib']]);
  assert.deepEqual(hints(['/w/index.js', '/w/b/index.js']), [['/w/index.js', '/w'], ['/w/b/index.js', 'b']]);
  assert.deepEqual(hints(['/p/w/index.js', '/p/w/b/index.js']), [['/p/w/index.js', 'w'], ['/p/w/b/index.js', 'b']]);
  assert.deepEqual(hints(['/a/index.js', '/b/index.js']), [['/a/index.js', '/a'], ['/b/index.js', '/b']]);
  assert.deepEqual(hints(['C:\\r\\a\\x.js', 'C:\\r\\b\\x.js']).map(([, hint]) => hint), ['a', 'b'], 'Windows separators');
  assert.equal(hints(['/w/a.js', '/w/b.js']).length, 0, 'unique names get no hint');
  assert.equal(hints(['/w/p/x.js', '/w/p/x.js']).length, 0, 'identical folders get no hint');
});

test('host wiring: main.jsx passes the Changes / Files services, zh-CN has the new strings, the old hand port is gone', async () => {
  const main = fs.readFileSync(path.join(app, 'src/main.jsx'), 'utf8');
  assert.equal(occurrences(main, '<SourceTurnEdits edits={edits} turnId={item.turnId} sessionKey={current}'), 1);
  for (const wire of ['canViewChanges={canViewChanges} fileInChanges={turnFileInChanges}',
    'onRevealInChanges={(path) => { requestDiffReveal(path); setPanel("changes"); }} onOpenChanges={() => setPanel("changes")}',
    'onOpenFile={current ? (path) => openFileRef({ path: pathChoices(path, workdir)?.relative || path }) : undefined} />;'])
    assert.equal(occurrences(main, wire), 1, wire);
  assert.ok(!main.includes('onViewFile='), 'the old onView / onViewFile props are gone');
  assert.equal(fs.existsSync(path.join(app, 'src/source-turn-edits.css')), false);
  const zh = (await import('../electron/i18n/zh-CN/session.mjs')).default;
  for (const key of ['{n, plural, one {Edited a file} other {Edited # files}}', 'Ask Claude to undo this turn’s file changes',
    'This file is outside this session’s folders, so it can’t be opened here.']) assert.equal(typeof zh[key], 'string', key);
  const all = (await import('../electron/i18n/zh-CN/index.mjs')).default;
  for (const key of ['See all', 'Show less', 'Show {count} more', 'View this turn’s changes', 'Undo']) assert.equal(typeof all[key], 'string', key);
});

test('toolcards-16: with turnStatusRows the tool group\'s held running key takes uM\'s rest options (cv)', () => {
  // v2e: `He = uM(Ve, 650, ye ? cv : void 0)` with ye = c26fb8b6b We and cv = cb6930dae Za {restKey: "settled",
  // fallHoldMs: 650}. The host serves the gate on (host-growthbook.mjs, user ruling): leaving "settled" is immediate and
  // settling waits 650 ms. The running candidate's runningIds hold is the generated XAe / ZM (transcript-rows).
  const states = fs.readFileSync(path.join(app, 'src/source-transcript-states.jsx'), 'utf8');
  assert.match(states, /__gb__2846116625 gate \(cfc63964b b\(\), default false\) is on, else \{none:"route"\}\. The host serves the gate on/);
  const group = fs.readFileSync(path.join(app, 'src/source-tool-group.jsx'), 'utf8');
  assert.match(group, /if \(rest && shown\.key === 'settled'\) \{ setShown\(\{ key, at: performance\.now\(\) \}\); return; \}/);
  assert.match(group, /const key = state === 'busy' && running \? running\.id : 'settled', heldKey = useHeldKey\(key, statusRows\);/);
  assert.match(fs.readFileSync(path.join(app, 'src/generated/transcript-rows/turn-mark.mjs'), 'utf8'), /var Za = \{ restKey: Xa, fallHoldMs: 650 \};/);
  assert.match(fs.readFileSync(path.join(app, 'src/generated/transcript-rows/group-status.mjs'), 'utf8'), /runningIds\?\.some\(a\)/);
  assert.equal(occurrences(fs.readFileSync(path.join(app, 'src/main.jsx'), 'utf8'), 'liveRunningToolIds'), 0, 'the live running ids come from the transcript scope (transcript-rows-model.mjs)');
});
