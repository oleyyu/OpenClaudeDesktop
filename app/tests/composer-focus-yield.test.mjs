// R2 composer-focus-yield (research/composer.md §3.9, ledger composer-10): 2.42304.0 c227f4d5e OP's focus API —
// scheduleFocus(caret, {yieldsToUser}), focusPreservingSelection(), ignoreStrayEnter() and the keydown Enter guard —
// on the host editor element, and the cc43287c9 call sites that use it. Controlled events over fake DOM objects (no
// window opens): the decisions are the generated originals (Xj over shared-28 wv, rP), driven through
// src/composer-focus-api.mjs exactly as SourceComposerEditor wires it.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { createComposerFocusApi } from '../src/composer-focus-api.mjs';
import { strayEnterWindowMs } from '../src/generated/code-composer/composer-card-tokens.mjs';

const app = path.resolve(import.meta.dirname, '..');
const readable = path.resolve(app, '../analysis/code-ui-unpack-20261017/readable');

// A minimal element tree: contains/closest over parent links, checkVisibility per element.
function fakeDocument() {
  const document = { activeElement: null };
  const element = ({ tag = 'div', role, cds, contentEditable, visible = true, parent = null } = {}) => {
    const node = { tag, role, cds, contentEditable, parent, ownerDocument: document, checkVisibility: () => visible };
    node.contains = other => { for (let n = other; n; n = n.parent) if (n === node) return true; return false; };
    node.matches = selector => selector.split(',').map(s => s.trim()).some(part => {
      if (part === tag) return true;
      if (part === '[contenteditable=""]') return contentEditable === '';
      if (part === '[contenteditable="true"]') return contentEditable === 'true';
      const roleMatch = part.match(/^\[role="([^"]+)"\]$/);
      if (roleMatch) return role === roleMatch[1];
      const cdsMatch = part.match(/^\[data-cds="([^"]+)"\]$/);
      if (cdsMatch) return cds === cdsMatch[1];
      return false;
    });
    node.closest = selector => { for (let n = node; n; n = n.parent) if (n.matches(selector)) return n; return null; };
    return node;
  };
  return { document, element };
}
function harness({ editable = true, focusLands = true } = {}) {
  const { document, element } = fakeDocument();
  const body = element({ tag: 'body' });
  const dom = element({ contentEditable: 'true', parent: body });
  const calls = [];
  let clock = 10_000, canEdit = editable;
  const api = createComposerFocusApi({
    dom, editable: () => canEdit,
    nativeFocus: options => { calls.push(['nativeFocus', options]); if (focusLands) document.activeElement = dom; },
    placeCaret: caret => calls.push(['placeCaret', caret]),
    focusView: () => calls.push(['focusView']),
    now: () => clock,
  });
  return { document, element, body, dom, calls, api, tick: ms => { clock += ms; }, setEditable: value => { canEdit = value; } };
}

test('scheduleFocus (Fi): native focus without scrolling, then the caret — "end" by default (Kr = t ?? "end")', () => {
  const h = harness();
  assert.equal(h.api.scheduleFocus(), true);
  assert.deepEqual(h.calls, [['nativeFocus', { preventScroll: true }], ['placeCaret', 'end']]);
  h.calls.length = 0;
  assert.equal(h.api.scheduleFocus('start'), true);
  assert.deepEqual(h.calls.at(-1), ['placeCaret', 'start']);
  h.calls.length = 0;
  assert.equal(h.api.scheduleFocus(null), true, 'null → "end"');
  assert.deepEqual(h.calls.at(-1), ['placeCaret', 'end']);
});

test('scheduleFocus does nothing for a non-editable editor, and places no caret when the focus did not land', () => {
  const h = harness({ editable: false });
  assert.equal(h.api.scheduleFocus(), false);
  assert.deepEqual(h.calls, []);
  const lost = harness({ focusLands: false });
  assert.equal(lost.api.scheduleFocus(), false, 'Fi: activeElement outside the editor → false');
  assert.deepEqual(lost.calls, [['nativeFocus', { preventScroll: true }]]);
});

test('yieldsToUser: focus in another visible field or an open dialog stays there; a hidden field, the editor itself or a button does not hold it', () => {
  const h = harness();
  const search = h.element({ tag: 'input', parent: h.body });
  const hidden = h.element({ tag: 'textarea', parent: h.body, visible: false });
  const button = h.element({ tag: 'button', parent: h.body });
  const dialog = h.element({ role: 'dialog', parent: h.body });
  const dialogButton = h.element({ tag: 'button', parent: dialog });
  const ask = h.element({ cds: 'AskUserQuestion', parent: h.body });
  const askOption = h.element({ tag: 'button', parent: ask });
  const inner = h.element({ tag: 'span', parent: h.dom });
  const run = (active, options = { yieldsToUser: true }) => { h.document.activeElement = active; h.calls.length = 0; return h.api.scheduleFocus(undefined, options); };
  assert.equal(run(search), false); assert.deepEqual(h.calls, [], 'a visible input elsewhere keeps the user’s focus');
  assert.equal(run(dialogButton), false); assert.deepEqual(h.calls, [], '[role=dialog]');
  assert.equal(run(askOption), false); assert.deepEqual(h.calls, [], 'AskUserQuestion surface');
  assert.equal(run(hidden), true, 'checkVisibility false: not the user’s field');
  assert.equal(run(button), true, 'a plain button is not a field');
  assert.equal(run(inner), true, 'focus inside the composer itself');
  assert.equal(run(null), true, 'nothing focused');
  assert.equal(run(search, {}), true, 'without yieldsToUser the composer takes focus');
  assert.equal(run(search, { yieldsToUser: 1 }), true, 'only yieldsToUser === true yields (n?.yieldsToUser === !0)');
});

