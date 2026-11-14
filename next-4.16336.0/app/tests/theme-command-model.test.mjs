import test from 'node:test';
import assert from 'node:assert/strict';
import { parseThemeCommand, localizedThemeWords, resolveThemeMode, initialAppearance, isColorTransitionProperty, finishesColorTransitions, finishColorTransitions, writeThemeMode } from '../src/theme-command-model.mjs';

test('/theme follows cc43287c9 zI: light, dark, system, auto as system; anything else opens Appearance', () => {
  assert.deepEqual(parseThemeCommand('light'), { set: 'light' });
  assert.deepEqual(parseThemeCommand('dark'), { set: 'dark' });
  assert.deepEqual(parseThemeCommand('system'), { set: 'system' });
  assert.deepEqual(parseThemeCommand('auto'), { set: 'system' });
  assert.deepEqual(parseThemeCommand('  DARK '), { set: 'dark' });
  assert.deepEqual(parseThemeCommand('Auto'), { set: 'system' });
  for (const value of ['', '   ', undefined, null, 'sepia', 'dark mode'])
    assert.deepEqual(parseThemeCommand(value), { open: 'appearance' }, String(value));
  // W14-code r3 R3DC-05: /theme toasts the three literal c4 addSuccess('Appearance set to …') lines, so THEME_LABELS is gone.
});

test('/theme r4: text on more than one line is extra lines; trailing whitespace is not', () => {
  assert.deepEqual(parseThemeCommand('dark\nlight'), { extraLines: true });
  assert.deepEqual(parseThemeCommand('\ndark'), { extraLines: true }, 'r4 looks at the rest after /theme, untrimmed at its start');
  assert.deepEqual(parseThemeCommand('dark\r\nx'), { extraLines: true });
  assert.deepEqual(parseThemeCommand(' dark \n'), { set: 'dark' });
});

test('/theme r4: the interface language names count, case-insensitively, after the English words', () => {
  const zh = new Map([['跟随系统', 'system'], ['浅色', 'light'], ['深色', 'dark']]);
  assert.deepEqual(parseThemeCommand('浅色', zh), { set: 'light' });
  assert.deepEqual(parseThemeCommand(' 深色 ', zh), { set: 'dark' });
  assert.deepEqual(parseThemeCommand('跟随系统', zh), { set: 'system' });
  assert.deepEqual(parseThemeCommand('dark', zh), { set: 'dark' }, 'English words still work under another language');
  assert.deepEqual(parseThemeCommand('浅色'), { open: 'appearance' }, 'en-US: the default map only holds the English names');
  assert.deepEqual(parseThemeCommand('Système', new Map([['système', 'system']])), { set: 'system' });
  assert.deepEqual([...localizedThemeWords()], [['system', 'system'], ['light', 'light'], ['dark', 'dark']]);
});

test('mode resolution (shared-7 Bh): explicit wins, system and unknown follow prefers-color-scheme', () => {
  assert.equal(resolveThemeMode('light', true), 'light');
  assert.equal(resolveThemeMode('dark', false), 'dark');
  assert.equal(resolveThemeMode('system', true), 'dark');
  assert.equal(resolveThemeMode('system', false), 'light');
  assert.equal(resolveThemeMode(undefined, true), 'dark');
});

test('the first paint uses the preload appearance, else the media query', () => {
  assert.deepEqual(initialAppearance({ theme: 'dark', mode: 'dark' }, false), { theme: 'dark', mode: 'dark' });
  assert.deepEqual(initialAppearance({ theme: 'system', mode: 'dark' }, false), { theme: 'system', mode: 'dark' });
  assert.deepEqual(initialAppearance({ theme: 'light' }, true), { theme: 'light', mode: 'light' });
  assert.deepEqual(initialAppearance(null, true), { theme: 'system', mode: 'dark' });
  assert.deepEqual(initialAppearance({ theme: 'auto', mode: 'system' }, false), { theme: 'system', mode: 'light' });
});

test('shared-7 Ph picks colour transitions; only a light/dark flip finishes them', () => {
  for (const property of ['color', 'background-color', 'border-top-color', 'outline-color', 'box-shadow', 'text-shadow', 'fill', 'stroke', '--tw-gradient-from'])
    assert.ok(isColorTransitionProperty(property), property);
  for (const property of ['opacity', 'transform', 'scale', 'width', 'visibility']) assert.equal(isColorTransitionProperty(property), false, property);
  assert.equal(finishesColorTransitions('light', 'dark'), true);
  assert.equal(finishesColorTransitions('dark', 'light'), true);
  assert.equal(finishesColorTransitions(undefined, 'dark'), false);
  assert.equal(finishesColorTransitions('system', 'dark'), false);
  assert.equal(finishesColorTransitions('dark', 'dark'), false);
});

test('finishColorTransitions finishes running colour CSSTransitions only', () => {
  const animation = (transitionProperty, extra = {}) => ({ transitionProperty, playbackRate: 1, playState: 'running', finished: false, finish() { this.finished = true; }, ...extra });
  const list = [animation('background-color'), animation('box-shadow'), animation('opacity'), animation('color', { playState: 'paused' }), animation('color', { playbackRate: -1 }), { animationName: 'spin', finish() { throw new Error('not a transition'); } }];
  assert.equal(finishColorTransitions({ getAnimations: () => list }), 2);
  assert.deepEqual(list.slice(0, 5).map((entry) => entry.finished), [true, true, false, false, false]);
  assert.equal(finishColorTransitions({}), 0);
});

test('writeThemeMode writes the resolved mode and schedules the finish only for a flip', () => {
  const doc = { documentElement: { dataset: {} }, getAnimations: () => [] };
  const scheduled = [];
  const schedule = (callback) => scheduled.push(callback);
  assert.equal(writeThemeMode(doc, 'light', schedule), true);
  assert.equal(doc.documentElement.dataset.mode, 'light');
  assert.equal(scheduled.length, 0, 'the first write (from no value) finishes nothing');
  assert.equal(writeThemeMode(doc, 'light', schedule), false);
  assert.equal(writeThemeMode(doc, 'dark', schedule), true);
  assert.equal(doc.documentElement.dataset.mode, 'dark');
  assert.equal(scheduled.length, 1);
  doc.documentElement.dataset.mode = 'system';
  writeThemeMode(doc, 'dark', schedule);
  assert.equal(scheduled.length, 1, 'leaving the unresolved html value finishes nothing');
});
