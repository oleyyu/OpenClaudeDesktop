// Import Chat History parsers (electron/chat-import/sources/*.mjs) against synthetic histories in each source's
// on-disk format (tests/fixtures/chat-import/build-home.mjs; no real logs).
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import { buildHome, IDS } from './fixtures/chat-import/build-home.mjs';
import * as codex from '../electron/chat-import/sources/codex.mjs';
import * as claudeCode from '../electron/chat-import/sources/claude-code.mjs';
import * as dsh from '../electron/chat-import/sources/dsh.mjs';
import * as grok from '../electron/chat-import/sources/grok.mjs';
import * as gemini from '../electron/chat-import/sources/gemini.mjs';
import * as opencode from '../electron/chat-import/sources/opencode.mjs';
import * as kimi from '../electron/chat-import/sources/kimi.mjs';
import * as qwen from '../electron/chat-import/sources/qwen.mjs';
import * as copilot from '../electron/chat-import/sources/copilot.mjs';
import * as cursor from '../electron/chat-import/sources/cursor.mjs';
import { decodeZstdFrames, readLines, zstdFrameLength } from '../electron/chat-import/sources/shared.mjs';

const fixture = buildHome();
test.after(() => fixture.cleanup());
const ctx = (extra = {}) => ({ home: fixture.home, env: fixture.env, cache: new Map(), ...extra });
const kinds = session => session.items.map(item => item.kind);
const texts = (session, kind) => session.items.filter(item => item.kind === kind).map(item => item.parts.map(part => part.text).join(''));
const seqOk = session => session.items.every((item, index) => item.seq === index);

test('codex list: state_5.sqlite rows, session_index titles, .zst fallback, missing rollouts, sub-agents, scanned files', async () => {
  const warnings = [];
  const list = await codex.list(ctx({ warn: (source, message) => warnings.push(message) }));
  const byId = new Map(list.map(summary => [summary.sourceId, summary]));
  assert.deepEqual([...byId.keys()].sort(), [IDS.codexUi, IDS.codexLegacy, IDS.codexFork, IDS.codexScanned].sort());
  assert.equal(byId.get(IDS.codexUi).title, 'Listing files', 'the last session_index line wins');
  assert.equal(byId.get(IDS.codexUi).key, `codex:${IDS.codexUi}`);
  assert.equal(byId.get(IDS.codexUi).gitBranch, 'main');
  assert.equal(byId.get(IDS.codexUi).updatedAt, Date.UTC(2026, 9, 1, 10, 5));
  assert.match(byId.get(IDS.codexLegacy).sourcePath, /\.jsonl\.zst$/, 'a recorded .jsonl resolves to the .zst on disk');
  assert.equal(byId.get(IDS.codexScanned).archived, true);
  assert.equal(byId.get(IDS.codexScanned).firstPrompt, 'Scanned prompt');
  assert.ok(warnings.some(message => /1 recorded thread/.test(message)));
  const all = await codex.list(ctx({ includeSubagents: true }));
  const review = all.find(summary => summary.sourceId === IDS.codexReview);
  assert.equal(review.isSubagent, true);
  assert.equal(review.threadKind, 'review');
});

test('codex list without a database scans the rollout heads (incl. compressed ones)', async () => {
  const db = path.join(fixture.home, '.codex', 'state_5.sqlite'), aside = `${db}.aside`;
  fs.renameSync(db, aside);
  try {
    const list = await codex.list(ctx());
    const ids = list.map(summary => summary.sourceId).sort();
    assert.deepEqual(ids, [IDS.codexUi, IDS.codexLegacy, IDS.codexFork, IDS.codexScanned].sort());
    assert.equal(list.find(summary => summary.sourceId === IDS.codexLegacy).firstPrompt, 'Fix the bug', 'injected user_instructions skipped');
    assert.equal(list.find(summary => summary.sourceId === IDS.codexUi).title, 'Listing files');
  } finally { fs.renameSync(aside, db); }
});

