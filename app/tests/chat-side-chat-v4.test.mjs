// Round 2 unit chat-side-chat: the 4.16336.0 Chat side chat (scripts/extract-chat-side-chat-v4.mjs ->
// src/generated/chat-side-chat-v4, staged next to the 3.6556.2 src/generated/chat-side-chat the host still mounts).
// Source only: manifest, the generator's --check, the official chunk text, D1 links and ownership, the store, and SSR of
// the panel through Vite with the host contexts the production mount provides. No browser, no network; the official
// chunks are read as text and never executed.
import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createServer } from 'vite';
import react from '@vitejs/plugin-react';
import { closeWhenSettled } from './support/vite-ssr-settle.mjs';
import { extractChatSideChatV4, ROOTS, HOST_ADAPTERS, LINKED_AREAS, CDS_CORE_MANIFEST_SHA256 } from '../scripts/extract-chat-side-chat-v4.mjs';

const app = path.resolve(import.meta.dirname, '..');
const ion = path.resolve(app, '../reference/snapshots/claude-4.16336.0-20261104/ion-dist');
const official = name => fs.readFileSync(path.join(ion, 'assets/v1', name), 'utf8');
const local = rel => fs.readFileSync(path.join(app, rel), 'utf8');
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const h = React.createElement;
const text = html => html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
const out = 'src/generated/chat-side-chat-v4';
const manifest = JSON.parse(local(`${out}/manifest.json`));
const provenance = JSON.parse(local(`${out}/provenance.json`));
const ca2 = official('ca2ef848d-DA54buzo.js');

globalThis.document ??= { body: { nodeType: 1 }, head: { appendChild() {}, querySelector: () => null }, createElement: () => ({ relList: { supports: () => false }, setAttribute() {}, style: {} }),
  querySelector: () => null, querySelectorAll: () => [], getElementById: () => null, addEventListener() {}, removeEventListener() {},
  documentElement: { dataset: {}, style: {}, getAttribute: () => null, hasAttribute: () => false }, cookie: '' };
globalThis.window ??= { document: globalThis.document, navigator: { userAgent: 'Mozilla/5.0 (Macintosh)' }, addEventListener() {}, removeEventListener() {},
  matchMedia: () => ({ matches: false, addEventListener() {}, removeEventListener() {} }), localStorage: { getItem: () => null, setItem() {} },
  location: { pathname: '/', search: '', hash: '', href: 'app://local/' }, history: { state: null, replaceState() {} } };

let server, i18n, gen, adapters, oldAdapters, routines;
before(async () => {
  server = await createServer({ configFile: false, root: app, plugins: [react()],
    server: { middlewareMode: true, hmr: false, ws: false, watch: null }, appType: 'custom', logLevel: 'error' });
  i18n = await server.ssrLoadModule('/electron/i18n/index.mjs');
  i18n.setLocale('en-US');
  gen = await server.ssrLoadModule(`/${out}/index.mjs`);
  adapters = await server.ssrLoadModule('/src/source-chat-side-chat-v4-adapters.jsx');
  oldAdapters = await server.ssrLoadModule('/src/source-chat-side-chat-adapters.jsx');
  routines = await server.ssrLoadModule('/src/source-routines-shared-adapters.jsx');
});
after(async () => { i18n?.setLocale('en-US'); await closeWhenSettled(server); await server?.close(); });

