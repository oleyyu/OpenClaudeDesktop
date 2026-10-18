// R4f-proposal P2 (tasks-proposal-group-card WI-2): the host data model of the 2.42304.0 inline proposal group card
// (src/proposal-group-model.mjs). The official predicates (c96d752d0 pL / hL / gL / mL / PPe, cb27dab29 W / K / Je,
// c8479260c C / d / S / h) are sliced out of the installed chunks and run side by side with the host's re-statement;
// the rest is pinned on the original text it follows (QL, _K, a0e, KZ, MQ / N1e, Hx, main's enqueue and Db). Pure: no
// React, no core, nothing persisted.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { parsers } from '../../tools/node_modules/prettier/plugins/babel.mjs';
import { setLocale, DEFAULT_LOCALE } from '../electron/i18n/index.mjs';
import { suggestedTasks } from '../src/agent-tool-titles.mjs';
import {
  SPAWN_TASK_TOOL, TASK_ID_PATTERN, PROPOSAL_OUTCOMES, LEGACY_DISMISSED_TASKS_PREFIX,
  proposalToolRecord, proposalTaskId, isProposingTool, isPlacedProposal, proposalToolFailed, proposingTools,
  turnProposals, proposalAnchors, proposalCardToolIds, isProposalCardTool, transcriptTaskIds,
  proposalOutcomes, sentHereTaskIds, startedTaskIds, backgroundTaskSuggestions, unplacedSuggestions,
  toOfficialPermissionMode, toHostPermissionMode, proposalSessions, legacyWithdrawnTaskIds,
} from '../src/proposal-group-model.mjs';

setLocale(DEFAULT_LOCALE);
const app = path.resolve(import.meta.dirname, '..');
const reference = path.resolve(app, '../reference/installed-2.42304.0-20261017');
const renderer = (name) => fs.readFileSync(path.join(reference, 'ion-dist/assets/v1', name), 'utf8');
const mainChunk = (name) => fs.readFileSync(path.join(reference, 'asar/.vite/build', name), 'utf8');
const count = (text, needle) => text.split(needle).length - 1;
const C96 = 'c96d752d0-BOCqU7c2.js', CB27 = 'cb27dab29-_H2_XKli.js', C84 = 'c8479260c-DaoJ9_2S.js', CF74 = 'cf74bc599-D9NZWRyl.js';

// --- the original declarations, evaluated --------------------------------------------------------------------------
const exportsOf = (code) => new Map(/export\{([^}]*)\}/.exec(code)[1].split(',').map((part) => {
  const [local, alias] = part.split(' as '); return [alias ?? local, local];
}));
// {local name in `code` → local name in the dependency} for one import statement.
function importsFrom(code, depFile, depExports) {
  const spec = new RegExp(`import\\{([^}]*)\\}from"\\./${depFile.replace(/[.$]/g, '\\$&')}"`).exec(code)[1];
  return new Map(spec.split(',').map((part) => { const [alias, local] = part.split(' as '); return [local ?? alias, depExports.get(alias)]; }));
}
function declarations(code, names) {
  const ast = parsers.babel.parse(code, {}), out = {};
  for (const node of ast.program.body) {
    if (node.type === 'FunctionDeclaration' && names.includes(node.id.name)) out[node.id.name] = code.slice(node.start, node.end);
    else if (node.type === 'VariableDeclaration')
      for (const d of node.declarations) if (names.includes(d.id.name)) out[d.id.name] = `var ${code.slice(d.start, d.end)};`;
  }
  for (const name of names) assert.ok(out[name], `${name} is a top-level declaration`);
  return names.map((name) => out[name]).join('\n');
}
const official = (() => {
  const c84Code = renderer(C84), cbCode = renderer(CB27), c96Code = renderer(C96);
  const c84Exports = exportsOf(c84Code), cbExports = exportsOf(cbCode);
  const c84Locals = [...new Set(c84Exports.values())];
  const c84 = new Function(`${c84Code.replace(/export\{[^}]*\};?\s*$/, '')}\nreturn {${c84Locals.join(',')}};`)();
  // cb27dab29 W (spawn_task), K (an own-initiative start_session without its task), Je (a cloud start_session).
  const cbImports = importsFrom(cbCode, C84, c84Exports);
  const cbParams = [...cbImports.keys()];
  const cb = new Function(...cbParams, `${declarations(cbCode, ['Ge', 'W', 'K', 'Je'])}\nreturn {W, K, Je};`)(...cbParams.map((p) => c84[cbImports.get(p)]));
  // c96d752d0 pL / hL / gL / mL / PPe over those.
  const fromC84 = importsFrom(c96Code, C84, c84Exports), fromCb = importsFrom(c96Code, CB27, cbExports);
  const bound = { Nh: c84[fromC84.get('Nh')], Ph: c84[fromC84.get('Ph')], Fh: c84[fromC84.get('Fh')], w_: cb[fromCb.get('w_')], T_: cb[fromCb.get('T_')], R_: cb[fromCb.get('R_')] };
  assert.deepEqual(Object.values(bound).map((value) => value !== undefined), Array(6).fill(true));
  const c96 = new Function(...Object.keys(bound), `${declarations(c96Code, ['SL', 'NPe', 'pL', 'hL', 'gL', 'mL', 'PPe', 'L$'])}\nreturn {pL, hL, gL, mL, PPe, L$};`)(...Object.values(bound));
  return { ...c96, spawnTool: c84[c84Exports.get('l')], startSession: bound.Fh, taskIdOf: bound.Nh };
})();

