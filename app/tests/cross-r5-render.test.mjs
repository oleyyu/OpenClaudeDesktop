import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import path from 'node:path';

// Round 5 cross-area UI: server-rendered (effects don't run).
const app = path.resolve(import.meta.dirname, '..');
createRequire(path.join(app, 'package.json'))('react-dom').createPortal = children => children;
globalThis.innerWidth = 1200;
// D21: the Settings import graph reaches view-tabs, whose preload-helper calls document.createElement at evaluation.
globalThis.document ??= { body: { nodeType: 1 }, documentElement: { dataset: {}, getAttribute: () => null }, createElement: () => ({}) };
let server, React, render, load;
before(async () => {
  React = (await import('react')).default;
  ({ renderToStaticMarkup: render } = await import('react-dom/server'));
  const { createServer } = await import('vite'), react = (await import('@vitejs/plugin-react')).default;
  server = await createServer({ configFile: false, root: app, plugins: [react()], server: { middlewareMode: true, hmr: false, watch: null }, appType: 'custom', logLevel: 'error' });
  load = (file) => server.ssrLoadModule(file);
});
after(() => server?.close());

const noop = () => {};
const buttons = (html) => [...html.matchAll(/<button[^>]*data-variant="(\w+)"[^>]*>(?:<[^>]+>)*([^<]+)/g)].map((match) => [match[2].trim(), match[1]]);

test('error card: Sign in to the core for an auth failure, settled as Signed in again after a later sign-in', async () => {
  const { SourceTurnError } = await load('/src/source-turn-error.jsx');
  const error = { message: 'token expired', codexErrorInfo: 'unauthorized', additionalDetails: null };
  const card = render(React.createElement(SourceTurnError, { error, turnId: 't1', onSignIn: noop, signInLabel: 'Sign in to Kimi Code', onRetry: noop }));
  assert.match(card, /Authentication failed/);
  assert.deepEqual(buttons(card).filter(([label]) => label !== 'View details'), [['Sign in to Kimi Code', 'primary']]);
  const settled = render(React.createElement(SourceTurnError, { error, turnId: 't1', onSignIn: noop, signedInAgain: true }));
  assert.match(settled, /data-signed-in-again=""/);
  assert.match(settled, /Signed in again/);
  assert.doesNotMatch(settled, /Authentication failed/);
  // A DeepSeek key failure keeps its own Open settings (Settings › Models).
  const deepseek = render(React.createElement(SourceTurnError, { error: { ...error, additionalDetails: 'AUTH' }, turnId: 't1', onSignIn: noop, onOpenSettings: noop }));
  assert.match(deepseek, /Open settings/);
  assert.doesNotMatch(deepseek, /Sign in/);
});

test('error card: a full context offers Compact (primary) and Rewind with the rewind hint; an overloaded model offers Switch model', async () => {
  const { SourceTurnError } = await load('/src/source-turn-error.jsx');
  const full = { message: 'context', codexErrorInfo: 'contextWindowExceeded', additionalDetails: null };
  const html = render(React.createElement(SourceTurnError, { error: full, turnId: 't', onCompact: noop, onRewind: noop }));
  assert.match(html, /rewind to an earlier point, or start a new chat/);
  assert.deepEqual(buttons(html).filter(([label]) => label !== 'View details'), [['Rewind', 'secondary'], ['Compact session', 'primary']]);
  const plain = render(React.createElement(SourceTurnError, { error: full, turnId: 't', onCompact: noop }));
  assert.match(plain, /This chat is too long to continue\. Start a new chat\./);
  const busy = render(React.createElement(SourceTurnError, { error: { message: 'busy', codexErrorInfo: 'serverOverloaded' }, turnId: 't', onRetry: noop, onSwitchModel: noop }));
  assert.deepEqual(buttons(busy).filter(([label]) => label !== 'View details'), [['Switch model', 'secondary'], ['Try again', 'primary']]);
});

