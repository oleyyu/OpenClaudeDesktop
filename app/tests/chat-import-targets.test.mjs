// Import Chat History, the target side (analysis/import-chat-history/DESIGN.md "主进程接口"): every strategy of
// electron/chat-import/targets.mjs importInto against fake core clients, its fallbacks, the token budgets and secret
// redaction of prepareImport, the desktop:call "chat-import" ops of electron/chat-import/index.cjs (bookkeeping, the
// display prefix file, needs-core-switch, one import per job), the real worker over the synthetic home, main.cjs's
// wiring, and the transcript's prefix merge (src/import-history-display.mjs). Synthetic sessions only; no core, no spawn.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';
import {
  DEFAULT_CONTEXT_WINDOW, DEFAULT_INSTRUCTIONS, IMPORT_MAX_MESSAGES, INJECT_BATCH, IMPORTED_LEFT_OUT, MINIMAX_GLOBAL_MAX_BYTES, MINIMAX_HANDOFF_MARGIN,
  SEED_CALLS_MAX_CHARS, boundCalls, fitHandoffInstructions, handoffInstructions, importBudgets, importInto, minimaxHandoffLimit, planStrategies, prepareImport,
  responseItemsOf, trimMessages,
} from '../electron/chat-import/targets.mjs';
import { redactSecrets, REDACTED } from '../electron/chat-import/redact.mjs';
import { estimateTokens, headWithinTokens, tailWithinTokens } from '../electron/chat-import/text-budget.mjs';
import * as realConvert from '../electron/chat-import/convert.mjs';
import { previewTurns } from '../electron/chat-import/ops.mjs';
import { ItemList, makeSession, makeSummary } from '../electron/chat-import/model.mjs';
import { IMPORTED_DIVIDER, importedDividerLabel, isImportedTurn, mayHaveImportedPrefix, withImportedPrefix } from '../src/import-history-display.mjs';
import { setLocale } from '../electron/i18n/index.mjs';
import { buildHome, IDS } from './fixtures/chat-import/build-home.mjs';

const require = createRequire(import.meta.url);
const { createChatImport, createWorkerRunner, forgetPrefix, raceImport, unwrapRpc } = require('../electron/chat-import/index.cjs');
const appDir = path.resolve(import.meta.dirname, '..');

/** A synthetic ImportedSession: `pairs` user/assistant texts. */
function session(source, pairs = [['Fix the build', 'Done.'], ['Thanks', 'Any time.']], extra = {}) {
  const items = pairs.flatMap(([user, assistant], index) => [
    { seq: index * 2, kind: 'user', parts: [{ text: user }] },
    ...(assistant ? [{ seq: index * 2 + 1, kind: 'assistant', parts: [{ text: assistant }] }] : []),
  ]);
  return { key: `${source}:s-1`, source, sourceId: 's-1', sourcePath: '/tmp/s-1.jsonl', title: 'Build fix', firstPrompt: pairs[0][0], cwd: '/work/app', warnings: [], items, ...extra };
}

/** convert.mjs stand-in: text items only. */
const convert = {
  toDshSeed: (s) => ({ messages: s.items.map((item) => ({ role: item.kind, text: item.parts.map((part) => part.text).join('') })) }),
  toTranscriptText: (s) => ({ text: s.items.map((item) => `${item.kind}: ${item.parts[0].text}`).join('\n'), truncated: false, kept: s.items.length, total: s.items.length }),
  toCodexTurns: (s) => s.items.filter((item) => item.kind === 'user').map((item, index) => ({ id: `t${index}`, status: 'completed',
    items: [{ type: 'userMessage', id: `u${index}`, content: [{ type: 'text', text: item.parts[0].text }] }] })),
};
const prepare = (s, contextWindow = null, using = convert) => prepareImport(s, { convert: using, budgets: importBudgets(contextWindow) });

/** Fake core: `handlers[method](params)` answers; every call is logged as [via, method, params, options]. */
function fakeCore(id, capabilities = {}, handlers = {}) {
  const calls = [];
  const answer = (via) => async (method, params, options) => {
    calls.push([via, method, params, options]);
    const handler = handlers[method];
    if (!handler) throw new Error(`unexpected ${method}`);
    return handler(params);
  };
  const forked = [], imported = [], discarded = [];
  return {
    core: { id, capabilities }, calls, forked, imported, discarded,
    rpc: answer('rpc'), request: answer('request'),
    fork: handlers.fork ? async (threadId) => { forked.push(threadId); return handlers.fork(threadId); } : undefined,
    importThread: handlers.import ? async (params) => { imported.push(params); return handlers.import(params); } : undefined,
    discard: async (threadId) => { discarded.push(threadId); },
  };
}
const run = (fake, s, extra = {}) => importInto({ prepared: prepare(s, extra.contextWindow ?? null), core: fake.core, rpc: fake.rpc, request: fake.request,
  fork: fake.fork, importThread: fake.importThread, discard: fake.discard, now: () => 1000, ...extra });
const methods = (fake) => fake.calls.map(([via, method]) => `${via}:${method}`);

test('strategy plan per core: fork for the core\'s own store, native, inject on Codex, handoff last; MiMo hands off', () => {
  assert.deepEqual(planStrategies(session('codex'), { id: 'codex' }), ['fork', 'inject', 'handoff']);
  assert.deepEqual(planStrategies(session('dsh'), { id: 'deepseek', capabilities: { threadImport: true } }), ['fork', 'native', 'handoff']);
  assert.deepEqual(planStrategies(session('claude-code'), { id: 'deepseek', capabilities: { threadImport: true } }), ['native', 'handoff']);
  assert.deepEqual(planStrategies(session('claude-code'), { id: 'mimo', capabilities: { historyImport: ['cc', 'codex', 'opencode'] } }), ['handoff']);
  assert.deepEqual(planStrategies(session('codex'), { id: 'kimi' }), ['handoff']);
});

test('fork: a Codex rollout on Codex is forked into a new session; the original is never resumed in place', async () => {
  const fake = fakeCore('codex', {}, { fork: () => ({ threadId: 'cx-fork' }), 'thread/name/set': () => ({}) });
  const result = await run(fake, session('codex'));
  assert.deepEqual([result.threadId, result.strategy, result.prefix], ['cx-fork', 'fork', null]);
  assert.deepEqual(fake.forked, ['s-1']);
  assert.deepEqual(methods(fake), ['rpc:thread/name/set'], 'no thread/read, no resume-add of the original');
  assert.deepEqual(fake.calls[0][2], { threadId: 'cx-fork', name: 'Build fix' });
  assert.deepEqual(result.importedFrom, { source: 'codex', sourceId: 's-1', title: 'Build fix', importedAt: 1000, strategy: 'fork' });
});

test('fork refused (or no fork available) falls back to the normal import', async () => {
  const fake = fakeCore('codex', {}, { fork: () => { throw new Error('no such rollout'); }, 'thread/start': () => ({ thread: { id: 'cx-2' } }), 'thread/inject_items': () => ({}), 'thread/name/set': () => ({}) });
  const result = await run(fake, session('codex'));
  assert.deepEqual([result.threadId, result.strategy], ['cx-2', 'inject']);
  assert.deepEqual(result.warnings, ['fork-failed']);
  assert.ok(result.details.some((line) => /no such rollout/.test(line)));
  const plain = fakeCore('codex', {}, { 'thread/start': () => ({ thread: { id: 'cx-3' } }), 'thread/inject_items': () => ({}), 'thread/name/set': () => ({}) });
  assert.equal((await run(plain, session('codex'))).strategy, 'inject');
});

test('native: the DeepSeek bridge gets only the seed fields (main-only importThread), redacted', async () => {
  const s = session('dsh', [['Use key sk-abcdefghijklmnopqrstuvwx1234 please', 'Done.'], ['Thanks', 'Any time.']]);
  const fake = fakeCore('deepseek', { threadImport: true, customization: true }, { fork: () => null, import: () => ({ thread: { id: 'ds-1' } }) });
  const result = await run(fake, s, { cwd: '/work/app' });
  assert.deepEqual([result.threadId, result.strategy, result.prefix], ['ds-1', 'native', null]);
  assert.deepEqual(fake.calls, [], 'nothing through the renderer-reachable rpc');
  const params = fake.imported[0];
  assert.deepEqual(Object.keys(params).sort(), ['cwd', 'importedFrom', 'messages', 'title']);
  assert.equal(params.title, 'Build fix');
  assert.deepEqual(params.messages.map((message) => message.role), ['user', 'assistant', 'user', 'assistant']);
  assert.equal(params.messages[0].text, `Use key ${REDACTED} please`);
  assert.deepEqual(params.importedFrom, { source: 'dsh', sourceId: 's-1', title: 'Build fix', sourcePath: '/tmp/s-1.jsonl' });
  assert.deepEqual(result.warnings, ['fork-failed', 'secrets-redacted']);
  assert.equal(result.redacted, 1);
});

