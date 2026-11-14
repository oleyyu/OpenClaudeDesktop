import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { ionSource } from '../scripts/official-3.6556.2.mjs';
import { createChatHistorySearch, threadMessages, searchTerms, snippetFor, SEARCH_MAX_RESULTS, QUERY_MAX_CHARS } from '../electron/chat-history-search.mjs';

// w13-chatfn-memory: the local history index (research/w13-chatfn.md H3, M4). Fake core requests; no core, no network.
const raw = file => fs.readFileSync(path.join(ionSource, file), 'utf8');
const turn = (id, user, assistant) => ({ id, items: [{ id: `${id}-u`, type: 'userMessage', content: [{ type: 'text', text: user }] }, { id: `${id}-a`, type: 'agentMessage', text: assistant }] });
const temp = () => fs.mkdtempSync(path.join(os.tmpdir(), 'chat-index-'));

function fixture({ threadSearch = false } = {}) {
  const transcripts = {
    a: [turn('t1', 'Help me plan a trip to Kyoto in spring', 'Cherry blossom season in Kyoto peaks in early April.')],
    b: [turn('t2', 'My sourdough starter smells like acetone', 'Feed the starter more often; acetone means it is hungry.')],
    c: [turn('t3', '帮我写一份周报', '好的，这是本周的工作总结。')],
    p: [turn('t4', 'Project roadmap for Kyoto app', 'Milestones for the Kyoto app.')],
  };
  const list = [
    { id: 'a', title: 'Kyoto trip', updatedAt: 1000, surface: 'chat', projectId: null },
    { id: 'b', title: 'Sourdough', updatedAt: 3000, surface: 'chat', projectId: null },
    { id: 'c', title: '周报', updatedAt: 2000, surface: 'chat', projectId: null },
    { id: 'p', title: 'Roadmap', updatedAt: 4000, surface: 'chat', projectId: 'proj1' },
  ];
  const calls = [];
  const request = async (method, params) => {
    calls.push([method, params]);
    if (method === 'thread/read') return { thread: { id: params.threadId, turns: transcripts[params.threadId] ?? [] } };
    if (method === 'thread/search') return { data: [{ thread: { id: 'b' }, snippet: 'starter smells' }, { thread: { id: 'zzz' }, snippet: 'not a candidate' }] };
    throw new Error(`unexpected ${method}`);
  };
  const dir = temp();
  const search = createChatHistorySearch({ dir, threads: () => list, request, supportsThreadSearch: () => threadSearch });
  return { search, calls, list, dir, transcripts };
}

test('3.6556.2 original: conversation/search/v2 clamps n to 1…200 and the query to 10000 (shared-182 NO, kO, AO)', () => {
  const shared182 = fs.readdirSync(ionSource).find(name => /^shared-182-.*\.js$/.test(name));
  const text = raw(shared182);
  assert.ok(text.includes('/conversation/search/v2'));
  assert.match(text, /n:Math\.min\(Math\.max\(n,1\),(\w+)\)/);
  const limit = /n:Math\.min\(Math\.max\(n,1\),(\w+)\)/.exec(text)[1];
  assert.match(text, new RegExp(`${limit}=200`));
  assert.ok(/query:\w+\(\w+\(t,(\w+)\)\)/.test(text));
  const query = /query:\w+\(\w+\(t,(\w+)\)\)/.exec(text)[1];
  assert.match(text, new RegExp(`${query}=1e4`));
  assert.equal(SEARCH_MAX_RESULTS, 200);
  assert.equal(QUERY_MAX_CHARS, 10000);
});

test('threadMessages keeps the user and assistant text, without reminders or attached documents', () => {
  const messages = threadMessages([{ id: 't', items: [
    { type: 'userMessage', content: [{ type: 'text', text: 'Hi<system-reminder>secret</system-reminder> there\n\n<document name="a.pdf">body</document>' }] },
    { type: 'commandExecution', command: 'ls' },
    { type: 'agentMessage', text: 'Hello' },
  ] }]);
  assert.deepEqual(messages, [{ role: 'user', text: 'Hi there', turnId: 't' }, { role: 'assistant', text: 'Hello', turnId: 't' }]);
});

