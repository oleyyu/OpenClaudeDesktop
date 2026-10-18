// R4i-routines RI1 (D45): the official local scheduler's dispatch jitter, ported into electron/local-routines.mjs.
// The reference functions below transcribe 2.42304.0 asar index.chunk-muI2IV6k.js (ita, Zea with Z2/$2/Hea/Wea/Kea/n4/t4,
// getJitterSecondsForTask) with `new Date()` replaced by an injected time.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { createLocalRoutines, jitterHash, cronIntervalMinutes, jitterSecondsForTask, DISPATCH_JITTER_MAX_MINUTES } from '../electron/local-routines.mjs';
import { captureRoutineOptions } from '../electron/routine-runner.mjs';

const official = (() => {
  const ita = (e, t) => t <= 0 ? 0 : createHash('sha256').update(e).digest().readUInt32BE(0) % t;
  const Z2 = e => { const t = e.trim().split(/\s+/); if (t.length !== 5) throw Error(`Invalid cron expression: expected 5 fields, got ${t.length}`); return { minute: t[0], hour: t[1], dayOfMonth: t[2], month: t[3], dayOfWeek: t[4] }; };
  function $2(e, t, n = 0) {
    if (e === '*') return true;
    if (e.includes(',')) return e.split(',').some(e => $2(e.trim(), t, n));
    if (e.includes('/')) { const [r, i] = e.split('/'), a = parseInt(i, 10); if (r === '*') return (t - n) % a === 0; if (r.includes('-')) { const [e, n] = r.split('-').map(e => parseInt(e, 10)); return t >= e && t <= n && (t - e) % a === 0; } const o = parseInt(r, 10); return t >= o && (t - o) % a === 0; }
    if (e.includes('-')) { const [n, r] = e.split('-').map(e => parseInt(e, 10)); return t >= n && t <= r; }
    return parseInt(e, 10) === t;
  }
  const e4 = 6e4;
  const t4 = e => `${e.getFullYear()}-${e.getMonth()}-${e.getDate()}-${e.getHours()}-${e.getMinutes()}`;
  const Hea = (e, t) => $2(e, t) || t === 0 && $2(e, 7);
  const Wea = e => !e.dayOfMonth.startsWith('*') && !e.dayOfWeek.startsWith('*');
  const Kea = (e, t) => { const n = $2(e.dayOfMonth, t.getDate(), 1), r = Hea(e.dayOfWeek, t.getDay()); return Wea(e) ? n || r : n && r; };
  const n4 = (e, t) => $2(e.minute, t.getMinutes()) && $2(e.hour, t.getHours()) && $2(e.month, t.getMonth() + 1, 1) && Kea(e, t);
  function Zea(e, now, t = 60) {
    try {
      const n = Z2(e), r = new Date(now); r.setUTCSeconds(0, 0); r.setTime(r.getTime() + e4);
      let a = null, o = null;
      for (let e = 0; e < t; e++) { if (n4(n, r)) { if (a === null) a = new Date(r), o = t4(r); else if (t4(r) !== o) return Math.round((r.getTime() - a.getTime()) / e4); } r.setTime(r.getTime() + e4); }
      return null;
    } catch { return null; }
  }
  // getJitterSecondsForTask with Sy(...)=t (default 10); host field names cron for cronExpression.
  function jitter(task, now, t = 10) {
    if (t <= 0) return 0;
    if (!task || task.disableJitter || !task.cron) return 0;
    const r = Zea(task.cron, now), i = r === null ? t : Math.min(t, r - 1);
    return i <= 0 ? 0 : ita(task.id, i * 60);
  }
  return { ita, Zea, jitter };
})();

test('ita: sha256(taskId) first 4 bytes mod the limit, 0 for no limit', () => {
  const rows = [['jitter-fixture', 600], ['jitter-fixture', 240], ['task-a', 600], ['task-b', 60], ['3f2504e0-4f89-11d3-9a0c-0305e82c3301', 540],
    ['', 600], ['长名字', 600], ['x', 1], ['x', 0], ['x', -60]];
  for (const [id, limit] of rows) assert.equal(jitterHash(id, limit), official.ita(id, limit), `${id} % ${limit}`);
  assert.equal(jitterHash('jitter-fixture', 600), 463);
  assert.equal(jitterHash('x', 0), 0);
  assert.equal(DISPATCH_JITTER_MAX_MINUTES, 10);
});