test('native failure falls back to handoff with a code (the message only in details)', async () => {
  const fake = fakeCore('deepseek', { threadImport: true, customization: true }, { import: () => { throw new Error('seed rejected'); }, 'thread/start': () => ({ thread: { id: 'h-1' } }), 'thread/name/set': () => ({}) });
  const result = await run(fake, session('claude-code'));
  assert.equal(result.strategy, 'handoff');
  assert.deepEqual(result.warnings, ['native-failed']);
  assert.deepEqual(result.details, ['native-failed: seed rejected']);
  assert.deepEqual(methods(fake), ['rpc:thread/start', 'rpc:thread/name/set']);
});

test('inject: Codex gets ResponseItem messages in batches, the default instructions, a name, and a display prefix', async () => {
  const pairs = Array.from({ length: INJECT_BATCH }, (_, index) => [`q${index}`, `a${index}`]);
  const fake = fakeCore('codex', {}, { 'thread/start': () => ({ thread: { id: 'cx-1' } }), 'thread/inject_items': () => ({}), 'thread/name/set': () => ({}) });
  const result = await run(fake, session('claude-code', pairs));
  assert.deepEqual([result.threadId, result.strategy], ['cx-1', 'inject']);
  assert.deepEqual(methods(fake), ['rpc:thread/start', 'request:thread/inject_items', 'request:thread/inject_items', 'rpc:thread/name/set']);
  assert.deepEqual(fake.calls[0][2], { cwd: '/work/app', developerInstructions: DEFAULT_INSTRUCTIONS });
  const injected = fake.calls.filter(([, method]) => method === 'thread/inject_items').flatMap(([, , params]) => params.items);
  assert.equal(injected.length, INJECT_BATCH * 2);
  assert.deepEqual(injected.slice(0, 2), [
    { type: 'message', role: 'user', content: [{ type: 'input_text', text: 'q0' }] },
    { type: 'message', role: 'assistant', content: [{ type: 'output_text', text: 'a0' }] },
  ]);
  assert.equal(result.prefix.count, INJECT_BATCH);
  assert.equal(JSON.parse(result.prefix.json).length, INJECT_BATCH);
  assert.deepEqual(fake.calls[3][2], { threadId: 'cx-1', name: 'Build fix' });
});

test('inject failure archives the empty session and hands the transcript off, appended after the default instructions', async () => {
  let started = 0;
  const fake = fakeCore('codex', {}, { 'thread/start': () => ({ thread: { id: `cx-${++started}` } }), 'thread/inject_items': () => { throw new Error('method not found'); }, 'thread/name/set': () => { throw new Error('not yet'); } });
  const result = await run(fake, session('opencode'));
  assert.deepEqual([result.threadId, result.strategy], ['cx-2', 'handoff']);
  assert.deepEqual(fake.discarded, ['cx-1']);
  assert.deepEqual(result.warnings, ['inject-failed', 'title-not-set']);
  const [, , params, options] = fake.calls.filter(([, method]) => method === 'thread/start')[1];
  assert.equal(params.developerInstructions, DEFAULT_INSTRUCTIONS, 'the session\'s own instructions stay; the handoff is appended by main');
  assert.match(options.appendInstructions, /imported from OpenCode \("Build fix"\)/);
  assert.match(options.appendInstructions, /<imported_conversation>\nuser: Fix the build/);
  assert.equal(result.prefix.count, 2);
});

test('handoff: a core with its own customization gets no default line; the transcript goes as appendInstructions', async () => {
  const fake = fakeCore('kimi', { customization: true }, { 'thread/start': () => ({ thread: { id: 'k-1' } }), 'thread/name/set': () => ({}) });
  const result = await run(fake, session('codex'), { startParams: { developerInstructions: 'Project rules.' } });
  assert.deepEqual([result.threadId, result.strategy], ['k-1', 'handoff']);
  const [, , params, options] = fake.calls[0];
  assert.deepEqual(params, { developerInstructions: 'Project rules.', cwd: '/work/app' });
  assert.ok(options.appendInstructions.startsWith('The conversation below was imported from Codex'));
  const bare = fakeCore('kimi', { customization: true }, { 'thread/start': () => ({ thread: { id: 'k-2' } }), 'thread/name/set': () => ({}) });
  await run(bare, session('codex'));
  assert.equal(bare.calls[0][2].developerInstructions, undefined);
  assert.deepEqual(JSON.parse(result.prefix.json).map((turn) => turn.id), ['t0', 't1']);
});

test('MiMo: no whole-source native import any more, a handoff', async () => {
  const fake = fakeCore('mimo', { customization: true, historyImport: ['cc', 'codex', 'opencode'] }, { 'thread/start': () => ({ thread: { id: 'm-1' } }), 'thread/name/set': () => ({}) });
  const result = await run(fake, session('claude-code'));
  assert.equal(result.strategy, 'handoff');
  assert.deepEqual(methods(fake), ['rpc:thread/start', 'rpc:thread/name/set']);
});

test('native on any core reporting threadImport; fork only where the bridge reaches the original without writing it', () => {
  const caps = { threadImport: true };
  for (const core of ['gemini', 'kimi', 'qwen']) {
    assert.deepEqual(planStrategies(session(core), { id: core, capabilities: caps }), ['native', 'handoff'], `${core}→${core}: no fork (opening the original writes to it)`);
    assert.deepEqual(planStrategies(session('codex'), { id: core, capabilities: caps }), ['native', 'handoff']);
  }
  for (const core of ['opencode', 'mimo']) {
    assert.deepEqual(planStrategies(session(core), { id: core, capabilities: caps }), ['fork', 'native', 'handoff'], `${core}→${core}`);
    assert.deepEqual(planStrategies(session('claude-code'), { id: core, capabilities: caps }), ['native', 'handoff']);
  }
  // ZCode's thread/fork resumes the original first (session/resume writes to it): never a fork, always a new session.
  assert.deepEqual(planStrategies(session('zcode'), { id: 'zcode', capabilities: caps }), ['native', 'handoff'], 'zcode→zcode: no fork');
  assert.deepEqual(planStrategies(session('zcode'), { id: 'zcode', capabilities: {} }), ['handoff'], 'an old ZCode bridge: handoff, still no fork');
  assert.deepEqual(planStrategies(session('opencode'), { id: 'mimo', capabilities: caps }), ['native', 'handoff'], 'another store: no fork');
  assert.deepEqual(planStrategies(session('minimax'), { id: 'minimax', capabilities: {} }), ['handoff'], 'MiniMax: no writer, no fork');
});

test('native on an ACP / OpenCode / ZCode core: the same four fields; METHOD_NOT_FOUND falls back to handoff', async () => {
  for (const id of ['qwen', 'zcode', 'opencode']) {
    const fake = fakeCore(id, { threadImport: true, customization: true }, { import: () => ({ thread: { id: `${id}-1` }, import: { mode: 'history', messages: 4 } }) });
    const result = await run(fake, session('codex'), { cwd: '/work/app' });
    assert.deepEqual([result.threadId, result.strategy, result.prefix], [`${id}-1`, 'native', null], id);
    assert.deepEqual(Object.keys(fake.imported[0]).sort(), ['cwd', 'importedFrom', 'messages', 'title']);
  }
  const refused = fakeCore('gemini', { threadImport: true, customization: true }, {
    import: () => { throw Object.assign(new Error('Gemini CLI can’t import a conversation as one of its own sessions.'), { code: -32601 }); },
    'thread/start': () => ({ thread: { id: 'g-h' } }), 'thread/name/set': () => ({}),
  });
  const result = await run(refused, session('kimi'));
  assert.deepEqual([result.threadId, result.strategy], ['g-h', 'handoff']);
  assert.deepEqual(result.warnings, ['native-failed']);
  assert.ok(result.prefix, 'the handoff keeps its display prefix');
});

test('native answered with import.mode transcript (OpenCode took it as one context message): kept as an inject, prefix saved', async () => {
  const fake = fakeCore('opencode', { threadImport: true, customization: true }, { import: () => ({ thread: { id: 'oc-t' }, import: { mode: 'transcript', messages: 4 } }) });
  const result = await run(fake, session('claude-code'));
  assert.deepEqual([result.threadId, result.strategy], ['oc-t', 'inject']);
  assert.equal(result.prefix.count, 2);
  assert.equal(result.importedFrom.strategy, 'inject');
  assert.deepEqual(methods(fake), [], 'no thread/start, no rename: the bridge made and named it');
});

test('same-source fork on OpenCode / MiMo: the bridge forks the session; a refused fork goes native', async () => {
  const fake = fakeCore('mimo', { threadImport: true, customization: true }, { fork: () => ({ threadId: 'm-fork' }), 'thread/name/set': () => ({}) });
  const forked = await run(fake, session('mimo'));
  assert.deepEqual([forked.threadId, forked.strategy], ['m-fork', 'fork']);
  assert.deepEqual(fake.forked, ['s-1']);
  const refused = fakeCore('opencode', { threadImport: true, customization: true }, { fork: () => { throw new Error('This session is not available in OpenCode.'); }, import: () => ({ thread: { id: 'oc-n' } }) });
  const result = await run(refused, session('opencode'), { cwd: '/fallback' });
  assert.deepEqual([result.threadId, result.strategy], ['oc-n', 'native']);
  assert.equal(refused.imported[0].cwd, '/fallback');
  assert.deepEqual(result.warnings, ['fork-failed']);
});

