import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import path from 'node:path';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createServer } from 'vite';
import react from '@vitejs/plugin-react';
import { createCustomizeStore } from '../src/customize-store.mjs';
import { availablePluginRows, customizeCore, nativePluginActions, pluginChangeOutcome, pluginInstallStatus, pluginRows, appendPluginLog, PLUGIN_LOG_LIMIT } from '../src/customize-model.mjs';
const require = createRequire(import.meta.url);
const { createCustomizeOperations } = require('../electron/customize-operations.cjs');

// Customize › Plugins management on the DeepSeek core (harness plugins.js over dsh-plugin-manager).
let server, M;
before(async () => {
  server = await createServer({ configFile: false, root: path.resolve(import.meta.dirname, '..'), plugins: [react()],
    server: { middlewareMode: true, hmr: false, watch: null }, appType: 'custom', logLevel: 'error' });
  M = await server.ssrLoadModule('/src/source-customize.jsx');
});
after(() => server?.close());

const installed = { marketplaces: [{ name: 'deepseek-harness', path: '/profile', interface: { displayName: 'DeepSeek Harness profile' }, plugins: [
  { id: '@code-desktop/dsh-code-desktop-app', name: '@code-desktop/dsh-code-desktop-app', version: '0.1.0', installed: true, enabled: true, source: { type: 'local' }, interface: { displayName: 'OpenClaude Desktop' }, codeDesktop: { removable: false, optional: false, readOnlyReason: 'management-required', loadError: null } },
  { id: 'dsh-plugin-x', name: 'dsh-plugin-x', version: '1.2.3', installed: true, enabled: false, source: { type: 'local' }, interface: { displayName: 'Plugin X' }, codeDesktop: { removable: true, optional: false, readOnlyReason: null, loadError: 'Cannot find module' } },
] }] };

test('plugin rows carry what management may do; only a core that says so manages plugins', () => {
  const rows = pluginRows(installed);
  const core = rows.find((row) => row.id === '@code-desktop/dsh-code-desktop-app'), x = rows.find((row) => row.id === 'dsh-plugin-x');
  assert.deepEqual([core.removable, core.manageable, core.loadError], [false, false, '']);
  assert.deepEqual([x.removable, x.manageable, x.loadError, x.version, x.enabled], [true, true, 'Cannot find module', '1.2.3', false]);
  assert.equal(customizeCore({ engine: 'deepseek', capabilities: { pluginManage: true } }).pluginManage, true);
  assert.equal(customizeCore({ engine: 'deepseek', capabilities: {} }).pluginManage, false);
  assert.equal(customizeCore(null).pluginManage, false, 'Codex has no codeDesktop/plugin/* manager');
  assert.equal(customizeCore(null).nativePlugins, true, 'Codex manages plugins through the protocol itself');
});

test('change results become page outcomes', () => {
  assert.deepEqual(pluginChangeOutcome({ changed: true, application: 'restart-required', stage: 'install', target: 'x', bundle: 'dsh-plugin-x' }), { ok: true, restartRequired: true, bundle: 'dsh-plugin-x' });
  assert.equal(pluginChangeOutcome({ changed: true, application: 'applied', stage: 'enable', target: 'x' }).restartRequired, false);
  const blocked = pluginChangeOutcome({ changed: false, application: 'failed', stage: 'install', target: 'x', pendingBuilds: ['esbuild'], packageResult: { kind: 'build-blocked', output: 'ERR' } });
  assert.deepEqual([blocked.ok, blocked.message, blocked.pendingBuilds, blocked.output], [false, 'The package needs to run build scripts.', ['esbuild'], 'ERR']);
  assert.match(pluginChangeOutcome({ changed: false, application: 'failed', stage: 'install', target: 'x', error: { code: 'incompatible-version', incompatible: [{ name: 'p', version: '2.0.0' }] } }).message, /does not support .*\(p@2\.0\.0\)/);
  assert.equal(pluginChangeOutcome({ changed: false, application: 'failed', stage: 'remove', target: 'x', error: { code: 'not-removable' } }).message, 'This plugin is part of OpenClaude Desktop and cannot be removed.');
  assert.deepEqual(pluginChangeOutcome({ changed: false, application: 'cancelled', stage: 'install', target: 'x' }), { ok: false, cancelled: true, message: 'Installation cancelled.' });
  assert.equal(pluginInstallStatus({ phase: 'installing', attempt: { registry: 'https://registry.npmjs.org/', index: 1, total: 2 } }), 'Installing from https://registry.npmjs.org/ (2/2)…');
  assert.equal(pluginInstallStatus({ phase: 'applying' }), 'Applying…');
  assert.equal(appendPluginLog('a'.repeat(PLUGIN_LOG_LIMIT), 'b').length, PLUGIN_LOG_LIMIT);
});

