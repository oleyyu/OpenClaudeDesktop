// w13-coworkfn-approvals (research/w13-coworkfn.md §1.5 O-37~O-41, cwf-31/32/33; the deletes of O-24 and the scheduled
// run's folder grant of O-38): electron/cowork-runtime/approval-policy.mjs and its main.cjs hooks. The official copy is
// checked against the 3.6556.2 snapshot's raw chunks (read as text, never run).
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';
import * as policy from '../electron/cowork-runtime/approval-policy.mjs';
import * as cowork from '../electron/agent-tools/cowork.mjs';
import { createCoworkStorage } from '../electron/cowork-runtime/core-cowork.mjs';
import { sessionGrants } from '../electron/cowork-runtime/folder-policy.mjs';
import { threadPermissionParams, turnPermissionParams } from '../electron/permission-policy.mjs';
import { createLocalRoutines } from '../electron/local-routines.mjs';
import { COMMAND_APPROVAL, createRoutineApprovals } from '../electron/routine-approvals.mjs';

const require = createRequire(import.meta.url);
const { approvalResponse, respondToApproval } = require('../electron/respond-approval.cjs');
const APP = new URL('..', import.meta.url).pathname;
const SNAPSHOT = path.join(APP, '../reference/snapshots/claude-3.6556.2-20261025-192807');
const DL8 = fs.readFileSync(path.join(SNAPSHOT, 'asar/.vite/build/index.chunk-Dl8NPgw7.js'), 'utf8');
const JPK = fs.readFileSync(path.join(SNAPSHOT, 'asar/.vite/build/index.chunk-jPKPzV-P.js'), 'utf8');
const RENDERER_EVENTS = fs.readFileSync(path.join(SNAPSHOT, 'ion-dist/assets/v1/ce401cf8e-Bd3DKyj0.js'), 'utf8');
const MAIN = fs.readFileSync(path.join(APP, 'electron/main.cjs'), 'utf8');
const once = (needle) => { assert.equal(MAIN.split(needle).length - 1, 1, needle); return MAIN.indexOf(needle); };
const tmp = (prefix) => fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), prefix)));

test('official copy: V7t, B7t, the deny-with-feedback prefix, the deny sentence and the always-ask set (jPK G9t)', () => {
  assert.ok(JPK.includes(`V7t="${policy.MANAGED_ASK_REASON}"`));
  assert.ok(JPK.includes(`B7t="${policy.ORG_POLICY_REASON}"`));
  assert.ok(JPK.includes(`IQe=\`${policy.REJECT_FEEDBACK_PREFIX.replace('\n', '\\n')}\``));
  assert.ok(JPK.includes('Object.defineProperty(exports,"C5",{enumerable:!0,get:function(){return IQe}})'));
  // G9t = W9t (delete, directory, launch, save_skill) + the scheduled-tasks writes and watches.
  assert.ok(JPK.includes('W9t=[S7t,Cw,E7t,O7t,...Q7t],G9t=new Set([...W9t,mw,hw,x5t,T5t,E5t])'));
  assert.ok(JPK.includes('Q7t=[]'));
  for (const [binding, name] of [['Cw', 'request_cowork_directory'], ['S7t', 'allow_cowork_file_delete'], ['E7t', 'launch_code_session'], ['O7t', 'save_skill']]) {
    assert.ok(new RegExp(`[,;]${binding}=\`mcp__\\$\\{xw\\}__\\$\\{[\\w$]+\\}\``).test(JPK) || JPK.includes(`${binding}=\`mcp__\${xw}__\${`), binding);
    assert.ok(policy.MANAGED_ASK_TOOLS.includes(name));
  }
  for (const [binding, name] of [['mw', 'create_scheduled_task'], ['hw', 'update_scheduled_task'], ['x5t', 'delete_scheduled_task'], ['T5t', 'start_watching'], ['E5t', 'stop_watching']]) {
    assert.ok(JPK.includes(`${binding}=\`\${pw}${name}\``), binding);
    assert.ok(policy.MANAGED_ASK_TOOLS.includes(name));
  }
  assert.equal(policy.MANAGED_ASK_TOOLS.length, 9);
  assert.equal(policy.isManagedAskTool('run_scheduled_task'), false, 'run_scheduled_task (C5t) is not in G9t');
  assert.ok(JPK.includes('permissionDecision:"ask",permissionDecisionReason:t.OY') || DL8.includes('permissionDecision:"ask",permissionDecisionReason:t.OY'));
  // Dl8 respondToToolPermission's deny, and kOi / AOi.
  assert.ok(DL8.includes('c=typeof a=="string"&&a?`${t.C5}${a}`'));
  assert.ok(DL8.includes('`User rejected ${[t.Jh(i.toolName),t.qh(i.input)].filter(Boolean).join(" ")}. Please acknowledge this and suggest alternative approaches.`'));
  assert.ok(JPK.includes('function kOi(e){return{Bash:"running",Read:"reading",Write:"writing to",Edit:"editing",Glob:"searching",Grep:"searching",Task:"running task",ExitPlanMode:"the plan"}[e]||(e?`using ${e}`:"using")}'));
  assert.ok(JPK.includes('function AOi(e){return e.command?`command: ${e.command}`:e.file_path?`file: ${e.file_path}`:e.path?`path: ${e.path}`:e.pattern?`pattern: ${e.pattern}`:e.url?`url: ${e.url}`:""}'));
  // O-38: the always answer never stores a G9t tool's permission; the folder request of a scheduled run goes on its task.
  assert.ok(DL8.includes('...!t.WZ(i.toolName)&&e&&!this.answerStoresNothingLasting(i,o)&&{updatedPermissions:'));
  assert.ok(DL8.includes('if(e.toolName===t.IX){let n=e.input._hostPathForRequestDirectoryTool;e.isExternal!==!0&&r.scheduledTaskId&&typeof n=="string"&&t._s.addUserSelectedFolder(r.scheduledTaskId,n);return}'));
  // O-41: the clamp event and the two notices the renderer words for it.
  assert.ok(DL8.includes('this.emit("event",{type:"permission_mode_clamped",sessionId:e.sessionId,permissionMode:a})'));
  assert.ok(RENDERER_EVENTS.includes('"Bypass permissions isn\\u2019t available for this session. Asking for permissions instead.",id:"L3SmTmhYss"'));
  assert.ok(RENDERER_EVENTS.includes('"Auto mode isn\\u2019t available for this session. Asking for permissions instead.",id:"WO7zv5DRWf"'));
});

