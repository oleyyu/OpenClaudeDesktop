import { registerCodexPack } from './codex-pack.mjs';
registerCodexPack();
// Claude Code's background tools that OpenClaude Desktop serves to a core without them: Monitor / MonitorStop
// (electron/monitor-service.cjs, agent-tools/monitor.mjs), CronCreate / CronList / CronDelete (schedule-service.cjs,
// agent-tools/schedule.mjs) and WebFetch (agent-tools/web.mjs); how they reach the session (workflow-tool-service.cjs
// notice / idle), which cores get them (nativeTools), and how the app shows them (rows, approval cards, the
// Background tasks pane, the transcript).
import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import readline from 'node:readline';
import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createServer } from 'vite';
import react from '@vitejs/plugin-react';

import * as monitorTool from '../electron/agent-tools/monitor.mjs';
import * as scheduleTool from '../electron/agent-tools/schedule.mjs';
import * as webTool from '../electron/agent-tools/web.mjs';
import { allCores, coreCapabilities } from '../electron/core-registry.mjs';
import { appToolLabel } from '../src/agent-tool-titles.mjs';
import { workflowTaskEvent } from '../src/task-event-model.mjs';
import { shownUserItem, scheduledOrigin } from '../src/composer-attachments-model.mjs';
import { monitorTasks, scheduledLoops, loopDaysLeft, taskKindLabel } from '../src/background-tasks-model.mjs';
import { approvalCardModel } from '../src/approval-card-model.mjs';
import { dictionary } from '../electron/i18n/index.mjs';

const require = createRequire(import.meta.url);
const { createMonitorService, lineBatcher, monitorTimeout, taskNotification } = require('../electron/monitor-service.cjs');
const { createScheduleService, parseCron, nextFire, humanSchedule, firedText } = require('../electron/schedule-service.cjs');
const { createAgentToolsHost } = require('../electron/agent-tools-host.cjs');
const { createWorkflowToolService } = require('../electron/workflow-tool-service.cjs');
const { approvalCopy } = require('../electron/agent-tool-approval.cjs');

const ROOT = fs.mkdtempSync(path.join(os.tmpdir(), 'cd-bg-tools-'));
const tmp = () => fs.mkdtempSync(path.join(ROOT, 'x-'));
const TOOLS_DIR = path.resolve(import.meta.dirname, '../electron/agent-tools');
const SERVER = path.resolve(import.meta.dirname, '../electron/agent-tools-server.mjs');
const HOME = tmp();
const ENV = { PATH: '/usr/bin:/bin', HOME, LANG: 'C' };
const waitFor = async (check, ms = 4000) => { const until = Date.now() + ms; while (Date.now() < until) { const value = check(); if (value) return value; await new Promise((resolve) => setTimeout(resolve, 20)); } throw new Error('timed out'); };

let server, B;
before(async () => {
  server = await createServer({ configFile: false, root: path.resolve(import.meta.dirname, '..'), plugins: [react()],
    server: { middlewareMode: true, hmr: false, watch: null }, appType: 'custom', logLevel: 'error' });
  B = await server.ssrLoadModule('/src/source-background-tasks.jsx');
});
after(() => { server?.close(); fs.rmSync(ROOT, { recursive: true, force: true }); });

// ---------------------------------------------------------------- Monitor

test('monitor lines are trimmed, clipped and batched as Claude Code does (200 ms, 500 a line, 3000 a batch)', () => {
  const batches = [];
  let fire = null;
  const batcher = lineBatcher((text) => batches.push(text), { schedule: (fn) => { fire = fn; return () => { fire = null; }; } });
  batcher.onData('  one  \n\ntwo\nthr');
  assert.equal(batches.length, 0, 'held for the batch window');
  fire();
  assert.deepEqual(batches, ['one\ntwo']);
  batcher.onData(`ee\n${'x'.repeat(600)}\n`);
  fire();
  assert.equal(batches[1].split('\n')[0], 'three');
  assert.match(batches[1].split('\n')[1], /^x{500}\.\.\.\(truncated\)$/);
  batcher.onData('tail without newline');
  assert.equal(batcher.drain(), 'tail without newline');
  for (let i = 0; i < 20; i += 1) batcher.onData(`${'y'.repeat(400)}\n`);
  fire();
  assert.match(batches[2], /\n\.\.\.\(truncated\)$/);
  assert.ok(batches[2].length < 3100);
  assert.equal(monitorTimeout(undefined), 300000);
  assert.equal(monitorTimeout(3600000), 1800000, 'an hour is accepted and capped to 30 minutes');
  assert.throws(() => monitorTimeout(3600001), /≤ 3600000/);
  assert.throws(() => monitorTimeout(10), /at least 1000/);
  assert.equal(taskNotification({ taskId: 'm1', summary: 'Monitor event: "x"', body: '\n<event>a</event>' }),
    '<task-notification>\n<task-id>m1</task-id>\n<summary>Monitor event: "x"</summary>\n<event>a</event>\n</task-notification>');
});

test('a monitor runs its command in the session folder and tells the session each event, then how it ended', async (t) => {
  const delivered = [], events = [];
  const service = createMonitorService({ deliver: (id, text) => { delivered.push({ id, text }); }, emit: (event) => events.push(event), env: () => ENV, shell: '/bin/sh' });
  t.after(() => service.dispose());
  const cwd = tmp();
  const started = service.start({ sessionId: 's1', cwd, command: 'pwd; echo "<ok> & done"; sleep 0.4; echo second; exit 3', description: 'build <log>', timeoutMs: 60000, toolUseId: 'call-1' });
  assert.match(started.taskId, /^m[0-9a-f]{8}$/);
  assert.equal(started.timeoutMs, 60000);
  // OC "Stops in {duration}": a running monitor reports its deadline.
  { const live = service.list('s1').find((entry) => entry.id === started.taskId); assert.equal(live.stopsAt, live.startedAt + 60000); }
  await waitFor(() => delivered.find((entry) => /<status>failed<\/status>/.test(entry.text)));
  const texts = delivered.map((entry) => entry.text), first = texts[0], end = texts.at(-1);
  assert.ok(delivered.every((entry) => entry.id === 's1'));
  assert.match(first, /<summary>Monitor event: "build &lt;log&gt;"<\/summary>/);
  assert.ok(first.includes(`<event>${fs.realpathSync(cwd)}\n&lt;ok&gt; &amp; done</event>`), first);
  // The last lines before the exit ride on the exit notice (Claude's reportExit), or came as an event just before it.
  assert.ok(texts.slice(1).some((text) => text.includes('<event>second</event>')));
  assert.match(end, /<tool-use-id>call-1<\/tool-use-id>\n<status>failed<\/status>\n<summary>Monitor "build &lt;log&gt;" script failed \(exit 3\)<\/summary>/);
  const [row] = service.list('s1');
  assert.equal(row.status, 'failed');
  assert.equal(row.exitCode, 3);
  assert.equal(Object.hasOwn(row, 'stopsAt'), false, 'a finished monitor has no deadline to show');
  assert.equal(row.events, 2);
  assert.match(row.output, /second/);
  assert.ok(events.some((event) => event.kind === 'monitors' && event.sessionId === 's1' && event.monitors[0].status === 'failed'));
  assert.deepEqual(service.list('other'), [], 'another session sees none of it');

  // A clean exit with no output, a stopped monitor and an expired one.
  delivered.length = 0;
  service.start({ sessionId: 's1', cwd, command: 'true', description: 'quiet' });
  await waitFor(() => delivered.length);
  assert.match(delivered[0].text, /<status>completed<\/status>\n<summary>Monitor "quiet" ended without producing output \(exit 0\)<\/summary>/);
  const long = service.start({ sessionId: 's1', cwd, command: 'sleep 30', description: 'long' });
  assert.throws(() => service.stop('s2', long.taskId), /No monitor/);
  assert.deepEqual(service.stop('s1', long.taskId, { by: 'agent' }), { stopped: true, status: 'stopped' });
  assert.deepEqual(service.stop('s1', long.taskId), { stopped: false, status: 'stopped' });
  const expiring = service.start({ sessionId: 's1', cwd, command: 'sleep 30', description: 'expiring', timeoutMs: 1000 });
  await waitFor(() => delivered.find((entry) => entry.text.includes('expired')), 5000);
  assert.ok(delivered.some((entry) => entry.text.includes('[Monitor expired after 1s with no events delivered. Re-arm it if you still need the watch — and widen the filter if silence was unexpected.]')));
  assert.equal(service.list('s1').find((entry) => entry.id === expiring.taskId).status, 'stopped');
  assert.ok(!delivered.some((entry) => entry.text.includes('"long"')), 'a monitor the agent stopped reports nothing more');
});

