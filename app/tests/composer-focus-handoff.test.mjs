// R3-composer step 3 (R2 review of composer-focus-yield, ledger composer-10): behaviour, not source text, of the six
// cc43287c9 call sites main.jsx runs on the composer element (src/composer-focus-handoff.mjs). Each scenario builds the
// composer element the way SourceComposerEditor does — the real createComposerFocusApi (generated Xj / wv / rP) on a fake
// element tree — with a controlled frame queue, a controlled clock and keyboard / pointer events, and checks what the
// user gets: where focus and the caret end up, whether focus stays in the field the user is typing in, and whether the
// Enter that triggered the handoff (or its key repeat) is swallowed instead of sending the draft.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { createComposerFocusApi } from '../src/composer-focus-api.mjs';
import { enterAction } from '../src/composer-keys-model.mjs';
import { strayEnterWindowMs } from '../src/generated/code-composer/composer-card-tokens.mjs';
import { isKeyboardActivation } from '../src/generated/code-composer/keyboard-activation.mjs';
import {
  approvalHandBackFocus, createdSessionFocus, forkAutoSendFocus, goalEditFocus, restoredTextFocus, selectionReplyFocus,
} from '../src/composer-focus-handoff.mjs';

const app = path.resolve(import.meta.dirname, '..');
const readable = path.resolve(app, '../analysis/code-ui-unpack-20261017/readable');

// A small element tree (parent links, contains / closest / matches for the selectors Xj and wv test, checkVisibility).
function world() {
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
    node.focus = () => { document.activeElement = node; };
    return node;
  };
  const body = element({ tag: 'body' });
  let clock = 50_000;
  const frames = [];
  const frame = callback => { frames.push(callback); };
  const flushFrame = () => { const due = frames.splice(0); for (const callback of due) callback(); return due.length; };
  // The composer element as SourceComposerEditor builds it: the API on the element, its caret, its selection, and its
  // keydown path (the guard first, then the composer's own Enter handling: enterAction → submit).
  const composer = element({ contentEditable: 'true', parent: body });
  composer.caret = 'kept';
  composer.selection = { from: 3, to: 7 };
  composer.sent = [];
  composer.editable = true;
  const api = createComposerFocusApi({
    dom: composer,
    editable: () => composer.editable,
    nativeFocus: () => { document.activeElement = composer; },
    placeCaret: caret => { composer.caret = caret; composer.selection = null; },
    focusView: () => { document.activeElement = composer; },
    now: () => clock,
  });
  Object.assign(composer, {
    scheduleFocus: api.scheduleFocus, focusPreservingSelection: api.focusPreservingSelection, ignoreStrayEnter: api.ignoreStrayEnter,
    keydown(event) {
      if (api.swallowsEnter(event)) return 'swallowed';
      const action = enterAction({ event });
      if (action === 'submit' || action === 'submit-later') { composer.sent.push(action); return 'sent'; }
      return action;
    },
  });
  return { document, element, body, composer, frames, frame, flushFrame, tick: ms => { clock += ms; } };
}
const enter = (extra = {}) => ({ key: 'Enter', shiftKey: false, altKey: false, metaKey: false, ctrlKey: false, repeat: false, ...extra });

