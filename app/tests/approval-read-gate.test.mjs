// toolcards-01: the approval card's read gate for an MCP tool's arguments (2.42304.0 c96d752d0 Kk rowsReadGate loose,
// Rj's held / Allow bookkeeping, Mj's "What Claude sent" rows block, UDe = generated ApprovalReadRows).
//  1. approval-read-gate-model.mjs (Rj st/gt/yt/bt/Et/At/pn) as pure functions;
//  2. SSR of SourceApprovalCardView in the states a store can be in (held, unlaid, read, not gated);
//  3. a controlled mount of the generated ApprovalReadRows in a small fake DOM (rAF, IntersectionObserver,
//     ResizeObserver, getComputedStyle, geometry) feeding the model, the way the card wires it.
import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import React, { act } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createRoot } from 'react-dom/client';
import { createServer } from 'vite';
import react from '@vitejs/plugin-react';
import { approvalCardModel } from '../src/approval-card-model.mjs';
import { createReadGateStore, nextReadGateReplay, readGateAllowIntent, readGateKey, readGateView, recordReadState, recordRowsFit } from '../src/approval-read-gate-model.mjs';
import { ApprovalReadRows } from '../src/generated/code-current/approval-read-gate.mjs';

const app = path.resolve(import.meta.dirname, '..');
const HINT = 'Scroll through what Claude sent to allow it.';
const gate = { hint: HINT, loose: true };
const METHOD = 'mcpServer/elicitation/request';
const toolApproval = (meta = {}) => ({ id: 9, method: METHOD, bridgeApproval: { connectionId: 'c', instanceId: 'i-1' },
  params: { threadId: 't', turnId: 'u', serverName: 'probe', mode: 'form', message: 'Allow the probe MCP server to run tool "write_note"?',
    requestedSchema: { type: 'object', properties: {} },
    _meta: { codex_approval_kind: 'mcp_tool_call', persist: ['session', 'always'], tool_params: { text: 'hi' },
      tool_params_display: [{ name: 'text', value: 'hi', display_name: 'Text' }], ...meta } } });

// ---- 1. the model ------------------------------------------------------------------------------------------------

test('st: repeats are ignored, "unlaid" never replaces a known state, hinted latches on unread, fits survives', () => {
  const store = createReadGateStore();
  let renders = 0;
  store.subscribe(() => { renders += 1; });
  assert.equal(recordReadState(store, null, 'read'), false, 'no gate key, no state');
  assert.equal(recordReadState(store, 'k', 'unlaid'), true);
  assert.deepEqual(store.get(), { key: 'k', state: 'unlaid', hinted: false });
  assert.equal(recordReadState(store, 'k', 'unread'), true);
  assert.deepEqual(store.get(), { key: 'k', state: 'unread', hinted: true });
  assert.equal(recordReadState(store, 'k', 'unread'), false);
  assert.equal(recordReadState(store, 'k', 'unlaid'), false, 'collapsing the rows later does not hold them');
  assert.equal(recordRowsFit(store, 'k', true), true);
  assert.equal(recordReadState(store, 'k', 'waiting'), true);
  assert.deepEqual(store.get(), { key: 'k', state: 'waiting', hinted: true, fits: true });
  assert.equal(renders, 4);
  // A new key starts over (a changed request in the same card).
  assert.equal(recordReadState(store, 'k2', 'unlaid'), true);
  assert.deepEqual(store.get(), { key: 'k2', state: 'unlaid', hinted: false });
});

test('gt: a fit is recorded for the current key only, a misfit sticks, and nothing changes once read', () => {
  const store = createReadGateStore();
  assert.equal(recordRowsFit(store, 'k', false), false, 'no state for the key yet');
  recordReadState(store, 'k', 'unread');
  assert.equal(recordRowsFit(store, 'other', false), false);
  assert.equal(recordRowsFit(store, 'k', false), true);
  assert.equal(recordRowsFit(store, 'k', true), false, '`t.fits !== !1 && e`: a misfit sticks');
  assert.equal(store.get().fits, false);
  recordReadState(store, 'k', 'read');
  assert.equal(recordRowsFit(store, 'k', true), false);
  assert.equal(store.get().fits, false);
});

