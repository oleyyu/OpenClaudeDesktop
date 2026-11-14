// W14-code 第二轮 transcript-2 线（plan-w14-code.md §3）：
//   R2T-12  Code 转写的失败回合由新渲染器在 entry 内画（c96d752d0 R3 `case "turn_error"` → V2 / g6e → V1），恢复动作走
//           c227f4d5e PZ（cf74bc599 的 Xp）→ pg；宿主卡只留官方卡给不出的恢复（E93）；Status 走详情框的 muted 行。
//   R2T-TA6 多个审批排队时卡片下的「Also waiting」与折叠工具行（c96d752d0 tke / ike → iL pendingCollapsed）。
// SSR 用 vite middleware 模式；官方 chunk 只当文本读。
import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createServer } from 'vite';
import react from '@vitejs/plugin-react';
import { queuedApprovals, visibleApprovals } from '../src/approval-draft-model.mjs';

const app = path.resolve(import.meta.dirname, '..');
const snapshot = path.join(app, '../reference/snapshots/claude-3.6556.2-20261025-192807');
const official = (file) => fs.readFileSync(path.join(snapshot, 'ion-dist/assets/v1', file), 'utf8');
const read = (file) => fs.readFileSync(path.join(app, file), 'utf8');
const text = (html) => html.replace(/<[^>]+>/g, '|').replace(/\|+/g, '|');

const clientStores = new Set();
{
  const internals = React.__CLIENT_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE;
  let dispatcher;
  renderToStaticMarkup(React.createElement(function Capture() { dispatcher = internals.H; return null; }));
  const useStore = dispatcher.useSyncExternalStore;
  // A store a test fills before rendering reads its client state (zustand hands SSR its initial state otherwise).
  dispatcher.useSyncExternalStore = (subscribe, getSnapshot, getServerSnapshot) => useStore(subscribe, getSnapshot,
    clientStores.has(subscribe) ? getSnapshot : getServerSnapshot ?? getSnapshot);
}

let server, C, T, Q;
before(async () => {
  server = await createServer({ configFile: false, root: app, plugins: [react()],
    server: { middlewareMode: true, hmr: false, ws: false, watch: null }, appType: 'custom', logLevel: 'error' });
  const i18n = await server.ssrLoadModule('/electron/i18n/index.mjs');
  i18n.setLocale?.('en-US');
  C = await server.ssrLoadModule('/src/source-code-transcript.jsx');
  T = await server.ssrLoadModule('/src/source-turn-error.jsx');
  Q = await server.ssrLoadModule('/src/source-approval-queue.jsx');
  globalThis.document ??= { body: { nodeType: 1 }, head: { appendChild() {}, querySelector: () => null }, createElement: () => ({ relList: { supports: () => false }, setAttribute() {}, style: {} }),
    querySelector: () => null, querySelectorAll: () => [], addEventListener() {}, removeEventListener() {}, documentElement: { dataset: {}, getAttribute: () => null }, cookie: '' };
  globalThis.window ??= { document: globalThis.document, navigator: { userAgent: 'Mozilla/5.0 (Macintosh)' }, addEventListener() {}, removeEventListener() {},
    matchMedia: () => ({ matches: false, addEventListener() {}, removeEventListener() {} }), location: { href: 'file:///', pathname: '/', search: '' } };
});
after(() => server?.close());

const ITEMS = [{ id: 'u1', type: 'userMessage', turnId: 't1', content: [{ type: 'text', text: 'hi' }] }, { id: 'm1', type: 'agentMessage', turnId: 't1', text: 'Working' }];

test('R2T-12: the official recovery scope is sliced (c227f4d5e PZ, exported _r; cf74bc599 mounts it as Xp)', () => {
  const c227 = official('c227f4d5e-B-FYKrwT.js');
  assert.ok(c227.includes('PZ as _r'));
  assert.ok(c227.includes('{scopeStore:t,isResponding:n,isReadOnly:r,attachmentsLocked:i,onRetry:a,onCompact:o,onRetryWithFallback:s,onSwitchToAuto:c,children:l}=e'));
  assert.ok(official('cf74bc599-CRYqipWN.js').includes('_r as Xp'));
  assert.match(read('src/generated/code-transcript/c227f4d5e-B-FYKrwT.mjs'), /PZ as TurnErrorRecoveryProvider/);
  assert.match(read('scripts/extract-code-transcript.mjs'), /PZ: 'TurnErrorRecoveryProvider'/);
});

