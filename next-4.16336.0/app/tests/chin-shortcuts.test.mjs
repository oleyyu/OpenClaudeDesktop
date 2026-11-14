import test from 'node:test';
import assert from 'node:assert/strict';
import { CHIN_MENU_KINDS, MODE_MENU_KEYS, chinKindOfMenu, chinShortcutCommand, modeMenuDigit, resolveChinRequest } from '../src/chin-shortcuts.mjs';

// sidebar-rows.js:14191-14200 aR rows + shared-21 uR/sR exact-modifier match; c360a9e1c-GPs-MV9u.js Zd w/T (:4655-4775).
const key = (code, extra = {}) => ({ code, metaKey: true, shiftKey: false, ctrlKey: false, altKey: false, isComposing: false, repeat: false, ...extra });

test('each chin chord maps to its command', () => {
  assert.equal(chinShortcutCommand(key('KeyM', { shiftKey: true })), 'mode');
  assert.equal(chinShortcutCommand(key('KeyM', { altKey: true })), 'mode');
  assert.equal(chinShortcutCommand(key('KeyI', { shiftKey: true })), 'model');
  assert.equal(chinShortcutCommand(key('KeyE', { shiftKey: true })), 'effort');
  assert.equal(chinShortcutCommand(key('KeyF', { altKey: true })), 'fast');
  // ve("openModeMenu") returns the first row's RAW key string (mR :14359); formatting (⇧⌘M) is the tooltip's job.
  assert.equal(MODE_MENU_KEYS, 'cmd+shift+m', 've("openModeMenu") → first row cmd+shift+m');
});

test('ctrl, missing meta, composing, wrong modifiers and wrong codes are rejected', () => {
  for (const [code, mods] of [['KeyM', { shiftKey: true }], ['KeyM', { altKey: true }], ['KeyI', { shiftKey: true }], ['KeyE', { shiftKey: true }], ['KeyF', { altKey: true }]]) {
    for (const extra of [{ ctrlKey: true }, { metaKey: false }, { isComposing: true }])
      assert.equal(chinShortcutCommand(key(code, { ...mods, ...extra })), null, JSON.stringify({ code, extra }));
    // sR requires the exact modifier set: adding the other of shift/alt matches nothing.
    assert.equal(chinShortcutCommand(key(code, { shiftKey: true, altKey: true })), null, `${code} ⌘⇧⌥`);
  }
  // Pane chords (⌘⇧D/⌘⇧F), ⌘⇧F vs ⌥⌘F, plain ⌘ letters and other codes do not match.
  assert.equal(chinShortcutCommand(key('KeyF', { shiftKey: true })), null);
  assert.equal(chinShortcutCommand(key('KeyD', { shiftKey: true })), null);
  for (const code of ['KeyM', 'KeyI', 'KeyE', 'KeyF']) assert.equal(chinShortcutCommand(key(code)), null, `bare ⌘${code}`);
  assert.equal(chinShortcutCommand(key('KeyI', { altKey: true })), null, '⌥⌘I is DevTools, not the model menu');
  for (const code of ['KeyN', 'Digit1', 'BracketLeft', undefined]) assert.equal(chinShortcutCommand(key(code, { shiftKey: true })), null);
  assert.equal(chinShortcutCommand(null), null);
});

const counts = { effortCount: 4, modelCount: 6, modeCount: 3 };
test('requestOpen w: effort with ≤1 effort option falls back to the model menu', () => {
  assert.deepEqual(resolveChinRequest({ command: 'effort', ...counts }), { action: 'open', kind: 'effort' });
  assert.deepEqual(resolveChinRequest({ command: 'effort', ...counts, effortCount: 1 }), { action: 'open', kind: 'model' });
  assert.deepEqual(resolveChinRequest({ command: 'effort', ...counts, effortCount: 0 }), { action: 'open', kind: 'model' });
  assert.equal(resolveChinRequest({ command: 'effort', ...counts, effortCount: 1, modelCount: 0 }), null, 'no items → no-op');
  assert.deepEqual(resolveChinRequest({ command: 'effort', ...counts, modelCount: 0 }), { action: 'open', kind: 'effort' }, '(e===effort && r>1) || n.length>0');
  assert.deepEqual(resolveChinRequest({ command: 'model', ...counts }), { action: 'open', kind: 'model' });
  assert.deepEqual(resolveChinRequest({ command: 'mode', ...counts }), { action: 'open', kind: 'mode' });
  assert.equal(resolveChinRequest({ command: 'model', ...counts, modelCount: 0 }), null);
  assert.equal(resolveChinRequest({ command: 'mode', ...counts, modeCount: 0 }), null);
  assert.equal(resolveChinRequest({ command: 'model', ...counts, pickerDisabled: true }), null);
  assert.equal(resolveChinRequest({ command: 'effort', ...counts, pickerDisabled: true }), null);
  assert.deepEqual(resolveChinRequest({ command: 'mode', ...counts, pickerDisabled: true }), { action: 'open', kind: 'mode' });
  assert.equal(resolveChinRequest({ command: 'fast', ...counts }), null, 'fast is not a menu');
});

