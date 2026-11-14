// Import Chat History: the ZCode parser (electron/chat-import/sources/zcode.mjs) against a synthetic session database
// built here in ZCode's schema (apps/zcode-cli/packages/adapters/src/storage/session-store/schema.baseline.sql) with
// rows shaped as its store writes them (repositories/messages.ts saveMessage / savePart: data = the record minus its
// ids). No real ZCode data.
import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import * as zcode from '../electron/chat-import/sources/zcode.mjs';

const SCHEMA = `
CREATE TABLE session (id text primary key, project_id text not null, workspace_id text, parent_id text, slug text not null,
  directory text not null, path text, title text not null, version text not null, share_url text, summary_additions integer,
  summary_deletions integer, summary_files integer, summary_diffs text, revert text, permission text, time_created integer not null,
  time_updated integer not null, time_compacting integer, time_archived integer, task_type text not null default 'interactive',
  title_source text not null default 'first_input', title_message_id text, time_title_updated integer, trace_id text, time_deleted integer, last_outcome text);
CREATE TABLE message (id text primary key, session_id text not null references session(id) on delete cascade, time_created integer not null,
  time_updated integer not null, data text not null, sequence integer);
CREATE TABLE part (id text primary key, message_id text not null references message(id) on delete cascade, session_id text not null,
  time_created integer not null, time_updated integer not null, data text not null, sequence integer);`;

const T0 = Date.UTC(2026, 9, 20, 8, 0);
const CWD = '/Users/someone/project';