test('focusPreservingSelection: view.focus() only — no caret move, no native scroll focus', () => {
  const h = harness();
  h.api.focusPreservingSelection();
  assert.deepEqual(h.calls, [['focusView']]);
  const throwing = createComposerFocusApi({ dom: h.dom, editable: () => true, nativeFocus() {}, placeCaret() {}, focusView() { throw new Error('destroyed'); } });
  assert.doesNotThrow(() => throwing.focusPreservingSelection(), 'the original try/catch swallows a view going away');
});

test('ignoreStrayEnter: Enter is swallowed for rP (500ms) from the call; repeats always; Shift/Alt never', () => {
  assert.equal(strayEnterWindowMs, 500);
  const h = harness();
  const enter = (extra = {}) => ({ key: 'Enter', shiftKey: false, altKey: false, metaKey: false, ctrlKey: false, repeat: false, ...extra });
  assert.equal(h.api.strayEnterUntil, -Infinity);
  assert.equal(h.api.swallowsEnter(enter()), false, 'no window before ignoreStrayEnter()');
  assert.equal(h.api.swallowsEnter(enter({ repeat: true })), true);
  h.api.ignoreStrayEnter();
  assert.equal(h.api.swallowsEnter(enter()), true, '0ms');
  h.tick(499); assert.equal(h.api.swallowsEnter(enter({ metaKey: true })), true, '499ms, Cmd+Enter too');
  assert.equal(h.api.swallowsEnter(enter({ shiftKey: true })), false);
  h.tick(1); assert.equal(h.api.swallowsEnter(enter()), false, '500ms');
  h.api.ignoreStrayEnter(); assert.equal(h.api.swallowsEnter(enter()), true, 'a new call restarts the window');
});

test('the transcribed focus API matches the original OP text (also pinned by extract-code-composer.mjs)', async () => {
  const chunk = await fs.readFile(path.join(readable, 'c227f4d5e-Ba-r--Rl.js'), 'utf8');
  for (const pin of ['i = n?.yieldsToUser === !0;', '(!i || !Xj(r.view.dom)) && Fi()', '((Kr.current = t ?? "end"), !r)',
    'e.focus({ preventScroll: !0 });', '(X.commands.focus(Kr.current), !0)', '(t.view.focus(), t.commands.focus(null, { scrollIntoView: !1 }));',
    'Xr.current = Date.now() + rP;', 'Xr = T(-1 / 0)', '(e.repeat || Date.now() < Xr.current) &&', '(e.metaKey || e.ctrlKey || zs())'])
    assert.ok(chunk.includes(pin), pin);
  const generator = await fs.readFile(path.join(app, 'scripts/extract-code-composer.mjs'), 'utf8');
  for (const pin of ['(e.repeat || Date.now() < Xr.current) &&', '(t.view.focus(), t.commands.focus(null, { scrollIntoView: !1 }));'])
    assert.ok(generator.includes(JSON.stringify(pin).slice(1, -1)) || generator.includes(pin), `generator pins ${pin}`);
});

test('SourceComposerEditor puts the API on its element and guards Enter before popups and the composer keys', async () => {
  const editor = await fs.readFile(path.join(app, 'src/source-composer-editor.jsx'), 'utf8');
  assert.match(editor, /import \{createComposerFocusApi\} from '\.\/composer-focus-api\.mjs';/);
  assert.match(editor, /input\.scheduleFocus=focusApi\.scheduleFocus;input\.focusPreservingSelection=focusApi\.focusPreservingSelection;input\.ignoreStrayEnter=focusApi\.ignoreStrayEnter;/);
  assert.match(editor, /keydown\(_view,event\)\{if\(latest\.current\.disabled\)return true;[\s\S]{0,260}if\(focusApi\.swallowsEnter\(event\)\)\{event\.preventDefault\(\);event\.stopPropagation\(\);return true;\}\s*latest\.current\.onKeyDown\?\.\(event\);/,
    'the guard runs before props.onKeyDown (OP onKeyDownCapture)');
  assert.match(editor, /nativeFocus:options=>HTMLElement\.prototype\.focus\.call\(input,options\)/);
  assert.match(editor, /caret==='start'\?Selection\.atStart\(doc\):caret==='end'\?Selection\.atEnd\(doc\):caret==='all'\?new AllSelection\(doc\):null/);
  // R3-composer step 3: placeCaretAtDom (the ChatComposer shell's storeCaret, shared-5 vp) goes with them.
  assert.match(editor, /'focusAndInsert','scheduleFocus','focusPreservingSelection','ignoreStrayEnter','placeCaretAtDom'\]\)delete input\[key\]/, 'removed with the editor');
});

// R3-composer step 3: the six cc43287c9 call sites now run through src/composer-focus-handoff.mjs, and
// tests/composer-focus-handoff.test.mjs drives them with controlled frames, clocks and key / pointer events (the R2 review
// asked for behaviour rather than main.jsx regexes); that file also pins the official sequences.
test('main.jsx: the cc43287c9 call sites go through composer-focus-handoff.mjs (behaviour: composer-focus-handoff.test.mjs)', async () => {
  const main = await fs.readFile(path.join(app, 'src/main.jsx'), 'utf8');
  assert.match(main, /from "\.\/composer-focus-handoff\.mjs";/);
  assert.match(main, /import \{ SourceBtwPane, SourceBtwApprovalSlot \} from "\.\/source-btw-pane\.jsx";/);
});