test('Zea: the cron interval inside a 60-minute window, matching the official formula over a table', () => {
  const crons = ['* * * * *', '*/5 * * * *', '*/7 * * * *', '*/30 * * * *', '0 * * * *', '0 9 * * *', '0,45 * * * *', '15,20 * * * *',
    '0 9 * * 1-5', '0-10 * * * *', '30 */2 * * *', '0,30 9 * * *', '*/15 9-17 * * 1-5', '0 0 1 * *', '5 4 * * 0', '5 4 * * 7'];
  const times = [new Date(2026, 9, 11, 9, 0), new Date(2026, 9, 11, 8, 59, 30), new Date(2026, 9, 11, 9, 14), new Date(2026, 9, 11, 23, 55),
    new Date(2026, 9, 31, 23, 40), new Date(2026, 9, 17, 16, 50), new Date(2026, 9, 18, 4, 0)].map(date => date.getTime());
  for (const expression of crons) for (const now of times)
    assert.equal(cronIntervalMinutes(expression, { now }), official.Zea(expression, now), `${expression} @ ${new Date(now).toString()}`);
  const at = new Date(2026, 9, 11, 9, 0).getTime();
  assert.equal(cronIntervalMinutes('* * * * *', { now: at }), 1);
  assert.equal(cronIntervalMinutes('*/5 * * * *', { now: at }), 5);
  assert.equal(cronIntervalMinutes('0 * * * *', { now: at }), null);
  assert.equal(cronIntervalMinutes('0,45 * * * *', { now: at }), 15);
  assert.equal(cronIntervalMinutes('not a cron', { now: at }), null);
});

test('getJitterSecondsForTask: capped at 10 minutes and below the interval; none for fireAt, disableJitter or a zero cap', () => {
  const now = new Date(2026, 9, 11, 9, 0).getTime();
  const tasks = [{ id: 'jitter-fixture', cron: '0 9 * * *' }, { id: 'jitter-fixture', cron: '*/5 * * * *' }, { id: 'task-a', cron: '* * * * *' },
    { id: 'task-a', cron: '*/30 * * * *' }, { id: 'task-b', cron: '0,45 * * * *' }, { id: 'task-b', cron: '*/2 * * * *' },
    { id: 'jitter-fixture', cron: '0 9 * * *', disableJitter: true }, { id: 'jitter-fixture', cron: null, fireAt: now + 6e4 }];
  for (const task of tasks) for (const maxMinutes of [10, 3, 0])
    assert.equal(jitterSecondsForTask(task, { now, maxMinutes }), official.jitter(task, now, maxMinutes), `${JSON.stringify(task)} max ${maxMinutes}`);
  assert.equal(jitterSecondsForTask(tasks[0], { now }), 463);
  assert.equal(jitterSecondsForTask(tasks[1], { now }), 103);   // min(10, 5-1) minutes
  assert.equal(jitterSecondsForTask(tasks[2], { now }), 0);     // every minute: no room
  assert.equal(jitterSecondsForTask(tasks[6], { now }), 0);
  assert.equal(jitterSecondsForTask(tasks[7], { now }), 0);
});

