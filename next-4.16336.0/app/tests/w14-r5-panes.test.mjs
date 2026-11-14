import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createServer } from 'vite';
import react from '@vitejs/plugin-react';

// W14-code round 5, lane panes: the tasks pane's official ICU meta (r5pa-06), no host hint line (r5pa-04) or
// "Status unavailable" section (r5pa-05), the stop failure toast (r5-shared-08), persona brand (r5pa-03), the terminal
// strip without a host cap (r5pa-08), the native preview-site sheet's Allow once / Always allow (r5pa-11) and the
// leftovers of round 4 (r5pa-12 / R5DC-07). Official chunks are read as text only.
const require = createRequire(import.meta.url);
const app = path.resolve(import.meta.dirname, '..');
const snapshot = path.resolve(app, '../reference/snapshots/claude-3.6556.2-20261025-192807');
const v1 = path.join(snapshot, 'ion-dist/assets/v1');
const official = (name) => fs.readFileSync(path.join(v1, fs.readdirSync(v1).find((file) => file.startsWith(name) && file.endsWith('.js'))), 'utf8');
const enUS = JSON.parse(fs.readFileSync(path.join(snapshot, 'ion-dist/i18n/en-US.json'), 'utf8'));
const local = (file) => fs.readFileSync(path.join(app, file), 'utf8');
const h = React.createElement;

let server, B, persona, i18n, Notices;
before(async () => {
  server = await createServer({ configFile: false, root: app, plugins: [react()],
    server: { middlewareMode: true, hmr: false, watch: null }, appType: 'custom', logLevel: 'error' });
  B = await server.ssrLoadModule('/src/source-background-tasks.jsx');
  persona = await server.ssrLoadModule('/src/persona-store.mjs');
  i18n = await server.ssrLoadModule('/electron/i18n/index.mjs');
  Notices = await server.ssrLoadModule('/src/source-session-notices.jsx');
});
after(() => server?.close());

// The pane itself reads its stores with useSyncExternalStore (no server snapshot), so its rows are rendered one by one.
const pane = (tasks) => tasks.map((task) => renderToStaticMarkup(h(B.TaskCard, { task, sessionId: 'r5-panes', expanded: false, stopping: false,
  onStop() {}, onOpen() {}, onToggle() {} }))).join('');

test('r5pa-06 / r5pa-04 / r5pa-05: QM meta is the official ICU, no host hint line, unknown tasks sit under Running', () => {
  const chunk = official('cccc2cf0a-DhZC33Gc');
  assert.ok(chunk.includes('defaultMessage:"<v>{n}</v> tokens",id:"q8yC2bH6mD"'));
  assert.ok(chunk.includes('defaultMessage:"{n, plural, one {<v>#</v> tool use} other {<v>#</v> tool uses}}",id:"D1S12O0SBS"'));
  assert.ok(!chunk.includes('Status unavailable'), 'cccc2cf0a has no Status unavailable section');
  assert.ok(!Object.values(enUS).some((text) => /stop this task, or end the session/.test(text)));
  i18n.setLocale('en-US');
  const html = pane([
    { id: 'agent:a', kind: 'agent', threadId: 'a', description: 'Probe', status: 'running', stoppable: false, model: 'm1', tokens: 12345, toolUses: 1, startedAt: 1 },
    { id: 'agent:b', kind: 'agent', threadId: 'b', description: 'Lost', status: 'unknown', tokens: 999, toolUses: 2 },
    { id: 'agent:c', kind: 'agent', threadId: 'c', description: 'Done', status: 'completed', completedAt: 5, toolUses: 0 },
  ]);
  // W14-code r7 r7pa-07: QM `W = A ? jM : MM` — the value is jM's text-secondary span while the task runs, else MM's
  // bare fragment (the host .sbt-value span and its CSS are gone).
  assert.match(html, /<span><span class="text-secondary">12\.3k<\/span> tokens<\/span>/, 'n is shared-8 cX (compactTokens)');
  assert.match(html, /<span><span class="text-secondary">1<\/span> tool use<\/span>/);
  assert.match(html, /<span>2 tool uses<\/span>/);
  assert.match(html, /<span>0 tool uses<\/span>/);
  assert.doesNotMatch(html, /sbt-hint|Ask DeepSeek|end the session/);
  assert.doesNotMatch(html, /Status unavailable/);
  // The unknown row has no status word (a running row has none either); a finished one keeps its own.
  // r7pa-07: QM's first meta row `[ge, _e, ve, ye]` — the kind (text-secondary only while running), then the status.
  assert.match(html, /data-task-id="agent:b"[^]*?<span class="flex flex-wrap items-baseline gap-x-sm gap-y-0\.75"><span>Agent<\/span><\/span>/);
  assert.match(html, /data-task-id="agent:c"[^]*?<span>Agent<\/span><span>Completed<\/span>/);
  // The pane's sections: Running (with unknown tasks) and Finished only.
  const { taskSections } = require('../src/background-tasks-model.mjs');
  assert.deepEqual(Object.keys(taskSections([{ id: 'u', status: 'unknown' }, { id: 'r', status: 'running', startedAt: 1 }])), ['running', 'finished']);
  assert.deepEqual(taskSections([{ id: 'u', status: 'unknown' }, { id: 'r', status: 'running', startedAt: 1 }]).running.map((task) => task.id), ['r', 'u']);
  const source = local('src/source-background-tasks.jsx');
  assert.ok(!source.includes('sections.unknown'));
  assert.equal(source.split('<h3 className="text-footnote text-muted-as-secondary">').length - 1, 2, 'two headings: Running and Finished');
  assert.doesNotMatch(local('src/source-background-tasks.css'), /\.sbt-hint/);
  // zh-CN goes through the same ICU.
  i18n.setLocale('zh-CN');
  try {
    const zh = pane([{ id: 'agent:a', kind: 'agent', threadId: 'a', description: 'Probe', status: 'running', tokens: 1500, toolUses: 3, startedAt: 1 }]);
    assert.match(zh, /<span class="text-secondary">1\.5k<\/span> 个 token/);
    assert.match(zh, /<span class="text-secondary">3<\/span> 次工具调用/);
  } finally { i18n.setLocale('en-US'); }
});

