import test from 'node:test';
import assert from 'node:assert/strict';
import { setLocale, DEFAULT_LOCALE } from '../electron/i18n/index.mjs';
import {
  WORKTREE_CHANGES_SHOWN, WORKTREE_DIRTY_GUARD_MS, WORKTREE_PROBE_DEADLINE_MS,
  createWorktreeDisposeCheck, worktreeChangeList, worktreeConfirmCopy, worktreeConfirmReady, worktreeProbe,
} from '../src/worktree-dispose-model.mjs';

// B37: shared-19 RG/zG, TK, DK/bK, IK, fK (readable shared-19-DmuztgN-.js:18651-18676, 19084-19203, 19373-19418).

test('worktreeProbe: none for no/shared worktree, unknown for a failed check, dirty with the porcelain lines and the full count', () => {
  assert.deepEqual(worktreeProbe({ worktree: null, changes: 0, shared: false }), { status: 'none', changes: [], count: 0, worktree: null });
  assert.equal(worktreeProbe({ worktree: '/w', shared: true, changes: 3 }).status, 'none', 'another session still works there');
  assert.deepEqual(worktreeProbe(null), { status: 'unknown', changes: [], count: 0, worktree: null });
  const failed = { worktree: '/w', shared: false, exists: true, changes: 0, files: [], unknown: true };
  assert.deepEqual(worktreeProbe(failed), { status: 'unknown', changes: [], count: 0, worktree: failed });
  const clean = { worktree: '/w', shared: false, exists: true, changes: 0, files: [] };
  assert.deepEqual(worktreeProbe(clean), { status: 'clean', changes: [], count: 0, worktree: clean });
  const dirty = { worktree: '/w', shared: false, exists: true, changes: 12000, files: [' M a.js', '?? b.txt', ''] };
  assert.deepEqual(worktreeProbe(dirty), { status: 'dirty', changes: [' M a.js', '?? b.txt'], count: 12000, worktree: dirty });
});

test('DK: the first ten lines, then how many more', () => {
  const lines = Array.from({ length: 13 }, (_, index) => `?? f${index}`);
  assert.equal(WORKTREE_CHANGES_SHOWN, 10);
  assert.deepEqual(worktreeChangeList(lines), { shown: lines.slice(0, 10), more: 3 });
  assert.deepEqual(worktreeChangeList(lines.slice(0, 10)), { shown: lines.slice(0, 10), more: 0 });
  assert.deepEqual(worktreeChangeList(undefined), { shown: [], more: 0 });
});

test('TK copy: dirty archive/delete titles and labels, the couldn’t-check copy, and the checking line', (context) => {
  context.after(() => setLocale(DEFAULT_LOCALE));
  assert.deepEqual(worktreeConfirmCopy('archive', 'dirty', 1), {
    title: 'Archive session with uncommitted changes?', confirmLabel: 'Archive anyway',
    description: 'This session’s worktree has 1 uncommitted change that will be permanently discarded.',
  });
  assert.deepEqual(worktreeConfirmCopy('delete', 'dirty', 4), {
    title: 'Delete session with uncommitted changes?', confirmLabel: 'Delete anyway',
    description: 'This session’s worktree has 4 uncommitted changes that will be permanently discarded.',
  });
  assert.deepEqual(worktreeConfirmCopy('delete', 'unknown'), {
    title: 'Delete session?', confirmLabel: 'Delete anyway',
    description: 'Couldn’t check this session’s worktree for uncommitted changes. Anything uncommitted in it will be permanently discarded.',
  });
  assert.deepEqual(worktreeConfirmCopy('delete', 'confirm'), { title: null, confirmLabel: null, description: null });
  assert.equal(worktreeConfirmCopy('delete', 'checking').description, 'Checking for uncommitted changes…');
  setLocale('zh-CN');
  assert.equal(worktreeConfirmCopy('delete', 'dirty', 2).confirmLabel, '仍然删除');
  assert.match(worktreeConfirmCopy('archive', 'dirty', 2).description, /2 处未提交的更改/);
});

function harness(probe) {
  let now = 0, id = 0;
  const timers = new Map(), states = [], decisions = [];
  const check = createWorktreeDisposeCheck({
    probe, now: () => now,
    schedule: (fn, delay) => { timers.set(++id, { at: now + delay, fn }); return id; },
    clear: (key) => timers.delete(key),
    onChange: (state) => states.push(state.phase),
    decide: (result) => decisions.push(result),
  });
  return { check, states, decisions, timers, advance(ms) { now += ms; for (const [key, timer] of [...timers]) if (timer.at <= now) { timers.delete(key); timer.fn(); } } };
}
const flush = () => new Promise((resolve) => setImmediate(resolve));

