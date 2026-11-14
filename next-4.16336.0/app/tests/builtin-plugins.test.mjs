import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createServer } from 'vite';
import react from '@vitejs/plugin-react';
import { BUILTIN_PLUGINS, builtinPluginRow, filterBuiltinPlugins } from '../src/builtin-plugins.mjs';

// Settings › Plugins built-in catalog: the app installs dsh-purge from its
// GitHub repository without the person typing a spec.
let server, M;
before(async () => {
  server = await createServer({ configFile: false, root: path.resolve(import.meta.dirname, '..'), plugins: [react()],
    server: { middlewareMode: true, hmr: false, watch: null }, appType: 'custom', logLevel: 'error' });
  M = await server.ssrLoadModule('/src/source-customize.jsx');
});
after(() => server?.close());

const deepseekCore = { engine: 'deepseek-harness', engineVersion: '0.2.0-rc.2', capabilities: { skillToggle: false, mcpConfigWrite: false, pluginManage: true }, configPath: '/h/profile/cordis.patch.yml' };
const noBackend = () => { throw Error('SSR may not call the backend'); };
const storeWith = ({ plugins = [] } = {}) => ({
  getSnapshot: () => ({ skills: { skills: [], errors: [], status: 'ready', cwd: '/fixture' }, plugins: { rows: plugins, status: 'ready', cwd: '/fixture' }, mcp: { rows: [], status: 'ready', cwd: '/fixture', threadId: null } }),
  subscribe: () => () => {}, loadSkills() {}, loadPlugins() {}, loadMcp() {},
  inspectPlugin() { throw Error('SSR may not call the backend'); }, installPlugin() { throw Error('SSR may not call the backend'); }, setPluginEnabled() { throw Error('SSR may not call the backend'); },
});
const page = (store, extra = {}) => renderToStaticMarkup(React.createElement(M.SourceCustomize, { section: 'customize-plugins', store, cwd: '/fixture', call: noBackend, core: deepseekCore, ...extra }));