test('ZCode session on ZCode: never forked (the fork would resume and write the original); a new session through native', async () => {
  const fake = fakeCore('zcode', { threadImport: true, customization: true }, {
    fork: () => { throw new Error('fork must not be called'); },
    import: () => ({ thread: { id: 'z-new' }, import: { mode: 'history', messages: 4 } }),
  });
  const result = await run(fake, session('zcode'));
  assert.deepEqual([result.threadId, result.strategy], ['z-new', 'native']);
  assert.deepEqual(fake.forked, [], 'the original ZCode session is not touched');
  assert.equal(fake.imported.length, 1);
  assert.deepEqual(result.warnings, []);
});

test('MiniMax handoff: the prepared instructions stay under its AGENTS.md byte bound (UTF-8, CJK three bytes)', async () => {
  assert.equal(importBudgets(null, 'minimax').handoffBytes, MINIMAX_GLOBAL_MAX_BYTES);
  assert.equal(importBudgets(null, 'kimi').handoffBytes, undefined);
  const pairs = Array.from({ length: 200 }, (_, index) => [`问题 ${index} ${'中'.repeat(400)}`, `answer ${index} ${'a'.repeat(400)}`]);
  const capped = prepareImport(session('codex', pairs), { convert: realConvert, budgets: importBudgets(200_000, 'minimax') });
  assert.ok(Buffer.byteLength(capped.transcript.instructions) <= MINIMAX_GLOBAL_MAX_BYTES, `${Buffer.byteLength(capped.transcript.instructions)} bytes`);
  assert.equal(capped.transcript.truncated, true);
  assert.match(capped.transcript.instructions, /answer 199/, 'the newest is kept');
  const free = prepareImport(session('codex', pairs), { convert: realConvert, budgets: importBudgets(200_000, 'kimi') });
  assert.ok(Buffer.byteLength(free.transcript.instructions) > MINIMAX_GLOBAL_MAX_BYTES, 'other cores: the token budget only');
});

test('fitHandoffInstructions: the transcript loses its OLDEST lines; intro, newest messages and the closing tag stay', () => {
  const lines = Array.from({ length: 400 }, (_, index) => `User: 问题 ${index} ${'中'.repeat(20)}\nAssistant: answer ${index}`).join('\n');
  const instructions = handoffInstructions(session('codex'), lines);
  assert.deepEqual(fitHandoffInstructions(instructions, 10 ** 7), { text: instructions, trimmed: false });
  for (const max of [6000, 3001, 1200]) {
    const { text, trimmed } = fitHandoffInstructions(instructions, max);
    assert.equal(trimmed, true);
    assert.ok(Buffer.byteLength(text) <= max, `${Buffer.byteLength(text)} <= ${max}`);
    assert.ok(text.startsWith('The conversation below was imported from Codex'), 'the intro stays');
    assert.ok(text.endsWith('Assistant: answer 399\n</imported_conversation>'), 'the newest message and the closing tag stay');
    assert.ok(text.includes(`<imported_conversation>\n${IMPORTED_LEFT_OUT}`), 'a note where it was cut');
    assert.ok(!text.includes('问题 0 '), 'the oldest went');
    assert.ok(!text.includes('\uFFFD'), 'cut on a character boundary');
    const body = text.slice(text.indexOf(IMPORTED_LEFT_OUT) + IMPORTED_LEFT_OUT.length);
    assert.match(body, /^(User|Assistant): /, 'starts on a line');
  }
  assert.throws(() => fitHandoffInstructions(instructions, 300), /doesn’t fit/);
  assert.throws(() => fitHandoffInstructions('no transcript here '.repeat(100), 100), /doesn’t fit/);
});

test('minimaxHandoffLimit: 32 KiB less the user\'s AGENTS.md, the prompt, instructions, developer instructions and app-tools guidance', () => {
  const params = { developerInstructions: 'd'.repeat(1000), codeDesktop: { customization: { instructions: 'i'.repeat(500), systemPrompt: null } } };
  assert.equal(minimaxHandoffLimit(params, { ownBytes: 0, appToolsBytes: 0 }), MINIMAX_GLOBAL_MAX_BYTES - 1002 - 502 - 2 - MINIMAX_HANDOFF_MARGIN);
  assert.equal(minimaxHandoffLimit(params, { ownBytes: 8000, appToolsBytes: 1223 }), MINIMAX_GLOBAL_MAX_BYTES - 8002 - 1225 - 1002 - 502 - 2 - MINIMAX_HANDOFF_MARGIN);
  // A custom system prompt: no app-tools guidance (server.js launchConfig), the prompt counts instead.
  const custom = { ...params, codeDesktop: { customization: { ...params.codeDesktop.customization, systemPrompt: 'p'.repeat(300) } } };
  assert.equal(minimaxHandoffLimit(custom, { appToolsBytes: 1223 }), MINIMAX_GLOBAL_MAX_BYTES - 302 - 1002 - 502 - 2 - MINIMAX_HANDOFF_MARGIN);
  // A user file over the limit by itself is left out by the bridge (mcode ignores it): it takes nothing.
  assert.equal(minimaxHandoffLimit({}, { ownBytes: 40000 }), MINIMAX_GLOBAL_MAX_BYTES - 2 - MINIMAX_HANDOFF_MARGIN);
  assert.equal(minimaxHandoffLimit({ developerInstructions: '中'.repeat(100) }), MINIMAX_GLOBAL_MAX_BYTES - 302 - 2 - MINIMAX_HANDOFF_MARGIN, 'UTF-8 bytes');
});

test('MiniMax handoff at the start: main\'s appendFit sizes the transcript to the decorated params; truncated reported', async () => {
  const pairs = Array.from({ length: 200 }, (_, index) => [`问题 ${index} ${'中'.repeat(400)}`, `answer ${index} ${'a'.repeat(400)}`]);
  const prepared = prepareImport(session('codex', pairs), { convert: realConvert, budgets: importBudgets(200_000, 'minimax') });
  let appended = null;
  const decorated = { developerInstructions: `${DEFAULT_INSTRUCTIONS}\n${'x'.repeat(4000)}` };
  const fake = fakeCore('minimax', { customization: true }, { 'thread/start': () => ({ thread: { id: 'mm-1' } }), 'thread/name/set': () => ({}) });
  const rpc = async (method, params, options) => {
    if (method === 'thread/start') appended = options.appendFit({ ...params, ...decorated }).text; // as main's requestRpc does
    return fake.rpc(method, params, options);
  };
  const limit = (params) => minimaxHandoffLimit(params, { ownBytes: 12000, appToolsBytes: 1223 });
  const result = await importInto({ prepared, core: fake.core, rpc, request: fake.request, handoffLimit: limit, now: () => 1 });
  assert.equal(result.strategy, 'handoff');
  assert.ok(Buffer.byteLength(appended) <= limit(decorated), `${Buffer.byteLength(appended)} <= ${limit(decorated)}`);
  assert.ok(12002 + Buffer.byteLength(decorated.developerInstructions) + 2 + Buffer.byteLength(appended) + 1225 <= MINIMAX_GLOBAL_MAX_BYTES, 'the whole AGENTS.md fits');
  assert.ok(appended.endsWith('</imported_conversation>'));
  assert.match(appended, /answer 199/);
  assert.deepEqual(result.warnings, ['truncated']);
  // A core with no limit: the prepared instructions as they are, no appendFit.
  const kimi = fakeCore('kimi', { customization: true }, { 'thread/start': () => ({ thread: { id: 'k-1' } }), 'thread/name/set': () => ({}) });
  await importInto({ prepared, core: kimi.core, rpc: kimi.rpc, request: kimi.request, now: () => 1 });
  assert.equal(kimi.calls[0][3].appendFit, undefined);
});

test('budgets: a share of the target model\'s context window, 128k when unknown', () => {
  assert.deepEqual(importBudgets(1_000_000), { contextWindow: 1_000_000, known: true, seedTokens: 400_000, handoffTokens: 200_000 });
  assert.deepEqual(importBudgets(null), { contextWindow: DEFAULT_CONTEXT_WINDOW, known: false, seedTokens: 51_200, handoffTokens: 25_600 });
  assert.equal(importBudgets(12).contextWindow, DEFAULT_CONTEXT_WINDOW, 'implausible: the default');
  assert.equal(estimateTokens('abcdefgh'), 2);
  assert.equal(estimateTokens('你好世界'), 4, 'CJK ≈ one token a character');
  assert.equal(estimateTokens('你好ab'), 3);
  assert.equal(tailWithinTokens('abcdefghijkl', 2), 'efghijkl');
  assert.equal(headWithinTokens('你好世界', 2), '你好');
});