test('the same chord closes its open menu; a different open chin menu ignores the chord', () => {
  for (const kind of ['mode', 'model', 'effort']) assert.deepEqual(resolveChinRequest({ command: kind, openKind: kind, ...counts }), { action: 'close', kind });
  assert.deepEqual(resolveChinRequest({ command: 'effort', openKind: 'model', ...counts, effortCount: 1 }), { action: 'close', kind: 'model' }, 'resolved target is compared');
  assert.equal(resolveChinRequest({ command: 'effort', openKind: 'model', ...counts }), null);
  assert.equal(resolveChinRequest({ command: 'model', openKind: 'mode', ...counts }), null);
  assert.equal(resolveChinRequest({ command: 'mode', openKind: 'effort', ...counts }), null);
});

test('E21 Q6 p: with effortInModelMenu the Effort chord resolves to the model menu (open and close)', () => {
  const inMenu = { ...counts, effortInModelMenu: true };
  assert.deepEqual(resolveChinRequest({ command: 'effort', ...inMenu }), { action: 'open', kind: 'model' }, 'e==="effort"&&(p||a<=1)');
  assert.deepEqual(resolveChinRequest({ command: 'effort', openKind: 'model', ...inMenu }), { action: 'close', kind: 'model' }, 'y===t closes');
  assert.equal(resolveChinRequest({ command: 'effort', openKind: 'mode', ...inMenu }), null);
  assert.equal(resolveChinRequest({ command: 'effort', ...inMenu, pickerDisabled: true }), null, 'm && (model || effort)');
  assert.deepEqual(resolveChinRequest({ command: 'effort', ...inMenu, modelCount: 0 }), { action: 'open', kind: 'model' }, '(e==="effort"&&a>1)||i.length>0');
  assert.equal(resolveChinRequest({ command: 'effort', ...inMenu, effortCount: 1, modelCount: 0 }), null);
  assert.deepEqual(resolveChinRequest({ command: 'model', ...inMenu }), { action: 'open', kind: 'model' }, 'model chord unchanged');
});

test('a repeat never opens (or closes) a menu', () => {
  for (const command of ['mode', 'model', 'effort']) {
    assert.equal(resolveChinRequest({ command, repeat: true, ...counts }), null);
    assert.equal(resolveChinRequest({ command, openKind: command, repeat: true, ...counts }), null);
  }
  assert.equal(chinShortcutCommand(key('KeyI', { shiftKey: true, repeat: true })), 'model', 'still recognised so the caller preventDefaults it');
});

test('Mode menu digits and the local menu-kind mapping', () => {
  const plain = (code, extra = {}) => ({ code, metaKey: false, shiftKey: false, ctrlKey: false, altKey: false, isComposing: false, ...extra });
  for (let n = 0; n <= 9; n++) assert.equal(modeMenuDigit(plain(`Digit${n}`)), n);
  assert.equal(modeMenuDigit(plain('Digit2', { repeat: true })), 2, 'T has no repeat guard on digits');
  for (const extra of [{ metaKey: true }, { ctrlKey: true }, { altKey: true }, { shiftKey: true }, { isComposing: true }]) assert.equal(modeMenuDigit(plain('Digit2', extra)), null);
  for (const code of ['Numpad2', 'KeyA', 'Escape', undefined]) assert.equal(modeMenuDigit(plain(code)), null);
  assert.deepEqual(CHIN_MENU_KINDS, { mode: 'permission', model: 'model', effort: 'effort' });
  assert.equal(chinKindOfMenu('permission'), 'mode'); assert.equal(chinKindOfMenu('effort'), 'effort'); assert.equal(chinKindOfMenu('model'), 'model');
  for (const kind of ['add', 'usage', 'account', 'session', undefined]) assert.equal(chinKindOfMenu(kind), null);
});