test('codex read: the UI stream (commands, file changes, MCP, web search, compaction) without injected context', async () => {
  const session = await codex.read(`codex:${IDS.codexUi}`, ctx());
  assert.ok(seqOk(session));
  assert.deepEqual(kinds(session), ['user', 'reasoning', 'tool_call', 'tool_result', 'tool_call', 'tool_result', 'tool_call', 'tool_result', 'tool_call', 'tool_result', 'assistant', 'compaction', 'user', 'assistant']);
  assert.deepEqual(texts(session, 'user'), ['List the files please', 'Thanks, and now?']);
  const [shell, edit, mcp, web] = session.items.filter(item => item.kind === 'tool_call');
  assert.deepEqual([shell.tool.category, edit.tool.category, mcp.tool.category, web.tool.category], ['shell', 'edit', 'mcp', 'web']);
  assert.equal(shell.tool.args.command, 'ls -la', 'zsh -lc unwrapped');
  assert.equal(session.items[3].result.exitCode, 0);
  assert.deepEqual(edit.tool.args.changes, [{ path: '/work/alpha/a.txt', kind: { type: 'update', move_path: null }, diff: '@@\n-old\n+new\n' }]);
  assert.deepEqual(mcp.tool.mcp, { server: 'docs', tool: 'search' });
  assert.equal(session.items.filter(item => item.kind === 'compaction').length, 1, 'compacted + ContextCompaction are one compaction');
  assert.equal(session.items[11].compaction.summary, 'Summary: the user listed files.');
  assert.equal(session.model, 'gpt-test-1');
  assert.equal(session.messageCount, 4);
});

test('codex read: a model-stream rollout from a .zst (injected, images, opaque reasoning, exit codes, orphan call)', async () => {
  const session = await codex.read(`codex:${IDS.codexLegacy}`, ctx());
  assert.deepEqual(kinds(session), ['injected', 'user', 'reasoning', 'tool_call', 'tool_result', 'tool_call', 'tool_result', 'tool_call', 'assistant']);
  assert.equal(session.items[1].parts[1].image.mime, 'image/png');
  assert.deepEqual(session.items[2].reasoning, { text: 'Plan the fix', opaque: { vendor: 'openai', model: 'gpt-old', payload: 'ENC' } });
  assert.equal(session.items[3].tool.args.command.join(' '), 'bash -lc npm test');
  assert.deepEqual([session.items[4].result.exitCode, session.items[4].result.isError, session.items[4].result.text], [1, true, '1 failing']);
  assert.equal(session.items[5].tool.category, 'edit');
  assert.equal(session.items[7].tool.callId, 'fc-orphan');
});

test('codex read: a fork gets its parent prefix up to history_base.end_ordinal_exclusive', async () => {
  const session = await codex.read(`codex:${IDS.codexFork}`, ctx());
  assert.deepEqual(texts(session, 'user'), ['List the files please', 'Forked question']);
  assert.ok(!kinds(session).includes('compaction'), 'the parent is cut before its compaction (ordinal 13)');
  assert.deepEqual(texts(session, 'assistant'), ['There are two files.', 'Forked answer']);
  assert.ok(seqOk(session));
});

test('codex: CODEX_HOME relocates the store; a truncated .zst reads up to the damage', async () => {
  const moved = path.join(fixture.home, 'elsewhere-codex');
  fs.cpSync(path.join(fixture.home, '.codex'), moved, { recursive: true });
  fs.rmSync(path.join(moved, 'state_5.sqlite'));
  const nohome = path.join(fixture.home, 'nohome');
  const list = await codex.list({ home: nohome, env: { CODEX_HOME: moved } });
  assert.equal(list.length, 4);
  assert.ok(list.every(summary => summary.sourcePath.startsWith(moved)));
  const legacy = list.find(summary => summary.sourceId === IDS.codexLegacy).sourcePath;
  const data = fs.readFileSync(legacy);
  fs.writeFileSync(legacy, data.subarray(0, Math.floor(data.length * 0.6)));
  const parsed = await codex.parseRollout(legacy);
  assert.equal(parsed.partial, true);
  const session = await codex.read(list.find(summary => summary.sourceId === IDS.codexLegacy), { home: nohome, env: { CODEX_HOME: moved } });
  assert.ok(session.warnings.some(text => /incomplete compressed frame/.test(text)));
});

test('claude-code list: CLAUDE_CONFIG_DIR and ~/.claude, Desktop titles and archive state, head/tail metadata', async () => {
  const list = await claudeCode.list(ctx());
  assert.deepEqual(list.map(summary => summary.sourceId).sort(), [IDS.claude, IDS.claudeAlt].sort());
  const main = list.find(summary => summary.sourceId === IDS.claude);
  assert.equal(main.title, 'Desktop title', 'Claude Desktop local_*.json (via cliSessionId) wins over custom-title');
  assert.equal(main.archived, true);
  assert.equal(main.firstPrompt, 'Please refactor the parser');
  assert.deepEqual([main.cwd, main.gitBranch, main.model], ['/work/claude', 'feature', 'claude-test']);
  assert.equal(list.find(summary => summary.sourceId === IDS.claudeAlt).cwd, '/work/other');
  const noDesktop = await claudeCode.list({ ...ctx(), home: fixture.home, env: { CLAUDE_CONFIG_DIR: fixture.configDir, HOME: '/nonexistent' } });
  assert.equal(noDesktop.length, 2, 'the home passed in ctx decides ~/.claude, not env.HOME');
});

