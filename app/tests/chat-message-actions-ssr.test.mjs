// w13-chatfn-branches: the Chat reply toolbar's version switcher (cc1aae219 lI) and Retry as a new version. SSR of
// src/source-chat-message-actions.jsx against the 3.6556.2 original text (classes, testids, icons, copy ids), plus
// source locks on the host wiring in main.jsx. Source only: no browser, no network.
import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createServer } from 'vite';
import react from '@vitejs/plugin-react';
import { closeWhenSettled } from './support/vite-ssr-settle.mjs';

const app = path.resolve(import.meta.dirname, '..');
const v1 = path.resolve(app, '../reference/snapshots/claude-3.6556.2-20261025-192807/ion-dist/assets/v1');
const official = (name) => fs.readFileSync(path.join(v1, name), 'utf8');
const enUS = JSON.parse(fs.readFileSync(path.resolve(v1, '../../i18n/en-US.json'), 'utf8'));
const local = (rel) => fs.readFileSync(path.join(app, rel), 'utf8');
const h = React.createElement;

globalThis.document ??= { body: { nodeType: 1 }, head: { appendChild() {} }, createElement: () => ({ relList: { supports: () => false }, setAttribute() {}, style: {} }),
  querySelector: () => null, querySelectorAll: () => [], getElementById: () => null, addEventListener() {}, removeEventListener() {},
  documentElement: { dataset: {}, getAttribute: () => null, hasAttribute: () => false } };
globalThis.window ??= { document: globalThis.document, navigator: { userAgent: 'Mozilla/5.0 (Macintosh)' }, addEventListener() {}, removeEventListener() {},
  matchMedia: () => ({ matches: false, addEventListener() {}, removeEventListener() {} }), localStorage: { getItem: () => null, setItem() {} },
  location: { pathname: '/', search: '', hash: '', href: 'app://local/' }, history: { state: null, replaceState() {} } };

let server, i18n, actions;
before(async () => {
  server = await createServer({ configFile: false, root: app, plugins: [react()],
    server: { middlewareMode: true, hmr: false, ws: false, watch: null }, appType: 'custom', logLevel: 'error' });
  i18n = await server.ssrLoadModule('/electron/i18n/index.mjs');
  i18n.setLocale('en-US');
  actions = await server.ssrLoadModule('/src/source-chat-message-actions.jsx');
});
after(async () => { i18n?.setLocale('en-US'); await closeWhenSettled(server); await server?.close(); });

const attrs = (html, testid) => html.match(new RegExp(`<button [^>]*data-testid="${testid}"[^>]*>`))?.[0] ?? '';
const toolbar = (props = {}) => renderToStaticMarkup(h(actions.SourceChatMessageActions, { conversationUuid: 't1', itemId: 'i1', text: 'Hi',
  onFeedback: async () => {}, onRetry: () => {}, onVersion: () => {}, ...props }));

test('official evidence: lI (cc1aae219) and its copy ids in the 3.6556.2 catalog', () => {
  const text = official('cc1aae219-CeSwM-tp.js');
  for (const s of ['className:"!text-muted-as-secondary hover:!text-primary !w-6"', 'icon:"CaretLeft"', 'icon:"CaretRight"',
    '"user-message-previous-version":"action-bar-previous-version"', '"user-message-next-version":"action-bar-next-version"',
    'className:"self-center shrink-0 select-none font-small text-muted-as-secondary"', 'className:"inline-flex items-center gap-1"',
    'defaultMessage:"{selectedOption} / {totalOptions}",id:"0zCqdBEnn7"', 'defaultMessage:"Previous version",id:"nZObrEhD3u"',
    'defaultMessage:"Next version",id:"vfItgW2tkJ"', '"data-testid":"failed-send-retry"', '"data-testid":"action-bar-retry"',
    '"data-testid":"user-message-edit"'])
    assert.ok(text.includes(s), s);
  // tO: the switcher shows for a settled message with more than one option.
  assert.ok(text.includes('function tO({isStreaming:e,optionCount:t,isAgentMode:n,hostShowsVersionNav:r}){return!e&&t>1&&!n&&r}'));
  assert.equal(enUS.nZObrEhD3u, 'Previous version');
  assert.equal(enUS.vfItgW2tkJ, 'Next version');
  assert.equal(enUS['0zCqdBEnn7'], '{selectedOption} / {totalOptions}');
  // "Branch to new chat" lives in ca2ef848d b1, the Chat side-question panel (GitBranch beside "Copy answer"), not in r1.
  const side = official('ca2ef848d-ChLvq6yZ.js');
  assert.ok(side.includes('defaultMessage:"Branch to new chat",id:"9904KlI+jU"'));
  assert.ok(side.includes('icon:"GitBranch"'));
  assert.ok(!text.includes('Branch to new chat'));
});

