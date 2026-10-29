import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createHash } from 'node:crypto';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createServer } from 'vite';
import react from '@vitejs/plugin-react';
import { closeWhenSettled } from './support/vite-ssr-settle.mjs';
import { feedbackMessage, feedbackRating, feedbackRequest, normalizeFeedbackStore, putFeedback, retryPrompt, threadFeedback } from '../src/chat-feedback-model.mjs';
import { createChatFeedbackStore } from '../electron/chat-feedback.mjs';

// w13-chatui-message-actions (research/w13-chatui.md chatui-C2/C5/C6/C7/C8/C18): the Chat surface's reply toolbar,
// disclaimer and message context menu from the 3.6556.2 originals (scripts/extract-chat-messages.mjs →
// src/generated/chat-messages), the local feedback store, and the retry prompt. Source only: generator --check,
// official text, SSR markup, plain node for the models; no browser, no network.
const app = path.resolve(import.meta.dirname, '..');
const v1 = path.resolve(app, '../reference/snapshots/claude-3.6556.2-20261025-192807/ion-dist/assets/v1');
const official = name => fs.readFileSync(path.join(v1, name), 'utf8');
const local = rel => fs.readFileSync(path.join(app, rel), 'utf8');
const directory = path.join(app, 'src/generated/chat-messages');
const manifest = JSON.parse(fs.readFileSync(path.join(directory, 'manifest.json'), 'utf8'));
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
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

const toolbar = (props = {}) => renderToStaticMarkup(h(actions.SourceChatMessageActions, { conversationUuid: 't1', itemId: 'i1', text: 'Hello **there**',
  onFeedback: async () => {}, onRetry: () => {}, ...props }));
const attrs = (html, testid) => html.match(new RegExp(`<[a-z]+ [^>]*data-testid="${testid}"[^>]*>`))?.[0] ?? '';

test('generator: --check passes and the manifest pins the 3.6556.2 originals, adapters and the linked MessageActions', async () => {
  const { extractChatMessages } = await import('../scripts/extract-chat-messages.mjs');
  await extractChatMessages({ check: true });
  assert.equal(manifest.referenceVersion, '3.6556.2');
  assert.equal(manifest.referenceSnapshot, 'snapshots/claude-3.6556.2-20261025-192807');
  assert.deepEqual(manifest.modules.map(m => [m.target, m.source]), [
    ['feedback-type.mjs', 'shared-0-DDOOdL6P.js'], ['message-uuid.mjs', 'shared-130-dWztbTO1.js'],
    ['composer-lock.mjs', 'shared-26-CGuBxVt9.js'], ['user-message-row.mjs', 'shared-2-TF8v67kg.js'],
    ['retry-action.mjs', 'shared-4-DUB1Oi0O.js'], ['feedback.mjs', 'cc1aae219-CeSwM-tp.js'],
    // w13-chatfn-tools (review 补做, C9): the reply's web link test (shared-130 Gq) and the message warning (cc1aae219 eP).
    ['message-links.mjs', 'shared-130-dWztbTO1.js'], ['context-class.mjs', 'shared-9-CM21XrJw.js'], ['message-warning.mjs', 'cc1aae219-CeSwM-tp.js'],
    // w13-close-gen-dedup (chatfn-branches-05): the version selector lI.
    ['version-selector.mjs', 'cc1aae219-CeSwM-tp.js'],
    ['disclaimer-classes.mjs', 'shared-8-Db1QN4mf.js'], ['disclaimer.mjs', 'ca2ef848d-ChLvq6yZ.js'],
    ['context-menu.mjs', 'c79f7d2ef-Dx3psRYW.js'],
    // w13-close-chat-messages (chatui-message-actions-02): the details form OF opens (shared-6 iT) and its shared-5 / shared-0 parts.
    ['feedback-form-parts.mjs', 'shared-5-Bg6ZMqvt.js'], ['content-report-link.mjs', 'shared-0-DDOOdL6P.js'], ['feedback-form.mjs', 'shared-6-sd9jbJqs.js']]);
  assert.deepEqual(fs.readdirSync(directory).sort(), [...manifest.modules.map(m => m.target), 'manifest.json'].sort());
  for (const module of manifest.modules) {
    assert.equal(module.sourceSha256, sha(fs.readFileSync(path.join(v1, module.source))), module.source);
    assert.equal(module.sha256, sha(fs.readFileSync(path.join(directory, module.target))), module.target);
  }
  assert.deepEqual(manifest.linked, [{ original: 'shared-2-TF8v67kg.js#R6', graph: 'working-line', target: 'shared-2.mjs', name: 'R6' },
    { original: 'shared-5-Bg6ZMqvt.js#$L', graph: 'sidebar-sections', target: 'dialog-presence.mjs', name: 'useDialogPresence' }]); // w13-close-chat-messages
  const adapters = manifest.adapters.map(a => a.original);
  for (const original of ['cc1aae219-CeSwM-tp.js#MF', 'cc1aae219-CeSwM-tp.js#OF', 'shared-4-DUB1Oi0O.js#Wv', 'shared-26-CGuBxVt9.js#CF', 'shared-2-TF8v67kg.js#i8',
    'ca2ef848d-ChLvq6yZ.js#Gz', 'shared-25-DOWZRSlq.js#Cx']) assert.ok(adapters.includes(original), original);
  // Generated output imports view-tabs only by semantic name (R6) and never through the facade (E2).
  for (const module of manifest.modules) {
    const text = fs.readFileSync(path.join(directory, module.target), 'utf8');
    assert.doesNotMatch(text, /view-tabs\/index\.js/);
    for (const m of text.matchAll(/import \{([^}]*)\} from "\.\.\/view-tabs\/[^"]+";/g))
      for (const spec of m[1].split(',').map(s => s.trim()).filter(Boolean)) assert.ok(/^[A-Za-z]\w{3,} as /.test(spec) || /^\w{4,}$/.test(spec), spec);
  }
});

