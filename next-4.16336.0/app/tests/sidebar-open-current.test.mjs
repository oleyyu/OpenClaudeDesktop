import test from 'node:test';
import assert from 'node:assert/strict';
import { sidebarComposerFocus } from '../src/sidebar-open-model.mjs';
const event = (detail, { coarse = false, touches = 0, electron = false } = {}) => ({ detail, currentTarget: { ownerDocument: { defaultView: { navigator: { userAgent: electron ? 'Chrome Electron/44.0' : 'Chrome', maxTouchPoints: touches }, matchMedia: () => ({ matches: coarse }) } } } });

test('only a primary Code single click requests caret-at-end, including a split with primary focus', () => {
  assert.equal(sidebarComposerFocus(event(1)), true);
  assert.equal(sidebarComposerFocus(event(1), { splitOpen: true, focusedPane: 0 }), true);
  assert.equal(sidebarComposerFocus(event(1), { splitOpen: true, focusedPane: 1 }), false);
  for (const detail of [0, 2, 3]) assert.equal(sidebarComposerFocus(event(detail)), false);
  for (const mode of ['chat', 'cowork']) assert.equal(sidebarComposerFocus(event(1), { mode }), false);
});
test('the original focus capability skips coarse touch browsers but permits Electron', () => {
  assert.equal(sidebarComposerFocus(event(1, { coarse: true, touches: 1 })), false);
  assert.equal(sidebarComposerFocus(event(1, { coarse: true, touches: 1, electron: true })), true);
  assert.equal(sidebarComposerFocus(event(1, { coarse: false, touches: 1 })), true);
});
