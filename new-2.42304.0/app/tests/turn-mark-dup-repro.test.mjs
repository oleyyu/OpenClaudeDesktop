// Repro: two transcript rows hold the turn's mark at once ("Running a command 8m 52s ›" and "Editing
// landing-performance-benchmark.cjs 8m 52s ⌄", both with the clay mark, in the transcript's tail outlet).
//
// Data: Codex rollout ~/.codex/sessions/2026/10/29/rollout-2026-10-29T17-42-14-01a18709-dbe9-7080-8896-7d85ef787b3c.jsonl,
// turn 01a1870d-d0c1-7963-86e2-31f3edbde041 (task_started 09:46:32.009Z). The screenshot is 8m52s into the turn,
// ~09:55:24Z. The items below are the turn's items as the host holds them at that moment (started_at_ms /
// completed_at_ms of each item_completed event; the app's sse-trace.jsonl ends 2026-10-18 and has no record of this
// thread):
//   09:52:42  agentMessage call_b3ebee90…        an async question ("你现在感觉卡顿主要发生在哪里？…")
//   09:54:01  commandExecution exec-b7b5f314…    completed
//   09:54:16  fileChange exec-76fe45bc…          completed
//   09:54:16  commandExecution exec-0fb40feb…    completed 09:54:26
//   09:54:17  commandExecution exec-420e6a56…    completed
//   09:54:26  commandExecution exec-03061b40…    completed
//   09:54:27  commandExecution exec-905af3c6…    completed 09:54:47
//   09:54:28  commandExecution exec-bd213b70…    node app/scripts/landing-performance-hotfix.mjs — STILL RUNNING
//             (exec_command yielded after 1 s and handed back session 13079 at 09:54:29.285; the process exits and the
//             item completes only at 09:55:28.743)
//   09:54:40  userMessage 01a18715…              the answer to the async question (sent as a steer, same turn id)
//   09:55:04  agentMessage msg_…2631b5           "明确了，卡顿发生在点击字符后触发的波纹动画。…"
//   09:55:14  fileChange exec-30453c80…          landing-performance-benchmark.cjs, completed 09:55:14.799
//   (hidden reasoning items with no summary in between; the model is thinking at 09:55:24, no tool call in flight)
//
// Official 2.42304.0 (cb6930dae-BD0W5ZM9.js, ho → mo): the live scope's running ids are collected from the LAST REAL
// USER ROW THAT ASSISTANT OUTPUT FOLLOWS, not from the whole turn:
//   function mo(e){let t=0,n=!1,r=!1;for(let i=e.length-1;i>=0;i--){let a=e[i];if(a!==void 0){if(a.author!=="user"){r=!0;
//   continue}if(!(a.synthetic===!0||a.items.some(e=>e.kind==="event"&&!mr.has(e.eventType)))){if(r){t=i;break}n=!0}}}
//   … for(let n=t;n<e.length;n++)for(let t of e[n]?.items??[]){if(t.kind==="thinking"){s=void 0,c=void 0;continue}
//   if(t.kind==="tools")for(let e of t.tools){if(s=e,e.status!=="running")continue;c=e,i.push(e.id),…}}
//   return{idsKey:i.join(`\n`),…,endsInUnansweredUserRow:n,lastTool:n?void 0:c??s}}
// and when that finds no running tool, ho falls back to the streaming message's tool blocks (cd4f82e77 Vt), not to
// older rows. So after the steer row (answered by the agent message + edit), exec-bd213b70 is not live: its group row
// (ZM: s = runningIds.some(live) = false, Ya: wireRunning && live = false) does not take the mark, and only the live
// tail (the edit, ZM `t !== void 0 && turnLive`) holds it — one mark.
// The host's transcriptLiveScope collects every running item of the turn id (liveTurnItems), steer or not, so the
// earlier group keeps the mark next to the tail's: two holders in the broker (Fa.holders is a set; only the working
// line yields), both moved into the outlet.
//
// Run: node --test --test-concurrency=1 tests/turn-mark-dup-repro.test.mjs
import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import * as Model from '../src/transcript-rows-model.mjs';
import { groupFileTools } from '../src/file-tool-model.mjs';
import { liveTurnItems } from '../src/transcript-runtime-stats.mjs';

