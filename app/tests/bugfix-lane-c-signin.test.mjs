import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import path from 'node:path';

// bugcheck-20261115 lane C: setup's Sign in step, Settings › Account, Home's sign-in card and the model menu after a
// sign-in, sign-out or Restart core. Server-rendered like settings-core-pages.test.mjs; effects do not run.
const app = path.resolve(import.meta.dirname, '..');
const require = createRequire(path.join(app, 'package.json'));
require('react-dom').createPortal = children => children;
globalThis.innerWidth = 1200;
globalThis.document ??= { cookie: '', body: { nodeType: 1 }, documentElement: { dataset: {}, getAttribute: () => null, hasAttribute: () => false }, createElement: () => ({}) };
const { createAccountOperations } = require('./electron/account-operations.cjs');
let server, React, render, copy, account, onboarding, i18n;
before(async () => {
  React = (await import('react')).default;
  ({ renderToStaticMarkup: render } = await import('react-dom/server'));
  const { createServer } = await import('vite'), react = (await import('@vitejs/plugin-react')).default;
  server = await createServer({ configFile: false, root: app, plugins: [react()],
    server: { middlewareMode: true, hmr: false, watch: null }, appType: 'custom', logLevel: 'error' });
  copy = await server.ssrLoadModule('/src/settings-core-copy.mjs');
  account = await server.ssrLoadModule('/src/source-account-settings.jsx');
  onboarding = await server.ssrLoadModule('/src/source-onboarding.jsx');
  i18n = await server.ssrLoadModule('/electron/i18n/index.mjs');
});
after(() => { i18n?.setLocale('en-US'); return server?.close(); });

const source = file => readFileSync(path.join(app, file), 'utf8');
const noBackend = () => { throw Error('SSR may not call the backend'); };
function rows(props) {
  let result;
  function Probe() {
    result = account.useAccountSettings({ connected: true, busy: false, onLogin: noBackend, onAccountAction: noBackend, onRefreshAccount: noBackend, onOpenExternal: noBackend, ...props });
    return React.createElement(React.Fragment, null, result.map(row => React.createElement('section', { key: row.id, 'data-row': row.id }, row.label, ' ', row.description, row.control, row.below)));
  }
  const html = render(React.createElement(Probe));
  return { rows: result, html };
}
const opencode = (version, extra = {}) => ({ engine: 'opencode', capabilities: {}, engineVersion: version, ...extra });

test('onboarding-devicecode-drops-provider: setup’s device-code buttons send their provider', () => {
  const text = source('src/source-onboarding.jsx');
  const device = text.slice(text.indexOf('(login.deviceCode ?? []).map'), text.indexOf('keys.length > 0 && <>'));
  assert.match(device, /onLogin\(option\.type \|\| "chatgptDeviceCode", option\.provider \? \{ codeDesktop: \{ provider: option\.provider \} \} : \{\}\)/);
});

function signInStep(auth, core = { id: 'opencode', name: 'OpenCode', brand: 'opencode', login: { browser: [{ provider: 'claude-agent', label: 'Claude' }] } }) {
  return render(React.createElement(onboarding.SourceOnboarding, { startAt: 'signin', desktopCall: async () => ({}), onDone: async () => {}, onSkip() {}, onCoreChosen: async () => {}, onOpenExternal() {},
    signIn: { core, auth, account: null, connected: true, onLogin: noBackend, onAccountAction: noBackend, onOpenExternal() {} } }));
}

test('onboarding-waiting-ignores-login-flags: setup’s waiting view follows connecting / openedByAgent / acceptsCode', () => {
  const plain = signInStep({ phase: 'waiting', login: { url: 'https://example.invalid/a' } });
  assert.ok(plain.includes('Open browser again') && plain.includes('Finish signing in in your browser…'));
  const connecting = signInStep({ phase: 'waiting', login: { url: 'https://code.claude.com/docs/en/setup', openedByAgent: true, connecting: true } });
  assert.ok(connecting.includes('Connecting with the sign-in already on this Mac. This can take a minute.'), connecting);
  assert.equal(/Open browser again|Open sign-in page/.test(connecting), false, 'no page to reopen while connecting');
  assert.ok(connecting.includes('Cancel'));
  const code = signInStep({ phase: 'waiting', login: { url: 'https://claude.ai/oauth', openedByAgent: true, acceptsCode: true } });
  assert.ok(code.includes('Finish signing in in the browser tab OpenCode opened.') && code.includes('Open sign-in page'));
  assert.ok(code.includes('aria-label="Code from the browser"') && code.includes('Submit code'), 'a field for the pasted code');
  assert.equal(plain.includes('Code from the browser'), false);
});