test('created session (:47145): one frame later the new session\'s composer takes focus and ignores the repeat of the Enter that sent', () => {
  const w = world();
  createdSessionFocus({ composer: () => w.composer, stillCurrent: () => true, frame: w.frame });
  assert.equal(w.document.activeElement, null, 'nothing happens before the editor frame');
  assert.equal(w.composer.keydown(enter()), 'sent', 'before the handoff runs an Enter still sends');
  w.composer.sent.length = 0;
  assert.equal(w.flushFrame(), 1);
  assert.equal(w.document.activeElement, w.composer);
  assert.equal(w.composer.caret, 'end', 'scheduleFocus(void 0) puts the caret at the end');
  assert.equal(w.composer.keydown(enter({ repeat: true })), 'swallowed', 'the held Enter that created the session');
  assert.equal(w.composer.keydown(enter()), 'swallowed');
  assert.equal(w.composer.keydown(enter({ metaKey: true })), 'swallowed', '⌘⏎ too');
  assert.equal(w.composer.keydown(enter({ shiftKey: true })), 'newline', 'a newline is never swallowed');
  w.tick(strayEnterWindowMs - 1);
  assert.equal(w.composer.keydown(enter()), 'swallowed', `still inside rP (${strayEnterWindowMs}ms)`);
  w.tick(1);
  assert.equal(w.composer.keydown(enter()), 'sent', 'from rP on Enter sends again');
  assert.deepEqual(w.composer.sent, ['submit']);
});

test('created session: the user typing in another visible field keeps focus there, yet the composer still ignores the stray Enter', () => {
  const w = world();
  const search = w.element({ tag: 'input', parent: w.body });
  search.focus();
  createdSessionFocus({ composer: () => w.composer, frame: w.frame });
  w.flushFrame();
  assert.equal(w.document.activeElement, search, 'yieldsToUser: focus is not taken from a visible input');
  assert.equal(w.composer.caret, 'kept');
  assert.equal(w.composer.keydown(enter()), 'swallowed', 'ignoreStrayEnter runs regardless (the original calls it unconditionally)');
  // A hidden field (checkVisibility false) does not hold focus.
  const v = world();
  v.element({ tag: 'input', parent: v.body, visible: false }).focus();
  createdSessionFocus({ composer: () => v.composer, frame: v.frame });
  v.flushFrame();
  assert.equal(v.document.activeElement, v.composer);
  // An open dialog (shared-28 wv) holds it too.
  const d = world();
  const dialog = d.element({ role: 'dialog', parent: d.body });
  d.element({ tag: 'button', parent: dialog }).focus();
  createdSessionFocus({ composer: () => d.composer, frame: d.frame });
  d.flushFrame();
  assert.notEqual(d.document.activeElement, d.composer);
});

test('created session: navigating away before the frame (cJ fails) leaves focus and the Enter guard alone', () => {
  const w = world();
  let current = 'new-session';
  createdSessionFocus({ composer: () => w.composer, stillCurrent: () => current === 'new-session', frame: w.frame });
  current = 'other';
  w.flushFrame();
  assert.equal(w.document.activeElement, null);
  assert.equal(w.composer.keydown(enter()), 'sent');
  // No element (the editor did not mount): nothing throws.
  const v = world();
  createdSessionFocus({ composer: () => null, frame: v.frame });
  assert.doesNotThrow(() => v.flushFrame());
});

test('fork auto-send (:47139): focus yields to the user and no Enter is swallowed (the fork already sent its text)', () => {
  const w = world();
  forkAutoSendFocus(w.composer);
  assert.equal(w.document.activeElement, w.composer);
  assert.equal(w.composer.caret, 'end');
  assert.equal(w.composer.keydown(enter()), 'sent', 'only scheduleFocus: the original arms no stray-Enter window here');
  const v = world();
  const field = v.element({ tag: 'textarea', parent: v.body });
  field.focus();
  forkAutoSendFocus(() => v.composer);
  assert.equal(v.document.activeElement, field);
  // A read-only composer (an archived fork) is not focused.
  const r = world();
  r.composer.editable = false;
  forkAutoSendFocus(r.composer);
  assert.equal(r.document.activeElement, null);
  assert.doesNotThrow(() => forkAutoSendFocus(null));
});

