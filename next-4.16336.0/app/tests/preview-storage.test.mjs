import test from 'node:test';
import assert from 'node:assert/strict';
import { previewStorageMode, previewStoragePartition, previewStorageRebindTabs } from '../electron/preview-storage.mjs';

test('three storage modes migrate the legacy preference and isolate by workspace/session', () => {
  assert.equal(previewStorageMode(undefined, true), 'shared');
  assert.equal(previewStorageMode(undefined), 'none');
  assert.equal(previewStorageMode('session', true), 'session');
  const base = { cwd: '/work/a', sessionId: 's1' };
  const partition = (mode, props = {}) => previewStoragePartition({ ...base, mode, ...props });
  assert.equal(partition('none'), partition('none', { sessionId: 's2' }));
  assert.notEqual(partition('none'), partition('none', { cwd: '/work/b' }));
  assert.ok(!partition('none').startsWith('persist:'));
  assert.notEqual(partition('session'), partition('session', { sessionId: 's2' }));
  assert.equal(partition('session'), partition('session', { cwd: '/work/renamed' }));
  assert.ok(partition('session').startsWith('persist:'));
  assert.equal(partition('shared'), 'persist:preview');
  for (const mode of ['none', 'session', 'shared']) assert.equal(partition(mode, { cowork: true }), 'persist:preview');
});

test('rebind matches original Aei replay eligibility and active-page choice', () => {
  const tabs = [
    { tabId: '1', url: 'https://example.test/one' },
    { tabId: '2', url: 'file:///work/index.html' },
    { tabId: '3', url: 'https://example.test/popup', popup: true },
    { tabId: '4', url: 'http://localhost:3000/two' },
    { tabId: '5', url: '', placeholder: true },
  ];
  for (const mode of ['none', 'session']) assert.deepEqual(previewStorageRebindTabs(tabs, '4', mode), [
    { url: tabs[0].url, active: false }, { url: tabs[3].url, active: true },
  ]);
  assert.deepEqual(previewStorageRebindTabs(tabs, '4', 'shared'), []);
});
