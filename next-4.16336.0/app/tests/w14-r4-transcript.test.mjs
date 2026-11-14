// W14-code 第四轮 transcript 线（plan-w14-code.md §5，E94 回退先修，E95 需用户定的 UI 一律照官方）：
//   R4T-REG-01  无回合的 hook notice 按到达位置放（state.js 记 active / 最后回合；会话开始前的放首个 entry 之前），
//               运行中回合的回复仍是 provisional（c06cf64bb M("assistant", …) 按到达顺序、接上一条 assistant）
//   R4T-02      Code 问题卡 / 异步提问卡题面走 cb8c5a88f ii 富文本（c2f6611a3 Nn）
//   R4T-03      审查模式不再是宿主行：exitedReviewMode 的正文是回合回复的 text item，enteredReviewMode 不画
//   R4T-08a     带页面选中元素的用户消息是用户 entry（元素标记剥掉，元素截图不画；门控 448605362 不在 Uon）
//   R4T-08e     Codex plan = ExitPlanMode 工具（"Proposed plan"，stands-alone）
//   R4T-08f     Code 下一律写 attach 标记；宿主回退行与 ArrowUp 回填先去掉标记行（c4d199b75 Xe）
//   R4T-08g     带 kind 的 workflow 通知无 item；录制演示是普通用户消息；带计数的压缩 = compacted，失败的不画
//   R4T-08c     本地 /status = 用户 entry "/status" + assistant `{kind: "status"}`（rendererDrawsRow 为真）
//   R4T-08b     officialWorkflow 选项：workflow run = Workflow 工具（默认关，行为不变）
//   fr4-16      state.js 删 isChildThread / childThreadIds
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
import { codeTranscriptEntries, rendererDrawsRow, userEntryId, userEntryItems, workflowNotificationEvent } from '../src/code-transcript-entries.mjs';
import { codexPlanTool, workflowRunTool } from '../src/transcript-sdk-tools.mjs';
import { emptyState, reduce } from '../src/state.js';
import * as State from '../src/state.js';
import { markReady, snippetText } from '../src/composer-attachments-model.mjs';
import { makeSelectedElementAttachment, selectedElementInputs } from '../src/preview-element-attachments.mjs';

const app = path.resolve(import.meta.dirname, '..');
const snapshot = path.join(app, '../reference/snapshots/claude-3.6556.2-20261025-192807');
const assets = path.join(snapshot, 'ion-dist/assets/v1');
const official = (prefix) => fs.readFileSync(path.join(assets, fs.readdirSync(assets).find((file) => file.startsWith(prefix) && file.endsWith('.js'))), 'utf8');
const read = (file) => fs.readFileSync(path.join(app, file), 'utf8');
const text = (html) => html.replace(/<[^>]+>/g, '|').replace(/\|+/g, '|');

{
  const internals = React.__CLIENT_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE;
  let dispatcher;
  renderToStaticMarkup(React.createElement(function Capture() { dispatcher = internals.H; return null; }));
  const useStore = dispatcher.useSyncExternalStore;
  dispatcher.useSyncExternalStore = (subscribe, getSnapshot, getServerSnapshot) => useStore(subscribe, getSnapshot, getServerSnapshot ?? getSnapshot);
}

let server, C, I18N, Rich, Attach;
before(async () => {
  server = await createServer({ configFile: false, root: app, plugins: [react()],
    server: { middlewareMode: true, hmr: false, ws: false, watch: null }, appType: 'custom', logLevel: 'error' });
  I18N = await server.ssrLoadModule('/electron/i18n/index.mjs');
  I18N.setLocale?.('en-US');
  C = await server.ssrLoadModule('/src/source-code-transcript.jsx');
  Rich = await server.ssrLoadModule('/src/generated/code-transcript/cb8c5a88f-h6ooJ7Al.mjs');
  Attach = await server.ssrLoadModule('/src/generated/code-transcript/c4d199b75-D3cQB-UP.mjs');
  globalThis.document ??= { body: { nodeType: 1 }, head: { appendChild() {}, querySelector: () => null }, createElement: () => ({ relList: { supports: () => false }, setAttribute() {}, style: {} }),
    querySelector: () => null, querySelectorAll: () => [], addEventListener() {}, removeEventListener() {}, documentElement: { dataset: {}, getAttribute: () => null }, cookie: '' };
  globalThis.window ??= { document: globalThis.document, navigator: { userAgent: 'Mozilla/5.0 (Macintosh)' }, addEventListener() {}, removeEventListener() {},
    matchMedia: () => ({ matches: false, addEventListener() {}, removeEventListener() {} }), location: { href: 'file:///', pathname: '/', search: '' } };
});
after(() => server?.close());

