import test from 'node:test';
import assert from 'node:assert/strict';
import { fileTreeVisible, peekOnFileOpen } from '../src/file-tree-mode.mjs';
import { sanitizeSessionEntry } from '../src/tile-layout-store.mjs';

const state = { hasFile: true, hasTabs: true, canFit: true, shown: false, peek: false, hiddenWhileEmpty: false };

test('search can show the file tree without changing the persistent preference', () => {
  assert.equal(fileTreeVisible(state), false);
  const searching = { ...state, peek: true };
  assert.equal(fileTreeVisible(searching), true);
  assert.equal(searching.shown, false);
  assert.equal(fileTreeVisible({ ...searching, peek: false }), false, 'closing the pane clears the transient display');
  assert.equal(fileTreeVisible({ ...state, shown: true }), true, 'explicitly shown tree survives without a peek');
});

test('opening the first file preserves a fitting browser tree but not an explicitly hidden empty tree', () => {
  assert.equal(peekOnFileOpen({ ...state, hasFile: false }), true);
  for (const patch of [{ hiddenWhileEmpty: true }, { canFit: false }, { shown: true }, { peek: true }])
    assert.equal(peekOnFileOpen({ ...state, hasFile: false, ...patch }), false);
  assert.equal(peekOnFileOpen(state), false, 'opening a second file does not expose a hidden tree');
});

test('narrow panes show either the file or the tree, and restore the peek when wide again', () => {
  const searching = { ...state, peek: true };
  assert.equal(fileTreeVisible({ ...searching, canFit: false }), false);
  assert.equal(fileTreeVisible({ ...searching, canFit: false, hasFile: false }), true);
  assert.equal(fileTreeVisible(searching), true);
  assert.equal(fileTreeVisible({ ...state, hasFile: false, hasTabs: false, hiddenWhileEmpty: true }), false);
});

test('transient peek cannot enter persisted per-session layouts', () => {
  const saved = sanitizeSessionEntry({ treeShown: false, treePeek: true });
  assert.equal(saved.treeShown, false);
  assert.equal(Object.hasOwn(saved, 'treePeek'), false);
});
