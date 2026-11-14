// W14-code 第四轮 ct-feed 线（plan-w14-code.md §5，E95：需用户定的 UI 一律照官方）：
//   R4T-04       hook 没有输出就不出 notice（c06cf64bb `if(!a)continue`），level 取 hook 自报的（不再一律 warning）
//   gates-r4-11  __gb__2846116625 不在 Uon：宿主表不再开；Code 会话由 cf74bc599 Gn（rendererChrome）给 TurnStatus 行，Chat/Cowork 不给
//   ct-lead-slot host.leadRows（truncated → forkedFrom → 起始行）与 host.transcriptNotices（转写尾部的 session bands）两个可选位
//   R4T-08b      model 发起的 workflow run = 渲染器的 Workflow 调用：c96d752d0 F$（运行中 N$ 紧凑卡，结束后 TurnStatus 步骤）
//   R4DC-02      code-transcript-links.json 不再要求 transcript-rows 导出 shared-156 的 MC/Qv/VC/gC/vC/xC
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
const text = (html) => html.replace(/<[^>]+>/g, '|').replace(/\|+/g, '|');

{
  const internals = React.__CLIENT_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE;
  let dispatcher;
  renderToStaticMarkup(React.createElement(function Capture() { dispatcher = internals.H; return null; }));
  const useStore = dispatcher.useSyncExternalStore;
  dispatcher.useSyncExternalStore = (subscribe, getSnapshot, getServerSnapshot) => useStore(subscribe, getSnapshot, getServerSnapshot ?? getSnapshot);
}

let server, C, Rows, Turn, Growth, workflowTask, workflowTasks, localSessionClient;
before(async () => {
  server = await createServer({ configFile: false, root: app, plugins: [react()],
    server: { middlewareMode: true, hmr: false, ws: false, watch: null }, appType: 'custom', logLevel: 'error' });
  const I18N = await server.ssrLoadModule('/electron/i18n/index.mjs');
  I18N.setLocale?.('en-US');
  C = await server.ssrLoadModule('/src/source-code-transcript.jsx');
  Rows = await server.ssrLoadModule('/src/source-transcript-rows.jsx');
  Turn = await server.ssrLoadModule('/src/generated/working-line/turn-status-rows.mjs');
  Growth = await server.ssrLoadModule('/src/host-growthbook.mjs');
  ({ workflowTask, workflowTasks, localSessionClient } = await server.ssrLoadModule('/src/source-code-feed-adapters.jsx'));
  globalThis.document ??= { body: { nodeType: 1 }, head: { appendChild() {}, querySelector: () => null }, createElement: () => ({ relList: { supports: () => false }, setAttribute() {}, style: {} }),
    querySelector: () => null, querySelectorAll: () => [], addEventListener() {}, removeEventListener() {}, documentElement: { dataset: {}, style: {}, getAttribute: () => null, hasAttribute: () => false }, cookie: '' };
  globalThis.window ??= { document: globalThis.document, navigator: { userAgent: 'Mozilla/5.0 (Macintosh)' }, addEventListener() {}, removeEventListener() {},
    matchMedia: () => ({ matches: false, addEventListener() {}, removeEventListener() {} }), location: { href: 'file:///', pathname: '/', search: '' } };
});
after(() => server?.close());

const render = (props) => renderToStaticMarkup(React.createElement(C.SourceCodeTranscript, { sessionId: 'ctfeed', ...props }));
const USER = { id: 'u1', type: 'userMessage', turnId: 't1', content: [{ type: 'text', text: 'hi' }] };
const REPLY = { id: 'm1', type: 'agentMessage', turnId: 't1', text: 'Done here' };

test('R4T-04: a hook run with no output has no notice; the level is the hook\'s own (c06cf64bb informational message)', () => {
  const src = official('c06cf64bb-');
  assert.ok(src.includes('let a=n.trim().replace(/:$/,"").trimEnd();if(!a)continue;let o=r.level;if(o==="info")continue;'));
  assert.ok(src.includes('kind:"hook_notice",id:g,notices:[{id:g,message:a,level:o==="warning"?"warning":"notice"}]'));
  const run = { id: 'h1', status: 'blocked', eventName: 'preToolUse', turnId: 't1', statusMessage: '', entries: [] };
  assert.deepEqual(C.codeHookNotices({ h1: run }), []);
  assert.deepEqual(C.codeHookNotices({ h1: { ...run, statusMessage: 'denied:' } }), [{ id: 'hook-notice:h1', turnId: 't1', message: 'denied', level: 'notice' }]);
  assert.equal(C.codeHookNotices({ h1: { ...run, entries: [{ kind: 'warning', text: 'careful' }] } })[0].level, 'warning');
  assert.equal(C.codeHookNotices({ h1: { ...run, statusMessage: 'x', level: 'warning' } })[0].level, 'warning');
  assert.deepEqual(C.codeHookNotices({ h1: { ...run, statusMessage: 'x', level: 'info' } }), []);
  // The host's fallback sentences are gone from the renderer path (state.js keeps them for the other modes' notice band).
  assert.doesNotMatch(read('src/source-code-transcript.jsx'), /HOOK_BLOCKED|HOOK_FAILED/);
});

