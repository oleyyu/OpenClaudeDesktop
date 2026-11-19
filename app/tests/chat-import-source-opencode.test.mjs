// OpenCode source (electron/chat-import/sources/opencode.mjs) against databases in the shapes OpenCode writes: a 1.18-era
// opencode.db (session + message/part, an unused session_message table), the same file after 2.2.5 migrated it
// (session_v2 beside the untouched 1.x rows, session_message, assistant content moved to session_part: upstream
// core/src/session/sql.ts, projector.ts, history.ts withParts), a channel database, $OPENCODE_DB and pre-SQLite storage/.
// Everything is synthesised here in a temp home; no real history.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import * as opencode from '../electron/chat-import/sources/opencode.mjs';

const made = [];
test.after(() => { for (const dir of made) fs.rmSync(dir, { recursive: true, force: true }); });
const tmp = () => { const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ich-opencode-')); made.push(dir); return dir; };
const ms = minutes => Date.UTC(2026, 9, 20, 9, minutes);
const kinds = session => session.items.map(item => item.kind);
const texts = (session, kind) => session.items.filter(item => item.kind === kind).map(item => item.parts.map(part => part.text ?? '').join(''));
const J = JSON.stringify;

test('v2 import hides the staged revert boundary and everything after it', () => {
  const db = new DatabaseSync(':memory:');
  try {
    db.exec(`${V1_TABLES}
      CREATE TABLE session_v2 (id text PRIMARY KEY, revert text);
      INSERT INTO session_v2 VALUES ('ses_hidden', NULL);`);
    const row = db.prepare('INSERT INTO session_message VALUES (?,?,?,?,?,?,?)');
    for (let n = 1; n <= 4; n++) row.run(`m${n}`, 'ses_hidden', 'user', n, n, n, J({ text: `line ${n}` }));
    const stage = db.prepare('UPDATE session_v2 SET revert = ?');
    stage.run(J({ messageID: 'm3' }));
    assert.deepEqual(texts(opencode.readDatabase(db, 'ses_hidden'), 'user'), ['line 1', 'line 2']);
    assert.equal(opencode.listDatabase(db, 'synthetic.db', {})[0].messageCount, 2);
    stage.run(J({ messageID: 'm1' }));
    assert.deepEqual(opencode.readDatabase(db, 'ses_hidden').items, []);
    assert.deepEqual(opencode.listDatabase(db, 'synthetic.db', {}), []);
  } finally { db.close(); }
});

const V1_TABLES = `
  CREATE TABLE session (id text PRIMARY KEY, project_id text NOT NULL, workspace_id text, parent_id text, slug text NOT NULL DEFAULT '', directory text NOT NULL,
    path text, title text NOT NULL, version text NOT NULL, model text, agent text, time_created integer NOT NULL, time_updated integer NOT NULL, time_archived integer);
  CREATE TABLE message (id text PRIMARY KEY, session_id text NOT NULL, time_created integer NOT NULL, time_updated integer NOT NULL, data text NOT NULL);
  CREATE TABLE part (id text PRIMARY KEY, message_id text NOT NULL, session_id text NOT NULL, time_created integer NOT NULL, time_updated integer NOT NULL, data text NOT NULL);
  CREATE TABLE session_message (id text PRIMARY KEY, session_id text NOT NULL, type text NOT NULL, seq integer NOT NULL, time_created integer NOT NULL, time_updated integer NOT NULL, data text NOT NULL);`;

function v1Rows(db) {
  const session = db.prepare('INSERT INTO session (id, project_id, parent_id, directory, title, version, model, time_created, time_updated, time_archived) VALUES (?,?,?,?,?,?,?,?,?,?)');
  session.run('ses_one', 'p', null, '/work/one', 'First session', '1.18.34', null, ms(0), ms(5), null);
  session.run('ses_sub', 'p', 'ses_one', '/work/one', 'Sub-agent', '1.18.34', null, ms(1), ms(2), null);
  session.run('ses_blank', 'p', null, '/work/one', 'Nothing said', '1.18.34', null, ms(0), ms(9), null);
  const message = db.prepare('INSERT INTO message VALUES (?,?,?,?,?)'), part = db.prepare('INSERT INTO part VALUES (?,?,?,?,?,?)');
  message.run('msg_01', 'ses_one', ms(0), ms(0), J({ role: 'user', time: { created: ms(0) }, agent: 'build', model: { providerID: 'anthropic', modelID: 'claude' } }));
  part.run('prt_01', 'msg_01', 'ses_one', ms(0), ms(0), J({ type: 'text', text: '<system-reminder>plan mode</system-reminder>', synthetic: true }));
  part.run('prt_02', 'msg_01', 'ses_one', ms(0), ms(0), J({ type: 'text', text: 'Fix the bug' }));
  part.run('prt_03', 'msg_01', 'ses_one', ms(0), ms(0), J({ type: 'file', mime: 'text/plain', url: 'file:///work/one/a%20b.ts', filename: 'a b.ts' }));
  part.run('prt_04', 'msg_01', 'ses_one', ms(0), ms(0), J({ type: 'text', text: 'hidden', ignored: true }));
  message.run('msg_02', 'ses_one', ms(1), ms(1), J({ role: 'assistant', modelID: 'claude', providerID: 'anthropic', time: { created: ms(1), completed: ms(1) }, path: { cwd: '/work/one', root: '/work/one' } }));
  part.run('prt_05', 'msg_02', 'ses_one', ms(1), ms(1), J({ type: 'step-start' }));
  part.run('prt_06', 'msg_02', 'ses_one', ms(1), ms(1), J({ type: 'reasoning', text: 'look first', time: { start: ms(1) } }));
  part.run('prt_07', 'msg_02', 'ses_one', ms(1), ms(1), J({ type: 'tool', callID: 'call_1', tool: 'bash', state: { status: 'completed', input: { command: 'false' }, output: 'boom', metadata: { exit: 1 }, title: 'false', time: { start: 1, end: 2 } } }));
  part.run('prt_08', 'msg_02', 'ses_one', ms(1), ms(1), J({ type: 'tool', callID: 'call_2', tool: 'read', state: { status: 'error', input: { filePath: '/x' }, error: 'ENOENT', time: { start: 1, end: 2 } } }));
  part.run('prt_09', 'msg_02', 'ses_one', ms(1), ms(1), J({ type: 'text', text: 'Fixed it.' }));
  part.run('prt_10', 'msg_02', 'ses_one', ms(1), ms(1), J({ type: 'step-finish', reason: 'stop' }));
  // A /compact: the user message's compaction part, then the summary assistant message (summary: true).
  message.run('msg_03', 'ses_one', ms(2), ms(2), J({ role: 'user', time: { created: ms(2) } }));
  part.run('prt_11', 'msg_03', 'ses_one', ms(2), ms(2), J({ type: 'compaction', auto: false }));
  message.run('msg_04', 'ses_one', ms(3), ms(3), J({ role: 'assistant', summary: true, modelID: 'claude', providerID: 'anthropic', time: { created: ms(3) } }));
  part.run('prt_12', 'msg_04', 'ses_one', ms(3), ms(3), J({ type: 'text', text: 'Summary of the work' }));
  message.run('msg_05', 'ses_one', ms(4), ms(4), J({ role: 'user', time: { created: ms(4) } }));
  part.run('prt_13', 'msg_05', 'ses_one', ms(4), ms(4), J({ type: 'subtask', agent: 'explore', description: 'map the repo', prompt: 'map it' }));
  message.run('msg_s1', 'ses_sub', ms(1), ms(1), J({ role: 'user', time: { created: ms(1) } }));
  part.run('prt_s1', 'msg_s1', 'ses_sub', ms(1), ms(1), J({ type: 'text', text: 'map it' }));
}

/** opencode.db as OpenCode 2.2.5 leaves it: session_v2 holds the copied 1.x session plus a new one; session_part. */
function migrate(db) {
  db.exec(`CREATE TABLE session_v2 (id text PRIMARY KEY, project_id text NOT NULL, parent_id text, slug text NOT NULL DEFAULT '', directory text NOT NULL, path text,
    title text, version text NOT NULL, metadata text, agent text, model text, time_created integer NOT NULL, time_updated integer NOT NULL, time_archived integer);
    CREATE TABLE session_part (message_id text NOT NULL, session_id text NOT NULL, ordinal integer NOT NULL, type text NOT NULL, call_id text,
      time_created integer NOT NULL, time_updated integer NOT NULL, data text NOT NULL, PRIMARY KEY (message_id, ordinal));`);
  const session = db.prepare('INSERT INTO session_v2 (id, project_id, parent_id, directory, title, version, model, time_created, time_updated, time_archived) VALUES (?,?,?,?,?,?,?,?,?,?)');
  session.run('ses_one', 'p', null, '/work/one', 'First session (renamed in 2.x)', '1.18.34', null, ms(0), ms(5), null);
  session.run('ses_new', 'p', null, '/work/two', null, '2.2.5', J({ id: 'gpt-5', providerID: 'openai' }), ms(10), ms(20), ms(21));
  const row = db.prepare('INSERT INTO session_message VALUES (?,?,?,?,?,?,?)');
  // The migrated 1.x session (transformSession) is read from its rows now.
  row.run('msg_m1', 'ses_one', 'user', 1, ms(0), ms(0), J({ text: 'Fix the bug', time: { created: ms(0) } }));
  row.run('msg_m2', 'ses_one', 'assistant', 2, ms(1), ms(1), J({ agent: 'build', model: { id: 'claude', providerID: 'anthropic' }, content: [{ type: 'text', text: 'Fixed it.' }], time: { created: ms(1), completed: ms(1) } }));
  row.run('msg_n1', 'ses_new', 'agent-switched', 1, ms(10), ms(10), J({ agent: 'plan', time: { created: ms(10) } }));
  row.run('msg_n2', 'ses_new', 'user', 2, ms(10), ms(10), J({ text: 'Plan a refactor', files: [{ mime: 'image/png', name: 'shot.png', uri: 'data:image/png;base64,AAAA' }], time: { created: ms(10) } }));
  row.run('msg_n3', 'ses_new', 'system', 3, ms(10), ms(10), J({ text: 'The date changed.', description: 'date', time: { created: ms(10) } }));
  // Content moved to session_part: the row keeps an empty envelope.
  row.run('msg_n4', 'ses_new', 'assistant', 4, ms(11), ms(11), J({ agent: 'plan', model: { id: 'gpt-5', providerID: 'openai' }, content: [], time: { created: ms(11), completed: ms(12) } }));
  const part = db.prepare('INSERT INTO session_part VALUES (?,?,?,?,?,?,?,?)');
  part.run('msg_n4', 'ses_new', 1, 'text', null, ms(11), ms(11), J({ type: 'text', text: 'Here is the plan.' }));
  part.run('msg_n4', 'ses_new', 0, 'reasoning', null, ms(11), ms(11), J({ type: 'reasoning', text: 'thinking', native: { signature: 'x' } }));
  part.run('msg_n4', 'ses_new', 2, 'tool', 'tc1', ms(11), ms(11), J({ type: 'tool', id: 'tc1', name: 'grep', state: { status: 'error', input: { pattern: 'x' }, error: { type: 'tool', message: 'bad pattern' } }, time: { created: ms(11) } }));
  part.run('msg_n4', 'ses_new', 3, 'tool', 'tc2', ms(11), ms(11), J({ type: 'tool', id: 'tc2', name: 'edit', state: { status: 'streaming', input: '{"file' }, time: { created: ms(11) } }));
  row.run('msg_n5', 'ses_new', 'compaction', 5, ms(13), ms(13), J({ status: 'failed', reason: 'auto', error: { type: 'x', message: 'y' }, time: { created: ms(13) } }));
  row.run('msg_n6', 'ses_new', 'compaction', 6, ms(14), ms(14), J({ status: 'completed', reason: 'manual', summary: 'Plan so far', time: { created: ms(14) } }));
  row.run('msg_n7', 'ses_new', 'shell', 7, ms(15), ms(15), J({ shellID: 'sh1', command: 'ls', status: 'exited', exit: 0, output: { output: 'a\nb', cursor: 3, size: 3, truncated: false }, time: { created: ms(15) } }));
  row.run('msg_n8', 'ses_new', 'idle', 8, ms(16), ms(16), J({ outcome: 'succeeded', time: { created: ms(16) } }));
}

function database(file, build) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const db = new DatabaseSync(file);
  try { build(db); } finally { db.close(); }
  return file;
}
const ctxOf = (home, extra = {}) => ({ home, env: { HOME: home }, ...extra });

