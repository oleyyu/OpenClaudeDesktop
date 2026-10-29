// W12 question: the AskUserQuestion card's 3.6556.2 originals (scripts/extract-question-card.mjs → src/generated/question-card)
// and the card that renders with them (c9ed5627b dt / ut). Source-only: the generator's --check, pins on the official
// chunk, SSR markup of the generated row and the host card, and the document-level digit listener ($t) driven with fakes.
import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

const ROOT = path.resolve(import.meta.dirname, '..');
const OFFICIAL = path.resolve(ROOT, '../reference/snapshots/claude-3.6556.2-20261025-192807/ion-dist/assets/v1/c9ed5627b-BSPWYeYQ.js');
const official = fs.readFileSync(OFFICIAL, 'utf8');
const count = (text, needle) => text.split(needle).length - 1;
const manifest = JSON.parse(fs.readFileSync(path.join(ROOT, 'src/generated/question-card/manifest.json'), 'utf8'));

let server, Row, Header, Digits, Card, Model, Primary, Attention, ViewTabs;
before(async () => {
  const [{ createServer }, { default: react }] = await Promise.all([import('vite'), import('@vitejs/plugin-react')]);
  server = await createServer({ configFile: false, root: ROOT, plugins: [react()],
    server: { middlewareMode: true, hmr: false, watch: null }, appType: 'custom', logLevel: 'error' });
  [Row, Header, Digits, Card, Model, Primary, Attention, ViewTabs] = await Promise.all(['/src/generated/question-card/option-row.mjs',
    '/src/generated/question-card/card-header.mjs', '/src/generated/question-card/digit-shortcuts.mjs',
    '/src/source-question-card.jsx', '/src/approval-draft-model.mjs', '/src/generated/question-card/primary-button.mjs',
    '/src/generated/approval-landing/window-attention.mjs', '/src/generated/view-tabs/index.js'].map(file => server.ssrLoadModule(file)));
});
after(() => server?.close());

test('the generator output is current (extract-question-card --check)', async () => {
  const { extractQuestionCard } = await import('../scripts/extract-question-card.mjs');
  const result = await extractQuestionCard({ check: true });
  assert.equal(result.referenceVersion, '3.6556.2');
  const digits = result.modules.find(m => m.target === 'digit-shortcuts.mjs');
  assert.deepEqual(digits.inner.map(i => i.name), ['questionDigitShortcuts']);
  assert.deepEqual(digits.inner[0].params, ['w', 'T', 'z', 'U', 'A', 'E', 'N', 'W', 'xt', 'Yt', 'H', 'B']);
  // The landed-card state is c9ed5627b D of approval-landing, never a second WeakMap.
  assert.ok(digits.imports.some(i => i.local === 'D' && i.from === '../approval-landing/card-landing.mjs' && i.name === 'afterCardState'));
  assert.ok(!digits.bindings.some(b => b.name === 'D'));
});

test('official pins: ut keycap / checkbox, $t listener and its card attribute, each once in c9ed5627b', () => {
  for (const pin of [
    'showDigitHint:c,onRowMouseDown:l,endsDragSelect:d,onOptionClick:te',
    'className:"pointer-events-none flex pointer-coarse:hidden",children:t(u,{keys:String(i+1)})',
    'className:"pointer-events-none flex pointer-coarse:hidden",children:t(u,{keys:String(kn)})',
    'let r=N.current;return r?.setAttribute(be,String(W+1))',
    'if(!w||!T||z||U||A||!E)return;',
    '(u?nt(e):!e.repeat)&&(H.current=!1,B(n===r?-1:n-1))',
    'defaultMessage:"View question options",id:"Lwr6fkobrQ"',
    'defaultMessage:"Dismiss question",id:"YsRc+anYk2"',
  ]) assert.equal(count(official, pin), 1, pin);
  // The cut expression is byte-for-byte the official one (manifest sha over the prettier text the generator reads).
  const text = fs.readFileSync(path.join(ROOT, 'src/generated/question-card/digit-shortcuts.mjs'), 'utf8');
  assert.match(text, /var questionDigitShortcuts =\s*\(\{ w, T, z, U, A, E, N, W, xt, Yt, H, B \}\) =>/);
  assert.equal(manifest.modules.find(m => m.target === 'digit-shortcuts.mjs').inner[0].sha256.length, 64);
});