test('Review code: a pull request target only on a core that lists it', async () => {
  const { ReviewDialog, reviewTargetItems } = await load('/src/source-session-actions.jsx');
  const props = { workspaceInfo: { isRepo: true, branches: ['main'] }, permission: 'auto', onSubmit: noop, onClose: noop, inline: true };
  // The target is the app's Combobox (SourceSelect), never a native OS <select>.
  const opencode = render(React.createElement(ReviewDialog, { ...props, core: { engine: 'opencode', capabilities: { reviewTargets: ['uncommittedChanges', 'pullRequest'] } } }));
  assert.match(opencode, /data-cds="Combobox"[^>]*><button data-autofocus="" type="button" role="combobox" aria-label="Review target"/);
  assert.doesNotMatch(opencode, /<select|<option/);
  assert.deepEqual(reviewTargetItems({ isRepo: true, pullRequests: true }).map(item => item.value), ['uncommittedChanges', 'baseBranch', 'commit', 'pullRequest', 'custom']);
  assert.deepEqual(reviewTargetItems({ isRepo: true }).map(item => item.value), ['uncommittedChanges', 'baseBranch', 'commit', 'custom']);
  // Outside a repository the Git targets stay listed, disabled with the reason; Custom instructions stays open.
  const outside = reviewTargetItems({ isRepo: false });
  assert.deepEqual(outside.filter(item => item.disabled).map(item => item.description), Array(3).fill('Needs a Git repository'));
  assert.equal(outside.at(-1).disabled, undefined);
  const codex = render(React.createElement(ReviewDialog, { ...props, core: { engine: 'codex', capabilities: {} } }));
  assert.doesNotMatch(codex, /pullRequest/);
});

test('Customize › Plugins › Available: a row that needs the agent’s account says so and can’t be installed', async () => {
  const { AvailablePlugins } = await load('/src/source-customize.jsx');
  const rows = [{ id: 'a@official', name: 'Agent session migration', description: 'Move sessions', marketplaceName: 'Official', installName: 'a@official', signInRequired: true },
    { id: 'b@official', name: 'Other', description: '', marketplaceName: 'Official', installName: 'b@official' }];
  const html = render(React.createElement(AvailablePlugins, { rows, store: {}, coreName: 'MiniMax' }));
  assert.match(html, /Sign in with your MiniMax account in Settings › Account to install it\./);
  const installs = [...html.matchAll(/<button[^>]*?(disabled="")?[^>]*>(?:<[^>]+>)*Install</g)].map((match) => !!match[1]);
  assert.equal(installs.length, 2);
  assert.match(html, /data-available-plugin="a@official"[\s\S]*?disabled=""[\s\S]*?Install[\s\S]*data-available-plugin="b@official"/);
});

test('Customize › Connectors › Apps: installed apps first, Connect / Manage and the switch, the installed count', async () => {
  const { AppsSection } = await load('/src/source-customize.jsx');
  const initial = { data: [
    { id: 'drive', name: 'Google Drive', description: 'Files', isAccessible: false, isEnabled: true, installUrl: 'https://chatgpt.com/apps/drive', logoUrl: null },
    { id: 'github', name: 'GitHub', description: 'Code', isAccessible: true, isEnabled: false, installUrl: 'https://chatgpt.com/apps/github', logoUrl: 'https://cdn.example/gh.png' },
  ] };
  const html = render(React.createElement(AppsSection, { call: async () => initial, onOpenExternal: noop, initial }));
  assert.match(html, /1 of 2 available apps installed/);
  assert.ok(html.indexOf('data-app-id="github"') < html.indexOf('data-app-id="drive"'), 'installed first');
  assert.match(html, /GitHub<\/span><span class="cz-apps-meta">Installed · Off · Code/);
  assert.match(html, /data-app-id="drive"[\s\S]*?Connect/);
  assert.match(html, /aria-label="Use GitHub"/);
  assert.doesNotMatch(html, /aria-label="Use Google Drive"/, 'no switch before it is installed');
  const empty = render(React.createElement(AppsSection, { call: async () => ({ data: [] }), onOpenExternal: noop, initial: { data: [] } }));
  assert.equal(empty, '', 'an API key lists no apps: nothing is shown');
});