test('1.18 opencode.db: message/part history, injected / ignored text, tools with exit codes, compaction summary, sub-agents', async () => {
  const home = tmp();
  database(path.join(home, '.local', 'share', 'opencode', 'opencode.db'), db => { db.exec(V1_TABLES); v1Rows(db); });
  const listed = await opencode.list(ctxOf(home));
  assert.deepEqual(listed.map(summary => summary.sourceId), ['ses_one'], 'no blank session, no sub-agent by default');
  const [summary] = listed;
  assert.equal(summary.firstPrompt, 'Fix the bug', 'the synthetic reminder is not the first prompt');
  assert.equal(summary.schema, 1);
  assert.equal(summary.messageCount, 5);
  const session = await opencode.read('opencode:ses_one', ctxOf(home));
  assert.deepEqual(kinds(session), ['injected', 'user', 'reasoning', 'tool_call', 'tool_result', 'tool_call', 'tool_result', 'assistant', 'compaction', 'subagent_ref']);
  assert.equal(session.model, 'anthropic/claude');
  assert.deepEqual(session.items[1].parts[1], { file: { name: 'a b.ts', mime: 'text/plain', path: '/work/one/a b.ts' } });
  assert.deepEqual([session.items[4].result.exitCode, session.items[4].result.isError], [1, true]);
  assert.deepEqual([session.items[6].result.text, session.items[6].result.isError], ['ENOENT', true]);
  assert.equal(session.items[8].compaction.summary, 'Summary of the work');
  assert.ok(!texts(session, 'user').some(text => text.includes('hidden')));
  const all = await opencode.list(ctxOf(home, { includeSubagents: true }));
  assert.equal(all.find(entry => entry.sourceId === 'ses_sub')?.parentId, 'ses_one');
});

