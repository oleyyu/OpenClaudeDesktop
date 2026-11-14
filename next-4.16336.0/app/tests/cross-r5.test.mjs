import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { emptyState, reduce } from '../src/state.js';
import { localUsagePresentation } from '../electron/usage-model.mjs';
import { localizeBridgeText } from '../src/bridge-text-model.mjs';
import { coreSettingLabel } from '../src/core-settings-model.mjs';
import { corePath } from '../electron/core-registry.mjs';
import { setLocale } from '../electron/i18n/index.mjs';

const require = createRequire(import.meta.url);
const { reviewTarget } = require('../electron/session-operations.cjs');

// Round 5 cross-area fixes.

const ev = (method, params) => ({ type: 'event', event: { method, params } });
const usage = (threadId, turnId, total) => ev('thread/tokenUsage/updated', { threadId, turnId, tokenUsage: { total: { totalTokens: total }, last: { totalTokens: total }, modelContextWindow: 200000 } });

test('compaction marker: the context size before the compaction and the usage the core re-sends after it', () => {
  let state = reduce(emptyState, ev('thread/started', { thread: { id: 't', sessionId: 't', turns: [], status: { type: 'idle' } } }));
  state = reduce(state, ev('turn/started', { threadId: 't', turn: { id: 'u1', items: [], status: 'inProgress' } }));
  state = reduce(state, usage('t', 'u1', 120000));
  state = reduce(state, ev('turn/completed', { threadId: 't', turn: { id: 'u1', items: [], status: 'completed' } }));
  state = reduce(state, ev('turn/started', { threadId: 't', turn: { id: 'c1', items: [], status: 'inProgress' } }));
  state = reduce(state, ev('item/started', { threadId: 't', turnId: 'c1', item: { type: 'contextCompaction', id: 'k1' } }));
  state = reduce(state, ev('item/completed', { threadId: 't', turnId: 'c1', item: { type: 'contextCompaction', id: 'k1' } }));
  let item = state.items.t.find((entry) => entry.id === 'k1');
  assert.equal(item.preTokens, 120000);
  assert.equal(item.postTokens, undefined);
  state = reduce(state, usage('t', 'c1', 30000));
  item = state.items.t.find((entry) => entry.id === 'k1');
  assert.equal(item.postTokens, 30000, 'the recomputed usage of the compaction turn');
  state = reduce(state, usage('t', 'c1', 25000));
  assert.equal(state.items.t.find((entry) => entry.id === 'k1').postTokens, 30000, 'taken once');
  // A later turn's usage never counts as the compaction's result.
  let other = reduce(emptyState, ev('thread/started', { thread: { id: 't', sessionId: 't', turns: [], status: { type: 'idle' } } }));
  other = reduce(other, usage('t', 'u1', 90000));
  other = reduce(other, ev('item/started', { threadId: 't', turnId: 'c2', item: { type: 'contextCompaction', id: 'k2' } }));
  other = reduce(other, ev('item/completed', { threadId: 't', turnId: 'c2', item: { type: 'contextCompaction', id: 'k2' } }));
  other = reduce(other, usage('t', 'u9', 40000));
  assert.equal(other.items.t.find((entry) => entry.id === 'k2').postTokens, undefined);
});

test('Usage page: the tokens counted on this Mac by day and model when the core reports none', () => {
  const stats = { dailyModelTokens: [{ date: '2026-10-01', tokensByModel: { 'gpt-5.5': 300, relay: 100 } }, { date: '2026-10-05', tokensByModel: { relay: 50 } }, { date: '2025-01-01', tokensByModel: { old: 7 } }], modelUsage: {} };
  const local = localUsagePresentation(stats, { todayKey: '2026-10-06' });
  assert.deepEqual(local.daily, [{ startDate: '2026-10-05', tokens: 50 }, { startDate: '2026-10-01', tokens: 400 }], 'newest first, last 30 days');
  assert.deepEqual(local.models.map((entry) => [entry.model, entry.tokens]), [['gpt-5.5', 300], ['relay', 150], ['old', 7]]);
  assert.equal(local.total, 457, 'all time');
  assert.equal(localUsagePresentation({ dailyModelTokens: [] }, { todayKey: '2026-10-06' }), null);
  assert.equal(localUsagePresentation(null), null);
});

