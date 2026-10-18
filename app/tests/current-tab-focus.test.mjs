import test from 'node:test';
import assert from 'node:assert/strict';
import { attachTabFocusRelease } from '../src/generated/code-current/tab-focus-release.mjs';
function fixture() {
  const document = new EventTarget(), view = new EventTarget(), viewport = new EventTarget();
  document.defaultView = view;
  view.AbortController = AbortController;
  view.getComputedStyle = () => ({ scrollPaddingTop: '24px' });
  viewport.ownerDocument = document;
  viewport.scrollTop = 1000;
  viewport.getBoundingClientRect = () => ({ top: 100, bottom: 500 });
  let pinned = true;
  const dispose = attachTabFocusRelease(viewport, { isPinned: () => pinned, setPinned: value => { pinned = value; } });
  const key = (options = {}) => {
    const event = new Event('keydown', { cancelable: true });
    Object.assign(event, { key: 'Tab', ctrlKey: false, metaKey: false, ...options });
    document.dispatchEvent(event);
    return event;
  };
  const focus = (top, height = 20, guard = false) => {
    const element = { nodeType: 1, closest: () => guard ? {} : null, getBoundingClientRect: () => ({ top, bottom: top + height, height }) };
    document.activeElement = element;
    const event = new Event('focusin');
    Object.defineProperty(event, 'target', { value: element });
    document.dispatchEvent(event);
    viewport.dispatchEvent(event);
  };
  return { key, focus, viewport, dispose, pinned: () => pinned };
}
test('Tab to a control above the padded viewport releases following, including browser scroll compensation', () => {
  for (const browserScroll of [0, -200]) {
    const f = fixture(); f.key(); f.viewport.scrollTop += browserScroll; f.focus(80 - browserScroll);
    assert.equal(f.pinned(), false); f.dispose();
  }
});
test('visible focus, pointer focus, cancelled Tab and control-modified Tab preserve following', () => {
  const visible = fixture(); visible.key(); visible.focus(200); assert.equal(visible.pinned(), true); visible.dispose();
  const pointer = fixture(); pointer.focus(80); assert.equal(pointer.pinned(), true); pointer.dispose();
  const cancelled = fixture(); cancelled.key().preventDefault(); cancelled.focus(80); assert.equal(cancelled.pinned(), true); cancelled.dispose();
  const modified = fixture(); modified.key({ ctrlKey: true }); modified.focus(80); assert.equal(modified.pinned(), true); modified.dispose();
});
test('focus guards do not consume the real Tab target and cleanup disconnects the listener', () => {
  const f = fixture(); f.key(); f.focus(80, 20, true); assert.equal(f.pinned(), true); f.focus(80); assert.equal(f.pinned(), false); f.dispose();
  const disposed = fixture(); disposed.key(); disposed.dispose(); disposed.focus(80); assert.equal(disposed.pinned(), true);
});
