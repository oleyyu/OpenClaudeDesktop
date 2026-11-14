// w13-chatfn-context: the Chat context contributors (electron/chat-context.mjs) — what main adds to a Chat or Cowork
// session's thread/start|resume in place of the official claude.ai completion-time context — and its wiring in main.cjs.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';
import {
  applyChatContext, contextSurface, contributorOf, loadContributors, sessionSurfaceResolver,
  MAX_BLOCK_CHARS, MAX_TOTAL_CHARS, TRUNCATED, CONTEXT_SURFACES,
} from '../electron/chat-context.mjs';

const require = createRequire(import.meta.url);
const app = path.resolve(import.meta.dirname, '..');
const quiet = { warn() {}, log() {} };
const contributor = (id, surfaces, apply) => ({ id, surfaces, apply });
const config = () => ({ sessionMetadata: { 'thread-chat': { surface: 'chat' }, 'thread-cowork': { surface: 'cowork' }, 'thread-code': { surface: 'code' }, 'thread-old': {} } });

test('the contract: constants, and a module is a contributor only with an id, chat/cowork surfaces and apply()', () => {
  assert.deepEqual(CONTEXT_SURFACES, ['chat', 'cowork']);
  assert.equal(MAX_BLOCK_CHARS, 24000);
  assert.equal(MAX_TOTAL_CHARS, 64000);
  assert.ok(MAX_BLOCK_CHARS < MAX_TOTAL_CHARS);
  const apply = () => null;
  assert.deepEqual(contributorOf({ id: 'memory', surfaces: ['chat', 'code', 'nope'], apply }), { id: 'memory', surfaces: ['chat'], apply });
  for (const bad of [{ surfaces: ['chat'], apply }, { id: 'Memory!', surfaces: ['chat'], apply }, { id: 'memory', apply }, { id: 'memory', surfaces: ['code'], apply }, { id: 'memory', surfaces: ['chat'] }, null])
    assert.equal(contributorOf(bad), null, JSON.stringify(bad));
});

test('contributors join in id order after the request’s own instructions; config keys are only added', async () => {
  const seen = [];
  const params = { cwd: '/w', developerInstructions: 'Surface.\n\nProject instructions:\nBe brief.', config: { web_search: 'live' } };
  const result = await applyChatContext(config(), 'thread/start', params, 'chat', { logger: quiet, project: { id: 'p1' }, dataDir: '/data', contributors: [
    contributor('tools', ['chat'], (input) => { seen.push(['tools', input.surface, input.project?.id, input.dataDir, input.threadId]); return { instructions: 'Tools block.', config: { web_search: 'disabled', 'features.x': true } }; }),
    contributor('memory', ['chat', 'cowork'], () => { seen.push(['memory']); return '  Memory block.  '; }),
    contributor('knowledge', ['chat'], () => ({ config: { 'features.x': false, 'features.y': 1 } })),
    contributor('cowork-only', ['cowork'], () => { throw new Error('must not run for chat'); }),
    contributor('nothing', ['chat'], () => null),
  ] });
  assert.deepEqual(result, { surface: 'chat', contributors: ['knowledge', 'memory', 'tools'] });
  assert.deepEqual(seen, [['memory'], ['tools', 'chat', 'p1', '/data', null]], 'id order: knowledge, memory, nothing, tools');
  assert.equal(params.developerInstructions, 'Surface.\n\nProject instructions:\nBe brief.\n\nMemory block.\n\nTools block.');
  // The request's own key stays; the first contributor (by id) to add a key keeps it.
  assert.deepEqual(params.config, { web_search: 'live', 'features.x': false, 'features.y': 1 });
});

test('a contributor reads a copy of the request; one that throws or answers garbage is skipped', async () => {
  const params = { cwd: '/w', input: [{ type: 'text', text: 'hi' }] };
  const before = structuredClone(params);
  const result = await applyChatContext(config(), 'thread/start', params, 'chat', { logger: quiet, contributors: [
    contributor('a', ['chat'], (input) => { input.params.cwd = '/elsewhere'; input.params.input.push('x'); delete input.params.input; return null; }),
    contributor('b', ['chat'], () => { throw new Error('broken'); }),
    contributor('c', ['chat'], () => ['not', 'an', 'answer']),
    contributor('d', ['chat'], () => ({ config: { 'bad key!': 1, fn: () => 1, undef: undefined } })),
    contributor('e', ['chat'], async () => 'Still here.'),
  ] });
  assert.deepEqual(result.contributors, ['e']);
  assert.deepEqual(params, { ...before, developerInstructions: 'Still here.' });
});