test('gates-r4-11: turnStatusRows is not served; the Code session turns the rows on (cf74bc599 Gn), Chat / Cowork do not', () => {
  const cf7 = official('cf74bc599-');
  assert.ok(cf7.includes('Z===null&&e.rendererChrome'));
  assert.ok(cf7.includes('Gn=eh()||Wn') || /Gn=eh\(\)\|\|Wn/.test(cf7));
  assert.equal(Growth.hostGrowthBookFlag('__gb__2846116625'), false);
  assert.equal('__gb__2846116625' in Growth.HOST_GROWTHBOOK, false);
  const Probe = () => String(Turn.useTurnStatusRows());
  const scope = (props) => renderToStaticMarkup(React.createElement(Rows.TranscriptRowsScope, { sessionKey: 'code:s', ...props }, React.createElement(Probe)));
  assert.equal(scope({}), 'true', 'the Code transcript scope (default)');
  assert.equal(scope({ statusRows: false }), 'false', 'Chat / Cowork');
  // An outer value (a Code session's) is kept: cf74bc599 `Gn = eh() || Wn`.
  assert.equal(renderToStaticMarkup(React.createElement(Turn.TurnStatusRowsOverride, { value: true },
    React.createElement(Rows.TranscriptRowsScope, { sessionKey: 'code:s', statusRows: false }, React.createElement(Probe)))), 'true');
  // main.jsx passes the mode; source-transcript.jsx hands it to the scope.
  assert.match(read('src/main.jsx'), /statusRows=\{mode === "code" \/\* W14-code r4 gates-r4-11/);
  assert.match(read('src/source-transcript.jsx'), /awaiting=\{pendingInput\} statusRows=\{statusRows\}>/);
  // 3.6556.2's skeletons hold "handoff" outright (c96d752d0 Att).
  assert.ok(official('c96d752d0-').includes('{none:"handoff"}'));
  assert.match(read('src/source-transcript-states.jsx'), /holdReason = "handoff" \}\) \{/);
});

test('ct-lead-slot: host.leadRows after the truncated / forked-from rows, host.transcriptNotices in the tail; empty by default', () => {
  const base = render({ items: [USER, REPLY] });
  assert.equal(render({ items: [USER, REPLY], host: {} }), base);
  assert.equal(render({ items: [USER, REPLY], host: { leadRows: null, transcriptNotices: null } }), base);
  const html = render({ items: [USER, REPLY], host: { truncated: true, leadRows: React.createElement('div', { 'data-lead-probe': '' }, 'Start row'),
    transcriptNotices: React.createElement('div', { 'data-notice-probe': '' }, 'Sleep band') } });
  const truncated = html.indexOf('data-transcript-truncated'), lead = html.indexOf('data-lead-probe'), user = html.indexOf('data-transcript-item-id="u1"'), notice = html.indexOf('data-notice-probe');
  assert.ok(truncated >= 0 && truncated < lead && lead < user && user < notice, 'truncated → lead → rows → notices');
  assert.ok(html.lastIndexOf('Done here') < notice);
});

test('R4T-08b: a host workflow run as the desktop\'s background task (cea7057eb X: F$ `Wx(t.id)`, Se by toolUseId)', () => {
  assert.ok(official('cea7057eb-').includes('return J2($,0,t,e)?K2($,0,t,e,e?t.find(t=>t.toolUseId===e):void 0)') || official('cea7057eb-').includes('t.toolUseId===e'));
  const run = { id: 'run-1', runId: 'r-9', name: 'audit', description: 'Audit the repo', status: 'running', startedAt: 1000,
    workflowProgress: [{ type: 'workflow_phase', index: 0, title: 'Scan' }, { type: 'workflow_agent', id: 'a1', index: 1, label: 'reader', state: 'progress', phaseIndex: 0 }, null],
    usage: { totalTokens: 42 } };
  const task = workflowTask(run, 'w1');
  assert.deepEqual({ taskId: task.taskId, toolUseId: task.toolUseId, taskType: task.taskType, name: task.name, description: task.description, status: task.status,
    progress: task.workflowProgress.length, startedAt: task.startedAt, usage: task.usage, outputFile: task.outputFile },
  { taskId: 'r-9', toolUseId: 'w1', taskType: 'local_workflow', name: 'audit', description: 'Audit the repo', status: 'running', progress: 2, startedAt: 1000,
    usage: { totalTokens: 42 }, outputFile: undefined });
  assert.equal(workflowTask({ status: 'weird' }, 'w2').status, 'running');
  assert.deepEqual(workflowTasks([{ id: 'w1', workflowRun: run }, { id: 'x' }]).map((one) => one.toolUseId), ['w1']);
  // cef1e6037 Z (the local session client k1e → D1e reads output files through): none here.
  assert.equal(localSessionClient.readFile, undefined);
});

