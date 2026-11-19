import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';

// bugcheck-20261115 lane A: dialogs and CDS popups opened from Settings (.ss-backdrop z 500) lay out above it, and the
// Harness page asks before Reset overlay / an added MCP server's Remove. SSR through Vite middleware mode; no browser.
const require = createRequire(import.meta.url);
const app = path.resolve(import.meta.dirname, '..');
const source = file => fs.readFileSync(path.join(app, 'src', file), 'utf8');

test('Settings portal gives both CDS graphs (cds-core and view-tabs) the 500 base', () => {
  const layers = source('settings-layers.jsx');
  assert.match(layers, /import \{ CdsLayerProvider \} from '\.\/cds-core\.mjs';/);
  assert.match(layers, /import \{ CdsLayerProvider as ViewTabsLayerProvider \} from '\.\/generated\/view-tabs\/shared-frame-6jtSkIit\.js';/);
  assert.match(layers, /<CdsLayerProvider base=\{SETTINGS_BASE\}><ViewTabsLayerProvider base=\{SETTINGS_BASE\}>\{children\}/);
  const settings = source('source-settings.jsx');
  assert.match(settings, /return createPortal\(<SettingsCdsLayers><div className="ss-backdrop ss-settings-backdrop"/);
  assert.match(settings, /<\/div><\/SettingsCdsLayers>,document\.body\);/);
  // Codex's Import from Claude Code (ActionDialog → SourceDialog) passes the settings layer.
  assert.match(settings, /<ClaudeImportDialog open layer=\{ALLOWED_SITES_LAYER\}/);
});

test('host dialogs opened from Settings pages pass a settings layer', () => {
  const customize = source('source-customize.jsx');
  for (const marker of ['pending={skillBusy} layer={SETTINGS_CONFIRM_LAYER}', 'confirmVariant="danger" pending={busy} layer={SETTINGS_CONFIRM_LAYER}',
    'size="md" layer={SETTINGS_CONFIRM_LAYER}\n'])
    assert.ok(customize.includes(marker), marker);
  // Every SourceDialog / SourceConfirmationDialog in Customize names its layer.
  const opens = customize.match(/<Source(?:Confirmation)?Dialog\b.*\n.*/g) ?? [];
  assert.ok(opens.length >= 10);
  for (const open of opens) assert.match(open, /layer=\{SETTINGS_CONFIRM_LAYER\}/, open.slice(0, 120));
  assert.match(source('source-saved-workflows.jsx'), /<ActionDialog title=\{t\('Delete \{name\}\?', \{ name: confirm\.name \}\)\} layer=\{SETTINGS_LAYER\}/);
});

test('Harness: Add server opens in the settings confirm layer; Reset overlay and Remove wait for a confirm', async () => {
  require(path.join(app, 'node_modules/react-dom')).createPortal = children => children;
  globalThis.document ??= { cookie: '', body: { nodeType: 1 }, documentElement: { hasAttribute: () => false, getAttribute: () => null, dataset: {} }, createElement: () => ({}) };
  const React = (await import('react')).default;
  const { renderToStaticMarkup: render } = await import('react-dom/server');
  const { createServer } = await import('vite'), react = (await import('@vitejs/plugin-react')).default;
  const server = await createServer({ configFile: false, root: app, plugins: [react()], server: { middlewareMode: true, hmr: false, watch: null }, appType: 'custom', logLevel: 'error' });
  try {
    const { AddServerDialog, SourceHarnessSettings } = await server.ssrLoadModule('/src/source-settings-harness.jsx');
    const dialog = render(React.createElement(AddServerDialog, { onClose() {}, onAdd: async () => {} }));
    assert.match(dialog, /--cds-portal-z:560;--cds-layer-base:520/);
    const calls = [];
    const html = render(React.createElement(SourceHarnessSettings, { config: {}, boot: { connected: true }, engine: 'deepseek', busy: false,
      desktopCall: async (_, params) => { calls.push(params.op); return {}; }, onSave: async () => ({}), onReconnect: async () => {},
      initialState: { connected: true, overlayEnabled: true, paths: { userExists: false },
        overlay: { rows: {}, inserts: [{ id: 'cd-mcp-gh', name: '@deepseek-ai/dsh-mcp-client', config: { serverName: 'gh', transport: 'stdio' } }] },
        profile: { profileDir: '/p', entries: [], bundles: [] } } }));
    assert.ok(html.includes('Reset overlay'));
    assert.equal(html.includes('Reset the app overlay?'), false, 'no confirm until asked');
    assert.deepEqual(calls.filter(op => op !== 'read'), []);
  } finally { await server.close(); }
  // The destructive ops only run from the confirm (setConfirming's run), never straight from the row buttons.
  const harness = source('source-settings-harness.jsx');
  for (const op of ["{ op: 'reset-overlay' }", "op: 'mcp-remove'"])
    for (const at of harness.split(op).slice(0, -1)) assert.match(at.slice(-260), /setConfirming\(\{ kind: '(?:reset|recover|mcp)'/, op);
  assert.match(harness, /<SourceConfirmationDialog layer=\{SETTINGS_CONFIRM_LAYER\} confirmVariant="danger"/);
});

test('Codex beta restart notice follows main\'s restartPending, falling back to the local flag', () => {
  const settings = source('source-settings.jsx');
  assert.match(settings, /\.\.\.\(\(codexFeatures\.restartPending\?\?codexRestart\)\?\[row\('codex-beta-restart'/);
  assert.match(settings, /setCodexFeatures\(current=>current&&\{\.\.\.current,restartPending:false\}\);customize\?\.onRestartCore\?\.\(\);/);
});

test('SettingsCdsLayers sets the 500 base in both layer contexts (cds-core and view-tabs are different contexts)', async () => {
  require(path.join(app, 'node_modules/react-dom')).createPortal = children => children;
  globalThis.document ??= { cookie: '', body: { nodeType: 1 }, documentElement: { hasAttribute: () => false, getAttribute: () => null, dataset: {} }, createElement: () => ({}) };
  const React = (await import('react')).default;
  const { renderToStaticMarkup: render } = await import('react-dom/server');
  const { createServer } = await import('vite'), react = (await import('@vitejs/plugin-react')).default;
  const server = await createServer({ configFile: false, root: app, plugins: [react()], server: { middlewareMode: true, hmr: false, watch: null }, appType: 'custom', logLevel: 'error' });
  try {
    const { SettingsCdsLayers } = await server.ssrLoadModule('/src/settings-layers.jsx');
    const core = await server.ssrLoadModule('/src/cds-core.mjs');
    const viewTabs = await server.ssrLoadModule('/src/generated/view-tabs/shared-frame-6jtSkIit.js');
    const Probe = () => React.createElement('i', null, `${core.useCdsLayerAwareZIndex(40)}/${viewTabs.useCdsLayerAwareZIndex(40)}`);
    assert.equal(render(React.createElement(Probe)), '<i>40/40</i>');
    assert.equal(render(React.createElement(SettingsCdsLayers, null, React.createElement(Probe))), '<i>540/540</i>');
    // One graph's provider alone leaves the other at 0 (report §4: cds-core's provider doesn't reach view-tabs parts).
    assert.equal(render(React.createElement(core.CdsLayerProvider, { base: 500 }, React.createElement(Probe))), '<i>540/40</i>');
  } finally { await server.close(); }
});
