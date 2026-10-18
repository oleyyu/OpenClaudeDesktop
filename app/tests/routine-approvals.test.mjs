// R4g-routines RT6 (tasks-code-routines WI-6, hostGap 7): a Code task's Always allowed rules through the approval pipeline.
// The real scheduler (local-routines.mjs) and the real card-answer mapper (respond-approval.cjs) with an in-memory owner
// in place of the core connection: no process, no port.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';
import { createLocalRoutines } from '../electron/local-routines.mjs';
import { COMMAND_APPROVAL, createRoutineApprovals, listedApprovals, routineApprovalRule, routineRunFor, sameRule, storedRule } from '../electron/routine-approvals.mjs';

const require = createRequire(import.meta.url);
const { respondToApproval } = require('../electron/respond-approval.cjs');

const ROOT = '/work/repo';
const command = (patch = {}, params = {}) => ({ kind: 'request', id: patch.id ?? 7, method: COMMAND_APPROVAL,
  bridgeApproval: { connectionId: 'c', instanceId: `i-${patch.id ?? 7}` },
  params: { kind: 'command', threadId: 'run-thread', turnId: 'turn-1', itemId: 'call', command: 'npm test', cwd: ROOT, reason: null, sessionGrantable: true, ...params },
  ...patch });

test('only a command approval of the core with a folder inside the session root is a rule', () => {
  assert.deepEqual(routineApprovalRule(command(), ROOT), { toolName: 'Bash', ruleContent: 'npm test', cwd: '' });
  assert.deepEqual(routineApprovalRule(command({}, { cwd: `${ROOT}/pkg/a` }), ROOT), { toolName: 'Bash', ruleContent: 'npm test', cwd: 'pkg/a' });
  // The DeepSeek core's escalation reason names the sandbox it needs; the rule keeps it.
  assert.deepEqual(routineApprovalRule(command({}, { reason: 'Needs danger-full-access: install packages' }), ROOT).escalation, 'danger-full-access');
  assert.equal('escalation' in routineApprovalRule(command({}, { reason: 'The model wants to run tests' }), ROOT), false);
  // Codex lists its decisions; Deny feedback (OpenCode) is still a command.
  assert.ok(routineApprovalRule(command({}, { availableDecisions: ['accept', 'acceptForSession', 'decline'] }), ROOT));
  assert.ok(routineApprovalRule(command({}, { codeDesktop: { declineFeedback: true } }), ROOT));
  const refused = {
    'file change': command({ method: 'item/fileChange/requestApproval' }),
    'MCP elicitation': command({ method: 'mcpServer/elicitation/request' }),
    'app agent tool': command({ id: 'code-desktop-1234' }),
    'agent tool extension': command({}, { codeDesktop: { agentTool: { name: 'terminal' } } }),
    'sampling': command({}, { codeDesktop: { sampling: { server: 'x' } } }),
    'terminal input': command({}, { kind: 'writeStdin' }),
    'not grantable': command({}, { sessionGrantable: false }),
    'network': command({}, { networkApprovalContext: { host: 'example.com', protocol: 'https' } }),
    'permissions': command({}, { additionalPermissions: { network: true } }),
    'no session decision': command({}, { availableDecisions: ['accept', 'decline'] }),
    'no command': command({}, { command: null }),
    'blank command': command({}, { command: '  ' }),
    'long command': command({}, { command: 'x'.repeat(4001) }),
    'outside root': command({}, { cwd: '/work/other' }),
    'parent': command({}, { cwd: '/work' }),
    'relative cwd': command({}, { cwd: 'repo' }),
    'no thread': command({}, { threadId: undefined }),
  };
  for (const [name, request] of Object.entries(refused)) assert.equal(routineApprovalRule(request, ROOT), null, name);
  assert.equal(routineApprovalRule(command(), undefined), null, 'no known session root');
  assert.equal(routineApprovalRule(command(), 'relative'), null);
});