test('claude-code read: the current branch (leaf, parallel tool results, compaction across the boundary), injected and opaque thinking', async () => {
  const session = await claudeCode.read(`claude-code:${IDS.claude}`, ctx());
  assert.ok(seqOk(session));
  assert.ok(!texts(session, 'user').includes('Abandoned question'), 'the rewound branch is not part of the conversation');
  assert.deepEqual(texts(session, 'user'), ['Please refactor the parser', 'Now add tests']);
  const calls = session.items.filter(item => item.kind === 'tool_call').map(item => item.tool.callId);
  const results = session.items.filter(item => item.kind === 'tool_result').map(item => item.result.callId);
  assert.deepEqual(calls, ['tu1', 'tu2', 'tu3']);
  assert.deepEqual(results.sort(), ['tu1', 'tu2', 'tu3'], 'the sibling result of a parallel call is recovered');
  assert.equal(session.items.find(item => item.kind === 'reasoning').reasoning.opaque.vendor, 'anthropic');
  assert.match(session.items.find(item => item.kind === 'compaction').compaction.summary, /parser refactored/);
  assert.ok(texts(session, 'injected').some(text => text.startsWith('<system-reminder>')));
  assert.ok(texts(session, 'injected').some(text => text.startsWith('<command-name>')));
  assert.equal(session.items.find(item => item.kind === 'user' && item.parts.some(part => part.image)).parts[1].image.mime, 'image/png');
  assert.equal(session.items.find(item => item.result?.callId === 'tu1').result.exitCode, 0);
  assert.deepEqual(texts(session, 'assistant'), ['Refactored.', 'Tests added.']);
});

test('claude-code sub-agents are listed and read only with includeSubagents', async () => {
  assert.ok(!(await claudeCode.list(ctx())).some(summary => summary.isSubagent));
  const sub = (await claudeCode.list(ctx({ includeSubagents: true }))).find(summary => summary.isSubagent);
  assert.equal(sub.sourceId, `${IDS.claude}/subagents/agent-a1.jsonl`);
  assert.equal(sub.parentId, IDS.claude);
  assert.equal(sub.title, 'Explore the repo');
  const session = await claudeCode.read(sub.key, ctx());
  assert.deepEqual(texts(session, 'assistant'), ['Explored.']);
});

test('dsh: concatenated zstd frames with a partial last frame, the last session/title, sub-agents hidden', async () => {
  const list = await dsh.list(ctx());
  assert.equal(list.length, 1);
  const [summary] = list;
  assert.deepEqual([summary.sourceId, summary.title, summary.firstPrompt, summary.cwd, summary.model], [IDS.dsh, 'Final title', 'Hello dsh', '/work/dsh', 'deepseek-test']);
  assert.match(summary.sourcePath, /session\.v4\.jsonl\.zstd$/, 'the highest generation is read');
  const session = await dsh.read(summary, ctx());
  assert.deepEqual(kinds(session), ['injected', 'user', 'reasoning', 'assistant', 'tool_call', 'tool_result', 'compaction', 'user', 'assistant']);
  assert.equal(session.items.filter(item => item.kind === 'tool_call').length, 1, 'a tool-call block and its tool/call event are one call');
  assert.deepEqual(session.items[2].reasoning, { text: 'plain thought' });
  assert.ok(session.warnings.some(text => /incomplete compressed frame/.test(text)));
  const child = (await dsh.list(ctx({ includeSubagents: true }))).find(entry => entry.isSubagent);
  assert.equal(child.parentId, IDS.dsh);
  assert.equal((await dsh.read(child.key, ctx())).items.length, 9);
});