test('managedAsk: bare and mcp__ names, a request that names its tool or says it always asks', () => {
  assert.equal(policy.isManagedAskTool('mcp__cowork__request_cowork_directory'), true);
  assert.equal(policy.isManagedAskTool('mcp__scheduled-tasks__create_scheduled_task'), true);
  assert.equal(policy.isManagedAskTool('present_files'), false);
  assert.equal(policy.managedAsk({ kind: 'terminal-command', tool: 'save_skill' }), true);
  assert.equal(policy.managedAsk({ kind: 'terminal-command', managedAsk: true }), true);
  assert.equal(policy.managedAsk({ kind: 'terminal-command', tool: 'Bash' }), false);
  assert.equal(policy.managedAsk(null), false);
});

test('decisions: once / always / scheduled / deny → accept / acceptForSession / decline (+ feedback on a decline only)', () => {
  assert.deepEqual(policy.decisionToCore('once'), { decision: 'accept' });
  assert.deepEqual(policy.decisionToCore('always'), { decision: 'acceptForSession' });
  assert.deepEqual(policy.decisionToCore('scheduled'), { decision: 'acceptForSession' });
  assert.deepEqual(policy.decisionToCore('deny', { feedback: '  use the copy  ' }), { decision: 'decline', feedback: 'use the copy' });
  assert.deepEqual(policy.decisionToCore('deny', { feedback: '   ' }), { decision: 'decline' });
  assert.deepEqual(policy.decisionToCore('once', { feedback: 'ignored' }), { decision: 'accept' });
  assert.deepEqual(policy.decisionToCore('acceptForSession'), { decision: 'acceptForSession' });
  assert.equal(policy.decisionToCore('maybe'), null);
  assert.deepEqual(policy.COWORK_DECISIONS, ['accept', 'acceptForSession', 'decline']);
});

test('rejectionMessage: the official deny sentence, or the feedback after the C5 prefix', () => {
  assert.equal(policy.rejectionMessage('Bash', { command: 'rm -rf build' }), 'User rejected running command: rm -rf build. Please acknowledge this and suggest alternative approaches.');
  assert.equal(policy.rejectionMessage('Write', { file_path: '/w/a.md' }), 'User rejected writing to file: /w/a.md. Please acknowledge this and suggest alternative approaches.');
  assert.equal(policy.rejectionMessage('mcp__x__y', {}), 'User rejected using mcp__x__y. Please acknowledge this and suggest alternative approaches.');
  assert.equal(policy.rejectionMessage('Write', { file_path: '/w/a.md' }, ' Save it under drafts/ '), `${policy.REJECT_FEEDBACK_PREFIX}Save it under drafts/`);
});