test('rules compare tool, exact command, relative folder and escalation; the page lists one per official key', () => {
  const rule = { toolName: 'Bash', ruleContent: 'npm test', cwd: '' };
  assert.equal(sameRule(rule, { ...rule }), true);
  assert.equal(sameRule(rule, { ...rule, ruleContent: 'npm test ' }), false);
  assert.equal(sameRule(rule, { ...rule, cwd: 'pkg' }), false);
  assert.equal(sameRule(rule, { ...rule, escalation: 'danger-full-access' }), false);
  assert.equal(sameRule(rule, null), false);
  assert.equal(storedRule({ ...rule, approvedAt: 1 }).approvedAt, undefined);
  assert.deepEqual(listedApprovals({ approvedPermissions: [rule, { ...rule, cwd: 'pkg' }, { toolName: 'Bash', ruleContent: 'ls', cwd: '' }, { toolName: 'Edit' }] }),
    [{ toolName: 'Bash', ruleContent: 'npm test' }, { toolName: 'Bash', ruleContent: 'ls' }]);
  const rows = [{ id: 'cowork', kind: 'cowork', runs: [{ threadId: 't', status: 'running' }] },
    { id: 'code', kind: 'code', runs: [{ threadId: 'done', status: 'completed' }, { threadId: 't', status: 'running' }] }];
  assert.equal(routineRunFor(rows, 't', 'cowork'), null);
  assert.equal(routineRunFor(rows, 'done', 'code'), null, 'a finished run is not a run any more');
  assert.equal(routineRunFor(rows, 't', undefined), null);
  assert.equal(routineRunFor(rows, 't', 'code').task.id, 'code');
});

// One core connection's pending approvals, answered as CodexClient.getApproval / respond do (identity checked).
function fakeOwner() {
  const pending = new Map(), sent = [];
  return {
    sent,
    ask(event) { pending.set(event.id, event); return event; },
    pending: () => [...pending.keys()],
    getApproval(id, expected) {
      const event = pending.get(id);
      if (!event || event.bridgeApproval.instanceId !== expected?.instanceId) { const error = new Error('stale'); throw error; }
      return event;
    },
    respond(id, result, expected) { this.getApproval(id, expected); pending.delete(id); sent.push({ id, result }); return expected; },
  };
}

async function pipeline(t) {
  const dataDir = await fs.mkdtemp(path.join(os.tmpdir(), 'routine-approvals-'));
  t.after(() => fs.rm(dataDir, { recursive: true, force: true }));
  let state = [], clock = Date.UTC(2026, 9, 17, 9), launches = [];
  const routines = createLocalRoutines({ getState: () => state, commit: value => { state = structuredClone(value); }, dataDir,
    approveFolder: value => value, captureOptions: async () => ({ coreId: 'fixture', model: 'm', effort: null, permission: 'ask', networkAccess: false }),
    launch: async (task, { attach }) => { const threadId = `${task.id}-run-${launches.length}`; launches.push(threadId); attach(threadId); return { turnId: `${threadId}-turn` }; },
    now: () => clock, setTimer: () => 1, clearTimer: () => {} });
  t.after(() => routines.dispose());
  const sessionMetadata = {}, threadMetadata = {};
  const approvals = createRoutineApprovals({ routines, metadata: id => sessionMetadata[id], root: id => threadMetadata[id]?.cwd });
  const create = (patch) => routines.request({ action: 'create', kind: 'code', name: 'Nightly', prompt: 'Run the tests.', cron: '0 3 * * *', folder: dataDir, ...patch });
  // A Run now: the session belongs to the task (routine-runner setSessionMetadata) and starts in `root`.
  const run = async (task, root = ROOT) => {
    const record = await routines.request({ action: 'run', id: task.id });
    sessionMetadata[record.threadId] = { scheduledTaskId: task.id };
    threadMetadata[record.threadId] = { cwd: root };
    return record;
  };
  const finish = (record) => routines.observe({ method: 'turn/completed', params: { threadId: record.threadId, turn: { id: record.turnId, status: 'completed' } } });
  const rows = () => routines.list('code');
  return { routines, approvals, create, run, finish, rows, sessionMetadata, threadMetadata };
}

