import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { EventEmitter } from 'node:events';
import { setImmediate } from 'node:timers/promises';
import { guestWorkdir } from '../electron/cowork-runtime/session-paths.mjs';
import { CoworkSessions } from '../electron/cowork-runtime/session-service.mjs';

async function fixture(t, extra = {}) {
  const dataDir = await fs.mkdtemp(path.join(os.tmpdir(), 'cowork-session-'));
  t.after(() => fs.rm(dataDir, { recursive: true, force: true }));
  const host = new EventEmitter(), calls = [], events = [];
  host.request = async (method, params) => { calls.push({ method, params }); return {}; };
  host.stop = async () => {};
  const settings = { dataDir, host, provider: async model => ({ model: model || 'test', env: { ANTHROPIC_API_KEY: 'fixture-secret' } }),
    approveFolder: async cwd => { if (cwd !== dataDir) throw new Error('Unknown folder.'); return cwd; },
    approval: async () => ({ decision: 'decline' }), emit: event => events.push(event), ...extra };
  const service = new CoworkSessions(settings);
  const started = await service.request('thread/start', { cwd: dataDir, model: 'test' });
  const id = started.thread.id;
  const turn = () => service.request('turn/start', { threadId: id, input: [{ type: 'text', text: 'Do work' }] });
  const message = record => host.emit('event', { event: 'message', sessionId: id, record });
  return { service, settings, dataDir, host, calls, events, id, turn, message };
}

test('Cowork starts lazily, persists ownership and never writes provider credentials to session records', async t => {
  const f = await fixture(t);
  assert.equal(f.calls.length, 0);
  const result = await f.turn(); await setImmediate();
  assert.equal(result.turn.status, 'inProgress');
  assert.equal(f.calls[0].method, 'open'); assert.equal(f.calls[0].params.resume, false);
  assert.equal(f.calls[1].method, 'send');
  const stored = await fs.readFile(f.service.file(f.id), 'utf8');
  assert.equal(stored.includes('fixture-secret'), false); assert.equal(JSON.parse(stored).engine, 'cowork-vm');
  f.message({ type: 'system', subtype: 'init', session_id: f.calls[0].params.sdkSessionId });
  f.message({ type: 'result', subtype: 'success', is_error: false, result: 'Done' });
  assert.equal(f.events.at(-1).method, 'turn/completed');
  assert.equal(f.events.at(-1).params.turn.status, 'completed');
  await f.turn(); await setImmediate();
  assert.equal(f.calls.filter(call => call.method === 'open').at(-1).params.resume, true);
  await f.service.stop();
});

test('streamed and final text reconcile into one item and guest deliverable links map to the host folder', async t => {
  const f = await fixture(t); await f.turn(); await setImmediate();
  f.message({ type: 'stream_event', event: { type: 'message_start', message: { id: 'm' } } });
  f.message({ type: 'stream_event', event: { type: 'content_block_start', index: 0, content_block: { type: 'text', text: '' } } });
  f.message({ type: 'stream_event', event: { type: 'content_block_delta', index: 0, delta: { type: 'text_delta', text: '你好' } } });
  f.message({ type: 'assistant', message: { id: 'm', content: [{ type: 'text', text: `你好 [report](${guestWorkdir(f.id)}/outputs/report.md)` }] } });
  f.message({ type: 'result', subtype: 'success', is_error: false, result: 'duplicate final' });
  const { thread } = await f.service.request('thread/read', { threadId: f.id });
  const replies = thread.turns[0].items.filter(item => item.type === 'agentMessage');
  assert.equal(replies.length, 1); assert.equal(replies[0].phase, 'final_answer');
  assert.ok(replies[0].text.includes(`${f.dataDir}/outputs/report.md`));
  assert.equal(f.events.filter(event => event.method === 'item/agentMessage/delta').length, 1);
});