test('yt/bt/At: loose rows hold only when they cannot show whole or are not laid out', () => {
  const view = (snapshot, replay) => readGateView({ gate, key: 'k', snapshot, replay });
  assert.deepEqual(readGateView({ gate: undefined, key: 'k', snapshot: null }).gated, false);
  assert.equal(readGateView({ gate, key: null, snapshot: null }).gated, false);
  // Before the first report: unread but not held, nothing shown.
  const fresh = view(null);
  assert.deepEqual([fresh.unread, fresh.held, fresh.allowDisabled, fresh.hintShown, fresh.liveRegion, fresh.liveText, fresh.heldLabel, fresh.armSuffix],
    [true, false, false, false, true, '', false, '']);
  // Visible but not yet read: still loose.
  assert.deepEqual([view({ key: 'k', state: 'unread', hinted: true }).held, view({ key: 'k', state: 'unread', hinted: true }).allowDisabled], [false, false]);
  // The card's own scroller doesn't fit them: held, the allows disabled with the hint, the label over the rows.
  const misfit = view({ key: 'k', state: 'unread', hinted: true, fits: false });
  assert.deepEqual([misfit.held, misfit.allowDisabled, misfit.disabledReason, misfit.heldLabel, misfit.hintShown, misfit.hintInvisible, misfit.liveRegion, misfit.armSuffix],
    [true, true, HINT, true, true, false, false, '\nheld-look']);
  // Read while held: the allows open; the hold (and its look) stays.
  const read = view({ key: 'k', state: 'read', hinted: true, fits: false });
  assert.deepEqual([read.unread, read.held, read.allowDisabled, read.hintShown, read.hintInvisible], [false, true, false, true, true]);
  // Not laid out: held; in the card presentation the hint line is reserved (invisible) before any unread.
  const unlaid = view({ key: 'k', state: 'unlaid', hinted: false });
  assert.deepEqual([unlaid.held, unlaid.allowDisabled, unlaid.hintShown, unlaid.hintInvisible], [true, true, true, true]);
  assert.equal(readGateView({ gate, key: 'k', snapshot: { key: 'k', state: 'unlaid', hinted: false }, presentation: 'dock' }).hintShown, false);
  // A strict gate always holds (the desktop terminal connector; not reachable from OpenClaude's cards).
  assert.equal(readGateView({ gate: { hint: HINT }, key: 'k', snapshot: { key: 'k', state: 'unread', hinted: true } }).allowDisabled, true);
  // A snapshot for an older key is ignored.
  assert.equal(view({ key: 'old', state: 'read' }).unread, true);
});

test('Et/St: a replay shows the hint line and fills the live region, alternating a NBSP so a repeat is re-announced', () => {
  const unread = { key: 'k', state: 'unread', hinted: true };
  let replay = null;
  replay = nextReadGateReplay(replay, 'k');
  assert.deepEqual(replay, { key: 'k', count: 1 });
  let view = readGateView({ gate, key: 'k', snapshot: unread, replay });
  assert.deepEqual([view.hintShown, view.hintInvisible, view.liveText], [true, false, HINT]);
  replay = nextReadGateReplay(replay, 'k');
  view = readGateView({ gate, key: 'k', snapshot: unread, replay });
  assert.equal(view.liveText, `${HINT} `);
  assert.deepEqual(nextReadGateReplay(replay, 'k2'), { key: 'k2', count: 1 });
  // Once read the live text empties and the hint line goes invisible.
  view = readGateView({ gate, key: 'k', snapshot: { ...unread, state: 'read' }, replay });
  assert.deepEqual([view.liveText, view.hintShown, view.hintInvisible], ['', true, true]);
});

test('Nt/Rt/Cp: clicks replay while loose and unread; from the keyboard only Allow once does; nothing while held', () => {
  const intent = (current, extra = {}) => readGateAllowIntent({ gate, key: 'k', current, ...extra });
  assert.equal(readGateAllowIntent({ gate: undefined, key: null, current: null }), 'proceed');
  assert.equal(intent({ key: 'k', state: 'read' }), 'proceed');
  assert.equal(intent({ key: 'k', state: 'read' }, { via: 'keyboard' }), 'proceed');
  const unread = { key: 'k', state: 'unread', hinted: true };
  assert.equal(intent(unread), 'replay');
  assert.equal(intent(unread, { via: 'keyboard', primary: true }), 'replay');
  assert.equal(intent(unread, { via: 'keyboard', primary: false }), 'ignore', 'allowPersistent: ht ? () => void 0');
  assert.equal(intent({ ...unread, fits: false }), 'ignore', 'held: the allows are disabled');
  assert.equal(intent({ ...unread, fits: false }, { via: 'keyboard', primary: true }), 'ignore', 'allowOnce: Nn.disabled');
  assert.equal(intent({ key: 'k', state: 'waiting' }), 'ignore', 'blocked until read, but Et only replays an unread');
  assert.equal(intent(null), 'ignore');
  assert.equal(intent({ key: 'old', state: 'read' }), 'ignore');
});