test('the same file after OpenCode 2.2.5: session_v2 wins over the copied 1.x row, session_part content in ordinal order', async () => {
  const home = tmp();
  database(path.join(home, '.local', 'share', 'opencode', 'opencode.db'), db => { db.exec(V1_TABLES); v1Rows(db); migrate(db); });
  const listed = await opencode.list(ctxOf(home));
  assert.deepEqual(listed.map(summary => summary.sourceId).sort(), ['ses_new', 'ses_one']);
  const one = listed.find(summary => summary.sourceId === 'ses_one');
  assert.deepEqual([one.title, one.schema, one.messageCount], ['First session (renamed in 2.x)', 2, 2]);
  const fresh = listed.find(summary => summary.sourceId === 'ses_new');
  assert.deepEqual([fresh.title, fresh.model, fresh.archived, fresh.firstPrompt, fresh.cwd], ['', 'openai/gpt-5', true, 'Plan a refactor', '/work/two']);
  const session = await opencode.read('opencode:ses_new', ctxOf(home));
  assert.deepEqual(kinds(session), ['user', 'injected', 'reasoning', 'assistant', 'tool_call', 'tool_result', 'tool_call', 'compaction', 'tool_call', 'tool_result']);
  assert.equal(session.items[0].parts[1].image.data, 'data:image/png;base64,AAAA');
  assert.deepEqual(texts(session, 'assistant'), ['Here is the plan.']);
  assert.equal(session.items[5].result.text, 'bad pattern');
  assert.equal(session.items[7].compaction.summary, 'Plan so far', 'the failed compaction is left out');
  assert.equal(session.items[9].result.text, 'a\nb');
  const migrated = await opencode.read('opencode:ses_one', ctxOf(home));
  assert.deepEqual(kinds(migrated), ['user', 'assistant'], 'a migrated session reads its 2.x rows');
});

