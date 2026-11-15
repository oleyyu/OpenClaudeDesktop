// display bug D-06 / D-07 (shared with 0.3, state.js layer only; ported from 0.3's
// transcript-display-fixes-1114.test.mjs without its renderer parts, since this generation's Code transcript differs).
// D-06: Codex's thread/read leaves out a declined call, a cut reply and a failed turn's fragments; a hydrate (switching
// back to the session, ensureResumed) appended those live-only rows after the last turn instead of keeping them in theirs.
// D-07: after a stream drop Codex retries under a new agentMessage id and never completes the abandoned one; its half
// reply stayed in the transcript next to the full one (and six fragments above the error card when every attempt failed).
import test from 'node:test';
import assert from 'node:assert/strict';
import { emptyState, reduce } from '../src/state.js';

const user = (id, turnId) => ({ type: 'userMessage', id, turnId, content: [{ type: 'text', text: id }] });
const agent = (id, turnId, text = id) => ({ type: 'agentMessage', id, turnId, text });

test('D-06: a hydrate puts each live-only item back into its own turn (verify-1 shape: DENYME / CUTME / DROPME / last)', () => {
  const live = [user('u1', 't1'), { type: 'commandExecution', id: 'call_deny', turnId: 't1', command: 'touch x', status: 'declined' },
    user('u2', 't2'), agent('msg_cut3', 't2', 'cut0 cut1'), user('u3', 't3'), agent('msg_drop4', 't3'), agent('msg_drop5', 't3'),
    user('u4', 't4'), agent('msg_10', 't4', 'reply-last-10')];
  // thread/read: Codex keeps the prompts and the last turn's reply only.
  const turns = [{ id: 't1', status: 'completed', items: [user('u1')] }, { id: 't2', status: 'interrupted', items: [user('u2')] },
    { id: 't3', status: 'failed', error: { message: 'stream dropped' }, items: [user('u3')] }, { id: 't4', status: 'completed', items: [user('u4'), agent('msg_10', undefined, 'reply-last-10')] }];
  const state = { ...emptyState, items: { th: live }, active: { th: null } };
  const next = reduce(state, { type: 'hydrate', id: 'th', thread: { id: 'th', turns }, baselineItems: live, baselineActive: null });
  assert.deepEqual(next.items.th.map((item) => `${item.id}@${item.turnId}`),
    ['u1@t1', 'call_deny@t1', 'u2@t2', 'msg_cut3@t2', 'u3@t3', 'msg_drop4@t3', 'msg_drop5@t3', 'u4@t4', 'msg_10@t4']);
  // A live-only item of a turn the page does not hold (newer than the snapshot) still goes last, as before.
  const newer = [...live, user('u5', 't5'), agent('m5', 't5')];
  const after = reduce({ ...state, items: { th: newer } }, { type: 'hydrate', id: 'th', thread: { id: 'th', turns }, baselineItems: newer, baselineActive: null });
  assert.deepEqual(after.items.th.slice(-2).map((item) => item.id), ['u5', 'm5']);
  // Within a turn that is in the page, an item is placed after its own live predecessor (not after the turn's last row).
  const mid = [user('u1', 't1'), agent('lost', 't1'), agent('kept', 't1')];
  const midTurns = [{ id: 't1', status: 'completed', items: [user('u1'), agent('kept')] }];
  const placed = reduce({ ...state, items: { th: mid } }, { type: 'hydrate', id: 'th', thread: { id: 'th', turns: midTurns }, baselineItems: mid, baselineActive: null });
  assert.deepEqual(placed.items.th.map((item) => item.id), ['u1', 'lost', 'kept']);
  // A turn the snapshot names but holds nothing of: its live rows go where the snapshot puts that turn.
  const empty = [user('u1', 't1'), agent('a1', 't1'), user('u2', 't2'), agent('a2', 't2')];
  const emptyTurns = [{ id: 't1', status: 'failed', items: [] }, { id: 't2', status: 'completed', items: [user('u2'), agent('a2')] }];
  const kept = reduce({ ...state, items: { th: empty } }, { type: 'hydrate', id: 'th', thread: { id: 'th', turns: emptyTurns }, baselineItems: empty, baselineActive: null });
  assert.deepEqual(kept.items.th.map((item) => item.id), ['u1', 'a1', 'u2', 'a2']);
});

const TH = 'th7';
const ev = (method, params) => ({ event: { method, params: { threadId: TH, ...params } } });
const started = (turnId, item) => ev('item/started', { turnId, item });
const completed = (turnId, item) => ev('item/completed', { turnId, item });
const delta = (turnId, itemId, text) => ev('item/agentMessage/delta', { turnId, itemId, delta: text });
const retry = (turnId, extra = {}) => ev('error', { turnId, willRetry: true, error: { message: 'Reconnecting... 1/5', codexErrorInfo: { responseStreamDisconnected: { httpStatusCode: null } } }, ...extra });
const run = (events) => events.reduce((state, action) => reduce(state, action), emptyState);
const shown = (state) => (state.items[TH] || []).map((item) => item.type === 'agentMessage' ? `${item.id}:${item.text}` : item.id);
const begin = (turnId) => [ev('turn/started', { turn: { id: turnId, items: [], status: 'inProgress' } }), started(turnId, user(`u-${turnId}`)), completed(turnId, user(`u-${turnId}`))];