test('pendingSignIn: one wording for Settings › Account and setup', () => {
  assert.deepEqual(account.pendingSignIn({ userCode: 'AB-12' }, 'Kimi'), { text: 'Enter this code on the sign-in page.', reopen: 'Open browser' });
  assert.deepEqual(account.pendingSignIn({ connecting: true, openedByAgent: true }, 'OpenCode'), { text: 'Connecting with the sign-in already on this Mac. This can take a minute.', reopen: null });
  assert.deepEqual(account.pendingSignIn({ openedByAgent: true }, 'MiMo Code'), { text: 'Finish signing in in the browser tab MiMo Code opened.', reopen: 'Open sign-in page' });
  assert.deepEqual(account.pendingSignIn({}, 'Codex'), { text: 'Finish signing in in your browser.', reopen: 'Open browser' });
});

test('opencode2-chatgpt-devicecode-dead: no ChatGPT device code on OpenCode 2.x, kept on 1.x', () => {
  const v2 = rows({ engine: opencode('2.2.5'), snapshot: { account: null } });
  const chatgpt = v2.rows.find(row => row.id === 'signin-openai');
  assert.ok(chatgpt, 'ChatGPT row');
  assert.equal(render(React.createElement(React.Fragment, null, chatgpt.control)).includes('Use device code'), false);
  // Copilot and SuperGrok keep their device codes (descriptor login.deviceCode).
  assert.ok(v2.rows.some(row => row.id === 'device-github-copilot') && v2.rows.some(row => row.id === 'device-xai'));
  const v1 = rows({ engine: opencode('1.18.34'), snapshot: { account: null } });
  assert.ok(render(React.createElement(React.Fragment, null, v1.rows.find(row => row.id === 'signin-openai').control)).includes('Use device code'));
});

test('opencode-signout-copy-wrong-store: 2.x says only OpenClaude Desktop’s sign-ins go; 1.x and MiMo unchanged', () => {
  const v2 = copy.signOutConfirmText(opencode('2.2.5'));
  assert.match(v2, /^Sign out of OpenCode\? This removes the sign-ins and API keys OpenCode uses in OpenClaude Desktop\. Your own OpenCode sign-in in ~\/\.local\/share\/opencode stays/);
  assert.equal(/signs out too/.test(v2), false);
  assert.match(copy.signOutConfirmText(opencode('1.18.34')), /OpenCode on this Mac signs out too, including other tools that share its sign-in in ~\/\.local\/share\/opencode\.$/);
  assert.match(copy.signOutConfirmText('opencode'), /signs out too/, 'no version reported: the descriptor’s copy');
  assert.match(copy.signOutConfirmText({ engine: 'mimo', capabilities: {}, engineVersion: '2.0.0' }), /signs out too/, 'MiMo has no private store');
  assert.equal(copy.engineMajor({ engineVersion: '2.2.5' }), 2);
  assert.equal(copy.engineMajor({ engineVersion: 'v1.18' }), 1);
  assert.equal(copy.engineMajor({ engineVersion: '' }), null);
  assert.equal(copy.engineMajor('opencode'), null);
});

test('acp-signout-shown-for-apikey: no Sign out where the bridge says its sign-out can’t remove the key', () => {
  const key = (engine, detail) => rows({ engine, snapshot: { account: { type: 'apiKey' }, codeDesktop: { kind: 'apiKey', detail, canSignOut: false } } });
  for (const [engine, detail] of [['kimi', 'Provider moonshot-cn in config.toml'], ['minimax', 'MiniMax API key in config.yaml'], ['gemini', 'From GEMINI_API_KEY']]) {
    const page = key(engine, detail);
    const control = render(React.createElement(React.Fragment, null, page.rows[0].control));
    assert.equal(control.includes('Sign out'), false, `${engine}: no Sign out`);
    assert.ok(page.html.includes(`Signed in with an API key (${detail})`), `${engine}: where the key is set`);
    assert.ok(page.html.includes('Signing out here can’t remove this key.'), `${engine}: says why`);
  }
  // Qwen's sign-out removes the keys OpenClaude Desktop saved (signOutRemovesKeys), whatever canSignOut says.
  assert.ok(render(React.createElement(React.Fragment, null, key('qwen', 'Alibaba key').rows[0].control)).includes('Sign out'));
  // An OAuth sign-in (canSignOut true) and a bridge that reports nothing keep Sign out.
  const oauth = rows({ engine: 'gemini', snapshot: { account: { type: 'chatgpt', email: 'a@example.test' }, codeDesktop: { kind: 'oauth', canSignOut: true } } });
  assert.ok(render(React.createElement(React.Fragment, null, oauth.rows[0].control)).includes('Sign out'));
  const zcode = rows({ engine: 'zcode', snapshot: { account: { type: 'apiKey' } } });
  assert.ok(render(React.createElement(React.Fragment, null, zcode.rows[0].control)).includes('Sign out'));
});

