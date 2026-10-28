import { registerCodexPack } from './codex-pack.mjs';
registerCodexPack();
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';
import {
  HARNESS_PROFILE_DEFAULT, normalizeHarnessProfile, validateHarnessProfile, toggleSafe, normalizeOverlay, renderOverlay,
  setRowEnabled, mcpInsert, removeInsert, hooksInsert, setSkillDirs, setManagedRow, parseEnvLines, splitArgs, overlayEmpty,
} from '../electron/prefs/harness-profile.mjs';
import { settingsPatch } from '../electron/preferences.mjs';
import { harnessView } from '../src/harness-settings-model.mjs';

const require = createRequire(import.meta.url);
const { createHarnessProfile } = require('../electron/harness-profile.cjs');

test('harnessProfile preference: default, lenient normalize, strict validate, settingsPatch wiring', () => {
  assert.deepEqual(HARNESS_PROFILE_DEFAULT, { overlayEnabled: true });
  assert.ok(Object.isFrozen(HARNESS_PROFILE_DEFAULT));
  assert.deepEqual(normalizeHarnessProfile(undefined), { overlayEnabled: true });
  assert.deepEqual(normalizeHarnessProfile({ overlayEnabled: false, junk: 1 }), { overlayEnabled: false });
  assert.deepEqual(normalizeHarnessProfile({ overlayEnabled: 'no' }), { overlayEnabled: true });
  assert.equal(validateHarnessProfile(null), null);
  assert.deepEqual(validateHarnessProfile({}), { overlayEnabled: true });
  assert.throws(() => validateHarnessProfile({ overlayEnabled: 1 }), /overlay/);
  assert.throws(() => validateHarnessProfile([]), /Harness/);
  const saved = settingsPatch({}, { harnessProfile: { overlayEnabled: false } });
  assert.deepEqual(saved.harnessProfile, { overlayEnabled: false });
  assert.equal('harnessProfile' in settingsPatch(saved, { harnessProfile: null }), false, 'null resets to the default');
  assert.throws(() => settingsPatch({}, { harnessProfile: { overlayEnabled: 'x' } }));
});

test('toggleSafe: tools, MCP, skills (not the filesystem root), hooks and reminders; never core, app or protected rows', () => {
  const safe = (id, module) => toggleSafe({ id, module: `@deepseek-ai/${module}` });
  for (const [id, module] of [['tool-web', 'dsh-tool-web'], ['tool-bash', 'dsh-tool-bash'], ['github', 'dsh-mcp-client'], ['skill-badge', 'dsh-skill-badge'],
    ['web-search-deepseek', 'dsh-web-search-deepseek'], ['cd-hooks-codex', 'dsh-hooks-codex'], ['repeat-tool-reminder', 'dsh-repeat-tool-reminder']])
    assert.equal(safe(id, module), true, id);
  for (const [id, module] of [['tool-ask-user', 'dsh-tool-ask-user'], ['skill-filesystem', 'dsh-skill-filesystem'], ['system-prompt', 'dsh-system-prompt'],
    ['llm-deepseek', 'dsh-llm-deepseek-api-key'], ['credentials', 'dsh-credentials-local'], ['session-title', 'dsh-session-title'], ['agent', 'dsh-agent'],
    ['approval', 'dsh-user-approval'], ['permission', 'dsh-permission-presets'], ['tools', 'dsh-tools']])
    assert.equal(safe(id, module), false, id);
  // An id the app bundle or a protected family owns stays locked whatever module it names.
  assert.equal(toggleSafe({ id: 'codex-app-server', module: '@deepseek-ai/dsh-tool-x' }), false);
  assert.equal(toggleSafe({ id: 'session-x', module: '@deepseek-ai/dsh-tool-x' }), false);
  assert.equal(toggleSafe({}), false);
});

