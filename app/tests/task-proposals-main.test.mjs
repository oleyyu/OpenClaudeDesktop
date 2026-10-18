// R4f-proposal P4 (WI-4): electron/task-proposals.cjs, the main-process records behind the inline proposal group card
// (2.42304.0 c96d752d0 B$): the lineage a proposal-started session gets (spawnedFrom) and the card outcomes, kept in
// config and sent out through the sidebar-state emit. Pure: a stand-in config, save and emit; no window, no core.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { createTaskProposals, proposalLineage, taskProposalsSnapshot, MAX_OUTCOMES_PER_PARENT, NOT_A_SIDE_SESSION } = require('../electron/task-proposals.cjs');
const { isBtwChild } = require('../electron/btw-sessions.cjs');

const reference = (file) => fs.readFileSync(new URL(`../../reference/installed-2.42304.0-20261017/${file}`, import.meta.url), 'utf8');
const count = (text, needle) => text.split(needle).length - 1;
const TASK = 'task_0000aaaa', OTHER = 'task_0000bbbb';

function setup({ config: extra = {}, settle } = {}) {
  const config = { threadIds: ['child', 'parent', 'other'], archivedThreadIds: ['old'], sessionMetadata: { parent: { pinned: true } }, sidebarRevision: 4, ...extra };
  const saves = [], events = [], settled = [];
  const store = createTaskProposals({
    getConfig: () => config,
    save: () => saves.push(structuredClone(config)),
    emit: (event) => events.push(structuredClone(event)),
    // main.cjs sidebarSnapshot(): the fields the windows' applySidebarState reads.
    sidebarSnapshot: () => ({ sessionMetadata: config.sessionMetadata, revision: config.sidebarRevision }),
    isForeign: (id) => id === 'cowork',
    settle: settle ?? ((sessionId, taskId) => { settled.push([sessionId, taskId]); return true; }),
  });
  return { config, store, saves, events, settled };
}

test('source: the lineage official F1e hands LocalSessions.start, and what startSession leaves of it', () => {
  const renderer = reference('ion-dist/assets/v1/c96d752d0-BOCqU7c2.js');
  assert.equal(count(renderer, 'x=v.id&&!_?{sessionId:l,taskId:v.id,title:v.title}:void 0'), 1);
  // KZ / c$e: a session's spawnedFrom names the card's session and one of its task ids → started.
  assert.equal(count(renderer, 't.sessions.flatMap(t=>t.spawnedFrom?.sessionId===e&&n.has(t.spawnedFrom.taskId)?[`${t.spawnedFrom.taskId}${GZ}${t.sessionId}`]:[])'), 1);
  const sessions = reference('asar/.vite/build/index.chunk-CFJssAFf.js');
  assert.equal(count(sessions, 'e.spawnedFrom&&!r?.sideSessionAuthorized&&(e.spawnedFrom={...e.spawnedFrom,sideSession:!1,wakeParent:!1,sharedCheckout:!1,sharedFolder:!1,handOff:!1,userFork:!1,btw:!1,name:void 0,deletedParent:void 0})'), 1);
  assert.deepEqual(Object.keys(NOT_A_SIDE_SESSION), ['sideSession', 'wakeParent', 'sharedCheckout', 'sharedFolder', 'handOff', 'userFork', 'btw']);
  assert.ok(Object.values(NOT_A_SIDE_SESSION).every((value) => value === false));
});