test('r5-shared-08: a stop that fails is a danger toast (c6b8adeaf addError TFDx1BtHLl), not an sr-only line', () => {
  const chunk = official('c6b8adeaf-bLEQVSWL');
  assert.ok(chunk.includes('defaultMessage:"Couldn\\u2019t stop the task \\u2014 check your connection and try again.",id:"TFDx1BtHLl"}),{messageForLogging:"epitaxy: task stop failed"}'));
  const source = local('src/source-background-tasks.jsx');
  assert.ok(source.includes("toasts?.add?.(t('Couldn’t stop the task — check your connection and try again.'),{variant:'danger'})"));
  assert.ok(!source.includes("setNotice(t('Couldn’t stop the task"));
});

test('r5pa-03 (E83): the stopping loop and the viewport menu name the persona, not a fixed DeepSeek', () => {
  assert.ok(official('cccc2cf0a-DhZC33Gc').includes('defaultMessage:"Stop requested. Claude will cancel it.",id:"/td9FaldiX"'));
  assert.equal(enUS.NxfsCLc2Pl, 'Set by Claude');
  const loop = { id: 'l', prompt: 'Check CI', recurring: true, cron: '*/5 * * * *', nextFireAt: null, expiresAt: null };
  persona.setPersona({ assistantName: 'Nova' });
  try {
    const html = renderToStaticMarkup(h(B.LoopCard, { loop, stopping: true, onStop() {} }));
    assert.match(html, /aria-label="Stop requested\. Nova will cancel it\."/);
  } finally { persona.setPersona({}); }
  assert.ok(!local('src/source-background-tasks.jsx').includes('DeepSeek will cancel'));
  const preview = local('src/source-preview-pane.jsx');
  assert.ok(preview.includes("t('Set by {assistant}', { assistant: assistantName() })"));
  assert.ok(!preview.includes("t('DeepSeek')"));
});