test('R4T-08b: the Workflow call is F$ — N$\'s compact card while running (opens the host\'s Tasks pane), the settled step after', () => {
  const c96 = official('c96d752d0-');
  assert.ok(c96.includes('f(N$,{task:v,variant:"compact",title:d,isPreLaunch:g,onOpen:e})') || c96.includes('variant:"compact",title:d,isPreLaunch:g,onOpen:e'));
  const gen = read('src/generated/code-transcript/code-transcript.mjs');
  assert.match(gen, /F\$ as WorkflowToolRow/);
  assert.match(gen, /N\$ as WorkflowTaskCard/);
  assert.match(read('src/generated/code-transcript/cea7057eb-De2BQu3K.mjs'), /X as BackgroundTasksContext/);
  const wf = (status) => ({ id: 'w1', turnId: 't1', workflowRun: { id: 'run-1', name: 'audit', description: 'Audit the repo', status, startedAt: Date.now() - 5000,
    workflowProgress: [{ type: 'workflow_agent', id: 'a1', index: 1, label: 'reader', state: status === 'running' ? 'progress' : 'done' }] } });
  const opened = [];
  const done0 = () => render({ items: [USER, wf('completed'), REPLY], officialWorkflow: true, host: { openWorkflow() {} } });
  const running = render({ items: [USER, wf('running'), REPLY], officialWorkflow: true, host: { openWorkflow: (row) => opened.push(row.id) } });
  // j$e: the title, "Workflow", the agent count (59iDR2YzIC) and the run's clock.
  assert.match(text(running), /\|audit\|Workflow\|1\| agent\|\d+s\|/);
  assert.match(running, /<button[^>]*>/, 'the compact card is a button while the host can open it');
  assert.doesNotMatch(running, /swf-compact|swf-card/, 'not the host WorkflowRow / WorkflowCard');
  const done = render({ items: [USER, wf('completed'), REPLY], officialWorkflow: true, host: { openWorkflow() {} } });
  assert.doesNotMatch(done, /swf-terminal|swf-compact/);
  // F$ settled: the TurnStatus step "Ran workflow · audit" (not the host's swf-terminal).
  assert.match(text(done), /\|Ran workflow\|audit\|/);
  assert.equal(done0(), done);
  // Off (local_official_workflow_row false / no option): the host's row, as before.
  const off = render({ items: [USER, wf('running'), REPLY], hostRow: (row) => !!row.workflowRun, renderHostRow: () => React.createElement('div', { 'data-host-wf': '' }) });
  assert.match(off, /data-host-wf/);
  // main.jsx: model-started runs only (a turn row), behind the rollback switch; the host row is not drawn twice.
  const main = read('src/main.jsx');
  assert.match(main, /const codeOfficialWorkflow = \(row\) => !!row\?\.turnId && hostGrowthBookFlag\("local_official_workflow_row"\);/);
  assert.match(main, /\{item\.workflowRun \? codeRendererDraws\(item\) \? null/);
  assert.equal(Growth.hostGrowthBookFlag('local_official_workflow_row'), true);
});

test('R4DC-02: transcript-rows no longer exports shared-156 MC / Qv / VC / gC / vC / xC for the code transcript', () => {
  const links = JSON.parse(read('scripts/code-transcript-links.json'));
  const list = links.linkExports['transcript-rows']['shared-156-BLTosN8U.js'];
  for (const name of ['MC', 'Qv', 'VC', 'gC', 'vC', 'xC']) assert.equal(list.includes(name), false, name);
  const rows = read('src/generated/transcript-rows/rows-shared-156-BLTosN8U.mjs');
  const exported = rows.slice(rows.lastIndexOf('export {'));
  for (const name of ['MC', 'Qv', 'VC', 'gC', 'vC', 'xC']) assert.doesNotMatch(exported, new RegExp(`(^|[\\s,{])${name.replace('$', '\\$')}( as [^,]+)?,?\\s*(\\n|})`), name);
});

test('r4-e90-gui crossLane (D1): transcript-rows exports ca7ba268c Ba as CodeView (official export `Ba as t`, `Ba = u(za)`)', () => {
  const src = official('ca7ba268c-');
  assert.ok(src.includes('Ba=u(za)') && /Ba as t\b/.test(src));
  // W14-code r5 pierre: c82eca2bd ht (the Files viewer's metrics, `return A(t, e)`, A = ca7ba268c fa) now reads fa too.
  assert.match(read('src/generated/transcript-rows/rows-ca7ba268c-B3JMi1tw.mjs'), /export \{ Ba as CodeView, Na, an, fa \};/);
  // W14-code r6 pierre (R6DC-01): the export is no longer test-only — generated/pierre-changes (c44d00c7f qu, the Changes
  // body: `import { … t as kt } from "./ca7ba268c-B3JMi1tw.js"`, `n(kt, {ref: G, …, renderCustomHeader: Jt, …})`) links
  // this one copy instead of slicing ca7ba268c again (D1).
  assert.ok(official('c44d00c7f-').includes('t as kt}from"./ca7ba268c-B3JMi1tw.js"'));
  assert.match(read('src/generated/pierre-changes/pierre-changes.mjs'), /import \{ CodeView as kt \} from "\.\.\/transcript-rows\/rows-ca7ba268c-B3JMi1tw\.mjs";/);
});
