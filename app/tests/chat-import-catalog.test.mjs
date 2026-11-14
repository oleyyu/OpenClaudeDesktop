// Import Chat History catalog (electron/chat-import/catalog.mjs): sources, the merged newest-first listing (query, limit,
// sources, sub-agents, exclusions, the mtime+size cache) and reading by key, over synthetic histories.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { buildHome, IDS } from './fixtures/chat-import/build-home.mjs';
import { clearCache, listSessions, listSources, readSession } from '../electron/chat-import/catalog.mjs';
import { SOURCE_IDS } from '../electron/chat-import/model.mjs';

const fixture = buildHome();
test.after(() => fixture.cleanup());
const base = { home: fixture.home, env: fixture.env };

test('listSources: every source with its label, availability, experimental flag and roots', async () => {
  const sources = await listSources(base);
  assert.deepEqual(sources.map(source => source.source), SOURCE_IDS);
  assert.ok(sources.every(source => source.available), 'the synthetic home has every source');
  assert.deepEqual(sources.filter(source => source.experimental).map(source => source.source), ['minimax', 'zcode', 'copilot', 'cursor']);
  assert.equal(sources.find(source => source.source === 'grok').label, 'Grok CLI');
  assert.ok(sources.find(source => source.source === 'claude-code').roots.includes(path.join(fixture.configDir, 'projects')));
  // The second-stage sources: labels and the roots the page names in its empty state.
  const row = id => sources.find(source => source.source === id);
  assert.deepEqual(['mimo', 'minimax', 'zcode'].map(id => row(id).label), ['MiMo Code', 'MiniMax Code', 'ZCode']);
  assert.ok(row('mimo').roots.includes(path.join(fixture.home, '.local', 'share', 'mimocode', 'mimocode.db')));
  assert.ok(row('minimax').roots.includes(path.join(fixture.home, '.minimax', 'v2', 'sqlite', 'runtime-state.sqlite')));
  assert.deepEqual(row('zcode').roots, [path.join(fixture.home, '.zcode', 'cli', 'db', 'db.sqlite')]);
  assert.ok(row('gemini').roots.length && row('kimi').roots.length && row('qwen').roots.length && row('opencode').roots.length);
  const empty = await listSources({ home: path.join(fixture.home, 'missing'), env: {} });
  assert.ok(empty.every(source => !source.available));
});

test('listSessions: all sources merged newest first, contract fields present, sub-agents out by default', async () => {
  clearCache();
  const sessions = await listSessions(base);
  assert.deepEqual([...new Set(sessions.map(session => session.source))].sort(), [...SOURCE_IDS].sort());
  for (let at = 1; at < sessions.length; at++) assert.ok((sessions[at - 1].updatedAt ?? 0) >= (sessions[at].updatedAt ?? 0));
  for (const session of sessions) {
    for (const field of ['key', 'source', 'sourceId', 'sourcePath', 'title', 'firstPrompt', 'cwd', 'gitBranch', 'model', 'createdAt', 'updatedAt', 'archived', 'parentId', 'isSubagent', 'fidelity', 'experimental', 'warnings']) {
      assert.ok(Object.hasOwn(session, field), `${session.key} has ${field}`);
    }
    assert.equal(session.key, `${session.source}:${session.sourceId}`);
    assert.equal(session.isSubagent, false);
  }
  assert.ok(sessions.warnings.some(warning => warning.source === 'codex' && /no rollout file/.test(warning.message)));
  assert.equal(JSON.parse(JSON.stringify(sessions)).length, sessions.length, 'warnings do not leak into the serialized list');
  const withSubagents = await listSessions({ ...base, includeSubagents: true });
  assert.deepEqual(withSubagents.filter(session => session.isSubagent).map(session => session.source).sort(), ['claude-code', 'codex', 'dsh', 'grok', 'opencode']);
});

test('listSessions: query, sources and limit', async () => {
  assert.deepEqual((await listSessions({ ...base, query: 'PARSER' })).map(session => session.key), [`claude-code:${IDS.claude}`]);
  assert.deepEqual((await listSessions({ ...base, query: '/work/beta' })).map(session => session.key), [`codex:${IDS.codexLegacy}`]);
  assert.ok((await listSessions({ ...base, query: 'qwen code' })).every(session => session.source === 'qwen'), 'the source label matches too');
  const two = await listSessions({ ...base, sources: ['grok', 'dsh', 'unknown'] });
  assert.deepEqual(two.map(session => session.source).sort(), ['dsh', 'grok']);
  assert.equal((await listSessions({ ...base, limit: 3 })).length, 3);
});