test('"Allow for this session" on a run keeps the rule; a later run of the same task is answered accept, nothing wider', async t => {
  const f = await pipeline(t), owner = fakeOwner();
  const task = await f.create();
  const first = await f.run(task);
  const ask = (id, params = {}, threadId = first.threadId, turnId = first.turnId) => owner.ask(command({ id }, { threadId, turnId, ...params }));
  // No rule yet: the card shows (receive leaves it to the renderer).
  const card = ask(1);
  assert.equal(f.approvals.receive(card, owner, respondToApproval), false);
  assert.deepEqual(owner.pending(), [1]);
  // The user answers "Allow for this session": the core gets acceptForSession, the task keeps the exact command.
  const answer = f.approvals.respond(owner, { id: 1, expected: card.bridgeApproval, decision: 'acceptForSession' }, respondToApproval);
  assert.equal(answer.ok, true);
  assert.deepEqual(owner.sent.at(-1), { id: 1, result: { decision: 'acceptForSession' } });
  assert.deepEqual(f.rows()[0].approvedPermissions.map(({ approvedAt, ...rule }) => rule), [{ toolName: 'Bash', ruleContent: 'npm test', cwd: '' }]);
  // "Allow once" and Deny store nothing.
  const once = ask(2, { command: 'npm run build' });
  f.approvals.respond(owner, { id: 2, expected: once.bridgeApproval, decision: 'accept' }, respondToApproval);
  const denied = ask(3, { command: 'rm -rf dist' });
  f.approvals.respond(owner, { id: 3, expected: denied.bridgeApproval, decision: 'decline' }, respondToApproval);
  assert.equal(f.rows()[0].approvedPermissions.length, 1);
  // A failed answer (a stale card) stores nothing.
  const stale = f.approvals.respond(owner, { id: 99, expected: { connectionId: 'c', instanceId: 'gone' }, decision: 'acceptForSession' }, respondToApproval);
  assert.equal(stale.ok, false);
  f.finish(first);

  // The next run: the same command in the same folder is answered "accept" (this call only) before any card.
  const second = await f.run(task);
  const again = ask(10, {}, second.threadId, second.turnId);
  assert.equal(f.approvals.receive(again, owner, respondToApproval), true);
  assert.deepEqual(owner.sent.at(-1), { id: 10, result: { decision: 'accept' } });
  assert.equal(owner.pending().includes(10), false);
  // Anything else still asks: another command, a prefix of it, another folder, an escalation, a file change.
  for (const [id, params, method] of [[11, { command: 'npm test -- --watch' }], [12, { command: 'npm' }], [13, { cwd: `${ROOT}/pkg` }],
    [14, { reason: 'Needs danger-full-access' }], [15, {}, 'item/fileChange/requestApproval'], [16, { sessionGrantable: false }]]) {
    const event = owner.ask({ ...command({ id }, { threadId: second.threadId, turnId: second.turnId, ...params }), ...(method && { method }) });
    assert.equal(f.approvals.receive(event, owner, respondToApproval), false, JSON.stringify(params));
  }
  // Another turn of the run's session (once its turn is known), a finished run, another session, a non-request event.
  assert.equal(f.approvals.receive(ask(20, {}, second.threadId, 'other-turn'), owner, respondToApproval), false);
  f.finish(second);
  assert.equal(f.approvals.receive(ask(21, {}, second.threadId, second.turnId), owner, respondToApproval), false, 'the user continuing the session');
  assert.equal(f.approvals.receive(ask(22, {}, 'interactive-thread', 't'), owner, respondToApproval), false);
  assert.equal(f.approvals.receive({ kind: 'notification', method: 'turn/started', params: { threadId: second.threadId } }, owner, respondToApproval), false);
  // "Allow for this session" after the run finished is the session's own grant only.
  const later = ask(23, { command: 'git status' }, second.threadId, second.turnId);
  f.approvals.respond(owner, { id: 23, expected: later.bridgeApproval, decision: 'acceptForSession' }, respondToApproval);
  assert.equal(f.rows()[0].approvedPermissions.length, 1);

  // Another task with the same command, in a run of its own, does not share the rule.
  const other = await f.create({ name: 'Other' });
  const otherRun = await f.run(other);
  assert.equal(f.approvals.receive(ask(30, {}, otherRun.threadId, otherRun.turnId), owner, respondToApproval), false);
  // A session that names a task it is not a run of does not borrow its rule.
  f.sessionMetadata[otherRun.threadId] = { scheduledTaskId: task.id };
  assert.equal(f.approvals.receive(ask(31, {}, otherRun.threadId, otherRun.turnId), owner, respondToApproval), false);
  f.finish(otherRun);

  // Removing the rule (the detail's chip) asks again on the next run.
  await f.routines.request({ action: 'remove-approval', id: task.id, toolName: 'Bash', ruleContent: 'npm test' });
  const third = await f.run(task);
  assert.equal(f.approvals.receive(ask(40, {}, third.threadId, third.turnId), owner, respondToApproval), false);
});