test('the store runs one install, follows its progress and output, and asks for a restart', async () => {
  const calls = [];
  let finish;
  const call = (kind, payload) => {
    calls.push(payload);
    if (payload.operation === 'plugins') return Promise.resolve(installed);
    if (payload.operation === 'plugin-install') return new Promise((resolve) => { finish = resolve; });
    if (payload.operation === 'plugin-cancel-install') return Promise.resolve({ status: 'cancelled' });
    if (payload.operation === 'plugin-set-enabled') return Promise.resolve({ changed: true, application: 'restart-required', stage: 'enable', target: payload.pluginName });
    return Promise.resolve({});
  };
  const store = createCustomizeStore({ call, setTimeout: () => 0, clearTimeout: () => {}, newId: () => 'req-1' });
  await store.loadPlugins({ cwd: '/repo' });
  const pending = store.installPlugin('dsh-plugin-y');
  assert.deepEqual(calls.at(-1), { operation: 'plugin-install', spec: 'dsh-plugin-y', requestId: 'req-1' });
  await assert.rejects(store.installPlugin('other'), /Another plugin/);
  store.observe({ method: 'codeDesktop/plugin/installProgress', params: { requestId: 'req-1', phase: 'installing', attempt: { registry: null, index: 0, total: 1 } } });
  store.observe({ method: 'codeDesktop/plugin/installLog', params: { requestId: 'req-1', stream: 'stdout', text: 'Packages: +1\n' } });
  store.observe({ method: 'codeDesktop/plugin/installLog', params: { requestId: 'someone-else', stream: 'stdout', text: 'ignored' } });
  assert.equal(store.getSnapshot().pluginOps.install.log, 'Packages: +1\n');
  assert.equal(store.getSnapshot().pluginOps.install.attempt.total, 1);
  finish({ changed: true, application: 'restart-required', stage: 'install', target: 'dsh-plugin-y', bundle: 'dsh-plugin-y' });
  const outcome = await pending;
  assert.equal(outcome.ok, true);
  assert.equal(store.getSnapshot().pluginOps.install.status, 'done');
  // W14-code r5-shared-01: the page keeps no restart state; main restarts the idle core before the next new session
  // (electron/core-restart.cjs, tests/core-restart.test.mjs), as WV readyInNewSession "Start a new session to use it." says.
  assert.equal(outcome.restartRequired, true);
  assert.equal(Object.hasOwn(store.getSnapshot().pluginOps, 'restartRequired'), false);
  assert.ok(calls.filter((payload) => payload.operation === 'plugins').length >= 2, 'the list reloads after a change');
  store.observe({ kind: 'connection', connected: true });
  assert.equal(store.getSnapshot().pluginOps.install.status, 'done');
  store.clearPluginInstall();
  assert.equal(store.getSnapshot().pluginOps.install, null);
  assert.equal((await store.setPluginEnabled('dsh-plugin-x', true)).ok, true);
  assert.deepEqual(calls.findLast((payload) => payload.operation === 'plugin-set-enabled'), { operation: 'plugin-set-enabled', pluginName: 'dsh-plugin-x', enabled: true });
  // A failed install keeps its outcome for the form; build approval retries with the names.
  const store2 = createCustomizeStore({ call: (kind, payload) => { calls.push(payload); return Promise.resolve(payload.operation === 'plugin-install' ? { changed: false, application: 'failed', stage: 'install', target: 'z', pendingBuilds: ['esbuild'], packageResult: { kind: 'build-blocked' } } : installed); }, newId: () => 'req-2' });
  assert.deepEqual((await store2.installPlugin('z')).pendingBuilds, ['esbuild']);
  assert.equal(store2.getSnapshot().pluginOps.install.status, 'failed');
  await store2.installPlugin('z', { approvedBuilds: ['esbuild'] });
  assert.deepEqual(calls.at(-1), { operation: 'plugin-install', spec: 'z', requestId: 'req-2', approvedBuilds: ['esbuild'] });
});

