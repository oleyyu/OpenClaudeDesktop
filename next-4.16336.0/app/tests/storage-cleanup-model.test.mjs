// Settings › Storage › Clean up inactive sessions, the dialog's rules and copy (src/storage-cleanup-model.mjs;
// 2.31226.0 c71860c77-C_7Gqn1u X / Jt / nn / Rt / Zt / Qt / $t / en / tn / Xt / Ft).
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  CLEANUP_WINDOWS, DEFAULT_CLEANUP_CHOICES, announcedProgress, cleanupAcknowledgeLabel, cleanupActionCount, cleanupCanConfirm,
  cleanupConfirmLabel, cleanupConfirmVariant, cleanupDeleteLabel, cleanupEmptyText, cleanupErrorText, cleanupHasAnything, cleanupOutcome,
  cleanupProgressLabel, cleanupSummary, cleanupUncommittedLabel,
} from '../src/storage-cleanup-model.mjs';
import { setLocale, t } from '../electron/i18n/index.mjs';

const preview = { token: 'k', count: 2, bytes: 3000, sessionCount: 4, uncommittedCount: 1, uncommittedBytes: 500, examples: [], uncommitted: [] };
const none = DEFAULT_CLEANUP_CHOICES, discard = { includeUncommitted: true, deleteSessions: false };
const remove = { includeUncommitted: false, deleteSessions: true }, both = { includeUncommitted: true, deleteSessions: true };

test('windows and the action count (X)', () => {
  assert.deepEqual(CLEANUP_WINDOWS, [30, 60, 90]);
  assert.deepEqual([none, discard, remove, both].map((choices) => cleanupActionCount(preview, choices)), [2, 3, 3, 4]);
  assert.equal(cleanupActionCount(null, none), 0);
  assert.equal(cleanupHasAnything(preview), true);
  assert.equal(cleanupHasAnything({ ...preview, sessionCount: 0 }), false);
});

test('confirm label, variant, acknowledgement and enablement', () => {
  assert.equal(cleanupConfirmLabel(preview, none), 'Remove 2 worktrees');
  assert.equal(cleanupConfirmLabel({ ...preview, count: 1 }, none), 'Remove 1 worktree');
  assert.equal(cleanupConfirmLabel(preview, both), 'Delete 4 sessions');
  assert.equal(cleanupConfirmLabel({ ...preview, count: 0, uncommittedCount: 0 }, none), 'Remove');
  assert.equal(cleanupConfirmLabel(null, remove), 'Delete');
  assert.deepEqual([none, discard, remove].map(cleanupConfirmVariant), ['primary', 'danger', 'danger']);
  assert.equal(cleanupAcknowledgeLabel(none), null);
  assert.equal(cleanupAcknowledgeLabel(discard), 'I understand the uncommitted changes can’t be recovered');
  assert.equal(cleanupAcknowledgeLabel(remove), 'I understand deleted conversations can’t be recovered');
  assert.equal(cleanupAcknowledgeLabel(both), 'I understand the deleted conversations and the uncommitted changes can’t be recovered');
  assert.equal(cleanupCanConfirm(preview, none, false), true, 'nothing lost: no acknowledgement needed');
  assert.equal(cleanupCanConfirm(preview, remove, false), false);
  assert.equal(cleanupCanConfirm(preview, remove, true), true);
  assert.equal(cleanupCanConfirm({ ...preview, count: 0 }, none, true), false);
});

test('summary, empty line and checkbox labels', () => {
  assert.deepEqual(cleanupSummary(preview, none, '2.9 KB'), { headline: '2 worktrees from inactive sessions · 2.9 KB', note: 'Sessions and their conversations stay. Committed work stays on its branch.' });
  assert.deepEqual(cleanupSummary(preview, remove, 'x').note, 'Committed work stays on its branch.');
  assert.deepEqual(cleanupSummary({ ...preview, count: 0 }, none, 'x'), { headline: '4 inactive sessions · only worktrees with uncommitted changes are left', note: null });
  assert.equal(cleanupSummary({ ...preview, count: 0, uncommittedCount: 0, sessionCount: 1 }, none, 'x').headline, 'The inactive session no longer has a worktree');
  assert.equal(cleanupSummary({ ...preview, count: 0, uncommittedCount: 0, sessionCount: 3 }, none, 'x').headline, 'None of the 3 inactive sessions still has a worktree');
  assert.equal(cleanupEmptyText(60), 'No Code session has been inactive for 60 days.');
  assert.equal(cleanupUncommittedLabel(preview, '500 B'), 'Also remove 1 worktree with uncommitted changes (500 B); those changes are lost');
  assert.equal(cleanupDeleteLabel(preview, none), 'Also delete the 3 inactive sessions and their conversations');
  assert.equal(cleanupDeleteLabel(preview, discard), 'Also delete the 4 inactive sessions and their conversations');
  assert.equal(cleanupDeleteLabel({ ...preview, sessionCount: 2 }, none), 'Also delete the inactive session and its conversation');
});

