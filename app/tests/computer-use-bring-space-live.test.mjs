import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { liveSkip, native, buildFixture, launchFixture, FIXTURE } from './computer-use-live-helpers.mjs';

// app_bring_to_current_space live (official 2.42304.0 §1.6.3), CU_LIVE=1 only. Three windows of the test's own, never
// the user's: the background fixture minimizing itself, ONE uniquely named TextEdit temp document minimized through
// Accessibility (tests/fixtures/cu-ax-minimize.swift; TextEdit may already be running with the user's documents —
// those are never looked at, and TextEdit is never quit), and the fixture moving itself to another desktop Space. Each
// is brought back through the agent tool; the frontmost app must be the same before and after, and the user's front
// window must stay above the window that came back. Needs the screen unlocked (the tool refuses while it is locked) and
// the user on a desktop Space (nothing can come back into a full-screen app's Space); the cross-Space part also needs a
// second desktop Space on the display.
//   CU_LIVE=1 node --test --test-concurrency=1 tests/computer-use-bring-space-live.test.mjs
const require = createRequire(import.meta.url);
const { createComputerUse } = require('../electron/computer-use/service.cjs');
const cu = await import('../electron/agent-tools/computer-use.mjs');
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const TEXTEDIT = 'com.apple.TextEdit';
const fixtures = path.resolve(import.meta.dirname, 'fixtures');

async function environmentSkip() {
  const skip = await liveSkip();
  if (skip) return skip;
  const n = native();
  if ((await n.call('probe')).screenLocked) return 'the screen is locked (app_bring_to_current_space refuses while it is locked)';
  const spaces = await n.call('spaceState', {});
  if (!spaces.available) return 'SkyLight Space queries are unavailable';
  if (spaces.activeSpaceType !== 0) return `the current Space is not a desktop Space (type ${spaces.activeSpaceType}): nothing can be brought into a full-screen app's Space`;
  return null;
}
const skip = (await environmentSkip()) ?? false;

/** Another desktop Space on the active display (com.apple.spaces, read only), or null. */
function otherDesktopSpace(active) {
  try {
    const xml = execFileSync('defaults', ['export', 'com.apple.spaces', '-']);
    const json = JSON.parse(String(execFileSync('plutil', ['-convert', 'json', '-o', '-', '-'], { input: xml })));
    for (const monitor of json.SpacesDisplayConfiguration['Management Data'].Monitors) {
      const spaces = monitor.Spaces ?? [];
      if (!spaces.some((s) => s.ManagedSpaceID === active)) continue;
      return spaces.find((s) => s.type === 0 && s.ManagedSpaceID !== active)?.ManagedSpaceID ?? null;
    }
  } catch {}
  return null;
}

function compile(dir, name) {
  const out = path.join(dir, name);
  execFileSync('swiftc', ['-O', path.join(fixtures, `${name}.swift`), '-o', out], { stdio: 'pipe' });
  return out;
}

function harness(sessionId, bundleId, displayName) {
  const service = createComputerUse({ native: native(), log: { info() {}, warn() {} } });
  service.grantsFor(sessionId).grant([{ bundleId, displayName }]);
  const ctx = { sessionId, computerUse: { service } };
  const bring = cu.tools.find((entry) => entry.name === 'app_bring_to_current_space').handler;
  return {
    service,
    async bring(windowId) {
      const result = await bring({ app: bundleId, window_id: windowId }, ctx);
      return { ...JSON.parse(result.content[0].text), isError: result.isError === true };
    },
  };
}
const listed = async (bundleId, windowId) => (await native().call('listWindows', { bundleId })).windows.find((w) => w.window_id === windowId);
const facts = (bin, windowId) => JSON.parse(String(execFileSync(bin, [String(windowId)])));

/** The checks every "brought back" case shares: front app unchanged, the user's front window still above it. */
function assertBehind(before, after, result) {
  assert.equal(after.front, before.front, 'the frontmost app did not change');
  if (result.how === 'shown_behind_the_front_window') assert.ok(after.zIndex > 0, `the window came back below the user's front window (z ${after.zIndex})`);
}