const T = '01a1870d-d0c1-7963-86e2-31f3edbde041';
const W = '/Users/oleyyu/BIHZCoding/claude-ui-lab-wt/landing-frame-budget';
const cmd = (id, command, status = 'completed', extra = {}) => ({ id, turnId: T, type: 'commandExecution', command: `/bin/zsh -lc ${JSON.stringify(command)}`,
  cwd: W, status, aggregatedOutput: status === 'completed' ? '' : null, exitCode: status === 'completed' ? 0 : null, ...extra });
const edit = (id, file, status = 'completed') => ({ id, turnId: T, type: 'fileChange', status,
  changes: [{ path: `${W}/${file}`, kind: { type: 'update' }, diff: '@@ -1 +1,2 @@\n a\n+b\n' }] });
const thought = id => ({ id, turnId: T, type: 'reasoning', summary: [], content: [] });

// The host's items for the turn at ~09:55:24Z, in item/started order.
const ITEMS = [
  { id: '01a1870d-d0d5-7d42-866d-11cbb547652c', turnId: T, type: 'userMessage', content: [{ type: 'text', text: '为什么要用Computer Use？不是应该直接定位源码吗' }] },
  { id: 'msg_00d88c6ca3147abb016ae3160021488198ae7a327379552b63', turnId: T, type: 'agentMessage', text: '应该直接定位源码。…' },
  thought('rs_…ae3175e0a'),
  { id: 'msg_00d88c6ca3147abb016ae3175e2c348198a25f61a35212274c', turnId: T, type: 'agentMessage', text: '收到，这说明前面的优化还不足以解决流畅度问题。…' },
  cmd('exec-21455f56-fbd9-49b2-8d29-88a61b944f2e', "ps -axo pid,ppid,pcpu,comm | rg 'OpenClaude Desktop|Electron|Codex' | head -25"),
  thought('rs_…ae317683e'),
  { id: 'call_b3ebee90cc1d4a6784012f1d4fc10493', turnId: T, type: 'agentMessage', text: '你现在感觉卡顿主要发生在哪里？这会决定我接下来测哪条渲染链。',
    delivery: 'async', questions: [{ title: '你现在感觉卡顿主要发生在哪里？这会决定我接下来测哪条渲染链。', options: ['首页字符背景动画', '聊天滚动或生成'] }] },
  thought('rs_…ae3176d1e'),
  cmd('exec-7ac50733-5f62-4aa3-b190-eb08eb7310e6', 'cat analysis/landing-performance/renderer-sample.txt'),
  cmd('exec-c11abd09-ac07-4f5d-be60-14a8e980f404', "ps -axo pid,ppid,pcpu,comm | rg 'OpenClaude Desktop$'"),
  thought('rs_…ae3178367'), thought('rs_…ae3179072'),
  edit('exec-b7dc4a6b-637c-4d0c-9bb6-8fb27856e99d', 'app/src/landing-texture-performance.mjs'),
  thought('rs_…ae317b688'),
  cmd('exec-b7b5f314-3dd9-4a51-97fd-4020cb61b5a1', "rg -n 'pending:' app/tests/landing-texture-current.test.mjs"),
  thought('rs_…ae317c109'),
  edit('exec-76fe45bc-ed43-4cc7-bb3e-f54bd4767052', 'app/tests/landing-texture-current.test.mjs'),
  cmd('exec-0fb40feb-c084-414a-a60a-672e2b404038', 'node app/scripts/extract-landing-texture.mjs'),
  cmd('exec-420e6a56-df7e-4b8f-b8b2-eb4715cf1511', "sed -n '20,110p' analysis/landing-performance/renderer-sample.txt"),
  thought('rs_…ae317cfe3'),
  cmd('exec-03061b40-a3c8-4bb4-ae1a-5da41e8dbff6', "mv 'analysis/landing-performance/OpenClaude Desktop.app' 'analysis/landing-performance/previous-budget.app'"),
  cmd('exec-905af3c6-972c-4cf9-8a65-527bf5fe4b35', 'node --test app/tests/landing-texture-performance.test.mjs app/tests/landing-texture-current.test.mjs app/tests/landing-texture-host.test.mjs'),
  // Kernel fact: started 09:54:28.262, completed 09:55:28.743 — inProgress at 09:55:24.
  cmd('exec-bd213b70-d9ed-4a3b-aee4-4a691b1c162c', 'node app/scripts/landing-performance-hotfix.mjs', 'inProgress', { processId: '13079' }),
  // The async question's answer, sent while the turn runs (async-questions-model.mjs: "an ordinary user message").
  { id: '01a18715-42f3-73c0-a862-751eeb90acb1', turnId: T, type: 'userMessage',
    content: [{ type: 'text', text: 'Answer to your question "你现在感觉卡顿主要发生在哪里？这会决定我接下来测哪条渲染链。":\n就是点击一下首页字符 那个背景动画' }] },
  thought('rs_…ae317f8b5b'),
  { id: 'msg_00d88c6ca3147abb016ae317f8b5b4819895d47d284c2631b5', turnId: T, type: 'agentMessage',
    text: '明确了，卡顿发生在点击字符后触发的波纹动画。我会针对这个效果验证：保留点击反馈，降低波纹绘制开销，并让它跟随屏幕刷新调度，而不是靠限帧来掩盖卡顿。' },
  // Kernel fact: item_completed at 09:55:14.799 — the edit is done; the row only says "Editing …" as the live tail.
  edit('exec-30453c80-39cb-4e38-9338-c3c8f5eb6155', 'app/scripts/landing-performance-benchmark.cjs'),
];
const RUNNING_CMD = 'exec-bd213b70-d9ed-4a3b-aee4-4a691b1c162c';
const LAST_EDIT = 'exec-30453c80-39cb-4e38-9338-c3c8f5eb6155';
const SCOPE = { sessionKey: 'code:01a18709-dbe9-7080-8896-7d85ef787b3c', turnId: T, items: ITEMS, itemPhases: {}, responding: true,
  turnStats: { turnId: T, startedAt: Date.parse('2026-10-29T09:46:32.009Z') / 1000 } };

