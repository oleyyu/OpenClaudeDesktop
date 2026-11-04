// W14-code round 4, lane "toasts" (data/w14code/round4/plan/toasts.json): toast / error routing in main.jsx (staging
// notices out of state updaters, partial successes as addWarning, refusals and failures with official copy and timeouts),
// the Code-only removal of host toasts and of the computer-use strip, and Customize's plugin results. Source-only:
// official chunks are read (never run); host modules are rendered with react-dom/server through Vite SSR.
import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createServer } from 'vite';
import react from '@vitejs/plugin-react';
import { commandRefusal, sessionCommands, REFUSAL_TIMEOUT } from '../src/session-command-model.mjs';
import { MAX_IMAGES_TIMEOUT } from '../src/composer-attachments-model.mjs';
import { operationFailureToast, OPERATION_FAILURE_COPY, COMPACT_FAILED } from '../src/session-operation-toast.mjs';

const ROOT = path.resolve(import.meta.dirname, '..');
const V1 = path.join(ROOT, '../reference/snapshots/claude-3.6556.2-20261025-192807/ion-dist/assets/v1');
const EN = JSON.parse(fs.readFileSync(path.join(V1, '../../i18n/en-US.json'), 'utf8'));
const chunk = (prefix) => fs.readFileSync(path.join(V1, fs.readdirSync(V1).find((name) => name.startsWith(prefix) && name.endsWith('.js'))), 'utf8');
const source = (file) => fs.readFileSync(path.join(ROOT, file), 'utf8');
const main = source('src/main.jsx');
const zh = async (file) => (await import(`../electron/i18n/zh-CN/${file}`)).default;

let server, Cu, Customize;
before(async () => {
  server = await createServer({ configFile: false, root: ROOT, plugins: [react()], server: { middlewareMode: true, hmr: false, watch: null }, appType: 'custom', logLevel: 'error' });
  Cu = await server.ssrLoadModule('/src/source-computer-use.jsx');
  Customize = await server.ssrLoadModule('/src/source-customize.jsx');
});
after(() => server?.close());