test('overlay grammar: inserts first, then id patches; explicit disabled true|false; JSON round-trips', () => {
  const entries = [{ id: 'tool-web', module: '@deepseek-ai/dsh-tool-web' }, { id: 'system-prompt', module: '@deepseek-ai/dsh-system-prompt' }];
  let state = setRowEnabled(undefined, { id: 'tool-web', enabled: false }, entries);
  assert.deepEqual(state.rows['tool-web'], { disabled: true });
  assert.throws(() => setRowEnabled(state, { id: 'system-prompt', enabled: false }, entries), /can’t be turned off/);
  assert.throws(() => setRowEnabled(state, { id: 'unknown', enabled: false }, entries), /can’t be turned off/);
  state = mcpInsert({ serverName: 'gh', transport: 'stdio', command: 'npx', args: ['-y', 'srv'], env: { TOKEN: 'x' } }, state);
  state = setSkillDirs(state, ['/a/skills/', '/b', '/a/skills']);
  assert.deepEqual(state.rows['skill-filesystem'], { config: { customSkillDirs: ['/a/skills', '/b'] } });
  const patches = renderOverlay(state);
  assert.deepEqual(patches[0], { insert: [{ id: 'cd-mcp-gh', name: '@deepseek-ai/dsh-mcp-client', config: { transport: 'stdio', serverName: 'gh', command: 'npx', args: ['-y', 'srv'], env: { TOKEN: 'x' } } }] });
  assert.deepEqual(patches.slice(1), [{ id: 'tool-web', disabled: true }, { id: 'skill-filesystem', config: { customSkillDirs: ['/a/skills', '/b'] } }]);
  assert.deepEqual(JSON.parse(JSON.stringify(patches)), patches);
  // Turning back on writes disabled:false, which also wins over an earlier layer's disable.
  state = setRowEnabled(state, { id: 'tool-web', enabled: true }, entries);
  assert.deepEqual(renderOverlay(state).find(patch => patch.id === 'tool-web'), { id: 'tool-web', disabled: false });
  // Inserted rows carry their own flag and can be removed; others cannot.
  state = setRowEnabled(state, { id: 'cd-mcp-gh', enabled: false }, []);
  assert.equal(renderOverlay(state)[0].insert[0].disabled, true);
  state = removeInsert(state, 'cd-mcp-gh');
  assert.equal(state.inserts.length, 0);
  assert.throws(() => removeInsert(state, 'tool-web'), /Only items added/);
  state = setSkillDirs(state, []);
  assert.equal('skill-filesystem' in state.rows, false);
  assert.equal(overlayEmpty(normalizeOverlay({ rows: { bad: 'x', 'tool-x': {} }, inserts: [{ id: 'a' }] })), true, 'malformed rows are dropped');
});

test('mcpInsert validates name, transport, command, env and URL; duplicates refused', () => {
  assert.throws(() => mcpInsert({ serverName: 'bad name', transport: 'stdio', command: 'x' }), /server name/);
  assert.throws(() => mcpInsert({ serverName: 'a', transport: 'ws' }), /stdio or HTTP/);
  assert.throws(() => mcpInsert({ serverName: 'a', transport: 'stdio', command: ' ' }), /command/);
  assert.throws(() => mcpInsert({ serverName: 'a', transport: 'stdio', command: 'x', env: { 'BAD-NAME': '1' } }), /NAME=value/);
  assert.throws(() => mcpInsert({ serverName: 'a', transport: 'streamable-http', url: 'file:///etc' }), /http/);
  const http = mcpInsert({ serverName: 'remote', transport: 'streamable-http', url: ' https://example.com/mcp ' });
  assert.deepEqual(http.inserts[0].config, { transport: 'streamable-http', serverName: 'remote', url: 'https://example.com/mcp' });
  assert.throws(() => mcpInsert({ serverName: 'remote', transport: 'streamable-http', url: 'https://x.dev' }, http), /already exists/);
  assert.throws(() => mcpInsert({ serverName: 'docs', transport: 'streamable-http', url: 'https://x.dev', existingNames: ['docs'] }), /already exists/);
});