test('search terms: words, and CJK runs as bigrams', () => {
  assert.deepEqual(searchTerms('Kyoto trip!'), ['kyoto', 'trip']);
  assert.deepEqual(searchTerms('周报'), ['周报']);
  assert.deepEqual(searchTerms('写周报'), ['写周', '周报']);
  assert.match(snippetFor('a '.repeat(100) + 'needle here', ['needle']), /^…[a ]*needle here$/);
});

test('local search ranks the matching chats, scoped to chats outside projects or one project', async () => {
  const { search } = fixture();
  const kyoto = await search.search('Kyoto blossom', { projectId: null });
  assert.deepEqual(kyoto.map(row => row.id), ['a']);
  assert.match(kyoto[0].snippet, /Kyoto/);
  assert.deepEqual((await search.search('周报', { projectId: null })).map(row => row.id), ['c']);
  assert.deepEqual((await search.search('Kyoto', { projectId: 'proj1' })).map(row => row.id), ['p']);
  assert.deepEqual((await search.search('Kyoto')).map(row => row.id).sort(), ['a', 'p']);
  assert.deepEqual(await search.search('Kyoto', { projectId: null, excludeThreadId: 'a' }), []);
  assert.deepEqual(await search.search('   '), []);
});

test('the index is incremental: a thread is read again only after its updatedAt moves', async () => {
  const { search, calls, list, dir } = fixture();
  await search.search('Kyoto', { projectId: null });
  const reads = () => calls.filter(([method]) => method === 'thread/read').length;
  assert.equal(reads(), 3);
  await search.search('starter', { projectId: null });
  assert.equal(reads(), 3, 'cached');
  list[1].updatedAt = 3500;
  await search.search('starter', { projectId: null });
  assert.equal(reads(), 4, 'only the changed thread');
  assert.ok(fs.existsSync(path.join(dir, 'b.json')));
  // A fresh instance reads the files, not the core.
  const again = createChatHistorySearch({ dir, threads: () => list, request: async () => { throw new Error('no core'); } });
  assert.deepEqual((await again.search('acetone', { projectId: null })).map(row => row.id), ['b']);
  again.remove('b');
  assert.equal(fs.existsSync(path.join(dir, 'b.json')), false);
});

test('a core with thread/search answers first; its matches are filtered to the candidates and capped', async () => {
  const { search, calls } = fixture({ threadSearch: true });
  const rows = await search.search('starter', { n: 500, projectId: null });
  assert.deepEqual(rows.map(row => [row.id, row.snippet]), [['b', 'starter smells']]);
  const sent = calls.find(([method]) => method === 'thread/search')[1];
  assert.equal(sent.limit, SEARCH_MAX_RESULTS);
  assert.equal(calls.filter(([method]) => method === 'thread/read').length, 0);
});

test('n is clamped to 1…200; recent sorts by updatedAt and honours before / after', async () => {
  const { search } = fixture();
  assert.equal((await search.recent({ n: 0, projectId: null })).length, 1);
  assert.deepEqual((await search.recent({ n: 999, projectId: null })).map(row => row.id), ['b', 'c', 'a']);
  assert.deepEqual((await search.recent({ n: 2, sortOrder: 'asc', projectId: null })).map(row => row.id), ['a', 'c']);
  assert.deepEqual((await search.recent({ n: 10, before: 2500, after: 500, projectId: null })).map(row => row.id), ['c', 'a']);
  assert.deepEqual((await search.recent({ n: 10, before: new Date(2500 * 1000).toISOString(), projectId: null })).map(row => row.id), ['c', 'a']);
  const [first] = await search.recent({ n: 1, projectId: null });
  assert.deepEqual(first.messages.map(message => message.role), ['user', 'assistant']);
});