function buildDb(file) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const db = new DatabaseSync(file);
  db.exec(SCHEMA);
  let clock = T0;
  const session = (id, fields = {}) => db.prepare(`insert into session (id, project_id, parent_id, slug, directory, path, title, title_source, version, revert,
    time_created, time_updated, time_archived, task_type, time_deleted) values (?, 'p', ?, ?, ?, ?, ?, ?, '1.2.0', ?, ?, ?, ?, ?, ?)`)
    .run(id, fields.parent ?? null, id, fields.cwd ?? CWD, fields.cwd ?? CWD, fields.title ?? 'A session', fields.titleSource ?? 'generated',
      fields.revert ? JSON.stringify(fields.revert) : null, T0, fields.updated ?? T0 + 1000, fields.archived ?? null, fields.taskType ?? 'interactive', fields.deleted ?? null);
  const message = (sessionId, messageId, info, parts = []) => {
    const at = (clock += 10);
    db.prepare(`insert into message (id, session_id, time_created, time_updated, data, sequence) values (?, ?, ?, ?, ?, (select coalesce(max(sequence), -1) + 1 from message where session_id = ?))`)
      .run(messageId, sessionId, at, at, JSON.stringify({ time: { created: at, ...(info.role === 'assistant' ? { completed: at + 5 } : {}) }, agent: 'zcode-agent', ...info }), sessionId);
    parts.forEach((part, index) => db.prepare(`insert into part (id, message_id, session_id, time_created, time_updated, data, sequence) values (?, ?, ?, ?, ?, ?, (select coalesce(max(sequence), -1) + 1 from part where message_id = ?))`)
      .run(`prt_${messageId}_${String(index).padStart(2, '0')}`, messageId, sessionId, at, at, JSON.stringify(part), messageId));
  };
  const user = (text, extra = {}) => ({ role: 'user', model: {}, ...extra });
  const assistant = (extra = {}) => ({ role: 'assistant', parentID: 'x', modelId: 'glm-5', providerId: 'zai', mode: 'build', path: { cwd: CWD, root: CWD }, cost: 0, tokens: { input: 1, output: 1, reasoning: 0, cache: { read: 0, write: 0 } }, finish: 'stop', ...extra });

  // The main session: every message and part shape the parser maps.
  session('sess_main', { title: 'Fix the build', updated: T0 + 9000 });
  message('sess_main', 'msg_m1', user(), [
    { type: 'text', text: '<code-desktop-instructions>\nThe user\'s standing instructions for this session (from OpenClaude Desktop). Follow them.\n\nBe brief.\n</code-desktop-instructions>\n\nFix the build please' },
    { type: 'file', mime: 'image/png', url: 'file:///tmp/shot%201.png', filename: 'shot 1.png' },
    { type: 'text', text: '<system-reminder>env</system-reminder>', synthetic: true },
  ]);
  message('sess_main', 'msg_m2', assistant(), [
    { type: 'step-start' },
    { type: 'reasoning', text: 'Look at the failing target first.', time: { start: T0 + 100 } },
    { type: 'text', text: 'Running the build.' },
    { type: 'tool', callID: 'call_1', tool: 'Bash', state: { status: 'completed', input: { command: 'npm run build' }, output: 'ok\n', title: 'npm run build', metadata: {}, time: { start: T0 + 200, end: T0 + 300 } } },
    { type: 'tool', callID: 'call_2', tool: 'Edit', state: { status: 'error', input: { file_path: '/x' }, error: 'The user rejected the edit', time: { start: T0 + 310, end: T0 + 320 } } },
    { type: 'tool', callID: 'call_3', tool: 'Read', state: { status: 'running', input: { file_path: '/y' }, time: { start: T0 + 330 } } },
    { type: 'subtask', prompt: 'scan', description: 'Scan the repo', agent: 'explore' },
    { type: 'step-finish', reason: 'stop', cost: 0, tokens: { input: 1, output: 1, reasoning: 0, cache: { read: 0, write: 0 } } },
  ]);
  message('sess_main', 'msg_m3', user('', { synthetic: true, source: 'background_task', semantics: { origin: 'agent_runtime', kind: 'background_notification', uiVisibility: 'hidden', providerVisibility: 'visible', transcriptVisibility: 'hidden' } }), [{ type: 'text', text: 'Background task finished' }]);
  message('sess_main', 'msg_m4', user('', { summary: { title: 'Compact summary', body: 'We fixed the build.', diffs: [] }, semantics: { origin: 'agent_runtime', kind: 'compact_summary', uiVisibility: 'hidden', providerVisibility: 'visible', transcriptVisibility: 'hidden' } }), [
    { type: 'text', text: 'This session is being continued…', synthetic: true }, { type: 'compaction', auto: true },
  ]);
  message('sess_main', 'msg_m5', user('', { semantics: { origin: 'real_user', kind: 'user_prompt', uiVisibility: 'visible', providerVisibility: 'visible', transcriptVisibility: 'visible' } }), [{ type: 'text', text: 'Now the tests' }]);
  message('sess_main', 'msg_m6', assistant({ modelId: undefined, providerId: undefined, modelID: 'glm-4.6', providerID: 'bigmodel' }), [{ type: 'text', text: 'Tests pass.' }, { type: 'timeline', timelineType: 'model_change', display: 'separator' }]);

  // A rewound session: the cut branch and ZCode's acknowledgement are not the conversation.
  session('sess_rewind', { title: 'Rewound', revert: { targetMessageID: 'msg_r3', branchCutAfterMessageID: 'msg_r4' } });
  message('sess_rewind', 'msg_r1', user(), [{ type: 'text', text: 'first' }]);
  message('sess_rewind', 'msg_r2', assistant(), [{ type: 'text', text: 'reply one' }]);
  message('sess_rewind', 'msg_r3', user(), [{ type: 'text', text: 'dropped prompt' }]);
  message('sess_rewind', 'msg_r4', assistant(), [{ type: 'text', text: 'Rewound conversation to before message msg_r3.' }]);
  message('sess_rewind', 'msg_r5', user(), [{ type: 'text', text: 'second try' }]);

  // A session ZCode imported itself (persistImportedSessionHistory) and a shared-context import (model-only).
  session('sess_imported', { title: 'From Claude', titleSource: 'custom' });
  message('sess_imported', 'msg_sess_imported_import_0', user('', { metadata: { migrationSource: 'claudeCode' } }), [{ type: 'text', text: 'old question', metadata: { migrationSource: 'claudeCode' } }]);
  message('sess_imported', 'msg_sess_imported_import_1', assistant({ modelId: undefined, providerId: undefined }), [{ type: 'text', text: 'old answer', metadata: { migrationSource: 'claudeCode' } }]);
  message('sess_imported', 'msg_shared', user('', { synthetic: true, source: 'shared_context', visibility: 'model-only', semantics: { origin: 'import', kind: 'shared_context', uiVisibility: 'hidden', providerVisibility: 'visible', transcriptVisibility: 'visible' } }), [{ type: 'text', text: '# Shared conversation' }]);

  // Children, forks, deleted and empty sessions.
  session('sess_child', { parent: 'sess_main', taskType: 'subagent_child', title: 'Explore' });
  message('sess_child', 'msg_c1', user(), [{ type: 'text', text: 'child prompt' }]);
  session('sess_fork', { parent: 'sess_main', taskType: 'fork', title: 'Fork of Fix the build', archived: T0 + 50, updated: T0 + 5000 });
  message('sess_fork', 'msg_f1', user(), [{ type: 'text', text: 'forked prompt' }]);
  session('sess_deleted', { deleted: T0 + 10 });
  message('sess_deleted', 'msg_d1', user(), [{ type: 'text', text: 'gone' }]);
  session('sess_empty', { title: 'New session', titleSource: 'default' });
  session('sess_untitled', { title: 'New session', titleSource: 'default', updated: T0 + 2000 });
  message('sess_untitled', 'msg_u1', user(), [{ type: 'text', text: 'untitled prompt' }]);
  db.close();
}