const toolTypes = new Set(['commandExecution', 'fileChange']);
const members = row => row.type === 'fileToolGroup' ? row.toolGroup : toolTypes.has(row.type) ? [row] : [];
const running = item => item.status === 'inProgress' || item.status === 'running';
/**
 * Which displayed rows take the turn's mark on their first render, by the original's rule (c96d752d0 v2e → XAe/ZAe →
 * cb6930dae ZM, generated/transcript-rows/group-status.mjs):
 *   s = candidate.runningIds.some(live)          a running member the scope calls live
 *   o = Ya({wireRunning, live}) = wireRunning && live
 *   tail: v2e `g && m.status === "completed" && !m.isError` (g = liveTail, m = the run's last tool) and turnLive
 *   marked = tv(o || s || tail)                  (Fa.holders is a set: nothing but the working line yields)
 */
function markHolders(rows, scope, turnLive) {
  const held = [];
  rows.forEach((row, index) => {
    const tools = members(row);
    if (!tools.length) return;
    const live = id => scope.liveRunningToolIds.has(id);
    const runningIds = tools.filter(running).map(tool => tool.id);
    const s = runningIds.some(live);
    const liveTail = Model.toolRunLiveTail(rows, index, turnLive ? T : null);
    const last = tools.at(-1);
    const tail = liveTail && !running(last) && last.status === 'completed';
    if (s || (tail && turnLive)) held.push({ row: row.id, members: tools.map(tool => tool.id), why: s ? 'running' : 'liveTail' });
  });
  return held;
}

/**
 * cb6930dae mo over the host's rows (entries ≈ rows; a host userMessage is a real user entry, every other row is
 * assistant output): the running tool ids from the last user row that assistant output follows.
 */
