import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import React, { act } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createRoot } from 'react-dom/client';
import { createServer } from 'vite';
import react from '@vitejs/plugin-react';

// R4f-findings-store (F1): the Changes pane and the transcript's ReportFindings card share the session review store, as
// 2.42304.0 does (cc8941b7b F read by c96d752d0 X$, cccc2cf0a nb and c44d00c7f ba/ya, written by cb61be3a2's fix and
// dismiss). Model and store tests in plain Node; the card and the pane mounted side by side in a small fake DOM driven
// by React's own props (controlled events); the pane's wiring through the real SourceFilePanel by SSR. No browser, no
// Electron, no network, no real send, no storage but a fake one.
const app = path.resolve(import.meta.dirname, '..');
const reference = path.resolve(app, '../reference/installed-2.42304.0-20261017/ion-dist/assets/v1');
const raw = file => fs.readFileSync(path.join(reference, file), 'utf8');
const occurrences = (text, needle) => text.split(needle).length - 1;
const h = React.createElement;

let server, Card, Pane, Adapters, Session, Model, FixText;
before(async () => {
  // ws: false — no WebSocket server, so the test listens on no port.
  server = await createServer({ configFile: false, root: app, plugins: [react()],
    server: { middlewareMode: true, hmr: false, ws: false, watch: null }, appType: 'custom', logLevel: 'error' });
  Card = await server.ssrLoadModule('/src/source-findings-card.jsx');
  Pane = await server.ssrLoadModule('/src/source-pane-review.jsx');
  Adapters = await server.ssrLoadModule('/src/source-review-findings-adapters.jsx');
  Session = await server.ssrLoadModule('/src/source-session.jsx');
  Model = await server.ssrLoadModule('/src/review-findings-model.mjs');
  FixText = await server.ssrLoadModule('/src/generated/r4e-findings/fix-findings-text.mjs');
});
after(async () => { await server?.close(); });

const call = (args, { id = 'rf1', status = 'completed', turnId = 't1', ...rest } = {}) => ({ id, turnId, type: 'mcpToolCall', server: 'code_desktop', tool: 'ReportFindings', status,
  arguments: args, result: status === 'completed' ? { content: [{ type: 'text', text: 'Reported.' }] } : null, error: null, ...rest });
const FINDINGS = [
  { file: 'src/a.js', line: 12, summary: 'Off by one in the loop bound.', failure_scenario: 'n = 0 reads past the end', category: 'off_by_one' },
  { file: 'src/a.js', summary: 'The handle leaks on retry', failure_scenario: 'many opens', verdict: 'CONFIRMED' },
  { file: 'lib/b.js', line: 3, summary: 'Race', failure_scenario: '-' },
];
const review = (id, extra = {}) => call({ level: 'high', findings: FINDINGS, ...extra }, { id });
const codex = 'Looks mostly fine.\n\nFull review comments:\n\n- [P1] Off-by-one in loop — /w/src/a.js:3-4\n  The loop skips the last item.\n\n- Missing await — /w/src/b.js:10-10\n  The promise is dropped.';

test('2.42304.0 evidence: one store behind the card, the pane bar, the pane card and the pane fix (each string once)', () => {
  const pins = [
    // The card seeds the store with these ids; the pane's ReportFindings findings carry the same ones.
    ['c96d752d0-BOCqU7c2.js', 'id:`finding-${e.id}-${n}`,filePath:t.file,side:"additions",startLine:t.line??1,endLine:t.line??1,line:t.line,body:t.summary,detail:t.failure_scenario,source:"finding",category:t.category,verdict:t.verdict,createdAt:D'],
    // The pane bar (nb) reads the session's findings (rt→tt), statuses (nt→ct), current finding (B→nt) from the store.
    ['cccc2cf0a-B0D--VZp.js', 'import{A as ig,B as ag,D as og,V as sg,at as cg,et as lg,it as ug,nt as dg,rt as fg}from"./cc8941b7b-CZT9QwXr.js"'],
    ['cccc2cf0a-B0D--VZp.js', 'v=fg(_),b=dg(_)'],
    ['cccc2cf0a-B0D--VZp.js', 'E=ag(_),D=Math.max(0,v.findIndex(e=>e.id===E))'],
    ['cccc2cf0a-B0D--VZp.js', 'ig.setCurrentReviewFinding(_,n.id),ig.scrollToAnnotation(_,n.filePath,{fuzzy:!0,tileId:t?od(t):"diff",anchor:{side:n.side,line:n.endLine}})'],
    ['cccc2cf0a-B0D--VZp.js', 'ig.clearReviewFindings(_,!0)'],
    ['cccc2cf0a-B0D--VZp.js', 'n=sg.getState().findingStatusBySession[_]??b,i=v.filter(e=>(n[e.id]??"open")==="open")'],
    ['cccc2cf0a-B0D--VZp.js', 'ig.markReviewFindingsFixing(_,a)'],
    ['cccc2cf0a-B0D--VZp.js', '.catch(e=>{ig.reopenReviewFindings(_,a),'],
    // The pane card's Next and X (c44d00c7f Aa), its Fix and Dismiss (cb61be3a2 Qe / $e).
    ['c44d00c7f-zUAG9XyS.js', 'Dn.stepReviewFinding(r,n.finding.id,s)'],
    ['c44d00c7f-zUAG9XyS.js', 'p?p(n.finding):Dn.dismissReviewFinding(r,n.finding.id,s)'],
    ['cb61be3a2--wBh7Ql7.js', 'import{A as Be}from"./cc8941b7b-CZT9QwXr.js"'],
    ['cb61be3a2--wBh7Ql7.js', 'Be.markReviewFindingsFixing(e.id,[r.id])'],
    ['cb61be3a2--wBh7Ql7.js', 'Be.reopenReviewFindings(e.id,[r.id])'],
    ['cb61be3a2--wBh7Ql7.js', 'Be.dismissReviewFinding(e.id,r.id,t)'],
    ['cb61be3a2--wBh7Ql7.js', '!m(t)&&i(pe,'],
    ['cb61be3a2--wBh7Ql7.js', 'import{t as pe}from"./ccdfebff6-DVy1BLjU.js"'],
    ['shared-104-Cqo2-vQh.js', 'tv as Gu'],
    // The store's actions the pane uses (ported in review-findings-model.mjs) and its persistence.
    ['cc8941b7b-CZT9QwXr.js', 'clearReviewFindings:(t,n)=>e(e=>{let r=e.findingsBySession[t];if(!r)return e;'],
    ['cc8941b7b-CZT9QwXr.js', 'ee=n?{...f,...Object.fromEntries(r.map(e=>[e.id,"dismissed"]))}:p'],
    ['cc8941b7b-CZT9QwXr.js', 'dismissReviewFinding:(n,r,i)=>{let a=t().findingsBySession[n];if(!a)return;let o=a.findIndex(e=>e.id===r);if(o<0)return;let s=a[o+1]??a[o-1],c=t().currentFindingBySession[n]===r;'],
    ['cc8941b7b-CZT9QwXr.js', 'c&&s&&t().scrollToAnnotation(n,s.filePath,{fuzzy:!0,tileId:i??"diff",anchor:{side:s.side,line:s.endLine}})'],
    ['cc8941b7b-CZT9QwXr.js', 'stepReviewFinding:(e,n,r)=>{let i=t().findingsBySession[e];if(!i)return;let a=i[i.findIndex(e=>e.id===n)+1]??i[0];'],
    ['cc8941b7b-CZT9QwXr.js', 'clearScrollTarget:t=>e(e=>{if(!e.scrollTargetBySession[t])return e;let{[t]:n,...r}=e.scrollTargetBySession;return{scrollTargetBySession:r}})'],
    ['cc8941b7b-CZT9QwXr.js', 'function we(e,t){let{[t]:n,...r}=e.reviewLevelBySession,{[t]:i,...a}=e.seededFindingsToolIdsBySession,{[t]:o,...s}=e.latestSettledAtActivationBySession;return{reviewLevelBySession:r,seededFindingsToolIdsBySession:a,latestSettledAtActivationBySession:s}}'],
    ['cc8941b7b-CZT9QwXr.js', 'function De(e){return{annotationsBySession:e.annotationsBySession,sentPrIdsBySession:e.sentPrIdsBySession,findingsBySession:e.findingsBySession,reviewLevelBySession:e.reviewLevelBySession,findingStatusBySession:e.findingStatusBySession,fixingWatermarkBySession:e.fixingWatermarkBySession}}'],
    ['cc8941b7b-CZT9QwXr.js', 'name:"diff-annotations",partialize:De'],
  ];
  for (const [name, needle] of pins) assert.equal(occurrences(raw(name), needle), 1, `${name}: ${needle}`);
});