// --- host items --------------------------------------------------------------------------------------------------
let seq = 0;
const taskHex = () => (0x10000000 + (seq++)).toString(16).slice(-8);
const spawn = ({ id, turnId = 't1', status = 'completed', taskId = `task_${taskHex()}`, args = {}, server = 'code_desktop', tool = 'spawn_task', isError, at } = {}) => ({
  id, turnId, type: 'mcpToolCall', server, tool, status,
  arguments: { title: `Task ${id}`, tldr: `Why ${id}.`, prompt: `Do ${id}.`, ...args },
  ...(status === 'completed' ? { result: { content: [{ type: 'text', text: `Suggested task shown to the user; it starts only if they click Start. task_id: ${taskId}` }], ...(isError ? { isError: true } : {}) } } : {}),
  ...(status === 'failed' ? { error: { message: 'title is required.' } } : {}),
  ...(at !== undefined ? { completedAtMs: at } : {}),
});
const taskOf = (item) => /task_id: (task_[0-9a-f]{8})/.exec(item.result.content[0].text)[1];
const user = (turnId) => ({ id: `u-${turnId}`, turnId, type: 'userMessage', content: [{ type: 'text', text: 'go' }] });
const reply = (id, turnId) => ({ id, turnId, type: 'agentMessage', text: 'Done.' });
const dismissCall = (taskId, turnId = 't9') => ({ id: `dismiss-${taskId}`, turnId, type: 'mcpToolCall', server: 'code_desktop', tool: 'dismiss_task', status: 'completed',
  arguments: { task_id: taskId }, result: { content: [{ type: 'text', text: 'Dismissed.' }] } });

test('official pins: tool names, the task id regexes and the predicates the host re-states', () => {
  const c84 = renderer(C84);
  for (const text of ['var e="ccd_session",t="spawn_task",n="dismiss_task",r=`mcp__${e}__${t}`', 'u=/task_id: (task_[a-f0-9]{8})\\b/g',
    'var h=/^task_[0-9a-f]{8}$/', 'var S=/task_id: (task_[0-9a-f]{8})\\b/;function C(e){return e?.match(S)?.[1]}'])
    assert.equal(count(c84, text), 1, text);
  assert.equal(official.spawnTool, SPAWN_TASK_TOOL);
  assert.equal(String(TASK_ID_PATTERN), '/^task_[0-9a-f]{8}$/');
  const cb = renderer(CB27);
  assert.equal(count(cb, 'var Ge=u;function W(e){return e===Ge}'), 1);
  const c96 = renderer(C96);
  for (const text of ['function pL(e){if(!(e.status!=="completed"||e.isError))return w_(e.name)?Nh(e.output):T_(e)||R_(e)?Ph(e.output):void 0}',
    'function hL(e){if(w_(e.name))return!0;', 'function gL(e){return hL(e)&&pL(e)!==void 0}',
    'function mL(e){return e.status==="error"||e.isError===!0||e.rejected===!0||e.interrupted===!0}',
    'function PPe(e){let t,n;for(let r of e)if(r.kind==="tools")for(let e of r.tools)hL(e)&&(n??=e.id,gL(e)&&(t??=[],t.push(e)));return n===void 0?NPe:{tools:t??SL,firstProposingCallId:n}}',
    // ZZ: how the official transcript marks a cut-off call.
    '{...e,status:"error",isError:!0,interrupted:!0,output:gne}'])
    assert.equal(count(c96, text), 1, text);
});

