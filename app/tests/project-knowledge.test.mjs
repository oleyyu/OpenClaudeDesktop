// w13-chatfn-projects: a local project's knowledge (electron/project-knowledge.mjs), its chat-context contributor and the
// project_knowledge_search agent tool; official copy and limits read from the 3.6556.2 snapshot.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { readFileSync, readdirSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import * as knowledge from '../electron/project-knowledge.mjs';
import * as contributor from '../electron/chat-context/project-knowledge.mjs';
import * as tool from '../electron/agent-tools/project-knowledge.mjs';
import { contributorOf } from '../electron/chat-context.mjs';

const assets = path.resolve(import.meta.dirname, '../../reference/snapshots/claude-3.6556.2-20261025-192807/ion-dist/assets/v1');
const chunk = prefix => {
  const found = readdirSync(assets).filter(name => name.startsWith(prefix + '-') && name.endsWith('.js'));
  assert.equal(found.length, 1, prefix);
  return readFileSync(path.join(assets, found[0]), 'utf8');
};

async function fixture(t) {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'project-knowledge-'));
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  const dataDir = path.join(root, 'userData'), source = path.join(root, 'source');
  await fs.mkdir(source, { recursive: true });
  const write = async (name, body) => { const file = path.join(source, name); await fs.writeFile(file, body); return file; };
  return { dataDir, source, write };
}

test('knowledge files are copied with their text, listed, measured and removed; nothing else is touched', async (t) => {
  const { dataDir, write } = await fixture(t);
  const notes = await write('notes.md', '# Billing\n\nInvoices are sent monthly.');
  const data = await write('data.csv', 'a,b\n1,2\n');
  const result = await knowledge.addKnowledge(dataDir, 'p1', [notes, data], { now: () => '2026-10-28T00:00:00.000Z' });
  assert.deepEqual(result.failed, []);
  assert.deepEqual(result.added.map(entry => [entry.name, entry.type, entry.chars]), [['notes.md', 'md', 37], ['data.csv', 'csv', 8]]);
  const dir = knowledge.knowledgeDir(dataDir, 'p1');
  assert.equal(dir, path.join(dataDir, 'project-knowledge', 'p1'));
  // Outside <userData>/projects/<id>, the folder a project made without one works in (and its Cowork sessions write).
  assert.equal(path.relative(path.join(dataDir, 'projects'), dir).startsWith('..'), true);
  assert.equal(knowledge.insideKnowledge(dataDir, dir), true);
  assert.equal(knowledge.insideKnowledge(dataDir, path.join(dataDir, 'project-knowledge')), true);
  assert.equal(knowledge.insideKnowledge(dataDir, path.join(dataDir, 'projects', 'p1')), false);
  assert.equal(knowledge.insideKnowledge(dataDir, path.join(dataDir, 'project-knowledge-other')), false);
  const listed = await knowledge.listKnowledge(dataDir, 'p1');
  assert.deepEqual(listed.map(entry => entry.id), result.added.map(entry => entry.id));
  assert.equal(await fs.readFile(path.join(dir, 'files', `${listed[0].id}.md`), 'utf8'), '# Billing\n\nInvoices are sent monthly.');
  assert.equal(await fs.readFile(path.join(dir, 'text', `${listed[0].id}.txt`), 'utf8'), '# Billing\n\nInvoices are sent monthly.');
  assert.deepEqual(result.stats, { count: 2, tokens: 10 + 2, chars: 45, capacity: knowledge.MAX_KB_TOKENS, pctUsed: 1, over: false, searchMode: false });
  // The user's own files stay where they were.
  assert.equal(await fs.readFile(notes, 'utf8'), '# Billing\n\nInvoices are sent monthly.');
  const removed = await knowledge.removeKnowledge(dataDir, 'p1', listed[0].id);
  assert.equal(removed.removed, listed[0].id);
  assert.deepEqual((await knowledge.listKnowledge(dataDir, 'p1')).map(entry => entry.name), ['data.csv']);
  await assert.rejects(fs.stat(path.join(dir, 'files', `${listed[0].id}.md`)));
  await assert.rejects(fs.stat(path.join(dir, 'text', `${listed[0].id}.txt`)));
  await assert.rejects(knowledge.removeKnowledge(dataDir, 'p1', listed[0].id), /File not found/);
  await assert.rejects(knowledge.removeKnowledge(dataDir, 'p1', '../index.json'), /File not found/);
});