test('hooks, managed rows (C5 seam), env lines and argument splitting', () => {
  assert.throws(() => hooksInsert({}, { format: 'zsh', configPath: '/a.json' }), /Claude Code or Codex/);
  assert.throws(() => hooksInsert({}, { format: 'codex', configPath: 'rel.json' }), /hooks .json/);
  const hooks = hooksInsert({}, { format: 'claude-code', configPath: '/u/.claude/settings.json' });
  assert.equal(hooks.inserts.length, 1);
  assert.match(hooks.inserts[0].id, /^cd-hooks-claude-code-[0-9a-f]{8}$/);
  assert.deepEqual({ ...hooks.inserts[0], id: undefined }, { id: undefined, name: '@deepseek-ai/dsh-hooks-claude-code', config: { configPath: '/u/.claude/settings.json' } });
  // A second file gets its own row; the same file again replaces its row.
  let two = hooksInsert(hooks, { format: 'claude-code', configPath: '/proj/.claude/settings.json' });
  assert.equal(two.inserts.length, 2);
  two = hooksInsert(two, { format: 'claude-code', configPath: '/u/.claude/settings.json' });
  assert.deepEqual(two.inserts.map(item => item.config.configPath).sort(), ['/proj/.claude/settings.json', '/u/.claude/settings.json']);
  let managed = setManagedRow({}, 'llm-pi-ai', { config: { providers: {} } });
  assert.deepEqual(managed.rows['llm-pi-ai'], { config: { providers: {} } });
  managed = setManagedRow(managed, 'llm-pi-ai', null);
  assert.deepEqual(managed.rows, {});
  assert.throws(() => setManagedRow({}, 'codex-app-server', { disabled: true }), /belongs to OpenClaude Desktop/);
  assert.deepEqual(parseEnvLines('A=1\n# note\n\n B = two=2 '), { A: '1', B: ' two=2' });
  assert.throws(() => parseEnvLines('nope'), /NAME=value/);
  assert.deepEqual(splitArgs(`-y "@scope/pkg name" '' x`), ['-y', '@scope/pkg name', '', 'x']);
  assert.throws(() => splitArgs('"open'), /quote/);
});

test('harnessView merges the running profile with the overlay: pending inserts, desired switches, bundles and Other plugins', () => {
  const view = harnessView({
    profile: {
      entries: [
        { id: 'tool-web', module: '@deepseek-ai/dsh-tool-web', disabled: false, kind: 'tool', bundle: '@deepseek-ai/dsh-base' },
        { id: 'system-prompt', module: '@deepseek-ai/dsh-system-prompt', disabled: false, kind: 'core', bundle: '@deepseek-ai/dsh-base' },
        { id: 'skill-filesystem', module: '@deepseek-ai/dsh-skill-filesystem', disabled: false, kind: 'skill', customSkillDirs: ['/from/user/patch'] },
        { id: 'mine', module: 'file:///p/plugin.js', disabled: false, kind: 'core' },
      ],
      bundles: [{ name: '@deepseek-ai/dsh-base', rowIds: ['tool-web', 'system-prompt'] }],
    },
    overlay: { rows: { 'tool-web': { disabled: true } }, inserts: [{ id: 'cd-mcp-gh', name: '@deepseek-ai/dsh-mcp-client', config: { serverName: 'gh', transport: 'stdio' } }] },
  });
  const web = view.bundles[0].entries.find(entry => entry.id === 'tool-web');
  assert.deepEqual([web.disabled, web.pending], [true, true]);
  assert.equal(view.bundles[0].switchable, 1);
  assert.deepEqual(view.bundles.map(bundle => bundle.name), ['@deepseek-ai/dsh-base', 'Other plugins']);
  assert.deepEqual(view.mcp.map(entry => [entry.serverName, entry.added, entry.pending]), [['gh', true, true]]);
  assert.deepEqual(view.skillDirs, ['/from/user/patch'], 'without an overlay row the running folders show');
  assert.equal(view.overlayEmpty, false);
  assert.ok(view.insertIds.has('cd-mcp-gh'));
});

// ------------------------------------------------------------- main module