test('rt: the key is the card identity plus the rows text; no gate, no key', () => {
  const model = approvalCardModel(toolApproval());
  assert.equal(readGateKey('ticket', model), 'ticket\nrows\nText: hi');
  assert.equal(readGateKey({ object: true }, model), '\nrows\nText: hi');
  assert.equal(readGateKey('ticket', approvalCardModel({ id: 1, method: 'item/commandExecution/requestApproval', params: { command: 'ls' } })), null);
});

// ---- 2. SSR of the card ------------------------------------------------------------------------------------------

let server, A;
before(async () => {
  server = await createServer({ configFile: false, root: app, plugins: [react()],
    server: { middlewareMode: true, hmr: false, watch: null }, appType: 'custom', logLevel: 'error' });
  A = await server.ssrLoadModule('/src/source-approval-card.jsx');
});
after(() => server?.close());

const ARM = 'ticket-1';
const keyFor = request => readGateKey(ARM, approvalCardModel(request));
const card = (request, snapshot) => {
  const store = createReadGateStore();
  if (snapshot) store.set({ key: keyFor(request), ...snapshot });
  return renderToStaticMarkup(React.createElement(A.SourceApprovalCardView, { request, armKey: ARM, onAction: () => {}, readGateStore: store }));
};
const allowButtons = html => [...html.matchAll(/<button[^>]*data-approval-action="(accept[^"]*)"[^>]*>/g)].map(match => match[0]);

test('SSR, before any report: the rows sit in UDe and the q block, the allows open, the live region empty', () => {
  const html = card(toolApproval());
  assert.match(html, /<section[^>]*data-approval-presentation="card"[^>]*data-approval-card-root=""/);
  assert.match(html, /<div data-testid="approval-read-rows"><div class="flex flex-col gap-1 rounded bg-alpha-1 px-lg py-md"><div role="group" aria-label="What Claude sent" data-approval-value="" class="text-code text-secondary whitespace-pre-wrap break-words select-text \[unicode-bidi:plaintext\]">Text: hi<\/div><\/div><\/div>/);
  assert.equal(html.includes('sac-code'), false, 'the gated rows are not the local pre block');
  assert.equal(html.includes('aria-hidden="true" class="text-footnote text-muted-as-secondary"'), false, 'no held label');
  assert.match(html, /<div class="flex flex-col gap-sm"><p aria-live="polite" class="sr-only"><\/p><footer class="sac-actions">/);
  assert.equal(html.includes('approval-read-hint'), false);
  const allows = allowButtons(html);
  assert.equal(allows.length, 3, 'Always allow, Allow for this session, Allow once');
  for (const button of allows) assert.doesNotMatch(button, / disabled=""/);
  assert.equal(html.includes('source-tooltip-disabled-trigger'), false);
});

test('SSR, held (the card scroller cannot show the rows whole): every allow is disabled with the hint; Deny is not', () => {
  const html = card(toolApproval(), { state: 'unread', hinted: true, fits: false });
  assert.match(html, /<div class="flex flex-col gap-1 rounded bg-alpha-1 px-lg py-md"><span aria-hidden="true" class="text-footnote text-muted-as-secondary">What Claude sent<\/span><div role="group"/);
  // No aria-live replay while held; the hint line shows (not invisible).
  assert.equal(html.includes('aria-live'), false);
  assert.match(html, /<p aria-hidden="true" data-testid="approval-read-hint" class="epitaxy-approval-read-hint text-footnote text-muted-as-secondary text-end text-balance">Scroll through what Claude sent to allow it\.<\/p><footer/);
  const allows = allowButtons(html);
  assert.equal(allows.length, 3);
  for (const button of allows) {
    assert.match(button, / disabled=""/);
    assert.match(button, /aria-disabled="true"/);
  }
  // Rj Vt stays (disabled) beside Allow once while held — not hidden.
  assert.match(html, /data-approval-action="acceptAlways"/);
  assert.equal(html.split('class="source-tooltip-disabled-trigger"').length - 1, 3);
  assert.equal(html.split('data-cds-disabled-reason="">Scroll through what Claude sent to allow it.</span>').length - 1, 3);
  assert.doesNotMatch(html.match(/<button[^>]*data-approval-action="decline"[^>]*>/)[0], / disabled=""/);
});