test('bridge sentences: MiniMax’s terminal-session warning and its plugin sign-in refusal read in the UI language', (context) => {
  context.after(() => setLocale('en-US'));
  const strict = "This conversation was started in MiniMax Code's terminal, so it runs in your own MiniMax home as it is: Ask cannot stop edits inside the project, and OpenClaude Desktop's tool switches and instructions don't apply. Start a new session in OpenClaude Desktop to use them.";
  assert.match(localizeBridgeText(strict), /^This conversation was started in MiniMax Code’s terminal.*Manual can’t stop edits/);
  setLocale('zh-CN');
  assert.match(localizeBridgeText(strict), /“手动”无法阻止/);
  assert.match(localizeBridgeText("This conversation was started in MiniMax Code's terminal, so it runs in your own MiniMax home as it is: OpenClaude Desktop's tool switches and instructions don't apply. Start a new session in OpenClaude Desktop to use them."), /MiniMax Code 的终端/);
  assert.match(localizeBridgeText('MiniMax Code: Sign in with your MiniMax account (Settings › Account) to install or change MiniMax’s official plugins.'), /请登录你的 MiniMax 账户/);
});

test('core settings: Qwen’s usage statistics row names Alibaba Cloud, Gemini’s names Google; the voice model says where it applies', () => {
  assert.match(coreSettingLabel('privacy.usageStatisticsEnabled', 'qwen').description, /Alibaba Cloud/);
  assert.match(coreSettingLabel('privacy.usageStatisticsEnabled', { engine: 'gemini' }).description, /Google/);
  assert.match(coreSettingLabel('voiceModel', 'qwen').description, /terminal \(\/voice\)/);
});

test('core paths: Codex under CODEX_HOME shows its own home, any other path and core is unchanged', () => {
  const codex = { engine: 'codex', home: '/Users/someone/work/codex-home' };
  assert.equal(corePath(codex, '~/.codex/config.toml'), '~/work/codex-home/config.toml');
  assert.equal(corePath(codex, '~/.codex'), '~/work/codex-home');
  assert.equal(corePath(codex, '~/.codexy/x'), '~/.codexy/x');
  assert.equal(corePath(codex, '~/.agents/skills'), '~/.agents/skills');
  assert.equal(corePath({ engine: 'codex' }, '~/.codex/skills'), '~/.codex/skills');
  assert.equal(corePath({ engine: 'kimi', home: '/tmp/x' }, '~/.kimi-code/mcp.json'), '~/.kimi-code/mcp.json', 'a core without a home field');
  assert.equal(corePath(codex, null), null);
});

test('review targets: a pull request only for a core that lists it, as a number or URL', () => {
  const opencode = { reviewTargets: ['uncommittedChanges', 'pullRequest'] };
  assert.deepEqual(reviewTarget({ type: 'pullRequest', pullRequest: ' #42 ' }, opencode), { type: 'pullRequest', pullRequest: '42' });
  assert.deepEqual(reviewTarget({ type: 'pullRequest', pullRequest: 'https://github.com/o/r/pull/7' }, opencode), { type: 'pullRequest', pullRequest: 'https://github.com/o/r/pull/7' });
  assert.throws(() => reviewTarget({ type: 'pullRequest', pullRequest: '42' }, {}), /valid review target/);
  assert.throws(() => reviewTarget({ type: 'pullRequest', pullRequest: '--help' }, opencode), /pull request number or URL/);
  assert.throws(() => reviewTarget({ type: 'pullRequest', pullRequest: '42; rm -rf /' }, opencode), /pull request number or URL/);
  assert.deepEqual(reviewTarget({ type: 'commit', sha: 'abc' }), { type: 'commit', sha: 'abc' });
});