test('source: the card outcomes (EQ via MQ / NQ), sent_here kept across reloads (kQ), the main resolved cap (Ob, 100), vb', () => {
  const renderer = reference('ion-dist/assets/v1/c96d752d0-BOCqU7c2.js');
  for (const source of [
    'EQ=pc(()=>({byParent:{}})),DQ="epitaxy-suggested-task-sent-here-v1"',
    'function MQ(e,t,n){EQ.setState(r=>{let i=r.byParent[e]??{};return i[t]===n?r:{byParent:{...r.byParent,[e]:{...i,[t]:n}}}}),n==="sent_here"?AQ(e,e=>({...e,[t]:n})):jQ(e,t)}',
    'function NQ(e,t){EQ.setState(n=>{let r=n.byParent[e];if(r?.[t]===void 0)return n;let{[t]:i,...a}=r;return{byParent:{...n.byParent,[e]:a}}}),jQ(e,t)}',
    // Only start_failed comes from a failed start; notifySpawnedTaskUnstarted gives the task back to the queue.
    'ge==="failed"&&!se&&MQ(l,Y,"start_failed"),ge!=="started"&&t!=="here"&&(ce!==null&&!le?$e?.notifySpawnedTaskStarted?.(l,Y,"cloud",ce,x?.title):$e?.notifySpawnedTaskUnstarted?.(l,Y))',
    'v.id&&MQ(l,v.id,"sent_here")',
    't.id&&MQ(e,t.id,n$(t)?"kept_here":"dismissed")',
  ]) assert.equal(count(renderer, source), 1, source);
  const tools = reference('asar/.vite/build/index.chunk-B5tintml.js');
  assert.equal(count(tools, 'function Ob(e,t,n){let r=e??new Map;r.delete(t),r.set(t,n);for(let e of r.keys()){if(r.size<=100)break;r.delete(e)}return r}'), 1);
  assert.equal(MAX_OUTCOMES_PER_PARENT, 100);
  assert.equal(count(tools, 'var vb=/^task_[0-9a-f]{8}$/;'), 1);
});

test('started: the opened session gets the proposal lineage, saved and sent to every window, and leaves spawn_task\'s list', async () => {
  const s = setup();
  const state = await s.store.run({ operation: 'started', parentId: 'parent', childId: 'child', taskId: TASK, title: '  Remove\n dead   option ' });
  assert.deepEqual(s.config.sessionMetadata.child, { spawnedFrom: { sessionId: 'parent', taskId: TASK, title: 'Remove dead option', ...NOT_A_SIDE_SESSION } });
  assert.deepEqual(s.config.sessionMetadata.parent, { pinned: true }, 'the card\'s own session is untouched');
  assert.equal(s.config.sidebarRevision, 5);
  assert.equal(s.saves.length, 1);
  assert.deepEqual(s.events, [{ kind: 'sidebar-state', state: { sessionMetadata: s.config.sessionMetadata, revision: 5, taskProposals: {} } }]);
  assert.deepEqual(state, s.events[0].state);
  assert.deepEqual(s.settled, [['parent', TASK]]);
  assert.deepEqual(proposalLineage(s.config.sessionMetadata.child), { sessionId: 'parent', taskId: TASK });
  // Not a /btw child: no nesting, no shared-checkout archive, no side-session note (btw-sessions.cjs, generated readers).
  assert.equal(isBtwChild(s.config.sessionMetadata.child), false);
  const { btwChildrenInParentTabs } = await import('../src/generated/code-current/nested-session-parent-tabs.mjs');
  const records = ['parent', 'child'].map((id) => ({ sessionId: id, ...s.config.sessionMetadata[id] }));
  assert.equal(btwChildrenInParentTabs(records, new Set(['child'])).size, 0);
  const { sharesParentCheckout } = await import('../electron/generated/btw-archive.mjs');
  assert.equal(sharesParentCheckout(s.config.sessionMetadata.child, 'parent'), false);
  // The same report again changes nothing (a retried call); no title means none is stored.
  assert.deepEqual(await s.store.run({ operation: 'started', parentId: 'parent', childId: 'child', taskId: TASK }), state);
  assert.equal(s.saves.length, 1);
  assert.equal(s.events.length, 1);
  const t = setup();
  await t.store.run({ operation: 'started', parentId: 'old', childId: 'child', taskId: TASK });
  assert.deepEqual(t.config.sessionMetadata.child.spawnedFrom, { sessionId: 'old', taskId: TASK, ...NOT_A_SIDE_SESSION }, 'an archived card session still names it');
});

