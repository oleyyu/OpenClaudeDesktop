// W14-code 第七轮 transcript 线（plan-w14-code.md E81–E95；数据 data/w14code/round7/lanes/transcript.json）。
//   R7T-03：宿主消息菜单的本机链接项照 c96d752d0 DA 改为「Open in Browser pane」；文件菜单去掉官方 en-US 没有的「File actions」名。
//   R7T-02：c96d752d0 TA 导出为 TranscriptMessageMenuHost，SourceCodeTranscript 把列表挂在 TA 里（Aat `f(TA,{children:f(n8,…)})`）；
//           整回合行照 i9 `case "user"` / `case "assistant"` 用 M7 包住；宿主菜单让给 TA，文件链接仍由宿主文件菜单在捕获阶段接管。
//   R7T-05：本地图片的 file URL 逐段 encodeURIComponent（# ? % 不再被当成 URL 的片段 / 查询），不加 cwd/home 范围限制。
// SSR 用 vite middleware 模式；官方 chunk 只当文本读。
import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createServer } from 'vite';
import react from '@vitejs/plugin-react';

const app = path.resolve(import.meta.dirname, '..');
const assets = path.join(app, '../reference/snapshots/claude-3.6556.2-20261025-192807/ion-dist/assets/v1');
const official = (prefix) => fs.readFileSync(path.join(assets, fs.readdirSync(assets).find((file) => file.startsWith(prefix) && file.endsWith('.js'))), 'utf8');
const read = (file) => fs.readFileSync(path.join(app, file), 'utf8');

{
  const internals = React.__CLIENT_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE;
  let dispatcher;
  renderToStaticMarkup(React.createElement(function Capture() { dispatcher = internals.H; return null; }));
  const useStore = dispatcher.useSyncExternalStore;
  dispatcher.useSyncExternalStore = (subscribe, getSnapshot, getServerSnapshot) => useStore(subscribe, getSnapshot, getServerSnapshot ?? getSnapshot);
}

let server, C, Transcript, Root, Menu;
before(async () => {
  server = await createServer({ configFile: false, root: app, plugins: [react()],
    server: { middlewareMode: true, hmr: false, ws: false, watch: null }, appType: 'custom', logLevel: 'error' });
  const I18N = await server.ssrLoadModule('/electron/i18n/index.mjs');
  I18N.setLocale?.('en-US');
  C = await server.ssrLoadModule('/src/source-code-transcript.jsx');
  Transcript = await server.ssrLoadModule('/src/source-transcript.jsx');
  Root = await server.ssrLoadModule('/src/generated/code-transcript/code-transcript.mjs');
  Menu = await server.ssrLoadModule('/src/transcript-context-menu-model.mjs');
  globalThis.document ??= { body: { nodeType: 1 }, head: { appendChild() {}, querySelector: () => null }, createElement: () => ({ relList: { supports: () => false }, setAttribute() {}, addEventListener() {}, remove() {}, style: {} }),
    querySelector: () => null, querySelectorAll: () => [], getElementsByTagName: () => [], addEventListener() {}, removeEventListener() {}, documentElement: { dataset: {}, style: {}, getAttribute: () => null, hasAttribute: () => false }, cookie: '' };
  globalThis.window ??= { document: globalThis.document, navigator: { userAgent: 'Mozilla/5.0 (Macintosh)' }, addEventListener() {}, removeEventListener() {},
    matchMedia: () => ({ matches: false, addEventListener() {}, removeEventListener() {} }), location: { href: 'file:///', pathname: '/', search: '' } };
  globalThis.window.innerHeight ??= 800;
});
after(() => server?.close());

const SHORT = [
  { id: 'u1', type: 'userMessage', turnId: 't1', content: [{ type: 'text', text: 'first question' }] },
  { id: 'm1', type: 'agentMessage', turnId: 't1', text: 'An answer' },
];
const inFrame = (items, props = {}, frame = {}) => renderToStaticMarkup(React.createElement(Transcript.SourceTranscript, { sessionKey: 'code:r7', ready: true, statusRows: true, ...frame },
  React.createElement(C.SourceCodeTranscript, { sessionId: 'r7', items, ...props })));

