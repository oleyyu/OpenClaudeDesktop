// w13-close-chat-sidechat (G9, plan-w13-closeout.md E63 chatfn-branches-09): Chat's side chat is the generated 3.6556.2
// ca2ef848d T1 (src/generated/chat-side-chat), with "Branch to new chat" in its answers. Original-text locks, the host
// model, the side chat store and the local stream adapter, SSR of the panel, and the main.jsx wiring. Source only: no
// browser, no network, the official chunks are read as text and never executed.
import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createServer } from 'vite';
import react from '@vitejs/plugin-react';
import { ionSource } from '../scripts/official-3.6556.2.mjs';
import zh from '../electron/i18n/zh-CN/index.mjs';
import { closeWhenSettled } from './support/vite-ssr-settle.mjs';
import {
  CHAT_SIDE_CHAT_ORGANIZATION, chatSideChatBranchText, chatSideChatInheritedCount, shortcutBindings, shortcutMatches, shortcutString,
} from '../src/chat-side-chat-model.mjs';

const app = path.resolve(import.meta.dirname, '..');
const h = React.createElement;
const official = name => fs.readFileSync(path.join(ionSource, name), 'utf8');
const local = rel => fs.readFileSync(path.join(app, rel), 'utf8');
const ca2 = official('ca2ef848d-ChLvq6yZ.js');
const text = html => html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();

globalThis.document ??= { body: { nodeType: 1 }, head: { appendChild() {} }, createElement: () => ({ relList: { supports: () => false }, setAttribute() {}, style: {} }),
  querySelector: () => null, querySelectorAll: () => [], getElementById: () => null, addEventListener() {}, removeEventListener() {},
  documentElement: { dataset: {}, getAttribute: () => null, hasAttribute: () => false } };
globalThis.window ??= { document: globalThis.document, navigator: { userAgent: 'Mozilla/5.0 (Macintosh)' }, addEventListener() {}, removeEventListener() {},
  matchMedia: () => ({ matches: false, addEventListener() {}, removeEventListener() {} }), localStorage: { getItem: () => null, setItem() {} },
  location: { pathname: '/', search: '', hash: '', href: 'app://local/' }, history: { state: null, replaceState() {} } };

let server, i18n, store, panel, adapters, host;
before(async () => {
  server = await createServer({ configFile: false, root: app, plugins: [react()],
    server: { middlewareMode: true, hmr: false, ws: false, watch: null }, appType: 'custom', logLevel: 'error' });
  i18n = await server.ssrLoadModule('/electron/i18n/index.mjs');
  i18n.setLocale('en-US');
  store = await server.ssrLoadModule('/src/generated/chat-side-chat/side-chat-store.mjs');
  panel = await server.ssrLoadModule('/src/generated/chat-side-chat/side-chat-panel.mjs');
  adapters = await server.ssrLoadModule('/src/source-chat-side-chat-adapters.jsx');
  host = await server.ssrLoadModule('/src/source-chat-side-chat.jsx');
});
after(async () => { i18n?.setLocale('en-US'); await closeWhenSettled(server); await server?.close(); });

