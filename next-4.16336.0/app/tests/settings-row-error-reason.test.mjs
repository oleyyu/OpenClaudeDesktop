// Settings › Cores: a failed download, switch or removal is an action's failure, not a failed save. Its rows show the
// reason core-manager gave ("<url> answered 404."), where a preference row keeps "Couldn’t save the setting. Try again."
// with the reason only in the title.
import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createServer } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';
import fs from 'node:fs';

const root = path.resolve(import.meta.dirname, '..');
let server, Kit;
before(async () => {
  server = await createServer({ configFile: false, root, plugins: [react()], server: { middlewareMode: true, hmr: false, watch: null }, appType: 'custom', logLevel: 'error' });
  Kit = await server.ssrLoadModule('/src/source-settings-kit.jsx');
});
after(async () => { await server?.close(); });

const reason = 'https://example.test/opencode-darwin-arm64.zip answered 404.';
const group = (extra = {}) => renderToStaticMarkup(React.createElement(Kit.SettingsGroup, { title: 'Cores', rowErrors: { 'core-opencode': reason },
  rows: [Kit.settingRow('core-opencode', 'OpenCode', 'A core', null)], ...extra }));

test('SettingsGroup showErrorReason: the row shows the action’s own reason as an alert, never the failed-save copy', () => {
  const html = group({ showErrorReason: true });
  assert.match(html, /<span class="ss-row-error" role="alert" data-error-reason="">https:\/\/example\.test\/opencode-darwin-arm64\.zip answered 404\.<\/span>/);
  assert.doesNotMatch(html, /Couldn’t save the setting/);
});

test('SettingsGroup without showErrorReason keeps the failed-save copy, the reason in the title', () => {
  const html = group();
  assert.match(html, /<span class="ss-row-error" title="https:\/\/example\.test\/opencode-darwin-arm64\.zip answered 404\.">Couldn’t save the setting\. Try again\.<\/span>/);
  assert.doesNotMatch(html, /role="alert"/);
});

test('Settings › Cores asks for the reason on both of its groups', () => {
  const source = fs.readFileSync(path.join(root, 'src/source-settings-cores.jsx'), 'utf8');
  assert.match(source, /<SettingsGroup title=\{t\('Cores'\)\} rowErrors=\{rowErrors\} showErrorReason rows=/);
  assert.match(source, /<SettingsGroup title=\{t\('Extension packs'\)\} rowErrors=\{rowErrors\} showErrorReason rows=/);
});