function fixture({ engine = 'deepseek-harness', response, preferences = {} } = {}) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'harness-profile-'));
  fs.writeFileSync(path.join(root, 'preferences.json'), JSON.stringify(preferences));
  const opened = [], requests = [];
  const client = {
    serverInfo: engine ? { engine } : { },
    request: async (method, params) => {
      requests.push(method);
      if (typeof response === 'function') return response(method, params);
      return response ?? { patchPath: '/p/cordis.patch.yml', profileDir: '/p', bundles: [], entries: [{ id: 'tool-web', module: '@deepseek-ai/dsh-tool-web', disabled: false, kind: 'tool' }] };
    },
  };
  const state = { client, config: undefined };
  const env = { CODE_DESKTOP_CORE_PATCHES: '/launch/extra.yml' };
  const harness = createHarnessProfile({
    app: { getPath: () => root }, shell: { openPath: async target => { opened.push(target); return ''; } },
    dialog: { showOpenDialog: async () => ({ canceled: false, filePaths: ['/picked/dir'] }) },
    getConfig: () => state.config, getClient: () => state.client, env,
  });
  return { root, harness, env, opened, requests, state, dir: path.join(root, 'harness') };
}

test('main: writes overlay.json + overlay.patch.yml, keeps CODE_DESKTOP_CORE_PATCHES current, pending until a new client', async () => {
  const f = fixture();
  assert.equal(f.env.CODE_DESKTOP_CORE_PATCHES, '/launch/extra.yml', 'nothing of ours before the first change');
  let read = await f.harness.run({ op: 'read' });
  assert.equal(read.connected, true);
  assert.equal(read.pending, false);
  read = await f.harness.run({ op: 'set-enabled', id: 'tool-web', enabled: false });
  assert.equal(read.pending, true);
  const overlay = path.join(f.dir, 'overlay.patch.yml');
  const text = fs.readFileSync(overlay, 'utf8');
  assert.match(text, /^# Managed by OpenClaude Desktop/);
  assert.deepEqual(JSON.parse(text.replace(/^#.*\n/, '')), [{ id: 'tool-web', disabled: true }]);
  assert.deepEqual(f.env.CODE_DESKTOP_CORE_PATCHES.split(path.delimiter), ['/launch/extra.yml', overlay]);
  await assert.rejects(f.harness.run({ op: 'set-enabled', id: 'system-prompt', enabled: false }), /can’t be turned off/);
  // A reconnect creates a new client: pending clears.
  f.state.client = { ...f.state.client };
  read = await f.harness.run({ op: 'read' });
  assert.equal(read.pending, false);
  // Reset removes the rendered overlay and our env entry.
  read = await f.harness.run({ op: 'reset-overlay' });
  assert.equal(fs.existsSync(overlay), false);
  assert.equal(f.env.CODE_DESKTOP_CORE_PATCHES, '/launch/extra.yml');
  assert.equal(read.pending, true);
});

test('main: edit-user-patch seeds a parseable example; overlayEnabled:false drops both overlays from the env', async () => {
  const f = fixture();
  await f.harness.run({ op: 'mcp-add', serverName: 'docs', transport: 'streamable-http', url: 'https://example.com/mcp' });
  await f.harness.run({ op: 'edit-user-patch' });
  const user = path.join(f.dir, 'user.patch.yml');
  assert.deepEqual(f.opened, [user]);
  const example = fs.readFileSync(user, 'utf8');
  assert.match(example, /^\[\]$/m, 'the seeded file is an empty YAML list until edited');
  assert.match(example, /# - id: tool-web\n#   disabled: true/);
  assert.deepEqual(f.env.CODE_DESKTOP_CORE_PATCHES.split(path.delimiter), ['/launch/extra.yml', path.join(f.dir, 'overlay.patch.yml'), user]);
  f.state.config = { harnessProfile: { overlayEnabled: false } };
  const read = await f.harness.run({ op: 'sync' });
  assert.equal(f.env.CODE_DESKTOP_CORE_PATCHES, '/launch/extra.yml');
  assert.equal(read.overlayEnabled, false);
  assert.equal(read.pending, true, 'turning overlays off needs a restart');
  await f.harness.run({ op: 'open-folder', which: 'app' });
  await f.harness.run({ op: 'open-folder', which: 'profile' });
  assert.deepEqual(f.opened.slice(1), [f.dir, '/p']);
  assert.deepEqual(await f.harness.run({ op: 'pick-skill-dir' }), { path: '/picked/dir' });
  await assert.rejects(f.harness.run({ op: 'nope' }), /Unknown/);
});

test('main: cold start reports the configured core; overlaySuspect only when overlays changed since a core last ran', async () => {
  const f = fixture();
  let read = await f.harness.run({ op: 'read' });
  assert.deepEqual([read.configuredEngine, read.overlaySuspect], ['deepseek', false]);
  assert.ok(fs.existsSync(path.join(f.dir, 'last-start.json')), 'a running DeepSeek core is recorded');
  const user = path.join(f.dir, 'user.patch.yml');
  fs.writeFileSync(user, '[]\n');
  const past = new Date(Date.now() - 60_000), future = new Date(Date.now() + 60_000);
  fs.utimesSync(user, past, past);
  // An unrelated disconnect: overlays unchanged since the core last ran.
  f.state.client = { request: async () => ({}) };
  read = await f.harness.run({ op: 'read' });
  assert.deepEqual([read.connected, read.configuredEngine, read.overlaySuspect], [false, 'deepseek', false]);
  // The patch was edited after that start: the overlays are the likely cause.
  fs.utimesSync(user, future, future);
  read = await f.harness.run({ op: 'read' });
  assert.equal(read.overlaySuspect, true);
  f.state.config = { harnessProfile: { overlayEnabled: false } };
  assert.equal((await f.harness.run({ op: 'read' })).overlaySuspect, false, 'not with overlays off');
  f.env.CODE_DESKTOP_CORE = 'codex';
  assert.equal((await f.harness.run({ op: 'read' })).configuredEngine, 'codex');
  // Every other core reports its own id (never 'deepseek'), so a ZCode or OpenCode that is down doesn't get the
  // DeepSeek Harness profile editor; an unknown id starts the built-in core, like codex.cjs chosenCore.
  for (const id of ['zcode', 'opencode', 'mimo', 'kimi']) {
    f.env.CODE_DESKTOP_CORE = id;
    assert.equal((await f.harness.run({ op: 'read' })).configuredEngine, id, id);
  }
  f.env.CODE_DESKTOP_CORE = 'no-such-core';
  assert.equal((await f.harness.run({ op: 'read' })).configuredEngine, 'deepseek');
  delete f.env.CODE_DESKTOP_CORE;
  f.state.config = { harnessProfile: { overlayEnabled: false }, core: 'zcode' };
  assert.equal((await f.harness.run({ op: 'read' })).configuredEngine, 'zcode', 'Settings › Cores choice');
  f.env.CODE_DESKTOP_CORE = 'codex';
  f.env.CODEX_BINARY = '/fixture/server';
  assert.equal((await f.harness.run({ op: 'read' })).configuredEngine, 'override');
  // First launch ever with a bad overlay: no recorded start, so it is suspect.
  const cold = fixture();
  cold.state.client = undefined;
  await cold.harness.run({ op: 'mcp-add', serverName: 'docs', transport: 'streamable-http', url: 'https://example.com/mcp' });
  read = await cold.harness.run({ op: 'read' });
  assert.deepEqual([read.connected, read.configuredEngine, read.overlaySuspect], [false, 'deepseek', true]);
});

test('main: preferences.json is read before config loads; Codex and old cores are unsupported; C5 env seam', async () => {
  const off = fixture({ preferences: { harnessProfile: { overlayEnabled: false } } });
  fs.mkdirSync(off.dir, { recursive: true });
  fs.writeFileSync(path.join(off.dir, 'user.patch.yml'), '[]\n');
  off.harness.syncEnv();
  assert.equal(off.env.CODE_DESKTOP_CORE_PATCHES, '/launch/extra.yml', 'a saved overlayEnabled:false holds from the first spawn');

  const codex = fixture({ engine: null });
  codex.state.client.serverInfo = { userAgent: 'codex' };
  const codexRead = await codex.harness.run({ op: 'read' });
  assert.deepEqual([codexRead.unsupported, codexRead.reason], [true, 'engine']);
  assert.deepEqual(codex.requests, [], 'nothing is sent to a Codex core');

  const old = fixture({ response: () => { const error = new Error('not supported'); error.code = -32601; throw error; } });
  const oldRead = await old.harness.run({ op: 'read' });
  assert.deepEqual([oldRead.unsupported, oldRead.reason], [true, 'method']);

  const disconnected = fixture();
  disconnected.state.client = undefined;
  assert.equal((await disconnected.harness.run({ op: 'read' })).connected, false);

  const f = fixture();
  f.harness.setCoreEnv('MY_PROVIDER_KEY', 'v');
  assert.equal(f.env.MY_PROVIDER_KEY, 'v');
  assert.deepEqual(f.harness.coreEnvKeys(), { MY_PROVIDER_KEY: 'v' });
  f.harness.setCoreEnv('MY_PROVIDER_KEY', null);
  assert.equal('MY_PROVIDER_KEY' in f.env, false);
  assert.throws(() => f.harness.setCoreEnv('bad key', 'x'), /Invalid/);
  await f.harness.setManagedRow('llm-pi-ai', { config: { providers: { x: {} } } });
  assert.deepEqual(JSON.parse(fs.readFileSync(path.join(f.dir, 'overlay.json'), 'utf8')).rows, { 'llm-pi-ai': { config: { providers: { x: {} } } } });
  await f.harness.removeManagedRow('llm-pi-ai');
  assert.equal(fs.existsSync(path.join(f.dir, 'overlay.patch.yml')), false);
});

// ------------------------------------------------------------- page render

test('Settings › Harness page: Codex notice, unsupported notice, groups, Required rows, pending banner and recovery', async () => {
  const appRoot = path.resolve(import.meta.dirname, '..');
  require(path.join(appRoot, 'node_modules/react-dom')).createPortal = children => children;
  globalThis.document ??= { body: { nodeType: 1 }, documentElement: { dataset: {} } };
  const React = (await import('react')).default;
  const { renderToStaticMarkup: render } = await import('react-dom/server');
  const { createServer } = await import('vite'), react = (await import('@vitejs/plugin-react')).default;
  const server = await createServer({ configFile: false, root: appRoot, plugins: [react()], server: { middlewareMode: true, hmr: false, watch: null }, appType: 'custom', logLevel: 'error' });
  try {
    const { SourceHarnessSettings } = await server.ssrLoadModule('/src/source-settings-harness.jsx');
    const page = (props) => render(React.createElement(SourceHarnessSettings, { config: {}, boot: { connected: true }, engine: 'deepseek', busy: false,
      desktopCall: async () => ({}), onSave: async () => ({}), onReconnect: async () => {}, ...props }));
    assert.match(page({ engine: 'codex' }), /apply with DeepSeek Harness/);
    assert.match(page({ initialState: { connected: true, unsupported: true } }), /doesn’t report its Harness profile/);
    const state = {
      connected: true, pending: true, overlayEnabled: true, paths: { userExists: false },
      overlay: { rows: { 'tool-web': { disabled: true } }, inserts: [{ id: 'cd-mcp-gh', name: '@deepseek-ai/dsh-mcp-client', config: { serverName: 'gh', transport: 'stdio' } }] },
      profile: { profileDir: '/p', entries: [
        { id: 'tool-web', module: '@deepseek-ai/dsh-tool-web', disabled: false, kind: 'tool', phase: 'active' },
        { id: 'system-prompt', module: '@deepseek-ai/dsh-system-prompt', disabled: false, kind: 'core', phase: 'active' },
        { id: 'cd-hooks-codex', module: '@deepseek-ai/dsh-hooks-codex', disabled: false, kind: 'hook', configPath: '/u/hooks.json', phase: 'failed' },
      ], bundles: [{ name: '@deepseek-ai/dsh-base', rowIds: ['tool-web', 'system-prompt'] }] },
    };
    const html = page({ initialState: state });
    for (const title of ['Profile', 'Plugins and bundles', 'MCP servers', 'Skill folders', 'Hooks']) assert.ok(html.includes(`>${title}</h3>`), title);
    for (const label of ['Open profile folder', 'Edit profile patch', 'Open app overlay', 'Restart core', 'Reset overlay', 'Add server', 'Add folder…', 'Add Claude Code hooks…'])
      assert.ok(html.includes(label), label);
    assert.match(html, /Restart the core to apply your changes/);
    assert.match(html, /data-setting-id="harness-row-cd-mcp-gh"/);
    assert.match(html, /Added in OpenClaude Desktop · Applies after restart/);
    assert.match(html, /\/u\/hooks\.json · Failed to start/);
    assert.match(html, /aria-label="Use overlays"[^>]*aria-checked="true"/);
    // Recovery replaces the banner when the core is down with overlays in play.
    const down = page({ initialState: { ...state, connected: false, overlaySuspect: true }, boot: { connected: false } });
    assert.match(down, /didn’t start with your profile changes/);
    assert.ok(down.includes('Restart without overlay'));
    assert.equal(down.includes('Restart the core to apply'), false);
    // A disconnect the overlays didn't cause gets the neutral notice; the
    // Profile group's Use overlays and Reset overlay still recover.
    const neutral = page({ initialState: { ...state, connected: false, overlaySuspect: false }, boot: { connected: false } });
    assert.equal(neutral.includes('didn’t start with your profile changes'), false);
    assert.match(neutral, /The DeepSeek core isn’t connected/);
    // Cold start: the core never started, so boot has no core (engine 'codex');
    // main's configuredEngine still shows the page and the recovery.
    const cold = { connected: false, profile: null, configuredEngine: 'deepseek', overlaySuspect: true, overlayEnabled: true, pending: false,
      paths: { userExists: true }, overlay: { rows: {}, inserts: [{ id: 'cd-mcp-gh', name: '@deepseek-ai/dsh-mcp-client', config: { serverName: 'gh', transport: 'stdio' } }] } };
    const coldHtml = page({ engine: 'codex', boot: { connected: false }, initialState: cold });
    assert.match(coldHtml, /didn’t start with your profile changes/);
    for (const label of ['Restart without overlay', 'Reset overlay', 'Use overlays']) assert.ok(coldHtml.includes(label), label);
    assert.ok(coldHtml.includes('>Profile</h3>'));
    assert.match(page({ engine: 'codex', boot: { connected: false }, initialState: { ...cold, configuredEngine: 'codex' } }), /apply with DeepSeek Harness/);
    // A bridge core that is down (main reports its id) gets the notice, never the DeepSeek profile editor or its recovery.
    for (const id of ['zcode', 'opencode', 'mimo']) {
      const down = page({ engine: 'codex', boot: { connected: false }, initialState: { ...cold, configuredEngine: id } });
      assert.match(down, /apply with DeepSeek Harness/, id);
      assert.equal(down.includes('didn’t start with your profile changes'), false, id);
    }
    assert.match(page({ engine: 'codex', boot: { connected: false } }), /Loading the Harness profile/);
    // Bundle buttons name their bundle.
    assert.match(html, /aria-label="Show plugins in @deepseek-ai\/dsh-base"/);
  } finally { await server.close(); }
});

test('main: concurrent overlay edits all land (a page click racing a managed-row write loses nothing)', async () => {
  const f = fixture();
  await f.harness.run({ op: 'read' });
  await Promise.all([
    f.harness.run({ op: 'set-enabled', id: 'tool-web', enabled: false }),
    f.harness.run({ op: 'skill-dirs', dirs: ['/a/skills'] }),
    f.harness.run({ op: 'hooks-add', format: 'codex', configPath: '/h/hooks.json' }),
    f.harness.setManagedRow('llm-deepseek', { config: { models: [{ id: 'm', name: 'm' }] } }),
  ]);
  const state = JSON.parse(fs.readFileSync(path.join(f.dir, 'overlay.json'), 'utf8'));
  assert.deepEqual(state.rows['tool-web'], { disabled: true });
  assert.deepEqual(state.rows['skill-filesystem'], { config: { customSkillDirs: ['/a/skills'] } });
  assert.ok(state.rows['llm-deepseek']);
  assert.equal(state.inserts.length, 1);
});