function officialMoRunningIds(items, turnId) {
  const rows = items.filter(item => item.turnId === turnId);
  let start = 0, seenAssistant = false;
  for (let i = rows.length - 1; i >= 0; i--) {
    if (rows[i].type !== 'userMessage') { seenAssistant = true; continue; }
    if (seenAssistant) { start = i; break; }
  }
  const ids = [];
  for (const item of rows.slice(start)) if (toolTypes.has(item.type) && running(item)) ids.push(item.id);
  return ids;
}

test('kernel facts at ~09:55:24Z: the benchmark edit is completed, the hotfix command is still running', () => {
  const byId = Object.fromEntries(ITEMS.map(item => [item.id, item]));
  assert.equal(byId[LAST_EDIT].status, 'completed');
  assert.equal(byId[RUNNING_CMD].status, 'inProgress');
  // The host's live items for the turn: exactly the running command (no completed item is treated as in progress).
  assert.deepEqual(liveTurnItems(T, ITEMS, {}).map(item => item.id), [RUNNING_CMD]);
});

test('the host rows: the running command sits in a group before the steer row; the finished edit is the live tail', () => {
  const rows = groupFileTools(ITEMS, 'normal');
  const visible = rows.filter(row => !(row.type === 'reasoning'));
  const runIndex = visible.findIndex(row => members(row).some(tool => tool.id === RUNNING_CMD));
  const steerIndex = visible.findIndex(row => row.id === '01a18715-42f3-73c0-a862-751eeb90acb1');
  const tailIndex = rows.findIndex(row => row.id === LAST_EDIT);
  assert.ok(runIndex >= 0 && steerIndex > runIndex, 'the running command is before the answer (steer) row');
  assert.equal(visible[runIndex].type, 'fileToolGroup');
  assert.equal(Model.toolRunLiveTail(rows, tailIndex, T), true, 'the completed edit is the live tail');
  assert.equal(Model.toolRunLiveTail(rows, rows.indexOf(visible[runIndex]), T), false);
});

test('official mo: after the answered steer row the earlier command is not live; the host follows mo', () => {
  const official = officialMoRunningIds(ITEMS, T);
  assert.deepEqual(official, [], 'cb6930dae mo starts at the steer row: no running tool after it');
  const host = [...Model.transcriptLiveScope(SCOPE).liveRunningToolIds];
  // Before the fix: host = [exec-bd213b70…] — the whole turn's running items.
  assert.deepEqual(host, official, 'host liveRunningToolIds must follow mo (from the last answered user row)');
});

test('one mark at a time: only one transcript row holds the turn mark at ~09:55:24Z', () => {
  const rows = groupFileTools(ITEMS, 'normal');
  const holders = markHolders(rows, Model.transcriptLiveScope(SCOPE), true);
  // Before the fix: [{group with exec-bd213b70, running}, {exec-30453c80, liveTail}] — the screenshot's two marked rows.
  assert.equal(holders.length, 1, `holders: ${JSON.stringify(holders)}`);
  assert.equal(holders[0].row, LAST_EDIT);
});

// SSR over the generated originals (vite middleware mode; esbuild spawns a service — under the netjail this fails with
// EPERM, an environment limit).
let server, Rows, Session;
before(async () => {
  try {
    const { createServer } = await import('vite');
    const { default: react } = await import('@vitejs/plugin-react');
    const app = path.resolve(import.meta.dirname, '..');
    server = await createServer({ configFile: false, root: app, plugins: [react()], server: { middlewareMode: true, hmr: false, ws: false, watch: null },
      appType: 'custom', logLevel: 'error' });
    Rows = await server.ssrLoadModule('/src/source-transcript-rows.jsx');
    Session = await server.ssrLoadModule('/src/source-session.jsx');
  } catch (error) {
    Rows = null; Session = null; server?.close(); server = null;
    console.log('SSR unavailable:', error?.code ?? '', String(error?.message ?? error).slice(0, 200));
  }
});
after(() => server?.close());