test('ids: a ReportFindings finding is the card\'s finding-<tool>-<Nq index>; other reviews are numbered under their item', () => {
  const item = call({ findings: [FINDINGS[0], { file: '', summary: 'no path' }, { file: 1, summary: 'unreadable' }, FINDINGS[2]] }, { id: 'rx' });
  const found = Model.reportedFindings(item, '/w');
  // Mq reads the empty path (index 1) but not the numeric one, so the last finding is index 2 for the card as well.
  assert.deepEqual(found.map(entry => [entry.id, entry.file]), [['finding-rx-0', 'src/a.js'], ['finding-rx-2', 'lib/b.js']]);
  assert.deepEqual(Model.reportFindingsAnnotations('rx', item.arguments, 7).map(entry => entry.id), ['finding-rx-0', 'finding-rx-1', 'finding-rx-2']);
  assert.equal(Model.latestReviewFindings([item], '/w').findings[1].id, 'finding-rx-2');
  // The fix message still knows these came from ReportFindings (the whole Jw, with the re-report paragraph).
  assert.match(Model.fixFindingsPrompt(Model.latestReviewFindings([item], '/w').findings), /call the ReportFindings tool once/);
  const codexResult = Model.latestReviewFindings([{ id: 'cx', type: 'exitedReviewMode', review: codex }], '/w');
  assert.deepEqual(codexResult.findings.map(entry => entry.id), ['finding-cx-0', 'finding-cx-1']);
  assert.doesNotMatch(Model.fixFindingsPrompt(codexResult.findings), /ReportFindings/);
  const comment = Model.latestReviewFindings([{ id: 'm9', type: 'agentMessage', text: '::code-comment{title="[P2] Leak" body="Never closed" file="/w/src/c.js" start=5 end=7}' }], '/w');
  assert.deepEqual(comment.findings.map(entry => [entry.id, entry.file, entry.line, entry.endLine]), [['finding-m9-0', 'src/c.js', 5, 7]]);
  // The parsers' own numbering is unchanged.
  assert.deepEqual(Model.parseCodexReview(codex, '/w').map(entry => entry.id), ['finding-0', 'finding-1']);
  // The seed: a ReportFindings review as the card seeds it (raw path, Nq index, level); another review as annotations.
  // R4f review fix: no tool id — only the card's walkthrough / Apply fixes mark the review seeded.
  const seed = Model.paneReviewSeed(Model.latestReviewFindings([review('rs')], '/w'), [review('rs')]);
  assert.deepEqual(seed.options, { level: 'high' });
  assert.deepEqual(seed.findings.map(entry => [entry.id, entry.filePath, entry.startLine, entry.endLine, entry.line, entry.body, entry.detail, entry.source, entry.category, entry.verdict]), [
    ['finding-rs-0', 'src/a.js', 12, 12, 12, FINDINGS[0].summary, FINDINGS[0].failure_scenario, 'finding', 'Off by one', undefined],
    ['finding-rs-1', 'src/a.js', 1, 1, undefined, FINDINGS[1].summary, 'many opens', 'finding', undefined, 'CONFIRMED'],
    ['finding-rs-2', 'lib/b.js', 3, 3, 3, 'Race', '-', 'finding', undefined, undefined]]);
  const codexSeed = Model.paneReviewSeed(codexResult, []);
  assert.deepEqual(codexSeed.options, {});
  assert.deepEqual(codexSeed.findings.map(entry => [entry.id, entry.filePath, entry.startLine, entry.endLine]), [['finding-cx-0', 'src/a.js', 3, 4], ['finding-cx-1', 'src/b.js', 10, 10]]);
});