test('rewind (:41729 La): two frames after the confirm, the restored text is focused at its end and the confirming Enter cannot send it', () => {
  const w = world();
  let sequence = 4;
  restoredTextFocus({ composer: () => w.composer, stillCurrent: () => sequence === 4, frame: w.frame });
  w.flushFrame();
  assert.equal(w.document.activeElement, null, 'one frame: the confirm dialog may still hold the modal inert');
  w.flushFrame();
  assert.equal(w.document.activeElement, w.composer);
  assert.equal(w.composer.caret, 'end');
  assert.equal(w.composer.keydown(enter({ repeat: true })), 'swallowed');
  w.tick(strayEnterWindowMs);
  assert.equal(w.composer.keydown(enter()), 'sent');
  // A newer load between the frames (loadSeq moved on) cancels the handoff.
  const v = world();
  restoredTextFocus({ composer: () => v.composer, stillCurrent: () => sequence === 4, frame: v.frame });
  v.flushFrame();
  sequence = 5;
  v.flushFrame();
  assert.equal(v.document.activeElement, null);
  assert.equal(v.composer.keydown(enter()), 'sent');
});

test('goal Edit (:38416 Rte + shared-8 xM): a keyboard-pressed Edit arms the Enter guard, a pointer click does not', () => {
  // Keyboard: Enter / Space on the button fires a click with detail 0 and an empty pointer type.
  const w = world();
  const keyboard = goalEditFocus({ composer: () => w.composer, event: { detail: 0, nativeEvent: { detail: 0, pointerType: '' } }, frame: w.frame });
  assert.equal(keyboard, true);
  assert.equal(w.document.activeElement, null, 'the prefill renders first; focus follows on the next frame');
  w.flushFrame();
  assert.equal(w.document.activeElement, w.composer);
  assert.equal(w.composer.caret, 'end');
  assert.equal(w.composer.keydown(enter()), 'swallowed', 'the activating Enter does not send /goal edit …');
  // Mouse: detail 1, pointerType "mouse".
  const m = world();
  assert.equal(goalEditFocus({ composer: () => m.composer, event: { detail: 1, nativeEvent: { detail: 1, pointerType: 'mouse' } }, frame: m.frame }), false);
  m.flushFrame();
  assert.equal(m.document.activeElement, m.composer);
  assert.equal(m.composer.keydown(enter()), 'sent', 'after a click Enter sends the edited goal at once');
  // A pointer click that reports detail 0 (a synthetic click from a pen / touch) is still not the keyboard: xM reads pointerType.
  const t = world();
  assert.equal(goalEditFocus({ composer: () => t.composer, event: { nativeEvent: { detail: 0, pointerType: 'touch' } }, frame: t.frame }), false);
  t.flushFrame();
  assert.equal(t.composer.keydown(enter()), 'sent');
  // The original predicate on plain native events.
  assert.equal(isKeyboardActivation({ detail: 0 }), true, 'a MouseEvent without pointerType (older click) at detail 0');
  assert.equal(isKeyboardActivation({ detail: 2, pointerType: '' }), false);
});

test('selection reply (:43844 Af): the guard is armed before focus, so the Enter of the menu pick never reaches the draft', () => {
  const w = world();
  const order = [];
  const wrap = { ignoreStrayEnter: () => { order.push('ignoreStrayEnter'); w.composer.ignoreStrayEnter(); },
    scheduleFocus: (...args) => { order.push('scheduleFocus'); return w.composer.scheduleFocus(...args); } };
  selectionReplyFocus({ composer: () => wrap, frame: w.frame });
  assert.deepEqual(order, []);
  w.flushFrame();
  assert.deepEqual(order, ['ignoreStrayEnter', 'scheduleFocus'], 'the original order: Na.current?.ignoreStrayEnter(), then scheduleFocus()');
  const v = world();
  selectionReplyFocus({ composer: () => v.composer, frame: v.frame });
  v.flushFrame();
  assert.equal(v.document.activeElement, v.composer);
  assert.equal(v.composer.caret, 'end');
  assert.equal(v.composer.keydown(enter()), 'swallowed');
  v.tick(strayEnterWindowMs);
  assert.equal(v.composer.keydown(enter()), 'sent');
});

