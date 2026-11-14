// MiniMax Code source (electron/chat-import/sources/minimax.mjs) against a runtime-state.sqlite synthesised here with
// upstream's DDL (local-runtime-v2 infra/db/migrations/session/migration-0006-session-storage-ddl.ts:1-96, plus
// history_relative_dir from migration 0021) and display rows in the shapes mcode writes (agent-core
// event-bridge/converters.ts, session-system/messages/user-message-commit-service.ts). No real sessions.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import * as minimax from '../electron/chat-import/sources/minimax.mjs';

const DDL = `
  CREATE TABLE local_runtime_sessions (
    session_id TEXT PRIMARY KEY, record_json TEXT NOT NULL, updated_at_ms INTEGER NOT NULL,
    columnar_version INTEGER NOT NULL DEFAULT 0, agent_name TEXT, runtime TEXT, session_type TEXT, status TEXT,
    archived INTEGER NOT NULL DEFAULT 0, visibility TEXT NOT NULL DEFAULT 'visible',
    session_kind TEXT NOT NULL DEFAULT 'unknown' CHECK (session_kind IN ('conversation', 'task', 'peek', 'channel', 'cron', 'unknown')),
    purpose TEXT, purpose_kind TEXT NOT NULL DEFAULT '', origin_cron_id TEXT, parent_session_id TEXT, workspace_dir TEXT,
    project_workspace_dir TEXT, is_default_workspace INTEGER NOT NULL DEFAULT 0 CHECK (is_default_workspace IN (0, 1)),
    title TEXT, created_at_ms INTEGER, error_message TEXT, error_code INTEGER, extra_data_json TEXT NOT NULL DEFAULT '{}',
    project_id INTEGER, history_relative_dir TEXT
  );
  CREATE TABLE local_runtime_messages (session_id TEXT PRIMARY KEY, display_messages_json TEXT NOT NULL, pi_history_json TEXT NOT NULL);
  CREATE TABLE local_runtime_message_rows (
    id INTEGER PRIMARY KEY AUTOINCREMENT, session_id TEXT NOT NULL, msg_id TEXT NOT NULL, role TEXT, turn_id TEXT, source TEXT,
    source_context_json TEXT, created_at_ms INTEGER NOT NULL, data_json TEXT NOT NULL
  );
  CREATE UNIQUE INDEX local_runtime_message_rows_session_message ON local_runtime_message_rows(session_id, msg_id);
`;

const T0 = Date.UTC(2026, 9, 20, 8, 0);
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'ich-minimax-'));
const home = path.join(tmp, 'home');
const dbFile = path.join(home, '.minimax', 'v2', 'sqlite', 'runtime-state.sqlite');
test.after(() => fs.rmSync(tmp, { recursive: true, force: true }));

function session(db, id, fields = {}) {
  const record = { sessionId: id, agentName: 'main', workspaceDir: fields.cwd ?? '/work/app', runtime: 'pi-agent', sessionType: fields.type ?? 'root',
    sessionKind: fields.kind ?? 'conversation', archived: fields.archived === true, status: 'idle', title: fields.title ?? null, createdAtMs: fields.created ?? T0, updatedAtMs: fields.updated ?? T0 };
  const columnar = fields.columnar ?? 3;
  db.prepare(`INSERT INTO local_runtime_sessions (session_id, record_json, updated_at_ms, columnar_version, agent_name, runtime, session_type, status,
    archived, visibility, session_kind, parent_session_id, workspace_dir, title, created_at_ms, extra_data_json)
    VALUES (?, ?, ?, ?, ?, 'pi-agent', ?, 'idle', ?, ?, ?, ?, ?, ?, ?, ?)`).run(id, JSON.stringify(record), fields.updated ?? T0, columnar,
    columnar >= 3 ? 'main' : null, columnar >= 3 ? record.sessionType : null, columnar >= 3 && fields.archived ? 1 : 0, fields.visibility ?? 'visible',
    columnar >= 3 ? record.sessionKind : 'unknown', fields.parent ?? null, columnar >= 3 ? record.workspaceDir : null, columnar >= 3 ? record.title : null,
    columnar >= 3 ? record.createdAtMs : null, JSON.stringify(fields.extra ?? {}));
}
function row(db, sessionId, message, { source = null, turn = 'turn-1' } = {}) {
  db.prepare('INSERT INTO local_runtime_message_rows (session_id, msg_id, role, turn_id, source, created_at_ms, data_json) VALUES (?, ?, ?, ?, ?, ?, ?)')
    .run(sessionId, message.msg_id, message.role ?? null, turn, source, message.timestamp ?? T0, JSON.stringify({ ...message, turnId: turn, ...(source ? { source } : {}) }));
}

