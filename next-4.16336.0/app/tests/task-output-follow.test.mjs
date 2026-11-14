import test from 'node:test';
import assert from 'node:assert/strict';
import { createStickToBottom, createTaskOutputFollow } from '../src/task-output-follow.mjs';

function output(selection = null) {
  const inside = {};
  return { inside, scrollHeight: 1000, clientHeight: 200, scrollTop: 0,
    contains: node => node === inside, ownerDocument: { defaultView: { getSelection: () => selection } } };
}
test('task output follows initially, remembers user pause after reopen, and resumes only within 16px', () => {
  const follow = createTaskOutputFollow(), node = output();
  follow.update('session:item', node); assert.equal(node.scrollTop, 1000);
  node.scrollTop = 300; follow.record('session:item', node);
  const reopened = output(); follow.update('session:item', reopened); assert.equal(reopened.scrollTop, 0);
  reopened.scrollTop = 784; follow.record('session:item', reopened); follow.update('session:item', reopened);
  assert.equal(reopened.scrollTop, 784, 'exactly 16px remains paused in source zb');
  reopened.scrollTop = 785; follow.record('session:item', reopened); follow.update('session:item', reopened);
  assert.equal(reopened.scrollTop, 1000);
});
test('only a noncollapsed selection anchored inside this output pauses following', () => {
  const selection = { isCollapsed: false, anchorNode: null }, node = output(selection), follow = createTaskOutputFollow();
  selection.anchorNode = node.inside; follow.update('key', node); assert.equal(node.scrollTop, 0);
  selection.anchorNode = {}; follow.update('key', node); assert.equal(node.scrollTop, 1000);
  node.scrollTop = 0; selection.anchorNode = node.inside; selection.isCollapsed = true;
  follow.update('key', node); assert.equal(node.scrollTop, 1000);
});
test('session identity separates matching item IDs and bounded cache drops oldest follow intent', () => {
  const follow = createTaskOutputFollow(2), node = output();
  follow.record(JSON.stringify(['a','item']), node);
  follow.update(JSON.stringify(['b','item']), node); assert.equal(node.scrollTop, 1000);
  node.scrollTop = 0; follow.record('second', node); follow.record('third', node);
  follow.update(JSON.stringify(['a','item']), node); assert.equal(node.scrollTop, 1000);
  const other = output(); follow.update('second', other); assert.equal(other.scrollTop, 0);
  follow.update('missing-element', null);
});

// Ow + qa (cccc2cf0a :12810-12840, c7f8992b4): the sub-agent transcript's follow.
test('sub-agent transcript starts unpinned, snaps once, follows growth, and releases on an upward scroll', () => {
  const follow = createStickToBottom(), node = output();
  assert.equal(follow.pinned, false);
  assert.equal(follow.follow(node), false, 'initialPinned false: growth alone never scrolls'); assert.equal(node.scrollTop, 0);
  follow.snap(node); assert.equal(node.scrollTop, 800); assert.equal(follow.pinned, true);
  assert.equal(follow.scrolled(node), true, 'its own scroll event keeps the pin');
  node.scrollHeight = 1400; follow.follow(node); assert.equal(node.scrollTop, 1200, 'new output follows while pinned');
  node.scrollTop = 1184; assert.equal(follow.scrolled(node), true, 'within 16px stays pinned');
  node.scrollTop = 1100; assert.equal(follow.scrolled(node), false, 'scrolling up past 16px unpins');
  node.scrollHeight = 1600; follow.follow(node); assert.equal(node.scrollTop, 1100, 'unpinned: the reader keeps their place');
  node.scrollTop = 1395; assert.equal(follow.scrolled(node), true, 'back at the bottom pins again');
  follow.release(); assert.equal(follow.pinned, false, 'an upward wheel or key releases at once');
  node.scrollHeight = 1800; follow.follow(node); assert.equal(node.scrollTop, 1395);
});
test('sub-agent follow holds while a selection is inside the transcript', () => {
  const selection = { isCollapsed: false, anchorNode: null }, node = output(selection), follow = createStickToBottom();
  follow.snap(node); selection.anchorNode = node.inside; node.scrollHeight = 2000;
  follow.follow(node); assert.equal(node.scrollTop, 800);
  selection.isCollapsed = true; follow.follow(node); assert.equal(node.scrollTop, 1800);
});
test('sub-agent follow yields to an upward scroll whose event has not arrived before the next resnap', () => {
  const follow = createStickToBottom(), node = output();
  follow.snap(node); assert.equal(node.scrollTop, 800);
  node.scrollTop = 500; node.scrollHeight = 1200; follow.follow(node);
  assert.equal(node.scrollTop, 500, 'a scrollbar drag between renders keeps its place'); assert.equal(follow.pinned, false);
  const shrink = createStickToBottom(), other = output();
  shrink.snap(other); other.scrollHeight = 990; other.scrollTop = 790; shrink.follow(other);
  assert.equal(shrink.pinned, true, 'a clamp from shrinking content is not the reader'); assert.equal(other.scrollTop, 790);
});