test('main-process operations validate and need a managing core', async () => {
  const requests = [];
  let capabilities = { pluginManage: true };
  const client = { start: async () => {}, get serverInfo() { return { capabilities }; }, request: async (method, params, timeout) => { requests.push({ method, params, timeout }); return { ok: true }; } };
  const ops = createCustomizeOperations({ getClient: () => client, getConfig: () => ({ threadIds: [] }), knownCwd: (cwd) => cwd });
  await ops.run({ operation: 'plugin-install', spec: ' dsh-plugin-y ', requestId: 'r1', approvedBuilds: ['esbuild'] });
  assert.deepEqual(requests.at(-1).params, { spec: 'dsh-plugin-y', requestId: 'r1', approvedBuilds: ['esbuild'] });
  assert.equal(requests.at(-1).method, 'codeDesktop/plugin/install');
  assert.ok(requests.at(-1).timeout >= 10 * 60 * 1000, 'an install may take minutes');
  await assert.rejects(ops.run({ operation: 'plugin-install', spec: '--registry=x', requestId: 'r1' }), /package name/);
  await assert.rejects(ops.run({ operation: 'plugin-catalog' }), /not supported/, 'a codeDesktop/plugin/* core never gets the native path');
  await assert.rejects(ops.run({ operation: 'plugin-install', spec: 'p', requestId: '../x' }), /Invalid install request/);
  await assert.rejects(ops.run({ operation: 'plugin-set-enabled', pluginName: 'p', enabled: 'yes' }), /Invalid plugin state/);
  await ops.run({ operation: 'plugin-remove', pluginName: 'dsh-plugin-x' });
  assert.deepEqual(requests.at(-1), { method: 'codeDesktop/plugin/remove', params: { pluginName: 'dsh-plugin-x' }, timeout: 5 * 60 * 1000 });
  // The install source picker: a registry URL passes through, anything else is refused.
  await ops.run({ operation: 'plugin-inspect', spec: 'p', registry: 'https://registry.npmmirror.com/' });
  assert.deepEqual(requests.at(-1).params, { spec: 'p', registry: 'https://registry.npmmirror.com/' });
  await ops.run({ operation: 'plugin-install', spec: 'p', requestId: 'r2', registry: 'https://registry.npmjs.org/' });
  assert.deepEqual(requests.at(-1).params, { spec: 'p', requestId: 'r2', registry: 'https://registry.npmjs.org/' });
  await ops.run({ operation: 'plugin-inspect', spec: 'p', registry: '' });
  assert.deepEqual(requests.at(-1).params, { spec: 'p' }, 'Automatic sends no registry');
  await assert.rejects(ops.run({ operation: 'plugin-inspect', spec: 'p', registry: 'file:///etc' }), /Invalid registry/);
  await ops.run({ operation: 'plugin-registries' });
  assert.equal(requests.at(-1).method, 'codeDesktop/plugin/registries');
  capabilities = {};
  await assert.rejects(ops.run({ operation: 'plugin-inspect', spec: 'p' }), /not supported/);
});

test('the add form, restart notice and detail controls render their states', () => {
  const store = { inspectPlugin() {}, installPlugin() {}, cancelPluginInstall() {}, clearPluginInstall() {}, setPluginEnabled() {}, removePlugin() {} };
  const idle = renderToStaticMarkup(React.createElement(M.AddPluginForm, { store, install: null, onClose() {} }));
  assert.match(idle, /aria-label="Add plugin"/);
  assert.match(idle, /aria-label="Plugin package"/);
  assert.match(idle, />Install</);
  assert.doesNotMatch(idle, /Cancel install/);
  const running = renderToStaticMarkup(React.createElement(M.AddPluginForm, { store, install: { requestId: 'r', spec: 'p', status: 'running', phase: 'installing', attempt: { registry: 'https://registry.npmjs.org/', index: 0, total: 1 }, log: 'Progress: resolved 1', outcome: null }, onClose() {} }));
  assert.match(running, /Installing from https:\/\/registry\.npmjs\.org\/…/);
  assert.match(running, /Cancel install/);
  assert.match(running, /data-plugin-install="running"/);
  const blocked = renderToStaticMarkup(React.createElement(M.AddPluginForm, { store, install: { requestId: 'r', spec: 'p', status: 'failed', log: '', outcome: { ok: false, message: 'The package needs to run build scripts.', pendingBuilds: ['esbuild'] } }, onClose() {} }));
  // W14-code r2-shared-03: the result itself is a toast (c76f00e40/cdbe53168), so no inline alert; the build-script box stays.
  assert.doesNotMatch(blocked, /role="alert">The package needs to run build scripts\./);
  assert.match(blocked, /<strong>esbuild<\/strong>/);
  assert.match(blocked, /Allow these scripts and retry/);
  const done = renderToStaticMarkup(React.createElement(M.AddPluginForm, { store, install: { requestId: 'r', spec: 'p', status: 'done', log: '', outcome: { ok: true, restartRequired: true, bundle: 'dsh-plugin-y' } }, onClose() {} }));
  assert.doesNotMatch(done, /Installed dsh-plugin-y|is installed and ready/, 'the install result is a toast, not a paragraph');
  assert.match(done, />Close</);
  // W14-code r4-shared-06 (E95): 3.6556.2's Customize has no restart banner; the install toast says
  // "{pluginName} is installed. Start a new session to use it." (shared-104 WV readyInNewSession) instead.
  assert.equal(M.PluginRestartBanner, undefined);
  const [, x] = pluginRows(installed).sort((a, b) => (a.removable ? 1 : -1));
  const detail = renderToStaticMarkup(React.createElement(M.PluginDetail, { plugin: x, detail: { description: 'X' }, error: '', skills: [], view: null, onView() {}, onBack() {}, onSkill() {}, copy: customizeCore({ engine: 'deepseek', capabilities: { pluginManage: true } }), manage: React.createElement('span', { 'data-manage': '' }) }));
  assert.match(detail, /data-manage=""/);
  assert.match(detail, /This plugin could not load: Cannot find module/);
});