test('trimMessages keeps the newest within tokens, the harness message cap and the character cap', () => {
  const messages = [{ role: 'user', text: 'a'.repeat(40) }, { role: 'assistant', text: 'b'.repeat(40) }, { role: 'user', text: 'c'.repeat(40) }, { role: 'tool', text: 'x' }];
  assert.deepEqual(trimMessages(messages, 25), { messages: messages.slice(1, 3), truncated: true, kept: 2, total: 3 });
  assert.deepEqual(trimMessages(messages, 100), { messages: messages.slice(0, 3), truncated: false, kept: 3, total: 3 });
  assert.equal(trimMessages([{ role: 'user', text: '中'.repeat(30) }], 10).messages[0].text.length <= 10, true, 'one long CJK message keeps its end');
  const many = Array.from({ length: IMPORT_MAX_MESSAGES + 7 }, (_, index) => ({ role: index % 2 ? 'assistant' : 'user', text: `m${index}` }));
  const capped = trimMessages(many, { maxTokens: 1e9 });
  assert.equal(capped.messages.length, IMPORT_MAX_MESSAGES);
  assert.equal(capped.messages.at(-1).text, `m${IMPORT_MAX_MESSAGES + 6}`);
  assert.equal(trimMessages(messages, { maxTokens: 1e9, maxChars: 50 }).messages.length, 1);
  assert.match(handoffInstructions(session('grok'), 'T', { truncated: true }), /Its beginning was left out/);
  assert.deepEqual(responseItemsOf([{ role: 'user', text: 'hi' }]), [{ type: 'message', role: 'user', content: [{ type: 'input_text', text: 'hi' }] }]);
});

test('prepareImport sizes by the model: a large window keeps more of a long conversation; the result says how much', async () => {
  const pairs = Array.from({ length: 300 }, (_, index) => [`question ${index} ${'q'.repeat(2000)}`, `answer ${index} ${'a'.repeat(2000)}`]);
  const small = prepare(session('gemini', pairs), 32_000, realConvert);
  const large = prepare(session('gemini', pairs), 1_000_000, realConvert);
  assert.equal(small.seed.truncated, true);
  assert.equal(large.seed.truncated, false);
  assert.ok(small.seed.messages.reduce((sum, message) => sum + estimateTokens(message.text), 0) <= 12_800);
  assert.match(small.seed.messages.at(-1).text, /answer 299/);
  assert.ok(estimateTokens(small.transcript.instructions) <= 6_400 + 200);
  assert.equal(small.transcript.truncated, true);
  assert.ok(small.transcript.kept < small.transcript.total);
  const fake = fakeCore('deepseek', { threadImport: true, customization: true }, { import: () => ({ thread: { id: 'ds-2' } }) });
  const result = await importInto({ prepared: small, core: fake.core, rpc: fake.rpc, request: fake.request, importThread: fake.importThread, now: () => 1 });
  assert.deepEqual(result.warnings, ['truncated']);
  assert.deepEqual(result.trimmed, { kept: small.seed.kept, total: 600 });
});

test('secrets are masked in what the model gets (seed, transcript, title) but not in the display prefix', () => {
  const secret = 'ghp_abcdefghijklmnopqrstuvwxyz0123';
  const s = session('claude-code', [[`token ${secret}`, 'export OPENAI_API_KEY=sk-live-abc123\nok'], ['Bearer abcdefghijklmnopqrstuvwxyz', 'fine']], { title: `Key ${secret}` });
  const prepared = prepare(s, null, realConvert);
  const seedText = prepared.seed.messages.map((message) => message.text).join('\n');
  assert.doesNotMatch(seedText, /ghp_|sk-live|abcdefghijklmnopqrstuvwxyz/);
  assert.doesNotMatch(prepared.transcript.instructions, /ghp_|sk-live/);
  assert.ok(prepared.seed.redacted >= 3);
  assert.match(prepared.display.json, /ghp_abcdef/, 'the transcript\'s own copy keeps the original');
  for (const [input, expected] of [
    ['sk-ant-abcdefghijklmnopqrstuvwx', REDACTED], ['AKIAABCDEFGHIJKLMNOP', REDACTED], ['xoxb-1234567890-abcdef', REDACTED],
    ['-----BEGIN OPENSSH PRIVATE KEY-----\nabc\n-----END OPENSSH PRIVATE KEY-----', REDACTED], ['DB_PASSWORD="hunter22"', `DB_PASSWORD=${REDACTED}`],
    ['{"client_secret": "abcd1234"}', `{"client_secret": "${REDACTED}"}`], ['token = getToken()', 'token = getToken()'], ['monkey business', 'monkey business'],
  ]) assert.equal(redactSecrets(input).text, expected, input);
});

test('toTranscriptText with maxTokens keeps the newest within the estimate', () => {
  const list = new ItemList();
  for (let n = 0; n < 100; n++) { list.push('user', { parts: [{ text: `问题 ${n} ${'中'.repeat(200)}` }] }); list.push('assistant', { parts: [{ text: `answer ${n}` }] }); }
  const s = makeSession(makeSummary('codex', 'cjk', { title: 'CJK' }), list.items);
  const { text, truncated, kept, total } = realConvert.toTranscriptText(s, { maxTokens: 2000 });
  assert.equal(truncated, true);
  assert.ok(estimateTokens(text) <= 2000);
  assert.match(text, /answer 99$/);
  assert.ok(kept > 0 && kept < total);
});

test('preview: capped, slim, images as placeholders (no base64 to the page)', () => {
  const turns = Array.from({ length: 250 }, (_, index) => ({ id: `t${index}`, items: [
    { type: 'userMessage', id: `u${index}`, content: [{ type: 'text', text: 'x'.repeat(9000) }, { type: 'image', url: 'data:image/png;base64,AAAA' }] },
    { type: 'commandExecution', id: `c${index}`, command: 'ls', aggregatedOutput: 'y'.repeat(10000) },
    { type: 'reasoning', id: `r${index}`, summary: ['hidden'] },
  ] }));
  const preview = previewTurns(turns);
  assert.equal(preview.truncated, true);
  assert.ok(preview.turns.reduce((sum, turn) => sum + turn.items.length, 0) <= 600);
  const json = JSON.stringify(preview);
  assert.doesNotMatch(json, /base64|aggregatedOutput|hidden/);
  assert.deepEqual(preview.turns[0].items[0].content[1], { type: 'image', placeholder: true });
  assert.ok(preview.turns[0].items[0].content[0].text.length <= 4001);
});

// ---------------------------------------------------------------- desktop:call "chat-import" (index.cjs)

function harness({ home = '/home', env = {}, core = { id: 'codex', capabilities: {} }, handlers = {}, sessions = {}, listed = [{ key: 'codex:s-1', source: 'codex' }, { key: 'kimi:k-1', source: 'kimi' }] } = {}) {
  const userDataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'chat-import-'));
  const config = { threadIds: [], sessionMetadata: {} };
  const seen = { list: null, rpc: [], request: [], saved: 0, notified: 0, imports: 0, discarded: [], forks: [] };
  const catalog = {
    listSources: async () => [{ source: 'codex', label: 'Codex', available: true, experimental: false, roots: ['/home/.codex', 7] }, { source: 'kimi', label: 'Kimi', available: false, experimental: true }],
    listSessions: async (options) => { seen.list = options; return listed; },
    readSession: async (key) => { if (!sessions[key]) throw new Error(`unknown ${key}`); seen.imports++; return sessions[key]; },
  };
  const chat = createChatImport({
    home, env, userDataDir, getConfig: () => config, save: () => { seen.saved++; }, defaultCwd: () => '/fallback', notify: () => { seen.notified++; },
    getCore: async () => ({ ...core, owner: 'conn-1' }),
    rpc: async (method, params, owner, options) => { seen.rpc.push([method, owner, options ?? null]); if (method === 'thread/start') config.threadIds.unshift(handlers[method](params).thread.id); return handlers[method](params); },
    request: async (method, params, owner) => { seen.request.push([method, owner]); return handlers[method](params); },
    importThread: handlers.import ? async (params, owner) => { seen.rpc.push(['import', owner]); return handlers.import(params); } : undefined,
    fork: handlers.fork ? async (threadId, owner, options) => { seen.forks.push([threadId, owner, options ?? null]); return handlers.fork(threadId); } : undefined,
    discard: (threadId) => { seen.discarded.push(threadId); },
    loadModules: async () => ({ catalog, convert, targets: await import('../electron/chat-import/targets.mjs') }),
  });
  return { chat, config, seen, userDataDir, cleanup: () => fs.rmSync(userDataDir, { recursive: true, force: true }) };
}

