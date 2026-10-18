import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  TURN_BOX_EMPTY_TAIL, turnBoxTodos, turnBoxTodoStatus, latestPromptOf, planMarkFromUpdate,
  runningAgentsSince, turnBoxPlanTail, sameTurnBoxTail,
} from '../src/turn-box-plan-model.mjs';
import { emptyState, reduce } from '../src/state.js';

const app = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const v1 = path.resolve(app, '../reference/installed-2.42304.0-20261017/ion-dist/assets/v1');
const readChunk = (prefix) => {
  const name = fs.existsSync(v1) ? fs.readdirSync(v1).find((file) => file.startsWith(prefix)) : undefined;
  return name ? fs.readFileSync(path.join(v1, name), 'utf8') : null;
};
const count = (text, needle) => text.split(needle).length - 1;

// Test oracle: cccc2cf0a rv, transcribed (the turn box card decision the tail feeds).
const RV_SOURCE = 'function rv({plan:e,planBeforeWrapUp:t,planTouchedThisTurn:n,planTurnEnded:r,compactedSincePlan:i,agentsRunning:a},o,s){let c=s&&t!==null?t:e;if(c===null||c.length===0)return null;if(r||!o)return(s||a>0)&&n?{todos:c,stale:!1,working:!1}:null;let l=c.every(e=>e.status==="completed");return!n&&l?null:{todos:c,stale:n?i?"compaction":!1:"prompt",working:!0}}';
function rv({ plan: e, planBeforeWrapUp: t, planTouchedThisTurn: n, planTurnEnded: r, compactedSincePlan: i, agentsRunning: a }, o, s) {
  const c = s && t !== null ? t : e;
  if (c === null || c.length === 0) return null;
  if (r || !o) return (s || a > 0) && n ? { todos: c, stale: false, working: false } : null;
  const l = c.every((todo) => todo.status === 'completed');
  return !n && l ? null : { todos: c, stale: n ? (i ? 'compaction' : false) : 'prompt', working: true };
}

const event = (method, params) => ({ kind: 'notification', method, params });
const apply = (state, method, params) => reduce(state, { event: event(method, params) });
const user = (id, turnId) => ({ id, type: 'userMessage', turnId, content: [{ type: 'text', text: id }] });
const steps = [{ step: 'Read the code', status: 'completed' }, { step: 'Fix the bug', status: 'inProgress' }, { step: 'Run tests', status: 'pending' }];

test('official source: N_ tail and rv still read as transcribed', (t) => {
  const tail = readChunk('c1ebb1aa4-');
  const card = readChunk('cccc2cf0a-');
  if (!tail || !card) return t.skip('2.42304.0 reference not on disk');
  assert.equal(count(tail, 'var Et={wrapUp:null,wrapUpCallId:null,wrapUpReceipt:null,plan:null,planBeforeWrapUp:null,planTouchedThisTurn:!1,planTurnEnded:!1,compactedSincePlan:!1,turnSettled:!1,agentsRunning:0,workedWithoutWrapUp:!1,proposedTaskIds:Object.freeze([])}'), 1);
  assert.equal(count(tail, 'if(i)return{wrapUp:null,wrapUpCallId:null,wrapUpReceipt:null,plan:n.length>0?n:null,planBeforeWrapUp:null,planTouchedThisTurn:c,planTurnEnded:m,compactedSincePlan:_,turnSettled:A,agentsRunning:O,workedWithoutWrapUp:!1,proposedTaskIds:L}'), 1);
  assert.equal(count(tail, 'l||(l=!0,m=u>0,_=!i&&g)'), 1);
  assert.equal(count(tail, 'function Wt(e,t){let n=B(e?.id??null),r=D(e),{todos:i}=_t(r?null:e)'), 1);
  assert.equal(count(card, 'n as N_'), 1);
  assert.equal(count(card, RV_SOURCE), 1);
  // The empty tail here mirrors Et field by field.
  assert.deepEqual(Object.keys(TURN_BOX_EMPTY_TAIL), ['wrapUp', 'wrapUpCallId', 'wrapUpReceipt', 'plan', 'planBeforeWrapUp', 'planTouchedThisTurn', 'planTurnEnded', 'compactedSincePlan', 'turnSettled', 'agentsRunning', 'workedWithoutWrapUp', 'proposedTaskIds']);
});

test('steps become todos: position ids, TodoWrite statuses, no session', () => {
  assert.deepEqual(turnBoxTodos(steps), [
    { id: '0', content: 'Read the code', status: 'completed' },
    { id: '1', content: 'Fix the bug', status: 'in_progress' },
    { id: '2', content: 'Run tests', status: 'pending' },
  ]);
  assert.equal(turnBoxTodoStatus('in_progress'), 'in_progress');
  assert.equal(turnBoxTodoStatus('weird'), 'pending');
  assert.deepEqual(turnBoxTodos(null), []);
  assert.deepEqual(turnBoxTodos([{ step: 7 }]), [{ id: '0', content: '7', status: 'pending' }]);
  assert.equal('session' in turnBoxTodos(steps)[0], false);
});