test('store: the pane\'s ported actions (clear, dismiss, step, scroll target) and the seed / view helpers', () => {
  const store = Model.createReviewFindingsStore();
  const seed = Model.paneReviewSeed(Model.latestReviewFindings([review('rv')], '/w'), [review('rv')]);
  assert.equal(Model.seedPaneReview(store, 's', seed), true);
  assert.equal(Model.seedPaneReview(store, 's', seed), false, 'held: no second seed');
  assert.equal(store.getState().currentFindingBySession.s, 'finding-rv-0');
  assert.equal(store.getState().reviewLevelBySession.s, 'high');
  assert.equal(store.getState().seededFindingsToolIdsBySession.s, undefined, 'a pane seed is not a walkthrough (X$ B)');
  // stepReviewFinding: the next one, wrapping to the first; a scroll target with its anchor.
  store.stepReviewFinding('s', 'finding-rv-2', 'diff');
  assert.equal(store.getState().currentFindingBySession.s, 'finding-rv-0');
  assert.deepEqual(store.getState().scrollTargetBySession.s, { filePath: 'src/a.js', nonce: 1, fuzzy: true, tileId: 'diff', anchor: { side: 'additions', line: 12 } });
  store.clearScrollTarget('s');
  assert.equal(store.getState().scrollTargetBySession.s, undefined);
  // dismissReviewFinding of the current one: it goes, its neighbour becomes current and is scrolled to.
  store.dismissReviewFinding('s', 'finding-rv-0', 'diff');
  assert.deepEqual(store.getState().findingsBySession.s.map(entry => entry.id), ['finding-rv-1', 'finding-rv-2']);
  assert.equal(store.getState().findingStatusBySession.s['finding-rv-0'], 'dismissed');
  assert.equal(store.getState().currentFindingBySession.s, 'finding-rv-1');
  assert.deepEqual(store.getState().scrollTargetBySession.s.anchor, { side: 'additions', line: 1 });
  assert.equal(Model.seedPaneReview(store, 's', seed, { force: true }), false, 'a dismissed finding is not missing');
  // The view: dismissed ones hidden; the store's current one, else the first.
  const result = Model.latestReviewFindings([review('rv')], '/w');
  assert.deepEqual(Model.paneReviewView(result, store.getState().findingStatusBySession.s, 'finding-rv-2'), { findings: result.findings.slice(1), index: 1, currentId: 'finding-rv-2' });
  assert.equal(Model.paneReviewView(result, {}, 'gone').currentId, 'finding-rv-0');
  // clearReviewFindings(…, true): every held finding dismissed, fixing ones too; watermark, level and current go.
  store.markReviewFindingsFixing('s', ['finding-rv-2']);
  store.setReviewFixingWatermark('s', 'rv');
  store.clearReviewFindings('s', true);
  assert.deepEqual(store.getState().findingStatusBySession.s, { 'finding-rv-0': 'dismissed', 'finding-rv-1': 'dismissed', 'finding-rv-2': 'dismissed' });
  assert.equal(store.getState().findingsBySession.s, undefined);
  assert.equal(store.getState().fixingWatermarkBySession.s, undefined);
  assert.equal(store.getState().reviewLevelBySession.s, undefined);
  assert.equal(Model.paneReviewView(result, store.getState().findingStatusBySession.s, null).findings.length, 0);
  // clearReviewFindings(…, false): fixing reopens, nothing is dismissed.
  const other = Model.createReviewFindingsStore();
  Model.seedPaneReview(other, 'o', seed);
  other.markReviewFindingsFixing('o', ['finding-rv-1']);
  other.clearReviewFindings('o', false);
  assert.deepEqual(other.getState().findingStatusBySession.o, { 'finding-rv-1': 'open' });
  // A new review reseeds: its own ids, current back to its first, the old statuses left with the old ids.
  const next = Model.paneReviewSeed(Model.latestReviewFindings([review('rv'), review('rv2')], '/w'), [review('rv'), review('rv2')]);
  assert.equal(Model.seedPaneReview(other, 'o', next), true);
  assert.equal(other.getState().currentFindingBySession.o, 'finding-rv2-0');
  assert.equal(other.getState().findingStatusBySession.o['finding-rv2-1'], undefined);
});

