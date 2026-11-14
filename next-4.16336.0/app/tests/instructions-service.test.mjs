import test from 'node:test';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import service from '../electron/instructions-service.cjs';
const { createInstructionsService, findProjectFile, composeInstructions, decorateCoreParams, systemPromptResult, TOTAL_CAP } = service;

function tree() {
  const home = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'ins-home-')));
  const repo = path.join(home, 'work', 'repo');
  fs.mkdirSync(path.join(repo, 'packages', 'app', 'src'), { recursive: true });
  return { home, repo, cleanup: () => fs.rmSync(home, { recursive: true, force: true }) };
}
const writeFile = (file, text) => { fs.mkdirSync(path.dirname(file), { recursive: true }); fs.writeFileSync(file, text); };

test('findProjectFile walks up to the nearest file and never reads home or /', (t) => {
  const { home, repo, cleanup } = tree(); t.after(cleanup);
  const deep = path.join(repo, 'packages', 'app', 'src');
  assert.equal(findProjectFile(deep, { home }), null);
  writeFile(path.join(home, '.code-desktop', 'instructions.md'), 'home file');
  assert.equal(findProjectFile(deep, { home }), null, 'home is a boundary');
  writeFile(path.join(repo, '.code-desktop', 'instructions.md'), 'repo');
  assert.equal(findProjectFile(deep, { home }), path.join(repo, '.code-desktop', 'instructions.md'));
  writeFile(path.join(repo, 'packages', 'app', '.code-desktop', 'instructions.md'), 'app');
  assert.equal(findProjectFile(deep, { home }), path.join(repo, 'packages', 'app', '.code-desktop', 'instructions.md'));
  assert.equal(findProjectFile('relative', { home }), null);
});

test('findProjectFile stops after 8 levels', (t) => {
  const { home, repo, cleanup } = tree(); t.after(cleanup);
  writeFile(path.join(repo, '.code-desktop', 'instructions.md'), 'repo');
  const deep = path.join(repo, ...'abcdefghi'.split(''));
  fs.mkdirSync(deep, { recursive: true });
  assert.equal(findProjectFile(deep, { home }), null);
  assert.equal(findProjectFile(path.dirname(path.dirname(deep)), { home }), path.join(repo, '.code-desktop', 'instructions.md'));
});

test('composeInstructions: format, omitted parts, comments, disabled and the 40000 cap', () => {
  const prefs = { global: '  Be brief.  ', projects: { '/w/app': { text: 'Use pnpm.' } } };
  const full = composeInstructions({ prefs, cwd: '/w/app/src', fileText: '<!-- template -->\nRun tests.', filePath: '/w/app/.code-desktop/instructions.md' });
  assert.equal(full.text, '# Custom instructions\nBe brief.\n\n# Project instructions (/w/app)\nRun tests.\n\nUse pnpm.');
  assert.deepEqual(full.parts.map(p => p.source), ['global', 'projectFile', 'projectOverride']);
  assert.equal(full.chars, full.text.length);
  assert.equal(full.truncated, false);
  assert.equal(full.systemPrompt, 'Be brief.', 'DeepSeek: the global text is the whole system prompt');
  assert.equal(full.instructions, 'Run tests.\n\nUse pnpm.', 'after a custom system prompt the project text is bare');
  const kept = composeInstructions({ prefs: { global: '<!-- mine -->\nYou are X.\n' }, cwd: '/w' });
  assert.equal(kept.systemPrompt, '<!-- mine -->\nYou are X.', 'the system prompt is the text as written, trimmed');
  const fileOnly = composeInstructions({ prefs: {}, cwd: '/r/x', fileText: 'From file', filePath: '/r/.code-desktop/instructions.md' });
  assert.equal(fileOnly.text, '# Project instructions (/r)\nFrom file');
  assert.equal(fileOnly.systemPrompt, null, 'empty global: the built-in prompt');
  assert.equal(fileOnly.instructions, '# Project instructions (/r)\nFrom file', 'after the built-in prompt the project text keeps its heading');
  const commentOnly = composeInstructions({ prefs: {}, cwd: '/r', fileText: '<!-- nothing yet -->\n', filePath: '/r/.code-desktop/instructions.md' });
  assert.equal(commentOnly.text, '');
  const noFile = composeInstructions({ prefs: { projects: { '/w': { text: 'o', useFile: false } } }, cwd: '/w', fileText: 'ignored', filePath: '/w/.code-desktop/instructions.md' });
  assert.equal(noFile.text, '# Project instructions (/w)\no');
  const off = composeInstructions({ prefs: { ...prefs, enabled: false }, cwd: '/w/app' });
  assert.deepEqual([off.text, off.systemPrompt, off.instructions], ['', null, null]);
  assert.equal(composeInstructions({ prefs: { global: '   ' }, cwd: '/w' }).systemPrompt, null);
  const big = composeInstructions({ prefs: { global: 'g'.repeat(20000), projects: { '/w': { text: 'p'.repeat(20000) } } }, cwd: '/w', fileText: 'f'.repeat(30000), filePath: '/w/.code-desktop/instructions.md' });
  assert.ok(!big.truncated, 'no total cap');
  assert.ok(big.text.includes('g'.repeat(20000)) && big.text.includes('p'.repeat(20000)) && big.text.includes('f'.repeat(30000)));
});