test('databases: $OPENCODE_DB (relative to the data folder), channel databases, storage/ JSON; bridge state never read', async () => {
  const home = tmp();
  const data = path.join(home, 'xdg', 'opencode');
  const env = { HOME: home, XDG_DATA_HOME: path.join(home, 'xdg'), OPENCODE_DB: 'custom.db' };
  database(path.join(data, 'custom.db'), db => { db.exec(V1_TABLES); v1Rows(db); });
  database(path.join(data, 'opencode-local.db'), db => {
    db.exec(V1_TABLES);
    db.prepare('INSERT INTO session (id, project_id, directory, title, version, time_created, time_updated) VALUES (?,?,?,?,?,?,?)').run('ses_chan', 'p', '/w', 'Channel build', '0.0.0-local', ms(30), ms(31));
    db.prepare('INSERT INTO message VALUES (?,?,?,?,?)').run('msg_c', 'ses_chan', ms(30), ms(30), J({ role: 'user', time: { created: ms(30) } }));
    db.prepare('INSERT INTO part VALUES (?,?,?,?,?,?)').run('prt_c', 'msg_c', 'ses_chan', ms(30), ms(30), J({ type: 'text', text: 'from a dev build' }));
  });
  fs.writeFileSync(path.join(data, 'opencode.db-wal'), '');
  const storage = path.join(data, 'storage');
  fs.mkdirSync(path.join(storage, 'session', 'proj'), { recursive: true });
  fs.writeFileSync(path.join(storage, 'session', 'proj', 'ses_old.json'), J({ id: 'ses_old', title: 'Old JSON', directory: '/w/old', time: { created: ms(40), updated: ms(41) } }));
  fs.writeFileSync(path.join(storage, 'session', 'proj', 'ses_one.json'), J({ id: 'ses_one', title: 'dup of the database row', time: { created: 0, updated: 0 } }));
  for (const sid of ['ses_old', 'ses_one']) fs.mkdirSync(path.join(storage, 'message', sid), { recursive: true });
  fs.writeFileSync(path.join(storage, 'message', 'ses_old', 'msg_o1.json'), J({ id: 'msg_o1', role: 'user', time: { created: ms(40) } }));
  fs.writeFileSync(path.join(storage, 'message', 'ses_old', 'msg_o2.json'), J({ id: 'msg_o2', role: 'assistant', modelID: 'm', time: { created: ms(41) } }));
  fs.writeFileSync(path.join(storage, 'message', 'ses_one', 'msg_x.json'), J({ id: 'msg_x', role: 'user', time: { created: 0 } }));
  fs.mkdirSync(path.join(storage, 'part', 'msg_o1'), { recursive: true });
  fs.mkdirSync(path.join(storage, 'part', 'msg_o2'), { recursive: true });
  fs.writeFileSync(path.join(storage, 'part', 'msg_o1', 'prt_1.json'), J({ type: 'text', text: 'old prompt' }));
  fs.writeFileSync(path.join(storage, 'part', 'msg_o2', 'prt_2.json'), J({ type: 'text', text: 'old answer' }));

  const listed = await opencode.list({ home, env });
  assert.deepEqual(listed.map(summary => summary.sourceId).sort(), ['ses_chan', 'ses_old', 'ses_one']);
  assert.equal(listed.find(summary => summary.sourceId === 'ses_one').sourcePath, path.join(data, 'custom.db'), 'the database row wins over storage/');
  const old = await opencode.read('opencode:ses_old', { home, env });
  assert.deepEqual([texts(old, 'user'), texts(old, 'assistant')], [['old prompt'], ['old answer']]);
  assert.equal((await opencode.read('opencode:ses_chan', { home, env })).firstPrompt, 'from a dev build');
  assert.ok(opencode.roots({ home, env }).includes(path.join(data, 'custom.db')));

  // OpenClaude's own 2.x core database, even when OPENCODE_DB names it.
  const state = path.join(home, 'Library', 'Application Support', 'OpenClaude Desktop', 'cores', 'opencode', 'state', 'opencode-v2', 'opencode.db');
  database(state, db => { db.exec(V1_TABLES); v1Rows(db); });
  assert.equal(opencode.isBridgeState(state), true);
  const bridged = await opencode.list({ home, env: { HOME: home, XDG_DATA_HOME: path.join(home, 'none'), OPENCODE_DB: state } });
  assert.deepEqual(bridged, []);
  const excluded = await opencode.list({ home, env, exclude: [data] });
  assert.deepEqual(excluded, [], 'excluded folders are never opened');
});