test('store persistence: zustand persist\'s {state, version: 0} under "diff-annotations", the review fields of De only', () => {
  const saved = new Map(), writes = [];
  const storage = { getItem: key => saved.get(key) ?? null, setItem: (key, value) => { writes.push(key); saved.set(key, value); } };
  const store = Model.createReviewFindingsStore({ storage });
  const seed = Model.paneReviewSeed(Model.latestReviewFindings([review('rp')], '/w'), [review('rp')]);
  Model.seedPaneReview(store, 'p', seed);
  store.markReviewFindingsFixing('p', ['finding-rp-1']);
  store.setReviewFixingWatermark('p', 'rp');
  const count = writes.length;
  // Only the persisted fields write: the current finding and a scroll target do not.
  store.setCurrentReviewFinding('p', 'finding-rp-2');
  store.scrollToAnnotation('p', 'lib/b.js', { fuzzy: true });
  assert.equal(writes.length, count);
  assert.ok(writes.every(key => key === 'diff-annotations'));
  const value = JSON.parse(saved.get('diff-annotations'));
  assert.equal(value.version, 0);
  assert.deepEqual(Object.keys(value.state).sort(), ['findingStatusBySession', 'findingsBySession', 'fixingWatermarkBySession', 'reviewLevelBySession']);
  // A later launch: findings, statuses, level and watermark come back; the current finding and scroll target do not.
  const again = Model.createReviewFindingsStore({ storage });
  assert.deepEqual(again.getState().findingsBySession.p.map(entry => entry.id), ['finding-rp-0', 'finding-rp-1', 'finding-rp-2']);
  assert.deepEqual(again.getState().findingStatusBySession.p, { 'finding-rp-1': 'fixing' });
  assert.equal(again.getState().fixingWatermarkBySession.p, 'rp');
  assert.equal(again.getState().reviewLevelBySession.p, 'high');
  assert.equal(again.getState().currentFindingBySession.p, undefined);
  assert.equal(again.getState().scrollTargetBySession.p, undefined);
  assert.equal(Model.seedPaneReview(again, 'p', seed), false, 'the restored review is held');
  // Unreadable storage is an empty store; a bad entry is dropped field by field.
  assert.deepEqual(Model.createReviewFindingsStore({ storage: { getItem: () => '{oops' } }).getState().findingsBySession, {});
  assert.deepEqual(Model.createReviewFindingsStore({ storage: { getItem: () => { throw new Error('denied'); } } }).getState().findingStatusBySession, {});
  const mixed = Model.parsePersistedReview(JSON.stringify({ state: { findingsBySession: { a: [{ id: 'x', filePath: 'f', endLine: 1 }, { id: 2 }], b: 'no' },
    findingStatusBySession: { a: { x: 'fixing', y: 'weird' } }, reviewLevelBySession: { a: 'high', b: 'huge' }, fixingWatermarkBySession: { a: null, b: 4 } }, version: 0 }));
  assert.deepEqual(mixed, { findingsBySession: { a: [{ id: 'x', filePath: 'f', endLine: 1 }] }, reviewLevelBySession: { a: 'high' },
    findingStatusBySession: { a: { x: 'fixing' } }, fixingWatermarkBySession: { a: null } });
  // A storage that refuses writes keeps the state in memory.
  const refusing = Model.createReviewFindingsStore({ storage: { getItem: () => null, setItem: () => { throw new Error('quota'); } } });
  Model.seedPaneReview(refusing, 'r', seed);
  assert.equal(refusing.getState().findingsBySession.r.length, 3);
});

// ── the card and the pane side by side (controlled events) ─────────────────────────────────────────────────────────
// A small fake DOM as tests/review-findings-card.test.mjs, plus querySelector for an attribute selector and a
// scrollIntoView recorder (the pane scrolls to the current finding's card).
const scrolled = [];
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
        ownerDocument: document, childNodes: [], parentNode: null, attributes: new Map(), dataset: {} });
      this.style = style();
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
    matches() { return false; }
    getBoundingClientRect() { return { top: 0, bottom: 0, left: 0, right: 0, width: 0, height: 0 }; }
    focus() { document.activeElement = this; }
    blur() { if (document.activeElement === this) document.activeElement = document.body; }
    scrollIntoView(options) { scrolled.push([this.getAttribute('data-review-finding'), options]); }
    querySelector(selector) {
      const match = /^\[([\w-]+)="((?:[^"\\]|\\.)*)"\]$/.exec(selector);
      if (!match) throw new Error(`unsupported selector ${selector}`);
      const value = match[2].replace(/\\(.)/g, '$1');
      return this.find(node => node !== this && node.getAttribute(match[1]) === value);
    }
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
  class ResizeObserver { observe() {} unobserve() {} disconnect() {} }
  class Range {}
  const window = Object.assign(Object.create(events), { document, ResizeObserver, Range, location: { pathname: '/' }, HTMLIFrameElement: class {},
    getComputedStyle: () => ({ lineHeight: '20px', direction: 'ltr', width: '0px' }),
    matchMedia: () => ({ matches: false, addEventListener() {}, removeEventListener() {} }),
    requestAnimationFrame: fn => setTimeout(fn, 0), cancelAnimationFrame: id => clearTimeout(id) });
  document.defaultView = window;
  return { window, document, Element };
}
async function withDom(run) {
  const dom = createDom();
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
  console.error = () => {};
  try { return await run({ dom, container, root }); }
  finally {
    act(() => root.unmount());
    console.error = error;
    for (const [name, descriptor] of saved) { if (descriptor) Object.defineProperty(globalThis, name, descriptor); else delete globalThis[name]; }
  }
}
const reactProps = element => element[Object.keys(element).find(key => key.startsWith('__reactProps$'))];
const visible = node => node.textContent.replace(/[\uE000-\uF8FF]/g, '');
const press = element => ({ preventDefault() {}, stopPropagation() {}, isDefaultPrevented: () => false, isPropagationStopped: () => false, currentTarget: element,
  target: element, button: 0, detail: 1, nativeEvent: {} });
const buttons = node => node.findAll(child => child.tagName === 'BUTTON');
const buttonNamed = (node, label) => buttons(node).find(child => visible(child) === label);
const buttonLabelled = (node, label) => buttons(node).find(child => child.getAttribute('aria-label') === label);
const rowButtons = node => buttons(node).filter(child => child.hasAttribute('aria-expanded'));
const click = element => act(() => reactProps(element).onClick(press(element)));
const settle = () => act(() => new Promise(resolve => setTimeout(resolve, 5)));
const badges = node => node.findAll(child => child.getAttribute?.('data-cds') === 'Badge').map(visible);
const storeState = () => Adapters.reviewFindingsStore.getState();

