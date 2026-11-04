// W14-code lane "global": source checks for the 3.6556.2 one-to-one items this lane restored (reports/W14-code/global.md).
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { pluginFailureMessage, pluginOperationKind, nativePluginOutcome, pluginChangeOutcome } from '../src/customize-model.mjs';
import { shortcutsDialogSections } from '../src/shortcuts-dialog-model.mjs';
import { applyAppearanceRoot } from '../src/appearance-root.mjs';
import { HOST_GROWTHBOOK } from '../src/host-growthbook.mjs';

const app = path.resolve(import.meta.dirname, '..');
const read = (file) => fs.readFileSync(path.join(app, file), 'utf8');
const snapshot = path.resolve(app, '../reference/snapshots/claude-3.6556.2-20261025-192807/ion-dist/assets/v1');
const official = (file) => fs.readFileSync(path.join(snapshot, file), 'utf8');

test('shared-02: Open in editor failure is c856385e2 pn — a warning toast "Couldn’t open this in {editor}.", reason only logged', () => {
  assert.ok(official('c856385e2-aEyDzrcK.js').includes('defaultMessage:"Couldn\\u2019t open this in {editor}.",id:"bJvNtDT5o+"'));
  const main = read('src/main.jsx');
  assert.match(main, /t\("Couldn’t open this in \{editor\}\.", \{ editor: editors\.find\(\(entry\) => entry\.type === type\)\?\.name \?\? type \}\)/);
  assert.match(main, /case "open-in-editor": return openInEditor\(target\.cwd, payload\?\.type\);/);
  assert.doesNotMatch(main, /Couldn’t open it in that editor\./);
});