const home = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'ich-zcode-')));
const dbFile = path.join(home, '.zcode', 'cli', 'db', 'db.sqlite');
buildDb(dbFile);
test.after(() => fs.rmSync(home, { recursive: true, force: true }));
const ctx = (extra = {}) => ({ home, env: {}, cache: new Map(), ...extra });
const digest = file => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
const kinds = session => session.items.map(item => item.kind);
const texts = (session, kind) => session.items.filter(item => item.kind === kind).map(item => item.parts.map(part => part.text).join(''));

test('zcode roots: ~/.zcode/cli/db/db.sqlite, moved by ZCODE_DATA_BASE_DIR, the app’s data path, or storage.sessionDbPath', () => {
  assert.deepEqual(zcode.roots(ctx()), [dbFile]);
  assert.deepEqual(zcode.roots(ctx({ env: { ZCODE_DATA_BASE_DIR: '/Volumes/Data' } })), ['/Volumes/Data/.zcode/cli/db/db.sqlite']);
  const other = fs.mkdtempSync(path.join(os.tmpdir(), 'ich-zcode-home-'));
  try {
    fs.mkdirSync(path.join(other, '.zcode', 'v2'), { recursive: true });
    fs.writeFileSync(path.join(other, '.zcode', 'v2', 'setting.json'), JSON.stringify({ dataBaseDir: '/Volumes/Moved' }));
    assert.deepEqual(zcode.roots({ home: other, env: {} }), ['/Volumes/Moved/.zcode/cli/db/db.sqlite']);
    fs.writeFileSync(path.join(other, '.zcode', 'v2', 'setting.json'), '{}');
    fs.mkdirSync(path.join(other, '.zcode', 'cli'), { recursive: true });
    fs.writeFileSync(path.join(other, '.zcode', 'cli', 'config.json'), JSON.stringify({ storage: { sessionDbPath: '~/elsewhere/s.sqlite' } }));
    assert.deepEqual(zcode.roots({ home: other, env: {} }), [path.join(other, 'elsewhere', 's.sqlite')]);
  } finally { fs.rmSync(other, { recursive: true, force: true }); }
});

test('zcode list: live sessions with messages, newest first; children only on request; deleted and empty ones never', async () => {
  const before = digest(dbFile);
  const list = await zcode.list(ctx());
  assert.deepEqual(list.map(summary => summary.sourceId), ['sess_main', 'sess_fork', 'sess_untitled', 'sess_rewind', 'sess_imported']);
  const main = list[0];
  assert.equal(main.key, 'zcode:sess_main');
  assert.equal(main.title, 'Fix the build');
  assert.equal(main.firstPrompt, 'Fix the build please', 'the bridge’s inlined instructions are not the prompt');
  assert.equal(main.cwd, CWD);
  assert.equal(main.model, 'bigmodel/glm-4.6', 'the latest reply’s model (legacy modelID/providerID read too)');
  assert.equal(main.createdAt, T0);
  assert.equal(main.updatedAt, T0 + 9000);
  assert.equal(main.experimental, true);
  assert.equal(main.isSubagent, false);
  const fork = list.find(summary => summary.sourceId === 'sess_fork');
  assert.equal(fork.isSubagent, false, 'a fork is the user’s own session');
  assert.equal(fork.parentId, 'sess_main');
  assert.equal(fork.archived, true);
  assert.equal(list.find(summary => summary.sourceId === 'sess_untitled').title, '', 'a default title is no title');
  const all = await zcode.list(ctx({ includeSubagents: true }));
  assert.equal(all.find(summary => summary.sourceId === 'sess_child')?.isSubagent, true);
  assert.equal(await zcode.list(ctx({ exclude: [path.join(home, '.zcode')] })).then(found => found.length), 0);
  assert.equal(digest(dbFile), before, 'read-only');
});