test('SSR, unlaid / read / other cards', () => {
  const unlaid = card(toolApproval(), { state: 'unlaid', hinted: false });
  assert.match(unlaid, /data-testid="approval-read-hint" class="[^"]* invisible"/);
  for (const button of allowButtons(unlaid)) assert.match(button, / disabled=""/);
  const read = card(toolApproval(), { state: 'read', hinted: true, fits: true });
  for (const button of allowButtons(read)) assert.doesNotMatch(button, / disabled=""/);
  assert.equal(read.includes('What Claude sent</span>'), false);
  assert.match(read, /<p aria-live="polite" class="sr-only"><\/p>/);
  // Read after a hold: allows open, the hold's label and hint line stay (invisible).
  const heldRead = card(toolApproval(), { state: 'read', hinted: true, fits: false });
  for (const button of allowButtons(heldRead)) assert.doesNotMatch(button, / disabled=""/);
  assert.match(heldRead, /What Claude sent<\/span>/);
  assert.match(heldRead, /approval-read-hint" class="[^"]* invisible"/);
  // No arguments, a server's own confirm, a plain command: no gate, the footer as before.
  for (const request of [toolApproval({ tool_params: {}, tool_params_display: [] }),
    { ...toolApproval(), params: { ...toolApproval().params, message: 'Proceed?', _meta: {} } },
    { id: 2, method: 'item/commandExecution/requestApproval', params: { command: 'ls', threadId: 't' } }]) {
    const html = card(request);
    assert.equal(html.includes('approval-read-rows'), false);
    assert.equal(html.includes('flex flex-col gap-sm'), false);
    assert.equal(html.includes('aria-live'), false);
  }
});

test('the dev server card renders the original title and description line', () => {
  const request = { id: 3, method: 'item/commandExecution/requestApproval', params: { threadId: 't', cwd: '/w', command: 'npm run dev',
    codeDesktop: { agentTool: { kind: 'preview-server', name: 'web', port: 5173, portMayReassign: false } } } };
  const html = renderToStaticMarkup(React.createElement(A.SourceApprovalCardView, { request, armKey: ARM, onAction: () => {} }));
  assert.match(html, /<span data-clamp="">Allow DeepSeek to <span class="sac-em">start<\/span> <span class="sac-em">web<\/span>\?<\/span>/);
  assert.match(html, /<p class="sac-context" data-context="description">Runs in \/w on port 5173<\/p>/);
  assert.equal(html.includes('approval-read-rows'), false, 'a dev server card has no rows gate');
  // Kk preview_start (c96d752d0) and the main-process ask (index.chunk zIn / HIn) this mirrors.
  const official = fs.readFileSync(path.resolve(app, '../reference/installed-2.42304.0-20261017/ion-dist/assets/v1/c96d752d0-BOCqU7c2.js'), 'utf8');
  for (const text of ['defaultMessage:"start",id:"zTylMMruGq"', 'defaultMessage:"start a dev server",id:"/dKfET3Xgr"', 'clampTitle:!0,overrideDescription:i'])
    assert.ok(official.includes(text), text);
  const main = fs.readFileSync(path.resolve(app, '../reference/installed-2.42304.0-20261017/asar/.vite/build/index.chunk-muI2IV6k.js'), 'utf8');
  for (const text of ['function zIn(e){return{command:e.command,args:e.args,cwd:e.cwd,port:e.port', 'c=i?.portMayReassign?{...o,portMayReassign:!0}:o'])
    assert.ok(main.includes(text), text);
});

test('source and CSS: the official strings, the generated component, no local colors for the gate', () => {
  const view = fs.readFileSync(path.join(app, 'src/source-approval-card.jsx'), 'utf8');
  assert.match(view, /import \{ ApprovalReadRows \} from "\.\/generated\/code-current\/approval-read-gate\.mjs";/);
  for (const text of ['"flex flex-col gap-1 rounded bg-alpha-1 px-lg py-md"', '"text-footnote text-muted-as-secondary"', '"flex flex-col gap-sm"',
    'epitaxy-approval-read-hint text-footnote text-muted-as-secondary text-end text-balance', 'aria-live="polite" className="sr-only"'])
    assert.ok(view.includes(text), text);
  const css = fs.readFileSync(path.join(app, 'src/source-approval-card.css'), 'utf8');
  // The one official gate rule (c96d752d0 injected style "c9bddf7be"): the hint centres in the 420px card query.
  // Comments are stripped so the provenance note does not count; the rule must sit in the card's 420px block, and
  // nothing else may style the gate by hand.
  const cssRules = css.replace(/\/\*[\s\S]*?\*\//g, '');
  const narrow = cssRules.match(/@container source-approval \(width <= 420px\) \{((?:[^{}]|\{[^{}]*\})*)\}/);
  assert.ok(narrow, 'the card 420px container block');
  assert.match(narrow[1], /\n\s*\.epitaxy-approval-read-hint \{ text-align: center; \}\n/);
  assert.equal(cssRules.match(/approval-read/g)?.length, 1, 'only the official hint rule names the gate');
  assert.equal(/held-look|What Claude/.test(cssRules), false, 'no hand-written gate styles');
  // The original wording in the 2.42304.0 chunk.
  const official = fs.readFileSync(path.resolve(app, '../reference/installed-2.42304.0-20261017/ion-dist/assets/v1/c96d752d0-BOCqU7c2.js'), 'utf8');
  assert.ok(official.includes('.epitaxy-approval-actions-inline{justify-content:flex-end}@container (width<=420px){.epitaxy-approval-read-hint{text-align:center}}"'),
    'the official hint rule');
  for (const text of ['"Scroll through what Claude sent to allow it.",id:"5yDiNk/eg2"', 'defaultMessage:"What Claude sent",id:"GDBzSVQhts"',
    'rowsReadGate:{hint:e.formatMessage(gD.rowsHint),..._?{}:{loose:!0}', 'className:"flex flex-col gap-1 rounded bg-alpha-1 px-lg py-md"', `held-look`])
    assert.ok(official.includes(text), text);
});

// ---- 3. controlled mount of the generated UDe ---------------------------------------------------------------------

function createDom({ innerHeight = 600 } = {}) {
  const events = {
    addEventListener(type, fn, options) { (this.__l ??= new Map()).set(type, [...(this.__l.get(type) ?? []), fn]); void options; },
    removeEventListener(type, fn) { const list = this.__l?.get(type); if (list) this.__l.set(type, list.filter(entry => entry !== fn)); },
    dispatchEvent(event) { for (const fn of [...(this.__l?.get(event.type) ?? [])]) fn.call(this, event); return true; },
  };
  const document = Object.assign(Object.create(events), { nodeType: 9, nodeName: '#document', activeElement: null });
  class Element {
    constructor(tag) {
      Object.assign(this, { tagName: tag.toUpperCase(), nodeName: tag.toUpperCase(), localName: tag, nodeType: 1, namespaceURI: 'http://www.w3.org/1999/xhtml',
        ownerDocument: document, childNodes: [], parentNode: null, attributes: new Map(), layout: null });
      this.style = {};
    }
    get parentElement() { return this.parentNode?.nodeType === 1 ? this.parentNode : null; }
    get firstChild() { return this.childNodes[0] ?? null; }
    get nextSibling() { const siblings = this.parentNode?.childNodes; return siblings ? siblings[siblings.indexOf(this) + 1] ?? null : null; }
    set textContent(value) { this.childNodes = value ? [document.createTextNode(value)] : []; }
    setAttribute(name, value) { this.attributes.set(name, String(value)); }
    getAttribute(name) { return this.attributes.has(name) ? this.attributes.get(name) : null; }
    hasAttribute(name) { return this.attributes.has(name); }
    removeAttribute(name) { this.attributes.delete(name); }
    appendChild(child) { child.parentNode?.removeChild?.(child); this.childNodes.push(child); child.parentNode = this; return child; }
    insertBefore(child, ref) { child.parentNode?.removeChild?.(child); const index = ref ? this.childNodes.indexOf(ref) : -1; if (index < 0) this.childNodes.push(child); else this.childNodes.splice(index, 0, child); child.parentNode = this; return child; }
    removeChild(child) { const index = this.childNodes.indexOf(child); if (index >= 0) this.childNodes.splice(index, 1); child.parentNode = null; return child; }
    contains(node) { for (let at = node; at; at = at.parentNode) if (at === this) return true; return false; }
    closest(selector) { const name = /^\[([\w-]+)\]$/.exec(selector)?.[1]; for (let at = this; at?.nodeType === 1; at = at.parentNode) if (name && at.hasAttribute(name)) return at; return null; }
    querySelector() { return null; } // no <li> rows: UDe measures one line for the head
    get clientHeight() { return this.layout?.clientHeight ?? 0; }
    get clientWidth() { return this.layout?.clientWidth ?? 0; }
    get scrollHeight() { return this.layout?.scrollHeight ?? this.clientHeight; }
    getBoundingClientRect() {
      const { top = 0, height = 0, left = 0, width = 0 } = this.layout?.rect?.() ?? {};
      return { top, bottom: top + height, left, right: left + width, width, height };
    }
  }
  Object.assign(Element.prototype, events);
  Object.assign(document, {
    createElement: tag => new Element(tag),
    createTextNode: text => ({ nodeType: 3, nodeName: '#text', textContent: text, nodeValue: text, ownerDocument: document, parentNode: null }),
  });
  document.documentElement = new Element('html');
  document.documentElement.parentNode = document;
  document.body = document.documentElement.appendChild(new Element('body'));
  const frames = new Map(); let nextFrame = 0;
  const observers = { resize: [], intersection: [] };
  const window = Object.assign(Object.create(events), {
    document, innerHeight, innerWidth: 800, HTMLIFrameElement: class {},
    requestAnimationFrame(fn) { frames.set(++nextFrame, fn); return nextFrame; },
    cancelAnimationFrame(id) { frames.delete(id); },
    getComputedStyle: element => ({ lineHeight: element.layout?.lineHeight ?? 'normal', overflowY: element.layout?.overflowY ?? 'visible',
      overflowX: element.layout?.overflowX ?? 'visible', scrollPaddingTop: element.layout?.scrollPaddingTop ?? 'auto', scrollPaddingBottom: element.layout?.scrollPaddingBottom ?? 'auto' }),
    IntersectionObserver: class { constructor(callback, options) { this.callback = callback; this.options = options; this.targets = []; observers.intersection.push(this); } observe(target) { this.targets.push(target); } unobserve() {} disconnect() { this.targets = []; } },
    ResizeObserver: class { constructor(callback) { this.callback = callback; this.targets = new Set(); observers.resize.push(this); } observe(target) { this.targets.add(target); } unobserve(target) { this.targets.delete(target); } disconnect() { this.targets.clear(); } },
  });
  document.defaultView = window;
  const frame = () => { const pending = [...frames]; frames.clear(); for (const [, fn] of pending) fn(performance.now()); };
  return { window, document, Element, frame, frames, observers };
}

// The card around the rows: section[data-approval-card-root] > .sac-body (overflow-y auto) > rows host.
function mountRows({ rows, scroller, innerHeight }) {
  const dom = createDom({ innerHeight });
  const section = dom.document.body.appendChild(new dom.Element('section'));
  section.setAttribute('data-approval-card-root', '');
  const body = section.appendChild(new dom.Element('div'));
  body.layout = scroller;
  const host = body.appendChild(new dom.Element('div'));
  const store = createReadGateStore();
  const key = 'card\nrows\nText: hi';
  const view = () => readGateView({ gate, key, snapshot: store.get() });
  const saved = ['window', 'document'].map(name => [name, Object.getOwnPropertyDescriptor(globalThis, name)]);
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  for (const [name, value] of [['window', dom.window], ['document', dom.document]]) Object.defineProperty(globalThis, name, { value, configurable: true, writable: true });
  // The card's wiring (source-approval-card.jsx): stable callbacks into the store.
  const onReadState = state => { recordReadState(store, key, state); };
  const onFits = fits => { recordRowsFit(store, key, fits); };
  const root = createRoot(host);
  const originalCreate = dom.document.createElement;
  // UDe's own div gets the rows' geometry as React creates it.
  dom.document.createElement = tag => { const element = originalCreate(tag); if (tag === 'div' && !element.layout) element.layout = rows; return element; };
  act(() => root.render(React.createElement(ApprovalReadRows, { onReadState, onFits }, 'Text: hi')));
  return {
    dom, store, view, key,
    frames: count => { for (let i = 0; i < count; i += 1) act(() => dom.frame()); },
    scroll: () => act(() => dom.document.dispatchEvent({ type: 'scroll' })),
    unmount() {
      act(() => root.unmount());
      for (const [name, descriptor] of saved) descriptor ? Object.defineProperty(globalThis, name, descriptor) : delete globalThis[name];
    },
  };
}
const rowsLayout = (top, extra = {}) => ({ clientHeight: 34, clientWidth: 300, scrollHeight: 34, lineHeight: '17px', rect: () => ({ top: rowsLayout.top ?? top, height: 34, left: 0, width: 300 }), ...extra });
const fitting = { overflowY: 'auto', clientHeight: 400, scrollHeight: 400, rect: () => ({ top: 0, height: 600, left: 0, width: 400 }) };

test('mounted UDe: rows in view are read after two frames; the loose gate never holds them', () => {
  rowsLayout.top = undefined;
  const mounted = mountRows({ rows: rowsLayout(100), scroller: fitting, innerHeight: 600 });
  try {
    assert.deepEqual(mounted.store.get(), { key: mounted.key, state: 'waiting', hinted: false, fits: true });
    assert.deepEqual([mounted.view().held, mounted.view().allowDisabled], [false, false]);
    assert.equal(readGateAllowIntent({ gate, key: mounted.key, current: mounted.store.get() }), 'ignore', 'not read yet: blocked, silently');
    mounted.frames(2);
    assert.equal(mounted.store.get().state, 'read');
    assert.equal(readGateAllowIntent({ gate, key: mounted.key, current: mounted.store.get() }), 'proceed');
    assert.equal(mounted.dom.observers.intersection[0].options.threshold.length, 1001, 'VDe: 0..1 in 0.001 steps');
  } finally { mounted.unmount(); }
});

test('mounted UDe: rows below the viewport are unread (hint replays on Allow) until scrolled into view', () => {
  rowsLayout.top = 590; // the last line ends past innerHeight + 2
  const mounted = mountRows({ rows: rowsLayout(590), scroller: fitting, innerHeight: 600 });
  try {
    mounted.frames(2);
    assert.deepEqual([mounted.store.get().state, mounted.store.get().hinted, mounted.view().held], ['unread', true, false]);
    assert.equal(readGateAllowIntent({ gate, key: mounted.key, current: mounted.store.get() }), 'replay');
    rowsLayout.top = 200;
    mounted.scroll();
    assert.equal(mounted.store.get().state, 'waiting');
    mounted.frames(2);
    assert.equal(mounted.store.get().state, 'read');
    assert.equal(mounted.view().allowDisabled, false);
  } finally { mounted.unmount(); rowsLayout.top = undefined; }
});

test('mounted UDe: rows the card itself must scroll to show are held (fits false) until read', () => {
  rowsLayout.top = 590;
  const overflowing = { ...fitting, scrollHeight: 900 };
  const mounted = mountRows({ rows: rowsLayout(590), scroller: overflowing, innerHeight: 600 });
  try {
    mounted.frames(2);
    assert.deepEqual([mounted.store.get().state, mounted.store.get().fits], ['unread', false]);
    const held = mounted.view();
    assert.deepEqual([held.held, held.allowDisabled, held.heldLabel, held.hintShown], [true, true, true, true]);
    assert.equal(readGateAllowIntent({ gate, key: mounted.key, current: mounted.store.get(), via: 'keyboard', primary: true }), 'ignore');
    rowsLayout.top = 100;
    mounted.scroll();
    mounted.frames(2);
    const read = mounted.view();
    assert.deepEqual([mounted.store.get().state, read.held, read.allowDisabled], ['read', true, false]);
  } finally { mounted.unmount(); rowsLayout.top = undefined; }
});

test('mounted UDe: rows with no layout report "unlaid", which holds them', () => {
  const mounted = mountRows({ rows: { ...rowsLayout(100), clientHeight: 0, scrollHeight: 0 }, scroller: fitting, innerHeight: 600 });
  try {
    assert.deepEqual(mounted.store.get(), { key: mounted.key, state: 'unlaid', hinted: false });
    assert.deepEqual([mounted.view().held, mounted.view().allowDisabled, mounted.view().hintShown, mounted.view().hintInvisible], [true, true, true, true]);
  } finally { mounted.unmount(); }
});
