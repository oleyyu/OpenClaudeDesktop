import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import path from 'node:path';

// Settings pages describe and gate on the running core (settings-core-copy.mjs, source-settings.jsx pageProps):
// Developer › Local engine, the Preferences account group, the account rows (sign-out confirm, device codes, API
// keys) and the Cores page's guarded actions. Server-rendered; effects do not run.
const app = path.resolve(import.meta.dirname, '..');
createRequire(path.join(app, 'package.json'))('react-dom').createPortal = children => children;
globalThis.innerWidth = 1200;
// D21: the Settings import graph reaches view-tabs, whose preload-helper calls document.createElement at evaluation.
globalThis.document ??= { body: { nodeType: 1 }, documentElement: { dataset: {}, getAttribute: () => null }, createElement: () => ({}) };
let server, React, render, Settings, copy, account, i18n;
before(async () => {
  React = (await import('react')).default;
  ({ renderToStaticMarkup: render } = await import('react-dom/server'));
  const { createServer } = await import('vite'), react = (await import('@vitejs/plugin-react')).default;
  server = await createServer({ configFile: false, root: app, plugins: [react()],
    server: { middlewareMode: true, hmr: false, watch: null }, appType: 'custom', logLevel: 'error' });
  ({ SourceSettings: Settings } = await server.ssrLoadModule('/src/source-settings.jsx'));
  copy = await server.ssrLoadModule('/src/settings-core-copy.mjs');
  account = await server.ssrLoadModule('/src/source-account-settings.jsx');
  i18n = await server.ssrLoadModule('/electron/i18n/index.mjs');
});
after(() => { i18n?.setLocale('en-US'); return server?.close(); });

const core = (engine, extra = {}) => ({ engine, capabilities: {}, ...extra });
const page = (initialSection, { config = {}, boot = {}, ...props } = {}) => render(React.createElement(Settings, { open: true, config: { threadIds: [], ...config },
  model: 'm', effort: 'medium', permission: 'ask', boot: { connected: true, models: [], ...boot }, busy: false, initialSection,
  desktopCall: async () => ({}), onSave: async () => ({}), onClose() {}, ...props }));
const NON_DEEPSEEK = ['codex', 'zcode', 'opencode', 'mimo', 'kimi', 'qwen', 'gemini', 'minimax'];

test('engineCopy names the running core, its version and its config file; DeepSeek Harness text only on DeepSeek', () => {
  const deepseek = copy.engineCopy(core('deepseek-harness'));
  assert.equal(deepseek.label, 'DeepSeek core');
  // The key comes from Settings › Models first, never "saved in" the harness home alone.
  assert.match(deepseek.engine, /^Uses DeepSeek Harness with the API key from Settings › Models/);
  assert.equal(deepseek.mcp, 'Local MCP servers from your DeepSeek Harness configuration.');
  // Codex saves connectors into the CLI's config.toml (Developer Remove, Customize › Connectors Add).
  const codex = copy.engineCopy(core('codex'));
  assert.deepEqual(codex, { label: 'Codex core', engine: 'Runs Codex. Connectors you add or remove in OpenClaude Desktop are saved to ~/.codex/config.toml.',
    mcp: 'Local MCP servers from Codex’s configuration (~/.codex/config.toml).' });
  assert.equal(copy.engineCopy(core('codex', { capabilities: { mcpConfigWrite: false } })).engine, 'Runs Codex. Settings here do not rewrite its own configuration in ~/.codex/config.toml.');
  // A reported version and config path win over the descriptor's file; a home path is shortened to ~.
  const zcode = copy.engineCopy(core('zcode', { engineVersion: '1.4.2', configPath: '/Users/someone/.zcode/cli/config.json' }));
  assert.equal(zcode.engine, 'Runs ZCode 1.4.2. Connectors you add or remove in OpenClaude Desktop are saved to ~/.zcode/cli/config.json.');
  assert.equal(zcode.label, 'ZCode core');
  // Qwen / Gemini write their own settings.json from Settings › Code (coreSettings), plus connectors when the bridge writes them.
  assert.equal(copy.engineCopy(core('qwen', { capabilities: { coreSettings: true, mcpConfigWrite: true } })).engine,
    'Runs Qwen Code. Connectors and Qwen Code settings you change in OpenClaude Desktop are saved to ~/.qwen/settings.json.');
  assert.equal(copy.engineCopy(core('gemini', { capabilities: { coreSettings: true } })).engine,
    'Runs Gemini CLI. Gemini CLI settings you change in OpenClaude Desktop are saved to ~/.gemini/settings.json.');
  // An overlay core keeps its changes beside the user's file, which it names (not the overlay path it reports).
  assert.equal(copy.engineCopy(core('opencode', { configPath: '/tmp/state/opencode.json' })).engine,
    'Runs OpenCode. Settings here do not rewrite its own configuration in ~/.config/opencode/opencode.json.');
  assert.equal(copy.engineCopy('mimo').engine, 'Runs MiMo Code. Settings here do not rewrite its own configuration in ~/.config/mimocode/mimocode.jsonc.');
  // An unknown pack core without a config file.
  assert.equal(copy.engineCopy(core('acme-agent')).engine, 'Runs acme-agent. Settings here do not rewrite its own configuration.');
  for (const id of NON_DEEPSEEK) {
    const text = Object.values(copy.engineCopy(id)).join(' ');
    assert.equal(/DeepSeek|~\/\.dsh/.test(text), false, `${id}: ${text}`);
  }
  i18n.setLocale('zh-CN');
  try {
    const zh = copy.engineCopy(core('codex'));
    assert.equal(zh.label, 'Codex 内核');
    assert.equal(zh.engine, '运行 Codex。你在 OpenClaude Desktop 中添加或移除的连接器会保存到 ~/.codex/config.toml。');
    assert.equal(/DeepSeek/.test(Object.values(zh).join(' ')), false);
  } finally { i18n.setLocale('en-US'); }
});