// Codex 0.155.1 plugin/list (shape from a real app-server run with an isolated CODEX_HOME).
const codexList = { marketplaces: [{ name: 'demo-market', path: '/m/.agents/plugins/marketplace.json', interface: { displayName: 'Demo Market' }, plugins: [
  { id: 'hello@demo-market', name: 'hello', version: null, localVersion: '0.1.0', installed: false, enabled: false, source: { type: 'local', path: '/m/plugins/hello' }, availability: 'AVAILABLE', interface: { displayName: null, shortDescription: 'Says hello' } },
  { id: 'done@demo-market', name: 'done', localVersion: '1.0.0', installed: true, enabled: true, source: { type: 'local' }, availability: 'AVAILABLE', interface: {} },
] }, { name: 'remote', path: null, plugins: [{ id: 'r@remote', name: 'r', installed: false, availability: 'AVAILABLE' }] }], marketplaceLoadErrors: [] };

// 0.155.1 PluginInstallPolicy: NOT_AVAILABLE can't be installed, INSTALLED_BY_DEFAULT is turned off rather than removed.
test('native core (Codex): install policy hides uninstallable rows and Remove for default plugins', async () => {
  const listed = { marketplaces: [{ name: 'm', path: '/m/marketplace.json', plugins: [
    { id: 'ok@m', name: 'ok', installed: false, availability: 'AVAILABLE', installPolicy: 'AVAILABLE' },
    { id: 'blocked@m', name: 'blocked', installed: false, availability: 'AVAILABLE', installPolicy: 'NOT_AVAILABLE' },
    { id: 'default@m', name: 'default', installed: true, enabled: true, installPolicy: 'INSTALLED_BY_DEFAULT', source: { type: 'local' } },
    { id: 'mine@m', name: 'mine', installed: true, enabled: true, installPolicy: 'AVAILABLE', source: { type: 'local' } },
  ] }] };
  assert.deepEqual(availablePluginRows(listed).map((row) => row.id), ['ok@m']);
  const rows = pluginRows(listed);
  assert.deepEqual(nativePluginActions(rows.find((row) => row.id === 'default@m')), { canToggle: true, canRemove: false });
  assert.deepEqual(nativePluginActions(rows.find((row) => row.id === 'mine@m')), { canToggle: true, canRemove: true });
  // The detail page's native controls follow it: a switch, and Remove only for a plugin Codex won't reinstall.
  const store = { setNativePluginEnabled() {}, uninstallPlugin() {} };
  const controls = (row) => renderToStaticMarkup(React.createElement(M.PluginManageControls, { plugin: row, store, actions: { ...nativePluginActions(row), toggle() {}, remove() {} } }));
  // c26e90ba3 header actions: Remove lives in the ⋯ "More options for {name}" menu, drawn only when it has an item.
  assert.doesNotMatch(controls(rows.find((row) => row.id === 'default@m')), /More options for default|>Remove</);
  assert.match(controls(rows.find((row) => row.id === 'mine@m')), /aria-label="More options for mine" aria-haspopup="menu"/);
  assert.doesNotMatch(controls(rows.find((row) => row.id === 'mine@m')), /data-variant="secondary"[^>]*>.*?Remove/, 'no inline Remove button in the title row');
});

