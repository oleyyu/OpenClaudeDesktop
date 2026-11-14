// MiMo Code source (electron/chat-import/sources/mimo.mjs) against mimocode.db in the shapes MiMo Code writes
// (XiaomiMiMo/MiMo-Code packages/cli/src/session/session.sql.ts: message.agent_id slices; message-v2.ts parts:
// compaction projection, checkpoint, provenance; external_import), MIMOCODE_HOME / MIMOCODE_DB / channel databases.
// Everything is synthesised here in a temp home; no real history.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import * as mimo from '../electron/chat-import/sources/mimo.mjs';

const made = [];
test.after(() => { for (const dir of made) fs.rmSync(dir, { recursive: true, force: true }); });
const tmp = () => { const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ich-mimo-')); made.push(dir); return dir; };
const ms = minutes => Date.UTC(2026, 9, 21, 8, minutes);
const kinds = session => session.items.map(item => item.kind);
const texts = (session, kind) => session.items.filter(item => item.kind === kind).map(item => item.parts.map(part => part.text ?? '').join(''));
const J = JSON.stringify;

function build(file, { imported = true } = {}) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const db = new DatabaseSync(file);
  db.exec(`
    CREATE TABLE session (id text PRIMARY KEY, project_id text NOT NULL, workspace_id text, parent_id text, context_from text, context_watermark text, slug text NOT NULL,
      directory text NOT NULL, title text NOT NULL, title_source text NOT NULL DEFAULT 'user', title_revision integer NOT NULL DEFAULT 0, version text NOT NULL,
      time_created integer NOT NULL, time_updated integer NOT NULL, time_compacting integer, time_archived integer, last_checkpoint_message_id text);
    CREATE TABLE message (id text PRIMARY KEY, session_id text NOT NULL, agent_id text NOT NULL DEFAULT 'main', time_created integer NOT NULL, time_updated integer NOT NULL, data text NOT NULL);
    CREATE TABLE part (id text PRIMARY KEY, message_id text NOT NULL, session_id text NOT NULL, time_created integer NOT NULL, time_updated integer NOT NULL, data text NOT NULL);
    CREATE TABLE external_import (source text NOT NULL, source_key text NOT NULL, session_id text NOT NULL, source_path text NOT NULL, source_mtime integer NOT NULL,
      time_imported integer NOT NULL, message_ids text, PRIMARY KEY (source, source_key));`);
  const session = db.prepare('INSERT INTO session (id, project_id, parent_id, slug, directory, title, version, time_created, time_updated) VALUES (?,?,?,?,?,?,?,?,?)');
  session.run('ses_mimo', 'p', null, 's', '/work/mimo', 'MiMo work', '0.1.15', ms(0), ms(9));
  session.run('ses_ask', 'p', 'ses_mimo', 's', '/work/mimo', 'ask: side question', '0.1.15', ms(3), ms(3));
  session.run('ses_cc', 'p', null, 's', '/work/cc', 'Copied from Claude Code', '0.1.15', ms(0), ms(1));
  const message = db.prepare('INSERT INTO message (id, session_id, agent_id, time_created, time_updated, data) VALUES (?,?,?,?,?,?)');
  const part = db.prepare('INSERT INTO part VALUES (?,?,?,?,?,?)');
  const user = (id, sid, t, extra = {}) => message.run(id, sid, 'main', ms(t), ms(t), J({ role: 'user', time: { created: ms(t) }, agent: 'build', model: { providerID: 'xiaomi', modelID: 'mimo-v2' }, ...extra }));
  user('msg_a1', 'ses_mimo', 0);
  part.run('prt_a1', 'msg_a1', 'ses_mimo', ms(0), ms(0), J({ type: 'agent', name: 'build' }));
  part.run('prt_a2', 'msg_a1', 'ses_mimo', ms(0), ms(0), J({ type: 'text', text: 'Write the parser' }));
  message.run('msg_a2', 'ses_mimo', 'main', ms(1), ms(1), J({ role: 'assistant', modelID: 'mimo-v2', providerID: 'xiaomi', agent: 'build', mode: 'build', time: { created: ms(1), completed: ms(1) } }));
  part.run('prt_a3', 'msg_a2', 'ses_mimo', ms(1), ms(1), J({ type: 'retry', attempt: 1, message: 'rate limited' }));
  part.run('prt_a4', 'msg_a2', 'ses_mimo', ms(1), ms(1), J({ type: 'tool', callID: 'c1', tool: 'actor', state: { status: 'completed', input: { prompt: 'scan' }, output: 'spawned', metadata: {}, title: 'actor' } }));
  part.run('prt_a5', 'msg_a2', 'ses_mimo', ms(1), ms(1), J({ type: 'text', text: 'Started a helper.' }));
  // The actor's own slice: not the conversation.
  message.run('msg_b1', 'ses_mimo', 'act_1', ms(1), ms(1), J({ role: 'user', agentID: 'act_1', time: { created: ms(1) } }));
  part.run('prt_b1', 'msg_b1', 'ses_mimo', ms(1), ms(1), J({ type: 'text', text: 'actor brief' }));
  // Its result delivered to the main slice through the inbox (AgentProvenance).
  user('msg_a3', 'ses_mimo', 2, { provenance: { source: 'agent', senderActorID: 'act_1' } });
  part.run('prt_a6', 'msg_a3', 'ses_mimo', ms(2), ms(2), J({ type: 'text', text: 'actor finished: 3 files' }));
  // Compaction with its projected summary, then the summary message.
  user('msg_a4', 'ses_mimo', 3);
  part.run('prt_a7', 'msg_a4', 'ses_mimo', ms(3), ms(3), J({ type: 'compaction', auto: true, projection: { version: 1, summary_message_id: 'msg_a5', summary: 'Projected summary', trigger: 'automatic' } }));
  message.run('msg_a5', 'ses_mimo', 'main', ms(4), ms(4), J({ role: 'assistant', summary: true, agent: 'compaction', mode: 'compaction', modelID: 'mimo-v2', providerID: 'xiaomi', time: { created: ms(4) } }));
  part.run('prt_a8', 'msg_a5', 'ses_mimo', ms(4), ms(4), J({ type: 'text', text: 'Raw summary text' }));
  // A checkpoint boundary with its synthetic index.
  user('msg_a6', 'ses_mimo', 5);
  part.run('prt_a9', 'msg_a6', 'ses_mimo', ms(5), ms(5), J({ type: 'checkpoint', checkpointDir: '', checkpointNumber: 0, coveredUpTo: 'msg_a5' }));
  part.run('prt_b0', 'msg_a6', 'ses_mimo', ms(5), ms(5), J({ type: 'text', text: 'Checkpoint index', synthetic: true }));
  user('msg_a7', 'ses_mimo', 6);
  part.run('prt_c0', 'msg_a7', 'ses_mimo', ms(6), ms(6), J({ type: 'text', text: 'Now add tests' }));
  user('msg_k1', 'ses_ask', 3);
  part.run('prt_k1', 'msg_k1', 'ses_ask', ms(3), ms(3), J({ type: 'text', text: 'side question' }));
  user('msg_c1', 'ses_cc', 0);
  part.run('prt_c1', 'msg_c1', 'ses_cc', ms(0), ms(0), J({ type: 'text', text: 'copied prompt' }));
  if (imported) db.prepare('INSERT INTO external_import VALUES (?,?,?,?,?,?,?)').run('cc', 'k', 'ses_cc', '/x.jsonl', 1, 2, null);
  db.close();
  return file;
}