test('ut: the digit keycap on single-select rows (showDigitHint), the CDS checkbox on multiSelect rows, st when selected', () => {
  const row = props => renderToStaticMarkup(React.createElement(Row.QuestionOptionRow, { option: { label: 'Postgres', description: 'Server' },
    index: 1, isSelected: false, isHighlighted: false, isMultiSelect: false, showDigitHint: true, onRowMouseDown() {}, endsDragSelect: () => false,
    onOptionClick() {}, ...props }));
  const single = row();
  assert.match(single, /^<button type="button" class="flex items-center gap-sm rounded-\[5px\] px-md py-md [^"]* bg-alpha-1 hover:bg-alpha-2">/);
  assert.match(single, /<span class="pointer-events-none flex pointer-coarse:hidden"><span data-cds="Shortcut"[^>]*><kbd[^>]*>2<\/kbd>/);
  assert.match(single, /class="text-footnote text-muted-as-secondary whitespace-pre-wrap[^"]*">Server</);
  assert.doesNotMatch(single, /aria-pressed/, 'single-select rows carry no aria-pressed');
  assert.doesNotMatch(row({ showDigitHint: false }), /data-cds="Shortcut"/);
  const multi = row({ isMultiSelect: true, isSelected: true });
  assert.match(multi, /aria-pressed="true"/);
  assert.ok(multi.includes(Row.selectedRowClass));
  assert.match(multi, /<span data-size="sm" class="flex shrink-0">/);
  assert.doesNotMatch(multi, /data-cds="Shortcut"/);
  assert.match(row({ isMultiSelect: true, isHighlighted: true }), / bg-alpha-2">/);
});

function questionRequest(fields = {}, extra = []) {
  return { id: 9, method: 'item/tool/requestUserInput', bridgeApproval: { connectionId: 'c', instanceId: `w12-${Math.random()}` },
    params: { threadId: 'T', turnId: 'turn', questions: [{ id: 'q', question: 'Which database?', isOther: true, isSecret: false,
      options: [{ label: 'Postgres' }, { label: 'SQLite' }], ...fields }, ...extra] } };
}
const renderCard = (request, props = {}) => {
  const runtime = Model.createApprovalDraftRuntime();
  runtime.reconcile([request]);
  return renderToStaticMarkup(React.createElement(Card.SourceQuestionCard, { runtime, request, respond: async () => ({}), getVisibleThreadId: () => 'T', ...props }));
};

test('the host card is dt: c2d1aeb56 shell / body, bL title row with the n/m pill, collapse + dismiss, ut rows, Other row, Back / Skip / primary', () => {
  const html = renderCard(questionRequest({}, [{ id: 'q2', question: 'Second?', isOther: true, options: [{ label: 'A' }] }]));
  assert.match(html, /^<div class="source-message source-question-card epitaxy-approval-card relative isolate flex flex-col rounded-card p-\[12px\] gap-\[12px\] max-h-\[60vh\] [^"]* epitaxy-card-outline outline-none" role="group" tabindex="0"/);
  assert.match(html, /data-approval-presentation="card"/);
  assert.match(html, /<div class="epitaxy-scroll-clamp scroll-fade-y [^"]*epitaxy-approval-body flex min-h-0 flex-col gap-\[12px\]/);
  assert.match(html, /<div class="text-primary min-h-\[24px\] flex items-center gap-1">/);
  assert.match(html, /<span class="grid shrink-0 place-items-center rounded-full bg-warning px-sm text-caption tabular-nums text-warning" style="height:var\(--cds-leading-body\)">1\/2<\/span>/);
  assert.match(html, /<span data-question-stop-name="" class="text-body-semibold min-w-0 break-words"><span id="[^"]+" class="block select-text whitespace-pre-wrap \[unicode-bidi:plaintext\]">Which database\?<\/span>/);
  assert.match(html, /aria-label="View question options" aria-expanded="true"/);
  assert.match(html, /aria-label="Dismiss question"/);
  assert.equal(count(html, '<span class="pointer-events-none flex pointer-coarse:hidden">'), 3, 'keycaps 1, 2 and Other 3');
  assert.match(html, /<div class="flex flex-col gap-\[12px\] rounded-\[5px\] px-md py-md bg-alpha-1 hover:bg-alpha-2"><button type="button" class="flex items-center gap-sm text-body text-primary text-start [^"]*"><span class="flex-1 select-text">Other<\/span>/);
  assert.match(html, /<textarea data-cds="TextArea" rows="1" style="max-height:calc\(4lh \+ 2 \* var\(--cds-pad-sm\)\)[^"]*" tabindex="-1" aria-label="Other option" placeholder="Type your own answer here"/);
  assert.match(html, /<div class="epitaxy-expanding-body flow-root"><div class="flex items-center justify-end gap-\[8px\]">/);
  assert.doesNotMatch(html, />Back</, 'no Back on the first page');
  assert.match(html, />Skip<.*>Next</s);
  assert.match(html, /data-cds="Shortcut"[^>]*aria-hidden|aria-keyshortcuts/);
  assert.doesNotMatch(html, /sq-|Show previous question|Preview of/);
  // Inactive: no digit keycaps (X = E && w) and no primary shortcut.
  assert.equal(count(renderCard(questionRequest(), { isActive: false }), '<span class="pointer-events-none flex pointer-coarse:hidden">'), 0);
});