const STEER = '01a18715-42f3-73c0-a862-751eeb90acb1';
function renderRows(scope) {
  const h = React.createElement;
  const rows = groupFileTools(ITEMS, 'normal');
  const html = renderToStaticMarkup(h(Rows.TranscriptRowsScope, scope,
    rows.map((item, index) => h(Session.SourceMessage, { key: item.id, item, sessionKey: SCOPE.sessionKey, cwd: W, transcriptView: 'normal',
      liveTail: Model.toolRunLiveTail(rows, index, T, 'normal') }))));
  if (process.env.TURN_MARK_DEBUG) console.log(html);
  // XAe / ZAe `leading: o && !v ? x : null` → ww → the clay WorkingMark: one per row that holds the turn's mark.
  const marks = (html.match(/data-testid="TurnStatusClayMark"/g) ?? []).length;
  const labels = [...html.matchAll(/data-morph-key="(busy\|[^"]*)"/g)].map(m => m[1]);
  // The label of each row that leads with the mark (the morph key follows the row's mark in document order).
  const marked = [...html.matchAll(/data-testid="TurnStatusClayMark"[\s\S]*?data-morph-key="([^"]*)"/g)].map(m => m[1]);
  return { marks, labels, marked };
}

test('SSR: only one transcript row leads with the clay mark at ~09:55:24Z', t => {
  if (!Rows || !Session) { t.skip('SSR unavailable in this environment'); return; }
  const { marks, labels, marked } = renderRows(SCOPE);
  // Before the fix: marks = 2, marked = ["busy|Running a command", "busy|Editing landing-performance-benchmark.cjs"] — the
  // screenshot's two rows (TurnMarkBox moves both into the tail outlet).
  assert.deepEqual({ marks, marked }, { marks: 1, marked: ['busy|Editing landing-performance-benchmark.cjs'] }, `busy labels: ${JSON.stringify(labels)}`);
});

// Control (passes today): the same rows under the live scope cb6930dae mo would build — its entries start at the answered
// steer row — give one mark, the live tail's. The earlier group still says "Running a command" (busy, no mark) in place.
test('control: with mo\'s scope (from the answered steer row) the rows carry exactly one mark, the tail\'s', t => {
  if (!Rows || !Session) { t.skip('SSR unavailable in this environment'); return; }
  const fromSteer = ITEMS.slice(ITEMS.findIndex(item => item.id === STEER));
  const { marks, labels, marked } = renderRows({ ...SCOPE, items: fromSteer });
  assert.equal(marks, 1);
  assert.deepEqual(marked, ['busy|Editing landing-performance-benchmark.cjs']);
  assert.deepEqual(labels, ['busy|Running a command', 'busy|Editing landing-performance-benchmark.cjs']);
  const holders = markHolders(groupFileTools(ITEMS, 'normal'), Model.transcriptLiveScope({ ...SCOPE, items: fromSteer }), true);
  assert.deepEqual(holders.map(holder => holder.row), [LAST_EDIT]);
});

// ho's other half: right after a user row with no reply yet (mo's endsInUnansweredUserRow), mo starts at the previous
// answered user row and clears the last tool (`lastTool: n ? void 0 : c ?? s`); ho keeps only the running ids it held
// for the session (lo, the intersection) — a command running when the user steers keeps its mark until the reply starts.
test('unanswered steer: mo starts at the previous answered user row; ho keeps the held ids (lo)', () => {
  const upToSteer = ITEMS.slice(0, ITEMS.findIndex(item => item.id === STEER) + 1);
  const scope = Model.transcriptLiveScope({ ...SCOPE, items: upToSteer });
  assert.equal(scope.endsInUnansweredUserRow, true);
  assert.equal(scope.lastTool, null);
  assert.deepEqual([...scope.liveRunningToolIds], [RUNNING_CMD]);
  assert.equal(Model.intersectLiveIds(RUNNING_CMD, RUNNING_CMD), RUNNING_CMD, 'held while answered: stays live');
  assert.equal(Model.intersectLiveIds(RUNNING_CMD, ''), '', 'mounted on the unanswered row (re init ""): not live');
  assert.equal(Model.intersectLiveIds(`${RUNNING_CMD}\nnew`, `old\n${RUNNING_CMD}`), RUNNING_CMD);
  // Once the reply starts (the agent message), mo starts at the steer row: the earlier command is no longer live.
  const answered = ITEMS.slice(0, ITEMS.findIndex(item => item.id === STEER) + 3);
  const after = Model.transcriptLiveScope({ ...SCOPE, items: answered });
  assert.equal(after.endsInUnansweredUserRow, false);
  assert.deepEqual([...after.liveRunningToolIds], []);
});