test('model-menu-not-refreshed-after-account-change: a settled account change re-reads model/list once', async () => {
  const calls = [], lists = [];
  const owner = { serverInfo: { engine: 'opencode' }, start: async () => {}, request: async (method) => { calls.push(method); return method === 'model/list' ? { data: [{ model: 'gamma' }] } : method === 'account/read' ? { account: { type: 'apiKey' } } : method === 'account/logout' ? {} : { type: 'chatgpt', loginId: 'l', authUrl: 'https://auth.example.test/' }; } };
  const service = createAccountOperations({ getClient: () => owner, openExternal: async () => {}, onModels: list => lists.push(list), modelsDelay: 5 });
  service.observe({ method: 'account/updated' }); service.observe({ method: 'account/updated' });
  await new Promise(resolve => setTimeout(resolve, 30));
  assert.equal(calls.filter(method => method === 'model/list').length, 1, 'a burst is one read');
  assert.deepEqual(lists, [[{ model: 'gamma' }]]);
  await service.logout(true);
  await new Promise(resolve => setTimeout(resolve, 30));
  assert.equal(lists.length, 2, 'sign-out re-reads too');
  // A disconnect drops a pending read; Codex (catalog built in main.cjs connect) and no onModels read nothing.
  service.observe({ method: 'account/updated' }); service.observe({ kind: 'connection', connected: false });
  await new Promise(resolve => setTimeout(resolve, 30));
  assert.equal(lists.length, 2);
  const codexCalls = [];
  const codex = createAccountOperations({ getClient: () => ({ serverInfo: { engine: 'codex' }, start: async () => {}, request: async m => { codexCalls.push(m); return {}; } }), openExternal: async () => {}, onModels: () => {}, modelsDelay: 1 });
  codex.observe({ method: 'account/updated' });
  await new Promise(resolve => setTimeout(resolve, 20));
  assert.equal(codexCalls.includes('model/list'), false);
});

test('main.jsx: Settings at Account, a pending sign-in on Home, catalogs after a reconnect or account change', () => {
  const main = source('src/main.jsx');
  // open-settings-lands-on-appearance
  assert.equal(/setSettings\("preferences"\)/.test(main), false, 'no Settings › Appearance for a sign-in or key');
  assert.match(main, /data-testid="user-menu-deepseek-key" onClick=\{\(\) => setSettings\("account#account"\)\}/);
  const card = main.slice(main.indexOf('data-testid="core-sign-in-card"'), main.indexOf('{/* transcriptLinks'));
  assert.match(card, /setSettings\("account#account"\)\}>\{t\("Open Settings"\)\}/);
  assert.match(card, /Settings › Account so \{name\} can answer/);
  // home-signin-ignores-pending
  const start = main.slice(main.indexOf('function startCoreSignIn() {'), main.indexOf('setSettings("account#account");', main.indexOf('function startCoreSignIn() {')));
  assert.match(start, /if \(phase === "waiting"\) \{ call\("account-auth", \{ operation: "open" \}\)/);
  assert.match(start, /if \(phase !== "idle"\) return;/);
  assert.match(card, /signInPending[\s\S]*operation: "cancel"[\s\S]*Cancel sign-in/);
  // restart-core-refreshes-one-renderer / model-menu-not-refreshed-after-account-change
  assert.match(main, /else if \(e\.connected && !coreSwitchReload\.current\)\s*call\("init"\)\.then\(\(fresh\) => \{ if \(fresh\?\.connected && Array\.isArray\(fresh\.models\)\) setBoot/);
  assert.match(main, /if \(e\.kind === "models" && Array\.isArray\(e\.models\)\) setBoot\(\(b\) => b && \(\{ \.\.\.b, models: e\.models \}\)\);/);
});
