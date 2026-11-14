import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import pages from '../electron/settings-pages.cjs';
const { mcpDefinitions, storageReport, storageCoreRoot, sessionSegment, editConfigTarget, recordSettingsFailure } = pages;

test('Developer configuration includes actual transport facts, never header or environment credentials', () => {
  const config = { mcp_servers: { local: { command: 'node', args: ['server.js', 42], env: { TOKEN: 'private-value' }, env_vars: ['TOKEN','LANG'], bearer_token: 'secret' }, remote: { url: 'https://example.test/mcp', http_headers: { Authorization: 'private-header' } }, invalid: null } };
  const result = mcpDefinitions(config);
  assert.deepEqual(result, [
    { name: 'local', command: 'node', args: ['server.js'], environmentNames: ['TOKEN', 'LANG'] },
    { name: 'remote', url: 'https://example.test/mcp', args: [], environmentNames: [] },
  ]);
  assert.equal(JSON.stringify(result).includes('private-'), false);
  assert.deepEqual(mcpDefinitions({}), []);
});

test('Edit config opens the core-reported profile patch, else config.toml in the core home', () => {
  assert.equal(editConfigTarget({ codexHome: '/h', configPath: '/p/cordis.patch.yml' }), '/p/cordis.patch.yml');
  assert.equal(editConfigTarget({ codexHome: '/h', configPath: null }), path.join('/h', 'config.toml'));
  assert.equal(editConfigTarget({ codexHome: '/h' }), path.join('/h', 'config.toml'));
  assert.throws(() => editConfigTarget({}), /configuration location is unavailable/);
  assert.throws(() => editConfigTarget(undefined), /configuration location is unavailable/);
});

test('settings reads: a method the core lacks is unsupported, never a page error', () => {
  const result = { errors: {} };
  recordSettingsFailure(result, 'policy', Object.assign(new Error('config/read is not supported by the DeepSeek core yet.'), { code: -32601 }));
  recordSettingsFailure(result, 'servers', Object.assign(new Error('MCP listing timed out'), { code: -32000 }));
  assert.deepEqual(result, { errors: { servers: 'MCP listing timed out' }, policyUnsupported: true });
});

async function fixture(t) {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'code-storage-'));
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  return root;
}
const write = async (file, text) => { await fs.mkdir(path.dirname(file), { recursive: true }); await fs.writeFile(file, text); };
const area = (report, id) => report.areas.find(item => item.id === id);
const kinds = item => Object.fromEntries(item.kinds.map(kind => [kind.id, kind.bytes]));

// Fidelity F14: c71860c77-B72Ova_w ht/mt over index.chunk-ChZ67Jhw.js pfi/hfi — Code sessions and worktrees (own
// conversation history + worktrees, other core-home data as an outside kind), Runtime (the core) and App caches and logs.
test('Storage reports the original three areas; the other core history is shown but not counted', async t => {
  const root = await fixture(t), dsh = path.join(root, 'dsh'), core = path.join(root, 'core'), userData = path.join(root, 'profile');
  await write(path.join(dsh, 'sessions', '-w-', 'session-T1'), '12345');
  await write(path.join(dsh, 'sessions', '-w-', 'session-X'), '1234567');
  await write(path.join(dsh, 'dsh-runtimes', 'r'), '12345678901');
  await write(path.join(core, 'node_modules', 'm'), '1234567890123');
  await fs.mkdir(userData);
  const report = await storageReport({ userData, dshHome: dsh, coreRoot: core, threadIds: ['T1'], now: () => 42 });
  assert.deepEqual(report.areas.map(item => [item.id, item.label, item.bytes]), [
    ['code', 'Code sessions and worktrees', 5], ['runtime', 'Runtime', 13], ['app', 'App caches and logs', 0]]);
  assert.deepEqual(area(report, 'code').kinds.map(kind => [kind.label, kind.bytes, !!kind.outside]), [
    ['Conversation history', 5, false], ['Worktrees in use or with changes', 0, false], ['Other DeepSeek Harness history', 18, true]]);
  assert.equal(report.bytes, 18, 'the 18 B outside kind is excluded from the total');
  assert.equal(report.computedAt, 42); assert.equal(report.incomplete, false);
  assert.equal(area(report, 'code').sessionCount, 1); assert.equal(area(report, 'code').worktreeCount, 0);
  assert.deepEqual([area(report, 'runtime').name, area(report, 'runtime').versionCount], ['DeepSeek Harness', 1]);
  assert.equal(JSON.stringify(report).includes(root), false, 'no paths reach the renderer');
});