test('a worktree run matches by the folder relative to its own root; a failed answer leaves the card', async t => {
  const f = await pipeline(t), owner = fakeOwner();
  const task = await f.create({ useWorktree: true });
  const first = await f.run(task, '/work/.worktrees/run-1');
  const card = owner.ask(command({ id: 1 }, { threadId: first.threadId, turnId: first.turnId, cwd: '/work/.worktrees/run-1/web', reason: 'Needs workspace-write' }));
  f.approvals.respond(owner, { id: 1, expected: card.bridgeApproval, decision: 'acceptForSession' }, respondToApproval);
  assert.deepEqual(f.rows()[0].approvedPermissions.map(({ approvedAt, ...rule }) => rule), [{ toolName: 'Bash', ruleContent: 'npm test', cwd: 'web', escalation: 'workspace-write' }]);
  f.finish(first);
  const second = await f.run(task, '/work/.worktrees/run-2');
  const match = command({ id: 2 }, { threadId: second.threadId, turnId: second.turnId, cwd: '/work/.worktrees/run-2/web', reason: 'Needs workspace-write: run the tests' });
  // The core's request is gone before the answer (a stale identity): receive reports it unanswered and the card shows.
  assert.equal(f.approvals.receive(match, owner, respondToApproval), false);
  owner.ask(match);
  assert.equal(f.approvals.receive(match, owner, respondToApproval), true);
  assert.deepEqual(owner.sent.at(-1), { id: 2, result: { decision: 'accept' } });
  // The old worktree's path is outside the new run's root.
  const outside = owner.ask(command({ id: 3 }, { threadId: second.threadId, turnId: second.turnId, cwd: '/work/.worktrees/run-1/web', reason: 'Needs workspace-write' }));
  assert.equal(f.approvals.receive(outside, owner, respondToApproval), false);
});

test('main.cjs answers covered requests before any observer or window sees them, and records from the card answer', async () => {
  const main = await fs.readFile(new URL('../electron/main.cjs', import.meta.url), 'utf8');
  const once = (needle) => { assert.equal(main.split(needle).length - 1, 1, needle); return main.indexOf(needle); };
  const receive = once('function receive(e) {\n  e = withAppToolImages(e);\n');
  const hook = once('  if (routineApprovals?.receive(e, client, respondToApproval)) return;\n');
  assert.ok(hook > receive && hook < main.indexOf('nativeSideChat.observe(e)', receive), 'first thing receive does');
  once('return routineApprovals ? routineApprovals.respond(client, p, respondToApproval) : respondToApproval(client, p);');
  const created = once('routineApprovals = createRoutineApprovals({ routines: localRoutines,');
  assert.ok(created > once('  localRoutines = createLocalRoutines({'));
  once("metadata: id => config.sessionMetadata?.[id], root: id => config.threadMetadata?.[id]?.cwd });");
  // The renderer's local-routines channel can remove a rule but has no way to add one.
  const routines = await fs.readFile(new URL('../electron/local-routines.mjs', import.meta.url), 'utf8');
  assert.equal(routines.split("p.action === 'remove-approval'").length - 1, 1);
  assert.equal(/p\.action === '(add|remember)-approval'/.test(routines), false);
});

// The real CodexClient ledger over an in-memory connection (no child process): the answer is sent from inside the
// request's own event, and the windows' approval state (approval-state.js) never holds the covered request.
test('a covered request is answered on the wire from inside its own event; windows never hold its card', async t => {
  const { CodexClient } = require('../electron/codex.cjs');
  const { emptyApprovalTransport, reduceApprovalTransport } = await import('../src/approval-state.js');
  const f = await pipeline(t);
  const task = await f.create();
  const record = await f.run(task);
  f.routines.rememberApproval(task.id, { toolName: 'Bash', ruleContent: 'npm test', cwd: '' });
  const client = new CodexClient(), written = [], windows = [];
  const connection = { approvalConnectionId: 'conn', approvalConnectionEpoch: 1, closed: false, child: { stdin: { writable: true, write: (line) => written.push(JSON.parse(line)) } } };
  client.connection = connection;
  // main.cjs receive: the hook first, then every other observer and the windows.
  client.on('event', (e) => { if (f.approvals.receive(e, client, respondToApproval)) return; windows.push(e); });
  client.approvalLedger.activate(connection);
  const ask = (id, commandLine) => client.receive({ id, method: COMMAND_APPROVAL,
    params: { kind: 'command', threadId: record.threadId, turnId: record.turnId, itemId: `call-${id}`, command: commandLine, cwd: ROOT, sessionGrantable: true } }, connection);
  ask(5, 'npm test');
  assert.deepEqual(written, [{ id: 5, result: { decision: 'accept' } }]);
  assert.equal(client.approvalSnapshot().pending.length, 0);
  assert.equal(windows.some((e) => e.kind === 'request'), false);
  ask(6, 'npm publish');
  assert.equal(written.length, 1, 'an uncovered command waits for the card');
  const state = windows.reduce((value, e) => reduceApprovalTransport(value, e) ?? value, emptyApprovalTransport);
  assert.deepEqual(state.approvals.map((request) => request.id), [6]);
});