test('manifest: 4.16336.0 snapshot, cds-core shared graph, linked areas, chunk and module hashes; --check', async () => {
  assert.equal(manifest.referenceVersion, '4.16336.0');
  assert.equal(manifest.referenceSnapshot, 'snapshots/claude-4.16336.0-20261104');
  assert.equal(manifest.generator, 'scripts/extract-chat-side-chat-v4.mjs');
  assert.equal(manifest.adapterModule, 'src/source-chat-side-chat-v4-adapters.jsx');
  assert.equal(manifest.sharedGraph, 'cds-core');
  assert.deepEqual(manifest.linkedAreas, ['code-composer-v4', 'routines-shared-v4', 'session-rail-kit-v4', 'cowork-progress-v4']);
  assert.deepEqual(LINKED_AREAS, manifest.linkedAreas);
  assert.equal(provenance.sharedGraph.manifestSha256, CDS_CORE_MANIFEST_SHA256);
  assert.equal(sha(fs.readFileSync(path.join(app, 'src/generated/cds-core/manifest.json'))), CDS_CORE_MANIFEST_SHA256);
  assert.deepEqual(manifest.modules.map(m => `${m.target}<${m.source}`), ['side-chat-store.mjs<shared-2-CsjIBQD8.js', 'side-chat-panel.mjs<ca2ef848d-DA54buzo.js']);
  for (const mod of manifest.modules) {
    assert.equal(mod.referenceVersion, '4.16336.0', mod.target);
    assert.equal(mod.sourceSha256, sha(fs.readFileSync(path.join(ion, 'assets/v1', mod.source))), mod.source);
    assert.equal(mod.sha256, sha(local(`${out}/${mod.target}`)), mod.target);
  }
  await extractChatSideChatV4({ check: true });
  assert.match(local('scripts/verify-gen-chat-side-chat-v4.mjs'), /extractChatSideChatV4\(\{ check: true \}\)/);
});

test('roots: the 3.6556.2 semantic names, AST-located and pinned under their 4.16336.0 locals and export aliases', () => {
  assert.deepEqual(provenance.roots.map(r => `${r.file}#${r.local}=${r.name}${r.export ? `/${r.export}` : ''}`), [
    'shared-2-CsjIBQD8.js#h0=chatSideChatStore/Gn', 'shared-2-CsjIBQD8.js#v0=useChatSideChatOpen/Vn', 'shared-2-CsjIBQD8.js#y0=useChatSideChatMessages/Hn',
    'shared-2-CsjIBQD8.js#b0=useChatSideChatStatus/Wn', 'shared-2-CsjIBQD8.js#x0=useChatSideChatPendingQuestion/Un',
    'ca2ef848d-DA54buzo.js#b0=ChatSideChat', 'ca2ef848d-DA54buzo.js#h0=ChatSideChatMessages']);
  assert.ok(provenance.roots.every(r => r.pinned), 'every root declaration is pinned');
  for (const r of provenance.roots) assert.equal(official(r.file).split(ROOTS[r.file][r.local].probe).length - 1, 1, `${r.file}#${r.local} probe occurs once`);
  // The old graph's exported names, all kept.
  const old = JSON.parse(local('src/generated/chat-side-chat/manifest.json')).modules.flatMap(m => Object.values(m.exports));
  assert.deepEqual(old.filter(n => !provenance.roots.some(r => r.name === n)), []);
  for (const r of provenance.roots) assert.notEqual(gen[r.name], undefined, r.name);
});

test('host boundaries: each adapted original pinned; re-exported from its documenting host adapter, c0 answered here', () => {
  assert.deepEqual(provenance.adapters.map(a => `${a.original.replace(/-[\w-]{8}\.js#/, '#')}=${a.name}`), [
    'ca2ef848d#c0=useChatSideChatToggle', 'shared-1#C6=useShortcut', 'c9451a5b2#o=streamChatSideQuestion', 'shared-25#$u=useRouter',
    'shared-0#qB=reportError', 'c89efce1a#Mu=ChatMemoryMarkdown', 'vendor-intl#q=useIntl', 'vendor-intl#Gt=FormattedMessage']);
  assert.ok(provenance.adapters.every(a => a.pinned));
  const used = new Set(manifest.modules.flatMap(m => m.imports.filter(i => i.kind === 'adapter').map(i => `${i.via.split(/[:#]/)[0]}#${i.original}`)));
  assert.deepEqual([...used].sort(), Object.keys(HOST_ADAPTERS).sort());
  for (const m of manifest.modules) for (const i of m.imports.filter(i => i.kind === 'adapter')) assert.equal(i.from, '../../source-chat-side-chat-v4-adapters.jsx');
  const adapterText = local('src/source-chat-side-chat-v4-adapters.jsx');
  assert.deepEqual([...adapterText.matchAll(/^export function (\w+)/gm)].map(m => m[1]), ['useChatSideChatToggle']);
  assert.deepEqual([...adapterText.matchAll(/^export \{[^}]*\} from "([^"]+)";/gm)].map(m => m[1]),
    ['./source-chat-side-chat-adapters.jsx', './source-routines-shared-adapters.jsx', './source-routine-cowork-adapters.jsx', './source-chat-knowledge-adapters.jsx']);
  // The toggle hook reads this graph's store, never the 3.6556.2 one.
  assert.match(adapterText, /from '\.\/generated\/chat-side-chat-v4\/side-chat-store\.mjs'/);
  assert.doesNotMatch(adapterText, /generated\/chat-side-chat\//);
  assert.equal(adapters.streamChatSideQuestion, oldAdapters.streamChatSideQuestion);
  assert.equal(adapters.useShortcut, oldAdapters.useShortcut);
  // The original c0's gate, Code-route exclusion and Cowork key exclusion stay pinned in the official text.
  assert.ok(ca2.includes('t=on("claudified_btw_side_chat"),{matchShortcut:n}=zr("btw_side_chat")'));
  assert.ok(ca2.includes('e.startsWith("/epitaxy")||e.startsWith("/code")'));
});