// Injected clock and timers: nothing really waits.
async function fixture(t, { launch } = {}) {
  const dataDir = await fs.mkdtemp(path.join(os.tmpdir(), 'local-routines-jitter-'));
  let state = [], clock = new Date(2026, 9, 11, 8, 0).getTime(), seq = 0;
  const timers = new Map(), launches = [];
  const options = { coreId: 'fixture', model: 'fixture-model', effort: 'low', permission: 'ask', networkAccess: false };
  const make = () => createLocalRoutines({ getState: () => state, commit: value => { state = structuredClone(value); },
    dataDir, approveFolder: value => value,
    captureOptions: async (execution, previous) => captureRoutineOptions({ config: options, coreId: 'fixture', models: [{ model: 'fixture-model' }], execution, previous }),
    launch: launch ?? (async (task, { attach }) => { launches.push({ id: task.id, at: clock }); attach(`thread-${launches.length}`); return { turnId: 'turn' }; }),
    now: () => clock, setTimer: (fn, ms) => { const id = ++seq; timers.set(id, { fn, at: clock + ms, ms }); return id; }, clearTimer: id => { timers.delete(id); } });
  const service = make();
  t.after(async () => { service.dispose(); await fs.rm(dataDir, { recursive: true, force: true }); });
  // The jitter timer is the one not armed for the stored deadline.
  const jitterTimers = () => [...timers.entries()].filter(([, timer]) => timer.ms > 0 && timer.ms === 463e3);
  return { service, make, dataDir, launches, timers, jitterTimers, now: () => clock, setTime: value => { clock = value; },
    state: () => structuredClone(state), restore: value => { state = structuredClone(value); },
    async seed(patch = {}) {
      const task = await service.request({ action: 'create', kind: 'code', name: 'Morning brief', prompt: 'Summarize.', cron: '0 9 * * *', folder: dataDir });
      // A fixed id so the jitter is known: sha256('jitter-fixture') mod 600 = 463 seconds.
      state = state.map(row => row.id === task.id ? { ...row, id: 'jitter-fixture', ...patch } : row);
      return 'jitter-fixture';
    },
    async fire(id) { const timer = timers.get(id); timers.delete(id); clock = Math.max(clock, timer.at); timer.fn(); await new Promise(resolve => setImmediate(resolve)); await new Promise(resolve => setImmediate(resolve)); } };
}
const nine = new Date(2026, 9, 11, 9, 0).getTime();
const row = (f, id = 'jitter-fixture') => f.state().find(task => task.id === id);

test('an on-time occurrence waits its jitter, then dispatches; nextRunAt shown with the jitter', async t => {
  const f = await fixture(t); f.service.start();
  const id = await f.seed();
  assert.equal(row(f).nextRunAt, nine);
  const [listed] = await f.service.request({ action: 'list', kind: 'code' });
  assert.equal(listed.jitterSeconds, 463);
  assert.equal(listed.nextRunAt, nine + 463e3);
  f.setTime(nine); await f.service.tick();
  assert.equal(f.launches.length, 0);
  const [[timerId, timer]] = f.jitterTimers();
  assert.equal(timer.at, nine + 463e3);
  assert.equal(row(f).nextRunAt, nine, 'the occurrence stays stored while it waits');
  await f.service.tick();
  assert.equal(f.jitterTimers().length, 1, 'a pending task is not delayed twice');
  await f.fire(timerId);
  assert.deepEqual(f.launches, [{ id, at: nine + 463e3 }]);
  assert.equal(row(f).nextRunAt, new Date(2026, 9, 12, 9, 0).getTime());
  assert.deepEqual(row(f).missedRuns, []);
  assert.equal(row(f).runs[0].trigger, 'scheduled');
});

test('disable, delete, a schedule change or a folder change clear the pending jitter fire; other edits keep it', async t => {
  for (const change of ['disable', 'delete', 'cron', 'folder', 'disableJitter']) {
    const f = await fixture(t); f.service.start();
    const id = await f.seed();
    f.setTime(nine); await f.service.tick();
    const [[timerId]] = f.jitterTimers();
    if (change === 'disable') await f.service.request({ action: 'toggle', id, enabled: false });
    if (change === 'delete') await f.service.request({ action: 'delete', id });
    if (change === 'cron') await f.service.request({ action: 'update', id, name: 'Morning brief', prompt: 'Summarize.', cron: '0 10 * * *' });
    if (change === 'folder') {
      // R4i-routines fix: only a real move clears the wait (official gLi returns a place only when host or cwd differ).
      const moved = path.join(f.dataDir, 'moved'); await fs.mkdir(moved);
      await f.service.request({ action: 'update', id, name: 'Morning brief', prompt: 'Summarize.', cron: '0 9 * * *', folder: moved });
    }
    if (change === 'disableJitter') await f.service.request({ action: 'update', id, name: 'Morning brief', prompt: 'Summarize.', cron: '0 9 * * *', disableJitter: true });
    assert.equal(f.timers.has(timerId), false, change);
    assert.equal(f.launches.length, 0, change);
  }
  const f = await fixture(t); f.service.start();
  const id = await f.seed();
  f.setTime(nine); await f.service.tick();
  const [[timerId]] = f.jitterTimers();
  // The Code and Cowork forms resend the task's folder on every edit; the same folder is not a move.
  const renamed = await f.service.request({ action: 'update', id, name: 'Renamed', prompt: 'Summarize.', cron: '0 9 * * *', folder: f.dataDir });
  assert.equal(f.timers.has(timerId), true);
  assert.equal(row(f).nextRunAt, nine);
  assert.equal(renamed.nextRunAt, nine + 463e3);
  await f.service.request({ action: 'toggle', id, enabled: true });
  assert.equal(f.timers.has(timerId), true, 'enabling an enabled task keeps the wait');
  await f.fire(timerId);
  assert.equal(f.launches.length, 1);
});