test('original: the Chat page mounts T1 behind claudified_btw_side_chat and ⌘;, and Branch to new chat is only in b1', () => {
  assert.ok(ca2.includes('lc=R(()=>f(T1,{organizationUuid:ac??null,conversationUuid:s,parentMessageUuid:fi,inheritedMessageCount:tc}),[ac,s,fi,tc])')
    || /\(T1,\{organizationUuid:\w+\?\?null,conversationUuid:\w+,parentMessageUuid:\w+,inheritedMessageCount:\w+\}\)/.test(ca2));
  assert.match(ca2, /t=Tt\("claudified_btw_side_chat"\),\{matchShortcut:n\}=Ar\("btw_side_chat"\)/);
  assert.ok(ca2.includes('e.startsWith("/epitaxy")||e.startsWith("/code")'));
  assert.ok(ca2.includes('icon:"GitBranch",onClick:()=>r(i),"aria-label":o.formatMessage({defaultMessage:"Branch to new chat",id:"9904KlI+jU"})'));
  assert.equal(ca2.split('"Branch to new chat"').length - 1, 1);
  assert.equal(official('cc1aae219-CeSwM-tp.js').includes('"Branch to new chat"'), false);
  assert.ok(ca2.includes('s.push(`/new?q=${encodeURIComponent(r)}`)'));
  // c5e8ef052: /new?q= fills the new chat's composer (it is not sent).
  assert.ok(official('c5e8ef052-BhAC1WiJ.js').includes('filled:a??e(f.get("q")??"",f.get("skill-name"))'));
  // shared-1 LV: ⌘; on mac, Ctrl+; elsewhere, "Toggle side chat", hidden from the palette.
  assert.ok(official('shared-1-BJhqMmkf.js').includes('btw_side_chat:{description:pF.description,group:"chat",shortcut:{bindings:[{key:";",modifiers:["cmd"],platform:"mac"},{key:";",modifiers:["ctrl"],platform:"non-mac"}]},hiddenFromCommandPalette:!0}'));
  assert.ok(official('shared-1-BJhqMmkf.js').includes('pF=q({description:{defaultMessage:"Toggle side chat",id:"fg0STV1kTX"}})'));
});

test('generated: the panel is ca2ef848d T1 / b1 and the store is shared-2 i2, with three host adapters and D1 links', () => {
  const manifest = JSON.parse(local('src/generated/chat-side-chat/manifest.json'));
  assert.equal(manifest.referenceVersion, '3.6556.2');
  const byTarget = Object.fromEntries(manifest.modules.map(m => [m.target, m]));
  assert.deepEqual(byTarget['side-chat-panel.mjs'].exports, { T1: 'ChatSideChat', b1: 'ChatSideChatMessages' });
  assert.equal(byTarget['side-chat-panel.mjs'].source, 'ca2ef848d-ChLvq6yZ.js');
  assert.equal(byTarget['side-chat-store.mjs'].source, 'shared-2-TF8v67kg.js');
  assert.deepEqual(manifest.adapters.map(a => a.original).sort(),
    ['c9451a5b2-Dri8I3GN.js#o', 'ca2ef848d-ChLvq6yZ.js#p1', 'shared-1-BJhqMmkf.js#WV']);
  assert.deepEqual(manifest.sharedAdapters.map(a => `${a.original}@${a.graph}`).sort(), [
    'c89efce1a-C_nlrFif.js#rc@chat-knowledge', 'shared-0-DDOOdL6P.js#bN@cowork-scheduled', 'shared-25-DOWZRSlq.js#Jd@routines-shared',
    'vendor-intl-DYfox5Co.js#Gt@routines-shared', 'vendor-intl-DYfox5Co.js#q@routines-shared']);
  const code = local('src/generated/chat-side-chat/side-chat-panel.mjs');
  for (const fragment of ['"Ask on the side without touching the main chat. Claude sees the full context, and nothing here is added to it."',
    'defaultMessage: "Branch to new chat"', 'icon: "GitBranch"', 'defaultMessage: "Copy answer"', 'defaultMessage: "Clear side chat"',
    'defaultMessage: "Close side chat"', '"Sees {count, plural, one {# message} other {# messages}} from main chat"', 'f("aside", {'])
    assert.ok(code.includes(fragment), fragment);
});

test('model: the branch prompt round-trips through `/new?q=`, the inherited count and the ⌘; binding follow the original', () => {
  const prompt = 'Continuing from a side question.\n\nQ: why?\n\nA: “because & 100% + more”\n\n';
  assert.equal(chatSideChatBranchText(`/new?q=${encodeURIComponent(prompt)}`), prompt);
  assert.equal(chatSideChatBranchText('/chat/abc'), null);
  assert.equal(chatSideChatBranchText('/new?q='), null);
  assert.equal(CHAT_SIDE_CHAT_ORGANIZATION, 'local');
  assert.equal(chatSideChatInheritedCount([
    { type: 'userMessage', turnId: 't1' }, { type: 'agentMessage', turnId: 't1' }, { type: 'commandExecution', turnId: 't1' },
    { type: 'agentMessage', turnId: 't1' }, { type: 'userMessage', turnId: 't2' }]), 3);
  assert.equal(chatSideChatInheritedCount(null), 0);
  const mac = shortcutBindings('btw_side_chat', { mac: true }), other = shortcutBindings('btw_side_chat', { mac: false });
  assert.equal(shortcutString(mac[0]), 'cmd+;');
  assert.equal(shortcutString(other[0]), 'ctrl+;');
  const key = patch => ({ key: ';', metaKey: false, ctrlKey: false, shiftKey: false, altKey: false, ...patch });
  assert.equal(shortcutMatches(key({ metaKey: true }), mac[0]), true);
  assert.equal(shortcutMatches(key({ metaKey: true, shiftKey: true }), mac[0]), false);
  assert.equal(shortcutMatches(key({ ctrlKey: true }), mac[0]), false);
  assert.equal(shortcutMatches(key({ ctrlKey: true }), other[0]), true);
});

