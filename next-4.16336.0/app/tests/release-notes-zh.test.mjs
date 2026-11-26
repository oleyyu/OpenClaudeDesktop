// The What’s new dialog shows each bundled release note through t(): a Simplified Chinese window must not list
// English items under translated headings, so every item has its zh-CN line, with the same `code` spans.
import test from 'node:test';
import assert from 'node:assert/strict';
import { RELEASE_NOTES } from '../src/release-notes.mjs';
import { dictionary } from '../electron/i18n/index.mjs';

test('every release note item has a zh-CN translation keeping its code spans', () => {
  const zh = dictionary('zh-CN');
  const spans = (text) => (text.match(/`[^`]+`/g) ?? []).join('|');
  for (const { version, items } of RELEASE_NOTES) for (const { text } of items) {
    assert.ok(Object.hasOwn(zh, text), `${version}: no zh-CN line for "${text}"`);
    assert.equal(spans(zh[text]), spans(text), `${version}: code spans of "${text}"`);
  }
});