{
  fs.mkdirSync(path.dirname(dbFile), { recursive: true });
  const db = new DatabaseSync(dbFile);
  db.exec('PRAGMA journal_mode = WAL');
  db.exec(DDL);
  session(db, 'sess-main', { title: 'Fix the parser', cwd: '/work/app', created: T0, updated: T0 + 60000, extra: { effectiveModel: 'minimax/MiniMax-M3' } });
  row(db, 'sess-main', { msg_id: 'msg-user-v1-a', role: 'user', msg_content: 'Why does the parser fail?', msg_type: 1, timestamp: T0 + 1000,
    attachments: [{ type: 'image', file_path: '/tmp/shot.png', file_name: 'shot.png', mime_type: 'image/png' }, { meta: { fileName: 'notes.txt', mimeType: 'text/plain' }, local: { filePath: '/tmp/notes.txt' } }] });
  row(db, 'sess-main', { msg_id: 'msg-a1', role: 'assistant', msg_type: 2, timestamp: T0 + 2000, thinking_content: 'Look at the file first.', msg_content: 'Let me read it.',
    tool_calls: [
      { tool_name: 'read', tool_call_id: 'call-1', tool_call_status: 2, tool_call_args: JSON.stringify({ path: '/work/app/parser.js' }), tool_call_result_data: JSON.stringify({ content: [{ type: 'text', text: 'const x = 1' }, { type: 'image', data: 'AAAA' }] }) },
      { tool_name: 'bash', tool_call_id: 'call-2', tool_call_status: 3, tool_call_args: JSON.stringify({ command: 'npm test' }), tool_call_result_data: JSON.stringify({ error: 'exit 1' }) },
      { tool_name: 'edit', tool_call_id: 'call-3', tool_call_status: 1, tool_call_args: JSON.stringify({ path: '/work/app/parser.js' }) },
    ] });
  row(db, 'sess-main', { msg_id: 'exec-diag-1', msg_type: 3, msg_content: JSON.stringify({ eventType: 'execution.diagnostic' }), timestamp: T0 + 2500 });
  row(db, 'sess-main', { msg_id: 'compaction-att-1', role: 'assistant', kind: 'compaction_start', timestamp: T0 + 2600 });
  row(db, 'sess-main', { msg_id: 'compaction-att-2', role: 'assistant', kind: 'compaction', timestamp: T0 + 2700 });
  row(db, 'sess-main', { msg_id: 'msg-user-bg', role: 'user', msg_content: '<background-task-finished>\ndone\n</background-task-finished>', kind: 'background-task-terminal', timestamp: T0 + 3000 }, { source: 'background-task', turn: 'turn-2' });
  row(db, 'sess-main', { msg_id: 'msg-a2', role: 'assistant', msg_type: 1, msg_content: 'Fixed: the regex was greedy.', timestamp: T0 + 4000 }, { turn: 'turn-2' });
  row(db, 'sess-main', { msg_id: 'msg-a3', role: 'assistant', msg_type: 1, msg_content: 'Request failed: 1008', msg_content_source: 'system_error', timestamp: T0 + 5000 }, { turn: 'turn-3' });

  session(db, 'sess-child', { title: 'Delegate', kind: 'task', type: 'branch', parent: 'sess-main', visibility: 'hidden', updated: T0 + 70000 });
  row(db, 'sess-child', { msg_id: 'c1', role: 'user', msg_content: 'Sub task', timestamp: T0 });
  session(db, 'sess-peek', { kind: 'peek', updated: T0 + 80000 });
  row(db, 'sess-peek', { msg_id: 'p1', role: 'user', msg_content: 'Side question', timestamp: T0 });
  session(db, 'sess-empty', { title: 'Nothing yet', updated: T0 + 90000 });

  // A pre-columnar row whose display messages were never backfilled into rows (legacy display array).
  session(db, 'sess-legacy', { title: 'Old one', cwd: '/work/old', columnar: 0, created: T0 - 86400000, updated: T0 - 3600000, archived: true });
  db.prepare('INSERT INTO local_runtime_messages (session_id, display_messages_json, pi_history_json) VALUES (?, ?, ?)').run('sess-legacy', JSON.stringify([
    { msg_id: 'l1', role: 'user', msg_content: 'Legacy prompt', timestamp: T0 - 86000000 },
    { msg_id: 'l2', role: 'assistant', msg_content: 'Legacy answer', parts: [{ type: 'thinking', content: 'hmm' }, { type: 'text', content: 'Legacy answer' }, { type: 'tool', toolCall: { tool_name: 'grep', tool_call_id: 'g1', tool_call_status: 2, tool_call_result_data: '"3 matches"' } }] },
  ]), '[]');
  db.close();
}