test('clampMode: Chat asks; Cowork on a core with no sandbox asks (Plan stays); the notice only for Bypass and Auto', () => {
  assert.deepEqual(policy.clampMode('chat', 'bypass'), { permissionMode: 'default', clamped: { type: 'permission_mode_clamped', permissionMode: 'bypassPermissions' } });
  assert.deepEqual(policy.clampMode('cowork', 'auto', { sandbox: false }), { permissionMode: 'default', clamped: { type: 'permission_mode_clamped', permissionMode: 'auto' } });
  assert.deepEqual(policy.clampMode('cowork', 'acceptEdits', { sandbox: false }), { permissionMode: 'default', clamped: null });
  assert.deepEqual(policy.clampMode('cowork', 'plan', { sandbox: false }), { permissionMode: 'plan', clamped: null });
  assert.deepEqual(policy.clampMode('cowork', 'bypassPermissions', { sandbox: true }), { permissionMode: 'bypassPermissions', clamped: null });
  assert.deepEqual(policy.clampMode('cowork', 'auto', {}), { permissionMode: 'auto', clamped: null });
  assert.deepEqual(policy.clampMode('code', 'bypass', { sandbox: false }), { permissionMode: 'bypassPermissions', clamped: null });
});

test('clampCoworkRequest: a sandboxless core gets Ask permissions for every mode but Plan; a sandboxed one is left as asked', () => {
  const turn = (permission, hints = false) => ({ threadId: 't', ...turnPermissionParams({ permission, mode: 'cowork', cwd: '/h', hints }) });
  const bypass = turn('bypass');
  assert.equal(policy.clampCoworkRequest('turn/start', bypass, { sandboxed: false }), 'bypassPermissions');
  assert.equal(bypass.approvalPolicy, 'untrusted');
  assert.equal(bypass.sandboxPolicy.type, 'workspaceWrite');
  const auto = turn('auto', true);
  assert.equal(policy.clampCoworkRequest('turn/start', auto, { sandboxed: false }), 'auto');
  assert.equal(auto.codeDesktop.permissionMode, 'ask');
  // Accept edits names itself to a core with permission hints (without them it is Auto's on-request: auto).
  const edits = turn('acceptEdits', true);
  assert.equal(policy.clampCoworkRequest('turn/start', edits, { sandboxed: false }), null, 'no notice the official app words');
  assert.equal(edits.approvalPolicy, 'untrusted');
  for (const [permission, sandboxed] of [['plan', false], ['ask', false], ['bypass', true], ['bypass', null], ['auto', null]]) {
    const params = turn(permission), before = structuredClone(params);
    assert.equal(policy.clampCoworkRequest('turn/start', params, { sandboxed }), null, `${permission} ${sandboxed}`);
    assert.deepEqual(params, before);
  }
  const start = threadPermissionParams({ permission: 'bypass', mode: 'cowork' });
  assert.equal(policy.clampCoworkRequest('thread/start', start, { sandboxed: false }), null, 'the turn says so, not the start');
  assert.deepEqual([start.sandbox, start.approvalPolicy], ['workspace-write', 'untrusted']);
  assert.equal(policy.clampCoworkRequest('thread/resume', turn('bypass'), { sandboxed: false }), null);
});

function ledger(requests) {
  const answered = new Set();
  return {
    answered,
    getApproval(id) { if (answered.has(id) || !requests[id]) throw new Error('This approval is no longer pending.'); return requests[id]; },
  };
}

test('coworkRespondPayload: official answers become the core’s; feedback a core can’t take follows the decline as a steer', () => {
  const requests = {
    codex: { method: 'item/commandExecution/requestApproval', params: { threadId: 'cw', turnId: 'turn-1', command: 'ls' } },
    bridge: { method: 'item/fileChange/requestApproval', params: { threadId: 'cw', turnId: 'turn-1', codeDesktop: { declineFeedback: true } } },
    code: { method: 'item/commandExecution/requestApproval', params: { threadId: 'code', turnId: 'turn-2' } },
    question: { method: 'item/tool/requestUserInput', params: { threadId: 'cw', turnId: 'turn-1', questions: [] } },
  };
  const owner = ledger(requests), steered = [], later = [];
  const options = { cowork: (id) => id === 'cw', steer: (q) => steered.push(q), later: (fn) => later.push(fn) };
  assert.deepEqual(policy.coworkRespondPayload(owner, { id: 'codex', expected: {}, decision: 'always' }, options), { id: 'codex', expected: {}, decision: 'acceptForSession' });
  assert.deepEqual(policy.coworkRespondPayload(owner, { id: 'codex', expected: {}, decision: 'once' }, options), { id: 'codex', expected: {}, decision: 'accept' });
  assert.deepEqual(policy.coworkRespondPayload(owner, { id: 'bridge', expected: {}, decision: 'deny', feedback: 'no' }, options), { id: 'bridge', expected: {}, decision: 'decline', feedback: 'no' });
  // Codex: a plain decline, then the words in the same turn once the decline left.
  assert.deepEqual(policy.coworkRespondPayload(owner, { id: 'codex', expected: {}, decision: 'decline', feedback: ' Use drafts/ ' }, options), { id: 'codex', expected: {}, decision: 'decline' });
  assert.equal(later.length, 1);
  later.shift()();
  assert.equal(steered.length, 0, 'still pending: the decline was not sent');
  policy.coworkRespondPayload(owner, { id: 'codex', expected: {}, decision: 'deny', feedback: 'Use drafts/' }, options);
  owner.answered.add('codex');
  later.shift()();
  assert.deepEqual(steered, [{ threadId: 'cw', expectedTurnId: 'turn-1', input: [{ type: 'text', text: 'Use drafts/', text_elements: [] }] }]);
  // Not a Cowork session, not a command or file request, the core's own answers: unchanged.
  for (const p of [{ id: 'code', expected: {}, decision: 'always' }, { id: 'question', expected: {}, decision: 'deny' }, { id: 'bridge', expected: {}, decision: 'accept' },
    { id: 'codex', expected: {}, decision: 'accept', feedback: 'x' }, { id: 'codex', expected: {}, decisionIndex: 0 }, { id: 'gone', expected: {}, decision: 'once' }])
    assert.equal(policy.coworkRespondPayload(owner, p, options), p);
});