test('auto-review: a stored denial becomes Codex’s GuardianAssessmentEvent (snake_case, as codex 0.155.1 accepts)', async () => {
  const { guardianDenialEvent, deniedActionSummary } = await import('../src/auto-review-model.mjs');
  const review = { reviewId: 'rev-1', turnId: 't1', targetItemId: null, status: 'denied', riskLevel: 'high', userAuthorization: 'low', rationale: 'Not asked for', decisionSource: 'agent',
    action: { type: 'networkAccess', target: 'https://staging.example:443', host: 'staging.example', protocol: 'https', port: 443 }, startedAtMs: 10, completedAtMs: 20 };
  assert.deepEqual(guardianDenialEvent(review), { id: 'rev-1', turn_id: 't1', started_at_ms: 10, completed_at_ms: 20, status: 'denied', risk_level: 'high', user_authorization: 'low',
    rationale: 'Not asked for', decision_source: 'agent', action: { type: 'network_access', target: 'https://staging.example:443', host: 'staging.example', protocol: 'https', port: 443 } });
  assert.deepEqual(guardianDenialEvent({ ...review, action: { type: 'command', source: 'unifiedExec', command: 'curl x', cwd: '/w' } }).action, { type: 'command', source: 'unified_exec', command: 'curl x', cwd: '/w' });
  assert.deepEqual(guardianDenialEvent({ ...review, action: { type: 'mcpToolCall', server: 'gh', toolName: 'merge', connectorId: null, connectorName: 'GitHub', toolTitle: 'Merge' } }).action,
    { type: 'mcp_tool_call', server: 'gh', tool_name: 'merge', connector_id: null, connector_name: 'GitHub', tool_title: 'Merge' });
  assert.equal(guardianDenialEvent({ ...review, status: 'approved' }), null);
  assert.equal(guardianDenialEvent({ ...review, action: { type: 'requestPermissions', reason: null, permissions: {} } }), null, 'not rebuilt');
  assert.equal(deniedActionSummary(review.action), 'staging.example:443');
  assert.equal(deniedActionSummary({ type: 'execve', program: 'git', argv: ['git', 'push'] }), 'git push');
});

test('shell mode: a leading ! on a core with thread/shellCommand is the user’s own command', async () => {
  const { shellModeCommand, shellModeActive } = await import('../src/shell-mode-model.mjs');
  const codex = { engine: 'codex', capabilities: {} };
  assert.equal(shellModeCommand('!git status', codex), 'git status');
  assert.equal(shellModeCommand('  ! npm test  ', codex), 'npm test');
  assert.equal(shellModeCommand('!', codex), null);
  assert.equal(shellModeActive('!', codex), true, 'the hint shows as soon as ! is typed');
  assert.equal(shellModeCommand('!git status', { engine: 'deepseek-harness', capabilities: {} }), null, 'a core without it sends a message');
  assert.equal(shellModeCommand('run !this', codex), null);
  const { commandRowLabel } = await import('../src/command-row-model.mjs');
  // w12b-transcript (W12b-TR-4): the user's '!' command is the user entry c19e90103 Dg (source-user-shell.jsx), so the
  // command row has no 'You ran' branch of its own any more.
  assert.deepEqual(commandRowLabel('ls', 'busy', null, 'userShell'), commandRowLabel('ls', 'busy', null));
  assert.notEqual(commandRowLabel("/bin/zsh -lc 'echo hi'", 'done', null, 'userShell').label, 'You ran');
});

test('hooks: Codex’s hooks/list grouped by event, the review count, and which rows run', async () => {
  const { hooksView, hookTrustLabel, hooksReviewSummary } = await import('../src/hooks-model.mjs');
  const hook = (extra) => ({ key: 'k', eventName: 'preToolUse', handlerType: 'command', command: 'echo guard', async: false, matcher: 'Bash', timeoutSec: 600, sourcePath: '/Users/u/.codex/hooks.json',
    source: 'user', pluginId: null, displayOrder: 0, enabled: true, isManaged: false, currentHash: 'sha256:aa', trustStatus: 'untrusted', ...extra });
  const response = { data: [{ cwd: '/w', hooks: [hook({ key: 'a' }), hook({ key: 'b', trustStatus: 'trusted', eventName: 'stop', matcher: null }), hook({ key: 'c', trustStatus: 'modified', displayOrder: 1 }),
    hook({ key: 'd', isManaged: true, trustStatus: 'managed', source: 'mdm' })], warnings: ['w1'], errors: [] }] };
  const view = hooksView(response, '/w');
  assert.deepEqual(view.groups.map((group) => [group.event, group.hooks.map((row) => row.key)]), [['preToolUse', ['a', 'd', 'c']], ['stop', ['b']]]);
  assert.equal(view.needsReview, 2, 'untrusted and modified; managed never');
  assert.deepEqual(view.groups[0].hooks.map((row) => [row.needsReview, row.active]), [[true, false], [false, true], [true, false]]);
  assert.equal(view.groups[0].hooks[0].sourcePath, '~/.codex/hooks.json');
  assert.equal(hookTrustLabel(view.groups[0].hooks[2]), 'Changed since you trusted it');
  assert.equal(hooksReviewSummary(2), '2 hooks need review before they can run.');
  assert.deepEqual(view.warnings, ['w1']);
  // A bridge's hooks carry no trust: listed and active.
  const bridge = hooksView({ data: [{ cwd: '/w', hooks: [{ key: 'x', eventName: 'sessionStart', handlerType: 'command', command: 'say hi', enabled: true }] }] }, '/w');
  assert.equal(bridge.needsReview, 0);
  assert.equal(bridge.groups[0].hooks[0].active, true);
});