// The pane exactly as FilePane uses the hook, and its diff cards as SourceDiff renders them from `review`.
function PaneHarness({ sessionId, review: paneReview, cwd = '/w' }) {
  const pane = React.useRef(null);
  const { diffReview, reviewBar } = Pane.useChangesPaneReview({ sessionId, review: paneReview, cwd, enabled: true, pane, content: 'patch' });
  return h('div', { ref: pane, 'data-surface': 'pane' }, reviewBar, diffReview ? diffReview.findings.map(entry => h(Pane.SourceReviewFindingCard, { key: entry.id, finding: entry,
    current: entry.id === diffReview.currentId, status: diffReview.statuses?.[entry.id] ?? 'open', onDismiss: () => diffReview.onDismiss(entry.id),
    onFix: diffReview.onFix ? () => diffReview.onFix(entry.id) : null, onNext: diffReview.onNext ? () => diffReview.onNext(entry.id) : null })) : null);
}
function hostFor(sessionKey, calls) {
  return { sessionKey, running: false, canViewChanges: true, fileInChanges: () => true, openChanges: () => calls.push(['changes']),
    send: async text => { calls.push(['card-send', text]); return true; }, rerun: text => calls.push(['rerun', text]), prefill: () => {} };
}
const paneOf = container => container.find(node => node.getAttribute?.('data-surface') === 'pane');
const cardOf = container => container.find(node => node.getAttribute?.('data-cds') === 'FindingsCard');
const barStatus = pane => visible(pane.find(node => node.getAttribute?.('class') === 'spr-status') ?? { textContent: '' });
const slots = pane => pane.findAll(node => node.hasAttribute?.('data-review-finding'));
const slotIds = pane => slots(pane).map(node => node.getAttribute('data-review-finding'));
const currentSlot = pane => slots(pane).filter(node => node.find(child => child.getAttribute?.('tabindex') === '-1')?.getAttribute('aria-current') === 'true')
  .map(node => node.getAttribute('data-review-finding'));
const slot = (pane, id) => slots(pane).find(node => node.getAttribute('data-review-finding') === id);
const bar = pane => pane.find(node => node.hasAttribute?.('data-review-findings'));

