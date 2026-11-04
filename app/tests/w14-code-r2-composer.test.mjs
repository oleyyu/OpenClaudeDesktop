// W14-code round 2, lane "composer" (plan-w14-code.md §3; data/w14code/round2/lanes/composer.json): the composer error
// card (r2-composer-01), the /clear failure toast (r2-composer-02), the gone-environment block (r2-composer-04), the model
// row's second line (r2-composer-05), the history search ICU status (r2-composer-06), the notice stack width
// (r2-shared-04) and message-style.css's 0.1 rules (DC-01). Source, SSR and the main-process model only; the official
// chunks are read as text, never executed.
import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';
import { createSavedEnvironments } from '../electron/saved-environments.mjs';
import { HISTORY_SEARCH_STATUS, historySearchStatus } from '../src/prompt-history-model.mjs';
import zhSession from '../electron/i18n/zh-CN/session.mjs';

const app = path.resolve(import.meta.dirname, '..');
const assets = path.join(app, '../reference/snapshots/claude-3.6556.2-20261025-192807/ion-dist/assets/v1');
// The minified chunks spell ’ and — as \\u escapes; the comparison reads them as characters.
const official = (file) => fs.readFileSync(path.join(assets, file), 'utf8').replace(/\\u2019/g, '’').replace(/\\u2014/g, '—');
const rules = (css) => css.replace(/\/\*[\s\S]*?\*\//g, '');
const read = (file) => fs.readFileSync(path.join(app, file), 'utf8');
createRequire(path.join(app, 'package.json'))('react-dom').createPortal = children => children;
globalThis.document ??= { body: { nodeType: 1 }, documentElement: { dataset: {}, getAttribute: () => null }, createElement: () => ({}) };
let server, React, render, load;
before(async () => {
  React = (await import('react')).default;
  ({ renderToStaticMarkup: render } = await import('react-dom/server'));
  const { createServer } = await import('vite'), react = (await import('@vitejs/plugin-react')).default;
  server = await createServer({ configFile: false, root: app, plugins: [react()], server: { middlewareMode: true, hmr: false, ws: false, watch: null }, appType: 'custom', logLevel: 'error' });
  load = (file) => server.ssrLoadModule(file);
});
after(() => server?.close());

test('official evidence: the copy and classes this lane follows are in 3.6556.2', () => {
  const cc = official('cc43287c9-Me-M2ucD.js'), c3 = official('c3e34355f-ChC9vKYq.js'), c5 = official('c5cd1b4dc-BTRy7mYR.js');
  const c2 = official('c227f4d5e-B-FYKrwT.js'), s7 = official('shared-7-DBAgAi5H.js'), s6 = official('shared-6-sd9jbJqs.js');
  for (const text of ['ra?p(gpe,{scopeStore:Rn', 'defaultMessage:"{name} can’t start: {path} no longer exists. <edit>Edit environment</edit>",id:"j9ML5nKNoc"',
    'defaultMessage:"{name} can’t start: {path} no longer exists. Edit the environment to choose another folder.",id:"+NHh0bYyxd"',
    'ke.setState({startPageBlock:e})', '"epitaxy-environment-folder-probe"', 'messageForLogging:"epitaxy: draft submit blocked"'])
    assert.ok(cc.replace(/\s+/g, '').includes(text.replace(/\s+/g, '')), text);
  assert.ok(c3.includes('defaultMessage:"Couldn’t complete that",id:"GNchAA7qYa"'));
  assert.ok(c3.includes('{kind:"literal",body:'));
  assert.ok(c5.includes('defaultMessage:"Couldn’t clear the conversation. Try again.",id:"RdR/Cw+3St"'));
  assert.ok(c5.includes('defaultMessage:"Still restoring the code from an earlier rewind. Try again when it finishes.",id:"RSZAl9F2zb"'));
  assert.ok(c5.includes('messageForLogging:"epitaxy: /clear failed"'));
  assert.ok(c2.includes(`defaultMessage:${JSON.stringify(HISTORY_SEARCH_STATUS.defaultMessage)},id:"MNU6kO4MFO"`));
  assert.ok(c2.includes('role:"status",className:"sr-only",children:Nt'));
  assert.ok(s7.includes('N=s?.showDescriptions!==!1'));
  assert.ok(s7.includes('w=r?t.description:void 0'));
  assert.ok(s6.includes('Yg=`relative h-0 ${Jg}`') && s6.includes('Jg="-mb-1.5 compact:-mb-1.5 comfortable:-mb-2"'));
});

test('r2-composer-01: the composer error is c3e34355f Hn\'s literal card (cb1a6e506), not the host .inline-error', async () => {
  const { SourceComposerError } = await load('/src/source-turn-error.jsx');
  const html = render(React.createElement(SourceComposerError, { message: 'Folder is not readable', onDismiss: () => {} }));
  assert.match(html, /epitaxy-card-outline-layer flex w-fit min-w-\[min\(480px,100%\)\] max-w-full flex-col overflow-clip rounded-card/);
  assert.match(html, /<span role="alert" class="sr-only">Couldn’t complete that Folder is not readable<\/span>/);
  assert.match(html, /min-w-0 grow text-body text-primary break-words">Couldn’t complete that</);
  assert.match(html, /aria-label="Dismiss"/);
  assert.doesNotMatch(html, /View details|Copy details/, 'a literal has no raw details (showRawMessage !1)');
  assert.equal(render(React.createElement(SourceComposerError, { message: '' })), '');
  const main = read('src/main.jsx');
  // Code only (r2 review; the transcript's SourceTurnError is `official={mode === "code"}` too): Chat/Cowork keep the host banner.
  assert.match(main, /\{error && \(mode === "code"\n\s+\? <div className="composer-error"><SourceComposerError message=\{error\} onDismiss=\{\(\) => setError\(""\)\} \/><\/div>\n\s+: <div role="alert" className="inline-error composer-error">/);
  assert.equal(main.match(/inline-error/g).length, 1, 'only the Chat/Cowork branch draws the host banner');
  assert.doesNotMatch(read('src/style.css'), /^\.composer-error/m);
  const css = read('src/message-style.css');
  // W14-code r3 css3-band-column-width: Chat/Cowork's banner keeps the old box; the Code card's wrapper is in the composer
  // column (shared-6 yg / gg, source-composer.css), no longer a fixed calc(100% - 64px).
  assert.match(css, /\.inline-error\.composer-error \{\n  width: calc\(100% - 64px\);\n  max-width: 768px;\n  align-self: center;\n\}/);
  assert.doesNotMatch(css, /^\.composer-error \{/m);
  assert.ok(read('src/source-composer.css').includes('.composer-error:not(.inline-error), .ssn-list, .sqm-band {\n  --chat-column-gutter-start: var(--chat-gutter-start, var(--chat-gutter, 32px));'));
});

test('r2-composer-02: a failed /clear is the one danger toast; the host reasons stay out of the UI', () => {
  const main = read('src/main.jsx');
  const body = main.slice(main.indexOf('async function clearSession('), main.indexOf('async function runCoreCommand('));
  assert.match(body, /t\("Couldn’t clear the conversation\. Try again\."\)/);
  assert.match(body, /rewindRunning\.current \? t\("Still restoring the code from an earlier rewind\. Try again when it finishes\."\)/);
  assert.match(body, /toasts\.add\(text, \{ variant: "danger" \}\)/);
  assert.match(body, /console\.warn\("epitaxy: \/clear failed", reason\)/);
  assert.doesNotMatch(body, /throw new Error\(t\("Wait for the current task|throw new Error\(t\("Reconnect to DeepSeek first/);
  assert.match(body, /catch \(error\) \{ if \(!started\) return failed\(error\); throw error; \}/);
  assert.match(main, /case "clear": if \(await clearSession\(clearCommand\) === false\) return; break;/);
  for (const key of ['Couldn’t clear the conversation. Try again.', 'Still restoring the code from an earlier rewind. Try again when it finishes.'])
    assert.ok(zhSession[key], key);
});

test('r2-composer-04: saved-environments probe answers for the stored folder only', async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'r2c-env-'));
  const folder = path.join(dir, 'project');
  fs.mkdirSync(folder);
  let n = 0;
  const store = createSavedEnvironments({ file: path.join(dir, 'saved.json'), uuid: () => `id-${++n}`, now: () => 1 });
  const { environment } = await store.run({ op: 'save', value: { name: 'App', target: { kind: 'local', cwd: folder }, settings: {} } });
  assert.deepEqual(await store.run({ op: 'probe', id: environment.id }), { missing: false });
  fs.rmSync(folder, { recursive: true });
  assert.deepEqual(await store.run({ op: 'probe', id: environment.id }), { missing: true });
  fs.writeFileSync(folder, 'now a file');
  assert.deepEqual(await store.run({ op: 'probe', id: environment.id }), { missing: true }, 'not a directory');
  await assert.rejects(store.run({ op: 'probe', id: 'nope', path: '/etc' }), /This environment no longer exists/);
  fs.rmSync(dir, { recursive: true, force: true });
});

test('r2-composer-04: the gone line is j9ML5nKNoc with the TextLink edit, blocking in the bar\'s line host; send is blocked', async () => {
  const { EnvironmentGoneLine } = await load('/src/source-composer-environment-bar.jsx');
  let edited = 0;
  const html = render(React.createElement(EnvironmentGoneLine, { name: 'App', folder: '/Users/me/src/app', onEdit: () => edited++ }));
  assert.match(html, /^App can’t start: ~\/src\/app no longer exists\. <[a-z]+[^>]*data-cds="TextLink"[^>]*data-inherit-color=""[^>]*>Edit environment<\/[a-z]+>$/);
  const composer = read('src/source-composer.jsx');
  assert.match(composer, /line=\{environmentLine\} lineEl=\{environmentLineEl\}/);
  assert.match(composer, /<div ref=\{setEnvironmentLineEl\} className="relative h-0 -mb-1\.5 compact:-mb-1\.5 comfortable:-mb-2" \/>/);
  // W14-code r4 (css4-draft-group-presets): the bar's note now carries the draft group's i7 line form (cc43287c9 `note: Aa`,
  // Aa = xle(ka)), drawn only while the line is null.
  assert.match(read('src/source-composer-environment-bar.jsx'), /mode=\{mode\} line=\{line\} lineEl=\{lineEl\} note=\{note\}/);
  const main = read('src/main.jsx');
  assert.match(main, /const environmentFolderGone = useEnvironmentFolderGone\(savedEnvironments\.run, selectedEnvironment\);/);
  assert.match(main, /environmentLine=\{environmentFolderGone && selectedEnvironment \? \{ kind: "blocking", content: <EnvironmentGoneLine /);
  assert.match(main, /if \(!current && environmentFolderGone && selectedEnvironment\) \{\n\s+const text = t\("\{name\} can’t start: \{path\} no longer exists\. Edit the environment to choose another folder\."/);
  const hook = read('src/use-saved-environments.js');
  assert.match(hook, /ENVIRONMENT_FOLDER_PROBE_MS = 30000/);
  assert.match(hook, /window\.addEventListener\('focus', probe\)/);
  for (const key of ['{name} can’t start: {path} no longer exists. <edit>Edit environment</edit>', '{name} can’t start: {path} no longer exists. Edit the environment to choose another folder.'])
    assert.ok(zhSession[key], key);
  // The generated l0 draws a blocking line text-danger in the host it is given.
  assert.match(read('src/generated/code-composer/environment-bar.mjs'), /i\?\.kind === "blocking" \? "text-danger" : "text-muted-as-secondary"/);
});

test('r2-composer-05: a main model row carries its description as the second line; More models rows do not', () => {
  const menu = read('src/source-model-menu.jsx');
  assert.match(menu, /const description = main && hasText\(model\.description\) \? model\.description : undefined;/);
  assert.match(menu, /const tip = reason \|\| model\.tooltip\?\.content \|\| model\.notice\?\.text \|\| model\.notice_text \|\| undefined;/);
  assert.match(menu, /withTip\(disabled \? undefined : tip, <SourceMenu\.Item key=\{id\} className="sm-model-item" label=\{modelName\(model\)\} description=\{description\}\n\s+aria-description=\{reason\}/);
  assert.doesNotMatch(menu, /scopeNote|sm-model-scope/);
  assert.doesNotMatch(read('src/source-model-menu.css'), /sm-model-scope/);
});

test('r2-composer-06: the history search status is one ICU message, formatted by the composer intl, in sr-only', async () => {
  const state = { query: 'git', matchIndex: 2, total: 5, failed: false };
  assert.equal(historySearchStatus(state), 'Search history: git — match 2 of 5');
  assert.equal(historySearchStatus({ ...state, matchIndex: 0, failed: true }), 'Search history: git — no match');
  const { createStartIntl } = await load('/src/source-code-start-adapters.jsx');
  const en = createStartIntl('en-US');
  assert.equal(historySearchStatus(state, en), 'Search history: git — match 2 of 5');
  assert.equal(historySearchStatus({ ...state, matchIndex: 0, failed: true }, en), 'Search history: git — no match');
  assert.equal(historySearchStatus({ ...state, query: '', matchIndex: 0 }, en), 'Search history: ');
  assert.ok(zhSession[HISTORY_SEARCH_STATUS.defaultMessage]);
  const composer = read('src/source-composer.jsx');
  assert.match(composer, /<span className="sr-only" role="status" data-history-status="">\{search \? historySearchStatus\(search, composerIntl\)/);
});

test('r2-shared-04: the notice stack follows the transcript width', () => {
  // W14-code r3 css3-band-column-width: through the composer column rules (shared-6 yg: measure plus both gutters).
  const composer = read('src/source-composer.css');
  const rule = composer.slice(composer.indexOf('.composer-error:not(.inline-error), .ssn-list, .sqm-band {'));
  assert.match(rule, /^[^}]*max-width: calc\(var\(--local-transcript-width, 768px\) \+ var\(--chat-column-gutter-start\) \+ var\(--chat-column-gutter-end\)\);/);
  assert.match(rule, /^[^}]*padding-inline: var\(--chat-column-gutter-start\) var\(--chat-column-gutter-end\);/);
  assert.ok(composer.includes('@container (max-width: 560px) { .composer-error:not(.inline-error), .ssn-list, .sqm-band { --chat-gutter: 16px; } }'));
  assert.ok(composer.includes('[data-chat-gutter-start=shave] :is(.composer-error:not(.inline-error), .ssn-list, .sqm-band)'));
  assert.doesNotMatch(read('src/source-session-notices.css'), /calc\(100% - 64px\)/);
  assert.doesNotMatch(read('src/source-queued-messages.css'), /calc\(100% - 64px\)|max-width: 768px/);
});

test('DC-01: message-style.css keeps no 0.1 rule whose class nothing names', () => {
  const css = read('src/message-style.css');
  for (const name of ['markdown', 'copy-message', 'tool-card', 'thought', 'working', 'pulsing', 'approval', 'primary', 'question', 'file-path', 'file-list', 'file-preview', 'muted', 'error-text'])
    assert.doesNotMatch(rules(css), new RegExp(`\\.${name}(?![\\w-])`), name);
  // W14-code r3 css3-dead-rules ③: flex-shrink / border-left were overridden by every .source-side-tile panel (flex: 1,
  // border-left: 0) and the block .section-surface; the header's 13px (inherited by .source-pane-title) stays.
  assert.match(css, /\.detail-panel \{\n  display: flex;\n  flex-direction: column;\n  overflow: hidden;\n\}/);
  assert.match(css, /\.detail-panel > header \{\n  font-size: 13px;\n\}/);
  assert.match(css, /:root\[data-dframe\] \[data-cds="TextLink"\]/);
});