test('a file that is no database is a warning, never an exception', async () => {
  const home = tmp();
  const file = path.join(home, '.local', 'share', 'opencode', 'opencode.db');
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, 'not sqlite at all, just text that is long enough to be read as a header');
  const warnings = [];
  assert.deepEqual(await opencode.list({ ...ctxOf(home), warn: (source, message) => warnings.push({ source, message }) }), []);
  assert.equal(warnings[0]?.source, 'opencode');
  await assert.rejects(opencode.read('opencode:ses_none', ctxOf(home)), /not found/);
});

test('storage/: an id that is not one path segment (a file\'s own id, a key) never reaches a path', async () => {
  const home = tmp();
  const data = path.join(home, 'xdg', 'opencode');
  const env = { HOME: home, XDG_DATA_HOME: path.join(home, 'xdg') };
  const storage = path.join(data, 'storage');
  fs.mkdirSync(path.join(storage, 'session', 'proj'), { recursive: true });
  // A session file naming a folder outside storage/message, and a decoy there it would reach.
  fs.writeFileSync(path.join(storage, 'session', 'proj', 'evil.json'), J({ id: '../../decoy', title: 'Evil', time: { created: ms(1), updated: ms(1) } }));
  fs.mkdirSync(path.join(data, 'decoy'), { recursive: true });
  fs.writeFileSync(path.join(data, 'decoy', 'm.json'), J({ id: 'msg_d', role: 'user', time: { created: 1 } }));
  // A good session whose message file names a part folder outside storage/part.
  fs.writeFileSync(path.join(storage, 'session', 'proj', 'ses_ok.json'), J({ id: 'ses_ok', title: 'Fine', time: { created: ms(2), updated: ms(2) } }));
  fs.mkdirSync(path.join(storage, 'message', 'ses_ok'), { recursive: true });
  fs.writeFileSync(path.join(storage, 'message', 'ses_ok', 'msg_1.json'), J({ id: 'msg_1', role: 'user', time: { created: ms(2) } }));
  fs.writeFileSync(path.join(storage, 'message', 'ses_ok', 'msg_2.json'), J({ id: '../../../decoy', role: 'assistant', time: { created: ms(3) } }));
  fs.mkdirSync(path.join(storage, 'part', 'msg_1'), { recursive: true });
  fs.writeFileSync(path.join(storage, 'part', 'msg_1', 'prt_1.json'), J({ type: 'text', text: 'safe prompt' }));
  const listed = await opencode.list({ home, env });
  assert.deepEqual(listed.map(summary => summary.sourceId), ['ses_ok']);
  const ok = await opencode.read('opencode:ses_ok', { home, env });
  assert.deepEqual(texts(ok, 'user'), ['safe prompt']);
  assert.deepEqual(texts(ok, 'assistant'), [], 'the message with a bad id is skipped');
  await assert.rejects(opencode.readStorage(data, '../decoy'), /Not a session id/);
  for (const bad of ['', '..', 'a/b', 'a\\b', 'x\u0000y', '.hidden', 'a'.repeat(200)]) assert.equal(opencode.safeStorageId(bad), false, JSON.stringify(bad));
  for (const good of ['ses_01JX', 'msg_abc-DEF_9', 'prt_000000000001abc']) assert.equal(opencode.safeStorageId(good), true, good);
});