test('tool inputs, approvals and results reach the existing app protocol', async t => {
  const approvals = [];
  const f = await fixture(t, { approval: async (...args) => { approvals.push(args); return { decision: 'accept' }; } });
  await f.turn(); await setImmediate();
  f.message({ type: 'assistant', message: { id: 'm', content: [{ type: 'tool_use', id: 't', name: 'Write', input: { file_path: 'report.md' } }] } });
  f.host.emit('event', { event: 'approval', sessionId: f.id, id: `${f.id}:p`, request: { tool_name: 'Write', tool_use_id: 't', input: { file_path: 'report.md' } } });
  await setImmediate();
  assert.equal(approvals[0][0], 'item/commandExecution/requestApproval');
  assert.equal(f.calls.at(-1).params.response.behavior, 'allow');
  f.message({ type: 'user', message: { content: [{ type: 'tool_result', tool_use_id: 't', content: 'saved' }] } });
  const tool = f.events.findLast(event => event.method === 'item/completed').params.item;
  assert.equal(tool.success, true); assert.equal(tool.contentItems[0].text, 'saved');
  f.message({ type: 'result', subtype: 'success', is_error: false });
});

test('stop targets the exact turn, revokes pending approval, and late prior-turn events cannot finish a new turn', async t => {
  let approvalSignal;
  const f = await fixture(t, { approval: async (_method, _params, { signal }) => { approvalSignal = signal; return new Promise(resolve => signal.addEventListener('abort', () => resolve(null), { once: true })); } });
  const first = await f.turn(); await setImmediate();
  f.host.emit('event', { event: 'approval', sessionId: f.id, id: `${f.id}:p`, request: { tool_name: 'Write', tool_use_id: 't', input: {} } });
  await assert.rejects(f.service.request('turn/interrupt', { threadId: f.id, turnId: 'old' }), /changed/);
  await f.service.request('turn/interrupt', { threadId: f.id, turnId: first.turn.id });
  assert.equal(approvalSignal.aborted, true);
  const second = await f.turn(); await setImmediate();
  f.host.emit('event', { event: 'message', sessionId: f.id, turnId: first.turn.id, record: { type: 'result', subtype: 'success' } });
  assert.equal(f.service.live.get(f.id).turn.id, second.turn.id);
  await f.service.stop();
});

test('interrupted process state recovers from disk without booting and never resumes under a different SDK identity', async t => {
  const f = await fixture(t); await f.turn(); await setImmediate();
  const reopened = new CoworkSessions({ ...f.settings, host: new EventEmitter() });
  const restored = await reopened.request('thread/resume', { threadId: f.id });
  assert.equal(restored.thread.turns[0].status, 'interrupted');
  f.message({ type: 'system', subtype: 'init', session_id: 'foreign-session' });
  assert.equal(f.service.live.has(f.id), false);
  assert.match(f.events.at(-1).params.turn.error.message, /identity/);
});

test('task failure, duplicate sends and unsupported attachments are explicit', async t => {
  const f = await fixture(t); await f.turn(); await setImmediate();
  await assert.rejects(f.turn(), /already running/);
  await assert.rejects(f.service.request('thread/delete', { threadId: f.id }), /Stop/);
  f.message({ type: 'result', subtype: 'error_during_execution', is_error: true, errors: ['failed to write'] });
  assert.equal(f.events.at(-1).params.turn.status, 'failed');
  await assert.rejects(f.service.request('turn/start', { threadId: f.id, input: [{ type: 'localImage', path: '/other/image.png' }] }), /selected folder/);
  await f.service.request('thread/archive', { threadId: f.id });
  await f.service.request('thread/unarchive', { threadId: f.id });
  await f.service.request('thread/delete', { threadId: f.id });
  await assert.rejects(f.service.request('thread/read', { threadId: f.id }), /could not be read/);
});

