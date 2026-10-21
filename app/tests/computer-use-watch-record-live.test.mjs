// Live: watch-record's recorder on this Mac (CU_LIVE=1 only). A five-second demonstration on the text fixture
// (tests/fixtures/cu-text-fixture, its own temporary .app): the listen-only input tap and the screen frames run for real,
// and the demonstration's input is posted by this test (typing into the fixture's `notes`, then a click on its window), so
// no one has to be at the keyboard — but no one may be using it either: the test runs only when the Mac has been idle for
// two minutes and the screen is unlocked, otherwise it is skipped as blocked. Everything recorded stays in memory and the
// fixture's temporary folder is deleted; the app that was in front comes back.
//   CU_LIVE=1 node --test --test-concurrency=1 tests/computer-use-watch-record-live.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { liveSkip, native, buildFixture, launchFixture, FIXTURE } from './computer-use-live-helpers.mjs';

const require = createRequire(import.meta.url);
const trajectory = require('../electron/computer-use/watch-record-trajectory.cjs');
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// liveSkip's presence gate: skipped while the screen is locked or someone used this Mac in the last 120 s.
const skip = await liveSkip();
const blocked = null;

test('a five-second demonstration on the fixture: the tap hears the typing and the click, frames come without this process\'s windows, the trajectory names them', { skip: skip ?? blocked ?? false, timeout: 120000 }, async () => {
  const n = native();
  const front = await n.call('frontmostApp');
  const cursor = await n.call('cursorPosition').catch(() => null);
  const built = buildFixture();
  const fixture = await launchFixture(built, { focus: 'notes' });
  const frames = [];
  try {
    for (let i = 0; i < 20 && (await n.call('frontmostApp')).bundleId !== FIXTURE; i += 1) await sleep(100);
    assert.equal((await n.call('frontmostApp')).bundleId, FIXTURE, 'the fixture is in front');
    await n.call('watchRecordStart');
    const frame = async () => {
      const shot = await n.call('watchRecordFrame', {});
      const t = (await n.call('watchRecordNowT')).t;
      frames.push({ kind: 'frame', tMs: t, encoded: Buffer.from(shot.base64, 'base64'), width: shot.width, height: shot.height, displayWidth: shot.displayWidth,
        displayHeight: shot.displayHeight, displayId: shot.displayId, frontmost: shot.frontmost?.appName ?? null });
    };
    await frame();
    await sleep(800);
    await n.call('hidType', { text: 'hi' });
    await frame();
    await sleep(800);
    const { x, y, width, height } = fixture.bounds;
    await n.call('hidClick', { point: { x: x + width / 2, y: y + height - 40 }, animate: false });
    await frame();
    await sleep(800);
    await n.call('hidKey', { modifiers: [], keys: ['return'], repeat: 1 });
    while ((await n.call('watchRecordNowT')).t < 5000) { await frame(); await sleep(500); }
    await n.call('watchRecordStop');
    const drained = await n.call('watchRecordDrain');
    await n.call('watchRecordClear');
    const kinds = drained.events.map((event) => event.kind);
    assert.ok(kinds.includes('leftMouseDown') && kinds.includes('leftMouseUp'), `a click: ${kinds}`);
    assert.deepEqual(drained.events.filter((event) => event.kind === 'key' && !event.secureInput).map((event) => event.chars), ['h', 'i', '\r']);
    assert.equal(drained.dropped, 0);
    assert.ok(frames.length >= 5 && frames.every((one) => one.width > 0 && one.encoded.length > 1000), 'frames');
    // What the model gets (pictures compared as all-alike here: the diff itself is checked against the original in the unit test).
    const displays = { displayForPoint: () => ({ id: frames[0].displayId, bounds: { x: 0, y: 0, width: frames[0].displayWidth, height: frames[0].displayHeight } }) };
    const flat = { async decode(_encoded, { width }) { const height = Math.round((frames[0].height * width) / frames[0].width); return { bitmap: Buffer.alloc(width * height * 4), width, height }; }, async crop() { throw new Error('no crop expected'); } };
    const durationMs = Math.round(frames.at(-1).tMs);
    const built2 = await trajectory.buildTrajectory({ startedAt: Date.now() - durationMs, durationMs, frames, events: drained.events.map((event) => trajectory.normalizeEvent(event, displays)),
      apps: [{ tMs: 0, name: frames[0].frontmost ?? 'CUTextFixture' }] }, { images: flat });
    const message = trajectory.flattenTrajectoryBlocks(trajectory.trajectoryContentBlocks(built2, { computerUseEnabled: true })).message;
    assert.match(message, /^<watch-record-demonstration durationMs="\d+" steps="\d+" images="1">I recorded a demonstration/);
    assert.match(message, /typed "hi", pressed Enter/);
    assert.match(message, /clicked at \(\d+, \d+\) in "CUTextFixture"/);
    assert.match(message, /full screen \(Display 1 — frontmost: "CUTextFixture"\):/);
  } finally {
    frames.length = 0;
    await n.call('watchRecordStop').catch(() => {});
    await n.call('watchRecordClear').catch(() => {});
    await fixture.quit();
    fs.rmSync(built.dir, { recursive: true, force: true });
    if (cursor && Number.isFinite(cursor.x)) await n.call('hidMove', { point: { x: cursor.x, y: cursor.y }, animate: false }).catch(() => {});
    if (typeof front?.bundleId === 'string' && front.bundleId !== 'com.apple.loginwindow') {
      try { execFileSync('open', ['-b', front.bundleId]); } catch {}
      await sleep(800);
    }
  }
});