test('store (shared-2 i2): open / toggle / close per conversation, a question then deltas, popLastIfUser and clear', () => {
  const s = store.chatSideChatStore;
  s.getState().toggle('c1');
  assert.equal(s.getState().openByConversation.c1, true);
  s.getState().appendMessage('c1', { role: 'user', text: 'Q1' });
  s.getState().appendAssistantDelta('c1', 'A');
  s.getState().appendAssistantDelta('c1', 'B');
  assert.deepEqual(s.getState().messagesByConversation.c1, [{ role: 'user', text: 'Q1' }, { role: 'assistant', text: 'AB' }]);
  s.getState().appendMessage('c1', { role: 'user', text: 'Q2' });
  s.getState().popLastIfUser('c1');
  assert.equal(s.getState().messagesByConversation.c1.length, 2);
  s.getState().setStatus('c1', 'thinking');
  assert.equal(s.getState().statusByConversation.c1, 'thinking');
  s.getState().setStatus('c1', 'idle');
  assert.equal('c1' in s.getState().statusByConversation, false);
  s.getState().toggle('c1');
  assert.equal('c1' in s.getState().openByConversation, false);
  s.getState().clear('c1');
  assert.equal('c1' in s.getState().messagesByConversation, false);
});

test('stream adapter: codeDesktop/sideQuestion on the conversation thread, deltas for this request, history pairs, abort cancels', async () => {
  const calls = [], handlers = new Set();
  let resolveAsk;
  const rpc = (method, params) => { calls.push([method, params]); return method === 'codeDesktop/sideQuestion' ? new Promise(r => { resolveAsk = r; }) : Promise.resolve({}); };
  const subscribe = handler => { handlers.add(handler); return () => handlers.delete(handler); };
  const release = adapters.setChatSideChatTransport({ rpc, subscribe });
  const deltas = [];
  const pending = adapters.streamChatSideQuestion({ organizationUuid: 'local', conversationUuid: 'thread-1', question: 'Why?',
    btwHistory: [{ question: 'Q0', response: 'A0' }], parentMessageUuid: null, signal: new AbortController().signal, onDelta: d => deltas.push(d) });
  await Promise.resolve();
  const [[method, params]] = calls;
  assert.equal(method, 'codeDesktop/sideQuestion');
  assert.deepEqual({ ...params, requestId: undefined }, { threadId: 'thread-1', question: 'Why?', history: [{ question: 'Q0', answer: 'A0' }], requestId: undefined });
  const emit = event => { for (const handler of handlers) handler(event); };
  emit({ method: 'codeDesktop/sideQuestion/delta', params: { threadId: 'thread-1', requestId: 'other', text: 'x' } });
  emit({ method: 'codeDesktop/sideQuestion/delta', params: { threadId: 'thread-1', requestId: params.requestId, text: 'Be' } });
  resolveAsk({ text: 'Because.' });
  await pending;
  assert.deepEqual(deltas, ['Be', 'cause.']);
  assert.equal(handlers.size, 0);
  // Abort: the request is cancelled.
  const controller = new AbortController();
  const aborted = adapters.streamChatSideQuestion({ conversationUuid: 'thread-1', question: 'Again', signal: controller.signal, onDelta() {} });
  await Promise.resolve();
  controller.abort();
  assert.ok(calls.some(([m, p]) => m === 'codeDesktop/sideQuestion/cancel' && p.requestId === calls.at(-2)[1].requestId));
  resolveAsk({ text: 'late' });
  await aborted;
  release();
  await assert.rejects(adapters.streamChatSideQuestion({ conversationUuid: 'thread-1', question: 'Q', onDelta() {} }), /unavailable/);
});