test('R7T-03: the link item is DA\'s "Open in Browser pane" (zh-CN present); the file menu carries no "File actions" name', async () => {
  const c96 = official('c96d752d0-');
  assert.ok(c96.includes('defaultMessage:"Open in Browser pane",id:"vbISyh+BUD"'));
  const en = JSON.parse(fs.readFileSync(path.join(app, '../reference/snapshots/claude-3.6556.2-20261025-192807/ion-dist/i18n/en-US.json'), 'utf8'));
  assert.ok(!Object.values(en).includes('File actions'));
  const entries = Menu.messageMenu({ linkHref: 'http://localhost:3000/', canOpenInBrowser: true, canOpenInPreview: true, messageText: 'x' });
  assert.equal(entries.find((entry) => entry.id === 'open-in-preview')?.label, 'Open in Browser pane');
  assert.ok(!JSON.stringify(entries).includes('Open in Preview'));
  const zh = await server.ssrLoadModule('/electron/i18n/zh-CN/code-transcript.mjs');
  assert.equal((zh.default ?? zh)['Open in Browser pane'] ?? Object.values(zh).find((v) => v?.['Open in Browser pane'])?.['Open in Browser pane'], '在浏览器窗格中打开');
  const src = read('src/source-transcript.jsx');
  assert.ok(src.includes('label={menu.kind === "file" ? undefined : t("Message actions")}'));
  assert.ok(!src.includes('t("File actions")'));
});

