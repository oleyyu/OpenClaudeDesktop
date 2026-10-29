import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import path from 'node:path';

// The seams between the main process, the renderer hub and the Settings pages: what main.jsx passes to Settings
// and the sidebar, the core-command RPCs main must allow (and how the renderer calls them), the Dynamic workflows
// gate, the sign-in provider account-operations records for Settings, and the pricing gate both sides share.
const app = path.resolve(import.meta.dirname, '..');
const require = createRequire(path.join(app, 'package.json'));
require('react-dom').createPortal = children => children;
globalThis.innerWidth = 1200;
// D21: the Settings import graph reaches view-tabs, whose preload-helper calls document.createElement at evaluation.
globalThis.document ??= { body: { nodeType: 1 }, documentElement: { dataset: {}, getAttribute: () => null }, createElement: () => ({}) };
const read = file => readFileSync(path.join(app, file), 'utf8');
let server, React, render, Settings, account, i18n;
before(async () => {
  React = (await import('react')).default;
  ({ renderToStaticMarkup: render } = await import('react-dom/server'));
  const { createServer } = await import('vite'), react = (await import('@vitejs/plugin-react')).default;
  server = await createServer({ configFile: false, root: app, plugins: [react()],
    server: { middlewareMode: true, hmr: false, watch: null }, appType: 'custom', logLevel: 'error' });
  ({ SourceSettings: Settings } = await server.ssrLoadModule('/src/source-settings.jsx'));
  account = await server.ssrLoadModule('/src/source-account-settings.jsx');
  i18n = await server.ssrLoadModule('/electron/i18n/index.mjs');
});
after(() => { i18n?.setLocale('en-US'); return server?.close(); });

const page = (initialSection, { config = {}, boot = {}, ...props } = {}) => render(React.createElement(Settings, { open: true, config: { threadIds: [], ...config },
  model: 'm', effort: 'medium', permission: 'ask', boot: { connected: true, models: [], ...boot }, busy: false, initialSection,
  desktopCall: async () => ({}), onSave: async () => ({}), onClose() {}, ...props }));

