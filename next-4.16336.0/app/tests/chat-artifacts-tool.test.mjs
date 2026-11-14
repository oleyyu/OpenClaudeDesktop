import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';
import { ionSource } from '../scripts/official-3.6556.2.mjs';
import * as artifacts from '../electron/agent-tools/chat-artifacts.mjs';
import { createChatArtifactStore } from '../electron/chat-artifact-store.mjs';

// w13-chatfn-artifacts (research/w13-chatfn.md A1, chatfn-25/26): the Chat `artifacts` tool over the local store.
const require = createRequire(import.meta.url);
const { createAgentToolsHost } = require('../electron/agent-tools-host.cjs');
const tool = artifacts.tools[0];
const official = (prefix) => fs.readFileSync(path.join(ionSource, fs.readdirSync(ionSource).find((name) => name.startsWith(prefix) && name.endsWith('.js'))), 'utf8');

test('3.6556.2 original: the tool input (shared-104 VI) and the chip copy (cc1aae219)', () => {
  const s104 = official('shared-104-');
  const vi = /VI=\w+\(\(\)=>\w+\(\{(version_uuid:[\s\S]{0,700}?md_citations:\w+\(\)\.optional\(\))\}\)\)/.exec(s104);
  assert.ok(vi, 'shared-104 VI');
  assert.match(vi[1], /command:\w+\(\["create","update","rewrite"\]\)/);
  for (const key of ['id', 'title', 'type', 'language', 'content', 'old_str', 'new_str']) assert.match(vi[1], new RegExp(`[,{]${key}:`), key);
  // The local tool takes VI's fields except the server-side version_uuid / version_number / source / md_citations.
  assert.deepEqual(Object.keys(tool.inputSchema.properties), ['command', 'id', 'title', 'type', 'language', 'content', 'old_str', 'new_str']);
  assert.deepEqual(tool.inputSchema.properties.command.enum, ['create', 'update', 'rewrite']);
  assert.equal(tool.name, 'artifacts');
  assert.deepEqual(artifacts.surfaces, ['chat']);
  const cc1 = official('cc1aae219-');
  assert.ok(cc1.includes('defaultMessage:"Created artifact: {id}"') && cc1.includes('defaultMessage:"Updated artifact: {id}"'));
});

test('create → update (unique, not unique, missing) → rewrite: version 3, with the chip’s words as the result', async () => {
  const store = createChatArtifactStore({ dataDir: fs.mkdtempSync(path.join(os.tmpdir(), 'artifacts-tool-')) });
  const ctx = { chatArtifacts: { apply: (args) => store.apply('chat-thread', args) } };
  assert.equal(await tool.handler({ command: 'create', id: 'essay', title: 'Essay', type: 'text/markdown', content: 'one two two' }, ctx),
    'Created artifact: essay (version 1, text/markdown).');
  assert.equal(await tool.handler({ command: 'update', id: 'essay', old_str: 'one', new_str: 'ONE' }, ctx), 'Updated artifact: essay (version 2, text/markdown).');
  await assert.rejects(tool.handler({ command: 'update', id: 'essay', old_str: 'two', new_str: 'x' }, ctx), /appears 2 times in artifact “essay”/);
  await assert.rejects(tool.handler({ command: 'update', id: 'essay', old_str: 'three', new_str: 'x' }, ctx), /wasn’t found in artifact “essay” \(version 2\)/);
  await assert.rejects(tool.handler({ command: 'update', id: 'essay', new_str: 'x' }, ctx), /needs old_str/);
  assert.equal(await tool.handler({ command: 'rewrite', id: 'essay', content: 'all new' }, ctx), 'Updated artifact: essay (version 3, text/markdown).');
  const read = await store.read('chat-thread', 'essay');
  assert.equal(read.shown, 3);
  assert.equal(read.content, 'all new');
  assert.equal((await store.read('chat-thread', 'essay', 2)).content, 'ONE two two');
  assert.equal(await tool.handler({ command: 'create', id: 'script', type: 'application/vnd.ant.code', language: 'python', content: 'print(1)' }, ctx),
    'Created artifact: script (version 1, application/vnd.ant.code, python).');
  await assert.rejects(tool.handler({ command: 'create', id: 'x', content: 'x' }, {}), /Artifacts aren’t available here/);
});

test('the real host: served to a Chat session only (surfaces), and a Code session’s call is refused', async () => {
  const host = createAgentToolsHost({ resolveSession: (identity) => (identity ? { id: identity, cwd: null } : null), logger: { warn() {}, log() {} } });
  host.provide('sessionSurface', ({ id }) => (id === 'thread-chat' ? 'chat' : 'code'));
  const applied = [];
  host.provide('chatArtifacts', (session) => ({ apply: async (args) => { applied.push([session.id, args.id]); return { created: true, artifact: { id: args.id, version: 1, type: 'text/plain' } }; } }));
  await host.ready();
  const listed = (id) => [...host.sessionToolLists(id).tools, ...host.sessionToolLists(id).deferred].map((entry) => entry.name);
  assert.ok(listed('thread-chat').includes('artifacts'));
  assert.ok(!listed('thread-code').includes('artifacts'));
  const args = { command: 'create', id: 'note', content: 'y' };
  assert.deepEqual(await host.call('thread-chat', { name: 'artifacts', arguments: args }), { content: [{ type: 'text', text: 'Created artifact: note (version 1, text/plain).' }] });
  assert.deepEqual(applied, [['thread-chat', 'note']], 'written into the calling chat');
  await assert.rejects(host.call('thread-code', { name: 'artifacts', arguments: args }), /artifacts isn’t available in this session/);
  assert.equal(applied.length, 1);
});

test('the tool module sits with the other agent tools and has no Anthropic network access', () => {
  const text = fs.readFileSync(path.resolve(import.meta.dirname, '../electron/agent-tools/chat-artifacts.mjs'), 'utf8');
  assert.doesNotMatch(text, /fetch\(|https?:\/\/|claude\.ai/);
  assert.equal(tool.annotations.openWorldHint, false);
});