test('the account group follows the chosen core while disconnected; sign-out copy names the core and where its sign-in lives', () => {
  assert.equal(copy.accountGroupTitle(copy.accountCore({ connected: false }, { core: 'codex' })), 'Codex account');
  assert.equal(copy.accountGroupTitle(copy.accountCore({ connected: false, core: core('deepseek-harness') }, { core: 'zcode' })), 'ZCode account', 'the chosen core, not the last one that ran');
  assert.equal(copy.accountGroupTitle(copy.accountCore({ connected: true, core: core('opencode') }, { core: 'codex' })), 'OpenCode account', 'connected: the running core');
  assert.equal(copy.accountGroupTitle(copy.accountCore({ connected: false }, {})), 'DeepSeek account', 'a failed start without a choice is the DeepSeek core');
  assert.equal(copy.accountGroupTitle(copy.accountCore({ connected: true, core: core('deepseek-harness') }, {})), 'DeepSeek account');
  assert.equal(copy.settingsCore({ connected: true, core: core('zcode', { capabilities: { customization: false } }) }, {}).capabilities.customization, false, 'boot.core itself, reported capabilities and all');
  assert.equal(copy.settingsCore({ connected: false }, { core: 'mimo' }), 'mimo');
  assert.equal(copy.settingsCore({ connected: true }, {}), undefined, 'a connected boot without a report is the Codex fixture case');
  assert.equal(copy.signOutConfirmText('codex'), 'Sign out of Codex? Codex on this Mac signs out too, including other tools that share its sign-in in ~/.codex.');
  // The credentials folder (login.store), not the config file's folder.
  assert.equal(copy.signOutConfirmText(core('zcode')), 'Sign out of ZCode? ZCode on this Mac signs out too, including other tools that share its sign-in in ~/.zcode/v2.');
  assert.match(copy.signOutConfirmText('opencode'), /in ~\/\.local\/share\/opencode\.$/);
  assert.match(copy.signOutConfirmText('mimo'), /in ~\/\.local\/share\/mimocode\.$/);
  // Codex launched with CODEX_HOME (boot.core.home): its paths are shown there.
  const moved = core('codex', { home: '/Users/someone/profiles/work/codex-home' });
  assert.match(copy.signOutConfirmText(moved), /in ~\/profiles\/work\/codex-home\.$/);
  assert.equal(copy.coreConfigFile(moved), '~/profiles/work/codex-home/config.toml');
  assert.equal(copy.coreConfigFile(core('codex', { home: '/Users/someone/.codex' })), '~/.codex/config.toml');
  for (const id of NON_DEEPSEEK) assert.equal(/DeepSeek/.test(copy.signOutConfirmText(id)), false, id);
});

test('Settings shell: Developer › Local engine and Preferences name the running core', () => {
  const codex = page('developer', { boot: { core: core('codex') } });
  assert.ok(codex.includes('Codex core') && codex.includes('Runs Codex. Connectors you add or remove in OpenClaude Desktop are saved to ~/.codex/config.toml.'));
  assert.equal(/DeepSeek Harness|~\/\.dsh/.test(codex), false);
  const deepseek = page('developer', { boot: { core: core('deepseek-harness') } });
  assert.ok(deepseek.includes('DeepSeek core') && deepseek.includes('Settings here do not rewrite your DeepSeek Harness configuration.'));
  const prefs = page('preferences', { config: { core: 'codex' }, boot: { connected: false } });
  assert.match(prefs, /<h3[^>]*>Codex account<\/h3>/);
  assert.equal(prefs.includes('DeepSeek account'), false);
  assert.match(page('preferences', { boot: { core: core('deepseek-harness') } }), /<h3[^>]*>DeepSeek account<\/h3>/);
});

test('page gates get boot.core itself, so a reported capability wins over the implied one', () => {
  // ZCode implies customization, but a bridge without a provider proxy reports customization:false: the
  // Instructions page then appends instead of claiming the whole system prompt.
  const implied = page('instructions', { boot: { core: core('zcode') } });
  const reported = page('instructions', { boot: { core: core('zcode', { capabilities: { customization: false } }) } });
  assert.ok(implied.includes('This is the whole system prompt.'), 'implied customization');
  assert.equal(reported.includes('This is the whole system prompt.'), false, 'reported customization:false wins');
});

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
// The rendered element whose children include `text` (a Button), searched depth-first in a row's control.
function findButton(node, text) {
  if (!node || typeof node !== 'object') return null;
  if (Array.isArray(node)) { for (const child of node) { const found = findButton(child, text); if (found) return found; } return null; }
  const children = node.props?.children;
  const flat = [children].flat(Infinity);
  if (node.props?.onClick && flat.some(child => child === text)) return node;
  return findButton(children, text);
}