test('customize hooks-state: only listed hooks, trusted at their own hash, on a native core', async () => {
  const { createCustomizeOperations } = require('../electron/customize-operations.cjs');
  const requests = [];
  const owner = { serverInfo: { engine: 'codex', capabilities: {} }, start: async () => {}, request: async (method, params) => {
    requests.push([method, params]);
    if (method === 'hooks/list') return { data: [{ cwd: '/w', hooks: [{ key: '/h/hooks.json:pre_tool_use:0:0', currentHash: 'sha256:0123456789ab', isManaged: false }, { key: 'managed:0', currentHash: 'sha256:0123456789ab', isManaged: true }] }] };
    return { status: 'ok' };
  } };
  const operations = createCustomizeOperations({ getClient: () => owner, getConfig: () => ({ threadIds: [], archivedThreadIds: [] }), knownCwd: (cwd) => cwd });
  await operations.run({ operation: 'hooks', cwd: '/w' });
  await operations.run({ operation: 'hooks-state', trust: ['/h/hooks.json:pre_tool_use:0:0'] });
  assert.deepEqual(requests.at(-1), ['config/batchWrite', { edits: [{ keyPath: 'hooks.state', value: { '/h/hooks.json:pre_tool_use:0:0': { trusted_hash: 'sha256:0123456789ab' } }, mergeStrategy: 'upsert' }], reloadUserConfig: true }]);
  await operations.run({ operation: 'hooks-state', enabled: { key: '/h/hooks.json:pre_tool_use:0:0', enabled: false } });
  assert.deepEqual(requests.at(-1)[1].edits[0].value, { '/h/hooks.json:pre_tool_use:0:0': { enabled: false } });
  await assert.rejects(operations.run({ operation: 'hooks-state', trust: ['managed:0'] }), /Unknown hook/);
  await assert.rejects(operations.run({ operation: 'hooks-state', trust: ['never-listed'] }), /Unknown hook/);
  owner.serverInfo = { engine: 'kimi', capabilities: {} };
  await assert.rejects(operations.run({ operation: 'hooks-state', trust: ['/h/hooks.json:pre_tool_use:0:0'] }), /not supported/);
});

test('codex features: memories and beta features read and written the way Codex’s TUI writes them', async () => {
  const { createCodexFeatures } = require('../electron/codex-features.cjs');
  const requests = [];
  const features = [{ name: 'memories', stage: 'stable', enabled: false }, { name: 'network_proxy', stage: 'beta', displayName: 'Network proxy', description: 'Proxy.', enabled: false },
    { name: 'worktrees', stage: 'beta', displayName: 'Worktrees', enabled: false }, { name: 'prevent_idle_sleep', stage: 'beta', displayName: 'Prevent sleep', enabled: false }, { name: 'goals', stage: 'stable', enabled: true }];
  const client = { serverInfo: { engine: undefined, capabilities: {} }, start: async () => {}, request: async (method, params) => {
    requests.push([method, params]);
    if (method === 'experimentalFeature/list') return { data: features };
    if (method === 'config/read') return { config: { memories: { use_memories: false, generate_memories: null } } };
    if (method === 'memory/status') return { v2ConsolidatedThreads: 3, v2Ready: true };
    return {};
  } };
  const codex = createCodexFeatures({ getClient: () => client });
  const read = await codex.run({ op: 'read' });
  assert.deepEqual(read.beta.map((feature) => feature.name), ['network_proxy'], 'Worktrees and Prevent sleep are OpenClaude Desktop’s own');
  assert.deepEqual(read.memories, { enabled: false, useMemories: false, generateMemories: true, status: { threads: 3, ready: true } });
  await codex.run({ op: 'set-feature', name: 'memories', enabled: true });
  const write = requests.find(([method]) => method === 'config/batchWrite');
  assert.deepEqual(write[1].edits, [{ keyPath: 'features.memories', value: true, mergeStrategy: 'replace' }, { keyPath: 'features.memory_tool', value: true, mergeStrategy: 'replace' }]);
  assert.ok(requests.some(([method, params]) => method === 'experimentalFeature/enablement/set' && params.enablement.memories === true));
  await codex.run({ op: 'set-feature', name: 'network_proxy', enabled: false });
  assert.deepEqual(requests.filter(([method]) => method === 'config/batchWrite').at(-1)[1].edits, [{ keyPath: 'features.network_proxy', value: null, mergeStrategy: 'replace' }], 'off clears a default-off feature');
  await codex.run({ op: 'set-memories', generateMemories: false });
  assert.deepEqual(requests.filter(([method]) => method === 'config/batchWrite').at(-1)[1].edits, [{ keyPath: 'memories.generate_memories', value: false, mergeStrategy: 'replace' }]);
  await assert.rejects(codex.run({ op: 'set-feature', name: 'worktrees', enabled: true }), /Unknown feature/);
  await assert.rejects(codex.run({ op: 'reset-memories' }), /Confirm/);
  await codex.run({ op: 'reset-memories', confirmed: true });
  assert.ok(requests.some(([method]) => method === 'memory/reset'));
  client.serverInfo = { engine: 'kimi', capabilities: {} };
  await assert.rejects(codex.run({ op: 'read' }), /only for the Codex core/);
});