test('proposalToolRecord: a spawn_task call of the agent tools becomes the official tool record', () => {
  const done = spawn({ id: 'a', taskId: 'task_0123abcd', args: { cwd: '/repo/other' } });
  const record = proposalToolRecord(done);
  assert.deepEqual(record, { id: 'a', name: 'mcp__ccd_session__spawn_task', input: { title: 'Task a', tldr: 'Why a.', prompt: 'Do a.', cwd: '/repo/other' },
    output: 'Suggested task shown to the user; it starts only if they click Start. task_id: task_0123abcd', status: 'completed', isError: false });
  assert.equal(proposalToolRecord(done), record, 'cached per item object');
  assert.notEqual(record.input, done.arguments, 'the input is a copy');
  // OpenCode's prefixed tool name, a running call, a failed one, a declined one, an interrupted one, an error result.
  assert.equal(proposalToolRecord(spawn({ id: 'b', server: null, tool: 'code_desktop_spawn_task' }))?.name, SPAWN_TASK_TOOL);
  assert.deepEqual(proposalToolRecord(spawn({ id: 'c', status: 'inProgress' })), { id: 'c', name: SPAWN_TASK_TOOL, input: { title: 'Task c', tldr: 'Why c.', prompt: 'Do c.' }, output: undefined, status: 'running', isError: false });
  assert.deepEqual(proposalToolRecord(spawn({ id: 'd', status: 'failed' })), { id: 'd', name: SPAWN_TASK_TOOL, input: { title: 'Task d', tldr: 'Why d.', prompt: 'Do d.' }, output: 'title is required.', status: 'error', isError: true });
  assert.equal(proposalToolRecord(spawn({ id: 'e', status: 'declined' })).rejected, true);
  assert.deepEqual(['status', 'isError', 'interrupted'].map((key) => proposalToolRecord(spawn({ id: 'f', status: 'interrupted' }))[key]), ['error', true, true]);
  assert.equal(proposalToolRecord(spawn({ id: 'g', isError: true })).isError, true);
  // Not proposals: another app tool, another server's spawn_task, dismiss_task, a command.
  assert.equal(proposalToolRecord(spawn({ id: 'h', tool: 'mark_chapter' })), null);
  assert.equal(proposalToolRecord(spawn({ id: 'i', server: 'someone_else' })), null);
  assert.equal(proposalToolRecord(dismissCall('task_0123abcd')), null);
  assert.equal(proposalToolRecord({ id: 'j', type: 'commandExecution', command: 'ls' }), null);
  assert.equal(proposalToolRecord(null), null);
});