// ---------------------------------------------------------------------------------------------------------------------
// The common case (no user row in between). Codex unified exec hands a command's session back to the model after
// yield_time_ms (1000 here) with the process still running; the model goes on (thoughts, an answer, more tools) while the
// item stays inProgress until the process exits. In the same rollout, 10 times a command was still running when a later
// tool of the turn started; only exec-bd213b70 had a user row in between. On the desktop that command's tool call already
// has its result (a backgrounded Bash: completed, its process in the task list), so mo never counts it as running.

// (1) The screenshot's items without the steer row: the hotfix command yielded, then the model's thought, answer and edit.
const NO_STEER = ITEMS.filter(item => item.id !== STEER);

test('no steer: the yielded command is not live once the model has output after it; one mark holder, the tail', () => {
  const scope = Model.transcriptLiveScope({ ...SCOPE, items: NO_STEER });
  assert.equal(scope.endsInUnansweredUserRow, false);
  // Before the fix: [exec-bd213b70…] (the previous fix only cut the window at the answered steer row).
  assert.deepEqual([...scope.liveRunningToolIds], []);
  assert.equal(scope.lastTool?.name, 'Edit');
  const holders = markHolders(groupFileTools(NO_STEER, 'normal'), scope, true);
  assert.deepEqual(holders.map(holder => holder.row), [LAST_EDIT], `holders: ${JSON.stringify(holders)}`);
});

test('SSR, no steer: one clay mark, on the live tail', t => {
  if (!Rows || !Session) { t.skip('SSR unavailable in this environment'); return; }
  const h = React.createElement;
  const rows = groupFileTools(NO_STEER, 'normal');
  const html = renderToStaticMarkup(h(Rows.TranscriptRowsScope, { ...SCOPE, items: NO_STEER },
    rows.map((item, index) => h(Session.SourceMessage, { key: item.id, item, sessionKey: SCOPE.sessionKey, cwd: W, transcriptView: 'normal',
      liveTail: Model.toolRunLiveTail(rows, index, T, 'normal') }))));
  const marks = (html.match(/data-testid="TurnStatusClayMark"/g) ?? []).length;
  const marked = [...html.matchAll(/data-testid="TurnStatusClayMark"[\s\S]*?data-morph-key="([^"]*)"/g)].map(m => m[1]);
  const labels = [...html.matchAll(/data-morph-key="(busy\|[^"]*)"/g)].map(m => m[1]);
  // Before the fix: marks 2, ["busy|Running a command", "busy|Editing landing-performance-benchmark.cjs"].
  assert.deepEqual({ marks, marked }, { marks: 1, marked: ['busy|Editing landing-performance-benchmark.cjs'] }, `busy labels: ${JSON.stringify(labels)}`);
});