test('Cowork questions, plan steps and actual output files populate the existing UI contracts', async t => {
  const f = await fixture(t, { approval: async (method, params) => {
    assert.equal(method, 'item/tool/requestUserInput'); assert.equal(params.questions[0].question, 'Which format?');
    return { answers: { '0': { answers: ['Markdown'] } } };
  } });
  await f.turn(); await setImmediate();
  f.host.emit('event', { event: 'approval', sessionId: f.id, id: `${f.id}:q`, request: { tool_name: 'AskUserQuestion', tool_use_id: 'question',
    input: { questions: [{ question: 'Which format?', header: 'Format', options: [{ label: 'Markdown', description: 'Text document' }] }] } } });
  await setImmediate(); assert.deepEqual(f.calls.at(-1).params.response.updatedInput.answers, { 'Which format?': 'Markdown' });
  f.message({ type: 'assistant', message: { id: 'm', content: [{ type: 'tool_use', id: 'plan', name: 'TodoWrite', input: { todos: [{ content: 'Write report', status: 'in_progress' }] } }] } });
  assert.deepEqual(f.events.findLast(event => event.method === 'turn/plan/updated').params.plan, [{ step: 'Write report', status: 'inProgress' }]);
  await fs.mkdir(path.join(f.dataDir, 'outputs')); await fs.writeFile(path.join(f.dataDir, 'outputs/report.md'), 'Report');
  f.message({ type: 'result', subtype: 'success', is_error: false });
  const item = f.events.find(event => event.method === 'item/completed' && event.params.item.tool === 'present').params.item;
  assert.equal(item.codeDesktop.deliverables[0].path, path.join(f.dataDir, 'outputs/report.md'));
  const restored = await f.service.request('thread/read', { threadId: f.id }); assert.equal(restored.thread.historyMode, 'legacy');
});

// R4i-cowork CW2 (X2 CW-2): the host rewindSessionV2 — fixture transcripts and the injected host only.
import { sessionConfigDir, REWIND_SEND_RACE, REWIND_FORK_REFUSED } from '../electron/cowork-runtime/rewind-chain.mjs';

async function conversation(f, texts) {
  for (const text of texts) {
    await f.service.request('turn/start', { threadId: f.id, input: [{ type: 'text', text }] }); await setImmediate();
    const open = f.calls.filter(call => call.method === 'open').at(-1).params;
    f.message({ type: 'system', subtype: 'init', session_id: open.sdkSessionId });
    f.message({ type: 'assistant', uuid: `a-${text}`, message: { id: `m-${text}`, stop_reason: 'end_turn', content: [{ type: 'text', text: `Reply ${text}` }] } });
    f.message({ type: 'result', subtype: 'success', is_error: false });
  }
  const { thread } = await f.service.request('thread/read', { threadId: f.id });
  return thread.turns.map(turn => turn.items[0].id);
}
async function transcript(f, uuids, texts, sdkSessionId = f.service.rows.get(f.id).sdkSessionId) {
  const dir = path.join(sessionConfigDir(f.dataDir, f.id), 'projects', '-sessions-cw-x-mnt-work');
  await fs.mkdir(dir, { recursive: true });
  const lines = uuids.flatMap((uuid, index) => [
    { type: 'user', uuid, parentUuid: index ? `a-${texts[index - 1]}` : null, message: { role: 'user', content: [{ type: 'text', text: texts[index] }] } },
    { type: 'assistant', uuid: `a-${texts[index]}`, parentUuid: uuid, message: { content: [{ type: 'text', text: `Reply ${texts[index]}` }] } }]);
  await fs.writeFile(path.join(dir, `${sdkSessionId}.jsonl`), lines.map(line => JSON.stringify(line)).join('\n') + '\n');
}