test('progress lines and the announced tenths (Rt)', () => {
  assert.equal(cleanupProgressLabel({ done: 3, total: 10 }, 'remove'), 'Removing 3 of 10…');
  assert.equal(cleanupProgressLabel({ done: 3, total: 10 }, 'delete'), 'Deleting 3 of 10…');
  assert.equal(announcedProgress({ done: 37, total: 100 }), 30);
  assert.equal(announcedProgress({ done: 2, total: 3 }), 1);
  assert.equal(announcedProgress({ done: 0, total: 0 }), 0);
});

test('outcomes: finished, left as is, stopped, failed, errors and an expired plan', () => {
  const base = { removedCount: 0, deletedCount: 0, skippedCount: 0, failedCount: 0, cancelled: false };
  assert.deepEqual(cleanupOutcome({ ...base, removedCount: 2 }, none), { success: 'Removed 2 worktrees.' });
  assert.deepEqual(cleanupOutcome({ ...base, removedCount: 1, skippedCount: 1 }, none), { success: 'Removed 1 worktree. 1 was left as it is (in use, pinned, or changed since).' });
  assert.deepEqual(cleanupOutcome({ ...base, removedCount: 1, deletedCount: 3 }, remove), { success: 'Deleted 3 sessions.' });
  assert.deepEqual(cleanupOutcome({ ...base, removedCount: 2, cancelled: true }, remove), { success: 'Stopped after removing 2 worktrees; no session was deleted.' });
  assert.deepEqual(cleanupOutcome({ ...base, removedCount: 1, deletedCount: 1, cancelled: true }, remove), { success: 'Stopped after deleting 1 session. Removed 1 worktree.' });
  assert.deepEqual(cleanupOutcome({ ...base, cancelled: true }, none), { success: 'Stopped before removing anything.' });
  assert.deepEqual(cleanupOutcome({ ...base, failedCount: 2 }, none), { error: '2 worktrees couldn’t be removed.' });
  assert.deepEqual(cleanupOutcome({ ...base, deletedCount: 1, removedCount: 1, failedCount: 1 }, remove), { success: 'Deleted 1 session.', error: '1 session couldn’t be deleted. Removed 1 worktree.' });
  assert.deepEqual(cleanupOutcome({ ...base, errorCode: 'expired' }, none), { retry: true });
  assert.deepEqual(cleanupOutcome({ ...base, errorCode: 'already-running' }, none), { error: 'A cleanup is still finishing. Try again in a moment.', keepOpen: true });
  assert.equal(cleanupErrorText('not-loaded'), 'Your Code sessions are still being gathered. Try again shortly.');
  assert.equal(cleanupErrorText('other'), 'Cleanup isn’t available right now.');
});

test('every string the dialog shows has a zh-CN entry', (context) => {
  context.after(() => setLocale('en-US'));
  setLocale('zh-CN');
  const strings = [
    cleanupConfirmLabel(preview, none), cleanupConfirmLabel(preview, both), cleanupConfirmLabel(null, none), cleanupConfirmLabel(null, remove),
    cleanupAcknowledgeLabel(discard), cleanupAcknowledgeLabel(remove), cleanupAcknowledgeLabel(both),
    ...Object.values(cleanupSummary(preview, none, 'x')), cleanupSummary(preview, remove, 'x').note,
    cleanupSummary({ ...preview, count: 0 }, none, 'x').headline, cleanupSummary({ ...preview, count: 0, uncommittedCount: 0 }, none, 'x').headline,
    cleanupEmptyText(30), cleanupUncommittedLabel(preview, 'x'), cleanupDeleteLabel(preview, none),
    cleanupProgressLabel({ done: 1, total: 2 }, 'remove'), cleanupProgressLabel({ done: 1, total: 2 }, 'delete'),
    cleanupErrorText('not-loaded'), cleanupErrorText('already-running'), cleanupErrorText('x'),
    cleanupOutcome({ removedCount: 2, deletedCount: 0, skippedCount: 1, failedCount: 1, cancelled: false }, none).success,
    cleanupOutcome({ removedCount: 0, deletedCount: 0, skippedCount: 0, failedCount: 2, cancelled: false }, remove).error,
    cleanupOutcome({ removedCount: 2, deletedCount: 0, skippedCount: 0, failedCount: 0, cancelled: true }, remove).success,
    cleanupOutcome({ removedCount: 0, deletedCount: 2, skippedCount: 0, failedCount: 0, cancelled: true }, remove).success,
    ...['Clean up inactive sessions', 'Clean up inactive sessions…', 'Checking inactive sessions…', 'Inactive for at least', '{days} days', 'at least {size}',
      'and {count} more', 'Untitled', 'Stop', 'Cancel', 'Removing…', 'Deleting…', 'Couldn’t work out what to clean up. Try again.',
      'Cleanup didn’t finish. Try again.', 'Clear cache and restart…', 'Clear cached web content and restart OpenClaude Desktop?',
      'You stay signed in. Open conversations and tasks are kept; the app closes and reopens.', 'Clear and restart', 'Error clearing cache'].map((text) => t(text)),
  ];
  const english = strings.filter((text) => /^[\x00-\x7f…’·]+$/.test(text.replace(/\d+|x/g, '')));
  assert.deepEqual(english, []);
});