test('the card and the pane share one store: walkthrough, current finding, fixes, outcomes and dismissal show on both', async () => {
  await withDom(async ({ container, root }) => {
    const calls = [], sends = [];
    const sessionKey = 's-sync';
    const item = review('rf-sync');
    let items = [{ id: 'u0', type: 'userMessage', turnId: 't0' }, item], running = false, turnErrors = null;
    const host = hostFor(sessionKey, calls);
    const paneReview = () => ({ items, active: running, onSend: async text => { sends.push(text); return true; }, onRerun: () => calls.push(['pane-rerun']) });
    // The pane first: its effects run before the card's in a commit, so the stand-in watcher has to stand down by itself.
    const render = () => act(() => root.render(h(React.Fragment, null,
      h(PaneHarness, { sessionId: sessionKey, review: paneReview() }),
      h(Card.FindingsCardHost.Provider, { value: { ...host, running } }, h(Card.SourceFindingsCard, { item, sessionKey, items, turnErrors })))));
    render();
    const pane = paneOf(container), card = cardOf(container);
    // The pane shows the review with the card's ids and seeds the store with the card's own annotations.
    assert.deepEqual(slotIds(pane), ['finding-rf-sync-0', 'finding-rf-sync-1', 'finding-rf-sync-2']);
    assert.deepEqual(storeState().findingsBySession[sessionKey].map(entry => [entry.id, entry.filePath, entry.endLine, entry.body]),
      Model.reportFindingsAnnotations('rf-sync', item.arguments).map(entry => [entry.id, entry.filePath, entry.endLine, entry.body]));
    assert.equal(barStatus(pane), 'Finding 1 of 3');
    assert.deepEqual(currentSlot(pane), ['finding-rf-sync-0']);
    assert.equal(storeState().seededFindingsToolIdsBySession[sessionKey], undefined, 'the pane\'s seed leaves the card\'s auto walkthrough armed');
    // Card → pane: View in diff on the third row makes it the pane's current finding, and the pane scrolls to its card
    // and consumes the scroll target.
    scrolled.length = 0;
    click(rowButtons(card)[2]);
    click(buttonNamed(card, 'View in diff'));
    assert.equal(storeState().currentFindingBySession[sessionKey], 'finding-rf-sync-2');
    assert.deepEqual(storeState().seededFindingsToolIdsBySession[sessionKey], ['rf-sync'], 'the card\'s walkthrough marks it seeded');
    assert.equal(barStatus(pane), 'Finding 3 of 3');
    assert.deepEqual(currentSlot(pane), ['finding-rf-sync-2']);
    await settle();
    assert.deepEqual(scrolled, [['finding-rf-sync-2', { block: 'center' }]]);
    assert.equal(storeState().scrollTargetBySession[sessionKey], undefined, 'the pane took the scroll target');
    assert.deepEqual(calls, [['changes']]);
    // Walk through in diff starts again at the first finding, on both.
    click(buttonNamed(card, 'Walk through in diff'));
    assert.equal(barStatus(pane), 'Finding 1 of 3');
    assert.deepEqual(currentSlot(pane), ['finding-rf-sync-0']);
    await settle();
    // Pane → store: the bar's Next finding and the card's ArrowDown step the store's current finding.
    click(buttonLabelled(bar(pane), 'Next finding'));
    assert.equal(storeState().currentFindingBySession[sessionKey], 'finding-rf-sync-1');
    assert.deepEqual(currentSlot(pane), ['finding-rf-sync-1']);
    click(buttonLabelled(slot(pane, 'finding-rf-sync-1'), 'Next finding'));
    assert.equal(storeState().currentFindingBySession[sessionKey], 'finding-rf-sync-2');
    click(buttonLabelled(slot(pane, 'finding-rf-sync-2'), 'Next finding after the one on line 3'));
    assert.equal(storeState().currentFindingBySession[sessionKey], 'finding-rf-sync-0', 'stepReviewFinding wraps to the first');
    await settle();
    // Pane fix → card: "Fix this one" sends the whole Jw for this finding and marks it fixing in the store; the card's
    // row reads Fixing… too.
    click(buttonNamed(slot(pane, 'finding-rf-sync-0'), 'Fix this one'));
    await settle();
    assert.deepEqual(sends, [FixText.fixFindingsText([{ file: 'src/a.js', line: 12, summary: FINDINGS[0].summary, detail: FINDINGS[0].failure_scenario }])]);
    assert.equal(storeState().findingStatusBySession[sessionKey]['finding-rf-sync-0'], 'fixing');
    assert.equal(badges(card)[0], 'Fixing…');
    assert.match(badges(slot(pane, 'finding-rf-sync-0')).join(), /Fixing…/);
    assert.equal(storeState().fixingWatermarkBySession[sessionKey], 'rf-sync', 'the watermark is the last item when the fix began');
    // The fix turn runs, then ends: the card's watcher settles it (Fixed on both).
    items = [...items, { id: 'u1', type: 'userMessage', turnId: 't2' }, { id: 'a1', type: 'agentMessage', turnId: 't2', text: 'Done.' }];
    running = true;
    render();
    assert.equal(storeState().findingStatusBySession[sessionKey]['finding-rf-sync-0'], 'fixing');
    running = false;
    render();
    assert.equal(storeState().findingStatusBySession[sessionKey]['finding-rf-sync-0'], 'addressed');
    assert.equal(badges(card)[0], 'Fixed');
    assert.match(badges(slot(pane, 'finding-rf-sync-0')).join(), /Fixed/);
    assert.equal(buttonNamed(slot(pane, 'finding-rf-sync-0'), 'Fix this one'), undefined);
    // Card Apply fixes → pane: the two open findings read Fixing… in the pane.
    click(buttonNamed(card, 'Apply fixes'));
    await settle();
    assert.equal(calls.filter(entry => entry[0] === 'card-send').length, 1);
    assert.match(badges(slot(pane, 'finding-rf-sync-1')).join(), /Fixing…/);
    assert.match(badges(slot(pane, 'finding-rf-sync-2')).join(), /Fixing…/);
    assert.equal(barStatus(pane), 'Applying fixes…');
    // The agent re-reports with outcomes: skipped reopens (in the pane too: its Fix this one is back), fixed is Fixed.
    const echo = call({ findings: [
      { file: 'src/a.js', line: 12, summary: FINDINGS[0].summary, failure_scenario: 'x', outcome: 'fixed' },
      { file: 'src/a.js', summary: FINDINGS[1].summary, failure_scenario: 'x', outcome: 'skipped' },
      { file: 'lib/b.js', line: 3, summary: 'Race', failure_scenario: '-', outcome: 'fixed' }] }, { id: 'rf-echo', turnId: 't3' });
    items = [...items, { id: 'u2', type: 'userMessage', turnId: 't3' }, echo];
    render();
    assert.deepEqual(storeState().findingStatusBySession[sessionKey], { 'finding-rf-sync-0': 'addressed', 'finding-rf-sync-1': 'open', 'finding-rf-sync-2': 'addressed' });
    assert.deepEqual(slotIds(pane), ['finding-rf-sync-0', 'finding-rf-sync-1', 'finding-rf-sync-2'], 'the re-report is not a new review for the pane');
    assert.ok(buttonNamed(slot(pane, 'finding-rf-sync-1'), 'Fix this one'), 'skipped: open again in the pane');
    assert.match(badges(slot(pane, 'finding-rf-sync-2')).join(), /Fixed/);
    assert.ok(buttonNamed(bar(pane), 'Apply fixes'));
    // A failed fix turn the card's watcher knows of (turnErrors) reopens: the pane's stand-in watcher, which does not
    // know it, stands down while the card watches.
    click(buttonNamed(slot(pane, 'finding-rf-sync-1'), 'Fix this one'));
    await settle();
    assert.equal(storeState().findingStatusBySession[sessionKey]['finding-rf-sync-1'], 'fixing');
    items = [...items, { id: 'u3', type: 'userMessage', turnId: 't4' }, { id: 'a3', type: 'agentMessage', turnId: 't4', text: 'Hit an error.' }];
    turnErrors = { t4: { message: 'boom' } };
    render();
    assert.equal(storeState().findingStatusBySession[sessionKey]['finding-rf-sync-1'], 'open');
    // Pane dismiss → card: X on one finding dismisses it in the store (the card's row reads Dismissed); the bar's
    // Dismiss dismisses the rest and the pane's findings go.
    click(buttonLabelled(slot(pane, 'finding-rf-sync-1'), 'Dismiss finding'));
    assert.deepEqual(slotIds(pane), ['finding-rf-sync-0', 'finding-rf-sync-2']);
    assert.equal(barStatus(pane), 'Fixes applied');
    assert.equal(badges(card)[1], 'Dismissed');
    click(buttonNamed(bar(pane), 'Dismiss'));
    assert.deepEqual(slotIds(pane), []);
    assert.equal(bar(pane), null);
    assert.deepEqual(Object.values(storeState().findingStatusBySession[sessionKey]), ['dismissed', 'dismissed', 'dismissed']);
    assert.deepEqual(badges(card), ['Dismissed', 'Dismissed', 'Dismissed']);
    // A new review: new ids, nothing carried over.
    const fresh = review('rf-next');
    items = [...items, fresh];
    act(() => root.render(h(PaneHarness, { sessionId: sessionKey, review: paneReview() })));
    assert.deepEqual(slotIds(paneOf(container)), ['finding-rf-next-0', 'finding-rf-next-1', 'finding-rf-next-2']);
    assert.equal(barStatus(paneOf(container)), 'Finding 1 of 3');
    assert.equal(storeState().currentFindingBySession[sessionKey], 'finding-rf-next-0');
  });
});

