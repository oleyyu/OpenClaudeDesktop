import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';
import { ionSource } from '../scripts/official-3.6556.2.mjs';
import * as pastChats from '../electron/agent-tools/past-chats.mjs';
import { createChatMemory } from '../electron/chat-memory.mjs';

// w13-chatfn-memory: conversation_search / recent_chats (research/w13-chatfn.md M1, M4) on the local history index.
const require = createRequire(import.meta.url);
const { createAgentToolsHost } = require('../electron/agent-tools-host.cjs');
const tool = name => pastChats.tools.find(entry => entry.name === name);
const files = () => fs.readdirSync(ionSource).filter(name => name.endsWith('.js'));
const turn = (user, assistant) => ({ id: 't', items: [{ type: 'userMessage', content: [{ type: 'text', text: user }] }, { type: 'agentMessage', text: assistant }] });

test('3.6556.2 original: the tool names and the "Searching past chats" status (cd0f209bd, c283a58a1)', () => {
  let search = 0, recent = 0, status = 0;
  for (const file of files()) {
    const text = fs.readFileSync(path.join(ionSource, file), 'utf8');
    search += text.split('"conversation_search"').length - 1;
    recent += text.split('"recent_chats"').length - 1;
    status += text.includes('case"past_chats":return e.formatMessage({defaultMessage:"Searching past chats"') ? 1 : 0;
  }
  assert.ok(search >= 10 && recent >= 10, `${search} / ${recent}`);
  assert.ok(status >= 1);
  const cd0 = fs.readFileSync(path.join(ionSource, files().find(name => name.startsWith('cd0f209bd-'))), 'utf8');
  assert.ok(cd0.includes('new Set(["recent_chats","conversation_search"])'));
  assert.deepEqual(pastChats.tools.map(entry => entry.name), ['conversation_search', 'recent_chats']);
  assert.deepEqual(pastChats.surfaces, ['chat']);
  assert.equal(pastChats.group, 'past-chats');
  for (const entry of pastChats.tools) assert.deepEqual(entry.annotations, { readOnlyHint: true, openWorldHint: false });
});

function service() {
  const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'past-chats-'));
  const config = {
    threadIds: ['me', 'a', 'b', 'p', 'k', 'i'],
    sessionMetadata: { me: { surface: 'chat' }, a: { surface: 'chat' }, b: { surface: 'chat' }, p: { surface: 'chat', projectId: 'proj' }, k: { surface: 'code' }, i: { surface: 'chat', incognito: true }, inproj: { surface: 'chat', projectId: 'proj' } },
    threadMetadata: { me: { name: 'Now', updatedAt: 500 }, a: { name: 'Lasagna recipe', updatedAt: 100 }, b: { name: 'Tax forms', updatedAt: 200 }, p: { name: 'Launch plan', updatedAt: 300 }, k: { name: 'Lasagna code', updatedAt: 400 }, i: { name: 'Lasagna secret', updatedAt: 450 } },
  };
  const text = { me: 'lasagna now', a: 'How do I make lasagna?', b: 'Which tax form?', p: 'Lasagna launch party', k: 'lasagna.js', i: 'secret lasagna' };
  const memory = createChatMemory({ dataDir, getConfig: () => config, hidden: { run: async () => '', observe: () => false },
    request: async (method, params) => ({ thread: { id: params.threadId, turns: [turn(text[params.threadId], 'ok')] } }) });
  return { memory, config };
}

test('conversation_search: the chats outside projects, never this chat, Code sessions or incognito chats', async () => {
  const { memory } = service();
  const ctx = { sessionId: 'me', pastChats: memory.pastChats({ id: 'me' }) };
  const result = JSON.parse(await tool('conversation_search').handler({ query: 'lasagna' }, ctx));
  assert.deepEqual(result.chats.map(chat => chat.session_id), ['a']);
  assert.equal(result.chats[0].title, 'Lasagna recipe');
  assert.equal(result.chats[0].updated_at, new Date(100 * 1000).toISOString());
  assert.match(result.chats[0].snippet, /lasagna/i);
  assert.match(await tool('conversation_search').handler({ query: 'nothing-like-this' }, ctx), /No past chats match/);
  await assert.rejects(tool('conversation_search').handler({ query: ' ' }, ctx), /Give a query/);
  // In a project: that project's chats only.
  const inProject = { sessionId: 'inproj', pastChats: memory.pastChats({ id: 'inproj' }) };
  assert.deepEqual(JSON.parse(await tool('conversation_search').handler({ query: 'lasagna' }, inProject)).chats.map(chat => chat.session_id), ['p']);
});

test('recent_chats: newest first by default, n and the time window, last messages included', async () => {
  const { memory } = service();
  const ctx = { sessionId: 'me', pastChats: memory.pastChats({ id: 'me' }) };
  const recent = JSON.parse(await tool('recent_chats').handler({}, ctx));
  assert.deepEqual(recent.chats.map(chat => chat.session_id), ['b', 'a']);
  assert.deepEqual(recent.chats[0].messages.map(message => message.role), ['user', 'assistant']);
  assert.deepEqual(JSON.parse(await tool('recent_chats').handler({ n: 1, sort_order: 'asc' }, ctx)).chats.map(chat => chat.session_id), ['a']);
  assert.deepEqual(JSON.parse(await tool('recent_chats').handler({ before: new Date(150 * 1000).toISOString() }, ctx)).chats.map(chat => chat.session_id), ['a']);
  assert.match(await tool('recent_chats').handler({ after: new Date(10000 * 1000).toISOString() }, ctx), /No past chats in that range/);
  await assert.rejects(tool('recent_chats').handler({ before: 'yesterday-ish' }, ctx), /isn’t a date and time/);
});

test('turned off in Settings › Memory, or without the service: the tools refuse', async () => {
  const { memory, config } = service();
  config.chatMemory = { referenceChats: false };
  const ctx = { sessionId: 'me', pastChats: memory.pastChats({ id: 'me' }) };
  await assert.rejects(tool('conversation_search').handler({ query: 'lasagna' }, ctx), /turned off in Settings › Memory/);
  await assert.rejects(tool('recent_chats').handler({}, {}), /aren’t available here/);
  // An incognito chat can't read past chats.
  config.chatMemory = {};
  await assert.rejects(tool('recent_chats').handler({}, { pastChats: memory.pastChats({ id: 'i' }) }), /turned off/);
});

test('the real host: listed for a Chat session only, and not while the past-chats group is off', async () => {
  let referenceChats = true;
  const host = createAgentToolsHost({ resolveSession: () => null, logger: { warn() {}, log() {} },
    isGroupEnabled: group => group !== 'past-chats' || referenceChats });
  host.provide('sessionSurface', ({ id }) => id === 'thread-chat' ? 'chat' : 'code');
  await host.ready();
  const listed = id => [...host.sessionToolLists(id).tools, ...host.sessionToolLists(id).deferred].map(entry => entry.name);
  assert.ok(listed('thread-chat').includes('conversation_search'));
  assert.ok(listed('thread-chat').includes('recent_chats'));
  assert.ok(!listed('thread-code').includes('conversation_search'));
  referenceChats = false;
  assert.ok(!listed('thread-chat').includes('conversation_search'));
});