test('sources, list (search and source filter in main, counts per source) and a capped preview', async () => {
  const many = session('codex', Array.from({ length: 250 }, (_, index) => [`q${index}`, `a${index}`]));
  const h = harness({ sessions: { 'codex:s-1': many } });
  try {
    assert.deepEqual(await h.chat.call({ op: 'sources' }), [
      { source: 'codex', label: 'Codex', available: true, experimental: false, roots: ['/home/.codex'] },
      { source: 'kimi', label: 'Kimi', available: false, experimental: true, roots: [] },
    ]);
    const listed = await h.chat.call({ op: 'list', sources: ['codex', 3], query: '  build ', limit: 5000, includeSubagents: true });
    assert.deepEqual(listed, { sessions: [{ key: 'codex:s-1', source: 'codex' }], total: 1, counts: { codex: 1, kimi: 1 }, all: 2, offset: 0, hasMore: false });
    assert.deepEqual(h.seen.list, { home: '/home', env: {}, exclude: [h.userDataDir, path.join('/home', '.code-desktop')], query: 'build', includeSubagents: true }, 'every source scanned for the counts');
    const paged = await h.chat.call({ op: 'list', limit: 1 });
    assert.deepEqual([paged.sessions.length, paged.total, paged.hasMore], [1, 2, true]);
    assert.deepEqual((await h.chat.call({ op: 'list', limit: 1, offset: 1 })).sessions.map((s) => s.key), ['kimi:k-1']);
    const preview = await h.chat.call({ op: 'preview', key: 'codex:s-1' });
    assert.equal(preview.turns.length, 200);
    assert.equal(preview.truncated, true);
    assert.equal(preview.session.items, undefined);
    assert.equal(preview.session.title, 'Build fix');
    await assert.rejects(h.chat.call({ op: 'nope' }), /Unsupported operation/);
  } finally { h.cleanup(); }
});

test('a fork import hands the fork the folder it would open in: the session\'s own, else the default one (its own is gone)', async () => {
  const h = harness({ sessions: { 'codex:s-1': session('codex') }, handlers: { fork: () => ({ threadId: 'cx-fork' }), 'thread/name/set': () => ({}) } });
  try {
    const result = await h.chat.call({ op: 'import', key: 'codex:s-1' });
    assert.equal(result.strategy, 'fork');
    // /work/app (the session's folder) does not exist here: the default folder goes along.
    assert.deepEqual(h.seen.forks, [['s-1', 'conn-1', { folder: '/fallback' }]]);
  } finally { h.cleanup(); }
  // main.cjs forkCoreSession takes that folder only when the original's own folder is gone.
  const main = fs.readFileSync(path.join(appDir, 'electron/main.cjs'), 'utf8');
  const start = main.indexOf('async function forkCoreSession(');
  const body = main.slice(start, main.indexOf('\n  }\n', start));
  assert.match(body, /const gone = typeof thread\.cwd === "string" && thread\.cwd && !fs\.existsSync\(thread\.cwd\);/);
  assert.match(body, /const cwd = gone && typeof folder === "string" && path\.isAbsolute\(folder\) && fs\.existsSync\(folder\) \? \{ cwd: folder \} : \{\};/);
  assert.match(body, /if \(cwd\.cwd && coreCapabilities\(owner\.serverInfo\)\.forkCwd === false\)/);
  assert.match(body, /importStartParams\("thread\/fork", \{ threadId, [^\n]*\.\.\.cwd \}, owner\)/);
  assert.match(main, /fork: \(threadId, owner, options\) => forkCoreSession\(threadId, owner, options\),/);
});

test('import into another core answers needs-core-switch, as a value', async () => {
  const h = harness({ core: { id: 'codex', capabilities: {} } });
  try {
    const result = await h.chat.call({ op: 'import', key: 'codex:s-1', target: 'deepseek' });
    assert.equal(result.code, 'needs-core-switch');
    assert.equal(result.target, 'deepseek');
    assert.equal(h.seen.rpc.length + h.seen.request.length, 0);
  } finally { h.cleanup(); }
});

test('a MiniMax handoff import: the user\'s own AGENTS.md (stat only, MINIMAX_DATA_DIR first) and the app-tools guidance shrink the bound', async () => {
  const home = fs.mkdtempSync(path.join(os.tmpdir(), 'chat-import-mm-'));
  try {
    fs.mkdirSync(path.join(home, '.minimax'));
    fs.writeFileSync(path.join(home, '.minimax', 'AGENTS.md'), 'u'.repeat(10000));
    fs.mkdirSync(path.join(home, 'moved'));
    fs.writeFileSync(path.join(home, 'moved', 'AGENTS.md'), 'm'.repeat(3000));
    const before = fs.statSync(path.join(home, '.minimax', 'AGENTS.md')).mtimeMs;
    const appTools = Buffer.byteLength(require('../electron/agent-tools-instructions.cjs').INSTRUCTIONS);
    const s = session('claude-code', Array.from({ length: 30 }, (_, index) => [`q${index} ${'中'.repeat(300)}`, `a${index}`]));
    for (const [env, own] of [[{}, 10000], [{ MINIMAX_DATA_DIR: path.join(home, 'moved') }, 3000]]) {
      const h = harness({ home, env, core: { id: 'minimax', capabilities: { customization: true } }, sessions: { 'claude-code:s-1': s }, handlers: { 'thread/start': () => ({ thread: { id: 'mm-7' } }), 'thread/name/set': () => ({}) } });
      try {
        await h.chat.call({ op: 'import', key: 'claude-code:s-1', target: 'minimax' });
        const options = h.seen.rpc[0][2];
        assert.equal(typeof options.appendFit, 'function');
        const decorated = { developerInstructions: 'd'.repeat(2000) };
        const { text: fitted } = options.appendFit(decorated);
        assert.equal(Buffer.byteLength(fitted) <= MINIMAX_GLOBAL_MAX_BYTES - (own + 2) - 2002 - (appTools + 2) - 2 - MINIMAX_HANDOFF_MARGIN, true, `own ${own}`);
        assert.ok(fitted.endsWith('</imported_conversation>'));
      } finally { h.cleanup(); }
    }
    assert.equal(fs.statSync(path.join(home, '.minimax', 'AGENTS.md')).mtimeMs, before, 'the user\'s file is only read');
    // Other cores get no bound.
    const k = harness({ home, core: { id: 'kimi', capabilities: { customization: true } }, sessions: { 'claude-code:s-1': s }, handlers: { 'thread/start': () => ({ thread: { id: 'k-1' } }), 'thread/name/set': () => ({}) } });
    try { await k.chat.call({ op: 'import', key: 'claude-code:s-1', target: 'kimi' }); assert.equal(k.seen.rpc[0][2].appendFit, undefined); } finally { k.cleanup(); }
  } finally { fs.rmSync(home, { recursive: true, force: true }); }
});

test('a handoff import records importedFrom, tells every window, keeps the display prefix and serves it back', async () => {
  const s = session('claude-code', undefined, { cwd: '/does/not/exist' });
  const h = harness({ core: { id: 'kimi', capabilities: { customization: true } }, sessions: { 'claude-code:s-1': s }, handlers: { 'thread/start': () => ({ thread: { id: 'k-7' } }), 'thread/name/set': () => ({}) } });
  try {
    const result = await h.chat.call({ op: 'import', key: 'claude-code:s-1', target: 'kimi' });
    assert.deepEqual([result.threadId, result.strategy], ['k-7', 'handoff']);
    assert.deepEqual(h.config.threadIds, ['k-7']);
    assert.deepEqual(h.seen.rpc.map(([method, owner]) => [method, owner]), [['thread/start', 'conn-1'], ['thread/name/set', 'conn-1']]);
    assert.match(h.seen.rpc[0][2].appendInstructions, /imported from Claude Code/);
    assert.equal(h.config.sessionMetadata['k-7'].importedFrom.strategy, 'handoff');
    assert.deepEqual(result.sessionMetadata, h.config.sessionMetadata['k-7']);
    assert.ok(h.seen.saved >= 1);
    assert.equal(h.seen.notified, 1);
    const file = path.join(h.userDataDir, 'imports', 'k-7.json');
    const saved = JSON.parse(fs.readFileSync(file, 'utf8'));
    assert.equal(saved.turns.length, 2);
    const prefix = await h.chat.call({ op: 'prefix', threadId: 'k-7' });
    assert.deepEqual(prefix.turns, saved.turns);
    assert.equal(prefix.importedFrom.title, 'Build fix');
    assert.deepEqual(await h.chat.call({ op: 'prefix', threadId: 'other' }), { turns: null, importedFrom: null });
    assert.equal((await h.chat.call({ op: 'prefix', threadId: '../k-7' })).turns, null);
    // Deleting the session removes its plaintext copy (main.cjs thread/delete → forgetPrefix).
    assert.equal(forgetPrefix(h.userDataDir, '../k-7'), false);
    assert.equal(forgetPrefix(h.userDataDir, 'k-7'), true);
    assert.equal(fs.existsSync(file), false);
  } finally { h.cleanup(); }
});