test('decorateCoreParams: DeepSeek merges the namespaced key on start, resume and turn', () => {
  const read = () => ({ text: 'ignored', systemPrompt: 'S', instructions: 'T' });
  for (const method of ['thread/start', 'thread/resume', 'turn/start']) {
    const params = { codeDesktop: { hints: true, customization: { modelParams: { m: { temperature: 1 } } } } };
    decorateCoreParams(method, params, { engine: 'deepseek-harness', cwd: '/w', read });
    assert.deepEqual(params.codeDesktop, { hints: true, customization: { modelParams: { m: { temperature: 1 } }, systemPrompt: 'S', instructions: 'T' } });
    assert.equal(params.developerInstructions, undefined, 'DeepSeek never gets developerInstructions from us');
  }
  const cleared = {};
  decorateCoreParams('turn/start', cleared, { engine: 'deepseek-harness', cwd: '/w', read: () => ({ text: '' }) });
  assert.deepEqual(cleared, { codeDesktop: { customization: { systemPrompt: null, instructions: null } } });
  const other = {};
  decorateCoreParams('thread/list', other, { engine: 'deepseek-harness', cwd: '/w', read });
  assert.deepEqual(other, {});
});

test('decorateCoreParams: a custom prompt replaces Codex\'s, other cores get no default line; without one the text is appended', () => {
  const { CUSTOM_PROMPT_CODEX_CONFIG } = require('../electron/instructions-service.cjs');
  const read = () => ({ text: 'Global\n\nProject', systemPrompt: 'Global', instructions: 'Project' });
  const start = { developerInstructions: 'App', config: { model: 'x' } };
  decorateCoreParams('thread/start', start, { engine: { engine: 'codex' }, cwd: '/w', read });
  assert.deepEqual([start.baseInstructions, start.developerInstructions, start.personality], ['Global', 'Project', 'none']);
  assert.deepEqual(start.config, { model: 'x', ...CUSTOM_PROMPT_CODEX_CONFIG });
  assert.equal(start.codeDesktop, undefined);
  const resume = {};
  decorateCoreParams('thread/resume', resume, { engine: 'codex', cwd: '/w', read: () => ({ text: 'Global', systemPrompt: 'Global', instructions: null }) });
  assert.deepEqual([resume.baseInstructions, resume.developerInstructions], ['Global', null], 'no default line, no project text');
  const bridge = { developerInstructions: 'App' };
  decorateCoreParams('thread/start', bridge, { engine: undefined, cwd: '/w', read });
  assert.deepEqual([bridge.developerInstructions, bridge.baseInstructions], ['Global\n\nProject', undefined], 'the app line is replaced');
  const turn = {};
  decorateCoreParams('turn/start', turn, { engine: 'codex', cwd: '/w', read });
  assert.deepEqual(turn, {});
  const projectOnly = { developerInstructions: 'App' };
  decorateCoreParams('thread/start', projectOnly, { engine: 'codex', cwd: '/w', read: () => ({ text: 'Mine', systemPrompt: null, instructions: 'Mine' }) });
  assert.deepEqual([projectOnly.developerInstructions, projectOnly.baseInstructions], ['App\n\nMine', undefined]);
  const empty = { developerInstructions: 'App' };
  decorateCoreParams('thread/start', empty, { engine: 'codex', cwd: '/w', read: () => ({ text: '' }) });
  assert.equal(empty.developerInstructions, 'App');
});

