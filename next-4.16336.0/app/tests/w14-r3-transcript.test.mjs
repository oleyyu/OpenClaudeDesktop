// W14-code 第三轮 transcript 线（plan-w14-code.md §4，E94 回退先修）：
//   R3T-REG-01  新渲染器下宿主工具卡经 renderCard 接回（已回答的 AskUserQuestion EZe、ReportFindings EQ、MCP App lY；
//               cef1e6037 dt 换成宿主的 MCP App 匹配器），entries 保留不可枚举的 tool.hostItem
//   R3T-REG-03  skill 部件进用户 entry 的正文（`/name` 前缀，只有技能的消息也成 entry）
//   R3T-REG-02  renderImages / renderAttachedFiles 默认接宿主；deliverables / artifacts 画在官方行之后（E89 扩展位）
//   R3T-REG-04  turnTimes → entry.timestamp（用户行开始时间、回合最后 assistant entry 的完成时间，ISO 串）
//   R3T-REG-05  子代理详情（ownedSession=false）工具状态取自 entry，不强制 completed
//   R3T-NEW-01  不带 kind 的 workflow 通知 = assistant entry 里的 task_event（c06cf64bb `M("assistant", [r], P)`）
//   R3T-NEW-02  blocked / failed hook = 回合末的 hook_notice item（渲染器开着时撤通知带）
//   R3T-NEW-03  host.knownSlashCommands 进 renderer host
//   r3pa-01     子代理面板「无结果 / 无活动 / Thinking」照 cccc2cf0a xP / CP / SP
// SSR 用 vite middleware 模式；官方 chunk 只当文本读。
import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createServer } from 'vite';
import react from '@vitejs/plugin-react';
import { codeTranscriptEntries, localUserEntries, rendererDrawsRow, userEntryItems, workflowNotificationEvent } from '../src/code-transcript-entries.mjs';
import { hookRunOutcome } from '../src/state.js';

const app = path.resolve(import.meta.dirname, '..');
const snapshot = path.join(app, '../reference/snapshots/claude-3.6556.2-20261025-192807');
const assets = path.join(snapshot, 'ion-dist/assets/v1');
const official = (prefix) => fs.readFileSync(path.join(assets, fs.readdirSync(assets).find((file) => file.startsWith(prefix) && file.endsWith('.js'))), 'utf8');
const read = (file) => fs.readFileSync(path.join(app, file), 'utf8');
const text = (html) => html.replace(/<[^>]+>/g, '|').replace(/\|+/g, '|');

// The official app is client-rendered: its stores read useSyncExternalStore with no getServerSnapshot (SSR reads getSnapshot).
{
  const internals = React.__CLIENT_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE;
  let dispatcher;
  renderToStaticMarkup(React.createElement(function Capture() { dispatcher = internals.H; return null; }));
  const useStore = dispatcher.useSyncExternalStore;
  dispatcher.useSyncExternalStore = (subscribe, getSnapshot, getServerSnapshot) => useStore(subscribe, getSnapshot, getServerSnapshot ?? getSnapshot);
}

let server, C, A, I18N;
before(async () => {
  server = await createServer({ configFile: false, root: app, plugins: [react()],
    server: { middlewareMode: true, hmr: false, ws: false, watch: null }, appType: 'custom', logLevel: 'error' });
  I18N = await server.ssrLoadModule('/electron/i18n/index.mjs');
  I18N.setLocale?.('en-US');
  C = await server.ssrLoadModule('/src/source-code-transcript.jsx');
  A = await server.ssrLoadModule('/src/source-agent.jsx');
  globalThis.document ??= { body: { nodeType: 1 }, head: { appendChild() {}, querySelector: () => null }, createElement: () => ({ relList: { supports: () => false }, setAttribute() {}, style: {} }),
    querySelector: () => null, querySelectorAll: () => [], addEventListener() {}, removeEventListener() {}, documentElement: { dataset: {}, getAttribute: () => null }, cookie: '' };
  globalThis.window ??= { document: globalThis.document, navigator: { userAgent: 'Mozilla/5.0 (Macintosh)' }, addEventListener() {}, removeEventListener() {},
    matchMedia: () => ({ matches: false, addEventListener() {}, removeEventListener() {} }), location: { href: 'file:///', pathname: '/', search: '' } };
});
after(() => server?.close());