test('account rows: bridge Sign out confirms first, device codes and Codex API keys come from the descriptor', () => {
  const calls = [];
  const signedIn = rows({ engine: core('zcode'), snapshot: { account: { type: 'apiKey', planType: 'Z.ai Coding Plan' } }, onAccountAction: p => { calls.push(p); } });
  assert.deepEqual(signedIn.rows.map(row => row.id).slice(0, 2), ['account', 'plan'], 'the bridge plan row');
  const signOut = findButton(signedIn.rows[0].control, 'Sign out');
  assert.ok(signOut, 'Sign out button');
  try { signOut.props.onClick(); } catch {}
  assert.deepEqual(calls, [], 'Sign out only opens the confirmation; no unconfirmed logout is sent');
  const source = readFileSync(path.join(app, 'src/source-account-settings.jsx'), 'utf8');
  assert.equal((source.match(/operation:'logout'/g) || []).length, 1, 'one logout call site');
  assert.match(source, /operation:'logout',confirmed:true/);

  // Kimi / MiniMax: their device-code sign-in (descriptor login.deviceCode) is offered.
  const kimi = rows({ engine: 'kimi', snapshot: { account: null } });
  // Kimi offers kimi.com and kimi.ai device codes (`kimi login --region`), each naming its platform.
  assert.ok(kimi.rows.some(row => row.id === 'device-kimi-cn') && kimi.rows.some(row => row.id === 'device-kimi-global'), kimi.rows.map(row => row.id).join());
  assert.ok(kimi.html.includes('Kimi account (kimi.com)') && kimi.html.includes('Kimi account (kimi.ai)') && kimi.html.includes('Shows a code to enter on the sign-in page.'));
  const login = [];
  const kimiAgain = rows({ engine: 'kimi', snapshot: { account: null }, onLogin: (type, extra) => { login.push([type, extra]); return Promise.resolve(); } });
  try { findButton(kimiAgain.rows.find(row => row.id === 'device-kimi-global').control, 'Sign in').props.onClick(); } catch {}
  assert.deepEqual(login, [['chatgptDeviceCode', { codeDesktop: { provider: 'kimi-global' } }]]);

  // A sign-in started elsewhere (setup) names no row, so every sign-in row shows Open browser / Cancel and the code.
  const waiting = rows({ engine: 'kimi', snapshot: { account: null }, auth: { phase: 'waiting', login: { url: 'https://example.invalid/device', userCode: 'ABCD-1234' } } });
  assert.ok(waiting.html.includes('Cancel sign-in') && waiting.html.includes('ABCD-1234') && waiting.html.includes('Enter this code on the sign-in page.'));

  // Codex signed out: ChatGPT and device code as before, plus the OpenAI API key row; signed in: no key row.
  const codexOut = rows({ engine: core('codex'), snapshot: { account: null, requiresOpenaiAuth: true } });
  assert.deepEqual(codexOut.rows.map(row => row.id), ['account', 'signin', 'apikey']);
  assert.ok(codexOut.html.includes('placeholder="OpenAI API key"') && codexOut.html.includes('Get a key'));
  assert.ok(findButton(codexOut.rows.find(row => row.id === 'apikey').control, 'Save key'));
  const codexIn = rows({ engine: core('codex'), snapshot: { account: { type: 'chatgpt', email: 'a@example.invalid', planType: 'plus' }, requiresOpenaiAuth: true } });
  assert.deepEqual(codexIn.rows.map(row => row.id), ['account', 'plan']);
  assert.match(codexIn.rows[0].searchText, /^Codex account/);
  for (const html of [codexOut.html, codexIn.html, signedIn.html, kimi.html]) assert.equal(/shared DeepSeek account|DeepSeek Harness/.test(html), false);
});

test('Cores page: running-core removal and switching are guarded; updates are offered from list() updateAvailable', () => {
  const source = readFileSync(path.join(app, 'src/source-settings-cores.jsx'), 'utf8');
  assert.match(source, /export function SourceCoresSettings\(\{ boot, busy = false, coreBusy = busy,/);
  assert.match(source, /data-core-update=\{core\.id\}/);
  assert.match(source, /core\.appInstall && core\.updateAvailable === true && core\.release/);
  assert.match(source, /const removeDownload = core =>/);
  assert.match(source, /if \(wasRunning\) \{ await restartRunning\(core\.id, next\); return next; \}/);
  assert.match(source, /if \(!coreBusy \|\| !boot\?\.connected\) return go\(\);/);
  const settings = readFileSync(path.join(app, 'src/source-settings.jsx'), 'utf8');
  assert.match(settings, /coreBusy:coreBusy\?\?busy,engine,/);
});