test('a Codex review in the pane: seeded with its own ids, fixed without a ReportFindings request, settled by the pane\'s watcher', async () => {
  await withDom(async ({ container, root }) => {
    const sessionKey = 's-codex', sends = [];
    let items = [{ id: 'u0', type: 'userMessage', turnId: 't0' }, { id: 'cx', type: 'exitedReviewMode', turnId: 't0', review: codex }], active = false, answer = true;
    const render = () => act(() => root.render(h(PaneHarness, { sessionId: sessionKey, review: { items, active,
      onSend: async text => { sends.push(text); if (answer instanceof Error) throw answer; return answer; }, onRerun: null } })));
    render();
    const pane = paneOf(container);
    assert.deepEqual(slotIds(pane), ['finding-cx-0', 'finding-cx-1']);
    assert.deepEqual(storeState().findingsBySession[sessionKey].map(entry => [entry.id, entry.filePath, entry.startLine, entry.endLine]), [['finding-cx-0', 'src/a.js', 3, 4], ['finding-cx-1', 'src/b.js', 10, 10]]);
    // The host refused the send (busy, offline, archived): the finding reopens.
    answer = false;
    click(buttonNamed(slot(pane, 'finding-cx-0'), 'Fix this one'));
    await settle();
    assert.equal(sends.length, 1);
    assert.doesNotMatch(sends[0], /ReportFindings/);
    assert.match(sends[0], /^Apply this code-review finding with the minimal edit\./);
    assert.equal(storeState().findingStatusBySession[sessionKey]['finding-cx-0'], 'open');
    // A send that throws reopens as well.
    answer = new Error('down');
    click(buttonNamed(slot(pane, 'finding-cx-0'), 'Fix this one'));
    await settle();
    assert.equal(storeState().findingStatusBySession[sessionKey]['finding-cx-0'], 'open');
    // Sent: the pane's watcher (no card in this session) sets the watermark and settles when the fix turn ends.
    answer = true;
    click(buttonNamed(bar(pane), 'Apply fixes'));
    await settle();
    assert.deepEqual(Object.values(storeState().findingStatusBySession[sessionKey]), ['fixing', 'fixing']);
    assert.equal(storeState().fixingWatermarkBySession[sessionKey], 'cx');
    assert.equal(barStatus(pane), 'Applying fixes…');
    items = [...items, { id: 'u1', type: 'userMessage', turnId: 't1' }, { id: 'a1', type: 'agentMessage', turnId: 't1', text: 'Fixed both.' }];
    active = true;
    render();
    assert.deepEqual(Object.values(storeState().findingStatusBySession[sessionKey]), ['fixing', 'fixing']);
    assert.equal(reactProps(buttonNamed(bar(paneOf(container)), 'Dismiss')).disabled ?? false, false);
    active = false;
    render();
    assert.deepEqual(Object.values(storeState().findingStatusBySession[sessionKey]), ['addressed', 'addressed']);
    assert.equal(barStatus(paneOf(container)), 'Fixes applied');
    assert.ok(buttonNamed(bar(paneOf(container)), 'Re-run review') === undefined, 'no Re-run without a rerun action');
  });
});

test('R4f review fix: 2.42304.0 marks a review seeded only from the card (X$ re / ue), and its auto walkthrough skips one marked', () => {
  const card = raw('c96d752d0-BOCqU7c2.js');
  assert.equal(occurrences(card, 'ES.setReviewFindings(E,O,{level:x?.level,toolId:e.id,latestSettledToolId:U})'), 2);
  assert.equal(occurrences(card, 'U===ne||!H.includes(ne)||B.includes(e.id)'), 1);
  assert.equal(occurrences(card, 'B=jxe(E??"")'), 1);
  // The pane bar, the pane card and the pane fix never seed the store.
  for (const name of ['cccc2cf0a-B0D--VZp.js', 'c44d00c7f-zUAG9XyS.js', 'cb61be3a2--wBh7Ql7.js']) assert.equal(occurrences(raw(name), 'setReviewFindings('), 0, name);
  // Here: the pane's seed records no tool id; the card's walkthrough (the same setReviewFindings with toolId) still does.
  const store = Model.createReviewFindingsStore();
  const items = [review('rk')];
  Model.seedPaneReview(store, 'k', Model.paneReviewSeed(Model.latestReviewFindings(items, '/w'), items));
  assert.equal(store.getState().seededFindingsToolIdsBySession.k, undefined);
  store.setReviewFindings('k', Model.reportFindingsAnnotations('rk', items[0].arguments), { level: 'high', toolId: 'rk', latestSettledToolId: 'rk' });
  assert.deepEqual(store.getState().seededFindingsToolIdsBySession.k, ['rk']);
});

test('R4f review fix: settleReviewFixes turnEnded ends the fix turn with no reply item; turn errors still reopen', () => {
  const store = Model.createReviewFindingsStore();
  const items = [{ id: 'u0', type: 'userMessage', turnId: 't0' }, { id: 'cx', type: 'exitedReviewMode', turnId: 't0', review: codex }];
  const seed = Model.paneReviewSeed(Model.latestReviewFindings(items, '/w'), items);
  Model.seedPaneReview(store, 'e', seed);
  store.markReviewFindingsFixing('e', ['finding-cx-0']);
  store.setReviewFixingWatermark('e', 'cx');
  const failedAtOnce = [...items, { id: 'u1', type: 'userMessage', turnId: 't1' }];
  // Without the edge: the prompt has no reply, so the turn has not ended (the stuck Fixing… of the review finding).
  Model.settleReviewFixes(store, 'e', failedAtOnce, { running: false });
  assert.equal(store.getState().findingStatusBySession.e['finding-cx-0'], 'fixing');
  // Still running: nothing settles even with the edge.
  Model.settleReviewFixes(store, 'e', failedAtOnce, { running: true, turnEnded: true });
  assert.equal(store.getState().findingStatusBySession.e['finding-cx-0'], 'fixing');
  // With turn errors (main.jsx's state.turnErrors on the pane's review): a failed turn reopens.
  Model.settleReviewFixes(store, 'e', failedAtOnce, { running: false, turnEnded: true, turnErrors: { t1: { message: 'boom' } } });
  assert.equal(store.getState().findingStatusBySession.e['finding-cx-0'], 'open');
  // Without them, the edge settles (as the pre-store pane did on active true → false).
  store.markReviewFindingsFixing('e', ['finding-cx-0']);
  Model.settleReviewFixes(store, 'e', failedAtOnce, { running: false, turnEnded: true });
  assert.equal(store.getState().findingStatusBySession.e['finding-cx-0'], 'addressed');
  // No watermark (no watcher saw the fix begin): the edge alone settles nothing.
  const unwatched = Model.createReviewFindingsStore();
  Model.seedPaneReview(unwatched, 'e', seed);
  unwatched.markReviewFindingsFixing('e', ['finding-cx-1']);
  Model.settleReviewFixes(unwatched, 'e', failedAtOnce, { running: false, turnEnded: true });
  assert.equal(unwatched.getState().findingStatusBySession.e['finding-cx-1'], 'fixing');
});

