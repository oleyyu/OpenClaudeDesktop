// Live: hideBeforeAction on this Mac (CU_LIVE=1 only, and only when nobody has used the keyboard or mouse for 120 s and
// the screen is unlocked). Two fixture apps of our own (tests/fixtures/cu-hide-fixture, two bundle ids) show a window
// each on the main display; the session grants one of them. A full-screen screenshot hides the other one (and nothing
// else: every other app with a window on the display is granted to this test's in-memory session, so the user's apps are
// never hidden), the screenshot's note names it, and the turn's end (restoreHiddenApps) brings it back. The fixtures
// quit, and the app that was in front and the cursor are checked unchanged.
//   CU_LIVE=1 node --test --test-concurrency=1 tests/computer-use-hide-live.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync, spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import { liveSkip, native, app } from './computer-use-live-helpers.mjs';

const require = createRequire(import.meta.url);
const { createComputerUse } = require('../electron/computer-use/service.cjs');
const { createFullControl } = require('../electron/computer-use/full-control.cjs');

const ALLOWED = 'dev.openclaude.cu-hide-allowed', OTHER = 'dev.openclaude.cu-hide-other';
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const probe = (await liveSkip()) ? null : await native().call('probe');
const skip = (await liveSkip())
  ?? (probe.screenLocked ? 'the screen is locked' : null)
  ?? (!(probe.secondsSinceUserInput >= 120) ? `someone is using this Mac (last input ${Number(probe.secondsSinceUserInput).toFixed(1)} s ago, needs ≥ 120 s)` : null);

function build(bundleId, name, dir) {
  const bundle = path.join(dir, `${name}.app`), macos = path.join(bundle, 'Contents/MacOS');
  fs.mkdirSync(macos, { recursive: true });
  fs.writeFileSync(path.join(bundle, 'Contents/Info.plist'), `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0"><dict>
<key>CFBundleIdentifier</key><string>${bundleId}</string>
<key>CFBundleName</key><string>${name}</string>
<key>CFBundleExecutable</key><string>${name}</string>
<key>CFBundlePackageType</key><string>APPL</string>
<key>NSPrincipalClass</key><string>NSApplication</string>
</dict></plist>`);
  execFileSync('swiftc', ['-O', '-o', path.join(macos, name), path.join(app, 'tests/fixtures/cu-hide-fixture/main.swift')], { stdio: 'pipe' });
  return bundle;
}
async function launch(bundle, name, dir, x) {
  const dumpFile = path.join(dir, `${name}.json`);
  const child = spawn(path.join(bundle, 'Contents/MacOS', name), [], { env: { ...process.env, CU_HIDE_FIXTURE_DUMP: dumpFile, CU_HIDE_FIXTURE_TITLE: name, CU_HIDE_FIXTURE_X: String(x) }, stdio: 'ignore' });
  const dump = async () => {
    fs.rmSync(dumpFile, { force: true });
    process.kill(child.pid, 'SIGUSR1');
    for (let i = 0; i < 80; i += 1) { await sleep(25); if (fs.existsSync(dumpFile)) return JSON.parse(fs.readFileSync(dumpFile, 'utf8')); }
    throw new Error(`${name} did not dump`);
  };
  for (let i = 0; i < 60; i += 1) { await sleep(100); try { if ((await dump()).visible) break; } catch {} }
  return { child, dump };
}

test('a full-screen screenshot hides the fixture that isn\'t granted (not the granted one), names it, and the turn\'s end brings it back', { skip: skip ?? false, timeout: 120000 }, async () => {
  const n = native();
  const frontBefore = await n.call('frontmostApp');
  const cursorBefore = await n.call('cursorPosition');
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'cu-hide-live-'));
  const fixtures = [];
  try {
    const allowed = await launch(build(ALLOWED, 'CUHideAllowed', dir), 'CUHideAllowed', dir, 120);
    const other = await launch(build(OTHER, 'CUHideOther', dir), 'CUHideOther', dir, 520);
    fixtures.push(allowed, other);
    // Every app with a window on the display except OTHER is granted to this in-memory session, so only OTHER can be hidden.
    const wouldHide = (await n.call('previewHideSet', { exemptBundleIds: [ALLOWED] })).apps.map((a) => a.bundleId);
    assert.ok(wouldHide.includes(OTHER), `OTHER would be hidden: ${wouldHide}`);
    const fullControl = createFullControl();
    const cu = createComputerUse({ native: n, log: { log() {}, warn() {}, info() {} }, fullControl });
    cu.grantsFor('live').grant([{ bundleId: ALLOWED, displayName: 'CUHideAllowed' }, ...wouldHide.filter((id) => id !== OTHER).map((bundleId) => ({ bundleId }))]);
    cu.requestFullControl('live', { approved: true });
    const shot = await cu.displayScreenshot('live', {});
    assert.match(shot.hiddenNote ?? '', /"CUHideOther" was open and got hidden before this screenshot/);
    assert.equal((await other.dump()).hidden, true, 'OTHER is hidden');
    assert.equal((await allowed.dump()).hidden, false, 'the granted fixture stays');
    assert.deepEqual(await cu.restoreHiddenApps('live', { autoUnhide: true }), [OTHER]);
    let back = false;
    for (let i = 0; i < 40 && !back; i += 1) { await sleep(50); back = (await other.dump()).hidden === false; }
    assert.equal(back, true, 'OTHER came back at the turn\'s end');
    fullControl.releaseAll();
  } finally {
    for (const fixture of fixtures) fixture.child.kill('SIGKILL');
    await sleep(300);
    fs.rmSync(dir, { recursive: true, force: true });
    if (frontBefore?.bundleId && (await n.call('frontmostApp'))?.bundleId !== frontBefore.bundleId) {
      try { execFileSync('open', ['-b', frontBefore.bundleId]); } catch {}
    }
  }
  assert.deepEqual(await n.call('cursorPosition'), cursorBefore, 'the cursor did not move');
});