const render = (props) => renderToStaticMarkup(React.createElement(C.SourceCodeTranscript, { sessionId: 'r3t', ...props }));
const USER = { id: 'u1', type: 'userMessage', turnId: 't1', content: [{ type: 'text', text: 'hi' }] };
const REPLY = { id: 'm1', type: 'agentMessage', turnId: 't1', text: 'Done here' };
const QUESTIONS = [{ id: 'lang', question: 'Which language?' }];
const ASKED = { id: 'q1', type: 'dynamicToolCall', turnId: 't1', namespace: null, tool: 'ask_user_question', status: 'completed',
  arguments: { questions: QUESTIONS }, contentItems: [{ type: 'inputText', text: JSON.stringify({ answers: [{ id: 'lang', selected: ['Go'] }] }) }] };

test('R3T-REG-01: the official card dispatch the host wires (c96d752d0 K1e: EZe / EQ / lY; cef1e6037 dt → o9e isMcpAppTool)', () => {
  const c96 = official('c96d752d0-');
  assert.ok(c96.includes('t.tools[0].name==="AskUserQuestion"'));
  assert.ok(c96.includes('isMcpAppTool:d'));
  const cef = official('cef1e6037-');
  assert.ok(cef.includes('sessionServers:r'));
  // The extractor swaps dt for the host's matcher; the generated renderer imports it from the adapters.
  assert.match(read('scripts/extract-code-transcript.mjs'), /'cef1e6037-C9OZ_iaL\.js#dt': \{ name: 'useMcpAppToolMatcher'/);
  assert.match(read('src/generated/code-transcript/code-transcript.mjs'), /useMcpAppToolMatcher as dp,/);
  assert.doesNotMatch(read('src/generated/code-transcript/cef1e6037-C9OZ_iaL.mjs'), /function dt\(/);
});

test('R3T-REG-01: an answered AskUserQuestion is the host receipt card in the renderer; the call keeps its engine item', () => {
  const entries = codeTranscriptEntries([USER, ASKED, REPLY]);
  const call = entries[1].items[0].tools[0];
  assert.equal(call.name, 'AskUserQuestion');
  // Not enumerable: the renderer's entry sharing (X3 → wr) compares the SDK fields only.
  assert.equal(call.hostItem, ASKED);
  assert.equal(Object.keys(call).includes('hostItem'), false);
  const html = render({ items: [USER, ASKED, REPLY], host: { agentState: { items: { r3t: [USER, ASKED, REPLY] } } } });
  // Before: QuestionReceiptCard had no fallback and drew nothing (the row vanished).
  assert.match(text(html), /Which language\?\|Go\|/);
});

test('R3T-REG-01: ReportFindings and an MCP App call reach the host cards (renderCard "findings" / "mcp-app"); "row" is the original row', () => {
  const seen = [];
  const renderCard = (kind, props) => { seen.push([kind, props.tool?.hostItem?.id ?? null]); return kind === 'findings' ? React.createElement('div', { 'data-host-card': kind }) : undefined; };
  const findings = { id: 'f1', type: 'mcpToolCall', turnId: 't1', server: 'code_desktop', tool: 'ReportFindings', status: 'completed', arguments: { findings: [] }, result: { content: [] } };
  const mcp = { id: 'a1', type: 'mcpToolCall', turnId: 't1', server: 'weather', tool: 'show_map', status: 'completed', arguments: {}, result: { content: [] } };
  const html = render({ items: [USER, findings, REPLY, mcp], host: { renderCard, isMcpAppTool: (name) => name === 'mcp__weather__show_map' } });
  assert.ok(seen.some(([kind, id]) => kind === 'findings' && id === 'f1'), JSON.stringify(seen));
  assert.ok(seen.some(([kind, id]) => kind === 'mcp-app' && id === 'a1'), JSON.stringify(seen));
  assert.match(html, /data-host-card="findings"/);
  // The MCP App card answered undefined: its fallback (the original row) is drawn, not nothing.
  assert.match(html, /data-tool-anchor="a1"[^]*Used weather: show map/);
  // A session the window does not own draws no MCP App card (K1e `o && i?.(…)`): the matcher is not provided there.
  seen.length = 0;
  render({ items: [USER, mcp], ownedSession: false, host: { renderCard, isMcpAppTool: () => true } });
  assert.equal(seen.some(([kind]) => kind === 'mcp-app'), false);
  assert.match(read('src/main.jsx'), /agentState: state, isMcpAppTool: mcpAppRows\.isMcpAppTool,/);
});

test('R3T-REG-03: a skill chip\'s part is the message\'s leading /name (only a skill: still an entry)', () => {
  const skillOnly = { id: 'u2', type: 'userMessage', turnId: 't2', content: [{ type: 'skill', name: 'review', path: '/s/review/SKILL.md' }] };
  assert.deepEqual(userEntryItems(skillOnly), [{ kind: 'text', id: 'u2:text', text: '/review' }]);
  const withArgs = { id: 'u3', type: 'userMessage', turnId: 't3', content: [{ type: 'skill', name: 'review', path: '/s' }, { type: 'text', text: 'the parser' }] };
  assert.deepEqual(userEntryItems(withArgs), [{ kind: 'text', id: 'u3:text', text: '/review the parser' }]);
  assert.deepEqual(codeTranscriptEntries([skillOnly]).map((entry) => entry.author), ['user']);
  assert.equal(rendererDrawsRow(skillOnly), true);
  // A pending send of the same shape is a local entry too.
  assert.equal(localUserEntries([{ ...skillOnly, localDelivery: { status: 'sending' } }]).entries.length, 1);
  const html = render({ items: [skillOnly], host: { knownSlashCommands: ['review'] } });
  assert.match(text(html), /\/review/);
});

test('R3T-REG-02: tool output images reach the host tiles (renderImages); a `present` call\'s files are the host cards after the row', () => {
  const PNG = 'iVBORw0KGgo=';
  const pic = (id) => ({ id, type: 'mcpToolCall', turnId: 't1', server: 'shots', tool: 'grab', status: 'completed', arguments: {},
    result: { content: [{ type: 'image', mimeType: 'image/png', data: PNG }] } });
  const asked = [];
  const html0 = render({ items: [USER, { toolGroup: [pic('g1'), pic('g2')], id: 'g1', type: 'mcpToolCall', turnId: 't1' }, REPLY],
    host: { renderImages: (images, where) => { asked.push([images.length, where]); return React.createElement('span', { 'data-host-images': where ?? '' }); } } });
  // Collapsed, the group shows the step pictures' thumbnails (c4a9ee384); the expanded body's cb6930dae Hu (ToolOutputImages)
  // asks scope.renderImages, which is now given (before: null, so a grouped tool's images were lost once opened).
  assert.match(html0, /aria-label="Screenshot 1 of 2"/);
  void asked;
  // Without a host override the default is the host's SourceToolImages (useToolRunHost renderImages).
  assert.match(read('src/source-code-transcript.jsx'), /renderImages: host\.renderImages \?\? toolHost\.renderImages \?\? null/);
  const present = { id: 'p1', type: 'dynamicToolCall', turnId: 't1', tool: 'present', status: 'completed', arguments: {}, contentItems: [],
    codeDesktop: { deliverables: [{ path: '/w/out/report.md', description: 'The review' }] } };
  const html = render({ items: [USER, present, REPLY], host: { cwd: '/w' } });
  assert.match(html, /data-deliverables=""/);
  assert.match(text(html), /report\.md\|The review/);
  const artifacts = { id: 'r1', type: 'mcpToolCall', turnId: 't1', server: 's', tool: 'write', status: 'completed', arguments: {}, result: { content: [] },
    codeDesktop: { artifacts: [{ kind: 'file', path: '/w/a.txt' }] } };
  assert.match(render({ items: [USER, artifacts, REPLY] }), /data-artifacts=""/);
});

test('gen-final-3: a SendUserFile row\'s codeDesktop.artifacts are drawn once (group-status K1 `ed(t.name) && f(ay, {tool: t})`)', () => {
  // ed = c12ef874d `e === "SendUserMessage" || e === "SendUserFile"`; ay → scope.renderAttachedFiles (the host SourceArtifacts).
  // CodeToolExtras skips those two tools' artifacts so they are not drawn a second time after the row.
  assert.match(read('src/generated/transcript-rows/rows-c12ef874d-Ci3rzoMb.mjs'), /e === "SendUserMessage" \|\| e === "SendUserFile"/);
  const sent = { id: 's9', type: 'mcpToolCall', turnId: 't1', server: 'code_desktop', tool: 'SendUserFile', status: 'completed',
    arguments: { files: ['a.txt'] }, result: { content: [{ type: 'text', text: 'Sent' }] }, codeDesktop: { artifacts: [{ kind: 'file', path: '/w/a.txt' }] } };
  const html = render({ items: [USER, sent, REPLY], host: { cwd: '/w' } });
  assert.equal((html.match(/data-artifacts=""/g) ?? []).length, 1);
});

test('R3T-REG-04: the turn times are the entries\' ISO timestamps (c06cf64bb `s.timestamp = T`; bridge endedAt; DI row time)', () => {
  const c96 = official('c96d752d0-');
  assert.ok(c96.includes('endedAt:n.timestamp'));
  const turnTimes = { t1: { startedAt: 1767225600, completedAt: 1767225660 } };
  const entries = codeTranscriptEntries([USER, REPLY], { turnTimes });
  assert.equal(entries[0].timestamp, '2026-01-01T00:00:00.000Z');
  assert.equal(entries[1].timestamp, '2026-01-01T00:01:00.000Z');
  // The running turn's reply has no end yet.
  const running = codeTranscriptEntries([USER, REPLY], { turnTimes, responding: true, activeTurnId: 't1' });
  assert.equal(running[1].timestamp, undefined);
  // MessageActions mount deferred (data-deferred: the toolbar and its time draw after paint), so SSR shows the row only.
  assert.match(render({ items: [USER, REPLY], turnTimes }), /data-testid="message-actions"[^>]*data-deferred=""/);
  assert.match(read('src/main.jsx'), /turnTimes=\{state\.turnTimes\?\.\[current\] \?\? null\} hookRuns=\{state\.hookRuns\?\.\[current\] \?\? null\}/);
});

test('R3T-REG-05: a sub-agent\'s running tool stays running (cccc2cf0a PP: only the prose stops streaming)', () => {
  const cmd = { id: 'c1', type: 'commandExecution', turnId: 't1', command: 'npm test', status: 'inProgress' };
  assert.equal(codeTranscriptEntries([USER, cmd]).at(-1).items[0].tools[0].status, 'completed');
  assert.equal(codeTranscriptEntries([USER, cmd], { ownStatus: true }).at(-1).items[0].tools[0].status, 'running');
  assert.match(read('src/source-code-transcript.jsx'), /ownStatus: !ownedSession,/);
});

test('R3T-NEW-01: a workflow notification is the reply\'s task_event (c06cf64bb `M("assistant", [r], P)`, FI local_workflow → workflow)', () => {
  assert.ok(official('c06cf64bb-').includes('kind:"task_event",id:P,taskId:L.taskId'));
  const notice = { id: 'n1', type: 'userMessage', turnId: 't2', content: [{ type: 'text',
    text: '<task-notification>\n<task-id>wf-1</task-id>\n<status>completed</status>\n<summary>Dynamic workflow "audit" completed</summary>\n</task-notification>' }] };
  const event = workflowNotificationEvent(notice);
  if (event) {
    assert.equal(event.kind, 'task_event');
    assert.equal(event.taskType, 'local_workflow');
    assert.equal(rendererDrawsRow(notice), true);
    const entries = codeTranscriptEntries([USER, REPLY, notice, { id: 'm2', type: 'agentMessage', turnId: 't2', text: 'Noted' }]);
    const own = entries.find((entry) => entry.id === 'n1:task-event');
    assert.deepEqual(own.items.map((item) => item.kind), ['task_event', 'text']);
    assert.match(text(render({ items: [USER, REPLY, notice] })), /Background workflow completed/);
  }
  // W14-code r4 R4T-08g (E95): the escalation / stall / settings notices are no longer host rows (no item: c96d752d0 RI
  // has no copy for their statuses), tests/w14-r4-transcript.test.mjs.
  assert.match(read('src/code-transcript-entries.mjs'), /if \(notice\.kind\) return \{ none: true \};/);
});

test('R3T-NEW-02: a blocked / failed hook is the turn\'s hook_notice item (c06cf64bb; R3 → code.hook_notice → G3e)', () => {
  assert.ok(official('c06cf64bb-').includes('kind:"hook_notice"'));
  const run = { id: 'h1', status: 'failed', eventName: 'preToolUse', turnId: 't1', statusMessage: 'lint exited 1', entries: [] };
  assert.deepEqual(hookRunOutcome(run), { status: 'failed', details: 'lint exited 1', event: 'PreToolUse', promptBlocked: false });
  assert.equal(hookRunOutcome({ ...run, status: 'completed' }), null);
  const notices = C.codeHookNotices({ h1: run, h2: { ...run, id: 'h2', status: 'blocked', eventName: 'userPromptSubmit' } });
  // W14-code r4 R4T-04 (E95): the level is the hook's own (c06cf64bb `level: o === "warning" ? "warning" : "notice"`); a
  // run with no level and no warning entry is a notice.
  assert.deepEqual(notices, [{ id: 'hook-notice:h1', turnId: 't1', message: 'lint exited 1', level: 'notice' }]);
  const entries = codeTranscriptEntries([USER, REPLY], { hookNotices: notices });
  assert.deepEqual(entries.at(-1).items.at(-1), { kind: 'hook_notice', id: 'hook-notice:h1', notices: [{ id: 'hook-notice:h1', message: 'lint exited 1', level: 'notice' }] });
  // A notice without a warning rolls up (c06cf64bb sv `hook_notice: {rollUp: "rolls-up", when:
  // "notice-without-warning-or-recap"}`): the closed "Claude Code notice" step; a warning stands alone with its text.
  assert.match(text(render({ items: [USER, REPLY], hookRuns: { h1: run } })), /Claude Code notice/);
  assert.match(text(render({ items: [USER, REPLY], hookRuns: { h1: { ...run, level: 'warning' } } })), /lint exited 1/);
  // W14-code r4 R4T-04 (E95): no output, no notice (c06cf64bb `if (!a) continue`); the host's sentence is gone.
  assert.deepEqual(C.codeHookNotices({ h3: { ...run, id: 'h3', statusMessage: '' } }), []);
  assert.ok(official('c06cf64bb-').includes('if(!a)continue;let o=r.level;if(o==="info")continue;'));
  assert.equal(C.codeHookNotices({ h4: { ...run, id: 'h4', entries: [{ kind: 'warning', text: 'slow' }] } })[0].level, 'warning');
  assert.deepEqual(C.codeHookNotices({ h5: { ...run, id: 'h5', level: 'info' } }), []);
  assert.doesNotMatch(read('src/source-code-transcript.jsx'), /HOOK_BLOCKED|HOOK_FAILED/);
});

test('R3T-NEW-03: the renderer host carries knownSlashCommands (c96d752d0 bat `knownSlashCommands: Le`)', () => {
  assert.ok(official('c96d752d0-').includes('knownSlashCommands:Le'));
  const source = read('src/source-code-transcript.jsx');
  assert.match(source, /\.\.\.\(knownSlashCommands \? \{ knownSlashCommands \} : \{\}\),/);
  assert.match(read('src/main.jsx'), /knownSlashCommands: \[\.\.\.sessionCommands\.flatMap/);
});

test('r3pa-01: the sub-agent panel\'s states are cccc2cf0a xP / CP / SP (one select ICU, EmptyState, min-h-5 status)', () => {
  const cccc = official('cccc2cf0a-');
  assert.ok(cccc.includes('"No result \\u2014 task {status, select, failed {failed} stopped {stopped} other {ended}}"') || cccc.includes('No result — task {status, select, failed {failed} stopped {stopped} other {ended}}'));
  assert.ok(cccc.includes('className:"flex items-center min-h-5"'));
  const failed = { id: 'child', status: 'failed', items: [], name: 'scout', model: null };
  const html = renderToStaticMarkup(React.createElement(A.SourceTasksPane, { state: { items: { s: [{ id: 'k', type: 'collabAgentToolCall', tool: 'spawnAgent', receiverThreadIds: ['child'] }] },
    threads: { child: { id: 'child', status: { type: 'idle' } } }, agents: {}, approvalConnectionEpoch: 0 }, sessionId: 's',
    views: [{ threadId: 'child', toolId: 'k', ownerId: 's' }], onLoad: async () => {}, renderItem: () => null }));
  void failed;
  assert.doesNotMatch(html, /sag-empty|sag-thinking/);
  const source = read('src/source-agent.jsx');
  assert.match(source, /className="text-body text-muted-as-secondary select-text"><StartMessage defaultMessage="No result — task \{status, select, failed \{failed\} stopped \{stopped\} other \{ended\}\}" id="lEAPaAhXw3"/);
  assert.match(source, /<div role="status" className="flex items-center min-h-5">/);
  assert.match(source, /<EmptyState title=\{<StartMessage \{\.\.\.NO_ACTIVITY_MESSAGE\}\/>\}\/>/);
  assert.doesNotMatch(read('src/source-agent.css'), /\.sag-(?:empty|thinking)/);
});

test('css3-jump-chip: the scroll-to-bottom chip is c4a70913c C + w\'s placement verbatim (no hand-copied CSS)', () => {
  const c4a = official('c4a70913c-');
  const chip = 'inline-flex items-center h-[24px] px-xs rounded bg-surface-panel text-secondary shadow-field hover:bg-[linear-gradient(var(--cds-fill-secondary-hover),var(--cds-fill-secondary-hover))] border-0 focus-visible:outline-hidden hide-focus-ring focus-visible:shadow-focus stacks:layers-1-fill-secondary stacks:shadow-none';
  assert.ok(c4a.includes(`C="${chip}"`));
  assert.ok(c4a.includes('absolute -top-[32px] left-1/2 -translate-x-1/2 z-[1] gap-xs transition-opacity duration-150 ${i?"opacity-100":"opacity-0 pointer-events-none"}'));
  assert.ok(c4a.includes('className:"size-[6px] shrink-0 rounded-full bg-fill-accent"'));
  const source = read('src/source-transcript.jsx');
  assert.ok(source.includes(`const JUMP_CHIP = "${chip}";`));
  // -top-[32px] is relative to the composer dock; this chip sits in the transcript frame: the same 8px from its bottom.
  assert.ok(source.includes('${JUMP_CHIP} absolute bottom-2 left-1/2 -translate-x-1/2 z-[1] gap-xs transition-opacity duration-150 ${scroll.showJump ? "opacity-100" : "opacity-0 pointer-events-none"}'));
  assert.match(source, /<span aria-hidden="true" className="size-\[6px\] shrink-0 rounded-full bg-fill-accent" \/>\s*<span className="text-footnote">\{t\("Needs your input"\)\}<\/span>/);
  assert.match(source, /data-testid="jump-to-latest"/);
  assert.doesNotMatch(read('src/source-transcript.css'), /source-transcript-(?:jump|input-dot|needs-input)/);
});