test('zcode read: prompts, replies, reasoning, tools, compaction, injected context, images', async () => {
  const before = digest(dbFile);
  const session = await zcode.read('zcode:sess_main', ctx());
  assert.deepEqual(kinds(session), ['injected', 'injected', 'user', 'reasoning', 'assistant', 'tool_call', 'tool_result', 'tool_call', 'tool_result', 'tool_call', 'subagent_ref', 'injected', 'compaction', 'user', 'assistant']);
  assert.ok(session.items.every((item, index) => item.seq === index));
  const prompt = session.items.find(item => item.kind === 'user');
  assert.equal(prompt.parts[0].text, 'Fix the build please');
  assert.deepEqual(prompt.parts[1], { image: { mime: 'image/png', path: '/tmp/shot 1.png' } });
  assert.match(texts(session, 'injected')[0], /^<code-desktop-instructions>/);
  assert.deepEqual(texts(session, 'assistant'), ['Running the build.', 'Tests pass.']);
  assert.equal(session.items.find(item => item.kind === 'reasoning').reasoning.text, 'Look at the failing target first.');
  const [bash, edit, read] = session.items.filter(item => item.kind === 'tool_call');
  assert.deepEqual([bash.tool.name, bash.tool.category, bash.tool.args.command, bash.tool.callId], ['Bash', 'shell', 'npm run build', 'call_1']);
  assert.equal(edit.tool.category, 'edit');
  assert.equal(read.tool.name, 'Read');
  const results = session.items.filter(item => item.kind === 'tool_result');
  assert.deepEqual(results.map(item => [item.result.callId, item.result.text, item.result.isError]), [['call_1', 'ok\n', false], ['call_2', 'The user rejected the edit', true]], 'a running tool has no result yet');
  assert.equal(session.items.find(item => item.kind === 'compaction').compaction.summary, 'We fixed the build.');
  assert.equal(texts(session, 'injected')[2], 'Background task finished');
  assert.equal(session.messageCount, 4);
  assert.equal(digest(dbFile), before, 'read-only');
});

test('zcode read: a rewind keeps the active branch; ZCode’s own imports read as plain turns, a shared context as injected', async () => {
  const rewound = await zcode.read({ ...(await zcode.list(ctx())).find(summary => summary.sourceId === 'sess_rewind') }, ctx());
  assert.deepEqual(rewound.items.map(item => `${item.kind}:${item.parts[0]?.text}`), ['user:first', 'assistant:reply one', 'user:second try']);
  const imported = await zcode.read('sess_imported', ctx());
  assert.deepEqual(imported.items.map(item => `${item.kind}:${item.parts[0]?.text}`), ['user:old question', 'assistant:old answer', 'injected:# Shared conversation']);
  await assert.rejects(zcode.read('zcode:sess_deleted', ctx()), /not found/);
});

test('zcode: no database, or not a ZCode one, lists nothing', async () => {
  const empty = fs.mkdtempSync(path.join(os.tmpdir(), 'ich-zcode-none-'));
  try {
    assert.deepEqual(await zcode.list({ home: empty, env: {} }), []);
    const file = path.join(empty, '.zcode', 'cli', 'db', 'db.sqlite');
    fs.mkdirSync(path.dirname(file), { recursive: true });
    const db = new DatabaseSync(file); db.exec('CREATE TABLE other (x)'); db.close();
    const warnings = [];
    assert.deepEqual(await zcode.list({ home: empty, env: {}, warn: (source, message) => warnings.push(`${source}: ${message}`) }), []);
    assert.match(warnings[0], /^zcode: .*no ZCode session tables/);
  } finally { fs.rmSync(empty, { recursive: true, force: true }); }
});