test('coworkCardOptions: Cowork cards take feedback (the C5 result); a scheduled run’s folder request may be allowed for its task', async () => {
  const folderTitle = 'Claude would like to add this folder to the session:';
  assert.equal(cowork.CARDS.folderTitle, folderTitle);
  const off = policy.coworkCardOptions({ kind: 'other' }, { cowork: false });
  assert.deepEqual([off.cowork, off.declineFeedback, off.task], [false, false, null]);
  const directory = { kind: 'other', title: folderTitle, detail: '/Users/me/Reports', cwd: '/Users/me/Reports' };
  const grants = [];
  const grantFolders = async (...args) => { grants.push(args); };
  const run = policy.coworkCardOptions(directory, { cowork: true, task: () => ({ id: 'weekly', kind: 'cowork' }), folderTitle });
  assert.deepEqual([run.cowork, run.declineFeedback, run.task?.id], [true, true, 'weekly']);
  await run.settle({ result: { decision: 'accept' }, approved: true, grantFolders });
  assert.equal(grants.length, 0, 'once: this run only');
  await run.settle({ result: { decision: 'acceptForSession' }, approved: true, grantFolders });
  assert.deepEqual(grants, [['weekly', ['/Users/me/Reports'], { addOnly: true }]]);
  await assert.rejects(run.settle({ result: { decision: 'decline', codeDesktop: { feedback: ' not that one ' } }, approved: false, grantFolders }),
    { message: `${policy.REJECT_FEEDBACK_PREFIX}not that one` });
  await run.settle({ result: { decision: 'decline' }, approved: false, grantFolders });
  // Not a scheduled run, another card, a request naming its tool.
  assert.equal(policy.coworkCardOptions(directory, { cowork: true, task: () => null, folderTitle }).task, null);
  assert.equal(policy.coworkCardOptions({ ...directory, title: 'Allow Claude to permanently delete files…' }, { cowork: true, task: () => ({ id: 'weekly' }), folderTitle }).task, null);
  assert.equal(policy.coworkCardOptions({ kind: 'other', tool: 'request_cowork_directory', cwd: '/x', detail: 'x' }, { cowork: true, task: () => ({ id: 'weekly' }) }).task.id, 'weekly');
  assert.equal(policy.coworkCardOptions(directory, { cowork: true, task: () => ({ id: 'deploy', kind: 'code' }), folderTitle }).task, null);
  // respond-approval.cjs passes a card's feedback back only where the card offers it.
  const card = { method: 'item/commandExecution/requestApproval', params: { codeDesktop: { agentTool: { kind: 'other' }, declineFeedback: run.declineFeedback } } };
  assert.deepEqual(approvalResponse(card, { decision: 'decline', feedback: ' not that one ' }), { decision: 'decline', codeDesktop: { feedback: 'not that one' } });
});