test('D1: the store is held here only; linked areas answer what they hold; cds-core answers ownerWindow and the CDS parts', () => {
  const held = new Map();
  for (const area of manifest.linkedAreas) {
    const m = JSON.parse(local(`src/generated/${area}/manifest.json`));
    for (const mod of m.modules) for (const b of mod.bindings ?? []) held.set(`${path.basename(mod.source)}#${typeof b === 'string' ? b : b.name}`, area);
  }
  const own = manifest.modules.flatMap(mod => mod.bindings.map(b => `${mod.source}#${b.name}`));
  assert.deepEqual(own.filter(k => held.has(k)), [], 'nothing a linked area holds is cut again');
  for (const area of ['code-composer-v4', 'routines-shared-v4', 'session-rail-kit-v4'])
    assert.ok(manifest.modules.some(m => m.imports.some(i => i.kind === 'linked' && i.from.startsWith(`../${area}/`))), `links ${area}`);
  // No other 4.16336.0 graph slices the shared-2 side chat store or the panel's ca2ef848d bindings.
  for (const dir of fs.readdirSync(path.join(app, 'src/generated')).filter(d => d !== 'chat-side-chat-v4' && fs.existsSync(path.join(app, 'src/generated', d, 'manifest.json')))) {
    const m = JSON.parse(local(`src/generated/${dir}/manifest.json`));
    if (m.referenceVersion !== '4.16336.0') continue;
    for (const mod of m.modules ?? []) {
      const names = new Set((mod.bindings ?? []).map(b => (typeof b === 'string' ? b : b.name)));
      const src = path.basename(mod.source ?? '');
      for (const key of own) if (key.startsWith(`${src}#`)) assert.ok(!names.has(key.slice(src.length + 1)), `${dir} also slices ${key}`);
    }
  }
  const store = local(`${out}/side-chat-store.mjs`);
  assert.equal(store.split('var h0 = Ep(').length - 1, 1);
  const panel = local(`${out}/side-chat-panel.mjs`);
  for (const name of ['ownerWindow as ln', 'CdsButton as G', 'CdsIcon as Oe', 'CdsShortcut as Ne', 'CdsLayerProvider as oe', 'useCdsLayerAwareZIndex as B', 'asElementNode as Ae'])
    assert.ok(panel.includes(name), name);
  assert.match(panel, /from "\.\.\/cds-core\/shared-25\.mjs"/);
  assert.match(panel, /from "\.\/side-chat-store\.mjs"/);
});

test('official text: the Chat page mounts b0, the store and its reload blockers, the shortcut', () => {
  assert.equal(ca2.split('u(b0,{organizationUuid:Td,conversationUuid:s,parentMessageUuid:La,inheritedMessageCount:gd})').length - 1, 1);
  assert.equal(ca2.split('"Branch to new chat"').length - 1, 1);
  assert.ok(ca2.includes('s.push(`/new?q=${encodeURIComponent(r)}`)'));
  const s2 = official('shared-2-CsjIBQD8.js');
  assert.ok(s2.includes('cs("btw-side-chat",()=>{let e=h0.getState();'));
  for (const s of ['h0 as Gn', 'v0 as Vn', 'y0 as Hn', 'b0 as Wn', 'x0 as Un']) assert.ok(s2.includes(s), s);
  // The reload blockers are calls, not declarations: not emitted.
  assert.doesNotMatch(local(`${out}/side-chat-store.mjs`), /btw-side-chat/);
  assert.deepEqual(manifest.callSites.map(c => c.raw), [true, true, true]);
});