test('shared-03 / shared-05 / shared-06 / shared-07 / shared-11: official copy or silence instead of host sentences', () => {
  assert.match(read('src/computer-use-model.mjs'), /release: \(\) => \[t\("Releasing app control"\), t\("Released app control"\), t\("Failed to release app control"\)\]/);
  const main = read('src/main.jsx');
  assert.doesNotMatch(main, /Couldn’t open a new window\./);
  assert.match(main, /"Your queued message wasn’t sent\. It’s back in the message box for you to send\."/);
  assert.ok(official('shared-28-DNYlf4wu.js').includes('Your queued message wasn\\u2019t sent. It\\u2019s back in the message box for you to send.'));
  assert.doesNotMatch(main, /e\.message \|\| t\("Could not generate a recap/);
  assert.match(main, /catch \(error\) \{ console\.warn\("Add folder to session failed", error\); \}/);
});

test('fr-cu-02: shared-78 failure copy per operation — toggle y1/v1, install T1 / update w1 via C1, remove E1', () => {
  // y1 → v1 (toggle): errno / HTTP / IPC wrapper / multi-line hidden, ENOSPC → _1.
  assert.equal(pluginFailureMessage("Error invoking remote method 'customize': Error: boom", 'toggle'), 'Failed to update plugin state.');
  assert.equal(pluginFailureMessage('EACCES: permission denied', 'toggle'), 'Failed to update plugin state.');
  assert.equal(pluginFailureMessage('ENOSPC: no space left', 'toggle'), 'Your disk is full. Free up space and try again.');
  assert.equal(pluginFailureMessage('Plugin is managed elsewhere.', 'toggle'), 'Plugin is managed elsewhere.');
  // C1 (install / update): the OG-cleaned reason as is (no errno / HTTP / multi-line / ENOSPC filter), empty → x1 / b1.
  assert.equal(pluginFailureMessage('EACCES: permission denied', 'install'), 'EACCES: permission denied');
  assert.equal(pluginFailureMessage('npm ERR (HTTP 404)', 'update'), 'npm ERR (HTTP 404)');
  assert.equal(pluginFailureMessage('ENOSPC: no space left', 'install'), 'ENOSPC: no space left');
  assert.equal(pluginFailureMessage('line one\nline two', 'update'), 'line one\nline two');
  assert.equal(pluginFailureMessage('  bad\u200b \u0007spec\u202e\ud800 ', 'install'), 'bad spec');
  assert.equal(pluginFailureMessage('\u200b\u2060', 'install'), 'Plugin couldn’t be installed. Try again.');
  assert.equal(pluginFailureMessage(null, 'update'), 'Plugin couldn’t be updated. Try again.');
  assert.equal(pluginFailureMessage('No package was found for this spec.', 'install'), 'No package was found for this spec.');
  // E1 (remove): ENOSPC → _1, every other reason → S1.
  assert.equal(pluginFailureMessage('ENOSPC: no space left', 'remove'), 'Your disk is full. Free up space and try again.');
  assert.equal(pluginFailureMessage('Plugin folder is locked.', 'remove'), 'Plugin couldn’t be removed. Try again.');
  assert.equal(pluginFailureMessage('line one\nline two', 'remove'), 'Plugin couldn’t be removed. Try again.');
  assert.equal(pluginOperationKind('plugin-install-native'), 'install');
  assert.equal(pluginOperationKind('plugin-enable-native'), 'toggle');
  assert.equal(pluginFailureMessage('x', 'toString'), 'x');
  assert.equal(nativePluginOutcome(null, new Error('raw uninstall reason'), 'plugin-uninstall').message, 'Plugin couldn’t be removed. Try again.');
  assert.equal(nativePluginOutcome(null, new Error('Marketplace unreachable'), 'plugin-install-native').message, 'Marketplace unreachable');
  assert.equal(pluginChangeOutcome({ application: 'failed', stage: 'enable', error: { diagnostic: 'a\nb' } }).message, 'Failed to update plugin state.');
  assert.equal(pluginChangeOutcome({ application: 'failed', stage: 'remove', error: { diagnostic: 'rm: busy' } }).message, 'Plugin couldn’t be removed. Try again.');
  assert.equal(pluginChangeOutcome({ application: 'failed', stage: 'remove', error: { code: 'not-removable' } }).message, 'This plugin is part of OpenClaude Desktop and cannot be removed.');
  // The header uninstall / update toast shows the outcome copy as is (no second E1 pass over a management answer).
  assert.match(read('src/source-customize.jsx'), /else if \(!outcome\.ok\) toasts\?\.add\?\.\(outcome\.message \|\| pluginFailureMessage\("", kind\), \{ variant: "danger" \}\);/);
  const shared78 = official('shared-78-D5Fw2h0a.js');
  for (const feature of [
    'defaultMessage:"Failed to update plugin state.",id:"rZb1d+ckYN"', 'defaultMessage:"Your disk is full. Free up space and try again.",id:"uNSLSkDvXS"', 'i.startsWith("Error invoking remote method")',
    'function C1(e,t,n){let r=e.trim(),i=r.startsWith("MARKETPLACE_ERROR:")?K$(r):null;return i===null?ge(r).trim()||n:h1(i,t)??n}',
    'function w1(e,t){return C1(e,t,b1(t))}', 'function T1(e,t){return C1(e,t,x1(t))}',
    'function E1(e,t){let n=S1(t),r=K$(e);return r===null?e.includes("ENOSPC")?_1(t):n:h1(r,t)??n}',
  ]) assert.ok(shared78.includes(feature), feature);
  assert.ok(official('shared-25-DOWZRSlq.js').includes('function OG(e){return FH(e).replace(EG(),"")}'));
  assert.ok(official('shared-25-DOWZRSlq.js').includes('EG=we(()=>RegExp(`(?![\\\\t\\\\n\\\\r\\\\u200c\\\\u200d])${CG}`,"gu"))'));
  assert.ok(official('shared-0-DDOOdL6P.js').includes('jL=Object.freeze([10240,65532,119129,78913,78914,92432,94180])'));
});

test('fr-cu-01: the plugin switch is c24c8737b — "Enable plugin" names it, the tooltip says Disable / Enable plugin', () => {
  const customize = read('src/source-customize.jsx');
  assert.match(customize, /<SourceTooltip content=\{t\(enabled \? "Disable plugin" : "Enable plugin"\)\} side="bottom">/);
  // W14-code r4 customize-plugin-result: c24c8737b `n("inline-flex", isForceEnabled || isRequired || Te || xt ?
  // "cursor-not-allowed" : "cursor-interactive")` — a switch that can't be pressed shows not-allowed.
  assert.match(customize, /<label className=\{disabled \? "inline-flex cursor-not-allowed" : "inline-flex cursor-interactive"\}>/);
  assert.doesNotMatch(customize, /Turn \{name\} off|Turn \{name\} on"/);
});

test('E81 F6 rows: c518a31cc je lists Focus next / previous page area after Settings on the Code route', () => {
  const general = shortcutsDialogSections({ route: 'code', mac: true })[0].rows.map((row) => row.command);
  assert.deepEqual(general.slice(general.indexOf('settings'), general.indexOf('settings') + 3), ['settings', 'focus-next-region', 'focus-previous-region']);
  assert.equal(HOST_GROWTHBOOK.__gb__1686253244, true);
  assert.equal(HOST_GROWTHBOOK.__gb__2215170874, true);
});

test('css-main-01: html carries the official data-chat-text-size / data-transcript-width (shared-20 Gh)', () => {
  const root = { dataset: {}, toggleAttribute() {}, style: { setProperty() {}, removeProperty() {} } };
  applyAppearanceRoot(root, { motion: 'system', interfaceFont: 'anthropic', codeFont: '', transcriptSize: 'l', transcriptWidth: 'm' }, { setThemes: (pair) => ({ light: 'a', dark: 'b', ...pair }), colors: {} });
  assert.equal(root.dataset.chatTextSize, 'l');
  assert.equal(root.dataset.transcriptWidth, 'm');
  assert.equal(root.dataset.localTranscriptSize, undefined);
  assert.ok(official('shared-20-mUr7IqZY.js').includes('n.dataset.chatTextSize=e,n.dataset.transcriptWidth=t'));
  for (const file of ['src/source-settings.css', 'src/source-home.css', 'src/source-btw-pane.css', 'src/source-response-table.jsx'])
    assert.doesNotMatch(read(file), /data-local-transcript/, file);
  assert.match(read('src/source-mcp-app-card-adapters.jsx'), /attributeFilter: \['data-chat-text-size'\]/);
});

test('dialog-backdrop-blur: shared-frame hy has no backdrop blur', () => {
  assert.ok(official('shared-frame-6jtSkIit.js').includes('"draggable-none fixed inset-0 bg-backdrop transition-opacity duration-base ease-out motion-reduce:transition-none'));
  assert.doesNotMatch(read('src/source-dialog.css'), /backdrop-filter/);
  assert.doesNotMatch(read('src/source-settings.css').split('\n').find((line) => line.startsWith('.ss-backdrop {')), /blur/);
});

test('TR-H8 / shared-10 / shared-08: notices are the sliced ChatComposerNotices stack with CDS Banners; trust opens the trust dialog', () => {
  const notices = read('src/source-session-notices.jsx');
  assert.match(notices, /import \{ ChatComposerNotices \} from "\.\/generated\/composer-notices\/composer-notices\.mjs";/);
  assert.match(notices, /import \{ WorkspaceTrustDialog \} from "\.\/generated\/code-routines\/index\.mjs";/);
  assert.doesNotMatch(notices, /Dismiss notice|t\("Notices"\)|Trusting…|ssn-notice|ssn-dismiss/);
  assert.match(notices, /label: t\("Trust workspace"\)/);
  const generated = read('src/generated/composer-notices/composer-notices.mjs');
  assert.match(generated, /"data-cds": "ChatComposerNotices"/);
  // W14-code r6 sleep lane: shared-26 kM (the composer band k_'s row draws, through shared-6 kT) is exported beside RM.
  assert.match(generated, /export \{ RM as ChatComposerNotices, kM as ChatComposerBand \};/);
  assert.match(read('src/generated/code-routines/index.mjs'), /export \{ ie as WorkspaceTrustDialog \} from "\.\/c165c93f1-DO0V7qMe\.mjs";/);
  assert.ok(fs.existsSync(path.join(app, 'scripts/verify-gen-composer-notices.mjs')));
});