test('a native import is recorded but keeps no prefix file', async () => {
  const h = harness({ core: { id: 'deepseek', capabilities: { threadImport: true, customization: true } }, sessions: { 'gemini:s-1': session('gemini') },
    handlers: { import: () => ({ thread: { id: 'ds-9' } }) } });
  try {
    const result = await h.chat.call({ op: 'import', key: 'gemini:s-1' });
    assert.equal(result.strategy, 'native');
    assert.equal(h.config.sessionMetadata['ds-9'].importedFrom.strategy, 'native');
    assert.equal(fs.existsSync(path.join(h.userDataDir, 'imports', 'ds-9.json')), false);
    assert.deepEqual((await h.chat.call({ op: 'prefix', threadId: 'ds-9' })).turns, null);
  } finally { h.cleanup(); }
});

test('one import per job: a repeated request gets the first answer; a reloaded page finds the job it lost', async () => {
  let release;
  const gate = new Promise((resolve) => { release = resolve; });
  const h = harness({ core: { id: 'kimi', capabilities: { customization: true } }, sessions: { 'claude-code:s-1': session('claude-code') },
    handlers: { 'thread/start': () => ({ thread: { id: 'k-8' } }), 'thread/name/set': () => gate } });
  try {
    const first = h.chat.call({ op: 'import', key: 'claude-code:s-1', jobId: 'import-job-1', pageLoad: '100' }, { senderId: 7 });
    await new Promise((resolve) => setTimeout(resolve, 20));
    // The page reloaded mid-import: the new page load (pageLoad 200) sees the running job; another window does not.
    assert.deepEqual((await h.chat.call({ op: 'jobs', pageLoad: '200' }, { senderId: 7 })).map((job) => [job.jobId, job.state]), [['import-job-1', 'running']]);
    assert.deepEqual(await h.chat.call({ op: 'jobs', pageLoad: '200' }, { senderId: 8 }), []);
    assert.deepEqual(await h.chat.call({ op: 'jobs', pageLoad: '100' }, { senderId: 7 }), [], 'its own page load waits on its own call');
    const again = h.chat.call({ op: 'import', key: 'claude-code:s-1', jobId: 'import-job-1', pageLoad: '200' }, { senderId: 7 });
    release({});
    const [a, b] = await Promise.all([first, again]);
    assert.equal(a.threadId, 'k-8');
    assert.deepEqual(b, a);
    assert.equal(h.seen.imports, 1, 'read and imported once');
    assert.deepEqual(h.config.threadIds, ['k-8']);
    assert.deepEqual(await h.chat.call({ op: 'jobs', pageLoad: '300' }, { senderId: 7 }), [], 'seen: acknowledged');
    await assert.rejects(h.chat.call({ op: 'import', key: 'codex:other', jobId: 'import-job-1' }), /another conversation/);
  } finally { h.cleanup(); }
});

test('the worker: list, preview and prepare run off the main thread over the synthetic home', async () => {
  const fixture = buildHome();
  const runner = createWorkerRunner();
  try {
    const base = { home: fixture.home, env: fixture.env, exclude: [] };
    const started = Date.now();
    const listed = await runner.run('list', { ...base, limit: 3 });
    assert.equal(listed.sessions.length, 3);
    assert.ok(listed.hasMore && listed.total > 3);
    assert.equal(Object.values(listed.counts).reduce((sum, n) => sum + n, 0), listed.all);
    const onlyGrok = await runner.run('list', { ...base, sources: ['grok'] });
    assert.ok(onlyGrok.sessions.every((s) => s.source === 'grok'));
    assert.equal(onlyGrok.counts.codex, listed.counts.codex, 'counts stay per source whatever the filter');
    const preview = await runner.run('preview', { ...base, key: `claude-code:${IDS.claude}` });
    assert.ok(preview.turns.length > 0);
    assert.doesNotMatch(JSON.stringify(preview), /base64|AAAA/);
    const prepared = await runner.run('prepare', { ...base, key: `claude-code:${IDS.claude}`, budgets: importBudgets(200_000) });
    assert.ok(prepared.seed.messages.length > 0 && prepared.transcript.instructions && prepared.display.count > 0);
    assert.equal(prepared.session.items, undefined);
    await assert.rejects(runner.run('nope', {}), /Unsupported operation/);
    assert.ok(Date.now() - started < 20000);
  } finally { await runner.dispose(); fixture.cleanup(); }
});

test('requestRpc\'s JSON-RPC failure envelope is thrown again', () => {
  assert.deepEqual(unwrapRpc({ thread: { id: 'a' } }), { thread: { id: 'a' } });
  assert.throws(() => unwrapRpc({ __codeDesktopRpcError: { message: 'Bad seed', code: -32602, data: null } }), (error) => error.message === 'Bad seed' && error.code === -32602);
});