test('split view: each pane registers its own transport; releasing one keeps the other, questions go to their own pane', async () => {
  const seen = [];
  const make = tag => ({ rpc: async (method, params) => { seen.push([tag, method, params.threadId]); return { text: '' }; }, subscribe: () => () => {} });
  const releaseA = adapters.setChatSideChatTransport(make('A'), 'chat-a');
  const releaseB = adapters.setChatSideChatTransport(make('B'), 'chat-b');
  await adapters.streamChatSideQuestion({ conversationUuid: 'chat-a', question: 'Q', onDelta() {} });
  await adapters.streamChatSideQuestion({ conversationUuid: 'chat-b', question: 'Q', onDelta() {} });
  releaseB();
  await adapters.streamChatSideQuestion({ conversationUuid: 'chat-a', question: 'Q', onDelta() {} });
  releaseA();
  assert.deepEqual(seen, [['A', 'codeDesktop/sideQuestion', 'chat-a'], ['B', 'codeDesktop/sideQuestion', 'chat-b'], ['A', 'codeDesktop/sideQuestion', 'chat-a']]);
  await assert.rejects(adapters.streamChatSideQuestion({ conversationUuid: 'chat-a', question: 'Q', onDelta() {} }), /unavailable/);
  // An unfocused pane (enabled false) renders nothing (T1 `if (!c) return null` comes after its hooks, so v1 stays
  // mounted and an answer in flight is not aborted).
  assert.equal(renderToStaticMarkup(h(host.SourceChatSideChat, { conversationId: 'chat-b', enabled: false, rpc: async () => ({}), subscribe: () => () => {} })), '');
  const panelSource = local('src/generated/chat-side-chat/side-chat-panel.mjs');
  const t1 = panelSource.slice(panelSource.indexOf('function T1(e)'));
  assert.ok(t1.indexOf('} = v1(') > 0 && t1.indexOf('} = v1(') < t1.indexOf('if (!c) return null;'));
  // p1 attaches the ⌘; listener only while enabled (the effect's first guard).
  const adapterSource = local('src/source-chat-side-chat-adapters.jsx');
  assert.ok(adapterSource.includes("if (!enabled || !conversationUuid) return;\n    const doc = globalThis.document;"));
});

test('SSR: the closed panel is the original aside (inert, header, ⌘;, empty state, read-only line, composer); off renders nothing', () => {
  const render = props => renderToStaticMarkup(h(host.SourceChatSideChat, { conversationId: 'chat-ssr', rpc: async () => ({}), subscribe: () => () => {}, ...props }));
  assert.equal(render({ enabled: false }), '');
  const html = render({ enabled: true, inheritedMessageCount: 3 });
  const aside = html.match(/<aside [^>]*>/)?.[0] ?? '';
  assert.match(aside, /aria-label="Side chat"/);
  assert.match(aside, /inert=""/);
  assert.match(aside, /aria-hidden="true"/);
  assert.doesNotMatch(aside, /data-open/);
  assert.ok(aside.includes('class="fixed bottom-4 end-4 flex w-[400px] max-w-[calc(100vw-2rem)]'));
  assert.ok(html.includes('class="flex shrink-0 items-center gap-1 border-b-0.5 px-3 py-2"'));
  const words = text(html);
  assert.ok(words.includes('Side chat'));
  assert.ok(words.includes('Sees 3 messages from main chat'));
  assert.ok(words.includes('read-only'));
  assert.ok(words.includes('Ask on the side without touching the main chat. Claude sees the full context, and nothing here is added to it.'));
  assert.match(html, /aria-label="Close side chat"/);
  assert.doesNotMatch(html, /Clear side chat/);
  assert.match(html, /<textarea[^>]*placeholder="Ask a quick question…"/);
  assert.match(html, /aria-label="Send"/);
  assert.doesNotMatch(render({ enabled: true, inheritedMessageCount: 0 }), /from main chat/);
  i18n.setLocale('zh-CN');
  try {
    const zhWords = text(render({ enabled: true, inheritedMessageCount: 1 }));
    assert.ok(zhWords.includes('可看到主会话中的 1 条消息'), zhWords);
    assert.ok(zhWords.includes('Claude 能看到完整上下文'));
  } finally { i18n.setLocale('en-US'); }
});