test('cowork/rewind: the fork point is the assistant before the target, turns are cut and the next turn forks the CLI session', async t => {
  const f = await fixture(t);
  const uuids = await conversation(f, ['One', 'Two', 'Three']);
  const old = f.service.rows.get(f.id).sdkSessionId;
  await transcript(f, uuids, ['One', 'Two', 'Three']);
  assert.deepEqual(await f.service.request('cowork/rewind', { threadId: f.id, targetMessageUuid: uuids[1] }), { prefill: 'Two' });
  const row = JSON.parse(await fs.readFile(f.service.file(f.id), 'utf8'));
  assert.equal(row.pendingRewindTo, 'a-One');
  assert.equal(row.thread.turns.length, 1);
  assert.deepEqual(Object.keys(row.cliRecords), [row.thread.turns[0].id], 'the cut turns lose their buffer records');
  assert.equal('cliRecords' in (await f.service.request('thread/read', { threadId: f.id })).thread, false, 'the buffer never reaches the renderer');
  await f.service.request('turn/start', { threadId: f.id, input: [{ type: 'text', text: 'Two, again' }] }); await setImmediate();
  const open = f.calls.filter(call => call.method === 'open').at(-1).params;
  assert.deepEqual(open.fork, { from: old, at: 'a-One' }); assert.equal(open.resume, false); assert.notEqual(open.sdkSessionId, old);
  assert.equal(f.calls.at(-1).params.sdkSessionId, open.sdkSessionId, 'the send names the forked session');
  f.message({ type: 'system', subtype: 'init', session_id: open.sdkSessionId });
  const forked = f.service.rows.get(f.id);
  assert.equal(forked.sdkSessionId, open.sdkSessionId); assert.equal(forked.sdkStarted, true); assert.equal('pendingRewindTo' in forked, false);
  f.message({ type: 'result', subtype: 'success', is_error: false });
  await f.service.request('turn/start', { threadId: f.id, input: [{ type: 'text', text: 'Next' }] }); await setImmediate();
  const after = f.calls.filter(call => call.method === 'open').at(-1).params;
  assert.equal(after.resume, true); assert.equal(after.fork, undefined); assert.equal(after.sdkSessionId, open.sdkSessionId);
});

test('cowork/rewind: a first-message rewind starts a fresh CLI session; a target that never reached the CLI is dropped', async t => {
  const f = await fixture(t);
  const uuids = await conversation(f, ['One']);
  const old = f.service.rows.get(f.id).sdkSessionId;
  await transcript(f, uuids, ['One']);
  assert.deepEqual(await f.service.request('cowork/rewind', { threadId: f.id, targetMessageUuid: uuids[0] }), { prefill: 'One' });
  assert.equal(f.service.rows.get(f.id).pendingRewindTo, '');
  await f.service.request('turn/start', { threadId: f.id, input: [{ type: 'text', text: 'Fresh' }] }); await setImmediate();
  const open = f.calls.filter(call => call.method === 'open').at(-1).params;
  assert.equal(open.resume, false); assert.equal(open.fork, undefined); assert.notEqual(open.sdkSessionId, old);
  f.message({ type: 'system', subtype: 'init', session_id: old });
  assert.match(f.events.at(-1).params.turn.error.message, /identity/, 'the old session cannot answer for the fresh one');

  const g = await fixture(t);
  await g.service.request('turn/start', { threadId: g.id, input: [{ type: 'text', text: 'Never sent' }] }); await setImmediate();
  g.host.emit('event', { event: 'failure', sessionId: g.id, error: 'boot failed' });
  const target = (await g.service.request('thread/read', { threadId: g.id })).thread.turns[0].items[0].id;
  assert.deepEqual(await g.service.request('cowork/rewind', { threadId: g.id, targetMessageUuid: target }), { prefill: 'Never sent' });
  assert.equal('pendingRewindTo' in g.service.rows.get(g.id), false, 'no fork when the CLI never started');
  assert.equal(g.service.rows.get(g.id).thread.turns.length, 0);
});

test('cowork/rewind refusals leave the session untouched: dead branch, unknown target, empty transcript', async t => {
  const f = await fixture(t);
  const uuids = await conversation(f, ['One', 'Two']);
  await transcript(f, uuids, ['One', 'Two']);
  const file = path.join(sessionConfigDir(f.dataDir, f.id), 'projects', '-sessions-cw-x-mnt-work', `${f.service.rows.get(f.id).sdkSessionId}.jsonl`);
  await fs.appendFile(file, JSON.stringify({ type: 'user', uuid: 'side', parentUuid: null }) + '\n' + JSON.stringify({ type: 'assistant', uuid: 'side-a', parentUuid: 'side' }) + '\n');
  const before = await fs.readFile(f.service.file(f.id), 'utf8');
  assert.deepEqual(await f.service.request('cowork/rewind', { threadId: f.id, targetMessageUuid: uuids[1] }), { refusal: 'dead' });
  assert.deepEqual(await f.service.request('cowork/rewind', { threadId: f.id, targetMessageUuid: 'nope' }), { refusal: 'unknown' });
  await fs.writeFile(file, '');
  assert.deepEqual(await f.service.request('cowork/rewind', { threadId: f.id, targetMessageUuid: uuids[1] }), { refusal: 'unknown' });
  assert.equal(await fs.readFile(f.service.file(f.id), 'utf8'), before);
  await assert.rejects(f.service.request('cowork/rewind', { threadId: f.id }), /Unknown Cowork message/);
});