test('R2T-12: a plain failed turn is the renderer\'s turn_error card inside the reply, Try again from pg', () => {
  const errors = { t1: { message: 'upstream unavailable', codexErrorInfo: { responseStreamDisconnected: { httpStatusCode: 503 } } } };
  const turnErrors = T.rendererTurnErrors(errors);
  // The status rides in the text (c7fb5ec3d y parses "API Error (503): …" into the muted Status line); W14-code r5
  // R5T-02: and as the item's apiErrorStatus (c06cf64bb `...(Xn(r) !== void 0 && { apiErrorStatus: Xn(r) })`).
  assert.deepEqual(turnErrors, { t1: { message: 'API Error (503): upstream unavailable', status: 503 } });
  const html = render({ items: ITEMS, turnErrors, host: { recovery: { onRetry() {}, onCompact() {} } } });
  const shown = text(html.slice(html.indexOf('Working</p>')));
  // Inside the turn row, before the reply's MessageActions.
  assert.match(shown, /Claude couldn’t process that message\|Try sending your message again\.\|View details[^A-Za-z]*Try again/);
  assert.ok(html.indexOf('Try again') < html.indexOf('data-testid="message-actions"'));
  // Read-only (archived / offline): pg offers no Try again.
  assert.doesNotMatch(render({ items: ITEMS, turnErrors, host: { recovery: { readOnly: true, onRetry() {} } } }), />Try again</);
});

function render(props) {
  return renderToStaticMarkup(React.createElement(C.SourceCodeTranscript, { sessionId: 'r2t2', ...props }));
}