test('IK: the first press checks; a clean or worktree-less answer decides at once and presses while checking are ignored', async () => {
  for (const answer of [{ worktree: '/w', shared: false, changes: 0, files: [] }, { worktree: null, changes: 0, shared: false }]) {
    let calls = 0;
    const h = harness(() => { calls++; return Promise.resolve(answer); });
    h.check.press();
    assert.equal(h.check.state.phase, 'checking');
    h.check.press();
    assert.equal(calls, 1, 'a second press while checking does not probe again');
    await flush();
    assert.equal(h.decisions.length, 1);
    assert.equal(h.decisions[0].confirmedDirty, false);
    assert.equal(h.timers.size, 0, 'the deadline is cleared');
  }
});

test('IK: a dirty answer shows the files; the confirming press counts only after 500 ms', async () => {
  const status = { worktree: '/w', shared: false, changes: 2, files: [' M a', '?? b'] };
  const h = harness(() => Promise.resolve(status));
  h.check.press();
  await flush();
  assert.deepEqual(h.states, ['checking', 'dirty']);
  assert.deepEqual(h.check.state.changes, [' M a', '?? b']);
  assert.equal(h.check.state.count, 2);
  h.advance(WORKTREE_DIRTY_GUARD_MS - 1);
  h.check.press();
  assert.equal(h.decisions.length, 0, 'a double press never confirms what it did not show');
  h.advance(1);
  h.check.press();
  assert.equal(h.decisions.length, 1);
  assert.equal(h.decisions[0].confirmedDirty, true);
  assert.equal(h.decisions[0].probe.worktree, status);
  h.check.press();
  assert.equal(h.decisions.length, 1, 'decides once');
});

test('IK: a failed check and the 5 s deadline show the couldn’t-check copy; a late answer still applies', async () => {
  const failed = harness(() => Promise.reject(new Error('ipc')));
  failed.check.press();
  await flush();
  assert.equal(failed.check.state.phase, 'unknown');
  assert.equal(failed.check.state.probe.worktree, null);

  let resolve;
  const slow = harness(() => new Promise((done) => { resolve = done; }));
  slow.check.press();
  slow.advance(WORKTREE_PROBE_DEADLINE_MS - 1);
  assert.equal(slow.check.state.phase, 'checking');
  slow.advance(1);
  assert.equal(slow.check.state.phase, 'unknown');
  resolve({ worktree: '/w', shared: false, changes: 0, files: [] });
  await flush();
  assert.equal(slow.decisions.length, 1, 'vK: a clean answer after the deadline still decides');
  assert.equal(slow.decisions[0].confirmedDirty, false);

  const cancelled = harness(() => new Promise(() => {}));
  cancelled.check.press();
  cancelled.check.cancel();
  assert.equal(cancelled.timers.size, 0);
  cancelled.check.press();
  assert.equal(cancelled.decisions.length, 0);
});

// FT-11 (diffgit-10): 2.42304.0 shared-19 EY S `Date.now() - Math.max(d.current ?? 0, n.openedAt ?? 0) < 500 || y(!0)`.
test('worktreeConfirmReady: 500 ms from the later of the queue advancing and the confirm opening after another dialog', () => {
  assert.equal(WORKTREE_DIRTY_GUARD_MS, 500);
  assert.equal(worktreeConfirmReady({ now: 1000 }), true, 'neither known: the press counts');
  assert.equal(worktreeConfirmReady({ now: 1000, guardSince: 700 }), false);
  assert.equal(worktreeConfirmReady({ now: 1200, guardSince: 700 }), true);
  assert.equal(worktreeConfirmReady({ now: 1200, guardSince: 700, openedAt: 900 }), false, 'opened after a dialog more recently');
  assert.equal(worktreeConfirmReady({ now: 1400, guardSince: 700, openedAt: 900 }), true);
  assert.equal(worktreeConfirmReady({ now: 1400, guardSince: 1000, openedAt: 100 }), false, 'the later of the two');
  assert.equal(worktreeConfirmReady({ now: 1400, guardSince: null, openedAt: undefined }), true);
});
