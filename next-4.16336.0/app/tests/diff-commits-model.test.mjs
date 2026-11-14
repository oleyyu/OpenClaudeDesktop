import test from 'node:test';
import assert from 'node:assert/strict';
import {
  COMMITS_SECTION_LIMIT, COMMIT_ROW_ACTIVE, COMMIT_ROW_IDLE, DIFF_COMMITS_LABELS, commitMeta, commitRowTarget, commitsSectionRows, isDragSelectClick, olderCommitsLabel,
} from '../src/diff-commits-model.mjs';

// B15: 2.31226.0 c44d00c7f qr (:932-1002), zr (:727-774), Ur (:787-807), Wr (:808-881), ce9ca5630 a/c.
const commit = (n) => ({ sha: n.toString(16).padStart(40, 'b'), shortSha: n.toString(16).padStart(7, 'b'), subject: `C${n}` });

test('qr rows: newest 100, a selected older commit appended, hidden = total − shown', () => {
  const list = Array.from({ length: 120 }, (_, index) => commit(index + 1));
  assert.equal(COMMITS_SECTION_LIMIT, 100);
  const plain = commitsSectionRows(list, null, 120);
  assert.equal(plain.rows.length, 100); assert.equal(plain.hidden, 20);
  const picked = commitsSectionRows(list, list[110].sha, 120);
  assert.equal(picked.rows.length, 101); assert.equal(picked.rows.at(-1).sha, list[110].sha); assert.equal(picked.hidden, 19);
  // The fetch stops at 101 rows; rev-list --count keeps the hidden count real.
  assert.equal(commitsSectionRows(list.slice(0, 101), null, 400).hidden, 300);
  assert.equal(commitsSectionRows(list.slice(0, 3), null, 1).hidden, 0, 'a smaller stale total never goes negative');
  assert.deepEqual(commitsSectionRows(undefined, null), { rows: [], hidden: 0 });
  assert.equal(commitsSectionRows(list.slice(0, 3), 'f'.repeat(40), 3).rows.length, 3, 'an unknown selection adds nothing');
  assert.equal(olderCommitsLabel(1), '1 older commit not shown');
  assert.equal(olderCommitsLabel(5), '5 older commits not shown');
});

test('zr targets: arrows step and clamp; from no focused row they land on the pressed (else first) row; Home/End', () => {
  assert.equal(commitRowTarget('ArrowDown', { index: -1, count: 5, pressedIndex: 3 }), 3);
  assert.equal(commitRowTarget('ArrowUp', { index: -1, count: 5 }), 0);
  assert.equal(commitRowTarget('ArrowDown', { index: 4, count: 5 }), 4);
  assert.equal(commitRowTarget('ArrowUp', { index: 0, count: 5 }), 0);
  assert.equal(commitRowTarget('ArrowDown', { index: 1, count: 5 }), 2);
  assert.equal(commitRowTarget('Home', { index: 3, count: 5 }), 0);
  assert.equal(commitRowTarget('End', { index: 0, count: 5 }), 4);
  assert.equal(commitRowTarget('Enter', { index: 0, count: 5 }), null);
  assert.equal(commitRowTarget('ArrowDown', { index: -1, count: 0 }), null);
});

test('Ur: a click ≥4px from its mousedown over selected row text is a drag-select; keyboard clicks (detail 0) always count', () => {
  const start = { x: 10, y: 10 };
  assert.equal(isDragSelectClick({ detail: 1, start, end: { x: 14, y: 10 }, hasSelection: true }), true);
  assert.equal(isDragSelectClick({ detail: 1, start, end: { x: 12, y: 11 }, hasSelection: true }), false);
  assert.equal(isDragSelectClick({ detail: 1, start, end: { x: 40, y: 10 }, hasSelection: false }), false);
  assert.equal(isDragSelectClick({ detail: 0, start, end: { x: 40, y: 10 }, hasSelection: true }), false);
  assert.equal(isDragSelectClick({ detail: 1, start: null, end: { x: 40, y: 10 }, hasSelection: true }), false);
});

test('Wr meta and labels', () => {
  assert.deepEqual(commitMeta({ sha: 'a'.repeat(40), shortSha: 'aaaaaaa', authorName: 'Ada', date: 1700000000 }), { shortSha: 'aaaaaaa', author: 'Ada', dateMs: 1700000000000 });
  assert.deepEqual(commitMeta({ sha: 'abcdef0123', date: 0 }), { shortSha: 'abcdef0', author: '', dateMs: null });
  assert.equal(COMMIT_ROW_ACTIVE, 'bg-fill-control hover:bg-fill-control text-primary');
  assert.equal(COMMIT_ROW_IDLE, 'bg-alpha-0 text-primary hover:bg-fill-ghost-hover data-[pressed]:bg-fill-ghost-hover');
  assert.deepEqual({ ...DIFF_COMMITS_LABELS }, {
    commits: 'Commits', allChanges: 'All changes', uncommitted: 'Uncommitted changes', noMessage: '(no message)',
    copySha: 'Copy commit SHA', copied: 'Commit SHA copied to clipboard.', copyFailed: 'Couldn’t copy to the clipboard.',
  });
});
