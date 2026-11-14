import test from 'node:test';
import assert from 'node:assert/strict';
import { parseTokenCount, contextWindowsFor, validateProvider, providerOverlayRow, validateConnection, relayCatalogRow, listedContextWindows } from '../electron/prefs/model-settings.mjs';
import { coreCapabilities } from '../electron/core-registry.mjs';
import { emptyState, reduce } from '../src/state.js';
import { turnActivity } from '../src/transcript-runtime-stats.mjs';

// Round 3 cross-area fixes.

test('context windows: 131072, 128K, 1M parse; custom provider and relay rows carry contextWindow', () => {
  assert.equal(parseTokenCount('131072'), 131072);
  assert.equal(parseTokenCount('131,072'), 131072);
  assert.equal(parseTokenCount('128K'), 128000);
  assert.equal(parseTokenCount('1M'), 1000000);
  assert.equal(parseTokenCount('1.5m'), 1500000);
  assert.equal(parseTokenCount(''), null);
  assert.ok(Number.isNaN(parseTokenCount('lots')));
  assert.deepEqual(contextWindowsFor({ a: '128K', b: '', zzz: '1M' }, ['a', 'b']), { a: 128000 }, 'only listed ids, empty skipped');
  assert.throws(() => contextWindowsFor({ a: '12' }, ['a']), /Invalid context window for a/);
  const provider = validateProvider({ route: 'gw', baseURL: 'https://gw.example.com/v1', models: 'glm-5\nqwen3', contextWindows: { 'glm-5': '128K' } });
  assert.deepEqual(provider.contextWindows, { 'glm-5': 128000 });
  assert.deepEqual(providerOverlayRow([provider]).config.providers.gw.models, [{ id: 'glm-5', name: 'GLM 5', contextWindow: 128000, reasoningEfforts: { off: null, low: 'low', medium: 'medium', high: 'high' } }, { id: 'qwen3', name: 'Qwen 3', reasoningEfforts: { off: null, low: 'low', medium: 'medium', high: 'high' } }]);
  assert.equal('contextWindows' in validateProvider({ route: 'gw', baseURL: 'https://gw.example.com/v1', models: 'm' }), false, 'absent when none is set');
  const connection = validateConnection({ mode: 'relay', relayBaseURL: 'https://relay.test', relayModels: 'glm-5', relayContextWindows: { 'glm-5': 131072 } });
  assert.deepEqual(relayCatalogRow(connection).config.models, [{ id: 'glm-5', name: 'GLM 5', contextWindow: 131072 }]);
  assert.deepEqual(listedContextWindows([{ id: 'a', context_length: 131072 }, { id: 'models/b', inputTokenLimit: 1048576 }, { id: 'c' }, { id: 'd', context_window: 5 }]), { a: 131072, b: 1048576 });
});

test('review dialog note follows the core: Codex sandbox, bridges read-only, others the session mode', async () => {
  assert.equal(coreCapabilities('codex').reviewReadOnly, 'sandbox');
  assert.equal(coreCapabilities({ engine: 'zcode', capabilities: {} }).reviewReadOnly, undefined);
});

test('Codex terminalInteraction: typed input joins the command row, an empty poll shows Waiting for <command>', () => {
  const event = (method, params) => ({ event: { method, params } });
  let s = reduce(emptyState, event('thread/started', { thread: { id: 'a', sessionId: 'a', turns: [], status: { type: 'idle' } } }));
  s = reduce(s, event('turn/started', { threadId: 'a', turn: { id: 't1', items: [], status: 'inProgress' } }));
  s = reduce(s, event('item/started', { threadId: 'a', turnId: 't1', item: { type: 'commandExecution', id: 'c1', command: 'npm run dev', status: 'inProgress' } }));
  const typed = reduce(s, event('item/commandExecution/terminalInteraction', { threadId: 'a', turnId: 't1', itemId: 'c1', processId: 'p1', stdin: 'y\n' }));
  assert.deepEqual(typed.items.a.find((item) => item.id === 'c1').terminalInputs, ['y\n']);
  const waiting = reduce(typed, event('item/commandExecution/terminalInteraction', { threadId: 'a', turnId: 't1', itemId: 'c1', processId: 'p1', stdin: '' }));
  assert.equal(turnActivity('t1', waiting.items.a, {}, 5)?.label, 'Waiting for npm run dev');
  const output = reduce(waiting, event('item/commandExecution/outputDelta', { threadId: 'a', turnId: 't1', itemId: 'c1', delta: 'ready' }));
  assert.notEqual(turnActivity('t1', output.items.a, {}, 5)?.label, 'Waiting for npm run dev', 'output ends the wait');
  assert.equal(reduce(s, event('item/commandExecution/terminalInteraction', { threadId: 'a', itemId: 'nope', stdin: 'x' })), s, 'an unknown item is ignored');
});