test('store (shared-2 h0): open / toggle / close per conversation, a question then deltas, popLastIfUser, error and clear', () => {
  const s = gen.chatSideChatStore;
  s.getState().toggle('c1');
  assert.equal(s.getState().openByConversation.c1, true);
  s.getState().openWith('c1', 'pending?');
  assert.equal(s.getState().pendingQuestionByConversation.c1, 'pending?');
  s.getState().clearPendingQuestion('c1');
  assert.equal('c1' in s.getState().pendingQuestionByConversation, false);
  s.getState().appendMessage('c1', { role: 'user', text: 'Q1' });
  s.getState().appendAssistantDelta('c1', 'A');
  s.getState().appendAssistantDelta('c1', 'B');
  assert.deepEqual(s.getState().messagesByConversation.c1, [{ role: 'user', text: 'Q1' }, { role: 'assistant', text: 'AB' }]);
  s.getState().appendMessage('c1', { role: 'user', text: 'Q2' });
  s.getState().popLastIfUser('c1');
  assert.equal(s.getState().messagesByConversation.c1.length, 2);
  s.getState().setStatus('c1', 'thinking');
  s.getState().setError('c1', 'boom');
  assert.equal(s.getState().statusByConversation.c1, 'thinking');
  assert.equal(s.getState().errorByConversation.c1, 'boom');
  s.getState().setStatus('c1', 'idle');
  s.getState().setError('c1', null);
  assert.equal('c1' in s.getState().statusByConversation, false);
  assert.equal('c1' in s.getState().errorByConversation, false);
  s.getState().close('c1');
  assert.equal('c1' in s.getState().openByConversation, false);
  s.getState().clear('c1');
  assert.equal('c1' in s.getState().messagesByConversation, false);
  // At most 20 open conversations are kept (shared-2 f0 / m0).
  for (let i = 0; i < 25; i++) s.getState().open(`k${i}`);
  assert.equal(Object.keys(s.getState().openByConversation).length, 20);
  assert.equal(s.getState().openByConversation.k0, undefined);
  for (let i = 0; i < 25; i++) s.getState().close(`k${i}`);
});

const mount = ({ enabled, count = 0, conversation = 'chat-ssr', navigate = () => {} }) => renderToStaticMarkup(
  h(oldAdapters.ChatSideChatHost.Provider, { value: { enabled } },
    h(routines.RoutinesSharedHost.Provider, { value: { navigate, pathname: '', search: '', bridge: undefined, models: [] } },
      h(gen.ChatSideChat, { organizationUuid: 'local', conversationUuid: conversation, parentMessageUuid: null, inheritedMessageCount: count }))));

test('SSR: the closed panel is the original aside (inert, popover surface, header, empty state, read-only line, composer); off renders nothing', () => {
  assert.equal(mount({ enabled: false }), '');
  const html = mount({ enabled: true, count: 3 });
  const aside = html.match(/<aside [^>]*>/)?.[0] ?? '';
  assert.match(aside, /aria-label="Side chat"/);
  assert.match(aside, /data-surface="popover"/);
  assert.match(aside, /inert=""/);
  assert.match(aside, /aria-hidden="true"/);
  assert.doesNotMatch(aside, /data-open/);
  assert.ok(aside.includes('class="fixed bottom-4 end-4 flex w-[400px] max-w-[calc(100vw-2rem)]'));
  assert.ok(aside.includes('bg-surface-popover'));
  assert.ok(html.includes('class="flex shrink-0 items-center gap-1 border-b-0.5 px-3 py-2"'));
  const words = text(html);
  for (const w of ['Side chat', 'Sees 3 messages from main chat', 'read-only',
    'Ask on the side without touching the main chat. Claude sees the full context, and nothing here is added to it.'])
    assert.ok(words.includes(w), w);
  assert.match(html, /aria-label="Close side chat"/);
  assert.doesNotMatch(html, /Clear side chat/);
  assert.match(html, /<textarea[^>]*placeholder="Ask a quick question…"/);
  assert.match(html, /aria-label="Send"/);
  assert.doesNotMatch(mount({ enabled: true, count: 0 }), /from main chat/);
  i18n.setLocale('zh-CN');
  try {
    const zhWords = text(mount({ enabled: true, count: 1 }));
    assert.ok(zhWords.includes('可看到主会话中的 1 条消息'), zhWords);
  } finally { i18n.setLocale('en-US'); }
});