test('service: decorate reads the file fresh and resolves cwd from thread metadata', (t) => {
  const { home, repo, cleanup } = tree(); t.after(cleanup);
  const config = { cwd: '/nowhere', customInstructions: { global: 'G' }, threadMetadata: { t1: { cwd: repo } } };
  const client = { serverInfo: { engine: 'deepseek-harness' } };
  const svc = createInstructionsService({ getConfig: () => config, getClient: () => client, shell: {}, knownCwd: c => c, home });
  const turn = { threadId: 't1' };
  svc.decorate('turn/start', turn);
  assert.deepEqual(turn.codeDesktop.customization, { systemPrompt: 'G', instructions: null });
  writeFile(path.join(repo, '.code-desktop', 'instructions.md'), 'Repo rule');
  const next = { threadId: 't1' };
  svc.decorate('turn/start', next);
  assert.deepEqual(next.codeDesktop.customization, { systemPrompt: 'G', instructions: 'Repo rule' });
  config.customInstructions = { global: '' };
  const builtIn = { threadId: 't1' };
  svc.decorate('turn/start', builtIn);
  assert.deepEqual(builtIn.codeDesktop.customization, { systemPrompt: null, instructions: `# Project instructions (${repo})\nRepo rule` });
  config.customInstructions = { enabled: false, global: 'G' };
  const off = { cwd: repo };
  svc.decorate('thread/start', off);
  assert.deepEqual(off.codeDesktop.customization, { systemPrompt: null, instructions: null });
});

test('service ops: preview, create-file (never overwrites), open/reveal, cwd validation', async (t) => {
  const { home, repo, cleanup } = tree(); t.after(cleanup);
  const opened = [], revealed = [];
  const shell = { openPath: async p => { opened.push(p); return ''; }, showItemInFolder: p => revealed.push(p) };
  const config = { cwd: repo, customInstructions: { global: 'G' } };
  const svc = createInstructionsService({ getConfig: () => config, getClient: () => ({ serverInfo: {} }), shell, home,
    knownCwd: c => { if (c !== repo) throw new Error('Unknown workspace directory.'); return c; } });
  const target = path.join(repo, '.code-desktop', 'instructions.md');
  const before = await svc.run({ op: 'preview', cwd: repo });
  assert.equal(before.text, '# Custom instructions\nG');
  assert.equal(before.engine, 'codex');
  assert.deepEqual(before.file, { path: target, exists: false, bytes: 0 });
  await assert.rejects(svc.run({ op: 'open-file', cwd: repo }), /doesn’t exist yet/);
  const created = await svc.run({ op: 'create-file', cwd: repo });
  assert.equal(created.file.exists, true);
  assert.equal(created.text, '# Custom instructions\nG', 'the template comment adds nothing');
  assert.deepEqual(opened, [target]);
  fs.writeFileSync(target, 'Custom');
  await svc.run({ op: 'create-file', cwd: repo });
  assert.equal(fs.readFileSync(target, 'utf8'), 'Custom');
  assert.equal(await svc.run({ op: 'open-file', cwd: repo }), true);
  assert.equal(await svc.run({ op: 'reveal-file', cwd: repo }), true);
  assert.deepEqual(revealed, [target]);
  await assert.rejects(svc.run({ op: 'preview', cwd: '/etc' }), /Unknown workspace directory/);
  await assert.rejects(svc.run({ op: 'nope', cwd: repo }), /Unsupported instructions operation/);
});