test('mimocode.db: the main slice only, inbox deliveries injected, compaction and checkpoint summaries, MiMo imports marked', async () => {
  const home = tmp();
  build(path.join(home, '.local', 'share', 'mimocode', 'mimocode.db'));
  const ctx = { home, env: { HOME: home } };
  const listed = await mimo.list(ctx);
  assert.deepEqual(listed.map(summary => summary.sourceId).sort(), ['ses_cc', 'ses_mimo'], 'the side-question child is a sub-agent');
  const main = listed.find(summary => summary.sourceId === 'ses_mimo');
  assert.deepEqual([main.source, main.key, main.title, main.firstPrompt, main.messageCount, main.cwd], ['mimo', 'mimo:ses_mimo', 'MiMo work', 'Write the parser', 7, '/work/mimo']);
  assert.equal(listed.find(summary => summary.sourceId === 'ses_cc').importedFrom, 'cc');
  const session = await mimo.read('mimo:ses_mimo', ctx);
  assert.deepEqual(kinds(session), ['user', 'tool_call', 'tool_result', 'assistant', 'injected', 'compaction', 'compaction', 'user']);
  assert.ok(!texts(session, 'user').some(text => text.includes('actor brief')), "an actor's slice is not the conversation");
  assert.deepEqual(texts(session, 'injected'), ['actor finished: 3 files']);
  assert.equal(session.items[5].compaction.summary, 'Projected summary');
  assert.equal(session.items[6].compaction.summary, 'Checkpoint index');
  assert.equal(session.model, 'xiaomi/mimo-v2');
  const withChildren = await mimo.list({ ...ctx, includeSubagents: true });
  assert.equal(withChildren.find(summary => summary.sourceId === 'ses_ask')?.parentId, 'ses_mimo');
  // A summary object (catalog's remembered listing) reads the same.
  assert.equal((await mimo.read(main, ctx)).items.length, session.items.length);
});

test('where: MIMOCODE_HOME/data, MIMOCODE_DB, channel databases; OpenClaude bridge state is never read', async () => {
  const home = tmp();
  const root = path.join(home, 'mimo-home');
  build(path.join(root, 'data', 'mimocode-dev.db'), { imported: false });
  const env = { HOME: home, MIMOCODE_HOME: root };
  assert.equal(mimo.dataDir({ home, env }), path.join(root, 'data'));
  assert.deepEqual((await mimo.list({ home, env })).map(summary => path.basename(summary.sourcePath)), ['mimocode-dev.db', 'mimocode-dev.db']);
  assert.equal(mimo.dataDir({ home, env: { HOME: home, MIMOCODE_HOME: 'relative' } }), path.join(home, '.local', 'share', 'mimocode'), 'a relative MIMOCODE_HOME is no home');
  const custom = build(path.join(home, 'elsewhere', 'mine.db'), { imported: false });
  const viaEnv = await mimo.list({ home, env: { HOME: home, MIMOCODE_DB: custom } });
  assert.ok(viaEnv.every(summary => summary.sourcePath === custom) && viaEnv.length === 2);
  assert.ok(mimo.roots({ home, env: { HOME: home, MIMOCODE_DB: custom } }).includes(custom));
  const state = build(path.join(home, 'OpenClaude Desktop', 'cores', 'mimo', 'state', 'x', 'mimocode.db'), { imported: false });
  assert.deepEqual(await mimo.list({ home, env: { HOME: home, XDG_DATA_HOME: path.join(home, 'none'), MIMOCODE_DB: state } }), []);
  assert.deepEqual(await mimo.list({ home, env: { HOME: home } }), [], 'nothing at the default place');
  await assert.rejects(mimo.read('mimo:ses_mimo', { home, env: { HOME: home } }), /MiMo Code session not found/);
});