test('R4f review fix: the pane\'s stand-in watcher ends a fix turn that failed at once (running → idle), and reads the review\'s turn errors', async () => {
  await withDom(async ({ container, root }) => {
    const sessionKey = 's-codex-fail', sends = [];
    let items = [{ id: 'u0', type: 'userMessage', turnId: 't0' }, { id: 'cx', type: 'exitedReviewMode', turnId: 't0', review: codex }], active = false, turnErrors;
    const render = () => act(() => root.render(h(PaneHarness, { sessionId: sessionKey, review: { items, active, ...(turnErrors === undefined ? {} : { turnErrors }),
      onSend: async text => { sends.push(text); return true; }, onRerun: () => {} } })));
    render();
    // A turn the session ran with no fix in flight is not a fix turn: nothing is fixing, nothing settles.
    active = true; render();
    active = false; render();
    assert.deepEqual(storeState().findingStatusBySession[sessionKey] ?? {}, {});
    // Apply fixes, then the fix turn starts and fails at once: the prompt shows, no reply item, the session goes idle.
    click(buttonNamed(bar(paneOf(container)), 'Apply fixes'));
    await settle();
    assert.equal(sends.length, 1);
    assert.equal(storeState().fixingWatermarkBySession[sessionKey], 'cx');
    items = [...items, { id: 'u1', type: 'userMessage', turnId: 't1' }];
    active = true; render();
    assert.deepEqual(Object.values(storeState().findingStatusBySession[sessionKey]), ['fixing', 'fixing']);
    active = false; render();
    // Not stuck at Fixing…: without turn errors on the pane's review it settles, as the pre-store pane did.
    assert.deepEqual(Object.values(storeState().findingStatusBySession[sessionKey]), ['addressed', 'addressed']);
    assert.equal(barStatus(paneOf(container)), 'Fixes applied');
    assert.ok(buttonNamed(bar(paneOf(container)), 'Re-run review'));
    // A later idle render is no second edge: nothing changes.
    render();
    assert.deepEqual(Object.values(storeState().findingStatusBySession[sessionKey]), ['addressed', 'addressed']);
    // A new review whose fix turn fails, with the session's turn errors on the review (main.jsx followUp): it reopens and
    // Apply fixes is back.
    const next = 'Full review comments:\n\n- [P2] Unchecked result — /w/src/c.js:5-5\n  The error is ignored.';
    items = [...items, { id: 'cy', type: 'exitedReviewMode', turnId: 't2', review: next }];
    turnErrors = {};
    render();
    assert.deepEqual(slotIds(paneOf(container)), ['finding-cy-0']);
    click(buttonNamed(bar(paneOf(container)), 'Apply fixes'));
    await settle();
    assert.equal(storeState().findingStatusBySession[sessionKey]['finding-cy-0'], 'fixing');
    items = [...items, { id: 'u3', type: 'userMessage', turnId: 't3' }];
    active = true; render();
    turnErrors = { t3: { message: 'boom' } };
    active = false; render();
    assert.equal(storeState().findingStatusBySession[sessionKey]['finding-cy-0'], 'open');
    assert.ok(buttonNamed(bar(paneOf(container)), 'Apply fixes'));
  });
});

test('SourceFilePanel wiring (SSR): the Changes pane reads the store\'s current finding and statuses', () => {
  const sessionKey = 's-ssr-panel';
  const item = review('rf-ssr');
  const items = [item];
  const seed = Model.paneReviewSeed(Model.latestReviewFindings(items, '/w'), items);
  // The card (or a previous visit of the pane) already seeded the store and moved on to the third finding.
  Model.seedPaneReview(Adapters.reviewFindingsStore, sessionKey, seed, { force: true });
  Adapters.reviewFindingsStore.setCurrentReviewFinding(sessionKey, 'finding-rf-ssr-2');
  Adapters.reviewFindingsStore.markReviewFindingsFixing(sessionKey, ['finding-rf-ssr-0']);
  const patch = 'diff --git a/src/a.js b/src/a.js\n--- a/src/a.js\n+++ b/src/a.js\n@@ -10,3 +10,4 @@\n ten\n eleven\n+twelve\n thirteen\n'
    + 'diff --git a/lib/b.js b/lib/b.js\n--- a/lib/b.js\n+++ b/lib/b.js\n@@ -1,3 +1,3 @@\n one\n two\n-three\n+3\n';
  const html = renderToStaticMarkup(h(Session.SourceFilePanel, { sessionId: sessionKey, cwd: '/w', tab: 'changes', diff: patch,
    review: { items, active: false, onSend: async () => true, onRerun: () => {} } }));
  assert.match(html, /role="status" class="spr-status">Finding 3 of 3</);
  assert.match(html, /data-review-finding="finding-rf-ssr-2"><div class="px-md py-xs"><div tabindex="-1" aria-current="true"/);
  assert.match(html, /data-review-finding="finding-rf-ssr-0"><div class="px-md py-xs"><div tabindex="-1" class=/);
  const at = html.indexOf('data-review-finding="finding-rf-ssr-0"');
  const fixing = html.slice(at, html.indexOf('data-review-finding=', at + 1));
  assert.match(fixing, />Fixing…</);
  // Another session's pane shows none of it.
  const other = renderToStaticMarkup(h(Session.SourceFilePanel, { sessionId: 's-ssr-other', cwd: '/w', tab: 'changes', diff: patch, review: { items: [], active: false, onSend: null, onRerun: null } }));
  assert.doesNotMatch(other, /data-review-finding|spr-status/);
  // The pane's block in FilePane is the hook call (no local review marks left).
  const source = fs.readFileSync(path.join(app, 'src/source-session.jsx'), 'utf8');
  assert.equal(occurrences(source, 'const { diffReview, reviewBar } = useChangesPaneReview({ sessionId, review, cwd, enabled: tab === "changes", pane, content: diffView.patch });'), 1);
  assert.doesNotMatch(source, /reviewMarks|updateMarks|reviewTurn/);
});