test('R7T-02 official: Aat mounts its list in TA; TA = xA.Provider + _De; i9 wraps a prompt / reply l3 in M7 with these actions', () => {
  const c96 = official('c96d752d0-');
  assert.ok(c96.includes('f(xA.Provider,{value:g,children:E})'));
  assert.ok(c96.includes('f(_De,{open:n,onOpenChange:y,onOpenChangeComplete:b,hasOpened:i==="opened",armed:o,forward:T,hiddenTriggerRef:p})'));
  assert.ok(c96.includes('f(M7,{entry:t.entry,turnKey:Xe,userChaptersByAfterId:k,onPinChapter:void 0,onUnpinChapter:void 0,rendererPinAnchorOf:void 0,onForkAfterTurn:void 0,onForkAtMessage:A,onRewindToMessage:F,onAttachAsContext:H,viewerAccountId:ie,'));
  assert.ok(c96.includes('f(M7,{entry:t.entry,turnKey:Xe,userChaptersByAfterId:k,onPinChapter:G,onUnpinChapter:K,rendererPinAnchorOf:q,onForkAfterTurn:Rt,onForkAtMessage:void 0,onRewindToMessage:void 0,onAttachAsContext:H,viewerAccountId:ie,'));
  assert.ok((c96.match(/f\(TA,\{children:f\(n8,/g) ?? []).length >= 2);
  const manifest = JSON.parse(read('src/generated/code-transcript/manifest.json'));
  const root = manifest.modules.find((m) => m.target === 'code-transcript.mjs');
  assert.equal(root.exports.TA, 'TranscriptMessageMenuHost');
  assert.equal(typeof Root.TranscriptMessageMenuHost, 'function');
});

test('R7T-02: a Code session renders with TA around the list and M7 around every turn row (host menu yields to it)', () => {
  const html = inFrame(SHORT);
  assert.ok(html.includes('first question') && html.includes('An answer'));
  // Both turns are marked as M7-owned rows (the host's message menu stands down there).
  const owned = [...html.matchAll(/data-transcript-item-id="([^"]+)"[^>]*data-code-message-menu=""/g)].map((m) => m[1]);
  assert.ok(owned.includes('u1') && owned.includes('m1'), owned.join());
  const src = read('src/source-code-transcript.jsx');
  assert.ok(src.includes('<TranscriptMessageMenuHost>'));
  assert.ok(/onForkAtMessage=\{user \? rendererHost\.onForkAtMessage : undefined\} onRewindToMessage=\{user \? rendererHost\.onRewindToMessage : undefined\}/.test(src));
  const frame = read('src/source-transcript.jsx');
  assert.ok(frame.includes('if (target.closest("[data-code-message-menu]")) return false;'));
  assert.ok(frame.includes('onContextMenuCapture={onFileContextMenuCapture}'));
});

test('R7T-02: Chat / Cowork transcripts keep the host message menu (no TA, no M7 marks)', () => {
  const html = renderToStaticMarkup(React.createElement(Transcript.SourceTranscript, { sessionKey: 'chat:x', ready: true, statusRows: false },
    React.createElement('div', { 'data-transcript-item-id': 'u1' }, 'hello')));
  assert.ok(!html.includes('data-code-message-menu'));
});

test('R7T-05: file URLs encode each path segment (# ? % name the file); no cwd / home range check is added', async () => {
  assert.equal(C.fileUrlOf('/tmp/a b.png'), 'file:///tmp/a%20b.png');
  assert.equal(C.containedImageSource('/x/#1?.png'), 'file:///x/%231%3F.png');
  assert.equal(C.containedImageSource('100%.png', '/w'), 'file:///w/100%25.png');
  assert.equal(await C.loadSessionImage('/elsewhere/shot #2.png', '/w', null), 'file:///elsewhere/shot%20%232.png');
  assert.equal(await C.loadSessionImage('../secret.png', '/w', null), null);
});

// ---- r7c-01：排队消息条换成官方 cf74bc599 VE（generated/queued-bar），宿主重述的 SingleRow / MultiEntry / .sqm-* 删除。
const queuedEntry = (id, text) => ({ id, input: [{ type: 'text', text }], clientUserMessageId: null, preview: text });
test('r7c-01 official: VE / WE / GE / UE as sliced; the bar is generated, the host restatement and its rules are gone', async () => {
  const cf7 = official('cf74bc599-');
  assert.ok(cf7.includes('VE as QueuedMessageBar'));
  assert.ok(cf7.includes('x=`${br} px-lg select-none ${c?"rounded-t-none border-t":""}`'));
  assert.ok(cf7.includes('defaultMessage:"Claude reads this message at its next step.",id:"2jgJ/J75kk"'));
  const cc4 = official('cc43287c9-');
  assert.ok(cc4.includes('overlayHost:"EpitaxySessionScopeBody.QueuedMessageBar"'));
  const manifest = JSON.parse(read('src/generated/queued-bar/manifest.json'));
  assert.equal(manifest.modules.find((m) => m.target === 'queued-bar.mjs').exports.VE, 'QueuedMessageBar');
  const host = read('src/source-queued-messages.jsx');
  for (const gone of ['function SingleRow', 'function MultiEntry', 'function RowMenu', 'queuedCountLabel', 'sqm-row', 'sqm-item'])
    assert.ok(!host.includes(gone), gone);
  assert.ok(!/\.sqm-[\w-]+\s*[{,:]/.test(read('src/source-queued-messages.css')));
  assert.ok(!/sqm-(?:row|single|count|preview)/.test(read('src/main.jsx') + read('src/source-btw-pane.jsx')));
  assert.ok(fs.existsSync(path.join(app, 'scripts/verify-gen-queued-bar.mjs')));
});

test('r7c-01 SSR: one entry is WE (count, preview, Send now with its note in the persona, Edit, Remove); several are GE\'s collapsed button', async () => {
  const Q = await server.ssrLoadModule('/src/source-queued-messages.jsx');
  const noop = () => {};
  const one = renderToStaticMarkup(React.createElement(Q.SourceQueuedMessages, { entries: [queuedEntry('q1', 'later please')], onCancel: noop, onEdit: noop, onSteer: noop }));
  assert.match(one, /^<div class="sqm-band" data-queued-messages="" data-count="1"><div class="epitaxy-band-enter ">/);
  assert.ok(one.includes(`data-take-back-entry="q1" class="${Q.QUEUED_ROW_CLASS} "`), one);
  assert.ok(one.includes('<span class="text-body-medium text-primary shrink-0">1 message queued</span>'));
  assert.ok(one.includes('<span class="flex-1 min-w-0 truncate text-body text-muted-as-secondary">later please</span>'));
  assert.ok(one.includes('aria-label="Send now"') && one.includes('aria-label="Edit in composer"') && one.includes('aria-label="Remove from queue"'));
  assert.ok(one.includes('reads this message at its next step.') && !one.includes('Claude reads'));
  // The host's in-flight state: the entry being sent shows Send now busy; another in flight shows Remove busy.
  const sending = renderToStaticMarkup(React.createElement(Q.SourceQueuedMessages, { entries: [queuedEntry('q1', 'x')], lockedIds: ['q1'], steeringId: 'q1', onCancel: noop, onSteer: noop }));
  assert.ok(sending.includes('aria-busy="true"'));
  const many = renderToStaticMarkup(React.createElement(Q.SourceQueuedMessages, { entries: [queuedEntry('q1', 'first'), queuedEntry('q2', 'second')], onCancel: noop, onReorder: noop }));
  assert.ok(many.includes('aria-expanded="false"') && many.includes('2 messages queued') && many.includes('Next: first'), many);
  assert.equal(renderToStaticMarkup(React.createElement(Q.SourceQueuedMessages, { entries: [] })), '');
  // Jfe's exit: the band keeps the leaving entry, inert, with epitaxy-band-exit.
  const exiting = renderToStaticMarkup(React.createElement(Q.SourceQueuedMessages, { entries: [queuedEntry('q1', 'x')], exiting: true, onExited: noop }));
  assert.match(exiting, /<div class="epitaxy-band-enter epitaxy-band-exit" inert="">/);
});

test('r7c-01: a queued submission as VE\'s entry (text without hidden reminders, images, mentions; the preview when no input)', async () => {
  const Q = await server.ssrLoadModule('/src/source-queued-messages.jsx');
  assert.deepEqual(Q.queuedBarEntry({ id: 'a', input: [{ type: 'text', text: 'hi<system-reminder>x</system-reminder>' }, { type: 'image', url: 'u' }, { type: 'mention', name: 'f.md' }] }).items,
    [{ kind: 'text', id: 'a:0', text: 'hi' }, { kind: 'image', id: 'a:1' }, { kind: 'text', id: 'a:2', text: '@f.md' }]);
  assert.deepEqual(Q.queuedBarEntry({ id: 'b', input: [], preview: 'prev' }).items, [{ kind: 'text', id: 'b:preview', text: 'prev' }]);
});

test('R7T-02: DA\'s "Open in {browser}" (shared-52 _z → oi) opens through the host\'s external call, not window.open', async () => {
  const S52 = official('shared-52-');
  assert.ok(S52.includes('desktopBehavior:r="open-in-browser"') && S52.includes('window.open(vz(e),"_blank",t)'));
  const root = read('src/generated/code-transcript/code-transcript.mjs');
  assert.match(root, /openDesktopHref as oi,/);
  const A = await server.ssrLoadModule('/src/source-code-transcript-adapters.jsx');
  const calls = [];
  const saved = globalThis.window.desktop;
  globalThis.window.desktop = { call: (action, payload) => { calls.push([action, payload]); return Promise.resolve(true); } };
  try {
    assert.equal(A.openDesktopHref({ href: 'https://example.com/a', features: 'noopener,noreferrer' }), null);
    assert.deepEqual(calls, [['external', { url: 'https://example.com/a' }]]);
  } finally { globalThis.window.desktop = saved; }
});

test('R7T-01: a saved anchor the list has not mounted is revealed through the feed first, then placed at its offset', () => {
  const feed = read('src/source-code-feed.jsx');
  assert.ok(feed.includes('export function useOfficialFeedScroll({ sessionKey, ready = true, enabled = true, attrs = undefined, revealRow = undefined })'));
  assert.ok(feed.includes('} else if (anchor && !revealed && revealRef.current?.(anchor.itemId) === true) {'));
  // The fallback stays: a row still not there after the reveal parks at the tail.
  assert.ok(feed.includes('else follow.scrollToBottom();'));
  const frame = read('src/source-transcript.jsx');
  assert.ok(frame.includes('revealRow: revealFeedRow'));
  assert.ok(frame.includes('return feedHost.current?.reveal.get()?.(itemId) === true;'));
  // The official restore this stands in for (z7 / B7: Bx's saved viewport as the list's initialViewport).
  const c96 = official('c96d752d0-');
  assert.ok(c96.includes('{handle:e,snapshot:i}=Bx.open(t)') && c96.includes('if(y?.viewport!==void 0)return y.viewport'));
});

test('R7DC-03: the sidebar hover card and routines link the renderer\'s slices instead of cutting them again (D1)', () => {
  const held = new Map();
  for (const area of fs.readdirSync(path.join(app, 'src/generated'))) {
    const file = path.join(app, 'src/generated', area, 'manifest.json');
    if (!fs.existsSync(file)) continue;
    for (const m of JSON.parse(fs.readFileSync(file, 'utf8')).modules ?? []) for (const b of m.bindings ?? []) {
      const key = `${m.source}#${typeof b === 'string' ? b : b.name}`;
      held.set(key, [...(held.get(key) ?? []), area]);
    }
  }
  const twice = (area, other) => [...held].filter(([, areas]) => areas.includes(area) && areas.includes(other)).map(([key]) => key);
  assert.deepEqual(twice('sidebar-hover-card', 'code-transcript'), []);
  assert.deepEqual(twice('sidebar-hover-card', 'transcript-rows'), []);
  assert.deepEqual(twice('sidebar-routines', 'code-transcript'), []);
  const links = JSON.parse(read('scripts/code-transcript-links.json')).linkExports;
  // W14-code r8 R8DC-02: eA / tA had no importer (only nA / hN … are linked), so they are no longer link exports.
  for (const name of ['nA', 'hN', 'YN']) assert.ok(links['code-transcript']['shared-78-D5Fw2h0a.js'].includes(name), name);
  for (const name of ['eA', 'tA']) assert.ok(!links['code-transcript']['shared-78-D5Fw2h0a.js'].includes(name), name);
  assert.ok(links['transcript-rows']['shared-78-D5Fw2h0a.js'].includes('Oj') && links['transcript-rows']['shared-11-_AVGLHEz.js'].includes('hc'));
  assert.ok(!read('scripts/extract-sidebar-hover-card.mjs').includes("'shared-78-D5Fw2h0a.js#Oj'"));
});

// W14-code 第八轮（data/w14code/round8/lanes/transcript.json）R8T-REG-02 / R8T-02 / R7T-01。
test('R8T-REG-02: a non-UUID user entry gets a UUID-shaped id (jN), sourceUuid / rows keep the engine id, the turn reads back', async () => {
  const c96 = official('c96d752d0-');
  assert.ok(c96.includes('AN=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i'));
  assert.ok(c96.includes('return e.waitingLane!=="parked"&&AN.test(e.id)'));
  const AN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  const E = await server.ssrLoadModule('/src/code-transcript-entries.mjs');
  const uuid = '3f2b2c1e-1111-4222-8333-123456789abc';
  assert.equal(E.userEntryId(uuid), uuid, 'a UUID stays');
  assert.match(E.userEntryId('item-1'), AN);
  assert.equal(E.userEntryId('item-1'), E.userEntryId('item-1'), 'stable');
  assert.notEqual(E.userEntryId('item-1'), E.userEntryId('item-2'));
  const items = [{ id: 'item-1', type: 'userMessage', turnId: 't1', content: [{ type: 'text', text: 'hi' }] },
    { id: 'item-2', type: 'agentMessage', turnId: 't1', text: 'Hello' },
    { id: 'sh', type: 'commandExecution', source: 'userShell', turnId: 't2', command: 'ls', status: 'completed', aggregatedOutput: '' }];
  const all = E.codeTranscriptEntries(items);
  const [user, , shell] = all;
  assert.match(user.id, AN);
  assert.equal(user.sourceUuid, 'item-1');
  assert.equal(user.rows[0].id, 'item-1');
  assert.equal(user.items[0].id, 'item-1:text', 'the items keep the engine ids');
  assert.match(shell.id, AN);
  assert.equal(shell.items[0].id, 'sh');
  // The action host reads the turn back by the entry's id (or the engine id).
  const calls = [];
  const host = C.codeTranscriptActionHost('s', all, all, null, { rewindServed: true, onRewindTo: (turn) => calls.push(['rewind', turn]), onForkFrom: (turn) => calls.push(['fork', turn]) });
  host.onForkAtMessage(user.id);
  host.onRewindToMessage(user.id);
  host.onForkAtMessage('item-1');
  host.onForkAtMessage(shell.id);
  assert.deepEqual(calls, [['fork', 't1'], ['rewind', 't1'], ['fork', 't1'], ['fork', 't2']]);
  // SSR: the host row keeps the engine id (the follow release, the reveal, the restore anchor read it).
  const html = inFrame(items);
  assert.match(html, /data-transcript-item-id="item-1" data-code-message-menu=""/);
  assert.ok(html.includes(`data-turn-key="${user.id}"`));
});

test('R8T-02: a Codex sleep item is a call in the reply\'s tool run (the generic row), not a host row cutting it', async () => {
  const E = await server.ssrLoadModule('/src/code-transcript-entries.mjs');
  const items = [{ id: 'u1', type: 'userMessage', turnId: 't1', content: [{ type: 'text', text: 'wait' }] },
    { id: 'c1', type: 'commandExecution', turnId: 't1', command: 'ls', status: 'completed' },
    { id: 's1', type: 'sleep', turnId: 't1', durationMs: 3000 },
    { id: 'c2', type: 'commandExecution', turnId: 't1', command: 'pwd', status: 'completed' }];
  const entries = E.codeTranscriptEntries(items);
  assert.deepEqual(entries.map((entry) => entry.author), ['user', 'assistant']);
  assert.deepEqual(entries[1].items.map((item) => item.kind), ['tools']);
  assert.deepEqual(entries[1].items[0].tools.map((tool) => [tool.id, tool.name, tool.status]), [['c1', 'Bash', 'completed'], ['s1', 'sleep', 'completed'], ['c2', 'Bash', 'completed']]);
  assert.deepEqual(entries[1].items[0].tools[1].input, {});
  assert.equal(E.rendererDrawsRow(items[2]), true);
  assert.equal(E.rendererDrawsRow({ id: 'g', type: 'fileToolGroup', toolGroup: [items[1], items[2]] }), true);
  assert.ok(read('src/transcript-sdk-tools.mjs').includes('case "imageGeneration": case "sleep": return item.type;'));
});

test('R7T-01: Bx — the feed list saves its viewport per session and opens there (B7 / initialViewport), the anchor restore stays', async () => {
  const c96 = official('c96d752d0-');
  assert.ok(c96.includes('initialSizes:ke?.sizes,initialViewport:()=>it??null'));
  const c4a = read('src/generated/code-transcript/c4a9ee384-RLCjceOL.mjs');
  assert.ok(c4a.includes('viewport: n.getViewport() ?? void 0,'));
  const F = await server.ssrLoadModule('/src/source-code-feed.jsx');
  assert.equal(F.openFeedSnapshot('r8-none'), undefined);
  assert.equal(F.feedInitialViewport(undefined).following, true, 'no snapshot: the tail, following');
  const sizes = new Map([['row', 120]]);
  F.saveFeedSnapshot('r8-a', { isPinned: false, viewport: { scrollTop: 640, height: 500 }, sizes });
  assert.deepEqual(F.feedInitialViewport(F.openFeedSnapshot('r8-a')), { scrollTop: 640, height: 500, following: false });
  F.saveFeedSnapshot('r8-b', { isPinned: true, viewport: { scrollTop: 640, height: 500 } });
  assert.equal(F.feedInitialViewport(F.openFeedSnapshot('r8-b')).following, true, 'left following: opens at the tail (z7 openAtLatest)');
  assert.equal(F.feedInitialViewport({ isPinned: false }).following, true, 'no viewport: the tail');
  for (let index = 0; index < 60; index++) F.saveFeedSnapshot(`r8-many-${index}`, { isPinned: true });
  assert.equal(F.openFeedSnapshot('r8-a'), undefined, 'the 50 latest are kept');
  const feed = read('src/source-code-feed.jsx');
  assert.ok(feed.includes('const [restored] = useState(() => openFeedSnapshot(sessionId ?? undefined));'));
  assert.ok(feed.includes('...(restored?.sizes instanceof Map ? { initialSizes: restored.sizes } : null), initialViewport: openViewport,'));
  assert.ok(feed.includes('saveFeedSnapshot(sessionId, { isPinned: isPinned() ?? true, viewport,'));
  assert.ok(feed.includes('} else if (anchor && !revealed && revealRef.current?.(anchor.itemId) === true) {'), 'the anchor restore stays as the fallback');
});
