import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createServer } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';
import zhCN from '../electron/i18n/zh-CN/index.mjs';

// Settings › Profiles is applied only by a core with capabilities.toolSelection (main.cjs sends codeDesktop.tools to no
// other core), so elsewhere nothing new can be created or made the default (round-2 walk b2).
let server, P;
before(async () => {
  server = await createServer({ configFile: false, root: path.resolve(import.meta.dirname, '..'), plugins: [react()],
    server: { middlewareMode: true, hmr: false, watch: null }, appType: 'custom', logLevel: 'error' });
  P = await server.ssrLoadModule('/src/source-settings-tool-profiles.jsx');
});
after(() => server?.close());
const profiles = [{ id: 'p1', name: 'Read-only', tools: { disabledTools: ['shell'] } }, { id: 'p2', name: 'Docs', tools: null }];
const page = (boot, config = {}) => renderToStaticMarkup(React.createElement(P.SourceToolProfilesSettings, {
  config: { toolProfiles: profiles, defaultToolProfile: 'p1', ...config }, boot, desktopCall: () => new Promise(() => {}), onSave: async () => ({}) }));
const button = (html, label) => new RegExp(`<button[^>]*>(?:(?!</button>).)*${label}(?:(?!</button>).)*</button>`).exec(html)?.[0] ?? '';
const switches = html => [...html.matchAll(/<button[^>]*role="switch"[^>]*>/g)].map(match => match[0]);

test('Codex (no toolSelection): New profile is disabled and only the current default can be switched off; the copy names Codex', () => {
  const html = page({ connected: true, models: [], core: { engine: 'codex', capabilities: {} } });
  assert.match(button(html, 'New profile'), / disabled=""/);
  assert.match(html, /Codex can’t turn tools off, so profiles don’t apply to its sessions/);
  const [current, other] = switches(html);
  assert.doesNotMatch(current, / disabled=""/, 'the current default can still be turned off');
  assert.match(other, / disabled=""/, 'no new default on a core that ignores profiles');
});
test('a core that reports or implies toolSelection keeps everything enabled', () => {
  for (const core of [{ engine: 'deepseek', capabilities: { toolSelection: true } }, { engine: 'opencode', capabilities: {} }, { engine: 'zcode', capabilities: {} }]) {
    const html = page({ connected: true, models: [], core });
    assert.doesNotMatch(button(html, 'New profile'), / disabled=""/, core.engine);
    assert.ok(switches(html).every(tag => !/ disabled=""/.test(tag)), core.engine);
  }
});
test('while the core is not running the page says so instead of blaming the core', () => {
  const html = page({ connected: false, models: [] }, { core: 'deepseek' });
  assert.match(html, /Profiles become available once the core is running\./);
  assert.match(button(html, 'New profile'), / disabled=""/);
});
test('zh-CN covers the new Profiles copy with the same placeholders', () => {
  for (const key of ['{core} can’t turn tools off, so profiles don’t apply to its sessions. Choose another core in Settings › Cores to use them.', 'Profiles become available once the core is running.']) {
    assert.equal(typeof zhCN[key], 'string', key);
    assert.deepEqual(zhCN[key].match(/\{\w+\}/g) || [], key.match(/\{\w+\}/g) || [], key);
  }
});

// A profile saved under another core (or with a model this core no longer lists) keeps its model: the editor's Model
// select shows it instead of a blank trigger, as the Codex subagent model select does.
test('profile editor: a saved model the running core does not list is still an item of the Model select', () => {
  const models = [{ model: 'gpt-5', displayName: 'GPT-5' }];
  assert.deepEqual(P.profileModelItems(models, 'deepseek-chat').map(item => item.value), ['', 'gpt-5', 'deepseek-chat']);
  assert.deepEqual(P.profileModelItems(models, 'gpt-5').map(item => item.value), ['', 'gpt-5']);
  assert.deepEqual(P.profileModelItems(models, '').map(item => item.value), ['', 'gpt-5']);
});
