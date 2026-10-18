import test from 'node:test';
import assert from 'node:assert/strict';
import { sideChatEscape } from '../src/side-chat-keyboard.mjs';
import { sideChatStore as store } from '../src/side-chat-store.mjs';
import { stopSideQuestion } from '../src/side-chat-controls.mjs';

class WindowEvents {
  listeners = new Map();
  addEventListener(type, handler, capture) { assert.equal(capture, true); if (!this.listeners.has(type)) this.listeners.set(type, new Set()); this.listeners.get(type).add(handler); }
  removeEventListener(type, handler, capture) { assert.equal(capture, true); this.listeners.get(type)?.delete(handler); }
  send(event, next = () => {}) {
    for (const handler of [...this.listeners.get(event.type) ?? []]) handler(event);
    if (!event.stopped) next(event);
  }
  get count() { return [...this.listeners.values()].reduce((count, set) => count + set.size, 0); }
}
function keyboard(view, fields = {}) {
  return { type: 'keydown', key: 'Escape', repeat: false, keyCode: 27, defaultPrevented: false, stopped: false,
    currentTarget: { ownerDocument: { defaultView: view }, querySelector: () => null },
    preventDefault() { this.defaultPrevented = true; }, stopPropagation() { this.stopped = true; },
    nativeEvent: { isComposing: false, stopImmediatePropagation() {} }, ...fields };
}

test('holding Escape cancels one real side request and cannot close it or interrupt the main turn when cancellation settles', async () => {
  const view = new WindowEvents(), threadId = 'keyboard-interrupt'; let finish, calls = 0, closed = 0, main = 0, cancellation;
  store.clear(threadId); store.ask(threadId, 'question', 'request'); store.delta(threadId, 'request', 'partial');
  const rpc = () => { calls++; return new Promise(resolve => { finish = resolve; }); };
  const dispatch = event => view.send(event, event => {
    sideChatEscape(event, { state: store.get(threadId), onStop: () => { cancellation = stopSideQuestion({ threadId, rpc }); }, onClose: () => { closed++; } });
    if (!event.stopped) main++;
  });
  dispatch(keyboard(view));
  assert.equal(calls, 1); assert.equal(store.get(threadId).interrupting, true); assert.equal(view.count, 2);
  for (let i = 0; i < 5; i++) dispatch(keyboard(view, { repeat: true }));
  finish({}); await cancellation;
  dispatch(keyboard(view, { repeat: true }));
  assert.equal(calls, 1); assert.equal(closed, 0); assert.equal(main, 0);
  assert.equal(store.get(threadId).messages.at(-1).text, 'partial');
  view.send(keyboard(view, { type: 'keyup' })); assert.equal(view.count, 0);
  dispatch(keyboard(view)); assert.equal(closed, 1);
  view.send(keyboard(view, { repeat: true }), () => { main++; }); assert.equal(main, 0);
  view.send(keyboard(view, { type: 'keyup' })); assert.equal(view.count, 0);
  view.send(keyboard(view), () => { main++; }); assert.equal(main, 1);
});

test('already interrupting consumes Escape without installing another hold guard or sending another cancel', () => {
  const view = new WindowEvents(); let stopped = 0, closed = 0;
  const event = keyboard(view);
  assert.equal(sideChatEscape(event, { state: { status: 'thinking', interrupting: true, requestId: 'request' }, onStop: () => { stopped++; }, onClose: () => { closed++; } }), true);
  assert.equal(stopped, 0); assert.equal(closed, 0); assert.equal(view.count, 0);
  assert.equal(event.defaultPrevented, true); assert.equal(event.stopped, true);
});

test('IME, open layers and unrelated keys keep control of their own event', () => {
  const view = new WindowEvents(), fail = () => assert.fail('must leave this event to its layer');
  for (const fields of [{ key: 'Enter' }, { nativeEvent: { isComposing: true } }, { keyCode: 229 },
    { currentTarget: { ownerDocument: { defaultView: view }, querySelector: () => ({}) } }]) {
    const event = keyboard(view, fields);
    assert.equal(sideChatEscape(event, { state: { status: 'thinking', requestId: 'request' }, onStop: fail, onClose: fail }), false);
    assert.equal(event.stopped, false); assert.equal(event.defaultPrevented, false); assert.equal(view.count, 0);
  }
});

test('2.42304.0 he: an Escape another layer already prevented only arms the hold guard, never cancels, closes or stops it', () => {
  const fail = () => assert.fail('a prevented Escape must not cancel the side request');
  for (const state of [{ status: 'thinking', requestId: 'request' }, { status: 'thinking', interrupting: true, requestId: 'request' },
    { status: 'thinking' }, { status: 'idle' }]) {
    const view = new WindowEvents(); let closed = 0, reached = 0, immediate = 0;
    const handlers = { state, onStop: fail, onClose: () => { closed++; } };
    // A window/document capture layer (e.g. a popover) takes the first press and calls preventDefault.
    const event = keyboard(view, { nativeEvent: { isComposing: false, stopImmediatePropagation() { immediate++; } } });
    event.preventDefault();
    assert.equal(sideChatEscape(event, handlers), false);
    assert.equal(closed, 0); assert.equal(event.stopped, false); assert.equal(immediate, 0); assert.equal(view.count, 2);
    // That layer is gone now; holding the key still cannot reach the side chat and close or cancel it.
    for (let i = 0; i < 3; i++) view.send(keyboard(view, { repeat: true }), event => { reached++; sideChatEscape(event, handlers); });
    assert.equal(reached, 0); assert.equal(closed, 0);
    view.send(keyboard(view, { type: 'keyup' })); assert.equal(view.count, 0);
  }
});

test('a fresh Escape with no request to cancel closes; another key releases the repeat guard', () => {
  const view = new WindowEvents(); let closed = 0;
  for (const state of [{ status: 'thinking' }, { status: 'idle' }]) {
    const event = keyboard(view);
    assert.equal(sideChatEscape(event, { state, onStop: () => assert.fail('no request to cancel'), onClose: () => { closed++; } }), true);
    assert.equal(event.stopped, true); assert.equal(event.defaultPrevented, false); assert.equal(view.count, 2);
    view.send(keyboard(view, { key: 'a' })); assert.equal(view.count, 0);
  }
  assert.equal(closed, 2);
});

test('after a prevented press is released, the next Escape is the side chat\'s again', () => {
  const view = new WindowEvents(); let closed = 0;
  const handlers = { state: { status: 'idle' }, onStop: () => assert.fail('no request to cancel'), onClose: () => { closed++; } };
  const prevented = keyboard(view); prevented.preventDefault();
  sideChatEscape(prevented, handlers); assert.equal(closed, 0);
  view.send(keyboard(view, { type: 'keyup' })); assert.equal(view.count, 0);
  view.send(keyboard(view), event => sideChatEscape(event, handlers)); assert.equal(closed, 1);
});