const render = (props) => renderToStaticMarkup(React.createElement(C.SourceCodeTranscript, { sessionId: 'r4t', ...props }));
const USER = { id: 'u1', type: 'userMessage', turnId: 't1', content: [{ type: 'text', text: 'hi' }] };
const REPLY = { id: 'm1', type: 'agentMessage', turnId: 't1', text: 'Done here' };
const USER2 = { id: 'u2', type: 'userMessage', turnId: 't2', content: [{ type: 'text', text: 'next' }] };
const LIVE = { id: 'm2', type: 'agentMessage', turnId: 't2', text: 'Working on' };
const event = (method, params) => ({ event: { method, params } });
const notice = (id, turnId, message = 'hook said no') => ({ id: `hook-notice:${id}`, turnId, message, level: 'warning' });

test('R4T-REG-01: state.js — a hook run without a turn belongs to the running turn, else the last turn, else none (c06cf64bb arrival order)', () => {
  const run = (id) => ({ id, eventName: 'sessionStart', status: 'failed', statusMessage: 'boom' });
  // Before any turn: null (the transcript puts it ahead of the first entry).
  let s = reduce(emptyState, event('hook/completed', { threadId: 'a', run: run('h0') }));
  assert.equal(s.hookRuns.a.h0.turnId, null);
  // A running turn: that turn.
  s = reduce(s, event('turn/started', { threadId: 'a', turn: { id: 't1', status: 'inProgress', items: [] } }));
  s = reduce(s, event('hook/completed', { threadId: 'a', run: run('h1') }));
  assert.equal(s.hookRuns.a.h1.turnId, s.active.a ?? 't1');
  // Idle after a turn: the session's last turn (from its items).
  const idle = { ...s, active: { ...s.active, a: null }, items: { ...s.items, a: [{ id: 'u1', type: 'userMessage', turnId: 't1', content: [] }] } };
  assert.equal(reduce(idle, event('hook/completed', { threadId: 'a', run: run('h2') })).hookRuns.a.h2.turnId, 't1');
  // A turn the core names wins; hook/completed keeps the turn hook/started recorded.
  assert.equal(reduce(idle, event('hook/completed', { threadId: 'a', turnId: 't9', run: run('h3') })).hookRuns.a.h3.turnId, 't9');
  const started = reduce(s, event('hook/started', { threadId: 'a', turnId: 't1', run: { ...run('h4'), status: 'running' } }));
  assert.equal(reduce({ ...started, active: { ...started.active, a: null } }, event('hook/completed', { threadId: 'a', run: run('h4') })).hookRuns.a.h4.turnId, 't1');
});

test('R4T-REG-01: entries — the running reply keeps provisionalMessageId; a notice is placed where it arrived, never below the latest turn', () => {
  assert.ok(official('c06cf64bb-').includes('kind:"hook_notice",id:g,notices:[{id:g,message:a,level:o==="warning"?"warning":"notice"}]'));
  // Before the fix: a turnless notice was its own entry after everything, and the running reply lost provisional.
  const leading = codeTranscriptEntries([USER, REPLY, USER2, LIVE], { responding: true, activeTurnId: 't2', hookNotices: [notice('h0', null)] });
  assert.deepEqual(leading.map((e) => `${e.author}:${e.id}`), ['assistant:hook-notice:h0:entry', `user:${userEntryId('u1')}`, 'assistant:m1:reply', `user:${userEntryId('u2')}`, 'assistant:m2:reply']);
  assert.equal(leading.at(-1).provisionalMessageId, 'm2:reply');
  // A notice of the running turn joins its reply (flushError) and the reply stays the stream.
  const own = codeTranscriptEntries([USER, REPLY, USER2, LIVE], { responding: true, activeTurnId: 't2', hookNotices: [notice('h1', 't2')] });
  assert.deepEqual(own.at(-1).items.map((i) => i.kind), ['text', 'hook_notice']);
  assert.equal(own.at(-1).provisionalMessageId, 'm2:reply');
  // A notice of a turn that shows no rows joins the last assistant entry (M() merges into it) and steals no stream.
  const other = codeTranscriptEntries([USER, REPLY, USER2, LIVE], { responding: true, activeTurnId: 't2', hookNotices: [notice('h2', 'tX')] });
  assert.equal(other.length, 4);
  assert.deepEqual(other.at(-1).items.map((i) => i.kind), ['text', 'hook_notice']);
  assert.equal(other.at(-1).provisionalMessageId, 'm2:reply');
  // A user entry last: the notice is its own assistant entry; the running turn has no reply yet, nothing is provisional.
  const afterUser = codeTranscriptEntries([USER, REPLY, USER2], { responding: true, activeTurnId: 't2', hookNotices: [notice('h3', 'tX')] });
  assert.deepEqual(afterUser.map((e) => e.author), ['user', 'assistant', 'user', 'assistant']);
  assert.equal(afterUser.at(-1).turnId, 'tX');
  assert.equal(afterUser.some((e) => e.provisionalMessageId !== undefined), false);
});