test('delete targets: rm / rmdir / unlink / git rm / find -delete, globs to their folder, unknown targets', () => {
  const home = '/Users/me';
  assert.deepEqual(policy.commandDeleteTargets("/bin/zsh -lc 'rm -rf build ~/Reports/*.tmp'", '/h', { home }), { targets: ['/h/build', '/Users/me/Reports'], unknown: false });
  assert.deepEqual(policy.commandDeleteTargets('git rm -- "a b.txt" && find /w/cache -name x -delete', '/w', { home }), { targets: ['/w/a b.txt', '/w/cache'], unknown: false });
  assert.deepEqual(policy.commandDeleteTargets('rm "$TARGET"', '/w', { home }), { targets: [], unknown: true });
  assert.deepEqual(policy.commandDeleteTargets('sudo rm -f /w/x; unlink /w/y', '/w', { home }), { targets: ['/w/x', '/w/y'], unknown: false });
  for (const command of ['ls -la', 'echo rm', 'npm run format', 'cat rmfile', 'grep -r confirm .'])
    assert.deepEqual(policy.commandDeleteTargets(command, '/w', { home }), { targets: [], unknown: false }, command);
  assert.deepEqual(policy.changeDeleteTargets([{ path: '/w/a', kind: { type: 'delete' } }, { path: '/w/b', kind: { type: 'update' } }, { path: 'c', kind: 'delete' }], '/w'), { targets: ['/w/a', '/w/c'], unknown: false });
  assert.deepEqual(policy.deniedDelete({ targets: ['/w/a'] }, { grants: ['/w'], allowed: () => false }), { target: '/w/a', folder: '/w' });
  assert.equal(policy.deniedDelete({ targets: ['/w/a'] }, { grants: ['/w'], allowed: () => true }), null);
  assert.deepEqual(policy.deniedDelete({ targets: ['/'] }, { grants: ['/w'], allowed: () => true }), { target: '/', folder: '/w' }, 'a folder holding a connected one');
  assert.equal(policy.deniedDelete({ targets: ['/outputs/x'] }, { grants: ['/w'], allowed: () => false }), null);
  assert.deepEqual(policy.deniedDelete({ targets: [], unknown: true }, { grants: ['/w'], allowed: () => false }), { target: null, folder: '/w' });
  assert.equal(policy.deniedDelete({ targets: [], unknown: true }, { grants: [], allowed: () => false }), null);
});

test('the delete guard: a Cowork delete in a connected folder without permission is declined before any card', async () => {
  const userData = tmp('w13-cowork-approvals-');
  const folder = tmp('w13-cowork-folder-');
  const storage = await createCoworkStorage(userData);
  const meta = { surface: 'cowork', engine: 'local-core', cowork: { storage: storage.id, folders: [folder] } };
  const sessions = { cw: meta };
  const guard = policy.createCoworkDeleteGuard({ meta: (id) => sessions[id] ?? null,
    grants: (m) => sessionGrants(m, { userData }), allowed: (m, file) => cowork.deleteAllowed(m, file, { userData }) });
  const answers = [];
  const respond = (owner, p) => { answers.push(p); return { ok: true }; };
  const request = (id, method, params) => ({ kind: 'request', id, method, params: { threadId: 'cw', turnId: 't', ...params }, bridgeApproval: { connectionId: 'c', instanceId: id } });
  assert.equal(guard.receive(request('1', 'item/commandExecution/requestApproval', { command: `rm -rf ${folder}/old`, cwd: storage.hostCwd }), {}, respond), true);
  assert.deepEqual(answers.at(-1), { id: '1', expected: { connectionId: 'c', instanceId: '1' }, decision: 'decline' });
  // The outputs folder, host-cwd and the card of a command that deletes nothing go on to the card.
  for (const command of [`rm ${storage.outputs}/draft.md`, 'rm scratch.txt', `ls ${folder}`])
    assert.equal(guard.receive(request('2', 'item/commandExecution/requestApproval', { command, cwd: storage.hostCwd }), {}, respond), false, command);
  // A file change the core asks to apply: its changes come with the item.
  guard.receive({ kind: 'notification', method: 'item/started', params: { threadId: 'cw', item: { type: 'fileChange', id: 'fc', changes: [{ path: path.join(folder, 'a.md'), kind: { type: 'delete' } }] } } }, {}, respond);
  assert.equal(guard.receive(request('3', 'item/fileChange/requestApproval', { itemId: 'fc' }), {}, respond), true);
  // Once allow_cowork_file_delete opened the folder, the request shows its card as before.
  meta.cowork.deleteFolders = [folder];
  assert.equal(guard.receive(request('4', 'item/commandExecution/requestApproval', { command: `rm -rf ${folder}/old`, cwd: storage.hostCwd }), {}, respond), false);
  assert.equal(guard.receive(request('5', 'item/fileChange/requestApproval', { itemId: 'fc' }), {}, respond), false);
  // Another session, the app's own cards, a turn's end forgets its changes.
  delete meta.cowork.deleteFolders;
  assert.equal(guard.receive({ ...request('6', 'item/commandExecution/requestApproval', { command: `rm ${folder}/x` }), params: { threadId: 'code', command: `rm ${folder}/x` } }, {}, respond), false);
  assert.equal(guard.receive({ ...request('code-desktop-x', 'item/commandExecution/requestApproval', { command: `rm ${folder}/x` }) }, {}, respond), false);
  guard.receive({ kind: 'notification', method: 'turn/completed', params: { threadId: 'cw', turn: { id: 't' } } }, {}, respond);
  assert.equal(guard.receive(request('7', 'item/fileChange/requestApproval', { itemId: 'fc' }), {}, respond), false);
  assert.equal(answers.length, 2);
  fs.rmSync(userData, { recursive: true, force: true }); fs.rmSync(folder, { recursive: true, force: true });
});

