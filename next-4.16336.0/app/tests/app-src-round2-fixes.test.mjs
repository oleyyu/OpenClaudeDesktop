// app/src round 2 fixes: workflow Advanced number validation (one message, not a failed save), the submenu hint
// before its caret, Customize dialog fields drawn as CDS fields, a failing connector's error and saved config, and
// session notices rendering Codex's code spans.
import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createServer } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';
import fs from 'node:fs';

const root = path.resolve(import.meta.dirname, '..');
const read = (name) => fs.readFileSync(path.join(root, 'src', name), 'utf8');
let server, W, Kit, Menu, C, N, I18n, Model, Store;
before(async () => {
  server = await createServer({ configFile: false, root, plugins: [react()], server: { middlewareMode: true, hmr: false, watch: null }, appType: 'custom', logLevel: 'error' });
  W = await server.ssrLoadModule('/src/source-settings-workflows.jsx');
  Kit = await server.ssrLoadModule('/src/source-settings-kit.jsx');
  Menu = await server.ssrLoadModule('/src/source-menu.jsx');
  C = await server.ssrLoadModule('/src/source-customize.jsx');
  N = await server.ssrLoadModule('/src/source-session-notices.jsx');
  I18n = await server.ssrLoadModule('/electron/i18n/index.mjs');
  Model = await server.ssrLoadModule('/src/customize-model.mjs');
  Store = await server.ssrLoadModule('/src/customize-store.mjs');
});
after(async () => { await server?.close(); });

const workflowRows = (rowErrors = {}, setRowErrors = () => {}) => W.workflowSettingsGroup({
  config: { dynamicWorkflows: true }, boot: { workflowParallelism: 4 }, engine: 'deepseek-harness', shownValue: (_key, saved) => saved,
  save() {}, rowErrors, setRowErrors, models: [], advanced: true, setAdvanced() {} }).rows;
const rowHtml = (rows, id, rowErrors = {}) => renderToStaticMarkup(React.createElement(Kit.SettingRow, { row: rows.find((row) => row.id === id), error: rowErrors[id] }));

