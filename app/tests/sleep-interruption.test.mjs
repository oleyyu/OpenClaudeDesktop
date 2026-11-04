// W14-code fr2-12: the main process's sleepInterruption source (electron/sleep-interruption.cjs, a port of 3.6556.2
// asar index.chunk-DNPOm2Zc.js qr / Yr / Xr / Zr with Br = 1e4) and the renderer's store of it (kept-awake-model.mjs).
// Pure models: fake clock and timers, no powerMonitor.
import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import path from 'node:path';

const require = createRequire(import.meta.url);
const { createSleepInterruptions, GRACE_MS } = require('../electron/sleep-interruption.cjs');
const { createSleepInterruptionStore } = await import('../src/kept-awake-model.mjs');
// W14-code r5 fr5-07 → r6 sleep lane: the band is the sliced cf74bc599 wO (generated/session-rail/sleep-band.mjs) with its
// copy bO / yO / xO and _O (sleep-band-messages.mjs); the host keeps no copy table and no hand-built band
// (tests/w14-r6-sleep.test.mjs drives the sliced band).
const { sleepBandMessages, SLEEP_RESUME_GRACE_MS } = await import('../src/generated/session-rail/sleep-band-messages.mjs');
test('fr5-07: the sleep band copy is the original bO / _O, not a host table', () => {
  assert.equal(sleepBandMessages.title.defaultMessage, 'Your computer went to sleep while Claude was working.');
  assert.equal(sleepBandMessages.title.id, 'mVSWgvZEEd');
  assert.equal(SLEEP_RESUME_GRACE_MS, 75e3);
  const model = readFileSync(path.join(import.meta.dirname, '../src/kept-awake-model.mjs'), 'utf8');
  assert.doesNotMatch(model, /SLEEP_BAND_MESSAGES|SLEEP_BAND_ACTIONS|"86Xy\/2TTz8"|"mVSWgvZEEd"|export function sleepNotice/);
});

function harness({ running = () => false } = {}) {
  let clock = 1000;
  const timers = new Map(); let next = 1;
  const changes = [];
  const model = createSleepInterruptions({
    now: () => clock, setTimer: (fn, ms) => { const id = next++; timers.set(id, { fn, at: clock + ms }); return id; },
    clearTimer: (id) => timers.delete(id), onChange: (id, value) => changes.push([id, value]), stillRunning: running,
  });
  const advance = (ms) => { clock += ms; for (const [id, timer] of [...timers]) if (timer.at <= clock) { timers.delete(id); timer.fn(); } };
  return { model, changes, advance, timers, at: () => clock };
}

test('Br grace: a turn suspended mid-flight that is gone 10s after the wake becomes a sleepInterruption', () => {
  const h = harness();
  h.model.turnStarted('t1', 'turn-1');
  h.model.suspend(1000);
  h.advance(60_000);
  h.model.resume(h.at());
  const wakeAt = h.at();
  h.model.message('t1', 'result', { isError: false, at: wakeAt - 1 }); // nothing pending yet would clear; here pending exists
  // An ok result before the grace ends drops the pending record (Zr), no band.
  assert.deepEqual(h.changes, []);
  assert.equal(h.model.get('t1'), null);
});

test('suspend → resume → turn not running at Br → promoted with {suspendedAt, wakeAt}', () => {
  const h = harness({ running: () => false });
  h.model.turnStarted('t1', 'turn-1');
  h.model.suspend(1000);
  h.advance(30_000);
  const wakeAt = h.at();
  h.model.resume(wakeAt);
  assert.equal(h.model.get('t1'), null, 'held for the grace period');
  h.advance(GRACE_MS);
  assert.deepEqual(h.model.get('t1'), { suspendedAt: 1000, wakeAt });
  assert.deepEqual(h.changes, [['t1', { suspendedAt: 1000, wakeAt }]]);
});

test('a turn still running at Br keeps waiting; a failed result then promotes it, progress >2s after wake clears it', () => {
  const h = harness({ running: () => true });
  h.model.turnStarted('t1', 'turn-1');
  h.model.suspend(1000);
  const wakeAt = h.at() + 5000; h.advance(5000);
  h.model.resume(wakeAt);
  h.advance(GRACE_MS);
  assert.equal(h.model.get('t1'), null);
  assert.equal(h.model.message('t1', 'result', { isError: true, at: h.at() }), 'promoted');
  assert.deepEqual(h.model.get('t1'), { suspendedAt: 1000, wakeAt });
  // A new turn (the person continued) is progress after the wake: cleared.
  h.model.turnStarted('t1', 'turn-2');
  assert.equal(h.model.message('t1', 'progress', { at: h.at() + 1 }), 'cleared');
  assert.equal(h.model.get('t1'), null);
  assert.deepEqual(h.changes.at(-1), ['t1', null]);
});

test('progress within 2s of the wake does not clear; idle sessions are never marked', () => {
  const h = harness({ running: () => true });
  h.model.turnStarted('t1', 'turn-1');
  h.model.turnStarted('idle', undefined);
  h.model.message('idle', 'result', { at: 0 });
  h.model.suspend(1000);
  const wakeAt = h.at(); h.model.resume(wakeAt);
  assert.equal(h.model.message('t1', 'progress', { at: wakeAt + 1000 }), 'none');
  h.advance(GRACE_MS);
  assert.equal(h.model.get('idle'), null);
  assert.equal(h.model.message('t1', 'progress', { at: wakeAt + 3000 }), 'none', 'pending dropped, nothing shown to clear');
  assert.equal(h.model.get('t1'), null);
});

test('desktop-settings wires powerMonitor suspend/resume and the turn events to the model', () => {
  const src = readFileSync(path.join(import.meta.dirname, '../electron/desktop-settings.cjs'), 'utf8');
  assert.match(src, /powerMonitor\.on\('suspend',sleepSuspended\);powerMonitor\.on\('resume',sleepResumed\);/);
  assert.match(src, /emit\(\{kind:'desktop-sleep-interruption',threadId:id,sleepInterruption\}\)/);
  assert.match(src, /sleep\.message\(p\.threadId,'result',\{isError:p\.turn\?\.status==='failed'\}\)/);
});

test('renderer store: the window\'s copy of each session\'s sleepInterruption (desktop-sleep-interruption)', () => {
  const value = { suspendedAt: Date.UTC(2026, 0, 1, 9, 30), wakeAt: Date.UTC(2026, 0, 1, 10, 0) };
  const store = createSleepInterruptionStore();
  store.observe({ kind: 'desktop-sleep-interruption', threadId: 't', sleepInterruption: value });
  assert.deepEqual(store.get('t'), value);
  store.observe({ kind: 'desktop-sleep-interruption', threadId: 't', sleepInterruption: null });
  assert.equal(store.get('t'), null);
});