test('zcode list: one pass in index order (no per-session scans); rows without a sequence count as later, as ZCode orders them', async () => {
  const dir = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'ich-zcode-late-')));
  try {
    const file = path.join(dir, '.zcode', 'cli', 'db', 'db.sqlite');
    fs.mkdirSync(path.dirname(file), { recursive: true });
    const db = new DatabaseSync(file);
    db.exec(SCHEMA);
    db.exec(`CREATE INDEX message_session_sequence_idx on message(session_id, sequence, time_created, id);
      CREATE INDEX part_message_sequence_idx on part(message_id, sequence, time_created, id);`);
    db.prepare(`insert into session (id, project_id, slug, directory, title, title_source, version, time_created, time_updated) values ('s1', 'p', 's1', ?, 'New session', 'default', '1', ?, ?)`).run(CWD, T0, T0 + 1);
    const message = db.prepare('insert into message (id, session_id, time_created, time_updated, data, sequence) values (?, ?, ?, ?, ?, ?)');
    const part = db.prepare('insert into part (id, message_id, session_id, time_created, time_updated, data, sequence) values (?, ?, ?, ?, ?, ?, ?)');
    message.run('m_late', 's1', T0 + 9, T0 + 9, JSON.stringify({ role: 'assistant', modelId: 'late-model', providerId: 'zai' }), null);
    message.run('m_u_late', 's1', T0 + 8, T0 + 8, JSON.stringify({ role: 'user' }), null);
    part.run('p_late', 'm_u_late', 's1', T0 + 8, T0 + 8, JSON.stringify({ type: 'text', text: 'late prompt' }), 0);
    message.run('m_u1', 's1', T0, T0, JSON.stringify({ role: 'user', synthetic: true }), 0);
    part.run('p1', 'm_u1', 's1', T0, T0, JSON.stringify({ type: 'text', text: 'injected', synthetic: true }), 0);
    message.run('m_u2', 's1', T0 + 1, T0 + 1, JSON.stringify({ role: 'user' }), 1);
    part.run('p2', 'm_u2', 's1', T0 + 1, T0 + 1, JSON.stringify({ type: 'text', text: '<code-desktop-instructions>x</code-desktop-instructions>\nthe real first prompt' }), 0);
    message.run('m_a', 's1', T0 + 2, T0 + 2, JSON.stringify({ role: 'assistant', modelId: 'glm-5', providerId: 'zai' }), 2);
    message.run('m_sys', 's1', T0 + 3, T0 + 3, JSON.stringify({ role: 'system' }), 3);
    const plan = db.prepare(`EXPLAIN QUERY PLAN SELECT session_id AS sid, id FROM message ORDER BY session_id, sequence, time_created, id`).all().map(row => row.detail).join(' | ');
    db.close();
    assert.match(plan, /message_session_sequence_idx/, 'the listing pass walks the index (no sort)');
    assert.doesNotMatch(plan, /TEMP B-TREE/);
    const [summary] = await zcode.list({ home: dir, env: {} });
    assert.equal(summary.firstPrompt, 'the real first prompt');
    assert.equal(summary.model, 'zai/glm-5', 'the newest sequenced model (rows without a sequence only when none has one)');
    assert.equal(summary.messageCount, 5, 'user and assistant rows only');
    const source = fs.readFileSync(new URL('../electron/chat-import/sources/zcode.mjs', import.meta.url), 'utf8');
    assert.doesNotMatch(source, /WHERE json_extract\(data, '\$\.role'\) IN/, 'no full-table role filter');
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});

test('zcode read: a very long session is read within the per-session budget, newest first, with a warning', async () => {
  const dir = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'ich-zcode-cap-')));
  try {
    const file = path.join(dir, '.zcode', 'cli', 'db', 'db.sqlite');
    fs.mkdirSync(path.dirname(file), { recursive: true });
    const db = new DatabaseSync(file);
    db.exec(SCHEMA);
    db.prepare(`insert into session (id, project_id, slug, directory, title, version, time_created, time_updated) values ('big', 'p', 'big', ?, 'Big', '1', ?, ?)`).run(CWD, T0, T0 + 1);
    const message = db.prepare('insert into message (id, session_id, time_created, time_updated, data, sequence) values (?, ?, ?, ?, ?, ?)');
    const part = db.prepare('insert into part (id, message_id, session_id, time_created, time_updated, data, sequence) values (?, ?, ?, ?, ?, ?, 0)');
    for (let index = 0; index < 50; index++) {
      const id = `m${String(index).padStart(3, '0')}`;
      message.run(id, 'big', T0 + index, T0 + index, JSON.stringify(index % 2 ? { role: 'assistant', modelId: 'glm-5', providerId: 'zai' } : { role: 'user' }), index);
      part.run(`p${id}`, id, 'big', T0 + index, T0 + index, JSON.stringify({ type: 'text', text: `${index % 2 ? 'reply' : 'ask'} ${index}` }));
    }
    db.close();
    const whole = await zcode.read('zcode:big', { home: dir, env: {} });
    assert.equal(texts(whole, 'user').length, 25);
    assert.deepEqual(whole.warnings, []);
    const capped = await zcode.read('zcode:big', { home: dir, env: {}, readBudget: { maxRows: 12 } });
    assert.deepEqual(capped.warnings, ['Only the newest part of this very long session was read.']);
    assert.deepEqual(texts(capped, 'user'), ['ask 44', 'ask 46', 'ask 48']);
    assert.deepEqual(texts(capped, 'assistant'), ['reply 45', 'reply 47', 'reply 49']);
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});