test('R4T-02: the En question title is cb8c5a88f ii rich text (c2f6611a3 Nn → T(…, !0))', () => {
  const c2f = official('c2f6611a3-');
  assert.ok(c2f.includes('function Nn(e,t,n){return T(e,t,n!==void 0&&n||void 0,void 0,void 0,void 0,void 0,!0)}'));
  assert.match(read('src/source-question-card.jsx'), /<div className=\{EN_TITLE\}>\{questionRichText\(title, page, undefined, undefined, undefined, undefined, undefined, true\)\}<\/div>/);
  assert.match(read('src/source-async-questions.jsx'), /\{questionRichText\(questionDisplayText\(question\.title\), at, undefined, undefined, undefined, undefined, undefined, true\)\}/);
  // Before: plain text. ii draws the question's links (bare URLs and Markdown links) as the transcript does.
  const html = renderToStaticMarkup(React.createElement('div', null, Rich.ii('Use [the guide](https://example.com/guide) or https://example.com/faq?', 0, undefined, undefined, undefined, undefined, undefined, true)));
  assert.match(html, /<a[^>]*href="https:\/\/example\.com\/guide"[^>]*>[^]*the guide/);
  assert.match(html, /<a[^>]*href="https:\/\/example\.com\/faq"/);
});

test('R4T-03: review mode is no host row; the review is the reply\'s text (c06cf64bb has no review item)', () => {
  const entered = { id: 'rv0', type: 'enteredReviewMode', turnId: 't1', review: 'current changes' };
  const exited = { id: 'rv1', type: 'exitedReviewMode', turnId: 't1', review: '- [P1] Bug — /w/a.js:3' };
  assert.equal(rendererDrawsRow(entered), true);
  assert.equal(rendererDrawsRow(exited), true);
  const entries = codeTranscriptEntries([USER, entered, REPLY, exited]);
  // One reply, not cut in two by host rows.
  assert.deepEqual(entries.map((e) => `${e.author}:${e.id}`), [`user:${userEntryId('u1')}`, 'assistant:m1:reply']);
  assert.deepEqual(entries[1].items, [{ kind: 'text', id: 'm1', text: 'Done here' }, { kind: 'text', id: 'rv1', text: '- [P1] Bug — /w/a.js:3' }]);
  const session = read('src/source-session.jsx');
  assert.doesNotMatch(session, /t\("Review started"\)|t\("Review result"\)/);
  assert.match(session, /item\.type === "exitedReviewMode" && typeof item\.review === "string" && item\.review\.trim\(\)/);
});

test('R4T-08a: a message with selected page elements is a user entry (markup out, element screenshot out; 448605362 not in Uon)', () => {
  assert.ok(official('c96d752d0-').includes('e.kind==="elementContext"&&(w||e.view.simulator!==void 0||e.view.overflow!==void 0&&C)'));
  // The preview's own send (preview-element-attachments selectedElementInputs: the screenshot, then the context text).
  const entry = makeSelectedElementAttachment({ tagName: 'button', id: 'save', classes: [], attributes: {}, computedStyles: {}, boundingBox: { x: 0, y: 0, width: 10, height: 10 },
    screenshot: 'cG5n', innerText: 'Save', parentPath: 'main > button', outerHTML: '<button id="save">Save</button>' }, { id: 'el' });
  const sent = selectedElementInputs(markReady([entry], 'el', { path: '/tmp/element.png' }));
  const msg = { id: 'e1', type: 'userMessage', turnId: 't1', content: [...sent, { type: 'text', text: 'Make this bigger' }, { type: 'localImage', path: '/tmp/mine.png' }] };
  assert.equal(rendererDrawsRow(msg), true);
  const items = userEntryItems(msg);
  // The element's screenshot is left out; the user's own image stays; the text has no element markup.
  assert.deepEqual(items.map((item) => item.kind === 'pathImage' ? item.path : item.kind), ['/tmp/mine.png', 'text']);
  assert.equal(items.at(-1).text, 'Make this bigger');
  assert.equal(codeTranscriptEntries([msg])[0].author, 'user');
  assert.doesNotMatch(read('src/code-transcript-entries.mjs'), /hostUserMessage/);
});