test('the re-stated pL / hL / gL / mL / PPe answer as the original declarations do', () => {
  const items = [spawn({ id: 'p1' }), spawn({ id: 'p2', status: 'inProgress' }), spawn({ id: 'p3', status: 'failed' }), spawn({ id: 'p4', isError: true }),
    spawn({ id: 'p5', status: 'interrupted' }), spawn({ id: 'p6', status: 'declined' }),
    { ...spawn({ id: 'p7' }), result: { content: [{ type: 'text', text: 'no id here' }] } },
    { ...spawn({ id: 'p8' }), result: { content: [{ type: 'text', text: 'xtask_id: task_aaaaaaaa then task_id: task_bbbbbbbb' }] } }];
  const records = items.map(proposalToolRecord);
  for (const record of records) {
    assert.equal(proposalTaskId(record), official.pL(record), `pL ${record.id}`);
    assert.equal(isProposingTool(record), official.hL(record), `hL ${record.id}`);
    assert.equal(isPlacedProposal(record), official.gL(record), `gL ${record.id}`);
    assert.equal(proposalToolFailed(record), official.mL(record), `mL ${record.id}`);
  }
  assert.deepEqual(proposingTools(records), official.PPe([{ kind: 'tools', tools: records }]));
  assert.deepEqual(proposingTools([]), official.PPe([]));
  assert.deepEqual(proposingTools(records).tools.map((record) => record.id), ['p1', 'p8']);
  assert.equal(proposingTools(records).firstProposingCallId, 'p1');
  // The official parse of the transcript id agrees with suggestedTasks' (read-only, shared) on the local tool's output.
  const local = spawn({ id: 'p9', taskId: 'task_feedc0de' });
  assert.equal(proposalTaskId(proposalToolRecord(local)), suggestedTasks([local])[0].id);
  assert.equal(official.taskIdOf(proposalToolRecord(local).output), 'task_feedc0de');
});

test('turnProposals: one row per turn after its tail, named by the first proposing call; a lone sent-here task has none', () => {
  const c96 = renderer(C96);
  for (const text of ['M=t.turnSuggestions===!0', 'if(M&&sp(n)){let i=PPe(n.items);le??=i.firstProposingCallId,ce.push(...i.tools),le!==void 0&&ce.length>0&&tf(e,r,!1,I)&&((ce.length!==1||t.sentHereSuggestionIds?.includes(pL(ce[0])??"")!==!0)&&s.push({kind:"turnSuggestions",id:`turnSuggestions:${le}`,tools:ce}),ce=[],le=void 0)}'])
    assert.equal(count(c96, text), 1, text);
  const running = spawn({ id: 's0', turnId: 't1', status: 'inProgress' }), first = spawn({ id: 's1', turnId: 't1' }), second = spawn({ id: 's2', turnId: 't1' });
  const lone = spawn({ id: 's3', turnId: 't2' }), failedOnly = spawn({ id: 's4', turnId: 't3', status: 'failed' }), orphan = { ...spawn({ id: 's5' }), turnId: undefined };
  const items = [user('t1'), running, first, reply('r1', 't1'), second, user('t2'), lone, user('t3'), failedOnly, orphan];
  const rows = turnProposals(items);
  assert.deepEqual([...rows.keys()], ['t1', 't2']);
  assert.deepEqual(rows.get('t1'), { kind: 'turnSuggestions', id: 'turnSuggestions:s0', turnId: 't1', tools: [proposalToolRecord(first), proposalToolRecord(second)] });
  assert.deepEqual(rows.get('t2').tools.map((record) => record.id), ['s3']);
  // A turn whose only task was sent here gets no row; with two tasks the row stays.
  assert.equal(turnProposals(items, { sentHereSuggestionIds: [taskOf(lone)] }).has('t2'), false);
  assert.equal(turnProposals(items, { sentHereSuggestionIds: new Set([taskOf(first)]) }).has('t1'), true);
  assert.equal(turnProposals([]).size, 0);
});

test('proposalAnchors: the row mounts after its turn\'s last displayed row', () => {
  const proposals = turnProposals([user('t1'), spawn({ id: 'a1', turnId: 't1' }), user('t2'), spawn({ id: 'a2', turnId: 't2' })]);
  // Displayed rows: the card's tools are gone; a tool group carries its first member's turnId; a local row has none.
  const rows = [user('t1'), reply('r1', 't1'), { id: 'g', type: 'fileToolGroup', turnId: 't1', toolGroup: [] }, user('t2'), { id: 'local', localCommand: true }];
  const anchors = proposalAnchors(rows, proposals);
  assert.deepEqual([...anchors].map(([index, row]) => [index, row.id]), [[3, 'turnSuggestions:a2'], [2, 'turnSuggestions:a1']]);
  assert.equal(proposalAnchors(rows, new Map()).size, 0);
  assert.equal(proposalAnchors(null, proposals).size, 0);
});