const ctx = (extra = {}) => ({ home, env: {}, cache: new Map(), ...extra });

test('minimax roots: MINIMAX_DATA_DIR, MAVIS_DATA_DIR, ~/.minimax, ~/.mavis', () => {
  const roots = minimax.roots({ home: '/h', env: { MINIMAX_DATA_DIR: '/data/mm', MAVIS_DATA_DIR: '/data/mv' } });
  assert.deepEqual(roots, ['/data/mm', '/data/mv', '/h/.minimax', '/h/.mavis'].map(dir => path.join(dir, 'v2', 'sqlite', 'runtime-state.sqlite')));
  assert.equal(minimax.id, 'minimax');
  assert.equal(minimax.label, 'MiniMax Code');
});

test('minimax list: columnar and pre-columnar sessions, peek/hidden/empty left out, sub-agents on request', async () => {
  const list = await minimax.list(ctx());
  assert.deepEqual(list.map(summary => summary.sourceId), ['sess-main', 'sess-legacy']);
  const main = list[0];
  assert.equal(main.key, 'minimax:sess-main');
  assert.equal(main.title, 'Fix the parser');
  assert.equal(main.cwd, '/work/app');
  assert.equal(main.model, 'minimax/MiniMax-M3');
  assert.equal(main.firstPrompt, 'Why does the parser fail?');
  assert.equal(main.createdAt, T0);
  assert.equal(main.updatedAt, T0 + 60000);
  assert.equal(main.messageCount, 5, 'user + assistant rows; system events and compaction frames excluded');
  assert.equal(main.sourcePath, dbFile);
  assert.equal(main.experimental, true);
  const legacy = list[1];
  assert.equal(legacy.title, 'Old one');
  assert.equal(legacy.cwd, '/work/old', 'record_json fills a pre-columnar row');
  assert.equal(legacy.archived, true);
  assert.equal(legacy.firstPrompt, 'Legacy prompt');
  assert.equal(legacy.schema, 'legacy-display');

  const all = await minimax.list(ctx({ includeSubagents: true }));
  const child = all.find(summary => summary.sourceId === 'sess-child');
  assert.ok(child?.isSubagent);
  assert.equal(child.parentId, 'sess-main');
  assert.ok(!all.some(summary => summary.sourceId === 'sess-peek'), 'a side question never lists');
  assert.equal((await minimax.list(ctx({ exclude: [path.join(home, '.minimax')] }))).length, 0, 'exclude by directory');
});

test('minimax list: MINIMAX_DATA_DIR wins, a linked ~/.mavis is read once', async () => {
  const other = path.join(tmp, 'other-home');
  fs.mkdirSync(other, { recursive: true });
  fs.symlinkSync(path.join(home, '.minimax'), path.join(other, '.mavis'));
  const viaLink = await minimax.list({ home: other, env: {} });
  assert.deepEqual(viaLink.map(summary => summary.sourceId), ['sess-main', 'sess-legacy']);
  const viaEnv = await minimax.list({ home: path.join(tmp, 'nobody'), env: { MINIMAX_DATA_DIR: path.join(home, '.minimax') } });
  assert.equal(viaEnv.length, 2);
  assert.deepEqual(await minimax.list({ home: path.join(tmp, 'nobody'), env: {} }), []);
});