test('a very long session is read within a per-session budget, streamed newest first, with a warning (1.x and 2.x)', async () => {
  const { rowBudget, SESSION_CAPPED_WARNING, SESSION_MAX_ROWS, SESSION_MAX_BYTES } = await import('../electron/chat-import/sources/shared.mjs');
  assert.ok(SESSION_MAX_ROWS >= 10_000 && SESSION_MAX_BYTES >= 16 * 1024 * 1024, 'sane defaults');
  const home = tmp();
  const file = path.join(home, 'long.db');
  database(file, db => {
    db.exec(V1_TABLES);
    db.prepare('INSERT INTO session (id, project_id, directory, title, version, time_created, time_updated) VALUES (?,?,?,?,?,?,?)').run('ses_long', 'p', '/w', 'Long', '1.18.34', ms(0), ms(59));
    const message = db.prepare('INSERT INTO message VALUES (?,?,?,?,?)'), part = db.prepare('INSERT INTO part VALUES (?,?,?,?,?,?)');
    for (let index = 0; index < 60; index++) {
      const mid = `msg_${String(index).padStart(3, '0')}`, at = ms(0) + index * 1000;
      message.run(mid, 'ses_long', at, at, J(index % 2 ? { role: 'assistant', modelID: 'm', providerID: 'p', time: { created: at } } : { role: 'user', time: { created: at } }));
      part.run(`prt_${String(index).padStart(3, '0')}`, mid, 'ses_long', at, at, J({ type: 'text', text: `${index % 2 ? 'answer' : 'prompt'} ${index}` }));
    }
  });
  const db = new DatabaseSync(file, { readOnly: true });
  try {
    const whole = opencode.readDatabase(db, 'ses_long');
    assert.deepEqual(whole.warnings, []);
    assert.equal(texts(whole, 'user').length, 30);
    // 20 rows: ten messages, each with its part — the newest ten, in order.
    const capped = opencode.readDatabase(db, 'ses_long', { budget: rowBudget({ maxRows: 20 }) });
    assert.deepEqual(capped.warnings, [SESSION_CAPPED_WARNING]);
    assert.deepEqual([...texts(capped, 'user'), ...texts(capped, 'assistant')].sort(), ['answer 51', 'answer 53', 'answer 55', 'answer 57', 'answer 59', 'prompt 50', 'prompt 52', 'prompt 54', 'prompt 56', 'prompt 58']);
    assert.equal(capped.items.at(-1).parts[0].text, 'answer 59');
    // A byte bound works the same way.
    const small = opencode.readDatabase(db, 'ses_long', { budget: rowBudget({ maxBytes: 2000 }) });
    assert.deepEqual(small.warnings, [SESSION_CAPPED_WARNING]);
    assert.ok(texts(small, 'assistant').includes('answer 59') && !texts(small, 'user').includes('prompt 0'));
  } finally { db.close(); }
  // 2.x rows (session_message / session_part) under the same budget.
  const file2 = path.join(home, 'v2.db');
  database(file2, db => {
    db.exec(`CREATE TABLE session_message (id text PRIMARY KEY, session_id text NOT NULL, type text NOT NULL, seq integer NOT NULL, time_created integer NOT NULL, time_updated integer NOT NULL, data text NOT NULL);
      CREATE TABLE session_part (message_id text NOT NULL, session_id text NOT NULL, ordinal integer NOT NULL, data text NOT NULL, PRIMARY KEY (message_id, ordinal));`);
    const row = db.prepare('INSERT INTO session_message VALUES (?,?,?,?,?,?,?)'), part = db.prepare('INSERT INTO session_part VALUES (?,?,?,?)');
    for (let index = 0; index < 40; index++) {
      const mid = `msg_${String(index).padStart(3, '0')}`, at = ms(0) + index * 1000;
      if (index % 2) { row.run(mid, 'ses_v2', 'assistant', index, at, at, J({ agent: 'build', model: { id: 'm', providerID: 'p' }, content: [], time: { created: at, completed: at } })); part.run(mid, 'ses_v2', 0, J({ type: 'text', text: `answer ${index}` })); }
      else row.run(mid, 'ses_v2', 'user', index, at, at, J({ text: `prompt ${index}`, time: { created: at } }));
    }
  });
  const db2 = new DatabaseSync(file2, { readOnly: true });
  try {
    const capped = opencode.readDatabase(db2, 'ses_v2', { budget: rowBudget({ maxRows: 9 }) });
    assert.deepEqual(capped.warnings, [SESSION_CAPPED_WARNING]);
    assert.deepEqual(texts(capped, 'assistant'), ['answer 35', 'answer 37', 'answer 39']);
    assert.ok(!texts(capped, 'user').includes('prompt 0'));
  } finally { db2.close(); }
});