test('official evidence: r1 toolbar parts, the thumbs, the retry action, the disclaimer and the context menu', () => {
  const messages = official('cc1aae219-CeSwM-tp.js');
  for (const s of ['"data-testid":"action-bar-copy"', '"data-testid":"action-bar-retry"', '"data-testid":"message-actions"', 'cdsPresets:!0',
    'n1="ms-[calc(var(--msg-text-inset,0.5rem)_-_0.375rem)]"', 'defaultMessage:"Good response"', 'defaultMessage:"Bad response"', 'WF as si'])
    assert.ok(messages.includes(s), s);
  assert.ok(official('shared-4-DUB1Oi0O.js').includes('defaultMessage:"Retry",id:"62nsdyMyIO"'));
  const chat = official('ca2ef848d-ChLvq6yZ.js');
  assert.ok(chat.includes('defaultMessage:"Claude is AI and can make mistakes. Please double-check responses.",id:"Hz3uf5n9Ga"'));
  assert.ok(chat.includes('"pointer-events-auto relative z-0 -mt-10 bg-surface-1 pb-2 pt-12 text-center text-xs text-muted-as-secondary"'));
  assert.ok(official('c79f7d2ef-Dx3psRYW.js').includes('w as MessageContextMenu'));
  assert.ok(official('frame-shell-chrome-DJqydhu7.js').includes('defaultMessage:"Feedback sent"'));
});