test('multiSelect rows draw CdsCheckboxIndicator, Other included; a Codex isOther:false request has no Other row and no Dismiss', () => {
  const multi = renderCard(questionRequest({ multiSelect: true }));
  assert.equal(count(multi, '<span data-size="sm" class="flex shrink-0">'), 3);
  assert.equal(count(multi, '<span class="pointer-events-none flex pointer-coarse:hidden">'), 0);
  const closed = renderCard(questionRequest({ isOther: false }));
  assert.doesNotMatch(closed, />Other<|Dismiss question/);
  assert.equal(count(closed, '<span class="pointer-events-none flex pointer-coarse:hidden">'), 2);
});

test('Dismiss answers every question with shared-5 VA', () => {
  assert.equal(count(fs.readFileSync(path.resolve(ROOT, '../reference/snapshots/claude-3.6556.2-20261025-192807/ion-dist/assets/v1/shared-5-Bg6ZMqvt.js'), 'utf8'),
    'VA="[User dismissed \\u2014 do not proceed, wait for next instruction]"'), 1);
  const payload = Model.dismissQuestionPayload(questionRequest(), Model.QUESTION_USER_DISMISSED_ANSWER);
  assert.deepEqual(payload, { answers: { q: { answers: ['[User dismissed — do not proceed, wait for next instruction]'] } } });
});