test('R4T-08e: a Codex plan is an ExitPlanMode call (c96d752d0 exit_plan_mode stands-alone; the row reads input.plan)', () => {
  assert.ok(official('c96d752d0-').includes('exit_plan_mode:{rollUp:"stands-alone"}'));
  assert.deepEqual(codexPlanTool({ id: 'p', type: 'plan', text: '1. Go' }).map(({ hostItem, ...tool }) => tool),
    [{ status: 'completed', isError: false, id: 'p', name: 'ExitPlanMode', input: { plan: '1. Go' } }]);
  assert.equal(codexPlanTool({ id: 'p', type: 'plan', text: '  ' }), null);
  const entries = codeTranscriptEntries([USER, { id: 'p', type: 'plan', turnId: 't1', text: '1. Go' }, REPLY]);
  assert.deepEqual(entries.map((e) => `${e.author}:${e.id}`), [`user:${userEntryId('u1')}`, 'assistant:p:reply']);
  assert.deepEqual(entries[1].items.map((i) => i.kind), ['tools', 'text']);
  assert.match(text(render({ items: [USER, { id: 'p', type: 'plan', turnId: 't1', text: '1. Go' }, REPLY] })), /Proposed plan/);
});

test('R4T-08f: Code sends always carry the attach markers; the host recall / fallback row read them through c4d199b75 Xe', () => {
  const main = read('src/main.jsx');
  assert.match(main, /snippetText\(attachments, \{ attachMarkers: mode === "code" \/\*/);
  assert.match(main, /humanPrompts\(shownUserItems\(items\)\)\.map\(\(text\) => \(text\.includes\("<!-- attach"\) \? withoutAttachMarkers\(text\) : text\)\)/);
  assert.match(read('src/source-session.jsx'), /const rawText = joinedText\.includes\("<!-- attach"\) \? withoutAttachMarkers\(joinedText\) : joinedText;/);
  const sent = snippetText([{ kind: 'snippet', text: 'line one', label: 'a.js' }], { attachMarkers: true }) + 'why?';
  assert.equal(sent, '<!-- attach: a.js -->\n> line one\n\nwhy?');
  assert.equal(Attach.Xe(sent), '> line one\n\nwhy?');
  // The renderer's own parse (c4d199b75 B through V) still turns it into the snippet tile and the rest.
  assert.deepEqual(Attach.V(sent), { snippets: [{ text: 'line one', label: 'a.js', terminalTabId: undefined }], rest: 'why?' });
});

test('R4T-08g: workflow notices with a kind, demonstrations and counted / failed compactions follow the desktop', () => {
  const kinded = (kind, status) => ({ id: `n-${kind}`, type: 'userMessage', turnId: 't2', content: [{ type: 'text',
    text: `<system-reminder>\n[SYSTEM NOTIFICATION - NOT USER INPUT]\n<task-notification>\n<kind>${kind}</kind>\n<status>${status}</status>\n<task-id>wf-1</task-id>\n<workflow>audit</workflow>\n</task-notification>\n</system-reminder>` }] });
  for (const [kind, status] of [['escalation', 'question'], ['stall', 'stalled'], ['settings', 'changed']]) {
    const row = kinded(kind, status);
    assert.deepEqual(workflowNotificationEvent(row), { none: true }, kind);
    assert.equal(rendererDrawsRow(row), true, kind);
    assert.deepEqual(codeTranscriptEntries([USER, REPLY, row]).map((e) => e.id), [userEntryId('u1'), 'm1:reply'], kind);
  }
  // c96d752d0 RI words only running / completed / failed / stopped.
  const c96 = official('c96d752d0-');
  assert.ok(c96.includes('case"running":return e.formatMessage({defaultMessage:"started",id:"vDeb4m8eLy"})'));
  // A demonstration is a user entry the renderer draws; W14-code r5 R5T-REG-02 (corrects R4T-08g): its one item is the
  // desktop's watchRecord (c96d752d0 DI `ii === "watchRecord"` → JF "Recorded demonstration").
  const demo = { id: 'd1', type: 'userMessage', turnId: 't3', content: [{ type: 'text', text: '<watch-record-demonstration durationMs="1200" steps="1">\n[0.5s] click\n</watch-record-demonstration>' }] };
  assert.equal(rendererDrawsRow(demo), true);
  assert.equal(codeTranscriptEntries([demo])[0].author, 'user');
  assert.equal(codeTranscriptEntries([demo])[0].items[0].kind, 'watchRecord');
  // Counted compaction: the desktop's compacted marker; failed: nothing.
  const counted = { id: 'cc', type: 'contextCompaction', turnId: 't1', status: 'completed', codeDesktop: { shadowedItems: 4, shadowedTokens: 9000, summary: 'x' } };
  assert.deepEqual(codeTranscriptEntries([USER, counted]).at(-1).items, [{ kind: 'compacted', id: 'cc' }]);
  assert.deepEqual(codeTranscriptEntries([USER, { ...counted, status: 'failed' }]).map((e) => e.author), ['user']);
});

test('R4T-08c: the local /status row is the desktop\'s "/status" user entry and status item (c06cf64bb <session-status/>)', () => {
  assert.ok(official('c06cf64bb-').includes('[{kind:"status",id:`${t}-status`}]'));
  const row = { id: 's1', after: 'm1', localCommand: true, model: 'x' };
  assert.equal(rendererDrawsRow(row), true);
  const entries = codeTranscriptEntries([USER, REPLY, row]);
  assert.deepEqual(entries.map((e) => `${e.author}:${e.id}`), [`user:${userEntryId('u1')}`, 'assistant:m1:reply', 'user:s1:command', 'assistant:s1']);
  assert.deepEqual(entries[2].items, [{ kind: 'text', id: 's1:command:text', text: '/status' }]);
  assert.deepEqual(entries[3].items, [{ kind: 'status', id: 's1-status' }]);
  // The renderer draws it (R3 → "code.status" → V4e → WG); WG's data adapter is the turn-cards lane's.
  // Before: the host's inline SessionStatusDialog under a source-user-bubble (main.jsx, reached only when this is false).
  assert.match(text(render({ items: [USER, REPLY, row] })), /You said: \/status\|[^]*Session info\|[^]*Session ID\|r4t\|/);
  // With main.jsx's callbacks: the row is not a host row, and nothing of the host's is drawn after it (no rows), so the
  // host's inline SessionStatusDialog branch is not reached.
  assert.deepEqual(entries.slice(2).map((e) => e.rows), [[], []]);
  const html = render({ items: [USER, REPLY, row], hostRow: (one) => !rendererDrawsRow(one), renderHostRow: (one) => React.createElement('div', { 'data-host-row': one.id }),
    renderAfter: (one) => React.createElement('span', { 'data-after': one.id }) });
  assert.doesNotMatch(html, /data-(?:host-row|after)="s1"/);
});

test('R4T-08b: officialWorkflow — a workflow run is the Workflow call (off by default: the host row, unchanged)', () => {
  const wf = { id: 'w1', turnId: 't1', workflowRun: { id: 'run-1', name: 'audit', status: 'running' } };
  assert.equal(rendererDrawsRow(wf), false);
  assert.equal(rendererDrawsRow(wf, { officialWorkflow: true }), true);
  assert.deepEqual(codeTranscriptEntries([USER, wf, REPLY]).map((e) => `${e.author}:${e.id}`), [`user:${userEntryId('u1')}`, 'host:w1', 'assistant:m1:reply']);
  const on = codeTranscriptEntries([USER, wf, REPLY], { officialWorkflow: true });
  assert.deepEqual(on.map((e) => `${e.author}:${e.id}`), [`user:${userEntryId('u1')}`, 'assistant:w1:reply']);
  const call = on[1].items[0].tools[0];
  assert.deepEqual({ id: call.id, name: call.name, status: call.status, input: call.input }, { id: 'w1', name: 'Workflow', status: 'completed', input: { name: 'audit' } });
  assert.equal(call.hostItem, wf);
  assert.equal(Object.keys(call).includes('hostItem'), false);
  assert.equal(workflowRunTool({ id: 'x' }), null);
  // c96d752d0 P$ / F$: the Workflow call's row (the background task by tool id).
  assert.ok(official('c96d752d0-').includes('e.name==="Workflow"&&e.status!=="awaiting_approval"&&e.status!=="error"'));
});

test('fr4-16: state.js no longer exports the test-only isChildThread / childThreadIds', () => {
  assert.equal('isChildThread' in State, false);
  assert.equal('childThreadIds' in State, false);
});