test('D-07: Codex ONEDROP — the cut attempt goes once the retry streams a new message; turn/completed.items confirms it', () => {
  const head = [...begin('t1'), started('t1', agent('msg_cut_1', undefined, '')), delta('t1', 'msg_cut_1', 'Reconnect wor'), retry('t1')];
  // While Codex reconnects, the partial reply stays (nothing to show instead yet).
  assert.deepEqual(shown(run(head)), ['u-t1', 'msg_cut_1:Reconnect wor']);
  const full = 'Reconnect worked and this is the one complete reply.';
  const streaming = run([...head, started('t1', agent('msg_full_2', undefined, '')), delta('t1', 'msg_full_2', 'Reconnect')]);
  assert.deepEqual(shown(streaming), ['u-t1', 'msg_full_2:Reconnect']);
  const done = run([...head, started('t1', agent('msg_full_2', undefined, '')), completed('t1', agent('msg_full_2', undefined, full)),
    ev('turn/completed', { turn: { id: 't1', status: 'completed', error: null, items: [agent('msg_full_2', undefined, full)] } })]);
  assert.deepEqual(shown(done), ['u-t1', `msg_full_2:${full}`]);
  // turn/completed alone drops a message of the turn that never completed and is not in turn.items.
  const late = run([...begin('t1'), started('t1', agent('msg_cut_1', undefined, '')), delta('t1', 'msg_cut_1', 'half'), completed('t1', agent('msg_full_2', undefined, full)),
    ev('turn/completed', { turn: { id: 't1', status: 'completed', error: null, items: [agent('msg_full_2', undefined, full)] } })]);
  assert.deepEqual(shown(late), ['u-t1', `msg_full_2:${full}`]);
});

test('D-07: Codex ALLDROP — only the last attempt is left; an earlier turn is untouched', () => {
  const full = 'complete';
  const events = [...begin('t1'), started('t1', agent('msg_full_2', undefined, '')), completed('t1', agent('msg_full_2', undefined, full)),
    ev('turn/completed', { turn: { id: 't1', status: 'completed', error: null, items: [agent('msg_full_2', undefined, full)] } }), ...begin('t2')];
  for (let n = 3; n <= 8; n++) {
    events.push(started('t2', agent(`msg_frag_${n}`, undefined, '')), delta('t2', `msg_frag_${n}`, `frag-${n} `));
    if (n < 8) events.push(retry('t2'));
  }
  events.push(ev('error', { turnId: 't2', willRetry: false, error: { message: 'stream disconnected before completion', codexErrorInfo: { responseTooManyFailedAttempts: { httpStatusCode: null } } } }),
    ev('turn/completed', { turn: { id: 't2', status: 'failed', error: { message: 'stream disconnected before completion' }, items: [] } }));
  const state = run(events);
  assert.deepEqual(shown(state), ['u-t1', `msg_full_2:${full}`, 'u-t2', 'msg_frag_8:frag-8 ']);
});

test('D-07: other cores are unchanged — empty turn.items deletes nothing; a retried message that goes on, or completes, stays', () => {
  for (const items of [[], undefined]) {
    const state = run([...begin('t1'), started('t1', agent('m1', undefined, '')), delta('t1', 'm1', 'partial'),
      ev('turn/completed', { turn: { id: 't1', status: 'completed', error: null, ...(items ? { items } : {}) } })]);
    assert.deepEqual(shown(state), ['u-t1', 'm1:partial'], JSON.stringify(items));
  }
  // A bridge retry that restarts the same item id (DeepSeek llm/retry): the item is kept.
  const same = run([...begin('t1'), started('t1', agent('m1', undefined, '')), delta('t1', 'm1', 'first try'), retry('t1', { retry: { attempt: 1, maxRetries: 3 } }),
    started('t1', agent('m1', undefined, '')), delta('t1', 'm1', 'second'), started('t1', agent('m2', undefined, '')), delta('t1', 'm2', 'next')]);
  assert.deepEqual(shown(same).map((row) => row.split(':')[0]), ['u-t1', 'm1', 'm2']);
  // A retried message that keeps streaming (deltas to its own id) is not left behind.
  const goesOn = run([...begin('t1'), started('t1', agent('m1', undefined, '')), delta('t1', 'm1', 'a'), retry('t1'), delta('t1', 'm1', 'b'),
    started('t1', agent('m2', undefined, '')), delta('t1', 'm2', 'c')]);
  assert.deepEqual(shown(goesOn), ['u-t1', 'm1:ab', 'm2:c']);
  // A message that completed before the retry is never dropped.
  const kept = run([...begin('t1'), started('t1', agent('m1', undefined, '')), completed('t1', agent('m1', undefined, 'done')), retry('t1'),
    started('t1', agent('m2', undefined, '')), delta('t1', 'm2', 'next')]);
  assert.deepEqual(shown(kept), ['u-t1', 'm1:done', 'm2:next']);
  // A delta-only message (no item/started) after the retry drops the cut one too.
  const deltaOnly = run([...begin('t1'), started('t1', agent('m1', undefined, '')), delta('t1', 'm1', 'cut'), retry('t1'), delta('t1', 'm2', 'whole')]);
  assert.deepEqual(shown(deltaOnly), ['u-t1', 'm2:whole']);
});