test('SSR: answers have Copy answer and Branch to new chat; streaming shows Thinking…; the server snapshot is the store\'s initial state', () => {
  // zustand's server snapshot is the store's initial state, so SSR always draws the closed panel (the open state is a
  // client render; not exercised here, no DOM in this test).
  const s = gen.chatSideChatStore;
  s.getState().open('chat-open');
  try {
    assert.equal(s.getState().openByConversation['chat-open'], true);
    assert.match(mount({ enabled: true, conversation: 'chat-open' }).match(/<aside [^>]*>/)?.[0] ?? '', /inert=""/);
  } finally { s.getState().close('chat-open'); }
  const messages = [{ role: 'user', text: 'Q1' }, { role: 'assistant', text: 'A1' }, { role: 'user', text: 'Q2' }, { role: 'assistant', text: 'A2' }];
  const idle = renderToStaticMarkup(h(gen.ChatSideChatMessages, { messages, status: 'idle', onBranch() {} }));
  assert.equal(idle.split('aria-label="Copy answer"').length - 1, 2);
  assert.equal(idle.split('aria-label="Branch to new chat"').length - 1, 2);
  assert.ok(idle.includes('class="max-w-[85%] rounded-xl bg-neutral-30 px-3 py-2 text-body-regular font-sans text-primary whitespace-pre-wrap break-words"'));
  const thinking = renderToStaticMarkup(h(gen.ChatSideChatMessages, { messages, status: 'thinking', onBranch() {} }));
  assert.equal(thinking.split('aria-label="Branch to new chat"').length - 1, 1);
  assert.match(thinking, /<p role="status"[^>]*>Thinking…<\/p>/);
  assert.doesNotMatch(renderToStaticMarkup(h(gen.ChatSideChatMessages, { messages, status: 'idle' })), /Branch to new chat/);
});

test('production switch (rl-main-entry S3): the host mounts the 4.16336.0 panel and reads one store; the 3.6556.2 graph is unchanged', () => {
  const host = local('src/source-chat-side-chat.jsx'), main = local('src/main.jsx');
  // source-chat-side-chat.jsx renders ca2ef848d b0 from the v4 graph and nothing from the 3.6556.2 panel.
  assert.match(host, /^import \{ ChatSideChat \} from '\.\/generated\/chat-side-chat-v4\/side-chat-panel\.mjs';/m);
  assert.doesNotMatch(host, /generated\/chat-side-chat\//);
  // main.jsx reads the side chat state from shared-2 h0 (the v4 store the v4 adapters' c0 toggles) and no 3.6556.2 store.
  assert.equal(main.split('import { chatSideChatStore, useChatSideChatOpen } from "./generated/chat-side-chat-v4/side-chat-store.mjs";').length - 1, 1);
  assert.doesNotMatch(main, /generated\/chat-side-chat\//);
  assert.match(local('src/source-chat-side-chat-v4-adapters.jsx'), /from '\.\/generated\/chat-side-chat-v4\/side-chat-store\.mjs'/);
  // The 3.6556.2 adapter's p1 toggle (open / close / toggle over the old store) has no host caller: only the old graph imports it.
  for (const file of fs.readdirSync(path.join(app, 'src')).filter(f => /\.(jsx|mjs|js)$/.test(f) && f !== 'source-chat-side-chat-adapters.jsx'))
    assert.doesNotMatch(local(`src/${file}`), /\buseChatSideChatToggle\b[^\n]*from '\.\/source-chat-side-chat-adapters\.jsx'|generated\/chat-side-chat\/side-chat-store/, file);
  assert.equal(sha(fs.readFileSync(path.join(app, 'src/generated/chat-side-chat/manifest.json'))), '7feb574e8a8152355851c7da14fc5cfa314d087280f5694848f8adfdd003ccd3');
});