// $t under fakes: a window with capture keydown listeners, a document, the card root and a target element.
function digitWorld() {
  const listeners = [];
  const doc = { querySelectorAll: () => [], activeElement: null, body: null };
  const win = { document: doc, addEventListener: (type, fn, capture) => listeners.push({ type, fn, capture }),
    removeEventListener: (type, fn) => { const i = listeners.findIndex(l => l.type === type && l.fn === fn); if (i >= 0) listeners.splice(i, 1); } };
  doc.defaultView = win;
  const attrs = new Map();
  const element = (fields = {}) => ({ nodeType: 1, ownerDocument: doc, matches: () => false, closest: () => null, contains: () => false,
    shadowRoot: null, textContent: '', ...fields });
  const root = element({ setAttribute: (k, v) => attrs.set(k, v), removeAttribute: k => attrs.delete(k) });
  const outside = element();
  const key = (key, fields = {}) => {
    const event = { type: 'keydown', key, target: outside, repeat: false, metaKey: false, ctrlKey: false, altKey: false, shiftKey: false,
      isComposing: false, keyCode: 0, defaultPrevented: false, timeStamp: performance.now(), composedPath: () => [fields.target ?? outside],
      prevented: false, stopped: false, preventDefault() { this.prevented = true; this.defaultPrevented = true; },
      stopImmediatePropagation() { this.stopped = true; }, stopPropagation() { this.stopped = true; }, ...fields };
    for (const l of listeners.filter(l => l.type === 'keydown' && l.capture)) l.fn(event);
    return event;
  };
  return { listeners, attrs, root, element, key };
}
const digitProps = (world, picks, fields = {}) => ({ w: true, T: true, z: false, U: false, A: false, E: true, N: { current: world.root }, W: 2,
  xt: () => false, Yt: { current: -1 / 0 }, H: { current: true }, B: index => picks.push(index), ...fields });

test('$t: a digit typed outside the card picks (N+1 is Other), marks data-question-card-digits, and unmounts cleanly', () => {
  const world = digitWorld(), picks = [];
  const props = digitProps(world, picks);
  const dispose = Digits.questionDigitShortcuts(props)();
  assert.equal(world.attrs.get('data-question-card-digits'), '3', 'shared-156 Cq = options + 1');
  const two = world.key('2');
  assert.deepEqual(picks.splice(0), [1]);
  assert.ok(two.prevented && two.stopped);
  assert.equal(props.H.current, false, 'a digit pick drops the page-change focus flag');
  world.key('3');
  assert.deepEqual(picks.splice(0), [-1], 'N+1 is Other');
  assert.equal(world.key('4').prevented, false, 'past Other the key is left alone');
  assert.equal(world.key('1', { metaKey: true }).prevented, false, 'modified digits are not the card\'s');
  assert.equal(world.key('1', { repeat: true }).prevented, true, 'a held digit is swallowed but does not pick');
  assert.deepEqual(picks.splice(0), []);
  const field = world.element({ matches: s => s.startsWith('input,textarea') });
  assert.equal(world.key('1', { target: field }).prevented, false, 'digits type into a field');
  dispose();
  assert.equal(world.attrs.has('data-question-card-digits'), false);
  assert.equal(world.listeners.length, 0);
  assert.equal(world.key('1').prevented, false);
});

test('$t: off while inactive, collapsed, submitting or with digits disabled; held back by a composer popup and for 400ms after activation', () => {
  for (const off of [{ w: false }, { T: false }, { A: true }, { z: true }, { E: false }, { U: true }]) {
    const world = digitWorld(), picks = [];
    const dispose = Digits.questionDigitShortcuts(digitProps(world, picks, off))();
    assert.equal(dispose, undefined, JSON.stringify(off));
    assert.equal(world.listeners.length, 0);
  }
  const world = digitWorld(), picks = [];
  let popup = true;
  const props = digitProps(world, picks, { xt: () => popup, Yt: { current: Date.now() } });
  const dispose = Digits.questionDigitShortcuts(props)();
  assert.equal(world.key('1').prevented, false, 'a composer popup keeps its digits');
  popup = false;
  assert.equal(world.key('1').prevented, false, 'right after the card became active');
  props.Yt.current = Date.now() - 1000;
  world.key('1');
  assert.deepEqual(picks, [0]);
  dispose();
});