test('Storage matches real dsh session directories, the bridge records, Codex rollouts, worktrees and app kinds', async t => {
  const root = await fixture(t), dsh = path.join(root, 'dsh'), userData = path.join(root, 'profile'), logs = path.join(root, 'logs');
  const id = '0bcf06d8-2b01-4cf6-bdcf-3ebefe3f94c1', archived = 'archived~id', foreign = '1095ef1c-1df0-4c71-ad5e-21f72885873e';
  assert.equal(sessionSegment(archived), 'archived~007Eid'); assert.equal(sessionSegment('..'), '~002E~002E'); assert.equal(sessionSegment(id), id);
  await write(path.join(dsh, 'sessions', '--Users-me-project--', id, 'session.v4.jsonl.zstd'), '1234');
  await write(path.join(dsh, 'sessions', '--Users-me-project--', sessionSegment(archived), 'session.v4.jsonl.zstd'), '12');
  await write(path.join(dsh, 'sessions', '--Users-me-project--', foreign, 'session.v4.jsonl.zstd'), '123456');
  await write(path.join(dsh, 'code-desktop', 'threads.json'), '123');
  await write(path.join(dsh, 'profiles', 'p.yml'), '1');
  const worktree = path.join(root, 'repo', '.code', 'worktrees', 'repo-1'), missing = path.join(root, 'repo', '.code', 'worktrees', 'gone');
  await write(path.join(worktree, 'src', 'a.js'), '1234567');
  await write(path.join(userData, 'Cache', 'Cache_Data', 'x'), '12');
  await write(path.join(userData, 'DawnWebGPUCache', 'y'), '1');
  await write(path.join(userData, 'Service Worker', 'z'), '1');
  await write(path.join(userData, 'preferences.json'), '1234');
  await write(path.join(userData, 'Crashpad', 'dump'), '12');
  await write(path.join(logs, 'main.log'), '123');
  const report = await storageReport({ userData, dshHome: dsh, coreName: 'DeepSeek Harness', threadIds: [id, archived, id], worktreeDirs: [worktree, missing],
    logs: [logs, path.join(userData, 'Crashpad')] });
  assert.deepEqual(kinds(area(report, 'code')), { history: 4 + 2 + 3, worktrees: 7, otherHistory: 6 + 1 });
  assert.deepEqual([area(report, 'code').sessionCount, area(report, 'code').worktreeCount, area(report, 'code').bytes], [2, 1, 16]);
  assert.deepEqual(kinds(area(report, 'app')), { web: 4, logs: 5, other: 4 }, 'crash dumps inside userData count once, as logs');
  assert.deepEqual([area(report, 'runtime').bytes, area(report, 'runtime').versionCount], [0, 0]);
  assert.equal(report.incomplete, false, 'a missing worktree or core is empty, not a lower bound');
  // A Codex home keeps rollouts as sessions/YYYY/MM/DD/rollout-<time>-<id>.jsonl.
  const codex = path.join(root, 'codex');
  await write(path.join(codex, 'sessions', '2026', '09', '20', `rollout-2026-09-20T10-00-00-${id}.jsonl`), '12345');
  await write(path.join(codex, 'sessions', '2026', '09', '20', `rollout-2026-09-20T11-00-00-${foreign}.jsonl`), '12');
  await write(path.join(codex, 'config.toml'), '1');
  const rollout = await storageReport({ userData, dshHome: codex, coreName: 'Codex', threadIds: [id] });
  assert.deepEqual(kinds(area(rollout, 'code')), { history: 5, worktrees: 0, otherHistory: 3 });
  assert.equal(area(rollout, 'code').kinds.at(-1).label, 'Other Codex history');
});