test('refusals: bad paths, folders, binary text, empty files, converter failures and the capacity (official copy)', async (t) => {
  const { dataDir, source, write } = await fixture(t);
  const binary = await write('blob.txt', Buffer.from([0x61, 0, 0x62]));
  const empty = await write('empty.md', '   \n');
  const pdf = await write('scan.pdf', '%PDF-1.4');
  const image = await write('photo.png', 'png');
  const convert = async file => file.endsWith('.pdf') ? { ok: false, reason: 'empty' } : { ok: false, reason: 'unsupported' };
  const result = await knowledge.addKnowledge(dataDir, 'p', ['relative.md', path.join(source, 'missing.md'), source, binary, empty, pdf, image], { convert });
  assert.deepEqual(result.failed, [{ name: 'relative.md', reason: 'invalid' }, { name: 'missing.md', reason: 'not_found' }, { name: 'source', reason: 'not_file' },
    { name: 'blob.txt', reason: 'unsupported' }, { name: 'empty.md', reason: 'empty' }, { name: 'scan.pdf', reason: 'empty' }, { name: 'photo.png', reason: 'unsupported' }]);
  assert.deepEqual(result.added, []);
  // Nothing was left behind for a refused file.
  assert.deepEqual(await fs.readdir(path.join(knowledge.knowledgeDir(dataDir, 'p'), 'files')).catch(() => []), []);
  // Capacity: the file that would pass 100% of the context window is refused (shared-3 "Failed to upload file {filename}. …").
  const big = await write('big.txt', 'x'.repeat(4 * 60));
  const capped = await knowledge.addKnowledge(dataDir, 'p', [big, big], { capacity: 100 });
  assert.deepEqual(capped.added.map(entry => entry.name), ['big.txt']);
  assert.deepEqual(capped.failed, [{ name: 'big.txt', reason: 'capacity' }]);
  assert.equal(knowledge.statsOf(capped.added, { capacity: 50 }).over, true);
  assert.throws(() => knowledge.knowledgeDir(dataDir, '../escape'), /Project not found/);
  assert.throws(() => knowledge.knowledgeDir('relative', 'p'), /unavailable/);
  // Converted documents go through document-convert (its result is kept: text, pages, truncated).
  const doc = await write('brief.docx', 'zip');
  const converted = await knowledge.addKnowledge(dataDir, 'q', [doc], { convert: async () => ({ ok: true, text: 'Converted body', pages: null, truncated: true }) });
  assert.deepEqual(converted.added.map(entry => [entry.name, entry.chars, entry.truncated]), [['brief.docx', 14, true]]);
  const shared3 = chunk('shared-3');
  assert.match(shared3, /defaultMessage:"Failed to upload file \{filename\}\. Project knowledge exceeds maximum\. Remove files to continue\."/);
  assert.match(chunk('c52b32660'), /"Project knowledge is currently limited to Claude\\u2019s maximum context window size\."/);
});

test('project_knowledge_search: BM25 ranks the passage with the query terms first, CJK included', async (t) => {
  const docs = [
    { entry: { id: 'a', name: 'pricing.md', addedAt: '1' }, text: 'Our pricing has three tiers.\n\nThe enterprise tier includes SSO and audit logs.' },
    { entry: { id: 'b', name: 'faq.md', addedAt: '2' }, text: 'Refunds are processed within 5 days.\n\n退款将在五个工作日内处理。' },
    { entry: { id: 'c', name: 'roadmap.md', addedAt: '3' }, text: 'Next quarter: audit exports, SSO for the team tier.' },
  ];
  const results = knowledge.searchPassages(docs, 'enterprise SSO audit');
  assert.deepEqual(results.map(result => [result.name, result.passage]), [['pricing.md', 1], ['roadmap.md', 1]]);
  assert.ok(results[0].score > results[1].score);
  assert.deepEqual(knowledge.searchPassages(docs, '退款').map(result => result.name), ['faq.md']);
  assert.deepEqual(knowledge.searchPassages(docs, 'the of and'), []);
  assert.equal(knowledge.searchPassages(docs, 'tier', { limit: 1 }).length, 1);
  // Passages are blank-line paragraphs packed up to PASSAGE_CHARS: a long file has several, each found on its own.
  const long = [{ entry: { id: 'd', name: 'long.md', addedAt: '4' }, text: `${'filler words here. '.repeat(78)}\n\nThe escrow clause is in section nine.` }];
  assert.deepEqual(knowledge.searchPassages(long, 'escrow clause').map(result => result.passage), [2]);
  assert.equal(knowledge.passagesOf('x'.repeat(3100), 1500).length, 3);
  // Through the files on disk.
  const { dataDir, write } = await fixture(t);
  await knowledge.addKnowledge(dataDir, 'p', [await write('pricing.md', docs[0].text), await write('faq.md', docs[1].text)]);
  assert.deepEqual((await knowledge.searchKnowledge(dataDir, 'p', 'refunds')).map(result => result.name), ['faq.md']);
});