test('main.cjs: the hooks (Bypass, the Cowork card, the answer, the delete guard, the clamp), each once', () => {
  const ask = once('if (BYPASS_KINDS.has(request?.kind) && typeof session?.id === "string" && !require("./cowork-runtime/approval-policy.mjs").managedAsk(request)) {');
  assert.ok(ask > once('async function agentToolAsk(session, request, options = {}) {'));
  assert.doesNotMatch(MAIN.match(/const BYPASS_KINDS = new Set\(\[([^\]]*)\]\)/)[1], /"other"/, 'the always-ask tools’ cards (other) never skip in Bypass');
  const card = once('const coworkCard = require("./cowork-runtime/approval-policy.mjs").coworkCardOptions(request, { cowork: config?.sessionMetadata?.[session.id]?.surface === "cowork",');
  assert.ok(card > once('async function agentToolCard(session, request = {}, { signal, call } = {}) {'));
  assert.ok(once('CARDS.folderTitle) : null, session: session.id });') > card);
  // 复核修复: the card is shown with coworkCard.signal (a repeated WebFetch card supersedes the waiting one).
  assert.ok(once('const result = await owner.localApproval("item/commandExecution/requestApproval", params, { signal: coworkCard.signal(signal), outlivesTurn:') > card);
  once('|| kind === "web-fetch" || !!coworkCard.task, codeDesktop: { agentTool: tool, ...(coworkCard.declineFeedback ? { declineFeedback: true } : {}) },');
  once('if (coworkCard.cowork) await coworkCard.settle({ result, approved, grantFolders: (id, dirs, options) => localRoutines.grantFolders(id, dirs, options) });');
  const answer = once('p = require("./cowork-runtime/approval-policy.mjs").coworkRespondPayload(client, p, {');
  assert.ok(answer < once('return routineApprovals ? routineApprovals.respond(client, p, respondToApproval) : respondToApproval(client, p);'));
  const guard = once('if ((coworkDeleteGuard ??= require("./cowork-runtime/approval-policy.mjs").createCoworkDeleteGuard({');
  // 复核修复: ahead of the task rules' auto-accept (a Cowork task's run keeps rules too), which never open a folder's deletes.
  assert.ok(guard > once('function receive(e) {') && guard < once('  if (routineApprovals?.receive(e, client, respondToApproval)) return;\n'));
  once('let coworkDeleteGuard = null;');
  const clamp = once('const clamped = require("./cowork-runtime/approval-policy.mjs").clampCoworkRequest(p.method, params, { sandboxed: require("./core-registry.mjs").coreSandboxed(client?.serverInfo ?? null)');
  once('if (clamped) emit({ kind: "permission-mode-clamped", threadId: params.threadId, permissionMode: clamped }); }');
  assert.ok(clamp > MAIN.indexOf('await coworkFolderGrants.takeStartFolders(params') && clamp < MAIN.indexOf('coworkStart = await cowork.createCoworkStorage(app.getPath("userData"));'));
});

// ── 复核修复 (reports/W13/w13-coworkfn-approvals.review.md 问题 1–3) ──