test('empty transcript is Et; wrap-up fields stay null', () => {
  assert.equal(turnBoxPlanTail({ plan: steps, items: [] }), TURN_BOX_EMPTY_TAIL);
  const tail = turnBoxPlanTail({ plan: steps, planMark: { turnId: 't1', promptId: 'u1' }, items: [user('u1', 't1')], activeTurnId: 't1' });
  for (const key of ['wrapUp', 'wrapUpCallId', 'wrapUpReceipt', 'planBeforeWrapUp']) assert.equal(tail[key], null);
  assert.equal(tail.workedWithoutWrapUp, false);
  assert.equal(tail.compactedSincePlan, false);
  assert.equal(tail.proposedTaskIds, TURN_BOX_EMPTY_TAIL.proposedTaskIds);
  assert.equal(turnBoxPlanTail({ plan: [], items: [user('u1', 't1')] }).plan, null);
});

test('rv returns: working card, prompt-stale card, finished card, nothing', () => {
  const items = [user('u1', 't1'), { id: 'a', type: 'agentMessage', turnId: 't1' }];
  // Plan written in the running turn after the prompt: working, not stale.
  const live = turnBoxPlanTail({ plan: steps, planMark: { turnId: 't1', promptId: 'u1' }, items, activeTurnId: 't1' });
  assert.equal(live.planTouchedThisTurn, true);
  assert.equal(live.planTurnEnded, false);
  assert.equal(live.turnSettled, false);
  assert.deepEqual(rv(live, true, false), { todos: live.plan, stale: false, working: true });

  // A steer prompt in the same turn after the plan: "Plan from before your last message".
  const steered = turnBoxPlanTail({ plan: steps, planMark: { turnId: 't1', promptId: 'u1' }, items: [...items, user('u2', 't1')], activeTurnId: 't1' });
  assert.equal(steered.planTouchedThisTurn, false);
  assert.equal(steered.planTurnEnded, false);
  assert.deepEqual(rv(steered, true, false), { todos: steered.plan, stale: 'prompt', working: true });
  // ...but an all-done old plan shows nothing.
  const doneSteps = steps.map((step) => ({ ...step, status: 'completed' }));
  assert.equal(rv(turnBoxPlanTail({ plan: doneSteps, planMark: { turnId: 't1', promptId: 'u1' }, items: [...items, user('u2', 't1')], activeTurnId: 't1' }), true, false), null);

  // Turn ended with an agent still running: the finished card (working:false).
  const lifecycle = { C: { status: 'running' } };
  const spawn = { id: 's', type: 'collabAgentToolCall', tool: 'spawnAgent', turnId: 't1', receiverThreadIds: ['C'], agentsStates: { C: { status: 'running' } } };
  const finished = turnBoxPlanTail({ plan: steps, planMark: { turnId: 't1', promptId: 'u1' }, items: [...items, spawn], activeTurnId: null, agentLifecycle: lifecycle });
  assert.equal(finished.planTurnEnded, true);
  assert.equal(finished.turnSettled, true);
  assert.equal(finished.agentsRunning, 1);
  assert.deepEqual(rv(finished, false, false), { todos: finished.plan, stale: false, working: false });
  // Same turn with the agent done: nothing.
  assert.equal(rv(turnBoxPlanTail({ plan: steps, planMark: { turnId: 't1', promptId: 'u1' }, items: [...items, spawn], agentLifecycle: { C: { status: 'completed' } } }), false, false), null);

  // A new turn on an old plan: the old turn ended, nothing shows.
  const next = turnBoxPlanTail({ plan: steps, planMark: { turnId: 't1', promptId: 'u1' }, items: [...items, user('u3', 't2')], activeTurnId: 't2' });
  assert.equal(next.planTouchedThisTurn, false);
  assert.equal(next.planTurnEnded, true);
  assert.equal(rv(next, true, false), null);

  // No mark (no plan write found): the source leaves c and m false.
  const unmarked = turnBoxPlanTail({ plan: steps, items, activeTurnId: 't1' });
  assert.equal(unmarked.planTouchedThisTurn, false);
  assert.equal(unmarked.planTurnEnded, false);
  assert.equal(rv(unmarked, false, false), null);
});