test('the project file is read whole (no size cap)', (t) => {
  const { home, repo, cleanup } = tree(); t.after(cleanup);
  writeFile(path.join(repo, '.code-desktop', 'instructions.md'), 'x'.repeat(40 * 1024));
  const svc = createInstructionsService({ getConfig: () => ({}), getClient: () => ({ serverInfo: { engine: 'deepseek-harness' } }), shell: {}, knownCwd: c => c, home });
  const params = { cwd: repo };
  svc.decorate('thread/start', params);
  const body = params.codeDesktop.customization.instructions.split('\n').at(-1);
  assert.equal(body.length, 40 * 1024);
});

test('service op system-prompt: asks the DeepSeek core with the saved values and shapes the result', async (t) => {
  const { home, repo, cleanup } = tree(); t.after(cleanup);
  writeFile(path.join(repo, '.code-desktop', 'instructions.md'), 'Repo rule');
  const calls = [];
  const client = { serverInfo: { engine: 'deepseek-harness' }, request: async (method, params, timeout) => {
    calls.push({ method, params, timeout });
    return { text: 'Arrr.\n\nRepo rule', defaultText: 'You are an AI agent powered by DeepSeek Harness.', defaultTemplate: 'T {{model}}', custom: true, exact: false,
      sections: [{ name: 'code-desktop:system-prompt', chars: 5 }, { bogus: 1 }], tools: ['bash', 3], variables: { model: 'deepseek-flash', cwd: repo }, cwd: repo, threadId: null };
  } };
  const config = { cwd: repo, threadIds: ['t1'], customInstructions: { global: 'Arrr.' } };
  const svc = createInstructionsService({ getConfig: () => config, getClient: () => client, shell: {}, knownCwd: c => c, home });
  const result = await svc.run({ op: 'system-prompt', cwd: repo, threadId: 't1', model: 'deepseek-pro' });
  assert.deepEqual(calls, [{ method: 'codeDesktop/systemPrompt/preview', timeout: 15000,
    params: { cwd: repo, threadId: 't1', model: 'deepseek-pro', codeDesktop: { customization: { systemPrompt: 'Arrr.', instructions: 'Repo rule' } } } }]);
  assert.deepEqual(result, { text: 'Arrr.\n\nRepo rule', defaultText: 'You are an AI agent powered by DeepSeek Harness.', defaultTemplate: 'T {{model}}', custom: true, exact: false,
    sections: [{ name: 'code-desktop:system-prompt', chars: 5 }], tools: ['bash'], model: 'deepseek-flash', cwd: repo, threadId: null });
  await svc.run({ op: 'system-prompt', cwd: repo, threadId: 'unknown' });
  assert.equal(calls[1].params.threadId, undefined, 'only known sessions are passed');
  client.serverInfo.engine = 'codex';
  await assert.rejects(svc.run({ op: 'system-prompt', cwd: repo }), /^Error: Codex can’t show its final system prompt\.$/);
  const serverInfo = client.serverInfo;
  client.serverInfo = null;
  await assert.rejects(svc.run({ op: 'system-prompt', cwd: repo }), /^Error: Connect .+ first: the preview asks the running core\.$/);
  client.serverInfo = serverInfo;
  assert.deepEqual(systemPromptResult(null), { text: '', defaultText: '', defaultTemplate: '', custom: false, exact: false, sections: [], tools: [], model: null, cwd: null, threadId: null });
});