test('workflow Advanced: a refused number shows one validation message, never "Couldn’t save the setting"', () => {
  // The commit handler files the message under its own key, so SettingRow's failed-save line stays off.
  let errors = {};
  const setRowErrors = (update) => { errors = typeof update === 'function' ? update(errors) : update; };
  const field = workflowRows(errors, setRowErrors).find((row) => row.id === 'workflowMaxConcurrentAgents').control;
  let reverted = 0;
  field.props.onCommit('0', () => { reverted++; });
  assert.equal(reverted, 1, 'the field goes back to the saved value');
  assert.deepEqual(Object.keys(errors), ['workflowMaxConcurrentAgents:invalid']);
  const rows = workflowRows(errors, setRowErrors);
  const html = rowHtml(rows, 'workflowMaxConcurrentAgents', errors);
  assert.equal((html.match(/class="ss-row-error/g) || []).length, 1, html);
  assert.match(html, /<span class="ss-row-error" data-validation="" role="alert">Enter a whole number from 1 to 256\.<\/span>/);
  assert.doesNotMatch(html, /Couldn’t save the setting/);
  assert.doesNotMatch(html, /aria-invalid/, 'the reverted, valid value is not marked invalid');
  // Editing the field again (or saving a valid value) clears it.
  rows.find((row) => row.id === 'workflowMaxConcurrentAgents').control.props.onEdit();
  assert.deepEqual(errors, {});
  // A real failed save still shows the generic line (and marks the field invalid).
  const failed = rowHtml(workflowRows({ workflowMaxConcurrentAgents: 'disk full' }), 'workflowMaxConcurrentAgents', { workflowMaxConcurrentAgents: 'disk full' });
  assert.match(failed, /Couldn’t save the setting\. Try again\./);
  assert.doesNotMatch(failed, /data-validation/);
  // Every numeric Advanced row uses the same separate validation key.
  for (const id of ['workflowStructuredOutputRetries', 'workflowPrefixStaggerMs', 'workflowSizeWarningAgents', 'workflowSizeWarningTokens']) {
    errors = {};
    workflowRows(errors, setRowErrors).find((row) => row.id === id).control.props.onCommit('2.5', () => {});
    assert.deepEqual(Object.keys(errors), [`${id}:invalid`], id);
  }
  assert.match(read('source-settings.css'), /\.ss-row-error\[data-validation\] \{ color:var\(--cds-text-danger\)/);
});

test('a submenu trigger reads its hint before the caret, which stays last', () => {
  const html = renderToStaticMarkup(React.createElement(Menu.SourceMenu.Submenu, null,
    React.createElement(Menu.SourceMenu.SubmenuTrigger, { icon: 'MobilePhone', hint: 'Mobile · 375 × 812' }, 'Viewport')));
  const trailing = html.slice(html.indexOf('smenu-trailing'));
  assert.ok(trailing.indexOf('smenu-hint') >= 0 && trailing.indexOf('smenu-hint') < trailing.indexOf('smenu-caret'), html);
  assert.equal((html.match(/smenu-hint/g) || []).length, 1, 'the hint renders once');
});

test('Customize dialogs: text fields are CDS fields and the segmented control is not scoped to settings rows', () => {
  const css = read('source-customize.css');
  const rule = css.match(/\.cz-dialog-field > input\[data-cds=TextInput\] \{([^}]+)\}/)?.[1] ?? '';
  for (const part of ['height:var(--cds-h-control', 'padding:0 var(--cds-pad-md', 'border-radius:var(--cds-radius', 'background:var(--cds-fill-field)', 'box-shadow:inset 0 0 0 1px var(--cds-fill-field-ring)'])
    assert.ok(rule.includes(part), part);
  assert.match(css, /\.cz-dialog-field > input\[data-cds=TextInput\]:focus-visible \{ outline:none; box-shadow:var\(--cds-focus-shadow\); \}/);
  assert.match(css, /:hover:not\(:focus\):not\(\[aria-invalid=true\]\):not\(:disabled\) \{ box-shadow:inset 0 0 0 1px var\(--cds-border-strong\); \}/);
  assert.match(css, /html\[data-reduce-motion="true"\] \.cz-dialog-field/);
  assert.doesNotMatch(css, /cursor:\s*pointer/);
  assert.match(read('source-segments.css'), /^\.ss-segments\[data-cds=SegmentedControl\] button\[role=radio\] \{ position:relative;/m);
});

const readyStore = (mcp) => ({ getSnapshot: () => ({ skills: { skills: [], errors: [], status: 'ready', cwd: '/fixture' }, plugins: { rows: [], status: 'ready', cwd: '/fixture' }, mcp: { rows: mcp, status: 'ready', cwd: '/fixture', threadId: null } }),
  subscribe: () => () => {}, loadSkills() {}, loadPlugins() {}, loadMcp() {} });
const noBackend = () => { throw Error('SSR may not call the backend'); };
const drill = (rows, name, extra = {}) => renderToStaticMarkup(React.createElement(C.SourceCustomize, { section: 'customize-connectors', store: readyStore(rows), cwd: '/fixture', call: noBackend, focus: { connectorName: name }, ...extra }));

test('a failing connector shows its startup error, its saved command and Edit config, and points to Developer', () => {
  const rows = [{ id: 'echo', name: 'echo', title: 'echo-server', kind: 'unreachable', runtimeStatus: 'failed', tools: [], authStatus: 'unsupported', error: 'MCP startup failed: handshaking with MCP server failed: connection closed' }];
  const definition = { name: 'echo', command: 'nod', args: ['server.js', '--port', '1'], environmentNames: ['TOKEN'] };
  const html = drill(rows, 'echo', { mcpDefinitions: [definition], onEditConfig() {}, onNavigate() {} });
  assert.match(html, /data-connector-view="disconnected"/);
  assert.match(html, /Connection issue/);
  assert.match(html, /<code class="cz-connector-error-text">MCP startup failed: handshaking with MCP server failed: connection closed<\/code>/);
  assert.match(html, /data-cz-local-config=""/);
  assert.match(html, />nod<\/code>/);
  assert.match(html, />server\.js --port 1<\/code>/);
  assert.match(html, />TOKEN</);
  assert.match(html, /Reconnect<\/span><\/button><button type="button" data-cds="Button" data-variant="secondary"[^>]*>.*?Edit config<\/span><\/button>/);
  assert.match(html, /Open Developer settings<\/button>/);
  // Without the core's row error, the one Settings › Developer has for the server is shown.
  const fromDesktop = drill([{ ...rows[0], error: null }], 'echo', { mcpServers: [{ name: 'echo', toolsError: 'spawn nod ENOENT' }] });
  assert.match(fromDesktop, /<code class="cz-connector-error-text">spawn nod ENOENT<\/code>/);
  assert.doesNotMatch(fromDesktop, /Open Developer settings|Edit config/, 'no handlers, no buttons');
  // A connector that was never started has no issue, so no error block; its saved config still shows.
  const idle = drill([{ id: 'new', name: 'new', title: 'new', kind: 'notStarted', tools: [], authStatus: 'unsupported', error: 'old' }], 'new', { mcpDefinitions: [{ name: 'new', url: 'https://mcp.example.com/mcp' }] });
  assert.doesNotMatch(idle, /cz-connector-error/);
  assert.match(idle, /https:\/\/mcp\.example\.com\/mcp/);
  // zh-CN
  I18n.setLocale('zh-CN');
  try { assert.match(drill(rows, 'echo', { onNavigate() {} }), /打开开发者设置/); } finally { I18n.setLocale('en-US'); }
});

test('connector rows keep a startup error: listed toolsError, and the notification\'s error across the relist it schedules', async () => {
  assert.equal(Model.mcpRows({ data: [{ name: 'a', runtimeStatus: 'failed', toolsError: 'boom' }] })[0].error, 'boom');
  assert.equal(Model.mcpRows({ data: [{ name: 'a', runtimeStatus: 'failed' }] })[0].error, null);
  let listed = { data: [{ name: 'echo', runtimeStatus: 'failed' }, { name: 'ok', runtimeStatus: 'connected' }] };
  const store = Store.createCustomizeStore({ call: async (_channel, payload) => payload.operation === 'mcp' ? listed : null, setTimeout: () => 0, clearTimeout() {} });
  await store.loadMcp({ cwd: '/w', threadId: null });
  store.observe({ method: 'mcpServer/startupStatus/updated', params: { name: 'echo', status: 'failed', error: 'connection closed' } });
  assert.equal(store.getSnapshot().mcp.rows.find((row) => row.name === 'echo').error, 'connection closed');
  await store.loadMcp({ force: true });
  assert.equal(store.getSnapshot().mcp.rows.find((row) => row.name === 'echo').error, 'connection closed', 'the relist keeps it while it still fails');
  listed = { data: [{ name: 'echo', runtimeStatus: 'connected' }] };
  await store.loadMcp({ force: true });
  assert.equal(store.getSnapshot().mcp.rows[0].error, null, 'a connected server drops it');
});

test('session notices render Codex code spans as inline code, not literal backticks', () => {
  const html = renderToStaticMarkup(React.createElement(N.SourceSessionNotices, { notices: [
    { kind: 'warning', summary: 'Model metadata for `dummy` not found. Defaulting to fallback metadata; this can degrade performance and cause issues.' },
    { kind: 'config', summary: 'Invalid `model_provider` in `~/.codex/config.toml`', details: 'Set `model_providers.x.base_url`.' },
    { kind: 'warning', summary: 'A lone ` backtick stays' },
  ] }));
  assert.match(html, /<bdi>Model metadata for <code class="ssn-code">dummy<\/code> not found\. Defaulting/);
  assert.match(html, /Invalid <code class="ssn-code">model_provider<\/code> in <code class="ssn-code">~\/\.codex\/config\.toml<\/code>/);
  assert.match(html, /<p class="ssn-details"><bdi>Set <code class="ssn-code">model_providers\.x\.base_url<\/code>\.<\/bdi><\/p>/);
  assert.match(html, /A lone ` backtick stays/);
  assert.doesNotMatch(html, /`dummy`|`model_provider`/);
  assert.equal(N.noticePlainText('for `dummy` x'), 'for dummy x');
  assert.match(read('source-session-notices.css'), /\.ssn-code \{[^}]*font-family: var\(--cds-font-mono\)/);
});