test('Codex connector settings: read, on/off, per-tool switch and approval are written to mcp_servers.<name>', async () => {
  const { createRequire } = await import('node:module');
  const require = createRequire(import.meta.url);
  const { createCustomizeOperations } = require('../electron/customize-operations.cjs');
  const { connectorToolRows, connectorApprovalItems } = await import('../src/customize-model.mjs');
  const requests = [];
  const user = { name: { type: 'user', file: '/h/.codex/config.toml' } };
  let config = { github: { command: 'gh-mcp', enabled: true, disabled_tools: ['delete_repo'], default_tools_approval_mode: 'prompt', tools: { list_issues: { approval_mode: 'approve' } } }, proj: { command: 'p' } };
  const client = { start: async () => {}, serverInfo: { engine: 'codex', capabilities: {} }, request: async (method, params, timeout) => {
    requests.push({ method, params, timeout });
    if (method === 'config/read') return { config: { mcp_servers: config }, origins: { 'mcp_servers.github.command': user, 'mcp_servers.proj.command': { name: { type: 'project' } } } };
    return {};
  } };
  const ops = createCustomizeOperations({ getClient: () => client, getConfig: () => ({ threadIds: [] }), knownCwd: (cwd) => cwd });
  const read = await ops.run({ operation: 'mcp-config' });
  assert.deepEqual(read.servers.github, { enabled: true, enabledTools: null, disabledTools: ['delete_repo'], defaultMode: 'prompt', tools: { list_issues: 'approve' }, editable: true });
  assert.equal(read.servers.proj.editable, false);
  await ops.run({ operation: 'mcp-enable', name: 'github', enabled: false });
  assert.deepEqual(requests.find((r) => r.method === 'config/batchWrite').params.edits, [{ keyPath: 'mcp_servers."github".enabled', value: false, mergeStrategy: 'replace' }]);
  assert.equal(requests.at(-1).method, 'config/mcpServer/reload');
  requests.length = 0;
  await ops.run({ operation: 'mcp-tool', name: 'github', tool: 'delete_repo', enabled: true });
  assert.deepEqual(requests.find((r) => r.method === 'config/batchWrite').params.edits, [{ keyPath: 'mcp_servers."github".disabled_tools', value: null, mergeStrategy: 'replace' }]);
  requests.length = 0;
  // Clearing an 'Always allow' Codex saved from an approval card.
  await ops.run({ operation: 'mcp-tool', name: 'github', tool: 'list_issues', mode: null });
  assert.deepEqual(requests.find((r) => r.method === 'config/batchWrite').params.edits, [{ keyPath: 'mcp_servers."github".tools."list_issues".approval_mode', value: null, mergeStrategy: 'replace' }]);
  requests.length = 0;
  await ops.run({ operation: 'mcp-tool', name: 'github', mode: 'writes' });
  assert.deepEqual(requests.find((r) => r.method === 'config/batchWrite').params.edits, [{ keyPath: 'mcp_servers."github".default_tools_approval_mode', value: 'writes', mergeStrategy: 'replace' }]);
  await assert.rejects(ops.run({ operation: 'mcp-tool', name: 'github', tool: 'x', mode: 'sometimes' }), /Invalid approval/);
  await assert.rejects(ops.run({ operation: 'mcp-enable', name: 'proj', enabled: false }), /defined outside/);
  // A bridge core keeps its own settings: refused.
  const bridge = createCustomizeOperations({ getClient: () => ({ ...client, serverInfo: { engine: 'kimi', capabilities: {} } }), getConfig: () => ({ threadIds: [] }), knownCwd: (cwd) => cwd });
  await assert.rejects(bridge.run({ operation: 'mcp-config' }), /not supported/);
  // Rows: listed tools plus the ones turned off; the per-tool choice inherits the connector's.
  assert.deepEqual(connectorToolRows({ tools: ['list_issues'] }, read.servers.github), [{ name: 'delete_repo', enabled: false, mode: '' }, { name: 'list_issues', enabled: true, mode: 'approve' }]);
  assert.equal(connectorApprovalItems({ tool: true, inherited: 'prompt' })[0].label, 'Default (Always ask)');
});

