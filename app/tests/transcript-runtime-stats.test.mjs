import test from 'node:test';
import assert from 'node:assert/strict';
import * as stats from '../src/transcript-runtime-stats.mjs';
import { beginTurnStats, createThinkingReader, elapsedTurnSeconds, subscribeThinkingClock, subscribeTurnClock, thinkingChangeAt, thinkingLabel, thinkingState, turnActivity, updateTurnUsage } from '../src/transcript-runtime-stats.mjs';
// W14-code r4 closeout R4DC-N7: the test-only turnActivityLabel export is gone; it was turnActivity's label.
const turnActivityLabel = (turnId, items = [], phases = {}, seconds, thinking) => turnActivity(turnId, items, phases, seconds, thinking)?.label ?? null;
import { emptyState, reduce } from '../src/state.js';
import { usageTriggerCopy } from '../src/context-usage-model.mjs';

const usage = (turnId, total, last) => ({ turnId, tokenUsage: { total: { outputTokens: total }, last: { outputTokens: last } } });
const event = (method, params) => ({ event: { method, params: { threadId: 'thread', ...params } } });
test('output tokens require an observed baseline or proof of zero prior usage; repeats never accumulate', () => {
  let stats = beginTurnStats(null, { id: 'a', startedAt: 100 });
  stats = updateTurnUsage(stats, usage('a', 300, 100), 'a');
  assert.equal(stats.outputTokens, null, 'cannot mistake last request or session total for turn total');
  const prior = updateTurnUsage(null, usage('old', 1000, 50), null);
  stats = beginTurnStats(prior, { id: 'a', startedAt: 100 });
  stats = updateTurnUsage(stats, usage('a', 1287, 287), 'a');
  assert.equal(stats.outputTokens, 287);
  stats = updateTurnUsage(stats, usage('a', 1287, 287), 'a');
  assert.equal(stats.outputTokens, 287);
  assert.equal(updateTurnUsage(stats, usage('old', 900, 50), 'a'), stats);
  stats = updateTurnUsage(stats, usage('a', 1317, 30), 'a');
  assert.equal(stats.outputTokens, 317);
  const next = beginTurnStats(stats, { id: 'b', startedAt: 200 });
  assert.equal(next.outputTokens, null); assert.equal(next.baseline, 1317);
  assert.equal(updateTurnUsage(next, usage('b', 1347, 30), 'b').outputTokens, 30);
  const fresh = updateTurnUsage(beginTurnStats(null, { id: 'fresh' }), usage('fresh', 287, 287), 'fresh');
  assert.equal(fresh.outputTokens, 287); assert.equal(fresh.startedAt, null);
  const beforeStart = updateTurnUsage(null, usage('early', 287, 287), null);
  assert.equal(beginTurnStats(beforeStart, {id:'early',startedAt:300}).outputTokens, 287, 'already received usage keeps its exact turn owner');
});
test('invalid or regressed usage cannot display a fabricated zero or later regain an unjustified baseline', () => {
  const fresh = beginTurnStats(null, { id: 'a', startedAt: 100 });
  for (const [total,last] of [[undefined,0],[-1,0],[5,6],[1.5,1],[NaN,0]]) {
    const invalid = updateTurnUsage(fresh, usage('a', total, last), 'a');
    assert.equal(invalid.outputTokens, null);
    assert.equal(updateTurnUsage(invalid, usage('a', 20, 20), 'a').outputTokens, null);
  }
  let stats = updateTurnUsage(fresh, usage('a', 50, 50), 'a');
  stats = updateTurnUsage(stats, usage('a', 30, 30), 'a');
  assert.equal(stats.outputTokens, null);
  assert.equal(updateTurnUsage(stats, usage('a', 60, 30), 'a').outputTokens, null);
  assert.equal(updateTurnUsage(stats, { tokenUsage: {} }, 'a'), stats);
});
test('real reducer hydrate respects active version and never adopts a previous turn baseline on resume', () => {
  let state = reduce(emptyState, event('thread/tokenUsage/updated', usage('old', 100, 100)));
  state = reduce(state, { type: 'hydrate', id: 'thread', thread: { id: 'thread', turns: [{ id: 'a', status: 'inProgress', startedAt: 50, items: [] }] } });
  assert.equal(state.turnStats.thread.startedAt, 50); assert.equal(state.turnStats.thread.baseline, null);
  const baselineActiveVersion = state.activeVersions.thread || 0;
  state = reduce(state, event('turn/started', { turn: { id: 'b', startedAt: 100 } }));
  state = reduce(state, { type: 'hydrate', id: 'thread', baselineActiveVersion, baselineItems: [], thread: { id: 'thread', turns: [{ id: 'a', status: 'inProgress', startedAt: 50, items: [] }] } });
  assert.equal(state.turnStats.thread.turnId, 'b'); assert.equal(state.turnStats.thread.startedAt, 100);
  state = reduce(state, event('thread/tokenUsage/updated', usage('b', 200, 100)));
  assert.equal(state.turnStats.thread.outputTokens, 100);
  state = reduce(state, { event: { kind: 'connection', connected: false } });
  assert.deepEqual(state.turnStats, {});
});
test('source clock and labels use reported start, two-second threshold, duration format and compact token boundaries', () => {
  assert.equal(elapsedTurnSeconds(null, 5000), null); assert.equal(elapsedTurnSeconds(3, 2500), 0);
  assert.equal(elapsedTurnSeconds(3, 5299), 2);
  // W14-code r8 gen-final-8: runtimeStatLabels / formatOutputTokens (the host side-chat .sts-stat) are gone; the side
  // chat draws the generated WorkingLine (cccc2cf0a _F → c96d752d0 U6) with its own clock and token labels.
  assert.equal(stats.runtimeStatLabels, undefined); assert.equal(stats.formatOutputTokens, undefined);
  const timers = new Map(); let now = 1300, next = 0, calls = 0;
  const host = { Date: { now: () => now }, setTimeout(fn, delay) { timers.set(++next,{fn,delay}); return next; }, clearTimeout(id) { timers.delete(id); } };
  const dispose = subscribeTurnClock(0, () => calls++, host);
  assert.equal(timers.get(1).delay, 700); const first = timers.get(1).fn;
  timers.delete(1); now=2000; first(); assert.equal(calls, 1); assert.equal(timers.get(2).delay, 1000);
  const stale = timers.get(2).fn; dispose(); stale(); assert.equal(timers.size, 0); assert.equal(calls, 1);
  subscribeTurnClock(null, () => calls++, host)(); assert.equal(timers.size, 0);
});
test('activity labels require current-turn live evidence and use the source thinking thresholds', () => {
  const command = { id:'c', turnId:'a', type:'commandExecution', status:'inProgress' };
  const reasoning = { id:'r', turnId:'a', type:'reasoning' };
  assert.equal(turnActivityLabel('b',[command],{},43), null);
  assert.equal(turnActivityLabel('a',[command],{},43), 'Running tools…');
  assert.equal(turnActivityLabel('a',[command],{c:'completed'},43), null);
  assert.equal(turnActivityLabel('a',[reasoning],{},43), null);
  for (const [seconds,label] of [[0,'Thinking…'],[15,'Still thinking…'],[30,'Thinking more…'],[45,'Thinking some more…'],[60,'Almost done thinking…']]) assert.equal(turnActivityLabel('a',[reasoning],{r:'streaming'},seconds),label);
  assert.equal(turnActivityLabel('a',[command,reasoning],{r:'streaming'},43), 'Running tools…');
});
test('thinking ends when the answer streams after the thought, whether or not the thought was closed', () => {
  const started = (item) => event('item/started', { turnId: 'a', item });
  const reasoning = { type: 'reasoning', id: 'msg-1.1.0', summary: [], content: [], reasoningText: '' };
  const answer = { type: 'agentMessage', id: 'msg-1.1.1', text: '', phase: null, memoryCitation: null, delivery: null, questions: null };
  let state = reduce(emptyState, event('turn/started', { turn: { id: 'a', startedAt: 100 } }));
  state = reduce(state, started(reasoning));
  state = reduce(state, event('item/reasoning/summaryTextDelta', { turnId: 'a', itemId: reasoning.id, delta: 'thi', summaryIndex: 0 }));
  const label = (s) => turnActivityLabel('a', s.items.thread, s.itemPhases.thread, 20);
  assert.equal(label(state), 'Still thinking…', 'only the thought streams');
  // The DeepSeek bridge closes the thought at its block-end, then the answer starts.
  const closed = reduce(state, event('item/completed', { turnId: 'a', item: { type: 'reasoning', id: reasoning.id, summary: ['think'], content: [] }, completedAtMs: 5 }));
  let answering = reduce(closed, started(answer));
  answering = reduce(answering, event('item/agentMessage/delta', { turnId: 'a', itemId: answer.id, delta: 'hel' }));
  assert.equal(label(answering), null);
  assert.equal(answering.items.thread[0].reasoningText, 'thi', 'the thought keeps its streamed text');
  // Without a close, a later streaming answer still ends the thinking label.
  assert.equal(label(reduce(state, started(answer))), null);
  // A thought after the answer thinks again.
  assert.equal(label(reduce(reduce(answering, started({ ...reasoning, id: 'msg-1.2.0' })), event('item/reasoning/summaryTextDelta', { turnId: 'a', itemId: 'msg-1.2.0', delta: 'x', summaryIndex: 0 }))), 'Still thinking…');
});
test('usage replayed on resume becomes the next turn baseline and fills the context ring', () => {
  const resumed = { turnId: 'old', tokenUsage: { total: { outputTokens: 500, totalTokens: 9000 }, last: { outputTokens: 40, totalTokens: 12300 }, modelContextWindow: 1000000 } };
  let state = reduce(emptyState, event('thread/tokenUsage/updated', resumed));
  assert.equal(usageTriggerCopy(state.usage.thread).tooltip, 'Context 12.3k / 1M (1%)');
  state = reduce(state, event('turn/started', { turn: { id: 'new', startedAt: 200 } }));
  state = reduce(state, event('thread/tokenUsage/updated', { turnId: 'new', tokenUsage: { total: { outputTokens: 560 }, last: { outputTokens: 60 } } }));
  assert.equal(state.turnStats.thread.outputTokens, 60);
});