test('cowork/rewind stops a running task first, and a send that lands during the rewind aborts it with the original copy', async t => {
  const f = await fixture(t);
  const uuids = await conversation(f, ['One', 'Two']);
  await transcript(f, uuids, ['One', 'Two']);
  await f.service.request('turn/start', { threadId: f.id, input: [{ type: 'text', text: 'Three' }] }); await setImmediate();
  assert.equal(f.service.live.has(f.id), true);
  assert.deepEqual(await f.service.request('cowork/rewind', { threadId: f.id, targetMessageUuid: uuids[1] }), { prefill: 'Two' });
  assert.equal(f.service.live.has(f.id), false);
  const stopped = f.calls.findLastIndex(call => call.method === 'close' && call.params.turnId);
  assert.ok(stopped >= 0 && f.calls.findLastIndex(call => call.method === 'close' && !call.params.turnId) > stopped, 'interrupt, then wait for the CLI to exit');
  assert.equal(f.service.rows.get(f.id).thread.turns.length, 1);

  const g = await fixture(t);
  const ids = await conversation(g, ['One', 'Two']);
  await transcript(g, ids, ['One', 'Two']);
  const request = g.host.request;
  g.host.request = async (method, params) => {
    if (method === 'close' && !params.turnId) await g.service.request('turn/start', { threadId: g.id, input: [{ type: 'text', text: 'Sneaked in' }] });
    return request(method, params);
  };
  await assert.rejects(g.service.request('cowork/rewind', { threadId: g.id, targetMessageUuid: ids[1] }), error => error.message === REWIND_SEND_RACE);
  assert.equal('pendingRewindTo' in g.service.rows.get(g.id), false);
  assert.equal(g.service.rows.get(g.id).thread.turns.length, 3, 'nothing was cut');
});

test('a fork the CLI refuses is dropped; a fork init under a new CLI id is adopted, never under the forked id', async t => {
  const f = await fixture(t);
  const uuids = await conversation(f, ['One', 'Two']);
  const old = f.service.rows.get(f.id).sdkSessionId;
  await transcript(f, uuids, ['One', 'Two']);
  await f.service.request('cowork/rewind', { threadId: f.id, targetMessageUuid: uuids[1] });
  await f.service.request('turn/start', { threadId: f.id, input: [{ type: 'text', text: 'Again' }] }); await setImmediate();
  f.host.emit('event', { event: 'failure', sessionId: f.id, error: REWIND_FORK_REFUSED });
  assert.equal('pendingRewindTo' in f.service.rows.get(f.id), false);
  assert.equal(f.service.rows.get(f.id).sdkSessionId, old, 'the next turn resumes the session as it was');

  const g = await fixture(t);
  const ids = await conversation(g, ['One', 'Two']);
  const before = g.service.rows.get(g.id).sdkSessionId;
  await transcript(g, ids, ['One', 'Two']);
  await g.service.request('cowork/rewind', { threadId: g.id, targetMessageUuid: ids[1] });
  await g.service.request('turn/start', { threadId: g.id, input: [{ type: 'text', text: 'Again' }] }); await setImmediate();
  g.message({ type: 'system', subtype: 'init', session_id: before });
  assert.match(g.events.at(-1).params.turn.error.message, /identity/);
  assert.equal(g.service.rows.get(g.id).pendingRewindTo, 'a-One', 'the fork is still pending');
  await g.service.request('turn/start', { threadId: g.id, input: [{ type: 'text', text: 'Again' }] }); await setImmediate();
  g.message({ type: 'system', subtype: 'init', session_id: 'cli-chosen-id' });
  assert.equal(g.service.rows.get(g.id).sdkSessionId, 'cli-chosen-id');
  g.message({ type: 'system', subtype: 'init', session_id: 'yet-another' });
  assert.match(g.events.at(-1).params.turn.error.message, /identity/, 'a second init must keep the adopted id');
});