test('started refuses: unknown or archived sessions, the same id twice, bad task ids, another surface, a second session per task, a lineage change', async () => {
  const s = setup({ config: { sessionMetadata: { other: { spawnedFrom: { sessionId: 'parent', sideSession: true, userFork: true, btw: true } }, cowork: {} } } });
  s.config.threadIds.push('cowork', 'chat');
  s.config.sessionMetadata.chat = { surface: 'chat' };
  const start = (patch) => s.store.run({ operation: 'started', parentId: 'parent', childId: 'child', taskId: TASK, ...patch });
  await assert.rejects(start({ parentId: 'nope' }), /Unknown session/);
  await assert.rejects(start({ childId: 'old' }), /Unknown session/, 'the opened session is a listed, unarchived one');
  await assert.rejects(start({ childId: 'parent' }), /Unknown session/);
  await assert.rejects(start({ childId: 'bad\u0000id' }), /Unknown session/);
  for (const taskId of ['task_0000AAAA', 'task_123', 'todo_0000aaaa', undefined, 7]) await assert.rejects(start({ taskId }), /Unknown task/);
  await assert.rejects(start({ childId: 'cowork' }), /Unknown session/);
  await assert.rejects(start({ parentId: 'cowork' }), /Unknown session/);
  await assert.rejects(start({ childId: 'chat' }), /Unknown session/);
  await assert.rejects(start({ childId: 'other' }), /already has a parent/, 'a /btw child keeps its lineage');
  await start({});
  await assert.rejects(start({ taskId: OTHER }), /already has a parent/);
  s.config.threadIds.push('second');
  await assert.rejects(start({ childId: 'second' }), /Task task_0000aaaa was already started/);
  // A loop: the card's session came from the session being reported.
  s.config.sessionMetadata.parent = { spawnedFrom: { sessionId: 'second', taskId: OTHER } };
  await assert.rejects(start({ childId: 'second', taskId: OTHER }), /already has a parent/);
  assert.equal(s.saves.length, 1, 'only the accepted report was saved');
  await assert.rejects(s.store.run({ operation: 'merge' }), /Unsupported task proposal operation/);
});

test('outcome: dismissed / sent_here persist in config.taskProposals; start_failed lives in this process; one outcome per task; null clears', async () => {
  const s = setup();
  const outcome = (taskId, value, extra = {}) => s.store.run({ operation: 'outcome', parentId: 'parent', taskId, outcome: value, ...extra });
  let state = await outcome(TASK, 'dismissed');
  assert.deepEqual(s.config.taskProposals, { parent: { [TASK]: 'dismissed' } });
  assert.deepEqual(state.taskProposals, { parent: { [TASK]: 'dismissed' } });
  assert.deepEqual(s.events.at(-1), { kind: 'sidebar-state', state });
  state = await outcome(OTHER, 'start_failed');
  assert.deepEqual(s.config.taskProposals, { parent: { [TASK]: 'dismissed' } }, 'start_failed is not saved');
  assert.deepEqual(state.taskProposals, { parent: { [TASK]: 'dismissed', [OTHER]: 'start_failed' } });
  assert.deepEqual(s.saves.at(-1).taskProposals, { parent: { [TASK]: 'dismissed' } });
  // MQ replaces the task's outcome either way.
  state = await outcome(OTHER, 'sent_here');
  assert.deepEqual(state.taskProposals, { parent: { [TASK]: 'dismissed', [OTHER]: 'sent_here' } });
  state = await outcome(TASK, 'start_failed');
  assert.deepEqual(s.config.taskProposals, { parent: { [OTHER]: 'sent_here' } });
  assert.deepEqual(state.taskProposals, { parent: { [OTHER]: 'sent_here', [TASK]: 'start_failed' } });
  // NQ: null clears, from memory or config.
  state = await outcome(TASK, null);
  assert.deepEqual(state.taskProposals, { parent: { [OTHER]: 'sent_here' } });
  state = await outcome(OTHER, null);
  assert.deepEqual(state.taskProposals, {});
  assert.deepEqual(s.config.taskProposals, {});
  assert.deepEqual(s.settled, [['parent', TASK], ['parent', OTHER]], 'dismissed and sent_here leave spawn_task\'s list; start_failed and clearing do not');
  assert.equal(s.config.sidebarRevision, 10);
  // An archived card session still records; kept_here (start_session offers, D29) and anything else are refused.
  await s.store.run({ operation: 'outcome', parentId: 'old', taskId: TASK, outcome: 'dismissed' });
  for (const value of ['kept_here', 'started', 'cancelled', undefined, '']) await assert.rejects(outcome(TASK, value), /Invalid task outcome/);
  await assert.rejects(s.store.run({ operation: 'outcome', parentId: 'nope', taskId: TASK, outcome: 'dismissed' }), /Unknown session/);
  await assert.rejects(outcome('task_xyz', 'dismissed'), /Unknown task/);
  await assert.rejects(outcome(undefined, 'dismissed', { taskIds: [] }), /Unknown task/);
});