test('a jitter fire whose task was disabled through the store directly is dropped', async t => {
  const f = await fixture(t); f.service.start();
  await f.seed();
  f.setTime(nine); await f.service.tick();
  const [[timerId]] = f.jitterTimers();
  f.restore(f.state().map(task => ({ ...task, enabled: false })));
  await f.fire(timerId);
  assert.equal(f.launches.length, 0);
});

test('Run now during the wait cancels the jitter fire and takes the occurrence', async t => {
  const f = await fixture(t); f.service.start();
  const id = await f.seed();
  f.setTime(nine); await f.service.tick();
  const [[timerId]] = f.jitterTimers();
  f.setTime(nine + 6e4);
  await f.service.request({ action: 'run', id });
  assert.equal(f.timers.has(timerId), false);
  assert.equal(f.launches.length, 1);
  assert.equal(row(f).nextRunAt, new Date(2026, 9, 12, 9, 0).getTime());
  assert.equal(row(f).runs[0].trigger, 'manual');
});

test('a late catch-up (wake from sleep) dispatches at once; a jitter fire more than 5 minutes late serves the latest occurrence', async t => {
  const f = await fixture(t); f.service.start();
  const id = await f.seed();
  f.setTime(nine + 5 * 6e4); await f.service.tick();
  assert.equal(f.jitterTimers().length, 0);
  assert.deepEqual(f.launches, [{ id, at: nine + 5 * 6e4 }]);

  const g = await fixture(t); g.service.start();
  await g.seed();
  g.setTime(nine); await g.service.tick();
  const [[timerId]] = g.jitterTimers();
  const nextDay = new Date(2026, 9, 12, 9, 30).getTime();
  g.setTime(nextDay); await g.fire(timerId);
  assert.equal(g.launches.length, 1);
  assert.deepEqual(row(g).missedRuns, [{ time: new Date(nine).toISOString() }]);
  assert.equal(row(g).nextRunAt, new Date(2026, 9, 13, 9, 0).getTime());
});

test('a stored disableJitter applies and survives edits that omit it; fireAt tasks never wait', async t => {
  const f = await fixture(t); f.service.start();
  const id = await f.seed({ disableJitter: true });
  await f.service.request({ action: 'update', id, name: 'Renamed', prompt: 'Summarize.', cron: '0 9 * * *' });
  assert.equal(row(f).disableJitter, true);
  const [listed] = await f.service.request({ action: 'list', kind: 'code' });
  assert.equal(listed.jitterSeconds, 0);
  assert.equal(listed.nextRunAt, nine);
  f.setTime(nine); await f.service.tick();
  assert.equal(f.launches.length, 1);
  await assert.rejects(f.service.request({ action: 'update', id, name: 'Renamed', prompt: 'Summarize.', cron: '0 9 * * *', disableJitter: 'yes' }), /randomized delay/);

  const g = await fixture(t); g.service.start();
  const once = await g.service.request({ action: 'create', kind: 'code', name: 'Once', prompt: 'Go.', fireAt: nine, folder: g.dataDir });
  assert.equal(once.jitterSeconds, 0);
  g.setTime(nine); await g.service.tick();
  assert.equal(g.launches.length, 1);
});

test('a restart during the wait records the occurrence as missed; dispose clears the jitter timer', async t => {
  const f = await fixture(t); f.service.start();
  await f.seed();
  f.setTime(nine); await f.service.tick();
  const [[timerId]] = f.jitterTimers();
  f.service.dispose();
  assert.equal(f.timers.has(timerId), false);
  f.setTime(nine + 10 * 6e4);
  const again = f.make(); again.start(); t.after(() => again.dispose());
  assert.deepEqual(row(f).missedRuns, [{ time: new Date(nine).toISOString() }]);
  assert.equal(row(f).nextRunAt, new Date(2026, 9, 12, 9, 0).getTime());
  assert.equal(f.launches.length, 0);
});