test('dsh items: a rewind notice drops the turns after its boundary; inherited history hides for sub-agents', () => {
  const header = { type: 'session', id: 's', createdAt: 1, isSeeded: true, delegationDepth: 1 };
  const records = [header,
    { type: 'user/message', seq: 1, time: 1, data: { content: [{ type: 'text', text: 'parent prompt' }], source: { kind: 'user' } } },
    { type: 'session/end-seed', seq: 2, time: 2, data: { inherited: true } },
    { type: 'user/message', seq: 3, time: 3, data: { content: [{ type: 'text', text: 'kept' }], source: { kind: 'user' } } },
    { type: 'user/message', seq: 4, time: 4, data: { content: [{ type: 'text', text: 'rewound' }], source: { kind: 'user' } } },
    { type: 'user/message', seq: 5, time: 5, data: { content: [{ type: 'text', text: 'Rewind' }], source: { kind: 'code-desktop-rewind', boundarySeq: 3 } } },
    { type: 'user/message', seq: 6, time: 6, data: { content: [{ type: 'text', text: 'after' }], source: { kind: 'user' } } },
  ];
  const texts = items => items.map(item => item.parts[0].text);
  assert.deepEqual(texts(dsh.itemsOf(records).items), ['parent prompt', 'kept', 'after']);
  assert.deepEqual(texts(dsh.itemsOf(records, { hideInherited: true }).items), ['kept', 'after']);
});

test('grok: summary.json listing, synthetic prompts injected, encrypted reasoning opaque, backend tool calls', async () => {
  const list = await grok.list(ctx());
  assert.equal(list.length, 1, 'session_kind subagent excluded');
  assert.deepEqual([list[0].title, list[0].firstPrompt, list[0].cwd, list[0].model], ['Grok title', 'Grok prompt', '/work/grok', 'grok-test']);
  const session = await grok.read(list[0].key, ctx());
  assert.deepEqual(kinds(session), ['injected', 'injected', 'user', 'reasoning', 'assistant', 'tool_call', 'tool_result', 'tool_call', 'tool_result', 'assistant']);
  assert.equal(session.items[3].reasoning.opaque.vendor, 'xai');
  assert.equal(session.items[5].tool.category, 'shell');
  assert.equal(session.items[7].tool.category, 'web');
  assert.equal((await grok.list(ctx({ includeSubagents: true }))).length, 2);
});

test('gemini: upserts, $rewindTo, $set metadata, notices not replayed', async () => {
  const [summary] = await gemini.list(ctx());
  assert.deepEqual([summary.title, summary.firstPrompt, summary.cwd, summary.experimental], ['Gemini summary title', 'Gemini prompt', '/work/gem', false]);
  const session = await gemini.read(summary.key, ctx());
  assert.deepEqual(kinds(session), ['user', 'reasoning', 'assistant', 'tool_call', 'tool_result']);
  assert.deepEqual(texts(session, 'assistant'), ['Gemini answer'], 'the last upsert of a message wins');
  assert.equal(session.items[4].result.text, 'x');
});

test('opencode: 1.x message/part and 2.x session_message schemas; child sessions are sub-agents', async () => {
  const list = await opencode.list(ctx());
  assert.deepEqual(list.map(summary => summary.sourceId).sort(), ['ses_v1', 'ses_v2'], 'empty sessions and children are left out');
  const v1 = await opencode.read('opencode:ses_v1', ctx());
  assert.deepEqual(kinds(v1), ['injected', 'user', 'reasoning', 'tool_call', 'tool_result', 'assistant']);
  assert.equal(v1.model, 'prov/oc-model');
  assert.equal(v1.items[4].result.exitCode, 0);
  const v2 = await opencode.read('opencode:ses_v2', ctx());
  assert.deepEqual(kinds(v2), ['user', 'injected', 'reasoning', 'tool_call', 'tool_result', 'assistant', 'compaction', 'tool_call', 'tool_result']);
  assert.equal(v2.items[3].tool.category, 'edit');
  assert.equal(v2.items[6].compaction.summary, 'v2 summary');
  assert.equal(v2.items[8].result.text, '/work/oc2');
  const all = await opencode.list(ctx({ includeSubagents: true }));
  assert.equal(all.find(summary => summary.sourceId === 'ses_child').parentId, 'ses_v1');
  const excluded = await opencode.list(ctx({ exclude: [path.join(fixture.home, '.local', 'share', 'opencode')] }));
  assert.equal(excluded.length, 0, 'an excluded database is never opened');
});