test('outcome: at most 100 per card session (Ob order: a re-set task moves last), sessions no longer listed are dropped, unreadable entries ignored', async () => {
  const id = (n) => `task_${n.toString(16).padStart(8, '0')}`;
  const s = setup({ config: { taskProposals: { gone: { [TASK]: 'dismissed' }, parent: { [id(0)]: 'dismissed', bad: 'dismissed', [id(1)]: 'kept_here' }, other: [] } } });
  assert.deepEqual(taskProposalsSnapshot(s.config), { gone: { [TASK]: 'dismissed' }, parent: { [id(0)]: 'dismissed' } });
  for (let n = 1; n < MAX_OUTCOMES_PER_PARENT; n++) await s.store.run({ operation: 'outcome', parentId: 'parent', taskId: id(n), outcome: 'dismissed' });
  assert.equal(Object.keys(s.config.taskProposals.parent).length, 100);
  assert.equal(s.config.taskProposals.gone, undefined, 'a session that is gone loses its outcomes');
  await s.store.run({ operation: 'outcome', parentId: 'parent', taskId: id(0), outcome: 'sent_here' });
  await s.store.run({ operation: 'outcome', parentId: 'parent', taskId: id(500), outcome: 'dismissed' });
  const keys = Object.keys(s.config.taskProposals.parent);
  assert.equal(keys.length, 100);
  assert.equal(keys[0], id(2), 'the oldest (task 1) left');
  assert.deepEqual(keys.slice(-2), [id(0), id(500)]);
  assert.deepEqual(JSON.parse(JSON.stringify(s.config.taskProposals)).parent[id(0)], 'sent_here', 'the order survives the config file');
});

test('outcome batch (legacy dismissed-tasks migration): keepExisting leaves recorded and started tasks alone', async () => {
  const s = setup();
  await s.store.run({ operation: 'outcome', parentId: 'parent', taskId: TASK, outcome: 'sent_here' });
  await s.store.run({ operation: 'started', parentId: 'parent', childId: 'child', taskId: OTHER });
  const third = 'task_0000cccc';
  const state = await s.store.run({ operation: 'outcome', parentId: 'parent', taskIds: [TASK, OTHER, third, third], outcome: 'dismissed', keepExisting: true });
  assert.deepEqual(state.taskProposals, { parent: { [TASK]: 'sent_here', [third]: 'dismissed' } });
  await assert.rejects(s.store.run({ operation: 'outcome', parentId: 'parent', taskIds: Array.from({ length: 101 }, () => third), outcome: 'dismissed' }), /Unknown task/);
  await assert.rejects(s.store.run({ operation: 'outcome', parentId: 'parent', taskIds: 'task_0000cccc', outcome: 'dismissed' }), /Unknown task/);
});

test('read changes nothing; a new process (app restart) keeps the saved outcomes and forgets start_failed', async () => {
  const s = setup();
  await s.store.run({ operation: 'outcome', parentId: 'parent', taskId: TASK, outcome: 'dismissed' });
  await s.store.run({ operation: 'outcome', parentId: 'parent', taskId: OTHER, outcome: 'start_failed' });
  const before = { saves: s.saves.length, events: s.events.length, revision: s.config.sidebarRevision };
  assert.deepEqual((await s.store.run({ operation: 'read' })).taskProposals, { parent: { [TASK]: 'dismissed', [OTHER]: 'start_failed' } });
  assert.deepEqual({ saves: s.saves.length, events: s.events.length, revision: s.config.sidebarRevision }, before);
  assert.deepEqual(s.store.snapshot(), { parent: { [TASK]: 'dismissed', [OTHER]: 'start_failed' } });
  const restarted = createTaskProposals({ getConfig: () => JSON.parse(JSON.stringify(s.config)), save() {}, emit() {}, sidebarSnapshot: () => ({}) });
  assert.deepEqual((await restarted.run({ operation: 'read' })).taskProposals, { parent: { [TASK]: 'dismissed' } });
});