test('approval hand-back (:36876 Mte no): focus returns with the draft\'s selection intact and the deciding Enter is swallowed', () => {
  const w = world();
  w.element({ tag: 'button', parent: w.body }).focus(); // the card's Allow button, about to unmount
  approvalHandBackFocus(w.composer);
  assert.equal(w.document.activeElement, w.composer);
  assert.equal(w.composer.caret, 'kept', 'focusPreservingSelection moves no caret');
  assert.deepEqual(w.composer.selection, { from: 3, to: 7 });
  assert.equal(w.composer.keydown(enter({ repeat: true })), 'swallowed', 'the held Enter that pressed Allow');
  assert.equal(w.composer.keydown(enter()), 'swallowed');
  w.tick(strayEnterWindowMs);
  assert.equal(w.composer.keydown(enter()), 'sent');
  assert.doesNotThrow(() => approvalHandBackFocus(undefined));
});

test('main.jsx hands each of the six sites to composer-focus-handoff (wiring only; the behaviour is the scenarios above)', async () => {
  const main = await fs.readFile(path.join(app, 'src/main.jsx'), 'utf8');
  assert.match(main, /import \{ approvalHandBackFocus, createdSessionFocus, forkAutoSendFocus, goalEditFocus, restoredTextFocus, selectionReplyFocus \} from "\.\/composer-focus-handoff\.mjs";/);
  const count = (pattern) => main.match(pattern)?.length ?? 0;
  assert.equal(count(/forkAutoSendFocus\(textarea\.current\)/g), 1);
  assert.equal(count(/createdSessionFocus\(\{ composer: \(\) => textarea\.current, stillCurrent: \(\) => currentRef\.current === id \}\)/g), 1);
  assert.equal(count(/restoredTextFocus\(\{composer:\(\)=>textarea\.current,stillCurrent:\(\)=>sequence===loadSeq\.current\}\)/g), 1);
  assert.equal(count(/goalEditFocus\(\{ composer: \(\) => textarea\.current, event \}\)/g), 1);
  assert.equal(count(/selectionReplyFocus\(\{ composer: \(\) => textarea\.current \}\)/g), 1);
  // R4g-btw BT4 (X7-16): the area's one approval slot (generated qj) takes it as toComposer.
  assert.equal(count(/toComposer: \(\) => approvalHandBackFocus\(textarea\.current\)/g), 1);
  // No call site keeps its own copy of the sequence.
  assert.doesNotMatch(main, /textarea\.current\?\.ignoreStrayEnter\?\.\(\)/);
  assert.doesNotMatch(main, /textarea\.current\?\.focusPreservingSelection\?\.\(\)/);
});

test('the six sequences and the keyboard test are the shipped 2.42304.0 text', async () => {
  const official = await fs.readFile(path.join(readable, 'cc43287c9-DAfOi8yP.js'), 'utf8');
  for (const pin of ['Na.current?.scheduleFocus(void 0, { yieldsToUser: !0 }),\n      (kh.current = !0));',
    '(Na.current?.scheduleFocus(void 0, { yieldsToUser: !0 }),\n        Na.current?.ignoreStrayEnter(),',
    't?.scheduleFocus(),\n        t?.ignoreStrayEnter(),', 'let a = () => (r && e.ignoreStrayEnter(), "inserted");',
    'Na.current?.ignoreStrayEnter(),\n          r ? kf(e) : Na.current?.scheduleFocus(),',
    '(de.current?.focusPreservingSelection(),\n            de.current?.ignoreStrayEnter(),'])
    assert.ok(official.includes(pin), pin);
  const goals = await fs.readFile(path.join(readable, 'cf74bc599-D9NZWRyl.js'), 'utf8');
  assert.ok(goals.includes('onClick: (e) => s(d, Da(e.nativeEvent)),'), 'the goal Edit passes xM(e.nativeEvent)');
  assert.ok(goals.includes('  Cr as Da,'), 'Da is shared-8 Cr (xM)');
});
