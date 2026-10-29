import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { coworkHomeState } from '../src/cowork-home-model.mjs';
// 3.6556.2 shared-104 _x (export ml), the live-status function of the Cowork rows; a pure chat target with no imports
// (E42), so plain node loads it.
import { sessionLiveStatus as liveStatus } from '../src/generated/chat/shared-104-CTONUSaz.js';

const OFFICIAL = path.resolve(import.meta.dirname, '../../reference/snapshots/claude-3.6556.2-20261025-192807/ion-dist/assets/v1');
const official = name => fs.readFileSync(path.join(OFFICIAL, name), 'utf8');

test('Cowork home excludes Code, Chat, archives and child threads while retaining real task metadata', () => {
  const sessions = ['code', 'chat', 'task', 'archived', 'child', 'legacy-child'].map(id => ({ id, name: ` ${id} `, updatedAt: 1700000000 }));
  sessions[3].isArchived = true;
  sessions[5].source = { subAgent: { review: {} } };
  const metadata = Object.fromEntries(sessions.map(row => [row.id, { surface: row.id === 'code' ? undefined : row.id === 'chat' ? 'chat' : 'cowork' }]));
  metadata.task.pinned = true;
  const result = coworkHomeState(sessions, metadata, { threadParents: { child: 'task' } });
  assert.deepEqual(result.rows.map(row => row.sessionId), ['task']);
  assert.equal(result.rows[0].title, 'task');
  assert.equal(result.rows[0].isStarred, true);
  assert.equal(result.rows[0].lastActivityAt, 1700000000000);
});

test('nested approvals belong to their navigable parent and override running in the official status function', () => {
  const approval = { method: 'item/tool/requestUserInput', params: { threadId: 'grandchild' } };
  const data = coworkHomeState([{ id: 'task', updatedAt: 1700000000 }], { task: { surface: 'cowork' } }, {
    approvals: [approval], threadParents: { grandchild: 'child', child: 'task' }, active: { task: 'turn-id' },
  });
  assert.deepEqual(data.permissions.get('task'), [approval]);
  assert.equal(data.attentionIds.has('task'), true);
  assert.equal(data.rows[0].isRunning, true);
  assert.equal(liveStatus(data.rows[0]), 'awaiting');
});

// 3.6556.2 isUnread is shared-2 eK (routines-shared slices it, unexported and store-bound; D1: no second copy here):
//   function eK(e,t){if(!t)return!1;let n=t.sessions[e.sessionId],r=!!t.explicitUnread?.[e.sessionId]||n===0;
//   if(e.unread===!1&&!r&&!CG())return!1;let i=e.lastActivityAt??e.createdAt??0;return n===void 0?i>t.initializedAt:i>n}
// CG() is the GrowthBook gate SG="__gb__3873045074", off by default (R15), and the host rows carry no `unread` key, so
// the early return never applies: a row is unread exactly when its read mark is 0 (or absent and newer than
// initializedAt) or its last activity is newer than the mark. The expectations below are eK's results for these rows.
test('official 3.6556.2 eK: the unread predicate the read state below is shaped for', () => {
  const shared2 = official('shared-2-TF8v67kg.js');
  for (const feature of ['r=!!t.explicitUnread?.[e.sessionId]||n===0;if(e.unread===!1&&!r&&!CG())return!1',
    'let i=e.lastActivityAt??e.createdAt??0;return n===void 0?i>t.initializedAt:i>n}', 'SG="__gb__3873045074"', 'function CG(){return Wi(SG)===!0}'])
    assert.equal(shared2.split(feature).length, 2, feature);
  const shared104 = official('shared-104-CTONUSaz.js');
  assert.match(shared104, /\b_x as ml\b/);
  assert.equal(String(liveStatus).replace(/\s+/g, '').includes('e.liveStatus==="awaiting"?"awaiting":e.liveStatus?e.liveStatus:!n&&e.pendingToolPermissions?.length?"awaiting":e.isRunning?"running":"idle"'), true);
});