test('a failing pending-list hook never fails the record', async () => {
  const s = setup({ settle: () => { throw new Error('tools not loaded'); } });
  const state = await s.store.run({ operation: 'outcome', parentId: 'parent', taskId: TASK, outcome: 'dismissed' });
  assert.deepEqual(state.taskProposals, { parent: { [TASK]: 'dismissed' } });
});

test('the default hook reaches the agent tools\' spawn_task list (same module the agent tools host imports)', async () => {
  const session = await import('../electron/agent-tools/session.mjs');
  session.resetSuggestions();
  const spawn = session.tools.find((entry) => entry.name === 'spawn_task').handler;
  const ctx = { sessionId: 'parent', cwd: '/tmp' };
  const first = /task_id: (task_[0-9a-f]{8})/.exec(await spawn({ title: 'First', tldr: 't', prompt: 'p' }, ctx))[1];
  const config = { threadIds: ['parent', 'child'], archivedThreadIds: [], sessionMetadata: {} };
  const store = createTaskProposals({ getConfig: () => config, save() {}, emit() {}, sidebarSnapshot: () => ({}) });
  await store.run({ operation: 'outcome', parentId: 'parent', taskId: first, outcome: 'dismissed' });
  const next = await spawn({ title: 'Second', tldr: 't', prompt: 'p' }, ctx);
  assert.match(next, /^Noted \(position 1, /);
  assert.ok(!next.includes(first), next);
  session.resetSuggestions();
});

test('main.cjs: one "task-proposals" dispatch inside desktop:call, over the config, save, emit and sidebar snapshot it already has', () => {
  const main = fs.readFileSync(new URL('../electron/main.cjs', import.meta.url), 'utf8');
  const line = 'case "task-proposals": return require("./task-proposals.cjs").run(p, { getConfig: () => config, save, emit, sidebarSnapshot,\n        isForeign: (id) => !!coworkSessions?.owns(id) });';
  assert.equal(count(main, line), 1);
  const handler = main.indexOf('ipcMain.handle("desktop:call"'), at = main.indexOf(line);
  assert.ok(handler > 0 && at > handler && at < main.indexOf('case "session-ack": {'), 'among the desktop:call actions, beside the task backlog');
  // No file of its own: the module only reaches config through the deps above.
  const source = fs.readFileSync(new URL('../electron/task-proposals.cjs', import.meta.url), 'utf8');
  assert.doesNotMatch(source, /require\("node:fs"\)|writeFile|app\.getPath/);
});

test('the launcher\'s requests (src/proposal-launch.mjs, R4f-proposal P3) are the ones this channel takes', async () => {
  const { TASK_PROPOSALS_CHANNEL, PROPOSAL_OUTCOMES, proposalStartedRequest, proposalOutcomeRequest } = await import('../src/proposal-launch.mjs');
  assert.equal(TASK_PROPOSALS_CHANNEL, 'task-proposals');
  const s = setup();
  await s.store.run(proposalStartedRequest({ parentId: 'parent', childId: 'child', taskId: TASK }));
  assert.equal(s.config.sessionMetadata.child.spawnedFrom.taskId, TASK);
  for (const outcome of PROPOSAL_OUTCOMES) {
    const state = await s.store.run(proposalOutcomeRequest({ parentId: 'parent', taskId: OTHER, outcome }));
    assert.equal(state.taskProposals.parent[OTHER], outcome);
  }
  // sessionId names the opened session too when childId is absent; the two never disagree.
  const t = setup();
  await t.store.run({ operation: 'started', parentId: 'parent', sessionId: 'child', taskId: TASK });
  assert.equal(t.config.sessionMetadata.child.spawnedFrom.sessionId, 'parent');
  await assert.rejects(t.store.run({ operation: 'started', parentId: 'parent', childId: 'other', sessionId: 'child', taskId: OTHER }), /Unknown session/);
});