test('proposalCardToolIds: every placed call with a turn is the card\'s; running and failed calls stay tool rows', () => {
  const c96 = renderer(C96);
  assert.equal(count(c96, 'function _K(e,t){if(t.hostDrawsTurnSuggestions===!0&&gL(e))return!0;'), 1);
  assert.equal(count(c96, '...ee?{hostDrawsTurnSuggestions:ee}:{}'), 1);
  const items = [spawn({ id: 'h1' }), spawn({ id: 'h2', status: 'inProgress' }), spawn({ id: 'h3', status: 'failed' }), { ...spawn({ id: 'h4' }), turnId: undefined }, reply('r', 't1')];
  assert.deepEqual([...proposalCardToolIds(items)], ['h1']);
  assert.deepEqual(items.map(isProposalCardTool), [true, false, false, false, false]);
  assert.deepEqual([...transcriptTaskIds(items)], [taskOf(items[0]), taskOf(items[3])]);
});

test('backgroundTaskSuggestions: the queue main would hold, oldest first, without the tasks that have a result', () => {
  const main = mainChunk('index.chunk-B5tintml.js');
  for (const text of ['g=p.enqueueBackgroundTaskSuggestion(i.sessionId,{id:h,title:c.trim().slice(0,200)||void 0,prompt:l,tldr:d.trim().slice(0,2e3)||void 0,cwd:m})',
    'function Db(e,t,n){let r=[...e??[],t],i=[],a=r.length-20;'])
    assert.equal(count(main, text), 1, text);
  const c96 = renderer(C96);
  for (const text of ['t.id&&MQ(e,t.id,n$(t)?"kept_here":"dismissed")', 'v.id&&MQ(l,v.id,"sent_here")', 'ge==="failed"&&!se&&MQ(l,Y,"start_failed")'])
    assert.equal(count(c96, text), 1, text);
  const items = Array.from({ length: 24 }, (_, index) => spawn({ id: `q${index}`, turnId: `t${index}`, at: 1000 + index, args: index === 23 ? { cwd: '/elsewhere', tldr: '' } : {} }));
  const ids = items.map(taskOf);
  const queue = backgroundTaskSuggestions(items);
  assert.equal(queue.length, 20, 'at most 20, the oldest evicted');
  assert.deepEqual(queue.map((task) => task.id), ids.slice(4));
  assert.deepEqual(queue[0], { id: ids[4], title: 'Task q4', prompt: 'Do q4.', tldr: 'Why q4.', createdAt: 1004 });
  assert.deepEqual(queue.at(-1), { id: ids[23], title: 'Task q23', prompt: 'Do q23.', cwd: '/elsewhere', createdAt: 1023 }, 'no empty tldr, no toolUseId');
  assert.ok(queue.every((task) => !('toolUseId' in task)));
  // Results, started children, withdrawn ids and dismiss_task calls all leave the queue (before the 20 cut).
  const withResults = backgroundTaskSuggestions([...items, dismissCall(ids[22])], { outcomes: { [ids[23]]: 'dismissed', [ids[21]]: { outcome: 'start_failed' } },
    startedTaskIds: new Set([ids[20]]), withdrawn: [ids[19]] });
  assert.deepEqual(withResults.map((task) => task.id), ids.slice(0, 19));
  // Running, failed and id-less calls are not queued.
  assert.deepEqual(backgroundTaskSuggestions([spawn({ id: 'x1', status: 'inProgress' }), spawn({ id: 'x2', status: 'failed' }), spawn({ id: 'x3', isError: true })]), []);
});

test('proposalOutcomes / sentHereTaskIds: the result store entries, malformed ones dropped', () => {
  assert.deepEqual(PROPOSAL_OUTCOMES, ['dismissed', 'kept_here', 'sent_here', 'start_failed']);
  assert.deepEqual(proposalOutcomes({ task_0000000a: 'dismissed', task_0000000b: { outcome: 'sent_here', at: 5 }, task_0000000c: 'started', 'task_XYZ': 'dismissed', task_0000000d: 'start_failed' }),
    { task_0000000a: 'dismissed', task_0000000b: 'sent_here', task_0000000d: 'start_failed' });
  assert.deepEqual(proposalOutcomes(null), {});
  assert.deepEqual(proposalOutcomes(['task_0000000a']), {});
  assert.deepEqual(sentHereTaskIds({ task_0000000a: 'dismissed', task_0000000b: 'sent_here' }), ['task_0000000b']);
});