test('source unread predicate tracks persisted read metadata without marking pins read or altering records', () => {
  const sessions = [{ id: 'task', updatedAt: 1700000000 }, { id: 'newer', updatedAt: '2024-01-01T00:00:00Z' }];
  const metadata = { task: { surface: 'cowork', unread: true, pinned: true }, newer: { surface: 'cowork', unread: false } };
  const data = coworkHomeState(sessions, metadata, {});
  assert.deepEqual(data.rows.map(row => row.sessionId), ['newer', 'task']);
  // No row carries `unread` (eK's gated early return is unreachable) and there is no explicitUnread map.
  assert.equal(data.rows.some(row => 'unread' in row), false);
  assert.deepEqual(data.readState, { initializedAt: 0, sessions: { newer: Date.parse('2024-01-01T00:00:00Z'), task: 0 } });
  // Literal eK results (true/false as before the 3.6556.2 retarget): eK(task) = true (n === 0, 1700000000000 > 0);
  // eK(newer) = false (n is its own lastActivityAt). eK reduced to these inputs (gate off, no `unread`, no
  // explicitUnread, every row has a mark) is `i > n`, checked here against the literals rather than re-sliced.
  const expected = { newer: false, task: true };
  for (const row of data.rows) assert.equal(row.lastActivityAt > data.readState.sessions[row.sessionId], expected[row.sessionId], row.sessionId);
  const read = coworkHomeState(sessions, { ...metadata, task: { ...metadata.task, unread: false } }, {});
  assert.deepEqual(read.readState.sessions, { newer: Date.parse('2024-01-01T00:00:00Z'), task: 1700000000000 });
  // eK(task) after reading = false.
  assert.equal(read.rows[1].lastActivityAt > read.readState.sessions.task, false);
  assert.equal(read.rows[1].isStarred, true);
  assert.equal(metadata.task.unread, true);
});

// w11-sweep-rest (w10-chat-tests review): the two checks above were weaker than their comments. These pin the whole
// official declarations and run them on the host rows.
test('sessionLiveStatus is the whole official _x (signature included) and every branch answers as in 3.6556.2', () => {
  const decl = 'function _x(e,t=!1,n=!1){return t||e.liveStatus==="awaiting"?"awaiting":e.liveStatus?e.liveStatus:!n&&e.pendingToolPermissions?.length?"awaiting":e.isRunning?"running":"idle"}';
  assert.equal(official('shared-104-CTONUSaz.js').split(decl).length, 2);
  const generated = fs.readFileSync(path.resolve(import.meta.dirname, '../src/generated/chat/shared-104-CTONUSaz.js'), 'utf8');
  const body = generated.slice(generated.indexOf('function _x('), generated.indexOf('export {'));
  // prettier only adds whitespace and the statement's `;` before the closing brace.
  assert.equal(body.replace(/\s+/g, '').replace(/;\}$/, '}'), decl.replace(/\s+/g, ''));
  assert.equal(liveStatus.length, 1, 'two defaulted parameters');
  const cases = [
    [[{ isRunning: true }, true], 'awaiting'], // t|| : the caller's pending flag wins
    [[{ liveStatus: 'awaiting' }], 'awaiting'], [[{ liveStatus: 'error' }], 'error'],
    [[{ pendingToolPermissions: [1], isRunning: true }], 'awaiting'],
    [[{ pendingToolPermissions: [1], isRunning: true }, false, true], 'running'], // !n: permissions ignored
    [[{ pendingToolPermissions: [] }], 'idle'], [[{ isRunning: true }], 'running'], [[{}], 'idle'],
  ];
  for (const [args, expected] of cases) assert.equal(liveStatus(...args), expected, JSON.stringify(args));
});

test('isUnread: the official eK (gate CG off by default) evaluated on the host read state', () => {
  const decl = 'function eK(e,t){if(!t)return!1;let n=t.sessions[e.sessionId],r=!!t.explicitUnread?.[e.sessionId]||n===0;if(e.unread===!1&&!r&&!CG())return!1;let i=e.lastActivityAt??e.createdAt??0;return n===void 0?i>t.initializedAt:i>n}';
  assert.equal(official('shared-2-TF8v67kg.js').split(decl).length, 2);
  // The declaration text checked above, bound to CG = the GrowthBook default (off, R15). A pure function of its two
  // arguments; nothing else of the chunk is evaluated.
  const eK = new Function('CG', `${decl};return eK;`)(() => false);
  const sessions = [{ id: 'task', updatedAt: 1700000000 }, { id: 'newer', updatedAt: '2024-01-01T00:00:00Z' }];
  const metadata = { task: { surface: 'cowork', unread: true }, newer: { surface: 'cowork', unread: false } };
  const data = coworkHomeState(sessions, metadata, {});
  assert.deepEqual(Object.fromEntries(data.rows.map(row => [row.sessionId, eK(row, data.readState)])), { newer: false, task: true });
  const read = coworkHomeState(sessions, { ...metadata, task: { ...metadata.task, unread: false } }, {});
  assert.deepEqual(Object.fromEntries(read.rows.map(row => [row.sessionId, eK(row, read.readState)])), { newer: false, task: false });
  assert.equal(eK(data.rows[0], undefined), false);
});