test('the host card runs $t with its own state (source wiring)', () => {
  const source = fs.readFileSync(path.join(ROOT, 'src/source-question-card.jsx'), 'utf8');
  assert.match(source, /questionDigitShortcuts\(\{ w: isActive, T: isFocusedPane, z: !!view\?\.busy, U: false, A: collapsed, E: true, N: root,\s+W: optionCount, xt: hasComposerPopup, Yt: activeSince, H: focusOnPage, B: pickDigit \}\)/);
  assert.match(source, /showDigitHint=\{showDigitHint\}/);
});

// W12 question-cont: dt's primary is c30607cef i (`je`), whose shortcut hides while the window is not attended (shared-10
// Fx). Fx and the tracker state it reads are approval-landing's (one instance); window-attention.mjs stays plain node (E42).
test('je: c30607cef i is generated over approval-landing Fx; Fx links window-attention Ix / Dx instead of a second WeakMap', async () => {
  const chunk = name => fs.readFileSync(path.resolve(path.dirname(OFFICIAL), name), 'utf8');
  assert.equal(count(chunk('c30607cef-YKGa83RR.js'), 'i=r()||(n.hideShortcut??!1);return J2($,0,n,i)?K2($,0,n,i,e(t,{...n,hideShortcut:i})):$[2]'), 1);
  assert.equal(count(chunk('shared-10-D6FXWZph.js'), 'let t=()=>r(Ix(e));t();let n=Dx.get(e)??new Set;return Dx.set(e,n.add(t))'), 1);
  assert.equal(count(official, 't(je,{variant:"primary",onMouseDown:at,onClick:kt,disabled:pr,shortcut:mr,children:hr}'), 1);
  assert.equal(count(official, 'T=Ce===void 0||Ce'), 1);
  const primary = manifest.modules.find(m => m.target === 'primary-button.mjs');
  assert.equal(primary.source, 'c30607cef-YKGa83RR.js');
  assert.deepEqual(primary.bindings.map(b => b.name), ['i']);
  assert.ok(primary.imports.some(i => i.local === 'r' && i.from === '../approval-landing/window-attention-hook.mjs' && i.name === 'useWindowUnattended'));
  assert.ok(primary.imports.some(i => i.local === 't' && i.kind === 'view-tabs' && i.name === 'CdsButton'));
  for (const m of manifest.modules) assert.ok(!(m.source === 'shared-10-D6FXWZph.js' && m.bindings.some(b => ['wx', 'Dx', 'Fx', 'Ix'].includes(b.name))), m.target);
  const landing = JSON.parse(fs.readFileSync(path.join(ROOT, 'src/generated/approval-landing/manifest.json'), 'utf8'));
  const hook = landing.modules.find(m => m.target === 'window-attention-hook.mjs');
  assert.deepEqual(hook.bindings.map(b => b.name), ['Fx']);
  assert.deepEqual(hook.imports.filter(i => i.kind === 'generated').map(i => `${i.local}=${i.from}:${i.name}`).sort(),
    ['Dx=./window-attention.mjs:attentionChangeListeners', 'Ix=./window-attention.mjs:windowUnattended']);
  const attention = landing.modules.find(m => m.target === 'window-attention.mjs');
  assert.ok(['wx', 'Dx', 'Ix'].every(name => attention.bindings.some(b => b.name === name)));
  assert.ok(attention.imports.every(i => !i.from.includes('view-tabs')), 'E42: window-attention.mjs never reaches view-tabs');
  assert.doesNotMatch(fs.readFileSync(path.join(ROOT, 'src/generated/approval-landing/window-attention.mjs'), 'utf8'), /view-tabs|from "react"/);
});