test('native core (Codex): available rows, validated protocol operations', async () => {
  assert.deepEqual(availablePluginRows(codexList), [{ id: 'hello@demo-market', pluginName: 'hello', name: 'hello', description: 'Says hello', author: '', version: '0.1.0', marketplaceName: 'Demo Market', marketplacePath: '/m/.agents/plugins/marketplace.json' }]);
  assert.equal(pluginRows(codexList)[0].version, '1.0.0', 'a local plugin shows its manifest version');
  const requests = [];
  let serverInfo = { capabilities: {} };
  const client = { start: async () => {}, get serverInfo() { return serverInfo; }, request: async (method, params, timeout) => {
    requests.push({ method, params, timeout });
    if (method === 'plugin/list') return codexList;
    if (method === 'plugin/installed') return { marketplaces: [{ name: 'demo-market', path: '/m/.agents/plugins/marketplace.json', plugins: [codexList.marketplaces[0].plugins[1]] }] };
    return {};
  } };
  const ops = createCustomizeOperations({ getClient: () => client, getConfig: () => ({ threadIds: [] }), knownCwd: (cwd) => cwd });
  // Nothing unlisted is ever sent.
  await assert.rejects(ops.run({ operation: 'plugin-install-native', marketplacePath: '/m/.agents/plugins/marketplace.json', pluginName: 'hello' }), /Unknown plugin/);
  await assert.rejects(ops.run({ operation: 'plugin-uninstall', pluginId: 'done@demo-market' }), /Unknown plugin/);
  await ops.run({ operation: 'plugin-catalog', cwd: '/repo' });
  assert.deepEqual(requests.find((entry) => entry.method === 'plugin/list' && !entry.params.marketplaceKinds), { method: 'plugin/list', params: { cwds: ['/repo'] }, timeout: undefined });
  assert.deepEqual(requests.filter((entry) => entry.params?.marketplaceKinds).map((entry) => entry.params.marketplaceKinds[0]), ['shared-with-me', 'workspace-directory', 'created-by-me-remote'], 'the workspace marketplaces are asked for too');
  await ops.run({ operation: 'plugin-install-native', marketplacePath: '/m/.agents/plugins/marketplace.json', pluginName: 'hello' });
  assert.deepEqual(requests.at(-1).params, { marketplacePath: '/m/.agents/plugins/marketplace.json', pluginName: 'hello' });
  assert.equal(requests.at(-1).method, 'plugin/install');
  await assert.rejects(ops.run({ operation: 'plugin-install-native', marketplacePath: '/elsewhere', pluginName: 'hello' }), /Unknown plugin/);
  await ops.run({ operation: 'plugins' });
  await ops.run({ operation: 'plugin-enable-native', pluginId: 'done@demo-market', enabled: false });
  assert.deepEqual(requests.at(-1).params, { keyPath: 'plugins.done@demo-market', value: { enabled: false }, mergeStrategy: 'upsert' });
  assert.equal(requests.at(-1).method, 'config/value/write');
  await assert.rejects(ops.run({ operation: 'plugin-enable-native', pluginId: 'done@demo-market', enabled: 'no' }), /Invalid plugin state/);
  await ops.run({ operation: 'plugin-uninstall', pluginId: 'done@demo-market' });
  assert.deepEqual(requests.at(-1).params, { pluginId: 'done@demo-market' });
  await assert.rejects(ops.run({ operation: 'plugin-uninstall', pluginId: 'done@demo-market' }), /Unknown plugin/, 'an uninstalled id is forgotten');
  await ops.run({ operation: 'marketplace-add', source: ' owner/repo ' });
  assert.deepEqual(requests.at(-1).params, { source: 'owner/repo' });
  await assert.rejects(ops.run({ operation: 'marketplace-add', source: '--upload-pack=x' }), /Enter a marketplace/);
  // A bridge (or the DeepSeek core) never receives the native methods.
  for (const engine of ['zcode', 'opencode', 'deepseek-harness']) {
    serverInfo = { engine, capabilities: { pluginManage: true } };
    await assert.rejects(ops.run({ operation: 'marketplace-add', source: 'owner/repo' }), /not supported/, engine);
  }
});