test('the built-in catalog carries dsh-purge and a git spec the plugin manager accepts', () => {
  assert.equal(BUILTIN_PLUGINS.length, 1);
  const entry = BUILTIN_PLUGINS[0];
  assert.deepEqual([entry.id, entry.pluginName, entry.author], ['dsh-purge', 'dsh-purge', 'YuJunZhiXue']);
  assert.equal(entry.spec, 'https://github.com/YuJunZhiXue/dsh-purge');
  // install-spec.js HOSTED_REPOSITORY_URL: https://<host>/<owner>/<repo> is a git spec.
  assert.match(entry.spec, /^https?:\/\/[^/]+\/[^/]+\/[^/#]+$/);
});

test('builtinPluginRow matches the installed bundle by name, and search covers name/description/author', () => {
  const entry = BUILTIN_PLUGINS[0];
  assert.equal(builtinPluginRow(entry, []), undefined);
  const row = { id: 'profile:dsh-purge', pluginName: 'dsh-purge', name: 'dsh-purge' };
  assert.equal(builtinPluginRow(entry, [{ pluginName: 'other' }, row]), row);
  assert.equal(builtinPluginRow(entry, [{ pluginName: 'DSH-Purge', name: 'dsh-purge' }])?.pluginName, 'DSH-Purge');
  const core = 'deepseek';
  assert.equal(filterBuiltinPlugins(BUILTIN_PLUGINS, { query: 'red-team', core }).length, 1);
  assert.equal(filterBuiltinPlugins(BUILTIN_PLUGINS, { query: 'yujunzhixue', core }).length, 1);
  assert.equal(filterBuiltinPlugins(BUILTIN_PLUGINS, { query: '  ', core }).length, 1);
  assert.equal(filterBuiltinPlugins(BUILTIN_PLUGINS, { query: 'nope', core }).length, 0);
});

test('every built-in entry declares its core, and only that core lists it', () => {
  for (const entry of BUILTIN_PLUGINS) assert.equal(typeof entry.core, 'string', `${entry.id} names its core`);
  assert.deepEqual(BUILTIN_PLUGINS.map((entry) => entry.core), ['deepseek'], 'the Harness bundle is a DeepSeek Harness plugin');
  for (const core of ['codex', 'zcode', 'opencode', 'mimo', 'kimi', null]) assert.deepEqual(filterBuiltinPlugins(BUILTIN_PLUGINS, { core }), [], `${core}: none`);
});

test('BuiltinPlugins renders Install while missing, the source link, and the enable switch once installed', () => {
  const store = storeWith();
  const [entry] = BUILTIN_PLUGINS;
  const missing = renderToStaticMarkup(React.createElement(M.BuiltinPlugins, { entries: BUILTIN_PLUGINS, rows: [], store }));
  assert.match(missing, /aria-label="Built-in plugins"/);
  assert.match(missing, /data-builtin-plugin="dsh-purge" data-builtin-state="not-installed"/);
  assert.match(missing, />Built-in</);
  assert.match(missing, /https:\/\/github\.com\/YuJunZhiXue\/dsh-purge/);
  assert.match(missing, /<button[^>]*data-variant="primary"[^>]*data-size="sm"[^>]*>(?:(?!<\/button>).)*Install<\/span><\/button>/);
  assert.doesNotMatch(missing, /role="switch"/);
  assert.equal(renderToStaticMarkup(React.createElement(M.BuiltinPlugins, { entries: [], rows: [], store })), '');

  const row = { id: 'profile:dsh-purge', pluginName: 'dsh-purge', name: 'dsh-purge', enabled: false };
  const off = renderToStaticMarkup(React.createElement(M.BuiltinPlugins, { entries: [entry], rows: [row], store }));
  assert.match(off, /data-builtin-state="disabled"/);
  assert.match(off, /role="switch" aria-label="Enable plugin" aria-checked="false"/);
  assert.doesNotMatch(off, />Install</);
  const on = renderToStaticMarkup(React.createElement(M.BuiltinPlugins, { entries: [entry], rows: [{ ...row, enabled: true }], store }));
  assert.match(on, /data-builtin-state="enabled"/);
  assert.match(on, /role="switch" aria-label="Enable plugin" aria-checked="true"/);
});

test('the Plugins page shows the built-in section on a managing core and hides it on Codex', () => {
  const managing = page(storeWith());
  assert.match(managing, /data-cz-builtin=""/);
  assert.match(managing, /data-builtin-plugin="dsh-purge"/);
  // Searching still shows the matching built-in entry.
  assert.match(page(storeWith(), { focus: { searchSeed: 'purge' } }), /data-builtin-plugin="dsh-purge"/);
  // A search that matches nothing hides the built-in section and keeps the no-match line.
  const nomatch = page(storeWith(), { focus: { searchSeed: 'zzz' } });
  assert.doesNotMatch(nomatch, /data-cz-builtin/);
  assert.match(nomatch, /No plugins match your search/);
  // Codex has no codeDesktop/plugin/* manager, so it draws no built-in section (and no empty-state conflict).
  const codex = renderToStaticMarkup(React.createElement(M.SourceCustomize, { section: 'customize-plugins', store: storeWith(), cwd: '/fixture', call: noBackend }));
  assert.doesNotMatch(codex, /data-cz-builtin|Built-in plugins/);
  // A bridge that manages its own plugins never sees the Harness bundle.
  for (const engine of ['zcode', 'opencode', 'mimo']) {
    const html = page(storeWith(), { core: { engine, capabilities: { pluginManage: true }, configPath: null } });
    assert.doesNotMatch(html, /data-cz-builtin|Built-in plugins/, engine);
    assert.doesNotMatch(html, /DeepSeek Harness/, `${engine}: no DeepSeek Harness copy`);
  }
});