test('listSessions: excluded paths are never read (OpenClaude\'s own bridge state)', async () => {
  const sessions = await listSessions({ ...base, exclude: [path.join(fixture.home, '.local', 'share', 'opencode', 'opencode.db'), path.join(fixture.home, '.grok')] });
  assert.ok(!sessions.some(session => session.source === 'opencode' || session.source === 'grok'));
  await assert.rejects(readSession('opencode:ses_v1', { ...base, exclude: [path.join(fixture.home, '.local', 'share', 'opencode')] }), /Unknown conversation/);
  // The second-stage sources honour it too (index.cjs excludes <userData> and ~/.code-desktop).
  const stores = ['.local/share/mimocode', '.minimax', '.zcode', '.gemini', '.qwen', '.kimi'].map(dir => path.join(fixture.home, ...dir.split('/')));
  clearCache();
  const left = await listSessions({ ...base, exclude: stores });
  assert.deepEqual(left.filter(session => ['mimo', 'minimax', 'zcode', 'gemini', 'qwen', 'kimi'].includes(session.source)), []);
  assert.ok(left.some(session => session.source === 'codex'), 'everything else is still listed');
  clearCache();
});

test('listSessions: per-file summaries are cached by mtime+size', async () => {
  clearCache();
  const file = path.join(fixture.home, '.claude', 'projects', '-work-other', `${IDS.claudeAlt}.jsonl`);
  const original = fs.readFileSync(file, 'utf8'), when = new Date(Date.UTC(2026, 9, 1, 12, 0, 0));
  fs.utimesSync(file, when, when); // a whole-second mtime survives being set again exactly
  const first = async () => (await listSessions({ ...base, sources: ['claude-code'] })).find(session => session.sourceId === IDS.claudeAlt).firstPrompt;
  assert.equal(await first(), 'Other profile prompt');
  fs.writeFileSync(file, original.replace('Other profile prompt', 'Other profile prompX'));
  fs.utimesSync(file, when, when);
  assert.equal(await first(), 'Other profile prompt', 'same mtime and size: the cached summary');
  fs.utimesSync(file, when, new Date(when.getTime() + 5000));
  assert.equal(await first(), 'Other profile prompX', 'a newer mtime: read again');
  fs.writeFileSync(file, original);
});

test('listSessions: a failing source becomes a warning; the others still list', async () => {
  const broken = buildHome();
  try {
    fs.writeFileSync(path.join(broken.home, '.codex', 'state_5.sqlite'), 'this is not sqlite');
    fs.writeFileSync(path.join(broken.home, '.local', 'share', 'opencode', 'opencode.db'), 'nor this');
    const sessions = await listSessions({ home: broken.home, env: broken.env });
    assert.ok(sessions.some(session => session.source === 'claude-code'));
    assert.ok(sessions.filter(session => session.source === 'codex').length >= 3, 'codex falls back to scanning rollouts');
    assert.ok(!sessions.some(session => session.source === 'opencode'));
    assert.ok(sessions.warnings.some(warning => warning.source === 'opencode'));
  } finally { broken.cleanup(); }
});

test('readSession: by key, with or without a prior listing; unknown keys reject', async () => {
  clearCache();
  for (const key of [`codex:${IDS.codexUi}`, `claude-code:${IDS.claude}`, `dsh:${IDS.dsh}`, `grok:${IDS.grok}`, `gemini:${IDS.gemini}`, 'opencode:ses_v2', `kimi:${IDS.kimi}`, `qwen:${IDS.qwen}`, `copilot:${IDS.copilot}`]) {
    const session = await readSession(key, base);
    assert.equal(session.key, key);
    assert.ok(session.items.length > 0, key);
    assert.ok(session.items.some(item => item.kind === 'user'), key);
  }
  const listed = await listSessions(base);
  const cursorKey = listed.find(session => session.source === 'cursor').key;
  assert.equal((await readSession(cursorKey, base)).fidelity, 'partial');
  await assert.rejects(readSession('nope:1', base), /Unknown conversation/);
  await assert.rejects(readSession('codex:does-not-exist', base), /not found/);
});