test('startedTaskIds: the proposal children in the session metadata (KZ), not /btw children', () => {
  const c96 = renderer(C96);
  assert.equal(count(c96, 't.spawnedFrom?.sessionId===e&&n.has(t.spawnedFrom.taskId)?[`${t.spawnedFrom.taskId}${GZ}${t.sessionId}`]:[]'), 1);
  const metadata = {
    child1: { spawnedFrom: { sessionId: 'parent', taskId: 'task_0000aaaa', proposal: true } },
    child2: { spawnedFrom: { sessionId: 'parent', taskId: 'not-a-task' } },
    btw: { spawnedFrom: { sessionId: 'parent', sideSession: true, userFork: true, btw: true } },
    other: { spawnedFrom: { sessionId: 'someone', taskId: 'task_0000bbbb' } },
    parent: { spawnedFrom: { sessionId: 'parent', taskId: 'task_0000cccc' } },
  };
  assert.deepEqual([...startedTaskIds(metadata, 'parent')], ['task_0000aaaa']);
  assert.equal(startedTaskIds(metadata, null).size, 0);
});

test('unplacedSuggestions: queued tasks no loaded call carries; none for a queue derived from the same transcript', () => {
  const cf = renderer(CF74);
  for (const text of ['ji=!rn&&Ci.length>0?Ci:void 0', 'u=f(()=>l===""?Ix:JSON.parse(l).map(([e,t,n,r,i,a])=>({id:e,title:t===null||t===""?void 0:t,']) assert.equal(count(cf, text), 1, text);
  const c96 = renderer(C96);
  assert.equal(count(c96, 'k!==void 0&&k.length>0&&s.push({kind:"unplacedSuggestions",id:`unplacedSuggestions:${k[0].id}`,tasks:k})'), 1);
  const items = [spawn({ id: 'v1' }), spawn({ id: 'v2' })];
  assert.equal(unplacedSuggestions(backgroundTaskSuggestions(items), items), null);
  const queue = [...backgroundTaskSuggestions(items), { id: 'task_0000dddd', title: '', prompt: 'p', createdAt: 9 }, { id: 'task_0000eeee', title: 'Sent', prompt: 'p' }];
  assert.deepEqual(unplacedSuggestions(queue, items, { sentHereSuggestionIds: ['task_0000eeee'] }),
    { kind: 'unplacedSuggestions', id: 'unplacedSuggestions:task_0000dddd', tasks: [{ id: 'task_0000dddd', title: undefined, createdAt: 9 }] });
});

test('permission modes: host Codex values against the official enum, both ways; no dontAsk', () => {
  const shared8 = renderer('shared-8-B5lJ8U5C.js');
  for (const mode of ['default', 'acceptEdits', 'plan', 'auto', 'bypassPermissions', 'dontAsk']) assert.equal(count(shared8, `case"${mode}":`), 1, mode);
  const host = ['ask', 'acceptEdits', 'plan', 'auto', 'bypass'];
  assert.deepEqual(host.map(toOfficialPermissionMode), ['default', 'acceptEdits', 'plan', 'auto', 'bypassPermissions']);
  assert.deepEqual(host.map((mode) => toHostPermissionMode(toOfficialPermissionMode(mode))), host);
  assert.equal(toHostPermissionMode('dontAsk'), undefined);
  assert.equal(toOfficialPermissionMode('toString'), undefined);
  assert.equal(toOfficialPermissionMode(undefined), undefined);
});