test('SSR: an answer has Copy answer and Branch to new chat; the streaming answer has neither and shows Thinking…', () => {
  const messages = [{ role: 'user', text: 'Q1' }, { role: 'assistant', text: 'A1' }, { role: 'user', text: 'Q2' }, { role: 'assistant', text: 'A2' }];
  const idle = renderToStaticMarkup(h(panel.ChatSideChatMessages, { messages, status: 'idle', onBranch() {} }));
  assert.equal(idle.split('aria-label="Copy answer"').length - 1, 2);
  assert.equal(idle.split('aria-label="Branch to new chat"').length - 1, 2);
  assert.ok(idle.includes('class="flex gap-0.5 px-1 opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100 pointer-coarse:opacity-100"'));
  assert.ok(idle.includes('class="max-w-[85%] rounded-xl bg-neutral-30 px-3 py-2 font-base text-primary whitespace-pre-wrap break-words"'));
  const thinking = renderToStaticMarkup(h(panel.ChatSideChatMessages, { messages, status: 'thinking', onBranch() {} }));
  assert.equal(thinking.split('aria-label="Branch to new chat"').length - 1, 1);
  assert.match(thinking, /<p role="status"[^>]*>Thinking…<\/p>/);
  const noBranch = renderToStaticMarkup(h(panel.ChatSideChatMessages, { messages, status: 'idle' }));
  assert.doesNotMatch(noBranch, /Branch to new chat/);
});

test('host wiring: Chat mounts the generated panel, ⌘; and View › Side Chat go to it, the Code card stays Code-only', () => {
  const main = local('src/main.jsx');
  assert.ok(main.includes('import { SourceChatSideChat } from "./source-chat-side-chat.jsx";'));
  assert.match(main, /\{mode === "chat" && current && !PANE_WINDOW && section === "new" && !settings && <SourceChatSideChat conversationId=\{current\} rpc=\{rpc\}/);
  // Split view: only the focused pane offers the panel (one fixed T1 per window; ⌘; and View › Side Chat act on that pane).
  assert.ok(main.includes('enabled={!!commandContext.sideQuestions && splitActive} inheritedMessageCount={chatSideChatInheritedCount(items)}'));
  assert.ok(main.includes('onBranch={text => { navigate(null, { surface: "chat" }); setTimeout(() => setDraft(text), 0); }}'));
  assert.ok(main.includes('{current && !PANE_WINDOW && mode !== "chat" && <SourceSideChat threadId={current}'));
  assert.ok(main.includes('if (modeRef.current === "chat") return;'));
  assert.ok(main.includes('else if (e.pane === "sideChat" && modeRef.current === "chat") { if (current && !settings && commandContext.sideQuestions) chatSideChatStore.getState().toggle(current); }'));
  assert.ok(main.includes('onSideChatContext: current && commandContext.sideQuestions && mode !== "chat" ? text =>'));
  const verify = local('scripts/verify-gen-chat-side-chat.mjs');
  assert.match(verify, /extractChatSideChat\(\{ check: true \}\)/);
});

test('zh-CN: every string the Chat side chat shows has a key', () => {
  for (const key of ['Side chat', 'Clear side chat', 'Close side chat', 'Follow up…', 'Ask a quick question…', 'Copy answer', 'Branch to new chat',
    'Thinking…', 'Send', 'Something went wrong', 'read-only', 'Toggle side chat',
    'Ask on the side without touching the main chat. Claude sees the full context, and nothing here is added to it.',
    'Sees {count, plural, one {# message} other {# messages}} from main chat',
    'Continuing from a side question.\n\nQ: {question}\n\nA: “{answer}”\n\n'])
    assert.ok(Object.hasOwn(zh, key), key);
});