// ---- r4-composer-04 (regression) ----------------------------------------------------------------------------------
test('r4-composer-04: staging notices leave the setAttachments updater; a rerun of the updater toasts once', async () => {
  // c0fbbe82d Ha raises addWarning from the handler: `m(f.formatMessage({…id:"2jkIk4kqLa"}),{timeout:Ma})`.
  assert.ok(chunk('c0fbbe82d').includes('id:"2jkIk4kqLa"}),{timeout:Ma})'));
  const start = main.indexOf('  const stageAttachments = (compute, follow = stagingNotices) => {');
  assert.ok(start > 0);
  const helper = main.slice(start, main.indexOf('\n  };\n', start) + 5);
  // Run the real helper text against a setAttachments that reruns its updater (React rebasing an update).
  const shown = [], microtasks = [];
  let entries = ['a'];
  const setAttachments = (updater) => { updater(entries); entries = updater(entries); };
  const stageAttachments = new Function('setAttachments', 'stagingNotices', 'queueMicrotask', `${helper}; return stageAttachments;`)(
    setAttachments, (notices) => shown.push(...notices), (fn) => microtasks.push(fn));
  let runs = 0;
  stageAttachments((list) => { runs += 1; return { entries: [...list, 'b'], notices: [`notice ${runs}`] }; });
  assert.equal(runs, 2, 'the updater ran twice');
  assert.deepEqual(shown, [], 'nothing is shown from inside the updater');
  assert.equal(microtasks.length, 1, 'one follow-up is scheduled');
  microtasks[0]();
  assert.deepEqual(shown, ['notice 2'], 'the last run\'s notices, once');
  assert.deepEqual(entries, ['a', 'b']);
  // Every staging updater returns its notices instead of toasting: Add folder paths, queue edit, Capture screen, Add files.
  assert.equal(main.match(/return \{ entries: next, notices: staged\.notices \};/g).length, 4);
  assert.equal(main.match(/stagingNotices\(staged\.notices\);/g), null);
  assert.doesNotMatch(main, /setAttachments\(\(entries\) => \{[^}]*toasts\.add/);
  // stageComposerFiles keeps its own once-scheduled follow-up (followStaging).
  assert.ok(main.includes('if (!scheduled) { scheduled = true; queueMicrotask(() => followStaging(outcome)); }'));
});

// ---- r4-composer-06 ------------------------------------------------------------------------------------------------
test('r4-composer-06: UfDkK7lgLJ, LPNNW+cd/e and the /btw refusals take timeout nT (8 s)', () => {
  const cc = chunk('cc43287c9');
  assert.ok(cc.includes('Wt as nT'));
  assert.ok(chunk('c03935b01').includes('Oi=8e3'));
  for (const id of ['UfDkK7lgLJ', 'LPNNW+cd/e']) assert.ok(new RegExp(`id:"${id.replace(/[+/]/g, '\\$&')}"\\}\\),\\{(?:messageForLogging:"[^"]+",)?timeout:nT\\}`).test(cc), id);
  assert.ok(cc.includes('id:"vEGwpw5DVX"}),{messageForLogging:"epitaxy: /btw unavailable",timeout:nT})'));
  assert.equal(MAX_IMAGES_TIMEOUT, 8000);
  assert.equal(REFUSAL_TIMEOUT, 8000);
  const command = (id) => sessionCommands.find((entry) => entry.id === id);
  assert.deepEqual(commandRefusal(command('btw'), {}), { text: 'Side chat is available once this session starts. Send your first message to start it.', surface: 'toast', timeout: 8000 });
  assert.deepEqual(commandRefusal(command('btw'), { current: 'a', connected: true, sideQuestions: false }), { text: 'Side chat isn’t available in this session.', surface: 'toast', timeout: 8000 });
  // The other refusals carry no timeout (oa0lDdXjJz /diff before session, …).
  assert.ok(cc.includes('id:"oa0lDdXjJz"}),{messageForLogging:"epitaxy: /diff before session"})'));
  assert.deepEqual(commandRefusal(command('rename'), {}), { text: 'Start a session before renaming it.', surface: 'toast' });
  assert.ok(main.includes('else if (toasts) toasts.add(refusal.text, { variant: "danger", ...(refusal.timeout ? { timeout: refusal.timeout } : {}) }); else setError(refusal.text);'));
  assert.ok(main.includes('if (toasts) toasts.add(message, { variant: "danger", timeout: MAX_IMAGES_TIMEOUT }); else setError(message);'));
  assert.ok(main.includes('if (toasts) toasts.add(dropped, { variant: "warning", timeout: MAX_IMAGES_TIMEOUT }); else setError(dropped);'));
});

// ---- r4-composer-05 ------------------------------------------------------------------------------------------------
test('r4-composer-05: /clear\'s archive failure after the new session started is an 8 s warning toast in Code', () => {
  assert.ok(main.includes('.catch((e) => codeWarning(t("The new session started, but the old one couldn’t be archived: {error}", { error: e.message }), { timeout: MAX_IMAGES_TIMEOUT }));'));
  assert.ok(!main.includes('.catch((e) => setError(t("The new session started, but the old one couldn’t be archived'));
  // codeWarning keeps the card outside Code.
  assert.ok(main.includes('const codeWarning = (message, options) => { if (!message) return; if (mode === "code" && toasts) toasts.add(message, { variant: "warning", ...options }); else setError(message); };'));
});

// ---- r4-shared-01 --------------------------------------------------------------------------------------------------
test('r4-shared-01: fork / compact failures are the official addError copy; the core text only logged', async () => {
  assert.equal(EN.nGtjMsYWZD, 'Couldn’t fork this session.');
  assert.equal(EN.j49tT4QevF, 'Couldn’t start compacting.');
  assert.deepEqual(OPERATION_FAILURE_COPY, { fork: 'Couldn’t fork this session.', compact: COMPACT_FAILED });
  assert.equal(operationFailureToast({ operation: 'compact', phase: 'failed', error: 'x' }, 'f').message, 'Couldn’t start compacting.');
  assert.ok(main.includes('if (id === "compact") return void compactCallFailed(error, sequence === loadSeq.current);'));
  assert.ok(main.includes('const text = t("Couldn’t start compacting.");'));
  assert.equal((await zh('app.mjs'))['Couldn’t start compacting.'], '无法开始压缩。');
});

// ---- r4-shared-04 --------------------------------------------------------------------------------------------------
test('r4-shared-04: trusting a folder mid-session says nothing (official has no "Folder trusted"); the reconnect stays', () => {
  assert.ok(!Object.values(EN).some((text) => text.includes('Folder trusted')));
  assert.ok(!Object.values(EN).every((text) => !text.includes('Trust this workspace?')));
  assert.ok(!/t\("Folder trusted/.test(main));
  const trust = main.slice(main.indexOf('async function trustProject()'), main.indexOf('// The account\'s plan (account/read)'));
  assert.ok(trust.includes('await call("codex-trust-project", { cwd: workdir });') && trust.includes('await reconnect();'));
  assert.ok(main.includes('await call("customize", { operation: "mcp-trust", cwd: folder });'));
});

// ---- r4-composer-03 ------------------------------------------------------------------------------------------------
test('r4-composer-03: no dead thinking toggle props reach the working line', () => {
  for (const name of fs.readdirSync(V1).filter((file) => file.endsWith('.js'))) {
    const text = fs.readFileSync(path.join(V1, name), 'utf8');
    assert.ok(!text.includes('onToggleThinking') && !text.includes('thinking_toggle"'), name);
  }
  assert.ok(!Object.values(EN).some((text) => text.startsWith('Switched transcript view to')));
  assert.ok(!/onToggleThinking=|thinkingShown=|"thinking_toggle"|Switched transcript view to/.test(main));
  const status = source('src/source-transcript-status.jsx');
  assert.ok(!/onToggleThinking|thinkingShown|onOpenLink/.test(status));
});

// ---- r4-composer-07 ------------------------------------------------------------------------------------------------
test('r4-composer-07: failures 3.6556.2 reports with addError are danger toasts in Code (literal card elsewhere)', () => {
  const cc = chunk('cc43287c9');
  assert.ok(cc.includes('I.formatMessage({defaultMessage:"Start a local session first to run shell commands.",id:"AYbIPZOXfd"}),{messageForLogging:q?"epitaxy: bash mode outside local session":"epitaxy: bash mode before session"})'));
  assert.ok(/addError:R,addInfo:z,addSuccess:V,addWarning:H/.test(cc));
  assert.ok(cc.includes('R(I.formatMessage(DF.outputNotSent),{messageForLogging:'));
  assert.ok(chunk('cdc530824').includes('outputNotSent:{defaultMessage:"Couldn\\u2019t send the command\\u2019s output to Claude. Check the terminal tab.",id:"d5fsfXQAW1"}'));
  const capture = chunk('c752b32f8');
  assert.ok(capture.includes('addError:n}') && capture.includes('n(e.formatMessage({defaultMessage:"Could not capture screen.",id:"uGOETn5bfV"}),{error:r,messageForLogging:"Could not capture screen"})'));
  assert.ok(chunk('c4ae8f050').includes('a=R.formatMessage({defaultMessage:"Rename failed. You can try again.",id:"RPJrwRuqFv"});L(a),c(a,{error:e,messageForLogging:"Code session rename failed"})'));
  assert.ok(main.includes('const codeDanger = (message, options) => { if (!message) return; if (mode === "code" && toasts) toasts.add(message, { variant: "danger", ...options }); else setError(message); };'));
  assert.ok(main.includes('if (!id) { codeDanger(t("Start a local session first to run shell commands.")); return; }'));
  assert.ok(main.includes('codeDanger(t("Couldn’t send the command’s output to {core}. Check the terminal tab.", { core: coreName(boot?.core) }));'));
  assert.ok(main.includes('.catch((error) => { console.warn("Could not capture screen", error); codeDanger(t("Could not capture screen.")); });'));
  assert.ok(main.includes('else if (mode === "code" && toasts) { console.warn("Code session rename failed", error); toasts.add(t("Rename failed. You can try again."), { variant: "warning" }); }'));
  // No setError keeps one of these official sentences.
  for (const text of ['Start a local session first to run shell commands.', 'Could not capture screen.'])
    assert.ok(!main.includes(`setError(t("${text}"))`), text);
  // The slash-argument refusals stay the official literal card (cc43287c9 P/M jd), untouched here.
  assert.ok(main.includes('setError(t("/compact doesn’t take instructions with {core}. Send it without text after the command.", { core: coreName(boot?.core) }));'));
});

// ---- r4-shared-10 --------------------------------------------------------------------------------------------------
test('r4-shared-10: the computer-use strip is Chat / Cowork only (c5f921d63 M has no Code importer)', () => {
  const importers = fs.readdirSync(V1).filter((file) => file.endsWith('.js') && /import\{[^}]*\}from"\.\/c5f921d63-/.test(fs.readFileSync(path.join(V1, file), 'utf8'))).sort();
  assert.deepEqual(importers.map((file) => file.slice(0, 9)), ['c10f0af0c', 'c21f11e6d']);
  for (const prefix of ['cc32965c2', 'c96d752d0', 'cc43287c9', 'c227f4d5e']) assert.ok(!chunk(prefix).includes('c5f921d63'), prefix);
  assert.ok(main.includes('{current && mode !== "code" && computerUseSessions.includes(current) && <SourceComputerUseBanner'));
  // Chat / Cowork keep it as it was.
  const html = renderToStaticMarkup(React.createElement(Cu.SourceComputerUseBanner, { coreName: 'Codex', onStop() {} }));
  assert.match(html, /data-computer-use-banner=""/);
  assert.match(html, /Codex is using your computer/);
  assert.match(html, /data-testid="cu-docked-stop"/);
});

// ---- r4-shared-06 / customize-plugin-result ------------------------------------------------------------------------
test('r4-shared-06: a restart-required install says WV readyInNewSession; the host restart banner is gone', async () => {
  assert.equal(EN.NHsmCWvJf8, '{pluginName} is installed. Start a new session to use it.');
  assert.ok(chunk('shared-104').includes('id:"NHsmCWvJf8"'));
  const customize = source('src/source-customize.jsx');
  assert.ok(customize.includes('t("{pluginName} is installed. Start a new session to use it.", { pluginName })'));
  assert.ok(!customize.includes('Restart DeepSeek to load it') && !customize.includes('PluginRestartBanner') && !customize.includes('Plugin changes apply after'));
  assert.equal(Customize.PluginRestartBanner, undefined);
  assert.ok(!source('src/source-customize.css').includes('.cz-plugin-restart + .cz-form'));
  assert.equal((await zh('customize.mjs'))['{pluginName} is installed. Start a new session to use it.'], '{pluginName} 已安装。开始新会话即可使用。');
  // The install form still renders (idle / running), without a result line.
  const store = { inspectPlugin: async () => null, installPlugin: async () => null, clearPluginInstall() {}, markPluginInstallAnnounced() {} };
  const done = renderToStaticMarkup(React.createElement(Customize.AddPluginForm, { store, install: { requestId: 'r', spec: 'p', status: 'done', log: '', outcome: { ok: true, restartRequired: true, bundle: 'dsh-plugin-y', announced: true } }, onClose() {} }));
  assert.doesNotMatch(done, /Start a new session|Restart DeepSeek|role="alert"/);
  assert.match(done, />Close</);
});

test('customize-plugin-result: a disabled plugin switch is cursor-not-allowed; a failed install is a toast', () => {
  const official = chunk('c24c8737b');
  assert.ok(official.includes('className:n("inline-flex",U.isForceEnabled||U.isRequired||Te||xt?"cursor-not-allowed":"cursor-interactive")'));
  const customize = source('src/source-customize.jsx');
  assert.ok(customize.includes('<label className={disabled ? "inline-flex cursor-not-allowed" : "inline-flex cursor-interactive"}>'));
  assert.ok(customize.includes('} catch (reason) { console.warn("Plugin install failed", reason); toasts?.add?.(pluginFailureMessage(reason, "install"), { variant: "danger" }); }'));
  const form = customize.slice(customize.indexOf('export function AddPluginForm('), customize.indexOf('export function pluginManager('));
  assert.ok(!form.includes('setError(pluginFailureMessage(reason, "install"))'));
  // The list chip already matches c27f32a39 V ("cursor-interactive" only when it opens the row).
  assert.ok(chunk('c27f32a39').includes('u=i&&"cursor-interactive"'));
  assert.ok(source('src/source-customize-list.jsx').includes('${onClick ? " cursor-interactive" : ""}'));
});

// ---- review fix: BuiltinPlugins / AvailablePlugins install failures ------------------------------------------------
test('customize-plugin-result (review): built-in and available install failures are danger toasts, not inline rows', () => {
  // Official install results are toasts: c76f00e40 `m(nn(f,p?"readyInNewSession":"ready",…))`, cdbe53168 `R(ke(g,…))`.
  assert.ok(chunk('c76f00e40').includes('m(nn(f,p?"readyInNewSession":"ready",{pluginName:t}))'));
  assert.ok(chunk('cdbe53168').includes('R(ke(g,Ke?"readyInNewSession":"ready",{pluginName:o}))'));
  const customize = source('src/source-customize.jsx');
  const builtin = customize.slice(customize.indexOf('export function BuiltinPlugins('), customize.indexOf('export function AddMarketplaceForm('));
  assert.ok(builtin.includes('else if (outcome && !outcome.cancelled) toasts?.add?.(pluginFailureMessage(outcome.message, "install"), { variant: "danger" });'));
  assert.ok(builtin.includes('toasts?.add?.(pluginFailureMessage(reason, "install"), { variant: "danger" });'));
  assert.ok(!builtin.includes('setError(pluginFailureMessage('));
  // The inspection rejection (not a bundle / refused spec) stays inline.
  assert.ok(builtin.includes('setError(found?.reason || copy.notPluginMessage);'));
  const available = customize.slice(customize.indexOf('export function AvailablePlugins('), customize.indexOf('export function MarketplacesSection('));
  assert.ok(available.includes('toasts?.add?.(localizeBridgeText(pluginFailureMessage(reason, "install")), { variant: "danger" })'));
  assert.ok(!available.includes('setError') && !available.includes('data-available-error'));
  const rows = [{ id: 'a', name: 'Alpha', marketplaceName: 'm', marketplacePath: '/m', pluginName: 'alpha' }];
  const html = renderToStaticMarkup(React.createElement(Customize.AvailablePlugins, { rows, store: {} }));
  assert.ok(html.includes('data-available-plugin="a"') && !html.includes('cz-error'));
});