test('compaction return is unreachable in the taskTodos branch (correction to X4 TB-2)', () => {
  const items = [user('u1', 't1'), { id: 'c', type: 'contextCompaction', turnId: 't1', status: 'completed' }];
  const tail = turnBoxPlanTail({ plan: steps, planMark: { turnId: 't1', promptId: 'u1' }, items, activeTurnId: 't1' });
  assert.equal(tail.compactedSincePlan, false);
  assert.equal(rv(tail, true, false).stale, false);
  // rv itself still has the branch, only fed by the TodoWrite branch (Pq on).
  assert.equal(rv({ ...tail, compactedSincePlan: true }, true, false).stale, 'compaction');
});

test('a mark without the prompt it saw falls back to the prompt turn', () => {
  const items = [user('u1', 't1')];
  assert.equal(turnBoxPlanTail({ plan: steps, planMark: { turnId: 't1', promptId: null }, items, activeTurnId: 't1' }).planTouchedThisTurn, true);
  assert.equal(turnBoxPlanTail({ plan: steps, planMark: { turnId: 't0', promptId: null }, items, activeTurnId: 't1' }).planTouchedThisTurn, false);
  // An explicit latestPromptId picks that prompt.
  const two = [user('u1', 't1'), user('u2', 't1')];
  assert.equal(turnBoxPlanTail({ plan: steps, planMark: { turnId: 't1', promptId: 'u1' }, items: two, activeTurnId: 't1', latestPromptId: 'u1' }).planTouchedThisTurn, true);
});

test('agentsRunning counts agents spawned since the latest prompt, once each', () => {
  const items = [
    { id: 'old', type: 'collabAgentToolCall', tool: 'spawnAgent', receiverThreadIds: ['A'] },
    user('u1', 't1'),
    { id: 's1', type: 'collabAgentToolCall', tool: 'spawnAgent', receiverThreadIds: ['B'], agentsStates: { B: { status: 'running' } } },
    { id: 'w', type: 'collabAgentToolCall', tool: 'wait', receiverThreadIds: ['A'] },
    { id: 'sa', type: 'subAgentActivity', kind: 'started', agentThreadId: 'B' },
    { id: 'sb', type: 'subAgentActivity', kind: 'started', agentThreadId: 'D' },
  ];
  const lifecycle = { A: { status: 'running' }, B: { status: 'running' }, D: { status: 'running' } };
  assert.equal(runningAgentsSince(items, latestPromptOf(items).index, lifecycle), 2);
  assert.equal(runningAgentsSince(items, latestPromptOf(items).index, { ...lifecycle, D: { status: 'completed' } }), 1);
  assert.equal(runningAgentsSince(items, -1, lifecycle), 3);
});

test('tail equality follows Bt', () => {
  const items = [user('u1', 't1')];
  const a = turnBoxPlanTail({ plan: steps, planMark: { turnId: 't1', promptId: 'u1' }, items, activeTurnId: 't1' });
  const b = turnBoxPlanTail({ plan: steps.map((step) => ({ ...step })), planMark: { turnId: 't1', promptId: 'u1' }, items, activeTurnId: 't1' });
  assert.notEqual(a, b);
  assert.equal(sameTurnBoxTail(a, b), true);
  assert.equal(sameTurnBoxTail(a, { ...b, turnSettled: true }), false);
  assert.equal(sameTurnBoxTail(a, turnBoxPlanTail({ plan: [{ ...steps[0], status: 'pending' }, ...steps.slice(1)], planMark: { turnId: 't1', promptId: 'u1' }, items, activeTurnId: 't1' })), false);
});

test('host thread state: real reducer events drive the tail', () => {
  let state = emptyState;
  state = apply(state, 'turn/started', { threadId: 'P', turn: { id: 't1' } });
  state = apply(state, 'item/completed', { threadId: 'P', turnId: 't1', item: user('u1', 't1') });
  const params = { threadId: 'P', turnId: 't1', explanation: null, plan: steps };
  // The caller records the mark beside the steps when the notification lands.
  const planMark = planMarkFromUpdate(params.turnId, state.items.P);
  state = apply(state, 'turn/plan/updated', params);
  assert.deepEqual(planMark, { turnId: 't1', promptId: 'u1' });
  const read = (s) => turnBoxPlanTail({ plan: s.plans.P, planMark, items: s.items.P, activeTurnId: s.active.P, agentLifecycle: s.agentLifecycle });
  const running = read(state);
  assert.equal(running.planTouchedThisTurn, true);
  assert.deepEqual(rv(running, true, false)?.working, true);
  state = apply(state, 'turn/completed', { threadId: 'P', turn: { id: 't1', status: 'completed' } });
  const settled = read(state);
  assert.equal(settled.turnSettled, true);
  assert.equal(settled.planTurnEnded, true);
  assert.equal(rv(settled, false, false), null);
  assert.deepEqual(planMarkFromUpdate('', []), { turnId: null, promptId: null });
});