test('SSR: the switcher is lI after Retry — 1 / 2 has Previous disabled, testids, icons and classes as the original', () => {
  const html = toolbar({ versions: { selectedOption: 0, nOptions: 2, previous: null, next: 'v1' } });
  const order = [...html.matchAll(/data-testid="([^"]+)"/g)].map((m) => m[1]);
  assert.deepEqual(order, ['message-actions', 'action-bar-copy', 'action-bar-thumbs-up', 'action-bar-thumbs-down', 'action-bar-retry',
    'action-bar-previous-version', 'action-bar-next-version']);
  assert.match(html, /<div class="inline-flex items-center gap-1"><button /);
  const previous = attrs(html, 'action-bar-previous-version'), next = attrs(html, 'action-bar-next-version');
  assert.match(previous, / disabled=""/);
  assert.doesNotMatch(next, / disabled=""/);
  assert.match(previous, /aria-label="Previous version"/);
  assert.match(next, /aria-label="Next version"/);
  for (const button of [previous, next]) {
    assert.match(button, /data-cds="Button"[^>]*data-cds-ghost=""/);
    assert.match(button, /!text-muted-as-secondary hover:!text-primary !w-6/);
  }
  assert.match(html, /<span class="self-center shrink-0 select-none font-small text-muted-as-secondary">1 \/ 2<\/span>/);
  // 2 / 2: Next disabled. 2 / 3: both live.
  const last = toolbar({ versions: { selectedOption: 1, nOptions: 2, previous: 'r', next: null } });
  assert.match(attrs(last, 'action-bar-next-version'), / disabled=""/);
  assert.doesNotMatch(attrs(last, 'action-bar-previous-version'), / disabled=""/);
  assert.match(last, />2 \/ 2<\/span>/);
  const middle = toolbar({ versions: { selectedOption: 1, nOptions: 3, previous: 'r', next: 'b' } });
  assert.doesNotMatch(attrs(middle, 'action-bar-previous-version') + attrs(middle, 'action-bar-next-version'), / disabled=""/);
  // One version, streaming, or no host switch: no switcher (tO).
  assert.doesNotMatch(toolbar(), /previous-version/);
  assert.doesNotMatch(toolbar({ versions: { selectedOption: 0, nOptions: 1 } }), /previous-version/);
  assert.doesNotMatch(toolbar({ versions: { selectedOption: 0, nOptions: 2 }, streaming: true }), /previous-version/);
  assert.doesNotMatch(toolbar({ versions: { selectedOption: 0, nOptions: 2 }, onVersion: null }), /previous-version/);
});

test('SSR: a human message\'s switcher uses the user-message testids; zh-CN copy', () => {
  const html = renderToStaticMarkup(h(actions.SourceChatVersionNav, { message: { sender: 'human', selectedOption: 1, nOptions: 2 }, changeDisplayedConversationPath: () => {} }));
  assert.match(attrs(html, 'user-message-previous-version'), /aria-label="Previous version"/);
  assert.match(attrs(html, 'user-message-next-version'), / disabled=""/);
  i18n.setLocale('zh-CN');
  try {
    const zh = toolbar({ versions: { selectedOption: 0, nOptions: 2 } });
    assert.match(attrs(zh, 'action-bar-previous-version'), /aria-label="上一个版本"/);
    assert.match(attrs(zh, 'action-bar-next-version'), /aria-label="下一个版本"/);
    assert.match(zh, />1 \/ 2<\/span>/);
  } finally { i18n.setLocale('en-US'); }
});

test('host wiring: Retry on a reply makes a version where the core forks at a turn; versions switch; the resend fallback stays', () => {
  const main = local('src/main.jsx');
  assert.match(main, /import \{ SourceChatMessageActions, useChatFeedback, useChatBranches, withChatBranchMetadata, turnAttachments \} from '\.\/source-chat-message-actions\.jsx';/);
  assert.match(main, /const chatBranches = useChatBranches\(\{ threadId: mode === "chat" \? current : null, call,/);
  assert.match(main, /codeForkServed\(current, boot\?\.core\?\.capabilities, sessionMetadata\)/);
  // w13-close-chat-messages (chatui-message-actions-03): Retry, the version Retry and the E63 chatfn-branches-08 fallback
  // ("the same prompt once more" where the core cannot fork at a turn) all resend the turn's files with the prompt.
  assert.match(main, /const chatBranch = chatBranches\.forTurn\(items, footer\.turnId, \(row\) => messageItemText\(shownUserItem\(row\)\), turnAttachments\);/);
  assert.match(main, /onRetry=\{chatBranch\.onRetry \?\? \(chatPrompt \? \(\) => void sendMessage\(chatPrompt, turnAttachments\(items, footer\.turnId\), \[\], \{ resend: true \}\) : null\)\}/);
  assert.match(main, /versions=\{chatBranch\.versions\} onVersion=\{chatBranches\.select/);
  // The pending prompt goes out once the version is open and idle.
  assert.match(main, /const next = chatBranches\.pendingFor\(current\);\n\s+if \(!next \|\| loading \|\| running \|\| sending \|\| !boot\?\.connected\) return;\n\s+chatBranches\.clearPending\(\);\n\s+void sendMessage\(next\.text, next\.attachments \?\? \[\], \[\], \{ resend: true \}\);/);
  // The switcher is the generated lI (w13-close-gen-dedup, D1); no view-tabs facade in this chat-graph file (E41).
  const source = local('src/source-chat-message-actions.jsx');
  assert.match(source, /import \{ ChatVersionSelector \} from '\.\/generated\/chat-messages\/version-selector\.mjs';/);
  assert.match(source, /export const SourceChatVersionNav = ChatVersionSelector;/);
  assert.doesNotMatch(source, /view-tabs\/index\.js/);
});