test('r5pa-08 (E95): Zx has no per-session cap, so + is not disabled at 12 tabs and newTabAtCap is gone', () => {
  const chunk = official('cccc2cf0a-DhZC33Gc');
  assert.ok(!chunk.includes('newTabAtCap'));
  assert.ok(!Object.values(enUS).some((text) => /terminals per session/.test(text)));
  const source = local('src/source-terminal-pane.jsx');
  assert.ok(!source.includes('MAX_TERMINALS_PER_OWNER'));
  assert.ok(!source.includes('newTabAtCap:'));
  assert.ok(source.includes('createDisabled={!owner || !terminals.available}'));
  // W14-code R6DC-05: the main process no longer caps the user's tabs either (official asar index.chunk-hSh48Lyb.js
  // only budgets remote hosts, `liveChannels()+i()+1<=9`); only the agent's tabs keep the cap, and adopt moves them all.
  const service = local('electron/terminal-service.cjs');
  assert.match(service, /if \(openedBy === "agent" && mine\.length >= model\.MAX_TERMINALS_PER_OWNER\) throw new Error\("Too many terminals are open in this session\."\);/);
  assert.equal((service.match(/MAX_TERMINALS_PER_OWNER/g) ?? []).length, 1);
  assert.ok(!/moving\.slice\(0, room\)/.test(service));
  assert.match(local('electron/agent-tools/terminal.mjs'), /tabs\.length >= MAX_TERMINALS_PER_OWNER/);
});

test('r5pa-11: the native preview-site sheet says what the card says and answers Allow once / Always allow', async () => {
  assert.equal(enUS.G2uuEyevXT, 'Allow once applies to this page only. Always allow saves on this device (revoke in Settings). Claude won’t purchase, create accounts, or bypass captchas without asking.');
  const { createAgentToolApproval, approvalCopy } = require('../electron/agent-tool-approval.cjs');
  const t = (text, values = {}) => text.replace(/\{(\w+)\}/g, (match, key) => values[key] ?? match);
  const copy = approvalCopy({ kind: 'preview-site', host: 'a.example', url: 'https://a.example/' }, { t, assistant: 'Nova' });
  assert.equal(copy.detail, 'Allow once applies to this page only. Always allow saves on this device (revoke in Settings). Nova won’t purchase, create accounts, or bypass captchas without asking.');
  assert.deepEqual([copy.allow, copy.always, copy.deny], ['Allow once', 'Always allow', 'Don’t allow']);
  assert.doesNotMatch(copy.detail, /in this session/);
  for (const [response, answer] of [[0, { approved: true, always: false }], [1, { approved: true, always: true }], [2, { approved: false, always: false }]]) {
    const shown = [];
    const dialog = { showMessageBox: async (...args) => { shown.push(args.at(-1)); return { response }; } };
    const ask = createAgentToolApproval({ dialog, t, windowFor: () => null, assistant: () => 'Nova' });
    assert.deepEqual(await ask({ id: 's' }, { kind: 'preview-site', host: 'a.example', url: 'https://a.example/' }), answer);
    assert.deepEqual(shown[0].buttons, ['Allow once', 'Always allow', 'Don’t allow']);
    assert.equal(shown[0].cancelId, 2);
  }
  // Other kinds still answer a boolean.
  const dialog = { showMessageBox: async () => ({ response: 0 }) };
  assert.equal(await createAgentToolApproval({ dialog, t, windowFor: () => null })({ id: 's' }, { kind: 'chrome-site', host: 'b' }), true);
  // zh-CN carries both the sentence and the buttons.
  i18n.setLocale('zh-CN');
  try {
    const zh = approvalCopy({ kind: 'preview-site', host: 'a.example' }, { t: i18n.t, assistant: 'Nova' });
    assert.match(zh.detail, /“允许一次”仅适用于此页面。/);
    assert.match(zh.detail, /Nova 不会购买/);
    assert.deepEqual([zh.allow, zh.always], ['允许一次', '始终允许']);
  } finally { i18n.setLocale('en-US'); }
});

test('r5pa-12 / R5DC-07: no plan-card error line, no notices extra slot, no remembered Action Center counts', () => {
  const plan = local('src/source-plan-card.jsx');
  assert.ok(!plan.includes('!toasts && view.error'));
  assert.ok(plan.includes('toasts?.add?.(result.message, { variant: "danger" })'));
  assert.ok(local('src/main.jsx').includes('<SourceToastProvider'), 'the toast region wraps the root');
  const notices = local('src/source-session-notices.jsx');
  assert.ok(!/\bextra\b(?! slot|`)/.test(notices.replace(/^\/\/.*$/gm, '')));
  assert.equal(renderToStaticMarkup(h(Notices.SourceSessionNotices, { notices: [], extra: h('b', null, 'x') })), '', 'an extra node is no longer drawn');
  const main = local('electron/main.cjs');
  assert.ok(!main.includes('rememberedActionCenterCounts'));
  assert.match(main, /case "home-shape":[\s\S]{0,400}?return \{ displayName: config\.displayName \|\| "" \};/);
});