test('kimi (legacy kimi-cli), qwen, copilot and cursor parse their documented layouts', async () => {
  const [k] = await kimi.list(ctx());
  assert.deepEqual([k.firstPrompt, k.cwd, k.experimental], ['Kimi prompt', '/work/kimi', true], 'the legacy kimi-cli layout stays experimental (Kimi Code sessions are not)');
  assert.deepEqual(kinds(await kimi.read(k.key, ctx())), ['injected', 'user', 'reasoning', 'assistant', 'tool_call', 'tool_result']);
  const [q] = await qwen.list(ctx());
  assert.deepEqual([q.firstPrompt, q.cwd, q.model], ['Qwen prompt', '/work/qwen', 'qwen-test']);
  const qs = await qwen.read(q.key, ctx());
  assert.deepEqual(texts(qs, 'user'), ['Qwen prompt', 'Follow-up'], 'the abandoned branch is skipped');
  assert.deepEqual(kinds(qs), ['user', 'reasoning', 'assistant', 'tool_call', 'tool_result', 'user']);
  const [c] = await copilot.list(ctx());
  assert.deepEqual([c.firstPrompt, c.cwd, c.gitBranch, c.model], ['Copilot prompt', '/work/copilot', 'dev', 'gpt-x']);
  const cs = await copilot.read(c.key, ctx());
  assert.equal(cs.items.filter(item => item.kind === 'tool_call').length, 1, 'toolRequests and execution_start are one call');
  const [u] = await cursor.list(ctx());
  assert.deepEqual([u.title, u.firstPrompt, u.fidelity, u.model], ['Cursor chat', 'Cursor prompt', 'partial', 'cursor-model']);
  assert.deepEqual(kinds(await cursor.read(u.key, ctx())), ['user', 'reasoning', 'assistant', 'tool_call', 'tool_result']);
});

test('experimental sources never throw out of list(): damaged files yield nothing', async () => {
  const broken = buildHome();
  try {
    const md5dir = fs.readdirSync(path.join(broken.home, '.cursor', 'chats'))[0];
    fs.writeFileSync(path.join(broken.home, '.cursor', 'chats', md5dir, 'chat-1', 'store.db'), 'not a database');
    fs.writeFileSync(path.join(broken.home, '.kimi', 'kimi.json'), '{broken');
    fs.writeFileSync(path.join(broken.home, '.gemini', 'tmp', 'work-gem', 'chats', 'session-x.json'), '[[[');
    fs.mkdirSync(path.join(broken.home, '.qwen', 'projects', 'p', 'chats', 'dir.jsonl'), { recursive: true });
    fs.writeFileSync(path.join(broken.home, '.copilot', 'session-state', 'copilot-session-1', 'events.jsonl'), '\u0000\u0001garbage');
    const c = { home: broken.home, env: broken.env, cache: new Map() };
    assert.deepEqual(await cursor.list(c), []);
    assert.equal((await kimi.list(c)).length, 1, 'an unreadable index only loses the cwd');
    assert.equal((await gemini.list(c)).length, 1);
    assert.equal((await qwen.list(c)).length, 1);
    assert.deepEqual(await copilot.list(c), []);
    const empty = { home: path.join(broken.home, 'missing'), env: {}, cache: new Map() };
    for (const parser of [codex, claudeCode, dsh, grok, gemini, opencode, kimi, qwen, copilot, cursor]) assert.deepEqual(await parser.list(empty), [], parser.id);
  } finally { broken.cleanup(); }
});

test('shared zstd: frame lengths by block walk, skippable frames, multi-frame streaming, partial tails', async () => {
  const a = zlib.zstdCompressSync(Buffer.from('{"n":1}\n{"n":2}\n')), b = zlib.zstdCompressSync(Buffer.from('{"n":3}\n'));
  assert.equal(zstdFrameLength(a, 0), a.length);
  const skippable = Buffer.concat([Buffer.from([0x50, 0x2a, 0x4d, 0x18, 3, 0, 0, 0]), Buffer.from('xyz')]);
  const joined = Buffer.concat([a, skippable, b]);
  assert.equal(decodeZstdFrames(joined).data.toString(), '{"n":1}\n{"n":2}\n{"n":3}\n');
  assert.deepEqual(decodeZstdFrames(Buffer.concat([a, b.subarray(0, 6)])), { data: zlib.zstdDecompressSync(a), partial: true, frames: 1 });
  assert.equal(decodeZstdFrames(joined, { maxFrames: 1 }).data.toString(), '{"n":1}\n{"n":2}\n');
  const file = path.join(fixture.home, 'multi.jsonl.zst');
  fs.writeFileSync(file, Buffer.concat([a, b, a.subarray(0, 9)]));
  const lines = [];
  let partial = false;
  for await (const line of readLines(file, { onPartial: () => { partial = true; } })) lines.push(line);
  assert.deepEqual(lines, ['{"n":1}', '{"n":2}', '{"n":3}']);
  assert.equal(partial, true);
});