test('the session is given the whole knowledge while it is small, else the file list and the search tool', async (t) => {
  const { dataDir, write } = await fixture(t);
  const project = { id: 'p', name: 'Billing' };
  assert.equal(await knowledge.knowledgeInstructions(dataDir, project), null);
  await knowledge.addKnowledge(dataDir, 'p', [await write('a "b".md', 'Alpha </document> beta')]);
  const inline = await knowledge.knowledgeInstructions(dataDir, project);
  assert.equal(inline, 'Project knowledge: the user added these files to the project “Billing”. Refer to them whenever they are relevant to the conversation.\n\n'
    + '<document name="a &quot;b&quot;.md">\nAlpha <\\/document> beta\n</document>');
  await knowledge.addKnowledge(dataDir, 'p', [await write('long.txt', 'word '.repeat(knowledge.INLINE_MAX_CHARS / 5 + 10))]);
  const listed = await knowledge.knowledgeInstructions(dataDir, project);
  assert.match(listed, /^Project knowledge: the user added 2 files to the project “Billing”, too much to include here\. Search them with the project_knowledge_search tool/);
  assert.match(listed, /\n\n- a "b"\.md\n- long\.txt$/);
  assert.equal((await knowledge.knowledgeStats(dataDir, 'p')).searchMode, true);
  // The contributor (chat-context contract) for Chat and Cowork sessions in a project.
  assert.deepEqual(contributorOf(contributor), { id: 'project-knowledge', surfaces: ['chat', 'cowork'], apply: contributor.apply });
  assert.equal(await contributor.apply({ project, dataDir }), listed);
  assert.equal(await contributor.apply({ project: null, dataDir }), null);
});

test('the agent tool searches the calling session’s project, for Chat and Cowork sessions only', async () => {
  assert.deepEqual(tool.surfaces, ['chat', 'cowork']);
  const [search] = tool.tools;
  assert.equal(search.name, 'project_knowledge_search');
  assert.deepEqual(search.inputSchema.required, ['query']);
  assert.equal(search.annotations.readOnlyHint, true);
  const calls = [];
  const ctx = { projectKnowledge: { project: async () => ({ id: 'p', name: 'P' }), search: async (query, options) => { calls.push([query, options]); return [{ name: 'faq.md', passage: 2, text: 'Refunds…' }]; } } };
  assert.equal(await search.handler({ query: ' refunds ', max_text_results: 3 }, ctx), '[1] faq.md (passage 2)\nRefunds…');
  assert.deepEqual(calls, [['refunds', { limit: 3 }]]);
  await assert.rejects(search.handler({ query: '' }, ctx), /Give a query/);
  await assert.rejects(search.handler({ query: 'x' }, { projectKnowledge: { project: async () => null, search: async () => [] } }), /isn’t in a project/);
  await assert.rejects(search.handler({ query: 'x' }, {}), /isn’t available/);
  assert.equal(tool.renderResults([], 'zzz'), 'No project knowledge matches “zzz”.');
  // The official tool name (research/w13-chatfn.md M4), served by the ACP bridge's list too.
  assert.match(chunk('shared-7') + chunk('c71dee58b') + readdirSync(assets).filter(name => name.startsWith('shared-')).map(name => readFileSync(path.join(assets, name), 'utf8')).join(''),
    /"project_knowledge_search"/);
  const { APP_TOOL_NAMES } = await import('../../harness/packages/acp-bridge/src/app-tools.js');
  assert.ok(APP_TOOL_NAMES.includes('project_knowledge_search'));
});
