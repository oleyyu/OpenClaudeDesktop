// W14-code 第二轮 transcript 线（plan-w14-code.md §3，E89 起）：新渲染器的 entry 构造与宿主接线。
//   R2T-01 用户 entry 带附件（c06cf64bb 用户 items → c96d752d0 fF / M6e 附件瓦片）
//   R2T-02 用户 entry 先过 shownUserItem（隐藏提醒、workflow 通知回合、本地定时任务 origin、演示卡）
//   R2T-03 新渲染器下宿主 SourceTurnFooter 不再画（MessageActions 是回合唯一工具条）
//   R2T-04 已完成的压缩 = assistant entry 的 compacted item（VE → TurnStatus）
//   R2T-05 Codex plan = 回复正文 text item
//   R2T-06 agentMessage 的 Used memory / 异步提问画在渲染器行之后
//   R2T-08 userChaptersByAfterId / hiddenChapterIds 进 renderer host
//   R2T-09 tDe：回合运行中 Rewind 禁用原因
//   R2T-10 onAttachAsContext 接宿主 composer
//   R2T-TA5 引用片段写回 `<!-- attach: label -->` 标记
//   gates-r2-01 host-growthbook 按名字读门控（shared-0 Do）
//   R2T-07 / gates-r2-03（复核补做）待发送 / 发送失败 / steer 等待的用户消息进渲染器（切 c96d752d0 kI → DI）
// SSR 用 vite middleware 模式；官方 chunk 只当文本读。
import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createServer } from 'vite';
import react from '@vitejs/plugin-react';
// W14-code r8 R8T-REG-02: a user entry's id is UUID-shaped (c96d752d0 jN / AN: Rewind / Fork need it); a non-UUID engine id
// is derived through userEntryId (code-transcript-entries), sourceUuid keeps the engine id.
import { codeSubagents, codeTranscriptEntries, localUserEntries, rendererDrawsRow, scheduledPromptEvent, userEntryId, userEntryItems, userEntryText } from '../src/code-transcript-entries.mjs';
import { failedSend, pendingSend, pendingUserRow } from '../src/pending-send-model.mjs';
import { snippetText } from '../src/composer-attachments-model.mjs';
import { HOST_GROWTHBOOK, growthBookFlagKey, hostGrowthBookFlag } from '../src/host-growthbook.mjs';

const app = path.resolve(import.meta.dirname, '..');
const snapshot = path.join(app, '../reference/snapshots/claude-3.6556.2-20261025-192807');
const official = (file) => fs.readFileSync(path.join(snapshot, 'ion-dist/assets/v1', file), 'utf8');
const read = (file) => fs.readFileSync(path.join(app, file), 'utf8');
const strip = (html) => html.replace(/ class="[^"]*"/g, '').replace(/ (id|style|tabindex|aria-[a-z]+)="[^"]*"/g, '');

{
  const internals = React.__CLIENT_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE;
  let dispatcher;
  renderToStaticMarkup(React.createElement(function Capture() { dispatcher = internals.H; return null; }));
  const useStore = dispatcher.useSyncExternalStore;
  dispatcher.useSyncExternalStore = (subscribe, getSnapshot, getServerSnapshot) => useStore(subscribe, getSnapshot, getServerSnapshot ?? getSnapshot);
}

let server, C, S;
before(async () => {
  server = await createServer({ configFile: false, root: app, plugins: [react()],
    server: { middlewareMode: true, hmr: false, ws: false, watch: null }, appType: 'custom', logLevel: 'error' });
  const i18n = await server.ssrLoadModule('/electron/i18n/index.mjs');
  i18n.setLocale?.('en-US');
  C = await server.ssrLoadModule('/src/source-code-transcript.jsx');
  S = await server.ssrLoadModule('/src/source-session.jsx');
  globalThis.document ??= { body: { nodeType: 1 }, head: { appendChild() {}, querySelector: () => null }, createElement: () => ({ relList: { supports: () => false }, setAttribute() {}, style: {} }),
    querySelector: () => null, querySelectorAll: () => [], addEventListener() {}, removeEventListener() {}, documentElement: { dataset: {}, getAttribute: () => null }, cookie: '' };
  globalThis.window ??= { document: globalThis.document, navigator: { userAgent: 'Mozilla/5.0 (Macintosh)' }, addEventListener() {}, removeEventListener() {},
    matchMedia: () => ({ matches: false, addEventListener() {}, removeEventListener() {} }), location: { href: 'file:///', pathname: '/', search: '' } };
});
after(() => server?.close());