test('SSR: the reply toolbar is the MessageActions compound with Copy, Good / Bad response and Retry in r1 order', () => {
  const html = toolbar();
  const root = attrs(html, 'message-actions');
  assert.match(root, /data-cds="MessageActions"/);
  assert.match(root, /role="toolbar"/);
  assert.match(root, /class="[^"]*ms-\[calc\(var\(--msg-text-inset,0\.5rem\)_-_0\.375rem\)\] -mt-1"/);
  const order = [...html.matchAll(/data-testid="([^"]+)"/g)].map(m => m[1]);
  assert.deepEqual(order, ['message-actions', 'action-bar-copy', 'action-bar-thumbs-up', 'action-bar-thumbs-down', 'action-bar-retry']);
  assert.match(attrs(html, 'action-bar-copy'), /aria-label="Copy"/);
  assert.match(attrs(html, 'action-bar-thumbs-up'), /aria-label="Good response"/);
  assert.match(attrs(html, 'action-bar-thumbs-down'), /aria-label="Bad response"/);
  assert.match(attrs(html, 'action-bar-retry'), /aria-label="Retry"/);
  assert.match(attrs(html, 'action-bar-retry'), /aria-disabled:opacity-disabled/);
  for (const id of ['action-bar-copy', 'action-bar-thumbs-up', 'action-bar-retry']) assert.match(attrs(html, id), /data-cds="Button"[^>]*data-cds-ghost=""/);
  // A kept rating presses its thumb (UF: `n.chat_feedback?.type` includes "upvote" / "flag").
  assert.match(attrs(toolbar({ feedback: { i1: { type: 'upvote' } } }), 'action-bar-thumbs-up'), /aria-pressed="true"/);
  assert.match(attrs(toolbar({ feedback: { i1: { type: 'flag/bug' } } }), 'action-bar-thumbs-down'), /aria-pressed="true"/);
  assert.match(attrs(toolbar(), 'action-bar-thumbs-up'), /aria-pressed="false"/);
  // No retry when this reply cannot be retried; disabled while the core is busy (Jv: disabled: t).
  assert.doesNotMatch(toolbar({ onRetry: null }), /action-bar-retry/);
  assert.match(attrs(toolbar({ retryBlocked: true }), 'action-bar-retry'), / disabled=""/);
  // Streaming hides the toolbar (r1 `Y.isHiddenDuringStreaming && "invisible"`).
  assert.match(attrs(toolbar({ streaming: true }), 'message-actions'), /-mt-1 invisible"/);
});

test('SSR: the disclaimer is U9 where the conversation ends, linking the support article', () => {
  const html = renderToStaticMarkup(h(actions.SourceChatDisclaimer, { conversationUuid: 't1', onOpenLink: () => {} }));
  assert.match(html, /^<div role="note" data-disclaimer="true" class="pointer-events-auto relative z-0 -mt-10 bg-surface-1 pb-2 pt-12 text-center text-xs text-muted-as-secondary">/);
  assert.match(html, /<a href="https:\/\/support\.anthropic\.com\/en\/articles\/8525154-claude-is-providing-incorrect-or-misleading-responses-what-s-going-on" target="_blank" rel="noopener noreferrer" class="hover:text-secondary transition">Claude is AI and can make mistakes\. Please double-check responses\.<\/a>/);
  i18n.setLocale('zh-CN');
  try {
    assert.match(renderToStaticMarkup(h(actions.SourceChatDisclaimer, { conversationUuid: 't1' })), /Claude 是 AI，可能会出错。请核实回答内容。/);
  } finally { i18n.setLocale('en-US'); }
});

test('context menu: MessageContextMenu is one "Attach as context" item; the transcript opens it for a Chat row', () => {
  const generated = fs.readFileSync(path.join(directory, 'context-menu.mjs'), 'utf8');
  assert.match(generated, /role: "menuitem"/);
  assert.match(generated, /"min-w-\[200px\] rounded-lg border bg-surface-3 shadow-lg py-1"/);
  assert.match(generated, /defaultMessage: "Attach as context"/);
  assert.equal(renderToStaticMarkup(h(actions.SourceChatMessageMenu, { point: null, container: null })), '');
  const transcript = local('src/source-transcript.jsx');
  assert.match(transcript, /const chatAttach = current\.surface === "chat" && current\.onAttachText \? chatMessageMenuAttach\(target, text, messageSelectionText\(row\)\) : null; \/\/ w13-close-chat-messages: kM\n\s+if \(chatAttach !== null\) \{\n\s+setMenu\(\{ kind: "chat", point, attach: chatAttach \}\);/);
  // The Chat branch falls through (no early return) to the row's own menu, which still reads the link and code targets.
  assert.ok(transcript.indexOf('const chatAttach') < transcript.indexOf('const link = linkTarget('));
  assert.doesNotMatch(transcript, /if \(!current\.onAttachText\) return false;/);
  assert.match(transcript, /menu\?\.kind === "chat" && <SourceChatMessageMenu /);
  assert.match(transcript, /menu && menu\.kind !== "chat" && <SourceMenu\.Popup /);
  const main = local('src/main.jsx');
  assert.match(main, /messageActions=\{mode === "chat" \? \{ \.\.\.transcriptActions, surface: "chat", incognito: isIncognitoSession\(current, sessionMetadata\) \/\* w13-close-chat-messages \*\/ \} : transcriptActions/);
  assert.match(main, /if \(mode === "chat" && current\) \{[\s\S]{0,1700}<SourceChatMessageActions conversationUuid=\{current\}/); // w13-chatfn-tools: + the C9 nudge
  assert.match(main, /sendMessage\(chatPrompt, turnAttachments\(items, footer\.turnId\), \[\], \{ resend: true \}\)/);
  assert.match(local('electron/main.cjs'), /case "chat-feedback": return \(chatFeedbackStore \?\?= \(await import\("\.\/chat-feedback\.mjs"\)\)\.createChatFeedbackStore/);
});

test('feedback model: types, ratings, requests and the message shape UF reads', () => {
  assert.equal(feedbackRating('upvote'), 'up');
  assert.equal(feedbackRating('flag'), 'down');
  assert.equal(feedbackRating('flag/harmful'), 'down');
  assert.equal(feedbackRating('chat_ended'), null);
  assert.deepEqual(feedbackRequest({ operation: 'list', threadId: 't' }), { operation: 'list', threadId: 't' });
  assert.throws(() => feedbackRequest({ operation: 'put', threadId: 't', itemId: 'i', type: 'meh' }), /Invalid feedback/);
  assert.throws(() => feedbackRequest({ operation: 'put', threadId: '', itemId: 'i', type: 'upvote' }), /Invalid conversation/);
  assert.throws(() => feedbackRequest({ operation: 'drop', threadId: 't' }), /Unknown feedback operation/);
  const store = putFeedback(normalizeFeedbackStore({ threads: { t: { bad: { type: 'nope' } } } }), { threadId: 't', itemId: 'i', type: 'upvote', at: 5 });
  assert.deepEqual(store, { version: 1, threads: { t: { i: { type: 'upvote', at: 5 } } } });
  assert.deepEqual(threadFeedback(store, 't'), { i: { type: 'upvote' } });
  assert.deepEqual(feedbackMessage('i', { i: { type: 'flag' } }), { uuid: 'i', chat_feedback: { type: 'flag' } });
  assert.deepEqual(feedbackMessage('j', { i: { type: 'flag' } }), { uuid: 'j' });
});

test('feedback store: ratings persist in userData/chat-feedback.json, nothing else is written', async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'chat-feedback-'));
  try {
    const store = createChatFeedbackStore({ dataDir: dir, now: () => 42 });
    assert.deepEqual(await store.run({ operation: 'list', threadId: 't' }), { data: {} });
    await Promise.all([store.run({ operation: 'put', threadId: 't', itemId: 'a', type: 'upvote' }),
      store.run({ operation: 'put', threadId: 't', itemId: 'b', type: 'flag' })]);
    assert.deepEqual(fs.readdirSync(dir), ['chat-feedback.json']);
    assert.deepEqual(JSON.parse(fs.readFileSync(path.join(dir, 'chat-feedback.json'), 'utf8')),
      { version: 1, threads: { t: { a: { type: 'upvote', at: 42 }, b: { type: 'flag', at: 42 } } } });
    const reopened = createChatFeedbackStore({ dataDir: dir });
    assert.deepEqual(await reopened.run({ operation: 'list', threadId: 't' }), { data: { a: { type: 'upvote' }, b: { type: 'flag' } } });
    await assert.rejects(reopened.run({ operation: 'put', threadId: 't', itemId: 'a', type: 'bogus' }), /Invalid feedback/);
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});

test('retry: the latest turn asks again with the same user prompt', () => {
  const items = [{ id: 'u1', turnId: 'T1', type: 'userMessage', text: 'first' }, { id: 'a1', turnId: 'T1', type: 'agentMessage' },
    { id: 'u2', turnId: 'T2', type: 'userMessage', content: [{ type: 'text', text: 'second' }] }, { id: 'a2', turnId: 'T2', type: 'agentMessage' }];
  assert.equal(retryPrompt(items, 'T2'), 'second');
  assert.equal(retryPrompt(items, 'T1', row => row.text.toUpperCase()), 'FIRST');
  assert.equal(retryPrompt(items, 'T9'), null);
  assert.equal(retryPrompt([{ turnId: 'T', type: 'userMessage', text: '   ' }], 'T'), null);
});

test('context menu: as cc1aae219 xM, controls and empty messages keep the row menu; a short selection attaches the message', () => {
  const messages = official('cc1aae219-CeSwM-tp.js');
  assert.ok(messages.includes(`r?.closest("${actions.CHAT_MENU_PASS_THROUGH}")`));
  assert.ok(messages.includes(`gM=${actions.CHAT_MENU_MIN_SELECTION},`));
  const node = (inside) => ({ closest: (selector) => (selector === actions.CHAT_MENU_PASS_THROUGH && inside ? {} : null) });
  assert.equal(actions.chatMessageMenuAttach(node(true), 'reply', 'some text'), null);
  assert.equal(actions.chatMessageMenuAttach(null, 'reply', ''), null);
  assert.equal(actions.chatMessageMenuAttach(node(false), '', 'x'), null);
  assert.equal(actions.chatMessageMenuAttach(node(false), 'reply', 'x'), 'reply');
  assert.equal(actions.chatMessageMenuAttach(node(false), 'reply', ' ab '), 'ab'); // kM: `t.toString().trim()`
  assert.equal(actions.chatMessageMenuAttach(node(false), '', 'ab'), 'ab');
});