test('main.cjs allows the core-command RPCs, checks their session and validates execute like turn/start', () => {
  const main = read('electron/main.cjs');
  for (const method of ['codeDesktop/commands/list', 'codeDesktop/commands/execute'])
    assert.match(main, new RegExp(`^\\s*"${method.replace(/\//g, '\\/')}",`, 'm'), `${method} is allowlisted`);
  assert.match(main, /p\.method === "codeDesktop\/commands\/execute" && \(typeof params\.threadId !== "string" \|\| !config\.threadIds\.includes\(params\.threadId\)\)\) throw new Error\("Unknown session\."\)/);
  assert.match(main, /p\.method === "codeDesktop\/commands\/list" && params\.threadId !== undefined/);
  // A command can start a model turn: an execute asking for Bypass is checked like turn/start, and carries the
  // Dynamic workflows setting.
  const lists = main.match(/\["thread\/start", "thread\/resume", "turn\/start", "codeDesktop\/thread\/permissions", "codeDesktop\/commands\/execute"\]\.includes\(p\.method\)/g) ?? [];
  assert.equal(lists.length, 2);
  // A pack install or removal renames the assistant in the menus, as a cores select does.
  assert.match(main, /const renamed = \(result\) => \{ if \(i18n\.getAssistantName\(\) !== chosenAssistant\(\)\) \{ i18n\.setAssistantName\(chosenAssistant\(\)\); installAppMenu\(\); \} return result; \};/);
  assert.match(main, /if \(p\.op === "install"\) return renamed\(/);
  assert.match(main, /if \(p\.op === "remove"\) return renamed\(/);
});

test('main.jsx: core commands carry the session permission; Settings gets coreBusy; the sidebar gets boot.core; per-token usage reaches boot.core', () => {
  const jsx = read('src/main.jsx');
  assert.match(jsx, /const \{ collaborationMode: _mode, cwd: _cwd, serviceTier: _tier, \.\.\.turn \} = turnOptions\(workdir \|\| cwd\);/);
  assert.match(jsx, /rpc\("codeDesktop\/commands\/execute", \{ \.\.\.turn, threadId: origin, command: entry\.name, args \}\)/);
  // A finished turn leaves active[id] = null: only a live turn or a waiting approval is busy (state.js hasLiveWork).
  assert.match(jsx, /coreBusy=\{hasLiveWork\(state\) \|\| sending \|\| actionPending\}/);
  assert.match(jsx, /<SourceSidebar[\s\S]*?engine=\{boot\?\.core \|\| engine\}/);
  assert.match(jsx, /data\.limits\?\.codeDesktop\?\.perTokenBilling === true/);
});

test('the harness bridge reports coreCommands and refuses an execute without permission params, which the renderer now sends', () => {
  const index = readFileSync(path.join(app, '..', 'harness/packages/codex-app-server/src/index.js'), 'utf8');
  assert.match(index, /coreCommands: true/);
  const commands = readFileSync(path.join(app, '..', 'harness/packages/codex-app-server/src/commands.js'), 'utf8');
  assert.match(commands, /export function requireCommandPermission/);
});

test('Dynamic workflows: one group on every core; the engine choice only where the core has its own engine', () => {
  const codex = page('code', { boot: { core: { engine: 'codex', capabilities: {} } } });
  assert.match(codex, /Let DeepSeek write scripts that run many agents|Let Codex write scripts that run many agents/);
  assert.match(codex, /no workflow engine of its own, so OpenClaude Desktop runs its workflows/);
  // Gemini CLI: no outputSchema, no engine of its own — OpenClaude Desktop's engine runs it (JSON fallback).
  const gemini = page('code', { boot: { core: { engine: 'gemini', capabilities: { structuredOutput: false } } } });
  assert.match(gemini, /write scripts that run many agents in parallel/);
  assert.doesNotMatch(gemini, /Not available with Gemini CLI yet/);
  // ZCode runs workflows natively (capabilities.modelWorkflows): its row offers the engine choice.
  const zcode = page('code', { boot: { core: { engine: 'zcode', capabilities: { structuredOutput: false } } } });
  assert.match(zcode, /runs workflows with its own engine and tools/);
  assert.doesNotMatch(zcode, /Bypass permissions mode, because its workflow agents/);
  // Off: only the master switch; the rest of the group is hidden.
  const off = page('code', { config: { dynamicWorkflows: false }, boot: { core: { engine: 'gemini', capabilities: { structuredOutput: false } } } });
  assert.doesNotMatch(off, /Ultracode keyword trigger/);
  i18n.setLocale('zh-CN');
  try { assert.match(page('code', { boot: { core: { engine: 'gemini', capabilities: { structuredOutput: false } } } }), /工作流引擎/); }
  finally { i18n.setLocale('en-US'); }
});

test('account-operations records the sign-in provider; Settings marks only that row pending', async () => {
  const { createAccountOperations } = require('./electron/account-operations.cjs');
  const owner = { start: async () => {}, request: async () => ({ type: 'chatgpt', loginId: 'l1', authUrl: 'https://auth.example.test/x' }) };
  const service = createAccountOperations({ getClient: () => owner, openExternal: async () => {} });
  await service.start('chatgpt', { codeDesktop: { provider: 'openai' } });
  assert.equal(service.snapshot().login.provider, 'openai');
  const plain = createAccountOperations({ getClient: () => owner, openExternal: async () => {} });
  await plain.start('chatgpt');
  assert.equal(Object.hasOwn(plain.snapshot().login, 'provider'), false);

  // OpenCode's browser option is provider 'openai': with login.provider the row shows Open browser / Cancel.
  let rows;
  function Probe() { rows = account.useAccountSettings({ snapshot: { account: null }, auth: { phase: 'waiting', login: { type: 'chatgpt', loginId: 'l1', provider: 'openai', url: 'https://auth.example.test/x' } },
    connected: true, busy: false, engine: 'opencode', onLogin() {}, onAccountAction() {}, onRefreshAccount() {}, onOpenExternal() {} }); return null; }
  render(React.createElement(Probe));
  const browser = rows.find(row => row.id === 'signin-openai');
  assert.ok(browser, rows.map(row => row.id).join(','));
  assert.match(browser.description, /Finish signing in in your browser/);
  function Other() { rows = account.useAccountSettings({ snapshot: { account: null }, auth: { phase: 'waiting', login: { type: 'chatgpt', loginId: 'l1', provider: 'elsewhere', url: 'https://auth.example.test/x' } },
    connected: true, busy: false, engine: 'opencode', onLogin() {}, onAccountAction() {}, onRefreshAccount() {}, onOpenExternal() {} }); return null; }
  render(React.createElement(Other));
  assert.match(rows.find(row => row.id === 'signin-openai').description, /Opens your browser to sign in/);
});

test('Models page pricing and main decorate() share one gate (providerSettings or priceOverrides)', () => {
  const models = read('src/source-settings-models.jsx');
  assert.match(models, /const billed = deepseek \|\| caps\.priceOverrides === true/);
  const decorate = read('electron/model-settings.cjs');
  assert.match(decorate, /const takesPrices = client => isDeepSeek\(client\) \|\| \(!!client\?\.serverInfo && coreSupports\(client\.serverInfo, "priceOverrides"\)\);/);
  assert.match(decorate, /const isDeepSeek = client => !!client\?\.serverInfo && coreSupports\(client\.serverInfo, "providerSettings"\);/);
  // The instructions page tags itself with the core id, never an object.
  assert.match(read('src/source-settings-instructions.jsx'), /data-engine=\{coreForEngine\(typeof engine === 'string' \? engine : engine\?\.engine\)\.id\}/);
});