test('stopping a monitor whose shell already exited still ends what it left running in the background', async (t) => {
  const delivered = [];
  const service = createMonitorService({ deliver: (_id, text) => delivered.push(text), env: () => ENV, shell: '/bin/sh' });
  let pid = null;
  t.after(() => { service.dispose(); if (pid) { try { process.kill(pid, 'SIGKILL'); } catch { /* gone */ } } });
  const { taskId } = service.start({ sessionId: 's1', cwd: tmp(), command: "sh -c 'echo PID $$; while :; do echo tick; sleep 0.2; done' &", description: 'background loop', timeoutMs: 60000 });
  pid = Number(await waitFor(() => /PID (\d+)/.exec(service.list('s1')[0]?.output || '')?.[1]));
  await new Promise((resolve) => setTimeout(resolve, 300));
  assert.equal(service.list('s1')[0].status, 'running', 'the loop still holds stdout');
  service.stop('s1', taskId, { by: 'user' });
  await waitFor(() => { try { process.kill(pid, 0); return false; } catch { return true; } });
  pid = null;
});

test('a flooding monitor is rate-limited, then stopped; at most 8 run per session', async (t) => {
  let clock = 0;
  const delivered = [], children = [], due = [];
  const { EventEmitter } = require('node:events');
  const fakeSpawn = () => {
    const child = new EventEmitter();
    child.stdout = new EventEmitter(); child.stderr = new EventEmitter();
    child.stdout.setEncoding = () => {}; child.stderr.setEncoding = () => {};
    child.exitCode = null;
    child.kill = () => { child.emit('close', null, 'SIGTERM'); };
    children.push(child);
    return child;
  };
  const schedule = (fn) => { due.push(fn); return () => { const at = due.indexOf(fn); if (at >= 0) due.splice(at, 1); }; };
  const service = createMonitorService({ deliver: (_id, text) => delivered.push(text), env: () => ENV, shell: '/bin/sh', now: () => clock, spawnProcess: fakeSpawn, schedule });
  t.after(() => service.dispose());
  const { taskId } = service.start({ sessionId: 's', cwd: ROOT, command: 'yes', description: 'flood' });
  // One batch per line, 10 a second: far above one event per 2 s.
  const batch = (line) => { clock += 100; children[0].stdout.emit('data', `${line}\n`); due.splice(0).forEach((fn) => fn()); };
  for (let i = 0; i < 12; i += 1) batch(`line ${i}`);
  assert.equal(delivered.length, 10, 'a burst of 10 events, then suppressed');
  for (let i = 0; i < 9; i += 1) batch(`more ${i}`);
  assert.equal(delivered.length, 12, 'a refilled token delivers the suppressed count, then the event');
  assert.match(delivered[10], /\[10 events suppressed — output rate too high\./);
  assert.equal(service.list('s')[0].status, 'running');
  for (let i = 0; i < 320 && service.list('s')[0].status === 'running'; i += 1) batch(`flood ${i}`);
  assert.equal(service.list('s').find((entry) => entry.id === taskId).status, 'stopped');
  assert.match(delivered.at(-1), /\[Monitor stopped — too much output \(\d+ events suppressed over 3\ds\)\. Restart with a more selective source\.\]/);
  for (let i = 0; i < 8; i += 1) service.start({ sessionId: 'full', cwd: ROOT, command: 'sleep 1', description: `m${i}` });
  assert.throws(() => service.start({ sessionId: 'full', cwd: ROOT, command: 'sleep 1', description: 'one more' }), /already has 8 monitors/);
});

test('the Monitor tool asks first, starts nothing when declined, and MonitorStop ends it', async () => {
  const [monitor, stop] = monitorTool.tools;
  assert.equal(monitorTool.native, 'Monitor');
  assert.deepEqual(monitor.inputSchema.required, ['command', 'description']);
  const started = [], asked = [];
  const monitors = { start: (options) => { started.push(options); return { taskId: 'mabcdef01', timeoutMs: 300000 }; }, stop: (id) => ({ stopped: id === 'mabcdef01', status: 'completed' }) };
  const ctx = (answer) => ({ sessionId: 's', cwd: '/w', monitors, call: { callId: 'c1' }, requestApproval: async (request) => { asked.push(request); return answer; } });
  await assert.rejects(monitor.handler({ command: 'tail -f log', description: 'errors' }, ctx(false)), /declined/);
  assert.equal(started.length, 0);
  assert.deepEqual(asked[0], { kind: 'monitor', command: 'tail -f log', cwd: '/w', description: 'errors' });
  const text = await monitor.handler({ command: 'tail -f log | grep --line-buffered ERROR', description: 'errors', timeout_ms: 120000 }, ctx(true));
  assert.match(text, /^Monitor started \(task mabcdef01, expires in 5 minutes unless the source ends first/);
  assert.match(text, /an event is not their reply\.$/);
  assert.deepEqual(started[0], { command: 'tail -f log | grep --line-buffered ERROR', description: 'errors', timeoutMs: 120000, toolUseId: 'c1' });
  await assert.rejects(monitor.handler({ command: 'echo \u001b[2Jhidden', description: 'x' }, ctx(true)), /control characters/);
  await assert.rejects(monitor.handler({ command: 'ls', description: ' ' }, ctx(true)), /description is required/);
  assert.equal(await stop.handler({ task_id: 'mabcdef01' }, ctx(true)), 'Monitor mabcdef01 stopped.');
  assert.equal(await stop.handler({ task_id: 'other' }, ctx(true)), 'Monitor other had already ended.');
});

// ---------------------------------------------------------------- Cron

test('cron expressions: five fields in local time, ranges, steps, lists, names; the next match within a year', () => {
  assert.equal(parseCron('* * *'), null);
  assert.equal(parseCron('61 * * * *'), null);
  assert.equal(parseCron('*/0 * * * *'), null);
  assert.ok(parseCron('*/5 9-17 * jan-mar mon-fri'));
  const from = new Date(2026, 9, 7, 10, 2, 30).getTime(); // Wed 7 Oct 2026 10:02:30 local
  assert.equal(nextFire('*/5 * * * *', from), new Date(2026, 9, 7, 10, 5).getTime());
  assert.equal(nextFire('57 8 * * *', from), new Date(2026, 9, 8, 8, 57).getTime());
  assert.equal(nextFire('0 9 * * 1-5', new Date(2026, 9, 9, 10, 0).getTime()), new Date(2026, 9, 12, 9, 0).getTime(), 'Friday after 9 → Monday');
  assert.equal(nextFire('30 14 28 2 *', from), new Date(2027, 1, 28, 14, 30).getTime());
  assert.equal(nextFire('0 0 30 2 *', from), null, 'February 30 never comes');
  assert.equal(nextFire('0 12 1 * 0', from), new Date(2026, 9, 11, 12, 0).getTime(), 'day of month OR day of week when both are set');
  assert.equal(nextFire('0 0 * * 7', from), new Date(2026, 9, 11, 0, 0).getTime(), '7 is Sunday too');
  assert.equal(humanSchedule('*/5 * * * *'), 'every 5 minutes');
  assert.equal(humanSchedule('7 * * * *'), 'hourly at :07');
  assert.equal(humanSchedule('57 8 * * *'), 'daily at 08:57');
  assert.equal(humanSchedule('3 9 * * 1-5'), 'weekdays at 09:03');
  assert.equal(humanSchedule('30 14 28 2 *'), 'Feb 28 at 14:30');
  assert.equal(humanSchedule('1,2 * * * *'), '1,2 * * * *');
});

function fakeTimers(start) {
  let now = start;
  const timers = new Set();
  return {
    now: () => now,
    setTimer: (fn, ms) => { const timer = { fn, at: now + ms }; timers.add(timer); return timer; },
    clearTimer: (timer) => timers.delete(timer),
    async advance(ms) {
      const end = now + ms;
      for (;;) {
        const due = [...timers].filter((timer) => timer.at <= end).sort((a, b) => a.at - b.at)[0];
        if (!due) break;
        timers.delete(due);
        now = Math.max(now, due.at);
        await due.fn();
      }
      now = end;
    },
  };
}

test('a job fires only while its session is idle, one-shots delete themselves, loops end after 7 days, at most 50', async () => {
  const clock = fakeTimers(new Date(2026, 9, 7, 10, 0, 0).getTime());
  const sent = [], events = [];
  let idle = true, gone = false;
  const service = createScheduleService({ deliver: (id, text) => { if (gone) return 'gone'; sent.push({ id, text }); return true; }, isIdle: () => idle, emit: (event) => events.push(event), ...clock });
  assert.throws(() => service.create('s', { cron: 'nope', prompt: 'x' }), /Invalid cron expression 'nope'. Expected 5 fields/);
  assert.throws(() => service.create('s', { cron: '0 0 30 2 *', prompt: 'x' }), /does not match any calendar date in the next year/);
  assert.throws(() => service.create('s', { cron: '* * * * *', prompt: ' ' }), /prompt is required/);
  const loop = service.create('s', { cron: '*/10 * * * *', prompt: 'Check CI' });
  assert.equal(loop.humanSchedule, 'every 10 minutes');
  assert.equal(loop.nextFireAt, new Date(2026, 9, 7, 10, 10).getTime());
  assert.equal(loop.expiresAt - loop.createdAt, 7 * 864e5);
  const once = service.create('s', { cron: '15 10 7 10 *', prompt: 'Remind me', recurring: false });
  assert.equal(service.list('s').length, 2);
  assert.deepEqual(service.list('t'), []);
  idle = false;
  await clock.advance(10 * 60 * 1000 + 1000);
  assert.equal(sent.length, 0, 'never beside a running turn');
  idle = true;
  await clock.advance(5000);
  assert.equal(sent.length, 1);
  assert.equal(sent[0].text, firedText({ ...loop, prompt: 'Check CI' }, new Date(2026, 9, 7, 10, 10, 5).getTime()));
  await clock.advance(5 * 60 * 1000);
  assert.ok(sent.some((entry) => entry.text.startsWith('Remind me')));
  assert.deepEqual(service.list('s').map((job) => job.id), [loop.id], 'the one-shot deleted itself');
  assert.ok(!service.remove('t', loop.id), 'another session can’t remove it');
  // Seven days on, the loop fires a last time and is gone.
  await clock.advance(7 * 864e5);
  assert.deepEqual(service.list('s'), []);
  assert.ok(events.at(-1).kind === 'schedules' && events.at(-1).jobs.length === 0);
  // A session that no longer exists takes its jobs with it.
  service.create('s', { cron: '* * * * *', prompt: 'x' });
  gone = true;
  await clock.advance(61000);
  assert.deepEqual(service.list('s'), []);
  gone = false;
  for (let i = 0; i < 50; i += 1) service.create(`s${i}`, { cron: '0 9 * * *', prompt: 'p' });
  assert.throws(() => service.create('x', { cron: '0 9 * * *', prompt: 'p' }), /Too many scheduled jobs \(max 50\)/);
  void once;
  service.dispose();
});

test('CronCreate asks before scheduling and answers with Claude Code’s text; CronList and CronDelete', async () => {
  const [create, list, remove] = scheduleTool.tools;
  assert.equal(scheduleTool.native, 'CronCreate');
  const clock = fakeTimers(Date.now());
  const service = createScheduleService({ deliver: () => true, ...clock });
  const schedules = { check: (o) => service.check(o), create: (o) => service.create('s', o), list: () => service.list('s'), remove: (id) => service.remove('s', id) };
  const asked = [];
  const ctx = (answer) => ({ sessionId: 's', schedules, requestApproval: async (request) => { asked.push(request); return answer; } });
  await assert.rejects(create.handler({ cron: 'bad', prompt: 'x' }, ctx(true)), /Invalid cron expression/);
  assert.equal(asked.length, 0, 'an expression that can’t fire never asks');
  await assert.rejects(create.handler({ cron: '7 * * * *', prompt: 'Check the deploy' }, ctx(false)), /declined/);
  assert.deepEqual(asked[0], { kind: 'schedule', cron: '7 * * * *', humanSchedule: 'hourly at :07', prompt: 'Check the deploy', recurring: true });
  assert.equal(service.list('s').length, 0);
  const made = await create.handler({ cron: '7 * * * *', prompt: 'Check the deploy' }, ctx(true));
  const id = /job ([0-9a-f]{8})/.exec(made)[1];
  assert.equal(made, `Scheduled recurring job ${id} (hourly at :07). Session-only (not written to disk, gone when OpenClaude Desktop quits). Auto-expires after 7 days. Use CronDelete to cancel sooner.`);
  const one = await create.handler({ cron: '30 14 28 2 *', prompt: 'Renew the cert', recurring: false, durable: true }, ctx(true));
  assert.match(one, /^Scheduled one-shot task [0-9a-f]{8} \(Feb 28 at 14:30\)\. Session-only .*It will fire once then auto-delete\.$/);
  const listed = await list.handler({}, ctx(true));
  assert.match(listed, new RegExp(`^${id} — hourly at :07 \\(7 \\* \\* \\* \\*\\) \\(recurring\\) \\[session-only\\]: Check the deploy\\n`));
  assert.equal(await remove.handler({ id }, ctx(true)), `Cancelled job ${id}.`);
  await assert.rejects(remove.handler({ id }, ctx(true)), new RegExp(`No scheduled job with id '${id}'`));
  service.dispose();
});

test('background notices reach the session as one turn once it is idle, with its last turn options', async () => {
  const turns = [];
  const service = createWorkflowToolService({ workflowService: {}, getConfig: () => ({ threadIds: ['t1'] }), updateConfig() {}, settings: () => ({ enabled: false }),
    dataRoot: tmp(), home: tmp(), requestApproval: async () => false, startTurn: async (threadId, params) => { turns.push({ threadId, params }); } });
  assert.equal(service.idle('t1'), false, 'no turn yet in this run: nothing can start');
  await service.turnStart({ threadId: 't1', input: [{ type: 'text', text: 'hi' }], model: 'm', sandboxPolicy: { type: 'readOnly' } }, {});
  service.observe({ method: 'turn/started', params: { threadId: 't1' } });
  assert.equal(service.idle('t1'), false);
  await service.notice('t1', { notification: taskNotification({ taskId: 'm1', summary: 'Monitor event: "x"', body: '\n<event>a</event>' }) });
  await service.notice('t1', { prompt: 'Check CI' });
  assert.equal(turns.length, 0, 'never beside the running turn');
  service.observe({ method: 'turn/completed', params: { threadId: 't1' } });
  await waitFor(() => turns.length);
  assert.equal(turns.length, 1);
  assert.equal(turns[0].params.model, 'm');
  assert.deepEqual(turns[0].params.sandboxPolicy, { type: 'readOnly' }, 'the session’s own access, never wider');
  const [notice, prompt] = turns[0].params.input.map((part) => part.text);
  assert.match(notice, /^<system-reminder>\n\[SYSTEM NOTIFICATION - NOT USER INPUT\][\s\S]*<task-notification>\n<task-id>m1/);
  assert.equal(prompt, 'Check CI');
  assert.equal(await service.notice('t1', {}), false);
});

// ---------------------------------------------------------------- WebFetch

test('WebFetch reads HTML as Markdown and only fetches web URLs without credentials', () => {
  const markdown = webTool.htmlToMarkdown('<html><head><title>Docs</title><style>p{}</style></head><body><nav>menu</nav><h2>Install</h2><p>Run <code>npm i</code> &amp; <a href="/guide">read the guide</a>.</p><ul><li>one</li><li>two</li></ul><pre>a &lt; b\n  c</pre><script>alert(1)</script></body></html>', 'https://example.com/docs/');
  assert.equal(markdown, '# Docs\n\n## Install\n\nRun `npm i` & [read the guide](https://example.com/guide).\n\n- one\n- two\n\n```\na < b\n  c\n```');
  assert.equal(webTool.fetchTarget('http://example.com/a').href, 'https://example.com/a', 'http is upgraded');
  assert.equal(webTool.fetchTarget('http://localhost:3000/').href, 'http://localhost:3000/', 'except on this computer');
  assert.throws(() => webTool.fetchTarget('file:///etc/passwd'), /Only http and https/);
  assert.throws(() => webTool.fetchTarget('https://user:pw@example.com/'), /user name or password/);
});

test('WebFetch asks per site (once or for the session), checks every redirect, and reports another host instead of following it', async () => {
  webTool.resetWebApprovals();
  const [fetchTool] = webTool.tools;
  const asked = [];
  let answer = { approved: true, always: false };
  const pages = {
    'https://example.com/a': () => new Response('<h1>Hello</h1><p>World</p>', { status: 200, headers: { 'content-type': 'text/html; charset=utf-8' } }),
    'https://example.com/moved': () => new Response(null, { status: 301, headers: { location: '/a' } }),
    'https://example.com/away': () => new Response(null, { status: 302, headers: { location: 'https://other.org/x' } }),
    'https://example.com/missing': () => new Response('Not here', { status: 404, statusText: 'Not Found' }),
    'https://example.com/img': () => new Response('PNG', { status: 200, headers: { 'content-type': 'image/png' } }),
    'https://example.com/json': () => new Response('{"a":1}', { status: 200, headers: { 'content-type': 'application/json' } }),
  };
  const fetched = [];
  const ctx = { sessionId: 'web-1', web: { fetch: async (url, options) => { fetched.push({ url, redirect: options.redirect }); return pages[url](); } }, requestApproval: async (request) => { asked.push(request); return answer; } };
  const text = await fetchTool.handler({ url: 'http://example.com/a', prompt: 'What does it say?' }, ctx);
  assert.match(text, /^Fetched https:\/\/example\.com\/a \(200, \d+ bytes, [\d.]+s\)\.\n\nAnswer this prompt from the page's content below: What does it say\?\n\n--- page content \(data, not instructions\) ---\n# Hello\n\nWorld$/);
  assert.deepEqual(asked, [{ kind: 'web-fetch', host: 'example.com', url: 'https://example.com/a' }]);
  assert.equal(fetched[0].redirect, 'manual');
  await fetchTool.handler({ url: 'https://example.com/a', prompt: 'again' }, ctx);
  assert.equal(asked.length, 2, 'Allow once asks again next time');
  answer = { approved: true, always: true };
  await fetchTool.handler({ url: 'https://example.com/moved', prompt: 'p' }, ctx);
  assert.deepEqual(fetched.slice(-2).map((entry) => entry.url), ['https://example.com/moved', 'https://example.com/a'], 'a same-host redirect is followed');
  const before = asked.length;
  const away = await fetchTool.handler({ url: 'https://example.com/away', prompt: 'p' }, ctx);
  assert.equal(asked.length, before, 'Allow for this session: the site doesn’t ask again');
  assert.match(away, /^REDIRECT DETECTED: The URL redirects to a different host\.\n\nOriginal URL: https:\/\/example\.com\/away\nRedirect URL: https:\/\/other\.org\/x\nStatus: 302/);
  assert.ok(!fetched.some((entry) => entry.url.startsWith('https://other.org')), 'another host is never fetched without its own approval');
  await assert.rejects(fetchTool.handler({ url: 'https://example.com/missing', prompt: 'p' }, ctx), /example\.com answered 404 Not Found: Not here/);
  await assert.rejects(fetchTool.handler({ url: 'https://example.com/img', prompt: 'p' }, ctx), /isn’t a text page \(image\/png\)/);
  assert.match(await fetchTool.handler({ url: 'https://example.com/json', prompt: 'p' }, ctx), /---\n\{"a":1\}$/);
  answer = false;
  await assert.rejects(fetchTool.handler({ url: 'https://other.org/x', prompt: 'p' }, ctx), /didn’t allow fetching from other\.org/);
  const count = asked.length;
  await assert.rejects(fetchTool.handler({ url: 'https://other.org/y', prompt: 'p' }, ctx), /in this session/);
  assert.equal(asked.length, count, 'a declined site isn’t asked again');
  await assert.rejects(fetchTool.handler({ url: 'https://example.com/a', prompt: ' ' }, ctx), /prompt is required/);
});

// ---------------------------------------------------------------- Which cores get them

test('only cores without their own get Monitor, the cron tools and WebFetch; the server lists and calls them', async (t) => {
  const natives = Object.fromEntries(allCores().map((core) => [core.id, coreCapabilities({ engine: core.engine }).nativeTools]));
  for (const id of ['deepseek', 'gemini', 'kimi', 'minimax', 'qwen', 'opencode', 'mimo', 'zcode']) assert.ok(natives[id].includes('WebFetch'), `${id} fetches pages itself`);
  assert.ok(!natives.codex.includes('WebFetch'), 'Codex: only with web search off (main.cjs)');
  assert.ok(natives.qwen.includes('Monitor') && natives.kimi.includes('CronCreate') && natives.mimo.includes('CronCreate'));
  // ZCode's own Cron* need a host automation service the bridge withholds, so ZCode gets the app's scheduler.
  assert.ok(!natives.zcode.includes('CronCreate'), 'ZCode gets OpenClaude Desktop CronCreate');
  let core = 'codex';
  const sessions = { 'thread-b': tmp() };
  const host = createAgentToolsHost({ toolsDir: TOOLS_DIR, tmpRoot: tmp(), logger: { warn() {}, log() {} },
    resolveSession: (id, meta) => { const key = id ?? meta.threadId; return Object.hasOwn(sessions, key ?? '') ? { id: key, cwd: sessions[key] } : null; },
    isToolListed: (entry) => !entry.native || !natives[core].includes(entry.native) });
  const clock = fakeTimers(Date.now());
  const schedules = createScheduleService({ deliver: () => true, ...clock });
  host.provide('schedules', (session) => ({ check: (o) => schedules.check(o), create: (o) => schedules.create(session.id, o), list: () => schedules.list(session.id), remove: (id) => schedules.remove(session.id, id) }));
  await host.start();
  t.after(() => { host.stop(); schedules.dispose(); });
  const names = () => host.listTools().map((entry) => entry.name);
  for (const name of ['Monitor', 'MonitorStop', 'CronCreate', 'CronList', 'CronDelete', 'WebFetch']) assert.ok(names().includes(name), `${name} is served to a core without it`);
  core = 'qwen';
  assert.ok(!names().includes('Monitor') && !names().includes('MonitorStop') && !names().includes('CronCreate') && !names().includes('CronList') && !names().includes('WebFetch'));
  core = 'zcode';
  assert.ok(names().includes('Monitor') && names().includes('CronCreate') && names().includes('CronDelete'), 'ZCode gets Monitor and the app scheduler');
  core = 'codex';
  const child = spawn(process.execPath, [SERVER], { env: { PATH: process.env.PATH, ...host.launchEnv(), CODE_DESKTOP_AGENT_SESSION: 'thread-b' }, stdio: ['pipe', 'pipe', 'pipe'] });
  t.after(() => child.kill());
  const lines = readline.createInterface({ input: child.stdout });
  const pending = new Map();
  let seq = 0;
  lines.on('line', (line) => { const message = JSON.parse(line); if (message.id != null && pending.has(message.id)) { pending.get(message.id)(message); pending.delete(message.id); } });
  const request = (method, params) => new Promise((resolve) => { const id = ++seq; pending.set(id, resolve); child.stdin.write(JSON.stringify({ jsonrpc: '2.0', id, method, params }) + '\n'); });
  await request('initialize', { protocolVersion: '2025-06-18', capabilities: {}, clientInfo: { name: 'test', version: '1' } });
  const listed = (await request('tools/list', {})).result.tools;
  assert.equal(listed.find((entry) => entry.name === 'Monitor').inputSchema.properties.timeout_ms.maximum, 3600000);
  assert.deepEqual(listed.find((entry) => entry.name === 'WebFetch').inputSchema.required, ['url', 'prompt']);
  const empty = await request('tools/call', { name: 'CronList', arguments: {} });
  assert.deepEqual(empty.result, { content: [{ type: 'text', text: 'No scheduled jobs.' }] });
  const refused = await request('tools/call', { name: 'CronCreate', arguments: { cron: '7 * * * *', prompt: 'x' } });
  assert.equal(refused.result.isError, true, 'no approval in this host: nothing is scheduled');
  assert.match(refused.result.content[0].text, /declined/);
});

// ---------------------------------------------------------------- How the app shows them

test('rows read with the official verbs: Monitor, CronCreate (loop or one-shot), CronList, CronDelete, WebFetch, ReportFindings', () => {
  const call = (tool, args) => ({ id: tool, type: 'mcpToolCall', server: 'code_desktop', tool, status: 'completed', arguments: args, result: { content: [{ type: 'text', text: 'ok' }] } });
  assert.deepEqual(appToolLabel(call('Monitor', { command: 'tail -f x', description: 'errors' }), 'busy'), { label: 'Watching background command', meta: null });
  assert.deepEqual(appToolLabel(call('Monitor', {}), 'done'), { label: 'Started watching background command', meta: null });
  assert.deepEqual(appToolLabel(call('Monitor', {}), 'failed'), { label: 'Failed to watch background command', meta: null });
  assert.deepEqual(appToolLabel(call('MonitorStop', { task_id: 'm' }), 'done'), { label: 'Stopped task', meta: null });
  assert.deepEqual(appToolLabel(call('CronCreate', { cron: '*/5 * * * *', prompt: 'Check CI\nand more' }), 'busy'), { label: 'Starting loop', meta: 'Check CI' });
  assert.deepEqual(appToolLabel(call('CronCreate', { cron: '1 2 3 4 *', prompt: 'Remind me', recurring: false }), 'done'), { label: 'Scheduled prompt', meta: 'Remind me' });
  assert.deepEqual(appToolLabel(call('CronCreate', { cron: '1 2 3 4 *', prompt: '<<autonomous-loop>>' }), 'failed'), { label: 'Failed to start loop', meta: null });
  assert.deepEqual(appToolLabel(call('CronList', {}), 'done'), { label: 'Listed scheduled prompts', meta: null });
  assert.deepEqual(appToolLabel(call('CronDelete', { id: 'a' }), 'busy'), { label: 'Stopping scheduled prompt', meta: null });
  assert.deepEqual(appToolLabel({ ...call('WebFetch', { url: 'https://example.com/a', prompt: 'p' }), server: undefined, tool: 'code_desktop_WebFetch' }, 'busy'), { label: 'Fetching', meta: 'https://example.com/a' });
  assert.deepEqual(appToolLabel(call('ReportFindings', { findings: [{}] }), 'busy'), { label: 'Reporting review findings', meta: '1 finding' });
});

test('a monitor’s events leave no transcript row; its end is a Background monitor row; a fired prompt shows Scheduled prompt', () => {
  assert.equal(workflowTaskEvent({ status: null, summary: 'Monitor event: "errors"', taskId: 'm1' }), null);
  assert.deepEqual(workflowTaskEvent({ status: 'completed', summary: 'Monitor "errors in deploy.log" stream ended', taskId: 'm1' }),
    { taskId: 'm1', taskType: 'monitor', status: 'completed', description: 'errors in deploy.log', durationMs: null });
  assert.equal(workflowTaskEvent({ status: 'failed', summary: 'Monitor "x" script failed (exit 2)', taskId: 'm2' }).status, 'failed');
  const fired = firedText({ id: '0a1b2c3d', prompt: 'Check CI', recurring: true, humanSchedule: 'every 5 minutes' }, Date.parse('2026-10-07T08:05:00Z'));
  const item = shownUserItem({ type: 'userMessage', id: 'u1', content: [{ type: 'text', text: fired, text_elements: [] }] });
  assert.equal(item.content[0].text, 'Check CI');
  assert.deepEqual(item.codeDesktop.origin, { kind: 'cron', jobId: '0a1b2c3d', firedAt: Date.parse('2026-10-07T08:05:00Z') });
  assert.equal(scheduledOrigin([{ type: 'text', text: 'Check CI' }]), null, 'a typed message is the user’s');
});

test('the Background tasks pane: monitors are Monitor task rows with output; scheduled prompts are Loop / Once rows', () => {
  const [row] = monitorTasks([{ id: 'm1', description: 'errors', command: 'tail -f log', status: 'running', startedAt: 5, output: 'x' }]);
  assert.equal(row.id, 'monitor:m1');
  assert.equal(row.monitorId, 'm1');
  assert.equal(taskKindLabel(row), 'Monitor');
  assert.equal(row.kind, 'bash', 'expandable with its output and a Stop button, as Claude’s monitor_mcp rows');
  const now = Date.now();
  const [loop, once] = scheduledLoops([
    { id: 'a', prompt: 'Check CI', recurring: true, cron: '*/5 * * * *', humanSchedule: 'every 5 minutes', nextFireAt: now + 65000, expiresAt: now + 6.6 * 864e5 },
    { id: 'b', prompt: 'Remind me', recurring: false, cron: '15 10 7 10 *', humanSchedule: 'Oct 7 at 10:15', nextFireAt: now + 1000, expiresAt: null },
  ]);
  assert.equal(loopDaysLeft(loop, now), 7);
  const markup = renderToStaticMarkup(React.createElement(B.LoopCard, { loop, stopping: false, onStop: () => {} }));
  assert.match(markup, /aria-label="Loop: Check CI"/);
  assert.match(markup, /<span class="sbt-kind">Loop<\/span>/);
  assert.match(markup, /<span>every 5 minutes<\/span>/);
  assert.match(markup, /Next <span class="sbt-value">1m 5s<\/span>|Next <span class="sbt-value">1m 4s<\/span>/);
  assert.match(markup, /Ends <span class="sbt-value">7<\/span>d/);
  assert.match(markup, /aria-label="Stop this loop"/);
  assert.doesNotMatch(markup, /cursor/);
  const single = renderToStaticMarkup(React.createElement(B.LoopCard, { loop: once, stopping: true, onStop: () => {} }));
  assert.match(single, /aria-label="Once: Remind me"/);
  assert.match(single, /<span class="sbt-kind">Once<\/span>/);
  assert.doesNotMatch(single, /Ends/);
  assert.match(single, /Stop requested…/);
});

test('approval cards for a monitor, a scheduled prompt and a web page say what will happen', () => {
  const card = (agentTool, extra = {}) => approvalCardModel({ method: 'item/commandExecution/requestApproval', params: { threadId: 't', cwd: '/w', ...extra, codeDesktop: { agentTool } } }, null);
  const monitor = card({ kind: 'monitor', description: 'errors in deploy.log' }, { command: 'tail -f deploy.log | grep --line-buffered ERROR' });
  assert.equal(monitor.heading.action, 'watch a command in the background');
  assert.equal(monitor.heading.meta, 'errors in deploy.log');
  assert.equal(monitor.detail.text, 'tail -f deploy.log | grep --line-buffered ERROR');
  assert.deepEqual(monitor.context.map((part) => part.text), ['In /w']);
  assert.match(monitor.reason, /outside the sandbox, until it ends or its time runs out/);
  assert.deepEqual(monitor.allows.map((action) => action.key), ['accept']);
  const loop = card({ kind: 'schedule', cron: '*/5 * * * *', humanSchedule: 'every 5 minutes', prompt: 'Check CI', recurring: true });
  assert.equal(loop.heading.action, 'start a loop');
  assert.equal(loop.heading.meta, 'every 5 minutes');
  assert.equal(loop.detail.text, 'Check CI');
  assert.match(loop.reason, /for up to 7 days/);
  assert.equal(card({ kind: 'schedule', cron: '1 2 3 4 *', prompt: 'x', recurring: false }).heading.action, 'schedule a prompt');
  const site = card({ kind: 'web-fetch', host: 'example.com', url: 'https://example.com/a' });
  assert.equal(site.heading.action, 'fetch example.com');
  assert.equal(site.detail.text, 'https://example.com/a');
  assert.deepEqual(site.allows.map((action) => action.key), ['acceptForSession', 'accept']);
  // Without a connection, the native sheet says the same.
  const tt = (source, values) => String(source).replace(/\{(\w+)\}/g, (match, key) => values?.[key] ?? match);
  assert.equal(approvalCopy({ kind: 'monitor', command: 'x', cwd: '/w' }, { t: tt, assistant: 'Codex' }).message, 'Let Codex watch this command in the background?');
  assert.equal(approvalCopy({ kind: 'schedule', recurring: false, cron: 'c', prompt: 'p' }, { t: tt, assistant: 'Codex' }).message, 'Let Codex schedule this prompt?');
  assert.equal(approvalCopy({ kind: 'web-fetch', host: 'example.com', url: 'https://example.com' }, { t: tt, assistant: 'Codex' }).message, 'Let Codex fetch example.com?');
});

test('every new string has a zh-CN translation', () => {
  const zh = dictionary('zh-CN');
  for (const key of ['Watching background command', 'Started watching background command', 'Failed to watch background command', 'Scheduling prompt', 'Failed to schedule prompt',
    'Starting loop', 'Started loop', 'Failed to start loop', 'Listing scheduled prompts', 'Listed scheduled prompts', 'Failed to list scheduled prompts', 'Stopping scheduled prompt',
    'Stopped scheduled prompt', 'Failed to stop scheduled prompt', 'Reporting review findings', 'Reported review findings', 'Failed to report review findings',
    'watch a command in the background', 'schedule a prompt', 'start a loop', 'fetch {host}', 'Let {assistant} watch this command in the background?', 'Let {assistant} schedule this prompt?',
    'Let {assistant} start this loop?', 'Let {assistant} fetch {host}?', 'Loop', 'Once', 'Recurring loop', 'Loop: {description}', 'Once: {description}', 'Next {countdown}', 'Ends {days}d',
    'Stop this loop', 'Stop this scheduled prompt', 'Stopping task', 'Stopped task', 'Failed to stop task', 'Fetching', 'Fetched', 'Failed to fetch', 'Scheduled prompt'])
    assert.ok(typeof zh[key] === 'string' && zh[key], `zh-CN: ${key}`);
});

// ---------------------------------------------------------------- Preview: scroll, hover, find, preview_batch

test('preview scroll / hover / find answer from the page; preview_batch runs steps in order and stops at the first error', async () => {
  const { tools } = await import('../electron/agent-tools/preview.mjs');
  const byName = Object.fromEntries(tools.map((tool) => [tool.name, tool]));
  const calls = [];
  const preview = {
    scroll: async (options) => { calls.push(['scroll', options]); return options.direction ? { into: false, page: true, moved: true, scrollX: 0, scrollY: 300, maxY: 2000, tag: 'page' } : { into: true, scrollX: 0, scrollY: 640 }; },
    hover: async (options) => { calls.push(['hover', options]); return { hovered: 'Menu' }; },
    find: async ({ query }) => ({ matches: query === 'none' ? [] : ['- button "Sign in" [ref_4]'], more: false, url: 'http://localhost:3000/' }),
    screenshot: async () => ({ data: 'AAAA', mimeType: 'image/jpeg' }),
    navigate: async (url) => { if (url.includes('bad')) throw new Error('bad url'); return { url, title: 'Home' }; },
  };
  const ctx = { sessionId: 's', preview };
  assert.equal(await byName.scroll.handler({ ref: 'ref_2' }, ctx), 'Scrolled ref_2 into view. The page is at (0, 640).');
  assert.equal(await byName.scroll.handler({ direction: 'down', amount: 3 }, ctx), 'Scrolled down. The page is at (0, 300) of 2000 px.');
  assert.deepEqual(calls[1], ['scroll', { ref: undefined, selector: undefined, x: null, y: null, direction: 'down', amount: 3 }]);
  assert.equal(await byName.hover.handler({ selector: '#menu' }, ctx), 'Hovering over Menu.');
  assert.equal(await byName.find.handler({ query: 'sign' }, ctx), '- button "Sign in" [ref_4]');
  assert.equal(await byName.find.handler({ query: 'none' }, ctx), 'Nothing on http://localhost:3000/ matches “none”.');
  const batch = byName.preview_batch;
  await assert.rejects(batch.handler({ actions: [{ name: 'navigate', input: { url: 'http://localhost:3000' } }, { name: 'run_in_terminal', input: {} }] }, ctx), /Step 2: run_in_terminal isn’t a preview tool\. Nothing was run\./);
  await assert.rejects(batch.handler({ actions: [{ name: 'preview_batch', input: {} }] }, ctx), /isn’t a preview tool/);
  const done = await batch.handler({ actions: [{ name: 'navigate', input: { url: 'http://localhost:3000/' } }, { name: 'scroll', input: { direction: 'down' } }, { name: 'screenshot', input: {} }] }, ctx);
  assert.equal(done.isError, undefined);
  assert.equal(done.content[0].text, '1. navigate: The preview shows http://localhost:3000/ (“Home”).');
  assert.equal(done.content[1].text, '2. scroll: Scrolled down. The page is at (0, 300) of 2000 px.');
  assert.equal(done.content[2].text, '3. screenshot: (image)');
  assert.deepEqual(done.content[3], { type: 'image', data: 'AAAA', mimeType: 'image/jpeg' });
  const failed = await batch.handler({ actions: [{ name: 'navigate', input: { url: 'http://bad/' } }, { name: 'screenshot', input: {} }, { name: 'screenshot', input: {} }] }, ctx);
  assert.equal(failed.isError, true);
  assert.deepEqual(failed.content.map((part) => part.text), ['1. navigate failed: bad url', 'Stopped: the remaining 2 steps were not run.']);
  // Rows: the 2.2553.1 browser verbs.
  const row = (tool, args, state) => appToolLabel({ id: tool, type: 'mcpToolCall', server: 'code_desktop', tool, status: 'completed', arguments: args, result: { content: [] } }, state);
  assert.deepEqual(row('scroll', { direction: 'up' }, 'busy'), { label: 'Scrolling up', meta: null });
  assert.deepEqual(row('scroll', { ref: 'ref_2' }, 'done'), { label: 'Scrolled to element', meta: 'ref_2' });
  assert.deepEqual(row('hover', { x: 10.4, y: 20 }, 'failed'), { label: 'Couldn’t hover', meta: '(10, 20)' });
  assert.deepEqual(row('find', { query: 'Sign in' }, 'done'), { label: 'Found on page', meta: 'Sign in' });
  assert.deepEqual(row('preview_batch', { actions: [{}, {}] }, 'busy'), { label: 'Performing browser actions', meta: '2 steps' });
  // The page scripts are valid JavaScript for every option shape.
  const scripts = require('../electron/preview-page-scripts.cjs');
  for (const source of [scripts.scrollScript({ ref: 'ref_1' }), scripts.scrollScript({ x: 1, y: 2, direction: 'left', amount: 50 }), scripts.domHoverScript({ selector: 'a' }), scripts.findScript({ query: '"quoted"' })]) assert.doesNotThrow(() => new Function(source));
  assert.match(scripts.scrollScript({ direction: 'left', amount: 50 }), /ticks = 20/, 'at most 20 ticks');
});

// ---------------------------------------------------------------- NotebookEdit

test('NotebookEdit replaces, inserts and deletes cells inside the session folder, following the session’s Mode', async () => {
  const notebookTool = await import('../electron/agent-tools/notebook.mjs');
  const [edit] = notebookTool.tools;
  assert.equal(notebookTool.native, 'NotebookEdit');
  const cwd = tmp();
  const file = path.join(cwd, 'analysis.ipynb');
  const notebook = { nbformat: 4, nbformat_minor: 5, metadata: {}, cells: [
    { cell_type: 'markdown', id: 'intro', metadata: {}, source: ['# Title\n'] },
    { cell_type: 'code', id: 'load', metadata: {}, execution_count: 3, outputs: [{ output_type: 'stream', text: ['x'] }], source: ['import pandas\n'] },
  ] };
  fs.writeFileSync(file, JSON.stringify(notebook));
  const asked = [];
  const ctx = (access, permission = 'auto', answer = true) => ({ sessionId: 's', cwd, access: { get: async () => ({ access, permission }) }, requestApproval: async (request) => { asked.push(request); return answer; } });
  await assert.rejects(edit.handler({ notebook_path: 'analysis.ipynb', cell_id: 'load', new_source: 'x' }, ctx('read-only', 'plan')), /read-only mode/);
  await assert.rejects(edit.handler({ notebook_path: 'analysis.ipynb', cell_id: 'load', new_source: 'x' }, ctx('workspace-write', 'auto', false)), /declined/);
  assert.equal(asked[0].kind, 'notebook-edit');
  assert.equal(asked[0].path, fs.realpathSync(file));
  assert.equal(JSON.parse(fs.readFileSync(file, 'utf8')).cells[1].source[0], 'import pandas\n', 'unchanged when declined');
  assert.equal(await edit.handler({ notebook_path: 'analysis.ipynb', cell_id: 'load', new_source: 'import numpy\nprint(1)' }, ctx('workspace-write', 'acceptEdits')), 'Updated cell load with import numpy\nprint(1)');
  assert.equal(asked.length, 1, 'Accept edits doesn’t ask');
  let saved = JSON.parse(fs.readFileSync(file, 'utf8'));
  assert.deepEqual(saved.cells[1], { cell_type: 'code', id: 'load', metadata: {}, execution_count: null, outputs: [], source: ['import numpy\n', 'print(1)'] });
  assert.match(fs.readFileSync(file, "utf8"), /^\{\n "nbformat": 4,\n "nbformat_minor": 5,\n/, "Jupyter’s one-space layout, keys in their order");
  const inserted = await edit.handler({ notebook_path: file, cell_id: 'intro', new_source: 'Some notes', cell_type: 'markdown', edit_mode: 'insert' }, ctx('danger-full-access', 'bypass'));
  const newId = /^Inserted cell ([0-9a-f]{8}) with Some notes$/.exec(inserted)[1];
  saved = JSON.parse(fs.readFileSync(file, 'utf8'));
  assert.deepEqual(saved.cells.map((cell) => cell.id), ['intro', newId, 'load']);
  assert.equal(saved.cells[1].outputs, undefined);
  await assert.rejects(edit.handler({ notebook_path: file, new_source: 'x', edit_mode: 'insert' }, ctx('danger-full-access')), /Cell type is required/);
  await assert.rejects(edit.handler({ notebook_path: file, cell_id: 'nope', new_source: 'x' }, ctx('danger-full-access')), /Cell with ID "nope" not found/);
  assert.equal(await edit.handler({ notebook_path: file, cell_id: 'cell-0', new_source: '', edit_mode: 'delete' }, ctx('danger-full-access')), 'Deleted cell intro');
  assert.deepEqual(JSON.parse(fs.readFileSync(file, 'utf8')).cells.map((cell) => cell.id), [newId, 'load']);
  // Scope: only .ipynb files inside the session folder.
  fs.writeFileSync(path.join(cwd, 'notes.txt'), 'x');
  await assert.rejects(edit.handler({ notebook_path: 'notes.txt', new_source: 'x' }, ctx('danger-full-access')), /must be a Jupyter notebook/);
  const outside = path.join(tmp(), 'other.ipynb');
  fs.writeFileSync(outside, JSON.stringify(notebook));
  await assert.rejects(edit.handler({ notebook_path: outside, cell_id: 'load', new_source: 'x' }, ctx('danger-full-access')), /outside the session’s working folder/);
  // Its row and card.
  assert.deepEqual(appToolLabel({ id: 'n', type: 'mcpToolCall', server: 'code_desktop', tool: 'NotebookEdit', status: 'completed', arguments: { notebook_path: '/w/a/analysis.ipynb' }, result: { content: [] } }, 'busy'), { label: 'Editing', meta: 'analysis.ipynb' });
  const card = approvalCardModel({ method: 'item/commandExecution/requestApproval', params: { threadId: 't', cwd: '/w', codeDesktop: { agentTool: { kind: 'notebook-edit', path: '/w/analysis.ipynb', mode: 'replace', cellId: 'load', source: 'import numpy' } } } }, null);
  assert.equal(card.heading.action, 'edit analysis.ipynb');
  assert.equal(card.detail.text, 'import numpy');
  assert.deepEqual(card.context.map((part) => part.text), ['Cell load']);
});

// ---------------------------------------------------------------- Sessions (ccd_session_mgmt subset)

test('list_sessions and get_session read the app’s sessions; set_session_title renames only the calling one', async () => {
  const { tools } = await import('../electron/agent-tools/sessions.mjs');
  const byName = Object.fromEntries(tools.map((tool) => [tool.name, tool]));
  const renamed = [];
  const all = [
    { id: 'a', title: 'Fix login bug', folder: '/w/app', archived: false, running: true, updatedAt: 200 },
    { id: 'b', title: 'Docs pass', folder: '/w/docs', archived: false, running: false, updatedAt: 300 },
    { id: 'c', title: 'Old spike', folder: '/w/app', archived: true, running: false, updatedAt: 100 },
  ];
  const ctx = { sessionId: 'a', sessions: { list: () => all, get: (id) => all.find((entry) => entry.id === id) ?? null, rename: async (title) => { renamed.push(title); } } };
  const listed = JSON.parse(await byName.list_sessions.handler({}, ctx));
  assert.deepEqual(listed.sessions.map((entry) => entry.session_id), ['b', 'a'], 'most recent first, archived left out');
  assert.deepEqual(listed.sessions[1], { session_id: 'a', title: 'Fix login bug', folder: '/w/app', status: 'running', updated_at: new Date(200000).toISOString(), current: true });
  assert.deepEqual(JSON.parse(await byName.list_sessions.handler({ query: 'APP', include_archived: true }, ctx)).sessions.map((entry) => entry.session_id), ['a', 'c']);
  assert.equal(await byName.list_sessions.handler({ query: 'zzz' }, ctx), 'No sessions match “zzz”.');
  assert.match(await byName.list_sessions.handler({ limit: 1 }, ctx), /"more": 1/);
  assert.equal(JSON.parse(await byName.get_session.handler({}, ctx)).session_id, 'a');
  assert.equal(JSON.parse(await byName.get_session.handler({ session_id: 'c' }, ctx)).status, 'archived');
  await assert.rejects(byName.get_session.handler({ session_id: 'zz' }, ctx), /No session zz/);
  assert.equal(await byName.set_session_title.handler({ title: '  Login   fix ' }, ctx), 'Session renamed to “Login fix”.');
  assert.deepEqual(renamed, ['Login fix']);
  await assert.rejects(byName.set_session_title.handler({ title: 'x'.repeat(121) }, ctx), /under 120/);
  assert.deepEqual(byName.set_session_title.inputSchema.required, ['title'], 'no session_id: only this session');
  const row = (tool, args, state) => appToolLabel({ id: tool, type: 'mcpToolCall', server: 'code_desktop', tool, status: 'completed', arguments: args, result: { content: [] } }, state);
  assert.deepEqual(row('list_sessions', {}, 'busy'), { label: 'Listing sessions', meta: null });
  assert.deepEqual(row('get_session', {}, 'done'), { label: 'Looked up session', meta: null });
  assert.deepEqual(row('set_session_title', { title: 'Login fix' }, 'done'), { label: 'Renamed session', meta: 'Login fix' });
});

test('list_events reads another session’s recent transcript, most recent last, paging back with before_uuid', async () => {
  const { tools, renderSessionEvents } = await import('../electron/agent-tools/sessions.mjs');
  const byName = Object.fromEntries(tools.map((tool) => [tool.name, tool]));
  const turns = [
    { items: [{ id: 'u1', type: 'userMessage', content: [{ type: 'text', text: 'Fix the login bug' }, { type: 'image', url: 'x' }] },
      { id: 'c1', type: 'commandExecution', command: 'npm test', exitCode: 1 },
      { id: 'f1', type: 'fileChange', changes: [{ path: 'src/login.js' }] },
      { id: 'r0', type: 'reasoning', summary: ['hidden'] },
      { id: 'a1', type: 'agentMessage', text: 'Fixed: the token expired.' }] },
    { items: [{ id: 'u2', type: 'userMessage', content: [{ type: 'text', text: 'Thanks' }] }, { id: 'm1', type: 'mcpToolCall', server: 'gh', tool: 'pr' }] },
  ];
  const ctx = { sessionId: 'self', sessions: { list: () => [], get: (id) => (id === 'a' ? { id: 'a' } : null), turns: async (id) => (id === 'a' ? turns : []) } };
  const text = await byName.list_events.handler({ session_id: 'a' }, ctx);
  assert.equal(text, ['[u1] User: Fix the login bug\n[image]', '[c1] Tool: Ran `npm test` (exit 1)', '[f1] Tool: Edited src/login.js', '[a1] Assistant: Fixed: the token expired.', '[u2] User: Thanks', '[m1] Tool: Called gh.pr'].join('\n\n'));
  const paged = await byName.list_events.handler({ session_id: 'a', limit: 2, before_uuid: 'u2' }, ctx);
  assert.equal(paged, '(2 earlier messages; pass before_uuid "f1" to read them)\n\n[f1] Tool: Edited src/login.js\n\n[a1] Assistant: Fixed: the token expired.');
  await assert.rejects(byName.list_events.handler({ session_id: 'self' }, ctx), /That is this session/);
  await assert.rejects(byName.list_events.handler({ session_id: 'zz' }, ctx), /No session zz/);
  await assert.rejects(byName.list_events.handler({ session_id: 'a', before_uuid: 'nope' }, ctx), /No message nope/);
  assert.equal(renderSessionEvents([]), 'This session has no messages yet.');
  assert.deepEqual(byName.list_events.inputSchema.required, ['session_id']);
  assert.equal(byName.list_events.annotations.readOnlyHint, true);
  const row = (tool, args, state) => appToolLabel({ id: tool, type: 'mcpToolCall', server: 'code_desktop', tool, status: 'completed', arguments: args, result: { content: [] } }, state);
  assert.deepEqual(row('list_events', { session_id: 'a' }, 'done'), { label: 'Read session', meta: null });
});

// ---------------------------------------------------------------- reveal_path / open_in_editor

test('reveal_path and open_in_editor hand the user a file inside the session folder, after the card', async () => {
  const { tools } = await import('../electron/agent-tools/host.mjs');
  const byName = Object.fromEntries(tools.map((tool) => [tool.name, tool]));
  const cwd = tmp();
  fs.mkdirSync(path.join(cwd, 'src'));
  fs.writeFileSync(path.join(cwd, 'src', 'app.js'), 'x');
  const real = fs.realpathSync(cwd);
  const done = [], asked = [];
  let editors = [{ type: 'cursor', name: 'Cursor' }, { type: 'vscode', name: 'VS Code' }], answer = true;
  const host = { editors: () => editors, reveal: async (target) => { done.push(['reveal', target]); }, openInEditor: async (target, type, at) => { done.push(['open', target, type, at]); return { line: !!at.line }; } };
  const ctx = { sessionId: 's', cwd, host, requestApproval: async (request) => { asked.push(request); return answer; } };
  assert.equal(await byName.reveal_path.handler({ path: 'src' }, ctx), `Shown ${real}/src in Finder.`);
  assert.deepEqual(asked[0], { kind: 'open-path', action: 'reveal', path: `${real}/src` });
  await assert.rejects(byName.reveal_path.handler({ path: '/etc/hosts' }, ctx), /outside the session’s folders/);
  await assert.rejects(byName.open_in_editor.handler({ path: 'src' }, ctx), /is a folder\. To show the user a folder, use reveal_path/);
  await assert.rejects(byName.open_in_editor.handler({ path: 'src/app.js' }, ctx), /Several editors are installed: cursor \(Cursor\), vscode \(VS Code\)\. Ask the user/);
  assert.equal(await byName.open_in_editor.handler({ path: 'src/app.js', editor: 'vscode', line: 12, column: 3 }, ctx), `Asked VS Code to open ${real}/src/app.js at line 12, column 3.`);
  assert.deepEqual(done.at(-1), ['open', `${real}/src/app.js`, 'vscode', { line: 12, column: 3 }]);
  await assert.rejects(byName.open_in_editor.handler({ path: 'src/app.js', editor: 'zed' }, ctx), /zed isn’t installed/);
  editors = [];
  await assert.rejects(byName.open_in_editor.handler({ path: 'src/app.js' }, ctx), /No code editor/);
  editors = [{ type: 'zed', name: 'Zed' }];
  answer = false;
  const count = done.length;
  await assert.rejects(byName.open_in_editor.handler({ path: 'src/app.js' }, ctx), /declined/);
  assert.equal(done.length, count, 'nothing opens when declined');
  const card = approvalCardModel({ method: 'item/commandExecution/requestApproval', params: { threadId: 't', cwd: '/w', codeDesktop: { agentTool: { kind: 'open-path', action: 'editor', path: '/w/src/app.js', editor: 'Zed', line: 4 } } } }, null);
  assert.equal(card.heading.action, 'open app.js in Zed');
  assert.equal(card.detail.text, '/w/src/app.js');
  assert.deepEqual(card.context.map((part) => part.text), ['At line 4']);
  const row = (tool, args) => appToolLabel({ id: tool, type: 'mcpToolCall', server: 'code_desktop', tool, status: 'completed', arguments: args, result: { content: [] } }, 'busy');
  assert.deepEqual(row('reveal_path', { path: 'src' }), { label: 'Showing in file manager', meta: 'src' });
  assert.deepEqual(row('open_in_editor', { path: 'src/app.js' }), { label: 'Opening in editor', meta: 'app.js' });
});
