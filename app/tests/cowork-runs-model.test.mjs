import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { coworkRunSessions, coworkRunsData, coworkRunsReadState, coworkRunsRoute, coworkScheduledTaskFor, coworkUpcomingTriggers } from '../src/cowork-runs-model.mjs';

// w13-coworkui-runs: the pure model behind the Runs / Upcoming sections (src/cowork-runs-model.mjs). Each rule is checked
// against the 3.6556.2 text it follows (c21f11e6d Ew / AT, cb1e253a0 m_, shared-78 um, shared-2 Ud / eK).
const v1 = path.resolve(import.meta.dirname, '../../reference/snapshots/claude-3.6556.2-20261025-192807/ion-dist/assets/v1');
const official = name => fs.readFileSync(path.join(v1, name), 'utf8');

const tasks = [
  { id: 'a', name: 'Digest', runs: [{ id: 'r1', threadId: 'thr-1', startedAt: 1000, finishedAt: 2000, status: 'completed', trigger: 'scheduled' }] },
  { id: 'b', name: 'Cleanup', runs: [
    { id: 'r2', threadId: 'thr-2', startedAt: 5000, status: 'running', trigger: 'manual' },
    { id: 'r3', startedAt: 4000, status: 'failed', error: 'boom', trigger: 'scheduled' },
    { id: 'r4', threadId: 'thr-3', startedAt: '2026-10-28T08:00:00.000Z', finishedAt: '2026-10-28T08:05:00.000Z', status: 'completed', trigger: 'scheduled' }] },
];

test('the task of a session is the one whose run started its thread; an ordinary session has none (AT: de && Ew)', () => {
  assert.ok(official('c21f11e6d-Cyd8_HO8.js').includes('de&&p(Ew,{scheduledTaskId:de,currentSessionId:J,'));
  assert.equal(coworkScheduledTaskFor(tasks, 'thr-2')?.id, 'b');
  assert.equal(coworkScheduledTaskFor(tasks, 'thr-9'), undefined);
  assert.equal(coworkScheduledTaskFor(null, 'thr-1'), undefined);
  assert.equal(coworkScheduledTaskFor(tasks, undefined), undefined);
  const none = coworkRunsData({ tasks, sessionId: 'thr-9' });
  assert.deepEqual(none, { scheduledTaskId: undefined, host: { scheduledTasks: [], sessions: [], readState: { initializedAt: 0, sessions: {} } }, triggers: [] });
});

test('run sessions: one official row per run with a thread, the fields Ew reads', () => {
  const c21 = official('c21f11e6d-Cyd8_HO8.js');
  // Ew: pendingToolPermissions / isRunning / lastActivityAt for the unread dot, createdAt for Dw and the time, origin (jT).
  assert.ok(c21.includes('let t=e.pendingToolPermissions?.length??0,n=!e.isRunning&&t===0&&e.lastActivityAt!==void 0;'));
  assert.ok(official('shared-26-CGuBxVt9.js').includes('function jT(e){return"origin"in e&&typeof e.origin=="string"?e.origin:void 0}'));
  const live = [{ sessionId: 'thr-3', isRunning: false, lastActivityAt: 9999, pendingToolPermissions: [{ id: 'p' }] }];
  assert.deepEqual(coworkRunSessions(tasks[1], live), [
    { sessionId: 'thr-2', createdAt: new Date(5000).toISOString(), origin: 'force_run_trigger', isRunning: true, lastActivityAt: 5000, pendingToolPermissions: [] },
    { sessionId: 'thr-3', createdAt: '2026-10-28T08:00:00.000Z', origin: 'scheduled_trigger', isRunning: false, lastActivityAt: 9999, pendingToolPermissions: [{ id: 'p' }] },
  ]);
  // Without a live row: the run's finish (else start) is the last activity.
  assert.equal(coworkRunSessions(tasks[0])[0].lastActivityAt, 2000);
  // The task summary l_ reads (`.find(t => t.id === e)?.displayName`).
  assert.deepEqual(coworkRunsData({ tasks, sessionId: 'thr-1' }).host.scheduledTasks, [{ id: 'a', displayName: 'Digest' }]);
});