test('minimax read: user with attachments, reasoning, tool calls and results, injected rows, compaction', async () => {
  const session = await minimax.read('minimax:sess-main', ctx());
  assert.ok(session.items.every((item, index) => item.seq === index));
  assert.deepEqual(session.items.map(item => item.kind), ['user', 'reasoning', 'assistant', 'tool_call', 'tool_result', 'tool_call', 'tool_result', 'tool_call', 'compaction', 'injected', 'assistant', 'injected']);
  const [user, reasoning, reply, read1, result1, bash, bashResult, edit, compaction, background, fixed, error] = session.items;
  assert.equal(user.parts[0].text, 'Why does the parser fail?');
  assert.deepEqual(user.parts[1], { image: { mime: 'image/png', path: '/tmp/shot.png' } });
  assert.deepEqual(user.parts[2], { file: { name: 'notes.txt', path: '/tmp/notes.txt', mime: 'text/plain' } });
  assert.equal(user.ts, T0 + 1000);
  assert.equal(reasoning.reasoning.text, 'Look at the file first.');
  assert.equal(reply.parts[0].text, 'Let me read it.');
  assert.equal(read1.tool.name, 'read');
  assert.equal(read1.tool.callId, 'call-1');
  assert.deepEqual(read1.tool.args, { path: '/work/app/parser.js' });
  assert.equal(result1.result.text, 'const x = 1', 'image blocks of a result are left out');
  assert.equal(result1.result.isError, false);
  assert.equal(bash.tool.category, 'shell');
  assert.equal(bashResult.result.isError, true);
  assert.equal(bashResult.result.text, 'exit 1');
  assert.equal(edit.tool.category, 'edit', 'a call still running has no result');
  assert.equal(compaction.compaction.summary, null);
  assert.match(background.parts[0].text, /background-task-finished/);
  assert.equal(fixed.parts[0].text, 'Fixed: the regex was greedy.');
  assert.equal(error.parts[0].text, 'Request failed: 1008');
  assert.equal(session.messageCount, 3);
  assert.ok(session.warnings.some(text => /compaction/.test(text)));
  assert.equal(session.model, 'minimax/MiniMax-M3');
});

test('minimax read: legacy display array with ordered parts; unknown id', async () => {
  const session = await minimax.read('sess-legacy', ctx());
  assert.deepEqual(session.items.map(item => item.kind), ['user', 'reasoning', 'assistant', 'tool_call', 'tool_result']);
  assert.equal(session.items[4].result.text, '3 matches');
  await assert.rejects(minimax.read('minimax:nope', ctx()), /not found/);
});

test('minimax read: the database is opened read-only (no write, no checkpoint)', async () => {
  const before = fs.statSync(dbFile).mtimeMs;
  const wal = fs.existsSync(`${dbFile}-wal`) ? fs.statSync(`${dbFile}-wal`).size : null;
  await minimax.read('minimax:sess-main', ctx());
  assert.equal(fs.statSync(dbFile).mtimeMs, before);
  if (wal !== null) assert.equal(fs.statSync(`${dbFile}-wal`).size, wal);
});

test('minimax itemsOfMessages: fork-origin markers and review frames are not conversation', () => {
  const { items } = minimax.itemsOfMessages([
    { msg_id: 'f', role: 'assistant', kind: 'fork-origin', msg_content: 'Forked from …' },
    { msg_id: 'r', role: 'assistant', kind: 'review_result', msg_content: 'Review: pass' },
    { msg_id: 'u', role: 'user', msg_content: '<system-reminder>x</system-reminder>' },
    { msg_id: 'a', role: 'assistant', toolCalls: [{ name: 'web_search', id: 'w', status: 'completed', output: { output: 'hits' } }] },
  ]);
  assert.deepEqual(items.map(item => item.kind), ['injected', 'injected', 'tool_call', 'tool_result']);
  assert.equal(items[2].tool.category, 'web');
  assert.equal(items[3].result.text, 'hits');
});

test('minimax read: rows within the per-session budget, newest kept, with a warning', async () => {
  const whole = await minimax.read('minimax:sess-main', ctx());
  const capped = await minimax.read('minimax:sess-main', ctx({ readBudget: { maxRows: 2 } }));
  assert.ok(capped.warnings.includes('Only the newest part of this very long session was read.'));
  assert.ok(!whole.warnings.includes('Only the newest part of this very long session was read.'));
  assert.ok(capped.items.length > 0 && capped.items.length < whole.items.length);
  assert.deepEqual(capped.items.at(-1).parts, whole.items.at(-1).parts, 'the newest row is the one kept');
});