test('delete targets: only where a command starts, never an argument or a quoted string (复核修复 1)', () => {
  const home = '/Users/x';
  const none = { targets: [], unknown: false };
  // The review's three misreads: rm / trash as another command's argument or inside a quoted message.
  for (const command of ['git commit -m "rm old notes"', 'grep -n rm src', 'cat notes.txt | grep trash list', "echo 'a; rm b'", 'echo "a && rm b"',
    'npm run rm', 'ls rm', 'cat <<EOF > notes.md\nrm x\nEOF\nls', 'git rm --cached tracked.txt', 'man rm', 'which trash'])
    assert.deepEqual(policy.commandDeleteTargets(command, '/Users/x/Docs', { home }), none, command);
  // Where a command starts: line start, after ; && || | & ( and newlines, after sudo / env / xargs / command / nohup …,
  // git rm, find -delete or -exec rm, a shell's -c script, eval, $(…), a here-document a shell reads.
  const cases = [
    ['rm old', ['/Users/x/Docs/old']], ['ls; rm a', ['/Users/x/Docs/a']], ['make || rm -f b', ['/Users/x/Docs/b']], ['true&&rm c|tee log', ['/Users/x/Docs/c']],
    ['(rm d)', ['/Users/x/Docs/d']], ['ls\ntrash e', ['/Users/x/Docs/e']], ['sudo -u me rm f', ['/Users/x/Docs/f']], ['FOO=1 env BAR=2 nohup rm g', ['/Users/x/Docs/g']],
    ['git -C /Users/x/Repo rm h', ['/Users/x/Repo/h']], ['find . -name "*.o" -exec rm {} \;', ['/Users/x/Docs']], ["bash -c 'rm i'", ['/Users/x/Docs/i']],
    ['eval "rm j"', ['/Users/x/Docs/j']], ['echo $(rm k)', ['/Users/x/Docs/k']], ['bash <<EOF\nrm l\nEOF', ['/Users/x/Docs/l']],
    ['cd sub && rm m', ['/Users/x/Docs/sub/m']], ['rm n 2>/dev/null', ['/Users/x/Docs/n']], ['/bin/rm -- -o', ['/Users/x/Docs/-o']],
  ];
  for (const [command, targets] of cases) assert.deepEqual(policy.commandDeleteTargets(command, '/Users/x/Docs', { home }), { targets, unknown: false }, command);
  // A target no one can tell: $VAR, xargs input, a cd to somewhere unknown.
  for (const command of ['rm "$OLD"', 'ls | xargs rm', 'cd $DIR && rm p', 'rm $(cat list)'])
    assert.equal(policy.commandDeleteTargets(command, '/Users/x/Docs', { home }).unknown, true, command);
  // An argv runs as it is.
  assert.deepEqual(policy.commandDeleteTargets(['/bin/zsh', '-lc', 'rm q r'], '/Users/x/Docs', { home }), { targets: ['/Users/x/Docs/q', '/Users/x/Docs/r'], unknown: false });
  // The guard lets the review's commands through to their card (allowed false for every file).
  const deny = (command) => policy.deniedDelete(policy.commandDeleteTargets(command, '/Users/x/Docs', { home }), { grants: ['/Users/x/Docs'], allowed: () => false });
  for (const command of ['git commit -m "rm old notes"', 'grep -n rm src', 'cat notes.txt | grep trash list']) assert.equal(deny(command), null, command);
  assert.deepEqual(deny('rm old'), { target: '/Users/x/Docs/old', folder: '/Users/x/Docs' });
});

test('superseded: the same browser: / computer: / webfetch: request dismisses the waiting one (Dl8, 复核修复 3)', async () => {
  assert.ok(DL8.includes('if(r.startsWith("browser:")||r.startsWith("computer:")||r.startsWith("webfetch:")){let n=r.startsWith("webfetch:")?r:r.startsWith("browser:")?"browser:":"computer:",a=s??e,o=JSON.stringify(i);'));
  assert.ok(DL8.includes('s.toolName===r&&JSON.stringify(s.input)===o&&('));
  assert.ok(DL8.includes(`s.resolve({behavior:"deny",message:"${policy.SUPERSEDED_MESSAGE}"})`));
  // Dl8's WebFetch egress check asks as webfetch:<domain> with {domain, url}.
  assert.ok(DL8.includes('this.handleToolPermission(this.delegate.resolvePermissionSessionId(e),`webfetch:${t}`,{domain:t,url:n},'));
  assert.equal(policy.supersedeKey('s', 'Write', { file_path: 'a' }), null, 'other tools never');
  assert.equal(policy.supersedeKey(null, 'webfetch:a.com', {}), null);
  assert.equal(policy.supersedeKey('s', 'webfetch:a.com', { url: 'u' }), policy.supersedeKey('s', 'webfetch:a.com', { url: 'u' }));
  assert.notEqual(policy.supersedeKey('s', 'computer:click', { x: 1 }), policy.supersedeKey('t', 'computer:click', { x: 1 }));
  const tracker = policy.createSupersede(), dismissed = [];
  const first = tracker.claim('k', () => dismissed.push(1));
  tracker.claim('k', () => dismissed.push(2));
  first();
  assert.deepEqual(dismissed, [1]);
  assert.equal(tracker.size, 1, 'the older release leaves the newer one');
  // A Cowork session's WebFetch card (main.cjs agentToolCard): shown with coworkCard.signal; the dismissed one throws.
  const supersede = policy.createSupersede();
  const site = { kind: 'web-fetch', host: 'example.com', url: 'https://example.com/a' };
  const older = policy.coworkCardOptions(site, { cowork: true, session: 'cw', supersede });
  const olderSignal = older.signal(undefined);
  const newer = policy.coworkCardOptions(site, { cowork: true, session: 'cw', supersede });
  const newerSignal = newer.signal(new AbortController().signal);
  assert.equal(olderSignal.aborted, true);
  assert.equal(newerSignal.aborted, false);
  await assert.rejects(older.settle({ result: null, approved: false }), { message: policy.SUPERSEDED_MESSAGE });
  await newer.settle({ result: { decision: 'accept' }, approved: true });
  assert.equal(supersede.size, 0);
  // The turn's own stop still reaches the card; Code sessions and other cards keep their signal.
  const stop = new AbortController();
  const third = policy.coworkCardOptions(site, { cowork: true, session: 'cw', supersede });
  const thirdSignal = third.signal(stop.signal);
  stop.abort();
  assert.equal(thirdSignal.aborted, true);
  const passed = new AbortController().signal;
  assert.equal(policy.coworkCardOptions(site, { cowork: false, session: 'cw', supersede }).signal(passed), passed);
  assert.equal(policy.coworkCardOptions({ kind: 'other', title: 't' }, { cowork: true, session: 'cw', supersede }).signal(passed), passed);
});