// approval-shared-current.js:1966-1981 Du and Y5 :58280-58286.
test('thinking state: active while streaming or for at least 2s, then "Thought for Ns" for 2s', () => {
  const thought = (startedAtMs, completedAtMs, extra = {}) => ({ id: 'r', turnId: 'a', type: 'reasoning', summary: ['x'], startedAtMs, completedAtMs, ...extra });
  const long = [thought(0, 4400)];
  assert.deepEqual(thinkingState('a', long, {}, 4399), { kind: 'active' }, 'still active before the end is observed past');
  assert.deepEqual(thinkingState('a', long, {}, 5000), { kind: 'done', seconds: 4 });
  assert.deepEqual(thinkingState('a', long, {}, 6399), { kind: 'done', seconds: 4 });
  assert.equal(thinkingState('a', long, {}, 6400), null);
  assert.equal(thinkingState('a', long, {}, 6500), null);
  // A 500 ms thought stays active until 2000 ms, then reads as 1s (max(1, round)).
  const short = [thought(0, 500)];
  assert.deepEqual(thinkingState('a', short, {}, 1999), { kind: 'active' });
  assert.deepEqual(thinkingState('a', short, {}, 2000), { kind: 'done', seconds: 1 });
  assert.equal(thinkingState('a', short, {}, 4000), null);
  assert.equal(thinkingChangeAt('a', short, {}, 100), 2000);
  assert.equal(thinkingChangeAt('a', short, {}, 2000), 4000);
  assert.equal(thinkingChangeAt('a', short, {}, 4000), null);
  // Streaming (the newest live item is the thought) is active whatever the clock says.
  const streaming = [thought(0, undefined)];
  assert.deepEqual(thinkingState('a', streaming, { r: 'streaming' }, 99999), { kind: 'active' });
  assert.deepEqual(thinkingState('a', streaming, { r: 'streaming' }), { kind: 'active' }, 'no clock still reports streaming');
  assert.equal(thinkingChangeAt('a', streaming, { r: 'streaming' }, 0), null);
  // No clock (SSR), another turn, or missing lifecycle times: no done state.
  assert.equal(thinkingState('a', long, {}), null);
  assert.equal(thinkingState('b', long, {}, 5000), null);
  assert.equal(thinkingState('a', [thought(undefined, 4400)], {}, 5000), null);
  assert.equal(thinkingState('a', [thought(0, undefined)], {}, 5000), null);
  // The latest finished thought counts.
  const two = [thought(0, 3000), { ...thought(10000, 16600), id: 'r2' }];
  assert.deepEqual(thinkingState('a', two, {}, 17000), { kind: 'done', seconds: 7 });
  // Labels: the zhe ladder while active (turn seconds), "Thought for Ns" when done.
  assert.equal(thinkingLabel({ kind: 'active' }, 16), 'Still thinking…');
  assert.equal(thinkingLabel({ kind: 'done', seconds: 4 }, 16), 'Thought for 4s');
  assert.equal(thinkingLabel(null, 16), null);
  // Local compaction and tool labels keep precedence over a done thought.
  const tool = { id: 'c', turnId: 'a', type: 'commandExecution', status: 'inProgress' };
  assert.equal(turnActivityLabel('a', [...long, tool], {}, 5, { kind: 'done', seconds: 4 }), 'Running tools…');
  assert.deepEqual(turnActivity('a', long, {}, 5, { kind: 'done', seconds: 4 }), { kind: 'thinking', label: 'Thought for 4s', thinking: { kind: 'done', seconds: 4 } });
  assert.equal(turnActivityLabel('a', long, {}, 5, null), null);
});
test('thinking clock fires at each boundary and the reader keeps one object per state', () => {
  const items = [{ id: 'r', turnId: 'a', type: 'reasoning', startedAtMs: 0, completedAtMs: 500 }];
  const timers = new Map(); let now = 600, next = 0, calls = 0;
  const host = { Date: { now: () => now }, setTimeout(fn, delay) { timers.set(++next, { fn, delay }); return next; }, clearTimeout(id) { timers.delete(id); } };
  const dispose = subscribeThinkingClock(at => thinkingChangeAt('a', items, {}, at), () => calls++, host);
  assert.equal(timers.get(1).delay, 1400);
  const first = timers.get(1).fn; timers.delete(1); now = 2000; first();
  assert.equal(calls, 1); assert.equal(timers.get(2).delay, 2000);
  const second = timers.get(2).fn; timers.delete(2); now = 4000; second();
  assert.equal(calls, 2); assert.equal(timers.size, 0, 'nothing left to wait for');
  dispose();
  subscribeThinkingClock(() => null, () => calls++, host)(); assert.equal(timers.size, 0);
  const read = createThinkingReader('a', items, {});
  const active = read(100);
  assert.equal(read(200), active); assert.deepEqual(active, { kind: 'active' });
  const done = read(2500);
  assert.deepEqual(done, { kind: 'done', seconds: 1 }); assert.equal(read(3000), done);
  assert.equal(read(5000), null);
});
test('a thought keeps its first completion time; a restart reopens it', () => {
  const reasoning = { type: 'reasoning', id: 'msg-1.1.0', summary: [], content: [], reasoningText: '' };
  let state = reduce(emptyState, event('turn/started', { turn: { id: 'a', startedAt: 100 } }));
  state = reduce(state, event('item/started', { turnId: 'a', item: reasoning, startedAtMs: 1000 }));
  // DeepSeek: block-end closes the thought, the step commit completes it again later.
  state = reduce(state, event('item/completed', { turnId: 'a', item: { ...reasoning, summary: ['think'] }, completedAtMs: 4400 }));
  state = reduce(state, event('item/completed', { turnId: 'a', item: { ...reasoning, summary: ['think'] }, completedAtMs: 20000 }));
  const [item] = state.items.thread;
  assert.equal(item.startedAtMs, 1000); assert.equal(item.completedAtMs, 4400);
  assert.deepEqual(thinkingState('a', state.items.thread, state.itemPhases.thread, 5000), { kind: 'done', seconds: 3 });
  // A retried attempt restarts the same item: the old end no longer applies.
  state = reduce(state, event('item/started', { turnId: 'a', item: reasoning, startedAtMs: 21000 }));
  assert.equal(state.items.thread[0].completedAtMs, undefined);
  state = reduce(state, event('item/completed', { turnId: 'a', item: { ...reasoning, summary: ['again'] }, completedAtMs: 22000 }));
  assert.equal(state.items.thread[0].completedAtMs, 22000);
  // Other items keep the latest completion time.
  const command = { type: 'commandExecution', id: 'c', command: 'ls', status: 'completed' };
  state = reduce(state, event('item/completed', { turnId: 'a', item: command, completedAtMs: 1 }));
  state = reduce(state, event('item/completed', { turnId: 'a', item: command, completedAtMs: 2 }));
  assert.equal(state.items.thread.find(entry => entry.id === 'c').completedAtMs, 2);
});