// (2) Another moment of the same rollout, 09:51:02–09:52:02Z: exec-7f386037 (node app/scripts/landing-performance-smoke.mjs)
// ran 59.8 s after yielding at 1 s; meanwhile the model polled it (write_stdin, no new item; thoughts at +22.3 s, +41.2 s,
// +50.9 s), said "源码相关的 29 项检查已通过…" at +50.9 s and started exec-5503995d at +59.5 s. At +59.6 s:
const SMOKE = 'exec-7f386037-ab3d-43f2-94b5-15c45550328b';
const PS = 'exec-5503995d-faf1-4032-8656-8b5869e92dc1';
const SMOKE_ITEMS = [
  { id: 'u-smoke', turnId: T, type: 'userMessage', content: [{ type: 'text', text: '…' }] },
  thought('rs_…316fb2200'),
  edit('exec-7922a2c3-0165-4b2c-9a59-72d4bc4ec917', 'app/scripts/landing-performance-smoke.mjs'),
  cmd('exec-ac04eb3a-0aa6-4d9e-acc8-7c0f5b05ac4e', 'node --input-type=module -e …'),
  cmd(SMOKE, 'node app/scripts/landing-performance-smoke.mjs', 'inProgress', { processId: '1' }),
  cmd('exec-fe0ee499-72a1-4507-8be0-d8ff9fab4251', 'node --test app/tests/landing-texture-host.test.mjs'),
  thought('rs_…3171c3bc4'), thought('rs_…3172f8a0c'), thought('rs_…31738f624'),
  { id: 'msg_00d88c6ca3147abb016ae31738f6208198b0e1fca21cdd50e7', turnId: T, type: 'agentMessage',
    text: '源码相关的 29 项检查已通过。…现在检查打包后的加载和交互，暂不把这项结果等同于整机掉帧已消除。' },
  cmd(PS, "ps -axo pid,ppid,pcpu,comm | rg 'landing-performance|OpenClaude Desktop'", 'inProgress', { processId: '2' }),
];

test('no steer, rollout +59.6 s: the smoke command yielded long ago; only the new command is live and holds the mark', () => {
  const scope = Model.transcriptLiveScope({ ...SCOPE, items: SMOKE_ITEMS });
  // Before the fix: [exec-7f386037…, exec-5503995d…] — two rows, two holders.
  assert.deepEqual([...scope.liveRunningToolIds], [PS]);
  assert.match(scope.lastTool?.input.command ?? '', /ps -axo pid,ppid,pcpu,comm/, 'the running ps wins the last tool');
  const holders = markHolders(groupFileTools(SMOKE_ITEMS, 'normal'), scope, true);
  assert.equal(holders.length, 1, `holders: ${JSON.stringify(holders)}`);
  assert.ok(holders[0].members.includes(PS) && !holders[0].members.includes(SMOKE));
  // Before its answer (+50.9 s) the smoke command's row is the only running row: the yield alone is not visible to the host,
  // and the model's thoughts at +22.3 s / +41.2 s already hand it back.
  const polling = Model.transcriptLiveScope({ ...SCOPE, items: SMOKE_ITEMS.slice(0, 6) });
  assert.deepEqual([...polling.liveRunningToolIds], [SMOKE]);
  assert.deepEqual([...Model.transcriptLiveScope({ ...SCOPE, items: SMOKE_ITEMS.slice(0, 7) }).liveRunningToolIds], []);
});

test('SSR, no steer, rollout +59.6 s: one clay mark, on the running ps row', t => {
  if (!Rows || !Session) { t.skip('SSR unavailable in this environment'); return; }
  const h = React.createElement;
  const rows = groupFileTools(SMOKE_ITEMS, 'normal');
  const html = renderToStaticMarkup(h(Rows.TranscriptRowsScope, { ...SCOPE, items: SMOKE_ITEMS },
    rows.map((item, index) => h(Session.SourceMessage, { key: item.id, item, sessionKey: SCOPE.sessionKey, cwd: W, transcriptView: 'normal',
      liveTail: Model.toolRunLiveTail(rows, index, T, 'normal') }))));
  const marks = (html.match(/data-testid="TurnStatusClayMark"/g) ?? []).length;
  const labels = [...html.matchAll(/data-morph-key="(busy\|[^"]*)"/g)].map(m => m[1]);
  // Before the fix: 2 marks (the smoke command's group and the ps row). The smoke command's row stays busy in place.
  assert.equal(marks, 1, `busy labels: ${JSON.stringify(labels)}`);
  assert.equal(labels.length, 2, `busy labels: ${JSON.stringify(labels)}`);
});