// W14-code r4 R4T-08d (E95 replaces E93's split): every failed turn is the renderer's turn_error item — usage limit,
// sign-in / API key / balance, a full context, an overloaded model, misalignment, a safety refusal, the session budget and
// 400 / 403 / 413 included — with pg's Try again / Compact only; the host card's own recovery is gone in Code.
test('R4T-08d: every host category is the renderer\'s turn_error card (E95); no host recovery', () => {
  const http = (status) => ({ message: 'x', codexErrorInfo: { httpConnectionFailed: { httpStatusCode: status } } });
  const all = { a: { message: 'limit', codexErrorInfo: 'usageLimitExceeded' }, b: { message: 'x', codexErrorInfo: 'unauthorized' },
    c: { message: 'x', codexErrorInfo: 'contextWindowExceeded' }, d: { message: 'x', codexErrorInfo: 'serverOverloaded' },
    e: { message: 'x', codexErrorInfo: 'misalignmentPolicyViolation' }, f: { message: 'x', codexErrorInfo: 'sessionBudgetExceeded' },
    g: { message: 'x', codexErrorInfo: 'cyberPolicy' }, h: { message: 'x', additionalDetails: 'QUOTA' },
    i: { message: 'x', codexErrorInfo: 'badRequest' }, j: http(403), k: http(413), l: { message: 'boom' } };
  assert.deepEqual(Object.keys(T.rendererTurnErrors(all)), Object.keys(all));
  assert.equal(T.RENDERER_TURN_ERROR_CATEGORIES, undefined, 'the E93 category table is gone');
  const turnErrors = T.rendererTurnErrors({ t1: { message: 'Usage limit reached', codexErrorInfo: 'usageLimitExceeded' } });
  const html = render({ items: ITEMS, turnErrors, host: { recovery: { onRetry() {}, onCompact() {} } } });
  const shown = text(html.slice(html.indexOf('Working</p>')));
  assert.match(shown, /Claude couldn’t process that message\|/);
  assert.doesNotMatch(html, />View usage<|>Sign in|>Open settings<|>Switch model<|>Rewind<|>Review findings<|Auto-continue when limits reset/);
  // main.jsx: the renderer gets them, the host card skips the turns it draws, the recovery scope is the host's.
  const main = read('src/main.jsx');
  assert.match(main, /const codeTurnErrors = codeRendererOn \? rendererTurnErrors\(state\.turnErrors\?\.\[current\]\) : null;/);
  assert.match(main, /turnErrors=\{codeTurnErrors/);
  assert.match(main, /if \(codeRendererOn && codeTranscriptRendererOn\(current\) && codeTurnErrors\?\.\[item\.turnId\]\) return null;/);
  assert.match(main, /recovery: \{ readOnly: !!session\?\.archived \|\| !boot\?\.connected,/);
});

test('R2T-12: the host card\'s status is the details box\'s muted Status line, not a fact row (cb1a6e506 k)', () => {
  const src = read('src/source-turn-error.jsx');
  assert.doesNotMatch(src, /detailsFacts=/);
  assert.equal(T.turnErrorText({ message: 'boom', codexErrorInfo: { httpConnectionFailed: { httpStatusCode: 502 } } }), 'API Error (502): boom');
  assert.equal(T.turnErrorText({ message: 'API Error (500): x', codexErrorInfo: { httpConnectionFailed: { httpStatusCode: 500 } } }), 'API Error (500): x');
  assert.equal(T.turnErrorText({ message: 'plain' }), 'plain');
  // The parser the details box runs (c7fb5ec3d `c`): "API Error (NNN)" → status.
  assert.ok(official('c7fb5ec3d-B51eEW6X.js').includes('API Error(?:\\s*\\((\\d{3})\\)'));
});

test('R2T-TA6: the requests behind the shown card are "Also waiting" collapsed tool rows (c96d752d0 tke / ike)', () => {
  const c96 = official('c96d752d0-CWv_7-n9.js');
  assert.ok(c96.includes('className:"text-footnote text-muted-as-secondary",children:f(Q,{defaultMessage:"Also waiting",id:"/b65yhE6Ld"})'));
  assert.ok(c96.includes('function ike(e){return f(iL,{tool:e,pendingCollapsed:!0},e.id)}'));
  const req = (id) => ({ id, method: 'item/commandExecution/requestApproval', bridgeApproval: { instanceId: id, connectionId: 'c' }, params: { threadId: 't', itemId: id } });
  const requests = [req('a'), req('b'), req('c')];
  const shown = visibleApprovals(requests).map((r) => r.id);
  assert.deepEqual(queuedApprovals(requests).map((r) => r.id), requests.map((r) => r.id).filter((id) => !shown.includes(id) && id !== shown[0]));
  const tool = Q.approvalQueueTool({ id: 'c1', type: 'commandExecution', command: 'npm test', status: 'inProgress' });
  assert.deepEqual(tool, { status: 'awaiting_approval', id: 'c1', name: 'Bash', input: { command: 'npm test' } });
  const html = renderToStaticMarkup(React.createElement(Q.SourceApprovalQueue, { tools: [tool] }));
  assert.match(html, /^<div class="flex flex-col gap-\[var\(--chat-item-gap\)\]" data-approval-queue=""><div class="text-footnote text-muted-as-secondary">Also waiting<\/div>/);
  assert.match(text(html), /Needs approval/);
  assert.equal(renderToStaticMarkup(React.createElement(Q.SourceApprovalQueue, { tools: [] })), '');
  assert.match(read('src/main.jsx'), /renderQueued=\{mode === "code" \? \(queued\) => <SourceApprovalQueue/);
});

// ---- 复核修复（review fixes）
test('R2T-11: a turn\'s settled background tasks are the reply\'s task_event card (R3 → J4e → fX), the click the host\'s pane', async () => {
  const E = await server.ssrLoadModule('/src/code-transcript-entries.mjs');
  const events = new Map([['t1', [{ taskKey: 'bash:9', taskType: 'local_bash', status: 'failed', description: 'npm test', durationMs: 4000 }]]]);
  const entries = E.codeTranscriptEntries(ITEMS, { taskEvents: events });
  assert.deepEqual(entries.at(-1).items.at(-1), { kind: 'task_event', id: 't1:task-event:bash:9', taskId: 'bash:9', taskType: 'local_bash', status: 'failed',
    description: 'npm test', durationMs: 4000 });
  // Unknown fields are left out (sXe: `t.durationMs !== void 0` → "took …").
  assert.deepEqual(E.taskEventItems('t1', new Map([['t1', [{ taskKey: 'k', status: 'completed', description: null, durationMs: null }]]])),
    [{ kind: 'task_event', id: 't1:task-event:k', taskId: 'k', status: 'completed' }]);
  const plain = render({ items: ITEMS, taskEvents: events });
  const shown = text(plain.slice(plain.indexOf('Working</p>')));
  assert.match(shown, /Background command failed/);
  assert.match(plain, /text-danger/);
  // No pane opener: dX's plain div; with the host's opener: dX's button (c0fbbe82d mi = data-transcript-keeps-pin).
  assert.doesNotMatch(plain, /<button[^>]*data-transcript-keeps-pin/);
  const linked = render({ items: ITEMS, taskEvents: events, host: { openTask() {} } });
  assert.match(linked, /<button type="button" data-transcript-keeps-pin=""[^>]*class="group\/tool flex flex-col gap-1 py-0 max-w-full items-start text-start/);
  // The original fX / dX, not the transcript rows' empty adapter; Kg is the host's opener (c227f4d5e mQ).
  const gen = read('src/generated/code-transcript/code-transcript.mjs');
  assert.match(gen, /useOpenTaskInPane as Kg,/);
  assert.doesNotMatch(gen, /TaskEventChips as fX/);
  assert.ok(official('c96d752d0-CWv_7-n9.js').includes('defaultMessage:"Background {noun} {status}",id:"m3qXDI92OE"'));
  const main = read('src/main.jsx');
  assert.match(main, /taskEvents=\{taskEventsByTurn\}/);
  assert.match(main, /\{!\(codeRendererOn && codeTranscriptRendererOn\(current\)\) \/\* W14-code r2 R2T-11/);
});

test('R2T-TS7: set_session_title answers with the rename record (c52b02f3f Dt) and the Code renderer draws bc under it', async () => {
  const { tools } = await import('../electron/agent-tools/sessions.mjs');
  const tool = tools.find((one) => one.name === 'set_session_title');
  const renamed = [];
  const ctx = { sessionId: 's1', sessions: { list: () => [], get: (id) => (id === 's1' ? { id: 's1', title: 'Old name' } : null), rename: async (title) => { renamed.push(title); } } };
  assert.deepEqual(await tool.handler({ title: ' New  name ' }, ctx), { content: [{ type: 'text', text: 'Session renamed to “New name”.' }],
    _meta: { ccdSessionRenamed: { sessionId: 's1', isSelf: true, title: 'New name', previousTitle: 'Old name' } } });
  assert.deepEqual(renamed, ['New name']);
  // Same title before and after: no previousTitle (Mt then leaves the From row and Undo out).
  const same = await tool.handler({ title: 'Old name' }, ctx);
  assert.deepEqual(same._meta.ccdSessionRenamed, { sessionId: 's1', isSelf: true, title: 'Old name' });
  const c52 = official('c52b02f3f-BejopSz8.js');
  assert.ok(c52.includes('var Dt="ccdSessionRenamed"') && c52.includes('let t=e.resultMcpMeta?._meta?.[Dt]'));
  // The Code renderer's entries carry it as resultMcpMeta; the legacy rows' SDK tools do not (bc stays Code-only).
  const E = await server.ssrLoadModule('/src/code-transcript-entries.mjs');
  const S = await server.ssrLoadModule('/src/transcript-sdk-tools.mjs');
  const item = { id: 'r1', type: 'mcpToolCall', turnId: 't1', server: 'code_desktop', tool: 'set_session_title', status: 'completed', arguments: { title: 'New name' },
    result: { content: [{ type: 'text', text: 'Session renamed to “New name”.' }], _meta: { ccdSessionRenamed: { sessionId: 'r2t2', isSelf: true, title: 'New name', previousTitle: 'Old name' } } } };
  const items = [ITEMS[0], item];
  const call = E.codeTranscriptEntries(items).at(-1).items[0].tools[0];
  assert.equal(call.name, 'mcp__ccd_session_mgmt__set_session_title');
  assert.deepEqual(call.resultMcpMeta, { _meta: item.result._meta });
  assert.equal(S.sdkTools(item)[0].resultMcpMeta, undefined);
  // Drawn under the tool row (verbose view: the step's body open): From / To and, while the session's title is the new
  // one, "Undo rename" (bc `x === "available"`), which runs the host's rename with the previous title.
  const og = (await server.ssrLoadModule('/src/generated/transcript-rows/rows-shared-8-Db1QN4mf.mjs')).og;
  og.setState({ sessions: [{ sessionId: 'r2t2', title: 'New name' }] });
  clientStores.add(og.subscribe);
  try {
    const html = render({ items, host: { transcriptView: 'verbose', renameSession() {} } });
    assert.match(text(html), /\|From\|Old name\|To\|New name\|Undo rename\|/);
    assert.match(html, /class="min-w-0 break-words text-primary">New name</);
    og.setState({ sessions: [{ sessionId: 'r2t2', title: 'Old name' }] });
    const undone = render({ items, host: { transcriptView: 'verbose', renameSession() {} } });
    assert.match(text(undone), /Restored to Old name/);
    assert.match(undone, /line-through decoration-1">New name</);
  } finally { clientStores.delete(og.subscribe); og.setState({ sessions: [] }); }
  // bc is the original (sliced in transcript-rows, linked here), its rename the host's.
  const rows = read('src/generated/transcript-rows/turn-mark.mjs');
  assert.match(rows, /useSessionRenameMutation as ai,/);
  assert.match(rows, /defaultMessage: "Undo rename",\s+id: "1ie4Id\+tTB"/);
  assert.doesNotMatch(rows, /SessionRenameBody/);
  const main = read('src/main.jsx');
  assert.match(main, /renameSession: \(id, title\) => renameSession\(id, title\),/);
});

test('gates-r2-06: in Code the agent detail view draws the sub-agent\'s rows with the transcript renderer (cccc2cf0a PP, smartQuotes)', () => {
  const cccc = official('cccc2cf0a-' + fs.readdirSync(path.join(snapshot, 'ion-dist/assets/v1')).find((f) => f.startsWith('cccc2cf0a-')).slice(10));
  assert.ok(cccc.includes('isStreaming:!1,isOwnedSession:!1,font:x,smartQuotes:S'));
  // The renderer's reply prose takes typographic quotes (2215170874, Uon always), as PP does for a sub-agent's entries.
  const rows = [{ id: 'p', type: 'userMessage', content: [{ type: 'text', text: 'look' }] }, { id: 'r', type: 'agentMessage', text: 'It said "done" and it\'s fine' }];
  const html = render({ sessionId: 'child-1', items: rows, ownedSession: false, host: {} });
  assert.match(text(html), /It said “done” and it’s fine/);
  const agent = read('src/source-agent.jsx');
  assert.match(agent, /\{renderRows \? renderRows\(\[/);
  assert.match(agent, /renderItem=\{renderItem\} renderRows=\{renderRows\}/);
  const main = read('src/main.jsx');
  assert.match(main, /renderRows=\{mode === "code" && current && codeTranscriptRendererOn\(current\) \? \(childRows, childId\) => \{/);
  assert.match(main, /<SourceCodeTranscript sessionId=\{childId\} items=\{childRows\} ownedSession=\{false\}/);
  assert.match(read('src/source-code-transcript.jsx'), /isOwnedSession: ownedSession,/);
});

test('R2T-TS8: a SendUserFile call is the sent files\' block (c96d752d0 W1 → cb6930dae Xu): the caption, a tile per file', async () => {
  const E = await server.ssrLoadModule('/src/code-transcript-entries.mjs');
  const item = { id: 's1', type: 'mcpToolCall', turnId: 't1', server: 'code_desktop', tool: 'SendUserFile', status: 'completed',
    arguments: { files: ['out/report.md'], caption: 'The review' },
    result: { content: [{ type: 'text', text: 'Sent 1 file to the user: report.md.' }],
      structuredContent: { deliverables: [{ path: '/w/out/report.md', description: 'The review', size: 2048 }, { path: '/w/nosize.txt' }] } } };
  const items = [ITEMS[0], item];
  const call = E.codeTranscriptEntries(items).at(-1).items[0].tools[0];
  // c289d7154 D: {path, size (number), isImage (boolean)}; a file of unknown size is left out.
  assert.deepEqual(call.toolUseResult, { attachments: [{ path: '/w/out/report.md', size: 2048, isImage: false }] });
  const html = render({ items, host: { cwd: '/w', openFilePath() {} } });
  const shown = text(html.slice(html.indexOf('data-transcript-item-id="s1"')));
  assert.match(shown, /\|The review\|md\|report\.md\|(?:report\|\.md\|)?2kB\|/);
  // The session's files are readable (c5259f582 sessionFileReadable): the tile opens it, not the dimmed div.
  assert.doesNotMatch(html, /opacity-70" title="report\.md"/);
  assert.match(render({ items, host: { cwd: '/w' } }), /opacity-70" title="report\.md"/);
  const gen = read('src/generated/code-transcript/code-transcript.mjs');
  assert.match(gen, /\n  Xu as ay,/);
  assert.ok(official('cb6930dae-Dw_4c1QI.js').includes('"As Claude sent it"'));
  const files = read('electron/agent-tools/files.mjs');
  assert.match(files, /\.\.\.\(Number\.isFinite\(size\) \? \{ size \} : \{\}\)/);
});