test('Storage nested roots count every regular file once and never follow external symlinks', async t => {
  const root = await fixture(t), app = path.join(root, 'profile'), home = path.join(app, 'codex-home');
  await write(path.join(home, 'sessions', '-w-', 'session-T'), '12345');
  await write(path.join(app, 'prefs.json'), '123');
  await fs.writeFile(path.join(root, 'outside'), 'do-not-count');
  await fs.symlink(path.join(root, 'outside'), path.join(app, 'symlink'));
  await fs.symlink(path.join(root, 'outside'), path.join(home, 'symlink'));
  const report = await storageReport({ userData: app, dshHome: home, threadIds: ['T'] });
  assert.equal(report.bytes, 8); assert.equal(report.incomplete, false);
  assert.deepEqual([kinds(area(report, 'code')), kinds(area(report, 'app'))], [{ history: 5, worktrees: 0, otherHistory: 0 }, { web: 0, logs: 0, other: 3 }]);
  // The reverse nesting (core home around userData) and aliases of one root are also counted once.
  const reverse = await storageReport({ userData: app, dshHome: root, threadIds: ['T'] });
  // Here the profile (with its nested folder) is ordinary app data inside the core home, so it is counted under app only.
  assert.equal(kinds(area(reverse, 'app')).other, 3 + 5); assert.equal(kinds(area(reverse, 'code')).otherHistory, 12); assert.equal(kinds(area(reverse, 'code')).history, 0);
  const alias = path.join(root, 'alias'); await fs.symlink(app, alias);
  const same = await storageReport({ userData: app, dshHome: alias, threadIds: [] });
  assert.equal(same.bytes, 0, 'userData is the same directory as the core home, so it is measured once (as the core home)');
  assert.equal(kinds(area(same, 'code')).otherHistory, 5 + 3);
});

test('Storage reports partial or limited scans as a lower bound and hides Code sessions without a core home', async t => {
  const root = await fixture(t); await fs.writeFile(path.join(root, 'file'), '123');
  const capped = await storageReport({ userData: root, limit: 0 });
  assert.equal(capped.bytes, 0); assert.equal(capped.incomplete, true);
  const plain = await storageReport({ userData: root });
  assert.deepEqual(plain.areas.map(item => item.id), ['runtime', 'app']); assert.equal(plain.bytes, 3); assert.equal(plain.incomplete, false);
  const io = { ...fs, readdir: async () => { const error = new Error('denied'); error.code = 'EACCES'; throw error; } };
  assert.equal((await storageReport({ userData: root, io })).incomplete, true);
});

test('Runtime measures the core codex.cjs resolveCore runs: the DeepSeek Harness package, else the executable', async t => {
  assert.equal(storageCoreRoot({ kind: 'deepseek', command: '/usr/bin/node', prefix: ['/x/harness/bin/codex-app-server.mjs'] }), path.resolve('/x/harness'));
  assert.equal(storageCoreRoot({ kind: 'codex', command: '/opt/homebrew/bin/codex', prefix: [] }), '/opt/homebrew/bin/codex');
  assert.equal(storageCoreRoot({ kind: 'codex', command: 'codex', prefix: [] }), null);
  const root = await fixture(t), binary = path.join(root, 'codex'); await fs.writeFile(binary, '1234567');
  const report = await storageReport({ userData: path.join(root, 'none'), coreRoot: binary, coreName: 'Codex' });
  assert.deepEqual(report.areas.find(item => item.id === 'runtime').kinds, [{ id: 'core', label: 'Codex', bytes: 7 }]);
  assert.equal(report.areas.find(item => item.id === 'runtime').versionCount, 1);
});