test('each block is cut to MAX_BLOCK_CHARS and all blocks together to MAX_TOTAL_CHARS', async () => {
  const params = {};
  const long = (letter, size) => letter.repeat(size);
  const result = await applyChatContext(config(), 'thread/start', params, 'chat', { logger: quiet, contributors: [
    contributor('a', ['chat'], () => long('a', MAX_BLOCK_CHARS + 500)),
    contributor('b', ['chat'], () => long('b', MAX_BLOCK_CHARS)),
    contributor('c', ['chat'], () => long('c', MAX_BLOCK_CHARS)),
    contributor('d', ['chat'], () => 'never reached'),
  ] });
  const blocks = params.developerInstructions.split('\n\n');
  assert.equal(blocks.length, 3);
  assert.equal(blocks[0].length, MAX_BLOCK_CHARS);
  assert.ok(blocks[0].endsWith(TRUNCATED) && blocks[0].startsWith('aaa'));
  assert.equal(blocks[1], long('b', MAX_BLOCK_CHARS), 'a block at the limit is kept whole');
  assert.equal(blocks[2].length, MAX_TOTAL_CHARS - 2 * MAX_BLOCK_CHARS);
  assert.ok(blocks[2].endsWith(TRUNCATED));
  assert.equal(blocks.reduce((sum, block) => sum + block.length, 0), MAX_TOTAL_CHARS);
  assert.deepEqual(result.contributors, ['a', 'b', 'c'], 'nothing left for d');
});

test('thread/resume takes the surface from sessionMetadata; Code (and old sessions) stay exactly as they were', async () => {
  const calls = [];
  const contributors = [contributor('memory', ['chat', 'cowork'], ({ surface, threadId, method }) => { calls.push([method, surface, threadId]); return `For ${surface}.`; })];
  const chat = { threadId: 'thread-chat' };
  assert.deepEqual(await applyChatContext(config(), 'thread/resume', chat, null, { contributors, logger: quiet }), { surface: 'chat', contributors: ['memory'] });
  assert.equal(chat.developerInstructions, 'For chat.');
  const cowork = { threadId: 'thread-cowork', developerInstructions: 'Cowork.' };
  await applyChatContext(config(), 'thread/resume', cowork, null, { contributors, logger: quiet });
  assert.equal(cowork.developerInstructions, 'Cowork.\n\nFor cowork.');
  assert.deepEqual(calls, [['thread/resume', 'chat', 'thread-chat'], ['thread/resume', 'cowork', 'thread-cowork']]);
  // Code: a code thread, an old session without a surface, an unknown thread, a Code thread/start, a start without a
  // surface, and every other method — params keep their identity and their exact bytes; no contributor runs.
  const cases = [
    ['thread/resume', { threadId: 'thread-code', config: { a: 1 } }, null],
    ['thread/resume', { threadId: 'thread-old' }, null],
    ['thread/resume', { threadId: 'nope' }, 'chat'],
    ['thread/start', { cwd: '/w', developerInstructions: '', config: { web_search: 'live' } }, 'code'],
    ['thread/start', { cwd: '/w' }, null],
    ['turn/start', { threadId: 'thread-chat', input: [] }, null],
    ['thread/fork', { threadId: 'thread-chat' }, 'chat'],
  ];
  calls.length = 0;
  for (const [method, params, surface] of cases) {
    const bytes = JSON.stringify(params), keys = Object.keys(params);
    const result = await applyChatContext(config(), method, params, surface, { contributors, logger: quiet });
    assert.deepEqual(result.contributors, [], `${method} ${bytes}`);
    assert.equal(JSON.stringify(params), bytes, `${method} ${bytes} unchanged`);
    assert.deepEqual(Object.keys(params), keys);
  }
  assert.deepEqual(calls, []);
  assert.equal(contextSurface(config(), 'thread/start', {}, 'cowork'), 'cowork');
  assert.equal(contextSurface(config(), 'thread/start', {}, 'bogus'), 'code');
});

test('contributors load from a directory in file-name order, are sorted by id, and bad modules are left out', async (t) => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'chat-context-'));
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  const write = (file, text) => fs.writeFileSync(path.join(dir, file), text);
  write('1-zeta.mjs', "export const id = 'zeta'; export const surfaces = ['chat']; export const apply = () => 'Z';");
  write('2-alpha.mjs', "export const id = 'alpha'; export const surfaces = ['chat']; export const apply = () => 'A';");
  write('3-dup.mjs', "export const id = 'alpha'; export const surfaces = ['chat']; export const apply = () => 'dup';");
  write('4-broken.mjs', 'export const id = ;');
  write('5-code.mjs', "export const id = 'code'; export const surfaces = ['code']; export const apply = () => 'C';");
  write('README.txt', 'not a module');
  const warnings = [];
  const logger = { warn: (message) => warnings.push(message) };
  const list = await loadContributors(dir, logger);
  assert.deepEqual(list.map((entry) => entry.id), ['zeta', 'alpha']);
  assert.equal(warnings.length, 3, warnings.join('\n'));
  assert.equal(await loadContributors(dir, logger), list, 'loaded once per directory');
  const params = {};
  await applyChatContext(config(), 'thread/start', params, 'chat', { dir, logger });
  assert.equal(params.developerInstructions, 'A\n\nZ');
});