test('sidebar search: a session whose conversation matches (thread/search) shows beside title matches', async () => {
  const { buildSidebarGroups } = await import('../src/sidebar-model.js');
  const sessions = [{ id: 'a', name: 'Fix CORS bug', cwd: '/w', updatedAt: 2 }, { id: 'b', name: 'Refactor', cwd: '/w', updatedAt: 1 }, { id: 'c', name: 'Docs', cwd: '/w', updatedAt: 3 }];
  const ids = (groups) => groups.flatMap((group) => group.sessions.map((session) => session.id)).sort();
  assert.deepEqual(ids(buildSidebarGroups({ sessions, search: 'cors', preferences: { groupBy: 'none' } })), ['a']);
  assert.deepEqual(ids(buildSidebarGroups({ sessions, search: 'cors', preferences: { groupBy: 'none' }, contentMatches: new Set(['b']) })), ['a', 'b']);
});

test('Codex local model: a server on this Mac needs no key and runs without env_key', async () => {
  const { codexLocalEndpoint, codexLaunchArgs, CODEX_LOCAL_SERVERS } = await import('../electron/prefs/codex-provider.mjs');
  assert.equal(codexLocalEndpoint('http://127.0.0.1:11434/v1'), true);
  assert.equal(codexLocalEndpoint('http://localhost:1234/v1'), true);
  assert.equal(codexLocalEndpoint('http://[::1]:1234/v1'), true);
  assert.equal(codexLocalEndpoint('https://relay.example.com/v1'), false);
  assert.deepEqual(CODEX_LOCAL_SERVERS.map((server) => server.baseURL), ['http://127.0.0.1:1234/v1', 'http://127.0.0.1:11434/v1']);
  const state = { mode: 'custom', baseURL: 'http://127.0.0.1:11434/v1', models: ['qwen3:8b'] };
  assert.doesNotMatch(codexLaunchArgs(state, { keyless: true })[1], /env_key/);
  assert.match(codexLaunchArgs(state)[1], /env_key="CODE_DESKTOP_CODEX_API_KEY"/, 'a saved key keeps env_key');
});

test('approval card: a connector’s model request reads as one, with the model, content and prompts, never a shell command', async () => {
  const { approvalCardModel } = await import('../src/approval-card-model.mjs');
  const request = { method: 'item/commandExecution/requestApproval', params: { kind: 'command', command: 'Model request for mimo-cut', sessionGrantable: true, reason: 'A connector asks to run a model request on your account.',
    codeDesktop: { declineFeedback: true, sampling: { server: 'mimo-cut', model: 'mimo/mimo-v2', contentTypes: ['audio', 'text'], audioBytes: 3072, audioClips: 2, systemPrompt: 'Transcribe.', textPrompt: 'Clip', maxTokens: 4000 } } } };
  const card = approvalCardModel(request, null);
  assert.equal(card.title, 'Allow mimo-cut to run a model request on your account?');
  assert.deepEqual(card.context.map((entry) => entry.text), ['Model: mimo/mimo-v2', 'Sends: audio, text', 'Audio: 3 KB in 2 clips', 'Up to 4,000 output tokens']);
  assert.equal(card.detail.text, 'System prompt: Transcribe.\n\nPrompt: Clip');
  assert.deepEqual(card.allows.map((allow) => allow.key), ['acceptForSession', 'accept']);
  assert.equal(card.declineFeedback, true);
});