test('main.cjs wires chat-import: thread/import is main-only, fork for the own store, handoff appended, prefix deleted with the session', () => {
  const main = fs.readFileSync(path.join(appDir, 'electron/main.cjs'), 'utf8');
  assert.match(main, /case "chat-import": \{\n\s+chatImport \?\?= require\("\.\/chat-import\/index\.cjs"\)\.createChatImport\(/);
  const allowed = main.slice(main.indexOf('const allowed = new Set(['), main.indexOf(']);', main.indexOf('const allowed = new Set([')));
  assert.ok(!allowed.includes('"codeDesktop/thread/import"'), 'the renderer cannot send it');
  assert.equal((main.match(/"codeDesktop\/thread\/import"/g) ?? []).length, 1, 'only importCoreThread sends it');
  assert.match(main, /async function importCoreThread\(input, owner\) \{[\s\S]*?const result = await requestImport\(owner, params\);/);
  assert.match(main, /raceImport\(owner\.request\("codeDesktop\/thread\/import", params, IMPORT_TIMEOUT_MS \+ IMPORT_LATE_MS\),\s+IMPORT_TIMEOUT_MS, \(late\) => discardLateImport\(owner, late\)\)/);
  // The wait outlasts the slowest bridge (ACP ≈ 6.5 min; OpenCode's replay 60 + 300 s + transcript 60 s + API calls).
  const timeout = Number(/const IMPORT_TIMEOUT_MS = (\d+) \* 60000;/.exec(main)?.[1]) * 60000;
  assert.ok(timeout >= (90 + 180 + 30 + 30 + 30) * 1000 + 60000 && timeout >= (60 + 300 + 60 + 4 * 120) * 1000, `${timeout} ms`);
  assert.match(main, /function discardLateImport\(owner, late\) \{[\s\S]*?owner\.request\("thread\/delete", \{ threadId \}, 30000\)\s+\.catch\(\(\) => owner\.request\("thread\/archive", \{ threadId \}, 30000\)\)/);
  assert.match(main, /const appended = typeof internal\.appendFit === "function" \? internal\.appendFit\(params\)\?\.text : internal\.appendInstructions;/, 'the MiniMax bound applies to the decorated params');
  assert.match(main, /threadPermissionParams\(\{ permission: "auto", mode: "code", hints: coreSupports\(owner\.serverInfo, "permissionHints"\) \}\)/);
  assert.match(main, /approvalsReviewer: "user", approvalPolicy: permission\.approvalPolicy \|\| "on-request"/);
  assert.match(main, /dynamicWorkflows: workflowSettings\(\)\.enabled && currentWorkflowEngine\(owner\) === "native"/);
  assert.match(main, /async function forkCoreSession\(threadId, owner, \{ folder \} = \{\}\) \{[\s\S]*?owner\.request\("thread\/fork", params, 120000\)/);
  assert.match(main, /async function requestRpc\(p, sender, expectedOwner, internal = null\)/);
  assert.match(main, /case "rpc": return requestRpc\(p, e\.sender\);/, 'the renderer never passes `internal`');
  assert.match(main, /if \(p\.method === "thread\/start" && typeof internal\?\.appendInstructions === "string" && internal\.appendInstructions\) \{/);
  const decorate = main.indexOf('instructionsService.decorate(p.method, params);'), append = main.indexOf('internal.appendFit(params)');
  assert.ok(decorate > 0 && append > decorate, 'sized after the params are decorated');
  assert.match(main, /owner\.request\("thread\/archive", \{ threadId \}, 30000\)/, 'a failed inject archives its empty thread');
  assert.match(main, /require\("\.\/chat-import\/index\.cjs"\)\.forgetPrefix\(app\.getPath\("userData"\), id\);/);
  assert.match(main, /contextWindow: await importContextWindow\(id\)/);
  assert.match(main, /return chatImport\.call\(p, \{ senderId: e\.sender\?\.id \?\? null \}\);/);
  assert.doesNotMatch(main, /resumeAdd/);
  const jsx = fs.readFileSync(path.join(appDir, 'src/main.jsx'), 'utf8');
  assert.equal((jsx.match(/await withImportPrefix\(id, ?\{/g) ?? []).length, 3);
});

test('raceImport: an answer in time is the result; a late one is handed on (main deletes it), never lost or doubled', async () => {
  assert.deepEqual(await raceImport(Promise.resolve({ thread: { id: 'fast' } }), 1000, () => assert.fail('not late')), { thread: { id: 'fast' } });
  await assert.rejects(raceImport(Promise.reject(new Error('bridge refused')), 1000, () => assert.fail('not late')), /bridge refused/);
  let resolveLate;
  const late = [];
  const slow = new Promise((resolve) => { resolveLate = resolve; });
  await assert.rejects(raceImport(slow, 20, (value) => late.push(value)), (error) => error.importTimedOut === true && /timed out/.test(error.message));
  assert.deepEqual(late, []);
  resolveLate({ thread: { id: 'late-1' } });
  await new Promise((resolve) => setTimeout(resolve, 10));
  assert.deepEqual(late, [{ thread: { id: 'late-1' } }]);
  // A late failure is swallowed (nothing was made): no unhandled rejection, nothing handed on.
  let rejectLate;
  const failing = new Promise((_, reject) => { rejectLate = reject; });
  await assert.rejects(raceImport(failing, 10, () => late.push('wrong')), /timed out/);
  rejectLate(new Error('gave up'));
  await new Promise((resolve) => setTimeout(resolve, 10));
  assert.equal(late.length, 1);
});

test('main.jsx: imported prefix rows are inert (no rewind, fork, rating, edits or task cards; Copy stays)', () => {
  const jsx = fs.readFileSync(path.join(appDir, 'src/main.jsx'), 'utf8');
  assert.match(jsx, /if \(!row\?\.turnId \|\| row\.turnId === state\.active\[current\] \|\| row\.importedPrefix \|\| isImportedTurn\(row\.turnId\)\) return null;/);
  // 0.3 (ui-v3): the Chat surface's own branch comes first, then Code's userMessageActions.
  assert.match(jsx, /userActions=\{item\.type === "userMessage" && !item\.importedPrefix && !isImportedTurn\(item\.turnId\) \? mode === "chat" \?/);
  assert.match(jsx, /onFork=\{transcriptActions\.onForkFrom && !importedTurn \?/);
  assert.match(jsx, /const replyId = ratingsCore && !importedTurn \?/);
  assert.match(jsx, /const editsByTurn = useMemo\(\(\) => turnEdits\(ownItems,/);
  assert.match(jsx, /backgroundTaskEventsByTurn\(tasks,\{items:ownItems,/);
  assert.match(jsx, /const metadata = sessionMetadata\[id\]\?\.importedFrom \? sessionMetadata\[id\] : importedRecords\.current\.get\(id\);/);
  assert.match(jsx, /onImported=\{importDone\}/);
});

// ---------------------------------------------------------------- the transcript's prefix (import-history-display.mjs)

const ownTurns = [{ id: 'turn-a', status: 'completed', items: [{ type: 'userMessage', id: 'ua', content: [{ type: 'text', text: 'Continue please' }] }] }];
const prefixTurns = [
  { id: 't0', status: 'completed', items: [{ type: 'userMessage', id: 'u0', content: [{ type: 'text', text: 'Fix the build' }] }, { type: 'agentMessage', id: 'a0', text: 'Done.' }] },
  { id: 't1', status: 'inProgress', items: [{ type: 'commandExecution', id: 'c1', status: 'inProgress' }] },
];

test('the prefix goes first with ids of its own, then the divider, then the session\'s own turns', () => {
  setLocale('en');
  const thread = { id: 'k-7', turns: ownTurns };
  const shown = withImportedPrefix(thread, { turns: prefixTurns, importedFrom: { source: 'claude-code', title: 'Build fix' } });
  assert.deepEqual(shown.turns.map((turn) => turn.id), ['imported-0-t0', 'imported-1-t1', 'imported-divider', 'turn-a']);
  assert.deepEqual(shown.turns[0].items.map((item) => item.id), ['imported-0-t0-u0', 'imported-0-t0-a0']);
  assert.equal(shown.turns[1].status, 'completed');
  assert.equal(shown.turns[1].items[0].status, 'completed');
  assert.ok(shown.turns.slice(0, 3).every((turn) => turn.importedPrefix === true && isImportedTurn(turn.id)));
  assert.equal(isImportedTurn('turn-a'), false);
  const divider = shown.turns[2].items[0];
  assert.equal(divider.type, IMPORTED_DIVIDER);
  assert.equal(divider.text, 'Imported from Claude Code · Build fix');
  assert.equal(shown.turns[3], ownTurns[0]);
  assert.equal(thread.turns, ownTurns);
  // Applied once only (the `imported-` ids); nothing to add leaves the thread as it was.
  assert.equal(withImportedPrefix(shown, prefixTurns), shown);
  assert.equal(withImportedPrefix(thread, { turns: null }), thread);
  assert.equal(withImportedPrefix(thread, []), thread);
  // A session whose own first prompt equals the imported one still gets its prefix (no text-based dedupe).
  const same = { id: 'x', turns: [{ ...prefixTurns[0], id: 'core-1' }, ...ownTurns] };
  assert.equal(withImportedPrefix(same, prefixTurns).turns.length, same.turns.length + 3);
  assert.equal(importedDividerLabel({ source: 'codex' }), 'Imported from Codex');
  setLocale('zh-CN');
  assert.equal(importedDividerLabel({ source: 'codex', title: 'T' }), '从 Codex 导入 · T');
  setLocale('en');
});

test('only sessions recorded as inject or handoff imports ask main for a prefix', () => {
  assert.equal(mayHaveImportedPrefix(undefined), false, 'an ordinary session: no IPC');
  assert.equal(mayHaveImportedPrefix({}), false);
  assert.equal(mayHaveImportedPrefix({ importedFrom: { strategy: 'handoff' } }), true);
  assert.equal(mayHaveImportedPrefix({ importedFrom: { strategy: 'inject' } }), true);
  assert.equal(mayHaveImportedPrefix({ importedFrom: { strategy: 'native' } }), false);
  assert.equal(mayHaveImportedPrefix({ importedFrom: { strategy: 'fork' } }), false);
});

test('the divider renders as a quiet done row', () => {
  const source = fs.readFileSync(path.join(appDir, 'src/source-session.jsx'), 'utf8');
  assert.match(source, /if \(item\.type === "importedHistory"\) return <SourceStep item=\{item\} \{\.\.\.stepDefaults\} label=\{item\.text \|\| ""\} state="done" \/>;/);
});

test('prepareImport: a private key split across two blocks of a reply is redacted and counted once, and that reply goes without parts', () => {
  const key = 'MIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQC';
  const opening = `Here:\n-----BEGIN PRIVATE KEY-----\n${key}`, closing = '[Tool: Bash]\ntail -1 key.pem\n[Result]\n-----END PRIVATE KEY-----';
  const ran = '[Tool: Bash]\nnpm test\n[Result]\nok';
  const prepared = prepare(session('claude-code'), null, { ...convert, toDshSeed: () => ({ messages: [
    { role: 'user', text: 'Print the key' },
    { role: 'assistant', text: `${opening}\n\n${closing}`, parts: [{ text: opening }, { text: closing, tool: true }] },
    { role: 'user', text: 'Now run it' },
    { role: 'assistant', text: `${ran}\n\nDone.`, parts: [{ text: ran, tool: true }, { text: 'Done.' }] },
  ] }) });
  const [, split, , clean] = prepared.seed.messages;
  assert.ok(!JSON.stringify(prepared.seed.messages).includes(key), 'the key reaches no core');
  assert.equal(prepared.seed.redacted, 1, 'the count says what was actually masked');
  assert.equal(split.text, `Here:\n${REDACTED}`);
  assert.equal(split.parts, undefined, 'its blocks no longer spell the text');
  assert.deepEqual(clean.parts, [{ text: ran, tool: true }, { text: 'Done.' }], 'other replies keep their tool rows');
  assert.equal(clean.text, `${ran}\n\nDone.`);
});

test('main.cjs importCoreThread sends a reply\'s parts only while they spell its text', () => {
  const main = fs.readFileSync(path.join(appDir, 'electron/main.cjs'), 'utf8');
  const start = main.indexOf('async function importCoreThread(');
  const body = main.slice(start, main.indexOf('const params = await importStartParams("thread/start"', start));
  assert.match(body, /return \{ role: message\?\.role === "assistant" \? "assistant" : "user", text: value, \.\.\.\(parts \? \{ parts \} : \{\}\), \.\.\.ts \};/, 'parts are no longer stripped');
  assert.match(body, /const ts = Number\.isSafeInteger\(message\?\.ts\) && message\.ts > 0 \? \{ ts: message\.ts \} : \{\};/, 'the source time travels, a valid one only');
  const str = (value, max) => (typeof value === 'string' ? value.slice(0, max) : '');
  const partsOf = new Function('str', `${/const partsOf = [\s\S]*?\n {4}\};\n {4}const callOf = [\s\S]*?\n {4}\};/.exec(body)[0]}\nreturn partsOf;`)(str);
  const tool = '[Tool: Bash]\nnpm test\n[Result]\nok', parts = [{ text: tool, tool: true }, { text: 'Done.' }];
  assert.deepEqual(partsOf({ role: 'assistant', parts }, `${tool}\n\nDone.`), parts);
  assert.equal(partsOf({ role: 'user', parts }, `${tool}\n\nDone.`), null, 'replies only');
  assert.equal(partsOf({ role: 'assistant', parts }, 'something else'), null, 'parts that do not spell the text stay behind');
  assert.deepEqual(partsOf({ role: 'assistant', parts: [{ text: 'a', tool: 'yes', extra: 1, call: { type: 'commandExecution' } }] }, 'a'), [{ text: 'a' }], 'only the text and a true tool flag travel');
  // A tool block's call (its row's display) travels with it: a plain JSON object with a type, at most 64 000 characters.
  const call = { type: 'commandExecution', command: 'npm test', cwd: '/w' };
  assert.deepEqual(partsOf({ role: 'assistant', parts: [{ text: tool, tool: true, call }] }, tool), [{ text: tool, tool: true, call }]);
  assert.notEqual(partsOf({ role: 'assistant', parts: [{ text: tool, tool: true, call }] }, tool)[0].call, call, 'a copy');
  for (const bad of [null, 'x', [call], { command: 'no type' }, { type: 'dynamicToolCall', arguments: { big: 'x'.repeat(64000) } }])
    assert.deepEqual(partsOf({ role: 'assistant', parts: [{ text: tool, tool: true, call: bad }] }, tool), [{ text: tool, tool: true }], JSON.stringify(bad)?.slice(0, 60));
});

test('prepareImport: a tool call\'s structured display (its row) is redacted string by string; no key in its arguments reaches a core', () => {
  const pem = '-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQC\n-----END PRIVATE KEY-----';
  const secrets = {
    bearer: 'abcdefghijklmnopqrstuvwxyz012345', sk: 'sk-proj-abcdefghijklmnopqrstuvwx', field: 'zq81-not-a-pattern', ghp: 'ghp_abcdefghijklmnopqrstuvwxyz0123',
    body: 'MIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQC', clipped: 'MIIClippedKeyBodyPastTheDisplayBound0123456789',
  };
  const list = new ItemList();
  const ask = (text) => list.push('user', { parts: [{ text }] });
  const call = (callId, name, raw, result) => { list.toolCall({ callId, name, raw: JSON.stringify(raw) }); list.toolResult({ callId, text: result }); list.push('assistant', { parts: [{ text: 'ok' }] }); };
  ask('Call the API');
  call('c1', 'Bash', { command: `curl -H "Authorization: Bearer ${secrets.bearer}" https://api.example.com` }, '200');
  ask('Search for the key');
  call('c2', 'Grep', { pattern: secrets.sk, path: '/w' }, 'none');
  ask('Deploy');
  call('c3', 'mcp__deploy__run', { api_key: secrets.field, token: secrets.ghp, target: 'prod' }, 'deployed');
  ask('Write the key file');
  call('c4', 'Write', { file_path: '/w/key.pem', content: pem }, 'written');
  // Past the text's argument bound (2 000 characters) but inside the row's diff bound (20 000): the row holds a key the
  // model's text does not, clipped before its closing line.
  ask('Write the big file');
  call('c5', 'Write', { file_path: '/w/big.txt', content: `${'x'.repeat(19940)}\n-----BEGIN PRIVATE KEY-----\n${secrets.clipped}\n-----END PRIVATE KEY-----` }, 'written');
  ask('Edit the key');
  call('c6', 'Edit', { file_path: '/w/key.pem', old_string: pem, new_string: 'gone' }, 'edited');
  const s = makeSession(makeSummary('claude-code', 'calls', { title: 'Calls' }), list.items);

  const prepared = prepare(s, null, realConvert);
  const sent = JSON.stringify(prepared.seed.messages);
  for (const [name, value] of Object.entries(secrets)) assert.ok(!sent.includes(value), `${name} reaches no core`);
  const calls = prepared.seed.messages.flatMap((message) => (message.parts ?? []).filter((part) => part.call).map((part) => part.call));
  assert.equal(calls.length, 6, 'every reply keeps its tool row');
  const [bash, grep, mcp, write, big, edit] = calls;
  assert.equal(bash.type, 'commandExecution');
  assert.equal(bash.command, `curl -H "Authorization: Bearer ${REDACTED}" https://api.example.com`);
  assert.equal(grep.commandActions[0].query, REDACTED);
  assert.deepEqual([mcp.type, mcp.arguments], ['mcpToolCall', { api_key: REDACTED, token: REDACTED, target: 'prod' }], 'a field named like a secret is masked whole');
  assert.deepEqual([write.type, write.changes[0].kind.type, write.changes[0].diff], ['fileChange', 'add', REDACTED]);
  assert.ok(big.changes[0].diff.startsWith('x'.repeat(100)) && big.changes[0].diff.endsWith(REDACTED), 'a key clipped before its closing line loses what is left of it');
  assert.equal(edit.type, 'fileChange');
  assert.equal(edit.changes[0].diff, `@@ -1,3 +1,1 @@\n-${REDACTED}\n+gone\n`, 'the hunk keeps its counts; the removed key is one mask');
  // The count is what the model was spared: the same as without any rows.
  const textOnly = { ...realConvert, toDshSeed: (x) => ({ messages: realConvert.toDshSeed(x).messages.map((message) => ({ ...message, ...(message.parts ? { parts: message.parts.map(({ call: _drop, ...part }) => part) } : {}) })) }) };
  const plain = prepare(s, null, textOnly);
  assert.equal(prepared.seed.redacted, plain.seed.redacted);
  assert.deepEqual(prepared.seed.messages.map((message) => message.text), plain.seed.messages.map((message) => message.text), 'the model\'s text is the same with or without rows');
});

test('prepareImport: a private key that a reply\'s text opens and its tool row closes sends that reply as text alone', () => {
  const body = 'MIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQC';
  const opening = 'Here:\n-----BEGIN PRIVATE KEY-----', tool = '[Tool: Note]\n(the rest)\n[Result]\nok';
  const ran = '[Tool: Bash]\nnpm test\n[Result]\nok';
  const prepared = prepare(session('claude-code'), null, { ...convert, toDshSeed: () => ({ messages: [
    { role: 'user', text: 'Print the key' },
    { role: 'assistant', text: `${opening}\n\n${tool}`, parts: [{ text: opening }, { text: tool, tool: true, call: { type: 'dynamicToolCall', tool: 'Note', arguments: { rest: `${body}\n-----END PRIVATE KEY-----` } } }] },
    { role: 'user', text: 'Now run it' },
    { role: 'assistant', text: ran, parts: [{ text: ran, tool: true, call: { type: 'commandExecution', command: 'npm test', cwd: '/w' } }] },
  ] }) });
  const [, split, , clean] = prepared.seed.messages;
  assert.ok(!JSON.stringify(prepared.seed.messages).includes(body), 'the key reaches no core');
  assert.equal(split.parts, undefined, 'its text alone, no rows');
  assert.equal(split.text, `${opening}\n\n${tool}`, 'the model\'s text is what it was');
  assert.equal(prepared.seed.redacted, 0, 'nothing the model reads was masked');
  assert.deepEqual(clean.parts, [{ text: ran, tool: true, call: { type: 'commandExecution', command: 'npm test', cwd: '/w' } }], 'other replies keep their rows');
});

test('prepareImport: rows travel only on tool blocks; boundCalls drops the oldest rows past SEED_CALLS_MAX_CHARS', () => {
  const ran = '[Tool: Bash]\nls\n[Result]\nok';
  const prepared = prepare(session('claude-code'), null, { ...convert, toDshSeed: () => ({ messages: [
    { role: 'user', text: 'List' },
    { role: 'assistant', text: `Sure\n\n${ran}`, parts: [{ text: 'Sure', call: { type: 'commandExecution', command: 'x' } }, { text: ran, tool: true, call: 'not an object' }] },
  ] }) });
  assert.deepEqual(prepared.seed.messages[1].parts, [{ text: 'Sure' }, { text: ran, tool: true }]);
  const big = (n) => ({ type: 'dynamicToolCall', tool: `T${n}`, arguments: { text: 'y'.repeat(30000) } });
  const messages = Array.from({ length: 80 }, (_, n) => ({ role: 'assistant', text: 't', parts: [{ text: 't', tool: true, call: big(n) }] }));
  boundCalls(messages);
  const kept = messages.filter((message) => message.parts[0].call);
  assert.ok(kept.length > 0 && kept.length < 80);
  assert.equal(kept[0], messages[80 - kept.length], 'the newest keep theirs');
  assert.ok(kept.reduce((sum, message) => sum + JSON.stringify(message.parts[0].call).length, 0) <= SEED_CALLS_MAX_CHARS);
  assert.ok(messages.every((message) => message.parts[0].text === 't' && message.parts[0].tool === true), 'their blocks stay');
});