test('read state: the official { initializedAt, sessions } shape; a host-unread session reads 0 (eK explicit unread)', () => {
  const eK = 'function eK(e,t){if(!t)return!1;let n=t.sessions[e.sessionId],r=!!t.explicitUnread?.[e.sessionId]||n===0;';
  assert.ok(official('shared-2-TF8v67kg.js').includes(eK));
  const sessions = [{ sessionId: 's1', lastActivityAt: 10 }, { sessionId: 's2', lastActivityAt: 20 }];
  assert.deepEqual(coworkRunsReadState(sessions, { s2: { unread: true } }), { initializedAt: 0, sessions: { s1: 10, s2: 0 } });
});

test('upcoming triggers follow cb1e253a0 m_: successful send_later results, minus delete / fire, sorted by fireAt', () => {
  const cb1 = official('cb1e253a0-DgeDleLc.js');
  for (const s of ['En(r.name,"delete_trigger")||En(r.name,"fire_trigger")', 'if(!En(r.name,"send_later"))continue;',
    '!("trigger_id"in o)||typeof o.trigger_id!="string"||!("fire_at"in o)||typeof o.fire_at!="string"',
    'message:typeof c?.message=="string"?Ya(c.message):""'])
    assert.ok(cb1.includes(s), s);
  assert.ok(official('shared-78-D5Fw2h0a.js').includes('Wj=["Claude Code Remote",Hj],Gj=[...Wj,"Claude_Code_Remote",Uj]'));
  const call = (id, tool, args, payload, extra = {}) => ({ id, type: 'mcpToolCall', tool, arguments: args, status: 'completed',
    result: { content: [{ type: 'text', text: JSON.stringify(payload) }] }, ...extra });
  const items = [
    call('u1', 'send_later', { message: 'Later <cc-memory filenames="a.md">x</cc-memory>' }, { trigger_id: 't1', fire_at: '2026-10-28T12:00:00Z' }),
    call('u2', 'send_later', { message: 'First' }, { trigger_id: 't2', fire_at: '2026-10-28T10:00:00Z' }, { server: 'claude-code-remote' }),
    call('u3', 'send_later', { message: 'Removed' }, { trigger_id: 't3', fire_at: '2026-10-28T11:00:00Z' }),
    call('u4', 'delete_trigger', { trigger_id: 't3' }, {}),
    call('u5', 'send_later', { message: 'Failed' }, { trigger_id: 't4', fire_at: '2026-10-28T11:00:00Z' }, { status: 'failed' }),
    call('u6', 'send_later', { message: 'Other server' }, { trigger_id: 't5', fire_at: '2026-10-28T11:00:00Z' }, { server: 'my-mcp' }),
    call('u7', 'send_later', { message: 'Bad' }, { trigger_id: 't6', fire_at: 'not a date' }),
    { id: 'c1', type: 'commandExecution', command: 'ls', status: 'completed' },
  ];
  assert.deepEqual(coworkUpcomingTriggers(items).map(t => [t.triggerId, t.fireAt.toISOString(), t.message, t.toolUseId]), [
    ['t2', '2026-10-28T10:00:00.000Z', 'First', 'u2'],
    ['t1', '2026-10-28T12:00:00.000Z', 'Later x', 'u1'],
  ]);
  // The local runtimes have no send_later tool, so an ordinary transcript gives none (eT then renders null).
  assert.deepEqual(coworkUpcomingTriggers([{ type: 'agentMessage', text: 'hi' }, { type: 'fileChange', status: 'completed' }]), []);
  assert.deepEqual(coworkUpcomingTriggers(undefined), []);
});

test('routes: the two hrefs the sections render', () => {
  const c21 = official('c21f11e6d-Cyd8_HO8.js');
  assert.ok(c21.includes('s=`${zn}/${t}`') && c21.includes('v=`${Kn}/${encodeURIComponent(t)}`'));
  assert.ok(official('shared-52-uHFNjl7C.js').includes('gl="/cowork"') && official('shared-52-uHFNjl7C.js').includes('Rl="/scheduled-task"'));
  assert.deepEqual(coworkRunsRoute('/cowork/thr-1'), { kind: 'session', id: 'thr-1' });
  assert.deepEqual(coworkRunsRoute('/scheduled-task/a%2Fb'), { kind: 'scheduled-task', id: 'a/b' });
  assert.equal(coworkRunsRoute('/elsewhere'), undefined);
  assert.equal(coworkRunsRoute(-1), undefined);
});