test('a Cowork task run keeps "Allow for all scheduled runs" on its task; the next run is answered accept (复核修复 2)', async (t) => {
  assert.ok(DL8.includes('r.scheduledTaskId&&!t.M5(e.toolName)&&!e.toolName.startsWith("plugin-shim:")&&t._s.addApprovedPermissions(r.scheduledTaskId,e.suggestions,{askedToolName:e.toolName})'));
  assert.ok(DL8.includes('case"always":case"scheduled":{'));
  const dataDir = tmp('w13-cowork-routine-');
  t.after(() => fs.rmSync(dataDir, { recursive: true, force: true }));
  let state = [], runs = 0;
  const routines = createLocalRoutines({ getState: () => state, commit: (value) => { state = structuredClone(value); }, dataDir,
    approveFolder: (value) => value, captureOptions: async () => ({ coreId: 'fixture', model: 'm', effort: null, permission: 'ask', networkAccess: false }),
    launch: async (task, { attach }) => { const threadId = `${task.id}-run-${runs++}`; attach(threadId); return { turnId: `${threadId}-turn` }; },
    now: () => Date.UTC(2026, 9, 28, 9), setTimer: () => 1, clearTimer: () => {} });
  t.after(() => routines.dispose());
  // A Cowork run's session names no scheduledTaskId (routine-runner sets it for Code runs only).
  const sessionMetadata = {}, threadMetadata = {};
  const approvals = createRoutineApprovals({ routines, metadata: (id) => sessionMetadata[id], root: (id) => threadMetadata[id]?.cwd });
  const task = await routines.request({ action: 'create', kind: 'cowork', name: 'Weekly brief', prompt: 'Summarize.', cron: '0 9 * * 1' });
  const run = async () => { const record = await routines.request({ action: 'run', id: task.id }); sessionMetadata[record.threadId] = { surface: 'cowork' }; threadMetadata[record.threadId] = { cwd: '/cowork/host' }; return record; };
  const pending = new Map(), sent = [];
  const owner = { getApproval(id, expected) { const event = pending.get(id); if (!event || event.bridgeApproval.instanceId !== expected?.instanceId) throw new Error('stale'); return event; },
    respond(id, result, expected) { this.getApproval(id, expected); pending.delete(id); sent.push({ id, result }); return expected; } };
  const ask = (id, record, command = 'python3 summarize.py') => { const event = { kind: 'request', id, method: COMMAND_APPROVAL, bridgeApproval: { connectionId: 'c', instanceId: `i-${id}` },
    params: { kind: 'command', threadId: record.threadId, turnId: record.turnId, itemId: 'call', command, cwd: '/cowork/host', reason: null } }; pending.set(id, event); return event; };
  const first = await run();
  const card = ask(1, first);
  assert.equal(approvals.receive(card, owner, respondToApproval), false, 'no rule yet: the card shows');
  // The Cowork card's "Allow for all scheduled runs" (scheduled) → acceptForSession → kept on the task.
  const p = policy.coworkRespondPayload(owner, { id: 1, expected: card.bridgeApproval, decision: 'scheduled' }, { cowork: () => true });
  assert.equal(p.decision, 'acceptForSession');
  assert.equal(approvals.respond(owner, p, respondToApproval).ok, true);
  assert.deepEqual(routines.list('cowork')[0].approvedPermissions.map(({ approvedAt: _at, ...rule }) => rule), [{ toolName: 'Bash', ruleContent: 'python3 summarize.py', cwd: '' }]);
  // Once stores nothing.
  const other = ask(2, first, 'ls');
  approvals.respond(owner, policy.coworkRespondPayload(owner, { id: 2, expected: other.bridgeApproval, decision: 'once' }, { cowork: () => true }), respondToApproval);
  assert.equal(routines.list('cowork')[0].approvedPermissions.length, 1);
  routines.observe({ method: 'turn/completed', params: { threadId: first.threadId, turn: { id: first.turnId, status: 'completed' } } });
  // The next run: the same command is answered accept (this call only) before any card; another one still asks.
  const second = await run();
  assert.equal(approvals.receive(ask(3, second), owner, respondToApproval), true);
  assert.deepEqual(sent.at(-1), { id: 3, result: { decision: 'accept' } });
  assert.equal(approvals.receive(ask(4, second, 'rm -rf /cowork/host/x'), owner, respondToApproval), false);
  // Not a run of the task (an ordinary Cowork session): nothing is answered.
  assert.equal(approvals.receive(ask(5, { threadId: 'cw-other', turnId: 't' }), owner, respondToApproval), false);
});