test('@ menu: an agent target stays text, another session becomes ZCode’s [#title](#id), files stay mentions', async () => {
  const { mentionOptions, agentMentionText, mentionInputs } = await import('../src/mention-model.mjs');
  const [mcp, session] = mentionOptions([{ literal: true, kind: 'mcp', name: 'github', text: '@mcp:github', description: 'Connector' }, { session: { id: 'ses_1', title: 'Debug login', native: true }, description: 'Session' }]);
  assert.deepEqual([mcp.path, mcp.label, mcp.literal, mcp.icon], ['mcp:github', 'github', true, 'Connectors']);
  // B31: a session row leads with ChatSimple (ca80fca8d TN); ZCode's own sessions (native) keep '#title'.
  assert.deepEqual([session.path, session.label, session.icon, session.renderedText], ['session:ses_1', 'Debug login', 'ChatSimple', '#Debug login']);
  const mentions = [{ path: 'mcp:github', literal: true }, { path: 'session:ses_1', session: { id: 'ses_1', title: 'Debug [login]', native: true } }, { path: 'src/a.js' }];
  const text = agentMentionText('Use @mcp:github and @session:ses_1 on @src/a.js', mentions);
  assert.equal(text, 'Use @mcp:github and [#Debug login](#ses_1) on @src/a.js');
  const files = mentionInputs(text, mentions.filter((entry) => !entry.literal && !entry.session));
  assert.deepEqual(files.items, [{ type: 'mention', name: 'a.js', path: 'src/a.js' }]);
});

test('sidebar: a session with a bound pull request shows the review glyph', async () => {
  const { sessionState } = await import('../src/sidebar-model.js');
  assert.equal(sessionState({ id: 'a', prState: 'open' }, {}), 'review');
  assert.equal(sessionState({ id: 'a' }, {}), 'done');
});

test('customize skill-root: a listed folder opened (created when missing), a new SKILL.md started there; nothing else', async () => {
  const fs = await import('node:fs');
  const os = await import('node:os');
  const path = await import('node:path');
  const { createCustomizeOperations } = require('../electron/customize-operations.cjs');
  const home = fs.mkdtempSync(path.join(os.tmpdir(), 'cd-skill-root-'));
  const opened = [];
  const owner = { serverInfo: { engine: 'codex', capabilities: {} }, start: async () => {}, request: async () => ({}) };
  const operations = createCustomizeOperations({ getClient: () => owner, getConfig: () => ({ threadIds: [], archivedThreadIds: [] }), knownCwd: (cwd) => cwd, home: () => home, openPath: async (target) => { opened.push(target); return ''; } });
  await operations.run({ operation: 'skill-root', root: '~/.codex/skills', action: 'open' });
  assert.ok(fs.statSync(path.join(home, '.codex', 'skills')).isDirectory());
  await operations.run({ operation: 'skill-root', root: '~/.codex/skills', action: 'new-skill', name: 'release-notes' });
  const file = path.join(home, '.codex', 'skills', 'release-notes', 'SKILL.md');
  assert.match(fs.readFileSync(file, 'utf8'), /^---\nname: release-notes\n/);
  assert.deepEqual(opened, [path.join(home, '.codex', 'skills'), file]);
  await assert.rejects(operations.run({ operation: 'skill-root', root: '~/.codex/skills', action: 'new-skill', name: 'release-notes' }), /already exists/);
  await assert.rejects(operations.run({ operation: 'skill-root', root: '~/anything', action: 'open' }), /Unknown skill folder/);
  await assert.rejects(operations.run({ operation: 'skill-root', root: '<workspace>/.agents/skills', action: 'open' }), /Open a project first/);
  await assert.rejects(operations.run({ operation: 'skill-root', root: '~/.codex/skills', action: 'new-skill', name: '../x' }), /lowercase letters/);
  fs.rmSync(home, { recursive: true, force: true });
});