test('main process: connector refusals name the running core and its file', async () => {
  const client = (serverInfo) => ({ start: async () => {}, serverInfo, request: async (method) => (method === 'mcpServerStatus/list' ? { data: [{ name: 'gh' }] } : {}) });
  const run = (serverInfo, p) => createCustomizeOperations({ getClient: () => client(serverInfo), getConfig: () => ({ threadIds: [] }), knownCwd: (cwd) => cwd }).run(p);
  await assert.rejects(run({ engine: 'kimi', configPath: '/h/.kimi-code/config.toml', capabilities: { mcpConfigWrite: false } }, { operation: 'mcp-add', name: 'x', command: 'npx' }),
    /^Error: Connector changes are not supported by Kimi Code\. Add the server to \/h\/\.kimi-code\/config\.toml, then Reconnect\.$/);
  const ops = createCustomizeOperations({ getClient: () => client({ engine: 'zcode', configPath: '/h/.zcode/cli/config.json', capabilities: {} }), getConfig: () => ({ threadIds: [] }), knownCwd: (cwd) => cwd });
  await ops.run({ operation: 'mcp' });
  await assert.rejects(ops.run({ operation: 'mcp-add', name: 'gh', command: 'npx' }), /already in \/h\/\.zcode\/cli\/config\.json/);
  // Plugin management refusals name the running program too (a native pack reports no engine: the core it spawned).
  await assert.rejects(run({ engine: 'kimi', capabilities: {} }, { operation: 'plugin-inspect', spec: 'x' }), /^Error: Plugin management is not supported by Kimi Code\.$/);
  await assert.rejects(run({ engine: 'zcode', capabilities: { pluginManage: true } }, { operation: 'plugin-catalog' }), /^Error: Plugin management is not supported by ZCode\.$/);
  const pack = createCustomizeOperations({ getClient: () => ({ ...client({ capabilities: {} }), spawnedCore: 'opencode' }), getConfig: () => ({ threadIds: [] }), knownCwd: (cwd) => cwd });
  await assert.rejects(pack.run({ operation: 'plugin-remove', pluginName: 'x' }), /not supported by OpenCode\./);
  // Main-process copy is translated like the renderer's.
  const i18n = await import('../electron/i18n/index.mjs');
  try {
    i18n.setLocale('zh-CN');
    await assert.rejects(run({ engine: 'kimi', capabilities: {} }, { operation: 'plugin-inspect', spec: 'x' }), /^Error: Kimi Code 不支持插件管理。$/);
    await assert.rejects(run({ engine: 'kimi', configPath: '/h/k.toml', capabilities: { mcpConfigWrite: false } }, { operation: 'mcp-add', name: 'x', command: 'npx' }), /^Error: Kimi Code 不支持更改连接器。请将服务器添加到 \/h\/k\.toml，然后重新连接。$/);
  } finally { i18n.setLocale('en-US'); }
});

test('native core (Codex): the store re-lists after a change; the page offers marketplaces, Available and Remove', async () => {
  const calls = [];
  const call = (kind, payload) => { calls.push(payload.operation); if (payload.operation === 'plugin-catalog') return Promise.resolve(codexList); if (payload.operation === 'marketplace-add') return Promise.resolve({ marketplaceName: 'demo-market', alreadyAdded: false }); if (payload.operation === 'plugin-uninstall') return Promise.reject(new Error('plugin is not installed')); return Promise.resolve({ marketplaces: [] }); };
  const store = createCustomizeStore({ call, setTimeout: () => 0, clearTimeout: () => {} });
  await store.loadPlugins({ cwd: '/r' });
  await store.loadPluginCatalog({ cwd: '/r' });
  assert.deepEqual(store.getSnapshot().catalog.rows.map((row) => row.id), ['hello@demo-market']);
  const added = await store.addMarketplace('owner/repo');
  assert.deepEqual([added.ok, added.result.marketplaceName], [true, 'demo-market']);
  assert.ok(calls.filter((op) => op === 'plugin-catalog').length >= 2 && calls.filter((op) => op === 'plugins').length >= 2, 'both lists reload');
  // shared-78 E1: a removal never shows the raw reason ("plugin is not installed"), only S1.
  assert.deepEqual(await store.uninstallPlugin('x@y'), { ok: false, message: 'Plugin couldn’t be removed. Try again.' });

  const rows = pluginRows({ marketplaces: [{ name: 'demo-market', path: '/m/.agents/plugins/marketplace.json', interface: { displayName: 'Demo Market' }, plugins: [codexList.marketplaces[0].plugins[1]] }] });
  const snapshot = { skills: { skills: [], errors: [], status: 'ready', cwd: '/r' }, plugins: { rows, status: 'ready', cwd: '/r' }, mcp: { rows: [], status: 'ready', cwd: '/r', threadId: null }, pluginOps: { install: null, restartRequired: false },
    catalog: { rows: availablePluginRows(codexList), status: 'ready', cwd: '/r' } };
  const pageStore = { getSnapshot: () => snapshot, subscribe: () => () => {}, loadSkills() {}, loadPlugins() {}, loadMcp() {}, loadPluginCatalog() {} };
  const html = renderToStaticMarkup(React.createElement(M.SourceCustomize, { section: 'customize-plugins', store: pageStore, cwd: '/r', call() { throw Error('SSR'); }, core: { engine: 'codex', capabilities: {} } }));
  // cf0e8a0d3 Ya: the header action is the Add plugin menu (visible "Add"), whose item adds a marketplace.
  assert.match(html, /<div class="cz-actions"><button aria-label="Add plugin" aria-haspopup="menu"[^>]*data-variant="primary"[^>]*>.*?>Add<\/span><\/button><\/div>/);
  assert.doesNotMatch(html, /cz-form/, 'no inline add form in the page body');
  assert.match(html, /data-cz-available=""/);
  assert.match(html, /data-available-plugin="hello@demo-market"/);
  // B24: the installed plugin is a "Your plugins" row (c6a2a31c4 Br) with its ⋮ "More actions for {name}" menu.
  assert.match(html, /data-testid="plugins-tabbed-list-row"[^>]*data-plugin-id="done@demo-market"/);
  assert.match(html, /aria-label="More actions for done" aria-haspopup="menu"/);
  assert.doesNotMatch(html, /Built-in plugins|DeepSeek Harness/);
  const form = renderToStaticMarkup(React.createElement(M.AddMarketplaceForm, { store: pageStore, onClose() {}, copy: customizeCore({ engine: 'codex' }) }));
  assert.match(form, /Add a plugin marketplace to Codex from a git URL, owner\/repo or a local folder\./);
  assert.match(form, /aria-label="Marketplace source"/);
  assert.match(form, /<form class="cz-dialog-form" aria-label="Add marketplace"/);
  assert.match(form, /<div class="sdlg-footer[^"]*">.*?>Cancel<.*?>Add<\/span><\/button><\/div>/);
  const controls = renderToStaticMarkup(React.createElement(M.PluginManageControls, { plugin: rows[0], store: pageStore, copy: customizeCore({ engine: 'codex' }), actions: { canToggle: true, canRemove: true, toggle() {}, remove() {} } }));
  // W14 global fr-cu-01: c24c8737b — "Enable plugin" names the switch; the tooltip says Disable / Enable plugin.
  assert.match(controls, /<label class="inline-flex cursor-interactive"><button[^>]*role="switch" aria-label="Enable plugin" aria-checked="true"/);
  assert.match(controls, /<div class="cz-plugin-manage" data-plugin-manage=""><button aria-label="More options for done" aria-haspopup="menu"[^>]*data-variant="ghost"/, 'the ⋯ menu comes before the switch');
});