test('Codex tool suggestion: its own card with the reason, the install page and I installed it / Turn on', async () => {
  const { approvalCardModel } = await import('../src/approval-card-model.mjs');
  const request = (meta) => ({ method: 'mcpServer/elicitation/request', params: { serverName: 'codex_apps', mode: 'form', message: 'x', requestedSchema: { type: 'object', properties: {} },
    _meta: { codex_approval_kind: 'tool_suggestion', tool_type: 'connector', suggest_type: 'install', suggest_reason: 'Checking your calendar needs Google Calendar.', tool_id: 'connector_gcal', tool_name: 'Google Calendar', install_url: 'https://chatgpt.com/apps/gcal', ...meta } } });
  const install = approvalCardModel(request({}));
  assert.equal(install.title, 'Install Google Calendar?');
  assert.equal(install.message, 'Checking your calendar needs Google Calendar.');
  assert.equal(install.elicitation.mode, 'toolSuggestion');
  assert.equal(install.elicitation.openable, true);
  assert.deepEqual(install.allows.map((a) => a.key), ['accept']);
  assert.equal(install.allows[0].label, 'I installed it');
  assert.equal(install.deny.label, 'Not now');
  const enable = approvalCardModel(request({ suggest_type: 'enable', tool_type: 'plugin', tool_name: 'Linear' }));
  assert.equal(enable.title, 'Turn on the Linear plugin?');
  assert.deepEqual(enable.allows.map((a) => a.key), ['enableSuggested']);
  // An unknown suggestion stays the generic confirm.
  assert.equal(approvalCardModel(request({ tool_type: 'skill' })).elicitation.mode, 'confirm');
});

test('Codex marketplaces: only user-added ones are listed, removable, and upgradable when git; load errors and apps to connect', async () => {
  const { createRequire } = await import('node:module');
  const require = createRequire(import.meta.url);
  const { createCustomizeOperations } = require('../electron/customize-operations.cjs');
  const { marketplaceLoadErrors, pluginAppsNeedingAuth } = await import('../src/customize-model.mjs');
  const requests = [];
  const user = { name: { type: 'user' } };
  const client = { start: async () => {}, serverInfo: { engine: 'codex', capabilities: {} }, request: async (method, params) => {
    requests.push({ method, params });
    if (method === 'config/read') return { config: { marketplaces: { mine: { source_type: 'git', source: 'owner/repo', last_updated: '2026-10-01T09:30:00Z' }, local: { source_type: 'local', source: '/m' }, managed: { source_type: 'git' } } },
      origins: { 'marketplaces.mine.source': user, 'marketplaces.local.source_type': user, 'marketplaces.managed.source': { name: { type: 'system' } } } };
    return { ok: true };
  } };
  const ops = createCustomizeOperations({ getClient: () => client, getConfig: () => ({ threadIds: [] }), knownCwd: (cwd) => cwd });
  await assert.rejects(ops.run({ operation: 'marketplace-remove', name: 'mine' }), /Unknown marketplace/, 'only after a listing');
  const listed = await ops.run({ operation: 'marketplaces' });
  assert.deepEqual(listed.marketplaces.map((m) => [m.name, m.sourceType]), [['local', 'local'], ['mine', 'git']]);
  assert.deepEqual(listed.marketplaces.map((m) => m.lastUpdated), [null, '2026-10-01T09:30:00Z'], 'MarketplaceConfig last_updated');
  await assert.rejects(ops.run({ operation: 'marketplace-upgrade', name: 'local' }), /Unknown marketplace/, 'a local marketplace has nothing to pull');
  await ops.run({ operation: 'marketplace-upgrade', name: 'mine' });
  assert.deepEqual(requests.at(-1), { method: 'marketplace/upgrade', params: { marketplaceName: 'mine' } });
  await ops.run({ operation: 'marketplace-remove', name: 'local' });
  assert.deepEqual(requests.at(-1), { method: 'marketplace/remove', params: { marketplaceName: 'local' } });
  await assert.rejects(ops.run({ operation: 'marketplace-remove', name: 'managed' }), /Unknown marketplace/);
  assert.deepEqual(marketplaceLoadErrors({ marketplaceLoadErrors: [{ marketplacePath: '/x/marketplace.json', message: 'bad manifest' }, { message: ' ' }] }).map((e) => e.message), ['bad manifest']);
  assert.deepEqual(pluginAppsNeedingAuth({ authPolicy: 'ON_USE', appsNeedingAuth: [{ id: 'slack', name: 'Slack', installUrl: 'https://chatgpt.com/apps/slack' }, { id: 'x', installUrl: 'javascript:alert(1)' }] }),
    { apps: [{ id: 'slack', name: 'Slack', installUrl: 'https://chatgpt.com/apps/slack' }, { id: 'x', name: 'x', installUrl: null }], onUse: true });
});