test('the app’s contributor directory: README states the contract, and every module in it loads', async () => {
  const dir = path.join(app, 'electron/chat-context');
  const readme = fs.readFileSync(path.join(dir, 'README.txt'), 'utf8');
  for (const needle of ['export const id', 'export const surfaces', 'export async function apply', 'MAX_BLOCK_CHARS', 'MAX_TOTAL_CHARS', 'surfaces = ["chat"]'])
    assert.ok(readme.includes(needle), needle);
  const files = fs.readdirSync(dir).filter((file) => file.endsWith('.mjs'));
  const warnings = [];
  const list = await loadContributors(dir, { warn: (message) => warnings.push(message) });
  assert.deepEqual(warnings, []);
  assert.equal(list.length, files.length);
});

test('sessionSurface for the tool host: a start token from its decorated thread/start, else the thread’s metadata', async () => {
  const state = config();
  const resolve = sessionSurfaceResolver(() => state);
  const key = 'mcp_servers.code_desktop.env.CODE_DESKTOP_AGENT_SESSION';
  // main.cjs: applyChatContext, then decorateAgentTools writes the start token into the same request's config.
  const chat = { cwd: '/w' };
  await applyChatContext(state, 'thread/start', chat, 'chat', { contributors: [], logger: quiet });
  chat.config = { ...chat.config, [key]: 'start-11111111-1111-4111-8111-111111111111' };
  const code = { cwd: '/w' };
  await applyChatContext(state, 'thread/start', code, 'code', { contributors: [], logger: quiet });
  code.config = { [key]: 'start-22222222-2222-4222-8222-222222222222' };
  assert.equal(resolve({ id: null, identity: 'start-11111111-1111-4111-8111-111111111111' }), 'chat');
  assert.equal(resolve({ id: 'thread-new', identity: 'start-11111111-1111-4111-8111-111111111111' }), 'chat', 'bound, before main wrote the metadata');
  assert.equal(resolve({ id: null, identity: 'start-22222222-2222-4222-8222-222222222222' }), 'code');
  assert.equal(resolve({ id: 'thread-chat', identity: 'thread-chat' }), 'chat');
  assert.equal(resolve({ id: 'thread-cowork' }), 'cowork');
  assert.equal(resolve({ id: 'thread-old', identity: 'thread-old' }), 'code');
  assert.equal(resolve({ id: 'unknown' }), 'code');
  assert.equal(resolve({}), 'code');
  assert.equal(resolve(null), 'code');
  // The key is the one main.cjs writes (AGENT_SESSION_KEY) for the host's server name.
  const main = fs.readFileSync(path.join(app, 'electron/main.cjs'), 'utf8');
  assert.ok(main.includes('const AGENT_SESSION_KEY = `mcp_servers.${agentTools.SERVER_NAME}.env.CODE_DESKTOP_AGENT_SESSION`;'));
  assert.equal(require('../electron/agent-tools-host.cjs').SERVER_NAME, 'code_desktop');
});

test('main.cjs: requestRpc and requestCowork decorate right after applyProjectContext; the host gets sessionSurface', () => {
  const main = fs.readFileSync(path.join(app, 'electron/main.cjs'), 'utf8');
  const once = (needle) => { assert.equal(main.split(needle).length, 2, needle); return main.indexOf(needle); };
  const rpcProject = once('const requestedProject = applyProjectContext(config, p.method, params, requestedSurface);\n');
  const rpcContext = once("await (await import('./chat-context.mjs')).applyChatContext(config, p.method, params, requestedSurface, { dataDir: app.getPath('userData'), project: requestedProject });");
  assert.ok(rpcContext > rpcProject && !main.slice(rpcProject, rpcContext).includes(';\n        const '), 'the next statement after applyProjectContext');
  assert.ok(rpcContext < main.indexOf('decorateAgentTools(p.method, params);', rpcContext), 'before the tool server names the start token');
  const coworkProject = once('const project = applyProjectContext(config, p.method, params, surface);\n');
  const coworkContext = once("await (await import('./chat-context.mjs')).applyChatContext(config, p.method, params, surface, { dataDir: app.getPath('userData'), project });");
  assert.ok(coworkContext > coworkProject && coworkContext - coworkProject < 120);
  const provide = once("agentTools.provide('sessionSurface', (await import('./chat-context.mjs')).sessionSurfaceResolver(() => config));");
  assert.ok(provide < main.indexOf('async function requestCowork(p) {'));
});