test('native core (Codex): workspace sharing rows, validated share operations and the share controls', async () => {
  const mine = { id: 'tool@local', name: 'tool', installed: true, enabled: true, source: { type: 'local', path: '/home/p/tool' },
    shareContext: { remotePluginId: 'rp_1', shareUrl: 'https://chatgpt.com/p/rp_1', discoverability: 'UNLISTED', creatorName: 'Ana' } };
  const listed = { marketplaces: [{ name: 'local', path: '/m/marketplace.json', plugins: [mine] }] };
  const row = pluginRows(listed)[0];
  assert.equal(row.sourcePath, '/home/p/tool');
  assert.deepEqual(row.share, { remotePluginId: 'rp_1', url: 'https://chatgpt.com/p/rp_1', discoverability: 'UNLISTED', creator: 'Ana' });
  assert.equal(pluginRows({ marketplaces: [{ name: 'g', path: '/g', plugins: [{ id: 'g@g', name: 'g', installed: true, source: { type: 'git', url: 'https://x', path: 'sub' } }] }] })[0].sourcePath, null, 'only a local folder can be shared');
  const remote = { marketplaces: [{ name: 'shared-mp', path: null, codeDesktop: { shareKind: 'shared-with-me' }, plugins: [{ id: 's@shared-mp', name: 's', installed: false, availability: 'AVAILABLE', shareContext: { remotePluginId: 'rp_2', creatorName: 'Bo' } }] }] };
  assert.deepEqual(availablePluginRows(remote).map((entry) => [entry.marketplaceName, entry.remoteMarketplaceName, entry.shareKind, entry.sharedBy, entry.marketplacePath]), [['Shared with you', 'shared-mp', 'shared-with-me', 'Bo', null]]);

  const requests = [];
  const client = { start: async () => {}, serverInfo: { capabilities: {} }, request: async (method, params) => {
    requests.push({ method, params });
    if (method === 'plugin/installed' || (method === 'plugin/list' && !params.marketplaceKinds)) return structuredClone(listed);
    if (method === 'plugin/share/save') return { remotePluginId: 'rp_1', shareUrl: 'https://chatgpt.com/p/rp_1' };
    return {};
  } };
  const ops = createCustomizeOperations({ getClient: () => client, getConfig: () => ({ threadIds: [] }), knownCwd: (cwd) => cwd });
  await assert.rejects(ops.run({ operation: 'plugin-share', pluginPath: '/home/p/tool' }), /Unknown plugin/, 'nothing unlisted is shared');
  await ops.run({ operation: 'plugins' });
  await ops.run({ operation: 'plugin-share', pluginPath: '/home/p/tool', discoverability: 'bogus', remotePluginId: 'rp_1' });
  assert.deepEqual(requests.at(-1), { method: 'plugin/share/save', params: { pluginPath: '/home/p/tool', discoverability: 'UNLISTED', remotePluginId: 'rp_1' } });
  await assert.rejects(ops.run({ operation: 'plugin-share', pluginPath: '/etc' }), /Unknown plugin/);
  await assert.rejects(ops.run({ operation: 'plugin-unshare', remotePluginId: 'rp_x' }), /Unknown plugin/);
  await ops.run({ operation: 'plugin-unshare', remotePluginId: 'rp_1' });
  assert.deepEqual(requests.at(-1), { method: 'plugin/share/delete', params: { remotePluginId: 'rp_1' } });

  const html = renderToStaticMarkup(React.createElement(M.PluginShareControls, { plugin: row, store: { sharePlugin: async () => ({ ok: true }), unsharePlugin: async () => ({ ok: true }) } }));
  assert.match(html, /data-plugin-share/);
  assert.match(html, /Shared with your workspace by Ana\./);
  assert.match(html, /Copy link/);
  assert.match(html, /Stop sharing/);
  assert.match(html, /Update sharing/);
  const fresh = renderToStaticMarkup(React.createElement(M.PluginShareControls, { plugin: { ...row, share: null }, store: {} }));
  assert.match(fresh, /Share this plugin with your ChatGPT workspace\./);
  assert.doesNotMatch(fresh, /Stop sharing|Copy link/);
});