// Each core says where it keeps a session (descriptor sessionStore): Qwen and Gemini chats count as this app's history;
// a core with one session database reports its history unmeasured and the database as an outside kind.
test('Storage follows the running core’s session layout: Qwen and Gemini chat files, database cores unmeasured', async t => {
  const { coreById } = await import('../electron/core-registry.mjs');
  const root = await fixture(t), userData = path.join(root, 'profile'), id = '0bcf06d8-2b01-4cf6-bdcf-3ebefe3f94c1', foreign = '1095ef1c-1df0-4c71-ad5e-21f72885873e';
  await fs.mkdir(userData);
  const qwen = path.join(root, 'qwen');
  await write(path.join(qwen, 'projects', '-Users-me-project', 'chats', `${id}.jsonl`), '12345');
  await write(path.join(qwen, 'projects', '-Users-me-project', 'chats', `${foreign}.jsonl`), '12');
  await write(path.join(qwen, 'settings.json'), '1');
  const q = await storageReport({ userData, codexHome: qwen, coreName: 'Qwen Code', threadIds: [id], sessionStore: coreById('qwen').sessionStore });
  assert.deepEqual(kinds(area(q, 'code')), { history: 5, worktrees: 0, otherHistory: 3 });
  assert.equal(area(q, 'code').bytes, 5); assert.equal(area(q, 'code').historyUnmeasured, undefined);
  const gemini = path.join(root, 'gemini');
  await write(path.join(gemini, 'tmp', 'project', 'chats', `session-2026-09-20T10-00-${id.slice(0, 8)}.jsonl`), '1234');
  await write(path.join(gemini, 'tmp', 'project', 'chats', id, 'sub.jsonl'), '12');
  await write(path.join(gemini, 'tmp', 'project', id, 'plans', 'plan.md'), '1');
  await write(path.join(gemini, 'tmp', 'project', 'chats', `session-2026-09-20T11-00-${foreign.slice(0, 8)}.jsonl`), '123456');
  await write(path.join(gemini, 'settings.json'), '1');
  const g = await storageReport({ userData, codexHome: gemini, coreName: 'Gemini CLI', threadIds: [id], sessionStore: coreById('gemini').sessionStore });
  assert.deepEqual(kinds(area(g, 'code')), { history: 7, worktrees: 0, otherHistory: 7 });
  const kimi = path.join(root, 'kimi');
  await write(path.join(kimi, 'sessions', 'wd-hash', id, 'agents', 'main', 'wire.jsonl'), '123');
  await write(path.join(kimi, 'sessions', 'wd-hash', foreign, 'agents', 'main', 'wire.jsonl'), '1');
  const k = await storageReport({ userData, codexHome: kimi, coreName: 'Kimi Code', threadIds: [id], sessionStore: coreById('kimi').sessionStore });
  assert.deepEqual(kinds(area(k, 'code')), { history: 3, worktrees: 0, otherHistory: 1 });
  // ZCode: every session in ~/.zcode/cli/db (below its home); OpenCode: its data folder outside the bridge state.
  const zcode = path.join(root, 'zcode');
  await write(path.join(zcode, 'cli', 'db', 'db.sqlite'), '1234567890');
  await write(path.join(zcode, 'cli', 'config.json'), '12');
  const z = await storageReport({ userData, codexHome: zcode, coreName: 'ZCode', threadIds: [id], sessionStore: coreById('zcode').sessionStore });
  assert.deepEqual(kinds(area(z, 'code')), { history: 0, worktrees: 0, sharedHistory: 10, otherHistory: 2 });
  assert.equal(area(z, 'code').historyUnmeasured, true); assert.equal(area(z, 'code').bytes, 0);
  const shared = area(z, 'code').kinds.find((kind) => kind.id === 'sharedHistory');
  assert.deepEqual([shared.outside, shared.shared, shared.template, shared.values], [true, true, 'All {core} history, including these sessions', { core: 'ZCode' }]);
  assert.equal(area(z, 'code').kinds[0].unmeasured, true);
  const home = path.join(root, 'home'), state = path.join(root, 'opencode-state');
  await write(path.join(home, '.local', 'share', 'opencode', 'opencode.db'), '123456');
  await write(path.join(state, 'overlay.json'), '1');
  const o = await storageReport({ userData, codexHome: state, coreName: 'OpenCode', threadIds: [id], sessionStore: coreById('opencode').sessionStore, userHome: home });
  assert.deepEqual(kinds(area(o, 'code')), { history: 0, worktrees: 0, sharedHistory: 6, otherHistory: 1 });
  assert.equal(JSON.stringify([q, g, z, o]).includes(root), false, 'no paths reach the renderer');
});

test('sessionStore from a descriptor or an Extension Pack is checked before it is used', () => {
  const { cleanSessionStore } = pages;
  assert.deepEqual(cleanSessionStore({ files: ['projects/*/chats/<id>.jsonl', '../escape/<id>', '/abs/<id>', '~/x', 7] }), { files: ['projects/*/chats/<id>.jsonl'] });
  assert.deepEqual(cleanSessionStore({ database: 'cli/db' }), { database: 'cli/db' });
  assert.deepEqual(cleanSessionStore({ database: '~/.local/share/opencode' }), { database: '~/.local/share/opencode' });
  for (const bad of [{ database: '/etc' }, { database: '~/../x' }, { database: 'a/../../b' }, { files: [] }, 'sessions', null]) assert.equal(cleanSessionStore(bad), null, JSON.stringify(bad));
});