const render = (props) => renderToStaticMarkup(React.createElement(C.SourceCodeTranscript, { sessionId: 'r2', ...props }));
const REPLY = { id: 'm1', type: 'agentMessage', turnId: 't1', text: 'Done.' };

test('R2T-01: a user message\'s images and files are entry items (c06cf64bb), drawn as the attachments tiles', () => {
  const item = { id: 'u1', type: 'userMessage', turnId: 't1', content: [{ type: 'text', text: 'Look at these' },
    { type: 'localImage', path: '/tmp/shot.png' }, { type: 'mention', name: 'app.js', path: '/repo/app.js' }, { type: 'image', url: 'data:image/png;base64,iVBORw0KGgo=' }] };
  assert.deepEqual(userEntryItems(item), [
    { kind: 'image', id: 'u1-img0', data: 'iVBORw0KGgo=', mimeType: 'image/png' },
    { kind: 'file', id: 'u1-filem0', path: '/repo/app.js', fileName: 'app.js', isDirectory: false },
    { kind: 'pathImage', id: 'u1-pimg0', path: '/tmp/shot.png', fileName: 'shot.png' },
    { kind: 'text', id: 'u1:text', text: 'Look at these' }]);
  // The attachment note a core without file mentions gets is a file item, not text.
  const noted = userEntryItems({ id: 'u2', type: 'userMessage', content: [{ type: 'text', text: 'Read it\n\n[Attached file: /repo/a.md]' }] });
  assert.deepEqual(noted.map((i) => `${i.kind}:${i.path ?? i.text}`), ['file:/repo/a.md', 'text:Read it']);
  // c06cf64bb's item shapes, verbatim.
  const c06 = official('c06cf64bb-CdJdJuVd.js');
  assert.ok(c06.includes('kind:"pathImage",id:`${t}-pimg${n}`'));
  assert.ok(c06.includes('kind:"file",id:`${t}-filem${n}`'));
  // SSR: the official attachments card (code.user.attachments → M6e → $C) with the file tile and the loaded image.
  const html = render({ items: [item, REPLY], host: { cwd: '/repo' } });
  assert.match(html, /app\.js/);
  assert.match(html, /data:image\/png;base64,iVBORw0KGgo=/);
  assert.equal(C.containedImageSource('/tmp/a b.png'), 'file:///tmp/a%20b.png');
  assert.equal(C.containedImageSource('img/x.png', '/repo/'), 'file:///repo/img/x.png');
  assert.equal(C.containedImageSource('https://e.x/y.png'), 'https://e.x/y.png');
  assert.equal(C.containedImageSource('rel.png'), null);
  // The loader is the original's context (c856385e2 `wt = Ct.Provider`), exported by the extractor.
  assert.match(read('src/generated/code-transcript/c856385e2-aEyDzrcK.mjs'), /wt as ContainedImageLoaderProvider/);
  // W14-code r2 R2T-TS8 adds c856385e2 `rt` (sessionFileReadable, read by cb6930dae Xu) to the same extra exports.
  // W14-code r6 R6T-02 adds c856385e2 `xt` (bt.Provider, the session's image loader c5259f582 provides) to the same exports.
  assert.match(read('scripts/extract-code-transcript.mjs'), /'c856385e2-aEyDzrcK\.js': \{ exports: \{ wt: 'ContainedImageLoaderProvider', rt: 'SessionFileReadableProvider', xt: 'ImageLoaderProvider' \}/);
});

test('R2T-02: hidden reminders leave the user entry; notification / demonstration turns stay the host\'s; the host scheduler\'s origin', () => {
  const reminded = { id: 'u1', type: 'userMessage', turnId: 't1', content: [{ type: 'text', text: 'ship it\n\n<system-reminder>\nultracode mode\n</system-reminder>' }] };
  assert.equal(userEntryText(reminded), 'ship it');
  assert.deepEqual(userEntryItems(reminded), [{ kind: 'text', id: 'u1:text', text: 'ship it' }]);
  assert.doesNotMatch(render({ items: [reminded, REPLY] }), /system-reminder/);
  // A message that is only a reminder draws nothing (no empty user entry).
  const hidden = { id: 'u0', type: 'userMessage', turnId: 't0', content: [{ type: 'text', text: '<system-reminder>\nx\n</system-reminder>' }] };
  assert.deepEqual(codeTranscriptEntries([hidden]).map((e) => e.author), []);
  // The local scheduler's fire (electron/schedule-service.cjs firedText) is the Scheduled check-in event row.
  const fired = { id: 'u3', type: 'userMessage', turnId: 't3', content: [{ type: 'text',
    text: 'check the build\n\n<system-reminder>\nThis prompt was scheduled with CronCreate (job 0a1b2c3d) and fired at 2026-11-01T10:00:00Z. It is not a new message from the user.\n</system-reminder>' }] };
  assert.deepEqual(scheduledPromptEvent(fired), { kind: 'event', id: 'u3:event', eventType: 'trigger', content: 'check the build' });
  assert.equal(rendererDrawsRow(fired), false);
  // W14-code r5 R5T-REG-02 (corrects r4 R4T-08g): a recorded demonstration is the renderer's (a watchRecord user item,
  // c96d752d0 DI `ii === "watchRecord"` → JF, w14-r5-transcript); a workflow notification is never a host row
  // (R3T-NEW-01 task_event, or no item: w14-r4-transcript).
  const demo = { id: 'u4', type: 'userMessage', turnId: 't4', content: [{ type: 'text', text: '<watch-record duration-ms="1200">steps</watch-record>' }] };
  assert.equal(rendererDrawsRow(demo), true);
  assert.doesNotMatch(read('src/code-transcript-entries.mjs'), /hostUserMessage/);
  // Official: c06cf64bb strips these tags when it builds the entry.
  assert.ok(official('c06cf64bb-CdJdJuVd.js').includes('<system-reminder>'));
});

test('R2T-03: with the renderer on, the turn\'s one toolbar is the renderer\'s MessageActions (no host SourceTurnFooter)', () => {
  const main = read('src/main.jsx');
  assert.match(main, /\{footer && !\(mode === "code" && !!current && codeTranscriptRendererOn\(current\)\) \/\* W14-code E86 \/ r2 R2T-03/);
  assert.ok(official('c96d752d0-CWv_7-n9.js').includes('onForkAfterAssistantTurn:ze.forkAfterAssistantTurn'));
});

test('R2T-04 / R2T-05: a finished compaction is the reply\'s compacted marker; a plan is an ExitPlanMode call (r4 R4T-08e)', () => {
  const items = [{ id: 'u1', type: 'userMessage', turnId: 't1', content: [{ type: 'text', text: 'go' }] },
    { id: 'p1', type: 'plan', turnId: 't1', text: '1. Read\n2. Fix' },
    { id: 'cc', type: 'contextCompaction', turnId: 't1', status: 'completed', preTokens: 90000, postTokens: 12000 }, REPLY];
  const entries = codeTranscriptEntries(items);
  assert.deepEqual(entries.map((e) => `${e.author}:${e.id}`), [`user:${userEntryId('u1')}`, 'assistant:p1:reply']);
  // W14-code r4 R4T-08e (E95): the plan is the turn's ExitPlanMode call (c96d752d0 `exit_plan_mode: {rollUp:
  // "stands-alone"}`, the row's body reads `input.plan`), not reply prose.
  assert.deepEqual(entries[1].items.map((i) => i.kind), ['tools', 'compacted', 'text']);
  assert.deepEqual(entries[1].items[0].tools.map((t) => [t.id, t.name, t.status, t.input]), [['p1', 'ExitPlanMode', 'completed', { plan: '1. Read\n2. Fix' }]]);
  assert.deepEqual(entries[1].items.slice(1), [{ kind: 'compacted', id: 'cc', preTokens: 90000, postTokens: 12000 }, { kind: 'text', id: 'm1', text: 'Done.' }]);
  // Running / stopped / failed: no marker (c96d752d0 HW's divider is "done" only); r4 R4T-08g: the DeepSeek bridge's
  // counted compaction is the same marker (its count / summary are a host extension, not shown).
  assert.equal(codeTranscriptEntries([{ ...items[2], status: 'inProgress' }]).length, 0);
  assert.equal(codeTranscriptEntries([{ ...items[2], status: 'interrupted' }]).length, 0);
  assert.equal(codeTranscriptEntries([{ ...items[2], status: 'failed' }]).length, 0);
  assert.equal(rendererDrawsRow({ ...items[2], status: 'failed' }), true);
  assert.equal(rendererDrawsRow({ ...items[2], codeDesktop: { shadowedItems: 4, summary: 'x' } }), true);
  assert.deepEqual(codeTranscriptEntries([{ ...items[2], codeDesktop: { shadowedItems: 4, summary: 'x' } }])[0].items, [{ kind: 'compacted', id: 'cc', preTokens: 90000, postTokens: 12000 }]);
  const html = strip(render({ items }));
  assert.match(html, /Compacted session · saved 78k tokens/);
  assert.ok(official('c80ec48f8-D2IVcRNS.js').includes('defaultMessage:"Compacted session \\u00B7 saved {tokens} tokens"'));
  assert.match(html, /Proposed plan/);
});

test('R2T-06: the host\'s Used memory and async questions after the renderer\'s answer', () => {
  const item = { id: 'm1', type: 'agentMessage', turnId: 't1', text: 'x', memoryCitation: { entries: [{ path: '/m/notes.md', lineStart: 1, note: 'prefs' }] } };
  const html = renderToStaticMarkup(React.createElement(S.SourceAgentMessageExtras, { item }));
  assert.match(html, /<p class="source-memory-citation"><span>Used memory<\/span> <span class="source-memory-citation-entry" title="\/m\/notes\.md:1"><bdi>prefs<\/bdi><\/span><\/p>/);
  assert.equal(renderToStaticMarkup(React.createElement(S.SourceAgentMessageExtras, { item, isStreaming: true })), '');
  assert.equal(renderToStaticMarkup(React.createElement(S.SourceAgentMessageExtras, { item: { ...item, memoryCitation: null } })), '');
  assert.match(read('src/source-session.jsx'), /<SourceAgentMessageExtras item=\{item\} isStreaming=\{isStreaming\} \/>/);
});

test('R2T-08 / R2T-09 / R2T-10: the renderer host\'s chapters, rewind reason and attach-as-context', () => {
  const source = read('src/source-code-transcript.jsx');
  assert.match(source, /showThinking, hiddenChapterIds, \.\.\.\(userChaptersByAfterId \? \{ userChaptersByAfterId \} : \{\}\)/);
  assert.match(source, /<RewindDisabledReasonProvider rewindDisabledReason=\{responding \? "responding" : undefined\} forkDisabledReason=\{undefined\}>/);
  assert.match(source, /\.\.\.\(attachOffered \? \{ onAttachAsContext: attach \} : \{\}\)/);
  const main = read('src/main.jsx');
  assert.match(main, /onAttachAsContext: transcriptActions\.onAttachText,/);
  assert.match(main, /\{\(codeRendererDraws\(item\) \? \[\] : pinnedChaptersForRow\(chapterSession, item\)\)\.map/);
  const c96 = official('c96d752d0-CWv_7-n9.js');
  assert.ok(c96.includes('hiddenChapterIds:Ue??Qit,userChaptersByAfterId:Re.userChaptersByAfterId'));
  assert.ok(c96.includes('function tDe(e){let $=J9(6),{rewindDisabledReason:t,forkDisabledReason:n,children:r}=e'));
  assert.ok(official('cf74bc599-CRYqipWN.js').includes('l=n?"responding":r?"host_offline":i?"worker_busy":a?"uploading":void 0'));
  // The GT renames (GY's double-click) reach the host store.
  const renames = [];
  const store = { getSnapshot: () => ({ bySession: { r2: { renames: {}, hidden: [], userChapters: [{ id: 'c1', afterId: 'm1', title: 'Old' }] } } }),
    rename: (...args) => renames.push(args) };
  C.mirrorChapterRenames({ renames: { k1: 'Claude chapter' }, userChapters: [{ id: 'c1', afterId: 'm1', title: 'New' }] }, 'r2', store);
  assert.deepEqual(renames, [['r2', 'c1', 'New'], ['r2', 'k1', 'Claude chapter']]);
  // SSR: while the turn runs, the user message's Rewind carries FA's reason.
  const html = render({ items: [{ id: 'u1', type: 'userMessage', turnId: 't1', content: [{ type: 'text', text: 'hi' }] }, REPLY],
    responding: true, activeTurnId: 't2', host: { actions: { rewindServed: true, onRewindTo: () => {} } } });
  assert.equal(typeof html, 'string');
});

test('R2T-TA5: a Code snippet goes as c4d199b75 xe writes it (`<!-- attach: label -->` + quoted lines)', () => {
  const entries = [{ kind: 'snippet', text: 'const a = 1;\n\nreturn a;', label: 'src/a.js:L1-L3' }, { kind: 'snippet', text: 'out', label: 'bad | -->name', terminalTabId: 't9' }];
  assert.equal(snippetText(entries, { attachMarkers: true }),
    '<!-- attach: src/a.js:L1-L3 -->\n> const a = 1;\n> \n> return a;\n\n<!-- attach: bad  name | tab:t9 -->\n> out\n\n');
  // Chat / Cowork / the host rows keep the plain quote.
  assert.equal(snippetText(entries.slice(0, 1)), '> const a = 1;\n>\n> return a;\n\n');
  const c4d = official('c4d199b75-D3cQB-UP.js');
  assert.ok(c4d.includes('oe="<!-- attach -->"'));
  assert.ok(c4d.includes('r(n).trim(),`<!-- attach: ${[n,t?`tab:${t}`:void 0].filter(Boolean).join(" | ")} -->`'));
  // r4 R4T-08f: every Code send (c4d199b75 be), the renderer on or not.
  assert.match(read('src/main.jsx'), /snippetText\(attachments, \{ attachMarkers: mode === "code" \/\* W14-code r2 R2T-TA5; r4 R4T-08f/);
  // SSR: the renderer parses the marker back (no literal marker in the user's bubble).
  const text = snippetText(entries.slice(0, 1), { attachMarkers: true }) + 'Explain this';
  const html = render({ items: [{ id: 'u1', type: 'userMessage', turnId: 't1', content: [{ type: 'text', text }] }, REPLY] });
  assert.doesNotMatch(html, /&lt;!-- attach/);
  assert.match(html, /Explain this/);
});

test('gates-r2-01: a gate read by name finds its __gb__ id (shared-0 Do); presets and turn edits card are on (Uon)', () => {
  assert.equal(growthBookFlagKey('claudeai_cc_epitaxy_session_presets_main'), '__gb__3264789062');
  assert.equal(growthBookFlagKey('claudeai_cc_epitaxy_turn_edits_card'), '__gb__2136381871');
  assert.equal(growthBookFlagKey('__gb__3413676205'), '__gb__3413676205');
  assert.equal(HOST_GROWTHBOOK.__gb__3264789062, true);
  assert.equal(HOST_GROWTHBOOK.__gb__2136381871, true);
  assert.equal(hostGrowthBookFlag('claudeai_cc_epitaxy_session_presets_main'), true);
  assert.equal(hostGrowthBookFlag('ccr_v2_terminal_ws_web'), false);
  assert.ok(official('shared-0-DDOOdL6P.js').includes('function Do(e){if(e.startsWith("__gb__"))return e.slice(6);let t=0;for(let n=0;n<e.length;n++)t=(t<<5)-t+e.charCodeAt(n),t&=t;return((t&4294967295)>>>0).toString()}'));
  const uon = fs.readFileSync(path.join(snapshot, 'asar/.vite/build/index.chunk-jPKPzV-P.js'), 'utf8');
  assert.ok(uon.includes('3264789062:{rule:"follows",condition:"sessionsRunOnThisComputer"}'));
  assert.ok(uon.includes('2136381871:{rule:"follows",condition:"sessionsRunOnThisComputer"}'));
  // The imperative read (shared-0 Ko) in the renderer's closure answers from the same table.
  assert.match(read('src/generated/code-transcript/shared-11-_AVGLHEz.mjs'), /readGrowthBookFlag as Re/);
  for (const file of ['src/source-r3b-transcript-adapters.jsx', 'src/source-turn-box-adapters.jsx', 'src/source-sidebar-sections-adapters.jsx'])
    assert.match(read(file), /hostGrowthBookFlag\("claudeai_cc_epitaxy_session_presets_main"\)/, file);
});

test('R2T-TM3: a Task call whose sub-agent still works draws as running (cea7057eb L through BOe), with its heartbeat', () => {
  const items = [{ id: 'u1', type: 'userMessage', turnId: 't1', content: [{ type: 'text', text: 'dig' }] },
    { id: 'a1', type: 'collabAgentToolCall', turnId: 't1', tool: 'spawnAgent', status: 'completed', prompt: 'Investigate the flaky test', receiverThreadIds: ['th1'] }];
  const subagents = codeSubagents(items, () => ({ status: 'running', items: [{ id: 'x', type: 'commandExecution', command: 'ls', status: 'completed' }], toolCallCount: 1, model: null }));
  assert.deepEqual([...subagents], [['a1', { status: 'running', activity: { toolCallCount: 1, latestToolName: 'Bash' } }]]);
  const entries = codeTranscriptEntries(items, { subagents });
  const tool = entries[1].items[0].tools[0];
  assert.equal(tool.name, 'Task');
  assert.equal(tool.status, 'completed');
  assert.deepEqual(tool.subagentActivity, { toolCallCount: 1, latestToolName: 'Bash' });
  const busy = (html) => (html.match(/data-state="busy"/g) ?? []).length;
  const idle = render({ items });
  const running = render({ items, subagents });
  assert.ok(busy(running) > busy(idle), 'the running sub-agent shows the busy row');
  assert.match(read('src/generated/transcript-rows/rows-cea7057eb-De2BQu3K.mjs'), /L as BackgroundTaskStatusContext/);
  assert.match(read('src/generated/transcript-rows/group-status.mjs'), /le = oe === "completed" \? ce : void 0,/);
  assert.ok(official('c96d752d0-CWv_7-n9.js').includes('le=oe==="completed"?ce:void 0,ue=oe==="running"||le==="running"'));
});

test('DC-07: the Code transcript lands an entering focus (c96d752d0 onFocus f6)', () => {
  const nav = read('src/use-transcript-feed-nav.js');
  assert.match(nav, /import \{ landTranscriptFocus \} from "\.\/generated\/code-current\/transcript-focus-landing\.mjs";/);
  assert.match(nav, /landTranscriptFocus\(event, \{ scroller: event\.currentTarget, pointerDownAt: anyPointerDownAt\.current, tabPresses: null,/);
  assert.match(read('src/use-transcript-scroll.js'), /isPinned: \(\) => controller\.current\?\.isPinned\(\) \?\? false,/);
  assert.match(read('src/main.jsx'), /landsFocus=\{mode === "code" \/\* W14-code r2 DC-07: c96d752d0's onFocus f6 \*\/\}/);
  assert.ok(official('c96d752d0-CWv_7-n9.js').includes('f6(e,{scroller:e.currentTarget,pointerDownAt:se.current,tabPresses:_?.current,isPinned:o,scrollToTail:i,setPinned:a??Kit})'));
});

test('r2 (E89 spirit): the user\'s own `!` command shows in the renderer (kI → DI `ii === "bash"` → c19e90103 Dg)', () => {
  const html = render({ items: [{ id: 'sh', type: 'commandExecution', source: 'userShell', turnId: 't', command: "/bin/zsh -lc 'ls -la'", status: 'completed', aggregatedOutput: 'UNIQUE_OUT\n' }] });
  assert.match(html, /UNIQUE_OUT/);
  assert.match(html, /<div class="flex flex-col gap-sm w-full">/);
  assert.ok(official('c96d752d0-CWv_7-n9.js').includes('_("div",{className:"flex flex-col gap-sm w-full",children:[on,e]})'));
});

test('R2T-07 / gates-r2-03: sends and steers not in the transcript yet are the renderer\'s user entries and DI rows (c96d752d0 kI sliced)', () => {
  const c96 = official('c96d752d0-CWv_7-n9.js');
  // The generator slices kI (no transcript-rows EventEntryRow stand-in) and exports it with uD.
  const gen = read('src/generated/code-transcript/code-transcript.mjs');
  assert.match(gen, /kI as UserEntryRow,/);
  assert.match(gen, /uD as UserRowChromeContext,/);
  assert.doesNotMatch(gen, /EventEntryRow/);
  assert.match(gen, /"data-testid": "epitaxy-failed-send"/);
  assert.match(gen, /Yn = t\.waitingLocked === !0,/);
  assert.ok(c96.includes('$n=Xn&&Jn&&t.waitingLane==="steer"'));
  assert.ok(c96.includes('b=n.author==="user"?n.awaitingPickup===!0?{state:"steered"}:n.deliveryStatus==="sending"?{state:"sending"}:void 0:void 0'));
  // The entries: a pending send is a "sending" user entry, a refused one a failed send, a steer waits for pickup.
  const sending = pendingUserRow(pendingSend({ id: 'ls1', threadId: 'r2', text: 'go on', now: 0 }));
  const refused = pendingUserRow(failedSend(pendingSend({ id: 'ls2', threadId: 'r2', text: 'REFUSED_TEXT', now: Date.UTC(2026, 0, 1, 10, 5) })), { onRetry() {}, onDiscard() {} });
  const steer = { id: 'st1', input: [{ type: 'text', text: 'STEER_TEXT<system-reminder>hidden</system-reminder>', text_elements: [] }] };
  const local = localUserEntries([sending, refused], [steer]);
  assert.deepEqual(local.entries.map((entry) => [entry.id, entry.deliveryStatus, entry.awaitingPickup, entry.waitingLane]),
    [['ls1', 'sending', undefined, undefined], ['st1', undefined, true, 'steer']]);
  assert.deepEqual(local.entries[1].items, [{ kind: 'text', id: 'st1:text', text: 'STEER_TEXT' }]);
  assert.equal(local.failed.length, 1);
  assert.equal(local.failed[0].entry.id, 'ls2');
  // SSR: the sending prompt is the renderer's pending turn; the refused one DI's failed-send row; the steer DI's bubble.
  const items = [{ id: 'u1', type: 'userMessage', turnId: 't1', content: [{ type: 'text', text: 'first' }] }, REPLY];
  const html = render({ items, localSends: [sending, refused], steers: [steer] });
  assert.match(html, /go on/);
  assert.match(html, /data-testid="epitaxy-failed-send"/);
  assert.match(html, /REFUSED_TEXT/);
  assert.match(html, /Not delivered · /);
  assert.match(html, />Retry</);
  assert.match(html, />Discard</);
  assert.match(html, /STEER_TEXT/);
  assert.doesNotMatch(html, />hidden</);
  assert.match(html, /data-local-user-row="failed"/);
  // Idle: both waiting entries are inside the renderer (Lf's pending prompt, `data-state="pending"`).
  assert.equal((html.match(/data-cds="UserMessage" data-state="pending"/g) ?? []).length, 2);
  // Responding: the steer follows the streaming entry (bat's `rat`), so the list draws it with DI (no pending turn).
  const live = render({ items: [...items, { id: 'u2', type: 'userMessage', turnId: 't2', content: [{ type: 'text', text: 'next' }] },
    { id: 'm2', type: 'agentMessage', turnId: 't2', text: 'Working' }], responding: true, activeTurnId: 't2', steers: [steer] });
  assert.match(live, /data-local-user-row="waiting"/);
  assert.match(live, /STEER_TEXT/);
  assert.doesNotMatch(live, /data-cds="UserMessage" data-state="pending"/);
  // main.jsx hands them to the renderer and draws neither host row while it is on.
  const main = read('src/main.jsx');
  assert.match(main, /localSends=\{\(pendingSends\[current\] \|\| \[\]\)\.map\(\(entry\) => pendingUserRow\(entry,/);
  assert.match(main, /steers=\{pendingSteers\[current\] \|\| null\}/);
  assert.match(main, /current && !codeRendererOn \/\* W14-code r2 R2T-07: [^*]*\*\/ && \(pendingSends\[current\] \|\| \[\]\)\.map/);
  assert.match(main, /current && !codeRendererOn \/\* W14-code r2 gates-r2-03: [^*]*\*\/ && pendingSteers\[current\]\?\.length > 0/);
});