test('B24 Manage marketplaces row (c6a2a31c4 Us): name from the installed plugins, the source, a ⋮ menu; pluginRows keep the marketplace id', () => {
  const rows = pluginRows({ marketplaces: [{ name: 'demo-market', path: '/m/marketplace.json', interface: { displayName: 'Demo Market' },
    plugins: [{ id: 'done@demo-market', name: 'done', installed: true, enabled: true }] }] });
  assert.equal(rows[0].marketplaceId, 'demo-market');
  const html = renderToStaticMarkup(React.createElement(M.MarketplaceRow, { marketplace: { name: 'demo-market', sourceType: 'git', source: 'https://github.com/o/demo' }, plugins: rows, store: {} }));
  assert.match(html, /^<li class="flex items-start gap-sm rounded-lg border border-strong px-md py-sm" data-testid="manage-marketplace-row" data-marketplace="demo-market"><div class="flex min-w-0 flex-1 flex-col gap-xs"><span class="min-w-0 truncate text-body font-medium text-primary">Demo Market<\/span><p class="break-all text-caption text-secondary">https:\/\/github.com\/o\/demo<\/p><\/div>/);
  assert.match(html, /<button aria-label="More actions for Demo Market" aria-haspopup="menu" aria-expanded="false" type="button" data-cds="Button" data-variant="ghost" data-size="sm" data-cds-icon-only=""/);
  assert.doesNotMatch(html, /Remove marketplace\?/, 'the confirm stays closed until Remove is picked');
  assert.doesNotMatch(html, /Last updated/, 'no last_updated in the config: no line');
  // Us: "Last updated: {when}" from the config's last_updated (MarketplaceConfig).
  const dated = renderToStaticMarkup(React.createElement(M.MarketplaceRow, { marketplace: { name: 'demo-market', sourceType: 'git', source: 'o/demo', lastUpdated: '2026-10-01T09:30:00Z' }, plugins: rows, store: {} }));
  assert.match(dated, /<p class="text-caption text-muted" data-marketplace-updated="">Last updated: Oct 1, 2026, [^<]+<\/p><\/div>/);
});

test('B24 review: the New / Disabled badges are the CDS Badge (shared-frame Xo xs: Ho accent / neutral classes, pb-[0.05em] text)', async () => {
  const L = await server.ssrLoadModule('/src/source-customize-list.jsx');
  const fresh = renderToStaticMarkup(React.createElement(L.NewBadge, { reason: 'added' }));
  assert.match(fresh, /<span data-cds="Badge" data-variant="accent" data-size="xs" class="inline-flex items-center gap-1 align-middle h-control-nested whitespace-nowrap rounded-chip px-sm font-sans text-caption font-medium leading-\[round\(1\.25em,1px\)\] shrink-0 bg-tint-blue text-accent" data-cz-new=""><span class="pb-\[0\.05em\]">New<\/span><\/span>/);
  assert.match(renderToStaticMarkup(React.createElement(L.OffBadge)), /class="[^"]* bg-neutral text-secondary"><span class="pb-\[0\.05em\]">Disabled<\/span>/);
  assert.equal(renderToStaticMarkup(React.createElement(L.NewBadge, { reason: null })), '');
});