test('proposalSessions: the session records KZ and a0e read, the parent with its live state and queue', () => {
  const c96 = renderer(C96);
  for (const text of ['model:n?.model,effort:n?.effort,permissionMode:n?.permissionMode,inWorktree:n?.worktreePath!==void 0||n?.branch!==void 0||n?.spawnedFrom?.sharedCheckout===!0',
    '?.backgroundTaskSuggestions??[]).flatMap(e=>e.id!==void 0&&n.has(e.id)?[JSON.stringify([e.id,e.title??null,e.tldr??null,e.cwd??null,e.createdAt??null,'])
    assert.equal(count(c96, text), 1, text);
  const queue = [{ id: 'task_0000aaaa', title: 'T', prompt: 'P' }];
  const sessions = [{ id: 'parent', name: 'Fix the parser', cwd: '/repo/.code/worktrees/fix' }, { id: 'child', cwd: '/repo', archived: true }, { id: 'btw', cwd: '/repo' }, { cwd: '/no-id' }];
  const metadata = {
    parent: { model: 'gpt-old', effort: 'low', originCwd: '/repo' },
    child: { model: 'gpt-5', effort: 'high', spawnedFrom: { sessionId: 'parent', taskId: 'task_0000aaaa', proposal: true } },
    btw: { spawnedFrom: { sessionId: 'parent', sideSession: true, sharedCheckout: true, taskId: 'bogus' } },
  };
  const records = proposalSessions({ sessions, metadata, parentId: 'parent', parent: { model: 'gpt-5.1', effort: 'medium', permission: 'ask' }, queue, fields: { btw: { isScratchWorkspace: true } } });
  assert.deepEqual(records, [
    { sessionId: 'parent', title: 'Fix the parser', cwd: '/repo/.code/worktrees/fix', isArchived: false, model: 'gpt-5.1', effort: 'medium', permissionMode: 'default',
      originCwd: '/repo', worktreePath: '/repo/.code/worktrees/fix', backgroundTaskSuggestions: queue },
    { sessionId: 'child', cwd: '/repo', isArchived: true, model: 'gpt-5', effort: 'high', spawnedFrom: { sessionId: 'parent', taskId: 'task_0000aaaa', proposal: true } },
    { sessionId: 'btw', cwd: '/repo', isArchived: false, spawnedFrom: { sessionId: 'parent', sideSession: true, sharedCheckout: true }, isScratchWorkspace: true },
  ]);
  assert.notEqual(records[0].backgroundTaskSuggestions, queue, 'a copy');
  // An empty queue is no field (as the official store sets it); a parent not yet listed is added.
  assert.deepEqual(proposalSessions({ sessions: [], parentId: 'fresh', parent: { cwd: '/repo', permission: 'bypass' }, queue: [] }),
    [{ sessionId: 'fresh', cwd: '/repo', isArchived: false, permissionMode: 'bypassPermissions' }]);
  assert.deepEqual(proposalSessions(), []);
});

test('legacyWithdrawnTaskIds: the floating card\'s stored list, its task ids only', () => {
  assert.equal(LEGACY_DISMISSED_TASKS_PREFIX, 'code-desktop:dismissed-tasks:');
  // The floating card that wrote this list (source-suggested-tasks.jsx `const STORAGE_PREFIX = "code-desktop:dismissed-tasks:"`)
  // is retired (R4f-proposal P5); the prefix stays the one it wrote, so existing lists are still read.
  assert.equal(fs.existsSync(path.join(app, 'src/source-suggested-tasks.jsx')), false);
  assert.deepEqual(legacyWithdrawnTaskIds('["task_0000aaaa","x",3,"task_0000aaaa","task_0000bbbb"]'), ['task_0000aaaa', 'task_0000bbbb']);
  assert.deepEqual(legacyWithdrawnTaskIds('not json'), []);
  assert.deepEqual(legacyWithdrawnTaskIds(null), []);
  assert.equal(legacyWithdrawnTaskIds(Array.from({ length: 250 }, (_, index) => `task_${(0x10000000 + index).toString(16).slice(-8)}`)).length, 200);
});

test('the official card drops a lone sent-here row and kept-here rows (L$), which the model leaves to it', () => {
  // L$ runs on the card's items, after the model: pinned here so a change of that contract shows up next to the model.
  assert.deepEqual(official.L$([{ state: 'sent_here' }]), []);
  assert.deepEqual(official.L$([{ state: 'kept_here' }, { state: 'proposed' }]), [{ state: 'proposed' }]);
});
