import test from 'node:test';
import assert from 'node:assert/strict';
import { btwTitle, btwTitleWords } from '../electron/generated/btw-title.mjs';
test('current original title: localized fallback, whitespace collapse and exact 60-character edge', () => {
  assert.equal(btwTitle(undefined, '侧聊'), '侧聊');
  assert.equal(btwTitle(' \t\n', 'Side chat'), 'Side chat');
  assert.equal(btwTitle(' a\n b\t c ', 'Side chat'), 'btw: a b c');
  assert.equal(btwTitle('x'.repeat(60), 'Side chat'), 'btw: ' + 'x'.repeat(60));
  assert.equal(btwTitle('x'.repeat(61), 'Side chat'), 'btw: ' + 'x'.repeat(59) + '…');
});
test('truncated title never splits an emoji cluster or trailing whitespace', () => {
  assert.equal(btwTitle('a'.repeat(57) + '👨‍👩‍👧‍👦 xy', 'Side chat'), 'btw: ' + 'a'.repeat(57) + '…');
  assert.equal(btwTitle('a'.repeat(58) + ' long tail', 'Side chat'), 'btw: ' + 'a'.repeat(58) + '…');
});
test('follow-up auto-title excludes quoted context exactly as Jo does', () => {
  assert.equal(btwTitleWords('> a quoted selection\nactual question\n> more context'), 'actual question');
  assert.equal(btwTitleWords(' > indented text\nnext'), ' > indented text next');
});