test('long model catalogs: the main list is capped (default and selected first) and searchable by name, provider or id', async () => {
  const { modelMenuSections, filterModels, MODEL_PRIMARY_CAP } = await import('../src/model-menu-model.mjs');
  const models = Array.from({ length: 400 }, (_, index) => ({ model: `openrouter/vendor/model-${index}`, displayName: `Model ${index}`, description: 'OpenRouter', section: 'main' }));
  models.push({ model: 'anthropic/claude-sonnet-4-5', displayName: 'Claude Sonnet 4.5', description: 'Anthropic', section: 'main', isDefault: true });
  const sections = modelMenuSections({ models, selected: 'openrouter/vendor/model-399' });
  assert.equal(sections.searchable, true);
  assert.equal(sections.primary.length, MODEL_PRIMARY_CAP);
  assert.equal(sections.primary[0].model, 'anthropic/claude-sonnet-4-5', 'the default first');
  assert.ok(sections.primary.some((model) => model.model === 'openrouter/vendor/model-399'), 'the selected model stays in reach');
  assert.equal(sections.primary.length + sections.overflow.length, models.length);
  assert.deepEqual(filterModels(models, 'sonnet').map((model) => model.model), ['anthropic/claude-sonnet-4-5']);
  assert.deepEqual(filterModels(models, 'anthropic claude').map((model) => model.model), ['anthropic/claude-sonnet-4-5']);
  assert.equal(filterModels(models, 'model-12').length, 11, 'id substring: model-12, model-120…129');
  assert.equal(modelMenuSections({ models: models.slice(0, 5) }).searchable, undefined, 'a short list has no search');
});

test('instruction files a core reads itself: Qwen QWEN.md / AGENTS.md, Gemini GEMINI.md (+ context.fileName), Codex AGENTS.md', async () => {
  const { createRequire } = await import('node:module');
  const fs = await import('node:fs'), os = await import('node:os'), path = await import('node:path');
  const { coreInstructionFiles } = createRequire(import.meta.url)('../electron/instructions-service.cjs');
  const base = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'core-files-')));
  const repo = path.join(base, 'repo'), sub = path.join(repo, 'pkg');
  fs.mkdirSync(path.join(repo, '.git'), { recursive: true }); fs.mkdirSync(sub, { recursive: true });
  fs.writeFileSync(path.join(repo, 'QWEN.md'), 'q'); fs.writeFileSync(path.join(sub, 'AGENTS.md'), 'a'); fs.writeFileSync(path.join(repo, 'GEMINI.md'), 'g'); fs.writeFileSync(path.join(sub, 'NOTES.md'), 'n');
  fs.mkdirSync(path.join(base, '.gemini'), { recursive: true });
  fs.writeFileSync(path.join(base, '.gemini', 'settings.json'), JSON.stringify({ context: { fileName: ['GEMINI.md', 'NOTES.md'] } }));
  const names = (engine) => coreInstructionFiles(sub, { home: base, env: {}, engine }).map((file) => `${file.scope}:${path.relative(base, file.path)}`);
  assert.deepEqual(names('qwen'), ['global:.qwen/QWEN.md', 'project:repo/QWEN.md', 'project:repo/pkg/AGENTS.md']);
  assert.deepEqual(names('gemini'), ['global:.gemini/GEMINI.md', 'project:repo/GEMINI.md', 'project:repo/pkg/NOTES.md']);
  assert.deepEqual(names('codex'), ['global:.codex/AGENTS.md', 'project:repo/pkg/AGENTS.md']);
  assert.deepEqual(names('kimi'), []);
});

test('a bridge that turns connectors on and off (mcpEnable) gets mcp_servers.<name>.enabled; others are refused', async () => {
  const { createRequire } = await import('node:module');
  const require = createRequire(import.meta.url);
  const { createCustomizeOperations } = require('../electron/customize-operations.cjs');
  const requests = [];
  const client = { start: async () => {}, serverInfo: { engine: 'opencode', capabilities: { mcpEnable: true } }, request: async (method, params) => {
    requests.push({ method, params });
    if (method === 'mcpServerStatus/list') return { data: [{ name: 'smoke', runtimeStatus: 'connected', tools: {} }], nextCursor: null };
    return {};
  } };
  const ops = createCustomizeOperations({ getClient: () => client, getConfig: () => ({ threadIds: [] }), knownCwd: (cwd) => cwd });
  await assert.rejects(ops.run({ operation: 'mcp-enable', name: 'smoke', enabled: false }), /Unknown connector/, 'only a listed connector');
  await ops.run({ operation: 'mcp' });
  await ops.run({ operation: 'mcp-enable', name: 'smoke', enabled: false });
  assert.deepEqual(requests.find((r) => r.method === 'config/batchWrite').params.edits, [{ keyPath: 'mcp_servers."smoke".enabled', value: false, mergeStrategy: 'replace' }]);
  const kimi = createCustomizeOperations({ getClient: () => ({ ...client, serverInfo: { engine: 'kimi', capabilities: {} } }), getConfig: () => ({ threadIds: [] }), knownCwd: (cwd) => cwd });
  await assert.rejects(kimi.run({ operation: 'mcp-enable', name: 'smoke', enabled: false }), /not supported/);
});