test('je: the primary shows ⌘↵ while the window is attended and hides it once focus went into an embedded frame', async () => {
  const { fakeWindow } = await import('./fixtures/approval-landing-dom.mjs');
  const { win, element } = fakeWindow();
  const anchor = element('div');
  const render = () => renderToStaticMarkup(React.createElement(ViewTabs.CdsOwnerWindowContext.Provider, { value: anchor },
    React.createElement(Primary.QuestionPrimaryButton, { variant: 'primary', shortcut: 'cmd+enter', children: 'Submit' })));
  // CdsButton hideShortcut (shared-frame Uu R): the keycap stays laid out but `invisible`, and aria-keyshortcuts goes.
  const shown = html => /aria-keyshortcuts=/.test(html) && /data-cds="Shortcut"/.test(html) && !/data-cds="Shortcut"[^>]*class="[^"]*\binvisible\b/.test(html);
  assert.ok(shown(render()), 'no tracker yet: attended');
  Attention.watchWindowAttention(win);
  assert.ok(shown(render()), 'attended');
  for (const l of win.listeners.filter(l => l.target === 'document' && l.type === 'focusin')) l.fn({ target: element('iframe') });
  assert.equal(Attention.windowUnattended(win), true);
  const hidden = render();
  assert.ok(!shown(hidden), 'unattended: hideShortcut');
  assert.doesNotMatch(hidden, /aria-keyshortcuts=/);
  assert.match(hidden, /data-cds="Shortcut"[^>]*class="[^"]*\binvisible\b/);
  assert.match(hidden, />Submit</);
});

test('dt T (isFocusedPane): the host passes its split side; it gates $t and ⌘↵ (nn = w && T), not the keycaps (X = E && w)', () => {
  const source = fs.readFileSync(path.join(ROOT, 'src/source-question-card.jsx'), 'utf8');
  assert.match(source, /<QuestionPrimaryButton\s+variant="primary"/);
  assert.match(source, /useCardHotkeys\(root, isActive && isFocusedPane && !menuOpen/);
  const main = fs.readFileSync(path.join(ROOT, 'src/main.jsx'), 'utf8');
  assert.match(main, /isActive=\{!!boot\?\.connected && !loading && current === approvalOwner\(a\)\}\s+\/\/[^\n]*\n\s+isFocusedPane=\{splitActive\}/);
  assert.equal(count(official, 'X=E&&w'), 1);
  const html = renderCard(questionRequest(), { isFocusedPane: false });
  assert.equal(count(html, '<span class="pointer-events-none flex pointer-coarse:hidden">'), 3);
});

// W12c (w12-carry-02, D1): shared-10 hx (the event age $t's `w7(400, we(e))` reads) is one copy, proposal-group's
// (shared-10-D6FXWZph.js exports it as tn, as the official chunk does); question-card no longer cuts its own.
test('shared-10 hx: digit-shortcuts imports proposal-group tn; no question-card module holds shared-10', () => {
  const chunk = fs.readFileSync(path.resolve(path.dirname(OFFICIAL), 'shared-10-D6FXWZph.js'), 'utf8');
  assert.equal(count(chunk, 'function hx(e){return Date.now()-mx(e)}'), 1);
  assert.equal(count(chunk, 'hx as tn'), 1);
  assert.equal(count(official, 'tn as we}from"./shared-10-D6FXWZph.js"'), 1);
  assert.ok(!manifest.modules.some(m => m.source === 'shared-10-D6FXWZph.js'));
  assert.ok(!fs.existsSync(path.join(ROOT, 'src/generated/question-card/shared-10.mjs')));
  const digits = manifest.modules.find(m => m.target === 'digit-shortcuts.mjs');
  assert.deepEqual(digits.imports.find(i => i.local === 'we'),
    { local: 'we', from: '../proposal-group/shared-10-D6FXWZph.js', name: 'tn', via: 'shared-10-D6FXWZph.js:tn', kind: 'linked', original: 'hx' });
  const group = JSON.parse(fs.readFileSync(path.join(ROOT, 'src/generated/proposal-group/manifest.json'), 'utf8'));
  const shared10 = group.modules.find(m => m.source === 'shared-10-D6FXWZph.js');
  assert.deepEqual(shared10.exports, { hx: 'tn' });
  assert.equal(Digits.questionDigitShortcuts !== undefined, true);
});