test('a minimized background fixture window comes back behind the user\'s window; the front app stays', { skip }, async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'cu-bring-live-'));
  const pointer = compile(dir, 'cu-pointer-facts');
  const fixture = await launchFixture(buildFixture(), { background: true, allSpaces: false, minimize: true });
  try {
    for (let i = 0; i < 30 && (await listed(FIXTURE, fixture.windowId))?.is_minimized !== true; i += 1) await sleep(100);
    const parked = await listed(FIXTURE, fixture.windowId);
    assert.equal(parked.is_minimized, true, JSON.stringify(parked));
    const before = facts(pointer, fixture.windowId);
    assert.notEqual(before.front, FIXTURE);
    const { bring } = harness('bring-fixture', FIXTURE, 'CU Text Fixture');
    const result = await bring(fixture.windowId);
    assert.equal(result.ok, true, JSON.stringify(result));
    assert.match(result.how, /^shown_(behind_the_front_window|with_no_front_window)$/, JSON.stringify(result));
    assert.match(result.message, /^Window \d+ of CU Text Fixture is back on screen, /);
    const back = await listed(FIXTURE, fixture.windowId);
    assert.deepEqual([back.is_minimized, back.is_off_space], [false, false], JSON.stringify(back));
    const after = facts(pointer, fixture.windowId);
    assertBehind(before, after, result);
    // Already here now: a second call is a no-op in the official words.
    const again = await bring(fixture.windowId);
    assert.deepEqual([again.ok, again.how], [true, 'already_here'], JSON.stringify(again));
    console.log(JSON.stringify({ case: 'fixture minimized', result, before, after }));
  } finally {
    await fixture.quit();
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test('a uniquely named TextEdit document minimized through Accessibility comes back behind the user\'s window', { skip }, async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'cu-bring-textedit-'));
  const name = `cu-bring-${process.pid}-${Date.now()}.txt`, file = path.join(dir, name);
  fs.writeFileSync(file, 'bring me back');
  const pointer = compile(dir, 'cu-pointer-facts'), minimize = compile(dir, 'cu-ax-minimize');
  const { service, bring } = harness('bring-textedit', TEXTEDIT, 'TextEdit');
  let windowId;
  try {
    execFileSync('open', ['-g', '-a', 'TextEdit', file]);
    for (let i = 0; i < 50 && !windowId; i += 1) { await sleep(200); windowId = (await native().call('listWindows', { bundleId: TEXTEDIT })).windows.find((w) => w.title === name)?.window_id; }
    assert.ok(windowId, 'the temp document window appeared');
    await sleep(500);
    const pid = Number(String(execFileSync('pgrep', ['-x', 'TextEdit'])).trim().split('\n')[0]);
    assert.equal(JSON.parse(String(execFileSync(minimize, [String(pid), name]))).minimized, true);
    const before = facts(pointer, windowId);
    assert.notEqual(before.front, TEXTEDIT, 'TextEdit is not the app the user is in');
    const result = await bring(windowId);
    assert.equal(result.ok, true, JSON.stringify(result));
    assert.match(result.how, /^shown_(behind_the_front_window|with_no_front_window)$/, JSON.stringify(result));
    const back = await listed(TEXTEDIT, windowId);
    assert.equal(back.is_minimized, false, JSON.stringify(back));
    const after = facts(pointer, windowId);
    assertBehind(before, after, result);
    console.log(JSON.stringify({ case: 'TextEdit minimized', result, before, after }));
  } finally {
    // Close only this document's window, by its own close button (autosave keeps it from asking; a sheet is answered).
    try {
      if (windowId && (await listed(TEXTEDIT, windowId))?.is_minimized === false) {
        const shot = await service.appScreenshot('bring-textedit', { bundleId: TEXTEDIT, windowId });
        const close = shot.elements.find((e) => e.subrole === 'AXCloseButton');
        if (close) await service.appClick('bring-textedit', { bundleId: TEXTEDIT, windowId, element_index: close.index, axOnly: true });
      }
    } catch (error) { console.log(`cleanup: ${error.message}`); }
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test('a fixture window on another desktop Space: moved here, or op_unavailable with the window left where it was', { skip }, async (t) => {
  const n = native();
  const { activeSpace } = await n.call('spaceState', {});
  const other = otherDesktopSpace(activeSpace);
  if (!other) { t.skip('no second desktop Space on the active display'); return; }
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'cu-bring-space-'));
  const pointer = compile(dir, 'cu-pointer-facts');
  const fixture = await launchFixture(buildFixture(), { background: true, allSpaces: false, space: other });
  try {
    let state;
    for (let i = 0; i < 30; i += 1) { state = await n.call('spaceState', { windowId: fixture.windowId }); if (state.windowSpaces?.includes(other)) break; await sleep(100); }
    assert.deepEqual(state.windowSpaces, [other], 'the fixture moved itself to the other Space');
    assert.equal((await listed(FIXTURE, fixture.windowId)).is_off_space, true);
    const before = facts(pointer, fixture.windowId);
    const { bring } = harness('bring-space', FIXTURE, 'CU Text Fixture');
    const result = await bring(fixture.windowId);
    const spaces = (await n.call('spaceState', { windowId: fixture.windowId })).windowSpaces;
    if (result.ok) {
      assert.equal(result.how, 'moved', JSON.stringify(result));
      assert.ok(spaces.includes(activeSpace), `on the active Space now (${spaces})`);
      assert.equal((await listed(FIXTURE, fixture.windowId)).is_off_space, false);
    } else {
      assert.deepEqual([result.reasonCode, result.errorKind], ['op_unavailable', 'feature_unavailable'], JSON.stringify(result));
      assert.deepEqual(spaces, [other], 'left where it was');
    }
    const after = facts(pointer, fixture.windowId);
    assert.equal(after.front, before.front, 'the frontmost app did not change');
    console.log(JSON.stringify({ case: 'cross-Space', activeSpace, other, result, spaces, before, after }));
  } finally {
    await fixture.quit();
    fs.rmSync(dir, { recursive: true, force: true });
  }
});
